import { useState, useEffect, useLayoutEffect, useRef, useCallback, lazy, Suspense } from 'react'
import GameCard from '../components/GameCard.jsx'
import ParticleBackground from '../components/ParticleBackground.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useProgress, getLevelInfo, getBorderForLevel, getTitleColorForLevel } from '../context/ProgressContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
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
gsap.registerPlugin(Flip)

const ROADMAP_FUTURE = [
  { emoji: '⌨️', title: 'Typing Speed',  tag: 'Kata',    color: '#FD79A8', blurb: 'Kecepatan mengetik' },
  { emoji: '🔀', title: 'Anagram',       tag: 'Kata',    color: '#FDCB6E', blurb: 'Acak huruf jadi kata' },
  { emoji: '📐', title: 'Nonogram',      tag: 'Puzzle',  color: '#FF6B6B', blurb: 'Tebak gambar dari angka' },
  { emoji: '♠️', title: 'Solitaire',     tag: 'Casual',  color: '#A29BFE', blurb: 'Santai satu kartu' },
  { emoji: '🀄', title: 'Mahjong',       tag: 'Casual',  color: '#00CEC9', blurb: 'Pasangkan tile' },
  { emoji: '♟️', title: 'Chess Puzzle',  tag: 'Logika',  color: '#636E72', blurb: 'Mate dalam N langkah' },
  { emoji: '🎲', title: 'Mode Surprise', tag: 'Surprise',color: '#FD79A8', blurb: 'Random challenge' },
]

const ALL_TAGS  = ['Semua', 'Puzzle', 'Casual', 'Action', 'Kata', 'Logika', 'Pengetahuan']
const TAG_META  = {
  Semua:        { icon: '🎮', color: '#A29BFE' },
  Puzzle:       { icon: '🧩', color: '#FDCB6E' },
  Casual:       { icon: '🎯', color: '#4ECDC4' },
  Action:       { icon: '🔥', color: '#FF6B6B' },
  Kata:         { icon: '📝', color: '#A29BFE' },
  Logika:       { icon: '🧠', color: '#FF6B6B' },
  Pengetahuan:  { icon: '🇮🇩', color: '#0984E3' },
}

export default function Home({ games, onPlay, onContinueLast, onProfile, onShop, onStats, onOpenWheel }) {
  const { darkMode, reduceMotion } = useSettings()
  const { play }     = useSound()
  const { progress } = useProgress()
  const { playerName } = useAuth()
  const { coins, isDailyClaimable, claimDaily, earnCoins } = useCoins()
  const {
    challenges, getChallengeProgress, isChallengeComplete,
    isChallengeClaimed, claimChallenge, claimBonus,
    completedCount, allComplete, bonusAvailable, bonusClaimed, allCompleteBonus,
  } = useDailyChallenge()
  const { currentMode, isBonusClaimedToday, markBonusAsClaimed, getNextWeekendEvent, getWeekNumber } = useLimitedMode()
  const { hasFreeSpins } = useLuckyWheel()
  const tc = useThemeColors()
  const { trackEvent } = useLocalAnalytics()
  const [scrollTop, setScrollTop] = useState(false)
  const [activeTag, setActiveTag] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGameForModal, setSelectedGameForModal] = useState(null)
  const flipStateRef = useRef(null)

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

  useHomeAnimations(reduceMotion)
  useGSAPScrollTrigger(reduceMotion)

  const levelInfo  = getLevelInfo(progress.totalXP || 0)
  const borderData = getBorderForLevel(levelInfo.level)
  const streak     = progress.currentStreak || 0
  const dark       = tc.dark

  // ScrambleText refs — harus setelah streak/coins/xp dideklarasi
  const coinsRef  = useScrambleNumber(coins,               { skipFirst: false })
  const streakRef = useScrambleNumber(streak,              { duration: 0.6, revealDelay: 0.25, skipFirst: false })
  const xpRef     = useScrambleNumber(progress.totalXP || 0, { duration: 1.0, skipFirst: false })

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

  const lastPlayed   = getLastPlayed()
  const lastGameMeta = lastPlayed ? games.find(g => g.id === lastPlayed.gameId) : null
  const lastDiffOk   = lastGameMeta?.difficulties?.some(d => d.id === lastPlayed?.difficultyId)
  const showContinue = Boolean(onContinueLast && lastGameMeta && lastDiffOk)
  const DIFF_LABEL   = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' }
  const comboMultiplier = streak >= 7 ? 2.0 : streak >= 3 ? 1.5 : streak >= 1 ? 1.2 : 1.0
  const comboLabel   = comboMultiplier > 1 ? `${comboMultiplier}×` : null
  const gameTotal    = games.length || 1

  // Flagship = highest day game
  const flagshipGame = games.length
    ? games.reduce((p, c) => (c.day > p.day ? c : p), games[0])
    : null

  // Dark-neon palette (matches mockup)
  const S = dark ? {
    surface:     '#1A1F35',
    surfaceDeep: '#0D1022',
    border:      '#252B45',
    text:        '#E2E8F0',
    muted:       '#475569',
    mutedDeep:   '#334155',
    accent:      '#7C6FE8',
    accentFill:  'rgba(124,111,232,0.14)',
    accentBorder:'rgba(124,111,232,0.35)',
    gold:        '#EAB308',
    green:       '#34D399',
  } : {
    surface:     '#FFFFFF',
    surfaceDeep: '#F8F9FC',
    border:      '#E8ECF4',
    text:        '#2D3436',
    muted:       '#636E72',
    mutedDeep:   '#8892A4',
    accent:      '#6C5CE7',
    accentFill:  'rgba(108,92,231,0.07)',
    accentBorder:'rgba(108,92,231,0.25)',
    gold:        '#F9A825',
    green:       '#00B894',
  }

  return (
    <>
      <style>{`
        .home-root { min-height:100vh; position:relative; overflow:hidden; transition:background 0.4s; padding-top: 0; }
        .home-content { position:relative; z-index:1; max-width:860px; margin:0 auto; padding:0 20px 100px; }

        /* Profile Banner */
        .profile-banner {
          display:flex; align-items:center; gap:14px;
          background:${S.surfaceDeep}; border:1.5px solid ${S.border};
          border-radius:20px; padding:14px 18px; margin-bottom:12px;
          cursor:pointer; transition:all 0.2s; animation:slide-up 0.4s ease both;
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
        .pb-xp-track { flex:1; height:5px; border-radius:100px; background:${dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)'}; overflow:hidden; }
        .pb-xp-fill { height:100%; border-radius:100px; background:${S.accent}; transition:width 0.8s cubic-bezier(0.34,1.56,0.64,1); }
        .pb-xp-label { font-size:10px; color:${S.muted}; font-weight:700; flex-shrink:0; white-space:nowrap; }
        .pb-stats { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; }
        .pb-stat { display:flex; align-items:center; gap:4px; background:${S.surface}; border:1px solid ${S.border}; border-radius:11px; padding:3px 9px; }
        .pb-stat-val { font-size:12px; font-weight:800; color:${S.text}; font-family:'Fredoka One',cursive; }
        .combo-badge { background:linear-gradient(135deg,#FF6B6B,#FD79A8); color:#fff; padding:1px 6px; border-radius:100px; font-size:9px; font-weight:800; }

        /* Quick Actions */
        .quick-actions { display:flex; gap:8px; margin-bottom:12px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; animation:slide-up 0.4s 0.05s ease both; }
        .quick-actions::-webkit-scrollbar { display:none; }
        .qa-btn {
          flex-shrink:0; display:flex; align-items:center; gap:6px;
          padding:8px 15px; border-radius:13px; border:1.5px solid ${S.border};
          background:${S.surface}; color:${S.text}; font-size:12px; font-weight:700;
          cursor:pointer; transition:all 0.2s; white-space:nowrap; font-family:'Nunito',sans-serif; position:relative;
          -webkit-tap-highlight-color:transparent;
        }
        .qa-btn:hover { transform:translateY(-2px); border-color:${S.accent}; }
        .qa-btn:active { transform:scale(0.97); }
        .qa-free { background:#EF4444; color:#fff; font-size:8px; font-weight:800; padding:1px 5px; border-radius:5px; }

        /* Flagship Design (v2) */
        .flagship-banner {
          background: ${dark ? 'linear-gradient(135deg,rgba(124,111,232,0.15),rgba(13,16,34,0))' : 'linear-gradient(135deg,rgba(124,111,232,0.1),#fff)'};
          border-radius: 28px; padding: 24px; margin-bottom: 24px;
          border: 1.5px solid ${dark ? 'rgba(124,111,232,0.25)' : 'rgba(124,111,232,0.15)'};
          position: relative; overflow: hidden;
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
          cursor:pointer; transition:all 0.2s; animation:slide-up 0.4s 0.12s ease both;
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
          animation:slide-up 0.4s 0.15s ease both; -webkit-tap-highlight-color:transparent;
        }
        .continue-card:hover { border-color:${S.accent}; transform:translateY(-2px); }
        .continue-card:active { transform:scale(0.99); }
        .continue-title { font-size:13px; font-weight:700; color:${S.text}; font-family:'Fredoka One',cursive; }
        .continue-sub { font-size:11px; color:${S.muted}; margin-top:2px; }

        /* Section Card */
        .section-card { background:${S.surface}; border:1.5px solid ${S.border}; border-radius:20px; padding:16px; margin-bottom:12px; animation:slide-up 0.4s ease both; }
        .sc-header { display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
        .sc-title { font-family:'Fredoka One',cursive; font-size:16px; color:${S.text}; flex:1; }
        .sc-sub { font-size:10px; color:${S.muted}; font-weight:600; }
        .sc-badge { font-size:10px; font-weight:800; padding:2px 10px; border-radius:100px; }
        .sc-done { background:${dark?'rgba(52,211,153,0.12)':'rgba(0,184,148,0.08)'}; color:${S.green}; border:1px solid ${dark?'rgba(52,211,153,0.25)':'rgba(0,184,148,0.2)'}; }
        .sc-prog { background:${S.accentFill}; color:${S.accent}; border:1px solid ${S.accentBorder}; }

        /* Challenge Rows */
        .ch-row { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:12px; margin-bottom:6px; background:${dark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'}; border:1px solid transparent; transition:all 0.2s; }
        .ch-row.done { background:${dark?'rgba(253,203,110,0.07)':'rgba(249,168,37,0.05)'}; border-color:${dark?'rgba(253,203,110,0.18)':'rgba(249,168,37,0.18)'}; }
        .ch-row.claimed { opacity:0.5; }
        .ch-ico { width:34px; height:34px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px; background:${dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)'}; }
        .ch-ico.done { background:linear-gradient(135deg,#FDCB6E,#F9A825); }
        .ch-ico.claimed { background:linear-gradient(135deg,#4ECDC4,#00B894); font-size:13px; }
        .ch-info { flex:1; min-width:0; }
        .ch-desc { font-size:12px; font-weight:700; color:${S.text}; margin-bottom:4px; }
        .ch-desc.s { text-decoration:line-through; color:${S.muted}; }
        .ch-pb { display:flex; align-items:center; gap:6px; }
        .ch-pb-track { flex:1; height:4px; border-radius:100px; background:${dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.06)'}; overflow:hidden; }
        .ch-pb-fill { height:100%; border-radius:100px; background:${S.accent}; transition:width 0.5s ease; }
        .ch-pb-fill.done { background:linear-gradient(90deg,#4ECDC4,#00B894); }
        .ch-pb-lbl { font-size:9px; color:${S.muted}; font-weight:700; flex-shrink:0; }
        .ch-rwd { flex-shrink:0; text-align:right; }
        .ch-rwd-val { font-size:10px; color:${S.accent}; font-weight:700; }
        .ch-rwd-claimed { font-size:11px; color:${S.green}; font-weight:800; }
        .ch-claim-btn { background:linear-gradient(135deg,#FDCB6E,#F9A825); border:none; border-radius:9px; padding:5px 12px; color:#fff; font-size:10px; font-weight:800; cursor:pointer; font-family:'Fredoka One',cursive; animation:pulse-soft 1.5s ease infinite; }
        .ch-bonus { display:flex; align-items:center; gap:10px; padding:9px 13px; border-radius:12px; margin-top:7px; background:${S.accentFill}; border:1px solid ${S.accentBorder}; cursor:pointer; transition:all 0.2s; font-size:13px; font-weight:700; color:${S.accent}; font-family:'Fredoka One',cursive; }
        .ch-bonus:hover { border-color:${S.accent}; }
        .ch-bonus.claimed { opacity:0.5; pointer-events:none; }

        /* Tag Filter */
        .tag-filter-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:16px; scrollbar-width:none; }
        .tag-filter-row::-webkit-scrollbar { display:none; }
        .tag-btn { flex-shrink:0; display:flex; align-items:center; gap:5px; padding:6px 14px; border-radius:100px; font-size:12px; font-weight:700; background:${S.surface}; color:${S.muted}; border:1.5px solid ${S.border}; cursor:pointer; transition:all 0.2s; font-family:'Nunito',sans-serif; white-space:nowrap; -webkit-tap-highlight-color:transparent; }
        .tag-btn:hover { border-color:${S.accent}; color:${S.accent}; }
        .tag-btn.active { color:#fff; border-color:transparent; }

        /* Section headers */
        .section-head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
        .section-title { font-family:'Fredoka One',cursive; font-size:20px; color:${S.text}; white-space:nowrap; display:flex; align-items:center; gap:8px; }
        .section-line { flex:1; height:2px; border-radius:100px; background:${dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)'}; min-width:10px; }
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
        .lm-banner { border-radius:18px; padding:18px; margin-bottom:12px; border:1.5px solid; animation:slide-up 0.4s 0.2s ease both; }
        .lm-multiplier { font-size:11px; font-weight:800; padding:3px 9px; border-radius:100px; display:flex; align-items:center; gap:4px; }

        /* Footer */
        .home-footer { margin-top:56px; padding-bottom:20px; }
        .footer-divider { height:2px; border-radius:100px; margin-bottom:28px; background:${dark?'linear-gradient(90deg,transparent,rgba(124,111,232,0.2),rgba(78,205,196,0.2),transparent)':'linear-gradient(90deg,transparent,rgba(108,92,231,0.22),rgba(78,205,196,0.22),transparent)'}; }
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

        /* ── Flip Grid ── */
        .flip-grid { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:36px; position:relative; min-height:80px; }
        .flip-item { width:calc(50% - 6px); flex-shrink:0; }
        @media(min-width:540px) { .flip-item { width:calc(33.333% - 8px); } }
        @media(min-width:800px) { .flip-item { width:calc(25% - 9px); } }
        .mini-card {
          background:${S.surface}; border:1.5px solid ${S.border};
          border-radius:16px; padding:14px 12px; cursor:pointer;
          transition:border-color .2s, transform .2s; height:100%;
          -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden;
        }
        .mini-card:hover { border-color:var(--mc-color); transform:translateY(-3px); }
        .mini-card:active { transform:scale(0.97); }
        .mc-emoji-bg { position:absolute; right:-8px; bottom:-12px; font-size:64px; opacity:0.12; pointer-events:none; transition:transform .3s; }
        .mini-card:hover .mc-emoji-bg { transform:scale(1.1) rotate(-8deg); opacity:0.2; }
        .mc-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .mc-icon { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .mc-day { font-size:9px; font-weight:800; color:${S.muted}; padding:2px 7px; background:${dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)'}; border-radius:7px; }
        .mc-title { font-size:12px; font-weight:500; color:${S.text}; margin-bottom:3px; line-height:1.3; }
        .mc-tag { font-size:10px; font-weight:500; margin-bottom:8px; }
        .mc-best { font-size:10px; color:${S.muted}; border-top:1px solid ${S.border}; padding-top:6px; margin-top:2px; }
        .mc-best span { font-weight:500; }
        .flip-label { font-size:12px; color:${S.muted}; margin-bottom:4px; display:flex; align-items:center; gap:6px; }

        @keyframes slide-up { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-soft { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

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

          {/* ── Welcome & Progress ── */}
          <div style={{ padding: '16px 0 24px', animation: 'slide-up 0.4s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: S.muted, fontWeight: 700, marginBottom: 4 }}>Selamat datang, {playerName || 'Pemain'}!</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pb-level-badge">LV. {levelInfo.level}</span>
                  <span style={{ fontSize: 13, color: S.muted, fontWeight: 700 }}>{levelInfo.nextThreshold - (progress.totalXP || 0)} XP lagi ke Lv.{levelInfo.level + 1}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontFamily: "'Fredoka One',cursive", color: S.accent }}>{coins.toLocaleString()} 🪙</div>
              </div>
            </div>
            <div className="pb-xp-track" style={{ height: 8 }}>
              <div className="pb-xp-fill" style={{ width: `${Math.round(levelInfo.progress * 100)}%` }} />
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="quick-actions" data-anime-dashboard>
            {isDailyClaimable && (
              <button
                className="qa-btn"
                style={{ borderColor: `${S.gold}55`, color: S.gold, background: dark ? 'rgba(234,179,8,0.08)' : 'rgba(249,168,37,0.06)' }}
                onClick={() => { play('levelUp'); claimDaily() }}
              >
                🎁 Klaim Harian
              </button>
            )}
            <button
              className="qa-btn"
              style={{ borderColor: `${S.accent}55`, color: S.accent, background: S.accentFill }}
              onClick={() => { play('click'); onOpenWheel() }}
            >
              🎡 Lucky Wheel
              {hasFreeSpins && <span className="qa-free">FREE</span>}
            </button>
            <button
              className="qa-btn"
              style={{ borderColor: `${S.gold}55`, color: S.gold, background: dark ? 'rgba(234,179,8,0.06)' : 'rgba(249,168,37,0.04)' }}
              onClick={() => { play('click'); onShop?.() }}
            >
              🏪 Shop
            </button>
            {onStats && (
              <button className="qa-btn" onClick={() => { play('click'); onStats?.() }}>
                📊 Stats
              </button>
            )}
            {onProfile && (
              <button className="qa-btn" onClick={() => { play('click'); onProfile?.() }}>
                👤 Profil
              </button>
            )}
          </div>

          {/* ── Flagship Design (v2) ── */}
          {flagshipGame && (
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
          )}

          {/* ── Main Lagi (Carousel v2) ── */}
          <div style={{ marginBottom: 28, animation: 'slide-up 0.4s 0.12s ease both' }}>
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

          {/* ── Misi Harian ── */}
          <div className="section-card" data-anime-reveal>
            <div className="sc-header">
              <span style={{ fontSize: 20 }}>⚔️</span>
              <span className="sc-title">Misi Harian</span>
              <span className="sc-sub">Reset setiap hari</span>
              {allComplete
                ? <span className="sc-badge sc-done">Selesai! 🎉</span>
                : completedCount > 0
                  ? <span className="sc-badge sc-prog">{completedCount}/{challenges.length}</span>
                  : null
              }
            </div>

            {challenges.map(ch => {
              const prog    = getChallengeProgress(ch)
              const done    = isChallengeComplete(ch)
              const claimed = isChallengeClaimed(ch.id)
              const pct     = Math.min(100, Math.round((prog / (ch.target || 1)) * 100))
              return (
                <div key={ch.id} className={`ch-row${done && !claimed ? ' done' : ''}${claimed ? ' claimed' : ''}`}>
                  <div className={`ch-ico${done && !claimed ? ' done' : ''}${claimed ? ' claimed' : ''}`}>
                    {claimed ? '✓' : ch.icon}
                  </div>
                  <div className="ch-info">
                    <div className={`ch-desc${claimed ? ' s' : ''}`}>{ch.desc}</div>
                    {!claimed && (
                      <div className="ch-pb">
                        <div className="ch-pb-track">
                          <div className={`ch-pb-fill${done ? ' done' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="ch-pb-lbl">{prog}/{ch.target}</span>
                      </div>
                    )}
                  </div>
                  <div className="ch-rwd">
                    {claimed ? (
                      <span className="ch-rwd-claimed">+{ch.reward} 🪙</span>
                    ) : done ? (
                      <button className="ch-claim-btn" onClick={() => {
                        const r = claimChallenge(ch.id)
                        if (r > 0) { play('levelUp'); earnCoins(r, `Misi: ${ch.desc}`) }
                      }}>Klaim!</button>
                    ) : (
                      <div className="ch-rwd-val">{ch.reward} 🪙</div>
                    )}
                  </div>
                </div>
              )
            })}

            {allComplete && (
              <div
                className={`ch-bonus${bonusClaimed ? ' claimed' : ''}`}
                onClick={() => {
                  if (bonusAvailable && !bonusClaimed) {
                    const r = claimBonus()
                    if (r > 0) { play('levelUp'); earnCoins(r, 'Bonus: Semua misi selesai!') }
                  }
                }}
              >
                <span style={{ fontSize: 20 }}>{bonusClaimed ? '🎉' : '🎁'}</span>
                <div style={{ flex: 1, color: bonusClaimed ? S.green : S.accent }}>
                  {bonusClaimed ? 'Bonus diklaim!' : `Semua misi selesai! Bonus ${allCompleteBonus} 🪙`}
                </div>
                {bonusAvailable && !bonusClaimed && (
                  <span style={{ fontSize: 12, color: S.accent, fontWeight: 800 }}>Klaim →</span>
                )}
              </div>
            )}
          </div>

          {/* ── Limited Mode Banner ── */}
          {currentMode && (
            <div
              className="lm-banner"
              style={{ background: `linear-gradient(135deg,${currentMode.color}18,${currentMode.color}06)`, borderColor: `${currentMode.color}44` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{currentMode.emoji}</span>
                    <div>
                      <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 17, color: currentMode.color }}>{currentMode.name}</div>
                      <div style={{ fontSize: 10, color: S.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Event Terbatas</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: S.muted, margin: '0 0 10px', lineHeight: 1.5 }}>{currentMode.desc}</p>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {[['🪙', currentMode.coinMultiplier], ['⭐', currentMode.xpMultiplier]].map(([ico, mult]) => (
                      <div key={ico} className="lm-multiplier" style={{ background: `${currentMode.color}22`, border: `1px solid ${currentMode.color}33`, color: S.muted }}>
                        {ico} <span style={{ color: currentMode.color }}>×{mult}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {!isBonusClaimedToday(currentMode.id) && (
                  <button
                    style={{ background: `linear-gradient(135deg,${currentMode.color},${currentMode.color}cc)`, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Fredoka One',cursive", boxShadow: `0 5px 14px ${currentMode.color}44`, transition: 'all 0.2s' }}
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
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Mainkan ✨
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Tag Filter (v2) ── */}
          <div className="tag-filter-row" style={{ padding: '4px 0 12px', marginBottom: 20, borderBottom: `1.5px solid ${S.border}` }}>
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                className={`tag-btn${activeTag === tag ? ' active' : ''}`}
                style={activeTag === tag 
                  ? { background: 'transparent', color: S.accent, border: 'none', borderBottom: `3px solid ${S.accent}`, borderRadius: 0, paddingBottom: 10 } 
                  : { background: 'transparent', color: S.muted, border: 'none', paddingBottom: 10 }
                }
                onClick={() => handleTagChange(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* ── Game Flip Grid ── */}
          <div>
            <div className="section-head" style={{ marginBottom: 12 }}>
              <h2 className="section-title">
                <span>{TAG_META[activeTag]?.icon || '🎮'}</span>
                {activeTag === 'Semua' ? 'Semua Game' : activeTag}
              </h2>
              <span className="section-pill">
                {activeTag === 'Semua' ? games.length : games.filter(g => g.tag === activeTag).length} game
              </span>
              <div className="section-line" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Cari game..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      background: S.surface, border: `1.5px solid ${S.border}`,
                      borderRadius: 10, padding: '6px 12px 6px 30px',
                      fontSize: 12, color: S.text, width: 140,
                      transition: 'all 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = S.accent}
                    onBlur={e => e.target.style.borderColor = S.border}
                  />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.5 }}>🔍</span>
                </div>
                <button
                  className="qa-btn"
                  style={{ padding: '6px 12px', borderRadius: 10, borderColor: S.accent, color: S.accent, background: S.accentFill }}
                  onClick={() => {
                    play('click')
                    const rng = games[Math.floor(Math.random() * games.length)]
                    onPlay(rng.id)
                  }}
                  title="Mainkan game acak!"
                >
                  🎲 Acak
                </button>
              </div>
            </div>

            {/* All cards always in DOM — Flip tracks them by key */}
            <div className="flip-grid">
              {games.map(game => {
                const isTagged = activeTag === 'Semua' || game.tag === activeTag
                const isSearched = !searchQuery || (game.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (game.tag || '').toLowerCase().includes(searchQuery.toLowerCase())
                const visible = isTagged && isSearched
                const best = (progress.gameBests || {})[game.id] || 0
                const wins = (progress.gameWins  || {})[game.id] || 0
                const meta = TAG_META[game.tag] || { color: S.accent }
                return (
                  <div
                    key={game.id}
                    className="flip-item"
                    style={{ display: visible ? '' : 'none' }}
                  >
                    <div
                      className="mini-card"
                      style={{ '--mc-color': game.color }}
                      onClick={() => { play('click'); setSelectedGameForModal(game.id) }}
                    >
                      <div className="mc-emoji-bg">{game.emoji}</div>
                      <div className="mc-top">
                        <div
                          className="mc-icon"
                          style={{ background: `${game.color}22`, border: `1.5px solid ${game.color}44` }}
                        >
                          {game.emoji}
                        </div>
                        <span className="mc-day">Hari {game.day}</span>
                      </div>
                      <div className="mc-title">{game.title}</div>
                      <div className="mc-tag" style={{ color: meta.color }}>{game.tag}</div>
                      <div className="mc-best">
                        {best > 0
                          ? <>Best: <span style={{ color: game.color }}>{best >= 1000 ? `${(best/1000).toFixed(1)}k` : best}</span>{wins > 0 && <span style={{ marginLeft: 6, color: S.muted }}>· {wins}× menang</span>}</>
                          : <span style={{ color: S.muted }}>Belum pernah main</span>
                        }
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Roadmap ── */}
          {ROADMAP_FUTURE.length > 0 && (
            <section data-anime-section style={{ position: 'relative', marginBottom: 36 }}>
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
    </>
  )
}
