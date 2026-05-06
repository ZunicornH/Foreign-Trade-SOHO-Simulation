import { useState } from 'react';
import styles from './Stage89.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DimensionFeedback from '../components/DimensionFeedback.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { PRINCIPLES } from '../lib/principles.js';
import { analyzeRepurchaseEmail } from '../lib/dimensionAnalysis.js';

const COMPLAINT_EMAIL = `Hi,

We received the shipment last week — thank you for the prompt delivery.

However, we've noticed that approximately 30 units out of the 500 have a visible color variation on the matte coating, compared to the approved sample. Several of our retail customers have already commented on this.

We'd like to understand how you plan to resolve this issue.

Best regards,
Michael Braun
Braun Kitchenware GmbH`;

const COMPLAINT_OPTIONS = [
  {
    label: 'A. 立刻提出全额退款',
    detail: '主动提出全部 500 件货款退还',
    outcome: 'BAD',
    principleId: 'PRINCIPLE_EAGER_REFUND',
    explanation: null,
  },
  {
    label: 'B. 要求买家提供照片/视频证据，同时向工厂反馈',
    detail: '先取证，确认问题范围，再决定补偿方案',
    outcome: 'GOOD',
    explanation: '正确！先取证是处理投诉的第一步。没有照片证据你无法向工厂索赔，工厂可以否认任何责任。取证后你才能准确判断：①问题范围（30件？还是更多？）②责任方（工厂质量问题？还是运输损坏？）③最合适的补偿方式。',
  },
  {
    label: 'C. 告知买家这是正常的色差，在行业范围内',
    detail: '解释颜色轻微差异属于制造工艺正常波动',
    outcome: 'BAD',
    principleId: 'PRINCIPLE_DENY_COMPLAINT',
    explanation: null,
  },
  {
    label: 'D. 立刻补发 30 件，不需要看证据',
    detail: '直接安排补发，维护客户关系',
    outcome: 'OK',
    explanation: '出发点好，但操作顺序有问题。在没有证据的情况下补发，工厂可以否认责任，补发费用将全部由你承担。正确顺序：先取证 → 确认工厂责任 → 由工厂承担补发费用。',
  },
];

const COMPENSATION_OPTIONS = [
  {
    label: '补发 30 件（要求工厂承担）',
    detail: '向工厂出示照片证据，要求工厂承担补发费用和运费',
    outcome: 'GOOD',
    explanation: '最优方案。你有照片证据，工厂有责任承担补发。这保住了你的利润，也向买家展示了你的专业性和执行力。',
  },
  {
    label: '下次订单提供 5% 折扣',
    detail: '承诺在下一笔订单中给予忠诚折扣作为补偿',
    outcome: 'OK',
    explanation: '可接受，但前提是买家愿意接受。如果买家更希望看到立即解决问题的行动，折扣承诺可能显得缺乏诚意。建议结合"补发部分"使用，而不是单独作为解决方案。',
  },
  {
    label: '退款 30 件单价',
    detail: '退还 30 件货物对应的金额，不补货',
    outcome: 'OK',
    explanation: '可接受，但要核算：30 件 × USD 5.xx = 约 USD 175。这会直接减少你的利润。如果工厂愿意承担补发，补发方案对你来说成本更低，且买家的满意度通常更高（因为他得到了完整的货）。',
  },
];

export default function Stage9() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const s9 = state.stage9 || {};
  const subStep = s9.subStep || 'complaint';

  // QC context from stage 8: if user accepted the logo tolerance, factory has leverage
  const qcAcceptedLogo = state.stage8?.qcDecisions?.logo === 'accept';

  const [complaintChoice, setComplaintChoice] = useState(s9.complaintChoice ?? null);
  const [complaintFeedback, setComplaintFeedback] = useState(null);
  const [compensationChoice, setCompensationChoice] = useState(s9.compensationChoice ?? null);
  const [repurchaseText, setRepurchaseText] = useState(s9.repurchaseEmail || '');
  const [repurchaseSent, setRepurchaseSent] = useState(s9.repurchaseSent || false);

  const repurchaseDims = analyzeRepurchaseEmail(repurchaseText);
  const repurchaseScore = repurchaseDims.filter((d) => d.score === 1).length;

  function setSubStep(step) {
    dispatch({ type: 'SET_STAGE9', payload: { subStep: step } });
  }

  function handleComplaintChoice(idx) {
    const opt = COMPLAINT_OPTIONS[idx];
    setComplaintChoice(idx);
    dispatch({ type: 'SET_STAGE9', payload: { complaintChoice: idx } });

    if (opt.outcome === 'BAD' && opt.principleId) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES[opt.principleId] });
    } else {
      setComplaintFeedback(opt);
      if (opt.outcome === 'GOOD') {
        dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE9_COMPLAINT_CORRECT' });
      }
    }
  }

  function handleCompensationChoice(idx) {
    const opt = COMPENSATION_OPTIONS[idx];
    setCompensationChoice(idx);
    dispatch({ type: 'SET_STAGE9', payload: { compensationChoice: idx } });
  }

  function proceedToCompensation() {
    setSubStep('compensation');
  }

  function proceedToRepurchase() {
    setSubStep('repurchase');
  }

  function handleSendRepurchase() {
    dispatch({ type: 'SET_STAGE9', payload: { repurchaseEmail: repurchaseText, repurchaseSent: true } });
    setRepurchaseSent(true);
    dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE9_REPURCHASE_COMPLETE' });
  }

  const stepLabels = ['9a 投诉处理', '9b 补偿方案', '9c 复购邮件'];
  const stepKeys = ['complaint', 'compensation', 'repurchase'];
  const currentIdx = stepKeys.indexOf(subStep);

  const selectedComplaint = complaintChoice !== null ? COMPLAINT_OPTIONS[complaintChoice] : null;
  const complaintDone = selectedComplaint?.outcome === 'GOOD' || selectedComplaint?.outcome === 'OK';

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 9：售后复购</div>
        <div className={styles.subtitle}>投诉处理 → 补偿方案 → 复购跟进</div>
      </div>

      {/* Sub-step indicator */}
      <div className={styles.stepRow}>
        {stepLabels.map((label, i) => (
          <div
            key={i}
            className={`${styles.stepChip} ${i === currentIdx ? styles.stepActive : i < currentIdx ? styles.stepDone : ''}`}
          >
            {i < currentIdx ? '✓ ' : ''}{label}
          </div>
        ))}
      </div>

      <ContextBriefing briefingKey={9}>

        {/* ── 9a: Complaint ───────────────────────────────────────────────────── */}
        {subStep === 'complaint' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>9a. 投诉处理</div>
            <div className={styles.sectionDesc}>
              货物发出 3 周后，Michael 发来以下邮件。请选择你的第一步应对策略。
            </div>

            <div className={styles.complaintCard}>
              <div className={styles.complaintFrom}>📨 Michael Braun — Braun Kitchenware GmbH</div>
              <div className={styles.complaintBody}>{COMPLAINT_EMAIL}</div>
            </div>

            {/* Cross-stage context */}
            {qcAcceptedLogo && (
              <AlertBox
                level="info"
                msg="📋 阶段8上下文：你在验货时接受了 Logo 偏移 3mm 的公差。工厂现在可以援引这个决定，声称色差也属于公差范围内，这会降低你向工厂索赔的筹码。"
              />
            )}

            <div className={styles.sectionTitle} style={{ fontSize: 14 }}>你的第一步是什么？</div>
            <div className={styles.compOptions}>
              {COMPLAINT_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  className={`${styles.compOption} ${complaintChoice === i ? styles.compOptionSelected : ''}`}
                  onClick={() => handleComplaintChoice(i)}
                  disabled={complaintDone && complaintChoice !== i}
                >
                  <div className={styles.compOptionLabel}>{opt.label}</div>
                  <div className={styles.compOptionDetail}>{opt.detail}</div>
                </button>
              ))}
            </div>

            {complaintFeedback && (
              <AlertBox
                level={complaintFeedback.outcome === 'GOOD' ? 'success' : 'warn'}
                msg={complaintFeedback.explanation}
              />
            )}

            {complaintDone && (
              <Button onClick={proceedToCompensation}>确定处理策略，查看证据后制定补偿方案 →</Button>
            )}
          </div>
        )}

        {/* ── 9b: Compensation ────────────────────────────────────────────────── */}
        {subStep === 'compensation' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>9b. 补偿方案</div>
            <div className={styles.sectionDesc}>
              买家发来了 5 张照片，确认 30 件产品底部喷漆不均匀，与样品存在可见色差。
              请选择补偿方案。
            </div>

            {/* Evidence summary */}
            <div className={styles.qcItem}>
              <div className={styles.qcTitle}>📸 证据摘要</div>
              <div className={styles.qcReport}>
                问题：30/500 件（6%）产品底部喷漆色差，偏向深灰，与样品的标准哑光黑有明显差异。<br />
                买家影响：已有零售客户反映，部分产品需要退货处理。<br />
                {qcAcceptedLogo
                  ? '⚠️ 注意：由于你在阶段8接受了工厂的Logo公差，工厂可能援引此例否认色差责任。建议在与工厂沟通时强调色差问题与Logo偏移是不同类型的质量缺陷。'
                  : '✅ 优势：你在阶段8通过了严格的QC检验，工厂对产品质量有明确承诺，索赔筹码更强。'}
              </div>
            </div>

            <div className={styles.sectionTitle} style={{ fontSize: 14 }}>你的补偿方案？</div>
            <div className={styles.compOptions}>
              {COMPENSATION_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  className={`${styles.compOption} ${compensationChoice === i ? styles.compOptionSelected : ''}`}
                  onClick={() => handleCompensationChoice(i)}
                >
                  <div className={styles.compOptionLabel}>{opt.label}</div>
                  <div className={styles.compOptionDetail}>{opt.detail}</div>
                </button>
              ))}
            </div>

            {compensationChoice !== null && (
              <AlertBox
                level={COMPENSATION_OPTIONS[compensationChoice].outcome === 'GOOD' ? 'success' : 'info'}
                msg={COMPENSATION_OPTIONS[compensationChoice].explanation}
              />
            )}

            {compensationChoice !== null && (
              <Button onClick={proceedToRepurchase}>
                补偿方案确定，60天后跟进复购 →
              </Button>
            )}
          </div>
        )}

        {/* ── 9c: Repurchase ──────────────────────────────────────────────────── */}
        {subStep === 'repurchase' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>9c. 复购跟进邮件</div>
            <div className={styles.sectionDesc}>
              投诉已妥善处理，60 天已过。现在是 Q4 旺季前，请写一封复购跟进邮件。
              包含 4 个要素（右侧实时分析），全部达成可解锁底层原理卡片。
            </div>

            <div className={styles.repurchaseLayout}>
              <textarea
                className={styles.notifyArea}
                value={repurchaseText}
                onChange={(e) => setRepurchaseText(e.target.value)}
                placeholder={`Dear Michael,\n\nI hope the replacement units arrived safely and your customers are satisfied.\n\nWe've just launched two new colorways — Matte Black and Forest Green — that have been very popular this season. As a valued customer, I'd like to offer you a 5% loyalty discount on your next order of 500+ pcs.\n\nAlso, Q4 is our peak production season and slots are filling up fast. I'd recommend confirming by [date] to secure your lead time for the holiday season.\n\nWould you like me to prepare an updated quotation?\n\nBest regards,\n[Your Name]`}
                rows={12}
                disabled={repurchaseSent}
              />
              <DimensionFeedback dimensions={repurchaseDims} />
            </div>

            {repurchaseScore < 4 && repurchaseText.trim() && (
              <AlertBox level="info" msg={`当前包含 ${repurchaseScore}/4 个复购要素，建议补充缺失的维度（见右侧分析）。`} />
            )}

            {!repurchaseSent ? (
              <Button onClick={handleSendRepurchase} disabled={!repurchaseText.trim() || repurchaseScore < 2}>
                发送复购邮件
              </Button>
            ) : (
              <>
                <AlertBox level="success" msg="✅ 复购邮件已发送！Michael 已回复，表示有兴趣讨论 Q4 订单。" />

                {repurchaseScore === 4 && (
                  <div className={styles.principleUnlock}>
                    <div className={styles.principleUnlockBadge}>🔓 底层原理解锁</div>
                    <div className={styles.principleUnlockTitle}>复购邮件的经济学</div>
                    <div className={styles.principleUnlockText}>
                      获取一个新客户的成本是维护现有客户的 5–7 倍（哈佛商业评论数据）。Michael 已经验证了你的产品质量（经过这次投诉处理），信任成本已经付出完毕。
                      这封复购邮件的目的不是说服他重新信任你，而是给他一个<strong>现在就行动的具体理由</strong>——新产品 + 旺季紧迫感 + 忠诚折扣，三个触发点叠加，才能打破他的"等等看"惰性。
                      长期客户的 LTV（生命周期价值）通常是首单的 8–12 倍，值得你投入持续维护的精力。
                    </div>
                  </div>
                )}

                <AlertBox level="success" msg="🎉 恭喜完成全部 9 个阶段的外贸 SOHO 模拟训练！你已经走完了从选品到复购的完整流程。" />
              </>
            )}
          </div>
        )}

      </ContextBriefing>
    </div>
  );
}
