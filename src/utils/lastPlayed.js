const KEY = 'bp_last_played'

export function saveLastPlayed(gameId, difficultyId) {
  if (!gameId || !difficultyId) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ gameId, difficultyId, at: Date.now() }))
  } catch { /* ignore */ }
}

export function getLastPlayed() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p?.gameId || !p?.difficultyId) return null
    return p
  } catch {
    return null
  }
}
