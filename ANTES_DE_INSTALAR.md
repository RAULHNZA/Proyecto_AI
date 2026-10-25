# Antes de instalar RED-i: qué te falta y qué pedir

Este repositorio **no incluye los datos sensibles** (llaves de servicios en la nube). Sin ellos, RED-i no arranca o no habla. Pídeselos a **Raúl Hernández** (Red Ambiental) por un medio privado, nunca por un canal público.

## Opción 1 (recomendada): pedir el paquete completo

Pídele a Raúl el archivo **`RED-i.zip`**. Trae todo listo, con las llaves y la pantalla compilada.

1. Instala **Python 3.10+** (https://www.python.org/downloads/, marca **"Add python.exe to PATH"**; en laptops de la empresa, pídelo a TI).
2. Descomprime `RED-i.zip`.
3. Doble clic en `instalar.bat` (una vez) y luego en `iniciar_red-i.bat`.

No necesitas nada más de esta página.

## Opción 2: usar este repositorio

### Qué pedirle a Raúl

| Dato | Para qué sirve | Dónde va |
|---|---|---|
| `GROQ_API_KEY` | Llave principal de Groq (genera respuestas y transcribe audio). **Sin ella el servidor no arranca.** | `backend\.env` |
| `GROQ_API_KEY_AGENTE_PLANEACION` | Llave de respaldo de Groq, por si la principal llega a su límite. | `backend\.env` |
| `VITE_VAPI_PUBLIC_KEY` | Llave pública de Vapi: la voz de RED-i. **Sin ella RED-i no habla.** | `frontend\.env` |
| `VITE_VAPI_ASSISTANT_ID` | ID del asistente de Vapi (voz en español de México). | `frontend\.env` |

Opcional, solo si se activa la etapa 2 o un proveedor alternativo: `ANTHROPIC_API_KEY` (respaldo si Groq se agota).

### Qué más necesitas instalar

- **Python 3.10+**, igual que en la opción 1.
- **Node.js 18+** (https://nodejs.org/), solo para compilar la pantalla una vez.

### Pasos

1. Copia `backend\.env.example` como `backend\.env` y pega las dos llaves de Groq.
2. Copia `frontend\.env.example` como `frontend\.env` y pega la llave pública y el ID del asistente de Vapi.
3. Compila la pantalla (PowerShell, dentro de la carpeta del proyecto):
   ```powershell
   cd frontend
   npm install
   npx vite build --mode portable
   ```
4. Doble clic en `instalar.bat`. Al final revisa y te avisa si todavía falta algo.
5. Doble clic en `iniciar_red-i.bat`: se abre http://127.0.0.1:8000.

## Qué no viene en el repositorio y por qué

| No viene | Motivo | Cómo obtenerlo |
|---|---|---|
| `backend/.env`, `frontend/.env` | Llaves privadas de Groq y Vapi. | Pedir los valores a Raúl (tabla de arriba). |
| `frontend/dist/` | Pantalla compilada; lleva dentro la llave de Vapi. | Compilarla (paso 3) o usar el zip. |
| `entrega/` (`RED-i.zip`) | Paquete con todas las llaves. | Pedírselo a Raúl. |
| `backend/sesiones/` | Transcripciones de sesiones anteriores. | No hacen falta: se crean solas al usarlo. |

Lo que sí viene: el código, el guion (`backend/contexto/guion_redi.md`), la información del evento (`planeacion_2027.md`), los paneles (`pantalla.json`) y los instaladores. Lo que la laptop te va a pedir al instalar (Python, avisos de Windows, permiso de micrófono) está en el [README](README.md#qué-va-a-pedir-la-laptop-nueva).
