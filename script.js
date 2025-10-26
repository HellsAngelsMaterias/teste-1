/* ===================================================
 * script.js (Principal)
 * Responsável por importar e inicializar
 * todos os módulos da aplicação.
 * =================================================== */

// --- IMPORTS DOS MÓDULOS ---
import { els, initUI, toggleView } from './ui.js';
import { initAuth } from './auth.js';
import { initCalculator } from './calculator.js';
import { initDossier } from './dossier.js';
import { initAdmin } from './admin.js';

// --- INICIALIZAÇÃO QUANDO O DOM ESTIVER PRONTO ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Inicializa a UI (botões de tema, máscaras, etc.)
    initUI();
    
    // 2. Inicializa os listeners da Calculadora
    initCalculator();
    
    // 3. Inicializa os listeners do Dossiê
    initDossier();
    
    // 4. Inicializa os listeners do Admin
    initAdmin();
    
    // 5. Inicializa a Autenticação (POR ÚLTIMO)
    // Isso vai disparar o onAuthStateChanged, que por sua vez
    // vai carregar os dados (vendas, etc.)
    initAuth();
    
    
    // --- LIGA OS BOTÕES DE NAVEGAÇÃO PRINCIPAIS ---
    // (Que dependem de `toggleView` de ui.js)
    
    // Botão "Voltar à Calculadora" do Histórico
    els.toggleCalcBtn.onclick = () => toggleView('main');
    
    // Botão "Voltar à Calculadora" do Dossiê
    els.toggleCalcBtnDossier.onclick = () => toggleView('main');

    // Botão "Voltar à Calculadora" do Admin
    els.toggleCalcBtnAdmin.onclick = () => toggleView('main');
    
    // Botão "Ver Histórico" (Calculadora)
    // (Este já está em initCalculator(), pois precisa chamar displaySalesHistory)
    
    // Botão "Investigação" (Header)
    // (Este já está em initDossier(), pois precisa chamar showDossierOrgs)
    
    // Botão "Painel Admin" (Calculadora)
    // (Este já está em initAdmin(), pois precisa chamar loadAdminPanel)
});