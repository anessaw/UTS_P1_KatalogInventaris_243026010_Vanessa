import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// Pengaturan agar aplikasi terhubung ke proyek Firebase yang benar.
const firebaseConfig = {
  apiKey: "AIzaSyD9eu9EHggZSIOKr9Xuz6Sn2EJTdmc0ilc",
  authDomain: "uts-inventaris-243026010.firebaseapp.com",
  projectId: "uts-inventaris-243026010",
  messagingSenderId: "733567003812",
  appId: "1:733567003812:web:faae5f900fc1f7c3b70a31"
};

// Mengaktifkan Firebase dan layanan yang digunakan.
const app = initializeApp(firebaseConfig);
// Membuat koneksi ke Firestore
const db = getFirestore(app);
// Mengaktifkan Firebase Authentication
const auth = getAuth(app);

// Membagikan variabel agar dapat digunakan oleh file lain.
export { app, db, auth };
