import { useId } from 'react'
import { CallStatus } from '../hooks/useVapiCall'
import { usePointerTilt } from '../hooks/usePointerTilt'
import VoiceVisualizer from './VoiceVisualizer'

// Color de la antena y del indicador del pecho según el estado de la sesión.
const STATUS_LIGHT = {
  [CallStatus.IDLE]: '#34d399',
  [CallStatus.CONNECTING]: '#fbbf24',
  [CallStatus.ACTIVE]: '#38bdf8',
  [CallStatus.ANALYZING]: '#a78bfa',
  [CallStatus.COMPLETED]: '#34d399',
  [CallStatus.ERROR]: '#fb7185',
}

// Coordenadas de la ranura de la boca dentro del viewBox (300 x 310).
const MOUTH = { x: 94, y: 164, w: 112, h: 36 }
// El canvas de la onda sobresale un poco de la ranura para que los picos brillen fuera de ella.
const WAVE_BLEED = 8
const VB = { w: 300, h: 310 }

export default function RobotAvatar({ status = CallStatus.IDLE, speaking = false, volume = 0, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const id = (name) => `${name}-${uid}`
  const light = STATUS_LIGHT[status]
  const tiltRef = usePointerTilt(16)
  const busy = status === CallStatus.CONNECTING || status === CallStatus.ANALYZING

  return (
    <div className={`relative select-none ${className}`} style={{ perspective: '1100px' }}>
      <div className="animate-float">
        <div ref={tiltRef} className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {/* Halo luminoso detrás del robot */}
          <div
            className="absolute inset-[6%] rounded-full bg-[conic-gradient(from_180deg,#7c3aed,#2563eb,#10b981,#e0e7ff,#7c3aed)] opacity-60 blur-3xl"
            style={{ transform: 'translateZ(-80px)' }}
          />

          {/* Plataforma holográfica orbitando la base */}
          <div
            className="pointer-events-none absolute left-1/2 top-[84%] h-[46%] w-[86%] -translate-x-1/2 -translate-y-1/2"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className={`robot-orbit absolute inset-0 rounded-full border border-white/25 shadow-[0_0_30px_rgba(125,211,252,0.35)] ${
                busy ? 'robot-orbit-fast' : ''
              }`}
            >
              <span
                className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full"
                style={{ background: light, boxShadow: `0 0 14px 4px ${light}` }}
              />
            </div>
          </div>

          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="relative block h-auto w-full overflow-visible" role="img" aria-label="Robot asistente">
            <defs>
              <radialGradient id={id('shell')} cx="34%" cy="22%" r="90%">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.45" stopColor="#f1f0ff" />
                <stop offset="0.78" stopColor="#cdd2ff" />
                <stop offset="1" stopColor="#9aa6f0" />
              </radialGradient>
              <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#a78bfa" />
                <stop offset="0.5" stopColor="#60a5fa" />
                <stop offset="1" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id={id('visor')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1f1660" />
                <stop offset="1" stopColor="#070b26" />
              </linearGradient>
              <linearGradient id={id('metal')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id={id('eye')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#a7f3d0" />
                <stop offset="0.5" stopColor="#34d399" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
              <filter id={id('glow')} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* Antena */}
            <line x1="150" y1="60" x2="150" y2="28" stroke={`url(#${id('metal')})`} strokeWidth="5" strokeLinecap="round" />
            <circle cx="150" cy="21" r="10" fill={light} filter={`url(#${id('glow')})`} className="antenna-pulse" />
            <circle cx="147" cy="18" r="3" fill="#fff" opacity="0.85" />

            {/* Orejas */}
            {[26, 246].map((x) => (
              <g key={x}>
                <rect x={x} y="116" width="28" height="70" rx="14" fill={`url(#${id('metal')})`} />
                <rect x={x + 7} y="126" width="6" height="30" rx="3" fill="#fff" opacity="0.35" />
              </g>
            ))}

            {/* Cuerpo y cuello */}
            <rect x="84" y="248" width="132" height="60" rx="30" fill={`url(#${id('shell')})`} />
            <rect x="84" y="248" width="132" height="60" rx="30" fill="none" stroke="#fff" strokeOpacity="0.8" />
            <circle cx="150" cy="278" r="7" fill={light} filter={`url(#${id('glow')})`} />
            <rect x="128" y="232" width="44" height="22" rx="9" fill={`url(#${id('metal')})`} />

            {/* Cabeza */}
            <rect x="46" y="56" width="208" height="186" rx="66" fill={`url(#${id('shell')})`} />
            <rect x="46" y="56" width="208" height="186" rx="66" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.5" />
            <ellipse cx="108" cy="80" rx="44" ry="12" fill="#fff" opacity="0.75" transform="rotate(-10 108 80)" filter={`url(#${id('soft')})`} />

            {/* Visor */}
            <rect x="68" y="90" width="164" height="124" rx="46" fill={`url(#${id('visor')})`} />
            <rect x="68" y="90" width="164" height="124" rx="46" fill="none" stroke={`url(#${id('rim')})`} strokeWidth="3" />
            <path d="M92 110 Q 122 97 172 99" stroke="#fff" strokeOpacity="0.14" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Ojos */}
            <g filter={`url(#${id('glow')})`}>
              <rect x="106" y="118" width="28" height="38" rx="14" fill={`url(#${id('eye')})`} />
              <rect x="166" y="118" width="28" height="38" rx="14" fill={`url(#${id('eye')})`} />
            </g>
            <circle cx="115" cy="128" r="4" fill="#fff" opacity="0.9" />
            <circle cx="175" cy="128" r="4" fill="#fff" opacity="0.9" />

            {/* Ranura de la boca (la onda se dibuja encima en un canvas) */}
            <rect
              x={MOUTH.x}
              y={MOUTH.y}
              width={MOUTH.w}
              height={MOUTH.h}
              rx={MOUTH.h / 2}
              fill="#ffffff"
              fillOpacity="0.04"
              stroke="#a78bfa"
              strokeOpacity="0.35"
            />
          </svg>

          <VoiceVisualizer
            speaking={speaking}
            volume={volume}
            className="absolute"
            style={{
              left: `${((MOUTH.x + 4) / VB.w) * 100}%`,
              top: `${((MOUTH.y - WAVE_BLEED) / VB.h) * 100}%`,
              width: `${((MOUTH.w - 8) / VB.w) * 100}%`,
              height: `${((MOUTH.h + WAVE_BLEED * 2) / VB.h) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Sombra en el piso */}
      <div className="animate-shadow absolute -bottom-6 left-1/2 h-6 w-[62%] rounded-[50%] bg-black/50 blur-xl" />
    </div>
  )
}
