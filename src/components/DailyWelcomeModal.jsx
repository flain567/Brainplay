import React, { useEffect, useState } from 'react'
import { useDailyChallenge } from '../context/DailyChallengeContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'

/**
 * DailyWelcomeModal
 * A defensive version with CSS animations to avoid GSAP-related stuck states.
 */
export default function DailyWelcomeModal({ onClose }) {
  const { challenges, claimWelcomeBonus, welcomeClaimed } = useDailyChallenge()
  const { earnCoins } = useCoins()
  const { play } = useSound()
  const tc = useThemeColors()
  
  const [isClosing, setIsClosing] = useState(false)
  const LOGIN_BONUS = 20

  useEffect(() => {
    console.log('[DailyWelcomeModal] Mounted. welcomeClaimed:', welcomeClaimed)
    play('levelUp')
  }, [play, welcomeClaimed])

  // If already claimed (state update from elsewhere), just close
  useEffect(() => {
    if (welcomeClaimed && !isClosing) {
      console.log('[DailyWelcomeModal] Detected welcomeClaimed=true, closing...')
      onClose()
    }
  }, [welcomeClaimed, onClose, isClosing])

  const handleAccept = () => {
    console.log('[DailyWelcomeModal] handleAccept clicked')
    play('click')
    
    // Claim the bonus
    const success = claimWelcomeBonus()
    console.log('[DailyWelcomeModal] claimWelcomeBonus success:', success)
    
    if (success) {
      earnCoins(LOGIN_BONUS, 'Hadiah Login Harian')
    }
    
    // Trigger close animation locally
    setIsClosing(true)
    setTimeout(() => {
      console.log('[DailyWelcomeModal] Animation finished, calling onClose')
      onClose()
    }, 350)
  }

  const dark = tc.dark

  return (
    <>
      <style>{`
        .dwm-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 99999; /* Super high z-index */
          background: rgba(10, 8, 20, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 15vh 20px 20px 20px;
          animation: dwm-fade-in 0.4s ease forwards;
          pointer-events: auto;
          overflow-y: auto;
        }
        .dwm-overlay.closing {
          animation: dwm-fade-out 0.3s ease forwards;
        }
        .dwm-modal {
          background: ${tc.surface};
          width: 100%;
          max-width: 400px;
          border-radius: 24px;
          border: 2px solid ${dark ? 'rgba(162,155,254,0.3)' : 'rgba(162,155,254,0.2)'};
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(0,0,0,0.5);
          padding: 32px 24px;
          text-align: center;
          animation: dwm-pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .dwm-overlay.closing .dwm-modal {
          animation: dwm-pop-out 0.3s ease forwards;
        }
        
        @keyframes dwm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dwm-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes dwm-pop-in { from { opacity: 0; transform: scale(0.9) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes dwm-pop-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(10px); } }

        .dwm-glow {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(162, 155, 254, 0.15) 0%, transparent 60%);
          animation: dwm-rotate 15s linear infinite;
          pointer-events: none;
        }
        @keyframes dwm-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      
      <div className={`dwm-overlay ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="dwm-modal">
          <div className="dwm-glow" />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>🎁</div>
            
            <h2 style={{ 
              fontFamily: "'Fredoka One', cursive", 
              fontSize: 24, 
              color: tc.textMain, 
              margin: '0 0 8px' 
            }}>
              Bonus Harian!
            </h2>
            
            <p style={{ 
              fontSize: 14, 
              color: tc.textMuted, 
              lineHeight: 1.5,
              marginBottom: 24
            }}>
              Selamat datang kembali! Klaim bonus koin harianmu dan selesaikan tantangan untuk hadiah ekstra.
            </p>

            <div style={{ 
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              padding: '16px 20px',
              borderRadius: 20,
              border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              marginBottom: 24
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#FDCB6E', textTransform: 'uppercase', marginBottom: 4 }}>
                Login Reward
              </div>
              <div style={{ 
                fontSize: 24, 
                fontFamily: "'Fredoka One', cursive", 
                color: '#FFD700' 
              }}>
                +{LOGIN_BONUS} Koin 🪙
              </div>
            </div>

            <button
              onClick={handleAccept}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 18,
                border: 'none',
                background: 'linear-gradient(135deg, #7C6FE8, #A29BFE)',
                color: '#fff',
                fontFamily: "'Fredoka One', cursive",
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(124,111,232,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Klaim & Lanjut Main!
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
