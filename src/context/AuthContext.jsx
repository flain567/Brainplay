import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from '../firebase.js'
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext(null)

const DISPLAY_NAME_KEY = 'bp_display_name'
const GUEST_KEY = 'bp_guest_mode'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem(GUEST_KEY) === 'true')

  // Display name (can override Google name)
  const [displayName, setDisplayNameState] = useState(() =>
    localStorage.getItem(DISPLAY_NAME_KEY) || ''
  )

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (firebaseUser) {
        // Sync display name from Google if no custom name set
        const saved = localStorage.getItem(DISPLAY_NAME_KEY)
        if (!saved && firebaseUser.displayName) {
          const name = firebaseUser.displayName.split(' ')[0].slice(0, 20)
          setDisplayNameState(name)
          localStorage.setItem(DISPLAY_NAME_KEY, name)
        }
        // Also sync to old nickname key for backward compat with leaderboard
        const nameToUse = saved || firebaseUser.displayName?.split(' ')[0]?.slice(0, 20) || 'Pemain'
        localStorage.setItem('bp_nickname', nameToUse)
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

  const loginWithGoogle = useCallback(async () => {
    setError(null)
    try {
      // Try popup first (works on desktop)
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      // If popup blocked (common on mobile), fallback to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider)
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
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setUser(null)
      setDisplayNameState('')
      localStorage.removeItem(DISPLAY_NAME_KEY)
      localStorage.removeItem('bp_nickname')
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
    setIsGuest(true)
    localStorage.setItem(GUEST_KEY, 'true')
    setDisplayNameState(name)
    localStorage.setItem(DISPLAY_NAME_KEY, name)
    localStorage.setItem('bp_nickname', name)
  }, [])

  // Computed values
  const isLoggedIn = !!user
  const playerName = displayName || user?.displayName?.split(' ')[0] || 'Pemain'
  const photoURL = user?.photoURL || null
  const email = user?.email || null
  const uid = user?.uid || null

  return (
    <AuthContext.Provider value={{
      user, uid, isLoggedIn, isGuest, loading, error,
      playerName, photoURL, email, displayName,
      loginWithGoogle, logout, setDisplayName, continueAsGuest,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
