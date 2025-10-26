// Arquivo: script.js (Entry Point/Coordenador) - Corrigido de script111.js
import { els } from './ui_elements.js';

// Removendo 'updateLogoAndThemeButton' pois ela deve ser chamada via scriptLogic
import { initializeUtils, toggleTheme, atualizarRelogio, showToast } from './utils.js';

// CORRIGIDO: Importa a lógica principal do arquivo correto (script_logic.js)
import * as scriptLogic from './script_logic.js';

// Expor a lógica principal para acesso via onclick/onchange (necessário no código gerado dinamicamente)
window.scriptLogic = scriptLogic;

// =================================================================
// FUNÇÕES DE INICIALIZAÇÃO DA UI
// =================================================================

const initializeUI = () => {
    // 1. Inicializa o relógio, máscaras e capitalização
    initializeUtils(); 
    
    // 2. Configura o tema salvo
    const savedTheme = localStorage.getItem('theme') || 'light';
    if(savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    // Agora scriptLogic.updateLogoAndThemeButton funciona pois a função foi exportada no script_logic.js
    scriptLogic.updateLogoAndThemeButton(savedTheme === 'dark');
    
    // 3. Gerencia a tela de boas-vindas
    if (localStorage.getItem('hasVisited')) {
        els.welcomeScreen.style.display = 'none';
        els.authScreen.style.display = 'block';
        scriptLogic.monitorAuth(); // Inicia o monitoramento de autenticação
    } else {
        els.welcomeScreen.classList.add('show');
    }
};

// =================================================================
// LISTENERS DE EVENTOS
// =================================================================

// INICIALIZAÇÃO
els.enterBtn.addEventListener('click', () => {
    localStorage.setItem('hasVisited', 'true');
    els.welcomeScreen.classList.remove('show');
    els.authScreen.style.display = 'block';
    scriptLogic.monitorAuth();
});

// AUTENTICAÇÃO
els.loginBtn.addEventListener('click', scriptLogic.signIn);
els.registerUserBtn.addEventListener('click', scriptLogic.registerUser);
els.forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault(); 
    scriptLogic.forgotPassword();
});
els.logoutBtn.addEventListener('click', scriptLogic.logout);
// Adiciona listener para enter nos campos de login/senha
document.querySelectorAll('#username, #password').forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            scriptLogic.signIn();
        }
    });
});

// NAVEGAÇÃO
els.toggleHistoryBtn.addEventListener('click', () => scriptLogic.toggleView('history'));
els.toggleMainBtn.addEventListener('click', () => scriptLogic.toggleView('main'));
els.toggleMainBtnAdmin.addEventListener('click', () => scriptLogic.toggleView('main'));
els.toggleMainBtnDossier.addEventListener('click', () => scriptLogic.toggleView('main'));
els.adminPanelBtn.addEventListener('click', () => scriptLogic.toggleView('admin'));
els.investigacaoBtn.addEventListener('click', () => scriptLogic.toggleView('dossier'));
els.logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (els.mainCard.style.display === 'block') {
        scriptLogic.toggleView('main'); // Garante que volta para a calculadora
    }
});


// CALCULADORA E REGISTRO
els.qtyTickets.addEventListener('input', scriptLogic.calculate);
els.qtyTablets.addEventListener('input', scriptLogic.calculate);
els.qtyNitro.addEventListener('input', scriptLogic.calculate);
els.tipoValor.addEventListener('change', scriptLogic.calculate);
els.calcBtn.addEventListener('click', scriptLogic.calculate);
els.registerBtn.addEventListener('click', scriptLogic.registerSale);
els.resetBtn.addEventListener('click', scriptLogic.clearAllFields);
els.discordBtnCalc.addEventListener('click', scriptLogic.copyToDiscord);

// HISTÓRICO
els.clearHistoryBtn.addEventListener('click', scriptLogic.clearHistory);
els.csvBtn.addEventListener('click', scriptLogic.exportToCSV);
scriptLogic.initializeHistoryFilter();

// TEMA
els.themeBtn.addEventListener('click', toggleTheme);

// ADMIN PANEL (CONFIGURAÇÕES GLOBAIS)
if (els.layoutToggleNightMode) {
    els.layoutToggleNightMode.addEventListener('change', (e) => {
        scriptLogic.updateGlobalLayoutSetting('enableNightMode', e.target.checked);
    });
}
if (els.layoutToggleBottomPanel) {
    els.layoutToggleBottomPanel.addEventListener('change', (e) => {
        scriptLogic.updateGlobalLayoutSetting('enableBottomPanel', e.target.checked);
    });
}
if (els.saveBottomPanelTextBtn) {
    els.saveBottomPanelTextBtn.addEventListener('click', () => {
        scriptLogic.updateGlobalLayoutSetting('bottomPanelText', els.bottomPanelText.value);
    });
}
if (els.userFilter) {
    scriptLogic.initializeUserFilter();
}
// Abas do Admin
document.querySelectorAll('#adminPanel .tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Desativa a aba ativa
        document.querySelector('#adminPanel .tab-btn.active').classList.remove('active');
        document.querySelector('#adminPanel .tab-content.active').classList.remove('active');
        
        // Ativa a nova aba
        const target = e.target.getAttribute('data-tab');
        e.target.classList.add('active');
        document.getElementById(`tab-${target}`).classList.add('active');
    });
});


// NOVO: GERENCIAMENTO DE VEÍCULOS NA CALCULADORA
els.addVeiculoBtn.addEventListener('click', scriptLogic.addVeiculoFromCalc);

// DOSSIÊ
els.addPersonBtn.addEventListener('click', () => scriptLogic.openDossierModal('add'));
els.addOrgBtn.addEventListener('click', () => scriptLogic.openOrgModal('add'));
els.cancelNewDossierBtn.addEventListener('click', () => scriptLogic.toggleModal(els.addDossierModal, els.modalOverlay, false));
els.saveNewDossierBtn.addEventListener('click', scriptLogic.saveDossierEntry);
els.deleteDossierBtn.addEventListener('click', scriptLogic.deleteDossierEntry);
els.cancelOrgBtn.addEventListener('click', () => scriptLogic.toggleModal(els.orgModal, els.orgModalOverlay, false));
els.saveOrgBtn.addEventListener('click', scriptLogic.saveOrg);
els.deleteOrgBtn.addEventListener('click', scriptLogic.deleteOrg);

// Listeners dos filtros de dossiê
if (els.personFilter) {
    scriptLogic.initializePeopleFilter();
}
if (els.orgFilter) {
    scriptLogic.initializeOrgFilter();
}
// Abas do Dossiê
document.querySelectorAll('#dossierCard .tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Desativa a aba ativa
        document.querySelector('#dossierCard .tab-btn.active').classList.remove('active');
        document.querySelector('#dossierCard .tab-content.active').classList.remove('active');
        
        // Ativa a nova aba
        const target = e.target.getAttribute('data-tab');
        e.target.classList.add('active');
        document.getElementById(`tab-${target}`).classList.add('active');
        
        // Se for a aba de organizações, recarrega a lista
        if (target === 'organizations') {
            scriptLogic.loadAllOrgs();
        } else if (target === 'people') {
            // Se for a aba de pessoas, recarrega a lista
            if(scriptLogic.getCurrentDossierOrg()) {
                scriptLogic.loadDossier(scriptLogic.getCurrentDossierOrg());
            } else {
                scriptLogic.loadDossier(null); // Carrega todos, se não houver organização selecionada
            }
        }
    });
});

// NOVO: GERENCIAMENTO DE VEÍCULOS NO MODAL DO DOSSIÊ
els.addModalAddVeiculoBtn.addEventListener('click', scriptLogic.addVeiculoFromModal);

// =================================================================
// INICIALIZAÇÃO
// =================================================================

initializeUI();