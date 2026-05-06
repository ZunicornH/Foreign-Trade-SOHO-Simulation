import styles from './AlertBox.module.css';

const ICONS = { block: '🚫', error: '🔴', warn: '⚠️', info: 'ℹ️', success: '✅' };

export default function AlertBox({ level = 'info', msg }) {
  return (
    <div className={`${styles.box} ${styles[level]}`}>
      <em className={styles.icon}>{ICONS[level] ?? 'ℹ️'}</em>
      <span>{msg}</span>
    </div>
  );
}
