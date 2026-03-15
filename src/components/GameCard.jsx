import { useState, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'

export default function GameCard({ game, onPlay }) {
  const [hovered, setHovered] = useState(false)
  const [ripple, setRipple] = useState(null)
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { progress } = useProgress()
  const dark = darkMode
  const cardRef = useRef(null)

  // Game progress info
  const wins = (progress.gameWins || {})[game.id] || 0
  const best = (progress.gameBests || {})[game.id] || 0

  const handleClick = (e) => {
    // Ripple effect
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() })
      setTimeout(() => setRipple(null), 600)
    }
    play('click')
    onPlay(game.id)
  }

  return (
    <>
      <style>{`
        .gcard {
          border-radius: 28px;
          padding: 28px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.25s ease,
                      border-color 0.2s ease;
          border: 2px solid transparent;
          animation: slide-up 0.4s ease both;
        }
        .gcard:hover { transform: translateY(-8px) scale(1.02); }
        .gcard:active { transform: translateY(-3px) scale(0.99); }
        .gcard { -webkit-tap-highlight-color: transparent; }

        .gcard-bg-orb {
          position: absolute; border-radius: 50%; pointer-events: none;
          transition: transform 0.4s ease, opacity 0.4s ease;
        }
        .gcard:hover .gcard-bg-orb { transform: scale(1.4); opacity: 0.18; }

        .gcard-emoji {
          font-size: 52px; display: inline-block; margin-bottom: 16px;
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
        }
        .gcard:hover .gcard-emoji { transform: scale(1.25) rotate(-10deg) translateY(-4px); }

        .gcard-play-btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: none; border-radius: 100px;
          padding: 11px 26px; font-size: 14px; font-weight: 800;
          font-family: 'Fredoka One', cursive; letter-spacing: 0.3px;
          color: #fff; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          position: relative; overflow: hidden;
        }
        .gcard-play-btn::after {
          content: ''; position: absolute; inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s;
        }
        .gcard:hover .gcard-play-btn { transform: scale(1.06); }
        .gcard:hover .gcard-play-btn::after { background: rgba(255,255,255,0.12); }

        .gcard-shine {
          position: absolute; top: -50%; left: -60%;
          width: 40%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: skewX(-20deg);
          transition: left 0.5s ease;
          pointer-events: none;
        }
        .gcard:hover .gcard-shine { left: 120%; }

        .gcard-ripple {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.25);
          pointer-events: none;
          animation: rippleAnim 0.6s ease-out forwards;
        }
        @keyframes rippleAnim {
          0% { width: 0; height: 0; opacity: 0.4; }
          100% { width: 300px; height: 300px; opacity: 0; }
        }

        .gcard-progress-dots {
          display: flex; gap: 3px; margin-top: 2px;
        }
        .gcard-progress-dots span {
          width: 5px; height: 5px; border-radius: 50%;
          transition: all 0.2s;
        }

        @media (max-width: 600px) {
          .gcard { padding: 22px; border-radius: 22px; }
          .gcard-emoji { font-size: 42px; margin-bottom: 12px; }
          .gcard-play-btn { padding: 10px 22px; font-size: 13px; }
        }
      `}</style>

      <div
        ref={cardRef}
        className="gcard"
        onClick={handleClick}
        onMouseEnter={() => { play('hover'); setHovered(true) }}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: dark
            ? `linear-gradient(145deg, color-mix(in srgb,${game.color} 14%,#16213e), color-mix(in srgb,${game.color} 6%,#0f1029))`
            : `linear-gradient(145deg, ${game.bg}, white)`,
          borderColor: hovered ? game.color : 'transparent',
          boxShadow: hovered
            ? `0 20px 50px ${game.color}30, 0 0 0 1px ${game.color}20`
            : dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.07)',
        }}
      >
        {/* Ripple */}
        {ripple && (
          <div className="gcard-ripple" style={{ left: ripple.x - 150, top: ripple.y - 150 }} />
        )}

        {/* Shine sweep */}
        <div className="gcard-shine" />

        {/* Background orb */}
        <div className="gcard-bg-orb" style={{ width: 140, height: 140, bottom: -40, right: -40, background: game.color, opacity: 0.08 }} />
        <div className="gcard-bg-orb" style={{ width: 80, height: 80, top: -20, left: -20, background: game.color, opacity: 0.06, animationDelay: '0.5s' }} />

        {/* Day badge */}
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: `${game.color}22`,
          color: game.color,
          border: `1.5px solid ${game.color}44`,
          fontSize: 11, fontWeight: 800, padding: '3px 10px',
          borderRadius: 100, fontFamily: "'Fredoka One',cursive",
          backdropFilter: 'blur(4px)',
        }}>
          Hari {game.day}
        </div>

        {/* Emoji */}
        <div className="gcard-emoji">{game.emoji}</div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: game.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.3px' }}>
            {game.tag}
          </span>
          {wins > 0 && (
            <span style={{
              background: dark ? 'rgba(78,205,196,0.15)' : '#E8FFF8',
              color: '#4ECDC4', fontSize: 10, fontWeight: 800,
              padding: '3px 10px', borderRadius: 100,
              border: '1px solid #4ECDC444',
            }}>
              {wins}× ✓
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: dark ? '#e8e8f0' : '#2D3436', marginBottom: 8, lineHeight: 1.2 }}>
          {game.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: 13, color: dark ? '#8892b0' : '#636E72', lineHeight: 1.6, marginBottom: 20 }}>
          {game.description}
        </p>

        {/* Play button */}
        <button
          className="gcard-play-btn"
          style={{ background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`, boxShadow: `0 6px 20px ${game.color}44` }}
        >
          ▶ Main Sekarang
        </button>
      </div>
    </>
  )
}
