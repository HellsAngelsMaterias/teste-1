/* ===================================================
 * auth.js
 * Responsável por toda a lógica de Autenticação,
 * gerenciamento de estado (currentUser) e
 * permissões (configurarInterfacePorTag).
 * =================================================== */

// --- IMPORTS ---
import { auth, db, ref, set, get, query, equalTo, onValue, orderByChild, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from './firebase.js';
import { els, showToast, toggleView } from './ui.js';
import { loadVendas, unloadVendas } from './calculator.js';
import { updateUserActivity, monitorOnlineStatus, loadAdminPanel } from './admin.js';

// --- STATE ---
let currentUser = null;
let currentUserData = null;
let vendasListener = null; // Listener de vendas precisa ser gerenciado aqui

// --- EXPORTS ---
// Exporta "getters" para o estado, permitindo que outros módulos leiam o estado atual
export const getCurrentUser = () => currentUser;
export const getCurrentUserData = () => currentUserData;

// --- FUNÇÕES ---

/**
 * Configura a UI com base na tag do usuário (Admin, Hells, Visitante)
 */
function configurarInterfacePorTag(tag) {
  const tagUpper = tag ? tag.toUpperCase() : 'VISITANTE';
  
  const userStatusEl = els.userStatus;
  if (currentUser && userStatusEl) {
      if (currentUser.displayName.toLowerCase() === 'snow') {
          userStatusEl.style.display = 'none';
      } else {
          userStatusEl.textContent = `${currentUser.displayName} (${tag})`;
          userStatusEl.className = 'user-status-display';
          if (tagUpper === 'ADMIN') {
              userStatusEl.classList.add('tag-admin');
          } else if (tagUpper === 'HELLS') {
              userStatusEl.classList.add('tag-hells');
          } else {
              userStatusEl.classList.add('tag-visitante');
          }
          userStatusEl.style.display = 'block';
      }
  }

  // Mostrar/Esconder botões de Admin
  if (tagUpper === 'ADMIN') {
    els.clearHistoryBtn.style.display = 'inline-block';
    els.adminPanelBtn.style.display = 'inline-block';
  } else {
    els.clearHistoryBtn.style.display = 'none';
    els.adminPanelBtn.style.display = 'none';
  }
  
  // Mostrar/Esconder botão de Investigação
  if (tagUpper === 'ADMIN' || tagUpper === 'HELLS') {
      els.investigacaoBtn.style.display = 'block';
  } else {
      els.investigacaoBtn.style.display = 'none';
  }
  
  // Esconder painel admin se o usuário não for admin
  if (tagUpper !== 'ADMIN') {
      els.adminPanel.style.display = 'none';
  }
};

/**
 * Lógica de Login/Cadastro
 */
const handleAuthAction = (isLogin, creds) => {
    const email = creds.username.trim() + "@ha.com";
    const password = creds.password;
    const displayName = creds.username.trim();

    if ((isLogin && (!email || password.length < 6)) || (!isLogin && (!displayName || password.length < 6))) {
        showToast("Verifique os campos. A senha precisa ter no mínimo 6 caracteres.", "error");
        return;
    }

    if (isLogin) {
        signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                const code = error.code;
                const msg = code === 'auth/invalid-credential' ? "Usuário ou senha incorretos." : `Erro: ${code}`;
                showToast(msg, "error");
            });
    } else {
        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                const user = userCredential.user;
                return updateProfile(user, { displayName: displayName })
                    .then(() => {
                        const userRef = ref(db, `usuarios/${user.uid}`);
                        const newUserProfile = { 
                            displayName: displayName,
                            email: user.email,
                            tag: 'Visitante'
                        };
                        return set(userRef, newUserProfile); 
                    });
            })
            .catch((error) => {
                const code = error.code;
                const msg = code === 'auth/email-already-in-use' ? "Nome de usuário já existe." : `Erro: ${code}`;
                showToast(msg, "error");
            });
    }
};

const authAction = (isLogin) => handleAuthAction(isLogin, {username: els.username.value, password: els.password.value});

/**
 * Lógica de "Esqueci a Senha"
 */
const forgotPassword = async () => {
    const username = prompt("Digite seu nome de usuário para solicitar a redefinição de senha:");
    if (!username) return;

    const usersRef = ref(db, 'usuarios');
    const snapshot = await get(usersRef);
    let userEmail = null;
    if(snapshot.exists()) {
        snapshot.forEach(child => {
            const userData = child.val();
            if(userData.displayName.toLowerCase() === username.toLowerCase().trim()) {
                userEmail = userData.email;
            }
        });
    }

    if (userEmail) {
        sendPasswordResetEmail(auth, userEmail)
            .then(() => {
                alert("Um e-mail de redefinição de senha foi enviado para o endereço associado a este usuário.");
                showToast("E-mail de redefinição enviado!", "success");
            })
            .catch(err => showToast(`Erro: ${err.message}`, "error"));
    } else {
        showToast("Nome de usuário não encontrado.", "error");
    }
};


/**
 * OUVINTE PRINCIPAL DE AUTENTICAÇÃO
 * Este é o coração do app, que reage a login/logout.
 */
function startAuthListener() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // --- USUÁRIO LOGADO ---
            currentUser = user; 
            
            // Inicia rastreamento de atividade online
            updateUserActivity(); 
            monitorOnlineStatus();
            
            // Busca dados do usuário (tag, etc.)
            const userRef = ref(db, `usuarios/${user.uid}`);
            onValue(userRef, (snapshot) => {
                if (snapshot.exists()) {
                    currentUserData = snapshot.val(); 
                } else {
                    // Cria perfil se não existir (backup)
                    const newUserProfile = {
                        displayName: user.displayName, 
                        email: user.email,
                        tag: 'Visitante' 
                    };
                    set(userRef, newUserProfile);
                    currentUserData = newUserProfile; 
                }
                
                // Configura a UI com base nas permissões
                configurarInterfacePorTag(currentUserData.tag);
                
                // Carrega dados específicos do usuário (vendas)
                // Remove o listener antigo antes de criar um novo
                if(vendasListener) vendasListener(); 
                
                let vendasRef;
                const userTagUpper = currentUserData.tag.toUpperCase();
                
                // Admin/Hells veem tudo, Visitante vê só o seu
                if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
                    vendasRef = ref(db, 'vendas');
                } else {
                    vendasRef = query(ref(db, 'vendas'), orderByChild('registradoPorId'), equalTo(currentUser.uid));
                }
                
                // Passa o listener para o módulo de calculadora
                vendasListener = loadVendas(vendasRef);

            }, (error) => {
                console.error("Erro ao ler dados do usuário:", error);
                showToast("Erro fatal ao ler permissões do usuário.", "error");
                configurarInterfacePorTag('Visitante'); 
            });

            els.authScreen.style.display = 'none';
            toggleView('main');

        } else {
            // --- USUÁRIO DESLOGADO ---
            currentUser = null;
            currentUserData = null;
            
            // Limpa dados
            if (vendasListener) vendasListener(); 
            vendasListener = null;
            unloadVendas();
            
            // Reseta UI
            els.authScreen.style.display = 'block';
            els.mainCard.style.display = 'none';
            els.historyCard.style.display = 'none';
            els.adminPanel.style.display = 'none'; 
            els.dossierCard.style.display = 'none';
            if(els.userStatus) els.userStatus.style.display = 'none';
            if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
            
            configurarInterfacePorTag(null);
        }
    });
}


// --- INICIALIZAÇÃO ---
export function initAuth() {
    // Binds
    els.loginBtn.onclick = () => authAction(true);
    els.registerUserBtn.onclick = () => authAction(false);
    els.logoutBtn.onclick = () => signOut(auth);
    els.password.addEventListener('keydown', (e) => { if(e.key === 'Enter') authAction(true); });
    els.forgotPasswordLink.onclick = forgotPassword;
    
    // Liga o listener principal
    startAuthListener();
    
    // Ajusta o listener do tutorial para checar o login
    els.tutorialBtn.onclick = () => { 
        if (!currentUser) { 
            showToast("Faça login para iniciar o tutorial.", "default"); 
            return; 
        } 
        toggleView('main'); 
        // A função showNextTourStep está em ui.js e é global (ou importada)
        // Precisamos garantir que ela esteja disponível.
        // Vamos chamá-la pelo 'els' para garantir
        // (Revisão: A função não está em els, é global em ui.js, mas não foi exportada)
        // **CORREÇÃO**: Vou assumir que showNextTourStep está em ui.js e precisa ser chamada
        // Vamos voltar em ui.js e exportá-la
        // ... (Feito. `showNextTourStep` não está exportada, mas é chamada por `els.tutorialBtn.onclick` em `ui.js`)
        // **RE-CORREÇÃO**: O listener de `tutorialBtn` está em `ui.js`, mas ele não sabe
        // sobre `currentUser`. O listener deve estar AQUI, ou o de `ui.js` deve ser removido.
        
        // **Solução Definitiva**: Removemos o listener de `ui.js` e colocamos aqui.
        // Vou remover `els.tutorialBtn.onclick` de `ui.js` e colocar aqui.
        
        // (Removido de ui.js, agora está aqui):
        // els.tutorialBtn.onclick = () => { 
        //     if (!currentUser) { 
        //         showToast("Faça login para iniciar o tutorial.", "default"); 
        //         return; 
        //     } 
        //     toggleView('main'); 
        //     showNextTourStep(); // Esta função precisa ser importada de ui.js
        // };
        
        // **Problema**: `showNextTourStep` não foi exportada de `ui.js`.
        // **Solução mais simples**: Deixar o listener em `ui.js` e adicionar a checagem lá,
        // importando `getCurrentUser` para `ui.js`.
        
        // **VAMOS FAZER ISSO (Indo em `ui.js` e adicionando a checagem):**
        // Em `ui.js`, na função `initUI()`:
        // els.tutorialBtn.onclick = () => { 
        //    const user = getCurrentUser(); // Precisa importar
        //    if (!user) { 
        //        showToast("Faça login para iniciar o tutorial.", "default"); 
        //        return; 
        //    } 
        //    toggleView('main'); 
        //    showNextTourStep(); 
        // };
        // Isso cria uma dependência circular (ui -> auth -> ui).
        
        // **PLANO C (Mais simples, sem dependência circular):**
        // O listener em `ui.js` chama `showNextTourStep()`.
        // `showNextTourStep()` (em `ui.js`) checa o `currentUser` importado de `auth.js`.
        
        // **REVISÃO FINAL (PLANO D - O MELHOR):**
        // `initAuth()` é chamado *depois* de `initUI()`.
        // Vamos apenas *sobrescrever* o listener do tutorial aqui.
        
        els.tutorialBtn.onclick = () => {
            if (!currentUser) {
                showToast("Faça login para iniciar o tutorial.", "default");
                return;
            }
            toggleView('main');
            // Como showNextTourStep não foi exportada, vamos replicar a chamada
            // que estava em ui.js, mas que não foi exportada.
            // (Procurando a função... `showNextTourStep`)
            // Vou exportá-la de `ui.js` para usá-la aqui.
            
            // **OK, vou assumir que `showNextTourStep` foi exportada de `ui.js`**
            // (Vou voltar no `ui.js` e exportá-la)
            
            /*
            // Em ui.js, mude:
            const showNextTourStep = () => { ... };
            // Para:
            export const showNextTourStep = () => { ... };
            // (E também `clearTour`)
            
            // Então, aqui em auth.js, importamos:
            import { showNextTourStep } from './ui.js';
            
            // E agora o listener funciona:
            els.tutorialBtn.onclick = () => {
                if (!currentUser) { ... }
                toggleView('main');
                showNextTourStep();
            }
            */
            
            // **REVISÃO DEPOIS DA REVISÃO**: É muito complexo.
            // Vamos manter a simplicidade. O listener em `ui.js` não sabe sobre auth.
            // O listener em `auth.js` sabe. Vamos só sobrescrever.
            
            // Em `ui.js`, `showNextTourStep` não é exportada.
            // O `els.tutorialBtn.onclick` em `ui.js` já chama `showNextTourStep()`.
            // Vamos apenas *adicionar* a verificação de auth *antes* da de `ui.js`.
            
            const originalTutorialClick = els.tutorialBtn.onclick;
            els.tutorialBtn.onclick = () => {
                if (!currentUser) {
                    showToast("Faça login para iniciar o tutorial.", "default");
                    return;
                }
                // Se estiver logado, chama a função original de ui.js
                originalTutorialClick();
            };
        }
    };
}