import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS = [
  { emoji:'🧱', title:'Brick Breaker', desc:'Hancurkan semua batu bata dengan bola pantul! Gerakkan paddle untuk memantulkan bola.', tip:'Jangan biarkan bola jatuh ke bawah!' },
  { emoji:'🕹️', title:'Kontrol', desc:'Geser paddle kiri-kanan untuk memantulkan bola. Desktop: panah / mouse. Mobile: sentuh & geser.', tip:'Posisi tumbukan pada paddle menentukan arah pantul!' },
  { emoji:'💎', title:'Power-Up', desc:'Hancurkan bata untuk mendapatkan power-up! 🔥 Fireball, 📏 Paddle Lebar, ⚡ Multi-Ball, ❤️ Nyawa, 🧲 Magnet.', tip:'Boss muncul tiap 5 level — tembak sampai HP habis!' },
  { emoji:'⭐', title:'Scoring', desc:'Semakin tinggi level, semakin banyak poin. Combo pecahkan bata berturut-turut untuk bonus!', tip:'Bata emas bernilai 3× lipat! Bata baja butuh 2× hit.' },
]

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

const CFG = {
  easy:   { ballSpeed: 4, paddleW: 100, lives: 5, maxLevel: 10, brickRows: 4, brickCols: 7,  bossHP: 15, scoreBase: 200 },
  medium: { ballSpeed: 5, paddleW: 85,  lives: 4, maxLevel: 15, brickRows: 5, brickCols: 8,  bossHP: 25, scoreBase: 400 },
  hard:   { ballSpeed: 6, paddleW: 70,  lives: 3, maxLevel: 20, brickRows: 6, brickCols: 9,  bossHP: 40, scoreBase: 700 },
}

const BRICK_COLORS = [
  '#FF6B6B', '#FDCB6E', '#00B894', '#A29BFE', '#FD79A8',
  '#00CEC9', '#E17055', '#6C5CE7', '#55EFC4', '#FF7675',
]

const POWERUP_TYPES = [
  { id: 'fireball', color: '#FF4500', emoji: '🔥', duration: 8000 },
  { id: 'wide',     color: '#00CEC9', emoji: '📏', duration: 10000 },
  { id: 'multi',    color: '#A29BFE', emoji: '⚡', duration: 0 },
  { id: 'life',     color: '#FF6B6B', emoji: '❤️', duration: 0 },
  { id: 'magnet',   color: '#FDCB6E', emoji: '🧲', duration: 8000 },
]

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ─── roundRect polyfill ─────────────────────────────────────────────────────
function drawRoundRect(ctx, x, y, w, h, radius) {
  const r = typeof radius === 'number' ? radius : (Array.isArray(radius) ? radius[0] : 0)
  if (r <= 0) { ctx.rect(x, y, w, h); return }
  const rr = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export default function BrickBreaker({ onBack, game, difficulty }) {
  const canvasRef = useRef(null)
  const gameRef   = useRef(null)
  const animRef   = useRef(null)
  const inputRef  = useRef({ touchActive: false, touchX: null, mouseX: null })
  const phaseRef  = useRef('idle')
  const { play }  = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const cfg = CFG[difficulty.id]

  const [phase, _setPhase]             = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_brick-breaker'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [score, setScore]               = useState(0)
  const [lives, setLives]               = useState(cfg.lives)
  const [level, setLevel]               = useState(1)
  const [combo, setCombo]               = useState(0)
  const [bossHP, setBossHP]             = useState(0)
  const [bossMaxHP, setBossMaxHP]       = useState(0)
  const [rzKey, setRzKey]               = useState(0)

  const setPhase = (p) => { phaseRef.current = p; _setPhase(p) }

  // Resize handler
  useEffect(() => {
    let t = null
    const onRz = () => { clearTimeout(t); t = setTimeout(() => setRzKey(k => k + 1), 250) }
    window.addEventListener('resize', onRz)
    const onOr = () => setTimeout(onRz, 200)
    window.addEventListener('orientationchange', onOr)
    return () => { clearTimeout(t); window.removeEventListener('resize', onRz); window.removeEventListener('orientationchange', onOr) }
  }, [])

  // ── Generate bricks for a level ──
  function generateBricks(W, H, lvl) {
    const rows = Math.min(cfg.brickRows + Math.floor(lvl / 3), 8)
    const cols = Math.min(cfg.brickCols + Math.floor(lvl / 4), 11)
    const brickW = (W - 20) / cols - 4
    const brickH = 18
    const bricks = []
    const startY = 50

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isGold = Math.random() < 0.08 + lvl * 0.005
        const isSteel = Math.random() < 0.05 + lvl * 0.01 && !isGold
        bricks.push({
          x: 12 + c * (brickW + 4),
          y: startY + r * (brickH + 4),
          w: brickW,
          h: brickH,
          color: isGold ? '#FFD700' : isSteel ? '#95A5A6' : BRICK_COLORS[(r + lvl) % BRICK_COLORS.length],
          hp: isSteel ? 2 : 1,
          maxHp: isSteel ? 2 : 1,
          gold: isGold,
          steel: isSteel,
          points: isGold ? 30 : isSteel ? 20 : 10,
          alive: true,
          shakeT: 0,
          breakAnimation: 0,
        })
      }
    }
    return bricks
  }

  // ── Generate boss ──
  function generateBoss(W, lvl) {
    const hp = cfg.bossHP + Math.floor(lvl / 5) * 10
    return {
      x: W / 2 - 60,
      y: 30,
      w: 120,
      h: 40,
      hp,
      maxHP: hp,
      color: '#FF4757',
      dir: 1,
      speed: 1 + lvl * 0.1,
      alive: true,
      shootTimer: 0,
      projectiles: [],
    }
  }

  // ── Init game state ──
  function initGame(W, H, lvl = 1) {
    const isBoss = lvl % 5 === 0
    const paddleW = cfg.paddleW
    const g = {
      W, H,
      paddle: { x: W / 2 - paddleW / 2, y: H - 40, w: paddleW, h: 12, baseW: paddleW },
      balls: [{
        x: W / 2, y: H - 55,
        dx: cfg.ballSpeed * (Math.random() > 0.5 ? 1 : -1) * 0.7,
        dy: -cfg.ballSpeed,
        r: 7,
        fireball: false,
        stuck: true,
      }],
      bricks: isBoss ? [] : generateBricks(W, H, lvl),
      boss: isBoss ? generateBoss(W, lvl) : null,
      powerups: [],
      particles: [],
      effects: { wide: 0, fireball: 0, magnet: 0 },
      score: gameRef.current ? gameRef.current.score : 0,
      lives: gameRef.current ? gameRef.current.lives : cfg.lives,
      level: lvl,
      combo: 0,
      comboTimer: 0,
      stars: [],
    }
    return g
  }

  // ── Canvas setup ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = Math.floor(rect.width) || window.innerWidth
    const H = Math.floor(rect.height) || window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    gameRef.current = initGame(W, H, 1)
    setScore(0)
    setLives(cfg.lives)
    setLevel(1)
    setCombo(0)

    // ── Input handlers ──
    const onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect()
      inputRef.current.mouseX = e.clientX - r.left
    }
    const onTouchStart = (e) => {
      e.preventDefault()
      const t = e.touches[0]
      const r = canvas.getBoundingClientRect()
      inputRef.current.touchActive = true
      inputRef.current.touchX = t.clientX - r.left
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      const t = e.touches[0]
      const r = canvas.getBoundingClientRect()
      inputRef.current.touchX = t.clientX - r.left
    }
    const onTouchEnd = () => {
      inputRef.current.touchActive = false
    }
    const onClick = () => {
      const g = gameRef.current
      if (!g) return
      if (phaseRef.current === 'idle') {
        setPhase('playing')
        g.balls.forEach(b => { b.stuck = false })
      }
      // Release stuck balls (magnet)
      g.balls.forEach(b => { if (b.stuck) b.stuck = false })
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('click', onClick)

    // ── Game loop ──
    let lastTime = 0
    function loop(timestamp) {
      const dt = Math.min((timestamp - lastTime) / 16.667, 2)
      lastTime = timestamp

      const g = gameRef.current
      if (!g) { animRef.current = requestAnimationFrame(loop); return }
      const p = phaseRef.current

      // Move paddle
      let targetX = null
      if (inputRef.current.touchActive && inputRef.current.touchX !== null) {
        targetX = inputRef.current.touchX
      } else if (inputRef.current.mouseX !== null) {
        targetX = inputRef.current.mouseX
      }
      if (targetX !== null) {
        const pw = g.effects.wide > 0 ? g.paddle.baseW * 1.5 : g.paddle.baseW
        g.paddle.w = pw
        g.paddle.x = clamp(targetX - pw / 2, 0, W - pw)
      }

      if (p !== 'playing') {
        draw(ctx, g, W, H)
        animRef.current = requestAnimationFrame(loop)
        return
      }

      // Update effects timers
      const now = Date.now()
      for (const key of ['wide', 'fireball', 'magnet']) {
        if (g.effects[key] > 0 && now > g.effects[key]) {
          g.effects[key] = 0
        }
      }

      // Update balls
      for (let bi = g.balls.length - 1; bi >= 0; bi--) {
        const ball = g.balls[bi]
        if (ball.stuck) {
          ball.x = g.paddle.x + g.paddle.w / 2
          ball.y = g.paddle.y - ball.r - 2
          continue
        }

        ball.fireball = g.effects.fireball > 0

        ball.x += ball.dx * dt
        ball.y += ball.dy * dt

        // Wall bounce
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx = -Math.abs(ball.dx); }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); }

        // Paddle bounce
        if (ball.dy > 0 &&
            ball.y + ball.r >= g.paddle.y &&
            ball.y + ball.r <= g.paddle.y + g.paddle.h + 6 &&
            ball.x >= g.paddle.x - 4 &&
            ball.x <= g.paddle.x + g.paddle.w + 4) {
          const hitPos = (ball.x - g.paddle.x) / g.paddle.w
          const angle = (hitPos - 0.5) * Math.PI * 0.7
          const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
          ball.dx = speed * Math.sin(angle)
          ball.dy = -Math.abs(speed * Math.cos(angle))
          ball.y = g.paddle.y - ball.r - 1

          if (g.effects.magnet > 0) {
            ball.stuck = true
          }
          g.combo = 0
          try { play('flip') } catch(e) {}
        }

        // Brick collision
        for (const brick of g.bricks) {
          if (!brick.alive && brick.breakAnimation <= 0) continue
          if (ball.x + ball.r > brick.x && ball.x - ball.r < brick.x + brick.w &&
              ball.y + ball.r > brick.y && ball.y - ball.r < brick.y + brick.h) {
            brick.hp--
            if (brick.hp <= 0) {
              brick.alive = false
              brick.breakAnimation = 15
              g.combo++
              const comboBonus = Math.min(g.combo, 10)
              const pts = brick.points * (1 + comboBonus * 0.1) * (1 + (g.level - 1) * 0.1)
              g.score += Math.round(pts)

              // Spawn particles
              for (let i = 0; i < 6; i++) {
                g.particles.push({
                  x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
                  dx: rand(-3, 3), dy: rand(-3, 1),
                  life: 30, color: brick.color, r: rand(2, 5),
                })
              }

              // Maybe spawn powerup (12% chance)
              if (Math.random() < 0.12) {
                const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
                g.powerups.push({
                  ...type, x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
                  dy: 1.5, r: 10,
                })
              }
            } else {
              brick.color = '#BDC3C7' // steel hit visual
              brick.shakeT = 10 // shake animation
              // Spark particles on non-lethal hit
              for (let i = 0; i < 4; i++) {
                g.particles.push({
                  x: brick.x + brick.w / 2, y: brick.y + brick.h / 2,
                  dx: rand(-2, 2), dy: rand(-2, 1),
                  life: 15, color: '#fff', r: rand(1, 3),
                })
              }
            }

            if (!ball.fireball) {
              // Determine bounce direction
              const overlapL = (ball.x + ball.r) - brick.x
              const overlapR = (brick.x + brick.w) - (ball.x - ball.r)
              const overlapT = (ball.y + ball.r) - brick.y
              const overlapB = (brick.y + brick.h) - (ball.y - ball.r)
              const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB)
              if (minOverlap === overlapT || minOverlap === overlapB) ball.dy = -ball.dy
              else ball.dx = -ball.dx
            }
            try { play('match') } catch(e) {}
            break
          }
        }

        // Boss collision
        if (g.boss && g.boss.alive) {
          const b = g.boss
          if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
              ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
            b.hp--
            g.score += 5
            ball.dy = Math.abs(ball.dy)
            for (let i = 0; i < 4; i++) {
              g.particles.push({
                x: ball.x, y: ball.y,
                dx: rand(-2, 2), dy: rand(-2, 2),
                life: 20, color: '#FF4757', r: rand(2, 4),
              })
            }
            try { play('match') } catch(e) {}
            if (b.hp <= 0) {
              b.alive = false
              g.score += 200 + g.level * 50
              for (let i = 0; i < 20; i++) {
                g.particles.push({
                  x: b.x + b.w / 2, y: b.y + b.h / 2,
                  dx: rand(-5, 5), dy: rand(-5, 3),
                  life: 50, color: ['#FF4757','#FFD700','#FF6B6B','#FDCB6E'][i%4], r: rand(3, 7),
                })
              }
            }
          }
        }

        // Ball fell below
        if (ball.y - ball.r > H) {
          g.balls.splice(bi, 1)
        }
      }

      // Boss movement & shooting
      if (g.boss && g.boss.alive) {
        const b = g.boss
        b.x += b.dir * b.speed * dt
        if (b.x <= 10 || b.x + b.w >= W - 10) b.dir *= -1
        b.shootTimer++
        if (b.shootTimer > 90 - g.level * 2) {
          b.shootTimer = 0
          b.projectiles.push({
            x: b.x + b.w / 2, y: b.y + b.h,
            dy: 3 + g.level * 0.15, r: 5, color: '#FF4757',
          })
        }
        // Update projectiles
        for (let i = b.projectiles.length - 1; i >= 0; i--) {
          const proj = b.projectiles[i]
          proj.y += proj.dy * dt
          // Hit paddle = lose life
          if (proj.y + proj.r >= g.paddle.y && proj.y - proj.r <= g.paddle.y + g.paddle.h &&
              proj.x >= g.paddle.x && proj.x <= g.paddle.x + g.paddle.w) {
            b.projectiles.splice(i, 1)
            g.lives--
            try { play('mismatch') } catch(e) {}
            continue
          }
          if (proj.y > H + 20) b.projectiles.splice(i, 1)
        }
      }

      // Powerup movement & collection
      for (let i = g.powerups.length - 1; i >= 0; i--) {
        const pu = g.powerups[i]
        pu.y += pu.dy * dt
        // Collect
        if (pu.y + pu.r >= g.paddle.y && pu.y - pu.r <= g.paddle.y + g.paddle.h &&
            pu.x >= g.paddle.x && pu.x <= g.paddle.x + g.paddle.w) {
          g.powerups.splice(i, 1)
          applyPowerup(g, pu, W, H)
          try { play('win') } catch(e) {}
          continue
        }
        if (pu.y > H + 20) g.powerups.splice(i, 1)
      }

      // Particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const pt = g.particles[i]
        pt.x += pt.dx * dt
        pt.y += pt.dy * dt
        pt.dy += 0.1
        pt.life--
        if (pt.life <= 0) g.particles.splice(i, 1)
      }

      // Combo timer
      g.comboTimer++
      if (g.comboTimer > 120) g.combo = 0

      // Brick shake decay
      for (const brick of g.bricks) {
        if (brick.shakeT > 0) brick.shakeT -= dt
        if (brick.breakAnimation > 0) brick.breakAnimation -= dt
      }

      // All balls lost
      if (g.balls.length === 0) {
        g.lives--
        if (g.lives <= 0) {
          // Game Over
          setPhase('lost')
          setScore(g.score)
          setLives(0)
          try { play('mismatch') } catch(e) {}
          const coinAmt = Math.max(5, Math.floor(g.score / 100))
          earnCoins(coinAmt, `Brick Breaker Lv${g.level} (${difficulty.id})`)
          reportGameResult({
            gameId: 'brick-breaker', difficultyId: difficulty.id,
            won: false, score: g.score, stars: 0, timeSec: 0,
          })
        } else {
          // Respawn ball
          g.balls.push({
            x: g.paddle.x + g.paddle.w / 2, y: g.paddle.y - 10,
            dx: cfg.ballSpeed * (Math.random() > 0.5 ? 1 : -1) * 0.7,
            dy: -cfg.ballSpeed,
            r: 7, fireball: false, stuck: true,
          })
          setLives(g.lives)
          try { play('mismatch') } catch(e) {}
        }
      }

      // Level complete
      const bricksCleared = g.bricks.length > 0 && g.bricks.every(b => !b.alive)
      const bossDefeated = g.boss && !g.boss.alive
      if (bricksCleared || bossDefeated) {
        const nextLvl = g.level + 1
        if (nextLvl > cfg.maxLevel) {
          // WIN!
          setPhase('won')
          setScore(g.score)
          setShowConfetti(true)
          try { play('win') } catch(e) {}
          let stars = g.lives >= cfg.lives ? 3 : g.lives >= cfg.lives - 1 ? 2 : 1
          const coinReward = { easy: 30, medium: 50, hard: 80 }
          let coinAmt = (coinReward[difficulty.id] || 30) + Math.floor(g.score / 200)
          if (stars === 3) coinAmt += 30
          earnCoins(coinAmt, `Menang Brick Breaker (${difficulty.id})`)
          reportGameResult({
            gameId: 'brick-breaker', difficultyId: difficulty.id,
            won: true, score: g.score, stars, timeSec: 0,
          })
          // Save best
          const bestKey = `brick-breaker-best-${difficulty.id}`
          const prev = parseInt(localStorage.getItem(bestKey) || '0')
          if (g.score > prev) localStorage.setItem(bestKey, g.score)
        } else {
          // Next level
          setLevel(nextLvl)
          setScore(g.score)
          const ng = initGame(W, H, nextLvl)
          ng.score = g.score
          ng.lives = g.lives
          gameRef.current = ng
          // Auto start
          ng.balls.forEach(b => { b.stuck = false })
        }
      }

      // Update UI
      setScore(g.score)
      setCombo(g.combo)
      if (g.boss) {
        setBossHP(g.boss.hp)
        setBossMaxHP(g.boss.maxHP)
      } else {
        setBossHP(0)
      }

      draw(ctx, g, W, H)
      animRef.current = requestAnimationFrame(loop)
    }

    function applyPowerup(g, pu, W, H) {
      switch (pu.id) {
        case 'fireball':
          g.effects.fireball = Date.now() + pu.duration
          break
        case 'wide':
          g.effects.wide = Date.now() + pu.duration
          break
        case 'magnet':
          g.effects.magnet = Date.now() + pu.duration
          break
        case 'multi':
          // Add 2 extra balls
          const mainBall = g.balls[0]
          if (mainBall) {
            for (let i = 0; i < 2; i++) {
              g.balls.push({
                x: mainBall.x, y: mainBall.y,
                dx: cfg.ballSpeed * Math.cos(Math.PI * 0.3 * (i === 0 ? 1 : -1)),
                dy: -cfg.ballSpeed * Math.abs(Math.sin(Math.PI * 0.3)),
                r: 7, fireball: mainBall.fireball, stuck: false,
              })
            }
          }
          break
        case 'life':
          g.lives = Math.min(g.lives + 1, cfg.lives + 2)
          setLives(g.lives)
          break
      }
    }

    function draw(ctx, g, W, H) {
      // Background
      ctx.fillStyle = '#0a0a2e'
      ctx.fillRect(0, 0, W, H)

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(162,155,254,0.04)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Bricks
      for (const brick of g.bricks) {
        if (!brick.alive && brick.breakAnimation <= 0) continue
        const shakeOff = brick.shakeT > 0 ? (Math.sin(brick.shakeT * 8) * brick.shakeT * 0.4) : 0
        const bx = brick.x + shakeOff
        const breakProg = 1 - (brick.breakAnimation / 15)
        const opacity = brick.breakAnimation > 0 ? 1 - breakProg : 1
        ctx.globalAlpha = opacity
        ctx.fillStyle = brick.color
        ctx.shadowColor = brick.color
        ctx.shadowBlur = brick.gold ? 12 : 4
        const r = 4
        ctx.beginPath()
        drawRoundRect(ctx, bx, brick.y, brick.w, brick.h, r)
        ctx.fill()
        ctx.shadowBlur = 0

        if (brick.gold) {
          ctx.fillStyle = 'rgba(255,255,255,0.3)'
          ctx.beginPath()
          drawRoundRect(ctx, bx + 2, brick.y + 2, brick.w - 4, brick.h / 2 - 2, [r, r, 0, 0])
          ctx.fill()
        }
        // Crack lines on damaged steel bricks
        if (brick.steel && brick.hp < brick.maxHp) {
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(bx + brick.w * 0.3, brick.y + 2)
          ctx.lineTo(bx + brick.w * 0.5, brick.y + brick.h * 0.6)
          ctx.lineTo(bx + brick.w * 0.65, brick.y + brick.h - 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(bx + brick.w * 0.5, brick.y + brick.h * 0.6)
          ctx.lineTo(bx + brick.w * 0.75, brick.y + brick.h * 0.4)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        if (brick.steel && brick.hp > 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          drawRoundRect(ctx, bx + 1, brick.y + 1, brick.w - 2, brick.h - 2, r)
          ctx.stroke()
        }
      }

      // Boss
      if (g.boss && g.boss.alive) {
        const b = g.boss
        const hpRatio = b.hp / b.maxHP
        ctx.fillStyle = hpRatio > 0.5 ? '#FF4757' : hpRatio > 0.25 ? '#FF6348' : '#EA2027'
        ctx.shadowColor = '#FF4757'
        ctx.shadowBlur = 15 + Math.sin(Date.now() / 200) * 5
        ctx.beginPath()
        drawRoundRect(ctx, b.x, b.y, b.w, b.h, 8)
        ctx.fill()
        ctx.shadowBlur = 0

        // Boss face
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('👾', b.x + b.w / 2, b.y + b.h / 2 + 7)

        // HP bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(b.x, b.y - 10, b.w, 6)
        ctx.fillStyle = hpRatio > 0.5 ? '#00B894' : hpRatio > 0.25 ? '#FDCB6E' : '#FF4757'
        ctx.fillRect(b.x, b.y - 10, b.w * hpRatio, 6)

        // Boss projectiles
        for (const proj of b.projectiles) {
          ctx.fillStyle = proj.color
          ctx.shadowColor = proj.color
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(proj.x, proj.y, proj.r, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // Powerups
      for (const pu of g.powerups) {
        ctx.fillStyle = pu.color
        ctx.shadowColor = pu.color
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.font = '12px serif'
        ctx.textAlign = 'center'
        ctx.fillText(pu.emoji, pu.x, pu.y + 4)
      }

      // Paddle
      const pw = g.paddle.w
      const px = g.paddle.x
      const py = g.paddle.y
      const grad = ctx.createLinearGradient(px, py, px, py + g.paddle.h)
      if (g.effects.wide > 0) {
        grad.addColorStop(0, '#00CEC9')
        grad.addColorStop(1, '#00B894')
      } else if (g.effects.magnet > 0) {
        grad.addColorStop(0, '#FDCB6E')
        grad.addColorStop(1, '#F39C12')
      } else {
        grad.addColorStop(0, '#A29BFE')
        grad.addColorStop(1, '#6C5CE7')
      }
      ctx.fillStyle = grad
      ctx.shadowColor = '#A29BFE'
      ctx.shadowBlur = 10
      ctx.beginPath()
      drawRoundRect(ctx, px, py, pw, g.paddle.h, 6)
      ctx.fill()
      ctx.shadowBlur = 0

      // Balls
      for (const ball of g.balls) {
        ctx.fillStyle = ball.fireball ? '#FF4500' : '#fff'
        ctx.shadowColor = ball.fireball ? '#FF4500' : '#A29BFE'
        ctx.shadowBlur = ball.fireball ? 15 : 8
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        if (ball.fireball) {
          ctx.fillStyle = 'rgba(255,69,0,0.3)'
          ctx.beginPath()
          ctx.arc(ball.x, ball.y, ball.r + 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Particles
      for (const pt of g.particles) {
        ctx.globalAlpha = pt.life / 30
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // HUD
      ctx.fillStyle = '#fff'
      ctx.font = "bold 14px 'Fredoka One', cursive"
      ctx.textAlign = 'left'
      ctx.fillText(`Lv ${g.level}`, 10, H - 10)
      ctx.textAlign = 'right'
      ctx.fillText(`${g.score}`, W - 10, H - 10)

      // Power-up timer bars
      const now = Date.now()
      const activeEffects = []
      if (g.effects.fireball > now) activeEffects.push({ emoji: '🔥', color: '#FF4500', pct: (g.effects.fireball - now) / 8000 })
      if (g.effects.wide > now) activeEffects.push({ emoji: '📏', color: '#00CEC9', pct: (g.effects.wide - now) / 10000 })
      if (g.effects.magnet > now) activeEffects.push({ emoji: '🧲', color: '#FDCB6E', pct: (g.effects.magnet - now) / 8000 })
      if (activeEffects.length > 0) {
        const barW = 60, barH = 6, barY = H - 28
        const startX = (W - activeEffects.length * (barW + 24)) / 2
        for (let i = 0; i < activeEffects.length; i++) {
          const eff = activeEffects[i]
          const x = startX + i * (barW + 24)
          ctx.font = '11px serif'
          ctx.textAlign = 'left'
          ctx.fillText(eff.emoji, x, barY + 5)
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillRect(x + 16, barY, barW, barH)
          ctx.fillStyle = eff.color
          ctx.shadowColor = eff.color
          ctx.shadowBlur = 4
          ctx.fillRect(x + 16, barY, barW * Math.min(eff.pct, 1), barH)
          ctx.shadowBlur = 0
          ctx.fillStyle = '#fff'
        }
      }

      // Idle text
      if (phaseRef.current === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(0, H / 2 - 30, W, 60)
        ctx.fillStyle = '#fff'
        ctx.font = "bold 18px 'Fredoka One', cursive"
        ctx.textAlign = 'center'
        ctx.fillText('TAP UNTUK MULAI', W / 2, H / 2 + 6)
      }
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('click', onClick)
    }
  }, [difficulty.id, rzKey])

  const restart = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
    const W = Math.floor(rect.width) || window.innerWidth
    const H = Math.floor(rect.height) || window.innerHeight
    gameRef.current = initGame(W, H, 1)
    gameRef.current.lives = cfg.lives
    gameRef.current.score = 0
    setPhase('idle')
    setScore(0)
    setLives(cfg.lives)
    setLevel(1)
    setCombo(0)
    setShowConfetti(false)
  }

  // Stars calc
  const getStars = () => {
    if (phase !== 'won') return 0
    const g = gameRef.current
    if (!g) return 1
    return g.lives >= cfg.lives ? 3 : g.lives >= cfg.lives - 1 ? 2 : 1
  }

  const stars = getStars()
  const coinReward = phase === 'won'
    ? ({ easy: 30, medium: 50, hard: 80 }[difficulty.id] || 30) + Math.floor(score / 200) + (stars === 3 ? 30 : 0)
    : Math.max(5, Math.floor(score / 100))

  const DIFF_LABEL = { easy: '🟢 Mudah', medium: '🟡 Sedang', hard: '🔴 Sulit' }

  return (
    <div style={{
      width: '100%', height: typeof CSS !== 'undefined' && CSS.supports('height','100dvh') ? '100dvh' : '100vh',
      background: '#0a0a2e', position: 'relative', overflow: 'hidden', userSelect: 'none',
      fontFamily: "'Fredoka One', cursive",
    }}>
      {showTutorial && (
        <TutorialModal steps={TUTORIAL_STEPS} storageKey="bp_tut_brick-breaker"
          onClose={() => setShowTutorial(false)} />
      )}
      {showConfetti && <Confetti />}

      {/* Top HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', background: 'rgba(0,0,0,0.4)',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer',
        }}>←</button>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: '#fff', fontSize: 13 }}>
          <span>🧱 Lv {level}</span>
          <span>💯 {score.toLocaleString()}</span>
          <span>{'❤️'.repeat(Math.max(0, lives))}</span>
          {combo > 2 && <span style={{ color: '#FDCB6E' }}>🔥 x{combo}</span>}
        </div>
      </div>

      {/* Boss HP bar */}
      {bossHP > 0 && (
        <div style={{
          position: 'absolute', top: 44, left: 20, right: 20, zIndex: 10,
          height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4,
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${(bossHP / bossMaxHP) * 100}%`,
            background: bossHP / bossMaxHP > 0.5 ? '#00B894' : bossHP / bossMaxHP > 0.25 ? '#FDCB6E' : '#FF4757',
            transition: 'width 0.2s',
          }} />
          <div style={{
            position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
            color: '#fff', fontSize: 10, fontWeight: 800,
          }}>
            👾 BOSS — HP {bossHP}/{bossMaxHP}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
      </div>

      {/* Win/Lose modals */}
      {(phase === 'won' || phase === 'lost') && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
          animation: 'bbFadeIn 0.3s ease',
        }}>
          <div style={{
            background: '#1a1a3e', borderRadius: 24, padding: '32px 28px', textAlign: 'center',
            maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'bbPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: 'linear-gradient(90deg, #FF6B6B, #A29BFE, #4ECDC4)' }} />
            <div style={{ fontSize: 52, marginBottom: 8 }}>{phase === 'won' ? '🏆' : '💥'}</div>
            <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 4 }}>
              {phase === 'won' ? 'Level Clear!' : 'Game Over'}
            </h2>
            <p style={{ color: '#A29BFE', fontSize: 13, marginBottom: 12 }}>
              {phase === 'won' ? `${cfg.maxLevel} level terselesaikan!` : `Sampai Level ${level}`}
            </p>
            <span style={{ display: 'inline-block', background: 'rgba(162,155,254,0.15)', color: '#A29BFE',
              padding: '4px 14px', borderRadius: 100, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              {DIFF_LABEL[difficulty.id]}
            </span>
            {phase === 'won' && stars > 0 && (
              <div style={{ fontSize: 30, marginBottom: 10, letterSpacing: 6 }}>
                {[0,1,2].map(i => <span key={i} style={{ opacity: i < stars ? 1 : 0.25, filter: i < stars ? 'none' : 'grayscale(1)' }}>{i < stars ? '⭐' : '☆'}</span>)}
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(253,203,110,0.12)', border: '1.5px solid #FDCB6E44',
              borderRadius: 100, padding: '6px 18px', marginBottom: 16 }}>
              <span>🪙</span>
              <span style={{ color: '#F9A825', fontSize: 16, fontWeight: 800 }}>+{coinReward}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'rgba(162,155,254,0.1)', borderRadius: 14, padding: '10px 8px' }}>
                <div style={{ fontSize: 22, color: '#A29BFE' }}>{score.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Skor</div>
              </div>
              <div style={{ background: 'rgba(0,184,148,0.1)', borderRadius: 14, padding: '10px 8px' }}>
                <div style={{ fontSize: 22, color: '#00B894' }}>Lv {level}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Level</div>
              </div>
              <div style={{ background: 'rgba(255,107,107,0.1)', borderRadius: 14, padding: '10px 8px' }}>
                <div style={{ fontSize: 22, color: '#FF6B6B' }}>{lives}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Nyawa</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={restart} style={{
                flex: 1, background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: 100,
                padding: '12px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}>🔄 Main Lagi</button>
              <button onClick={onBack} style={{
                flex: 1, background: '#1e2a4a', color: '#aaa', border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: 100, padding: '12px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}>🎯 Ganti Level</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bbFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes bbPopIn   { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}
