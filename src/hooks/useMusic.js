// useMusic.js — Procedural lo-fi chiptune BGM menggunakan Web Audio API
import { useRef, useEffect } from 'react'

// ─── Notes (Hz) ──────────────────────────────────────────────────────────────
const N = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
}

// ─── Themes Configuration ───────────────────────────────────────────────────
const THEMES = {
  ambient: {
    bpm: 94,
    chords: [
      { bass: N.C3, pads: [N.C4, N.E4, N.G4] },
      { bass: N.G3, pads: [N.G4, N.B4, N.D5] },
      { bass: N.A3, pads: [N.A4, N.C5, N.E5] },
      { bass: N.F3, pads: [N.F4, N.A4, N.C5] },
    ],
    melodies: [
      [N.E5,null,N.G5,null, N.A5,N.G5,N.E5,null],
      [N.G5,N.E5,null,N.D5, N.C5,null,N.E5,null],
    ],
    padType: 'sine',
    leadType: 'square'
  },
  intense: {
    bpm: 144,
    chords: [
      { bass: N.A3, pads: [N.A4, N.C5, N.E5] },
      { bass: N.F3, pads: [N.F4, N.A4, N.C5] },
      { bass: N.D3, pads: [N.D4, N.F4, N.A4] },
      { bass: N.E3, pads: [N.E4, N.G4, N.B4] },
    ],
    melodies: [
      [N.A5,N.E5,N.A5,N.E5, N.F5,N.D5,N.F5,N.D5],
      [N.A5,null,N.C5,null, N.B4,null,N.G4,null],
    ],
    padType: 'sawtooth',
    leadType: 'sawtooth'
  }
}

const ARP_SEQ = [0,1,2,1, 2,1,0,1]

class BGMEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.playing = false
    this.timer = null
    this.beat = 0
    this.nextTime = 0
    this.loopN = 0
    this.themeName = 'ambient'
    this.bpm = 94
  }

  init() {
    if (this.ctx) return true
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(this.ctx.destination)
      return true
    } catch(e) {
      return false
    }
  }

  setTheme(name) {
    if (!THEMES[name] || this.themeName === name) return
    this.themeName = name
    this.bpm = THEMES[name].bpm
    // Reset loop counting if needed for abrupt changes
  }

  tone(freq, time, dur, type, vol, pan = 0) {
    if (!this.ctx || !this.playing) return
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    const p = this.ctx.createStereoPanner()

    o.type = type
    o.frequency.setValueAtTime(freq, time)
    o.detune.setValueAtTime(Math.random() * 8 - 4, time)

    g.gain.setValueAtTime(0, time)
    g.gain.linearRampToValueAtTime(vol, time + 0.015)
    g.gain.setValueAtTime(vol * 0.8, time + dur * 0.7)
    g.gain.exponentialRampToValueAtTime(0.001, time + dur)

    p.pan.setValueAtTime(pan, time)

    o.connect(g)
    g.connect(p)
    p.connect(this.master)
    o.start(time)
    o.stop(time + dur + 0.05)
  }

  hihat(time, vol) {
    if (!this.ctx || !this.playing) return
    for (let i = 0; i < 2; i++) {
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.type = 'square'
      o.frequency.setValueAtTime(6000 + Math.random() * 6000, time)
      g.gain.setValueAtTime(0, time)
      g.gain.linearRampToValueAtTime(vol, time + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
      o.connect(g)
      g.connect(this.master)
      o.start(time)
      o.stop(time + 0.05)
    }
  }

  kick(time) {
    if (!this.ctx || !this.playing) return
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(180, time)
    o.frequency.exponentialRampToValueAtTime(32, time + 0.15)
    g.gain.setValueAtTime(0.45, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
    o.connect(g)
    g.connect(this.master)
    o.start(time)
    o.stop(time + 0.25)
  }

  scheduleBeat(t) {
    const theme = THEMES[this.themeName]
    const bd = 60 / this.bpm
    const ci = Math.floor((this.beat % 8) / 2)
    const ch = theme.chords[ci]
    const sub = this.beat % 2

    // ── BASS ──
    if (sub === 0) {
      this.tone(ch.bass, t, bd * 1.6, 'triangle', 0.25, 0)
      this.tone(ch.bass / 2, t, bd * 1.6, 'sine', 0.18, 0)
    }

    // ── PAD ──
    if (sub === 0) {
      ch.pads.forEach((note, i) => {
        this.tone(note, t, bd * 1.9, theme.padType, 0.06, (i - 1) * 0.4)
      })
    }

    // ── ARPEGGIO ──
    for (let i = 0; i < 4; i++) {
      const aIdx = ARP_SEQ[(sub * 4 + i) % ARP_SEQ.length]
      const note = ch.pads[aIdx]
      if (note) this.tone(note, t + i * bd / 4, bd / 4 * 0.7, 'triangle', 0.08, ((i % 2) * 2 - 1) * 0.25)
    }

    // ── MELODY ──
    const melodies = theme.melodies
    const mel = melodies[this.loopN % melodies.length]
    const melNote = mel[this.beat % 8]
    if (melNote) {
      this.tone(melNote, t + 0.01, bd * 0.7, theme.leadType, 0.09, 0.2)
      this.tone(melNote * 1.5, t + 0.01, bd * 0.5, 'sine', 0.04, -0.2)
    }

    // ── DRUMS ──
    if (this.beat % 4 === 0) this.kick(t)
    if (this.beat % 4 === 2) {
      this.hihat(t, 0.07)
      this.tone(200, t, 0.08, 'sawtooth', 0.10, 0)
    }
    for (let i = 0; i < 4; i++) {
        this.hihat(t + i * bd / 4, i === 0 ? 0.05 : 0.02)
    }
  }

  scheduler() {
    if (!this.ctx) return
    const look = 0.2
    while (this.nextTime < this.ctx.currentTime + look) {
      this.scheduleBeat(this.nextTime)
      this.nextTime += 60 / this.bpm
      this.beat++
      if (this.beat >= 8) { this.beat = 0; this.loopN++ }
    }
  }

  start() {
    if (!this.init()) return
    if (this.playing) return
    if (this.ctx.state === 'suspended') this.ctx.resume()

    this.playing = true
    this.beat = 0
    this.nextTime = this.ctx.currentTime + 0.05

    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(0.8, now + 1.5)

    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => this.scheduler(), 40)
  }

  stop() {
    if (!this.playing || !this.ctx) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(0, now + 1.2)

    const timer = this.timer
    this.timer = null
    setTimeout(() => {
      this.playing = false
      if (timer) { clearInterval(timer) }
    }, 1300)
  }

  destroy() {
    this.playing = false
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null }
  }
}

let _engine = null
const getEngine = () => { if (!_engine) _engine = new BGMEngine(); return _engine }

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMusic(shouldPlay, isMuted, themeName = 'ambient') {
  const gestureRef = useRef(false)

  useEffect(() => {
    const engine = getEngine()
    engine.setTheme(themeName)

    if (shouldPlay && !isMuted) {
      const tryStart = () => {
        engine.start()
        gestureRef.current = true
      }

      if (gestureRef.current) {
        engine.start()
      } else {
        const handler = () => {
          tryStart()
          document.removeEventListener('click', handler)
          document.removeEventListener('touchstart', handler)
          document.removeEventListener('keydown', handler)
        }
        document.addEventListener('click', handler)
        document.addEventListener('touchstart', handler)
        document.addEventListener('keydown', handler)

        return () => {
          document.removeEventListener('click', handler)
          document.removeEventListener('touchstart', handler)
          document.removeEventListener('keydown', handler)
        }
      }
    } else {
      engine.stop()
    }
  }, [shouldPlay, isMuted, themeName])

  useEffect(() => {
    return () => {
      // Don't destroy global engine on every unmount of a component using the hook
      // only if it's really intended. For now we keep it singleton.
    }
  }, [])
}
