import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyASxskceZS_zfFTEpjDVeUan9OXHg6R-TA",
  authDomain: "ct216project-815af.firebaseapp.com",
  projectId: "ct216project-815af",
  storageBucket: "ct216project-815af.firebasestorage.app",
  messagingSenderId: "669309915760",
  appId: "1:669309915760:web:bd6c1a7b3a19183e1e9ab5",
  measurementId: "G-E3R6EPNXP0"
};

const app = initializeApp(firebaseConfig)

const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }