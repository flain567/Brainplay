import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS_SW = [
  { emoji:'🐍', title:'Slither Worm', desc:'Kendalikan cacing neonmu di arena gelap! Makan makanan untuk tumbuh dan bunuh bot musuh untuk poin besar.', tip:'Jangan sampai menabrak tembok merah di tepi arena!' },
  { emoji:'🕹', title:'Kontrol', desc:'Gunakan joystick virtual di kiri bawah untuk mengarahkan cacing. Geser ke mana pun untuk belok!', tip:'Di desktop: WASD atau tombol panah untuk bergerak.' },
  { emoji:'⚡', title:'Boost!', desc:'Tahan tombol ⚡ di kanan bawah untuk turbo speed! Berguna untuk kabur atau mengejar bot musuh.', tip:'Gunakan boost untuk memotong jalur bot dan membunuhnya.' },
]

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

// ─── Constants ────────────────────────────────────────────────────────────────
const SEG_R       = 11
const SEG_GAP     = 7
const FOOD_COLORS = ['#ff6b6b','#ffd93d','#4ecdc4','#a29bfe','#fd79a8','#ff9f43','#54a0ff']

const BOT_SKINS = [
  { head: '#ff6b6b', body: '#cc4444', glow: '#ff6b6b', name: 'Ember'  },
  { head: '#ffd93d', body: '#cca820', glow: '#ffd93d', name: 'Goldie' },
  { head: '#fd79a8', body: '#c94d80', glow: '#fd79a8', name: 'Pinky'  },
  { head: '#ff9f43', body: '#cc7520', glow: '#ff9f43', name: 'Blaze'  },
]
const DEFAULT_PLAYER_SKIN = { head: '#4ecdc4', body: '#2eada4', glow: '#4ecdc4' }

const CFG = {
  easy:   { speed: 2.2, boostMul: 2.0, foodCount: 55, mapSize: 1800, turn: 0.10, bots: 2 },
  medium: { speed: 2.8, boostMul: 2.1, foodCount: 42, mapSize: 2200, turn: 0.11, bots: 3 },
  hard:   { speed: 3.4, boostMul: 2.2, foodCount: 32, mapSize: 2600, turn: 0.12, bots: 5 },
}

const rand  = (a, b) => a + Math.random() * (b - a)
const dist2 = (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2

// ─── Helpers ──────────────────────────────────────────────────────────────────
function spawnFood(mapSize) {
  return {
    x: rand(60, mapSize - 60),
    y: rand(60, mapSize - 60),
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
    r: rand(5, 9),
    pulse: rand(0, Math.PI * 2),
  }
}

function makeWorm(x, y, angle, len = 24) {
  const segs = []
  for (let i = 0; i < len; i++) {
    segs.push({ x: x - Math.cos(angle) * i * SEG_GAP, y: y - Math.sin(angle) * i * SEG_GAP })
  }
  return { segs, angle, score: 0, alive: true, respawnTimer: 0 }
}

// ─── AI brain ─────────────────────────────────────────────────────────────────
function botThink(bot, foods, mapSize, cfg) {
  const head = bot.segs[0]
  const margin = 120

  // Wall avoidance — highest priority
  const nearWall = head.x < margin || head.x > mapSize - margin ||
                   head.y < margin || head.y > mapSize - margin
  if (nearWall) {
    const toCenter = Math.atan2(mapSize / 2 - head.y, mapSize / 2 - head.x)
    let da = toCenter - bot.angle
    while (da >  Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    bot.angle += da * 0.18
    return
  }

  // Seek nearest food
  let best = null, bestD = Infinity
  for (const f of foods) {
    const d = dist2(head, f)
    if (d < bestD) { bestD = d; best = f }
  }
  if (best) {
    const target = Math.atan2(best.y - head.y, best.x - head.x)
    let da = target - bot.angle
    while (da >  Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    bot.angle += da * cfg.turn
  }
}

// ─── Draw Worm (no shadowBlur — offscreen glow via pre-drawn circle) ─────────
function drawWorm(ctx, worm, skin, camX, camY, W, H, isPlayer) {
  const segs = worm.segs
  const len  = segs.length

  // Body — back to front
  for (let i = len - 1; i >= 1; i--) {
    const s  = segs[i]
    const sx = s.x - camX, sy = s.y - camY
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue

    const t  = i / len
    const r  = SEG_R * (1 - t * 0.30)
    const ev = i % 2 === 0

    ctx.fillStyle = ev ? skin.body : skin.head + 'cc'
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()

    // Highlight dot — cheap alternative to glow
    if (i % 4 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)'
      ctx.beginPath()
      ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.25, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Head
  const h  = segs[0]
  const hx = h.x - camX, hy = h.y - camY
  if (hx >= -30 && hx <= W + 30 && hy >= -30 && hy <= H + 30) {
    // Glow ring (1 cheap ring instead of shadowBlur)
    ctx.globalAlpha = 0.22
    ctx.fillStyle   = skin.glow
    ctx.beginPath()
    ctx.arc(hx, hy, SEG_R + 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.fillStyle = skin.head
    ctx.beginPath()
    ctx.arc(hx, hy, SEG_R, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    const ang = worm.angle
    const eOff = SEG_R * 0.52
    ;[ang - 0.42, ang + 0.42].forEach(ea => {
      const ex = hx + Math.cos(ea) * eOff
      const ey = hy + Math.sin(ea) * eOff
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(ex, ey, SEG_R * 0.30, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0a0a1a'
      ctx.beginPath(); ctx.arc(ex + Math.cos(ang)*1.4, ey + Math.sin(ang)*1.4, SEG_R * 0.14, 0, Math.PI * 2); ctx.fill()
    })

    // Name tag (bots only)
    if (!isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px Nunito,sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(skin.name, hx, hy - SEG_R - 6)
    }
  }
}

// ─── Draw Food ────────────────────────────────────────────────────────────────
function drawFood(ctx, foods, camX, camY, W, H) {
  for (const f of foods) {
    const fx = f.x - camX, fy = f.y - camY
    if (fx < -20 || fx > W + 20 || fy < -20 || fy > H + 20) continue
    const pr = f.r + Math.sin(f.pulse) * 1.8

    // Soft outer ring (cheap glow)
    ctx.globalAlpha = 0.18
    ctx.fillStyle   = f.color
    ctx.beginPath(); ctx.arc(fx, fy, pr + 4, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1

    ctx.fillStyle = f.color
    ctx.beginPath(); ctx.arc(fx, fy, pr, 0, Math.PI * 2); ctx.fill()

    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath(); ctx.arc(fx - pr * 0.3, fy - pr * 0.3, pr * 0.26, 0, Math.PI * 2); ctx.fill()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SlitherWorm({ onBack, game, difficulty }) {
  const canvasRef  = useRef(null)
  const gameRef    = useRef(null)
  const stickRef   = useRef({ active: false, dx: 0, dy: 0, bcx: 0, bcy: 0 })
  const boostRef   = useRef(false)
  const animRef    = useRef(null)
  const { play }   = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins, getActiveSkin } = useCoins()
  const PLAYER_SKIN = getActiveSkin ? getActiveSkin() : DEFAULT_PLAYER_SKIN

  const cfg = CFG[difficulty.id]

  const [phase, setPhase]       = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-slither'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [score, setScore]       = useState(0)
  const [length, setLength]     = useState(0)
  const [kills, setKills]       = useState(0)
  const [knobPos, setKnobPos]   = useState({ x: 0, y: 0 })
  const [boosting, setBoosting] = useState(false)
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem(`slither-best-${difficulty.id}`) || '0')
  )
  const joyRef = useRef(null)

  // ── Init ──
  function initGame(canvas) {
    const M = cfg.mapSize
    const player = makeWorm(M / 2, M / 2, 0, 28)
    const bots   = BOT_SKINS.slice(0, cfg.bots).map((skin, i) => ({
      ...makeWorm(rand(200, M - 200), rand(200, M - 200), rand(0, Math.PI * 2), 22),
      skin,
    }))
    const foods  = Array.from({ length: cfg.foodCount }, () => spawnFood(M))
    return {
      player, bots, foods,
      score: 0, kills: 0, mapSize: M,
      cam: { x: M / 2 - (canvas._logicalW || canvas.width) / 2, y: M / 2 - (canvas._logicalH || canvas.height) / 2 },
      tick: 0,
    }
  }

  function sizeCanvas() {
    const c = canvasRef.current
    if (!c) return { w:0, h:0 }
    const parent = c.parentElement
    if (!parent) return { w:0, h:0 }
    const rect = parent.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(rect.width)
    const h = Math.floor(rect.height)
    c.width = w * dpr
    c.height = h * dpr
    c.style.width = w + 'px'
    c.style.height = h + 'px'
    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Store logical size for game code
    c._logicalW = w
    c._logicalH = h
    return { w, h }
  }

  function startGame() {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = sizeCanvas()
    if (w === 0 || h === 0) return
    gameRef.current = initGame(canvas)
    setScore(0); setLength(0); setKills(0)
    setPhase('playing')
  }

  // ── Resize ──
  useEffect(() => {
    sizeCanvas()
    const fn = () => { sizeCanvas() }
    fn()
    window.addEventListener('resize', fn)
    window.addEventListener('orientationchange', () => setTimeout(fn, 200))
    return () => { window.removeEventListener('resize', fn) }
  }, [])

  // ── Game loop ──
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    // Pre-draw grid to offscreen canvas once
    const gridCanvas = document.createElement('canvas')
    gridCanvas.width  = 700
    gridCanvas.height = 700
    const gc = gridCanvas.getContext('2d')
    gc.strokeStyle = 'rgba(162,155,254,0.045)'
    gc.lineWidth = 0.5
    const GS = 70
    for (let x = 0; x <= 700; x += GS) { gc.beginPath(); gc.moveTo(x,0); gc.lineTo(x,700); gc.stroke() }
    for (let y = 0; y <= 700; y += GS) { gc.beginPath(); gc.moveTo(0,y); gc.lineTo(700,y); gc.stroke() }

    let lastTime = 0

    function update(dt) {
      const g = gameRef.current
      if (!g) return
      const M  = g.mapSize
      const p  = g.player
      const spd = (boostRef.current ? cfg.speed * cfg.boostMul : cfg.speed)

      // Player steering
      if (stickRef.current.active) {
        const { dx, dy } = stickRef.current
        if (Math.abs(dx) > 0.04 || Math.abs(dy) > 0.04) {
          const target = Math.atan2(dy, dx)
          let da = target - p.angle
          while (da >  Math.PI) da -= Math.PI * 2
          while (da < -Math.PI) da += Math.PI * 2
          p.angle += da * cfg.turn
        }
      }

      // Move player
      const nx = p.segs[0].x + Math.cos(p.angle) * spd
      const ny = p.segs[0].y + Math.sin(p.angle) * spd

      // Wall death
      if (nx < SEG_R || nx > M - SEG_R || ny < SEG_R || ny > M - SEG_R) {
        p.alive = false
        play('gameOver')
        const fs = g.score
        if (fs > bestScore) { localStorage.setItem(`slither-best-${difficulty.id}`, fs); setBestScore(fs); setShowConfetti(true); setTimeout(()=>setShowConfetti(false),100) }
        setPhase('dead')
        return
      }

      // Player head hits bot body → Player dies
      for (const bot of g.bots) {
        if (!bot.alive) continue
        // Check against bot body segments (skip head, index 0)
        for (let si = 3; si < bot.segs.length; si++) {
          if (dist2({ x: nx, y: ny }, bot.segs[si]) < (SEG_R * 1.9) ** 2) {
            p.alive = false
            play('gameOver')
            const fs = g.score
            if (fs > bestScore) { localStorage.setItem(`slither-best-${difficulty.id}`, fs); setBestScore(fs); setShowConfetti(true); setTimeout(()=>setShowConfetti(false),100) }
            // Drop player pellets
            const drop = Math.min(25, Math.floor(p.segs.length / 3))
            for (let i = 0; i < drop; i++) {
              const ps = p.segs[i * 3] || p.segs[0]
              g.foods.push({ x: ps.x + rand(-12,12), y: ps.y + rand(-12,12), color: PLAYER_SKIN.head, r: rand(5,9), pulse: 0 })
            }
            setPhase('dead')
            return
          }
        }
      }

      p.segs.unshift({ x: nx, y: ny })

      // Food eating
      let grew = 0
      g.foods = g.foods.filter(f => {
        if (dist2(p.segs[0], f) < (SEG_R + f.r + 2) ** 2) {
          g.score += Math.round(f.r); grew += Math.ceil(f.r / 2); return false
        }
        return true
      })
      if (grew > 0) {
        play('eat')
        const tail = p.segs[p.segs.length - 1]
        for (let i = 0; i < grew; i++) p.segs.push({ ...tail })
        setScore(g.score); setLength(p.segs.length)
      } else {
        p.segs.pop()
      }

      // Bots update
      g.bots.forEach(bot => {
        if (!bot.alive) {
          bot.respawnTimer -= 1
          if (bot.respawnTimer <= 0) {
            const nb = makeWorm(rand(200, M - 200), rand(200, M - 200), rand(0, Math.PI * 2), 18)
            bot.segs  = nb.segs
            bot.angle = nb.angle
            bot.alive = true
          }
          return
        }

        botThink(bot, g.foods, M, cfg)
        const bspd = cfg.speed * 0.85
        const bnx  = bot.segs[0].x + Math.cos(bot.angle) * bspd
        const bny  = bot.segs[0].y + Math.sin(bot.angle) * bspd

        // Bot wall death → respawn
        if (bnx < SEG_R || bnx > M - SEG_R || bny < SEG_R || bny > M - SEG_R) {
          bot.alive = false; bot.respawnTimer = 180

          // Drop food pellets where bot died
          const drop = Math.min(20, Math.floor(bot.segs.length / 3))
          for (let i = 0; i < drop; i++) {
            const bs = bot.segs[i * 3] || bot.segs[0]
            g.foods.push({ x: bs.x + rand(-12,12), y: bs.y + rand(-12,12), color: bot.skin.head, r: rand(5,8), pulse: 0 })
          }
          return
        }

        // Bot head hits player body → Bot dies (player gets kill)
        for (let si = 3; si < p.segs.length; si++) {
          if (dist2({ x: bnx, y: bny }, p.segs[si]) < (SEG_R * 1.9) ** 2) {
            bot.alive = false; bot.respawnTimer = 220
            g.score  += Math.floor(bot.segs.length * 2)
            g.kills  += 1
            play('levelUp')
            setScore(g.score); setKills(g.kills)

            const drop = Math.min(30, Math.floor(bot.segs.length / 2))
            for (let i = 0; i < drop; i++) {
              const bs = bot.segs[i * 2] || bot.segs[0]
              g.foods.push({ x: bs.x + rand(-14,14), y: bs.y + rand(-14,14), color: bot.skin.head, r: rand(6,10), pulse: 0 })
            }
            return
          }
        }

        // Head-to-head collision → both die but player gets points
        if (dist2({ x: bnx, y: bny }, p.segs[0]) < (SEG_R * 2.2) ** 2) {
          bot.alive = false; bot.respawnTimer = 220
          g.score  += Math.floor(bot.segs.length * 2)
          g.kills  += 1
          play('levelUp')
          setScore(g.score); setKills(g.kills)

          // Drop pellets
          const drop2 = Math.min(30, Math.floor(bot.segs.length / 2))
          for (let i = 0; i < drop2; i++) {
            const bs = bot.segs[i * 2] || bot.segs[0]
            g.foods.push({ x: bs.x + rand(-14,14), y: bs.y + rand(-14,14), color: bot.skin.head, r: rand(6,10), pulse: 0 })
          }
          return
        }

        bot.segs.unshift({ x: bnx, y: bny })

        // Bots eat food too
        g.foods = g.foods.filter(f => {
          if (dist2(bot.segs[0], f) < (SEG_R + f.r) ** 2) {
            const ts = bot.segs[bot.segs.length - 1]
            bot.segs.push({ ...ts }); return false
          }
          return true
        })
        bot.segs.pop()
      })

      // Replenish food
      while (g.foods.length < cfg.foodCount) g.foods.push(spawnFood(M))
      g.foods.forEach(f => { f.pulse += 0.05 })

      // Camera
      const cW = canvas._logicalW || canvas.width, cH = canvas._logicalH || canvas.height
      g.cam.x += (nx - cW / 2 - g.cam.x) * 0.09
      g.cam.y += (ny - cH / 2 - g.cam.y) * 0.09
      g.cam.x  = Math.max(0, Math.min(M - cW,  g.cam.x))
      g.cam.y  = Math.max(0, Math.min(M - cH, g.cam.y))
      g.tick++
    }

    function draw() {
      const g = gameRef.current
      if (!g) return
      const W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height
      const cx = g.cam.x, cy = g.cam.y

      // Background
      ctx.fillStyle = '#07071a'
      ctx.fillRect(0, 0, W, H)

      // Tiled grid (offscreen cache)
      const gw = gridCanvas.width
      const ox = -(cx % gw), oy = -(cy % gw)
      for (let x = ox; x < W; x += gw)
        for (let y = oy; y < H; y += gw)
          ctx.drawImage(gridCanvas, x, y)

      // Arena border
      ctx.strokeStyle = 'rgba(255,107,107,0.6)'
      ctx.lineWidth   = 2.5
      ctx.strokeRect(2 - cx, 2 - cy, g.mapSize - 4, g.mapSize - 4)
      ctx.strokeStyle = 'rgba(255,107,107,0.15)'
      ctx.lineWidth   = 14
      ctx.strokeRect(2 - cx, 2 - cy, g.mapSize - 4, g.mapSize - 4)

      // Food
      drawFood(ctx, g.foods, cx, cy, W, H)

      // Bots
      g.bots.forEach(bot => {
        if (bot.alive) drawWorm(ctx, bot, bot.skin, cx, cy, W, H, false)
      })

      // Player
      drawWorm(ctx, g.player, PLAYER_SKIN, cx, cy, W, H, true)

      // Boost trail
      if (boostRef.current && g.player.segs.length > 3) {
        ctx.globalAlpha = 0.18
        ctx.fillStyle   = PLAYER_SKIN.glow
        for (let i = 0; i < 5; i++) {
          const ts = g.player.segs[g.player.segs.length - 1 - i]
          if (!ts) break
          ctx.beginPath()
          ctx.arc(ts.x - cx + rand(-6,6), ts.y - cy + rand(-6,6), rand(2,5), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      ctx.shadowBlur = 0
    }

    function loop(ts) {
      const dt = ts - lastTime
      // Cap to ~60fps tick — skip if tab is hidden
      if (dt >= 14) {
        update(dt)
        draw()
        lastTime = ts
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase])

  // ── Keyboard ──
  useEffect(() => {
    const held = {}
    function sync() {
      const dx = (held['ArrowRight']||held['d']?1:0) - (held['ArrowLeft']||held['a']?1:0)
      const dy = (held['ArrowDown'] ||held['s']?1:0) - (held['ArrowUp']  ||held['w']?1:0)
      stickRef.current = dx||dy ? { active:true, dx, dy } : { active:false, dx:0, dy:0 }
      const b = !!held[' '] || !!held['Shift']
      boostRef.current = b; setBoosting(b)
    }
    const dn = e => { held[e.key]=true;  sync() }
    const up = e => { delete held[e.key]; sync() }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // ── Report to global progress on death ──
  useEffect(() => {
    if (phase === 'dead' && score > 0) {
      const stars = score >= 100 ? 3 : score >= 50 ? 2 : 1
      reportGameResult({
        gameId: 'slither-worm',
        difficultyId: difficulty.id,
        won: false,
        score,
        stars,
        timeSec: 0,
      })
      // Coin reward based on score
      const coinAmount = Math.max(5, Math.min(Math.floor(score / 5), 30))
      earnCoins(coinAmount, `Slither Worm — skor ${score}`)
    }
  }, [phase])

  // ── Joystick ──
  const handleJoy = useCallback((e, type) => {
    e.preventDefault()
    const rect = joyRef.current?.getBoundingClientRect()
    if (!rect) return
    const bcx = rect.left + rect.width  / 2
    const bcy = rect.top  + rect.height / 2

    if (type === 'end') {
      stickRef.current = { active:false, dx:0, dy:0 }
      setKnobPos({ x:0, y:0 })
      return
    }
    const t   = e.touches ? e.touches[0] : e
    const dx  = t.clientX - bcx, dy = t.clientY - bcy
    const d   = Math.sqrt(dx*dx+dy*dy) || 1
    const max = 38
    const nx  = (dx/d)*Math.min(d,max)/max
    const ny  = (dy/d)*Math.min(d,max)/max
    stickRef.current = { active:true, dx:nx, dy:ny }
    setKnobPos({ x:nx*32, y:ny*32 })
  }, [])

  const DLABEL = { easy:'🟢 Mudah', medium:'🟡 Sedang', hard:'🔴 Sulit' }

  return (
    <div style={{ width:'100%', height:'100vh', height:'100dvh', background:'#07071a', position:'relative', overflow:'hidden', userSelect:'none' }}>
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', touchAction:'none' }} />
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS_SW} color="#4ECDC4" onClose={()=>{ setShowTutorial(false); localStorage.setItem('tut-slither','1') }} />}
      <Confetti active={showConfetti} onDone={()=>setShowConfetti(false)} />

      {/* ── HUD ── */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'linear-gradient(to bottom,rgba(7,7,26,0.88),transparent)' }}>
          <button onClick={() => { play('click'); onBack() }}
            style={{ background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'7px 14px', color:'rgba(255,255,255,0.7)', fontSize:15, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>
            ←
          </button>
          <div style={{ display:'flex', gap:18, alignItems:'center' }}>
            {[
              { v:score,  label:'SKOR',    c:'#4ecdc4' },
              { v:length, label:'PANJANG', c:'#a29bfe' },
              { v:kills,  label:'KILLS',   c:'#ff6b6b' },
              { v:bestScore, label:'REKOR',c:'#ffd93d' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:'0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <span style={{ background:'rgba(162,155,254,0.1)', color:'#a29bfe', border:'1.5px solid rgba(162,155,254,0.2)', borderRadius:100, padding:'5px 12px', fontSize:12, fontFamily:"'Fredoka One',cursive" }}>
            {DLABEL[difficulty.id]}
          </span>
        </div>
      )}

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)' }}>
          <div style={{ fontSize:80, marginBottom:4, filter:'drop-shadow(0 0 20px #4ecdc4)' }}>🐍</div>
          <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:38, color:'#fff', marginBottom:6, textShadow:'0 0 20px #4ecdc4' }}>Slither Worm</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:6, textAlign:'center', maxWidth:300, lineHeight:1.7 }}>
            Makan makanan, habisi cacing lain, dan jadi yang terpanjang di arena!
          </p>

          {/* Bot preview */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', justifyContent:'center' }}>
            {BOT_SKINS.slice(0, cfg.bots).map(b => (
              <span key={b.name} style={{ background:`${b.glow}18`, border:`1.5px solid ${b.glow}44`, color:b.glow, borderRadius:100, padding:'4px 14px', fontSize:12, fontWeight:700, fontFamily:"'Fredoka One',cursive" }}>
                🐍 {b.name}
              </span>
            ))}
          </div>

          <div style={{ display:'flex', gap:18, marginBottom:28, fontSize:12, color:'rgba(255,255,255,0.35)' }}>
            <span>🕹 Joystick</span><span>⚡ Boost</span><span>💀 Bunuh bot = skor</span>
          </div>
          <button onClick={startGame}
            style={{ background:'linear-gradient(135deg,#4ecdc4,#a29bfe)', color:'#fff', border:'none', borderRadius:100, padding:'15px 50px', fontSize:19, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 0 36px rgba(78,205,196,0.4)', letterSpacing:'0.5px', WebkitTapHighlightColor:'transparent' }}>
            ▶ Mulai Main
          </button>
          <button onClick={() => { play('click'); onBack() }}
            style={{ marginTop:12, background:'transparent', color:'rgba(255,255,255,0.35)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:100, padding:'10px 24px', fontSize:13, fontWeight:700, fontFamily:"'Fredoka One',cursive", cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
            ← Kembali
          </button>
        </div>
      )}

      {/* ── Dead ── */}
      {phase === 'dead' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)', animation:'fadeIn 0.3s ease' }}>
          <div style={{ fontSize:68, marginBottom:8 }}>💀</div>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:34, color:'#ff6b6b', marginBottom:4, textShadow:'0 0 20px #ff6b6b44' }}>Game Over!</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', marginBottom:24, fontSize:13 }}>Cacingmu menabrak tembok arena</p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:22 }}>
            {[
              { label:'Skor',    value: gameRef.current?.score || 0,  c:'#4ecdc4' },
              { label:'Panjang', value: gameRef.current?.player.segs.length || 0, c:'#a29bfe' },
              { label:'Kills',   value: gameRef.current?.kills || 0,  c:'#ff6b6b' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:`1.5px solid ${s.c}22`, borderRadius:16, padding:'16px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:s.c }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {(gameRef.current?.score || 0) >= bestScore && bestScore > 0 && (
            <div style={{ marginBottom:16, background:'rgba(255,211,61,0.08)', border:'1.5px solid rgba(255,211,61,0.25)', borderRadius:100, padding:'7px 20px', color:'#ffd93d', fontSize:13, fontWeight:700 }}>
              🏆 Rekor Baru!
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={startGame}
              style={{ background:'linear-gradient(135deg,#4ecdc4,#a29bfe)', color:'#fff', border:'none', borderRadius:100, padding:'13px 34px', fontSize:16, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 0 22px rgba(78,205,196,0.35)' }}>
              🔄 Main Lagi
            </button>
            <button onClick={() => { play('click'); onBack() }}
              style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:100, padding:'13px 22px', fontSize:14, fontWeight:700, fontFamily:"'Fredoka One',cursive", cursor:'pointer' }}>
              🏠 Home
            </button>
          </div>
        </div>
      )}

      {/* ── Joystick ── */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', bottom:'max(20px, 4vh)', left:'max(16px, 3vw)', zIndex:15, userSelect:'none' }}>
          <div
            ref={joyRef}
            onTouchStart={e=>handleJoy(e,'start')} onTouchMove={e=>handleJoy(e,'move')} onTouchEnd={e=>handleJoy(e,'end')}
            onMouseDown={e=>handleJoy(e,'start')}   onMouseMove={e=>handleJoy(e,'move')} onMouseUp={e=>handleJoy(e,'end')} onMouseLeave={e=>handleJoy(e,'end')}
            style={{ width:112, height:112, borderRadius:'50%', background:'rgba(78,205,196,0.05)', border:'2px solid rgba(78,205,196,0.22)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'grab', touchAction:'none', position:'relative' }}
          >
            <div style={{ position:'absolute', width:'100%', height:1, background:'rgba(78,205,196,0.1)' }} />
            <div style={{ position:'absolute', width:1, height:'100%', background:'rgba(78,205,196,0.1)' }} />
            <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(78,205,196,0.45)', border:'2px solid rgba(78,205,196,0.85)', boxShadow:'0 0 14px rgba(78,205,196,0.45)', transform:`translate(${knobPos.x}px,${knobPos.y}px)`, transition:stickRef.current.active?'none':'transform 0.15s', position:'relative', zIndex:1 }} />
          </div>
          <div style={{ textAlign:'center', marginTop:6, fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:700, letterSpacing:'1px' }}>STEER</div>
        </div>
      )}

      {/* ── Boost ── */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', bottom:'max(28px, 5vh)', right:'max(16px, 3vw)', zIndex:15, userSelect:'none' }}>
          <button
            onTouchStart={e=>{e.preventDefault();boostRef.current=true;setBoosting(true)}}
            onTouchEnd={e=>{e.preventDefault();boostRef.current=false;setBoosting(false)}}
            onMouseDown={()=>{boostRef.current=true;setBoosting(true)}}
            onMouseUp={()=>{boostRef.current=false;setBoosting(false)}}
            onMouseLeave={()=>{boostRef.current=false;setBoosting(false)}}
            style={{ width:74, height:74, borderRadius:'50%', background:boosting?'rgba(255,107,107,0.28)':'rgba(255,107,107,0.08)', border:`2px solid rgba(255,107,107,${boosting?0.85:0.35})`, color:'#ff6b6b', fontSize:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', touchAction:'none', boxShadow:boosting?'0 0 26px rgba(255,107,107,0.5)':'none', transition:'all 0.1s', transform:boosting?'scale(0.93)':'scale(1)' }}
          >⚡</button>
          <div style={{ textAlign:'center', marginTop:6, fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:700, letterSpacing:'1px' }}>BOOST</div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
