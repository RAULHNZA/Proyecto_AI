import { useState } from 'react'
import { Send } from 'lucide-react'

// Respaldo para preguntas por texto (p. ej. si alguien la manda por chat o hay mucho ruido en la sala).
export default function QuestionBox({ onAsk }) {
  const [text, setText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAsk(text)
    setText('')
  }

  return (
    <form onSubmit={submit} className="glass animate-rise flex w-full max-w-2xl items-center gap-2 rounded-full p-1.5 pl-5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe una pregunta para RED-i…"
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label="Enviar pregunta"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ra-sky to-ra-blue text-white transition-transform hover:scale-105 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}
