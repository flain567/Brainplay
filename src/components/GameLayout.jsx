import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import Confetti from './Confetti.jsx'
import TutorialModal from './TutorialModal.jsx'

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
  dark,
  gameColor = '#FF6B6B',
  backLabel = '🎯 Ganti Level',
}) {
  const tc = useThemeColors()
  const bg = tc.dark ? tc.surface : '#fff'
  const textMain = tc.textMain
  const textMuted = tc.textMuted

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: 24,
      animation: 'winFadeIn 0.3s ease',
    }}>
      <div style={{
        background: bg, borderRadius: 28,
        padding: '36px 32px', textAlign: 'center',
        maxWidth: 380, width: '100%',
        boxShadow: `0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px ${gameColor}22`,
        animation: 'winPopIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${gameColor}, #A29BFE, #4ECDC4)`,
        }} />

        <div style={{ fontSize: 60, marginBottom: 8, animation: 'winBounce 0.6s ease' }}>{emoji}</div>
        <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 30, color: textMain, marginBottom: 4 }}>{title}</h2>
        {subtitle && <p style={{ color: textMuted, fontSize: 14, marginBottom: 6 }}>{subtitle}</p>}

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
              <span key={i} style={{
                display: 'inline-block',
                animation: i < stars ? `winStarPop 0.4s ${0.2 + i * 0.15}s cubic-bezier(0.34,1.56,0.64,1) both` : 'none',
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
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: dark ? 'rgba(253,203,110,0.12)' : '#FFFDE7',
            border: '1.5px solid #FDCB6E44',
            borderRadius: 100, padding: '6px 18px', marginBottom: 16,
            animation: 'winSlideUp 0.4s 0.3s ease both',
          }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: '#F9A825' }}>+{coinReward}</span>
          </div>
        )}

        {/* Stats grid */}
        {stats.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 3)},1fr)`,
            gap: 10, marginBottom: 24,
          }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{
                background: dark ? `${s.color || '#A29BFE'}12` : `${s.color || '#A29BFE'}10`,
                borderRadius: 14, padding: '12px 8px',
                animation: `winSlideUp 0.4s ${0.35 + i * 0.12}s ease both`,
              }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: s.color || '#A29BFE' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: textMuted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRestart} style={{
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
            🔄 Main Lagi
          </button>
          <button onClick={onBack} style={{
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
      </div>

      <style>{`
        @keyframes winFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes winPopIn   { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes winBounce  { 0%{transform:scale(0.4)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes winStarPop { from{transform:scale(0) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes winSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
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
  dark,
  gameColor = '#FF6B6B',
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
      dark={dark}
      gameColor={gameColor}
    />
  )
}
