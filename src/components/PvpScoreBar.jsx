import { useThemeColors } from '../hooks/useThemeColors.js'

/**
 * PvpScoreBar - Floating bar showing opponent info during PvP matches
 * 
 * Props:
 *  - opponentProfile: { displayName, photoURL }
 *  - opponentScore: number
 *  - opponentExtra: string (optional, e.g. "Lv.5" or "12 moves")
 *  - opponentFinished: boolean
 *  - myScore: number
 *  - onQuit: function
 */
export default function PvpScoreBar({ opponentProfile, opponentScore = 0, opponentExtra, opponentFinished, myScore = 0, onQuit }) {
  const tc = useThemeColors()
  const dark = tc.dark
  const name = opponentProfile?.displayName || 'Lawan'
  const photo = opponentProfile?.photoURL

  const winning = myScore > opponentScore
  const tied = myScore === opponentScore

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', margin: '0 12px 8px',
      background: dark ? 'rgba(108,92,231,0.12)' : 'rgba(108,92,231,0.06)',
      border: `2px solid ${dark ? 'rgba(108,92,231,0.3)' : 'rgba(108,92,231,0.15)'}`,
      borderRadius: 14, gap: 8
    }}>
      {/* Opponent info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: 'rgba(108,92,231,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {photo
            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 14 }}>👤</span>
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#6C5CE7',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100
          }}>
            {name}
          </div>
          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 14, color: '#FF6B6B' }}>
            {opponentScore.toLocaleString()}
            {opponentExtra && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4 }}>{opponentExtra}</span>}
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        {opponentFinished ? (
          <div style={{
            fontSize: 10, fontWeight: 800, color: '#FF6B6B',
            background: 'rgba(255,107,107,0.15)', padding: '4px 10px', borderRadius: 8,
            animation: 'pvpPulse 1s ease infinite alternate'
          }}>
            SELESAI!
          </div>
        ) : (
          <div style={{ fontSize: 18 }}>⚔️</div>
        )}
      </div>

      {/* My score */}
      <div style={{ textAlign: 'right', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: tc.muted || '#888' }}>SKOR KAMU</div>
        <div style={{
          fontFamily: "'Fredoka One',cursive", fontSize: 14,
          color: winning ? '#00B894' : tied ? (tc.text || '#333') : '#FF6B6B'
        }}>
          {myScore.toLocaleString()}
        </div>
      </div>

      {/* Quit button */}
      {onQuit && (
        <button
          onClick={onQuit}
          style={{
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: 'rgba(255,107,107,0.15)', color: '#FF6B6B',
            fontSize: 12, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          ✕
        </button>
      )}

      <style>{`
        @keyframes pvpPulse { from { opacity: 0.7 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
