import { useCallback, useEffect, useRef, useState } from 'react'
import Vapi from '@vapi-ai/web'
import { concludeSession, createSession, getSession, uploadChunk } from '../lib/api'
import { createChunker, openAudioSource } from '../lib/audioCapture'
import { ESCUCHA_HABILITADA } from '../lib/features'

export const Status = {
  IDLE: 'IDLE',
  STARTING: 'STARTING', // pidiendo micrófono
  LISTENING: 'LISTENING', // escuchando la reunión en silencio
  PREPARING: 'PREPARING', // cerrando el último bloque y generando la conclusión
  CONNECTING: 'CONNECTING', // conectando con Vapi
  SPEAKING: 'SPEAKING', // llamada de Vapi activa: conclusión y preguntas
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
}

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID
// Modelo con el que Vapi responde las preguntas (se sobrescribe el del panel para inyectar el contexto).
const VAPI_MODEL_PROVIDER = import.meta.env.VITE_VAPI_MODEL_PROVIDER || 'openai'
const VAPI_MODEL = import.meta.env.VITE_VAPI_MODEL || 'gpt-4.1'
const MAX_QA_SECONDS = 15 * 60
const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000]
const STORAGE_KEY = 'asistente-planeacion.sesion'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Texto listo para la voz: en un solo bloque y con los años en palabras (con dígitos la voz los lee en inglés).
const YEARS = { 2026: 'dos mil veintiséis', 2027: 'dos mil veintisiete', 2028: 'dos mil veintiocho' }
const forSpeech = (text) =>
  text
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\b(2026|2027|2028)\b/g, (y) => YEARS[y])

const storage = {
  get: () => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  },
  set: (v) => {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, v)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // sin almacenamiento: solo se pierde la opción de retomar
    }
  },
}

function errorMessage(err) {
  if (!err) return 'Error desconocido.'
  if (typeof err === 'string') return err
  return err.errorMsg || err.message || err.error?.message || err.error?.msg || 'Error en la llamada de voz.'
}

// Une fragmentos finales consecutivos del mismo interlocutor en una sola intervención.
function appendUtterance(list, role, text) {
  const last = list[list.length - 1]
  if (last && last.role === role) {
    return [...list.slice(0, -1), { role, text: `${last.text} ${text}` }]
  }
  return [...list, { role, text }]
}

export function useMeeting() {
  const [status, setStatus] = useState(Status.IDLE)
  const [sessionId, setSessionId] = useState(null)
  const [segments, setSegments] = useState([]) // [{ seq, text }]
  const [micLevel, setMicLevel] = useState(0)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [lostChunks, setLostChunks] = useState(0)
  const [conclusion, setConclusion] = useState(null)
  const [qa, setQa] = useState([]) // preguntas y respuestas con Vapi
  const [partial, setPartial] = useState(null)
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [volume, setVolume] = useState(0)
  const [muted, setMuted] = useState(false)
  const [browserSpeaking, setBrowserSpeaking] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null) // avisos no fatales
  const [listenedSeconds, setListenedSeconds] = useState(0)

  const statusRef = useRef(Status.IDLE)
  const sessionRef = useRef(null)
  const seqRef = useRef(0)
  const queueRef = useRef(Promise.resolve())
  const chunkerRef = useRef(null)
  const streamRef = useRef(null)
  const vapiRef = useRef(null)
  const qaRef = useRef([])

  const updateStatus = useCallback((s) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const fail = useCallback(
    (msg) => {
      setError(msg)
      updateStatus(Status.ERROR)
    },
    [updateStatus],
  )

  const adoptSession = useCallback((id, segs = []) => {
    sessionRef.current = id
    setSessionId(id)
    setSegments(segs)
    seqRef.current = segs.length ? Math.max(...segs.map((s) => s.seq)) + 1 : 0
    storage.set(id)
  }, [])

  // Retoma la sesión anterior si el navegador se cerró a media reunión.
  useEffect(() => {
    const saved = storage.get()
    if (!saved || !ESCUCHA_HABILITADA) return
    getSession(saved)
      .then((s) => s.segments.length && adoptSession(s.session_id, s.segments))
      .catch(() => storage.set(null))
  }, [adoptSession])

  // Cronómetro de escucha (se muestra en el panel de telemetría).
  useEffect(() => {
    if (status !== Status.LISTENING) return
    const timer = setInterval(() => setListenedSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [status])

  // ---------- Escuchar ----------

  const uploadWithRetry = useCallback(async (sid, seq, blob) => {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await uploadChunk(sid, seq, blob)
        if (res.text) setSegments((prev) => [...prev, { seq, text: res.text }])
        setNotice(null)
        return
      } catch (e) {
        if (attempt >= RETRY_DELAYS_MS.length || (e.status >= 400 && e.status < 500 && e.status !== 429)) {
          setLostChunks((n) => n + 1)
          setNotice(`No se pudo transcribir un fragmento: ${e.message}`)
          return
        }
        setNotice(`Reintentando transcripción… (${e.message})`)
        await wait(RETRY_DELAYS_MS[attempt])
      }
    }
  }, [])

  const enqueueChunk = useCallback(
    (blob) => {
      const sid = sessionRef.current
      const seq = seqRef.current++
      setPendingUploads((n) => n + 1)
      // En cola para que los bloques lleguen en orden al backend.
      queueRef.current = queueRef.current
        .then(() => uploadWithRetry(sid, seq, blob))
        .finally(() => setPendingUploads((n) => n - 1))
    },
    [uploadWithRetry],
  )

  const listen = useCallback(async () => {
    setError(null)
    updateStatus(Status.STARTING)
    try {
      if (!sessionRef.current) {
        const { session_id } = await createSession()
        adoptSession(session_id)
      }
      const stream = await openAudioSource()
      streamRef.current = stream
      chunkerRef.current = createChunker(stream, { onChunk: enqueueChunk, onLevel: setMicLevel })
      updateStatus(Status.LISTENING)
    } catch (e) {
      fail(e.name === 'NotAllowedError' ? 'Se negó el permiso del micrófono.' : errorMessage(e))
    }
  }, [adoptSession, enqueueChunk, fail, updateStatus])

  const stopListening = useCallback(async () => {
    const chunker = chunkerRef.current
    chunkerRef.current = null
    await chunker?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setMicLevel(0)
  }, [])

  const pause = useCallback(async () => {
    await stopListening()
    updateStatus(Status.IDLE)
  }, [stopListening, updateStatus])

  // ---------- Hablar (Vapi) ----------

  useEffect(() => {
    if (!PUBLIC_KEY) return
    const vapi = new Vapi(PUBLIC_KEY)
    vapiRef.current = vapi

    vapi.on('call-start', () => updateStatus(Status.SPEAKING))
    vapi.on('call-end', () => {
      setAssistantSpeaking(false)
      setVolume(0)
      setPartial(null)
      setMuted(false)
      if (statusRef.current === Status.SPEAKING) updateStatus(Status.FINISHED)
    })
    vapi.on('speech-start', () => setAssistantSpeaking(true))
    vapi.on('speech-end', () => setAssistantSpeaking(false))
    vapi.on('volume-level', (level) => setVolume(level))
    vapi.on('message', (msg) => {
      if (msg?.type !== 'transcript' || !msg.transcript) return
      const role = msg.role === 'assistant' ? 'assistant' : 'user'
      if (msg.transcriptType === 'final') {
        qaRef.current = appendUtterance(qaRef.current, role, msg.transcript.trim())
        setQa(qaRef.current)
        setPartial(null)
      } else {
        setPartial({ role, text: msg.transcript })
      }
    })
    vapi.on('error', (err) => {
      console.error('Vapi error', err)
      if (statusRef.current === Status.CONNECTING) {
        fail(`No se pudo iniciar la voz del asistente: ${errorMessage(err)}. La conclusión está en pantalla.`)
      }
    })

    return () => {
      vapi.removeAllListeners()
      vapi.stop()
      vapiRef.current = null
    }
  }, [fail, updateStatus])

  const speak = useCallback(async () => {
    setError(null)
    window.speechSynthesis?.cancel()
    if (chunkerRef.current) await stopListening() // no se transcribe a sí mismo
    updateStatus(Status.PREPARING)
    let result
    try {
      if (!sessionRef.current) {
        const { session_id } = await createSession()
        adoptSession(session_id)
      }
      await queueRef.current // espera a que se transcriba el último bloque
      result = await concludeSession(sessionRef.current)
      setConclusion(result)
    } catch (e) {
      fail(`No se pudo generar la conclusión: ${e.message}`)
      return
    }

    if (!PUBLIC_KEY || !ASSISTANT_ID || !vapiRef.current) {
      fail('Faltan VITE_VAPI_PUBLIC_KEY o VITE_VAPI_ASSISTANT_ID en frontend/.env. La conclusión está en pantalla.')
      return
    }
    qaRef.current = []
    setQa([])
    updateStatus(Status.CONNECTING)
    try {
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessage: forSpeech(result.texto),
        firstMessageMode: 'assistant-speaks-first',
        firstMessageInterruptionsEnabled: false, // el ruido de la sala no corta la conclusión
        model: {
          provider: VAPI_MODEL_PROVIDER,
          model: VAPI_MODEL,
          messages: [{ role: 'system', content: result.contexto_asistente }],
        },
        maxDurationSeconds: MAX_QA_SECONDS,
        // En sala hay comentarios sueltos: se necesitan varias palabras seguidas para interrumpir.
        stopSpeakingPlan: { numWords: 3, voiceSeconds: 0.4, backoffSeconds: 1 },
      })
    } catch (e) {
      fail(`No se pudo iniciar la voz del asistente: ${errorMessage(e)}. La conclusión está en pantalla.`)
    }
  }, [adoptSession, fail, stopListening, updateStatus])

  const endCall = useCallback(() => vapiRef.current?.stop(), [])

  const ask = useCallback((question) => {
    const text = question.trim()
    if (!text || !vapiRef.current || statusRef.current !== Status.SPEAKING) return
    qaRef.current = [...qaRef.current, { role: 'user', text }]
    setQa(qaRef.current)
    vapiRef.current.send({ type: 'add-message', message: { role: 'user', content: text }, triggerResponseEnabled: true })
  }, [])

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current
    if (!vapi) return
    const next = !vapi.isMuted()
    vapi.setMuted(next)
    setMuted(next)
  }, [])

  // Respaldo si Vapi falla: lee la conclusión con la voz del navegador.
  const readWithBrowser = useCallback(() => {
    const synth = window.speechSynthesis
    if (!synth || !conclusion) return
    if (synth.speaking) {
      synth.cancel()
      setBrowserSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(forSpeech(conclusion.texto))
    const voices = synth.getVoices()
    utterance.voice = voices.find((v) => v.lang === 'es-MX') || voices.find((v) => v.lang.startsWith('es')) || null
    utterance.lang = utterance.voice?.lang || 'es-MX'
    utterance.onend = utterance.onerror = () => setBrowserSpeaking(false)
    setBrowserSpeaking(true)
    synth.speak(utterance)
  }, [conclusion])

  const newSession = useCallback(async () => {
    await stopListening()
    vapiRef.current?.stop()
    window.speechSynthesis?.cancel()
    storage.set(null)
    sessionRef.current = null
    seqRef.current = 0
    qaRef.current = []
    setSessionId(null)
    setSegments([])
    setConclusion(null)
    setQa([])
    setLostChunks(0)
    setListenedSeconds(0)
    setError(null)
    setNotice(null)
    setBrowserSpeaking(false)
    updateStatus(Status.IDLE)
  }, [stopListening, updateStatus])

  // Libera el micrófono al cerrar la página.
  useEffect(
    () => () => {
      chunkerRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  return {
    status,
    sessionId,
    segments,
    micLevel,
    pendingUploads,
    lostChunks,
    conclusion,
    qa,
    partial,
    assistantSpeaking,
    volume,
    muted,
    browserSpeaking,
    listenedSeconds,
    error,
    notice,
    listen,
    pause,
    speak,
    endCall,
    ask,
    toggleMute,
    readWithBrowser,
    newSession,
    dismissError: () => {
      setError(null)
      updateStatus(Status.IDLE)
    },
  }
}
