/* ===============================================
  SALES.JS
  Lógica de Vendas, Cálculo, Histórico e Discord.
  
  VERSÃO SEM PASTAS (Nomes: helpers.js, sales.js)
===============================================
*/

// --- Imports (CAMINHOS CORRIGIDOS)
import { els } from './dom.js';
// Importações do Firebase atualizadas
import { db, ref, set, push, remove, get, query, orderByChild, limitToLast, endAt } from './firebase.js';
import { perUnit, valores, valorDescricao } from './constantes.js';
import { getQty, formatCurrency, capitalizeText, showToast, toggleView, copyToClipboard } from './helpers.js';
import { addDossierEntry, updateDossierEntryOnEdit, findDossierEntryGlobal } from './dossier.js';

// --- Estado Interno do Módulo
let vendas = [];
let vendaEmEdicaoId = null;
let vendaOriginalRegistradoPor = null;
let vendaOriginalRegistradoPorId = null;
let vendaOriginalTimestamp = null;
let vendaOriginalDataHora = null;
let vendaOriginalDossierOrg = null; 
let vendaOriginalCliente = null;
let vendaOriginalOrganizacao = null;

// --- Novas variáveis de estado para Paginação
let oldestTimestampLoaded = null;
let isLoadingHistory = false;
export let historyFullyLoaded = false; // Exportado para script.js
const PAGE_SIZE = 50; // 50 registros por página

// --- Funções de Gerenciamento de Estado (Chamadas pelo script.js)
export const setVendas = (newVendas) => {
    vendas = newVendas;
};

export const setVendaEmEdicao = (id) => {
    vendaEmEdicaoId = id;
};

// --- Funções Principais
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

const updateResults = (totals, productValues, totalValue) => {
  els.results.style.display = 'block';
  els.resultsBody.innerHTML = Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([material, value]) => `<tr><td>${capitalizeText(material.replace(/_/g, ' '))}</td><td>${value.toLocaleString('pt-BR')}</td></tr>`)
    .join('');
  els.valuesBody.innerHTML = productValues.map(item => `<tr><td>${item.product}</td><td>${formatCurrency(item.value)}</td></tr>`).join('');
  els.valorTotalGeral.textContent = formatCurrency(totalValue);
};

export const clearAllFields = () => {
  ['qtyTickets', 'qtyTablets', 'qtyNitro', 'nomeCliente', 'organizacao', 'negociadoras', 'vendaValorObs', 'carroVeiculo', 'placaVeiculo'].forEach(id => els[id].value = '');
  els.tipoValor.value = 'limpo';
  els.organizacaoTipo.value = 'CNPJ';
  els.telefone.value = '';
  els.results.style.display = 'none';
  document.querySelectorAll('.input-invalido').forEach(input => input.classList.remove('input-invalido'));
  
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

const validateFields = () => {
    let isValid = true;
    const camposObrigatorios = [ els.nomeCliente, els.telefone, els.negociadoras ];
    
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
    
    return isValid;
};

export const registerVenda = async (currentUser, currentUserData) => {
  const { qtyTickets, qtyTablets, qtyNitro, totalValue, tipoValor, hasQuantities } = calculate();
  if (!hasQuantities) {
    showToast("É necessário calcular a venda antes de registrar.", "error");
    return;
  }
  if (!validateFields()) {
      showToast("Preencha os campos obrigatórios (marcados em vermelho).", "error");
      return;
  }
  if (!currentUser || !currentUser.displayName) {
      showToast("Erro: Usuário não autenticado.", "error");
      return;
  }
  
  const carro = els.carroVeiculo.value.trim();
  const placas = els.placaVeiculo.value.trim().toUpperCase();
  
  const newVenda = {
    timestamp: vendaEmEdicaoId ? vendaOriginalTimestamp : Date.now(), 
    dataHora: vendaEmEdicaoId ? vendaOriginalDataHora : new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    cliente: els.nomeCliente.value.trim(),
    organizacao: els.organizacao.value.trim(),
    organizacaoTipo: els.organizacaoTipo.value,
    telefone: els.telefone.value.trim(),
    negociadoras: els.negociadoras.value.trim(),
    vendaValorObs: els.vendaValorObs.value.trim(),
    carro: carro, 
    placas: placas,
    qtyTickets, qtyTablets, qtyNitro,
    valorTotal: totalValue,
    tipoValor,
    registradoPor: vendaEmEdicaoId ? vendaOriginalRegistradoPor : currentUser.displayName,
    registradoPorId: vendaEmEdicaoId ? vendaOriginalRegistradoPorId : currentUser.uid 
  };
  
  let dossierOrgDestino = '';
  if (newVenda.organizacaoTipo === 'CPF') dossierOrgDestino = 'CPF';
  else if (newVenda.organizacaoTipo === 'OUTROS') dossierOrgDestino = 'Outros';
  else dossierOrgDestino = newVenda.organizacao.trim();
  
  let dadosAntigosParaMover = null;
  
  // Sincronização com Dossiê (Lógica de movimentação)
  if (!vendaEmEdicaoId && dossierOrgDestino !== '' && newVenda.cliente !== '') {
      try {
          const existingEntry = await findDossierEntryGlobal(newVenda.cliente);
          if (existingEntry && existingEntry.oldOrg !== dossierOrgDestino) {
              dadosAntigosParaMover = { ...existingEntry.personData };
              await remove(ref(db, `dossies/${existingEntry.oldOrg}/${existingEntry.personId}`));
              showToast(`"${newVenda.cliente}" movido de "${existingEntry.oldOrg}" para "${dossierOrgDestino}".`, "default", 4000);
          }
      } catch (e) {
          if (e.code !== "PERMISSION_DENIED") showToast(`Erro ao verificar dossiê global: ${e.message}`, "error");
      }
  }

  // Salva a Venda
  const operation = vendaEmEdicaoId ? set(ref(db, `vendas/${vendaEmEdicaoId}`), newVenda) : push(ref(db, 'vendas'), newVenda);
  
  operation
      .then(() => {
          showToast(`Venda ${vendaEmEdicaoId ? 'atualizada' : 'registrada'} com sucesso!`, "success");
          
          const dossierVendaData = { ...newVenda }; 
          dossierVendaData.organizacao = dossierOrgDestino;

          // Atualiza o Dossiê
          if (dossierOrgDestino !== '') {
              if (vendaEmEdicaoId) {
                  updateDossierEntryOnEdit(vendaOriginalCliente, vendaOriginalDossierOrg, dossierVendaData);
              } else {
                  addDossierEntry(dossierVendaData, dadosAntigosParaMover);
              }
          }
          
          clearAllFields();
      })
      .catch((error) => {
          showToast(`Erro ao registrar venda: ${error.message}`, "error");
      });
};

export const editVenda = (id) => {
    const venda = vendas.find(v => v.id === id);
    if (!venda) return;
    
    els.nomeCliente.value = venda.cliente || '';
    els.organizacao.value = venda.organizacao || '';
    els.organizacaoTipo.value = venda.organizacaoTipo || 'CNPJ';
    els.telefone.value = venda.telefone || '';
    els.negociadoras.value = venda.negociadoras || '';
    els.vendaValorObs.value = venda.vendaValorObs || '';
    els.tipoValor.value = venda.tipoValor || 'limpo';
    els.carroVeiculo.value = venda.carro || ''; 
    els.placaVeiculo.value = venda.placas || ''; 
    els.qtyTickets.value = venda.qtyTickets || 0;
    els.qtyTablets.value = venda.qtyTablets || 0;
    els.qtyNitro.value = venda.qtyNitro || 0;
    
    calculate(); 
    
    // Define o estado interno de edição
    vendaEmEdicaoId = id;
    vendaOriginalRegistradoPor = venda.registradoPor;
    vendaOriginalRegistradoPorId = venda.registradoPorId;
    vendaOriginalTimestamp = venda.timestamp;
    vendaOriginalDataHora = venda.dataHora;
    vendaOriginalCliente = venda.cliente;
    vendaOriginalOrganizacao = venda.organizacao; 
    
    if (venda.organizacaoTipo === 'CPF') vendaOriginalDossierOrg = 'CPF';
    else if (venda.organizacaoTipo === 'OUTROS') vendaOriginalDossierOrg = 'Outros';
    else vendaOriginalDossierOrg = venda.organizacao;
    
    els.registerBtn.textContent = 'Atualizar Venda';
    toggleView('main'); 
    showToast(`Editando venda de ${venda.cliente}`, "default");
};

export const removeVenda = (id) => {
    if (confirm("Tem certeza que deseja remover esta venda?")) {
        remove(ref(db, `vendas/${id}`))
            .then(() => {
                showToast("Venda removida.", "success");
                // Remove do array local e redesenha
                vendas = vendas.filter(v => v.id !== id);
                displaySalesHistory(null, null, null); // Força redesenho com dados locais
            })
            .catch((error) => showToast(`Erro ao remover: ${error.message}`, "error"));
    }
};

// --- Funções de Histórico e Exportação ---

const buildDiscordMessage = (vendaData) => {
    const { cliente, data, orgTipo, org, tel, produtos, valor, obs, negociadoras, cargo } = vendaData;
    return `
\`\`\`
Nome: ${cliente}
Data: ${data}
Organização: ${orgTipo} - ${org}
Telefone: ${tel}
Cargo: ${cargo}
Produto (Unidade): ${produtos}
Venda Valor: ${valor} (${obs})
Negociadoras: ${negociadoras}
\`\`\`
    `.trim();
};

export const copyDiscordMessage = (isFromHistory = false, venda = null, currentUserData) => {
    let messageData;
    if (isFromHistory) {
        let produtos = [];
        if (venda.qtyTickets > 0) produtos.push(`Tickets (${venda.qtyTickets})`);
        if (venda.qtyTablets > 0) produtos.push(`Tablet (${venda.qtyTablets})`);
        if (venda.qtyNitro > 0) produtos.push(`Nitros (${venda.qtyNitro})`);
        
        messageData = {
            cliente: venda.cliente,
            data: venda.dataHora.split(', ')[0],
            orgTipo: venda.organizacaoTipo,
            org: venda.organizacao,
            tel: venda.telefone,
            cargo: venda.vendaValorObs || 'N/A',
            produtos: produtos.join(', '),
            valor: formatCurrency(venda.valorTotal || 0),
            obs: valorDescricao[venda.tipoValor],
            negociadoras: venda.negociadoras
        };
    } else {
        const { qtyTickets, qtyTablets, qtyNitro, totalValue, tipoValor, hasQuantities } = calculate();
        if (!hasQuantities) { showToast("Calcule uma venda antes de copiar.", "error"); return; }
        if (!validateFields()) { showToast("Preencha os dados da venda antes de copiar.", "error"); return; }
        
        let produtos = [];
        if (qtyTickets > 0) produtos.push(`Tickets (${qtyTickets})`);
        if (qtyTablets > 0) produtos.push(`Tablet (${qtyTablets})`);
        if (qtyNitro > 0) produtos.push(`Nitros (${qtyNitro})`);
        
        const dataAtual = new Date().toLocaleDateString('pt-BR');

        messageData = {
            cliente: els.nomeCliente.value.trim(),
            data: dataAtual,
            orgTipo: els.organizacaoTipo.value,
            org: els.organizacao.value.trim(),
            tel: els.telefone.value.trim(),
            cargo: els.vendaValorObs.value.trim() || 'N/A',
            produtos: produtos.join(', '),
            valor: formatCurrency(totalValue),
            obs: valorDescricao[tipoValor],
            negociadoras: els.negociadoras.value.trim()
        };
    }
    copyToClipboard(buildDiscordMessage(messageData));
};

/**
 * Carrega o histórico de vendas com paginação.
 * @param {boolean} isInitialLoad - True se for a primeira carga (limpa o array).
 * @param {object} currentUser - Objeto do usuário autenticado.
 * @param {object} currentUserData - Dados do usuário (com tag).
 */
export const loadSalesHistory = async (isInitialLoad, currentUser, currentUserData) => {
    if (isLoadingHistory) return;
    
    // Reseta o estado se for uma carga inicial
    if (isInitialLoad) {
        historyFullyLoaded = false;
        oldestTimestampLoaded = null;
        setVendas([]); // Limpa o array de vendas global
        els.salesHistory.innerHTML = '<p style="text-align: center; padding: 20px;">Carregando histórico...</p>';
    }

    if (historyFullyLoaded) {
        showToast("Você carregou todo o histórico.", "default");
        els.historyLoadMoreContainer.style.display = 'none';
        return;
    }

    isLoadingHistory = true;
    els.loadMoreHistoryBtn.textContent = 'Carregando...';
    els.loadMoreHistoryBtn.disabled = true;

    try {
        // Todos os usuários (Admin, Hells, Visitante) usarão a query ordenada por timestamp.
        // O filtro de "Visitante" será feito no cliente, em displaySalesHistory.
        // Isso é necessário para que a paginação por timestamp funcione.
        const baseQuery = query(ref(db, 'vendas'), orderByChild('timestamp'));
        
        let paginatedQuery;
        if (oldestTimestampLoaded) {
            // Carrega mais: busca os 50 anteriores ao mais antigo que já temos
            paginatedQuery = query(baseQuery, endAt(oldestTimestampLoaded - 1), limitToLast(PAGE_SIZE));
        } else {
            // Carga Inicial: busca os 50 mais recentes
            paginatedQuery = query(baseQuery, limitToLast(PAGE_SIZE));
        }

        const snapshot = await get(paginatedQuery);

        if (!snapshot.exists() || snapshot.size === 0) {
            historyFullyLoaded = true;
            els.historyLoadMoreContainer.style.display = 'none';
            if (isInitialLoad) {
                els.salesHistory.innerHTML = '<p style="text-align: center; padding: 20px;">Nenhuma venda encontrada.</p>';
            }
            return;
        }

        let newVendas = [];
        snapshot.forEach((child) => {
            newVendas.push({ id: child.key, ...child.val() });
        });

        // A consulta (limitToLast) retorna em ordem ascendente (do mais antigo ao mais novo do lote).
        // Nós invertemos para que os mais novos apareçam primeiro.
        newVendas.reverse();

        if (newVendas.length < PAGE_SIZE) {
            historyFullyLoaded = true;
            els.historyLoadMoreContainer.style.display = 'none';
        } else {
            els.historyLoadMoreContainer.style.display = 'flex';
        }

        // Define o timestamp do último item (o mais antigo) deste lote para a próxima busca
        oldestTimestampLoaded = newVendas[newVendas.length - 1].timestamp;
        
        // Adiciona as novas vendas ao array global
        setVendas([...vendas, ...newVendas]);
        
        // Redesenha o histórico completo
        displaySalesHistory(vendas, currentUser, currentUserData);

    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") showToast(`Erro ao carregar histórico: ${error.message}`, "error");
        els.salesHistory.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--cor-erro);">Erro ao carregar: ${error.message}</p>`;
    } finally {
        isLoadingHistory = false;
        els.loadMoreHistoryBtn.textContent = 'Carregar Mais';
        els.loadMoreHistoryBtn.disabled = false;
    }
};

export const displaySalesHistory = (history, currentUser, currentUserData) => {
    // Se os dados de auth não foram passados (ex: reload por remoção), usa os dados globais
    // Esta função agora espera ser chamada por loadSalesHistory, que passa os dados.
    const historyData = history || vendas;
    
    // Limpa a tabela antes de redesenhar
    els.salesHistory.innerHTML = '';
    
    if (!currentUserData) { 
         // Se ainda não tiver os dados do usuário, não exibe nada (acontece no primeiro load)
         // A função loadSalesHistory será chamada de novo quando os dados estiverem prontos.
         return;
    }

    let vendasFiltradas = historyData;
    const userTagUpper = currentUserData.tag.toUpperCase();
    
    // Filtro para Visitantes (agora sempre feito no cliente)
    if (userTagUpper === 'VISITANTE') {
        vendasFiltradas = historyData.filter(v => v.registradoPorId === currentUser.uid);
    }

    if (vendasFiltradas.length === 0) {
        const row = els.salesHistory.insertRow();
        row.insertCell().colSpan = 9; 
        row.cells[0].textContent = "Nenhuma venda para exibir.";
        row.cells[0].style.textAlign = 'center';
        row.cells[0].style.padding = '20px';
        return;
    }

    // Não precisa mais ordenar aqui, pois `loadSalesHistory` já carrega na ordem correta
    // vendasFiltradas.sort((a, b) => b.timestamp - a.timestamp);

    vendasFiltradas.forEach(venda => {
        const row = els.salesHistory.insertRow(); // appendChild é mais eficiente que innerHTML
        
        const [data, hora] = venda.dataHora.split(', ');
        row.insertCell().innerHTML = `<span class="history-datetime-line">${data}</span><span class="history-datetime-line">${hora}</span>`;
        row.insertCell().textContent = capitalizeText(venda.cliente);
        row.insertCell().textContent = `${capitalizeText(venda.organizacao)} (${venda.organizacaoTipo})`;
        row.insertCell().textContent = venda.telefone;

        let produtos = [];
        if (venda.qtyTickets > 0) produtos.push(`${venda.qtyTickets} Tickets`);
        if (venda.qtyTablets > 0) produtos.push(`${venda.qtyTablets} Tablets`);
        if (venda.qtyNitro > 0) produtos.push(`${venda.qtyNitro} Nitro`);
        row.insertCell().textContent = capitalizeText(produtos.join(', '));
        
        const valorCell = row.insertCell();
        valorCell.className = 'valor-total-cell';
        valorCell.innerHTML = `<span>${formatCurrency(venda.valorTotal || 0)}</span><span class="valor-obs-text">(${valorDescricao[venda.tipoValor] || 'N/A'})`;

        row.insertCell().textContent = capitalizeText(venda.negociadoras);
        
        const registradoPorCell = row.insertCell();
        if (venda.registradoPor && venda.registradoPor.toLowerCase() === 'snow') {
            registradoPorCell.textContent = '???';
            registradoPorCell.style.fontStyle = 'italic';
            registradoPorCell.style.color = '#aaa';
        } else {
            registradoPorCell.textContent = venda.registradoPor || 'Desconhecido';
        }
        
        const actionsCell = row.insertCell();
        actionsCell.className = 'history-actions-cell';

        const podeModificar = 
            (userTagUpper === 'ADMIN') ||
            (userTagUpper === 'HELLS' && venda.registradoPorId === currentUser.uid) ||
            (userTagUpper === 'VISITANTE' && venda.registradoPorId === currentUser.uid);

        actionsCell.innerHTML = `
            <button class="action-btn muted edit-btn" ${!podeModificar ? 'disabled' : ''}>Editar</button>
            <button class="action-btn danger delete-btn" ${!podeModificar ? 'disabled' : ''}>Deletar</button>
            <button class="action-btn muted discord-btn">Discord</button>
        `;
        
        if(podeModificar){
            actionsCell.querySelector('.edit-btn').onclick = () => editVenda(venda.id);
            actionsCell.querySelector('.delete-btn').onclick = () => removeVenda(venda.id);
        }
        actionsCell.querySelector('.discord-btn').onclick = () => copyDiscordMessage(true, venda, currentUserData);
    });
};

export const filterHistory = (currentUser, currentUserData) => {
    const query = els.filtroHistorico.value.toLowerCase().trim();
    // Filtra apenas as vendas JÁ CARREGADAS
    const filteredVendas = vendas.filter(v => 
        Object.values(v).some(val => String(val).toLowerCase().includes(query)) ||
        (v.qtyTickets > 0 && `tickets`.includes(query)) ||
        (v.qtyTablets > 0 && `tablets`.includes(query)) ||
        (v.qtyNitro > 0 && `nitro`.includes(query))
    );
    displaySalesHistory(query ? filteredVendas : vendas, currentUser, currentUserData);
};

export const exportToCsv = () => {
    if (vendas.length === 0) {
        showToast("Nenhum dado para exportar.", "error");
        return;
    }
    
    // Avisa o usuário que apenas os dados carregados serão exportados
    if (!historyFullyLoaded) {
        showToast("Exportando apenas o histórico carregado. Carregue mais para exportar tudo.", "default", 4000);
    } else {
        showToast("Histórico completo exportado para CSV!", "success");
    }
    
    const headers = ["Data/Hora", "Cliente", "Organização", "Tipo", "Telefone", "Negociadoras", "Cargo", "Carro", "Placas", "Qtde Tickets", "Qtde Tablets", "Qtde Nitro", "Valor Total", "Tipo Valor", "Registrado Por"];
    const csvRows = vendas.map(v => [`"${v.dataHora}"`, `"${v.cliente}"`, `"${v.organizacao}"`, `"${v.organizacaoTipo}"`, `"${v.telefone}"`, `"${v.negociadoras}"`, `"${v.vendaValorObs}"`, `"${v.carro || ''}"`, `"${v.placas || ''}"`, v.qtyTickets, v.qtyTablets, v.qtyNitro, v.valorTotal, `"${valorDescricao[v.tipoValor]}"`, `"${v.registradoPor}"`].join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `historico_vendas_HA_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
};

export const clearHistory = (currentUserData) => {
    if (!currentUserData || currentUserData.tag.toUpperCase() !== 'ADMIN') {
        showToast("Apenas administradores podem limpar o histórico.", "error");
        return;
    }
    if (confirm("ATENÇÃO: Deseja APAGAR TODO o histórico de vendas? Esta ação é irreversível.")) {
        remove(ref(db, 'vendas'))
            .then(() => {
                showToast("Histórico limpado.", "success");
                setVendas([]); // Limpa o array local
                historyFullyLoaded = true; // Marca como "totalmente carregado" (vazio)
                displaySalesHistory(null, null, currentUserData); // Redesenha (mostrará "Nenhuma venda")
                els.historyLoadMoreContainer.style.display = 'none'; // Esconde o botão
            })
            .catch(e => showToast(`Erro: ${e.message}`, "error"));
    }
};
