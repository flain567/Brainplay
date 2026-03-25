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
  { head: '#ff6b6b', body: '#cc4444', glow: '#ff6b6b', name: 'Ember'   },
  { head: '#ffd93d', body: '#cca820', glow: '#ffd93d', name: 'Goldie'  },
  { head: '#fd79a8', body: '#c94d80', glow: '#fd79a8', name: 'Pinky'   },
  { head: '#ff9f43', body: '#cc7520', glow: '#ff9f43', name: 'Blaze'   },
  { head: '#54a0ff', body: '#2e7acc', glow: '#54a0ff', name: 'Frost'   },
  { head: '#5f27cd', body: '#3e1a8c', glow: '#5f27cd', name: 'Shadow'  },
  { head: '#00d2d3', body: '#00a8a8', glow: '#00d2d3', name: 'Aqua'    },
  { head: '#f368e0', body: '#b94cc0', glow: '#f368e0', name: 'Neon'    },
  { head: '#1dd1a1', body: '#10a67e', glow: '#1dd1a1', name: 'Viper'   },
  { head: '#ee5a24', body: '#b8451c', glow: '#ee5a24', name: 'Magma'   },
  { head: '#c44569', body: '#9b3654', glow: '#c44569', name: 'Rose'    },
  { head: '#3ae374', body: '#28a358', glow: '#3ae374', name: 'Lime'    },
  { head: '#fff200', body: '#ccbe00', glow: '#fff200', name: 'Flash'   },
  { head: '#7158e2', body: '#5840b8', glow: '#7158e2', name: 'Mystic'  },
  { head: '#17c0eb', body: '#1295b8', glow: '#17c0eb', name: 'Sky'     },
]
const DEFAULT_PLAYER_SKIN = { head: '#4ecdc4', body: '#2eada4', glow: '#4ecdc4' }

const CFG = {
  easy:   { speed: 2.2, boostMul: 2.0, foodCount: 120, mapSize: 2400, turn: 0.14, bots: 8  },
  medium: { speed: 2.8, boostMul: 2.1, foodCount: 150, mapSize: 3200, turn: 0.15, bots: 12 },
  hard:   { speed: 3.4, boostMul: 2.2, foodCount: 180, mapSize: 4000, turn: 0.16, bots: 15 },
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

// ─── AI brain — smarter with aggression, avoidance, and encircle ─────────────
function botThink(bot, foods, mapSize, cfg, allWorms) {
  const head = bot.segs[0]
  const margin = 150
  const myLen = bot.segs.length

  // Wall avoidance — highest priority
  const nearWall = head.x < margin || head.x > mapSize - margin ||
                   head.y < margin || head.y > mapSize - margin
  if (nearWall) {
    const toCenter = Math.atan2(mapSize / 2 - head.y, mapSize / 2 - head.x)
    let da = toCenter - bot.angle
    while (da >  Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    bot.angle += da * 0.22
    bot.wantBoost = false
    return
  }

  // Danger check — avoid bigger worms' bodies
  let dangerAngle = null
  let dangerDist = Infinity
  for (const w of allWorms) {
    if (w === bot || !w.alive) continue
    // Only fear worms that are bigger
    if (w.segs.length <= myLen * 0.8) continue
    for (let i = 0; i < w.segs.length; i += 3) {
      const d2 = dist2(head, w.segs[i])
      if (d2 < 100 * 100 && d2 < dangerDist) {
        dangerDist = d2
        dangerAngle = Math.atan2(head.y - w.segs[i].y, head.x - w.segs[i].x)
      }
    }
  }

  if (dangerAngle !== null && dangerDist < 80 * 80) {
    // Flee!
    let da = dangerAngle - bot.angle
    while (da >  Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    bot.angle += da * 0.25
    bot.wantBoost = dangerDist < 50 * 50
    return
  }

  // Aggression — try to cut off smaller worms
  if (myLen > 30) {
    let prey = null, preyD = Infinity
    for (const w of allWorms) {
      if (w === bot || !w.alive) continue
      if (w.segs.length >= myLen * 0.7) continue // Only hunt much smaller
      const d2 = dist2(head, w.segs[0])
      if (d2 < 250 * 250 && d2 < preyD) {
        preyD = d2
        prey = w
      }
    }
    if (prey) {
      // Aim slightly ahead of prey's direction
      const preyHead = prey.segs[0]
      const preyAngle = prey.angle || 0
      const leadDist = 60
      const targetX = preyHead.x + Math.cos(preyAngle) * leadDist
      const targetY = preyHead.y + Math.sin(preyAngle) * leadDist
      const target = Math.atan2(targetY - head.y, targetX - head.x)
      let da = target - bot.angle
      while (da >  Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      bot.angle += da * 0.15
      bot.wantBoost = preyD < 120 * 120
      return
    }
  }

  // Default: Seek nearest food (with some randomness)
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
    // Occasionally add slight random wobble for natural movement
    bot.angle += (Math.random() - 0.5) * 0.02
  }
  bot.wantBoost = false
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
  const [deathCause, setDeathCause] = useState('wall')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_slither-worm'))
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
    const bots   = BOT_SKINS.slice(0, cfg.bots).map((skin, i) => {
      // Variable sizes: ~30% small, ~50% medium, ~20% large
      const sizeRoll = Math.random()
      const len = sizeRoll < 0.3 ? Math.floor(rand(15, 22))
                : sizeRoll < 0.8 ? Math.floor(rand(24, 38))
                : Math.floor(rand(40, 60))
      return {
        ...makeWorm(rand(200, M - 200), rand(200, M - 200), rand(0, Math.PI * 2), len),
        skin, wantBoost: false,
      }
    })
    const foods  = Array.from({ length: cfg.foodCount }, () => spawnFood(M))
    return {
      player, bots, foods, particles: [],
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
    const orientFn = () => setTimeout(fn, 200)
    window.addEventListener('orientationchange', orientFn)
    return () => { window.removeEventListener('resize', fn); window.removeEventListener('orientationchange', orientFn) }
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
          // Turn faster proportional to stick distance for snappier control
          const stickMag = Math.sqrt(dx * dx + dy * dy)
          p.angle += da * (cfg.turn + stickMag * 0.08)
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
        setDeathCause('wall')
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
            setDeathCause('bot')
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
          g.score += Math.round(f.r); grew += Math.ceil(f.r / 2)
          // Spawn eat particles
          for (let pi = 0; pi < 6; pi++) {
            g.particles.push({
              x: f.x, y: f.y, vx: rand(-2, 2), vy: rand(-2, 2),
              r: rand(2, 5), color: f.color, life: 1,
            })
          }
          return false
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

      // Update particles
      g.particles = g.particles.filter(pt => {
        pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.04; pt.r *= 0.97
        return pt.life > 0
      })

      // Bots update
      const allWorms = [g.player, ...g.bots]
      g.bots.forEach(bot => {
        if (!bot.alive) {
          bot.respawnTimer -= 1
          if (bot.respawnTimer <= 0) {
            const sizeRoll = Math.random()
            const len = sizeRoll < 0.3 ? Math.floor(rand(15, 22))
                      : sizeRoll < 0.8 ? Math.floor(rand(24, 38))
                      : Math.floor(rand(40, 55))
            const nb = makeWorm(rand(200, M - 200), rand(200, M - 200), rand(0, Math.PI * 2), len)
            bot.segs  = nb.segs
            bot.angle = nb.angle
            bot.alive = true
            bot.wantBoost = false
          }
          return
        }

        botThink(bot, g.foods, M, cfg, allWorms)
        const botBoost = bot.wantBoost ? 1.3 : 1.0
        const bspd = cfg.speed * 0.88 * botBoost
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

            // Kill celebration particles
            for (let pi = 0; pi < 12; pi++) {
              g.particles.push({
                x: bnx, y: bny, vx: rand(-4, 4), vy: rand(-4, 4),
                r: rand(3, 7), color: bot.skin.glow, life: 1,
              })
            }

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

        // Bot-to-bot kills — bot head hits other bot body
        for (const other of g.bots) {
          if (other === bot || !other.alive) continue
          for (let si = 3; si < other.segs.length; si++) {
            if (dist2({ x: bnx, y: bny }, other.segs[si]) < (SEG_R * 1.8) ** 2) {
              bot.alive = false; bot.respawnTimer = 200
              // Drop pellets from dead bot
              const drop = Math.min(25, Math.floor(bot.segs.length / 3))
              for (let i = 0; i < drop; i++) {
                const bs = bot.segs[i * 3] || bot.segs[0]
                g.foods.push({ x: bs.x + rand(-14,14), y: bs.y + rand(-14,14), color: bot.skin.head, r: rand(5,9), pulse: 0 })
              }
              // Other bot grows from kill
              const ts = other.segs[other.segs.length - 1]
              for (let i = 0; i < Math.min(8, Math.floor(bot.segs.length / 4)); i++) {
                other.segs.push({ ...ts })
              }
              break
            }
          }
          if (!bot.alive) break
        }
      })

      // Replenish food
      while (g.foods.length < cfg.foodCount) g.foods.push(spawnFood(M))
      g.foods.forEach(f => { f.pulse += 0.05 })

      // Camera — slightly faster follow for better feel
      const cW = canvas._logicalW || canvas.width, cH = canvas._logicalH || canvas.height
      g.cam.x += (nx - cW / 2 - g.cam.x) * 0.12
      g.cam.y += (ny - cH / 2 - g.cam.y) * 0.12
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

      // Eat particles
      g.particles.forEach(pt => {
        const px = pt.x - cx, py = pt.y - cy
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) return
        ctx.globalAlpha = pt.life
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(px, py, pt.r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      ctx.shadowBlur = 0

      // ── Minimap ──
      const mmSize = 110, mmMargin = 12
      const mmX = W - mmSize - mmMargin, mmY = H - mmSize - mmMargin
      ctx.fillStyle = 'rgba(7,7,26,0.7)'
      ctx.strokeStyle = 'rgba(162,155,254,0.3)'
      ctx.lineWidth = 1
      ctx.fillRect(mmX, mmY, mmSize, mmSize); ctx.strokeRect(mmX, mmY, mmSize, mmSize)
      const mmScale = mmSize / g.mapSize
      // Food dots
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let fi = 0; fi < g.foods.length; fi += 4) {
        const f = g.foods[fi]
        ctx.fillRect(mmX + f.x * mmScale, mmY + f.y * mmScale, 1, 1)
      }
      // Bots on minimap
      g.bots.forEach(b => {
        if (!b.alive) return
        ctx.fillStyle = b.skin.head + '99'
        ctx.beginPath()
        ctx.arc(mmX + b.segs[0].x * mmScale, mmY + b.segs[0].y * mmScale, Math.max(2, b.segs.length * 0.04), 0, Math.PI * 2)
        ctx.fill()
      })
      // Player on minimap
      const ph = g.player.segs[0]
      ctx.fillStyle = '#4ecdc4'
      ctx.beginPath()
      ctx.arc(mmX + ph.x * mmScale, mmY + ph.y * mmScale, 3, 0, Math.PI * 2)
      ctx.fill()
      // Player view rect
      ctx.strokeStyle = 'rgba(78,205,196,0.5)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(mmX + cx * mmScale, mmY + cy * mmScale, W * mmScale, H * mmScale)

      // ── Leaderboard HUD (top 5) ──
      const ranking = [
        { name: 'Kamu', len: g.player.segs.length, color: '#4ecdc4', alive: g.player.alive },
        ...g.bots.map(b => ({ name: b.skin.name, len: b.alive ? b.segs.length : 0, color: b.skin.head, alive: b.alive }))
      ].filter(r => r.alive).sort((a, b) => b.len - a.len).slice(0, 5)

      const lbX = W - 120 - mmMargin, lbY = mmMargin
      ctx.fillStyle = 'rgba(7,7,26,0.55)'
      ctx.fillRect(lbX, lbY, 120, 14 + ranking.length * 18)
      ctx.font = '700 9px Nunito,sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.textAlign = 'left'
      ctx.fillText('TOP WORMS', lbX + 8, lbY + 11)
      ranking.forEach((r, i) => {
        const ry = lbY + 16 + i * 18
        const isMe = r.name === 'Kamu'
        ctx.fillStyle = r.color + (isMe ? '' : '88')
        ctx.beginPath(); ctx.arc(lbX + 12, ry + 5, 3, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = isMe ? '#fff' : 'rgba(255,255,255,0.45)'
        ctx.font = isMe ? '700 11px Nunito,sans-serif' : '600 10px Nunito,sans-serif'
        ctx.fillText(r.name, lbX + 20, ry + 9)
        ctx.textAlign = 'right'
        ctx.fillText(r.len, lbX + 114, ry + 9)
        ctx.textAlign = 'left'
      })
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
    const max = 46
    const nx  = (dx/d)*Math.min(d,max)/max
    const ny  = (dy/d)*Math.min(d,max)/max
    stickRef.current = { active:true, dx:nx, dy:ny }
    setKnobPos({ x:nx*38, y:ny*38 })
  }, [])

  const DLABEL = { easy:'🟢 Mudah', medium:'🟡 Sedang', hard:'🔴 Sulit' }

  return (
    <>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS_SW} color="#4ECDC4" onClose={()=>{ setShowTutorial(false); localStorage.setItem('bp_tut_slither-worm','1') }} />}
      {showConfetti && <Confetti active={showConfetti} onDone={()=>setShowConfetti(false)} />}

    <div style={{ width:'100%', height: typeof CSS !== 'undefined' && CSS.supports('height','100dvh') ? '100dvh' : '100vh', background:'#07071a', position:'relative', overflow:'hidden', userSelect:'none' }}>
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', touchAction:'none' }} />

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
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', justifyContent:'center', maxWidth:360 }}>
            {BOT_SKINS.slice(0, Math.min(cfg.bots, 8)).map(b => (
              <span key={b.name} style={{ background:`${b.glow}18`, border:`1.5px solid ${b.glow}44`, color:b.glow, borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, fontFamily:"'Fredoka One',cursive" }}>
                🐍 {b.name}
              </span>
            ))}
            {cfg.bots > 8 && (
              <span style={{ background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.4)', borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, fontFamily:"'Fredoka One',cursive" }}>
                +{cfg.bots - 8} lagi
              </span>
            )}
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
          <p style={{ color:'rgba(255,255,255,0.35)', marginBottom:24, fontSize:13 }}>
            {deathCause === 'bot' ? 'Cacingmu menabrak tubuh bot musuh!' : 'Cacingmu menabrak tembok arena!'}
          </p>

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
            style={{ width:130, height:130, borderRadius:'50%', background:'rgba(78,205,196,0.06)', border:'2.5px solid rgba(78,205,196,0.25)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'grab', touchAction:'none', position:'relative' }}
          >
            <div style={{ position:'absolute', width:'100%', height:1, background:'rgba(78,205,196,0.1)' }} />
            <div style={{ position:'absolute', width:1, height:'100%', background:'rgba(78,205,196,0.1)' }} />
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(78,205,196,0.45)', border:'2.5px solid rgba(78,205,196,0.85)', boxShadow:'0 0 18px rgba(78,205,196,0.5)', transform:`translate(${knobPos.x}px,${knobPos.y}px)`, transition:stickRef.current.active?'none':'transform 0.15s', position:'relative', zIndex:1 }} />
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
            style={{ width:86, height:86, borderRadius:'50%', background:boosting?'rgba(255,107,107,0.28)':'rgba(255,107,107,0.08)', border:`2.5px solid rgba(255,107,107,${boosting?0.85:0.35})`, color:'#ff6b6b', fontSize:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', touchAction:'none', boxShadow:boosting?'0 0 30px rgba(255,107,107,0.55)':'none', transition:'all 0.1s', transform:boosting?'scale(0.92)':'scale(1)' }}
          >⚡</button>
          <div style={{ textAlign:'center', marginTop:6, fontSize:10, color:'rgba(255,255,255,0.2)', fontWeight:700, letterSpacing:'1px' }}>BOOST</div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
    </>
  )
}
