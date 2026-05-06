import styles from './StageNav.module.css';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';

const STAGES = [
  { id: 1,  label: '选品定位',        num: '1' },
  { id: 2,  label: '供应商筛选',      num: '2' },
  { id: 34, label: '客户开发 & 跟进', num: '3–4', tag: '核心' },
  { id: 5,  label: '报价测算',        num: '5',   tag: '核心' },
  { id: 6,  label: '谈判模拟',        num: '6',   tag: '核心' },
  { id: 7,  label: 'PI / 定金',       num: '7',   tag: '核心' },
  { id: 8,  label: '生产 / 物流',     num: '8' },
  { id: 9,  label: '售后复购',        num: '9' },
];

// Stage order by position (not numeric value — 34 sits between 2 and 5)
const STAGE_ORDER = STAGES.map((s) => s.id);
function pos(id) { return STAGE_ORDER.indexOf(id); }

export default function StageNav() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const cur = state.currentStage;

  function handleClick(id) {
    if (pos(id) > pos(cur)) return; // locked
    dispatch({ type: 'SET_STAGE', stage: id });
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>训练流程</div>
      {STAGES.map((s) => {
        const isActive = s.id === cur;
        const isDone = pos(s.id) < pos(cur);
        const isLocked = pos(s.id) > pos(cur);
        return (
          <button
            key={s.id}
            className={[
              styles.item,
              isActive ? styles.active : '',
              isDone ? styles.done : '',
              isLocked ? styles.locked : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleClick(s.id)}
            disabled={isLocked}
          >
            <span className={styles.num}>{isDone ? '✓' : s.num}</span>
            <span className={styles.label}>{s.label}</span>
            {s.tag && !isLocked && <span className={styles.tag}>{s.tag}</span>}
          </button>
        );
      })}
    </nav>
  );
}
