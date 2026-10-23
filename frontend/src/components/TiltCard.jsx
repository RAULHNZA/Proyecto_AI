import { useRef } from 'react'

// Tarjeta de cristal que se inclina en 3D siguiendo el cursor, con reflejo de luz.
export default function TiltCard({ children, className = '', delay = 0, max = 8 }) {
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(0.5 - py) * max}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * max}deg`)
    el.style.setProperty('--gx', `${px * 100}%`)
    el.style.setProperty('--gy', `${py * 100}%`)
  }
  const onLeave = () => {
    ref.current.style.setProperty('--rx', '0deg')
    ref.current.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="animate-rise" style={{ perspective: '1000px', animationDelay: `${delay}ms` }}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className={`glass tilt group relative h-full overflow-hidden rounded-3xl ${className}`}
      >
        <div className="glare pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  )
}
