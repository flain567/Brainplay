import TutorialModal from '../../components/TutorialModal.jsx'
import Confetti from '../../components/Confetti.jsx'

const TUTORIAL_STEPS_SS = [
  { emoji:'🚀', title:'Space Shooter', desc:'Kendalikan pesawatmu, hancurkan wave demi wave musuh, dan kalahkan boss!', tip:'Kumpulkan power-up & gunakan kemampuan spesial!' },
  { emoji:'🕹️', title:'Kontrol', desc:'Geser/drag pesawat untuk bergerak. Tembakan otomatis! Desktop: panah / WASD.', tip:'Tap 2× untuk aktifkan Special Ability!' },
  { emoji:'⭐', title:'Power-Up & Waves', desc:'Tiap wave makin sulit! Ambil ⭐ upgrade senjata, ❤️ nyawa, 🛡️ perisai, 💎 mega power!', tip:'Boss muncul tiap 3 wave — siapkan dirimu!' },
  { emoji:'🚀', title:'Pesawat', desc:'Beli & equip pesawat di Shop. Tiap pesawat punya stats & kemampuan spesial berbeda!', tip:'Kunjungi Shop → 🚀 Ships untuk lihat koleksi.' },
]

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSound } from '../../hooks/useSound.js'
import { useProgress } from '../../context/ProgressContext.jsx'
import { useCoins, SHIP_CATALOG } from '../../context/CoinContext.jsx'
import { useHaptics } from '../../hooks/useHaptics.js'

const CFG = {
  easy:   { spawnRate:80, enemySpeed:1.2, enemyHP:1, bossHP:18, bulletSpeed:7, lives:5, waveGoal:5, baseScore:300 },
  medium: { spawnRate:55, enemySpeed:1.8, enemyHP:2, bossHP:28, bulletSpeed:8, lives:4, waveGoal:7, baseScore:500 },
  hard:   { spawnRate:38, enemySpeed:2.5, enemyHP:3, bossHP:40, bulletSpeed:9, lives:3, waveGoal:10, baseScore:800 },
}

const ENEMY_TYPES = [
  { id:'scout',   w:28, h:28, color:'#FFD93D', points:10, shootRate:0,   movePattern:'straight' },
  { id:'fighter', w:32, h:32, color:'#FF6B6B', points:20, shootRate:180, movePattern:'wobble' },
  { id:'bomber',  w:38, h:38, color:'#A29BFE', points:30, shootRate:130, movePattern:'zigzag' },
  { id:'tank',    w:42, h:42, color:'#FD79A8', points:40, shootRate:160, movePattern:'slow' },
  { id:'elite',   w:36, h:36, color:'#00CEC9', points:50, shootRate:100, movePattern:'swoop' },
  { id:'kamikaze',w:26, h:26, color:'#FF4757', points:25, shootRate:0,   movePattern:'chase' },
]

const WAVE_FORMATIONS = [
  { pattern:'v' }, { pattern:'line' }, { pattern:'diamond' },
  { pattern:'swarm' }, { pattern:'pincer' }, { pattern:'circle' },
]

const POWERUP_TYPES = [
  { id:'weapon', color:'#FDCB6E', emoji:'⭐', glow:'#FFD700' },
  { id:'health', color:'#FF6B6B', emoji:'❤️', glow:'#FF0000' },
  { id:'shield', color:'#74B9FF', emoji:'🛡️', glow:'#0066FF' },
  { id:'coin',   color:'#FFD700', emoji:'🪙', glow:'#DAA520' },
  { id:'mega',   color:'#A29BFE', emoji:'💎', glow:'#6C5CE7' },
]

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function makeStarLayers(W, H) {
  return [
    { stars: Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.3, 0.8), alpha: rand(0.15, 0.35) })), speed: 0.3, color: '#668' },
    { stars: Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.5), alpha: rand(0.3, 0.6) })), speed: 0.8, color: '#89a' },
    { stars: Array.from({ length: 35 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(1.0, 2.5), alpha: rand(0.6, 1.0) })), speed: 1.5, color: '#fff' },
  ]
}

function makeNebulae(W, H) {
  return Array.from({ length: 4 }, () => ({
    x: rand(0, W), y: rand(0, H), r: rand(80, 200),
    color: ['#4ECDC433','#A29BFE22','#FF6B6B18','#00CEC922'][Math.floor(rand(0,4))],
    speed: rand(0.1, 0.3),
  }))
}

const ASSETS = {
  boss1: null,
  boss2: null,
  boss3: null
}

export default function SpaceShooter({ onBack, game, difficulty }) {
  useEffect(() => {
    // Preload boss assets
    ['boss1.png', 'boss2.png', 'boss3.png'].forEach(src => {
      if (!ASSETS[src]) {
        const img = new Image()
        img.src = '/' + src
        ASSETS[src] = img
      }
    })
  }, [])
  const canvasRef = useRef(null)
  const gameRef   = useRef(null)
  const animRef   = useRef(null)
  const inputRef  = useRef({ left:false, right:false, up:false, down:false, touchActive:false, touchX:null, touchY:null, touchOffsetX:0, touchOffsetY:0, doubleTap:0 })
  const phaseRef  = useRef('idle')
  const { play }  = useSound()
  const { reportGameResult } = useProgress()
  const { earnCoins, getActiveShip } = useCoins()
  const { vibrateLight, vibrateMedium, vibrateHeavy, vibrateSuccess, vibrateError } = useHaptics()

  const cfg = CFG[difficulty.id]
  const activeShip = getActiveShip()

  const [phase, _setPhase]             = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_space-shooter'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [score, setScore]               = useState(0)
  const [lives, setLives]               = useState(cfg.lives)
  const [weaponLv, setWeaponLv]         = useState(1)
  const [wave, setWave]                 = useState(1)
  const [specialReady, setSpecialReady] = useState(false)
  const [specialCharge, setSpecialCharge] = useState(0)
  const [gameTime, setGameTime]         = useState(0)
  const [combo, setCombo]               = useState(0)
  const [bestScore, setBestScore]       = useState(() => parseInt(localStorage.getItem(`space-best-${difficulty.id}`) || '0'))
  const [bestWave, setBestWave]         = useState(() => parseInt(localStorage.getItem(`space-bestwave-${difficulty.id}`) || '0'))

  const setPhase = (p) => { phaseRef.current = p; _setPhase(p) }

  function sizeCanvas() {
    const c = canvasRef.current; if (!c) return { w:0, h:0 }
    const parent = c.parentElement; if (!parent) return { w:0, h:0 }
    const rect = parent.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(rect.width), h = Math.floor(rect.height)
    c.width = w * dpr; c.height = h * dpr
    c.style.width = w + 'px'; c.style.height = h + 'px'
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { w, h }
  }

  function initGame(W, H) {
    const ship = activeShip, ss = ship.stats
    let shipImgObj = null
    if (ship.img) {
      shipImgObj = new Image()
      shipImgObj.src = ship.img
    }
    return {
      W, H, ship, shipDesign: ship.design, shipImg: shipImgObj,
      player: { x: W/2, y: H-80, w:44, h:44, weaponLv:1, shieldTimer:0, invTimer:60 },
      bullets:[], enemies:[], enemyBullets:[], powerups:[], particles:[],
      floatingTexts:[], trails:[],
      starLayers: makeStarLayers(W, H), nebulae: makeNebulae(W, H),
      score:0, lives: Math.min(cfg.lives, ss.maxHP), tick:0, spawnCounter:0,
      bossSpawned:false, boss:null, wave:1, shakeTimer:0,
      waveEnemiesSpawned:0, waveEnemiesKilled:0, waveEnemyTarget:6,
      waveState:'spawning', waveTransitionTimer:0,
      combo:0, comboTimer:0, maxCombo:0,
      specialCharge:0, specialActive:false,
      gameTime:0, coinsCollected:0, fireTimer:0,
      rapidFireTimer:0, cloakTimer:0, fireTrailTimer:0, beamTimer:0,
    }
  }

  function startGame() {
    const { w, h } = sizeCanvas(); if (w === 0 || h === 0) return
    gameRef.current = initGame(w, h)
    inputRef.current = { left:false, right:false, up:false, down:false, touchActive:false, touchX:null, touchY:null, touchOffsetX:0, touchOffsetY:0, doubleTap:0 }
    setScore(0); setLives(gameRef.current.lives); setWeaponLv(1); setWave(1)
    setSpecialReady(false); setSpecialCharge(0); setGameTime(0); setCombo(0)
    setPhase('playing')
  }

  useEffect(() => {
    sizeCanvas()
    const fn = () => { const { w, h } = sizeCanvas(); if (gameRef.current && phaseRef.current === 'playing') { gameRef.current.W = w; gameRef.current.H = h; gameRef.current.player.y = Math.min(gameRef.current.player.y, h-40) } }
    window.addEventListener('resize', fn); const orientFn = () => setTimeout(fn, 200); window.addEventListener('orientationchange', orientFn)
    return () => { window.removeEventListener('resize', fn); window.removeEventListener('orientationchange', orientFn) }
  }, [])

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const getXY = (e) => { const t = e.touches ? e.touches[0] : e; return t ? { x: t.clientX, y: t.clientY } : null }
    const onStart = (e) => {
      if (phaseRef.current !== 'playing') return; e.preventDefault()
      const pos = getXY(e)
      if (pos && gameRef.current) {
        inputRef.current.touchActive = true; inputRef.current.touchX = pos.x; inputRef.current.touchY = pos.y
        inputRef.current.touchOffsetX = pos.x - gameRef.current.player.x; inputRef.current.touchOffsetY = pos.y - gameRef.current.player.y
        const now = Date.now()
        if (now - inputRef.current.doubleTap < 350) { triggerSpecial(); inputRef.current.doubleTap = 0 }
        else inputRef.current.doubleTap = now
      }
    }
    const onMove = (e) => { if (!inputRef.current.touchActive) return; e.preventDefault(); const pos = getXY(e); if (pos) { inputRef.current.touchX = pos.x; inputRef.current.touchY = pos.y } }
    const onEnd = () => { inputRef.current.touchActive = false; inputRef.current.touchX = null; inputRef.current.touchY = null }
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove', onMove, { passive: false })
    canvas.addEventListener('touchend', onEnd, { passive: true })
    canvas.addEventListener('touchcancel', onEnd, { passive: true })
    canvas.addEventListener('mousedown', onStart)
    const onMouseMove = (e) => { if (inputRef.current.touchActive) { const p = getXY(e); if (p) { inputRef.current.touchX = p.x; inputRef.current.touchY = p.y } } }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onEnd); canvas.addEventListener('mouseleave', onEnd)
    return () => { canvas.removeEventListener('touchstart', onStart); canvas.removeEventListener('touchmove', onMove); canvas.removeEventListener('touchend', onEnd); canvas.removeEventListener('touchcancel', onEnd); canvas.removeEventListener('mousedown', onStart); canvas.removeEventListener('mousemove', onMouseMove); canvas.removeEventListener('mouseup', onEnd); canvas.removeEventListener('mouseleave', onEnd) }
  }, [])

  useEffect(() => {
    const dn = e => {
      if (e.key==='ArrowLeft'||e.key==='a') inputRef.current.left=true
      if (e.key==='ArrowRight'||e.key==='d') inputRef.current.right=true
      if (e.key==='ArrowUp'||e.key==='w') inputRef.current.up=true
      if (e.key==='ArrowDown'||e.key==='s') inputRef.current.down=true
      if (e.key===' '||e.key==='f') triggerSpecial()
    }
    const up = e => {
      if (e.key==='ArrowLeft'||e.key==='a') inputRef.current.left=false
      if (e.key==='ArrowRight'||e.key==='d') inputRef.current.right=false
      if (e.key==='ArrowUp'||e.key==='w') inputRef.current.up=false
      if (e.key==='ArrowDown'||e.key==='s') inputRef.current.down=false
    }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  function triggerSpecial() {
    const g = gameRef.current
    if (!g || g.specialCharge < activeShip.stats.specialCharge || g.specialActive) return
    g.specialActive = true; g.specialCharge = 0; setSpecialCharge(0); setSpecialReady(false)
    const st = activeShip.stats.specialType
    if (st === 'bomb') {
      g.enemies.forEach(en => { g.score += en.points; spawnParticles(g, en.x, en.y, en.color, 15) })
      g.waveEnemiesKilled += g.enemies.length; g.enemies = []; g.enemyBullets = []
      g.shakeTimer = 20; spawnParticles(g, g.W/2, g.H/2, '#FFD700', 40); play('levelUp'); g.specialActive = false
    } else if (st === 'rapid') { g.rapidFireTimer = 300; play('click'); setTimeout(() => { if (g) g.specialActive = false }, 5000) }
    else if (st === 'shield') { g.player.shieldTimer = 480; play('click'); setTimeout(() => { if (g) g.specialActive = false }, 8000) }
    else if (st === 'firetrail') { g.fireTrailTimer = 360; play('click'); setTimeout(() => { if (g) g.specialActive = false }, 6000) }
    else if (st === 'cloak') { g.cloakTimer = 300; play('click'); setTimeout(() => { if (g) g.specialActive = false }, 5000) }
    else if (st === 'beam') { g.beamTimer = 180; play('levelUp'); setTimeout(() => { if (g) g.specialActive = false }, 3000) }
  }

  function spawnParticles(g, x, y, color, count) {
    for (let i = 0; i < count; i++) g.particles.push({ x, y, vx: rand(-4,4), vy: rand(-4,4), r: rand(1.5,5), color, life: rand(18,40), maxLife:40 })
  }
  function addFloatingText(g, x, y, text, color) { g.floatingTexts.push({ x, y, text, color, life:50, maxLife:50 }) }

  // ── GAME LOOP ──
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current, ctx = canvas.getContext('2d')
    const shipStats = activeShip.stats, shipDesign = activeShip.design

    function getFormationPositions(pattern, count, W) {
      const pos = [], cx = W/2, sp = 50
      if (pattern === 'v') { for (let i=0;i<count;i++){const row=Math.floor(i/2),side=i%2===0?-1:1;pos.push({x:cx+side*(row+1)*sp*0.6,y:-40-row*35,delay:row*8})} }
      else if (pattern === 'line') { const sx=cx-((count-1)*sp*0.5)/2;for(let i=0;i<count;i++)pos.push({x:sx+i*sp*0.5,y:-40,delay:i*5}) }
      else if (pattern === 'diamond') { const rows=[[0],[-1,1],[-2,0,2],[-1,1],[0]];let idx=0;for(let r=0;r<rows.length&&idx<count;r++)for(let c=0;c<rows[r].length&&idx<count;c++){pos.push({x:cx+rows[r][c]*sp*0.5,y:-40-r*35,delay:r*6});idx++} }
      else if (pattern === 'swarm') { for(let i=0;i<count;i++)pos.push({x:rand(40,W-40),y:rand(-200,-40),delay:Math.floor(rand(0,20))}) }
      else if (pattern === 'pincer') { const half=Math.ceil(count/2);for(let i=0;i<half;i++)pos.push({x:30+i*25,y:-40-i*30,delay:i*4});for(let i=0;i<count-half;i++)pos.push({x:W-30-i*25,y:-40-i*30,delay:i*4}) }
      else { const r=80;for(let i=0;i<count;i++){const a=(Math.PI*2*i)/count;pos.push({x:cx+Math.cos(a)*r,y:-100+Math.sin(a)*r*0.5,delay:i*3})} }
      return pos
    }

    function spawnWaveEnemies(g) {
      const wn = g.wave, count = Math.min(5 + Math.floor(wn*1.3), 20)
      g.waveEnemyTarget = count; g.waveEnemiesSpawned = 0; g.waveEnemiesKilled = 0; g.waveState = 'spawning'
      const formation = WAVE_FORMATIONS[wn % WAVE_FORMATIONS.length]
      const positions = getFormationPositions(formation.pattern, count, g.W)
      const maxTypeIdx = Math.min(Math.floor(wn/2)+1, ENEMY_TYPES.length-1)
      positions.forEach((pos) => {
        const et = ENEMY_TYPES[Math.floor(rand(0, maxTypeIdx+1))]
        const hpMult = 1 + Math.floor(wn/4)
        g.enemies.push({
          x:pos.x, y:pos.y-(pos.delay||0)*6, w:et.w, h:et.h, color:et.color, id:et.id,
          hp: cfg.enemyHP*hpMult+(et.id==='tank'?2:0), maxHp: cfg.enemyHP*hpMult+(et.id==='tank'?2:0),
          points: et.points+wn*3, shootRate: et.shootRate>0?Math.max(50,et.shootRate-wn*3):0,
          shootTimer: Math.floor(rand(60,200)), speed: cfg.enemySpeed+rand(-0.2,0.2)+wn*0.06+(et.id==='kamikaze'?1.5:0),
          movePattern:et.movePattern, wobble:rand(0,Math.PI*2), wobbleAmp:rand(0.3,1.5), swoopPhase:0, enterDelay:(pos.delay||0), entered:false,
        })
        g.waveEnemiesSpawned++
      })
    }

    function spawnBoss(g) {
      const wn = g.wave
      const bossTypes = [
        { name:'Scorpion', color:'#FF4757', accent:'#FF6B6B', w:90, h:70, patterns:3, imgId:'boss1.png' },
        { name:'Hydra', color:'#6C5CE7', accent:'#A29BFE', w:120, h:80, patterns:4, imgId:'boss2.png' },
        { name:'Inferno', color:'#FF8C00', accent:'#FFD700', w:110, h:100, patterns:5, imgId:'boss3.png' },
      ]
      const bt = bossTypes[Math.min(Math.floor(wn/3)-1, bossTypes.length-1)] || bossTypes[0]
      const hpScale = 1 + Math.floor(wn/3)*0.5
      g.boss = {
        x:g.W/2, y:-100, targetY:90, w:bt.w, h:bt.h, color:bt.color, accent:bt.accent, name:bt.name, img: ASSETS[bt.imgId],
        hp:Math.floor(cfg.bossHP*hpScale), maxHp:Math.floor(cfg.bossHP*hpScale),
        points:300+wn*80, shootTimer:0, attackCycle:0, patterns:bt.patterns,
        entered:false, movePhase:0, enraged:false,
      }
      g.bossSpawned = true; g.waveState = 'boss'
      vibrateHeavy()
    }

    function fireBullet(g) {
      const p = g.player, bw = 4, bh = 16
      const baseDmg = 1 + (g.cloakTimer > 0 && Math.random() < (shipStats.critChance||0) ? 1 : 0)
      const bulColor = shipDesign.body
      const baseCount = shipStats.bulletCount + (p.weaponLv >= 4 ? 2 : p.weaponLv >= 3 ? 2 : p.weaponLv >= 2 ? 1 : 0)
      const cnt = Math.min(baseCount, 5)
      if (cnt === 1) { g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:baseDmg, color:bulColor }) }
      else {
        for (let i=0;i<cnt;i++) {
          const spread = ((i/(cnt-1))-0.5)*(8+cnt*4)
          g.bullets.push({ x:p.x+spread, y:p.y-p.h/2+Math.abs(spread)*0.1, w:bw, h:bh, dmg:baseDmg, vx:spread*0.04, color:bulColor })
        }
      }
    }

    function spawnPowerup(g, x, y) {
      if (Math.random() > 0.28) return
      const r = Math.random()
      const type = r<0.05?POWERUP_TYPES[4]:r<0.20?POWERUP_TYPES[3]:r<0.40?POWERUP_TYPES[2]:r<0.60?POWERUP_TYPES[1]:POWERUP_TYPES[0]
      g.powerups.push({ x, y, type, vy:1.2, r:14, pulse:0 })
    }

    function endGame(g, won) {
      if (g.score > bestScore) { localStorage.setItem(`space-best-${difficulty.id}`, g.score); setBestScore(g.score) }
      if (g.wave > bestWave) { localStorage.setItem(`space-bestwave-${difficulty.id}`, g.wave); setBestWave(g.wave) }
      if (won) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 100) }
      setPhase(won ? 'win' : 'dead')
    }

    function moveEnemy(en, g) {
      if (en.enterDelay > 0) { en.enterDelay--; en.y += en.speed*0.3; return }
      en.entered = true
      const p = en.movePattern
      if (p==='straight') en.y += en.speed
      else if (p==='wobble') { en.y += en.speed; en.x += Math.sin(en.wobble)*en.wobbleAmp; en.wobble += 0.04 }
      else if (p==='zigzag') { en.y += en.speed*0.8; en.x += Math.sin(en.wobble)*2.5; en.wobble += 0.06 }
      else if (p==='slow') { en.y += en.speed*0.6; en.x += Math.sin(en.wobble)*0.5; en.wobble += 0.02 }
      else if (p==='swoop') { en.swoopPhase+=0.03; en.y += en.speed*(en.swoopPhase<Math.PI?0.5:1.5); en.x += Math.cos(en.swoopPhase)*3 }
      else if (p==='chase') { const dx=g.player.x-en.x; en.x+=Math.sign(dx)*Math.min(Math.abs(dx)*0.03,2); en.y+=en.speed*1.2 }
    }

    function update() {
      const g = gameRef.current; if (!g || phaseRef.current !== 'playing') return
      const p = g.player, inp = inputRef.current
      g.gameTime++; if (g.gameTime%60===0) setGameTime(Math.floor(g.gameTime/60))

      // Movement
      if (inp.touchActive && inp.touchX !== null) {
        const tx = inp.touchX-inp.touchOffsetX, ty = inp.touchY-inp.touchOffsetY
        const dx = tx-p.x, dy = ty-p.y
        if (Math.abs(dx)>2) p.x += dx*0.3; if (Math.abs(dy)>2) p.y += dy*0.3
      } else {
        const spd = (5 + shipStats.speed) / 2
        if (inp.left) p.x -= spd; if (inp.right) p.x += spd
        if (inp.up) p.y -= spd; if (inp.down) p.y += spd
      }
      p.x = clamp(p.x, p.w/2+4, g.W-p.w/2-4); p.y = clamp(p.y, p.h/2+50, g.H-30)
      if (p.shieldTimer>0) p.shieldTimer--; if (p.invTimer>0) p.invTimer--

      // Firing
      const fRate = g.rapidFireTimer>0 ? Math.max(2, Math.floor(shipStats.fireRate/3)) : shipStats.fireRate
      g.fireTimer++; if (g.fireTimer>=fRate) { g.fireTimer=0; fireBullet(g) }

      // Ability timers
      if (g.rapidFireTimer>0) g.rapidFireTimer--
      if (g.cloakTimer>0) g.cloakTimer--
      if (g.fireTrailTimer>0) { g.fireTrailTimer--; if(g.tick%2===0) g.trails.push({x:p.x+rand(-8,8),y:p.y+p.h/2,r:rand(4,8),color:g.tick%4<2?'#FF4500':'#FFD700',life:30,maxLife:30,dmg:true}) }
      if (g.beamTimer>0) {
        g.beamTimer--
        g.enemies = g.enemies.filter(en => { if(Math.abs(en.x-p.x)<30){en.hp-=0.5;if(en.hp<=0){g.score+=en.points;g.waveEnemiesKilled++;setScore(g.score);spawnParticles(g,en.x,en.y,en.color,10);spawnPowerup(g,en.x,en.y);return false}}return true })
        if (g.boss && Math.abs(g.boss.x-p.x)<40) g.boss.hp -= 0.3
      }
      g.specialCharge = Math.min(g.specialCharge, activeShip.stats.specialCharge)
      setSpecialCharge(g.specialCharge)
      if (g.specialCharge >= activeShip.stats.specialCharge && !g.specialActive) setSpecialReady(true)

      // Combo
      if (g.comboTimer>0) g.comboTimer--; else if (g.combo>0) { g.combo=0; setCombo(0) }

      g.bullets = g.bullets.filter(b => { b.y -= cfg.bulletSpeed; if (b.vx) b.x += b.vx; return b.y>-20 && b.x>-20 && b.x<g.W+20 })

      // Wave system
      if (g.waveState === 'spawning' && g.waveEnemiesSpawned === 0) spawnWaveEnemies(g)
      if ((g.waveState==='spawning'||g.waveState==='clearing') && g.enemies.length===0 && g.waveEnemiesSpawned>0) {
        if (g.wave%3===0 && !g.bossSpawned) spawnBoss(g)
        else { g.waveState='transition'; g.waveTransitionTimer=90 }
      }
      if (g.waveState==='transition') { g.waveTransitionTimer--; if(g.waveTransitionTimer<=0){ g.wave++;setWave(g.wave);g.bossSpawned=false;g.waveEnemiesSpawned=0;g.waveEnemiesKilled=0;g.waveState='spawning' } }

      // Enemies
      g.enemies = g.enemies.filter(en => {
        moveEnemy(en, g); if (en.y>g.H+60) return false
        if (en.shootRate>0 && en.entered && g.cloakTimer<=0) { en.shootTimer--; if(en.shootTimer<=0){en.shootTimer=en.shootRate+Math.floor(rand(-20,20));g.enemyBullets.push({x:en.x,y:en.y+en.h/2,w:5,h:10,vy:3+g.wave*0.12})} }
        for (let i=g.bullets.length-1;i>=0;i--) {
          const b = g.bullets[i]
          if (Math.abs(b.x-en.x)<en.w/2+b.w/2 && Math.abs(b.y-en.y)<en.h/2+b.h/2) {
            g.bullets.splice(i,1); en.hp -= b.dmg; spawnParticles(g,b.x,b.y,en.color,3); vibrateLight()
            if (en.hp<=0) {
              g.waveEnemiesKilled++; const cm=Math.min(1+g.combo*0.1,3); const pts=Math.floor(en.points*cm)
              g.score+=pts; setScore(g.score); g.combo++; g.comboTimer=90; setCombo(g.combo)
              if(g.combo>g.maxCombo) g.maxCombo=g.combo
              g.specialCharge=Math.min(g.specialCharge+8,activeShip.stats.specialCharge)
              addFloatingText(g,en.x,en.y,`+${pts}`,en.color)
              if(g.combo>1&&g.combo%5===0) addFloatingText(g,en.x,en.y-20,`🔥 ${g.combo}× COMBO!`,'#FFD700')
              spawnParticles(g,en.x,en.y,en.color,14); spawnPowerup(g,en.x,en.y); play('eat'); return false
            }; break
          }
        }
        // Fire trail damage
        if (g.fireTrailTimer>0) { g.trails.forEach(tr=>{if(tr.dmg&&Math.abs(tr.x-en.x)<en.w&&Math.abs(tr.y-en.y)<en.h)en.hp-=0.15}); if(en.hp<=0){g.waveEnemiesKilled++;g.score+=en.points;setScore(g.score);spawnParticles(g,en.x,en.y,'#FF4500',10);spawnPowerup(g,en.x,en.y);return false} }
        // Player collision
        if (p.shieldTimer<=0&&p.invTimer<=0&&g.cloakTimer<=0&&Math.abs(en.x-p.x)<(en.w+p.w)/2*0.7&&Math.abs(en.y-p.y)<(en.h+p.h)/2*0.7) {
          g.lives--;setLives(g.lives);g.shakeTimer=15;spawnParticles(g,p.x,p.y,'#FF6B6B',18);play('mismatch');vibrateHeavy();g.combo=0;setCombo(0)
          if(g.lives<=0){vibrateError();endGame(g,false);return false};p.invTimer=90;return false
        }; return true
      })

      // Boss
      if (g.boss) {
        const boss=g.boss
        if(!boss.entered){boss.y+=1.8;if(boss.y>=boss.targetY)boss.entered=true}
        else {
          boss.movePhase+=0.015; boss.x=g.W/2+Math.sin(boss.movePhase)*(g.W*0.3)
          if(boss.hp<boss.maxHp*0.3&&!boss.enraged){boss.enraged=true;spawnParticles(g,boss.x,boss.y,'#FF0000',25);addFloatingText(g,boss.x,boss.y-40,'⚠️ ENRAGED!','#FF0000')}
          const fi=boss.enraged?18:28; boss.shootTimer--
          if(boss.shootTimer<=0){
            boss.shootTimer=fi; boss.attackCycle=(boss.attackCycle+1)%boss.patterns
            const bx=boss.x,by=boss.y+boss.h/2,cy=boss.attackCycle
            if(cy===0) g.enemyBullets.push({x:bx,y:by,w:7,h:14,vy:4.5})
            else if(cy===1){g.enemyBullets.push({x:bx-25,y:by,w:6,h:12,vy:3.8});g.enemyBullets.push({x:bx+25,y:by,w:6,h:12,vy:3.8})}
            else if(cy===2){for(let i=-2;i<=2;i++)g.enemyBullets.push({x:bx+i*20,y:by,w:5,h:10,vy:3.5,vx:i*0.8})}
            else if(cy===3){const dx=p.x-bx,dy=p.y-by,d=Math.sqrt(dx*dx+dy*dy)||1;g.enemyBullets.push({x:bx,y:by,w:8,h:8,vy:dy/d*5,vx:dx/d*5,aimed:true})}
            else {for(let i=0;i<8;i++){const a=(Math.PI*2*i)/8;g.enemyBullets.push({x:bx,y:by,w:5,h:5,vy:Math.sin(a)*3.5,vx:Math.cos(a)*3.5,aimed:true})}}
          }
          for(let i=g.bullets.length-1;i>=0;i--){const b=g.bullets[i];if(Math.abs(b.x-boss.x)<boss.w/2+b.w/2&&Math.abs(b.y-boss.y)<boss.h/2+b.h/2){g.bullets.splice(i,1);boss.hp-=b.dmg;spawnParticles(g,b.x,b.y,boss.color,4);vibrateLight();g.specialCharge=Math.min(g.specialCharge+3,activeShip.stats.specialCharge);if(boss.hp<=0){g.score+=boss.points;setScore(g.score);addFloatingText(g,boss.x,boss.y,`+${boss.points} BOSS!`,'#FFD700');spawnParticles(g,boss.x,boss.y,boss.color,40);spawnParticles(g,boss.x,boss.y,'#FFD700',30);for(let j=0;j<3;j++)spawnPowerup(g,boss.x+rand(-40,40),boss.y+rand(-20,20));play('levelUp');vibrateSuccess();g.boss=null;g.bossSpawned=false;g.waveState='transition';g.waveTransitionTimer=120;break}}}
          if(boss&&p.shieldTimer<=0&&p.invTimer<=0&&g.cloakTimer<=0&&Math.abs(boss.x-p.x)<(boss.w+p.w)/2*0.6&&Math.abs(boss.y-p.y)<(boss.h+p.h)/2*0.6){g.lives-=2;setLives(Math.max(0,g.lives));g.shakeTimer=20;spawnParticles(g,p.x,p.y,'#FF6B6B',20);play('mismatch');vibrateHeavy();if(g.lives<=0){vibrateError();endGame(g,false);}p.invTimer=120}
        }
      }

      // Enemy bullets
      g.enemyBullets = g.enemyBullets.filter(eb => {
        eb.y+=(eb.vy||0);eb.x+=(eb.vx||0);if(eb.y>g.H+20||eb.y<-20||eb.x<-20||eb.x>g.W+20)return false
        if(p.shieldTimer<=0&&p.invTimer<=0&&g.cloakTimer<=0&&Math.abs(eb.x-p.x)<p.w/2+eb.w/2&&Math.abs(eb.y-p.y)<p.h/2+eb.h/2){
          g.lives--;setLives(g.lives);g.shakeTimer=10;spawnParticles(g,p.x,p.y,'#FF6B6B',10);play('mismatch');vibrateHeavy();g.combo=0;setCombo(0)
          if(g.lives<=0){vibrateError();endGame(g,false);return false};p.invTimer=60;return false
        };return true
      })

      // Powerups
      g.powerups = g.powerups.filter(pu => {
        pu.y+=pu.vy;pu.pulse+=0.08;if(pu.y>g.H+30)return false
        if(Math.abs(pu.x-p.x)<26&&Math.abs(pu.y-p.y)<26){
          if(pu.type.id==='weapon'){p.weaponLv=Math.min(p.weaponLv+1,5);setWeaponLv(p.weaponLv);addFloatingText(g,pu.x,pu.y,'⭐ WEAPON UP!','#FDCB6E')}
          else if(pu.type.id==='health'){g.lives=Math.min(g.lives+1,shipStats.maxHP+2);setLives(g.lives);addFloatingText(g,pu.x,pu.y,'❤️ +1 HP','#FF6B6B')}
          else if(pu.type.id==='shield'){p.shieldTimer=240;addFloatingText(g,pu.x,pu.y,'🛡️ SHIELD!','#74B9FF')}
          else if(pu.type.id==='coin'){g.coinsCollected+=5;g.score+=50;setScore(g.score);addFloatingText(g,pu.x,pu.y,'🪙 +5 COINS','#FFD700')}
          else if(pu.type.id==='mega'){p.weaponLv=Math.min(p.weaponLv+2,5);setWeaponLv(p.weaponLv);p.shieldTimer=180;g.specialCharge=activeShip.stats.specialCharge;addFloatingText(g,pu.x,pu.y,'💎 MEGA!','#A29BFE')}
          spawnParticles(g,pu.x,pu.y,pu.type.color,10);play('click');vibrateMedium();return false
        };return true
      })

      g.trails = g.trails.filter(tr => { tr.life--; tr.r*=0.97; return tr.life>0 })
      g.particles = g.particles.filter(pt => { pt.x+=pt.vx;pt.y+=pt.vy;pt.vx*=0.96;pt.vy*=0.96;pt.life--;return pt.life>0 })
      g.floatingTexts = g.floatingTexts.filter(ft => { ft.y-=1.2;ft.life--;return ft.life>0 })
      g.starLayers.forEach(l => l.stars.forEach(s => { s.y+=l.speed;if(s.y>g.H){s.y=0;s.x=rand(0,g.W)} }))
      g.nebulae.forEach(n => { n.y+=n.speed;if(n.y>g.H+n.r){n.y=-n.r;n.x=rand(0,g.W)} })

      if (g.wave > cfg.waveGoal && !g.boss && g.enemies.length===0) endGame(g, true)
      if (g.shakeTimer>0) g.shakeTimer--; g.tick++
    }

    function draw() {
      const g = gameRef.current; if (!g) return
      const W=g.W,H=g.H,p=g.player
      const sx=g.shakeTimer>0?rand(-4,4)*(g.shakeTimer/15):0,sy=g.shakeTimer>0?rand(-4,4)*(g.shakeTimer/15):0
      ctx.save(); ctx.translate(sx,sy)

      // BG
      const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#020118');grad.addColorStop(0.4,'#07071a');grad.addColorStop(1,'#050520')
      ctx.fillStyle=grad;ctx.fillRect(0,0,W,H)
      // Nebulae
      g.nebulae.forEach(n=>{const ng=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);ng.addColorStop(0,n.color);ng.addColorStop(1,'transparent');ctx.fillStyle=ng;ctx.fillRect(n.x-n.r,n.y-n.r,n.r*2,n.r*2)})
      // Stars
      g.starLayers.forEach(l=>l.stars.forEach(s=>{ctx.globalAlpha=s.alpha*(0.8+Math.sin(g.tick*0.02+s.x)*0.2);ctx.fillStyle=l.color;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}));ctx.globalAlpha=1

      // Trails
      g.trails.forEach(tr=>{ctx.globalAlpha=tr.life/tr.maxLife*0.6;ctx.fillStyle=tr.color;ctx.beginPath();ctx.arc(tr.x,tr.y,tr.r,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1

      // Beam
      if(g.beamTimer>0){const bW=26+Math.sin(g.tick*0.3)*8;ctx.globalAlpha=0.6;const bg2=ctx.createLinearGradient(p.x-bW/2,0,p.x+bW/2,0);bg2.addColorStop(0,'transparent');bg2.addColorStop(0.3,shipDesign.body+'CC');bg2.addColorStop(0.5,'#fff');bg2.addColorStop(0.7,shipDesign.body+'CC');bg2.addColorStop(1,'transparent');ctx.fillStyle=bg2;ctx.fillRect(p.x-bW/2,0,bW,p.y-p.h/2);ctx.globalAlpha=0.15;ctx.fillStyle=shipDesign.body;ctx.fillRect(p.x-bW,0,bW*2,p.y-p.h/2);ctx.globalAlpha=1}

      // Player
      const px=p.x,py=p.y,blink=p.invTimer>0&&Math.floor(p.invTimer/4)%2===0,cloaked=g.cloakTimer>0
      if(!blink){
        ctx.globalAlpha=cloaked?0.3:1
        if (g.shipImg && g.shipImg.complete && g.shipImg.naturalWidth > 0) {
          // Custom Ship PNG with flame beneath
          const fH=10+rand(0,8)+(g.rapidFireTimer>0?6:0)
          ctx.fillStyle=g.tick%4<2?'#FDCB6E':shipDesign.engine
          ctx.beginPath();ctx.moveTo(px-10,py+p.h/2-10);ctx.lineTo(px,py+p.h/2+fH*1.5);ctx.lineTo(px+10,py+p.h/2-10);ctx.closePath();ctx.fill()
          // Render PNG Image - drawn larger than hitbox
          ctx.drawImage(g.shipImg, px - p.w*0.8, py - p.h, p.w*1.6, p.h*2)
        } else {
          // Engines
          ctx.fillStyle=shipDesign.engine;ctx.beginPath();ctx.arc(px-10,py+p.h/2+2,7+rand(0,2),0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(px+10,py+p.h/2+2,7+rand(0,2),0,Math.PI*2);ctx.fill()
          ctx.globalAlpha=cloaked?0.3:1
          // Wings
          ctx.fillStyle=shipDesign.wing;ctx.beginPath();ctx.moveTo(px-p.w/2-8,py+p.h/3);ctx.lineTo(px-p.w/4,py-p.h/5);ctx.lineTo(px-p.w/4,py+p.h/3+2);ctx.closePath();ctx.fill()
          ctx.beginPath();ctx.moveTo(px+p.w/2+8,py+p.h/3);ctx.lineTo(px+p.w/4,py-p.h/5);ctx.lineTo(px+p.w/4,py+p.h/3+2);ctx.closePath();ctx.fill()
          // Body
          ctx.fillStyle=shipDesign.body;ctx.beginPath();ctx.moveTo(px,py-p.h/2-4);ctx.lineTo(px-p.w/3.5,py+p.h/3);ctx.lineTo(px+p.w/3.5,py+p.h/3);ctx.closePath();ctx.fill()
          ctx.fillStyle=shipDesign.accent+'33';ctx.beginPath();ctx.moveTo(px,py-p.h/2-4);ctx.lineTo(px-2,py+p.h/6);ctx.lineTo(px+p.w/6,py);ctx.closePath();ctx.fill()
          // Cockpit
          ctx.fillStyle=shipDesign.cockpit;ctx.beginPath();ctx.ellipse(px,py-6,5,7,0,0,Math.PI*2);ctx.fill()
          ctx.fillStyle='#fff';ctx.globalAlpha=cloaked?0.15:0.5;ctx.beginPath();ctx.arc(px-1.5,py-8,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=cloaked?0.3:1
          // Flames
          const fH=10+rand(0,8)+(g.rapidFireTimer>0?6:0)
          ctx.fillStyle=g.tick%4<2?'#FDCB6E':shipDesign.engine
          ctx.beginPath();ctx.moveTo(px-7,py+p.h/3);ctx.lineTo(px-3,py+p.h/2+fH*0.7);ctx.lineTo(px,py+p.h/3+2);ctx.closePath();ctx.fill()
          ctx.beginPath();ctx.moveTo(px,py+p.h/3+2);ctx.lineTo(px+3,py+p.h/2+fH*0.7);ctx.lineTo(px+7,py+p.h/3);ctx.closePath();ctx.fill()
          ctx.globalAlpha=cloaked?0.15:0.4;ctx.fillStyle='#FF6B6B';ctx.beginPath();ctx.moveTo(px-4,py+p.h/3);ctx.lineTo(px,py+p.h/2+fH);ctx.lineTo(px+4,py+p.h/3);ctx.closePath();ctx.fill();ctx.globalAlpha=1
        }
      }
      // Shield
      if(p.shieldTimer>0){const sa=p.shieldTimer<60?p.shieldTimer/60*0.3:0.2+Math.sin(g.tick*0.12)*0.1;ctx.globalAlpha=sa;ctx.strokeStyle='#74B9FF';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(px,py,p.w/2+14,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=sa*0.3;ctx.fillStyle='#74B9FF';ctx.beginPath();ctx.arc(px,py,p.w/2+14,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}

      // Bullets
      g.bullets.forEach(b=>{ctx.globalAlpha=0.12;ctx.fillStyle=b.color;ctx.fillRect(b.x-b.w/2-1,b.y,b.w+2,14);ctx.globalAlpha=1;ctx.fillStyle=b.color;ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);ctx.fillStyle='#fff';ctx.globalAlpha=0.65;ctx.fillRect(b.x-1,b.y-b.h/2,2,5);ctx.globalAlpha=1})

      // Enemies
      g.enemies.forEach(en=>{
        const ex=en.x,ey=en.y
        ctx.globalAlpha=0.06;ctx.fillStyle=en.color;ctx.beginPath();ctx.arc(ex,ey,en.w*1.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1
        if(en.id==='scout'||en.id==='kamikaze'){ctx.fillStyle=en.color;ctx.beginPath();ctx.moveTo(ex,ey+en.h/2);ctx.lineTo(ex-en.w/2,ey-en.h/3);ctx.lineTo(ex,ey-en.h/2+4);ctx.lineTo(ex+en.w/2,ey-en.h/3);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.globalAlpha=0.6;ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
        else if(en.id==='tank'){ctx.fillStyle=en.color;ctx.fillRect(ex-en.w/2,ey-en.h/2,en.w,en.h);ctx.fillStyle=en.color+'99';ctx.fillRect(ex-en.w/3,ey-en.h/2-4,en.w*0.66,4);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-6,ey,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+6,ey,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0a0a1a';ctx.beginPath();ctx.arc(ex-6,ey+1,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+6,ey+1,1.5,0,Math.PI*2);ctx.fill()}
        else if(en.id==='elite'){ctx.fillStyle=en.color;ctx.beginPath();ctx.moveTo(ex,ey-en.h/2);ctx.lineTo(ex+en.w/2,ey);ctx.lineTo(ex,ey+en.h/2);ctx.lineTo(ex-en.w/2,ey);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.globalAlpha=0.3;ctx.stroke();ctx.globalAlpha=1}
        else{ctx.fillStyle=en.color;ctx.beginPath();ctx.moveTo(ex,ey+en.h/2);ctx.lineTo(ex-en.w/2,ey-en.h/4);ctx.quadraticCurveTo(ex-en.w/3,ey-en.h/2,ex,ey-en.h/2+4);ctx.quadraticCurveTo(ex+en.w/3,ey-en.h/2,ex+en.w/2,ey-en.h/4);ctx.closePath();ctx.fill();ctx.fillStyle=en.color+'88';ctx.beginPath();ctx.moveTo(ex-en.w/2-6,ey);ctx.lineTo(ex-en.w/3,ey-en.h/4);ctx.lineTo(ex-en.w/3,ey+4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(ex+en.w/2+6,ey);ctx.lineTo(ex+en.w/3,ey-en.h/4);ctx.lineTo(ex+en.w/3,ey+4);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-5,ey-2,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+5,ey-2,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0a0a1a';ctx.beginPath();ctx.arc(ex-5,ey-1,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+5,ey-1,1.5,0,Math.PI*2);ctx.fill()}
        if(en.hp<en.maxHp){const bw2=en.w*0.9;ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(ex-bw2/2,ey-en.h/2-8,bw2,3);ctx.fillStyle=en.hp/en.maxHp>0.5?'#4ECDC4':en.hp/en.maxHp>0.25?'#FDCB6E':'#FF4757';ctx.fillRect(ex-bw2/2,ey-en.h/2-8,bw2*(en.hp/en.maxHp),3)}
      })

      // Boss
      if(g.boss){
        const b=g.boss;
        ctx.globalAlpha=0.08;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.w+30,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        if (b.img && b.img.complete && b.img.naturalWidth > 0) {
          // Render Boss PNG
          if(b.enraged){ ctx.globalAlpha=0.5; ctx.filter='drop-shadow(0 0 10px #ff0000) hue-rotate(45deg)'; ctx.drawImage(b.img, b.x - b.w*0.8, b.y - b.h*0.8, b.w*1.6, b.h*1.6); ctx.filter='none'; ctx.globalAlpha=1; }
          ctx.drawImage(b.img, b.x - b.w*0.8, b.y - b.h*0.8, b.w*1.6, b.h*1.6);
        } else {
          // Fallback primitive
          ctx.fillStyle=b.color;ctx.beginPath();ctx.ellipse(b.x,b.y,b.w/2,b.h/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=b.accent||b.color;ctx.beginPath();ctx.moveTo(b.x-b.w/2-15,b.y+5);ctx.lineTo(b.x-b.w/3,b.y-b.h/3);ctx.lineTo(b.x-b.w/3,b.y+b.h/4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(b.x+b.w/2+15,b.y+5);ctx.lineTo(b.x+b.w/3,b.y-b.h/3);ctx.lineTo(b.x+b.w/3,b.y+b.h/4);ctx.closePath();ctx.fill();ctx.fillStyle=b.enraged?'#FF0000':'#FFD700';ctx.beginPath();ctx.arc(b.x,b.y,12,0,Math.PI*2);ctx.fill();ctx.fillStyle=b.enraged?'#FF4444':'#FF0000';ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill();
        }
        if(b.enraged&&g.tick%8<4){ctx.globalAlpha=0.15;ctx.fillStyle='#FF0000';ctx.beginPath();ctx.arc(b.x,b.y,b.w+5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#FF00FF';ctx.lineWidth=1.5;ctx.globalAlpha=0.4;for(let i=0;i<3;i++){const a=rand(0,Math.PI*2);ctx.beginPath();ctx.moveTo(b.x,b.y);let cx2=b.x,cy2=b.y;for(let j=0;j<4;j++){cx2+=Math.cos(a)*12+rand(-8,8);cy2+=Math.sin(a)*12+rand(-8,8);ctx.lineTo(cx2,cy2)};ctx.stroke()};ctx.globalAlpha=1};
        const hpW2=b.w*1.2;ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(b.x-hpW2/2,b.y-b.h/2-25,hpW2,7);const hr=b.hp/b.maxHp;ctx.fillStyle=hr>0.5?b.color:hr>0.25?'#FDCB6E':'#FF4757';ctx.fillRect(b.x-hpW2/2,b.y-b.h/2-25,hpW2*hr,7);ctx.fillStyle='#fff';ctx.globalAlpha=0.5;ctx.font="bold 10px 'Nunito',sans-serif";ctx.textAlign='center';ctx.fillText(b.name,b.x,b.y-b.h/2-32);ctx.globalAlpha=1
      }

      // Enemy bullets
      g.enemyBullets.forEach(eb=>{ctx.globalAlpha=0.18;ctx.fillStyle='#FF6B6B';ctx.beginPath();ctx.arc(eb.x,eb.y,eb.w/2+5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=eb.aimed?'#FF00FF':'#FF6B6B';ctx.beginPath();ctx.arc(eb.x,eb.y,eb.w/2+1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.globalAlpha=0.45;ctx.beginPath();ctx.arc(eb.x,eb.y,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1})

      // Powerups
      g.powerups.forEach(pu=>{const pr=pu.r+Math.sin(pu.pulse)*3;ctx.globalAlpha=0.18;ctx.fillStyle=pu.type.glow;ctx.beginPath();ctx.arc(pu.x,pu.y,pr+10,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=pu.type.color;ctx.beginPath();ctx.arc(pu.x,pu.y,pr,0,Math.PI*2);ctx.fill();ctx.font=`${Math.round(pr)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pu.type.emoji,pu.x,pu.y)})

      // Particles
      g.particles.forEach(pt=>{ctx.globalAlpha=pt.life/pt.maxLife;ctx.fillStyle=pt.color;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r*(pt.life/pt.maxLife),0,Math.PI*2);ctx.fill()})
      // Floating texts
      g.floatingTexts.forEach(ft=>{ctx.globalAlpha=ft.life/ft.maxLife;ctx.fillStyle=ft.color;ctx.font="bold 13px 'Fredoka One',cursive";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ft.text,ft.x,ft.y)})
      // Wave transition
      if(g.waveState==='transition'&&g.waveTransitionTimer>30){const a2=Math.min(1,(g.waveTransitionTimer-30)/30);ctx.globalAlpha=a2;ctx.fillStyle='#fff';ctx.font="bold 28px 'Fredoka One',cursive";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`WAVE ${g.wave+1}`,W/2,H/2-10);ctx.font="14px 'Nunito',sans-serif";ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillText('Bersiaplah!',W/2,H/2+20)}
      if(g.waveState==='boss'&&g.boss&&!g.boss.entered){ctx.globalAlpha=0.8;ctx.fillStyle='#FF4757';ctx.font="bold 24px 'Fredoka One',cursive";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚠️ BOSS INCOMING!',W/2,H/2)}
      ctx.globalAlpha=1;ctx.restore()
    }

    let lastTime = 0
    function loop(ts) { if(phaseRef.current!=='playing')return;if(ts-lastTime>=14){update();draw();lastTime=ts};animRef.current=requestAnimationFrame(loop) }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase])

  // Report results
  useEffect(() => {
    if ((phase==='dead'||phase==='win') && score>0) {
      const won=phase==='win', stars=won?(wave>=cfg.waveGoal+3?3:wave>=cfg.waveGoal+1?2:1):(score>=cfg.baseScore*0.6?1:0)
      reportGameResult({gameId:'space-shooter',difficultyId:difficulty.id,won,score,stars,timeSec:gameTime})
      const g=gameRef.current, coinAmt=won?(cfg.lives===5?20:cfg.lives===4?35:55):Math.max(5,Math.min(Math.floor(score/8),25))
      earnCoins(coinAmt+(g?g.coinsCollected:0),`Space Shooter — ${won?'Menang':'skor'} ${score}`)
    }
  }, [phase])

  const DLABEL = { easy:'🟢 Mudah', medium:'🟡 Sedang', hard:'🔴 Sulit' }
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 500
  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <>
      {showTutorial && <TutorialModal steps={TUTORIAL_STEPS_SS} color="#4ECDC4" onClose={() => { setShowTutorial(false); localStorage.setItem('bp_tut_space-shooter','1') }} />}
      {showConfetti && <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />}

    <div style={{ width:'100%', height: typeof CSS !== 'undefined' && CSS.supports('height','100dvh') ? '100dvh' : '100vh', background:'#07071a', position:'relative', overflow:'hidden', userSelect:'none' }}>
      <div style={{ position:'absolute', inset:0, zIndex:1 }}><canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', touchAction:'none' }} /></div>

      {/* Playing HUD top */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:isMobile?'6px 8px':'10px 16px', background:'linear-gradient(to bottom,rgba(2,1,24,0.94),rgba(2,1,24,0.5),transparent)', pointerEvents:'none' }}>
          <button onClick={() => { play('click'); onBack() }} style={{ pointerEvents:'auto', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:10, padding:isMobile?'5px 9px':'7px 14px', color:'rgba(255,255,255,0.7)', fontSize:isMobile?13:15, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:700, WebkitTapHighlightColor:'transparent' }}>←</button>
          <div style={{ display:'flex', gap:isMobile?8:16, alignItems:'center' }}>
            {[{v:score,label:'SKOR',c:'#4ecdc4'},{v:`W${wave}`,label:'WAVE',c:'#A29BFE',raw:true},{v:fmtTime(gameTime),label:'WAKTU',c:'#FDCB6E',raw:true}].map(s=>(
              <div key={s.label} style={{textAlign:'center'}}><div style={{fontFamily:"'Fredoka One',cursive",fontSize:s.raw?(isMobile?11:14):(isMobile?15:19),color:s.c,lineHeight:1}}>{s.v}</div><div style={{fontSize:isMobile?7:9,color:'rgba(255,255,255,0.3)',fontWeight:700,letterSpacing:'0.5px'}}>{s.label}</div></div>
            ))}
          </div>
          <span style={{background:'rgba(162,155,254,0.1)',color:'#a29bfe',border:'1.5px solid rgba(162,155,254,0.2)',borderRadius:100,padding:isMobile?'3px 7px':'5px 12px',fontSize:isMobile?9:12,fontFamily:"'Fredoka One',cursive"}}>{DLABEL[difficulty.id]}</span>
        </div>
      )}

      {/* Bottom HUD */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:isMobile?'8px 10px':'10px 16px', background:'linear-gradient(to top,rgba(2,1,24,0.9),rgba(2,1,24,0.4),transparent)', pointerEvents:'none' }}>
          <div style={{display:'flex',alignItems:'center',gap:3}}>{[...Array(Math.max(0,Math.min(lives,10)))].map((_,i)=><span key={i} style={{fontSize:isMobile?12:16}}>❤️</span>)}</div>
          {combo > 1 && <div style={{background:'rgba(255,215,0,0.12)',border:'1px solid rgba(255,215,0,0.3)',borderRadius:100,padding:'3px 10px'}}><span style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?11:13,color:'#FFD700'}}>🔥 {combo}×</span></div>}
          <div style={{textAlign:'center'}}><div style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?10:12,color:'#FDCB6E'}}>Lv{weaponLv}</div><div style={{fontSize:7,color:'rgba(255,255,255,0.3)',fontWeight:700}}>SENJATA</div></div>
          <button onClick={triggerSpecial} style={{pointerEvents:'auto',width:isMobile?44:52,height:isMobile?44:52,borderRadius:'50%',background:specialReady?`linear-gradient(135deg,${activeShip.color},${activeShip.color}CC)`:'rgba(255,255,255,0.06)',border:`2px solid ${specialReady?activeShip.color:'rgba(255,255,255,0.1)'}`,color:'#fff',fontSize:isMobile?16:20,cursor:specialReady?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:specialReady?`0 0 20px ${activeShip.color}66`:'none',position:'relative',overflow:'hidden',WebkitTapHighlightColor:'transparent',animation:specialReady?'pulse-glow 1s ease infinite':'none'}}>
            <span style={{zIndex:2}}>⚡</span>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:`${(specialCharge/activeShip.stats.specialCharge)*100}%`,background:`${activeShip.color}33`,transition:'height 0.3s'}} />
          </button>
        </div>
      )}

      {/* Idle */}
      {phase === 'idle' && (
        <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(2,1,24,0.95)', padding:20, overflow:'auto' }}>
          <div style={{fontSize:isMobile?60:80,marginBottom:4,filter:`drop-shadow(0 0 24px ${activeShip.color})`}}>🚀</div>
          <h1 style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?26:36,color:'#fff',marginBottom:4,textShadow:`0 0 20px ${activeShip.color}`,textAlign:'center'}}>Space Shooter</h1>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:isMobile?11:13,marginBottom:14,textAlign:'center',maxWidth:320,lineHeight:1.7}}>Hancurkan wave demi wave musuh, kalahkan boss, dan capai wave {cfg.waveGoal}!</p>
          <div style={{background:'rgba(255,255,255,0.04)',border:`1.5px solid ${activeShip.color}44`,borderRadius:16,padding:isMobile?'12px 16px':'14px 22px',marginBottom:16,width:'100%',maxWidth:300}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <span style={{fontSize:28}}>{activeShip.icon}</span>
              <div><div style={{fontFamily:"'Fredoka One',cursive",fontSize:16,color:activeShip.color}}>{activeShip.name}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>SPD:{activeShip.stats.speed} • ATK:{12-activeShip.stats.fireRate} • HP:{activeShip.stats.maxHP}</div></div>
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.4}}>⚡ {activeShip.stats.specialType==='bomb'?'Bom Area':activeShip.stats.specialType==='rapid'?'Rapid Fire':activeShip.stats.specialType==='shield'?'Mega Shield':activeShip.stats.specialType==='firetrail'?'Fire Trail':activeShip.stats.specialType==='cloak'?'Stealth Cloak':activeShip.stats.specialType==='beam'?'Mega Beam':''} — Tap 2× atau Space/F</div>
          </div>
          <div style={{display:'flex',gap:isMobile?10:16,marginBottom:16,fontSize:isMobile?10:12,color:'rgba(255,255,255,0.3)',flexWrap:'wrap',justifyContent:'center'}}><span>🕹️ Geser/WASD</span><span>🔫 Auto-fire</span><span>⭐ Power-up</span><span>⚡ Special</span></div>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',justifyContent:'center'}}>
            <div style={{background:'rgba(78,205,196,0.08)',border:'1.5px solid rgba(78,205,196,0.2)',borderRadius:14,padding:isMobile?'7px 14px':'8px 18px',color:'rgba(78,205,196,0.6)',fontSize:isMobile?11:12,fontWeight:700}}>🎯 Wave: {cfg.waveGoal}</div>
            <div style={{background:'rgba(255,107,107,0.08)',border:'1.5px solid rgba(255,107,107,0.2)',borderRadius:14,padding:isMobile?'7px 14px':'8px 18px',color:'rgba(255,107,107,0.6)',fontSize:isMobile?11:12,fontWeight:700}}>❤️ HP: {Math.min(cfg.lives,activeShip.stats.maxHP)}</div>
          </div>
          {(bestScore>0||bestWave>0) && <div style={{display:'flex',gap:12,marginBottom:16,fontSize:12,color:'rgba(255,211,61,0.45)',fontWeight:600}}>{bestScore>0&&<span>🏆 Skor: {bestScore}</span>}{bestWave>0&&<span>📊 Wave: {bestWave}</span>}</div>}
          <button onClick={startGame} style={{background:`linear-gradient(135deg,${activeShip.color},#a29bfe)`,color:'#fff',border:'none',borderRadius:100,padding:isMobile?'14px 40px':'15px 50px',fontSize:isMobile?16:19,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:`0 0 36px ${activeShip.color}66`,WebkitTapHighlightColor:'transparent'}}>▶ Mulai Misi</button>
          <button onClick={()=>{play('click');onBack()}} style={{marginTop:12,background:'transparent',color:'rgba(255,255,255,0.35)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'10px 24px',fontSize:13,fontWeight:700,fontFamily:"'Fredoka One',cursive",cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>← Kembali</button>
        </div>
      )}

      {/* Win */}
      {phase === 'win' && (
        <div style={{position:'absolute',inset:0,zIndex:20,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(2,1,24,0.95)',animation:'fadeIn 0.3s ease',padding:20}}>
          <div style={{fontSize:isMobile?56:68,marginBottom:8}}>🏆</div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?24:32,color:'#FDCB6E',marginBottom:4,textShadow:'0 0 20px #FDCB6E44'}}>Misi Selesai!</h2>
          <p style={{color:'rgba(255,255,255,0.35)',marginBottom:16,fontSize:isMobile?11:13}}>Semua wave berhasil dikalahkan!</p>
          <div style={{fontSize:30,marginBottom:14,letterSpacing:4}}>{'⭐'.repeat(wave>=cfg.waveGoal+3?3:wave>=cfg.waveGoal+1?2:1)}{'☆'.repeat(3-(wave>=cfg.waveGoal+3?3:wave>=cfg.waveGoal+1?2:1))}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:18,width:'100%',maxWidth:300}}>
            {[{label:'Skor',value:score,c:'#4ecdc4'},{label:'Wave',value:wave,c:'#A29BFE'},{label:'Waktu',value:fmtTime(gameTime),c:'#FDCB6E'},{label:'Max Combo',value:gameRef.current?.maxCombo||0,c:'#FF6B6B'}].map(s=>(
              <div key={s.label} style={{background:'rgba(255,255,255,0.04)',border:`1.5px solid ${s.c}22`,borderRadius:14,padding:'12px 16px',textAlign:'center'}}><div style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?18:24,color:s.c}}>{s.value}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2,fontWeight:600}}>{s.label}</div></div>
            ))}
          </div>
          {score>=bestScore&&bestScore>0&&<div style={{marginBottom:14,background:'rgba(255,211,61,0.08)',border:'1.5px solid rgba(255,211,61,0.25)',borderRadius:100,padding:'6px 18px',color:'#ffd93d',fontSize:12,fontWeight:700}}>🏆 Rekor Baru!</div>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={startGame} style={{background:`linear-gradient(135deg,${activeShip.color},#a29bfe)`,color:'#fff',border:'none',borderRadius:100,padding:isMobile?'12px 26px':'13px 32px',fontSize:isMobile?14:16,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:`0 0 22px ${activeShip.color}55`,WebkitTapHighlightColor:'transparent'}}>🔄 Main Lagi</button>
            <button onClick={()=>{play('click');onBack()}} style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:isMobile?'12px 16px':'13px 20px',fontSize:isMobile?13:14,fontWeight:700,fontFamily:"'Fredoka One',cursive",cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>🏠 Home</button>
          </div>
        </div>
      )}

      {/* Dead */}
      {phase === 'dead' && (
        <div style={{position:'absolute',inset:0,zIndex:20,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(2,1,24,0.95)',animation:'fadeIn 0.3s ease',padding:20}}>
          <div style={{fontSize:isMobile?56:68,marginBottom:8}}>💀</div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?24:32,color:'#ff6b6b',marginBottom:4,textShadow:'0 0 20px #ff6b6b44'}}>Game Over!</h2>
          <p style={{color:'rgba(255,255,255,0.35)',marginBottom:16,fontSize:isMobile?11:13}}>Pesawatmu hancur di wave {wave}!</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:18,width:'100%',maxWidth:300}}>
            {[{label:'Skor',value:score,c:'#4ecdc4'},{label:'Wave',value:wave,c:'#A29BFE'},{label:'Waktu',value:fmtTime(gameTime),c:'#FDCB6E'},{label:'Max Combo',value:gameRef.current?.maxCombo||0,c:'#FF6B6B'}].map(s=>(
              <div key={s.label} style={{background:'rgba(255,255,255,0.04)',border:`1.5px solid ${s.c}22`,borderRadius:14,padding:'12px 16px',textAlign:'center'}}><div style={{fontFamily:"'Fredoka One',cursive",fontSize:isMobile?18:24,color:s.c}}>{s.value}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2,fontWeight:600}}>{s.label}</div></div>
            ))}
          </div>
          {score>=bestScore&&bestScore>0&&<div style={{marginBottom:14,background:'rgba(255,211,61,0.08)',border:'1.5px solid rgba(255,211,61,0.25)',borderRadius:100,padding:'6px 18px',color:'#ffd93d',fontSize:12,fontWeight:700}}>🏆 Rekor Baru!</div>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={startGame} style={{background:`linear-gradient(135deg,${activeShip.color},#a29bfe)`,color:'#fff',border:'none',borderRadius:100,padding:isMobile?'12px 26px':'13px 32px',fontSize:isMobile?14:16,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:`0 0 22px ${activeShip.color}55`,WebkitTapHighlightColor:'transparent'}}>🔄 Main Lagi</button>
            <button onClick={()=>{play('click');onBack()}} style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:isMobile?'12px 16px':'13px 20px',fontSize:isMobile?13:14,fontWeight:700,fontFamily:"'Fredoka One',cursive",cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>🏠 Home</button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}@keyframes pulse-glow{0%,100%{box-shadow:0 0 10px #4ecdc444}50%{box-shadow:0 0 24px #4ecdc488}}`}</style>
    </div>
    </>
  )
}
