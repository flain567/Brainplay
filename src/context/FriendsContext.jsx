import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { auth, getDb } from '../firebase.js'
import { getJSON, setJSON } from '../utils/storage.js'

const FriendsContext = createContext(null)

let _firestoreMod = null
async function getFirestoreHelpers() {
  if (!_firestoreMod) {
    _firestoreMod = await import('firebase/firestore')
  }
  return _firestoreMod
}

export function FriendsProvider({ children }) {
  const [friends, setFriends] = useState(() => getJSON('bp_friends') || [])
  const [friendCode, setFriendCode] = useState(() => localStorage.getItem('bp_friend_code') || '')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const unsubRef = useRef(null)
  const unsubReqRef = useRef(null)

  // ---------- Generate / retrieve friend code ----------
  useEffect(() => {
    let mounted = true
    const initCode = async () => {
      const user = auth.currentUser
      if (!user) return

      try {
        const db = await getDb()
        const { doc, getDoc, setDoc, query, collection, where, getDocs } = await getFirestoreHelpers()

        const codeRef = doc(db, 'userCodes', user.uid)
        const snap = await getDoc(codeRef)

        let code = snap.exists() ? snap.data().code : ''

        if (!code) {
          while (true) {
            code = Math.random().toString(36).substring(2, 8).toUpperCase()
            const codeCheck = query(collection(db, 'userCodes'), where('code', '==', code))
            const existSnap = await getDocs(codeCheck)
            if (existSnap.empty) break
          }
          await setDoc(codeRef, {
            code,
            uid: user.uid,
            displayName: user.displayName || 'Pemain',
            photoURL: user.photoURL || '',
          })
        } else if (!snap.data().displayName) {
          await setDoc(codeRef, {
            displayName: user.displayName || 'Pemain',
            photoURL: user.photoURL || '',
          }, { merge: true })
        }

        if (mounted) {
          setFriendCode(code)
          localStorage.setItem('bp_friend_code', code)
        }
      } catch (err) {
        console.error('[Friends] Generate code error:', err)
      }
    }

    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) initCode()
      else {
        setFriendCode('')
        setFriends([])
        setRequests([])
      }
    })

    return () => { mounted = false; unsubAuth() }
  }, [])

  // ---------- Friends list real-time listener ----------
  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    let mounted = true
    const startListener = async () => {
      try {
        const db = await getDb()
        const { collection, onSnapshot } = await getFirestoreHelpers()

        const friendsRef = collection(db, 'users', user.uid, 'friends')

        unsubRef.current = onSnapshot(friendsRef, (snap) => {
          if (!mounted) return
          const friendData = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
          setFriends(friendData)
          setJSON('bp_friends', friendData)
        })
      } catch (err) {
        console.error('[Friends] Listener error:', err)
      }
    }
    startListener()

    return () => {
      mounted = false
      if (unsubRef.current) unsubRef.current()
    }
  }, [auth.currentUser])

  // ---------- Incoming friend-request listener ----------
  // ⚠️ PENTING: Query ini membutuhkan Composite Index di Firebase Console!
  //    Collection: friendRequests
  //    Fields: targetUid Ascending, status Ascending
  //    Buka link error di browser console untuk auto-create index
  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    let mounted = true
    const startReqListener = async () => {
      try {
        const db = await getDb()
        const { collection, query, where, onSnapshot } = await getFirestoreHelpers()

        const q = query(
          collection(db, 'friendRequests'),
          where('targetUid', '==', user.uid),
          where('status', '==', 'pending')
        )

        unsubReqRef.current = onSnapshot(q, (snap) => {
          if (!mounted) return
          const reqData = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          setRequests(reqData)
          setError(null)
        }, (err) => {
          console.error('[Friends] ❌ Request Listener Error:', err.code, err.message)
          if (err.code === 'failed-precondition') {
            setError('Butuh Composite Index di Firebase Console! Klik link di browser console untuk membuat index.')
          }
        })
      } catch (err) {
        console.error('[Friends] Error starting req listener:', err)
      }
    }
    startReqListener()

    return () => {
      mounted = false
      if (unsubReqRef.current) unsubReqRef.current()
    }
  }, [auth.currentUser])

  // ---------- Add friend by code ----------
  const addFriendByCode = useCallback(async (code) => {
    setLoading(true)
    setError(null)
    const user = auth.currentUser

    if (!user) { setLoading(false); return { success: false, error: 'Login diperlukan' } }
    if (friends.length >= 50) { setLoading(false); return { success: false, error: 'Maksimal 50 teman tercapai!' } }
    if (code.toUpperCase() === friendCode.toUpperCase()) { setLoading(false); return { success: false, error: 'Tidak bisa add diri sendiri!' } }

    try {
      const db = await getDb()
      const { query, collection, where, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc, deleteDoc } = await getFirestoreHelpers()

      // 1. Cari target berdasarkan kode
      const q = query(collection(db, 'userCodes'), where('code', '==', code.toUpperCase()))
      const snap = await getDocs(q)

      if (snap.empty) {
        setLoading(false)
        return { success: false, error: 'Kode teman tidak ditemukan!' }
      }

      const targetData = snap.docs[0].data()
      const friendUid = targetData.uid

      // 2. Cek apakah sudah berteman
      const existingFriend = await getDoc(doc(db, 'users', user.uid, 'friends', friendUid))
      if (existingFriend.exists()) {
        setLoading(false)
        return { success: false, error: 'Kalian sudah berteman! 🤝' }
      }

      // 3. Cek apakah sudah ada pending request dari kita ke dia
      const dupCheck = query(
        collection(db, 'friendRequests'),
        where('fromUid', '==', user.uid),
        where('targetUid', '==', friendUid),
        where('status', '==', 'pending')
      )
      const dupSnap = await getDocs(dupCheck)
      if (!dupSnap.empty) {
        setLoading(false)
        return { success: false, error: 'Permintaan sudah terkirim, tunggu diterima! ⏳' }
      }

      // 4. Cek apakah ada pending request dari dia ke kita → auto-accept!
      const reverseCheck = query(
        collection(db, 'friendRequests'),
        where('fromUid', '==', friendUid),
        where('targetUid', '==', user.uid),
        where('status', '==', 'pending')
      )
      const reverseSnap = await getDocs(reverseCheck)

      if (!reverseSnap.empty) {
        // Dia sudah kirim request ke kita → langsung jadi teman (bidirectional)
        const reverseReq = reverseSnap.docs[0]

        await setDoc(doc(db, 'users', user.uid, 'friends', friendUid), {
          addedAt: Date.now(),
          displayName: targetData.displayName || 'Pemain',
          photoURL: targetData.photoURL || '',
        })
        await setDoc(doc(db, 'users', friendUid, 'friends', user.uid), {
          addedAt: Date.now(),
          displayName: user.displayName || 'Pemain',
          photoURL: user.photoURL || '',
        })

        await deleteDoc(doc(db, 'friendRequests', reverseReq.id))

        setLoading(false)
        return { success: true, autoAccepted: true }
      }

      // 5. Kirim friend request baru (TIDAK langsung add ke friends)
      await addDoc(collection(db, 'friendRequests'), {
        fromUid: user.uid,
        fromName: user.displayName || 'Pemain',
        fromPhoto: user.photoURL || '',
        targetUid: friendUid,
        status: 'pending',
        createdAt: serverTimestamp()
      })

      setLoading(false)
      return { success: true }
    } catch (err) {
      console.error('[Friends] Add friend error:', err)
      setLoading(false)
      return { success: false, error: 'Gagal mengirim permintaan.' }
    }
  }, [friends, friendCode])

  // ---------- Accept friend request (BIDIRECTIONAL) ----------
  const acceptFriendRequest = useCallback(async (req) => {
    const user = auth.currentUser
    if (!user) return { success: false }

    try {
      const db = await getDb()
      const { doc, setDoc, deleteDoc } = await getFirestoreHelpers()

      // Tambahkan di KEDUA sisi sekaligus
      await setDoc(doc(db, 'users', user.uid, 'friends', req.fromUid), {
        addedAt: Date.now(),
        displayName: req.fromName || 'Pemain',
        photoURL: req.fromPhoto || '',
      })
      await setDoc(doc(db, 'users', req.fromUid, 'friends', user.uid), {
        addedAt: Date.now(),
        displayName: user.displayName || 'Pemain',
        photoURL: user.photoURL || '',
      })

      await deleteDoc(doc(db, 'friendRequests', req.id))

      return { success: true }
    } catch (err) {
      console.error('[Friends] Accept error:', err)
      return { success: false }
    }
  }, [])

  // ---------- Decline friend request ----------
  const declineFriendRequest = useCallback(async (reqId) => {
    try {
      const db = await getDb()
      const { doc, deleteDoc } = await getFirestoreHelpers()
      await deleteDoc(doc(db, 'friendRequests', reqId))
      return { success: true }
    } catch (err) {
      console.error('[Friends] Decline error:', err)
      return { success: false }
    }
  }, [])

  // ---------- Remove friend (BIDIRECTIONAL) ----------
  const removeFriend = useCallback(async (friendUid) => {
    const user = auth.currentUser
    if (!user) return { success: false }

    try {
      const db = await getDb()
      const { doc, deleteDoc } = await getFirestoreHelpers()

      // Hapus di KEDUA sisi
      await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid))
      await deleteDoc(doc(db, 'users', friendUid, 'friends', user.uid))

      return { success: true }
    } catch (err) {
      console.error('[Friends] Remove friend error:', err)
      return { success: false }
    }
  }, [])

  return (
    <FriendsContext.Provider value={{
      friends, friendCode, requests, loading, error,
      addFriendByCode, removeFriend, acceptFriendRequest, declineFriendRequest
    }}>
      {children}
    </FriendsContext.Provider>
  )
}

export function useFriends() { return useContext(FriendsContext) }
