import { useCallback } from 'react'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

import { useSettings } from '../context/SettingsContext.jsx'

export function useHaptics() {
  const { hapticsEnabled } = useSettings()

  const vibrateLight = useCallback(() => {
    if (!hapticsEnabled) return
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  }, [hapticsEnabled])

  const vibrateMedium = useCallback(() => {
    if (!hapticsEnabled) return
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
  }, [hapticsEnabled])

  const vibrateHeavy = useCallback(() => {
    if (!hapticsEnabled) return
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
  }, [hapticsEnabled])

  const vibrateSuccess = useCallback(() => {
    if (!hapticsEnabled) return
    Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  }, [hapticsEnabled])

  const vibrateWarning = useCallback(() => {
    if (!hapticsEnabled) return
    Haptics.notification({ type: NotificationType.Warning }).catch(() => {})
  }, [hapticsEnabled])

  const vibrateError = useCallback(() => {
    if (!hapticsEnabled) return
    Haptics.notification({ type: NotificationType.Error }).catch(() => {})
  }, [hapticsEnabled])

  return {
    vibrateLight,
    vibrateMedium,
    vibrateHeavy,
    vibrateSuccess,
    vibrateWarning,
    vibrateError
  }
}
