/* ===============================================
  SCRIPT.JS (O ORQUESTRADOR)
  Gerencia o estado (auth) e conecta os 
  eventos da UI (els) às funções (modules).
  
  VERSÃO SEM PASTAS (Nomes: helpers.js, sales.js)
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
} from './dossier.js'; // <-- Nome do seu arquivo

import { 
    calculate, registerVenda, editVenda, removeVenda, copyDiscordMessage, 
    displaySalesHistory, filterHistory, exportToCsv, clearHistory, 
    clearAllFields, setVendas, setVendaEmEdicao,
    loadSalesHistory, historyFullyLoaded // <-- Imports para paginação
} from './sales.js'; // <-- Nome do seu arquivo

import { els } from './dom.js'; 

import { 
    showToast, toggleView, toggleTheme, updateLogoAndThemeButton, 
    showNextTourStep, phoneMask, PREFIX, camposParaCapitalizar 
} from './helpers.js'; // <-- Nome do seu arquivo

// --- 4. Estado Global Principal
let currentUser = null;
let currentUserData = null;
// let vendasListener = null; // <-- REMOVIDO: Não vamos mais ouvir em tempo real

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
  
  if (tagUpper !== 'ADMIN') {
      els.adminPanel.style.display = 'none';
  }
};

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

const resetPassword = async () => {
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
            updateUserActivity(currentUser, currentUserData); 
            
            // 2. Configura a UI baseada na TAG
            configurarInterfacePorTag(currentUserData.tag);
             
            // 3. REMOVIDO: O listener de vendas em tempo real
            // if(vendasListener) vendasListener(); 
            
            // 4. REMOVIDO: A query de vendas
            
            // 5. REMOVIDO: O listener de vendas onValue
            
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
        // if (vendasListener) vendasListener(); // REMOVIDO
        setVendas([]); // Limpa as vendas no módulo
        setVendaEmEdicao(null); // Reseta a edição
        
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
els.enterBtn.onclick = () => {
    localStorage.setItem('hasVisited', 'true');
    els.welcomeScreen.classList.add('hidden');
    setTimeout(() => {
        els.welcomeScreen.style.display = 'none';
    }, 500);
};
els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = () => { 
    if (!currentUser) { 
        showToast("Faça login para iniciar o tutorial.", "default"); 
        return; 
    } 
    toggleView('main'); 
    showNextTourStep(); 
};

// --- Autenticação ---
els.loginBtn.onclick = () => authAction(true);
els.registerUserBtn.onclick = () => authAction(false);
els.logoutBtn.onclick = () => signOut(auth);
els.password.addEventListener('keydown', (e) => { if(e.key === 'Enter') authAction(true); });
els.forgotPasswordLink.onclick = resetPassword;

// --- Calculadora/Vendas (Módulo: sales.js) ---
els.calcBtn.onclick = calculate;
els.resetBtn.onclick = clearAllFields;
els.registerBtn.onclick = () => registerVenda(currentUser, currentUserData);

// ATUALIZADO: toggleHistoryBtn agora chama a função de carregamento
els.toggleHistoryBtn.onclick = () => {
    toggleView('history');
    // Chama a nova função de carregamento (true = carga inicial)
    loadSalesHistory(true, currentUser, currentUserData); 
};
els.toggleCalcBtn.onclick = () => toggleView('main');
els.clearHistoryBtn.onclick = () => clearHistory(currentUserData);
els.csvBtn.onclick = exportToCsv;
els.discordBtnCalc.onclick = () => copyDiscordMessage(false, null, currentUserData);

// ATUALIZADO: filtroHistorico agora esconde o botão "Carregar Mais"
els.filtroHistorico.addEventListener('input', () => {
    filterHistory(currentUser, currentUserData);
    
    const query = els.filtroHistorico.value.trim();
    if (query) {
        els.historyLoadMoreContainer.style.display = 'none'; // Esconde se estiver filtrando
    } else if (!historyFullyLoaded) { // 'historyFullyLoaded' é importado de sales.js
        els.historyLoadMoreContainer.style.display = 'flex'; // Mostra se não estiver filtrando e não tiver carregado tudo
    }
});

// ADICIONADO: Listener para o novo botão
els.loadMoreHistoryBtn.onclick = () => {
    loadSalesHistory(false, currentUser, currentUserData); // false = não é carga inicial
};

els.nomeCliente.addEventListener('change', autoFillFromDossier); // Módulo Dossie

// --- Painel Admin (Módulo: admin.js) ---
els.adminPanelBtn.onclick = () => {
    toggleView('admin');
    loadAdminPanel(true, currentUser); // Força atualização ao abrir
};
els.toggleCalcBtnAdmin.onclick = () => toggleView('main');
els.saveBottomPanelTextBtn.onclick = () => {
    const newText = els.bottomPanelText.value.trim();
    updateGlobalLayout('bottomPanelText', newText);
    showToast("Mensagem do rodapé salva!", "success");
};
els.layoutToggleNightMode.onchange = (e) => updateGlobalLayout('enableNightMode', e.target.checked);
els.layoutToggleBottomPanel.onchange = (e) => updateGlobalLayout('enableBottomPanel', e.target.checked);
els.migrateDossierBtn.onclick = migrateVendasToDossier;
els.migrateVeiculosBtn.onclick = migrateVeiculosData;

// --- Dossiê (Módulo: dossier.js) ---
els.investigacaoBtn.onclick = () => {
    toggleView('dossier');
    showDossierOrgs(currentUserData); // Passa os dados do usuário para o sortable
};
els.toggleCalcBtnDossier.onclick = () => toggleView('main');

// Dossiê Nível 1: Organizações
els.filtroDossierOrgs.addEventListener('input', () => filterOrgs(currentUserData));
els.addOrgBtn.onclick = openAddOrgModal;
els.dossierOrgGrid.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-dossier-btn');
    const deleteBtn = e.target.closest('.delete-dossier-btn');
    const fotoLinkBtn = e.target.closest('.veiculo-foto-link');
    const editOrgBtn = e.target.closest('.edit-org-btn');
    const card = e.target.closest('.dossier-org-card');

    if (fotoLinkBtn) {
        e.preventDefault();
        showImageLightbox(fotoLinkBtn.dataset.url);
    }
    if (deleteBtn) {
        removeDossierEntry(deleteBtn.dataset.org, deleteBtn.dataset.id, currentUserData);
    }
    if (editBtn) {
        openEditDossierModal(editBtn.dataset.org, editBtn.dataset.id);
    }
    if (editOrgBtn) {
        e.stopPropagation();
        openEditOrgModal(editOrgBtn.dataset.orgId);
    }
    if (card && !editOrgBtn && !e.target.closest('a')) { // Se clicar no card, mas não no botão de editar ou link
        showDossierPeople(card.dataset.orgName, currentUserData);
    }
});

// Dossiê Nível 2: Pessoas
els.dossierVoltarBtn.onclick = () => showDossierOrgs(currentUserData); // Passa currentUserData
els.filtroDossierPeople.addEventListener('input', filterPeople);
els.addPessoaBtn.onclick = () => {
    const orgName = els.addPessoaBtn.dataset.orgName;
    if(orgName) { openAddDossierModal(orgName); }
};
els.dossierPeopleGrid.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-dossier-btn');
    const deleteBtn = e.target.closest('.delete-dossier-btn');
    const fotoLinkBtn = e.target.closest('.veiculo-foto-link'); 
    
    if (fotoLinkBtn) {
        e.preventDefault(); 
        showImageLightbox(fotoLinkBtn.dataset.url);
    }
    if (deleteBtn) {
        removeDossierEntry(deleteBtn.dataset.org, deleteBtn.dataset.id, currentUserData);
    }
    if (editBtn) {
        openEditDossierModal(editBtn.dataset.org, editBtn.dataset.id);
    }
});

// Dossiê: Modais de Pessoa (Salvar/Cancelar)
els.saveDossierBtn.onclick = () => saveDossierChanges(currentUserData);
els.cancelDossierBtn.onclick = closeEditDossierModal;
els.editDossierOverlay.onclick = closeEditDossierModal;
els.saveNewDossierBtn.onclick = () => saveNewDossierEntry(currentUserData);
els.cancelNewDossierBtn.onclick = closeAddDossierModal;
els.addDossierOverlay.onclick = closeAddDossierModal;

// Dossiê: Modais de Organização (Salvar/Cancelar)
els.saveOrgBtn.onclick = () => saveOrg(currentUserData);
els.deleteOrgBtn.onclick = () => deleteOrg(currentUserData);
els.cancelOrgBtn.onclick = closeOrgModal;
els.orgModalOverlay.onclick = closeOrgModal;

// Dossiê: Lightbox
els.imageLightboxOverlay.onclick = closeImageLightbox;

// Dossiê: Sub-Modais de Veículos
els.addModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('addModal');
els.editModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('editModal');
els.addModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('addModal');
els.editModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('editModal');
els.addModalListaVeiculos.onclick = (e) => {
    const removeBtn = e.target.closest('.remove-veiculo-btn');
    const editBtn = e.target.closest('.edit-veiculo-btn');
    if (removeBtn) removerVeiculoTemp(removeBtn.dataset.key, els.addModalListaVeiculos);
    if (editBtn) iniciarEdicaoVeiculo(editBtn.dataset.key, 'addModal');
};
els.editModalListaVeiculos.onclick = (e) => {
    const removeBtn = e.target.closest('.remove-veiculo-btn');
    const editBtn = e.target.closest('.edit-veiculo-btn');
    if (removeBtn) removerVeiculoTemp(removeBtn.dataset.key, els.editModalListaVeiculos);
    if (editBtn) iniciarEdicaoVeiculo(editBtn.dataset.key, 'editModal');
};
