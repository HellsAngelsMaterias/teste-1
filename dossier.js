/* ===============================================
  DOSSIER.JS
  Lógica de Investigação, Dossiês, Modais e
  Sincronização de Vendas.
===============================================
*/

// --- Imports
import { els } from './dom.js';
import { db, ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update } from './firebase.js';
import { showToast, capitalizeText } from './helpers.js';

// --- Estado Interno do Módulo
let globalAllOrgs = []; 
let globalCurrentPeople = [];
let sortableInstance = null; 
let orgSortableInstance = null; 
let tempVeiculos = {};
let veiculoEmEdicaoKey = null; 

// ===============================================
// LÓGICA DE SINCRONIZAÇÃO (Usada por sales.js)
// ===============================================

export const findDossierEntryGlobal = async (nome) => {
    if (!nome) return null;
    try {
        const snapshot = await get(ref(db, 'dossies'));
        if (!snapshot.exists()) return null;
        const dossies = snapshot.val();
        for (const orgKey in dossies) {
            for (const personId in dossies[orgKey]) {
                if (dossies[orgKey][personId].nome && dossies[orgKey][personId].nome.toLowerCase() === nome.toLowerCase()) {
                    return {
                        personData: dossies[orgKey][personId],
                        personId: personId,
                        oldOrg: orgKey
                    };
                }
            }
        }
        return null;
    } catch (error) {
        if (error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao buscar no dossiê: ${error.message}`, "error");
        }
        return null;
    }
};

export const addDossierEntry = async (venda, dadosAntigosParaMover = null) => {
    if (!venda || !venda.organizacao || !venda.cliente || venda.organizacao.trim() === '') return;
    
    const orgNome = venda.organizacao.trim();
    const nomeCliente = venda.cliente.trim();

    try {
        // --- ETAPA 1: Verificar e Criar a Organização (Base) ---
        const orgsRef = ref(db, 'organizacoesDossier');
        const orgQuery = query(orgsRef, orderByChild('nome'), equalTo(orgNome));
        const orgSnapshot = await get(orgQuery);
        
        if (!orgSnapshot.exists()) {
            const newOrgRef = push(orgsRef);
            
            let defaultInfo = 'Base criada automaticamente via Registro de Venda.';
            if (orgNome === 'CPF') {
                defaultInfo = 'Pessoas registradas com a opção CPF.';
            } else if (orgNome === 'Outros') {
                defaultInfo = 'Pessoas registradas com a opção Outros.';
            }

            await set(newOrgRef, {
                nome: orgNome,
                fotoUrl: '', 
                info: defaultInfo,
                hierarquiaIndex: 9999 
            });
            showToast(`Nova Base "${orgNome}" foi criada no Dossiê.`, "success");
        }
        
        // --- ETAPA 2: Verificar e Criar/Atualizar a Pessoa ---
        const orgRef = ref(db, `dossies/${orgNome}`);
        const q = query(orgRef, orderByChild('nome'), equalTo(nomeCliente));
        const snapshot = await get(q); 

        let entryKey = null;
        let entryData = null;
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                entryKey = child.key;
                entryData = child.val();
            });
        }
        
        const veiculosParaAdicionar = {};
        const carros = (venda.carro && venda.carro.trim())
                       ? venda.carro.split(',').map(c => c.trim())
                       : [];
        const placas = (venda.placas && venda.placas.trim())
                       ? venda.placas.split(',').map(p => p.trim())
                       : [];
        
        const maxLen = Math.max(carros.length, placas.length);

        if (maxLen > 0) {
            for (let i = 0; i < maxLen; i++) {
                const carroNome = carros[i] || '';
                const placa = placas[i] || '';
                if (carroNome || placa) {
                    const key = placa || `carro_${Date.now()}_${i}`;
                    veiculosParaAdicionar[key] = {
                        carro: carroNome,
                        placa: placa,
                        fotoUrl: ''
                    };
                }
            }
        }

        if (entryKey && entryData) {
            // --- ATUALIZA ENTRADA EXISTENTE ---
            const existingVeiculos = entryData.veiculos || {};
            const mergedVeiculos = {...existingVeiculos, ...veiculosParaAdicionar};
            
            await update(ref(db, `dossies/${orgNome}/${entryKey}`), {
                telefone: entryData.telefone || venda.telefone || '',
                cargo: entryData.cargo || venda.vendaValorObs || '',
                veiculos: mergedVeiculos,
                fotoUrl: entryData.fotoUrl || '',
                instagram: entryData.instagram || '',
            });
            
        } else {
            // --- CRIA NOVA ENTRADA ---
            const newEntry = dadosAntigosParaMover || {}; 
            const existingVeiculos = newEntry.veiculos || {};
            const mergedVeiculos = {...existingVeiculos, ...veiculosParaAdicionar};

            await push(orgRef, {
                nome: nomeCliente,
                telefone: newEntry.telefone || venda.telefone || '',
                cargo: newEntry.cargo || venda.vendaValorObs || '',
                fotoUrl: newEntry.fotoUrl || '',
                instagram: newEntry.instagram || '',
                veiculos: mergedVeiculos,
                organizacao: orgNome, 
                data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
                hierarquiaIndex: newEntry.hierarquiaIndex || 9999 
            });
        }

    } catch (error) {
        if (error.code === "PERMISSION_DENIED") {
            // Silencioso se for permissão
        } else if (error.message.includes("Index not defined")) {
             showToast("Erro de Index: Avise um Admin para configurar as Regras do Firebase.", "error", 5000);
        } else {
            showToast(`Erro ao salvar no dossiê: ${error.message}`, "error"); 
        }
    }
};

export const updateDossierEntryOnEdit = async (oldCliente, oldOrg, newVenda) => {
    if (!newVenda || !newVenda.cliente) return;
    
    const newOrg = newVenda.organizacao.trim();
    const newCliente = newVenda.cliente.trim();
    
    try {
        if (newCliente.toLowerCase() === oldCliente.toLowerCase() && newOrg.toLowerCase() === oldOrg.toLowerCase()) {
            await addDossierEntry(newVenda);
            
        } else {
            const existingEntry = await findDossierEntryGlobal(oldCliente);
            
            if (existingEntry && existingEntry.oldOrg.toLowerCase() === oldOrg.toLowerCase()) {
                const personId = existingEntry.personId;
                const personData = existingEntry.personData;
                
                personData.nome = newCliente;
                personData.telefone = newVenda.telefone || personData.telefone || '';
                personData.cargo = newVenda.vendaValorObs || personData.cargo || '';
                personData.organizacao = newOrg;
                
                const veiculosParaAdicionar = {};
                if (newVenda.carro && newVenda.carro.trim()) {
                    const carros = newVenda.carro.split(',').map(c => c.trim());
                    const placas = (newVenda.placas && newVenda.placas.trim()) 
                                   ? newVenda.placas.split(',').map(p => p.trim()) 
                                   : [];
                    
                    carros.forEach((carroNome, index) => {
                        const placa = placas[index] || '';
                        const key = placa || `carro_${Date.now()}_${index}`;
                        veiculosParaAdicionar[key] = {
                            carro: carroNome,
                            placa: placa,
                            fotoUrl: ''
                        };
                    });
                }
                const mergedVeiculos = {...(personData.veiculos || {}), ...veiculosParaAdicionar};
                personData.veiculos = mergedVeiculos;
                
                await remove(ref(db, `dossies/${oldOrg}/${personId}`));
                await addDossierEntry(personData); 
                showToast(`Dossiê de "${oldCliente}" movido/atualizado para "${newCliente}" em "${newOrg}".`, "default");
                    
            } else {
                await addDossierEntry(newVenda);
            }
        }
    } catch (e) {
        showToast(`Erro ao atualizar dossiê (edit): ${e.message}`, "error");
    }
};

export const autoFillFromDossier = (isEditing) => {
    if (isEditing) return; 

    const nome = els.nomeCliente.value.trim();
    if (!nome) return;

    findDossierEntryGlobal(nome)
        .then(result => {
            if (result) {
                const data = result.personData;
                const org = result.oldOrg;

                if (org === 'CPF') {
                    els.organizacaoTipo.value = 'CPF';
                    els.organizacao.value = '';
                } else if (org === 'Outros') {
                    els.organizacaoTipo.value = 'OUTROS';
                    els.organizacao.value = '';
                } else {
                    els.organizacaoTipo.value = 'CNPJ';
                    els.organizacao.value = org;
                }
                
                els.telefone.value = data.telefone || '';
                els.vendaValorObs.value = data.cargo || '';
                showToast(`Dados de "${nome}" preenchidos (Dossiê).`, "default");
            }
        });
};


// ===============================================
// LÓGICA DE UI (ORGANIZAÇÕES)
// ===============================================

const renderDossierOrgsGrid = (orgs, filtro = '', currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    const canEdit = userTagUpper === 'ADMIN' || userTagUpper === 'HELLS';
    
    if (orgs.length === 0) {
        els.dossierOrgGrid.innerHTML = '<p>Nenhuma base (organização) encontrada.</p>';
        return;
    }

    els.dossierOrgGrid.innerHTML = orgs.map(org => {
        const orgName = org.nome || 'Nome Inválido';
        const fotoUrl = org.fotoUrl || '';
        const info = org.info || 'Sem informações.';
        
        const cardHtml = `
            <div class="dossier-org-card" data-org-name="${orgName}" data-org-id="${org.id}">
                <div class="drag-handle"><div class="drag-handle-icon"></div></div>
                <div class="dossier-org-foto">
                    ${fotoUrl ? `<img src="${fotoUrl}" alt="Logo ${orgName}">` : 'Sem Foto'}
                </div>
                <h4>${orgName}</h4>
                <p>${info}</p>
                <div class="dossier-org-actions">
                    <button class="action-btn muted edit-org-btn" data-org-id="${org.id}" ${canEdit ? '' : 'disabled'}>Editar Base</button>
                </div>
            </div>
        `;
        return cardHtml;
    }).join('');
};

const renderGlobalSearchResults = (orgs, people, currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    const canEdit = userTagUpper === 'ADMIN' || userTagUpper === 'HELLS';
    
    els.dossierOrgGrid.innerHTML = ''; 

    if (orgs.length === 0 && people.length === 0) {
        els.dossierOrgGrid.innerHTML = '<p>Nenhum resultado encontrado para a busca.</p>';
        return;
    }

    if (orgs.length > 0) {
        els.dossierOrgGrid.innerHTML += '<h3 class="dossier-org-title">Bases Encontradas</h3>';
        orgs.forEach(org => {
            const orgName = org.nome || 'Nome Inválido';
            const fotoUrl = org.fotoUrl || '';
            const info = org.info || 'Sem informações.';
            
            els.dossierOrgGrid.innerHTML += `
                <div class="dossier-org-card" data-org-name="${orgName}" data-org-id="${org.id}">
                    <div class="drag-handle"><div class="drag-handle-icon"></div></div>
                    <div class="dossier-org-foto">
                        ${fotoUrl ? `<img src="${fotoUrl}" alt="Logo ${orgName}">` : 'Sem Foto'}
                    </div>
                    <h4>${orgName}</h4>
                    <p>${info}</p>
                    <div class="dossier-org-actions">
                        <button class="action-btn muted edit-org-btn" data-org-id="${org.id}" ${canEdit ? '' : 'disabled'}>Editar Base</button>
                    </div>
                </div>
            `;
        });
    }

    if (people.length > 0) {
        els.dossierOrgGrid.innerHTML += '<h3 class="dossier-org-title">Pessoas Encontradas</h3>';
        
        people.forEach(pessoa => {
            const orgName = pessoa.organizacao || 'Desconhecida';
            const fotoUrl = pessoa.fotoUrl || '';
            
            let veiculosHtml = '';
            if (pessoa.veiculos && typeof pessoa.veiculos === 'object') {
                veiculosHtml = Object.values(pessoa.veiculos)
                    .filter(v => v) // Filtra veículos nulos
                    .map(v => {
                        const placa = v.placa ? `(${v.placa})` : '';
                        const foto = v.fotoUrl ? `<a href="#" class="veiculo-foto-link" data-url="${v.fotoUrl}">[Foto]</a>` : '';
                        return `<li>${v.carro || 'Carro'} ${placa} ${foto}</li>`;
                    })
                    .join('');
                if(veiculosHtml) {
                    veiculosHtml = `<ul style="font-size: 13px; text-align: left; margin: 5px 0 0 15px; padding: 0; list-style-type: disc;">${veiculosHtml}</ul>`;
                } else {
                    veiculosHtml = '<p style="font-size: 13px; margin: 0; opacity: 0.7;">(Sem veículos)</p>';
                }
            } else {
                veiculosHtml = '<p style="font-size: 13px; margin: 0; opacity: 0.7;">(Sem veículos)</p>';
            }

            els.dossierOrgGrid.innerHTML += `
                <div class="dossier-entry-card" data-id="${pessoa.id}" data-org="${orgName}" style="text-align: left; padding: 12px;">
                    <h4 style="text-align: center;">${pessoa.nome || 'Sem Nome'}</h4>
                    <p style="text-align: center; font-weight: 600; color: var(--cor-principal); font-size: 14px;">(Base: ${orgName})</p>
                    
                    <div class="dossier-foto" style="height: 150px;">
                        ${fotoUrl ? `<img src="${fotoUrl}" alt="Foto ${pessoa.nome}">` : 'Sem Foto'}
                    </div>
                    
                    <p><strong>Tel:</strong> ${pessoa.telefone || 'N/A'}</p>
                    <p><strong>Cargo:</strong> ${pessoa.cargo || 'N/A'}</p>
                    <p><strong>Insta:</strong> ${pessoa.instagram || 'N/A'}</p>
                    
                    <strong style="margin-top: 5px; display: block; text-align: left;">Veículos:</strong>
                    ${veiculosHtml}
                    
                    <div class="dossier-actions" style="margin-top: 15px;">
                        <button class="action-btn muted edit-dossier-btn" data-id="${pessoa.id}" data-org="${orgName}" ${canEdit ? '' : 'disabled'}>Editar</button>
                        <button class="action-btn danger delete-dossier-btn" data-id="${pessoa.id}" data-org="${orgName}" ${canEdit ? '' : 'disabled'}>Remover</button>
                    </div>
                </div>
            `;
        });
    }
};

export const showDossierOrgs = (currentUserData) => {
    els.dossierOrgContainer.style.display = 'block';
    els.dossierPeopleContainer.style.display = 'none';
    els.filtroDossierOrgs.value = ''; 
    document.body.classList.add('dossier-view-active');

    const orgsRef = ref(db, 'organizacoesDossier');
    onValue(orgsRef, (snapshot) => {
        globalAllOrgs = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                globalAllOrgs.push({ id: child.key, ...child.val() });
            });
            globalAllOrgs.sort((a, b) => (a.hierarquiaIndex || 9999) - (b.hierarquiaIndex || 9999));
        }
        renderDossierOrgsGrid(globalAllOrgs, '', currentUserData);
        
        const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
        if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
            
            if (orgSortableInstance) {
                orgSortableInstance.destroy();
            }
            orgSortableInstance = new Sortable(els.dossierOrgGrid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.drag-handle',
                onEnd: (evt) => {
                    const updates = {};
                    Array.from(evt.to.children).forEach((item, index) => {
                        const orgId = item.dataset.orgId;
                        if (orgId) {
                            updates[`organizacoesDossier/${orgId}/hierarquiaIndex`] = index;
                        }
                    });
                    update(ref(db), updates).catch(e => showToast(`Erro ao salvar ordem: ${e.message}`, 'error'));
                }
            });
        }
        
    }, (error) => {
        if (error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar bases: ${error.message}`, "error");
        }
        els.dossierOrgGrid.innerHTML = '<p style="color: var(--cor-erro);">Erro ao carregar dados. Verifique sua conexão e permissões.</p>';
    });
};

export const filterOrgs = async (currentUserData) => {
    const filtro = els.filtroDossierOrgs.value.toLowerCase().trim();
    
    if (orgSortableInstance) {
        orgSortableInstance.destroy();
        orgSortableInstance = null;
    }

    if (filtro.length < 2) {
        showDossierOrgs(currentUserData); 
        return;
    }
    
    els.dossierOrgGrid.innerHTML = '<p>Buscando...</p>';

    try {
        const filteredOrgs = globalAllOrgs.filter(org => 
            (org.nome && String(org.nome).toLowerCase().includes(filtro)) ||
            (org.info && String(org.info).toLowerCase().includes(filtro))
        );

        const filteredPeople = await findPeopleGlobal(filtro);
        
        renderGlobalSearchResults(filteredOrgs, filteredPeople, currentUserData);

    } catch (e) {
         if (e.code !== "PERMISSION_DENIED") {
             showToast(`Erro ao buscar: ${e.message}`, "error");
         }
         els.dossierOrgGrid.innerHTML = '<p>Erro ao realizar busca.</p>';
    }
};

const findPeopleGlobal = async (filtro) => {
    const snapshot = await get(ref(db, 'dossies'));
    if (!snapshot.exists()) return [];
    
    const dossies = snapshot.val();
    let results = [];
    const filtroNum = filtro.replace(/\D/g, ''); 
    
    for (const orgKey in dossies) {
        for (const personId in dossies[orgKey]) {
            const pessoa = { id: personId, ...dossies[orgKey][personId] };
            
            const nomeMatch = pessoa.nome && String(pessoa.nome).toLowerCase().includes(filtro);
            const cargoMatch = pessoa.cargo && String(pessoa.cargo).toLowerCase().includes(filtro);
            const telMatch = pessoa.telefone && String(pessoa.telefone).replace(/\D/g, '').includes(filtroNum);
            const instaMatch = pessoa.instagram && String(pessoa.instagram).toLowerCase().includes(filtro);
            
            let veiculoMatch = false;
            if (pessoa.veiculos && typeof pessoa.veiculos === 'object') {
                veiculoMatch = Object.values(pessoa.veiculos).some(v => 
                    v && (
                        (v.carro && String(v.carro).toLowerCase().includes(filtro)) ||
                        (v.placa && String(v.placa).toLowerCase().includes(filtro))
                    )
                );
            }
            
            if (nomeMatch || cargoMatch || telMatch || instaMatch || veiculoMatch) {
                results.push(pessoa);
            }
        }
    }
    return results;
};


// ===============================================
// LÓGICA DE UI (PESSOAS - NÍVEL 2)
// ===============================================

const renderDossierPeopleGrid = (people, orgName, filtro = '', currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    const canEdit = userTagUpper === 'ADMIN' || userTagUpper === 'HELLS';

    if (people.length === 0) {
        els.dossierPeopleGrid.innerHTML = '<p>Nenhuma pessoa encontrada nesta base.</p>';
        return;
    }

    els.dossierPeopleGrid.innerHTML = people.map(pessoa => {
        const fotoUrl = pessoa.fotoUrl || '';
        
        let veiculosHtml = '';
        if (pessoa.veiculos && typeof pessoa.veiculos === 'object') {
            veiculosHtml = Object.values(pessoa.veiculos)
                .filter(v => v) // Filtra veículos nulos
                .map(v => {
                    const placa = v.placa ? `(${v.placa})` : '';
                    const foto = v.fotoUrl ? `<a href="#" class="veiculo-foto-link" data-url="${v.fotoUrl}">[Foto]</a>` : '';
                    return `<li>${v.carro || 'Carro'} ${placa} ${foto}</li>`;
                })
                .join('');
            if(veiculosHtml) {
                veiculosHtml = `<ul style="font-size: 13px; text-align: left; margin: 5px 0 0 15px; padding: 0; list-style-type: disc;">${veiculosHtml}</ul>`;
            } else {
                veiculosHtml = '<p style="font-size: 13px; margin: 0; opacity: 0.7;">(Sem veículos)</p>';
            }
        } else {
            veiculosHtml = '<p style="font-size: 13px; margin: 0; opacity: 0.7;">(Sem veículos)</p>';
        }

        return `
            <div class="dossier-entry-card" data-id="${pessoa.id}" data-org="${orgName}">
                <div class="drag-handle"><div class="drag-handle-icon"></div></div>
                <div class="dossier-foto">
                    ${fotoUrl ? `<img src="${fotoUrl}" alt="Foto ${pessoa.nome}">` : 'Sem Foto'}
                </div>
                <h4>${pessoa.nome || 'Sem Nome'}</h4>
                <p><strong>Tel:</strong> ${pessoa.telefone || 'N/A'}</p>
                <p><strong>Cargo:</strong> ${pessoa.cargo || 'N/A'}</p>
                <p><strong>Insta:</strong> ${pessoa.instagram || 'N/A'}</p>
                <strong style="margin-top: 5px; display: block; text-align: left;">Veículos:</strong>
                ${veiculosHtml}
                <div class="dossier-actions">
                    <button class="action-btn muted edit-dossier-btn" data-id="${pessoa.id}" data-org="${orgName}" ${canEdit ? '' : 'disabled'}>Editar</button>
                    <button class="action-btn danger delete-dossier-btn" data-id="${pessoa.id}" data-org="${orgName}" ${canEdit ? '' : 'disabled'}>Remover</button>
                </div>
            </div>
        `;
    }).join('');
};

export const showDossierPeople = (orgName, currentUserData) => {
    els.dossierOrgContainer.style.display = 'none';
    els.dossierPeopleContainer.style.display = 'block';
    els.dossierPeopleTitle.textContent = `Membros: ${orgName}`;
    els.filtroDossierPeople.value = '';
    els.addPessoaBtn.dataset.orgName = orgName; 
    document.body.classList.add('dossier-view-active');
    
    // --- LÓGICA DAS ABAS ---
    // Adiciona listeners às abas
    els.tabMembros.onclick = () => showTab('membros');
    els.tabSituacoes.onclick = () => loadSituacoes(orgName, currentUserData);
    // Mostra a aba de membros por padrão
    showTab('membros');
    // --- FIM ABAS ---

    const peopleRef = ref(db, `dossies/${orgName}`);
    onValue(peopleRef, (snapshot) => {
        globalCurrentPeople = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                globalCurrentPeople.push({ id: child.key, ...child.val() });
            });
            globalCurrentPeople.sort((a, b) => (a.hierarquiaIndex || 9999) - (b.hierarquiaIndex || 9999));
        }
        renderDossierPeopleGrid(globalCurrentPeople, orgName, '', currentUserData);
        
        const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
        if (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS') {
            
            if (sortableInstance) {
                sortableInstance.destroy();
            }
            sortableInstance = new Sortable(els.dossierPeopleGrid, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.drag-handle',
                onEnd: (evt) => {
                    const updates = {};
                    Array.from(evt.to.children).forEach((item, index) => {
                        const pessoaId = item.dataset.id;
                        const org = item.dataset.org;
                        if (pessoaId && org) {
                            updates[`dossies/${org}/${pessoaId}/hierarquiaIndex`] = index;
                        }
                    });
                    update(ref(db), updates).catch(e => showToast(`Erro ao salvar ordem: ${e.message}`, 'error'));
                }
            });
        }
        
    }, (error) => {
        if (error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar pessoas: ${error.message}`, "error");
        }
        els.dossierPeopleGrid.innerHTML = '<p style="color: var(--cor-erro);">Erro ao carregar dados. Verifique sua conexão e permissões.</p>';
    });
};

export const filterPeople = () => {
    const filtro = els.filtroDossierPeople.value.toLowerCase().trim();
    const orgName = els.addPessoaBtn.dataset.orgName;
    const filtroNum = filtro.replace(/\D/g, '');
    
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    const filteredPeople = globalCurrentPeople.filter(pessoa => {
        const nomeMatch = pessoa.nome && String(pessoa.nome).toLowerCase().includes(filtro);
        const cargoMatch = pessoa.cargo && String(pessoa.cargo).toLowerCase().includes(filtro);
        const telMatch = pessoa.telefone && String(pessoa.telefone).replace(/\D/g, '').includes(filtroNum);
        const instaMatch = pessoa.instagram && String(pessoa.instagram).toLowerCase().includes(filtro);
        
        let veiculoMatch = false;
        if (pessoa.veiculos && typeof pessoa.veiculos === 'object') {
            veiculoMatch = Object.values(pessoa.veiculos).some(v => 
                v && (
                    (v.carro && String(v.carro).toLowerCase().includes(filtro)) ||
                    (v.placa && String(v.placa).toLowerCase().includes(filtro))
                )
            );
        }
        
        return nomeMatch || cargoMatch || telMatch || instaMatch || veiculoMatch;
    });

    renderDossierPeopleGrid(filteredPeople, orgName, filtro);
};


// ===============================================
// --- INÍCIO: NOVAS FUNÇÕES (SITUAÇÕES) ---
// ===============================================

// --- Controle das Abas ---
const showTab = (tabName) => {
    const isMembros = tabName === 'membros';
    
    els.membrosContent.style.display = isMembros ? 'block' : 'none';
    els.situacoesContent.style.display = isMembros ? 'none' : 'block';
    
    els.tabMembros.classList.toggle('active', isMembros);
    els.tabSituacoes.classList.toggle('active', !isMembros);
};

// --- Carregar e Renderizar Situações ---
export const loadSituacoes = async (orgName, currentUserData) => {
    showTab('situacoes');
    els.addSituacaoBtn.dataset.orgName = orgName;
    els.situacoesList.innerHTML = '<p>Carregando relatos...</p>';
    
    const situacoesRef = ref(db, `situacoes/${orgName}`);
    try {
        const snapshot = await get(situacoesRef);
        if (!snapshot.exists()) {
            els.situacoesList.innerHTML = '<p>Nenhum relato de situação encontrado para esta base.</p>';
            return;
        }
        
        const situacoes = snapshot.val();
        const listaArray = Object.keys(situacoes).map(id => ({
            id: id,
            ...situacoes[id]
        })).sort((a, b) => b.dataAtualizacaoTimestamp - a.dataAtualizacaoTimestamp); // Mais novo primeiro
        
        renderSituacoes(listaArray, orgName, currentUserData);
        
    } catch (error) {
        if (error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar situações: ${error.message}`, "error");
        }
        els.situacoesList.innerHTML = '<p style="color: var(--cor-erro);">Erro ao carregar dados.</p>';
    }
};

const renderSituacoes = (listaArray, orgName, currentUserData) => {
    els.situacoesList.innerHTML = '';
    if (listaArray.length === 0) {
        els.situacoesList.innerHTML = '<p>Nenhum relato de situação encontrado para esta base.</p>';
        return;
    }
    
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    const canEdit = userTagUpper === 'ADMIN' || userTagUpper === 'HELLS';
    
    listaArray.forEach(sit => {
        const entry = document.createElement('div');
        entry.className = 'situacao-entry';
        
        const statusClass = sit.status === 'Verificado' ? 'status-verificado' : 'status-em-analise';
        const statusText = sit.status === 'Verificado' ? 'VERIFICADO' : 'EM ANÁLISE';
        
        let actionsHtml = '';
        if (canEdit) {
            actionsHtml = `
                <div class="situacao-actions">
                    <button class="action-btn muted edit-situacao-btn" data-id="${sit.id}" data-org="${orgName}">Editar Status</button>
                </div>
            `;
        }
        
        entry.innerHTML = `
            ${actionsHtml}
            <p>${sit.relato}</p>
            <div class="situacao-footer">
                <span>Por: <strong>${sit.usuarioResponsavel || 'Desconhecido'}</strong> em ${sit.dataAtualizacao || 'N/A'}</span>
                <span class="situacao-status ${statusClass}">${statusText}</span>
            </div>
        `;
        els.situacoesList.appendChild(entry);
    });
};

// --- Funções do Modal (Situação) ---
export const openSituacaoModal = (orgName, situacaoId = null, situacaoData = null) => {
    els.situacaoOrgName.value = orgName;
    
    if (situacaoId && situacaoData) {
        // Modo Edição
        els.situacaoModalTitle.textContent = "Editar Status da Situação";
        els.situacaoId.value = situacaoId;
        els.situacaoRelato.value = situacaoData.relato;
        els.situacaoRelato.disabled = true; // Não pode editar o relato original
        els.situacaoStatus.value = situacaoData.status;
    } else {
        // Modo Adição
        els.situacaoModalTitle.textContent = "Adicionar Relato de Situação";
        els.situacaoId.value = '';
        els.situacaoRelato.value = '';
        els.situacaoRelato.disabled = false;
        els.situacaoStatus.value = 'Em análise';
    }
    
    els.situacaoModalOverlay.style.display = 'block';
    els.situacaoModal.style.display = 'block';
};

export const closeSituacaoModal = () => {
    els.situacaoModalOverlay.style.display = 'none';
    els.situacaoModal.style.display = 'none';
};

export const saveSituacao = async (currentUser, currentUserData) => {
    const orgName = els.situacaoOrgName.value;
    const situacaoId = els.situacaoId.value; // ID (se estiver editando)
    const relato = els.situacaoRelato.value.trim();
    const status = els.situacaoStatus.value;
    
    if (!orgName) {
        showToast("Erro: Organização não encontrada.", "error");
        return;
    }
    if (!relato) {
        showToast("O campo de relato é obrigatório.", "error");
        return;
    }
    
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    
    try {
        if (situacaoId) {
            // --- ATUALIZAR (só status e responsável) ---
            const situacaoRef = ref(db, `situacoes/${orgName}/${situacaoId}`);
            await update(situacaoRef, {
                status: status,
                usuarioResponsavel: currentUser.displayName,
                dataAtualizacao: dataFormatada,
                dataAtualizacaoTimestamp: dataAtual.getTime()
            });
            showToast("Status da situação atualizado!", "success");
        } else {
            // --- CRIAR ---
            const situacoesRef = ref(db, `situacoes/${orgName}`);
            const newSituacaoRef = push(situacoesRef);
            await set(newSituacaoRef, {
                relato: relato,
                status: status,
                usuarioResponsavel: currentUser.displayName,
                dataAtualizacao: dataFormatada,
                dataAtualizacaoTimestamp: dataAtual.getTime()
            });
            showToast("Novo relato salvo!", "success");
        }
        
        closeSituacaoModal();
        loadSituacoes(orgName, currentUserData); // Recarrega a lista
        
    } catch (error) {
        if (error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao salvar situação: ${error.message}`, "error");
        }
    }
};

export const deleteSituacao = async (orgName, situacaoId, currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    if (userTagUpper !== 'ADMIN') {
        showToast("Apenas Administradores podem excluir relatos.", "error");
        return;
    }
    
    if (confirm("Tem certeza que deseja excluir este relato? Esta ação é irreversível.")) {
        try {
            await remove(ref(db, `situacoes/${orgName}/${situacaoId}`));
            showToast("Relato excluído.", "success");
            loadSituacoes(orgName, currentUserData); // Recarrega a lista
        } catch (error) {
            if (error.code !== "PERMISSION_DENIED") {
                showToast(`Erro ao excluir: ${error.message}`, "error");
            }
        }
    }
};
// ===============================================
// --- FIM: NOVAS FUNÇÕES (SITUAÇÕES) ---
// ===============================================


// ===============================================
// LÓGICA DE MODAIS (GERAL)
// ===============================================

export const showImageLightbox = (url) => {
    if (!url) return;
    els.lightboxImg.src = url;
    els.imageLightboxOverlay.style.display = 'block';
    els.imageLightboxModal.style.display = 'block';
};
export const closeImageLightbox = () => {
    els.imageLightboxOverlay.style.display = 'none';
    els.imageLightboxModal.style.display = 'none';
    els.lightboxImg.src = '';
};


// ===============================================
// LÓGICA DE MODAIS (VEÍCULOS - Temporário)
// ===============================================

const renderTempVeiculosList = (containerEl) => {
    containerEl.innerHTML = '';
    if (Object.keys(tempVeiculos).length === 0) {
        containerEl.innerHTML = '<li>Nenhum veículo registrado.</li>';
        return;
    }
    
    Object.entries(tempVeiculos).forEach(([key, veiculo]) => {
        // Proteção contra dados nulos
        if (veiculo) { 
            const placa = veiculo.placa ? `(${veiculo.placa})` : '';
            const foto = veiculo.fotoUrl ? `<a href="#" class="veiculo-foto-link" data-url="${veiculo.fotoUrl}">[Foto]</a>` : '';
            
            containerEl.innerHTML += `
                <li class="veiculo-item-modal" data-key="${key}">
                    <span>${veiculo.carro} ${placa} ${foto}</span>
                    <div>
                        <button class="action-btn muted edit-veiculo-btn" data-key="${key}">✎</button>
                        <button class="action-btn danger remove-veiculo-btn" data-key="${key}">X</button>
                    </div>
                </li>
            `;
        }
    });
};

export const adicionarOuAtualizarVeiculoTemp = (modalPrefix) => {
    const nomeEl = els[`${modalPrefix}CarroNome`];
    const placaEl = els[`${modalPrefix}CarroPlaca`];
    const fotoEl = els[`${modalPrefix}CarroFoto`];
    const listaEl = els[`${modalPrefix}ListaVeiculos`];
    
    const carro = nomeEl.value.trim();
    const placa = placaEl.value.trim().toUpperCase();
    const fotoUrl = fotoEl.value.trim();

    if (!carro && !placa) {
        showToast("Preencha o nome do carro ou a placa.", "error");
        return;
    }
    
    const key = veiculoEmEdicaoKey || placa || `temp_${Date.now()}`;
    
    tempVeiculos[key] = { carro, placa, fotoUrl };
    
    renderTempVeiculosList(listaEl);
    cancelarEdicaoVeiculo(modalPrefix); 
};

export const iniciarEdicaoVeiculo = (key, modalPrefix) => {
    const veiculo = tempVeiculos[key];
    if (!veiculo) return;
    
    veiculoEmEdicaoKey = key; 
    
    els[`${modalPrefix}CarroNome`].value = veiculo.carro;
    els[`${modalPrefix}CarroPlaca`].value = veiculo.placa;
    els[`${modalPrefix}CarroFoto`].value = veiculo.fotoUrl;
    
    els[`${modalPrefix}AddVeiculoBtn`].textContent = 'Atualizar Veículo';
    els[`${modalPrefix}CancelVeiculoBtn`].style.display = 'block';
};

export const cancelarEdicaoVeiculo = (modalPrefix) => {
    veiculoEmEdicaoKey = null;
    els[`${modalPrefix}CarroNome`].value = '';
    els[`${modalPrefix}CarroPlaca`].value = '';
    els[`${modalPrefix}CarroFoto`].value = '';
    
    els[`${modalPrefix}AddVeiculoBtn`].textContent = 'Salvar/Adicionar Veículo'; 
    els[`${modalPrefix}CancelVeiculoBtn`].style.display = 'none';
};

export const removerVeiculoTemp = (key, listaEl) => {
    if (confirm(`Tem certeza que deseja remover este veículo? (Placa: ${key})`)) {
        delete tempVeiculos[key];
        renderTempVeiculosList(listaEl);
    }
};


// ===============================================
// LÓGICA DE MODAIS (ORGANIZAÇÃO)
// ===============================================

export const openAddOrgModal = () => {
    els.orgModalTitle.textContent = 'Adicionar Nova Base';
    els.editOrgId.value = '';
    els.orgNome.value = '';
    els.orgNome.disabled = false;
    els.orgFotoUrl.value = '';
    els.orgInfo.value = '';
    els.deleteOrgBtn.style.display = 'none';
    
    els.orgModalOverlay.style.display = 'block';
    els.orgModal.style.display = 'block';
};

export const openEditOrgModal = (orgId) => {
    const org = globalAllOrgs.find(o => o.id === orgId);
    if (!org) {
        showToast("Erro: Organização não encontrada.", "error");
        return;
    }
    
    els.orgModalTitle.textContent = `Editar Base: ${org.nome}`;
    els.editOrgId.value = org.id;
    els.orgNome.value = org.nome || '';
    els.orgNome.disabled = true; // Não pode editar o nome, pois é a 'key' em 'dossies'
    els.orgFotoUrl.value = org.fotoUrl || '';
    els.orgInfo.value = org.info || '';
    els.deleteOrgBtn.style.display = 'inline-block';
    
    els.orgModalOverlay.style.display = 'block';
    els.orgModal.style.display = 'block';
};

export const closeOrgModal = () => {
    els.orgModalOverlay.style.display = 'none';
    els.orgModal.style.display = 'none';
};

export const saveOrg = (currentUserData) => {
    const orgId = els.editOrgId.value; // Push ID (se editando)
    const nome = els.orgNome.value.trim();
    const fotoUrl = els.orgFotoUrl.value.trim();
    const info = els.orgInfo.value.trim();

    if (!nome) {
        showToast("O nome da organização é obrigatório.", "error");
        return;
    }
    
    let orgRef;
    let existingData = {};

    if (orgId) {
        // --- Atualizar Org Existente ---
        orgRef = ref(db, `organizacoesDossier/${orgId}`);
        const existingOrg = globalAllOrgs.find(o => o.id === orgId);
        existingData = { ...existingOrg };
    } else {
        // --- Criar Nova Org ---
        // Verifica se já existe uma com esse nome
        const nameExists = globalAllOrgs.some(o => o.nome.toLowerCase() === nome.toLowerCase());
        if (nameExists) {
            showToast("Erro: Já existe uma base com este nome.", "error");
            return;
        }
        orgRef = push(ref(db, 'organizacoesDossier'));
        existingData.hierarquiaIndex = globalAllOrgs.length; // Adiciona no final
    }

    set(orgRef, {
        ...existingData, // Mantém dados existentes (como hierarquiaIndex)
        nome: nome,
        fotoUrl: fotoUrl,
        info: info
    })
    .then(() => {
        showToast("Base salva com sucesso!", "success");
        closeOrgModal();
    })
    .catch((e) => showToast(`Erro ao salvar: ${e.message}`, "error"));
};

export const deleteOrg = (currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    if (userTagUpper !== 'ADMIN') {
        showToast("Apenas ADM pode excluir uma base.", "error");
        return;
    }
    
    const orgId = els.editOrgId.value;
    const orgNome = els.orgNome.value.trim();
    if (!orgId) return;

    if (confirm(`ATENÇÃO: Deseja excluir a base "${orgNome}"?\n\nISSO TAMBÉM APAGARÁ TODOS OS MEMBROS (PESSOAS) E RELATOS DE SITUAÇÃO DENTRO DELA.\n\nEsta ação é irreversível.`)) {
        const updates = {};
        updates[`organizacoesDossier/${orgId}`] = null; // Deleta a org
        updates[`dossies/${orgNome}`] = null; // Deleta as pessoas da org
        updates[`situacoes/${orgNome}`] = null; // Deleta as situações da org
        
        update(ref(db), updates)
            .then(() => {
                showToast("Base e todos os seus membros/situações foram excluídos.", "success");
                closeOrgModal();
            })
            .catch((e) => showToast(`Erro ao excluir: ${e.message}`, "error"));
    }
};


// ===============================================
// LÓGICA DE MODAIS (PESSOA)
// ===============================================

export const openAddDossierModal = (orgName) => {
    tempVeiculos = {}; 
    veiculoEmEdicaoKey = null;

    els.addDossierOrganizacao.value = orgName;
    els.addDossierNome.value = '';
    els.addDossierNumero.value = '(055) ';
    els.addDossierCargo.value = '';
    els.addDossierFotoUrl.value = '';
    els.addDossierInstagram.value = '';
    
    renderTempVeiculosList(els.addModalListaVeiculos);
    cancelarEdicaoVeiculo('addModal');
    
    els.addDossierOverlay.style.display = 'block';
    els.addDossierModal.style.display = 'block';
};

export const closeAddDossierModal = () => {
    els.addDossierOverlay.style.display = 'none';
    els.addDossierModal.style.display = 'none';
};

export const openEditDossierModal = (orgName, entryId) => {
    const entryRef = ref(db, `dossies/${orgName}/${entryId}`);
    get(entryRef).then(snapshot => {
        if (!snapshot.exists()) {
            showToast("Erro: Dossiê não encontrado.", "error");
            return;
        }
        const data = snapshot.val();
        
        els.editDossierOrg.value = orgName;
        els.editDossierId.value = entryId;
        els.editDossierNome.value = data.nome || '';
        els.editDossierNumero.value = data.telefone || '(055) '; // Corrigido de 'numero' para 'telefone' se for o caso
        els.editDossierCargo.value = data.cargo || '';
        els.editDossierFotoUrl.value = data.fotoUrl || '';
        els.editDossierInstagram.value = data.instagram || '';
        
        tempVeiculos = data.veiculos || {};
        veiculoEmEdicaoKey = null;
        renderTempVeiculosList(els.editModalListaVeiculos);
        cancelarEdicaoVeiculo('editModal');

        els.editDossierOverlay.style.display = 'block';
        els.editDossierModal.style.display = 'block';
        
    }).catch(e => {
        if (e.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao abrir dossiê: ${e.message}`, "error");
        }
    });
};

export const closeEditDossierModal = () => {
    els.editDossierOverlay.style.display = 'none';
    els.editDossierModal.style.display = 'none';
    tempVeiculos = {}; 
};

export const saveNewDossierEntry = (currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    if (userTagUpper !== 'ADMIN' && userTagUpper !== 'HELLS') {
        showToast("Apenas Admin/Hells podem adicionar.", "error");
        return;
    }

    const org = els.addDossierOrganizacao.value;
    const nome = els.addDossierNome.value.trim();
    
    if (!org || !nome) {
        showToast("Nome e Organização são obrigatórios.", "error");
        return;
    }
    
    const newEntry = {
        nome: nome,
        telefone: els.addDossierNumero.value.trim(),
        cargo: els.addDossierCargo.value.trim(),
        fotoUrl: els.addDossierFotoUrl.value.trim(),
        instagram: els.addDossierInstagram.value.trim(),
        veiculos: tempVeiculos,
        organizacao: org,
        data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        hierarquiaIndex: globalCurrentPeople.length 
    };

    push(ref(db, `dossies/${org}`), newEntry)
        .then(() => {
            showToast("Nova pessoa adicionada ao dossiê!", "success");
            closeAddDossierModal();
        })
        .catch((error) => showToast(`Erro ao salvar: ${error.message}`, "error"));
};

export const saveDossierChanges = (currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    if (userTagUpper !== 'ADMIN' && userTagUpper !== 'HELLS') {
        showToast("Apenas Admin/Hells podem salvar.", "error");
        return;
    }

    const org = els.editDossierOrg.value;
    const id = els.editDossierId.value;
    const nome = els.editDossierNome.value.trim();

    if (!org || !id || !nome) {
        showToast("Erro: Dados do dossiê inválidos.", "error");
        return;
    }
    
    const originalEntry = globalCurrentPeople.find(p => p.id === id);
    
    const updatedEntry = {
        nome: nome,
        telefone: els.editDossierNumero.value.trim(),
        cargo: els.editDossierCargo.value.trim(),
        fotoUrl: els.editDossierFotoUrl.value.trim(),
        instagram: els.editDossierInstagram.value.trim(), 
        veiculos: tempVeiculos,
        organizacao: org,
        hierarquiaIndex: originalEntry ? originalEntry.hierarquiaIndex : 9999,
        data: originalEntry ? originalEntry.data : new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    };
    
    delete updatedEntry.id;
    delete updatedEntry.org;

    set(ref(db, `dossies/${org}/${id}`), updatedEntry)
        .then(() => {
            showToast("Dossiê atualizado com sucesso!", "success");
            closeEditDossierModal();
        })
        .catch((error) => showToast(`Erro ao salvar: ${error.message}`, "error"));
};

export const removeDossierEntry = (orgName, entryId, currentUserData) => {
    const userTagUpper = (currentUserData.tag || 'VISITANTE').toUpperCase();
    if (userTagUpper !== 'ADMIN' && userTagUpper !== 'HELLS') {
        showToast("Apenas Admin/Hells podem remover entradas.", "error");
        return;
    }
    
    if (confirm("Tem certeza que deseja remover esta PESSOA do dossiê?")) {
        remove(ref(db, `dossies/${orgName}/${entryId}`))
            .then(() => {
                showToast("Pessoa removida do dossiê.", "success");
            })
            .catch((error) => showToast(`Erro ao remover: ${error.message}`, "error"));
    }
};
