// Real-time multi-dimension text analysis functions

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function contains(text, patterns) {
  const lower = normalize(text);
  return patterns.some((p) => (p instanceof RegExp ? p.test(lower) : lower.includes(p)));
}

// ── Stage 3: Prospecting email dimensions ────────────────────────────────────

const PERSONALIZATION_PATTERNS = [
  'germany', 'german', 'deutsch', 'hamburg', 'berlin', 'münchen',
  'amazon.de', 'kitchenware', 'your product', 'your brand', 'your line',
  'i noticed', 'i found', 'i saw', 'i came across',
];

const CERT_PATTERNS_EMAIL = [
  'lfgb', 'ce certified', 'ce certification', 'certified', 'certification',
  'compliant', 'fda', 'sgs', 'bv tested',
];

const STRONG_CTA_PATTERNS = [
  'schedule', 'book', 'call this', 'call next', 'thursday', 'friday',
  'could we', 'can we', 'would you like', 'when would', 'let\'s',
];
const WEAK_CTA_PATTERNS = [
  'feel free', 'contact me', 'reach out', 'get in touch', 'looking forward',
  'let me know', 'please contact',
];

const LOW_PRICE_EMAIL_PATTERNS = [
  'cheapest', 'lowest price', 'best price', 'cheapest price',
  'most competitive price', 'cheap',
];

export function analyzeProspectingEmail(text) {
  if (!text.trim()) {
    return [
      { label: '个性化（提及买家市场/产品）', score: 0, hint: '尚未输入内容' },
      { label: '认证提及（LFGB/CE）', score: 0, hint: '德国市场必须主动提认证' },
      { label: 'CTA 强度（行动号召）', score: 0, hint: '未检测到行动号召' },
      { label: '价格定位（无低价话术）', score: 0, hint: '尚未输入内容' },
    ];
  }

  const hasPersonalization = contains(text, PERSONALIZATION_PATTERNS);
  const hasCert = contains(text, CERT_PATTERNS_EMAIL);
  const hasStrongCTA = contains(text, STRONG_CTA_PATTERNS);
  const hasWeakCTA = contains(text, WEAK_CTA_PATTERNS);
  const hasLowPrice = contains(text, LOW_PRICE_EMAIL_PATTERNS);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return [
    {
      label: '个性化（提及买家市场/产品）',
      score: hasPersonalization ? 1 : 0,
      hint: hasPersonalization
        ? '很好，提到了具体市场或产品线'
        : '建议加入"I noticed your kitchenware line"或"Germany market"等个性化内容',
    },
    {
      label: '认证提及（LFGB/CE）',
      score: hasCert ? 1 : 0,
      hint: hasCert
        ? '已提及认证，增强了可信度'
        : '德国市场 LFGB 是法律门槛，建议主动在邮件中提及',
    },
    {
      label: 'CTA 强度（行动号召）',
      score: hasStrongCTA ? 1 : hasWeakCTA ? 0.5 : 0,
      hint: hasStrongCTA
        ? '行动号召具体有效（约时间/索样）'
        : hasWeakCTA
        ? '"Feel free to contact"较弱，建议改为"Could we schedule a call this Thursday?"'
        : '缺少行动号召，买家没有明确的下一步',
    },
    {
      label: '价格定位（无低价话术）',
      score: hasLowPrice ? 0 : wordCount > 10 ? 1 : 0.5,
      hint: hasLowPrice
        ? '⚠️ 检测到低价话术（cheapest/best price），会损害谈判地位'
        : wordCount > 10
        ? '未使用低价定位，良好'
        : '继续输入内容',
    },
  ];
}

// ── Stage 4: Inquiry reply dimensions ────────────────────────────────────────

const SPEC_PATTERNS_REPLY = [
  'ml', 'mm', 'cm', 'gram', 'g ', '304', 'stainless', 'capacity',
  'dimension', 'weight', 'material', 'specification', 'spec',
  '500ml', '500 ml', 'double wall', 'vacuum',
];

const TRADE_TERM_PATTERNS = [
  'fob', 'cif', 'ddp', 'ex works', 'exw', 'cpt',
];

const CERT_IN_REPLY = ['lfgb', 'ce', 'certified', 'certification', 'compliant', 'bpa-free', 'bpa free'];

const PAYMENT_PATTERNS = ['t/t', 'tt', 'l/c', 'lc', 'wire transfer', 'bank transfer',
  '30%', '70%', 'deposit', 'advance', 'payment term'];

export function analyzeInquiryReply(text) {
  if (!text.trim()) {
    return [
      { label: '产品规格（尺寸/重量/材质）', score: 0, hint: '尚未输入内容' },
      { label: '贸易条款（FOB/CIF/DDP）', score: 0, hint: '必填项' },
      { label: '认证信息（LFGB/CE）', score: 0, hint: '德国买家关注认证' },
      { label: '付款条件（T/T 比例）', score: 0, hint: '避免后续争议' },
    ];
  }

  const hasSpec = contains(text, SPEC_PATTERNS_REPLY);
  const hasTradeTerms = contains(text, TRADE_TERM_PATTERNS);
  const hasCert = contains(text, CERT_IN_REPLY);
  const hasPayment = contains(text, PAYMENT_PATTERNS);

  return [
    {
      label: '产品规格（尺寸/重量/材质）',
      score: hasSpec ? 1 : 0,
      hint: hasSpec
        ? '规格信息完整，买家可以进行内部审批'
        : '⚠️ 必须包含：容量（ml）/ 尺寸（mm）/ 重量（g）/ 材质',
    },
    {
      label: '贸易条款（FOB/CIF/DDP）',
      score: hasTradeTerms ? 1 : 0,
      hint: hasTradeTerms
        ? '贸易条款已说明，风险归属清晰'
        : '⚠️ 缺少贸易条款，买家无法做内部采购申请',
    },
    {
      label: '认证信息（LFGB/CE）',
      score: hasCert ? 1 : 0,
      hint: hasCert
        ? '已提及认证，增强买家信心'
        : '德国买家高度关注认证，建议主动说明',
    },
    {
      label: '付款条件（T/T 定金比例）',
      score: hasPayment ? 1 : 0,
      hint: hasPayment
        ? '付款条件已说明，减少后续争议'
        : '建议加入"T/T 30% deposit, 70% before shipment"',
    },
  ];
}

// ── Stage 8: Shipment notification dimensions ────────────────────────────────

const TRACKING_PATTERNS = [
  'tracking', 'b/l', 'bill of lading', 'bl number', 'awb', 'container',
  'vessel', 'flight', 'shipment ref', 'booking',
];
const BALANCE_PATTERNS = [
  'balance', 'remaining', 'outstanding', 'usd', 'eur', '$', '€', 'amount due',
];
const DEADLINE_PATTERNS = [
  'by', 'before', 'within', 'deadline', 'due date', 'days', 'working day',
  /\d{1,2}\/\d{1,2}/, /\d{4}-\d{2}-\d{2}/, /may|jun|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr/,
];
const PAYMENT_INST_PATTERNS = [
  'bank', 'swift', 'account', 'wire', 'transfer', 'payment instruction',
];

export function analyzeShipmentNotification(text) {
  if (!text.trim()) {
    return [
      { label: '追踪号/提单引用', score: 0, hint: '买家需要追踪货物' },
      { label: '尾款金额', score: 0, hint: '明确应付金额避免争议' },
      { label: '付款截止日（具体日期）', score: 0, hint: '没有截止日买家不会主动付款' },
      { label: '付款说明（银行信息）', score: 0, hint: '方便买家操作汇款' },
    ];
  }

  return [
    {
      label: '追踪号/提单引用',
      score: contains(text, TRACKING_PATTERNS) ? 1 : 0,
      hint: contains(text, TRACKING_PATTERNS)
        ? '已提供追踪信息'
        : '建议加入 B/L 编号或货物追踪链接',
    },
    {
      label: '尾款金额',
      score: contains(text, BALANCE_PATTERNS) ? 1 : 0,
      hint: contains(text, BALANCE_PATTERNS)
        ? '已明确尾款金额'
        : '⚠️ 必须说明尾款金额，如"Balance: USD 2,450"',
    },
    {
      label: '付款截止日（具体日期）',
      score: contains(text, DEADLINE_PATTERNS) ? 1 : 0,
      hint: contains(text, DEADLINE_PATTERNS)
        ? '已注明截止日'
        : '⚠️ 没有截止日买家不会主动付款，建议"Please transfer by [具体日期]"',
    },
    {
      label: '付款说明（银行信息）',
      score: contains(text, PAYMENT_INST_PATTERNS) ? 1 : 0,
      hint: contains(text, PAYMENT_INST_PATTERNS)
        ? '付款说明已包含'
        : '提醒买家付款账户，并告知使用 PI 上的账户',
    },
  ];
}

// ── Stage 9: Repurchase email dimensions ─────────────────────────────────────

const PRODUCT_HOOK_PATTERNS = [
  'new color', 'new colour', 'new product', 'new design', 'new style',
  'new collection', 'launched', 'just released', 'matte black', 'forest green',
  '新颜色', '新产品', '新款', '新色',
];
const URGENCY_PATTERNS = [
  'q4', 'peak season', 'capacity', 'slot', 'limited', 'hurry', 'soon',
  'by [date]', 'before', 'deadline', 'book', 'reserve',
  '旺季', '产能', '名额',
];
const PERSONALIZATION_REPURCHASE = [
  'your order', 'your shipment', 'your customers', 'michael', 'braun',
  'last order', 'previous order', 'you ordered',
];
const INCENTIVE_PATTERNS = [
  '%', 'discount', 'loyalty', 'special', 'offer', 'rate', 'exclusive',
  '折扣', '优惠', '优先',
];

export function analyzeRepurchaseEmail(text) {
  if (!text.trim()) {
    return [
      { label: '新产品/新颜色钩子', score: 0, hint: '给买家现在就行动的理由' },
      { label: '旺季紧迫感', score: 0, hint: 'Q4 提前 90 天跟进效果最好' },
      { label: '个性化（引用上次订单）', score: 0, hint: '让买家感受到你记得他' },
      { label: '忠诚激励（折扣/优惠）', score: 0, hint: '复购激励比首单折扣更有效' },
    ];
  }

  return [
    {
      label: '新产品/新颜色钩子',
      score: contains(text, PRODUCT_HOOK_PATTERNS) ? 1 : 0,
      hint: contains(text, PRODUCT_HOOK_PATTERNS)
        ? '新品钩子到位，给了买家行动理由'
        : '建议加入新颜色/新产品，给买家现在联系你的具体理由',
    },
    {
      label: '旺季紧迫感',
      score: contains(text, URGENCY_PATTERNS) ? 1 : 0,
      hint: contains(text, URGENCY_PATTERNS)
        ? '已创造紧迫感'
        : '建议提及 Q4 旺季备货或产能限制，促使买家提前决策',
    },
    {
      label: '个性化（引用上次订单）',
      score: contains(text, PERSONALIZATION_REPURCHASE) ? 1 : 0,
      hint: contains(text, PERSONALIZATION_REPURCHASE)
        ? '个性化到位，买家感到被重视'
        : '建议提及买家姓名或上次订单，区别于批量群发邮件',
    },
    {
      label: '忠诚激励（折扣/优先服务）',
      score: contains(text, INCENTIVE_PATTERNS) ? 1 : 0,
      hint: contains(text, INCENTIVE_PATTERNS)
        ? '已提供激励'
        : '建议加入复购优惠（如 5% 忠诚折扣）让买家感受到长期合作的价值',
    },
  ];
}
