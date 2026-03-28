/**
 * useHomeAnimations.js
 * ────────────────────
 * 4 fitur Anime.js v4 untuk Home page BrainPlay:
 *   1. Stagger Grid   — game cards ripple entrance
 *   2. onScroll        — section reveal on scroll
 *   3. Timeline        — dashboard cards orchestrated sequence
 *   4. Number Animate  — count-up XP / coins / streak
 *
 * Semua animasi di-skip jika reduceMotion === true.
 */
import { useEffect, useRef } from 'react'

let animeModules = null

/** Lazy-load semua Anime.js yang dibutuhkan (1 kali) */
async function loadAnime() {
  if (animeModules) return animeModules
  const [animMod, utilsMod, tlMod, scrollMod] = await Promise.all([
    import('animejs/animation'),
    import('animejs/utils'),
    import('animejs/timeline'),
    import('animejs/events'),
  ])
  animeModules = {
    animate:        animMod.animate,
    stagger:        utilsMod.stagger,
    utils:          utilsMod,
    createTimeline: tlMod.createTimeline,
    onScroll:       scrollMod.onScroll,
  }
  return animeModules
}

export default function useHomeAnimations(reduceMotion = false) {
  const cleanups = useRef([])

  useEffect(() => {
    if (reduceMotion) return

    let cancelled = false

    const init = async () => {
      // Slight delay to let DOM settle after React render
      await new Promise(r => setTimeout(r, 150))
      if (cancelled) return

      const { animate, stagger, createTimeline, onScroll } = await loadAnime()
      if (cancelled) return

      /* ─────────────────────────────────────
       * 1. STAGGER GRID — game cards ripple
       * ───────────────────────────────────── */
      const cardSections = document.querySelectorAll('[data-anime-cards]')
      cardSections.forEach(section => {
        const cards = section.querySelectorAll('.gcard')
        if (!cards.length) return

        // Set initial state
        cards.forEach(c => {
          c.style.opacity = '0'
          c.style.transform = 'translateY(24px) scale(0.92)'
        })

        // Animate with stagger from center — ripple effect
        const anim = animate(cards, {
          opacity: [0, 1],
          translateY: [24, 0],
          scale: [0.92, 1],
          delay: stagger(60, { from: 'center' }),
          duration: 600,
          ease: 'out(3)',
          autoplay: onScroll({
            target: section,
            enter: 'bottom-=100 top',
          }),
        })
        cleanups.current.push(() => { try { anim.pause() } catch {} })
      })

      /* ─────────────────────────────────────
       * 2. ONSCROLL — section reveal
       * ───────────────────────────────────── */
      const sections = document.querySelectorAll('[data-anime-section]')
      sections.forEach(el => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(32px)'

        const anim = animate(el, {
          opacity: [0, 1],
          translateY: [32, 0],
          duration: 700,
          ease: 'out(3)',
          autoplay: onScroll({
            target: el,
            enter: 'bottom-=80 top',
          }),
        })
        cleanups.current.push(() => { try { anim.pause() } catch {} })
      })

      /* ─────────────────────────────────────
       * 3. TIMELINE — dashboard cards sequence
       * ───────────────────────────────────── */
      const dashGrid = document.querySelector('[data-anime-dashboard]')
      if (dashGrid) {
        const children = dashGrid.children
        if (children.length) {
          // Set initial state
          Array.from(children).forEach(child => {
            child.style.opacity = '0'
            child.style.transform = 'translateY(20px)'
          })

          const tl = createTimeline({
            defaults: {
              duration: 500,
              ease: 'out(3)',
            },
          })

          Array.from(children).forEach((child, i) => {
            tl.add(child, {
              opacity: [0, 1],
              translateY: [20, 0],
            }, i * 120) // 120ms stagger between each dashboard card
          })

          cleanups.current.push(() => { try { tl.pause() } catch {} })
        }
      }

      /* ─────────────────────────────────────
       * 4. NUMBER ANIMATION — count-up
       * ───────────────────────────────────── */
      const countEls = document.querySelectorAll('[data-anime-count]')
      countEls.forEach(el => {
        const targetVal = parseInt(el.getAttribute('data-anime-count'), 10)
        if (isNaN(targetVal) || targetVal <= 0) return

        const obj = { val: 0 }
        const suffix = el.getAttribute('data-anime-suffix') || ''
        const prefix = el.getAttribute('data-anime-prefix') || ''

        const anim = animate(obj, {
          val: [0, targetVal],
          duration: Math.min(1200, 400 + targetVal * 2),
          ease: 'out(3)',
          onUpdate: () => {
            el.textContent = prefix + Math.round(obj.val).toLocaleString() + suffix
          },
        })
        cleanups.current.push(() => { try { anim.pause() } catch {} })
      })
    }

    init()

    return () => {
      cancelled = true
      cleanups.current.forEach(fn => fn())
      cleanups.current = []
    }
  }, [reduceMotion])
}
