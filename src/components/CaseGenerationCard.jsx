import styles from './CaseGenerationCard.module.css';

/**
 * Renders the generated training case so the user can verify it before proceeding.
 * Also handles loading and error states.
 *
 * Props:
 *   loading: boolean
 *   error: string | null
 *   caseContext: CaseContext | null
 *   onRetry: () => void
 *   materialsLoading?: boolean   — Phase B (stage materials) status
 *   materialsReady?: boolean
 *   materialsError?: string | null
 */
export default function CaseGenerationCard({
  loading,
  error,
  caseContext,
  onRetry,
  materialsLoading,
  materialsReady,
  materialsError,
}) {
  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.badge}>AI · 案例生成中</span>
        </div>
        <div className={styles.loadingRow}>
          <span className={styles.spinner} />
          <span className={styles.loadingText}>
            正在为你的「商品 × 市场」组合生成专属训练案例…
            <br />
            <span className={styles.loadingSub}>
              识别认证体系、HS 编码、买家人设、合规风险（约 5–15 秒）
            </span>
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.card} ${styles.cardError}`}>
        <div className={styles.header}>
          <span className={`${styles.badge} ${styles.badgeError}`}>生成失败</span>
        </div>
        <div className={styles.errorText}>
          {error}
          <br />
          <span className={styles.loadingSub}>
            将使用默认案例（不锈钢保温杯 → 德国市场）继续训练
          </span>
        </div>
        {onRetry && (
          <button className={styles.retryBtn} onClick={onRetry}>
            重试生成
          </button>
        )}
      </div>
    );
  }

  if (!caseContext) return null;

  const { requiredCerts, hsCodeRange, buyerPersona, commonPitfalls, culturalNotes, tariffNotes } =
    caseContext;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${styles.badgeOk}`}>✓ AI · 案例已生成</span>
        <span className={styles.subTitle}>这是 LLM 为你专属生成的训练情境</span>
      </div>

      {/* Buyer persona — hero */}
      <div className={styles.persona}>
        <div className={styles.personaLabel}>你的买家</div>
        <div className={styles.personaName}>{buyerPersona?.name}</div>
        <div className={styles.personaMeta}>
          {buyerPersona?.role} @ {buyerPersona?.company} · {buyerPersona?.city}, {buyerPersona?.country}
        </div>
        <div className={styles.personaBg}>{buyerPersona?.background}</div>
      </div>

      {/* Certs — pills */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>必须 / 建议认证</div>
        <div className={styles.certPills}>
          {requiredCerts?.map((c, i) => (
            <span
              key={i}
              className={`${styles.certPill} ${c.mandatory ? styles.certMandatory : styles.certOptional}`}
              title={c.note}
            >
              {c.mandatory && <span className={styles.certDot} />}
              {c.name}
              <span className={styles.certRegion}>· {c.region}</span>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>HS 编码范围</div>
          <div className={styles.value}>{hsCodeRange}</div>
        </div>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>关税要点</div>
          <div className={styles.value}>{tariffNotes}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>市场文化要点</div>
        <div className={styles.value}>{culturalNotes}</div>
      </div>

      {/* Pitfalls */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>本案例最常踩的坑</div>
        <ul className={styles.pitfallList}>
          {commonPitfalls?.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      {/* Stage materials progress — bottom of card */}
      {(materialsLoading || materialsReady || materialsError) && (
        <div className={styles.materialsRow}>
          {materialsLoading && (
            <>
              <span className={styles.miniSpinner} />
              <span>正在为各阶段准备训练材料（供应商 / HS quiz / QC / 投诉…）</span>
            </>
          )}
          {materialsReady && !materialsLoading && (
            <>
              <span className={styles.checkDot} />
              <span>各阶段训练材料已就绪，可以进入阶段 2</span>
            </>
          )}
          {materialsError && !materialsLoading && (
            <>
              <span className={styles.warnDot} />
              <span>材料生成失败：{materialsError}（将使用默认材料继续训练）</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
