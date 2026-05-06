import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import styles from './PrincipleModal.module.css';

export default function PrincipleModal() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const modal = state.activeModal;

  if (!modal) return null;

  function handleDismiss() {
    dispatch({ type: 'DISMISS_PRINCIPLE_MODAL', id: modal.id });
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.badge}>原理拦截</span>
          <h2 className={styles.title}>{modal.title}</h2>
        </div>

        <div className={styles.block}>
          <div className={styles.blockLabel}>你做了什么</div>
          <div className={styles.blockText}>{modal.whatYouDid}</div>
        </div>

        <div className={`${styles.block} ${styles.blockWhy}`}>
          <div className={styles.blockLabel}>为什么这样做会有问题</div>
          <div className={styles.blockText}>{modal.why}</div>
        </div>

        <div className={`${styles.block} ${styles.blockRealLife}`}>
          <div className={styles.blockLabel}>现实中会发生什么</div>
          <div className={styles.blockText}>{modal.realLife}</div>
        </div>

        <div className={`${styles.block} ${styles.blockCorrect}`}>
          <div className={styles.blockLabel}>正确做法</div>
          <div className={styles.blockText}>{modal.correctApproach}</div>
        </div>

        <button className={styles.ackBtn} onClick={handleDismiss}>
          我明白了，重新来
        </button>
      </div>
    </div>
  );
}
