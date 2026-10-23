# Asistente de voz con análisis post-conversacional

Conversación por voz con un agente de Vapi desde el navegador. Al colgar, la transcripción se envía a un backend FastAPI que la evalúa con un LLM (Groq por defecto, o Claude) y devuelve un reporte estructurado (puntuación, métricas, observaciones y recomendaciones).

```
frontend/  React + Vite + Tailwind + @vapi-ai/web
backend/   FastAPI + SDK de Groq (o Anthropic)
```

## Requisitos

- Python 3.10+ y Node 18+
- API key de Groq (`gsk_...`, console.groq.com) o de Anthropic
- Cuenta en Vapi.ai: un asistente creado, su **Assistant ID** y tu **Public Key**

## Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # edita GROQ_API_KEY (o LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY)
uvicorn main:app --reload --port 8000
```

Comprobación: http://localhost:8000/api/health

## Frontend

```powershell
cd frontend
npm install
copy .env.example .env   # edita VITE_VAPI_PUBLIC_KEY y VITE_VAPI_ASSISTANT_ID
npm run dev
```

Abre http://localhost:5173, pulsa el botón verde y concede permiso al micrófono.

## API

`POST /api/analyze`

```json
{
  "session_id": "session-123",
  "transcript": [
    { "role": "assistant", "text": "Hola, ¿cómo estás hoy?" },
    { "role": "user", "text": "Todo bien, listo para comenzar." }
  ]
}
```

Respuesta: `summary`, `overall_score` (1-10), `metrics[]` (`category`, `score`, `feedback`), `key_insights[]`, `actionable_recommendations[]`.

Errores: `400` sin intervenciones del usuario · `422` el modelo declinó · `429` límite de uso · `502/503` fallo del servicio de análisis.

## Notas

- Proveedor con `LLM_PROVIDER`: `groq` (por defecto, modelo `openai/gpt-oss-120b`) o `anthropic` (modelo `claude-sonnet-5`). El modelo se cambia con `LLM_MODEL`.
- En ambos casos el JSON se fuerza con *structured outputs* (esquema del modelo Pydantic) y se valida antes de devolverlo.
- Los fragmentos finales consecutivos del mismo interlocutor se unen en una sola intervención.
