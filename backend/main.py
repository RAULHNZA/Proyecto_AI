"""Backend FastAPI: recibe la transcripción de una llamada Vapi y la analiza con un LLM (Groq o Claude)."""

import logging
import os
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, ValidationError

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-analysis")

# "groq" (por defecto) o "anthropic"
PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
DEFAULT_MODELS = {"groq": "openai/gpt-oss-120b", "anthropic": "claude-sonnet-5"}
MODEL = os.getenv("LLM_MODEL", DEFAULT_MODELS.get(PROVIDER, ""))
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

if PROVIDER == "groq":
    import groq as sdk
    client = sdk.AsyncGroq()  # lee GROQ_API_KEY del entorno
elif PROVIDER == "anthropic":
    import anthropic as sdk
    client = sdk.AsyncAnthropic()  # lee ANTHROPIC_API_KEY del entorno
else:
    raise RuntimeError(f"LLM_PROVIDER no soportado: {PROVIDER!r} (usa 'groq' o 'anthropic')")

app = FastAPI(title="Voice Session Analyzer", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Modelos de datos ----------

class Utterance(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class AnalysisRequest(BaseModel):
    session_id: Optional[str] = "session-default"
    transcript: List[Utterance]


class MetricItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: str
    score: int = Field(description="Calificación entera de 1 a 10")
    feedback: str


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str
    overall_score: int = Field(description="Calificación general entera de 1 a 10")
    metrics: List[MetricItem]
    key_insights: List[str]
    actionable_recommendations: List[str]


# ---------- Prompt ----------

SYSTEM_PROMPT = """Eres un evaluador analítico y objetivo de interacciones orales.
Tu tarea es analizar la transcripción de una conversación entre un usuario y un asistente de voz.
La transcripción proviene de reconocimiento de voz automático, así que puede contener errores
de transcripción menores; no penalices al usuario por ellos.

Evalúa minuciosamente las respuestas proporcionadas por el USUARIO considerando:
1. Claridad y articulación de las ideas.
2. Nivel de detalle, profundidad y coherencia.
3. Precisión o idoneidad respecto a las preguntas planteadas.

Todas las calificaciones son enteros de 1 a 10. Incluye exactamente estas tres métricas, en este orden:
- "Claridad y Coherencia"
- "Profundidad de Respuestas"
- "Seguridad y Fluidez"

En "summary" resume los temas tratados y el desempeño del usuario. En "key_insights" incluye
los puntos destacados (fortalezas u observaciones clave). En "actionable_recommendations" da
recomendaciones concretas para mejorar. Responde en español."""


def format_transcript(transcript: List[Utterance]) -> str:
    labels = {"assistant": "ASISTENTE", "user": "USUARIO"}
    return "\n".join(f"[{labels[u.role]}]: {u.text.strip()}" for u in transcript if u.text.strip())


def clamp(score: int) -> int:
    return max(1, min(10, score))


# ---------- Proveedores ----------

INVALID_OUTPUT = HTTPException(status_code=502, detail="El análisis devuelto está incompleto o no es válido.")


async def analyze_with_groq(user_content: str) -> AnalysisResponse:
    completion = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "analysis_response",
                "strict": True,
                "schema": AnalysisResponse.model_json_schema(),
            },
        },
        max_completion_tokens=8000,
    )
    choice = completion.choices[0]
    if choice.finish_reason == "length" or not choice.message.content:
        raise INVALID_OUTPUT
    try:
        return AnalysisResponse.model_validate_json(choice.message.content)
    except ValidationError:
        logger.exception("Respuesta de Groq no válida: %s", choice.message.content)
        raise INVALID_OUTPUT


async def analyze_with_anthropic(user_content: str) -> AnalysisResponse:
    response = await client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
        output_format=AnalysisResponse,
    )
    if response.stop_reason == "refusal":
        raise HTTPException(status_code=422, detail="El modelo declinó analizar esta conversación.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise INVALID_OUTPUT
    return response.parsed_output


# ---------- Endpoints ----------

@app.get("/api/health")
async def health():
    return {"status": "ok", "provider": PROVIDER, "model": MODEL}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(req: AnalysisRequest) -> AnalysisResponse:
    if not any(u.role == "user" and u.text.strip() for u in req.transcript):
        raise HTTPException(
            status_code=400,
            detail="La transcripción no contiene intervenciones del usuario para analizar.",
        )

    user_content = f"<transcripcion>\n{format_transcript(req.transcript)}\n</transcripcion>"
    logger.info("Analizando sesión %s (%d intervenciones) con %s/%s",
                req.session_id, len(req.transcript), PROVIDER, MODEL)

    try:
        if PROVIDER == "groq":
            result = await analyze_with_groq(user_content)
        else:
            result = await analyze_with_anthropic(user_content)
    except sdk.AuthenticationError:
        logger.exception("API key inválida")
        raise HTTPException(status_code=500, detail=f"Credenciales de {PROVIDER} inválidas o ausentes.")
    except sdk.RateLimitError:
        raise HTTPException(status_code=429, detail="Límite de uso alcanzado. Intenta de nuevo en unos segundos.")
    except sdk.APIStatusError as e:
        logger.exception("Error de la API del proveedor")
        raise HTTPException(status_code=502, detail=f"Error del servicio de análisis ({e.status_code}).")
    except sdk.APIConnectionError:
        logger.exception("No se pudo conectar con el proveedor")
        raise HTTPException(status_code=503, detail="No se pudo conectar con el servicio de análisis.")

    result.overall_score = clamp(result.overall_score)
    for m in result.metrics:
        m.score = clamp(m.score)
    return result
