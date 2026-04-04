import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { auth, getDb } from '../firebase.js'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const unsubRef = useRef(null)

  // Buat/ambil friend code unik untuk user ini
  useEffect(() => {
    let mounted = true
    const initCode = async () => {
      const user = auth.currentUser
      if (!user) return

      try {
        const db = await getDb()
        const { doc, getDoc, setDoc, query, collection, where, getDocs } = await getFirestoreHelpers()

        // Cek cloud Firestore
        const codeRef = doc(db, 'userCodes', user.uid)
        const snap = await getDoc(codeRef)
        
        let code = snap.exists() ? snap.data().code : ''
        
        if (!code) {
          // Generate new unique 6-char code
          while (true) {
            code = Math.random().toString(36).substring(2, 8).toUpperCase()
            const codeCheck = query(collection(db, 'userCodes'), where('code', '==', code))
            const existSnap = await getDocs(codeCheck)
            if (existSnap.empty) break
          }
          await setDoc(codeRef, { code, uid: user.uid })
        }
        
        if (mounted) {
          setFriendCode(code)
          localStorage.setItem('bp_friend_code', code)
        }
      } catch (err) {
        console.error('[Friends] Generate code error:', err)
      }
    }
    
    // Subscribe ke Auth Change buat refresh code
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) initCode()
      else {
        setFriendCode('')
        setFriends([])
      }
    })
    
    return () => { mounted = false; unsubAuth() }
  }, [])

  // Listener untuk sinkronisasi daftar teman
  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    let mounted = true
    const startListener = async () => {
      try {
        const db = await getDb()
        const { collection, onSnapshot } = await getFirestoreHelpers()
        
        const friendsRef = collection(db, 'users', user.uid, 'friends')
        
        unsubRef.current = onSnapshot(friendsRef, async (snap) => {
          if (!mounted) return
          const friendData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
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

  // Menambahkan teman melalui Friend Code
  const addFriendByCode = useCallback(async (code) => {
    setLoading(true)
    setError(null)
    const user = auth.currentUser
    
    if (!user) { setLoading(false); return { success: false, error: 'Login diperlukan' } }
    if (friends.length >= 50) { setLoading(false); return { success: false, error: 'Maksimal 50 teman tercapai!' } }
    if (code.toUpperCase() === friendCode.toUpperCase()) { setLoading(false); return { success: false, error: 'Tidak bisa add diri sendiri!' } }
    
    try {
      const db = await getDb()
      const { query, collection, where, getDocs, doc, setDoc } = await getFirestoreHelpers()
      
      const q = query(collection(db, 'userCodes'), where('code', '==', code.toUpperCase()))
      const snap = await getDocs(q)
      
      if (snap.empty) {
        setLoading(false)
        return { success: false, error: 'Kode teman tidak ditemukan!' }
      }
      
      const friendUid = snap.docs[0].data().uid
      
      if (friends.some(f => f.uid === friendUid)) {
        setLoading(false)
        return { success: false, error: 'Sudah berteman!' }
      }
      
      // Simpan relasi satu arah untuk sekarang
      await setDoc(doc(db, 'users', user.uid, 'friends', friendUid), {
        addedAt: Date.now(),
      })
      
      setLoading(false)
      return { success: true }
    } catch (err) {
      console.error('[Friends] Add friend error:', err)
      setLoading(false)
      return { success: false, error: 'Gagal menambahkan teman.' }
    }
  }, [friends, friendCode])

  // Hapus teman
  const removeFriend = useCallback(async (friendUid) => {
    const user = auth.currentUser
    if (!user) return { success: false }

    try {
      const db = await getDb()
      const { doc, deleteDoc } = await getFirestoreHelpers()
      await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid))
      return { success: true }
    } catch (err) {
      console.error('[Friends] Remove friend error:', err)
      return { success: false }
    }
  }, [])

  return (
    <FriendsContext.Provider value={{
      friends, friendCode, loading, error, addFriendByCode, removeFriend
    }}>
      {children}
    </FriendsContext.Provider>
  )
}

export function useFriends() { return useContext(FriendsContext) }
