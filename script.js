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

import { els } from './dom.js';
import { 
    logoLightModeSrc, logoDarkModeSrc, welcomeLogoSrc, 
    historyBackgroundSrc 
} from './constantes.js';

import { 
    loadAdminPanel, updateUserActivity, monitorOnlineStatus, 
    updateGlobalLayout, migrateVendasToDossier, migrateVeiculosData,
    monitorGlobalLayout, monitorMigrationStatus
} from './admin.js'; 

import { 
    autoFillFromDossier, showDossierOrgs, filterOrgs, openAddOrgModal, 
    showDossierPeople, filterPeople, openAddDossierModal, removeDossierEntry, 
    openEditDossierModal, saveDossierChanges, closeEditDossierModal, 
    saveNewDossierEntry, closeAddDossierModal, saveOrg, deleteOrg, closeOrgModal, 
    closeImageLightbox, openEditOrgModal,
    adicionarOuAtualizarVeiculoTemp, cancelarEdicaoVeiculo, 
    removerVeiculoTemp, iniciarEdicaoVeiculo, showImageLightbox
} from './dossier.js'; 

import { 
    calculate, registerVenda, clearAllFields, editVenda, removeVenda,
    copyDiscordMessage, displaySalesHistory, filterHistory, exportToCsv, 
    clearHistory, setVendas, setVendaEmEdicao, setVendaOriginal,
    cancelEditAndClearFields // <-- NOVO
} from './sales.js';

import { 
    showToast, toggleView, toggleTheme, updateLogoAndThemeButton, 
    showNextTourStep, clearTour, phoneMask, PREFIX, camposTelefone, 
    camposParaCapitalizar, capitalizeText, atualizarRelogio
} from './helpers.js';

// --- 2. Estado Global do Aplicativo
let vendas = [];
let currentUser = null;
let currentUserData = null; 
let vendasListener = null; 
let currentActivity = 'Calculadora';
let isSyncingScroll = false; 

// --- 3. Lógica de Autenticação
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

const handleForgotPassword = async () => {
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

// --- 4. Lógica de UI e Permissões
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
  if (tagUpper !== 'ADMIN') els.adminPanel.style.display = 'none';
};

const setUserActivity = (activity) => {
    currentActivity = activity;
    updateUserActivity(currentUser, currentUserData, currentActivity);
};

// --- Lógica de Sincronização de Rolagem ---
const initScrollSync = () => {
    const topScroll = els.topScrollbarContainer;
    const bottomScroll = els.historyTableWrapper;
    const topContent = els.topScrollbarContent;
    const table = els.historicoVendas;

    if (!topScroll || !bottomScroll || !topContent || !table) {
        return;
    }
    
    // Define a largura do conteúdo da barra superior
    // Adiciona um pequeno buffer (1px) para garantir que funcione em todos os browsers
    topContent.style.width = (table.scrollWidth + 1) + 'px';

    topScroll.onscroll = null;
    bottomScroll.onscroll = null;

    topScroll.onscroll = () => {
        if (isSyncingScroll) {
            isSyncingScroll = false;
            return;
        }
        isSyncingScroll = true;
        bottomScroll.scrollLeft = topScroll.scrollLeft;
    };

    bottomScroll.onscroll = () => {
        if (isSyncingScroll) {
            isSyncingScroll = false;
            return;
        }
        isSyncingScroll = true;
        topScroll.scrollLeft = bottomScroll.scrollLeft;
        
        // Atualiza a largura
        topContent.style.width = (table.scrollWidth + 1) + 'px';
    };
};


// --- 5. O PONTO DE ENTRADA PRINCIPAL (onAuthStateChanged)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; 
        
        const activityInterval = setInterval(() => updateUserActivity(currentUser, currentUserData, currentActivity), 30000);
        monitorOnlineStatus(currentUser); 
        monitorGlobalLayout();
        monitorMigrationStatus();
        
        const userRef = ref(db, `usuarios/${user.uid}`);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val(); 
            } else {
                const newUserProfile = { displayName: user.displayName, email: user.email, tag: 'Visitante' };
                set(userRef, newUserProfile);
                currentUserData = newUserProfile; 
            }
            
            configurarInterfacePorTag(currentUserData.tag);
            updateUserActivity(currentUser, currentUserData, currentActivity); 
             
            if(vendasListener) vendasListener(); 
            
            let vendasRef;
            const userTagUpper = currentUserData.tag.toUpperCase();
            
            if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
                vendasRef = ref(db, 'vendas');
            } else {
                vendasRef = query(ref(db, 'vendas'), orderByChild('registradoPorId'), equalTo(currentUser.uid));
            }

            vendasListener = onValue(vendasRef, (vendasSnapshot) => {
                vendas = [];
                vendasSnapshot.forEach((child) => {
                    vendas.push({ id: child.key, ...child.val() });
                });
                setVendas(vendas); 
                
                // ATUALIZAÇÃO AUTOMÁTICA DE LOCK
                // Se o histórico estiver visível, ele será redesenhado
                // mostrando o status de "Bloqueado" em tempo real
                if (els.historyCard.style.display !== 'none') {
                    displaySalesHistory(vendas, currentUser, currentUserData, initScrollSync);
                }
            }, (error) => {
                if(error.code !== "PERMISSION_DENIED") showToast("Erro de permissão ao carregar histórico.", "error");
            });
        }, (error) => {
            showToast("Erro fatal ao ler permissões do usuário.", "error");
            configurarInterfacePorTag('Visitante'); 
        });

        els.authScreen.style.display = 'none';
        toggleView('main');

    } else {
        // --- Logout ---
        currentUser = null;
        currentUserData = null;
        if (vendasListener) vendasListener(); 
        vendas = []; 
        setVendas(vendas);
        
        els.authScreen.style.display = 'block';
        els.mainCard.style.display = 'none';
        els.historyCard.style.display = 'none';
        els.adminPanel.style.display = 'none'; 
        els.dossierCard.style.display = 'none';
        if(els.userStatus) els.userStatus.style.display = 'none';
        if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
    }
});

// --- 6. Inicialização da UI e Event Listeners

// --- Helpers (Máscaras e Capitalização)
camposTelefone.forEach(campo => {
    if (campo) {
        campo.addEventListener('input', (e) => { e.target.value = e.target.value.length < PREFIX.length ? PREFIX : phoneMask(e.target.value); });
        campo.addEventListener('focus', (e) => { if (!e.target.value || e.target.value.length < PREFIX.length) { e.target.value = PREFIX; } });
    }
});
camposParaCapitalizar.forEach(campo => {
  if (campo) {
    campo.addEventListener('input', (e) => {
      const { selectionStart, selectionEnd } = e.target;
      e.target.value = capitalizeText(e.target.value);
      e.target.setSelectionRange(selectionStart, selectionEnd);
    });
  }
});
atualizarRelogio();
setInterval(atualizarRelogio, 30000);

// --- Autenticação
els.loginBtn.onclick = () => authAction(true);
els.registerUserBtn.onclick = () => authAction(false);
els.logoutBtn.onclick = () => signOut(auth);
els.password.addEventListener('keydown', (e) => { if(e.key === 'Enter') authAction(true); });
els.forgotPasswordLink.onclick = handleForgotPassword;

// --- Navegação e Controles
els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = () => { if (!currentUser) { showToast("Faça login para iniciar o tutorial.", "default"); return; } setUserActivity('Tutorial'); toggleView('main'); showNextTourStep(); };
els.logoLink.onclick = (e) => { e.preventDefault(); if (currentUser) { setUserActivity('Calculadora'); toggleView('main'); }};

// --- Calculadora (Módulo: sales.js)
els.calcBtn.onclick = calculate;
// ALTERADO: Usa a nova função para limpar o lock do Firebase ao cancelar
els.resetBtn.onclick = cancelEditAndClearFields; 
els.registerBtn.onclick = () => { setUserActivity('Registrando Venda'); registerVenda(currentUser); };
els.discordBtnCalc.onclick = () => copyDiscordMessage(false, null);
els.nomeCliente.addEventListener('change', () => autoFillFromDossier(!!els.registerBtn.textContent.includes('Atualizar')));

// --- Histórico (Módulo: sales.js)
els.toggleHistoryBtn.onclick = () => { 
    setUserActivity('Histórico'); 
    toggleView('history'); 
    displaySalesHistory(vendas, currentUser, currentUserData, initScrollSync); 
};
els.toggleCalcBtn.onclick = () => { setUserActivity('Calculadora'); toggleView('main'); };
els.clearHistoryBtn.onclick = () => clearHistory(currentUserData);
els.csvBtn.onclick = exportToCsv;
els.filtroHistorico.addEventListener('input', () => filterHistory(currentUser, currentUserData, initScrollSync));

// --- Painel Admin (Módulo: admin.js)
els.adminPanelBtn.onclick = () => { setUserActivity('Painel Admin'); toggleView('admin'); loadAdminPanel(true, currentUser); };
els.toggleCalcBtnAdmin.onclick = () => { setUserActivity('Calculadora'); toggleView('main'); };
els.saveBottomPanelTextBtn.onclick = () => { const newText = els.bottomPanelText.value.trim(); updateGlobalLayout('bottomPanelText', newText); showToast("Mensagem do rodapé salva!", "success"); setUserActivity('Painel Admin (Salvando Configs)'); };
els.layoutToggleNightMode.onchange = (e) => updateGlobalLayout('enableNightMode', e.target.checked);
els.layoutToggleBottomPanel.onchange = (e) => updateGlobalLayout('enableBottomPanel', e.target.checked);
els.migrateDossierBtn.onclick = migrateVendasToDossier;
els.migrateVeiculosBtn.onclick = migrateVeiculosData;

// --- Dossiê (Módulo: dossier.js)
els.investigacaoBtn.onclick = () => { setUserActivity('Investigação (Bases)'); toggleView('dossier'); showDossierOrgs(currentUserData); };
els.toggleCalcBtnDossier.onclick = () => { setUserActivity('Calculadora'); toggleView('main'); };

// Nível 1 (Orgs)
els.filtroDossierOrgs.addEventListener('input', () => filterOrgs(currentUserData));
els.addOrgBtn.onclick = openAddOrgModal;
els.dossierOrgGrid.addEventListener('click', (e) => {
    const orgCard = e.target.closest('.dossier-org-card');
    const editOrgBtn = e.target.closest('.edit-org-btn');
    const editBtn = e.target.closest('.edit-dossier-btn'); 
    const deleteBtn = e.target.closest('.delete-dossier-btn'); 
    const fotoLinkBtn = e.target.closest('.veiculo-foto-link'); 

    if (editOrgBtn) { e.stopPropagation(); openEditOrgModal(editOrgBtn.dataset.orgId); }
    else if (editBtn) { e.stopPropagation(); openEditDossierModal(editBtn.dataset.org, editBtn.dataset.id); }
    else if (deleteBtn) { e.stopPropagation(); removeDossierEntry(deleteBtn.dataset.org, deleteBtn.dataset.id, currentUserData); }
    else if (fotoLinkBtn) { e.preventDefault(); e.stopPropagation(); showImageLightbox(fotoLinkBtn.dataset.url); }
    else if (orgCard) { setUserActivity('Investigação (Membros)'); showDossierPeople(orgCard.dataset.orgName, currentUserData); }
});

// Nível 2 (Pessoas)
els.dossierVoltarBtn.onclick = () => { setUserActivity('Investigação (Bases)'); showDossierOrgs(currentUserData); };
els.filtroDossierPeople.addEventListener('input', filterPeople);
els.addPessoaBtn.onclick = () => { const orgName = els.addPessoaBtn.dataset.orgName; if(orgName) { openAddDossierModal(orgName); } };
els.dossierPeopleGrid.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-dossier-btn');
    const deleteBtn = e.target.closest('.delete-dossier-btn');
    const fotoLinkBtn = e.target.closest('.veiculo-foto-link'); 
    
    if (fotoLinkBtn) { e.preventDefault(); showImageLightbox(fotoLinkBtn.dataset.url); }
    if (deleteBtn) { removeDossierEntry(deleteBtn.dataset.org, deleteBtn.dataset.id, currentUserData); }
    if (editBtn) { openEditDossierModal(editBtn.dataset.org, editBtn.dataset.id); }
});

// Modais Dossiê (Pessoa)
els.saveDossierBtn.onclick = () => saveDossierChanges(currentUserData);
els.cancelDossierBtn.onclick = closeEditDossierModal;
els.editDossierOverlay.onclick = closeEditDossierModal;
els.saveNewDossierBtn.onclick = () => saveNewDossierEntry(currentUserData);
els.cancelNewDossierBtn.onclick = closeAddDossierModal;
els.addDossierOverlay.onclick = closeAddDossierModal;

// Modais Dossiê (Org)
els.saveOrgBtn.onclick = () => saveOrg(currentUserData);
els.deleteOrgBtn.onclick = () => deleteOrg(currentUserData);
els.cancelOrgBtn.onclick = closeOrgModal;
els.orgModalOverlay.onclick = closeOrgModal;

// Modais Dossiê (Veículos)
els.addModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('addModal');
els.editModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('editModal');
els.addModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('addModal');
els.editModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('editModal');
els.addModalListaVeiculos.onclick = (e) => {
    const removeBtn = e.target.closest('.remove-veiculo-btn');
    const editBtn = e.target.closest('.edit-veiculo-btn');
    if (removeBtn) { removerVeiculoTemp(removeBtn.dataset.key, els.addModalListaVeiculos); }
    if (editBtn) { iniciarEdicaoVeiculo(editBtn.dataset.key, 'addModal'); }
};
els.editModalListaVeiculos.onclick = (e) => {
    const removeBtn = e.target.closest('.remove-veiculo-btn');
    const editBtn = e.target.closest('.edit-veiculo-btn');
    if (removeBtn) { removerVeiculoTemp(removeBtn.dataset.key, els.editModalListaVeiculos); }
    if (editBtn) { iniciarEdicaoVeiculo(editBtn.dataset.key, 'editModal'); }
};

// Lightbox
els.imageLightboxOverlay.onclick = closeImageLightbox;
els.imageLightboxModal.onclick = closeImageLightbox; 

// --- Inicialização (Welcome Screen e Tema)
const savedTheme = localStorage.getItem('theme') || 'light';
if(savedTheme === 'dark') {
    document.body.classList.add('dark');
}
updateLogoAndThemeButton(savedTheme === 'dark');

if (localStorage.getItem('hasVisited')) {
    els.welcomeScreen.style.display = 'none';
} else {
    els.welcomeScreen.classList.add('show');
    els.authScreen.style.display = 'none';
    els.mainCard.style.display = 'none';
}
els.enterBtn.onclick = () => {
    localStorage.setItem('hasVisited', 'true');
    els.welcomeScreen.classList.add('hidden');
    setTimeout(() => {
        els.welcomeScreen.style.display = 'none';
    }, 500);
};
