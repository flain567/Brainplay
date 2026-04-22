import { useState, useEffect, useRef } from 'react'
import { useProgress, ACHIEVEMENTS } from '../context/ProgressContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import PremiumTitleBadge from './PremiumTitleBadge.jsx'
import gsap from 'gsap'

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
    play('trophy')

    // Trigger Confetti Burst
    triggerConfetti()

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

  function triggerConfetti() {
    const colors = ['#FDCB6E', '#FF6B6B', '#4ECDC4', '#A29BFE', '#fff']
    const container = document.body
    
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div')
      el.className = 'ach-confetti'
      el.style.cssText = `
        position: fixed; top: -10px; left: ${50 + (Math.random() * 40 - 20)}%;
        width: ${6 + Math.random() * 10}px; height: ${6 + Math.random() * 10}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        z-index: 10000; pointer-events: none;
      `
      container.appendChild(el)
      
      gsap.fromTo(el, {
        y: 80, x: 0, scale: 0, rotation: 0
      }, {
        y: 200 + Math.random() * 300,
        x: (Math.random() - 0.5) * 400,
        rotation: Math.random() * 720,
        scale: 1,
        duration: 1.5 + Math.random() * 2,
        ease: 'power1.out',
        onComplete: () => el.remove()
      })
      
      gsap.to(el, {
        opacity: 0,
        duration: 0.5,
        delay: 1.5 + Math.random()
      })
    }
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
          ? 'linear-gradient(135deg, #1e2a4a 0%, #0d1117 100%)'
          : 'linear-gradient(135deg, #fff 0%, #fff 100%)',
        border: `2.5px solid ${dark ? '#FDCB6E88' : '#FDCB6E'}`,
        borderRadius: 24,
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        boxShadow: `0 20px 60px rgba(0,0,0,${dark ? '0.6' : '0.2'}), 0 0 30px rgba(253,203,110,0.25)`,
        animation: fading
          ? 'achSlideOut 0.4s ease forwards'
          : 'achSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1.2) forwards',
        maxWidth: '94vw',
        overflow: 'hidden',
        minWidth: 280
      }}>
        {/* Shine sweep */}
        <div style={{
          position: 'absolute', top: 0, width: '60%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          transform: 'skewX(-25deg)',
          animation: 'achShine 1.5s 0.2s infinite ease-in-out',
          pointerEvents: 'none',
          left: '-100%',
        }} />

        <div style={{ 
          position: 'relative', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 54, height: 54, borderRadius: 16,
          background: 'rgba(253,203,110,0.15)',
          boxShadow: 'inset 0 0 12px rgba(253,203,110,0.2)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 38, animation: 'achBounce 0.5s 0.2s ease both' }}>
            {showing.icon}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 10,
            color: '#FDCB6E',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            🌟 Achievement Unlocked!
          </div>
          <div style={{
            fontFamily: "'Fredoka One',cursive",
            fontSize: 18,
            color: dark ? '#fff' : '#2D3436',
            lineHeight: 1.1,
            marginBottom: 4
          }}>
            {showing.title}
          </div>
          <div style={{ fontSize: 12, color: dark ? '#8892b0' : '#636E72', fontWeight: 600 }}>
            {showing.desc}
          </div>
          
          {/* REWARDS SECTION */}
          {(showing.reward) && (
            <div style={{ 
              marginTop: 10, padding: '8px 12px', borderRadius: 12,
              background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
              display: 'flex', alignItems: 'center', gap: 10,
              border: `1px solid ${dark ? 'rgba(253,203,110,0.1)' : 'rgba(0,0,0,0.05)'}`
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#FDCB6E' }}>REWARD:</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {showing.reward.coins && (
                  <div style={{ 
                    fontSize: 11, fontWeight: 800, color: '#fdd835', 
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: '#fdd83522', padding: '2px 8px', borderRadius: 100
                  }}>
                    🪙 {showing.reward.coins}
                  </div>
                )}
                {showing.reward.title && (
                  <PremiumTitleBadge 
                    title={showing.reward.title} 
                    rarity={showing.category === 'streak' || showing.category === 'score' ? 'epic' : 'rare'} 
                    size="small" 
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
