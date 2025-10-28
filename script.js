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
    els.authScreen.style.display = 'block'; // Mostra auth se já visitou
} else {
    els.welcomeScreen.style.display = 'block'; // Mostra boas-vindas
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

// Funções de autenticação (implementação de exemplo)
const handleAuthAction = async (isLogin, creds) => { 
    const email = creds.username.includes('@') ? creds.username : `${creds.username}@hells.com`;
    const password = creds.password;
    
    if (!password || !email) {
        showToast("Por favor, preencha usuário e senha.", "error");
        return;
    }

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
            showToast("Login bem-sucedido!", "success");
            // onAuthStateChanged cuidará de esconder a tela de auth
        } else {
            // Registro
            await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(auth.currentUser, { displayName: creds.username });
            
            // Salva dados no DB (Exemplo)
            const userRef = ref(db, `usuarios/${auth.currentUser.uid}`);
            await set(userRef, {
                displayName: creds.username,
                email: email,
                tag: 'Visitante' // Tag padrão
            });
            showToast("Registro bem-sucedido! Faça o login.", "success");
        }
    } catch (error) {
        console.error("Erro de autenticação:", error);
        showToast(`Erro: ${error.message}`, "error");
    }
};

const authAction = (isLogin) => {
    handleAuthAction(isLogin, {
        username: els.username.value, 
        password: els.password.value
    });
};

const resetPassword = async () => { 
    const email = els.username.value.includes('@') ? els.username.value : `${els.username.value}@hells.com`;
    if (!email) {
        showToast("Digite seu nome de usuário (ou email) para resetar a senha.", "error");
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showToast(`Email de recuperação enviado para ${email}.`, "success");
    } catch (error) {
        console.error("Erro ao resetar senha:", error);
        showToast(`Erro: ${error.message}`, "error");
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
                // Se não existir, cria um perfil básico
                const displayName = user.displayName || user.email.split('@')[0];
                const newUserProfile = {
                    displayName: displayName, 
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
        els.welcomeScreen.style.display = 'none'; // Garante que a tela de boas vindas suma
        toggleView('main');

    } else {
        // --- USUÁRIO DESLOGADO ---
        currentUser = null;
        currentUserData = null;
        if (vendasListener) vendasListener(); 
        setVendas([]); // Limpa as vendas no módulo
        setVendaEmEdicao(null); // Reseta a edição
        cleanupScroll(); // Limpa o scroll
        
        // Mostra a tela de autenticação se já visitou, ou a de boas-vindas se for a primeira vez
        if (localStorage.getItem('hasVisited')) {
            els.authScreen.style.display = 'block';
            els.welcomeScreen.style.display = 'none';
        } else {
            els.welcomeScreen.style.display = 'block';
            els.authScreen.style.display = 'none';
        }
        
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

// --- Bloco de UI Geral e Autenticação (CORRIGIDO) ---
// Estes são os botões que não funcionavam antes

if(els.themeBtn) els.themeBtn.onclick = toggleTheme;

if(els.tutorialBtn) els.tutorialBtn.onclick = () => {
    // A função 'showNextTourStep' foi importada de 'helpers.js'
    showNextTourStep(0); // Inicia o tour
};

if(els.enterBtn) els.enterBtn.onclick = () => {
    // Esconde a tela de boas-vindas e mostra a de autenticação
    els.welcomeScreen.style.display = 'none';
    els.authScreen.style.display = 'block';
    localStorage.setItem('hasVisited', 'true');
};

if(els.logoutBtn) els.logoutBtn.onclick = () => {
     signOut(auth).catch((error) => {
        console.error("Erro ao sair:", error);
        showToast("Erro ao tentar deslogar.", "error");
    });
};

// Botões de Autenticação
if(els.loginBtn) els.loginBtn.onclick = () => authAction(true);
if(els.registerUserBtn) els.registerUserBtn.onclick = () => authAction(false);
if(els.forgotPasswordLink) els.forgotPasswordLink.onclick = resetPassword;

// --- FIM DO BLOCO DE CORREÇÃO ---


// --- Calculadora/Vendas (Módulo: sales.js) ---
if(els.calcBtn) els.calcBtn.onclick = () => {
    calculate();
    setUserActivity('Calculando Venda'); 
};
if(els.resetBtn) els.resetBtn.onclick = clearAllFields;
if(els.registerBtn) els.registerBtn.onclick = () => {
    registerVenda(currentUser, currentUserData);
    setUserActivity('Registrando/Atualizando Venda'); 
};
if(els.toggleHistoryBtn) els.toggleHistoryBtn.onclick = () => {
    setUserActivity('Visualizando Histórico'); 
    toggleView('history');
    displaySalesHistory(null, currentUser, currentUserData); 
    // A sincronização de scroll é ativada no onValue listener
};
if(els.toggleCalcBtn) els.toggleCalcBtn.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // ⭐️ Limpa o scroll ao sair
};
if(els.clearHistoryBtn) els.clearHistoryBtn.onclick = () => clearHistory(currentUserData);
if(els.csvBtn) els.csvBtn.onclick = exportToCsv;
if(els.discordBtnCalc) els.discordBtnCalc.onclick = () => copyDiscordMessage(false, null, currentUserData);
if(els.filtroHistorico) els.filtroHistorico.addEventListener('input', () => filterHistory(currentUser, currentUserData));
if(els.nomeCliente) els.nomeCliente.addEventListener('change', autoFillFromDossier);

// --- Painel Admin (Módulo: admin.js) ---
if(els.adminPanelBtn) els.adminPanelBtn.onclick = () => {
    setUserActivity('Painel Admin'); 
    toggleView('admin');
    cleanupScroll(); // ⭐️ Limpa o scroll
    loadAdminPanel(true, currentUser); 
};
if(els.toggleCalcBtnAdmin) els.toggleCalcBtnAdmin.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // ⭐️ Limpa o scroll
};
if(els.saveBottomPanelTextBtn) els.saveBottomPanelTextBtn.onclick = () => {
    const newText = els.bottomPanelText.value.trim();
    updateGlobalLayout('bottomPanelText', newText);
    showToast("Mensagem do rodapé salva!", "success");
    setUserActivity('Painel Admin (Salvando Configs)'); 
};
if(els.layoutToggleNightMode) els.layoutToggleNightMode.onchange = (e) => updateGlobalLayout('enableNightMode', e.target.checked);
if(els.layoutToggleBottomPanel) els.layoutToggleBottomPanel.onchange = (e) => updateGlobalLayout('enableBottomPanel', e.target.checked);
if(els.migrateDossierBtn) els.migrateDossierBtn.onclick = migrateVendasToDossier;
if(els.migrateVeiculosBtn) els.migrateVeiculosBtn.onclick = migrateVeiculosData;

// --- Dossiê (Módulo: dossier.js) ---
if(els.investigacaoBtn) els.investigacaoBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    toggleView('dossier');
    cleanupScroll(); // ⭐️ Limpa o scroll
    showDossierOrgs(currentUserData); 
};
if(els.toggleCalcBtnDossier) els.toggleCalcBtnDossier.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // ⭐️ Limpa o scroll
};

// ... (Restante dos listeners de Dossiê - Adicione-os aqui se necessário)
// ...
