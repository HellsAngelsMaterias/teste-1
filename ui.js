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
    
    // Cálculos
    qtyTickets: document.getElementById('qtyTickets'),
    qtyTablets: document.getElementById('qtyTablets'),
    qtyNitro: document.getElementById('qtyNitro'),
    tipoValor: document.getElementById('tipoValor'),
    
    resultadoFinal: document.getElementById('resultadoFinal'),
    resultadoCusto: document.getElementById('resultadoCusto'),
    resultadoLucro: document.getElementById('resultadoLucro'),
    
    // Botões
    calcBtn: document.getElementById('calcBtn'),
    resetBtn: document.getElementById('resetBtn'),
    registerBtn: document.getElementById('registerBtn'),
    toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
    toggleCalcBtn: document.getElementById('toggleCalcBtn'), // No histórico
    
    // Histórico
    historyList: document.getElementById('historyList'),
    filtroHistorico: document.getElementById('filtroHistorico'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyMessage: document.getElementById('historyMessage'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    
    // Auth/Login
    authScreen: document.getElementById('authScreen'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    enterBtn: document.getElementById('enterBtn'),
    
    loginBtn: document.getElementById('loginBtn'),
    registerUserBtn: document.getElementById('registerUserBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    authMessage: document.getElementById('authMessage'),
    forgotPasswordLink: document.getElementById('forgotPasswordLink'),
    
    // Admin
    adminPanelBtn: document.getElementById('adminPanelBtn'),
    toggleCalcBtnAdmin: document.getElementById('toggleCalcBtnAdmin'),
    adminOnlineUsers: document.getElementById('adminOnlineUsers'),
    adminContent: document.getElementById('adminContent'),
    
    layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
    layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
    bottomPanelDisplay: document.getElementById('bottomPanelDisplay'),
    bottomPanelText: document.getElementById('bottomPanelText'),
    saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
    
    migrateDossierBtn: document.getElementById('migrateDossierBtn'),
    migrateVeiculosBtn: document.getElementById('migrateVeiculosBtn'),
    
    // Dossier (Investigação)
    toggleCalcBtnDossier: document.getElementById('toggleCalcBtnDossier'),
    dossierOrgList: document.getElementById('dossierOrgList'),
    addOrgBtn: document.getElementById('addOrgBtn'),
    dossierPeopleList: document.getElementById('dossierPeopleList'),
    addPessoaBtn: document.getElementById('addPessoaBtn'),
    
    // Modal Dossier Pessoa (Add/Edit)
    addPessoaModal: document.getElementById('addPessoaModal'),
    editPessoaModal: document.getElementById('editPessoaModal'),
    addModalOverlay: document.getElementById('addModalOverlay'),
    editModalOverlay: document.getElementById('editModalOverlay'),
    
    // Add Pessoa Modal Elements
    addPessoaNome: document.getElementById('addPessoaNome'),
    addPessoaCargo: document.getElementById('addPessoaCargo'),
    addPessoaTelefone: document.getElementById('addPessoaTelefone'),
    addPessoaObs: document.getElementById('addPessoaObs'),
    addPessoaOrgSelect: document.getElementById('addPessoaOrgSelect'),
    addPessoaFotoUrl: document.getElementById('addPessoaFotoUrl'),
    addPessoaVeiculoCarro: document.getElementById('addPessoaVeiculoCarro'),
    addPessoaVeiculoPlaca: document.getElementById('addPessoaVeiculoPlaca'),
    addPessoaSaveBtn: document.getElementById('addPessoaSaveBtn'),
    addModalAddVeiculoBtn: document.getElementById('addModalAddVeiculoBtn'),
    addModalCancelVeiculoBtn: document.getElementById('addModalCancelVeiculoBtn'),
    addModalListaVeiculos: document.getElementById('addModalListaVeiculos'),
    cancelNewDossierBtn: document.getElementById('cancelNewDossierBtn'),

    // Edit Pessoa Modal Elements
    editPessoaId: document.getElementById('editPessoaId'),
    editPessoaNome: document.getElementById('editPessoaNome'),
    editPessoaCargo: document.getElementById('editPessoaCargo'),
    editPessoaTelefone: document.getElementById('editPessoaTelefone'),
    editPessoaObs: document.getElementById('editPessoaObs'),
    editPessoaOrgSelect: document.getElementById('editPessoaOrgSelect'),
    editPessoaFotoUrl: document.getElementById('editPessoaFotoUrl'),
    editPessoaSaveBtn: document.getElementById('editPessoaSaveBtn'),
    editPessoaDeleteBtn: document.getElementById('editPessoaDeleteBtn'),
    editPessoaVeiculoCarro: document.getElementById('editPessoaVeiculoCarro'),
    editPessoaVeiculoPlaca: document.getElementById('editPessoaVeiculoPlaca'),
    editModalAddVeiculoBtn: document.getElementById('editModalAddVeiculoBtn'),
    editModalCancelVeiculoBtn: document.getElementById('editModalCancelVeiculoBtn'),
    editModalListaVeiculos: document.getElementById('editModalListaVeiculos'),
    cancelEditDossierBtn: document.getElementById('cancelEditDossierBtn'),
    
    // Modal Org
    orgModalOverlay: document.getElementById('orgModalOverlay'),
    orgModal: document.getElementById('orgModal'),
    orgModalTitle: document.getElementById('orgModalTitle'),
    editOrgId: document.getElementById('editOrgId'),
    orgNome: document.getElementById('orgNome'),
    orgFotoUrl: document.getElementById('orgFotoUrl'),
    orgInfo: document.getElementById('orgInfo'),
    saveOrgBtn: document.getElementById('saveOrgBtn'),
    deleteOrgBtn: document.getElementById('deleteOrgBtn'),
    cancelOrgBtn: document.getElementById('cancelOrgBtn'),
    
    // Lightbox
    imageLightboxOverlay: document.getElementById('imageLightboxOverlay'),
    imageLightboxModal: document.getElementById('imageLightboxModal'),
    imageLightboxImg: document.getElementById('imageLightboxImg'),
    
};


// --- FUNÇÕES DE FORMATO E UTILIDADE ---

/**
 * Formata um número como moeda BRL fictícia (R$)
 * @param {number} value
 * @returns {string}
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD', // Usando USD, mas formatando como BRL
        minimumFractionDigits: 0
    }).format(value).replace('US$', 'R$').replace(/,/g, '.');
};

/**
 * Capitaliza a primeira letra de uma string.
 * @param {string} str
 * @returns {string}
 */
export const capitalizeText = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};


// --- FUNÇÕES DE INTERFACE PRINCIPAIS ---

/**
 * Exibe ou oculta as views principais (main, history, admin, dossier)
 * @param {'main' | 'history' | 'admin' | 'dossier'} viewName
 */
export const toggleView = (viewName) => {
    els.mainCard.style.display = 'none';
    els.historyCard.style.display = 'none';
    els.adminPanel.style.display = 'none';
    els.dossierCard.style.display = 'none';

    switch (viewName) {
        case 'main':
            els.mainCard.style.display = 'block';
            els.historyCard.style.backgroundImage = 'none'; // Limpa o BG do histórico
            break;
        case 'history':
            els.historyCard.style.display = 'block';
            els.historyCard.style.backgroundImage = `url(${historyBackgroundSrc})`; // Define o BG
            break;
        case 'admin':
            els.adminPanel.style.display = 'block';
            break;
        case 'dossier':
            els.dossierCard.style.display = 'block';
            break;
    }
};

/**
 * Exibe uma notificação Toast na parte inferior da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'default' | 'error' | 'success'} type - O tipo de toast.
 * @param {number} duration - Duração em ms (padrão: 3000).
 */
export const showToast = (message, type = 'default', duration = 3000) => {
    // 1. Configura o conteúdo e o estilo
    els.toastText.textContent = message;
    els.toast.className = `toast ${type}`;

    // 2. Exibe o toast
    els.toast.classList.add('show');

    // 3. Oculta após a duração
    setTimeout(() => {
        els.toast.classList.remove('show');
    }, duration);
};

// --- FUNÇÕES DE LAYOUT ---

/**
 * Atualiza o tema (dark/light) e a logo
 * @param {boolean} isDark - Se o modo escuro está ativo
 */
const updateLogoAndThemeButton = (isDark) => {
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    
    // Atualiza a logo
    const logoSrc = isDark ? logoDarkModeSrc : logoLightModeSrc;
    els.appLogo.src = logoSrc;
    
    // Atualiza o texto do botão
    els.themeBtn.textContent = isDark ? '☀️ Modo Claro' : '🌙 Modo Noturno';
    
    // Atualiza a logo da tela de boas-vindas
    // (Presumindo que existe um els.welcomeLogo no index.html que não foi enviado)
    // if(els.welcomeLogo) els.welcomeLogo.src = welcomeLogoSrc;
};


/**
 * Abre o Lightbox para exibir uma imagem em tela cheia.
 * @param {string} imageUrl - URL da imagem.
 */
export const showImageLightbox = (imageUrl) => {
    els.imageLightboxImg.src = imageUrl;
    els.imageLightboxOverlay.style.display = 'block';
    els.imageLightboxModal.style.display = 'flex';
};

// Listener para fechar o Lightbox
if (els.imageLightboxOverlay) {
    els.imageLightboxOverlay.onclick = () => {
        els.imageLightboxOverlay.style.display = 'none';
        els.imageLightboxModal.style.display = 'none';
        els.imageLightboxImg.src = ''; // Limpa a fonte
    };
}


/**
 * Configura elementos de UI com base na tag de usuário (Admin, Hells, Visitante)
 * @param {string} tag - A tag do usuário (ex: 'admin', 'hells', 'visitante')
 */
export const configureInterfaceByTag = (tag) => {
    const isHells = tag === 'admin' || tag === 'hells';
    const isAdmin = tag === 'admin';
    
    // Painel Admin e Botão de Investigação
    if(els.adminPanelBtn) els.adminPanelBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if(els.investigacaoBtn) els.investigacaoBtn.style.display = isHells ? 'inline-block' : 'none';
    
    // Migrações (apenas admin)
    if(els.migrateDossierBtn) els.migrateDossierBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if(els.migrateVeiculosBtn) els.migrateVeiculosBtn.style.display = isAdmin ? 'inline-block' : 'none';
    
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
        localStorage.setItem('hasVisited', 'true');
        els.welcomeScreen.style.display = 'none';
        els.authScreen.style.display = 'block';
    };
}

// **<--- O EXPORT FALTANTE FOI ADICIONADO AQUI! --->**
/**
 * Função de inicialização do UI (chamada por script.js)
 * @returns {void}
 */
export function initUI() { 
    // Esta função existe para ser o ponto de entrada do módulo UI.
    // A maior parte da lógica de UI já roda ao carregar o módulo,
    // mas mantemos a função para o script.js poder chamá-la.
    console.log("Módulo UI inicializado."); 
}
