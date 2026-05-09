// Rubric definitions for LLM-driven evaluation (Phase 5).
// Each rubric describes 3-4 dimensions; the `buildContext` fn injects
// case-specific details so the LLM judges the user's text against the
// actual product / market / buyer.

import { getActiveCase } from './caseContext.js';

/**
 * @typedef {{ key: string, label: string, weight?: number }} Dimension
 * @typedef {{ dimensions: Dimension[], context: string }} Rubric
 */

const PROSPECTING_DIMS = [
  { key: 'personalization', label: '个性化（针对买家公司 / 市场，非泛泛）' },
  { key: 'cert_credibility', label: '认证可信度（具体编号 / 有效期）' },
  { key: 'cta_strength', label: 'CTA 行动号召强度' },
  { key: 'avoid_low_price', label: '避免低价定位话术（不用 cheapest / lowest）' },
];

const INQUIRY_REPLY_DIMS = [
  { key: 'specs', label: '产品规格完整（尺寸 / 重量 / 材质）' },
  { key: 'trade_terms', label: '贸易条款明确（FOB / CIF / DDP）' },
  { key: 'cert_mention', label: '认证主动提及（编号 / 有效期）' },
  { key: 'payment_terms', label: '付款条件清晰（T/T 比例 / 时点）' },
];

const SHIPMENT_NOTIFY_DIMS = [
  { key: 'tracking', label: '追踪号 / B/L 引用' },
  { key: 'balance', label: '尾款金额明确' },
  { key: 'deadline', label: '付款截止日期具体' },
  { key: 'product_specific', label: '产品特定提示（易碎 / 合规 / 储存等）' },
];

const REPURCHASE_DIMS = [
  { key: 'newProduct', label: '新品 / 系列引导' },
  { key: 'urgency', label: '紧迫感 / 季节钩' },
  { key: 'personalization', label: '个性化称呼 + 投诉处理回应' },
  { key: 'loyalty', label: '忠诚度激励（折扣 / 优先档期）' },
];

const USP_DIMS = [
  { key: 'specificity', label: '具体性（非泛泛描述）' },
  { key: 'verifiability', label: '可验证性（认证编号 / 材质 / 规格）' },
  { key: 'market_fit', label: '市场针对性（贴合买家所在市场）' },
];

/**
 * Build a context string for the LLM judge based on the active case.
 * Used to anchor evaluations to the user's actual product / market.
 */
function buildBaseContext(state) {
  const c = getActiveCase(state);
  const persona = c?.buyerPersona || {};
  const certs = (c?.requiredCerts || [])
    .filter((x) => x.mandatory)
    .map((x) => x.name)
    .join(' / ') || 'main certifications';
  return `Product: ${c?.product || state?.trainingCase?.product || 'unspecified product'}. Target market: ${c?.targetMarket || persona.country || 'unspecified'}. Buyer: ${persona.name || 'a foreign procurement manager'} (${persona.role || 'Procurement'}, ${persona.company || ''}). Key certifications: ${certs}. Cultural notes: ${c?.culturalNotes || 'standard professional buyer'}.`;
}

/**
 * Get a fully-built rubric for a given key, with context injected from current state.
 * @returns {Rubric}
 */
export function getRubric(key, state) {
  const base = buildBaseContext(state);
  switch (key) {
    case 'prospecting_email':
      return {
        dimensions: PROSPECTING_DIMS,
        context: `${base} The student wrote a cold-outreach email to this buyer. Evaluate whether the email earns a reply from this specific buyer.`,
      };
    case 'inquiry_reply':
      return {
        dimensions: INQUIRY_REPLY_DIMS,
        context: `${base} The buyer sent an inquiry asking for product details and pricing. Evaluate whether the student's reply gives the buyer enough information to make a purchasing decision.`,
      };
    case 'shipment_notification':
      return {
        dimensions: SHIPMENT_NOTIFY_DIMS,
        context: `${base} The student is writing the shipment-notification email after goods leave the factory. Evaluate completeness so the buyer can prepare payment + customs handover.`,
      };
    case 'repurchase_email':
      return {
        dimensions: REPURCHASE_DIMS,
        context: `${base} 60 days have passed since a complaint was resolved. The student writes a re-engagement email to drive a Q4 repurchase. Evaluate whether the email gives the buyer concrete reasons to act now.`,
      };
    case 'usp_quality':
      return {
        dimensions: USP_DIMS,
        context: `${base} The student declared their product's USP (差异化卖点) for this market. Evaluate whether the USP is concrete enough to differentiate vs. competing suppliers.`,
      };
    default:
      return null;
  }
}

export const RUBRIC_KEYS = Object.freeze({
  PROSPECTING: 'prospecting_email',
  INQUIRY_REPLY: 'inquiry_reply',
  SHIPMENT: 'shipment_notification',
  REPURCHASE: 'repurchase_email',
  USP: 'usp_quality',
});
