import { useEffect, useRef } from 'react'

// Capas de la onda: frecuencia, velocidad/dirección, amplitud relativa, grosor y opacidad.
const WAVES = [
  { freq: 1.5, speed: 1.0, amp: 1.0, width: 3.2, alpha: 1 },
  { freq: 2.3, speed: -1.5, amp: 0.75, width: 2.2, alpha: 0.75 },
  { freq: 3.4, speed: 2.2, amp: 0.5, width: 1.5, alpha: 0.55 },
]

// Boca del robot: una onda de sonido con ruido que solo se mueve mientras el asistente habla.
// En silencio queda como una línea plana luminosa.
export default function VoiceVisualizer({ speaking, volume, className = '', style }) {
  const canvasRef = useRef(null)
  const input = useRef({ speaking, volume })

  useEffect(() => {
    input.current = { speaking, volume }
  }, [speaking, volume])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let amp = 0
    let phase = 0
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const draw = () => {
      const { speaking, volume } = input.current
      const goal = speaking ? Math.min(1, 0.55 + volume * 1.6) : 0
      // Sube rápido y baja suave, como una boca que se cierra.
      amp += (goal - amp) * (goal > amp ? 0.25 : 0.08)
      if (speaking) phase += 0.16

      ctx.clearRect(0, 0, w, h)
      const mid = h / 2
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#9fdcff')
      grad.addColorStop(0.5, '#3cbbf4')
      grad.addColorStop(1, '#b5e34d')

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = 'rgba(60, 187, 244, 0.9)'
      ctx.shadowBlur = 10 + amp * 14
      ctx.strokeStyle = grad

      for (const wave of WAVES) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const n = w ? x / w : 0
          const envelope = Math.sin(Math.PI * n) ** 2
          const noise = Math.sin(n * 37 + phase * 3.1) * 0.25 + Math.sin(n * 71 - phase * 4.7) * 0.15
          const y =
            mid +
            (Math.sin(n * Math.PI * 2 * wave.freq + phase * wave.speed) + noise) * envelope * amp * wave.amp * h * 0.36
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.globalAlpha = wave.alpha
        ctx.lineWidth = wave.width
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={style} aria-hidden />
}
