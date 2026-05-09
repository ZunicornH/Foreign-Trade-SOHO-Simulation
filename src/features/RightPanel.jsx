import styles from './RightPanel.module.css';
import { useAppState } from '../lib/StateContext.jsx';

function ScoreItem({ item }) {
  return (
    <div className={styles.scoreItem}>
      <span className={item.points >= 0 ? styles.scorePos : styles.scoreNeg}>
        {item.points >= 0 ? `+${item.points}` : item.points}
      </span>
      <span>{item.reason}</span>
    </div>
  );
}

export default function RightPanel() {
  const state = useAppState();
  const { trainingCase, suppliers, selectedSupplier, scoreCard, riskFlags, tokenUsage } = state;
  const supplier = suppliers.find((s) => s.id === selectedSupplier);
  const cur = state.currentStage;

  const STAGE_TASKS = {
    1:  [
      { label: '确认产品',       done: !!trainingCase.product },
      { label: '确认目标市场',   done: !!trainingCase.targetMarket },
      { label: '填写差异化卖点', done: !!trainingCase.usp },
    ],
    2: [
      { label: '录入 2 家以上供应商', done: suppliers.length >= 2 },
      { label: '选定供应商',          done: !!selectedSupplier },
      { label: '确认 MOQ',           done: state.moqConfirmed },
    ],
    34: [
      { label: '提交开发信',   done: !!state.prospectingEmail },
      { label: '回复买家询盘', done: !!state.inquiryReply },
    ],
    5: [
      { label: '填写成本字段',       done: state.quoteDraft.factoryPrice > 0 },
      { label: '利润率 ≥ 15%',      done: state.quoteDraft.profitRate >= 0.15 },
      { label: '选择贸易条款',       done: !!state.quoteDraft.tradeTerms },
    ],
    6: [
      { label: '完成 ≥ 2 轮谈判', done: state.negotiation.currentRound >= 2 },
      { label: '利润率 ≥ 10%',    done: state.negotiation.currentProfitRate >= 0.1 },
      { label: '确认付款方式',    done: state.negotiation.paymentTermConfirmed },
      { label: '确认定金比例',    done: state.negotiation.depositRatioConfirmed },
    ],
    7: [
      { label: '产品描述',  done: !!state.piDraft.productDesc },
      { label: 'HS 编码',   done: !!state.piDraft.hsCode },
      { label: '收款账户',  done: !!state.piDraft.bankAccount },
      { label: '定金到账',  done: state.depositReceived },
    ],
  };

  const tasks = STAGE_TASKS[cur] || [];
  const completedCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Risk summary count
  const errorCount = riskFlags.filter((f) => f.level === 'error').length;
  const warnCount  = riskFlags.filter((f) => f.level === 'warn').length;

  return (
    <aside className={styles.panel}>
      {/* Score */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>训练评分</div>
        <div className={styles.score}>{scoreCard.total}</div>
        <div className={styles.scoreLabel}>/ 100 分</div>
        <div className={styles.scoreHistory}>
          {(scoreCard.items ?? []).slice(-6).reverse().map((item, i) => (
            <ScoreItem key={i} item={item} />
          ))}
        </div>
      </div>

      {/* Risk summary */}
      {riskFlags.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>风险概览</div>
          <div className={styles.riskSummary}>
            {errorCount > 0 && (
              <div className={styles.riskBadge} style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                🔴 {errorCount} 项高风险
              </div>
            )}
            {warnCount > 0 && (
              <div className={styles.riskBadge} style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
                ⚠️ {warnCount} 项警告
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              详见主内容区风险提示栏
            </div>
          </div>
        </div>
      )}

      {/* Task checklist with progress */}
      {tasks.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            阶段任务
            <span style={{ float: 'right', fontWeight: 400, color: progress === 100 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {completedCount}/{tasks.length}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100 ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 2,
              transition: 'width .3s ease',
            }} />
          </div>
          <div className={styles.taskList}>
            {tasks.map((t, i) => (
              <div key={i} className={styles.task}>
                <span className={`${styles.taskDot} ${t.done ? styles.taskDotDone : styles.taskDotPending}`} />
                <span style={{
                  color: t.done ? 'var(--color-text-muted)' : 'var(--color-text)',
                  textDecoration: t.done ? 'line-through' : 'none',
                  fontSize: 13,
                }}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client info */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>客户信息</div>
        <div className={styles.kv}>
          <div className={styles.kvRow}><span className={styles.kvLabel}>买家</span><span className={styles.kvValue}>Michael Braun</span></div>
          <div className={styles.kvRow}><span className={styles.kvLabel}>公司</span><span className={styles.kvValue}>Braun Kitchenware GmbH</span></div>
          <div className={styles.kvRow}><span className={styles.kvLabel}>市场</span><span className={styles.kvValue}>{trainingCase.targetMarket}</span></div>
          <div className={styles.kvRow}><span className={styles.kvLabel}>产品</span><span className={styles.kvValue} style={{fontSize:12}}>{trainingCase.product}</span></div>
        </div>
      </div>

      {/* Selected supplier */}
      {supplier && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>选定供应商</div>
          <div className={styles.kv}>
            <div className={styles.kvRow}><span className={styles.kvLabel}>名称</span><span className={styles.kvValue} style={{fontSize:12}}>{supplier.name}</span></div>
            <div className={styles.kvRow}><span className={styles.kvLabel}>出厂价</span><span className={styles.kvValue}>¥{supplier.factoryPrice}/个</span></div>
            <div className={styles.kvRow}><span className={styles.kvLabel}>MOQ</span><span className={styles.kvValue}>{supplier.moq} 个</span></div>
          </div>
        </div>
      )}

      {/* Token usage */}
      {((tokenUsage?.input ?? 0) + (tokenUsage?.output ?? 0)) > 0 && (
        <div className={styles.section} style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 10 }}>
          <div className={styles.sectionTitle} style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>本次 AI 用量</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            <div>输入 {((tokenUsage?.input ?? 0) / 1000).toFixed(1)}k · 输出 {((tokenUsage?.output ?? 0) / 1000).toFixed(1)}k tokens</div>
            <div>≈ ¥{(((tokenUsage?.input ?? 0) + (tokenUsage?.output ?? 0) * 3) / 1_000_000).toFixed(4)}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
