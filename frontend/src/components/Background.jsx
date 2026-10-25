import { useEffect, useRef } from 'react'

// Fondo de "centro de control": red neuronal viva, haces de luz, hojas flotantes y piso holográfico.
// `mode` acelera y aviva la red: idle | listening | thinking | speaking.

const LEAVES = Array.from({ length: 9 }, (_, i) => ({
  left: `${(i * 37 + 6) % 96}%`,
  size: 16 + ((i * 7) % 18),
  duration: `${22 + ((i * 5) % 14)}s`,
  delay: `${-((i * 4.3) % 30)}s`,
}))

const MODES = {
  idle: { speed: 0.25, link: 0.35, pulse: 0.004 },
  listening: { speed: 0.45, link: 0.6, pulse: 0.02 },
  thinking: { speed: 1.1, link: 0.85, pulse: 0.06 },
  speaking: { speed: 0.6, link: 0.75, pulse: 0.035 },
}

function Leaf({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 3C9 3 4 9 4 15c0 2 .6 3.6 1.6 5L4 21.6 5.4 23l1.7-1.7C8.4 22.4 10 23 12 23c6 0 10-5 10-14V3h-2Zm-8 18c-1.4 0-2.6-.4-3.6-1.1C11 15 14 12 18 10c-4.6 1.2-8 4-10.3 8.2A6.9 6.9 0 0 1 6 15c0-5 4-9.6 14-10v4c0 7.4-3.2 12-8 12Z" />
    </svg>
  )
}

function NeuralNet({ mode }) {
  const canvasRef = useRef(null)
  const modeRef = useRef(mode)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let nodes = []
    let pulses = [] // impulsos que viajan por las conexiones
    let raf
    let current = { ...MODES.idle }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(90, (w * h) / 16000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 1 + Math.random() * 1.8,
        green: Math.random() < 0.35,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    const maxDist = 150

    const draw = () => {
      const goal = MODES[modeRef.current] || MODES.idle
      for (const k of Object.keys(current)) current[k] += (goal[k] - current[k]) * 0.03

      ctx.clearRect(0, 0, w, h)
      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx * current.speed
          n.y += n.vy * current.speed
        }
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
      }

      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d > maxDist) continue
          const alpha = (1 - d / maxDist) * current.link * 0.5
          ctx.strokeStyle = a.green && b.green ? `rgba(132,189,0,${alpha})` : `rgba(60,187,244,${alpha})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          if (!reduced && Math.random() < current.pulse * 0.02) pulses.push({ a, b, t: 0 })
        }
      }

      for (const n of nodes) {
        ctx.beginPath()
        ctx.fillStyle = n.green ? 'rgba(181,227,77,0.9)' : 'rgba(159,220,255,0.9)'
        ctx.shadowColor = n.green ? '#84bd00' : '#3cbbf4'
        ctx.shadowBlur = 8
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Impulsos de "pensamiento" recorriendo la red
      pulses = pulses.filter((p) => p.t <= 1)
      for (const p of pulses) {
        p.t += 0.025
        const x = p.a.x + (p.b.x - p.a.x) * p.t
        const y = p.a.y + (p.b.y - p.a.y) * p.t
        ctx.beginPath()
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#b5e34d'
        ctx.shadowBlur = 14
        ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />
}

export default function Background({ mode = 'idle' }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-command absolute inset-0" />

      <div className="ceiling-beam" style={{ left: '-4vw' }} />
      <div className="ceiling-beam" style={{ left: '33vw', animationDelay: '-2.5s' }} />
      <div className="ceiling-beam" style={{ right: '-4vw', animationDelay: '-5s' }} />

      <NeuralNet mode={mode} />

      <div className={`floor ${mode === 'thinking' ? 'floor-fast' : ''}`}>
        <div className="floor-grid" />
      </div>

      {LEAVES.map((l, i) => (
        <span key={i} className="leaf" style={{ left: l.left, animationDuration: l.duration, animationDelay: l.delay }}>
          <Leaf size={l.size} />
        </span>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,8,30,0.7))]" />
    </div>
  )
}
