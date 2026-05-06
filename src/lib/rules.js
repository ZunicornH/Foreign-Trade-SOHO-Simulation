// Normalize text for keyword matching: lowercase + collapse whitespace
function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function containsRisk(text, patterns) {
  const lower = normalize(text);
  return patterns.some((p) => {
    if (p instanceof RegExp) return p.test(lower);
    return lower.includes(p);
  });
}

// ── Stage 3: Prospecting email checks ───────────────────────────────────────

export const LOW_PRICE_PATTERNS = [
  'cheapest',
  'lowest price',
  'best price',
  'cheapest price',
  'most competitive price',
  'cheap',
];

export const CTA_PATTERNS = [
  'contact',
  'reply',
  'discuss',
  'schedule',
  'reach out',
  'get in touch',
  'let us know',
  'feel free',
  'looking forward',
];

export const CERT_PATTERNS = ['ce', 'lfgb', 'certification', 'certified', 'compliant'];

export function checkProspectingEmail(text) {
  const warnings = [];
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  if (!text.trim()) {
    return { blocked: true, warnings: [{ level: 'block', msg: '请先输入开发信内容' }] };
  }

  if (wordCount < 80) {
    warnings.push({ level: 'warn', msg: `邮件过短（当前 ${wordCount} 词），建议至少 80 词以增强说服力` });
  }

  if (!containsRisk(text, CTA_PATTERNS)) {
    warnings.push({ level: 'warn', msg: '未检测到行动号召（CTA），建议引导买家联系或索样' });
  }

  if (!containsRisk(text, CERT_PATTERNS)) {
    warnings.push({ level: 'info', msg: '德国市场建议主动提及 LFGB / CE 认证以增强信任' });
  }

  if (containsRisk(text, LOW_PRICE_PATTERNS)) {
    warnings.push({ level: 'warn', msg: '检测到低价话术，建议改为"competitive pricing with high quality"' });
  }

  const canProceed = wordCount >= 80 && containsRisk(text, CTA_PATTERNS);
  return { blocked: false, canProceed, warnings };
}

// ── Stage 4: Inquiry reply checks ───────────────────────────────────────────

export const SPEC_PATTERNS = ['ml', 'mm', 'cm', 'g ', 'gram', 'stainless', '304', '500', 'capacity', 'dimension', 'weight', 'material', 'specification', 'spec'];
export const PRICE_MODE_PATTERNS = ['fob', 'cif', 'ddp', 'ex works', 'exw', 'price', 'usd', 'eur', 'per piece', 'per pcs', 'unit price'];

export function checkInquiryReply(text) {
  if (!text.trim()) {
    return { blocked: true, warnings: [{ level: 'block', msg: '请先输入询盘回复内容' }] };
  }

  const warnings = [];

  const hasSpec = containsRisk(text, SPEC_PATTERNS);
  const hasPriceMode = containsRisk(text, PRICE_MODE_PATTERNS);

  if (!hasSpec) {
    warnings.push({ level: 'block', msg: '回复中未包含产品规格（尺寸/重量/材质等），买家无法评估' });
  }

  if (!hasPriceMode) {
    warnings.push({ level: 'block', msg: '回复中未说明贸易条款（FOB/CIF/DDP）或报价方式' });
  }

  if (containsRisk(text, LOW_PRICE_PATTERNS)) {
    warnings.push({ level: 'warn', msg: '避免"lowest price"等被动定价话术，建议突出价值' });
  }

  const canProceed = hasSpec && hasPriceMode;
  return { blocked: !canProceed, canProceed, warnings };
}

// ── Stage 5: Quote checks ────────────────────────────────────────────────────

export function checkQuote(draft) {
  const warnings = [];
  const { factoryPrice, packagingFee, domesticShipping, certAmortization,
          logisticsFee, importDuty, exchangeRate, profitRate, tradeTerms } = draft;

  const totalCostCNY = factoryPrice + packagingFee + domesticShipping + certAmortization;

  if (totalCostCNY <= 0) {
    return { blocked: true, warnings: [{ level: 'block', msg: '出厂成本 ≤ 0，请填写正确出厂价' }] };
  }

  if (exchangeRate === 7.25) {
    warnings.push({ level: 'info', msg: '汇率使用默认值 7.25，建议核实最新 EUR/CNY 汇率' });
  }

  if (profitRate < 0.15) {
    warnings.push({ level: 'error', msg: `利润率 ${(profitRate * 100).toFixed(1)}% 过低（< 15%），建议重新核算` });
  } else if (profitRate < 0.20) {
    warnings.push({ level: 'warn', msg: `利润率 ${(profitRate * 100).toFixed(1)}%，偏薄，注意谈判留存空间` });
  }

  if (tradeTerms === 'DDP' && (logisticsFee <= 0 || importDuty <= 0)) {
    return {
      blocked: true,
      warnings: [
        ...warnings,
        { level: 'block', msg: 'DDP 条款须填写目的港物流费和进口关税，否则无法确认报价' },
      ],
    };
  }

  const canProceed = profitRate >= 0.15;
  return { blocked: false, canProceed, warnings };
}

// ── Stage 6: Negotiation checks ──────────────────────────────────────────────

export const CREDIT_TERM_PATTERNS = [
  'net 60', 'net 90', 'net60', 'net90', 'net 30', 'net30',
  /net\s*\d+/,
  'credit term', 'credit terms', '赊账', '延期付款',
];

export const CONCESSION_EXCHANGE_PATTERNS = [
  'more quantity', 'increase order', 'larger order', 'bigger order',
  'advance payment', 'prepayment', 'deposit', 'tt in advance',
  '增量', '提前付款', '预付', '加量',
];

export function checkNegotiationReply(text, concessionCount) {
  const warnings = [];

  if (containsRisk(text, CREDIT_TERM_PATTERNS)) {
    warnings.push({ level: 'error', msg: '检测到赊账/延期付款条款，高风险！建议坚持 T/T 30% 定金', scoreDelta: -15 });
  }

  return { warnings };
}

export function detectConcession(text, currentPrice, quotedPrice) {
  // Check if text implies a price reduction
  const lower = normalize(text);
  const pricePatterns = ['accept', 'agree', 'ok with', 'can do', 'offer you', 'give you', 'make it'];
  const hasExchange = containsRisk(text, CONCESSION_EXCHANGE_PATTERNS);

  // Simple heuristic: if user mentions a lower number or acceptance without exchange
  const numbers = lower.match(/\d+\.?\d*/g) || [];
  const mentionsLowerPrice = numbers.some((n) => {
    const val = parseFloat(n);
    return val > 0 && val < currentPrice && val > currentPrice * 0.5;
  });

  if (mentionsLowerPrice || pricePatterns.some((p) => lower.includes(p))) {
    if (hasExchange) return 'concession_with_exchange';
    return 'concession';
  }
  return 'hold';
}

// ── Stage 7: PI checks ───────────────────────────────────────────────────────

export function checkPI(draft) {
  const warnings = [];
  const required = [
    { field: 'productDesc', label: '产品描述' },
    { field: 'hsCode', label: 'HS 编码' },
    { field: 'bankAccount', label: '收款账户' },
  ];

  const missing = required.filter((r) => !draft[r.field]?.trim());
  if (missing.length > 0) {
    missing.forEach((m) =>
      warnings.push({ level: 'block', msg: `PI 缺少"${m.label}"，无法发送` })
    );
    return { blocked: true, warnings };
  }

  if (!draft.deliveryTime?.trim()) {
    warnings.push({ level: 'warn', msg: '建议注明预计交货期，避免后续纠纷' });
  }

  return { blocked: false, canProceed: true, warnings };
}
