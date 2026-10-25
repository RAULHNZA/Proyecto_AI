import { BarChart3, Bot, BrainCircuit, Ear, GraduationCap, Recycle, Route, ScanEye, Sparkles, Truck, Wrench } from 'lucide-react'

// Ícono según palabras clave del título del pilar o proyecto.
const ICONS = [
  [/capacidad|ejecutiv|capacitaci/i, GraduationCap],
  [/ruta|recolecci/i, Route],
  [/cipres/i, BarChart3],
  [/gesti[oó]n 360/i, Bot],
  [/domiciliari/i, Truck],
  [/plataforma/i, Sparkles],
  [/mantenim|predictiv/i, Wrench],
  [/flotill|unidad|cami/i, Truck],
  [/visi[oó]n|c[aá]mara|imagen/i, ScanEye],
  [/agente|cliente|chat|atenci/i, Bot],
  [/generativ|aut[oó]nom|productiv|copilot/i, Sparkles],
  [/residuo|recicl|valoriz|circular/i, Recycle],
  [/anal[ií]tic|indicador|dato|kpi/i, BarChart3],
]

const iconFor = (title) => ICONS.find(([re]) => re.test(title))?.[1] || BrainCircuit

function Corners() {
  return (
    <>
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />
    </>
  )
}

// Mini gráfica decorativa que "trabaja" dentro del panel.
function MiniBars({ seed, live }) {
  return (
    <div className="flex h-7 items-end gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${i % 3 === 0 ? 'bg-ra-green' : 'bg-ra-sky'} ${live ? 'bar-dance' : ''}`}
          style={{ height: `${30 + ((i * 37 + seed * 17) % 70)}%`, animationDelay: `${-((i * 0.17 + seed * 0.3) % 1.6)}s`, opacity: 0.85 }}
        />
      ))}
    </div>
  )
}

// Encabezado de cada columna lateral ("Pilares de la estrategia" / "Proyectos con IA").
export function ColumnTitle({ children, side }) {
  return (
    <div className={`${side === 'left' ? 'animate-in-left' : 'animate-in-right'} flex items-center gap-3`} style={{ animationDelay: '0.15s' }}>
      <span className="h-px min-w-6 flex-1 bg-gradient-to-r from-transparent to-ra-sky/60" />
      <p className="font-display shrink-0 text-xs font-extrabold uppercase tracking-[0.25em] text-ra-green">{children}</p>
      <span className="h-px min-w-6 flex-1 bg-gradient-to-l from-transparent to-ra-sky/60" />
    </div>
  )
}

// Panel holográfico de un pilar o proyecto. `kind`: "Pilar" | "Proyecto"; `number` empieza en 1.
export function InfoPanel({ kind, number, item, order, active, activeLabel = 'Hablando de esto', live, side }) {
  const Icon = iconFor(item.titulo)
  return (
    <div className={side === 'left' ? 'animate-in-left' : 'animate-in-right'} style={{ animationDelay: `${0.3 + order * 0.15}s` }}>
      <div className="animate-hover" style={{ animationDelay: `${-order * 1.3}s` }}>
        <article className={`holo flex min-h-[172px] flex-col justify-between p-4 pr-5 ${active ? 'holo-active' : ''}`} style={{ '--sweep-delay': `${-order * 1.7}s` }}>
          <Corners />
          <div className="relative flex items-start gap-3">
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 transition-colors duration-500 ${
                active ? 'bg-ra-green/25 text-[#d4f58a] ring-ra-green/70' : 'bg-ra-sky/15 text-ra-sky ring-ra-sky/40'
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-display text-[10px] font-bold uppercase tracking-[0.2em] ${active ? 'text-ra-green' : 'text-ra-sky/80'}`}>
                {active ? `● ${activeLabel}` : `${kind} ${String(number).padStart(2, '0')}`}
              </p>
              <h3 className="font-display mt-0.5 text-sm font-bold leading-snug text-white">{item.titulo}</h3>
              {item.detalle && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/60">{item.detalle}</p>}
            </div>
          </div>
          <div className="relative mt-3 flex items-end justify-between">
            <MiniBars seed={order + 1} live={live || active} />
            <span className="font-mono text-[10px] text-ra-sky/60">IA·2027</span>
          </div>
        </article>
      </div>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg font-extrabold leading-none text-white glow-text">{value}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-widest text-white/55">{label}</p>
    </div>
  )
}

// Barra compacta de "Escucha en vivo" bajo los botones.
export function TelemetryBar({ listening, seconds, segments, words, level }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0')
  return (
    <div className={`holo animate-rise mx-auto flex w-full max-w-xl items-center gap-4 rounded-2xl px-4 py-2.5 ${listening ? 'holo-active' : ''}`}>
      <p className="font-display relative flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ra-sky">
        <span className={`h-2 w-2 rounded-full ${listening ? 'bg-ra-green glow-pulse' : 'bg-white/30'}`} />
        <Ear className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Escucha en vivo</span>
      </p>
      <div className="relative flex h-6 min-w-0 flex-1 items-center gap-[3px]">
        {Array.from({ length: 24 }, (_, i) => {
          const h = listening ? Math.max(10, Math.min(100, level * 140 * (0.5 + Math.abs(Math.sin(i * 1.7))))) : 10
          return <span key={i} className="flex-1 rounded-full bg-gradient-to-t from-ra-blue via-ra-sky to-ra-green transition-all duration-100" style={{ height: `${h}%` }} />
        })}
      </div>
      <div className="relative flex shrink-0 gap-4">
        <Stat value={`${mm}:${ss}`} label="Tiempo" />
        <Stat value={segments} label="Fragm." />
        <Stat value={words} label="Palabras" />
      </div>
    </div>
  )
}
