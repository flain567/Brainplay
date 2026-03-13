import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useEffect, useState } from 'react'

export default function Navbar({ onHome, currentGame, difficulty }) {
  const { darkMode, muted, toggle } = useSettings()
  const { play, setMuted } = useSound()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { setMuted(muted) }, [muted, setMuted])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const dark = darkMode
  const navBg = dark
    ? scrolled ? 'rgba(16,10,40,0.97)' : 'rgba(16,10,40,0.85)'
    : scrolled ? 'rgba(255,252,245,0.98)' : 'rgba(255,252,245,0.82)'

  return (
    <>
      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }

        .nav-root {
          position: sticky; top: 0; z-index: 200;
          transition: background 0.35s, box-shadow 0.35s, border-color 0.35s;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 0 28px;
          border-bottom: 2px solid transparent;
        }
        .nav-root.scrolled {
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          border-bottom-color: ${dark ? 'rgba(162,155,254,0.2)' : 'rgba(255,230,109,0.6)'};
        }
        .nav-inner {
          max-width: 1140px; margin: 0 auto;
          height: 68px; display: flex;
          align-items: center; justify-content: space-between; gap: 16px;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none;
          text-decoration: none;
        }
        .nav-logo-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg,#FF6B6B,#A29BFE);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; box-shadow: 0 4px 12px rgba(162,155,254,0.4);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
          flex-shrink: 0;
        }
        .nav-logo:hover .nav-logo-icon { transform: rotate(-8deg) scale(1.1); }
        .nav-logo-text {
          font-family: 'Fredoka One', cursive; font-size: 24px;
          background: linear-gradient(135deg,#FF6B6B,#A29BFE);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nav-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .nav-crumb { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .nav-crumb-home {
          color: ${dark ? '#8892b0' : '#636E72'};
          cursor: pointer; padding: 5px 12px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .nav-crumb-home:hover { background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}; color: ${dark ? '#e8e8f0' : '#2D3436'}; }
        .nav-crumb-sep { color: ${dark ? '#3d3561' : '#DFE6E9'}; font-size: 16px; }
        .nav-badge-game {
          background: linear-gradient(135deg,#A29BFE,#FD79A8);
          color: #fff; padding: 5px 16px; border-radius: 100px;
          font-weight: 700; font-size: 13px; letter-spacing: 0.2px;
          box-shadow: 0 3px 10px rgba(162,155,254,0.35);
          animation: scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-badge-challenge {
          background: linear-gradient(135deg,#FFE66D,#FDCB6E);
          color: #7a5c00; padding: 5px 16px; border-radius: 100px;
          font-weight: 800; font-size: 12px; font-family: 'Fredoka One',cursive;
          box-shadow: 0 3px 10px rgba(255,230,109,0.4);
          letter-spacing: 0.3px;
        }
        .nav-actions { display: flex; gap: 8px; align-items: center; }
        .nav-btn {
          width: 40px; height: 40px; border-radius: 12px;
          border: 2px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
          font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-btn:hover { transform: scale(1.15) rotate(-6deg); border-color: ${dark ? 'rgba(162,155,254,0.4)' : '#A29BFE'}; background: ${dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.08)'}; }
        .nav-btn:active { transform: scale(0.9); }
        @keyframes scale-in { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      <nav
        className={`nav-root${scrolled ? ' scrolled' : ''}`}
        style={{ background: navBg }}
      >
        <div className="nav-inner">
          {/* Logo */}
          <div className="nav-logo" onClick={() => { play('click'); onHome() }}>
            <div className="nav-logo-icon">🎮</div>
            <span className="nav-logo-text">BrainPlay</span>
          </div>

          {/* Center */}
          <div className="nav-center">
            {currentGame ? (
              <div className="nav-crumb">
                <span className="nav-crumb-home" onClick={() => { play('click'); onHome() }}>Home</span>
                <span className="nav-crumb-sep">›</span>
                <span className="nav-badge-game">{currentGame.emoji} {currentGame.title}</span>
              </div>
            ) : (
              <span className="nav-badge-challenge">🗓 30 Hari Game Challenge</span>
            )}
          </div>

          {/* Actions */}
          <div className="nav-actions">
            <button
              className="nav-btn"
              title={muted ? 'Nyalakan suara' : 'Matikan suara'}
              onClick={() => { if (!muted) play('click'); toggle.muted() }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              className="nav-btn"
              title={darkMode ? 'Mode terang' : 'Mode gelap'}
              onClick={() => { play('toggle'); toggle.darkMode() }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
