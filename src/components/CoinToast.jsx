import { useCoins } from '../context/CoinContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

export default function CoinToast() {
  const { coinAnim } = useCoins()
  const { darkMode } = useSettings()

  if (!coinAnim) return null

  return (
    <>
      <style>{`
        @keyframes coinFloat {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.7); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.1); }
          30%  { transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.9); }
        }
        @keyframes coinSpin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: darkMode
          ? 'linear-gradient(135deg, #2d1f00 0%, #1a1500 100%)'
          : 'linear-gradient(135deg, #FFF8E1 0%, #FFFDE7 100%)',
        border: `2px solid ${darkMode ? '#FDCB6E55' : '#FDCB6E'}`,
        borderRadius: 100,
        padding: '8px 20px',
        boxShadow: `0 8px 24px rgba(253,203,110,${darkMode ? '0.3' : '0.2'})`,
        animation: 'coinFloat 2s ease forwards',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 22, animation: 'coinSpin 0.6s ease', display: 'inline-block' }}>🪙</span>
        <span style={{
          fontFamily: "'Fredoka One',cursive",
          fontSize: 18,
          color: '#F9A825',
          textShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          +{coinAnim.amount}
        </span>
        {coinAnim.desc && (
          <span style={{ fontSize: 12, color: darkMode ? '#8892b0' : '#636E72', fontWeight: 600 }}>
            {coinAnim.desc}
          </span>
        )}
      </div>
    </>
  )
}
