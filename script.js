/* ===============================================
  SCRIPT.JS (O ORQUESTRADOR)
  Gerencia o estado (auth) e conecta os 
  eventos da UI (els) às funções (modules).
===============================================
*/

// --- 1. Imports (CAMINHOS CORRIGIDOS)
import { 
    auth, db, 
    onAuthStateChanged, signOut, sendPasswordResetEmail, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
    ref, set, get, onValue, query, orderByChild, equalTo 
} from './firebase.js'; 

import { 
    loadAdminPanel, updateUserActivity, monitorOnlineStatus, 
    updateGlobalLayout, migrateVendasToDossier, migrateVeiculosData 
} from './admin.js'; 

import { 
    autoFillFromDossier, showDossierOrgs, filterOrgs, openAddOrgModal, 
    showDossierPeople, filterPeople, openAddDossierModal, removeDossierEntry, 
    openEditDossierModal, saveDossierChanges, closeEditDossierModal, 
    saveNewDossierEntry, closeAddDossierModal, saveOrg, deleteOrg, closeOrgModal, 
    closeImageLightbox, openEditOrgModal,
    adicionarOuAtualizarVeiculoTemp, cancelarEdicaoVeiculo, 
    removerVeiculoTemp, iniciarEdicaoVeiculo
} from './dossier.js'; 

import { 
    calculate, registerVenda, clearInputs, clearHistory, 
    editVenda, finishEditVenda, cancelEditVenda, toggleHistory, 
    showHistory, setVendas, exportSalesToCSV, getVendasFiltradas
} from './sales.js';

import { 
    els, toggleView, showToast, toggleTheme, startTour, 
    showLoginModal, hideLoginModal, showRegisterModal, hideRegisterModal,
    showForgotModal, hideForgotModal, capitalizeText, setupCapitalization, 
    cleanupScroll
} from './helpers.js'; 

// --- 2. Estado Interno (Auth) ---
export let currentUser = null;
export let isThemeDark = false;
let globalLayoutData = {}; 

// ===============================================
// LÓGICA DE AUTENTICAÇÃO E INICIALIZAÇÃO
// ===============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // 2a. Inicializa Dados do Usuário
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                // Mescla dados do Firebase com os dados do Auth
                currentUser = { ...user, ...userData }; 
                // Atualiza o estado de online imediatamente
                updateUserActivity(currentUser.uid, currentUser.tag, currentUser.email, 'Online');
                
                // 2b. Inicializa Dados Globais após o login do usuário
                initializeGlobalDataListeners(currentUser);
            }
        });
        
        // 2c. Após o login, mostra a tela principal
        toggleView('main');
        showToast(`Bem-vindo, ${currentUser.email || currentUser.displayName || 'Usuário'}!`, "success");
        
    } else {
        // Desloga o usuário e mostra a tela de boas-vindas
        currentUser = null;
        toggleView('welcome');
        showHistory(); // Limpa o histórico se for a tela principal
    }
});


// --- 3. Chamadas de Inicialização (SÍNCRONAS) ---
// O script PODE falhar aqui se houver um erro de 'null' antes de anexar listeners.

// Ativa a verificação de status online (de admin.js)
monitorOnlineStatus(); 

// Prepara os inputs para capitalização (helpers.js)
setupCapitalization();

// ===============================================
// FUNÇÕES DE AÇÕES DE USUÁRIO
// ===============================================

// --- Autenticação ---

const handleLogin = async (email, password) => {
    setUserActivity('Tentativa de Login');
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideLoginModal(); // Sucesso: esconde modal (o onAuthStateChanged faz o resto)
    } catch (error) {
        showToast(`Erro de Login: ${error.message}`, "error");
    }
};

const handleRegister = async (email, password, displayName, tag) => {
    setUserActivity('Tentativa de Registro');
    if (tag.toUpperCase() !== 'ADMIN' && tag.toUpperCase() !== 'HELLS' && tag.toUpperCase() !== 'VISITANTE') {
        showToast("Tag inválida. Use 'ADMIN', 'HELLS' ou 'VISITANTE'.", "error");
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: displayName });
        
        // Salva dados adicionais no Realtime Database
        await set(ref(db, `users/${user.uid}`), {
            email: email,
            displayName: displayName,
            tag: tag.toUpperCase(), 
            lastActivity: 'Online',
            lastActivityTimestamp: Date.now()
        });
        
        showToast("Registro criado! Faça login.", "success");
        hideRegisterModal();
        showLoginModal();
        
    } catch (error) {
        showToast(`Erro de Registro: ${error.message}`, "error");
    }
};

const handleSignOut = () => {
    if (currentUser) {
        updateUserActivity(currentUser.uid, currentUser.tag, currentUser.email, 'Offline');
    }
    signOut(auth).then(() => {
        showToast("Você foi desconectado(a).", "default");
    }).catch((error) => {
        showToast(`Erro ao desconectar: ${error.message}`, "error");
    });
};

const handleForgotPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Email de recuperação enviado! Verifique sua caixa de entrada.", "success");
        hideForgotModal();
        showLoginModal();
    } catch (error) {
        showToast(`Erro ao enviar email: ${error.message}`, "error");
    }
};

// --- Funções de Ajuda e Monitoramento ---

export const setUserActivity = (activity) => {
    if (currentUser) {
        updateUserActivity(currentUser.uid, currentUser.tag, currentUser.email, activity);
    }
};

// Função que inicia o monitoramento de dados globais
const initializeGlobalDataListeners = (user) => {
    // Escuta por mudanças nas configurações de Layout Global
    onValue(ref(db, 'configuracoesGlobais/layout'), (snapshot) => {
        const data = snapshot.val() || {};
        globalLayoutData = data;
        
        // Aplica o tema automaticamente
        if (data.enableNightMode) {
            isThemeDark = true;
            document.body.classList.add('dark');
        } else {
            isThemeDark = false;
            document.body.classList.remove('dark');
        }
        
        // Aplica a mensagem do rodapé
        if (els.bottomPanel && data.bottomPanelText) {
            els.bottomPanel.innerHTML = data.bottomPanelText;
        }
        
        // Mostra/Esconde o rodapé
        if (els.bottomPanel) {
            els.bottomPanel.style.display = data.enableBottomPanel ? 'flex' : 'none';
        }
    });
    
    // Escuta por mudanças no histórico de vendas (sales.js)
    onValue(ref(db, 'vendas'), (snapshot) => {
        const vendasData = snapshot.val() || {};
        const vendasArray = Object.keys(vendasData).map(key => ({ id: key, ...vendasData[key] }));
        setVendas(vendasArray); 
        showHistory(); // Re-renderiza o histórico
    }, (error) => {
        showToast(`Erro ao carregar vendas: ${error.message}`, "error");
    });
    
    // Escuta por mudanças nas organizações (dossier.js)
    onValue(ref(db, 'dossies'), (snapshot) => {
        const dossiesData = snapshot.val() || {};
        showDossierOrgs(dossiesData, user); // Atualiza a tela de investigação
    }, (error) => {
        showToast(`Erro ao carregar dossiês: ${error.message}`, "error");
    });
    
    // Escuta o status online dos usuários (admin.js)
    loadAdminPanel(false, user);
};


// ===============================================
// EVENT LISTENERS DO DOM (Conecta a UI com a Lógica)
// ===============================================

// --- 4. Event Listeners de Modais de Auth ---
els.loginBtn.onclick = () => { showLoginModal(); setUserActivity('Abrindo Login'); };
els.registerLink.onclick = () => { hideLoginModal(); showRegisterModal(); setUserActivity('Abrindo Registro'); };
els.forgotPasswordLink.onclick = () => { hideLoginModal(); showForgotModal(); setUserActivity('Abrindo Esqueceu Senha'); };
els.cancelLoginBtn.onclick = hideLoginModal;
els.cancelRegisterBtn.onclick = () => { hideRegisterModal(); showLoginModal(); };
els.cancelForgotBtn.onclick = () => { hideForgotModal(); showLoginModal(); };

els.doLoginBtn.onclick = () => { 
    handleLogin(els.loginEmail.value, els.loginPassword.value); 
};

els.doRegisterBtn.onclick = () => { 
    handleRegister(els.registerEmail.value, els.registerPassword.value, els.registerDisplayName.value, els.registerTag.value);
};

els.doForgotBtn.onclick = () => {
    handleForgotPassword(els.forgotEmail.value);
};


// --- 5. Event Listeners de UI Principal ---
els.calcBtn.onclick = calculate;
els.registerBtn.onclick = registerVenda;
els.resetBtn.onclick = clearInputs;
els.finishEditBtn.onclick = finishEditVenda;
els.cancelEditBtn.onclick = cancelEditVenda;
els.logoutBtn.onclick = handleSignOut;

els.exportCsvBtn.onclick = () => { 
    setUserActivity('Exportando CSV');
    exportSalesToCSV(getVendasFiltradas());
};

els.clearHistoryBtn.onclick = () => {
    setUserActivity('Limpando Histórico');
    clearHistory(currentUser);
};

// Filtro de Histórico
if (els.filtroHistorico) {
    els.filtroHistorico.addEventListener('change', showHistory);
}

// Auto-preenchimento
els.nomeCliente.addEventListener('change', autoFillFromDossier);


// --- 6. Event Listeners de Acesso e UI (Chamados no início do SCRIPT) ---
els.enterBtn.onclick = () => { 
    setUserActivity('Entrar (Sem Login)');
    // ⭐️ Aqui é onde o script trava se um dos inputs de cima for null
    // Se o script quebrar antes, esta linha nunca é executada.
    if (!currentUser) {
        toggleView('auth');
        showLoginModal();
    } else {
        toggleView('main');
    }
};

els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = startTour;


// --- 7. Event Listeners de Dossier/Investigação (Módulo: dossier.js) ---
els.investigacaoBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    toggleView('dossier');
    cleanupScroll(); // ⭐️ Limpa o scroll
};

els.filterOrgs.addEventListener('input', () => filterOrgs(currentUser)); 
els.backToOrgsBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    showDossierOrgs(null, currentUser);
};

els.addNewOrgBtn.onclick = () => openAddOrgModal(currentUser);
els.addNewDossierBtn.onclick = () => openAddDossierModal(currentUser);
els.saveNewDossierBtn.onclick = saveNewDossierEntry;
els.cancelNewDossierBtn.onclick = closeAddDossierModal;
els.saveDossierChangesBtn.onclick = saveDossierChanges;
els.cancelEditDossierBtn.onclick = closeEditDossierModal;
els.closeImageLightboxBtn.onclick = closeImageLightbox;

// Modal de Organização
els.saveOrgBtn.onclick = saveOrg;
els.deleteOrgBtn.onclick = deleteOrg;
els.cancelOrgBtn.onclick = closeOrgModal;

// Modal de Veículo (Adicionar/Editar)
els.addModalAddVeiculoBtn.onclick = adicionarOuAtualizarVeiculoTemp;
els.addModalCancelVeiculoBtn.onclick = cancelarEdicaoVeiculo;

// --- 8. Event Listeners de Admin (Módulo: admin.js) ---
els.adminPanelBtn.onclick = () => {
    setUserActivity('Painel Admin'); 
    toggleView('admin');
    cleanupScroll(); // ⭐️ Limpa o scroll
    loadAdminPanel(true, currentUser); 
};
els.toggleCalcBtnAdmin.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // ⭐️ Limpa o scroll
};
els.saveBottomPanelTextBtn.onclick = () => {
    const newText = els.bottomPanelText.value.trim();
    updateGlobalLayout('bottomPanelText', newText);
    showToast("Mensagem do rodapé salva!", "success");
    setUserActivity('Painel Admin (Salvando Configs)'); 
};
els.layoutToggleNightMode.onchange = (e) => updateGlobalLayout('enableNightMode', e.target.checked);
els.layoutToggleBottomPanel.onchange = (e) => updateGlobalLayout('enableBottomPanel', e.target.checked);
els.migrateDossierBtn.onclick = migrateVendasToDossier;
els.migrateVeiculosBtn.onclick = migrateVeiculosData;
