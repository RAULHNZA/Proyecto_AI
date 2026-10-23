import { Loader2, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { CallStatus } from '../hooks/useVapiCall'
import RobotAvatar from './RobotAvatar'

function StatusPill({ text, color }) {
  return (
    <div className="glass flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-white/90">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      </span>
      {text}
    </div>
  )
}

function CallButton({ status, onStart, onStop }) {
  const active = status === CallStatus.ACTIVE
  const connecting = status === CallStatus.CONNECTING

  return (
    <div className="relative grid place-items-center">
      {/* Anillo de degradado giratorio en reposo */}
      {!active && !connecting && (
        <div className="animate-spin-slow absolute -inset-2 rounded-full bg-[conic-gradient(#a78bfa,#60a5fa,#34d399,#ffffff,#a78bfa)] opacity-80 blur-[6px]" />
      )}
      {/* Pulsos mientras la llamada está activa */}
      {active && (
        <>
          <span className="animate-ping-soft absolute inset-0 rounded-full bg-rose-500/50" />
          <span className="animate-ping-soft absolute inset-0 rounded-full bg-fuchsia-500/40 [animation-delay:0.9s]" />
        </>
      )}

      <button
        onClick={active ? onStop : onStart}
        disabled={connecting}
        aria-label={active ? 'Colgar' : 'Iniciar conversación'}
        className={`relative grid h-20 w-20 place-items-center rounded-full text-white shadow-2xl ring-1 ring-white/40 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${
          active
            ? 'bg-gradient-to-br from-rose-500 to-fuchsia-600 shadow-rose-600/40 hover:scale-105 active:scale-95'
            : connecting
              ? 'cursor-wait bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/40'
              : 'bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 shadow-violet-600/40 hover:scale-110 active:scale-95'
        }`}
      >
        <span className="pointer-events-none absolute inset-1 rounded-full bg-gradient-to-b from-white/35 to-transparent" />
        {connecting ? (
          <Loader2 className="relative h-8 w-8 animate-spin" />
        ) : active ? (
          <PhoneOff className="relative h-8 w-8" />
        ) : (
          <Phone className="relative h-8 w-8" />
        )}
      </button>
    </div>
  )
}

export default function CallController({ call }) {
  const { status, assistantSpeaking, userSpeaking, volume, muted, start, stop, toggleMute } = call
  const active = status === CallStatus.ACTIVE
  const connecting = status === CallStatus.CONNECTING
  const idle = status === CallStatus.IDLE

  const pill = connecting
    ? { text: 'Conectando con el asistente…', color: '#fbbf24' }
    : assistantSpeaking
      ? { text: 'El asistente está hablando', color: '#38bdf8' }
      : userSpeaking
        ? { text: 'Te escucho…', color: '#34d399' }
        : muted
          ? { text: 'Micrófono silenciado', color: '#fbbf24' }
          : { text: 'Escuchando', color: '#a78bfa' }

  return (
    <section className="flex w-full flex-col items-center">
      <div className="mb-2 flex min-h-[88px] flex-col items-center justify-end text-center">
        {idle ? (
          <div className="animate-rise">
            <h1 className="font-display text-gradient text-3xl font-bold tracking-tight sm:text-5xl">Hola, soy tu asistente</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70 sm:text-base">
              Conversa conmigo por voz. Al terminar, te entrego un análisis de tu desempeño.
            </p>
          </div>
        ) : (
          <StatusPill {...pill} />
        )}
      </div>

      <RobotAvatar
        status={status}
        speaking={active && assistantSpeaking}
        volume={volume}
        className="w-[min(70vw,300px)]"
      />

      {/* Botón de llamada justo debajo del robot */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <CallButton status={status} onStart={start} onStop={stop} />
        <p className="font-display text-sm font-medium tracking-wide text-white/85">
          {active ? 'Toca para colgar' : connecting ? 'Conectando…' : 'Toca para hablar'}
        </p>

        {active && (
          <button
            onClick={toggleMute}
            className={`glass animate-rise flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              muted ? 'text-amber-200' : 'text-white/80 hover:text-white'
            }`}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {muted ? 'Activar micrófono' : 'Silenciar micrófono'}
          </button>
        )}
      </div>
    </section>
  )
}
