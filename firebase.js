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
  apiKey: "AIzaSyCPNd9INqIfqG1-rjaYAlz988RLDZvL528", 
  authDomain: "hells-angels-438c2.firebaseapp.com",
  databaseURL: "https://hells-angels-438c2-default-rtdb.firebaseio.com/",
  projectId: "hells-angels-438c2",
  storageBucket: "hells-angels-438c2.firebasestorage.app",
  messagingSenderId: "429406215315",
  appId: "1:429406215315:web:96b68b172247824b308166",
  measurementId: "G-CR415MEY32"
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
