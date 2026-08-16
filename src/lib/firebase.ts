import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRd4s9pbxvbSYlF0MYvjSd_UwAYoHWP5Y",
  authDomain: "ramraj-2d21f.firebaseapp.com",
  projectId: "ramraj-2d21f",
  storageBucket: "ramraj-2d21f.firebasestorage.app",
  messagingSenderId: "1051557831996",
  appId: "1:1051557831996:web:b95b1a7504d38ccbba6a39",
  measurementId: "G-6C7PLG18H3",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Handle redirect result if popup was blocked and fallback redirect was used
if (typeof window !== "undefined") {
  getRedirectResult(auth).catch((err) => {
    console.error("Firebase redirect result error:", err);
  });
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-by-user") {
      console.warn("Popup blocked or closed by browser. Falling back to redirect...");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error("Google Sign-In Error:", err);
    throw err;
  }
}

export async function signUpWithEmail(name: string, email: string, pass: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export async function saveUserChatSession(
  userId: string,
  threadId: string,
  title: string,
  plugin: string | undefined,
  messages: any[],
) {
  if (!userId || !threadId) return;
  try {
    const threadRef = doc(db, "users", userId, "threads", threadId);
    await setDoc(
      threadRef,
      {
        id: threadId,
        title,
        plugin: plugin || null,
        updatedAt: Date.now(),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text || "",
          plugin: m.plugin || null,
          image: m.image || null,
          createdAt: m.createdAt || Date.now(),
        })),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Error saving session to Firestore:", err);
  }
}

export async function loadUserChatSessions(userId: string) {
  if (!userId) return [];
  try {
    const threadsRef = collection(db, "users", userId, "threads");
    const q = query(threadsRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const threads: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      threads.push({
        ...data,
        id: docSnap.id || data["id"],
      });
    });
    return threads;
  } catch (err) {
    console.error("Error loading sessions from Firestore:", err);
    return [];
  }
}

export async function deleteUserChatSession(userId: string, threadId: string) {
  if (!userId || !threadId) return;
  try {
    const threadRef = doc(db, "users", userId, "threads", threadId);
    await deleteDoc(threadRef);
  } catch (err) {
    console.error("Error deleting session from Firestore:", err);
    throw err;
  }
}

export { onAuthStateChanged, type User };
