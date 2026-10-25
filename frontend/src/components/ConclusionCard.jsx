import { Lightbulb, ListChecks, Square, Volume2 } from 'lucide-react'

function List({ icon: Icon, title, items, color }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
        <Icon className={`h-4 w-4 ${color}`} />
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-white/90">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${color}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ConclusionCard({ conclusion, canReadAloud, browserSpeaking, onReadAloud }) {
  return (
    <section className="glass animate-rise w-full max-w-2xl space-y-6 rounded-3xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-white">Exposición de RED-i</h2>
        {canReadAloud && (
          <button
            onClick={onReadAloud}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15 transition-colors hover:bg-white/15"
            title="Respaldo si la voz del asistente no está disponible"
          >
            {browserSpeaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {browserSpeaking ? 'Detener lectura' : 'Leer en voz alta'}
          </button>
        )}
      </div>

      <List icon={ListChecks} title="Puntos clave" items={conclusion.puntos_clave} color="text-ra-sky" />
      <List icon={Lightbulb} title="Temas nuevos en la sesión" items={conclusion.temas_nuevos} color="text-ra-green" />

      <details className="group rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <summary className="cursor-pointer text-sm font-medium text-white/80">Texto completo que dice RED-i</summary>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/80">
          {conclusion.texto}
        </p>
      </details>
    </section>
  )
}
