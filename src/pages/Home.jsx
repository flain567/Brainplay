import { useState, useEffect, useRef } from 'react'
import GameCard from '../components/GameCard.jsx'
import ParticleBackground from '../components/ParticleBackground.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress, getLevelInfo, getBorderForLevel, getTitleColorForLevel } from '../context/ProgressContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useDailyChallenge } from '../context/DailyChallengeContext.jsx'
import { useLimitedMode } from '../context/LimitedModeContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

const COMING_SOON = [
  { day: 16, emoji: '⌨️', title: 'Typing Speed',     tag: 'Kata',     color: '#FD79A8' },
  { day: 17, emoji: '💣', title: 'Minesweeper',      tag: 'Logika',   color: '#45B7D1' },
  { day: 18, emoji: '🔀', title: 'Anagram',          tag: 'Kata',     color: '#FDCB6E' },
  { day: 19, emoji: '🗼', title: 'Tower of Hanoi',   tag: 'Logika',   color: '#A29BFE' },
  { day: 20, emoji: '📐', title: 'Nonogram',         tag: 'Puzzle',   color: '#FF6B6B' },
  { day: 21, emoji: '➕', title: 'Math Quiz',        tag: 'Logika',   color: '#4ECDC4' },
  { day: 22, emoji: '♠️', title: 'Solitaire',        tag: 'Casual',   color: '#FD79A8' },
  { day: 23, emoji: '🀄', title: 'Mahjong',          tag: 'Casual',   color: '#FDCB6E' },
  { day: 24, emoji: '♟️', title: 'Chess Puzzle',     tag: 'Logika',   color: '#FF6B6B' },
  { day: 25, emoji: '🎲', title: '??? Surprise',     tag: 'Surprise', color: '#FD79A8' },
]

const ALL_TAGS   = ['Semua', 'Puzzle', 'Casual', 'Action', 'Kata', 'Logika']
const TAG_META   = {
  Semua:   { icon: '🎮', color: '#A29BFE' },
  Puzzle:  { icon: '🧩', color: '#FDCB6E' },
  Casual:  { icon: '🎯', color: '#4ECDC4' },
  Action:  { icon: '🔥', color: '#FF6B6B' },
  Kata:    { icon: '📝', color: '#A29BFE' },
  Logika:  { icon: '🧠', color: '#FF6B6B' },
}

export default function Home({ games, onPlay, onProfile, onShop, onStats }) {
  const { darkMode } = useSettings()
  const { play }     = useSound()
  const { progress } = useProgress()
  const { coins, isDailyClaimable, claimDaily, earnCoins } = useCoins()
  const {
    challenges, getChallengeProgress, isChallengeComplete,
    isChallengeClaimed, claimChallenge, claimBonus,
    completedCount, allComplete, bonusAvailable, bonusClaimed, allCompleteBonus,
  } = useDailyChallenge()
  const { currentMode, isBonusClaimedToday, markBonusAsClaimed } = useLimitedMode()
  const tc = useThemeColors()
  const [scrollTop, setScrollTop] = useState(false)

  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const borderData = getBorderForLevel(levelInfo.level)
  const titleStyle = getTitleColorForLevel(levelInfo.level)
  const streak = progress.currentStreak || 0
  const dark = tc.dark

  useEffect(() => {
    const fn = () => setScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const textMain  = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol
  const surfaceCol = tc.surface

  const totalDone = games.length
  const pct = Math.round((totalDone / 25) * 100)

  // Streak combo multiplier
  const comboMultiplier = streak >= 7 ? 2.0 : streak >= 3 ? 1.5 : streak >= 1 ? 1.2 : 1.0
  const comboLabel = comboMultiplier > 1 ? `${comboMultiplier}×` : null

  return (
    <>
      <style>{`
        .home-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          transition: background 0.4s;
        }
        .home-content { position: relative; z-index: 1; max-width: 1140px; margin: 0 auto; padding: 52px 28px 80px; }

        /* Hero */
        .hero-section { text-align: center; margin-bottom: 48px; }
        .hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: ${dark ? 'rgba(162,155,254,0.12)' : 'rgba(162,155,254,0.1)'};
          border: 1.5px solid ${dark ? 'rgba(162,155,254,0.25)' : 'rgba(162,155,254,0.3)'};
          color: #A29BFE; border-radius: 100px;
          padding: 6px 18px; font-size: 12px; font-weight: 800;
          letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 24px; font-family: 'Nunito',sans-serif;
          animation: slide-up 0.5s ease both;
        }
        .hero-title {
          font-family: 'Fredoka One', cursive;
          font-size: clamp(44px, 7vw, 80px);
          line-height: 1.08; margin-bottom: 20px;
          background: ${dark
            ? 'linear-gradient(135deg,#fff 0%,#A29BFE 45%,#FD79A8 80%,#FFE66D 100%)'
            : 'linear-gradient(135deg,#FF6B6B 0%,#A29BFE 45%,#4ECDC4 100%)'};
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; background-size: 200% 200%;
          animation: slide-up 0.5s 0.1s ease both, gradient-shift 6s ease infinite;
        }
        .hero-sub {
          font-size: 17px; line-height: 1.7; font-weight: 500; max-width: 500px; margin: 0 auto 36px;
          animation: slide-up 0.5s 0.2s ease both;
          color: ${textMuted};
        }

        /* Progress bar */
        .progress-wrap {
          max-width: 420px; margin: 0 auto;
          animation: slide-up 0.5s 0.3s ease both;
        }
        .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .progress-label  { font-size: 13px; font-weight: 700; color: ${textMuted}; }
        .progress-value  { font-family: 'Fredoka One',cursive; font-size: 16px; color: #A29BFE; }
        .progress-track  {
          height: 12px; border-radius: 100px;
          background: ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'};
          overflow: hidden; position: relative;
        }
        .progress-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg,#FF6B6B,#A29BFE,#4ECDC4);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite, scale-in 0.8s 0.6s ease both;
          transform-origin: left;
          width: ${pct}%;
          transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
        }
        .progress-dots { display: flex; justify-content: space-between; margin-top: 8px; }
        .progress-dot  { width: 6px; height: 6px; border-radius: 50%; background: ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; transition: all 0.3s; }
        .progress-dot.done { background: #A29BFE; box-shadow: 0 0 6px #A29BFE44; }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
          align-items: start;
          animation: slide-up 0.5s 0.25s ease both;
        }

        /* Filter tabs (kept for Fallback/Mobile if needed but largely removed from UI) */
        .filter-row { display: none; }

        /* Section headers */
        .section-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; animation: slide-up 0.5s ease both; }
        .section-title { font-family: 'Fredoka One',cursive; font-size: 24px; color: ${textMain}; white-space: nowrap; }
        .section-line  { flex: 1; height: 2px; border-radius: 100px; background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}; min-width: 20px; }

        /* Horizontal Carousel (Netflix Style) */
        .carousel-row {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 24px;
          margin-bottom: 12px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .carousel-row::-webkit-scrollbar { display: none; }
        .carousel-row::after { content: ''; padding-right: 1px; } /* extra padding at end */

        .carousel-btn {
          position: absolute;
          top: 50px;
          bottom: 30px;
          width: 50px;
          border: none;
          color: white;
          font-size: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          z-index: 10;
        }
        section:hover .carousel-btn { opacity: 0.8; }
        .carousel-btn:hover { opacity: 1 !important; font-size: 40px; width: 66px; }
        .carousel-btn.left {
          left: -20px;
          background: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
          border-radius: 16px;
        }
        .carousel-btn.right {
          right: -20px;
          background: linear-gradient(to left, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
          border-radius: 16px;
        }
        @media (max-width: 600px) {
           .carousel-btn { display: none; }
        }

        /* Coming soon grid */
        .cs-card {
          background: ${surfaceCol};
          border: 2px dashed ${borderCol};
          border-radius: 20px; padding: 20px 14px;
          text-align: center; position: relative; overflow: hidden;
          transition: all 0.2s ease;
        }
        .cs-card:hover { opacity: 0.85; transform: scale(1.03); border-style: solid; }

        /* Quick action cards */
        .qa-card {
          flex: 1; display: flex; align-items: center; gap: 10; cursor: pointer;
          border-radius: 16px; padding: 12px 16px; transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .qa-card:hover { transform: translateY(-2px); }
        .qa-card:active { transform: scale(0.98); }

        /* Combo badge */
        .combo-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: linear-gradient(135deg, #FF6B6B, #FD79A8);
          color: #fff; padding: 2px 8px; border-radius: 100px;
          font-size: 10px; font-weight: 800; font-family: 'Fredoka One',cursive;
          animation: glow-pulse 2s ease infinite;
        }

        /* Scroll to top button */
        .scroll-top-btn {
          position: fixed; bottom: 24px; right: 24px; z-index: 100;
          width: 44px; height: 44px; border-radius: 14px;
          background: linear-gradient(135deg, #A29BFE, #FD79A8);
          color: #fff; border: none; font-size: 20px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 4px 16px rgba(162,155,254,0.4);
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          opacity: 0; pointer-events: none; transform: translateY(20px);
        }
        .scroll-top-btn.visible { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .scroll-top-btn:hover { transform: translateY(-4px) scale(1.1); }

        @media (max-width: 600px) {
          .home-content { padding: 24px 16px 60px; }
          .hero-section { margin-bottom: 36px; }
          .hero-title { font-size: 34px; }
          .hero-sub { font-size: 14px; margin-bottom: 20px; }
          .filter-row { margin-bottom: 32px; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; justify-content: flex-start; padding-bottom: 4px; }
          .filter-row::-webkit-scrollbar { display: none; }
          .filter-btn { padding: 8px 16px; font-size: 13px; flex-shrink: 0; }
          .section-title { font-size: 20px; }
          .section-head { gap: 10px; margin-bottom: 20px; }
        }

        /* Footer */
        .home-footer {
          margin-top: 80px; padding-bottom: 20px;
          animation: slide-up 0.5s 0.5s ease both;
        }
        .footer-divider {
          height: 2px; border-radius: 100px; margin-bottom: 40px;
          background: ${dark
            ? 'linear-gradient(90deg, transparent, rgba(162,155,254,0.2), rgba(78,205,196,0.2), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(162,155,254,0.3), rgba(78,205,196,0.3), transparent)'};
        }
        .footer-content { text-align: center; }
        .footer-logo {
          display: inline-flex; align-items: center; gap: 10px;
          margin-bottom: 12px;
        }
        .footer-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg,#FF6B6B,#A29BFE);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; box-shadow: 0 3px 10px rgba(162,155,254,0.3);
        }
        .footer-logo-text {
          font-family: 'Fredoka One',cursive; font-size: 20px;
          background: linear-gradient(135deg,#FF6B6B,#A29BFE);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .footer-tagline {
          font-size: 13px; color: ${textMuted}; margin-bottom: 20px;
          line-height: 1.5;
        }
        .footer-credit {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${dark ? 'rgba(162,155,254,0.08)' : 'rgba(162,155,254,0.06)'};
          border: 1.5px solid ${dark ? 'rgba(162,155,254,0.15)' : 'rgba(162,155,254,0.2)'};
          border-radius: 100px; padding: 8px 20px;
          margin-bottom: 16px;
          transition: all 0.2s;
        }
        .footer-credit:hover {
          border-color: #A29BFE;
          background: ${dark ? 'rgba(162,155,254,0.12)' : 'rgba(162,155,254,0.1)'};
        }
        .footer-credit-label {
          font-size: 12px; color: ${textMuted}; font-weight: 600;
        }
        .footer-credit-name {
          font-family: 'Fredoka One',cursive; font-size: 13px;
          background: linear-gradient(135deg, #A29BFE, #4ECDC4);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .footer-copy {
          font-size: 11px; color: ${dark ? 'rgba(136,146,176,0.5)' : 'rgba(99,110,114,0.5)'};
          font-weight: 600;
        }
      `}</style>

      <div className="home-root" style={{ background: tc.bg }}>

        {/* Interactive particle background */}
        <ParticleBackground dark={dark} />

        <div className="home-content">

          {/* ── Hero ── */}
          <div className="hero-section">
            <div className="hero-tag">🏆 30 Hari · 25 Game · 1 Tujuan</div>
            <h1 className="hero-title">Selamat Datang<br/>di BrainPlay! 🎉</h1>
            <p className="hero-sub">Kumpulan game santai & mengasah otak yang bertambah setiap hari. Main, asah otak, dan cetak rekormu!</p>

            {/* Progress 30 hari */}
            <div className="progress-wrap">
              <div className="progress-header">
                <span className="progress-label">🗓 Progress 30 Hari</span>
                <span className="progress-value">{totalDone}/25 game</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" />
              </div>
              <div className="progress-dots">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`progress-dot${i < Math.floor(totalDone / 2.5) ? ' done' : ''}`} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Dashboard Grid ── */}
          <div className="dashboard-grid">

            {/* ── XP & Profile Banner ── */}
            <div
              onClick={() => { play('click'); onProfile && onProfile() }}
              style={{ cursor:'pointer' }}
            >
              <div style={{
                display:'flex', alignItems:'center', gap:14,
                background: dark?'rgba(162,155,254,0.08)':'rgba(162,155,254,0.06)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border:`1.5px solid ${dark?'rgba(162,155,254,0.2)':'rgba(162,155,254,0.25)'}`,
                borderRadius:20, padding:'14px 20px',
                transition:'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#A29BFE'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(162,155,254,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = dark?'rgba(162,155,254,0.2)':'rgba(162,155,254,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ 
                  fontSize:32, flexShrink:0, width:60, height:60, 
                  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  border: borderData.border, boxShadow: borderData.boxShadow, background: borderData.bgColor 
                }}>
                  {levelInfo.level < 5 ? '🌱' : levelInfo.level < 10 ? '⚔️' : '👑'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ 
                      fontFamily:"'Fredoka One',cursive", fontSize:14, 
                      background: titleStyle.bg !== 'transparent' ? titleStyle.bg : 'none',
                      WebkitBackgroundClip: titleStyle.bg !== 'transparent' ? 'text' : 'border-box',
                      WebkitTextFillColor: titleStyle.bg !== 'transparent' ? 'transparent' : borderData.color,
                      color: borderData.color
                    }}>
                      Lv.{levelInfo.level} {levelInfo.title}
                    </span>
                    <span style={{ fontSize:12, color:textMuted }}>•</span>
                    <span style={{ fontSize:12, color:textMuted, fontWeight:700 }}>{(progress.totalXP||0).toLocaleString()} XP</span>
                  </div>
                  <div style={{ height:6, borderRadius:100, background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:100, background:'linear-gradient(90deg,#A29BFE,#FDCB6E)', width:`${Math.round(levelInfo.progress*100)}%`, transition:'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <span style={{ fontSize:16 }}>🔥</span>
                  <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:13, color:'#FF6B6B' }}>{streak}</span>
                  {comboLabel && <span className="combo-badge">{comboLabel}</span>}
                </div>
                <span style={{ fontSize:16, color:textMuted }}>→</span>
              </div>
            </div>

            {/* ── Shop & Creator Section ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, height: '100%' }}>
              {/* Daily Reward Row */}
              {isDailyClaimable && (
                <div
                  className="qa-card"
                  onClick={() => { play('levelUp'); claimDaily() }}
                  style={{
                    background: dark?'rgba(253,203,110,0.08)':'rgba(253,203,110,0.1)',
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border:`1.5px solid ${dark?'rgba(253,203,110,0.2)':'rgba(253,203,110,0.3)'}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#FDCB6E'; e.currentTarget.style.transform='translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=dark?'rgba(253,203,110,0.2)':'rgba(253,203,110,0.3)'; e.currentTarget.style.transform='translateY(0)' }}
                >
                  <span style={{ fontSize:24 }}>🎁</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:13, color:'#F9A825' }}>Hadiah Harian</div>
                    <div style={{ fontSize:11, color:textMuted }}>Klik klaim!</div>
                  </div>
                </div>
              )}
              
              {/* Shop button */}
              <div
                className="qa-card"
                onClick={() => { play('click'); onShop && onShop() }}
                style={{
                  background: dark?'rgba(162,155,254,0.08)':'rgba(162,155,254,0.06)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border:`1.5px solid ${dark?'rgba(162,155,254,0.2)':'rgba(162,155,254,0.2)'}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#A29BFE'; e.currentTarget.style.transform='translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=dark?'rgba(162,155,254,0.2)':'rgba(162,155,254,0.2)'; e.currentTarget.style.transform='translateY(0)' }}
              >
                <span style={{ fontSize:24 }}>🏪</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:13, color:'#A29BFE' }}>Shop</div>
                  <div style={{ fontSize:11, color:textMuted }}>Card packs dll</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:3, background:'#FDCB6E22', borderRadius:100, padding:'3px 10px' }}>
                  <span style={{ fontSize:12 }}>🪙</span>
                  <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:12, color:'#F9A825' }}>{coins}</span>
                </div>
              </div>

              {/* Creator Info Card */}
              <div
                className="qa-card"
                onClick={() => window.open('https://github.com/dwiagus', '_blank')}
                style={{
                  flex: 1, // Stretch to match the exact height of the Profile Banner on the left
                  background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border: `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                  marginTop: 'auto',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ display: 'flex', width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00b894, #00cec9)', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 10px rgba(0,206,201,0.3)' }}>
                  👨‍💻
                </div>
                <div style={{ flex: 1, paddingLeft: 4 }}>
                  <div style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, fontWeight: 800 }}>Dibuat Oleh</div>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: textMain }}>Dwi Agus Hidayat</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 10, color: textMuted, fontWeight: 800, padding: '3px 8px', background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderRadius: 100 }}>
                    v1.0.0
                  </span>
                </div>
              </div>
            </div>

            {/* ── Daily Challenges ── */}
            <div style={{
              background: dark ? 'rgba(162,155,254,0.06)' : 'rgba(162,155,254,0.04)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border:`1.5px solid ${dark ? 'rgba(162,155,254,0.15)' : 'rgba(162,155,254,0.2)'}`,
              borderRadius:20, padding:'18px 16px', overflow:'hidden',
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>⚔️</span>
                  <div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:15, color:textMain }}>Misi Harian</div>
                    <div style={{ fontSize:11, color:textMuted }}>Reset setiap hari</div>
                  </div>
                </div>
                <div style={{
                  display:'flex', alignItems:'center', gap:4,
                  background: allComplete
                    ? 'linear-gradient(135deg,#4ECDC4,#00B894)'
                    : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  borderRadius:100, padding:'4px 12px',
                }}>
                  <span style={{ fontSize:12, fontFamily:"'Fredoka One',cursive", color: allComplete ? '#fff' : textMuted }}>
                    {completedCount}/3
                  </span>
                </div>
              </div>

              {/* Challenge cards */}
              {challenges.map((ch, i) => {
                const progress = getChallengeProgress(ch)
                const complete = isChallengeComplete(ch)
                const claimed = isChallengeClaimed(ch.id)
                const progressPct = Math.min((progress / ch.target) * 100, 100)

                return (
                  <div key={ch.id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 12px', borderRadius:14, marginBottom: i < challenges.length - 1 ? 8 : 0,
                    background: claimed
                      ? (dark ? 'rgba(78,205,196,0.06)' : 'rgba(78,205,196,0.05)')
                      : complete
                        ? (dark ? 'rgba(253,203,110,0.08)' : 'rgba(253,203,110,0.06)')
                        : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                    border: `1px solid ${claimed ? 'rgba(78,205,196,0.2)' : complete ? 'rgba(253,203,110,0.25)' : 'transparent'}`,
                    transition:'all 0.2s',
                    opacity: claimed ? 0.65 : 1,
                  }}>
                    {/* Icon */}
                    <div style={{
                      width:38, height:38, borderRadius:12, flexShrink:0,
                      background: claimed
                        ? 'linear-gradient(135deg,#4ECDC4,#00B894)'
                        : complete
                          ? 'linear-gradient(135deg,#FDCB6E,#F9A825)'
                          : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: claimed ? 16 : 18,
                    }}>
                      {claimed ? '✓' : ch.icon}
                    </div>

                    {/* Desc + progress bar */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, fontWeight:700, color: claimed ? textMuted : textMain,
                        textDecoration: claimed ? 'line-through' : 'none',
                        marginBottom:4,
                      }}>
                        {ch.desc}
                      </div>
                      {!claimed && (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{
                            flex:1, height:5, borderRadius:100,
                            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            overflow:'hidden',
                          }}>
                            <div style={{
                              height:'100%', borderRadius:100,
                              background: complete
                                ? 'linear-gradient(90deg,#4ECDC4,#00B894)'
                                : 'linear-gradient(90deg,#A29BFE,#6C5CE7)',
                              width:`${progressPct}%`,
                              transition:'width 0.5s ease',
                            }} />
                          </div>
                          <span style={{ fontSize:10, color:textMuted, fontWeight:700, flexShrink:0 }}>
                            {progress}/{ch.target}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reward / Claim button */}
                    {claimed ? (
                      <div style={{ fontSize:11, color:'#4ECDC4', fontWeight:700, flexShrink:0 }}>
                        +{ch.reward} 🪙
                      </div>
                    ) : complete ? (
                      <button onClick={() => {
                        const reward = claimChallenge(ch.id)
                        if (reward > 0) {
                          play('levelUp')
                          earnCoins(reward, `Misi: ${ch.desc}`)
                        }
                      }} style={{
                        background:'linear-gradient(135deg,#FDCB6E,#F9A825)',
                        border:'none', borderRadius:10, padding:'6px 12px',
                        color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer',
                        fontFamily:"'Fredoka One',cursive",
                        boxShadow:'0 3px 10px rgba(253,203,110,0.35)',
                        animation:'pulse 1.5s ease infinite',
                        flexShrink:0,
                      }}>
                        Klaim!
                      </button>
                    ) : (
                      <div style={{
                        fontSize:11, color:'#A29BFE', fontWeight:700, flexShrink:0,
                        display:'flex', alignItems:'center', gap:2,
                      }}>
                        {ch.reward} 🪙
                      </div>
                    )}
                  </div>
                )
              })}

              {/* All-complete bonus */}
              {allComplete && (
                <div style={{
                  marginTop:10, padding:'10px 14px', borderRadius:14,
                  background: bonusClaimed
                    ? (dark ? 'rgba(78,205,196,0.06)' : 'rgba(78,205,196,0.04)')
                    : 'linear-gradient(135deg, rgba(162,155,254,0.12), rgba(253,203,110,0.12))',
                  border: `1px solid ${bonusClaimed ? 'rgba(78,205,196,0.2)' : 'rgba(162,155,254,0.25)'}`,
                  display:'flex', alignItems:'center', gap:10,
                }}>
                  <span style={{ fontSize:20 }}>{bonusClaimed ? '🎉' : '🎁'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color: bonusClaimed ? '#4ECDC4' : textMain }}>
                      {bonusClaimed ? 'Bonus diklaim!' : 'Semua misi selesai!'}
                    </div>
                    <div style={{ fontSize:11, color:textMuted }}>Bonus {allCompleteBonus} coin</div>
                  </div>
                  {bonusAvailable && (
                    <button onClick={() => {
                      const reward = claimBonus()
                      if (reward > 0) {
                        play('levelUp')
                        earnCoins(reward, 'Bonus: Semua misi selesai!')
                      }
                    }} style={{
                      background:'linear-gradient(135deg,#A29BFE,#6C5CE7)',
                      border:'none', borderRadius:10, padding:'6px 14px',
                      color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer',
                      fontFamily:"'Fredoka One',cursive",
                      boxShadow:'0 3px 10px rgba(162,155,254,0.35)',
                    }}>
                      Klaim!
                    </button>
                  )}
                </div>
              )}
            </div>
            <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
          </div>

          {/* ── Limited Mode Banner ── */}
          {currentMode && (
            <div style={{
              marginBottom: 48, padding: 20, borderRadius: 20,
              background: `linear-gradient(135deg, ${currentMode.color}20, ${currentMode.color}08)`,
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: `1.5px solid ${currentMode.color}44`,
              animation: 'slide-up 0.5s 0.4s ease both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 32, filter: `drop-shadow(0 0 10px ${currentMode.color}66)` }}>{currentMode.emoji}</span>
                    <div>
                      <h3 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: currentMode.color, margin: 0 }}>
                        {currentMode.name}
                      </h3>
                      <span style={{ fontSize: 11, color: textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Event Terbatas</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: textMuted, margin: 0, lineHeight: 1.5, maxWidth: '80%' }}>
                    {currentMode.desc}
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: textMuted, fontWeight: 800, padding: '4px 10px', background: `${currentMode.color}22`, borderRadius: 100, border: `1px solid ${currentMode.color}33`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🪙 <span style={{ color: currentMode.color }}>×{currentMode.coinMultiplier}</span>
                    </div>
                    <div style={{ fontSize: 12, color: textMuted, fontWeight: 800, padding: '4px 10px', background: `${currentMode.color}22`, borderRadius: 100, border: `1px solid ${currentMode.color}33`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⭐ <span style={{ color: currentMode.color }}>×{currentMode.xpMultiplier}</span>
                    </div>
                  </div>
                </div>
                {!isBonusClaimedToday(currentMode.id) && (
                  <button
                    onClick={() => {
                      markBonusAsClaimed(currentMode.id)
                      play('levelUp')
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color}cc)`,
                      color: '#fff', border: 'none',
                      borderRadius: 14, padding: '12px 20px', fontSize: 14, fontWeight: 800,
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                      fontFamily: "'Fredoka One',cursive",
                      boxShadow: `0 6px 16px ${currentMode.color}44`
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Mainkan ✨
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Categorized Game Rows (Netflix Style) ── */}
          {ALL_TAGS.filter(t => t !== 'Semua').map((tag, tagIndex) => {
            const tagGames = games.filter(g => g.tag === tag)
            if (tagGames.length === 0) return null
            const meta = TAG_META[tag]
            return (
              <section key={tag} style={{ position: 'relative', marginBottom: 48, animation: `slide-up 0.5s ${0.3 + tagIndex*0.1}s ease both` }}>
                <div className="section-head">
                  <h2 className="section-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:28, filter:`drop-shadow(0 0 10px ${meta.color}66)` }}>{meta.icon}</span>
                    {tag}
                  </h2>
                  <span style={{ background: `${meta.color}22`, color: meta.color, borderRadius: 100, padding: '4px 14px', fontSize: 13, fontWeight: 800, border: `1px solid ${meta.color}44`, display: 'flex', alignItems: 'center' }}>
                    {tagGames.length} Game <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 10 }}>geser ➔</span>
                  </span>
                  <div className="section-line" />
                </div>
                
                <button className="carousel-btn left" onClick={e => e.currentTarget.parentElement.querySelector('.carousel-row').scrollBy({ left: -320, behavior: 'smooth' })}>
                  ‹
                </button>
                <div className="carousel-row">
                  {tagGames.map((game) => (
                    <GameCard key={game.id} game={game} onPlay={onPlay} />
                  ))}
                </div>
                <button className="carousel-btn right" onClick={e => e.currentTarget.parentElement.querySelector('.carousel-row').scrollBy({ left: 320, behavior: 'smooth' })}>
                  ›
                </button>
              </section>
            )
          })}

          {/* ── Coming soon ── */}
          {COMING_SOON.length > 0 && (
            <section style={{ position: 'relative', animation: 'slide-up 0.5s 0.8s ease both', marginBottom: 48 }}>
              <div className="section-head">
                <h2 className="section-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:28, filter:'drop-shadow(0 0 10px #A29BFE66)' }}>🔒</span>
                  Segera Hadir
                </h2>
                <span style={{ background: '#A29BFE22', color: '#A29BFE', borderRadius: 100, padding: '4px 14px', fontSize: 13, fontWeight: 800, border: '1px solid #A29BFE44', display: 'flex', alignItems: 'center' }}>
                  {COMING_SOON.length} Game <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 10 }}>geser ➔</span>
                </span>
                <div className="section-line" />
              </div>

              <button className="carousel-btn left" onClick={e => e.currentTarget.parentElement.querySelector('.carousel-row').scrollBy({ left: -320, behavior: 'smooth' })}>
                ‹
              </button>
              <div className="carousel-row" style={{ minHeight: 140 }}>
                {COMING_SOON.map((g, i) => (
                  <div key={g.day} className="cs-card" style={{ flexShrink: 0, width: 160, scrollSnapAlign: 'start', opacity: 0.6 }}>
                    <div style={{ position: 'absolute', top: 10, right: 10, background: `${g.color}22`, color: g.color, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, fontFamily: "'Fredoka One',cursive", border: `1px solid ${g.color}44` }}>
                      Hari {g.day}
                    </div>
                    <div style={{ fontSize: 34, marginBottom: 10, filter: 'grayscale(30%)' }}>{g.emoji}</div>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 14, color: textMain, marginBottom: 6 }}>{g.title}</div>
                    <span style={{ background: `${g.color}22`, color: g.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>{g.tag}</span>
                  </div>
                ))}
              </div>
              <button className="carousel-btn right" onClick={e => e.currentTarget.parentElement.querySelector('.carousel-row').scrollBy({ left: 320, behavior: 'smooth' })}>
                ›
              </button>
            </section>
          )}

          {/* ── Footer Credit ── */}
          <footer className="home-footer">
            <div className="footer-divider" />
            <div className="footer-content">
              <div className="footer-logo">
                <div className="footer-logo-icon">🎮</div>
                <span className="footer-logo-text">BrainPlay</span>
              </div>
              <p className="footer-tagline">Santai & Mengasah Otak — 30 Hari, 25 Game, 1 Tujuan</p>
              <div className="footer-credit">
                <span className="footer-credit-label">Dibuat dengan ❤️ oleh</span>
                <span className="footer-credit-name">Dwi Agus Hidayat</span>
              </div>
              <p className="footer-copy">© 2025 BrainPlay v0.9.2 — Semua hak dilindungi.</p>
            </div>
          </footer>

        </div>
      </div>

      {/* Scroll to top */}
      <button
        className={`scroll-top-btn ${scrollTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>
    </>
  )
}
