/* ===============================================
  ADMIN.JS
  Lógica do Painel Admin, Status Online,
  Controles Globais e Migrações.
  
  VERSÃO SEM PASTAS (Nomes: helpers.js, sales.js)
===============================================
*/

// --- Imports (CAMINHOS CORRIGIDOS)
import { els } from './dom.js';
import { db, ref, set, onValue, remove, get, update } from './firebase.js';
import { showToast } from './helpers.js';
import { addDossierEntry } from './dossier.js'; // Dependência para migração

// --- Estado Interno
let globalOnlineStatus = {}; 
let globalUserList = []; // Lista de todos os usuários
let migrationStatus = { dossierConcluida: false, veiculosConcluida: false }; // NOVO

// ===============================================
// CONTROLES DE LAYOUT GLOBAL
// ===============================================

const globalLayoutRef = ref(db, 'configuracoesGlobais/layout');
const globalMigrationRef = ref(db, 'configuracoesGlobais/migracao'); // NOVO REF

// Função para atualizar a UI dos botões de migração
const updateMigrationUI = () => {
    const { migrateDossierBtn, migrateVeiculosBtn } = els;
    
    // Migração de Vendas para Dossiê
    if (migrationStatus.dossierConcluida) {
        migrateDossierBtn.textContent = "Dossiê Migrado (Concluído)";
        migrateDossierBtn.disabled = true;
        migrateDossierBtn.style.backgroundColor = 'var(--cor-tag-visitante)'; // Verde para concluído
        migrateDossierBtn.style.animation = 'none';
        migrateDossierBtn.style.cursor = 'default';
    } else {
        migrateDossierBtn.textContent = "Migrar Vendas Antigas para Dossiê";
        migrateDossierBtn.disabled = false;
        migrateDossierBtn.style.backgroundColor = 'var(--cor-erro)'; 
        migrateDossierBtn.style.animation = 'none';
        migrateDossierBtn.style.cursor = 'pointer';
    }

    // Migração de Carros/Placas para Veículos (dentro do Dossiê)
    if (migrationStatus.veiculosConcluida) {
        migrateVeiculosBtn.textContent = "Veículos Migrados (Concluído)";
        migrateVeiculosBtn.disabled = true;
        migrateVeiculosBtn.style.backgroundColor = 'var(--cor-tag-visitante)'; // Verde para concluído
        migrateVeiculosBtn.style.animation = 'none';
        migrateVeiculosBtn.style.cursor = 'default';
    } else {
        migrateVeiculosBtn.textContent = "Migrar Veículos Antigos (Dossiê)";
        migrateVeiculosBtn.disabled = false;
        migrateVeiculosBtn.style.backgroundColor = 'var(--cor-erro)';
        migrateVeiculosBtn.style.animation = 'none';
        migrateVeiculosBtn.style.cursor = 'pointer';
    }
};

// Listener que monitora o status de migração
onValue(globalMigrationRef, (snapshot) => {
    if (snapshot.exists()) {
        migrationStatus = { ...migrationStatus, ...snapshot.val() };
    }
    // Atualiza a UI imediatamente quando o status do Firebase muda
    if (els.migrateDossierBtn && els.migrateVeiculosBtn) { // Verifica se os elementos foram carregados
        updateMigrationUI(); 
    }
});


// Listener que atualiza o layout para TODOS os usuários em tempo real
onValue(globalLayoutRef, (snapshot) => {
    if (!snapshot.exists()) {
        console.warn("Nó /configuracoesGlobais/layout não encontrado.");
        return;
    }
    const settings = snapshot.val();
    
    if (els.themeBtn) {
        els.themeBtn.style.display = settings.enableNightMode ? 'block' : 'none';
        if (!settings.enableNightMode && document.body.classList.contains('dark')) {
            document.body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }
    
    if (els.bottomPanel) {
        els.bottomPanel.style.display = settings.enableBottomPanel ? 'flex' : 'none';
        els.bottomPanelDisplay.textContent = settings.bottomPanelText || 'Painel Inferior';
    }
    
    // Atualiza os inputs do admin panel para refletir o estado do DB
    if (els.adminPanel.style.display !== 'none') {
        if (els.layoutToggleNightMode) els.layoutToggleNightMode.checked = settings.enableNightMode;
        if (els.layoutToggleBottomPanel) els.layoutToggleBottomPanel.checked = settings.enableBottomPanel;
        if (els.bottomPanelText) els.bottomPanelText.value = settings.bottomPanelText || '';
    }
});

export const updateGlobalLayout = (key, value) => {
    update(globalLayoutRef, { [key]: value })
        .then(() => showToast(`Configuração global '${key}' salva!`, "success"))
        .catch(err => showToast(`Erro ao salvar: ${err.message}`, "error"));
};


// ===============================================
// STATUS ONLINE E ADMIN PANEL
// ===============================================

export const updateUserActivity = (currentUser, currentUserData) => {
    if (!currentUser) return;
    const { uid, displayName } = currentUser;
    
    const userStatusRef = ref(db, `onlineStatus/${uid}`);
    
    // Atualiza o timestamp e o nome/tag para o rastreamento
    set(userStatusRef, {
        lastActive: Date.now(),
        displayName: displayName,
        tag: currentUserData.tag || 'Visitante'
    });
};

export const monitorOnlineStatus = () => {
    const statusRef = ref(db, 'onlineStatus');
    onValue(statusRef, (snapshot) => {
        const now = Date.now();
        const activeThreshold = now - (60 * 1000); // Últimos 60 segundos
        globalOnlineStatus = {};

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const user = child.val();
                if (user.lastActive > activeThreshold) {
                    globalOnlineStatus[child.key] = {
                        displayName: user.displayName,
                        tag: user.tag || 'Visitante',
                        online: true
                    };
                } else {
                    globalOnlineStatus[child.key] = {
                        displayName: user.displayName,
                        tag: user.tag || 'Visitante',
                        online: false
                    };
                }
            });
        }
        if (els.adminPanel.style.display !== 'none') {
            displayUserList(); // Atualiza a lista se o painel estiver aberto
        }
    });
};

const displayUserList = () => {
    const listBody = els.adminUserListBody;
    listBody.innerHTML = '';
    
    const allUsers = [...globalUserList]; 

    // Adiciona usuários online que não estão na lista global (novos registros)
    Object.keys(globalOnlineStatus).forEach(uid => {
        if (!allUsers.some(u => u.uid === uid)) {
            allUsers.push({ uid, displayName: globalOnlineStatus[uid].displayName, tag: globalOnlineStatus[uid].tag });
        }
    });

    els.onlineUsersCount.textContent = Object.values(globalOnlineStatus).filter(u => u.online).length;

    allUsers.sort((a, b) => (b.tag === 'Admin') - (a.tag === 'Admin') || a.displayName.localeCompare(b.displayName));
    
    allUsers.forEach(user => {
        const isOnline = globalOnlineStatus[user.uid] && globalOnlineStatus[user.uid].online;
        const onlineClass = isOnline ? 'status-online' : 'status-offline';
        
        const row = listBody.insertRow();
        row.innerHTML = `
            <td class="user-name-cell">
                <span class="status-dot ${onlineClass}"></span>
                ${user.displayName} 
                <span class="user-status-display tag-${user.tag.toLowerCase()}">${user.tag}</span>
            </td>
            <td>
                <select class="tag-select" data-uid="${user.uid}" ${user.uid === auth.currentUser.uid ? 'disabled' : ''}>
                    <option value="Admin" ${user.tag === 'Admin' ? 'selected' : ''}>Admin</option>
                    <option value="Hells" ${user.tag === 'Hells' ? 'selected' : ''}>Hells</option>
                    <option value="Visitante" ${user.tag === 'Visitante' ? 'selected' : ''}>Visitante</option>
                </select>
                ${user.uid !== auth.currentUser.uid ? '<button class="action-btn danger delete-user-btn" data-uid="' + user.uid + '">❌</button>' : ''}
            </td>
        `;
    });

    listBody.querySelectorAll('.tag-select').forEach(select => {
        select.onchange = (e) => changeUserTag(e.target.dataset.uid, e.target.value);
    });
    listBody.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.onclick = (e) => deleteUser(e.target.dataset.uid);
    });
};

const changeUserTag = (uid, newTag) => {
    const userRef = ref(db, `usuarios/${uid}/tag`);
    set(userRef, newTag)
        .then(() => showToast(`Tag de usuário atualizada para ${newTag}.`, "success"))
        .catch(err => showToast(`Erro ao atualizar tag: ${err.message}`, "error"));
};

const deleteUser = (uid) => {
    if (confirm("ATENÇÃO: Deseja apagar este usuário PERMANENTEMENTE do seu banco de dados?")) {
        // Remove do nó "usuarios" e do nó "onlineStatus"
        const updates = {};
        updates[`usuarios/${uid}`] = null;
        updates[`onlineStatus/${uid}`] = null;
        
        update(ref(db), updates)
            .then(() => {
                showToast("Usuário removido do sistema.", "success");
                loadAdminPanel(true); 
            })
            .catch(err => showToast(`Erro ao apagar: ${err.message}`, "error"));
    }
};

export const loadAdminPanel = async (forceUpdate = false, currentUser) => {
    if (!currentUser) return;

    // 1. Carrega a lista completa de usuários
    if (forceUpdate) {
        try {
            const snapshot = await get(ref(db, 'usuarios'));
            if (snapshot.exists()) {
                globalUserList = [];
                snapshot.forEach(child => {
                    globalUserList.push({ uid: child.key, ...child.val() });
                });
            } else {
                globalUserList = [];
            }
            displayUserList();
        } catch (error) {
            showToast("Erro ao carregar lista de usuários.", "error");
        }
    }
    
    // 2. Atualiza os botões de migração
    updateMigrationUI(); // Garante que o estado visual está correto ao abrir
};


// ===============================================
// FUNÇÕES DE MIGRAÇÃO DE DADOS (USO ÚNICO)
// ===============================================

export const migrateVendasToDossier = async () => {
    if (migrationStatus.dossierConcluida) {
         showToast("Migração de Dossiê já concluída!", "default");
         return;
    }
    
    els.migrateDossierBtn.disabled = true;
    els.migrateDossierBtn.textContent = "Migrando...";

    try {
        const ventasSnap = await get(ref(db, 'vendas'));
        if (!ventasSnap.exists()) {
            showToast("Nenhuma venda para migrar.", "default");
            return;
        }

        let count = 0;
        ventasSnap.forEach(child => {
            const vendaData = child.val();
            
            // Lógica para determinar a organização correta para o dossiê
            let dossierOrg = '';
            if (vendaData.organizacaoTipo === 'CPF') dossierOrg = 'CPF';
            else if (vendaData.organizacaoTipo === 'OUTROS') dossierOrg = 'Outros';
            else dossierOrg = vendaData.organizacao || '';
            
            // Cria uma entrada de dossiê se os campos necessários existirem
            if (dossierOrg && vendaData.cliente) {
                const dossierVendaData = { ...vendaData }; 
                dossierVendaData.organizacao = dossierOrg; 
                addDossierEntry(dossierVendaData);
                count++;
            }
        });

        if (count > 0) {
            // ⭐️ NOVO: Define a flag de conclusão
            await set(ref(db, 'configuracoesGlobais/migracao/dossierConcluida'), true); 
            showToast(`Migração de dossiê concluída! ${count} registros copiados.`, "success");
        } else {
            showToast("Nenhuma venda válida encontrada para migrar.", "default");
        }

    } catch (error) {
        showToast(`Erro na migração de dossiê: ${error.message}`, "error");
    } finally {
        updateMigrationUI(); // Atualiza a UI para refletir o novo status
    }
};


export const migrateVeiculosData = async () => {
    if (migrationStatus.veiculosConcluida) {
         showToast("Migração de Veículos já concluída!", "default");
         return;
    }
    
    els.migrateVeiculosBtn.disabled = true;
    els.migrateVeiculosBtn.textContent = "Migrando...";

    try {
        const dossiesSnap = await get(ref(db, 'dossies'));
        if (!dossiesSnap.exists()) {
            showToast("Nenhum dossiê para migrar veículos.", "default");
            return;
        }

        const updates = {};
        let count = 0;

        dossiesSnap.forEach(orgSnapshot => {
            const org = orgSnapshot.key;
            orgSnapshot.forEach(personSnapshot => {
                const personId = personSnapshot.key;
                const personData = personSnapshot.val();
                
                // Procura os campos antigos 'carro' e 'placas'
                if (personData.carro || personData.placas) {
                    const carros = (personData.carro || '').split(',').map(c => c.trim());
                    const placas = (personData.placas || '').split(',').map(p => p.trim());
                    const maxLen = Math.max(carros.length, placas.length);
                    
                    const newVeiculos = personData.veiculos || {}; // Mantém veículos existentes

                    for (let i = 0; i < maxLen; i++) {
                        const carroNome = carros[i] || 'N/A';
                        const placaNum = placas[i] || `MIG_${Date.now()}_${i}`; // Chave temporária
                        
                        if(carroNome !== 'N/A' || (placaNum && !placaNum.startsWith('MIG_'))) {
                            newVeiculos[placaNum] = {
                                carro: carroNome,
                                placa: placas[i] || '', // Deixa placa vazia se não existir
                                fotoUrl: '' 
                            };
                        }
                    }
                    const path = `dossies/${org}/${personId}`;
                    updates[`${path}/veiculos`] = newVeiculos;
                    updates[`${path}/carro`] = null; // Apaga os campos antigos
                    updates[`${path}/placas`] = null; // Apaga os campos antigos
                    count++;
                }
            });
        });
        
        if (count > 0) {
            await update(ref(db), updates);
            // ⭐️ NOVO: Define a flag de conclusão
            await set(ref(db, 'configuracoesGlobais/migracao/veiculosConcluida'), true); 
            showToast(`Migração de veículos concluída! ${count} registros atualizados.`, "success");
        } else {
            showToast("Nenhum registro antigo para migrar.", "default");
        }
    } catch (error) {
        showToast(`Erro na migração de veículos: ${error.message}`, "error");
    } finally {
        updateMigrationUI(); // Atualiza a UI para refletir o novo status
    }
};
