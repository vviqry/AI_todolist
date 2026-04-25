import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDs0EzKjgpbQHPXljc25MmU6ugFI_li8sw",
  authDomain: "to-do-list-2f803.firebaseapp.com",
  projectId: "to-do-list-2f803",
  storageBucket: "to-do-list-2f803.firebasestorage.app",
  messagingSenderId: "920516615811",
  appId: "1:920516615811:web:aec446ba9444e0fea645b6",
  measurementId: "G-F4MZXBLRE9"
};

// Initialize Firebase (Avoid duplicate initialization in Next.js)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
