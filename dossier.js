/* ===============================================
  MODULES/DOSSIER.JS
  Lógica de Investigação, Dossiês, Modais e
  Sincronização de Vendas.
===============================================
*/

// --- Imports
import { els } from '../utils/dom.js';
import { db, ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update } from '../config/firebase.js';
import { showToast, capitalizeText } from '../utils/helpers.js';

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
                        oldOrg: orgKey,
                        personId: personId
                    };
                }
            }
        }
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") console.error("Erro na busca global:", error);
        return null;
    }
    return null; 
};

export const searchAllPeopleGlobal = async (query) => {
    if (!query) return [];
    const results = [];
    const queryLower = query.toLowerCase();
    try {
        const snapshot = await get(ref(db, 'dossies'));
        if (!snapshot.exists()) return [];
        const dossies = snapshot.val();
        for (const orgKey in dossies) {
            for (const personId in dossies[orgKey]) {
                const person = dossies[orgKey][personId];
                if (person.nome && person.nome.toLowerCase().includes(queryLower)) {
                    results.push({ ...person, id: personId, org: orgKey });
                }
            }
        }
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") console.error("Erro na busca global de pessoas:", error);
    }
    return results;
};

const parseAndMergeVeiculos = (vendaData, existingVeiculos = {}) => {
    const carros = (vendaData.carro || '').split(',').map(c => c.trim());
    const placas = (vendaData.placas || '').split(',').map(p => p.trim());
    const maxLen = Math.max(carros.length, placas.length);
    const merged = { ...existingVeiculos }; 

    for (let i = 0; i < maxLen; i++) {
        const carro = carros[i] || 'N/A';
        const placa = placas[i] || '';
        
        if (placa) {
            if (!merged[placa]) { 
                merged[placa] = { carro: carro, placa: placa, fotoUrl: '' };
            } else if (carro !== 'N/A' && merged[placa].carro === 'N/A') {
                merged[placa].carro = carro;
            }
        } else if (carro !== 'N/A') {
            const tempKey = `venda_${Date.now()}_${i}`;
            merged[tempKey] = { carro: carro, placa: '', fotoUrl: '' };
        }
    }
    return merged;
};

export const addDossierEntry = async (vendaData, dadosAntigos = null) => {
    const org = vendaData.organizacao.trim();
    const nome = vendaData.cliente.trim();
    if (!org || !nome) return;

    // Garante que a Organização exista
    const orgRef = ref(db, `organizacoes/${org}`);
    get(orgRef).then(snapshot => {
        if (!snapshot.exists()) {
            set(orgRef, { nome: org, fotoUrl: '', info: 'Base registrada automaticamente via Venda.', ordemIndex: 9999 });
        }
    });

    const dossierQuery = query(ref(db, `dossies/${org}`), orderByChild('nome'), equalTo(nome));
    
    try {
        const snapshot = await get(dossierQuery);
        if (snapshot.exists()) {
            // Atualiza existente
            let existingEntryId, existingEntryData;
            snapshot.forEach(child => { existingEntryId = child.key; existingEntryData = child.val(); });
            const updates = {
                numero: vendaData.telefone || existingEntryData.numero,
                cargo: vendaData.vendaValorObs || existingEntryData.cargo,
                data: vendaData.dataHora,
                veiculos: parseAndMergeVeiculos(vendaData, (dadosAntigos ? dadosAntigos.veiculos : existingEntryData.veiculos) || {})
            };
            if (dadosAntigos) {
                updates.fotoUrl = dadosAntigos.fotoUrl || existingEntryData.fotoUrl || '';
                updates.instagram = dadosAntigos.instagram || existingEntryData.instagram || '';
                updates.hierarquiaIndex = dadosAntigos.hierarquiaIndex !== undefined ? dadosAntigos.hierarquiaIndex : (existingEntryData.hierarquiaIndex !== undefined ? existingEntryData.hierarquiaIndex : 9999);
            }
            await update(ref(db, `dossies/${org}/${existingEntryId}`), updates);
        } else {
            // Cria novo
            const dossierEntry = { ...dadosAntigos };
            dossierEntry.nome = vendaData.cliente;
            dossierEntry.numero = vendaData.telefone;
            dossierEntry.organizacao = org;
            dossierEntry.cargo = vendaData.vendaValorObs || 'N/A';
            dossierEntry.data = vendaData.dataHora; 
            dossierEntry.veiculos = parseAndMergeVeiculos(vendaData, (dadosAntigos ? dadosAntigos.veiculos : {}));
            dossierEntry.fotoUrl = dossierEntry.fotoUrl || '';
            dossierEntry.instagram = dossierEntry.instagram || '';
            dossierEntry.hierarquiaIndex = dossierEntry.hierarquiaIndex !== undefined ? dossierEntry.hierarquiaIndex : 9999;
            await push(ref(db, `dossies/${org}`), dossierEntry);
        }
    } catch (err) {
        if(err.code !== "PERMISSION_DENIED") showToast(`Erro ao sincronizar dossiê: ${err.message}`, "error");
    }
};

export const updateDossierEntryOnEdit = async (oldNome, oldOrg, newVendaData) => {
    const newOrg = newVendaData.organizacao.trim();
    const newNome = newVendaData.cliente.trim();
    if (!oldOrg || !oldNome || !newOrg || !newNome) return;

    const dossierQuery = query(ref(db, `dossies/${oldOrg}`), orderByChild('nome'), equalTo(oldNome));
    
    try {
        const snapshot = await get(dossierQuery);
        if (!snapshot.exists()) {
            const globalEntry = await findDossierEntryGlobal(newNome);
            let dadosAntigos = null;
            if (globalEntry && globalEntry.oldOrg !== newOrg) {
                dadosAntigos = globalEntry.personData;
                await remove(ref(db, `dossies/${globalEntry.oldOrg}/${globalEntry.personId}`));
                showToast(`"${newNome}" movido de "${globalEntry.oldOrg}" para "${newOrg}".`, "default", 4000);
            }
            addDossierEntry(newVendaData, dadosAntigos);
            return;
        }

        let existingEntryId, existingEntryData;
        snapshot.forEach(child => { existingEntryId = child.key; existingEntryData = child.val(); });
        
        const newDossierData = {
            ...existingEntryData, 
            nome: newVendaData.cliente,
            numero: newVendaData.telefone,
            organizacao: newVendaData.organizacao,
            cargo: newVendaData.vendaValorObs || 'N/A',
            data: newVendaData.dataHora,
            veiculos: parseAndMergeVeiculos(newVendaData, existingEntryData.veiculos || {}),
        };

        if (oldOrg === newOrg) {
            await set(ref(db, `dossies/${newOrg}/${existingEntryId}`), newDossierData); 
        } else {
            await remove(ref(db, `dossies/${oldOrg}/${existingEntryId}`));
            addDossierEntry(newVendaData, existingEntryData); 
        }
    } catch (err) {
        if(err.code !== "PERMISSION_DENIED") showToast(`Erro ao sincronizar dossiê: ${err.message}`, "error");
    }
};

export const autoFillFromDossier = async () => {
    // Não auto-preenche se estiver editando uma venda
    if (els.registerBtn.textContent.includes('Atualizar')) return; 
    
    const nome = els.nomeCliente.value.trim();
    if (!nome) return; 

    try {
        const foundEntry = await findDossierEntryGlobal(nome);
        if (foundEntry && foundEntry.personData) {
            const data = foundEntry.personData;
            const orgBase = foundEntry.oldOrg;

            els.telefone.value = data.numero || '';
            els.vendaValorObs.value = data.cargo || ''; 
            
            if (orgBase.toUpperCase() === 'CPF') {
                els.organizacaoTipo.value = 'CPF';
                els.organizacao.value = ''; 
            } else if (orgBase.toUpperCase() === 'OUTROS') {
                els.organizacaoTipo.value = 'OUTROS';
                els.organizacao.value = ''; 
            } else {
                els.organizacaoTipo.value = 'CNPJ';
                els.organizacao.value = orgBase; 
            }
            showToast(`Dados de "${nome}" preenchidos do dossiê.`, "success");
        }
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") showToast("Erro ao buscar dados do dossiê.", "error");
    }
};

// ===============================================
// LÓGICA DE VISUALIZAÇÃO DO DOSSIÊ
// ===============================================

// --- Lightbox
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

// --- Ordenação (SortableJS) ---
const saveHierarchyOrder = (orgName) => {
    const children = Array.from(els.dossierPeopleGrid.children);
    if (children.length === 0 || !children[0].classList.contains('dossier-entry-card')) return; 
    
    const updates = {};
    children.forEach((card, index) => {
        updates[`dossies/${orgName}/${card.dataset.id}/hierarquiaIndex`] = index;
    });
    
    if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
            .then(() => {
                showToast("Hierarquia atualizada!", "success");
                // Atualiza o estado global interno
                globalCurrentPeople = children.map((card, index) => {
                    const person = globalCurrentPeople.find(p => p.id === card.dataset.id);
                    if (person) person.hierarquiaIndex = index;
                    return person;
                }).filter(Boolean);
            })
            .catch((err) => showToast(`Erro ao salvar hierarquia: ${err.message}`, "error"));
    }
};

const initSortable = (orgName, currentUserData) => {
    if (sortableInstance) sortableInstance.destroy(); 
    const userTagUpper = currentUserData ? currentUserData.tag.toUpperCase() : 'VISITANTE';
    const canDrag = (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS');
    
    sortableInstance = new Sortable(els.dossierPeopleGrid, {
        animation: 150,
        handle: '.dossier-entry-card', 
        disabled: !canDrag, 
        ghostClass: 'sortable-ghost', 
        onEnd: () => saveHierarchyOrder(orgName)
    });
};

const saveOrgOrder = (showToastOnSuccess = true) => {
    const children = Array.from(els.dossierOrgGrid.children).filter(el => el.classList.contains('dossier-org-card'));
    if (children.length === 0) return;
    
    const updates = {};
    children.forEach((card, index) => {
        updates[`organizacoes/${card.dataset.orgName}/ordemIndex`] = index;
    });
    
    if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
            .then(() => {
                if(showToastOnSuccess) showToast("Ordem das Bases atualizada!", "success");
                globalAllOrgs = children.map((card, index) => {
                    const org = globalAllOrgs.find(o => o.id === card.dataset.orgName);
                    if (org) org.ordemIndex = index;
                    return org;
                }).filter(Boolean);
            })
            .catch((err) => showToast(`Erro ao salvar ordem das Bases: ${err.message}`, "error"));
    }
};

const initOrgSortable = (currentUserData) => {
    if (orgSortableInstance) orgSortableInstance.destroy();
    const userTagUpper = currentUserData ? currentUserData.tag.toUpperCase() : 'VISITANTE';
    const canDrag = (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS');
    
    orgSortableInstance = new Sortable(els.dossierOrgGrid, {
        animation: 150,
        handle: '.dossier-org-card', 
        group: 'orgs', 
        disabled: !canDrag, 
        ghostClass: 'sortable-ghost',
        filter: 'h3.dossier-org-title', 
        onEnd: () => saveOrgOrder()
    });
};

// --- Nível 1: Organizações (Bases) ---
export const showDossierOrgs = async (currentUserData) => {
    els.dossierOrgContainer.style.display = 'block';
    els.dossierPeopleContainer.style.display = 'none';
    els.dossierOrgGrid.innerHTML = '<p>Carregando organizações...</p>';
    globalAllOrgs = [];
    
    try {
        const orgsInfoSnap = await get(ref(db, 'organizacoes'));
        const orgsInfo = orgsInfoSnap.exists() ? orgsInfoSnap.val() : {};
        const orgsPessoasSnap = await get(ref(db, 'dossies'));
        const orgsPessoas = orgsPessoasSnap.exists() ? orgsPessoasSnap.val() : {};
        const allOrgNames = new Set([...Object.keys(orgsInfo), ...Object.keys(orgsPessoas)]);
        
        if (allOrgNames.size === 0) {
            els.dossierOrgGrid.innerHTML = '<p>Nenhuma organização encontrada. Clique em "+ Adicionar Base" para começar.</p>';
            initOrgSortable(currentUserData); 
            return;
        }
        
        globalAllOrgs = Array.from(allOrgNames).map(orgName => {
            const info = orgsInfo[orgName] || {};
            return { id: orgName, nome: orgName, ordemIndex: info.ordemIndex !== undefined ? info.ordemIndex : 9999, ...info };
        }).sort((a, b) => {
             const indexA = a.ordemIndex !== undefined ? a.ordemIndex : Infinity;
             const indexB = b.ordemIndex !== undefined ? b.ordemIndex : Infinity;
             if (indexA !== indexB) return indexA - indexB; 
             return a.nome.localeCompare(b.nome); 
        });
        
        displayOrgs(globalAllOrgs);
        initOrgSortable(currentUserData); 
        
    } catch (error) {
        els.dossierOrgGrid.innerHTML = `<p style="color: var(--cor-erro);">Erro ao carregar organizações: ${error.message}</p>`;
    }
};

const displayOrgs = (orgs) => {
    els.dossierOrgGrid.innerHTML = '';
    if (orgs.length === 0) {
        els.dossierOrgGrid.innerHTML = '<p>Nenhuma organização encontrada para este filtro.</p>';
        return;
    }
    
    orgs.forEach(org => {
        const card = document.createElement('div');
        card.className = 'dossier-org-card';
        card.dataset.orgName = org.nome;
        
        const fotoDiv = document.createElement('div');
        fotoDiv.className = 'dossier-org-foto';
        if (org.fotoUrl) {
            const img = document.createElement('img');
            img.src = org.fotoUrl;
            img.alt = `Base de ${org.nome}`;
            img.addEventListener('click', (e) => { e.stopPropagation(); showImageLightbox(org.fotoUrl); });
            fotoDiv.appendChild(img);
        } else {
            fotoDiv.textContent = 'Sem Foto da Base';
        }
        
        card.innerHTML += `
            <h4>${org.nome}</h4>
            <p>${org.info || '(Sem informações da base)'}</p>
            <div class="dossier-org-actions">
                <button class="action-btn muted edit-org-btn" data-org-id="${org.id}">✏️ Editar Base</button>
            </div>
        `;
        card.prepend(fotoDiv); // Adiciona a foto no início
        
        // Listeners são atribuídos no script.js
        card.addEventListener('click', () => showDossierPeople(org.nome));
        els.dossierOrgGrid.appendChild(card);
    });
};

const displayGlobalSearchResults = (orgs, people) => {
    els.dossierOrgGrid.innerHTML = ''; 
    if (orgs.length === 0 && people.length === 0) {
        els.dossierOrgGrid.innerHTML = '<p>Nenhuma organização ou pessoa encontrada para este filtro.</p>';
        return;
    }

    if (orgs.length > 0) {
        els.dossierOrgGrid.innerHTML += '<h3 class="dossier-org-title">Bases Encontradas</h3>';
        orgs.forEach(org => {
            const card = document.createElement('div');
            card.className = 'dossier-org-card';
            card.dataset.orgName = org.nome;
            card.style.cursor = 'pointer'; 
            
            const fotoDiv = document.createElement('div');
            fotoDiv.className = 'dossier-org-foto';
            if (org.fotoUrl) {
                const img = document.createElement('img');
                img.src = org.fotoUrl;
                img.alt = `Base de ${org.nome}`;
                img.addEventListener('click', (e) => { e.stopPropagation(); showImageLightbox(org.fotoUrl); });
                fotoDiv.appendChild(img);
            } else {
                fotoDiv.textContent = 'Sem Foto da Base';
            }
            card.appendChild(fotoDiv);
            
            card.innerHTML += `
                <h4>${org.nome}</h4>
                <p>${org.info || '(Sem informações da base)'}</p>
                <div class="dossier-org-actions">
                    <button class="action-btn muted edit-org-btn" data-org-id="${org.id}">✏️ Editar Base</button>
                </div>
            `;
            card.addEventListener('click', () => showDossierPeople(org.nome));
            els.dossierOrgGrid.appendChild(card);
        });
    }

    if (people.length > 0) {
        els.dossierOrgGrid.innerHTML += '<h3 class="dossier-org-title">Pessoas Encontradas</h3>';
        people.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'dossier-entry-card';
            card.dataset.id = entry.id; 
            card.style.cursor = 'default'; 
            
            // Link da Base
            const baseLink = document.createElement('a'); 
            baseLink.href = '#';
            baseLink.textContent = `Base: ${entry.org}`;
            baseLink.className = 'dossier-base-link'; // Estilo CSS pode ser usado
            baseLink.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showDossierPeople(entry.org); });
            card.appendChild(baseLink); 

            // Foto
            const fotoDiv = document.createElement('div');
            fotoDiv.className = 'dossier-foto';
            if (entry.fotoUrl) {
                const img = document.createElement('img');
                img.src = entry.fotoUrl;
                img.alt = `Foto de ${entry.nome}`;
                img.addEventListener('click', (e) => { e.stopPropagation(); showImageLightbox(entry.fotoUrl); });
                fotoDiv.appendChild(img);
            } else {
                fotoDiv.textContent = 'Sem Foto';
            }
            card.appendChild(fotoDiv);

            // Infos
            card.innerHTML += `
                <h4>${entry.nome || '(Sem Nome)'}</h4>
                <p>${entry.numero || '(Sem Número)'}</p>
                <p><strong>Cargo:</strong> ${entry.cargo || 'N/A'}</p>
            `;
            if (entry.instagram) {
                let instaHandle = entry.instagram.startsWith('@') ? entry.instagram.substring(1) : entry.instagram;
                instaHandle = instaHandle.split('/')[0]; 
                card.innerHTML += `<p style="font-size: 13px;"><strong>Instagram:</strong> <span style="color: var(--cor-principal); font-weight: 500;">@${instaHandle}</span></p>`;
            }
            
            // Veículos
            card.appendChild(createVeiculosDetails(entry.veiculos));
            
            // Ações
            card.innerHTML += `
                <div class="dossier-actions">
                    <button class="action-btn muted edit-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">✏️ Editar</button>
                    <button class="action-btn danger delete-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">❌ Apagar</button>
                </div>
            `;
            els.dossierOrgGrid.appendChild(card);
        });
    }
};

export const filterOrgs = async () => {
    const query = els.filtroDossierOrgs.value.toLowerCase().trim();
    if (!query) {
        displayOrgs(globalAllOrgs); 
        initOrgSortable(); 
        return;
    }
    
    els.dossierOrgGrid.innerHTML = '<p>Buscando...</p>'; 
    const filteredOrgs = globalAllOrgs.filter(org => org.nome.toLowerCase().includes(query));
    const filteredPeople = await searchAllPeopleGlobal(query);
    displayGlobalSearchResults(filteredOrgs, filteredPeople);
    
    if (orgSortableInstance) {
        orgSortableInstance.destroy();
        orgSortableInstance = null;
    }
};

// --- Nível 2: Pessoas (Membros) ---
export const showDossierPeople = async (orgName, currentUserData) => {
    els.dossierOrgContainer.style.display = 'none';
    els.dossierPeopleContainer.style.display = 'block';
    els.dossierPeopleTitle.textContent = `Membros: ${orgName}`;
    els.dossierPeopleGrid.innerHTML = '<p>Carregando membros...</p>';
    els.addPessoaBtn.dataset.orgName = orgName;
    globalCurrentPeople = [];
    if (orgSortableInstance) {
        orgSortableInstance.destroy();
        orgSortableInstance = null;
    }
    
    try {
        const snapshot = await get(ref(db, `dossies/${orgName}`));
        if (!snapshot.exists()) {
            els.dossierPeopleGrid.innerHTML = '<p>Nenhum membro registrado para esta organização.</p>';
            initSortable(orgName, currentUserData); 
            return;
        }
        
        const peopleData = snapshot.val();
        for (const personId in peopleData) {
            globalCurrentPeople.push({ id: personId, org: orgName, ...peopleData[personId] });
        }
        
        globalCurrentPeople.sort((a, b) => {
            const indexA = a.hierarquiaIndex !== undefined ? a.hierarquiaIndex : Infinity;
            const indexB = b.hierarquiaIndex !== undefined ? b.hierarquiaIndex : Infinity;
            if (indexA !== indexB) return indexA - indexB; 
            return (a.nome || '').localeCompare(b.nome || ''); 
        });
        
        displayPeople(globalCurrentPeople);
        initSortable(orgName, currentUserData); 
        
    } catch (error) {
        els.dossierPeopleGrid.innerHTML = `<p style="color: var(--cor-erro);">Erro ao carregar membros: ${error.message}</p>`;
    }
};

// Helper para criar o <details> de veículos
const createVeiculosDetails = (veiculos) => {
    const veiculosCount = veiculos ? Object.keys(veiculos).length : 0;
    
    if (veiculosCount === 0) {
        const p = document.createElement('p');
        p.innerHTML = '<strong>Veículos:</strong> N/A';
        p.className = 'dossier-veiculo-na';
        return p;
    }

    const details = document.createElement('details');
    details.className = 'dossier-veiculos-details';
    
    const summary = document.createElement('summary');
    summary.innerHTML = `<strong>Veículos (${veiculosCount})</strong> (Clique para ver)`;
    details.appendChild(summary);
    
    for (const id in veiculos) {
        const veiculo = veiculos[id];
        const p = document.createElement('p');
        let fotoLink = veiculo.fotoUrl 
            ? ` <a href="#" class="veiculo-foto-link" data-url="${veiculo.fotoUrl}">[Ver Foto]</a>`
            : ` <span class="veiculo-sem-foto">[Sem Foto]</span>`;
        p.innerHTML = `<strong>${veiculo.carro || 'N/A'}:</strong> ${veiculo.placa || 'N/A'}${fotoLink}`;
        details.appendChild(p);
    }
    return details;
};

const displayPeople = (people) => {
    els.dossierPeopleGrid.innerHTML = '';
    if (people.length === 0) {
        els.dossierPeopleGrid.innerHTML = '<p>Nenhum membro encontrado para este filtro.</p>';
        return;
    }

    people.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'dossier-entry-card';
        card.dataset.id = entry.id; 
        
        const fotoDiv = document.createElement('div');
        fotoDiv.className = 'dossier-foto';
        if (entry.fotoUrl) {
            const img = document.createElement('img');
            img.src = entry.fotoUrl;
            img.alt = `Foto de ${entry.nome}`;
            img.addEventListener('click', (e) => { e.stopPropagation(); showImageLightbox(entry.fotoUrl); });
            fotoDiv.appendChild(img);
        } else {
            fotoDiv.textContent = 'Sem Foto';
        }
        card.appendChild(fotoDiv);
        
        card.innerHTML += `
            <h4>${entry.nome || '(Sem Nome)'}</h4>
            <p>${entry.numero || '(Sem Número)'}</p>
            <p><strong>Cargo:</strong> ${entry.cargo || 'N/A'}</p>
        `;
        
        if (entry.instagram) {
            let instaHandle = entry.instagram.startsWith('@') ? entry.instagram.substring(1) : entry.instagram;
            instaHandle = instaHandle.split('/')[0]; 
            card.innerHTML += `<p style="font-size: 13px;"><strong>Instagram:</strong> <span style="color: var(--cor-principal); font-weight: 500;">@${instaHandle}</span></p>`;
        }
        
        card.appendChild(createVeiculosDetails(entry.veiculos));
        
        card.innerHTML += `
            <div class="dossier-actions">
                <button class="action-btn muted edit-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">✏️ Editar</button>
                <button class="action-btn danger delete-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">❌ Apagar</button>
            </div>
        `;
        
        els.dossierPeopleGrid.appendChild(card);
    });
};

export const filterPeople = () => {
    const query = els.filtroDossierPeople.value.toLowerCase().trim();
    if (!query) {
        displayPeople(globalCurrentPeople);
        return;
    }
    
    const filteredPeople = globalCurrentPeople.filter(entry => {
        const nome = (entry.nome || '').toLowerCase();
        const cargo = (entry.cargo || '').toLowerCase();
        const instagram = (entry.instagram || '').toLowerCase(); 
        
        let veiculoMatch = false;
        if (entry.veiculos) {
            for (const id in entry.veiculos) {
                const v = entry.veiculos[id];
                if (((v.carro || '').toLowerCase().includes(query)) || ((v.placa || '').toLowerCase().includes(query))) {
                    veiculoMatch = true;
                    break;
                }
            }
        }
        return nome.includes(query) || cargo.includes(query) || instagram.includes(query) || veiculoMatch; 
    });
    
    displayPeople(filteredPeople);
};

// ===============================================
// LÓGICA DOS MODAIS (Organização)
// ===============================================

export const openAddOrgModal = () => {
    els.orgModalTitle.textContent = "Adicionar Nova Base";
    els.editOrgId.value = '';
    els.orgNome.value = '';
    els.orgNome.disabled = false;
    els.orgFotoUrl.value = '';
    els.orgInfo.value = '';
    els.deleteOrgBtn.style.display = 'none';
    document.querySelectorAll('.input-invalido').forEach(el => el.classList.remove('input-invalido'));
    els.orgModalOverlay.style.display = 'block';
    els.orgModal.style.display = 'block';
    els.orgNome.focus();
};

export const openEditOrgModal = (orgId) => {
    const org = globalAllOrgs.find(o => o.id === orgId);
    if (!org) {
        showToast("Erro: Organização não encontrada.", "error");
        return;
    }
    
    els.orgModalTitle.textContent = "Editar Base";
    els.editOrgId.value = org.id;
    els.orgNome.value = org.nome;
    els.orgNome.disabled = true;
    els.orgFotoUrl.value = org.fotoUrl || '';
    els.orgInfo.value = org.info || '';
    els.deleteOrgBtn.style.display = 'inline-block';
    document.querySelectorAll('.input-invalido').forEach(el => el.classList.remove('input-invalido'));
    els.orgModalOverlay.style.display = 'block';
    els.orgModal.style.display = 'block';
    els.orgFotoUrl.focus();
};

export const closeOrgModal = () => {
    els.orgModalOverlay.style.display = 'none';
    els.orgModal.style.display = 'none';
};

export const saveOrg = async () => {
    const orgNome = capitalizeText(els.orgNome.value.trim());
    const orgId = els.editOrgId.value || orgNome;
    
    if (!orgId) {
        showToast("O Nome da Organização é obrigatório.", "error");
        els.orgNome.classList.add('input-invalido');
        return;
    }
    els.orgNome.classList.remove('input-invalido');
    
    const orgRef = ref(db, `organizacoes/${orgId}`);
    
    let existingIndex = 9999;
    if (els.editOrgId.value) {
        try {
            const snapshot = await get(orgRef);
            if (snapshot.exists()) {
                existingIndex = snapshot.val().ordemIndex !== undefined ? snapshot.val().ordemIndex : 9999;
            }
        } catch (e) { console.error("Erro ao buscar ordemIndex:", e); }
    } 

    const orgData = {
        nome: orgNome,
        fotoUrl: els.orgFotoUrl.value.trim(),
        info: els.orgInfo.value.trim(),
        ordemIndex: existingIndex 
    };
    
    set(orgRef, orgData)
        .then(() => {
            showToast("Base salva com sucesso!", "success");
            closeOrgModal();
            showDossierOrgs();
        })
        .catch(err => showToast(`Erro ao salvar: ${err.message}`, "error"));
};

export const deleteOrg = () => {
    const orgId = els.editOrgId.value;
    if (!orgId) return;
    
    if (confirm(`ATENÇÃO:\n\nIsso apagará as INFORMAÇÕES DA BASE "${orgId}".\n\NIsso NÃO apagará os membros (pessoas) que estão dentro dela.\n\nDeseja continuar?`)) {
        remove(ref(db, `organizacoes/${orgId}`))
            .then(() => {
                showToast("Informações da base removidas.", "success");
                closeOrgModal();
                showDossierOrgs();
            })
            .catch(err => showToast(`Erro: ${err.message}`, "error"));
    }
};

// ===============================================
// LÓGICA DOS MODAIS (Pessoa/Membros)
// ===============================================

// --- Gerenciador de Veículos (Sub-Modal)
const renderModalVeiculos = (listaElement) => {
    listaElement.innerHTML = ''; 
    if (Object.keys(tempVeiculos).length === 0) {
        listaElement.innerHTML = '<p style="font-size: 13px; text-align: center; margin: 0; padding: 5px;">Nenhum veículo adicionado.</p>';
        return;
    }
    
    for (const key in tempVeiculos) {
        const veiculo = tempVeiculos[key];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'veiculo-item-modal';
        itemDiv.innerHTML = `
            <span style="flex-grow: 1;"><strong>${veiculo.carro || 'N/A'}:</strong> ${veiculo.placa || 'N/A'}</span>
            <button class="muted action-btn edit-veiculo-btn" data-key="${key}">Editar</button>
            <button class="danger action-btn remove-veiculo-btn" data-key="${key}">Remover</button>
        `;
        listaElement.appendChild(itemDiv);
    }
};

export const iniciarEdicaoVeiculo = (key, modalPrefix) => {
    if (!tempVeiculos[key]) return;
    const veiculo = tempVeiculos[key];
    veiculoEmEdicaoKey = key; 
    els[modalPrefix + 'CarroNome'].value = veiculo.carro;
    els[modalPrefix + 'CarroPlaca'].value = veiculo.placa;
    els[modalPrefix + 'CarroFoto'].value = veiculo.fotoUrl;
    els[modalPrefix + 'AddVeiculoBtn'].textContent = 'Atualizar Veículo';
    els[modalPrefix + 'CancelVeiculoBtn'].style.display = 'inline-block';
    els[modalPrefix + 'CarroNome'].focus();
};

export const cancelarEdicaoVeiculo = (modalPrefix) => {
    veiculoEmEdicaoKey = null; 
    els[modalPrefix + 'CarroNome'].value = '';
    els[modalPrefix + 'CarroPlaca'].value = '';
    els[modalPrefix + 'CarroFoto'].value = '';
    els[modalPrefix + 'AddVeiculoBtn'].textContent = '+ Adicionar Veículo';
    els[modalPrefix + 'CancelVeiculoBtn'].style.display = 'none';
};

export const adicionarOuAtualizarVeiculoTemp = (modalPrefix) => {
    const carroEl = els[modalPrefix + 'CarroNome'];
    const placaEl = els[modalPrefix + 'CarroPlaca'];
    const fotoEl = els[modalPrefix + 'CarroFoto'];
    const listaEl = els[modalPrefix + 'ListaVeiculos'];
    const carro = carroEl.value.trim();
    const placa = placaEl.value.trim().toUpperCase();
    const fotoUrl = fotoEl.value.trim();
    
    if (!carro || !placa) {
        showToast("Preencha o nome do carro e a placa.", "error");
        return;
    }
    
    if (veiculoEmEdicaoKey) {
        if (tempVeiculos[veiculoEmEdicaoKey]) {
            tempVeiculos[veiculoEmEdicaoKey] = { carro, placa, fotoUrl };
        }
    } else {
        const tempKey = `temp_${Date.now()}`;
        tempVeiculos[tempKey] = { carro, placa, fotoUrl };
    }
    
    renderModalVeiculos(listaEl); 
    cancelarEdicaoVeiculo(modalPrefix); 
};

export const removerVeiculoTemp = (key, listaEl) => {
    if (tempVeiculos[key]) {
        delete tempVeiculos[key];
        renderModalVeiculos(listaEl);
    }
};

// --- Modal: Adicionar Pessoa ---
export const openAddDossierModal = (orgName) => {
    els.addDossierOrganizacao.value = orgName;
    els.addDossierNome.value = '';
    els.addDossierNumero.value = '';
    els.addDossierCargo.value = '';
    els.addDossierFotoUrl.value = '';
    tempVeiculos = {}; 
    cancelarEdicaoVeiculo('addModal'); 
    renderModalVeiculos(els.addModalListaVeiculos); 
    document.querySelectorAll('.input-invalido').forEach(el => el.classList.remove('input-invalido'));
    els.addDossierOverlay.style.display = 'block';
    els.addDossierModal.style.display = 'block';
    els.addDossierNome.focus();
};

export const closeAddDossierModal = () => {
    els.addDossierOverlay.style.display = 'none';
    els.addDossierModal.style.display = 'none';
    cancelarEdicaoVeiculo('addModal'); 
};

export const saveNewDossierEntry = () => {
    const org = els.addDossierOrganizacao.value.trim();
    if (!org) { showToast("Erro: Organização não definida.", "error"); return; }
    
    const nome = els.addDossierNome.value.trim();
    if (!nome) {
        showToast("O Nome da pessoa é obrigatório.", "error");
        els.addDossierNome.classList.add('input-invalido');
        return;
    }
    els.addDossierNome.classList.remove('input-invalido');

    const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    const newEntry = {
        organizacao: org,
        nome: nome,
        numero: els.addDossierNumero.value.trim(),
        cargo: els.addDossierCargo.value.trim(),
        fotoUrl: els.addDossierFotoUrl.value.trim(),
        instagram: "", 
        veiculos: tempVeiculos, 
        hierarquiaIndex: 9999, 
        data: agora
    };
    
    push(ref(db, `dossies/${org}`), newEntry)
        .then(() => {
             showToast("Nova pessoa salva no dossiê!", "success");
             closeAddDossierModal();
             showDossierPeople(org);
        })
        .catch(err => showToast(`Erro ao salvar: ${err.message}`, "error"));
};

// --- Modal: Editar Pessoa ---
export const openEditDossierModal = async (org, id) => {
    let entry = globalCurrentPeople.find(e => e.id === id && e.org === org);
    
    if (!entry) {
        try {
            const snapshot = await get(ref(db, `dossies/${org}/${id}`));
            if (snapshot.exists()) {
                entry = { id: snapshot.key, org: org, ...snapshot.val() };
                globalCurrentPeople = [entry]; // Adiciona temporariamente para salvar
            } else {
                showToast("Erro: Entrada não encontrada no Banco de Dados.", "error");
                return;
            }
        } catch (e) {
            showToast(`Erro ao buscar dados da pessoa: ${e.message}`, "error");
            return;
        }
    }
    
    els.editDossierOrg.value = entry.org;
    els.editDossierId.value = entry.id;
    els.editDossierNome.value = entry.nome || '';
    els.editDossierNumero.value = entry.numero || '';
    els.editDossierCargo.value = entry.cargo || '';
    els.editDossierFotoUrl.value = entry.fotoUrl || '';
    els.editDossierInstagram.value = entry.instagram || ''; 
    tempVeiculos = { ...(entry.veiculos || {}) };
    cancelarEdicaoVeiculo('editModal'); 
    renderModalVeiculos(els.editModalListaVeiculos);
    els.editDossierOverlay.style.display = 'block';
    els.editDossierModal.style.display = 'block';
};

export const closeEditDossierModal = () => {
    els.editDossierOverlay.style.display = 'none';
    els.editDossierModal.style.display = 'none';
    cancelarEdicaoVeiculo('editModal'); 
};

export const saveDossierChanges = () => {
    const org = els.editDossierOrg.value;
    const id = els.editDossierId.value;
    if (!org || !id) { showToast("Erro: ID da entrada perdido.", "error"); return; }
    
    const originalEntry = globalCurrentPeople.find(e => e.id === id && e.org === org);
    if (!originalEntry) { showToast("Erro: Entrada original não encontrada.", "error"); return; }
    
    const updatedEntry = {
        ...originalEntry,
        nome: els.editDossierNome.value.trim(),
        numero: els.editDossierNumero.value.trim(),
        cargo: els.editDossierCargo.value.trim(),
        fotoUrl: els.editDossierFotoUrl.value.trim(),
        instagram: els.editDossierInstagram.value.trim(), 
        veiculos: tempVeiculos 
    };
    
    delete updatedEntry.id;
    delete updatedEntry.org;

    set(ref(db, `dossies/${org}/${id}`), updatedEntry)
        .then(() => {
            showToast("Dossiê atualizado com sucesso!", "success");
            closeEditDossierModal();
            showDossierPeople(org);
        })
        .catch((error) => showToast(`Erro ao salvar: ${error.message}`, "error"));
};

// --- Ação: Remover Pessoa ---
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
                showDossierPeople(orgName);
            })
            .catch((error) => showToast(`Erro ao remover: ${error.message}`, "error"));
    }
};