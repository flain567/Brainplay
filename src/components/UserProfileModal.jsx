import { useEffect, useState } from 'react'
import { LEVEL_TITLES, getBorderForLevel, CUSTOM_BORDERS } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSocial } from '../context/SocialContext.jsx'
import gsap from 'gsap'

export default function UserProfileModal({ uid, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const { getProfile } = useSocial()
  const tc = useThemeColors()
  const dark = tc.dark

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const data = await getProfile(uid)
      if (mounted) {
        setProfile(data)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [uid, getProfile])

  if (loading) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, animation: 'spin 1s linear infinite' }}>🌀</div>
        <div style={{ marginTop: 10, fontFamily: "'Fredoka One',cursive" }}>Mencari data pemain...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!profile) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
    }}>
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 60 }}>🕵️‍♂️</div>
        <div style={{ fontSize: 20, margin: '10px 0', fontFamily: "'Fredoka One',cursive" }}>Pemain tidak ditemukan</div>
        <button onClick={onClose} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', background: '#FF6B6B', color: '#fff', cursor: 'pointer'
        }}>Tutup</button>
      </div>
    </div>
  )

  const progress = profile.progress || {}
  const level = progress.level || 1
  const title = progress.selectedTitle || LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)]
  
  // Resolve border
  let borderData = getBorderForLevel(level)
  if (progress.selectedBorder && CUSTOM_BORDERS[progress.selectedBorder]) {
    borderData = CUSTOM_BORDERS[progress.selectedBorder]
  }

  return (
    <>
      <style>{`
        .upm-overlay {
          position: fixed; inset: 0; z-index: 10001;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
          display: flex; alignItems: center; justifyContent: center;
          padding: 20px; animation: upm-fade 0.3s ease;
        }
        @keyframes upm-fade { from { opacity: 0; } to { opacity: 1; } }
        
        .upm-card {
          width: 100%; maxWidth: 440px; background: ${tc.surface};
          border-radius: 32px; border: 2px solid ${borderData.color}44;
          padding: 40px 24px; position: relative; overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${borderData.color}22;
          animation: upm-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes upm-pop { from { transform: scale(0.8) translateY(20px); opacity: 0; } }

        .upm-glow {
          position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
          width: 200px; height: 100px; background: ${borderData.color};
          filter: blur(60px); opacity: 0.15; pointer-events: none;
        }

        .upm-avatar-container {
          width: 120px; height: 120px; margin: 0 auto 20px;
          position: relative;
        }
        .upm-avatar-inner {
          position: absolute; inset: 12px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 50px; background: ${borderData.bgColor || '#333'};
          overflow: hidden; z-index: 1;
        }
        .upm-border-overlay {
          position: absolute; inset: 0;
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 2; pointer-events: none;
        }
        .upm-border-legacy {
          position: absolute; inset: 10px;
          border-radius: 50%; border: ${borderData.border}; 
          box-shadow: ${borderData.boxShadow};
          animation: ${borderData.animation || 'none'};
          z-index: 2; pointer-events: none;
        }
        
        .upm-stat-pill {
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
          padding: 12px 20px; border-radius: 16px; flex: 1; text-align: center;
          border: 1px solid ${tc.borderCol};
        }
      `}</style>

      <div className="upm-overlay" onClick={onClose}>
        <div className="upm-card" onClick={e => e.stopPropagation()}>
          <div className="upm-glow" />

          <button onClick={onClose} style={{
            position: 'absolute', top: 20, right: 20, background: 'none', border: 'none',
            fontSize: 24, color: tc.textMuted, cursor: 'pointer'
          }}>✕</button>

          <div className="upm-avatar-container">
            <div className="upm-avatar-inner">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                '👤'
              )}
            </div>
            {borderData.url ? (
              <div 
                className="upm-border-overlay premium-border-glow"
                style={{ 
                  backgroundImage: `url(${borderData.url})`,
                  '--glow-color': borderData.glowColor || borderData.color || '#7C6FE8'
                }} 
              />
            ) : (
              <div 
                className="upm-border-legacy legacy-border-glow"
                style={{ 
                  '--glow-color': borderData.glowColor || borderData.color || '#7C6FE8',
                  border: borderData.border,
                  boxShadow: borderData.boxShadow
                }} 
              />
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <h2 style={{
              fontFamily: "'Fredoka One',cursive", fontSize: 28, margin: '0 0 4px 0', color: tc.textMain
            }}>
              {profile.displayName || 'Pemain Misterius'}
            </h2>
            <div style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 100,
              background: `linear-gradient(135deg, ${borderData.color}, ${tc.textMain}88)`,
              color: '#fff', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1
            }}>
              {title}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div className="upm-stat-pill">
              <div style={{ fontSize: 11, color: tc.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>LEVEL</div>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: borderData.color }}>{level}</div>
            </div>
            <div className="upm-stat-pill">
              <div style={{ fontSize: 11, color: tc.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>TOTAL XP</div>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: tc.textMain }}>{progress.totalXP || 0}</div>
            </div>
          </div>

          <div style={{
             background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
             padding: 20, borderRadius: 24, border: `1px dashed ${tc.borderCol}`
          }}>
            <div style={{ fontSize: 12, color: tc.textMuted, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>
              PENCAPAIAN TERBAIK
            </div>
            {Object.keys(progress.gameBests || {}).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(progress.gameBests).slice(0, 4).map(([gameId, score]) => (
                  <div key={gameId} style={{ fontSize: 13, color: tc.textMain, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.7 }}>{gameId.split('-').map(s => s[0].toUpperCase()+s.slice(1)).join(' ')}</span>
                    <span style={{ fontWeight: 800 }}>{score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: 13, color: tc.textMuted }}>Belum ada skor yang dicatat</div>
            )}
          </div>

          <button onClick={onClose} style={{
            width: '100%', padding: 16, marginTop: 30, borderRadius: 16, border: 'none',
            background: `linear-gradient(135deg, ${borderData.color}, ${borderData.color}aa)`,
            color: '#fff', fontFamily: "'Fredoka One',cursive", fontSize: 16, cursor: 'pointer',
            boxShadow: `0 8px 20px ${borderData.color}33`
          }}>
            TUTUP PROFIL
          </button>
        </div>
      </div>
    </>
  )
}
