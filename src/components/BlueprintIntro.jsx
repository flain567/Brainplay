import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * BlueprintIntro Component
 * Renders a one-time-per-session technical blueprint animation.
 * After the animation, it reveals the app content.
 */
export default function BlueprintIntro({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true)
  const containerRef = useRef(null)
  const lineRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    // Check if already played in this session
    const hasPlayed = sessionStorage.getItem('bp_intro_played')
    if (hasPlayed) {
      setIsVisible(false)
      if (onComplete) onComplete()
      return
    }

    // Animation timeline
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 1.2,
          ease: 'power3.inOut',
          onComplete: () => {
             setIsVisible(false)
             sessionStorage.setItem('bp_intro_played', 'true')
             if (onComplete) onComplete()
          }
        })
      }
    })

    // Step 1: Draw Blueprint Grid
    tl.fromTo('.bp-grid-line', 
      { scaleX: 0, scaleY: 0, opacity: 0 },
      { scaleX: 1, scaleY: 1, opacity: 1, duration: 1.5, stagger: 0.1, ease: 'expo.out' }
    )

    // Step 2: Animate technical text
    tl.fromTo(textRef.current, 
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      '-=0.5'
    )

    // Step 3: Draw a central focus element (circle)
    tl.fromTo('.bp-circle', 
      { strokeDasharray: '0 400', opacity: 0 },
      { strokeDasharray: '400 0', opacity: 0.5, duration: 2, ease: 'power3.inOut' },
      '-=1'
    )

    // Safety timeout: ensure intro finishes even if GSAP fails
    const safetyTimeout = setTimeout(() => {
      if (isVisible) {
        console.warn('[BlueprintIntro] Safety timeout triggered')
        setIsVisible(false)
        sessionStorage.setItem('bp_intro_played', 'true')
        if (onComplete) onComplete()
      }
    }, 5500)

    return () => {
      tl.kill()
      clearTimeout(safetyTimeout)
    }
  }, [onComplete])

  if (!isVisible) return null

  return (
    <div 
      ref={containerRef}
      className={`blueprint-root ${!isVisible ? 'hidden' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: '#0D1022',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <div className="blueprint-grid" style={{ position: 'absolute', inset: 0 }} />
      
      <svg width="300" height="300" viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <circle 
          className="bp-circle" 
          cx="50" cy="50" r="40" 
          stroke="#7C6FE8" strokeWidth="0.2" fill="none"
        />
        <line className="bp-grid-line" x1="10" y1="50" x2="90" y2="50" stroke="rgba(124,111,232,0.3)" strokeWidth="0.1" />
        <line className="bp-grid-line" x1="50" y1="10" x2="50" y2="90" stroke="rgba(124,111,232,0.3)" strokeWidth="0.1" />
      </svg>

      <div 
        ref={textRef}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: '#7C6FE8', fontSize: '10px', letterSpacing: '4px',
          textTransform: 'uppercase', position: 'absolute', top: '25%',
          opacity: 0
        }}
      >
        Initialising Renaissance Logic...
      </div>
    </div>
  )
}
