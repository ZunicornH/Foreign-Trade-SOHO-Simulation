import styles from './App.module.css';
import { useAppState, useAppDispatch } from './lib/StateContext.jsx';
import { resetState } from './lib/storage.js';
import StageNav from './features/StageNav.jsx';
import RightPanel from './features/RightPanel.jsx';
import LearningGuide from './features/LearningGuide.jsx';
import InlineRiskBar from './features/InlineRiskBar.jsx';
import CaseReview from './features/CaseReview.jsx';
import PrincipleModal from './components/PrincipleModal.jsx';
import Stage1 from './features/Stage1.jsx';
import Stage2 from './features/Stage2.jsx';
import Stage34 from './features/Stage34.jsx';
import Stage5 from './features/Stage5.jsx';
import Stage6 from './features/Stage6.jsx';
import Stage7 from './features/Stage7.jsx';
import Stage8 from './features/Stage8.jsx';
import Stage9 from './features/Stage9.jsx';

function StagePanel() {
  const state = useAppState();
  const s = state.currentStage;
  if (s === 1)  return <Stage1 />;
  if (s === 2)  return <Stage2 />;
  if (s === 34) return <Stage34 />;
  if (s === 5)  return <Stage5 />;
  if (s === 6)  return <Stage6 />;
  if (s === 7)  return <Stage7 />;
  if (s === 8)  return <Stage8 />;
  if (s === 9)  return <Stage9 />;
  return <Stage1 />;
}

export default function App() {
  const dispatch = useAppDispatch();

  function handleReset() {
    if (!confirm('重置训练进度？所有数据将清空。')) return;
    const fresh = resetState();
    dispatch({ type: 'RESET', state: fresh });
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <span className={styles.logo}>外贸 SOHO 模拟训练工作台</span>
          <span className={styles.logoSub}>案例：不锈钢保温杯 → 德国市场</span>
        </div>
        <button className={styles.resetBtn} onClick={handleReset}>重置训练</button>
      </header>

      <div className={styles.body}>
        <StageNav />

        <main className={styles.main}>
          {/* Learning guide — always at top, stage-specific */}
          <LearningGuide />
          {/* Risk bar — only visible when flags exist */}
          <InlineRiskBar />
          {/* Stage content */}
          <StagePanel />
        </main>

        <RightPanel />
      </div>

      {/* Case review modal — triggered on stage advance */}
      <CaseReview />
      {/* Principle modal — triggered on wrong decisions */}
      <PrincipleModal />
    </div>
  );
}
