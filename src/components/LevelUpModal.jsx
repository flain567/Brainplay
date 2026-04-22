import { useEffect, useLayoutEffect, useRef } from 'react'
import { LEVEL_TITLES, getBorderForLevel, getTitleRarity } from '../context/ProgressContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSettings } from '../context/SettingsContext.jsx'
import PremiumTitleBadge from './PremiumTitleBadge.jsx'
import gsap from 'gsap'

export default function LevelUpModal({ data, onClose }) {
  const { play }       = useSound()
  const { earnCoins }  = useCoins()
  const { reduceMotion } = useSettings()
  const tc             = useThemeColors()

  const { newLevel } = data
  const title      = LEVEL_TITLES[Math.min(newLevel, LEVEL_TITLES.length - 1)]
  const borderData = getBorderForLevel(newLevel)
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

  // ── Trophy sound + Confetti on mount ───────────────────────────────────
  useEffect(() => {
    play('trophy')
    triggerConfetti()
  }, [])

  function triggerConfetti() {
    const colors = ['#FDCB6E', '#FF6B6B', '#4ECDC4', '#A29BFE', '#fff', '#ff0a82', '#ffb400']
    const container = document.body

    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div')
      el.style.cssText = `
        position: fixed; top: 30%; left: ${50 + (Math.random() * 60 - 30)}%;
        width: ${5 + Math.random() * 12}px; height: ${5 + Math.random() * 12}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        z-index: 10001; pointer-events: none; opacity: 1;
      `
      container.appendChild(el)

      gsap.fromTo(el, {
        y: 0, x: 0, scale: 0, rotation: 0
      }, {
        y: 150 + Math.random() * 400,
        x: (Math.random() - 0.5) * 500,
        rotation: Math.random() * 1080,
        scale: 0.6 + Math.random() * 0.8,
        duration: 1.8 + Math.random() * 2.5,
        ease: 'power1.out',
        onComplete: () => el.remove()
      })

      gsap.to(el, {
        opacity: 0,
        duration: 0.6,
        delay: 1.5 + Math.random() * 0.8
      })
    }
  }

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
          width: 120px; height: 120px; margin: 0 auto 20px;
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
        @keyframes lu-shine {
          from { left: -100%; }
          to   { left: 200%; }
        }
        @keyframes lu-glow-pulse {
          0%, 100% { box-shadow: 0 0 30px ${borderData.color}44; }
          50%      { box-shadow: 0 0 60px ${borderData.color}88, 0 0 100px ${borderData.color}33; }
        }
      `}</style>

      <div ref={overlayRef} style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div ref={cardRef} style={{
          width: '100%', maxWidth: 420,
          background: tc.surface,
          border: `2.5px solid ${borderData.color}66`,
          borderRadius: 32,
          padding: '36px 24px 28px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 24px 60px rgba(0,0,0,0.4), ${borderData.boxShadow || `0 0 30px ${borderData.color}44`}`,
          animation: reduceMotion ? 'none' : 'lu-glow-pulse 3s ease-in-out 1s infinite',
        }}>

          {/* Shine sweep effect */}
          <div style={{
            position: 'absolute', top: 0, width: '50%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            transform: 'skewX(-25deg)',
            animation: 'lu-shine 2.5s 0.5s infinite ease-in-out',
            pointerEvents: 'none', left: '-100%',
          }} />

          {/* Top rainbow line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg, #FF6B6B, #FDCB6E, #4ECDC4, #A29BFE, #FF6B6B)',
            backgroundSize: '200% 100%',
            animation: reduceMotion ? 'none' : 'shimmer 3s linear infinite',
          }} />

          <div ref={topTextRef} style={{
            fontFamily: "'Fredoka One',cursive", fontSize: 14,
            color: '#FDCB6E', letterSpacing: 2, textTransform: 'uppercase',
            marginBottom: 16,
          }}>⚡ LEVEL UP! ⚡</div>

          <div ref={avatarRef} className="lu-avatar-wrap lu-avatar-float">
            {newLevel < 5 ? '🌱' : newLevel < 10 ? '⚔️' : newLevel < 15 ? '👑' : '🌟'}
          </div>

          <h2 ref={titleRef} style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 42, marginBottom: 12, lineHeight: 1,
            background: `linear-gradient(135deg, ${borderData.color}, #FDCB6E, ${tc.textMain})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>LEVEL {newLevel}</h2>

          {/* Premium Title Badge instead of plain text */}
          <div ref={badgeRef} style={{ marginBottom: 24 }}>
            <PremiumTitleBadge
              title={title}
              rarity={getTitleRarity(title)}
              size="large"
            />
          </div>

          <div ref={rewardsRef} style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1.5px solid ${borderData.color}33`,
            borderRadius: 20, padding: 18, marginBottom: 24,
          }}>
            <div style={{
              fontSize: 11, color: '#FDCB6E', marginBottom: 14, fontWeight: 800,
              letterSpacing: 1.5, textTransform: 'uppercase',
            }}>🎁 HADIAH TERBUKA</div>
            {[
              { icon: '🖼️', label: 'Bingkai Avatar', value: borderData.name, color: borderData.color },
              { icon: '🎖️', label: 'Gelar Baru', value: title, color: '#A29BFE' },
              { icon: '🪙', label: 'Koin Emas', value: `+${coinReward}`, color: '#f1c40f' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < 2 ? `1px dashed ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: tc.textMain, fontWeight: 700, fontSize: 14 }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span> {item.label}
                </div>
                <div style={{
                  fontSize: i === 2 ? 16 : 13,
                  color: item.color,
                  fontFamily: i === 2 ? "'Fredoka One',cursive" : 'inherit',
                  fontWeight: 800,
                }}>{item.value}</div>
              </div>
            ))}
          </div>

          <button ref={btnRef} onClick={handleClaim} style={{
            width: '100%', padding: 16, borderRadius: 18, border: 'none',
            background: `linear-gradient(135deg, ${borderData.color}, ${borderData.color}cc)`,
            color: '#fff',
            fontFamily: "'Fredoka One',cursive", fontSize: 18,
            cursor: 'pointer',
            boxShadow: `0 8px 24px ${borderData.color}55`,
            transition: 'transform 0.15s, filter 0.15s',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            ✨ Klaim Hadiah Luar Biasa!
          </button>
        </div>
      </div>
    </>
  )
}
