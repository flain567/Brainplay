// useSound.js — Sound effects menggunakan Web Audio API (tanpa library external)
import { useCallback, useRef, useEffect } from 'react'

function createAudioContext() {
  if (typeof window === 'undefined') return null
  return new (window.AudioContext || window.webkitAudioContext)()
}

// Buat beep/tone programatically
function playTone(ctx, { frequency = 440, type = 'sine', duration = 0.1, gain = 0.3, delay = 0 } = {}) {
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gainNode   = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type      = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay)
  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)

  oscillator.start(ctx.currentTime + delay)
  oscillator.stop(ctx.currentTime + delay + duration + 0.05)
}

// Kumpulan sound presets
const SOUNDS = {
  flip: (ctx) => {
    playTone(ctx, { frequency: 600, type: 'sine', duration: 0.08, gain: 0.2 })
  },
  match: (ctx) => {
    // Chord naik — nada sukses
    playTone(ctx, { frequency: 523, type: 'sine', duration: 0.15, gain: 0.25, delay: 0 })
    playTone(ctx, { frequency: 659, type: 'sine', duration: 0.15, gain: 0.25, delay: 0.05 })
    playTone(ctx, { frequency: 784, type: 'sine', duration: 0.2,  gain: 0.3,  delay: 0.1 })
  },
  mismatch: (ctx) => {
    // Nada turun — error
    playTone(ctx, { frequency: 300, type: 'sawtooth', duration: 0.12, gain: 0.15, delay: 0 })
    playTone(ctx, { frequency: 220, type: 'sawtooth', duration: 0.15, gain: 0.12, delay: 0.08 })
  },
  win: (ctx) => {
    // Fanfare kemenangan
    const melody = [523, 659, 784, 1047]
    melody.forEach((f, i) => {
      playTone(ctx, { frequency: f, type: 'sine', duration: 0.2, gain: 0.3, delay: i * 0.12 })
    })
    // Tambah harmoni
    playTone(ctx, { frequency: 1047, type: 'sine', duration: 0.5, gain: 0.2, delay: 0.5 })
  },
  click: (ctx) => {
    playTone(ctx, { frequency: 800, type: 'sine', duration: 0.05, gain: 0.15 })
  },
  pop: (ctx) => {
    playTone(ctx, { frequency: 700, type: 'sine', duration: 0.04, gain: 0.3 })
    playTone(ctx, { frequency: 1200, type: 'sine', duration: 0.05, gain: 0.1, delay: 0.04 })
  },
  hover: (ctx) => {
    playTone(ctx, { frequency: 1000, type: 'sine', duration: 0.04, gain: 0.08 })
  },
  // Snake game sounds
  eat: (ctx) => {
    playTone(ctx, { frequency: 880, type: 'square', duration: 0.08, gain: 0.2 })
    playTone(ctx, { frequency: 1100, type: 'square', duration: 0.06, gain: 0.15, delay: 0.06 })
  },
  gameOver: (ctx) => {
    playTone(ctx, { frequency: 400, type: 'sawtooth', duration: 0.2, gain: 0.25, delay: 0 })
    playTone(ctx, { frequency: 300, type: 'sawtooth', duration: 0.2, gain: 0.22, delay: 0.15 })
    playTone(ctx, { frequency: 200, type: 'sawtooth', duration: 0.4, gain: 0.2,  delay: 0.3 })
  },
  levelUp: (ctx) => {
    [392, 523, 659, 784].forEach((f, i) => {
      playTone(ctx, { frequency: f, type: 'triangle', duration: 0.12, gain: 0.25, delay: i * 0.08 })
    })
  },
  toggle: (ctx) => {
    playTone(ctx, { frequency: 700, type: 'sine', duration: 0.07, gain: 0.15 })
  },
  trophy: (ctx) => {
    // Grand celebratory sound
    [523, 659, 784, 1047, 1318].forEach((f, i) => {
      playTone(ctx, { frequency: f, type: 'triangle', duration: 0.3, gain: 0.2, delay: i * 0.05 })
    });
    // Lower support notes for fullness
    [261, 329, 392].forEach((f, i) => {
      playTone(ctx, { frequency: f, type: 'sine', duration: 0.4, gain: 0.15, delay: 0.1 + i * 0.05 })
    });
  },
}

export function useSound() {
  const ctxRef    = useRef(null)
  const mutedRef  = useRef(false)

  // Lazy init AudioContext (harus dipicu user gesture)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext()
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const play = useCallback((soundName) => {
    if (mutedRef.current) return
    const fn = SOUNDS[soundName]
    if (fn) fn(getCtx())
  }, [getCtx])

  const setMuted = useCallback((val) => {
    mutedRef.current = val
  }, [])

  return { play, setMuted }
}
