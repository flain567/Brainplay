import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'

const SettingsContext = createContext(null)

function initialReduceMotion() {
  try {
    const v = localStorage.getItem('brainplay-reduce-motion')
    if (v === 'true') return true
    if (v === 'false') return false
  } catch { /* ignore */ }
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('brainplay-dark') !== 'false'
  )
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion)
  const [muted, setMuted] = useState(
    () => localStorage.getItem('brainplay-muted') === 'true'
  )
  const [musicOff, setMusicOff] = useState(
    () => localStorage.getItem('brainplay-music-off') === 'true'
  )
  const [notifEnabled, setNotifEnabled] = useState(
    () => localStorage.getItem('brainplay-notif') === 'true'
  )
  const [hapticsEnabled, setHapticsEnabled] = useState(
    () => localStorage.getItem('brainplay-haptics') !== 'false'
  )

  // Dark mode class toggle + persist (CSS vars now handled by ThemeApplicator)
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    localStorage.setItem('brainplay-dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('brainplay-muted', muted)
  }, [muted])

  useEffect(() => {
    localStorage.setItem('brainplay-music-off', musicOff)
  }, [musicOff])

  useEffect(() => {
    localStorage.setItem('brainplay-notif', notifEnabled)
  }, [notifEnabled])

  useEffect(() => {
    localStorage.setItem('brainplay-haptics', hapticsEnabled)
  }, [hapticsEnabled])

  useEffect(() => {
    localStorage.setItem('brainplay-reduce-motion', reduceMotion ? 'true' : 'false')
  }, [reduceMotion])

  useLayoutEffect(() => {
    document.body.classList.toggle('bp-reduce-motion', reduceMotion)
  }, [reduceMotion])

  const toggle = {
    darkMode: () => setDarkMode(v => !v),
    muted:    () => setMuted(v => !v),
    musicOff: () => setMusicOff(v => !v),
    notif:    () => setNotifEnabled(v => !v),
    haptics:  () => setHapticsEnabled(v => !v),
    reduceMotion: () => setReduceMotion(v => !v),
  }

  return (
    <SettingsContext.Provider value={{ darkMode, muted, musicOff, notifEnabled, hapticsEnabled, reduceMotion, toggle }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
