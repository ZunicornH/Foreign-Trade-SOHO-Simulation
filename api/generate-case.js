// Vercel Edge Function — given product + targetMarket + usp, generates a complete training case context.
// POST /api/generate-case
// Body: { product: string, targetMarket: string, usp: string }
// Response: structured caseContext (see schema in src/lib/caseContext.js)

export const config = { runtime: 'edge' };

import { getCorsHeaders, handlePreflight, checkAuth, jsonCors } from './_shared.js';

const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

// In-memory case cache — survives across requests on warm Fluid Compute instances.
// Stores parsed case data only (no _usage) to avoid false token counts on cache hits.
const caseCache = new Map(); // hash → { data, ts }
const CACHE_MAX = 50;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

async function buildCacheKey(product, targetMarket, usp) {
  const text = `${product}|${targetMarket}|${usp || ''}`.toLowerCase().trim();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function cacheGet(key) {
  const entry = caseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { caseCache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  if (caseCache.size >= CACHE_MAX) {
    caseCache.delete(caseCache.keys().next().value);
  }
  caseCache.set(key, { data, ts: Date.now() });
}

const SYSTEM_PROMPT = `You are a senior foreign-trade SOHO mentor. Given a Chinese exporter's product, target market, and USP, generate a realistic training case for a junior salesperson.

Output STRICT JSON only (no markdown, no commentary). The schema is:

{
  "requiredCerts": [
    { "name": "string (e.g. LFGB, FDA, FCC, CE, ASTM F963)", "mandatory": true|false, "body": "issuing authority", "region": "scope", "note": "≤30 char Chinese tip" }
  ],
  "hsCodeRange": "string (e.g. '7323.93.x for stainless kitchenware')",
  "tariffNotes": "string (≤80 char Chinese, mention rate range and any anti-dumping/quota issues)",
  "culturalNotes": "string (≤120 char Chinese, target-market buyer expectations / taboos)",
  "commonPitfalls": ["string (≤40 char Chinese)", "string", "string"],
  "buyerPersona": {
    "name": "realistic full name fitting the market (NOT John Doe / Jane Smith)",
    "company": "realistic importer company name fitting the industry",
    "city": "string",
    "country": "string",
    "role": "Procurement Manager | Buyer | CEO | etc.",
    "background": "≤80 char English, years of experience + industry focus",
    "style": "≤60 char English, e.g. 'professional, polite, tough on price, values authenticity'",
    "language": "primary language they'd write in (usually English)"
  },
  "initialInquiryEmail": "string — a realistic 6-10 sentence inquiry email this buyer would send after seeing the seller's product. Include: greeting, brief company intro, 4-5 specific requests (specs/price/MOQ/cert/leadtime), polite closing with name. Use English unless the market expects otherwise.",
  "supplierProfileHint": "≤60 char Chinese, suggest what kind of CN supplier matches this product (e.g. '广东深圳为主，有OEM能力')",
  "pricingBaseline": {
    "factoryPriceCNY": [low, high],
    "moqRange": [low, high],
    "marginAdvice": "≤40 char Chinese"
  }
}

Rules:
- Be specific to the product/market combo. Different products → different certs, HS codes, buyer personalities.
- Buyer name + company must feel real (avoid clichés like "John Smith / Acme Corp").
- All Chinese fields ≤ stated char limits.
- requiredCerts: 2-4 items, mark only the truly mandatory ones as mandatory:true.
- commonPitfalls: 3 items, must be product-specific, not generic.`;

export default async function handler(req) {
  const cors = getCorsHeaders(req);
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return jsonCors({ error: 'Method not allowed' }, 405, cors);
  if (!checkAuth(req)) return jsonCors({ error: 'Unauthorized' }, 401, cors);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonCors({ error: 'Server missing DEEPSEEK_API_KEY' }, 500, cors);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonCors({ error: 'Invalid JSON body' }, 400, cors);
  }

  const { product, targetMarket, usp } = body;
  if (!product || !targetMarket) {
    return jsonCors({ error: 'product and targetMarket required' }, 400, cors);
  }

  const key = await buildCacheKey(product, targetMarket, usp);
  const cached = cacheGet(key);
  // Cache hit: return data without _usage — no tokens were consumed
  if (cached) return jsonCors(cached, 200, cors);

  const userPrompt = `Product: ${product}
Target market: ${targetMarket}
Seller's USP / 卖点: ${usp || '(not specified)'}

Generate the training case context.`;

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        max_tokens: 1500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(45_000),
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

  // Store only the parsed case data — no _usage — so cache hits don't emit false token counts.
  cacheSet(key, parsed);

  const usage = data.usage;
  return jsonCors(
    { ...parsed, _usage: usage ? { input: usage.prompt_tokens, output: usage.completion_tokens } : undefined },
    200,
    cors
  );
}
