import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT = [
  { emoji: '🗺️', title: 'Fields of Adventure', desc: 'Jelajahi dunia, buka peti harta karun, dan kumpulkan koin!', tip: 'Gerakkan karakter untuk explore.' },
  { emoji: '🎮', title: 'Kontrol', desc: 'WASD / Arrow keys untuk bergerak. Mobile: gunakan joystick virtual.', tip: 'Tekan E / tap tombol aksi untuk interaksi.' },
  { emoji: '📦', title: 'Peti Harta', desc: 'Temukan peti tersembunyi di seluruh map. Buka untuk dapat reward!', tip: 'Peti berwarna kuning — dekati lalu tekan aksi.' },
  { emoji: '⚠️', title: 'Jebakan', desc: 'Hati-hati spike trap! Kena = kehilangan HP.', tip: 'Perhatikan lantai — hindari area berbahaya!' },
]
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'
import { useHaptics } from '../../hooks/useHaptics.js'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { WinModal, LoseModal } from '../../components/GameLayout.jsx'

// ═══════════════════════════════════════════════
// TILE DEFINITIONS — source rects from tileset.png (256×752, 16px tiles)
// Format: [srcX, srcY, width, height]
// ═══════════════════════════════════════════════
const T = {
  GRASS1:      [0, 0, 16, 16],
  GRASS2:      [16, 0, 16, 16],
  GRASS3:      [0, 16, 16, 16],
  GRASS_STONE: [32, 0, 16, 16],
  DIRT1:       [48, 0, 16, 16],
  DIRT2:       [64, 0, 16, 16],
  ROCK1:       [80, 16, 16, 16],
  ROCK2:       [96, 16, 16, 16],
  PATH_H:      [48, 16, 16, 16],
  PATH_V:      [64, 16, 16, 16],
  BUSH:        [16, 32, 16, 16],
  TREE_TL:     [0, 64, 16, 16],
  TREE_TR:     [16, 64, 16, 16],
  TREE_BL:     [0, 80, 16, 16],
  TREE_BR:     [16, 80, 16, 16],
  FENCE_H:     [128, 96, 16, 16],
  FENCE_V:     [112, 96, 16, 16],
  FENCE_POST:  [144, 96, 16, 16],
  WATER1:      [64, 320, 16, 16],
  WATER2:      [80, 320, 16, 16],
  WATER_EDGE:  [48, 320, 16, 16],
  BRIDGE_H:    [128, 144, 16, 16],
  CHEST_CLOSED:[192, 0, 16, 16],
  CHEST_OPEN:  [208, 0, 16, 16],
  SPIKE:       [96, 0, 16, 16],
  FLOWER1:     [16, 0, 16, 16],
  FLOWER2:     [32, 16, 16, 16],
  STUMP:       [0, 0, 16, 16],
  CLIFF_TOP:   [0, 192, 16, 16],
  CLIFF_MID:   [0, 208, 16, 16],
  SIGN:        [224, 80, 16, 16],
  WELL_T:      [224, 640, 16, 16],
  WELL_B:      [224, 656, 16, 16],
  BARREL:      [192, 48, 16, 16],
}

// Tile type IDs for map
const _ = 0  // grass
const G = 1  // grass variant
const D = 2  // dirt path
const R = 3  // rock (solid)
const W = 4  // water (solid)
const B = 5  // bush (solid)
const F = 6  // fence (solid)
const TT = 7 // tree trunk (solid)
const TL = 8 // tree leaves (solid)
const C = 9  // chest
const S = 10 // spike trap
const BR = 11 // bridge
const FL = 12 // flowers
const ST = 13 // sign
const WE = 14 // well

// Which tiles block movement
const SOLID = new Set([R, W, B, F, TT, TL, WE])

// Tile ID → tileset source mapping
const TILE_SRC = {
  [_]:  T.GRASS1,
  [G]:  T.GRASS2,
  [D]:  T.DIRT1,
  [R]:  T.ROCK1,
  [W]:  T.WATER1,
  [B]:  T.BUSH,
  [F]:  T.FENCE_H,
  [TT]: T.TREE_BL,
  [TL]: T.TREE_TL,
  [C]:  T.CHEST_CLOSED,
  [S]:  T.SPIKE,
  [BR]: T.BRIDGE_H,
  [FL]: T.FLOWER1,
  [ST]: T.SIGN,
  [WE]: T.WELL_T,
}

// ═══════════════════════════════════════════════
// MAP DATA — 50×40 tiles open world
// ═══════════════════════════════════════════════
const MAP_W = 50
const MAP_H = 40
const TILE_SIZE = 16
const SCALE = 3 // render 3x for visibility

// prettier-ignore
const MAP = [
// Forest region (top)
TL,TL,TL,TT,_,FL,_,_,TL,TL,TT,_,_,FL,_,_,TL,TL,TT,_,_,_,C,_,_,TL,TL,TL,TT,_,_,FL,_,TL,TL,TT,_,_,_,_,_,TL,TL,TT,_,_,FL,_,_,_,
TL,TL,TT,_,_,_,_,_,TL,TT,_,_,_,_,_,_,TL,TT,_,_,FL,_,_,_,_,TL,TL,TT,_,_,_,_,_,TL,TT,_,_,FL,_,_,_,TL,TT,_,_,_,_,_,_,_,
TT,TT,_,_,FL,_,_,_,TT,_,_,_,B,_,_,_,TT,_,_,FL,_,_,_,_,_,TT,TT,_,_,FL,_,_,_,TT,_,_,_,_,_,_,_,TT,_,_,_,B,_,_,FL,_,
_,_,_,_,_,_,B,_,_,_,_,_,_,_,_,_,_,_,_,_,_,B,_,_,_,_,_,_,_,_,_,B,_,_,_,_,_,_,FL,_,_,_,_,FL,_,_,_,_,_,_,
_,FL,_,_,_,_,_,_,_,FL,_,_,_,_,FL,_,_,_,_,_,_,_,_,FL,_,_,FL,_,_,_,_,_,_,FL,_,_,_,_,_,_,FL,_,_,_,_,_,_,FL,_,_,
// Transition zone
_,_,_,D,D,D,D,_,_,_,_,_,D,D,D,_,_,_,_,_,_,D,D,_,_,_,_,_,D,D,D,D,_,_,_,_,D,D,D,_,_,_,_,_,D,D,_,_,_,_,
_,_,_,D,_,_,D,_,_,_,_,_,D,_,D,_,_,_,FL,_,_,D,D,_,_,_,_,_,D,_,_,D,_,_,_,_,D,_,D,_,_,_,_,_,D,D,_,_,_,_,
_,_,_,D,_,_,D,_,_,_,_,_,D,_,D,_,_,_,_,_,_,_,D,_,_,_,FL,_,D,_,_,D,_,_,_,_,D,_,D,_,_,FL,_,_,_,D,_,_,_,_,
// Village area (center)
F,F,F,D,_,_,D,F,F,F,F,F,D,_,D,F,F,F,F,F,F,_,D,_,_,F,F,F,D,_,_,D,F,F,F,F,D,_,D,F,F,F,F,F,_,D,F,F,F,F,
_,_,_,D,_,_,D,_,_,_,_,_,D,_,D,_,_,_,_,_,_,_,D,_,_,_,_,_,D,_,_,D,_,_,_,_,D,_,D,_,_,_,_,_,_,D,_,_,_,_,
_,R,_,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,_,R,_,
_,_,_,D,_,_,_,_,_,_,_,_,D,_,_,_,_,_,WE,_,_,_,D,_,_,_,_,_,D,_,_,_,_,_,_,_,D,_,_,_,_,_,ST,_,_,D,_,_,_,_,
_,_,_,D,_,_,_,_,_,_,_,_,D,_,_,_,_,_,_,_,_,_,D,_,_,_,_,_,D,_,_,_,_,_,_,_,D,_,_,_,_,_,_,_,_,D,_,_,_,_,
_,_,_,D,_,_,R,R,_,_,_,_,D,_,_,_,FL,_,_,FL,_,_,D,_,_,FL,_,_,D,_,_,R,R,_,_,_,D,_,_,FL,_,_,_,FL,_,D,_,_,_,_,
_,_,_,D,_,_,R,R,_,_,_,_,D,_,_,_,_,_,_,_,_,_,D,_,_,_,_,_,D,_,_,R,R,_,_,_,D,_,_,_,_,_,_,_,_,D,_,_,_,_,
_,_,_,D,_,_,_,_,_,_,C,_,D,_,_,_,_,_,_,_,_,_,D,_,_,_,C,_,D,_,_,_,_,_,_,C,D,_,_,_,_,_,_,_,_,D,_,_,_,_,
_,_,_,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,_,_,_,
// South transition
_,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,D,_,_,_,_,
_,FL,_,D,_,_,_,FL,_,_,_,_,_,FL,_,_,_,_,_,_,_,_,D,_,_,_,FL,_,_,_,_,_,FL,_,_,_,_,_,_,FL,_,_,_,_,_,D,_,FL,_,_,
_,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,_,_,_,_,_,_,_,D,_,_,_,_,
// Danger zone (spike area)
_,_,_,D,_,_,_,_,_,S,_,_,_,_,S,_,_,_,S,_,S,_,D,_,_,_,_,S,_,_,_,_,S,_,_,_,S,_,S,_,_,_,_,_,_,D,_,_,_,_,
_,_,_,D,_,_,S,_,_,_,_,S,_,_,_,_,S,_,_,_,_,_,D,_,_,S,_,_,_,_,S,_,_,_,_,S,_,_,_,_,_,_,_,S,_,D,_,_,_,_,
_,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,C,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,C,_,_,_,_,_,D,_,_,_,_,
_,_,_,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,_,_,_,
// River area
_,_,_,_,_,_,_,FL,_,_,_,_,_,_,_,FL,_,_,_,_,_,_,_,_,_,_,FL,_,_,_,_,_,FL,_,_,_,_,_,_,_,_,_,FL,_,_,_,_,_,_,_,
_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,
W,W,W,W,W,W,W,W,W,W,W,W,W,BR,BR,BR,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,BR,BR,BR,W,W,W,W,W,W,W,W,W,W,W,W,W,
W,W,W,W,W,W,W,W,W,W,W,W,W,BR,BR,BR,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,BR,BR,BR,W,W,W,W,W,W,W,W,W,W,W,W,W,
// South island
_,_,_,_,_,_,_,_,_,_,_,_,_,D,D,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,D,D,D,_,_,_,_,_,_,_,_,_,_,_,_,_,
_,_,FL,_,_,_,_,_,_,_,FL,_,_,D,_,D,_,_,_,FL,_,_,_,_,_,_,FL,_,_,_,_,_,_,_,D,_,D,_,_,_,FL,_,_,_,_,_,FL,_,_,_,
_,_,_,_,_,B,_,_,_,_,_,_,_,D,_,D,_,_,_,_,_,B,_,_,_,_,_,_,_,B,_,_,_,_,D,_,D,_,_,_,_,_,_,B,_,_,_,_,_,_,
_,_,_,_,_,_,_,_,C,_,_,_,_,D,_,D,D,D,D,_,_,_,_,_,_,C,_,_,_,_,_,_,_,_,D,_,D,D,D,D,_,_,_,_,_,C,_,_,_,_,
_,_,_,_,R,_,_,_,_,_,_,R,_,_,_,_,_,_,D,_,_,_,_,R,_,_,_,_,R,_,_,_,R,_,_,_,_,_,_,D,_,_,_,R,_,_,_,_,_,_,
_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,D,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,D,_,_,_,_,_,_,_,_,_,_,
_,_,FL,_,_,_,_,FL,_,_,_,_,_,_,FL,_,_,_,D,D,D,D,D,D,D,C,_,_,FL,_,_,_,_,_,FL,_,_,_,_,D,D,D,D,D,D,C,_,_,FL,_,
_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,
TL,TL,TT,_,_,_,_,TL,TL,TT,_,_,_,_,TL,TT,_,_,_,_,_,TL,TL,TT,_,_,_,TL,TL,TT,_,_,_,TL,TT,_,_,_,_,_,TL,TT,_,_,TL,TL,TT,_,_,_,
TL,TT,_,_,_,_,_,TL,TT,_,_,_,_,_,TT,_,_,FL,_,_,_,TL,TT,_,_,_,_,TL,TT,_,_,_,_,_,_,_,_,FL,_,_,TT,_,_,_,TL,TT,_,_,FL,_,
TT,_,_,_,FL,_,_,TT,_,_,_,FL,_,_,_,_,_,_,_,_,_,TT,_,_,_,FL,_,TT,_,_,_,FL,_,_,_,_,_,_,_,_,_,_,_,FL,TT,_,_,_,_,_,
_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,
]

// ═══════════════════════════════════════════════
// GAME CONFIG
// ═══════════════════════════════════════════════
const DIFF_CFG = {
  easy:   { hp: 5, spikeDmg: 1, chestReward: [30, 50],  label: 'Santai' },
  medium: { hp: 3, spikeDmg: 1, chestReward: [50, 80],  label: 'Petualang' },
  hard:   { hp: 2, spikeDmg: 2, chestReward: [80, 150], label: 'Legendaris' },
}

const PLAYER_SIZE = 12 // slightly smaller than tile for smoother collision
const MOVE_SPEED = 1.8

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════
export default function FieldsAdventure({ difficulty, onBack, onHome, game }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const rafRef = useRef(null)
  const keysRef = useRef({})
  const tilesetRef = useRef(null)
  const joystickRef = useRef({ active: false, dx: 0, dy: 0 })
  const tc = useThemeColors()
  const dark = tc.dark
  const { play } = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()
  const { vibrateLight, vibrateMedium, vibrateSuccess, vibrateError } = useHaptics()

  const [gameState, setGameState] = useState('loading') // loading | playing | won | lost
  const [showTut, setShowTut] = useState(true)
  const [stats, setStats] = useState({ chestsFound: 0, totalChests: 0, coinsEarned: 0, hp: 0, maxHp: 0, steps: 0 })
  const [showConfetti, setShowConfetti] = useState(false)

  const cfg = DIFF_CFG[difficulty.id] || DIFF_CFG.easy

  // Count total chests in map
  const totalChests = MAP.filter(t => t === C).length

  // Init game state
  const initGame = useCallback(() => {
    // Find player start (center of village path)
    const startX = 22 * TILE_SIZE + 2
    const startY = 10 * TILE_SIZE + 2

    // Track which chests are opened (by map index)
    const chestStates = {}
    MAP.forEach((tile, i) => {
      if (tile === C) chestStates[i] = false
    })

    gameRef.current = {
      px: startX, py: startY,
      vx: 0, vy: 0,
      hp: cfg.hp,
      maxHp: cfg.hp,
      chestsFound: 0,
      coinsEarned: 0,
      chestStates,
      steps: 0,
      facing: 'down',
      iframeCooldown: 0, // invincibility after spike hit
      interactCooldown: 0,
      camX: 0, camY: 0,
      actionPressed: false,
      nearChest: -1, // index of nearby chest or -1
    }

    setStats({ chestsFound: 0, totalChests, coinsEarned: 0, hp: cfg.hp, maxHp: cfg.hp, steps: 0 })
    setGameState('playing')
  }, [cfg, totalChests])

  // Load tileset
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      tilesetRef.current = img
      initGame()
    }
    img.onerror = () => {
      console.error('Failed to load tileset')
      initGame()
    }
    img.src = '/adventure/tileset.png'
  }, [initGame])

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key.toLowerCase()] = true
      if (e.key.toLowerCase() === 'e' || e.key === ' ') {
        if (gameRef.current) gameRef.current.actionPressed = true
      }
    }
    const up = (e) => { keysRef.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Get tile at world position
  const getTile = (wx, wy) => {
    const tx = Math.floor(wx / TILE_SIZE)
    const ty = Math.floor(wy / TILE_SIZE)
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return R // out of bounds = solid
    return MAP[ty * MAP_W + tx]
  }

  // Check if position is blocked
  const isBlocked = (x, y, w, h) => {
    // Check all 4 corners
    const points = [
      [x + 1, y + 1], [x + w - 1, y + 1],
      [x + 1, y + h - 1], [x + w - 1, y + h - 1],
    ]
    return points.some(([px, py]) => SOLID.has(getTile(px, py)))
  }

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const loop = () => {
      const g = gameRef.current
      if (!g) return
      const keys = keysRef.current
      const joy = joystickRef.current

      // ── Input ──
      let dx = 0, dy = 0
      if (keys['arrowleft'] || keys['a']) dx -= 1
      if (keys['arrowright'] || keys['d']) dx += 1
      if (keys['arrowup'] || keys['w']) dy -= 1
      if (keys['arrowdown'] || keys['s']) dy += 1

      // Joystick input
      if (joy.active) {
        dx += joy.dx
        dy += joy.dy
      }

      // Normalize
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        dx = (dx / len) * MOVE_SPEED
        dy = (dy / len) * MOVE_SPEED
        g.steps++
        if (Math.abs(dx) > Math.abs(dy)) g.facing = dx > 0 ? 'right' : 'left'
        else g.facing = dy > 0 ? 'down' : 'up'
      }

      // ── Movement with collision ──
      const newX = g.px + dx
      const newY = g.py + dy
      if (!isBlocked(newX, g.py, PLAYER_SIZE, PLAYER_SIZE)) g.px = newX
      if (!isBlocked(g.px, newY, PLAYER_SIZE, PLAYER_SIZE)) g.py = newY

      // Clamp to map
      g.px = Math.max(0, Math.min(g.px, MAP_W * TILE_SIZE - PLAYER_SIZE))
      g.py = Math.max(0, Math.min(g.py, MAP_H * TILE_SIZE - PLAYER_SIZE))

      // ── Cooldowns ──
      if (g.iframeCooldown > 0) g.iframeCooldown--
      if (g.interactCooldown > 0) g.interactCooldown--

      // ── Spike damage ──
      const playerCX = g.px + PLAYER_SIZE / 2
      const playerCY = g.py + PLAYER_SIZE / 2
      const tileAtPlayer = getTile(playerCX, playerCY)
      if (tileAtPlayer === S && g.iframeCooldown <= 0) {
        g.hp -= cfg.spikeDmg
        g.iframeCooldown = 60 // 1 second invincibility
        try { play('mismatch') } catch {}
        vibrateError()
        if (g.hp <= 0) {
          setGameState('lost')
          setStats({ chestsFound: g.chestsFound, totalChests, coinsEarned: g.coinsEarned, hp: 0, maxHp: g.maxHp, steps: g.steps })
          return
        }
      }

      // ── Find nearby chest ──
      g.nearChest = -1
      const pcx = Math.floor(playerCX / TILE_SIZE)
      const pcy = Math.floor(playerCY / TILE_SIZE)
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const tx = pcx + ox
          const ty = pcy + oy
          if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) continue
          const idx = ty * MAP_W + tx
          if (MAP[idx] === C && !g.chestStates[idx]) {
            g.nearChest = idx
          }
        }
      }

      // ── Action: open chest ──
      if (g.actionPressed && g.nearChest >= 0 && g.interactCooldown <= 0) {
        g.chestStates[g.nearChest] = true
        g.chestsFound++
        const [minR, maxR] = cfg.chestReward
        const reward = minR + Math.floor(Math.random() * (maxR - minR + 1))
        g.coinsEarned += reward
        earnCoins(reward, `Fields of Adventure — Chest #${g.chestsFound}`)
        g.interactCooldown = 30
        try { play('win') } catch {}
        vibrateSuccess()

        // Check win condition
        if (g.chestsFound >= totalChests) {
          setShowConfetti(true)
          setGameState('won')
          const stars = g.hp >= g.maxHp ? 3 : g.hp >= Math.ceil(g.maxHp / 2) ? 2 : 1
          reportGameResult(game.id, difficulty.id, g.coinsEarned, stars)
          setStats({ chestsFound: g.chestsFound, totalChests, coinsEarned: g.coinsEarned, hp: g.hp, maxHp: g.maxHp, steps: g.steps })
          return
        }
      }
      g.actionPressed = false

      // ── Camera ──
      const vw = canvas.width / SCALE
      const vh = canvas.height / SCALE
      g.camX = g.px - vw / 2 + PLAYER_SIZE / 2
      g.camY = g.py - vh / 2 + PLAYER_SIZE / 2
      g.camX = Math.max(0, Math.min(g.camX, MAP_W * TILE_SIZE - vw))
      g.camY = Math.max(0, Math.min(g.camY, MAP_H * TILE_SIZE - vh))

      // ── Render ──
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(SCALE, SCALE)
      ctx.translate(-g.camX, -g.camY)

      // Draw tiles
      const startTX = Math.floor(g.camX / TILE_SIZE)
      const startTY = Math.floor(g.camY / TILE_SIZE)
      const endTX = Math.min(MAP_W, startTX + Math.ceil(vw / TILE_SIZE) + 2)
      const endTY = Math.min(MAP_H, startTY + Math.ceil(vh / TILE_SIZE) + 2)

      for (let ty = startTY; ty < endTY; ty++) {
        for (let tx = startTX; tx < endTX; tx++) {
          const idx = ty * MAP_W + tx
          const tileId = MAP[idx]
          const src = TILE_SRC[tileId]
          const dx = tx * TILE_SIZE
          const dy = ty * TILE_SIZE

          // Draw grass base
          if (tilesetRef.current) {
            ctx.drawImage(tilesetRef.current, T.GRASS1[0], T.GRASS1[1], 16, 16, dx, dy, 16, 16)
          } else {
            ctx.fillStyle = '#7ec850'
            ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE)
          }

          // Draw opened chest differently
          if (tileId === C && g.chestStates[idx]) {
            if (tilesetRef.current) {
              ctx.drawImage(tilesetRef.current, T.CHEST_OPEN[0], T.CHEST_OPEN[1], 16, 16, dx, dy, 16, 16)
            }
            continue
          }

          // Draw tile overlay
          if (tileId !== _ && src && tilesetRef.current) {
            ctx.drawImage(tilesetRef.current, src[0], src[1], src[2], src[3], dx, dy, 16, 16)
          } else if (tileId !== _ && !tilesetRef.current) {
            // Fallback colors
            const colors = { [D]:'#c4a44a', [R]:'#888', [W]:'#4488cc', [B]:'#2d8c3e', [F]:'#8b6914', [TT]:'#5a3a1a', [TL]:'#2d8c3e', [C]:'#daa520', [S]:'#cc3333', [BR]:'#8b6914', [FL]:'#e8a0d0', [ST]:'#8b6914', [WE]:'#667788' }
            if (colors[tileId]) { ctx.fillStyle = colors[tileId]; ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE) }
          }

          // Interaction prompt near chest
          if (tileId === C && !g.chestStates[idx] && idx === g.nearChest) {
            ctx.fillStyle = '#FFD700'
            ctx.font = 'bold 6px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('E', dx + 8, dy - 2)
            // Glow effect
            ctx.strokeStyle = '#FFD700'
            ctx.lineWidth = 0.5
            ctx.strokeRect(dx, dy, 16, 16)
          }
        }
      }

      // ── Draw Player ──
      const px = g.px
      const py = g.py
      const blink = g.iframeCooldown > 0 && Math.floor(g.iframeCooldown / 4) % 2 === 0

      if (!blink) {
        // Body
        ctx.fillStyle = '#3498db'
        ctx.fillRect(px + 2, py + 2, PLAYER_SIZE - 4, PLAYER_SIZE - 4)
        // Head
        ctx.fillStyle = '#f5c27a'
        ctx.fillRect(px + 3, py + 1, PLAYER_SIZE - 6, 5)
        // Eyes (direction)
        ctx.fillStyle = '#222'
        if (g.facing === 'down') { ctx.fillRect(px + 4, py + 4, 1, 1); ctx.fillRect(px + 7, py + 4, 1, 1) }
        else if (g.facing === 'up') { ctx.fillRect(px + 4, py + 2, 1, 1); ctx.fillRect(px + 7, py + 2, 1, 1) }
        else if (g.facing === 'left') { ctx.fillRect(px + 3, py + 3, 1, 1); ctx.fillRect(px + 3, py + 5, 1, 1) }
        else { ctx.fillRect(px + 8, py + 3, 1, 1); ctx.fillRect(px + 8, py + 5, 1, 1) }
      }

      ctx.restore()

      // ── HUD ──
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(8, 8, 180, 36)
      ctx.roundRect && ctx.roundRect(8, 8, 180, 36, 8)

      // HP hearts
      for (let i = 0; i < g.maxHp; i++) {
        ctx.font = '14px serif'
        ctx.fillText(i < g.hp ? '❤️' : '🖤', 14 + i * 18, 26)
      }

      // Chests found
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`📦 ${g.chestsFound}/${totalChests}`, 14 + g.maxHp * 18 + 8, 27)

      // Coins
      ctx.fillStyle = '#fff'
      ctx.font = '11px sans-serif'
      ctx.fillText(`🪙 ${g.coinsEarned}`, 14, 44)

      // Update React stats
      setStats({ chestsFound: g.chestsFound, totalChests, coinsEarned: g.coinsEarned, hp: g.hp, maxHp: g.maxHp, steps: Math.floor(g.steps / 30) })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [gameState, cfg, totalChests])

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Touch Joystick ──
  const joyBaseRef = useRef(null)
  const handleJoyStart = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = joyBaseRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (touch.clientX - cx) / (rect.width / 2)
    const dy = (touch.clientY - cy) / (rect.height / 2)
    joystickRef.current = { active: true, dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)) }
  }
  const handleJoyMove = (e) => {
    e.preventDefault()
    if (!joystickRef.current.active) return
    const touch = e.touches[0]
    const rect = joyBaseRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (touch.clientX - cx) / (rect.width / 2)
    const dy = (touch.clientY - cy) / (rect.height / 2)
    joystickRef.current = { active: true, dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)) }
  }
  const handleJoyEnd = () => { joystickRef.current = { active: false, dx: 0, dy: 0 } }

  const handleAction = () => {
    if (gameRef.current) gameRef.current.actionPressed = true
  }

  const DIFF_LABEL = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' }

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#1a2a0a', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      {showTut && <TutorialModal steps={TUT} onClose={() => setShowTut(false)} />}

      {/* Game Canvas */}
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />

      {/* Mobile Controls */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10 }}>
        {/* Joystick */}
        <div
          ref={joyBaseRef}
          onTouchStart={handleJoyStart}
          onTouchMove={handleJoyMove}
          onTouchEnd={handleJoyEnd}
          style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'none',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)',
            transform: `translate(${joystickRef.current.dx * 30}px, ${joystickRef.current.dy * 30}px)`,
          }} />
        </div>
      </div>

      {/* Action button */}
      <button
        onTouchStart={handleAction}
        onClick={handleAction}
        style={{
          position: 'absolute', bottom: 40, right: 30, zIndex: 10,
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,215,0,0.3)', border: '3px solid rgba(255,215,0,0.6)',
          color: '#FFD700', fontSize: 20, fontWeight: 800,
          fontFamily: "'Fredoka One',cursive",
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', touchAction: 'none',
        }}
      >
        E
      </button>

      {/* Back button */}
      <button
        onClick={() => { play('click'); onBack() }}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', borderRadius: 10, padding: '6px 14px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Nunito',sans-serif",
        }}
      >
        ✕ Keluar
      </button>

      {showConfetti && <Confetti />}

      {gameState === 'won' && (
        <WinModal
          title="Petualangan Selesai!"
          subtitle={`Semua ${totalChests} peti ditemukan!`}
          diffLabel={DIFF_LABEL[difficulty.id]}
          stats={[
            { label: 'Peti', value: `${stats.chestsFound}/${stats.totalChests}`, color: '#FFD700' },
            { label: 'Koin', value: String(stats.coinsEarned), color: '#4ECDC4' },
            { label: 'HP', value: `${stats.hp}/${stats.maxHp}`, color: '#FF6B6B' },
            { label: 'Langkah', value: String(stats.steps), color: '#A29BFE' },
          ]}
          stars={stats.hp >= stats.maxHp ? 3 : stats.hp >= Math.ceil(stats.maxHp / 2) ? 2 : 1}
          coinReward={stats.coinsEarned}
          onRestart={initGame}
          onBack={() => { play('click'); onBack() }}
          onHome={() => { play('click'); onHome?.() }}
          dark={dark}
          gameColor={game.color}
        />
      )}

      {gameState === 'lost' && (
        <LoseModal
          title="Game Over"
          subtitle="HP habis! Coba lagi?"
          stats={[
            { label: 'Peti', value: `${stats.chestsFound}/${stats.totalChests}`, color: '#FFD700' },
            { label: 'Koin', value: String(stats.coinsEarned), color: '#4ECDC4' },
          ]}
          onRestart={initGame}
          onBack={() => { play('click'); onBack() }}
          onHome={() => { play('click'); onHome?.() }}
          dark={dark}
        />
      )}
    </div>
  )
}
