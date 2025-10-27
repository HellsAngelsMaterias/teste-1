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
    clearAllFields, setVendas, setVendaEmEdicao 
} from './sales.js'; // <-- Nome do seu arquivo

import { els } from './dom.js'; 

import { 
    showToast, toggleView, toggleTheme, updateLogoAndThemeButton, 
    showNextTourStep, phoneMask, PREFIX, camposParaCapitalizar 
} from './helpers.js'; // <-- Nome do seu arquivo

// --- 4. Estado Global Principal
let currentUser = null;
let currentUserData = null;
let vendasListener = null;

// --- FUNÇÃO GLOBAL DE ATIVIDADE ---
const setUserActivity = (activity) => {
    if (currentUser && currentUserData) {
        updateUserActivity(currentUser, currentUserData, activity);
    }
};

// ⭐️ NOVO: Função para Sincronização de Scroll
const setupHistoryScrollSync = () => {
    const scrollContainer = els.historyCard.querySelector('.history-table-wrapper');
    const topBar = els.topHistoryScrollbar;
    
    if (!scrollContainer || !topBar) return;
    
    // Cria um elemento interno invisível para forçar a largura de conteúdo
    const innerContent = document.createElement('div');
    innerContent.style.height = '1px'; // Altura mínima para o scrollbar
    topBar.innerHTML = '';
    topBar.appendChild(innerContent);
    
    let isScrolling = false;

    // Função de sincronização
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

    // Recalcula largura do conteúdo para a barra superior
    const recalculateWidth = () => {
        // Só executa se o histórico estiver visível
        if (els.historyCard.style.display !== 'none') {
            const contentWidth = scrollContainer.scrollWidth; 
            innerContent.style.width = contentWidth + 'px';
            topBar.style.width = scrollContainer.offsetWidth + 'px';
        }
    };
    
    // 1. Sincronização inicial
    recalculateWidth();
    
    // 2. Re-sincronização no redimensionamento da janela
    window.addEventListener('resize', recalculateWidth);
    
    // 3. MutationObserver para pegar alterações no DOM (e.g., carregar dados)
    const observer = new MutationObserver(recalculateWidth);
    // Observa o container da tabela para mudanças de tamanho e conteúdo
    observer.observe(scrollContainer, { childList: true, subtree: true, attributes: true });

    // Função de limpeza (cleanup)
    return () => {
        window.removeEventListener('resize', recalculateWidth);
        topBar.removeEventListener('scroll', topScrollHandler);
        scrollContainer.removeEventListener('scroll', bottomScrollHandler);
        observer.disconnect();
        topBar.innerHTML = ''; // Limpa o elemento
    };
};

let scrollCleanup = null; 

// ===============================================
// INICIALIZAÇÃO E UI
// ===============================================

// ... (Restante da inicialização)

// ===============================================
// LÓGICA DE AUTENTICAÇÃO
// ===============================================

// ... (Funções de Auth)

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
            // ... (Lógica de definição de dados)
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
            
            setUserActivity('Calculadora'); 
            
            configurarInterfacePorTag(currentUserData.tag);
             
            if(vendasListener) vendasListener(); 
            
            let vendasRef;
            const userTagUpper = currentUserData.tag.toUpperCase();
            if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
                vendasRef = query(ref(db, 'vendas'), orderByChild('timestamp'));
            } else {
                vendasRef = query(ref(db, 'vendas'), orderByChild('registradoPorId'), equalTo(currentUser.uid));
            }

            vendasListener = onValue(vendasRef, (vendasSnapshot) => {
                let vendas = [];
                vendasSnapshot.forEach((child) => {
                    vendas.push({ id: child.key, ...child.val() });
                });
                
                setVendas(vendas); 
                
                if (els.historyCard.style.display !== 'none') {
                    displaySalesHistory(vendas, currentUser, currentUserData);
                    
                    // ⭐️ NOVO: Re-sincroniza após o carregamento da tabela
                    if (scrollCleanup) scrollCleanup(); // Limpa se já existir
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

        els.authScreen.style.display = 'none';
        toggleView('main');

    } else {
        // --- USUÁRIO DESLOGADO ---
        currentUser = null;
        currentUserData = null;
        if (vendasListener) vendasListener(); 
        setVendas([]); 
        setVendaEmEdicao(null); 
        
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

// ... (UI Geral e Autenticação - Mantido)

// Função de limpeza de scroll
const cleanupScroll = () => {
    if (scrollCleanup) {
        scrollCleanup();
        scrollCleanup = null;
    }
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
    // O scrollCleanup é chamado dentro do onValue listener de vendas para garantir a sincronia
};
els.toggleCalcBtn.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // Limpa o scroll ao sair
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
    cleanupScroll(); // Limpa o scroll
    loadAdminPanel(true, currentUser); 
};
els.toggleCalcBtnAdmin.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // Limpa o scroll
};

// ... (Restante dos listeners de Admin e Dossiê)

els.investigacaoBtn.onclick = () => {
    setUserActivity('Investigação (Bases)'); 
    toggleView('dossier');
    cleanupScroll(); // Limpa o scroll
    showDossierOrgs(currentUserData); 
};
els.toggleCalcBtnDossier.onclick = () => {
    setUserActivity('Calculadora'); 
    toggleView('main');
    cleanupScroll(); // Limpa o scroll
};

// ... (Restante dos listeners)
