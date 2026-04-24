import { useState, useEffect, useLayoutEffect, useRef, useCallback, lazy, Suspense } from 'react'
import GameCard from '../components/GameCard.jsx'
import ParticleBackground from '../components/ParticleBackground.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress, getLevelInfo, getBorderForLevel, getTitleColorForLevel, CUSTOM_BORDERS, AVATAR_CATALOG } from '../context/ProgressContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import DailyChallengeBoard from '../components/DailyChallengeBoard.jsx'
import DailyWelcomeModal from '../components/DailyWelcomeModal.jsx'
import { useDailyChallenge } from '../context/DailyChallengeContext.jsx'
import { useLimitedMode } from '../context/LimitedModeContext.jsx'
import { useLuckyWheel } from '../context/LuckyWheelContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { trackLimitedModeView, trackLimitedModeBonus } from '../utils/analytics.js'
import { useLocalAnalytics } from '../context/LocalAnalyticsContext.jsx'
import GameDetailModal from '../components/GameDetailModal.jsx'
const AnimatedHeroText = lazy(() => import('../components/AnimatedHeroText.jsx'))
import { getLastPlayed } from '../utils/lastPlayed.js'
import useHomeAnimations from '../hooks/useHomeAnimations.js'
import useGSAPScrollTrigger from '../hooks/useGSAPScrollTrigger.js'
import useScrambleNumber from '../hooks/useScrambleNumber.js'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import ActivityTicker from '../components/ActivityTicker.jsx'
import Mascot from '../components/Mascot.jsx'
import InfiniteTicker from '../components/InfiniteTicker.jsx'
import BlueprintIntro from '../components/BlueprintIntro.jsx'
import BorderGlow from '../components/BorderGlow.jsx'
import Tilt from '../components/Tilt.jsx'
import PremiumTitleBadge from '../components/PremiumTitleBadge.jsx'
gsap.registerPlugin(Flip)

const ROADMAP_FUTURE = [
  { emoji: '⌨️', title: 'Typing Speed', tag: 'Kata', color: '#FD79A8', blurb: 'Kecepatan mengetik' },
  { emoji: '🔀', title: 'Anagram', tag: 'Kata', color: '#FDCB6E', blurb: 'Acak huruf jadi kata' },
  { emoji: '📐', title: 'Nonogram', tag: 'Puzzle', color: '#FF6B6B', blurb: 'Tebak gambar dari angka' },
  { emoji: '♠️', title: 'Solitaire', tag: 'Casual', color: '#A29BFE', blurb: 'Santai satu kartu' },
  { emoji: '🀄', title: 'Mahjong', tag: 'Casual', color: '#00CEC9', blurb: 'Pasangkan tile' },
  { emoji: '♟️', title: 'Chess Puzzle', tag: 'Logika', color: '#636E72', blurb: 'Mate dalam N langkah' },
  { emoji: '🎲', title: 'Mode Surprise', tag: 'Surprise', color: '#FD79A8', blurb: 'Random challenge' },
]

const ALL_TAGS = ['Semua', 'Puzzle', 'Casual', 'Action', 'Kata', 'Logika', 'Pengetahuan']
const TAG_META = {
  Semua: { icon: '🎮', color: '#A29BFE' },
  Puzzle: { icon: '🧩', color: '#FDCB6E' },
  Casual: { icon: '🎯', color: '#4ECDC4' },
  Action: { icon: '🔥', color: '#FF6B6B' },
  Kata: { icon: '📝', color: '#A29BFE' },
  Logika: { icon: '🧠', color: '#FF6B6B' },
  Pengetahuan: { icon: '🇮🇩', color: '#0984E3' },
}

export default function Home({ games, onPlay, onContinueLast, onProfile, onShop, onStats, onOpenWheel, onGames, onFriends }) {
  const { darkMode, reduceMotion } = useSettings()
  const { play } = useSound()
  const { progress, getSeasonInfo, getTitleRarity } = useProgress()
  const { playerName } = useAuth()
  const { coins, isDailyClaimable, claimDaily, earnCoins } = useCoins()
  const {
    challenges, getChallengeProgress, isChallengeComplete,
    isChallengeClaimed, claimChallenge, claimBonus,
    completedCount, allComplete, bonusAvailable, bonusClaimed, allCompleteBonus,
    welcomeClaimed,
  } = useDailyChallenge()
  const { currentMode, isBonusClaimedToday, markBonusAsClaimed, getNextWeekendEvent, getWeekNumber } = useLimitedMode()
  const { hasFreeSpins } = useLuckyWheel()
  const [showIntro, setShowIntro] = useState(false)
  const [hideWelcomeModal, setHideWelcomeModal] = useState(false)
  const tc = useThemeColors()
  const { trackEvent } = useLocalAnalytics()

  // Safety: Force hide intro after 7 seconds no matter what
  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => {
        console.log('[Home] Safety timeout triggered: forcing showIntro=false')
        setShowIntro(false)
      }, 7000)
      return () => clearTimeout(t)
    }
  }, [showIntro])

  const [scrollTop, setScrollTop] = useState(false)
  const [activeTag, setActiveTag] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGameForModal, setSelectedGameForModal] = useState(null)
  const flipStateRef = useRef(null)

  const [modeTimeLeft, setModeTimeLeft] = useState('00:00:00')
  useEffect(() => {
    if (!currentMode || !currentMode.active_days || currentMode.active_days.length === 0) return
    const endDay = currentMode.active_days[currentMode.active_days.length - 1]
    
    function update() {
      const now = new Date()
      const cd = now.getDay()
      let diffDays = 0
      
      // Calculate days until 'endDay'
      if (endDay !== cd) {
        if (endDay === 0) diffDays = 7 - cd
        else if (endDay > cd) diffDays = endDay - cd
      }
      
      const target = new Date()
      target.setDate(now.getDate() + diffDays)
      target.setHours(23, 59, 59, 999)
      
      const dist = target - now
      if (dist <= 0) {
        setModeTimeLeft('00:00:00')
        return
      }
      const h = Math.floor(dist / (1000 * 60 * 60))
      const m = Math.floor((dist / 1000 / 60) % 60)
      const s = Math.floor((dist / 1000) % 60)
      setModeTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`)
    }
    update()
    const int = setInterval(update, 1000)
    return () => clearInterval(int)
  }, [currentMode])

  // Capture Flip state BEFORE React updates DOM, then animate after
  const handleTagChange = useCallback((newTag) => {
    if (newTag === activeTag) return
    play('click')
    flipStateRef.current = Flip.getState('.flip-item')
    setActiveTag(newTag)
  }, [activeTag, play])

  useLayoutEffect(() => {
    if (!flipStateRef.current) return
    const state = flipStateRef.current
    flipStateRef.current = null
    Flip.from(state, {
      duration: 0.42,
      ease: 'power2.inOut',
      stagger: { amount: 0.18, from: 'start' },
      absolute: true,
      onEnter: els => gsap.fromTo(els,
        { opacity: 0, scale: 0.82, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.7)' }
      ),
      onLeave: els => gsap.to(els,
        { opacity: 0, scale: 0.82, duration: 0.22, ease: 'power2.in' }
      ),
    })
  }, [activeTag])

  // DISABLED: These hooks set elements to opacity:0 and rely on scroll triggers
  // that often fail on mobile, leaving the entire Home screen blank.
  // useHomeAnimations(reduceMotion)
  // useGSAPScrollTrigger(reduceMotion)

  const levelInfo = getLevelInfo(progress.totalXP || 0)
  const borderData = getBorderForLevel(levelInfo.level)
  const streak = progress.currentStreak || 0
  const dark = tc.dark

  // ScrambleText refs — harus setelah streak/coins/xp dideklarasi
  const coinsRef = useScrambleNumber(coins, { skipFirst: false })
  const streakRef = useScrambleNumber(streak, { duration: 0.6, revealDelay: 0.25, skipFirst: false })
  const xpRef = useScrambleNumber(progress.totalXP || 0, { duration: 1.0, skipFirst: false })

  // GSAP entrance animations removed to prevent blank content on mobile
  // The qa-btn elements rely on CSS transitions for hover/click effects only

  const onHoverQA = (e, enter) => {
    if (reduceMotion) return
    gsap.to(e.currentTarget, {
      y: enter ? -5 : 0,
      scale: enter ? 1.04 : 1,
      duration: 0.4,
      ease: 'power2.out',
      borderColor: enter ? S.accent : S.border,
      boxShadow: enter ? `0 12px 24px ${S.accent}22` : 'none',
      backgroundColor: enter ? S.accentFill : S.surface
    })
    const ico = e.currentTarget.querySelector('.qa-ico')
    if (ico) {
      gsap.to(ico, {
        y: enter ? -3 : 0,
        scale: enter ? 1.15 : 1,
        rotation: enter ? 5 : 0,
        duration: 0.45,
        ease: 'back.out(2)'
      })
    }
  }

  useEffect(() => {
    const fn = () => setScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (currentMode) {
      trackLimitedModeView(currentMode.id, currentMode.name, getWeekNumber())
      trackEvent('limited_mode_view', { event_id: currentMode.id, event_name: currentMode.name, week_number: getWeekNumber() })
    }
  }, [currentMode])

  const lastPlayed = getLastPlayed()
  const lastGameMeta = lastPlayed ? games.find(g => g.id === lastPlayed.gameId) : null
  const lastDiffOk = lastGameMeta?.difficulties?.some(d => d.id === lastPlayed?.difficultyId)
  const showContinue = Boolean(onContinueLast && lastGameMeta && lastDiffOk)
  const DIFF_LABEL = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' }
  const comboMultiplier = streak >= 7 ? 2.0 : streak >= 3 ? 1.5 : streak >= 1 ? 1.2 : 1.0
  const comboLabel = comboMultiplier > 1 ? `${comboMultiplier}×` : null
  const gameTotal = games.length || 1

  // Flagship = highest day game
  const flagshipGame = games.length
    ? games.reduce((p, c) => (c.day > p.day ? c : p), games[0])
    : null

  // Dark-neon palette (matches mockup)
  const S = dark ? {
    surface: '#1A1F35',
    surfaceDeep: '#0D1022',
    border: '#252B45',
    text: '#E2E8F0',
    muted: '#475569',
    mutedDeep: '#334155',
    accent: '#7C6FE8',
    accentFill: 'rgba(124,111,232,0.14)',
    accentBorder: 'rgba(124,111,232,0.35)',
    gold: '#EAB308',
    green: '#34D399',
  } : {
    surface: '#FFFFFF',
    surfaceDeep: '#F8F9FC',
    border: '#E8ECF4',
    text: '#2D3436',
    muted: '#636E72',
    mutedDeep: '#8892A4',
    accent: '#6C5CE7',
    accentFill: 'rgba(108,92,231,0.07)',
    accentBorder: 'rgba(108,92,231,0.25)',
    gold: '#F9A825',
    green: '#00B894',
  }

  return (
    <>
      <BlueprintIntro onComplete={() => setShowIntro(false)} />

      <style>{`
        .home-root { min-height:100vh; position:relative; overflow:hidden; transition:background 0.4s; padding-top: 0; }
        .home-content { position:relative; z-index:1; max-width:860px; margin:0 auto; padding:20px 20px 120px; }

        /* Renaissance Hero Overhaul */
        .renaissance-hero {
          position: relative;
          z-index: 1;
          padding: 40px 0;
          margin-bottom: 32px;
          border-bottom: 1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
        }
        .hero-title-main {
          font-family: var(--font-serif);
          font-size: 52px;
          line-height: 0.9;
          letter-spacing: -2px;
          color: #FFFFFF;
          margin-bottom: 24px;
          text-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .hero-subtitle {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 4px;
          color: #FFD700;
          text-transform: uppercase;
          margin-bottom: 8px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.4);
        }

        /* Profile Banner Re-styled */
        .profile-strip {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 16px;
          background: ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
          border: 1px solid ${S.border};
          cursor: pointer; transition: all 0.2s;
        }
        .profile-strip:hover { border-color: ${S.accent}; transform: translateX(4px); }

        /* Profile Banner */
        .profile-banner {
          display:flex; align-items:center; gap:14px;
          background:${S.surfaceDeep}; border:1.5px solid ${S.border};
          border-radius:20px; padding:14px 18px; margin-bottom:12px;
          cursor:pointer; transition:all 0.2s;
          -webkit-tap-highlight-color:transparent;
        }
        .profile-banner:hover { border-color:${S.accent}; transform:translateY(-2px); }
        .profile-banner:active { transform:scale(0.99); }
        .pb-avatar {
          width:46px; height:46px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:22px;
          border:${borderData.border}; box-shadow:${borderData.boxShadow}; background:${borderData.bgColor};
        }
        .pb-info { flex:1; min-width:0; }
        .pb-name { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
        .pb-level-badge { background:${S.accent}; color:#E0D9FF; font-size:11px; font-weight:800; padding:2px 9px; border-radius:8px; font-family:'Fredoka One',cursive; }
        .pb-title { font-size:13px; font-weight:700; color:${S.text}; font-family:'Fredoka One',cursive; }
        .pb-xp-row { display:flex; align-items:center; gap:8px; }
        .pb-xp-track { flex:1; height:5px; border-radius:100px; background:${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}; overflow:hidden; }
        .pb-xp-fill { height:100%; border-radius:100px; background:${S.accent}; transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1); }
        .pb-xp-label { font-size:10px; color:${S.muted}; font-weight:700; flex-shrink:0; white-space:nowrap; }
        .pb-stats { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }
        .pb-stat { display:flex; align-items:center; gap:4px; background:${S.surface}; border:1px solid ${S.border}; border-radius:11px; padding:3px 9px; }
        .pb-stat-val { font-size:12px; font-weight:800; color:${S.text}; font-family:'Fredoka One',cursive; }
        .combo-badge { background:linear-gradient(135deg,#FF6B6B,#FD79A8); color:#fff; padding:1px 6px; border-radius:100px; font-size:9px; font-weight:800; }

        /* Quick Actions Grid */
        .quick-actions { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 10px; 
          margin-bottom: 24px; 
          margin-bottom: 24px;
        }
        @media (max-width: 480px) {
          .quick-actions { grid-template-columns: repeat(2, 1fr); }
        }
        .qa-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          padding: 16px 10px; border-radius: 18px; border: 1.5px solid ${S.border};
          background: ${S.surface}; color: ${S.text}; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          font-family: 'Fredoka One', cursive; position: relative;
          -webkit-tap-highlight-color: transparent;
        }
        .qa-btn:hover { transform: translateY(-4px); border-color: ${S.accent}; box-shadow: 0 8px 20px ${S.accent}22; }
        .qa-btn:active { transform: scale(0.95); }
        .qa-free { position: absolute; top: 6px; right: 6px; background: #EF4444; color: #fff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 6px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4); }
        .qa-ico { font-size: 24px; }

        /* Flagship Design (v2) */
        .flagship-banner {
          background: ${dark ? 'linear-gradient(135deg,rgba(124,111,232,0.15),rgba(13,16,34,0))' : 'linear-gradient(135deg,rgba(124,111,232,0.1),#fff)'};
          border-radius: 28px; padding: 24px; margin-bottom: 24px;
          border: 1.5px solid ${dark ? 'rgba(124,111,232,0.25)' : 'rgba(124,111,232,0.15)'};
          position: relative; padding-bottom: 30px;
        }
        .fs-tag { background: ${S.accent}; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 8px; text-transform: uppercase; margin-bottom: 12px; display: inline-block; }
        .fs-title { font-family: 'Fredoka One', cursive; font-size: 28px; color: ${S.text}; margin-bottom: 8px; }
        .fs-stats { display: flex; gap: 20px; margin-bottom: 20px; border-top: 1px solid ${S.border}; padding-top: 16px; }
        .fs-stat { display: flex; flex-direction: column; gap: 2px; }
        .fs-stat-label { font-size: 10px; color: ${S.muted}; font-weight: 700; text-transform: uppercase; }
        .fs-stat-val { font-size: 15px; font-weight: 800; color: ${S.text}; font-family: 'Fredoka One', cursive; }
        .fs-btn {
          width: 100%; background: ${S.accent}; color: #fff; padding: 14px; border-radius: 16px; border: none;
          font-family: 'Fredoka One', cursive; font-size: 16px; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 8px 24px ${S.accent}44;
        }
        .fs-btn:active { transform: scale(0.96); }
        .fs-emoji { 
          position: absolute; right: -20px; top: -10px; font-size: 120px; 
          opacity: 0.15; filter: blur(2px); pointer-events: none; transform: rotate(15deg);
        }

        /* Wheel Strip */
        .wheel-strip {
          display:flex; align-items:center; justify-content:space-between;
          background:${S.accentFill}; border:1.5px solid ${S.accentBorder};
          border-radius:14px; padding:11px 16px; margin-bottom:12px;
          cursor:pointer; transition:all 0.2s;
          -webkit-tap-highlight-color:transparent;
        }
        .wheel-strip:hover { border-color:${S.accent}; transform:translateY(-2px); }
        .wheel-strip-title { font-size:13px; font-weight:700; color:${S.accent}; font-family:'Fredoka One',cursive; }
        .wheel-strip-sub { font-size:10px; color:${S.muted}; margin-top:2px; }

        /* Continue Card */
        .continue-card {
          display:flex; align-items:center; gap:14px; background:${S.surface};
          border:1.5px solid ${S.border}; border-radius:16px; padding:13px 18px;
          margin-bottom:12px; cursor:pointer; transition:all 0.2s;
          margin-bottom:12px; cursor:pointer; transition:all 0.2s;
          -webkit-tap-highlight-color:transparent;
        }
        .continue-card:hover { border-color:${S.accent}; transform:translateY(-2px); }
        .continue-card:active { transform:scale(0.99); }
        .continue-title { font-size:13px; font-weight:700; color:${S.text}; font-family:'Fredoka One',cursive; }
        .continue-sub { font-size:11px; color:${S.muted}; margin-top:2px; }

        /* Section Card */
        .section-card { background:${S.surface}; border:1.5px solid ${S.border}; border-radius:20px; padding:16px; margin-bottom:12px; }
        .sc-header { display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
        .sc-title { font-family:'Fredoka One',cursive; font-size:16px; color:${S.text}; flex:1; }
        .sc-sub { font-size:10px; color:${S.muted}; font-weight:600; }
        .sc-badge { font-size:10px; font-weight:800; padding:2px 10px; border-radius:100px; }
        .sc-done { background:${dark ? 'rgba(52,211,153,0.12)' : 'rgba(0,184,148,0.08)'}; color:${S.green}; border:1px solid ${dark ? 'rgba(52,211,153,0.25)' : 'rgba(0,184,148,0.2)'}; }
        .sc-prog { background:${S.accentFill}; color:${S.accent}; border:1px solid ${S.accentBorder}; }

        /* Challenge Rows -> Quest Cards */
        .ch-row { 
          display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:18px; 
          margin-bottom:10px; background:${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; 
          border: 1.5px solid ${S.border}; transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative; overflow: hidden;
        }
        .ch-row:hover { border-color: ${S.accent}; transform: translateY(-2px); background: ${S.accentFill}; }
        .ch-row.done { 
          background: ${dark ? 'linear-gradient(135deg, rgba(253,203,110,0.1), rgba(253,203,110,0.02))' : 'linear-gradient(135deg, rgba(249,168,37,0.06), #fff)'}; 
          border-color: rgba(253,203,110,0.4); 
          box-shadow: 0 4px 15px rgba(253,203,110,0.1);
        }
        .ch-row.claimed { opacity:0.6; grayscale: 0.5; border-style: dashed; }
        .ch-ico { 
          width:42px; height:42px; border-radius:14px; flex-shrink:0; display:flex; align-items:center; 
          justify-content:center; font-size:20px; background:${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; 
          box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
          transition: all 0.3s;
        }
        .ch-row:hover .ch-ico { transform: scale(1.1) rotate(5deg); }
        .ch-ico.done { background:linear-gradient(135deg,#FDCB6E,#F9A825); color: #fff; box-shadow: 0 4px 12px rgba(253,203,110,0.4); }
        .ch-ico.claimed { background: #4ECDC4; color: #fff; font-size: 16px; }
        .ch-info { flex:1; min-width:0; }
        .ch-desc { font-size:13px; font-weight:800; color:${S.text}; margin-bottom:6px; letter-spacing: -0.2px; }
        .ch-desc.s { text-decoration:line-through; color:${S.muted}; opacity: 0.7; }
        .ch-pb { display:flex; align-items:center; gap:8px; }
        .ch-pb-track { flex:1; height:6px; border-radius:100px; background:${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}; overflow:hidden; border: 1px solid ${S.border}; }
        .ch-pb-fill { height:100%; border-radius:100px; background:${S.accent}; transition:width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .ch-pb-fill.done { background:linear-gradient(90deg,#4ECDC4,#00B894); box-shadow: 0 0 8px #00B894; }
        .ch-pb-lbl { font-size:10px; color:${S.muted}; font-weight:800; flex-shrink:0; font-family: 'Fredoka One', cursive; }
        .ch-rwd { flex-shrink:0; text-align:right; margin-left: 8px; }
        .ch-rwd-val { font-size:11px; color:${S.gold}; font-weight:800; font-family: 'Fredoka One', cursive; }
        .ch-rwd-claimed { font-size:12px; color:${S.green}; font-weight:900; }
        .ch-claim-btn { 
          background:linear-gradient(135deg,#FDCB6E,#F9A825); border:none; border-radius:12px; 
          padding:6px 14px; color:#fff; font-size:11px; font-weight:900; cursor:pointer; 
          font-family:'Fredoka One',cursive; animation:pulse-soft 1.5s ease infinite; 
          box-shadow: 0 4px 15px rgba(253,203,110,0.3);
        }
        .ch-bonus { 
          display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:18px; 
          margin-top:12px; background:${dark ? 'rgba(124,111,232,0.1)' : 'rgba(108,92,231,0.06)'}; 
          border:2px dashed ${S.accentBorder}; cursor:pointer; transition:all 0.3s; 
          font-size:14px; font-weight:800; color:${S.accent}; font-family:'Fredoka One',cursive; 
        }
        .ch-bonus:hover { background: ${S.accentFill}; transform: scale(1.02); border-style: solid; border-color: ${S.accent}; }
        .ch-bonus.claimed { opacity:0.5; pointer-events:none; filter: grayscale(1); }

        /* Tag Filter */
        .tag-filter-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:16px; scrollbar-width:none; }
        .tag-filter-row::-webkit-scrollbar { display:none; }
        .tag-btn { flex-shrink:0; display:flex; align-items:center; gap:5px; padding:6px 14px; border-radius:100px; font-size:12px; font-weight:700; background:${S.surface}; color:${S.muted}; border:1.5px solid ${S.border}; cursor:pointer; transition:all 0.2s; font-family:'Nunito',sans-serif; white-space:nowrap; -webkit-tap-highlight-color:transparent; }
        .tag-btn:hover { border-color:${S.accent}; color:${S.accent}; }
        .tag-btn.active { color:#fff; border-color:transparent; }

        /* Section headers */
        .section-head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
        .section-title { font-family:'Fredoka One',cursive; font-size:20px; color:${S.text}; white-space:nowrap; display:flex; align-items:center; gap:8px; }
        .section-line { flex:1; height:2px; border-radius:100px; background:${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; min-width:10px; }
        .section-pill { font-size:11px; color:${S.muted}; font-weight:700; background:${S.surface}; border:1px solid ${S.border}; border-radius:100px; padding:3px 10px; flex-shrink:0; }

        /* Netflix carousel */
        .carousel-row { display:flex; gap:14px; overflow-x:auto; padding-bottom:20px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .carousel-row::-webkit-scrollbar { display:none; }
        .carousel-btn { position:absolute; top:50px; bottom:30px; width:46px; border:none; color:white; font-size:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); z-index:10; }
        section:hover .carousel-btn { opacity:0.8; }
        .carousel-btn:hover { opacity:1 !important; font-size:36px; }
        .carousel-btn.left { left:-20px; background:linear-gradient(to right,rgba(0,0,0,0.85),transparent); border-radius:14px; }
        .carousel-btn.right { right:-20px; background:linear-gradient(to left,rgba(0,0,0,0.85),transparent); border-radius:14px; }
        @media(max-width:600px) { .carousel-btn { display:none; } }

        /* Coming soon */
        .cs-card { background:${S.surface}; border:2px dashed ${S.border}; border-radius:16px; padding:15px 11px; text-align:center; position:relative; overflow:hidden; transition:all 0.2s; opacity:0.75; flex-shrink:0; width:148px; scroll-snap-align:start; }
        .cs-card:hover { opacity:0.9; transform:scale(1.03); border-style:solid; }

        /* Limited mode */
        .lm-banner { border-radius:18px; padding:18px; margin-bottom:12px; border:1.5px solid; }
        .lm-multiplier { font-size:11px; font-weight:800; padding:3px 9px; border-radius:100px; display:flex; align-items:center; gap:4px; }

        /* Footer */
        .home-footer { margin-top:56px; padding-bottom:20px; }
        .footer-divider { height:2px; border-radius:100px; margin-bottom:28px; background:${dark ? 'linear-gradient(90deg,transparent,rgba(124,111,232,0.2),rgba(78,205,196,0.2),transparent)' : 'linear-gradient(90deg,transparent,rgba(108,92,231,0.22),rgba(78,205,196,0.22),transparent)'}; }
        .footer-content { text-align:center; }
        .footer-logo { display:inline-flex; align-items:center; gap:10px; margin-bottom:10px; }
        .footer-logo-icon { width:34px; height:34px; border-radius:10px; background:${S.accent}; display:flex; align-items:center; justify-content:center; font-size:17px; }
        .footer-logo-text { font-family:'Fredoka One',cursive; font-size:19px; color:${S.accent}; }
        .footer-tagline { font-size:12px; color:${S.muted}; margin-bottom:14px; line-height:1.5; }
        .footer-credit { display:inline-flex; align-items:center; gap:8px; background:${S.accentFill}; border:1.5px solid ${S.accentBorder}; border-radius:100px; padding:7px 18px; margin-bottom:12px; transition:all 0.2s; }
        .footer-credit:hover { border-color:${S.accent}; }
        .footer-credit-name { font-family:'Fredoka One',cursive; font-size:13px; color:${S.accent}; }
        .footer-copy { font-size:11px; color:${S.muted}; opacity:0.5; font-weight:600; }

        /* Scroll to top */
        .scroll-top-btn { position:fixed; bottom:24px; right:24px; z-index:100; width:42px; height:42px; border-radius:13px; background:${S.accent}; color:#fff; border:none; font-size:18px; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; pointer-events:none; transform:translateY(20px); transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 4px 14px rgba(124,111,232,0.4); }
        .scroll-top-btn.visible { opacity:1; pointer-events:auto; transform:translateY(0); }
        .scroll-top-btn:hover { transform:translateY(-4px) scale(1.1); }



        @keyframes slide-up { from { transform:translateY(14px); } to { transform:translateY(0); } }
        @keyframes pulse-soft { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes live-pulse { 0% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.4; transform: scale(0.8); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes bg-move { from { background-position: 0 0; } to { background-position: 40px 40px; } }

        @media(max-width:600px) {
          .home-content { padding:14px 14px 60px; }
          .feat-title { font-size:18px; }
          .feat-emoji { font-size:90px; }
          .section-title { font-size:18px; }
        }
        @media(prefers-reduced-motion:reduce) {
          .profile-banner,.featured-wrap,.wheel-strip,.continue-card,.section-card,.scroll-top-btn { animation:none !important; }
        }
        body.bp-reduce-motion .profile-banner,
        body.bp-reduce-motion .featured-wrap,
        body.bp-reduce-motion .wheel-strip,
        body.bp-reduce-motion .continue-card,
        body.bp-reduce-motion .section-card { animation:none !important; }
      `}</style>

      <div className="home-root" style={{ background: tc.bg }}>
        <ParticleBackground dark={dark} reduceMotion={reduceMotion} />

        <div className="home-content">

          {/* ── Renaissance Hero Section ── */}
          <section className="renaissance-hero">

            <div className="hero-subtitle mono-label">BrainPlay.Renaissance.v1.0</div>
            <h1 className="hero-title-main serif-title">
              The <span style={{ color: S.accent }}>Discovery</span> <br />
              of Intelligence
            </h1>

            <div style={{ padding: '24px 0', borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, margin: '24px 0', position: 'relative' }}>
              <InfiniteTicker
                items={['MEMORY MASTER', 'LOGIC BOOSTER', 'VOCAB VORTEX', 'NUMBER NINJA', 'PATTERN PATH']}
                mode="serif"
                speed="30s"
              />
            </div>

            <div className="profile-strip" onClick={() => onProfile?.()}>
              <div className="pb-avatar" style={{ width: 42, height: 42, fontSize: 20 }}>
                {AVATAR_CATALOG.find(a => a.id === progress.selectedAvatar)?.emoji || '👤'}
                {progress.selectedBorder && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: '50%',
                    border: CUSTOM_BORDERS[progress.selectedBorder]?.border,
                    boxShadow: CUSTOM_BORDERS[progress.selectedBorder]?.boxShadow,
                    zIndex: 10
                  }} />
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: S.text }}>{playerName || 'User'}</div>
                <div style={{ fontSize: 10, color: S.muted, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 2 }}>
                  Tier {getSeasonInfo?.().currentTier}
                </div>
                <div>
                  <PremiumTitleBadge 
                    title={progress.selectedTitle || levelInfo.title}
                    rarity={getTitleRarity?.(progress.selectedTitle || levelInfo.title) || 'common'}
                    size="small" 
                  />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: S.gold, fontFamily: 'var(--font-display)' }}>
                  {coins.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: S.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Coins</div>
              </div>
            </div>
          </section>

          {/* ── Quick Actions Grid ── */}
          <div className="quick-actions" style={{ marginBottom: 32 }}>
            <button
              className="qa-btn"
              style={{ border: `1.5px solid ${hasFreeSpins ? S.gold : S.border}` }}
              onClick={() => { play('click'); onOpenWheel() }}
              onMouseEnter={e => onHoverQA(e, true)}
              onMouseLeave={e => onHoverQA(e, false)}
            >
              <span className="qa-ico">🎡</span>
              Wheel
              {hasFreeSpins && <span className="qa-free">FREE</span>}
            </button>
            <button
              className="qa-btn"
              onClick={() => { play('click'); onShop?.() }}
              onMouseEnter={e => onHoverQA(e, true)}
              onMouseLeave={e => onHoverQA(e, false)}
            >
              <span className="qa-ico">🏪</span>
              Shop
            </button>
            <button
              className="qa-btn"
              onClick={() => { play('click'); onGames?.() }}
              onMouseEnter={e => onHoverQA(e, true)}
              onMouseLeave={e => onHoverQA(e, false)}
            >
              <span className="qa-ico">🎮</span>
              Games
            </button>
            <button
              className="qa-btn"
              onClick={() => { play('click'); onFriends?.() }}
              onMouseEnter={e => onHoverQA(e, true)}
              onMouseLeave={e => onHoverQA(e, false)}
            >
              <span className="qa-ico">🤝</span>
              Friends
            </button>
          </div>

          <div style={{ marginBottom: 32 }}>
            <InfiniteTicker
              items={['SYSTEMS READY', 'DAILY CHALLENGE UPDATED', 'COMMUNITY RECORD BROKEN', 'EVENT ACTIVE']}
              mode="mono"
              speed="45s"
            />
          </div>

          {/* ── Interactive Companion Mascot ── */}
          <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6}>
          <BorderGlow glowColor={S.accent} borderRadius="24px" style={{ display: 'block', width: '100%', marginBottom: 32 }}>
          <div
            id="mascot-home-card"
            style={{
              background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: 24,
              padding: '16px 20px',
              border: `1.5px solid ${S.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              animation: 'slide-up 0.4s 0.1s ease both',
              boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
            }}
          >
            {/* Mascot Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 20, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(124,111,232,0.15) 0%, rgba(124,111,232,0.05) 100%)',
              border: '2px solid rgba(124,111,232,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, boxShadow: '0 4px 15px rgba(124,111,232,0.15)',
              position: 'relative'
            }}>
              <Mascot skin={progress.selectedMascotSkin} hat={progress.selectedMascotHat} size={44} expression="happy" />
              {/* Level Badge directly inside Avatar */}
              <div style={{
                  position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
                  background: S.accent, color: '#fff', fontSize: 9, fontWeight: 900,
                  padding: '2px 8px', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: `1px solid ${dark ? '#1a1a2e' : '#fff'}`, whiteSpace: 'nowrap'
              }}>
                LVL {levelInfo.level}
              </div>
            </div>

            {/* Info Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              {/* Name and Action */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: S.text, letterSpacing: '0.5px', transform: 'translateY(-2px)' }}>{progress.mascotName || 'Brainy'}</h3>
                <button 
                  style={{ 
                    padding: '6px 14px', fontSize: 11, fontWeight: 800, borderRadius: 12,
                    background: 'rgba(124,111,232,0.1)', color: S.accent, border: `1.5px solid rgba(124,111,232,0.4)`,
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,111,232,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,111,232,0.1)'}
                  onClick={() => { play('click'); window.dispatchEvent(new CustomEvent('openShop', { detail: { tab: 'mascotSkins' } })) }}
                >
                  STUDIO <span>🎨</span>
                </button>
              </div>

              {/* Stats Area */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255, 215, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🪙</div>
                  <div>
                    <div style={{ fontSize: 9, color: S.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Koin</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#FFD700', lineHeight: 1 }}>{progress.coins || 0}</div>
                  </div>
                </div>
                <div style={{ width: 1.5, height: 20, background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(124, 111, 232, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✨</div>
                  <div>
                    <div style={{ fontSize: 9, color: S.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Total XP</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: S.accent, lineHeight: 1 }}>{progress.xp || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </BorderGlow>
          </Tilt>

          {/* ── Flagship Design (v2) ── */}
          {flagshipGame && (
            <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4}>
            <BorderGlow glowColor="rgba(82, 30, 148, 0.7)" borderRadius="20px" style={{ display: 'block', width: '100%' }}>
            <div className="flagship-banner" data-anime-reveal>
              <div className="fs-emoji">{flagshipGame.emoji}</div>
              <div className="fs-tag">Game Favorit</div>
              <h2 className="fs-title">{flagshipGame.title}</h2>
              <div style={{ fontSize: 13, color: S.muted, marginBottom: 20, fontWeight: 600 }}>{flagshipGame.description}</div>

              <div className="fs-stats">
                <div className="fs-stat">
                  <span className="fs-stat-label">Terbaik</span>
                  <span className="fs-stat-val">{(progress.gameBests?.[flagshipGame.id] || 0).toLocaleString()}</span>
                </div>
                <div className="fs-stat">
                  <span className="fs-stat-label">Rank</span>
                  <span className="fs-stat-val">#12</span>
                </div>
                <div className="fs-stat">
                  <span className="fs-stat-label">XP</span>
                  <span className="fs-stat-val" style={{ color: S.accent }}>+500</span>
                </div>
              </div>

              <button className="fs-btn" onClick={() => { play('click'); setSelectedGameForModal(flagshipGame.id) }}>
                MAINKAN SEKARANG
              </button>
            </div>
            </BorderGlow>
            </Tilt>
          )}

          {/* ── Battle Pass Season Banner ── */}
          {(() => {
            const seasonInfo = getSeasonInfo?.()
            if (!seasonInfo) return null
            const pct = Math.round(seasonInfo.progress * 100)
            return (
              <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4}>
              <BorderGlow glowColor="#00f5ff" borderRadius="20px" style={{ display: 'block', width: '100%', marginBottom: 16 }}>
              <div
                className="section-card"
                style={{
                  background: 'linear-gradient(135deg, #020118, #1A1F35)',
                  border: '1.5px solid rgba(0,245,255,0.25)',
                  boxShadow: '0 8px 30px rgba(0,245,255,0.1)',
                  position: 'relative', overflow: 'hidden',
                  marginBottom: 0
                }}
                onClick={() => { play('click'); window.dispatchEvent(new CustomEvent('openBP')) }}
              >
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.1, pointerEvents: 'none' }}>⚡</div>
                <div className="sc-header" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span className="sc-title" style={{ color: '#00f5ff' }}>Season 1: Neon Genesis</span>
                  <span className="sc-badge" style={{ background: 'rgba(0,245,255,0.15)', color: '#00f5ff', border: '1px solid rgba(0,245,255,0.3)' }}>
                    Tier {seasonInfo.currentTier}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div className="pb-xp-track" style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="pb-xp-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00f5ff, #a29bfe)', boxShadow: '0 0 10px #00f5ff' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#00f5ff' }}>{pct}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    {seasonInfo.xpInTier} / {seasonInfo.xpNeededForNext} XP ke Tier {seasonInfo.currentTier + 1}
                  </span>
                  {seasonInfo.hasRewardToClaim && (
                    <span style={{ fontSize: 10, color: '#FFD700', fontWeight: 800, animation: 'pulse-soft 1.5s infinite' }}>
                      🎁 Hadiah Tersedia!
                    </span>
                  )}
                </div>
              </div>
              </BorderGlow>
              </Tilt>
            )
          })()}

          {/* ── Main Lagi (Carousel v2) ── */}
          <div id="games-section" style={{ marginBottom: 28, animation: 'slide-up 0.4s 0.12s ease both' }}>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 className="section-title"><span>🕒</span>Main Lagi</h2>
              <div className="section-line" />
            </div>
            <div className="carousel-row" style={{ gap: 12 }}>
              {games.slice(0, 5).map(g => (
                <div
                  key={g.id}
                  className="premium-card"
                  style={{
                    flexShrink: 0, width: 100, height: 100,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, cursor: 'pointer', background: S.surfaceDeep
                  }}
                  onClick={() => { play('click'); setSelectedGameForModal(g.id) }}
                >
                  <span style={{ fontSize: 32 }}>{g.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: S.muted, textAlign: 'center', width: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Lucky Wheel Strip ── */}
          {hasFreeSpins && (
            <div className="wheel-strip" onClick={() => { play('click'); onOpenWheel() }}>
              <div>
                <div className="wheel-strip-title">🎰 Lucky Wheel — Spin Gratis Tersedia!</div>
              </div>
              <span style={{ fontSize: 22, animation: 'spin 3s linear infinite' }}>🎡</span>
            </div>
          )}

          {/* Daily Challenges are now standalone in the new layout */}

          {/* ── Misi Harian (New Component) ── */}
          <DailyChallengeBoard />

            {currentMode && (
              <div
                className="lm-banner"
                style={{
                  background: `linear-gradient(135deg,${currentMode.color}22,${currentMode.color}08)`,
                  borderColor: isBonusClaimedToday(currentMode.id) ? S.green : `${currentMode.color}44`,
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 0.4s'
                }}
              >
                {/* Background Pattern Animation */}
                <div style={{
                  position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
                  backgroundImage: `radial-gradient(${currentMode.color} 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                  animation: 'bg-move 20s linear infinite'
                }} />

                {/* Scanline effect */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(to right, transparent, ${currentMode.color}, transparent)`,
                  opacity: 0.2, animation: 'scanline 3s linear infinite',
                  pointerEvents: 'none'
                }} />

                {isBonusClaimedToday(currentMode.id) && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'grayscale(1) blur(2px)', zIndex: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.5s ease both'
                  }}>
                    <div style={{
                      transform: 'rotate(-12deg)', border: `4px solid ${S.green}`,
                      color: S.green, padding: '10px 30px', borderRadius: 16,
                      fontFamily: "'Fredoka One',cursive", fontSize: 32,
                      boxShadow: `0 0 20px ${S.green}66`,
                      background: 'rgba(0,0,0,0.6)'
                    }}>COMPLETED!</div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ fontSize: 32 }}>{currentMode.emoji}</span>
                        {!isBonusClaimedToday(currentMode.id) && (
                          <div style={{
                            position: 'absolute', top: -4, right: -4,
                            width: 10, height: 10, borderRadius: '50%',
                            background: '#FF6B6B', border: `2px solid ${dark ? '#1A1F35' : '#fff'}`,
                            animation: 'live-pulse 1.2s infinite'
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 18, color: currentMode.color }}>{currentMode.name}</div>
                          {!isBonusClaimedToday(currentMode.id) && (
                            <div style={{
                              background: '#FF6B6B', color: '#fff', fontSize: 8,
                              fontWeight: 900, padding: '1px 6px', borderRadius: 4,
                              letterSpacing: 0.5, animation: 'pulse-soft 2s infinite'
                            }}>LIVE</div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: S.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>EVENT TERBATAS</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: dark ? '#CBD5E1' : S.text, margin: '0 0 12px', lineHeight: 1.6, fontWeight: 600 }}>{currentMode.desc}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[['🪙', currentMode.coinMultiplier], ['⭐', currentMode.xpMultiplier]].map(([ico, mult]) => (
                          <div key={ico} className="lm-multiplier" style={{ background: `${currentMode.color}22`, border: `1px solid ${currentMode.color}33`, color: S.muted, padding: '4px 10px' }}>
                            {ico} <span style={{ color: currentMode.color, fontWeight: 800 }}>×{mult}</span>
                          </div>
                        ))}
                      </div>

                      {/* Futuristic Event Timer Style */}
                      <div style={{
                        flex: 1, height: 32, background: 'rgba(0,0,0,0.2)',
                        borderRadius: 8, border: `1px solid ${currentMode.color}33`,
                        display: 'flex', alignItems: 'center', padding: '0 10px',
                        fontFamily: 'monospace', fontSize: 11, color: currentMode.color
                      }}>
                        <span style={{ opacity: 0.5, marginRight: 6 }}>ENDS:</span>
                        <span style={{ fontWeight: 800, letterSpacing: 0.5 }}>{modeTimeLeft}</span>
                      </div>
                    </div>
                  </div>

                  {!isBonusClaimedToday(currentMode.id) && (
                    <button
                      style={{
                        background: `linear-gradient(135deg,${currentMode.color},${currentMode.color}cc)`,
                        color: '#fff', border: 'none', borderRadius: 16, padding: '14px 24px',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                        fontFamily: "'Fredoka One',cursive",
                        boxShadow: `0 8px 24px ${currentMode.color}55`,
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                      onClick={() => {
                        markBonusAsClaimed(currentMode.id)
                        trackLimitedModeBonus(currentMode.id, currentMode.name, 'event_bonus_claim', `Coins: ${currentMode.coinMultiplier}×, XP: ${currentMode.xpMultiplier}×`)
                        trackEvent('limited_mode_bonus', { event_id: currentMode.id, event_name: currentMode.name })
                        play('levelUp')
                        if (games?.length > 0) {
                          const rng = games[Math.floor(Math.random() * games.length)]
                          setTimeout(() => onPlay(rng.id), 300)
                        }
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${currentMode.color}77` }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 24px ${currentMode.color}55` }}
                    >
                      Ikut Event ➔
                    </button>
                  )}
                </div>
              </div>
            )}
          {/* ── CTA Semua Game ── */}
          <BorderGlow glowColor="rgba(255, 118, 117, 0.8)" borderRadius="20px" style={{ display: 'block', width: '100%', marginBottom: 32 }}>
          <div
            className="section-card"
            style={{
              background: dark ? 'linear-gradient(135deg, #7C6FE8 0%, #FD79A8 100%)' : 'linear-gradient(135deg, #6C5CE7 0%, #FF7675 100%)',
              color: '#fff', textAlign: 'center', padding: '36px 20px', cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(124,111,232,0.3)', border: 'none', margin: '0',
              animation: 'slide-up 0.4s ease both'
            }}
            onClick={() => { play('click'); onGames?.() }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ fontSize: 56, marginBottom: 12, animation: 'pulse-soft 2s infinite' }}>🎮🔍</div>
            <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 26, margin: '0 0 8px 0', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              Pustaka Game Lengkap!
            </h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.9, fontWeight: 700, maxWidth: 400, marginInline: 'auto', lineHeight: 1.5 }}>
              Masih banyak petualangan yang menunggumu. Jelajahi {games.length}+ game seru lainnya di menu Katalog.
            </p>
            <div style={{
              display: 'inline-block', background: '#fff', color: '#6C5CE7', padding: '12px 28px',
              borderRadius: 100, fontSize: 15, fontWeight: 800, marginTop: 24, fontFamily: "'Fredoka One',cursive",
              boxShadow: '0 6px 16px rgba(0,0,0,0.15)'
            }}>LIHAT SEMUA GAME ➔</div>
          </div>
          </BorderGlow>

          {/* ── Roadmap ── */}
          {ROADMAP_FUTURE.length > 0 && (
            <section id="roadmap-section" data-anime-section style={{ position: 'relative', marginBottom: 36 }}>
              <div className="section-head">
                <h2 className="section-title"><span>🚀</span>Segera Hadir</h2>
                <span className="section-pill">wishlist</span>
                <div className="section-line" />
              </div>
              <div className="carousel-row">
                {ROADMAP_FUTURE.map(g => (
                  <div key={g.title} className="cs-card">
                    <div style={{ position: 'absolute', top: 8, right: 8, background: `${g.color}22`, color: g.color, fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 100, border: `1px solid ${g.color}44`, textTransform: 'uppercase', letterSpacing: 0.5 }}>konsep</div>
                    <div style={{ fontSize: 30, marginBottom: 6 }}>{g.emoji}</div>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: S.text, marginBottom: 3 }}>{g.title}</div>
                    <div style={{ fontSize: 10, color: S.muted, marginBottom: 7, lineHeight: 1.3 }}>{g.blurb}</div>
                    <span style={{ background: `${g.color}22`, color: g.color, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 100, border: `1px solid ${g.color}33` }}>{g.tag}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Footer ── */}
          <footer className="home-footer" data-anime-section>
            <div className="footer-divider" />
            <div className="footer-content">
              <div className="footer-logo">
                <div className="footer-logo-icon">🎮</div>
                <span className="footer-logo-text">BrainPlay</span>
              </div>
              <p className="footer-tagline">
                Santai &amp; mengasah otak — {gameTotal} game, misi harian, dan tema yang bisa dikoleksi
              </p>

              {/* AKSA Interactive Studio Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: dark ? 'rgba(232,93,47,0.06)' : 'rgba(232,93,47,0.04)',
                border: `1.5px solid ${dark ? 'rgba(232,93,47,0.18)' : 'rgba(232,93,47,0.14)'}`,
                borderRadius: 14, padding: '8px 18px', marginBottom: 10,
                transition: 'all 0.2s',
              }}>
                <img
                  src="/aksa_logo.png"
                  alt="AKSA Interactive"
                  style={{
                    height: 28, width: 'auto', objectFit: 'contain',
                    borderRadius: 6,
                    filter: dark ? 'brightness(1.1)' : 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: S.muted, fontWeight: 600 }}>Developed by </span>
                <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 12, color: dark ? '#E85D2F' : '#D4441A' }}>AKSA Interactive</span>
              </div>

              <div className="footer-credit">
                <span style={{ fontSize: 12, color: S.muted, fontWeight: 600 }}>Dibuat dengan ❤️ oleh</span>
                <span className="footer-credit-name">Dwi Agus Hidayat</span>
              </div>
              <p className="footer-copy">© 2026 BrainPlay v0.9.8 — Semua hak dilindungi.</p>
            </div>
          </footer>

        </div>
      </div>

      <button
        className={`scroll-top-btn${scrollTop ? ' visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll ke atas"
      >↑</button>

      {/* ── Game Detail Modal ── */}
      {selectedGameForModal && (
        <GameDetailModal
          game={games.find(g => g.id === selectedGameForModal)}
          onClose={() => setSelectedGameForModal(null)}
          onPlay={(gameId, diffId) => {
            setSelectedGameForModal(null)
            onPlay(gameId, diffId)
          }}
        />
      )}

      {/* ── Daily Welcome Modal ── */}
      {!welcomeClaimed && !hideWelcomeModal && (
        <DailyWelcomeModal onClose={() => setHideWelcomeModal(true)} />
      )}
    </>
  )
}
