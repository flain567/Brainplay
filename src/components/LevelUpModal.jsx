import { useEffect } from 'react'
import { LEVEL_TITLES, getBorderForLevel, getTitleColorForLevel } from '../context/ProgressContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'

export default function LevelUpModal({ data, onClose }) {
  const { play } = useSound()
  const { earnCoins } = useCoins()
  const tc = useThemeColors()
  
  const { newLevel } = data
  const title = LEVEL_TITLES[Math.min(newLevel, LEVEL_TITLES.length - 1)]
  const borderData = getBorderForLevel(newLevel)
  const titleStyle = getTitleColorForLevel(newLevel)
  const coinReward = newLevel * 10
  
  const dark = tc.dark

  useEffect(() => {
    play('levelUp')
  }, [play])

  const handleClaim = () => {
    play('click')
    earnCoins(coinReward, `Hadiah Level Up (Lv.${newLevel})`)
    onClose()
  }

  return (
    <>
      <style>{`
        .lu-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: lu-fade 0.4s ease both;
        }
        .lu-card {
          width: 100%; max-width: 400px;
          background: ${tc.surface};
          border: 2px solid ${borderData.color}44;
          border-radius: 32px;
          padding: 40px 24px; text-align: center;
          position: relative; overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3), ${borderData.boxShadow || `0 0 20px ${borderData.color}33`};
          animation: scale-up-elastic 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .lu-card::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at top, ${borderData.color}22 0%, transparent 60%);
        }
        .lu-avatar-wrap {
          width: 120px; height: 120px; margin: 0 auto 24px;
          border-radius: 50%;
          background: ${dark ? '#1e2a4a' : '#f0f0f0'};
          display: flex; align-items: center; justify-content: center;
          font-size: 56px; position: relative;
          border: ${borderData.border};
          box-shadow: ${borderData.boxShadow};
          background-color: ${borderData.bgColor};
          animation: float 3s ease-in-out infinite;
        }
        .lu-title {
          font-family: 'Fredoka One',cursive;
          font-size: 36px; margin-bottom: 8px;
          background: linear-gradient(135deg, ${borderData.color}, ${tc.textMain});
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .lu-badge {
          display: inline-block; padding: 6px 18px; border-radius: 100px;
          font-family: 'Fredoka One',cursive; font-size: 16px;
          background: ${titleStyle.bg}; color: ${titleStyle.text};
          margin-bottom: 24px;
        }
        .lu-rewards {
          background: ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
          border: 1px solid ${borderData.color}33;
          border-radius: 20px; padding: 16px; margin-bottom: 28px;
        }
        .lu-reward-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 0; border-bottom: 1px dashed ${tc.borderCol};
        }
        .lu-reward-item:last-child { border-bottom: none; }
        .lu-btn {
          width: 100%; padding: 16px; border-radius: 18px; border: none;
          background: ${borderData.color}; color: #fff;
          font-family: 'Fredoka One',cursive; font-size: 18px;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 8px 20px ${borderData.color}44;
        }
        .lu-btn:hover { transform: translateY(-4px); filter: brightness(1.1); }
        .lu-btn:active { transform: scale(0.96); }
        
        @keyframes lu-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-up-elastic {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <div className="lu-overlay">
        <div className="lu-card">
          <div style={{ fontSize: 24, marginBottom: 12 }}>🎉 LEVEL UP! 🎉</div>
          <div className="lu-avatar-wrap">
            {newLevel < 5 ? '🌱' : newLevel < 10 ? '⚔️' : newLevel < 15 ? '👑' : '🌟'}
          </div>
          <h2 className="lu-title">LEVEL {newLevel}</h2>
          <div className="lu-badge">{title}</div>
          
          <div className="lu-rewards">
            <div style={{ fontSize: 13, color: tc.textMuted, marginBottom: 12, fontWeight: 700 }}>HADIAH TERBUKA:</div>
            <div className="lu-reward-item">
              <div style={{ display:'flex', alignItems:'center', gap:8, color: tc.textMain, fontWeight: 700 }}>
                <span style={{ fontSize:20 }}>🖼️</span> Bingkai Avatar
              </div>
              <div style={{ fontSize: 13, color: borderData.color, fontWeight: 800 }}>{borderData.name}</div>
            </div>
            <div className="lu-reward-item">
              <div style={{ display:'flex', alignItems:'center', gap:8, color: tc.textMain, fontWeight: 700 }}>
                <span style={{ fontSize:20 }}>🪙</span> Koin Emas
              </div>
              <div style={{ fontSize: 15, color: '#f1c40f', fontFamily: "'Fredoka One',cursive" }}>+{coinReward}</div>
            </div>
          </div>
          
          <button className="lu-btn" onClick={handleClaim}>
            Klaim Hadiah Luar Biasa!
          </button>
        </div>
      </div>
    </>
  )
}
