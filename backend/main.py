"""Backend FastAPI de RED-i, el asistente de inteligencia artificial (agenda IA 2027) de Red Ambiental.

Escucha la reunión por bloques de audio (Groq Whisper), resume por tramos mientras escucha y,
al pedirle hablar, genera una conclusión (Groq o Claude) que el frontend entrega a Vapi.
"""

import asyncio
import json
import logging
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import List, Optional, Type, TypeVar

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, ValidationError

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("asistente-ia")

BASE_DIR = Path(__file__).resolve().parent
CONTEXT_DIR = BASE_DIR / "contexto"
SESSIONS_DIR = BASE_DIR / "sesiones"
SESSIONS_DIR.mkdir(exist_ok=True)
# Pantalla ya compilada (npm run build). Si existe, el backend la sirve en http://localhost:8000
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

# "groq" (por defecto) o "anthropic" para resúmenes y conclusión. La transcripción siempre usa Groq Whisper.
PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
DEFAULT_MODELS = {"groq": "openai/gpt-oss-120b", "anthropic": "claude-sonnet-5"}
MODEL = os.getenv("LLM_MODEL", DEFAULT_MODELS.get(PROVIDER, ""))
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "whisper-large-v3")
# Palabras acumuladas sin resumir que disparan un resumen parcial (~8-10 min de reunión).
SUMMARY_EVERY_WORDS = int(os.getenv("SUMMARY_EVERY_WORDS", "1200"))
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

import groq

# Llaves de Groq en orden de uso: si una llega a su límite (o es inválida), se usa la siguiente.
GROQ_KEYS = [
    ("principal", os.getenv("GROQ_API_KEY")),
    ("Agente_planeacion", os.getenv("GROQ_API_KEY_AGENTE_PLANEACION")),
]
groq_clients = [(name, groq.AsyncGroq(api_key=key)) for name, key in GROQ_KEYS if key]
if not groq_clients:
    raise RuntimeError("Falta GROQ_API_KEY (o GROQ_API_KEY_AGENTE_PLANEACION) en backend/.env")


async def call_groq(request):
    """Ejecuta `request(cliente)` con la primera llave de Groq disponible."""
    for i, (name, client) in enumerate(groq_clients):
        try:
            return await request(client)
        except (groq.RateLimitError, groq.AuthenticationError) as e:
            if i == len(groq_clients) - 1:
                raise
            logger.warning("Llave de Groq '%s' no disponible (%s); se usa '%s'", name, type(e).__name__, groq_clients[i + 1][0])


if PROVIDER == "groq":
    sdk = groq
    llm_client = None  # se usa call_groq
elif PROVIDER == "anthropic":
    import anthropic as sdk
    llm_client = sdk.AsyncAnthropic()  # lee ANTHROPIC_API_KEY del entorno
else:
    raise RuntimeError(f"LLM_PROVIDER no soportado: {PROVIDER!r} (usa 'groq' o 'anthropic')")

app = FastAPI(title="RED-i · Asistente de IA 2027", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Contexto (se relee en cada uso para poder editarlo sin reiniciar) ----------

def read_context_file(name: str, fallback: Optional[str] = None) -> str:
    for candidate in (name, fallback):
        if candidate and (CONTEXT_DIR / candidate).exists():
            return (CONTEXT_DIR / candidate).read_text(encoding="utf-8").strip()
    return ""


def presentation_source() -> str:
    return "planeacion_2027.md" if (CONTEXT_DIR / "planeacion_2027.md").exists() else "planeacion_2027.ejemplo.md"


def load_presentation() -> str:
    return read_context_file("planeacion_2027.md", "planeacion_2027.ejemplo.md")


def load_script() -> str:
    """Guion fijo de RED-i, con el saludo ajustado a la hora del día."""
    script = read_context_file("guion_redi.md")
    hour = time.localtime().tm_hour
    greeting = "Buenos días" if hour < 12 else "Buenas tardes" if hour < 19 else "Buenas noches"
    return re.sub(r"^Buen(os días|as tardes|as noches)", greeting, script)


def load_welcome() -> str:
    return read_context_file("bienvenida.txt") or "Buenos días a todos. Les comparto una breve conclusión de lo que se habló."


def load_lines(name: str) -> List[str]:
    return [l.strip() for l in read_context_file(name).splitlines() if l.strip() and not l.strip().startswith("#")]


def whisper_prompt(previous_text: str) -> str:
    # Whisper admite ~224 tokens de prompt: glosario + el final del bloque anterior para dar continuidad.
    glossary = ", ".join(load_lines("glosario.txt") + load_lines("nombres.txt"))
    tail = previous_text[-300:]
    return f"{glossary[:600]}. {tail}".strip(". ")


# ---------- Filtro de nombres de personas ----------

ACCENTS = {"a": "aáàä", "e": "eéèë", "i": "iíìï", "o": "oóòö", "u": "uúùü", "n": "nñ"}


def char_pattern(c: str) -> str:
    base = unicodedata.normalize("NFD", c)[0]  # "Í" -> "I"
    variants = ACCENTS.get(base.lower())
    if not variants:
        return re.escape(c)
    return f"[{variants}{variants.upper()}]" if c.isupper() else f"[{variants}]"


def name_pattern(name: str) -> str:
    return r"\s+".join("".join(char_pattern(c) for c in word) for word in name.split())


def find_names(text: str) -> List[str]:
    found = []
    for full in load_lines("nombres.txt"):
        # Nombre completo sin importar mayúsculas, o cualquiera de sus palabras (>=4 letras) escrita con mayúscula inicial.
        if re.search(rf"\b{name_pattern(full)}\b", text, re.IGNORECASE):
            found.append(full)
            continue
        for word in full.split():
            if len(word) >= 4 and re.search(rf"\b{name_pattern(word)}\b", text):
                found.append(full)
                break
    return found


def strip_names(text: str) -> str:
    for full in load_lines("nombres.txt"):
        text = re.sub(rf"\b{name_pattern(full)}\b", "el equipo", text, flags=re.IGNORECASE)
        for word in full.split():
            if len(word) >= 4:
                text = re.sub(rf"\b{name_pattern(word)}\b", "el equipo", text)
    return re.sub(r"\bel equipo(\s+el equipo)+\b", "el equipo", text)


# ---------- Sesiones (memoria + respaldo en disco) ----------

class Segment(BaseModel):
    seq: int
    at: float
    text: str


class Summary(BaseModel):
    upto_seq: int
    text: str


class Session(BaseModel):
    id: str
    created_at: float
    segments: List[Segment] = []
    summaries: List[Summary] = []

    def summarized_upto(self) -> int:
        return self.summaries[-1].upto_seq if self.summaries else -1

    def pending_segments(self) -> List[Segment]:
        upto = self.summarized_upto()
        return [s for s in self.segments if s.seq > upto]


sessions: dict[str, Session] = {}
summary_locks: dict[str, asyncio.Lock] = {}
SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def session_path(session_id: str) -> Path:
    return SESSIONS_DIR / f"{session_id}.json"


def save_session(session: Session) -> None:
    tmp = session_path(session.id).with_suffix(".tmp")
    tmp.write_text(session.model_dump_json(indent=2), encoding="utf-8")
    tmp.replace(session_path(session.id))


def get_session(session_id: str) -> Session:
    if not SESSION_ID_RE.match(session_id):
        raise HTTPException(status_code=400, detail="Identificador de sesión no válido.")
    if session_id not in sessions:
        path = session_path(session_id)
        if not path.exists():
            raise HTTPException(status_code=404, detail="La sesión no existe.")
        sessions[session_id] = Session.model_validate_json(path.read_text(encoding="utf-8"))
    return sessions[session_id]


def lock_for(session_id: str) -> asyncio.Lock:
    return summary_locks.setdefault(session_id, asyncio.Lock())


# ---------- LLM con salida estructurada ----------

T = TypeVar("T", bound=BaseModel)
INVALID_OUTPUT = HTTPException(status_code=502, detail="La respuesta del modelo está incompleta o no es válida.")


async def complete(system: str, user: str, schema: Type[T], max_tokens: int = 8000) -> T:
    try:
        if PROVIDER == "groq":
            completion = await call_groq(
                lambda client: client.chat.completions.create(
                    model=MODEL,
                    messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                    response_format={
                        "type": "json_schema",
                        "json_schema": {"name": schema.__name__, "strict": True, "schema": schema.model_json_schema()},
                    },
                    max_completion_tokens=max_tokens,
                )
            )
            choice = completion.choices[0]
            if choice.finish_reason == "length" or not choice.message.content:
                raise INVALID_OUTPUT
            try:
                return schema.model_validate_json(choice.message.content)
            except ValidationError:
                logger.exception("Respuesta de Groq no válida: %s", choice.message.content)
                raise INVALID_OUTPUT

        response = await llm_client.messages.parse(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_format=schema,
        )
        if response.stop_reason == "refusal":
            raise HTTPException(status_code=422, detail="El modelo declinó responder.")
        if response.stop_reason == "max_tokens" or response.parsed_output is None:
            raise INVALID_OUTPUT
        return response.parsed_output
    except sdk.AuthenticationError:
        logger.exception("API key inválida")
        raise HTTPException(status_code=500, detail=f"Credenciales de {PROVIDER} inválidas o ausentes.")
    except sdk.RateLimitError:
        raise HTTPException(status_code=429, detail="Límite de uso del modelo alcanzado. Intenta de nuevo en unos segundos.")
    except sdk.APIStatusError as e:
        logger.exception("Error de la API del proveedor")
        raise HTTPException(status_code=502, detail=f"Error del servicio de IA ({e.status_code}).")
    except sdk.APIConnectionError:
        logger.exception("No se pudo conectar con el proveedor")
        raise HTTPException(status_code=503, detail="No se pudo conectar con el servicio de IA.")


# ---------- Prompts ----------

NO_NAMES_RULE = """REGLA ESTRICTA: nunca menciones nombres de personas, puestos ni quién presentó, propuso o lleva cada
proyecto. Sí puedes nombrar áreas y unidades de negocio (Domiciliaria, Industrial y Comercial, RPBI, CIPRES, Datos,
Infraestructura, etc.). Habla de los proyectos, su alcance, beneficios, acuerdos y próximos pasos en términos
institucionales ("Red Ambiental", "la empresa", "el equipo")."""

AI_FOCUS = """ENFOQUE: inteligencia artificial. De la planeación 2027 solo interesa la agenda de IA de Red Ambiental:
proyectos e iniciativas de IA (incluidos agentes, IA generativa, analítica predictiva, visión computacional,
automatización inteligente), su alcance, casos de uso, beneficios, requisitos (datos, sistemas, capacitación),
riesgos, gobierno y uso responsable. Otros temas de la reunión solo importan si se relacionan con la IA
(por ejemplo, un proceso operativo que la IA va a mejorar)."""

SUMMARY_SYSTEM = f"""Eres el secretario técnico de la reunión de planeación 2027 de Red Ambiental.
Recibes un tramo de la transcripción automática (puede tener errores de reconocimiento de voz; corrígelos por contexto)
y debes resumirlo de forma fiel y compacta, sin inventar nada.

{AI_FOCUS}

Resume con detalle todo lo relacionado con IA: proyectos y en qué consisten, alcance, objetivos y metas, fechas,
cifras y montos tal como se dijeron, acuerdos, decisiones, riesgos, dudas abiertas y cambios respecto a lo planeado.
Lo que no tenga relación con la IA, menciónalo a lo mucho en una línea al final ("Otros temas: ...").
FIDELIDAD: registra solo lo que se dijo. No agregues alcances, beneficios, requisitos, riesgos ni pasos que nadie
mencionó, aunque parezcan lógicos. Distingue con claridad lo "propuesto" o "en análisis" de lo "acordado" o "aprobado".
Escribe en español, en viñetas breves agrupadas por proyecto. Omite saludos, muletillas y charla sin contenido.
Si el tramo no contiene nada relevante, dilo en una línea.

{NO_NAMES_RULE}"""


class PartialSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    resumen: str = Field(description="Resumen en viñetas del tramo, agrupado por proyecto, centrado en IA")


CONCLUSION_SYSTEM = f"""Eres RED-i, el asistente de inteligencia artificial de Red Ambiental: un agente de IA que escuchó la reunión
de planeación 2027 y ahora da, EN VOZ ALTA frente a los gerentes, una conclusión sobre la agenda de inteligencia
artificial. Tu propia participación es una muestra de lo que la IA puede hacer en la empresa.

{AI_FOCUS}

Fuentes:
- <presentacion>: la presentación oficial de la agenda de IA 2027 (estructura y temas previstos).
- <resumenes_reunion>: lo que realmente se dijo en la reunión, en orden.
Si la reunión contradice o actualiza la presentación (fechas, alcance, cifras, prioridades), manda lo dicho en la
reunión. Destaca las ideas nuevas sobre IA que surgieron en la conversación y no venían en la presentación.
Si no hay resúmenes de la reunión, concluye solo con la presentación.

Campo "conclusion" (se convertirá a voz):
- Entre 230 y 300 palabras (1.5 a 2 minutos hablando). No incluyas saludo ni bienvenida: eso ya se dijo antes.
- Tono ejecutivo, formal pero cercano. Frases cortas y naturales para escucharse, sin listas, viñetas, símbolos,
  abreviaturas ni markdown. Di "inteligencia artificial" o "IA" de forma natural. Escribe los números como se dirían
  si ayuda a la lectura.
- Estructura: para qué quiere Red Ambiental la IA en 2027 → los proyectos o casos de uso principales y su alcance,
  con lo más relevante que se dijo de cada uno → acuerdos, requisitos y próximos pasos → cierre breve que invite a
  hacer preguntas.
- Lenguaje claro para gerentes no técnicos: explica el beneficio para la operación o el negocio, no la tecnología.
- Menciona cifras o montos solo si se dijeron en la reunión o están en la presentación; nunca los inventes.
- No inventes proyectos, acuerdos, requisitos ni datos, ni prometas resultados que no se mencionaron.
- Respeta el estatus de cada idea: lo que solo se propuso preséntalo como propuesta ("se propuso", "se evaluará"),
  nunca como algo ya aprobado o en marcha.
- Los acuerdos y próximos pasos deben salir textualmente de la reunión o de la presentación. Si no se mencionaron,
  no los deduzcas: cierra con la idea central en lugar de inventar pasos.

Campos "puntos_clave" (3 a 7) y "temas_nuevos" (0 a 5, solo sobre IA): frases cortas para mostrarse en pantalla.

{NO_NAMES_RULE}"""


class Conclusion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conclusion: str = Field(description="Texto que se dirá en voz alta, 230-300 palabras, sin saludo")
    puntos_clave: List[str]
    temas_nuevos: List[str] = Field(description="Ideas sobre IA surgidas en la reunión que no estaban en la presentación")


ASSISTANT_PROMPT = """Eres RED-i, el agente de inteligencia artificial de Red Ambiental, moderador digital de la
Planeación Estratégica TI 2027. Acabas de exponer en voz la Estrategia de Inteligencia Artificial 2027 (texto en
<exposicion_dada>) y ahora respondes las preguntas de los asistentes.
Tu nombre se pronuncia "Redi": si lo dices, escríbelo así para que se escuche bien.

Cómo responder:
- Español de México, tono ejecutivo, formal pero cálido y humano.
- Respuestas breves: de dos a cuatro frases, porque se escuchan, no se leen. Sin listas, símbolos ni markdown.
  Di las horas de forma natural ("a las tres y media de la tarde").
- Escribe SIEMPRE los años, horas y cifras con palabras en español, nunca con dígitos, porque la voz los leería en
  inglés: "dos mil veintisiete" (no "2027"), "veinticuatro horas" (no "24/7"), "piso doce" (no "piso 12").
- Sobre la estrategia, los proyectos, la agenda, horarios, lugar y acuerdos responde solo con base en el contexto de
  abajo. Si algo no está ahí, dilo con claridad y no lo inventes. En particular, si preguntan cómo llegar o dónde
  estacionarse y no está en el contexto, responde que ese dato lo pueden consultar con el equipo organizador del evento.
- Puedes explicar con tus conocimientos generales conceptos de IA (qué es un agente, IA generativa, cómo aprende un
  modelo, buenas prácticas de uso responsable) en lenguaje sencillo y aterrizado a la operación de la empresa,
  siempre que no lo presentes como un plan o acuerdo de Red Ambiental.
- Si te preguntan por temas ajenos al evento o a la inteligencia artificial, responde con amabilidad que tu enfoque
  es la planeación 2027 y su estrategia de IA.
- Si lo dicho durante el evento actualizó algo de la presentación, responde con lo dicho en el evento.
- Menciona cifras solo si aparecen en el contexto.
- Nunca digas nombres de personas, puestos ni quién lleva o presentó un proyecto (las áreas sí puedes nombrarlas).
  Si te preguntan por responsables, responde: "Me enfoco en los proyectos; el detalle de responsables lo pueden
  revisar con el equipo de planeación."
- Si te piden repetir algo de tu exposición, resúmelo en pocas frases.

<presentacion>
{presentacion}
</presentacion>

<resumenes_reunion>
{resumenes}
</resumenes_reunion>

<exposicion_dada>
{exposicion}
</exposicion_dada>"""


def segments_text(segments: List[Segment]) -> str:
    return "\n".join(s.text for s in segments)


async def summarize_pending(session: Session, min_words: int = 0) -> None:
    """Resume los segmentos aún no resumidos si suman al menos `min_words` palabras."""
    async with lock_for(session.id):
        pending = session.pending_segments()
        text = segments_text(pending)
        if not pending or len(text.split()) < max(min_words, 1):
            return
        logger.info("Resumiendo %d segmentos de la sesión %s", len(pending), session.id)
        result = await complete(
            SUMMARY_SYSTEM, f"<transcripcion_tramo>\n{text}\n</transcripcion_tramo>", PartialSummary, max_tokens=6000
        )
        session.summaries.append(Summary(upto_seq=pending[-1].seq, text=strip_names(result.resumen.strip())))
        save_session(session)


async def summarize_in_background(session: Session) -> None:
    try:
        await summarize_pending(session, min_words=SUMMARY_EVERY_WORDS)
    except Exception:
        # Se reintenta en el siguiente bloque o al concluir; la transcripción no se pierde.
        logger.exception("Falló el resumen parcial de la sesión %s", session.id)


# ---------- Filtros de transcripción ----------

# Frases que Whisper suele "alucinar" con silencio o ruido.
HALLUCINATIONS = [
    "subtítulos realizados por la comunidad de amara.org", "subtitulado por la comunidad de amara.org",
    "gracias por ver el video", "gracias por ver", "suscríbete", "suscribete", "¡suscríbete al canal!",
    "subtítulos por la comunidad de amara.org", "música", "[música]", "aplausos", "gracias.", "gracias",
]


def clean_transcription(data: dict) -> str:
    segments = data.get("segments") or []
    if not segments:
        return (data.get("text") or "").strip()
    kept = []
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        if seg.get("no_speech_prob", 0) > 0.6 and seg.get("avg_logprob", 0) < -0.5:
            continue
        if seg.get("compression_ratio", 0) > 2.4:  # texto repetitivo, típico de alucinación
            continue
        if text.lower().strip(" .!¡") in [h.strip(" .!¡") for h in HALLUCINATIONS]:
            continue
        kept.append(text)
    return " ".join(kept).strip()


# ---------- Endpoints ----------

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "provider": PROVIDER,
        "model": MODEL,
        "whisper_model": WHISPER_MODEL,
        "llaves_groq": [name for name, _ in groq_clients],
        "presentacion": presentation_source(),
        "nombres_filtrados": len(load_lines("nombres.txt")),
    }


AGENDA_SKIP = {"visión", "vision", "habilitadores", "introducción", "objetivo general"}
PROJECT_HEADING = re.compile(r"^proyecto\s*\d+\s*[:.\-–]\s*", re.IGNORECASE)


@app.get("/api/agenda")
async def agenda():
    """Proyectos de la presentación (encabezados ##) para mostrarlos en pantalla.

    Si hay encabezados "Proyecto N: ...", se usan solo esos; si no, todos menos visión/habilitadores."""
    blocks = [b.strip().splitlines() for b in re.split(r"^## ", load_presentation(), flags=re.MULTILINE)[1:]]
    numbered = [b for b in blocks if PROJECT_HEADING.match(b[0])]
    projects = []
    for lines in numbered or blocks:
        title = PROJECT_HEADING.sub("", lines[0].strip())
        if not numbered and title.lower() in AGENDA_SKIP:
            continue
        detail = next((l.lstrip("-* ").split(":", 1)[-1].strip() for l in lines[1:] if l.strip().startswith(("-", "*"))), "")
        projects.append({"titulo": strip_names(title), "detalle": strip_names(detail)})

    # pantalla.json elige qué se muestra: los pilares (izquierda) y qué proyectos (derecha).
    screen = {}
    if (CONTEXT_DIR / "pantalla.json").exists():
        try:
            screen = json.loads((CONTEXT_DIR / "pantalla.json").read_text(encoding="utf-8"))
        except ValueError:
            logger.exception("pantalla.json no es un JSON válido; se muestran todos los proyectos")
    if screen.get("proyectos"):
        wanted = [t.lower() for t in screen["proyectos"]]
        projects = sorted((p for p in projects if p["titulo"].lower() in wanted), key=lambda p: wanted.index(p["titulo"].lower()))
    return {"pilares": screen.get("pilares", []), "proyectos": projects}


@app.post("/api/sessions")
async def create_session():
    session = Session(id=f"sesion-{time.strftime('%Y%m%d-%H%M%S')}", created_at=time.time())
    sessions[session.id] = session
    save_session(session)
    logger.info("Nueva sesión %s", session.id)
    return {"session_id": session.id}


@app.get("/api/sessions/{session_id}")
async def read_session(session_id: str):
    session = get_session(session_id)
    return {
        "session_id": session.id,
        "segments": [{"seq": s.seq, "text": s.text} for s in session.segments],
        "summaries": len(session.summaries),
    }


@app.post("/api/sessions/{session_id}/audio")
async def transcribe_chunk(session_id: str, seq: int = Form(...), file: UploadFile = File(...)):
    session = get_session(session_id)
    if any(s.seq == seq for s in session.segments):
        return {"seq": seq, "text": "", "duplicate": True}  # reintento de un bloque ya procesado

    audio = await file.read()
    if len(audio) < 1000:
        return {"seq": seq, "text": ""}

    previous = session.segments[-1].text if session.segments else ""
    try:
        result = await call_groq(
            lambda client: client.audio.transcriptions.create(
                file=(file.filename or "bloque.webm", audio),
                model=WHISPER_MODEL,
                language="es",
                prompt=whisper_prompt(previous),
                response_format="verbose_json",
                temperature=0,
            )
        )
    except groq.RateLimitError:
        raise HTTPException(status_code=429, detail="Límite de transcripción alcanzado; se reintentará.")
    except groq.APIStatusError as e:
        logger.exception("Error de Groq Whisper")
        raise HTTPException(status_code=502, detail=f"Error del servicio de transcripción ({e.status_code}).")
    except groq.APIConnectionError:
        raise HTTPException(status_code=503, detail="No se pudo conectar con el servicio de transcripción.")

    text = clean_transcription(result.model_dump() if hasattr(result, "model_dump") else dict(result))
    if text:
        session.segments.append(Segment(seq=seq, at=time.time(), text=text))
        session.segments.sort(key=lambda s: s.seq)
        save_session(session)
        if len(segments_text(session.pending_segments()).split()) >= SUMMARY_EVERY_WORDS and not lock_for(session.id).locked():
            asyncio.create_task(summarize_in_background(session))
    return {"seq": seq, "text": text}


@app.post("/api/sessions/{session_id}/conclude")
async def conclude(session_id: str):
    """Texto que dirá RED-i y el contexto para las preguntas.

    Si existe contexto/guion_redi.md, RED-i dice ese guion tal cual; si no, se genera una conclusión."""
    session = get_session(session_id)
    script = load_script()
    try:
        await summarize_pending(session)  # cierra el último tramo para que las preguntas tengan todo el contexto
    except HTTPException:
        if not script:
            raise
        logger.exception("No se pudo resumir el último tramo; se continúa con el guion")

    presentation = load_presentation()
    summaries = "\n\n".join(f"[Tramo {i + 1}]\n{s.text}" for i, s in enumerate(session.summaries))

    if script:
        logger.info("Sesión %s: RED-i dirá el guion fijo", session.id)
        text, key_points, new_topics = script, [], []
    else:
        user = (
            f"<presentacion>\n{presentation or '(sin presentación)'}\n</presentacion>\n\n"
            f"<resumenes_reunion>\n{summaries or '(no se captó conversación)'}\n</resumenes_reunion>"
        )
        logger.info("Generando conclusión de la sesión %s (%d tramos)", session.id, len(session.summaries))
        result = await complete(CONCLUSION_SYSTEM, user, Conclusion)
        names = find_names(" ".join([result.conclusion, *result.puntos_clave, *result.temas_nuevos]))
        if names:
            logger.warning("La conclusión mencionó nombres (%s); se regenera", ", ".join(names))
            result = await complete(
                CONCLUSION_SYSTEM,
                user + "\n\nIMPORTANTE: tu versión anterior mencionaba nombres de personas. No menciones a nadie.",
                Conclusion,
            )
        text = f"{load_welcome()} {strip_names(result.conclusion.strip())}"
        key_points = [strip_names(p) for p in result.puntos_clave]
        new_topics = [strip_names(t) for t in result.temas_nuevos]

    return {
        "texto": text,
        "puntos_clave": key_points,
        "temas_nuevos": new_topics,
        "contexto_asistente": ASSISTANT_PROMPT.format(
            presentacion=presentation or "(sin presentación)",
            resumenes=summaries or "(no se captó conversación)",
            exposicion=text,
        ),
    }


# Debe ir al final: las rutas /api/* se registran antes que la pantalla.
if (FRONTEND_DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="pantalla")
