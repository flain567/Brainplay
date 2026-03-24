import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const DailyChallengeContext = createContext(null)

const STORAGE_KEY = 'bp_daily_challenges'

// ─── Game metadata for challenge generation ─────────────────────────────────

const GAME_META = [
  { id: 'memory-card',   name: 'Memory Card',   emoji: '🃏' },
  { id: 'slither-worm',  name: 'Slither Worm',  emoji: '🐍' },
  { id: '2048',          name: 'Connect Blocks', emoji: '🔗' },
  { id: 'word-search',   name: 'Word Search',    emoji: '🔍' },
  { id: 'space-shooter', name: 'Space Shooter',  emoji: '🚀' },
  { id: 'hangman',       name: 'Hangman',        emoji: '💀' },
  { id: 'color-sort',    name: 'Color Sort',     emoji: '🧪' },
  { id: 'sudoku',        name: 'Sudoku',         emoji: '🔢' },
  { id: 'jigsaw',         name: 'Jigsaw Puzzle',     emoji: '🧩' },
  { id: 'memory-pattern', name: 'Memory Pattern Pro', emoji: '🧠' },
  { id: 'reaction-test',  name: 'Reaction Test',     emoji: '⚡' },
  { id: 'neon-dash',     name: 'Neon Dash',       emoji: '💎' },
  { id: 'brick-breaker', name: 'Brick Breaker',  emoji: '🧱' },
]

// ─── Challenge templates ────────────────────────────────────────────────────

const CHALLENGE_TEMPLATES = [
  // Play count challenges
  { type: 'play_count', target: 2, reward: 15, icon: '🎮',
    desc: 'Mainkan 2 game', category: 'easy' },
  { type: 'play_count', target: 3, reward: 20, icon: '🎮',
    desc: 'Mainkan 3 game', category: 'easy' },
  { type: 'play_count', target: 5, reward: 30, icon: '🎮',
    desc: 'Mainkan 5 game', category: 'medium' },

  // Win challenges
  { type: 'win_count', target: 1, reward: 20, icon: '🏆',
    desc: 'Menangkan 1 game', category: 'easy' },
  { type: 'win_count', target: 2, reward: 30, icon: '🏆',
    desc: 'Menangkan 2 game', category: 'medium' },
  { type: 'win_count', target: 3, reward: 45, icon: '🏆',
    desc: 'Menangkan 3 game', category: 'hard' },

  // Play specific game
  { type: 'play_game', target: 1, reward: 15, icon: '🎯',
    desc: 'Mainkan {game}', category: 'easy', needsGame: true },

  // Win specific game
  { type: 'win_game', target: 1, reward: 25, icon: '⭐',
    desc: 'Menangkan {game}', category: 'medium', needsGame: true },

  // Score threshold
  { type: 'score_min', target: 500, reward: 25, icon: '💯',
    desc: 'Capai skor 500+ di game apapun', category: 'medium' },
  { type: 'score_min', target: 1000, reward: 35, icon: '💯',
    desc: 'Capai skor 1000+ di game apapun', category: 'hard' },

  // Difficulty challenges
  { type: 'play_hard', target: 1, reward: 25, icon: '🔴',
    desc: 'Mainkan game di mode Sulit', category: 'medium' },
  { type: 'win_hard', target: 1, reward: 40, icon: '💪',
    desc: 'Menangkan game di mode Sulit', category: 'hard' },
  { type: 'play_medium', target: 2, reward: 20, icon: '🟡',
    desc: 'Mainkan 2 game di mode Sedang', category: 'easy' },

  // Unique games
  { type: 'play_unique', target: 2, reward: 20, icon: '🧭',
    desc: 'Mainkan 2 game berbeda', category: 'easy' },
  { type: 'play_unique', target: 3, reward: 30, icon: '🧭',
    desc: 'Mainkan 3 game berbeda', category: 'medium' },

  // Three star
  { type: 'three_star', target: 1, reward: 30, icon: '⭐',
    desc: 'Dapatkan 3 bintang', category: 'medium' },
  { type: 'three_star', target: 2, reward: 45, icon: '🌟',
    desc: 'Dapatkan 3 bintang di 2 game', category: 'hard' },
]

// ─── Deterministic seeded random (based on date) ────────────────────────────

function seedFromDate(dateStr) {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // "2026-03-16"
}

// ─── Generate 3 challenges for today ────────────────────────────────────────

function generateDailyChallenges(dateKey) {
  const seed = seedFromDate(dateKey)
  const rng = seededRandom(seed)

  // Pick 1 easy, 1 medium, 1 hard (or medium)
  const easy = CHALLENGE_TEMPLATES.filter(t => t.category === 'easy')
  const medium = CHALLENGE_TEMPLATES.filter(t => t.category === 'medium')
  const hard = CHALLENGE_TEMPLATES.filter(t => t.category === 'hard')

  const pick = (arr) => arr[Math.floor(rng() * arr.length)]

  const picks = [pick(easy), pick(medium), pick(hard.length > 0 ? hard : medium)]

  // Assign games to challenges that need them
  return picks.map((template, idx) => {
    const challenge = { ...template, id: `${dateKey}_${idx}` }
    if (template.needsGame) {
      const game = GAME_META[Math.floor(rng() * GAME_META.length)]
      challenge.gameId = game.id
      challenge.desc = template.desc.replace('{game}', game.name)
      challenge.icon = game.emoji
    }
    return challenge
  })
}

const ALL_COMPLETE_BONUS = 25

// ─── Load/save state ────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function DailyChallengeProvider({ children }) {
  const todayKey = getTodayKey()
  const challenges = generateDailyChallenges(todayKey)

  const [state, setState] = useState(() => {
    const saved = loadState()
    // Reset if it's a new day
    if (saved.dateKey !== todayKey) {
      return {
        dateKey: todayKey,
        progress: {}, // { challengeId: currentProgress }
        claimed: {},   // { challengeId: true }
        bonusClaimed: false,
        todayStats: {
          gamesPlayed: 0,
          gamesWon: 0,
          uniqueGames: [],
          hardPlayed: 0,
          hardWon: 0,
          mediumPlayed: 0,
          maxScore: 0,
          threeStars: 0,
        },
      }
    }
    return saved
  })

  // Save whenever state changes
  useEffect(() => {
    saveState(state)
  }, [state])

  // Calculate progress for each challenge based on todayStats
  const getChallengeProgress = useCallback((challenge) => {
    const stats = state.todayStats || {}
    switch (challenge.type) {
      case 'play_count':
        return Math.min(stats.gamesPlayed || 0, challenge.target)
      case 'win_count':
        return Math.min(stats.gamesWon || 0, challenge.target)
      case 'play_game':
        return (stats.uniqueGames || []).includes(challenge.gameId) ? 1 : 0
      case 'win_game': {
        const wins = state.progress[challenge.id] || 0
        return Math.min(wins, challenge.target)
      }
      case 'score_min':
        return (stats.maxScore || 0) >= challenge.target ? 1 : 0
      case 'play_hard':
        return Math.min(stats.hardPlayed || 0, challenge.target)
      case 'win_hard':
        return Math.min(stats.hardWon || 0, challenge.target)
      case 'play_medium':
        return Math.min(stats.mediumPlayed || 0, challenge.target)
      case 'play_unique':
        return Math.min((stats.uniqueGames || []).length, challenge.target)
      case 'three_star':
        return Math.min(stats.threeStars || 0, challenge.target)
      default:
        return 0
    }
  }, [state])

  // Check if challenge is completed
  const isChallengeComplete = useCallback((challenge) => {
    return getChallengeProgress(challenge) >= challenge.target
  }, [getChallengeProgress])

  // Check if challenge reward is claimed
  const isChallengeClaimed = useCallback((challengeId) => {
    return !!state.claimed[challengeId]
  }, [state.claimed])

  // Track game result
  const trackGameResult = useCallback(({ gameId, difficultyId, won, score, stars }) => {
    if (getTodayKey() !== state.dateKey) return // Stale state, ignore

    setState(prev => {
      const next = { ...prev, todayStats: { ...prev.todayStats } }
      const stats = next.todayStats

      stats.gamesPlayed = (stats.gamesPlayed || 0) + 1

      if (won) stats.gamesWon = (stats.gamesWon || 0) + 1

      // Track unique games
      const uniqueSet = new Set(stats.uniqueGames || [])
      uniqueSet.add(gameId)
      stats.uniqueGames = [...uniqueSet]

      // Track difficulty
      if (difficultyId === 'hard') {
        stats.hardPlayed = (stats.hardPlayed || 0) + 1
        if (won) stats.hardWon = (stats.hardWon || 0) + 1
      }
      if (difficultyId === 'medium') {
        stats.mediumPlayed = (stats.mediumPlayed || 0) + 1
      }

      // Track max score
      if (score && score > (stats.maxScore || 0)) {
        stats.maxScore = score
      }

      // Track 3 stars
      if (stars === 3) {
        stats.threeStars = (stats.threeStars || 0) + 1
      }

      // Track win_game specific progress
      if (won) {
        const progress = { ...prev.progress }
        challenges.forEach(c => {
          if (c.type === 'win_game' && c.gameId === gameId) {
            progress[c.id] = (progress[c.id] || 0) + 1
          }
        })
        next.progress = progress
      }

      return next
    })
  }, [state.dateKey, challenges])

  // Listen to game results
  useEffect(() => {
    const handler = (e) => {
      const { gameId, difficultyId, won, score, stars } = e.detail || {}
      if (!gameId) return
      trackGameResult({ gameId, difficultyId, won, score, stars })
    }
    window.addEventListener('bp-game-result', handler)
    return () => window.removeEventListener('bp-game-result', handler)
  }, [trackGameResult])

  // Claim a challenge reward
  const claimChallenge = useCallback((challengeId) => {
    if (state.claimed[challengeId]) return 0
    const challenge = challenges.find(c => c.id === challengeId)
    if (!challenge || !isChallengeComplete(challenge)) return 0

    setState(prev => ({
      ...prev,
      claimed: { ...prev.claimed, [challengeId]: true },
    }))

    return challenge.reward
  }, [state.claimed, challenges, isChallengeComplete])

  // Claim all-complete bonus
  const claimBonus = useCallback(() => {
    if (state.bonusClaimed) return 0
    const allDone = challenges.every(c => isChallengeComplete(c))
    if (!allDone) return 0

    setState(prev => ({ ...prev, bonusClaimed: true }))
    return ALL_COMPLETE_BONUS
  }, [state.bonusClaimed, challenges, isChallengeComplete])

  // Computed
  const completedCount = challenges.filter(c => isChallengeComplete(c)).length
  const claimedCount = Object.keys(state.claimed).length
  const allComplete = completedCount === challenges.length
  const bonusAvailable = allComplete && !state.bonusClaimed

  return (
    <DailyChallengeContext.Provider value={{
      challenges,
      getChallengeProgress,
      isChallengeComplete,
      isChallengeClaimed,
      claimChallenge,
      claimBonus,
      completedCount,
      claimedCount,
      allComplete,
      bonusAvailable,
      bonusClaimed: state.bonusClaimed,
      allCompleteBonus: ALL_COMPLETE_BONUS,
    }}>
      {children}
    </DailyChallengeContext.Provider>
  )
}

export function useDailyChallenge() { return useContext(DailyChallengeContext) }
