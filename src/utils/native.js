// ─── BrainPlay Capacitor Native Bridge ───────────────────────────────────────
// Handles: back button, status bar, safe area, keyboard, app lifecycle
// All calls are safe on web (no-op if Capacitor not available)

import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

// ─── Status Bar ──────────────────────────────────────────────────────────────
export async function setupStatusBar(darkMode = true) {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: darkMode ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: '#0d0b1e' })
    // Make status bar overlay (for immersive canvas games)
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch (e) {
    console.warn('[Native] StatusBar setup failed:', e.message)
  }
}

export async function hideStatusBar() {
  if (!isNative) return
  try {
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.hide()
  } catch {}
}

export async function showStatusBar() {
  if (!isNative) return
  try {
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.show()
  } catch {}
}

// ─── Back Button Handler ─────────────────────────────────────────────────────
// Returns cleanup function
let backHandlerRegistered = false

export function setupBackButton(onBack) {
  if (!isNative || backHandlerRegistered) return () => {}
  
  let handler = null
  
  import('@capacitor/app').then(({ App }) => {
    handler = App.addListener('backButton', ({ canGoBack }) => {
      // Let the React app decide what "back" means
      if (onBack) {
        onBack()
      } else if (canGoBack) {
        window.history.back()
      } else {
        // At root — minimize app (don't exit)
        App.minimizeApp()
      }
    })
    backHandlerRegistered = true
  }).catch(() => {})

  return () => {
    if (handler) {
      handler.remove()
      backHandlerRegistered = false
    }
  }
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────
export function setupAppLifecycle(onPause, onResume) {
  if (!isNative) return () => {}

  let pauseHandler = null
  let resumeHandler = null

  import('@capacitor/app').then(({ App }) => {
    pauseHandler = App.addListener('pause', () => {
      if (onPause) onPause()
    })
    resumeHandler = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && onResume) onResume()
    })
  }).catch(() => {})

  return () => {
    if (pauseHandler) pauseHandler.remove()
    if (resumeHandler) resumeHandler.remove()
  }
}

// ─── Keyboard ────────────────────────────────────────────────────────────────
export function setupKeyboard() {
  if (!isNative) return () => {}

  let showHandler = null
  let hideHandler = null

  import('@capacitor/keyboard').then(({ Keyboard }) => {
    showHandler = Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
    })
    hideHandler = Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px')
    })
  }).catch(() => {})

  return () => {
    if (showHandler) showHandler.remove()
    if (hideHandler) hideHandler.remove()
  }
}

// ─── Safe Area CSS Variables ─────────────────────────────────────────────────
// Sets CSS vars: --safe-top, --safe-bottom, --safe-left, --safe-right
export function setupSafeArea() {
  if (!isNative) return
  // Capacitor uses env() for safe area — we set fallbacks
  const style = document.documentElement.style
  style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)')
  style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)')
  style.setProperty('--safe-left', 'env(safe-area-inset-left, 0px)')
  style.setProperty('--safe-right', 'env(safe-area-inset-right, 0px)')
}

// ─── Init all native features ────────────────────────────────────────────────
export function initNative() {
  if (!isNative) return
  setupSafeArea()
  setupStatusBar(true)
  setupKeyboard()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export { isNative }
