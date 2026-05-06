import styles from './InlineRiskBar.module.css';
import { useAppState } from '../lib/StateContext.jsx';

const ICON = { error: '🔴', warn: '⚠️', info: 'ℹ️' };

export default function InlineRiskBar() {
  const { riskFlags } = useAppState();
  if (!riskFlags || riskFlags.length === 0) return null;

  const errors = riskFlags.filter((f) => f.level === 'error');
  const others = riskFlags.filter((f) => f.level !== 'error');
  const sorted = [...errors, ...others];

  return (
    <div className={styles.bar}>
      <div className={styles.header}>
        <span className={styles.dot} />
        <span className={styles.headerLabel}>
          风险提示 · {riskFlags.length} 项需关注
        </span>
      </div>
      {sorted.map((flag) => (
        <div
          key={flag.id}
          className={`${styles.item} ${styles[flag.level] ?? styles.info}`}
        >
          <span className={styles.icon}>{ICON[flag.level] ?? 'ℹ️'}</span>
          <span className={styles.msg}>{flag.message}</span>
        </div>
      ))}
    </div>
  );
}
