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

// ─── Migration from old keys ─────────────────────────────────────────────────
// Run once on app start to move old localStorage keys to new format
export function migrateOldStorage() {
  const migrations = [
    // Old streak
    { from: 'brainplay-streak', to: StorageKeys.STREAK },
    // Old tutorial flags
    { from: 'tut-wordle',      to: StorageKeys.tutorial('word-search') },
    { from: 'tut-wordsearch',  to: StorageKeys.tutorial('word-search') },
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
