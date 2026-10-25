import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import logo from './assets/logo-red-ambiental-blanco.png'
import Background from './components/Background'
import ConclusionCard from './components/ConclusionCard'
import ControlPanel, { STATUS_INFO } from './components/ControlPanel'
import { ColumnTitle, InfoPanel, TelemetryBar } from './components/HoloPanel'
import QuestionBox from './components/QuestionBox'
import TranscriptDrawer from './components/TranscriptDrawer'
import { useDevPreview } from './hooks/useDevPreview'
import { Status, useMeeting } from './hooks/useMeeting'
import { getAgenda } from './lib/api'
import { ESCUCHA_HABILITADA, PROYECTOS_VISIBLES } from './lib/features'

function Header({ status }) {
  const badge = STATUS_INFO[status]
  const live = status !== Status.IDLE && status !== Status.FINISHED && status !== Status.ERROR
  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <div className="glass mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-5 py-3">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Red Ambiental" className="h-9 w-auto sm:h-10" />
          <span className="hidden h-9 w-px bg-white/25 sm:block" />
          <div className="hidden leading-tight sm:block">
            <p className="font-display text-base font-extrabold tracking-wide text-white">
              RED<span className="text-ra-green">-i</span>
            </p>
            <p className="text-[11px] text-white/60">Agente de IA · Planeación Estratégica TI 2027</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15">
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

function Banner({ tone, children, onClose }) {
  const error = tone === 'error'
  const Icon = error ? AlertTriangle : Info
  return (
    <div
      className={`animate-rise flex w-full max-w-2xl items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${
        error ? 'bg-[#FA3214]/15 text-red-100 ring-[#FA3214]/40' : 'bg-[#CEA052]/15 text-amber-100 ring-[#CEA052]/40'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{children}</p>
      {onClose && (
        <button onClick={onClose} aria-label="Cerrar aviso" className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

const normalize = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const GENERIC = new Set(['inteligencia', 'inteligente', 'artificial', 'proyecto', 'proyectos', 'para', 'sistema', 'programa', 'interna', 'interno', 'aplicacion', 'operativas', 'futuras'])

// Raíces con las que se reconoce un panel: sus "claves" (pilares) o las palabras de su título (proyectos).
function keysFor(item) {
  if (item.claves?.length) return item.claves.map(normalize)
  return normalize(item.titulo)
    .split(/[^a-zñ]+/)
    .filter((w) => w.length >= 5 && !GENERIC.has(w))
    .map((w) => w.slice(0, 6)) // raíz: "predictivo" ≈ "predictiva"
}

// Índice del panel mencionado más recientemente en `text` (o -1).
function mentionedItem(items, text) {
  if (!text) return -1
  const haystack = normalize(text.slice(-260))
  let best = -1
  let bestPos = -1
  items.forEach((item, i) => {
    for (const key of keysFor(item)) {
      const pos = haystack.lastIndexOf(key)
      if (pos > bestPos) {
        bestPos = pos
        best = i
      }
    }
  })
  return best
}

export default function App() {
  const meeting = useDevPreview(useMeeting())
  const { status, segments, conclusion, qa, partial, error, notice, pendingUploads, lostChunks } = meeting
  const [agenda, setAgenda] = useState({ pilares: [], proyectos: [] })
  const speaking = status === Status.SPEAKING
  const listening = status === Status.LISTENING

  useEffect(() => {
    getAgenda()
      .then((a) => setAgenda({ pilares: a.pilares || [], proyectos: a.proyectos || [] }))
      .catch(() => setAgenda({ pilares: [], proyectos: [] }))
  }, [])

  // Lo que RED-i está diciendo ahora o lo último que se escuchó de la sala (para iluminar el panel).
  const lastAssistant = [...qa].reverse().find((u) => u.role === 'assistant')?.text || ''
  const caption = partial?.role === 'assistant' ? partial.text : meeting.assistantSpeaking ? lastAssistant : ''
  const focusText = speaking ? caption || lastAssistant : listening ? segments[segments.length - 1]?.text : ''
  const items = useMemo(() => [...agenda.pilares, ...agenda.proyectos], [agenda])
  const active = useMemo(() => mentionedItem(items, focusText), [items, focusText])

  const words = useMemo(() => segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0), [segments])
  const pillarCount = agenda.pilares.length
  const panelProps = { activeLabel: listening ? 'Escuchando sobre esto' : 'Hablando de esto', live: listening || speaking }

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden font-sans text-white">
      <Background mode={STATUS_INFO[status].mode} />
      <Header status={status} />

      <main className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 pb-16 pt-6 sm:px-6">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)_minmax(0,290px)]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            {pillarCount > 0 && <ColumnTitle side="left">Pilares estratégicos</ColumnTitle>}
            {agenda.pilares.map((p, i) => (
              <InfoPanel key={p.titulo} kind="Pilar" number={i + 1} order={i} item={p} side="left" active={i === active} {...panelProps} />
            ))}
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <ControlPanel meeting={meeting} />
            {ESCUCHA_HABILITADA && !speaking && <TelemetryBar listening={listening} seconds={meeting.listenedSeconds} segments={segments.length} words={words} level={meeting.micLevel} />}
          </div>
          <div className="order-3 flex flex-col gap-4">
            {PROYECTOS_VISIBLES && agenda.proyectos.length > 0 && <ColumnTitle side="right">Proyectos con IA</ColumnTitle>}
            {PROYECTOS_VISIBLES && agenda.proyectos.map((p, i) => (
              <InfoPanel key={p.titulo} kind="Proyecto" number={i + 1} order={i} item={p} side="right" active={pillarCount + i === active} {...panelProps} />
            ))}
          </div>
        </div>

        {status === Status.ERROR && error && (
          <Banner tone="error" onClose={meeting.dismissError}>
            {error}
          </Banner>
        )}
        {notice && <Banner tone="notice">{notice}</Banner>}

        {speaking && <QuestionBox onAsk={meeting.ask} />}

        {(qa.length > 0 || speaking) && (
          <div className="w-full max-w-2xl">
            <TranscriptDrawer title="Conversación con RED-i" transcript={qa} partial={partial} defaultOpen />
          </div>
        )}

        {conclusion && (
          <ConclusionCard
            conclusion={conclusion}
            canReadAloud={!speaking && status !== Status.CONNECTING}
            browserSpeaking={meeting.browserSpeaking}
            onReadAloud={meeting.readWithBrowser}
          />
        )}

        {ESCUCHA_HABILITADA && (segments.length > 0 || listening) && (
          <div className="w-full max-w-2xl">
            <TranscriptDrawer
              title="Lo que he escuchado"
              transcript={segments.map((s) => ({ role: 'meeting', text: s.text }))}
              emptyText="Escuchando… el primer fragmento aparece en unos 20 segundos."
              defaultOpen={false}
            />
            {(pendingUploads > 0 || lostChunks > 0) && (
              <p className="mt-2 text-center text-xs text-white/45">
                {pendingUploads > 0 && `Transcribiendo ${pendingUploads} fragmento${pendingUploads > 1 ? 's' : ''}…`}
                {pendingUploads > 0 && lostChunks > 0 && ' · '}
                {lostChunks > 0 && `${lostChunks} fragmento${lostChunks > 1 ? 's' : ''} sin transcribir`}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
