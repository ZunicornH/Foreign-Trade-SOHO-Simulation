export function calcQuote(draft) {
  const {
    factoryPrice = 0,
    packagingFee = 0,
    domesticShipping = 0,
    certAmortization = 0,
    logisticsFee = 0,
    importDuty = 0,
    exchangeRate = 7.25,
    profitRate = 0.25,
    tradeTerms = 'FOB',
  } = draft;

  const totalCostCNY = factoryPrice + packagingFee + domesticShipping + certAmortization;
  if (totalCostCNY <= 0 || exchangeRate <= 0) {
    return { unitPriceUSD: 0, totalCostCNY: 0, profitRate: 0 };
  }

  let baseCostUSD = totalCostCNY / exchangeRate;

  if (tradeTerms === 'CIF' || tradeTerms === 'DDP') {
    baseCostUSD += logisticsFee;
  }
  if (tradeTerms === 'DDP') {
    baseCostUSD += importDuty;
  }

  const unitPriceUSD = baseCostUSD / (1 - profitRate);

  return {
    unitPriceUSD: Math.round(unitPriceUSD * 100) / 100,
    totalCostCNY,
    baseCostUSD: Math.round(baseCostUSD * 100) / 100,
    profitRate,
  };
}
