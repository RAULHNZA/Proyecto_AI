import { useEffect, useState } from 'react'
import { Status } from './useMeeting'

// Solo desarrollo: http://localhost:5173/?vista=escuchando | pensando | hablando
// muestra cada estado de RED-i sin micrófono ni Vapi, para revisar el diseño.
const VIEW = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('vista') : null

const SAMPLE_SPEECH =
  'Ruta Maestra Inteligente, que podrá optimizar rutas de forma dinámica, anticipar escenarios operativos y recomendar ajustes en tiempo real.'
const SAMPLE_HEARD =
  'En el bloque de CIPRES se habló de estrategia de crecimiento, rentabilidad y digitalización de los indicadores.'

export function useDevPreview(meeting) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!VIEW) return
    const id = setInterval(() => setTick((t) => t + 1), 90)
    return () => clearInterval(id)
  }, [])

  if (!VIEW) return meeting
  const wave = Math.abs(Math.sin(tick * 0.7)) * 0.5 + Math.random() * 0.2
  const demo = { ...meeting, sessionId: 'demo' }
  if (VIEW === 'escuchando') {
    return { ...demo, status: Status.LISTENING, micLevel: wave * 0.7, listenedSeconds: 754 + Math.floor(tick / 11), segments: [{ seq: 0, text: SAMPLE_HEARD }] }
  }
  if (VIEW === 'pensando') return { ...demo, status: Status.PREPARING }
  if (VIEW === 'hablando') {
    return { ...demo, status: Status.SPEAKING, assistantSpeaking: true, volume: wave, partial: { role: 'assistant', text: SAMPLE_SPEECH } }
  }
  return meeting
}
