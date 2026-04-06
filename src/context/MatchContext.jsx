import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { auth, getDb } from '../firebase.js'

const MatchContext = createContext(null)

let _firestoreMod = null
async function getFirestoreHelpers() {
  if (!_firestoreMod) {
    _firestoreMod = await import('firebase/firestore')
  }
  return _firestoreMod
}

export function MatchProvider({ children }) {
  const [activeMatch, setActiveMatch] = useState(null)
  const [incomingInvites, setIncomingInvites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const unsubInvitesRef = useRef(null)
  const unsubMatchRef = useRef(null)

  // Listen for incoming match invitations
  useEffect(() => {
    const user = auth.currentUser
    if (!user) {
      setIncomingInvites([])
      return
    }

    let mounted = true
    const startInviteListener = async () => {
      try {
        const db = await getDb()
        const { collection, query, where, onSnapshot } = await getFirestoreHelpers()
        
        const q = query(
          collection(db, 'matches'), 
          where('guestUid', '==', user.uid), 
          where('status', '==', 'pending')
        )
        
        unsubInvitesRef.current = onSnapshot(q, (snap) => {
          if (!mounted) return
          const invites = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          setIncomingInvites(invites)
        })
      } catch (err) {
        console.error('[Match] Invite listener error:', err)
      }
    }
    startInviteListener()

    return () => {
      mounted = false
      if (unsubInvitesRef.current) unsubInvitesRef.current()
    }
  }, [auth.currentUser])

  // Listen for state changes in the active match
  useEffect(() => {
    if (!activeMatch?.id) {
      if (unsubMatchRef.current) unsubMatchRef.current()
      return
    }

    let mounted = true
    const startMatchListener = async () => {
      try {
        const db = await getDb()
        const { doc, onSnapshot } = await getFirestoreHelpers()
        
        unsubMatchRef.current = onSnapshot(doc(db, 'matches', activeMatch.id), (snap) => {
          if (!mounted) return
          if (!snap.exists()) {
            setActiveMatch(null)
            return
          }
          const data = { id: snap.id, ...snap.data() }
          setActiveMatch(data)
          
          // If match status changed to active and we're just waiting, trigger redirect logic in UI
          // If match status changed to finished, the UI can handle showing the result
        })
      } catch (err) {
        console.error('[Match] Match listener error:', err)
      }
    }
    startMatchListener()

    return () => {
      mounted = false
      if (unsubMatchRef.current) unsubMatchRef.current()
    }
  }, [activeMatch?.id])

  // Actions
  const createMatch = useCallback(async (targetUid, gameId, hostProfile) => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) return { success: false, error: 'Login required' }

    try {
      const db = await getDb()
      const { collection, addDoc, serverTimestamp } = await getFirestoreHelpers()
      
      const matchData = {
        hostUid: user.uid,
        guestUid: targetUid,
        hostProfile: hostProfile || { displayName: user.displayName || 'Pemain', photoURL: user.photoURL },
        gameId,
        status: 'pending',
        createdAt: serverTimestamp(),
        turn: user.uid,
        state: {},
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, 'matches'), matchData)
      const newMatch = { id: docRef.id, ...matchData }
      setActiveMatch(newMatch)
      setLoading(false)
      return { success: true, matchId: docRef.id }
    } catch (err) {
      console.error('[Match] Create error:', err)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }, [])

  const acceptMatch = useCallback(async (matchId) => {
    setLoading(true)
    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()
      
      const matchRef = doc(db, 'matches', matchId)
      await updateDoc(matchRef, {
        status: 'active',
        updatedAt: serverTimestamp()
      })
      
      // Local state will be updated by onSnapshot
      setLoading(false)
      return { success: true }
    } catch (err) {
      console.error('[Match] Accept error:', err)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }, [])

  const updateMatchState = useCallback(async (matchId, newState, nextTurn) => {
    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()
      
      const matchRef = doc(db, 'matches', matchId)
      const updateData = {
        state: newState,
        updatedAt: serverTimestamp()
      }
      if (nextTurn) updateData.turn = nextTurn
      
      await updateDoc(matchRef, updateData)
      return { success: true }
    } catch (err) {
      console.error('[Match] Update state error:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const finishMatch = useCallback(async (matchId, winnerUid) => {
    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()
      
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'finished',
        winner: winnerUid || 'draw',
        updatedAt: serverTimestamp()
      })
      return { success: true }
    } catch (err) {
      console.error('[Match] Finish error:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const quitMatch = useCallback(async (matchId) => {
    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()
      
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      })
      setActiveMatch(null)
      return { success: true }
    } catch (err) {
      console.error('[Match] Quit error:', err)
      return { success: false }
    }
  }, [])

  return (
    <MatchContext.Provider value={{
      activeMatch, setActiveMatch, incomingInvites, loading, error,
      createMatch, acceptMatch, updateMatchState, finishMatch, quitMatch
    }}>
      {children}
    </MatchContext.Provider>
  )
}

export function useMatch() { return useContext(MatchContext) }
