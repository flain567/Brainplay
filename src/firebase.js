import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyApf_nnK0DWKd9f90hGjdGDjYPqugfiieY",
  authDomain: "brainplay-83395.firebaseapp.com",
  projectId: "brainplay-83395",
  storageBucket: "brainplay-83395.firebasestorage.app",
  messagingSenderId: "742870469159",
  appId: "1:742870469159:web:bdf33b69f4098bd3591c02"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export default app

// ─── Lazy Firestore (loaded on-demand, not at startup) ───────────────────────
let _db = null
let _dbPromise = null

export function getDb() {
  if (_db) return Promise.resolve(_db)
  if (!_dbPromise) {
    _dbPromise = import('firebase/firestore').then(({ getFirestore }) => {
      _db = getFirestore(app)
      return _db
    })
  }
  return _dbPromise
}

// Preload firestore after initial render (don't block first paint)
export function preloadFirestore() {
  if (!_dbPromise) getDb()
}
