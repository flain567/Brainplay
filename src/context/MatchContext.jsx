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

// Games yang support PvP
export const PVP_GAMES = [
  { id: 'math-challenge', name: 'Math Challenge', emoji: '🧮', desc: 'Siapa paling cepat hitung!' },
  { id: 'reaction-test', name: 'Reaction Test', emoji: '⚡', desc: 'Tes kecepatan reaksi!' },
  { id: 'quiz-trivia', name: 'Quiz Trivia', emoji: '🇮🇩', desc: 'Adu pengetahuan Indonesia!' },
  { id: 'memory-card', name: 'Memory Card', emoji: '🃏', desc: 'Siapa paling sedikit gerakan!' },
  { id: 'memory-pattern', name: 'Memory Pattern', emoji: '🧠', desc: 'Siapa ingatan terkuat!' },
]

export function MatchProvider({ children }) {
  const [activeMatch, setActiveMatch] = useState(null)
  const [incomingInvites, setIncomingInvites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const unsubInvitesRef = useRef(null)
  const unsubMatchRef = useRef(null)

  // ── Listen incoming match invitations ──
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
          const invites = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          setIncomingInvites(invites)
        }, (err) => {
          console.error('[Match] Invite listener error:', err)
        })
      } catch (err) {
        console.error('[Match] Invite listener init error:', err)
      }
    }
    startInviteListener()

    return () => {
      mounted = false
      if (unsubInvitesRef.current) unsubInvitesRef.current()
    }
  }, [auth.currentUser])

  // ── Listen active match state changes ──
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
          setActiveMatch({ id: snap.id, ...snap.data() })
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

  // ── Create a match (challenge a friend) ──
  const createMatch = useCallback(async (targetUid, gameId, hostProfile, guestProfile) => {
    setLoading(true)
    setError(null)
    const user = auth.currentUser
    if (!user) { setLoading(false); return { success: false, error: 'Login required' } }

    try {
      const db = await getDb()
      const { collection, addDoc, serverTimestamp } = await getFirestoreHelpers()

      // Generate shared seed untuk game yang butuh data sama (quiz questions, card layout)
      const seed = Date.now() + Math.floor(Math.random() * 100000)

      const matchData = {
        hostUid: user.uid,
        guestUid: targetUid,
        hostProfile: hostProfile || { displayName: user.displayName || 'Pemain', photoURL: user.photoURL || '' },
        guestProfile: guestProfile || { displayName: 'Pemain', photoURL: '' },
        gameId,
        seed,
        status: 'pending',
        state: {},
        winner: '',
        createdAt: serverTimestamp(),
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

  // ── Accept a match invitation ──
  const acceptMatch = useCallback(async (matchId) => {
    setLoading(true)
    const user = auth.currentUser
    if (!user) { setLoading(false); return { success: false } }

    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()

      await updateDoc(doc(db, 'matches', matchId), {
        status: 'active',
        guestProfile: {
          displayName: user.displayName || 'Pemain',
          photoURL: user.photoURL || ''
        },
        updatedAt: serverTimestamp()
      })

      setLoading(false)
      return { success: true }
    } catch (err) {
      console.error('[Match] Accept error:', err)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }, [])

  // ── Decline a match invitation ──
  const declineMatch = useCallback(async (matchId) => {
    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()

      await updateDoc(doc(db, 'matches', matchId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      })
      return { success: true }
    } catch (err) {
      console.error('[Match] Decline error:', err)
      return { success: false }
    }
  }, [])

  // ── Update match game state (score sync) ──
  const updateMatchState = useCallback(async (matchId, newState) => {
    try {
      const db = await getDb()
      const { doc, updateDoc, serverTimestamp } = await getFirestoreHelpers()

      await updateDoc(doc(db, 'matches', matchId), {
        state: newState,
        updatedAt: serverTimestamp()
      })
      return { success: true }
    } catch (err) {
      console.error('[Match] Update state error:', err)
      return { success: false }
    }
  }, [])

  // ── Finish match with winner ──
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
      return { success: false }
    }
  }, [])

  // ── Quit / cancel match ──
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

  // ── Request rematch — creates a new match with same players ──
  const requestRematch = useCallback(async (currentMatch) => {
    if (!currentMatch) return { success: false, error: 'No match' }
    const user = auth.currentUser
    if (!user) return { success: false, error: 'Login required' }

    setLoading(true)
    try {
      const db = await getDb()
      const { collection, addDoc, serverTimestamp, doc, updateDoc } = await getFirestoreHelpers()

      // Mark the old match with rematch request
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        rematchRequestedBy: user.uid,
        updatedAt: serverTimestamp()
      })

      // Create a new match — swap host/guest for fairness
      const isHost = currentMatch.hostUid === user.uid
      const newMatchData = {
        hostUid: user.uid,
        guestUid: isHost ? currentMatch.guestUid : currentMatch.hostUid,
        hostProfile: isHost ? currentMatch.hostProfile : currentMatch.guestProfile,
        guestProfile: isHost ? currentMatch.guestProfile : currentMatch.hostProfile,
        gameId: currentMatch.gameId,
        seed: Date.now() + Math.floor(Math.random() * 100000),
        status: 'pending',
        state: {},
        winner: '',
        rematchFrom: currentMatch.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'matches'), newMatchData)
      setActiveMatch({ id: docRef.id, ...newMatchData })
      setLoading(false)
      return { success: true, matchId: docRef.id }
    } catch (err) {
      console.error('[Match] Rematch error:', err)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }, [])

  return (
    <MatchContext.Provider value={{
      activeMatch, setActiveMatch, incomingInvites, loading, error,
      createMatch, acceptMatch, declineMatch, updateMatchState, finishMatch, quitMatch, requestRematch
    }}>
      {children}
    </MatchContext.Provider>
  )
}

export function useMatch() { return useContext(MatchContext) }
