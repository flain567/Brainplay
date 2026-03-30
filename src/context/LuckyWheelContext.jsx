import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const LuckyWheelContext = createContext(null)

const WHEEL_KEY = 'bp_lucky_wheel'

// ─── Wheel Exclusive Cosmetics ──────────────────────────────────────────────
// Items that can ONLY be obtained through the Lucky Wheel

export const WHEEL_EXCLUSIVES = [
  // ── Space Shooter Ships ──
  { id: 'wheel-ship-ice', game: 'space-shooter', type: 'ships', rarity: 'epic',
    name: 'Ice Striker', desc: 'Pesawat tempur biru es dari dimensi beku. Lucky Wheel Only!',
    icon: '❄️', color: '#00BFFF', img: '/wheel_ship.png',
    stats: { speed: 6, fireRate: 5, bulletCount: 3, maxHP: 7, specialType: 'beam', specialCharge: 280, critChance: 0.15 },
    design: { body: '#00BFFF', wing: '#006994', cockpit: '#E0FFFF', engine: '#00CED1', accent: '#B0E0E6' }
  },
  // ── Voxel Racer Themes ──
  { id: 'wheel-racer-monster', game: 'voxel-racer', type: 'racerThemes', rarity: 'legendary',
    name: 'Monster Truck', desc: 'Monster truck legendaris dengan ban raksasa! LEGENDARY!',
    icon: '🛻', color: '#FF6D00', img: '/wheel_racer_monster.png',
    style: { body: '#FF6D00', roof: '#E65100', accent: '#FFD740', wheel: '#3E2723', exhaust: '#FF3D00' }
  },
  { id: 'wheel-racer-beetle', game: 'voxel-racer', type: 'racerThemes', rarity: 'legendary',
    name: 'Retro Beetle', desc: 'Mobil klasik retro yang melegenda. LEGENDARY!',
    icon: '🚙', color: '#FF8A65', img: '/wheel_racer_legendary.png',
    style: { body: '#FF8A65', roof: '#FF7043', accent: '#4FC3F7', wheel: '#455A64', exhaust: '#FFAB91' }
  },
  // ── Neon Dash Themes ──
  { id: 'wheel-dash-robot', game: 'neon-dash', type: 'dashThemes', rarity: 'epic',
    name: 'Robo Truck', desc: 'Truk robot merah-kuning dari planet mesin. Lucky Wheel Only!',
    icon: '🤖', color: '#E53935', img: '/wheel_racer_epic.png',
    style: { player: '#E53935', playerOutline: '#C62828', trail: '#FFD600', glow: '#FF6F00', wave: '#FF8A65' }
  },
  { id: 'wheel-dash-graffiti', game: 'neon-dash', type: 'dashThemes', rarity: 'epic',
    name: 'Graffiti Cube', desc: 'Cube graffiti penuh warna dari jalanan kota. Lucky Wheel Only!',
    icon: '🎨', color: '#E040FB', img: '/wheel_dash.png',
    style: { player: '#E040FB', playerOutline: '#6A1B9A', trail: '#FF4081', glow: '#E1BEE7', wave: '#FFD740' }
  },
  // ── Memory Card Pixel Pack ──
  { id: 'wheel-card-pixel', game: 'memory-card', type: 'packs', rarity: 'epic',
    name: 'Pixel Art Pack', desc: 'Kartu pixel art bergambar eksklusif. Lucky Wheel Only!',
    icon: '🎨', color: '#E040FB', img: '/cards/cardBackground.png',
  },
  // ── Sudoku Pastel Theme ──
  { id: 'wheel-sudoku-pastel', game: 'sudoku', type: 'sudokuThemes', rarity: 'epic',
    name: 'Pastel Dream', desc: 'Grid gradient pastel cantik dengan angka metalik. Lucky Wheel Only!',
    icon: '🌸', color: '#E8B4CB', img: '/sudoku/Grid.png',
  },
]

// ─── Weekly Rotation Schedule ──────────────────────────────────────────────
// 2 games featured per week, cycles every 4 weeks
const WHEEL_ROTATION = [
  ['space-shooter', 'voxel-racer'],  // Minggu 1
  ['neon-dash',     'memory-card'],  // Minggu 2
  ['space-shooter', 'neon-dash'],    // Minggu 3
  ['voxel-racer',   'memory-card'],  // Minggu 4 — lalu repeat
  ['space-shooter', 'sudoku'],       // Minggu 5
  ['neon-dash',     'voxel-racer'],  // Minggu 6
]

function getWeekOfYear() {
  // ISO week: Senin = hari pertama minggu
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4) // Jan 4 is always in ISO week 1
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1
  const dayOfWeek = now.getDay() || 7 // Mon=1 ... Sun=7
  return Math.floor((dayOfYear - dayOfWeek + 10) / 7)
}

export function getCurrentWeekGames() {
  const weekIdx = getWeekOfYear() % WHEEL_ROTATION.length
  return WHEEL_ROTATION[weekIdx]
}

export function getWeeklyExclusives() {
  const games = getCurrentWeekGames()
  return WHEEL_EXCLUSIVES.filter(e => games.includes(e.game))
}

// ─── Reward Pool ────────────────────────────────────────────────────────────

const REWARD_POOL = [
  { id: 'coin15',   type: 'coin',   amount: 15,  rarity: 'common',    weight: 50, icon: '🪙', label: '15 Coin' },
  { id: 'coin25',   type: 'coin',   amount: 25,  rarity: 'common',    weight: 50, icon: '🪙', label: '25 Coin' },
  { id: 'coin50',   type: 'coin',   amount: 50,  rarity: 'uncommon',  weight: 28, icon: '🪙', label: '50 Coin' },
  { id: 'xp100',    type: 'xp',     amount: 100, rarity: 'uncommon',  weight: 28, icon: '⭐', label: '100 XP' },
  { id: 'shop',     type: 'shop',   amount: 0,   rarity: 'rare',      weight: 36, icon: '🎁', label: 'Shop Item' },
  { id: 'epic',     type: 'exclusive', amount: 0, rarity: 'epic',      weight: 6,  icon: '🟣', label: 'Epic Exclusive' },
  { id: 'legendary',type: 'exclusive', amount: 0, rarity: 'legendary', weight: 1,  icon: '🟡', label: 'Legendary' },
  { id: 'jackpot',  type: 'coin',   amount: 200, rarity: 'legendary', weight: 1,  icon: '💎', label: '200 Coin JACKPOT' },
]
// Drop rates (total weight = 200):
// Common: 50% | Uncommon: 28% | Rare: 18% | Epic: 3% | Legendary: 1%

const RARITY_COLORS = {
  common:    '#B0BEC5',
  uncommon:  '#66BB6A',
  rare:      '#42A5F5',
  epic:      '#AB47BC',
  legendary: '#FFD700',
}

const RARITY_LABELS = {
  common:    'Common',
  uncommon:  'Uncommon',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'Legendary',
}

const EXTRA_SPIN_COST = 150
const FREE_SPINS_PER_DAY = 1
const PITY_THRESHOLD = 50
const DUPE_COIN_EPIC = 300
const DUPE_COIN_LEGENDARY = 800
const DUPE_COIN_SHOP = 50

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayKey() {
  // Pakai waktu LOKAL (bukan UTC) supaya reset tepat tengah malam WIB
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const dd   = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function loadWheelState() {
  try { return JSON.parse(localStorage.getItem(WHEEL_KEY)) || {} } catch { return {} }
}

function saveWheelState(state) {
  localStorage.setItem(WHEEL_KEY, JSON.stringify(state))
}

function getDefaultWheelState() {
  return {
    lastSpinDate: null,
    freeSpinsUsed: 0,
    pityCounter: 0,
    wonExclusives: [],
    spinHistory: [],
    totalSpins: 0,
  }
}

// Weighted random selection
function weightedRandom(pool) {
  const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0)
  let rand = Math.random() * totalWeight
  for (const reward of pool) {
    rand -= reward.weight
    if (rand <= 0) return reward
  }
  return pool[pool.length - 1]
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function LuckyWheelProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = loadWheelState()
    const def = getDefaultWheelState()
    // Reset free spins if new day
    if (saved.lastSpinDate !== getTodayKey()) {
      return { ...def, ...saved, freeSpinsUsed: 0, lastSpinDate: getTodayKey() }
    }
    return { ...def, ...saved }
  })

  useEffect(() => {
    saveWheelState(state)
  }, [state])

  const hasFreeSpins = state.freeSpinsUsed < FREE_SPINS_PER_DAY

  // Resolve what the player actually gets from a reward type
  const resolveReward = useCallback((rewardSlot, ownedExclusives) => {
    if (rewardSlot.type === 'coin') {
      return { type: 'coin', amount: rewardSlot.amount, label: rewardSlot.label, icon: rewardSlot.icon, rarity: rewardSlot.rarity }
    }
    if (rewardSlot.type === 'xp') {
      return { type: 'xp', amount: rewardSlot.amount, label: rewardSlot.label, icon: rewardSlot.icon, rarity: rewardSlot.rarity }
    }
    if (rewardSlot.type === 'exclusive') {
      const rarity = rewardSlot.rarity
      const weekGames = getCurrentWeekGames()
      // ONLY offer exclusives from this week's featured games — no fallback
      const available = WHEEL_EXCLUSIVES.filter(e =>
        weekGames.includes(e.game) && e.rarity === rarity && !ownedExclusives.includes(e.id)
      )
      if (available.length > 0) {
        const item = available[Math.floor(Math.random() * available.length)]
        return { type: 'exclusive', item, label: item.name, icon: item.icon, rarity: item.rarity, img: item.img, desc: item.desc }
      }
      // All owned — dupe conversion
      const dupeCoins = rarity === 'legendary' ? DUPE_COIN_LEGENDARY : DUPE_COIN_EPIC
      return { type: 'coin', amount: dupeCoins, label: `${dupeCoins} Coin (dupe)`, icon: '🪙', rarity, isDupe: true }
    }
    // Shop item — placeholder coin reward (player already has access to shop)
    return { type: 'coin', amount: DUPE_COIN_SHOP, label: '50 Coin (Shop)', icon: '🎁', rarity: 'rare' }
  }, [])

  const spin = useCallback((isFreeSpin) => {
    const today = getTodayKey()

    // Pity system: guarantee epic+ after threshold
    let pool = [...REWARD_POOL]
    if (state.pityCounter >= PITY_THRESHOLD) {
      pool = pool.filter(r => r.rarity === 'epic' || r.rarity === 'legendary')
    }

    const rewardSlot = weightedRandom(pool)
    const resolved = resolveReward(rewardSlot, state.wonExclusives)

    // Update state
    setState(prev => {
      const isEpicPlus = resolved.rarity === 'epic' || resolved.rarity === 'legendary'
      const newPity = isEpicPlus ? 0 : prev.pityCounter + 1
      const newWon = resolved.type === 'exclusive' && resolved.item
        ? [...prev.wonExclusives, resolved.item.id]
        : prev.wonExclusives

      const historyEntry = {
        date: new Date().toISOString(),
        label: resolved.label,
        rarity: resolved.rarity,
        icon: resolved.icon,
      }

      return {
        ...prev,
        lastSpinDate: today,
        freeSpinsUsed: isFreeSpin ? prev.freeSpinsUsed + 1 : prev.freeSpinsUsed,
        pityCounter: newPity,
        wonExclusives: newWon,
        spinHistory: [historyEntry, ...prev.spinHistory].slice(0, 30),
        totalSpins: prev.totalSpins + 1,
      }
    })

    return resolved
  }, [state, resolveReward])

  const getWheelSlots = useCallback(() => {
    // Return 8 slots for the wheel visual, showing this week's exclusive items
    const weekGames = getCurrentWeekGames()
    return REWARD_POOL.map(r => {
      const slot = {
        id: r.id,
        label: r.label,
        icon: r.icon,
        rarity: r.rarity,
        color: RARITY_COLORS[r.rarity],
        img: null,
      }
      // For exclusive slots, show items from this week's featured games (stable pick)
      if (r.type === 'exclusive') {
        const weekItems = WHEEL_EXCLUSIVES.filter(e => weekGames.includes(e.game) && e.rarity === r.rarity)
        const allItems = weekItems.length > 0 ? weekItems : WHEEL_EXCLUSIVES.filter(e => e.rarity === r.rarity)
        if (allItems.length > 0) {
          // Stable pick: use week number so it only changes on Monday, not during spin
          const pick = allItems[getWeekOfYear() % allItems.length]
          slot.img = pick.img
          slot.label = pick.name
          slot.icon = pick.icon
        }
      }
      return slot
    })
  }, [])

  return (
    <LuckyWheelContext.Provider value={{
      hasFreeSpins,
      freeSpinsUsed: state.freeSpinsUsed,
      pityCounter: state.pityCounter,
      wonExclusives: state.wonExclusives,
      spinHistory: state.spinHistory,
      totalSpins: state.totalSpins,
      extraSpinCost: EXTRA_SPIN_COST,
      spin,
      getWheelSlots,
      getCurrentWeekGames,
      getWeeklyExclusives,
      WHEEL_EXCLUSIVES,
      RARITY_COLORS,
      RARITY_LABELS,
      DUPE_COIN_EPIC,
      DUPE_COIN_LEGENDARY,
    }}>
      {children}
    </LuckyWheelContext.Provider>
  )
}

export function useLuckyWheel() { return useContext(LuckyWheelContext) }
