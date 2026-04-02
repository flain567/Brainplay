import { useProgress, BP_REWARDS, BP_SEASON, CUSTOM_BORDERS } from '../context/ProgressContext.jsx'
import { useCoins, BP_SHIP_CATALOG } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useState, useRef, useEffect, useMemo } from 'react'

function ShipSprite({ shipId, size = 80 }) {
  const ship = useMemo(() => BP_SHIP_CATALOG.find(s => s.id === shipId), [shipId])
  if (!ship) return <div style={{ fontSize: size/2 }}>🚀</div>

  if (ship.sprite) {
    const { x, y, w, h } = ship.sprite
    const scale = size / Math.max(w, h)
    return (
      <div className="ship-sprite-container" style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: w, height: h,
          backgroundImage: `url(${ship.img})`,
          backgroundPosition: `-${x}px -${y}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: '50%', left: '50%',
          marginTop: -(h * scale) / 2,
          marginLeft: -(w * scale) / 2,
        }} />
      </div>
    )
  }

  return (
    <div className="ship-sprite-container" style={{ 
      width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: 'drop-shadow(0 0 10px rgba(0,245,255,0.5))'
    }}>
      <img 
        src={ship.img} 
        alt={ship.name} 
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
      />
    </div>
  )
}

function ShipStats({ shipId }) {
  const ship = useMemo(() => BP_SHIP_CATALOG.find(s => s.id === shipId), [shipId])
  if (!ship) return null
  const s = ship.stats
  return (
    <div className="bp-stats-tooltip">
      <div className="stat-row"><span>SPD</span><div className="bar"><div className="fill" style={{width:`${s.speed*10}%`}}/></div></div>
      <div className="stat-row"><span>PWR</span><div className="bar"><div className="fill" style={{width:`${(11-s.fireRate)*10}%`}}/></div></div>
      <div className="stat-row"><span>HP</span><div className="bar"><div className="fill" style={{width:`${s.maxHP*10}%` , background:'#FF6B6B'}}/></div></div>
    </div>
  )
}

export default function BattlePass({ onClose }) {
  const { progress, claimBPTier, getSeasonInfo } = useProgress()
  const { play } = useSound()
  const tc = useThemeColors()
  const seasonInfo = getSeasonInfo()
  const [claiming, setClaiming] = useState(null)
  
  const scrollRef = useRef(null)
  const isMobile = window.innerWidth < 640

  useEffect(() => {
    if (scrollRef.current) {
      const currentTierIndex = Math.max(0, seasonInfo.currentTier - 1)
      const scrollPos = currentTierIndex * (isMobile ? 180 : 220)
      scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' })
    }
  }, [])

  const handleClaim = async (tier) => {
    if (claiming) return
    setClaiming(tier)
    play('levelUp')
    
    setTimeout(() => {
      claimBPTier(tier)
      setClaiming(null)
    }, 1500)
  }

  const accent = '#00f5ff'
  const secondary = '#a29bfe'

  return (
    <div className="bp-overlay">
      <style>{`
        .bp-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: #020118;
          display: flex; flex-direction: column;
          animation: bp-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          color: #fff; font-family: 'Nunito', sans-serif;
          overflow: hidden;
        }
        @keyframes bp-fade-in { from { opacity: 0; } to { opacity: 1; } }

        /* Cyber Grid Background */
        .bp-grid-bg {
          position: absolute; inset: 0;
          background-image: 
            linear-gradient(rgba(0, 245, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          perspective: 1000px;
          transform: rotateX(20deg);
          transform-origin: top;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
          z-index: -1;
        }

        /* Border Animations */
        @keyframes bp-border-pulse {
          from { filter: brightness(1) drop-shadow(0 0 10px gold); }
          to { filter: brightness(1.3) drop-shadow(0 0 25px gold); }
        }
        @keyframes bp-border-glitch {
          0% { border-color: #6c5ce7; box-shadow: 0 0 30px #6c5ce7; }
          45% { border-color: #6c5ce7; box-shadow: 0 0 30px #6c5ce7; }
          50% { border-color: #ff0064; box-shadow: 0 0 40px #ff0064; }
          55% { border-color: #6c5ce7; box-shadow: 0 0 30px #6c5ce7; }
          100% { border-color: #6c5ce7; box-shadow: 0 0 30px #6c5ce7; }
        }
        
        .bp-header {
          padding: 50px 24px 20px; text-align: center; position: relative;
        }
        .bp-season-tag {
          display: inline-block; padding: 6px 16px; border-radius: 100px;
          background: rgba(0,245,255,0.1); border: 1.5px solid rgba(0,245,255,0.4);
          color: ${accent}; font-family: 'Fredoka One', cursive; font-size: 14px;
          text-transform: uppercase; letter-spacing: 3px; margin-bottom: 16px;
          box-shadow: 0 0 20px rgba(0,245,255,0.2);
        }
        .bp-title {
          font-family: 'Fredoka One', cursive; font-size: 42px;
          background: linear-gradient(135deg, #fff, ${accent}, ${secondary});
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(0,245,255,0.3));
          letter-spacing: 2px;
          position: relative;
        }
        .bp-title::after {
          content: 'BATTLE PASS'; position: absolute; left: 2px; top: 0;
          width: 100%; height: 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-image: inherit; opacity: 0.4; animation: bp-glitch 4s infinite;
        }
        @keyframes bp-glitch {
          0% { transform: translate(0); }
          2% { transform: translate(-2px, 2px); }
          4% { transform: translate(2px, -2px); }
          6% { transform: translate(0); }
          100% { transform: translate(0); }
        }
        .bp-timer { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

        .bp-progress-container {
          max-width: 700px; margin: 0 auto 40px; width: calc(100% - 40px);
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1);
          padding: 30px; border-radius: 30px; position: relative;
          backdrop-filter: blur(10px);
        }
        .bp-progress-labels { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
        .bp-level-text { font-family: 'Fredoka One', cursive; font-size: 24px; color: ${accent}; text-shadow: 0 0 10px ${accent}66; }
        .bp-xp-text { font-size: 16px; font-weight: 900; color: rgba(255,255,255,0.8); font-family: 'Nunito', sans-serif; }
        
        .bp-progress-bg { height: 16px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .bp-progress-fill {
          height: 100%; background: linear-gradient(to right, ${accent}, ${secondary}, ${accent});
          background-size: 200% 100%; animation: bp-shimmer 2s infinite linear;
          box-shadow: 0 0 20px ${accent}88; transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes bp-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

        .bp-track-outer { position: relative; flex: 1; display: flex; align-items: center; padding-bottom: 60px; overflow: hidden; }
        .bp-track-scroll {
          display: flex; gap: 30px; overflow-x: auto; padding: 60px 10%;
          scrollbar-width: none; -ms-overflow-style: none;
          scroll-snap-type: x mandatory;
        }
        .bp-track-scroll::-webkit-scrollbar { display: none; }
        
        .bp-tier-card {
          flex-shrink: 0; width: 200px; display: flex; flex-direction: column; align-items: center;
          position: relative; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          scroll-snap-align: center;
        }
        .bp-tier-num {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #020118; border: 2.5px solid rgba(255,255,255,0.15);
          font-family: 'Fredoka One', cursive; font-size: 16px; margin-bottom: 24px;
          z-index: 2; transition: all 0.4s; color: rgba(255,255,255,0.4);
        }
        .bp-tier-card.unlocked .bp-tier-num { 
          background: ${accent}; border-color: #fff; color: #020118; 
          box-shadow: 0 0 20px ${accent};
        }
        
        .bp-reward-box {
          width: 180px; height: 220px; border-radius: 32px;
          background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 20px; text-align: center; position: relative; transition: all 0.4s;
          cursor: crosshair;
        }
        .bp-tier-card:hover .bp-reward-box { 
          transform: translateY(-10px) scale(1.05); 
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.3);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .bp-tier-card.unlocked .bp-reward-box { border-color: ${accent}44; }
        .bp-tier-card.claimed .bp-reward-box { opacity: 0.5; filter: grayscale(0.8); }
        
        .bp-reward-visual { margin-bottom: 20px; transition: all 0.4s; position: relative; }
        .bp-tier-card:hover .bp-reward-visual { transform: scale(1.1) rotate(5deg); }
        
        .bp-reward-label { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
        .bp-reward-type { font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-top: 4px; letter-spacing: 1px; }
        
        .bp-stats-tooltip {
          position: absolute; top: 10px; left: 10px; right: 10px;
          background: rgba(0,0,0,0.85); border-radius: 12px; padding: 10px;
          opacity: 0; transform: translateY(10px); transition: all 0.3s;
          pointer-events: none; z-index: 10;
        }
        .bp-tier-card:hover .bp-stats-tooltip { opacity: 1; transform: translateY(0); }
        .stat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .stat-row span { font-size: 9px; font-weight: 900; width: 24px; color: ${accent}; }
        .stat-row .bar { flex: 1; height: 3px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
        .stat-row .fill { height: 100%; background: ${accent}; border-radius: 10px; }

        .bp-claim-status { margin-top: 25px; height: 44px; display: flex; align-items: center; justify-content: center; width: 100%; }
        .bp-btn-claim {
          background: linear-gradient(135deg, ${accent}, ${secondary});
          color: #020118; border: none; border-radius: 100px;
          padding: 10px 32px; font-family: 'Fredoka One', cursive; font-size: 15px;
          cursor: pointer; transition: all 0.3s;
          box-shadow: 0 0 20px ${accent}66;
        }
        .bp-btn-claim:hover { transform: scale(1.1); box-shadow: 0 0 30px ${accent}; }
        .bp-btn-claim:active { transform: scale(0.95); }
        .bp-btn-claiming { background: #fff; color: #000; animation: bp-pulse 0.5s infinite; }
        @keyframes bp-pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        
        .bp-status-claimed { color: ${accent}; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .bp-status-locked { color: rgba(255,255,255,0.2); font-weight: 700; font-size: 13px; }

        .bp-close-btn {
          position: absolute; top: 30px; right: 30px;
          width: 50px; height: 50px; border-radius: 50%;
          background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1);
          color: #fff; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s; z-index: 1010;
        }
        .bp-close-btn:hover { background: rgba(255,0,100,0.2); border-color: #ff0064; transform: rotate(180deg); }

        .bp-line-bg {
          position: absolute; top: 21px; left: 0; right: 0; height: 4px;
          background: rgba(255,255,255,0.05); z-index: 1;
        }
        .bp-line-fill {
          height: 100%; background: linear-gradient(to right, ${accent}, ${secondary});
          box-shadow: 0 0 15px ${accent};
          transition: width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .avatar-border-preview {
          width: 70px; height: 70px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fredoka One', cursive; font-size: 24px; color: ${accent};
          background: rgba(0,0,0,0.3);
        }

        @media (max-width: 640px) {
          .bp-track-scroll { padding: 40px 20px; gap: 20px; }
          .bp-tier-card { width: 160px; }
          .bp-reward-box { width: 150px; height: 200px; border-radius: 24px; }
          .bp-title { font-size: 28px; }
          .bp-progress-container { padding: 20px; }
        }
      `}</style>
      
      <div className="bp-grid-bg" />
      <button className="bp-close-btn" onClick={() => { play('click'); onClose() }}>✕</button>

      <div className="bp-header">
        <div className="bp-season-tag">Season 1: Neon Genesis</div>
        <h1 className="bp-title">BATTLE PASS</h1>
        <div className="bp-timer">28 HARI TERSISA • ACT I</div>
      </div>

      <div className="bp-progress-container">
        <div className="bp-progress-labels">
          <div className="bp-level-text">TIER {seasonInfo.currentTier}</div>
          <div className="bp-xp-text">{(seasonInfo.xpInTier || 0).toLocaleString()} / {(seasonInfo.xpNeededForNext || 0).toLocaleString()} XP</div>
        </div>
        <div className="bp-progress-bg">
          <div className="bp-progress-fill" style={{ width: `${seasonInfo.progress * 100}%` }} />
        </div>
      </div>

      <div className="bp-track-outer">
        <div className="bp-track-scroll" ref={scrollRef}>
          <div className="bp-line-bg">
            <div className="bp-line-fill" style={{ width: `${(Math.min(seasonInfo.currentTier, 15) / 15) * 100}%` }} />
          </div>
          
          {BP_REWARDS.map((item) => {
            const isUnlocked = seasonInfo.currentTier >= item.tier
            const isClaimed  = progress.claimedBPTiers?.includes(item.tier)
            const isClaimable = isUnlocked && !isClaimed
            
            return (
              <div key={item.tier} className={`bp-tier-card ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}`}>
                <div className="bp-tier-num">{item.tier}</div>
                
                <div className="bp-reward-box">
                  <div className="bp-reward-visual">
                    {item.reward.type === 'coins' && <div style={{fontSize:60}}>🪙</div>}
                    {item.reward.type === 'title' && <div style={{fontSize:60}}>📜</div>}
                    {item.reward.type === 'border' && (
                      <div className="avatar-border-preview" style={{ 
                        border: CUSTOM_BORDERS[item.reward.value]?.border,
                        boxShadow: CUSTOM_BORDERS[item.reward.value]?.boxShadow
                      }}>
                        P
                      </div>
                    )}
                    {item.reward.type === 'ship' && <ShipSprite shipId={item.reward.value} size={100} />}
                  </div>
                  
                  {item.reward.type === 'ship' && <ShipStats shipId={item.reward.value} />}

                  <div className="bp-reward-label">{item.reward.label.replace('Kapal: ', '').replace('Bingkai: ', '')}</div>
                  <div className="bp-reward-type">{item.reward.type}</div>
                  
                  {isClaimable && (
                    <div style={{ position: 'absolute', top: -12, right: -12, background: accent, color: '#020118', borderRadius: '50%', width: 28, height: 28, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', boxShadow: `0 0 15px ${accent}` }}>!</div>
                  )}
                </div>

                <div className="bp-claim-status">
                  {isClaimed ? (
                    <span className="bp-status-claimed">✓ CLAIMED</span>
                  ) : isClaimable ? (
                    <button className={`bp-btn-claim ${claiming === item.tier ? 'bp-btn-claiming' : ''}`} onClick={() => handleClaim(item.tier)}>
                      {claiming === item.tier ? 'UNLOCKING...' : 'COLLECT'}
                    </button>
                  ) : (
                    <span className="bp-status-locked">🔒 {(item.xp || 0).toLocaleString()} XP</span>
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
