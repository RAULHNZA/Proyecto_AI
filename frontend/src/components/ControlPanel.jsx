import { Ear, Loader2, Megaphone, Mic, MicOff, Pause, PhoneOff, RotateCcw } from 'lucide-react'
import { Status } from '../hooks/useMeeting'
import { ESCUCHA_HABILITADA } from '../lib/features'
import RobotAvatar from './RobotAvatar'

export const STATUS_INFO = {
  [Status.IDLE]: { label: 'En espera', color: '#3CBBF4', mode: 'idle' },
  [Status.STARTING]: { label: 'Activando micrófono', color: '#CEA052', mode: 'thinking' },
  [Status.LISTENING]: { label: 'Escuchando', color: '#84BD00', mode: 'listening' },
  [Status.PREPARING]: { label: 'Analizando', color: '#CEA052', mode: 'thinking' },
  [Status.CONNECTING]: { label: 'Conectando voz', color: '#CEA052', mode: 'thinking' },
  [Status.SPEAKING]: { label: 'En voz', color: '#3CBBF4', mode: 'speaking' },
  [Status.FINISHED]: { label: 'Sesión terminada', color: '#84BD00', mode: 'idle' },
  [Status.ERROR]: { label: 'Atención', color: '#FA3214', mode: 'idle' },
}

function StatusPill({ text, color }) {
  return (
    <div className="holo flex items-center gap-2.5 rounded-full px-5 py-2 text-sm font-medium text-white/95">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      </span>
      <span className="relative">{text}</span>
    </div>
  )
}

const TONES = {
  listen: 'from-[#5e8a00] via-ra-green to-[#b5e34d] shadow-[0_0_40px_-6px_rgba(132,189,0,0.9)]',
  pause: 'from-ra-navy via-[#0b2a5e] to-ra-navy ring-2 ring-ra-green/80 shadow-[0_0_40px_-6px_rgba(132,189,0,0.7)]',
  speak: 'from-ra-blue via-[#1a5fd1] to-ra-sky shadow-[0_0_40px_-6px_rgba(60,187,244,0.9)]',
  stop: 'from-[#b32410] via-[#FA3214] to-[#ff6a52] shadow-[0_0_40px_-6px_rgba(250,50,20,0.8)]',
}

function ActionButton({ icon: Icon, label, hint, onClick, tone, disabled, busy, pulse }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex min-w-[210px] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r px-6 py-4 text-left text-white ring-1 ring-white/30 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${
        disabled ? 'cursor-not-allowed opacity-40 saturate-50' : 'hover:-translate-y-1 hover:scale-[1.03] active:scale-95'
      } ${TONES[tone]}`}
    >
      {pulse && <span className="animate-ping-soft absolute inset-0 rounded-2xl bg-ra-green/30" />}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-60" />
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 group-hover:translate-x-[400%]" />
      <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-white/20 ring-1 ring-white/40">
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
      </span>
      <span className="relative">
        <span className="font-display block text-lg font-extrabold leading-tight tracking-wide">{label}</span>
        {hint && <span className="block text-xs text-white/80">{hint}</span>}
      </span>
    </button>
  )
}

export default function ControlPanel({ meeting }) {
  const { status, segments, assistantSpeaking, volume, muted, sessionId } = meeting
  const listening = status === Status.LISTENING
  const speaking = status === Status.SPEAKING
  const busy = status === Status.STARTING || status === Status.PREPARING || status === Status.CONNECTING
  const fresh = status === Status.IDLE && !sessionId
  const info = STATUS_INFO[status]

  const pillText = {
    [Status.IDLE]: `En pausa · ${segments.length} fragmentos escuchados`,
    [Status.STARTING]: 'Activando micrófono…',
    [Status.LISTENING]: 'Escuchando la sesión en silencio',
    [Status.PREPARING]: 'Preparándome para hablar…',
    [Status.CONNECTING]: 'Preparando mi voz…',
    [Status.SPEAKING]: assistantSpeaking ? 'RED-i está hablando' : muted ? 'Micrófono silenciado' : 'Te escucho: hazme una pregunta',
    [Status.FINISHED]: 'Sesión terminada',
    [Status.ERROR]: 'Revisa el aviso',
  }[status]

  return (
    <section className="flex w-full flex-col items-center">
      <div className="flex min-h-[96px] flex-col items-center justify-end text-center">
        {fresh ? (
          <div className="animate-rise">
            <p className="font-display text-xs font-bold uppercase tracking-[0.35em] text-ra-green">Planeación Estratégica TI 2027</p>
            <h1 className="font-display text-shimmer mt-1 text-5xl font-black tracking-tight sm:text-7xl">RED-i</h1>
            <p className="mx-auto mt-1 max-w-md text-sm text-white/70">Agente de inteligencia artificial de Red Ambiental</p>
          </div>
        ) : (
          <StatusPill text={pillText} color={info.color} />
        )}
      </div>

      <RobotAvatar
        light={info.color}
        mode={info.mode}
        speaking={speaking && assistantSpeaking}
        volume={volume}
        className="animate-materialize mt-2 w-[min(80vw,390px)]"
      />

      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
        {speaking ? (
          <ActionButton icon={PhoneOff} label="Terminar" hint="Cerrar la ronda de preguntas" tone="stop" onClick={meeting.endCall} />
        ) : !ESCUCHA_HABILITADA ? null : listening ? (
          <ActionButton icon={Pause} label="Pausar" hint="Dejar de escuchar" tone="pause" onClick={meeting.pause} pulse />
        ) : (
          <ActionButton
            icon={Ear}
            label={sessionId ? 'Seguir escuchando' : 'Escuchar'}
            hint="Escucho la sesión en silencio"
            tone="listen"
            onClick={meeting.listen}
            disabled={busy}
            busy={status === Status.STARTING}
          />
        )}
        {!speaking && (
          <ActionButton
            icon={Megaphone}
            label="Interactúa conmigo"
            hint="Expongo la estrategia de IA 2027"
            tone="speak"
            onClick={meeting.speak}
            disabled={busy}
            busy={status === Status.PREPARING || status === Status.CONNECTING}
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {speaking && (
          <button
            onClick={meeting.toggleMute}
            className={`holo animate-rise flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              muted ? 'text-[#e8c88a]' : 'text-white/85 hover:text-white'
            }`}
          >
            {muted ? <MicOff className="relative h-4 w-4" /> : <Mic className="relative h-4 w-4" />}
            <span className="relative">{muted ? 'Activar micrófono' : 'Silenciar micrófono'}</span>
          </button>
        )}
        {sessionId && !speaking && !busy && !listening && (
          <button
            onClick={() => window.confirm('¿Empezar una sesión nueva? Lo escuchado hasta ahora queda guardado en el respaldo del backend.') && meeting.newSession()}
            className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/85"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nueva sesión
          </button>
        )}
      </div>
    </section>
  )
}
