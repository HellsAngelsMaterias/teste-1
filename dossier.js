import { db } from './config.js';
import { els } from './dom.js';
import { showToast, capitalizeText } from './utils.js';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- Estado Local do Módulo ---
let globalAllOrgs = []; 
let globalCurrentPeople = [];
let tempVeiculos = {};
let veiculoEmEdicaoKey = null;
let sortableInstance = null; 
let orgSortableInstance = null;
let currentUserTag = 'VISITANTE'; // Será atualizado pelo main.js

// --- Setter para Permissões ---
export const setUserTag = (tag) => {
    currentUserTag = tag ? tag.toUpperCase() : 'VISITANTE';
};

// =============================================
// LIGHTBOX
// =============================================
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

// =============================================
// GERENCIADOR DE VEÍCULOS (MODAL)
// =============================================
const renderModalVeiculos = (listaElement) => {
    listaElement.innerHTML = ''; 
    if (Object.keys(tempVeiculos).length === 0) {
        listaElement.innerHTML = '<p style="font-size: 13px; text-align: center; margin: 0; padding: 5px; color: var(--cor-texto)">Nenhum veículo adicionado.</p>';
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
    els[modalPrefix + 'AddVeiculoBtn'].textContent = 'Adicionar Veículo';
    els[modalPrefix + 'CancelVeiculoBtn'].style.display = 'none';
};

export const adicionarOuAtualizarVeiculoTemp = (modalPrefix) => {
    const carro = els[modalPrefix + 'CarroNome'].value.trim();
    const placa = els[modalPrefix + 'CarroPlaca'].value.trim().toUpperCase();
    const fotoUrl = els[modalPrefix + 'CarroFoto'].value.trim();
    
    if (!carro || !placa) {
        showToast("Preencha o nome do carro e a placa.", "error");
        return;
    }
    
    if (veiculoEmEdicaoKey && tempVeiculos[veiculoEmEdicaoKey]) {
        tempVeiculos[veiculoEmEdicaoKey] = { carro, placa, fotoUrl };
    } else {
        const tempKey = `temp_${Date.now()}`;
        tempVeiculos[tempKey] = { carro, placa, fotoUrl };
    }
    
    renderModalVeiculos(els[modalPrefix + 'ListaVeiculos']); 
    cancelarEdicaoVeiculo(modalPrefix); 
};

export const removerVeiculoTemp = (key, listaEl) => {
    if (tempVeiculos[key]) {
        delete tempVeiculos[key];
        renderModalVeiculos(listaEl);
    }
};

// =============================================
// FUNÇÕES DE SORTABLE (DRAG & DROP)
// =============================================
const saveHierarchyOrder = (orgName) => {
    const grid = els.dossierPeopleGrid;
    const children = Array.from(grid.children);
    if (children.length === 0 || !children[0].classList.contains('dossier-entry-card')) return; 
    
    const updates = {};
    children.forEach((card, index) => {
        const personId = card.dataset.id;
        if (personId) {
            updates[`dossies/${orgName}/${personId}/hierarquiaIndex`] = index;
        }
    });
    
    if (Object.keys(updates).length > 0) {
        update(ref(db), updates)
            .then(() => showToast("Hierarquia atualizada!", "success"))
            .catch((err) => showToast(`Erro ao salvar hierarquia: ${err.message}`, "error"));
    }
};

const initSortable = (orgName) => {
    if (sortableInstance) sortableInstance.destroy(); 
    const canDrag = (currentUserTag === 'ADMIN' || currentUserTag === 'HELLS');
    
    sortableInstance = new Sortable(els.dossierPeopleGrid, {
        animation: 150,
        handle: '.dossier-entry-card', 
        disabled: !canDrag, 
        ghostClass: 'sortable-ghost', 
        onEnd: () => saveHierarchyOrder(orgName)
    });
};

const saveOrgOrder = () => {
    const grid = els.dossierOrgGrid;
    const children = Array.from(grid.children).filter(el => el.classList.contains('dossier-org-card'));
    if (children.length === 0) return;
    
    const updates = {};
    children.forEach((card, index) => {
        const orgId = card.dataset.orgName;
        if (orgId) updates[`organizacoes/${orgId}/ordemIndex`] = index;
    });
    
    if (Object.keys(updates).length > 0) {
        update(ref(db), updates).then(() => showToast("Ordem das Bases atualizada!", "success"));
    }
};

const initOrgSortable = () => {
    if (orgSortableInstance) orgSortableInstance.destroy();
    const canDrag = (currentUserTag === 'ADMIN' || currentUserTag === 'HELLS');
    
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

// =============================================
// LOGICA PRINCIPAL: ORGS E PESSOAS
// =============================================

// --- Exibir Bases ---
export const showDossierOrgs = async () => {
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
             return indexA - indexB || a.nome.localeCompare(b.nome); 
        });
        
        displayOrgs(globalAllOrgs);
        initOrgSortable(); 
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
        
        const fotoHtml = org.fotoUrl 
            ? `<img src="${org.fotoUrl}" class="lightbox-trigger" data-url="${org.fotoUrl}" alt="Base de ${org.nome}">`
            : 'Sem Foto da Base';

        card.innerHTML = `
            <div class="dossier-org-foto">${fotoHtml}</div>
            <h4>${org.nome}</h4>
            <p>${org.info || '(Sem informações da base)'}</p>
            <div class="dossier-org-actions">
                <button class="action-btn muted edit-org-btn" data-org-id="${org.id}">✏️ Editar Base</button>
            </div>
        `;
        
        // Eventos específicos do card
        const img = card.querySelector('img');
        if(img) img.onclick = (e) => { e.stopPropagation(); showImageLightbox(org.fotoUrl); };
        
        card.querySelector('.edit-org-btn').onclick = (e) => {
             e.stopPropagation();
             openEditOrgModal(org.id);
        };
        card.onclick = () => showDossierPeople(org.nome);
        
        els.dossierOrgGrid.appendChild(card);
    });
};

// --- Busca Global ---
export const filterOrgs = async () => {
    const query = els.filtroDossierOrgs.value.toLowerCase().trim();
    if (!query) {
        displayOrgs(globalAllOrgs); 
        initOrgSortable(); 
        return;
    }
    
    // Simplificando para buscar apenas por nome de org para evitar sobrecarga de busca global
    const filteredOrgs = globalAllOrgs.filter(org => org.nome.toLowerCase().includes(query));
    displayOrgs(filteredOrgs);
    if (orgSortableInstance) { orgSortableInstance.destroy(); orgSortableInstance = null; }
};

// --- Exibir Pessoas ---
export const showDossierPeople = async (orgName) => {
    els.dossierOrgContainer.style.display = 'none';
    els.dossierPeopleContainer.style.display = 'block';
    els.dossierPeopleTitle.textContent = `Membros: ${orgName}`;
    els.dossierPeopleGrid.innerHTML = '<p>Carregando membros...</p>';
    els.addPessoaBtn.dataset.orgName = orgName;
    
    globalCurrentPeople = [];
    if (orgSortableInstance) { orgSortableInstance.destroy(); orgSortableInstance = null; }
    
    try {
        const snapshot = await get(ref(db, `dossies/${orgName}`));
        if (!snapshot.exists()) {
            els.dossierPeopleGrid.innerHTML = '<p>Nenhum membro registrado.</p>';
            initSortable(orgName); 
            return;
        }
        
        const peopleData = snapshot.val();
        for (const personId in peopleData) {
            globalCurrentPeople.push({ id: personId, org: orgName, ...peopleData[personId] });
        }
        
        globalCurrentPeople.sort((a, b) => {
            const indexA = a.hierarquiaIndex !== undefined ? a.hierarquiaIndex : Infinity;
            const indexB = b.hierarquiaIndex !== undefined ? b.hierarquiaIndex : Infinity;
            return indexA - indexB || (a.nome || '').localeCompare(b.nome || '');
        });
        
        displayPeople(globalCurrentPeople);
        initSortable(orgName); 
    } catch (error) {
        els.dossierPeopleGrid.innerHTML = `<p style="color: var(--cor-erro);">Erro: ${error.message}</p>`;
    }
};

const displayPeople = (people) => {
    els.dossierPeopleGrid.innerHTML = '';
    if (people.length === 0) {
        els.dossierPeopleGrid.innerHTML = '<p>Nenhum membro encontrado.</p>';
        return;
    }

    people.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'dossier-entry-card';
        card.dataset.id = entry.id; 

        const fotoHtml = entry.fotoUrl 
            ? `<img src="${entry.fotoUrl}" class="lightbox-trigger" data-url="${entry.fotoUrl}" alt="Foto">`
            : 'Sem Foto';
            
        let veiculosHtml = '';
        const veiculos = entry.veiculos || {};
        const vCount = Object.keys(veiculos).length;
        
        if (vCount > 0) {
            let vList = '';
            for (const id in veiculos) {
                const v = veiculos[id];
                const link = v.fotoUrl ? ` <a href="#" class="veiculo-foto-link" data-url="${v.fotoUrl}">[Foto]</a>` : '';
                vList += `<p style="margin-top:5px; text-align:left; font-weight:normal;"><strong>${v.carro}:</strong> ${v.placa}${link}</p>`;
            }
            veiculosHtml = `<details style="margin-top:5px;"><summary style="cursor:pointer;font-weight:600;color:var(--cor-principal);">Veículos (${vCount})</summary>${vList}</details>`;
        } else {
            veiculosHtml = `<p style="font-weight:normal; color:var(--cor-texto);"><strong>Veículos:</strong> N/A</p>`;
        }

        card.innerHTML = `
            <div class="dossier-foto">${fotoHtml}</div>
            <h4>${entry.nome || '(Sem Nome)'}</h4>
            <p>${entry.numero || '(Sem Número)'}</p>
            <p><strong>Cargo:</strong> ${entry.cargo || 'N/A'}</p>
            ${entry.instagram ? `<p style="font-size:13px;"><strong>Insta:</strong> <span style="color:var(--cor-principal);">@${entry.instagram.replace('@','')}</span></p>` : ''}
            ${veiculosHtml}
            <div class="dossier-actions">
                <button class="action-btn muted edit-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">✏️ Editar</button>
                <button class="action-btn danger delete-dossier-btn" data-org="${entry.org}" data-id="${entry.id}">❌ Apagar</button>
            </div>
        `;
        
        // Eventos
        const img = card.querySelector('img.lightbox-trigger');
        if(img) img.onclick = (e) => { e.stopPropagation(); showImageLightbox(entry.fotoUrl); };
        
        card.querySelectorAll('.veiculo-foto-link').forEach(btn => {
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); showImageLightbox(btn.dataset.url); };
        });
        
        card.querySelector('.edit-dossier-btn').onclick = (e) => {
             e.stopPropagation();
             openEditDossierModal(entry.org, entry.id);
        };
        card.querySelector('.delete-dossier-btn').onclick = (e) => {
             e.stopPropagation();
             removeDossierEntry(entry.org, entry.id);
        };

        els.dossierPeopleGrid.appendChild(card);
    });
};

export const filterPeople = () => {
    const query = els.filtroDossierPeople.value.toLowerCase().trim();
    if (!query) { displayPeople(globalCurrentPeople); return; }
    
    const filtered = globalCurrentPeople.filter(entry => {
        const nome = (entry.nome || '').toLowerCase();
        const cargo = (entry.cargo || '').toLowerCase();
        let vMatch = false;
        if (entry.veiculos) {
            for (const id in entry.veiculos) {
                const v = entry.veiculos[id];
                if ((v.carro && v.carro.toLowerCase().includes(query)) || (v.placa && v.placa.toLowerCase().includes(query))) vMatch = true;
            }
        }
        return nome.includes(query) || cargo.includes(query) || vMatch;
    });
    displayPeople(filtered);
};

// =============================================
// MODAIS DE ORGANIZAÇÃO
// =============================================
export const openAddOrgModal = () => {
    els.orgModalTitle.textContent = "Adicionar Nova Base";
    els.editOrgId.value = '';
    els.orgNome.value = '';
    els.orgNome.disabled = false;
    els.orgFotoUrl.value = '';
    els.orgInfo.value = '';
    els.deleteOrgBtn.style.display = 'none';
    els.orgModalOverlay.style.display = 'block';
    els.orgModal.style.display = 'block';
    els.orgNome.focus();
};

export const openEditOrgModal = (orgId) => {
    const org = globalAllOrgs.find(o => o.id === orgId);
    if (!org) return showToast("Org não encontrada.", "error");
    
    els.orgModalTitle.textContent = "Editar Base";
    els.editOrgId.value = org.id;
    els.orgNome.value = org.nome;
    els.orgNome.disabled = true;
    els.orgFotoUrl.value = org.fotoUrl || '';
    els.orgInfo.value = org.info || '';
    els.deleteOrgBtn.style.display = 'inline-block';
    els.orgModalOverlay.style.display = 'block';
    els.orgModal.style.display = 'block';
};

export const saveOrg = async () => {
    const orgNome = capitalizeText(els.orgNome.value.trim());
    const orgId = els.editOrgId.value || orgNome;
    if (!orgId) return showToast("Nome obrigatório.", "error");
    
    const orgRef = ref(db, `organizacoes/${orgId}`);
    let existingIndex = 9999;
    
    if (els.editOrgId.value) {
        try {
            const s = await get(orgRef);
            if (s.exists()) existingIndex = s.val().ordemIndex !== undefined ? s.val().ordemIndex : 9999;
        } catch (e) {}
    }

    set(orgRef, {
        nome: orgNome,
        fotoUrl: els.orgFotoUrl.value.trim(),
        info: els.orgInfo.value.trim(),
        ordemIndex: existingIndex
    }).then(() => {
        showToast("Base salva!", "success");
        els.orgModalOverlay.style.display = 'none';
        els.orgModal.style.display = 'none';
        showDossierOrgs();
    });
};

export const deleteOrg = () => {
    const orgId = els.editOrgId.value;
    if (confirm(`Apagar informações da base "${orgId}"? (Membros não serão apagados)`)) {
        remove(ref(db, `organizacoes/${orgId}`)).then(() => {
            showToast("Base removida.", "success");
            els.orgModalOverlay.style.display = 'none';
            els.orgModal.style.display = 'none';
            showDossierOrgs();
        });
    }
};

// =============================================
// MODAIS DE PESSOAS (MEMBROS)
// =============================================
export const openAddDossierModal = (orgName) => {
    els.addDossierOrganizacao.value = orgName;
    els.addDossierNome.value = '';
    els.addDossierNumero.value = '';
    els.addDossierCargo.value = '';
    els.addDossierFotoUrl.value = '';
    tempVeiculos = {};
    cancelarEdicaoVeiculo('addModal');
    renderModalVeiculos(els.addModalListaVeiculos);
    els.addDossierOverlay.style.display = 'block';
    els.addDossierModal.style.display = 'block';
    els.addDossierNome.focus();
};

export const closeAddDossierModal = () => {
    els.addDossierOverlay.style.display = 'none';
    els.addDossierModal.style.display = 'none';
};

export const saveNewDossierEntry = () => {
    const org = els.addDossierOrganizacao.value.trim();
    const nome = els.addDossierNome.value.trim();
    if (!nome) return showToast("Nome obrigatório.", "error");

    const newEntry = {
        organizacao: org,
        nome: nome,
        numero: els.addDossierNumero.value.trim(),
        cargo: els.addDossierCargo.value.trim(),
        fotoUrl: els.addDossierFotoUrl.value.trim(),
        instagram: "",
        veiculos: tempVeiculos,
        hierarquiaIndex: 9999,
        data: new Date().toLocaleString('pt-BR')
    };
    
    push(ref(db, `dossies/${org}`), newEntry).then(() => {
        showToast("Pessoa adicionada!", "success");
        closeAddDossierModal();
        showDossierPeople(org);
    });
};

export const openEditDossierModal = async (org, id) => {
    let entry = globalCurrentPeople.find(e => e.id === id && e.org === org);
    if (!entry) {
        const s = await get(ref(db, `dossies/${org}/${id}`));
        if (s.exists()) entry = { id: s.key, org: org, ...s.val() };
        else return showToast("Erro ao buscar dados.", "error");
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
    els.editDossierNome.focus();
};

export const closeEditDossierModal = () => {
    els.editDossierOverlay.style.display = 'none';
    els.editDossierModal.style.display = 'none';
};

export const saveDossierChanges = () => {
    const org = els.editDossierOrg.value;
    const id = els.editDossierId.value;
    
    const updateData = {
        nome: els.editDossierNome.value.trim(),
        numero: els.editDossierNumero.value.trim(),
        cargo: els.editDossierCargo.value.trim(),
        fotoUrl: els.editDossierFotoUrl.value.trim(),
        instagram: els.editDossierInstagram.value.trim(),
        veiculos: tempVeiculos,
        organizacao: org // Mantém consistência
    };
    
    update(ref(db, `dossies/${org}/${id}`), updateData).then(() => {
        showToast("Atualizado!", "success");
        closeEditDossierModal();
        showDossierPeople(org);
    });
};

export const removeDossierEntry = (org, id) => {
    if (currentUserTag !== 'ADMIN' && currentUserTag !== 'HELLS') return showToast("Sem permissão.", "error");
    if (confirm("Apagar esta pessoa?")) {
        remove(ref(db, `dossies/${org}/${id}`)).then(() => {
            showToast("Apagado.", "success");
            showDossierPeople(org);
        });
    }
};