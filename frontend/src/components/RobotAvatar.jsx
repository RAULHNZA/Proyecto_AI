import { useId } from 'react'
import { usePointerTilt } from '../hooks/usePointerTilt'
import logo from '../assets/logo-red-ambiental-color.png'
import VoiceVisualizer from './VoiceVisualizer'

// Ranura de la boca dentro del visor (viewBox 400 x 470); la onda de voz se dibuja encima en un canvas.
const MOUTH = { x: 162, y: 176, w: 76, h: 26 }
const WAVE_BLEED = 8
const VB = { w: 400, h: 470 }
const BLUE = '#003DA5'
const GREEN = '#84BD00'
const SKY = '#3CBBF4'

// RED-i, asistente de IA de Red Ambiental.
// `mode`: idle | listening | thinking | speaking | error. `light`: color del núcleo según el estado.
export default function RobotAvatar({ light = GREEN, mode = 'idle', speaking = false, volume = 0, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const id = (name) => `${name}-${uid}`
  const url = (name) => `url(#${id(name)})`
  const tiltRef = usePointerTilt(12)
  const listening = mode === 'listening'
  const thinking = mode === 'thinking'
  const coreGlow = speaking ? 10 + volume * 40 : 8

  return (
    <div className={`relative select-none ${className}`} style={{ perspective: '1200px' }}>
      {/* Plataforma holográfica */}
      <div className="pointer-events-none absolute left-1/2 top-[99%] h-[30%] w-[115%] -translate-x-1/2 -translate-y-1/2" style={{ transformStyle: 'preserve-3d' }}>
        <div className={`robot-orbit absolute inset-0 rounded-full border-2 border-ra-sky/50 shadow-[0_0_40px_rgba(60,187,244,0.55)] ${thinking ? 'robot-orbit-fast' : ''}`}>
          <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full" style={{ background: light, boxShadow: `0 0 18px 6px ${light}` }} />
        </div>
        <div className="robot-orbit-reverse absolute inset-[14%] rounded-full border border-dashed border-ra-green/60" />
        <div className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle,rgba(60,187,244,0.55),transparent_70%)] blur-md" style={{ transform: 'rotateX(78deg)' }} />
      </div>

      <div className="animate-float">
        <div ref={tiltRef} className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {/* Halo detrás */}
          <div
            className="absolute inset-[8%] rounded-full opacity-70 blur-3xl"
            style={{ background: `conic-gradient(from 180deg, ${BLUE}, ${SKY}, ${GREEN}, ${SKY}, ${BLUE})`, transform: 'translateZ(-80px)' }}
          />

          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="relative block h-auto w-full overflow-visible"
            style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 82%, transparent)', maskImage: 'linear-gradient(to bottom, #000 82%, transparent)' }}
            role="img"
            aria-label="RED-i, asistente de inteligencia artificial de Red Ambiental"
          >
            <defs>
              <radialGradient id={id('shell')} cx="35%" cy="22%" r="95%">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.55" stopColor="#eef3fb" />
                <stop offset="1" stopColor="#b9c8de" />
              </radialGradient>
              <linearGradient id={id('blue')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1a5fd1" />
                <stop offset="1" stopColor={BLUE} />
              </linearGradient>
              <linearGradient id={id('green')} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#b5e34d" />
                <stop offset="1" stopColor="#5e8a00" />
              </linearGradient>
              <linearGradient id={id('visor')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0a2a66" />
                <stop offset="1" stopColor="#000f2e" />
              </linearGradient>
              <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={SKY} />
                <stop offset="1" stopColor={GREEN} />
              </linearGradient>
              <linearGradient id={id('eye')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.45" stopColor="#9fdcff" />
                <stop offset="1" stopColor={SKY} />
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
              <clipPath id={id('visorClip')}>
                <rect x="126" y="106" width="148" height="108" rx="42" />
              </clipPath>
            </defs>

            {/* ===== Torso ===== */}
            <path d="M120 272 C 150 260 250 260 280 272 L 330 302 C 346 312 352 332 352 352 L 352 470 L 48 470 L 48 352 C 48 332 54 312 70 302 Z" fill={url('shell')} />
            {/* Paneles azules laterales */}
            <path d="M84 372 L 126 308 L 150 320 L 142 470 L 84 470 Z" fill={url('blue')} />
            <path d="M316 372 L 274 308 L 250 320 L 258 470 L 316 470 Z" fill={url('blue')} />
            {/* Circuitos luminosos */}
            <g stroke={SKY} strokeWidth="2" fill="none" filter={url('glow')} className={`circuit ${mode !== 'idle' ? 'circuit-fast' : ''}`}>
              <path d="M98 460 L 104 400 L 128 352 L 138 330" />
              <path d="M302 460 L 296 400 L 272 352 L 262 330" />
            </g>
            {/* Hombreras verdes */}
            <path d="M50 356 C 48 318 72 290 120 274 L 136 302 C 102 314 84 334 80 364 Z" fill={url('green')} />
            <path d="M350 356 C 352 318 328 290 280 274 L 264 302 C 298 314 316 334 320 364 Z" fill={url('green')} />
            <path d="M64 336 C 74 312 92 298 116 288" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M336 336 C 326 312 308 298 284 288" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Peto con el logo */}
            <path d="M150 300 L 250 300 L 264 418 L 200 452 L 136 418 Z" fill="#ffffff" stroke="#c9d6ea" strokeWidth="2" />
            <image href={logo} x="148" y="312" width="104" height="58" preserveAspectRatio="xMidYMid meet" />
            {/* Placa con el nombre */}
            <rect x="148" y="380" width="104" height="34" rx="10" fill="#001a4d" stroke={SKY} strokeWidth="2" filter={url('glow')} />
            <text x="200" y="404" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" letterSpacing="2" fill="#9fdcff" filter={url('glow')} className="glow-pulse">
              RED-i
            </text>
            {/* Núcleo de estado */}
            <circle cx="200" cy="434" r="7" fill={light} style={{ filter: `drop-shadow(0 0 ${coreGlow}px ${light})`, transition: 'filter 80ms linear' }} />

            {/* ===== Cuello ===== */}
            <rect x="174" y="240" width="52" height="34" rx="10" fill="#0b2a5e" />
            <line x1="182" y1="250" x2="218" y2="250" stroke={SKY} strokeWidth="2" opacity="0.8" />
            <line x1="182" y1="260" x2="218" y2="260" stroke={GREEN} strokeWidth="2" opacity="0.8" />

            {/* ===== Antenas ===== */}
            {[
              [100, 128, 92, 90],
              [300, 128, 308, 90],
            ].map(([x1, y1, x2, y2]) => (
              <g key={x1}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9d6ea" strokeWidth="4" strokeLinecap="round" />
                <circle cx={x2} cy={y2} r="6" fill={light} filter={url('glow')} className="glow-pulse" />
              </g>
            ))}

            {/* ===== Cabeza ===== */}
            <path d="M200 36 C 264 36 300 80 300 140 L 300 182 C 300 224 262 250 200 250 C 138 250 100 224 100 182 L 100 140 C 100 80 136 36 200 36 Z" fill={url('shell')} />
            {/* Cresta azul */}
            <path d="M180 40 C 186 37 214 37 220 40 L 228 104 L 172 104 Z" fill={url('blue')} />
            <path d="M200 44 L 200 98" stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
            {/* Paneles verdes del casco */}
            <path d="M116 96 C 122 72 144 54 170 46 L 172 72 C 152 78 138 90 132 108 Z" fill={url('green')} />
            <path d="M284 96 C 278 72 256 54 230 46 L 228 72 C 248 78 262 90 268 108 Z" fill={url('green')} />
            {/* Mentonera azul */}
            <path d="M150 228 C 170 244 230 244 250 228 L 244 246 C 224 254 176 254 156 246 Z" fill={url('blue')} />
            <ellipse cx="160" cy="62" rx="34" ry="9" fill="#fff" opacity="0.8" transform="rotate(-18 160 62)" filter={url('soft')} />

            {/* ===== Visor ===== */}
            <rect x="126" y="106" width="148" height="108" rx="42" fill={url('visor')} />
            <g clipPath={url('visorClip')}>
              {thinking && <rect x="126" y="156" width="148" height="4" fill={SKY} opacity="0.9" filter={url('glow')} className="visor-scan" />}
              <path d="M140 118 Q 180 106 240 112" stroke="#fff" strokeOpacity="0.16" strokeWidth="8" strokeLinecap="round" fill="none" />
            </g>
            <rect x="126" y="106" width="148" height="108" rx="42" fill="none" stroke={url('rim')} strokeWidth="3.5" filter={url('glow')} />

            {/* Ojos */}
            <g filter={url('glow')}>
              <rect className="robot-eye" x="152" y="132" width="26" height="32" rx="13" fill={url('eye')} />
              <rect className="robot-eye" x="222" y="132" width="26" height="32" rx="13" fill={url('eye')} />
            </g>
            <circle cx="160" cy="141" r="3.5" fill="#fff" />
            <circle cx="230" cy="141" r="3.5" fill="#fff" />

            {/* Sonrisa en reposo; al hablar la reemplaza la onda de voz */}
            <path
              d="M174 186 Q 200 204 226 186"
              stroke={SKY}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              filter={url('glow')}
              style={{ opacity: speaking ? 0 : 1, transition: 'opacity 0.3s' }}
            />

            {/* ===== Audífonos ===== */}
            {[100, 300].map((cx) => (
              <g key={cx}>
                {listening &&
                  [0, 0.6, 1.2].map((d) => (
                    <circle key={d} cx={cx} cy="160" r="30" fill="none" stroke={GREEN} strokeWidth="2" className="ear-wave" style={{ animationDelay: `${d}s` }} />
                  ))}
                <circle cx={cx} cy="160" r="32" fill={url('blue')} stroke="#c9d6ea" strokeWidth="3" />
                <circle cx={cx} cy="160" r="21" fill="none" stroke={url('green')} strokeWidth="6" />
                <circle cx={cx} cy="160" r="8" fill={listening ? GREEN : SKY} filter={url('glow')} className={listening ? 'glow-pulse' : ''} />
              </g>
            ))}

            {/* Micrófono */}
            <path d="M108 186 C 112 214 132 226 160 222" stroke="#c9d6ea" strokeWidth="5" fill="none" strokeLinecap="round" />
            <rect x="156" y="214" width="20" height="14" rx="7" fill="#0b2a5e" stroke={GREEN} strokeWidth="2" />
            <circle cx="166" cy="221" r="3" fill={listening ? GREEN : SKY} filter={url('glow')} className={listening ? 'glow-pulse' : ''} />
          </svg>

          <VoiceVisualizer
            speaking={speaking}
            volume={volume}
            className="absolute"
            style={{
              left: `${(MOUTH.x / VB.w) * 100}%`,
              top: `${((MOUTH.y - WAVE_BLEED) / VB.h) * 100}%`,
              width: `${(MOUTH.w / VB.w) * 100}%`,
              height: `${((MOUTH.h + WAVE_BLEED * 2) / VB.h) * 100}%`,
              opacity: speaking ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
        </div>
      </div>

      <div className="animate-shadow absolute -bottom-10 left-1/2 h-6 w-[60%] rounded-[50%] bg-ra-abyss/80 blur-xl" />
    </div>
  )
}
