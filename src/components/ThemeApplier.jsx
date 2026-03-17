import { useEffect } from 'react'
import { useCoins, APP_THEMES } from '../context/CoinContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

/**
 * ThemeApplier — mounts with no UI, just applies CSS variables
 * from the active app theme to :root whenever theme changes.
 * Dark mode overrides background/surface/text.
 */
export default function ThemeApplier() {
  const { getActiveAppTheme } = useCoins()
  const { darkMode } = useSettings()

  useEffect(() => {
    const theme = getActiveAppTheme()
    const root = document.documentElement

    // Apply all theme vars
    Object.entries(theme.vars).forEach(([k, v]) => {
      root.style.setProperty(k, v)
    })

    // If darkMode is ON, override bg/surface/text/muted/border
    // with dark variants (we blend theme color into dark palette)
    if (darkMode) {
      // Keep the primary/secondary/accent from the theme,
      // but force dark bg/surface regardless of theme choice
      root.style.setProperty('--theme-bg',        '#0d0b1e')
      root.style.setProperty('--theme-surface',   '#16213e')
      root.style.setProperty('--theme-text',      '#e8e8f0')
      root.style.setProperty('--theme-muted',     '#8892b0')
      root.style.setProperty('--theme-border',    '#2d3561')
      root.style.setProperty('--theme-navbar-bg', 'rgba(13,11,30,0.97)')
      root.style.setProperty('--theme-card-bg',   '#16213e')
    }

    // Apply to body background
    const bg = darkMode ? '#0d0b1e' : theme.vars['--theme-bg']
    document.body.style.background = bg

    // Expose glow color for components that need it
    const glow = theme.vars['--theme-glow'] || '253,203,110'
    root.style.setProperty('--theme-glow', glow)

  }, [getActiveAppTheme, darkMode])

  return null
}
