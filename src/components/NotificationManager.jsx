import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'
import { useProgress } from '../context/ProgressContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

const NOTIF_STORAGE_KEY = 'bp_notifications'
const NOTIF_LAST_REMINDER = 'bp_last_reminder'
const MAX_NOTIFICATIONS = 20

// ─── Notification types ────────────────────────────────────────────────────
const NOTIF_TYPES = {
  DAILY_CHALLENGE: { icon: '🗓️', color: '#FDCB6E', label: 'Daily Challenge' },
  STREAK_ALERT:   { icon: '🔥', color: '#FF6B6B', label: 'Streak Alert' },
  STREAK_RISK:    { icon: '⚠️', color: '#E17055', label: 'Streak at Risk' },
  LOGIN_REWARD:   { icon: '🎁', color: '#4ECDC4', label: 'Hadiah Harian' },
  MILESTONE:      { icon: '🏆', color: '#A29BFE', label: 'Milestone' },
}

// ─── Load/save notifications from localStorage ────────────────────────────
function loadNotifications() {
  try { return JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY)) || [] }
  catch { return [] }
}
function saveNotifications(notifs) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFICATIONS)))
}

// ─── Request browser notification permission ──────────────────────────────
export async function requestNotifPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

// ─── Send a browser notification ──────────────────────────────────────────
function sendBrowserNotif(title, body, icon = '🎮') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/icon-192.svg',
      tag: 'brainplay-' + Date.now(),
    })
  } catch (e) {
    // Fallback: some browsers block Notification constructor
  }
}

// ─── Hook: useNotifications ────────────────────────────────────────────────
export function useNotifications() {
  const { notifEnabled } = useSettings()
  const { isDailyClaimable, dailyStreak } = useCoins()
  const { progress } = useProgress()
  const [notifications, setNotifications] = useState(loadNotifications)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const checkedRef = useRef(false)
  const streak = progress.currentStreak || 0

  // Persist on change
  useEffect(() => {
    saveNotifications(notifications)
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Add a notification
  const addNotification = useCallback((type, title, message) => {
    const meta = NOTIF_TYPES[type] || NOTIF_TYPES.DAILY_CHALLENGE
    const notif = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      icon: meta.icon,
      color: meta.color,
      time: Date.now(),
      read: false,
    }
    setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFICATIONS))
    return notif
  }, [])

  // Mark all as read
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // ─── Automated notification checks (runs once per page load) ──────────
  useEffect(() => {
    if (checkedRef.current || !notifEnabled) return
    checkedRef.current = true

    const now = Date.now()
    const lastReminder = parseInt(localStorage.getItem(NOTIF_LAST_REMINDER) || '0')
    const hoursSince = (now - lastReminder) / (1000 * 60 * 60)

    // Daily challenge reminder (if >8 hours since last reminder)
    if (isDailyClaimable && hoursSince > 8) {
      addNotification(
        'LOGIN_REWARD',
        'Hadiah harian menunggu! 🎁',
        'Klaim hadiah login harianmu dan dapatkan coin gratis!'
      )
      localStorage.setItem(NOTIF_LAST_REMINDER, String(now))

      // Also send browser notification
      sendBrowserNotif(
        'BrainPlay 🎮 — Hadiah Harian!',
        'Jangan lupa klaim hadiah login harianmu hari ini! 🎁'
      )
    }

    // Streak risk alert (if streak > 0 and haven't played today)
    if (streak > 2 && isDailyClaimable && hoursSince > 8) {
      addNotification(
        'STREAK_RISK',
        `Streak ${streak} hari akan hilang! ⚠️`,
        'Main hari ini supaya streakmu tidak reset ke 0!'
      )
      sendBrowserNotif(
        'BrainPlay 🔥 Streak Alert!',
        `Streak ${streak} harimu akan hilang! Main sekarang!`
      )
    }

    // Streak milestone celebrations
    const milestones = [3, 7, 14, 21, 30]
    if (milestones.includes(streak)) {
      const existing = notifications.find(n =>
        n.type === 'STREAK_ALERT' && n.message.includes(`${streak} hari`)
        && (now - n.time) < 86400000
      )
      if (!existing) {
        addNotification(
          'STREAK_ALERT',
          `🔥 Streak ${streak} hari!`,
          streak >= 7
            ? `Luar biasa! ${streak} hari berturut-turut bermain BrainPlay!`
            : `Keren! Kamu sudah main ${streak} hari berturut-turut!`
        )
      }
    }

    // Daily challenge reminder at 8pm
    const hour = new Date().getHours()
    if (hour >= 20 && hoursSince > 8) {
      const todayChallengeNotif = notifications.find(n =>
        n.type === 'DAILY_CHALLENGE' && (now - n.time) < 86400000
      )
      if (!todayChallengeNotif) {
        addNotification(
          'DAILY_CHALLENGE',
          'Daily Challenge menunggu! 🗓️',
          'Selesaikan daily challenge hari ini sebelum reset!'
        )
      }
    }
  }, [notifEnabled, isDailyClaimable, streak])

  // ─── Schedule browser notification for tomorrow ────────────────────────
  useEffect(() => {
    if (!notifEnabled || !('Notification' in window) || Notification.permission !== 'granted') return

    // Calculate ms until tomorrow at 9am
    const now = new Date()
    const tomorrow9am = new Date(now)
    tomorrow9am.setDate(tomorrow9am.getDate() + 1)
    tomorrow9am.setHours(9, 0, 0, 0)
    const ms = tomorrow9am.getTime() - now.getTime()

    // Only schedule if <24 hours away
    if (ms > 0 && ms < 86400000) {
      const timer = setTimeout(() => {
        sendBrowserNotif(
          'BrainPlay 🎮 — Selamat Pagi!',
          'Daily challenge baru sudah tersedia! Ayo main! 🗓️'
        )
      }, ms)
      return () => clearTimeout(timer)
    }
  }, [notifEnabled])

  return {
    notifications,
    unreadCount,
    showPanel,
    setShowPanel,
    addNotification,
    markAllRead,
    clearAll,
  }
}

// ─── Notification Bell + Panel UI Component ───────────────────────────────
export function NotificationBell({ notifications, unreadCount, showPanel, setShowPanel, markAllRead, clearAll, dark }) {
  const panelRef = useRef(null)

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return
    const fn = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false)
    }
    document.addEventListener('mousedown', fn)
    document.addEventListener('touchstart', fn)
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('touchstart', fn) }
  }, [showPanel])

  const tc = useThemeColors()
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const surface = tc.surface
  const borderCol = tc.borderCol

  const formatTime = (ts) => {
    const diff = Date.now() - ts
    if (diff < 60000) return 'Baru saja'
    if (diff < 3600000) return `${Math.floor(diff/60000)} menit lalu`
    if (diff < 86400000) return `${Math.floor(diff/3600000)} jam lalu`
    return `${Math.floor(diff/86400000)} hari lalu`
  }

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => {
          setShowPanel(!showPanel)
          if (!showPanel && unreadCount > 0) markAllRead()
        }}
        style={{
          width: 40, height: 40, borderRadius: 12,
          border: `2px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}
        className="nav-btn"
        title="Notifikasi"
      >
        🔔
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: '#FF6B6B', color: '#fff',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Fredoka One',cursive",
            boxShadow: '0 2px 8px rgba(255,107,107,0.4)',
            animation: 'notifBadgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            border: `2px solid ${tc.bg}`,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Panel dropdown */}
      {showPanel && (
        <>
          <style>{`
            @keyframes notifSlideDown { from{opacity:0;transform:translateY(-8px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes notifBadgePop { from{transform:scale(0)} to{transform:scale(1)} }
            @keyframes notifItemIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
          `}</style>
          <div style={{
            position: 'absolute', top: 50, right: 0, zIndex: 500,
            width: 340, maxWidth: '90vw', maxHeight: 420,
            background: surface,
            border: `2px solid ${borderCol}`,
            borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            animation: 'notifSlideDown 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 18px 12px', borderBottom: `1.5px solid ${borderCol}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, color: textMain, display: 'flex', alignItems: 'center', gap: 8 }}>
                🔔 Notifikasi
              </div>
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{
                  background: 'transparent', border: 'none', color: tc.textMuted,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 8,
                  fontFamily: "'Nunito',sans-serif",
                }}>
                  Hapus Semua
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: tc.textMuted }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔕</div>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 14 }}>Belum ada notifikasi</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Notifikasi akan muncul di sini</div>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <div key={notif.id} style={{
                    display: 'flex', gap: 12, padding: '12px 10px',
                    borderRadius: 14, marginBottom: 4,
                    background: !notif.read ? (dark ? 'rgba(162,155,254,0.06)' : 'rgba(162,155,254,0.04)') : 'transparent',
                    animation: `notifItemIn 0.2s ${i * 0.03}s ease both`,
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: `${notif.color}18`, border: `1.5px solid ${notif.color}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {notif.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 13, color: textMain, lineHeight: 1.3 }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: 12, color: tc.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: 10, color: tc.textMuted, marginTop: 4, opacity: 0.7 }}>
                        {formatTime(notif.time)}
                      </div>
                    </div>
                    {!notif.read && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#A29BFE', flexShrink: 0, marginTop: 6,
                        boxShadow: '0 0 6px #A29BFE88',
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
