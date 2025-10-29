/* ===============================================
  SCRIPT.JS (O ORQUESTRADOR)
  Gerencia o estado (auth) e conecta os 
  eventos da UI (els) às funções (modules).
===============================================
*/

// --- 1. Imports
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
    calculate, registerVenda, editVenda, removeVenda, copyDiscordMessage, 
    displaySalesHistory, filterHistory, exportToCsv, clearHistory, 
    clearAllFields, setVendas, setVendaEmEdicao 
} from './sales.js'; 

import { els } from './dom.js'; 

import { 
    showToast, toggleView, toggleTheme, updateLogoAndThemeButton, 
    showNextTourStep, phoneMask, PREFIX, camposParaCapitalizar, clearTour
} from './helpers.js'; 

// --- 4. Estado Global Principal
let currentUser = null;
let currentUserData = null;
let vendasListener = null;
let scrollCleanup = null;

// --- FUNÇÃO GLOBAL DE ATIVIDADE
const setUserActivity = (activity) => {
    if (currentUser && currentUserData) {
        updateUserActivity(currentUser, currentUserData, activity);
    }
};

// --- FUNÇÕES DE INTERFACE
const configurarInterfacePorTag = (tag) => {
  const tagUpper = tag ? tag.toUpperCase() : 'VISITANTE';
  
  const userStatusEl = els.userStatus;
  if (currentUser && userStatusEl) {
      if (currentUser.displayName.toLowerCase() === 'snow') {
          userStatusEl.style.display = 'none';
      } else {
          userStatusEl.textContent = `${currentUser.displayName} (${tag})`;
          userStatusEl.className = 'user-status-display';
          if (tagUpper === 'ADMIN') userStatusEl.classList.add('tag-admin');
          else if (tagUpper === 'HELLS') userStatusEl.classList.add('tag-hells');
          else userStatusEl.classList.add('tag-visitante');
          userStatusEl.style.display = 'block';
      }
  }

  if (els.clearHistoryBtn) els.clearHistoryBtn.style.display = (tagUpper === 'ADMIN') ? 'inline-block' : 'none';
  if (els.adminPanelBtn) els.adminPanelBtn.style.display = (tagUpper === 'ADMIN') ? 'inline-block' : 'none';
  if (els.investigacaoBtn) els.investigacaoBtn.style.display = (tagUpper === 'ADMIN' || tagUpper === 'HELLS') ? 'block' : 'none';
  
  if (els.layoutToggleNightMode) els.layoutToggleNightMode.disabled = tagUpper !== 'ADMIN';
  if (els.layoutToggleBottomPanel) els.layoutToggleBottomPanel.disabled = tagUpper !== 'ADMIN';
  if (els.bottomPanelText) els.bottomPanelText.disabled = tagUpper !== 'ADMIN';
  if (els.saveBottomPanelTextBtn) els.saveBottomPanelTextBtn.disabled = tagUpper !== 'ADMIN';
  
  if (tagUpper !== 'ADMIN') {
      if (els.adminPanel) els.adminPanel.style.display = 'none';
  }
};

const setupHistoryScrollSync = () => {
    const scrollContainer = els.historyCard.querySelector('.history-table-wrapper');
    const topBar = els.topHistoryScrollbar;
    
    if (!scrollContainer || !topBar) return;
    
    const innerContent = document.createElement('div');
    innerContent.style.height = '1px';
    topBar.innerHTML = '';
    topBar.appendChild(innerContent);
    
    let isScrolling = false;

    const syncScroll = (source, target) => {
        if (isScrolling) return;
        isScrolling = true;
        target.scrollLeft = source.scrollLeft;
        requestAnimationFrame(() => { isScrolling = false; });
    };

    const topScrollHandler = () => syncScroll(topBar, scrollContainer);
    const bottomScrollHandler = () => syncScroll(scrollContainer, topBar);

    topBar.addEventListener('scroll', topScrollHandler);
    scrollContainer.addEventListener('scroll', bottomScrollHandler);

    const recalculateWidth = () => {
        if (els.historyCard.style.display !== 'none') {
            const contentWidth = scrollContainer.scrollWidth; 
            innerContent.style.width = contentWidth + 'px'; 
            topBar.style.width = scrollContainer.offsetWidth + 'px';
            topBar.scrollLeft = scrollContainer.scrollLeft; 
        }
    };
    
    recalculateWidth();
    
    window.addEventListener('resize', recalculateWidth);
    const observer = new MutationObserver(recalculateWidth);
    observer.observe(scrollContainer, { childList: true, subtree: true, attributes: true });

    return () => {
        window.removeEventListener('resize', recalculateWidth);
        topBar.removeEventListener('scroll', topScrollHandler);
        scrollContainer.removeEventListener('scroll', bottomScrollHandler);
        observer.disconnect();
        topBar.innerHTML = ''; 
    };
};

const cleanupScroll = () => {
    if (scrollCleanup) {
        scrollCleanup();
        scrollCleanup = null;
    }
};

// ===============================================
// INICIALIZAÇÃO E UI
// ===============================================

// Aplica o tema salvo
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
}
updateLogoAndThemeButton(savedTheme === 'dark');

// Controla a tela de boas-vindas
if (localStorage.getItem('hasVisited')) {
    els.welcomeScreen.style.display = 'none';
    els.authScreen.style.display = 'block'; // Mostra o login
} else {
    els.welcomeScreen.classList.add('show');
    els.authScreen.style.display = 'none';
    els.mainCard.style.display = 'none';
}

// Aplica capitalização automática
camposParaCapitalizar.forEach(campo => {
  if (campo) {
    campo.addEventListener('input', (e) => {
      const { selectionStart, selectionEnd } = e.target;
      e.target.value = capitalizeText(e.target.value); 
      e.target.setSelectionRange(selectionStart, selectionEnd);
    });
  }
});

// Aplica máscaras de telefone
const camposTelefone = [els.telefone, els.editDossierNumero, els.addDossierNumero];
camposTelefone.forEach(campo => {
    if (campo) {
        campo.addEventListener('input', (e) => {
            e.target.value = e.target.value.length < PREFIX.length ? PREFIX : phoneMask(e.target.value);
        });
        campo.addEventListener('focus', (e) => {
            if (!e.target.value || e.target.value.length < PREFIX.length) { e.target.value = PREFIX; }
        });
    }
});


// ===============================================
// LÓGICA DE AUTENTICAÇÃO (CORRIGIDA)
// ===============================================

// DOMÍNIO FICTÍCIO para permitir login por nome de usuário
const AUTH_DOMAIN = '@hells.app';

/**
 * Lida com o login ou registro.
 * Converte o nome de usuário em um email fictício.
 */
const handleAuthAction = async (isLogin, creds) => {
    const { username, password } = creds;
    if (!username || !password) {
        els.authMessage.textContent = 'Preencha usuário e senha.';
        return;
    }
    
    const displayName = username.trim();
    const email = `${displayName.toLowerCase()}${AUTH_DOMAIN}`;
    els.authMessage.textContent = isLogin ? 'Autenticando...' : 'Registrando...';

    // --- 1. Lógica de REGISTRO ---
    if (!isLogin) {
        try {
            if (password.length < 6) {
                 els.authMessage.textContent = 'Senha muito fraca (mínimo 6 caracteres).';
                 return;
            }
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Atualiza o profile do Firebase Auth
            await updateProfile(userCredential.user, { displayName: displayName });
            
            // Salva os dados no Realtime Database
            const userRef = ref(db, `usuarios/${userCredential.user.uid}`);
            await set(userRef, {
                displayName: displayName,
                email: email, // O email fictício
                tag: 'Visitante' // Tag padrão
            });
            
            els.authMessage.textContent = 'Usuário registrado com sucesso! A fazer login...';
            // O onAuthStateChanged vai tratar do login
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                els.authMessage.textContent = 'Este nome de usuário já está em uso.';
            } else {
                console.error("Erro ao registrar:", error);
                els.authMessage.textContent = `Erro ao registrar.`;
            }
        }
        return;
    }

    // --- 2. Lógica de LOGIN ---
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Sucesso! O onAuthStateChanged vai tratar o resto.
        els.authMessage.textContent = 'Sucesso! A entrar...';
    } catch (error) {
        console.error("Erro no login:", error.code);
        // Esta é a mensagem que você vê na imagem
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            els.authMessage.textContent = 'Erro ao tentar autenticar.'; 
        } else {
            els.authMessage.textContent = `Erro: ${error.code}`;
        }
    }
};

const authAction = (isLogin) => {
    handleAuthAction(isLogin, {
        username: els.username.value, 
        password: els.password.value
    });
};

const resetPassword = async () => {
    const username = prompt("Digite o seu NOME DE USUÁRIO (não o email) para redefinir a senha:");
    if (!username) return;
    
    const email = `${username.toLowerCase().trim()}${AUTH_DOMAIN}`;
    
    try {
        await sendPasswordResetEmail(auth, email);
        showToast(`Email de redefinição enviado para ${email}. (Verifique seu Spam)`, "success", 5000);
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            showToast("Usuário não encontrado.", "error");
        } else {
            showToast("Erro ao tentar redefinir a senha.", "error");
        }
    }
};


// ===============================================
// LISTENER PRINCIPAL DE AUTENTICAÇÃO (O CORAÇÃO)
// ===============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- USUÁRIO LOGADO ---
        currentUser = user; 
        
        monitorOnlineStatus();
        
        const userRef = ref(db, `usuarios/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val(); 
            } else {
                // Caso raro: usuário autenticado mas sem registro no DB
                const newUserProfile = {
                    displayName: user.displayName || 'Usuário', 
                    email: user.email,
                    tag: 'Visitante' 
                };
                set(userRef, newUserProfile);
                currentUserData = newUserProfile; 
            }
            
            setUserActivity('Calculadora'); 
            configurarInterfacePorTag(currentUserData.tag);
             
            if(vendasListener) vendasListener(); 
            
            let vendasRef;
            const userTagUpper = currentUserData.tag.toUpperCase();
            
            // Define a query de vendas
            if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
                vendasRef = query(ref(db, 'vendas'), orderByChild('timestamp'));
            } else {
                vendasRef = query(ref(db, 'vendas'), orderByChild('registradoPorId'), equalTo(currentUser.uid));
            }

            // Cria o novo listener de vendas
            vendasListener = onValue(vendasRef, (vendasSnapshot) => {
                let vendas = [];
                vendasSnapshot.forEach((child) => {
                    vendas.push({ id: child.key, ...child.val() });
                });
                
                setVendas(vendas); 
                
                if (els.historyCard.style.display !== 'none') {
                    displaySalesHistory(vendas, currentUser, currentUserData);
                    if (scrollCleanup) scrollCleanup();
                    scrollCleanup = setupHistoryScrollSync();
                }
            }, (error) => {
                console.error("Erro ao carregar vendas: ", error);
                if(error.code !== "PERMISSION_DENIED") {
                    showToast("Erro de permissão ao carregar histórico.", "error");
                }
            });
            
        }, (error) => {
            console.error("Erro ao ler dados do usuário:", error);
            showToast("Erro fatal ao ler permissões do usuário.", "error");
            configurarInterfacePorTag('Visitante'); 
        });

        // Libera a UI principal
        els.authScreen.style.display = 'none';
        toggleView('main');

    } else {
        // --- USUÁRIO DESLOGADO ---
        currentUser = null;
        currentUserData = null;
        if (vendasListener) vendasListener(); 
        setVendas([]); 
        setVendaEmEdicao(null); 
        cleanupScroll(); 
        
        els.authScreen.style.display = 'block';
        els.mainCard.style.display = 'none';
        els.historyCard.style.display = 'none';
        els.adminPanel.style.display = 'none'; 
        els.dossierCard.style.display = 'none';
        if(els.userStatus) els.userStatus.style.display = 'none';
        if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
        
        // Garante que a tela de boas-vindas não reapareça
        localStorage.setItem('hasVisited', 'true');
        els.welcomeScreen.style.display = 'none';
    }
});


// ===============================================
// ATRIBUIÇÃO DE EVENT LISTENERS (GLUE CODE)
// ===============================================

// --- UI Geral ---
els.enterBtn.onclick = () => {
    els.welcomeScreen.classList.add('hidden');
    els.authScreen.style.display = 'block';
    localStorage.setItem('hasVisited', 'true');
    // Espera a transição CSS terminar antes de remover
    setTimeout(() => { els.welcomeScreen.style.display = 'none'; }, 500); 
};
els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = showNextTourStep;
els.logoLink.onclick = (e) => { e.preventDefault(); toggleView('main'); };

// --- Autenticação ---
els.loginBtn.onclick = () => authAction(true);
els.registerUserBtn.onclick = () => authAction(false);
els.logoutBtn.onclick = () => signOut(auth);
els.forgotPasswordLink.onclick = (e) => { e.preventDefault(); resetPassword(); };

// --- Calculadora/Vendas (Módulo: sales.js) ---
els.calcBtn.onclick = () => {
    calculate();
    setUserActivity('Calculando Venda'); 
};
els.resetBtn.onclick = clearAllFields;
els.registerBtn.onclick = () => {
    registerVenda(currentUser, currentUserData);
    setUserActivity('Registrando/Atualizando Venda'); 
};
els.toggleHistoryBtn.onclick = () => {
    setUserActivity('Visualizando Histórico'); 
    toggleView('history');
    displaySalesHistory(null, currentUser, currentUserData); 
};
els.toggleCalcBtn.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); 
};
els.clearHistoryBtn.onclick = () => clearHistory(currentUserData);
els.csvBtn.onclick = exportToCsv;
els.discordBtnCalc.onclick = () => copyDiscordMessage(false, null, currentUserData);
els.filtroHistorico.addEventListener('input', () => filterHistory(currentUser, currentUserData));
els.nomeCliente.addEventListener('change', autoFillFromDossier);

// --- Painel Admin (Módulo: admin.js) ---
els.adminPanelBtn.onclick = () => {
    setUserActivity('Painel Admin'); 
    toggleView('admin');
    cleanupScroll(); 
    loadAdminPanel(true, {uid: currentUser.uid, userData: currentUserData}); 
};
els.toggleCalcBtnAdmin.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); 
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

// --- Dossiê (Módulo: dossier.js) ---
els.investigacaoBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    toggleView('dossier');
    cleanupScroll(); 
    showDossierOrgs(currentUserData); 
};
els.toggleCalcBtnDossier.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); 
};
els.dossierVoltarBtn.onclick = () => {
    setUserActivity('Investigação (Bases)');
    showDossierOrgs(currentUserData);
};
els.filtroDossierOrgs.addEventListener('input', () => filterOrgs(currentUserData));
els.filtroDossierPeople.addEventListener('input', filterPeople);

// Modais Dossiê (Pessoas)
els.addPessoaBtn.onclick = (e) => openAddDossierModal(e.target.dataset.orgName);
els.saveNewDossierBtn.onclick = () => saveNewDossierEntry(currentUserData);
els.cancelNewDossierBtn.onclick = closeAddDossierModal;
els.addDossierOverlay.onclick = closeAddDossierModal;
els.saveDossierBtn.onclick = () => saveDossierChanges(currentUserData);
els.cancelDossierBtn.onclick = closeEditDossierModal;
els.editDossierOverlay.onclick = closeEditDossierModal;

// Modais Dossiê (Organizações)
els.addOrgBtn.onclick = openAddOrgModal;
els.saveOrgBtn.onclick = () => saveOrg(currentUserData);
els.deleteOrgBtn.onclick = () => deleteOrg(currentUserData);
els.cancelOrgBtn.onclick = closeOrgModal;
els.orgModalOverlay.onclick = closeOrgModal;

// Lightbox
els.imageLightboxOverlay.onclick = closeImageLightbox;
els.imageLightboxModal.onclick = closeImageLightbox;

// Handlers de clique (para botões dinâmicos)
document.addEventListener('click', (e) => {
    // Botões de Veículo (Modal Adicionar)
    if (e.target.id === 'addModalAddVeiculoBtn') {
        adicionarOuAtualizarVeiculoTemp('addModal');
    } else if (e.target.id === 'addModalCancelVeiculoBtn') {
        cancelarEdicaoVeiculo('addModal');
    } else if (e.target.matches('#addModalListaVeiculos .edit-veiculo-btn')) {
        iniciarEdicaoVeiculo(e.target.dataset.key, 'addModal');
    } else if (e.target.matches('#addModalListaVeiculos .remove-veiculo-btn')) {
        removerVeiculoTemp(e.target.dataset.key, els.addModalListaVeiculos);
    }
    
    // Botões de Veículo (Modal Editar)
    else if (e.target.id === 'editModalAddVeiculoBtn') {
        adicionarOuAtualizarVeiculoTemp('editModal');
    } else if (e.target.id === 'editModalCancelVeiculoBtn') {
        cancelarEdicaoVeiculo('editModal');
    } else if (e.target.matches('#editModalListaVeiculos .edit-veiculo-btn')) {
        iniciarEdicaoVeiculo(e.target.dataset.key, 'editModal');
    } else if (e.target.matches('#editModalListaVeiculos .remove-veiculo-btn')) {
        removerVeiculoTemp(e.target.dataset.key, els.editModalListaVeiculos);
    }

    // Botões dos Cards (Pessoas)
    else if (e.target.matches('.edit-dossier-btn')) {
        openEditDossierModal(e.target.dataset.org, e.target.dataset.id);
    } else if (e.target.matches('.delete-dossier-btn')) {
        removeDossierEntry(e.target.dataset.org, e.target.dataset.id, currentUserData);
    } else if (e.target.matches('.veiculo-foto-link')) {
        e.preventDefault();
        closeImageLightbox(e.target.dataset.url); // Note: Esta função não usa o argumento, mas chama a global
    }
    
    // Botões dos Cards (Organizações)
    else if (e.target.matches('.dossier-org-card h4') || e.target.matches('.dossier-org-card p')) {
        const orgName = e.target.closest('.dossier-org-card').dataset.orgName;
        if(orgName) {
            setUserActivity(`Investigação (${orgName})`);
            showDossierPeople(orgName, currentUserData);
        }
    } else if (e.target.matches('.edit-org-btn')) {
        openEditOrgModal(e.target.dataset.orgId);
    }
});
