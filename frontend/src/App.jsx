import { useEffect, useState } from 'react'
import { AlertTriangle, Bot, FlaskConical, RefreshCw, RotateCcw } from 'lucide-react'
import Background from './components/Background'
import CallController from './components/CallController'
import RobotAvatar from './components/RobotAvatar'
import TranscriptDrawer from './components/TranscriptDrawer'
import AnalysisDashboard from './components/AnalysisDashboard'
import { CallStatus, useVapiCall } from './hooks/useVapiCall'

const STATUS_BADGE = {
  [CallStatus.IDLE]: { label: 'Listo', color: '#34d399' },
  [CallStatus.CONNECTING]: { label: 'Conectando', color: '#fbbf24' },
  [CallStatus.ACTIVE]: { label: 'En llamada', color: '#fb7185' },
  [CallStatus.ANALYZING]: { label: 'Analizando', color: '#a78bfa' },
  [CallStatus.COMPLETED]: { label: 'Reporte listo', color: '#34d399' },
  [CallStatus.ERROR]: { label: 'Error', color: '#fb7185' },
}

function Header({ status }) {
  const badge = STATUS_BADGE[status]
  const live = status === CallStatus.ACTIVE || status === CallStatus.CONNECTING || status === CallStatus.ANALYZING
  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <div className="glass mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-sky-500 to-emerald-400 shadow-lg shadow-violet-600/40 ring-1 ring-white/30">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold text-white">Asistente de Voz</p>
            <p className="text-[11px] text-white/60">Conversa · Analiza · Mejora</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/15">
          <span className="relative flex h-2 w-2">
            {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: badge.color }} />}
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: badge.color }} />
          </span>
          {badge.label}
        </span>
      </div>
    </header>
  )
}

function AnalyzingView() {
  return (
    <section className="animate-rise flex flex-col items-center gap-10 pt-6 text-center">
      <RobotAvatar status={CallStatus.ANALYZING} className="w-[min(60vw,240px)]" />
      <div className="w-full max-w-sm">
        <p className="font-display text-shimmer text-2xl font-semibold">Analizando tu conversación…</p>
        <p className="mt-2 text-sm text-white/65">Estoy evaluando claridad, profundidad y fluidez de tus respuestas.</p>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="animate-indeterminate h-full w-2/5 rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400" />
        </div>
      </div>
    </section>
  )
}

function ErrorView({ message, onReset, onRetry }) {
  return (
    <section className="glass animate-rise flex w-full max-w-lg flex-col items-center gap-5 rounded-3xl p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 shadow-lg shadow-rose-700/40">
        <AlertTriangle className="h-7 w-7 text-white" />
      </div>
      <p className="text-white/90">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-700/30 transition-transform hover:scale-105"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar análisis
          </button>
        )}
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
        >
          <RotateCcw className="h-4 w-4" />
          Volver al inicio
        </button>
      </div>
    </section>
  )
}

let demoStarted = false // evita el doble disparo de StrictMode

const SPEAK_PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('hablar')

// Solo desarrollo: http://localhost:5173/?hablar simula al asistente hablando para ver la boca.
function useSpeakPreview(call) {
  const [volume, setVolume] = useState(0)
  useEffect(() => {
    if (!SPEAK_PREVIEW) return
    let t = 0
    const id = setInterval(() => {
      t += 1
      setVolume(Math.abs(Math.sin(t * 0.7)) * 0.5 + Math.random() * 0.2)
    }, 90)
    return () => clearInterval(id)
  }, [])
  if (!SPEAK_PREVIEW) return call
  return { ...call, status: CallStatus.ACTIVE, assistantSpeaking: true, volume }
}

export default function App() {
  const call = useSpeakPreview(useVapiCall())
  const { status, runDemo } = call

  // Solo desarrollo: http://localhost:5173/?demo lanza el análisis de ejemplo al cargar.
  useEffect(() => {
    if (import.meta.env.DEV && !demoStarted && new URLSearchParams(window.location.search).has('demo')) {
      demoStarted = true
      runDemo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inCall = status === CallStatus.IDLE || status === CallStatus.CONNECTING || status === CallStatus.ACTIVE

  return (
    <div className="relative isolate min-h-screen font-sans text-white">
      <Background />
      <Header status={status} />

      <main className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-16 pt-8 sm:px-6">
        {inCall && (
          <>
            <CallController call={call} />
            {import.meta.env.DEV && status === CallStatus.IDLE && (
              <button
                onClick={call.runDemo}
                className="flex items-center gap-1.5 text-xs text-white/45 transition-colors hover:text-white/80"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Probar análisis con una conversación de ejemplo (solo desarrollo)
              </button>
            )}
            {status !== CallStatus.IDLE && (
              <div className="w-full max-w-xl">
                <TranscriptDrawer transcript={call.transcript} partial={call.partial} />
              </div>
            )}
          </>
        )}

        {status === CallStatus.ANALYZING && <AnalyzingView />}

        {status === CallStatus.COMPLETED && call.analysis && (
          <>
            <AnalysisDashboard analysis={call.analysis} onReset={call.reset} />
            <TranscriptDrawer transcript={call.transcript} />
          </>
        )}

        {status === CallStatus.ERROR && (
          <>
            <ErrorView
              message={call.error}
              onReset={call.reset}
              onRetry={call.canRetryAnalysis ? call.retryAnalysis : null}
            />
            {call.transcript.length > 0 && (
              <div className="w-full max-w-xl">
                <TranscriptDrawer transcript={call.transcript} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
