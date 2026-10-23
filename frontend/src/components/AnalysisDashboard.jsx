import { useEffect, useState } from 'react'
import { Gauge, Layers, Lightbulb, MessageCircle, RotateCcw, Sparkles, Target, Zap } from 'lucide-react'
import TiltCard from './TiltCard'

function useCountUp(target, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now() + delay
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration))
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
  return value
}

function verdict(score) {
  if (score >= 8) return { label: 'Excelente', className: 'from-emerald-400/30 to-sky-400/20 text-emerald-200' }
  if (score >= 6) return { label: 'Buen desempeño', className: 'from-sky-400/30 to-violet-400/20 text-sky-200' }
  return { label: 'Con oportunidades', className: 'from-violet-400/30 to-fuchsia-400/20 text-violet-200' }
}

const METRIC_ICONS = [MessageCircle, Layers, Zap]

function ScoreRing({ score }) {
  const value = useCountUp(score, 1600, 200)
  const r = 54
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-44 w-44 shrink-0">
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/40 via-sky-500/30 to-emerald-400/40 blur-2xl" />
      <svg viewBox="0 0 128 128" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="0.5" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 10)}
          style={{ filter: 'drop-shadow(0 0 8px rgba(125,211,252,0.6))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-gradient text-6xl font-bold leading-none">{Math.round(value)}</span>
        <span className="mt-1 text-xs uppercase tracking-[0.2em] text-white/60">de 10</span>
      </div>
    </div>
  )
}

function MetricCard({ metric, index }) {
  const value = useCountUp(metric.score, 1200, 350 + index * 150)
  const Icon = METRIC_ICONS[index % METRIC_ICONS.length]
  return (
    <TiltCard delay={200 + index * 120} className="p-6">
      <div className="flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-sky-500 to-emerald-400 shadow-lg shadow-violet-600/30">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-4xl font-bold leading-none text-white">
            {value.toFixed(0)}
            <span className="text-base font-medium text-white/50">/10</span>
          </span>
        </div>
        <h3 className="font-display mb-3 text-base font-semibold text-white">{metric.category}</h3>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400 shadow-[0_0_12px_rgba(125,211,252,0.7)]"
            style={{ width: `${value * 10}%` }}
          />
        </div>
        <p className="text-sm leading-relaxed text-white/70">{metric.feedback}</p>
      </div>
    </TiltCard>
  )
}

function ListCard({ title, subtitle, icon: Icon, items, delay, numbered }) {
  return (
    <TiltCard delay={delay} max={5} className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/55">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-white/[0.04] p-3 text-sm leading-relaxed text-white/85 ring-1 ring-white/10">
            {numbered ? (
              <span className="font-display grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-xs font-bold text-white">
                {i + 1}
              </span>
            ) : (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-violet-400 to-sky-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </TiltCard>
  )
}

export default function AnalysisDashboard({ analysis, onReset }) {
  const v = verdict(analysis.overall_score)

  return (
    <div className="w-full space-y-6">
      <div className="animate-rise text-center">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white/80">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          Análisis completado
        </span>
        <h1 className="font-display text-gradient mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Tu reporte de sesión</h1>
      </div>

      <TiltCard delay={100} max={4} className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <ScoreRing score={analysis.overall_score} />
          <div className="text-center sm:text-left">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Gauge className="h-5 w-5 text-sky-300" />
              <h2 className="font-display text-xl font-semibold text-white">Resumen</h2>
              <span className={`rounded-full bg-gradient-to-r px-3 py-0.5 text-xs font-semibold ring-1 ring-white/15 ${v.className}`}>
                {v.label}
              </span>
            </div>
            <p className="leading-relaxed text-white/80">{analysis.summary}</p>
          </div>
        </div>
      </TiltCard>

      <div className="grid gap-5 md:grid-cols-3">
        {analysis.metrics.map((m, i) => (
          <MetricCard key={m.category} metric={m} index={i} />
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ListCard
          title="Observaciones clave"
          subtitle="Lo que más destacó"
          icon={Lightbulb}
          items={analysis.key_insights}
          delay={650}
        />
        <ListCard
          title="Recomendaciones"
          subtitle="Tus próximos pasos"
          icon={Target}
          items={analysis.actionable_recommendations}
          delay={750}
          numbered
        />
      </div>

      <div className="animate-rise flex justify-center pt-2" style={{ animationDelay: '850ms' }}>
        <button
          onClick={onReset}
          className="group relative overflow-hidden rounded-full bg-gradient-to-r from-violet-600 via-sky-500 to-emerald-500 px-7 py-3.5 font-display font-semibold text-white shadow-xl shadow-violet-700/40 ring-1 ring-white/30 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex items-center gap-2">
            <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
            Iniciar nueva sesión
          </span>
        </button>
      </div>
    </div>
  )
}
