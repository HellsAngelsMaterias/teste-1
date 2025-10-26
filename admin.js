/* ===================================================
 * admin.js
 * Responsável pelo Painel Admin, status online,
 * gerenciamento de usuários e migrações de dados.
 * =================================================== */

// --- IMPORTS ---
import { db, ref, set, onValue, remove, get, update } from './firebase.js';
import { els, showToast, toggleView } from './ui.js';
import { getCurrentUser, getCurrentUserData } from './auth.js';
import { addDossierEntry } from './dossier.js'; // Para migração

// --- STATE ---
let globalOnlineStatus = {}; 
const globalLayoutRef = ref(db, 'configuracoesGlobais/layout');

// --- FUNÇÕES DE STATUS ONLINE E LAYOUT GLOBAL ---

/**
 * Listener que atualiza o layout (bottom panel, night mode) para todos.
 * É iniciado no `script.js` principal.
 */
export function initGlobalLayoutListener() {
    onValue(globalLayoutRef, (snapshot) => {
        const currentUserData = getCurrentUserData();
        if (!snapshot.exists()) {
            console.warn("Nó /configuracoesGlobais/layout não encontrado. Criando...");
            if(currentUserData && currentUserData.tag.toUpperCase() === 'ADMIN') {
                 set(globalLayoutRef, { enableNightMode: true, enableBottomPanel: false, bottomPanelText: 'Este é o painel inferior.' });
            }
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
            els.bottomPanelDisplay.textContent = settings.bottomPanelText || 'Este é o painel inferior.'; 
        }
        
        if (els.adminPanel.style.display !== 'none' && els.bottomPanelText) {
             els.bottomPanelText.value = settings.bottomPanelText || '';
        }

    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar configurações de layout: ${error.message}`, 'error');
        }
    });
}

/**
 * Atualiza a última atividade do usuário (chamado por auth.js)
 */
export const updateUserActivity = () => {
    const currentUser = getCurrentUser();
    const currentUserData = getCurrentUserData();
    
    if (currentUser) {
        const activityRef = ref(db, `onlineStatus/${currentUser.uid}`);
        
        set(activityRef, {
            lastActive: Date.now(),
            displayName: currentUser.displayName,
            tag: currentUserData ? currentUserData.tag : 'N/A'
        }).catch(e => {
             console.warn("Erro ao registrar atividade online:", e.message);
        });
        
        setTimeout(updateUserActivity, 30000); 
    }
};

/**
 * Formata o tempo de inatividade.
 */
const formatInactivityTime = (inactivityMs) => {
    const seconds = Math.floor(inactivityMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 5) return "Agora";
    if (seconds < 60) return `${seconds} Segundos`;
    if (minutes < 60) return `${minutes} Minuto${minutes > 1 ? 's' : ''}`;
    
    const remainingMinutes = minutes % 60;
    if (hours < 2) return `1 Hora e ${remainingMinutes} Minutos`;
    return `${hours} Horas e ${remainingMinutes} Minutos`;
}

/**
 * Monitora e armazena o status de atividade (chamado por auth.js)
 */
export const monitorOnlineStatus = () => {
    const statusRef = ref(db, 'onlineStatus');
    
    if (monitorOnlineStatus.listener) {
        monitorOnlineStatus.listener();
    }
    
    const listener = onValue(statusRef, (snapshot) => {
        const now = Date.now();
        let activeCount = 0;
        globalOnlineStatus = {}; 
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const uid = child.key;
                const userStatus = child.val();
                const inactivity = now - userStatus.lastActive;
                const isOnline = inactivity < 60000; // 60 segundos
                
                if (isOnline) activeCount++;

                globalOnlineStatus[uid] = {
                    isOnline: isOnline,
                    inactivity: inactivity,
                    lastActive: userStatus.lastActive
                };
            });
        }
        
        els.onlineUsersCount.textContent = activeCount.toString();
        
        if (els.adminPanel.style.display !== 'none') {
            loadAdminPanel(false); // Atualiza a lista na tabela
        }

    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") {
            console.error("Erro ao monitorar status online:", error);
        }
    });
    
    monitorOnlineStatus.listener = listener;
};


// --- FUNÇÕES DO PAINEL ADMIN ---

const deleteUser = (uid, displayName) => {
    if (confirm(`ATENÇÃO:\n\nTem certeza que deseja apagar o usuário "${displayName}"?\n\nIsso removerá o registro dele do banco de dados (e suas permissões).\n\nIMPORTANTE: Para apagar o LOGIN dele permanentemente, você ainda precisará ir ao painel "Authentication" do Firebase.`)) {
        
        const userRef = ref(db, `usuarios/${uid}`);
        remove(userRef)
            .then(() => {
                showToast(`Usuário "${displayName}" apagado do banco de dados.`, 'success');
                loadAdminPanel();
            })
            .catch((error) => {
                showToast(`Erro ao apagar usuário: ${error.message}`, 'error');
            });
    }
};

/**
 * Carrega a lista de usuários e incorpora o status online.
 */
export const loadAdminPanel = async (fetchStatus = true) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    if (fetchStatus) {
        const statusSnapshot = await get(ref(db, 'onlineStatus'));
        const now = Date.now();
        globalOnlineStatus = {}; 
        
        if (statusSnapshot.exists()) {
            statusSnapshot.forEach(child => {
                const userStatus = child.val();
                const inactivity = now - userStatus.lastActive;
                const isOnline = inactivity < 60000; 
                globalOnlineStatus[child.key] = {
                    isOnline: isOnline,
                    inactivity: inactivity
                };
            });
        }
    }
    
    els.adminUserListBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Carregando...</td></tr>';
    
    try {
        const usersSnapshot = await get(ref(db, 'usuarios'));
        if (!usersSnapshot.exists()) {
            els.adminUserListBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhum usuário encontrado.</td></tr>';
            return;
        }
        
        const usersList = [];
        usersSnapshot.forEach(userSnap => {
            const userData = userSnap.val();
            if (userData.displayName && userData.displayName.toLowerCase() === 'snow') {
                return;
            }
            usersList.push({ uid: userSnap.key, ...userData });
        });

        const tagOrder = { 'ADMIN': 1, 'HELLS': 2, 'VISITANTE': 3 };
        
        usersList.sort((a, b) => {
            const statusA = globalOnlineStatus[a.uid] || { isOnline: false, inactivity: Infinity };
            const statusB = globalOnlineStatus[b.uid] || { isOnline: false, inactivity: Infinity };
            if (statusA.isOnline !== statusB.isOnline) return statusA.isOnline ? -1 : 1; 
            const tagA = (tagOrder[a.tag.toUpperCase()] || 4);
            const tagB = (tagOrder[b.tag.toUpperCase()] || 4);
            if (tagA !== tagB) return tagA - tagB;
            if (statusA.inactivity !== statusB.inactivity) return statusA.inactivity - statusB.inactivity;
            return (a.displayName || '').localeCompare(b.displayName || '');
        });

        els.adminUserListBody.innerHTML = '';
        
        usersList.forEach(user => {
            const uid = user.uid;
            const userData = user;
            const status = globalOnlineStatus[uid] || { isOnline: false, inactivity: Infinity };
            
            const row = els.adminUserListBody.insertRow();
            const mainCell = row.insertCell();
            mainCell.style.verticalAlign = 'top';
            mainCell.style.padding = '8px 6px';

            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = "display: flex; align-items: center; font-weight: 700; font-size: 16px; margin-bottom: 4px;";
            const statusDotClass = status.isOnline ? 'status-online' : 'status-offline';
            const displayNameText = userData.displayName || '(Sem nome)';
            nameDiv.innerHTML = `<span class="status-dot ${statusDotClass}" title="${status.isOnline ? 'Online' : 'Inativo'}" style="flex-shrink: 0;"></span><span>${displayNameText}</span>`;
            mainCell.appendChild(nameDiv);

            const activitySpan = document.createElement('span');
            activitySpan.style.cssText = "font-size: 13px; display: block; margin-left: 20px; margin-bottom: 8px;";
            const statusText = status.isOnline ? `Ativo (agora)` : `Inativo há ${formatInactivityTime(status.inactivity)}`;
            activitySpan.textContent = statusText;
            activitySpan.style.color = status.isOnline ? '#00b33c' : 'var(--cor-erro)';
            if (!status.isOnline && status.inactivity > 60000 * 60 * 24) {
                 activitySpan.textContent = 'Inativo há muito tempo';
                 activitySpan.style.color = '#888';
            }
            mainCell.appendChild(activitySpan);
            
            const tagContainer = document.createElement('div');
            tagContainer.style.marginLeft = '20px'; 
            
            if (uid === currentUser.uid) {
                tagContainer.textContent = `👑 ${userData.tag} (Você)`;
                tagContainer.style.fontWeight = '600';
            } else {
                const select = document.createElement('select');
                select.style.cssText = "width: auto; max-width: 200px;";
                select.dataset.uid = uid; 
                select.innerHTML = `
                    <option value="Visitante">Visitante</option>
                    <option value="HELLS">Hells</option>
                    <option value="ADMIN">👑 Administrador</option>
                `;
                select.value = userData.tag.toUpperCase() === 'HELLS' ? 'HELLS' : (userData.tag.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'Visitante');
                select.onchange = (e) => updateUserTag(e.target.dataset.uid, e.target.value);
                tagContainer.appendChild(select);
            }
            mainCell.appendChild(tagContainer);

            const actionsCell = row.insertCell();
            actionsCell.style.cssText = "text-align: center; vertical-align: middle;";
            
            if (uid === currentUser.uid) {
                actionsCell.textContent = '---';
            } else {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '❌';
                deleteBtn.className = 'danger action-btn'; 
                deleteBtn.style.cssText = "padding: 5px 8px; font-size: 14px; line-height: 1;";
                deleteBtn.addEventListener('click', () => deleteUser(uid, userData.displayName));
                actionsCell.appendChild(deleteBtn);
            }
        });
        
    } catch (error) {
        showToast(`Erro ao carregar usuários: ${error.message}`, 'error');
        els.adminUserListBody.innerHTML = `<tr><td colspan="2" style="text-align: center;">Erro ao carregar. ${error.message}</td></tr>`;
    }
    
    try {
        const layoutSnapshot = await get(ref(db, 'configuracoesGlobais/layout'));
        if (layoutSnapshot.exists()) {
            const settings = layoutSnapshot.val();
            els.layoutToggleNightMode.checked = settings.enableNightMode;
            els.layoutToggleBottomPanel.checked = settings.enableBottomPanel;
            els.bottomPanelText.value = settings.bottomPanelText || '';
        }
    } catch (error) {
        if(error.code !== "PERMISSION_DENIED") {
            showToast(`Erro ao carregar configurações de layout: ${error.message}`, 'error');
        }
    }
};

const updateUserTag = (uid, newTag) => {
    const tagRef = ref(db, `usuarios/${uid}/tag`);
    set(tagRef, newTag)
        .then(() => showToast("Permissão do usuário atualizada!", 'success'))
        .catch((error) => showToast(`Erro ao atualizar tag: ${error.message}`, 'error'));
};

const updateGlobalLayout = (key, value) => {
    const layoutRef = ref(db, `configuracoesGlobais/layout/${key}`);
    set(layoutRef, value)
        .catch((error) => showToast(`Erro ao salvar configuração: ${error.message}`, 'error'));
};


// --- FUNÇÕES DE MIGRAÇÃO ---

const migrateVendasToDossier = async () => {
    if (!confirm("Isso irá copiar *todas* as vendas com organização para o Dossiê de Pessoas. (Já faz verificação de duplicados). Deseja continuar?")) {
        return;
    }
    showToast("Iniciando migração... Isso pode demorar.", "default", 5000);
    let isSuccess = false;
    els.migrateDossierBtn.disabled = true;
    els.migrateDossierBtn.textContent = "Migrando...";
    
    try {
        const vendasRef = ref(db, 'vendas');
        const snapshot = await get(vendasRef);
        if (!snapshot.exists()) {
            showToast("Nenhuma venda encontrada para migrar.", "error");
            isSuccess = true; 
            return;
        }
        
        const vendas = snapshot.val();
        let count = 0;
        for (const vendaId in vendas) {
            const venda = vendas[vendaId];
            const vendaData = {
                cliente: venda.cliente,
                organizacao: venda.organizacao,
                telefone: venda.telefone,
                vendaValorObs: venda.vendaValorObs || 'N/A (Migrado)',
                dataHora: venda.dataHora,
                carro: venda.carro,
                placas: venda.placas
            };
            await addDossierEntry(vendaData, null); // Usa a função importada
            count++;
        }
        showToast(`Migração concluída! ${count} registros verificados/migrados.`, "success");
        isSuccess = true;
    } catch (error) {
        showToast(`Erro na migração: ${error.message}`, "error");
        isSuccess = false;
    } finally {
        if (isSuccess) {
            els.migrateDossierBtn.textContent = "Migração Concluída";
        } else {
            els.migrateDossierBtn.disabled = false;
            els.migrateDossierBtn.textContent = "Migrar Vendas Antigas para Dossiê";
        }
    }
};

const migrateVeiculosData = async () => {
    if (!confirm("ATENÇÃO: Isso irá converter TODOS os campos 'carro' e 'placas' (com vírgulas) para o novo sistema de veículos. Faça isso APENAS UMA VEZ.\n\nDeseja continuar?")) {
        return;
    }
    showToast("Iniciando migração de veículos... Isso pode demorar.", "default", 5000);
    let isSuccess = false;
    els.migrateVeiculosBtn.disabled = true;
    els.migrateVeiculosBtn.textContent = "Migrando...";
    
    try {
        const dossiesRef = ref(db, 'dossies');
        const snapshot = await get(dossiesRef);
        if (!snapshot.exists()) {
            showToast("Nenhum dossiê encontrado.", "error");
            isSuccess = true;
            return;
        }
        
        const dossies = snapshot.val();
        let count = 0;
        const updates = {};
        for (const org in dossies) {
            for (const personId in dossies[org]) {
                const person = dossies[org][personId];
                if ((person.carro || person.placas) && !person.veiculos) {
                    const newVeiculos = {};
                    const carros = person.carro ? person.carro.split(',').map(c => c.trim()) : [];
                    const placas = person.placas ? person.placas.split(',').map(p => p.trim()) : [];
                    const maxLen = Math.max(carros.length, placas.length);
                    
                    for (let i = 0; i < maxLen; i++) {
                        const newKey = `mig_${i}`;
                        newVeiculos[newKey] = {
                            carro: carros[i] || 'N/A',
                            placa: placas[i] || 'N/A',
                            fotoUrl: '' 
                        };
                    }
                    
                    const path = `dossies/${org}/${personId}`;
                    updates[`${path}/veiculos`] = newVeiculos;
                    updates[`${path}/carro`] = null; 
                    updates[`${path}/placas`] = null; 
                    count++;
                }
            }
        }
        
        if (count > 0) {
            await update(ref(db), updates);
            showToast(`Migração de veículos concluída! ${count} registros atualizados.`, "success");
        } else {
            showToast("Nenhum registro antigo para migrar.", "default");
        }
        isSuccess = true;
    } catch (error) {
        showToast(`Erro na migração de veículos: ${error.message}`, "error");
        isSuccess = false;
    } finally {
        if (isSuccess) {
            els.migrateVeiculosBtn.textContent = "Migração Concluída";
        } else {
            els.migrateVeiculosBtn.disabled = false;
            els.migrateVeiculosBtn.textContent = "Migrar Veículos Antigos (Dossiê)";
        }
    }
};


// --- INICIALIZAÇÃO ---

export function initAdmin() {
    // Binds
    els.adminPanelBtn.onclick = () => {
        toggleView('admin');
        monitorOnlineStatus(); // Inicia o monitoramento
        loadAdminPanel(true); // Carrega a lista
    };
    els.toggleCalcBtnAdmin.onclick = () => toggleView('main'); 
    
    els.saveBottomPanelTextBtn.onclick = () => {
        const newText = els.bottomPanelText.value.trim();
        updateGlobalLayout('bottomPanelText', newText);
        showToast("Mensagem do rodapé salva!", "success");
    };
    
    els.layoutToggleNightMode.onchange = (e) => updateGlobalLayout('enableNightMode', e.target.checked);
    els.layoutToggleBottomPanel.onchange = (e) => updateGlobalLayout('enableBottomPanel', e.target.checked);
    
    els.migrateDossierBtn.onclick = migrateVendasToDossier;
    els.migrateVeiculosBtn.onclick = migrateVeiculosData; 
    
    // Inicia o listener global de layout
    initGlobalLayoutListener();
}