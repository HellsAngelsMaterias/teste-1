/* ===============================================
  FIREBASE.JS
  Configuração e inicialização do Firebase.
===============================================
*/

import { initializeApp } from "firebase/app";

// Importe todos os módulos do SDK que você precisa
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
    update, 
    query, 
    orderByChild, 
    equalTo 
} from "firebase/database";

// TODO: ADICIONE SUAS CREDENCIAIS DO FIREBASE AQUI
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
