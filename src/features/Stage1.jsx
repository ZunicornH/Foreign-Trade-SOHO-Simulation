import { useState } from 'react';
import styles from './Stage1.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DecisionQuiz from '../components/DecisionQuiz.jsx';
import DimensionFeedback from '../components/DimensionFeedback.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { PRINCIPLES } from '../lib/principles.js';

const BATTERY_LIQUID = ['电池', '锂电', '液体', '喷雾', '气雾', '充电'];

const GENERIC_USP_WORDS = ['质量好', '品质好', '质量优', '价格低', '价格便宜', '便宜', '实惠', '物美价廉', 'good quality', 'cheap', 'cheapest', 'best price', 'low price'];

function analyzeUsp(usp) {
  const text = usp.toLowerCase();
  const isSpecific = usp.length > 15 && !/^\s*$/.test(usp);
  const isVerifiable = /认证|certified|lfgb|ce |304|bpa|fda|sgs|ml|mm|定制|custom|oem|颜色|color/.test(text);
  const isMarketFit = /德国|germany|german|europe|eu |欧盟|欧洲|market/.test(text);
  const isGeneric = GENERIC_USP_WORDS.some(w => text.includes(w));

  return [
    {
      label: '具体性（非泛泛描述）',
      score: isGeneric ? 0 : isSpecific ? 1 : 0.5,
      hint: isGeneric
        ? '⚠️ 检测到泛泛描述，无法与竞品区分'
        : isSpecific
        ? '描述具体，有区分度'
        : '可以更具体，例如加入认证编号或具体规格',
    },
    {
      label: '可验证性（买家能核实）',
      score: isVerifiable ? 1 : 0,
      hint: isVerifiable
        ? '有可验证的具体指标（认证/材质/规格）'
        : '建议加入可核实的内容：LFGB 认证、304 不锈钢、BPA-free 等',
    },
    {
      label: '市场针对性（德国市场）',
      score: isMarketFit ? 1 : 0,
      hint: isMarketFit
        ? '已体现对德国/欧洲市场的针对性'
        : '建议说明卖点与德国市场的关联，如"德国 LFGB 法规合规"',
    },
  ];
}

export default function Stage1() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [tc, setTc] = useState(state.trainingCase);
  const [warnings, setWarnings] = useState([]);

  const uspDims = analyzeUsp(tc.usp || '');

  function handleChange(field, val) {
    setTc((prev) => ({ ...prev, [field]: val }));
  }

  function validate(data) {
    const w = [];
    if (!data.usp.trim()) w.push({ level: 'warn', msg: '请补充至少 1 条竞争优势（差异化卖点）' });
    const combined = `${data.product} ${data.targetMarket}`.toLowerCase();
    if (BATTERY_LIQUID.some((k) => combined.includes(k))) {
      w.push({ level: 'error', msg: '所选产品含电池或液体，需注意认证及运输限制（危险品预警）' });
    }
    return w;
  }

  function handleConfirm() {
    // Check for generic USP — hard stop
    const uspLower = tc.usp.toLowerCase();
    if (GENERIC_USP_WORDS.some(w => uspLower.includes(w))) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_USP_GENERIC });
      return;
    }

    const w = validate(tc);
    setWarnings(w);
    if (!tc.product.trim() || !tc.targetMarket.trim() || !tc.usp.trim()) return;
    dispatch({ type: 'SET_TRAINING_CASE', payload: tc });
    dispatch({ type: 'SET_STAGE', stage: 2 });
  }

  function handleSkip() {
    dispatch({ type: 'SET_STAGE', stage: 2 });
  }

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 1：选品定位</div>
        <div className={styles.subtitle}>确认产品、目标市场和差异化卖点，为后续开发信和报价奠定基础</div>
      </div>

      <ContextBriefing briefingKey={1}>

        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>产品名称 <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input value={tc.product} onChange={(e) => handleChange('product', e.target.value)} placeholder="例：不锈钢保温杯（500ml）" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>目标市场 <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input value={tc.targetMarket} onChange={(e) => handleChange('targetMarket', e.target.value)} placeholder="例：德国" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>差异化卖点 <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <div className={styles.hint}>至少填写 1 条，如认证、材质、外观、功能等。越具体越有力。</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, alignItems: 'flex-start' }}>
              <textarea rows={3} value={tc.usp} onChange={(e) => handleChange('usp', e.target.value)} placeholder="例：LFGB 认证、无 BPA、哑光喷漆定制色（12色）、304不锈钢" />
              <DimensionFeedback dimensions={uspDims} />
            </div>
          </div>
        </div>

        {/* Decision quiz — about LFGB */}
        <DecisionQuiz
          quizId="STAGE1_CERT_QUIZ"
          question={'德国买家 Michael 同时收到两份报价：A 没有提及认证，B 注明「LFGB 认证有效期至 2027 年」。价格完全相同。他会选哪个？'}
          options={[
            {
              label: 'A（没有认证说明的那个）',
              correct: false,
              explanation: '德国进口商必须对销售的产品承担合规责任。没有 LFGB 认证，他无法将产品放上德国零售货架——这不是偏好问题，是法律要求。选 A 等于拒绝了这个订单。',
            },
            {
              label: 'B（有 LFGB 认证的那个）',
              correct: true,
              explanation: '正确！LFGB 不是加分项，而是进入德国市场的法律门槛。认证有效期信息还传递了"供应商了解德国法规"的专业信号，让买家放心你不会给他制造合规风险。这就是为什么在卖点里主动提认证，能直接提升回复率和成交率。',
            },
            {
              label: '视情况而定，价格才是决定因素',
              correct: false,
              explanation: '对德国市场来说，认证不是"情况"，而是硬性门槛。买家在收到报价时，LFGB 合规是他能否接受这个供应商的前提条件，而不是可以用价格换的选项。',
            },
          ]}
        />

        {warnings.map((w, i) => <AlertBox key={i} level={w.level} msg={w.msg} />)}

        <div className={styles.actions}>
          <Button onClick={handleConfirm} disabled={!tc.product.trim() || !tc.targetMarket.trim() || !tc.usp.trim()}>
            确认并进入阶段 2 →
          </Button>
          <button className={styles.skipLink} onClick={handleSkip}>跳过，使用默认数据</button>
        </div>

      </ContextBriefing>
    </div>
  );
}
