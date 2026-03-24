import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🧠', title:'Memory Pattern Pro', desc:'Game premium BrainPlay! Ingat pola yang muncul di grid, lalu ulangi dengan urutan yang tepat.', tip:'Ini game flagship — siapkan konsentrasi penuhmu!' },
  { emoji:'👀', title:'Cara Main', desc:'Sel-sel akan menyala satu per satu membentuk pola. Perhatikan urutannya, lalu tap sel dengan urutan yang sama!', tip:'Fokus pada POSISI sel, bukan warna — polanya selalu berubah!' },
  { emoji:'⚡', title:'Boss Level', desc:'Setiap 5 level, hadapi Boss Level! Pola lebih cepat, efek distraksi, dan skor bonus besar!', tip:'Di Boss Level, tetap tenang — jangan terburu-buru saat input!' },
  { emoji:'🔥', title:'Combo & Replay', desc:'Jawab benar berturut-turut untuk combo multiplier hingga 5×! Gunakan tombol Replay untuk melihat ulang pola.', tip:'2 replay gratis per level, setelah itu -100 poin per replay.' },
]

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CFG = {
  easy:   { lives: 4, maxLevel: 15, showTime: 700, showGap: 220, bossShowTime: 500, bossGap: 160, replayFree: 3 },
  medium: { lives: 3, maxLevel: 20, showTime: 550, showGap: 180, bossShowTime: 380, bossGap: 120, replayFree: 2 },
  hard:   { lives: 2, maxLevel: 25, showTime: 400, showGap: 140, bossShowTime: 280, bossGap: 100, replayFree: 1 },
}

// Neon color palette
const NEON_CYAN    = '#00F5FF'
const NEON_PURPLE  = '#A29BFE'
const NEON_GREEN   = '#00B894'
const NEON_PINK    = '#FF6B9D'
const NEON_GOLD    = '#FFD700'
const NEON_RED     = '#FF4757'
const BOSS_ORANGE  = '#FF6348'
const BG_DARK      = '#060620'
const CELL_BASE    = '#12123a'
const CELL_BORDER  = '#2a2a5a'

const HIGHLIGHT_COLORS = [NEON_CYAN, NEON_PINK, NEON_GREEN, '#FDCB6E', NEON_PURPLE, '#55EFC4', '#FF6B6B', '#FD79A8']
const BOSS_HIGHLIGHT   = [BOSS_ORANGE, NEON_RED, '#FF6B6B', '#E17055']

// ─── Level scaling (follows PDF roadmap) ────────────────────────────────────
function getLevelConfig(level) {
  if (level <= 4)  return { grid: 3, pattern: Math.min(3 + Math.floor((level - 1) * 0.6), 5) }
  if (level <= 9)  return { grid: 4, pattern: Math.min(4 + Math.floor((level - 5) * 0.5), 7) }
  if (level <= 14) return { grid: 5, pattern: Math.min(6 + Math.floor((level - 10) * 0.6), 9) }
  if (level <= 20) return { grid: 6, pattern: Math.min(8 + Math.floor((level - 15) * 0.6), 12) }
  return { grid: 6, pattern: Math.min(10 + Math.floor((level - 20) * 0.5), 14) }
}

const rand  = (a, b) => a + Math.random() * (b - a)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp  = (a, b, t) => a + (b - a) * t
const PI2   = Math.PI * 2

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MemoryPatternPro({ onBack, game, difficulty }) {
  const canvasRef = useRef(null)
  const gameRef   = useRef(null)
  const animRef   = useRef(null)
  const phaseRef  = useRef('idle')
  const { play }  = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const cfg = CFG[difficulty.id]

  const [phase, _setPhase]             = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_memory-pattern'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [uiScore, setUiScore]          = useState(0)
  const [uiLives, setUiLives]          = useState(cfg.lives)
  const [uiLevel, setUiLevel]          = useState(1)
  const [uiCombo, setUiCombo]          = useState(0)

  const setPhase = (p) => { phaseRef.current = p; _setPhase(p) }

  // ─── Generate grid cells with positions ────────────────────────────────────
  function buildGrid(W, H, gridSize) {
    const padX = 24, padTop = 90, padBot = 80
    const areaW = W - padX * 2
    const areaH = H - padTop - padBot
    const maxGrid = Math.min(areaW, areaH)
    const gap = Math.max(6, 12 - gridSize)
    const cellSize = (maxGrid - (gridSize - 1) * gap) / gridSize
    const totalW = gridSize * cellSize + (gridSize - 1) * gap
    const totalH = totalW
    const offX = (W - totalW) / 2
    const offY = padTop + (areaH - totalH) / 2

    const cells = []
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = offX + c * (cellSize + gap)
        const y = offY + r * (cellSize + gap)
        cells.push({
          x, y, w: cellSize, h: cellSize,
          cx: x + cellSize / 2, cy: y + cellSize / 2,
          idx: r * gridSize + c,
          glowAlpha: 0, pulsePhase: Math.random() * PI2,
          highlightAlpha: 0, highlightColor: NEON_CYAN,
          tapScale: 1, correctFlash: 0, wrongFlash: 0,
        })
      }
    }
    return { size: gridSize, cells, cellSize, gap, offX, offY, totalW, totalH }
  }

  // ─── Generate pattern ────────────────────────────────────────────────────
  function generatePattern(gridSize, length) {
    const total = gridSize * gridSize
    const pattern = []
    for (let i = 0; i < length; i++) {
      // Allow repeats but not consecutive
      let idx
      do { idx = Math.floor(Math.random() * total) } while (pattern.length > 0 && pattern[pattern.length - 1] === idx)
      pattern.push(idx)
    }
    return pattern
  }

  // ─── Init game state ────────────────────────────────────────────────────
  function initGame(W, H) {
    const lvlCfg = getLevelConfig(1)
    return {
      W, H,
      level: 1, score: 0, lives: cfg.lives, combo: 0, maxCombo: 0,
      grid: buildGrid(W, H, lvlCfg.grid),
      pattern: generatePattern(lvlCfg.grid, lvlCfg.pattern),
      playerInput: [],
      showIdx: -1,
      showTimer: 0,
      showPhaseTime: 0,
      isBoss: false,
      replayCount: 0,
      replayBtn: { x: 0, y: 0, w: 0, h: 0, alpha: 0 },
      // Visual systems
      particles: [],
      rings: [],
      floatingTexts: [],
      bgParticles: initBgParticles(W, H),
      shake: { x: 0, y: 0, intensity: 0 },
      gridPulse: 0,
      bossGlow: 0,
      bossFlickerTimer: 0,
      levelUpAnim: { active: false, timer: 0, text: '' },
      bossIntroAnim: { active: false, timer: 0 },
      correctCellFlash: -1,
      wrongCellIdx: -1,
      // Timing
      inputStartTime: 0,
      lastFrameTime: 0,
    }
  }

  function initBgParticles(W, H) {
    return Array.from({ length: 40 }, () => ({
      x: rand(0, W), y: rand(0, H),
      dx: rand(-0.3, 0.3), dy: rand(-0.3, 0.3),
      r: rand(1, 3), color: HIGHLIGHT_COLORS[Math.floor(rand(0, HIGHLIGHT_COLORS.length))],
      alpha: rand(0.05, 0.2), pulseSpeed: rand(0.01, 0.03),
    }))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVAS SETUP + GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const g = initGame(W, H)
    gameRef.current = g
    setUiScore(0)
    setUiLives(cfg.lives)
    setUiLevel(1)
    setUiCombo(0)

    // ─── Input handling ────────────────────────────────────────────────────
    function getCellAtPos(x, y) {
      for (const cell of g.grid.cells) {
        if (x >= cell.x && x <= cell.x + cell.w && y >= cell.y && y <= cell.y + cell.h) return cell
      }
      return null
    }

    function isReplayBtn(x, y) {
      const btn = g.replayBtn
      return btn.alpha > 0 && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h
    }

    function handleTap(canvasX, canvasY) {
      const p = phaseRef.current

      if (p === 'idle') {
        startLevel(g)
        return
      }

      if (p === 'input') {
        // Check replay button
        if (isReplayBtn(canvasX, canvasY)) {
          doReplay(g)
          return
        }

        const cell = getCellAtPos(canvasX, canvasY)
        if (!cell) return
        handlePlayerInput(g, cell.idx)
      }
    }

    const onClick = (e) => {
      const r = canvas.getBoundingClientRect()
      handleTap(e.clientX - r.left, e.clientY - r.top)
    }
    const onTouch = (e) => {
      e.preventDefault()
      const t = e.touches[0]
      const r = canvas.getBoundingClientRect()
      handleTap(t.clientX - r.left, t.clientY - r.top)
    }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchstart', onTouch, { passive: false })

    // ─── Game logic functions ────────────────────────────────────────────
    function startLevel(g) {
      const lvlCfg = getLevelConfig(g.level)
      g.isBoss = g.level % 5 === 0
      g.grid = buildGrid(W, H, lvlCfg.grid)
      g.pattern = generatePattern(lvlCfg.grid, lvlCfg.pattern)
      g.playerInput = []
      g.showIdx = -1
      g.showTimer = 0
      g.replayCount = 0
      g.correctCellFlash = -1
      g.wrongCellIdx = -1

      if (g.isBoss && g.level > 1) {
        // Boss intro
        g.bossIntroAnim = { active: true, timer: 0 }
        g.bossGlow = 0
        setPhase('bossIntro')
      } else {
        g.levelUpAnim = { active: true, timer: 0, text: g.level === 1 ? 'START!' : `LEVEL ${g.level}` }
        setPhase('levelUp')
      }
    }

    function startShowing(g) {
      g.showIdx = 0
      g.showTimer = 0
      g.showPhaseTime = 0
      setPhase('showing')
    }

    function startInput(g) {
      g.playerInput = []
      g.inputStartTime = Date.now()
      g.replayBtn.alpha = 1

      // Position replay button below grid
      const gridBottom = g.grid.offY + g.grid.totalH
      g.replayBtn.w = 100
      g.replayBtn.h = 36
      g.replayBtn.x = (W - g.replayBtn.w) / 2
      g.replayBtn.y = gridBottom + 16

      if (g.isBoss) {
        // Boss distraction: flash random cells briefly
        g.bossFlickerTimer = 30
      }
      setPhase('input')
    }

    function doReplay(g) {
      g.replayCount++
      if (g.replayCount > cfg.replayFree) {
        g.score = Math.max(0, g.score - 100)
        spawnFloatingText(g, W / 2, g.replayBtn.y - 10, '-100', NEON_RED)
      }
      // Re-show pattern
      g.showIdx = 0
      g.showTimer = 0
      g.showPhaseTime = 0
      g.playerInput = []
      setPhase('showing')
      try { play('flip') } catch(e) {}
    }

    function handlePlayerInput(g, cellIdx) {
      const expected = g.pattern[g.playerInput.length]

      // Tap animation
      const cell = g.grid.cells[cellIdx]
      if (cell) {
        cell.tapScale = 1.15
        cell.highlightAlpha = 1
        cell.highlightColor = NEON_CYAN
        spawnTapRipple(g, cell.cx, cell.cy)
      }

      if (cellIdx === expected) {
        // Correct!
        g.playerInput.push(cellIdx)
        if (cell) cell.correctFlash = 1.0
        try { play('flip') } catch(e) {}

        // Spawn small particles
        if (cell) spawnCellParticles(g, cell, NEON_GREEN, 6)

        if (g.playerInput.length === g.pattern.length) {
          // Pattern complete!
          handlePatternComplete(g)
        }
      } else {
        // Wrong!
        handleWrongInput(g, cellIdx, expected)
      }
    }

    function handlePatternComplete(g) {
      g.combo++
      g.maxCombo = Math.max(g.maxCombo, g.combo)
      const comboMult = Math.min(1 + g.combo * 0.4, 5)
      const speedBonus = Math.max(0, 3000 - (Date.now() - g.inputStartTime)) / 100
      const levelBonus = g.level * 10
      const bossBonus = g.isBoss ? 200 : 0
      const baseScore = 100 + Math.round(speedBonus) + levelBonus + bossBonus
      const points = Math.round(baseScore * comboMult)
      g.score += points

      // Visual celebration
      spawnFloatingText(g, W / 2, g.grid.offY - 20, `+${points}`, NEON_GOLD)
      if (g.combo >= 3) spawnFloatingText(g, W / 2, g.grid.offY - 45, `🔥 ${g.combo}× COMBO`, NEON_GOLD)

      // Particles burst from all pattern cells
      for (const idx of g.pattern) {
        const cell = g.grid.cells[idx]
        if (cell) spawnCellParticles(g, cell, NEON_CYAN, 4)
      }

      // Shockwave ring from center
      spawnRing(g, W / 2, g.grid.offY + g.grid.totalH / 2, g.isBoss ? 200 : 120, g.isBoss ? NEON_GOLD : NEON_CYAN)

      try { play(g.isBoss ? 'win' : 'match') } catch(e) {}

      // Update UI
      setUiScore(g.score)
      setUiCombo(g.combo)

      // Next level or victory
      const nextLevel = g.level + 1
      if (nextLevel > cfg.maxLevel) {
        // VICTORY!
        setTimeout(() => {
          setPhase('won')
          setShowConfetti(true)
          finishGame(g, true)
        }, 600)
      } else {
        g.level = nextLevel
        setUiLevel(nextLevel)
        setTimeout(() => startLevel(g), 800)
      }
    }

    function handleWrongInput(g, wrongIdx, correctIdx) {
      g.combo = 0
      g.lives--
      setUiCombo(0)
      setUiLives(g.lives)

      // Show wrong cell red
      const wrongCell = g.grid.cells[wrongIdx]
      if (wrongCell) {
        wrongCell.wrongFlash = 1.0
        spawnCellParticles(g, wrongCell, NEON_RED, 10)
      }

      // Show correct cell green
      g.correctCellFlash = correctIdx
      const correctCell = g.grid.cells[correctIdx]
      if (correctCell) {
        correctCell.correctFlash = 1.0
        correctCell.highlightAlpha = 1.0
        correctCell.highlightColor = NEON_GREEN
      }

      // Screen shake
      g.shake.intensity = 12

      // Floating text
      spawnFloatingText(g, W / 2, g.grid.offY + g.grid.totalH / 2, '❌ SALAH!', NEON_RED)

      try { play('mismatch') } catch(e) {}

      if (g.lives <= 0) {
        // Game Over
        setTimeout(() => {
          setPhase('lost')
          finishGame(g, false)
        }, 1000)
      } else {
        // Retry same level
        setTimeout(() => {
          g.correctCellFlash = -1
          g.wrongCellIdx = -1
          startLevel(g)
        }, 1500)
      }
    }

    function finishGame(g, won) {
      const stars = won
        ? (g.lives >= cfg.lives ? 3 : g.lives >= cfg.lives - 1 ? 2 : 1)
        : 0
      const coinBase = { easy: 25, medium: 45, hard: 70 }
      let coinAmt = (coinBase[difficulty.id] || 25) + Math.floor(g.score / 200)
      if (stars === 3) coinAmt += 35
      if (!won) coinAmt = Math.max(5, Math.floor(g.score / 150))

      earnCoins(coinAmt, `Memory Pattern Pro (${difficulty.id})`)
      reportGameResult({
        gameId: 'memory-pattern', difficultyId: difficulty.id,
        won, score: g.score, stars: Math.max(stars, won ? 1 : 0), timeSec: 0,
      })

      const bestKey = `memory-pattern-best-${difficulty.id}`
      const prev = parseInt(localStorage.getItem(bestKey) || '0')
      if (g.score > prev) localStorage.setItem(bestKey, g.score)
    }

    // ─── Visual effect spawners ────────────────────────────────────────────
    function spawnCellParticles(g, cell, color, count) {
      for (let i = 0; i < count; i++) {
        const angle = PI2 * Math.random()
        const speed = rand(1.5, 5)
        g.particles.push({
          x: cell.cx, y: cell.cy,
          dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
          life: rand(25, 50), maxLife: 50,
          r: rand(2, 5), color,
        })
      }
    }

    function spawnRing(g, x, y, maxR, color) {
      g.rings.push({ x, y, r: 10, maxR, alpha: 0.9, color, lineWidth: 3 })
    }

    function spawnTapRipple(g, x, y) {
      g.rings.push({ x, y, r: 5, maxR: 50, alpha: 0.6, color: 'rgba(255,255,255,0.5)', lineWidth: 2 })
    }

    function spawnFloatingText(g, x, y, text, color) {
      g.floatingTexts.push({ x, y, text, color, life: 70, maxLife: 70, dy: -1.2, fontSize: 16 })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MAIN GAME LOOP
    // ═══════════════════════════════════════════════════════════════════════

    let lastTime = 0
    function loop(timestamp) {
      const dt = Math.min((timestamp - lastTime) / 16.667, 2.5)
      lastTime = timestamp

      const g = gameRef.current
      if (!g) { animRef.current = requestAnimationFrame(loop); return }
      const p = phaseRef.current

      // ── Update background particles ──
      for (const bp of g.bgParticles) {
        bp.x += bp.dx * dt
        bp.y += bp.dy * dt
        if (bp.x < -10) bp.x = W + 10
        if (bp.x > W + 10) bp.x = -10
        if (bp.y < -10) bp.y = H + 10
        if (bp.y > H + 10) bp.y = -10
      }

      // ── Update cell animations ──
      for (const cell of g.grid.cells) {
        cell.pulsePhase += 0.02 * dt
        cell.glowAlpha = 0.03 + Math.sin(cell.pulsePhase) * 0.02
        cell.tapScale = lerp(cell.tapScale, 1, 0.15 * dt)
        cell.highlightAlpha = lerp(cell.highlightAlpha, 0, 0.06 * dt)
        cell.correctFlash = lerp(cell.correctFlash, 0, 0.04 * dt)
        cell.wrongFlash = lerp(cell.wrongFlash, 0, 0.04 * dt)
      }

      // ── Update particles ──
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const pt = g.particles[i]
        pt.x += pt.dx * dt; pt.y += pt.dy * dt
        pt.dy += 0.08 * dt // gravity
        pt.dx *= 0.98
        pt.life -= dt
        if (pt.life <= 0) g.particles.splice(i, 1)
      }

      // ── Update rings ──
      for (let i = g.rings.length - 1; i >= 0; i--) {
        const ring = g.rings[i]
        ring.r += 3 * dt
        ring.alpha = 0.9 * (1 - ring.r / ring.maxR)
        ring.lineWidth *= 0.98
        if (ring.r >= ring.maxR || ring.alpha <= 0.01) g.rings.splice(i, 1)
      }

      // ── Update floating texts ──
      for (let i = g.floatingTexts.length - 1; i >= 0; i--) {
        const ft = g.floatingTexts[i]
        ft.y += ft.dy * dt
        ft.life -= dt
        if (ft.life <= 0) g.floatingTexts.splice(i, 1)
      }

      // ── Update screen shake ──
      if (g.shake.intensity > 0) {
        g.shake.x = (Math.random() - 0.5) * g.shake.intensity * 2
        g.shake.y = (Math.random() - 0.5) * g.shake.intensity * 2
        g.shake.intensity *= (1 - 0.08 * dt)
        if (g.shake.intensity < 0.3) { g.shake.x = 0; g.shake.y = 0; g.shake.intensity = 0 }
      }

      // ── Boss glow pulsing ──
      if (g.isBoss && (p === 'showing' || p === 'input' || p === 'bossIntro')) {
        g.bossGlow = 0.15 + Math.sin(timestamp / 300) * 0.1
      } else {
        g.bossGlow = lerp(g.bossGlow, 0, 0.05 * dt)
      }

      // ── Phase-specific updates ──
      if (p === 'levelUp') {
        g.levelUpAnim.timer += dt
        if (g.levelUpAnim.timer > 50) {
          g.levelUpAnim.active = false
          startShowing(g)
        }
      }

      if (p === 'bossIntro') {
        g.bossIntroAnim.timer += dt
        if (g.bossIntroAnim.timer > 70) {
          g.bossIntroAnim.active = false
          startShowing(g)
        }
      }

      if (p === 'showing') {
        g.showPhaseTime += dt
        const showTime = g.isBoss ? cfg.bossShowTime : cfg.showTime
        const showGap  = g.isBoss ? cfg.bossGap : cfg.showGap
        const totalPerCell = (showTime + showGap) / 16.667

        if (g.showIdx < g.pattern.length) {
          g.showTimer += dt
          const cellIdx = g.pattern[g.showIdx]
          const cell = g.grid.cells[cellIdx]

          // Highlight current cell
          if (cell && g.showTimer < showTime / 16.667) {
            cell.highlightAlpha = 1.0
            cell.highlightColor = g.isBoss
              ? BOSS_HIGHLIGHT[g.showIdx % BOSS_HIGHLIGHT.length]
              : HIGHLIGHT_COLORS[g.showIdx % HIGHLIGHT_COLORS.length]

            // Spawn particles on first frame
            if (g.showTimer < 2) {
              spawnCellParticles(g, cell, cell.highlightColor, 8)
              spawnRing(g, cell.cx, cell.cy, g.grid.cellSize * 1.2, cell.highlightColor)
            }
          }

          if (g.showTimer >= totalPerCell) {
            g.showTimer = 0
            g.showIdx++
          }
        } else {
          // Done showing, start input
          startInput(g)
        }
      }

      if (p === 'input') {
        // Boss flicker distraction
        if (g.isBoss && g.bossFlickerTimer > 0) {
          g.bossFlickerTimer -= dt
          if (Math.random() < 0.15) {
            const randCell = g.grid.cells[Math.floor(Math.random() * g.grid.cells.length)]
            if (randCell) {
              randCell.highlightAlpha = 0.3
              randCell.highlightColor = BOSS_HIGHLIGHT[Math.floor(Math.random() * BOSS_HIGHLIGHT.length)]
            }
          }
        }
        // Replay button fade
        g.replayBtn.alpha = 1
      } else {
        g.replayBtn.alpha = lerp(g.replayBtn.alpha, 0, 0.1 * dt)
      }

      // ── DRAW ──
      draw(ctx, g, W, H, timestamp)
      animRef.current = requestAnimationFrame(loop)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAWING
    // ═══════════════════════════════════════════════════════════════════════

    function draw(ctx, g, W, H, time) {
      ctx.save()
      ctx.translate(g.shake.x, g.shake.y)

      // ── Background ──
      ctx.fillStyle = BG_DARK
      ctx.fillRect(-10, -10, W + 20, H + 20)

      // Boss red overlay
      if (g.bossGlow > 0) {
        ctx.fillStyle = `rgba(255,67,87,${g.bossGlow})`
        ctx.fillRect(-10, -10, W + 20, H + 20)
      }

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(162,155,254,0.03)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Background particles
      for (const bp of g.bgParticles) {
        const alpha = bp.alpha + Math.sin(time / 1000 * bp.pulseSpeed * 60) * bp.alpha * 0.5
        ctx.fillStyle = bp.color
        ctx.globalAlpha = Math.max(0, alpha)
        ctx.beginPath()
        ctx.arc(bp.x, bp.y, bp.r, 0, PI2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // ── Grid cells ──
      for (const cell of g.grid.cells) {
        ctx.save()
        // Scale animation
        if (cell.tapScale !== 1) {
          ctx.translate(cell.cx, cell.cy)
          ctx.scale(cell.tapScale, cell.tapScale)
          ctx.translate(-cell.cx, -cell.cy)
        }

        const r = Math.max(6, g.grid.cellSize * 0.12)

        // Cell base
        ctx.fillStyle = CELL_BASE
        ctx.strokeStyle = CELL_BORDER
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(cell.x, cell.y, cell.w, cell.h, r)
        ctx.fill()
        ctx.stroke()

        // Idle glow (breathing)
        ctx.fillStyle = `rgba(162,155,254,${cell.glowAlpha})`
        ctx.beginPath()
        ctx.roundRect(cell.x, cell.y, cell.w, cell.h, r)
        ctx.fill()

        // Highlight (pattern showing or tap feedback)
        if (cell.highlightAlpha > 0.01) {
          // Parse color for alpha — use direct shadow approach
          ctx.shadowColor = cell.highlightColor
          ctx.shadowBlur = 25 * cell.highlightAlpha
          ctx.fillStyle = cell.highlightColor
          ctx.globalAlpha = cell.highlightAlpha * 0.8
          ctx.beginPath()
          ctx.roundRect(cell.x + 2, cell.y + 2, cell.w - 4, cell.h - 4, r - 1)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1

          // Inner bright highlight
          ctx.fillStyle = `rgba(255,255,255,${cell.highlightAlpha * 0.4})`
          ctx.beginPath()
          ctx.roundRect(cell.x + cell.w * 0.15, cell.y + cell.h * 0.1, cell.w * 0.7, cell.h * 0.35, r * 0.5)
          ctx.fill()
        }

        // Correct flash (green overlay)
        if (cell.correctFlash > 0.01) {
          ctx.fillStyle = NEON_GREEN
          ctx.globalAlpha = cell.correctFlash * 0.6
          ctx.shadowColor = NEON_GREEN
          ctx.shadowBlur = 20
          ctx.beginPath()
          ctx.roundRect(cell.x, cell.y, cell.w, cell.h, r)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        }

        // Wrong flash (red overlay)
        if (cell.wrongFlash > 0.01) {
          ctx.fillStyle = NEON_RED
          ctx.globalAlpha = cell.wrongFlash * 0.7
          ctx.shadowColor = NEON_RED
          ctx.shadowBlur = 25
          ctx.beginPath()
          ctx.roundRect(cell.x, cell.y, cell.w, cell.h, r)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        }

        ctx.restore()
      }

      // ── Rings (shockwaves) ──
      for (const ring of g.rings) {
        ctx.strokeStyle = ring.color
        ctx.globalAlpha = Math.max(0, ring.alpha)
        ctx.lineWidth = Math.max(0.5, ring.lineWidth)
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.r, 0, PI2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // ── Particles ──
      for (const pt of g.particles) {
        const lifeRatio = pt.life / pt.maxLife
        ctx.fillStyle = pt.color
        ctx.globalAlpha = lifeRatio
        ctx.shadowColor = pt.color
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, pt.r * lifeRatio, 0, PI2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // ── Floating texts ──
      for (const ft of g.floatingTexts) {
        const lifeRatio = ft.life / ft.maxLife
        ctx.fillStyle = ft.color
        ctx.globalAlpha = lifeRatio
        ctx.font = `bold ${ft.fontSize}px 'Fredoka One', cursive`
        ctx.textAlign = 'center'
        ctx.shadowColor = ft.color
        ctx.shadowBlur = 8
        ctx.fillText(ft.text, ft.x, ft.y)
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // ── Replay button ──
      if (g.replayBtn.alpha > 0.05 && phaseRef.current === 'input') {
        const btn = g.replayBtn
        const usedFree = g.replayCount < cfg.replayFree
        ctx.globalAlpha = btn.alpha * 0.9
        ctx.fillStyle = usedFree ? 'rgba(162,155,254,0.2)' : 'rgba(255,107,107,0.15)'
        ctx.strokeStyle = usedFree ? 'rgba(162,155,254,0.5)' : 'rgba(255,107,107,0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 18)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = "bold 12px 'Fredoka One', cursive"
        ctx.textAlign = 'center'
        ctx.fillText(usedFree ? `👁 Replay (${cfg.replayFree - g.replayCount})` : `👁 Replay (-100)`, btn.x + btn.w / 2, btn.y + btn.h / 2 + 4)
        ctx.globalAlpha = 1
      }

      // ── HUD ──
      drawHUD(ctx, g, W, H, time)

      // ── Level Up text ──
      if (phaseRef.current === 'levelUp' && g.levelUpAnim.active) {
        const t = g.levelUpAnim.timer / 50
        const scale = t < 0.3 ? t / 0.3 * 1.2 : t < 0.5 ? 1.2 - (t - 0.3) / 0.2 * 0.2 : 1.0
        const alpha = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1

        ctx.save()
        ctx.translate(W / 2, H / 2)
        ctx.scale(scale, scale)
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#fff'
        ctx.shadowColor = NEON_CYAN
        ctx.shadowBlur = 30
        ctx.font = "bold 36px 'Fredoka One', cursive"
        ctx.textAlign = 'center'
        ctx.fillText(g.levelUpAnim.text, 0, 12)
        ctx.shadowBlur = 0
        ctx.restore()
      }

      // ── Boss Intro ──
      if (phaseRef.current === 'bossIntro' && g.bossIntroAnim.active) {
        const t = g.bossIntroAnim.timer / 70
        ctx.fillStyle = `rgba(0,0,0,${Math.min(t * 2, 0.5)})`
        ctx.fillRect(-10, -10, W + 20, H + 20)

        const slideIn = Math.min(t * 3, 1)
        const alpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : Math.min(t * 4, 1)
        const shakeX = Math.sin(time / 50) * 3 * (1 - t)

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(shakeX, 0)

        // Boss text
        ctx.fillStyle = NEON_RED
        ctx.shadowColor = NEON_RED
        ctx.shadowBlur = 40
        ctx.font = "bold 42px 'Fredoka One', cursive"
        ctx.textAlign = 'center'
        ctx.fillText('⚡ BOSS ⚡', W / 2, H / 2 - 10)

        ctx.shadowBlur = 15
        ctx.fillStyle = '#fff'
        ctx.font = "bold 20px 'Fredoka One', cursive"
        ctx.fillText(`Level ${g.level}`, W / 2, H / 2 + 25)

        ctx.shadowBlur = 0
        ctx.restore()
      }

      // ── Idle overlay ──
      if (phaseRef.current === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(0, 0, W, H)

        const pulse = 0.9 + Math.sin(time / 400) * 0.1
        ctx.save()
        ctx.translate(W / 2, H / 2)
        ctx.scale(pulse, pulse)
        ctx.fillStyle = '#fff'
        ctx.shadowColor = NEON_CYAN
        ctx.shadowBlur = 20
        ctx.font = "bold 22px 'Fredoka One', cursive"
        ctx.textAlign = 'center'
        ctx.fillText('TAP UNTUK MULAI', 0, -10)
        ctx.shadowBlur = 10
        ctx.font = "14px 'Fredoka One', cursive"
        ctx.fillStyle = NEON_PURPLE
        ctx.fillText(`🧠 Memory Pattern Pro`, 0, 20)
        ctx.shadowBlur = 0
        ctx.restore()
      }

      ctx.restore() // shake transform
    }

    function drawHUD(ctx, g, W, H, time) {
      // Top bar background
      ctx.fillStyle = 'rgba(6,6,32,0.8)'
      ctx.fillRect(0, 0, W, 60)
      ctx.fillStyle = 'rgba(162,155,254,0.08)'
      ctx.fillRect(0, 58, W, 2)

      ctx.textAlign = 'left'
      ctx.font = "bold 13px 'Fredoka One', cursive"

      // Level
      ctx.fillStyle = g.isBoss ? NEON_RED : NEON_CYAN
      ctx.shadowColor = g.isBoss ? NEON_RED : NEON_CYAN
      ctx.shadowBlur = g.isBoss ? 10 : 4
      ctx.fillText(g.isBoss ? `⚡ Lv ${g.level}` : `🧠 Lv ${g.level}`, 14, 25)
      ctx.shadowBlur = 0

      // Pattern progress (dots showing how many cells in pattern)
      if (phaseRef.current === 'input' || phaseRef.current === 'showing') {
        const dotY = 43
        const dotR = 3
        const dotGap = 9
        const dotsStart = 14
        const patLen = g.pattern.length
        for (let i = 0; i < patLen; i++) {
          const filled = phaseRef.current === 'input' ? i < g.playerInput.length : i <= g.showIdx
          ctx.fillStyle = filled ? NEON_GREEN : 'rgba(255,255,255,0.15)'
          if (filled) { ctx.shadowColor = NEON_GREEN; ctx.shadowBlur = 4 }
          ctx.beginPath()
          ctx.arc(dotsStart + i * dotGap, dotY, dotR, 0, PI2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // Score (right side)
      ctx.textAlign = 'right'
      ctx.fillStyle = NEON_GOLD
      ctx.shadowColor = NEON_GOLD
      ctx.shadowBlur = 4
      ctx.font = "bold 16px 'Fredoka One', cursive"
      ctx.fillText(g.score.toLocaleString(), W - 14, 26)
      ctx.shadowBlur = 0

      // Lives (hearts)
      ctx.font = '14px serif'
      let heartsStr = ''
      for (let i = 0; i < cfg.lives; i++) {
        heartsStr += i < g.lives ? '❤️' : '🖤'
      }
      ctx.fillText(heartsStr, W - 14, 46)

      // Combo (center)
      if (g.combo >= 2) {
        ctx.textAlign = 'center'
        ctx.fillStyle = NEON_GOLD
        ctx.shadowColor = NEON_GOLD
        ctx.shadowBlur = 8 + Math.sin(time / 150) * 4
        ctx.font = "bold 14px 'Fredoka One', cursive"
        const comboMult = Math.min(1 + g.combo * 0.4, 5).toFixed(1)
        ctx.fillText(`🔥 ${g.combo}× Combo (${comboMult}×)`, W / 2, 25)
        ctx.shadowBlur = 0
      }

      // Grid size indicator
      if (phaseRef.current === 'showing' || phaseRef.current === 'input') {
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = "10px 'Fredoka One', cursive"
        ctx.fillText(`${g.grid.size}×${g.grid.size} • ${g.pattern.length} pola`, W / 2, 50)
      }
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchstart', onTouch)
    }
  }, [difficulty.id])

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTART
  // ═══════════════════════════════════════════════════════════════════════════

  const restart = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.getBoundingClientRect().width
    const H = canvas.getBoundingClientRect().height
    gameRef.current = initGame(W, H)
    setPhase('idle')
    setUiScore(0)
    setUiLives(cfg.lives)
    setUiLevel(1)
    setUiCombo(0)
    setShowConfetti(false)
  }

  // Stars for result modal
  const getStars = () => {
    const g = gameRef.current
    if (!g || phase !== 'won') return 0
    return g.lives >= cfg.lives ? 3 : g.lives >= cfg.lives - 1 ? 2 : 1
  }
  const stars = getStars()
  const coinBase = { easy: 25, medium: 45, hard: 70 }
  const coinReward = phase === 'won'
    ? (coinBase[difficulty.id] || 25) + Math.floor(uiScore / 200) + (stars === 3 ? 35 : 0)
    : Math.max(5, Math.floor(uiScore / 150))

  const DIFF_LABEL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      position: 'fixed', inset: 0, background: BG_DARK,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Fredoka One', cursive",
    }}>
      {showTutorial && (
        <TutorialModal steps={TUTORIAL_STEPS} storageKey="bp_tut_memory-pattern"
          onClose={() => setShowTutorial(false)} />
      )}
      {showConfetti && <Confetti />}

      {/* Back button overlay */}
      <div style={{
        position: 'absolute', top: 8, left: 10, zIndex: 20,
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff', borderRadius: 10, padding: '7px 13px', fontSize: 15,
          cursor: 'pointer', backdropFilter: 'blur(4px)',
        }}>←</button>
      </div>

      <canvas ref={canvasRef} style={{
        flex: 1, width: '100%', height: '100%', display: 'block', touchAction: 'none',
      }} />

      {/* ── Win / Lose modals ── */}
      {(phase === 'won' || phase === 'lost') && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999, padding: 20,
          animation: 'mppFadeIn 0.3s ease',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #0d0d30 0%, #1a1a3e 100%)',
            borderRadius: 28, padding: '36px 28px', textAlign: 'center',
            maxWidth: 380, width: '100%',
            boxShadow: phase === 'won'
              ? `0 0 60px ${NEON_CYAN}33, 0 24px 80px rgba(0,0,0,0.5)`
              : '0 24px 80px rgba(0,0,0,0.5)',
            animation: 'mppPopIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: phase === 'won'
                ? `linear-gradient(90deg, ${NEON_CYAN}, ${NEON_PURPLE}, ${NEON_GOLD})`
                : `linear-gradient(90deg, ${NEON_RED}, #FF6B6B, ${NEON_RED})`,
            }} />

            <div style={{ fontSize: 56, marginBottom: 8, animation: 'mppBounce 0.6s ease' }}>
              {phase === 'won' ? '🏆' : '💥'}
            </div>
            <h2 style={{ color: '#fff', fontSize: 28, marginBottom: 4 }}>
              {phase === 'won' ? 'SEMPURNA!' : 'Game Over'}
            </h2>
            <p style={{ color: NEON_PURPLE, fontSize: 13, marginBottom: 8 }}>
              {phase === 'won' ? `${cfg.maxLevel} level ditaklukkan!` : `Sampai Level ${uiLevel}`}
            </p>
            <span style={{
              display: 'inline-block', background: 'rgba(162,155,254,0.15)', color: NEON_PURPLE,
              padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 14,
            }}>
              {DIFF_LABEL[difficulty.id]}
            </span>

            {/* Stars */}
            {phase === 'won' && (
              <div style={{ fontSize: 32, marginBottom: 12, letterSpacing: 8 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    display: 'inline-block',
                    animation: i < stars ? `mppStarPop 0.4s ${0.2 + i * 0.15}s cubic-bezier(0.34,1.56,0.64,1) both` : 'none',
                    opacity: i < stars ? 1 : 0.25, filter: i < stars ? 'none' : 'grayscale(1)',
                  }}>{i < stars ? '⭐' : '☆'}</span>
                ))}
              </div>
            )}

            {/* Coin reward */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(253,203,110,0.12)', border: '1.5px solid #FDCB6E44',
              borderRadius: 100, padding: '6px 18px', marginBottom: 16,
            }}>
              <span>🪙</span>
              <span style={{ color: '#F9A825', fontSize: 16, fontWeight: 800 }}>+{coinReward}</span>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Skor', value: uiScore.toLocaleString(), color: NEON_GOLD },
                { label: 'Max Combo', value: `${gameRef.current?.maxCombo || 0}×`, color: NEON_CYAN },
                { label: 'Nyawa', value: uiLives, color: uiLives > 0 ? NEON_GREEN : NEON_RED },
              ].map(s => (
                <div key={s.label} style={{
                  background: `${s.color}10`, borderRadius: 14, padding: '12px 8px',
                }}>
                  <div style={{ fontSize: 22, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={restart} style={{
                flex: 1, background: `linear-gradient(135deg, ${NEON_CYAN}, ${NEON_PURPLE})`,
                color: '#fff', border: 'none', borderRadius: 100,
                padding: '13px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                boxShadow: `0 4px 20px ${NEON_CYAN}44`,
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >🔄 Main Lagi</button>
              <button onClick={onBack} style={{
                flex: 1, background: '#1e2a4a', color: '#aaa',
                border: '2px solid rgba(255,255,255,0.1)', borderRadius: 100,
                padding: '13px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mppFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes mppPopIn    { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes mppBounce   { 0%{transform:scale(0.3)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes mppStarPop  { from{transform:scale(0) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
      `}</style>
    </div>
  )
}
