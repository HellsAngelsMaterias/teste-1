/* ===============================================
  CONSTANTES.JS
  Valores estáticos, custos, preços e URLs.
  
  VERSÃO SEM PASTAS
===============================================
*/

// --- Custos de Materiais
export const perUnit = {
  tickets: { dinheiro_sujo: 525 },
  tablets: { cobre: 20, plastico: 40, fita_adesiva: 2, lixo_eletronico: 2 },
  nitro: { aluminio: 20, cobre: 20, vidro: 45, fita_adesiva: 1, porca: 1, parafuso: 1 }
};

// --- Preços de Venda
export const valores = {
  tablets: { limpo: 17000, sujo: 20000, limpo_alianca: 15000, sujo_alianca: 18000 },
  tickets: { limpo: 9800, sujo: 11700, limpo_alianca: 8000, sujo_alianca: 10000 },
  nitro: { limpo: 42500, sujo: 50000, limpo_alianca: 38000, sujo_alianca: 45000 }
};

// --- Descrições de Valores
export const valorDescricao = {
    'limpo': 'Dinheiro Limpo',
    'sujo': 'Dinheiro Sujo',
    'limpo_alianca': 'Limpo (Aliança)',
    'sujo_alianca': 'Sujo (Aliança)'
};

// --- URLs de Imagens (Corrigido para usar o nome do seu arquivo)
export const logoLightModeSrc = "logo-dark.png";
export const logoDarkModeSrc = "logo-dark.png";
export const historyBackgroundSrc = "logo-dark.png";
export const welcomeLogoSrc = "logo-dark.png";

// --- Passos do Tutorial
export const tourSteps = [
    { element: 'qtyTickets', title: '1/5: Quantidades', content: 'Comece inserindo a quantidade de produtos que deseja calcular ou vender.' },
    { element: 'tipoValor', title: '2/5: Tipo de Valor', content: 'Selecione o tipo de pagamento. Isso afeta o preço final de cada item.' },
    { element: 'calcBtn', title: '3/5: Calcular', content: 'Clique aqui para ver os materiais necessários e o valor total da venda.' },
    { element: 'registerBtn', title: '4.5: Registrar Venda', content: 'Após calcular, preencha os dados do cliente e clique para salvar no histórico.' },
    { element: 'toggleHistoryBtn', title: '5/5: Ver Histórico', content: 'Acesse o histórico para ver, editar, apagar ou copiar vendas antigas.' }
];
