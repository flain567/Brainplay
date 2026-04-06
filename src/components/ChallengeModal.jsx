import { useState } from 'react'
import { useMatch, PVP_GAMES } from '../context/MatchContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { auth } from '../firebase.js'

export default function ChallengeModal({ friend, friendProfile, onClose }) {
  const { createMatch, loading } = useMatch()
  const { play } = useSound()
  const tc = useThemeColors()
  const [selected, setSelected] = useState(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const user = auth.currentUser
  const friendName = friendProfile?.displayName || friend?.displayName || 'Teman'

  const handleChallenge = async () => {
    if (!selected || !user) return
    play('click')

    const hostProfile = {
      displayName: user.displayName || 'Pemain',
      photoURL: user.photoURL || ''
    }
    const guestProfile = {
      displayName: friendName,
      photoURL: friendProfile?.photoURL || friend?.photoURL || ''
    }

    const res = await createMatch(friend.uid, selected, hostProfile, guestProfile)
    if (res.success) {
      play('level_up')
      setSent(true)
      setTimeout(() => onClose(), 2000)
    } else {
      setError(res.error || 'Gagal mengirim tantangan')
    }
  }

  const dark = tc.dark
  const surface = dark ? '#1a1a2e' : '#fff'
  const textMain = dark ? '#f0f0f0' : '#1a1a2e'
  const textMuted = dark ? '#888' : '#999'
  const border = dark ? '#333' : '#e0e0e0'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'cmFadeIn 0.25s ease'
    }} onClick={onClose}>
      <div style={{
        background: surface, borderRadius: 24, padding: 28,
        maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        border: `2px solid ${border}`, animation: 'cmSlideUp 0.3s ease'
      }} onClick={e => e.stopPropagation()}>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⚔️</div>
            <h2 style={{ fontFamily: "'Fredoka One',cursive", color: '#4ECDC4', fontSize: 22, margin: '0 0 8px' }}>
              Tantangan Terkirim!
            </h2>
            <p style={{ color: textMuted, fontSize: 14 }}>
              Menunggu {friendName} menerima...
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
              <h2 style={{ fontFamily: "'Fredoka One',cursive", color: textMain, fontSize: 20, margin: '0 0 4px' }}>
                Tantang {friendName}
              </h2>
              <p style={{ color: textMuted, fontSize: 13, margin: 0 }}>Pilih game untuk duel PvP!</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {PVP_GAMES.map(g => {
                const isActive = selected === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => { play('click'); setSelected(g.id) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 16,
                      background: isActive
                        ? (dark ? 'rgba(108,92,231,0.2)' : 'rgba(108,92,231,0.08)')
                        : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      border: isActive ? '2px solid #6C5CE7' : `2px solid ${border}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                      textAlign: 'left', fontFamily: "'Nunito',sans-serif",
                    }}
                  >
                    <div style={{ fontSize: 32, flexShrink: 0 }}>{g.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "'Fredoka One',cursive", fontSize: 15,
                        color: isActive ? '#6C5CE7' : textMain
                      }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{g.desc}</div>
                    </div>
                    {isActive && <div style={{ fontSize: 20, color: '#6C5CE7' }}>✓</div>}
                  </button>
                )
              })}
            </div>

            {error && (
              <div style={{
                color: '#FF6B6B', fontSize: 13, fontWeight: 700, textAlign: 'center',
                padding: 10, background: 'rgba(255,107,107,0.1)', borderRadius: 10, marginBottom: 12
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: textMuted, border: 'none', fontFamily: "'Fredoka One',cursive",
                  fontSize: 14, cursor: 'pointer'
                }}
              >
                BATAL
              </button>
              <button
                onClick={handleChallenge}
                disabled={!selected || loading}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: 12,
                  background: selected ? 'linear-gradient(135deg,#6C5CE7,#A29BFE)' : border,
                  color: '#fff', border: 'none', fontFamily: "'Fredoka One',cursive",
                  fontSize: 14, cursor: selected ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '⏳ MENGIRIM...' : '⚔️ TANTANG!'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes cmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes cmSlideUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}
