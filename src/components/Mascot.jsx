import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

/**
 * Mascot Component v2 (Brainy) — Interactive SVG companion
 * 
 * @param {string}  skin        — Mascot skin ID
 * @param {string}  hat         — Mascot hat ID
 * @param {number}  size        — Visual size in pixels
 * @param {boolean} interactive — Enable hover/click reactions
 * @param {string}  expression  — 'happy'|'excited'|'shy'|'surprised'|'wink'|'sad'|'smug'|'think'|'sleep'
 * @param {boolean} trackEyes   — Enable cursor eye-tracking
 * @param {function} onTap      — Callback when mascot is tapped/clicked
 */
export default function Mascot({
  skin = 'neon-blue',
  hat = null,
  size = 120,
  interactive = true,
  expression = 'happy',
  trackEyes = true,
  onTap,
}) {
  const rootRef = useRef(null)
  const bodyRef = useRef(null)
  const eyeL = useRef(null)
  const eyeR = useRef(null)
  const mouthRef = useRef(null)
  const blushRef = useRef(null)
  const hatRef = useRef(null)
  const floatTween = useRef(null)
  const rotateTween = useRef(null)
  const blinkTimer = useRef(null)

  // ─── Skin palette ───
  const skins = {
    'neon-blue':     { main: '#00d2ff', glow: '#00d2ffaa', sec: '#00a8cc', accent: '#fff' },
    'classic-pink':  { main: '#ff7eb3', glow: '#ff7eb3aa', sec: '#de6097', accent: '#fff' },
    'stealth-black': { main: '#2d3436', glow: '#636e72',   sec: '#000000', accent: '#00d2ff' },
    'cyber-pink':    { main: '#FF6B9D', glow: '#FF6B9Daa', sec: '#D4437A', accent: '#fff' },
    'emerald-green': { main: '#55EFC4', glow: '#00B894aa', sec: '#00B894', accent: '#fff' },
    'royal-gold':    { main: '#FFD700', glow: '#FFD700cc', sec: '#DAA520', accent: '#fff' },
    'hologram':      { main: '#a29bfe', glow: '#6c5ce788', sec: '#6c5ce7', accent: '#fff', opacity: 0.6 },
  }
  const s = skins[skin] || skins['neon-blue']

  // ─── Mouth paths per expression ───
  const MOUTHS = {
    happy:     'M40 70 Q50 78 60 70',
    excited:   'M38 69 Q50 82 62 69',
    shy:       'M44 71 Q50 75 56 71',
    surprised: 'M45 72 Q50 77 55 72',
    wink:      'M40 70 Q50 78 60 70',
    sad:       'M42 74 Q50 68 58 74',
    smug:      'M40 71 Q48 76 60 69',
    think:     'M44 72 L56 72',
    sleep:     'M42 72 Q50 76 58 72',
  }

  // ─── Eye shapes per expression ───
  const EYE_SHAPES = {
    happy:     { lRx: 3.5, lRy: 3.5, rRx: 3.5, rRy: 3.5 },
    excited:   { lRx: 4,   lRy: 4.5, rRx: 4,   rRy: 4.5 },
    shy:       { lRx: 3,   lRy: 3,   rRx: 3,   rRy: 3   },
    surprised: { lRx: 4.5, lRy: 5,   rRx: 4.5, rRy: 5   },
    wink:      { lRx: 3.5, lRy: 3.5, rRx: 3.5, rRy: 0.8 },
    sad:       { lRx: 3,   lRy: 2.8, rRx: 3,   rRy: 2.8 },
    smug:      { lRx: 3,   lRy: 2.5, rRx: 3.5, rRy: 3.5 },
    think:     { lRx: 3.5, lRy: 3.5, rRx: 2,   rRy: 3.5 },
    sleep:     { lRx: 4,   lRy: 0.6, rRx: 4,   rRy: 0.6 },
  }

  // ─── Idle float + blink ───
  useEffect(() => {
    if (!bodyRef.current) return

    floatTween.current = gsap.to(bodyRef.current, {
      y: -6, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut',
    })
    rotateTween.current = gsap.to(bodyRef.current, {
      rotation: 2, duration: 3, repeat: -1, yoyo: true, ease: 'power1.inOut',
    })

    const blink = () => {
      if (!eyeL.current || !eyeR.current) return
      if (expression === 'sleep') {
        blinkTimer.current = setTimeout(blink, 3000 + Math.random() * 3000)
        return
      }
      gsap.to([eyeL.current, eyeR.current], {
        scaleY: 0.1, duration: 0.1, yoyo: true, repeat: 1,
        transformOrigin: 'center center',
        onComplete: () => {
          blinkTimer.current = setTimeout(blink, 2000 + Math.random() * 4000)
        },
      })
    }
    blinkTimer.current = setTimeout(blink, 1500)

    return () => {
      floatTween.current?.kill()
      rotateTween.current?.kill()
      clearTimeout(blinkTimer.current)
    }
  }, [expression])

  // ─── Eye tracking ───
  useEffect(() => {
    if (!trackEyes || expression === 'sleep') return
    const onMove = (e) => {
      if (!rootRef.current || !eyeL.current || !eyeR.current) return
      const rect = rootRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / window.innerWidth * 3.5
      const dy = (e.clientY - cy) / window.innerHeight * 2.5
      const clampX = Math.max(-2.5, Math.min(2.5, dx))
      const clampY = Math.max(-2, Math.min(2, dy))
      gsap.to(eyeL.current, { attr: { cx: 42 + clampX, cy: 61 + clampY }, duration: 0.2, ease: 'power2.out', overwrite: true })
      gsap.to(eyeR.current, { attr: { cx: 58 + clampX, cy: 61 + clampY }, duration: 0.2, ease: 'power2.out', overwrite: true })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [trackEyes, expression])

  // ─── Animate expression transition ───
  useEffect(() => {
    if (!mouthRef.current) return
    const mouth = MOUTHS[expression] || MOUTHS.happy
    const eye = EYE_SHAPES[expression] || EYE_SHAPES.happy
    const showBlush = expression === 'shy' || expression === 'excited'

    gsap.to(mouthRef.current, { attr: { d: mouth }, duration: 0.3, ease: 'power2.out' })
    if (eyeL.current) gsap.to(eyeL.current, { attr: { rx: eye.lRx, ry: eye.lRy }, duration: 0.25, ease: 'power2.out' })
    if (eyeR.current) gsap.to(eyeR.current, { attr: { rx: eye.rRx, ry: eye.rRy }, duration: 0.25, ease: 'power2.out' })
    if (blushRef.current) gsap.to(blushRef.current, { opacity: showBlush ? 0.35 : 0, duration: 0.3 })
  }, [expression])

  // ─── Hover / Click ───
  const onMascotClick = () => {
    if (!interactive || !bodyRef.current) return
    gsap.to(bodyRef.current, {
      scale: 1.15, rotation: 360, duration: 0.6, ease: 'back.out(1.5)',
      onComplete: () => gsap.set(bodyRef.current, { rotation: 0 }),
    })
    onTap?.()
  }
  const onEnter = () => {
    if (!interactive || !bodyRef.current) return
    gsap.to(bodyRef.current, { scale: 1.08, duration: 0.3, ease: 'power2.out' })
  }
  const onLeave = () => {
    if (!interactive || !bodyRef.current) return
    gsap.to(bodyRef.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' })
  }

  const sleepBubbles = expression === 'sleep'

  return (
    <div
      ref={rootRef}
      style={{
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none', position: 'relative',
      }}
      onClick={onMascotClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      data-mascot-root
    >
      <svg
        viewBox="0 0 100 100"
        style={{
          width: '100%', height: '100%',
          filter: `drop-shadow(0 0 12px ${s.glow})`,
          overflow: 'visible',
        }}
      >
        <defs>
          <radialGradient id={`mg-${skin}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={s.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={s.main} stopOpacity="0" />
          </radialGradient>
        </defs>

        <g ref={bodyRef}>
          {/* Main body */}
          <circle cx="50" cy="55" r="32" fill={s.main} stroke={s.sec} strokeWidth="2" style={{ opacity: s.opacity || 1 }} />
          <circle cx="50" cy="55" r="28" fill={`url(#mg-${skin})`} style={{ opacity: 0.8 }} />

          {/* Brain circuit lines */}
          <g style={{ opacity: 0.4 }} stroke={s.accent} fill="none" strokeWidth="1.5" strokeLinecap="round">
            <path d="M40 38 Q50 32 60 38" />
            <path d="M35 45 Q50 40 65 45" />
            <path d="M50 35 L50 45" strokeWidth="1" />
          </g>

          {/* Visor / face area */}
          <rect x="32" y="52" width="36" height="18" rx="9" fill="rgba(0,0,0,0.6)" />

          {/* Eyes */}
          <ellipse ref={eyeL} cx="42" cy="61" rx="3.5" ry="3.5" fill={s.accent} />
          <ellipse ref={eyeR} cx="58" cy="61" rx="3.5" ry="3.5" fill={s.accent} />

          {/* Blush circles (hidden by default) */}
          <g ref={blushRef} opacity="0">
            <circle cx="33" cy="66" r="4" fill="#FF6B9D" opacity="0.5" />
            <circle cx="67" cy="66" r="4" fill="#FF6B9D" opacity="0.5" />
          </g>

          {/* Mouth */}
          <path
            ref={mouthRef}
            d={MOUTHS[expression] || MOUTHS.happy}
            fill="none"
            stroke={s.accent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Thrusters */}
          <g fill={s.main} style={{ opacity: s.opacity || 1 }}>
            <path d="M38 85 L42 95 L46 85" />
            <path d="M54 85 L58 95 L62 85" />
          </g>

          {/* Dynamic Hat */}
          <g ref={hatRef}>
            {hat === 'grad-cap' && (
              <g transform="translate(25,22) scale(0.8)">
                <path d="M0 15 L32 0 L64 15 L32 30 Z" fill="#2C3E50" stroke="#000" strokeWidth="0.5" />
                <rect x="15" y="15" width="34" height="10" fill="#2C3E50" />
                <rect x="60" y="15" width="2" height="15" fill="#F1C40F" />
              </g>
            )}
            {hat === 'gamer-headset' && (
              <g stroke={s.accent} strokeWidth="4" fill="none">
                <path d="M20 60 Q50 20 80 60" />
                <rect x="16" y="58" width="12" height="20" rx="4" fill="#2d3436" stroke="none" />
                <rect x="72" y="58" width="12" height="20" rx="4" fill="#2d3436" stroke="none" />
              </g>
            )}
            {hat === 'wizard-hat' && (
              <g transform="translate(15,-10) scale(1.1)">
                <path d="M10 45 Q35 45 60 45 L35 10 Z" fill="#6c5ce7" stroke="#4834d4" />
                <path d="M30 25 L40 25" stroke="#FDCB6E" strokeWidth="2" />
              </g>
            )}
            {hat === 'crown' && (
              <g transform="translate(25,18)">
                <path d="M0 15 L10 0 L25 12 L40 0 L50 15 L50 25 L0 25 Z" fill="#FFD700" stroke="#DAA520" />
                <circle cx="25" cy="18" r="3" fill="#FDCB6E" />
              </g>
            )}
            {hat === 'detective' && (
              <path d="M25 45 Q50 35 75 45 L75 52 Q50 52 25 52 Z M20 52 L80 52 L80 56 Q50 56 20 56 Z" fill="#8d6e63" />
            )}
            {hat === 'chef-hat' && (
              <g transform="translate(32,10)">
                <circle cx="10" cy="15" r="12" fill="#fff" stroke="#ddd" />
                <circle cx="25" cy="15" r="12" fill="#fff" stroke="#ddd" />
                <rect x="5" y="25" width="26" height="15" fill="#fff" stroke="#ddd" />
              </g>
            )}
          </g>

          {/* Sleep ZZZ */}
          {sleepBubbles && (
            <g>
              <text x="68" y="42" fill={s.accent} fontSize="8" fontWeight="700" opacity="0.5">
                <animate attributeName="opacity" values="0;0.7;0" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="y" values="42;35" dur="2.5s" repeatCount="indefinite" />
                z
              </text>
              <text x="74" y="36" fill={s.accent} fontSize="10" fontWeight="700" opacity="0.5">
                <animate attributeName="opacity" values="0;0.6;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="y" values="36;28" dur="3s" begin="0.5s" repeatCount="indefinite" />
                Z
              </text>
              <text x="78" y="28" fill={s.accent} fontSize="13" fontWeight="700" opacity="0.5">
                <animate attributeName="opacity" values="0;0.5;0" dur="3.5s" begin="1s" repeatCount="indefinite" />
                <animate attributeName="y" values="28;18" dur="3.5s" begin="1s" repeatCount="indefinite" />
                Z
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
