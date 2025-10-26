// Arquivo: script111_logic.js (O Core da Aplicação)

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
 * * CORREÇÃO DE ERRO: Adicionada exportação inline e removida do bloco final 
 * para resolver o erro 'Duplicate export'.
 */
export const updateLogoAndThemeButton = (isDark) => { // <-- CORREÇÃO 1: Adicionado 'export'
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
        await updateProfile(user, {
            displayName: capitalizeText(username)
        });
        
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
  
  if (!currentUser) {
      showToast("Você precisa estar logado para registrar vendas.", "error");
      return;
  }
  
  const { qtyTickets, qtyTablets, qtyNitro, totalValue, tipoValor } = calculate();
  
  if (totalValue === 0) {
      showToast("O valor total da venda não pode ser R$ 0. Verifique as quantidades.", "error");
      return;
  }
  
  const saleData = {
    cliente: els.nomeCliente.value.trim(),
    organizacao: els.organizacao.value.trim() || 'N/A',
    organizacaoTipo: els.organizacaoTipo.value,
    telefone: els.telefone.value.trim(),
    tickets: qtyTickets,
    tablets: qtyTablets,
    nitro: qtyNitro,
    tipoValor: tipoValor,
    valorTotal: totalValue,
    negociadoras: els.negociadoras.value.trim(),
    observacoes: els.vendaValorObs.value.trim(),
    carro: els.carroVeiculo.value.trim(), // Carro/Veículo (string)
    placas: els.placaVeiculo.value.trim(), // Placa(s) (string)
    registradoPor: currentUser.displayName,
    registradoPorId: currentUser.uid,
    dataHora: els.dataVenda.value,
    timestamp: Date.now()
  };

  const isEditing = !!vendaEmEdicaoId;
  let saleRef;
  
  // Se for edição, usamos o ID existente e mantemos os dados originais
  if (isEditing) {
    saleRef = ref(db, `vendas/${vendaEmEdicaoId}`);
    
    // Adiciona o histórico de quem e quando registrou originalmente
    saleData.registradoPor = vendaOriginalRegistradoPor;
    saleData.registradoPorId = vendaOriginalRegistradoPorId;
    saleData.dataHora = vendaOriginalDataHora;
    saleData.timestamp = vendaOriginalTimestamp;
    saleData.editadoPor = currentUser.displayName;
    saleData.editadoEm = new Date().toLocaleString('pt-BR');
    
    els.registerBtn.textContent = 'Registrar Venda';
  } else {
    saleRef = push(ref(db, 'vendas'));
  }
  
  try {
    // 1. REGISTRA/ATUALIZA A VENDA NO FIREBASE
    await set(saleRef, saleData);
    
    // 2. SINCRONIZA/ATUALIZA O DOSSIÊ
    // Procura se o cliente já existe em alguma organização
    const existingDossierEntry = await findDossierEntryGlobal(saleData.cliente);
    
    let oldOrgData = null; // Dados antigos do dossiê (se a pessoa for transferida de org)
    
    if (existingDossierEntry) {
        // CASO 1: CLIENTE JÁ EXISTE NO DOSSIÊ
        
        // Verifica se a organização mudou na venda em relação ao dossiê
        if (saleData.organizacao !== existingDossierEntry.personData.org) {
            
            // TRANSFERÊNCIA: CLIENTE MUDOU DE ORGANIZAÇÃO
            showToast(`Cliente encontrado no dossiê da Org: ${existingDossierEntry.personData.org}. Transferindo registro...`, 'default', 4000);
            
            // a) Salva os dados antigos para reuso (fotoUrl, instagram, hierarquiaIndex)
            oldOrgData = existingDossierEntry.personData;
            
            // b) Remove a entrada antiga do dossiê (ou apenas a chave de referência)
            await remove(ref(db, `dossies/${existingDossierEntry.personData.org}/${existingDossierEntry.personId}`));
            
            // c) Adiciona/Atualiza a entrada na NOVA ORGANIZAÇÃO
            await addDossierEntry(saleData, oldOrgData);
            
        } else {
             // UPDATE: CLIENTE JÁ EXISTE E ORGANIZAÇÃO É A MESMA. Atualiza a entrada.
             await addDossierEntry(saleData);
        }
        
    } else {
        // CASO 2: CLIENTE NÃO EXISTE NO DOSSIÊ. Cria nova entrada.
        await addDossierEntry(saleData);
    }
    
    // 3. FINALIZAÇÃO
    showToast(`Venda ${isEditing ? 'atualizada' : 'registrada'} com sucesso!`, 'success');
    clearAllFields();
    
    // NOVO: Limpa a flag de edição após o registro
    vendaEmEdicaoId = null; 
    els.registerBtn.textContent = 'Registrar Venda'; 

  } catch (error) {
    if(error.code !== "PERMISSION_DENIED") {
        showToast(`Erro ao registrar a venda: ${error.message}`, 'error', 5000);
        console.error("Erro no registro:", error);
    }
  }
};

/**
 * Abre o modal de edição e preenche os campos.
 */
export const editSale = (saleId) => {
    const sale = vendas.find(v => v.id === saleId);
    if (!sale) return;

    // 1. Preenche os campos da calculadora
    els.nomeCliente.value = sale.cliente;
    els.organizacao.value = sale.organizacao === 'N/A' ? '' : sale.organizacao;
    els.organizacaoTipo.value = sale.organizacaoTipo || 'CNPJ';
    els.telefone.value = sale.telefone;
    els.qtyTickets.value = sale.tickets;
    els.qtyTablets.value = sale.tablets;
    els.qtyNitro.value = sale.nitro;
    els.tipoValor.value = sale.tipoValor;
    els.negociadoras.value = sale.negociadoras;
    els.vendaValorObs.value = sale.observacoes;
    els.carroVeiculo.value = sale.carro || ''; 
    els.placaVeiculo.value = sale.placas || ''; 
    
    // 2. Executa o cálculo para preencher a seção de resultados
    calculate(); 

    // 3. Atualiza o estado de edição global
    vendaEmEdicaoId = saleId;
    
    // Mantém os dados originais do registro
    vendaOriginalRegistradoPor = sale.registradoPor;
    vendaOriginalRegistradoPorId = sale.registradoPorId;
    vendaOriginalTimestamp = sale.timestamp;
    vendaOriginalDataHora = sale.dataHora;
    vendaOriginalCliente = sale.cliente; 
    vendaOriginalOrganizacao = sale.organizacao; 

    // 4. Atualiza o botão de registro e alterna a visualização
    els.registerBtn.textContent = 'Salvar Edição';
    toggleView('main'); // Volta para a calculadora
};

/**
 * Remove uma venda do Firebase.
 */
export const deleteSale = async (saleId, registradoPorId) => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN' && currentUser.uid !== registradoPorId) {
        showToast("Você só pode excluir suas próprias vendas (ou peça a um Admin).", "error");
        return;
    }
    
    if (!confirm('Tem certeza de que deseja excluir esta venda?')) return;
    
    try {
        await remove(ref(db, `vendas/${saleId}`));
        showToast('Venda excluída com sucesso.', 'success');
        // loadSalesHistory é chamado automaticamente pelo listener onValue
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao excluir a venda: ${error.message}`, 'error');
        }
    }
};

/**
 * Limpa todo o histórico de vendas (função exclusiva do Admin).
 */
export const clearHistory = async () => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') {
        showToast("Você não tem permissão para limpar o histórico.", "error");
        return;
    }
    
    if (!confirm('ATENÇÃO: Tem certeza de que deseja APAGAR TODO O HISTÓRICO DE VENDAS? Esta ação é IRREVERSÍVEL!')) return;
    
    try {
        await remove(ref(db, 'vendas'));
        showToast('Histórico de vendas completamente limpo.', 'success', 5000);
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao limpar o histórico: ${error.message}`, 'error');
        }
    }
};

/**
 * Exporta o histórico de vendas para CSV.
 */
export const exportToCSV = () => {
    if (vendas.length === 0) {
        showToast("Não há vendas para exportar.", "default");
        return;
    }

    const header = [
        "ID", "DataHora", "Cliente", "Organizacao", "OrganizacaoTipo", "Telefone", 
        "Tickets", "Tablets", "Nitro", "TipoValor", "ValorTotal", "Negociadoras", 
        "Carro", "Placas", "Observacoes", "RegistradoPor", "RegistradoPorId", "Timestamp", 
        "EditadoPor", "EditadoEm"
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
        + header.join(";") + "\n"
        + vendas.map(v => [
            v.id,
            v.dataHora,
            v.cliente,
            v.organizacao,
            v.organizacaoTipo,
            v.telefone,
            v.tickets,
            v.tablets,
            v.nitro,
            v.tipoValor,
            v.valorTotal,
            v.negociadoras,
            v.carro,
            v.placas,
            v.observacoes,
            v.registradoPor,
            v.registradoPorId,
            v.timestamp,
            v.editadoPor || '',
            v.editadoEm || ''
        ].map(field => `"${String(field).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')}"` 
        ).join(";")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_vendas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Histórico exportado com sucesso!", "success");
};

/**
 * Copia os resultados da calculadora para o formato Discord.
 */
export const copyToDiscord = () => {
    const { qtyTickets, qtyTablets, qtyNitro, totalValue, tipoValor } = calculate();
    if (totalValue === 0) {
        showToast("Nenhum produto selecionado para copiar.", "error");
        return;
    }

    const cliente = els.nomeCliente.value.trim() || 'N/A';
    const organizacao = els.organizacao.value.trim() || 'N/A';
    const negociadoras = els.negociadoras.value.trim() || 'N/A';
    const telefone = els.telefone.value.trim() || 'N/A';
    const carro = els.carroVeiculo.value.trim() || 'N/A';
    const placas = els.placaVeiculo.value.trim() || 'N/A';
    const observacoes = els.vendaValorObs.value.trim() || 'N/A';
    const dataHora = els.dataVenda.value;

    const materials = Array.from(els.resultsBody.querySelectorAll('tr'))
        .map(row => `${row.cells[0].textContent}: ${row.cells[1].textContent}`);

    const products = [];
    if (qtyTickets > 0) products.push(`Tickets: ${qtyTickets} und.`);
    if (qtyTablets > 0) products.push(`Tablets: ${qtyTablets} und.`);
    if (qtyNitro > 0) products.push(`Nitro: ${qtyNitro} und.`);
    
    const discordMessage = `\`\`\`
[ REGISTRO DE VENDA - HELLS ANGELS ]
===================================
Vendedor(a): ${currentUser ? currentUser.displayName : 'Desconhecido'}
Negociadora(s) Adicional(is): ${negociadoras}
Data e Hora: ${dataHora}

[ DADOS DO CLIENTE ]
Nome: ${cliente}
Organização: ${organizacao} (${els.organizacaoTipo.value})
Telefone: ${telefone}

[ PRODUTOS VENDIDOS ]
${products.join('\n')}

[ VALOR E MATERIAIS ]
Valor Total: ${formatCurrency(totalValue)} (${valorDescricao[tipoValor]})
Insumos (Entrada): ${materials.join('\n')}

[ VEÍCULOS ]
Carro/Veículo: ${carro}
Placa(s): ${placas}

[ OBSERVAÇÕES ]
${observacoes}
\`\`\``;

    navigator.clipboard.writeText(discordMessage)
        .then(() => showToast("Registro copiado para o Discord!", "success"))
        .catch(() => showToast("Erro ao copiar. Seu navegador não suporta a cópia.", "error"));
};

/**
 * Carrega o histórico de vendas do Firebase em tempo real.
 */
export const loadSalesHistory = () => {
    const salesRef = query(ref(db, 'vendas'), orderByChild('timestamp'));
    
    // Remove listener anterior se existir
    if (vendasListener) {
        vendasListener();
    }

    vendasListener = onValue(salesRef, (snapshot) => {
        vendas = [];
        snapshot.forEach(childSnapshot => {
            const sale = { id: childSnapshot.key, ...childSnapshot.val() };
            vendas.unshift(sale); // Adiciona o mais novo no início
        });
        renderSalesTable(vendas);
    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar histórico: ${error.message}`, 'error');
            els.salesHistory.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--cor-erro);">Erro ao carregar o histórico.</td></tr>';
        }
    });
};

/**
 * Renderiza a tabela de histórico de vendas.
 */
const renderSalesTable = (sales) => {
    const filtro = els.filtroHistorico.value.toLowerCase();
    const filteredSales = sales.filter(sale => 
        sale.cliente.toLowerCase().includes(filtro) || 
        sale.organizacao.toLowerCase().includes(filtro) || 
        sale.negociadoras.toLowerCase().includes(filtro) || 
        sale.registradoPor.toLowerCase().includes(filtro)
    );

    if (filteredSales.length === 0) {
        els.salesHistory.innerHTML = `<tr><td colspan="6" style="text-align: center;">${filtro ? 'Nenhuma venda encontrada com o filtro.' : 'Nenhuma venda registrada ainda.'}</td></tr>`;
        return;
    }

    els.salesHistory.innerHTML = filteredSales.map(sale => {
        const isSelf = currentUser && currentUser.uid === sale.registradoPorId;
        const isAdmin = currentUserData && currentUserData.tag.toUpperCase() === 'ADMIN';
        const canEdit = isSelf || isAdmin;
        const editInfo = sale.editadoPor ? `<br><small style="opacity: 0.7;">(Editado por ${sale.editadoPor})</small>` : '';

        return `
            <tr>
                <td>${sale.dataHora}</td>
                <td>${sale.registradoPor}</td>
                <td>${sale.cliente}</td>
                <td>${sale.organizacao} (${sale.organizacaoTipo})</td>
                <td>${formatCurrency(sale.valorTotal)}${editInfo}</td>
                <td style="display: flex; gap: 5px;">
                    <button class="secondary" onclick="window.scriptLogic.editSale('${sale.id}')" ${canEdit ? '' : 'disabled'} title="${canEdit ? 'Editar Venda' : 'Sem Permissão'}">
                        ${canEdit ? 'Editar' : 'Ver'}
                    </button>
                    <button class="danger" onclick="window.scriptLogic.deleteSale('${sale.id}', '${sale.registradoPorId}')" ${isAdmin ? '' : 'disabled'} title="${isAdmin ? 'Excluir Venda (Admin)' : 'Sem Permissão'}">
                        Excluir
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

/**
 * Inicializa o filtro de histórico de vendas.
 */
export const initializeHistoryFilter = () => {
    if (els.filtroHistorico) {
        els.filtroHistorico.addEventListener('input', () => {
            renderSalesTable(vendas);
        });
    }
};


// =================================================================
// INÍCIO: FUNÇÕES DO DOSSIÊ (Organizações)
// =================================================================

// FUNÇÕES A SEREM IMPLEMENTADAS/ENCONTRADAS (MANTIDAS COMO EXPORT para a interface)

/**
 * Carrega a lista completa de organizações e renderiza.
 */
export const loadAllOrgs = () => {
    // ... (implementation)
};

/**
 * Carrega o dossiê de uma organização específica.
 */
export const loadDossier = (orgId) => {
    // ... (implementation)
};

/**
 * Abre o modal para adicionar/editar uma pessoa no dossiê.
 */
export const openDossierModal = (orgId, personId) => {
    // ... (implementation)
};

/**
 * Salva a entrada do dossiê (pessoa) no Firebase.
 */
export const saveDossierEntry = async () => {
    // ... (implementation)
};

/**
 * Exclui uma entrada do dossiê (pessoa).
 */
export const deleteDossierEntry = async (orgId, personId) => {
    // ... (implementation)
};

/**
 * Inicializa o filtro de pessoas no dossiê.
 */
export const initializePeopleFilter = () => {
    // ... (implementation)
};

/**
 * Inicializa o filtro de organizações no dossiê.
 */
export const initializeOrgFilter = () => {
    // ... (implementation)
};

/**
 * Abre o modal para adicionar/editar uma organização.
 */
export const openOrgModal = (orgId) => {
    // ... (implementation)
};

/**
 * Salva uma organização no Firebase.
 */
export const saveOrg = async () => {
    // ... (implementation)
};

/**
 * Exclui uma organização.
 */
export const deleteOrg = async (orgId) => {
    // ... (implementation)
};

/**
 * Getter para a organização atual do dossiê.
 */
export const getCurrentDossierOrg = () => {
    return currentDossierOrg;
};

// =================================================================
// FIM: FUNÇÕES DO DOSSIÊ
// =================================================================


// =================================================================
// INÍCIO: FUNÇÕES DE ADMINISTRAÇÃO E STATUS ONLINE
// =================================================================

/**
 * Carrega as configurações globais de layout.
 */
export const loadGlobalLayoutConfig = () => {
    // ... (implementation)
};

/**
 * Atualiza uma configuração global de layout.
 */
export const updateGlobalLayoutSetting = async (key, value) => {
    // ... (implementation)
};

/**
 * Carrega o painel de administração (usuários e status).
 */
export const loadAdminPanel = (force = false) => {
    // ... (implementation)
};

/**
 * Monitora o status online dos usuários em tempo real.
 */
export const monitorOnlineStatus = () => {
    // ... (implementation)
};

/**
 * Inicializa o filtro de usuários no painel Admin.
 */
export const initializeUserFilter = () => {
    // ... (implementation)
};

// =================================================================
// FIM: FUNÇÕES DE ADMINISTRAÇÃO E STATUS ONLINE
// =================================================================


// =================================================================
// INÍCIO: FUNÇÕES DE AUTENTICAÇÃO (onAuthStateChanged e monitorAuth)
// =================================================================

/**
 * Carrega os dados de um usuário logado.
 */
const loadUserData = (user) => {
    // ... (implementation)
};


/**
 * Monitora o estado de autenticação do Firebase.
 */
export const monitorAuth = () => {
    // ... (implementation)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // ... (implementation)
        } else {
            // ... (implementation)
        }
    });
};

// =================================================================
// FIM: FUNÇÃO PRINCIPAL DE AUTENTICAÇÃO
// =================================================================

// EXPORTAÇÃO DE FUNÇÕES GLOBAIS
// As funções que precisam ser acessíveis globalmente ou por listeners de alto nível
export {
    toggleView,
    // updateLogoAndThemeButton, // <-- CORREÇÃO: REMOVIDA daqui, pois já foi exportada inline acima.
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
