import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Mascot Component (Brainy)
 * @param {string} skin - Mascot skin ID (e.g. 'neon-blue', 'royal-gold')
 * @param {string} hat - Mascot hat ID (e.g. 'grad-cap', 'crown')
 * @param {number} size - Visual size in pixels
 * @param {boolean} interactive - Whether to enable hover/click reactions
 */
export default function Mascot({ skin = 'neon-blue', hat = null, size = 120, interactive = true }) {
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const eyeL = useRef(null)
  const eyeR = useRef(null)
  const hatRef = useRef(null)

  useEffect(() => {
    if (!bodyRef.current || !eyeL.current || !eyeR.current) return

    // ─── Idle Floating ───
    const float = gsap.to(bodyRef.current, {
      y: -6,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })

    // ─── Floating rotation for life ───
    const rotate = gsap.to(bodyRef.current, {
      rotation: 2,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    })

    // ─── Random Blinking ───
    let blinkTimer
    const blink = () => {
      if (!eyeL.current || !eyeR.current) return
      gsap.to([eyeL.current, eyeR.current], {
        scaleY: 0.1,
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        transformOrigin: 'center center',
        onComplete: () => {
          blinkTimer = setTimeout(blink, 2000 + Math.random() * 4000)
        }
      })
    }
    blink()

    return () => {
      float.kill()
      rotate.kill()
      clearTimeout(blinkTimer)
    }
  }, [])

  const skins = {
    'neon-blue':    { main: '#00d2ff', glow: '#00d2ffaa', sec: '#00a8cc', accent: '#fff' },
    'classic-pink': { main: '#ff7eb3', glow: '#ff7eb3aa', sec: '#de6097', accent: '#fff' },
    'stealth-black':{ main: '#2d3436', glow: '#636e72', sec: '#000000', accent: '#00d2ff' },
    'cyber-pink':   { main: '#FF6B9D', glow: '#FF6B9Daa', sec: '#D4437A', accent: '#fff' },
    'emerald-green':{ main: '#55EFC4', glow: '#00B894aa', sec: '#00B894', accent: '#fff' },
    'royal-gold':   { main: '#FFD700', glow: '#FFD700cc', sec: '#DAA520', accent: '#fff' },
    'hologram':     { main: '#a29bfe', glow: '#6c5ce788', sec: '#6c5ce7', accent: '#fff', opacity: 0.6 },
  }

  const s = skins[skin] || skins['neon-blue']

  const onMascotClick = () => {
    if (!interactive) return
    gsap.to(bodyRef.current, {
      scale: 1.15,
      rotation: 360,
      duration: 0.6,
      ease: 'back.out(1.5)',
      onComplete: () => gsap.set(bodyRef.current, { rotation: 0 })
    })
  }

  const onMascotEnter = () => {
    if (!interactive) return
    gsap.to(bodyRef.current, {
      scale: 1.08,
      duration: 0.3,
      ease: 'power2.out'
    })
  }

  const onMascotLeave = () => {
    if (!interactive) return
    gsap.to(bodyRef.current, {
      scale: 1,
      duration: 0.4,
      ease: 'elastic.out(1, 0.5)'
    })
  }

  return (
    <div 
      ref={rootRef}
      style={{ 
        width: size, height: size, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      onClick={onMascotClick}
      onMouseEnter={onMascotEnter}
      onMouseLeave={onMascotLeave}
    >
      <svg 
        viewBox="0 0 100 100" 
        style={{ 
          width: '100%', height: '100%', 
          filter: `drop-shadow(0 0 12px ${s.glow})`,
          overflow: 'visible'
        }}
      >
        <g ref={bodyRef}>
          {/* Main Sphere (Body) */}
          <circle cx="50" cy="55" r="32" fill={s.main} stroke={s.sec} strokeWidth="2" style={{ opacity: s.opacity || 1 }} />
          
          {/* Internal Glowing Core */}
          <circle cx="50" cy="55" r="28" fill={`url(#grad-${skin})`} style={{ opacity: 0.8 }} />

          {/* Brain patterns (Circuitry lines) */}
          <g style={{ opacity: 0.4 }} stroke={s.accent} fill="none" strokeWidth="1.5">
            <path d="M40 38 Q 50 32 60 38" />
            <path d="M35 45 Q 50 40 65 45" />
            <path d="M50 35 L 50 45" strokeWidth="1" />
          </g>

          {/* Visor Area */}
          <rect x="32" y="52" width="36" height="18" rx="9" fill="rgba(0,0,0,0.6)" />

          {/* Glowing Eyes */}
          <circle ref={eyeL} cx="42" cy="61" r="3.5" fill={s.accent} />
          <circle ref={eyeR} cx="58" cy="61" r="3.5" fill={s.accent} />

          {/* Thrusters (Feet equivalent) */}
          <g fill={s.main} style={{ opacity: s.opacity || 1 }}>
            <path d="M38 85 L 42 95 L 46 85" />
            <path d="M54 85 L 58 95 L 62 85" />
          </g>

          {/* Dynamic Accessory (Hats) */}
          <g ref={hatRef}>
            {hat === 'grad-cap' && (
              <g transform="translate(25, 22) scale(0.8)">
                <path d="M0 15 L 32 0 L 64 15 L 32 30 Z" fill="#2C3E50" stroke="#000" strokeWidth="0.5" />
                <rect x="15" y="15" width="34" height="10" fill="#2C3E50" />
                <rect x="60" y="15" width="2" height="15" fill="#F1C40F" />
              </g>
            )}
            {hat === 'gamer-headset' && (
              <g stroke={s.accent} strokeWidth="4" fill="none">
                <path d="M20 60 Q 50 20 80 60" />
                <rect x="16" y="58" width="12" height="20" rx="4" fill="#2d3436" stroke="none" />
                <rect x="72" y="58" width="12" height="20" rx="4" fill="#2d3436" stroke="none" />
              </g>
            )}
            {hat === 'wizard-hat' && (
               <g transform="translate(15, -10) scale(1.1)">
                  <path d="M10 45 Q 35 45 60 45 L 35 10 Z" fill="#6c5ce7" stroke="#4834d4" />
                  <path d="M30 25 L 40 25" stroke="#FDCB6E" strokeWidth="2" />
               </g>
            )}
            {hat === 'crown' && (
               <g transform="translate(25, 18) scale(1)">
                  <path d="M0 15 L 10 0 L 25 12 L 40 0 L 50 15 L 50 25 L 0 25 Z" fill="#FFD700" stroke="#DAA520" />
                  <circle cx="25" cy="18" r="3" fill="#FDCB6E" />
               </g>
            )}
            {hat === 'detective' && (
               <path d="M25 45 Q 50 35 75 45 L 75 52 Q 50 52 25 52 Z M 20 52 L 80 52 L 80 56 Q 50 56 20 56 Z" fill="#8d6e63" />
            )}
            {hat === 'chef-hat' && (
               <g transform="translate(32, 10)">
                  <circle cx="10" cy="15" r="12" fill="#fff" stroke="#ddd" />
                  <circle cx="25" cy="15" r="12" fill="#fff" stroke="#ddd" />
                  <rect x="5" y="25" width="26" height="15" fill="#fff" stroke="#ddd" />
               </g>
            )}
          </g>
        </g>

        {/* Gradient Definitions */}
        <defs>
          <radialGradient id={`grad-${skin}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={s.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={s.main} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
