/* ===================================================
 * script.js
 * Arquivo Principal (Main)
 * Orquestra a inicialização de todos os módulos.
 * =================================================== */

// --- IMPORTS DOS MÓDULOS ---
import { initFirebase, db, ref, onValue } from './firebase.js'; 
import { initAuth, getCurrentUser } from './auth.js';
import { initUI, els, toggleView, showToast } from './ui.js';
import { initCalculator, setVendasListener, unloadVendas } from './calculator.js'; 
import { initAdmin, loadAdminPanel, updateUserActivity, monitorOnlineStatus } from './admin.js';
import { initDossier } from './dossier.js';


// --- STATE GLOBAL ---
let onlineUsersListener = null;
let layoutControlsListener = null;
let currentActivity = 'Iniciando'; 

// --- FUNÇÃO GLOBAL DE ATIVIDADE (CORREÇÃO) ---
/**
 * Define a atividade atual do usuário e a envia para o Firebase.
 */
export function setActivity(activity) { // <-- EXPORTADO
    currentActivity = activity;
    updateUserActivity(activity); 
}

// --- FUNÇÃO GLOBAL DE NAVEGAÇÃO (CORREÇÃO) ---
/**
 * Sobrescreve a função toggleView do ui.js para centralizar o controle
 * e adicionar o monitoramento de atividade.
 */
export function handleToggleView(viewName) { // <-- EXPORTADO
    toggleView(viewName); 
    
    // Define a atividade com base na tela
    switch(viewName) {
        case 'main':
            setActivity('Na Calculadora');
            break;
        case 'history':
            setActivity('Vendo Histórico');
            break;
        case 'admin':
            setActivity('No Painel Admin');
            break;
        case 'dossier':
            setActivity('Na Investigação');
            break;
        default:
            setActivity('Navegando');
    }
}

// --- LISTENERS GLOBAIS DO FIREBASE ---

/**
 * Ouve o nó /onlineStatus e atualiza o painel admin
 */
function monitorOnlineUsers() {
    if (onlineUsersListener) onlineUsersListener(); 
    
    const onlineRef = ref(db, 'onlineStatus');
    onlineUsersListener = onValue(onlineRef, (snapshot) => {
        const onlineUsers = snapshot.val() || {};
        loadAdminPanel(onlineUsers);
    });
}

/**
 * Ouve o nó /configuracoesGlobais/layout e atualiza a UI
 */
function monitorLayoutControls() {
    if (layoutControlsListener) layoutControlsListener(); 
    
    // Assumindo o nó 'configuracoesGlobais/layout' do seu modelo de regras
    const layoutRef = ref(db, 'configuracoesGlobais/layout'); 
    layoutControlsListener = onValue(layoutRef, (snapshot) => {
        if (snapshot.exists()) {
            const controls = snapshot.val();
            
            // Botão Modo Noturno
            if(els.themeBtn) els.themeBtn.style.display = controls.enableNightMode ? 'inline-block' : 'none';
            
            // Painel Inferior
            if(els.bottomPanel) els.bottomPanel.style.display = controls.enableBottomPanel ? 'flex' : 'none';
            if(els.bottomPanelDisplay) els.bottomPanelDisplay.textContent = controls.bottomPanelText || '';
        }
    });
}

// --- INICIALIZAÇÃO DO APP ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa o Firebase
    initFirebase(); 

    // 2. Inicializa os módulos
    initUI();
    initAuth();
    initCalculator();
    initAdmin();
    initDossier();
    
    // 3. Conecta os botões de navegação principais
    if(els.toggleHistoryBtn) els.toggleHistoryBtn.onclick = () => handleToggleView('history');
    if(els.toggleCalcBtn) els.toggleCalcBtn.onclick = () => handleToggleView('main');
    if(els.adminPanelBtn) els.adminPanelBtn.onclick = () => handleToggleView('admin');
    if(els.toggleCalcBtnAdmin) els.toggleCalcBtnAdmin.onclick = () => handleToggleView('main');
    if(els.investigacaoBtn) els.investigacaoBtn.onclick = () => handleToggleView('dossier');
    if(els.toggleCalcBtnDossier) els.toggleCalcBtnDossier.onclick = () => handleToggleView('main');
    
    // 4. Inicia os listeners globais
    monitorOnlineUsers();
    monitorLayoutControls();
    monitorOnlineStatus(); // Inicia o monitoramento de presença

    // 5. Inicia o "heartbeat" de atividade do usuário
    setInterval(() => {
        if (getCurrentUser()) {
            updateUserActivity(currentActivity);
        }
    }, 30000); // A cada 30 segundos
    
    console.log("Sistema modularizado inicializado.");
    setActivity('Online'); // Define a atividade inicial
});
