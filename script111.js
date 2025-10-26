// Arquivo: script111.js (Novo Entry Point/Coordenador)
import { els } from './ui_elements.js';
import { initializeUtils, toggleTheme, updateLogoAndThemeButton, atualizarRelogio, showToast } from './utils.js';
import * as scriptLogic from './script111_logic.js';

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
// LISTENERS GLOBAIS
// =================================================================

// TELA DE BOAS-VINDAS
if (els.enterBtn) {
    els.enterBtn.addEventListener('click', () => {
        els.welcomeScreen.classList.remove('show');
        els.welcomeScreen.classList.add('hidden');
        localStorage.setItem('hasVisited', 'true');
        setTimeout(() => {
            els.welcomeScreen.style.display = 'none';
            els.authScreen.style.display = 'block';
            scriptLogic.monitorAuth(); // Inicia o monitoramento após a transição
        }, 500);
    });
}

// AUTENTICAÇÃO
els.loginBtn.addEventListener('click', scriptLogic.signIn);
els.registerUserBtn.addEventListener('click', scriptLogic.registerUser);
els.forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    scriptLogic.forgotPassword();
});
els.logoutBtn.addEventListener('click', scriptLogic.logout);

// NAVEGAÇÃO
els.toggleHistoryBtn.addEventListener('click', () => scriptLogic.toggleView('history'));
els.toggleCalcBtn.addEventListener('click', () => scriptLogic.toggleView('main'));
els.adminPanelBtn.addEventListener('click', () => scriptLogic.toggleView('admin'));
els.toggleCalcBtnAdmin.addEventListener('click', () => scriptLogic.toggleView('main'));

// INVESTIGAÇÃO/DOSSIÊ
els.investigacaoBtn.addEventListener('click', () => scriptLogic.toggleView('dossier'));
els.toggleCalcBtnDossier.addEventListener('click', () => scriptLogic.toggleView('main'));
els.dossierVoltarBtn.addEventListener('click', () => scriptLogic.loadAllOrgs());
els.addPessoaBtn.addEventListener('click', () => scriptLogic.openDossierModal('add'));
els.cancelNewDossierBtn.addEventListener('click', () => scriptLogic.toggleModal(els.addDossierModal, els.addDossierOverlay, false));
els.saveNewDossierBtn.addEventListener('click', () => scriptLogic.saveDossierEntry('add'));
els.cancelDossierBtn.addEventListener('click', () => scriptLogic.toggleModal(els.editDossierModal, els.editDossierOverlay, false));
els.saveDossierBtn.addEventListener('click', () => scriptLogic.saveDossierEntry('edit'));
els.deleteDossierBtn.addEventListener('click', scriptLogic.deleteDossierEntry);
els.addOrgBtn.addEventListener('click', () => scriptLogic.openOrgModal(null));
els.cancelOrgBtn.addEventListener('click', () => scriptLogic.toggleModal(els.orgModal, els.orgModalOverlay, false));
els.saveOrgBtn.addEventListener('click', scriptLogic.saveOrg);
els.deleteOrgBtn.addEventListener('click', scriptLogic.deleteOrg);
els.imageLightboxOverlay.addEventListener('click', scriptLogic.closeLightbox);
els.migrateDossierBtn.addEventListener('click', scriptLogic.migrateDossier);
els.migrateVeiculosBtn.addEventListener('click', scriptLogic.migrateVeiculos);

// LISTENERS DE FILTRO DO DOSSIÊ
scriptLogic.initializePeopleFilter();
scriptLogic.initializeOrgFilter();

// DOSSIÊ: VEÍCULOS (ADIÇÃO/EDIÇÃO)
els.addModalAddVeiculoBtn.addEventListener('click', () => scriptLogic.addEditVeiculo('add'));
els.editModalAddVeiculoBtn.addEventListener('click', () => scriptLogic.addEditVeiculo('edit'));
els.addModalCancelVeiculoBtn.addEventListener('click', () => scriptLogic.cancelVeiculoEdit('add'));
els.editModalCancelVeiculoBtn.addEventListener('click', () => scriptLogic.cancelVeiculoEdit('edit'));


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

// Inicia a aplicação após o DOM estar pronto
document.addEventListener('DOMContentLoaded', initializeUI);