import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

const CoinContext = createContext(null)

// ─── Card Icon Packs ─────────────────────────────────────────────────────────
export const ICON_PACKS = [
  {
    id: 'default',
    name: 'Emoji Pack',
    desc: 'Emoji klasik yang ekspresif dan berwarna',
    price: 0,
    icon: '😀',
    color: '#FDCB6E',
    icons: ['🐶','🐱','🦊','🐻','🦁','🐯','🐸','🐧','🦄','🐼','🦋','🐙'],
  },
  {
    id: 'animal',
    name: 'Animal Pack',
    desc: 'Berbagai jenis hewan lucu dari seluruh dunia',
    price: 150,
    icon: '🐾',
    color: '#4ECDC4',
    icons: ['🐘','🦒','🦘','🐬','🦜','🦩','🐢','🦔','🦦','🐝','🦚','🐞'],
  },
  {
    id: 'food',
    name: 'Food Pack',
    desc: 'Makanan dan buah-buahan yang menggugah selera',
    price: 150,
    icon: '🍔',
    color: '#FF6B6B',
    icons: ['🍕','🍔','🍣','🌮','🍩','🧁','🍦','🥐','🍪','🫐','🍜','🥟'],
  },
  {
    id: 'space',
    name: 'Space Pack',
    desc: 'Tema luar angkasa — planet, bintang, dan galaksi',
    price: 250,
    icon: '🚀',
    color: '#A29BFE',
    icons: ['🚀','🌍','🌙','⭐','🪐','☄️','🛸','👽','🌌','🔭','🌞','💫'],
  },
  {
    id: 'sport',
    name: 'Sport Pack',
    desc: 'Peralatan olahraga dan aktivitas seru',
    price: 200,
    icon: '⚽',
    color: '#00B894',
    icons: ['⚽','🏀','🎾','🏐','🏈','⚾','🎱','🏓','🥊','🏹','🎣','🛹'],
  },
  {
    id: 'flag',
    name: 'Flag Pack',
    desc: 'Bendera dari berbagai negara di dunia',
    price: 200,
    icon: '🏳️',
    color: '#FD79A8',
    icons: ['🇮🇩','🇯🇵','🇧🇷','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇰🇷','🇪🇸','🇮🇹','🇹🇭','🇲🇽'],
  },
  {
    id: 'music',
    name: 'Music Pack',
    desc: 'Instrumen musik dan simbol melodi',
    price: 300,
    icon: '🎵',
    color: '#E17055',
    icons: ['🎸','🎹','🥁','🎺','🎷','🎻','🪗','🪘','🎤','🎧','🎼','🎵'],
  },
  {
    id: 'fantasy',
    name: 'Fantasy Pack',
    desc: 'Makhluk mistis dan sihir dari dunia fantasi',
    price: 350,
    icon: '🐉',
    color: '#6C5CE7',
    icons: ['🐉','🧙','🧚','🦅','🗡️','🛡️','👑','💎','🔮','⚔️','🏰','🧝'],
  },
]

// ─── Coin reward rates ───────────────────────────────────────────────────────
export const COIN_REWARDS = {
  gameWin:      { easy: 15, medium: 25, hard: 40 },
  gameLose:     5,
  threeStars:   20,  // bonus
  achievement:  50,
  dailyLogin:   [10, 15, 20, 25, 30, 40, 60], // day 1-7, resets weekly
  levelUp:      30,
}

// ─── Default state ───────────────────────────────────────────────────────────
function getDefaultCoinState() {
  return {
    balance: 50,  // start with 50 coins
    totalEarned: 50,
    totalSpent: 0,
    ownedPacks: ['default'],
    activePack: 'default',
    lastDailyClaim: null,
    dailyStreak: 0,
    transactions: [], // { type, amount, desc, date } — keep last 20
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function CoinProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = getJSON(StorageKeys.COINS)
    return saved ? { ...getDefaultCoinState(), ...saved } : getDefaultCoinState()
  })
  const [coinAnim, setCoinAnim] = useState(null) // { amount, x?, y? } for floating anim

  // Persist
  useEffect(() => {
    setJSON(StorageKeys.COINS, state)
  }, [state])

  // Add coins
  const earnCoins = useCallback((amount, desc = '') => {
    if (amount <= 0) return
    setCoinAnim({ amount, desc })
    setTimeout(() => setCoinAnim(null), 2000)

    setState(s => {
      const tx = { type: 'earn', amount, desc, date: Date.now() }
      const txs = [tx, ...(s.transactions || [])].slice(0, 20)
      return {
        ...s,
        balance: s.balance + amount,
        totalEarned: (s.totalEarned || 0) + amount,
        transactions: txs,
      }
    })
  }, [])

  // Spend coins
  const spendCoins = useCallback((amount, desc = '') => {
    return new Promise((resolve) => {
      setState(s => {
        if (s.balance < amount) {
          resolve(false)
          return s
        }
        const tx = { type: 'spend', amount, desc, date: Date.now() }
        const txs = [tx, ...(s.transactions || [])].slice(0, 20)
        resolve(true)
        return {
          ...s,
          balance: s.balance - amount,
          totalSpent: (s.totalSpent || 0) + amount,
          transactions: txs,
        }
      })
    })
  }, [])

  // Buy pack
  const buyPack = useCallback(async (packId) => {
    const pack = ICON_PACKS.find(p => p.id === packId)
    if (!pack) return { success: false, reason: 'Pack tidak ditemukan' }
    if (state.ownedPacks.includes(packId)) return { success: false, reason: 'Sudah dimiliki' }
    if (state.balance < pack.price) return { success: false, reason: 'Coin tidak cukup' }

    const ok = await spendCoins(pack.price, `Beli ${pack.name}`)
    if (ok) {
      setState(s => ({ ...s, ownedPacks: [...s.ownedPacks, packId] }))
      return { success: true }
    }
    return { success: false, reason: 'Gagal membeli' }
  }, [state.ownedPacks, state.balance, spendCoins])

  // Set active pack
  const setActivePack = useCallback((packId) => {
    if (!state.ownedPacks.includes(packId)) return
    setState(s => ({ ...s, activePack: packId }))
  }, [state.ownedPacks])

  // Claim daily reward
  const claimDaily = useCallback(() => {
    const today = new Date().toDateString()
    if (state.lastDailyClaim === today) return { success: false, reason: 'Sudah diklaim hari ini' }

    const yesterday = new Date(Date.now() - 86400000).toDateString()
    let newStreak = state.lastDailyClaim === yesterday ? (state.dailyStreak || 0) + 1 : 1
    if (newStreak > 7) newStreak = 1

    const reward = COIN_REWARDS.dailyLogin[Math.min(newStreak - 1, COIN_REWARDS.dailyLogin.length - 1)]

    setState(s => ({
      ...s,
      lastDailyClaim: today,
      dailyStreak: newStreak,
    }))
    earnCoins(reward, `Login harian (hari ke-${newStreak})`)
    return { success: true, amount: reward, streak: newStreak }
  }, [state.lastDailyClaim, state.dailyStreak, earnCoins])

  // Check if daily is claimable
  const isDailyClaimable = state.lastDailyClaim !== new Date().toDateString()

  // Get active icon pack
  const getActiveIcons = useCallback(() => {
    const pack = ICON_PACKS.find(p => p.id === state.activePack)
    return pack ? pack.icons : ICON_PACKS[0].icons
  }, [state.activePack])

  return (
    <CoinContext.Provider value={{
      coins: state.balance,
      totalEarned: state.totalEarned,
      totalSpent: state.totalSpent,
      ownedPacks: state.ownedPacks,
      activePack: state.activePack,
      dailyStreak: state.dailyStreak,
      transactions: state.transactions || [],
      isDailyClaimable,
      coinAnim,
      earnCoins,
      spendCoins,
      buyPack,
      setActivePack,
      claimDaily,
      getActiveIcons,
    }}>
      {children}
    </CoinContext.Provider>
  )
}

export function useCoins() {
  return useContext(CoinContext)
}
