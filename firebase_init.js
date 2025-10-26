// Arquivo: firebase_init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  // ATENÇÃO: Use a sua chave original
  apiKey: "AIzaSyCPNd9INqIfqG1-rjaYAlz988RLDZvL528", 
  authDomain: "hells-angels-438c2.firebaseapp.com",
  databaseURL: "https://hells-angels-438c2-default-rtdb.firebaseio.com/",
  projectId: "hells-angels-438c2",
  storageBucket: "hells-angels-438c2.firebasestorage.app",
  messagingSenderId: "429406215315",
  appId: "1:429406215315:web:96b68b172247824b308166",
  measurementId: "G-CR415MEY32"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Exporta todos os serviços e funções que outros módulos precisarão
export { 
    auth, db, app, 
    // Auth
    sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut,
    // Database
    ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update 
};