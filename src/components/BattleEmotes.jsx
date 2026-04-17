import { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

const EMOTES = ['🔥', '😎', '😂', '💪', '😡', '🙌']
const COOLDOWN_MS = 3000

/**
 * BattleEmotes — Floating emote picker + incoming emote display for PvP
 *
 * Props:
 *  - onSendEmote(emoji): called when player picks an emote
 *  - incomingEmote: { emoji, ts } from opponent (via match state)
 *  - senderName: opponent display name
 *  - disabled: whether the game is paused / finished
 */
export default function BattleEmotes({ onSendEmote, incomingEmote, senderName = 'Lawan', disabled }) {
  const [open, setOpen] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [floatingEmotes, setFloatingEmotes] = useState([]) // { id, emoji, source:'me'|'opp' }
  const lastIncomingTs = useRef(0)
  const cooldownTimer = useRef(null)
  const idCounter = useRef(0)

  // ── Handle incoming emote from opponent ──
  useEffect(() => {
    if (!incomingEmote?.emoji || !incomingEmote?.ts) return
    if (incomingEmote.ts <= lastIncomingTs.current) return
    lastIncomingTs.current = incomingEmote.ts

    const id = ++idCounter.current
    setFloatingEmotes(prev => [...prev, { id, emoji: incomingEmote.emoji, source: 'opp' }])

    // Auto-remove after animation
    setTimeout(() => {
      setFloatingEmotes(prev => prev.filter(e => e.id !== id))
    }, 2000)
  }, [incomingEmote?.emoji, incomingEmote?.ts])

  // ── Send emote ──
  const sendEmote = useCallback((emoji) => {
    if (cooldown || disabled) return

    onSendEmote?.(emoji)
    setOpen(false)
    setCooldown(true)

    // Show own emote locally
    const id = ++idCounter.current
    setFloatingEmotes(prev => [...prev, { id, emoji, source: 'me' }])
    setTimeout(() => {
      setFloatingEmotes(prev => prev.filter(e => e.id !== id))
    }, 2000)

    // Cooldown
    cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS)
  }, [cooldown, disabled, onSendEmote])

  // Cleanup
  useEffect(() => () => clearTimeout(cooldownTimer.current), [])

  if (disabled) return null

  return (
    <>
      {/* Floating emotes layer */}
      {floatingEmotes.map(fe => (
        <FloatingEmoji key={fe.id} emoji={fe.emoji} source={fe.source} senderName={senderName} />
      ))}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 900,
          width: 44, height: 44, borderRadius: '50%',
          background: cooldown
            ? 'rgba(100,100,100,0.5)'
            : 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          border: 'none', color: '#fff', fontSize: 20,
          cursor: cooldown ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 20px rgba(108,92,231,0.4)',
          transition: 'all 0.3s',
          transform: open ? 'rotate(45deg) scale(1.1)' : 'scale(1)',
          opacity: cooldown ? 0.5 : 1,
        }}
      >
        {cooldown ? '⏳' : '💬'}
      </button>

      {/* Cooldown progress ring */}
      {cooldown && (
        <div style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 899,
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#A29BFE',
          animation: 'emoteSpinCooldown 3s linear forwards',
          pointerEvents: 'none',
        }} />
      )}

      {/* Emote picker panel */}
      {open && !cooldown && (
        <div style={{
          position: 'fixed', bottom: 130, right: 16, zIndex: 901,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          background: 'rgba(15,15,35,0.95)', backdropFilter: 'blur(12px)',
          border: '2px solid rgba(108,92,231,0.4)',
          borderRadius: 20, padding: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          animation: 'emotePopIn 0.25s ease',
        }}>
          {EMOTES.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendEmote(emoji)}
              style={{
                width: 48, height: 48, fontSize: 28,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.background = 'rgba(108,92,231,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 898, background: 'transparent' }}
        />
      )}

      <style>{`
        @keyframes emotePopIn {
          from { transform: scale(0.5) translateY(20px); opacity: 0 }
          to   { transform: scale(1) translateY(0); opacity: 1 }
        }
        @keyframes emoteSpinCooldown {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </>
  )
}

// ── Floating Emoji Animation ──────────────────────────────────────────────────
function FloatingEmoji({ emoji, source, senderName }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return

    const isOpp = source === 'opp'

    gsap.fromTo(ref.current,
      { y: 0, scale: 0.3, opacity: 0 },
      {
        y: -120, scale: 1.3, opacity: 1, duration: 0.4, ease: 'back.out(2)',
        onComplete: () => {
          gsap.to(ref.current, {
            y: -200, opacity: 0, scale: 0.8, duration: 1.2, ease: 'power2.in'
          })
        }
      }
    )
  }, [source])

  const isOpp = source === 'opp'

  return (
    <div ref={ref} style={{
      position: 'fixed',
      bottom: isOpp ? 'auto' : 140,
      top: isOpp ? 60 : 'auto',
      left: isOpp ? 20 : 'auto',
      right: isOpp ? 'auto' : 20,
      zIndex: 950,
      textAlign: 'center',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
    }}>
      <div style={{ fontSize: 48 }}>{emoji}</div>
      {isOpp && (
        <div style={{
          fontSize: 10, fontWeight: 800, color: '#FF6B6B',
          background: 'rgba(0,0,0,0.6)', borderRadius: 8,
          padding: '2px 8px', marginTop: 4,
          whiteSpace: 'nowrap',
        }}>
          {senderName}
        </div>
      )}
    </div>
  )
}
