/**
 * CoinFlyManager.jsx
 * ──────────────────
 * Menangkap event 'bp-coin-fly' dan membuat animasi koin terbang
 * dari posisi sumber ke counter koin di Navbar menggunakan GSAP MotionPath.
 *
 * Murni imperatif — tidak ada React state, render null.
 * Ditempatkan di App.jsx berdampingan dengan <CoinToast />.
 *
 * Event payload: { fromX, fromY, amount }
 *   fromX/fromY — posisi asal dalam viewport (px)
 *   amount      — jumlah koin (menentukan jumlah partikel)
 */
import { useEffect } from 'react'
import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

// Jumlah partikel berdasarkan besar reward
function particleCount(amount) {
  if (amount >= 500) return 7
  if (amount >= 100) return 5
  if (amount >= 20)  return 4
  return 3
}

function spawnCoins(fromX, fromY, amount) {
  // Cari coin counter yang sedang visible di viewport
  const targets = document.querySelectorAll('[data-coin-counter]')
  let target = null
  for (const el of targets) {
    const r = el.getBoundingClientRect()
    // Cek elemen terlihat (bukan display:none dan dalam viewport)
    if (r.width > 0 && r.top >= 0 && r.top <= window.innerHeight) {
      target = el; break
    }
  }
  if (!target) return

  const tr  = target.getBoundingClientRect()
  const toX = tr.left + tr.width  / 2
  const toY = tr.top  + tr.height / 2
  const n   = particleCount(amount)

  for (let i = 0; i < n; i++) {
    const el = document.createElement('div')
    el.textContent = '🪙'
    el.style.cssText = [
      'position:fixed',
      'left:0', 'top:0',
      'font-size:18px',
      'line-height:1',
      'pointer-events:none',
      'z-index:99999',
      'will-change:transform,opacity',
      'transform-origin:center center',
    ].join(';')
    document.body.appendChild(el)

    // Scatter acak di sekitar titik asal
    const sx = fromX + (Math.random() - 0.5) * 44
    const sy = fromY + (Math.random() - 0.5) * 22

    // Titik puncak busur — selalu mengarah ke atas/navbar
    const mx = (sx + toX) / 2 + (Math.random() - 0.5) * 90
    const my = Math.min(sy, toY) - 55 - Math.random() * 55

    gsap.set(el, { x: sx, y: sy, scale: 1, opacity: 1 })

    const dur   = 0.62 + Math.random() * 0.18
    const delay = i * 0.072

    // 1. Terbang ke target via MotionPath busur Bezier
    gsap.to(el, {
      duration: dur,
      delay,
      ease: 'power2.in',
      motionPath: {
        path: [
          { x: sx, y: sy },
          { x: mx, y: my },
          { x: toX, y: toY },
        ],
        curviness: 1.35,
        autoRotate: false,
      },
      scale: 0.25,
      opacity: 0,
      onComplete: () => el.remove(),
    })

    // 2. Target berdenyut saat koin tiba
    const arrivalTime = (delay + dur) * 1000
    setTimeout(() => {
      if (!target) return
      gsap.fromTo(target,
        { scale: 1 },
        { scale: 1.22, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }
      )
    }, arrivalTime)
  }
}

export default function CoinFlyManager() {
  useEffect(() => {
    const handler = (e) => {
      const { fromX, fromY, amount } = e.detail || {}
      // Tunda sedikit agar toast sudah muncul dulu
      requestAnimationFrame(() => {
        spawnCoins(
          fromX ?? window.innerWidth / 2,
          fromY ?? 110,
          amount ?? 10
        )
      })
    }

    window.addEventListener('bp-coin-fly', handler)
    return () => window.removeEventListener('bp-coin-fly', handler)
  }, [])

  return null
}
