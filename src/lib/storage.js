import { SEED_STATE } from '../data/seed.js';

const KEY = 'soho-agent-v2-state';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(SEED_STATE);
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SEED_STATE.schemaVersion) return structuredClone(SEED_STATE);
    return parsed;
  } catch {
    return structuredClone(SEED_STATE);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function resetState() {
  localStorage.removeItem(KEY);
  return structuredClone(SEED_STATE);
}
