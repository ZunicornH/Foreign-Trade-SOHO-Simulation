import { useEffect, useState } from 'react';
import styles from './StreamingMessage.module.css';

/**
 * Editorial buyer-bubble component for LLM-streamed dialogue.
 *
 * Props:
 *   senderName: string — buyer name shown above the bubble
 *   senderRole?: string — optional sub-line (role / company)
 *   text: string — the (possibly partial) text streamed so far
 *   streaming: boolean — true while tokens are still arriving (shows blinking cursor)
 *   error?: string | null — when set, render an error footer
 *   timestamp?: number — optional ms epoch; renders relative time
 *   onRetry?: () => void
 */
export default function StreamingMessage({
  senderName = 'Buyer',
  senderRole,
  text = '',
  streaming = false,
  error = null,
  timestamp,
  onRetry,
}) {
  // Derive initials for the avatar (max 2 letters)
  const initials = (senderName || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);

  // Simple "x sec/min ago" relative timestamp, refreshed every 30 s
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timestamp) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [timestamp]);
  const rel = timestamp ? formatRelative(now - timestamp) : null;

  return (
    <div className={styles.bubble} data-streaming={streaming || undefined}>
      <div className={styles.header}>
        <span className={styles.avatar} aria-hidden>{initials}</span>
        <div className={styles.headerText}>
          <span className={styles.name}>{senderName}</span>
          {senderRole && <span className={styles.role}>{senderRole}</span>}
        </div>
        {rel && <span className={styles.time}>{rel}</span>}
      </div>

      <div className={styles.body}>
        {text}
        {streaming && <span className={styles.cursor} aria-hidden />}
      </div>

      {error && (
        <div className={styles.errorRow}>
          <span className={styles.errorIcon}>⚠</span>
          <span className={styles.errorText}>{error}</span>
          {onRetry && (
            <button type="button" className={styles.retryBtn} onClick={onRetry}>
              重试
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelative(deltaMs) {
  if (deltaMs < 0) return 'just now';
  const sec = Math.floor(deltaMs / 1000);
  if (sec < 60) return sec <= 5 ? 'just now' : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
