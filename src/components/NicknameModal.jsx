import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useLeaderboard } from '../context/LeaderboardContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function NicknameModal({ onDone }) {
  const { darkMode } = useSettings()
  const { setNickname } = useLeaderboard()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const tc = useThemeColors()
  const dark = tc.dark
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  const handleSubmit = () => {
    const clean = name.trim()
    if (clean.length < 2) { setError('Minimal 2 karakter ya!'); return }
    if (clean.length > 20) { setError('Maksimal 20 karakter!'); return }
    setNickname(clean)
    onDone(clean)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, animation:'nm-fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes nm-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes nm-popIn { from{transform:scale(0.85) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        @keyframes nm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div style={{
        background: surface, borderRadius:28, padding:'36px 28px',
        maxWidth:380, width:'100%', textAlign:'center',
        boxShadow:'0 24px 60px rgba(0,0,0,0.3)',
        border:`2px solid ${dark ? 'rgba(162,155,254,0.3)' : 'rgba(162,155,254,0.2)'}`,
        animation:'nm-popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Icon */}
        <div style={{ fontSize:64, marginBottom:12, animation:'nm-float 3s ease-in-out infinite' }}>🎮</div>

        {/* Title */}
        <h2 style={{
          fontFamily:"'Fredoka One',cursive", fontSize:26, color:textMain,
          marginBottom:6, lineHeight:1.2,
        }}>
          Selamat Datang!
        </h2>
        <p style={{ fontSize:14, color:textMuted, marginBottom:24, lineHeight:1.6 }}>
          Masukkan nama pemain kamu untuk leaderboard global. Nama ini akan terlihat oleh semua pemain!
        </p>

        {/* Input */}
        <div style={{ position:'relative', marginBottom:8 }}>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value.slice(0, 20)); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Nama pemain kamu..."
            autoFocus
            style={{
              width:'100%', padding:'14px 18px', borderRadius:16,
              border:`2px solid ${error ? '#FF6B6B' : borderCol}`,
              background: tc.bg,
              color: textMain, fontSize:16, fontWeight:700,
              fontFamily:"'Nunito',sans-serif", outline:'none',
              transition:'border-color 0.2s',
              boxSizing:'border-box',
            }}
            onFocus={(e) => { if (!error) e.target.style.borderColor = '#A29BFE' }}
            onBlur={(e) => { if (!error) e.target.style.borderColor = borderCol }}
          />
          <div style={{
            position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
            fontSize:11, color:textMuted, fontWeight:600,
          }}>
            {name.length}/20
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize:12, color:'#FF6B6B', fontWeight:700, marginBottom:8 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={name.trim().length < 2}
          style={{
            width:'100%', padding:'14px',
            background: name.trim().length >= 2
              ? 'linear-gradient(135deg,#A29BFE,#6C5CE7)'
              : (dark ? '#1e2a4a' : '#eee'),
            color: name.trim().length >= 2 ? '#fff' : textMuted,
            border:'none', borderRadius:16, fontSize:16, fontWeight:800,
            fontFamily:"'Fredoka One',cursive", cursor: name.trim().length >= 2 ? 'pointer' : 'default',
            boxShadow: name.trim().length >= 2 ? '0 6px 20px rgba(162,155,254,0.4)' : 'none',
            transition:'all 0.2s', marginTop:8,
          }}
        >
          🚀 Mulai Bermain!
        </button>

        {/* Hint */}
        <p style={{ fontSize:11, color:textMuted, marginTop:14, lineHeight:1.5 }}>
          💡 Nama bisa diganti nanti di halaman Leaderboard
        </p>
      </div>
    </div>
  )
}
