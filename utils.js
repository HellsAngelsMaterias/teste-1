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
 * Exibe uma mensagem de toast na tela.
 */
export const showToast = (message, type = 'primary', duration = 3000) => {
    els.toastMessage.textContent = message;
    els.toastMessage.className = `toast show ${type}`;
    setTimeout(() => {
        els.toastMessage.classList.remove('show');
    }, duration);
};

/**
 * Obtém o valor numérico de um campo de quantidade, garantindo que seja um número inteiro não-negativo.
 */
export const getQty = (element) => {
    const value = parseInt(element.value, 10);
    return isNaN(value) || value < 0 ? 0 : value;
};

/**
 * Aplica a máscara de telefone (99) 99999-9999.
 */
export const phoneMask = (value) => {
    value = value.replace(/\D/g, ""); // Remove tudo o que não é dígito
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2"); // Coloca parênteses em volta dos dois primeiros dígitos
    value = value.replace(/(\d)(\d{4})$/, "$1-$2"); // Coloca hífen antes dos 4 últimos dígitos
    return value;
};

/**
 * Aplica a máscara de telefone e a lógica de capitalização aos campos relevantes.
 */
const applyMasksAndCapitalization = () => {
    // Máscara de telefone
    camposTelefone.forEach(field => {
        field.addEventListener('input', (e) => {
            e.target.value = phoneMask(e.target.value);
        });
    });
    
    // Capitalização de texto
    camposParaCapitalizar.forEach(field => {
        field.addEventListener('blur', (e) => {
            e.target.value = capitalizeText(e.target.value);
        });
    });
};

/**
 * Inicializa utilitários como máscaras e relógio.
 */
export const initializeUtils = () => {
    applyMasksAndCapitalization();
    atualizarRelogio();
    setInterval(atualizarRelogio, 60000); // Atualiza a cada minuto
};

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
        return `${seconds} Segundo${seconds > 1 ? 's' : ''}`;
    }
    if (minutes < 60) {
        return `${minutes} Minuto${minutes > 1 ? 's' : ''}`;
    }
    
    const remainingMinutes = minutes % 60;
    return `${hours} Hora${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` e ${remainingMinutes} Minuto${remainingMinutes > 1 ? 's' : ''}` : ''}`;
};