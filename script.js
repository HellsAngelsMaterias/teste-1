// VARIÁVEIS GLOBAIS E DE ESTADO
let currentUser = null;
let currentUserData = null;
let vendas = [];
let dossiePessoas = [];
let dossieOrganizacoes = [];
let vendasListener = null; // Para guardar o listener do Firestore

// Variáveis para edição (evita perder dados ao trocar de aba)
let vendaOriginalCliente = null;
let vendaOriginalOrganizacao = null;

// Configuração de dados de Dossiê (Hierarquia)
let orgsComHierarquia = [];

// =========================================================================================================
// 1. SELETORES DE ELEMENTOS (els)
// =========================================================================================================

const els = {
    // Telas e Cards Principais
    authScreen: document.getElementById('authScreen'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    mainCard: document.getElementById('mainCard'),
    historyCard: document.getElementById('historyCard'),
    dossierCard: document.getElementById('dossierCard'),
    adminPanel: document.getElementById('adminPanel'),
    
    // Header e Controles
    themeToggleButton: document.getElementById('themeToggleButton'),
    appLogo: document.getElementById('appLogo'),
    userStatus: document.getElementById('userStatus'),
    investigacaoBtn: document.getElementById('investigacaoBtn'),
    historyBtn: document.getElementById('historyBtn'),
    dossierBtn: document.getElementById('dossierBtn'),
    adminBtn: document.getElementById('adminBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Welcome Screen
    enterBtn: document.getElementById('enterBtn'),

    // Autenticação
    authUsername: document.getElementById('authUsername'),
    authPassword: document.getElementById('authPassword'),
    loginBtn: document.getElementById('loginBtn'),
    authMessage: document.getElementById('authMessage'),

    // Venda/Entrada
    inputPlaca: document.getElementById('placaVeiculo'),
    inputCliente: document.getElementById('nomeCliente'),
    inputOrganizacao: document.getElementById('nomeOrganizacao'),
    inputValor: document.getElementById('valorVenda'),
    inputObservacao: document.getElementById('observacao'),
    inputStatus: document.getElementById('statusVenda'),
    
    btnGerenciarVeiculos: document.getElementById('btnGerenciarVeiculos'),
    btnCadastrar: document.getElementById('btnCadastrar'),
    btnSalvarEdicao: document.getElementById('btnSalvarEdicao'),
    btnCancelarEdicao: document.getElementById('btnCancelarEdicao'),

    // Histórico
    historyTableBody: document.getElementById('historyTableBody'),
    
    // Dossiê
    dossierPeopleGrid: document.getElementById('dossierPeopleGrid'),
    dossierOrgGrid: document.getElementById('dossierOrgGrid'),
    btnNovaPessoa: document.getElementById('btnNovaPessoa'),
    btnNovaOrganizacao: document.getElementById('btnNovaOrganizacao'),
    inputBuscaDossier: document.getElementById('inputBuscaDossier'),
    
    // Modais
    modalOverlay: document.getElementById('modalOverlay'),
    veiculoModalContent: document.getElementById('veiculoModalContent'),
    modalListaVeiculos: document.getElementById('modalListaVeiculos'),
    inputAddVeiculoPlaca: document.getElementById('inputAddVeiculoPlaca'),
    inputAddVeiculoModelo: document.getElementById('inputAddVeiculoModelo'),
    inputAddVeiculoCor: document.getElementById('inputAddVeiculoCor'),
    btnAddVeiculo: document.getElementById('btnAddVeiculo'),
    modalVeiculosTableBody: document.getElementById('modalVeiculosTableBody'),
    
    // Tour
    tourOverlay: document.getElementById('tour-overlay'),
    
    // Lightbox
    imageLightboxModal: document.getElementById('imageLightboxModal'),
    lightboxImg: document.getElementById('lightboxImg')
};

// =========================================================================================================
// 2. CONFIGURAÇÃO DO FIREBASE (Placeholder)
// =========================================================================================================

/* * ATENÇÃO: Substitua os placeholders abaixo pelas suas credenciais reais do Firebase!
 * Este código não funcionará sem uma configuração válida.
 */
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inicializa o Firebase
// const app = firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// const db = firebase.firestore();

// Funções utilitárias de Firebase (Simuladas)
const simularUsuario = (uid, username, role) => ({
    uid: uid,
    username: username,
    role: role,
    placa: 'HA0000',
    email: `${username}@hells.com`
});

const simularLogin = async (username, password) => {
    // Simulação de autenticação
    await new Promise(resolve => setTimeout(resolve, 500)); 
    if (username === 'admin' && password === 'admin123') {
        return simularUsuario('admin_uid', 'Admin HA', 'admin');
    }
    if (username === 'hells' && password === 'hells123') {
        return simularUsuario('hells_uid', 'Hell's Angel', 'hells');
    }
    return null;
};

// =========================================================================================================
// 3. FUNÇÕES DE UTILIDADE E UI
// =========================================================================================================

/**
 * Exibe uma notificação pop-up.
 * @param {string} message - A mensagem a exibir.
 * @param {string} type - Tipo da notificação ('success', 'error', 'default').
 */
function showToast(message, type = 'default') {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}

/**
 * Alterna entre o tema claro e escuro.
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateLogoAndThemeButton(isDark);
    showToast(`Tema ${isDark ? 'Escuro' : 'Claro'} ativado.`, 'default');
}

/**
 * Atualiza o logo e o texto do botão de tema baseado no tema.
 * @param {boolean} isDark - Se o tema escuro está ativo.
 */
function updateLogoAndThemeButton(isDark) {
    if (els.appLogo) {
        els.appLogo.src = isDark ? 'logo-light.png' : 'logo-dark.png';
        els.themeToggleButton.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
    }
}

/**
 * Alterna a visualização principal entre as diferentes abas.
 * @param {string} view - A aba a mostrar ('main', 'history', 'dossier', 'admin').
 */
function toggleView(view) {
    // 1. Esconde todas as views e remove classes de layout
    [els.mainCard, els.historyCard, els.dossierCard, els.adminPanel].forEach(card => card.style.display = 'none');
    document.body.classList.remove('history-view-active', 'dossier-view-active');

    // 2. Define a nova view e adiciona classes de layout
    if (view === 'history') {
        els.historyCard.style.display = 'block';
        document.body.classList.add('history-view-active');
        loadHistory(); 
        showToast("Histórico carregado.", 'default');
    } else if (view === 'dossier') {
        els.dossierCard.style.display = 'block';
        document.body.classList.add('dossier-view-active');
        loadDossier();
        showToast("Dossiê carregado.", 'default');
    } else if (view === 'admin') {
        els.adminPanel.style.display = 'block';
        // loadAdminPanel(); // Implementar função de admin
        showToast("Painel de Admin carregado.", 'default');
    } else { // main (Padrão/Nova Entrada)
        els.mainCard.style.display = 'block';
        resetFormulario();
        showToast("Nova Entrada pronta.", 'default');
    }
}

// =========================================================================================================
// 4. LÓGICA DE AUTENTICAÇÃO E INICIALIZAÇÃO
// =========================================================================================================

/**
 * Lida com a tentativa de login do usuário.
 */
async function loginUser() {
    const username = els.authUsername.value.trim();
    const password = els.authPassword.value;
    
    if (!username || !password) {
        els.authMessage.textContent = 'Preencha usuário e senha.';
        return;
    }
    
    els.loginBtn.disabled = true;
    els.authMessage.textContent = 'Aguarde...';

    try {
        // const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = await simularLogin(username, password);
        
        if (user) {
            currentUser = user;
            currentUserData = user; // Em um app real, buscaria o resto dos dados do Firestore
            
            checkAuthStatus(currentUser);
            els.authMessage.textContent = 'Login bem-sucedido!';
            showToast(`Bem-vindo, ${currentUserData.username}!`, 'success');

            // Inicia o Tour se for o primeiro login (ou se a flag for resetada)
            if (localStorage.getItem('runTour') === 'true') {
                 startTour();
                 localStorage.removeItem('runTour');
            }
        } else {
            els.authMessage.textContent = 'Credenciais Inválidas. Tente novamente.';
            showToast('Erro de login: Credenciais Inválidas.', 'error');
        }

    } catch (error) {
        console.error("Erro no Login:", error);
        els.authMessage.textContent = 'Falha no Login. Verifique sua conexão.';
        showToast('Falha no Login. Tente novamente.', 'error');
    } finally {
        els.loginBtn.disabled = false;
        els.authPassword.value = ''; // Sempre limpa a senha
    }
}

/**
 * Lida com o logout do usuário.
 */
function logoutUser() {
    // auth.signOut();
    currentUser = null;
    checkAuthStatus(currentUser);
    showToast('Você saiu com sucesso.', 'default');
}

/**
 * Verifica o status de autenticação e atualiza a UI.
 * (Função chamada no 'onAuthStateChanged' real do Firebase)
 * @param {Object} user - O objeto de usuário autenticado.
 */
function checkAuthStatus(user) {
    if (user) {
        currentUser = user; 
        
        // 1. Atualiza o status
        const role = currentUserData.role || 'visitante';
        els.userStatus.textContent = role.toUpperCase();
        els.userStatus.className = `user-status-display tag-${role}`;
        els.userStatus.style.display = 'block';
        
        // 2. Mostra as telas corretas
        els.authScreen.style.display = 'none';
        els.mainCard.style.display = 'block';
        els.historyBtn.style.display = 'block';
        els.dossierBtn.style.display = 'block';
        els.logoutBtn.style.display = 'block';

        // 3. Permissões
        if (role === 'admin') {
            els.adminBtn.style.display = 'block';
            els.investigacaoBtn.style.display = 'block';
        } else if (role === 'hells') {
            els.adminBtn.style.display = 'none';
            els.investigacaoBtn.style.display = 'block';
        } else {
            els.adminBtn.style.display = 'none';
            els.investigacaoBtn.style.display = 'none';
        }

        // 4. Inicia o listener de vendas (simulado)
        // startVendasListener();

    } else {
        currentUser = null;
        currentUserData = null;
        // if (vendasListener) vendasListener(); // Desliga o listener real

        // Limpa estado de edição
        vendaOriginalCliente = null;
        vendaOriginalOrganizacao = null;

        // Esconde telas
        els.authScreen.style.display = 'block';
        els.mainCard.style.display = 'none';
        els.historyCard.style.display = 'none';
        els.adminPanel.style.display = 'none';
        els.dossierCard.style.display = 'none';
        
        // Esconde controles
        if(els.userStatus) els.userStatus.style.display = 'none';
        if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
        if(els.historyBtn) els.historyBtn.style.display = 'none';
        if(els.dossierBtn) els.dossierBtn.style.display = 'none';
        if(els.adminBtn) els.adminBtn.style.display = 'none';
        if(els.logoutBtn) els.logoutBtn.style.display = 'none';
    }
}

// =========================================================================================================
// 5. LÓGICA DE VENDAS (ENTRADA PRINCIPAL)
// =========================================================================================================

/**
 * Reseta o formulário principal e o estado de edição.
 */
function resetFormulario() {
    els.inputPlaca.value = '';
    els.inputCliente.value = '';
    els.inputOrganizacao.value = '';
    els.inputValor.value = '';
    els.inputObservacao.value = '';
    els.inputStatus.value = 'ativo'; // Padrão
    
    // Limpa a lista de veículos temporária
    els.modalVeiculosTableBody.innerHTML = ''; 
    
    // Reseta botões
    els.btnCadastrar.style.display = 'block';
    els.btnSalvarEdicao.style.display = 'none';
    els.btnCancelarEdicao.style.display = 'none';
    
    // Limpa estado de edição
    vendaOriginalCliente = null;
    vendaOriginalOrganizacao = null;
}

/**
 * Coleta os dados do formulário principal.
 */
function coletarDadosEntrada() {
    const placa = els.inputPlaca.value.toUpperCase().trim();
    const cliente = els.inputCliente.value.trim();
    const organizacao = els.inputOrganizacao.value.trim();
    const valor = parseFloat(els.inputValor.value) || 0;
    const observacao = els.inputObservacao.value.trim();
    const status = els.inputStatus.value;
    
    // Pega os veículos da tabela do modal (Simulação)
    const veiculos = Array.from(els.modalVeiculosTableBody.querySelectorAll('.veiculo-item-modal')).map(item => ({
        placa: item.querySelector('span:nth-child(1)').textContent,
        modelo: item.querySelector('span:nth-child(2)').textContent,
        cor: item.querySelector('span:nth-child(3)').textContent
    }));

    if (!cliente || !placa) {
        showToast('Placa e Nome do Cliente são obrigatórios!', 'error');
        // Adicionar classes de inválido
        if (!placa) els.inputPlaca.classList.add('input-invalido');
        if (!cliente) els.inputCliente.classList.add('input-invalido');
        return null;
    }
    
    [els.inputPlaca, els.inputCliente].forEach(el => el.classList.remove('input-invalido'));

    return { 
        placa, 
        cliente, 
        organizacao, 
        valor, 
        observacao, 
        status, 
        veiculos,
        timestamp: new Date().getTime(),
        createdBy: currentUserData.username || 'Desconhecido'
    };
}

/**
 * Simula o cadastro de uma nova entrada no banco.
 */
async function cadastrarEntrada() {
    const dados = coletarDadosEntrada();
    if (!dados) return;

    // Simulação de salvamento no Firestore
    showToast('Cadastrando entrada...', 'default');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Adiciona a entrada ao array de histórico simulado (em um app real, seria um push no DB)
    dados.id = 'ID-' + (Math.random() * 10000).toFixed(0); 
    vendas.push(dados);

    showToast(`Entrada para ${dados.cliente} cadastrada com sucesso!`, 'success');
    resetFormulario();
}

/**
 * Simula a edição e salvamento de uma entrada existente.
 */
async function salvarEdicaoEntrada() {
    const dadosEditados = coletarDadosEntrada();
    if (!dadosEditados || !vendaOriginalCliente) return; 

    // Simulação de salvamento
    showToast('Salvando edição...', 'default');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Encontra e substitui no array simulado (em um app real, seria um update no DB)
    const index = vendas.findIndex(v => v.id === vendaOriginalCliente.id);
    if (index !== -1) {
        vendas[index] = { ...dadosEditados, id: vendaOriginalCliente.id }; // Mantém o ID original
    }
    
    showToast(`Edição para ${dadosEditados.cliente} salva com sucesso!`, 'success');
    resetFormulario();
}

/**
 * Entra no modo de edição para uma entrada específica do histórico.
 * @param {string} id - O ID da entrada a ser editada.
 */
function editarEntrada(id) {
    const entrada = vendas.find(v => v.id === id);
    if (!entrada) return showToast('Entrada não encontrada.', 'error');

    // 1. Guarda a cópia original e define o modo de edição
    vendaOriginalCliente = entrada;
    toggleView('main'); // Volta para a tela principal

    // 2. Preenche o formulário
    els.inputPlaca.value = entrada.placa;
    els.inputCliente.value = entrada.cliente;
    els.inputOrganizacao.value = entrada.organizacao;
    els.inputValor.value = entrada.valor.toFixed(2);
    els.inputObservacao.value = entrada.observacao;
    els.inputStatus.value = entrada.status;
    
    // 3. Preenche os veículos no modal temporário
    renderVehiclesModal(entrada.veiculos);

    // 4. Alterna botões
    els.btnCadastrar.style.display = 'none';
    els.btnSalvarEdicao.style.display = 'block';
    els.btnCancelarEdicao.style.display = 'block';

    showToast(`Modo de edição: ${entrada.cliente}.`, 'default');
}

// =========================================================================================================
// 6. LÓGICA DO HISTÓRICO
// =========================================================================================================

/**
 * Simula o carregamento e renderização do histórico de vendas.
 */
function loadHistory() {
    // Ordena as vendas pela mais recente
    const historicoOrdenado = vendas.sort((a, b) => b.timestamp - a.timestamp);
    
    els.historyTableBody.innerHTML = ''; // Limpa a tabela

    if (historicoOrdenado.length === 0) {
        els.historyTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Nenhum registro de entrada encontrado.</td></tr>`;
        return;
    }

    historicoOrdenado.forEach(entrada => {
        const date = new Date(entrada.timestamp);
        const dataFormatada = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaFormatada = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const row = els.historyTableBody.insertRow();
        row.innerHTML = `
            <td>${entrada.placa}</td>
            <td>${entrada.cliente}</td>
            <td>${entrada.organizacao || '-'}</td>
            <td>${entrada.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })}</td>
            <td class="valor-total-cell">
                <span>${entrada.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })}</span>
                <span class="valor-obs-text">${entrada.observacao || '-'}</span>
            </td>
            <td>${entrada.status}</td>
            <td>
                <span class="history-datetime-line">${dataFormatada}</span>
                <span class="history-datetime-line">${horaFormatada}</span>
            </td>
            <td>${entrada.createdBy}</td>
            <td class="history-actions-cell">
                <button class="action-btn muted" onclick="visualizarEntrada('${entrada.id}')">Ver</button>
                <button class="action-btn primary" onclick="editarEntrada('${entrada.id}')">Editar</button>
            </td>
        `;
    });
}

/**
 * Simula a visualização detalhada de uma entrada.
 * @param {string} id - O ID da entrada.
 */
function visualizarEntrada(id) {
    const entrada = vendas.find(v => v.id === id);
    if (!entrada) return showToast('Detalhes não encontrados.', 'error');

    let veiculosHtml = entrada.veiculos.map(v => 
        `<li>${v.placa} - ${v.modelo} (${v.cor})</li>`
    ).join('');
    veiculosHtml = veiculosHtml ? `<ul>${veiculosHtml}</ul>` : 'Nenhum veículo registrado.';

    // Utiliza um modal genérico para exibir os detalhes
    const details = `
        <h2>Detalhes da Entrada</h2>
        <p><strong>Cliente:</strong> ${entrada.cliente}</p>
        <p><strong>Placa Principal:</strong> ${entrada.placa}</p>
        <p><strong>Organização:</strong> ${entrada.organizacao || 'N/A'}</p>
        <p><strong>Valor:</strong> ${entrada.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })}</p>
        <p><strong>Status:</strong> ${entrada.status}</p>
        <p><strong>Observação:</strong> ${entrada.observacao || 'N/A'}</p>
        <h4>Veículos Adicionais:</h4>
        ${veiculosHtml}
        <p style="margin-top: 15px;"><strong>Registrado por:</strong> ${entrada.createdBy} em ${new Date(entrada.timestamp).toLocaleString('pt-BR')}</p>
        <div class="actions" style="justify-content: flex-end;">
            <button class="muted" onclick="hideModal()">Fechar</button>
            <button class="primary" onclick="editarEntrada('${entrada.id}')">Editar</button>
        </div>
    `;
    
    showGenericModal(details, 550);
}

// =========================================================================================================
// 7. LÓGICA DE GERENCIAMENTO DE VEÍCULOS (Modal)
// =========================================================================================================

/**
 * Renderiza a lista de veículos na tabela dentro do modal.
 * @param {Array} vehicles - Lista de objetos de veículos.
 */
function renderVehiclesModal(vehicles) {
    els.modalVeiculosTableBody.innerHTML = '';
    
    // Se não for fornecido, tenta buscar os veículos que já estão sendo editados (se houver)
    const currentVehicles = vehicles || (vendaOriginalCliente ? vendaOriginalCliente.veiculos : []);
    
    if (currentVehicles.length === 0) {
        els.modalVeiculosTableBody.innerHTML = '<div style="text-align: center; color: var(--cor-texto); font-size: 13px;">Nenhum veículo adicionado.</div>';
        return;
    }
    
    currentVehicles.forEach((v, index) => {
        const item = document.createElement('div');
        item.className = 'veiculo-item-modal';
        item.dataset.index = index;
        item.innerHTML = `
            <span style="font-weight: 600;">${v.placa.toUpperCase()}</span>
            <span>${v.modelo}</span>
            <span>(${v.cor})</span>
            <button class="danger" onclick="removeVehicleFromModal(this.parentNode)">Remover</button>
        `;
        els.modalVeiculosTableBody.appendChild(item);
    });
}

/**
 * Adiciona um veículo à lista temporária no modal.
 */
function addVehicleToModal() {
    const placa = els.inputAddVeiculoPlaca.value.toUpperCase().trim();
    const modelo = els.inputAddVeiculoModelo.value.trim();
    const cor = els.inputAddVeiculoCor.value.trim();
    
    if (!placa || !modelo) {
        return showToast('Placa e Modelo são obrigatórios.', 'error');
    }
    
    const newVehicle = { placa, modelo, cor };
    
    // Simulação: Adiciona ao array temporário e renderiza (ou diretamente na lista do modal)
    
    // Se a lista está vazia com a mensagem, limpa a mensagem
    if (els.modalVeiculosTableBody.textContent.includes('Nenhum veículo adicionado')) {
         els.modalVeiculosTableBody.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'veiculo-item-modal';
    item.innerHTML = `
        <span style="font-weight: 600;">${newVehicle.placa}</span>
        <span>${newVehicle.modelo}</span>
        <span>(${newVehicle.cor})</span>
        <button class="danger" onclick="removeVehicleFromModal(this.parentNode)">Remover</button>
    `;
    els.modalVeiculosTableBody.appendChild(item);

    // Limpa os campos de adição
    els.inputAddVeiculoPlaca.value = '';
    els.inputAddVeiculoModelo.value = '';
    els.inputAddVeiculoCor.value = '';
}

/**
 * Remove um veículo da lista temporária no modal.
 * @param {HTMLElement} itemElement - O elemento div.veiculo-item-modal a ser removido.
 */
function removeVehicleFromModal(itemElement) {
    itemElement.remove();
    // Se a lista ficar vazia, adiciona a mensagem de "Nenhum veículo"
    if (els.modalVeiculosTableBody.children.length === 0) {
        els.modalVeiculosTableBody.innerHTML = '<div style="text-align: center; color: var(--cor-texto); font-size: 13px;">Nenhum veículo adicionado.</div>';
    }
    showToast('Veículo removido.', 'default');
}

/**
 * Exibe o modal para gerenciamento de veículos.
 */
function showVehicleModal() {
    renderVehiclesModal();
    showModal('veiculoModalContent', 500);
}

// =========================================================================================================
// 8. LÓGICA DO DOSSIÊ (Pessoas e Organizações)
// =========================================================================================================

/**
 * Carrega e simula os dados do Dossiê.
 */
function loadDossier() {
    // Simulação de dados
    if (dossiePessoas.length === 0) {
        dossiePessoas = [
            { id: 'p1', nome: 'Michael DeSanta', cargo: 'Contato', faccao: 'Hells Angels', fotoUrl: 'https://i.imgur.com/yv6mX5g.jpeg', info: 'Ex-militar, contato chave para fornecimento de munição.' },
            { id: 'p2', nome: 'Franklin Clinton', cargo: 'Motorista', faccao: 'West Side Families', fotoUrl: 'https://i.imgur.com/G5iE1bB.jpeg', info: 'Especialista em veículos, muito útil para transporte de alto valor.' },
            { id: 'p3', nome: 'Trevor Philips', cargo: 'Aliado', faccao: 'Trevor Philips Enterprises', fotoUrl: 'https://i.imgur.com/zV8Q4yE.jpeg', info: 'Instável, mas com acesso a rotas de contrabando fora da cidade.' },
            { id: 'p4', nome: 'Lamar Davis', cargo: 'Vendedor de Rua', faccao: 'West Side Families', fotoUrl: 'https://i.imgur.com/7gN6sJt.jpeg', info: 'Útil para informações sobre o tráfico local.' }
        ];
        dossieOrganizacoes = [
            { id: 'o1', nome: 'West Side Families', info: 'Gangue de rua na zona oeste. Foco em tráfico local e roubo de carros.', fotoUrl: '' },
            { id: 'o2', nome: 'Los Santos Vagos', info: 'Gangue rival, foco no sul e leste. Conflito por território de tráfico de drogas.', fotoUrl: '' },
            { id: 'o3', nome: 'Trevor Philips Enterprises', info: 'Organização de contrabando no deserto. Cuidado com instabilidade.', fotoUrl: '' }
        ];
        
        // Define a hierarquia para o drag-and-drop (simulação)
        orgsComHierarquia = dossieOrganizacoes.map(o => ({
            ...o,
            id: o.id,
            children: dossiePessoas.filter(p => p.faccao === o.nome)
        }));
    }

    renderDossierPessoas(dossiePessoas);
    renderDossierOrganizacoes(dossieOrganizacoes);
    // Inicializa o sortable.js no `dossierPeopleGrid` e `dossierOrgGrid` (código omitido, mas seria aqui)
}

/**
 * Renderiza os cards de pessoas no Dossiê.
 * @param {Array} people - Lista de pessoas.
 */
function renderDossierPessoas(people) {
    els.dossierPeopleGrid.innerHTML = '';
    people.forEach(p => {
        const card = document.createElement('div');
        card.className = 'dossier-entry-card';
        card.setAttribute('data-id', p.id);
        
        const fotoHtml = p.fotoUrl ? `<img src="${p.fotoUrl}" alt="Foto de ${p.nome}" onerror="this.onerror=null;this.src='placeholder.png';" />` : 'Foto indisponível';
        
        card.innerHTML = `
            <div class="dossier-foto">${fotoHtml}</div>
            <h4>${p.nome}</h4>
            <p><strong>Cargo:</strong> ${p.cargo}</p>
            <p><strong>Facção:</strong> ${p.faccao}</p>
            <p>${p.info}</p>
            <div class="dossier-actions">
                <button class="primary" onclick="editarDossierPessoa('${p.id}')">Editar</button>
                <button class="danger" onclick="removerDossierPessoa('${p.id}')">Remover</button>
            </div>
        `;
        els.dossierPeopleGrid.appendChild(card);
    });
}

/**
 * Renderiza os cards de organizações no Dossiê.
 * @param {Array} orgs - Lista de organizações.
 */
function renderDossierOrganizacoes(orgs) {
    els.dossierOrgGrid.innerHTML = '';
    orgs.forEach(o => {
        const card = document.createElement('div');
        card.className = 'dossier-org-card';
        card.setAttribute('data-id', o.id);
        
        const fotoHtml = o.fotoUrl ? `<img src="${o.fotoUrl}" alt="Foto de ${o.nome}" onerror="this.onerror=null;this.src='placeholder.png';" />` : 'Logo indisponível';
        
        card.innerHTML = `
            <div class="dossier-org-foto">${fotoHtml}</div>
            <h4>${o.nome}</h4>
            <p>${o.info}</p>
            <div class="dossier-org-actions">
                <button class="primary" onclick="editarDossierOrganizacao('${o.id}')">Editar</button>
                <button class="danger" onclick="removerDossierOrganizacao('${o.id}')">Remover</button>
            </div>
        `;
        els.dossierOrgGrid.appendChild(card);
    });
}

function editarDossierPessoa(id) {
    const pessoa = dossiePessoas.find(p => p.id === id);
    if (!pessoa) return showToast('Pessoa não encontrada.', 'error');
    
    // Abrir modal de edição de pessoa
    showToast(`Editando: ${pessoa.nome}`, 'default');
}

function removerDossierPessoa(id) {
    // Simulação: remover do array e recarregar
    dossiePessoas = dossiePessoas.filter(p => p.id !== id);
    renderDossierPessoas(dossiePessoas);
    showToast('Pessoa removida do dossiê.', 'success');
}

// =========================================================================================================
// 9. LÓGICA DE MODAIS GENÉRICOS (Reutilizável)
// =========================================================================================================

/**
 * Exibe um modal genérico ou um modal de conteúdo pré-definido.
 * @param {string} contentIdOrHtml - ID do elemento de conteúdo do modal OU string HTML completa.
 * @param {number} maxWidth - Largura máxima opcional para o modal.
 */
function showModal(contentIdOrHtml, maxWidth = 500) {
    els.modalOverlay.style.display = 'block';
    
    // Se for um ID, mostra o elemento. Se for HTML, cria um novo card.
    if (document.getElementById(contentIdOrHtml)) {
        const contentEl = document.getElementById(contentIdOrHtml);
        contentEl.classList.add('card');
        contentEl.style.display = 'block';
        els.modalOverlay.onclick = () => hideModal(); // Fecha ao clicar fora
        
        els.modalContent = contentEl; // Define a referência
        
    } else if (typeof contentIdOrHtml === 'string') {
        const tempContent = document.createElement('div');
        tempContent.className = 'modal-content card';
        tempContent.style.maxWidth = `${maxWidth}px`;
        tempContent.innerHTML = contentIdOrHtml;
        document.body.appendChild(tempContent);
        
        tempContent.style.display = 'block';
        els.modalOverlay.onclick = () => { hideModal(); tempContent.remove(); }; // Remove o modal temporário ao fechar
        
        els.modalContent = tempContent; // Define a referência
    }
    
    // Ajusta o modal para o centro
    els.modalContent.style.maxWidth = `${maxWidth}px`;
    els.modalContent.style.top = '50%';
    els.modalContent.style.left = '50%';
    els.modalContent.style.transform = 'translate(-50%, -50%)';
}

/**
 * Esconde o modal ativo.
 */
function hideModal() {
    els.modalOverlay.style.display = 'none';
    if (els.modalContent) {
        // Se for um ID pré-existente (como veiculoModalContent), apenas esconde
        if (els.modalContent.id && els.modalContent.id !== '') {
            els.modalContent.style.display = 'none';
        } else {
            // Se for um modal temporário (HTML), ele já foi removido no showModal, mas garante a limpeza
            if(els.modalContent.parentNode) {
                 els.modalContent.remove();
            }
        }
        els.modalContent = null;
    }
}

// =========================================================================================================
// 10. TOUR / ONBOARDING (Simulação)
// =========================================================================================================

const tourSteps = [
    { target: '#logoLink', title: 'O Logo do HA', content: 'Clique a qualquer momento para voltar para a tela inicial de Entrada.' },
    { target: '#themeToggleButton', title: 'Troca de Tema', content: 'Alterne entre o modo Claro e Escuro para a melhor visualização.', placement: 'left' },
    { target: '#inputPlaca', title: 'Placa Principal', content: 'A placa do veículo principal do cliente. É um campo obrigatório para cadastro.', placement: 'bottom' },
    { target: '#historyBtn', title: 'Histórico', content: 'Acesse todos os registros de entrada e saída, com filtros e opções de edição.', placement: 'left' },
    { target: '#dossierBtn', title: 'Dossiê', content: 'Gerencie o catálogo de Pessoas e Organizações, incluindo hierarquia de contatos.', placement: 'left' }
];

let currentTourStep = 0;

/**
 * Inicia a sequência de onboarding (Tour).
 */
function startTour() {
    currentTourStep = 0;
    els.tourOverlay.classList.add('active');
    els.tourOverlay.onclick = (e) => {
         if (e.target.id === 'tour-overlay') showToast('Use os botões para navegar no tour.', 'default');
    };
    showTourStep(currentTourStep);
}

/**
 * Avança para a próxima etapa do tour.
 */
function nextTourStep() {
    currentTourStep++;
    if (currentTourStep < tourSteps.length) {
        showTourStep(currentTourStep);
    } else {
        endTour();
    }
}

/**
 * Retrocede para a etapa anterior do tour.
 */
function prevTourStep() {
    currentTourStep = Math.max(0, currentTourStep - 1);
    showTourStep(currentTourStep);
}

/**
 * Finaliza o tour.
 */
function endTour() {
    els.tourOverlay.classList.remove('active');
    
    // Remove o highlight e o tooltip de todos os elementos
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    const tooltip = document.querySelector('.tour-tooltip.active');
    if(tooltip) tooltip.remove();
}

/**
 * Exibe a etapa atual do tour.
 * @param {number} index - O índice da etapa.
 */
function showTourStep(index) {
    const step = tourSteps[index];
    
    // Limpa etapas anteriores
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    const existingTooltip = document.querySelector('.tour-tooltip');
    if(existingTooltip) existingTooltip.remove();

    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
         nextTourStep(); // Pula se o elemento não for encontrado
         return;
    }
    
    // 1. Highlight
    targetEl.classList.add('tour-highlight');

    // 2. Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.innerHTML = `
        <h4>${step.title}</h4>
        <p>${step.content}</p>
        <button class="muted" onclick="endTour()">Pular Tour</button>
        ${index > 0 ? `<button class="muted" onclick="prevTourStep()">Anterior</button>` : ''}
        <button class="primary" onclick="nextTourStep()">${index < tourSteps.length - 1 ? 'Próximo' : 'Finalizar'}</button>
    `;
    document.body.appendChild(tooltip);

    // 3. Posicionamento do Tooltip
    const rect = targetEl.getBoundingClientRect();
    const placement = step.placement || 'right';
    const margin = 10;
    
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(10px)';

    // Posicionamento base
    if (placement === 'right') {
        tooltip.style.top = `${rect.top + window.scrollY}px`;
        tooltip.style.left = `${rect.right + margin}px`;
    } else if (placement === 'left') {
        tooltip.style.top = `${rect.top + window.scrollY}px`;
        tooltip.style.right = `${window.innerWidth - rect.left + margin}px`;
    } else if (placement === 'bottom') {
        tooltip.style.top = `${rect.bottom + window.scrollY + margin}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
        tooltip.style.transform = 'translateX(-50%) translateY(10px)';
    }

    // Garante que o tooltip apareça na tela (fallback/ajuste)
    setTimeout(() => {
        tooltip.classList.add('active');
    }, 50);

    // Rola para o elemento se estiver fora da vista
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// =========================================================================================================
// 11. EVENT LISTENERS GERAIS
// =========================================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o estado de autenticação (Simulação)
    checkAuthStatus(currentUser);

    // Listener para o botão de Login
    els.loginBtn.addEventListener('click', loginUser);
    els.authPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginUser();
    });

    // Listener para o botão de Troca de Tema
    els.themeToggleButton.addEventListener('click', toggleTheme);

    // Listeners de navegação
    els.historyBtn.addEventListener('click', () => toggleView('history'));
    els.dossierBtn.addEventListener('click', () => toggleView('dossier'));
    els.adminBtn.addEventListener('click', () => toggleView('admin'));
    els.logoutBtn.addEventListener('click', logoutUser);
    
    // Listener para voltar ao MAIN
    if (document.getElementById('logoLink')) {
        document.getElementById('logoLink').addEventListener('click', () => toggleView('main'));
    }

    // Listeners do formulário principal
    els.btnCadastrar.addEventListener('click', cadastrarEntrada);
    els.btnSalvarEdicao.addEventListener('click', salvarEdicaoEntrada);
    els.btnCancelarEdicao.addEventListener('click', resetFormulario);

    // Listener para a Placa
    els.inputPlaca.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
        e.target.classList.remove('input-invalido');
    });
    
    // Listener do botão de Gerenciar Veículos
    els.btnGerenciarVeiculos.addEventListener('click', showVehicleModal);

    // Listener do Modal de Veículos (Adicionar)
    els.btnAddVeiculo.addEventListener('click', addVehicleToModal);
    
    // Listener para fechar modais com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal();
            endTour();
        }
    });

    // Inicialização da UI (para o Welcome Screen e tema)
    const savedTheme = localStorage.getItem('theme') || 'light';
    if(savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    updateLogoAndThemeButton(savedTheme === 'dark');

    // Lógica do Welcome Screen (da importação do index.html)
    if (localStorage.getItem('hasVisited')) {
        els.welcomeScreen.style.display = 'none';
        els.authScreen.style.display = 'block';
    } else {
        els.welcomeScreen.classList.add('show');
        els.authScreen.style.display = 'none';
        els.mainCard.style.display = 'none';
    }

    els.enterBtn.onclick = () => {
        localStorage.setItem('hasVisited', 'true');
        // Define a flag para iniciar o tour no primeiro login
        localStorage.setItem('runTour', 'true'); 
        els.welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            els.welcomeScreen.style.display = 'none';
            els.authScreen.style.display = 'block';
        }, 500);
    };

    // Populando dados de exemplo para demonstração
    cadastrarEntrada.call(null, {placa: "HA1234", cliente: "Demo HA", organizacao: "HA", valor: 1000, status: "ativo", veiculos: [{placa: "HA0000", modelo: "Moto", cor: "Preta"}]});
    cadastrarEntrada.call(null, {placa: "AA00BB", cliente: "Visitante XP", organizacao: "N/A", valor: 500, status: "inativo", observacao: "Pagamento pendente."});
});