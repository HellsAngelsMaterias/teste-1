// Arquivo: utils.js
import { els, camposTelefone, camposParaCapitalizar } from './ui_elements.js';
import { PREFIX } from './constants.js';

/**
 * Formata um número como moeda brasileira (R$ 100.000).
 */
export const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) { return 'R$ 0'; }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

/**
 * Capitaliza um texto, mantendo acrônimos (CPF, NKT) e "Dinheiro Sujo".
 */
export const capitalizeText = (text) => {
    if (!text) return '';
    
    const upperText = text.toUpperCase();
    
    // Exceções para Acrônimos (CNPJ, CPF, OUTROS, NKT)
    if (upperText === 'CPF' || upperText === 'OUTROS' || upperText === 'CNPJ' || upperText === 'NKT') {
        return upperText;
    }
    if (text === 'dinheiro sujo') return 'Dinheiro Sujo';
    
    // Lógica original (Capitalização de Sentença/Palavra)
    return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

/**
 * Exibe uma notificação 'toast' na tela.
 */
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

/**
 * Retorna a quantidade de um input, garantindo que seja um número não-negativo.
 */
export const getQty = (element) => Math.max(0, parseInt(element.value) || 0);

/**
 * Aplica a máscara de telefone (055) XXX-XXX.
 */
export const phoneMask = (value) => {
    let digits = value.replace(/\D/g, ""); 
    if (digits.startsWith("055")) { digits = digits.substring(3); }
    digits = digits.substring(0, 6); 
    let formattedNumber = digits.length > 3 ? `${digits.substring(0, 3)}-${digits.substring(3)}` : digits;
    return PREFIX + formattedNumber;
}

/**
 * Inicializa a lógica de máscara de telefone nos campos relevantes.
 */
export const initializePhoneMasks = () => {
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
}

/**
 * Inicializa a lógica de capitalização de texto nos campos relevantes.
 */
export const initializeCapitalizeFields = () => {
    camposParaCapitalizar.forEach(campo => {
        if (campo) {
            campo.addEventListener('input', (e) => {
                const { selectionStart, selectionEnd } = e.target;
                e.target.value = capitalizeText(e.target.value);
                e.target.setSelectionRange(selectionStart, selectionEnd);
            });
        }
    });
    // Não capitalizar Instagram
    if (els.editDossierInstagram) {
        els.editDossierInstagram.addEventListener('input', (e) => {
            // Deixa o usuário digitar livremente
        });
    }
}

/**
 * Atualiza o relógio no campo dataVenda.
 */
export const atualizarRelogio = () => {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    if (els.dataVenda) {
        els.dataVenda.value = `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }
};

/**
 * Formata o tempo de inatividade em minutos, horas ou segundos.
 */
export const formatInactivityTime = (inactivityMs) => {
    const seconds = Math.floor(inactivityMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 5) {
        return "Agora";
    }
    if (seconds < 60) {
        return `${seconds} Segundos`;
    }
    if (minutes < 60) {
        return `${minutes} Minuto${minutes > 1 ? 's' : ''}`;
    }
    
    const remainingMinutes = minutes % 60;
    if (hours < 2) {
         return `1 Hora e ${remainingMinutes} Minutos`;
    }
    return `${hours} Horas e ${remainingMinutes} Minutos`;
}

/**
 * Inicializa a função de relógio e máscara/capitalização de campos.
 */
export const initializeUtils = () => {
    atualizarRelogio();
    setInterval(atualizarRelogio, 30000);
    initializePhoneMasks();
    initializeCapitalizeFields();
}