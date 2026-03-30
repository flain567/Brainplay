/**
 * useGSAPScrollTrigger.js
 * ────────────────────────
 * Animasi scroll-triggered untuk .flip-item (mini game cards) di Home.jsx.
 *
 * Pembagian kerja:
 *   • Anime.js (useHomeAnimations) → section-title, data-anime-*, count-up, spring
 *   • GSAP ScrollTrigger (hook ini) → .flip-item cards & .tag-filter-row
 *
 * Tidak konflik karena target elemen berbeda.
 * once:true → Flip bebas override state setelah filter berubah.
 */
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function useGSAPScrollTrigger(reduceMotion = false) {
  const batchRef = useRef([])

  useEffect(() => {
    if (reduceMotion) return

    // Tunggu DOM settle setelah React render pertama
    const timer = setTimeout(() => {

      // ── 1. Tag filter row ───────────────────────────────────────────────
      const filterRow = document.querySelector('.tag-filter-row')
      if (filterRow) {
        gsap.set(filterRow, { opacity: 0, y: 10 })
        const st = ScrollTrigger.create({
          trigger: filterRow,
          start: 'top 92%',
          once: true,
          onEnter: () => gsap.to(filterRow, {
            opacity: 1, y: 0,
            duration: 0.4,
            ease: 'power2.out',
          }),
        })
        batchRef.current.push(st)
      }

      // ── 2. Flip grid — ScrollTrigger.batch per card ──────────────────────
      // ScrollTrigger.batch mengelompokkan kartu yang masuk viewport
      // bersamaan dan menganimasikannya dengan stagger otomatis.
      const grid = document.querySelector('.flip-grid')
      if (!grid) return

      const batches = ScrollTrigger.batch('.flip-item', {
        // Kartu mulai animasi saat 10% dari atas kartu menyentuh 88% tinggi viewport
        start: 'top 88%',
        once: true,

        // Set initial state sebelum animasi
        onEnterBack: () => {},

        // Tiap batch (sekelompok kartu yang masuk viewport bersamaan) dianimasikan
        onEnter: batch => {
          gsap.fromTo(
            batch,
            {
              opacity: 0,
              y: 28,
              scale: 0.88,
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.45,
              ease: 'back.out(1.6)',
              stagger: {
                each: 0.07,   // 70ms antar kartu dalam satu batch
                from: 'start',
              },
              overwrite: 'auto',
            }
          )
        },

        // Batchsize — kartu yang masuk dalam window 100ms dianggap satu batch
        interval: 0.1,
      })

      // batch() mengembalikan array ScrollTrigger untuk cleanup
      batchRef.current.push(...(Array.isArray(batches) ? batches : [batches]))

      // ── 3. Set initial state untuk semua flip-item ────────────────────
      // Harus SETELAH batch() setup supaya trigger sudah terdaftar
      gsap.set('.flip-item', { opacity: 0, y: 28, scale: 0.88 })

    }, 180)

    return () => {
      clearTimeout(timer)
      batchRef.current.forEach(t => { try { t.kill() } catch {} })
      batchRef.current = []
      // Reset state jika ada elemen yang belum teranimasikan
      gsap.set('.flip-item', { clearProps: 'opacity,transform' })
    }
  }, [reduceMotion])
}
