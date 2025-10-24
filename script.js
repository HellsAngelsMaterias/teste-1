document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO INICIAL E FIREBASE (ASSUMA QUE ESTÁ INICIALIZADO FORA) ---

    // Os IDs dos elementos foram ajustados para refletir a estrutura HTML fornecida.
    const els = {
        authScreen: document.getElementById('authScreen'),
        mainCard: document.getElementById('mainCard'),
        historyCard: document.getElementById('historyCard'),
        adminPanel: document.getElementById('adminPanel'),
        dossierCard: document.getElementById('dossierCard'),
        welcomeScreen: document.getElementById('welcomeScreen'),

        // Elementos de Login/Autenticação
        username: document.getElementById('username'),
        password: document.getElementById('password'),
        loginBtn: document.getElementById('loginBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        registerUserBtn: document.getElementById('registerUserBtn'),
        authMessage: document.getElementById('authMessage'),
        forgotPasswordLink: document.getElementById('forgotPasswordLink'),
        enterBtn: document.getElementById('enterBtn'),
        
        // Controles Superiores
        themeBtn: document.getElementById('themeBtn'),
        tutorialBtn: document.getElementById('tutorialBtn'),
        investigacaoBtn: document.getElementById('investigacaoBtn'),
        userStatus: document.getElementById('userStatus'),
        
        // Calculadora
        nomeCliente: document.getElementById('nomeCliente'),
        organizacao: document.getElementById('organizacao'),
        organizacaoTipo: document.getElementById('organizacaoTipo'),
        telefone: document.getElementById('telefone'),
        negociadoras: document.getElementById('negociadoras'),
        carroVeiculo: document.getElementById('carroVeiculo'),
        placaVeiculo: document.getElementById('placaVeiculo'),
        vendaValorObs: document.getElementById('vendaValorObs'),
        qtyTickets: document.getElementById('qtyTickets'),
        qtyTablets: document.getElementById('qtyTablets'),
        qtyNitro: document.getElementById('qtyNitro'),
        tipoValor: document.getElementById('tipoValor'),
        calcBtn: document.getElementById('calcBtn'),
        resetBtn: document.getElementById('resetBtn'),
        registerBtn: document.getElementById('registerBtn'),
        resultsContainer: document.getElementById('resultsContainer'),
        results: document.getElementById('results'),
        resultsBody: document.getElementById('resultsBody'),
        valuesBody: document.getElementById('valuesBody'),
        valorTotalGeral: document.getElementById('valorTotalGeral'),
        dataVenda: document.getElementById('dataVenda'),
        
        // Histórico
        toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
        toggleCalcBtn: document.getElementById('toggleCalcBtn'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        salesHistory: document.getElementById('salesHistory'),
        filtroHistorico: document.getElementById('filtroHistorico'),
        historyBackground: document.getElementById('historyBackground'),
        
        // Admin
        adminPanelBtn: document.getElementById('adminPanelBtn'),
        toggleCalcBtnAdmin: document.getElementById('toggleCalcBtnAdmin'),
        onlineUsersCount: document.getElementById('onlineUsersCount'),
        adminUserListBody: document.getElementById('adminUserListBody'),
        layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
        layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
        bottomPanelText: document.getElementById('bottomPanelText'),
        saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
        bottomPanelDisplay: document.getElementById('bottomPanelDisplay'),
        bottomPanel: document.getElementById('bottomPanel'),
        
        // Dossiê
        toggleCalcBtnDossier: document.getElementById('toggleCalcBtnDossier'),
        dossierPeopleContainer: document.getElementById('dossierPeopleContainer'),
        dossierOrgContainer: document.getElementById('dossierOrgContainer'),
        dossierOrgGrid: document.getElementById('dossierOrgGrid'),
        dossierPeopleGrid: document.getElementById('dossierPeopleGrid'),
        addOrgBtn: document.getElementById('addOrgBtn'),
        addPessoaBtn: document.getElementById('addPessoaBtn'),
        dossierVoltarBtn: document.getElementById('dossierVoltarBtn'),
        filtroDossierOrgs: document.getElementById('filtroDossierOrgs'),
        filtroDossierPeople: document.getElementById('filtroDossierPeople'),
        dossierPeopleTitle: document.getElementById('dossierPeopleTitle'),
        
        // Modal de Edição (Dossiê)
        editDossierModal: document.getElementById('editDossierModal'),
        editDossierOverlay: document.getElementById('editDossierOverlay'),
        editDossierId: document.getElementById('editDossierId'),
        editDossierOrg: document.getElementById('editDossierOrg'),
        editDossierNome: document.getElementById('editDossierNome'),
        editDossierNumero: document.getElementById('editDossierNumero'),
        editDossierCargo: document.getElementById('editDossierCargo'),
        editDossierFotoUrl: document.getElementById('editDossierFotoUrl'),
        editDossierInstagram: document.getElementById('editDossierInstagram'),
        editVeiculoNome: document.getElementById('editVeiculoNome'),
        editVeiculoPlaca: document.getElementById('editVeiculoPlaca'),
        addVeiculoBtnModal: document.getElementById('addVeiculoBtnModal'),
        editModalListaVeiculos: document.getElementById('editModalListaVeiculos'),
        editDossierObservacoes: document.getElementById('editDossierObservacoes'),
        saveDossierBtn: document.getElementById('saveDossierBtn'),
        deleteDossierBtn: document.getElementById('deleteDossierBtn'),
        cancelDossierBtn: document.getElementById('cancelDossierBtn'),
        
        // Ações de Migração Admin
        migrateDossierBtn: document.getElementById('migrateDossierBtn'),
        migrateVeiculosBtn: document.getElementById('migrateVeiculosBtn'),
        
        // Exportação e Discord
        csvBtn: document.getElementById('csvBtn'),
        discordBtnCalc: document.getElementById('discordBtnCalc'),
        
        // Layout
        appLogo: document.getElementById('appLogo')
    };
    
    // Assumindo que este código utiliza Firebase
    const firebaseConfig = {
        // [SUAS CHAVES DE CONFIGURAÇÃO]
    };
    // O Firebase deve ser inicializado antes.
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- VARIÁVEIS GLOBAIS ---
    let currentUser = null;
    let currentUserData = null;
    let vendasListener = null;
    let vendas = [];
    let dossierListener = null;
    let currentDossierOrgId = null;
    let dossierEntries = [];
    let currentDossierEntry = null;
    let currentDossierVehicles = []; // Usado para gerenciar veículos no modal
    
    // Variáveis de Edição (para desfazer em caso de erro)
    let vendaOriginalCliente = null;
    let vendaOriginalOrganizacao = null;

    // --- DADOS DA APLICAÇÃO ---
    const valoresProdutos = {
        tickets: {
            limpo: 40000000,
            sujo: 30000000,
            limpo_alianca: 20000000,
            sujo_alianca: 15000000
        },
        tablets: {
            limpo: 15000000,
            sujo: 10000000,
            limpo_alianca: 7500000,
            sujo_alianca: 5000000
        },
        nitro: {
            limpo: 500000,
            sujo: 300000,
            limpo_alianca: 250000,
            sujo_alianca: 150000
        }
    };

    const materiaisProdutos = {
        tickets: {
            "Metal": 20, "Plástico": 30, "Químico": 15
        },
        tablets: {
            "Metal": 10, "Plástico": 20, "Químico": 10
        },
        nitro: {
            "Metal": 1, "Plástico": 1, "Químico": 1
        }
    };

    const tagsPermissoes = {
        admin: 'Admin',
        hells: 'Hells',
        visitante: 'Visitante'
    };

    // --- UTILIDADES ---

    /**
     * Exibe uma mensagem flutuante (Toast).
     * @param {string} message A mensagem a ser exibida.
     * @param {string} type 'success', 'error' ou 'default'.
     */
    function showToast(message, type = 'default') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Força a reflow para iniciar a transição
        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide'); // Adiciona uma classe para animar o fade out (se o CSS tiver)
            setTimeout(() => {
                toast.remove();
            }, 300); // Remove depois que a transição de fade out terminar
        }, 3000);
    }

    /**
     * Formata um número para moeda BRL.
     * @param {number} value O valor numérico.
     * @returns {string} O valor formatado.
     */
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0
        }).format(value);
    }
    
    /**
     * Valida se um elemento de entrada está vazio.
     * @param {HTMLElement} element O elemento de input.
     * @returns {boolean} True se for válido, false se estiver vazio.
     */
    function validateField(element) {
        if (!element.value.trim()) {
            element.classList.add('input-invalido');
            return false;
        }
        element.classList.remove('input-invalido');
        return true;
    }

    /**
     * Atualiza o visual do botão de tema e o logo.
     * @param {boolean} isDark True se o modo escuro estiver ativo.
     */
    function updateLogoAndThemeButton(isDark) {
        if (isDark) {
            document.body.classList.add('dark');
            els.themeBtn.textContent = '☀️ Modo Diurno';
            els.appLogo.src = 'logo-light.png'; // Assumindo que você tem um logo-light.png
        } else {
            document.body.classList.remove('dark');
            els.themeBtn.textContent = '🌙 Modo Noturno';
            els.appLogo.src = 'logo-dark.png';
        }
    }

    // --- FUNÇÕES DE CÁLCULO E REGISTRO ---

    function calculateMaterialsAndValues() {
        const qtyTickets = parseInt(els.qtyTickets.value) || 0;
        const qtyTablets = parseInt(els.qtyTablets.value) || 0;
        const qtyNitro = parseInt(els.qtyNitro.value) || 0;
        const tipoValor = els.tipoValor.value;
        
        let totalMaterials = {};
        let totalValue = 0;

        // Cálculo de Materiais
        if (qtyTickets > 0) {
            for (const material in materiaisProdutos.tickets) {
                totalMaterials[material] = (totalMaterials[material] || 0) + (materiaisProdutos.tickets[material] * qtyTickets);
            }
        }
        if (qtyTablets > 0) {
            for (const material in materiaisProdutos.tablets) {
                totalMaterials[material] = (totalMaterials[material] || 0) + (materiaisProdutos.tablets[material] * qtyTablets);
            }
        }
        if (qtyNitro > 0) {
            for (const material in materiaisProdutos.nitro) {
                totalMaterials[material] = (totalMaterials[material] || 0) + (materiaisProdutos.nitro[material] * qtyNitro);
            }
        }

        // Cálculo de Valores
        const valueTickets = valoresProdutos.tickets[tipoValor] * qtyTickets;
        const valueTablets = valoresProdutos.tablets[tipoValor] * qtyTablets;
        const valueNitro = valoresProdutos.nitro[tipoValor] * qtyNitro;
        
        totalValue = valueTickets + valueTablets + valueNitro;

        // Atualiza a interface
        renderResults(totalMaterials, valueTickets, valueTablets, valueNitro, totalValue);
        
        return {
            totalMaterials,
            valueTickets,
            valueTablets,
            valueNitro,
            totalValue,
            qtyTickets,
            qtyTablets,
            qtyNitro,
            tipoValor
        };
    }

    function renderResults(materials, valTickets, valTablets, valNitro, totalValue) {
        els.resultsBody.innerHTML = '';
        els.valuesBody.innerHTML = '';
        
        let hasMaterials = false;
        for (const material in materials) {
            if (materials[material] > 0) {
                hasMaterials = true;
                const row = `<tr><td>${material}</td><td>${materials[material]}x</td></tr>`;
                els.resultsBody.innerHTML += row;
            }
        }

        let hasValues = false;
        if (valTickets > 0) {
            hasValues = true;
            els.valuesBody.innerHTML += `<tr><td>Tickets (${els.qtyTickets.value})</td><td>${formatCurrency(valTickets)}</td></tr>`;
        }
        if (valTablets > 0) {
            hasValues = true;
            els.valuesBody.innerHTML += `<tr><td>Tablets (${els.qtyTablets.value})</td><td>${formatCurrency(valTablets)}</td></tr>`;
        }
        if (valNitro > 0) {
            hasValues = true;
            els.valuesBody.innerHTML += `<tr><td>Nitro (${els.qtyNitro.value})</td><td>${formatCurrency(valNitro)}</td></tr>`;
        }
        
        if (hasMaterials || hasValues) {
            els.results.style.display = 'block';
            els.valorTotalGeral.textContent = formatCurrency(totalValue);
        } else {
            els.results.style.display = 'none';
            els.valorTotalGeral.textContent = formatCurrency(0);
        }
        
        // Ativa o botão Registrar se houver valor
        els.registerBtn.disabled = totalValue === 0;
        if (totalValue > 0) {
             els.registerBtn.classList.add('primary');
             els.registerBtn.classList.remove('success');
             els.registerBtn.style.animation = 'pulse-glow 2s infinite ease-in-out';
        } else {
             els.registerBtn.classList.add('success');
             els.registerBtn.classList.remove('primary');
             els.registerBtn.style.animation = 'none';
        }
        
        // Atualiza a hora da venda
        els.dataVenda.value = new Date().toLocaleString('pt-BR');
    }

    /**
     * Salva o registro de venda no Firestore.
     * @param {object} data Os dados do cálculo da venda.
     * @param {string} editId ID da venda para edição (se for o caso).
     */
    async function registerSale(data, editId = null) {
        if (!currentUser || currentUserData.tag === tagsPermissoes.visitante) {
            showToast('Você não tem permissão para registrar vendas.', 'error');
            return;
        }

        // Validação obrigatória
        if (!validateField(els.nomeCliente) || !validateField(els.organizacao)) {
            showToast('Preencha o Nome e a Organização.', 'error');
            return;
        }
        
        const saleData = {
            cliente: els.nomeCliente.value.trim(),
            organizacao: els.organizacao.value.trim(),
            organizacaoTipo: els.organizacaoTipo.value,
            telefone: els.telefone.value.trim(),
            negociadoras: els.negociadoras.value.trim(),
            carroVeiculo: els.carroVeiculo.value.trim(),
            placaVeiculo: els.placaVeiculo.value.trim().toUpperCase(),
            cargo: els.vendaValorObs.value.trim(),
            
            // Dados de Venda
            qtyTickets: data.qtyTickets,
            qtyTablets: data.qtyTablets,
            qtyNitro: data.qtyNitro,
            tipoValor: data.tipoValor,
            valorTotal: data.totalValue,
            materiais: data.totalMaterials,

            registradoPor: currentUserData.nome || 'Desconhecido',
            registradoPorId: currentUser.uid,
            dataRegistro: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (editId) {
                // Edição
                await db.collection('vendas').doc(editId).update(saleData);
                showToast('Venda editada com sucesso!', 'success');
                // Após a edição, volte ao histórico
                els.toggleHistoryBtn.click();
            } else {
                // Novo Registro
                await db.collection('vendas').add(saleData);
                showToast('Venda registrada com sucesso!', 'success');
            }
            
            // Limpa após o registro/edição
            resetFields(false);
            
            // Tenta adicionar a organização à lista de sugestões (se não existir)
            addOrganizacaoSuggestion(saleData.organizacao);

        } catch (error) {
            console.error("Erro ao registrar/editar venda: ", error);
            showToast('Erro ao salvar venda. Tente novamente.', 'error');
        }
    }

    function resetFields(fullReset = true) {
        els.nomeCliente.value = '';
        els.organizacao.value = '';
        els.organizacaoTipo.value = 'CNPJ';
        els.telefone.value = '';
        els.negociadoras.value = '';
        els.carroVeiculo.value = '';
        els.placaVeiculo.value = '';
        els.vendaValorObs.value = '';
        
        // Limpar campos de cálculo apenas no reset completo
        if (fullReset) {
            els.qtyTickets.value = '';
            els.qtyTablets.value = '';
            els.qtyNitro.value = '';
            els.tipoValor.value = 'limpo';
        }
        
        // Limpa resultados e desativa botão
        renderResults({}, 0, 0, 0, 0); 
        
        // Remove classes de erro
        [els.nomeCliente, els.organizacao].forEach(el => el.classList.remove('input-invalido'));
        
        // Limpa variáveis de edição
        vendaOriginalCliente = null;
        vendaOriginalOrganizacao = null;
    }
    
    /**
     * Adiciona uma nova organização à datalist se ela não existir.
     * @param {string} orgName O nome da organização.
     */
    function addOrganizacaoSuggestion(orgName) {
        const datalist = document.getElementById('sugestoesOrganizacao');
        const options = datalist.querySelectorAll('option');
        let exists = false;
        
        options.forEach(option => {
            if (option.value.toLowerCase() === orgName.toLowerCase()) {
                exists = true;
            }
        });
        
        if (!exists) {
            const newOption = document.createElement('option');
            newOption.value = orgName;
            datalist.appendChild(newOption);
        }
    }

    // --- FUNÇÕES DE HISTÓRICO ---

    /**
     * Formata os detalhes de materiais e produtos.
     * @param {object} sale Os dados da venda.
     * @returns {string} HTML formatado.
     */
    function formatProductDetails(sale) {
        let details = [];
        if (sale.qtyTickets > 0) details.push(`Tickets: ${sale.qtyTickets}x`);
        if (sale.qtyTablets > 0) details.push(`Tablets: ${sale.qtyTablets}x`);
        if (sale.qtyNitro > 0) details.push(`Nitro: ${sale.qtyNitro}x`);
        
        let materialsList = [];
        if (sale.materiais) {
            for (const mat in sale.materiais) {
                if (sale.materiais[mat] > 0) {
                    materialsList.push(`${mat}: ${sale.materiais[mat]}x`);
                }
            }
        }
        
        return `<span style="font-weight: 600;">Produtos:</span> ${details.join(' | ')}<br>` +
               `<span style="font-weight: 600;">Materiais:</span> ${materialsList.join(' | ')}`;
    }

    /**
     * Renderiza a lista de vendas na tabela do histórico.
     * @param {Array<object>} sales A lista de vendas.
     */
    function renderHistory(sales) {
        els.salesHistory.innerHTML = '';
        
        if (sales.length === 0) {
            els.salesHistory.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 15px;">Nenhuma venda encontrada.</td></tr>`;
            return;
        }

        sales.forEach(sale => {
            const date = sale.dataRegistro ? sale.dataRegistro.toDate().toLocaleString('pt-BR') : 'Data Indisponível';
            const [data, hora] = date.split(', ');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="history-datetime-line">${data}</span>
                    <span class="history-datetime-line">${hora}</span>
                </td>
                <td>${sale.cliente || 'N/A'}</td>
                <td>
                    <span style="font-weight: 600;">${sale.organizacao || 'N/A'}</span>
                    <br><span style="font-size: 11px; opacity: 0.7;">(${sale.organizacaoTipo || 'N/A'})</span>
                </td>
                <td>${sale.telefone || 'N/A'}</td>
                <td>${formatProductDetails(sale)}</td>
                <td class="valor-total-cell">
                    <span>${formatCurrency(sale.valorTotal || 0)}</span>
                    <br><span class="valor-obs-text">(${sale.tipoValor ? sale.tipoValor.replace('_', ' ').toUpperCase() : 'N/A'})</span>
                </td>
                <td>${sale.negociadoras || 'N/A'}</td>
                <td>${sale.registradoPor || 'N/A'}</td>
                <td class="history-actions-cell">
                    <button class="muted action-btn" data-id="${sale.id}" data-action="edit">Editar</button>
                    ${currentUserData.tag === tagsPermissoes.admin || currentUser.uid === sale.registradoPorId ? 
                        `<button class="danger action-btn" data-id="${sale.id}" data-action="delete">Excluir</button>` : ''}
                </td>
            `;
            els.salesHistory.appendChild(row);
        });
        
        // Adiciona listeners para os botões de ação (Editar/Excluir)
        els.salesHistory.querySelectorAll('button[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const action = e.target.dataset.action;
                const sale = vendas.find(v => v.id === id);
                
                if (action === 'edit') {
                    startEditSale(sale);
                } else if (action === 'delete') {
                    if (confirm(`Tem certeza que deseja excluir a venda de ${sale.cliente} (${sale.organizacao})?`)) {
                        deleteSale(id);
                    }
                }
            });
        });
    }

    /**
     * Inicia a edição de uma venda.
     * @param {object} sale Os dados da venda a ser editada.
     */
    function startEditSale(sale) {
        // Guarda os originais para o log, se necessário.
        vendaOriginalCliente = sale.cliente;
        vendaOriginalOrganizacao = sale.organizacao;
        
        // 1. Preenche a calculadora
        els.nomeCliente.value = sale.cliente || '';
        els.organizacao.value = sale.organizacao || '';
        els.organizacaoTipo.value = sale.organizacaoTipo || 'CNPJ';
        els.telefone.value = sale.telefone || '';
        els.negociadoras.value = sale.negociadoras || '';
        els.carroVeiculo.value = sale.carroVeiculo || '';
        els.placaVeiculo.value = sale.placaVeiculo || '';
        els.vendaValorObs.value = sale.cargo || '';
        
        els.qtyTickets.value = sale.qtyTickets || '';
        els.qtyTablets.value = sale.qtyTablets || '';
        els.qtyNitro.value = sale.qtyNitro || '';
        els.tipoValor.value = sale.tipoValor || 'limpo';
        
        // 2. Recalcula para atualizar os campos de resultado
        calculateMaterialsAndValues();
        
        // 3. Atualiza os botões
        els.registerBtn.textContent = 'Salvar Edição';
        els.registerBtn.classList.remove('success');
        els.registerBtn.classList.add('primary');
        els.registerBtn.dataset.editId = sale.id; // Guarda o ID para o registro
        
        els.resetBtn.textContent = 'Cancelar Edição';
        els.resetBtn.classList.remove('muted');
        els.resetBtn.classList.add('danger');
        
        // 4. Muda a visualização
        els.mainTitle.textContent = 'Editando Registro de Venda';
        els.toggleHistoryBtn.click(); // Volta para a tela principal
    }

    /**
     * Cancela a edição de uma venda.
     */
    function cancelEdit() {
        resetFields(true);
        els.registerBtn.textContent = 'Registrar Venda';
        els.registerBtn.classList.add('success');
        els.registerBtn.classList.remove('primary');
        delete els.registerBtn.dataset.editId;
        
        els.resetBtn.textContent = 'Limpar Campos';
        els.resetBtn.classList.add('muted');
        els.resetBtn.classList.remove('danger');
        
        els.mainTitle.textContent = 'Calculadora e Registro de Vendas';
    }

    /**
     * Exclui um registro de venda do Firestore.
     * @param {string} id O ID do documento.
     */
    async function deleteSale(id) {
        if (!currentUser || (currentUserData.tag !== tagsPermissoes.admin && vendas.find(v => v.id === id).registradoPorId !== currentUser.uid)) {
            showToast('Você não tem permissão para excluir esta venda.', 'error');
            return;
        }
        
        try {
            await db.collection('vendas').doc(id).delete();
            showToast('Venda excluída com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao excluir venda: ", error);
            showToast('Erro ao excluir venda. Tente novamente.', 'error');
        }
    }

    // --- FUNÇÕES DE ADMIN ---

    /**
     * Renderiza a lista de usuários no painel de administração.
     * @param {Array<object>} users A lista de usuários com dados.
     */
    async function renderAdminUserList(users) {
        els.adminUserListBody.innerHTML = '';
        
        if (users.length === 0) {
            els.adminUserListBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 15px;">Nenhum usuário encontrado.</td></tr>`;
            return;
        }

        const tags = Object.values(tagsPermissoes);
        
        users.forEach(user => {
            const isSelf = user.uid === currentUser.uid;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.nome || 'N/A'}</td>
                <td>
                    <select class="user-tag-select" data-uid="${user.uid}" ${isSelf ? 'disabled' : ''}>
                        ${tags.map(tag => `<option value="${tag}" ${user.tag === tag ? 'selected' : ''}>${tag}</option>`).join('')}
                    </select>
                </td>
                <td>
                    ${isSelf ? '<span style="font-size:12px; color: #888;">Você</span>' : 
                               `<button class="primary action-btn save-tag-btn" data-uid="${user.uid}">Salvar</button>`}
                </td>
            `;
            els.adminUserListBody.appendChild(row);
        });
        
        // Adiciona listeners para os botões Salvar
        els.adminUserListBody.querySelectorAll('.save-tag-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const uid = e.target.dataset.uid;
                const select = els.adminUserListBody.querySelector(`.user-tag-select[data-uid="${uid}"]`);
                const newTag = select.value;
                
                if (confirm(`Tem certeza que deseja mudar a permissão do usuário para "${newTag}"?`)) {
                    try {
                        await db.collection('users').doc(uid).update({ tag: newTag });
                        showToast(`Permissão atualizada para ${newTag}.`, 'success');
                    } catch (error) {
                        console.error("Erro ao atualizar permissão: ", error);
                        showToast('Erro ao atualizar permissão.', 'error');
                    }
                }
            });
        });
    }

    /**
     * Sincroniza os controles de layout com o Firestore.
     */
    function syncLayoutControls() {
        if (currentUserData && currentUserData.tag === tagsPermissoes.admin) {
            db.collection('settings').doc('layout').onSnapshot(doc => {
                if (doc.exists) {
                    const settings = doc.data();
                    els.layoutToggleNightMode.checked = settings.enableDarkMode || false;
                    els.layoutToggleBottomPanel.checked = settings.enableBottomPanel || false;
                    els.bottomPanelText.value = settings.bottomPanelText || '';
                }
            }, error => {
                console.error("Erro ao sincronizar layout: ", error);
            });
        }
    }

    /**
     * Aplica as configurações de layout globalmente.
     * @param {object} settings As configurações de layout.
     */
    function applyGlobalLayoutSettings(settings) {
        if (settings.enableDarkMode) {
            // Se o admin habilitar, o botão do tema aparece.
            els.themeBtn.style.display = 'block';
        } else {
             // Se o admin desabilitar, esconde o botão, mas não força o tema light.
             // O usuário ainda pode ter o tema dark por local storage.
             els.themeBtn.style.display = 'none';
        }

        if (settings.enableBottomPanel) {
            els.bottomPanel.style.display = 'flex';
            els.bottomPanelDisplay.textContent = settings.bottomPanelText || 'Mensagem global ativada.';
        } else {
            els.bottomPanel.style.display = 'none';
        }
    }

    // --- FUNÇÕES DE DOSSIÊ (INVESTIGAÇÃO) ---

    /**
     * Alterna a visualização entre a Calculadora, Histórico, Admin e Dossiê.
     * @param {string} view 'calc', 'history', 'admin', 'dossier'
     */
    function toggleView(view) {
        // Oculta tudo
        [els.mainCard, els.historyCard, els.adminPanel, els.dossierCard].forEach(card => card.style.display = 'none');
        document.body.classList.remove('history-view-active', 'dossier-view-active');

        // Mostra o card correto
        if (view === 'calc') {
            els.mainCard.style.display = 'block';
            cancelEdit(); // Garante que a calculadora esteja em modo normal
        } else if (view === 'history') {
            els.historyCard.style.display = 'block';
            document.body.classList.add('history-view-active');
        } else if (view === 'admin' && currentUserData.tag === tagsPermissoes.admin) {
            els.adminPanel.style.display = 'block';
        } else if (view === 'dossier' && currentUserData.tag !== tagsPermissoes.visitante) {
            els.dossierCard.style.display = 'block';
            document.body.classList.add('dossier-view-active');
            renderDossierOrgs(dossierEntries);
        } else {
            // Se tentar acessar sem permissão, volta para a calculadora
            els.mainCard.style.display = 'block';
        }
        
        // Esconde sub-contêineres (pessoas vs. bases)
        els.dossierPeopleContainer.style.display = 'none';
        els.dossierOrgContainer.style.display = 'none';
        if (view === 'dossier') {
            if (currentDossierOrgId) {
                // Se um ID estiver setado, mostra a lista de pessoas
                els.dossierPeopleContainer.style.display = 'block';
            } else {
                // Se não, mostra a lista de bases
                els.dossierOrgContainer.style.display = 'block';
            }
        }
    }

    /**
     * Renderiza o grid de Bases (Organizações).
     * @param {Array<object>} entries A lista de bases.
     */
    function renderDossierOrgs(entries) {
        els.dossierOrgGrid.innerHTML = '';
        
        const orgs = entries.filter(e => e.type === 'org');
        
        if (orgs.length === 0) {
            els.dossierOrgGrid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1;">Nenhuma base cadastrada.</p>`;
            return;
        }

        orgs.forEach(org => {
            const card = document.createElement('div');
            card.className = 'dossier-org-card';
            card.dataset.id = org.id;
            card.dataset.type = 'org';
            
            card.innerHTML = `
                <div class="dossier-org-foto">
                    ${org.fotoUrl ? `<img src="${org.fotoUrl}" alt="Foto da Base">` : 'Sem Foto'}
                </div>
                <h4>${org.nome || 'Base Sem Nome'}</h4>
                <p>Membros: ${org.peopleCount || 0}</p>
                <div class="dossier-org-actions">
                    <button class="primary action-btn view-org-btn">Ver Membros</button>
                    <button class="muted action-btn edit-dossier-btn" data-id="${org.id}">Editar</button>
                </div>
            `;
            els.dossierOrgGrid.appendChild(card);
        });

        // Adiciona listeners
        els.dossierOrgGrid.querySelectorAll('.view-org-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const orgId = e.target.closest('.dossier-org-card').dataset.id;
                viewDossierPeople(orgId);
            });
        });
        
        els.dossierOrgGrid.querySelectorAll('.edit-dossier-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const orgId = e.target.dataset.id;
                showEditDossierModal(orgId);
            });
        });
    }
    
    /**
     * Renderiza o grid de Pessoas.
     * @param {Array<object>} people A lista de pessoas.
     */
    function renderDossierPeople(people) {
        els.dossierPeopleGrid.innerHTML = '';
        
        if (people.length === 0) {
            els.dossierPeopleGrid.innerHTML = `<p style="text-align: center; grid-column: 1 / -1;">Nenhuma pessoa cadastrada nesta base.</p>`;
            return;
        }

        people.forEach(person => {
            const card = document.createElement('div');
            card.className = 'dossier-entry-card';
            card.dataset.id = person.id;
            card.dataset.type = 'pessoa';
            
            const vehicles = (person.veiculos || []).map(v => `${v.nome} (${v.placa})`).join(' | ');

            card.innerHTML = `
                <div class="dossier-foto">
                    ${person.fotoUrl ? `<img src="${person.fotoUrl}" alt="Foto de ${person.nome}">` : 'Sem Foto'}
                </div>
                <h4>${person.nome || 'Pessoa Desconhecida'}</h4>
                <p>Cargo: ${person.cargo || 'N/A'}</p>
                <p>Veículos: ${vehicles || 'N/A'}</p>
                <div class="dossier-actions">
                    <button class="primary action-btn edit-dossier-btn" data-id="${person.id}">Editar</button>
                    <button class="muted action-btn move-dossier-btn" data-id="${person.id}">Mover</button>
                </div>
            `;
            els.dossierPeopleGrid.appendChild(card);
        });
        
        // Adiciona listeners
        els.dossierPeopleGrid.querySelectorAll('.edit-dossier-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const personId = e.target.dataset.id;
                showEditDossierModal(personId);
            });
        });
        
        // TODO: Implementar lógica de 'Mover'
    }
    
    /**
     * Altera a visualização para a lista de pessoas de uma Base.
     * @param {string} orgId ID da organização.
     */
    function viewDossierPeople(orgId) {
        currentDossierOrgId = orgId;
        
        // Filtra as pessoas da organização
        const orgPeople = dossierEntries.filter(e => e.orgId === orgId && e.type === 'pessoa');
        
        // Atualiza o título
        const org = dossierEntries.find(e => e.id === orgId && e.type === 'org');
        els.dossierPeopleTitle.textContent = `Membros de: ${org ? org.nome : 'Base Desconhecida'}`;

        renderDossierPeople(orgPeople);
        
        // Alterna a view
        els.dossierOrgContainer.style.display = 'none';
        els.dossierPeopleContainer.style.display = 'block';
        
        // Atualiza o botão Adicionar Pessoa
        els.addPessoaBtn.style.display = 'block';
    }
    
    /**
     * Retorna à visualização de Bases.
     */
    function returnToDossierOrgs() {
        currentDossierOrgId = null;
        els.dossierPeopleContainer.style.display = 'none';
        els.dossierOrgContainer.style.display = 'block';
        renderDossierOrgs(dossierEntries); // Rerenderiza as bases (útil para filtros)
    }

    // --- MODAL DE EDIÇÃO DOSSIÊ ---

    /**
     * Exibe o modal para adicionar/editar uma Base ou Pessoa.
     * @param {string} entryId ID da Base ou Pessoa (opcional para adicionar).
     */
    function showEditDossierModal(entryId = null) {
        currentDossierEntry = null;
        currentDossierVehicles = [];
        resetEditDossierModal();
        
        if (entryId) {
            // Modo Edição
            currentDossierEntry = dossierEntries.find(e => e.id === entryId);
            if (!currentDossierEntry) {
                showToast('Entrada não encontrada.', 'error');
                return;
            }
            
            // Preenche campos comuns
            els.editDossierId.value = currentDossierEntry.id;
            els.editDossierNome.value = currentDossierEntry.nome || '';
            els.editDossierObservacoes.value = currentDossierEntry.observacoes || '';
            els.editDossierFotoUrl.value = currentDossierEntry.fotoUrl || '';
            
            if (currentDossierEntry.type === 'org') {
                els.editDossierModal.querySelector('h2').textContent = 'Editar Base';
                // Oculta campos de Pessoa
                els.editDossierNumero.closest('div').style.display = 'none';
                els.editDossierCargo.closest('div').style.display = 'none';
                els.editDossierInstagram.closest('div').style.display = 'none';
                els.editVeiculoNome.closest('.grid').style.display = 'none';
                els.editModalListaVeiculos.closest('h4').style.display = 'none';
                els.deleteDossierBtn.style.display = 'block';
            } else if (currentDossierEntry.type === 'pessoa') {
                els.editDossierModal.querySelector('h2').textContent = 'Editar Pessoa';
                // Mostra campos de Pessoa
                els.editDossierNumero.closest('div').style.display = 'block';
                els.editDossierCargo.closest('div').style.display = 'block';
                els.editDossierInstagram.closest('div').style.display = 'block';
                els.editVeiculoNome.closest('.grid').style.display = 'grid';
                els.editModalListaVeiculos.closest('h4').style.display = 'block';
                els.deleteDossierBtn.style.display = 'block';

                // Preenche campos específicos de Pessoa
                els.editDossierNumero.value = currentDossierEntry.numero || '';
                els.editDossierCargo.value = currentDossierEntry.cargo || '';
                els.editDossierInstagram.value = currentDossierEntry.instagram || '';
                
                // Carrega veículos
                currentDossierVehicles = currentDossierEntry.veiculos || [];
            }
            
        } else {
            // Modo Adicionar
            if (currentDossierOrgId) {
                // Adicionar Pessoa
                els.editDossierModal.querySelector('h2').textContent = 'Adicionar Nova Pessoa';
                // Mostra campos de Pessoa
                els.editDossierNumero.closest('div').style.display = 'block';
                els.editDossierCargo.closest('div').style.display = 'block';
                els.editDossierInstagram.closest('div').style.display = 'block';
                els.editVeiculoNome.closest('.grid').style.display = 'grid';
                els.editModalListaVeiculos.closest('h4').style.display = 'block';
                els.editDossierOrg.value = currentDossierOrgId; // Seta o ID da base
            } else {
                // Adicionar Base
                els.editDossierModal.querySelector('h2').textContent = 'Adicionar Nova Base';
                // Oculta campos de Pessoa
                els.editDossierNumero.closest('div').style.display = 'none';
                els.editDossierCargo.closest('div').style.display = 'none';
                els.editDossierInstagram.closest('div').style.display = 'none';
                els.editVeiculoNome.closest('.grid').style.display = 'none';
                els.editModalListaVeiculos.closest('h4').style.display = 'none';
                els.editDossierOrg.value = '';
            }
            els.deleteDossierBtn.style.display = 'none';
        }
        
        renderModalVehicles();
        els.editDossierModal.style.display = 'block';
        els.editDossierOverlay.style.display = 'block';
    }
    
    /**
     * Reseta e esconde o modal de edição do Dossiê.
     */
    function hideEditDossierModal() {
        els.editDossierModal.style.display = 'none';
        els.editDossierOverlay.style.display = 'none';
        resetEditDossierModal();
    }
    
    /**
     * Limpa os campos do modal de edição.
     */
    function resetEditDossierModal() {
        els.editDossierId.value = '';
        els.editDossierOrg.value = '';
        els.editDossierNome.value = '';
        els.editDossierNumero.value = '';
        els.editDossierCargo.value = '';
        els.editDossierFotoUrl.value = '';
        els.editDossierInstagram.value = '';
        els.editVeiculoNome.value = '';
        els.editVeiculoPlaca.value = '';
        els.editDossierObservacoes.value = '';
        currentDossierVehicles = [];
        renderModalVehicles();
        
        // Reverte a visibilidade de volta ao padrão 'Pessoa' por segurança
        els.editDossierNumero.closest('div').style.display = 'block';
        els.editDossierCargo.closest('div').style.display = 'block';
        els.editDossierInstagram.closest('div').style.display = 'block';
        els.editVeiculoNome.closest('.grid').style.display = 'grid';
        els.editModalListaVeiculos.closest('h4').style.display = 'block';
    }

    /**
     * Renderiza a lista de veículos no modal de edição.
     */
    function renderModalVehicles() {
        els.editModalListaVeiculos.innerHTML = '';
        
        if (currentDossierVehicles.length === 0) {
            els.editModalListaVeiculos.innerHTML = `<p style="text-align: center; font-size: 13px; color: #888;">Nenhum veículo adicionado.</p>`;
            return;
        }

        currentDossierVehicles.forEach((v, index) => {
            const item = document.createElement('div');
            item.className = 'veiculo-item-modal';
            item.innerHTML = `
                <span>${v.nome} (${v.placa})</span>
                <div>
                    <button class="danger action-btn remove-veiculo-btn" data-index="${index}">X</button>
                </div>
            `;
            els.editModalListaVeiculos.appendChild(item);
        });
        
        // Adiciona listener para remover veículo
        els.editModalListaVeiculos.querySelectorAll('.remove-veiculo-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                removeVeiculoFromModal(index);
            });
        });
    }

    /**
     * Adiciona um veículo à lista temporária no modal.
     */
    function addVeiculoToModal() {
        const nome = els.editVeiculoNome.value.trim();
        const placa = els.editVeiculoPlaca.value.trim().toUpperCase();
        
        if (!nome || !placa) {
            showToast('Preencha o nome e a placa do veículo.', 'error');
            return;
        }
        
        currentDossierVehicles.push({ nome, placa });
        els.editVeiculoNome.value = '';
        els.editVeiculoPlaca.value = '';
        renderModalVehicles();
    }
    
    /**
     * Remove um veículo da lista temporária no modal.
     * @param {number} index O índice do veículo a ser removido.
     */
    function removeVeiculoFromModal(index) {
        currentDossierVehicles.splice(index, 1);
        renderModalVehicles();
    }
    
    /**
     * Salva as alterações do Dossiê (Base ou Pessoa) no Firestore.
     */
    async function saveDossierEntry() {
        const nome = els.editDossierNome.value.trim();
        const observacoes = els.editDossierObservacoes.value.trim();
        const fotoUrl = els.editDossierFotoUrl.value.trim();
        const entryId = els.editDossierId.value;
        const orgId = els.editDossierOrg.value || currentDossierOrgId;
        
        if (!nome) {
            showToast('O nome é obrigatório.', 'error');
            return;
        }
        
        let entryData = {
            nome,
            observacoes,
            fotoUrl,
            // A data de criação/atualização é definida pelo Firestore
        };

        let collectionRef = db.collection('dossier');
        let entryType = entryId ? currentDossierEntry.type : (orgId ? 'pessoa' : 'org');

        if (entryType === 'pessoa') {
            entryData = {
                ...entryData,
                type: 'pessoa',
                orgId: orgId,
                numero: els.editDossierNumero.value.trim(),
                cargo: els.editDossierCargo.value.trim(),
                instagram: els.editDossierInstagram.value.trim(),
                veiculos: currentDossierVehicles
            };
        } else if (entryType === 'org') {
            entryData = {
                ...entryData,
                type: 'org',
                peopleCount: currentDossierEntry ? currentDossierEntry.peopleCount : 0 // Mantém a contagem de pessoas
            };
        }
        
        try {
            if (entryId) {
                await collectionRef.doc(entryId).update(entryData);
                showToast(`${entryType === 'org' ? 'Base' : 'Pessoa'} editada com sucesso.`, 'success');
            } else {
                entryData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await collectionRef.add(entryData);
                showToast(`${entryType === 'org' ? 'Base' : 'Pessoa'} adicionada com sucesso.`, 'success');
            }
            
            hideEditDossierModal();
            // A visualização será atualizada pelo listener do Firestore
            
        } catch (error) {
            console.error("Erro ao salvar Dossiê: ", error);
            showToast('Erro ao salvar no Dossiê.', 'error');
        }
    }
    
    /**
     * Exclui uma entrada do Dossiê (Base ou Pessoa).
     */
    async function deleteDossierEntry() {
        if (!currentDossierEntry) return;
        
        if (currentDossierEntry.type === 'org' && currentDossierEntry.peopleCount > 0) {
            showToast('Não é possível excluir uma base com membros ativos. Mova ou exclua os membros primeiro.', 'error');
            return;
        }
        
        if (confirm(`Tem certeza que deseja excluir ${currentDossierEntry.nome}? Esta ação é irreversível.`)) {
            try {
                await db.collection('dossier').doc(currentDossierEntry.id).delete();
                showToast(`${currentDossierEntry.nome} excluído(a) com sucesso.`, 'success');
                hideEditDossierModal();
                // A visualização será atualizada pelo listener do Firestore
            } catch (error) {
                console.error("Erro ao excluir Dossiê: ", error);
                showToast('Erro ao excluir do Dossiê.', 'error');
            }
        }
    }

    // --- LISTENERS E SINCRONIZAÇÃO DE DADOS ---

    /**
     * Listener para o estado de autenticação do usuário.
     */
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            els.authMessage.textContent = '';
            
            // 1. Oculta login, mostra cards
            els.authScreen.style.display = 'none';
            els.mainCard.style.display = 'block';

            // 2. Busca dados do usuário (nome, tag)
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserData = userDoc.data();
                
                // 3. Atualiza status do usuário
                if (els.userStatus) {
                    els.userStatus.textContent = `${currentUserData.nome} (${currentUserData.tag})`;
                    els.userStatus.className = `user-status-display tag-${currentUserData.tag.toLowerCase()}`;
                    els.userStatus.style.display = 'block';
                }
                
                // 4. Habilita/Desabilita painéis
                if (currentUserData.tag === tagsPermissoes.admin) {
                    els.adminPanelBtn.style.display = 'block';
                    // Inicia listeners e syncs de admin
                    syncAdminUserList();
                    syncLayoutControls();
                } else {
                    els.adminPanelBtn.style.display = 'none';
                }
                
                if (currentUserData.tag !== tagsPermissoes.visitante) {
                    els.investigacaoBtn.style.display = 'block';
                    syncDossierData();
                } else {
                    els.investigacaoBtn.style.display = 'none';
                }
                
                // 5. Inicia o listener de vendas
                syncVendasData();
                
            } else {
                // Usuário logado, mas sem registro em 'users' (caso de recém-registro, ou erro)
                showToast('Erro ao carregar dados do usuário. Faça logout e tente novamente.', 'error');
                auth.signOut();
            }
        } else {
            currentUser = null;
            currentUserData = null;
            vendaOriginalCliente = null;
            vendaOriginalOrganizacao = null;
            if (vendasListener) vendasListener(); // Para o listener
            if (dossierListener) dossierListener(); // Para o listener
            vendas = [];
            dossierEntries = [];
            
            // Oculta cards, mostra login
            els.authScreen.style.display = 'block';
            els.mainCard.style.display = 'none';
            els.historyCard.style.display = 'none';
            els.adminPanel.style.display = 'none';
            els.dossierCard.style.display = 'none';
            if(els.userStatus) els.userStatus.style.display = 'none';
            if(els.investigacaoBtn) els.investigacaoBtn.style.display = 'none';
        }
    });

    /**
     * Listener para sincronizar a lista de vendas do Firestore.
     */
    function syncVendasData() {
        if (vendasListener) vendasListener(); // Garante que o listener anterior seja parado
        
        // Define a consulta (apenas vendas, ordenadas pela data mais recente)
        const query = db.collection('vendas').orderBy('dataRegistro', 'desc');
        
        vendasListener = query.onSnapshot(snapshot => {
            vendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderHistory(vendas);
            
            // Aplica filtro se já houver um
            if (els.filtroHistorico.value.trim()) {
                filterHistory();
            }
        }, error => {
            console.error("Erro ao sincronizar vendas: ", error);
            showToast('Erro ao carregar histórico de vendas.', 'error');
        });
    }
    
    /**
     * Listener para sincronizar o Dossiê do Firestore.
     */
    function syncDossierData() {
        if (dossierListener) dossierListener();
        
        const query = db.collection('dossier').orderBy('nome', 'asc');
        
        dossierListener = query.onSnapshot(snapshot => {
            dossierEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Recalcula a contagem de pessoas por base
            const peopleCountMap = dossierEntries.filter(e => e.type === 'pessoa').reduce((acc, curr) => {
                acc[curr.orgId] = (acc[curr.orgId] || 0) + 1;
                return acc;
            }, {});
            
            dossierEntries.forEach(entry => {
                if (entry.type === 'org') {
                    entry.peopleCount = peopleCountMap[entry.id] || 0;
                }
            });
            
            // Rerenderiza a view atual do Dossiê
            if (els.dossierCard.style.display === 'block') {
                if (currentDossierOrgId && els.dossierPeopleContainer.style.display === 'block') {
                    // Está na view de Pessoas
                    viewDossierPeople(currentDossierOrgId);
                } else {
                    // Está na view de Bases
                    renderDossierOrgs(dossierEntries);
                }
            }
            
        }, error => {
            console.error("Erro ao sincronizar Dossiê: ", error);
            showToast('Erro ao carregar dados de investigação.', 'error');
        });
    }

    /**
     * Sincroniza a lista de usuários para o painel de admin.
     */
    function syncAdminUserList() {
        if (currentUserData.tag !== tagsPermissoes.admin) return;
        
        db.collection('users').orderBy('nome', 'asc').onSnapshot(snapshot => {
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            renderAdminUserList(users);
        }, error => {
            console.error("Erro ao sincronizar usuários: ", error);
            showToast('Erro ao carregar lista de usuários.', 'error');
        });
    }
    
    /**
     * Filtra o histórico de vendas.
     */
    function filterHistory() {
        const query = els.filtroHistorico.value.trim().toLowerCase();
        if (!query) {
            renderHistory(vendas); // Mostra todas se o filtro estiver vazio
            return;
        }
        
        const filteredSales = vendas.filter(sale => {
            // Verifica nos campos mais relevantes
            const cliente = sale.cliente ? sale.cliente.toLowerCase() : '';
            const organizacao = sale.organizacao ? sale.organizacao.toLowerCase() : '';
            const negociadoras = sale.negociadoras ? sale.negociadoras.toLowerCase() : '';
            const registradoPor = sale.registradoPor ? sale.registradoPor.toLowerCase() : '';
            const tipoValor = sale.tipoValor ? sale.tipoValor.toLowerCase() : '';
            
            // Verifica nas quantidades (se a query for um número)
            const isNumericQuery = !isNaN(parseFloat(query)) && isFinite(query);

            return cliente.includes(query) ||
                   organizacao.includes(query) ||
                   negociadoras.includes(query) ||
                   registradoPor.includes(query) ||
                   tipoValor.includes(query) ||
                   (isNumericQuery && 
                    (String(sale.qtyTickets).includes(query) || 
                     String(sale.qtyTablets).includes(query) || 
                     String(sale.qtyNitro).includes(query) || 
                     String(sale.valorTotal).includes(query)));
        });
        
        renderHistory(filteredSales);
    }
    
    /**
     * Filtra as Bases (Organizações).
     */
    function filterDossierOrgs() {
        const query = els.filtroDossierOrgs.value.trim().toLowerCase();
        
        if (!query) {
            renderDossierOrgs(dossierEntries);
            return;
        }
        
        const filteredOrgs = dossierEntries.filter(entry => {
            // Filtra as Bases (org) por nome ou pessoas (pessoa) por nome, cargo, veiculos
            if (entry.type === 'org') {
                return entry.nome.toLowerCase().includes(query) || 
                       dossierEntries.some(p => p.orgId === entry.id && p.type === 'pessoa' && 
                                               (p.nome.toLowerCase().includes(query) ||
                                                p.cargo.toLowerCase().includes(query) ||
                                                (p.veiculos || []).some(v => v.placa.toLowerCase().includes(query) || v.nome.toLowerCase().includes(query))));
            }
            return false;
        });
        
        renderDossierOrgs(filteredOrgs);
    }
    
    /**
     * Filtra as Pessoas de uma Base.
     */
    function filterDossierPeople() {
        const query = els.filtroDossierPeople.value.trim().toLowerCase();
        const allPeople = dossierEntries.filter(e => e.orgId === currentDossierOrgId && e.type === 'pessoa');
        
        if (!query) {
            renderDossierPeople(allPeople);
            return;
        }
        
        const filteredPeople = allPeople.filter(person => {
            const nome = person.nome.toLowerCase();
            const cargo = person.cargo ? person.cargo.toLowerCase() : '';
            const veiculos = (person.veiculos || []).map(v => `${v.nome.toLowerCase()} ${v.placa.toLowerCase()}`).join(' ');
            
            return nome.includes(query) ||
                   cargo.includes(query) ||
                   veiculos.includes(query);
        });
        
        renderDossierPeople(filteredPeople);
    }

    // --- EVENT LISTENERS GERAIS ---
    
    // Autenticação
    els.loginBtn.addEventListener('click', async () => {
        const username = els.username.value.trim();
        const password = els.password.value.trim();
        
        if (!username || !password) {
            els.authMessage.textContent = 'Preencha usuário e senha.';
            return;
        }
        
        try {
            // A lógica de login real em um sistema Firebase/Firestore
            // Envolve buscar o UID com base no username, e depois logar com o email/senha do UID.
            // Para simplificar, vamos usar uma função mock de login com email/senha fixos.
            // A implementação correta com Firebase seria diferente.
            
            // *** AVISO DE SEGURANÇA: Esta é uma simplificação. A lógica real deve ser segura. ***
            
            // Exemplo de login simplificado (assumindo que o username é o email)
            const email = `${username}@hellsangels.com`; 
            await auth.signInWithEmailAndPassword(email, password);
            
            els.authMessage.textContent = '';
            
        } catch (error) {
            console.error("Erro de login: ", error.code, error.message);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                els.authMessage.textContent = 'Credenciais inválidas.';
            } else {
                els.authMessage.textContent = 'Erro ao tentar logar. Tente novamente.';
            }
        }
    });

    els.logoutBtn.addEventListener('click', () => {
        auth.signOut();
        showToast('Você saiu.', 'default');
    });

    els.registerUserBtn.addEventListener('click', () => {
        // Lógica para ir para a tela de cadastro ou modal de registro
        showToast('Recurso de Cadastro não implementado.', 'default');
    });
    
    els.forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Lógica de recuperação de senha
        showToast('Recurso de Recuperação de Senha não implementado.', 'default');
    });

    // Calculadora e Registro
    els.calcBtn.addEventListener('click', calculateMaterialsAndValues);
    
    // Atualiza resultados ao mudar valores
    [els.qtyTickets, els.qtyTablets, els.qtyNitro, els.tipoValor].forEach(el => {
        el.addEventListener('input', calculateMaterialsAndValues);
    });

    els.resetBtn.addEventListener('click', () => {
        if (els.resetBtn.classList.contains('danger')) {
            // É o botão 'Cancelar Edição'
            cancelEdit();
        } else {
            // É o botão 'Limpar Campos'
            resetFields(true);
        }
    });
    
    els.registerBtn.addEventListener('click', () => {
        if (els.registerBtn.disabled) return;
        
        const data = calculateMaterialsAndValues();
        const editId = els.registerBtn.dataset.editId;
        
        registerSale(data, editId);
    });

    // Histórico
    els.toggleHistoryBtn.addEventListener('click', () => {
        if (els.historyCard.style.display === 'block') {
            toggleView('calc');
        } else {
            toggleView('history');
        }
    });
    
    els.toggleCalcBtn.addEventListener('click', () => toggleView('calc'));
    els.filtroHistorico.addEventListener('input', filterHistory);
    
    els.clearHistoryBtn.addEventListener('click', () => {
        // Implementar lógica de exclusão em massa ou reset (somente para admin)
        showToast('Limpeza de histórico não implementada.', 'default');
    });

    // Admin
    els.adminPanelBtn.addEventListener('click', () => toggleView('admin'));
    els.toggleCalcBtnAdmin.addEventListener('click', () => toggleView('calc'));
    
    // Eventos de Layout Admin
    els.layoutToggleNightMode.addEventListener('change', async (e) => {
        await db.collection('settings').doc('layout').update({ enableDarkMode: e.target.checked });
        showToast('Configuração de Modo Noturno atualizada globalmente.', 'success');
    });
    
    els.layoutToggleBottomPanel.addEventListener('change', async (e) => {
        await db.collection('settings').doc('layout').update({ enableBottomPanel: e.target.checked });
        showToast('Configuração de Painel Inferior atualizada globalmente.', 'success');
    });
    
    els.saveBottomPanelTextBtn.addEventListener('click', async () => {
        await db.collection('settings').doc('layout').update({ bottomPanelText: els.bottomPanelText.value.trim() });
        showToast('Texto do Painel Inferior salvo globalmente.', 'success');
    });
    
    els.migrateDossierBtn.addEventListener('click', () => {
        // Implementar lógica de migração de vendas para o Dossiê
        showToast('Migração de Vendas para Dossiê não implementada.', 'default');
    });
    
    els.migrateVeiculosBtn.addEventListener('click', () => {
        // Implementar lógica de migração de veículos (strings para array de objetos)
        showToast('Migração de Veículos para Dossiê não implementada.', 'default');
    });
    
    // Dossiê
    els.investigacaoBtn.addEventListener('click', () => toggleView('dossier'));
    els.toggleCalcBtnDossier.addEventListener('click', () => toggleView('calc'));
    
    els.addOrgBtn.addEventListener('click', () => showEditDossierModal()); // Adicionar Base
    els.addPessoaBtn.addEventListener('click', () => showEditDossierModal()); // Adicionar Pessoa (na base atual)
    els.dossierVoltarBtn.addEventListener('click', returnToDossierOrgs);
    
    els.filtroDossierOrgs.addEventListener('input', filterDossierOrgs);
    els.filtroDossierPeople.addEventListener('input', filterDossierPeople);

    // Modal de Edição Dossiê
    els.cancelDossierBtn.addEventListener('click', hideEditDossierModal);
    els.editDossierOverlay.addEventListener('click', hideEditDossierModal);
    els.saveDossierBtn.addEventListener('click', saveDossierEntry);
    els.deleteDossierBtn.addEventListener('click', deleteDossierEntry);
    els.addVeiculoBtnModal.addEventListener('click', addVeiculoToModal);

    // --- INICIALIZAÇÃO DA UI (Welcome Screen, Tema e Layout Global) ---
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    if(savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    updateLogoAndThemeButton(savedTheme === 'dark');

    // Listener para o botão de tema
    els.themeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        updateLogoAndThemeButton(!isDark);
    });

    // Lógica da Welcome Screen
    if (localStorage.getItem('hasVisited')) {
        els.welcomeScreen.style.display = 'none';
    } else {
        els.welcomeScreen.classList.add('show');
        els.authScreen.style.display = 'none';
        els.mainCard.style.display = 'none';
    }

    els.enterBtn.onclick = () => {
        localStorage.setItem('hasVisited', 'true');
        els.welcomeScreen.classList.remove('show');
        els.welcomeScreen.classList.add('hidden');
        
        // Exibe a tela de autenticação
        setTimeout(() => {
            els.welcomeScreen.style.display = 'none';
            if (!currentUser) {
                els.authScreen.style.display = 'block';
            }
        }, 500); // 500ms para a animação (se houver)
    };
    
    // Sincronização de configurações de layout global (para usuários não-admin)
    db.collection('settings').doc('layout').onSnapshot(doc => {
        if (doc.exists) {
            applyGlobalLayoutSettings(doc.data());
        }
    }, error => {
        console.error("Erro ao sincronizar configurações globais: ", error);
    });
    
    // Preenche a data da venda ao carregar
    els.dataVenda.value = new Date().toLocaleString('pt-BR');
    
    // Tutorial
    els.tutorialBtn.addEventListener('click', () => {
        showToast('O sistema de tutorial não está pronto.', 'default');
    });
    
    // Discord (Criação de mensagem)
    els.discordBtnCalc.addEventListener('click', () => {
        const data = calculateMaterialsAndValues();
        if (data.totalValue === 0) {
            showToast('Nenhum produto para enviar.', 'error');
            return;
        }
        
        // Cria a mensagem formatada para Discord
        const cliente = els.nomeCliente.value.trim();
        const organizacao = els.organizacao.value.trim();
        const telefone = els.telefone.value.trim();
        const negociadoras = els.negociadoras.value.trim();
        
        let message = `**[REGISTRO DE VENDA H.A]**\n\n`;
        message += `**Cliente:** ${cliente || 'N/A'}\n`;
        message += `**Organização:** ${organizacao || 'N/A'} (${els.organizacaoTipo.value})\n`;
        message += `**Telefone:** ${telefone || 'N/A'}\n`;
        message += `**Negociadoras:** ${negociadoras || 'N/A'}\n`;
        message += `**Cargo:** ${els.vendaValorObs.value.trim() || 'N/A'}\n`;
        message += `**Carros/Placas:** ${els.carroVeiculo.value.trim() || 'N/A'} / ${els.placaVeiculo.value.trim() || 'N/A'}\n\n`;
        
        message += `**PRODUTOS VENDIDOS:**\n`;
        if (data.qtyTickets > 0) message += `> Tickets: ${data.qtyTickets}x\n`;
        if (data.qtyTablets > 0) message += `> Tablets: ${data.qtyTablets}x\n`;
        if (data.qtyNitro > 0) message += `> Nitro: ${data.qtyNitro}x\n`;
        
        message += `\n**VALOR TOTAL:** ${formatCurrency(data.totalValue)} (${data.tipoValor.toUpperCase()})\n\n`;
        
        let materialsList = [];
        for (const mat in data.totalMaterials) {
             if (data.totalMaterials[mat] > 0) {
                 materialsList.push(`${mat}: ${data.totalMaterials[mat]}x`);
             }
        }
        
        message += `**MATERIAIS NECESSÁRIOS:**\n`;
        message += materialsList.join(' | ');
        message += `\n\n**REGISTRADO POR:** ${currentUserData ? currentUserData.nome : 'N/A'}`;
        
        // Copia para a área de transferência
        navigator.clipboard.writeText(message).then(() => {
            showToast('Mensagem para Discord copiada!', 'success');
        }).catch(err => {
            console.error('Erro ao copiar texto: ', err);
            showToast('Erro ao copiar. Veja o console.', 'error');
        });
    });
    
    // CSV Export
    els.csvBtn.addEventListener('click', () => {
        // Lógica de exportação
        showToast('Exportação CSV não implementada.', 'default');
    });

});