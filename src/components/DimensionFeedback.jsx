import styles from './DimensionFeedback.module.css';

/**
 * Props:
 *   dimensions: Array<{ label, score: 0|0.5|1, hint }>
 *     score 0 = red, 0.5 = yellow, 1 = green
 */
export default function DimensionFeedback({ dimensions }) {
  if (!dimensions || dimensions.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>实时质量分析</div>
      <div className={styles.dims}>
        {dimensions.map((d, i) => (
          <div key={i} className={styles.dim}>
            <span
              className={styles.dot}
              style={{
                background: d.score === 1 ? 'var(--color-success)' : d.score === 0.5 ? 'var(--color-warn)' : 'var(--color-error)',
              }}
            />
            <div className={styles.dimContent}>
              <div className={styles.dimLabel}>{d.label}</div>
              {d.hint && <div className={styles.dimHint}>{d.hint}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
