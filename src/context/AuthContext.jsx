import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from '../firebase.js'
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth'
import { clearGameData } from '../utils/storage.js'

const AuthContext = createContext(null)

const DISPLAY_NAME_KEY = 'bp_display_name'
const GUEST_KEY = 'bp_guest_mode'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(GUEST_KEY) === 'true')

  // Display name — always manually set by user, never auto-filled from Google
  const [displayName, setDisplayNameState] = useState(() =>
    localStorage.getItem(DISPLAY_NAME_KEY) || ''
  )

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (firebaseUser) {
        // Sync nickname key if custom name already exists
        const saved = localStorage.getItem(DISPLAY_NAME_KEY)
        if (saved) {
          localStorage.setItem('bp_nickname', saved)
        }
        // Clear guest mode on successful login
        setIsGuest(false)
        localStorage.removeItem(GUEST_KEY)
      }
    })
    return () => unsub()
  }, [])

  // Check for redirect result on mount (for mobile redirect flow)
  useEffect(() => {
    getRedirectResult(auth).catch(() => {})
  }, [])

  // Reload displayName when cloud sync restores it
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem(DISPLAY_NAME_KEY)
      if (saved && saved !== displayName) {
        setDisplayNameState(saved)
      }
    }
    window.addEventListener('bp-cloud-sync', handler)
    return () => window.removeEventListener('bp-cloud-sync', handler)
  }, [displayName])

  const loginWithGoogle = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
      return true
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider)
          return true
        } catch (redirectErr) {
          setError('Login gagal. Coba lagi nanti.')
          console.error('[Auth] Redirect failed:', redirectErr)
        }
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User cancelled, ignore
      } else {
        setError(err.message || 'Login gagal')
        console.error('[Auth] Login error:', err)
      }
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      // Cloud save will auto-save on the periodic timer, but force one last save
      try { window.dispatchEvent(new CustomEvent('bp-force-save')) } catch(e) {}
      // Small delay to let save complete
      await new Promise(r => setTimeout(r, 500))
      await signOut(auth)
      setUser(null)
      setDisplayNameState('')
      // Clear ALL game data so next user starts fresh
      clearGameData()
      localStorage.removeItem(DISPLAY_NAME_KEY)
      localStorage.removeItem('bp_nickname')
      localStorage.removeItem(GUEST_KEY)
      // Force reload to reset all React state
      window.location.reload()
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    }
  }, [])

  const setDisplayName = useCallback((name) => {
    const clean = name.trim().slice(0, 20)
    setDisplayNameState(clean)
    localStorage.setItem(DISPLAY_NAME_KEY, clean)
    localStorage.setItem('bp_nickname', clean)
  }, [])

  const continueAsGuest = useCallback((guestName) => {
    const name = (guestName || 'Pemain').trim().slice(0, 20)
    // Clear any leftover data from previous user
    clearGameData()
    setIsGuest(true)
    localStorage.setItem(GUEST_KEY, 'true')
    setDisplayNameState(name)
    localStorage.setItem(DISPLAY_NAME_KEY, name)
    localStorage.setItem('bp_nickname', name)
    // Reset tracked uid
    localStorage.removeItem('bp_last_synced_uid')
    // Notify contexts to reload from (now empty) localStorage
    setTimeout(() => {
      try { window.dispatchEvent(new CustomEvent('bp-cloud-sync')) } catch(e) {}
    }, 100)
  }, [])

  // Computed values
  const isLoggedIn = !!user
  const needsName = (isLoggedIn || isGuest) && !displayName
  const playerName = displayName || 'Pemain'
  const photoURL = user?.photoURL || null
  const email = user?.email || null
  const uid = user?.uid || null

  return (
    <AuthContext.Provider value={{
      user, uid, isLoggedIn, isGuest, loading, error,
      playerName, photoURL, email, displayName, needsName,
      loginWithGoogle, logout, setDisplayName, continueAsGuest,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
