/* ===================================================
 * script.js
 * Arquivo Principal (Main)
 * Orquestra a inicialização de todos os módulos.
 * =================================================== */

// --- IMPORTS DOS MÓDULOS ---
import { initFirebase } from './firebase.js';
import { initAuth, getCurrentUser } from './auth.js';
import { initUI, els, toggleView, showToast } from './ui.js';
import { initCalculator, loadVendas, setVendasListener } from './calculator.js';
import { initAdmin, loadAdminPanel, updateUserActivity, monitorOnlineStatus } from './admin.js'; // Adicionado monitorOnlineStatus
import { initDossier } from './dossier.js';
import { db, ref, onValue } from './firebase.js';

// --- STATE GLOBAL ---
let onlineUsersListener = null;
let layoutControlsListener = null;
let currentActivity = 'Iniciando'; // *** NOVO: Estado de Atividade ***

// --- FUNÇÃO GLOBAL DE ATIVIDADE ---
/**
 * Define a atividade atual do usuário e a envia para o Firebase.
 * *** NOVO ***
 */
export function setActivity(activity) {
    currentActivity = activity;
    updateUserActivity(activity); // Envia para o Firebase
}

// --- FUNÇÃO GLOBAL DE NAVEGAÇÃO ---
/**
 * Sobrescreve a função toggleView do ui.js para centralizar o controle
 * e adicionar o monitoramento de atividade.
 */
function handleToggleView(viewName) {
    toggleView(viewName); // Chama a função original do ui.js
    
    // *** NOVO: Define a atividade com base na tela ***
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
    if (onlineUsersListener) onlineUsersListener(); // Remove listener antigo
    
    const onlineRef = ref(db, 'onlineStatus');
    onlineUsersListener = onValue(onlineRef, (snapshot) => {
        const onlineUsers = snapshot.val() || {};
        loadAdminPanel(onlineUsers);
    });
}

/**
 * Ouve o nó /layoutControls e atualiza a UI
 */
function monitorLayoutControls() {
    if (layoutControlsListener) layoutControlsListener(); // Remove listener antigo
    
    const layoutRef = ref(db, 'layoutControls');
    layoutControlsListener = onValue(layoutRef, (snapshot) => {
        if (snapshot.exists()) {
            const controls = snapshot.val();
            
            // Botão Modo Noturno
            els.themeBtn.style.display = controls.enableNightMode ? 'inline-block' : 'none';
            
            // Painel Inferior
            els.bottomPanel.style.display = controls.enableBottomPanel ? 'flex' : 'none';
            els.bottomPanelDisplay.textContent = controls.bottomPanelText || '';
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
    
    // 3. Conecta os botões de navegação principais à nova função
    els.toggleHistoryBtn.onclick = () => handleToggleView('history');
    els.toggleCalcBtn.onclick = () => handleToggleView('main');
    els.adminPanelBtn.onclick = () => handleToggleView('admin');
    els.toggleCalcBtnAdmin.onclick = () => handleToggleView('main');
    els.investigacaoBtn.onclick = () => handleToggleView('dossier');
    els.toggleCalcBtnDossier.onclick = () => handleToggleView('main');

    // 4. Inicia os listeners globais
    monitorOnlineUsers();
    monitorLayoutControls();
    monitorOnlineStatus(); // Inicia o monitoramento de presença

    // 5. Inicia o "heartbeat" de atividade do usuário
    // *** ALTERAÇÃO AQUI: Passa a atividade atual ***
    setInterval(() => {
        if (getCurrentUser()) {
            updateUserActivity(currentActivity);
        }
    }, 30000); // A cada 30 segundos
    
    console.log("Sistema modularizado inicializado.");
    setActivity('Online'); // Define a atividade inicial
});
