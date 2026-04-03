import { useState, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function LoginModal({ onDone }) {
  const { darkMode } = useSettings()
  const { loginWithGoogle, continueAsGuest, setDisplayName, isLoggedIn, isGuest, needsName, error } = useAuth()
  // Steps: 'choose' → 'name'
  // After Google login or guest selection, always go to 'name' step
  const [step, setStep] = useState('choose')
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const tc = useThemeColors()
  const dark = tc.dark
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  // If already logged in but needs name (e.g. redirect flow), go straight to name step
  useEffect(() => {
    if ((isLoggedIn || isGuest) && needsName && step === 'choose') {
      setStep('name')
    }
  }, [isLoggedIn, isGuest, needsName, step])

  const handleGoogle = async () => {
    setLoginLoading(true)
    const success = await loginWithGoogle()
    setLoginLoading(false)
    if (success) {
      setStep('name')
    }
  }

  const handleGuestSelect = () => {
    // Mark as guest first, then go to name step
    // We'll finalize with continueAsGuest when they submit name
    setStep('name')
  }

  const handleNameSubmit = () => {
    const clean = nameInput.trim()
    if (clean.length < 2) { setNameError('Minimal 2 karakter ya!'); return }
    if (clean.length > 20) { setNameError('Maksimal 20 karakter!'); return }

    if (isLoggedIn) {
      // Google user — just set display name
      setDisplayName(clean)
    } else {
      // Guest — set as guest with name
      continueAsGuest(clean)
    }
    onDone(clean)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, animation:'lm-fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes lm-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes lm-popIn { from{transform:scale(0.85) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes lm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .lm-google-btn {
          width:100%; padding:14px; border-radius:16px;
          background:#fff; color:#333; border:2px solid #ddd;
          font-size:15px; font-weight:800; cursor:pointer;
          font-family:'Nunito',sans-serif;
          display:flex; align-items:center; justify-content:center; gap:10px;
          transition:all 0.2s; box-shadow:0 2px 8px rgba(0,0,0,0.08);
        }
        .lm-google-btn:hover { border-color:#4285F4; box-shadow:0 4px 16px rgba(66,133,244,0.2); transform:translateY(-1px); }
        .lm-google-btn:active { transform:scale(0.98); }
        .lm-google-btn:disabled { opacity:0.5; cursor:default; transform:none; }
        .lm-divider {
          display:flex; align-items:center; gap:12px; margin:18px 0;
          color:${tc.textMuted}; font-size:12px; font-weight:700;
        }
        .lm-divider::before, .lm-divider::after {
          content:''; flex:1; height:1px; background:${borderCol};
        }
      `}</style>

      <div style={{
        background:surface, borderRadius:28, padding:'36px 28px',
        maxWidth:400, width:'100%', textAlign:'center',
        boxShadow:'0 24px 60px rgba(0,0,0,0.3)',
        border:`2px solid ${dark ? 'rgba(162,155,254,0.3)' : 'rgba(162,155,254,0.2)'}`,
        animation:'lm-popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ─── Step 1: Choose login method ─── */}
        {step === 'choose' && (
          <>
            <div style={{ fontSize:64, marginBottom:12, animation:'lm-float 3s ease-in-out infinite' }}>🎮</div>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:textMain, marginBottom:6, lineHeight:1.2 }}>
              Selamat Datang!
            </h2>
            <p style={{ fontSize:14, color:tc.textMuted, marginBottom:24, lineHeight:1.6 }}>
              Login untuk simpan skor di semua device dan tampil di leaderboard global!
            </p>

            {/* Google Sign In */}
            <button className="lm-google-btn" onClick={handleGoogle} disabled={loginLoading}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loginLoading ? 'Menghubungkan...' : 'Login dengan Google'}
            </button>

            {error && (
              <div style={{ fontSize:12, color:'#FF6B6B', fontWeight:700, marginTop:10 }}>{error}</div>
            )}

            <div className="lm-divider">atau</div>

            <button onClick={handleGuestSelect} style={{
              width:'100%', padding:'12px', background:'transparent',
              color:tc.textMuted, border:`2px solid ${borderCol}`,
              borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer',
              transition:'all 0.2s', fontFamily:"'Nunito',sans-serif",
            }}
              onMouseEnter={e => { e.target.style.borderColor = '#A29BFE'; e.target.style.color = '#A29BFE' }}
              onMouseLeave={e => { e.target.style.borderColor = borderCol; e.target.style.color = textMuted }}
            >
              Main sebagai Tamu
            </button>

            {/* Benefits */}
            <div style={{ marginTop:20, textAlign:'left', padding:'0 8px' }}>
              <div style={{ fontSize:11, fontWeight:800, color:tc.textMuted, letterSpacing:'0.5px', marginBottom:8 }}>
                KEUNTUNGAN LOGIN
              </div>
              {[
                { icon:'☁️', text:'Skor tersimpan di cloud — aman!' },
                { icon:'📱', text:'Sync antar device (HP ↔ PC)' },
                { icon:'🏆', text:'Foto profil di leaderboard global' },
                { icon:'🔒', text:'Skor terikat akun, bukan device' },
              ].map((b, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:tc.textMuted, lineHeight:1.8 }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize:11, color:tc.textMuted, marginTop:18, lineHeight:1.5, opacity:0.7 }}>
              🔒 Data kamu aman. BrainPlay hanya menyimpan nama, foto, dan skor game.
            </p>
          </>
        )}

        {/* ─── Step 2: Set player name ─── */}
        {step === 'name' && (
          <>
            <div style={{ fontSize:48, marginBottom:12 }}>✏️</div>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:textMain, marginBottom:6, lineHeight:1.2 }}>
              Pilih Nama Pemain
            </h2>
            <p style={{ fontSize:13, color:tc.textMuted, marginBottom:6, lineHeight:1.6 }}>
              Nama ini yang tampil di leaderboard dan ingame.
            </p>

            {isLoggedIn && (
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6,
                background: dark ? 'rgba(78,205,196,0.08)' : 'rgba(78,205,196,0.06)',
                border:'1px solid rgba(78,205,196,0.3)', borderRadius:100,
                padding:'4px 14px', marginBottom:16, fontSize:11, color:'#4ECDC4', fontWeight:700,
              }}>
                🟢 Login Google berhasil
              </div>
            )}

            {!isLoggedIn && (
              <p style={{ fontSize:11, color:'#FDCB6E', marginBottom:16 }}>
                Mode tamu — skor hanya tersimpan di device ini
              </p>
            )}

            {/* Name input */}
            <div style={{ position:'relative', marginBottom:8 }}>
              <input
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value.slice(0, 20)); setNameError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Nama pemain kamu..."
                autoFocus
                style={{
                  width:'100%', padding:'14px 60px 14px 18px', borderRadius:16,
                  border:`2px solid ${nameError ? '#FF6B6B' : borderCol}`,
                  background:tc.bg,
                  color:textMain, fontSize:16, fontWeight:700,
                  fontFamily:"'Nunito',sans-serif", outline:'none',
                  transition:'border-color 0.2s', boxSizing:'border-box',
                }}
                onFocus={(e) => { if (!nameError) e.target.style.borderColor = '#A29BFE' }}
                onBlur={(e) => { if (!nameError) e.target.style.borderColor = borderCol }}
              />
              <div style={{
                position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                fontSize:11, color:tc.textMuted, fontWeight:600,
              }}>
                {nameInput.length}/20
              </div>
            </div>

            {nameError && (
              <div style={{ fontSize:12, color:'#FF6B6B', fontWeight:700, marginBottom:8 }}>{nameError}</div>
            )}

            <button
              onClick={handleNameSubmit}
              disabled={nameInput.trim().length < 2}
              style={{
                width:'100%', padding:'14px', marginTop:8,
                background: nameInput.trim().length >= 2
                  ? 'linear-gradient(135deg,#A29BFE,#6C5CE7)'
                  : (dark ? '#1e2a4a' : '#eee'),
                color: nameInput.trim().length >= 2 ? '#fff' : tc.textMuted,
                border:'none', borderRadius:16, fontSize:16, fontWeight:800,
                fontFamily:"'Fredoka One',cursive",
                cursor: nameInput.trim().length >= 2 ? 'pointer' : 'default',
                boxShadow: nameInput.trim().length >= 2 ? '0 6px 20px rgba(162,155,254,0.4)' : 'none',
                transition:'all 0.2s',
              }}
            >
              🚀 Mulai Bermain!
            </button>

            {/* Back button (only if not already logged in via redirect) */}
            {!isLoggedIn && (
              <button onClick={() => setStep('choose')} style={{
                marginTop:10, background:'transparent', border:'none',
                color:tc.textMuted, fontSize:13, cursor:'pointer', fontWeight:600,
              }}>
                ← Kembali
              </button>
            )}

            <p style={{ fontSize:11, color:tc.textMuted, marginTop:14, lineHeight:1.5, opacity:0.7 }}>
              💡 Nama bisa diganti nanti di halaman Leaderboard
            </p>
          </>
        )}
      </div>
    </div>
  )
}
