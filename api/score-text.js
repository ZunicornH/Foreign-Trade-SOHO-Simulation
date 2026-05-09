// Vercel Edge Function — scores a piece of user text against a rubric, returns JSON.
// POST /api/score-text
// Body: { rubric: { dimensions: [{key,label,weight}], context: string }, text: string }
// Response: { dim_key: { score: 0|0.5|1, hint: string }, ... }

export const config = { runtime: 'edge' };

import { getCorsHeaders, handlePreflight, checkAuth, jsonCors } from './_shared.js';

const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

export default async function handler(req) {
  const cors = getCorsHeaders(req);
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return jsonCors({ error: 'Method not allowed' }, 405, cors);
  if (!checkAuth(req)) return jsonCors({ error: 'Unauthorized' }, 401, cors);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonCors({ error: 'Server missing DEEPSEEK_API_KEY env var' }, 500, cors);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonCors({ error: 'Invalid JSON body' }, 400, cors);
  }

  const { rubric, text } = body;
  if (!rubric?.dimensions || !Array.isArray(rubric.dimensions) || !text) {
    return jsonCors({ error: 'rubric.dimensions and text required' }, 400, cors);
  }

  const dimList = rubric.dimensions
    .map((d) => `  - "${d.key}": ${d.label}`)
    .join('\n');

  const systemPrompt = `You are an expert foreign-trade SOHO mentor evaluating a student's writing.

Context for this evaluation: ${rubric.context || '(none)'}

Score the student's text on these dimensions (output JSON only — NO markdown, NO commentary):
${dimList}

Each dimension MUST receive:
  - "score": exactly one of 0, 0.5, or 1 (0 = absent/wrong, 0.5 = partial, 1 = strong)
  - "hint": a single SHORT sentence in Chinese (≤ 30 chars) explaining the score and how to improve. Use "✓" prefix when score is 1.

Output schema (strict JSON, no extra keys):
{
  "${rubric.dimensions[0]?.key}": { "score": 0|0.5|1, "hint": "..." },
  ...
}`;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE;
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Student text to evaluate:\n\n${text}` },
        ],
        stream: false,
        max_tokens: 400,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(28_000),
    });
  } catch (e) {
    return jsonCors({ error: 'Upstream fetch failed', detail: String(e) }, 502, cors);
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return jsonCors({ error: 'Upstream error', status: upstream.status, detail: errText }, upstream.status, cors);
  }

  let data;
  try {
    data = await upstream.json();
  } catch (e) {
    return jsonCors({ error: 'Upstream parse failed', detail: String(e) }, 502, cors);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) return jsonCors({ error: 'No content in upstream response' }, 502, cors);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return jsonCors({ error: 'LLM output was not valid JSON', raw: content }, 502, cors);
  }

  // Sanitize: keep only known dim keys, clamp scores.
  const sanitized = {};
  for (const d of rubric.dimensions) {
    const entry = parsed[d.key];
    if (!entry || typeof entry !== 'object') {
      sanitized[d.key] = { score: 0, hint: '未生成评分' };
      continue;
    }
    let score = Number(entry.score);
    if (!(score === 0 || score === 0.5 || score === 1)) {
      score = score >= 0.75 ? 1 : score >= 0.25 ? 0.5 : 0;
    }
    sanitized[d.key] = { score, hint: String(entry.hint ?? '').slice(0, 80) };
  }

  const usage = data.usage;
  return jsonCors(
    { ...sanitized, _usage: usage ? { input: usage.prompt_tokens, output: usage.completion_tokens } : undefined },
    200,
    cors
  );
}
