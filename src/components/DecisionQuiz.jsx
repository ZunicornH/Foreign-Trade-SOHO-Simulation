import { useState } from 'react';
import { useAppDispatch, useAppState } from '../lib/StateContext.jsx';
import { PRINCIPLES } from '../lib/principles.js';
import styles from './DecisionQuiz.module.css';

/**
 * Props:
 *   quizId: string — unique key, persisted in state.quizAnswers
 *   question: string
 *   options: Array<{ label, explanation, correct?, principleId? }>
 *     - correct: boolean — marks the right answer
 *     - principleId: if selected, shows PrincipleModal instead of inline explanation
 *   onCorrect: () => void — called when user selects correct answer
 *   allowRetry: bool — default true
 */
export default function DecisionQuiz({ quizId, question, options, onCorrect, allowRetry = true }) {
  const dispatch = useAppDispatch();
  const state = useAppState();
  const savedAnswer = state.quizAnswers?.[quizId];

  const [selected, setSelected] = useState(savedAnswer ?? null);
  const [locked, setLocked] = useState(savedAnswer !== undefined && savedAnswer !== null);

  function handleSelect(idx) {
    if (locked && !allowRetry) return;
    const opt = options[idx];

    setSelected(idx);
    dispatch({ type: 'SET_QUIZ_ANSWER', quizId, answer: idx });

    if (opt.correct) {
      setLocked(true);
      if (onCorrect) onCorrect();
    } else {
      if (opt.principleId && PRINCIPLES[opt.principleId]) {
        dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES[opt.principleId] });
      }
    }
  }

  const selectedOpt = selected !== null ? options[selected] : null;
  const isCorrect = selectedOpt?.correct;
  const isDone = locked && isCorrect;

  return (
    <div className={styles.quiz}>
      <div className={styles.label}>决策测验</div>
      <div className={styles.question}>{question}</div>

      <div className={styles.options}>
        {options.map((opt, i) => {
          const isSelected = selected === i;
          let optClass = styles.option;
          if (isSelected && locked) {
            optClass += opt.correct ? ` ${styles.optionCorrect}` : ` ${styles.optionWrong}`;
          } else if (isSelected && !locked) {
            optClass += ` ${styles.optionSelected}`;
          }

          return (
            <button
              key={i}
              className={optClass}
              onClick={() => handleSelect(i)}
              disabled={isDone && isSelected}
            >
              <span className={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
              <span className={styles.optionLabel}>{opt.label}</span>
              {isSelected && locked && (
                <span className={styles.optionMark}>{opt.correct ? '✓' : '✗'}</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedOpt && locked && (
        <div className={`${styles.explanation} ${isCorrect ? styles.explanationCorrect : styles.explanationWrong}`}>
          <div className={styles.explanationLabel}>
            {isCorrect ? '✓ 正确！底层原理：' : '✗ 不对，原因是：'}
          </div>
          <div className={styles.explanationText}>{selectedOpt.explanation}</div>
          {!isCorrect && !selectedOpt.principleId && (
            <button className={styles.retryBtn} onClick={() => { setSelected(null); setLocked(false); }}>
              重新选择
            </button>
          )}
        </div>
      )}
    </div>
  );
}
