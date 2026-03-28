import { useEffect, useRef, useCallback } from 'react'
import { animate, stagger, splitText } from 'animejs'

/**
 * AnimatedHeroText — Anime.js powered text stagger animation
 * Mirip demo "HELLO WORLD" di animejs.com/documentation/animation
 *
 * Props:
 *  - text        : teks yang dianimasi (default "BrainPlay")
 *  - dark        : boolean dark mode
 *  - reduceMotion: boolean skip animasi
 */
export default function AnimatedHeroText({ text = 'BrainPlay', dark = false, reduceMotion = false }) {
  const containerRef = useRef(null)
  const animRef      = useRef(null)
  const splitRef     = useRef(null)

  const initAnimation = useCallback(() => {
    if (!containerRef.current || reduceMotion) return

    // Clean up previous
    if (splitRef.current) {
      try { splitRef.current.revert() } catch {}
    }
    if (animRef.current) {
      try { animRef.current.pause() } catch {}
    }

    const h2 = containerRef.current.querySelector('.anim-target')
    if (!h2) return

    // splitText — pecah huruf
    const split = splitText(h2, { words: false, chars: true })
    splitRef.current = split

    // Apply individual char colors from BrainPlay palette
    const colors = ['#FF6B6B', '#FDCB6E', '#4ECDC4', '#A29BFE', '#FD79A8', '#45B7D1', '#FF6B6B', '#FDCB6E', '#4ECDC4']
    split.chars.forEach((el, i) => {
      el.style.display = 'inline-block'
      el.style.color = colors[i % colors.length]
    })

    // animate — persis seperti demo Anime.js "HELLO WORLD"
    animRef.current = animate(split.chars, {
      y: [
        { to: '-2.75rem', ease: 'outExpo', duration: 600 },
        { to: 0, ease: 'outBounce', duration: 800, delay: 100 },
      ],
      rotate: { from: '-1turn', delay: 0 },
      delay: stagger(50),
      ease: 'inOutCirc',
      loopDelay: 1500,
      loop: true,
    })
  }, [reduceMotion])

  useEffect(() => {
    // Slight delay so DOM is ready
    const t = setTimeout(initAnimation, 100)
    return () => {
      clearTimeout(t)
      if (animRef.current) {
        try { animRef.current.pause() } catch {}
      }
      if (splitRef.current) {
        try { splitRef.current.revert() } catch {}
      }
    }
  }, [initAnimation])

  /* ── Styles ── */
  const boxBg = dark
    ? 'linear-gradient(135deg, rgba(30,30,45,0.95), rgba(20,20,35,0.98))'
    : 'linear-gradient(135deg, rgba(45,52,54,0.95), rgba(30,30,42,0.98))'

  return (
    <div ref={containerRef} style={{ margin: '0 auto 28px', maxWidth: 520 }}>
      <style>{`
        .anim-box {
          position: relative;
          border-radius: 20px;
          padding: 36px 20px;
          background: ${boxBg};
          border: 2px solid ${dark ? 'rgba(162,155,254,0.2)' : 'rgba(162,155,254,0.15)'};
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
          overflow: hidden;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .anim-box::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 30px,
            rgba(162,155,254,0.03) 30px,
            rgba(162,155,254,0.03) 31px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 30px,
            rgba(162,155,254,0.03) 30px,
            rgba(162,155,254,0.03) 31px
          );
          pointer-events: none;
        }
        .anim-label {
          position: absolute;
          top: 12px; left: 16px;
          font-family: 'Fredoka One', cursive;
          font-size: 13px;
          color: #A29BFE;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }
        .anim-replay {
          position: absolute;
          top: 10px; right: 12px;
          width: 32px; height: 32px;
          border-radius: 10px;
          border: 1.5px solid rgba(162,155,254,0.25);
          background: rgba(162,155,254,0.08);
          color: #A29BFE;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .anim-replay:hover { background: rgba(162,155,254,0.18); transform: rotate(180deg); }
        .anim-replay:active { transform: scale(0.9) rotate(180deg); }
        .anim-target {
          font-family: 'Fredoka One', cursive;
          font-size: clamp(32px, 6vw, 52px);
          letter-spacing: 0.06em;
          text-align: center;
          color: #fff;
          white-space: nowrap;
          line-height: 1.3;
        }
        @media (max-width: 600px) {
          .anim-box { padding: 28px 14px; min-height: 100px; }
          .anim-target { font-size: 28px; }
        }
      `}</style>

      <div className="anim-box">
        <span className="anim-label">Animation</span>
        <button
          className="anim-replay"
          title="Replay"
          onClick={() => {
            // Restart animation
            if (animRef.current) {
              try { animRef.current.pause() } catch {}
            }
            if (splitRef.current) {
              try { splitRef.current.revert() } catch {}
            }
            setTimeout(initAnimation, 50)
          }}
        >
          ↻
        </button>
        {reduceMotion ? (
          <h2 className="anim-target" style={{
            background: 'linear-gradient(135deg, #FF6B6B, #A29BFE, #4ECDC4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {text}
          </h2>
        ) : (
          <h2 className="anim-target">{text}</h2>
        )}
      </div>
    </div>
  )
}
