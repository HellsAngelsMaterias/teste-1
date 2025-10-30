/* ===============================================
  SALES.JS
  Lógica de Vendas, Cálculo, Histórico e Discord.
===============================================
*/

// --- Imports
import { els } from './dom.js';
// ALTERADO: Adicionado 'get' e 'update'
import { db, ref, set, push, remove, get, update } from './firebase.js'; 
import { perUnit, valores, valorDescricao } from './constantes.js';
import { getQty, formatCurrency, capitalizeText, showToast, toggleView, copyToClipboard } from './helpers.js';
import { addDossierEntry, updateDossierEntryOnEdit, findDossierEntryGlobal } from './dossier.js';

// --- Estado Interno do Módulo (Gerenciado pelo script.js)
let vendas = [];
let vendaEmEdicaoId = null;
let vendaOriginalRegistradoPor = null;
let vendaOriginalRegistradoPorId = null;
let vendaOriginalTimestamp = null;
let vendaOriginalDataHora = null;
let vendaOriginalDossierOrg = null; 
let vendaOriginalCliente = null;
let vendaOriginalOrganizacao = null;

// --- Funções de Gerenciamento de Estado (Chamadas pelo script.js)
export const setVendas = (newVendas) => {
    vendas = newVendas;
};
export const setVendaEmEdicao = (id) => {
    vendaEmEdicaoId = id;
};
export const setVendaOriginal = (data) => {
    if (!data) {
        vendaEmEdicaoId = null;
        vendaOriginalRegistradoPor = null;
        vendaOriginalRegistradoPorId = null;
        vendaOriginalTimestamp = null;
        vendaOriginalDataHora = null;
        vendaOriginalDossierOrg = null; 
        vendaOriginalCliente = null;
        vendaOriginalOrganizacao = null;
    } else {
        vendaEmEdicaoId = data.id;
        vendaOriginalRegistradoPor = data.registradoPor;
        vendaOriginalRegistradoPorId = data.registradoPorId;
        vendaOriginalTimestamp = data.timestamp;
        vendaOriginalDataHora = data.dataHora;
        vendaOriginalCliente = data.cliente;
        vendaOriginalOrganizacao = data.organizacao;
        
        if (data.organizacaoTipo === 'CPF') {
            vendaOriginalDossierOrg = 'CPF';
        } else if (data.organizacaoTipo === 'OUTROS') {
            vendaOriginalDossierOrg = 'Outros';
        } else {
            vendaOriginalDossierOrg = data.organizacao;
        }
    }
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
    setVendaOriginal(null); // Limpa o estado de edição local
    els.registerBtn.textContent = 'Registrar Venda';
  }
};

// --- NOVO: Função para cancelar e limpar o lock do Firebase ---
export const cancelEditAndClearFields = async () => {
  const id = vendaEmEdicaoId; // Pega o ID *antes* de clearAllFields limpá-lo
  if (id) {
    const lockData = {
      editandoPorUid: null,
      editandoPorNome: null,
      editandoDesdeTimestamp: null
    };
    // Limpa o lock no Firebase. Não precisa 'await', pode ser em background.
    update(ref(db, `vendas/${id}`), lockData);
  }
  clearAllFields(); // Limpa o formulário e o estado local
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

export const registerVenda = async (currentUser) => {
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
  
  // --- NOVO: Limpa os campos de lock ao salvar uma edição ---
  if (vendaEmEdicaoId) {
    newVenda.editandoPorUid = null;
    newVenda.editandoPorNome = null;
    newVenda.editandoDesdeTimestamp = null;
  }
  
  
  let dossierOrgDestino = '';
  if (newVenda.organizacaoTipo === 'CPF') {
      dossierOrgDestino = 'CPF';
  } else if (newVenda.organizacaoTipo === 'OUTROS') {
      dossierOrgDestino = 'Outros';
  } else { 
      dossierOrgDestino = newVenda.organizacao.trim();
  }
  
  let dadosAntigosParaMover = null;
  
  if (!vendaEmEdicaoId && dossierOrgDestino !== '' && newVenda.cliente !== '') {
      try {
          const existingEntry = await findDossierEntryGlobal(newVenda.cliente);
          
          if (existingEntry && existingEntry.oldOrg !== dossierOrgDestino) {
              
              dadosAntigosParaMover = { ...existingEntry.personData };
              
              await remove(ref(db, `dossies/${existingEntry.oldOrg}/${existingEntry.personId}`));
              
              showToast(`"${newVenda.cliente}" movido de "${existingEntry.oldOrg}" para "${dossierOrgDestino}".`, "default", 4000);
          }
      } catch (e) {
          if (e.code !== "PERMISSION_DENIED") {
              showToast(`Erro ao verificar dossiê global: ${e.message}`, "error");
          }
      }
  }
  

  const operation = vendaEmEdicaoId ? set(ref(db, `vendas/${vendaEmEdicaoId}`), newVenda) : push(ref(db, 'vendas'), newVenda);
  
  operation
      .then(() => {
          showToast(`Venda ${vendaEmEdicaoId ? 'atualizada' : 'registrada'} com sucesso!`, "success");
          
          const dossierVendaData = { ...newVenda }; 
          dossierVendaData.organizacao = dossierOrgDestino;

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

// --- ALTERADO: Função agora é 'async' e passa 'currentUser' ---
export const editVenda = async (id, currentUser) => {
    // 1. Busca os dados mais recentes do Firebase
    const vendaRef = ref(db, `vendas/${id}`);
    const vendaSnap = await get(vendaRef);
    if (!vendaSnap.exists()) {
        showToast("Erro: Venda não encontrada.", "error");
        return;
    }
    const venda = vendaSnap.val();

    // 2. NOVO: Controle de Concorrência
    const lockTime = 300000; // 5 minutos (300.000 ms)
    const isStale = (Date.now() - (venda.editandoDesdeTimestamp || 0)) > lockTime;
    
    if (venda.editandoPorUid && venda.editandoPorUid !== currentUser.uid && !isStale) {
        showToast(`Esta venda está sendo editada por ${venda.editandoPorNome} no momento.`, "error", 4000);
        return;
    }
    
    // 3. NOVO: Define o lock para este usuário
    const lockData = {
        editandoPorUid: currentUser.uid,
        editandoPorNome: currentUser.displayName,
        editandoDesdeTimestamp: Date.now()
    };
    await update(vendaRef, lockData);
    
    // 4. Lógica existente (agora usando 'venda' do Firebase)
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
    
    // Atualiza o lock localmente também para o setVendaOriginal
    venda.editandoPorUid = lockData.editandoPorUid;
    venda.editandoPorNome = lockData.editandoPorNome;
    venda.editandoDesdeTimestamp = lockData.editandoDesdeTimestamp;
    
    setVendaOriginal({ id, ...venda }); // Configura o estado de edição
    
    els.registerBtn.textContent = 'Atualizar Venda';
    toggleView('main'); 
    showToast(`Editando venda de ${venda.cliente}`, "default");
};


export const removeVenda = (id) => {
    if (confirm("Tem certeza que deseja remover esta venda?")) {
        remove(ref(db, `vendas/${id}`))
            .then(() => {
                showToast("Venda removida.", "success");
            })
            .catch((error) => {
                showToast(`Erro ao remover: ${error.message}`, "error");
            });
    }
};

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

export const copyDiscordMessage = (isFromHistory = false, venda = null) => {
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

export const displaySalesHistory = (history, currentUser, currentUserData, onCompleteCallback) => {
    els.salesHistory.innerHTML = '';
    if (!currentUserData) { 
         if (onCompleteCallback) onCompleteCallback();
         return;
    }

    let vendasFiltradas = history;
    const userTagUpper = currentUserData.tag.toUpperCase();
    
    if (userTagUpper === 'VISITANTE') {
        vendasFiltradas = history.filter(v => v.registradoPorId === currentUser.uid);
    }

    if (vendasFiltradas.length === 0) {
        const row = els.salesHistory.insertRow();
        row.insertCell().colSpan = 9; 
        row.cells[0].textContent = "Nenhuma venda para exibir.";
        row.cells[0].style.textAlign = 'center';
        row.cells[0].style.padding = '20px';
        if (onCompleteCallback) onCompleteCallback();
        return;
    }

    vendasFiltradas.sort((a, b) => b.timestamp - a.timestamp);

    vendasFiltradas.forEach(venda => {
        const row = els.salesHistory.insertRow();
        
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

        // --- NOVO: Lógica do Botão de Edição com Lock ---
        const lockTime = 300000; // 5 minutos
        const isStale = (Date.now() - (venda.editandoDesdeTimestamp || 0)) > lockTime;
        const isLockedByOther = venda.editandoPorUid && venda.editandoPorUid !== currentUser.uid && !isStale;
        const isLockedByMe = venda.editandoPorUid && venda.editandoPorUid === currentUser.uid && !isStale;

        let editBtnText = "Editar";
        let editBtnClass = "muted";
        let editBtnDisabled = !podeModificar; // Começa com a permissão base

        if (isLockedByOther) {
            editBtnText = "Bloqueada";
            editBtnClass = "danger";
            editBtnDisabled = true; // Trava o botão
        } else if (isLockedByMe) {
            editBtnText = "Editando";
            editBtnClass = "success"; // Verde para indicar que *eu* estou editando
        }
        // --- FIM DA LÓGICA ---

        actionsCell.innerHTML = `
            <button class="action-btn ${editBtnClass} edit-btn" ${editBtnDisabled ? 'disabled' : ''}>${editBtnText}</button>
            <button class="action-btn danger delete-btn" ${!podeModificar ? 'disabled' : ''}>Deletar</button>
            <button class="action-btn muted discord-btn">Discord</button>
        `;
        
        // Adiciona os listeners
        const editBtn = actionsCell.querySelector('.edit-btn');
        const deleteBtn = actionsCell.querySelector('.delete-btn');
        
        if (podeModificar) {
            if (!editBtnDisabled) { // Se não estiver desabilitado (pelas regras de lock)
                // ALTERADO: Passa 'currentUser'
                editBtn.onclick = () => editVenda(venda.id, currentUser); 
            }
            deleteBtn.onclick = () => removeVenda(venda.id);
        }
        
        actionsCell.querySelector('.discord-btn').onclick = () => copyDiscordMessage(true, venda);
    });
    
    if (onCompleteCallback) {
        onCompleteCallback();
    }
};

export const filterHistory = (currentUser, currentUserData, onCompleteCallback) => {
    const query = els.filtroHistorico.value.toLowerCase().trim();
    const filteredVendas = vendas.filter(v => 
        Object.values(v).some(val => String(val).toLowerCase().includes(query)) ||
        (v.qtyTickets > 0 && `tickets`.includes(query)) ||
        (v.qtyTablets > 0 && `tablets`.includes(query)) ||
        (v.qtyNitro > 0 && `nitro`.includes(query))
    );
    displaySalesHistory(query ? filteredVendas : vendas, currentUser, currentUserData, onCompleteCallback);
};

export const exportToCsv = () => {
    if (vendas.length === 0) {
        showToast("Nenhum dado para exportar.", "error");
        return;
    }
    const headers = ["Data/Hora", "Cliente", "Organização", "Tipo", "Telefone", "Negociadoras", "Cargo", "Carro", "Placas", "Qtde Tickets", "Qtde Tablets", "Qtde Nitro", "Valor Total", "Tipo Valor", "Registrado Por"];
    const csvRows = vendas.map(v => [`"${v.dataHora}"`, `"${v.cliente}"`, `"${v.organizacao}"`, `"${v.organizacaoTipo}"`, `"${v.telefone}"`, `"${v.negociadoras}"`, `"${v.vendaValorObs}"`, `"${v.carro || ''}"`, `"${v.placas || ''}"`, v.qtyTickets, v.qtyTablets, v.qtyNitro, v.valorTotal, `"${valorDescricao[v.tipoValor]}"`, `"${v.registradoPor}"`].join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `historico_vendas_HA_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast("Histórico exportado para CSV!", "success");
};

export const clearHistory = (currentUserData) => {
    if (!currentUserData || currentUserData.tag.toUpperCase() !== 'ADMIN') {
        showToast("Apenas administradores podem limpar o histórico.", "error");
        return;
    }
    if (confirm("ATENÇÃO: Deseja APAGAR TODO o histórico de vendas? Esta ação é irreversível.")) {
        remove(ref(db, 'vendas'))
            .then(() => showToast("Histórico limpado.", "success"))
            .catch(e => showToast(`Erro: ${e.message}`, "error"));
    }
};
