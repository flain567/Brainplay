import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLuckyWheel } from '../context/LuckyWheelContext.jsx'
import { getNextResetTime } from '../context/LuckyWheelContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
gsap.registerPlugin(Draggable, InertiaPlugin)

const SPIN_DURATION = 4000
const SLOT_COUNT = 8

export default function LuckyWheel({ open, onClose }) {
  const {
    hasFreeSpins, spin, getWheelSlots, extraSpinCost,
    wonExclusives, spinHistory, totalSpins, pityCounter,
    RARITY_COLORS, RARITY_LABELS, WHEEL_EXCLUSIVES,
    freeSpinsRemaining, freeSpinsPerWeek,
  } = useLuckyWheel()
  const { coins, earnCoins, spendCoins } = useCoins()
  const { play } = useSound()
  const tc = useThemeColors()

  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [multiResults, setMultiResults] = useState(null) // final 5× summary
  const [rotation, setRotation] = useState(0)
  const [tab, setTab] = useState('spin') // 'spin' | 'collection' | 'history'
  const wheelRef      = useRef(null)
  const tickRef       = useRef(null)
  const rotationRef   = useRef(0)        // always-fresh rotation for setTimeout
  const dragOverlayRef = useRef(null)    // transparent div — Draggable target
  const draggableRef   = useRef(null)    // GSAP Draggable instance
  const isDraggingRef  = useRef(false)   // guard: block spin-btn during drag

  // ── Sequential Multi-Spin — State Machine ──
  // multiPhase: null | 'spin' | 'reveal' | 'done'
  const [multiQueue, setMultiQueue] = useState(null)
  const [multiIdx, setMultiIdx] = useState(0)
  const [multiRevealed, setMultiRevealed] = useState([])
  const [multiCurrentReward, setMultiCurrentReward] = useState(null)
  const [multiPhase, setMultiPhase] = useState(null)
  const isMultiActive = multiPhase !== null

  // ── Reset countdown timer — update tiap detik ────────────────────────────
  const [countdown, setCountdown] = useState({ label: '', ticking: false })
  useEffect(() => {
    const pad = n => String(n).padStart(2, '0')
    const update = () => {
      const diff = getNextResetTime() - new Date()
      if (diff <= 0) {
        setCountdown({ label: 'Segera reset!', ticking: false })
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000)  / 60000)
      const s = Math.floor((diff % 60000)    / 1000)
      // Selalu tampilkan detik agar terlihat berjalan
      const label = d > 0
        ? `${d}h ${pad(h)}:${pad(m)}:${pad(s)}`
        : `${pad(h)}:${pad(m)}:${pad(s)}`
      setCountdown({ label, ticking: true })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const MULTI_COUNT = 5
  const multiCost = extraSpinCost * MULTI_COUNT

  const slots = getWheelSlots()
  const dark = tc.dark

  // Debug logging
  useEffect(() => {
    if (open) {
      if (!slots || slots.length === 0) {
        console.warn('⚠️ Lucky Wheel: No slots available!')
      }
    }
  }, [open, slots])

  const doSpin = useCallback(async (isFree) => {
    if (spinning) return
    if (!isFree) {
      if (coins < extraSpinCost) return
      const ok = await spendCoins(extraSpinCost, 'Lucky Wheel Extra Spin')
      if (!ok) return
    }

    setSpinning(true)
    if (navigator.vibrate) navigator.vibrate(10)
    setResult(null)

    // Get result first, then animate to correct slot
    const reward = spin(isFree)
    
    // Find which slot index matches the reward — match label first, then rarity fallback
    let targetIdx = slots.findIndex(s => s.label === reward.label)
    if (targetIdx < 0) targetIdx = slots.findIndex(s => s.rarity === reward.rarity)
    if (targetIdx < 0) targetIdx = 0

    // Calculate rotation to land pointer on correct slot
    const slotAngle = 360 / SLOT_COUNT
    const targetAngle = targetIdx * slotAngle + slotAngle / 2 // center of slot
    // Where the wheel needs to end (mod 360) so pointer hits targetAngle
    const targetStop = ((360 - targetAngle) % 360 + 360) % 360
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    const diff = ((targetStop - currentMod) % 360 + 360) % 360
    const fullRotations = 5 + Math.floor(Math.random() * 3)
    // Small jitter that stays inside the slot (±6°)
    const jitter = (Math.random() - 0.5) * slotAngle * 0.25
    const newRotation = rotationRef.current + fullRotations * 360 + diff + jitter
    
    setRotation(newRotation)
    rotationRef.current = newRotation

    // Tick sounds during spin
    let ticks = 0
    tickRef.current = setInterval(() => {
      ticks++
      if (ticks < 30) try { play('click') } catch(e) {}
    }, 120)

    setTimeout(() => {
      clearInterval(tickRef.current)
      setSpinning(false)
      setResult(reward)
      
      // Apply reward
      if (reward.type === 'coin') {
        earnCoins(reward.amount, `Lucky Wheel — ${reward.label}`)
      } else if (reward.type === 'xp') {
        // XP rewards: give equivalent coins
        earnCoins(Math.round(reward.amount / 5), `Lucky Wheel — ${reward.label}`)
      } else if (reward.type === 'exclusive' && reward.item) {
        // Auto-unlock the exclusive cosmetic
        // We need to add it to owned items
        const item = reward.item
        window.dispatchEvent(new CustomEvent('bp-wheel-unlock', { detail: { item } }))
      }

      // Sound & haptics
      const isEpic = reward.rarity === 'epic' || reward.rarity === 'legendary'
      if (navigator.vibrate) navigator.vibrate(isEpic ? [30, 50, 30] : 30)
      try { play(isEpic ? 'levelUp' : 'win') } catch(e) {}
    }, SPIN_DURATION)
  }, [spinning, coins, extraSpinCost, spin, slots, spendCoins, earnCoins, play])

  // ── 5× Multi Spin — State Machine ────────────────────────────────────────
  const doMultiSpin = useCallback(async () => {
    if (spinning || isMultiActive) return
    if (coins < multiCost) return
    const ok = await spendCoins(multiCost, `Lucky Wheel 5× Spin`)
    if (!ok) return

    // Roll all 5 results upfront
    const rewards = []
    for (let i = 0; i < MULTI_COUNT; i++) rewards.push(spin(false))

    // Apply all rewards immediately
    let totalCoins = 0
    for (const reward of rewards) {
      if (reward.type === 'coin') totalCoins += reward.amount
      else if (reward.type === 'xp') totalCoins += Math.round(reward.amount / 5)
      else if (reward.type === 'exclusive' && reward.item)
        window.dispatchEvent(new CustomEvent('bp-wheel-unlock', { detail: { item: reward.item } }))
    }
    if (totalCoins > 0) earnCoins(totalCoins, `Lucky Wheel 5× Spin — ${totalCoins} coin`)

    // Start state machine
    setMultiQueue(rewards)
    setMultiIdx(0)
    setMultiRevealed([])
    setMultiCurrentReward(null)
    setMultiResults(null)
    setMultiPhase('spin') // triggers useEffect below
  }, [spinning, isMultiActive, coins, multiCost, spin, spendCoins, earnCoins])

  // ── useEffect: drives the multi-spin state machine ──
  useEffect(() => {
    if (multiPhase !== 'spin' || !multiQueue || multiIdx >= multiQueue.length) return

    const reward = multiQueue[multiIdx]
    setSpinning(true)
    setMultiCurrentReward(null)

    // Find correct slot — match by label first, then rarity
    let targetIdx = slots.findIndex(s => s.label === reward.label)
    if (targetIdx < 0) targetIdx = slots.findIndex(s => s.rarity === reward.rarity)
    if (targetIdx < 0) targetIdx = 0

    const slotAngle = 360 / SLOT_COUNT
    const targetAngle = targetIdx * slotAngle + slotAngle / 2
    const targetStop = ((360 - targetAngle) % 360 + 360) % 360
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    const diff = ((targetStop - currentMod) % 360 + 360) % 360
    const fullRotations = 3 + Math.floor(Math.random() * 2)
    const jitter = (Math.random() - 0.5) * slotAngle * 0.25
    const cur = rotationRef.current
    const next = cur + fullRotations * 360 + diff + jitter
    setRotation(next)
    rotationRef.current = next

    // Tick sounds
    let ticks = 0
    const tickInterval = setInterval(() => {
      ticks++
      if (ticks < 18) try { play('click') } catch {}
    }, 100)

    const timer = setTimeout(() => {
      clearInterval(tickInterval)
      setSpinning(false)
      const isEpic = reward.rarity === 'epic' || reward.rarity === 'legendary'
      try { play(isEpic ? 'levelUp' : 'win') } catch {}

      setMultiCurrentReward(reward)
      setMultiRevealed(prev => [...prev, reward])
      setMultiPhase('reveal') // show reward card
    }, SPIN_DURATION + 200) // wait for wheel CSS transition to fully stop

    return () => { clearInterval(tickInterval); clearTimeout(timer) }
  }, [multiPhase, multiIdx]) // re-runs when phase becomes 'spin' or idx changes

  // "Lanjut" button handler
  const advanceMultiSpin = () => {
    setMultiCurrentReward(null)
    const nextIdx = multiIdx + 1
    if (nextIdx >= (multiQueue ? multiQueue.length : MULTI_COUNT)) {
      // All done → show summary
      setMultiResults(multiQueue)
      setMultiQueue(null)
      setMultiIdx(0)
      setMultiRevealed([])
      setMultiPhase(null)
    } else {
      // Trigger next spin
      setMultiIdx(nextIdx)
      setMultiPhase('spin')
    }
  }

  // "Skip" button handler
  const skipMultiSpin = () => {
    clearInterval(tickRef.current)
    setSpinning(false)
    setMultiCurrentReward(null)
    setMultiResults(multiQueue)
    setMultiQueue(null)
    setMultiIdx(0)
    setMultiRevealed([])
    setMultiPhase(null)
    try { play('win') } catch {}
  }

  // Lock body & html scroll when modal is open
  useEffect(() => {
    if (!open) return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [open])

  // ── Refs to avoid stale closures inside Draggable callbacks ────────────────
  const spinningRef     = useRef(spinning)
  const hasFreeSpinsRef = useRef(hasFreeSpins)
  const doSpinRef       = useRef(doSpin)
  useEffect(() => { spinningRef.current     = spinning    }, [spinning])
  useEffect(() => { hasFreeSpinsRef.current = hasFreeSpins }, [hasFreeSpins])
  useEffect(() => { doSpinRef.current       = doSpin      }, [doSpin])

  // ── GSAP Draggable + Inertia — created ONCE on open ──────────────────────
  useEffect(() => {
    if (!open) return

    // Retry until refs are populated (React commits DOM after effect fires)
    let retries = 0
    let d = null

    const init = () => {
      if (!dragOverlayRef.current || !wheelRef.current) {
        if (retries++ < 10) { setTimeout(init, 50); return }
        return
      }

      const overlay    = dragOverlayRef.current
      const MIN_DRAG   = 25   // degrees — minimum drag to count as spin intent

      gsap.set(overlay, { rotation: 0 })
      let dragStartRot = 0

      d = Draggable.create(overlay, {
        type:     'rotation',
        inertia:  true,
        allowNativeTouchScrolling: false,
        cursor:   'grab',
        activeCursor: 'grabbing',

        onDragStart() {
          if (spinningRef.current) { this.endDrag(); return }
          isDraggingRef.current = true
          dragStartRot = this.rotation
          if (wheelRef.current) wheelRef.current.style.transition = 'none'
        },

        onDrag() {
          if (!wheelRef.current) return
          wheelRef.current.style.transform =
            `rotate(${rotationRef.current + this.rotation}deg)`
        },

        onThrowUpdate() {
          if (!wheelRef.current) return
          wheelRef.current.style.transform =
            `rotate(${rotationRef.current + this.rotation}deg)`
        },

        onDragEnd() {
          isDraggingRef.current = false
          const totalDrag = Math.abs(this.rotation - dragStartRot)

          if (totalDrag >= MIN_DRAG && !spinningRef.current) {
            // ── Dragged enough → trigger real spin ────────────────────────
            gsap.set(overlay, { rotation: 0 })
            if (wheelRef.current) {
              wheelRef.current.style.transform  = ''
              wheelRef.current.style.transition = ''
            }
            doSpinRef.current(hasFreeSpinsRef.current)

          } else {
            // ── Too small → bounce back, no spin result ────────────────────
            gsap.to(overlay, {
              rotation: 0,
              duration: 0.4,
              ease: 'back.out(1.6)',
              onUpdate: () => {
                if (!wheelRef.current) return
                wheelRef.current.style.transform =
                  `rotate(${rotationRef.current + gsap.getProperty(overlay, 'rotation')}deg)`
              },
              onComplete: () => {
                gsap.set(overlay, { rotation: 0 })
                if (wheelRef.current) {
                  wheelRef.current.style.transform  = ''
                  wheelRef.current.style.transition = ''
                }
              },
            })
          }
        },
      })[0]

      draggableRef.current = d
    }

    init()

    return () => {
      if (draggableRef.current) { draggableRef.current.kill(); draggableRef.current = null }
      if (wheelRef.current) {
        wheelRef.current.style.transform  = ''
        wheelRef.current.style.transition = ''
      }
    }
  }, [open])   // ← only open; live values read via refs

  if (!open) return null

  const bg = dark ? 'rgba(10,12,28,0.97)' : 'rgba(255,255,255,0.97)'
  const surface = dark ? '#151830' : '#F8F9FF'
  const textMain = dark ? '#fff' : '#1a1a2e'
  const textMuted = dark ? '#8892b0' : '#636e72'
  const borderCol = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  return createPortal(
    <>
      <style>{`
        .wheel-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(13, 16, 34, 0.85); backdrop-filter: blur(24px);
          animation: fadeIn 0.4s ease both;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .wheel-inner {
          max-width: 420px; width: 100%;
          max-height: 100dvh;
          overflow-y: auto; overflow-x: hidden;
          overscroll-behavior: contain;
          padding: 24px 20px;
        }
        .wheel-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .wheel-close {
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px;
          padding: 8px 16px; color: rgba(255,255,255,0.6); font-size: 14px;
          cursor: pointer; font-weight: 700; font-family: 'Nunito',sans-serif;
          transition: all 0.2s;
        }
        .wheel-close:hover { border-color: var(--accent-vivid); color: #fff; transform: scale(1.05); }

        /* Tabs */
        .wheel-tabs {
          display: flex; gap: 4px; margin-bottom: 24px;
          background: rgba(255,255,255,0.04);
          border-radius: 16px; padding: 5px;
        }
        .wheel-tab {
          flex: 1; padding: 10px 6px; border-radius: 12px;
          background: transparent; border: none; color: rgba(255,255,255,0.4);
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: 'Nunito',sans-serif; transition: all 0.2s;
        }
        .wheel-tab.active {
          background: var(--accent-vivid);
          color: #fff; box-shadow: 0 4px 15px rgba(124,111,232,0.3);
        }

        /* Wheel container */
        .wheel-stage {
          position: relative; width: 280px; height: 280px;
          margin: 0 auto 24px;
          overflow: visible;
        }
        .wheel-disc {
          width: 280px; height: 280px;
          display: block;
          overflow: visible;
          transition: transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99);
          filter: drop-shadow(0 0 30px rgba(162,155,254,0.3));
        }
        .wheel-disc.spinning {
          filter: drop-shadow(0 0 40px rgba(162,155,254,0.5));
        }
        .wheel-pointer {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          width: 0; height: 0; 
          border-left: 14px solid transparent; border-right: 14px solid transparent;
          border-top: 24px solid #FFD700;
          filter: drop-shadow(0 2px 8px rgba(255,215,0,0.5));
          z-index: 5;
        }

        /* Spin buttons */
        .spin-btns { display: flex; gap: 8px; margin-bottom: 18px; }
        .spin-btn {
          flex: 1; padding: 12px 8px; border-radius: 16px; border: none;
          font-family: 'Fredoka One',cursive; font-size: 13px;
          cursor: pointer; transition: all 0.2s; font-weight: 800;
        }
        .spin-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .spin-btn.free {
          background: linear-gradient(135deg,#FDCB6E,#F9A825);
          color: #5D4037; box-shadow: 0 8px 25px rgba(253,203,110,0.3);
          border: none;
        }
        .spin-btn.free:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 12px 35px rgba(253,203,110,0.4); }
        .spin-btn.paid {
          background: rgba(255,255,255,0.05);
          color: var(--accent-vivid); border: 1.5px solid rgba(124,111,232,0.3);
        }
        .spin-btn.paid:not(:disabled):hover { transform: translateY(-3px); border-color: var(--accent-vivid); background: rgba(124,111,232,0.1); }
        .spin-btn.multi {
          background: linear-gradient(135deg,#AB47BC,#7B1FA2);
          color: #fff; box-shadow: 0 8px 25px rgba(171,71,188,0.3);
        }
        .spin-btn.multi:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 12px 35px rgba(171,71,188,0.4); }

        /* Multi-result modal */
        .multi-result {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.7); padding: 20px;
        }
        .multi-card {
          background: ${dark?'linear-gradient(180deg,#151830,#0a0c1c)':'linear-gradient(180deg,#fff,#f8f9ff)'};
          border-radius: 28px; padding: 28px 20px; text-align: center;
          max-width: 380px; width: 100%; position: relative; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: resultPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
          max-height: 85dvh; overflow-y: auto;
        }
        .multi-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 14px;
          background: ${dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)'};
          border: 1.5px solid ${borderCol}; margin-bottom: 8px;
          text-align: left; transition: all 0.3s;
          animation: resultPop 0.3s ease both;
        }
        .multi-item.epic { border-color: rgba(171,71,188,0.4); background: ${dark?'rgba(171,71,188,0.08)':'rgba(171,71,188,0.04)'}; }
        .multi-item.legendary { border-color: rgba(255,215,0,0.4); background: ${dark?'rgba(255,215,0,0.08)':'rgba(255,215,0,0.04)'}; }
        .multi-summary {
          display: flex; gap: 12px; justify-content: center;
          margin: 16px 0; flex-wrap: wrap;
        }
        .multi-stat {
          padding: 8px 16px; border-radius: 12px;
          background: ${dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'};
          border: 1px solid ${borderCol};
          font-size: 13px; font-weight: 700; color: ${textMuted};
        }

        /* Result modal */
        .wheel-result {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(16px);
          animation: wheelFadeIn 0.3s ease; padding: 20px;
        }
        .result-card {
          background: ${dark?'linear-gradient(180deg,#151830,#0a0c1c)':'linear-gradient(180deg,#fff,#f8f9ff)'};
          border-radius: 28px; padding: 36px 28px; text-align: center;
          max-width: 360px; width: 100%; position: relative; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          animation: resultPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes resultPop { from { opacity:0; transform:scale(0.8) } to { opacity:1; transform:scale(1) } }
        .result-banner {
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
        }
        .result-rarity {
          display: inline-block; padding: 4px 14px; border-radius: 100px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .result-icon { font-size: 64px; margin-bottom: 8px; }
        .result-img {
          width: 120px; height: 120px; object-fit: contain;
          margin: 0 auto 12px; display: block;
          filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3));
        }
        .result-name {
          font-family: 'Fredoka One',cursive; font-size: 22px;
          margin-bottom: 6px;
        }
        .result-desc {
          font-size: 13px; color: ${textMuted}; margin-bottom: 20px;
          line-height: 1.5;
        }
        .result-close-btn {
          background: linear-gradient(135deg,#A29BFE,#6C5CE7);
          color: #fff; border: none; border-radius: 100px;
          padding: 12px 36px; font-size: 15px; font-weight: 800;
          font-family: 'Fredoka One',cursive; cursor: pointer;
          box-shadow: 0 4px 20px rgba(162,155,254,0.3);
          transition: all 0.2s;
        }
        .result-close-btn:hover { transform: translateY(-2px); }

        /* Collection grid */
        .collection-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 10px; margin-bottom: 16px;
        }
        .collection-item {
          background: ${surface}; border: 1.5px solid ${borderCol};
          border-radius: 16px; padding: 14px; text-align: center;
          transition: all 0.2s; position: relative;
        }
        .collection-item.owned {
          border-color: rgba(78,205,196,0.3);
          background: ${dark?'rgba(78,205,196,0.06)':'rgba(78,205,196,0.04)'};
        }
        .collection-item.locked { opacity: 0.45; }
        .collection-item img {
          width: 60px; height: 60px; object-fit: contain;
          margin-bottom: 8px;
        }

        /* History */
        .history-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 12px;
          background: ${dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};
          border: 1px solid ${borderCol}; margin-bottom: 6px;
        }

        /* Pity indicator */
        .pity-bar {
          height: 4px; border-radius: 100px; overflow: hidden;
          background: ${dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'};
          margin-top: 12px;
        }
        .pity-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg,#A29BFE,#FFD700);
          transition: width 0.6s ease;
        }

        /* Confetti */
        @keyframes confettiFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity:1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity:0; }
        }
        .wheel-confetti {
          position: fixed; inset: 0; pointer-events: none; z-index: 10001; overflow: hidden;
        }
        .wheel-confetti span {
          position: absolute; top: -20px; width: 10px; height: 10px;
          animation: confettiFall 2.5s ease-in-out forwards;
        }
      `}</style>

      <div className="wheel-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg,
      }} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
        <div className="wheel-inner" style={{
          maxWidth: 420, width: '100%',
          maxHeight: '100dvh',
          overflowY: 'auto', overflowX: 'hidden',
          padding: '24px 20px',
        }}>
          {/* Header */}
          <div className="wheel-header">
            <div>
              <h2 style={{
                fontFamily: "'Fredoka One',cursive", fontSize: 24,
                background: 'linear-gradient(135deg,#FFD700,#FF8C00)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 2,
              }}>🎰 Lucky Wheel</h2>
              <div style={{ fontSize: 12, color: textMuted, fontWeight: 600 }}>
                {totalSpins} total spin{hasFreeSpins ? ' • 🎁 Free spin tersedia!' : ''}
              </div>
            </div>
            <button className="wheel-close" onClick={onClose}>✕</button>
          </div>

          {/* ── Reset Info Banner ── */}
          <div style={{
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${borderCol}`,
            borderRadius: 14, padding: '10px 14px',
            marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, flexWrap: 'wrap',
          }}>
            {/* Spin progress */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: textMuted, fontWeight: 700, marginBottom: 5 }}>
                SPIN GRATIS MINGGU INI
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 100,
                    background: freeSpinsRemaining > 0
                      ? 'linear-gradient(90deg,#FFD700,#FF8C00)'
                      : dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    width: `${Math.round((freeSpinsRemaining / (freeSpinsPerWeek || 5)) * 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{
                  fontFamily: "'Fredoka One',cursive",
                  fontSize: 14,
                  color: freeSpinsRemaining > 0 ? '#FFD700' : textMuted,
                  flexShrink: 0,
                }}>
                  {freeSpinsRemaining}/{freeSpinsPerWeek || 5}
                </span>
              </div>
            </div>

            {/* Countdown */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: textMuted, fontWeight: 700, marginBottom: 3 }}>
                RESET BERIKUTNYA
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11 }}>🕐</span>
                <span style={{
                  fontFamily: "'Fredoka One',cursive",
                  fontSize: 13,
                  color: !countdown.ticking ? '#4ECDC4' : textMain,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: countdown.ticking ? '0.5px' : 0,
                }}>
                  {countdown.label || '...'}
                </span>
              </div>
              <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>
                Senin 07:00 WIB
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="wheel-tabs">
            {['spin','collection','history'].map(t => (
              <button key={t} className={`wheel-tab ${tab===t?'active':''}`}
                onClick={() => { play('click'); setTab(t) }}>
                {t==='spin'?'🎰 Spin':t==='collection'?'🎁 Koleksi':'📜 Riwayat'}
              </button>
            ))}
          </div>

          {/* ── SPIN TAB ── */}
          {tab === 'spin' && (
            <>
              {/* Wheel */}
              <div className="wheel-stage" style={{
                position: 'relative', width: 280, height: 280,
                margin: '0 auto 8px', overflow: 'visible',
              }}>
                <div className="wheel-pointer" />
                {slots && slots.length > 0 ? (
                  <svg
                    ref={wheelRef}
                    className={`wheel-disc ${spinning?'spinning':''}`}
                    viewBox="0 0 300 300"
                    width="280" height="280"
                    overflow="visible"
                    style={{
                      display: 'block',
                      width: 280, height: 280,
                      transform: `rotate(${rotation}deg)`,
                      transition: `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`,
                      filter: spinning ? 'drop-shadow(0 0 40px rgba(162,155,254,0.5))' : 'drop-shadow(0 0 30px rgba(162,155,254,0.3))',
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Outer border */}
                    <circle cx="150" cy="150" r="149" fill={dark?'#0E1225':'#F0EEFF'}
                      stroke={dark?'rgba(162,155,254,0.3)':'rgba(162,155,254,0.4)'} strokeWidth="2" />
                    {slots.map((slot, i) => {
                      try {
                    const angle = (360 / SLOT_COUNT) * i
                    const startRad = (angle - 90) * Math.PI / 180
                    const endRad = ((angle + 360/SLOT_COUNT) - 90) * Math.PI / 180
                    const cx = 150, cy = 150, r = 148
                    const x1 = cx + r * Math.cos(startRad)
                    const y1 = cy + r * Math.sin(startRad)
                    const x2 = cx + r * Math.cos(endRad)
                    const y2 = cy + r * Math.sin(endRad)
                    const labelAngle = angle + (360/SLOT_COUNT)/2
                    const labelRad = (labelAngle - 90) * Math.PI / 180
                    const lx = cx + r * 0.62 * Math.cos(labelRad)
                    const ly = cy + r * 0.62 * Math.sin(labelRad)
                    const fill = slot.rarity === 'legendary' ? (i%2===0?'#5C3D00':'#4A3000')
                      : slot.rarity === 'epic' ? (i%2===0?'#4A1A6B':'#3A1255')
                      : slot.rarity === 'rare' ? (i%2===0?'#1A4060':'#14335A')
                      : slot.rarity === 'uncommon' ? (i%2===0?'#1A4A30':'#143D25')
                      : (i%2===0?'#2A2E48':'#222640')

                    return (
                      <g key={i}>
                        <path
                          d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                          fill={dark ? fill : (i%2===0?'#F5F0FF':'#FFF8EC')}
                          stroke={dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}
                          strokeWidth="1"
                        />
                        {slot.img ? (
                          <>
                            {/* Game asset image for exclusive slots */}
                            <image
                              href={slot.img}
                              x={lx - 18} y={ly - 20}
                              width="36" height="36"
                              preserveAspectRatio="xMidYMid meet"
                              transform={`rotate(${labelAngle}, ${lx}, ${ly})`}
                              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
                            />
                            <text x={lx} y={ly+24} textAnchor="middle"
                              fontSize="6.5" fontWeight="800" fill={slot.color}
                              fontFamily="'Fredoka One',cursive"
                              transform={`rotate(${labelAngle}, ${lx}, ${ly})`}>
                              {slot.label.length > 12 ? slot.label.slice(0,12)+'…' : slot.label}
                            </text>
                          </>
                        ) : (
                          <>
                            <text x={lx} y={ly-6} textAnchor="middle" fontSize="20"
                              transform={`rotate(${labelAngle}, ${lx}, ${ly})`}>
                              {slot.icon}
                            </text>
                            <text x={lx} y={ly+10} textAnchor="middle"
                              fontSize="7" fontWeight="800" fill={slot.color}
                              fontFamily="'Fredoka One',cursive"
                              transform={`rotate(${labelAngle}, ${lx}, ${ly})`}>
                              {slot.label.length > 12 ? slot.label.slice(0,12)+'…' : slot.label}
                            </text>
                          </>
                        )}
                      </g>
                    )
                      } catch(e) {
                        console.error('Error rendering slot', i, e)
                        return null
                      }
                    })}
                  {/* Center circle */}
                  <circle cx="150" cy="150" r="32" fill={dark?'#0a0c1c':'#fff'}
                    stroke={dark?'rgba(255,215,0,0.3)':'rgba(255,215,0,0.4)'} strokeWidth="3" />
                  <text x="150" y="155" textAnchor="middle" fontSize="22">🎰</text>
                </svg>
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: textMuted, fontSize: 14, minHeight: 200
                  }}>
                    Loading wheel...
                  </div>
                )}

                {/* Transparent drag overlay — always in DOM, Draggable target */}
                <div
                  ref={dragOverlayRef}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: 280, height: 280,
                    borderRadius: '50%',
                    zIndex: 4,
                    cursor: spinning ? 'not-allowed' : 'grab',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'none',
                    pointerEvents: spinning ? 'none' : 'auto',
                  }}
                />
              </div>

              {/* Drag hint */}
              <div style={{
                textAlign: 'center', fontSize: 11, color: textMuted,
                marginBottom: 16, fontWeight: 600,
                opacity: spinning ? 0 : 0.7, transition: 'opacity 0.3s',
                userSelect: 'none',
              }}>
                {hasFreeSpins ? '👆 Putar atau seret roda' : '👆 Seret cepat untuk spin'}
              </div>

              {/* Spin buttons */}
              <div className="spin-btns">
                {isMultiActive ? (
                  <>
                    {/* During multi-spin sequence: show progress + skip */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                      padding: '8px 0', width: '100%',
                    }}>
                      {/* Progress dots */}
                      {multiQueue.map((_, i) => (
                        <div key={i} style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: i < multiIdx
                            ? 'linear-gradient(135deg,#4ECDC4,#00B894)'
                            : i === multiIdx && spinning
                              ? 'linear-gradient(135deg,#A29BFE,#6C5CE7)'
                              : dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: i < multiIdx ? '#fff' : textMuted,
                          transition: 'all 0.3s',
                          animation: i === multiIdx && spinning ? 'pulse 1s ease infinite' : 'none',
                          border: i === multiIdx ? '2px solid #A29BFE' : '2px solid transparent',
                        }}>
                          {i < multiIdx ? '✓' : i + 1}
                        </div>
                      ))}
                    </div>
                    <button className="spin-btn multi" onClick={skipMultiSpin}
                      style={{ background: 'linear-gradient(135deg,#636E72,#2D3436)' }}>
                      ⏩ Skip — Lihat Semua
                    </button>
                  </>
                ) : (
                  <>
                    <button className="spin-btn free" disabled={spinning || !hasFreeSpins}
                      onClick={() => doSpin(true)}>
                      {spinning ? '⏳ Spinning...' : hasFreeSpins ? '🎁 Free Spin!' : '✓ Sudah Klaim'}
                    </button>
                    <button className="spin-btn paid" disabled={spinning || coins < extraSpinCost}
                      onClick={() => doSpin(false)}>
                      🪙 {extraSpinCost}
                    </button>
                    <button className="spin-btn multi" disabled={spinning || coins < multiCost}
                      onClick={doMultiSpin}>
                      {spinning ? '⏳' : `5× 🪙 ${multiCost}`}
                    </button>
                  </>
                )}
              </div>

              {/* Pity indicator */}
              <div style={{ textAlign: 'center', fontSize: 11, color: textMuted, fontWeight: 600 }}>
                Pity: {pityCounter}/50 — {pityCounter >= 45 ? '🔥 Hampir Epic!' : 'Epic guaranteed setelah 50 spin'}
              </div>
              <div className="pity-bar">
                <div className="pity-fill" style={{ width: `${Math.min(pityCounter/50*100, 100)}%` }} />
              </div>

              {/* Coin balance */}
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: textMuted }}>
                💰 Saldo: <strong style={{ color: '#FFD700' }}>{coins}</strong> coin
              </div>
            </>
          )}

          {/* ── COLLECTION TAB ── */}
          {tab === 'collection' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: textMain, marginBottom: 6 }}>
                  Koleksi Eksklusif ({wonExclusives.length}/{WHEEL_EXCLUSIVES.length})
                </div>
                <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
                  Item eksklusif yang hanya bisa didapat dari Lucky Wheel. Tidak dijual di Shop!
                </div>
              </div>
              <div className="collection-grid">
                {WHEEL_EXCLUSIVES.map(item => {
                  const owned = wonExclusives.includes(item.id)
                  return (
                    <div key={item.id} className={`collection-item ${owned?'owned':'locked'}`}>
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: `${RARITY_COLORS[item.rarity]}22`,
                        color: RARITY_COLORS[item.rarity],
                        fontSize: 9, fontWeight: 800, padding: '2px 8px',
                        borderRadius: 100, border: `1px solid ${RARITY_COLORS[item.rarity]}44`,
                      }}>
                        {RARITY_LABELS[item.rarity]}
                      </div>
                      {item.img ? (
                        <img src={item.img} alt={item.name}
                          style={{ filter: owned ? 'none' : 'grayscale(100%) brightness(0.4)' }} />
                      ) : (
                        <div style={{ fontSize: 40, marginBottom: 8 }}>{owned ? item.icon : '🔒'}</div>
                      )}
                      <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: owned ? textMain : textMuted, marginBottom: 2 }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 10, color: textMuted }}>
                        {item.game === 'space-shooter' ? '🚀 Space Shooter' :
                         item.game === 'voxel-racer' ? '🚗 Voxel Racer' :
                         item.game === 'neon-dash' ? '💎 Neon Dash' : item.game}
                      </div>
                      {owned && (
                        <div style={{ marginTop: 6, fontSize: 10, color: '#4ECDC4', fontWeight: 800 }}>✓ Dimiliki</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: textMain, marginBottom: 12 }}>
                📜 Riwayat Spin
              </div>
              {spinHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: textMuted, fontSize: 14 }}>
                  Belum ada riwayat spin
                </div>
              ) : (
                spinHistory.map((h, i) => (
                  <div key={i} className="history-item">
                    <span style={{ fontSize: 22 }}>{h.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: textMain }}>{h.label}</div>
                      <div style={{ fontSize: 10, color: textMuted }}>
                        {new Date(h.date).toLocaleDateString('id-ID')} {new Date(h.date).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                    <span style={{
                      background: `${RARITY_COLORS[h.rarity]}22`,
                      color: RARITY_COLORS[h.rarity],
                      fontSize: 10, fontWeight: 800, padding: '3px 8px',
                      borderRadius: 100,
                    }}>
                      {RARITY_LABELS[h.rarity]}
                    </span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Result Modal ── */}
      {result && (
        <div className="wheel-result" onClick={() => setResult(null)}>
          {/* Confetti for epic+ */}
          {(result.rarity === 'epic' || result.rarity === 'legendary') && (
            <div className="wheel-confetti">
              {Array.from({length: 40}).map((_, i) => (
                <span key={i} style={{
                  left: `${Math.random()*100}%`,
                  background: ['#FFD700','#FF6B6B','#A29BFE','#4ECDC4','#FF8C00','#E040FB'][i%6],
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  width: `${6+Math.random()*8}px`,
                  height: `${6+Math.random()*8}px`,
                  animationDelay: `${Math.random()*1.5}s`,
                  animationDuration: `${2+Math.random()*2}s`,
                }} />
              ))}
            </div>
          )}

          <div className="result-card" onClick={e => e.stopPropagation()}>
            <div className="result-banner" style={{
              background: `linear-gradient(90deg, ${RARITY_COLORS[result.rarity]}, ${RARITY_COLORS[result.rarity]}88, ${RARITY_COLORS[result.rarity]})`,
            }} />

            <div className="result-rarity" style={{
              background: `${RARITY_COLORS[result.rarity]}22`,
              color: RARITY_COLORS[result.rarity],
              border: `1px solid ${RARITY_COLORS[result.rarity]}44`,
            }}>
              {RARITY_LABELS[result.rarity]}
            </div>

            {result.img ? (
              <img className="result-img" src={result.img} alt={result.label} />
            ) : (
              <div className="result-icon">{result.icon}</div>
            )}

            <div className="result-name" style={{ color: textMain }}>{result.label}</div>
            <div className="result-desc">
              {result.desc || (result.type === 'coin' ? `+${result.amount} coin ditambahkan ke saldomu!`
                : result.type === 'xp' ? `+${result.amount} XP bonus!`
                : 'Kamu mendapatkan hadiah!')}
              {result.isDupe && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#FFD700', fontWeight: 700 }}>
                  ♻️ Item sudah dimiliki — konversi ke coin!
                </div>
              )}
            </div>

            <button className="result-close-btn" onClick={() => setResult(null)}>
              {result.rarity === 'legendary' ? '🌟 Keren!' : result.rarity === 'epic' ? '✨ Mantap!' : '👍 OK'}
            </button>
          </div>
        </div>
      )}

      {/* ── Individual Reward Reveal (during sequential 5× spin) ── */}
      {multiCurrentReward && (
        <div className="multi-result" onClick={advanceMultiSpin}>
          {/* Confetti if high rarity */}
          {(multiCurrentReward.rarity === 'epic' || multiCurrentReward.rarity === 'legendary') && (
            <div className="wheel-confetti">
              {Array.from({length: 40}).map((_, i) => (
                <span key={i} style={{
                  left: `${Math.random()*100}%`,
                  background: ['#FFD700','#FF6B6B','#A29BFE','#4ECDC4','#FF8C00','#E040FB'][i%6],
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  width: `${6+Math.random()*8}px`,
                  height: `${6+Math.random()*8}px`,
                  animationDelay: `${Math.random()*1}s`,
                  animationDuration: `${2+Math.random()*2}s`,
                }} />
              ))}
            </div>
          )}
          <div className="result-card" onClick={e => e.stopPropagation()} style={{ padding: '36px 24px' }}>
            {/* Spin number */}
            <div style={{
              fontSize: 11, fontWeight: 800, color: textMuted, textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: 8,
            }}>
              Spin {multiIdx} / {multiQueue ? multiQueue.length : MULTI_COUNT}
            </div>

            {/* Rarity badge */}
            <div className="result-rarity" style={{
              background: `${RARITY_COLORS[multiCurrentReward.rarity]}22`,
              color: RARITY_COLORS[multiCurrentReward.rarity],
              border: `1.5px solid ${RARITY_COLORS[multiCurrentReward.rarity]}44`,
            }}>
              {RARITY_LABELS[multiCurrentReward.rarity]}
            </div>

            {/* Icon / Image */}
            {multiCurrentReward.img ? (
              <img src={multiCurrentReward.img} alt={multiCurrentReward.label} className="result-img" />
            ) : (
              <div className="result-icon">{multiCurrentReward.icon}</div>
            )}

            {/* Name + desc */}
            <div className="result-name" style={{ color: textMain }}>{multiCurrentReward.label}</div>
            <div className="result-desc">
              {multiCurrentReward.type === 'coin' ? `+${multiCurrentReward.amount} coin`
                : multiCurrentReward.type === 'xp' ? `+${multiCurrentReward.amount} XP`
                : multiCurrentReward.type === 'exclusive' ? (multiCurrentReward.isDupe ? '♻️ Dupe → coin' : '🆕 Item baru!')
                : 'Reward'}
            </div>

            {/* Previously revealed items (mini) */}
            {multiRevealed.length > 1 && (
              <div style={{
                display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap',
              }}>
                {multiRevealed.slice(0, -1).map((r, i) => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: 10, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${RARITY_COLORS[r.rarity]}15`,
                    border: `1px solid ${RARITY_COLORS[r.rarity]}33`,
                  }}>
                    {r.img ? <img src={r.img} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} /> : <span style={{ fontSize: 16 }}>{r.icon}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="result-close-btn" onClick={advanceMultiSpin}>
                {multiIdx >= (multiQueue ? multiQueue.length : MULTI_COUNT) ? '🎉 Lihat Hasil!' : '▶ Lanjut'}
              </button>
              {multiQueue && multiIdx < multiQueue.length && (
                <button className="result-close-btn" onClick={skipMultiSpin}
                  style={{ background: 'linear-gradient(135deg,#636E72,#2D3436)', boxShadow: 'none' }}>
                  ⏩ Skip
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-Result Modal (5× Spin) ── */}
      {multiResults && (
        <div className="multi-result" onClick={() => setMultiResults(null)}>
          {/* Confetti if any epic+ */}
          {multiResults.some(r => r.rarity === 'epic' || r.rarity === 'legendary') && (
            <div className="wheel-confetti">
              {Array.from({length: 40}).map((_, i) => (
                <span key={i} style={{
                  left: `${Math.random()*100}%`,
                  background: ['#FFD700','#FF6B6B','#A29BFE','#4ECDC4','#FF8C00','#E040FB'][i%6],
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  width: `${6+Math.random()*8}px`,
                  height: `${6+Math.random()*8}px`,
                  animationDelay: `${Math.random()*1.5}s`,
                  animationDuration: `${2+Math.random()*2}s`,
                }} />
              ))}
            </div>
          )}

          <div className="multi-card" onClick={e => e.stopPropagation()}>
            <div style={{
              fontFamily: "'Fredoka One',cursive", fontSize: 22,
              background: 'linear-gradient(135deg,#E040FB,#AB47BC)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 4,
            }}>🎰 5× Spin Results!</div>
            <div style={{ fontSize: 12, color: textMuted, marginBottom: 16, fontWeight: 600 }}>
              {multiResults.filter(r => r.rarity === 'epic' || r.rarity === 'legendary').length > 0
                ? `✨ ${multiResults.filter(r => r.rarity === 'epic' || r.rarity === 'legendary').length} item langka!`
                : 'Hasil spinmu:'}
            </div>

            {/* Summary stats */}
            <div className="multi-summary">
              {(() => {
                const totalCoins = multiResults.reduce((s, r) => s + (r.type === 'coin' ? r.amount : r.type === 'xp' ? Math.round(r.amount / 5) : 0), 0)
                const totalXP = multiResults.reduce((s, r) => s + (r.type === 'xp' ? r.amount : 0), 0)
                const exclusiveCount = multiResults.filter(r => r.type === 'exclusive').length
                return (<>
                  {totalCoins > 0 && <div className="multi-stat">🪙 +{totalCoins} Coin</div>}
                  {totalXP > 0 && <div className="multi-stat">⭐ +{totalXP} XP</div>}
                  {exclusiveCount > 0 && <div className="multi-stat">🎁 {exclusiveCount} Exclusive</div>}
                </>)
              })()}
            </div>

            {/* Individual results */}
            {multiResults.map((reward, i) => {
              const rarityClass = reward.rarity === 'legendary' ? 'legendary' : reward.rarity === 'epic' ? 'epic' : ''
              return (
                <div key={i} className={`multi-item ${rarityClass}`}
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  {reward.img ? (
                    <img src={reward.img} alt={reward.label}
                      style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
                  ) : (
                    <span style={{ fontSize: 28, width: 36, textAlign: 'center' }}>{reward.icon}</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Fredoka One',cursive", fontSize: 13,
                      color: textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{reward.label}</div>
                    <div style={{ fontSize: 10, color: textMuted }}>
                      {reward.type === 'coin' ? `+${reward.amount} coin`
                        : reward.type === 'xp' ? `+${reward.amount} XP`
                        : reward.type === 'exclusive' ? (reward.isDupe ? '♻️ Dupe → coin' : '🆕 Baru!')
                        : 'Reward'}
                    </div>
                  </div>
                  <span style={{
                    background: `${RARITY_COLORS[reward.rarity]}22`,
                    color: RARITY_COLORS[reward.rarity],
                    fontSize: 9, fontWeight: 800, padding: '3px 8px',
                    borderRadius: 100, border: `1px solid ${RARITY_COLORS[reward.rarity]}44`,
                    flexShrink: 0,
                  }}>
                    {RARITY_LABELS[reward.rarity]}
                  </span>
                </div>
              )
            })}

            <button className="result-close-btn" style={{ marginTop: 16 }}
              onClick={() => setMultiResults(null)}>
              {multiResults.some(r => r.rarity === 'legendary') ? '🌟 Mantap!' : '✨ Oke!'}
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
