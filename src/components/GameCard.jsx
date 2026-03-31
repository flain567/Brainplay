import { useRef, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { createAnimatable, createSpring } from 'animejs'

// Spring presets
const SPRING_HOVER  = createSpring({ stiffness: 280, damping: 18, mass: 1 })
const SPRING_ACTIVE = createSpring({ stiffness: 400, damping: 22, mass: 0.8 })
const SPRING_EMOJI  = createSpring({ stiffness: 180, damping: 14, mass: 1 })

export default function GameCard({ game, onPlay }) {
  const { darkMode } = useSettings()
  const { play }     = useSound()
  const { progress } = useProgress()
  const tc           = useThemeColors()
  const dark         = tc.dark
  const cardRef      = useRef(null)
  const emojiRef     = useRef(null)
  const playBtnRef   = useRef(null)
  const rippleRef    = useRef(null)

  // Animatable instances — created once, updated imperatively (no React re-render)
  const cardAnim    = useRef(null)
  const emojiAnim   = useRef(null)
  const playBtnAnim = useRef(null)

  const wins = (progress.gameWins  || {})[game.id] || 0
  const best = (progress.gameBests || {})[game.id] || 0

  useEffect(() => {
    if (!cardRef.current || !emojiRef.current || !playBtnRef.current) return

    // Card — spring for y + scale
    cardAnim.current = createAnimatable(cardRef.current, {
      y:     { ease: SPRING_HOVER },
      scale: { ease: SPRING_HOVER },
    })

    // Emoji watermark — independent spring, slower
    emojiAnim.current = createAnimatable(emojiRef.current, {
      scale:   { ease: SPRING_EMOJI },
      rotate:  { ease: SPRING_EMOJI },
      opacity: { duration: 200 },
    })

    // Play button — fast spring
    playBtnAnim.current = createAnimatable(playBtnRef.current, {
      scale:   { ease: SPRING_ACTIVE },
      opacity: { duration: 180 },
    })

    // Set initial states
    cardAnim.current.y(0)
    cardAnim.current.scale(1)
    emojiAnim.current.scale(1)
    emojiAnim.current.rotate(0)
    playBtnAnim.current.scale(0.75)
    playBtnAnim.current.opacity(0)

    return () => {
      cardAnim.current    = null
      emojiAnim.current   = null
      playBtnAnim.current = null
    }
  }, [])

  const handleMouseEnter = () => {
    play('hover')
    cardAnim.current?.y(-7)
    cardAnim.current?.scale(1.025)
    emojiAnim.current?.scale(1.12)
    emojiAnim.current?.rotate(-10)
    playBtnAnim.current?.scale(1)
    playBtnAnim.current?.opacity(1)
  }

  const handleMouseLeave = () => {
    cardAnim.current?.y(0)
    cardAnim.current?.scale(1)
    emojiAnim.current?.scale(1)
    emojiAnim.current?.rotate(0)
    playBtnAnim.current?.scale(0.75)
    playBtnAnim.current?.opacity(0)
  }

  const handlePointerDown = () => {
    cardAnim.current?.y(-2)
    cardAnim.current?.scale(0.98)
  }
  const handlePointerUp = () => {
    cardAnim.current?.y(-7)
    cardAnim.current?.scale(1.025)
  }

  const handleClick = (e) => {
    // Ripple
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect && rippleRef.current) {
      const rip = rippleRef.current
      rip.style.left    = `${e.clientX - rect.left}px`
      rip.style.top     = `${e.clientY - rect.top}px`
      rip.style.width   = '0'
      rip.style.height  = '0'
      rip.style.opacity = '0.4'
      // Force reflow then animate via CSS keyframe
      void rip.offsetWidth
      rip.style.animation = 'none'
      void rip.offsetWidth
      rip.style.animation = 'rippleAnim 0.6s ease-out forwards'
    }
    play('click')
    onPlay(game.id)
  }

  return (
    <>
      <style>{`
        .gcard {
          width: 280px; flex-shrink: 0; scroll-snap-align: start;
          aspect-ratio: 16/9; border-radius: 20px; padding: 20px;
          cursor: pointer; position: relative; overflow: hidden;
          border: 2px solid transparent;
          display: flex; flex-direction: column; justify-content: flex-end;
          animation: slide-up 0.4s ease both;
          -webkit-tap-highlight-color: transparent;
          will-change: transform;
        }
        .gcard-emoji-bg {
          position: absolute; right: -15px; bottom: -20px;
          font-size: 110px; pointer-events: none; z-index: 0;
          will-change: transform;
        }
        .gcard-content { position: relative; z-index: 2; }
        .gcard-play-btn {
          position: absolute; top: 16px; left: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
          color: #fff; cursor: pointer; z-index: 3;
          font-size: 12px; font-weight: 800; padding-left: 2px;
          will-change: transform, opacity;
        }
        .gcard-shine {
          position: absolute; top: -50%; left: -60%;
          width: 40%; height: 200%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);
          transform: skewX(-20deg); pointer-events: none; z-index: 1;
          transition: left 0.5s ease;
        }
        .gcard:hover .gcard-shine { left: 120%; }
        .gcard-ripple {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.25);
          pointer-events: none; z-index: 3;
          transform: translate(-50%,-50%);
        }
        @keyframes rippleAnim {
          0%   { width:0; height:0; opacity:0.4; }
          100% { width:400px; height:400px; opacity:0; }
        }
        .gcard-top-right {
          position: absolute; top: 14px; right: 14px;
          display: flex; gap: 6px; z-index: 3;
        }
        @media (max-width:600px) {
          .gcard { width:260px; padding:18px; border-radius:18px; }
          .gcard-emoji-bg { font-size:90px; right:-10px; bottom:-15px; }
        }
      `}</style>

      <div
        ref={cardRef}
        className="gcard"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{
          background: dark
            ? `linear-gradient(145deg,color-mix(in srgb,${game.color} 14%,#16213e),color-mix(in srgb,${game.color} 6%,#0f1029))`
            : `linear-gradient(145deg,color-mix(in srgb,${game.color} 25%,#fff),color-mix(in srgb,${game.color} 10%,${game.bg}))`,
          borderColor: dark ? 'transparent' : `${game.color}20`,
          boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : `0 4px 20px ${game.color}18`,
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          handleMouseEnter()
          e.currentTarget.style.borderColor = game.color
          e.currentTarget.style.boxShadow  = `0 20px 50px ${game.color}30,0 0 0 1px ${game.color}20`
        }}
        onMouseLeave={(e) => {
          handleMouseLeave()
          e.currentTarget.style.borderColor = dark ? 'transparent' : `${game.color}20`
          e.currentTarget.style.boxShadow   = dark ? '0 4px 20px rgba(0,0,0,0.3)' : `0 4px 20px ${game.color}18`
        }}
      >
        {/* Ripple */}
        <div ref={rippleRef} className="gcard-ripple" style={{ opacity:0 }} />

        {/* Shine sweep */}
        <div className="gcard-shine" />

        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background: dark
          ? 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)'
          : `linear-gradient(to top,${game.color}cc 0%,${game.color}40 40%,transparent 70%)`, zIndex:1 }} />

        {/* Play Button */}
        <button ref={playBtnRef} className="gcard-play-btn">▶</button>

        {/* Top Right Badges */}
        <div className="gcard-top-right">
          {best > 0 && (
            <div style={{
              background:'rgba(253,203,110,0.35)', backdropFilter:'blur(4px)',
              color:'#fff', fontSize:10, fontWeight:800,
              padding:'2px 8px', borderRadius:100, border:'1px solid rgba(253,203,110,0.5)',
              textShadow:'0 1px 2px rgba(0,0,0,0.25)',
            }} title="Rekor terbaik">
              🏆 {best >= 1000 ? `${(best/1000).toFixed(1)}k` : best}
            </div>
          )}
          {wins > 0 && (
            <div style={{
              background:'rgba(255,255,255,0.15)', backdropFilter:'blur(4px)',
              color:'#fff', fontSize:10, fontWeight:800,
              padding:'2px 8px', borderRadius:100, border:'1px solid rgba(255,255,255,0.2)',
            }}>
              {wins}×✓
            </div>
          )}
          <div style={{
            background:'rgba(255,255,255,0.15)', backdropFilter:'blur(4px)',
            color:'#fff', border:'1px solid rgba(255,255,255,0.2)',
            fontSize:10, fontWeight:800, padding:'2px 8px',
            borderRadius:100, fontFamily:"'Fredoka One',cursive",
          }}>
            Hari {game.day}
          </div>
        </div>

        {/* Emoji Watermark */}
        <div ref={emojiRef} className="gcard-emoji-bg" style={{
          opacity: dark ? 0.15 : 0.25,
          filter: dark ? 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' : `drop-shadow(0 0 12px ${game.color}30)`,
        }}>{game.emoji}</div>

        {/* Content */}
        <div className="gcard-content">
          <span style={{
            display:'inline-block',
            background:'rgba(0,0,0,0.25)', backdropFilter:'blur(4px)',
            color:'#fff', fontSize:10, fontWeight:700,
            padding:'3px 10px', borderRadius:100, letterSpacing:'0.5px',
            marginBottom:6, textTransform:'uppercase'
          }}>
            {game.tag}
          </span>
          <h3 style={{
            fontFamily:"'Fredoka One',cursive", fontSize:20,
            color:'#fff', margin:0, lineHeight:1.1,
            textShadow:'0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {game.title}
          </h3>
          <p style={{
            fontSize:11, color:'rgba(255,255,255,0.7)',
            lineHeight:1.4, margin:'4px 0 0 0',
            display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden'
          }}>
            {game.description}
          </p>
        </div>
      </div>
    </>
  )
}
