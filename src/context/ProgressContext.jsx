import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'
import { useLimitedMode } from './LimitedModeContext.jsx'

const ProgressContext = createContext(null)

// ─── XP Level thresholds ─────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000,
  7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000,
]
export const LEVEL_TITLES = [
  'Pemula', 'Penjelajah', 'Petualang', 'Penantang', 'Pejuang',
  'Pahlawan', 'Juara', 'Legenda', 'Master', 'Grandmaster',
  'Dewa Otak', 'Ultrabrain', 'Kosmik', 'Mythic', 'Immortal',
  'Transcendent', 'Omega', 'Supreme', 'Celestial', 'BrainGod',
]

// ─── Level Rewards (Borders & Title Colors) ──────────────────────────────────
export const LEVEL_REWARDS = {
  1: { id: 'wood', name: 'Bingkai Kayu', color: '#8d6e63', border: '5px solid #8d6e63', bgColor: '#8d6e6322' },
  5: { id: 'silver', name: 'Bingkai Perak', color: '#b0bec5', border: '5px solid #b0bec5', boxShadow: '0 0 12px #b0bec588', bgColor: '#b0bec522' },
  10: { id: 'gold', name: 'Bingkai Emas', color: '#ffd700', border: '5px solid #ffd700', boxShadow: '0 0 16px #ffd700aa', bgColor: '#ffd70022' },
  15: { id: 'neon', name: 'Bingkai Neon', color: '#00f5ff', border: '5px solid #00f5ff', boxShadow: '0 0 20px #00f5ffcc', bgColor: '#00f5ff22' },
  20: { id: 'fire', name: 'Aura Membara', color: '#ff4500', border: '5px solid #ff4500', boxShadow: '0 0 24px #ff4500cc', bgColor: '#ff450022' },
  25: { id: 'dragon', name: 'Aura Naga', color: '#6c5ce7', border: '5px solid #6c5ce7', boxShadow: '0 0 28px #6c5ce7cc', bgColor: '#6c5ce722' },
}

export const getLevelRoadReward = (level) => {
  const MILESTONES = {
    2:  { type: 'coins', amount: 100, label: '100 Koin', icon: '🪙', color: '#F9A825' },
    5:  { type: 'chest', id: 'premium_chest', amount: 1, label: 'Peti Premium', icon: '🎁', color: '#6c5ce7' },
    10: { type: 'ship', id: 'bp-v2-1', label: 'Kapal: Veridian Aurora', icon: '🚀', color: '#4ECDC4' },
    15: { type: 'border', id: 'neon-blue', label: 'Bingkai: Neon Blue', icon: '🖼️', color: '#00f5ff' },
    20: { type: 'title', value: 'Pelopor Angkasa', label: 'Gelar: Pelopor Angkasa', icon: '🎖️', color: '#ff4500' },
    25: { type: 'chest', id: 'premium_chest', amount: 3, label: '3x Peti Premium', icon: '🎁', color: '#6c5ce7' },
    30: { type: 'dash-skin', id: 'nebula-runner', label: 'Skin Dash: Nebula Runner', icon: '💎', color: '#ff0064' },
    35: { type: 'ship', id: 'shadow', label: 'Kapal: Shadow Voyager', icon: '🛸', color: '#a29bfe' },
    40: { type: 'border', id: 'mythic-celestial', label: 'Bingkai: Mythic Celestial', icon: '🌟', color: '#FFD700' },
    45: { type: 'chest', id: 'premium_chest', amount: 5, label: '5x Peti Premium', icon: '🎁', color: '#6c5ce7' },
    50: { 
      type: 'multi', 
      label: 'ULTIMATE LEGEND', 
      icon: '👑', color: '#FFD700',
      list: [
        { type: 'title', value: 'BrainGod', label: 'Gelar: BrainGod' },
        { type: 'border', id: 'solar-flare', label: 'Bingkai: Solar Flare' },
        { type: 'coins', amount: 5000, label: '5000 Koin' }
      ]
    }
  }

  if (MILESTONES[level]) return { ...MILESTONES[level], isMilestone: true }
  
  if (level % 2 === 0) {
    return { type: 'coins', amount: level * 10, label: `${level * 10} Koin`, icon: '🪙', color: '#F9A825', isMilestone: false }
  } else {
    return { type: 'chest', id: 'basic_chest', amount: 1, label: 'Peti Basic', icon: '🎒', color: '#A29BFE', isMilestone: false }
  }
}

// ─── Battle Pass Season 1 ──────────────────────────────────────────────────
export const BP_SEASON = {
  id: 'season_1',
  name: 'Neon Genesis',
  endDate: '2026-05-01',
}

export const BP_REWARDS = [
  { tier: 1,  xp: 200,   reward: { type: 'coins', amount: 100, label: '100 Koin' } },
  { tier: 2,  xp: 500,   reward: { type: 'title', value: 'Neon Initiate', label: 'Gelar: Neon Initiate' } },
  { tier: 3,  xp: 900,   reward: { type: 'coins', amount: 200, label: '200 Koin' } },
  { tier: 4,  xp: 1400,  reward: { type: 'border', value: 'neon-blue', label: 'Bingkai: Neon Blue' } },
  { tier: 5,  xp: 2000,  reward: { type: 'ship', value: 'bp-v2-1', label: 'Kapal: Veridian Aurora' } },
  { tier: 6,  xp: 2700,  reward: { type: 'title', value: 'Cyber Runner', label: 'Gelar: Cyber Runner' } },
  { tier: 7,  xp: 3500,  reward: { type: 'border', value: 'mythic-celestial', label: 'Bingkai: Mythic Celestial' } },
  { tier: 8,  xp: 4400,  reward: { type: 'coins', amount: 750, label: '750 Koin' } },
  { tier: 9,  xp: 5400,  reward: { type: 'title', value: 'Grid Master', label: 'Gelar: Grid Master' } },
  { tier: 10, xp: 6500,  reward: { type: 'ship', value: 'bp-v2-2', label: 'Kapal: Amber Horizon' } },
  { tier: 11, xp: 7700,  reward: { type: 'coins', amount: 1000, label: '1.000 Koin' } },
  { tier: 12, xp: 9000,  reward: { type: 'border', value: 'void-overlord', label: 'Bingkai: Void Overlord' } },
  { tier: 13, xp: 10400, reward: { type: 'ship', value: 'bp-v2-3', label: 'Kapal: Cobalt Wings' } },
  { tier: 14, xp: 12000, reward: { type: 'coins', amount: 1500, label: '1.500 Koin' } },
  { tier: 15, xp: 14000, reward: { type: 'ship', value: 'astra-warden', label: 'Kapal: Veridian Warden' } },
  { tier: 16, xp: 15500, reward: { type: 'coins', amount: 2000, label: '2.000 Koin' } },
  { tier: 17, xp: 17100, reward: { type: 'title', value: 'Cyber Ghost', label: 'Gelar: Cyber Ghost' } },
  { tier: 18, xp: 18800, reward: { type: 'border', value: 'neon-matrix', label: 'Bingkai: Neon Matrix' } },
  { tier: 19, xp: 20600, reward: { type: 'coins', amount: 2500, label: '2.500 Koin' } },
  { tier: 20, xp: 22500, reward: { type: 'ship', value: 'shadow', label: 'Kapal: Shadow Voyager' } },
  { tier: 21, xp: 24500, reward: { type: 'title', value: 'Void Runner', label: 'Gelar: Void Runner' } },
  { tier: 22, xp: 26600, reward: { type: 'coins', amount: 3000, label: '3.000 Koin' } },
  { tier: 23, xp: 28800, reward: { type: 'border', value: 'solar-flare', label: 'Bingkai: Solar Flare' } },
  { tier: 24, xp: 31100, reward: { type: 'title', value: 'Solar Champion', label: 'Gelar: Solar Champion' } },
  { tier: 25, xp: 33500, reward: { type: 'ship', value: 'falcon', label: 'Kapal: Solar Interceptor' } },
  { tier: 26, xp: 36000, reward: { type: 'dash-skin', value: 'nebula-runner', label: 'Skin: Nebula Runner' } },
  { tier: 27, xp: 38600, reward: { type: 'title', value: 'Zenith Pilot', label: 'Gelar: Zenith Pilot' } },
  { tier: 28, xp: 41300, reward: { type: 'border', value: 'plasma-glow', label: 'Bingkai: Transcendent Glow' } },
  { tier: 29, xp: 44100, reward: { type: 'dash-skin', value: 'magma-surge', label: 'Skin: Magma Surge' } },
  { tier: 30, xp: 48000, reward: { 
    type: 'multi', 
    label: 'ULTIMATE REWARD',
    list: [
      { type: 'ship', value: 'bp-v2-final', label: 'Kapal: Aegis Prime - X1' },
      { type: 'dash-skin', value: 'void-phantom', label: 'Skin: Void Phantom' }
    ]
  }},
]

export const CUSTOM_BORDERS = {
  'neon-blue':   { id: 'neon-blue',   name: 'Neon Blue',   color: '#00f5ff', border: '5px solid #00f5ff', boxShadow: '0 0 15px #00f5ffaa', bgColor: '#00f5ff11' },
  'cyber-grid':  { id: 'cyber-grid',  name: 'Cyber Grid',  color: '#a29bfe', border: '5px solid #a29bfe', boxShadow: '0 0 15px #a29bfeaa', bgColor: '#a29bfe11' },
  'plasma-glow': { id: 'plasma-glow', name: 'Plasma Glow', color: '#ff7675', border: '5px solid #ff7675', boxShadow: '0 0 15px #ff7675aa', bgColor: '#ff767511' },
  'mythic-celestial': { 
    id: 'mythic-celestial', name: 'Mythic Celestial', color: '#FFD700', 
    border: '5px double #FFD700', 
    boxShadow: '0 0 20px #FFD700, inset 0 0 10px #ffffff', 
    bgColor: 'linear-gradient(45deg, #ffd70033, #ffffff22)',
    animation: 'bp-border-pulse 2s infinite alternate'
  },
  'void-overlord': { 
    id: 'void-overlord', name: 'Void Overlord', color: '#a29bfe', 
    border: '5px solid #6c5ce7', 
    boxShadow: '0 0 30px #6c5ce7, 0 0 10px #000 inset', 
    bgColor: '#000000bb',
    animation: 'bp-border-glitch 3s infinite'
  },
  'neon-matrix': { 
    id: 'neon-matrix', name: 'Neon Matrix', color: '#00FF88', 
    border: '5px solid #00FF88', 
    boxShadow: '0 0 20px #00FF8888', 
    bgColor: 'repeating-linear-gradient(45deg, #00ff8811, #000 10px)'
  },
  'solar-flare': { 
    id: 'solar-flare', name: 'Solar Flare', color: '#FFD700', 
    border: '5px solid #FF8C00', 
    boxShadow: '0 0 25px #FF4500cc', 
    bgColor: 'radial-gradient(circle, #ffD70033, #ff450011)'
  },
}

export function getBorderForLevel(level) {
  let activeRew = LEVEL_REWARDS[1]
  for (const [lvl, rew] of Object.entries(LEVEL_REWARDS)) {
    if (level >= Number(lvl)) activeRew = rew
  }
  return activeRew
}

export function getTitleColorForLevel(level) {
  if (level >= 20) return { bg: 'linear-gradient(135deg,#ff4500,#ff8c00)', text: '#fff' }
  if (level >= 15) return { bg: 'linear-gradient(135deg,#6c5ce7,#a29bfe)', text: '#fff' }
  if (level >= 10) return { bg: 'linear-gradient(135deg,#d4af37,#ffd700)', text: '#000' }
  if (level >= 5)  return { bg: 'linear-gradient(135deg,#95a5a6,#bdc3c7)', text: '#000' }
  return { bg: 'transparent', text: '#A29BFE' }
}

export function getLevel(xp) {
  let lv = 0
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { lv = i; break }
  }
  return lv
}

export function getLevelInfo(xp) {
  const level = getLevel(xp)
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || currentThreshold + 5000
  const progress = (xp - currentThreshold) / (nextThreshold - currentThreshold)
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)],
    xp,
    currentThreshold,
    nextThreshold,
    progress: Math.min(progress, 1),
    xpToNext: nextThreshold - xp,
  }
}

export function getComboMultiplier(streak) {
  if (streak >= 14) return 2.0
  if (streak >= 7) return 1.5
  if (streak >= 3) return 1.2
  return 1.0
}

// ─── Achievement Definitions ─────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // Milestone - games played
  { id: 'first_game',     icon: '🎮', title: 'Langkah Pertama',   desc: 'Selesaikan 1 game',           category: 'milestone', check: (s) => s.totalGamesPlayed >= 1, progress: (s) => ({ cur: s.totalGamesPlayed || 0, max: 1 }) },
  { id: 'gamer_5',        icon: '🕹️', title: 'Gamer Sejati',      desc: 'Selesaikan 5 game',           category: 'milestone', check: (s) => s.totalGamesPlayed >= 5, progress: (s) => ({ cur: Math.min(s.totalGamesPlayed || 0, 5), max: 5 }) },
  { id: 'gamer_25',       icon: '🏅', title: 'Tidak Bisa Berhenti',desc: 'Selesaikan 25 game',          category: 'milestone', check: (s) => s.totalGamesPlayed >= 25, progress: (s) => ({ cur: Math.min(s.totalGamesPlayed || 0, 25), max: 25 }) },
  { id: 'gamer_100',      icon: '👑', title: 'Centurion',          desc: 'Selesaikan 100 game',          category: 'milestone', check: (s) => s.totalGamesPlayed >= 100, progress: (s) => ({ cur: Math.min(s.totalGamesPlayed || 0, 100), max: 100 }), reward: { coins: 1000, title: 'Ancient One' } },

  // Variety - different games
  { id: 'explorer_2',     icon: '🧭', title: 'Penjelajah',         desc: 'Mainkan 2 game berbeda',       category: 'variety',   check: (s) => s.uniqueGamesPlayed >= 2, progress: (s) => ({ cur: Math.min(s.uniqueGamesPlayed || 0, 2), max: 2 }), reward: { coins: 50 } },
  { id: 'explorer_4',     icon: '🌍', title: 'Petualang Dunia',    desc: 'Mainkan semua 14 game',        category: 'variety',   check: (s) => s.uniqueGamesPlayed >= 14, progress: (s) => ({ cur: Math.min(s.uniqueGamesPlayed || 0, 14), max: 14 }), reward: { coins: 500, title: 'World Traveler' } },

  // Difficulty - hard mode
  { id: 'brave',          icon: '🦁', title: 'Pemberani',          desc: 'Selesaikan 1 game di mode Sulit', category: 'skill',  check: (s) => s.hardGamesWon >= 1, progress: (s) => ({ cur: Math.min(s.hardGamesWon || 0, 1), max: 1 }), reward: { coins: 100 } },
  { id: 'fearless',       icon: '⚔️', title: 'Tanpa Takut',        desc: 'Selesaikan 10 game di mode Sulit',category: 'skill',  check: (s) => s.hardGamesWon >= 10, progress: (s) => ({ cur: Math.min(s.hardGamesWon || 0, 10), max: 10 }), reward: { coins: 500, title: 'Demon Slayer' } },

  // Streak
  { id: 'streak_3',       icon: '🔥', title: 'Tiga Hari Berturut', desc: 'Main 3 hari berturut-turut',   category: 'streak',  check: (s) => s.currentStreak >= 3, progress: (s) => ({ cur: Math.min(s.currentStreak || 0, 3), max: 3 }), reward: { coins: 50 } },
  { id: 'streak_7',       icon: '💥', title: 'Seminggu Penuh',     desc: 'Main 7 hari berturut-turut',   category: 'streak',  check: (s) => s.currentStreak >= 7, progress: (s) => ({ cur: Math.min(s.currentStreak || 0, 7), max: 7 }), reward: { coins: 150 } },
  { id: 'streak_14',      icon: '🌟', title: 'Dua Minggu Nonstop', desc: 'Main 14 hari berturut-turut',  category: 'streak',  check: (s) => s.currentStreak >= 14, progress: (s) => ({ cur: Math.min(s.currentStreak || 0, 14), max: 14 }), reward: { coins: 300 } },
  { id: 'streak_30',      icon: '🏆', title: 'Legenda 30 Hari',   desc: 'Main 30 hari berturut-turut',  category: 'streak',  check: (s) => s.currentStreak >= 30, progress: (s) => ({ cur: Math.min(s.currentStreak || 0, 30), max: 30 }), reward: { coins: 1000, title: 'The Immortal' } },

  // Score
  { id: 'score_1k',       icon: '💰', title: 'Seribu Pertama',     desc: 'Kumpulkan total 1.000 XP',     category: 'score',   check: (s) => s.totalXP >= 1000, progress: (s) => ({ cur: Math.min(s.totalXP || 0, 1000), max: 1000 }), reward: { coins: 100 } },
  { id: 'score_5k',       icon: '💎', title: 'Kolektor XP',        desc: 'Kumpulkan total 5.000 XP',     category: 'score',   check: (s) => s.totalXP >= 5000, progress: (s) => ({ cur: Math.min(s.totalXP || 0, 5000), max: 5000 }), reward: { coins: 500 } },
  { id: 'score_20k',      icon: '🌈', title: 'XP Miliader',        desc: 'Kumpulkan total 20.000 XP',    category: 'score',   check: (s) => s.totalXP >= 20000, progress: (s) => ({ cur: Math.min(s.totalXP || 0, 20000), max: 20000 }), reward: { coins: 2000, title: 'XP Tycoon' } },

  // Perfect
  { id: 'perfect_star',   icon: '⭐', title: 'Bintang Sempurna',   desc: 'Dapatkan 3 bintang di game apapun', category: 'perfect', check: (s) => s.threeStarCount >= 1, progress: (s) => ({ cur: Math.min(s.threeStarCount || 0, 1), max: 1 }) },
  { id: 'star_collector',  icon: '🌟', title: 'Kolektor Bintang',  desc: 'Dapatkan 3 bintang 10 kali',   category: 'perfect', check: (s) => s.threeStarCount >= 10, progress: (s) => ({ cur: Math.min(s.threeStarCount || 0, 10), max: 10 }) },

  // Speed
  { id: 'speedster',      icon: '⚡', title: 'Secepat Kilat',      desc: 'Selesaikan game dalam < 30 detik', category: 'speed', check: (s) => s.fastestGame <= 30 && s.fastestGame > 0, progress: (s) => ({ cur: s.fastestGame > 0 ? 1 : 0, max: 1 }), reward: { coins: 500, title: 'The Lightning' } },

  // Per-game specific
  { id: 'memory_master',  icon: '🧠', title: 'Memori Sempurna',    desc: 'Menangkan Memory Card Match 3x', category: 'game',  check: (s) => (s.gameWins['memory-card'] || 0) >= 3, progress: (s) => ({ cur: Math.min(s.gameWins?.['memory-card'] || 0, 3), max: 3 }), reward: { coins: 150 } },
  { id: 'snake_king',     icon: '🐍', title: 'Raja Ular',          desc: 'Capai skor 50+ di Slither Worm',  category: 'game',  check: (s) => (s.gameBests['slither-worm'] || 0) >= 50, progress: (s) => ({ cur: Math.min(s.gameBests?.['slither-worm'] || 0, 50), max: 50 }), reward: { coins: 300, title: 'King of Slither' } },
  { id: 'block_master',   icon: '🔗', title: 'Master Blok',        desc: 'Capai 1024+ di Connect Blocks',   category: 'game',  check: (s) => (s.gameBests['2048'] || 0) >= 1024, progress: (s) => ({ cur: Math.min(s.gameBests?.['2048'] || 0, 1024), max: 1024 }), reward: { coins: 300, title: 'Block Legend' } },
  { id: 'word_hunter',    icon: '🔍', title: 'Pemburu Kata',       desc: 'Selesaikan Word Search 5 kali',   category: 'game',  check: (s) => (s.gameWins['word-search'] || 0) >= 5, progress: (s) => ({ cur: Math.min(s.gameWins?.['word-search'] || 0, 5), max: 5 }), reward: { coins: 250 } },
  { id: 'space_ace',      icon: '🚀', title: 'Ace Pilot',          desc: 'Menangkan Space Shooter 3x',      category: 'game',  check: (s) => (s.gameWins['space-shooter'] || 0) >= 3, progress: (s) => ({ cur: Math.min(s.gameWins?.['space-shooter'] || 0, 3), max: 3 }), reward: { coins: 500, title: 'Star Lord' } },
  { id: 'hangman_hero',   icon: '💀', title: 'Penyelamat Kata',    desc: 'Menangkan Hangman 5 kali',        category: 'game',  check: (s) => (s.gameWins['hangman'] || 0) >= 5, progress: (s) => ({ cur: Math.min(s.gameWins?.['hangman'] || 0, 5), max: 5 }), reward: { coins: 200 } },
  { id: 'sort_master',    icon: '🧪', title: 'Master Sortir',      desc: 'Menangkan Color Sort 5 kali',     category: 'game',  check: (s) => (s.gameWins['color-sort'] || 0) >= 5, progress: (s) => ({ cur: Math.min(s.gameWins?.['color-sort'] || 0, 5), max: 5 }), reward: { coins: 200 } },
  { id: 'sudoku_sage',    icon: '🔢', title: 'Ahli Sudoku',        desc: 'Menangkan Sudoku 3 kali',         category: 'game',  check: (s) => (s.gameWins['sudoku'] || 0) >= 3, progress: (s) => ({ cur: Math.min(s.gameWins?.['sudoku'] || 0, 3), max: 3 }), reward: { coins: 500, title: 'Number Sage' } },
  { id: 'jigsaw_pro',     icon: '🧩', title: 'Tukang Puzzle',      desc: 'Menangkan Jigsaw Puzzle 5 kali',  category: 'game',  check: (s) => (s.gameWins['jigsaw'] || 0) >= 5, progress: (s) => ({ cur: Math.min(s.gameWins?.['jigsaw'] || 0, 5), max: 5 }), reward: { coins: 250 } },
  { id: 'pattern_pro',    icon: '🧠', title: 'Pattern Master',     desc: 'Menangkan Memory Pattern Pro 3x', category: 'game',  check: (s) => (s.gameWins['memory-pattern'] || 0) >= 3, progress: (s) => ({ cur: Math.min(s.gameWins?.['memory-pattern'] || 0, 3), max: 3 }), reward: { coins: 500, title: 'The Architect' } },
  { id: 'brick_master',   icon: '🧱', title: 'Master Penghancur',  desc: 'Menangkan Brick Breaker 3 kali',  category: 'game',  check: (s) => (s.gameWins['brick-breaker'] || 0) >= 3, progress: (s) => ({ cur: Math.min(s.gameWins?.['brick-breaker'] || 0, 3), max: 3 }), reward: { coins: 400 } },
  { id: 'reflex_king',    icon: '⚡', title: 'Raja Refleks',       desc: 'Menangkan Reaction Test 5 kali',  category: 'game',  check: (s) => (s.gameWins['reaction-test'] || 0) >= 5, progress: (s) => ({ cur: Math.min(s.gameWins?.['reaction-test'] || 0, 5), max: 5 }), reward: { coins: 300, title: 'Flash' } },
  { id: 'neon_runner',     icon: '💎', title: 'Pelari Neon',       desc: 'Menangkan Neon Dash 5 kali',      category: 'game',  check: (s) => (s.gameWins['neon-dash'] || 0) >= 5, progress: (s) => ({ cur: Math.min(s.gameWins?.['neon-dash'] || 0, 5), max: 5 }), reward: { coins: 500, title: 'Neon Phantom' } },
  { id: 'voxel_racer',    icon: '🚗', title: 'Pembalap Voxel',    desc: 'Menangkan Voxel Racer 3 kali',    category: 'game',  check: (s) => (s.gameWins['voxel-racer'] || 0) >= 3, progress: (s) => ({ cur: Math.min(s.gameWins?.['voxel-racer'] || 0, 3), max: 3 }), reward: { coins: 400, title: 'Ghost Racer' } },
]

// ─── Default state ───────────────────────────────────────────────────────────
function getDefaultProgress() {
  return {
    totalXP: 0,
    totalGamesPlayed: 0,
    uniqueGamesPlayed: 0,
    gamesPlayedSet: [],    // list of game IDs played
    hardGamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayDate: null,
    threeStarCount: 0,
    fastestGame: 0,        // seconds, 0 = not set
    gameWins: {},           // { gameId: count }
    gameBests: {},          // { gameId: bestScore }
    totalPlayTime: 0,       // seconds
    unlockedAchievements: [],
    newAchievements: [],    // achievements just unlocked (for notification)
    selectedTitle: null,    // User-selected custom title
    unlockedTitles: [],      // List of unlocked titles (strings)
    seasonXP: 0,             // Battle Pass XP
    claimedBPTiers: [],      // List of claimed tier numbers
    claimedLevelRewards: [], // List of claimed level reward numbers
    selectedBorder: null,    // Custom border ID
    unlockedBorders: [],     // List of unlocked border IDs
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function ProgressProvider({ children }) {
  const { currentMode } = useLimitedMode()
  const [progress, setProgress] = useState(() => {
    const saved = getJSON(StorageKeys.XP)
    return saved ? { ...getDefaultProgress(), ...saved } : getDefaultProgress()
  })

  // Save on change
  useEffect(() => {
    setJSON(StorageKeys.XP, progress)
  }, [progress])

  // Reload from localStorage when cloud sync completes
  useEffect(() => {
    const handler = () => {
      const saved = getJSON(StorageKeys.XP)
      if (saved) setProgress(p => ({ ...getDefaultProgress(), ...saved }))
    }
    window.addEventListener('bp-cloud-sync', handler)
    return () => window.removeEventListener('bp-cloud-sync', handler)
  }, [])

  // Update streak on mount
  useEffect(() => {
    setProgress(p => {
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()

      if (p.lastPlayDate === today) return p // already counted today

      let newStreak = p.currentStreak
      if (p.lastPlayDate === yesterday) {
        newStreak = p.currentStreak + 1
      } else if (p.lastPlayDate !== today) {
        newStreak = 1
      }

      return {
        ...p,
        currentStreak: newStreak,
        maxStreak: Math.max(p.maxStreak, newStreak),
        lastPlayDate: today,
      }
    })
  }, [])

  // Report a game result
  const reportGameResult = useCallback(({ gameId, difficultyId, won, score, stars, timeSec }) => {
    // Dispatch event for leaderboard auto-submission
    try {
      window.dispatchEvent(new CustomEvent('bp-game-result', {
        detail: { gameId, difficultyId, won, score, stars, timeSec }
      }))
    } catch(e) {}

    setProgress(p => {
      const next = { ...p }
      const oldLevel = getLevel(p.totalXP || 0)

      // XP calculation with streak combo multiplier
      let xpGain = 20 // base for playing
      if (won) xpGain += 30
      if (score) xpGain += Math.min(Math.floor(score / 10), 50) // cap at 50 bonus
      if (stars === 3) xpGain += 25
      if (difficultyId === 'hard') xpGain += 15
      if (difficultyId === 'medium') xpGain += 5

      // Streak combo multiplier
      const streak = next.currentStreak || 0
      const comboMultiplier = streak >= 14 ? 2.0 : streak >= 7 ? 1.5 : streak >= 3 ? 1.2 : 1.0
      xpGain = Math.round(xpGain * comboMultiplier)

      // Limited Mode Event Multiplier
      if (currentMode) {
        if (currentMode.id === 'speed' && difficultyId === 'easy') {
          xpGain = Math.round(xpGain * currentMode.xpMultiplier)
        } else if (currentMode.id === 'survival' && difficultyId === 'hard') {
          xpGain = Math.round(xpGain * currentMode.xpMultiplier)
        } else if (currentMode.id === 'no_mistakes' && stars === 3) {
          xpGain = Math.round(xpGain * currentMode.xpMultiplier)
        }
      }

      next.totalXP = (next.totalXP || 0) + xpGain

      // Level Up Detection
      const newLevel = getLevel(next.totalXP)
      if (newLevel > oldLevel) {
        next.levelUpData = { oldLevel, newLevel }
      }

      next.totalGamesPlayed = (next.totalGamesPlayed || 0) + 1

      // Track date
      next.lastPlayDate = new Date().toDateString()

      // Unique games
      const gamesSet = new Set(next.gamesPlayedSet || [])
      gamesSet.add(gameId)
      next.gamesPlayedSet = [...gamesSet]
      next.uniqueGamesPlayed = gamesSet.size

      // Hard mode wins
      if (won && difficultyId === 'hard') {
        next.hardGamesWon = (next.hardGamesWon || 0) + 1
      }

      // 3-star count
      if (stars === 3) {
        next.threeStarCount = (next.threeStarCount || 0) + 1
      }

      // Fastest game
      if (won && timeSec && timeSec > 0) {
        if (!next.fastestGame || timeSec < next.fastestGame) {
          next.fastestGame = timeSec
        }
      }

      // Per-game wins
      if (won) {
        next.gameWins = { ...next.gameWins }
        next.gameWins[gameId] = (next.gameWins[gameId] || 0) + 1
      }

      // Per-game best scores
      if (score && score > 0) {
        next.gameBests = { ...next.gameBests }
        if (!next.gameBests[gameId] || score > next.gameBests[gameId]) {
          next.gameBests[gameId] = score
        }
      }

      // Play time
      if (timeSec) {
        next.totalPlayTime = (next.totalPlayTime || 0) + timeSec
      }

      // Check achievements
      const alreadyUnlocked = new Set(next.unlockedAchievements || [])
      const newlyUnlocked = []
      for (const ach of ACHIEVEMENTS) {
        if (alreadyUnlocked.has(ach.id)) continue
        if (ach.check(next)) {
          alreadyUnlocked.add(ach.id)
          newlyUnlocked.push(ach.id)
        }
      }
      next.unlockedAchievements = [...alreadyUnlocked]
      next.newAchievements = newlyUnlocked

      // Grant rewards for new achievements
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(achId => {
          const ach = ACHIEVEMENTS.find(a => a.id === achId)
          if (ach && ach.reward) {
            // Reward Coins
            if (ach.reward.coins) {
              window.dispatchEvent(new CustomEvent('bp-add-coins', {
                detail: { amount: ach.reward.coins, desc: `Achievement: ${ach.title}` }
              }))
            }
            // Reward Title
            if (ach.reward.title) {
              const currentTitles = new Set(next.unlockedTitles || [])
              currentTitles.add(ach.reward.title)
              next.unlockedTitles = [...currentTitles]
            }
          }
        })
      }

      // Automatically unlock Level Titles
      const allLevelTitles = LEVEL_TITLES.slice(0, newLevel + 1)
      const currentTitlesCount = (next.unlockedTitles || []).length
      const updatedTitlesSet = new Set(next.unlockedTitles || [])
      allLevelTitles.forEach(t => updatedTitlesSet.add(t))
      if (updatedTitlesSet.size > currentTitlesCount) {
        next.unlockedTitles = [...updatedTitlesSet]
      }

      next.seasonXP = (next.seasonXP || 0) + xpGain

      return next
    })
  }, [currentMode])

  // Battle Pass & Border Management
  const claimBPTier = useCallback((tier) => {
    const tierData = BP_REWARDS.find(r => r.tier === tier)
    if (!tierData) return { success: false, reason: 'Tier tidak valid' }
    
    setProgress(p => {
      if (p.claimedBPTiers?.includes(tier)) return p
      if (p.seasonXP < tierData.xp) return p
      
      const next = { ...p, claimedBPTiers: [...(p.claimedBPTiers || []), tier] }
      const { reward } = tierData
      
      const grantReward = (rew) => {
        if (rew.type === 'coins') {
          window.dispatchEvent(new CustomEvent('bp-add-coins', {
            detail: { amount: rew.amount, desc: `Battle Pass: ${tierData.label || rew.label}` }
          }))
        } else if (rew.type === 'title') {
          const titles = new Set(next.unlockedTitles)
          titles.add(rew.value)
          next.unlockedTitles = [...titles]
        } else if (rew.type === 'border') {
          const borders = new Set(next.unlockedBorders)
          borders.add(rew.value)
          next.unlockedBorders = [...borders]
        } else if (rew.type === 'ship') {
          window.dispatchEvent(new CustomEvent('bp-wheel-unlock', {
            detail: { item: { type: 'ships', id: rew.value } }
          }))
        } else if (rew.type === 'dash-skin') {
          window.dispatchEvent(new CustomEvent('bp-wheel-unlock', {
            detail: { item: { type: 'dash-themes', id: rew.value } }
          }))
        }
      }

      if (reward.type === 'multi') {
        reward.list.forEach(grantReward)
      } else {
        grantReward(reward)
      }
      
      return next
    })
    return { success: true }
  }, [])

  // ─── Level Road Management ─────────────────────────────────────────────────
  const claimLevelReward = useCallback((level) => {
    const myLevel = getLevel(progress.totalXP || 0)
    if (level > myLevel) return { success: false, reason: 'Level belum dicapai' }

    setProgress(p => {
      if (p.claimedLevelRewards?.includes(level)) return p
      if (level > getLevel(p.totalXP || 0)) return p

      const next = { ...p, claimedLevelRewards: [...(p.claimedLevelRewards || []), level] }
      const reward = getLevelRoadReward(level)

      const grantReward = (rew) => {
        if (rew.type === 'coins') {
          window.dispatchEvent(new CustomEvent('bp-add-coins', {
            detail: { amount: rew.amount, desc: `Trophy Road Lvl ${level}` }
          }))
        } else if (rew.type === 'title') {
          const titles = new Set(next.unlockedTitles || [])
          titles.add(rew.value)
          next.unlockedTitles = [...titles]
        } else if (rew.type === 'border') {
          const borders = new Set(next.unlockedBorders || [])
          borders.add(rew.id) // note: using rew.id here per definition
          next.unlockedBorders = [...borders]
        } else if (rew.type === 'ship') {
          window.dispatchEvent(new CustomEvent('bp-wheel-unlock', {
            detail: { item: { type: 'ships', id: rew.id } }
          }))
        } else if (rew.type === 'dash-skin') {
          window.dispatchEvent(new CustomEvent('bp-wheel-unlock', {
            detail: { item: { type: 'dash-themes', id: rew.id } }
          }))
        } else if (rew.type === 'chest') {
          window.dispatchEvent(new CustomEvent('bp-add-chest', {
            detail: { chestId: rew.id, amount: rew.amount }
          }))
        }
      }

      if (reward.type === 'multi') {
        reward.list.forEach(grantReward)
      } else {
        grantReward(reward)
      }

      return next
    })
    return { success: true }
  }, [progress.totalXP])

  const setSelectedBorder = useCallback((borderId) => {
    setProgress(p => ({ ...p, selectedBorder: borderId }))
  }, [])

  // Title management
  const setSelectedTitle = useCallback((title) => {
    setProgress(p => ({ ...p, selectedTitle: title }))
  }, [])

  const unlockTitle = useCallback((title) => {
    setProgress(p => {
      const set = new Set(p.unlockedTitles || [])
      if (set.has(title)) return p
      set.add(title)
      return { ...p, unlockedTitles: [...set] }
    })
  }, [])

  const clearNewAchievements = useCallback(() => {
    setProgress(p => ({ ...p, newAchievements: [] }))
  }, [])

  const clearLevelUp = useCallback(() => {
    setProgress(p => ({ ...p, levelUpData: null }))
  }, [])

  return (
    <ProgressContext.Provider value={{ 
      progress, reportGameResult, 
      clearNewAchievements, clearLevelUp, 
      setSelectedTitle, unlockTitle,
      claimBPTier, claimLevelReward, setSelectedBorder,
      getLevelInfo: () => getLevelInfo(progress.totalXP || 0),
      getSeasonInfo: () => {
        const curXP = progress.seasonXP || 0
        let currentTier = 0
        let xpInTier = curXP
        let xpNeededForNext = BP_REWARDS[0].xp

        for (let i = 0; i < BP_REWARDS.length; i++) {
          const t = BP_REWARDS[i]
          if (curXP >= t.xp) {
            currentTier = t.tier
            if (BP_REWARDS[i + 1]) {
              xpInTier = curXP - t.xp
              xpNeededForNext = BP_REWARDS[i + 1].xp - t.xp
            } else {
              xpInTier = 1; xpNeededForNext = 1 // Maxed
            }
          } else {
            if (i === 0) {
              xpInTier = curXP
              xpNeededForNext = t.xp
            }
            break
          }
        }

        const hasRewardToClaim = BP_REWARDS.some(r => curXP >= r.xp && !progress.claimedBPTiers?.includes(r.tier))
        const maxXP = BP_REWARDS[BP_REWARDS.length - 1].xp

        return { 
          currentTier: currentTier || 0, 
          xpInTier: xpInTier || 0, 
          xpNeededForNext: xpNeededForNext || 1, 
          progress: Math.min(curXP / maxXP, 1) || 0,
          hasRewardToClaim: !!hasRewardToClaim
        }
      }
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
