import { useEffect, useRef, useState } from 'react';
import DimensionFeedback from './DimensionFeedback.jsx';
import styles from './LLMScorePanel.module.css';
import { scoreText } from '../lib/llm.js';
import { useTrackTokens } from '../lib/StateContext.jsx';

/**
 * LLM-powered scoring panel. Wraps DimensionFeedback with:
 *   - explicit "评估" trigger (debounced, blur-aware)
 *   - skeleton loading state
 *   - rule-based fallback when LLM call fails / takes too long
 *
 * Props:
 *   text: string — the user's input
 *   rubric: { dimensions: [{key, label}], context: string }
 *   fallbackDims: optional Array<{label,score,hint}> — rule-based scoring shown
 *                 before LLM runs and used if LLM fails
 *   cacheKey?: string — debounces re-scoring when text doesn't change
 *   autoTriggerOnBlur?: boolean — if true, re-scores when text changes after blur
 *   minLength?: number — minimum char count before scoring is enabled
 */
export default function LLMScorePanel({
  text,
  rubric,
  fallbackDims,
  cacheKey,
  autoTriggerOnBlur = false,
  minLength = 30,
}) {
  const trackTokens = useTrackTokens();
  const [llmScore, setLlmScore] = useState(null);  // { dim_key: { score, hint } } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const lastScoredRef = useRef(null);
  const callTimestampsRef = useRef([]); // rolling window of call timestamps
  const cooldownTimerRef = useRef(null);

  const RATE_LIMIT = 5;       // max calls
  const RATE_WINDOW_MS = 60_000; // per minute
  const COOLDOWN_SEC = 30;

  // Clear cooldown interval on unmount to prevent state updates after unmount.
  useEffect(() => () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); }, []);

  // Reset score when caseContext / rubric key changes via cacheKey
  useEffect(() => {
    setLlmScore(null);
    setError(null);
    lastScoredRef.current = null;
  }, [cacheKey]);

  const canScore = !!rubric && !!text && text.trim().length >= minLength;

  async function runScore() {
    if (!canScore || cooldownSec > 0) return;
    if (lastScoredRef.current === text) return; // no change since last scored

    const now = Date.now();
    callTimestampsRef.current = callTimestampsRef.current.filter(
      (t) => now - t < RATE_WINDOW_MS
    );
    if (callTimestampsRef.current.length >= RATE_LIMIT) {
      setCooldownSec(COOLDOWN_SEC);
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => {
        setCooldownSec((s) => {
          if (s <= 1) { clearInterval(cooldownTimerRef.current); return 0; }
          return s - 1;
        });
      }, 1000);
      return;
    }

    callTimestampsRef.current.push(now);
    setLoading(true);
    setError(null);
    try {
      const result = await scoreText({ rubric, text, onUsage: trackTokens });
      setLlmScore(result);
      lastScoredRef.current = text;
    } catch (e) {
      console.warn('LLM scoring failed:', e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Build the dimensions to display.
  // Priority: LLM result > fallback (rule-based) > placeholders.
  const displayDims = (rubric?.dimensions || []).map((dim, i) => {
    const llm = llmScore?.[dim.key];
    if (llm) {
      return { label: dim.label, score: llm.score, hint: llm.hint };
    }
    const fb = fallbackDims?.[i];
    if (fb) {
      return { label: dim.label, score: fb.score, hint: fb.hint };
    }
    return { label: dim.label, score: 0, hint: '尚未评估' };
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>{llmScore ? 'AI 评估结果' : '实时质量分析'}</span>
        <button
          type="button"
          className={styles.scoreBtn}
          disabled={!canScore || loading || cooldownSec > 0}
          onClick={runScore}
          title={
            cooldownSec > 0
              ? `评估冷却中，${cooldownSec}s 后可用`
              : canScore
              ? '请 LLM 给出深度反馈'
              : `至少输入 ${minLength} 字`
          }
        >
          {loading ? (
            <>
              <span className={styles.miniSpinner} /> 评估中…
            </>
          ) : cooldownSec > 0 ? (
            `冷却中 ${cooldownSec}s`
          ) : llmScore ? (
            '↻ 重新评估'
          ) : (
            '✨ AI 评估'
          )}
        </button>
      </div>

      <DimensionFeedback dimensions={displayDims} />

      {error && (
        <div className={styles.errorRow}>
          <span>⚠ LLM 评估失败：{error}（仍显示规则版评分）</span>
        </div>
      )}
      {!llmScore && !error && fallbackDims && (
        <div className={styles.fallbackHint}>
          当前是关键词匹配的快速评分；点击「AI 评估」获得 LLM 深度分析。
        </div>
      )}
    </div>
  );
}
