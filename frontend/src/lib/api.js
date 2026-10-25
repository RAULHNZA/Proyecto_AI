// Vacío ("") = mismo servidor que sirve la pantalla (paquete portátil); en desarrollo, el backend en :8000.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options) {
  let res
  try {
    res = await fetch(`${BACKEND_URL}${path}`, options)
  } catch {
    throw new ApiError('No se pudo conectar con el backend. ¿Está encendido?', 0)
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // cuerpo no JSON; se mantiene el mensaje genérico
    }
    throw new ApiError(detail, res.status)
  }
  return res.json()
}

export const createSession = () => request('/api/sessions', { method: 'POST' })

export const getSession = (sessionId) => request(`/api/sessions/${sessionId}`)

export function uploadChunk(sessionId, seq, blob) {
  const form = new FormData()
  form.append('seq', String(seq))
  form.append('file', blob, `bloque-${seq}.${blob.type.includes('ogg') ? 'ogg' : 'webm'}`)
  return request(`/api/sessions/${sessionId}/audio`, { method: 'POST', body: form })
}

export const concludeSession = (sessionId) => request(`/api/sessions/${sessionId}/conclude`, { method: 'POST' })

export const getAgenda = () => request('/api/agenda')
