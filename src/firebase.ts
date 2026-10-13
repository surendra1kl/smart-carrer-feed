import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, addDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile };

// Firestore Types and Helpers
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  status: 'Student' | 'Employee';
  desiredCourses?: string[];
  preferredLanguages?: string[];
  goal: string;
  interests: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SavedContent {
  id?: string;
  userId: string;
  contentId: string;
  title: string;
  url: string;
  source: "News" | "YouTube";
  thumbnail: string;
  savedAt: Timestamp;
}

export const getUserProfile = async (uid: string) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? userDoc.data() as UserProfile : null;
};

export const saveUserProfile = async (profile: Partial<UserProfile> & { uid: string }) => {
  const userRef = doc(db, 'users', profile.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    await updateDoc(userRef, { ...profile, updatedAt: serverTimestamp() });
  } else {
    await setDoc(userRef, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
};

export { onAuthStateChanged };
export type { User };
