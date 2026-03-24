import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT = [
  { emoji:'💎', title:'Neon Dash', desc:'Berlari melewati rintangan neon! Terinspirasi Geometry Dash — timing adalah segalanya!', tip:'Konsentrasi penuh, satu kesalahan = restart dari awal!' },
  { emoji:'🟦', title:'Mode Cube', desc:'TAP / SPASI untuk lompat. Karakter akan jatuh karena gravitasi — timing lompatan harus tepat!', tip:'Jangan spam tap! Lompat di waktu yang tepat saat mendekati obstacle.' },
  { emoji:'🌊', title:'Mode Wave', desc:'TAHAN untuk naik, LEPAS untuk turun. Gerak zig-zag melewati celah sempit!', tip:'Wave mode butuh kontrol halus — tahan dan lepas dengan smooth.' },
  { emoji:'⭐', title:'Progress & Skor', desc:'Progress bar 0-100% di atas. Kumpulkan 💎 untuk skor bonus. Mati = restart level dari 0%!', tip:'Hafalkan pola obstacle — setiap attempt kamu makin dekat!' },
]

import { useEffect, useRef, useState } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CFG = {
  easy:   { speed: 4,   gravity: 0.6,  jumpV: -9.5, waveSpd: 3.5, maxLevel: 6  },
  medium: { speed: 5,   gravity: 0.7,  jumpV: -10,  waveSpd: 4.5, maxLevel: 10 },
  hard:   { speed: 6.5, gravity: 0.8,  jumpV: -11,  waveSpd: 5.5, maxLevel: 14 },
}

const C = {
  bg: '#0b0b2a', grid: '#1a1a4a', ground: '#A29BFE', groundGlow: '#6C5CE7',
  player: '#00F5FF', playerGlow: '#00C9FF', spike: '#FF6B9D', spikeGlow: '#FF2D78',
  block: '#A29BFE', blockGlow: '#6C5CE7', portal: '#55EFC4', portalGlow: '#00B894',
  diamond: '#FFD700', diamondGlow: '#F9A825', wave: '#FF6348', waveGlow: '#EE5A24',
  pillar: '#FD79A8', pillarGlow: '#E84393', saw: '#FF4757', sawGlow: '#C0392B',
}

const rnd = (a, b) => a + Math.random() * (b - a)
const P2 = Math.PI * 2, PI = Math.PI

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL BUILDER — Pattern-based, not random!
// Each level is a sequence of predefined obstacle patterns
// ═══════════════════════════════════════════════════════════════════════════════

// Pattern blocks (each returns array of items, placed at startX)
// groundY is the floor Y coordinate
function pat_spikes(sx, gY, n, gap) {
  const items = []
  for (let i = 0; i < n; i++) items.push({ type: 'spike', x: sx + i * gap, y: gY, w: 24, h: 24 })
  return items
}
function pat_tallSpike(sx, gY) {
  return [{ type: 'spike', x: sx, y: gY, w: 24, h: 40 }]
}
function pat_block(sx, gY, w, h) {
  return [{ type: 'block', x: sx, y: gY - h, w, h }]
}
function pat_pillar(sx, gY, h) {
  return [{ type: 'pillar', x: sx, y: gY - h, w: 20, h }]
}
function pat_gap(sx, gY, w) {
  return [{ type: 'gap', x: sx, w }]
}
function pat_diamond(sx, y) {
  return [{ type: 'diamond', x: sx, y, collected: false }]
}
function pat_portal(sx, gY, toMode) {
  return [{ type: 'portal', x: sx, y: gY - 60, w: 30, h: 60, toMode }]
}
function pat_waveWall(sx, y, gapY, gapH) {
  // Top wall + bottom wall with gap
  return [
    { type: 'waveTop', x: sx, y: 0, w: 20, h: gapY },
    { type: 'waveBot', x: sx, y: gapY + gapH, w: 20, h: 400 },
  ]
}
function pat_saw(sx, y) {
  return [{ type: 'saw', x: sx, y, r: 16 }]
}

// Level definitions — each level is a function(gY, diff) returning items[]
function buildLevelData(levelNum, gY, diff) {
  const items = []
  let x = 400 // start offset
  const sp = 110 - diff * 5 // spacing gets tighter with difficulty
  const lvl = levelNum

  // Level patterns scale with level number
  // Pattern 1: Basic spikes
  if (lvl >= 1) {
    items.push(...pat_diamond(x, gY - 60))
    x += sp
    items.push(...pat_spikes(x, gY, 2 + Math.min(lvl, 3), 40))
    x += (2 + Math.min(lvl, 3)) * 40 + sp
  }
  // Pattern 2: Block + spike combo
  if (lvl >= 1) {
    items.push(...pat_block(x, gY, 30 + lvl * 2, 30 + lvl * 3))
    items.push(...pat_diamond(x + 15, gY - 60 - lvl * 3))
    x += 60 + sp * 0.7
    items.push(...pat_spikes(x, gY, 1 + Math.floor(lvl / 2), 36))
    x += (1 + Math.floor(lvl / 2)) * 36 + sp
  }
  // Pattern 3: Double jump required (tall block)
  if (lvl >= 2) {
    items.push(...pat_block(x, gY, 25, 50 + lvl * 2))
    items.push(...pat_diamond(x + 12, gY - 70 - lvl * 2))
    x += sp * 0.6
    items.push(...pat_spikes(x, gY, 2, 30))
    x += 80 + sp
  }
  // Pattern 4: Pillars
  if (lvl >= 3) {
    for (let i = 0; i < 2 + Math.floor(lvl / 3); i++) {
      items.push(...pat_pillar(x, gY, 35 + i * 10 + lvl * 2))
      if (i % 2 === 0) items.push(...pat_diamond(x + 10, gY - 55 - i * 10))
      x += 55 + Math.max(0, 10 - lvl)
    }
    x += sp
  }
  // Pattern 5: Gap in ground
  if (lvl >= 3) {
    items.push(...pat_diamond(x + 25, gY - 40))
    items.push(...pat_gap(x, gY, 50 + lvl * 3))
    x += 50 + lvl * 3 + sp
  }
  // Pattern 6: Spike-block-spike sandwich
  if (lvl >= 4) {
    items.push(...pat_spikes(x, gY, 1, 30))
    x += 50
    items.push(...pat_block(x, gY, 35, 35))
    items.push(...pat_diamond(x + 17, gY - 55))
    x += 55
    items.push(...pat_spikes(x, gY, 2, 32))
    x += 80 + sp
  }
  // Pattern 7: Wave mode section
  if (lvl >= 4) {
    items.push(...pat_portal(x, gY, 'wave'))
    x += 60
    const waveLen = 3 + Math.floor(lvl / 2)
    for (let i = 0; i < waveLen; i++) {
      const gapY = 80 + Math.sin(i * 0.8) * 40 + (i % 2) * 20
      const gapH = Math.max(55 - lvl * 1.5, 35)
      items.push(...pat_waveWall(x, gapY, gapY, gapH))
      if (i % 2 === 0) items.push(...pat_diamond(x + 10, gapY + gapH / 2))
      x += 60 + Math.max(0, 10 - lvl)
    }
    items.push(...pat_portal(x, gY, 'cube'))
    x += 60 + sp
  }
  // Pattern 8: Saw blades (lvl 5+)
  if (lvl >= 5) {
    for (let i = 0; i < 2 + Math.floor(lvl / 4); i++) {
      items.push(...pat_saw(x, gY - 30 - Math.sin(i * 1.2) * 20))
      if (i === 1) items.push(...pat_diamond(x, gY - 70))
      x += 65 - lvl
    }
    x += sp
  }
  // Pattern 9: Intense spike run
  if (lvl >= 5) {
    const count = 3 + Math.floor(lvl / 2)
    for (let i = 0; i < count; i++) {
      if (i % 3 === 0) items.push(...pat_tallSpike(x, gY))
      else items.push(...pat_spikes(x, gY, 1, 30))
      x += 38 - Math.min(lvl, 8)
    }
    x += sp
  }
  // Pattern 10: Gauntlet (lvl 6+)
  if (lvl >= 6) {
    items.push(...pat_block(x, gY, 20, 60))
    x += 35
    items.push(...pat_gap(x, gY, 40 + lvl * 2))
    x += 40 + lvl * 2
    items.push(...pat_spikes(x, gY, 3, 28))
    items.push(...pat_diamond(x + 40, gY - 50))
    x += 90 + sp
  }
  // Pattern 11: Second wave section (lvl 7+)
  if (lvl >= 7) {
    items.push(...pat_portal(x, gY, 'wave'))
    x += 50
    for (let i = 0; i < 4 + Math.floor(lvl / 3); i++) {
      const gapY = 60 + Math.sin(i * 1.1 + lvl) * 50
      items.push(...pat_waveWall(x, gapY, gapY, Math.max(45 - lvl, 30)))
      x += 50
    }
    items.push(...pat_portal(x, gY, 'cube'))
    x += 50 + sp
  }
  // Final stretch — spike run to finish
  items.push(...pat_diamond(x + 20, gY - 50))
  items.push(...pat_spikes(x + 60, gY, 2, 35))
  x += 160

  // Finish line
  items.push({ type: 'finish', x })
  const totalDiamonds = items.filter(i => i.type === 'diamond').length

  return { items, levelLen: x, totalDiamonds }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function NeonDash({ onBack, game, difficulty }) {
  const cRef = useRef(null), aRef = useRef(null), phR = useRef('idle'), gR = useRef(null)
  const { play } = useSound(), { reportGameResult } = useProgress(), { earnCoins } = useCoins()
  const cfg = CFG[difficulty.id]

  const [phase, _sP] = useState('idle')
  const [showTut, setShowTut] = useState(() => !localStorage.getItem('bp_tut_neon-dash'))
  const [showConf, setShowConf] = useState(false)
  const [uScore, setUScore] = useState(0)
  const [uLevel, setULevel] = useState(1)
  const [uProg, setUProg] = useState(0)
  const [uDia, setUDia] = useState('0/0')
  const [uAttempt, setUAttempt] = useState(1)

  const sP = p => { phR.current = p; _sP(p) }

  function szCvs() {
    const c = cRef.current; if (!c) return { w: 300, h: 500 }
    const par = c.parentElement; if (!par) return { w: 300, h: 500 }
    const rc = par.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(rc.width) || window.innerWidth, h = Math.floor(rc.height) || window.innerHeight
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px'
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { w, h }
  }

  function mkGame(W, H) {
    const gY = Math.floor(H * 0.78)
    const lvlData = buildLevelData(1, gY, 0)
    return {
      W, H, level: 1, score: 0, gY, attempt: 1,
      // Player
      px: 80, py: gY - 20, pw: 18, ph: 18, vy: 0, onGround: true, dead: false, rot: 0,
      mode: 'cube', // 'cube' or 'wave'
      holdDown: false, // for wave mode
      // Level
      lvl: lvlData, camX: 0, colDia: 0,
      // VFX
      pts: [], rings: [], trail: [], shk: 0,
      // Timers
      deadTimer: 0, winTimer: 0,
      // BG grid scroll
      gridOff: 0,
    }
  }

  useEffect(() => {
    const { w: W, h: H } = szCvs()
    const c = cRef.current; if (!c) return
    const ctx = c.getContext('2d')
    const g = mkGame(W, H); gR.current = g

    // ── Input ──
    let holding = false
    function onDown() {
      if (phR.current === 'idle') { stLevel(); return }
      if (phR.current === 'dead') { retryLevel(); return }
      if (phR.current !== 'playing') return
      holding = true; g.holdDown = true
      if (g.mode === 'cube' && g.onGround) {
        g.vy = cfg.jumpV; g.onGround = false
        try { play('flip') } catch (e) {}
      }
    }
    function onUp() { holding = false; g.holdDown = false }

    const oC = () => onDown()
    const oTs = e => { e.preventDefault(); onDown() }
    const oTe = e => { e.preventDefault(); onUp() }
    const oK = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); onDown() } }
    const oKU = e => { if (e.code === 'Space' || e.code === 'ArrowUp') onUp() }
    c.addEventListener('mousedown', oC); c.addEventListener('mouseup', onUp)
    c.addEventListener('touchstart', oTs, { passive: false }); c.addEventListener('touchend', oTe, { passive: false })
    window.addEventListener('keydown', oK); window.addEventListener('keyup', oKU)

    // ── Level management ──
    function stLevel() {
      const gY = g.gY
      const diff = Math.floor((g.level - 1) / 2) // difficulty scaling
      const lvlData = buildLevelData(g.level, gY, diff)
      g.lvl = lvlData; g.camX = 0; g.colDia = 0
      g.px = 80; g.py = gY - g.ph; g.vy = 0; g.onGround = true; g.dead = false; g.rot = 0
      g.mode = 'cube'; g.holdDown = false; holding = false
      g.deadTimer = 0; g.winTimer = 0; g.trail = []; g.pts = []; g.rings = []
      sP('playing')
    }

    function retryLevel() {
      g.attempt++; setUAttempt(g.attempt)
      // Reset player position but keep same level data
      // Re-mark all diamonds as uncollected
      for (const it of g.lvl.items) { if (it.type === 'diamond') it.collected = false }
      g.camX = 0; g.colDia = 0
      g.px = 80; g.py = g.gY - g.ph; g.vy = 0; g.onGround = true; g.dead = false; g.rot = 0
      g.mode = 'cube'; g.holdDown = false; holding = false
      g.deadTimer = 0; g.winTimer = 0; g.trail = []; g.pts = []; g.rings = []
      sP('playing')
    }

    function die() {
      if (g.dead) return
      g.dead = true; g.deadTimer = 50; g.shk = 14
      // Death explosion
      for (let i = 0; i < 20; i++) {
        const a = P2 * Math.random()
        g.pts.push({ x: g.px + g.pw / 2, y: g.py + g.ph / 2, dx: Math.cos(a) * rnd(2, 7), dy: Math.sin(a) * rnd(2, 7), l: rnd(25, 45), ml: 45, r: rnd(2, 6), c: C.player })
      }
      g.rings.push({ x: g.px + g.pw / 2, y: g.py + g.ph / 2, r: 5, mr: 100, a: 1, c: C.spike, lw: 3 })
      try { play('mismatch') } catch (e) {}
      setTimeout(() => { if (phR.current === 'playing') sP('dead') }, 600)
    }

    function winLevel() {
      g.winTimer = 60
      const diaRatio = g.lvl.totalDiamonds > 0 ? g.colDia / g.lvl.totalDiamonds : 1
      const attemptBonus = Math.max(0, 200 - (g.attempt - 1) * 30)
      const lvlScore = Math.round(300 + g.level * 60 + diaRatio * 400 + attemptBonus)
      g.score += lvlScore; setUScore(g.score)
      for (let i = 0; i < 25; i++) {
        const a = P2 * Math.random()
        g.pts.push({ x: g.px + g.pw / 2, y: g.py + g.ph / 2, dx: Math.cos(a) * rnd(2, 8), dy: Math.sin(a) * rnd(2, 8), l: rnd(30, 55), ml: 55, r: rnd(3, 7), c: [C.player, C.diamond, C.portal, C.ground][i % 4] })
      }
      g.rings.push({ x: g.px + g.pw / 2, y: g.py + g.ph / 2, r: 10, mr: 200, a: 1, c: C.diamond, lw: 4 })
      try { play('win') } catch (e) {}
      setTimeout(() => {
        if (g.level >= cfg.maxLevel) { sP('won'); setShowConf(true); fin(true) }
        else { g.level++; g.attempt = 1; setULevel(g.level); setUAttempt(1); stLevel() }
      }, 1200)
    }

    function fin(won) {
      const st = won ? 3 : g.level > cfg.maxLevel / 2 ? 2 : g.level > 2 ? 1 : 0
      const cb = { easy: 20, medium: 40, hard: 65 }
      let co = (cb[difficulty.id] || 20) + Math.floor(g.score / 150); if (st === 3) co += 30
      if (!won) co = Math.max(5, Math.floor(g.score / 200))
      earnCoins(co, `Neon Dash (${difficulty.id})`)
      reportGameResult({ gameId: 'neon-dash', difficultyId: difficulty.id, won, score: g.score, stars: Math.max(st, won ? 1 : 0), timeSec: 0 })
      const bk = `neon-dash-best-${difficulty.id}`, pv = parseInt(localStorage.getItem(bk) || '0')
      if (g.score > pv) localStorage.setItem(bk, g.score)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GAME LOOP
    // ═══════════════════════════════════════════════════════════════════════

    let lt = 0
    function loop(ts) {
      try {
        const dt = Math.min((ts - lt) / 16.667, 2.5); lt = ts; const p = phR.current

        // VFX update
        for (let i = g.pts.length - 1; i >= 0; i--) { const pt = g.pts[i]; pt.x += pt.dx * dt; pt.y += pt.dy * dt; pt.dy += 0.05 * dt; pt.l -= dt; if (pt.l <= 0) g.pts.splice(i, 1) }
        for (let i = g.rings.length - 1; i >= 0; i--) { const r = g.rings[i]; r.r += 3 * dt; r.a = 1 * (1 - r.r / r.mr); if (r.r >= r.mr) g.rings.splice(i, 1) }
        for (let i = g.trail.length - 1; i >= 0; i--) { g.trail[i].a -= 0.03 * dt; if (g.trail[i].a <= 0) g.trail.splice(i, 1) }
        if (g.shk > 0) { g.shk *= (1 - 0.07 * dt); if (g.shk < 0.3) g.shk = 0 }
        if (g.deadTimer > 0) g.deadTimer -= dt
        if (g.winTimer > 0) g.winTimer -= dt

        // ── GAMEPLAY ──
        if (p === 'playing' && !g.dead && g.winTimer <= 0) {
          const spd = (cfg.speed + g.level * 0.2) * dt
          g.camX += spd
          g.gridOff = (g.gridOff + spd) % 40

          // Trail
          g.trail.push({ x: g.px + g.pw / 2, y: g.py + g.ph / 2, a: 0.5, r: g.mode === 'wave' ? 3 : 2, c: g.mode === 'wave' ? C.wave : C.player })

          const worldX = g.px + g.camX

          if (g.mode === 'cube') {
            // Gravity
            g.vy += cfg.gravity * dt
            g.py += g.vy * dt

            // Rotation based on movement
            g.rot += 0.08 * dt * (g.onGround ? 0 : 1)

            // Ground check (considering gaps)
            let overGap = false
            for (const it of g.lvl.items) {
              if (it.type === 'gap' && worldX + g.pw > it.x && worldX < it.x + it.w) { overGap = true; break }
            }
            if (!overGap && g.py + g.ph >= g.gY) {
              g.py = g.gY - g.ph; g.vy = 0; g.onGround = true; g.rot = Math.round(g.rot / (PI / 2)) * (PI / 2)
            }
            // Fall off screen
            if (g.py > H + 50) { die(); return }

          } else if (g.mode === 'wave') {
            // Wave mode: hold = go up, release = go down
            const wSpd = cfg.waveSpd * dt
            if (g.holdDown) g.py -= wSpd
            else g.py += wSpd
            // Clamp
            g.py = Math.max(10, Math.min(g.py, g.gY - g.ph))
            g.rot = g.holdDown ? -0.3 : 0.3
          }

          // ── Collision detection ──
          for (const it of g.lvl.items) {
            const sx = it.x - g.camX
            if (sx < -80 || sx > W + 80) continue

            // Player hitbox (slightly shrunk)
            const px1 = g.px + 3, py1 = g.py + 3, px2 = g.px + g.pw - 3, py2 = g.py + g.ph - 3

            if (it.type === 'spike') {
              // Triangle collision — use AABB with top half shrunk
              const sx1 = sx + 4, sy1 = it.y - it.h + 6, sx2 = sx + it.w - 4, sy2 = it.y
              if (px2 > sx1 && px1 < sx2 && py2 > sy1 && py1 < sy2) { die(); break }
            }
            if (it.type === 'block' || it.type === 'pillar') {
              if (px2 > sx + 2 && px1 < sx + it.w - 2 && py2 > it.y + 2 && py1 < it.y + it.h - 2) { die(); break }
            }
            if (it.type === 'gap' && g.mode === 'cube') {
              // Already handled by ground check — falling into gap = die
            }
            if (it.type === 'waveTop' || it.type === 'waveBot') {
              if (px2 > sx + 2 && px1 < sx + it.w - 2 && py2 > it.y && py1 < it.y + it.h) { die(); break }
            }
            if (it.type === 'saw') {
              const dx = (g.px + g.pw / 2) - (sx + it.r), dy = (g.py + g.ph / 2) - (it.y + it.r)
              if (Math.sqrt(dx * dx + dy * dy) < it.r + g.pw / 2 - 4) { die(); break }
            }
            if (it.type === 'diamond' && !it.collected) {
              const dx = (g.px + g.pw / 2) - (sx + 8), dy = (g.py + g.ph / 2) - (it.y + 8)
              if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
                it.collected = true; g.colDia++; g.score += 30; setUScore(g.score)
                g.pts.push({ x: sx + 8, y: it.y + 8, dx: 0, dy: -2, l: 20, ml: 20, r: 6, c: C.diamond })
                g.rings.push({ x: sx + 8, y: it.y + 8, r: 5, mr: 30, a: 0.6, c: C.diamond, lw: 2 })
                try { play('match') } catch (e) {}
              }
            }
            if (it.type === 'portal') {
              if (worldX > it.x && worldX < it.x + it.w) {
                if (g.mode !== it.toMode) {
                  g.mode = it.toMode
                  g.rings.push({ x: g.px + g.pw / 2, y: g.py + g.ph / 2, r: 5, mr: 60, a: 0.8, c: C.portal, lw: 2 })
                  if (it.toMode === 'wave') { g.vy = 0; g.onGround = false }
                }
              }
            }
            if (it.type === 'finish' && worldX >= it.x) { winLevel(); break }
          }

          // Progress
          setUProg(Math.round(Math.min(g.camX / g.lvl.levelLen, 1) * 100))
          setUDia(`${g.colDia}/${g.lvl.totalDiamonds}`)
        }

        // ══════════ DRAW ══════════
        const sx = g.shk > 0 ? (Math.random() - 0.5) * g.shk * 2 : 0
        const sy = g.shk > 0 ? (Math.random() - 0.5) * g.shk * 2 : 0
        ctx.save(); ctx.translate(sx, sy)

        // Background
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H)

        // Grid
        ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.4
        const gOff = g.gridOff || 0
        for (let x = -gOff; x < W + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
        ctx.globalAlpha = 1

        // Ground line
        const gY = g.gY
        // Draw ground with gaps
        ctx.strokeStyle = C.ground; ctx.lineWidth = 2.5; ctx.shadowColor = C.groundGlow; ctx.shadowBlur = 10
        ctx.beginPath()
        let drawing = true
        for (let x = 0; x < W; x += 2) {
          const wx = x + g.camX
          let inGap = false
          for (const it of g.lvl.items) { if (it.type === 'gap' && wx >= it.x && wx <= it.x + it.w) { inGap = true; break } }
          if (!inGap) { if (!drawing) { ctx.moveTo(x, gY); drawing = true } else ctx.lineTo(x, gY) }
          else drawing = false
        }
        ctx.stroke(); ctx.shadowBlur = 0

        // Ground fill (subtle)
        ctx.fillStyle = 'rgba(162,155,254,0.03)'
        ctx.fillRect(0, gY, W, H - gY)

        // ── Level items ──
        for (const it of g.lvl.items) {
          const sx2 = it.x - g.camX
          if (sx2 < -60 || sx2 > W + 60) continue

          if (it.type === 'spike') {
            ctx.fillStyle = C.spike; ctx.shadowColor = C.spikeGlow; ctx.shadowBlur = 8
            ctx.beginPath()
            ctx.moveTo(sx2, it.y); ctx.lineTo(sx2 + it.w / 2, it.y - it.h); ctx.lineTo(sx2 + it.w, it.y)
            ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
          }
          if (it.type === 'block') {
            ctx.fillStyle = C.block + '66'; ctx.strokeStyle = C.block; ctx.lineWidth = 2
            ctx.shadowColor = C.blockGlow; ctx.shadowBlur = 6
            ctx.fillRect(sx2, it.y, it.w, it.h); ctx.strokeRect(sx2, it.y, it.w, it.h); ctx.shadowBlur = 0
          }
          if (it.type === 'pillar') {
            ctx.fillStyle = C.pillar + '77'; ctx.strokeStyle = C.pillar; ctx.lineWidth = 2
            ctx.shadowColor = C.pillarGlow; ctx.shadowBlur = 6
            ctx.fillRect(sx2, it.y, it.w, it.h); ctx.strokeRect(sx2, it.y, it.w, it.h); ctx.shadowBlur = 0
          }
          if (it.type === 'portal') {
            const pc = it.toMode === 'wave' ? C.wave : C.portal
            ctx.strokeStyle = pc; ctx.lineWidth = 3; ctx.shadowColor = pc; ctx.shadowBlur = 15
            ctx.strokeRect(sx2, it.y, it.w, it.h)
            ctx.fillStyle = pc + '33'; ctx.fillRect(sx2, it.y, it.w, it.h)
            ctx.shadowBlur = 0
            // Mode icon
            ctx.fillStyle = '#fff'; ctx.font = "bold 14px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
            ctx.fillText(it.toMode === 'wave' ? '~' : '□', sx2 + it.w / 2, it.y + it.h / 2 + 5)
          }
          if (it.type === 'waveTop' || it.type === 'waveBot') {
            ctx.fillStyle = C.spike + '55'; ctx.strokeStyle = C.spike; ctx.lineWidth = 1.5
            ctx.shadowColor = C.spikeGlow; ctx.shadowBlur = 4
            ctx.fillRect(sx2, it.y, it.w, it.h); ctx.strokeRect(sx2, it.y, it.w, it.h)
            ctx.shadowBlur = 0
          }
          if (it.type === 'saw') {
            ctx.fillStyle = C.saw; ctx.shadowColor = C.sawGlow; ctx.shadowBlur = 8
            ctx.save(); ctx.translate(sx2 + it.r, it.y + it.r); ctx.rotate(ts / 200)
            // Saw blade (star shape)
            ctx.beginPath()
            for (let i = 0; i < 8; i++) {
              const a = (P2 / 8) * i, r2 = i % 2 === 0 ? it.r : it.r * 0.6
              if (i === 0) ctx.moveTo(Math.cos(a) * r2, Math.sin(a) * r2)
              else ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2)
            }
            ctx.closePath(); ctx.fill(); ctx.restore(); ctx.shadowBlur = 0
          }
          if (it.type === 'diamond' && !it.collected) {
            const dy2 = it.y + Math.sin(ts / 400 + it.x * 0.01) * 4
            ctx.fillStyle = C.diamond; ctx.shadowColor = C.diamondGlow; ctx.shadowBlur = 10
            ctx.save(); ctx.translate(sx2 + 8, dy2 + 8); ctx.rotate(PI / 4)
            ctx.fillRect(-6, -6, 12, 12); ctx.restore(); ctx.shadowBlur = 0
          }
        }

        // Trail
        for (const t of g.trail) { ctx.globalAlpha = t.a; ctx.fillStyle = t.c; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, P2); ctx.fill() }
        ctx.globalAlpha = 1

        // Player
        if (!g.dead || g.deadTimer > 25) {
          ctx.save()
          ctx.translate(g.px + g.pw / 2, g.py + g.ph / 2)
          ctx.rotate(g.rot)
          ctx.fillStyle = g.mode === 'wave' ? C.wave : C.player
          ctx.shadowColor = g.mode === 'wave' ? C.waveGlow : C.playerGlow
          ctx.shadowBlur = 12
          ctx.fillRect(-g.pw / 2, -g.ph / 2, g.pw, g.ph)
          // Shine
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.fillRect(-g.pw / 2, -g.ph / 2, g.pw, g.ph / 3)
          // Eyes
          ctx.shadowBlur = 0
          ctx.fillStyle = '#fff'
          const ex = -3, ey = -2
          ctx.fillRect(ex, ey, 3, 3); ctx.fillRect(ex + 5, ey, 3, 3)
          ctx.restore()
        }

        // Particles
        for (const pt of g.pts) { const a = pt.l / pt.ml; ctx.globalAlpha = a; ctx.fillStyle = pt.c; ctx.shadowColor = pt.c; ctx.shadowBlur = 4; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * a, 0, P2); ctx.fill() }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
        // Rings
        for (const r of g.rings) { if (r.a < 0.01) continue; ctx.globalAlpha = r.a; ctx.strokeStyle = r.c; ctx.lineWidth = Math.max(0.5, r.lw || 2); ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, P2); ctx.stroke() }
        ctx.globalAlpha = 1

        // ── HUD ──
        ctx.fillStyle = 'rgba(11,11,42,0.6)'; ctx.fillRect(0, 0, W, 38)

        // Progress bar
        const bx = 50, bw = W - 140, bh = 8, by = 15
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw, bh)
        const prog = Math.min(uProg / 100, 1)
        ctx.fillStyle = C.player; ctx.shadowColor = C.playerGlow; ctx.shadowBlur = 6
        ctx.fillRect(bx, by, bw * prog, bh); ctx.shadowBlur = 0
        // Ball on progress bar
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + bw * prog, by + bh / 2, 5, 0, P2); ctx.fill()
        // Percentage text
        ctx.fillStyle = '#fff'; ctx.font = "bold 10px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
        ctx.fillText(`${uProg}%`, bx + bw / 2, by + bh + 12)

        // Diamond count
        ctx.textAlign = 'right'; ctx.fillStyle = C.diamond; ctx.font = "bold 12px 'Fredoka One',sans-serif"
        ctx.fillText(`💎 ${uDia}`, W - 12, 16)
        // Level
        ctx.fillStyle = C.ground; ctx.fillText(`Lv ${g.level}  ×${g.attempt}`, W - 12, 32)

        // Mode indicator
        ctx.textAlign = 'left'; ctx.fillStyle = g.mode === 'wave' ? C.wave : C.player
        ctx.font = "bold 11px 'Fredoka One',sans-serif"
        ctx.fillText(g.mode === 'wave' ? '~ WAVE' : '□ CUBE', 12, 28)

        // ── Overlays ──
        if (p === 'idle') {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H)
          const pl = 0.9 + Math.sin(ts / 400) * 0.1
          ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(pl, pl)
          ctx.fillStyle = '#fff'; ctx.shadowColor = C.player; ctx.shadowBlur = 18
          ctx.font = "bold 22px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
          ctx.fillText('TAP UNTUK MULAI', 0, 0)
          ctx.shadowBlur = 6; ctx.fillStyle = C.ground; ctx.font = "13px 'Fredoka One',sans-serif"
          ctx.fillText('💎 Neon Dash', 0, 28)
          ctx.shadowBlur = 0; ctx.restore()
        }

        if (p === 'dead') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = C.spike; ctx.shadowColor = C.spikeGlow; ctx.shadowBlur = 15
          ctx.font = "bold 24px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
          ctx.fillText('💥 CRASH!', W / 2, H * 0.4)
          ctx.shadowBlur = 5; ctx.fillStyle = '#fff'; ctx.font = "14px 'Fredoka One',sans-serif"
          ctx.fillText('Tap untuk retry', W / 2, H * 0.4 + 30)
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = "11px 'Fredoka One',sans-serif"
          ctx.fillText(`Attempt #${g.attempt}  •  ${uProg}%`, W / 2, H * 0.4 + 55)
          ctx.shadowBlur = 0
        }

        ctx.restore()
      } catch (e) { console.error('ND:', e) }
      aRef.current = requestAnimationFrame(loop)
    }
    aRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(aRef.current)
      c.removeEventListener('mousedown', oC); c.removeEventListener('mouseup', onUp)
      c.removeEventListener('touchstart', oTs); c.removeEventListener('touchend', oTe)
      window.removeEventListener('keydown', oK); window.removeEventListener('keyup', oKU)
    }
  }, [difficulty.id])

  const restart = () => { const { w, h } = szCvs(); gR.current = mkGame(w, h); sP('idle'); setUScore(0); setULevel(1); setUProg(0); setUDia('0/0'); setUAttempt(1); setShowConf(false) }
  const stars = phase === 'won' ? 3 : 0
  const coinR = phase === 'won' ? ({ easy: 20, medium: 40, hard: 65 }[difficulty.id] || 20) + Math.floor(uScore / 150) + 30 : 0
  const DL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

  return (
    <div style={{ width: '100%', height: typeof CSS !== 'undefined' && CSS.supports('height', '100dvh') ? '100dvh' : '100vh', background: C.bg, position: 'relative', overflow: 'hidden', userSelect: 'none', fontFamily: "'Fredoka One',cursive" }}>
      {showTut && <TutorialModal steps={TUT} storageKey="bp_tut_neon-dash" onClose={() => setShowTut(false)} />}
      {showConf && <Confetti />}
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, padding: '7px 13px', fontSize: 15, cursor: 'pointer' }}>←</button>
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <canvas ref={cRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
      </div>

      {phase === 'won' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20, animation: 'ndF 0.3s ease' }}>
          <div style={{ background: 'linear-gradient(180deg,#0d0d30,#1a1a3e)', borderRadius: 28, padding: '36px 28px', textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: `0 0 60px ${C.player}33`, animation: 'ndP 0.45s cubic-bezier(0.34,1.56,0.64,1)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${C.player},${C.ground},${C.diamond})` }} />
            <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
            <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 4 }}>ALL CLEAR!</h2>
            <p style={{ color: C.ground, fontSize: 13, marginBottom: 12 }}>{cfg.maxLevel} level selesai!</p>
            <span style={{ display: 'inline-block', background: 'rgba(162,155,254,0.15)', color: C.ground, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{DL[difficulty.id]}</span>
            <div style={{ fontSize: 30, marginBottom: 12, letterSpacing: 8 }}>⭐⭐⭐</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(253,203,110,0.12)', border: '1.5px solid #FDCB6E44', borderRadius: 100, padding: '6px 18px', marginBottom: 16 }}><span>🪙</span><span style={{ color: '#F9A825', fontSize: 16, fontWeight: 800 }}>+{coinR}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 24 }}>
              <div style={{ background: `${C.diamond}10`, borderRadius: 14, padding: '12px 8px' }}><div style={{ fontSize: 22, color: C.diamond }}>{uScore}</div><div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Skor</div></div>
              <div style={{ background: `${C.player}10`, borderRadius: 14, padding: '12px 8px' }}><div style={{ fontSize: 22, color: C.player }}>Lv {uLevel}</div><div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Level</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={restart} style={{ flex: 1, background: `linear-gradient(135deg,${C.player},${C.ground})`, color: '#fff', border: 'none', borderRadius: 100, padding: '13px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{ flex: 1, background: '#1e2a4a', color: '#aaa', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '13px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes ndF{from{opacity:0}to{opacity:1}}@keyframes ndP{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
