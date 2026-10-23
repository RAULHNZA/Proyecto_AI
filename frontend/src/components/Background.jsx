// Fondo animado: aurora de degradados, piso 3D en perspectiva, anillos orbitales y partículas.
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  duration: `${14 + ((i * 7) % 12)}s`,
  delay: `${-((i * 3.7) % 20)}s`,
  size: 2 + (i % 3),
}))

export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-aurora absolute inset-0" />
      <div className="blob blob-purple" />
      <div className="blob blob-blue" />
      <div className="blob blob-green" />
      <div className="blob blob-white" />

      <div className="ring3d ring3d-a" />
      <div className="ring3d ring3d-b" />

      <div className="floor">
        <div className="floor-grid" />
      </div>

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{ left: p.left, width: p.size, height: p.size, animationDuration: p.duration, animationDelay: p.delay }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(4,2,20,0.65))]" />
    </div>
  )
}
