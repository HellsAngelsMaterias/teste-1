/* ===================================================
 * firebase.js
 * Módulo central do Firebase.
 * Inicializa o app e exporta todas as funções
 * de Auth e Database necessárias.
 * =================================================== */

// --- IMPORTS PRINCIPAIS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    remove, 
    get, 
    query, 
    orderByChild, 
    equalTo, 
    update,
    onDisconnect,     // <-- ADICIONADO AQUI
    serverTimestamp   // <-- ADICIONADO AQUI
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = {
  // Substitua pelos seus dados
  apiKey: "AIzaSyCPNd9INqIfqG1-rjaYAlz988RLDZvL528", 
  authDomain: "hells-angels-438c2.firebaseapp.com",
  databaseURL: "https://hells-angels-438c2-default-rtdb.firebaseio.com/",
  projectId: "hells-angels-438c2",
  storageBucket: "hells-angels-438c2.firebasestorage.app",
  messagingSenderId: "429406215315",
  appId: "1:429406215315:web:96b68b172247824b3080e7"
};

// --- INICIALIZAÇÃO ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- EXPORTS ---
// Exporta tudo para que os outros módulos possam usar
export {
    app,
    auth,
    db,
    
    // Funções de Auth
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    signOut,
    
    // Funções de Database
    ref,
    set,
    push,
    onValue,
    remove,
    get,
    query,
    orderByChild,
    equalTo,
    update,
    onDisconnect,     // <-- ADICIONADO AQUI
    serverTimestamp   // <-- ADICIONADO AQUI
};
