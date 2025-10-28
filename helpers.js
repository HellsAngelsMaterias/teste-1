/* ===============================================
  HELPERS.JS
  Funções utilitárias (formatação, UI, etc).
===============================================
*/

// --- Imports (CAMINHOS CORRIGIDOS)
import { els } from './dom.js';
import { 
    logoLightModeSrc, logoDarkModeSrc, welcomeLogoSrc, 
    historyBackgroundSrc, tourSteps 
} from './constantes.js';

// --- Formatação de Texto e Números ---

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

export const camposParaCapitalizar = [ 
    els.nomeCliente, els.organizacao, els.negociadoras, els.vendaValorObs,
    els.carroVeiculo, els.placaVeiculo,
    els.editDossierNome, els.editDossierCargo, els.addDossierNome, els.addDossierCargo,
    els.orgNome, els.orgInfo,
    els.editModalCarroNome, els.addModalCarroNome
];

export const getQty = (element) => {
  return parseInt(element.value, 10) || 0;
};

// --- Funções da Interface (UI) ---

export const showToast = (message, type = 'default', duration = 3000) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.prepend(toast); 
    
    setTimeout(() => toast.classList.add('show'), 10); 
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, { once: true });
    }, duration);
};

export const toggleView = (viewName) => {
  const views = {
    main: els.mainCard,
    history: els.historyCard,
    admin: els.adminPanel,
    dossier: els.dossierCard
  };
  
  // Esconde todas as views
  Object.values(views).forEach(view => view.style.display = 'none');
  
  // Mostra a view correta
  if (views[viewName]) {
      views[viewName].style.display = 'block';
  }
  
  // Ajusta o body class
  document.body.classList.toggle('history-view-active', viewName === 'history');
  document.body.classList.toggle('dossier-view-active', viewName === 'dossier');
};

export const updateLogoAndThemeButton = (isDark) => {
  const logo = document.getElementById('appLogo');
  const welcomeLogo = document.getElementById('welcomeLogo');
  const historyBg = document.getElementById('historyBackground')?.querySelector('img');
  
  if (isDark) {
    if(logo) logo.src = logoDarkModeSrc;
    if(welcomeLogo) welcomeLogo.src = logoDarkModeSrc;
    if(historyBg) historyBg.src = logoDarkModeSrc;
    els.themeBtn.textContent = '☀️ Modo Claro';
  } else {
    if(logo) logo.src = logoLightModeSrc;
    if(welcomeLogo) welcomeLogo.src = welcomeLogoSrc;
    if(historyBg) historyBg.src = historyBackgroundSrc;
    els.themeBtn.textContent = '🌙 Modo Noturno';
  }
};

export const toggleTheme = () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateLogoAndThemeButton(isDark);
};

export const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
        .then(() => showToast("Copiado para a área de transferência!", "success"))
        .catch(() => showToast("Falha ao copiar texto.", "error"));
};

// --- Máscaras de Input ---
export const PREFIX = "555-";
export const phoneMask = (value) => {
    let x = value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,4})/);
    return !x[2] ? PREFIX + (x[1] || '') : PREFIX + x[1] + '-' + x[2];
};

// --- Tutorial ---
let currentStepIndex = 0;
let currentTooltip = null;

const cleanupTour = () => {
    const overlay = document.getElementById('tour-overlay');
    if (overlay) document.body.removeChild(overlay);
    if (currentTooltip) document.body.removeChild(currentTooltip);
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    currentTooltip = null;
    currentStepIndex = 0;
};

export const showNextTourStep = () => {
    const step = tourSteps[currentStepIndex];
    if (!step) {
        cleanupTour();
        return;
    }
    
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    
    const targetElement = document.getElementById(step.element);
    if (!targetElement) {
        currentStepIndex++;
        showNextTourStep();
        return;
    }
    
    let tourOverlay = document.getElementById('tour-overlay');
    if (!tourOverlay) {
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
    
    currentTooltip.querySelector('.tourNextBtn').onclick = () => { 
        currentStepIndex++; 
        showNextTourStep(); 
    };
    currentTooltip.querySelector('.tourSkipBtn').onclick = cleanupTour;
};

// ===============================================
// ⭐️ CORREÇÃO: Relógio comentado para evitar o erro
// ===============================================

/*
function atualizarRelogio() {
  // O seu index.html não tem um elemento com id 'relogio-digital'
  // Por isso 'elRelogio' fica 'null' e dá erro na linha 114
  const elRelogio = document.getElementById('relogio-digital'); 
  
  if (elRelogio) { // Adicionar esta verificação também funcionaria
      const agora = new Date();
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      elRelogio.value = `${horas}:${minutos}`; // Linha 114 (a linha do erro)
  }
}

// Linha 116: Esta chamada imediata é que causa o erro
atualizarRelogio(); 
setInterval(atualizarRelogio, 60000);
*/
