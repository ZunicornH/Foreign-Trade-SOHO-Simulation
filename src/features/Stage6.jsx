import { useState } from 'react';
import styles from './Stage6.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DecisionQuiz from '../components/DecisionQuiz.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { checkNegotiationReply, containsRisk, CREDIT_TERM_PATTERNS, CONCESSION_EXCHANGE_PATTERNS } from '../lib/rules.js';
import { BUYER_SCRIPTS } from '../data/seed.js';
import { PRINCIPLES } from '../lib/principles.js';
import { SCENARIOS } from '../data/scenarios.js';

const STRATEGY_TAGS = [
  { id: 'hold', label: '坚守价格', hint: '解释价值来源，不让步' },
  { id: 'exchange', label: '条件交换', hint: '让步但要求增量/更快付款' },
  { id: 'inquiry', label: '询问顾虑', hint: '了解买家具体顾虑再应对' },
  { id: 'value', label: '解释价值', hint: '用认证/品质说明价格合理性' },
];

const REPLY_HINTS = [
  "I understand your concern. Our price reflects the LFGB certification cost and 304 stainless steel quality. I can offer a 3% discount if you can increase the order to 1,000 pcs.",
  "Thank you for the feedback. Could you share what specific aspect of the pricing is challenging? Our LFGB certification alone adds significant compliance value for the German market.",
  "I can work with you on price if we confirm T/T 30% deposit and 70% before shipment. Shall we proceed on that basis?",
  "This is our best price for this quality and certification level. We'd prefer to maintain the quality rather than cut corners on materials.",
  "If you can commit to 2 orders this year (500 pcs each), I can offer USD 0.20/pc off the current price as a volume loyalty rate.",
];

export default function Stage6() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const neg = state.negotiation;
  const quotedPrice = state.quoteDraft.finalPriceUSD || 0;

  const [reply, setReply] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingConcession, setPendingConcession] = useState(null);
  const [roundFeedback, setRoundFeedback] = useState(null);
  const [becDone, setBecDone] = useState(!!state.scenarioResults?.SCENARIO_BEC_ATTACK);

  const currentRound = neg.currentRound || 0;
  const concessionCount = neg.concessionCount || 0;
  const currentProfitRate = neg.currentProfitRate || state.quoteDraft.profitRate || 0;
  const agreedPrice = neg.agreedPrice || quotedPrice;
  const preQuizDone = neg.preQuizDone || false;

  const nextScript = BUYER_SCRIPTS[currentRound];
  // BEC scenario triggers after round 4 (index 4 = round 5)
  const becScriptIndex = 4;
  const allRoundsDone = currentRound >= BUYER_SCRIPTS.length;
  const showBecScenario = currentRound === becScriptIndex && !becDone && !allRoundsDone;

  function detectConcessionInReply(text) {
    const lower = text.toLowerCase().replace(/\s+/g, ' ');
    const hasExchange = containsRisk(text, CONCESSION_EXCHANGE_PATTERNS);
    const nums = lower.match(/usd?\s*(\d+\.?\d*)/g) || [];
    const mentionsLower = nums.some((n) => {
      const val = parseFloat(n.replace(/usd?\s*/i, ''));
      return val > 0 && val < agreedPrice;
    });
    if (mentionsLower || /can offer|offer you|make it|accept|agree/i.test(lower)) {
      return hasExchange ? 'exchange' : 'concession';
    }
    return 'hold';
  }

  function handleSubmitReply() {
    if (!selectedStrategy) {
      setWarnings([{ level: 'warn', msg: '请先选择本轮策略标签，再提交回复' }]);
      return;
    }

    const { warnings: ruleWarnings } = checkNegotiationReply(reply, concessionCount);
    const newWarnings = [...ruleWarnings];

    // Credit term detection — hard stop
    if (containsRisk(reply, CREDIT_TERM_PATTERNS)) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_BEC ? {
        ...PRINCIPLES.PRINCIPLE_EAGER_CONCESSION,
        id: 'PRINCIPLE_CREDIT_TERM_NEG',
        title: '接受赊账条款：高风险资金敞口',
        whatYouDid: '你在回复中接受或提到了 Net 30/60/90 赊账付款条件。',
        why: 'Net 60 意味着你先垫付工厂货款、认证费、运费，60 天后才能收款。按年化 5% 计算，垫资 USD 5,000 × 60 天 = USD 41 的资金成本。更大的风险：60 天后买家若资金出问题，你的整批货款可能损失殆尽。T/T 30% 定金是行业标准，是有原因的。',
        realLife: '某 SOHO 卖家接受 Net 90，买家 70 天后申请破产，货款 €12,000 全部损失。',
        correctApproach: '坚持 T/T 30% 定金 + 70% 发货前付清。如果买家坚持赊账，可以提议"信用证（L/C）"作为中间方案——银行担保，买家接受度更高。',
      } : PRINCIPLES.PRINCIPLE_EAGER_CONCESSION });
      dispatch({ type: 'APPLY_SCORE', actionKey: 'NEGOTIATION_CREDIT_TERM' });
      dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_credit_term', level: 'error', message: '阶段6：接受赊账/延期付款条款，高风险' } });
      setWarnings(newWarnings);
      return;
    }

    // Strategy mismatch detection
    if (selectedStrategy === 'hold' && /can offer|offer you|accept|agree|ok with/i.test(reply.toLowerCase())) {
      newWarnings.push({ level: 'warn', msg: '你选择了"坚守价格"策略，但回复中检测到让步信号，策略与内容不一致。' });
    }

    dispatch({ type: 'ADD_ROUND_STRATEGY', strategy: selectedStrategy });

    const concessionType = detectConcessionInReply(reply);
    let newCount = concessionCount;
    let newPrice = agreedPrice;
    let newProfitRate = currentProfitRate;

    if (concessionType === 'concession') {
      newCount = concessionCount + 1;
      const discountPct = nextScript?.discountPct || 0.05;
      newPrice = agreedPrice * (1 - discountPct);
      const costUSD = quotedPrice * (1 - (state.quoteDraft.profitRate || 0.25));
      newProfitRate = costUSD > 0 ? (newPrice - costUSD) / newPrice : currentProfitRate;

      if (newProfitRate < 0.10) {
        setPendingConcession({ newCount, newPrice: Math.round(newPrice * 100) / 100, newProfitRate: Math.round(newProfitRate * 1000) / 1000 });
        setShowConfirm(true);
        setWarnings(newWarnings);
        return;
      }

      if (newCount >= 3) {
        dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_TRIPLE_CONCESSION });
        dispatch({ type: 'APPLY_SCORE', actionKey: 'NEGOTIATION_TRIPLE_CONCESSION' });
        dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_triple_concession', level: 'error', message: '阶段6：连续三次无条件让价，谈判失控' } });
        setWarnings(newWarnings);
        return;
      }

      applyNegUpdate(newCount, Math.round(newPrice * 100) / 100, Math.round(newProfitRate * 1000) / 1000);
    } else if (concessionType === 'exchange') {
      const discountPct = nextScript?.discountPct || 0.05;
      newPrice = agreedPrice * (1 - discountPct * 0.4);
      const costUSD = quotedPrice * (1 - (state.quoteDraft.profitRate || 0.25));
      newProfitRate = costUSD > 0 ? (newPrice - costUSD) / newPrice : currentProfitRate;
      applyNegUpdate(0, Math.round(newPrice * 100) / 100, Math.round(newProfitRate * 1000) / 1000);
      dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE6_EXCHANGE_CONDITION' });
    } else {
      // held firm
      if (currentRound === 0) {
        dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE6_FIRST_HOLD' });
      }
    }

    // Buyer mood update
    const mood = concessionType === 'hold' ? 'softening' : concessionType === 'exchange' ? 'neutral' : 'hardening';
    dispatch({ type: 'SET_NEGOTIATION', payload: { buyerMood: mood } });

    // Round feedback
    setRoundFeedback({
      strategy: selectedStrategy,
      concessionType,
      newProfitRate: concessionType !== 'hold' ? newProfitRate : currentProfitRate,
      mood,
    });

    setWarnings(newWarnings);
    finalizeRound();
  }

  function applyNegUpdate(newCount, price, profitRate) {
    dispatch({ type: 'SET_NEGOTIATION', payload: {
      concessionCount: newCount,
      agreedPrice: price,
      currentProfitRate: profitRate,
    }});
  }

  function finalizeRound() {
    dispatch({ type: 'ADD_NEGOTIATION_MESSAGE', message: { role: 'user', content: reply, round: currentRound + 1 } });
    dispatch({ type: 'SET_NEGOTIATION', payload: { currentRound: currentRound + 1 } });
    setReply('');
    setSelectedStrategy(null);
  }

  function confirmLowMargin() {
    if (pendingConcession) {
      applyNegUpdate(pendingConcession.newCount, pendingConcession.newPrice, pendingConcession.newProfitRate);
      dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_low_margin_neg', level: 'error', message: `阶段6：谈判后利润率 ${(pendingConcession.newProfitRate * 100).toFixed(1)}%，低于 10%` } });
      finalizeRound();
    }
    setShowConfirm(false);
    setPendingConcession(null);
  }

  function handleBecChoice(choiceIdx) {
    const scenario = SCENARIOS.SCENARIO_BEC_ATTACK;
    const opt = scenario.options[choiceIdx];
    dispatch({ type: 'SET_SCENARIO_RESULT', scenarioId: 'SCENARIO_BEC_ATTACK', choice: choiceIdx, outcome: opt.outcome });

    if (opt.outcome === 'BAD' && opt.principleId) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES[opt.principleId] });
      dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE6_BEC_FOOLED' });
      dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_bec', level: 'error', message: '阶段6：被 BEC 诈骗攻击，更改了收款账户' } });
    } else if (opt.outcome === 'GOOD') {
      dispatch({ type: 'APPLY_SCORE', actionKey: 'STAGE6_BEC_DETECTED' });
    }
    setBecDone(true);
    dispatch({ type: 'SET_NEGOTIATION', payload: { becScenarioTriggered: true } });
  }

  function handleNext() {
    dispatch({ type: 'SET_STAGE', stage: 7 });
    dispatch({ type: 'APPLY_SCORE', actionKey: 'NEGOTIATION_TT_DEPOSIT' });
  }

  const moodLabel = { neutral: '中立', softening: '软化（你坚守住了）', hardening: '强硬（继续施压）' };
  const canProceed = (allRoundsDone || currentRound >= 3) && currentProfitRate >= 0.10 && neg.paymentTermConfirmed && neg.depositRatioConfirmed && becDone;

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 6：谈判模拟</div>
        <div className={styles.subtitle}>5 轮买家砍价，使用策略标签指导每轮回复，锁定付款条件</div>
      </div>

      <ContextBriefing briefingKey={6}>

        {/* Pre-negotiation quiz */}
        {!preQuizDone && (
          <DecisionQuiz
            quizId="NEG_PRE_QUIZ"
            question="买家发来第一封邮件，要求 5% 折扣。你的第一反应应该是什么？"
            options={[
              {
                label: '直接拒绝，不做任何解释',
                correct: false,
                explanation: '生硬拒绝会让买家觉得你不重视合作，而且没有提供任何价值论据。买家下一步可能直接找其他供应商。',
              },
              {
                label: '立刻答应，先成交再说',
                correct: false,
                principleId: 'PRINCIPLE_EAGER_CONCESSION',
                explanation: '第一轮立刻让步会向买家传递"还有更多空间"的信号，之后每轮都会继续压价。',
              },
              {
                label: '询问他的顾虑，同时准备条件交换（推荐）',
                correct: true,
                explanation: '正确！询问顾虑让你了解买家的真实需求（是预算问题？竞争对手报价？还是试探？），从而制定针对性策略。同时保留条件交换的空间——如果必须让步，要求增量或更快付款作为交换。',
              },
              {
                label: '要求买家先付定金，再谈价格',
                correct: false,
                explanation: '顺序颠倒了。在价格未达成共识之前谈定金，会让买家觉得你不专业。应该先锁定价格，再谈付款条件。',
              },
            ]}
            onCorrect={() => dispatch({ type: 'SET_NEGOTIATION', payload: { preQuizDone: true } })}
          />
        )}

        {preQuizDone && (
          <>
            {/* Tracker */}
            <div className={styles.tracker}>
              <div className={styles.trackerItem}>
                <span className={styles.trackerLabel}>当前报价</span>
                <span className={styles.trackerValue}>USD {agreedPrice.toFixed(2)}</span>
              </div>
              <div className={styles.trackerItem}>
                <span className={styles.trackerLabel}>利润率</span>
                <span className={styles.trackerValue} style={{ color: currentProfitRate < 0.10 ? 'var(--color-error)' : currentProfitRate < 0.15 ? 'var(--color-warn)' : 'var(--color-success)' }}>
                  {(currentProfitRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className={styles.trackerItem}>
                <span className={styles.trackerLabel}>让价次数</span>
                <span className={styles.trackerValue} style={{ color: concessionCount >= 3 ? 'var(--color-error)' : concessionCount >= 2 ? 'var(--color-warn)' : 'inherit' }}>
                  {concessionCount} 次
                </span>
              </div>
              <div className={styles.trackerItem}>
                <span className={styles.trackerLabel}>轮次</span>
                <span className={styles.trackerValue}>{currentRound} / {BUYER_SCRIPTS.length}</span>
              </div>
              {neg.buyerMood && currentRound > 0 && (
                <div className={styles.trackerItem}>
                  <span className={styles.trackerLabel}>买家信号</span>
                  <span className={styles.trackerValue} style={{ fontSize: 12 }}>{moodLabel[neg.buyerMood]}</span>
                </div>
              )}
            </div>

            {/* Conversation history */}
            <div className={styles.messages}>
              {neg.negotiationMessages?.map((m, i) => (
                <div key={i}>
                  {BUYER_SCRIPTS[i] && (
                    <div>
                      <div className={styles.buyerLabel}>买家 Michael（轮 {i + 1}）</div>
                      <div className={styles.buyerBubble}>{BUYER_SCRIPTS[i].text}</div>
                    </div>
                  )}
                  {neg.roundStrategies?.[i] && (
                    <div className={styles.strategyTag}>策略：{STRATEGY_TAGS.find(t => t.id === neg.roundStrategies[i])?.label || neg.roundStrategies[i]}</div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    <div className={styles.userLabel}>你的回复</div>
                    <div className={styles.userBubble}>{m.content}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Round feedback card */}
            {roundFeedback && (
              <div className={styles.roundFeedback}>
                <div className={styles.roundFeedbackTitle}>本轮总结</div>
                <div className={styles.roundFeedbackRow}>
                  <span>你的策略</span>
                  <strong>{STRATEGY_TAGS.find(t => t.id === roundFeedback.strategy)?.label}</strong>
                </div>
                <div className={styles.roundFeedbackRow}>
                  <span>检测到的行为</span>
                  <strong>
                    {roundFeedback.concessionType === 'hold' ? '坚守价格 ✓' :
                     roundFeedback.concessionType === 'exchange' ? '条件交换（让步换增量）✓' :
                     '无条件让价 ⚠️'}
                  </strong>
                </div>
                <div className={styles.roundFeedbackRow}>
                  <span>买家信号</span>
                  <strong>{moodLabel[roundFeedback.mood]}</strong>
                </div>
              </div>
            )}

            {/* BEC Scenario — triggers at round 5 */}
            {showBecScenario && (
              <div className={styles.becScenario}>
                <div className={styles.becTitle}>⚠️ 紧急情况介入</div>
                <div className={styles.becBody}>{SCENARIOS.SCENARIO_BEC_ATTACK.body}</div>
                <div className={styles.becQuestion}>{SCENARIOS.SCENARIO_BEC_ATTACK.question}</div>
                <div className={styles.becOptions}>
                  {SCENARIOS.SCENARIO_BEC_ATTACK.options.map((opt, i) => (
                    <button key={i} className={styles.becOpt} onClick={() => handleBecChoice(i)}>
                      {String.fromCharCode(65 + i)}. {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* BEC result */}
            {becDone && state.scenarioResults?.SCENARIO_BEC_ATTACK && (
              <AlertBox
                level={state.scenarioResults.SCENARIO_BEC_ATTACK.outcome === 'GOOD' ? 'success' : 'error'}
                msg={SCENARIOS.SCENARIO_BEC_ATTACK.options[state.scenarioResults.SCENARIO_BEC_ATTACK.choice]?.explanation}
              />
            )}

            {/* Next buyer message */}
            {!allRoundsDone && !showBecScenario && nextScript && (currentRound < becScriptIndex || becDone) && (
              <div>
                <div className={styles.buyerLabel}>买家 Michael（轮 {currentRound + 1}）</div>
                <div className={styles.buyerBubble}>{nextScript.text}</div>
              </div>
            )}

            {/* Input area */}
            {!allRoundsDone && !showBecScenario && (currentRound < becScriptIndex || becDone) && (
              <div className={styles.inputArea}>
                {/* Strategy tags */}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  第一步：选择本轮策略
                </div>
                <div className={styles.strategyTags}>
                  {STRATEGY_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      className={`${styles.strategyTag2} ${selectedStrategy === tag.id ? styles.strategyTagActive : ''}`}
                      onClick={() => setSelectedStrategy(tag.id)}
                      title={tag.hint}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
                {selectedStrategy && (
                  <div className={styles.strategyHint}>
                    策略提示：{STRATEGY_TAGS.find(t => t.id === selectedStrategy)?.hint}
                  </div>
                )}

                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 8 }}>
                  第二步：写回复
                </div>
                <div className={styles.hints}>
                  {REPLY_HINTS.slice(0, 3).map((h, i) => (
                    <button key={i} className={styles.hintChip} onClick={() => setReply(h)}>话术参考 {i + 1}</button>
                  ))}
                </div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  placeholder="输入你对买家砍价的回复…"
                />
                <div className={styles.warnings}>
                  {warnings.map((w, i) => <AlertBox key={i} level={w.level} msg={w.msg} />)}
                </div>
                <Button onClick={handleSubmitReply} disabled={!reply.trim()}>提交回复</Button>
              </div>
            )}

            {/* Confirm low-margin */}
            {showConfirm && (
              <div style={{ background: 'var(--color-error-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontWeight: 700, color: '#991b1b' }}>⚠️ 利润率将低于 10%</div>
                <div style={{ fontSize: 13 }}>让价后利润率约 {(pendingConcession?.newProfitRate * 100).toFixed(1)}%，低于建议最低值 10%。确认接受将标记为高风险订单。</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button variant="danger" onClick={confirmLowMargin}>确认接受（标记高风险）</Button>
                  <Button variant="ghost" onClick={() => { setShowConfirm(false); setPendingConcession(null); }}>取消，重新考虑</Button>
                </div>
              </div>
            )}

            {/* Payment confirmation */}
            {currentRound >= 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>付款条件确认</div>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={neg.paymentTermConfirmed}
                    onChange={(e) => dispatch({ type: 'SET_NEGOTIATION', payload: { paymentTermConfirmed: e.target.checked } })} />
                  已与买家确认付款方式（T/T）
                  {neg.paymentTermConfirmed && <span className={styles.done}>✓</span>}
                </label>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={neg.depositRatioConfirmed}
                    onChange={(e) => dispatch({ type: 'SET_NEGOTIATION', payload: { depositRatioConfirmed: e.target.checked } })} />
                  已锁定定金比例（T/T 30%）
                  {neg.depositRatioConfirmed && <span className={styles.done}>✓</span>}
                </label>
              </div>
            )}

            {canProceed && (
              <Button onClick={handleNext}>进入 PI / 定金阶段 →</Button>
            )}
            {!canProceed && currentRound >= 1 && (
              <AlertBox level="info" msg={
                !becDone ? '请先处理紧急情况（BEC 安全验证）'
                : currentRound < 3 ? '需完成至少 3 轮谈判才能推进'
                : currentProfitRate < 0.10 ? '利润率不足 10%，无法推进'
                : !neg.paymentTermConfirmed ? '请先确认付款方式'
                : '请先锁定定金比例'
              } />
            )}
          </>
        )}

      </ContextBriefing>
    </div>
  );
}
