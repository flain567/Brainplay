import { useEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'

/**
 * ThemeApplicator — lives inside CoinProvider + SettingsProvider.
 * Reads the active website theme + darkMode and applies CSS vars to :root and body.
 */
export default function ThemeApplicator() {
  const { darkMode } = useSettings()
  const { getActiveWebTheme } = useCoins()

  useEffect(() => {
    const theme = getActiveWebTheme()
    const palette = darkMode ? theme.dark : theme.light
    const root = document.documentElement

    root.style.setProperty('--bg',       palette.bg)
    root.style.setProperty('--surface',  palette.surface)
    root.style.setProperty('--text',     palette.text)
    root.style.setProperty('--muted',    palette.muted)
    root.style.setProperty('--border',   palette.border)
    root.style.setProperty('--accent',   palette.accent)
    root.style.setProperty('--accent-alt', palette.accentAlt)
    root.style.setProperty('--nav-bg',   palette.navBg)
    root.style.setProperty('--nav-scrolled', palette.navScrolled)

    document.body.style.background = palette.bg
    document.body.style.color = palette.text
  }, [darkMode, getActiveWebTheme])

  return null
}
