import { useEffect, useRef } from 'react'

const PARTICLE_COUNT_DEFAULT = 35
const PARTICLE_COUNT_REDUCE = 10
const COLORS = ['#FF6B6B', '#A29BFE', '#4ECDC4', '#FFE66D', '#FD79A8', '#FDCB6E', '#00B894']
const SHAPES = ['circle', 'ring', 'diamond', 'star']

function randomBetween(a, b) { return a + Math.random() * (b - a) }

export default function ParticleBackground({ dark = false, reduceMotion = false }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    // Create particles
    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    const n = reduceMotion ? PARTICLE_COUNT_REDUCE : PARTICLE_COUNT_DEFAULT
    particlesRef.current = Array.from({ length: n }, () => ({
      x: randomBetween(0, W()),
      y: randomBetween(0, H()),
      vx: randomBetween(-0.3, 0.3) * (reduceMotion ? 0.35 : 1),
      vy: randomBetween(-0.15, -0.4) * (reduceMotion ? 0.35 : 1),
      size: randomBetween(4, 14),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotation: randomBetween(0, Math.PI * 2),
      rotSpeed: randomBetween(-0.01, 0.01) * (reduceMotion ? 0.4 : 1),
      opacity: randomBetween(0.08, 0.22),
      pulse: randomBetween(0, Math.PI * 2),
      pulseSpeed: randomBetween(0.01, 0.03) * (reduceMotion ? 0.35 : 1),
    }))

    const drawShape = (p) => {
      const pulse = Math.sin(p.pulse) * 0.3 + 1
      const s = p.size * pulse
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity

      if (p.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, s, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      } else if (p.shape === 'ring') {
        ctx.beginPath()
        ctx.arc(0, 0, s, 0, Math.PI * 2)
        ctx.strokeStyle = p.color
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (p.shape === 'diamond') {
        ctx.beginPath()
        ctx.moveTo(0, -s)
        ctx.lineTo(s * 0.6, 0)
        ctx.lineTo(0, s)
        ctx.lineTo(-s * 0.6, 0)
        ctx.closePath()
        ctx.fillStyle = p.color
        ctx.fill()
      } else if (p.shape === 'star') {
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const ang = (i * Math.PI * 2) / 5 - Math.PI / 2
          const r = i % 2 === 0 ? s : s * 0.4
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
        }
        ctx.closePath()
        ctx.fillStyle = p.color
        ctx.fill()
      }
      ctx.restore()
    }

    const animate = () => {
      const w = W()
      const h = H()
      ctx.clearRect(0, 0, w, h)

      particlesRef.current.forEach(p => {
        if (!reduceMotion) {
          const dx = p.x - mouseRef.current.x
          const dy = p.y - mouseRef.current.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120 && dist > 0.01) {
            const force = (120 - dist) / 120 * 0.8
            p.vx += (dx / dist) * force * 0.1
            p.vy += (dy / dist) * force * 0.1
          }
        }

        p.vx *= reduceMotion ? 0.99 : 0.995
        p.vy *= reduceMotion ? 0.99 : 0.995

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed
        p.pulse += p.pulseSpeed

        if (p.y < -20) { p.y = h + 20; p.x = randomBetween(0, w) }
        if (p.y > h + 20) { p.y = -20 }
        if (p.x < -20) p.x = w + 20
        if (p.x > w + 20) p.x = -20

        drawShape(p)
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    animate()

    const onResize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onTouch = (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect()
        mouseRef.current = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
    }
    const onLeave = () => { mouseRef.current = { x: -999, y: -999 } }

    window.addEventListener('resize', onResize)
    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [dark, reduceMotion])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 0,
        opacity: dark ? 0.6 : 0.8,
      }}
    />
  )
}
