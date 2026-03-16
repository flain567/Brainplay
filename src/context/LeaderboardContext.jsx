import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { db } from '../firebase.js'
import { collection, addDoc, query, orderBy, limit, getDocs, where, serverTimestamp } from 'firebase/firestore'

const LeaderboardContext = createContext(null)

const STORAGE_KEY = 'bp_leaderboard'
const NICKNAME_KEY = 'bp_nickname'
const MAX_LOCAL = 10
const MAX_ONLINE = 100

// ─── Local leaderboard (always works, no internet needed) ────────────────────

function getLocalBoards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}

function saveLocalBoards(boards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
}

function addLocalScore(gameId, diffId, entry) {
  const boards = getLocalBoards()
  const key = `${gameId}_${diffId}`
  if (!boards[key]) boards[key] = []
  boards[key].push(entry)
  boards[key].sort((a, b) => b.score - a.score)
  boards[key] = boards[key].slice(0, MAX_LOCAL)
  saveLocalBoards(boards)
  return boards[key]
}

function getLocalScores(gameId, diffId) {
  const boards = getLocalBoards()
  return boards[`${gameId}_${diffId}`] || []
}

function getLocalAllScores(gameId) {
  const boards = getLocalBoards()
  const all = []
  for (const key in boards) {
    if (key.startsWith(`${gameId}_`)) all.push(...boards[key])
  }
  all.sort((a, b) => b.score - a.score)
  return all.slice(0, MAX_LOCAL)
}

// ─── Online leaderboard (Firebase Firestore) ─────────────────────────────────
// Uses simple single-field queries to avoid needing composite indexes

async function submitOnlineScore(gameId, diffId, entry) {
  try {
    await addDoc(collection(db, 'leaderboard'), {
      gameId,
      diffId,
      name: entry.name || 'Pemain',
      score: entry.score,
      wave: entry.wave || null,
      time: entry.time || null,
      level: entry.level || null,
      createdAt: serverTimestamp(),
    })
    console.log('[Leaderboard] Online submit OK:', gameId, entry.score)
    return true
  } catch (err) {
    console.error('[Leaderboard] Online submit FAILED:', err.message)
    return false
  }
}

// Fetch all scores for a gameId, then filter & sort client-side
// This avoids composite index requirement (only needs single-field index on gameId)
async function fetchOnlineScores(gameId, diffId = null) {
  try {
    const ref = collection(db, 'leaderboard')
    // Simple query: only filter by gameId, sort client-side
    const q = query(ref, where('gameId', '==', gameId), limit(MAX_ONLINE))
    const snap = await getDocs(q)
    let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Client-side filter by difficulty if specified
    if (diffId) {
      results = results.filter(r => r.diffId === diffId)
    }

    // Client-side sort by score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0))

    // Add rank
    results = results.slice(0, 50).map((r, i) => ({ ...r, rank: i + 1 }))

    console.log('[Leaderboard] Fetched', results.length, 'scores for', gameId, diffId || 'all')
    return results
  } catch (err) {
    console.error('[Leaderboard] Fetch FAILED:', err.message)
    // If it's an index error, log the link
    if (err.message && err.message.includes('index')) {
      console.error('[Leaderboard] Firestore needs an index. Check the link in the error above.')
    }
    return null
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function LeaderboardProvider({ children }) {
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) || '')
  const [onlineCache, setOnlineCache] = useState({})
  const [loading, setLoading] = useState(false)
  const fetchCooldown = useRef({})

  const setNickname = useCallback((name) => {
    const clean = name.trim().slice(0, 20)
    setNicknameState(clean)
    localStorage.setItem(NICKNAME_KEY, clean)
  }, [])

  // Auto-submit when any game reports a result
  useEffect(() => {
    const handler = (e) => {
      const { gameId, difficultyId, score, timeSec } = e.detail || {}
      if (!gameId || !score || score <= 0) return

      const name = localStorage.getItem(NICKNAME_KEY) || 'Pemain'
      const entry = { name, score, time: timeSec || null, date: Date.now() }

      // Always save locally
      addLocalScore(gameId, difficultyId || 'easy', entry)

      // Always try to submit online (even without custom nickname)
      submitOnlineScore(gameId, difficultyId || 'easy', entry).catch(() => {})
    }
    window.addEventListener('bp-game-result', handler)
    return () => window.removeEventListener('bp-game-result', handler)
  }, [])

  // Submit score manually (both local + online)
  const submitScore = useCallback(async ({ gameId, diffId, score, wave, time, level }) => {
    const name = localStorage.getItem(NICKNAME_KEY) || 'Pemain'
    const entry = { name, score, wave: wave || null, time: time || null, level: level || null, date: Date.now() }

    // Always save locally
    const localBoard = addLocalScore(gameId, diffId, entry)

    // Always try online
    await submitOnlineScore(gameId, diffId, entry)

    return localBoard
  }, [])

  // Fetch online scores with caching & cooldown
  const getOnlineScores = useCallback(async (gameId, diffId = null, force = false) => {
    const cacheKey = `${gameId}_${diffId || 'all'}`
    const now = Date.now()

    // Cooldown: don't refetch within 15 seconds (skip if force)
    if (!force && fetchCooldown.current[cacheKey] && now - fetchCooldown.current[cacheKey] < 15000) {
      return onlineCache[cacheKey] || []
    }

    setLoading(true)
    const scores = await fetchOnlineScores(gameId, diffId)
    setLoading(false)

    if (scores !== null) {
      fetchCooldown.current[cacheKey] = now
      setOnlineCache(prev => ({ ...prev, [cacheKey]: scores }))
      return scores
    }

    return onlineCache[cacheKey] || []
  }, [onlineCache])

  // Clear all cache (used by refresh button)
  const clearCache = useCallback(() => {
    fetchCooldown.current = {}
    setOnlineCache({})
  }, [])

  // Get local scores
  const getLocalBoard = useCallback((gameId, diffId = null) => {
    if (diffId) return getLocalScores(gameId, diffId)
    return getLocalAllScores(gameId)
  }, [])

  return (
    <LeaderboardContext.Provider value={{
      nickname,
      setNickname,
      submitScore,
      getOnlineScores,
      getLocalBoard,
      clearCache,
      loading,
    }}>
      {children}
    </LeaderboardContext.Provider>
  )
}

export function useLeaderboard() { return useContext(LeaderboardContext) }
