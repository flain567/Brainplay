import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const LimitedModeContext = createContext(null)

// ─── Limited Mode Definitions ────────────────────────────────────────────────
// Rotation: Senin-Rabu (0-2), Kamis (3), Jumat-Minggu (4-6)

const MODES = {
  survival: {
    id: 'survival',
    emoji: '💪',
    name: 'Survival Mode',
    desc: 'Escalating difficulty setiap level. Semakin tinggi = semakin banyak reward!',
    active_days: [1, 2, 3], // Mon, Tue, Wed
    coinMultiplier: 1.5,
    xpMultiplier: 1.5,
    color: '#FF6B6B',
  },
  no_mistakes: {
    id: 'no_mistakes',
    emoji: '🎯',
    name: 'No Mistakes Mode',
    desc: '1 kesalahan = game over! Tapi 3× coins jika berhasil.',
    active_days: [4], // Thursday
    coinMultiplier: 3.0,
    xpMultiplier: 2.0,
    color: '#FDCB6E',
  },
  speed: {
    id: 'speed',
    emoji: '⚡',
    name: 'Speed Blitz',
    desc: 'Setiap game di Easy dengan time limit! Cepat-cepatan + 2× reward.',
    active_days: [5, 6, 0], // Fri, Sat, Sun
    coinMultiplier: 2.0,
    xpMultiplier: 2.0,
    color: '#00B894',
  },
}

function getTodayDayOfWeek() {
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  return new Date().getDay()
}

function getActiveLimitedMode() {
  const dayOfWeek = getTodayDayOfWeek()
  
  for (const [key, mode] of Object.entries(MODES)) {
    if (mode.active_days.includes(dayOfWeek)) {
      return mode
    }
  }
  
  return null
}

function getLimitedModeBonusKey(modeId) {
  const today = new Date().toISOString().slice(0, 10)
  return `bp_limitedmode_${modeId}_${today}`
}

export function LimitedModeProvider({ children }) {
  const [claimedBonuses, setClaimedBonuses] = useState({})

  useEffect(() => {
    // Load claimed bonuses dari storage
    const stored = getJSON(StorageKeys.GENERAL, {})
    setClaimedBonuses(stored.claimedLimitedBonuses || {})
  }, [])

  const getCurrentMode = useCallback(() => {
    return getActiveLimitedMode()
  }, [])

  const isBonusClaimedToday = useCallback((modeId) => {
    const key = getLimitedModeBonusKey(modeId)
    return claimedBonuses[key] === true
  }, [claimedBonuses])

  const markBonusAsClaimed = useCallback((modeId) => {
    const key = getLimitedModeBonusKey(modeId)
    const updated = { ...claimedBonuses, [key]: true }
    setClaimedBonuses(updated)
    const stored = getJSON(StorageKeys.GENERAL, {})
    setJSON(StorageKeys.GENERAL, { ...stored, claimedLimitedBonuses: updated })
  }, [claimedBonuses])

  const getDaysUntilNextMode = useCallback(() => {
    const today = getTodayDayOfWeek()
    // Calculate next mode rotation
    const daysInWeek = 7
    let nextDay = (today + 1) % daysInWeek
    let daysUntil = 1
    
    while (!getActiveLimitedMode() || getTodayDayOfWeek() === today) {
      nextDay = (nextDay + 1) % daysInWeek
      daysUntil++
      if (daysUntil > 7) break
    }
    
    return daysUntil
  }, [])

  return (
    <LimitedModeContext.Provider value={{
      currentMode: getCurrentMode(),
      isBonusClaimedToday,
      markBonusAsClaimed,
      getDaysUntilNextMode,
      MODES,
    }}>
      {children}
    </LimitedModeContext.Provider>
  )
}

export function useLimitedMode() {
  const context = useContext(LimitedModeContext)
  if (!context) {
    throw new Error('useLimitedMode must be used within LimitedModeProvider')
  }
  return context
}
