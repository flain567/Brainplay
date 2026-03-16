import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export default app
