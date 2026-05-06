import { useState } from 'react';
import styles from './Stage7.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DecisionQuiz from '../components/DecisionQuiz.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { checkPI } from '../lib/rules.js';

const HS_QUIZ_OPTIONS = [
  {
    label: '3924.10.00 — 塑料餐具及厨房用具',
    correct: false,
    explanation: '错误。这个编码适用于塑料制品。保温杯是不锈钢材质，归入金属制家用器皿类。HS 编码按材质分类，填错会影响关税税率计算，德国海关可能扣货查验。',
  },
  {
    label: '7323.93.90 — 不锈钢家用器皿',
    correct: true,
    explanation: '正确！7323 是"金属制家用器皿"章节，93 对应不锈钢，90 是其他细分。德国对此类产品关税约 3%。HS 编码一旦写错，可能面临：①买家清关延迟；②补缴关税差额；③与 Stage 8 提单不符导致退关。始终与货代确认最新版本。',
  },
  {
    label: '8418.99.00 — 制冷设备及零件',
    correct: false,
    explanation: '错误。8418 是制冷/冷冻设备的编码，保温杯不含机械制冷功能，不适用。HS 编码错误是外贸新手最常见的 PI 错误之一，轻则延误清关，重则按错误税率征税。',
  },
  {
    label: '4419.90.00 — 木制餐具',
    correct: false,
    explanation: '错误。4419 是木制品。这说明 HS 编码首先按材质区分——不锈钢制品一定在 7300 系列。不确定时联系货代，他们有专业数据库可以查询。',
  },
];

const PRE_SEND_CHECKS = [
  { id: 'desc_match', label: 'PI 产品描述与之前邮件中描述一致（无笔误/规格矛盾）' },
  { id: 'hs_verified', label: 'HS 编码已向货代核实（非凭记忆填写）' },
  { id: 'bank_confirmed', label: '收款账户已通过电话/视频与买家口头确认（防 BEC 诈骗）' },
];

export default function Stage7() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const neg = state.negotiation;
  const agreedPrice = neg.agreedPrice || state.quoteDraft.finalPriceUSD || 0;

  // Check if BEC principle was seen in Stage 6
  const becAcknowledged = state.principleAcks?.some((a) => a.id === 'PRINCIPLE_BEC') ||
    state.scenarioResults?.SCENARIO_BEC_ATTACK?.outcome === 'GOOD';

  const [form, setForm] = useState({
    productDesc: state.piDraft.productDesc || '不锈钢保温杯 500ml，双层真空，304不锈钢，BPA-free',
    spec: state.piDraft.spec || 'Ø70×H220mm, 280g, 304 stainless steel inner & outer',
    qty: state.piDraft.qty || '500',
    unitPrice: state.piDraft.unitPrice || agreedPrice.toFixed(2),
    totalPrice: state.piDraft.totalPrice || (agreedPrice * 500).toFixed(2),
    hsCode: state.piDraft.hsCode || '',
    tradeTerm: state.piDraft.tradeTerm || state.quoteDraft.tradeTerms || 'FOB',
    deliveryTime: state.piDraft.deliveryTime || '',
    bankAccount: state.piDraft.bankAccount || '',
  });

  const [warnings, setWarnings] = useState([]);
  const [piSent, setPiSent] = useState(!!state.piDraft.sent);
  const [depositAmt, setDepositAmt] = useState('');
  const [checks, setChecks] = useState({});

  function set(field, val) {
    const updated = { ...form, [field]: val };
    if (field === 'qty' || field === 'unitPrice') {
      const q = parseFloat(updated.qty) || 0;
      const u = parseFloat(updated.unitPrice) || 0;
      updated.totalPrice = (q * u).toFixed(2);
    }
    setForm(updated);
  }

  function toggleCheck(id) {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const allChecked = PRE_SEND_CHECKS.every((c) => checks[c.id]);

  function handleSendPI() {
    const check = checkPI(form);
    setWarnings(check.warnings || []);
    if (check.blocked) return;

    dispatch({ type: 'SET_PI_DRAFT', payload: { ...form, sent: true } });
    dispatch({ type: 'APPLY_SCORE', actionKey: 'PI_COMPLETE' });
    setPiSent(true);
  }

  function handleDepositReceived() {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) return;

    const totalPrice = parseFloat(form.totalPrice) || 0;
    const expectedDeposit = totalPrice * 0.3;
    const ratio = amt / expectedDeposit;

    // Warn if deposit is very low (< 20% of total or < 80% of expected)
    if (ratio < 0.8) {
      dispatch({
        type: 'ADD_RISK_FLAG',
        flag: { id: 'risk_deposit_low', level: 'warn', message: `定金仅 USD ${amt.toFixed(2)}，低于应收 30%（USD ${expectedDeposit.toFixed(2)}）。若对方同意但拒付尾款，你将损失大量货物成本。` },
      });
    }

    dispatch({ type: 'SET_DEPOSIT_RECEIVED', value: true, amount: amt });
    dispatch({ type: 'SET_STAGE', stage: 8 });
  }

  const totalPrice = parseFloat(form.totalPrice) || 0;
  const expectedDeposit = totalPrice * 0.3;
  const balanceAmt = totalPrice * 0.7;

  // Deposit range validation
  const depositNum = parseFloat(depositAmt) || 0;
  const depositRatio = totalPrice > 0 ? depositNum / totalPrice : 0;
  const depositRangeOk = depositRatio >= 0.25 && depositRatio <= 0.35;
  const depositRangeWarn = depositNum > 0 && !depositRangeOk;

  const piText = `PROFORMA INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seller: [Your Company]             Date: ${new Date().toLocaleDateString()}
Buyer:  Braun Kitchenware GmbH     PI No: PI-${Date.now().toString().slice(-6)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product:  ${form.productDesc || '—'}
Spec:     ${form.spec || '—'}
HS Code:  ${form.hsCode || '—'}
Qty:      ${form.qty || '—'} pcs
Unit Price: USD ${form.unitPrice || '—'} / pc
Total:    USD ${form.totalPrice || '—'}

Trade Term:    ${form.tradeTerm || '—'}
Delivery Time: ${form.deliveryTime || '—'}
Payment:       T/T 30% deposit, 70% before shipment

Bank Account: ${form.bankAccount || '—'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 7：PI & 定金确认</div>
        <div className={styles.subtitle}>生成形式发票（Proforma Invoice），发送给买家，录入定金到账记录</div>
      </div>

      <ContextBriefing briefingKey={7}>

        {!piSent ? (
          <>
            {/* HS Code quiz */}
            <DecisionQuiz
              quizId="STAGE7_HS_QUIZ"
              question="你正在出口不锈钢保温杯（500ml，双层真空，无电子元件）。以下哪个 HS 编码最准确？"
              options={HS_QUIZ_OPTIONS}
            />

            {/* BEC reminder — show if not yet acknowledged */}
            {!becAcknowledged && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid var(--color-error)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: 13, lineHeight: 1.65 }}>
                <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>⚠️ 填写银行账户前请注意：BEC 诈骗风险</div>
                <div>商业邮件欺诈（Business Email Compromise）是外贸中最高损失的诈骗类型之一。攻击者会黑入买家邮箱，在 PI 阶段发邮件要求更换你的收款账户。<br /><br />
                <strong>防范要点：</strong>收款账户一旦确认，任何要求"更改账户"的邮件都必须通过电话/视频向买家本人核实，不能只依赖邮件确认。</div>
              </div>
            )}

            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>产品描述 <span className={styles.required}>*</span></label>
                <input value={form.productDesc} onChange={(e) => set('productDesc', e.target.value)} placeholder="例：不锈钢保温杯 500ml，双层真空" />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>产品规格</label>
                <input value={form.spec} onChange={(e) => set('spec', e.target.value)} placeholder="例：Ø70×H220mm, 280g, 304SS" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>HS 编码 <span className={styles.required}>*</span></label>
                <input value={form.hsCode} onChange={(e) => set('hsCode', e.target.value)} placeholder="例：7323930000" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>贸易条款</label>
                <select value={form.tradeTerm} onChange={(e) => set('tradeTerm', e.target.value)}>
                  <option>FOB</option><option>CIF</option><option>DDP</option><option>EXW</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>数量（pcs）</label>
                <input type="number" min="1" value={form.qty} onChange={(e) => set('qty', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>单价（USD）</label>
                <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>总价（USD）</label>
                <input readOnly value={form.totalPrice} style={{ background: 'var(--color-bg)' }} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>预计交货期</label>
                <input value={form.deliveryTime} onChange={(e) => set('deliveryTime', e.target.value)} placeholder="例：30 days after deposit" />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>收款银行账户 <span className={styles.required}>*</span></label>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  填写后，请务必通过电话与买家核实你的账户（不依赖邮件确认）。
                </div>
                <input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} placeholder="例：Bank: HSBC Shanghai | Account: 123456789 | SWIFT: HSBCCNSH" />
              </div>
            </div>

            {/* PI Preview */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>PI 预览</div>
              <div className={styles.piPreview}>{piText}</div>
            </div>

            {/* Pre-send checklist */}
            <div className={styles.checklist}>
              <div className={styles.checklistTitle}>发送前强制确认清单（全部勾选才能发送）</div>
              {PRE_SEND_CHECKS.map((c) => (
                <label key={c.id} className={styles.checkRow}>
                  <input type="checkbox" checked={!!checks[c.id]} onChange={() => toggleCheck(c.id)} />
                  <span style={{ color: checks[c.id] ? 'var(--color-success)' : 'var(--color-text)' }}>{c.label}</span>
                </label>
              ))}
            </div>

            {!allChecked && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                请完成上方所有确认项后才能发送 PI。
              </div>
            )}

            <div className={styles.warnings}>
              {warnings.map((w, i) => <AlertBox key={i} level={w.level === 'block' ? 'error' : w.level} msg={w.msg} />)}
            </div>

            <Button onClick={handleSendPI} disabled={!allChecked}>确认并发送 PI →</Button>
          </>
        ) : (
          <>
            <AlertBox level="success" msg="✅ PI 已发送！等待买家确认并录入定金到账记录" />

            <div className={styles.piPreview}>{piText}</div>

            {!state.depositReceived ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>录入定金到账</div>
                <AlertBox level="info" msg={`行业惯例：T/T 30% 定金，即 USD ${expectedDeposit.toFixed(2)}（总价的 30%）。低于 25% 建议要求补足；高于 35% 极少见。`} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input type="number" min="0" step="0.01" value={depositAmt}
                    onChange={(e) => setDepositAmt(e.target.value)}
                    placeholder={`USD ${expectedDeposit.toFixed(2)}`}
                    style={{ width: 180 }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>USD 实收金额</span>
                </div>

                {depositRangeWarn && (
                  <AlertBox
                    level={depositRatio < 0.25 ? 'error' : 'warn'}
                    msg={
                      depositRatio < 0.25
                        ? `定金比例 ${(depositRatio * 100).toFixed(1)}% 低于行业安全线 25%。定金越低，买家违约成本越低。建议重新谈判。`
                        : `定金比例 ${(depositRatio * 100).toFixed(1)}% 高于惯例 35%，注意核实是否误操作。`
                    }
                  />
                )}

                <Button onClick={handleDepositReceived} disabled={!depositAmt || parseFloat(depositAmt) <= 0}>
                  定金已到账，进入生产阶段 →
                </Button>
              </div>
            ) : (
              <div className={styles.depositBox}>
                <div className={styles.depositTitle}>✅ 定金已到账</div>
                <div className={styles.depositRow}><span className={styles.depositLabel}>实收定金</span><strong>USD {state.depositAmount?.toFixed(2)}</strong></div>
                <div className={styles.depositRow}><span className={styles.depositLabel}>应收尾款</span><strong>USD {balanceAmt.toFixed(2)}</strong></div>
                <div className={styles.depositRow}><span className={styles.depositLabel}>预计收款</span><span>发货前 3–5 个工作日</span></div>
                <Button onClick={() => dispatch({ type: 'SET_STAGE', stage: 8 })}>进入生产 / 物流阶段 →</Button>
              </div>
            )}
          </>
        )}

      </ContextBriefing>
    </div>
  );
}
