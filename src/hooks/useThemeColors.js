import { useSettings } from '../context/SettingsContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'

/**
 * useThemeColors — returns the active palette based on website theme + dark mode.
 * Replace all hardcoded color ternaries with this hook.
 */
export function useThemeColors() {
  const { darkMode } = useSettings()
  const { getActiveWebTheme } = useCoins()
  const theme = getActiveWebTheme()
  const p = darkMode ? theme.dark : theme.light

  return {
    dark: darkMode,
    bg: p.bg,
    surface: p.surface,
    textMain: p.text,
    textMuted: p.muted,
    borderCol: p.border,
    accent: p.accent,
    accentAlt: p.accentAlt,
    navBg: p.navBg,
    navScrolled: p.navScrolled,
  }
}
