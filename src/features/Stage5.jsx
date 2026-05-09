import { useMemo, useState } from 'react';
import styles from './Stage5.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DecisionQuiz from '../components/DecisionQuiz.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { checkQuote } from '../lib/rules.js';
import { calcQuote } from '../lib/quoteCalc.js';
import { PRINCIPLES } from '../lib/principles.js';
import { getActiveMaterials } from '../lib/stageMaterials.js';
import { getActiveCase } from '../lib/caseContext.js';

const DEFAULT_RATE = 7.25;

export default function Stage5() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const materials = getActiveMaterials(state);
  const caseCtx = getActiveCase(state);

  // Pick supplier from materials first, fall back to legacy state.suppliers
  const supplier =
    materials.suppliers?.find((s) => s.id === state.selectedSupplier) ||
    state.suppliers.find((s) => s.id === state.selectedSupplier);
  const initial = state.quoteDraft;

  // Build dynamic tooltips with case-specific cert names + tariff info
  const FIELD_TOOLTIPS = useMemo(() => {
    const mandatoryCerts = caseCtx?.requiredCerts?.filter((c) => c.mandatory) || [];
    const certNames = mandatoryCerts.map((c) => c.name).join(' / ') || 'LFGB';
    const tariffNotes = caseCtx?.tariffNotes || '德国不锈钢制品关税约 3.7%（基于 CIF 价格）';
    const targetMarket = caseCtx?.targetMarket || caseCtx?.buyerPersona?.country || '目标市场';
    const baseFactoryLow = caseCtx?.pricingBaseline?.factoryPriceCNY?.[0] ?? 25;
    const baseFactoryHigh = caseCtx?.pricingBaseline?.factoryPriceCNY?.[1] ?? 40;
    return {
      factoryPrice: `工厂生产成本 + 原材料 + 工人工资 + 工厂利润。本案例参考价位 ¥${baseFactoryLow}–${baseFactoryHigh}/件。这是你最大的单项成本，决定了你的定价下限。`,
      packagingFee: `彩盒、内衬、说明书、贴纸等。${targetMarket}买家对包装要求通常较高，独立包装费一般 ¥1–5/个。`,
      domesticShipping: '从工厂到出口港（深圳 / 上海 / 宁波等）的卡车运费，按件摊销。通常 ¥1–3/个。',
      certAmortization: `${certNames} 检测费一般 ¥8,000–12,000，按首批量摊销。500 件 = ¥16–24/件。不摊销会让你低估真实成本。`,
      logisticsFee: 'CIF/DDP 条款下，你承担从中国港口到目的港的国际运费。必须提前获取货代报价，不能凭感觉填。',
      importDuty: `DDP 条款下，你还要垫付目的国进口关税。${tariffNotes}，不可忽视。`,
    };
  }, [caseCtx]);

  // Default factoryPrice — supplier's price preferred, else case baseline low
  const defaultFactoryPrice =
    supplier?.factoryPriceCNY ?? supplier?.factoryPrice ?? caseCtx?.pricingBaseline?.factoryPriceCNY?.[0] ?? 0;

  const [form, setForm] = useState({
    factoryPrice: initial.factoryPrice || defaultFactoryPrice,
    packagingFee: initial.packagingFee || 2,
    domesticShipping: initial.domesticShipping || 1.5,
    certAmortization: initial.certAmortization || 0.5,
    logisticsFee: initial.logisticsFee || 0,
    importDuty: initial.importDuty || 0,
    exchangeRate: initial.exchangeRate || DEFAULT_RATE,
    profitRate: initial.profitRate || 0.25,
    tradeTerms: initial.tradeTerms || 'FOB',
  });

  const [warnings, setWarnings] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const numForm = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, k === 'tradeTerms' ? v : parseFloat(v) || 0])
  );

  const result = calcQuote(numForm);

  function set(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
    setSubmitted(false);
  }

  function profitClass() {
    const r = numForm.profitRate;
    if (r >= 0.20) return styles.profitGood;
    if (r >= 0.15) return styles.profitWarn;
    return styles.profitBad;
  }

  // Profit stress test: show margin after buyer discounts
  function stressTest() {
    const base = numForm.profitRate;
    return [0, 0.05, 0.10, 0.15].map((discount) => {
      // After discount d%, new margin = (margin - d) / (1 - d) approximately
      // More precise: price = cost / (1 - margin); new price = price * (1 - d); new margin = (new price - cost) / new price
      const cost = result.totalCostCNY / numForm.exchangeRate;
      const price = result.unitPriceUSD;
      const newPrice = price * (1 - discount);
      const newMargin = newPrice > 0 ? (newPrice - cost) / newPrice : 0;
      return { discount, newMargin };
    });
  }

  function handleConfirm() {
    // Hard stop for zero margin
    if (numForm.profitRate <= 0) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_ZERO_MARGIN });
      return;
    }

    // Hard stop for low margin (< 15%)
    if (numForm.profitRate < 0.15) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_LOW_MARGIN });
      return;
    }

    // DDP with missing logistics
    if (form.tradeTerms === 'DDP' && (numForm.logisticsFee <= 0 || numForm.importDuty <= 0)) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_DDP_BLIND });
      return;
    }

    const check = checkQuote(numForm);
    setWarnings(check.warnings || []);
    if (check.blocked) return;

    dispatch({ type: 'SET_QUOTE_DRAFT', payload: { ...numForm, finalPriceUSD: result.unitPriceUSD } });
    dispatch({ type: 'SET_NEGOTIATION', payload: { currentProfitRate: numForm.profitRate, agreedPrice: result.unitPriceUSD } });
    setSubmitted(true);

    if (numForm.profitRate >= 0.30) dispatch({ type: 'APPLY_SCORE', actionKey: 'QUOTE_HIGH_MARGIN' });
    if (numForm.profitRate < 0.15) {
      dispatch({ type: 'APPLY_SCORE', actionKey: 'QUOTE_LOW_MARGIN' });
      dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_low_margin', level: 'error', message: `阶段5：报价利润率 ${(numForm.profitRate*100).toFixed(1)}%，低于建议值 15%` } });
    } else {
      dispatch({ type: 'REMOVE_RISK_FLAG', id: 'risk_low_margin' });
    }

    // Persist a memory fact so the buyer LLM in Stage 6 knows the quote
    dispatch({
      type: 'APPEND_BUYER_MEMORY',
      fact: {
        stage: 5,
        fact: `Supplier sent quote: USD ${result.unitPriceUSD.toFixed(2)}/pc ${form.tradeTerms}, ${(numForm.profitRate * 100).toFixed(0)}% margin (cost basis ¥${result.totalCostCNY?.toFixed(2)}/pc).`,
        ts: Date.now(),
      },
    });
  }

  function handleNext() {
    dispatch({ type: 'SET_STAGE', stage: 6 });
  }

  const check = checkQuote(numForm);
  const stress = stressTest();

  const FieldWithTooltip = ({ id, label, required, hint, children }) => (
    <div className={styles.field}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label className={styles.label}>
          {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
        </label>
        {FIELD_TOOLTIPS[id] && (
          <button
            type="button"
            style={{ fontSize: 11, background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 10, padding: '1px 7px', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setTooltip(tooltip === id ? null : id)}
          >
            为什么？
          </button>
        )}
      </div>
      {tooltip === id && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', background: '#f0f4ff', padding: '6px 10px', borderRadius: 6, lineHeight: 1.6 }}>
          {FIELD_TOOLTIPS[id]}
        </div>
      )}
      {hint && <div className={styles.hint}>{hint}</div>}
      {children}
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 5：报价测算</div>
        <div className={styles.subtitle}>填写成本结构，选择贸易条款，生成含利润的 USD 单价</div>
      </div>

      <ContextBriefing briefingKey={5}>

        {/* Trade terms */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>贸易条款</div>
          <div className={styles.termsRow}>
            {['FOB', 'CIF', 'DDP'].map((t) => (
              <button
                key={t}
                className={`${styles.termBtn} ${form.tradeTerms === t ? styles.termBtnActive : ''}`}
                onClick={() => set('tradeTerms', t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
            {form.tradeTerms === 'FOB' && 'FOB：买家承担国际运费，你的责任止于装船。最常用，风险最低。'}
            {form.tradeTerms === 'CIF' && 'CIF：你垫付运费 + 保险到目的港，但货权到港时转移。需填写物流费。'}
            {form.tradeTerms === 'DDP' && 'DDP：你承担一切到门，含关税。利润空间最大但风险最高——必须提前核实目的国关税率。'}
          </div>
        </div>

        {/* Cost inputs */}
        <div className={styles.grid}>
          <FieldWithTooltip id="factoryPrice" label="出厂价（含包装）" required>
            <div className={styles.inputRow}>
              <input type="number" min="0" step="0.1" value={form.factoryPrice} onChange={(e) => set('factoryPrice', e.target.value)} />
              <span className={styles.unit}>¥/个</span>
            </div>
          </FieldWithTooltip>

          <FieldWithTooltip id="packagingFee" label="独立包装费">
            <div className={styles.inputRow}>
              <input type="number" min="0" step="0.1" value={form.packagingFee} onChange={(e) => set('packagingFee', e.target.value)} />
              <span className={styles.unit}>¥/个</span>
            </div>
          </FieldWithTooltip>

          <FieldWithTooltip id="domesticShipping" label="国内运费（出口港）">
            <div className={styles.inputRow}>
              <input type="number" min="0" step="0.1" value={form.domesticShipping} onChange={(e) => set('domesticShipping', e.target.value)} />
              <span className={styles.unit}>¥/个</span>
            </div>
          </FieldWithTooltip>

          <FieldWithTooltip id="certAmortization" label="认证摊销" hint="LFGB / CE 等证书费用按量摊">
            <div className={styles.inputRow}>
              <input type="number" min="0" step="0.1" value={form.certAmortization} onChange={(e) => set('certAmortization', e.target.value)} />
              <span className={styles.unit}>¥/个</span>
            </div>
          </FieldWithTooltip>

          {(form.tradeTerms === 'CIF' || form.tradeTerms === 'DDP') && (
            <FieldWithTooltip id="logisticsFee" label={`国际物流费${form.tradeTerms === 'DDP' ? ' *' : ''}`}>
              <div className={styles.inputRow}>
                <input type="number" min="0" step="0.01" value={form.logisticsFee} onChange={(e) => set('logisticsFee', e.target.value)} />
                <span className={styles.unit}>USD/个</span>
              </div>
            </FieldWithTooltip>
          )}

          {form.tradeTerms === 'DDP' && (
            <FieldWithTooltip id="importDuty" label="进口关税 *">
              <div className={styles.inputRow}>
                <input type="number" min="0" step="0.01" value={form.importDuty} onChange={(e) => set('importDuty', e.target.value)} />
                <span className={styles.unit}>USD/个</span>
              </div>
            </FieldWithTooltip>
          )}

          <div className={styles.field}>
            <label className={styles.label}>汇率（EUR/CNY）</label>
            <div className={styles.inputRow}>
              <input type="number" min="0.01" step="0.01" value={form.exchangeRate} onChange={(e) => set('exchangeRate', e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>目标利润率</label>
            <div className={styles.inputRow}>
              <input type="number" min="0" max="99" step="1"
                value={Math.round(numForm.profitRate * 100)}
                onChange={(e) => set('profitRate', parseFloat(e.target.value) / 100)}
              />
              <span className={styles.unit}>%</span>
            </div>
          </div>
        </div>

        {/* Live result preview */}
        <div className={styles.result}>
          <div className={styles.resultTitle}>报价预览（{form.tradeTerms}）</div>
          <div className={styles.resultPrice}>USD {result.unitPriceUSD.toFixed(2)} / 个</div>
          <div className={styles.resultMeta}>
            <span>总成本 ¥{result.totalCostCNY?.toFixed(2)}/个</span>
            <span className={`${styles.profitBadge} ${profitClass()}`}>
              利润率 {(numForm.profitRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Profit stress test table */}
        {numForm.factoryPrice > 0 && (
          <div className={styles.stressTable}>
            <div className={styles.stressTitle}>利润压力测试——买家砍价后你的实际利润率</div>
            <div className={styles.stressGrid}>
              <div className={styles.stressHeader}>买家要求降价</div>
              <div className={styles.stressHeader}>你的报价（USD）</div>
              <div className={styles.stressHeader}>剩余利润率</div>
              {stress.map(({ discount, newMargin }) => (
                <>
                  <div key={`d-${discount}`} className={styles.stressCell}>{discount === 0 ? '不砍价' : `-${(discount * 100).toFixed(0)}%`}</div>
                  <div key={`p-${discount}`} className={styles.stressCell}>USD {(result.unitPriceUSD * (1 - discount)).toFixed(2)}</div>
                  <div key={`m-${discount}`} className={`${styles.stressCell} ${newMargin >= 0.15 ? styles.stressGood : newMargin >= 0.05 ? styles.stressWarn : styles.stressBad}`}>
                    {(newMargin * 100).toFixed(1)}%
                  </div>
                </>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
              红色 = 低于安全线 5%，汇率稍有波动即亏损。建议初始利润率设置 25%+ 以留足谈判空间。
            </div>
          </div>
        )}

        {/* DecisionQuiz — margin arithmetic */}
        <DecisionQuiz
          quizId="STAGE5_MARGIN_QUIZ"
          question="你的成本是 ¥30/个，设定 25% 利润率，汇率 7.25，报价 USD 5.52。买家要求降价 10%，你同意了。你的新利润率是多少？"
          options={[
            {
              label: '15%（25% - 10% = 15%）',
              correct: false,
              explanation: '错误。利润率的计算是非线性的。降价 10% 是对报价的打折，不是直接从利润率中减去 10%。',
            },
            {
              label: '约 16.7%',
              correct: true,
              explanation: '正确！新价格 = USD 4.97，成本 ≈ USD 4.14（¥30/7.25），新利润率 = (4.97 - 4.14) / 4.97 ≈ 16.7%。利润率压缩是非线性的——买家每降价 1%，你损失的不只是 1% 利润率，而是更多。这就是为什么初始利润率必须留出 25%+ 的缓冲。',
            },
            {
              label: '22.5%（25% × 90%）',
              correct: false,
              explanation: '错误。这种算法混淆了"价格折扣"和"利润率压缩"的关系。实际上利润率压缩幅度远大于价格折扣幅度。',
            },
            {
              label: '约 10%',
              correct: false,
              explanation: '接近了，但不准确。正确答案约为 16.7%。不过方向是对的——从 25% 压到不足 17%，谈判空间已经非常有限。',
            },
          ]}
        />

        {/* Warnings from live check */}
        <div className={styles.warnings}>
          {check.warnings?.map((w, i) => <AlertBox key={i} level={w.level} msg={w.msg} />)}
        </div>

        {submitted && warnings.filter((w) => !check.warnings?.some((cw) => cw.msg === w.msg)).map((w, i) => (
          <AlertBox key={i} level={w.level} msg={w.msg} />
        ))}

        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={handleConfirm} disabled={numForm.factoryPrice <= 0}>
            确认报价
          </Button>
          {submitted && !check.blocked && (
            <Button variant="secondary" onClick={handleNext}>
              进入谈判阶段 →
            </Button>
          )}
        </div>

      </ContextBriefing>
    </div>
  );
}
