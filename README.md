# RED-i — Agente de IA de Red Ambiental

**RED-i** (se pronuncia "Redi") es el agente de voz de la **Planeación Estratégica TI 2027** de Red Ambiental (evento del 26 de octubre de 2026, Microsoft México, Torre VAO 1, Monterrey). Al presionar **"Interactúa conmigo"**:

1. Dice en voz el guion fijo de la **Estrategia de Inteligencia Artificial 2027**: introducción, los **tres pilares** y el cierre, con una invitación a preguntar.
2. La llamada queda abierta (máx. 15 min) para **preguntas** por voz o por texto. Responde sobre la estrategia, los proyectos (Ruta Maestra Inteligente, Sistema Inteligente CIPRES, Gestión 360, Aplicación Domiciliaria, Plataformas Operativas Futuras), la agenda, los horarios y el lugar.

Reglas del agente: **nunca menciona personas ni responsables** (sí puede nombrar áreas como Domiciliaria, RPBI o CIPRES); no inventa datos; escribe años y cifras con palabras para que la voz no los lea en inglés.

```
frontend/          React + Vite + Tailwind + @vapi-ai/web (pantalla y voz)
backend/           FastAPI + Groq (Whisper y LLM) o Anthropic; sirve también la pantalla compilada
backend/contexto/  guion, presentación, pantalla, glosario (contenido editable)
backend/sesiones/  respaldo de cada sesión (no se sube)
instalar.bat       instala en una laptop nueva (entorno de Python + librerías)
iniciar_red-i.bat  abre RED-i en http://127.0.0.1:8000
distribucion/      guía LEEME.txt y empaquetador del zip
entrega/           paquete generado RED-i + RED-i.zip (no se sube: lleva llaves)
```

## Etapas

| Etapa | Qué hace | Cómo se activa |
|---|---|---|
| **1 (actual)** | Botón "Interactúa conmigo": guion + preguntas. Columna izquierda: los 3 pilares. | Por defecto |
| **2** | Además **escucha** la sesión (micrófono → bloques de ~20 s → Groq Whisper → resúmenes cada ~10 min), para responder con lo que se dijo. Botón Escuchar/Pausar, barra "Escucha en vivo" y panel "Lo que he escuchado". | `VITE_ESCUCHA_HABILITADA="true"` en `frontend/.env` |
| Opcional | Columna derecha "Proyectos con IA" (3 proyectos de `pantalla.json`). | `VITE_PROYECTOS_VISIBLES="true"` en `frontend/.env` |

Los interruptores están en [frontend/src/lib/features.js](frontend/src/lib/features.js). Todo el código de la etapa 2 está completo, solo oculto.

## Instalar desde GitHub en otra laptop

> **Al repositorio le faltan a propósito los datos sensibles.** Lee primero [ANTES_DE_INSTALAR.md](ANTES_DE_INSTALAR.md): explica qué falta y qué pedirle a Raúl Hernández.

No se suben: las llaves (`backend/.env`, `frontend/.env`), la pantalla compilada (`frontend/dist`, lleva la llave de Vapi), el paquete `entrega/` (lleva las llaves) y las transcripciones de `backend/sesiones/`.

**Camino rápido (recomendado):** pedirle a Raúl el archivo **`RED-i.zip`** por un medio privado. Trae todo, incluidas las llaves y la pantalla compilada, y solo necesita Python: descomprimir, `instalar.bat` y `iniciar_red-i.bat`.

**Camino desde el repositorio** (necesita Python 3.10+ **y Node 18+**):

1. Pedirle a Raúl los 4 valores: `GROQ_API_KEY`, `GROQ_API_KEY_AGENTE_PLANEACION`, `VITE_VAPI_PUBLIC_KEY` y `VITE_VAPI_ASSISTANT_ID`.
2. Descargar el repositorio (**Code → Download ZIP** y descomprimir, o `git clone https://github.com/RAULHNZA/Proyecto_AI.git`).
3. Crear las llaves copiando las plantillas y pegando los valores con el Bloc de notas:
   - `backend\.env.example` → `backend\.env` (llaves de Groq).
   - `frontend\.env.example` → `frontend\.env` (llave pública y asistente de Vapi).
4. Compilar la pantalla:
   ```powershell
   cd frontend
   npm install
   npx vite build --mode portable
   ```
5. Doble clic en **`instalar.bat`** (revisa y avisa si falta algo) y después en **`iniciar_red-i.bat`** → http://127.0.0.1:8000.

### Qué va a pedir la laptop nueva

| Momento | Qué aparece o se necesita | Qué hacer |
|---|---|---|
| Antes de instalar | **Python 3.10+**. Si falta, `instalar.bat` avisa "No se encontró Python". | Instalarlo marcando **"Add python.exe to PATH"**. En equipos de la empresa suele requerir **permisos de administrador**: pedirlo a TI o al Centro de software. |
| Antes de instalar | El proyecto viene en un ZIP de GitHub. | **Descomprimirlo** primero; no ejecutar los `.bat` desde dentro del ZIP. |
| `instalar.bat` | Aviso **"Windows protegió su PC"** (SmartScreen), porque el archivo viene de internet. | **Más información → Ejecutar de todas formas**. |
| `instalar.bat` | **Internet hacia pypi.org** para descargar las librerías (1-2 min). | Si un proxy corporativo lo bloquea, falla con un mensaje en rojo: pedir acceso a TI. |
| `instalar.bat` | **Llaves y pantalla**: el zip de Raúl ya las trae; el repositorio no. | Si faltan, `instalar.bat` lo avisa: seguir [ANTES_DE_INSTALAR.md](ANTES_DE_INSTALAR.md). |
| `iniciar_red-i.bat` | Puede repetirse el aviso de **SmartScreen**. | Igual que arriba. |
| `iniciar_red-i.bat` | Una **ventana negra** (el servidor). Si el **puerto 8000 está ocupado**, marca error. | No cerrarla mientras se use RED-i. Si hay error, cerrar el programa que use el puerto 8000. |
| En el navegador | **Permiso de micrófono** la primera vez. | **Permitir**: sin eso Vapi no conecta. |

Con el zip no pide Node, cuentas ni contraseñas (las llaves de Vapi van dentro de la pantalla compilada). Desde el repositorio sí se necesita Node para compilar la pantalla.

Fuera de la laptop se necesita: **internet durante el evento** (Groq y Vapi están en la nube), **saldo en la cuenta de Vapi** y el asistente de Vapi con **voz y transcriptor en español de México**.

## Instalar y usar en otra laptop (paquete portátil)

La laptop del evento **solo necesita Python 3.10+**, Chrome o Edge e internet. No necesita Node: la pantalla va ya compilada y la sirve el mismo backend en http://127.0.0.1:8000.

### 1. Generar el paquete (en la laptop de desarrollo)

```powershell
powershell -ExecutionPolicy Bypass -File distribucion\empaquetar.ps1
```

Compila la pantalla en modo `portable` (`frontend/.env.portable`) y crea `entrega\RED-i\` y `entrega\RED-i.zip` (~0.4 MB), con:

```
RED-i/
  instalar.bat          instala una vez (entorno de Python + librerías)
  iniciar_red-i.bat     abre RED-i (servidor local + navegador)
  LEEME.txt             guía para quien lo opere
  backend/              main.py, requirements.txt, contexto/, .env (llaves)
  frontend/dist/        pantalla ya compilada (lleva la llave pública de Vapi)
```

- Por defecto **incluye `backend\.env` con las llaves de Groq**: no compartas el zip fuera del equipo del evento.
- Con `-SinLlaves` no las incluye; `instalar.bat` crea `backend\.env` desde `.env.example` para capturarlas.
- Vuelve a empaquetar cada vez que cambie el código, el guion o las llaves de Vapi (estas van dentro de la pantalla compilada).

### 2. Instalar (en la laptop del evento, una sola vez)

1. Instalar Python 3.10+ desde https://www.python.org/downloads/ con la casilla **"Add python.exe to PATH"** (en equipos de la empresa, pedirlo a TI).
2. Descomprimir `RED-i.zip`.
3. Doble clic en `instalar.bat` (crea `backend\.venv` y descarga las librerías de pypi.org; necesita internet).

### 3. Usar

1. Doble clic en `iniciar_red-i.bat`: abre http://127.0.0.1:8000 (solo escucha en esta computadora, no queda expuesto a la red).
2. Aceptar el permiso del micrófono la primera vez.
3. "Interactúa conmigo" → RED-i expone → preguntas → "Terminar".
4. Para apagar, cerrar la ventana negra del servidor.

Comprobación: http://127.0.0.1:8000/api/health (estado y llaves de Groq cargadas).

### Ensayo recomendado antes del evento

En la laptop y la sala reales: escuchar el guion completo (~4.5 min, que no se corte), confirmar que diga "Redi" y "dos mil veintisiete", preguntar "¿qué es Ruta Maestra?" y "¿quién lo lleva?" (no debe dar nombres), y ajustar volumen y micrófono.

## Desarrollo (laptop con Node)

Doble clic en `iniciar.bat` (backend con recarga automática en :8000 y Vite en :5173), o manualmente:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # GROQ_API_KEY y GROQ_API_KEY_AGENTE_PLANEACION
uvicorn main:app --reload --port 8000

cd frontend
npm install
copy .env.example .env   # VITE_VAPI_PUBLIC_KEY y VITE_VAPI_ASSISTANT_ID
npm run dev
```

Abre http://localhost:5173 en Chrome o Edge.

Vista previa de estados sin micrófono ni Vapi (solo desarrollo): `?vista=escuchando`, `?vista=pensando`, `?vista=hablando`.

## Contenido editable (`backend/contexto/`)

Se relee en cada uso: basta con recargar la página después de editar.

| Archivo | Uso |
|---|---|
| `guion_redi.md` | **Lo que dice RED-i** al presionar el botón, tal cual. El saludo se ajusta solo a la hora (días/tardes/noches). Escribir años y cifras con palabras. Si no existe, se genera una conclusión con `bienvenida.txt` + lo escuchado. |
| `planeacion_2027.md` | Información del evento (datos, agenda, pilares, proyectos `## Proyecto N: ...`) con la que responde preguntas. Si no existe se usa `planeacion_2027.ejemplo.md`. |
| `pantalla.json` | Paneles laterales: los 3 pilares (con `claves` para iluminarse cuando se mencionan) y qué proyectos se muestran. |
| `glosario.txt` | Términos que Whisper debe escribir bien; solo usa los primeros ~600 caracteres. |
| `bienvenida.txt` | Bienvenida del modo sin guion. |
| `nombres.txt` | Nombres de personas (uno por línea): ayudan a Whisper pero nunca salen en lo que dice RED-i. Plantilla en `nombres.ejemplo.txt`. |

## Pantalla

Identidad de Red Ambiental (azul Pantone 293, verde 376, Montserrat, logo oficial). Fondo de "centro de control" con red neuronal animada que reacciona al estado. Los paneles se iluminan cuando RED-i (o la sala, en etapa 2) menciona ese pilar o proyecto. Se diseñó para proyector.

## Vapi

Al iniciar la llamada el frontend sobrescribe: `firstMessage` (el guion), el prompt con todo el contexto y el modelo (`VITE_VAPI_MODEL_PROVIDER` / `VITE_VAPI_MODEL`, por defecto `openai` / `gpt-4.1`), la duración máxima (15 min) y la sensibilidad a interrupciones (el ruido de la sala no corta el guion). En el panel de Vapi solo hay que configurar **voz y transcriptor en español de México**.

## API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Estado, modelo y llaves de Groq cargadas |
| GET | `/api/agenda` | Pilares y proyectos para los paneles |
| POST | `/api/sessions` | Crea sesión |
| GET | `/api/sessions/{id}` | Fragmentos transcritos (para retomar) |
| POST | `/api/sessions/{id}/audio` | `seq` + `file`: transcribe un bloque (etapa 2) |
| POST | `/api/sessions/{id}/conclude` | `texto` que dirá RED-i y `contexto_asistente` para las preguntas |
| GET | `/` | Pantalla compilada (si existe `frontend/dist`) |

## Respaldo y fallas

- Llaves de Groq: `GROQ_API_KEY` (principal) y `GROQ_API_KEY_AGENTE_PLANEACION` (respaldo). Si la principal llega a su límite o es inválida, el backend usa la de respaldo automáticamente.
- Si ambas se agotan: `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` para resúmenes y conclusión (la transcripción sigue en Groq).
- Si Vapi falla, el texto queda en pantalla con el botón **Leer en voz alta** (voz del navegador).
- Etapa 2: si se cierra el navegador, al reabrir retoma la sesión; todo queda también en `backend/sesiones/`.
- Mantén la pestaña visible y la laptop conectada y sin suspensión durante el evento.
- Seguridad: el servidor solo escucha en `127.0.0.1`. No usar túneles ni exponerlo a internet desde equipos de la empresa.
