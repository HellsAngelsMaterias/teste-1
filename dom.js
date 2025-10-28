/* ===============================================
  DOM.JS
  Mapeamento de todos os IDs do DOM.
  
  VERIFIQUE SEMPRE AS VÍRGULAS NO FINAL!
===============================================
*/

export const els = {
  // --- Calculadora Principal ---
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
  dataVenda: document.getElementById('dataVenda'),
  filtroHistorico: document.getElementById('filtroHistorico'),
  resultsBody: document.getElementById('resultsBody'),
  valuesBody: document.getElementById('valuesBody'),
  valorTotalGeral: document.getElementById('valorTotalGeral'),
  results: document.getElementById('results'),
  
  // --- Telas e Botões Principais ---
  mainCard: document.getElementById('mainCard'),
  historyCard: document.getElementById('historyCard'),
  salesHistory: document.getElementById('salesHistory'),
  calcBtn: document.getElementById('calcBtn'),
  resetBtn: document.getElementById('resetBtn'),
  registerBtn: document.getElementById('registerBtn'),
  toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
  toggleCalcBtn: document.getElementById('toggleCalcBtn'),
  discordBtnCalc: document.getElementById('discordBtnCalc'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  csvBtn: document.getElementById('csvBtn'),
  
  // --- Autenticação / Geral ---
  welcomeScreen: document.getElementById('welcomeScreen'),
  welcomeLogo: document.getElementById('welcomeLogo'), 
  enterBtn: document.getElementById('enterBtn'),
  authScreen: document.getElementById('authScreen'), 
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginBtn: document.getElementById('loginBtn'),
  registerUserBtn: document.getElementById('registerUserBtn'),
  forgotPasswordLink: document.getElementById('forgotPasswordLink'),
  logoutBtn: document.getElementById('logoutBtn'),
  userStatus: document.getElementById('userStatus'), 
  appLogo: document.getElementById('appLogo'), 
  logoLink: document.getElementById('logoLink'),
  themeBtn: document.getElementById('themeBtn'),
  tutorialBtn: document.getElementById('tutorialBtn'),
  
  // --- Admin Panel ---
  adminPanelBtn: document.getElementById('adminPanelBtn'),
  adminPanel: document.getElementById('adminPanel'),
  toggleCalcBtnAdmin: document.getElementById('toggleCalcBtnAdmin'), 
  onlineUsersList: document.getElementById('onlineUsersList'),
  layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
  layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
  bottomPanelText: document.getElementById('bottomPanelText'),
  saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
  migrateDossierBtn: document.getElementById('migrateDossierBtn'), 
  migrateVeiculosBtn: document.getElementById('migrateVeiculosBtn'), 

  // --- Dossier / Investigação ---
  investigacaoBtn: document.getElementById('investigacaoBtn'),
  dossierCard: document.getElementById('dossierCard'),
  toggleCalcBtnDossier: document.getElementById('toggleCalcBtnDossier'),
  dossierContent: document.getElementById('dossierContent'),
  filterOrgsInput: document.getElementById('filterOrgsInput'), 
  orgsList: document.getElementById('orgsList'),
  orgsTitle: document.getElementById('orgsTitle'),
  addOrgBtn: document.getElementById('addOrgBtn'),
  
  // --- Dossier Pessoas / Edit ---
  dossierPeopleList: document.getElementById('dossierPeopleList'),
  dossierPeopleTitle: document.getElementById('dossierPeopleTitle'),
  addDossierBtn: document.getElementById('addDossierBtn'),
  filterPeopleInput: document.getElementById('filterPeopleInput'),
  
  editDossierModalOverlay: document.getElementById('editDossierModalOverlay'),
  editDossierModal: document.getElementById('editDossierModal'),
  editDossierId: document.getElementById('editDossierId'),
  editDossierOrg: document.getElementById('editDossierOrg'),
  editDossierNome: document.getElementById('editDossierNome'),
  editDossierNumero: document.getElementById('editDossierNumero'),
  editDossierCargo: document.getElementById('editDossierCargo'),
  editDossierFotoUrl: document.getElementById('editDossierFotoUrl'),
  editDossierInstagram: document.getElementById('editDossierInstagram'), 
  
  editModalCarroNome: document.getElementById('editModalCarroNome'),
  editModalCarroPlaca: document.getElementById('editModalCarroPlaca'),
  editModalCarroFoto: document.getElementById('editModalCarroFoto'), 
  editModalAddVeiculoBtn: document.getElementById('editModalAddVeiculoBtn'),
  editModalCancelVeiculoBtn: document.getElementById('editModalCancelVeiculoBtn'), 
  editModalListaVeiculos: document.getElementById('editModalListaVeiculos'),
  
  saveDossierChangesBtn: document.getElementById('saveDossierChangesBtn'),
  cancelEditDossierBtn: document.getElementById('cancelEditDossierBtn'),
  removeDossierEntryBtn: document.getElementById('removeDossierEntryBtn'),
  
  // --- Dossier Adicionar Nova Pessoa ---
  addDossierModalOverlay: document.getElementById('addDossierModalOverlay'),
  addDossierModal: document.getElementById('addDossierModal'),
  addDossierOrg: document.getElementById('addDossierOrg'),
  addDossierNome: document.getElementById('addDossierNome'),
  addDossierNumero: document.getElementById('addDossierNumero'),
  addDossierCargo: document.getElementById('addDossierCargo'),
  addDossierFotoUrl: document.getElementById('addDossierFotoUrl'),
  saveNewDossierBtn: document.getElementById('saveNewDossierBtn'),
  cancelNewDossierBtn: document.getElementById('cancelNewDossierBtn'),

  addModalCarroNome: document.getElementById('addModalCarroNome'),
  addModalCarroPlaca: document.getElementById('addModalCarroPlaca'),
  addModalCarroFoto: document.getElementById('addModalCarroFoto'), 
  addModalAddVeiculoBtn: document.getElementById('addModalAddVeiculoBtn'),
  addModalCancelVeiculoBtn: document.getElementById('addModalCancelVeiculoBtn'), 
  addModalListaVeiculos: document.getElementById('addModalListaVeiculos'),
  
  // --- Org Modal ---
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
  
  // --- Lightbox de Imagem ---
  imageLightboxOverlay: document.getElementById('imageLightboxOverlay'),
  imageLightboxModal: document.getElementById('imageLightboxModal'),
  lightboxImg: document.getElementById('lightboxImg'),
  
  // --- Scrollbar do Histórico ---
  topHistoryScrollbar: document.getElementById('topHistoryScrollbar'), 

  // Fim do objeto
};
