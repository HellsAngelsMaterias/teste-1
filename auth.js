/* ===================================================
 * auth.js
 * Módulo de Autenticação
 * Responsável pelo login, registro e status do usuário
 * =================================================== */

// --- IMPORTS ---
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut, sendPasswordResetEmail, db, ref, get, set, update } from './firebase.js';
import { els, showToast, toggleView, configureInterfaceByTag } from './ui.js';
import { unloadVendas } from './calculator.js'; // Importa função do calculator.js
import { updateUserActivity } from './admin.js'; // Importa função do admin.js
import { handleToggleView, setActivity } from './script.js'; // Importa funções do script.js

// --- STATE ---
let currentUser = null;
let currentUserData = null;

// --- FUNÇÕES GLOBAIS DE ACESSO ---
export const getCurrentUser = () => currentUser;
export const getCurrentUserData = () => currentUserData;


// --- FUNÇÕES DE AUTH ---

const startAuthListener = () => {
    // onAuthStateChanged é importado de firebase.js e não deve ser declarado aqui
    onAuthStateChanged(auth, async (user) => { // <-- Linha 154 (aproximadamente)
        if (user) {
            currentUser = user;
            
            // 1. Pega os dados extras (tag)
            const userRef = ref(db, `usuarios/${user.uid}`);
            try {
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    currentUserData = snapshot.val();
                } else {
                    // Novo usuário que acabou de registrar?
                    currentUserData = { displayName: user.displayName, tag: 'Visitante' };
                    // Se o usuário existir mas o nó não, recria o nó.
                    set(userRef, currentUserData); 
                }
            } catch (error) {
                showToast("Erro ao carregar permissões do usuário.", "error");
                currentUserData = { displayName: user.displayName, tag: 'Visitante' };
            }
            
            // 2. Configura a UI
            configureInterfaceByTag(currentUserData.tag);
            
            // 3. Inicia o monitoramento de atividade
            updateUserActivity('Online'); 

            // 4. Exibe a tela principal
            els.authScreen.style.display = 'none';
            handleToggleView('main'); 
            
        } else {
            // Logoff
            currentUser = null;
            currentUserData = null;
            
            unloadVendas(); // Para o listener de vendas (economiza recursos)

            els.authScreen.style.display = 'block';
            els.mainCard.style.display = 'none';
            els.historyCard.style.display = 'none';
            els.adminPanel.style.display = 'none';
            els.dossierCard.style.display = 'none';
            
            if(els.userStatus) els.userStatus.style.display = 'none';
            if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
        }
    });
};

const handleLogin = (e) => {
    e.preventDefault();
    const email = els.username.value.trim();
    const password = els.password.value.trim();

    if (!email || !password) {
        showToast("Preencha o nome de usuário e a senha.", "error");
        return;
    }
    
    // Assumimos que o nome de usuário é o displayName. Procuramos o email.
    // Como não temos um campo de email no login, vamos assumir um email de domínio fictício
    // Você deve adaptar esta parte se tiver um sistema de emails real.
    const fictitiousEmail = `${email.toLowerCase().replace(/\s/g, '.')}@hells.local`;

    signInWithEmailAndPassword(auth, fictitiousEmail, password)
        .then((userCredential) => {
            showToast(`Bem-vindo, ${userCredential.user.displayName}!`, "success");
            els.authMessage.textContent = '';
        })
        .catch((error) => {
            console.error("Erro de login:", error);
            const errorMessage = (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') ? 
                "Nome de usuário ou senha incorretos." : "Erro de autenticação: " + error.message;
            showToast(errorMessage, "error", 5000);
            els.authMessage.textContent = errorMessage;
        });
};

const handleRegister = async (e) => {
    e.preventDefault();
    const displayName = els.username.value.trim();
    const password = els.password.value.trim();
    
    if (!displayName || !password || password.length < 6) {
        showToast("Preencha o nome (mín. 1 caractere) e a senha (mín. 6 caracteres).", "error");
        return;
    }
    
    // Novo sistema: Usa displayName + @hells.local como email
    const fictitiousEmail = `${displayName.toLowerCase().replace(/\s/g, '.')}@hells.local`;

    // 1. Tenta criar usuário
    createUserWithEmailAndPassword(auth, fictitiousEmail, password)
        .then(async (userCredential) => {
            const user = userCredential.user;

            // 2. Atualiza o perfil (Display Name)
            await updateProfile(user, { displayName: displayName });

            // 3. Salva no banco de dados como Visitante
            const userData = {
                displayName: displayName,
                email: fictitiousEmail,
                tag: 'Visitante'
            };
            const userRef = ref(db, `usuarios/${user.uid}`);
            await set(userRef, userData);

            showToast(`Registro de "${displayName}" concluído! Logando...`, "success");
            els.authMessage.textContent = '';

            // O onAuthStateChanged cuida do resto do login
        })
        .catch((error) => {
            console.error("Erro de registro:", error);
            const errorMessage = (error.code === 'auth/email-already-in-use') ?
                "Nome de usuário já existe. Tente outro nome ou use a senha." :
                "Erro de registro: " + error.message;
            showToast(errorMessage, "error", 5000);
            els.authMessage.textContent = errorMessage;
        });
};

const handleLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
        signOut(auth).then(() => {
            showToast("Desconectado com sucesso.", "default");
            setActivity('Offline'); // Garante que a atividade seja registrada
        }).catch((error) => {
            showToast(`Erro ao sair: ${error.message}`, "error");
        });
    }
};

const handlePasswordReset = (e) => {
    e.preventDefault();
    const email = prompt("Digite o nome de usuário (ex: 'hells.angels') para receber o link de recuperação de senha.");
    if (email) {
        const fictitiousEmail = `${email.toLowerCase().replace(/\s/g, '.')}@hells.local`;
        sendPasswordResetEmail(auth, fictitiousEmail)
            .then(() => {
                showToast("E-mail de recuperação enviado! Verifique sua caixa de entrada.", "success", 6000);
            })
            .catch((error) => {
                showToast(`Erro ao enviar e-mail: ${error.message}`, "error", 6000);
            });
    }
};


// --- INICIALIZAÇÃO ---
export const initAuth = () => {
    // Binds de Login e Registro
    if(els.loginBtn) els.loginBtn.onclick = handleLogin;
    if(els.registerUserBtn) els.registerUserBtn.onclick = handleRegister;
    if(els.logoutBtn) els.logoutBtn.onclick = handleLogout;
    if(els.forgotPasswordLink) els.forgotPasswordLink.onclick = handlePasswordReset;

    // Inicia o listener de status de autenticação
    startAuthListener(); // <-- Linha 243 (aproximadamente)
};
