import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { auth, getDb } from '../firebase.js'

const LeaderboardContext = createContext(null)

// Lazy-loaded Firestore helpers
let _firestoreMod = null
async function getFirestoreHelpers() {
  if (!_firestoreMod) {
    _firestoreMod = await import('firebase/firestore')
  }
  return _firestoreMod
}

const STORAGE_KEY = 'bp_leaderboard'
const NICKNAME_KEY = 'bp_nickname'
const PENDING_KEY = 'bp_pending_scores'
const DEVICE_ID_KEY = 'bp_device_id'
const MAX_LOCAL = 10
const MAX_ONLINE = 200

// ─── Device ID (unique per browser/device, fallback for guests) ─────────────

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

// ─── Generate doc ID — uses auth UID if logged in, deviceId if guest ────────

function makeDocId(gameId, diffId) {
  const user = auth.currentUser
  const playerId = user ? user.uid : getDeviceId()
  return `${gameId}_${diffId}_${playerId}`
}

// ─── Local leaderboard (best score per player) ──────────────────────────────

function getLocalBoards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}

function saveLocalBoards(boards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
}

function upsertLocalScore(gameId, diffId, entry) {
  const boards = getLocalBoards()
  const key = `${gameId}_${diffId}`
  if (!boards[key]) boards[key] = []

  const existingIdx = boards[key].findIndex(e =>
    (e.name || '').toLowerCase() === (entry.name || '').toLowerCase()
  )

  if (existingIdx >= 0) {
    const existing = boards[key][existingIdx]
    if (entry.score > existing.score) {
      boards[key][existingIdx] = { ...existing, ...entry, date: Date.now() }
    }
  } else {
    boards[key].push(entry)
  }

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
  const playerBest = {}
  for (const key in boards) {
    if (key.startsWith(`${gameId}_`)) {
      for (const entry of boards[key]) {
        const pKey = (entry.name || 'Anon').toLowerCase()
        if (!playerBest[pKey] || entry.score > playerBest[pKey].score) {
          playerBest[pKey] = entry
        }
      }
    }
  }
  const all = Object.values(playerBest)
  all.sort((a, b) => b.score - a.score)
  return all.slice(0, MAX_LOCAL)
}

// ─── Pending queue ─────────────────────────────────────────────────────────

function getPendingScores() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || [] } catch { return [] }
}

function savePendingScores(pending) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

function addPendingScore(entry) {
  const pending = getPendingScores()
  const existIdx = pending.findIndex(p =>
    p.gameId === entry.gameId && p.diffId === entry.diffId &&
    (p.name || '').toLowerCase() === (entry.name || '').toLowerCase()
  )
  if (existIdx >= 0) {
    if (entry.score > pending[existIdx].score) {
      pending[existIdx] = entry
    }
  } else {
    pending.push(entry)
  }
  if (pending.length > 50) pending.splice(0, pending.length - 50)
  savePendingScores(pending)
}

// ─── Anti-cheat: score sanity limits per game ───────────────────────────────

const MAX_SCORES = {
  'memory-card':   5000,
  'slither-worm':  50000,
  '2048':          100000,
  'word-search':   10000,
  'space-shooter': 200000,
  'hangman':       5000,
  'color-sort':    5000,
  'sudoku':        5000,
  'jigsaw':        5000,
  'reaction-test': 2000,
  'neon-dash':     10000,
  'brick-breaker': 50000,
  'memory-pattern':15000,
  'voxel-racer':   15000,
  'wordle':        1500,
  'math-challenge':50000,
  'number-sequence':50000,
  'quiz-trivia':    20000,
  'binary-puzzle':  5000,
  'sliding-puzzle': 10000,
  'tower-hanoi':    15000,
  'minesweeper':    10000,
  'fields-adventure': 15000,
}

// Session state for anti-cheat (local fallback)
const activeSession = { current: null }
const sessionSalt = Math.random().toString(36).substring(7)

// Rate limiter: 1 submit per 5 seconds per game
const lastSubmitTime = {}

function isScoreValid(gameId, score, durationSec) {
  if (typeof score !== 'number' || score <= 0 || !isFinite(score)) return false
  if (score > (MAX_SCORES[gameId] || 9999999)) return false
  
  // Basic duration check: A score of 10,000 can't be achieved in 1 second
  // Adjust min_time_per_score per game for better accuracy
  const minTimeNeeded = score / (gameId === '2048' ? 500 : 100) // generic 100pts/sec
  if (durationSec < minTimeNeeded && score > 100) {
    console.warn(`[Anti-Cheat] 🚩 Duration too short for score: ${durationSec}s for ${score}pts`)
    return false
  }

  // Rate limit check: 1 submit per 3 seconds per game
  const now = Date.now()
  const key = gameId
  if (lastSubmitTime[key] && now - lastSubmitTime[key] < 3000) return false
  lastSubmitTime[key] = now
  return true
}

// Simple checksum — not bulletproof but stops casual console hacks
function makeChecksum(gameId, score, timestamp) {
  // Harder to guess: reverse gameId, complex salt, use score twice
  const rev = gameId.split('').reverse().join('')
  const salt = ((timestamp % 999) + 42).toString(16)
  const raw = `bp_v2_${rev}_${score}_${timestamp}_${score}_${salt}_shhh`
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0 }
  return Math.abs(h).toString(36)
}

// ─── Online leaderboard (Firebase Firestore) ─────────────────────────────────

export function LeaderboardProvider({ children }) {
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) || '')
  const [onlineCache, setOnlineCache] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastError, setLastError] = useState(null)
  const [firebaseStatus, setFirebaseStatus] = useState('unknown')
  const [firebaseMessage, setFirebaseMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState(null)
  const fetchCooldown = useRef({})
  const localSession = useRef(null)

  // Internal: Submit a score to Firestore
  const submitOnlineScore = useCallback(async (gameId, diffId, entry) => {
    const submitTime = Date.now()
    const user = auth.currentUser
    
    // Session check
    if (!localSession.current || localSession.current.gameId !== gameId) {
      console.warn('[Leaderboard] ⚠️ Submission without active session.')
      return { success: false, error: 'no_session', message: 'Sesi tidak valid.' }
    }

    const durationSec = (submitTime - localSession.current.startTime) / 1000
    
    // Anti-cheat validation (Client-side)
    if (!isScoreValid(gameId, entry.score, durationSec)) {
      console.warn('[Leaderboard] ⚠️ Score rejected by anti-cheat:', gameId, entry.score)
      return { success: false, error: 'invalid', message: 'Skor atau durasi tidak valid.' }
    }

    // Clear session after use
    localSession.current = null

    const checksum = makeChecksum(gameId, entry.score, submitTime)

    try {
      const docId = `${gameId}_${diffId}_${user.uid}`
      const db = await getDb()
      const { doc, getDoc, setDoc, serverTimestamp } = await getFirestoreHelpers()
      const docRef = doc(db, 'leaderboard', docId)
      const existing = await getDoc(docRef)

      const progress = JSON.parse(localStorage.getItem('bp_progress') || '{}')
      const selectedTitle = progress.selectedTitle || null
      const selectedBorder = progress.selectedBorder || null

      const commonData = {
        gameId, diffId,
        name: entry.name || 'Pemain',
        selectedTitle, selectedBorder,
        score: entry.score,
        wave: entry.wave || null,
        time: entry.time || null,
        level: entry.level || null,
        uid: user?.uid || null,
        photoURL: user?.photoURL || null,
        deviceId: getDeviceId(),
        checksum,
        updatedAt: serverTimestamp(),
      }

      if (existing.exists()) {
        const oldData = existing.data()
        if (entry.score <= (oldData.score || 0)) return { success: true, skipped: true }
        await setDoc(docRef, {
          ...commonData,
          gamesPlayed: (oldData.gamesPlayed || 1) + 1,
          previousBest: oldData.score || 0,
          createdAt: oldData.createdAt || serverTimestamp(),
        })
      } else {
        await setDoc(docRef, {
          ...commonData,
          gamesPlayed: 1,
          previousBest: 0,
          createdAt: serverTimestamp(),
        })
      }

      return { success: true }
    } catch (err) {
      const msg = err.message || 'Unknown error'
      console.error('[Leaderboard] ❌ Online submit FAILED:', msg)
      return { success: false, error: 'unknown', message: msg }
    }
  }, [])

  const testFirebaseConnection = useCallback(async () => {
    try {
      const db = await getDb()
      const { collection, query, limit, getDocs } = await getFirestoreHelpers()
      const q = query(collection(db, 'leaderboard'), limit(1))
      await getDocs(q)
      return { ok: true, message: 'Firebase terhubung!' }
    } catch (err) {
      return { ok: false, message: 'Gagal muat data: ' + err.message }
    }
  }, [])

  const fetchOnlineScores = useCallback(async (gameId, diffId = null) => {
    try {
      const db = await getDb()
      const { collection, query, where, limit, getDocs } = await getFirestoreHelpers()
      const q = query(collection(db, 'leaderboard'), where('gameId', '==', gameId), limit(MAX_ONLINE))
      const snap = await getDocs(q)
      let results = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (diffId) results = results.filter(r => r.diffId === diffId)
      results.sort((a, b) => (b.score || 0) - (a.score || 0))
      return { success: true, data: results.slice(0, 50).map((r, i) => ({ ...r, rank: i + 1 })) }
    } catch (err) {
      return { success: false, error: 'unknown', data: null }
    }
  }, [])

  const flushPendingScores = useCallback(async () => {
    const pending = getPendingScores()
    if (pending.length === 0) return
    const stillPending = []
    for (const item of pending) {
      const result = await submitOnlineScore(item.gameId, item.diffId, item)
      if (!result.success) stillPending.push(item)
    }
    savePendingScores(stillPending)
  }, [submitOnlineScore])

  const startScoreSession = useCallback(async (gameId, diffId = 'easy') => {
    const user = auth.currentUser
    if (!user) return

    const startTime = Date.now()
    const token = btoa(`${gameId}_${diffId}_${startTime}_${sessionSalt}`)
    localSession.current = { gameId, diffId, startTime, token }

    // Write to Firestore for server-side validation
    try {
      const db = await getDb()
      const { doc, setDoc, serverTimestamp } = await getFirestoreHelpers()
      const sessId = `${gameId}_${diffId}_${user.uid}`
      await setDoc(doc(db, 'sessions', sessId), {
        gameId,
        diffId,
        uid: user.uid,
        startTime: serverTimestamp(),
      })
    } catch (err) {
      console.error('[Leaderboard] ❌ Secure session start failed:', err.message)
    }
  }, [])

  const setNickname = useCallback((name) => {
    const clean = name.trim().slice(0, 20)
    setNicknameState(clean)
    localStorage.setItem(NICKNAME_KEY, clean)
  }, [])

  useEffect(() => {
    testFirebaseConnection().then(result => {
      setFirebaseStatus(result.ok ? 'connected' : 'error')
      setFirebaseMessage(result.message)
      if (result.ok) flushPendingScores()
    })
  }, [testFirebaseConnection, flushPendingScores])

  useEffect(() => {
    const handler = async (e) => {
      const { gameId, difficultyId, score, timeSec } = e.detail || {}
      if (!gameId || !score || score <= 0) return

      const name = localStorage.getItem(NICKNAME_KEY) || 'Pemain'
      const entry = { name, score, time: timeSec || null, date: Date.now() }
      const diffId = difficultyId || 'easy'

      upsertLocalScore(gameId, diffId, entry)

      const result = await submitOnlineScore(gameId, diffId, entry)
      if (result.success) {
        setSubmitStatus('ok')
        fetchCooldown.current = {}
      } else {
        addPendingScore({ gameId, diffId, ...entry })
        setSubmitStatus('pending')
        setFirebaseStatus('error')
        setFirebaseMessage(result.message)
      }
      setTimeout(() => setSubmitStatus(null), 3000)
    }
    window.addEventListener('bp-game-result', handler)
    return () => window.removeEventListener('bp-game-result', handler)
  }, [submitOnlineScore])

  const submitScore = useCallback(async ({ gameId, diffId, score, wave, time, level }) => {
    const name = localStorage.getItem(NICKNAME_KEY) || 'Pemain'
    const entry = { name, score, wave: wave || null, time: time || null, level: level || null, date: Date.now() }
    const localBoard = upsertLocalScore(gameId, diffId, entry)
    const result = await submitOnlineScore(gameId, diffId, entry)
    if (!result.success) {
      addPendingScore({ gameId, diffId, ...entry })
      setFirebaseStatus('error')
      setFirebaseMessage(result.message)
    } else {
      setFirebaseStatus('connected')
      fetchCooldown.current = {}
    }
    return localBoard
  }, [submitOnlineScore])

  const getOnlineScores = useCallback(async (gameId, diffId = null, force = false) => {
    const cacheKey = `${gameId}_${diffId || 'all'}`
    const now = Date.now()
    if (!force && fetchCooldown.current[cacheKey] && now - fetchCooldown.current[cacheKey] < 15000) {
      return onlineCache[cacheKey] || []
    }

    setLoading(true)
    setLastError(null)
    const result = await fetchOnlineScores(gameId, diffId)
    setLoading(false)

    if (result.success) {
      fetchCooldown.current[cacheKey] = now
      setOnlineCache(prev => ({ ...prev, [cacheKey]: result.data }))
      setFirebaseStatus('connected')
      setFirebaseMessage('Firebase terhubung!')
      return result.data
    }

    if (result.error === 'permission') {
      setLastError('Firestore Rules menolak akses!')
      setFirebaseStatus('error')
      setFirebaseMessage('Firestore Rules belum diset.')
    } else {
      setLastError('Gagal memuat data. Cek koneksi internet.')
      setFirebaseStatus('error')
    }
    return onlineCache[cacheKey] || []
  }, [onlineCache, fetchOnlineScores])

  const clearCache = useCallback(() => { fetchCooldown.current = {}; setOnlineCache({}) }, [])
  const getLocalBoard = useCallback((gameId, diffId = null) => {
    if (diffId) return getLocalScores(gameId, diffId)
    return getLocalAllScores(gameId)
  }, [])

  const retestFirebase = useCallback(async () => {
    setFirebaseStatus('unknown')
    setFirebaseMessage('Mengecek koneksi...')
    const result = await testFirebaseConnection()
    setFirebaseStatus(result.ok ? 'connected' : 'error')
    setFirebaseMessage(result.message)
    if (result.ok) flushPendingScores()
    return result
  }, [testFirebaseConnection, flushPendingScores])

  const pendingCount = getPendingScores().length

  return (
    <LeaderboardContext.Provider value={{
      nickname, setNickname, submitScore,
      getOnlineScores, getLocalBoard, clearCache,
      loading, lastError,
      firebaseStatus, firebaseMessage, retestFirebase,
      submitStatus, pendingCount,
      startScoreSession,
    }}>
      {children}
    </LeaderboardContext.Provider>
  )
}

export function useLeaderboard() { return useContext(LeaderboardContext) }
