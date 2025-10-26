// Arquivo: ui_elements.js

// O objeto 'els' com todas as referências DOM
export const els = {
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
  mainCard: document.getElementById('mainCard'),
  historyCard: document.getElementById('historyCard'),
  salesHistory: document.getElementById('salesHistory'),
  calcBtn: document.getElementById('calcBtn'),
  resetBtn: document.getElementById('resetBtn'),
  registerBtn: document.getElementById('registerBtn'),
  toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
  toggleCalcBtn: document.getElementById('toggleCalcBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  csvBtn: document.getElementById('csvBtn'),
  discordBtnCalc: document.getElementById('discordBtnCalc'),
  themeBtn: document.getElementById('themeBtn'),
  tutorialBtn: document.getElementById('tutorialBtn'),
  logoLink: document.getElementById('logoLink'),
  appLogo: document.getElementById('appLogo'),
  
  // Login/Auth
  authScreen: document.getElementById('authScreen'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  signInBtn: document.getElementById('signInBtn'),
  registerUserBtn: document.getElementById('registerUserBtn'),
  authMessage: document.getElementById('authMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
  userStatus: document.getElementById('userStatus'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  welcomeLogo: document.getElementById('welcomeLogo'),
  enterBtn: document.getElementById('enterBtn'),
  
  // Histórico
  historyImg: document.getElementById('historyImg'),
  
  // Painel Admin
  adminPanel: document.getElementById('adminPanel'),
  layoutToggleNightMode: document.getElementById('layoutToggleNightMode'),
  layoutToggleBottomPanel: document.getElementById('layoutToggleBottomPanel'),
  bottomPanelText: document.getElementById('bottomPanelText'),
  saveBottomPanelTextBtn: document.getElementById('saveBottomPanelTextBtn'),
  clearOnlineUsersBtn: document.getElementById('clearOnlineUsersBtn'),
  usersOnlineList: document.getElementById('usersOnlineList'),
  monitorOnlineStatusBtn: document.getElementById('monitorOnlineStatusBtn'),
  
  // Dossiê
  investigacaoBtn: document.getElementById('investigacaoBtn'),
  dossierCard: document.getElementById('dossierCard'),
  filtroPessoasDossier: document.getElementById('filtroPessoasDossier'),
  filtroOrgDossier: document.getElementById('filtroOrgDossier'),
  openNewDossierBtn: document.getElementById('openNewDossierBtn'),
  dossierPeopleList: document.getElementById('dossierPeopleList'),
  dossierModalOverlay: document.getElementById('dossierModalOverlay'),
  dossierModal: document.getElementById('dossierModal'),
  dossierModalTitle: document.getElementById('dossierModalTitle'),
  editDossierId: document.getElementById('editDossierId'),
  editDossierOrgKey: document.getElementById('editDossierOrgKey'),
  addDossierNome: document.getElementById('addDossierNome'),
  addDossierOrganizacao: document.getElementById('addDossierOrganizacao'),
  addDossierNumero: document.getElementById('addDossierNumero'),
  addDossierInfo: document.getElementById('addDossierInfo'),
  addDossierFotoUrl: document.getElementById('addDossierFotoUrl'),
  saveNewDossierBtn: document.getElementById('saveNewDossierBtn'),
  cancelNewDossierBtn: document.getElementById('cancelNewDossierBtn'),
  deleteDossierBtn: document.getElementById('deleteDossierBtn'),
  
  // Datalists
  organizacaoDatalist: document.getElementById('organizacaoDatalist'),
  dossierOrgDatalist: document.getElementById('dossierOrgDatalist'),
  veiculosDatalist: document.getElementById('veiculosDatalist'),
  
  // Veículos (Modal)
  addModalCarroVeiculo: document.getElementById('addModalCarroVeiculo'),
  addModalPlacaVeiculo: document.getElementById('addModalPlacaVeiculo'),
  addModalAddVeiculoBtn: document.getElementById('addModalAddVeiculoBtn'),
  addModalListaVeiculos: document.getElementById('addModalListaVeiculos'),
  
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
  
  // --- NOVOS ELEMENTOS DO LIGHTBOX ---
  imageLightboxOverlay: document.getElementById('imageLightboxOverlay'),
  imageLightboxModal: document.getElementById('imageLightboxModal'),
  lightboxImg: document.getElementById('lightboxImg')
};

// Array com os campos que usam máscara de telefone (exportado para utils)
export const camposTelefone = [els.telefone, els.addDossierNumero];

// Array com os campos que precisam de capitalização (exportado para utils)
export const camposParaCapitalizar = [ 
    els.nomeCliente, els.organizacao, els.negociadoras, els.vendaValorObs, 
    els.carroVeiculo, els.placaVeiculo,
    els.addDossierNome, els.addDossierOrganizacao, els.addDossierInfo,
    els.addModalCarroVeiculo, els.addModalPlacaVeiculo,
    els.orgNome, els.orgInfo
];