import styles from './Card.module.css';

export default function Card({ title, children, style }) {
  return (
    <div className={styles.card} style={style}>
      {title && <div className={styles.title}>{title}</div>}
      {children}
    </div>
  );
}
