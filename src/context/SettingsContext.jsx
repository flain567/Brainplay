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

  // Apply dark mode ke root CSS variables
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.style.setProperty('--bg',       '#1a1a2e')
      root.style.setProperty('--surface',  '#16213e')
      root.style.setProperty('--text',     '#e8e8f0')
      root.style.setProperty('--muted',    '#8892b0')
      root.style.setProperty('--border',   '#2d3561')
      document.body.style.background = '#1a1a2e'
      document.body.style.color = '#e8e8f0'
    } else {
      root.style.setProperty('--bg',       '#FFF9F0')
      root.style.setProperty('--surface',  '#FFFFFF')
      root.style.setProperty('--text',     '#2D3436')
      root.style.setProperty('--muted',    '#636E72')
      root.style.setProperty('--border',   '#DFE6E9')
      document.body.style.background = '#FFF9F0'
      document.body.style.color = '#2D3436'
    }
    localStorage.setItem('brainplay-dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('brainplay-muted', muted)
  }, [muted])

  useEffect(() => {
    localStorage.setItem('brainplay-music-off', musicOff)
  }, [musicOff])

  const toggle = {
    darkMode: () => setDarkMode(v => !v),
    muted:    () => setMuted(v => !v),
    musicOff: () => setMusicOff(v => !v),
  }

  return (
    <SettingsContext.Provider value={{ darkMode, muted, musicOff, toggle }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
