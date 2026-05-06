import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', size, full, onClick, disabled, type = 'button' }) {
  const cls = [
    styles.btn,
    styles[variant],
    size === 'sm' ? styles.sm : '',
    full ? styles.full : '',
  ].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
