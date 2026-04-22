import React, { useRef } from 'react'
import { useDailyChallenge } from '../context/DailyChallengeContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import BorderGlow from './BorderGlow.jsx'
import gsap from 'gsap'

export default function DailyChallengeBoard() {
  const {
    challenges, getChallengeProgress, isChallengeComplete, isChallengeClaimed,
    claimChallenge, claimBonus, completedCount, allComplete,
    bonusAvailable, bonusClaimed, allCompleteBonus
  } = useDailyChallenge()
  
  const { earnCoins } = useCoins()
  const { play } = useSound()
  const tc = useThemeColors()
  
  const boardRef = useRef(null)

  const handleClaim = (e, ch) => {
    const btn = e.currentTarget
    
    // Animate button
    gsap.to(btn, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 })
    
    // Coin burst animation
    triggerCoinBurst(e.clientX, e.clientY)
    
    const r = claimChallenge(ch.id)
    if (r > 0) { 
      play('levelUp')
      earnCoins(r, `Misi Harian: ${ch.desc}`) 
    }
  }

  const handleClaimBonus = (e) => {
    if (!bonusAvailable || bonusClaimed) return
    const btn = e.currentTarget
    gsap.to(btn, { scale: 0.95, duration: 0.2, yoyo: true, repeat: 1 })
    triggerCoinBurst(e.clientX, e.clientY, 30) // More coins for bonus
    
    const r = claimBonus()
    if (r > 0) { 
      play('trophy')
      earnCoins(r, 'Bonus: Semua misi selesai!') 
    }
  }

  const triggerCoinBurst = (x, y, count = 12) => {
    const colors = ['#FFD700', '#F1C40F', '#F39C12']
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.innerText = '🪙'
      el.style.cssText = `
        position: fixed; top: ${y - 15}px; left: ${x - 15}px;
        font-size: ${16 + Math.random() * 10}px;
        z-index: 9999; pointer-events: none;
      `
      document.body.appendChild(el)
      
      gsap.to(el, {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200 - 100,
        rotation: Math.random() * 360,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.5,
        ease: 'power2.out',
        onComplete: () => el.remove()
      })
    }
  }

  const dark = tc.dark

  return (
    <>
      <style>{`
        .dcb-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 18px;
          background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          border: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
          margin-bottom: 10px; transition: all 0.3s;
          position: relative; overflow: hidden;
        }
        .dcb-row.done:not(.claimed) {
          background: ${dark ? 'rgba(253,121,168,0.1)' : 'rgba(253,121,168,0.08)'};
          border-color: rgba(253,121,168,0.4);
          animation: dcbGlowPulse 2s infinite alternate;
        }
        .dcb-row.claimed { opacity: 0.6; filter: grayscale(0.5); }
        
        .dcb-icon {
          width: 44px; height: 44px; border-radius: 14px;
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0; transition: all 0.3s;
        }
        .dcb-row.done:not(.claimed) .dcb-icon {
          background: #FD79A8; color: #fff; transform: scale(1.1) rotate(5deg);
        }
        
        .dcb-info { flex: 1; min-width: 0; }
        .dcb-desc { font-weight: 700; font-size: 13px; color: ${tc.textMain}; margin-bottom: 6px; }
        .dcb-desc.s { text-decoration: line-through; color: ${tc.textMuted}; }
        
        /* Premium Progress Bar */
        .dcb-pb { display: flex; alignItems: center; gap: 10px; }
        .dcb-pb-track {
          flex: 1; height: 8px; border-radius: 10px;
          background: ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          overflow: hidden; position: relative;
        }
        .dcb-pb-fill {
          height: 100%; border-radius: 10px;
          background: linear-gradient(90deg, #A29BFE, #FD79A8);
          transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .dcb-pb-fill.done { background: #FD79A8; box-shadow: 0 0 10px #FD79A8; }
        .dcb-pb-lbl { font-size: 11px; font-weight: 900; color: ${tc.textMuted}; width: 34px; text-align: right; }
        
        .dcb-btn {
          padding: 8px 16px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #FD79A8, #E84393);
          color: #fff; font-family: 'Fredoka One', cursive; font-size: 13px;
          cursor: pointer; box-shadow: 0 4px 15px rgba(253,121,168,0.4);
        }
        .dcb-val { font-family: 'Fredoka One', cursive; font-size: 14px; color: #FFD700; background: rgba(255,215,0,0.1); padding: 4px 10px; border-radius: 10px; }
        .dcb-claimed-val { font-size: 13px; font-weight: 800; color: ${tc.textMuted}; }
        
        /* Bonus Chest */
        .dcb-bonus {
          margin-top: 16px; padding: 18px; border-radius: 20px;
          background: linear-gradient(135deg, rgba(253,203,110,0.1), rgba(253,203,110,0.02));
          border: 2px dashed rgba(253,203,110,0.4); text-align: center;
          cursor: pointer; transition: all 0.2s;
        }
        .dcb-bonus.ready {
          border-style: solid; border-color: #FDCB6E;
          background: linear-gradient(135deg, rgba(253,203,110,0.3), rgba(225,112,85,0.2));
          box-shadow: 0 8px 25px rgba(253,203,110,0.3);
          animation: dcbGlowPulse 2s infinite alternate;
        }
        .dcb-bonus.claimed { opacity: 0.5; cursor: default; animation: none; border-color: ${tc.borderCol}; background: transparent; filter: grayscale(1); }
        
        @keyframes dcbGlowPulse {
          0% { box-shadow: 0 0 10px rgba(253,121,168,0.1); }
          100% { box-shadow: 0 0 25px rgba(253,121,168,0.4); }
        }
      `}</style>

      <BorderGlow glowColor="#FD79A8" borderRadius="20px" style={{ display: 'block', width: '100%', marginBottom: 12 }}>
        <div className="section-card" data-anime-reveal style={{ marginBottom: 0 }} ref={boardRef}>
          <div className="sc-header">
            <span style={{ fontSize: 22 }}>⚔️</span>
            <span className="sc-title" style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18 }}>Misi Harian</span>
            <span className="sc-sub" style={{ marginLeft: 8, fontSize: 11, background: 'rgba(253,121,168,0.15)', color: '#FD79A8', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>Reset Jam 00:00</span>
            <div style={{ flex: 1 }} />
            {allComplete
              ? <span className="sc-badge" style={{ background: '#00b894', color: '#fff' }}>Selesai! 🎉</span>
              : completedCount > 0
                ? <span className="sc-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{completedCount}/{challenges.length}</span>
                : null
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {challenges.map(ch => {
              const MathMin = Math.min
              const MathRound = Math.round
              const prog = getChallengeProgress(ch)
              const done = isChallengeComplete(ch)
              const claimed = isChallengeClaimed(ch.id)
              const pct = MathMin(100, MathRound((prog / (ch.target || 1)) * 100))
              
              return (
                <div key={ch.id} className={`dcb-row ${done && !claimed ? 'done' : ''} ${claimed ? 'claimed' : ''}`}>
                  <div className="dcb-icon">
                    {claimed ? '✓' : ch.icon}
                  </div>
                  <div className="dcb-info">
                    <div className={`dcb-desc ${claimed ? 's' : ''}`}>{ch.desc}</div>
                    {!claimed && (
                      <div className="dcb-pb">
                        <div className="dcb-pb-track">
                          <div className={`dcb-pb-fill ${done ? 'done' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="dcb-pb-lbl">{prog}/{ch.target}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {claimed ? (
                      <span className="dcb-claimed-val">+{ch.reward} 🪙</span>
                    ) : done ? (
                      <button className="dcb-btn" onClick={(e) => handleClaim(e, ch)}>Klaim!</button>
                    ) : (
                      <div className="dcb-val">{ch.reward} 🪙</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div 
            className={`dcb-bonus ${bonusAvailable && !bonusClaimed ? 'ready' : ''} ${bonusClaimed ? 'claimed' : ''}`}
            onClick={handleClaimBonus}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {bonusClaimed ? '📦' : bonusAvailable ? '🎁' : '🧰'}
            </div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 15, color: bonusAvailable && !bonusClaimed ? '#fff' : tc.textMain, marginBottom: 4 }}>
              Bonus Sapu Bersih
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: bonusAvailable && !bonusClaimed ? 'rgba(255,255,255,0.8)' : tc.textMuted }}>
              {bonusClaimed 
                ? 'Bonus telah diklaim' 
                : `Selesaikan semua misi untuk +${allCompleteBonus} 🪙`}
            </div>
            {bonusAvailable && !bonusClaimed && (
              <button style={{ 
                marginTop: 12, padding: '8px 24px', borderRadius: 100, border: 'none',
                background: '#fff', color: '#e17055', fontFamily: "'Fredoka One',cursive",
                fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }}>
                Buka Peti!
              </button>
            )}
          </div>
          
        </div>
      </BorderGlow>
    </>
  )
}
