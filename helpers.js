/* ===============================================
  HELPERS.JS
  Funções utilitárias (formatação, UI, etc).
===============================================
*/

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

// --- Máscara de Telefone ---
export const PREFIX = "(055) ";
export const phoneMask = (value) => {
    let digits = value.replace(/\D/g, ""); 
    if (digits.startsWith("055")) { digits = digits.substring(3); }
    digits = digits.substring(0, 6); 
    let formattedNumber = digits.length > 3 ? `${digits.substring(0, 3)}-${digits.substring(3)}` : digits;
    return PREFIX + formattedNumber;
};

// Exporta os campos para o script.js principal adicionar os listeners
export const camposTelefone = [els.telefone, els.editDossierNumero, els.addDossierNumero];
export const camposParaCapitalizar = [ 
    els.nomeCliente, els.organizacao, els.negociadoras, els.vendaValorObs, 
    els.carroVeiculo, 
    els.addDossierNome, els.addDossierOrganizacao, els.addDossierCargo, 
    els.editDossierNome, els.editDossierCargo, 
    els.orgNome,
    els.addModalCarroNome, els.editModalCarroNome 
];


// --- Relógio ---
export const atualizarRelogio = () => {
    if (!els.dataVenda) return;
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    els.dataVenda.value = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
};

// --- Helpers de Input ---
export const getQty = (element) => Math.max(0, parseInt(element.value) || 0);

// --- Helpers de UI ---
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

export const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast("Mensagem copiada para o Discord!", "success");
      })
      .catch(err => {
        showToast("Erro ao copiar.", "error");
      });
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
        // A exibição do histórico é chamada pelo onValue em script.js
    } else if (viewName === 'admin') {
        els.adminPanel.style.display = 'block';
    } else if (viewName === 'dossier') {
        document.body.classList.add('dossier-view-active');
        els.dossierCard.style.display = 'block';
    } else {
        els.mainCard.style.display = 'block';
    }
};

// --- Tema (Claro/Escuro) ---
export const toggleTheme = () => {
    const isDarkMode = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateLogoAndThemeButton(isDarkMode);
};

export const updateLogoAndThemeButton = (isDarkMode) => {
    els.themeBtn.textContent = isDarkMode ? '☀️ Modo Claro' : '🌙 Modo Noturno';
    els.appLogo.src = isDarkMode ? logoDarkModeSrc : logoLightModeSrc;
    els.welcomeLogo.src = welcomeLogoSrc;
    els.historyImg.src = historyBackgroundSrc;
};

// --- Tutorial ---
let currentStepIndex = -1; 
let currentTooltip = null; 
let tourOverlay = null;

export const clearTour = () => { 
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
