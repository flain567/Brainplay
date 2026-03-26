import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useCoins } from '../context/CoinContext.jsx'
import { useProgress, getComboMultiplier } from '../context/ProgressContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useEffect, useState, useRef } from 'react'
import { NotificationBell, useNotifications, requestNotifPermission } from './NotificationManager.jsx'

export default function Navbar({ onHome, onProfile, onShop, onLeaderboard, currentGame }) {
  const { darkMode, muted, musicOff, notifEnabled, hapticsEnabled, toggle } = useSettings()
  const { play, setMuted } = useSound()
  const { coins } = useCoins()
  const { progress } = useProgress()
  const { photoURL, playerName, isLoggedIn } = useAuth()
  const tc = useThemeColors()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const streak = progress.currentStreak || 0
  const combo = getComboMultiplier(streak)
  const notifState = useNotifications()

  useEffect(() => { setMuted(muted) }, [muted, setMuted])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
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
          transition: background 0.35s, box-shadow 0.35s, border-color 0.35s;
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          padding: var(--safe-top, 0px) 28px 0 28px; border-bottom: 2px solid transparent;
        }
        .nav-root.scrolled {
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          border-bottom-color: ${dark ? 'rgba(162,155,254,0.2)' : 'rgba(255,230,109,0.6)'};
        }
        .nav-inner {
          max-width: 1140px; margin: 0 auto; height: 68px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none; text-decoration: none;
        }
        .nav-logo-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg,#FF6B6B,#A29BFE);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; box-shadow: 0 4px 12px rgba(162,155,254,0.4);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0;
        }
        .nav-logo:hover .nav-logo-icon { transform: rotate(-8deg) scale(1.1); }
        .nav-logo-text {
          font-family: 'Fredoka One', cursive; font-size: 24px;
          background: linear-gradient(135deg,#FF6B6B,#A29BFE);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
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
          border: 2px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
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

        @keyframes nav-scale-in { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes nav-fade-in { from{opacity:0} to{opacity:1} }
        @keyframes nav-slide-in { from{transform:translateX(100%);opacity:0.5} to{transform:translateX(0);opacity:1} }

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

      <nav className={`nav-root${scrolled ? ' scrolled' : ''}`} style={{ background: navBg }}>
        <div className="nav-inner">
          {/* Logo */}
          <div className="nav-logo" onClick={() => nav(onHome)}>
            <div className="nav-logo-icon">🎮</div>
            <span className="nav-logo-text">BrainPlay</span>
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
            <button className="nav-btn" title="Shop" onClick={() => nav(onShop)}
              style={{ display:'flex', alignItems:'center', gap:4, width:'auto', minWidth:60, padding:'0 10px', borderRadius:100, background:dark?'rgba(253,203,110,0.08)':'rgba(253,203,110,0.12)', border:`1.5px solid ${dark?'rgba(253,203,110,0.2)':'rgba(253,203,110,0.35)'}` }}>
              <span style={{ fontSize:14 }}>🪙</span>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:13, color:'#F9A825' }}>{coins}</span>
            </button>
            <NotificationBell {...notifState} dark={dark} />
            <button className="nav-btn" title="Leaderboard" onClick={() => nav(onLeaderboard)}>🏆</button>
            <button className="nav-btn" title="Profil" onClick={() => nav(onProfile)} style={{ overflow:'hidden', padding:0 }}>
              {photoURL ? (
                <img src={photoURL} alt="" style={{ width:40, height:40, borderRadius:12, objectFit:'cover' }} referrerPolicy="no-referrer" />
              ) : '👤'}
            </button>
            <button className="nav-btn" title={musicOff ? 'Nyalakan musik' : 'Matikan musik'} onClick={() => { play('click'); toggle.musicOff() }} style={{ position:'relative' }}>
              {musicOff ? '🎵' : '🎶'}
              {musicOff && <span style={{ position:'absolute', top:6, right:6, width:14, height:2, background:'#FF6B6B', borderRadius:2, transform:'rotate(-45deg)' }} />}
            </button>
            <button className="nav-btn" title={muted ? 'Nyalakan suara' : 'Matikan suara'} onClick={() => { if (!muted) play('click'); toggle.muted() }}>
              {muted ? '🔇' : '🔊'}
            </button>
            <button className="nav-btn" title={hapticsEnabled ? 'Matikan getaran' : 'Nyalakan getaran'} onClick={() => { play('click'); toggle.haptics() }} style={{ position:'relative' }}>
              📳
              {!hapticsEnabled && <span style={{ position:'absolute', top:6, right:6, width:14, height:2, background:'#FF6B6B', borderRadius:2, transform:'rotate(-45deg)', zIndex:2 }} />}
            </button>
            <button className="nav-btn" title={darkMode ? 'Mode terang' : 'Mode gelap'} onClick={() => { play('toggle'); toggle.darkMode() }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* ── Mobile actions (≤640px) ── */}
          <div className="nav-actions-mobile">
            {/* Coins — always visible on mobile */}
            <button className="nav-btn" onClick={() => nav(onShop)}
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

            <div className="nav-drawer-item" onClick={() => nav(onProfile)}>
              <div className="nav-drawer-item-icon" style={{
                background:dark?'rgba(162,155,254,0.1)':'#F0EFFE',
                overflow:'hidden', padding:0,
              }}>
                {photoURL ? (
                  <img src={photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} referrerPolicy="no-referrer" />
                ) : '👤'}
              </div>
              <div>
                <div className="nav-drawer-item-text">{isLoggedIn ? playerName : 'Profil'}</div>
                <div className="nav-drawer-item-desc">{isLoggedIn ? 'Akun Google terhubung' : 'Achievement, XP, & statistik'}</div>
              </div>
            </div>

            <div className="nav-drawer-divider" />

            {/* Settings toggles */}
            <div style={{ fontSize:11, fontWeight:800, color:textMuted, letterSpacing:'1px', padding:'0 16px', marginBottom:8 }}>PENGATURAN</div>

            <div className="nav-drawer-toggle-row">
              <div className="nav-drawer-toggle-label">
                <span>{darkMode ? '☀️' : '🌙'}</span>
                <span>Mode Gelap</span>
              </div>
              <button className={`nav-toggle-switch ${darkMode ? 'on' : 'off'}`} onClick={() => { play('toggle'); toggle.darkMode() }}>
                <div className="nav-toggle-knob" />
              </button>
            </div>

            <div className="nav-drawer-toggle-row">
              <div className="nav-drawer-toggle-label">
                <span>{musicOff ? '🔇' : '🎶'}</span>
                <span>Musik</span>
              </div>
              <button className={`nav-toggle-switch ${!musicOff ? 'on' : 'off'}`} onClick={() => { play('click'); toggle.musicOff() }}>
                <div className="nav-toggle-knob" />
              </button>
            </div>

            <div className="nav-drawer-toggle-row">
              <div className="nav-drawer-toggle-label">
                <span>{muted ? '🔇' : '🔊'}</span>
                <span>Efek Suara</span>
              </div>
              <button className={`nav-toggle-switch ${!muted ? 'on' : 'off'}`} onClick={() => { if (!muted) play('click'); toggle.muted() }}>
                <div className="nav-toggle-knob" />
              </button>
            </div>

            <div className="nav-drawer-toggle-row">
              <div className="nav-drawer-toggle-label">
                <span>{hapticsEnabled ? '📳' : '📴'}</span>
                <span>Getaran (Haptics)</span>
              </div>
              <button className={`nav-toggle-switch ${hapticsEnabled ? 'on' : 'off'}`} onClick={() => { play('click'); toggle.haptics() }}>
                <div className="nav-toggle-knob" />
              </button>
            </div>

            <div className="nav-drawer-toggle-row">
              <div className="nav-drawer-toggle-label">
                <span>🔔</span>
                <span>Notifikasi</span>
              </div>
              <button className={`nav-toggle-switch ${notifEnabled ? 'on' : 'off'}`} onClick={async () => {
                play('click')
                if (!notifEnabled) {
                  const perm = await requestNotifPermission()
                  if (perm === 'denied') return
                }
                toggle.notif()
              }}>
                <div className="nav-toggle-knob" />
              </button>
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
              <div style={{ fontSize:11, color:textMuted }}>
                BrainPlay v0.9.5 • by Dwi Agus Hidayat
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
