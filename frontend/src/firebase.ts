import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// This should ideally be replaced with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  if (firebaseConfig.apiKey === "dummy-api-key") {
    throw new Error("Firebase is not configured. Please add your Firebase credentials to the .env file or use Guest Login.");
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google", error);
    throw error;
  }
};

export const loginAsGuest = async () => {
  if (firebaseConfig.apiKey === "dummy-api-key") {
    return { uid: `guest-${Math.floor(Math.random()*1000)}`, email: null, displayName: 'Guest User', photoURL: null, isAnonymous: true };
  }
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error logging in as guest", error);
    throw error;
  }
};

export const logout = async () => {
  if (firebaseConfig.apiKey === "dummy-api-key") {
    // If we're using a local dummy session, just return
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out", error);
    throw error;
  }
};

export { auth, db, storage };
