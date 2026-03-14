import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const ProgressContext = createContext(null)

// ─── XP Level thresholds ─────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000,
  7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000,
]
const LEVEL_TITLES = [
  'Pemula', 'Penjelajah', 'Petualang', 'Penantang', 'Pejuang',
  'Pahlawan', 'Juara', 'Legenda', 'Master', 'Grandmaster',
  'Dewa Otak', 'Ultrabrain', 'Kosmik', 'Mythic', 'Immortal',
  'Transcendent', 'Omega', 'Supreme', 'Celestial', 'BrainGod',
]

export function getLevel(xp) {
  let lv = 0
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { lv = i; break }
  }
  return lv
}

export function getLevelInfo(xp) {
  const level = getLevel(xp)
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || currentThreshold + 5000
  const progress = (xp - currentThreshold) / (nextThreshold - currentThreshold)
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)],
    xp,
    currentThreshold,
    nextThreshold,
    progress: Math.min(progress, 1),
    xpToNext: nextThreshold - xp,
  }
}

// ─── Achievement Definitions ─────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // Milestone - games played
  { id: 'first_game',     icon: '🎮', title: 'Langkah Pertama',   desc: 'Selesaikan 1 game',           category: 'milestone', check: (s) => s.totalGamesPlayed >= 1 },
  { id: 'gamer_5',        icon: '🕹️', title: 'Gamer Sejati',      desc: 'Selesaikan 5 game',           category: 'milestone', check: (s) => s.totalGamesPlayed >= 5 },
  { id: 'gamer_25',       icon: '🏅', title: 'Tidak Bisa Berhenti',desc: 'Selesaikan 25 game',          category: 'milestone', check: (s) => s.totalGamesPlayed >= 25 },
  { id: 'gamer_100',      icon: '👑', title: 'Centurion',          desc: 'Selesaikan 100 game',          category: 'milestone', check: (s) => s.totalGamesPlayed >= 100 },

  // Variety - different games
  { id: 'explorer_2',     icon: '🧭', title: 'Penjelajah',         desc: 'Mainkan 2 game berbeda',       category: 'variety',   check: (s) => s.uniqueGamesPlayed >= 2 },
  { id: 'explorer_4',     icon: '🌍', title: 'Petualang Dunia',    desc: 'Mainkan semua 8 game',         category: 'variety',   check: (s) => s.uniqueGamesPlayed >= 8 },

  // Difficulty - hard mode
  { id: 'brave',          icon: '🦁', title: 'Pemberani',          desc: 'Selesaikan 1 game di mode Sulit', category: 'skill',  check: (s) => s.hardGamesWon >= 1 },
  { id: 'fearless',       icon: '⚔️', title: 'Tanpa Takut',        desc: 'Selesaikan 10 game di mode Sulit',category: 'skill',  check: (s) => s.hardGamesWon >= 10 },

  // Streak
  { id: 'streak_3',       icon: '🔥', title: 'Tiga Hari Berturut', desc: 'Main 3 hari berturut-turut',   category: 'streak',  check: (s) => s.currentStreak >= 3 },
  { id: 'streak_7',       icon: '💥', title: 'Seminggu Penuh',     desc: 'Main 7 hari berturut-turut',   category: 'streak',  check: (s) => s.currentStreak >= 7 },
  { id: 'streak_14',      icon: '🌟', title: 'Dua Minggu Nonstop', desc: 'Main 14 hari berturut-turut',  category: 'streak',  check: (s) => s.currentStreak >= 14 },
  { id: 'streak_30',      icon: '🏆', title: 'Legenda 30 Hari',   desc: 'Main 30 hari berturut-turut',  category: 'streak',  check: (s) => s.currentStreak >= 30 },

  // Score
  { id: 'score_1k',       icon: '💰', title: 'Seribu Pertama',     desc: 'Kumpulkan total 1.000 XP',     category: 'score',   check: (s) => s.totalXP >= 1000 },
  { id: 'score_5k',       icon: '💎', title: 'Kolektor XP',        desc: 'Kumpulkan total 5.000 XP',     category: 'score',   check: (s) => s.totalXP >= 5000 },
  { id: 'score_20k',      icon: '🌈', title: 'XP Miliader',        desc: 'Kumpulkan total 20.000 XP',    category: 'score',   check: (s) => s.totalXP >= 20000 },

  // Perfect
  { id: 'perfect_star',   icon: '⭐', title: 'Bintang Sempurna',   desc: 'Dapatkan 3 bintang di game apapun', category: 'perfect', check: (s) => s.threeStarCount >= 1 },
  { id: 'star_collector',  icon: '🌟', title: 'Kolektor Bintang',  desc: 'Dapatkan 3 bintang 10 kali',   category: 'perfect', check: (s) => s.threeStarCount >= 10 },

  // Speed
  { id: 'speedster',      icon: '⚡', title: 'Secepat Kilat',      desc: 'Selesaikan game dalam < 30 detik', category: 'speed', check: (s) => s.fastestGame <= 30 && s.fastestGame > 0 },

  // Per-game specific
  { id: 'memory_master',  icon: '🧠', title: 'Memori Sempurna',    desc: 'Menangkan Memory Card Match 3x', category: 'game',  check: (s) => (s.gameWins['memory-card'] || 0) >= 3 },
  { id: 'snake_king',     icon: '🐍', title: 'Raja Ular',          desc: 'Capai skor 50+ di Slither Worm',  category: 'game',  check: (s) => (s.gameBests['slither-worm'] || 0) >= 50 },
  { id: 'block_master',   icon: '🔗', title: 'Master Blok',        desc: 'Capai 1024+ di Connect Blocks',   category: 'game',  check: (s) => (s.gameBests['2048'] || 0) >= 1024 },
  { id: 'word_hunter',    icon: '🔍', title: 'Pemburu Kata',       desc: 'Selesaikan Word Search 5 kali',   category: 'game',  check: (s) => (s.gameWins['word-search'] || 0) >= 5 },
  { id: 'space_ace',      icon: '🚀', title: 'Ace Pilot',          desc: 'Menangkan Space Shooter 3x',      category: 'game',  check: (s) => (s.gameWins['space-shooter'] || 0) >= 3 },
  { id: 'hangman_hero',   icon: '💀', title: 'Penyelamat Kata',    desc: 'Menangkan Hangman 5 kali',        category: 'game',  check: (s) => (s.gameWins['hangman'] || 0) >= 5 },
  { id: 'sort_master',    icon: '🧪', title: 'Master Sortir',      desc: 'Menangkan Color Sort 5 kali',     category: 'game',  check: (s) => (s.gameWins['color-sort'] || 0) >= 5 },
  { id: 'sudoku_sage',    icon: '🔢', title: 'Ahli Sudoku',        desc: 'Menangkan Sudoku 3 kali',         category: 'game',  check: (s) => (s.gameWins['sudoku'] || 0) >= 3 },
]

// ─── Default state ───────────────────────────────────────────────────────────
function getDefaultProgress() {
  return {
    totalXP: 0,
    totalGamesPlayed: 0,
    uniqueGamesPlayed: 0,
    gamesPlayedSet: [],    // list of game IDs played
    hardGamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayDate: null,
    threeStarCount: 0,
    fastestGame: 0,        // seconds, 0 = not set
    gameWins: {},           // { gameId: count }
    gameBests: {},          // { gameId: bestScore }
    totalPlayTime: 0,       // seconds
    unlockedAchievements: [],
    newAchievements: [],    // achievements just unlocked (for notification)
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(() => {
    const saved = getJSON(StorageKeys.XP)
    return saved ? { ...getDefaultProgress(), ...saved } : getDefaultProgress()
  })

  // Save on change
  useEffect(() => {
    setJSON(StorageKeys.XP, progress)
  }, [progress])

  // Update streak on mount
  useEffect(() => {
    setProgress(p => {
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()

      if (p.lastPlayDate === today) return p // already counted today

      let newStreak = p.currentStreak
      if (p.lastPlayDate === yesterday) {
        newStreak = p.currentStreak + 1
      } else if (p.lastPlayDate !== today) {
        newStreak = 1
      }

      return {
        ...p,
        currentStreak: newStreak,
        maxStreak: Math.max(p.maxStreak, newStreak),
        lastPlayDate: today,
      }
    })
  }, [])

  // Report a game result
  const reportGameResult = useCallback(({ gameId, difficultyId, won, score, stars, timeSec }) => {
    setProgress(p => {
      const next = { ...p }

      // XP calculation
      let xpGain = 20 // base for playing
      if (won) xpGain += 30
      if (score) xpGain += Math.min(Math.floor(score / 10), 50) // cap at 50 bonus
      if (stars === 3) xpGain += 25
      if (difficultyId === 'hard') xpGain += 15
      if (difficultyId === 'medium') xpGain += 5

      next.totalXP = (next.totalXP || 0) + xpGain
      next.totalGamesPlayed = (next.totalGamesPlayed || 0) + 1

      // Track date
      next.lastPlayDate = new Date().toDateString()

      // Unique games
      const gamesSet = new Set(next.gamesPlayedSet || [])
      gamesSet.add(gameId)
      next.gamesPlayedSet = [...gamesSet]
      next.uniqueGamesPlayed = gamesSet.size

      // Hard mode wins
      if (won && difficultyId === 'hard') {
        next.hardGamesWon = (next.hardGamesWon || 0) + 1
      }

      // 3-star count
      if (stars === 3) {
        next.threeStarCount = (next.threeStarCount || 0) + 1
      }

      // Fastest game
      if (won && timeSec && timeSec > 0) {
        if (!next.fastestGame || timeSec < next.fastestGame) {
          next.fastestGame = timeSec
        }
      }

      // Per-game wins
      if (won) {
        next.gameWins = { ...next.gameWins }
        next.gameWins[gameId] = (next.gameWins[gameId] || 0) + 1
      }

      // Per-game best scores
      if (score && score > 0) {
        next.gameBests = { ...next.gameBests }
        if (!next.gameBests[gameId] || score > next.gameBests[gameId]) {
          next.gameBests[gameId] = score
        }
      }

      // Play time
      if (timeSec) {
        next.totalPlayTime = (next.totalPlayTime || 0) + timeSec
      }

      // Check achievements
      const alreadyUnlocked = new Set(next.unlockedAchievements || [])
      const newlyUnlocked = []
      for (const ach of ACHIEVEMENTS) {
        if (alreadyUnlocked.has(ach.id)) continue
        if (ach.check(next)) {
          alreadyUnlocked.add(ach.id)
          newlyUnlocked.push(ach.id)
        }
      }
      next.unlockedAchievements = [...alreadyUnlocked]
      next.newAchievements = newlyUnlocked

      return next
    })
  }, [])

  // Clear new achievement notifications
  const clearNewAchievements = useCallback(() => {
    setProgress(p => ({ ...p, newAchievements: [] }))
  }, [])

  return (
    <ProgressContext.Provider value={{ progress, reportGameResult, clearNewAchievements, getLevelInfo: () => getLevelInfo(progress.totalXP) }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
