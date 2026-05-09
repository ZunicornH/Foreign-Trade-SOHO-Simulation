// Shared helpers for all Vercel Edge API routes.

/**
 * Build CORS response headers.
 * Set ALLOWED_ORIGIN env var to your production URL (e.g. https://myapp.vercel.app).
 * Defaults to '*' which is fine for personal / dev deployments.
 */
export function getCorsHeaders(req) {
  const allowed = process.env.ALLOWED_ORIGIN || '*';
  const origin = req.headers.get('origin') || '';
  const allow = allowed === '*' ? '*' : (origin === allowed ? origin : 'null');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-secret',
  };
}

/**
 * Handle OPTIONS preflight. Returns a Response or null if not OPTIONS.
 */
export function handlePreflight(req) {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

/**
 * Verify optional per-deployment API secret.
 * If SOHO_API_SECRET env var is set, the request must carry it in x-api-secret header.
 * If the env var is unset, all requests are allowed (personal dev default).
 */
export function checkAuth(req) {
  const secret = process.env.SOHO_API_SECRET;
  if (!secret) return true;
  return req.headers.get('x-api-secret') === secret;
}

/**
 * Strip markdown code fences that some models wrap around JSON output.
 * e.g. ```json\n{...}\n``` → {...}
 */
export function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

/**
 * Respond with JSON + CORS headers.
 */
export function jsonCors(obj, status = 200, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(corsHeaders || {}),
    },
  });
}
