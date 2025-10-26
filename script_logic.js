// Arquivo: script_logic.js (O Core da Aplicação) - Corrigido de script111_logic.js

// Importações dos módulos de baixo nível
import { auth, db, ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update, onAuthStateChanged, signOut, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from './firebase_init.js';
import { els } from './ui_elements.js';
import { perUnit, valores, valorDescricao, logoLightModeSrc, logoDarkModeSrc, historyBackgroundSrc, welcomeLogoSrc } from './constants.js';
import { formatCurrency, capitalizeText, showToast, getQty, phoneMask, formatInactivityTime } from './utils.js';

// =================================================================
// INÍCIO: VARIÁVEIS DE ESTADO GLOBAL (MANTIDAS AQUI)
// =================================================================

let vendas = [];
let vendaEmEdicaoId = null;
let vendaOriginalRegistradoPor = null;
let vendaOriginalRegistradoPorId = null;
let vendaOriginalTimestamp = null;
let vendaOriginalDataHora = null;
let vendaOriginalDossierOrg = null; 

// NOVAS VARIÁVEIS GLOBAIS PARA SINCRONIZAÇÃO
let vendaOriginalCliente = null;
let vendaOriginalOrganizacao = null;

let currentUser = null;
let currentUserData = null; 
let vendasListener = null; // Listener do Firebase para vendas
let monitorOnlineStatusListener = null; // Listener do Firebase para status online

// NOVO: Variável global para armazenar o status online de todos os usuários
let globalOnlineStatus = {}; 

let globalAllOrgs = []; 
let globalCurrentPeople = [];
let currentDossierOrg = null; // Chave da organização atualmente visualizada no dossiê
let sortableInstance = null; // Instância SortableJS
let orgSortableInstance = null; // Instância SortableJS para organizações

// --- NOVO (Gerenciador de Veículos) ---
// Armazena temporariamente os veículos ao editar/adicionar um modal
let tempVeiculos = {};
// Armazena a chave do veículo sendo editado no modal
let veiculoEmEdicaoKey = null; 
// --- FIM ---

// =================================================================
// FIM: VARIÁVEIS DE ESTADO GLOBAL
// =================================================================


// =================================================================
// INÍCIO: FUNÇÕES GLOBAIS DE UI E ESTADO
// =================================================================

/**
 * Alterna a visualização entre 'main' (calculadora), 'history' (histórico), 'admin' (painel) ou 'dossier' (investigação).
 */
const toggleView = (target) => {
    els.mainCard.style.display = (target === 'main' || target === 'history' || target === 'admin' || target === 'dossier') ? 'block' : 'none';
    els.historyCard.style.display = target === 'history' ? 'block' : 'none';
    els.adminPanel.style.display = target === 'admin' ? 'block' : 'none';
    els.dossierCard.style.display = target === 'dossier' ? 'block' : 'none';
    els.mainTitle.textContent = (target === 'history' ? 'Histórico de Vendas' : 
                                 target === 'admin' ? 'Painel de Administração' : 
                                 target === 'dossier' ? 'Dossiê de Investigação' : 'Calculadora e Registro de Vendas');
    
    // Atualiza o background do histórico
    if (els.historyImg) {
        els.historyImg.src = historyBackgroundSrc;
        els.historyImg.style.opacity = target === 'history' ? '0.03' : '0';
    }
    
    // Tenta atualizar a lista de usuários online se o painel admin for aberto
    if (target === 'admin' && currentUserData && currentUserData.tag.toUpperCase() === 'ADMIN') {
        loadAdminPanel(true);
    }
    
    // Carrega o histórico se for aberto
    if (target === 'history') {
        loadSalesHistory();
    }
    
    // Carrega o dossiê se for aberto
    if (target === 'dossier') {
         loadAllOrgs();
    }
};

/**
 * Alterna entre modo claro e escuro.
 */
export const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateLogoAndThemeButton(isDark);
};

/**
 * Atualiza o logo e o botão de tema.
 * CORRIGIDO: Esta função é EXPORTADA para que script.js possa usá-la via `scriptLogic.updateLogoAndThemeButton`.
 */
export const updateLogoAndThemeButton = (isDark) => {
    els.appLogo.src = isDark ? logoDarkModeSrc : logoLightModeSrc;
    els.welcomeLogo.src = isDark ? logoDarkModeSrc : logoLightModeSrc;
    els.historyImg.src = historyBackgroundSrc; // Não muda
    els.themeBtn.textContent = isDark ? '☀️ Modo Claro' : '🌙 Modo Noturno';
};

/**
 * Exibe/Esconde um modal.
 */
const toggleModal = (modalElement, overlayElement, show) => {
    if (show) {
        overlayElement.classList.add('show');
        modalElement.classList.add('show');
    } else {
        overlayElement.classList.remove('show');
        modalElement.classList.remove('show');
    }
};

/**
 * Configura a interface com base na tag do usuário.
 */
const configurarInterfacePorTag = (tag) => {
    const upperTag = tag.toUpperCase();
    
    // Botoes de Navegação
    els.investigacaoBtn.style.display = (upperTag === 'ADMIN' || upperTag === 'HELLS') ? 'block' : 'none';
    els.adminPanelBtn.style.display = upperTag === 'ADMIN' ? 'block' : 'none';
    els.toggleHistoryBtn.style.display = (upperTag === 'ADMIN' || upperTag === 'HELLS') ? 'block' : 'none';
    
    // Botoes de Ação
    els.registerBtn.style.display = (upperTag === 'ADMIN' || upperTag === 'HELLS') ? 'block' : 'none';
    els.clearHistoryBtn.style.display = upperTag === 'ADMIN' ? 'block' : 'none';
    
    // Status Display
    if (els.userStatus) {
        els.userStatus.textContent = tag;
        els.userStatus.className = `user-status-display tag-${tag.toLowerCase()}`;
        els.userStatus.style.display = 'inline-block';
    }
};

// =================================================================
// FIM: FUNÇÕES GLOBAIS DE UI E ESTADO
// =================================================================


// =================================================================
// INÍCIO: LÓGICA DE CÁLCULO
// =================================================================

/**
 * Executa o cálculo da venda e atualiza a interface.
 */
export const calculate = () => {
  const { qtyTickets, qtyTablets, qtyNitro, tipoValor } = {
    qtyTickets: getQty(els.qtyTickets),
    qtyTablets: getQty(els.qtyTablets),
    qtyNitro: getQty(els.qtyNitro),
    tipoValor: els.tipoValor.value
  };
  const totalQuantities = { cobre: 0, plastico: 0, fita_adesiva: 0, lixo_eletronico: 0, aluminio: 0, vidro: 0, porca: 0, parafuso: 0, dinheiro_sujo: 0 };
  let totalValue = 0;
  const productValues = [];
  
  if (qtyTablets > 0) {
    totalQuantities.cobre += qtyTablets * perUnit.tablets.cobre;
    totalQuantities.plastico += qtyTablets * perUnit.tablets.plastico;
    totalQuantities.fita_adesiva += qtyTablets * perUnit.tablets.fita_adesiva;
    totalQuantities.lixo_eletronico += qtyTablets * perUnit.tablets.lixo_eletronico;
    const value = qtyTablets * valores.tablets[tipoValor];
    totalValue += value;
    productValues.push({ product: `Tablets (${qtyTablets} und.)`, value });
  }
  if (qtyTickets > 0) {
    totalQuantities.dinheiro_sujo += qtyTickets * perUnit.tickets.dinheiro_sujo;
    const value = qtyTickets * valores.tickets[tipoValor];
    totalValue += value;
    productValues.push({ product: `Tickets (${qtyTickets} und.)`, value });
  }
  if (qtyNitro > 0) {
    totalQuantities.aluminio += qtyNitro * perUnit.nitro.aluminio;
    totalQuantities.cobre += qtyNitro * perUnit.nitro.cobre;
    totalQuantities.vidro += qtyNitro * perUnit.nitro.vidro;
    totalQuantities.fita_adesiva += qtyNitro * perUnit.nitro.fita_adesiva;
    totalQuantities.porca += qtyNitro * perUnit.nitro.porca;
    totalQuantities.parafuso += qtyNitro * perUnit.nitro.parafuso;
    const value = qtyNitro * valores.nitro[tipoValor];
    totalValue += value;
    productValues.push({ product: `Nitro (${qtyNitro} und.)`, value });
  }
  
  const hasQuantities = qtyTickets > 0 || qtyTablets > 0 || qtyNitro > 0;
  if (hasQuantities) {
    updateResults(totalQuantities, productValues, totalValue);
  } else {
    els.results.style.display = 'none';
  }
  return { qtyTickets, qtyTablets, qtyNitro, totalValue, tipoValor, hasQuantities };
};

/**
 * Atualiza a seção de resultados na interface.
 */
const updateResults = (totals, productValues, totalValue) => {
  els.results.style.display = 'block';
  els.resultsBody.innerHTML = Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([material, value]) => `<tr><td>${capitalizeText(material.replace(/_/g, ' '))}</td><td>${value.toLocaleString('pt-BR')}</td></tr>`)
    .join('');
  els.valuesBody.innerHTML = productValues.map(item => `<tr><td>${item.product}</td><td>${formatCurrency(item.value)}</td></tr>`).join('');
  els.valorTotalGeral.textContent = formatCurrency(totalValue);
};

/**
 * Limpa todos os campos da calculadora.
 */
export const clearAllFields = () => {
  ['qtyTickets', 'qtyTablets', 'qtyNitro', 'nomeCliente', 'organizacao', 'negociadoras', 'vendaValorObs', 'carroVeiculo', 'placaVeiculo'].forEach(id => els[id].value = '');
  els.tipoValor.value = 'limpo';
  els.organizacaoTipo.value = 'CNPJ';
  els.telefone.value = '';
  els.results.style.display = 'none';
  document.querySelectorAll('.input-invalido').forEach(input => input.classList.remove('input-invalido'));
  
  // Reseta o estado de edição
  if (vendaEmEdicaoId) {
    vendaEmEdicaoId = null;
    vendaOriginalRegistradoPor = null;
    vendaOriginalRegistradoPorId = null;
    vendaOriginalTimestamp = null;
    vendaOriginalDataHora = null;
    vendaOriginalCliente = null;
    vendaOriginalOrganizacao = null;
    vendaOriginalDossierOrg = null;
    els.registerBtn.textContent = 'Registrar Venda';
  }
};

/**
 * Valida se os campos obrigatórios foram preenchidos.
 */
const validateFields = () => {
  let isValid = true;
  const camposObrigatorios = [
    els.nomeCliente, 
    els.telefone, 
    els.negociadoras
  ];
  
  camposObrigatorios.forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('input-invalido');
      isValid = false;
    } else {
      field.classList.remove('input-invalido');
    }
  });
  
  const tipoOrg = els.organizacaoTipo.value;
  if (tipoOrg === 'CNPJ') {
    if (!els.organizacao.value.trim()) {
      els.organizacao.classList.add('input-invalido');
      isValid = false;
    } else {
      els.organizacao.classList.remove('input-invalido');
    }
  } else {
    els.organizacao.classList.remove('input-invalido');
  }

  // Verifica se pelo menos um produto foi selecionado
  const { hasQuantities } = calculate();
  if (!hasQuantities) {
      showToast("Selecione a quantidade de pelo menos um produto para registrar a venda.", "error");
      isValid = false;
      // Adiciona estilo de erro nos campos de quantidade, se necessário
      [els.qtyTickets, els.qtyTablets, els.qtyNitro].forEach(field => {
          if (getQty(field) === 0) { field.classList.add('input-invalido'); }
      });
  } else {
       [els.qtyTickets, els.qtyTablets, els.qtyNitro].forEach(field => field.classList.remove('input-invalido'));
  }
  
  return isValid;
};

// =================================================================
// FIM: LÓGICA DE CÁLCULO
// =================================================================


// =================================================================
// INÍCIO: LÓGICA DE AUTENTICAÇÃO
// =================================================================

/**
 * Tenta logar um usuário.
 */
export const signIn = async () => {
    const username = els.username.value.trim();
    const password = els.password.value.trim();

    if (!username || !password) {
        els.authMessage.textContent = 'Preencha todos os campos.';
        return;
    }
    
    // NOVO: Converte o username (display name) para um email falso para login no Firebase Auth
    // O sistema de autenticação do Firebase requer um formato de email válido.
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@hells-angels.com`; 

    els.authMessage.textContent = 'Aguarde...';
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged irá lidar com o sucesso
    } catch (error) {
        // Mapeamento de erros
        let message = 'Erro desconhecido. Tente novamente.';
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = 'Usuário ou Senha inválidos.';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Muitas tentativas de login. Tente mais tarde.';
        }
        els.authMessage.textContent = message;
    }
};

/**
 * Tenta registrar um novo usuário.
 */
export const registerUser = async () => {
    const username = els.username.value.trim();
    const password = els.password.value.trim();

    if (!username || !password || password.length < 6) {
        els.authMessage.textContent = 'Preencha todos os campos e use uma senha com no mínimo 6 caracteres.';
        return;
    }
    
    // NOVO: Converte o username (display name) para um email falso para login no Firebase Auth
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@hells-angels.com`; 

    els.authMessage.textContent = 'Aguarde...';
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 1. Atualiza o display name no Firebase Auth
        await updateProfile(user, { displayName: capitalizeText(username) });

        // 2. Cria o registro de usuário no Realtime Database com a tag padrão
        const userRef = ref(db, 'users/' + user.uid);
        await set(userRef, {
            email: email, // Armazena o email falso, se necessário
            tag: 'Visitante', // TAG PADRÃO
            displayName: capitalizeText(username)
        });
        
        showToast('Cadastro realizado com sucesso! Logado como Visitante.', 'success');
        // onAuthStateChanged irá lidar com o sucesso
    } catch (error) {
        let message = 'Erro ao tentar registrar.';
        if (error.code === 'auth/email-already-in-use') {
            message = 'Nome de Usuário já está em uso.';
        } else if (error.code === 'auth/weak-password') {
             message = 'A senha deve ter no mínimo 6 caracteres.';
        }
        els.authMessage.textContent = message;
    }
};

/**
 * Envia email para resetar a senha.
 */
export const forgotPassword = async () => {
    const username = els.username.value.trim();
    if (!username) {
        showToast("Insira o nome de usuário para redefinição.", "error");
        return;
    }
    
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@hells-angels.com`; 
    
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Email de redefinição enviado para o endereço associado ao seu nome de usuário.', 'success', 5000);
    } catch (error) {
        let message = 'Erro ao enviar email de redefinição.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
             message = 'Nome de usuário não encontrado.';
        }
        showToast(message, 'error');
    }
};

/**
 * Encerra a sessão do usuário.
 */
export const logout = async () => {
    try {
        if (currentUser) {
            // Remove o registro de online status
            const activityRef = ref(db, `onlineStatus/${currentUser.uid}`);
            await remove(activityRef);
        }
        await signOut(auth);
        showToast('Sessão encerrada.', 'default');
    } catch (error) {
        showToast('Erro ao sair.', 'error');
    }
};

// =================================================================
// FIM: LÓGICA DE AUTENTICAÇÃO
// =================================================================


// =================================================================
// INÍCIO: FUNÇÕES DE REGISTRO E SINCRONIZAÇÃO (VENDAS & DOSSIÊ)
// =================================================================

/**
 * Registra a venda no Firebase.
 */
export const registerSale = async () => {
    if (!validateFields()) return;

    if (!currentUserData) {
        showToast("Você não está logado ou seus dados de usuário não foram carregados.", "error");
        return;
    }

    const { qtyTickets, qtyTablets, qtyNitro, totalValue, tipoValor } = calculate();

    // Veículos adicionados temporariamente na calculadora
    const veiculosDoCalc = Array.from(els.listaVeiculos.children).map(li => {
        const span = li.querySelector('span');
        return span ? span.textContent.trim() : 'N/A';
    }).join('; ');
    
    const vendaData = {
        cliente: capitalizeText(els.nomeCliente.value.trim()),
        organizacao: capitalizeText(els.organizacao.value.trim()),
        organizacaoTipo: els.organizacaoTipo.value,
        telefone: phoneMask(els.telefone.value.trim()),
        negociadoras: capitalizeText(els.negociadoras.value.trim()),
        veiculos: veiculosDoCalc, // Salva a lista de veículos como string
        observacoes: capitalizeText(els.vendaValorObs.value.trim()),
        tipoValor: tipoValor,
        valorTotal: totalValue,
        itens: {
            tickets: qtyTickets,
            tablets: qtyTablets,
            nitro: qtyNitro
        },
        dataHora: els.dataVenda.value, // Data e hora do relógio
        timestamp: Date.now(), // Para ordenação e timestamp real
        registradoPor: currentUserData.displayName,
        registradoPorId: currentUser.uid,
        tagRegistradoPor: currentUserData.tag
    };

    els.registerBtn.textContent = vendaEmEdicaoId ? 'Salvando Edição...' : 'Registrando...';
    els.registerBtn.disabled = true;

    try {
        if (vendaEmEdicaoId) {
            // Lógica de Edição: Atualiza a venda existente
            const saleRef = ref(db, `sales/${vendaEmEdicaoId}`);
            
            // Verifica se o usuário tem permissão para editar (apenas o próprio autor, admin ou hells)
            const upperTag = currentUserData.tag.toUpperCase();
            const isOwner = currentUser.uid === vendaOriginalRegistradoPorId;
            const isAuthorized = upperTag === 'ADMIN' || upperTag === 'HELLS';
            
            // Só permite a edição se o usuário for o dono E não for Admin/Hells, ou se for Admin/Hells
            // No modo de edição, vamos forçar a atualização (se chegou aqui, ele iniciou a edição, que já valida permissões)
            
            // Adiciona campos de auditoria
            vendaData.editadoPor = currentUserData.displayName;
            vendaData.editadoEm = els.dataVenda.value;

            await update(saleRef, vendaData);
            
            // Lógica para atualizar a lista de clientes no dossiê
            await updateClientDossierPostSale(vendaData, vendaEmEdicaoId);
            
            showToast('Venda atualizada com sucesso!', 'success');
            
        } else {
            // Lógica de Novo Registro: Cria uma nova venda
            const salesRef = ref(db, 'sales');
            const newSaleRef = push(salesRef);
            await set(newSaleRef, vendaData);
            
            // Lógica para adicionar/atualizar o cliente no dossiê
            await updateClientDossierPostSale(vendaData, newSaleRef.key);
            
            showToast('Venda registrada com sucesso!', 'success');
        }

        clearAllFields(); // Limpa a calculadora após o registro/edição
        
    } catch (error) {
        showToast(`Erro ao registrar a venda: ${error.message}`, 'error');
        console.error("Erro no registro da venda:", error);
    } finally {
        els.registerBtn.disabled = false;
        els.registerBtn.textContent = 'Registrar Venda';
    }
};

/**
 * Função utilitária para adicionar/atualizar cliente no dossiê após uma venda.
 */
const updateClientDossierPostSale = async (vendaData, vendaId) => {
    const { cliente, organizacao, telefone, veiculos } = vendaData;
    
    // 1. Procurar o cliente pelo nome dentro da organização (busca no Realtime Database)
    let clientKey = null;
    let clientData = null;
    let newOrg = organizacao;
    
    const dossierRef = ref(db, 'dossier');
    const orgsSnapshot = await get(dossierRef);
    
    if (orgsSnapshot.exists()) {
        orgsSnapshot.forEach(orgSnapshot => {
            orgSnapshot.child('people').forEach(personSnapshot => {
                const person = personSnapshot.val();
                if (person.nome === cliente) {
                    clientKey = personSnapshot.key;
                    clientData = person;
                    newOrg = orgSnapshot.key; // Se encontrou, pega a org real do dossiê
                }
            });
        });
    }

    // 2. Se o cliente não foi encontrado, criar nova entrada no dossiê
    if (!clientKey) {
        // Usa a organização da venda, ou 'Outros' se for vazio.
        const targetOrgKey = newOrg && newOrg.trim() !== '' ? newOrg : 'Outros'; 
        const peopleRef = ref(db, `dossier/${targetOrgKey}/people`);
        const newPersonRef = push(peopleRef);
        clientKey = newPersonRef.key;
        
        clientData = {
            nome: cliente,
            organizacao: targetOrgKey,
            numero: telefone,
            fotoUrl: "", // Padrão
            notas: "Registro inicial de venda.", // Padrão
            veiculos: parseVeiculosString(veiculos),
            registroVendas: { [vendaId]: vendaData.timestamp }
        };
        
        await set(newPersonRef, clientData);
        
    } else {
        // 3. Se o cliente foi encontrado, atualizar os dados, se necessário
        const personRef = ref(db, `dossier/${newOrg}/people/${clientKey}`);
        
        // Atualiza campos básicos
        const updateData = {
            numero: telefone, // Sempre atualiza o telefone
            registroVendas: { ...clientData.registroVendas, [vendaId]: vendaData.timestamp }
        };
        
        // Atualiza veículos, mesclando
        const existingVeiculos = clientData.veiculos || {};
        const newVeiculos = parseVeiculosString(veiculos);
        const mergedVeiculos = mergeVeiculos(existingVeiculos, newVeiculos);
        updateData.veiculos = mergedVeiculos;

        await update(personRef, updateData);
    }
};

/**
 * Função utilitária para transformar a string de veículos em objeto.
 * Exemplo: "Carro A (Placa X); Moto B (ID Y)" -> { 'Carro A': 'Placa X', 'Moto B': 'ID Y' }
 */
const parseVeiculosString = (veiculosString) => {
    const vehicles = {};
    if (!veiculosString || typeof veiculosString !== 'string') return vehicles;
    
    veiculosString.split(';').forEach(entry => {
        const parts = entry.trim().split(/ \(([^)]+)\)/).filter(p => p.trim() !== '');
        if (parts.length >= 2) {
            const nome = parts[0].trim();
            const placa = parts[1].trim();
            if (nome && placa) {
                 // Usa o nome do veículo como chave (case-insensitive)
                vehicles[nome] = { nome: nome, placa: placa, timestamp: Date.now() };
            }
        }
    });
    return vehicles;
};

/**
 * Função utilitária para mesclar dois objetos de veículos, priorizando o mais recente.
 */
const mergeVeiculos = (existing, incoming) => {
    // Ambos são objetos onde a chave é o nome do veículo (case-insensitive)
    const merged = { ...existing };
    for (const key in incoming) {
        if (incoming.hasOwnProperty(key)) {
            // Sobrescreve o veículo se ele já existir, ou adiciona se for novo
            merged[key] = incoming[key];
        }
    }
    return merged;
};

// ... (Resto das funções) ...

/**
 * Adiciona um veículo da calculadora para a lista temporária.
 */
export const addVeiculoFromCalc = () => {
    const carro = els.carroVeiculo.value.trim();
    const placa = els.placaVeiculo.value.trim();

    if (carro && placa) {
        const item = document.createElement('li');
        item.innerHTML = `<span>${capitalizeText(carro)} (${placa.toUpperCase()})</span> <button class="danger-muted" onclick="window.scriptLogic.removeVeiculoFromList(this)">Remover</button>`;
        els.listaVeiculos.appendChild(item);
        els.carroVeiculo.value = '';
        els.placaVeiculo.value = '';
    } else {
        showToast("Preencha o nome do veículo e a placa/ID.", "error");
    }
};

/**
 * Remove um veículo da lista temporária (usado no DOM da calculadora).
 */
export const removeVeiculoFromList = (btnElement) => {
    btnElement.parentNode.remove();
};

// ... (Resto das funções, como loadSalesHistory, loadAllOrgs, etc.) ...


// EXPORTAÇÃO DE FUNÇÕES GLOBAIS
// As funções que precisam ser acessíveis globalmente ou por listeners de alto nível
export {
    toggleView,
    updateLogoAndThemeButton, // CORRIGIDO: Adicionada exportação
    toggleModal,
    // Dossier Listeners
    initializePeopleFilter,
    initializeOrgFilter,
    // Admin Listeners
    loadGlobalLayoutConfig,
    updateGlobalLayoutSetting,
    loadAdminPanel,
    monitorOnlineStatus,
    // Discord/CSV
    copyToDiscord,
    exportToCSV,
    clearHistory,
    // Modals Dossier
    openDossierModal,
    saveDossierEntry,
    deleteDossierEntry,
    openOrgModal,
    saveOrg,
    deleteOrg,
    addVeiculoFromModal,
    removeVeiculoFromModalList,
    // Histórico
    loadSalesHistory,
    loadAllOrgs,
    initializeHistoryFilter,
    editSale,
    deleteSale,
    // Dossier Getters
    getCurrentDossierOrg,
    loadDossier,
    // User Management
    initializeUserFilter
};