import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { db, auth } from '../firebase.js'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const CloudSaveContext = createContext(null)

const DEBOUNCE_MS = 3000
const SAVE_KEYS = {
  progress: StorageKeys.XP,
  coins: StorageKeys.COINS,
}

// ─── Smart merge: take the "better" value ───────────────────────────────────

function mergeMax(a, b) { return (a || 0) > (b || 0) ? a : b }

function mergeArrayUnion(a, b) {
  return [...new Set([...(a || []), ...(b || [])])]
}

function mergeObjectMax(a, b) {
  const merged = { ...(a || {}), ...(b || {}) }
  for (const key of Object.keys(merged)) {
    if (typeof (a || {})[key] === 'number' && typeof (b || {})[key] === 'number') {
      merged[key] = Math.max(a[key], b[key])
    }
  }
  return merged
}

function mergeProgress(local, cloud) {
  if (!cloud) return local
  if (!local) return cloud
  return {
    totalXP: mergeMax(local.totalXP, cloud.totalXP),
    totalGamesPlayed: mergeMax(local.totalGamesPlayed, cloud.totalGamesPlayed),
    uniqueGamesPlayed: mergeMax(local.uniqueGamesPlayed, cloud.uniqueGamesPlayed),
    gamesPlayedSet: mergeArrayUnion(local.gamesPlayedSet, cloud.gamesPlayedSet),
    hardGamesWon: mergeMax(local.hardGamesWon, cloud.hardGamesWon),
    currentStreak: mergeMax(local.currentStreak, cloud.currentStreak),
    maxStreak: mergeMax(local.maxStreak, cloud.maxStreak),
    lastPlayDate: (local.lastPlayDate || '') > (cloud.lastPlayDate || '') ? local.lastPlayDate : cloud.lastPlayDate,
    threeStarCount: mergeMax(local.threeStarCount, cloud.threeStarCount),
    fastestGame: local.fastestGame && cloud.fastestGame
      ? Math.min(local.fastestGame, cloud.fastestGame)
      : local.fastestGame || cloud.fastestGame || 0,
    gameWins: mergeObjectMax(local.gameWins, cloud.gameWins),
    gameBests: mergeObjectMax(local.gameBests, cloud.gameBests),
    totalPlayTime: mergeMax(local.totalPlayTime, cloud.totalPlayTime),
    unlockedAchievements: mergeArrayUnion(local.unlockedAchievements, cloud.unlockedAchievements),
    newAchievements: local.newAchievements || [],
  }
}

function mergeCoins(local, cloud) {
  if (!cloud) return local
  if (!local) return cloud

  // Take the higher total earned as "truth"
  const useTotals = (cloud.totalEarned || 0) > (local.totalEarned || 0)
  const base = useTotals ? cloud : local

  return {
    ...base,
    // Union all owned cosmetics
    ownedPacks: mergeArrayUnion(local.ownedPacks, cloud.ownedPacks),
    ownedSkins: mergeArrayUnion(local.ownedSkins, cloud.ownedSkins),
    ownedTileThemes: mergeArrayUnion(local.ownedTileThemes, cloud.ownedTileThemes),
    ownedHighlights: mergeArrayUnion(local.ownedHighlights, cloud.ownedHighlights),
    ownedShips: mergeArrayUnion(local.ownedShips, cloud.ownedShips),
    ownedHangmanThemes: mergeArrayUnion(local.ownedHangmanThemes, cloud.ownedHangmanThemes),
    ownedTubeThemes: mergeArrayUnion(local.ownedTubeThemes, cloud.ownedTubeThemes),
    ownedSudokuThemes: mergeArrayUnion(local.ownedSudokuThemes, cloud.ownedSudokuThemes),
    ownedJigsawThemes: mergeArrayUnion(local.ownedJigsawThemes, cloud.ownedJigsawThemes),
    // Take higher balance
    balance: mergeMax(local.balance, cloud.balance),
    totalEarned: mergeMax(local.totalEarned, cloud.totalEarned),
    totalSpent: mergeMax(local.totalSpent, cloud.totalSpent),
    // Keep local active cosmetics (current device preference)
    activePack: local.activePack || cloud.activePack,
    activeSkin: local.activeSkin || cloud.activeSkin,
    activeTileTheme: local.activeTileTheme || cloud.activeTileTheme,
    activeHighlight: local.activeHighlight || cloud.activeHighlight,
    activeShip: local.activeShip || cloud.activeShip,
    activeHangmanTheme: local.activeHangmanTheme || cloud.activeHangmanTheme,
    activeTubeTheme: local.activeTubeTheme || cloud.activeTubeTheme,
    activeSudokuTheme: local.activeSudokuTheme || cloud.activeSudokuTheme,
    activeJigsawTheme: local.activeJigsawTheme || cloud.activeJigsawTheme,
    // Keep streak/daily from whichever is more recent
    dailyStreak: mergeMax(local.dailyStreak, cloud.dailyStreak),
    lastDailyClaim: (local.lastDailyClaim || '') > (cloud.lastDailyClaim || '') ? local.lastDailyClaim : cloud.lastDailyClaim,
    // Merge consumables
    hints: mergeMax(local.hints, cloud.hints),
    timeFreezes: mergeMax(local.timeFreezes, cloud.timeFreezes),
    // Keep local transactions (recent)
    transactions: local.transactions || cloud.transactions || [],
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CloudSaveProvider({ children }) {
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'
  const [lastSync, setLastSync] = useState(null)
  const debounceRef = useRef(null)
  const isSyncing = useRef(false)

  // ─── Load from cloud and merge ────────────────────────────────────────────
  const loadAndMerge = useCallback(async (uid) => {
    if (isSyncing.current) return
    isSyncing.current = true
    setSyncStatus('syncing')

    try {
      const docRef = doc(db, 'users', uid)
      const snap = await getDoc(docRef)
      const cloudData = snap.exists() ? snap.data() : null

      // Get local data
      const localProgress = getJSON(StorageKeys.XP) || {}
      const localCoins = getJSON(StorageKeys.COINS) || {}

      if (cloudData) {
        // Merge
        const mergedProgress = mergeProgress(localProgress, cloudData.progress || {})
        const mergedCoins = mergeCoins(localCoins, cloudData.coins || {})

        // Save merged to localStorage
        setJSON(StorageKeys.XP, mergedProgress)
        setJSON(StorageKeys.COINS, mergedCoins)

        // Save merged back to cloud
        await setDoc(docRef, {
          progress: mergedProgress,
          coins: { ...mergedCoins, transactions: (mergedCoins.transactions || []).slice(0, 10) },
          updatedAt: serverTimestamp(),
        })

        console.log('[CloudSave] ✅ Merged cloud + local data')
      } else {
        // No cloud data — push local to cloud
        await setDoc(docRef, {
          progress: localProgress,
          coins: { ...localCoins, transactions: (localCoins.transactions || []).slice(0, 10) },
          updatedAt: serverTimestamp(),
        })
        console.log('[CloudSave] ✅ First sync — pushed local to cloud')
      }

      setSyncStatus('synced')
      setLastSync(Date.now())

      // Force re-render by dispatching event
      window.dispatchEvent(new CustomEvent('bp-cloud-sync'))
    } catch (err) {
      console.error('[CloudSave] ❌ Sync failed:', err.message)
      setSyncStatus('error')
    } finally {
      isSyncing.current = false
    }
  }, [])

  // ─── Save to cloud (debounced) ────────────────────────────────────────────
  const saveToCloud = useCallback(async () => {
    const user = auth.currentUser
    if (!user || isSyncing.current) return

    try {
      const progress = getJSON(StorageKeys.XP) || {}
      const coins = getJSON(StorageKeys.COINS) || {}

      await setDoc(doc(db, 'users', user.uid), {
        progress,
        coins: { ...coins, transactions: (coins.transactions || []).slice(0, 10) },
        updatedAt: serverTimestamp(),
      })

      setLastSync(Date.now())
      setSyncStatus('synced')
      console.log('[CloudSave] ☁️ Saved to cloud')
    } catch (err) {
      console.error('[CloudSave] ❌ Save failed:', err.message)
      setSyncStatus('error')
    }
  }, [])

  // Debounced save trigger
  const triggerSave = useCallback(() => {
    if (!auth.currentUser) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(saveToCloud, DEBOUNCE_MS)
  }, [saveToCloud])

  // ─── Listen to auth changes ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User logged in — load and merge cloud data
        loadAndMerge(user.uid)
      } else {
        setSyncStatus('idle')
        setLastSync(null)
      }
    })
    return () => unsub()
  }, [loadAndMerge])

  // ─── Listen to localStorage changes (save to cloud on data change) ────────
  useEffect(() => {
    const handler = (e) => {
      if (!auth.currentUser) return
      if (e.key === StorageKeys.XP || e.key === StorageKeys.COINS) {
        triggerSave()
      }
    }
    window.addEventListener('storage', handler)

    // Also listen to game results (more reliable than storage event)
    const gameHandler = () => triggerSave()
    window.addEventListener('bp-game-result', gameHandler)

    // Also listen for coin changes via custom event
    const coinHandler = () => triggerSave()
    window.addEventListener('bp-coin-change', coinHandler)

    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('bp-game-result', gameHandler)
      window.removeEventListener('bp-coin-change', coinHandler)
    }
  }, [triggerSave])

  // ─── Periodic auto-save (every 30s if logged in) ─────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (auth.currentUser && !isSyncing.current) {
        saveToCloud()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [saveToCloud])

  // Manual force sync
  const forceSync = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    await loadAndMerge(user.uid)
  }, [loadAndMerge])

  return (
    <CloudSaveContext.Provider value={{
      syncStatus, lastSync, forceSync, triggerSave,
    }}>
      {children}
    </CloudSaveContext.Provider>
  )
}

export function useCloudSave() { return useContext(CloudSaveContext) }
