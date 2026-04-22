import { useState } from 'react'
import { createPortal } from 'react-dom'
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
      play('levelUp')
      setSent(true)
      setTimeout(() => onClose(), 2000)
    } else {
      setError(res.error || 'Gagal mengirim tantangan')
    }
  }

  const dark = tc.dark
  const bg = dark ? tc.surface : '#fff'
  const textMain = tc.textMain
  const textMuted = tc.textMuted

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, animation: 'cmFadeIn 0.3s ease'
    }} onClick={onClose}>
      
      {/* Glow Behind Modal */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 300, height: 300, background: 'radial-gradient(circle, rgba(255, 107, 107, 0.3) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)', zIndex: -1, pointerEvents: 'none',
        animation: 'cmPulse 2s ease-in-out infinite alternate'
      }} />

      <div style={{
        background: bg, borderRadius: 28, padding: 32,
        maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        border: dark ? '2px solid rgba(255,107,107,0.3)' : '2px solid rgba(255,107,107,0.8)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,107,0.2)',
        animation: 'cmScaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }} onClick={e => e.stopPropagation()}>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 72, marginBottom: 12, animation: 'cmVS 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>⚔️</div>
            <h2 style={{ fontFamily: "'Fredoka One',cursive", color: '#FF6B6B', fontSize: 24, margin: '0 0 8px' }}>
              Surat Tantangan Terkirim!
            </h2>
            <p style={{ color: textMuted, fontSize: 14 }}>
              Menunggu <strong>{friendName}</strong> menerima duel ini...
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 4, animation: 'cmVS 1s infinite alternate' }}>⚔️</div>
              <h2 style={{ fontFamily: "'Fredoka One',cursive", color: textMain, fontSize: 22, margin: '0 0 4px', textTransform: 'uppercase' }}>
                Duel Melawan {friendName}
              </h2>
              <p style={{ color: textMuted, fontSize: 13, margin: 0, fontWeight: 600 }}>Pilih arena kombat favoritmu!</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {PVP_GAMES.map(g => {
                const isActive = selected === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => { play('click'); setSelected(g.id) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '16px 20px', borderRadius: 20,
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(253,121,168,0.05))'
                        : (dark ? 'rgba(255,255,255,0.03)' : '#f7f7f7'),
                      border: isActive ? '2px solid #FF6B6B' : `2px solid ${dark ? '#333' : '#e0e0e0'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      textAlign: 'left', fontFamily: "'Nunito',sans-serif",
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isActive ? '0 8px 20px rgba(255,107,107,0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: 36, flexShrink: 0, filter: isActive ? 'drop-shadow(0 4px 10px rgba(255,107,107,0.3))' : 'none', transition: 'all 0.3s' }}>
                      {g.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "'Fredoka One',cursive", fontSize: 16,
                        color: isActive ? '#FF6B6B' : textMain, transition: 'color 0.2s'
                      }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: 12, color: isActive ? 'rgba(255,107,107,0.8)' : textMuted, marginTop: 4, fontWeight: isActive ? 700 : 600 }}>{g.desc}</div>
                    </div>
                    {isActive && (
                      <div style={{ fontSize: 24, color: '#FF6B6B', animation: 'cmPop 0.3s ease' }}>🔥</div>
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <div style={{
                color: '#FF6B6B', fontSize: 13, fontWeight: 800, textAlign: 'center',
                padding: '12px 16px', background: 'rgba(255,107,107,0.15)', borderRadius: 12, marginBottom: 16,
                border: '1px dashed rgba(255,107,107,0.4)', animation: 'cmShake 0.3s ease'
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 16,
                  background: dark ? 'rgba(255,255,255,0.06)' : '#eee',
                  color: textMuted, border: 'none', fontFamily: "'Fredoka One',cursive",
                  fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                MUNDUR
              </button>
              <button
                onClick={handleChallenge}
                disabled={!selected || loading}
                style={{
                  flex: 2, padding: '14px 0', borderRadius: 16,
                  background: selected ? 'linear-gradient(135deg, #FF6B6B, #FD79A8)' : (dark ? '#333' : '#ccc'),
                  color: '#fff', border: 'none', fontFamily: "'Fredoka One',cursive",
                  fontSize: 15, cursor: selected ? 'pointer' : 'not-allowed',
                  opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
                  boxShadow: selected ? '0 8px 24px rgba(255,107,107,0.4)' : 'none',
                  textTransform: 'uppercase'
                }}
              >
                {loading ? '⏳ MENGIRIM...' : '⚔️ SERANG SEKARANG!'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes cmFadeIn { from { opacity:0; backdrop-filter:blur(0px); } to { opacity:1; backdrop-filter:blur(8px); } }
        @keyframes cmScaleUp { from { opacity:0; transform:scale(0.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes cmPulse { from { transform: translate(-50%, -50%) scale(0.9); opacity:0.6; } to { transform: translate(-50%, -50%) scale(1.1); opacity:1; } }
        @keyframes cmVS { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
        @keyframes cmPop { 0% { transform: scale(0.5); opacity:0; } 100% { transform: scale(1); opacity:1; } }
        @keyframes cmShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>
    </div>,
    document.body
  )
}
