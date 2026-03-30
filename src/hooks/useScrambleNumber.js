/**
 * useScrambleNumber.js
 * ─────────────────────
 * Hook reusable untuk animasi GSAP ScrambleText pada elemen angka.
 *
 * Cara pakai:
 *   const ref = useScrambleNumber(value, { chars: '0123456789', duration: 0.9 })
 *   <span ref={ref}>{value.toLocaleString()}</span>
 *
 * Saat `value` berubah, teks di elemen akan scramble dari angka acak
 * lalu resolve ke nilai akhir yang benar.
 */
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

/**
 * @param {number|string} value   — nilai akhir yang ingin ditampilkan
 * @param {object}        options
 *   @param {string}  chars      — karakter untuk scramble (default: angka)
 *   @param {number}  duration   — durasi animasi dalam detik (default: 0.85)
 *   @param {number}  speed      — kecepatan resolusi 0–1 (default: 0.45)
 *   @param {number}  revealDelay— delay sebelum mulai resolve (default: 0.4)
 *   @param {boolean} skipFirst  — skip animasi saat mount pertama (default: true)
 *   @param {function} format    — fungsi format nilai akhir (default: toLocaleString)
 */
export default function useScrambleNumber(value, {
  chars        = '0123456789',
  duration     = 0.85,
  speed        = 0.45,
  revealDelay  = 0.4,
  skipFirst    = true,
  format       = null,
} = {}) {
  const ref        = useRef(null)
  const isFirst    = useRef(true)
  const tweenRef   = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Skip animasi saat mount pertama jika skipFirst = true
    if (isFirst.current) {
      isFirst.current = false
      if (skipFirst) return
    }

    // Format nilai akhir
    const finalText = format
      ? format(value)
      : typeof value === 'number'
        ? value.toLocaleString()
        : String(value)

    // Kill tween sebelumnya jika masih jalan
    if (tweenRef.current) {
      tweenRef.current.kill()
    }

    tweenRef.current = gsap.to(el, {
      duration,
      scrambleText: {
        text:        finalText,
        chars,
        speed,
        revealDelay,
        delimiter:   '',
      },
      ease: 'none',
      overwrite:  true,
    })

    return () => {
      if (tweenRef.current) tweenRef.current.kill()
    }
  }, [value])

  return ref
}

/**
 * scrambleOnce — helper untuk animasi satu kali pada elemen DOM
 * (untuk kasus di luar hook lifecycle, misal saat WinModal mount)
 *
 * @param {HTMLElement} el      — target element
 * @param {string}      text    — teks akhir
 * @param {object}      opts    — opsi (sama dengan useScrambleNumber)
 */
export function scrambleOnce(el, text, {
  chars       = '0123456789',
  duration    = 0.7,
  speed       = 0.5,
  revealDelay = 0.3,
  delay       = 0,
} = {}) {
  if (!el) return
  return gsap.to(el, {
    duration,
    delay,
    scrambleText: {
      text,
      chars,
      speed,
      revealDelay,
      delimiter: '',
    },
    ease: 'none',
  })
}
