/* ===================================================
 * admin.js
 * Responsável pelo Painel Admin, status online
 * e migrações.
 * =================================================== */

// --- IMPORTS ---
import { db, ref, set, get, onValue, update, onDisconnect, serverTimestamp } from './firebase.js';
import { els, showToast } from './ui.js';
import { getCurrentUser, getCurrentUserData } from './auth.js';
import { addDossierEntry, findDossierEntryGlobal } from './dossier.js';

// --- STATE ---
let onlineRef = null;
let userStatusRef = null;

// --- FUNÇÕES DE ATIVIDADE ---

/**
 * Atualiza o status de atividade do usuário (online e o que está fazendo)
 * *** ALTERAÇÃO AQUI: Aceita o parâmetro 'activity' ***
 */
export function updateUserActivity(activity = 'Navegando') {
    const user = getCurrentUser();
    if (!user) return;

    if (!userStatusRef) {
        userStatusRef = ref(db, `onlineStatus/${user.uid}`);
    }
    
    const userData = {
        timestamp: serverTimestamp(),
        displayName: user.displayName,
        tag: getCurrentUserData() ? getCurrentUserData().tag : 'Visitante',
        currentActivity: activity // *** ALTERAÇÃO AQUI ***
    };
    
    set(userStatusRef, userData);
}

/**
 * Configura o listener do Firebase para status online/offline (Presença)
 */
export function monitorOnlineStatus() {
    const user = getCurrentUser();
    if (!user) return;

    if (!onlineRef) {
        onlineRef = ref(db, '.info/connected');
    }
    if (!userStatusRef) {
        userStatusRef = ref(db, `onlineStatus/${user.uid}`);
    }
    
    onValue(onlineRef, (snapshot) => {
        if (snapshot.val() === true) {
            // Usuário está online
            const userData = {
                timestamp: serverTimestamp(),
                displayName: user.displayName,
                tag: getCurrentUserData() ? getCurrentUserData().tag : 'Visitante',
                currentActivity: 'Online' // Atividade padrão ao conectar
            };
            set(userStatusRef, userData);

            // Se desconectar, define como offline
            onDisconnect(userStatusRef).set({
                timestamp: serverTimestamp(),
                displayName: user.displayName,
                tag: getCurrentUserData() ? getCurrentUserData().tag : 'Visitante',
                currentActivity: 'Offline' // *** ALTERAÇÃO AQUI ***
            });
        }
    });
}

/**
 * Carrega a lista de usuários online e a exibe no painel admin
 */
export function loadAdminPanel(onlineUsers) {
    const userListBody = els.adminUserListBody;
    if (!userListBody) return;
    
    userListBody.innerHTML = '';
    const currentUser = getCurrentUser();
    const now = Date.now();
    const oneMinute = 60 * 1000;
    let onlineCount = 0;

    const usersArray = [];
    for (const uid in onlineUsers) {
        usersArray.push({ uid, ...onlineUsers[uid] });
    }

    usersArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    usersArray.forEach(userData => {
        const uid = userData.uid;
        const isOnline = (now - (userData.timestamp || 0)) < oneMinute;
        
        if (isOnline) onlineCount++;
        
        const row = userListBody.insertRow();
        const statusClass = isOnline ? "status-online" : "status-offline";
        const statusText = isOnline ? "Online" : "Offline";
        
        // Célula 1: Nome de Usuário e Status
        row.insertCell(0).innerHTML = `
            <div class="user-name-cell">
                <span class="status-dot ${statusClass}" title="${statusText}"></span>
                <strong>${userData.displayName || 'Usuário Desconhecido'}</strong> 
                <span class="user-status-display tag-${(userData.tag || 'visitante').toLowerCase()}" style="font-size: 11px; padding: 2px 5px; margin-left: 5px;">
                    ${userData.tag || 'Visitante'}
                </span>
            </div>
        `;

        // *** ALTERAÇÃO AQUI: Nova Célula de Atividade ***
        row.insertCell(1).innerHTML = `
            <div class="online-status-cell">
                ${isOnline ? (userData.currentActivity || 'N/A') : '...'}
            </div>
        `;
        
        // Célula 2: Ações (Tags)
        const actionsCell = row.insertCell(2);
        
        // Usuário não pode editar a si mesmo
        if (currentUser.uid === uid) {
            actionsCell.innerHTML = '<i>(Você)</i>';
            return;
        }

        const tags = ['Admin', 'Hells', 'Visitante'];
        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.textContent = tag;
            btn.className = 'action-btn muted';
            if (userData.tag === tag) {
                btn.classList.add('success');
                btn.disabled = true;
            }
            btn.onclick = () => {
                if (confirm(`Tem certeza que quer alterar a tag de "${userData.displayName}" para "${tag}"?`)) {
                    updateUserTag(uid, tag);
                }
            };
            actionsCell.appendChild(btn);
        });
    });

    els.onlineUsersCount.textContent = onlineCount;
}

/**
 * Atualiza a tag de um usuário no Firebase
 */
const updateUserTag = (uid, newTag) => {
    const userRef = ref(db, `usuarios/${uid}/tag`);
    set(userRef, newTag)
        .then(() => {
            showToast("Tag do usuário atualizada!", "success");
            // O listener 'monitorOnlineUsers' (em script.js) vai recarregar o painel
        })
        .catch(err => showToast(`Erro ao atualizar tag: ${err.message}`, "error"));
};


// --- FUNÇÕES DE MIGRAÇÃO ---

const migrateDossierData = async () => {
    if (!confirm("Isso irá LER todas as vendas e CRIAR/ATUALIZAR o Dossiê. Vendas com mesmo NOME e ORG serão ATUALIZADAS. Deseja continuar?")) {
        return;
    }

    showToast("Iniciando migração... Isso pode levar um momento.", "default", 5000);
    const vendasRef = ref(db, 'vendas');
    
    try {
        const snapshot = await get(vendasRef);
        if (!snapshot.exists()) {
            showToast("Nenhuma venda encontrada para migrar.", "default");
            return;
        }
        
        const vendas = snapshot.val();
        let count = 0;
        
        for (const id in vendas) {
            const venda = vendas[id];
            
            if (venda.cliente && venda.organizacao) {
                // Prepara os dados da venda no formato esperado por 'addDossierEntry'
                const vendaData = {
                    cliente: venda.cliente,
                    organizacao: venda.organizacao,
                    telefone: venda.telefone,
                    vendaValorObs: venda.vendaValorObs,
                    dataHora: venda.dataHora,
                    carro: venda.carroVeiculo, // Mapeia o campo antigo
                    placas: venda.placaVeiculo // Mapeia o campo antigo
                };
                
                // Busca se já existe algum dado (ex: instagram, foto) para não sobrescrever
                const existingData = await findDossierEntryGlobal(venda.cliente);
                
                // addDossierEntry irá criar ou atualizar
                await addDossierEntry(vendaData, existingData ? existingData.personData : null);
                count++;
            }
        }
        showToast(`Migração concluída! ${count} registros processados.`, "success", 5000);
        
    } catch (error) {
        console.error("Erro na migração:", error);
        showToast(`Erro na migração: ${error.message}`, "error");
    }
};

const migrateVeiculosData = async () => {
     if (!confirm("Isso irá LER todo o dossiê e migrar dados de veículos antigos (separados por vírgula) para o novo sistema de objetos. Use APENAS UMA VEZ. Deseja continuar?")) {
        return;
    }
    
    showToast("Iniciando migração de veículos... Isso pode demorar.", "default", 5000);
    const dossiesRef = ref(db, 'dossies');
    
    try {
        const snapshot = await get(dossiesRef);
        if (!snapshot.exists()) {
            showToast("Nenhum dossiê encontrado.", "default");
            return;
        }
        
        const dossies = snapshot.val();
        let count = 0;
        const updates = {};

        for (const orgKey in dossies) {
            const orgData = dossies[orgKey];
            for (const personId in orgData) {
                const person = orgData[personId];
                
                // Checa se os veículos *já não são* um objeto
                if (person.veiculos && typeof person.veiculos === 'object' && !Array.isArray(person.veiculos)) {
                   continue; // Já está no formato novo, pula
                }

                // Se for string (formato antigo) ou array (inválido), processa
                const carros = (person.carroVeiculo || '').split(',').map(c => c.trim()).filter(Boolean);
                const placas = (person.placaVeiculo || '').split(',').map(p => p.trim()).filter(Boolean);
                
                if (carros.length === 0 && placas.length === 0) {
                    continue; // Não tem veículos para migrar
                }
                
                const newVeiculos = {};
                const maxLen = Math.max(carros.length, placas.length);

                for (let i = 0; i < maxLen; i++) {
                    const carro = carros[i] || 'N/A';
                    const placa = placas[i] || `TEMP_${i}`; // Usa placa temporária se não existir
                    
                    newVeiculos[placa] = {
                        carro: carro,
                        placa: placas[i] || '',
                        fotoUrl: ''
                    };
                }

                updates[`/dossies/${orgKey}/${personId}/veiculos`] = newVeiculos;
                // Opcional: remover os campos antigos
                // updates[`/dossies/${orgKey}/${personId}/carroVeiculo`] = null;
                // updates[`/dossies/${orgKey}/${personId}/placaVeiculo`] = null;
                count++;
            }
        }
        
        if (count === 0) {
            showToast("Migração de veículos: Nenhum registro no formato antigo foi encontrado.", "success");
            return;
        }
        
        await update(ref(db), updates);
        
        showToast(`Migração de veículos concluída! ${count} pessoas atualizadas.`, "success", 5000);
        
    } catch (error) {
        console.error("Erro na migração de veículos:", error);
        showToast(`Erro na migração de veículos: ${error.message}`, "error");
    }
};


// --- INICIALIZAÇÃO ---

export function initAdmin() {
    // Binds
    els.adminPanelBtn.onclick = () => { /* Será tratado por script.js */ };
    els.toggleCalcBtnAdmin.onclick = () => { /* Será tratado por script.js */ };
    
    // Migrações
    els.migrateDossierBtn.onclick = migrateDossierData;
    els.migrateVeiculosBtn.onclick = migrateVeiculosData;
    
    // Binds de Controles Globais (Layout)
    const layoutRef = ref(db, 'layoutControls');
    
    // Carrega valores iniciais
    get(layoutRef).then(snapshot => {
        if (snapshot.exists()) {
            const controls = snapshot.val();
            els.layoutToggleNightMode.checked = controls.enableNightMode || false;
            els.layoutToggleBottomPanel.checked = controls.enableBottomPanel || false;
            els.bottomPanelText.value = controls.bottomPanelText || '';
        }
    });
    
    // Salva alterações
    els.layoutToggleNightMode.onchange = () => {
        set(ref(db, 'layoutControls/enableNightMode'), els.layoutToggleNightMode.checked);
    };
    els.layoutToggleBottomPanel.onchange = () => {
        set(ref(db, 'layoutControls/enableBottomPanel'), els.layoutToggleBottomPanel.checked);
    };
    els.saveBottomPanelTextBtn.onclick = () => {
        const text = els.bottomPanelText.value;
        set(ref(db, 'layoutControls/bottomPanelText'), text)
            .then(() => showToast("Mensagem salva!", "success"))
            .catch(err => showToast(`Erro: ${err.message}`, "error"));
    };
}
