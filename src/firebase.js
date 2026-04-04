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

// ─── Firebase App Check (Anti-Bot / Anti-Curl) ───────────────────────────────
// This ensures only the real BrainPlay web app can access Firestore.
// To activate:
//   1. Go to Firebase Console → App Check
//   2. Register your web app with reCAPTCHA Enterprise
//   3. Copy the Site Key and replace 'YOUR_RECAPTCHA_SITE_KEY' below
//   4. Enable "Enforce" on Firestore in App Check settings

let _appCheckInitialized = false

export function initAppCheck() {
  if (_appCheckInitialized) return
  _appCheckInitialized = true
  
  import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
    try {
      // In development, use debug mode
      if (import.meta.env.DEV) {
        // Debug token will be printed to console — register it in Firebase Console
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
      }
      
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider('YOUR_RECAPTCHA_SITE_KEY'),
        isTokenAutoRefreshEnabled: true,
      })
      console.log('[AppCheck] ✅ Initialized')
    } catch (err) {
      console.warn('[AppCheck] ⚠️ Not configured yet:', err.message)
    }
  }).catch(() => {
    console.warn('[AppCheck] ⚠️ Module not available')
  })
}

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
