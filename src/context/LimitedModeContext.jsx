import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const LimitedModeContext = createContext(null)

// ─── Limited Mode Definitions ────────────────────────────────────────────────
// Rotation: Senin-Rabu (0-2), Kamis (3), Jumat-Minggu (4-6)
// Event rotation bervariasi setiap minggu untuk pengalaman berbeda
//
// SISTEM ROTASI MINGGUAN:
// - Setiap hari beda event (Senin-Rabu: Survival, Kamis: No Mistakes, Jumat-Minggu: Weekend Masters)
// - Minggu depan bisa swap dengan event berbeda dari WEEKEND_EVENTS
// - Ini membuat game lebih variatif & entertaining
//
// WEEKEND_EVENTS dapat di-rotate dengan jadwal mingguan di kode lain jika perlu

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
  weekend_masters: {
    id: 'weekend_masters',
    emoji: '🏆',
    name: 'Weekend Masters',
    desc: 'Tantangan spesial akhir pekan! Mainkan game favorit dengan multiplier reward maksimal!',
    active_days: [5, 6, 0], // Fri, Sat, Sun
    coinMultiplier: 3.0,
    xpMultiplier: 2.5,
    color: '#00B894',
  },
}

// ─── Weekend Event Rotation (Alternative weekend events) ────────────────────
// Untuk minggu depan atau bulan depan, bisa swap dengan event berbeda
export const WEEKEND_EVENTS = [
  {
    id: 'weekend_masters',
    emoji: '🏆',
    name: 'Weekend Masters',
    desc: 'Tantangan spesial akhir pekan! Mainkan game favorit dengan multiplier reward maksimal!',
    coinMultiplier: 3.0,
    xpMultiplier: 2.5,
    color: '#00B894',
  },
  {
    id: 'double_coins',
    emoji: '💰',
    name: 'Double Coins Weekend',
    desc: 'Setiap coin yang dikumpulkan berlipat ganda! Maksimalkan earning akhir pekan kamu.',
    coinMultiplier: 2.0,
    xpMultiplier: 1.0,
    color: '#FDCB6E',
  },
  {
    id: 'xp_feast',
    emoji: '⭐',
    name: 'XP Feast Weekend',
    desc: 'Panen XP sebanyak-banyaknya! Level up lebih cepat dengan multiplier 3×.',
    coinMultiplier: 1.0,
    xpMultiplier: 3.0,
    color: '#A29BFE',
  },
  {
    id: 'combo_master',
    emoji: '🔥',
    name: 'Combo Master Weekend',
    desc: 'Streak multiplier 2× lebih tinggi! Semakin tinggi streak, semakin untung!',
    coinMultiplier: 1.5,
    xpMultiplier: 1.5,
    color: '#FF6B6B',
  },
  {
    id: 'achievement_boost',
    emoji: '🏅',
    name: 'Achievement Boost Weekend',
    desc: 'Unlock achievement 2× lebih mudah! Kesempatan emas raih achievement sulit!',
    coinMultiplier: 1.2,
    xpMultiplier: 1.2,
    color: '#45B7D1',
  },
  {
    id: 'speed_rush',
    emoji: '⚡',
    name: 'Speed Rush Weekend',
    desc: 'Mode Easy dengan reward penuh! Mainkan santai dan raih coin banyak!',
    coinMultiplier: 2.5,
    xpMultiplier: 2.0,
    color: '#00CEC9',
  },
  {
    id: 'lucky_multiplier',
    emoji: '🎰',
    name: 'Lucky Multiplier Weekend',
    desc: 'Random multiplier 1.5-3.5×! Setiap game bisa dapat reward berbeda-beda!',
    coinMultiplier: 2.5,
    xpMultiplier: 2.5,
    color: '#D946EF',
  },
  {
    id: 'first_play_bonus',
    emoji: '💎',
    name: 'First Play Bonus Weekend',
    desc: '3 game pertama dapat 100% bonus reward! Mainkan 3 game berbeda untuk max earning!',
    coinMultiplier: 2.0,
    xpMultiplier: 2.0,
    color: '#F59E0B',
  },
  {
    id: 'rewind_redemption',
    emoji: '⏮️',
    name: 'Rewind Redemption Weekend',
    desc: 'Retry game unlimited tanpa penalty! Sempurna untuk unlock 3-star rating!',
    coinMultiplier: 1.8,
    xpMultiplier: 1.8,
    color: '#EC4899',
  },
]

function getTodayDayOfWeek() {
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  return new Date().getDay()
}

function getWeekNumber() {
  // Get the ISO week number of the year
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (today - firstDay) / 86400000
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7)
}

function getRotatedWeekendEvent() {
  // Rotate weekend events based on week number
  const weekNum = getWeekNumber()
  const eventIndex = (weekNum - 1) % WEEKEND_EVENTS.length
  return WEEKEND_EVENTS[eventIndex]
}

function getActiveLimitedMode() {
  const dayOfWeek = getTodayDayOfWeek()
  
  // Untuk Jumat-Minggu (5,6,0), gunakan rotated weekend event
  if ([5, 6, 0].includes(dayOfWeek)) {
    const rotatedEvent = getRotatedWeekendEvent()
    return {
      ...rotatedEvent,
      active_days: [5, 6, 0],
    }
  }
  
  // Untuk hari lainnya, gunakan MODES biasa
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

// ─── Export utilities untuk manage/display event rotation ───────────────────
export function getWeekNumberUtil() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (today - firstDay) / 86400000
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7)
}

export function getRotatedWeekendEventUtil(weekNum = null) {
  const wk = weekNum !== null ? weekNum : getWeekNumberUtil()
  const eventIndex = (wk - 1) % WEEKEND_EVENTS.length
  return WEEKEND_EVENTS[eventIndex]
}

export function getNextWeekendEventUtil() {
  const nextWeek = getWeekNumberUtil() + 1
  return getRotatedWeekendEventUtil(nextWeek)
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
      WEEKEND_EVENTS,
      getWeekNumber: getWeekNumberUtil,
      getRotatedWeekendEvent: getRotatedWeekendEventUtil,
      getNextWeekendEvent: getNextWeekendEventUtil,
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
