import { useState } from 'react';
import { useAppDispatch, useAppState } from '../lib/StateContext.jsx';
import { BRIEFINGS } from '../data/briefings.js';
import styles from './ContextBriefing.module.css';

export default function ContextBriefing({ briefingKey, children }) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const briefing = BRIEFINGS[briefingKey];
  const isDone = state.briefingsDone?.[briefingKey];
  const [collapsed, setCollapsed] = useState(isDone);

  if (!briefing) return children;

  function handleAck() {
    dispatch({ type: 'SET_BRIEFING_DONE', key: briefingKey });
    setCollapsed(true);
  }

  if (collapsed) {
    return (
      <>
        <button className={styles.revealBtn} onClick={() => setCollapsed(false)}>
          📖 查看阶段背景 &amp; 底层原理
        </button>
        {children}
      </>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.briefing}>
        <div className={styles.header}>
          <span className={styles.stageBadge}>{briefing.stage}</span>
          <span className={styles.stageTitle}>{briefing.title} — 开始前请先了解</span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}>这一步的业务逻辑</div>
          <div className={styles.sectionText}>{briefing.logic}</div>
        </div>

        <div className={`${styles.section} ${styles.sectionWarn}`}>
          <div className={styles.sectionLabel}>最常见的高代价错误</div>
          <div className={styles.sectionText}>{briefing.topMistake}</div>
        </div>

        {briefing.impact && briefing.impact.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>这步结果影响后续阶段</div>
            <div className={styles.impactChain}>
              {briefing.impact.map((item, i) => (
                <div key={i} className={styles.impactItem}>
                  <span className={styles.impactFrom}>{item.from}</span>
                  {item.arrow && <span className={styles.impactArrow}>→</span>}
                  <span className={styles.impactTo}>{item.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className={styles.ackBtn} onClick={handleAck}>
          我了解了，开始操作 →
        </button>
      </div>

      <div className={styles.opArea}>
        {children}
      </div>
    </div>
  );
}
