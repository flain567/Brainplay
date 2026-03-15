import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'

const NotifContext = createContext(null)

let globalId = 0

export function NotifProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = ++globalId
    const item = {
      id,
      type: toast.type || 'info', // info, success, error, warning, reward, levelup
      message: toast.message || '',
      emoji: toast.emoji || '',
      duration: toast.duration || 3000,
      amount: toast.amount, // for coin/xp rewards
    }
    setToasts(prev => [...prev, item])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, item.duration)
    return id
  }, [])

  const success = useCallback((msg, emoji = '✅') =>
    addToast({ type: 'success', message: msg, emoji }), [addToast])

  const error = useCallback((msg, emoji = '❌') =>
    addToast({ type: 'error', message: msg, emoji }), [addToast])

  const reward = useCallback((amount, msg, emoji = '🪙') =>
    addToast({ type: 'reward', message: msg, emoji, amount }), [addToast])

  const levelUp = useCallback((level, title) =>
    addToast({ type: 'levelup', message: title, emoji: '🎉', amount: level, duration: 4000 }), [addToast])

  const info = useCallback((msg, emoji = 'ℹ️') =>
    addToast({ type: 'info', message: msg, emoji }), [addToast])

  return (
    <NotifContext.Provider value={{ toasts, addToast, success, error, reward, levelUp, info }}>
      {children}
      <ToastContainer toasts={toasts} />
    </NotifContext.Provider>
  )
}

export function useNotif() {
  return useContext(NotifContext)
}

// ─── Toast Container ────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  const { darkMode } = useSettings()
  const dark = darkMode

  return (
    <div style={{
      position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)',
      zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none', width: '90%', maxWidth: 380,
    }}>
      {toasts.map((t, i) => (
        <Toast key={t.id} toast={t} dark={dark} index={i} />
      ))}
    </div>
  )
}

// ─── Individual Toast ───────────────────────────────────────────────────────
function Toast({ toast, dark, index }) {
  const COLORS = {
    info:    { bg: dark ? 'rgba(162,155,254,0.95)' : '#A29BFE', accent: '#A29BFE' },
    success: { bg: dark ? 'rgba(78,205,196,0.95)' : '#4ECDC4', accent: '#4ECDC4' },
    error:   { bg: dark ? 'rgba(255,107,107,0.95)' : '#FF6B6B', accent: '#FF6B6B' },
    warning: { bg: dark ? 'rgba(253,203,110,0.95)' : '#FDCB6E', accent: '#FDCB6E' },
    reward:  { bg: dark ? 'rgba(249,168,37,0.95)' : '#F9A825', accent: '#F9A825' },
    levelup: { bg: dark ? 'linear-gradient(135deg,rgba(162,155,254,0.95),rgba(253,121,168,0.95))' : 'linear-gradient(135deg,#A29BFE,#FD79A8)', accent: '#A29BFE' },
  }

  const c = COLORS[toast.type] || COLORS.info
  const isGradient = c.bg.includes('gradient')

  return (
    <>
      <style>{`
        @keyframes toastSlideIn { 
          from { opacity:0; transform:translateY(-16px) scale(0.92); } 
          to { opacity:1; transform:translateY(0) scale(1); } 
        }
        @keyframes toastShine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
      <div style={{
        background: c.bg,
        color: '#fff',
        borderRadius: 16,
        padding: toast.type === 'levelup' ? '14px 20px' : '10px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: `0 8px 28px ${c.accent}44, 0 2px 8px rgba(0,0,0,0.15)`,
        animation: `toastSlideIn 0.3s ${index * 0.05}s cubic-bezier(0.34,1.56,0.64,1) both`,
        pointerEvents: 'auto',
        position: 'relative', overflow: 'hidden',
        fontFamily: "'Nunito',sans-serif",
      }}>
        {/* Shine effect */}
        <div style={{
          position: 'absolute', top: 0, width: '30%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          transform: 'skewX(-20deg)',
          animation: 'toastShine 1s 0.3s ease forwards',
          pointerEvents: 'none',
          left: '-100%',
        }} />

        <span style={{ fontSize: toast.type === 'levelup' ? 28 : 20, flexShrink: 0 }}>{toast.emoji}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.type === 'levelup' ? (
            <>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16, letterSpacing: 0.5 }}>
                Level Up! Lv.{toast.amount}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{toast.message}</div>
            </>
          ) : toast.type === 'reward' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 16 }}>+{toast.amount}</span>
              {toast.message && <span style={{ fontSize: 13, opacity: 0.9 }}>• {toast.message}</span>}
            </div>
          ) : (
            <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: 14, letterSpacing: 0.3 }}>
              {toast.message}
            </span>
          )}
        </div>
      </div>
    </>
  )
}
