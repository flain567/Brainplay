import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import Confetti from './Confetti.jsx'
import TutorialModal from './TutorialModal.jsx'
import { scrambleOnce } from '../hooks/useScrambleNumber.js'
import gsap from 'gsap'

// ─── Reusable timer hook ─────────────────────────────────────────────────────
export function useGameTimer(running, resetKey) {
  const [time, setTime] = useState(0)
  useEffect(() => { setTime(0) }, [resetKey])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTime(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  return time
}

export function formatTime(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── Difficulty label badge ──────────────────────────────────────────────────
const DIFF_STYLES = {
  easy:   { bg: '#E8F8F0', darkBg: '#1a3d30', color: '#00b894', label: '🟢 Mudah' },
  medium: { bg: '#FFFBF0', darkBg: '#3d3520', color: '#f9a825', label: '🟡 Sedang' },
  hard:   { bg: '#FFF0F0', darkBg: '#3d1f1f', color: '#FF6B6B', label: '🔴 Sulit' },
}

export function DiffBadge({ diffId, dark }) {
  const s = DIFF_STYLES[diffId] || DIFF_STYLES.easy
  return (
    <span style={{
      background: dark ? s.darkBg : s.bg,
      color: s.color,
      border: `2px solid ${s.color}44`,
      borderRadius: 100, padding: '6px 14px',
      fontFamily: "'Fredoka One',cursive", fontSize: 13,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ─── Game Header ─────────────────────────────────────────────────────────────
export function GameHeader({ emoji, title, subtitle, diffId, onBack, dark }) {
  const { play } = useSound()
  const tc = useThemeColors()
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const surface = tc.surface
  const borderCol = tc.borderCol

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <button onClick={() => { play('click'); onBack() }}
        style={{
          background: surface, border: `2px solid ${borderCol}`,
          borderRadius: 12, padding: '8px 14px', fontSize: 18,
          cursor: 'pointer', color: textMain,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#A29BFE'}
        onMouseLeave={e => e.currentTarget.style.borderColor = borderCol}
      >
        ←
      </button>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, color: textMain, lineHeight: 1 }}>
          {emoji} {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>{subtitle}</p>}
      </div>
      <DiffBadge diffId={diffId} dark={dark} />
    </div>
  )
}

// ─── Stats bar ───────────────────────────────────────────────────────────────
export function StatsBar({ stats, dark }) {
  const tc = useThemeColors()
  const surface = tc.surface
  const textMuted = tc.textMuted
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)},1fr)`,
      gap: 10, marginBottom: 24,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: surface,
          border: `2px solid ${s.color || '#A29BFE'}33`,
          borderRadius: 16, padding: '12px 10px', textAlign: 'center',
          transition: 'transform 0.15s',
        }}>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: s.color || '#A29BFE', lineHeight: 1 }}>
            {s.value}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Action Buttons row ──────────────────────────────────────────────────────
export function ActionButtons({ buttons, dark }) {
  const { play } = useSound()
  const tc = useThemeColors()
  const textMuted = tc.textMuted
  const surface = tc.surface
  const borderCol = tc.borderCol

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
      {buttons.map(btn => (
        <button
          key={btn.label}
          onClick={() => { if (!btn.disabled) { play('click'); btn.onClick() } }}
          disabled={btn.disabled}
          style={{
            background: btn.primary
              ? btn.color || '#FF6B6B'
              : btn.secondary
                ? (btn.activeBg || 'rgba(255,211,61,0.15)')
                : surface,
            color: btn.primary
              ? '#fff'
              : btn.secondary
                ? (btn.activeColor || '#FFD93D')
                : textMuted,
            border: btn.primary
              ? 'none'
              : `2px solid ${btn.disabled ? borderCol : (btn.borderColor || borderCol)}`,
            borderRadius: 100,
            padding: '12px 22px',
            fontSize: 14, fontWeight: 800,
            fontFamily: "'Fredoka One',cursive",
            cursor: btn.disabled ? 'default' : 'pointer',
            boxShadow: btn.primary ? `0 4px 14px ${btn.color || '#FF6B6B'}44` : 'none',
            opacity: btn.disabled ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}

// ─── Best Record bar ─────────────────────────────────────────────────────────
export function BestRecord({ label, value, dark, color = '#FF6B6B' }) {
  const tc = useThemeColors()
  const textMuted = tc.textMuted
  return (
    <div style={{
      marginTop: 20,
      background: tc.bg,
      border: `2px solid ${tc.borderCol}`,
      borderRadius: 16, padding: '12px 20px',
      textAlign: 'center', fontSize: 14, color: textMuted, fontWeight: 600,
    }}>
          🏆 {label}: <span style={{ color, fontFamily: "'Fredoka One',cursive", fontSize: 16 }}>{value}</span>
    </div>
  )
}

// ─── Counting Number Component ────────────────────────────────────────────────
export function CountingNumber({ value, duration = 1.5, delay = 0.5, color = '#FF6B6B' }) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const target = typeof value === 'number' ? value : parseInt(String(value).replace(/,/g, '')) || 0

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(countRef, {
        current: target,
        duration,
        delay,
        ease: 'power2.out',
        onUpdate: () => setCount(Math.floor(countRef.current))
      })
    })
    return () => ctx.revert()
  }, [target, duration, delay])

  return <span style={{ color }}>{count.toLocaleString()}</span>
}

// ─── Fireworks Component ─────────────────────────────────────────────────────
function FireworksOverlay() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight
    
    const particles = []
    const colors = ['#FF0000', '#FFBD00', '#00FF00', '#00F5FF', '#A29BFE', '#FD79A8']
    
    class Particle {
      constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color
        this.vx = (Math.random() - 0.5) * 12
        this.vy = (Math.random() - 0.5) * 12
        this.life = 1; this.decay = 0.012 + Math.random() * 0.01
        this.r = 2 + Math.random() * 3
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.vy += 0.1
        this.life -= this.decay
      }
      draw() {
        ctx.globalAlpha = this.life
        ctx.fillStyle = this.color
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill()
      }
    }
    
    let timer = 0
    function loop() {
      ctx.clearRect(0, 0, W, H)
      if (timer % 40 === 0) {
        const x = Math.random() * W, y = Math.random() * (H * 0.5)
        const col = colors[Math.floor(Math.random() * colors.length)]
        for (let i = 0; i < 40; i++) particles.push(new Particle(x, y, col))
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update()
        particles[i].draw()
        if (particles[i].life <= 0) particles.splice(i, 1)
      }
      timer++; requestAnimationFrame(loop)
    }
    const animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000 }} />
}

// ─── Win Modal ───────────────────────────────────────────────────────────────
export function WinModal({
  emoji = '🎉',
  title = 'Selamat!',
  subtitle = '',
  diffLabel = '',
  stats = [],
  stars = 0,
  coinReward = 0,
  onRestart,
  onBack,
  onHome,
  dark,
  gameColor = '#FF6B6B',
  backLabel = '🎯 Ganti Level',
  homeLabel = '🏠 Beranda',
  restartLabel = '🔄 Main Lagi',
  highlight = '',
  duelStats = null,
  onRematch = null,
}) {
  const { play } = useSound()
  const { reduceMotion } = useSettings()
  const tc = useThemeColors()
  const bg = tc.dark ? tc.surface : '#fff'
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const noAnim = reduceMotion

  const coinRef   = useRef(null)
  const statsRefs  = useRef([])
  // GSAP Timeline refs
  const overlayRef = useRef(null)
  const cardRef    = useRef(null)
  const emojiRef   = useRef(null)
  const titleRef   = useRef(null)
  const starsRef   = useRef([])
  const coinBadgeRef = useRef(null)
  const btnsRef    = useRef(null)
  const tlRef      = useRef(null)

  // ── GSAP Timeline entrance ─────────────────────────────────────────────
  useLayoutEffect(() => {
    if (noAnim) return
    const ctx = gsap.context(() => {
      gsap.set(overlayRef.current, { opacity: 0 })
      gsap.set(cardRef.current,    { scale: 0.65, opacity: 0, y: 24 })
      gsap.set(emojiRef.current,   { scale: 0, rotation: -30 })
      gsap.set(titleRef.current,   { opacity: 0, y: 14 })
      if (starsRef.current.length) gsap.set(starsRef.current, { scale: 0, opacity: 0 })
      if (coinBadgeRef.current)    gsap.set(coinBadgeRef.current, { opacity: 0, y: 10 })
      gsap.set(statsRefs.current.filter(Boolean), { opacity: 0, y: 10 })
      if (btnsRef.current)         gsap.set(btnsRef.current, { opacity: 0, y: 10 })

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tlRef.current = tl

      tl
        .to(overlayRef.current,   { opacity: 1, duration: 0.3 }, 0)
        .to(cardRef.current,      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }, 0.05)
        .to(emojiRef.current,     { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.5)' }, 0.3)
        .to(titleRef.current,     { opacity: 1, y: 0, duration: 0.3 }, 0.45)
        .to(starsRef.current.filter(Boolean), {
            scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)',
            stagger: 0.09,
          }, 0.55)
        .to(coinBadgeRef.current, { opacity: 1, y: 0, duration: 0.3 }, 0.65)
        .to(statsRefs.current.filter(Boolean), {
            opacity: 1, y: 0, duration: 0.3,
            stagger: 0.07,
          }, 0.7)
        .to(btnsRef.current,      { opacity: 1, y: 0, duration: 0.35 }, 0.82)
    })
    return () => { ctx.revert(); if (tlRef.current) tlRef.current.kill() }
  }, [noAnim])

  // Helper: play outro then call callback
  const withOutro = (cb) => {
    if (!noAnim && cardRef.current) {
      gsap.to(cardRef.current,    { scale: 0.85, opacity: 0, y: 16, duration: 0.22, ease: 'power2.in', onComplete: cb })
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.28 })
    } else cb()
  }

  // Scramble coinReward saat modal mount
  useEffect(() => {
    if (noAnim || !coinRef.current || coinReward <= 0) return
    coinRef.current.textContent = '+...'
    scrambleOnce(coinRef.current, `+${coinReward}`, {
      chars: '0123456789+',
      duration: 0.7,
      speed: 0.5,
      revealDelay: 0.25,
      delay: 0.35,
    })
  }, [])

  // Scramble tiap stat value — stagger per index
  useEffect(() => {
    if (noAnim) return
    statsRefs.current.forEach((el, i) => {
      if (!el) return
      const raw = String(stats[i]?.value ?? '')
      const hasNum = /\d/.test(raw)
      if (!hasNum) return
      el.textContent = '...'
      scrambleOnce(el, raw, {
        chars: '0123456789:.',
        duration: 0.6,
        speed: 0.45,
        revealDelay: 0.2,
        delay: 0.4 + i * 0.12,
      })
    })
  }, [])

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: 24,
    }}>
      <div ref={cardRef} style={{
        background: bg, borderRadius: 28,
        padding: '36px 32px', textAlign: 'center',
        maxWidth: 380, width: '100%',
        boxShadow: `0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px ${gameColor}22`,
        position: 'relative', overflow: 'hidden', zIndex: 1001,
      }}>
        {stars > 1 && <FireworksOverlay />}
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${gameColor}, #A29BFE, #4ECDC4)`,
        }} />

        <div ref={emojiRef} style={{ fontSize: 60, marginBottom: 8 }}>{emoji}</div>
        <div ref={titleRef}>
          <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 30, color: textMain, marginBottom: 4 }}>{title}</h2>
          {subtitle && <p style={{ color: textMuted, fontSize: 14, marginBottom: 6 }}>{subtitle}</p>}
        </div>

        {highlight && (
          <div style={{
            display: 'inline-block', marginBottom: 14,
            background: 'linear-gradient(135deg,#FFD700,#FFA500)', color: '#fff',
            borderRadius: 12, padding: '8px 16px', fontSize: 13, fontWeight: 800,
            fontFamily: "'Fredoka One',cursive",
          }}>
            {highlight}
          </div>
        )}

        {diffLabel && (
          <span style={{
            display: 'inline-block', background: `${gameColor}22`, color: gameColor,
            padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 14,
          }}>
            {diffLabel}
          </span>
        )}

        {/* Stars */}
        {stars > 0 && (
          <div style={{ fontSize: 34, marginBottom: 14, letterSpacing: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} ref={el => starsRef.current[i] = el} style={{
                display: 'inline-block',
                opacity: i < stars ? 1 : 0.25,
                filter: i < stars ? 'none' : 'grayscale(1)',
              }}>
                {i < stars ? '⭐' : '☆'}
              </span>
            ))}
          </div>
        )}

        {/* Coin reward */}
        {coinReward > 0 && (
          <div ref={coinBadgeRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: dark ? 'rgba(253,203,110,0.12)' : '#FFFDE7',
            border: '1.5px solid #FDCB6E44',
            borderRadius: 100, padding: '6px 18px', marginBottom: 16,
            animation: noAnim ? 'none' : 'winSlideUp 0.4s 0.3s ease both',
          }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span ref={coinRef} style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: '#F9A825' }}>+{coinReward}</span>
          </div>
        )}

        {/* Stats grid (Normal) */}
        {!duelStats && stats.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 3)},1fr)`,
            gap: 10, marginBottom: 24,
          }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{
                background: dark ? `${s.color || '#A29BFE'}12` : `${s.color || '#A29BFE'}10`,
                borderRadius: 14, padding: '12px 8px',
                animation: noAnim ? 'none' : `winSlideUp 0.4s ${0.35 + i * 0.12}s ease both`,
              }}>
                <div
                  ref={el => statsRefs.current[i] = el}
                  style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: s.color || '#A29BFE' }}
                >
                  {/\d/.test(String(s.value)) && !noAnim ? (
                    <CountingNumber value={s.value} delay={0.6 + i * 0.15} color={s.color || '#A29BFE'} />
                  ) : s.value}
                </div>
                <div style={{ fontSize: 11, color: textMuted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Duel Stats (PvP) */}
        {duelStats && duelStats.length > 0 && (
          <div style={{ marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: textMuted, marginBottom: 8, textAlign: 'center', opacity: 0.6 }}>DUEL SUMMARY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {duelStats.map((ds, i) => (
                <div key={ds.label} style={{
                  background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 16, padding: '10px 14px',
                  animation: noAnim ? 'none' : `winSlideUp 0.4s ${0.3 + i * 0.1}s ease both`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: ds.color || '#A29BFE', marginBottom: 4, textAlign: 'center' }}>{ds.label.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 9, color: textMuted }}>KAMU</div>
                        <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: ds.myValue >= ds.oppValue ? ds.color : textMuted }}>{ds.myValue}</div>
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.2 }}>VS</div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, color: textMuted }}>LAWAN</div>
                        <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: ds.oppValue > ds.myValue ? '#FF6B6B' : textMuted }}>{ds.oppValue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div ref={btnsRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Rematch button for PvP */}
          {typeof onRematch === 'function' && (
            <button
              onClick={() => { play('click'); onRematch() }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #E17055, #D63031)',
                color: '#fff',
                border: 'none', borderRadius: 100,
                padding: '14px 18px',
                fontSize: 16, fontWeight: 800,
                fontFamily: "'Fredoka One',cursive",
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(214,48,49,0.4)',
                animation: 'rematchPulse 2s ease infinite',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              ⚔️ Rematch!
            </button>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => withOutro(() => { play('click'); onRestart() })} style={{
              flex: 1, background: gameColor, color: '#fff',
              border: 'none', borderRadius: 100, padding: '13px 18px',
              fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              cursor: 'pointer', boxShadow: `0 4px 14px ${gameColor}44`,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 14px ${gameColor}44` }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.boxShadow = `0 2px 6px ${gameColor}66` }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 14px ${gameColor}44` }}
            >
              {restartLabel}
            </button>
            <button onClick={() => withOutro(() => { play('click'); onBack() })} style={{
              flex: 1, background: dark ? '#1e2a4a' : '#F8F9FA',
              color: textMuted, border: `2px solid ${tc.borderCol}`,
              borderRadius: 100, padding: '13px 18px',
              fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              cursor: 'pointer', transition: 'transform 0.15s, background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = dark ? '#1e2a4a' : '#F8F9FA' }}
              onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.background = dark ? '#2d3a5a' : '#E8E9EA' }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = dark ? '#1e2a4a' : '#F8F9FA' }}
            >
              {backLabel}
            </button>
          </div>
          {typeof onHome === 'function' && (
            <button
              type="button"
              onClick={() => { play('click'); onHome() }}
              style={{
                width: '100%',
                background: 'transparent',
                color: textMuted,
                border: `2px dashed ${tc.borderCol}`,
                borderRadius: 100,
                padding: '11px 18px',
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'Fredoka One',cursive",
                cursor: 'pointer',
              }}
            >
              {homeLabel}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes winFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes winPopIn   { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes winBounce  { 0%{transform:scale(0.4)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes winStarPop { from{transform:scale(0) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes winSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rematchPulse { 0%,100%{box-shadow:0 4px 20px rgba(214,48,49,0.4)} 50%{box-shadow:0 4px 30px rgba(214,48,49,0.7)} }
      `}</style>
    </div>
  )
}

// ─── Lose Modal ──────────────────────────────────────────────────────────────
export function LoseModal({
  emoji = '😢',
  title = 'Game Over',
  subtitle = '',
  stats = [],
  coinReward = 0,
  onRestart,
  onBack,
  onHome,
  dark,
  gameColor = '#FF6B6B',
  backLabel = '🎯 Ganti Level',
  homeLabel = '🏠 Beranda',
  restartLabel = '🔄 Main Lagi',
  highlight = '',
  duelStats = null,
  onRematch = null,
}) {
  return (
    <WinModal
      emoji={emoji}
      title={title}
      subtitle={subtitle}
      stats={stats}
      stars={0}
      coinReward={coinReward}
      onRestart={onRestart}
      onBack={onBack}
      onHome={onHome}
      dark={dark}
      gameColor={gameColor}
      backLabel={backLabel}
      homeLabel={homeLabel}
      restartLabel={restartLabel}
      highlight={highlight}
      duelStats={duelStats}
      onRematch={onRematch}
    />
  )
}
// ─── Pause Modal ─────────────────────────────────────────────────────────────
export function PauseModal({
  onExit,
  onRestart,
  onResume,
  dark,
  gameColor = '#A29BFE',
  title = 'Game Paused',
  emoji = '⏸️',
}) {
  const { play } = useSound()
  const tc = useThemeColors()
  const bg = tc.dark ? tc.surface : '#fff'
  const textMain = tc.textMain
  const textMuted = tc.textMuted

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 24,
    }}>
      <div style={{
        background: bg, borderRadius: 28,
        padding: '36px 32px', textAlign: 'center',
        maxWidth: 340, width: '100%',
        boxShadow: `0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px ${gameColor}22`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: gameColor,
        }} />

        <div style={{ fontSize: 60, marginBottom: 12 }}>{emoji}</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: textMain, marginBottom: 20 }}>{title}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => { play('click'); onResume() }} style={{
            background: gameColor, color: '#fff',
            border: 'none', borderRadius: 100, padding: '14px 20px',
            fontSize: 16, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
            cursor: 'pointer', boxShadow: `0 4px 14px ${gameColor}44`,
          }}>
            ▶️ Lanjutkan
          </button>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { play('click'); onRestart() }} style={{
              flex: 1, background: dark ? '#1e2a4a' : '#F8F9FA',
              color: textMuted, border: `2px solid ${tc.borderCol}`,
              borderRadius: 100, padding: '12px 14px',
              fontSize: 14, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              cursor: 'pointer',
            }}>
              🔄 Reset
            </button>
            <button onClick={() => { play('click'); onExit() }} style={{
              flex: 1, background: dark ? '#1e2a4a' : '#F8F9FA',
              color: '#FF6B6B', border: `2px solid ${tc.borderCol}`,
              borderRadius: 100, padding: '12px 14px',
              fontSize: 14, fontWeight: 800, fontFamily: "'Fredoka One',cursive",
              cursor: 'pointer',
            }}>
              🚪 Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
