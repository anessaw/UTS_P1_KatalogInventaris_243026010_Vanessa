// Firebase App + Firestore + Authentication.
// Tetap gunakan paket Spark; proyek ini tidak memakai Firebase Storage.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9eu9EHggZSIOKr9Xuz6Sn2EJTdmc0ilc",
  authDomain: "uts-inventaris-243026010.firebaseapp.com",
  projectId: "uts-inventaris-243026010",
  messagingSenderId: "733567003812",
  appId: "1:733567003812:web:faae5f900fc1f7c3b70a31"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
