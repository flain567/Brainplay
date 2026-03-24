import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'
const TUT = [
  { emoji: '💎', title: 'Neon Dash', desc: 'Runner neon terinspirasi Geometry Dash! Timing lompatan dan kontrol wave adalah kunci!', tip: 'Mati = restart level dari 0%. Hafalkan polanya!' },
  { emoji: '🟦', title: 'Mode Cube', desc: 'TAP / SPASI untuk lompat. Satu tap = satu lompatan. Timing harus tepat!', tip: 'Jangan spam — lompat saat sudah mendarat di tanah.' },
  { emoji: '🌊', title: 'Mode Wave', desc: 'TAHAN untuk terbang naik diagonal, LEPAS untuk turun diagonal. Lewati celah sempit!', tip: 'Smooth control — jangan panik, geraknya konsisten.' },
  { emoji: '⭐', title: 'Diamond & Level', desc: 'Kumpulkan 💎 untuk bonus skor. Setiap level makin cepat dan makin susah!', tip: 'Progress bar di atas menunjukkan posisimu. 100% = level clear!' },
]

import { useEffect, useRef, useState } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

// ═══════════════════════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
const DCFG = {
  easy:   { baseSpd: 3.2, spdInc: 0.12, grav: 0.55, jumpV: -8.8, wavSpd: 3.0, maxLv: 6 },
  medium: { baseSpd: 4.0, spdInc: 0.18, grav: 0.65, jumpV: -9.5, wavSpd: 3.8, maxLv: 10 },
  hard:   { baseSpd: 5.0, spdInc: 0.25, grav: 0.75, jumpV: -10.2, wavSpd: 4.8, maxLv: 14 },
}
const COL = {
  bg1: '#0b0b2a', bg2: '#0d0d35', grid: 'rgba(162,155,254,0.06)',
  gnd: '#A29BFE', gndG: '#6C5CE7',
  ply: '#00F5FF', plyG: '#00B4D8',
  spk: '#FF6B9D', spkG: '#FF2D78',
  blk: '#A29BFE', blkG: '#6C5CE7',
  wav: '#FF6348', wavG: '#EE5A24',
  ptl: '#55EFC4', ptlG: '#00B894',
  dia: '#FFD700', diaG: '#F9A825',
  pil: '#FD79A8', saw: '#FF4757',
}
const P2 = Math.PI * 2, PI = Math.PI
const PLAYER_SIZE = 17
const GROUND_OFFSET = 0.78 // ground at 78% of height

// ═══════════════════════════════════════════════════════════════════════
// LEVEL EDITOR — Hand-crafted obstacle arrays per level
// Each item: [type, xOffset, ...params]
// Types: S=spike, B=block(w,h), G=gap(w), D=diamond(yOff),
//        P=portal(mode), W=waveWall(gapY,gapH), PL=pillar(h), SW=saw(yOff)
// xOffset is spacing from previous item
// ═══════════════════════════════════════════════════════════════════════
const LEVELS = [
  // Level 1: Tutorial — basic spikes
  [['D',100,-50],['S',60],['S',50],['D',80,-50],['S',60],['S',50],['S',50],['D',80,-40]],
  // Level 2: Blocks introduced
  [['S',100],['S',50],['D',60,-50],['B',80,28,35],['S',70],['S',45],['D',50,-55],['B',70,25,40],['S',60],['S',45]],
  // Level 3: Taller obstacles + gaps
  [['S',100],['B',60,22,45],['D',50,-60],['S',70],['S',40],['G',80,55],['D',40,-45],['S',80],['B',60,30,35],['S',50],['S',45],['D',60,-50]],
  // Level 4: Pillars + first wave section
  [['PL',100,40],['PL',55,50],['D',40,-65],['PL',55,35],['S',80],['S',45],['P',80,'wave'],['W',55,90,55],['W',55,70,55],['D',30,0],['W',55,100,55],['W',55,60,55],['P',55,'cube'],['S',80],['D',50,-50]],
  // Level 5: Mixed challenge
  [['S',100],['S',40],['B',60,30,50],['D',50,-65],['G',80,50],['S',70],['PL',60,55],['PL',50,40],['S',70],['P',80,'wave'],['W',55,80,50],['W',50,100,50],['W',50,65,50],['D',30,0],['W',50,90,50],['P',50,'cube'],['B',80,25,35],['S',55],['D',60,-50]],
  // Level 6: Speed challenge
  [['S',90],['S',38],['S',38],['D',60,-50],['B',55,25,45],['S',50],['G',70,48],['PL',70,60],['D',40,-70],['S',55],['S',38],['S',38],['B',55,30,40],['S',50],['D',50,-45],['S',40],['S',40]],
  // Level 7: Extended wave
  [['S',100],['B',60,25,40],['S',55],['P',80,'wave'],['W',50,85,48],['W',48,65,48],['W',48,95,48],['D',25,0],['W',48,55,48],['W',48,80,48],['W',48,100,45],['D',25,0],['W',48,70,45],['P',48,'cube'],['S',70],['S',40],['B',60,28,45],['D',55,-60]],
  // Level 8: Saw blades
  [['S',100],['S',42],['D',55,-50],['SW',60,-30],['S',55],['SW',55,-45],['B',60,25,40],['G',70,50],['S',70],['SW',55,-25],['D',45,-55],['S',50],['S',40],['S',40],['SW',55,-40]],
  // Level 9: Gauntlet
  [['S',90],['B',50,20,50],['S',45],['G',60,45],['PL',65,55],['S',45],['S',38],['D',55,-55],['P',70,'wave'],['W',45,80,42],['W',42,60,42],['W',42,95,42],['W',42,50,42],['D',22,0],['W',42,85,42],['P',42,'cube'],['S',65],['SW',50,-35],['B',55,28,45],['S',45],['D',50,-50]],
  // Level 10: Intense
  [['S',80],['S',35],['S',35],['B',50,22,55],['D',45,-65],['G',60,48],['SW',55,-30],['S',50],['PL',50,60],['PL',45,45],['S',55],['P',70,'wave'],['W',42,75,40],['W',40,95,40],['W',40,55,40],['W',40,85,40],['W',40,65,38],['D',20,0],['P',40,'cube'],['S',60],['S',35],['S',35],['B',50,25,40],['SW',50,-40],['D',50,-50]],
  // Level 11-14: Even harder variants
  [['S',75],['S',32],['S',32],['S',32],['D',50,-55],['B',45,25,55],['G',55,45],['SW',50,-35],['PL',50,65],['S',42],['S',35],['P',65,'wave'],['W',38,80,38],['W',36,55,38],['W',36,90,36],['W',36,65,36],['D',18,0],['W',36,85,36],['P',36,'cube'],['S',55],['SW',45,-40],['S',40],['B',45,30,50],['D',50,-60],['S',40],['S',35]],
  [['S',70],['S',30],['B',45,20,60],['SW',45,-35],['G',50,42],['S',55],['S',30],['S',30],['D',50,-55],['PL',45,70],['PL',40,50],['P',60,'wave'],['W',35,75,35],['W',33,95,35],['W',33,55,35],['W',33,80,33],['W',33,60,33],['D',16,0],['W',33,90,33],['P',33,'cube'],['SW',50,-30],['S',45],['S',33],['S',33],['B',45,25,50],['S',40],['D',45,-50]],
  [['S',65],['S',28],['S',28],['S',28],['S',28],['D',45,-50],['B',40,22,60],['G',50,40],['SW',45,-38],['S',45],['S',30],['PL',40,65],['P',55,'wave'],['W',32,70,32],['W',30,90,32],['W',30,50,30],['W',30,80,30],['W',30,60,30],['W',30,85,28],['D',14,0],['P',30,'cube'],['S',50],['S',28],['SW',40,-35],['B',40,28,55],['S',38],['S',28],['S',28],['D',40,-55]],
  [['S',60],['S',25],['S',25],['S',25],['S',25],['S',25],['D',40,-48],['B',38,20,65],['SW',40,-35],['G',45,38],['PL',40,70],['S',40],['S',25],['S',25],['P',50,'wave'],['W',28,65,28],['W',26,85,28],['W',26,50,26],['W',26,78,26],['W',26,55,26],['W',26,85,25],['W',26,60,25],['D',12,0],['P',26,'cube'],['SW',45,-30],['S',40],['S',25],['S',25],['B',35,25,55],['S',35],['S',25],['S',25],['D',35,-50]],
]

// Build level items from editor array
function buildLevel(lvlIdx, gY) {
  const data = LEVELS[Math.min(lvlIdx, LEVELS.length - 1)]
  const items = []
  let x = 350
  for (const def of data) {
    const type = def[0], off = def[1]
    x += off
    switch (type) {
      case 'S': items.push({ t: 'spike', x, y: gY, w: 22, h: 22 }); break
      case 'B': items.push({ t: 'block', x, y: gY - def[3], w: def[2], h: def[3] }); break
      case 'G': items.push({ t: 'gap', x, w: def[2] }); break
      case 'D': items.push({ t: 'dia', x, y: gY + def[2], col: false }); break
      case 'P': items.push({ t: 'portal', x, y: gY - 55, w: 28, h: 55, mode: def[2] }); break
      case 'W': items.push({ t: 'wtop', x, y: 0, w: 18, h: def[2] }, { t: 'wbot', x, y: def[2] + def[3], w: 18, h: 400 }); break
      case 'PL': items.push({ t: 'pillar', x, y: gY - def[2], w: 18, h: def[2] }); break
      case 'SW': items.push({ t: 'saw', x, y: gY + def[2], r: 14 }); break
    }
  }
  x += 200
  items.push({ t: 'finish', x })
  return { items, len: x, nDia: items.filter(i => i.t === 'dia').length }
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function NeonDash({ onBack, game, difficulty }) {
  const cRef = useRef(null), aRef = useRef(null), phR = useRef('idle'), gR = useRef(null)
  const { play } = useSound(), { reportGameResult } = useProgress(), { earnCoins } = useCoins()
  const dc = DCFG[difficulty.id]

  const [phase, _sP] = useState('idle')
  const [showTut, setShowTut] = useState(() => !localStorage.getItem('bp_tut_neon-dash'))
  const [showConf, setShowConf] = useState(false)
  const [uSc, setUSc] = useState(0)
  const [uLv, setULv] = useState(1)
  const [uPr, setUPr] = useState(0)
  const [uDi, setUDi] = useState('0/0')
  const [uAt, setUAt] = useState(1)

  const sP = p => { phR.current = p; _sP(p) }

  function szC() {
    const c = cRef.current; if (!c) return { w: 300, h: 500 }
    const par = c.parentElement; if (!par) return { w: 300, h: 500 }
    const rc = par.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(rc.width) || window.innerWidth
    const h = Math.floor(rc.height) || window.innerHeight
    c.width = w * dpr; c.height = h * dpr
    c.style.width = w + 'px'; c.style.height = h + 'px'
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
    return { w, h }
  }

  function mkG(W, H) {
    const gY = Math.floor(H * GROUND_OFFSET)
    const lv = buildLevel(0, gY)
    return {
      W, H, gY, lv: 1, sc: 0, att: 1, lvD: lv,
      // Player state
      px: 70, py: gY - PLAYER_SIZE, vy: 0, grounded: true,
      mode: 'cube', rot: 0, dead: false, hold: false,
      // Camera
      cam: 0, spd: dc.baseSpd,
      // Collections
      cDia: 0,
      // VFX arrays (pre-allocate capacity mentally, keep small)
      pts: [], rings: [], trail: [],
      shk: 0, dTmr: 0, wTmr: 0, gridOff: 0,
    }
  }

  useEffect(() => {
    const { w: W, h: H } = szC()
    const c = cRef.current; if (!c) return
    const ctx = c.getContext('2d')
    const g = mkG(W, H); gR.current = g
    setUSc(0); setULv(1); setUPr(0); setUDi('0/0'); setUAt(1)

    // ── Input ──
    function onD() {
      const p = phR.current
      if (p === 'idle') { stLv(); return }
      if (p === 'dead') { retry(); return }
      if (p !== 'play') return
      g.hold = true
      if (g.mode === 'cube' && g.grounded) {
        g.vy = dc.jumpV; g.grounded = false
        try { play('flip') } catch (e) {}
      }
    }
    function onU() { g.hold = false }

    c.addEventListener('mousedown', onD); c.addEventListener('mouseup', onU)
    c.addEventListener('touchstart', e => { e.preventDefault(); onD() }, { passive: false })
    c.addEventListener('touchend', e => { e.preventDefault(); onU() }, { passive: false })
    const kD = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); onD() } }
    const kU = e => { if (e.code === 'Space' || e.code === 'ArrowUp') onU() }
    window.addEventListener('keydown', kD); window.addEventListener('keyup', kU)

    // ── Level management ──
    function stLv() {
      const lvIdx = g.lv - 1
      const gY = g.gY
      g.lvD = buildLevel(lvIdx, gY)
      g.cam = 0; g.cDia = 0; g.spd = dc.baseSpd + lvIdx * dc.spdInc
      g.px = 70; g.py = gY - PLAYER_SIZE; g.vy = 0; g.grounded = true
      g.mode = 'cube'; g.rot = 0; g.dead = false; g.hold = false
      g.dTmr = 0; g.wTmr = 0; g.trail = []; g.pts = []; g.rings = []
      sP('play')
    }
    function retry() {
      g.att++; setUAt(g.att)
      for (const it of g.lvD.items) { if (it.t === 'dia') it.col = false }
      g.cam = 0; g.cDia = 0
      g.px = 70; g.py = g.gY - PLAYER_SIZE; g.vy = 0; g.grounded = true
      g.mode = 'cube'; g.rot = 0; g.dead = false; g.hold = false
      g.dTmr = 0; g.wTmr = 0; g.trail = []; g.pts = []; g.rings = []
      sP('play')
    }
    function onDie() {
      if (g.dead) return; g.dead = true; g.dTmr = 45; g.shk = 14
      const cx = g.px + PLAYER_SIZE / 2, cy = g.py + PLAYER_SIZE / 2
      for (let i = 0; i < 16; i++) {
        const a = P2 * Math.random(), s = 1.5 + Math.random() * 5
        g.pts.push({ x: cx, y: cy, dx: Math.cos(a) * s, dy: Math.sin(a) * s, l: 20 + Math.random() * 25, ml: 45, r: 2 + Math.random() * 4, c: COL.ply })
      }
      g.rings.push({ x: cx, y: cy, r: 5, mr: 90, a: 1, c: COL.spk, lw: 3 })
      try { play('mismatch') } catch (e) {}
      setTimeout(() => { if (phR.current === 'play') sP('dead') }, 550)
    }
    function onWin() {
      g.wTmr = 55
      const dR = g.lvD.nDia > 0 ? g.cDia / g.lvD.nDia : 1
      const aB = Math.max(0, 200 - (g.att - 1) * 25)
      const pts = Math.round(250 + g.lv * 50 + dR * 350 + aB)
      g.sc += pts; setUSc(g.sc)
      const cx = g.px + PLAYER_SIZE / 2, cy = g.py + PLAYER_SIZE / 2
      for (let i = 0; i < 20; i++) {
        const a = P2 * Math.random(), s = 2 + Math.random() * 6
        g.pts.push({ x: cx, y: cy, dx: Math.cos(a) * s, dy: Math.sin(a) * s, l: 25 + Math.random() * 30, ml: 55, r: 3 + Math.random() * 5, c: [COL.ply, COL.dia, COL.ptl, COL.gnd][i % 4] })
      }
      g.rings.push({ x: cx, y: cy, r: 8, mr: 180, a: 1, c: COL.dia, lw: 4 })
      try { play('win') } catch (e) {}
      setTimeout(() => {
        if (g.lv >= dc.maxLv) { sP('won'); setShowConf(true); fin(true) }
        else { g.lv++; g.att = 1; setULv(g.lv); setUAt(1); stLv() }
      }, 1000)
    }
    function fin(won) {
      const st = won ? 3 : g.lv > dc.maxLv / 2 ? 2 : g.lv > 2 ? 1 : 0
      const cb = { easy: 20, medium: 40, hard: 65 }
      let co = (cb[difficulty.id] || 20) + Math.floor(g.sc / 150); if (st === 3) co += 30
      if (!won) co = Math.max(5, Math.floor(g.sc / 200))
      earnCoins(co, `Neon Dash (${difficulty.id})`)
      reportGameResult({ gameId: 'neon-dash', difficultyId: difficulty.id, won, score: g.sc, stars: Math.max(st, won ? 1 : 0), timeSec: 0 })
      const bk = `neon-dash-best-${difficulty.id}`, pv = parseInt(localStorage.getItem(bk) || '0')
      if (g.sc > pv) localStorage.setItem(bk, g.sc)
    }

    // ═══════════════════════════════════════════════════════════════════
    // GAME LOOP
    // ═══════════════════════════════════════════════════════════════════
    let lt = 0, frameCount = 0
    function loop(ts) {
      try {
        const dt = Math.min((ts - lt) / 16.667, 2.5); lt = ts; frameCount++
        const p = phR.current
        const gY = g.gY, S = PLAYER_SIZE

        // VFX updates (limit array sizes for perf)
        for (let i = g.pts.length - 1; i >= 0; i--) { const pt = g.pts[i]; pt.x += pt.dx * dt; pt.y += pt.dy * dt; pt.dy += 0.05 * dt; pt.l -= dt; if (pt.l <= 0) g.pts.splice(i, 1) }
        for (let i = g.rings.length - 1; i >= 0; i--) { const r = g.rings[i]; r.r += 3 * dt; r.a *= 0.96; if (r.a < 0.02 || r.r >= r.mr) g.rings.splice(i, 1) }
        // Limit trail to 60 entries for perf
        while (g.trail.length > 60) g.trail.shift()
        for (let i = g.trail.length - 1; i >= 0; i--) { g.trail[i].a -= 0.025 * dt; if (g.trail[i].a <= 0) g.trail.splice(i, 1) }
        if (g.shk > 0) { g.shk *= 0.92; if (g.shk < 0.3) g.shk = 0 }
        if (g.dTmr > 0) g.dTmr -= dt
        if (g.wTmr > 0) g.wTmr -= dt

        // ── GAMEPLAY ──
        if (p === 'play' && !g.dead && g.wTmr <= 0) {
          // Speed increases over time within level
          g.spd = Math.min(dc.baseSpd + (g.lv - 1) * dc.spdInc + g.cam * 0.0002, dc.baseSpd * 2)
          const spd = g.spd * dt
          g.cam += spd
          g.gridOff = (g.gridOff + spd) % 40

          const wx = g.px + g.cam // world x

          // Trail (every other frame for perf)
          if (frameCount % 2 === 0) {
            g.trail.push({ x: g.px + S / 2, y: g.py + S / 2, a: g.mode === 'wave' ? 0.6 : 0.35, c: g.mode === 'wave' ? COL.wav : COL.ply })
          }

          if (g.mode === 'cube') {
            // ── CUBE MODE ──
            g.vy += dc.grav * dt
            g.py += g.vy * dt
            // Rotate in air
            if (!g.grounded) g.rot += 0.07 * dt
            else g.rot = Math.round(g.rot / (PI / 2)) * (PI / 2) // snap to 90°

            // Ground collision (check gaps)
            let overGap = false
            for (const it of g.lvD.items) {
              if (it.t === 'gap' && wx + S > it.x && wx < it.x + it.w) { overGap = true; break }
            }
            if (!overGap && g.py + S >= gY) {
              g.py = gY - S; g.vy = 0; g.grounded = true
            }
            if (g.py > H + 60) { onDie(); return }
          } else {
            // ── WAVE MODE — smooth diagonal ──
            const ws = dc.wavSpd * dt
            if (g.hold) { g.py -= ws; g.rot = -0.35 }
            else { g.py += ws; g.rot = 0.35 }
            g.py = Math.max(8, Math.min(g.py, gY - S))
          }

          // ── Collision ──
          const px1 = g.px + 3, py1 = g.py + 3, px2 = g.px + S - 3, py2 = g.py + S - 3
          for (const it of g.lvD.items) {
            const sx = it.x - g.cam
            if (sx < -80 || sx > W + 80) continue

            if (it.t === 'spike') {
              // Triangle hitbox (top half shrunk)
              if (px2 > sx + 5 && px1 < sx + it.w - 5 && py2 > it.y - it.h + 5 && py1 < it.y) { onDie(); return }
            }
            if (it.t === 'block' || it.t === 'pillar') {
              if (px2 > sx + 2 && px1 < sx + it.w - 2 && py2 > it.y + 2 && py1 < it.y + it.h - 2) { onDie(); return }
            }
            if ((it.t === 'wtop' || it.t === 'wbot') && g.mode === 'wave') {
              if (px2 > sx + 1 && px1 < sx + it.w - 1 && py2 > it.y && py1 < it.y + it.h) { onDie(); return }
            }
            if (it.t === 'saw') {
              const dx = (g.px + S / 2) - (sx + it.r), dy = (g.py + S / 2) - (it.y + it.r)
              if (dx * dx + dy * dy < (it.r + S / 2 - 5) * (it.r + S / 2 - 5)) { onDie(); return }
            }
            if (it.t === 'dia' && !it.col) {
              if (Math.abs((g.px + S / 2) - (sx + 7)) < 18 && Math.abs((g.py + S / 2) - (it.y + 7)) < 18) {
                it.col = true; g.cDia++; g.sc += 30; setUSc(g.sc)
                g.pts.push({ x: sx + 7, y: it.y + 7, dx: 0, dy: -1.5, l: 18, ml: 18, r: 5, c: COL.dia })
                g.rings.push({ x: sx + 7, y: it.y + 7, r: 4, mr: 28, a: 0.5, c: COL.dia, lw: 2 })
                try { play('match') } catch (e) {}
              }
            }
            if (it.t === 'portal' && wx > it.x && wx < it.x + it.w + 5) {
              if (g.mode !== it.mode) {
                g.mode = it.mode
                g.rings.push({ x: g.px + S / 2, y: g.py + S / 2, r: 4, mr: 50, a: 0.7, c: COL.ptl, lw: 2 })
                if (it.mode === 'wave') { g.vy = 0; g.grounded = false }
              }
            }
            if (it.t === 'finish' && wx >= it.x) { onWin(); return }
          }

          setUPr(Math.round(Math.min(g.cam / g.lvD.len, 1) * 100))
          setUDi(`${g.cDia}/${g.lvD.nDia}`)
        }

        // ═══════════════ DRAW ═══════════════
        const shx = g.shk > 0 ? (Math.random() - 0.5) * g.shk * 2 : 0
        const shy = g.shk > 0 ? (Math.random() - 0.5) * g.shk * 2 : 0
        ctx.save(); ctx.translate(shx, shy)

        // BG gradient
        const bg = ctx.createLinearGradient(0, 0, 0, H)
        bg.addColorStop(0, COL.bg1); bg.addColorStop(1, COL.bg2)
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

        // Scrolling grid
        ctx.strokeStyle = COL.grid; ctx.lineWidth = 1
        for (let x = -(g.gridOff || 0); x < W + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

        // Ground (with gap breaks)
        ctx.strokeStyle = COL.gnd; ctx.lineWidth = 3
        ctx.shadowColor = COL.gndG; ctx.shadowBlur = 12
        ctx.beginPath()
        let pen = false
        for (let x = 0; x < W; x += 3) {
          const wx = x + g.cam
          let inGap = false
          for (const it of g.lvD.items) { if (it.t === 'gap' && wx >= it.x && wx <= it.x + it.w) { inGap = true; break } }
          if (!inGap) { if (!pen) { ctx.moveTo(x, gY); pen = true } else ctx.lineTo(x, gY) }
          else pen = false
        }
        ctx.stroke(); ctx.shadowBlur = 0

        // Ground fill below line
        ctx.fillStyle = 'rgba(162,155,254,0.04)'; ctx.fillRect(0, gY + 1, W, H - gY)

        // ── Items ──
        for (const it of g.lvD.items) {
          const sx = it.x - g.cam
          if (sx < -60 || sx > W + 60) continue

          if (it.t === 'spike') {
            ctx.fillStyle = COL.spk; ctx.shadowColor = COL.spkG; ctx.shadowBlur = 10
            ctx.beginPath(); ctx.moveTo(sx, it.y); ctx.lineTo(sx + it.w / 2, it.y - it.h); ctx.lineTo(sx + it.w, it.y); ctx.closePath(); ctx.fill()
            ctx.shadowBlur = 0
          }
          if (it.t === 'block') {
            ctx.fillStyle = COL.blk + '55'; ctx.strokeStyle = COL.blk; ctx.lineWidth = 2
            ctx.shadowColor = COL.blkG; ctx.shadowBlur = 8
            ctx.fillRect(sx, it.y, it.w, it.h); ctx.strokeRect(sx, it.y, it.w, it.h)
            ctx.shadowBlur = 0
          }
          if (it.t === 'pillar') {
            ctx.fillStyle = COL.pil + '66'; ctx.strokeStyle = COL.pil; ctx.lineWidth = 2
            ctx.shadowColor = COL.pil; ctx.shadowBlur = 6
            ctx.fillRect(sx, it.y, it.w, it.h); ctx.strokeRect(sx, it.y, it.w, it.h)
            ctx.shadowBlur = 0
          }
          if (it.t === 'portal') {
            const pc = it.mode === 'wave' ? COL.wav : COL.ptl
            ctx.strokeStyle = pc; ctx.lineWidth = 3; ctx.shadowColor = pc; ctx.shadowBlur = 14
            ctx.strokeRect(sx, it.y, it.w, it.h)
            ctx.fillStyle = pc + '22'; ctx.fillRect(sx, it.y, it.w, it.h)
            ctx.shadowBlur = 0
            ctx.fillStyle = '#fff'; ctx.font = "bold 16px sans-serif"; ctx.textAlign = 'center'
            ctx.fillText(it.mode === 'wave' ? '~' : '□', sx + it.w / 2, it.y + it.h / 2 + 6)
          }
          if (it.t === 'wtop' || it.t === 'wbot') {
            ctx.fillStyle = COL.spk + '44'; ctx.strokeStyle = COL.spk; ctx.lineWidth = 1.5
            ctx.shadowColor = COL.spkG; ctx.shadowBlur = 5
            ctx.fillRect(sx, it.y, it.w, Math.min(it.h, H)); ctx.strokeRect(sx, it.y, it.w, Math.min(it.h, H))
            ctx.shadowBlur = 0
          }
          if (it.t === 'saw') {
            ctx.fillStyle = COL.saw; ctx.shadowColor = COL.saw; ctx.shadowBlur = 8
            ctx.save(); ctx.translate(sx + it.r, it.y + it.r); ctx.rotate(ts / 180)
            ctx.beginPath()
            for (let i = 0; i < 8; i++) { const a = (P2 / 8) * i, r2 = i % 2 === 0 ? it.r : it.r * 0.55; ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2) }
            ctx.closePath(); ctx.fill(); ctx.restore(); ctx.shadowBlur = 0
          }
          if (it.t === 'dia' && !it.col) {
            const dy = it.y + Math.sin(ts / 350 + it.x * 0.01) * 3
            ctx.fillStyle = COL.dia; ctx.shadowColor = COL.diaG; ctx.shadowBlur = 10
            ctx.save(); ctx.translate(sx + 7, dy + 7); ctx.rotate(PI / 4)
            ctx.fillRect(-5, -5, 10, 10); ctx.restore(); ctx.shadowBlur = 0
          }
        }

        // ── Trail (line-based for wave, dots for cube) ──
        if (g.trail.length > 1) {
          if (g.mode === 'wave') {
            // Connected line trail for wave mode
            ctx.strokeStyle = COL.wav; ctx.lineWidth = 2.5
            ctx.shadowColor = COL.wavG; ctx.shadowBlur = 6
            ctx.beginPath()
            for (let i = 0; i < g.trail.length; i++) {
              const t = g.trail[i]
              ctx.globalAlpha = t.a
              if (i === 0) ctx.moveTo(t.x, t.y); else ctx.lineTo(t.x, t.y)
            }
            ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1
          } else {
            // Dot trail for cube mode
            for (const t of g.trail) {
              ctx.globalAlpha = t.a; ctx.fillStyle = t.c
              ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, P2); ctx.fill()
            }
            ctx.globalAlpha = 1
          }
        }

        // ── Player ──
        if (!g.dead || g.dTmr > 20) {
          ctx.save()
          ctx.translate(g.px + S / 2, g.py + S / 2)
          ctx.rotate(g.rot)
          ctx.fillStyle = g.mode === 'wave' ? COL.wav : COL.ply
          ctx.shadowColor = g.mode === 'wave' ? COL.wavG : COL.plyG
          ctx.shadowBlur = 14
          ctx.fillRect(-S / 2, -S / 2, S, S)
          // Shine highlight
          ctx.fillStyle = 'rgba(255,255,255,0.3)'
          ctx.fillRect(-S / 2, -S / 2, S, S * 0.3)
          ctx.shadowBlur = 0
          // Eyes
          ctx.fillStyle = '#fff'
          ctx.fillRect(-3, -2, 3, 3); ctx.fillRect(2, -2, 3, 3)
          ctx.restore()
        }

        // Particles
        for (const pt of g.pts) { const a = pt.l / pt.ml; ctx.globalAlpha = a; ctx.fillStyle = pt.c; ctx.shadowColor = pt.c; ctx.shadowBlur = 3; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * a, 0, P2); ctx.fill() }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
        for (const r of g.rings) { if (r.a < 0.02) continue; ctx.globalAlpha = r.a; ctx.strokeStyle = r.c; ctx.lineWidth = r.lw || 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, P2); ctx.stroke() }
        ctx.globalAlpha = 1

        // ── HUD ──
        ctx.fillStyle = 'rgba(11,11,42,0.55)'; ctx.fillRect(0, 0, W, 36)

        // Progress bar
        const bx = 48, bw = W - 130, bh = 7, by = 14
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by, bw, bh)
        const pr = Math.min(uPr / 100, 1)
        ctx.fillStyle = COL.ply; ctx.shadowColor = COL.plyG; ctx.shadowBlur = 5
        ctx.fillRect(bx, by, bw * pr, bh); ctx.shadowBlur = 0
        // Progress ball
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + bw * pr, by + bh / 2, 4, 0, P2); ctx.fill()
        // Percentage
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = "bold 9px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
        ctx.fillText(`${uPr}%`, bx + bw / 2, by + bh + 11)

        // Mode
        ctx.textAlign = 'left'; ctx.fillStyle = g.mode === 'wave' ? COL.wav : COL.ply
        ctx.font = "bold 10px 'Fredoka One',sans-serif"
        ctx.fillText(g.mode === 'wave' ? '~ WAVE' : '□ CUBE', 10, 26)

        // Right side
        ctx.textAlign = 'right'; ctx.fillStyle = COL.dia; ctx.font = "bold 11px 'Fredoka One',sans-serif"
        ctx.fillText(`💎 ${uDi}`, W - 10, 15)
        ctx.fillStyle = COL.gnd; ctx.fillText(`Lv${g.lv} ×${g.att}`, W - 10, 30)

        // ── Overlays ──
        if (p === 'idle') {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H)
          const sc = 0.92 + Math.sin(ts / 400) * 0.08
          ctx.save(); ctx.translate(W / 2, H * 0.44); ctx.scale(sc, sc)
          ctx.fillStyle = '#fff'; ctx.shadowColor = COL.ply; ctx.shadowBlur = 16
          ctx.font = "bold 22px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
          ctx.fillText('TAP UNTUK MULAI', 0, 0)
          ctx.shadowBlur = 4; ctx.fillStyle = COL.gnd; ctx.font = "13px 'Fredoka One',sans-serif"
          ctx.fillText('💎 Neon Dash', 0, 26)
          ctx.shadowBlur = 0; ctx.restore()
        }
        if (p === 'dead') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H)
          ctx.fillStyle = COL.spk; ctx.shadowColor = COL.spkG; ctx.shadowBlur = 12
          ctx.font = "bold 22px 'Fredoka One',sans-serif"; ctx.textAlign = 'center'
          ctx.fillText('💥 CRASH!', W / 2, H * 0.38)
          ctx.shadowBlur = 4; ctx.fillStyle = '#fff'; ctx.font = "14px 'Fredoka One',sans-serif"
          ctx.fillText('Tap untuk retry', W / 2, H * 0.38 + 28)
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = "11px 'Fredoka One',sans-serif"
          ctx.fillText(`Attempt #${g.att}  •  ${uPr}%`, W / 2, H * 0.38 + 50)
          ctx.shadowBlur = 0
        }

        ctx.restore()
      } catch (e) { console.error('ND:', e) }
      aRef.current = requestAnimationFrame(loop)
    }
    aRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(aRef.current)
      c.removeEventListener('mousedown', onD); c.removeEventListener('mouseup', onU)
      window.removeEventListener('keydown', kD); window.removeEventListener('keyup', kU)
    }
  }, [difficulty.id])

  const restart = () => { const { w, h } = szC(); gR.current = mkG(w, h); sP('idle'); setUSc(0); setULv(1); setUPr(0); setUDi('0/0'); setUAt(1); setShowConf(false) }
  const coinR = phase === 'won' ? ({ easy: 20, medium: 40, hard: 65 }[difficulty.id] || 20) + Math.floor(uSc / 150) + 30 : 0
  const DL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

  return (
    <div style={{ width: '100%', height: typeof CSS !== 'undefined' && CSS.supports('height', '100dvh') ? '100dvh' : '100vh', background: COL.bg1, position: 'relative', overflow: 'hidden', userSelect: 'none', fontFamily: "'Fredoka One',cursive" }}>
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
          <div style={{ background: 'linear-gradient(180deg,#0d0d30,#1a1a3e)', borderRadius: 28, padding: '36px 28px', textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: `0 0 60px ${COL.ply}33`, animation: 'ndP 0.45s cubic-bezier(0.34,1.56,0.64,1)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${COL.ply},${COL.gnd},${COL.dia})` }} />
            <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
            <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 4 }}>ALL CLEAR!</h2>
            <p style={{ color: COL.gnd, fontSize: 13, marginBottom: 12 }}>{dc.maxLv} level selesai!</p>
            <span style={{ display: 'inline-block', background: 'rgba(162,155,254,0.15)', color: COL.gnd, padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{DL[difficulty.id]}</span>
            <div style={{ fontSize: 30, marginBottom: 12, letterSpacing: 8 }}>⭐⭐⭐</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(253,203,110,0.12)', border: '1.5px solid #FDCB6E44', borderRadius: 100, padding: '6px 18px', marginBottom: 16 }}><span>🪙</span><span style={{ color: '#F9A825', fontSize: 16, fontWeight: 800 }}>+{coinR}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 24 }}>
              <div style={{ background: `${COL.dia}10`, borderRadius: 14, padding: '12px 8px' }}><div style={{ fontSize: 22, color: COL.dia }}>{uSc}</div><div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Skor</div></div>
              <div style={{ background: `${COL.ply}10`, borderRadius: 14, padding: '12px 8px' }}><div style={{ fontSize: 22, color: COL.ply }}>Lv {uLv}</div><div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Level</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={restart} style={{ flex: 1, background: `linear-gradient(135deg,${COL.ply},${COL.gnd})`, color: '#fff', border: 'none', borderRadius: 100, padding: '13px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{ flex: 1, background: '#1e2a4a', color: '#aaa', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '13px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes ndF{from{opacity:0}to{opacity:1}}@keyframes ndP{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
