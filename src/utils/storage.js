// ─── Centralized localStorage wrapper ─────────────────────────────────────────
// All game data goes through here — single source of truth for keys & migration

const PREFIX = 'bp_'

export const StorageKeys = {
  // Global
  PROFILE:     `${PREFIX}profile`,
  STREAK:      `${PREFIX}streak`,
  ACHIEVEMENTS:`${PREFIX}achievements`,
  XP:          `${PREFIX}xp`,
  DAILY:       `${PREFIX}daily`,
  // Coin & Shop
  COINS:       `${PREFIX}coins`,
  SHOP:        `${PREFIX}shop`,       // { ownedPacks: [...], activePack: 'default' }
  DAILY_CLAIM: `${PREFIX}daily_claim`, // last claim date
  // Per-game stats: bp_stats_{gameId}_{diffId}
  gameStats: (gameId, diffId) => `${PREFIX}stats_${gameId}_${diffId}`,
  // Per-game best score
  gameBest:  (gameId, diffId) => `${PREFIX}best_${gameId}_${diffId}`,
  // Settings
  DARK_MODE:   'brainplay-dark',
  MUTED:       'brainplay-muted',
  // Tutorial flags
  tutorial: (gameId) => `${PREFIX}tut_${gameId}`,
}

export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Storage write failed:', e)
  }
}

export function getNum(key, fallback = 0) {
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

export function setNum(key, value) {
  localStorage.setItem(key, String(value))
}

// ─── Clear all game data (used on logout/account switch) ────────────────────
// Preserves settings (dark mode, muted, music) but clears all game progress
export function clearGameData() {
  const preserve = ['brainplay-dark', 'brainplay-muted', 'brainplay-music-off', 'bp_device_id']
  const saved = {}
  preserve.forEach(key => {
    const val = localStorage.getItem(key)
    if (val !== null) saved[key] = val
  })

  // Remove all bp_ keys and brainplay- keys
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('bp_') || key.startsWith('brainplay-')) && !preserve.includes(key)) {
      toRemove.push(key)
    }
  }
  // Also remove game-specific keys
  toRemove.forEach(key => localStorage.removeItem(key))

  // Also remove known non-prefixed keys
  const extras = ['slither-best-easy', 'slither-best-medium', 'slither-best-hard']
  extras.forEach(key => localStorage.removeItem(key))

  // Restore preserved settings
  Object.entries(saved).forEach(([key, val]) => localStorage.setItem(key, val))

  console.log('[Storage] 🧹 Game data cleared')
}

// ─── Migration from old keys ─────────────────────────────────────────────────
// Run once on app start to move old localStorage keys to new format
export function migrateOldStorage() {
  const migrations = [
    // Old streak
    { from: 'brainplay-streak', to: StorageKeys.STREAK },
    // Old tutorial flags
    { from: 'tut-wordle',      to: StorageKeys.tutorial('word-search') },
    { from: 'tut-wordsearch',  to: StorageKeys.tutorial('word-search') },
    { from: 'tut-memory',      to: StorageKeys.tutorial('memory-card') },
    { from: 'tut-colorsort',   to: StorageKeys.tutorial('color-sort') },
    { from: 'tut-connect',     to: StorageKeys.tutorial('2048') },
    { from: 'tut-hangman',     to: StorageKeys.tutorial('hangman') },
    { from: 'tut-jigsaw',      to: StorageKeys.tutorial('jigsaw') },
    { from: 'tut-slither',     to: StorageKeys.tutorial('slither-worm') },
    { from: 'tut-space-shooter', to: StorageKeys.tutorial('space-shooter') },
    { from: 'tut-sudoku',      to: StorageKeys.tutorial('sudoku') },
  ]

  migrations.forEach(({ from, to }) => {
    const old = localStorage.getItem(from)
    if (old !== null && localStorage.getItem(to) === null) {
      localStorage.setItem(to, old)
    }
  })

  // Migrate old game stats
  const oldMappings = [
    { pattern: 'memory-best-',    gameId: 'memory-card' },
    { pattern: 'wordsearch-stats-', gameId: 'word-search' },
    { pattern: 'word-search-best-', gameId: 'word-search' },
  ]

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    for (const m of oldMappings) {
      if (key.startsWith(m.pattern)) {
        const diffId = key.replace(m.pattern, '')
        const newKey = StorageKeys.gameStats(m.gameId, diffId)
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, localStorage.getItem(key))
        }
      }
    }
  }
}
