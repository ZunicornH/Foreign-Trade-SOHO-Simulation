import { useState } from 'react';
import styles from './Stage89.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DimensionFeedback from '../components/DimensionFeedback.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { PRINCIPLES } from '../lib/principles.js';
import { SCENARIOS } from '../data/scenarios.js';
import { analyzeShipmentNotification } from '../lib/dimensionAnalysis.js';

// ── QC items ──────────────────────────────────────────────────────────────────
const QC_ITEMS = [
  {
    id: 'logo',
    title: '🔍 Logo 位置检验',
    report: '工厂验货报告显示：500 个产品中抽检 25 个，Logo 丝印位置偏左约 3mm。工厂表示这在行业标准公差范围内（±5mm），要求放行。',
    acceptLabel: '接受，公差在合理范围内，主动告知买家',
    rejectLabel: '拒绝，要求工厂重新校准并返工',
  },
  {
    id: 'lfgb_label',
    title: '✅ LFGB 标签核查',
    report: '抽检结果：LFGB 标志清晰，批次号 LOT-2024-0512 可追溯，认证有效期 2027 年 6 月。外包装标注符合德国市场要求。',
    acceptLabel: '通过，标签合规',
    rejectLabel: '标记为异常，要求进一步核查',
  },
  {
    id: 'thermal',
    title: '🌡️ 保温性能抽测',
    report: '随机抽测 5 只，注入 95°C 热水，12 小时后测温结果：52°C / 51°C / 53°C / 49°C / 52°C。所有样品均高于最低标准 50°C。',
    acceptLabel: '通过，保温性能达标',
    rejectLabel: '标记异常，要求全批次复测',
  },
];

// ── B/L items ─────────────────────────────────────────────────────────────────
const BL_FIELDS = [
  { id: 'shipper', label: '发货人（Shipper）', value: '深圳优杯科技有限公司 / Shenzhen YouCup Technology Co., Ltd.', hasError: false },
  { id: 'consignee', label: '收货人（Consignee）', value: 'Braun Kitchenwere GmbH, Hamburg, Germany', hasError: true, errorNote: '拼写错误：Kitchenwere → 应为 Kitchenware' },
  { id: 'description', label: '货物描述', value: 'Stainless Steel Vacuum Flask 500ml, QTY: 500 PCS', hasError: false },
  { id: 'hscode', label: 'HS 编码', value: '3924.90.0000 (Plastic Household Articles)', hasError: true, errorNote: 'HS 编码错误：保温杯应为 7323.93，而非 3924（塑料家用品）' },
  { id: 'port', label: '目的港', value: 'Hamburg, Germany', hasError: false },
];

export default function Stage8() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const s8 = state.stage8 || {};
  const subStep = s8.subStep || 'qc';

  // QC state
  const [qcDecisions, setQcDecisions] = useState(s8.qcDecisions || {});
  const [qcScenarioShown, setQcScenarioShown] = useState(false);
  const [qcScenarioDone, setQcScenarioDone] = useState(!!state.scenarioResults?.SCENARIO_QC_REJECT_MINOR);

  // B/L state
  const [blMarked, setBlMarked] = useState(s8.blErrorsFound || []);
  const [blSubmitted, setBlSubmitted] = useState(s8.blVerified || false);
  const [blWarning, setBlWarning] = useState(null);

  // Shipment notification state
  const [notifyText, setNotifyText] = useState(s8.shipmentNotifyText || '');
  const [notifySent, setNotifySent] = useState(s8.shipmentNotifySent || false);

  // Balance state
  const [balanceInput, setBalanceInput] = useState(s8.balanceAmount > 0 ? String(s8.balanceAmount) : '');
  const [telexWarning, setTelexWarning] = useState(false);

  const agreedPrice = state.negotiation?.agreedPrice || state.quoteDraft?.finalPriceUSD || 0;
  const qty = parseFloat(state.piDraft?.qty || 500);
  const totalOrder = agreedPrice * qty;
  const depositAmt = state.depositAmount || 0;
  const expectedBalance = Math.round((totalOrder * 0.7) * 100) / 100;

  function setSubStep(step) {
    dispatch({ type: 'SET_STAGE8', payload: { subStep: step } });
  }

  // ── QC ───────────────────────────────────────────────────────────────────────
  function handleQcDecision(id, decision) {
    const next = { ...qcDecisions, [id]: decision };
    setQcDecisions(next);
    dispatch({ type: 'SET_STAGE8', payload: { qcDecisions: next } });

    if (id === 'logo' && decision === 'reject' && !qcScenarioShown) {
      setQcScenarioShown(true);
    }
  }

  function handleQcScenarioChoice(choiceIdx) {
    const scenario = SCENARIOS.SCENARIO_QC_REJECT_MINOR;
    const opt = scenario.options[choiceIdx];
    dispatch({ type: 'SET_SCENARIO_RESULT', scenarioId: 'SCENARIO_QC_REJECT_MINOR', choice: choiceIdx, outcome: opt.outcome });
    if (opt.principleId && PRINCIPLES[opt.principleId]) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES[opt.principleId] });
    }
    setQcScenarioDone(true);
  }

  const allQcDone = QC_ITEMS.every((item) => qcDecisions[item.id]);

  function proceedToBlStep() {
    dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE8_QC_DONE' });
    setSubStep('bl');
  }

  // ── B/L ──────────────────────────────────────────────────────────────────────
  function toggleBlError(id) {
    setBlMarked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleBlSubmit() {
    const correctErrors = BL_FIELDS.filter((f) => f.hasError).map((f) => f.id);
    const missedErrors = correctErrors.filter((id) => !blMarked.includes(id));
    const falsePositives = blMarked.filter((id) => !correctErrors.includes(id));

    if (missedErrors.includes('hscode')) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_BL_MISMATCH });
      setBlWarning('你漏掉了 HS 编码错误（最严重的那个），请重新核对每一行。');
      return;
    }

    if (missedErrors.length > 0) {
      setBlWarning(`还有 ${missedErrors.length} 个错误未标记，请仔细逐行核对。`);
      return;
    }

    const allCorrectFound = correctErrors.every((id) => blMarked.includes(id));
    dispatch({ type: 'SET_STAGE8', payload: { blVerified: true, blErrorsFound: blMarked } });
    setBlSubmitted(true);
    if (allCorrectFound && falsePositives.length === 0) {
      dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE8_BL_ERRORS_FOUND' });
    }
  }

  // ── Shipment notification ─────────────────────────────────────────────────────
  const notifyDims = analyzeShipmentNotification(notifyText);
  const notifyScore = notifyDims.filter((d) => d.score === 1).length;

  function handleSendNotify() {
    if (notifyScore < 3) return;
    dispatch({ type: 'SET_STAGE8', payload: { shipmentNotifyText: notifyText, shipmentNotifySent: true } });
    setNotifySent(true);
  }

  // ── Balance ──────────────────────────────────────────────────────────────────
  function handleTelexAttempt() {
    if (!s8.balanceReceived) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_EARLY_TELEX });
      dispatch({ type: 'SET_STAGE8', payload: { telexAttempted: true } });
      dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_early_telex', level: 'error', message: '阶段8：尝试在尾款到账前放单' } });
      setTelexWarning(true);
    }
  }

  function handleBalanceConfirm() {
    const amt = parseFloat(balanceInput);
    if (!amt || amt <= 0) return;
    dispatch({ type: 'SET_STAGE8', payload: { balanceReceived: true, balanceAmount: amt } });

    const diff = Math.abs(amt - expectedBalance) / expectedBalance;
    if (diff > 0.05) {
      const scenario = SCENARIOS.SCENARIO_SHORT_PAYMENT;
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: {
        id: 'SHORT_PAYMENT',
        title: '尾款金额与预期不符',
        whatYouDid: `你录入的尾款金额 USD ${amt.toFixed(2)} 与应收金额 USD ${expectedBalance.toFixed(2)} 相差超过 5%。`,
        why: '国际电汇存在中间行手续费（USD 10–30），是正常现象。但超过 5% 的差额需要核实原因。常见情况：买家少汇款、汇率换算错误、银行手续费超出预期。',
        realLife: '如果是手续费，通常在 USD 15–30 之间。超过 USD 50 的差额，建议向买家索取汇款水单核实。',
        correctApproach: '首先核对买家汇款水单（MT103）。如确认是银行手续费，可接受并在下次 PI 中注明"all banking charges for buyer\'s account"。如金额差异较大，礼貌要求买家补汇差额。',
      }});
    }

    dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE8_TELEX_HELD' });
  }

  function handleGoToStage9() {
    dispatch({ type: 'SET_STAGE', stage: 9 });
  }

  const balanceReceived = s8.balanceReceived;

  // ── Render ────────────────────────────────────────────────────────────────────
  const stepLabels = ['8a 验货', '8b 提单', '8c 出运通知', '8d 尾款'];
  const stepKeys = ['qc', 'bl', 'shipment_notify', 'balance'];
  const currentIdx = stepKeys.indexOf(subStep);

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 8：生产 / 物流</div>
        <div className={styles.subtitle}>四个关键节点：验货 → 提单核对 → 出运通知 → 尾款到账</div>
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

      <ContextBriefing briefingKey={8}>

        {/* ── 8a: QC ─────────────────────────────────────────────────────────── */}
        {subStep === 'qc' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>8a. QC 验货决策</div>
            <div className={styles.sectionDesc}>
              工厂完成生产，共 500 件。以下是三份抽检报告，请对每项做出决策。
            </div>

            {QC_ITEMS.map((item) => (
              <div key={item.id} className={styles.qcItem}>
                <div className={styles.qcTitle}>{item.title}</div>
                <div className={styles.qcReport}>{item.report}</div>
                <div className={styles.qcBtns}>
                  <button
                    className={`${styles.qcBtn} ${qcDecisions[item.id] === 'accept' ? styles.qcAccepted : ''}`}
                    onClick={() => handleQcDecision(item.id, 'accept')}
                  >
                    ✓ {item.acceptLabel}
                  </button>
                  <button
                    className={`${styles.qcBtn} ${styles.qcBtnReject} ${qcDecisions[item.id] === 'reject' ? styles.qcRejected : ''}`}
                    onClick={() => handleQcDecision(item.id, 'reject')}
                  >
                    ✗ {item.rejectLabel}
                  </button>
                </div>
              </div>
            ))}

            {/* Logo reject scenario */}
            {qcScenarioShown && !qcScenarioDone && (
              <div className={styles.scenario}>
                <div className={styles.scenarioTitle}>⚡ {SCENARIOS.SCENARIO_QC_REJECT_MINOR.title}</div>
                <div className={styles.scenarioBody}>{SCENARIOS.SCENARIO_QC_REJECT_MINOR.body}</div>
                <div className={styles.scenarioQuestion}>{SCENARIOS.SCENARIO_QC_REJECT_MINOR.question}</div>
                <div className={styles.scenarioOptions}>
                  {SCENARIOS.SCENARIO_QC_REJECT_MINOR.options.map((opt, i) => (
                    <button key={i} className={styles.scenarioOpt} onClick={() => handleQcScenarioChoice(i)}>
                      {String.fromCharCode(65 + i)}. {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {qcScenarioDone && state.scenarioResults?.SCENARIO_QC_REJECT_MINOR && (
              <AlertBox
                level={state.scenarioResults.SCENARIO_QC_REJECT_MINOR.outcome === 'GOOD' ? 'success' : 'warn'}
                msg={SCENARIOS.SCENARIO_QC_REJECT_MINOR.options[state.scenarioResults.SCENARIO_QC_REJECT_MINOR.choice]?.explanation}
              />
            )}

            {allQcDone && (!qcScenarioShown || qcScenarioDone) && (
              <Button onClick={proceedToBlStep}>验货完成，进入提单核对 →</Button>
            )}
          </div>
        )}

        {/* ── 8b: B/L ────────────────────────────────────────────────────────── */}
        {subStep === 'bl' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>8b. 提单核对</div>
            <div className={styles.sectionDesc}>
              以下是货代发来的提单（B/L Draft）。其中有 <strong>2 处错误</strong>，请找出并勾选，然后提交。
            </div>

            <div className={styles.blTable}>
              {BL_FIELDS.map((field) => (
                <div key={field.id} className={`${styles.blRow} ${blMarked.includes(field.id) ? styles.blMarked : ''}`}>
                  <div className={styles.blLabel}>{field.label}</div>
                  <div className={styles.blValue}>{field.value}</div>
                  <label className={styles.blCheck}>
                    <input
                      type="checkbox"
                      checked={blMarked.includes(field.id)}
                      onChange={() => toggleBlError(field.id)}
                      disabled={blSubmitted}
                    />
                    {blSubmitted && field.hasError && blMarked.includes(field.id) && (
                      <span className={styles.blCorrectNote}>✓ 已识别错误：{field.errorNote}</span>
                    )}
                    {blSubmitted && !field.hasError && blMarked.includes(field.id) && (
                      <span className={styles.blWrongNote}>✗ 这项实际上是正确的</span>
                    )}
                  </label>
                </div>
              ))}
            </div>

            {blWarning && <AlertBox level="warn" msg={blWarning} />}

            {!blSubmitted ? (
              <Button onClick={handleBlSubmit} disabled={blMarked.length === 0}>
                提交核对结果
              </Button>
            ) : (
              <>
                <AlertBox level="success" msg="✅ 提单核对完成！正确识别了关键错误（HS 编码和收货人拼写），已通知货代更正。" />
                <Button onClick={() => setSubStep('shipment_notify')}>进入出运通知 →</Button>
              </>
            )}
          </div>
        )}

        {/* ── 8c: Shipment Notification ──────────────────────────────────────── */}
        {subStep === 'shipment_notify' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>8c. 出运通知邮件</div>
            <div className={styles.sectionDesc}>
              货物已出运，请给 Michael 写出运通知邮件。要包含 4 个关键要素（右侧实时分析）。
            </div>

            <div className={styles.notifyLayout}>
              <textarea
                className={styles.notifyArea}
                value={notifyText}
                onChange={(e) => setNotifyText(e.target.value)}
                placeholder={`Dear Michael,\n\nYour order has been shipped. Here are the details:\n\nTracking / B/L No: [编号]\nBalance due: USD [金额]\nPlease transfer by [具体日期]\n\nBank details: [PI 上的收款账户]\n\nBest regards,\n[Your Name]`}
                rows={10}
                disabled={notifySent}
              />
              <DimensionFeedback dimensions={notifyDims} />
            </div>

            {notifyScore < 3 && notifyText.trim() && (
              <AlertBox level="info" msg={`当前邮件包含 ${notifyScore}/4 个要素，至少需要 3 个才能发送。`} />
            )}

            {!notifySent ? (
              <Button onClick={handleSendNotify} disabled={notifyScore < 3 || !notifyText.trim()}>
                发送出运通知
              </Button>
            ) : (
              <>
                <AlertBox level="success" msg="✅ 出运通知已发送，现在等待买家付款。" />
                <Button onClick={() => setSubStep('balance')}>进入尾款确认 →</Button>
              </>
            )}
          </div>
        )}

        {/* ── 8d: Balance ─────────────────────────────────────────────────────── */}
        {subStep === 'balance' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>8d. 尾款到账确认</div>
            <div className={styles.sectionDesc}>
              应收尾款（70%）：<strong>USD {expectedBalance.toFixed(2)}</strong>。
              尾款到账前请勿放单（Telex Release）。
            </div>

            {telexWarning && (
              <AlertBox level="error" msg="⚠️ 你刚才尝试在尾款到账前放单，这是外贸最危险的操作之一。请先确认尾款到账再操作。" />
            )}

            {!balanceReceived ? (
              <>
                <div className={styles.balanceRow}>
                  <div>
                    <label className={styles.balanceLabel}>录入实收尾款金额（USD）</label>
                    <div className={styles.balanceInput}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        placeholder={`${expectedBalance.toFixed(2)}`}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.balanceBtns}>
                  <Button
                    onClick={handleBalanceConfirm}
                    disabled={!balanceInput || parseFloat(balanceInput) <= 0}
                  >
                    确认尾款已到账
                  </Button>
                  <button className={styles.telexDangerBtn} onClick={handleTelexAttempt}>
                    发出放单指令（Telex Release）
                  </button>
                </div>

                <div className={styles.telexNote}>
                  ⚠️ 在尾款到账前点击"放单"会触发原理说明
                </div>
              </>
            ) : (
              <>
                <div className={styles.balanceDone}>
                  <div className={styles.balanceDoneTitle}>✅ 尾款已到账</div>
                  <div className={styles.balanceDoneRow}>
                    <span>实收尾款</span>
                    <strong>USD {s8.balanceAmount?.toFixed(2)}</strong>
                  </div>
                  <div className={styles.balanceDoneRow}>
                    <span>现在可以安全放单（Telex Release）</span>
                  </div>
                </div>
                <AlertBox level="success" msg="✅ 恭喜！货款已全额收回。本次订单流程完成。" />
                <Button onClick={handleGoToStage9}>进入售后复购阶段 →</Button>
              </>
            )}
          </div>
        )}

      </ContextBriefing>
    </div>
  );
}
