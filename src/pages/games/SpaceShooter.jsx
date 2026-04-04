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
import { useThemeColors } from '../../hooks/useThemeColors.js'
import { WinModal, LoseModal } from '../../components/GameLayout.jsx'
import { useLeaderboard } from '../../context/LeaderboardContext.jsx'

const CFG = {
  easy:   { spawnRate:80, enemySpeed:1.2, enemyHP:1, bossHP:18, bulletSpeed:7, lives:5, waveGoal:5, baseScore:300 },
  medium: { spawnRate:55, enemySpeed:1.8, enemyHP:2, bossHP:28, bulletSpeed:8, lives:4, waveGoal:7, baseScore:500 },
  hard:   { spawnRate:28, enemySpeed:2.8, enemyHP:4, bossHP:45, bulletSpeed:10, lives:3, waveGoal:20, baseScore:1200 },
}

const ENEMY_TYPES = [
  { id:'scout',   w:28, h:28, color:'#FFD93D', points:10, shootRate:0,   movePattern:'straight' },
  { id:'phantom', w:26, h:26, color:'rgba(0,245,255,0.4)', points:35, shootRate:200, movePattern:'zigzag', phantom:true },
  { id:'fighter', w:32, h:32, color:'#FF6B6B', points:20, shootRate:180, movePattern:'wobble' },
  { id:'bomber',  w:38, h:38, color:'#A29BFE', points:30, shootRate:130, movePattern:'zigzag', spread:true },
  { id:'tank',    w:42, h:42, color:'#FD79A8', points:40, shootRate:160, movePattern:'slow' },
  { id:'elite',   w:36, h:36, color:'#00CEC9', points:50, shootRate:100, movePattern:'swoop', spread:true, aimed:true },
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
  boss3: null,
  bossSkull: null,
  bossFortress: null,
}

export default function SpaceShooter({ onBack, onHome, game, difficulty }) {
  useEffect(() => {
    // Preload boss assets
    ['boss1.png', 'boss2.png', 'boss3.png'].forEach(src => {
      if (!ASSETS[src.split('.')[0]]) {
        const img = new Image()
        img.src = '/' + src
        ASSETS[src.split('.')[0]] = img
      }
    })
    // User assets
    const skull = new Image(); skull.src = '/enemies/boss_skull.png'; ASSETS.bossSkull = skull
    const fortress = new Image(); fortress.src = '/enemies/boss_fortress.png'; ASSETS.bossFortress = fortress
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
  const { startScoreSession } = useLeaderboard()
  const tc = useThemeColors()

  const cfg = CFG[difficulty.id]
  const activeShip = getActiveShip()

  const [phase, _setPhase]             = useState('idle')
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('bp_tut_space-shooter'))
  const [showConfetti, setShowConfetti] = useState(false)
  const [score, setScore]               = useState(0)
  const [lives, setLives]               = useState(cfg.lives)
  const [vScore, setVScore]             = useState(0)
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
      omegaBeamTimer:0, emeraldBarrageTimer:0, shockwaveY:-1, timeWarpTimer:0,
      isBossRush: false, rushLevel: 0,
      formationSway: 0, waveTimer: 60,
    }
  }

  function startGame(rush = false) {
    const { w, h } = sizeCanvas(); if (w === 0 || h === 0) return
    gameRef.current = initGame(w, h)
    gameRef.current.isBossRush = rush
    inputRef.current = { left:false, right:false, up:false, down:false, touchActive:false, touchX:null, touchY:null, touchOffsetX:0, touchOffsetY:0, doubleTap:0 }
    setScore(0); setLives(gameRef.current.lives); setWeaponLv(1); setWave(1)
    setSpecialReady(false); setSpecialCharge(0); setGameTime(0); setCombo(0)
    if (startScoreSession) startScoreSession(game.id)
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
    else if (st === 'emerald-barrage') { g.emeraldBarrageTimer = 60; play('levelUp'); setTimeout(() => { if (g) g.specialActive = false }, 1000) }
    else if (st === 'golden-shockwave') { g.shockwaveY = g.player.y; play('levelUp'); setTimeout(() => { if (g) g.specialActive = false }, 1500) }
    else if (st === 'time-warp') { g.timeWarpTimer = 300; play('levelUp'); setTimeout(() => { if (g) g.specialActive = false }, 5000) }
    else if (st === 'omega-beam') { g.omegaBeamTimer = 240; g.shakeTimer = 240; play('levelUp'); setTimeout(() => { if (g) g.specialActive = false }, 4000) }
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
      const pos = [], cx = W/2, margin = 40
      const safeW = W - margin * 2
      const sp = Math.min(50, safeW / 5)

      if (pattern === 'grid') {
        const cols = Math.min(count, 6), rows = Math.ceil(count / cols)
        const spacing = Math.min(sp, safeW / (cols - 1 || 1))
        const totalW = (cols - 1) * spacing
        const sx = cx - totalW / 2
        for (let i = 0; i < count; i++) {
          const r = Math.floor(i / cols), c = i % cols
          pos.push({ x: clamp(sx + c * spacing, margin, W - margin), y: 80 + r * 50, delay: Math.floor(i / cols) * 10 })
        }
      }
      else if (pattern === 'v') {
        const rows = Math.ceil(count / 2)
        const spacing = Math.min(sp * 0.6, safeW / 4)
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / 2), side = i % 2 === 0 ? -1 : 1
          pos.push({ x: clamp(cx + side * (row + 1) * spacing, margin, W - margin), y: 60 + row * 35, delay: row * 8 })
        }
      }
      else if (pattern === 'line') {
        const spacing = Math.min(sp * 0.5, safeW / (count - 1 || 1))
        const sx = cx - ((count - 1) * spacing) / 2
        for (let i = 0; i < count; i++) pos.push({ x: clamp(sx + i * spacing, margin, W - margin), y: 60, delay: i * 5 })
      }
      else if (pattern === 'diamond') {
        const rows = [[0], [-1, 1], [-2, 0, 2], [-1, 1], [0]]; let idx = 0
        const spacing = Math.min(sp * 0.5, safeW / 5)
        for (let r = 0; r < rows.length && idx < count; r++) {
          for (let c = 0; c < rows[r].length && idx < count; c++) {
            pos.push({ x: clamp(cx + rows[r][c] * spacing, margin, W - margin), y: 60 + r * 35, delay: r * 6 })
            idx++
          }
        }
      }
      else if (pattern === 'swarm') {
        for (let i = 0; i < count; i++) pos.push({ x: rand(margin, W - margin), y: rand(60, 200), delay: Math.floor(rand(0, 20)) })
      }
      else if (pattern === 'pincer') {
        const half = Math.ceil(count / 2)
        const spacing = Math.min(25, safeW / (half * 2))
        for (let i = 0; i < half; i++) pos.push({ x: clamp(60 + i * spacing, margin, W - margin), y: 60 + i * 30, delay: i * 4 })
        for (let i = 0; i < count - half; i++) pos.push({ x: clamp(W - 60 - i * spacing, margin, W - margin), y: 60 + i * 30, delay: i * 4 })
      }
      else if (pattern === 'ceremony') {
        const rows = 2, cols = Math.ceil(count / 2)
        const spacingX = safeW / (cols + 1)
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (r * cols + c < count) {
              pos.push({ x: clamp(margin + spacingX * (c + 1), margin, W - margin), y: 80 + r * 60, delay: 0 })
            }
          }
        }
      }
      else {
        const r = Math.min(80, safeW / 3)
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count
          pos.push({ x: clamp(cx + Math.cos(a) * r, margin, W - margin), y: 140 + Math.sin(a) * r * 0.5, delay: i * 3 })
        }
      }
      return pos
    }

    function spawnWaveEnemies(g) {
      const wn = g.wave
      let count = Math.min(5 + Math.floor(wn*1.3), 20)
      if (difficulty.id === 'hard') count = Math.min(8 + Math.floor(wn*1.8), 22) // Reduced max from 26 to 22
      
      g.waveEnemyTarget = count; g.waveEnemiesSpawned = 0; g.waveEnemiesKilled = 0; g.waveState = 'spawning'
      const formation = WAVE_FORMATIONS[wn % WAVE_FORMATIONS.length]
      const positions = getFormationPositions(formation.pattern, count, g.W)
      const maxTypeIdx = Math.min(Math.floor(wn/2)+1, ENEMY_TYPES.length-1)
      
      positions.forEach((pos) => {
        const et = ENEMY_TYPES[Math.floor(rand(0, maxTypeIdx+1))]
        const hpMult = 1 + Math.floor(wn/4)
        const entryTypes = (wn % 3 === 1 || wn === 1) ? ['ceremony', 'spiral'] : ['s-curve', 'side-slide', 'spiral', 'turbo-drop', 'pincer', 'diagonal']
        const entryType = entryTypes[Math.floor(Math.random() * (wn > 2 ? entryTypes.length : 1))] 
        
        // Initial setup based on entry type
        let startX = pos.x, startY = pos.y - (pos.delay||0)*6
        if (entryType === 'ceremony') { startX = pos.x; startY = -g.H * 0.2 }
        else if (entryType === 'side-slide') {
          startX = Math.random() < 0.5 ? -40 : g.W + 40
          startY = pos.y
        } else if (entryType === 'spiral') {
          startX = pos.x + (Math.random() < 0.5 ? -150 : 150)
          startY = -100
        } else if (entryType === 's-curve') {
          startX = Math.random() < 0.5 ? 0 : g.W
          startY = -80
        } else if (entryType === 'turbo-drop') {
          startY = -150
        } else if (entryType === 'pincer') {
          startX = pos.x < g.W/2 ? -100 : g.W + 100
          startY = pos.y - 100
        } else if (entryType === 'diagonal') {
          startX = pos.x < g.W/2 ? -200 : g.W + 200
          startY = -100
        } else if (entryType === 'ceremony') {
          startX = pos.x
          startY = -150
        }

        g.enemies.push({
          x:startX, y:startY, targetX: pos.x, targetY: pos.y, w:et.w, h:et.h, color:et.color, id:et.id,
          hp: Math.floor(cfg.enemyHP*hpMult+(et.id==='tank'?2:0)), 
          maxHp: Math.floor(cfg.enemyHP*hpMult+(et.id==='tank'?2:0)),
          points: et.points+wn*3, shootRate: et.shootRate>0?Math.max(50,et.shootRate-wn*3):0,
          shootTimer: Math.floor(rand(60,200)), speed: cfg.enemySpeed+rand(-0.2,0.2)+wn*0.06+(et.id==='kamikaze'?1.5:0),
          movePattern:et.movePattern, wobble:rand(0,Math.PI*2), wobbleAmp:rand(0.3,1.5), swoopPhase:0, 
          enterDelay:(pos.delay||0), entered:false, entryType, entryStep: 0,
          phantom: et.phantom, spread: et.spread, aimed: et.aimed
        })
        g.waveEnemiesSpawned++
      })
    }

    function spawnBoss(g) {
      const wn = g.wave
      const bossTypes = [
        { name:'Scorpion', color:'#FF4757', accent:'#FF6B6B', w:90, h:70, patterns:3, img: ASSETS.boss1 },
        { name:'Hydra', color:'#6C5CE7', accent:'#A29BFE', w:120, h:80, patterns:4, img: ASSETS.boss2 },
        { name:'Skull Overlord', color:'#FFD700', accent:'#FFD700', w:100, h:100, patterns:4, img: ASSETS.bossSkull },
        { name:'Inferno', color:'#FF8C00', accent:'#FFD700', w:110, h:100, patterns:5, img: ASSETS.boss3 },
        { name:'Iron Fortress', color:'#74B9FF', accent:'#FFFFFF', w:160, h:110, patterns:5, img: ASSETS.bossFortress },
      ]
      let bt
      if (g.isBossRush) {
        bt = bossTypes[g.rushLevel % bossTypes.length]
        g.rushLevel++
      } else {
        bt = bossTypes[Math.min(Math.floor(wn/3)-1, bossTypes.length-1)] || bossTypes[0]
      }
      const hpScale = g.isBossRush ? (1 + (g.rushLevel-1)*0.4) : (1 + Math.floor(wn/3)*0.5)
      g.boss = {
        x:g.W/2, y:-100, targetY:90, w:bt.w, h:bt.h, color:bt.color, accent:bt.accent, name:bt.name, img: bt.img,
        hp:Math.floor(cfg.bossHP*hpScale), maxHp:Math.floor(cfg.bossHP*hpScale),
        points:g.isBossRush ? 500 : (300+wn*80), shootTimer:0, attackCycle:0, patterns:bt.patterns,
        entered:false, movePhase:0, enraged:false,
      }
      g.bossSpawned = true; g.waveState = 'boss'
      vibrateHeavy()
    }

    function fireBullet(g) {
      const p = g.player, bw = 4, bh = 16
      const baseDmg = 1 + (g.cloakTimer > 0 && Math.random() < (shipStats.critChance||0) ? 1 : 0)
      const bulColor = shipDesign.body || activeShip.color
      
      // Get ship-specific weapon evolution
      const weaponLv = Math.min(p.weaponLv || 1, 5)
      const evo = activeShip.weaponEvolution?.[weaponLv] || { type: activeShip.bulletType || 'standard', count: 1 + Math.floor(weaponLv/2) }
      const bt = evo.type

      if (bt === 'guided') {
        const cnt = evo.count || 1
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 15
          g.bullets.push({ x:p.x + spread, y:p.y - p.h/2, w:6, h:12, dmg:baseDmg, type:'guided', color:'#00F5FF', vx:spread*0.1 })
        }
        play('shoot'); return
      }

      if (bt === 'needle') {
        const cnt = evo.count || 1
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 12
          g.bullets.push({ x:p.x + spread, y:p.y - p.h/2, w:2, h:24, dmg:baseDmg*1.2, type:'needle', color:'#00FF88', vy:14 })
        }
        play('shoot'); return
      }

      if (bt === 'heavy-shock') {
        const cnt = evo.count || 1
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 25
          g.bullets.push({ x:p.x + spread, y:p.y - p.h/2, w:10, h:10, dmg:baseDmg*3, type:'heavy-shock', color:'#FF6B6B', vy:5 })
        }
        play('shoot'); return
      }

      if (bt === 'blossom') {
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12
          g.bullets.push({ x:p.x, y:p.y-p.h/2, w:10, h:10, dmg:baseDmg*2, type:'petal', vx:Math.cos(ang)*5, vy:Math.sin(ang)*5, color:'#00FF88' })
        }
        play('shoot'); return
      }

      if (bt === 'tsunami') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:60, h:12, dmg:baseDmg*2.5, type:'wave', color:'#FFD700' })
        play('shoot'); return
      }

      if (bt === 'omega-blast') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:80, h:40, dmg:baseDmg*5, type:'flare', color:'#FFF200' })
        play('shoot'); return
      }

      if (bt === 'fire-spiral') {
        for (let i = -1; i <= 1; i++) {
          g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw+2, h:bh+2, dmg:baseDmg*1.5, type:'spiral', vx:i*1.5, color:'#FF7675' })
        }
        play('shoot'); return
      }

      if (bt === 'star-guided') {
        const cnt = evo.count || 3
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 15
          g.bullets.push({ x:p.x + spread, y:p.y-p.h/2, w:8, h:8, dmg:baseDmg, type:'guided', color:'#FFF200', vy:10 })
        }
        play('shoot'); return
      }

      if (bt === 'ice-needle') {
        const cnt = evo.count || 2
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 12
          g.bullets.push({ x:p.x + spread, y:p.y - p.h/2, w:2, h:28, dmg:baseDmg*1.4, type:'needle', color:'#74B9FF', vy:15 })
        }
        play('shoot'); return
      }

      if (bt === 'ice-shard') {
        const cnt = evo.count || 2
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 20
          g.bullets.push({ x:p.x + spread, y:p.y - p.h/2, w:12, h:20, dmg:baseDmg*2, type:'plasma', color:'#A2D9FF', vy:12 })
          // Smaller shards
          g.bullets.push({ x:p.x + spread, y:p.y-p.h/2, w:4, h:4, vx:rand(-2,2), vy:rand(8,12), color:'#fff', dmg:0.5 })
        }
        play('shoot'); return
      }

      if (bt === 'ghost-pulse') {
        const cnt = evo.count || 2
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt-1)/2) * 20
          g.bullets.push({ x:p.x+spread, y:p.y-p.h/2, w:bw+2, h:bh+4, dmg:baseDmg*1.5, type:'ghost', color:'rgba(162,155,254,0.3)' })
        }
        play('shoot'); return
      }

      // Existing / Legacy bullet types
      if (bt === 'burst-3') {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (gameRef.current && phaseRef.current === 'playing') {
              gameRef.current.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:baseDmg, color:bulColor })
              play('shoot')
            }
          }, i * 60)
        }
        return
      }

      if (bt === 'wave') {
        const cnt = evo.count || 1
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt-1)/2) * 30
          g.bullets.push({ x:p.x + spread, y:p.y-p.h/2, w:bw*3, h:bh, dmg:baseDmg*1.5, type:'wave', color:bulColor })
        }
      } else if (bt === 'plasma') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw*4, h:bh*2, dmg:baseDmg*2, type:'plasma', color:bulColor })
      } else if (bt === 'spiral') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:baseDmg, type:'spiral', phase:0, color:bulColor })
      } else if (bt === 'heavy') {
        const cnt = evo.count || 2
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 15
          g.bullets.push({ x:p.x + spread, y:p.y-p.h/2, w:bw+2, h:bh+4, dmg:baseDmg*1.2, color:bulColor })
        }
      } else if (bt === 'fire') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:baseDmg*0.8, type:'fire', color:'#FF7675' })
      } else if (bt === 'pulse') {
        const cnt = evo.count || 1
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt - 1) / 2) * 10
          g.bullets.push({ x:p.x + spread, y:p.y-p.h/2, w:bw+2, h:bh, dmg:baseDmg, type:'pulse', color:bulColor })
        }
      } else if (bt === 'petal') {
        const cnt = evo.count || 3
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt-1)/2) * 1.5
          g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw+4, h:bh-4, dmg:baseDmg, vx:spread, type:'petal', color:bulColor })
        }
      } else if (bt === 'ghost') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:baseDmg*3, type:'ghost', color:'rgba(255,255,255,0.2)' })
      } else if (bt === 'flare') {
        const cnt = evo.count || 1
        for (let i = 0; i < cnt; i++) {
          const spread = (i - (cnt-1)/2) * 20
          g.bullets.push({ x:p.x+spread, y:p.y-p.h/2, w:bw*5, h:bh*3, dmg:baseDmg*4, type:'flare', color:'#FAB1A0' })
        }
      } else if (bt === 'cluster') {
        g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw+2, h:bh+2, dmg:baseDmg, type:'cluster', color:bulColor })
      } else {
        // Standard / Spread logic
        const cnt = evo.count || 1
        const isSpread = evo.spread || false
        if (cnt === 1) { g.bullets.push({ x:p.x, y:p.y-p.h/2, w:bw, h:bh, dmg:baseDmg, color:bulColor }) }
        else {
          for (let i=0;i<cnt;i++) {
            const spread = ((i/(cnt-1))-0.5)*(isSpread ? 24 : 12)
            g.bullets.push({ x:p.x+spread, y:p.y-p.h/2+Math.abs(spread)*0.1, w:bw, h:bh, dmg:baseDmg, vx:isSpread ? spread*0.04 : 0, color:bulColor })
          }
        }
      }
      play('shoot')
    }

    function spawnPowerup(g, x, y) {
      if (Math.random() > 0.28) return
      const r = Math.random()
      const type = r<0.05?POWERUP_TYPES[4]:r<0.20?POWERUP_TYPES[3]:r<0.40?POWERUP_TYPES[2]:r<0.60?POWERUP_TYPES[1]:POWERUP_TYPES[0]
      g.powerups.push({ x, y, type, vy:1.2, r:14, pulse:0 })
    }

    function createFirework(g, x, y, color) {
      for (let i = 0; i < 24; i++) {
        const ang = rand(0, Math.PI * 2)
        const spd = rand(2, 6)
        g.particles.push({
          x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 1.0, color, size: rand(2, 4), type: 'sparkle'
        })
      }
    }

    function applyPowerup(g, typeId) {
      addFloatingText(g, g.player.x, g.player.y, `POWER UP: ${typeId.toUpperCase()}!`, '#00FF00')
      
      switch(typeId) {
        case 'health':
          g.lives = Math.min(activeShip.stats.maxHP || 5, g.lives + 1)
          setLives(g.lives)
          spawnParticles(g, g.player.x, g.player.y, '#00FF00', 15)
          break
        case 'shield':
          g.player.shieldTimer = 600 // 10 seconds
          spawnParticles(g, g.player.x, g.player.y, '#00FFFF', 15)
          break
        case 'weapon':
          g.player.weaponLv = Math.min(5, (g.player.weaponLv || 1) + 1)
          setWeaponLv(g.player.weaponLv)
          spawnParticles(g, g.player.x, g.player.y, '#FFD700', 15)
          break
        case 'coin':
          g.coinsCollected = (g.coinsCollected || 0) + 10
          g.score += 150
          setScore(g.score)
          spawnParticles(g, g.player.x, g.player.y, '#FFD700', 15)
          break
        case 'mega':
          // Wipe all enemies & fill special charge
          g.enemies.forEach(en => { g.score += en.points; spawnParticles(g, en.x, en.y, en.color, 15) })
          g.waveEnemiesKilled += g.enemies.length; g.enemies = []; g.enemyBullets = []
          g.specialCharge = activeShip.stats.specialCharge
          setSpecialCharge(g.specialCharge)
          g.shakeTimer = 20; spawnParticles(g, g.W/2, g.H/2, '#A29BFE', 40); play('levelUp')
          break
        default:
          break
      }
    }

    function endGame(g, won) {
      if (g.score > bestScore) { localStorage.setItem(`space-best-${difficulty.id}`, g.score); setBestScore(g.score) }
      if (g.wave > bestWave) { localStorage.setItem(`space-bestwave-${difficulty.id}`, g.wave); setBestWave(g.wave) }
      if (won) {
        setVScore(0)
        setPhase('victory_sequence')
        play('victory')
      } else {
        setPhase('dead')
      }
    }

    function moveEnemy(en, g) {
      const timeSlow = g.timeWarpTimer > 0 ? 0.3 : 1.0
      const spd = en.speed * timeSlow

      if (!en.entered) {
        if (en.enterDelay > 0) { en.enterDelay--; return }
        
        en.entryStep += 0.02 * timeSlow
        const t = en.entryStep
        
        if (en.entryType === 'side-slide') {
          en.x += (en.targetX - en.x) * 0.1
          if (Math.abs(en.x - en.targetX) < 2) { en.x = en.targetX; en.entered = true }
        } else if (en.entryType === 'spiral') {
          const r = 100 * (1-t)
          en.x = en.targetX + Math.cos(t * 12) * r
          en.y = en.targetY - 150 * (1-t) + Math.sin(t * 12) * r
          if (t >= 1) { en.x = en.targetX; en.y = en.targetY; en.entered = true }
        } else if (en.entryType === 's-curve') {
          en.x = en.targetX + Math.sin(t * 8) * 80 * (1-t)
          en.y = en.targetY - 200 * (1-t)
          if (t >= 1) { en.x = en.targetX; en.y = en.targetY; en.entered = true }
        } else if (en.entryType === 'pincer') {
          en.x += (en.targetX - en.x) * 0.08
          en.y += (en.targetY - en.y) * 0.08
          if (Math.abs(en.y - en.targetY) < 2) { en.x = en.targetX; en.y = en.targetY; en.entered = true }
        } else if (en.entryType === 'diagonal') {
          en.x = en.targetX + (en.targetX < g.W/2 ? -200 : 200) * (1-t)
          en.y = en.targetY - 200 * (1-t)
          if (t >= 1) { en.x = en.targetX; en.y = en.targetY; en.entered = true }
        } else if (en.entryType === 'ceremony') {
          en.y = en.startY + (en.targetY - en.startY) * t
          if (t >= 1) { en.y = en.targetY; en.entered = true }
        } else if (en.entryType === 'turbo-drop') {
          en.y += spd * 4
          if (en.y >= en.targetY) { en.y = en.targetY; en.entered = true }
        } else {
          en.y += (en.targetY - en.y) * 0.05 + 1
          if (en.y >= en.targetY) en.entered = true
        }
        return
      }

      // Formation Sway logic applied to all entered enemies
      const sway = Math.sin(g.formationSway) * 20
      const targetX = en.targetX + sway
      const targetY = en.targetY

      // Instead of patterns, they stay in formation and just wobble slightly
      en.x += (targetX - en.x) * 0.1
      en.y += (targetY - en.y) * 0.1
    }

    function update() {
      const g = gameRef.current; if (!g || phaseRef.current !== 'playing') return
      const p = g.player, inp = inputRef.current
      g.gameTime++; if (g.gameTime%60===0) setGameTime(Math.floor(g.gameTime/60))
      g.formationSway += 0.02
      if (g.gameTime % 60 === 0 && g.waveTimer > 0) g.waveTimer--

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

      // Victory Sequence Logic
      if (phaseRef.current === 'victory_sequence') {
        if (g.gameTime % 5 === 0) {
          createFirework(g, rand(g.W*0.1, g.W*0.9), rand(g.H*0.1, g.H*0.5), `hsl(${rand(0,360)}, 80%, 60%)`)
          play('explosion-base')
        }
        if (vScore < score) {
          const step = Math.max(1, Math.floor(score / 50))
          setVScore(prev => Math.min(score, prev + step))
        }
      }

      // Firing
      const fRate = g.rapidFireTimer>0 ? Math.max(2, Math.floor(shipStats.fireRate/3)) : shipStats.fireRate
      g.fireTimer++; if (g.fireTimer>=fRate) { g.fireTimer=0; fireBullet(g) }

      // Ability timers
      if (g.rapidFireTimer>0) g.rapidFireTimer--
      if (g.cloakTimer>0) g.cloakTimer--
      if (g.fireTrailTimer>0) { g.fireTrailTimer--; if(g.tick%2===0) g.trails.push({x:p.x+rand(-8,8),y:p.y+p.h/2,r:rand(4,8),color:g.tick%4<2?'#FF4500':'#FFD700',life:30,maxLife:30,dmg:true}) }
      
      if (g.beamTimer > 0) {
        g.beamTimer--
        g.enemies = g.enemies.filter(en => {
          if (Math.abs(en.x - p.x) < 30) {
            en.hp -= 0.5; if (en.hp <= 0) { g.score += en.points; g.waveEnemiesKilled++; setScore(g.score); spawnParticles(g, en.x, en.y, en.color, 10); spawnPowerup(g, en.x, en.y); return false } }
          return true
        })
        if (g.boss && Math.abs(g.boss.x - p.x) < 40) g.boss.hp -= 0.3
      }
      
      // New V2 Abilities Logic
      if (g.omegaBeamTimer > 0) {
        g.omegaBeamTimer--
        g.enemies = g.enemies.filter(en => {
          if (Math.abs(en.x - p.x) < g.W * 0.3) {
            en.hp -= 2.5; if (en.hp <= 0) { g.score += en.points; g.waveEnemiesKilled++; setScore(g.score); spawnParticles(g, en.x, en.y, en.color, 15); return false } }
          return true
        })
        if (g.boss && Math.abs(g.boss.x - p.x) < g.W * 0.35) g.boss.hp -= 1.5
      }

      if (g.emeraldBarrageTimer > 0) {
        g.emeraldBarrageTimer--; if (g.emeraldBarrageTimer % 3 === 0) {
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 * i / 12) + (g.tick * 0.2); 
            g.bullets.push({ x: p.x, y: p.y, w: 10, h: 10, vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10, dmg: 4, color: '#00FF88' })
          }
        }
      }

      if (g.shockwaveY > -1) {
        g.shockwaveY -= 12; if (g.shockwaveY < -100) g.shockwaveY = -1
        g.enemies = g.enemies.filter(en => {
          if (Math.abs(en.y - g.shockwaveY) < 30) {
            en.hp -= 10; if (en.hp <= 0) { g.score += en.points; g.waveEnemiesKilled++; setScore(g.score); spawnParticles(g, en.x, en.y, en.color, 12); return false } }
          return true
        })
        if (g.boss && Math.abs(g.boss.y - g.shockwaveY) < 40) g.boss.hp -= 5
        g.enemyBullets = g.enemyBullets.filter(eb => Math.abs(eb.y - g.shockwaveY) > 40)
      }

      if (g.timeWarpTimer > 0) g.timeWarpTimer--
      g.specialCharge = Math.min(g.specialCharge, activeShip.stats.specialCharge)
      setSpecialCharge(g.specialCharge)
      if (g.specialCharge >= activeShip.stats.specialCharge && !g.specialActive) setSpecialReady(true)

      // Combo
      if (g.comboTimer>0) g.comboTimer--; else if (g.combo>0) { g.combo=0; setCombo(0) }

      // Garbage Collection for performance
      g.particles = g.particles.filter(p => { p.life--; p.x += p.vx; p.y += p.vy; return p.life > 0 })
      g.trails = g.trails.filter(t => { t.life--; return t.life > 0 })
      g.floatingTexts = g.floatingTexts.filter(t => { t.life--; t.y -= 0.5; return t.life > 0 })
      g.powerups = g.powerups.filter(pu => { 
        pu.y += pu.vy; pu.pulse += 0.1; 
        if (Math.abs(p.x - pu.x) < 30 && Math.abs(p.y - pu.y) < 30) {
          applyPowerup(g, pu.type.id); play('powerup'); return false 
        }
        return pu.y < g.H + 50
      })

      g.bullets = g.bullets.filter(b => {
        const timeSlow = g.timeWarpTimer > 0 ? 0.3 : 1.0
        b.y -= (b.vy || cfg.bulletSpeed) * timeSlow
        if (b.vx) b.x += b.vx * timeSlow
        
        // Behavioral updates for specific types
        if (b.type === 'wave') { b.w = (b.w || 12) + Math.sin(g.tick * 0.2) * (b.w ? b.w*0.3 : 10) }
        if (b.type === 'spiral') { b.x += Math.sin(g.tick * 0.3) * 3 }
        if (b.type === 'petal') { b.y += 1.5; b.vx *= 0.98 } // Slow down and fan out
        if (b.type === 'flare') { b.w *= 0.98; b.h *= 0.98; b.dmg *= 1.02 } // Condense and power up
        
        if (b.type === 'guided' && g.enemies.length > 0) {
          // Find nearest enemy
          let nearest = null, minDist = 400
          g.enemies.forEach(en => {
            const d = Math.sqrt((en.x-b.x)**2 + (en.y-b.y)**2)
            if (d < minDist) { minDist = d; nearest = en }
          })
          if (nearest) {
            const dx = nearest.x - b.x
            b.vx = (b.vx || 0) + Math.sign(dx) * 0.5
            b.vx = Math.max(-4, Math.min(4, b.vx))
          }
          b.y -= 2 // Guided extra speed
        }

        // Bullet Interception (Player bullet hits Enemy bullet)
        for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
          const eb = g.enemyBullets[i]
          if (Math.abs(eb.x - b.x) < (eb.w + b.w)/2 + 2 && Math.abs(eb.y - b.y) < (eb.h + b.h)/2 + 2) {
            g.enemyBullets.splice(i, 1)
            spawnParticles(g, b.x, b.y, '#fff', 3)
            // Some heavy bullets don't get destroyed
            if (b.type !== 'flare' && b.type !== 'heavy-shock') return false
          }
        }

        return b.y>-20 && b.x>-20 && b.x<g.W+20
      })

      // Wave system
      if (g.waveState === 'spawning' && g.waveEnemiesSpawned === 0 && !g.isBossRush) spawnWaveEnemies(g)
      if (g.isBossRush && !g.boss && g.waveState !== 'transition') { g.waveState = 'transition'; g.waveTransitionTimer = 120 }
      
      if ((g.waveState==='spawning'||g.waveState==='clearing') && g.enemies.length===0 && g.waveEnemiesSpawned>0 && !g.isBossRush) {
        if (g.wave%3===0 && !g.bossSpawned) spawnBoss(g)
        else { g.waveState='transition'; g.waveTransitionTimer=90 }
      }
      if (g.waveState==='transition') { 
        g.waveTransitionTimer--; 
        if(g.waveTransitionTimer<=0){ 
          if (g.isBossRush) { spawnBoss(g) }
          else { 
            if (g.wave >= cfg.waveGoal) {
              endGame(g, true)
            } else {
              g.wave++;setWave(g.wave);g.bossSpawned=false;g.waveEnemiesSpawned=0;g.waveEnemiesKilled=0;g.waveState='spawning' 
            }
          }
        } 
      }

      // Enemies
      g.enemies = g.enemies.filter(en => {
        moveEnemy(en, g); if (en.y>g.H+60) return false
        if (en.shootRate>0 && en.entered && g.cloakTimer<=0) { 
          en.shootTimer--; 
          if(en.shootTimer<=0){
            en.shootTimer=en.shootRate+Math.floor(rand(-20,20));
            const baseVy = 3+g.wave*0.12
            if (en.spread && difficulty.id === 'hard') {
              for (let i = -1; i <= 1; i++) g.enemyBullets.push({x:en.x, y:en.y+en.h/2, w:5, h:10, vy:baseVy, vx:i*1})
            } else if (en.aimed && difficulty.id === 'hard') {
              const dx = g.player.x - en.x, dy = g.player.y - en.y, dist = Math.sqrt(dx*dx+dy*dy)||1
              g.enemyBullets.push({x:en.x, y:en.y+en.h/2, w:6, h:6, vy:(dy/dist)*4.5, vx:(dx/dist)*4.5, aimed:true})
            } else {
              g.enemyBullets.push({x:en.x,y:en.y+en.h/2,w:5,h:10,vy:baseVy})
            }
          } 
        }
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
        const timeSlow = g.timeWarpTimer > 0 ? 0.3 : 1.0
        eb.y+=(eb.vy||0) * timeSlow; eb.x+=(eb.vx||0) * timeSlow
        if(eb.y>g.H+20||eb.y<-20||eb.x<-20||eb.x>g.W+20)return false
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

      // V2 Ultimate Visuals
      if (g.omegaBeamTimer > 0) {
        const oW = g.W * 0.6 + Math.sin(g.tick * 0.5) * 50; 
        ctx.globalAlpha = 0.8; const og = ctx.createLinearGradient(p.x - oW/2, 0, p.x + oW/2, 0);
        og.addColorStop(0, '#FFF20000'); og.addColorStop(0.3, '#FFF200AA'); og.addColorStop(0.5, '#FFFFFF'); og.addColorStop(0.7, '#FFF200AA'); og.addColorStop(1, '#FFF20000');
        ctx.fillStyle = og; ctx.fillRect(p.x - oW/2, 0, oW, g.H);
        for(let i=0; i<5; i++) { spawnParticles(g, p.x + rand(-oW/4, oW/4), rand(0, g.H), '#FFF200', 1); }
        ctx.globalAlpha = 1;
      }
      if (g.shockwaveY > -1) {
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 15; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(0, g.shockwaveY); ctx.lineTo(g.W, g.shockwaveY); ctx.stroke();
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#FFD700'; ctx.fillRect(0, g.shockwaveY - 10, g.W, 20);
        ctx.globalAlpha = 1;
      }
      if (g.timeWarpTimer > 0) {
        ctx.fillStyle = 'rgba(116, 185, 255, 0.15)'; ctx.fillRect(0, 0, g.W, g.H);
        ctx.strokeStyle = 'rgba(116, 185, 255, 0.5)'; ctx.lineWidth = 10 + Math.sin(g.tick * 0.1) * 5;
        ctx.strokeRect(5, 5, g.W-10, g.H-10);
      }
      if (specialReady) {
        ctx.fillStyle = '#fff'; ctx.font = "bold 14px 'Fredoka One',cursive"; ctx.textAlign = 'center';
        ctx.globalAlpha = 0.6 + Math.sin(g.tick * 0.2) * 0.4;
        ctx.fillText("ULTIMATE READY!", p.x, p.y + p.h + 20); ctx.globalAlpha = 1;
      }

      // Player
      const px=p.x,py=p.y,blink=p.invTimer>0&&Math.floor(p.invTimer/4)%2===0,cloaked=g.cloakTimer>0
      if(!blink){
        ctx.globalAlpha=cloaked?0.3:1
        if (g.shipImg && g.shipImg.complete && g.shipImg.naturalWidth > 0) {
          ctx.save()
          ctx.translate(px, py)
          
          // Hover shadow / glow
          ctx.shadowBlur = 20
          ctx.shadowColor = activeShip.color || '#fff'
          
          // Engines underneath png
          const fH=12+rand(0,8)+(g.rapidFireTimer>0?8:0)
          ctx.fillStyle=g.tick%4<2?'#fff':'#FDCB6E'
          ctx.beginPath();ctx.moveTo(-8, p.h/4);ctx.lineTo(0, p.h/2+fH);ctx.lineTo(8, p.h/4);ctx.closePath();ctx.fill()
          
          // PNG Sprite
          ctx.drawImage(g.shipImg, -p.w*0.8, -p.h*0.8, p.w*1.6, p.h*1.6)
          ctx.restore()
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
        const isPhantom = en.phantom && difficulty.id === 'hard'
        if (isPhantom) ctx.globalAlpha = 0.35 + Math.sin(g.tick * 0.1) * 0.15
        
        ctx.globalAlpha *= 0.06; ctx.fillStyle=en.color; ctx.beginPath(); ctx.arc(ex,ey,en.w*1.2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = isPhantom ? (0.35 + Math.sin(g.tick * 0.1) * 0.15) : 1
        
        if(en.id==='scout'||en.id==='phantom'||en.id==='kamikaze'){ctx.fillStyle=en.color;ctx.beginPath();ctx.moveTo(ex,ey+en.h/2);ctx.lineTo(ex-en.w/2,ey-en.h/3);ctx.lineTo(ex,ey-en.h/2+4);ctx.lineTo(ex+en.w/2,ey-en.h/3);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.globalAlpha=0.6;ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
        else if(en.id==='tank'){ctx.fillStyle=en.color;ctx.fillRect(ex-en.w/2,ey-en.h/2,en.w,en.h);ctx.fillStyle=en.color+'99';ctx.fillRect(ex-en.w/3,ey-en.h/2-4,en.w*0.66,4);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-6,ey,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+6,ey,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0a0a1a';ctx.beginPath();ctx.arc(ex-6,ey+1,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+6,ey+1,1.5,0,Math.PI*2);ctx.fill()}
        else if(en.id==='elite'){ctx.fillStyle=en.color;ctx.beginPath();ctx.moveTo(ex,ey-en.h/2);ctx.lineTo(ex+en.w/2,ey);ctx.lineTo(ex,ey+en.h/2);ctx.lineTo(ex-en.w/2,ey);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.globalAlpha=0.3;ctx.stroke();ctx.globalAlpha=1}
        else{ctx.fillStyle=en.color;ctx.beginPath();ctx.moveTo(ex,ey+en.h/2);ctx.lineTo(ex-en.w/2,ey-en.h/4);ctx.quadraticCurveTo(ex-en.w/3,ey-en.h/2,ex,ey-en.h/2+4);ctx.quadraticCurveTo(ex+en.w/3,ey-en.h/2,ex+en.w/2,ey-en.h/4);ctx.closePath();ctx.fill();ctx.fillStyle=en.color+'88';ctx.beginPath();ctx.moveTo(ex-en.w/2-6,ey);ctx.lineTo(ex-en.w/3,ey-en.h/4);ctx.lineTo(ex-en.w/3,ey+4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(ex+en.w/2+6,ey);ctx.lineTo(ex+en.w/3,ey-en.h/4);ctx.lineTo(ex+en.w/3,ey+4);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex-5,ey-2,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+5,ey-2,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0a0a1a';ctx.beginPath();ctx.arc(ex-5,ey-1,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ex+5,ey-1,1.5,0,Math.PI*2);ctx.fill()}
        if(en.hp<en.maxHp){const bw2=en.w*0.9;ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(ex-bw2/2,ey-en.h/2-8,bw2,3);ctx.fillStyle=en.hp/en.maxHp>0.5?'#4ECDC4':en.hp/en.maxHp>0.25?'#FDCB6E':'#FF4757';ctx.fillRect(ex-bw2/2,ey-en.h/2-8,bw2*(en.hp/en.maxHp),3)}
        ctx.globalAlpha = 1
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

      {/* Playing HUD top Premium Design */}
      {phase === 'playing' && (
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:isMobile?10:20, pointerEvents:'none' }}>
          
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <button onClick={() => { play('click'); onBack() }} style={{ pointerEvents:'auto', background:'rgba(255,255,255,0.07)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:12, width:36, height:36, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
            
            {/* Avatar & Score Box */}
            <div style={{ display:'flex', background:'rgba(2,1,24,0.85)', border:'1.5px solid rgba(62,130,255,0.4)', borderRadius:12, padding:'3px 10px 3px 3px', boxShadow:'0 0 20px rgba(0,0,0,0.5)', backdropFilter:'blur(5px)' }}>
              <div style={{ width:isMobile?32:42, height:isMobile?32:42, background:'linear-gradient(135deg, #4ecdc4, #3e82ff)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isMobile?20:26, marginRight:8, border:'1px solid rgba(255,255,255,0.2)' }}>👨‍🚀</div>
              <div>
                <div style={{ fontSize:isMobile?10:12, color:'rgba(255,255,255,0.4)', fontWeight:800, letterSpacing:1 }}>SCORE</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:isMobile?16:22, color:'#fff', lineHeight:1, marginTop:-2 }}>{score.toLocaleString()}</div>
                {/* Weapon Level Chevrons */}
                <div style={{ display:'flex', gap:2, marginTop:2 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ fontSize:isMobile?8:10, color:i < weaponLv ? '#FFD700' : 'rgba(255,255,255,0.1)', filter: i < weaponLv ? 'drop-shadow(0 0 5px #FFD700)' : 'none' }}>▲</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TOP LEFT: Level/Stage Indicator */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:6 }}>
             <div style={{ background:'rgba(2,1,24,0.75)', padding:'6px 16px', borderRadius:'14px 2px 14px 2px', border:`2px solid ${activeShip.color}66`, display:'flex', alignItems:'center', gap:10, boxShadow:`0 0 20px ${activeShip.color}33`, backdropFilter:'blur(8px)' }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:900, letterSpacing:1 }}>STAGE</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:'#fff', textShadow:`0 0 10px ${activeShip.color}` }}>{wave}</span>
             </div>
             <div style={{ display:'flex', alignItems:'center', gap:6, paddingLeft:4 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:activeShip.color, boxShadow:`0 0 10px ${activeShip.color}` }} />
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, textTransform:'uppercase' }}>System Online</span>
             </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
             <div style={{ background:'rgba(2,1,24,0.75)', padding:'6px 14px', borderRadius:'2px 14px 2px 14px', border:'2px solid rgba(162,155,254,0.4)', display:'flex', alignItems:'center', gap:8, backdropFilter:'blur(8px)' }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:900, letterSpacing:1 }}>TIME</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:'#a29bfe' }}>{fmtTime(gameTime || 0)}</span>
             </div>
             <span style={{background:'rgba(162,155,254,0.15)',color:'#a29bfe',border:'1.5px solid rgba(162,155,254,0.2)',borderRadius:100,padding:isMobile?'4px 12px':'5px 18px',fontSize:isMobile?10:12,fontFamily:"'Fredoka One',cursive", letterSpacing:0.5, backdropFilter:'blur(4px)'}}>{DLABEL[difficulty.id]}</span>
          </div>
        </div>
      )}

      {/* Boss Health Bar */}
      {phase === 'playing' && gameRef.current?.boss && (
        <div style={{ position:'absolute', top:isMobile?50:70, left:'50%', transform:'translateX(-50%)', width:'80%', maxWidth:400, zIndex:10, pointerEvents:'none', animation:'slide-up 0.4s ease-out' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:12, color:'#FF4757', textShadow:'0 0 10px rgba(255,71,87,0.5)' }}>{gameRef.current.boss.name}</span>
            <span style={{ fontSize:10, color:'#FF6B6B', fontWeight:800 }}>{Math.ceil(gameRef.current.boss.hp / gameRef.current.boss.maxHp * 100)}%</span>
          </div>
          <div style={{ width:'100%', height:8, background:'rgba(255,255,255,0.05)', borderRadius:100, border:'1px solid rgba(255,71,87,0.2)', overflow:'hidden', boxShadow:'0 0 15px rgba(255,71,87,0.1)' }}>
            <div style={{ width:`${(gameRef.current.boss.hp / gameRef.current.boss.maxHp) * 100}%`, height:'100%', background:'linear-gradient(90deg, #FF4757, #FF6B6B)', transition:'width 0.3s ease-out' }} />
          </div>
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
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.4}}>⚡ {activeShip.stats.specialType==='bomb'?'Bom Area':activeShip.stats.specialType==='rapid'?'Rapid Fire':activeShip.stats.specialType==='shield'?'Mega Shield':activeShip.stats.specialType==='firetrail'?'Fire Trail':activeShip.stats.specialType==='cloak'?'Stealth Cloak':activeShip.stats.specialType==='beam'?'Mega Beam':activeShip.stats.specialType==='emerald-barrage'?'Emerald Barrage':activeShip.stats.specialType==='golden-shockwave'?'Golden Shockwave':activeShip.stats.specialType==='time-warp'?'Time Warp (Slow-mo)':activeShip.stats.specialType==='omega-beam'?'Omega Beam (ULTIMATE)':''} — Tap 2× atau Space/F</div>
          </div>
          <div style={{display:'flex',gap:isMobile?10:16,marginBottom:16,fontSize:isMobile?10:12,color:'rgba(255,255,255,0.3)',flexWrap:'wrap',justifyContent:'center'}}><span>🕹️ Geser/WASD</span><span>🔫 Auto-fire</span><span>⭐ Power-up</span><span>⚡ Special</span></div>
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',justifyContent:'center'}}>
            <div style={{background:'rgba(78,205,196,0.08)',border:'1.5px solid rgba(78,205,196,0.2)',borderRadius:14,padding:isMobile?'7px 14px':'8px 18px',color:'rgba(78,205,196,0.6)',fontSize:isMobile?11:12,fontWeight:700}}>🎯 Wave: {cfg.waveGoal}</div>
            <div style={{background:'rgba(255,107,107,0.08)',border:'1.5px solid rgba(255,107,107,0.2)',borderRadius:14,padding:isMobile?'7px 14px':'8px 18px',color:'rgba(255,107,107,0.6)',fontSize:isMobile?11:12,fontWeight:700}}>❤️ HP: {Math.min(cfg.lives,activeShip.stats.maxHP)}</div>
          </div>
          {(bestScore>0||bestWave>0) && <div style={{display:'flex',gap:12,marginBottom:16,fontSize:12,color:'rgba(255,211,61,0.45)',fontWeight:600}}>{bestScore>0&&<span>🏆 Skor: {bestScore}</span>}{bestWave>0&&<span>📊 Wave: {bestWave}</span>}</div>}
          <div style={{display:'flex', gap:10, width:'100%', maxWidth:300}}>
            <button onClick={() => startGame(false)} style={{flex:1, background:`linear-gradient(135deg,${activeShip.color},#a29bfe)`,color:'#fff',border:'none',borderRadius:100,padding:isMobile?'12px 0':'14px 0',fontSize:isMobile?15:17,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:`0 0 36px ${activeShip.color}66`,WebkitTapHighlightColor:'transparent'}}>▶ Mulai Misi</button>
            <button onClick={() => startGame(true)} style={{flex:1, background:`linear-gradient(135deg,#FF4757,#FF6B6B)`,color:'#fff',border:'none',borderRadius:100,padding:isMobile?'12px 0':'14px 0',fontSize:isMobile?13:15,fontWeight:800,fontFamily:"'Fredoka One',cursive",cursor:'pointer',boxShadow:`0 0 36px rgba(255,71,87,0.4)`,WebkitTapHighlightColor:'transparent', display:'flex', alignItems:'center', justifyContent:'center', gap:5}}>🔥 Boss Rush</button>
          </div>
          <button onClick={()=>{play('click');onBack()}} style={{marginTop:12,background:'transparent',color:'rgba(255,255,255,0.35)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'10px 24px',fontSize:13,fontWeight:700,fontFamily:"'Fredoka One',cursive",cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>← Kembali</button>
        </div>
      )}

      {phase === 'win' && (() => {
        const ssStars = wave >= cfg.waveGoal + 3 ? 3 : wave >= cfg.waveGoal + 1 ? 2 : 1
        const g = gameRef.current
        const coins = (cfg.lives === 5 ? 20 : cfg.lives === 4 ? 35 : 55) + (g?.coinsCollected || 0)
        return (
          <WinModal
            emoji="🏆"
            title="Misi selesai!"
            subtitle="Semua wave berhasil dikalahkan!"
            diffLabel={DLABEL[difficulty.id]}
            stats={[
              { label: 'Skor', value: String(score), color: '#4ecdc4' },
              { label: 'Wave', value: String(wave), color: '#A29BFE' },
              { label: 'Waktu', value: fmtTime(gameTime), color: '#FDCB6E' },
              { label: 'Max combo', value: String(g?.maxCombo ?? 0), color: '#FF6B6B' },
            ]}
            stars={ssStars}
            coinReward={coins}
            highlight={score >= bestScore && bestScore > 0 ? '🏆 Rekor baru!' : ''}
            onRestart={startGame}
            onBack={() => { play('click'); onBack() }}
            onHome={onHome}
            dark={tc.dark}
            gameColor={activeShip.color}
          />
        )
      })()}

      {phase === 'dead' && (() => {
        const g = gameRef.current
        const coins = Math.max(5, Math.min(Math.floor(score / 8), 25)) + (g?.coinsCollected || 0)
        return (
          <LoseModal
            emoji="💀"
            title="Game Over!"
            subtitle={`Pesawatmu hancur di wave ${wave}!`}
            diffLabel={DLABEL[difficulty.id]}
            stats={[
              { label: 'Skor', value: String(score), color: '#4ecdc4' },
              { label: 'Wave', value: String(wave), color: '#A29BFE' },
              { label: 'Waktu', value: fmtTime(gameTime), color: '#FDCB6E' },
              { label: 'Max combo', value: String(g?.maxCombo ?? 0), color: '#FF6B6B' },
            ]}
            coinReward={score > 0 ? coins : 0}
            highlight={score >= bestScore && bestScore > 0 ? '🏆 Rekor baru!' : ''}
            onRestart={startGame}
            onBack={() => { play('click'); onBack() }}
            onHome={onHome}
            dark={tc.dark}
            gameColor="#ff6b6b"
          />
        )
      })()}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}@keyframes pulse-glow{0%,100%{box-shadow:0 0 10px #4ecdc444}50%{box-shadow:0 0 24px #4ecdc488}}`}</style>
      {/* Victory Sequence Overlay */}
      {phase === 'victory_sequence' && (
        <div 
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)', backdropFilter: 'blur(4px)' }}
        >
          <div className="text-center animate-in fade-in zoom-in duration-700">
            <h2 className="text-5xl md:text-8xl font-black text-white italic tracking-tighter mb-4" style={{ textShadow: `0 0 40px ${activeShip.color}`, fontStyle: 'italic' }}>
              MISSION<br/>ACCOMPLISHED
            </h2>
            <div className="flex flex-col items-center space-y-2">
              <div className="text-zinc-500 text-sm tracking-[0.3em] uppercase font-black">Data Logs Decrypted</div>
              <div className="text-7xl md:text-9xl font-black text-white tabular-nums tracking-tighter" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}>
                {vScore.toLocaleString()}
              </div>
            </div>
            {vScore >= score && (
              <div className="mt-12 animate-bounce">
                <button 
                  className="pointer-events-auto px-12 py-5 bg-white text-black font-black italic text-2xl rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.6)] border-4 border-black"
                  onClick={() => setPhase('win')}
                >
                  DEBRIEFING →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
