import { auth, db } from './config.js';
import { els } from './dom.js';
import * as Utils from './utils.js';
import * as Calculator from './calculator.js';
import * as Dossier from './dossier.js';
import * as Admin from './admin.js';

import { 
    onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
    ref, push, onValue, remove, get, set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- Variáveis de Estado ---
let currentUser = null;
let currentUserData = null;
let vendas = [];

// =============================================
// 1. INICIALIZAÇÃO E TEMA
// =============================================

const updateLogoAndThemeButton = (isDark) => {
    const logoSrc = isDark ? 'logo-light.png' : 'logo-dark.png';
    els.appLogo.src = logoSrc;
    els.historyImg.src = logoSrc;
    els.welcomeLogo.src = logoSrc;
    els.themeBtn.textContent = isDark ? '☀️ Modo Claro' : '🌙 Modo Noturno';
};

const toggleTheme = () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateLogoAndThemeButton(isDark);
};

// Carregar tema salvo na inicialização
const savedTheme = localStorage.getItem('theme') || 'light';
if(savedTheme === 'dark') document.body.classList.add('dark');
updateLogoAndThemeButton(savedTheme === 'dark');

// Lógica de Welcome Screen
if (localStorage.getItem('hasVisited')) {
    els.welcomeScreen.style.display = 'none';
    els.authScreen.style.display = 'block'; 
} else {
    els.welcomeScreen.classList.add('show');
}

els.enterBtn.onclick = () => {
    localStorage.setItem('hasVisited', 'true');
    els.welcomeScreen.classList.remove('show');
    setTimeout(() => {
        els.welcomeScreen.style.display = 'none';
        els.authScreen.style.display = 'block';
    }, 500);
};

// =============================================
// 2. AUTENTICAÇÃO E PERMISSÕES
// =============================================

els.loginBtn.onclick = () => {
    // Tenta usar o valor do input como email@hells.com por padrão, ou usa o que foi digitado se contiver @
    const usernameInput = els.username.value.trim();
    const email = usernameInput.includes('@') ? usernameInput : (usernameInput + "@hells.com");
    const password = els.password.value;
    
    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => {
            els.authMessage.textContent = "Erro: " + error.message;
        });
};

els.registerUserBtn.onclick = () => {
    const email = prompt("Digite seu EMAIL real para cadastro:");
    const password = prompt("Crie uma senha (min 6 caracteres):");
    const username = prompt("Seu nome de usuário (Apelido na cidade):");

    if (email && password && username) {
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                updateProfile(userCredential.user, { displayName: username });
                // Criar o registro inicial no Realtime Database com permissão básica
                set(ref(db, `users/${userCredential.user.uid}`), {
                    email: email,
                    username: username,
                    tag: 'VISITANTE'
                });
                Utils.showToast("Conta criada! Faça login.", "success");
            })
            .catch((error) => Utils.showToast("Erro ao criar: " + error.message, "error"));
    }
};

els.logoutBtn.onclick = () => signOut(auth);

els.forgotPasswordLink.onclick = () => {
    const email = prompt("Digite seu email para redefinir a senha:");
    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => Utils.showToast("Email de redefinição enviado!", "success"))
            .catch((error) => Utils.showToast("Erro: " + error.message, "error"));
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        // Listener em tempo real da permissão e dados do usuário
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snap) => {
            const data = snap.val() || {};
            // Garante que o registro existe e tem uma tag
            if(!snap.exists()) {
                 set(userRef, { email: user.email, username: user.displayName, tag: 'VISITANTE' });
                 return;
            }
            const tag = data.tag || 'VISITANTE';
            
            currentUserData = { ...data, tag };
            
            // Passar permissões para os módulos
            Dossier.setUserTag(tag);
            Admin.setAdminContext(tag, user.email);
            
            // Atualizar UI Baseada na Tag
            els.userStatus.textContent = `${user.displayName || 'Usuário'} [${tag}]`;
            els.userStatus.style.display = 'inline-block';
            
            const isAdminOrHells = tag === 'ADMIN' || tag === 'HELLS';
            const isAdmin = tag === 'ADMIN';
            
            els.investigacaoBtn.style.display = isAdminOrHells ? 'inline-block' : 'none';
            els.adminPanelBtn.style.display = isAdmin ? 'inline-block' : 'none';
            
            if (isAdmin) {
                Admin.initUserListListener();
                Admin.initOnlineCountListener();
            }
            // Inicializar listeners de Admin settings para todos
            Admin.initGlobalSettingsListeners();
        });

        // Monitoramento de Online
        Admin.updateOnlineStatus(user);

        // Mostrar Tela Principal
        els.authScreen.style.display = 'none';
        els.mainCard.style.display = 'block';
        Utils.showToast(`Bem-vindo, ${user.displayName || 'Membro'}!`, 'success');
        
        loadSalesHistory();

    } else {
        // Logout
        currentUser = null;
        currentUserData = null;
        els.authScreen.style.display = 'block';
        els.mainCard.style.display = 'none';
        els.historyCard.style.display = 'none';
        els.dossierCard.style.display = 'none';
        els.adminPanel.style.display = 'none';
        if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
        if(els.userStatus) els.userStatus.style.display = 'none';
    }
});

// =============================================
// 3. LÓGICA DE VENDAS E CALCULADORA
// =============================================

els.calcBtn.onclick = Calculator.calculate;

els.resetBtn.onclick = () => {
    ['qtyTickets', 'qtyTablets', 'qtyNitro', 'nomeCliente', 'organizacao', 'telefone', 'carroVeiculo', 'placaVeiculo', 'negociadoras', 'vendaValorObs'].forEach(id => els[id].value = '');
    els.dataVenda.value = '';
    els.results.style.display = 'none';
    Utils.showToast("Campos limpos.");
};

els.registerBtn.onclick = () => {
    if (!currentUser) return Utils.showToast("Faça login para registrar vendas.", "error");

    const result = Calculator.calculate(); 
    
    if (!result.hasQuantities && els.vendaValorObs.value.trim() === '') {
        return Utils.showToast("Preencha quantidades ou o cargo/obs para registrar.", "error");
    }
    if (!els.nomeCliente.value || !els.organizacao.value) {
        return Utils.showToast("Nome e Organização são obrigatórios.", "error");
    }

    const vendaData = {
        cliente: els.nomeCliente.value.trim(),
        organizacao: els.organizacao.value.trim(),
        tipoOrganizacao: els.organizacaoTipo.value,
        telefone: els.telefone.value.trim(),
        veiculos: {
            carros: els.carroVeiculo.value,
            placas: els.placaVeiculo.value
        },
        negociadoras: els.negociadoras.value.trim(),
        obs: els.vendaValorObs.value.trim(),
        produtos: {
            tickets: result.qtyTickets,
            tablets: result.qtyTablets,
            nitro: result.qtyNitro
        },
        valorTotal: result.totalValue,
        tipoValor: Calculator.valorDescricao[result.tipoValor],
        data: new Date().toLocaleString('pt-BR'),
        timestamp: Date.now(),
        registradoPor: currentUser.displayName || 'Anônimo',
        registradoPorUid: currentUser.uid
    };

    push(ref(db, 'vendas'), vendaData)
        .then(() => {
            Utils.showToast("Venda registrada com sucesso!", "success");
            els.resetBtn.click();
        })
        .catch((error) => Utils.showToast("Erro ao registrar: " + error.message, "error"));
};

// --- Histórico ---
const loadSalesHistory = () => {
    const vendasRef = ref(db, 'vendas');
    onValue(vendasRef, (snapshot) => {
        els.salesHistory.innerHTML = '';
        vendas = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                vendas.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            vendas.sort((a, b) => b.timestamp - a.timestamp);
            renderHistory(vendas);
        } else {
            els.salesHistory.innerHTML = '<tr><td colspan="9">Nenhuma venda registrada.</td></tr>';
        }
    });
};

const renderHistory = (listaVendas) => {
    els.salesHistory.innerHTML = '';
    listaVendas.forEach(venda => {
        const row = document.createElement('tr');
        const prods = [];
        if(venda.produtos?.tickets) prods.push(`Tickets: ${venda.produtos.tickets}`);
        if(venda.produtos?.tablets) prods.push(`Tablets: ${venda.produtos.tablets}`);
        if(venda.produtos?.nitro) prods.push(`Nitro: ${venda.produtos.nitro}`);
        const prodString = prods.join('<br>') || '-';

        row.innerHTML = `
            <td>${venda.data}</td>
            <td>${venda.cliente}</td>
            <td>${venda.organizacao} (${venda.tipoOrganizacao || '-'})</td>
            <td>${Utils.phoneMask(venda.telefone || '')}</td>
            <td>${prodString}</td>
            <td>${Utils.formatCurrency(venda.valorTotal)}<br><small>${venda.tipoValor}</small></td>
            <td>${venda.negociadoras || '-'}</td>
            <td>${venda.registradoPor || 'Anônimo'}</td>
            <td>
                <button class="danger action-btn delete-venda" data-id="${venda.id}">X</button>
            </td>
        `;
        
        row.querySelector('.delete-venda').onclick = () => {
            if(currentUserData?.tag === 'ADMIN' || currentUserData?.tag === 'HELLS') {
                if(confirm("Excluir este registro permanentemente?")) {
                    remove(ref(db, `vendas/${venda.id}`));
                }
            } else {
                Utils.showToast("Você não tem permissão para excluir.", "error");
            }
        };

        els.salesHistory.appendChild(row);
    });
};

els.filtroHistorico.oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = vendas.filter(v => 
        v.cliente.toLowerCase().includes(term) || 
        v.organizacao.toLowerCase().includes(term) ||
        (v.registradoPor || '').toLowerCase().includes(term)
    );
    renderHistory(filtered);
};

// =============================================
// 4. NAVEGAÇÃO E EVENTOS GERAIS
// =============================================

const switchView = (viewId) => {
    els.mainCard.style.display = 'none';
    els.historyCard.style.display = 'none';
    els.dossierCard.style.display = 'none';
    els.adminPanel.style.display = 'none';
    
    els[viewId].style.display = 'block';
    
    if (viewId === 'dossierCard') Dossier.showDossierOrgs();
};

els.toggleHistoryBtn.onclick = () => switchView('historyCard');
els.toggleCalcBtn.onclick = () => switchView('mainCard');
els.investigacaoBtn.onclick = () => switchView('dossierCard');
els.adminPanelBtn.onclick = () => switchView('adminPanel');
els.toggleCalcBtnAdmin.onclick = () => switchView('mainCard');
els.toggleCalcBtnDossier.onclick = () => switchView('mainCard');

// Botões do Dossiê (Conectando ao módulo)
els.addOrgBtn.onclick = Dossier.openAddOrgModal;
els.saveOrgBtn.onclick = Dossier.saveOrg;
els.deleteOrgBtn.onclick = Dossier.deleteOrg;
els.cancelOrgBtn.onclick = () => { els.orgModalOverlay.style.display = 'none'; els.orgModal.style.display = 'none'; };

els.addPessoaBtn.onclick = () => {
    const orgName = els.addPessoaBtn.dataset.orgName;
    if(orgName) Dossier.openAddDossierModal(orgName);
};
els.saveNewDossierBtn.onclick = Dossier.saveNewDossierEntry;
els.cancelNewDossierBtn.onclick = Dossier.closeAddDossierModal;

els.saveDossierBtn.onclick = Dossier.saveDossierChanges;
els.cancelDossierBtn.onclick = Dossier.closeEditDossierModal;

els.dossierVoltarBtn.onclick = Dossier.showDossierOrgs;
els.filtroDossierOrgs.oninput = Utils.debounce(Dossier.filterOrgs, 300); // Usa debounce para evitar spam
els.filtroDossierPeople.oninput = Utils.debounce(Dossier.filterPeople, 300);

// Implementação Debounce (Adicionado ao Utils.js que você tem)
// Nota: Se a função Utils.debounce não foi incluída em seu utils.js, 
// a linha acima pode falhar. Usando a função direta (sem debounce) temporariamente se necessário.
if (typeof Utils.debounce === 'undefined') {
    els.filtroDossierOrgs.oninput = Dossier.filterOrgs;
    els.filtroDossierPeople.oninput = Dossier.filterPeople;
}

// Eventos dos Modais de Veículos (Add & Edit)
els.addModalAddVeiculoBtn.onclick = (e) => { e.preventDefault(); Dossier.adicionarOuAtualizarVeiculoTemp('addModal'); };
els.addModalCancelVeiculoBtn.onclick = (e) => { e.preventDefault(); Dossier.cancelarEdicaoVeiculo('addModal'); };
els.addModalListaVeiculos.onclick = (e) => {
    if (e.target.classList.contains('edit-veiculo-btn')) Dossier.iniciarEdicaoVeiculo(e.target.dataset.key, 'addModal');
    if (e.target.classList.contains('remove-veiculo-btn')) Dossier.removerVeiculoTemp(e.target.dataset.key, els.addModalListaVeiculos);
};
els.editModalAddVeiculoBtn.onclick = (e) => { e.preventDefault(); Dossier.adicionarOuAtualizarVeiculoTemp('editModal'); };
els.editModalCancelVeiculoBtn.onclick = (e) => { e.preventDefault(); Dossier.cancelarEdicaoVeiculo('editModal'); };
els.editModalListaVeiculos.onclick = (e) => {
    if (e.target.classList.contains('edit-veiculo-btn')) Dossier.iniciarEdicaoVeiculo(e.target.dataset.key, 'editModal');
    if (e.target.classList.contains('remove-veiculo-btn')) Dossier.removerVeiculoTemp(e.target.dataset.key, els.editModalListaVeiculos);
};

// Lightbox Close
els.imageLightboxOverlay.onclick = Dossier.closeImageLightbox;

// Admin & Migração
Admin.saveGlobalSettings(); // Inicializa os ouvintes de input
els.migrateDossierBtn.onclick = Admin.migrateOldSalesToDossier;
els.migrateVeiculosBtn.onclick = () => Utils.showToast("Função de migração de veículos desativada para a versão modular.", "default");

// Theme & Extra
els.themeBtn.onclick = toggleTheme;
els.tutorialBtn.onclick = () => { alert("1. Preencha os dados da venda.\n2. Insira a quantidade de produtos.\n3. Clique em 'Calcular' para ver os materiais.\n4. Clique em 'Registrar Venda' para salvar no Histórico."); };
els.csvBtn.onclick = () => Utils.showToast("Exportar CSV: Em breve.", "default");
els.discordBtnCalc.onclick = () => {
    const result = Calculator.calculate();
    let message = `💰 *NOVA VENDA* (Por: ${currentUser?.displayName || 'Desconhecido'})\n`;
    message += `👤 Cliente: ${els.nomeCliente.value || 'N/A'}\n`;
    message += `🏦 Organização: ${els.organizacao.value || 'N/A'} (${els.organizacaoTipo.value})\n`;
    message += `💵 **Valor Total:** ${Utils.formatCurrency(result.totalValue)} (${Calculator.valorDescricao[els.tipoValor.value]})\n`;
    message += `\n📦 **Produtos:**\n`;
    if (result.qtyTickets > 0) message += `- ${result.qtyTickets} Tickets\n`;
    if (result.qtyTablets > 0) message += `- ${result.qtyTablets} Tablets\n`;
    if (result.qtyNitro > 0) message += `- ${result.qtyNitro} Nitro\n`;
    message += `\n📞 Telefone: ${els.telefone.value}\n`;
    message += `🚗 Veículos: ${els.carroVeiculo.value || 'N/A'}\n`;
    message += `📝 Cargo/Obs: ${els.vendaValorObs.value || 'N/A'}`;
    
    Utils.copyToClipboard(message);
};