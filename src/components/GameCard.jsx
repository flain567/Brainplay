import { useState, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function GameCard({ game, onPlay }) {
  const [hovered, setHovered] = useState(false)
  const [ripple, setRipple] = useState(null)
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { progress } = useProgress()
  const tc = useThemeColors()
  const dark = tc.dark
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
          width: 280px;
          flex-shrink: 0;
          scroll-snap-align: start;
          aspect-ratio: 16 / 9;
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.25s ease,
                      border-color 0.2s ease;
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: slide-up 0.4s ease both;
          -webkit-tap-highlight-color: transparent;
        }
        .gcard:hover { transform: translateY(-6px) scale(1.02); }
        .gcard:active { transform: translateY(-2px) scale(0.99); }

        .gcard-emoji-bg {
          position: absolute;
          right: -15px;
          bottom: -20px;
          font-size: 110px;
          pointer-events: none;
          transition: all 0.5s cubic-bezier(0.34,1.56,0.64,1);
          z-index: 0;
        }
        .gcard:hover .gcard-emoji-bg { transform: scale(1.1) rotate(-10deg) translateX(-10px); opacity: 0.35 !important; }

        .gcard-content {
          position: relative; z-index: 2;
        }

        .gcard-play-btn {
          position: absolute; top: 16px; left: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
          color: #fff; cursor: pointer; opacity: 0; transform: scale(0.8);
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          z-index: 3; font-size: 12px; font-weight: 800; padding-left: 2px;
        }
        .gcard:hover .gcard-play-btn { opacity: 1; transform: scale(1); }
        .gcard:hover .gcard-play-btn:hover { background: rgba(255,255,255,0.4); transform: scale(1.1); }

        .gcard-shine {
          position: absolute; top: -50%; left: -60%;
          width: 40%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: skewX(-20deg);
          transition: left 0.5s ease;
          pointer-events: none; z-index: 1;
        }
        .gcard:hover .gcard-shine { left: 120%; }

        .gcard-ripple {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.25);
          pointer-events: none; z-index: 3;
          animation: rippleAnim 0.6s ease-out forwards;
        }
        @keyframes rippleAnim {
          0% { width: 0; height: 0; opacity: 0.4; transform: translate(-50%, -50%); }
          100% { width: 400px; height: 400px; opacity: 0; transform: translate(-50%, -50%); }
        }

        .gcard-top-right {
          position: absolute; top: 14px; right: 14px;
          display: flex; gap: 6px; z-index: 3;
        }

        @media (max-width: 600px) {
          .gcard { width: 260px; padding: 18px; border-radius: 18px; }
          .gcard-emoji-bg { font-size: 90px; right: -10px; bottom: -15px; }
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
            : `linear-gradient(145deg, color-mix(in srgb,${game.color} 25%,#fff), color-mix(in srgb,${game.color} 10%,${game.bg}))`,
          borderColor: hovered ? game.color : (dark ? 'transparent' : `${game.color}20`),
          boxShadow: hovered
            ? `0 20px 50px ${game.color}30, 0 0 0 1px ${game.color}20`
            : dark ? '0 4px 20px rgba(0,0,0,0.3)' : `0 4px 20px ${game.color}18`,
        }}
      >
        {/* Ripple */}
        {ripple && (
          <div className="gcard-ripple" style={{ left: ripple.x, top: ripple.y }} />
        )}

        {/* Shine sweep */}
        <div className="gcard-shine" />

        {/* Background gradient overlap to make text readable */}
        <div style={{ position:'absolute', inset:0, background: dark
          ? 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)'
          : `linear-gradient(to top, ${game.color}cc 0%, ${game.color}40 40%, transparent 70%)`, zIndex:1 }} />

        {/* Play Button Overlay */}
        <button className="gcard-play-btn">▶</button>

        {/* Top Right Badges */}
        <div className="gcard-top-right">
          {best > 0 && (
            <div style={{
              background: 'rgba(253,203,110,0.35)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: 10, fontWeight: 800,
              padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(253,203,110,0.5)',
              textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }} title="Rekor terbaik (agregat)">
              🏆 {best >= 1000 ? `${(best / 1000).toFixed(1)}k` : best}
            </div>
          )}
          {wins > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: 10, fontWeight: 800,
              padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {wins}×✓
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            fontSize: 10, fontWeight: 800, padding: '2px 8px',
            borderRadius: 100, fontFamily: "'Fredoka One',cursive",
          }}>
            Hari {game.day}
          </div>
        </div>

        {/* Jumbo Emoji Watermark */}
        <div className="gcard-emoji-bg" style={{
          opacity: dark ? 0.15 : 0.25,
          filter: dark ? 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' : `drop-shadow(0 0 12px ${game.color}30)`,
        }}>{game.emoji}</div>

        {/* Bottom Content Area */}
        <div className="gcard-content">
          <span style={{ 
            display: 'inline-block',
            background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: 10, fontWeight: 700, 
            padding: '3px 10px', borderRadius: 100, letterSpacing: '0.5px',
            marginBottom: 6, textTransform: 'uppercase'
          }}>
            {game.tag}
          </span>
          <h3 style={{ 
            fontFamily: "'Fredoka One',cursive", fontSize: 20, 
            color: '#fff', margin: 0, lineHeight: 1.1,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {game.title}
          </h3>
          <p style={{ 
            fontSize: 11, color: 'rgba(255,255,255,0.7)', 
            lineHeight: 1.4, margin: '4px 0 0 0',
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {game.description}
          </p>
        </div>
      </div>
    </>
  )
}
