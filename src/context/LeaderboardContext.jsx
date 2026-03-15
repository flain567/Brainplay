import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { db } from '../firebase.js'
import { collection, addDoc, query, orderBy, limit, getDocs, where, serverTimestamp } from 'firebase/firestore'

const LeaderboardContext = createContext(null)

const STORAGE_KEY = 'bp_leaderboard'
const NICKNAME_KEY = 'bp_nickname'
const MAX_LOCAL = 10
const MAX_ONLINE = 50

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

async function submitOnlineScore(gameId, diffId, entry) {
  try {
    await addDoc(collection(db, 'leaderboard'), {
      gameId,
      diffId,
      name: entry.name,
      score: entry.score,
      wave: entry.wave || null,
      time: entry.time || null,
      level: entry.level || null,
      createdAt: serverTimestamp(),
    })
    return true
  } catch (err) {
    console.warn('Firebase submit failed:', err.message)
    return false
  }
}

async function fetchOnlineScores(gameId, diffId = null) {
  try {
    const ref = collection(db, 'leaderboard')
    let q
    if (diffId) {
      q = query(ref, where('gameId', '==', gameId), where('diffId', '==', diffId), orderBy('score', 'desc'), limit(MAX_ONLINE))
    } else {
      q = query(ref, where('gameId', '==', gameId), orderBy('score', 'desc'), limit(MAX_ONLINE))
    }
    const snap = await getDocs(q)
    return snap.docs.map((doc, i) => ({ id: doc.id, rank: i + 1, ...doc.data() }))
  } catch (err) {
    console.warn('Firebase fetch failed:', err.message)
    return null // null means offline/error
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
      const { gameId, difficultyId, won, score, stars, timeSec } = e.detail || {}
      if (!gameId || !score || score <= 0) return
      // Submit to leaderboard (both local + online)
      const name = localStorage.getItem(NICKNAME_KEY) || 'Anon'
      const entry = { name, score, time: timeSec || null, date: Date.now() }
      addLocalScore(gameId, difficultyId || 'easy', entry)
      if (name && name !== 'Anon') {
        submitOnlineScore(gameId, difficultyId || 'easy', entry).catch(() => {})
      }
    }
    window.addEventListener('bp-game-result', handler)
    return () => window.removeEventListener('bp-game-result', handler)
  }, [])

  // Submit score (both local + online)
  const submitScore = useCallback(async ({ gameId, diffId, score, wave, time, level }) => {
    const name = localStorage.getItem(NICKNAME_KEY) || 'Anon'
    const entry = {
      name,
      score,
      wave: wave || null,
      time: time || null,
      level: level || null,
      date: Date.now(),
    }

    // Always save locally
    const localBoard = addLocalScore(gameId, diffId, entry)

    // Try submit online
    if (name && name !== 'Anon') {
      await submitOnlineScore(gameId, diffId, entry)
    }

    return localBoard
  }, [])

  // Fetch online scores with caching & cooldown
  const getOnlineScores = useCallback(async (gameId, diffId = null) => {
    const cacheKey = `${gameId}_${diffId || 'all'}`
    const now = Date.now()

    // Cooldown: don't refetch within 30 seconds
    if (fetchCooldown.current[cacheKey] && now - fetchCooldown.current[cacheKey] < 30000) {
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

    // Return cache if available, empty array if not
    return onlineCache[cacheKey] || []
  }, [onlineCache])

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
      loading,
    }}>
      {children}
    </LeaderboardContext.Provider>
  )
}

export function useLeaderboard() { return useContext(LeaderboardContext) }
