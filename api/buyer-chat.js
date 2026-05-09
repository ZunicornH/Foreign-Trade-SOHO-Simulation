// Vercel Edge Function — streams buyer dialogue from DeepSeek back to client (SSE).
// POST /api/buyer-chat
// Body: { caseContext: object, buyerProfile: object, stageContext: string, messages: [{role, content}] }
// Response: text/event-stream with `data: {token}` / `data: {done, usage?}` lines.

export const config = { runtime: 'edge' };

import { getCorsHeaders, handlePreflight, checkAuth } from './_shared.js';

const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

// ── Buyer persona prompt builder (inlined from src/lib/buyerPersona.js) ──────
const MOOD_VALUES = new Set(['neutral', 'softening', 'hardening', 'excited', 'disappointed']);

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function deduplicateMemory(facts) {
  return facts.filter((fact, i) => {
    const key = fact.fact.toLowerCase().slice(0, 50);
    return !facts.slice(i + 1).some((later) => later.fact.toLowerCase().includes(key));
  });
}

function buildBuyerSystemPrompt({ caseContext, buyerProfile, stageContext, memoryLimit = 8 }) {
  const persona = caseContext?.buyerPersona || {};
  const name = persona.name || 'Michael Braun';
  const role = persona.role || 'Procurement Manager';
  const company = persona.company || 'Braun Kitchenware GmbH';
  const city = persona.city || 'Hamburg';
  const country = persona.country || 'Germany';
  const background = persona.background || '8 years of experience in import procurement.';
  const style = persona.style || 'professional, polite, tough on price';
  const language = persona.language || 'English';

  const mood = buyerProfile?.mood || 'neutral';
  const trust = clamp(buyerProfile?.trust ?? 50, 0, 100);
  const patience = clamp(buyerProfile?.patience ?? 100, 0, 100);

  const memory = Array.isArray(buyerProfile?.memory) ? buyerProfile.memory : [];
  const recent = deduplicateMemory(memory.slice(-memoryLimit));
  const memoryBlock = recent.length
    ? recent.map((m) => `- [Stage ${m.stage ?? '?'}${m.round ? ` r${m.round}` : ''}] ${m.fact}`).join('\n')
    : '(none yet — this is the first contact / no prior interactions recorded)';

  return `You are ${name}, ${role} at ${company} (${city}, ${country}).
Background: ${background}
Personality: ${style}

Respond strictly in character — never break the fourth wall, never say "as an AI". Reply in ${language}. Keep replies short and natural: at most 3 short paragraphs. Reflect your current mood through tone and word choice — do NOT announce the mood explicitly.

After your reply, on the FINAL line by itself, emit exactly one tag block (it will be stripped from the message shown to the user):
[MOOD:<one of: neutral|softening|hardening|excited|disappointed>] [TRUST:<signed integer between -20 and +20>] [PATIENCE:<signed integer between -20 and +20>]

Strict constraints on the tag:
- TRUST and PATIENCE are signed DELTAS for THIS turn only — never the absolute level. They must be between -20 and +20 inclusive.
- Typical magnitudes: ±3 (small reaction), ±8 (notable), ±15 (strong reaction). Reserve ±20 for extreme moments (deal-breaker, breakthrough).
- Examples: user politely held price → +5 trust, +0 patience. User dropped 8% with no exchange → -2 trust, -10 patience. User walked away rudely → -15 trust, -20 patience.
- Set MOOD based on what just happened in this turn, not your default mood.
- Never omit the tag line. Never write the tag inline within paragraphs.

---
Current mood: ${mood} (trust=${trust}/100, patience=${patience}/100)

Memory of past interactions with this supplier (most recent at the bottom):
${memoryBlock}

Current scenario: ${stageContext}`;
}
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req) {
  const cors = getCorsHeaders(req);

  // CORS preflight
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server missing DEEPSEEK_API_KEY env var' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  const { caseContext, buyerProfile, stageContext, messages = [] } = body;
  if (!stageContext || typeof stageContext !== 'string') {
    return new Response(JSON.stringify({ error: 'stageContext required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  // Build system prompt server-side — client never controls persona injection.
  const systemPrompt = buildBuyerSystemPrompt({ caseContext, buyerProfile, stageContext });

  const baseUrl = process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE;
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

  // Fold old history when conversation grows long — keeps input tokens bounded.
  const MAX_HISTORY = 8;
  let activeMessages = messages;
  if (messages.length > MAX_HISTORY) {
    const archived = messages.slice(0, messages.length - MAX_HISTORY);
    const snippets = archived
      .filter((m) => m.role === 'user')
      .map((m) => m.content.replace(/\s+/g, ' ').slice(0, 60))
      .join(' / ');
    // Prepend summary as a user/assistant pair so the history starts with 'user'.
    activeMessages = [
      { role: 'user', content: `[Earlier context summary] Supplier previously discussed: ${snippets}` },
      { role: 'assistant', content: 'Understood, I recall our earlier exchange.' },
      ...messages.slice(-MAX_HISTORY),
    ];
  }

  const upstreamReq = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...activeMessages],
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: 300,
    temperature: 0.85,
  };

  let upstream;
  let attempt = 0;
  let lastErr = null;
  while (attempt < 2) {
    attempt += 1;
    try {
      upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(upstreamReq),
        signal: AbortSignal.timeout(28_000),
      });
      if (upstream.status >= 500 && upstream.status < 600 && attempt < 2) {
        lastErr = `upstream ${upstream.status}`;
        continue;
      }
      lastErr = null;
      break;
    } catch (e) {
      lastErr = String(e);
      if (attempt >= 2) break;
    }
  }
  if (!upstream || lastErr) {
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed', detail: lastErr || 'unknown' }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...cors } }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: 'Upstream error', status: upstream.status, detail: errText }),
      { status: upstream.status || 502, headers: { 'Content-Type': 'application/json', ...cors } }
    );
  }

  // Transform DeepSeek SSE → simplified {token, done} SSE for the client.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = '';
      let streamUsage = null;
      try {
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
            if (payload === '[DONE]') {
              const donePayload = streamUsage
                ? { done: true, usage: { input: streamUsage.prompt_tokens, output: streamUsage.completion_tokens } }
                : { done: true };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`));
              continue;
            }
            try {
              const json = JSON.parse(payload);
              if (json.usage) streamUsage = json.usage;
              const token = json.choices?.[0]?.delta?.content ?? '';
              if (token) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...cors,
    },
  });
}
