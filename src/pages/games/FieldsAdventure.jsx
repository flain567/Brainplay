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
// [col, row] → pixel position = [col*16, row*16]
// ═══════════════════════════════════════════════
const TS = 16 // tile pixel size in tileset
const t = (c, r) => [c * TS, r * TS, TS, TS] // helper

const MAP_W = 50
const MAP_H = 40
const TILE_SIZE = 16
const SCALE = 3

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

// Grass variants
const T_GRASS     = t(0, 0)   // plain grass with stump
const T_GRASS2    = t(1, 0)   // grass + white flowers
const T_GRASS3    = t(2, 0)   // plain grass
const T_GRASS4    = t(3, 0)   // grass + dirt bits
const T_GRASS5    = t(4, 0)   // grass variant
const T_GRASSCLEAN= t(0, 3)   // clean bright grass

// Dirt/path
const T_DIRT      = t(10, 0)  // brown dirt
const T_DIRT2     = t(11, 0)  // dirt variant
const T_PATH_TL   = t(0, 19)  // path corner TL
const T_PATH_T    = t(1, 19)  // path edge T
const T_PATH_TR   = t(2, 19)  // path corner TR
const T_PATH_L    = t(0, 20)  // path edge L
const T_PATH_C    = t(1, 20)  // path center
const T_PATH_R    = t(2, 20)  // path edge R
const T_PATH_BL   = t(0, 21)  // path corner BL
const T_PATH_B    = t(1, 21)  // path edge B
const T_PATH_BR   = t(2, 21)  // path corner BR

// Rocks
const T_ROCK_TL   = t(6, 0)   // rock cluster top-left
const T_ROCK_TR   = t(7, 0)   // rock cluster top-right
const T_ROCK_BL   = t(6, 1)   // rock cluster bottom-left
const T_ROCK_BR   = t(7, 1)   // rock cluster bottom-right
const T_ROCK_SM   = t(8, 0)   // small rock
const T_ROCK_SM2  = t(9, 0)   // small rock variant

// Trees (2×3 multi-tile)
const T_TREE_TL   = t(3, 3)   // tree canopy top-left
const T_TREE_TR   = t(4, 3)   // tree canopy top-right
const T_TREE_ML   = t(3, 4)   // tree canopy mid-left
const T_TREE_MR   = t(4, 4)   // tree canopy mid-right
const T_TREE_BL   = t(3, 5)   // tree trunk left (SOLID)
const T_TREE_BR   = t(2, 5)   // tree trunk right

// Bush/Shrub
const T_BUSH_TL   = t(0, 4)   // large bush TL
const T_BUSH_TR   = t(1, 4)   // large bush TR
const T_BUSH_BL   = t(0, 5)   // large bush BL
const T_BUSH_BR   = t(1, 5)   // large bush BR
const T_BUSH_SM   = t(2, 2)   // small bush

// Cliff/Cave
const T_CAVE_TL   = t(0, 8)   // cave entrance top-left
const T_CAVE_TR   = t(1, 8)   // cave entrance top-right
const T_CAVE_ML   = t(0, 9)   // cave mid-left
const T_CAVE_MR   = t(1, 9)   // cave mid-right
const T_CAVE_BL   = t(0, 10)  // cave bottom-left
const T_CAVE_BR   = t(1, 10)  // cave bottom-right
const T_CAVE_D    = t(2, 8)   // cave dark interior

// Fence
const T_FENCE_V   = t(5, 7)   // fence vertical
const T_FENCE_H   = t(6, 7)   // fence horizontal
const T_FENCE_TL  = t(5, 8)   // fence corner TL
const T_FENCE_TR  = t(7, 8)   // fence corner TR
const T_GATE      = t(6, 8)   // gate opening

// Bridge
const T_BRIDGE    = t(5, 11)  // bridge horizontal
const T_BRIDGE2   = t(6, 11)  // bridge variant

// Water
const T_WATER     = t(8, 28)  // deep water center
const T_WATER_TL  = t(0, 27)  // water edge top-left
const T_WATER_T   = t(1, 27)  // water edge top
const T_WATER_TR  = t(2, 27)  // water edge top-right
const T_WATER_L   = t(0, 28)  // water edge left
const T_WATER_R   = t(2, 28)  // water edge right
const T_WATER_BL  = t(0, 29)  // water edge bottom-left
const T_WATER_B   = t(1, 29)  // water edge bottom
const T_WATER_BR  = t(2, 29)  // water edge bottom-right
const T_STONES    = t(12, 27) // stepping stones in water

// Flowers / Decorative
const T_FLOWER1   = t(0, 11)  // flower patch
const T_FLOWER2   = t(2, 11)  // flower patch 2
const T_SUNFLWR   = t(2, 6)   // sunflower
const T_SUNFLWR2  = t(3, 6)   // sunflower base

// Objects
const T_CHEST_C   = t(13, 0)  // chest closed
const T_CHEST_O   = t(14, 0)  // chest open
const T_BARREL    = t(9, 44)  // barrel
const T_SIGN      = t(9, 37)  // sign post
const T_SPIKE     = t(13, 2)  // spike/trap

// Well tiles (actual 3x4 area in tileset)
const T_WELL_TL = t(11, 41)
const T_WELL_TM = t(12, 41)
const T_WELL_TR = t(13, 41)
const T_WELL_ML = t(11, 42)
const T_WELL_MM = t(12, 42)
const T_WELL_MR = t(13, 42)
const T_WELL_BL = t(11, 43)
const T_WELL_BM = t(12, 43)
const T_WELL_BR = t(13, 43)
const T_WELL_SL = t(11, 44) // Stone base
const T_WELL_SM = t(12, 44)
const T_WELL_SR = t(13, 44)

// House 1: Thatch roof 8×6 tiles [row 33-38, col 0-7]
const HOUSE1 = []
for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) HOUSE1.push(t(c, 33 + r))

// House 2: Red tile roof 9×6 tiles [row 40-45, col 0-8]
const HOUSE2 = []
for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) HOUSE2.push(t(c, 40 + r))

// Which tiles block movement
const SOLID = new Set([R, W, B, F, TT, TL, WE])

// Auto-tiling logic helper
const getAutoTile = (map, tx, ty, type) => {
  const check = (x, y) => {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return true
    return map[y * MAP_W + x] === type
  }
  const top = check(tx, ty - 1)
  const bot = check(tx, ty + 1)
  const lft = check(tx - 1, ty)
  const rgt = check(tx + 1, ty)

  if (type === W) {
    if (!top && !lft) return T_WATER_TL
    if (!top && !rgt) return T_WATER_TR
    if (!bot && !lft) return T_WATER_BL
    if (!bot && !rgt) return T_WATER_BR
    if (!top) return T_WATER_T
    if (!bot) return T_WATER_B
    if (!lft) return T_WATER_L
    if (!rgt) return T_WATER_R
    return T_WATER
  }
  if (type === D) {
    if (!top && !lft) return T_PATH_TL
    if (!top && !rgt) return T_PATH_TR
    if (!bot && !lft) return T_PATH_BL
    if (!bot && !rgt) return T_PATH_BR
    if (!top) return T_PATH_T
    if (!bot) return T_PATH_B
    if (!lft) return T_PATH_L
    if (!rgt) return T_PATH_R
    return T_PATH_C
  }
  return null
}

// Helper for generating winding paths on a 50x40 map
const createPathMap = () => {
  const map = Array(MAP_W * MAP_H).fill(_)
  
  // Create primary winding path from West to East village
  const plot = (x, y, w = 1) => {
    for (let dy = -w; dy <= w; dy++) {
      for (let dx = -w; dx <= w; dx++) {
        const nx = Math.floor(x + dx), ny = Math.floor(y + dy)
        if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) map[ny * MAP_W + nx] = D
      }
    }
  }

  // Horizontal path connecting villages
  for (let x = 0; x < MAP_W; x++) {
    const y = 18 + Math.sin(x * 0.2) * 2
    plot(x, y, 1)
  }
  
  // Vertical branch to forest
  for (let y = 0; y < 18; y++) {
    const x = 15 + Math.cos(y * 0.3) * 2
    plot(x, y, 0)
  }
  
  // Branch to cave/danger zone
  for (let y = 18; y < 35; y++) {
    const x = 35 + Math.sin(y * 0.1) * 3
    plot(x, y, 0)
  }

  return map
}

const BASE_PATH_MAP = createPathMap()

// Helper to place clusters
const cluster = (map, tile, x, y, density = 0.6) => {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return
  if (Math.random() < density) map[y * MAP_W + x] = tile
}

// Tile ID → tileset source mapping (single tiles)
const TILE_SRC = {
  [_]:  T_GRASS3,
  [G]:  T_GRASS2,
  [D]:  T_DIRT,
  [R]:  T_ROCK_SM,
  [W]:  T_WATER,
  [B]:  T_BUSH_SM,
  [F]:  T_FENCE_H,
  [TT]: T_TREE_BL,
  [TL]: T_TREE_TL,
  [C]:  T_CHEST_C,
  [S]:  T_SPIKE,
  [BR]: T_BRIDGE,
  [FL]: T_FLOWER1,
  [ST]: T_SIGN,
  [WE]: T_WELL_BM,
}

// ─── Multi-tile structures placed on map ───
// { x, y (tile coords), w, h (in tiles), tiles: flat array of [srcX,srcY,16,16], solid: array of relative [col,row] that block }
const STRUCTURES = [
  // House 1 (thatch) in village left — 8×6 tiles
  { x: 5, y: 11, w: 8, h: 6, tiles: HOUSE1, solid: Array.from({length:8*2}, (_,i) => [i%8, 4+Math.floor(i/8)]) },
  // House 2 (red roof) in village right — 9×6 tiles
  { x: 29, y: 11, w: 9, h: 6, tiles: HOUSE2, solid: Array.from({length:9*2}, (_,i) => [i%9, 4+Math.floor(i/9)]) },
// Large trees south
  { x: 0, y: 36, w: 2, h: 3, tiles: [T_TREE_TL,T_TREE_TR, T_TREE_ML,T_TREE_MR, T_TREE_BL,T_TREE_BR], solid: [[0,2],[1,2]] },
  { x: 21, y: 36, w: 2, h: 3, tiles: [T_TREE_TL,T_TREE_TR, T_TREE_ML,T_TREE_MR, T_TREE_BL,T_TREE_BR], solid: [[0,2],[1,2]] },
  // Well (now 3x4 to include base stones)
  { x: 22, y: 14, w: 3, h: 4, tiles: [T_WELL_TL,T_WELL_TM,T_WELL_TR, T_WELL_ML,T_WELL_MM,T_WELL_MR, T_WELL_BL,T_WELL_BM,T_WELL_BR, T_WELL_SL,T_WELL_SM,T_WELL_SR], solid: [[0,3],[1,3],[2,3],[0,2],[1,2],[2,2]] },
  // Bush clusters
  { x: 25, y: 2, w: 2, h: 2, tiles: [T_BUSH_TL,T_BUSH_TR, T_BUSH_BL,T_BUSH_BR], solid: [[0,0],[1,0],[0,1],[1,1]] },
  { x: 40, y: 3, w: 2, h: 2, tiles: [T_BUSH_TL,T_BUSH_TR, T_BUSH_BL,T_BUSH_BR], solid: [[0,0],[1,0],[0,1],[1,1]] },
  // Decorative pots/barrels next to houses
  { x: 4, y: 16, w: 1, h: 1, tiles: [T_BARREL], solid: [] },
  { x: 13, y: 16, w: 1, h: 1, tiles: [T_BARREL], solid: [] },
  { x: 37, y: 16, w: 1, h: 1, tiles: [T_BARREL], solid: [] },
]

// Build structure solid lookup: "tx,ty" → true
const structureSolidSet = new Set()
const structureTileMap = {} // "tx,ty" → [srcX,srcY,16,16]
STRUCTURES.forEach(s => {
  s.solid.forEach(([cx, cy]) => structureSolidSet.add(`${s.x + cx},${s.y + cy}`))
  for (let r = 0; r < s.h; r++) {
    for (let c = 0; c < s.w; c++) {
      const tile = s.tiles[r * s.w + c]
      if (tile) structureTileMap[`${s.x + c},${s.y + r}`] = tile
    }
  }
})

// ═══════════════════════════════════════════════
// MAP GENERATION
// ═══════════════════════════════════════════════
const generateFinalMap = () => {
  const m = [...BASE_MAP]
  
  // Decorate with forest (top)
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (m[y * MAP_W + x] === _) {
        if (Math.random() < 0.2) m[y * MAP_W + x] = TL
        else if (Math.random() < 0.05) m[y * MAP_W + x] = R
        else if (Math.random() < 0.1) m[y * MAP_W + x] = G
      }
    }
  }

  // River (Horizontal strip)
  const riverY = 30
  for (let x = 0; x < MAP_W; x++) {
    m[riverY * MAP_W + x] = W
    m[(riverY + 1) * MAP_W + x] = W
    m[(riverY + 2) * MAP_W + x] = W
  }
  
  // Bridges
  const bridgesX = [15, 35]
  bridgesX.forEach(bx => {
    for (let oy = 0; oy < 3; oy++) {
      m[(riverY + oy) * MAP_W + bx] = BR
      m[(riverY + oy) * MAP_W + bx + 1] = BR
    }
  })

  // Spikes in danger zone (south of river)
  for (let y = 33; y < 38; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (Math.random() < 0.08) m[y * MAP_W + x] = S
      else if (Math.random() < 0.02) m[y * MAP_W + x] = C
    }
  }

  // Village decorations
  const villageX = [7, 24, 40]
  villageX.forEach(vx => {
    cluster(m, ST, vx, 17)
    cluster(m, FL, vx + 1, 18)
  })

  return m
}

const MAP = generateFinalMap()

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
  const charRef = useRef(null) // character spritesheet
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
  // ─── Map Generation (Pre-calculated for performance) ───
  const { MAP, TILE_SRC_MAP, totalChests } = useMemo(() => {
    const newMap = [...BASE_PATH_MAP]
    const chests = []
    
    // Add variations & decorations
    for (let i = 0; i < MAP_W * MAP_H; i++) {
      const tx = i % MAP_W, ty = Math.floor(i / MAP_W)
      if (newMap[i] === _) {
        if (Math.random() < 0.15) newMap[i] = G
        else if (Math.random() < 0.02) newMap[i] = R
        else if (Math.random() < 0.01) newMap[i] = FL
      }
    }

    // Place Water River (South)
    for (let y = 30; y < 35; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const i = y * MAP_W + x
        if (newMap[i] === _) newMap[i] = W
      }
    }
    // Pond (North East)
    for (let y = 5; y < 10; y++) {
      for (let x = 38; x < 48; x++) {
        newMap[y * MAP_W + x] = W
      }
    }

    // Add Chests
    const potential = []
    for (let i = 0; i < MAP_W * MAP_H; i++) if (newMap[i] === G) potential.push(i)
    for (let i = 0; i < cfg.totalChests; i++) {
        const idx = potential[Math.floor(Math.random() * potential.length)]
        newMap[idx] = C
    }

    // Add Spikes
    for (let i = 0; i < MAP_W * MAP_H; i++) {
      if (newMap[i] === D && Math.random() < 0.02) newMap[i] = S
    }

    // Build final rendering source map (pre-calculated auto-tiling)
    const renderSrcs = Array(MAP_W * MAP_H).fill(null)
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const id = newMap[ty * MAP_W + tx]
        let s = TILE_SRC[id]
        if (id === W) s = getAutoTile(newMap, tx, ty, W)
        if (id === D) s = getAutoTile(newMap, tx, ty, D)
        renderSrcs[ty * MAP_W + tx] = s
      }
    }

    return { 
      MAP: newMap, 
      TILE_SRC_MAP: renderSrcs, 
      totalChests: cfg.totalChests 
    }
  }, [cfg.totalChests])

  // Count total chests in map
  // const totalChests = MAP.filter(t => t === C).length

  // Init game state
  const initGame = useCallback(() => {
    // Find player start (center of village path)
    const startX = 22 * TILE_SIZE + 2
    const startY = 10 * TILE_SIZE + 2

    // Track which chests are opened
    const chestStates = {}
    MAP.forEach((tile, i) => { if (tile === C) chestStates[i] = false })

    gameRef.current = {
      px: startX, py: startY,
      vx: 0, vy: 0,
      hp: cfg.hp, maxHp: cfg.hp,
      chestsFound: 0, coinsEarned: 0,
      chestStates, steps: 0,
      facing: 'down', animFrame: 0, animTimer: 0,
      iframeCooldown: 0, interactCooldown: 0,
      camX: 0, camY: 0,
      actionPressed: false, nearChest: -1,
    }

    setStats({ chestsFound: 0, totalChests, coinsEarned: 0, hp: cfg.hp, maxHp: cfg.hp, steps: 0 })
    setGameState('playing')
  }, [cfg, totalChests, MAP])

  // Load tileset + character sprite
  useEffect(() => {
    let loaded = 0
    const checkDone = () => { if (++loaded >= 2) initGame() }

    const timg = new Image()
    timg.onload = () => { tilesetRef.current = timg; checkDone() }
    timg.onerror = () => { checkDone() }
    timg.src = '/adventure/tileset.png'

    const cimg = new Image()
    cimg.onload = () => { charRef.current = cimg; checkDone() }
    cimg.onerror = () => { checkDone() }
    cimg.src = '/adventure/character.png'
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
    const points = [
      [x + 1, y + 1], [x + w - 1, y + 1],
      [x + 1, y + h - 1], [x + w - 1, y + h - 1],
    ]
    return points.some(([px, py]) => {
      const tx = Math.floor(px / TILE_SIZE)
      const ty = Math.floor(py / TILE_SIZE)
      if (SOLID.has(getTile(px, py))) return true
      if (structureSolidSet.has(`${tx},${ty}`)) return true
      return false
    })
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
        g.animTimer++
        if (g.animTimer >= 8) { g.animTimer = 0; g.animFrame = (g.animFrame + 1) % 5 }
        if (Math.abs(dx) > Math.abs(dy)) g.facing = dx > 0 ? 'right' : 'left'
        else g.facing = dy > 0 ? 'down' : 'up'
      } else {
        g.animFrame = 0 // idle = first frame
        g.animTimer = 0
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
      // Round to prevent bleeding artifacts
      ctx.translate(-Math.round(g.camX), -Math.round(g.camY))

      // Draw tiles
      const startTX = Math.floor(g.camX / TILE_SIZE)
      const startTY = Math.floor(g.camY / TILE_SIZE)
      const endTX = Math.min(MAP_W, startTX + Math.ceil(vw / TILE_SIZE) + 2)
      const endTY = Math.min(MAP_H, startTY + Math.ceil(vh / TILE_SIZE) + 2)

      for (let ty = startTY; ty < endTY; ty++) {
        for (let tx = startTX; tx < endTX; tx++) {
          const idx = ty * MAP_W + tx
          const tileId = MAP[idx]
          const finalTileSrc = g.TILE_SRC_MAP[idx]
          const dx = Math.round(tx * TILE_SIZE)
          const dy = Math.round(ty * TILE_SIZE)
          const key = `${tx},${ty}`

          // ── DRAW SHADOWS ──
          const drawShadow = (sx, sy, sw, sh, sradius = 4) => {
            ctx.fillStyle = 'rgba(0,0,0,0.12)'
            ctx.beginPath()
            ctx.ellipse(sx + sw / 2, sy + sh - 1, sradius * 1.5, sradius, 0, 0, Math.PI * 2)
            ctx.fill()
          }

          const structTile = structureTileMap[key]
          if (structTile) {
             if (structTile === T_TREE_BL || structTile === T_TREE_BR) drawShadow(dx, dy, 16, 16, 5)
             if (structTile === T_WELL_BL || structTile === T_WELL_BM || structTile === T_WELL_BR) drawShadow(dx, dy, 16, 12, 8)
          }

          // Draw base grass everywhere
          if (tilesetRef.current) {
            ctx.drawImage(tilesetRef.current, T_GRASS3[0], T_GRASS3[1], 16, 16, dx, dy, 16, 16)
          } else {
            ctx.fillStyle = '#7ec850'; ctx.fillRect(dx, dy, 16, 16)
          }

          // Draw opened chest
          if (tileId === C && g.chestStates[idx]) {
            if (tilesetRef.current) ctx.drawImage(tilesetRef.current, T_CHEST_O[0], T_CHEST_O[1], 16, 16, dx, dy, 16, 16)
          }
          // Draw tile overlay from map (with auto-tiling)
          else if (tileId !== _ && finalTileSrc && tilesetRef.current) {
            ctx.drawImage(tilesetRef.current, finalTileSrc[0], finalTileSrc[1], finalTileSrc[2], finalTileSrc[3], dx, dy, 16, 16)
            
            // ── WATER DECORATIONS (Lilypads/Rocks in water) ──
            const noise = Math.sin(idx * 12.98) * 1000
            if (tileId === W && (noise - Math.floor(noise)) < 0.08 && !g.chestStates[idx]) {
                const deco = ((noise * 10) % 2 < 1) ? T_STONES : T_GRASS2
                ctx.drawImage(tilesetRef.current, deco[0], deco[1], 16, 16, dx + 4, dy + 4, 8, 8)
            }
          }

          // Draw structure tile
          if (structTile && tilesetRef.current) {
            ctx.drawImage(tilesetRef.current, structTile[0], structTile[1], 16, 16, dx, dy, 16, 16)
          }

          // Interaction prompt near chest
          if (tileId === C && !g.chestStates[idx] && idx === g.nearChest) {
            ctx.fillStyle = '#FFD700'
            ctx.font = 'bold 6px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('E', dx + 8, dy - 2)
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
        // Draw character shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.beginPath()
        ctx.ellipse(px + PLAYER_SIZE/2, py + PLAYER_SIZE-1, 6, 3, 0, 0, Math.PI*2)
        ctx.fill()

        if (charRef.current) {
          // Character spritesheet: 320×448, 64×64 per frame, 5 cols × 7 rows
          // Row 0: walk DOWN (facing camera, skin visible)
          // Row 1: walk RIGHT (side view) — flip for LEFT
          // Row 2: walk UP (back view, skin hidden)
          // Row 3: walk UP variant
          // Row 4-5: alternate outfit/action
          const CHAR_FRAME = 64
          const dirRow = { down: 0, up: 2, right: 1, left: 1 }
          const row = dirRow[g.facing]
          const frame = g.animFrame % 5
          const srcX = frame * CHAR_FRAME
          const srcY = row * CHAR_FRAME
          const drawSize = 20
          const drawX = Math.round(px + PLAYER_SIZE / 2 - drawSize / 2)
          const drawY = Math.round(py + PLAYER_SIZE / 2 - drawSize / 2 - 4)

          ctx.save()
          if (g.facing === 'left') {
            // Flip horizontally for left-facing
            ctx.translate(drawX + drawSize / 2, drawY + drawSize / 2)
            ctx.scale(-1, 1)
            ctx.drawImage(charRef.current, srcX, srcY, CHAR_FRAME, CHAR_FRAME, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
          } else {
            ctx.drawImage(charRef.current, srcX, srcY, CHAR_FRAME, CHAR_FRAME, drawX, drawY, drawSize, drawSize)
          }
          ctx.restore()
        } else {
          // Fallback colored rectangle
          ctx.fillStyle = '#3498db'
          ctx.fillRect(px + 2, py + 2, PLAYER_SIZE - 4, PLAYER_SIZE - 4)
          ctx.fillStyle = '#f5c27a'
          ctx.fillRect(px + 3, py + 1, PLAYER_SIZE - 6, 5)
        }
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
      <canvas 
        ref={canvasRef} 
        className="gpu-accel"
        style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} 
      />

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
