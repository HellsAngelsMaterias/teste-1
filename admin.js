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
let migrationStatus = { dossierConcluida: false, veiculosConcluida: false }; // NOVO: Estado local da migração

// ===============================================
// CONTROLES DE LAYOUT GLOBAL
// ===============================================

const globalLayoutRef = ref(db, 'configuracoesGlobais/layout');
const globalMigrationRef = ref(db, 'configuracoesGlobais/migracao'); // NOVO: Ref para status de migração

// Função para atualizar a UI dos botões de migração
const updateMigrationUI = () => {
    const { migrateDossierBtn, migrateVeiculosBtn } = els;
    
    // Certifique-se de que os elementos existem antes de manipulá-los
    if (!migrateDossierBtn || !migrateVeiculosBtn) return;
    
    // Migração de Vendas para Dossiê
    if (migrationStatus.dossierConcluida) {
        migrateDossierBtn.textContent = "Dossiê Migrado (Concluído)";
        migrateDossierBtn.disabled = true;
        // Usando cor verde/sucesso para indicar conclusão
        migrateDossierBtn.style.backgroundColor = '#008000'; 
        migrateDossierBtn.style.animation = 'none';
        migrateDossierBtn.style.cursor = 'default';
        migrateDossierBtn.style.color = '#fff';
    } else {
        migrateDossierBtn.textContent = "Migrar Vendas Antigas para Dossiê";
        migrateDossierBtn.disabled = false;
        // Usando a cor de erro/perigo para indicar uma ação crítica pendente
        migrateDossierBtn.style.backgroundColor = 'var(--cor-erro)';
        // Reativa a animação/estilo se estiver no style.css
        migrateDossierBtn.style.animation = 'pulse-glow 2s infinite ease-in-out';
        migrateDossierBtn.style.cursor = 'pointer';
        migrateDossierBtn.style.color = '#fff';
    }

    // Migração de Carros/Placas para Veículos (dentro do Dossiê)
    if (migrationStatus.veiculosConcluida) {
        migrateVeiculosBtn.textContent = "Veículos Migrados (Concluído)";
        migrateVeiculosBtn.disabled = true;
        migrateVeiculosBtn.style.backgroundColor = '#008000'; // Verde para concluído
        migrateVeiculosBtn.style.animation = 'none';
        migrateVeiculosBtn.style.cursor = 'default';
        migrateVeiculosBtn.style.color = '#fff';
    } else {
        migrateVeiculosBtn.textContent = "Migrar Veículos Antigos (Dossiê)";
        migrateVeiculosBtn.disabled = false;
        migrateVeiculosBtn.style.backgroundColor = 'var(--cor-erro)';
        migrateVeiculosBtn.style.animation = 'pulse-glow 2s infinite ease-in-out';
        migrateVeiculosBtn.style.cursor = 'pointer';
        migrateVeiculosBtn.style.color = '#fff';
    }
};

// NOVO: Listener que monitora o status de migração (e aciona a UI)
const monitorMigrationStatus = () => {
    const listener = onValue(globalMigrationRef, (snapshot) => {
        if (snapshot.exists()) {
            migrationStatus = { 
                dossierConcluida: snapshot.val().dossierConcluida || false, 
                veiculosConcluida: snapshot.val().veiculosConcluida || false 
            };
        }
        // Atualiza a UI imediatamente quando o status do Firebase muda
        if (els.migrateDossierBtn && els.migrateVeiculosBtn) { 
            updateMigrationUI(); 
        }
    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") console.error("Erro ao monitorar status de migração:", error);
    });
    // Armazenar o listener pode ser útil se precisar removê-lo em algum momento
    // monitorMigrationStatus.listener = listener; 
};

// Chamado na inicialização do script.js
monitorMigrationStatus(); 

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
        els.bottomPanelDisplay.textContent = settings.bottomPanelText || 'Este é o painel inferior.'; 
    }
    
    // Atualiza os inputs do admin panel para refletir o estado do DB
    if (els.adminPanel.style.display !== 'none') {
         if (els.bottomPanelText) els.bottomPanelText.value = settings.bottomPanelText || '';
         if (els.layoutToggleNightMode) els.layoutToggleNightMode.checked = settings.enableNightMode;
         if (els.layoutToggleBottomPanel) els.layoutToggleBottomPanel.checked = settings.enableBottomPanel;
    }

}, (error) => {
    if(error.code !== "PERMISSION_DENIED") {
        showToast(`Erro ao carregar configurações de layout: ${error.message}`, 'error');
    }
});

// Função chamada pelo event listener no script.js
export const updateGlobalLayout = (key, value) => {
    const layoutRef = ref(db, `configuracoesGlobais/layout/${key}`);
    set(layoutRef, value)
        .catch((error) => {
            showToast(`Erro ao salvar configuração: ${error.message}`, 'error');
        });
};

// ===============================================
// STATUS ONLINE E GERENCIAMENTO DE USUÁRIOS
// ===============================================

export const updateUserActivity = (currentUser, currentUserData) => {
    if (currentUser) {
        const activityRef = ref(db, `onlineStatus/${currentUser.uid}`);
        set(activityRef, {
            lastActive: Date.now(),
            displayName: currentUser.displayName,
            tag: currentUserData ? currentUserData.tag : 'N/A'
        }).catch(e => console.warn("Erro ao registrar atividade online:", e.message));
        
        // Define o próximo update
        setTimeout(() => updateUserActivity(currentUser, currentUserData), 30000); 
    }
};

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
};

export const monitorOnlineStatus = () => {
    const statusRef = ref(db, 'onlineStatus');
    
    // Remove listener anterior se existir
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
                globalOnlineStatus[uid] = { isOnline, inactivity, lastActive: userStatus.lastActive };
            });
        }
        
        els.onlineUsersCount.textContent = activeCount.toString();
        
        // Se o Painel Admin estiver aberto, força a atualização da lista
        if (els.adminPanel.style.display !== 'none') {
            loadAdminPanel(false); // Atualiza a lista sem recarregar tudo
        }

    }, (error) => {
        if(error.code !== "PERMISSION_DENIED") console.error("Erro ao monitorar status online:", error);
    });
    
    monitorOnlineStatus.listener = listener;
};

const deleteUser = (uid, displayName) => {
    if (confirm(`ATENÇÃO:\n\nTem certeza que deseja apagar o usuário "${displayName}"?\n\nIsso removerá o registro dele do banco de dados (e suas permissões).\n\nIMPORTANTE: Para apagar o LOGIN dele permanentemente, você ainda precisará ir ao painel "Authentication" do Firebase.`)) {
        // Remove do nó 'usuarios'
        remove(ref(db, `usuarios/${uid}`))
            .then(() => {
                // Tenta remover do nó 'onlineStatus' (pode não existir)
                remove(ref(db, `onlineStatus/${uid}`)); 
                showToast(`Usuário "${displayName}" apagado do banco de dados.`, 'success');
                loadAdminPanel(true); // Recarrega a lista
            })
            .catch((error) => showToast(`Erro ao apagar usuário: ${error.message}`, 'error'));
    }
};

export const loadAdminPanel = async (fetchStatus = true, currentUser) => {
    
    // 1. Garante que os dados de status online estejam disponíveis
    if (fetchStatus) {
        try {
            const statusSnapshot = await get(ref(db, 'onlineStatus'));
            const now = Date.now();
            globalOnlineStatus = {}; 
            if (statusSnapshot.exists()) {
                statusSnapshot.forEach(child => {
                    const userStatus = child.val();
                    const inactivity = now - userStatus.lastActive;
                    globalOnlineStatus[child.key] = { isOnline: inactivity < 60000, inactivity };
                });
            }
        } catch (error) {
            if(error.code !== "PERMISSION_DENIED") showToast(`Erro ao carregar status online: ${error.message}`, 'error');
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
            if (userSnap.val().displayName.toLowerCase() !== 'snow') {
                usersList.push({ uid: userSnap.key, ...userSnap.val() });
            }
        });

        // Re-ordena: Online (Admin/Hells) > Offline (Admin/Hells) > Visitante
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

            // 1. Nome (com status dot)
            const statusDotClass = status.isOnline ? 'status-online' : 'status-offline';
            const displayNameText = userData.displayName || '(Sem nome)';
            mainCell.innerHTML = `
                <div style="display: flex; align-items: center; font-weight: 700; font-size: 16px; margin-bottom: 4px;">
                    <span class="status-dot ${statusDotClass}" title="${status.isOnline ? 'Online' : 'Inativo'}" style="flex-shrink: 0;"></span>
                    <span>${displayNameText}</span>
                </div>
            `;
            
            // 2. Atividade
            const activitySpan = document.createElement('span');
            activitySpan.style.cssText = 'font-size: 13px; display: block; margin-left: 20px; margin-bottom: 8px;';
            const statusText = status.isOnline ? `Ativo (agora)` : `Inativo há ${formatInactivityTime(status.inactivity)}`;
            activitySpan.textContent = statusText;
            activitySpan.style.color = status.isOnline ? '#00b33c' : 'var(--cor-erro)';
            if (!status.isOnline && status.inactivity > 60000 * 60 * 24) {
                 activitySpan.textContent = 'Inativo há muito tempo';
                 activitySpan.style.color = '#888';
            }
            mainCell.appendChild(activitySpan);
            
            // 3. Permissão (Tag)
            const tagContainer = document.createElement('div');
            tagContainer.style.marginLeft = '20px';
            if (uid === currentUser.uid) {
                tagContainer.textContent = `👑 ${userData.tag} (Você)`;
                tagContainer.style.fontWeight = '600';
            } else {
                tagContainer.innerHTML = `
                    <select style="width: auto; max-width: 200px;" data-uid="${uid}">
                        <option value="Visitante">Visitante</option>
                        <option value="HELLS">Hells</option>
                        <option value="ADMIN">👑 Administrador</option>
                    </select>
                `;
                const select = tagContainer.querySelector('select');
                select.value = userData.tag.toUpperCase() === 'HELLS' ? 'HELLS' : (userData.tag.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'Visitante');
                select.onchange = (e) => updateUserTag(e.target.dataset.uid, e.target.value);
            }
            mainCell.appendChild(tagContainer);

            // CÉLULA DE AÇÕES
            const actionsCell = row.insertCell();
            actionsCell.style.textAlign = 'center';
            actionsCell.style.verticalAlign = 'middle';
            if (uid === currentUser.uid) {
                actionsCell.textContent = '---';
            } else {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '❌';
                deleteBtn.className = 'danger action-btn'; 
                deleteBtn.style.cssText = 'padding: 5px 8px; font-size: 14px; line-height: 1;';
                deleteBtn.onclick = () => deleteUser(uid, userData.displayName);
                actionsCell.appendChild(deleteBtn);
            }
        });
        
    } catch (error) {
        // Trata erros de leitura do nó 'usuarios'
        els.adminUserListBody.innerHTML = `<tr><td colspan="2" style="text-align: center;">Erro ao carregar lista de usuários.</td></tr>`;
    }
    
    // 4. Garante que a UI de migração está correta
    updateMigrationUI();
};

const updateUserTag = (uid, newTag) => {
    set(ref(db, `usuarios/${uid}/tag`), newTag)
        .then(() => showToast("Permissão do usuário atualizada!", 'success'))
        .catch((error) => showToast(`Erro ao atualizar tag: ${error.message}`, 'error'));
};

// ===============================================
// AÇÕES DE MIGRAÇÃO (AGORA COM RASTREAMENTO DE USO ÚNICO)
// ===============================================

export const migrateVendasToDossier = async () => {
    if (migrationStatus.dossierConcluida) {
         showToast("Migração de Dossiê já concluída!", "default");
         return;
    }
    
    if (!confirm("Isso irá copiar *todas* as vendas com organização para o Dossiê de Pessoas. (Já faz verificação de duplicados). Deseja continuar?")) return;
    
    showToast("Iniciando migração... Isso pode demorar.", "default", 5000);
    els.migrateDossierBtn.disabled = true;
    els.migrateDossierBtn.textContent = "Migrando...";

    let isSuccess = false;
    
    try {
        const snapshot = await get(ref(db, 'vendas'));
        if (!snapshot.exists()) {
            showToast("Nenhuma venda encontrada para migrar.", "default");
            isSuccess = true; 
            return;
        }
        
        const vendas = snapshot.val();
        let count = 0;
        for (const vendaId in vendas) {
            const venda = vendas[vendaId];
            
            let orgDestino = '';
            if (venda.organizacaoTipo === 'CPF') orgDestino = 'CPF';
            else if (venda.organizacaoTipo === 'OUTROS') orgDestino = 'Outros';
            else orgDestino = venda.organizacao.trim();
            
            if (orgDestino && venda.cliente) {
                const vendaData = {
                    cliente: venda.cliente,
                    organizacao: orgDestino, 
                    telefone: venda.telefone,
                    vendaValorObs: venda.vendaValorObs || 'N/A (Migrado)',
                    dataHora: venda.dataHora,
                    carro: venda.carro,
                    placas: venda.placas
                };
                await addDossierEntry(vendaData, null); // Importado de dossier.js
                count++;
            }
        }
        
        // ⭐️ NOVO: Marca a conclusão no Firebase
        if (count > 0) {
            await set(ref(db, 'configuracoesGlobais/migracao/dossierConcluida'), true); 
            showToast(`Migração de dossiê concluída! ${count} registros copiados.`, "success");
        } else {
             showToast("Nenhuma venda válida encontrada para migrar.", "default");
        }
        isSuccess = true;
    } catch (error) {
        showToast(`Erro na migração de dossiê: ${error.message}`, "error");
        isSuccess = false;
    } finally {
        updateMigrationUI(); // Atualiza a UI para refletir o novo status
    }
};

export const migrateVeiculosData = async () => {
    if (migrationStatus.veiculosConcluida) {
         showToast("Migração de Veículos já concluída!", "default");
         return;
    }
    
    if (!confirm("ATENÇÃO: Isso irá converter TODOS os campos 'carro' e 'placas' (com vírgulas) para o novo sistema de veículos. Faça isso APENAS UMA VEZ.\n\nDeseja continuar?")) return;
    
    showToast("Iniciando migração de veículos...", "default", 5000);
    els.migrateVeiculosBtn.disabled = true;
    els.migrateVeiculosBtn.textContent = "Migrando...";
    
    let isSuccess = false;
    
    try {
        const snapshot = await get(ref(db, 'dossies'));
        if (!snapshot.exists()) {
            showToast("Nenhum dossiê encontrado.", "default");
            isSuccess = true;
            return;
        }
        
        const dossies = snapshot.val();
        let count = 0;
        const updates = {};
        
        for (const org in dossies) {
            for (const personId in dossies[org]) {
                const person = dossies[org][personId];
                // Verifica se há dados antigos e se o novo sistema (veiculos) não foi usado
                if ((person.carro || person.placas) && !person.veiculos) {
                    const newVeiculos = {};
                    const carros = (person.carro || '').split(',').map(c => c.trim());
                    const placas = (person.placas || '').split(',').map(p => p.trim());
                    const maxLen = Math.max(carros.length, placas.length);
                    
                    for (let i = 0; i < maxLen; i++) {
                        const carroNome = carros[i] || 'N/A';
                        
                        // Garante que a chave seja única (usando placa ou um ID temporário)
                        if(carroNome !== 'N/A' || (placas[i] && placas[i].trim())) {
                            const key = placas[i] && placas[i].trim() ? placas[i].trim() : `MIG_TEMP_${Date.now()}_${i}`;
                            newVeiculos[key] = {
                                carro: carroNome,
                                placa: placas[i] || '', // Deixa placa vazia se não existir
                                fotoUrl: '' 
                            };
                        }
                    }
                    const path = `dossies/${org}/${personId}`;
                    updates[`${path}/veiculos`] = newVeiculos;
                    updates[`${path}/carro`] = null; // Remove campos antigos
                    updates[`${path}/placas`] = null; // Remove campos antigos
                    count++;
                }
            }
        }
        
        if (count > 0) {
            await update(ref(db), updates);
            // ⭐️ NOVO: Marca a conclusão no Firebase
            await set(ref(db, 'configuracoesGlobais/migracao/veiculosConcluida'), true); 
            showToast(`Migração de veículos concluída! ${count} registros atualizados.`, "success");
        } else {
             showToast("Nenhum registro antigo para migrar.", "default");
        }
        isSuccess = true;
    } catch (error) {
        showToast(`Erro na migração de veículos: ${error.message}`, "error");
        isSuccess = false;
    } finally {
        updateMigrationUI(); // Atualiza a UI para refletir o novo status
    }
};
