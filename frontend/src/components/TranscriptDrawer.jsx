import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, MessageSquareText, User } from 'lucide-react'

function Bubble({ role, text, pending }) {
  const isUser = role === 'user'
  return (
    <div className={`animate-rise flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ring-white/20 ${
          isUser ? 'bg-gradient-to-br from-emerald-400 to-sky-500' : 'bg-gradient-to-br from-violet-500 to-blue-500'
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg ${
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-emerald-500/90 to-sky-600/90 text-white shadow-emerald-900/30'
            : 'rounded-bl-md bg-white/10 text-white/90 ring-1 ring-white/15'
        } ${pending ? 'italic opacity-60' : ''}`}
      >
        {text}
      </div>
    </div>
  )
}

export default function TranscriptDrawer({ transcript, partial, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (open && el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [open, transcript, partial])

  return (
    <div className="glass w-full overflow-hidden rounded-3xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-white/90 transition-colors hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-sky-300" />
          Transcripción
          {transcript.length > 0 && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{transcript.length}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-white/60 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-500 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto border-t border-white/10 px-5 py-4">
            {transcript.length === 0 && !partial && (
              <p className="py-4 text-center text-sm text-white/50">Aún no hay mensajes.</p>
            )}
            {transcript.map((u, i) => (
              <Bubble key={i} role={u.role} text={u.text} />
            ))}
            {partial && <Bubble role={partial.role} text={partial.text} pending />}
          </div>
        </div>
      </div>
    </div>
  )
}
