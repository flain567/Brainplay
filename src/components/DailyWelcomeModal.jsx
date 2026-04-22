import React, { useEffect, useRef } from 'react'
import { useDailyChallenge } from '../context/DailyChallengeContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'

export default function DailyWelcomeModal({ onClose }) {
  const { challenges, claimWelcomeBonus } = useDailyChallenge()
  const { earnCoins } = useCoins()
  const { play } = useSound()
  const tc = useThemeColors()
  
  const overlayRef = useRef()
  const modalRef = useRef()
  const LOGIN_BONUS = 20

  useEffect(() => {
    play('levelUp')
    
    // Animate In
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
    gsap.fromTo(modalRef.current, 
      { opacity: 0, scale: 0.8, y: 50 }, 
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }
    )
  }, [play])

  const handleAccept = () => {
    play('click')
    // Claim the bonus and dismiss
    if (claimWelcomeBonus()) {
      earnCoins(LOGIN_BONUS, 'Hadiah Login Harian')
    }
    
    gsap.to(modalRef.current, { opacity: 0, scale: 0.9, y: 20, duration: 0.2 })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, delay: 0.1, onComplete: onClose })
  }

  const dark = tc.dark

  return (
    <>
      <style>{`
        .dwm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .dwm-modal {
          background: ${tc.surface}; width: 100%; max-width: 420px;
          border-radius: 28px; border: 2px solid rgba(82, 30, 148, 0.4);
          position: relative; overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(124, 111, 232, 0.2);
          padding: 32px 24px 24px; text-align: center;
        }
        .dwm-ray {
          position: absolute; top: -50%; left: -50%; right: -50%; bottom: 50%;
          background: radial-gradient(circle, rgba(124, 111, 232, 0.3) 0%, transparent 60%);
          animation: dwmSpin 10s linear infinite; pointer-events: none; z-index: 0;
        }
        @keyframes dwmSpin {
          100% { transform: rotate(360deg); }
        }
        .dwm-content { position: relative; z-index: 1; }
        .dwm-list {
          margin: 20px 0; display: flex; flexDirection: column; gap: 8px;
          text-align: left;
        }
        .dwm-item {
          background: ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
          padding: 12px 14px; border-radius: 14px; border: 1px solid ${tc.borderCol};
          display: flex; align-items: center; gap: 12px;
        }
      `}</style>
      
      <div className="dwm-overlay" ref={overlayRef}>
        <div className="dwm-modal" ref={modalRef}>
          <div className="dwm-ray" />
          <div className="dwm-content">
            
            <div style={{ fontSize: 56, marginBottom: 12, textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>🌤️</div>
            
            <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, margin: '0 0 4px', color: tc.textMain }}>
              Selamat Datang Kembali!
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: tc.textMuted, fontWeight: 600 }}>
              Ini misi harianmu — selesaikan untuk koin ekstra!
            </p>
            
            <div className="dwm-list">
              {challenges.map((ch, i) => (
                <div key={i} className="dwm-item">
                  <div style={{ fontSize: 22 }}>{ch.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: tc.textMain }}>{ch.desc}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: tc.textMuted }}>Target: {ch.target}x</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#FDCB6E', fontFamily: "'Fredoka One',cursive" }}>
                    {ch.reward} 🪙
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, rgba(253,203,110,0.15), rgba(253,203,110,0.05))',
              border: '1.5px dashed rgba(253,203,110,0.5)',
              padding: 14, borderRadius: 16, marginBottom: 20
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#FDCB6E', textTransform: 'uppercase' }}>HADIAH LOGIN:</span>
              <div style={{ fontSize: 20, fontFamily: "'Fredoka One',cursive", color: '#FFD700', marginTop: 4 }}>+{LOGIN_BONUS} Koin 🪙</div>
            </div>

            <button
              onClick={handleAccept}
              style={{
                width: '100%', padding: 16, borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                color: '#fff', fontFamily: "'Fredoka One',cursive", fontSize: 16,
                boxShadow: '0 8px 20px rgba(108,92,231,0.4)', cursor: 'pointer',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Terima Tantangan & Klaim!
            </button>
            
          </div>
        </div>
      </div>
    </>
  )
}
