import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from '../firebase.js'
import { 
  signInWithPopup, 
  signInWithRedirect, 
  linkWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  linkWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'
import { clearGameData } from '../utils/storage.js'

const AuthContext = createContext(null)

const DISPLAY_NAME_KEY = 'bp_display_name'
const GUEST_KEY = 'bp_guest_id'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const saved = localStorage.getItem(DISPLAY_NAME_KEY)
        if (saved) localStorage.setItem('bp_nickname', saved)
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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    try {
      if (auth.currentUser?.isAnonymous) {
        try {
          // Attempt to link current guest progress to Google
          // On mobile, linking with popup is often blocked, but redirect is safer
          if (isMobile) {
            await linkWithRedirect(auth.currentUser, googleProvider)
            return true
          }
          await linkWithPopup(auth.currentUser, googleProvider)
        } catch (linkErr) {
          if (linkErr.code === 'auth/credential-already-in-use') {
            console.log('[Auth] Google account already exists, switching account...')
            await signOut(auth)
            if (isMobile) {
              await signInWithRedirect(auth, googleProvider)
            } else {
              await signInWithPopup(auth, googleProvider)
            }
          } else if (linkErr.code === 'auth/popup-blocked') {
            // Fallback to redirect if popup is blocked
            await linkWithRedirect(auth.currentUser, googleProvider)
          } else {
            throw linkErr
          }
        }
      } else {
        if (isMobile) {
          await signInWithRedirect(auth, googleProvider)
        } else {
          try {
            await signInWithPopup(auth, googleProvider)
          } catch (err) {
            if (err.code === 'auth/popup-blocked') {
              await signInWithRedirect(auth, googleProvider)
            } else {
              throw err
            }
          }
        }
      }
      return true
    } catch (err) {
      console.error('[Auth] Login error:', err)
      if (err.code === 'auth/credential-already-in-use') {
        setError('Akun Google ini sudah terhubung dengan ID pemain lain.')
      } else if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        setError('Popup terblokir. Gunakan browser standar atau izinkan popup.')
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore duplicate popup requests
      } else {
        setError(err.message || 'Login gagal')
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

  const continueAsGuest = useCallback(async (guestName = 'Pemain') => {
    setError(null)
    try {
      // Clear local data if switching from a previous real session
      if (user && !user.isAnonymous) clearGameData()
      
      const result = await signInAnonymously(auth)
      const name = (guestName).trim().slice(0, 20)
      
      setDisplayName(name)
      
      // Notify components to reload
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('bp-cloud-sync')) } catch(e) {}
      }, 100)
      
      return result.user
    } catch (err) {
      setError('Gagal masuk sebagai guest. Periksa koneksi internet.')
      console.error('[Auth] Anon login failed:', err)
      return null
    }
  }, [user, setDisplayName])

  // Computed values
  const isLoggedIn = !!user && !user.isAnonymous
  const isGuest = !!user && user.isAnonymous
  const needsName = !!user && !displayName
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
