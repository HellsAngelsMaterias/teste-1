/* ===============================================
  FIREBASE.JS
  Inicialização e exportação dos módulos do Firebase.
===============================================
*/

// Importa as funções necessárias dos SDKs
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
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_AUTH_DOMAIN_AQUI",
  databaseURL: "SEU_DATABASE_URL_AQUI",
  projectId: "SEU_PROJECT_ID_AQUI",
  storageBucket: "SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "SEU_APP_ID_AQUI"
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
