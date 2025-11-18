import { db } from './config.js';
import { els } from './dom.js';
import { showToast } from './utils.js';
import { ref, update, onValue, set, get, push, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

let currentUserTag = 'VISITANTE';
let currentUserEmail = '';

export const setAdminContext = (tag, email) => {
    currentUserTag = tag;
    currentUserEmail = email;
};

// --- Gerenciamento de Usuários ---
export const initUserListListener = () => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        els.adminUserListBody.innerHTML = '';
        if (!snapshot.exists()) {
            els.adminUserListBody.innerHTML = '<tr><td colspan="2">Nenhum usuário encontrado.</td></tr>';
            return;
        }
        
        const users = snapshot.val();
        Object.keys(users).forEach(uid => {
            const userData = users[uid];
            const row = document.createElement('tr');
            
            const isMe = (userData.email === currentUserEmail);
            const tagColor = userData.tag === 'ADMIN' ? 'var(--cor-tag-admin)' : 
                             (userData.tag === 'HELLS' ? 'var(--cor-tag-hells)' : 'var(--cor-tag-visitante)');
            
            let selectDisabled = '';
            // Regras de proteção:
            if (isMe || currentUserTag !== 'ADMIN') {
                selectDisabled = 'disabled';
            }
            
            row.innerHTML = `
                <td>
                    <div style="font-weight:bold;">${userData.username || 'Sem Nome'}</div>
                    <div style="font-size:11px; color: #888;">${userData.email}</div>
                    <div style="margin-top:4px;">
                        <span class="user-tag-badge" style="background-color: ${tagColor};">${userData.tag || 'VISITANTE'}</span>
                    </div>
                </td>
                <td>
                   <select class="tag-selector" data-uid="${uid}" ${selectDisabled} style="font-size:12px; padding: 2px;">
                       <option value="VISITANTE" ${userData.tag === 'VISITANTE' ? 'selected' : ''}>Visitante</option>
                       <option value="HELLS" ${userData.tag === 'HELLS' ? 'selected' : ''}>Hells</option>
                       <option value="ADMIN" ${userData.tag === 'ADMIN' ? 'selected' : ''}>Admin</option>
                   </select>
                   ${isMe ? '<span style="font-size:10px; display:block; margin-top:2px;">(Você)</span>' : ''}
                </td>
            `;
            
            // Evento de mudança de tag
            const select = row.querySelector('.tag-selector');
            if (!select.disabled) {
                select.onchange = (e) => changeUserTag(uid, e.target.value);
            }
            
            els.adminUserListBody.appendChild(row);
        });
    });
};

const changeUserTag = (targetUid, newTag) => {
    if (currentUserTag !== 'ADMIN') {
        showToast("Apenas ADMIN pode alterar permissões.", "error");
        return;
    }
    update(ref(db, `users/${targetUid}`), { tag: newTag })
        .then(() => showToast("Permissão atualizada!", "success"))
        .catch((err) => showToast(`Erro: ${err.message}`, "error"));
};

// --- Configurações Globais (Painel Inferior e Modos) ---
export const initGlobalSettingsListeners = () => {
    // Painel Inferior (Texto)
    onValue(ref(db, 'config/bottomPanelText'), (snap) => {
        const text = snap.val();
        if (text) {
            els.bottomPanelDisplay.innerHTML = text; 
            els.bottomPanelText.value = text;
        }
    });

    // Toggle Painel Inferior
    onValue(ref(db, 'config/showBottomPanel'), (snap) => {
        const show = snap.val();
        els.layoutToggleBottomPanel.checked = show;
        els.bottomPanel.style.display = show ? 'block' : 'none';
    });
    
    // Toggle Botão Night Mode
    onValue(ref(db, 'config/enableNightModeBtn'), (snap) => {
        const enable = snap.val();
        els.layoutToggleNightMode.checked = enable;
        els.themeBtn.style.display = enable ? 'inline-block' : 'none';
    });
};

export const saveGlobalSettings = () => {
    // Salvar texto do rodapé
    els.saveBottomPanelTextBtn.onclick = () => {
        const text = els.bottomPanelText.value;
        set(ref(db, 'config/bottomPanelText'), text)
            .then(() => showToast("Texto do rodapé atualizado!", "success"));
    };

    // Salvar Toggles
    els.layoutToggleBottomPanel.onchange = (e) => {
        set(ref(db, 'config/showBottomPanel'), e.target.checked);
    };
    
    els.layoutToggleNightMode.onchange = (e) => {
        set(ref(db, 'config/enableNightModeBtn'), e.target.checked);
    };
};

// --- Monitoramento de Usuários Online ---
export const updateOnlineStatus = (user) => {
    if (!user) return;
    
    const userStatusRef = ref(db, `status/${user.uid}`);
    const connectedRef = ref(db, '.info/connected');
    
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            const onDisconnectRef = onDisconnect(userStatusRef); 
            // Quando desconectar, define o timestamp para inatividade imediata
            onDisconnectRef.set({
                state: 'inactive',
                last_changed: Date.now()
            }); 
            
            // Define o status inicial como online/ativo
            set(userStatusRef, {
                state: 'online',
                last_changed: Date.now(),
                username: user.displayName || 'Anônimo'
            });
        }
    });
    
    // Atualiza timestamp a cada minuto para provar que está ativo
    setInterval(() => {
        if(auth.currentUser) update(userStatusRef, { last_changed: Date.now() });
    }, 60000);
};

export const initOnlineCountListener = () => {
    const statusRef = ref(db, 'status');
    onValue(statusRef, (snap) => {
        if (!snap.exists()) {
            els.onlineUsersCount.textContent = "0";
            return;
        }
        const users = snap.val();
        let onlineCount = 0;
        const now = Date.now();
        const cutoff = 2 * 60 * 1000; // 2 minutos de tolerância
        
        Object.values(users).forEach(u => {
            if (u.last_changed && (now - u.last_changed) < cutoff) {
                onlineCount++;
            }
        });
        els.onlineUsersCount.textContent = onlineCount;
    });
};

// --- Migrações (Ferramentas de uso único) ---
export const migrateOldSalesToDossier = async () => {
    if (currentUserTag !== 'ADMIN') return showToast("Apenas ADMIN pode rodar migrações.", "error");

    if (!confirm("ATENÇÃO: Isso vai copiar todas as vendas antigas para o Dossiê como 'Membros'. Isso pode gerar duplicatas se feito mais de uma vez. Continuar?")) return;
    
    els.migrateDossierBtn.disabled = true;
    els.migrateDossierBtn.textContent = "Processando...";
    
    try {
        const vendasSnap = await get(ref(db, 'vendas'));
        if (!vendasSnap.exists()) throw new Error("Nenhuma venda antiga encontrada.");
        
        const vendas = vendasSnap.val();
        let count = 0;
        
        for (const key in vendas) {
            const v = vendas[key];
            let orgName = v.organizacao || 'Outros';
            if (orgName.toLowerCase().includes('hells')) orgName = 'Hells Angels';
            
            const pessoaRef = push(ref(db, `dossies/${orgName}`));
            await set(pessoaRef, {
                nome: v.cliente || 'Desconhecido',
                numero: v.telefone || '',
                cargo: 'Importado Venda',
                fotoUrl: '',
                veiculos: {},
                migradoEm: Date.now()
            });
            count++;
        }
        showToast(`${count} registros migrados com sucesso!`, "success");
    } catch (e) {
        showToast(`Erro na migração: ${e.message}`, "error");
    } finally {
        els.migrateDossierBtn.textContent = "Migração Concluída";
    }
};