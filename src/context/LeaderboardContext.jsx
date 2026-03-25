import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { db, auth } from '../firebase.js'
import { collection, doc, getDoc, setDoc, query, limit, getDocs, where, serverTimestamp } from 'firebase/firestore'

const LeaderboardContext = createContext(null)

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
}

// Rate limiter: 1 submit per 5 seconds per game
const lastSubmitTime = {}

function isScoreValid(gameId, score) {
  if (typeof score !== 'number' || score <= 0 || !isFinite(score)) return false
  if (score > (MAX_SCORES[gameId] || 9999999)) return false
  // Rate limit check
  const now = Date.now()
  const key = gameId
  if (lastSubmitTime[key] && now - lastSubmitTime[key] < 5000) return false
  lastSubmitTime[key] = now
  return true
}

// Simple checksum — not bulletproof but stops casual console hacks
function makeChecksum(gameId, score, timestamp) {
  const raw = `${gameId}_${score}_${timestamp}_bp2024`
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0 }
  return Math.abs(h).toString(36)
}

// ─── Online leaderboard (Firebase Firestore) ─────────────────────────────────

async function submitOnlineScore(gameId, diffId, entry) {
  // Anti-cheat validation
  if (!isScoreValid(gameId, entry.score)) {
    console.warn('[Leaderboard] ⚠️ Score rejected by anti-cheat:', gameId, entry.score)
    return { success: false, error: 'invalid', message: 'Skor tidak valid.' }
  }

  const submitTime = Date.now()
  const checksum = makeChecksum(gameId, entry.score, submitTime)

  try {
    const user = auth.currentUser
    const docId = makeDocId(gameId, diffId)
    const docRef = doc(db, 'leaderboard', docId)

    const existing = await getDoc(docRef)

    if (existing.exists()) {
      const oldData = existing.data()
      if (entry.score <= (oldData.score || 0)) {
        console.log('[Leaderboard] ⏭️ Score not higher, skip:', entry.score, '<=', oldData.score)
        return { success: true, skipped: true }
      }
      await setDoc(docRef, {
        gameId,
        diffId,
        name: entry.name || 'Pemain',
        score: entry.score,
        wave: entry.wave || null,
        time: entry.time || null,
        level: entry.level || null,
        uid: user?.uid || null,
        photoURL: user?.photoURL || null,
        deviceId: getDeviceId(),
        gamesPlayed: (oldData.gamesPlayed || 1) + 1,
        previousBest: oldData.score || 0,
        checksum,
        createdAt: oldData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      console.log('[Leaderboard] ✅ Score UPDATED:', oldData.score, '→', entry.score)
    } else {
      await setDoc(docRef, {
        gameId,
        diffId,
        name: entry.name || 'Pemain',
        score: entry.score,
        wave: entry.wave || null,
        time: entry.time || null,
        level: entry.level || null,
        uid: user?.uid || null,
        photoURL: user?.photoURL || null,
        deviceId: getDeviceId(),
        gamesPlayed: 1,
        previousBest: 0,
        checksum,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      console.log('[Leaderboard] ✅ New score CREATED:', entry.score)
    }

    return { success: true }
  } catch (err) {
    const msg = err.message || 'Unknown error'
    console.error('[Leaderboard] ❌ Online submit FAILED:', msg)
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      return { success: false, error: 'permission', message: 'Firestore rules belum diset.' }
    }
    if (msg.includes('network') || msg.includes('unavailable') || msg.includes('Failed to fetch')) {
      return { success: false, error: 'network', message: 'Tidak ada koneksi internet.' }
    }
    return { success: false, error: 'unknown', message: msg }
  }
}

async function testFirebaseConnection() {
  try {
    const ref = collection(db, 'leaderboard')
    const q = query(ref, limit(1))
    await getDocs(q)
    return { ok: true, message: 'Firebase terhubung!' }
  } catch (err) {
    const msg = err.message || ''
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      return { ok: false, error: 'permission', message: 'Firestore Security Rules menolak akses.' }
    }
    return { ok: false, error: 'unknown', message: 'Error: ' + msg }
  }
}

async function fetchOnlineScores(gameId, diffId = null) {
  try {
    const ref = collection(db, 'leaderboard')
    const q = query(ref, where('gameId', '==', gameId), limit(MAX_ONLINE))
    const snap = await getDocs(q)
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    if (diffId) {
      results = results.filter(r => r.diffId === diffId)
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0))
    results = results.slice(0, 50).map((r, i) => ({ ...r, rank: i + 1 }))

    return { success: true, data: results }
  } catch (err) {
    const msg = err.message || ''
    console.error('[Leaderboard] ❌ Fetch FAILED:', msg)
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      return { success: false, error: 'permission', data: null }
    }
    return { success: false, error: 'unknown', data: null }
  }
}

async function flushPendingScores() {
  const pending = getPendingScores()
  if (pending.length === 0) return
  const stillPending = []
  for (const item of pending) {
    const result = await submitOnlineScore(item.gameId, item.diffId, item)
    if (!result.success) {
      if (result.error === 'permission') { savePendingScores(pending); return }
      stillPending.push(item)
    }
  }
  savePendingScores(stillPending)
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function LeaderboardProvider({ children }) {
  const [nickname, setNicknameState] = useState(() => localStorage.getItem(NICKNAME_KEY) || '')
  const [onlineCache, setOnlineCache] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastError, setLastError] = useState(null)
  const [firebaseStatus, setFirebaseStatus] = useState('unknown')
  const [firebaseMessage, setFirebaseMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState(null)
  const fetchCooldown = useRef({})

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
  }, [])

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
  }, [])

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
  }, [])

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
  }, [onlineCache])

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
  }, [])

  const pendingCount = getPendingScores().length

  return (
    <LeaderboardContext.Provider value={{
      nickname, setNickname, submitScore,
      getOnlineScores, getLocalBoard, clearCache,
      loading, lastError,
      firebaseStatus, firebaseMessage, retestFirebase,
      submitStatus, pendingCount,
    }}>
      {children}
    </LeaderboardContext.Provider>
  )
}

export function useLeaderboard() { return useContext(LeaderboardContext) }
