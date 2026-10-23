import { useEffect, useRef } from 'react'

// Gira suavemente el elemento en 3D para que "mire" hacia el cursor.
export function usePointerTilt(max = 14) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let raf

    const clamp = (v) => Math.max(-1, Math.min(1, v))
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      targetX = clamp(((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 2) * max
      targetY = clamp(((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 2) * max
    }
    const onLeave = () => {
      targetX = 0
      targetY = 0
    }
    const loop = () => {
      x += (targetX - x) * 0.08
      y += (targetY - y) * 0.08
      el.style.transform = `rotateY(${x.toFixed(2)}deg) rotateX(${(-y).toFixed(2)}deg)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [max])

  return ref
}
