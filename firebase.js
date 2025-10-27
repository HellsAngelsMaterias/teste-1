/* ===============================================
  FIREBASE.JS
  Inicializa o Firebase e exporta os serviços
  e funções necessárias.
  
  VERSÃO SEM PASTAS
===============================================
*/

// --- Imports do SDK do Firebase
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
    update 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- Configuração do Firebase
const firebaseConfig = {
   apiKey: "AIzaSyDZrHAMaUkVAZJwOyHSq8Y5jxppv_XHwqs",
  authDomain: "hells-teste.firebaseapp.com",
  databaseURL: "https://hells-teste-default-rtdb.firebaseio.com",
  projectId: "hells-teste",
  storageBucket: "hells-teste.firebasestorage.app",
  messagingSenderId: "777418420603",
  appId: "1:777418420603:web:5fbb896137f2cc5d564dde",
  measurementId: "G-35QGX9D554"
};

// --- Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- Exportação dos Serviços
export { auth, db };

// --- Exportação das Funções (para não precisar importar em todo arquivo)
export {
    // Auth
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    signOut,
    
    // Database
    ref,
    set,
    push,
    onValue,
    remove,
    get,
    query,
    orderByChild,
    equalTo,
    update
};

