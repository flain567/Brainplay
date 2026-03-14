import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS_SS = [
  { emoji:'🚀', title:'Space Shooter', desc:'Kendalikan pesawatmu dan tembak semua alien yang datang! Hindari tembakan musuh.', tip:'Kumpulkan power-up untuk senjata lebih kuat!' },
  { emoji:'🕹️', title:'Kontrol', desc:'Geser kiri-kanan untuk bergerak. Tembakan otomatis! Di desktop gunakan panah / A-D.', tip:'Tahan posisi untuk fokus menembak satu area.' },
  { emoji:'⭐', title:'Power-Up', desc:'Ambil bintang kuning untuk upgrade senjata. Ambil hati merah untuk nyawa tambahan.', tip:'Power-up muncul dari musuh yang dihancurkan.' },
]

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

// ─── Config per difficulty ──────────────────────────────────────────────────
const CFG = {
  easy:   { spawnRate:90, enemySpeed:1.2, enemyHP:1, bossHP:12, bulletSpeed:6, playerSpeed:5, lives:5, scoreGoal:300 },
  medium: { spawnRate:65, enemySpeed:1.8, enemyHP:2, bossHP:20, bulletSpeed:7, playerSpeed:5.5, lives:4, scoreGoal:500 },
  hard:   { spawnRate:45, enemySpeed:2.5, enemyHP:3, bossHP:30, bulletSpeed:8, playerSpeed:6, lives:3, scoreGoal:800 },
}

const ENEMY_TYPES = [
  { w:30, h:30, color:'#FF6B6B', points:10, shootRate:0 },
  { w:36, h:36, color:'#A29BFE', points:20, shootRate:200 },
  { w:42, h:42, color:'#FD79A8', points:30, shootRate:140 },
]

const POWERUP_TYPES = [
  { id:'weapon', color:'#FDCB6E', emoji:'⭐', effect:'Upgrade senjata' },
  { id:'health', color:'#FF6B6B', emoji:'❤️', effect:'+1 nyawa' },
  { id:'shield', color:'#74B9FF', emoji:'🛡️', effect:'Kebal 3 detik' },
]

const rand = (a, b) => a + Math.random() * (b - a)

// ─── Star background generator ──────────────────────────────────────────────
function makeStars(count, W, H) {
  return Array.from({ length: count }, () => ({
    x: rand(0, W), y: rand(0, H),
    r: rand(0.5, 2), speed: rand(0.3, 1.5),
    alpha: rand(0.3, 0.9),
  }))
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function SpaceShooter({ onBack, game, difficulty }) {
  const canvasRef = useRef(null)
  const gameRef   = useRef(null)
  const animRef   = useRef(null)
  const inputRef  = useRef({ left:false, right:false, touchX:null })
  const { play }  = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const cfg = CFG[difficulty.id]

  const [phase, setPhase]             = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-space-shooter'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [score, setScore]             = useState(0)
  const [lives, setLives]             = useState(cfg.lives)
  const [weaponLv, setWeaponLv]       = useState(1)
  const [bestScore, setBestScore]     = useState(
    () => parseInt(localStorage.getItem(`space-best-${difficulty.id}`) || '0')
  )

  // ── Init game state ──
  function initGame(canvas) {
    const W = canvas.width, H = canvas.height
    return {
      W, H,
      player: { x: W/2, y: H-70, w:40, h:40, weaponLv:1, shieldTimer:0 },
      bullets: [],
      enemies: [],
      enemyBullets: [],
      powerups: [],
      particles: [],
      stars: makeStars(120, W, H),
      score: 0,
      lives: cfg.lives,
      tick: 0,
      spawnCounter: 0,
      bossSpawned: false,
      boss: null,
      wave: 1,
      shakeTimer: 0,
    }
  }

  function startGame() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    gameRef.current = initGame(canvas)
    setScore(0); setLives(cfg.lives); setWeaponLv(1)
    setPhase('playing')
  }

  // ── Resize ──
  useEffect(() => {
    const fn = () => {
      const c = canvasRef.current
      if (!c) return
      c.width = c.offsetWidth; c.height = c.offsetHeight
    }
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // ── Game loop ──
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function spawnEnemy(g) {
      const typeIdx = g.wave >= 3 ? Math.floor(rand(0, Math.min(g.wave, ENEMY_TYPES.length))) : Math.floor(rand(0, Math.min(2, ENEMY_TYPES.length)))
      const et = ENEMY_TYPES[typeIdx]
      g.enemies.push({
        x: rand(et.w, g.W - et.w), y: -et.h,
        w: et.w, h: et.h, color: et.color,
        hp: cfg.enemyHP + Math.floor(g.wave / 3),
        maxHp: cfg.enemyHP + Math.floor(g.wave / 3),
        points: et.points + g.wave * 2,
        shootRate: et.shootRate, shootTimer: Math.floor(rand(60, 180)),
        speed: cfg.enemySpeed + rand(-0.3, 0.3) + g.wave * 0.08,
        wobble: rand(0, Math.PI * 2), wobbleAmp: rand(0.3, 1.2),
      })
    }

    function spawnBoss(g) {
      g.boss = {
        x: g.W / 2, y: -80, targetY: 80,
        w: 80, h: 60, color: '#FF4757',
        hp: cfg.bossHP + g.wave * 5,
        maxHp: cfg.bossHP + g.wave * 5,
        points: 200 + g.wave * 50,
        shootTimer: 0, phase: 0, entered: false,
      }
      g.bossSpawned = true
    }

    function fireBullet(g) {
      const p = g.player
      const lv = p.weaponLv
      const bw = 4, bh = 14
      if (lv >= 3) {
        g.bullets.push({ x:p.x-10, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
        g.bullets.push({ x:p.x,    y:p.y-p.h/2-6, w:bw, h:bh, dmg:1 })
        g.bullets.push({ x:p.x+10, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
      } else if (lv >= 2) {
        g.bullets.push({ x:p.x-7, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
        g.bullets.push({ x:p.x+7, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
      } else {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
      }
    }

    function spawnParticles(g, x, y, color, count) {
      for (let i = 0; i < count; i++) {
        g.particles.push({
          x, y, vx: rand(-3, 3), vy: rand(-3, 3),
          r: rand(1.5, 4), color, life: rand(15, 35), maxLife: 35,
        })
      }
    }

    function spawnPowerup(g, x, y) {
      if (Math.random() > 0.25) return
      const type = POWERUP_TYPES[Math.floor(rand(0, POWERUP_TYPES.length))]
      g.powerups.push({ x, y, type, vy: 1.5, r: 14, pulse: 0 })
    }

    function hitTest(a, bx, by, bw, bh) {
      return a.x - a.w/2 < bx + bw/2 && a.x + a.w/2 > bx - bw/2 &&
             a.y - a.h/2 < by + bh/2 && a.y + a.h/2 > by - bh/2
    }

    function update() {
      const g = gameRef.current
      if (!g) return
      const p = g.player

      // Input
      const inp = inputRef.current
      if (inp.touchX !== null) {
        const dx = inp.touchX - p.x
        p.x += Math.sign(dx) * Math.min(Math.abs(dx), cfg.playerSpeed + 2)
      } else {
        if (inp.left)  p.x -= cfg.playerSpeed
        if (inp.right) p.x += cfg.playerSpeed
      }
      p.x = Math.max(p.w/2+4, Math.min(g.W - p.w/2-4, p.x))

      // Shield timer
      if (p.shieldTimer > 0) p.shieldTimer--

      // Auto-fire
      if (g.tick % 8 === 0) fireBullet(g)

      // Move bullets
      g.bullets = g.bullets.filter(b => {
        b.y -= cfg.bulletSpeed
        return b.y > -20
      })

      // Spawn enemies
      g.spawnCounter++
      if (g.spawnCounter >= cfg.spawnRate && !g.boss) {
        g.spawnCounter = 0
        spawnEnemy(g)
      }

      // Boss spawn every 500 points of score (within wave)
      if (!g.bossSpawned && g.score > 0 && g.score % 300 < 30 && g.score >= 250 && !g.boss) {
        spawnBoss(g)
      }

      // Move enemies
      g.enemies = g.enemies.filter(en => {
        en.y += en.speed
        en.x += Math.sin(en.wobble) * en.wobbleAmp
        en.wobble += 0.04

        // Enemy shoot
        if (en.shootRate > 0) {
          en.shootTimer--
          if (en.shootTimer <= 0) {
            en.shootTimer = en.shootRate + Math.floor(rand(-20, 20))
            g.enemyBullets.push({ x:en.x, y:en.y+en.h/2, w:5, h:10, vy:3+g.wave*0.15 })
          }
        }

        // Off screen
        if (en.y > g.H + 50) return false

        // Hit by player bullet
        for (let i = g.bullets.length - 1; i >= 0; i--) {
          const b = g.bullets[i]
          if (Math.abs(b.x - en.x) < en.w/2+b.w/2 && Math.abs(b.y - en.y) < en.h/2+b.h/2) {
            g.bullets.splice(i, 1)
            en.hp -= b.dmg
            spawnParticles(g, b.x, b.y, en.color, 3)
            if (en.hp <= 0) {
              g.score += en.points
              setScore(g.score)
              spawnParticles(g, en.x, en.y, en.color, 12)
              spawnPowerup(g, en.x, en.y)
              play('eat')
              return false
            }
            break
          }
        }

        // Collision with player
        if (p.shieldTimer <= 0 && hitTest(en, p.x, p.y, p.w, p.h)) {
          g.lives--; setLives(g.lives)
          g.shakeTimer = 12
          spawnParticles(g, p.x, p.y, '#FF6B6B', 15)
          play('mismatch')
          if (g.lives <= 0) { endGame(g, false); return false }
          p.shieldTimer = 90
          return false
        }

        return true
      })

      // Boss logic
      if (g.boss) {
        const boss = g.boss
        if (!boss.entered) {
          boss.y += 1.5
          if (boss.y >= boss.targetY) { boss.entered = true }
        } else {
          boss.x += Math.sin(g.tick * 0.02) * 2.5
          boss.shootTimer--
          if (boss.shootTimer <= 0) {
            boss.shootTimer = 30
            boss.phase = (boss.phase + 1) % 3
            const bx = boss.x, by = boss.y + boss.h/2
            if (boss.phase === 0) {
              g.enemyBullets.push({ x:bx, y:by, w:6, h:12, vy:4 })
            } else if (boss.phase === 1) {
              g.enemyBullets.push({ x:bx-20, y:by, w:5, h:10, vy:3.5 })
              g.enemyBullets.push({ x:bx+20, y:by, w:5, h:10, vy:3.5 })
            } else {
              for (let i = -2; i <= 2; i++) {
                g.enemyBullets.push({ x:bx+i*18, y:by, w:5, h:10, vy:3.2 })
              }
            }
          }

          // Hit by bullets
          for (let i = g.bullets.length - 1; i >= 0; i--) {
            const b = g.bullets[i]
            if (Math.abs(b.x - boss.x) < boss.w/2+b.w/2 && Math.abs(b.y - boss.y) < boss.h/2+b.h/2) {
              g.bullets.splice(i, 1)
              boss.hp -= b.dmg
              spawnParticles(g, b.x, b.y, boss.color, 3)
              if (boss.hp <= 0) {
                g.score += boss.points
                setScore(g.score)
                spawnParticles(g, boss.x, boss.y, boss.color, 30)
                spawnPowerup(g, boss.x - 20, boss.y)
                spawnPowerup(g, boss.x + 20, boss.y)
                play('levelUp')
                g.boss = null
                g.bossSpawned = false
                g.wave++
                break
              }
            }
          }

          // Boss collision with player
          if (boss && p.shieldTimer <= 0 && hitTest(boss, p.x, p.y, p.w, p.h)) {
            g.lives--; setLives(g.lives)
            g.shakeTimer = 15
            spawnParticles(g, p.x, p.y, '#FF6B6B', 15)
            play('mismatch')
            if (g.lives <= 0) endGame(g, false)
            p.shieldTimer = 90
          }
        }
      }

      // Enemy bullets
      g.enemyBullets = g.enemyBullets.filter(eb => {
        eb.y += eb.vy
        if (eb.y > g.H + 20) return false
        if (p.shieldTimer <= 0 && Math.abs(eb.x - p.x) < p.w/2+eb.w/2 && Math.abs(eb.y - p.y) < p.h/2+eb.h/2) {
          g.lives--; setLives(g.lives)
          g.shakeTimer = 10
          spawnParticles(g, p.x, p.y, '#FF6B6B', 8)
          play('mismatch')
          if (g.lives <= 0) endGame(g, false)
          p.shieldTimer = 60
          return false
        }
        return true
      })

      // Powerups
      g.powerups = g.powerups.filter(pu => {
        pu.y += pu.vy
        pu.pulse += 0.08
        if (pu.y > g.H + 30) return false
        if (Math.abs(pu.x - p.x) < 24 && Math.abs(pu.y - p.y) < 24) {
          if (pu.type.id === 'weapon') {
            p.weaponLv = Math.min(p.weaponLv + 1, 3)
            setWeaponLv(p.weaponLv)
          } else if (pu.type.id === 'health') {
            g.lives = Math.min(g.lives + 1, cfg.lives + 2)
            setLives(g.lives)
          } else if (pu.type.id === 'shield') {
            p.shieldTimer = 180
          }
          spawnParticles(g, pu.x, pu.y, pu.type.color, 8)
          play('click')
          return false
        }
        return true
      })

      // Particles
      g.particles = g.particles.filter(pt => {
        pt.x += pt.vx; pt.y += pt.vy
        pt.life--
        return pt.life > 0
      })

      // Stars scroll
      g.stars.forEach(s => {
        s.y += s.speed
        if (s.y > g.H) { s.y = 0; s.x = rand(0, g.W) }
      })

      // Win check
      if (g.score >= cfg.scoreGoal && !g.boss) {
        endGame(g, true)
      }

      // Shake decay
      if (g.shakeTimer > 0) g.shakeTimer--
      g.tick++
    }

    function endGame(g, won) {
      const fs = g.score
      if (fs > bestScore) {
        localStorage.setItem(`space-best-${difficulty.id}`, fs)
        setBestScore(fs)
        if (won) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 100) }
      }
      setPhase(won ? 'win' : 'dead')
    }

    function draw() {
      const g = gameRef.current
      if (!g) return
      const W = g.W, H = g.H
      const p = g.player

      // Shake offset
      const sx = g.shakeTimer > 0 ? rand(-3, 3) : 0
      const sy = g.shakeTimer > 0 ? rand(-3, 3) : 0

      ctx.save()
      ctx.translate(sx, sy)

      // Background
      ctx.fillStyle = '#07071a'
      ctx.fillRect(0, 0, W, H)

      // Stars
      g.stars.forEach(s => {
        ctx.globalAlpha = s.alpha
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill()
      })
      ctx.globalAlpha = 1

      // Player
      const px = p.x, py = p.y
      // Ship body
      ctx.fillStyle = '#4ECDC4'
      ctx.beginPath()
      ctx.moveTo(px, py - p.h/2)
      ctx.lineTo(px - p.w/2, py + p.h/2)
      ctx.lineTo(px - p.w/4, py + p.h/3)
      ctx.lineTo(px + p.w/4, py + p.h/3)
      ctx.lineTo(px + p.w/2, py + p.h/2)
      ctx.closePath()
      ctx.fill()
      // Cockpit
      ctx.fillStyle = '#74B9FF'
      ctx.beginPath(); ctx.arc(px, py - 2, 6, 0, Math.PI*2); ctx.fill()
      // Engine glow
      ctx.fillStyle = g.tick % 4 < 2 ? '#FDCB6E' : '#FF6B6B'
      ctx.beginPath()
      ctx.moveTo(px - 6, py + p.h/3)
      ctx.lineTo(px, py + p.h/2 + 8 + rand(0,4))
      ctx.lineTo(px + 6, py + p.h/3)
      ctx.closePath()
      ctx.fill()

      // Shield effect
      if (p.shieldTimer > 0) {
        ctx.globalAlpha = 0.2 + Math.sin(g.tick * 0.15) * 0.1
        ctx.strokeStyle = '#74B9FF'
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(px, py, p.w/2 + 8, 0, Math.PI*2); ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Player bullets
      ctx.fillStyle = '#4ECDC4'
      g.bullets.forEach(b => {
        ctx.fillRect(b.x - b.w/2, b.y - b.h/2, b.w, b.h)
        // Glow
        ctx.globalAlpha = 0.3
        ctx.fillRect(b.x - b.w/2 - 1, b.y - b.h/2 - 1, b.w + 2, b.h + 2)
        ctx.globalAlpha = 1
      })

      // Enemies
      g.enemies.forEach(en => {
        const ex = en.x, ey = en.y
        // Body
        ctx.fillStyle = en.color
        ctx.beginPath()
        ctx.moveTo(ex, ey + en.h/2)
        ctx.lineTo(ex - en.w/2, ey - en.h/4)
        ctx.lineTo(ex - en.w/3, ey - en.h/2)
        ctx.lineTo(ex + en.w/3, ey - en.h/2)
        ctx.lineTo(ex + en.w/2, ey - en.h/4)
        ctx.closePath()
        ctx.fill()
        // Eyes
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(ex - 5, ey - 2, 3, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(ex + 5, ey - 2, 3, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = '#0a0a1a'
        ctx.beginPath(); ctx.arc(ex - 5, ey - 1, 1.5, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(ex + 5, ey - 1, 1.5, 0, Math.PI*2); ctx.fill()
        // HP bar
        if (en.hp < en.maxHp) {
          const bw = en.w * 0.8
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillRect(ex - bw/2, ey - en.h/2 - 8, bw, 3)
          ctx.fillStyle = '#4ECDC4'
          ctx.fillRect(ex - bw/2, ey - en.h/2 - 8, bw * (en.hp / en.maxHp), 3)
        }
      })

      // Boss
      if (g.boss) {
        const b = g.boss
        ctx.fillStyle = b.color
        // Big hexagonal shape
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2
          const rx = b.w/2 * (i % 2 === 0 ? 1 : 0.85)
          const ry = b.h/2 * (i % 2 === 0 ? 1 : 0.85)
          const method = i === 0 ? 'moveTo' : 'lineTo'
          ctx[method](b.x + Math.cos(a) * rx, b.y + Math.sin(a) * ry)
        }
        ctx.closePath(); ctx.fill()
        // Boss eye
        ctx.fillStyle = '#FFD700'
        ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = '#FF0000'
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill()
        // HP bar
        const bw = 70
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(b.x - bw/2, b.y - b.h/2 - 14, bw, 5)
        ctx.fillStyle = '#FF4757'
        ctx.fillRect(b.x - bw/2, b.y - b.h/2 - 14, bw * (b.hp / b.maxHp), 5)
        // Boss glow
        ctx.globalAlpha = 0.08
        ctx.fillStyle = b.color
        ctx.beginPath(); ctx.arc(b.x, b.y, b.w, 0, Math.PI*2); ctx.fill()
        ctx.globalAlpha = 1
      }

      // Enemy bullets
      ctx.fillStyle = '#FF6B6B'
      g.enemyBullets.forEach(eb => {
        ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.w/2 + 1, 0, Math.PI*2); ctx.fill()
      })

      // Powerups
      g.powerups.forEach(pu => {
        const pr = pu.r + Math.sin(pu.pulse) * 3
        ctx.globalAlpha = 0.2
        ctx.fillStyle = pu.type.color
        ctx.beginPath(); ctx.arc(pu.x, pu.y, pr + 6, 0, Math.PI*2); ctx.fill()
        ctx.globalAlpha = 1
        ctx.fillStyle = pu.type.color
        ctx.beginPath(); ctx.arc(pu.x, pu.y, pr, 0, Math.PI*2); ctx.fill()
        ctx.font = `${pr}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(pu.type.emoji, pu.x, pu.y)
      })

      // Particles
      g.particles.forEach(pt => {
        ctx.globalAlpha = pt.life / pt.maxLife
        ctx.fillStyle = pt.color
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * (pt.life / pt.maxLife), 0, Math.PI*2); ctx.fill()
      })
      ctx.globalAlpha = 1

      ctx.restore()
    }

    let lastTime = 0
    function loop(ts) {
      const dt = ts - lastTime
      if (dt >= 14) {
        update()
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
    const dn = e => {
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = true
      if (e.key === 'ArrowRight'|| e.key === 'd') inputRef.current.right = true
    }
    const up = e => {
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = false
      if (e.key === 'ArrowRight'|| e.key === 'd') inputRef.current.right = false
    }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // ── Touch controls ──
  const handleTouch = useCallback((e, type) => {
    e.preventDefault()
    if (type === 'end') { inputRef.current.touchX = null; return }
    const t = e.touches ? e.touches[0] : e
    inputRef.current.touchX = t.clientX
  }, [])

  // ── Report result ──
  useEffect(() => {
    if ((phase === 'dead' || phase === 'win') && score > 0) {
      const won = phase === 'win'
      const stars = score >= cfg.scoreGoal ? 3 : score >= cfg.scoreGoal * 0.6 ? 2 : 1
      reportGameResult({ gameId:'space-shooter', difficultyId:difficulty.id, won, score, stars, timeSec:0 })
      const coinAmount = won
        ? (cfg.lives === 5 ? 15 : cfg.lives === 4 ? 25 : 40)
        : Math.max(5, Math.min(Math.floor(score / 10), 20))
      earnCoins(coinAmount, `Space Shooter — ${won ? 'Menang' : 'skor'} ${score}`)
    }
  }, [phase])

  const DLABEL = { easy:'🟢 Mudah', medium:'🟡 Sedang', hard:'🔴 Sulit' }

  return (
    <div style={{ width:'100%', height:'100vh', background:'#07071a', position:'relative', overflow:'hidden' }}
      onTouchStart={e => handleTouch(e,'start')}
      onTouchMove={e => handleTouch(e,'move')}
      onTouchEnd={e => handleTouch(e,'end')}
      onMouseMove={phase==='playing' ? (e => { inputRef.current.touchX = e.clientX }) : undefined}
      onMouseLeave={() => { inputRef.current.touchX = null }}
    >
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }} />
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS_SS} color="#4ECDC4" onClose={() => { setShowTutorial(false); localStorage.setItem('tut-space-shooter','1') }} />}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* HUD */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:'linear-gradient(to bottom,rgba(7,7,26,0.88),transparent)' }}>
          <button onClick={() => { play('click'); onBack() }}
            style={{ background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'7px 14px', color:'rgba(255,255,255,0.7)', fontSize:15, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>
            ←
          </button>
          <div style={{ display:'flex', gap:18, alignItems:'center' }}>
            {[
              { v:score, label:'SKOR', c:'#4ecdc4' },
              { v:`${'❤️'.repeat(Math.max(0,lives))}`, label:'NYAWA', c:'#ff6b6b', raw:true },
              { v:`Lv${weaponLv}`, label:'SENJATA', c:'#FDCB6E', raw:true },
              { v:bestScore, label:'REKOR', c:'#ffd93d' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: s.raw ? 14 : 20, color:s.c, lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:'0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <span style={{ background:'rgba(162,155,254,0.1)', color:'#a29bfe', border:'1.5px solid rgba(162,155,254,0.2)', borderRadius:100, padding:'5px 12px', fontSize:12, fontFamily:"'Fredoka One',cursive" }}>
            {DLABEL[difficulty.id]}
          </span>
        </div>
      )}

      {/* Score goal indicator */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', top:60, left:'50%', transform:'translateX(-50%)', zIndex:8 }}>
          <div style={{ background:'rgba(78,205,196,0.1)', border:'1px solid rgba(78,205,196,0.2)', borderRadius:100, padding:'3px 14px', fontSize:11, color:'rgba(78,205,196,0.6)', fontWeight:700, whiteSpace:'nowrap' }}>
            🎯 Target: {cfg.scoreGoal}
          </div>
        </div>
      )}

      {/* Idle Screen */}
      {phase === 'idle' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)' }}>
          <div style={{ fontSize:80, marginBottom:4, filter:'drop-shadow(0 0 20px #4ecdc4)' }}>🚀</div>
          <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:38, color:'#fff', marginBottom:6, textShadow:'0 0 20px #4ecdc4' }}>Space Shooter</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:20, textAlign:'center', maxWidth:300, lineHeight:1.7 }}>
            Hancurkan semua alien, kumpulkan power-up, dan capai target skor!
          </p>
          <div style={{ display:'flex', gap:18, marginBottom:28, fontSize:12, color:'rgba(255,255,255,0.35)' }}>
            <span>🕹️ Geser</span><span>🔫 Auto-fire</span><span>⭐ Power-up</span>
          </div>
          <div style={{ marginBottom:20, background:'rgba(78,205,196,0.1)', border:'1.5px solid rgba(78,205,196,0.25)', borderRadius:14, padding:'10px 20px', color:'rgba(78,205,196,0.7)', fontSize:13, fontWeight:700, textAlign:'center' }}>
            🎯 Target Skor: {cfg.scoreGoal} • ❤️ Nyawa: {cfg.lives}
          </div>
          <button onClick={startGame}
            style={{ background:'linear-gradient(135deg,#4ecdc4,#a29bfe)', color:'#fff', border:'none', borderRadius:100, padding:'15px 50px', fontSize:19, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 0 36px rgba(78,205,196,0.4)', letterSpacing:'0.5px' }}>
            ▶ Mulai Main
          </button>
        </div>
      )}

      {/* Win Screen */}
      {phase === 'win' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)', animation:'fadeIn 0.3s ease' }}>
          <div style={{ fontSize:68, marginBottom:8 }}>🏆</div>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:34, color:'#FDCB6E', marginBottom:4, textShadow:'0 0 20px #FDCB6E44' }}>Misi Selesai!</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', marginBottom:24, fontSize:13 }}>Target skor tercapai — kamu menang!</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:22 }}>
            {[
              { label:'Skor', value:score, c:'#4ecdc4' },
              { label:'Rekor', value:Math.max(score, bestScore), c:'#ffd93d' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:`1.5px solid ${s.c}22`, borderRadius:16, padding:'16px 24px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:s.c }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
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

      {/* Dead Screen */}
      {phase === 'dead' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)', animation:'fadeIn 0.3s ease' }}>
          <div style={{ fontSize:68, marginBottom:8 }}>💀</div>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:34, color:'#ff6b6b', marginBottom:4, textShadow:'0 0 20px #ff6b6b44' }}>Game Over!</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', marginBottom:24, fontSize:13 }}>Nyawamu habis — coba lagi!</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:22 }}>
            {[
              { label:'Skor', value:score, c:'#4ecdc4' },
              { label:'Rekor', value:Math.max(score, bestScore), c:'#ffd93d' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:`1.5px solid ${s.c}22`, borderRadius:16, padding:'16px 24px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:s.c }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {score >= bestScore && bestScore > 0 && (
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

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
