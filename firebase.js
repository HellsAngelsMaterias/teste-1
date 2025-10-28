/* ===============================================
  FIREBASE.JS
  Inicialização e exportação dos módulos do Firebase.
===============================================
*/

// Importa as funções necessárias dos SDKs
// (Estou usando as URLs de CDN, pois você não tem um package.json)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    onValue, 
    query, 
    orderByChild, 
    equalTo, 
    remove, 
    push, 
    update 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// ===============================================
// ⬇️ COLE SUAS CONFIGURAÇÕES DO FIREBASE AQUI ⬇️
// (Você encontra isso no Painel do Firebase > Configurações do Projeto)
// ===============================================
const firebaseConfig = {
 apiKey: "AIzaSyDZrHAMaUkVAZJwOyHSq8Y5jxppv_XHwqs",
  authDomain: "hells-teste.firebaseapp.com",
  databaseURL: "https://hells-teste-default-rtdb.firebaseio.com",
  projectId: "hells-teste",
  storageBucket: "hells-teste.firebasestorage.app",
  messagingSenderId: "777418420603",
  appId: "1:777418420603:web:0e33ad25caa12079564dde",
  measurementId: "G-1VL7C8FZL0"
};
// ===============================================

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços do Firebase
const auth = getAuth(app);
const db = getDatabase(app);

// Exporta tudo que seus outros scripts (script.js, admin.js, sales.js, etc.) precisam
export { 
    auth, 
    db,
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    ref, 
    set, 
    get, 
    onValue, 
    query, 
    orderByChild, 
    equalTo, 
    remove, 
    push, 
    update
};
