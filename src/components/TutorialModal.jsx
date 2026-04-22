import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSound } from '../hooks/useSound.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function TutorialModal({ steps, onClose, color = '#A29BFE', storageKey }) {
  const [page, setPage]   = useState(0)
  const { play }          = useSound()
  const { darkMode }      = useSettings()
  const tc = useThemeColors()
  const firedRef          = useRef(false)

  const step    = steps[page]
  const isLast  = page === steps.length - 1
  const dark    = tc.dark

  const bg      = tc.surface
  const textMain  = tc.textMain
  const textMuted = tc.textMuted

  // Debounce to prevent double fire from onClick + onTouchEnd
  const fire = (fn) => {
    if (firedRef.current) return
    firedRef.current = true
    fn()
    setTimeout(() => { firedRef.current = false }, 300)
  }

  const dismiss = () => {
    if (storageKey) try { localStorage.setItem(storageKey, '1') } catch(e) {}
    onClose()
  }

  const next = () => fire(() => {
    play('click')
    if (isLast) { dismiss(); return }
    setPage(p => p + 1)
  })

  const prev = () => fire(() => { play('click'); setPage(p => p - 1) })

  const skip = () => fire(() => { play('click'); dismiss() })

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 20px', animation:'fadeInTut 0.3s ease', overflow:'auto' }}>
      <div style={{ background:bg, borderRadius:28, padding:'28px 24px', maxWidth:360, width:'100%', maxHeight:'calc(100vh - 32px)', overflowY:'auto', boxShadow:`0 24px 80px ${color}33`, border:`2px solid ${color}33`, animation:'popInTut 0.4s cubic-bezier(0.34,1.56,0.64,1)', margin:'auto' }}>

        {/* Step dots */}
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:16 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i===page?20:7, height:7, borderRadius:100, background: i===page?color:'rgba(0,0,0,0.12)', transition:'all 0.25s ease' }} />
          ))}
        </div>

        {/* Emoji */}
        <div style={{ fontSize:52, textAlign:'center', marginBottom:12, lineHeight:1, animation:'bounceTut 0.5s ease' }}>
          {step.emoji}
        </div>

        {/* Title */}
        <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:textMain, textAlign:'center', marginBottom:8 }}>
          {step.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize:14, color:textMuted, textAlign:'center', lineHeight:1.6, marginBottom:20 }}>
          {step.desc}
        </p>

        {/* Tip box */}
        {step.tip && (
          <div style={{ background:`${color}12`, border:`1.5px solid ${color}33`, borderRadius:14, padding:'10px 14px', marginBottom:20, fontSize:13, color:textMuted, lineHeight:1.5 }}>
            💡 {step.tip}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:'flex', gap:10 }}>
          {page > 0 && (
            <button onClick={prev} onTouchEnd={prev} style={{ flex:1, background:'transparent', border:`2px solid ${color}44`, borderRadius:100, padding:'12px', fontSize:14, fontWeight:800, color:textMuted, cursor:'pointer', fontFamily:"'Fredoka One',cursive", WebkitTapHighlightColor:'transparent' }}>
              ← Kembali
            </button>
          )}
          <button onClick={next} onTouchEnd={next} style={{ flex:2, background:`linear-gradient(135deg,${color},${color}bb)`, border:'none', borderRadius:100, padding:'13px', fontSize:16, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:"'Fredoka One',cursive", boxShadow:`0 6px 20px ${color}44`, WebkitTapHighlightColor:'transparent' }}>
            {isLast ? '▶ Mulai Main!' : 'Lanjut →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <div onClick={skip} onTouchEnd={skip} style={{ textAlign:'center', marginTop:12, fontSize:12, color:textMuted, cursor:'pointer', opacity:0.6, WebkitTapHighlightColor:'transparent', padding:'8px' }}>
            Lewati tutorial
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInTut { from{opacity:0} to{opacity:1} }
        @keyframes popInTut  { from{transform:scale(0.75);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes bounceTut { 0%{transform:scale(0.5)} 70%{transform:scale(1.15)} 100%{transform:scale(1)} }
      `}</style>
    </div>,
    document.body
  )
}
