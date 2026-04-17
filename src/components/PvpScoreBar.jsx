import { useEffect, useRef, useState } from 'react'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

/**
 * PvpScoreBar - Enhanced floating bar for PvP matches
 * Props:
 *  - opponentProfile: { displayName, photoURL }
 *  - opponentScore: number
 *  - opponentProgress: number (0-100)
 *  - opponentExtra: string
 *  - opponentFinished: boolean
 *  - myScore: number
 *  - myProgress: number (0-100)
 *  - opponentEmote: { emoji, ts }
 *  - myEmote: { emoji, ts }
 *  - onQuit: function
 */
export default function PvpScoreBar({ 
  opponentProfile, opponentScore = 0, opponentProgress = 0, opponentExtra, opponentFinished, 
  myScore = 0, myProgress = 0, opponentEmote, myEmote, onQuit 
}) {
  const tc = useThemeColors()
  const dark = tc.dark
  const name = opponentProfile?.displayName || 'Lawan'
  const photo = opponentProfile?.photoURL

  const oppScoreRef = useRef(null)
  const myScoreRef = useRef(null)
  const lastOppScore = useRef(opponentScore)
  const lastMyScore = useRef(myScore)

  // Pulse effect when score changes
  useEffect(() => {
    if (opponentScore > lastOppScore.current) {
      gsap.fromTo(oppScoreRef.current, { scale: 1.4, color: '#FF6B6B' }, { scale: 1, color: '#FF6B6B', duration: 0.4, ease: 'back.out(2)' })
    }
    lastOppScore.current = opponentScore
  }, [opponentScore])

  useEffect(() => {
    if (myScore > lastMyScore.current) {
      gsap.fromTo(myScoreRef.current, { scale: 1.4, color: '#00B894' }, { scale: 1, color: '#00B894', duration: 0.4, ease: 'back.out(2)' })
    }
    lastMyScore.current = myScore
  }, [myScore])

  const winning = myScore > opponentScore
  const tied = myScore === opponentScore

  return (
    <div style={{
      margin: '0 12px 12px',
      position: 'relative',
      zIndex: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: dark ? 'rgba(15,15,35,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        border: `2px solid ${dark ? 'rgba(108,92,231,0.4)' : 'rgba(108,92,231,0.2)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        borderRadius: 20, gap: 12
      }}>
        {/* Opponent Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
              background: '#FF6B6B22', border: `2px solid ${opponentFinished ? '#FF6B6B' : 'transparent'}`,
              transition: 'all 0.3s'
            }}>
              {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 20, textAlign: 'center', lineHeight: '36px' }}>👤</div>}
            </div>
            {/* Opponent emote bubble */}
            <EmoteBubble emote={opponentEmote} side="left" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#FF6B6B', letterSpacing: 0.5, marginBottom: 1 }}>{name.toUpperCase()}</div>
            <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${opponentProgress}%`, background: '#FF6B6B', transition: 'width 0.4s ease' }} />
            </div>
            <div ref={oppScoreRef} style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: '#FF6B6B', lineHeight: 1 }}>
              {opponentScore.toLocaleString()}
              {opponentExtra && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>{opponentExtra}</span>}
            </div>
          </div>
        </div>

        {/* VS Center */}
        <div style={{ textAlign: 'center', width: 40, flexShrink: 0, position: 'relative' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: tc.textMuted, opacity: 0.5, marginBottom: -2 }}>VS</div>
          {opponentFinished ? (
            <div style={{ fontSize: 10, fontWeight: 800, color: '#FF6B6B', animation: 'pvpPulse 0.4s infinite alternate' }}>DONE!</div>
          ) : (
            <div style={{ fontSize: 20, filter: 'drop-shadow(0 0 5px rgba(108,92,231,0.5))' }}>⚔️</div>
          )}
        </div>

        {/* My Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, flexDirection: 'row-reverse', textAlign: 'right' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
              background: '#00B89422', border: `2px solid ${winning ? '#00B894' : 'transparent'}`,
              transition: 'all 0.3s'
            }}>
              <div style={{ fontSize: 20, textAlign: 'center', lineHeight: '36px' }}>👤</div>
            </div>
            {/* My emote bubble */}
            <EmoteBubble emote={myEmote} side="right" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#00B894', letterSpacing: 0.5, marginBottom: 1 }}>KAMU</div>
            <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${myProgress}%`, background: '#00B894', transition: 'width 0.4s ease', float: 'right' }} />
            </div>
            <div ref={myScoreRef} style={{ 
              fontFamily: "'Fredoka One',cursive", fontSize: 16, 
              color: winning ? '#00B894' : tied ? tc.textMain : '#FF6B6B',
              lineHeight: 1
            }}>
              {myScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Exit */}
        {onQuit && (
          <button onClick={onQuit} style={{
            width: 24, height: 24, borderRadius: 8, border: 'none', background: 'rgba(255,107,107,0.1)',
            color: '#FF6B6B', fontSize: 10, cursor: 'pointer', marginLeft: 4
          }}>✕</button>
        )}
      </div>

      <style>{`
        @keyframes pvpPulse { from { transform: scale(0.9); opacity: 0.7 } to { transform: scale(1); opacity: 1 } }
        @keyframes emoteBubblePop { 
          0% { transform: scale(0); opacity: 0 } 
          50% { transform: scale(1.3); opacity: 1 } 
          100% { transform: scale(1); opacity: 1 }
        }
        @keyframes emoteBubbleFade { 
          from { opacity: 1; transform: translateY(0) } 
          to { opacity: 0; transform: translateY(-10px) }
        }
      `}</style>
    </div>
  )
}

/** Small speech-bubble that pops near an avatar when an emote comes in */
function EmoteBubble({ emote, side }) {
  const [visible, setVisible] = useState(false)
  const [currentEmoji, setCurrentEmoji] = useState('')
  const lastTs = useRef(0)

  useEffect(() => {
    if (!emote?.emoji || !emote?.ts) return
    if (emote.ts <= lastTs.current) return
    lastTs.current = emote.ts

    setCurrentEmoji(emote.emoji)
    setVisible(true)

    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [emote?.emoji, emote?.ts])

  if (!visible || !currentEmoji) return null

  return (
    <div style={{
      position: 'absolute',
      top: -28, 
      [side === 'left' ? 'left' : 'right']: -4,
      background: 'rgba(0,0,0,0.75)', 
      borderRadius: 12,
      padding: '2px 6px',
      fontSize: 22,
      animation: 'emoteBubblePop 0.35s ease, emoteBubbleFade 0.5s ease 1.7s forwards',
      pointerEvents: 'none',
      zIndex: 20,
      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
    }}>
      {currentEmoji}
    </div>
  )
}

