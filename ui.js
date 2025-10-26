/* ===================================================
 * ui.js
 * Responsável por gerenciar o DOM (els),
 * funções de UI (toast, tema, modais, helpers)
 * e o tutorial.
 * =================================================== */

// --- CONSTANTES DE UI ---
const logoLightModeSrc = "logo-dark.png";
const logoDarkModeSrc = "logo-dark.png";
const historyBackgroundSrc = "logo-dark.png";
const welcomeLogoSrc = "logo-dark.png";

// --- SELETORES DO DOM (`els`) ---
// Exportamos `els` para que outros módulos possam usá-lo
export const els = {
  qtyTickets: document.getElementById('qtyTickets'),
  qtyTablets: document.getElementById('qtyTablets'),
  qtyNitro: document.getElementById('qtyNitro'),
  tipoValor: document.getElementById('tipoValor'),
  nomeCliente: document.getElementById('nomeCliente'),
  organizacao: document.getElementById('organizacao'),
  organizacaoTipo: document.getElementById('organizacaoTipo'),
  telefone: document.getElementById('telefone'),
  carroVeiculo: document.getElementById('carroVeiculo'), 
  placaVeiculo: document.getElementById('placaVeiculo'),
  negociadoras: document.getElementById('negociadoras'),
  vendaValorObs: document.getElementById('vendaValorObs'),
  dataVenda: document.getElementById('dataVenda'),
  filtroHistorico: document.getElementById('filtroHistorico'),
  resultsBody: document.getElementById('resultsBody'),
  valuesBody: document.getElementById('valuesBody'),
  valorTotalGeral: document.getElementById('valorTotalGeral'),
  results: document.getElementById('results'),
  mainCard: document.getElementById('mainCard'),
  historyCard: document.getElementById('historyCard'),
  salesHistory: document.getElementById('salesHistory'),
  calcBtn: document.getElementById('calcBtn'),
  resetBtn: document.getElementById('resetBtn'),
  registerBtn: document.getElementById('registerBtn'),
  toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
  toggleCalcBtn: document.getElementById('toggleCalcBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  csvBtn: document.getElementById('csvBtn'),
  discordBtnCalc: document.getElementById('discordBtnCalc'),
  themeBtn: document.getElementById('themeBtn'),
  tutorialBtn: document.getElementById('tutorialBtn'),
  logoLink: document.getElementById('logoLink'),
  appLogo: document.getElementById('appLogo'),
  historyImg: document.getElementById('historyImg'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  enterBtn: document.getElementById('enterBtn'),
  welcomeLogo: document.getElementById('welcomeLogo'),
  authScreen: document.getElementById('authScreen'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('loginBtn'),
  registerUserBtn: document.getElementById('registerUserBtn'),
  authMessage: document.getElementById('authMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  mainTitle: document.getElementById('mainTitle'),
  forgotPasswordLink: document.getElementById('forgotPasswordLink'),
  
  adminPanelBtn: document.getElementById('adminPanelBtn'),
  adminPanel: document.getElementById('adminPanel'),
  adminUserListBody: document.getElementById('adminUserListBody'),
  toggleCalcBtnAdmin: document.getElementById('toggleCalcBtnAdmin'), 
  
  onlineUsersCount: document.getElementById('onlineUsersCount'),
  layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
  layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
  bottomPanelText: document.getElementById('bottomPanelText'),
  saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
  bottomPanelDisplay: document.getElementById('bottomPanelDisplay'), 
  
  bottomPanel: document.getElementById('bottomPanel'),
  userStatus: document.getElementById('userStatus'),
  
  investigacaoBtn: document.getElementById('investigacaoBtn'),
  dossierCard: document.getElementById('dossierCard'),
  toggleCalcBtnDossier: document.getElementById('toggleCalcBtnDossier'),
  
  dossierOrgContainer: document.getElementById('dossierOrgContainer'),
  filtroDossierOrgs: document.getElementById('filtroDossierOrgs'),
  addOrgBtn: document.getElementById('addOrgBtn'),
  dossierOrgGrid: document.getElementById('dossierOrgGrid'),
  
  dossierPeopleContainer: document.getElementById('dossierPeopleContainer'),
  dossierPeopleTitle: document.getElementById('dossierPeopleTitle'),
  dossierVoltarBtn: document.getElementById('dossierVoltarBtn'),
  filtroDossierPeople: document.getElementById('filtroDossierPeople'),
  addPessoaBtn: document.getElementById('addPessoaBtn'),
  dossierPeopleGrid: document.getElementById('dossierPeopleGrid'),
  
  migrateDossierBtn: document.getElementById('migrateDossierBtn'),
  migrateVeiculosBtn: document.getElementById('migrateVeiculosBtn'), 
  
  editDossierOverlay: document.getElementById('editDossierOverlay'),
  editDossierModal: document.getElementById('editDossierModal'),
  editDossierOrg: document.getElementById('editDossierOrg'),
  editDossierId: document.getElementById('editDossierId'),
  editDossierNome: document.getElementById('editDossierNome'),
  editDossierNumero: document.getElementById('editDossierNumero'),
  editDossierCargo: document.getElementById('editDossierCargo'),
  editDossierFotoUrl: document.getElementById('editDossierFotoUrl'),
  editDossierInstagram: document.getElementById('editDossierInstagram'), 
  saveDossierBtn: document.getElementById('saveDossierBtn'),
  cancelDossierBtn: document.getElementById('cancelDossierBtn'),
  
  editModalCarroNome: document.getElementById('editModalCarroNome'),
  editModalCarroPlaca: document.getElementById('editModalCarroPlaca'),
  editModalCarroFoto: document.getElementById('editModalCarroFoto'), 
  editModalAddVeiculoBtn: document.getElementById('editModalAddVeiculoBtn'),
  editModalCancelVeiculoBtn: document.getElementById('editModalCancelVeiculoBtn'), 
  editModalListaVeiculos: document.getElementById('editModalListaVeiculos'),
  
  addDossierOverlay: document.getElementById('addDossierOverlay'),
  addDossierModal: document.getElementById('addDossierModal'),
  addDossierOrganizacao: document.getElementById('addDossierOrganizacao'),
  addDossierNome: document.getElementById('addDossierNome'),
  addDossierNumero: document.getElementById('addDossierNumero'),
  addDossierCargo: document.getElementById('addDossierCargo'),
  addDossierFotoUrl: document.getElementById('addDossierFotoUrl'),
  saveNewDossierBtn: document.getElementById('saveNewDossierBtn'),
  cancelNewDossierBtn: document.getElementById('cancelNewDossierBtn'),

  addModalCarroNome: document.getElementById('addModalCarroNome'),
  addModalCarroPlaca: document.getElementById('addModalCarroPlaca'),
  addModalCarroFoto: document.getElementById('addModalCarroFoto'), 
  addModalAddVeiculoBtn: document.getElementById('addModalAddVeiculoBtn'),
  addModalCancelVeiculoBtn: document.getElementById('addModalCancelVeiculoBtn'), 
  addModalListaVeiculos: document.getElementById('addModalListaVeiculos'),
  
  orgModalOverlay: document.getElementById('orgModalOverlay'),
  orgModal: document.getElementById('orgModal'),
  orgModalTitle: document.getElementById('orgModalTitle'),
  editOrgId: document.getElementById('editOrgId'),
  orgNome: document.getElementById('orgNome'),
  orgFotoUrl: document.getElementById('orgFotoUrl'),
  orgInfo: document.getElementById('orgInfo'),
  saveOrgBtn: document.getElementById('saveOrgBtn'),
  cancelOrgBtn: document.getElementById('cancelOrgBtn'),
  deleteOrgBtn: document.getElementById('deleteOrgBtn'),
  
  imageLightboxOverlay: document.getElementById('imageLightboxOverlay'),
  imageLightboxModal: document.getElementById('imageLightboxModal'),
  lightboxImg: document.getElementById('lightboxImg')
};

// --- FUNÇÕES DE UI HELPERS ---

export const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) { return 'R$ 0'; }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const capitalizeText = (text) => {
    if (!text) return '';
    
    const upperText = text.toUpperCase();
    
    if (upperText === 'CPF' || upperText === 'OUTROS' || upperText === 'CNPJ' || upperText === 'NKT') {
        return upperText;
    }
    if (text === 'dinheiro sujo') return 'Dinheiro Sujo';
    
    return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

export const showToast = (message, type = 'default', duration = 3000) => {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, duration);
};

const PREFIX = "(055) ";
export const phoneMask = (value) => {
    let digits = value.replace(/\D/g, ""); 
    if (digits.startsWith("055")) { digits = digits.substring(3); }
    digits = digits.substring(0, 6); 
    let formattedNumber = digits.length > 3 ? `${digits.substring(0, 3)}-${digits.substring(3)}` : digits;
    return PREFIX + formattedNumber;
}

export const atualizarRelogio = () => {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    els.dataVenda.value = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
};

export const toggleView = (viewName) => {
    els.mainCard.style.display = 'none';
    els.historyCard.style.display = 'none';
    els.adminPanel.style.display = 'none';
    els.dossierCard.style.display = 'none';
    
    document.body.classList.remove('history-view-active', 'dossier-view-active');

    if (viewName === 'history') {
        document.body.classList.add('history-view-active');
        els.historyCard.style.display = 'block';
        els.historyImg.src = historyBackgroundSrc;
        els.filtroHistorico.value = ''; 
        // displaySalesHistory(vendas); // Será chamado pelo módulo de calculadora
    } else if (viewName === 'admin') {
        els.adminPanel.style.display = 'block';
    } else if (viewName === 'dossier') {
        document.body.classList.add('dossier-view-active');
        els.dossierCard.style.display = 'block';
        // showDossierOrgs(); // Será chamado pelo módulo de dossiê
    } else {
        els.mainCard.style.display = 'block';
    }
    
    // Auto-scroll to top
    window.scrollTo(0, 0);
};

// --- FUNÇÕES DE TEMA ---

const toggleTheme = () => {
    const isDarkMode = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateLogoAndThemeButton(isDarkMode);
};

const updateLogoAndThemeButton = (isDarkMode) => {
    els.themeBtn.textContent = isDarkMode ? '☀️ Modo Claro' : '🌙 Modo Noturno';
    els.appLogo.src = isDarkMode ? logoDarkModeSrc : logoLightModeSrc;
    els.welcomeLogo.src = welcomeLogoSrc;
    els.historyImg.src = historyBackgroundSrc;
};

// --- FUNÇÕES DO LIGHTBOX (Usado no Dossiê) ---

export const showImageLightbox = (url) => {
    if (!url) return;
    els.lightboxImg.src = url;
    els.imageLightboxOverlay.style.display = 'block';
    els.imageLightboxModal.style.display = 'block';
};

export const closeImageLightbox = () => {
    els.imageLightboxOverlay.style.display = 'none';
    els.imageLightboxModal.style.display = 'none';
    els.lightboxImg.src = ''; 
};

// --- FUNÇÕES DO TUTORIAL ---

const tourSteps = [
    { element: 'qtyTickets', title: '1/5: Quantidades', content: 'Comece inserindo a quantidade de produtos que deseja calcular ou vender.' },
    { element: 'tipoValor', title: '2/5: Tipo de Valor', content: 'Selecione o tipo de pagamento. Isso afeta o preço final de cada item.' },
    { element: 'calcBtn', title: '3/5: Calcular', content: 'Clique aqui para ver os materiais necessários e o valor total da venda.' },
    { element: 'registerBtn', title: '4.5: Registrar Venda', content: 'Após calcular, preencha os dados do cliente e clique para salvar no histórico.' },
    { element: 'toggleHistoryBtn', title: '5/5: Ver Histórico', content: 'Acesse o histórico para ver, editar, apagar ou copiar vendas antigas.' }
];
let currentStepIndex = -1; let currentTooltip = null; let tourOverlay = null;

const clearTour = () => { 
    if(tourOverlay) { 
        tourOverlay.classList.remove('active'); 
        setTimeout(() => { if (tourOverlay && tourOverlay.parentNode) tourOverlay.parentNode.removeChild(tourOverlay); tourOverlay = null; }, 300); 
    } 
    if (currentTooltip) { 
        currentTooltip.classList.remove('active'); 
        setTimeout(() => { if (currentTooltip && currentTooltip.parentNode) currentTooltip.parentNode.removeChild(currentTooltip); currentTooltip = null; }, 300); 
    } 
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight')); 
    currentStepIndex = -1; 
};

// ***** ALTERAÇÃO FEITA AQUI *****
export const showNextTourStep = () => { 
    if (currentStepIndex >= 0) { 
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight')); 
        if(currentTooltip) currentTooltip.classList.remove('active'); 
    } 
    currentStepIndex++; 
    if (currentStepIndex >= tourSteps.length) { 
        showToast("Tutorial concluído!", "success"); 
        clearTour(); 
        return; 
    } 
    const step = tourSteps[currentStepIndex]; 
    const targetElement = els[step.element]; 
    if (!targetElement) { 
        clearTour(); 
        return; 
    } 
    if (currentStepIndex === 0) { 
        tourOverlay = document.createElement('div'); 
        tourOverlay.id = 'tour-overlay'; 
        document.body.appendChild(tourOverlay); 
        setTimeout(() => tourOverlay.classList.add('active'), 10); 
    } 
    targetElement.classList.add('tour-highlight'); 
    if(currentTooltip && currentTooltip.parentNode) document.body.removeChild(currentTooltip); 
    currentTooltip = document.createElement('div'); 
    currentTooltip.className = 'tour-tooltip'; 
    currentTooltip.innerHTML = `<h4>${step.title}</h4><p>${step.content}</p><div><button class="tourNextBtn">${currentStepIndex === tourSteps.length - 1 ? 'Finalizar' : 'Próximo'}</button><button class="tourSkipBtn">Pular</button></div>`; 
    document.body.appendChild(currentTooltip); 
    const rect = targetElement.getBoundingClientRect(); 
    let top = rect.top < currentTooltip.offsetHeight + 20 ? rect.bottom + window.scrollY + 10 : rect.top + window.scrollY - currentTooltip.offsetHeight - 10; 
    let left = Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - currentTooltip.offsetWidth - 20)); 
    currentTooltip.style.top = `${top}px`; 
    currentTooltip.style.left = `${left}px`; 
    setTimeout(() => currentTooltip.classList.add('active'), 10); 
    currentTooltip.querySelector('.tourNextBtn').onclick = showNextTourStep; 
    currentTooltip.querySelector('.tourSkipBtn').onclick = clearTour; 
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
};

// --- INICIALIZAÇÃO DA UI ---

export function initUI() {
    // Máscaras de input
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

    // Capitalização
    const camposParaCapitalizar = [ 
        els.nomeCliente, els.organizacao, els.negociadoras, els.vendaValorObs, 
        els.carroVeiculo, 
        els.addDossierNome, els.addDossierOrganizacao, els.addDossierCargo, 
        els.editDossierNome, els.editDossierCargo, 
        els.orgNome,
        els.addModalCarroNome, els.editModalCarroNome 
    ];
    camposParaCapitalizar.forEach(campo => {
      if (campo) {
        campo.addEventListener('input', (e) => {
          const { selectionStart, selectionEnd } = e.target;
          e.target.value = capitalizeText(e.target.value);
          e.target.setSelectionRange(selectionStart, selectionEnd);
        });
      }
    });
    
    // Relógio
    atualizarRelogio();
    setInterval(atualizarRelogio, 30000);

    // Tema
    const savedTheme = localStorage.getItem('theme') || 'light';
    if(savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    updateLogoAndThemeButton(savedTheme === 'dark');
    
    // Welcome Screen
    if (localStorage.getItem('hasVisited')) {
        els.welcomeScreen.style.display = 'none';
    } else {
        els.welcomeScreen.classList.add('show');
        els.authScreen.style.display = 'none';
        els.mainCard.style.display = 'none';
    }
    
    // Listeners de UI
    els.themeBtn.onclick = toggleTheme;
    
    // O listener do tutorial será sobrescrito em auth.js para checar o login
    els.tutorialBtn.onclick = () => { 
        toggleView('main'); 
        showNextTourStep(); 
    };
    els.logoLink.onclick = (e) => { e.preventDefault(); toggleView('main'); };
    els.enterBtn.onclick = () => {
        localStorage.setItem('hasVisited', 'true');
        els.welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            els.welcomeScreen.style.display = 'none';
        }, 500);
    };
    
    // Listeners do Lightbox
    els.imageLightboxOverlay.onclick = closeImageLightbox;
}