/* ===================================================
 * dossier.js
 * Responsável por todo o módulo de Investigação
 * (Dossiê, Orgs, Pessoas, Modais, Sincronização)
 * =================================================== */

// --- IMPORTS ---
import { db, ref, set, push, remove, get, query, orderByChild, equalTo, update } from './firebase.js';
import { els, showToast, capitalizeText, showImageLightbox } from './ui.js';
import { getCurrentUserData } from './auth.js';

// --- STATE ---
let globalAllOrgs = []; 
let globalCurrentPeople = [];
let sortableInstance = null; 
let orgSortableInstance = null; 

// Gerenciador de Veículos do Modal
let tempVeiculos = {};
let veiculoEmEdicaoKey = null; 

// --- FUNÇÕES DE BUSCA GLOBAL (Exportadas para calculator.js) ---

/**
 * Procura por um nome de pessoa em TODAS as organizações do dossiê.
 * Retorna os dados, a org e o ID se encontrar.
 */
export const findDossierEntryGlobal = async (nome) => {
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
                    return {
                        personData: orgData[personId],
                        oldOrg: orgKey,
                        personId: personId
                    };
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
export const searchAllPeopleGlobal = async (query) => {
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
                
                if (nome.includes(queryLower)) {
                    results.push({
                        ...person,
                        id: personId,
                        org: orgKey 
                    });
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


// --- FUNÇÕES DE SINCRONIZAÇÃO (Exportadas para calculator.js) ---

/**
 * Mescla veículos de uma venda (formato string) com um objeto de veículos existente.
 */
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


/**
 * Adiciona ou ATUALIZA entrada de pessoa no dossiê
 */
export const addDossierEntry = async (vendaData, dadosAntigos = null) => {
    const org = vendaData.organizacao.trim();
    const nome = vendaData.cliente.trim();
    
    if (!org || !nome) {
        console.warn("addDossierEntry: Org ou Nome faltando. Saindo.");
        return;
    }

    // Garante que a Organização exista em /organizacoes
    const orgRef = ref(db, `organizacoes/${org}`);
    get(orgRef).then(snapshot => {
        if (!snapshot.exists()) {
            set(orgRef, {
                nome: org,
                fotoUrl: '',
                info: 'Base registrada automaticamente via Venda.',
                ordemIndex: 9999 
            });
        }
    });

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
            
            updates.numero = vendaData.telefone || existingEntryData.numero;
            updates.cargo = vendaData.vendaValorObs || existingEntryData.cargo;
            updates.data = vendaData.dataHora; 
            
            const baseVeiculos = (dadosAntigos ? dadosAntigos.veiculos : existingEntryData.veiculos) || {};
            updates.veiculos = parseAndMergeVeiculos(vendaData, baseVeiculos);

            if (dadosAntigos) {
                updates.fotoUrl = dadosAntigos.fotoUrl || existingEntryData.fotoUrl || '';
                updates.instagram = dadosAntigos.instagram || existingEntryData.instagram || '';
                updates.hierarquiaIndex = dadosAntigos.hierarquiaIndex !== undefined ? dadosAntigos.hierarquiaIndex : (existingEntryData.hierarquiaIndex !== undefined ? existingEntryData.hierarquiaIndex : 9999);
            }

            const updateRef = ref(db, `dossies/${org}/${existingEntryId}`);
            await update(updateRef, updates);

        } else {
            // NÃO EXISTE: Cria uma nova entrada
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
        console.error("Erro ao adicionar/atualizar dossiê:", err);
        if(err.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao sincronizar dossiê: ${err.message}`, "error");
        }
    }
};

/**
 * Atualiza o dossiê quando uma VENDA é editada
 */
export const updateDossierEntryOnEdit = async (oldNome, oldOrg, newVendaData) => {
    const newOrg = newVendaData.organizacao.trim();
    const newNome = newVendaData.cliente.trim();
    
    if (!oldOrg || !oldNome || !newOrg || !newNome) {
        console.warn("UpdateDossier: Faltando dados originais ou novos.");
        return;
    }

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

        let existingEntryId;
        let existingEntryData;
        snapshot.forEach(child => { 
            existingEntryId = child.key;
            existingEntryData = child.val();
        });
        
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
            const updateRef = ref(db, `dossies/${newOrg}/${existingEntryId}`);
            await set(updateRef, newDossierData); 
        } else {
            await remove(ref(db, `dossies/${oldOrg}/${existingEntryId}`));
            addDossierEntry(newVendaData, existingEntryData); 
        }

    } catch (err) {
        console.error("Erro ao sincronizar edição da venda com dossiê:", err);
        if(err.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao sincronizar dossiê: ${err.message}`, "error");
        }
    }
};


// --- FUNÇÕES DE HIERARQUIA (SortableJS) ---

const saveHierarchyOrder = (orgName) => {
    const grid = els.dossierPeopleGrid;
    const children = Array.from(grid.children);
    
    if (children.length === 0 || !children[0].classList.contains('dossier-entry-card')) {
        return; 
    }
    
    const updates = {};
    children.forEach((card, index) => {
        const personId = card.dataset.id;
        if (personId) {
            updates[`dossies/${orgName}/${personId}/hierarquiaIndex`] = index;
        }
    });
    
    if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
            .then(() => {
                showToast("Hierarquia atualizada!", "success");
                globalCurrentPeople = children.map((card, index) => {
                    const person = globalCurrentPeople.find(p => p.id === card.dataset.id);
                    if (person) {
                        person.hierarquiaIndex = index;
                    }
                    return person;
                }).filter(Boolean);
            })
            .catch((err) => {
                showToast(`Erro ao salvar hierarquia: ${err.message}`, "error");
            });
    }
};

const initSortable = (orgName) => {
    if (sortableInstance) {
        sortableInstance.destroy(); 
    }
    
    const grid = els.dossierPeopleGrid;
    const currentUserData = getCurrentUserData();
    const userTagUpper = currentUserData ? currentUserData.tag.toUpperCase() : 'VISITANTE';
    const canDrag = (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS');
    
    sortableInstance = new Sortable(grid, {
        animation: 150,
        handle: '.dossier-entry-card', 
        disabled: !canDrag, 
        ghostClass: 'sortable-ghost', 
        onEnd: (evt) => {
            saveHierarchyOrder(orgName);
        }
    });
};

const saveOrgOrder = (showToastOnSuccess = true) => {
    const grid = els.dossierOrgGrid;
    const children = Array.from(grid.children).filter(el => el.classList.contains('dossier-org-card'));
    
    if (children.length === 0) {
        return;
    }
    
    const updates = {};
    children.forEach((card, index) => {
        const orgId = card.dataset.orgName;
        if (orgId) {
            updates[`organizacoes/${orgId}/ordemIndex`] = index;
        }
    });
    
    if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
            .then(() => {
                if(showToastOnSuccess) showToast("Ordem das Bases atualizada!", "success");
                globalAllOrgs = children.map((card, index) => {
                    const org = globalAllOrgs.find(o => o.id === card.dataset.orgName);
                    if (org) {
                        org.ordemIndex = index;
                    }
                    return org;
                }).filter(Boolean);
            })
            .catch((err) => {
                showToast(`Erro ao salvar ordem das Bases: ${err.message}`, "error");
            });
    }
};

const initOrgSortable = () => {
    if (orgSortableInstance) {
        orgSortableInstance.destroy();
    }
    
    const grid = els.dossierOrgGrid;
    const currentUserData = getCurrentUserData();
    const userTagUpper = currentUserData ? currentUserData.tag.toUpperCase() : 'VISITANTE';
    const canDrag = (userTagUpper === 'ADMIN' || userTagUpper === 'HELLS');
    
    orgSortableInstance = new Sortable(grid, {
        animation: 150,
        handle: '.dossier-org-card', 
        group: 'orgs', 
        disabled: !canDrag, 
        ghostClass: 'sortable-ghost',
        filter: 'h3.dossier-org-title', 
        onEnd: (evt) => {
            saveOrgOrder();
        }
    });
};

// --- FUNÇÕES DE RENDERIZAÇÃO DO DOSSIÊ ---

// Nível 1: Mostra as Organizações (Bases)
const showDossierOrgs = async () => {
    els.dossierOrgContainer.style.display = 'block';
    els.dossierPeopleContainer.style.display = 'none';
    els.dossierOrgGrid.innerHTML = '<p>Carregando organizações...</p>';
    globalAllOrgs = [];
    
    try {
        const orgsInfoRef = ref(db, 'organizacoes');
        const orgsInfoSnap = await get(orgsInfoRef);
        const orgsInfo = orgsInfoSnap.exists() ? orgsInfoSnap.val() : {};
        
        const orgsPessoasRef = ref(db, 'dossies');
        const orgsPessoasSnap = await get(orgsPessoasRef);
        const orgsPessoas = orgsPessoasSnap.exists() ? orgsPessoasSnap.val() : {};

        const allOrgNames = new Set([...Object.keys(orgsInfo), ...Object.keys(orgsPessoas)]);
        
        if (allOrgNames.size === 0) {
            els.dossierOrgGrid.innerHTML = '<p>Nenhuma organização encontrada. Clique em "+ Adicionar Base" para começar.</p>';
            initOrgSortable(); 
            return;
        }
        
        globalAllOrgs = Array.from(allOrgNames).map(orgName => {
            const info = orgsInfo[orgName] || {};
            return {
                id: orgName,
                nome: orgName,
                ordemIndex: info.ordemIndex !== undefined ? info.ordemIndex : 9999,
                ...info
            };
        }).sort((a, b) => {
             const indexA = a.ordemIndex !== undefined ? a.ordemIndex : Infinity;
             const indexB = b.ordemIndex !== undefined ? b.ordemIndex : Infinity;
             if (indexA !== indexB) {
                return indexA - indexB; 
             }
             return a.nome.localeCompare(b.nome); 
        });
        
        displayOrgs(globalAllOrgs);
        initOrgSortable(); 
        
    } catch (error) {
        els.dossierOrgGrid.innerHTML = `<p style="color: var(--cor-erro);">Erro ao carregar organizações: ${error.message}</p>`;
    }
};

// Renderiza os cards das Organizações (Bases)
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
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                showImageLightbox(org.fotoUrl); // Usa a função importada de ui.js
            });
            fotoDiv.appendChild(img);
        } else {
            fotoDiv.textContent = 'Sem Foto da Base';
        }
        
        const nomeH4 = document.createElement('h4');
        nomeH4.textContent = org.nome;
        
        const infoP = document.createElement('p');
        infoP.textContent = org.info || '(Sem informações da base)';
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'dossier-org-actions';
        actionsDiv.innerHTML = `<button class="action-btn muted edit-org-btn" data-org-id="${org.id}">✏️ Editar Base</button>`;
        
        card.appendChild(fotoDiv);
        card.appendChild(nomeH4);
        card.appendChild(infoP);
        card.appendChild(actionsDiv);
        
        actionsDiv.querySelector('.edit-org-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditOrgModal(org.id);
        });
        
        card.addEventListener('click', () => {
            showDossierPeople(org.nome);
        });
        
        els.dossierOrgGrid.appendChild(card);
    });
};

// Exibição da Busca Global
const displayGlobalSearchResults = (orgs, people) => {
    els.dossierOrgGrid.innerHTML = ''; 
    
    if (orgs.length === 0 && people.length === 0) {
        els.dossierOrgGrid.innerHTML = '<p>Nenhuma organização ou pessoa encontrada para este filtro.</p>';
        return;
    }

    if (orgs.length > 0) {
        const orgsHeader = document.createElement('h3');
        orgsHeader.className = 'dossier-org-title';
        orgsHeader.textContent = 'Bases Encontradas';
        els.dossierOrgGrid.appendChild(orgsHeader);
        
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
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showImageLightbox(org.fotoUrl);
                });
                fotoDiv.appendChild(img);
            } else {
                fotoDiv.textContent = 'Sem Foto da Base';
            }
            
            const nomeH4 = document.createElement('h4');
            nomeH4.textContent = org.nome;
            const infoP = document.createElement('p');
            infoP.textContent = org.info || '(Sem informações da base)';
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'dossier-org-actions';
            actionsDiv.innerHTML = `<button class="action-btn muted edit-org-btn" data-org-id="${org.id}">✏️ Editar Base</button>`;
            
            card.appendChild(fotoDiv);
            card.appendChild(nomeH4);
            card.appendChild(infoP);
            card.appendChild(actionsDiv);
            
            actionsDiv.querySelector('.edit-org-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditOrgModal(org.id);
            });
            card.addEventListener('click', () => {
                showDossierPeople(org.nome);
            });
            els.dossierOrgGrid.appendChild(card);
        });
    }

    if (people.length > 0) {
        const peopleHeader = document.createElement('h3');
        peopleHeader.className = 'dossier-org-title';
        peopleHeader.textContent = 'Pessoas Encontradas';
        els.dossierOrgGrid.appendChild(peopleHeader);
        
        people.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'dossier-entry-card';
            card.dataset.id = entry.id; 
            card.style.cursor = 'default'; 
            
            const baseLink = document.createElement('a'); 
            baseLink.href = '#';
            baseLink.textContent = `Base: ${entry.org}`;
            baseLink.style.cssText = "color: var(--cor-principal); font-size: 14px; text-align: left; margin: 0 0 8px 0; font-weight: 600; border-bottom: 1px solid var(--cor-borda); padding-bottom: 5px; display: block; text-decoration: none; cursor: pointer;";
            baseLink.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation(); 
                showDossierPeople(entry.org);
            });
            card.appendChild(baseLink); 

            const fotoDiv = document.createElement('div');
            fotoDiv.className = 'dossier-foto';
            if (entry.fotoUrl) {
                const img = document.createElement('img');
                img.src = entry.fotoUrl;
                img.alt = `Foto de ${entry.nome}`;
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showImageLightbox(entry.fotoUrl);
                });
                fotoDiv.appendChild(img);
            } else {
                fotoDiv.textContent = 'Sem Foto';
            }
            
            const nomeH4 = document.createElement('h4');
            nomeH4.textContent = entry.nome || '(Sem Nome)';
            const numeroP = document.createElement('p');
            numeroP.textContent = entry.numero || '(Sem Número)';
            const cargoP = document.createElement('p');
            cargoP.innerHTML = `<strong>Cargo:</strong> ${entry.cargo || 'N/A'}`;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'dossier-actions';
            actionsDiv.innerHTML = `
                <button class="action-btn muted edit-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">✏️ Editar</button>
                <button class="action-btn danger delete-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">❌ Apagar</button>
            `;
            
            card.appendChild(fotoDiv);
            card.appendChild(nomeH4);
            card.appendChild(numeroP);
            card.appendChild(cargoP);
            
            if (entry.instagram) {
                const instagramP = document.createElement('p');
                let instaHandle = entry.instagram.startsWith('@') ? entry.instagram.substring(1) : entry.instagram;
                instaHandle = instaHandle.split('/')[0]; 
                instagramP.innerHTML = `<strong>Instagram:</strong> <span style="color: var(--cor-principal); font-weight: 500;">@${instaHandle}</span>`;
                instagramP.style.fontSize = '13px';
                card.appendChild(instagramP);
            }
            
            const veiculos = entry.veiculos || {};
            const veiculosCount = Object.keys(veiculos).length;

            if (veiculosCount > 0) {
                const details = document.createElement('details');
                details.style.marginTop = '5px';
                const summary = document.createElement('summary');
                summary.innerHTML = `<strong>Veículos (${veiculosCount})</strong> (Clique para ver)`;
                summary.style.cssText = "cursor: pointer; font-weight: 600; color: var(--cor-principal); font-size: 13px;";
                details.appendChild(summary);
                for (const id in veiculos) {
                    const veiculo = veiculos[id];
                    const p = document.createElement('p');
                    let fotoLink = veiculo.fotoUrl ? ` <a href="#" class="veiculo-foto-link" data-url="${veiculo.fotoUrl}" style="font-size: 11px; color: var(--cor-principal); text-decoration: none; font-weight: 600;">[Ver Foto]</a>` : ` <span style="font-size: 11px; color: #888; font-weight: normal;">[Sem Foto]</span>`;
                    p.innerHTML = `<strong>${veiculo.carro || 'N/A'}:</strong> ${veiculo.placa || 'N/A'}${fotoLink}`;
                    p.style.cssText = "font-weight: normal; color: var(--cor-texto); margin-top: 5px; text-align: left;";
                    details.appendChild(p);
                }
                card.appendChild(details);
            } else {
                const p = document.createElement('p');
                p.innerHTML = '<strong>Veículos:</strong> N/A';
                p.style.cssText = "font-weight: normal; color: var(--cor-texto);";
                card.appendChild(p);
            }
            
            card.appendChild(actionsDiv);
            els.dossierOrgGrid.appendChild(card);
        });
    }
};

const filterOrgs = async () => {
    const query = els.filtroDossierOrgs.value.toLowerCase().trim();
    
    if (!query) {
        displayOrgs(globalAllOrgs); 
        initOrgSortable(); 
        return;
    }
    
    els.dossierOrgGrid.innerHTML = '<p>Buscando...</p>'; 
    
    const filteredOrgs = globalAllOrgs.filter(org => 
        org.nome.toLowerCase().includes(query)
    );
    
    // Usa a função de busca global
    const filteredPeople = await searchAllPeopleGlobal(query);
    
    displayGlobalSearchResults(filteredOrgs, filteredPeople);
    
    if (orgSortableInstance) {
        orgSortableInstance.destroy();
        orgSortableInstance = null;
    }
};

// Nível 2: Mostra as Pessoas (Membros) de uma Org
const showDossierPeople = async (orgName) => {
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
        const peopleRef = ref(db, `dossies/${orgName}`);
        const snapshot = await get(peopleRef);
        
        if (!snapshot.exists()) {
            els.dossierPeopleGrid.innerHTML = '<p>Nenhum membro registrado para esta organização.</p>';
            initSortable(orgName); 
            return;
        }
        
        const peopleData = snapshot.val();
        for (const personId in peopleData) {
            globalCurrentPeople.push({
                id: personId,
                org: orgName,
                ...peopleData[personId]
            });
        }
        
        globalCurrentPeople.sort((a, b) => {
            const indexA = a.hierarquiaIndex !== undefined ? a.hierarquiaIndex : Infinity;
            const indexB = b.hierarquiaIndex !== undefined ? b.hierarquiaIndex : Infinity;
            if (indexA !== indexB) {
                return indexA - indexB; 
            }
            return (a.nome || '').localeCompare(b.nome || ''); 
        });
        
        displayPeople(globalCurrentPeople);
        
        initSortable(orgName); 
        
    } catch (error) {
        els.dossierPeopleGrid.innerHTML = `<p style="color: var(--cor-erro);">Erro ao carregar membros: ${error.message}</p>`;
    }
};

// Renderiza os cards das Pessoas (Membros)
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
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                showImageLightbox(entry.fotoUrl);
            });
            fotoDiv.appendChild(img);
        } else {
            fotoDiv.textContent = 'Sem Foto';
        }
        
        const nomeH4 = document.createElement('h4');
        nomeH4.textContent = entry.nome || '(Sem Nome)';
        const numeroP = document.createElement('p');
        numeroP.textContent = entry.numero || '(Sem Número)';
        const cargoP = document.createElement('p');
        cargoP.innerHTML = `<strong>Cargo:</strong> ${entry.cargo || 'N/A'}`;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'dossier-actions';
        actionsDiv.innerHTML = `
            <button class="action-btn muted edit-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">✏️ Editar</button>
            <button class="action-btn danger delete-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">❌ Apagar</button>
        `;
        
        card.appendChild(fotoDiv);
        card.appendChild(nomeH4);
        card.appendChild(numeroP);
        card.appendChild(cargoP);
        
        if (entry.instagram) {
            const instagramP = document.createElement('p');
            let instaHandle = entry.instagram.startsWith('@') ? entry.instagram.substring(1) : entry.instagram;
            instaHandle = instaHandle.split('/')[0]; 
            instagramP.innerHTML = `<strong>Instagram:</strong> <span style="color: var(--cor-principal); font-weight: 500;">@${instaHandle}</span>`;
            instagramP.style.fontSize = '13px';
            card.appendChild(instagramP);
        }
        
        const veiculos = entry.veiculos || {};
        const veiculosCount = Object.keys(veiculos).length;

        if (veiculosCount > 0) {
            const details = document.createElement('details');
            details.style.marginTop = '5px';
            const summary = document.createElement('summary');
            summary.innerHTML = `<strong>Veículos (${veiculosCount})</strong> (Clique para ver)`;
            summary.style.cssText = "cursor: pointer; font-weight: 600; color: var(--cor-principal); font-size: 13px;";
            details.appendChild(summary);
            
            for (const id in veiculos) {
                const veiculo = veiculos[id];
                const p = document.createElement('p');
                let fotoLink = veiculo.fotoUrl ? ` <a href="#" class="veiculo-foto-link" data-url="${veiculo.fotoUrl}" style="font-size: 11px; color: var(--cor-principal); text-decoration: none; font-weight: 600;">[Ver Foto]</a>` : ` <span style="font-size: 11px; color: #888; font-weight: normal;">[Sem Foto]</span>`;
                p.innerHTML = `<strong>${veiculo.carro || 'N/A'}:</strong> ${veiculo.placa || 'N/A'}${fotoLink}`;
                p.style.cssText = "font-weight: normal; color: var(--cor-texto); margin-top: 5px; text-align: left;";
                details.appendChild(p);
            }
            card.appendChild(details);
        } else {
            const p = document.createElement('p');
            p.innerHTML = '<strong>Veículos:</strong> N/A';
            p.style.cssText = "font-weight: normal; color: var(--cor-texto);";
            card.appendChild(p);
        }
        
        card.appendChild(actionsDiv); 
        els.dossierPeopleGrid.appendChild(card);
    });
};

// Filtra a lista de Pessoas (Membros)
const filterPeople = () => {
    const query = els.filtroDossierPeople.value.toLowerCase().trim();
    if (!query) {
        displayPeople(globalCurrentPeople);
        return;
    }
    
    const filteredPeople = globalCurrentPeople.filter(entry => {
        const nome = entry.nome ? entry.nome.toLowerCase() : '';
        const cargo = entry.cargo ? entry.cargo.toLowerCase() : '';
        const instagram = entry.instagram ? entry.instagram.toLowerCase() : ''; 
        
        let veiculoMatch = false;
        if (entry.veiculos) {
            for (const id in entry.veiculos) {
                const v = entry.veiculos[id];
                if ((v.carro && v.carro.toLowerCase().includes(query)) || (v.placa && v.placa.toLowerCase().includes(query))) {
                    veiculoMatch = true;
                    break;
                }
            }
        }
        return nome.includes(query) || cargo.includes(query) || instagram.includes(query) || veiculoMatch; 
    });
    
    displayPeople(filteredPeople);
};

// --- FUNÇÕES DOS MODAIS (ORG) ---

const openAddOrgModal = () => {
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

const openEditOrgModal = (orgId) => {
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

const closeOrgModal = () => {
    els.orgModalOverlay.style.display = 'none';
    els.orgModal.style.display = 'none';
};

const saveOrg = async () => {
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
        } catch (e) {
            console.error("Erro ao buscar ordemIndex:", e);
        }
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

const deleteOrg = () => {
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

// --- FUNÇÕES DOS MODAIS (PESSOAS E VEÍCULOS) ---

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

const iniciarEdicaoVeiculo = (key, modalPrefix) => {
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

const cancelarEdicaoVeiculo = (modalPrefix) => {
    veiculoEmEdicaoKey = null; 
    
    els[modalPrefix + 'CarroNome'].value = '';
    els[modalPrefix + 'CarroPlaca'].value = '';
    els[modalPrefix + 'CarroFoto'].value = '';
    
    els[modalPrefix + 'AddVeiculoBtn'].textContent = '+ Adicionar Veículo';
    els[modalPrefix + 'CancelVeiculoBtn'].style.display = 'none';
};

const adicionarOuAtualizarVeiculoTemp = (modalPrefix) => {
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

const removerVeiculoTemp = (key, listaEl) => {
    if (tempVeiculos[key]) {
        delete tempVeiculos[key];
        renderModalVeiculos(listaEl);
    }
};

const openAddDossierModal = (orgName) => {
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

const closeAddDossierModal = () => {
    els.addDossierOverlay.style.display = 'none';
    els.addDossierModal.style.display = 'none';
    cancelarEdicaoVeiculo('addModal'); 
};

const saveNewDossierEntry = () => {
    const org = els.addDossierOrganizacao.value.trim();
    if (!org) {
        showToast("Erro: Organização não definida.", "error");
        return;
    }
    
    const nome = els.addDossierNome.value.trim();
    if (!nome) {
        showToast("O Nome da pessoa é obrigatório.", "error");
        els.addDossierNome.classList.add('input-invalido');
        return;
    }
    els.addDossierNome.classList.remove('input-invalido');

    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');

    const newEntry = {
        organizacao: org,
        nome: nome,
        numero: els.addDossierNumero.value.trim(),
        cargo: els.addDossierCargo.value.trim(),
        fotoUrl: els.addDossierFotoUrl.value.trim(),
        instagram: "", 
        veiculos: tempVeiculos, 
        hierarquiaIndex: 9999, 
        data: `${dia}/${mes}/${ano} ${horas}:${minutos}`
    };
    
    push(ref(db, `dossies/${org}`), newEntry)
        .then(() => {
             showToast("Nova pessoa salva no dossiê!", "success");
             closeAddDossierModal();
             showDossierPeople(org);
        })
        .catch(err => showToast(`Erro ao salvar: ${err.message}`, "error"));
};

const openEditDossierModal = async (org, id) => {
    let entry = globalCurrentPeople.find(e => e.id === id && e.org === org);
    
    if (!entry) {
        try {
            const entryRef = ref(db, `dossies/${org}/${id}`);
            const snapshot = await get(entryRef);
            if (snapshot.exists()) {
                entry = { id: snapshot.key, org: org, ...snapshot.val() };
                globalCurrentPeople = [entry];
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

const closeEditDossierModal = () => {
    els.editDossierOverlay.style.display = 'none';
    els.editDossierModal.style.display = 'none';
    cancelarEdicaoVeiculo('editModal'); 
};

const saveDossierChanges = () => {
    const org = els.editDossierOrg.value;
    const id = els.editDossierId.value;
    
    if (!org || !id) {
        showToast("Erro: ID da entrada perdido.", "error");
        return;
    }
    
    const originalEntry = globalCurrentPeople.find(e => e.id === id && e.org === org);
    if (!originalEntry) {
        showToast("Erro: Entrada original não encontrada.", "error");
        return;
    }
    
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

    const entryRef = ref(db, `dossies/${org}/${id}`);
    set(entryRef, updatedEntry)
        .then(() => {
            showToast("Dossiê atualizado com sucesso!", "success");
            closeEditDossierModal();
            showDossierPeople(org);
        })
        .catch((error) => {
            showToast(`Erro ao salvar: ${error.message}`, "error");
        });
};

const removeDossierEntry = (orgName, entryId) => {
    const currentUserData = getCurrentUserData();
    const userTagUpper = currentUserData.tag.toUpperCase();
    if (!currentUserData || (userTagUpper !== 'ADMIN' && userTagUpper !== 'HELLS')) {
        showToast("Apenas Admin/Hells podem remover entradas.", "error");
        return;
    }
    
    if (confirm("Tem certeza que deseja remover esta PESSOA do dossiê?")) {
        const entryRef = ref(db, `dossies/${orgName}/${entryId}`);
        remove(entryRef)
            .then(() => {
                showToast("Pessoa removida do dossiê.", "success");
                showDossierPeople(orgName);
            })
            .catch((error) => {
                showToast(`Erro ao remover: ${error.message}`, "error");
            });
    }
};


// --- INICIALIZAÇÃO ---

export function initDossier() {
    // Event Listeners (Dossiê)
    els.investigacaoBtn.onclick = () => {
        // toggleView('dossier');
        // showDossierOrgs(); // Garante que as orgs sejam carregadas ao abrir
        // (Vou mudar isso para o script.js principal)
    };
    els.toggleCalcBtnDossier.onclick = () => { /* Será tratado por script.js */ };
    
    // Nível 1 (Orgs)
    els.filtroDossierOrgs.addEventListener('input', filterOrgs);
    els.addOrgBtn.onclick = openAddOrgModal;

    // Nível 2 (Pessoas)
    els.dossierVoltarBtn.onclick = () => showDossierOrgs();
    els.filtroDossierPeople.addEventListener('input', filterPeople);
    els.addPessoaBtn.onclick = () => {
        const orgName = els.addPessoaBtn.dataset.orgName;
        if(orgName) { openAddDossierModal(orgName); }
    };

    // Listeners de clique nos grids para botões de editar/deletar
    els.dossierPeopleGrid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-dossier-btn');
        const deleteBtn = e.target.closest('.delete-dossier-btn');
        const fotoLinkBtn = e.target.closest('.veiculo-foto-link'); 
        
        if (fotoLinkBtn) {
            e.preventDefault(); 
            const url = fotoLinkBtn.dataset.url;
            showImageLightbox(url);
        }
        if (deleteBtn) {
            removeDossierEntry(deleteBtn.dataset.org, deleteBtn.dataset.id);
        }
        if (editBtn) {
            openEditDossierModal(editBtn.dataset.org, editBtn.dataset.id);
        }
    });

    els.dossierOrgGrid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-dossier-btn');
        const deleteBtn = e.target.closest('.delete-dossier-btn');
        const fotoLinkBtn = e.target.closest('.veiculo-foto-link');
        
        if (fotoLinkBtn) {
            e.preventDefault();
            showImageLightbox(fotoLinkBtn.dataset.url);
        }
        if (deleteBtn) {
            removeDossierEntry(deleteBtn.dataset.org, deleteBtn.dataset.id);
        }
        if (editBtn) {
            openEditDossierModal(editBtn.dataset.org, editBtn.dataset.id);
        }
    });

    // Modais de Pessoas (Salvar/Cancelar)
    els.saveDossierBtn.onclick = saveDossierChanges;
    els.cancelDossierBtn.onclick = closeEditDossierModal;
    els.editDossierOverlay.onclick = closeEditDossierModal;

    els.saveNewDossierBtn.onclick = saveNewDossierEntry;
    els.cancelNewDossierBtn.onclick = closeAddDossierModal;
    els.addDossierOverlay.onclick = closeAddDossierModal;

    // Listeners do Gerenciador de Veículos
    els.addModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('addModal');
    els.editModalAddVeiculoBtn.onclick = () => adicionarOuAtualizarVeiculoTemp('editModal');
    els.addModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('addModal');
    els.editModalCancelVeiculoBtn.onclick = () => cancelarEdicaoVeiculo('editModal');

    els.addModalListaVeiculos.onclick = (e) => {
        const removeBtn = e.target.closest('.remove-veiculo-btn');
        const editBtn = e.target.closest('.edit-veiculo-btn');
        if (removeBtn) removerVeiculoTemp(removeBtn.dataset.key, els.addModalListaVeiculos);
        if (editBtn) iniciarEdicaoVeiculo(editBtn.dataset.key, 'addModal');
    };
    els.editModalListaVeiculos.onclick = (e) => {
        const removeBtn = e.target.closest('.remove-veiculo-btn');
        const editBtn = e.target.closest('.edit-veiculo-btn');
        if (removeBtn) removerVeiculoTemp(removeBtn.dataset.key, els.editModalListaVeiculos);
        if (editBtn) iniciarEdicaoVeiculo(editBtn.dataset.key, 'editModal');
    };

    // Modais de Orgs
    els.saveOrgBtn.onclick = saveOrg;
    els.deleteOrgBtn.onclick = deleteOrg;
    els.cancelOrgBtn.onclick = closeOrgModal;
    els.orgModalOverlay.onclick = closeOrgModal;
    
    // Botão principal de navegação (será ligado no script.js)
    els.investigacaoBtn.onclick = () => {
        toggleView('dossier');
        showDossierOrgs(); // Garante que as orgs sejam carregadas
    };
    
    // Botão de voltar (será ligado no script.js)
    els.toggleCalcBtnDossier.onclick = () => {
        // toggleView('main');
    };
}