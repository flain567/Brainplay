import { useEffect, useLayoutEffect, useRef } from 'react'
import { LEVEL_TITLES, getBorderForLevel, getTitleColorForLevel } from '../context/ProgressContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSettings } from '../context/SettingsContext.jsx'
import gsap from 'gsap'

export default function LevelUpModal({ data, onClose }) {
  const { play }       = useSound()
  const { earnCoins }  = useCoins()
  const { reduceMotion } = useSettings()
  const tc             = useThemeColors()

  const { newLevel } = data
  const title      = LEVEL_TITLES[Math.min(newLevel, LEVEL_TITLES.length - 1)]
  const borderData = getBorderForLevel(newLevel)
  const titleStyle = getTitleColorForLevel(newLevel)
  const coinReward = newLevel * 10
  const dark       = tc.dark

  // ── Refs for each animated element ─────────────────────────────────────
  const overlayRef   = useRef(null)
  const cardRef      = useRef(null)
  const avatarRef    = useRef(null)
  const topTextRef   = useRef(null)
  const titleRef     = useRef(null)
  const badgeRef     = useRef(null)
  const rewardsRef   = useRef(null)
  const btnRef       = useRef(null)
  const tlRef        = useRef(null)

  useEffect(() => { play('levelUp') }, [play])

  // ── GSAP Timeline — runs before first paint ───────────────────────────
  useLayoutEffect(() => {
    if (reduceMotion) return

    const ctx = gsap.context(() => {
      // Set all elements invisible before timeline starts
      gsap.set(overlayRef.current,  { opacity: 0 })
      gsap.set(cardRef.current,     { scale: 0.4, opacity: 0, y: 30 })
      gsap.set(avatarRef.current,   { scale: 0, opacity: 0, rotation: -20 })
      gsap.set(topTextRef.current,  { opacity: 0, y: -20 })
      gsap.set(titleRef.current,    { opacity: 0, y: 20 })
      gsap.set(badgeRef.current,    { scale: 0, opacity: 0 })
      gsap.set(rewardsRef.current,  { opacity: 0, y: 16 })
      gsap.set(btnRef.current,      { opacity: 0, y: 12, scale: 0.9 })

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tlRef.current = tl

      tl
        // 1. Overlay fade in
        .to(overlayRef.current,  { opacity: 1, duration: 0.3 }, 0)
        // 2. Card springs in
        .to(cardRef.current,     { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.05)
        // 3. Avatar bounces in
        .to(avatarRef.current,   { scale: 1, opacity: 1, rotation: 0, duration: 0.55, ease: 'back.out(2)' }, 0.3)
        // 4. "LEVEL UP" text drops in
        .to(topTextRef.current,  { opacity: 1, y: 0, duration: 0.3 }, 0.52)
        // 5. Title slides up
        .to(titleRef.current,    { opacity: 1, y: 0, duration: 0.3 }, 0.6)
        // 6. Badge pops
        .to(badgeRef.current,    { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.5)' }, 0.68)
        // 7. Rewards slide up
        .to(rewardsRef.current,  { opacity: 1, y: 0, duration: 0.4 }, 0.76)
        // 8. Button bounces in last
        .to(btnRef.current,      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.9)
    })

    return () => {
      ctx.revert()
      if (tlRef.current) tlRef.current.kill()
    }
  }, [reduceMotion])

  const handleClaim = () => {
    play('click')
    // Quick outro before closing
    if (!reduceMotion && cardRef.current) {
      gsap.to(cardRef.current, {
        scale: 0.85, opacity: 0, y: 20, duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          earnCoins(coinReward, `Hadiah Level Up (Lv.${newLevel})`)
          onClose()
        }
      })
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3 })
    } else {
      earnCoins(coinReward, `Hadiah Level Up (Lv.${newLevel})`)
      onClose()
    }
  }

  return (
    <>
      <style>{`
        .lu-card::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at top, ${borderData.color}22 0%, transparent 60%);
        }
        .lu-avatar-wrap {
          width: 120px; height: 120px; margin: 0 auto 24px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 56px; position: relative;
          border: ${borderData.border};
          box-shadow: ${borderData.boxShadow};
          background-color: ${borderData.bgColor};
        }
        .lu-avatar-float {
          animation: ${reduceMotion ? 'none' : 'lu-float 3s ease-in-out 1.2s infinite'};
        }
        @keyframes lu-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>

      <div ref={overlayRef} style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div ref={cardRef} style={{
          width: '100%', maxWidth: 400,
          background: tc.surface,
          border: `2px solid ${borderData.color}44`,
          borderRadius: 32,
          padding: '40px 24px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 20px 40px rgba(0,0,0,0.3), ${borderData.boxShadow || `0 0 20px ${borderData.color}33`}`,
        }}>

          <div ref={topTextRef} style={{ fontSize: 24, marginBottom: 12 }}>🎉 LEVEL UP! 🎉</div>

          <div ref={avatarRef} className="lu-avatar-wrap lu-avatar-float">
            {newLevel < 5 ? '🌱' : newLevel < 10 ? '⚔️' : newLevel < 15 ? '👑' : '🌟'}
          </div>

          <h2 ref={titleRef} style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 36, marginBottom: 8,
            background: `linear-gradient(135deg, ${borderData.color}, ${tc.textMain})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>LEVEL {newLevel}</h2>

          <div ref={badgeRef} style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: 100,
            fontFamily: "'Fredoka One',cursive", fontSize: 16,
            background: titleStyle.bg, color: titleStyle.text,
            marginBottom: 24,
          }}>{title}</div>

          <div ref={rewardsRef} style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${borderData.color}33`,
            borderRadius: 20, padding: 16, marginBottom: 28,
          }}>
            <div style={{ fontSize: 13, color: tc.textMuted, marginBottom: 12, fontWeight: 700 }}>HADIAH TERBUKA:</div>
            {[
              { icon: '🖼️', label: 'Bingkai Avatar', value: borderData.name, color: borderData.color },
              { icon: '🪙', label: 'Koin Emas',      value: `+${coinReward}`, color: '#f1c40f' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i === 0 ? `1px dashed ${tc.borderCol}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tc.textMain, fontWeight: 700 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
                </div>
                <div style={{
                  fontSize: i === 1 ? 15 : 13,
                  color: item.color,
                  fontFamily: i === 1 ? "'Fredoka One',cursive" : 'inherit',
                  fontWeight: 800,
                }}>{item.value}</div>
              </div>
            ))}
          </div>

          <button ref={btnRef} onClick={handleClaim} style={{
            width: '100%', padding: 16, borderRadius: 18, border: 'none',
            background: borderData.color, color: '#fff',
            fontFamily: "'Fredoka One',cursive", fontSize: 18,
            cursor: 'pointer', boxShadow: `0 8px 20px ${borderData.color}44`,
            transition: 'transform 0.15s, filter 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Klaim Hadiah Luar Biasa!
          </button>
        </div>
      </div>
    </>
  )
}
