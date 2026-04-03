import { useEffect, useRef, useState } from 'react'
import { useProgress, getLevelInfo, getLevelRoadReward } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSound } from '../hooks/useSound.js'
import gsap from 'gsap'

export default function LevelRoad({ onClose }) {
  const { progress, claimLevelReward } = useProgress()
  const tc = useThemeColors()
  const { play } = useSound()
  
  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const myLevel = levelInfo.level
  const claimedRewards = progress.claimedLevelRewards || []
  
  const containerRef = useRef(null)
  const activeLevelRef = useRef(null)

  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const borderCol = tc.borderCol
  const textMain = tc.textMain
  const textMuted = tc.textMuted

  // Generate levels 2 to 50
  const levels = Array.from({ length: 49 }, (_, i) => i + 2)

  // Scroll to current level on mount
  useEffect(() => {
    if (activeLevelRef.current && containerRef.current) {
      setTimeout(() => {
        activeLevelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [])

  const handleClaim = (lvl, btnRef) => {
    play('click')
    
    // Tiny pop animation on the button
    if (btnRef) {
      gsap.to(btnRef, { scale: 1.2, yoyo: true, repeat: 1, duration: 0.15 })
    }

    const res = claimLevelReward(lvl)
    if (res.success) {
      play('success') // or levelUp sound
    } else {
      play('error')
    }
  }

  return (
    <div className="lr-overlay" onClick={onClose}>
      <style>{`
        .lr-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
          display: flex; align-items: flex-end; justify-content: center;
          animation: fade-in 0.3s ease;
        }
        .lr-modal {
          width: 100%; max-width: 500px;
          height: 90vh; background: ${bg};
          border-radius: 32px 32px 0 0;
          display: flex; flex-direction: column;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
          border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
          border-bottom: none; overflow: hidden;
          animation: slide-up-modal 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .lr-header {
          padding: 24px 24px 16px; border-bottom: 2px solid ${borderCol};
          display: flex; align-items: center; justify-content: space-between;
          background: ${surface}; position: relative; z-index: 10;
        }
        .lr-close {
          width: 36px; height: 36px; border-radius: 50%;
          background: ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
          border: none; color: ${textMain}; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.2s;
        }
        .lr-content {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 30px 20px 100px; position: relative;
        }
        /* Track line */
        .lr-track-bg {
          position: absolute; top: 30px; bottom: 80px; left: 56px;
          width: 6px; background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          border-radius: 10px; z-index: 0;
        }
        .lr-track-fill {
          position: absolute; top: 30px; left: 56px; width: 6px;
          background: linear-gradient(180deg, #A29BFE, #FDCB6E);
          border-radius: 10px; z-index: 1; transition: height 0.5s;
        }

        .lr-item {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 20px;
          margin-bottom: 40px;
        }
        /* Dot */
        .lr-dot-wrap {
          width: 40px; display: flex; justify-content: center; flex-shrink: 0;
        }
        .lr-dot {
          width: 24px; height: 24px; border-radius: 50%;
          background: ${surface}; border: 4px solid ${borderCol};
          transition: all 0.3s;
          display: flex; align-items: center; justify-content: center;
        }
        .lr-item.unlocked .lr-dot { border-color: #A29BFE; background: #fff; box-shadow: 0 0 10px #A29BFE88; }
        .lr-item.current .lr-dot { border-color: #FDCB6E; background: #fff; box-shadow: 0 0 15px #FDCB6E; transform: scale(1.3); }

        /* Card */
        .lr-card {
          flex: 1; background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 20px; padding: 16px; position: relative;
          transition: all 0.3s;
        }
        .lr-item.locked .lr-card { opacity: 0.6; filter: grayscale(0.8); }
        .lr-item.unlocked .lr-card { border-color: ${dark ? 'rgba(162,155,254,0.3)' : 'rgba(162,155,254,0.5)'}; }
        .lr-item.claimable .lr-card { 
          border-color: #4ECDC4; background: ${dark ? 'rgba(78,205,196,0.05)' : 'rgba(78,205,196,0.08)'};
          box-shadow: 0 5px 20px rgba(78,205,196,0.2); transform: translateX(-4px);
        }
        .lr-item.milestone .lr-card { border-width: 3px; border-color: #FDCB6E; background: ${dark ? 'rgba(253,203,110,0.05)' : 'rgba(253,203,110,0.1)'}; }

        .lr-card-lvl {
          font-family: 'Fredoka One',cursive; fontSize: 18px; color: ${textMain};
        }
        .lr-reward-box {
          display: flex; align-items: center; gap: 12px; margin-top: 10px;
        }
        .lr-reward-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; fontSize: 24px;
        }
        
        .lr-btn {
          margin-top: 12px; width: 100%; padding: 12px; border-radius: 12px;
          border: none; font-family: 'Fredoka One',cursive; fontSize: 14px;
          cursor: pointer; transition: 0.2s;
        }
        .lr-btn.claim { background: #4ECDC4; color: #000; box-shadow: 0 4px 15px rgba(78,205,196,0.4); }
        .lr-btn.claim:active { transform: scale(0.95); }
        .lr-btn.claimed { background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}; color: ${textMuted}; cursor: default; }

        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up-modal { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div className="lr-modal" onClick={e => e.stopPropagation()}>
        <div className="lr-header">
          <div>
            <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 22, color: textMain, margin: 0 }}>
              🗺️ Trophy Road
            </h2>
            <div style={{ fontSize: 13, color: textMuted, marginTop: 4, fontWeight: 600 }}>
              Level saat ini: <strong style={{ color: '#A29BFE' }}>Level {myLevel}</strong>
            </div>
          </div>
          <button className="lr-close" onClick={() => { play('click'); onClose() }}>✕</button>
        </div>

        <div className="lr-content" ref={containerRef}>
          {/* Calculate dynamic track fill height based on current level */}
          {/* Rough approx: item height ~ 140px. Level 50 is index 48. */}
          <div className="lr-track-bg" />
          <div className="lr-track-fill" style={{ height: `${Math.min(100, (Math.max(0, myLevel - 1)) / 49 * 100)}%` }} />

          {levels.map((lvl) => {
            const reward = getLevelRoadReward(lvl)
            const isUnlocked = myLevel >= lvl
            const isClaimed = claimedRewards.includes(lvl)
            const isClaimable = isUnlocked && !isClaimed
            const isCurrent = myLevel === lvl

            let statusClass = 'locked'
            if (isClaimable) statusClass = 'claimable unlocked'
            else if (isClaimed) statusClass = 'claimed unlocked'
            
            return (
              <div 
                key={lvl} 
                className={`lr-item ${statusClass} ${reward.isMilestone ? 'milestone' : ''} ${isCurrent ? 'current' : ''}`}
                ref={isCurrent || (isClaimable && lvl === Math.min(...levels.filter(l => myLevel >= l && !claimedRewards.includes(l)))) ? activeLevelRef : null}
              >
                <div className="lr-dot-wrap">
                  <div className="lr-dot" style={{ borderColor: isClaimable ? '#4ECDC4' : reward.isMilestone ? '#FDCB6E' : '' }}>
                    {isClaimed && <span style={{color:'#4ECDC4', fontSize:12, fontWeight:900}}>✓</span>}
                    {!isUnlocked && <span style={{color:textMuted, fontSize:10}}>🔒</span>}
                  </div>
                </div>

                <div className="lr-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="lr-card-lvl" style={{ color: reward.isMilestone ? '#F9A825' : textMain }}>
                      Level {lvl}
                    </div>
                    {reward.isMilestone && <span style={{ fontSize: 18 }}>👑</span>}
                  </div>
                  
                  <div className="lr-reward-box">
                    <div className="lr-reward-icon" style={{ background: `${reward.color}15`, border: `1.5px solid ${reward.color}44` }}>
                      {reward.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 15, color: textMain }}>
                        {reward.type === 'multi' ? reward.label : reward.label}
                      </div>
                      <div style={{ fontSize: 11, color: textMuted, marginTop: 2, fontWeight: 700 }}>
                        {reward.type === 'chest' ? 'Buka di menu Tas' 
                        : reward.type === 'multi' ? `${reward.list.length} Item Menarik`
                        : reward.type === 'ship' ? 'Kosmetik Space Shooter'
                        : reward.type === 'dash-skin' ? 'Kosmetik Neon Dash'
                        : 'Hadiah Otomatis'}
                      </div>
                    </div>
                  </div>

                  {isClaimable && (
                    <button 
                      className="lr-btn claim"
                      onClick={(e) => handleClaim(lvl, e.currentTarget)}
                    >
                      KLAIM HADIAH
                    </button>
                  )}
                  {isClaimed && (
                    <button className="lr-btn claimed" disabled>
                      Telah Diklaim
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
