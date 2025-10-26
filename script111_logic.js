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
 */
const updateLogoAndThemeButton = (isDark) => {
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
        "ID", "DataHora", "Cliente", "Organizacao", "OrganizacaoTipo", 
        "Telefone", "Tickets", "Tablets", "Nitro", "TipoValor", 
        "ValorTotal", "Negociadoras", "Carro", "Placas", "Observacoes", 
        "RegistradoPor", "RegistradoPorId", "Timestamp", "EditadoPor", "EditadoEm"
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + header.join(";") + "\n" 
        + vendas.map(v => 
            [
                v.id, v.dataHora, v.cliente, v.organizacao, v.organizacaoTipo, 
                v.telefone, v.tickets, v.tablets, v.nitro, v.tipoValor, 
                v.valorTotal, v.negociadoras, v.carro, v.placas, v.observacoes, 
                v.registradoPor, v.registradoPorId, v.timestamp, v.editadoPor || '', v.editadoEm || ''
            ].map(field => 
                `"${String(field).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')}"`
            ).join(";")
        ).join("\n");

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
Insumos (Entrada):
${materials.join('\n')}

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
 * Adiciona o listener de filtro ao histórico.
 */
export const initializeHistoryFilter = () => {
    els.filtroHistorico.addEventListener('input', () => renderSalesTable(vendas));
};

// =================================================================
// FIM: FUNÇÕES DE REGISTRO E SINCRONIZAÇÃO
// =================================================================


// =================================================================
// INÍCIO: DOSSIÊ (LÓGICA DE INVESTIGAÇÃO)
// =================================================================

/**
 * Procura por um nome de pessoa em TODAS as organizações do dossiê.
 * Retorna os dados, a org e o ID se encontrar.
 */
const findDossierEntryGlobal = async (nome) => {
    if (!nome) return null;
    try {
        const dossiesRef = ref(db, 'dossies');
        const snapshot = await get(dossiesRef);
        if (!snapshot.exists()) return null;
        const dossies = snapshot.val();
        for (const orgKey in dossies) {
            const orgData = dossies[orgKey];
            for (const personId in orgData) {
                if (orgData[personId].nome && orgData[personId].nome.toLowerCase() === nome.toLowerCase()) {
                    return { personData: orgData[personId], personOrg: orgKey, personId: personId };
                }
            }
        }
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            console.error("Erro na busca global:", error);
        }
        return null;
    }
    return null;
};

/**
 * Procura por um NOME PARCIAL de pessoa em TODAS as organizações do dossiê.
 * Retorna um array de resultados.
 */
const searchAllPeopleGlobal = async (query) => {
    if (!query) return [];
    const results = [];
    const queryLower = query.toLowerCase();
    try {
        const dossiesRef = ref(db, 'dossies');
        const snapshot = await get(dossiesRef);
        if (!snapshot.exists()) return [];
        const dossies = snapshot.val();
        for (const orgKey in dossies) {
            const orgData = dossies[orgKey];
            for (const personId in orgData) {
                const person = orgData[personId];
                const nome = person.nome ? person.nome.toLowerCase() : '';
                const cargo = person.cargo ? person.cargo.toLowerCase() : '';
                const numero = person.numero ? person.numero.toLowerCase() : '';
                
                if (nome.includes(queryLower) || cargo.includes(queryLower) || numero.includes(queryLower)) {
                    results.push({ ...person, id: personId, org: orgKey });
                }
            }
        }
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            console.error("Erro na busca global de pessoas:", error);
        }
    }
    return results;
};

/**
 * Mescla veículos de uma venda (formato string) com um objeto de veículos existente.
 * Usa a PLACA como chave única para evitar duplicatas.
 */
const parseAndMergeVeiculos = (vendaData, existingVeiculos = {}) => {
    const carros = (vendaData.carro || '').split(',').map(c => c.trim()).filter(c => c);
    const placas = (vendaData.placas || '').split(',').map(p => p.trim()).filter(p => p);
    const maxLen = Math.max(carros.length, placas.length);
    const merged = { ...existingVeiculos };
    
    for (let i = 0; i < maxLen; i++) {
        const carro = carros[i] || 'N/A';
        const placa = placas[i] || '';
        const lowerPlaca = placa.toLowerCase();
        
        if (placa) {
            // Usa a placa como chave, removendo caracteres especiais
            const safeKey = lowerPlaca.replace(/[^a-z0-9]/g, ''); 
            if (!merged[safeKey]) {
                merged[safeKey] = { carro: carro, placa: placa, fotoUrl: '' };
            } else if (carro !== 'N/A' && merged[safeKey].carro === 'N/A') {
                merged[safeKey].carro = carro; // Atualiza o nome do carro se for genérico
            }
        } else if (carro !== 'N/A') {
            // Se não tem placa, usa uma chave temporária para evitar perda
            const tempKey = `venda_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;
            merged[tempKey] = { carro: carro, placa: '', fotoUrl: '' };
        }
    }
    return merged;
};

// Adiciona ou ATUALIZA entrada de pessoa no dossiê
const addDossierEntry = async (vendaData, dadosAntigos = null) => {
    const org = vendaData.organizacao.trim();
    const nome = vendaData.cliente.trim();
    
    if (!org || !nome || org === 'N/A') {
        // Não sincroniza se a organização não foi preenchida
        console.warn("addDossierEntry: Org, Nome ou Org=N/A. Saindo.");
        return;
    }

    // 1. Garante que a Organização exista em /organizacoes
    const orgRef = ref(db, `organizacoes/${org}`);
    get(orgRef).then(snapshot => {
        if (!snapshot.exists()) {
            set(orgRef, { nome: org, fotoUrl: '', info: 'Base registrada automaticamente via Venda.', ordemIndex: 9999 });
        }
    });

    // 2. Procura por uma pessoa com o mesmo nome NESSA organização
    const dossierQuery = query(ref(db, `dossies/${org}`), orderByChild('nome'), equalTo(nome));
    try {
        const snapshot = await get(dossierQuery);
        
        if (snapshot.exists()) {
            // JÁ EXISTE: Atualiza a entrada existente
            let existingEntryId;
            let existingEntryData;
            snapshot.forEach(child => {
                existingEntryId = child.key;
                existingEntryData = child.val();
            });

            const updates = {};
            // Atualiza número e cargo/obs da venda
            updates.numero = vendaData.telefone || existingEntryData.numero || '';
            updates.cargo = vendaData.vendaValorObs || existingEntryData.cargo || '';
            updates.data = vendaData.dataHora; // Data da última atualização/venda
            
            // Mescla veículos da venda com os veículos existentes
            const baseVeiculos = (existingEntryData.veiculos) || {};
            updates.veiculos = parseAndMergeVeiculos(vendaData, baseVeiculos);

            // Mantém ou transfere dados importantes
            updates.fotoUrl = existingEntryData.fotoUrl || '';
            updates.instagram = existingEntryData.instagram || '';
            updates.hierarquiaIndex = existingEntryData.hierarquiaIndex !== undefined ? existingEntryData.hierarquiaIndex : 9999;
            
            const updateRef = ref(db, `dossies/${org}/${existingEntryId}`);
            await update(updateRef, updates);
            
        } else {
            // NÃO EXISTE: Cria uma nova entrada
            const dossierEntry = {
                nome: vendaData.cliente,
                numero: vendaData.telefone || '',
                cargo: vendaData.vendaValorObs || '',
                fotoUrl: dadosAntigos ? dadosAntigos.fotoUrl || '' : '', // Reusa se veio de transferência
                instagram: dadosAntigos ? dadosAntigos.instagram || '' : '',
                data: vendaData.dataHora,
                hierarquiaIndex: dadosAntigos ? dadosAntigos.hierarquiaIndex || 9999 : 9999, // Reusa se veio de transferência
                veiculos: parseAndMergeVeiculos(vendaData, {}) // Cria nova lista de veículos
            };
            
            await push(ref(db, `dossies/${org}`), dossierEntry);
        }
        
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            console.error("Erro ao sincronizar Dossiê:", error);
        }
    }
};

/**
 * Carrega a lista de todas as organizações e renderiza o grid.
 */
export const loadAllOrgs = () => {
    if (!currentUser || (currentUserData.tag.toUpperCase() !== 'ADMIN' && currentUserData.tag.toUpperCase() !== 'HELLS')) {
        showToast("Permissão negada para acessar o Dossiê.", "error");
        return;
    }
    
    // Esconde a lista de pessoas e mostra a lista de organizações
    els.dossierPeopleContainer.style.display = 'none';
    els.dossierOrgContainer.style.display = 'block';
    
    const orgsRef = query(ref(db, 'organizacoes'), orderByChild('ordemIndex'));
    
    // Remove o listener anterior se existir
    if (loadAllOrgs.listener) loadAllOrgs.listener();
    
    loadAllOrgs.listener = onValue(orgsRef, (snapshot) => {
        globalAllOrgs = [];
        snapshot.forEach(child => {
            globalAllOrgs.push({ id: child.key, ...child.val() });
        });
        renderOrgGrid(globalAllOrgs);
    }, (error) => {
         if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar organizações: ${error.message}`, 'error');
         }
    });
};

/**
 * Renderiza o grid de organizações (filtrável).
 */
const renderOrgGrid = (orgs) => {
    const filtro = els.filtroDossierOrgs.value.toLowerCase();
    
    const filteredOrgs = orgs.filter(org => 
        org.nome.toLowerCase().includes(filtro) ||
        (org.info && org.info.toLowerCase().includes(filtro))
    );
    
    if (filteredOrgs.length === 0) {
        els.dossierOrgGrid.innerHTML = `<p style="text-align: center;">${filtro ? 'Nenhuma organização encontrada.' : 'Nenhuma organização registrada.'}</p>`;
        return;
    }
    
    els.dossierOrgGrid.innerHTML = filteredOrgs.map(org => `
        <div class="org-item" data-org-id="${org.id}" onclick="window.scriptLogic.viewDossierPeople('${org.id}')" oncontextmenu="window.scriptLogic.openOrgModal(event, '${org.id}')">
            <img src="${org.fotoUrl || welcomeLogoSrc}" alt="${org.nome} Logo">
            <h4>${org.nome}</h4>
            <p>${org.info ? org.info.substring(0, 50) + '...' : 'Clique para ver as pessoas.'}</p>
        </div>
    `).join('');
    
    // Re-inicializa o SortableJS se for Admin
    if (currentUserData.tag.toUpperCase() === 'ADMIN') {
        initializeOrgSortable();
    }
};

/**
 * Inicializa o SortableJS para organizações.
 */
const initializeOrgSortable = () => {
    if (orgSortableInstance) {
        orgSortableInstance.destroy();
    }
    orgSortableInstance = new Sortable(els.dossierOrgGrid, {
        animation: 150,
        handle: '.org-item',
        onEnd: async (evt) => {
            const orgItems = Array.from(els.dossierOrgGrid.children).filter(el => el.classList.contains('org-item'));
            const updates = {};
            // Itera sobre a nova ordem e atualiza o index no Firebase
            orgItems.forEach((item, index) => {
                const orgId = item.getAttribute('data-org-id');
                if (orgId) {
                    updates[`organizacoes/${orgId}/ordemIndex`] = index;
                }
            });
            try {
                // Atualiza o índice de ordenação de todas as organizações
                await update(ref(db), updates);
                showToast("Ordem das organizações salva.", "success");
            } catch (error) {
                if(error.code !== "PERMISSION_DENIED") {
                     showToast("Erro ao salvar a nova ordem.", "error");
                }
            }
        }
    });
};

/**
 * Abre o modal de Organização para edição ou adição.
 */
export const openOrgModal = (event, orgId = null) => {
    // Para desabilitar o menu de contexto padrão
    if (event) event.preventDefault(); 
    
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') {
        showToast("Permissão negada (Admin Required).", "error");
        return;
    }

    if (orgId) {
        // Modo Edição
        const org = globalAllOrgs.find(o => o.id === orgId);
        if (!org) {
            showToast("Organização não encontrada.", "error");
            return;
        }
        els.orgModalTitle.textContent = 'Editar Organização';
        els.editOrgId.value = org.id;
        els.orgNome.value = org.nome;
        els.orgFotoUrl.value = org.fotoUrl || '';
        els.orgInfo.value = org.info || '';
        els.deleteOrgBtn.style.display = 'inline-block';
    } else {
        // Modo Adição
        els.orgModalTitle.textContent = 'Adicionar Nova Organização';
        els.editOrgId.value = '';
        els.orgNome.value = '';
        els.orgFotoUrl.value = '';
        els.orgInfo.value = '';
        els.deleteOrgBtn.style.display = 'none';
    }
    toggleModal(els.orgModal, els.orgModalOverlay, true);
};

/**
 * Salva ou atualiza uma organização.
 */
export const saveOrg = async () => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') {
        showToast("Permissão negada (Admin Required).", "error");
        return;
    }
    
    const nome = els.orgNome.value.trim();
    if (!nome) {
        showToast("O nome da organização é obrigatório.", "error");
        return;
    }
    
    const orgId = els.editOrgId.value;
    const isNew = !orgId;
    const orgData = {
        nome: capitalizeText(nome),
        fotoUrl: els.orgFotoUrl.value.trim(),
        info: els.orgInfo.value.trim()
    };
    
    let orgRef;
    if (isNew) {
        orgRef = ref(db, `organizacoes/${nome}`); // Usa o nome como chave para novas
        orgData.ordemIndex = 9999; // Adiciona no final
    } else {
        orgRef = ref(db, `organizacoes/${orgId}`);
    }

    try {
        await set(orgRef, orgData);
        showToast(`Organização ${isNew ? 'adicionada' : 'salva'} com sucesso.`, 'success');
        toggleModal(els.orgModal, els.orgModalOverlay, false);
        loadAllOrgs(); // Recarrega a lista
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao salvar organização: ${error.message}`, 'error');
        }
    }
};

/**
 * Exclui uma organização (Admin).
 */
export const deleteOrg = async () => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') return;
    const orgId = els.editOrgId.value;

    if (!confirm(`Tem certeza de que deseja excluir a organização ${orgId} e TODAS as pessoas associadas no dossiê? Esta ação é IRREVERSÍVEL!`)) return;

    try {
        // 1. Remove a organização em si
        await remove(ref(db, `organizacoes/${orgId}`));
        // 2. Remove todas as pessoas daquela organização no dossiê
        await remove(ref(db, `dossies/${orgId}`));
        
        showToast(`Organização ${orgId} e seus dossiês removidos.`, 'success', 5000);
        toggleModal(els.orgModal, els.orgModalOverlay, false);
        loadAllOrgs(); // Recarrega a lista
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao excluir organização: ${error.message}`, 'error');
        }
    }
};

/**
 * Carrega e exibe a lista de pessoas de uma organização.
 */
export const viewDossierPeople = (orgId) => {
    if (!currentUser || (currentUserData.tag.toUpperCase() !== 'ADMIN' && currentUserData.tag.toUpperCase() !== 'HELLS')) {
        showToast("Permissão negada para acessar o Dossiê.", "error");
        return;
    }
    
    // Atualiza o estado global com a organização atual
    currentDossierOrg = orgId; 
    els.dossierOrgContainer.style.display = 'none';
    els.dossierPeopleContainer.style.display = 'block';
    els.addDossierOrganizacao.textContent = orgId; // Define a org no modal de adição
    
    // Busca o nome real da Org
    const orgData = globalAllOrgs.find(o => o.id === orgId);
    els.dossierPeopleTitle.textContent = `Pessoas em ${orgData ? orgData.nome : orgId}`;
    
    const peopleRef = query(ref(db, `dossies/${orgId}`), orderByChild('hierarquiaIndex'));
    
    // Remove o listener anterior se existir
    if (viewDossierPeople.listener) viewDossierPeople.listener();
    
    viewDossierPeople.listener = onValue(peopleRef, (snapshot) => {
        globalCurrentPeople = [];
        snapshot.forEach(child => {
            const person = { id: child.key, org: orgId, ...child.val() };
            globalCurrentPeople.push(person);
        });
        renderPeopleGrid(globalCurrentPeople);
    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar pessoas: ${error.message}`, 'error');
        }
    });
};

/**
 * Renderiza o grid de pessoas (filtrável).
 */
const renderPeopleGrid = (people) => {
    const filtro = els.filtroDossierPeople.value.toLowerCase();
    
    const filteredPeople = people.filter(person => 
        (person.nome && person.nome.toLowerCase().includes(filtro)) ||
        (person.cargo && person.cargo.toLowerCase().includes(filtro)) ||
        (person.numero && person.numero.toLowerCase().includes(filtro))
    );
    
    if (filteredPeople.length === 0) {
        els.dossierPeopleGrid.innerHTML = `<p style="text-align: center;">${filtro ? 'Nenhuma pessoa encontrada com o filtro.' : 'Nenhuma pessoa registrada nesta organização.'}</p>`;
        return;
    }
    
    els.dossierPeopleGrid.innerHTML = filteredPeople.map(person => {
        const veiculosHtml = person.veiculos ? Object.values(person.veiculos).map(v => 
            `<span>${v.carro}${v.placa ? ` (${v.placa})` : ''}</span>`
        ).join('') : '<span>Nenhum veículo</span>';
        
        return `
            <div class="person-item" data-person-id="${person.id}" data-org-id="${person.org}" onclick="window.scriptLogic.openDossierModal('edit', '${person.id}')">
                <img src="${person.fotoUrl || welcomeLogoSrc}" alt="${person.nome} Foto" onerror="this.onerror=null; this.src='${welcomeLogoSrc}'"
                     ${person.fotoUrl ? `onclick="event.stopPropagation(); window.scriptLogic.openLightbox('${person.fotoUrl}')"` : ''}>
                <h4>${person.nome}</h4>
                <p class="person-tag">${person.cargo || 'Membro'}</p>
                <div class="dossier-veiculos" title="Veículos">${veiculosHtml}</div>
                ${person.data ? `<p style="font-size: 10px; opacity: 0.6; margin-top: 5px;">Última Venda: ${person.data}</p>` : ''}
            </div>
        `;
    }).join('');
    
    // Re-inicializa o SortableJS se for Admin
    if (currentUserData.tag.toUpperCase() === 'ADMIN') {
        initializePeopleSortable();
    }
};

/**
 * Inicializa o SortableJS para pessoas.
 */
const initializePeopleSortable = () => {
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    sortableInstance = new Sortable(els.dossierPeopleGrid, {
        animation: 150,
        handle: '.person-item',
        onEnd: async (evt) => {
            const personItems = Array.from(els.dossierPeopleGrid.children).filter(el => el.classList.contains('person-item'));
            const orgId = currentDossierOrg;
            const updates = {};
            // Itera sobre a nova ordem e atualiza o index no Firebase
            personItems.forEach((item, index) => {
                const personId = item.getAttribute('data-person-id');
                if (personId) {
                    updates[`dossies/${orgId}/${personId}/hierarquiaIndex`] = index;
                }
            });
            try {
                // Atualiza o índice de ordenação de todas as pessoas na organização
                await update(ref(db), updates);
                showToast("Ordem de hierarquia salva.", "success");
            } catch (error) {
                if(error.code !== "PERMISSION_DENIED") {
                     showToast("Erro ao salvar a nova ordem.", "error");
                }
            }
        }
    });
};

/**
 * Alterna a visualização entre o modal de adição/edição de pessoa.
 */
export const openDossierModal = (mode, personId = null) => {
    if (!currentUser || (currentUserData.tag.toUpperCase() !== 'ADMIN' && currentUserData.tag.toUpperCase() !== 'HELLS')) {
        showToast("Permissão negada para editar o Dossiê.", "error");
        return;
    }
    
    // Reseta o estado temporário de veículos e a chave de edição de veículo
    tempVeiculos = {};
    veiculoEmEdicaoKey = null;
    els.editModalCancelVeiculoBtn.style.display = 'none';
    els.addModalCancelVeiculoBtn.style.display = 'none';

    if (mode === 'edit' && personId) {
        // Modo Edição
        const person = globalCurrentPeople.find(p => p.id === personId);
        if (!person) {
            showToast("Pessoa não encontrada no dossiê.", "error");
            return;
        }
        
        // Preenche os campos
        els.editDossierOrg.textContent = person.org;
        els.editDossierId.value = person.id;
        els.editDossierNome.value = person.nome;
        els.editDossierNumero.value = person.numero || '';
        els.editDossierCargo.value = person.cargo || '';
        els.editDossierFotoUrl.value = person.fotoUrl || '';
        els.editDossierInstagram.value = person.instagram || '';
        
        // Carrega veículos para o estado temporário
        tempVeiculos = person.veiculos || {}; 
        renderVeiculosList('edit');
        
        els.deleteDossierBtn.style.display = currentUserData.tag.toUpperCase() === 'ADMIN' ? 'inline-block' : 'none';
        toggleModal(els.editDossierModal, els.editDossierOverlay, true);

    } else if (mode === 'add') {
        // Modo Adição
        els.addDossierOrganizacao.textContent = currentDossierOrg;
        // Limpa campos
        els.addDossierNome.value = '';
        els.addDossierNumero.value = '';
        els.addDossierCargo.value = '';
        els.addDossierFotoUrl.value = '';
        
        // Limpa e renderiza a lista de veículos de adição
        tempVeiculos = {}; 
        renderVeiculosList('add');
        
        toggleModal(els.addDossierModal, els.addDossierOverlay, true);
    }
};

/**
 * Salva as alterações de uma pessoa no dossiê.
 */
export const saveDossierEntry = async (mode) => {
    const isEdit = mode === 'edit';
    const orgId = isEdit ? currentDossierOrg : currentDossierOrg; // A pessoa só pode ser salva na org atual
    
    const nomeEl = isEdit ? els.editDossierNome : els.addDossierNome;
    const numeroEl = isEdit ? els.editDossierNumero : els.addDossierNumero;
    const cargoEl = isEdit ? els.editDossierCargo : els.addDossierCargo;
    const fotoEl = isEdit ? els.editDossierFotoUrl : els.addDossierFotoUrl;
    const instagramEl = isEdit ? els.editDossierInstagram : { value: '' }; // Adiciona um stub para o modo 'add'

    const nome = nomeEl.value.trim();
    if (!nome) {
        showToast("O nome é obrigatório.", "error");
        return;
    }
    
    const dossierEntry = {
        nome: nome,
        numero: numeroEl.value.trim(),
        cargo: cargoEl.value.trim(),
        fotoUrl: fotoEl.value.trim(),
        instagram: instagramEl.value.trim(),
        data: new Date().toLocaleString('pt-BR'),
        veiculos: tempVeiculos
    };

    try {
        let entryRef;
        if (isEdit) {
            const personId = els.editDossierId.value;
            entryRef = ref(db, `dossies/${orgId}/${personId}`);
            await update(entryRef, dossierEntry);
            showToast('Pessoa atualizada no dossiê.', 'success');
            toggleModal(els.editDossierModal, els.editDossierOverlay, false);
        } else {
            entryRef = push(ref(db, `dossies/${orgId}`));
            dossierEntry.hierarquiaIndex = 9999;
            await set(entryRef, dossierEntry);
            showToast('Nova pessoa adicionada ao dossiê.', 'success');
            toggleModal(els.addDossierModal, els.addDossierOverlay, false);
        }
        
        // Recarrega o grid da organização atual
        viewDossierPeople(orgId); 
        
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao salvar pessoa: ${error.message}`, 'error');
        }
    }
};

/**
 * Exclui uma pessoa do dossiê (Admin).
 */
export const deleteDossierEntry = async () => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') return;
    
    const orgId = currentDossierOrg;
    const personId = els.editDossierId.value;

    if (!confirm(`Tem certeza de que deseja excluir ${els.editDossierNome.value} do dossiê? Esta ação é IRREVERSÍVEL!`)) return;

    try {
        await remove(ref(db, `dossies/${orgId}/${personId}`));
        showToast('Pessoa excluída do dossiê.', 'success');
        toggleModal(els.editDossierModal, els.editDossierOverlay, false);
        viewDossierPeople(orgId); // Recarrega a lista
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao excluir pessoa: ${error.message}`, 'error');
        }
    }
};

/**
 * Adiciona/Atualiza um veículo ao estado temporário.
 */
export const addEditVeiculo = (mode) => {
    const carroEl = mode === 'edit' ? els.editModalCarroNome : els.addModalCarroNome;
    const placaEl = mode === 'edit' ? els.editModalCarroPlaca : els.addModalCarroPlaca;
    const fotoEl = mode === 'edit' ? els.editModalCarroFoto : els.addModalCarroFoto;
    
    const carro = carroEl.value.trim();
    const placa = placaEl.value.trim();
    const fotoUrl = fotoEl.value.trim();
    
    if (!carro) {
        showToast("O nome do carro/veículo é obrigatório.", "error");
        return;
    }
    
    let key;
    if (veiculoEmEdicaoKey) {
        // Edição: Usa a chave existente
        key = veiculoEmEdicaoKey;
    } else if (placa) {
        // Adição (com placa): Usa a placa (em lower case, sem caracteres especiais) como chave
        key = placa.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
        // Adição (sem placa): Cria uma chave temporária
        key = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    // Atualiza o objeto de veículos
    tempVeiculos[key] = {
        carro: capitalizeText(carro),
        placa: placa,
        fotoUrl: fotoUrl
    };

    // Limpa campos do formulário de veículo
    carroEl.value = '';
    placaEl.value = '';
    fotoEl.value = '';
    veiculoEmEdicaoKey = null;
    
    const addButtonEl = mode === 'edit' ? els.editModalAddVeiculoBtn : els.addModalAddVeiculoBtn;
    const cancelButtonEl = mode === 'edit' ? els.editModalCancelVeiculoBtn : els.addModalCancelVeiculoBtn;
    
    addButtonEl.textContent = 'Adicionar Veículo';
    cancelButtonEl.style.display = 'none';

    renderVeiculosList(mode);
};

/**
 * Renderiza a lista de veículos no modal.
 */
const renderVeiculosList = (mode) => {
    const listEl = mode === 'edit' ? els.editModalListaVeiculos : els.addModalListaVeiculos;
    
    if (Object.keys(tempVeiculos).length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #888; font-style: italic;">Nenhum veículo adicionado.</p>';
        return;
    }
    
    listEl.innerHTML = Object.entries(tempVeiculos).map(([key, veiculo]) => `
        <div class="veiculo-item-modal">
            <span>
                ${veiculo.carro} 
                ${veiculo.placa ? `(${veiculo.placa})` : ''}
                ${veiculo.fotoUrl ? ` <a href="#" onclick="event.preventDefault(); event.stopPropagation(); window.scriptLogic.openLightbox('${veiculo.fotoUrl}')" title="Ver Foto">🖼️</a>` : ''}
            </span>
            <div>
                <button class="secondary" onclick="window.scriptLogic.editVeiculoItem('${mode}', '${key}')">Editar</button>
                <button class="danger" onclick="window.scriptLogic.deleteVeiculoItem('${mode}', '${key}')">Excluir</button>
            </div>
        </div>
    `).join('');
};

/**
 * Preenche o formulário de veículo com os dados de um item para edição.
 */
export const editVeiculoItem = (mode, key) => {
    const veiculo = tempVeiculos[key];
    if (!veiculo) return;
    
    const carroEl = mode === 'edit' ? els.editModalCarroNome : els.addModalCarroNome;
    const placaEl = mode === 'edit' ? els.editModalCarroPlaca : els.addModalCarroPlaca;
    const fotoEl = mode === 'edit' ? els.editModalCarroFoto : els.addModalCarroFoto;
    const addButtonEl = mode === 'edit' ? els.editModalAddVeiculoBtn : els.addModalAddVeiculoBtn;
    const cancelButtonEl = mode === 'edit' ? els.editModalCancelVeiculoBtn : els.addModalCancelVeiculoBtn;

    // Preenche o formulário
    carroEl.value = veiculo.carro;
    placaEl.value = veiculo.placa;
    fotoEl.value = veiculo.fotoUrl;
    
    // Atualiza o estado
    veiculoEmEdicaoKey = key;
    
    // Altera a UI
    addButtonEl.textContent = 'Salvar Veículo';
    cancelButtonEl.style.display = 'inline-block';
};

/**
 * Deleta um veículo do estado temporário.
 */
export const deleteVeiculoItem = (mode, key) => {
    if (confirm(`Tem certeza de que deseja excluir o veículo ${tempVeiculos[key].carro}?`)) {
        delete tempVeiculos[key];
        renderVeiculosList(mode);
        // Garante que o estado de edição do veículo seja limpo se o item excluído for o que estava sendo editado
        if (veiculoEmEdicaoKey === key) {
            veiculoEmEdicaoKey = null;
            const carroEl = mode === 'edit' ? els.editModalCarroNome : els.addModalCarroNome;
            const placaEl = mode === 'edit' ? els.editModalCarroPlaca : els.addModalCarroPlaca;
            const fotoEl = mode === 'edit' ? els.editModalCarroFoto : els.addModalCarroFoto;
            carroEl.value = '';
            placaEl.value = '';
            fotoEl.value = '';
            const addButtonEl = mode === 'edit' ? els.editModalAddVeiculoBtn : els.addModalAddVeiculoBtn;
            const cancelButtonEl = mode === 'edit' ? els.editModalCancelVeiculoBtn : els.addModalCancelVeiculoBtn;
            addButtonEl.textContent = 'Adicionar Veículo';
            cancelButtonEl.style.display = 'none';
        }
    }
};

/**
 * Cancela a edição do veículo, limpando o formulário e o estado de edição.
 */
export const cancelVeiculoEdit = (mode) => {
    const carroEl = mode === 'edit' ? els.editModalCarroNome : els.addModalCarroNome;
    const placaEl = mode === 'edit' ? els.editModalCarroPlaca : els.addModalCarroPlaca;
    const fotoEl = mode === 'edit' ? els.editModalCarroFoto : els.addModalCarroFoto;
    const addButtonEl = mode === 'edit' ? els.editModalAddVeiculoBtn : els.addModalAddVeiculoBtn;
    const cancelButtonEl = mode === 'edit' ? els.editModalCancelVeiculoBtn : els.addModalCancelVeiculoBtn;

    carroEl.value = '';
    placaEl.value = '';
    fotoEl.value = '';
    veiculoEmEdicaoKey = null;
    addButtonEl.textContent = 'Adicionar Veículo';
    cancelButtonEl.style.display = 'none';
};

/**
 * Adiciona o listener de filtro ao dossiê de pessoas.
 */
export const initializePeopleFilter = () => {
    els.filtroDossierPeople.addEventListener('input', () => renderPeopleGrid(globalCurrentPeople));
};

/**
 * Adiciona o listener de filtro ao dossiê de organizações.
 */
export const initializeOrgFilter = () => {
    els.filtroDossierOrgs.addEventListener('input', () => renderOrgGrid(globalAllOrgs));
};

/**
 * Abre o lightbox de imagem.
 */
export const openLightbox = (imgSrc) => {
    els.lightboxImg.src = imgSrc;
    els.imageLightboxModal.style.display = 'block';
    els.imageLightboxOverlay.classList.add('show');
};

/**
 * Fecha o lightbox de imagem.
 */
export const closeLightbox = () => {
    els.imageLightboxModal.style.display = 'none';
    els.imageLightboxOverlay.classList.remove('show');
};


// =================================================================
// FIM: DOSSIÊ (LÓGICA DE INVESTIGAÇÃO)
// =================================================================


// =================================================================
// INÍCIO: PAINEL ADMIN E STATUS ONLINE
// =================================================================

const globalLayoutRef = ref(db, 'configuracoesGlobais/layout');

/**
 * Atualiza a última atividade do usuário logado.
 */
export const updateUserActivity = () => {
    if (currentUser) {
        const activityRef = ref(db, `onlineStatus/${currentUser.uid}`);
        set(activityRef, {
            lastActive: Date.now(),
            displayName: currentUser.displayName,
            tag: currentUserData ? currentUserData.tag : 'N/A'
        }).catch(e => {
             console.warn("Erro ao registrar atividade online:", e.message);
        });
        
        // Define um intervalo para rodar a cada 30 segundos
        setTimeout(updateUserActivity, 30000); 
    }
};

/**
 * Monitora e armazena o status de atividade em tempo real.
 */
export const monitorOnlineStatus = () => {
    const statusRef = ref(db, 'onlineStatus');
    
    // Remove listener anterior se existir
    if (monitorOnlineStatusListener) {
        monitorOnlineStatusListener();
    }
    
    monitorOnlineStatusListener = onValue(statusRef, (snapshot) => {
        const now = Date.now();
        let activeCount = 0;
        globalOnlineStatus = {}; 
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const uid = child.key;
                const userStatus = child.val();
                const inactivity = now - userStatus.lastActive;
                const isOnline = inactivity < 60000; // 60 segundos
                
                if (isOnline) {
                    activeCount++;
                }

                globalOnlineStatus[uid] = {
                    isOnline: isOnline,
                    inactivity: inactivity,
                    lastActive: userStatus.lastActive
                };
            });
        }
        
        els.onlineUsersCount.textContent = activeCount.toString();
        
        // Se o Painel Admin estiver aberto, forçamos a atualização da lista
        if (els.adminPanel.style.display !== 'none') {
            loadAdminPanel(false); // Atualiza a lista na tabela sem recarregar tudo.
        }

    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            console.error("Erro ao monitorar status online:", error);
        }
    });
};

/**
 * Listener que carrega e atualiza o layout para todos os usuários.
 */
export const loadGlobalLayoutConfig = () => {
    onValue(globalLayoutRef, (snapshot) => {
        if (!snapshot.exists()) {
            console.warn("Nó /configuracoesGlobais/layout não encontrado. Criando...");
            // Cria a configuração inicial (apenas se for admin)
            if(currentUserData && currentUserData.tag.toUpperCase() === 'ADMIN') {
                 set(globalLayoutRef, { enableNightMode: true, enableBottomPanel: false, bottomPanelText: 'Este é o painel inferior.' });
            }
            return;
        }
        const settings = snapshot.val();
        
        // 1. Botão de Tema (Modo Noturno)
        if (els.themeBtn) {
            els.themeBtn.style.display = settings.enableNightMode ? 'block' : 'none';
            if (!settings.enableNightMode && document.body.classList.contains('dark')) {
                document.body.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        }
        
        // 2. Painel Inferior (Rodapé)
        if (els.bottomPanel) {
            els.bottomPanel.style.display = settings.enableBottomPanel ? 'flex' : 'none';
            // Atualiza a mensagem no rodapé para todos
            els.bottomPanelDisplay.textContent = settings.bottomPanelText || 'Este é o painel inferior.'; 
        }
        
        // 3. Inputs do Admin Panel
        if (els.adminPanel.style.display !== 'none' && els.bottomPanelText) {
             els.bottomPanelText.value = settings.bottomPanelText || '';
             els.layoutToggleNightMode.checked = settings.enableNightMode || false;
             els.layoutToggleBottomPanel.checked = settings.enableBottomPanel || false;
        }

    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar configurações de layout: ${error.message}`, 'error');
        }
    });
};

/**
 * Altera uma configuração global de layout (Admin).
 */
export const updateGlobalLayoutSetting = async (setting, value) => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') return;
    try {
        const updateRef = ref(db, `configuracoesGlobais/layout/${setting}`);
        await set(updateRef, value);
        showToast(`Configuração ${setting} atualizada.`, 'success');
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao salvar configuração: ${error.message}`, 'error');
        }
    }
};

/**
 * Carrega a lista de usuários no Painel Admin.
 */
export const loadAdminPanel = (reloadAll = true) => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') {
        showToast("Permissão negada (Admin Required).", "error");
        return;
    }
    
    if (reloadAll) {
         loadGlobalLayoutConfig(); // Garante que os inputs do layout estejam sincronizados
    }
    
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        let userListHtml = '';
        snapshot.forEach(child => {
            const user = child.val();
            const uid = child.key;
            const onlineStatus = globalOnlineStatus[uid] || {};
            const isOnline = onlineStatus.isOnline;
            const lastActiveTime = isOnline 
                ? 'Online' 
                : (onlineStatus.lastActive ? formatInactivityTime(Date.now() - onlineStatus.lastActive) + ' atrás' : 'Nunca');
            
            const isAdmin = user.tag.toUpperCase() === 'ADMIN';

            userListHtml += `
                <tr>
                    <td>${user.displayName}</td>
                    <td class="tag-${user.tag.toLowerCase()}">${user.tag}</td>
                    <td style="color: ${isOnline ? '#28a745' : 'var(--cor-texto)'};">${lastActiveTime}</td>
                    <td>
                        <select onchange="window.scriptLogic.manageUserRole('${uid}', this.value)" ${isAdmin ? 'disabled' : ''}>
                            <option value="Admin" ${user.tag === 'Admin' ? 'selected' : ''}>Admin</option>
                            <option value="Hells" ${user.tag === 'Hells' ? 'selected' : ''}>Hells</option>
                            <option value="Visitante" ${user.tag === 'Visitante' ? 'selected' : ''}>Visitante</option>
                        </select>
                    </td>
                </tr>
            `;
        });
        els.adminUserListBody.innerHTML = userListHtml;
    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar usuários: ${error.message}`, 'error');
        }
    });
};

/**
 * Altera a tag (role) de um usuário (Admin).
 */
export const manageUserRole = async (userId, newTag) => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') return;
    
    try {
        const userRef = ref(db, `users/${userId}/tag`);
        await set(userRef, newTag);
        showToast(`Tag do usuário ${userId} alterada para ${newTag}.`, 'success');
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao alterar tag: ${error.message}`, 'error');
        }
    }
};

/**
 * Funções de migração para uso administrativo (migração de dados antigos).
 */
export const migrateDossier = async () => {
    if (currentUserData.tag.toUpperCase() !== 'ADMIN') return;
    if (!confirm('Esta ação moverá o campo "cargo" do antigo dossiê para "observacoes" na venda. Não use a menos que seja instruído.')) return;
    
    // A lógica de migração original foi complexa e depende da estrutura
    // de dados. Por segurança, apenas o alerta é mantido.
    showToast("Função de migração não implementada neste módulo. Contacte o desenvolvedor.", "error", 5000);
};

export const migrateVeiculos = async () => {
     if (currentUserData.tag.toUpperCase() !== 'ADMIN') return;
     if (!confirm('ATENÇÃO: Isso tentará migrar carros/placas de strings de vendas antigas para o formato de objeto de veículos do dossiê. Pode demorar e gerar erros. Continuar?')) return;
     
     // A lógica de migração original de veículos não foi fornecida, 
     // então o esqueleto é mantido com um alerta.
     showToast("Função de migração de veículos não implementada neste módulo. Contacte o desenvolvedor.", "error", 5000);
};

// =================================================================
// FIM: PAINEL ADMIN E STATUS ONLINE
// =================================================================


// =================================================================
// INÍCIO: FUNÇÃO PRINCIPAL DE AUTENTICAÇÃO
// =================================================================

/**
 * Monitora o estado de autenticação do usuário.
 */
export const monitorAuth = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // 1. Obtém dados customizados (tag) do Realtime Database
            const userRef = ref(db, 'users/' + user.uid);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
                currentUserData = userSnapshot.val();
                if (currentUser.displayName !== currentUserData.displayName) {
                    // Sincroniza o displayName, caso tenha sido mudado no Firebase Auth
                    await update(userRef, { displayName: currentUser.displayName });
                    currentUserData.displayName = currentUser.displayName;
                }
            } else {
                 // Caso o nó 'users' ainda não exista (bug/primeiro login), cria com a tag 'Visitante'
                 await set(userRef, { displayName: currentUser.displayName, email: currentUser.email, tag: 'Visitante' });
                 currentUserData = { displayName: currentUser.displayName, email: currentUser.email, tag: 'Visitante' };
            }
            
            // 2. Configura a interface com base na tag
            configurarInterfacePorTag(currentUserData.tag); 
            
            // 3. Inicia o monitoramento de online status (self)
            updateUserActivity(); 
            monitorOnlineStatus(); 
            
            // 4. Carrega a configuração global (para a UI)
            loadGlobalLayoutConfig();

            // 5. Exibe a tela principal
            els.authScreen.style.display = 'none';
            toggleView('main');
            
        } else {
            // USUÁRIO DESLOGADO
            currentUser = null;
            currentUserData = null;
            vendaOriginalCliente = null; 
            vendaOriginalOrganizacao = null; 
            
            // Remove listeners antigos
            if (vendasListener) vendasListener(); 
            vendas = []; 
            if (monitorOnlineStatusListener) monitorOnlineStatusListener();

            // 6. Exibe a tela de login
            els.authScreen.style.display = 'block';
            els.mainCard.style.display = 'none';
            els.historyCard.style.display = 'none';
            els.adminPanel.style.display = 'none'; 
            els.dossierCard.style.display = 'none';
            if(els.userStatus) els.userStatus.style.display = 'none';
            if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
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
    updateLogoAndThemeButton,
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
    viewDossierPeople,
    addEditVeiculo,
    editVeiculoItem,
    deleteVeiculoItem,
    cancelVeiculoEdit,
    openLightbox,
    closeLightbox,
    migrateDossier,
    migrateVeiculos
};