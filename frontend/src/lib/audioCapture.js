// Captura de audio de la reunión en bloques independientes para enviarlos a transcribir.
// Cada bloque se corta en una pausa natural (entre MIN y MAX segundos) para no partir palabras,
// y los bloques sin voz se descartan para evitar que Whisper "invente" texto con el silencio.

const MIN_CHUNK_MS = 15000
const MAX_CHUNK_MS = 30000
const PAUSE_MS = 500
const SILENCE_RMS = 0.012 // por debajo: silencio
const VOICE_RMS = 0.02 // por encima en algún momento del bloque: hubo voz
const MIME = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(
  (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
)

// Fuente de audio. Hoy es el micrófono (reunión presencial); para Teams se agregará aquí el audio del sistema.
export async function openAudioSource() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  })
}

export function createChunker(stream, { onChunk, onLevel }) {
  const ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  ctx.createMediaStreamSource(stream).connect(analyser)
  const samples = new Float32Array(analyser.fftSize)

  let current = null // { recorder, parts, start, hadVoice }
  let silentSince = null
  let stopped = false
  const finishing = new Set()

  const rms = () => {
    analyser.getFloatTimeDomainData(samples)
    let sum = 0
    for (const s of samples) sum += s * s
    return Math.sqrt(sum / samples.length)
  }

  const startRecorder = () => {
    const recorder = new MediaRecorder(stream, MIME ? { mimeType: MIME } : undefined)
    const chunk = { recorder, parts: [], start: performance.now(), hadVoice: false }
    recorder.ondataavailable = (e) => e.data.size && chunk.parts.push(e.data)
    recorder.start()
    silentSince = null
    current = chunk
  }

  // Cierra el bloque indicado y entrega su audio (si tuvo voz).
  const finish = (chunk) => {
    const done = new Promise((resolve) => {
      chunk.recorder.onstop = () => {
        const blob = new Blob(chunk.parts, { type: chunk.recorder.mimeType || 'audio/webm' })
        if (chunk.hadVoice && blob.size > 2000) onChunk(blob, performance.now() - chunk.start)
        resolve()
      }
      chunk.recorder.stop()
    })
    finishing.add(done)
    done.then(() => finishing.delete(done))
    return done
  }

  const tick = () => {
    if (stopped || !current) return
    const level = rms()
    onLevel?.(Math.min(1, level * 8))
    if (level > VOICE_RMS) current.hadVoice = true
    const now = performance.now()
    silentSince = level < SILENCE_RMS ? (silentSince ?? now) : null
    const elapsed = now - current.start
    const pause = silentSince !== null && now - silentSince >= PAUSE_MS
    if ((elapsed >= MIN_CHUNK_MS && pause) || elapsed >= MAX_CHUNK_MS) {
      const ended = current
      startRecorder() // el siguiente bloque arranca de inmediato para no perder audio
      finish(ended)
    }
  }

  startRecorder()
  const interval = setInterval(tick, 100)

  return {
    // Detiene la captura entregando el último bloque.
    async stop() {
      if (stopped) return
      stopped = true
      clearInterval(interval)
      if (current?.recorder.state === 'recording') finish(current)
      await Promise.all(finishing) // incluye un bloque anterior que aún se estuviera cerrando
      onLevel?.(0)
      await ctx.close()
    },
  }
}
