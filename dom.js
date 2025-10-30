/* ===============================================
  DOM.JS
  Mapeamento de todos os IDs do DOM.
===============================================
*/

export const els = {
  // --- Auth/Welcome
  authScreen: document.getElementById('authScreen'),
  loginCard: document.getElementById('loginCard'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('loginBtn'),
  registerUserBtn: document.getElementById('registerUserBtn'),
  forgotPasswordLink: document.getElementById('forgotPasswordLink'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  welcomeLogo: document.getElementById('welcomeLogo'),
  enterBtn: document.getElementById('enterBtn'),

  // --- Controles Topo
  appLogo: document.getElementById('appLogo'),
  logoLink: document.getElementById('logoLink'),
  userStatus: document.getElementById('userStatus'),
  onlineIndicator: document.getElementById('onlineIndicator'),
  relogioContainer: document.getElementById('relogioContainer'),
  tutorialBtn: document.getElementById('tutorialBtn'),
  themeBtn: document.getElementById('themeBtn'),
  investigacaoBtn: document.getElementById('investigacaoBtn'),
  adminPanelBtn: document.getElementById('adminPanelBtn'),
  logoutBtn: document.getElementById('logoutBtn'),

  // --- Calculadora
  mainCard: document.getElementById('mainCard'),
  qtyTickets: document.getElementById('qtyTickets'),
  qtyTablets: document.getElementById('qtyTablets'),
  qtyNitro: document.getElementById('qtyNitro'),
  tipoValor: document.getElementById('tipoValor'),
  nomeCliente: document.getElementById('nomeCliente'),
  organizacao: document.getElementById('organizacao'),
  organizacaoTipo: document.getElementById('organizacaoTipo'),
  telefone: document.getElementById('telefone'),
  carroVeiculo: document.getElementById('carroVeiculo'), 
  placaVeiculo: document.getElementById('placaVeiculo'),
  negociadoras: document.getElementById('negociadoras'),
  vendaValorObs: document.getElementById('vendaValorObs'),
  dataVenda: document.getElementById('dataVenda'), // Este ID não estava no seu snippet, mas está no HTML
  resultsBody: document.getElementById('resultsBody'),
  valuesBody: document.getElementById('valuesBody'),
  valorTotalGeral: document.getElementById('valorTotalGeral'),
  results: document.getElementById('results'),
  calcBtn: document.getElementById('calcBtn'),
  resetBtn: document.getElementById('resetBtn'),
  registerBtn: document.getElementById('registerBtn'),
  discordBtnCalc: document.getElementById('discordBtnCalc'),
  toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),

  // --- Histórico
  historyCard: document.getElementById('historyCard'),
  toggleCalcBtn: document.getElementById('toggleCalcBtn'),
  filtroHistorico: document.getElementById('filtroHistorico'),
  csvBtn: document.getElementById('csvBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  topScrollbarContainer: document.getElementById('topScrollbarContainer'),
  topScrollbarContent: document.getElementById('topScrollbarContent'),
  historyTableWrapper: document.getElementById('historyTableWrapper'),
  historicoVendasTabela: document.getElementById('historicoVendasTabela'),
  salesHistory: document.getElementById('salesHistory'),

  // --- Admin Panel
  adminPanel: document.getElementById('adminPanel'),
  toggleCalcBtnAdmin: document.getElementById('toggleCalcBtnAdmin'),
  adminOnlineStatus: document.getElementById('adminOnlineStatus'),
  bottomPanelText: document.getElementById('bottomPanelText'),
  saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
  layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
  layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
  adminUserSelect: document.getElementById('adminUserSelect'),
  adminUserTagSelect: document.getElementById('adminUserTagSelect'),
  adminSaveUserTagBtn: document.getElementById('adminSaveUserTagBtn'),
  adminDeleteUserBtn: document.getElementById('adminDeleteUserBtn'),
  migrateDossierBtn: document.getElementById('migrateDossierBtn'),
  migrateVeiculosBtn: document.getElementById('migrateVeiculosBtn'),
  bottomPanel: document.getElementById('bottomPanel'),
  bottomPanelMessage: document.getElementById('bottomPanelMessage'),
  
  // --- Dossiê (Geral)
  dossierCard: document.getElementById('dossierCard'),
  toggleCalcBtnDossier: document.getElementById('toggleCalcBtnDossier'),

  // --- Dossiê (Nível 1 - Bases)
  dossierOrgContainer: document.getElementById('dossierOrgContainer'),
  filtroDossierOrgs: document.getElementById('filtroDossierOrgs'),
  addOrgBtn: document.getElementById('addOrgBtn'),
  dossierOrgGrid: document.getElementById('dossierOrgGrid'),

  // --- Dossiê (Nível 2 - Pessoas)
  dossierPeopleContainer: document.getElementById('dossierPeopleContainer'),
  dossierVoltarBtn: document.getElementById('dossierVoltarBtn'),
  dossierPeopleTitle: document.getElementById('dossierPeopleTitle'),
  filtroDossierPeople: document.getElementById('filtroDossierPeople'),
  addPessoaBtn: document.getElementById('addPessoaBtn'),
  dossierPeopleGrid: document.getElementById('dossierPeopleGrid'),
  
  // --- Modais Dossiê (Pessoa)
  editDossierOverlay: document.getElementById('editDossierOverlay'),
  editDossierModal: document.getElementById('editDossierModal'),
  editDossierOrg: document.getElementById('editDossierOrg'),
  editDossierId: document.getElementById('editDossierId'),
  editDossierNome: document.getElementById('editDossierNome'),
  editDossierNumero: document.getElementById('editDossierNumero'),
  editDossierCargo: document.getElementById('editDossierCargo'),
  editDossierFotoUrl: document.getElementById('editDossierFotoUrl'),
  editDossierInstagram: document.getElementById('editDossierInstagram'),
  saveDossierBtn: document.getElementById('saveDossierBtn'),
  cancelDossierBtn: document.getElementById('cancelDossierBtn'),
  
  editModalCarroNome: document.getElementById('editModalCarroNome'),
  editModalCarroPlaca: document.getElementById('editModalCarroPlaca'),
  editModalCarroFoto: document.getElementById('editModalCarroFoto'),
  editModalAddVeiculoBtn: document.getElementById('editModalAddVeiculoBtn'),
  editModalCancelVeiculoBtn: document.getElementById('editModalCancelVeiculoBtn'),
  editModalListaVeiculos: document.getElementById('editModalListaVeiculos'),

  addDossierOverlay: document.getElementById('addDossierOverlay'),
  addDossierModal: document.getElementById('addDossierModal'),
  addDossierOrganizacao: document.getElementById('addDossierOrganizacao'),
  addDossierNome: document.getElementById('addDossierNome'),
  addDossierNumero: document.getElementById('addDossierNumero'),
  addDossierCargo: document.getElementById('addDossierCargo'),
  addDossierFotoUrl: document.getElementById('addDossierFotoUrl'),
  addDossierInstagram: document.getElementById('addDossierInstagram'),
  saveNewDossierBtn: document.getElementById('saveNewDossierBtn'),
  cancelNewDossierBtn: document.getElementById('cancelNewDossierBtn'),

  addModalCarroNome: document.getElementById('addModalCarroNome'),
  addModalCarroPlaca: document.getElementById('addModalCarroPlaca'),
  addModalCarroFoto: document.getElementById('addModalCarroFoto'), 
  addModalAddVeiculoBtn: document.getElementById('addModalAddVeiculoBtn'),
  addModalCancelVeiculoBtn: document.getElementById('addModalCancelVeiculoBtn'), 
  addModalListaVeiculos: document.getElementById('addModalListaVeiculos'),
  
  // --- Modais Dossiê (Base)
  orgModalOverlay: document.getElementById('orgModalOverlay'),
  orgModal: document.getElementById('orgModal'),
  orgModalTitle: document.getElementById('orgModalTitle'),
  editOrgId: document.getElementById('editOrgId'),
  orgNome: document.getElementById('orgNome'),
  orgFotoUrl: document.getElementById('orgFotoUrl'),
  orgInfo: document.getElementById('orgInfo'),
  saveOrgBtn: document.getElementById('saveOrgBtn'),
  cancelOrgBtn: document.getElementById('cancelOrgBtn'),
  deleteOrgBtn: document.getElementById('deleteOrgBtn'),
  
  // --- Lightbox
  imageLightboxOverlay: document.getElementById('imageLightboxOverlay'),
  imageLightboxModal: document.getElementById('imageLightboxModal'),
  lightboxImg: document.getElementById('lightboxImg'),
  
  // --- Abas e Modal (Situações)
  tabMembros: document.getElementById('tabMembros'),
  tabSituacoes: document.getElementById('tabSituacoes'),
  membrosContent: document.getElementById('membrosContent'),
  situacoesContent: document.getElementById('situacoesContent'),
  addSituacaoBtn: document.getElementById('addSituacaoBtn'),
  situacoesList: document.getElementById('situacoesList'),
  
  situacaoModalOverlay: document.getElementById('situacaoModalOverlay'),
  situacaoModal: document.getElementById('situacaoModal'),
  situacaoModalTitle: document.getElementById('situacaoModalTitle'),
  situacaoId: document.getElementById('situacaoId'),
  situacaoOrgName: document.getElementById('situacaoOrgName'),
  situacaoRelato: document.getElementById('situacaoRelato'),
  situacaoStatus: document.getElementById('situacaoStatus'),
  saveSituacaoBtn: document.getElementById('saveSituacaoBtn'),
  cancelSituacaoBtn: document.getElementById('cancelSituacaoBtn')
};
