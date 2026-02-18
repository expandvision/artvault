import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8PriJptshsg2QCfWtZgH9D15fCalz38A",
  authDomain: "art-vault-85395.firebaseapp.com",
  projectId: "art-vault-85395",
  storageBucket: "art-vault-85395.firebasestorage.app",
  messagingSenderId: "717114829074",
  appId: "1:717114829074:web:12f29355dee5048943abcb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);