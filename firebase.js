/* ===============================================
  FIREBASE.JS (Com a inicialização correta)
  
  VERSÃO SEM PASTAS
===============================================
*/

// --- 1. Importações do SDK do Firebase ---
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "firebase/auth";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    onValue, 
    push, 
    remove, 
    query, 
    orderByChild, 
    equalTo, 
    update 
} from "firebase/database";

// --- 2. Sua Configuração do Projeto (CORRIGIDA) ---
// Estas são as suas credenciais que resolvem o erro "auth/configuration-not-found"
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

// --- 3. Inicialização e Exportação de Serviços ---

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Obtém e exporta os serviços
export const auth = getAuth(app);
export const db = getDatabase(app);

// Exporta todas as funções de autenticação e Realtime Database necessárias
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
    query, 
    orderByChild, 
    equalTo,
    update
};
