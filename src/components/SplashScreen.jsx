import { useEffect, useRef, useState } from 'react'

/**
 * SplashScreen — Anime.js SVG morphing logo
 * Shape morphs: circle → brain → gamepad → star, with spring bounce + glow rings
 */
export default function SplashScreen({ onDone }) {
  const [step, setStep] = useState(0)
  const svgRef = useRef(null)
  const animRef = useRef(null)

  // Polygon points (same count = 8 points each, for smooth morphing)
  const SHAPES = [
    '50,5 80,20 95,50 80,80 50,95 20,80 5,50 20,20',    // circle-ish
    '50,2 78,15 98,45 85,75 55,98 18,82 2,48 22,12',     // brain blob
    '40,10 60,10 80,35 80,65 60,90 40,90 20,65 20,35',    // gamepad rect
    '50,2 65,30 98,38 75,62 80,95 50,78 20,95 25,62',     // star
  ]
  const COLORS = ['#A29BFE', '#FF6B6B', '#4ECDC4', '#FDCB6E']

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 200)
    const t2 = setTimeout(() => setStep(2), 900)
    const t3 = setTimeout(() => setStep(3), 1800)
    const t4 = setTimeout(() => onDone(), 2300)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  // Anime.js morphing — lazy loaded
  useEffect(() => {
    if (step < 1 || !svgRef.current) return
    let cancelled = false

    ;(async () => {
      try {
        const { animate } = await import('animejs/animation')
        const { spring } = await import('animejs/easings')
        const { stagger } = await import('animejs/utils')
        if (cancelled) return

        const poly = svgRef.current.querySelector('#morph-poly')
        if (!poly) return

        // Morph through shapes sequentially
        let idx = 0
        const morphNext = () => {
          if (cancelled) return
          idx = (idx + 1) % SHAPES.length
          animRef.current = animate(poly, {
            points: SHAPES[idx],
            fill: COLORS[idx],
            duration: 500,
            ease: spring({ bounce: 0.35 }),
            onComplete: () => {
              if (!cancelled) setTimeout(morphNext, 250)
            },
          })
        }
        setTimeout(morphNext, 350)

        // Glow ring pulses
        const rings = svgRef.current.querySelectorAll('.glow-ring')
        if (rings.length) {
          animate(rings, {
            scale: [0.85, 1.25],
            opacity: [0.5, 0],
            duration: 1200,
            delay: stagger(250),
            loop: true,
            ease: 'out(3)',
          })
        }
      } catch {}
    })()

    return () => {
      cancelled = true
      if (animRef.current) try { animRef.current.pause() } catch {}
    }
  }, [step])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'linear-gradient(135deg,#0d0b1e,#1a0a2e)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.5s ease',
      opacity: step === 3 ? 0 : 1,
    }}>
      <style>{`
        @keyframes splashSlide{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes splashDot  { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes splashPop  { from{transform:scale(0.3) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
      `}</style>

      {/* SVG Morphing Logo */}
      <div style={{
        width: 120, height: 120, marginBottom: 20,
        opacity: step >= 1 ? 1 : 0,
        animation: step >= 1 ? 'splashPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
      }}>
        <svg ref={svgRef} viewBox="0 0 100 100" width="120" height="120">
          <circle className="glow-ring" cx="50" cy="50" r="44" fill="none" stroke="#A29BFE" strokeWidth="1" opacity="0.4" style={{ transformOrigin: '50px 50px' }} />
          <circle className="glow-ring" cx="50" cy="50" r="48" fill="none" stroke="#4ECDC4" strokeWidth="0.5" opacity="0.3" style={{ transformOrigin: '50px 50px' }} />
          <polygon
            id="morph-poly"
            points={SHAPES[0]}
            fill="#A29BFE"
            style={{ filter: 'drop-shadow(0 0 10px rgba(162,155,254,0.6))' }}
          />
          <text x="50" y="58" textAnchor="middle" fontSize="30" style={{ pointerEvents: 'none' }}>🎮</text>
        </svg>
      </div>

      {/* Name */}
      <div style={{
        fontFamily: "'Fredoka One', cursive", fontSize: 42,
        background: 'linear-gradient(135deg,#FF6B6B,#A29BFE,#4ECDC4)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        opacity: step >= 1 ? 1 : 0,
        animation: step >= 1 ? 'splashSlide 0.4s 0.2s ease both' : 'none',
        marginBottom: 8,
      }}>
        BrainPlay
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '1px',
        opacity: step >= 2 ? 1 : 0,
        animation: step >= 2 ? 'splashSlide 0.4s ease both' : 'none',
        marginBottom: 48,
      }}>
        Santai & Mengasah Otak
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: 8, opacity: step >= 2 ? 1 : 0 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: ['#FF6B6B', '#A29BFE', '#4ECDC4'][i],
            animation: `splashDot 1s ${i * 0.16}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Creator credit */}
      <div style={{
        position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center',
        opacity: step >= 2 ? 1 : 0,
        animation: step >= 2 ? 'splashSlide 0.4s 0.15s ease both' : 'none',
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.5px' }}>
          by Dwi Agus Hidayat
        </div>
      </div>
    </div>
  )
}
