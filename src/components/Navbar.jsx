import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useCoins } from '../context/CoinContext.jsx'
import { useProgress, getComboMultiplier, getLevelInfo, CUSTOM_BORDERS, getBorderForLevel } from '../context/ProgressContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useEffect, useState, useRef } from 'react'
import { NotificationBell, useNotifications } from './NotificationManager.jsx'
import SettingsModal from './SettingsModal.jsx'
import BattlePass from './BattlePass.jsx'
import { animate, splitText, stagger } from 'animejs'
import { useFriends } from '../context/FriendsContext.jsx'

export default function Navbar({ onHome, onProfile, onShop, onLeaderboard, onGames, onInventory, onFriends, currentGame }) {
  const { darkMode, muted } = useSettings()
  const { play, setMuted } = useSound()
  const { coins } = useCoins()
  const { progress, getSeasonInfo } = useProgress()
  const { photoURL, playerName, isLoggedIn } = useAuth()
  const tc = useThemeColors()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBP, setShowBP] = useState(false)
  const menuRef = useRef(null)
  const logoRef = useRef(null)
  const streak = progress.currentStreak || 0
  const combo = getComboMultiplier(streak)
  const notifState = useNotifications()
  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const seasonInfo = getSeasonInfo()
  const { requests } = useFriends() || { requests: [] }
  const pendingCount = requests.length
  
  const currentBorder = progress.selectedBorder ? CUSTOM_BORDERS[progress.selectedBorder] : getBorderForLevel(levelInfo.level)

  useEffect(() => { setMuted(muted) }, [muted, setMuted])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (!logoRef.current) return
    let anim = null
    try {
      const { chars } = splitText(logoRef.current, { words: false, chars: true })
      anim = animate(chars, {
        y: [
          { to: '-1.25rem', ease: 'outExpo', duration: 600 },
          { to: 0, ease: 'outBounce', duration: 800, delay: 100 }
        ],
        rotate: {
          from: '-1turn',
          delay: 0
        },
        delay: stagger(50),
        ease: 'inOutCirc',
        loopDelay: 2000,
        loop: true
      })
    } catch(e) {
      console.error("AnimeJS error:", e)
    }
    return () => {
      if (anim && anim.pause) anim.pause()
    }
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const fn = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    document.addEventListener('touchstart', fn)
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('touchstart', fn) }
  }, [menuOpen])

  // Listen for global openBP event (from Home banner)
  useEffect(() => {
    const fn = () => setShowBP(true)
    window.addEventListener('openBP', fn)
    return () => window.removeEventListener('openBP', fn)
  }, [])

  // Close menu on navigation
  const nav = (action) => {
    setMenuOpen(false)
    play('click')
    action()
  }

  const dark = tc.dark
  const navBg = scrolled ? tc.navScrolled : tc.navBg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol
  const drawerBg = tc.bg

  return (
    <>
      <style>{`
        .nav-root {
          position: sticky; top: 0; z-index: 200;
          transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
          padding: var(--safe-top, 0px) 28px 0 28px; border-bottom: 1px solid transparent;
          background: transparent;
        }
        @media (max-width: 640px) {
          .nav-root { padding: var(--safe-top, 0px) 14px 0 14px; }
        }
        .nav-root.scrolled {
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          background: ${dark ? 'rgba(10, 5, 20, 0.5)' : 'rgba(255, 255, 255, 0.6)'};
          box-shadow: 0 10px 40px rgba(0,0,0,0.15), inset 0 -1px 0 ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)'};
          border-bottom-color: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }
        .nav-inner {
          max-width: 1140px; margin: 0 auto; height: 68px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none; text-decoration: none;
          position: relative;
        }
        .nav-logo::before {
          content: ""; position: absolute;
          left: -20px; right: -20px; top: -10px; bottom: -10px;
          background: radial-gradient(circle at center, rgba(255, 118, 117, 0.4), rgba(124, 111, 232, 0.2), transparent 70%);
          z-index: -1; opacity: 0;
          transition: opacity 0.5s;
          pointer-events: none;
          animation: pulse-glow 3s infinite alternate ease-in-out;
        }
        @keyframes pulse-glow {
          0% { opacity: 0.3; transform: scale(0.9); }
          100% { opacity: 0.7; transform: scale(1.1); }
        }
        .nav-logo-text {
          font-family: 'Fredoka One', cursive; font-size: 26px;
          text-transform: uppercase; letter-spacing: 1.5px;
          color: #FD79A8; /* fallback for un-split text */
        }
        .nav-logo-text span {
          background: linear-gradient(135deg, #A29BFE, #FF9F43);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 4px 15px rgba(255, 159, 67, 0.4);
          display: inline-block; /* required for jumps and rotations */
        }
        .nav-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .nav-crumb { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .nav-crumb-home {
          color: ${textMuted}; cursor: pointer; padding: 5px 12px; border-radius: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .nav-crumb-home:hover { background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}; color: ${textMain}; }
        .nav-crumb-sep { color: ${borderCol}; font-size: 16px; }
        .nav-badge-game {
          background: linear-gradient(135deg,#A29BFE,#FD79A8); color: #fff;
          padding: 5px 16px; border-radius: 100px; font-weight: 700; font-size: 13px;
          box-shadow: 0 3px 10px rgba(162,155,254,0.35);
          animation: nav-scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-badge-challenge {
          background: linear-gradient(135deg,#FFE66D,#FDCB6E); color: #7a5c00;
          padding: 5px 16px; border-radius: 100px; font-weight: 800; font-size: 12px;
          font-family: 'Fredoka One',cursive; box-shadow: 0 3px 10px rgba(255,230,109,0.4);
        }

        /* Desktop actions */
        .nav-actions-desktop { display: flex; gap: 8px; align-items: center; }
        .nav-btn {
          width: 40px; height: 40px; border-radius: 12px;
          border: 2px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'};
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'};
          font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-btn:hover { transform: scale(1.15) rotate(-6deg); border-color: ${dark ? 'rgba(162,155,254,0.4)' : '#A29BFE'}; background: ${dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.08)'}; }
        .nav-btn:active { transform: scale(0.9); }

        /* Mobile hamburger */
        .nav-actions-mobile { display: none; align-items: center; gap: 6px; }
        .nav-hamburger {
          width: 38px; height: 38px; border-radius: 10px; border: none;
          background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
          cursor: pointer; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 5px; padding: 0;
          transition: all 0.2s;
        }
        .nav-hamburger:active { transform: scale(0.9); }
        .nav-hamburger-line {
          width: 20px; height: 2.5px; border-radius: 2px;
          background: ${textMain}; transition: all 0.3s ease;
        }
        .nav-hamburger.open .nav-hamburger-line:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
        .nav-hamburger.open .nav-hamburger-line:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .nav-hamburger.open .nav-hamburger-line:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }

        /* Drawer overlay */
        .nav-drawer-overlay {
          position: fixed; inset: 0; z-index: 190;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          animation: nav-fade-in 0.2s ease;
        }
        /* Drawer panel */
        .nav-drawer {
          position: fixed; top: 0; right: 0; z-index: 195;
          width: 280px; max-width: 80vw; height: 100vh;
          background: ${drawerBg}; box-shadow: -8px 0 30px rgba(0,0,0,0.15);
          padding: calc(24px + var(--safe-top, 0px)) 20px calc(24px + var(--safe-bottom, 0px)) 20px; overflow-y: auto;
          animation: nav-slide-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; flex-direction: column;
        }
        .nav-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; padding-bottom: 16px;
          border-bottom: 1.5px solid ${borderCol};
        }
        .nav-drawer-close {
          width: 36px; height: 36px; border-radius: 10px; border: none;
          background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
          font-size: 18px; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
        }
        .nav-drawer-item {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 14px; cursor: pointer;
          margin-bottom: 6px; transition: all 0.15s;
          border: 1.5px solid transparent;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-drawer-item:hover, .nav-drawer-item:active {
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
          border-color: ${borderCol};
        }
        .nav-drawer-item-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .nav-drawer-item-text {
          font-family: 'Fredoka One', cursive; font-size: 15px; color: ${textMain};
        }
        .nav-drawer-item-desc { font-size: 11px; color: ${textMuted}; margin-top: 1px; font-weight: 600; }
        .nav-drawer-divider {
          height: 1.5px; background: ${borderCol}; margin: 12px 0 14px;
        }
        .nav-drawer-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-radius: 14px; margin-bottom: 6px;
        }
        .nav-drawer-toggle-label { display: flex; align-items: center; gap: 10px; }
        .nav-drawer-toggle-label span:first-child { font-size: 18px; }
        .nav-drawer-toggle-label span:last-child { font-size: 14px; color: ${textMain}; font-weight: 700; font-family: 'Nunito', sans-serif; }
        .nav-toggle-switch {
          width: 44px; height: 26px; border-radius: 100px; padding: 3px;
          cursor: pointer; transition: background 0.2s; border: none;
          display: flex; align-items: center;
        }
        .nav-toggle-switch.on { background: #4ECDC4; justify-content: flex-end; }
        .nav-toggle-switch.off { background: ${dark ? '#2d3561' : '#DFE6E9'}; justify-content: flex-start; }
        .nav-toggle-knob {
          width: 20px; height: 20px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: all 0.2s;
        }

        /* Level UI */
        .nav-level-wrap {
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; padding-left: 12px; border-radius: 14px;
          transition: all 0.2s; background: ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
          border: 1.5px solid ${borderCol};
        }
        .nav-level-wrap:hover { transform: scale(1.05); background: ${dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.05)'}; border-color: ${dark ? '#A29BFE88' : '#A29BFE'}; }
        
        .nav-level-info { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .nav-level-num { 
          font-family: 'Fredoka One', cursive; font-size: 12px; 
          color: ${textMain}; line-height: 1.2; margin-top: 1px;
        }
        .nav-xp-bar {
          width: 50px; height: 5px; border-radius: 100px;
          background: ${dark ? '#2d3561' : '#DFE6E9'}; overflow: hidden;
          border: 1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }
        .nav-xp-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(to right, #A29BFE, #FD79A8);
          box-shadow: 0 0 8px rgba(162,155,254,0.5);
          transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-avatar-wrap {
          width: 40px; height: 40px; border-radius: 50%; border: 3px solid transparent;
          overflow: hidden; pointer-events: none; transition: transform 0.2s;
        }
        .nav-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        
        .nav-bp-pill {
          background: linear-gradient(135deg, #00f5ff, #a29bfe);
          padding: 5px 12px; border-radius: 100px; cursor: pointer;
          font-family: 'Fredoka One', cursive; font-size: 11px; color: #020118;
          display: flex; align-items: center; gap: 6px; transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(0,245,255,0.25);
        }
        .nav-bp-pill:hover { transform: scale(1.05) translateY(-2px); box-shadow: 0 6px 20px rgba(0,245,255,0.4); }
        .nav-bp-pill:active { transform: scale(0.95); }
        .nav-bp-alert {
          width: 8px; height: 8px; border-radius: 50%; background: #ff4757;
          border: 1.5px solid #fff;
        }

        @keyframes nav-scale-in { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes nav-fade-in { from{opacity:0} to{opacity:1} }
        @keyframes nav-slide-in { from{transform:translateX(100%);opacity:0.5} to{transform:translateX(0);opacity:1} }
        
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

        /* Responsive */
        @media (max-width: 640px) {
          .nav-root { padding: 0 14px; }
          .nav-inner { height: 56px; gap: 8px; }
          .nav-logo-icon { width: 34px; height: 34px; border-radius: 10px; font-size: 18px; }
          .nav-logo-text { font-size: 18px; }
          .nav-center { display: none; }
          .nav-actions-desktop { display: none; }
          .nav-actions-mobile { display: flex; }
        }
      `}</style>

      <nav className={`nav-root${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          {/* Logo */}
          <div className="nav-logo" onClick={() => nav(onHome)}>
            <span className="nav-logo-text" ref={logoRef} style={{ display: 'inline-block' }}>brainplay</span>
          </div>

          {/* Center — desktop only */}
          <div className="nav-center">
            {currentGame ? (
              <div className="nav-crumb">
                <span className="nav-crumb-home" onClick={() => nav(onHome)}>Home</span>
                <span className="nav-crumb-sep">›</span>
                <span className="nav-badge-game">{currentGame.emoji} {currentGame.title}</span>
              </div>
            ) : (
              <span className="nav-badge-challenge">🗓 30 Hari Game Challenge</span>
            )}
          </div>

          {/* ── Desktop actions (>640px) ── */}
          <div className="nav-actions-desktop">
            {streak > 0 && (
              <div style={{
                display:'flex', alignItems:'center', gap:3,
                background: combo > 1 ? (dark ? 'rgba(255,107,107,0.12)' : 'rgba(255,107,107,0.1)') : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                border: `1.5px solid ${combo > 1 ? '#FF6B6B44' : 'transparent'}`,
                borderRadius: 100, padding: '0 10px', height: 40,
                fontSize: 12, fontFamily: "'Fredoka One',cursive",
              }}>
                <span style={{ fontSize:14 }}>🔥</span>
                <span style={{ color:'#FF6B6B' }}>{streak}</span>
                {combo > 1 && <span style={{ color:'#FD79A8', fontSize:10 }}>{combo}×</span>}
              </div>
            )}
            
            {/* Unified Nav Group */}
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 2, 
              background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
              padding: '4px', borderRadius: 16, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`
            }}>
              <button className="nav-btn" title="Katalog Game" onClick={() => nav(onGames)} style={{ border:'none', background:'transparent', width:40 }}>🎮</button>
              <button className="nav-btn" title="Tas & Inventaris" onClick={() => nav(onInventory)} style={{ border:'none', background:'transparent', width:40 }}>🎒</button>
              <button className="nav-btn" title="Leaderboard" onClick={() => nav(onLeaderboard)} style={{ border:'none', background:'transparent', width:40 }}>🏆</button>
              <button className="nav-btn" title="Sistem Teman" onClick={() => nav(onFriends)} style={{ border:'none', background:'transparent', width:40, position:'relative' }}>
                🤝
                {pendingCount > 0 && (
                  <div style={{
                    position:'absolute', top:2, right:2, width:16, height:16,
                    background:'#FF6B6B', color:'#fff', borderRadius:'50%',
                    fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
                    border:`2px solid ${dark ? '#1a1a2e' : '#fff'}`,
                    boxShadow:'0 2px 5px rgba(0,0,0,0.2)',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    {pendingCount}
                  </div>
                )}
              </button>
              <div style={{ width: 1.5, height: 20, background: borderCol, margin: '0 4px' }} />
              <button className="nav-btn" title="Shop" onClick={() => nav(onShop)} data-coin-counter
                style={{ 
                  display:'flex', alignItems:'center', gap:6, width:'auto', minWidth:60, padding:'0 12px', 
                  border:'none', background:dark?'rgba(253,203,110,0.1)':'rgba(253,203,110,0.15)', borderRadius: 12 
                }}>
                <span style={{ fontSize:14 }}>🪙</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:13, color:'#F9A825' }}>{coins}</span>
              </button>
            </div>

            <NotificationBell {...notifState} dark={dark} />
            <div className="nav-bp-pill" onClick={() => { play('click'); setShowBP(true) }}>
              <span style={{ fontSize: 13 }}>⚡</span>
              <span>BP</span>
              {seasonInfo.hasRewardToClaim && <div className="nav-bp-alert" />}
            </div>
            
            <div 
              className="nav-level-wrap" 
              onClick={() => nav(onProfile)}
              style={{ padding: '4px 6px 4px 12px', gap: 12, borderRadius: 14 }}
            >
              <div className="nav-level-info">
                <span className="nav-level-num">Lv.{levelInfo.level}</span>
                <div className="nav-xp-bar">
                  <div className="nav-xp-fill" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
                </div>
              </div>
              <div className="nav-avatar-wrap" style={{ position: 'relative', width: 44, height: 44 }}>
                <div style={{
                  position: 'absolute', inset: 4, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Fredoka One',cursive", fontSize: 13, 
                  color: currentBorder?.color || '#7C6FE8',
                  background: currentBorder?.bgColor || (dark ? '#252B45' : '#E2E8F0'),
                  overflow: 'hidden'
                }}>
                  {photoURL ? (
                    <img src={photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span>{playerName ? playerName[0].toUpperCase() : 'P'}</span>
                  )}
                </div>

                {/* Border Overlay */}
                {currentBorder?.url ? (
                  <div 
                    className="premium-border-glow"
                    style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: `url(${currentBorder.url})`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      zIndex: 2, pointerEvents: 'none',
                      '--glow-color': currentBorder.glowColor || '#7C6FE8'
                    }} 
                  />
                ) : (
                  <div 
                    className="legacy-border-glow"
                    style={{
                      position: 'absolute', inset: 3,
                      borderRadius: '50%', border: currentBorder?.border || '1.5px solid rgba(124,111,232,0.3)',
                      boxShadow: currentBorder?.boxShadow || 'none',
                      animation: currentBorder?.animation || 'none',
                      zIndex: 2, pointerEvents: 'none',
                      '--glow-color': currentBorder?.glowColor || '#7C6FE8'
                    }} 
                  />
                )}
              </div>
            </div>

            <button className="nav-btn" style={{ borderRadius: '50%' }} title="Pengaturan" onClick={() => { play('click'); setShowSettings(true) }}>⚙️</button>
          </div>

          {/* ── Mobile actions (≤640px) ── */}
          <div className="nav-actions-mobile">
            {/* Coins — always visible on mobile */}
            <button className="nav-btn" onClick={() => nav(onShop)}
              data-coin-counter
              style={{ display:'flex', alignItems:'center', gap:4, width:'auto', minWidth:52, padding:'0 8px', borderRadius:100, background:dark?'rgba(253,203,110,0.08)':'rgba(253,203,110,0.12)', border:`1.5px solid ${dark?'rgba(253,203,110,0.2)':'rgba(253,203,110,0.35)'}`, height:36 }}>
              <span style={{ fontSize:12 }}>🪙</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:12, color:'#F9A825' }}>{coins}</span>
            </button>
            {/* Streak badge on mobile */}
            {streak > 0 && (
              <div style={{
                display:'flex', alignItems:'center', gap:2,
                background: dark ? 'rgba(255,107,107,0.12)' : 'rgba(255,107,107,0.1)',
                borderRadius:100, padding:'0 8px', height:36,
                fontSize:11, fontFamily:"'Fredoka One',cursive",
              }}>
                <span style={{ fontSize:12 }}>🔥</span>
                <span style={{ color:'#FF6B6B' }}>{streak}</span>
              </div>
            )}
            {/* Notification bell on mobile */}
            <NotificationBell {...notifState} dark={dark} />
            {/* Hamburger button */}
            <button className={`nav-hamburger ${menuOpen ? 'open' : ''}`} onClick={() => { play('click'); setMenuOpen(!menuOpen) }}>
              <span className="nav-hamburger-line" />
              <span className="nav-hamburger-line" />
              <span className="nav-hamburger-line" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <>
          <div className="nav-drawer-overlay" onClick={() => setMenuOpen(false)} />
          <div className="nav-drawer" ref={menuRef}>
            {/* Header */}
            <div className="nav-drawer-header">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#FF6B6B,#A29BFE)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎮</div>
                <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color:textMain }}>Menu</span>
              </div>
              <button className="nav-drawer-close" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {/* Navigation items */}
            <div className="nav-drawer-item" onClick={() => nav(onHome)}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(78,205,196,0.1)':'#E8FFF8' }}>🏠</div>
              <div>
                <div className="nav-drawer-item-text">Home</div>
                <div className="nav-drawer-item-desc">Pilih game & mulai main</div>
              </div>
            </div>

            <div className="nav-drawer-item" onClick={() => nav(onGames)}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(162,155,254,0.1)':'#F0EFFE' }}>🎮</div>
              <div>
                <div className="nav-drawer-item-text">Katalog Game</div>
                <div className="nav-drawer-item-desc">Cari dan temukan semua game</div>
              </div>
            </div>

            <div className="nav-drawer-item" onClick={() => nav(onFriends)}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(78,205,196,0.1)':'#F0FFFE', position:'relative' }}>
                🤝
                {pendingCount > 0 && (
                  <div style={{
                    position:'absolute', top:-2, right:-2, width:18, height:18,
                    background:'#FF6B6B', color:'#fff', borderRadius:'50%',
                    fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
                    border:`2px solid ${drawerBg}`,
                    boxShadow:'0 2px 5px rgba(0,0,0,0.2)'
                  }}>
                    {pendingCount}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="nav-drawer-item-text">Sistem Teman</div>
                <div className="nav-drawer-item-desc">Tambahkan & main bersama teman</div>
              </div>
              {pendingCount > 0 && <div style={{ fontSize:10, background:'#FF6B6B', color:'#fff', padding:'2px 8px', borderRadius:10, fontWeight:800 }}>MINTA</div>}
            </div>

            <div className="nav-drawer-item" onClick={() => nav(onInventory)}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(0,206,201,0.1)':'#E0FFFE' }}>🎒</div>
              <div>
                <div className="nav-drawer-item-text">Tas & Inventaris</div>
                <div className="nav-drawer-item-desc">Lihat bahan dan peti harta karunmu</div>
              </div>
            </div>

            <div className="nav-drawer-item" onClick={() => nav(onLeaderboard)}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(253,203,110,0.1)':'#FFFDE7' }}>🏆</div>
              <div>
                <div className="nav-drawer-item-text">Leaderboard</div>
                <div className="nav-drawer-item-desc">Ranking global & lokal</div>
              </div>
            </div>

            <div className="nav-drawer-item" onClick={() => nav(onShop)}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(253,203,110,0.1)':'#FFF8E1' }}>🏪</div>
              <div>
                <div className="nav-drawer-item-text">Shop</div>
                <div className="nav-drawer-item-desc">Beli pesawat, skin, & item — 🪙 {coins}</div>
              </div>
            </div>

            <div className="nav-drawer-item" onClick={() => { play('click'); setMenuOpen(false); setShowBP(true); }}>
              <div className="nav-drawer-item-icon" style={{ background: 'linear-gradient(135deg, #00f5ff, #a29bfe)', color: '#020118' }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div className="nav-drawer-item-text">Battle Pass</div>
                <div className="nav-drawer-item-desc">Season 1: Neon Genesis — Tier {seasonInfo?.currentTier || 0}</div>
              </div>
              {seasonInfo?.hasRewardToClaim && <div className="nav-bp-alert" style={{ position:'relative', top:0, right:0 }} />}
            </div>

            <div className="nav-drawer-item" onClick={() => nav(onProfile)}>
              <div className="nav-drawer-item-icon" style={{
                background:dark?'rgba(162,155,254,0.1)':'#F0EFFE',
                overflow:'hidden', padding:0, position:'relative'
              }}>
                {photoURL ? (
                  <img src={photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} referrerPolicy="no-referrer" />
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fredoka One',cursive", fontSize:20, color:currentBorder?.color || '#7C6FE8' }}>
                    {playerName ? playerName[0].toUpperCase() : 'P'}
                  </div>
                )}
                {/* Custom Border overlay */}
                <div style={{ 
                  position:'absolute', inset:0, borderRadius:'50%', 
                  border:currentBorder?.border, 
                  boxShadow:currentBorder?.boxShadow, 
                  background: currentBorder?.bgColor || 'transparent',
                  animation: currentBorder?.animation || 'none',
                  pointerEvents:'none' 
                }} />
              </div>
              <div style={{ flex:1 }}>
                <div className="nav-drawer-item-text">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                    <div style={{ 
                      fontSize: 9, fontWeight: 800, color: '#A29BFE', 
                      background: dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.06)',
                      padding: '2px 6px', borderRadius: 4, marginBottom: 2,
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      {progress.selectedTitle || levelInfo.title}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {isLoggedIn ? playerName : 'Profil'}
                    </div>
                  </div>
                  <span style={{ fontSize:10, background:dark?'#2d3561':'#f1f2f6', padding:'2px 6px', borderRadius:5, marginLeft:6 }}>Lv.{levelInfo.level}</span>
                </div>
                <div className="nav-drawer-xp-wrap" style={{ marginTop:4 }}>
                  <div className="nav-xp-bar" style={{ width:'100%', height:6 }}>
                    <div className="nav-xp-fill" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
                  </div>
                  <div style={{ fontSize:9, color:tc.textMuted, marginTop:2, fontWeight:700 }}>
                    {levelInfo.title} • {Math.round(levelInfo.progress * 100)}% to Lv.{levelInfo.level + 1}
                  </div>
                </div>
              </div>
            </div>

            <div className="nav-drawer-divider" />

            {/* Settings button */}
            <div className="nav-drawer-item" onClick={() => { play('click'); setMenuOpen(false); setShowSettings(true); }}>
              <div className="nav-drawer-item-icon" style={{ background:dark?'rgba(162,155,254,0.1)':'#F0EFFE' }}>⚙️</div>
              <div>
                <div className="nav-drawer-item-text">Pengaturan</div>
                <div className="nav-drawer-item-desc">Suara, tampilan & getaran</div>
              </div>
            </div>

            {/* Footer info */}
            <div style={{ marginTop:'auto', paddingTop:20, textAlign:'center' }}>
              {streak > 0 && (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:6,
                  background:dark?'rgba(255,107,107,0.1)':'rgba(255,107,107,0.08)',
                  border:'1.5px solid #FF6B6B33', borderRadius:100,
                  padding:'6px 16px', marginBottom:12,
                  fontFamily:"'Fredoka One',cursive", fontSize:13,
                }}>
                  <span>🔥</span>
                  <span style={{ color:'#FF6B6B' }}>{streak} hari streak!</span>
                  {combo > 1 && <span style={{ color:'#FD79A8', fontSize:11 }}>({combo}× bonus)</span>}
                </div>
              )}
              <div style={{ fontSize:11, color:tc.textMuted }}>
                BrainPlay v0.9.5 • by Dwi Agus Hidayat
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Battle Pass ── */}
      {showBP && <BattlePass onClose={() => setShowBP(false)} />}

      {/* ── Settings Modal ── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
