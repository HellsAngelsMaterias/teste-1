/* ===================================================
 * calculator.js
 * Responsável pelos cálculos de materiais,
 * registro, edição e exclusão de vendas.
 * =================================================== */

// --- IMPORTS ---
import { db, ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update } from './firebase.js';
import { els, formatCurrency, showToast, capitalizeText } from './ui.js';
import { getCurrentUser, getCurrentUserData } from './auth.js';
import { addDossierEntry, updateDossierEntryOnEdit } from './dossier.js';
import { setActivity } from './script.js'; // Importa o setActivity

// --- CONSTANTES ---
const PRECOS = {
    ticket: { limpo: 1500, sujo: 1000, limpo_alianca: 1000, sujo_alianca: 800 },
    tablet: { limpo: 3000, sujo: 2000, limpo_alianca: 2000, sujo_alianca: 1500 },
    nitro: { limpo: 60000, sujo: 40000, limpo_alianca: 40000, sujo_alianca: 30000 }
};
const MATERIAIS = {
    ticket: { acido: 2, cocaina: 2, gomas: 1 },
    tablet: { acido: 4, cocaina: 4, gomas: 2 },
    nitro: { metanfetamina: 10, garrafas: 20, quimico: 10 }
};

// --- STATE ---
let vendas = []; // Cache local das vendas
let vendaOriginalCliente = null; // Para edição
let vendaOriginalOrganizacao = null; // Para edição
let vendasListener = null;

// --- FUNÇÕES DE LOG DE AUDITORIA (NOVO) ---
/**
 * Registra uma ação administrativa (edição/remoção) no Firebase
 * *** NOVO ***
 */
function logAudit(actionType, saleData, oldSaleData = null) {
    const user = getCurrentUser();
    if (!user) return; // Não registra se não houver usuário

    const logRef = ref(db, 'logsDeAuditoria');
    const logEntry = {
        uid: user.uid,
        displayName: user.displayName,
        action: actionType, // 'edição' ou 'remoção'
        timestamp: new Date().toISOString(),
        saleId: saleData.id,
        saleContent: saleData
    };

    if (actionType === 'edição' && oldSaleData) {
        logEntry.oldSaleContent = oldSaleData;
    }

    push(logRef, logEntry).catch(err => console.error("Falha ao registrar log de auditoria:", err));
}


// --- FUNÇÕES DE CÁLCULO ---

const calcular = () => {
    const qtyTickets = parseInt(els.qtyTickets.value) || 0;
    const qtyTablets = parseInt(els.qtyTablets.value) || 0;
    const qtyNitro = parseInt(els.qtyNitro.value) || 0;
    const tipoValor = els.tipoValor.value;

    const totais = { acido: 0, cocaina: 0, gomas: 0, metanfetamina: 0, garrafas: 0, quimico: 0 };
    Object.keys(MATERIAIS.ticket).forEach(mat => { totais[mat] += qtyTickets * MATERIAIS.ticket[mat]; });
    Object.keys(MATERIAIS.tablet).forEach(mat => { totais[mat] += qtyTablets * MATERIAIS.tablet[mat]; });
    Object.keys(MATERIAIS.nitro).forEach(mat => { totais[mat] += qtyNitro * MATERIAIS.nitro[mat]; });

    const valores = {
        ticket: qtyTickets * PRECOS.ticket[tipoValor],
        tablet: qtyTablets * PRECOS.tablet[tipoValor],
        nitro: qtyNitro * PRECOS.nitro[tipoValor]
    };
    const valorTotalGeral = valores.ticket + valores.tablet + valores.nitro;

    // Atualiza a UI
    els.resultsBody.innerHTML = '';
    Object.keys(totais).forEach(mat => {
        if (totais[mat] > 0) {
            const row = els.resultsBody.insertRow();
            row.insertCell(0).textContent = capitalizeText(mat);
            row.insertCell(1).textContent = totais[mat];
        }
    });

    els.valuesBody.innerHTML = '';
    if (qtyTickets > 0) {
        const row = els.valuesBody.insertRow();
        row.insertCell(0).textContent = 'Tickets';
        row.insertCell(1).textContent = formatCurrency(valores.ticket);
    }
    if (qtyTablets > 0) {
        const row = els.valuesBody.insertRow();
        row.insertCell(0).textContent = 'Tablets';
        row.insertCell(1).textContent = formatCurrency(valores.tablet);
    }
    if (qtyNitro > 0) {
        const row = els.valuesBody.insertRow();
        row.insertCell(0).textContent = 'Nitro';
        row.insertCell(1).textContent = formatCurrency(valores.nitro);
    }

    els.valorTotalGeral.textContent = formatCurrency(valorTotalGeral);
    els.results.style.display = 'block';
};

const resetarCalculo = () => {
    els.qtyTickets.value = '';
    els.qtyTablets.value = '';
    els.qtyNitro.value = '';
    els.tipoValor.value = 'limpo';
    els.results.style.display = 'none';
    els.resultsBody.innerHTML = '';
    els.valuesBody.innerHTML = '';
    els.valorTotalGeral.textContent = 'R$ 0';
    
    // Reseta dados da venda
    els.nomeCliente.value = '';
    els.organizacao.value = '';
    els.organizacaoTipo.value = 'CNPJ';
    els.telefone.value = '';
    els.carroVeiculo.value = '';
    els.placaVeiculo.value = '';
    els.negociadoras.value = '';
    els.vendaValorObs.value = '';
    
    // Reseta estado de edição
    els.registerBtn.textContent = 'Registrar Venda';
    els.registerBtn.onclick = registerSale;
    vendaOriginalCliente = null;
    vendaOriginalOrganizacao = null;
};

// --- FUNÇÕES DE VENDAS (CRUD) ---

/**
 * Carrega as vendas do Firebase
 */
export function loadVendas(vendasRef) {
    if (vendasListener) vendasListener(); // Remove o listener antigo
    
    vendasListener = onValue(vendasRef, (snapshot) => {
        vendas = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                vendas.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            // Ordena por data (mais recentes primeiro)
            vendas.sort((a, b) => new Date(b.dataHoraISO || 0) - new Date(a.dataHoraISO || 0));
        }
        displaySalesHistory(vendas);
    }, (error) => {
        console.error("Erro ao carregar vendas: ", error);
        showToast("Erro ao carregar histórico de vendas.", "error");
    });
    
    return vendasListener;
}

export function unloadVendas() {
    if (vendasListener) vendasListener();
    vendas = [];
    displaySalesHistory(vendas);
}

/**
 * Exibe o histórico de vendas na tabela
 */
function displaySalesHistory(vendasParaExibir) {
    const historyBody = els.salesHistory;
    const filtro = els.filtroHistorico.value.toLowerCase();
    historyBody.innerHTML = '';

    const currentUserData = getCurrentUserData();
    if (!currentUserData) return;
    
    const userTagUpper = currentUserData.tag.toUpperCase();
    const canEdit = (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS');
    
    const vendasFiltradas = vendasParaExibir.filter(venda => {
        return (
            venda.dataHora.toLowerCase().includes(filtro) ||
            venda.cliente.toLowerCase().includes(filtro) ||
            venda.organizacao.toLowerCase().includes(filtro) ||
            (venda.produtos || []).some(p => p.nome.toLowerCase().includes(filtro)) ||
            venda.registradoPor.toLowerCase().includes(filtro) ||
            venda.negociadoras.toLowerCase().includes(filtro)
        );
    });

    if (vendasFiltradas.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Nenhum registro encontrado.</td></tr>';
        return;
    }

    vendasFiltradas.forEach(venda => {
        const row = historyBody.insertRow();
        const produtosHtml = (venda.produtos || []).map(p => `${p.nome} (${p.qty})`).join('<br>');
        
        row.insertCell(0).innerHTML = `<span class="history-datetime-line">${venda.dataHora.split(' ')[0]}</span><span class="history-datetime-line">${venda.dataHora.split(' ')[1]}</span>`;
        row.insertCell(1).textContent = venda.cliente;
        row.insertCell(2).textContent = `${venda.organizacao} (${venda.organizacaoTipo})`;
        row.insertCell(3).textContent = venda.telefone;
        row.insertCell(4).innerHTML = produtosHtml;
        row.insertCell(5).innerHTML = `<span class="valor-total-cell">${formatCurrency(venda.valorTotal)}</span><br><span class="valor-obs-text">${venda.vendaValorObs || ''}</span>`;
        row.insertCell(6).textContent = venda.negociadoras;
        row.insertCell(7).textContent = venda.registradoPor;
        
        const actionsCell = row.insertCell(8);
        actionsCell.className = 'history-actions-cell';
        
        // Botão Copiar
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copiar';
        copyBtn.className = 'action-btn muted';
        copyBtn.onclick = () => copySaleToCalculator(venda);
        actionsCell.appendChild(copyBtn);

        if (canEdit) {
            // Botão Editar
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.className = 'action-btn primary';
            editBtn.onclick = () => {
                setActivity('Editando Venda'); // *** NOVO: Define Atividade ***
                copySaleToCalculator(venda, true); // true para modo de edição
            };
            actionsCell.appendChild(editBtn);
            
            // Botão Apagar
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Apagar';
            deleteBtn.className = 'action-btn danger';
            deleteBtn.onclick = () => deleteSale(venda.id);
            actionsCell.appendChild(deleteBtn);
        }
    });
}

/**
 * Prepara o formulário para registrar uma nova venda
 */
const registerSale = () => {
    setActivity('Registrando Venda'); // *** NOVO: Define Atividade ***
    const user = getCurrentUser();
    if (!user) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }

    const vendaData = getVendaDataFromUI();
    if (!vendaData) return; // getVendaDataFromUI já mostra o toast de erro
    
    vendaData.registradoPor = user.displayName;
    vendaData.registradoPorId = user.uid;

    const vendasRef = ref(db, 'vendas');
    push(vendasRef, vendaData)
        .then((newRef) => {
            showToast("Venda registrada com sucesso!", "success");
            
            // Sincroniza com Dossiê
            addDossierEntry(getDossierDataFromVenda(vendaData));
            
            resetarCalculo();
            setActivity('Na Calculadora'); // *** NOVO: Reseta Atividade ***
        })
        .catch(err => {
            showToast(`Erro ao registrar: ${err.message}`, "error");
            setActivity('Na Calculadora'); // *** NOVO: Reseta Atividade ***
        });
};

/**
 * Prepara o formulário para editar uma venda existente
 */
const editSale = (saleId) => {
    const user = getCurrentUser();
    if (!user) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }
    
    // *** NOVO: Pega a venda antiga para o log ***
    const oldSale = vendas.find(v => v.id === saleId);
    if (!oldSale) {
        showToast("Erro: Venda original não encontrada para auditoria.", "error");
        return;
    }

    const vendaData = getVendaDataFromUI();
    if (!vendaData) return;
    
    // Mantém o autor original, mas atualiza quem editou
    vendaData.registradoPor = oldSale.registradoPor; // Mantém o autor original
    vendaData.registradoPorId = oldSale.registradoPorId; // Mantém o ID original
    vendaData.editadoPor = user.displayName; // Adiciona quem editou
    vendaData.editadoEm = new Date().toISOString();

    const saleRef = ref(db, `vendas/${saleId}`);
    update(saleRef, vendaData)
        .then(() => {
            showToast("Venda atualizada com sucesso!", "success");

            // *** NOVO: Registra no Log de Auditoria ***
            logAudit('edição', { id: saleId, ...vendaData }, oldSale);

            // Sincroniza com Dossiê (passando dados antigos)
            updateDossierEntryOnEdit(
                vendaOriginalCliente, 
                vendaOriginalOrganizacao, 
                getDossierDataFromVenda(vendaData)
            );
            
            resetarCalculo(); // Limpa o formulário e reseta o botão
            setActivity('Vendo Histórico'); // *** NOVO: Reseta Atividade ***
        })
        .catch(err => {
            showToast(`Erro ao atualizar: ${err.message}`, "error");
            setActivity('Vendo Histórico'); // *** NOVO: Reseta Atividade ***
        });
};

/**
 * Remove uma venda do Firebase
 */
const deleteSale = (saleId) => {
    const user = getCurrentUser();
    if (!user) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }
    
    // *** NOVO: Pega a venda para o log ***
    const saleToDelete = vendas.find(v => v.id === saleId);
    if (!saleToDelete) {
        showToast("Erro: Venda não encontrada para auditoria.", "error");
        return;
    }

    if (!confirm(`Tem certeza que quer apagar a venda de "${saleToDelete.cliente}"? Essa ação não pode ser desfeita.`)) {
        return;
    }
    
    setActivity('Apagando Venda'); // *** NOVO: Define Atividade ***

    // *** NOVO: Registra no Log de Auditoria (ANTES de apagar) ***
    logAudit('remoção', saleToDelete);

    const saleRef = ref(db, `vendas/${saleId}`);
    remove(saleRef)
        .then(() => {
            showToast("Venda removida com sucesso.", "success");
            // O listener onValue (loadVendas) vai atualizar a UI automaticamente
            setActivity('Vendo Histórico'); // *** NOVO: Reseta Atividade ***
        })
        .catch(err => {
            showToast(`Erro ao remover: ${err.message}`, "error");
            setActivity('Vendo Histórico'); // *** NOVO: Reseta Atividade ***
        });
};

// --- FUNÇÕES AUXILIARES (Helpers) ---

/**
 * Lê os dados do formulário e valida
 */
const getVendaDataFromUI = () => {
    const dataHora = els.dataVenda.value;
    const cliente = els.nomeCliente.value.trim();
    const organizacao = els.organizacao.value.trim();
    const tipoValor = els.tipoValor.value;
    
    if (!cliente || !organizacao) {
        showToast("Nome do cliente e Organização são obrigatórios.", "error");
        return null;
    }

    const produtos = [];
    const qtyTickets = parseInt(els.qtyTickets.value) || 0;
    const qtyTablets = parseInt(els.qtyTablets.value) || 0;
    const qtyNitro = parseInt(els.qtyNitro.value) || 0;
    
    if (qtyTickets > 0) produtos.push({ nome: 'Tickets', qty: qtyTickets });
    if (qtyTablets > 0) produtos.push({ nome: 'Tablets', qty: qtyTablets });
    if (qtyNitro > 0) produtos.push({ nome: 'Nitro', qty: qtyNitro });

    if (produtos.length === 0) {
        showToast("Nenhum produto foi calculado para registrar.", "error");
        return null;
    }
    
    const valorTotal = (qtyTickets * PRECOS.ticket[tipoValor]) + 
                       (qtyTablets * PRECOS.tablet[tipoValor]) + 
                       (qtyNitro * PRECOS.nitro[tipoValor]);

    return {
        dataHora: dataHora,
        dataHoraISO: new Date().toISOString(),
        cliente: capitalizeText(cliente),
        organizacao: capitalizeText(organizacao),
        organizacaoTipo: els.organizacaoTipo.value,
        telefone: els.telefone.value,
        carroVeiculo: els.carroVeiculo.value.trim(),
        placaVeiculo: els.placaVeiculo.value.trim().toUpperCase(),
        negociadoras: capitalizeText(els.negociadoras.value.trim()),
        vendaValorObs: capitalizeText(els.vendaValorObs.value.trim()),
        produtos: produtos,
        tipoValor: tipoValor,
        valorTotal: valorTotal
    };
};

/**
 * Extrai dados relevantes da venda para o Dossiê
 */
const getDossierDataFromVenda = (vendaData) => {
    return {
        cliente: vendaData.cliente,
        organizacao: vendaData.organizacao,
        telefone: vendaData.telefone,
        vendaValorObs: vendaData.vendaValorObs, // Cargo
        dataHora: vendaData.dataHora,
        carro: vendaData.carroVeiculo,
        placas: vendaData.placaVeiculo
    };
};

/**
 * Copia dados de uma venda do histórico de volta para a calculadora
 */
const copySaleToCalculator = (venda, isEditMode = false) => {
    els.qtyTickets.value = (venda.produtos.find(p => p.nome === 'Tickets') || {}).qty || '';
    els.qtyTablets.value = (venda.produtos.find(p => p.nome === 'Tablets') || {}).qty || '';
    els.qtyNitro.value = (venda.produtos.find(p => p.nome === 'Nitro') || {}).qty || '';
    els.tipoValor.value = venda.tipoValor;

    els.nomeCliente.value = venda.cliente;
    els.organizacao.value = venda.organizacao;
    els.organizacaoTipo.value = venda.organizacaoTipo;
    els.telefone.value = venda.telefone;
    els.carroVeiculo.value = venda.carroVeiculo || '';
    els.placaVeiculo.value = venda.placaVeiculo || '';
    els.negociadoras.value = venda.negociadoras;
    els.vendaValorObs.value = venda.vendaValorObs;
    // Não copiamos a data, usamos a data atual
    
    calcular(); // Recalcula os totais
    
    // Muda para a tela principal
    setActivity('Copiando Venda'); // *** NOVO: Define Atividade ***
    handleToggleView('main'); // Usa a função do script.js
    
    els.nomeCliente.focus();
    
    if (isEditMode) {
        vendaOriginalCliente = venda.cliente;
        vendaOriginalOrganizacao = venda.organizacao;
        els.registerBtn.textContent = 'Salvar Edição';
        els.registerBtn.onclick = () => editSale(venda.id);
        showToast("Modo de Edição: Altere os dados e clique em 'Salvar Edição'.", "default", 4000);
        setActivity('Editando Venda'); // *** NOVO: Define Atividade ***
    } else {
        els.registerBtn.textContent = 'Registrar Venda';
        els.registerBtn.onclick = registerSale;
        showToast("Dados copiados. Ajuste e registre como uma nova venda.", "success");
    }
};

/**
 * Filtra o histórico de vendas localmente
 */
const filtrarHistorico = () => {
    displaySalesHistory(vendas);
};


// --- INICIALIZAÇÃO ---
export function initCalculator() {
    // Binds
    els.calcBtn.onclick = calcular;
    els.resetBtn.onclick = resetarCalculo;
    els.registerBtn.onclick = registerSale; // Botão principal
    els.filtroHistorico.addEventListener('input', filtrarHistorico);
    
    // Opcional: calcular ao mudar inputs
    els.qtyTickets.addEventListener('input', calcular);
    els.qtyTablets.addEventListener('input', calcular);
    els.qtyNitro.addEventListener('input', calcular);
    els.tipoValor.addEventListener('change', calcular);
}

// Funções importadas por script.js
function handleToggleView(viewName) {
    // Esta é uma função stub, a real está em script.js
    console.warn("handleToggleView chamada de dentro do calculator.js, o que não deveria acontecer.");
    toggleView(viewName);
}
