import { useState, useLayoutEffect, useRef, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

const DIFF_CONFIG = {
  easy:   { icon: '🟢', label: 'Mudah',  color: '#00b894' },
  medium: { icon: '🟡', label: 'Sedang', color: '#f9a825' },
  hard:   { icon: '🔴', label: 'Sulit',  color: '#FF6B6B' },
}

export default function GameDetailModal({ game, onClose, onPlay }) {
  const { play } = useSound()
  const { progress } = useProgress()
  const { reduceMotion } = useSettings()
  const tc = useThemeColors()
  const [selectedDiff, setSelectedDiff] = useState('medium')
  
  const overlayRef = useRef(null)
  const modalRef = useRef(null)
  const bg = tc.dark ? '#1A1F35' : '#FFFFFF'
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  // Entrance animation
  useLayoutEffect(() => {
    if (reduceMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      // Mobile: slide up from bottom, Desktop: pop in
      const isMobile = window.innerWidth <= 640
      if (isMobile) {
        gsap.fromTo(modalRef.current, { y: '100%' }, { y: '0%', duration: 0.5, ease: 'power3.out' })
      } else {
        gsap.fromTo(modalRef.current, { scale: 0.8, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' })
      }
    })
    return () => ctx.revert()
  }, [reduceMotion])

  const handleClose = () => {
    if (reduceMotion) {
      onClose()
      return
    }
    const isMobile = window.innerWidth <= 640
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25 })
    gsap.to(modalRef.current, { 
      y: isMobile ? '100%' : 20, 
      scale: isMobile ? 1 : 0.9, 
      opacity: isMobile ? 1 : 0, 
      duration: 0.3, 
      ease: 'power2.in',
      onComplete: onClose 
    })
  }

  const bestScore = (progress.gameBests || {})[game.id] || 0
  const totalWins = (progress.gameWins || {})[game.id] || 0

  return (
    <div ref={overlayRef} className="gdm-overlay" onClick={handleClose}>
      <style>{`
        .gdm-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
        }
        .gdm-content {
          width: 100%; max-width: 480px; background: ${bg};
          border-radius: 28px; position: relative; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          cursor: default;
        }
        .gdm-header {
          padding: 40px 24px 24px; text-align: center;
          background: linear-gradient(to bottom, ${game.color}15, transparent);
          position: relative;
        }
        .gdm-close {
          position: absolute; top: 18px; right: 18px;
          width: 36px; height: 36px; border-radius: 50%;
          background: ${tc.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
          border: none; color: ${textMuted}; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
          z-index: 10;
        }
        .gdm-close:hover { background: ${game.color}; color: #fff; transform: rotate(90deg); }
        
        .gdm-emoji-wrap {
          width: 90px; height: 90px; border-radius: 24px; margin: 0 auto 16px;
          background: linear-gradient(135deg, ${game.color}20, ${game.color}40);
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; box-shadow: 0 10px 25px ${game.color}30;
          animation: gdm-float 3s ease-in-out infinite;
        }
        @keyframes gdm-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .gdm-title { font-family: 'Fredoka One',cursive; font-size: 28px; color: ${textMain}; margin-bottom: 6px; }
        .gdm-tag { 
          display: inline-block; padding: 3px 12px; border-radius: 100px;
          font-size: 11px; font-weight: 800; text-transform: uppercase;
          background: ${game.color}22; color: ${game.color}; border: 1px solid ${game.color}44;
        }
        
        .gdm-body { padding: 0 24px 24px; }
        .gdm-desc { font-size: 14px; color: ${textMuted}; line-height: 1.6; text-align: center; margin-bottom: 24px; }
        
        .gdm-stats {
          display: flex; gap: 12px; justify-content: center; margin-bottom: 24px;
        }
        .gdm-stat-box {
          background: ${tc.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
          padding: 10px 16px; border-radius: 16px; min-width: 100px; text-align: center;
          border: 1.5px solid ${borderCol};
        }
        .gdm-stat-val { font-family: 'Fredoka One',cursive; font-size: 18px; color: ${textMain}; }
        .gdm-stat-lbl { font-size: 10px; color: ${textMuted}; font-weight: 700; text-transform: uppercase; margin-top: 2px; }

        .gdm-diff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
        .gdm-diff-card {
          padding: 14px 8px; border-radius: 16px; border: 2px solid ${borderCol};
          background: ${bg}; cursor: pointer; text-align: center; transition: all 0.2s;
        }
        .gdm-diff-card.active {
          border-color: var(--diff-color); background: var(--diff-bg);
          transform: translateY(-3px); box-shadow: 0 6px 15px var(--diff-shadow);
        }
        .gdm-diff-icon { font-size: 22px; margin-bottom: 4px; }
        .gdm-diff-label { font-family: 'Fredoka One',cursive; font-size: 13px; color: ${textMain}; }
        
        .gdm-play-btn {
          width: 100%; padding: 16px; border-radius: 18px; border: none;
          background: linear-gradient(135deg, ${game.color}, ${game.color}dd);
          color: #fff; font-family: 'Fredoka One',cursive; font-size: 18px;
          cursor: pointer; box-shadow: 0 8px 24px ${game.color}40;
          transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .gdm-play-btn:hover { transform: scale(1.02); filter: brightness(1.1); }
        .gdm-play-btn:active { transform: scale(0.98); }

        @media (max-width: 640px) {
          .gdm-overlay { align-items: flex-end; }
          .gdm-content { 
            max-width: none; border-radius: 32px 32px 0 0;
            padding-bottom: calc(24px + var(--safe-bottom, 0px));
          }
        }
      `}</style>
      
      <div 
        ref={modalRef} 
        className="gdm-content" 
        onClick={e => e.stopPropagation()}
      >
        <button className="gdm-close" onClick={handleClose}>✕</button>
        
        <div className="gdm-header">
          <div className="gdm-emoji-wrap">{game.emoji}</div>
          <h2 className="gdm-title">{game.title}</h2>
          <span className="gdm-tag">{game.tag}</span>
        </div>
        
        <div className="gdm-body">
          <p className="gdm-desc">{game.description}</p>
          
          <div className="gdm-stats">
            <div className="gdm-stat-box">
              <div className="gdm-stat-val" style={{ color: bestScore > 0 ? '#F9A825' : textMuted }}>
                {bestScore > 0 ? bestScore.toLocaleString() : '—'}
              </div>
              <div className="gdm-stat-lbl">Record Terbaik</div>
            </div>
            <div className="gdm-stat-box">
              <div className="gdm-stat-val" style={{ color: totalWins > 0 ? '#4ECDC4' : textMuted }}>
                {totalWins}
              </div>
              <div className="gdm-stat-lbl">Kemenangan</div>
            </div>
          </div>
          
          <div className="gdm-diff-grid">
            {game.difficulties ? game.difficulties.map(diff => {
              const cfg = DIFF_CONFIG[diff.id]
              const active = selectedDiff === diff.id
              return (
                <div 
                  key={diff.id}
                  className={`gdm-diff-card${active ? ' active' : ''}`}
                  style={{ 
                    '--diff-color': cfg.color,
                    '--diff-bg': `${cfg.color}15`,
                    '--diff-shadow': `${cfg.color}25`
                  }}
                  onClick={() => { play('click'); setSelectedDiff(diff.id) }}
                >
                  <div className="gdm-diff-icon">{cfg.icon}</div>
                  <div className="gdm-diff-label">{cfg.label}</div>
                </div>
              )
            }) : (
              <div style={{ gridColumn: 'span 3', color: textMuted, fontSize: 12, textAlign: 'center', opacity: 0.6 }}>
                Game ini tidak memiliki tingkat kesulitan
              </div>
            )}
          </div>
          
          <button className="gdm-play-btn" onClick={() => { play('levelUp'); onPlay(game.id, selectedDiff) }}>
            ▶ MAIN SEKARANG
          </button>
        </div>
      </div>
    </div>
  )
}
