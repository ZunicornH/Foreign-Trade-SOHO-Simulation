import { useState } from 'react';
import styles from './LearningGuide.module.css';
import { GUIDE } from '../data/guideContent.js';
import { useAppState } from '../lib/StateContext.jsx';

export default function LearningGuide() {
  const state = useAppState();
  const [collapsed, setCollapsed] = useState(false);

  // Pick the right guide key
  let key = state.currentStage;
  if (key === 34) {
    key = state.stage34Step === 'inquiry_reply' ? '34_inquiry_reply' : '34_prospecting';
  }

  const guide = GUIDE[key];
  if (!guide) return null;

  return (
    <div className={styles.guide}>
      <div className={styles.top}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span className={styles.badge}>🎓 学习引导 · {guide.stage}</span>
          <span className={styles.title}>{guide.title}</span>
        </div>
        <button className={styles.toggleBtn} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '展开 ▾' : '收起 ▴'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className={styles.objective}>{guide.objective}</div>
          <div className={styles.tips}>
            {guide.tips.map((t, i) => (
              <div key={i} className={styles.tip}>
                <span className={styles.tipIcon}>{t.icon}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
          <div className={styles.doTip}>
            <span>{guide.doTip}</span>
          </div>
        </>
      )}
    </div>
  );
}
