import { useEffect, useRef } from 'react'

const COLORS = ['#FF6B6B','#FFE66D','#4ECDC4','#A29BFE','#FD79A8','#FF9F43','#54A0FF','#5F27CD','#00D2D3','#FF6348']

function rand(a, b) { return a + Math.random() * (b - a) }

export default function Confetti({ active, onDone }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x:     rand(0, canvas.width),
      y:     rand(-canvas.height * 0.3, 0),
      w:     rand(8, 16),
      h:     rand(6, 12),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:    rand(-3, 3),
      vy:    rand(3, 8),
      rot:   rand(0, Math.PI * 2),
      vrot:  rand(-0.15, 0.15),
      opacity: 1,
      shape:  Math.random() > 0.5 ? 'rect' : 'circle',
    }))

    let done = false

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let allGone = true

      pieces.forEach(p => {
        p.x   += p.vx
        p.y   += p.vy
        p.vy  += 0.15   // gravity
        p.vx  *= 0.99   // air drag
        p.rot += p.vrot

        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.025
        }
        if (p.opacity > 0) allGone = false

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      })

      if (allGone && !done) {
        done = true
        onDone?.()
        return
      }
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
