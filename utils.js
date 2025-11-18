export const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) { return 'R$ 0'; }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const capitalizeText = (text) => {
    if (!text) return '';
    
    const upperText = text.toUpperCase();
    
    // Exceções para Acrônimos
    if (upperText === 'CPF' || upperText === 'OUTROS' || upperText === 'CNPJ' || upperText === 'NKT') {
        return upperText;
    }
    if (text === 'dinheiro sujo') return 'Dinheiro Sujo';
    
    // Capitalização padrão (Primeira letra maiúscula)
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

export const phoneMask = (value) => {
    const PREFIX = "(055) ";
    let digits = value.replace(/\D/g, ""); 
    if (digits.startsWith("055")) { digits = digits.substring(3); }
    digits = digits.substring(0, 6); 
    let formattedNumber = digits.length > 3 ? `${digits.substring(0, 3)}-${digits.substring(3)}` : digits;
    return PREFIX + formattedNumber;
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