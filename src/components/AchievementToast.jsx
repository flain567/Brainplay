import { useState, useEffect, useRef } from 'react'
import { useProgress, ACHIEVEMENTS } from '../context/ProgressContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'

export default function AchievementToast() {
  const { progress, clearNewAchievements } = useProgress()
  const { darkMode } = useSettings()
  const { play } = useSound()
  const [showing, setShowing] = useState(null)
  const [fading, setFading] = useState(false)
  const queueRef = useRef([])
  const timerRef = useRef(null)
  const fadeRef = useRef(null)

  // Pick up new achievements into queue
  useEffect(() => {
    if (progress.newAchievements && progress.newAchievements.length > 0) {
      const achs = progress.newAchievements
        .map(id => ACHIEVEMENTS.find(a => a.id === id))
        .filter(Boolean)
      queueRef.current = [...queueRef.current, ...achs]
      clearNewAchievements()

      // Kick off showing if not already showing
      if (!showing && queueRef.current.length > 0) {
        showNext()
      }
    }
  }, [progress.newAchievements])

  function showNext() {
    if (queueRef.current.length === 0) return
    const next = queueRef.current.shift()
    setShowing(next)
    setFading(false)
    play('levelUp')

    // Clear any existing timers
    clearTimeout(timerRef.current)
    clearTimeout(fadeRef.current)

    // Start fade-out after 3 seconds
    timerRef.current = setTimeout(() => {
      setFading(true)
      // Remove after fade animation (0.4s)
      fadeRef.current = setTimeout(() => {
        setShowing(null)
        setFading(false)
        // Show next in queue if any
        if (queueRef.current.length > 0) {
          setTimeout(() => showNext(), 300)
        }
      }, 400)
    }, 3000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(fadeRef.current)
    }
  }, [])

  if (!showing) return null

  const dark = darkMode

  return (
    <>
      <style>{`
        @keyframes achSlideIn {
          from { opacity: 0; transform: translateY(-20px) translateX(-50%) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) translateX(-50%) scale(1); }
        }
        @keyframes achSlideOut {
          from { opacity: 1; transform: translateY(0) translateX(-50%) scale(1); }
          to   { opacity: 0; transform: translateY(-20px) translateX(-50%) scale(0.9); }
        }
        @keyframes achShine {
          0%   { left: -60%; }
          100% { left: 120%; }
        }
        @keyframes achBounce {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.2) rotate(-5deg); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: dark
          ? 'linear-gradient(135deg, #1e2a4a 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #fff 0%, #FFF9F0 100%)',
        border: `2px solid ${dark ? '#FDCB6E55' : '#FDCB6E'}`,
        borderRadius: 20,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: `0 12px 40px rgba(0,0,0,${dark ? '0.4' : '0.15'}), 0 0 20px rgba(253,203,110,0.2)`,
        animation: fading
          ? 'achSlideOut 0.4s ease forwards'
          : 'achSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        maxWidth: '90vw',
        overflow: 'hidden',
      }}>
        {/* Shine sweep */}
        <div style={{
          position: 'absolute', top: 0, width: '40%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(253,203,110,0.15), transparent)',
          transform: 'skewX(-20deg)',
          animation: 'achShine 1s 0.3s ease forwards',
          pointerEvents: 'none',
          left: '-60%',
        }} />

        <span style={{ fontSize: 36, animation: 'achBounce 0.5s 0.2s ease both', flexShrink: 0 }}>
          {showing.icon}
        </span>
        <div>
          <div style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 11,
            color: '#FDCB6E',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            🏆 Achievement Unlocked!
          </div>
          <div style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 16,
            color: dark ? '#e8e8f0' : '#2D3436',
            lineHeight: 1.2,
          }}>
            {showing.title}
          </div>
          <div style={{ fontSize: 12, color: dark ? '#8892b0' : '#636E72', marginTop: 2 }}>
            {showing.desc}
          </div>
        </div>
      </div>
    </>
  )
}
