import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('brainplay-dark') === 'true'
  )
  const [muted, setMuted] = useState(
    () => localStorage.getItem('brainplay-muted') === 'true'
  )
  const [musicOff, setMusicOff] = useState(
    () => localStorage.getItem('brainplay-music-off') === 'true'
  )
  const [notifEnabled, setNotifEnabled] = useState(
    () => localStorage.getItem('brainplay-notif') === 'true'
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

  const toggle = {
    darkMode: () => setDarkMode(v => !v),
    muted:    () => setMuted(v => !v),
    musicOff: () => setMusicOff(v => !v),
    notif:    () => setNotifEnabled(v => !v),
  }

  return (
    <SettingsContext.Provider value={{ darkMode, muted, musicOff, notifEnabled, toggle }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
