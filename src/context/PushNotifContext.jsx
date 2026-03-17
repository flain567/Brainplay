import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const PushNotifContext = createContext(null)

const STORAGE_KEY = 'bp-push-settings'

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

// ─── Daily challenge reminder hours (user picks) ─────────────────────────────
export const REMINDER_HOURS = [
  { id: '7', label: '07:00 Pagi', hour: 7 },
  { id: '9', label: '09:00 Pagi', hour: 9 },
  { id: '12', label: '12:00 Siang', hour: 12 },
  { id: '18', label: '18:00 Sore', hour: 18 },
  { id: '20', label: '20:00 Malam', hour: 20 },
]

export function PushNotifProvider({ children }) {
  const [permission, setPermission] = useState(
    () => typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [settings, setSettings] = useState(() => ({
    dailyChallengeEnabled: false,
    reminderHour: '20',
    streakAlertEnabled: true,
    ...loadSettings(),
  }))
  const [swReg, setSwReg] = useState(null)
  const alarmTimerRef = useRef(null)

  // Get SW registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => setSwReg(reg))
    }
  }, [])

  // Save settings on change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // ─── Request permission ──────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported'
    if (Notification.permission === 'granted') {
      setPermission('granted')
      return 'granted'
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  // ─── Send local notification via SW ─────────────────────────────────────
  const sendLocalNotif = useCallback(({ title, body, tag, icon }) => {
    if (permission !== 'granted') return
    if (swReg) {
      // Via service worker (works in background)
      if (swReg.active) {
        swReg.active.postMessage({ type: 'SHOW_NOTIF', title, body, tag, icon })
      } else {
        swReg.showNotification(title, { body, icon: icon || '/icon-192.svg', tag })
      }
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: icon || '/icon-192.svg', tag })
    }
  }, [permission, swReg])

  // ─── Schedule daily challenge reminder ───────────────────────────────────
  const scheduleDailyReminder = useCallback((hourId) => {
    if (permission !== 'granted') return
    if (!swReg?.active) return

    // Cancel existing
    swReg.active.postMessage({ type: 'CANCEL_NOTIF', id: 'daily-challenge' })

    const hour = REMINDER_HOURS.find(h => h.id === hourId)?.hour ?? 20
    const now = new Date()
    const fireAt = new Date()
    fireAt.setHours(hour, 0, 0, 0)
    if (fireAt <= now) fireAt.setDate(fireAt.getDate() + 1)

    swReg.active.postMessage({
      type: 'SCHEDULE_NOTIF',
      id: 'daily-challenge',
      title: '🎯 Daily Challenge BrainPlay!',
      body: 'Tantangan harian kamu sudah siap. Klaim reward-mu sekarang!',
      tag: 'daily-challenge',
      fireAt: fireAt.getTime(),
    })

    // Also set a JS timer as backup (works when tab open)
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current)
    const delay = fireAt.getTime() - Date.now()
    alarmTimerRef.current = setTimeout(() => {
      sendLocalNotif({
        title: '🎯 Daily Challenge BrainPlay!',
        body: 'Tantangan harian kamu sudah siap. Klaim reward-mu sekarang!',
        tag: 'daily-challenge',
      })
      // Re-schedule for tomorrow
      if (settings.dailyChallengeEnabled) scheduleDailyReminder(hourId)
    }, delay)
  }, [permission, swReg, sendLocalNotif, settings.dailyChallengeEnabled])

  // ─── Streak alert ───────────────────────────────────────────────────────
  const sendStreakAlert = useCallback((streak) => {
    if (!settings.streakAlertEnabled || permission !== 'granted') return
    if (streak >= 3) {
      sendLocalNotif({
        title: `🔥 Streak ${streak} Hari!`,
        body: streak >= 7
          ? `Luar biasa! Streak ${streak} hari berturut-turut. Kamu juara! 👑`
          : `Mainkan terus! Jaga streak ${streak} hari kamu. Jangan sampai putus!`,
        tag: 'streak-alert',
      })
    }
  }, [settings.streakAlertEnabled, permission, sendLocalNotif])

  // ─── Milestone notification ─────────────────────────────────────────────
  const sendMilestoneNotif = useCallback(({ type, value }) => {
    if (permission !== 'granted') return
    const messages = {
      levelUp:   { title: `🎉 Level Up! Level ${value}`, body: 'Kamu semakin jago! Tantang dirimu dengan game yang lebih sulit.' },
      allChallenges: { title: '🏆 Semua Challenge Selesai!', body: `Kamu menyelesaikan semua tantangan hari ini dan mendapat bonus +${value} koin!` },
      newStreak: { title: `🔥 Streak ${value} Hari!`, body: 'Mainkan game setiap hari dan kumpulkan reward lebih banyak!' },
    }
    const msg = messages[type]
    if (msg) sendLocalNotif({ ...msg, tag: type })
  }, [permission, sendLocalNotif])

  // ─── Update settings ────────────────────────────────────────────────────
  const updateSettings = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      return next
    })
  }, [])

  // ─── Toggle daily challenge reminder ────────────────────────────────────
  const toggleDailyReminder = useCallback(async (enabled, hourId) => {
    const perm = enabled ? await requestPermission() : permission
    if (enabled && perm !== 'granted') return false

    updateSettings({ dailyChallengeEnabled: enabled, reminderHour: hourId || settings.reminderHour })

    if (enabled) {
      scheduleDailyReminder(hourId || settings.reminderHour)
    } else {
      if (swReg?.active) swReg.active.postMessage({ type: 'CANCEL_NOTIF', id: 'daily-challenge' })
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current)
    }
    return true
  }, [permission, requestPermission, updateSettings, settings.reminderHour, scheduleDailyReminder, swReg])

  // ─── Re-schedule on app load if enabled ─────────────────────────────────
  useEffect(() => {
    if (settings.dailyChallengeEnabled && permission === 'granted' && swReg) {
      scheduleDailyReminder(settings.reminderHour)
    }
  }, [swReg]) // Only on SW ready

  const isSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator

  return (
    <PushNotifContext.Provider value={{
      permission,
      isSupported,
      settings,
      requestPermission,
      toggleDailyReminder,
      updateSettings,
      sendLocalNotif,
      sendStreakAlert,
      sendMilestoneNotif,
      REMINDER_HOURS,
    }}>
      {children}
    </PushNotifContext.Provider>
  )
}

export function usePushNotif() { return useContext(PushNotifContext) }
