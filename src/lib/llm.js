// Frontend LLM client — wraps fetch calls to /api/* with sensible defaults and SSE parsing.

// Optional per-deployment secret sent in every API request.
// Set VITE_SOHO_API_SECRET in .env.local (must match SOHO_API_SECRET on the server).
const API_SECRET = import.meta.env.VITE_SOHO_API_SECRET || '';

function apiHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (API_SECRET) h['x-api-secret'] = API_SECRET;
  return h;
}

/**
 * Stream buyer dialogue from /api/buyer-chat.
 *
 * The server builds the buyer system prompt from the structured params —
 * the client never sends a raw systemPrompt string.
 *
 * @param {Object} opts
 * @param {Object} opts.caseContext   — caseContext from state
 * @param {Object} opts.buyerProfile  — { mood, trust, patience, memory[] }
 * @param {string} opts.stageContext  — short scenario description for this turn
 * @param {Array<{role:string,content:string}>} opts.messages
 * @param {(token: string) => void} opts.onToken — called for each streamed token
 * @param {(usage: {input,output}) => void} [opts.onUsage]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string>} the full concatenated response
 */
export async function streamBuyerChat({
  caseContext,
  buyerProfile,
  stageContext,
  messages,
  onToken,
  onUsage,
  signal,
}) {
  const res = await fetch('/api/buyer-chat', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ caseContext, buyerProfile, stageContext, messages }),
    signal,
  });

  if (!res.ok) {
    let errMsg = `LLM API error ${res.status}`;
    try {
      const j = await res.json();
      errMsg = j.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  if (!res.body) throw new Error('No response body for streaming');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        const obj = JSON.parse(payload);
        if (obj.error) throw new Error(obj.error);
        if (obj.done) { if (obj.usage && onUsage) onUsage(obj.usage); return full; }
        if (obj.token) {
          full += obj.token;
          onToken?.(obj.token);
        }
      } catch (e) {
        console.warn('Stream parse error:', e, payload);
      }
    }
  }

  return full;
}

/**
 * Score user text against a rubric. Returns an object keyed by dimension key.
 *
 * @param {Object} opts
 * @param {{dimensions:Array<{key,label,weight}>, context?:string}} opts.rubric
 * @param {string} opts.text
 * @param {AbortSignal} [opts.signal]
 * @param {(usage: {input,output}) => void} [opts.onUsage]
 * @returns {Promise<Record<string, {score: 0|0.5|1, hint: string}>>}
 */
export async function scoreText({ rubric, text, signal, onUsage }) {
  const res = await fetch('/api/score-text', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ rubric, text }),
    signal,
  });

  if (!res.ok) {
    let errMsg = `Score API error ${res.status}`;
    try {
      const j = await res.json();
      errMsg = j.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  if (data._usage && onUsage) onUsage(data._usage);
  const { _usage, ...scores } = data;
  return scores;
}

/**
 * Generate a complete training case context from product + market + USP.
 *
 * @param {Object} opts
 * @param {string} opts.product
 * @param {string} opts.targetMarket
 * @param {string} [opts.usp]
 * @param {AbortSignal} [opts.signal]
 * @param {(usage: {input,output}) => void} [opts.onUsage]
 * @returns {Promise<Object>} caseContext object (see api/generate-case.js for schema)
 */
export async function generateCase({ product, targetMarket, usp, signal, onUsage }) {
  const res = await fetch('/api/generate-case', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ product, targetMarket, usp }),
    signal,
  });

  if (!res.ok) {
    let errMsg = `Generate-case API error ${res.status}`;
    try {
      const j = await res.json();
      errMsg = j.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  if (data._usage && onUsage) onUsage(data._usage);
  const { _usage, ...result } = data;
  return result;
}

/**
 * Generate all stage-specific training materials (suppliers, HS quiz, QC items, etc.)
 * after a caseContext is established.
 *
 * @param {(usage: {input,output}) => void} [opts.onUsage]
 */
export async function generateStageMaterials({ caseContext, product, targetMarket, usp, signal, onUsage }) {
  const res = await fetch('/api/generate-stage-materials', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ caseContext, product, targetMarket, usp }),
    signal,
  });

  if (!res.ok) {
    let errMsg = `Stage-materials API error ${res.status}`;
    try {
      const j = await res.json();
      errMsg = j.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  if (data._usage && onUsage) onUsage(data._usage);
  const { _usage, ...result } = data;
  return result;
}

/**
 * Detect if the LLM API is configured and reachable.
 * A 400 (bad request) means the server is up — it just needs valid params.
 * A 5xx or network error means the API is down.
 */
export async function pingLLM(timeoutMs = 1500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/buyer-chat', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ _ping: true }),
      signal: ctrl.signal,
    });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
