export const SCORE_ACTIONS = {
  PROSPECTING_PASS: { points: 10, reason: '开发信通过规则检测' },
  PROSPECTING_HAS_CERT: { points: 5, reason: '开发信主动提及认证' },
  PROSPECTING_HAS_SAMPLE: { points: 5, reason: '开发信含样品邀请' },
  LOW_PRICE_WORDING: { points: -5, reason: '使用低价定位话术' },
  INQUIRY_REPLY_PASS: { points: 10, reason: '询盘回复规范完整' },
  INQUIRY_REPLY_RECOMMENDED: { points: 5, reason: '采用推荐回复模板' },
  QUOTE_HIGH_MARGIN: { points: 5, reason: '报价利润率 ≥ 30%' },
  QUOTE_LOW_MARGIN: { points: -10, reason: '报价利润率 < 15%' },
  NEGOTIATION_TRIPLE_CONCESSION: { points: -20, reason: '三次无条件让价' },
  NEGOTIATION_CREDIT_TERM: { points: -15, reason: '接受赊账付款条件' },
  NEGOTIATION_TT_DEPOSIT: { points: 10, reason: '锁定 T/T 30% 定金' },
  PI_COMPLETE: { points: 10, reason: 'PI 完整无误' },
  // Stage 6 v2
  STAGE6_FIRST_HOLD: { points: 10, reason: '首轮谈判坚守价格' },
  STAGE6_EXCHANGE_CONDITION: { points: 15, reason: '以条件交换换取让步' },
  STAGE6_BEC_DETECTED: { points: 15, reason: '识别并正确处理 BEC 诈骗' },
  STAGE6_BEC_FOOLED: { points: -25, reason: '被 BEC 诈骗攻击' },
  // Stage 8 v2
  STAGE8_QC_DONE: { points: 5, reason: '完成 QC 验货决策' },
  STAGE8_BL_ERRORS_FOUND: { points: 10, reason: '正确识别提单关键错误' },
  STAGE8_TELEX_HELD: { points: 10, reason: '尾款到账后才放单（保护货权）' },
  STAGE8_EARLY_TELEX: { points: -20, reason: '尾款到账前放单（丧失追索权）' },
  // Stage 9 v2
  STAGE9_COMPLAINT_CORRECT: { points: 10, reason: '投诉处理流程正确（先取证）' },
  STAGE9_REPURCHASE_COMPLETE: { points: 15, reason: '复购邮件四要素完整' },
};

export function applyScore(scoreCard, actionKey) {
  const action = SCORE_ACTIONS[actionKey];
  if (!action) return scoreCard;
  const newTotal = (scoreCard.total || 0) + action.points;
  return {
    total: Math.max(0, Math.min(100, newTotal)),
    items: [
      ...(scoreCard.items || []),
      { key: actionKey, points: action.points, reason: action.reason, ts: Date.now() },
    ],
  };
}
