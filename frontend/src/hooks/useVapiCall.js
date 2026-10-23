import { useCallback, useEffect, useRef, useState } from 'react'
import Vapi from '@vapi-ai/web'
import { analyzeTranscript } from '../lib/api'

export const CallStatus = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  ACTIVE: 'ACTIVE',
  ANALYZING: 'ANALYZING',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
}

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID

const DEMO_TRANSCRIPT = [
  { role: 'assistant', text: 'Hola, bienvenido. Cuéntame sobre un proyecto del que te sientas orgulloso.' },
  { role: 'user', text: 'Pues, eh, hice un sistema de monitoreo de residuos con sensores en los contenedores que avisan cuando están llenos.' },
  { role: 'assistant', text: 'Interesante. ¿Qué impacto tuvo en la operación?' },
  { role: 'user', text: 'Redujimos como un veinte por ciento los viajes de recolección, más o menos, y bajamos costos de combustible.' },
  { role: 'assistant', text: '¿Cuál fue el mayor reto técnico?' },
  { role: 'user', text: 'La conectividad. Muchos contenedores están en zonas sin buena señal, así que usamos LoRaWAN y un buffer local para reenviar las lecturas.' },
]

// Une fragmentos finales consecutivos del mismo interlocutor en una sola intervención.
function appendUtterance(list, role, text) {
  const last = list[list.length - 1]
  if (last && last.role === role) {
    return [...list.slice(0, -1), { role, text: `${last.text} ${text}` }]
  }
  return [...list, { role, text }]
}

function errorMessage(err) {
  if (!err) return 'Error desconocido en la llamada.'
  if (typeof err === 'string') return err
  return err.errorMsg || err.message || err.error?.message || err.error?.msg || 'Error en la llamada de voz.'
}

export function useVapiCall() {
  const [status, setStatus] = useState(CallStatus.IDLE)
  const [transcript, setTranscript] = useState([])
  const [partial, setPartial] = useState(null) // { role, text } en curso
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [volume, setVolume] = useState(0)
  const [muted, setMuted] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)

  const vapiRef = useRef(null)
  const transcriptRef = useRef([])
  const statusRef = useRef(CallStatus.IDLE)
  const sessionIdRef = useRef(null)

  const updateStatus = useCallback((s) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const fail = useCallback((msg) => {
    setError(msg)
    updateStatus(CallStatus.ERROR)
  }, [updateStatus])

  const runAnalysis = useCallback(async () => {
    const utterances = transcriptRef.current
    if (!utterances.some((u) => u.role === 'user')) {
      fail('La llamada terminó sin intervenciones del usuario; no hay nada que analizar.')
      return
    }
    updateStatus(CallStatus.ANALYZING)
    try {
      const result = await analyzeTranscript(utterances, sessionIdRef.current)
      setAnalysis(result)
      updateStatus(CallStatus.COMPLETED)
    } catch (e) {
      fail(`No se pudo generar el análisis: ${e.message}`)
    }
  }, [fail, updateStatus])

  useEffect(() => {
    if (!PUBLIC_KEY) return
    const vapi = new Vapi(PUBLIC_KEY)
    vapiRef.current = vapi

    const onCallStart = () => updateStatus(CallStatus.ACTIVE)

    const onCallEnd = () => {
      setAssistantSpeaking(false)
      setVolume(0)
      setPartial(null)
      setMuted(false)
      // Solo analizamos si la llamada llegó a estar activa (no tras un error de conexión).
      if (statusRef.current === CallStatus.ACTIVE) runAnalysis()
      else if (statusRef.current === CallStatus.CONNECTING) fail('La llamada terminó antes de conectarse.')
    }

    const onSpeechStart = () => setAssistantSpeaking(true)
    const onSpeechEnd = () => setAssistantSpeaking(false)
    const onVolume = (level) => setVolume(level)

    const onMessage = (msg) => {
      if (msg?.type !== 'transcript' || !msg.transcript) return
      const role = msg.role === 'assistant' ? 'assistant' : 'user'
      if (msg.transcriptType === 'final') {
        transcriptRef.current = appendUtterance(transcriptRef.current, role, msg.transcript.trim())
        setTranscript(transcriptRef.current)
        setPartial(null)
      } else {
        setPartial({ role, text: msg.transcript })
      }
    }

    const onError = (err) => {
      console.error('Vapi error', err)
      // Si ya había conversación, intentamos analizar lo capturado; si no, mostramos el error.
      if (statusRef.current === CallStatus.ACTIVE && transcriptRef.current.length) return
      if (statusRef.current === CallStatus.CONNECTING || statusRef.current === CallStatus.ACTIVE) {
        fail(errorMessage(err))
      }
    }

    vapi.on('call-start', onCallStart)
    vapi.on('call-end', onCallEnd)
    vapi.on('speech-start', onSpeechStart)
    vapi.on('speech-end', onSpeechEnd)
    vapi.on('volume-level', onVolume)
    vapi.on('message', onMessage)
    vapi.on('error', onError)

    return () => {
      vapi.removeAllListeners()
      vapi.stop()
      vapiRef.current = null
    }
  }, [fail, runAnalysis, updateStatus])

  const start = useCallback(async () => {
    if (!PUBLIC_KEY || !ASSISTANT_ID) {
      fail('Faltan VITE_VAPI_PUBLIC_KEY o VITE_VAPI_ASSISTANT_ID en frontend/.env')
      return
    }
    transcriptRef.current = []
    sessionIdRef.current = `session-${Date.now()}`
    setTranscript([])
    setPartial(null)
    setAnalysis(null)
    setError(null)
    updateStatus(CallStatus.CONNECTING)
    try {
      await vapiRef.current.start(ASSISTANT_ID)
    } catch (e) {
      fail(errorMessage(e))
    }
  }, [fail, updateStatus])

  const stop = useCallback(() => {
    vapiRef.current?.stop()
  }, [])

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current
    if (!vapi) return
    const next = !vapi.isMuted()
    vapi.setMuted(next)
    setMuted(next)
  }, [])

  // Solo desarrollo: analiza una conversación de ejemplo sin pasar por Vapi.
  const runDemo = useCallback(() => {
    transcriptRef.current = DEMO_TRANSCRIPT
    sessionIdRef.current = `demo-${Date.now()}`
    setTranscript(DEMO_TRANSCRIPT)
    setAnalysis(null)
    setError(null)
    runAnalysis()
  }, [runAnalysis])

  const reset = useCallback(() => {
    transcriptRef.current = []
    setTranscript([])
    setPartial(null)
    setAnalysis(null)
    setError(null)
    updateStatus(CallStatus.IDLE)
  }, [updateStatus])

  return {
    status,
    transcript,
    partial,
    assistantSpeaking,
    userSpeaking: partial?.role === 'user',
    volume,
    muted,
    analysis,
    error,
    start,
    stop,
    toggleMute,
    reset,
    retryAnalysis: runAnalysis,
    runDemo,
    canRetryAnalysis: transcript.some((u) => u.role === 'user'),
  }
}
