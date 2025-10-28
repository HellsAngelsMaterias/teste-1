/* ===============================================
  FIREBASE.JS
  Configuração e inicialização do Firebase.
===============================================
*/

// ⭐️ CORREÇÃO: Importar dos links CDN (URLs)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    onValue, 
    push, 
    remove, 
    update, 
    query, 
    orderByChild, 
    equalTo 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Suas credenciais do Firebase
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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços que você precisa
export const auth = getAuth(app);
export const db = getDatabase(app);

// Exporta todas as funções do SDK que você usa nos outros arquivos
export { 
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
    push, 
    remove, 
    update, 
    query, 
    orderByChild, 
    equalTo 
};
