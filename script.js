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
    showNextTourStep, phoneMask, PREFIX, camposParaCapitalizar,
    capitalizeText // ⭐️ CORREÇÃO: Importar capitalizeText
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

// ⭐️ CORREÇÃO: Aplica capitalização automática
camposParaCapitalizar.forEach(campo => {
  if (campo) {
    // Mudar de 'input' para 'change' (dispara ao sair do campo)
    campo.addEventListener('change', (e) => {
      // Chama a função de capitalização
      e.target.value = capitalizeText(e.target.value); 
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

// ⭐️ CORREÇÃO: Funções de autenticação (placeholders)
// (Adapte esta lógica se você já a tiver em outro lugar)
const handleAuthAction = async (isLogin, creds) => {
    const { username, password } = creds;
    const email = `${username.toLowerCase().trim()}@hells.com`; // Exemplo de formatação de e-mail
    els.authMessage.textContent = '';
    
    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
            showToast(`Bem-vindo(a) de volta, ${username}!`, 'success');
        } else {
            // Registro
            if (username.length < 3) {
                 els.authMessage.textContent = 'Nome de usuário deve ter pelo menos 3 caracteres.';
                 return;
            }
            if (password.length < 6) {
                 els.authMessage.textContent = 'Senha deve ter pelo menos 6 caracteres.';
                 return;
            }
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: username });
            
            // Salva no DB
            const userRef = ref(db, `usuarios/${userCredential.user.uid}`);
            await set(userRef, {
                displayName: username,
                email: email,
                tag: 'Visitante' // Tag padrão
            });
            showToast('Cadastro realizado com sucesso!', 'success');
        }
    } catch (error) {
        console.error("Erro de autenticação:", error.code, error.message);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            els.authMessage.textContent = 'Usuário ou senha inválidos.';
        } else if (error.code === 'auth/email-already-in-use') {
            els.authMessage.textContent = 'Este nome de usuário já está cadastrado.';
        } else if (error.code === 'auth/invalid-email') {
             els.authMessage.textContent = 'Nome de usuário inválido (não pode conter espaços ou caracteres especiais).';
        } else {
            els.authMessage.textContent = 'Erro ao tentar autenticar.';
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
    const username = els.username.value.trim();
    if (!username) {
        els.authMessage.textContent = 'Digite seu nome de usuário para redefinir a senha.';
        return;
    }
    const email = `${username.toLowerCase()}@hells.com`;
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('E-mail de redefinição de senha enviado!', 'success');
        els.authMessage.textContent = `Um link para redefinir sua senha foi enviado para o e-mail associado a "${username}".`;
    } catch (error) {
        console.error("Erro ao redefinir senha:", error.code);
         if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
             els.authMessage.textContent = 'Usuário não encontrado.';
         } else {
             els.authMessage.textContent = 'Erro ao enviar e-mail de redefinição.';
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

// --- UI Geral ---
els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = showNextTourStep;
els.logoLink.onclick = (e) => { e.preventDefault(); toggleView('main'); };
els.enterBtn.onclick = () => {
    els.welcomeScreen.classList.add('hidden');
    localStorage.setItem('hasVisited', 'true');
    setTimeout(() => {
        els.welcomeScreen.style.display = 'none';
    }, 500);
};
els.logoutBtn.onclick = () => signOut(auth);

// --- ⭐️ CORREÇÃO: Listeners de Autenticação ---
els.loginBtn.onclick = () => authAction(true);
els.registerUserBtn.onclick = () => authAction(false);
els.forgotPasswordLink.onclick = resetPassword;

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
    // ⭐️ CORREÇÃO: Passar currentUserData
    loadAdminPanel(true, currentUser, currentUserData); 
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
els.dossierVoltarBtn.onclick = () => {
     setUserActivity('Investigação (Bases)'); 
     showDossierOrgs(currentUserData);
};
els.addOrgBtn.onclick = openAddOrgModal;
els.addPessoaBtn.onclick = (e) => {
    const orgName = e.target.dataset.orgName;
    if(orgName) openAddDossierModal(orgName);
};

// --- ⭐️ CORREÇÃO: Listener do Filtro do Dossiê ---
els.filtroDossierOrgs.addEventListener('input', () => {
    filterOrgs(currentUserData); // Passar currentUserData
});
els.filtroDossierPeople.addEventListener('input', filterPeople);

// Listeners de Evento (Delegação)
document.body.addEventListener('click', (e) => {
    // Modais Dossiê
    if (e.target.classList.contains('edit-org-btn')) {
        openEditOrgModal(e.target.dataset.orgId);
    }
    if (e.target.classList.contains('edit-dossier-btn')) {
        openEditDossierModal(e.target.dataset.org, e.target.dataset.id);
    }
    if (e.target.classList.contains('delete-dossier-btn')) {
        removeDossierEntry(e.target.dataset.org, e.target.dataset.id, currentUserData);
    }
    if (e.target.id === 'cancelDossierBtn' || e.target.id === 'editDossierOverlay') {
        closeEditDossierModal();
    }
    if (e.target.id === 'cancelNewDossierBtn' || e.target.id === 'addDossierOverlay') {
        closeAddDossierModal();
    }
    if (e.target.id === 'cancelOrgBtn' || e.target.id === 'orgModalOverlay') {
        closeOrgModal();
    }
    if (e.target.id === 'imageLightboxOverlay' || e.target.id === 'imageLightboxModal') {
        closeImageLightbox();
    }
    if (e.target.classList.contains('veiculo-foto-link')) {
        e.preventDefault();
        showImageLightbox(e.target.dataset.url);
    }
    
    // Gerenciador de Veículos (Modal de Edição)
    if (e.target.id === 'editModalAddVeiculoBtn') {
        adicionarOuAtualizarVeiculoTemp('editModal');
    }
    if (e.target.id === 'editModalCancelVeiculoBtn') {
        cancelarEdicaoVeiculo('editModal');
    }
    if (e.target.classList.contains('edit-veiculo-btn') && e.closest('#editModalListaVeiculos')) {
        iniciarEdicaoVeiculo(e.target.dataset.key, 'editModal');
    }
    if (e.target.classList.contains('remove-veiculo-btn') && e.closest('#editModalListaVeiculos')) {
        removerVeiculoTemp(e.target.dataset.key, els.editModalListaVeiculos);
    }

    // Gerenciador de Veículos (Modal de Adição)
    if (e.target.id === 'addModalAddVeiculoBtn') {
        adicionarOuAtualizarVeiculoTemp('addModal');
    }
    if (e.target.id === 'addModalCancelVeiculoBtn') {
        cancelarEdicaoVeiculo('addModal');
    }
    if (e.target.classList.contains('edit-veiculo-btn') && e.closest('#addModalListaVeiculos')) {
        iniciarEdicaoVeiculo(e.target.dataset.key, 'addModal');
    }
    if (e.target.classList.contains('remove-veiculo-btn') && e.closest('#addModalListaVeiculos')) {
        removerVeiculoTemp(e.target.dataset.key, els.addModalListaVeiculos);
    }
    
    // Botões de Salvar Modais
    if (e.target.id === 'saveDossierBtn') {
        saveDossierChanges(currentUserData);
    }
    if (e.target.id === 'saveNewDossierBtn') {
        saveNewDossierEntry(currentUserData);
    }
    if (e.target.id === 'saveOrgBtn') {
        saveOrg(currentUserData);
    }
    if (e.target.id === 'deleteOrgBtn') {
        deleteOrg(currentUserData);
    }

    // Clique na Base (Organização)
    if (e.target.closest('.dossier-org-card')) {
        // Assegura que o clique não foi num botão ou link
        if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.drag-handle-icon')) {
             const card = e.target.closest('.dossier-org-card');
             const orgName = card.dataset.orgName;
             if(orgName) {
                setUserActivity(`Investigação (Membros ${orgName})`); 
                showDossierPeople(orgName, currentUserData);
             }
        }
    }
});
