/* ===================================================
 * ui.js
 * Módulo de Interface do Usuário
 * Responsável por todas as interações e manipulações do DOM.
 * =================================================== */

// --- IMPORTS ---
// Não há imports de outros módulos no ui.js

// --- CONSTANTES ---
const logoLightModeSrc = "logo-dark.png";
const logoDarkModeSrc = "logo-dark.png";
const historyBackgroundSrc = "logo-dark.png";
const welcomeLogoSrc = "logo-dark.png";

// Elementos do DOM (els)
export const els = {
    // Principal
    mainCard: document.getElementById('mainCard'),
    historyCard: document.getElementById('historyCard'),
    adminPanel: document.getElementById('adminPanel'),
    dossierCard: document.getElementById('dossierCard'),
    
    // Header/Controles
    themeBtn: document.getElementById('themeBtn'),
    appLogo: document.getElementById('appLogo'),
    userStatus: document.getElementById('userStatus'),
    investigacaoBtn: document.getElementById('investigacaoBtn'),
    
    // Venda
    nomeCliente: document.getElementById('nomeCliente'),
    organizacao: document.getElementById('organizacao'),
    organizacaoTipo: document.getElementById('organizacaoTipo'),
    telefone: document.getElementById('telefone'),
    carroVeiculo: document.getElementById('carroVeiculo'), 
    placaVeiculo: document.getElementById('placaVeiculo'),
    negociadoras: document.getElementById('negociadoras'),
    vendaValorObs: document.getElementById('vendaValorObs'),
    
    // Cálculo
    qtyTickets: document.getElementById('qtyTickets'),
    qtyTablets: document.getElementById('qtyTablets'),
    qtyNitro: document.getElementById('qtyNitro'),
    tipoValor: document.getElementById('tipoValor'),
    results: document.getElementById('results'),
    
    // Histórico
    salesHistory: document.getElementById('salesHistory'),
    filtroHistorico: document.getElementById('filtroHistorico'),
    toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
    toggleCalcBtn: document.getElementById('toggleCalcBtn'),
    
    // Admin
    adminPanelBtn: document.getElementById('adminPanelBtn'),
    adminUserListBody: document.getElementById('adminUserListBody'),
    toggleCalcBtnAdmin: document.getElementById('toggleCalcBtnAdmin'),
    onlineUsersCount: document.getElementById('onlineUsersCount'),
    layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
    layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
    bottomPanelText: document.getElementById('bottomPanelText'),
    saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
    bottomPanel: document.getElementById('bottomPanel'),
    bottomPanelDisplay: document.getElementById('bottomPanelDisplay'),
    migrateDossierBtn: document.getElementById('migrateDossierBtn'),
    migrateVeiculosBtn: document.getElementById('migrateVeiculosBtn'),

    // Dossiê - Orgs
    dossierOrgContainer: document.getElementById('dossierOrgContainer'),
    filtroDossierOrgs: document.getElementById('filtroDossierOrgs'),
    addOrgBtn: document.getElementById('addOrgBtn'),
    dossierOrgGrid: document.getElementById('dossierOrgGrid'),

    // Dossiê - Pessoas
    dossierPeopleContainer: document.getElementById('dossierPeopleContainer'),
    dossierPeopleTitle: document.getElementById('dossierPeopleTitle'),
    dossierVoltarBtn: document.getElementById('dossierVoltarBtn'),
    filtroDossierPeople: document.getElementById('filtroDossierPeople'),
    addPessoaBtn: document.getElementById('addPessoaBtn'),
    dossierPeopleGrid: document.getElementById('dossierPeopleGrid'),
    
    // Modais
    editDossierOverlay: document.getElementById('editDossierOverlay'),
    editDossierModal: document.getElementById('editDossierModal'),
    addDossierOverlay: document.getElementById('addDossierOverlay'),
    addDossierModal: document.getElementById('addDossierModal'),
    orgModalOverlay: document.getElementById('orgModalOverlay'),
    orgModal: document.getElementById('orgModal'),
    
    // Lightbox
    imageLightboxOverlay: document.getElementById('imageLightboxOverlay'),
    imageLightboxModal: document.getElementById('imageLightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    
    // Boas-Vindas
    welcomeScreen: document.getElementById('welcomeScreen'),
    authScreen: document.getElementById('authScreen')
};


// --- FUNÇÕES DE UTILIDADE ---

/**
 * Exibe notificações para o usuário.
 */
export const showToast = (message, type = 'default', duration = 3000) => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Garante que o container exista
    if (!toastContainer) {
        console.warn('Toast container não encontrado. Exibindo no console:', message);
        return;
    }
    
    toastContainer.appendChild(toast);
    
    // Força o reflow antes de adicionar a classe 'show'
    toast.offsetHeight; 
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, duration);
};

/**
 * Formata um valor numérico como moeda BRL.
 */
export const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) { return 'R$ 0'; }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * Capitaliza texto, tratando exceções (CNPJ, NKT, etc.)
 */
export const capitalizeText = (text) => {
    if (!text) return '';
    
    const upperText = text.toUpperCase();
    
    // Exceções para Acrônimos
    if (upperText === 'CPF' || upperText === 'OUTROS' || upperText === 'CNPJ' || upperText === 'NKT') {
        return upperText;
    }
    if (text === 'dinheiro sujo' || text === 'Dinheiro Sujo') return 'Dinheiro Sujo';
    
    // Capitalização de Sentença/Palavra
    return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

/**
 * Alterna entre as telas principais (main, history, admin, dossier)
 */
export const toggleView = (viewName) => {
    const views = {
        'main': els.mainCard,
        'history': els.historyCard,
        'admin': els.adminPanel,
        'dossier': els.dossierCard
    };

    Object.keys(views).forEach(key => {
        if (views[key]) {
            views[key].style.display = (key === viewName) ? 'block' : 'none';
        }
    });

    // Atualiza a classe do corpo para views de largura expandida
    document.body.classList.toggle('history-view-active', viewName === 'history');
    document.body.classList.toggle('dossier-view-active', viewName === 'dossier');
};

/**
 * Exibe o Lightbox de Imagem
 */
export const showImageLightbox = (url) => {
    if (!els.imageLightboxOverlay || !els.imageLightboxModal || !els.lightboxImg) return;
    
    els.lightboxImg.src = url;
    els.imageLightboxOverlay.style.display = 'block';
    els.imageLightboxModal.style.display = 'block';
    
    const closeLightbox = () => {
        els.imageLightboxOverlay.style.display = 'none';
        els.imageLightboxModal.style.display = 'none';
        els.imageLightboxOverlay.removeEventListener('click', closeLightbox);
    };

    els.imageLightboxOverlay.addEventListener('click', closeLightbox);
};


// --- FUNÇÕES DE TEMA E PERMISSÃO ---

/**
 * Configura o tema (Modo Noturno)
 */
export const updateLogoAndThemeButton = (isDark) => {
    const themeBtn = els.themeBtn;
    const appLogo = els.appLogo;
    
    if (isDark) {
        document.body.classList.add('dark');
        if (themeBtn) themeBtn.textContent = '☀️ Modo Diurno';
        if (appLogo) appLogo.src = logoDarkModeSrc;
    } else {
        document.body.classList.remove('dark');
        if (themeBtn) themeBtn.textContent = '🌙 Modo Noturno';
        if (appLogo) appLogo.src = logoLightModeSrc;
    }
};

/**
 * Configura visibilidade de botões por tag do usuário.
 * *** CORREÇÃO: Função agora exportada para ser usada no auth.js ***
 */
export const configureInterfaceByTag = (tag) => {
    const tagUpper = tag.toUpperCase();
    const isAdmin = tagUpper === 'ADMIN';
    const isHells = isAdmin || tagUpper === 'HELLS';

    if (els.userStatus) {
        els.userStatus.textContent = tag;
        els.userStatus.className = `user-status-display tag-${tag.toLowerCase()}`;
        els.userStatus.style.display = 'inline-block';
    }
    
    // Ações Admin/Hells
    if(els.adminPanelBtn) els.adminPanelBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if(els.investigacaoBtn) els.investigacaoBtn.style.display = isHells ? 'inline-block' : 'none';
    if(els.migrateDossierBtn) els.migrateDossierBtn.style.display = isHells ? 'inline-block' : 'none';
    if(els.migrateVeiculosBtn) els.migrateVeiculosBtn.style.display = isHells ? 'inline-block' : 'none';
    
    // Ações de Escrita/Edição
    if(els.registerBtn) els.registerBtn.disabled = !isHells;
    if(els.clearHistoryBtn) els.clearHistoryBtn.style.display = isHells ? 'inline-block' : 'none';
    if(els.addOrgBtn) els.addOrgBtn.style.display = isHells ? 'inline-block' : 'none';
    if(els.addPessoaBtn) els.addPessoaBtn.style.display = isHells ? 'inline-block' : 'none';
};

// --- INICIALIZAÇÃO DA UI ---

// Listener do Botão de Tema
els.themeBtn.onclick = () => {
    const isDark = document.body.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    updateLogoAndThemeButton(!isDark);
};

// Carrega Tema Salvo
const savedTheme = localStorage.getItem('theme') || 'light';
updateLogoAndThemeButton(savedTheme === 'dark');

// Lógica da Tela de Boas-Vindas
els.welcomeScreen.style.display = localStorage.getItem('hasVisited') ? 'none' : 'flex';
els.authScreen.style.display = localStorage.getItem('hasVisited') ? 'block' : 'none';

if (els.enterBtn) {
    els.enterBtn.onclick = () => {
        els.welcomeScreen.classList.remove('show');
        els.welcomeScreen.classList.add('hidden');
        localStorage.setItem('hasVisited', 'true');
        setTimeout(() => {
            els.welcomeScreen.style.display = 'none';
            els.authScreen.style.display = 'block';
        }, 500); 
    };
}
