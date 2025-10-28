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
    calculate, registerVenda, editVenda, removeVenda, copyDiscordMessage, 
    displaySalesHistory, filterHistory, exportToCsv, clearHistory, 
    clearAllFields, setVendas, setVendaEmEdicao 
} from './sales.js'; 

import { els } from './dom.js'; 

import { 
    showToast, toggleView, toggleTheme, updateLogoAndThemeButton, 
    showNextTourStep, phoneMask, PREFIX, camposParaCapitalizar 
} from './helpers.js'; 

// --- 4. Estado Global Principal
let currentUser = null;
let currentUserData = null;
let vendasListener = null;
let scrollCleanup = null; // ⭐️ NOVO: Para gerenciar a limpeza do listener de scroll

// --- FUNÇÃO GLOBAL DE ATIVIDADE
const setUserActivity = (activity) => {
    // Verifica se currentUserData está definido para evitar crash
    if (currentUser && currentUserData) {
        updateUserActivity(currentUser, currentUserData, activity);
    }
};

// ⭐️ CORREÇÃO DE ESCOPO: Movida para o topo para garantir que esteja definida antes do onAuthStateChanged
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

  els.clearHistoryBtn.style.display = (tagUpper === 'ADMIN') ? 'inline-block' : 'none';
  els.adminPanelBtn.style.display = (tagUpper === 'ADMIN') ? 'inline-block' : 'none';
  els.investigacaoBtn.style.display = (tagUpper === 'ADMIN' || tagUpper === 'HELLS') ? 'block' : 'none';
  
  // ⭐️ Adicionando Toggle nos Checkboxes Admin (estavam faltando no script.js)
  if(els.layoutToggleNightMode) els.layoutToggleNightMode.disabled = tagUpper !== 'ADMIN';
  if(els.layoutToggleBottomPanel) els.layoutToggleBottomPanel.disabled = tagUpper !== 'ADMIN';
  if(els.bottomPanelText) els.bottomPanelText.disabled = tagUpper !== 'ADMIN';
  if(els.saveBottomPanelTextBtn) els.saveBottomPanelTextBtn.disabled = tagUpper !== 'ADMIN';
  
  if (tagUpper !== 'ADMIN') {
      els.adminPanel.style.display = 'none';
  }
};

// ⭐️ NOVO: Função para Sincronização de Scroll
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
        if (!isScrolling) {
            isScrolling = true;
            target.scrollLeft = source.scrollLeft;
            requestAnimationFrame(() => {
                isScrolling = false;
            });
        }
    };

    const topScrollHandler = () => syncScroll(topBar, scrollContainer);
    const bottomScrollHandler = () => syncScroll(scrollContainer, topBar);

    topBar.addEventListener('scroll', topScrollHandler);
    scrollContainer.addEventListener('scroll', bottomScrollHandler);

    const recalculateWidth = () => {
        if (els.historyCard.style.display !== 'none') {
            const contentWidth = scrollContainer.scrollWidth; 
            // A largura do conteúdo interno da barra de rolagem superior deve ser igual à largura do conteúdo da tabela
            innerContent.style.width = contentWidth + 'px'; 
            // A largura visível da barra de rolagem deve ser igual à largura do wrapper da tabela
            topBar.style.width = scrollContainer.offsetWidth + 'px';
            topBar.scrollLeft = scrollContainer.scrollLeft; // Sincroniza a posição inicial
        }
    };
    
    recalculateWidth();
    
    // 2. Re-sincronização no redimensionamento da janela
    window.addEventListener('resize', recalculateWidth);
    
    // 3. MutationObserver para pegar alterações no DOM (e.g., carregar dados)
    const observer = new MutationObserver(recalculateWidth);
    observer.observe(scrollContainer, { childList: true, subtree: true, attributes: true });

    // Função de limpeza (cleanup)
    return () => {
        window.removeEventListener('resize', recalculateWidth);
        topBar.removeEventListener('scroll', topScrollHandler);
        scrollContainer.removeEventListener('scroll', bottomScrollHandler);
        observer.disconnect();
        topBar.innerHTML = ''; 
    };
};

// Função de limpeza de scroll
const cleanupScroll = () => {
    if (scrollCleanup) {
        scrollCleanup();
        scrollCleanup = null;
    }
};


// ===============================================
// INICIALIZAÇÃO E UI
// ===============================================

// Aplica o tema salvo no localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
}
updateLogoAndThemeButton(savedTheme === 'dark');

// Controla a tela de boas-vindas
if (localStorage.getItem('hasVisited')) {
    els.welcomeScreen.style.display = 'none';
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
      e.target.value = e.target.value; // A lógica de capitalização está no helper
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
// LÓGICA DE AUTENTICAÇÃO
// ===============================================

// Funções handleAuthAction, authAction, resetPassword (Conteúdo do arquivo original, mas não essencial para a correção do erro)
const handleAuthAction = async (isLogin, creds) => {
    const { username: email, password } = creds;
    els.authMessage.textContent = '';
    
    if (!email || !password) {
        els.authMessage.textContent = 'Preencha todos os campos.';
        return;
    }

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
            showToast("Login realizado com sucesso!", "success");
        } else {
            // Lógica de cadastro (cria user com email/senha e atualiza o display name)
            const emailFromUsername = `${email.toLowerCase().replace(/[^a-z0-9]/g, '')}@hells.com`;
            const userCredential = await createUserWithEmailAndPassword(auth, emailFromUsername, password);
            await updateProfile(userCredential.user, { displayName: email });
            showToast("Usuário cadastrado com sucesso! Use o botão Entrar.", "success");
            els.username.value = '';
            els.password.value = '';
        }
    } catch (error) {
        console.error("Erro de Autenticação:", error.code, error.message);
        let msg = "Erro desconhecido.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            msg = "Credenciais inválidas.";
        } else if (error.code === 'auth/weak-password') {
            msg = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.code === 'auth/email-already-in-use') {
            msg = "Este nome de usuário já está em uso.";
        } else if (error.code === 'auth/configuration-not-found') {
             msg = "Erro: Firebase: Error (auth/configuration-not-found). Verifique suas chaves no firebase.js.";
        }
        els.authMessage.textContent = msg;
        showToast(msg, "error");
    }
};

const authAction = (isLogin) => {
    const username = els.username.value.trim();
    const password = els.password.value;
    
    // A lógica de cadastro usa um email fictício com o username, vamos replicar isso
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@hells.com`;

    handleAuthAction(isLogin, { username: email, password: password });
};

const resetPassword = async () => {
    const username = els.username.value.trim();
    if (!username) {
        els.authMessage.textContent = 'Preencha o Nome de Usuário para solicitar a recuperação.';
        return;
    }
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@hells.com`;

    try {
        await sendPasswordResetEmail(auth, email);
        els.authMessage.textContent = `Email de recuperação enviado para ${email}. Verifique sua caixa de entrada.`;
        showToast("Email de recuperação enviado.", "default", 5000);
    } catch (error) {
        console.error("Erro ao enviar reset:", error.code, error.message);
        els.authMessage.textContent = "Erro ao enviar email. O usuário pode não existir ou o email pode ser inválido.";
        showToast("Erro ao enviar email de recuperação.", "error");
    }
};


// ===============================================
// LISTENER PRINCIPAL DE AUTENTICAÇÃO (O CORAÇÃO)
// ===============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- USUÁRIO LOGADO ---
        currentUser = user; 
        
        // Inicia o rastreamento de atividade
        monitorOnlineStatus();
        
        const userRef = ref(db, `usuarios/${user.uid}`);
        
        onValue(userRef, (snapshot) => {
            // 1. Define os dados do usuário
            if (snapshot.exists()) {
                currentUserData = snapshot.val(); 
            } else {
                const newUserProfile = {
                    displayName: user.displayName, 
                    email: user.email,
                    tag: 'Visitante' 
                };
                set(userRef, newUserProfile);
                currentUserData = newUserProfile; 
            }
            
            // 1a. Atualiza atividade com dados completos
            setUserActivity('Calculadora'); 
            
            // 2. Configura a UI baseada na TAG
            // ⭐️ CONFIGURAR AQUI ESTAVA CAUSANDO A REFERENCE ERROR
            configurarInterfacePorTag(currentUserData.tag);
             
            // 3. Remove listener de vendas antigo (se houver)
            if(vendasListener) vendasListener(); 
            
            // 4. Define a query de vendas baseada na TAG
            let vendasRef;
            const userTagUpper = currentUserData.tag.toUpperCase();
            if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
                vendasRef = query(ref(db, 'vendas'), orderByChild('timestamp')); // ⭐️ ORDENADO PARA EVITAR ERRO DE INDEX
            } else {
                vendasRef = query(ref(db, 'vendas'), orderByChild('registradoPorId'), equalTo(currentUser.uid));
            }

            // 5. Cria o novo listener de vendas
            vendasListener = onValue(vendasRef, (vendasSnapshot) => {
                let vendas = [];
                vendasSnapshot.forEach((child) => {
                    vendas.push({ id: child.key, ...child.val() });
                });
                
                // Atualiza o módulo de Vendas com os novos dados
                setVendas(vendas); 
                
                // Se a tela de histórico estiver aberta, atualiza ela
                if (els.historyCard.style.display !== 'none') {
                    displaySalesHistory(vendas, currentUser, currentUserData);
                    
                    // ⭐️ NOVO: Re-sincroniza após o carregamento da tabela
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

        // 6. Libera a UI principal
        els.authScreen.style.display = 'none';
        toggleView('main');

    } else {
        // --- USUÁRIO DESLOGADO ---
        currentUser = null;
        currentUserData = null;
        if (vendasListener) vendasListener(); 
        setVendas([]); // Limpa as vendas no módulo
        setVendaEmEdicao(null); // Reseta a edição
        cleanupScroll(); // Limpa o scroll
        
        els.authScreen.style.display = 'block';
        els.mainCard.style.display = 'none';
        els.historyCard.style.display = 'none';
        els.adminPanel.style.display = 'none'; 
        els.dossierCard.style.display = 'none';
        if(els.userStatus) els.userStatus.style.display = 'none';
        if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
    }
});


// ===============================================
// ATRIBUIÇÃO DE EVENT LISTENERS (GLUE CODE)
// ===============================================

// --- UI Geral
els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = showNextTourStep;
els.enterBtn.onclick = () => {
    localStorage.setItem('hasVisited', 'true');
    els.welcomeScreen.classList.remove('show');
    els.welcomeScreen.classList.add('hidden');
    setTimeout(() => { els.welcomeScreen.style.display = 'none'; }, 500);
    
    // Mostra o AuthScreen se não estiver logado
    if (!currentUser) {
        els.authScreen.style.display = 'block';
    } else {
        toggleView('main');
    }
};

// --- Autenticação
els.loginBtn.onclick = () => authAction(true);
els.registerUserBtn.onclick = () => authAction(false);
els.logoutBtn.onclick = () => { 
    signOut(auth).then(() => showToast("Deslogado com sucesso!", "default")); 
};
els.forgotPasswordLink.onclick = (e) => {
    e.preventDefault();
    resetPassword();
};

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
    // A sincronização de scroll é ativada no onValue listener
};
els.toggleCalcBtn.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // ⭐️ Limpa o scroll ao sair
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

// --- Dossiê (Módulo: dossier.js) ---
els.investigacaoBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    toggleView('dossier');
    cleanupScroll(); // ⭐️ Limpa o scroll
    showDossierOrgs(currentUserData); 
};
els.toggleCalcBtnDossier.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // ⭐️ Limpa o scroll
};

// Nível 1: Bases (Organizações)
if (els.dossierOrgGrid) {
    els.dossierOrgGrid.addEventListener('click', (e) => {
        if (e.target.closest('.dossier-org-card')) {
            const orgName = e.target.closest('.dossier-org-card').dataset.orgName;
            if (orgName) {
                setUserActivity(`Investigação (${orgName})`);
                showDossierPeople(orgName, currentUserData);
            }
        } else if (e.target.classList.contains('edit-org-btn')) {
             openEditOrgModal(e.target.dataset.orgId);
        }
    });
}

// Nível 2: Pessoas (Membros)
els.dossierVoltarBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    showDossierOrgs(currentUserData);
};
els.filtroDossierOrgs.addEventListener('input', () => filterOrgs(currentUserData));
els.filtroDossierPeople.addEventListener('input', filterPeople);
els.addOrgBtn.onclick = openAddOrgModal;
els.addPessoaBtn.onclick = (e) => openAddDossierModal(e.target.dataset.orgName);

if (els.dossierPeopleGrid) {
    els.dossierPeopleGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-dossier-btn')) {
            const { org, id } = e.target.dataset;
            openEditDossierModal(org, id);
        } else if (e.target.classList.contains('delete-dossier-btn')) {
            const { org, id } = e.target.dataset;
            removeDossierEntry(org, id, currentUserData);
        } else if (e.target.classList.contains('veiculo-foto-link')) {
             e.preventDefault();
             showImageLightbox(e.target.dataset.url);
        }
    });
}
if (els.imageLightboxOverlay) els.imageLightboxOverlay.onclick = closeImageLightbox;
if (els.imageLightboxModal) els.imageLightboxModal.onclick = closeImageLightbox; 

// Modais Dossiê (Pessoa)
els.saveNewDossierBtn.onclick = () => saveNewDossierEntry(currentUserData);
els.cancelNewDossierBtn.onclick = closeAddDossierModal;
els.saveDossierBtn.onclick = () => saveDossierChanges(currentUserData);
els.cancelDossierBtn.onclick = closeEditDossierModal;

// Modais Dossiê (Organização)
els.saveOrgBtn.onclick = () => saveOrg(currentUserData);
els.cancelOrgBtn.onclick = closeOrgModal;
els.deleteOrgBtn.onclick = () => deleteOrg(currentUserData);

// Modais Veículos (ADD)
if (els.addModalAddVeiculoBtn) {
    els.addModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('addModal');
}
if (els.addModalCancelVeiculoBtn) {
    els.addModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('addModal');
}
if (els.addModalListaVeiculos) {
    els.addModalListaVeiculos.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-veiculo-btn')) {
            iniciarEdicaoVeiculo(e.target.dataset.key, 'addModal');
        } else if (e.target.classList.contains('remove-veiculo-btn')) {
            removerVeiculoTemp(e.target.dataset.key, els.addModalListaVeiculos);
        }
    });
}

// Modais Veículos (EDIT)
if (els.editModalAddVeiculoBtn) {
    els.editModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('editModal');
}
if (els.editModalCancelVeiculoBtn) {
    els.editModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('editModal');
}
if (els.editModalListaVeiculos) {
    els.editModalListaVeiculos.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-veiculo-btn')) {
            iniciarEdicaoVeiculo(e.target.dataset.key, 'editModal');
        } else if (e.target.classList.contains('remove-veiculo-btn')) {
            removerVeiculoTemp(e.target.dataset.key, els.editModalListaVeiculos);
        }
    });
}
