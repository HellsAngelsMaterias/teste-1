/* ===============================================
  FIREBASE.JS
  Inicializa e exporta o Firebase.
===============================================
*/

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

// Sua configuração (extraída do seu script.js)
const firebaseConfig = {
  apiKey: "AIzaSyDZrHAMaUkVAZJwOyHSq8Y5jxppv_XHwqs", 
  authDomain: "hhells-teste.firebaseapp.com",
  databaseURL: "https://hells-teste-default-rtdb.firebaseio.com",
  projectId: "hells-teste",
  storageBucket: "hells-teste.firebasestorage.app",
  messagingSenderId: "777418420603",
  appId: "1:777418420603:web:0e33ad25caa12079564dde",
  measurementId: "G-1VL7C8FZL0"
};

// Inicializa e exporta os serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Exporta os serviços e todas as funções que os módulos usarão
export { 
  app, 
  auth, 
  db,
  // Funções de Autenticação
  sendPasswordResetEmail, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  onAuthStateChanged, 
  signOut,
  // Funções do Realtime Database
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


