// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// إعدادات مشروعك الحقيقية "ibn-malik-store"
const firebaseConfig = {
  apiKey: "AIzaSyDMuwa5nU4x6lNGFjsyuTTqFU9xbrKqsD4",
  authDomain: "ibn-malik-store.firebaseapp.com",
  projectId: "ibn-malik-store",
  storageBucket: "ibn-malik-store.firebasestorage.app",
  messagingSenderId: "149995481774",
  appId: "1:149995481774:web:43b81e865ebc5e154d1b3f",
  measurementId: "G-9MM3VPWKRY"
};

// تشغيل الخدمات
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// تصديرهم عشان نستخدمهم في الصفحات التانية
export { db, auth, storage };