import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS_SS = [
  { emoji:'🚀', title:'Space Shooter', desc:'Kendalikan pesawatmu dan tembak semua alien yang datang! Hindari tembakan musuh.', tip:'Kumpulkan power-up untuk senjata lebih kuat!' },
  { emoji:'🕹️', title:'Kontrol', desc:'Geser/drag pesawat untuk bergerak. Tembakan otomatis! Di desktop gunakan panah / A-D.', tip:'Tahan posisi untuk fokus menembak satu area.' },
  { emoji:'⭐', title:'Power-Up', desc:'Ambil bintang kuning untuk upgrade senjata. Ambil hati merah untuk nyawa tambahan.', tip:'Power-up muncul dari musuh yang dihancurkan.' },
]

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins } from '../../context/CoinContext.jsx'

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
  { id:'weapon', color:'#FDCB6E', emoji:'⭐' },
  { id:'health', color:'#FF6B6B', emoji:'❤️' },
  { id:'shield', color:'#74B9FF', emoji:'🛡️' },
]

const rand = (a, b) => a + Math.random() * (b - a)

function makeStarLayers(W, H) {
  return [
    { stars: Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.3, 0.8), alpha: rand(0.15, 0.35) })), speed: 0.3, color: '#668' },
    { stars: Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.5), alpha: rand(0.3, 0.6) })), speed: 0.8, color: '#89a' },
    { stars: Array.from({ length: 30 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1.0, 2.5), alpha: rand(0.6, 1.0) })), speed: 1.5, color: '#fff' },
  ]
}

export default function SpaceShooter({ onBack, game, difficulty }) {
  const canvasRef = useRef(null)
  const gameRef   = useRef(null)
  const animRef   = useRef(null)
  const inputRef  = useRef({ left:false, right:false, touchActive:false, touchX:null, touchOffsetX:0 })
  const phaseRef  = useRef('idle')
  const { play }  = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins } = useCoins()

  const cfg = CFG[difficulty.id]

  const [phase, _setPhase]             = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tut-space-shooter'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [score, setScore]             = useState(0)
  const [lives, setLives]             = useState(cfg.lives)
  const [weaponLv, setWeaponLv]       = useState(1)
  const [bestScore, setBestScore]     = useState(
    () => parseInt(localStorage.getItem(`space-best-${difficulty.id}`) || '0')
  )

  const setPhase = (p) => { phaseRef.current = p; _setPhase(p) }

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
    return { w, h }
  }

  function initGame(W, H) {
    return {
      W, H,
      player: { x: W/2, y: H-80, w:40, h:40, weaponLv:1, shieldTimer:0 },
      bullets: [], enemies: [], enemyBullets: [], powerups: [], particles: [],
      starLayers: makeStarLayers(W, H),
      score: 0, lives: cfg.lives, tick: 0, spawnCounter: 0,
      bossSpawned: false, boss: null, wave: 1, shakeTimer: 0,
    }
  }

  function startGame() {
    const { w, h } = sizeCanvas()
    if (w === 0 || h === 0) return
    gameRef.current = initGame(w, h)
    inputRef.current = { left:false, right:false, touchActive:false, touchX:null, touchOffsetX:0 }
    setScore(0); setLives(cfg.lives); setWeaponLv(1)
    setPhase('playing')
  }

  useEffect(() => {
    sizeCanvas()
    const fn = () => {
      const { w, h } = sizeCanvas()
      if (gameRef.current && phaseRef.current === 'playing') {
        gameRef.current.W = w; gameRef.current.H = h
        gameRef.current.player.y = h - 80
      }
    }
    window.addEventListener('resize', fn)
    window.addEventListener('orientationchange', () => setTimeout(fn, 200))
    return () => { window.removeEventListener('resize', fn); window.removeEventListener('orientationchange', fn) }
  }, [])

  // Touch controls — ONLY on canvas element, never blocks button events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const getX = (e) => { const t = e.touches ? e.touches[0] : e; return t ? t.clientX : null }

    const onStart = (e) => {
      if (phaseRef.current !== 'playing') return
      e.preventDefault()
      const x = getX(e)
      if (x !== null && gameRef.current) {
        inputRef.current.touchActive = true
        inputRef.current.touchX = x
        inputRef.current.touchOffsetX = x - gameRef.current.player.x
      }
    }
    const onMove = (e) => {
      if (!inputRef.current.touchActive) return
      e.preventDefault()
      const x = getX(e)
      if (x !== null) inputRef.current.touchX = x
    }
    const onEnd = () => { inputRef.current.touchActive = false; inputRef.current.touchX = null }

    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onEnd, { passive: true })
    canvas.addEventListener('touchcancel', onEnd, { passive: true })
    canvas.addEventListener('mousedown', onStart)
    canvas.addEventListener('mousemove', (e) => { if (inputRef.current.touchActive) { const x = getX(e); if (x !== null) inputRef.current.touchX = x } })
    canvas.addEventListener('mouseup', onEnd)
    canvas.addEventListener('mouseleave', onEnd)

    return () => {
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onEnd)
      canvas.removeEventListener('touchcancel', onEnd)
    }
  }, [])

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

  // ── GAME LOOP ──
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
        hp: cfg.bossHP + g.wave * 5, maxHp: cfg.bossHP + g.wave * 5,
        points: 200 + g.wave * 50,
        shootTimer: 0, phase: 0, entered: false,
      }
      g.bossSpawned = true
    }

    function fireBullet(g) {
      const p = g.player, bw = 4, bh = 14
      if (p.weaponLv >= 3) {
        g.bullets.push({ x:p.x-10, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
        g.bullets.push({ x:p.x,    y:p.y-p.h/2-6, w:bw, h:bh, dmg:1 })
        g.bullets.push({ x:p.x+10, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
      } else if (p.weaponLv >= 2) {
        g.bullets.push({ x:p.x-7, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
        g.bullets.push({ x:p.x+7, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
      } else {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:1 })
      }
    }

    function spawnParticles(g, x, y, color, count) {
      for (let i = 0; i < count; i++) {
        g.particles.push({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), r: rand(1.5, 4), color, life: rand(15, 35), maxLife: 35 })
      }
    }

    function spawnPowerup(g, x, y) {
      if (Math.random() > 0.25) return
      const type = POWERUP_TYPES[Math.floor(rand(0, POWERUP_TYPES.length))]
      g.powerups.push({ x, y, type, vy: 1.5, r: 14, pulse: 0 })
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

    function update() {
      const g = gameRef.current
      if (!g || phaseRef.current !== 'playing') return
      const p = g.player
      const inp = inputRef.current

      // Movement: drag-based (mobile) or keyboard
      if (inp.touchActive && inp.touchX !== null) {
        const targetX = inp.touchX - inp.touchOffsetX
        const dx = targetX - p.x
        p.x += Math.sign(dx) * Math.min(Math.abs(dx), cfg.playerSpeed + 4)
      } else {
        if (inp.left) p.x -= cfg.playerSpeed
        if (inp.right) p.x += cfg.playerSpeed
      }
      p.x = Math.max(p.w/2+4, Math.min(g.W - p.w/2-4, p.x))

      if (p.shieldTimer > 0) p.shieldTimer--
      if (g.tick % 8 === 0) fireBullet(g)

      g.bullets = g.bullets.filter(b => { b.y -= cfg.bulletSpeed; return b.y > -20 })

      g.spawnCounter++
      if (g.spawnCounter >= cfg.spawnRate && !g.boss) { g.spawnCounter = 0; spawnEnemy(g) }
      if (!g.bossSpawned && g.score > 0 && g.score % 300 < 30 && g.score >= 250 && !g.boss) spawnBoss(g)

      g.enemies = g.enemies.filter(en => {
        en.y += en.speed; en.x += Math.sin(en.wobble) * en.wobbleAmp; en.wobble += 0.04
        if (en.shootRate > 0) { en.shootTimer--; if (en.shootTimer <= 0) { en.shootTimer = en.shootRate + Math.floor(rand(-20, 20)); g.enemyBullets.push({ x:en.x, y:en.y+en.h/2, w:5, h:10, vy:3+g.wave*0.15 }) } }
        if (en.y > g.H + 50) return false

        for (let i = g.bullets.length - 1; i >= 0; i--) {
          const b = g.bullets[i]
          if (Math.abs(b.x - en.x) < en.w/2+b.w/2 && Math.abs(b.y - en.y) < en.h/2+b.h/2) {
            g.bullets.splice(i, 1); en.hp -= b.dmg; spawnParticles(g, b.x, b.y, en.color, 3)
            if (en.hp <= 0) { g.score += en.points; setScore(g.score); spawnParticles(g, en.x, en.y, en.color, 12); spawnPowerup(g, en.x, en.y); play('eat'); return false }
            break
          }
        }

        if (p.shieldTimer <= 0 && Math.abs(en.x-p.x)<(en.w+p.w)/2 && Math.abs(en.y-p.y)<(en.h+p.h)/2) {
          g.lives--; setLives(g.lives); g.shakeTimer = 12; spawnParticles(g, p.x, p.y, '#FF6B6B', 15); play('mismatch')
          if (g.lives <= 0) { endGame(g, false); return false }
          p.shieldTimer = 90; return false
        }
        return true
      })

      if (g.boss) {
        const boss = g.boss
        if (!boss.entered) { boss.y += 1.5; if (boss.y >= boss.targetY) boss.entered = true }
        else {
          boss.x += Math.sin(g.tick * 0.02) * 2.5; boss.shootTimer--
          if (boss.shootTimer <= 0) {
            boss.shootTimer = 30; boss.phase = (boss.phase + 1) % 3
            const bx = boss.x, by = boss.y + boss.h/2
            if (boss.phase === 0) g.enemyBullets.push({ x:bx, y:by, w:6, h:12, vy:4 })
            else if (boss.phase === 1) { g.enemyBullets.push({ x:bx-20, y:by, w:5, h:10, vy:3.5 }); g.enemyBullets.push({ x:bx+20, y:by, w:5, h:10, vy:3.5 }) }
            else { for (let i = -2; i <= 2; i++) g.enemyBullets.push({ x:bx+i*18, y:by, w:5, h:10, vy:3.2 }) }
          }
          for (let i = g.bullets.length - 1; i >= 0; i--) {
            const b = g.bullets[i]
            if (Math.abs(b.x - boss.x) < boss.w/2+b.w/2 && Math.abs(b.y - boss.y) < boss.h/2+b.h/2) {
              g.bullets.splice(i, 1); boss.hp -= b.dmg; spawnParticles(g, b.x, b.y, boss.color, 3)
              if (boss.hp <= 0) { g.score += boss.points; setScore(g.score); spawnParticles(g, boss.x, boss.y, boss.color, 30); spawnPowerup(g, boss.x-20, boss.y); spawnPowerup(g, boss.x+20, boss.y); play('levelUp'); g.boss = null; g.bossSpawned = false; g.wave++; break }
            }
          }
          if (boss && p.shieldTimer <= 0 && Math.abs(boss.x-p.x)<(boss.w+p.w)/2 && Math.abs(boss.y-p.y)<(boss.h+p.h)/2) {
            g.lives--; setLives(g.lives); g.shakeTimer = 15; spawnParticles(g, p.x, p.y, '#FF6B6B', 15); play('mismatch')
            if (g.lives <= 0) endGame(g, false); p.shieldTimer = 90
          }
        }
      }

      g.enemyBullets = g.enemyBullets.filter(eb => {
        eb.y += eb.vy; if (eb.y > g.H + 20) return false
        if (p.shieldTimer <= 0 && Math.abs(eb.x-p.x)<p.w/2+eb.w/2 && Math.abs(eb.y-p.y)<p.h/2+eb.h/2) {
          g.lives--; setLives(g.lives); g.shakeTimer = 10; spawnParticles(g, p.x, p.y, '#FF6B6B', 8); play('mismatch')
          if (g.lives <= 0) endGame(g, false); p.shieldTimer = 60; return false
        }
        return true
      })

      g.powerups = g.powerups.filter(pu => {
        pu.y += pu.vy; pu.pulse += 0.08; if (pu.y > g.H + 30) return false
        if (Math.abs(pu.x - p.x) < 24 && Math.abs(pu.y - p.y) < 24) {
          if (pu.type.id === 'weapon') { p.weaponLv = Math.min(p.weaponLv + 1, 3); setWeaponLv(p.weaponLv) }
          else if (pu.type.id === 'health') { g.lives = Math.min(g.lives + 1, cfg.lives + 2); setLives(g.lives) }
          else if (pu.type.id === 'shield') p.shieldTimer = 180
          spawnParticles(g, pu.x, pu.y, pu.type.color, 8); play('click'); return false
        }
        return true
      })

      g.particles = g.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; return pt.life > 0 })
      g.starLayers.forEach(layer => { layer.stars.forEach(s => { s.y += layer.speed; if (s.y > g.H) { s.y = 0; s.x = rand(0, g.W) } }) })

      if (g.score >= cfg.scoreGoal && !g.boss) endGame(g, true)
      if (g.shakeTimer > 0) g.shakeTimer--
      g.tick++
    }

    function draw() {
      const g = gameRef.current
      if (!g) return
      const W = g.W, H = g.H, p = g.player
      const sx = g.shakeTimer > 0 ? rand(-3, 3) : 0, sy = g.shakeTimer > 0 ? rand(-3, 3) : 0

      ctx.save(); ctx.translate(sx, sy)

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#050520'); grad.addColorStop(0.5, '#07071a'); grad.addColorStop(1, '#0a0a28')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

      // Parallax stars
      g.starLayers.forEach(layer => { layer.stars.forEach(s => { ctx.globalAlpha = s.alpha; ctx.fillStyle = layer.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill() }) })
      ctx.globalAlpha = 1

      const px = p.x, py = p.y
      // Engine glow
      ctx.globalAlpha = 0.35 * (g.tick % 4 < 2 ? 1 : 0.7)
      ctx.fillStyle = '#4ECDC4'; ctx.beginPath(); ctx.arc(px, py + p.h/2 + 4, 10, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1
      // Wings
      ctx.fillStyle = '#2d8a85'
      ctx.beginPath(); ctx.moveTo(px-p.w/2-5, py+p.h/3); ctx.lineTo(px-p.w/4, py-p.h/6); ctx.lineTo(px-p.w/4, py+p.h/3); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(px+p.w/2+5, py+p.h/3); ctx.lineTo(px+p.w/4, py-p.h/6); ctx.lineTo(px+p.w/4, py+p.h/3); ctx.closePath(); ctx.fill()
      // Body
      ctx.fillStyle = '#4ECDC4'; ctx.beginPath(); ctx.moveTo(px, py-p.h/2); ctx.lineTo(px-p.w/4, py+p.h/3); ctx.lineTo(px+p.w/4, py+p.h/3); ctx.closePath(); ctx.fill()
      // Cockpit
      ctx.fillStyle = '#74B9FF'; ctx.beginPath(); ctx.arc(px, py-4, 5, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#a8d8ff'; ctx.beginPath(); ctx.arc(px-1.5, py-5.5, 2, 0, Math.PI*2); ctx.fill()
      // Flames
      ctx.fillStyle = g.tick%4<2 ? '#FDCB6E' : '#FF6B6B'
      ctx.beginPath(); ctx.moveTo(px-5, py+p.h/3); ctx.lineTo(px, py+p.h/2+6+rand(0,6)); ctx.lineTo(px+5, py+p.h/3); ctx.closePath(); ctx.fill()
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.moveTo(px-3, py+p.h/3); ctx.lineTo(px, py+p.h/2+10+rand(0,5)); ctx.lineTo(px+3, py+p.h/3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1

      // Shield
      if (p.shieldTimer > 0) {
        ctx.globalAlpha = 0.15 + Math.sin(g.tick*0.15)*0.1; ctx.strokeStyle = '#74B9FF'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(px, py, p.w/2+10, 0, Math.PI*2); ctx.stroke()
        ctx.fillStyle = '#74B9FF'; ctx.beginPath(); ctx.arc(px, py, p.w/2+10, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1
      }

      // Bullets
      g.bullets.forEach(b => {
        ctx.globalAlpha = 0.15; ctx.fillStyle = '#4ECDC4'; ctx.fillRect(b.x-b.w/2-0.5, b.y, b.w+1, 12)
        ctx.globalAlpha = 1; ctx.fillStyle = '#4ECDC4'; ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h)
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7; ctx.fillRect(b.x-1, b.y-b.h/2, 2, 4); ctx.globalAlpha = 1
      })

      // Enemies
      g.enemies.forEach(en => {
        const ex = en.x, ey = en.y
        ctx.globalAlpha = 0.08; ctx.fillStyle = en.color; ctx.beginPath(); ctx.arc(ex, ey, en.w, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1
        ctx.fillStyle = en.color; ctx.beginPath()
        ctx.moveTo(ex, ey+en.h/2); ctx.lineTo(ex-en.w/2, ey-en.h/4); ctx.quadraticCurveTo(ex-en.w/3, ey-en.h/2, ex, ey-en.h/2+4); ctx.quadraticCurveTo(ex+en.w/3, ey-en.h/2, ex+en.w/2, ey-en.h/4)
        ctx.closePath(); ctx.fill()
        ctx.fillStyle = en.color+'99'; ctx.beginPath(); ctx.arc(ex, ey-en.h/4, en.w/4, Math.PI, 0); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex-5, ey-2, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ex+5, ey-2, 3, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = '#0a0a1a'; ctx.beginPath(); ctx.arc(ex-5, ey-1, 1.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ex+5, ey-1, 1.5, 0, Math.PI*2); ctx.fill()
        if (en.hp < en.maxHp) { const bw = en.w*0.8; ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(ex-bw/2, ey-en.h/2-8, bw, 3); ctx.fillStyle = '#4ECDC4'; ctx.fillRect(ex-bw/2, ey-en.h/2-8, bw*(en.hp/en.maxHp), 3) }
      })

      // Boss
      if (g.boss) {
        const b = g.boss
        ctx.globalAlpha = 0.06; ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.w+10, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1
        ctx.fillStyle = b.color; ctx.beginPath()
        for (let i = 0; i < 6; i++) { const a = (Math.PI/3)*i - Math.PI/2; const rx = b.w/2*(i%2===0?1:0.85); const ry = b.h/2*(i%2===0?1:0.85); i===0 ? ctx.moveTo(b.x+Math.cos(a)*rx, b.y+Math.sin(a)*ry) : ctx.lineTo(b.x+Math.cos(a)*rx, b.y+Math.sin(a)*ry) }
        ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill()
        const bw = 70; ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(b.x-bw/2, b.y-b.h/2-14, bw, 5)
        ctx.fillStyle = b.hp > b.maxHp*0.3 ? '#FF4757' : '#FF6B6B'; ctx.fillRect(b.x-bw/2, b.y-b.h/2-14, bw*(b.hp/b.maxHp), 5)
        if (b.hp <= b.maxHp*0.3 && g.tick%20<10) { ctx.globalAlpha = 0.15; ctx.fillStyle = '#FF4757'; ctx.beginPath(); ctx.arc(b.x, b.y, b.w, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1 }
      }

      // Enemy bullets
      g.enemyBullets.forEach(eb => {
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.w/2+4, 0, Math.PI*2); ctx.fill()
        ctx.globalAlpha = 1; ctx.fillStyle = '#FF6B6B'; ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.w/2+1, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(eb.x, eb.y, 2, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1
      })

      // Powerups
      g.powerups.forEach(pu => {
        const pr = pu.r + Math.sin(pu.pulse)*3
        ctx.globalAlpha = 0.15; ctx.fillStyle = pu.type.color; ctx.beginPath(); ctx.arc(pu.x, pu.y, pr+8, 0, Math.PI*2); ctx.fill()
        ctx.globalAlpha = 1; ctx.fillStyle = pu.type.color; ctx.beginPath(); ctx.arc(pu.x, pu.y, pr, 0, Math.PI*2); ctx.fill()
        ctx.font = `${Math.round(pr)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pu.type.emoji, pu.x, pu.y)
      })

      // Particles
      g.particles.forEach(pt => { ctx.globalAlpha = pt.life/pt.maxLife; ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r*(pt.life/pt.maxLife), 0, Math.PI*2); ctx.fill() })
      ctx.globalAlpha = 1; ctx.restore()
    }

    let lastTime = 0
    function loop(ts) {
      if (phaseRef.current !== 'playing') return
      if (ts - lastTime >= 14) { update(); draw(); lastTime = ts }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase])

  useEffect(() => {
    if ((phase === 'dead' || phase === 'win') && score > 0) {
      const won = phase === 'win'
      const stars = score >= cfg.scoreGoal ? 3 : score >= cfg.scoreGoal * 0.6 ? 2 : 1
      reportGameResult({ gameId:'space-shooter', difficultyId:difficulty.id, won, score, stars, timeSec:0 })
      const coinAmount = won ? (cfg.lives === 5 ? 15 : cfg.lives === 4 ? 25 : 40) : Math.max(5, Math.min(Math.floor(score / 10), 20))
      earnCoins(coinAmount, `Space Shooter — ${won ? 'Menang' : 'skor'} ${score}`)
    }
  }, [phase])

  const DLABEL = { easy:'🟢 Mudah', medium:'🟡 Sedang', hard:'🔴 Sulit' }
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 500

  return (
    <div style={{ width:'100%', height: typeof CSS !== 'undefined' && CSS.supports('height','100dvh') ? '100dvh' : '100vh', background:'#07071a', position:'relative', overflow:'hidden', userSelect:'none' }}>
      <div style={{ position:'absolute', inset:0, zIndex:1 }}>
        <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', touchAction:'none' }} />
      </div>

      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS_SS} color="#4ECDC4" onClose={() => { setShowTutorial(false); localStorage.setItem('tut-space-shooter','1') }} />}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {phase === 'playing' && (
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:isMobile?'8px 10px':'10px 16px', background:'linear-gradient(to bottom,rgba(7,7,26,0.92),rgba(7,7,26,0.4),transparent)', pointerEvents:'none' }}>
          <button onClick={() => { play('click'); onBack() }} style={{ pointerEvents:'auto', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:10, padding:isMobile?'6px 10px':'7px 14px', color:'rgba(255,255,255,0.7)', fontSize:isMobile?14:15, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:700, WebkitTapHighlightColor:'transparent' }}>←</button>
          <div style={{ display:'flex', gap:isMobile?10:18, alignItems:'center' }}>
            {[
              { v:score, label:'SKOR', c:'#4ecdc4' },
              { v:'❤️'.repeat(Math.max(0,Math.min(lives,7))), label:'NYAWA', c:'#ff6b6b', raw:true },
              { v:`Lv${weaponLv}`, label:'SENJATA', c:'#FDCB6E', raw:true },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:s.raw?(isMobile?11:14):(isMobile?16:20), color:s.c, lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:isMobile?7:9, color:'rgba(255,255,255,0.3)', fontWeight:700, letterSpacing:'0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <span style={{ background:'rgba(162,155,254,0.1)', color:'#a29bfe', border:'1.5px solid rgba(162,155,254,0.2)', borderRadius:100, padding:isMobile?'3px 8px':'5px 12px', fontSize:isMobile?10:12, fontFamily:"'Fredoka One',cursive" }}>{DLABEL[difficulty.id]}</span>
        </div>
      )}

      {phase === 'playing' && (
        <div style={{ position:'absolute', top:isMobile?48:60, left:'50%', transform:'translateX(-50%)', zIndex:8, pointerEvents:'none' }}>
          <div style={{ background:'rgba(78,205,196,0.08)', border:'1px solid rgba(78,205,196,0.15)', borderRadius:100, padding:'2px 12px', fontSize:isMobile?10:11, color:'rgba(78,205,196,0.5)', fontWeight:700, whiteSpace:'nowrap' }}>🎯 {score}/{cfg.scoreGoal}</div>
        </div>
      )}

      {phase === 'playing' && isMobile && (
        <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', zIndex:8, pointerEvents:'none', opacity:score>30?0:0.4, transition:'opacity 1s' }}>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600, textAlign:'center' }}>👆 Geser untuk mengendalikan pesawat</div>
        </div>
      )}

      {phase === 'idle' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)', padding:20 }}>
          <div style={{ fontSize:isMobile?60:80, marginBottom:4, filter:'drop-shadow(0 0 20px #4ecdc4)' }}>🚀</div>
          <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:isMobile?28:38, color:'#fff', marginBottom:6, textShadow:'0 0 20px #4ecdc4', textAlign:'center' }}>Space Shooter</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:isMobile?12:14, marginBottom:16, textAlign:'center', maxWidth:300, lineHeight:1.7 }}>Hancurkan alien, kumpulkan power-up, dan capai target skor!</p>
          <div style={{ display:'flex', gap:isMobile?12:18, marginBottom:24, fontSize:isMobile?11:12, color:'rgba(255,255,255,0.35)' }}>
            <span>🕹️ Geser</span><span>🔫 Auto-fire</span><span>⭐ Power-up</span>
          </div>
          <div style={{ marginBottom:20, background:'rgba(78,205,196,0.08)', border:'1.5px solid rgba(78,205,196,0.2)', borderRadius:14, padding:isMobile?'8px 16px':'10px 20px', color:'rgba(78,205,196,0.6)', fontSize:isMobile?12:13, fontWeight:700, textAlign:'center' }}>🎯 Target: {cfg.scoreGoal} • ❤️ Nyawa: {cfg.lives}</div>
          {bestScore > 0 && <div style={{ marginBottom:16, color:'rgba(255,211,61,0.5)', fontSize:12, fontWeight:600 }}>🏆 Rekor: {bestScore}</div>}
          <button onClick={startGame} style={{ background:'linear-gradient(135deg,#4ecdc4,#a29bfe)', color:'#fff', border:'none', borderRadius:100, padding:isMobile?'14px 40px':'15px 50px', fontSize:isMobile?16:19, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 0 36px rgba(78,205,196,0.4)', WebkitTapHighlightColor:'transparent' }}>▶ Mulai Main</button>
          <button onClick={() => { play('click'); onBack() }} style={{ marginTop:12, background:'transparent', color:'rgba(255,255,255,0.35)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:100, padding:'10px 24px', fontSize:13, fontWeight:700, fontFamily:"'Fredoka One',cursive", cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>← Kembali</button>
        </div>
      )}

      {phase === 'win' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)', animation:'fadeIn 0.3s ease', padding:20 }}>
          <div style={{ fontSize:isMobile?56:68, marginBottom:8 }}>🏆</div>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:isMobile?26:34, color:'#FDCB6E', marginBottom:4, textShadow:'0 0 20px #FDCB6E44' }}>Misi Selesai!</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', marginBottom:20, fontSize:isMobile?12:13 }}>Target skor tercapai — kamu menang!</p>
          <div style={{ fontSize:32, marginBottom:16, letterSpacing:4 }}>{'⭐'.repeat(score>=cfg.scoreGoal?3:score>=cfg.scoreGoal*0.6?2:1)}{'☆'.repeat(3-(score>=cfg.scoreGoal?3:score>=cfg.scoreGoal*0.6?2:1))}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:22, width:'100%', maxWidth:280 }}>
            {[{label:'Skor',value:score,c:'#4ecdc4'},{label:'Rekor',value:Math.max(score,bestScore),c:'#ffd93d'}].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:`1.5px solid ${s.c}22`, borderRadius:16, padding:'14px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:isMobile?22:28, color:s.c }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={startGame} style={{ background:'linear-gradient(135deg,#4ecdc4,#a29bfe)', color:'#fff', border:'none', borderRadius:100, padding:isMobile?'12px 28px':'13px 34px', fontSize:isMobile?14:16, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 0 22px rgba(78,205,196,0.35)', WebkitTapHighlightColor:'transparent' }}>🔄 Main Lagi</button>
            <button onClick={() => { play('click'); onBack() }} style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:100, padding:isMobile?'12px 18px':'13px 22px', fontSize:isMobile?13:14, fontWeight:700, fontFamily:"'Fredoka One',cursive", cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>🏠 Home</button>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(7,7,26,0.93)', animation:'fadeIn 0.3s ease', padding:20 }}>
          <div style={{ fontSize:isMobile?56:68, marginBottom:8 }}>💀</div>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:isMobile?26:34, color:'#ff6b6b', marginBottom:4, textShadow:'0 0 20px #ff6b6b44' }}>Game Over!</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', marginBottom:20, fontSize:isMobile?12:13 }}>Nyawamu habis — coba lagi!</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:22, width:'100%', maxWidth:280 }}>
            {[{label:'Skor',value:score,c:'#4ecdc4'},{label:'Rekor',value:Math.max(score,bestScore),c:'#ffd93d'}].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', border:`1.5px solid ${s.c}22`, borderRadius:16, padding:'14px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:isMobile?22:28, color:s.c }}>{s.value}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {score >= bestScore && bestScore > 0 && <div style={{ marginBottom:16, background:'rgba(255,211,61,0.08)', border:'1.5px solid rgba(255,211,61,0.25)', borderRadius:100, padding:'7px 20px', color:'#ffd93d', fontSize:13, fontWeight:700 }}>🏆 Rekor Baru!</div>}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={startGame} style={{ background:'linear-gradient(135deg,#4ecdc4,#a29bfe)', color:'#fff', border:'none', borderRadius:100, padding:isMobile?'12px 28px':'13px 34px', fontSize:isMobile?14:16, fontWeight:800, fontFamily:"'Fredoka One',cursive", cursor:'pointer', boxShadow:'0 0 22px rgba(78,205,196,0.35)', WebkitTapHighlightColor:'transparent' }}>🔄 Main Lagi</button>
            <button onClick={() => { play('click'); onBack() }} style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:100, padding:isMobile?'12px 18px':'13px 22px', fontSize:isMobile?13:14, fontWeight:700, fontFamily:"'Fredoka One',cursive", cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>🏠 Home</button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
