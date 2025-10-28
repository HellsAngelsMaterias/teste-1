/* ===============================================
  FIREBASE.JS
  Inicialização e exportação dos módulos do Firebase.
===============================================
*/

// Importa as funções necessárias dos SDKs
// (Versão 9.6.10 para compatibilidade com o formato de importação atual)
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
// ⬇️ SUAS CONFIGURAÇÕES DO FIREBASE INSERIDAS ⬇️
// ===============================================
const firebaseConfig = {
  apiKey: "AIzaSyDZrHAMaUkVAZJwOyHSq8Y5jxppv_XHwqs",
  authDomain: "hells-teste.firebaseapp.com",
  databaseURL: "https://hells-teste-default-rtdb.firebaseio.com",
  projectId: "hells-teste",
  storageBucket: "hells-teste.firebasestorage.app",
  messagingSenderId: "777418420603",
  appId: "1:777418420603:web:0e33ad25caa12079564dde",
  // measurementId é opcional para este propósito e pode ser omitido
};
// ===============================================

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços do Firebase
const auth = getAuth(app);
const db = getDatabase(app);

// Exporta tudo que seus outros scripts precisam
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
