import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { auth, getDb } from '../firebase.js'

const SocialContext = createContext(null)

// Lazy-loaded Firestore helpers
let _firestoreMod = null
async function getFirestoreHelpers() {
  if (!_firestoreMod) {
    _firestoreMod = await import('firebase/firestore')
  }
  return _firestoreMod
}

export function SocialProvider({ children }) {
  const [activities, setActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const unsubRef = useRef(null)

  // ─── Profile Interaction ───────────────────────────────────────────────────

  const getProfile = useCallback(async (uid) => {
    if (!uid) return null
    try {
      const db = await getDb()
      const { doc, getDoc } = await getFirestoreHelpers()
      
      const docRef = doc(db, 'users', uid)
      const snap = await getDoc(docRef)
      
      if (snap.exists()) {
        return { uid, ...snap.data() }
      }
      return null
    } catch (err) {
      console.error('[Social] ❌ getProfile failed:', err.message)
      return null
    }
  }, [])

  // Push an activity to the cloud
  const logActivity = useCallback(async ({ type, userName, details, icon }) => {
    const user = auth.currentUser
    if (!user && !localStorage.getItem('bp_is_guest')) return // Don't log if completely anonymous

    try {
      const db = await getDb()
      const { collection, addDoc, serverTimestamp } = await getFirestoreHelpers()
      
      await addDoc(collection(db, 'activity'), {
        type,   // 'level_up', 'high_score', 'achievement', 'chest_open'
        userId: user ? user.uid : 'guest',
        userName: userName || 'Pemain',
        details: details || '',
        icon: icon || '⭐',
        timestamp: serverTimestamp()
      })
    } catch (err) {
      console.error('[Social] ❌ logActivity failed:', err.message)
    }
  }, [])

  // ─── Activity Feed ─────────────────────────────────────────────────────────

  // Real-time listener for global activities
  useEffect(() => {
    let mounted = true
    const startListener = async () => {
      try {
        const db = await getDb()
        const { collection, query, orderBy, limit, onSnapshot } = await getFirestoreHelpers()
        
        const q = query(
          collection(db, 'activity'),
          orderBy('timestamp', 'desc'),
          limit(30)
        )

        unsubRef.current = onSnapshot(q, (snap) => {
          if (!mounted) return
          const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          setActivities(docs)
        }, (err) => {
          // Handle initial empty collection or permission errors (silently)
          if (err.code === 'permission-denied') {
            console.warn('[Social] ❌ Permission denied on activity feed.')
          }
        })
      } catch (err) {
        console.error('[Social] Error starting listener:', err)
      }
    }

    startListener()
    return () => {
      mounted = false
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  // Listen for global log-activity events
  useEffect(() => {
    const handler = (e) => {
      const { type, userName, details, icon } = e.detail || {}
      if (type) {
        logActivity({ type, userName, details, icon })
      }
    }
    window.addEventListener('bp-log-activity', handler)
    return () => window.removeEventListener('bp-log-activity', handler)
  }, [logActivity])

  return (
    <SocialContext.Provider value={{
      activities,
      logActivity,
      getProfile,
      loadingActivities
    }}>
      {children}
    </SocialContext.Provider>
  )
}

export function useSocial() { return useContext(SocialContext) }
