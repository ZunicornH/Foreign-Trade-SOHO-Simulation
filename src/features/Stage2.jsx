import { useMemo, useState } from 'react';
import styles from './Stage1.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DecisionQuiz from '../components/DecisionQuiz.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { PRINCIPLES } from '../lib/principles.js';
import { buildCertRiskScenario } from '../data/scenarios.js';
import { getActiveMaterials } from '../lib/stageMaterials.js';
import { getActiveCase } from '../lib/caseContext.js';

const QC_LABELS = {
  'in-house': '自有 QC',
  'third-party': '第三方',
  'mixed': '混合',
};

export default function Stage2() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { selectedSupplier, moqConfirmed } = state;
  const materials = getActiveMaterials(state);
  const caseCtx = getActiveCase(state);

  const suppliers = materials.suppliers;
  const mandatoryCert =
    caseCtx?.requiredCerts?.find((c) => c.mandatory) || { name: 'LFGB', region: '德国' };

  // Build scenario lazily so it picks up case data
  const certScenario = useMemo(
    () => buildCertRiskScenario(caseCtx, materials),
    [caseCtx, materials]
  );

  const [warnings, setWarnings] = useState([]);
  const [scenarioDone, setScenarioDone] = useState(!!state.scenarioResults?.SCENARIO_CERT_RISK);
  const [scenarioFeedback, setScenarioFeedback] = useState(
    state.scenarioResults?.SCENARIO_CERT_RISK
      ? certScenario.options[state.scenarioResults.SCENARIO_CERT_RISK.choice]
      : null
  );

  // Show cert risk scenario when sup_a (the one without mandatory cert support) is selected
  const supANoCert = !suppliers[0]?.certSupport;
  const showCertScenario = selectedSupplier === 'sup_a' && supANoCert && !scenarioDone;

  function toggleSample(id) {
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    dispatch({ type: 'SET_SUPPLIER', id, payload: { hasSample: !s.hasSample } });
  }

  function validate() {
    const w = [];
    if (suppliers.length < 2) w.push({ level: 'warn', msg: '建议至少录入 2 家供应商作为备份' });
    if (!selectedSupplier) w.push({ level: 'block', msg: '请选定 1 家合作供应商' });
    if (!moqConfirmed) w.push({ level: 'block', msg: '请确认 MOQ 在首单可接受范围内' });
    return w;
  }

  function handleNext() {
    const w = validate();
    setWarnings(w);
    const blocked = w.some((x) => x.level === 'block');
    if (blocked) return;
    dispatch({ type: 'SET_STAGE', stage: 34 });
  }

  function handleSkip() {
    if (!selectedSupplier) dispatch({ type: 'SELECT_SUPPLIER', id: 'sup_a' });
    dispatch({ type: 'SET_MOQ_CONFIRMED', value: true });
    dispatch({ type: 'SET_STAGE', stage: 34 });
  }

  function handleScenarioChoice(choiceIdx) {
    const opt = certScenario.options[choiceIdx];
    dispatch({
      type: 'SET_SCENARIO_RESULT',
      scenarioId: 'SCENARIO_CERT_RISK',
      choice: choiceIdx,
      outcome: opt.outcome,
    });

    if (opt.outcome === 'BAD' && opt.principleId) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES[opt.principleId] });
    }

    setScenarioDone(true);
    setScenarioFeedback(opt);
  }

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 2：供应商筛选</div>
        <div className={styles.subtitle}>
          比较 2 家供应商，权衡价格与{mandatoryCert.name}认证支持能力，建立双供应商体系
        </div>
      </div>

      <ContextBriefing briefingKey={2}>
        {/* Supplier comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suppliers.map((s) => {
            const qcLabel = QC_LABELS[s.qcCapability] || s.qcCapability || '未知';
            const isInHouseQC = s.qcCapability === 'in-house';
            return (
              <div
                key={s.id}
                style={{
                  border: `2px solid ${selectedSupplier === s.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <strong>{s.name}</strong>
                    {s.city && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                        {s.city}{s.profileNote ? ` · ${s.profileNote}` : ''}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={selectedSupplier === s.id ? 'primary' : 'secondary'}
                    onClick={() => dispatch({ type: 'SELECT_SUPPLIER', id: s.id })}
                  >
                    {selectedSupplier === s.id ? '✓ 已选定' : '选择'}
                  </Button>
                </div>

                {/* Price & logistics */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 13,
                    color: 'var(--color-text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    出厂价{' '}
                    <strong style={{ color: 'var(--color-text)' }}>
                      ¥{s.factoryPriceCNY ?? s.factoryPrice}/个
                    </strong>
                  </span>
                  <span>
                    MOQ <strong style={{ color: 'var(--color-text)' }}>{s.moq} 个</strong>
                  </span>
                  <span>
                    样品费 <strong style={{ color: 'var(--color-text)' }}>¥{s.sampleFee}</strong>
                  </span>
                  <span>
                    交期 <strong style={{ color: 'var(--color-text)' }}>{s.leadTimeDays} 天</strong>
                  </span>
                </div>

                {/* Capability badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: s.certSupport ? '#dcfce7' : '#fef2f2',
                      color: s.certSupport ? '#166534' : '#991b1b',
                      border: `1px solid ${s.certSupport ? '#bbf7d0' : '#fecaca'}`,
                    }}
                  >
                    {s.certSupport
                      ? `✓ 支持 ${mandatoryCert.name} 认证`
                      : `✗ 不支持 ${mandatoryCert.name}（需自行委托）`}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: isInHouseQC ? '#eff6ff' : '#fffbeb',
                      color: isInHouseQC ? '#1e40af' : '#92400e',
                      border: `1px solid ${isInHouseQC ? '#bfdbfe' : '#fde68a'}`,
                    }}
                  >
                    QC 能力：{qcLabel}
                  </span>
                </div>

                <label
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!s.hasSample}
                    onChange={() => toggleSample(s.id)}
                  />
                  已寄样
                  {s.hasSample && (
                    <span style={{ color: 'var(--color-info)', fontSize: 12 }}>
                      → 样品费节点 ¥{s.sampleFee} 已记录
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        {/* Cert risk scenario for sup_a */}
        {showCertScenario && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderLeft: '4px solid #f59e0b',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
              ⚡ {certScenario.title}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65 }}>{certScenario.body}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{certScenario.question}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {certScenario.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleScenarioChoice(i)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    textAlign: 'left',
                    background: '#fff',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                  }}
                >
                  {String.fromCharCode(65 + i)}. {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {scenarioDone && scenarioFeedback && (
          <AlertBox
            level={
              scenarioFeedback.outcome === 'GOOD'
                ? 'success'
                : scenarioFeedback.outcome === 'OK'
                ? 'info'
                : 'error'
            }
            msg={scenarioFeedback.explanation}
          />
        )}

        {/* DecisionQuiz — why dual supplier (case-agnostic) */}
        <DecisionQuiz
          quizId="STAGE2_DUAL_SUPPLIER"
          question="你选定了主力供应商，为什么还需要保留第二家供应商（即使你计划 95% 的订单都用主力供应商）？"
          options={[
            {
              label: '用来比价，防止主力供应商涨价',
              correct: false,
              explanation:
                '比价是次要功能。主要价值在于业务连续性——当主力供应商无法交货时，你有备选方案，不会失约于买家。',
            },
            {
              label: '保证业务连续性——主力供应商出问题时不会断货',
              correct: true,
              explanation:
                '正确！外贸 SOHO 失去客户最常见的原因之一是：旺季主供产能满/出事/质量不合格，没有备份，客户等不及转向竞争对手。备份供应商每年可能只用一次，但那一次可能就是一个客户关系的分水岭。',
            },
            {
              label: '让两家工厂竞争，压低价格',
              correct: false,
              explanation:
                '用双供应商压价是个短期策略，但长期效果有限——工厂知道你在比价后会降低服务优先级。更重要的是，你选供应商时应该优先考虑认证支持能力和质量稳定性，而不是单纯价格。',
            },
            {
              label: '监管要求，外贸必须有两家供应商',
              correct: false,
              explanation:
                '没有这样的监管要求。但这是外贸 SOHO 的最佳实践——是经验教训积累出来的风控原则，不是法规。',
            },
          ]}
        />

        <label
          style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={moqConfirmed}
            onChange={(e) => dispatch({ type: 'SET_MOQ_CONFIRMED', value: e.target.checked })}
          />
          已确认所选供应商 MOQ 在首单可接受范围内
        </label>

        {warnings.map((w, i) => (
          <AlertBox key={i} level={w.level} msg={w.msg} />
        ))}

        <div className={styles.actions}>
          <Button
            onClick={handleNext}
            disabled={
              !selectedSupplier ||
              !moqConfirmed ||
              (selectedSupplier === 'sup_a' && supANoCert && !scenarioDone)
            }
          >
            确认并进入阶段 3 →
          </Button>
          <button className={styles.skipLink} onClick={handleSkip}>
            跳过，使用默认供应商
          </button>
        </div>
      </ContextBriefing>
    </div>
  );
}
