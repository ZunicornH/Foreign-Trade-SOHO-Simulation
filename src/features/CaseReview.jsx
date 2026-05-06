import styles from './CaseReview.module.css';
import Button from '../components/Button.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { REVIEW } from '../data/guideContent.js';

export default function CaseReview() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  if (!state.showReview || !state.completedStage) return null;

  const reviewKey = state.completedStage;
  const review = REVIEW[reviewKey];
  if (!review) {
    dispatch({ type: 'DISMISS_REVIEW' });
    return null;
  }

  // Gather score items earned in this stage (last few)
  const stageScoreItems = (state.scoreCard?.items ?? [])
    .filter((item) => item.stage === reviewKey)
    .slice(-6);

  // Fallback: show last items if stage not tagged
  const scoreItems = stageScoreItems.length > 0
    ? stageScoreItems
    : (state.scoreCard?.items ?? []).slice(-4);

  function handleContinue() {
    dispatch({ type: 'DISMISS_REVIEW' });
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleContinue()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>{review.title}</div>
          <div className={styles.scoreChip}>
            <span className={styles.scoreNum}>{state.scoreCard?.total ?? 0}</span>
            <span className={styles.scoreLabel}>当前总分</span>
          </div>
        </div>

        <div className={styles.body}>
          {/* Score breakdown */}
          {scoreItems.length > 0 && (
            <div>
              <div className={styles.sectionTitle}>本阶段得分记录</div>
              <div className={styles.scoreItems}>
                {scoreItems.map((item, i) => (
                  <div key={i} className={styles.scoreRow}>
                    <span className={`${styles.scoreDelta} ${item.points >= 0 ? styles.pos : styles.neg}`}>
                      {item.points >= 0 ? `+${item.points}` : item.points}
                    </span>
                    <span>{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons */}
          <div>
            <div className={styles.sectionTitle}>📚 案例复盘 · 核心学习</div>
            <div className={styles.lessons}>
              {review.lessons.map((l, i) => (
                <div key={i} className={`${styles.lesson} ${l.type === 'key' ? styles.lessonKey : styles.lessonWarn}`}>
                  <span className={styles.lessonIcon}>{l.type === 'key' ? '✅' : '⚠️'}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview of next stage */}
          <div className={styles.preview}>
            <div className={styles.previewLabel}>→ 下一步预告</div>
            {review.preview}
          </div>
        </div>

        <div className={styles.footer}>
          <Button onClick={handleContinue} full>
            明白了，继续训练 →
          </Button>
        </div>
      </div>
    </div>
  );
}
