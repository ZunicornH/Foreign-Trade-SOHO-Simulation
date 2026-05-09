// Buyer persona prompt builder — converts the dynamic caseContext.buyerPersona
// + state.buyerProfile (mood/trust/patience/memory) into a system prompt for
// the LLM, and parses the tail-tag the LLM emits to update buyer state.

const MOOD_VALUES = new Set(['neutral', 'softening', 'hardening', 'excited', 'disappointed']);

/**
 * Build the system prompt that pins the buyer's identity, current emotional state,
 * and accumulated memory of past interactions for any LLM-driven dialogue stage.
 *
 * @param {Object} args
 * @param {Object} args.caseContext  — the dynamic case (caseContext.buyerPersona)
 * @param {Object} args.buyerProfile — { mood, trust, patience, memory[] }
 * @param {string} args.stageContext — short string describing the current scenario
 * @param {number} [args.memoryLimit=8]
 * @returns {string} system prompt
 */
export function buildBuyerSystemPrompt({
  caseContext,
  buyerProfile,
  stageContext,
  memoryLimit = 8,
}) {
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
    ? recent
        .map((m) => `- [Stage ${m.stage ?? '?'}${m.round ? ` r${m.round}` : ''}] ${m.fact}`)
        .join('\n')
    : '(none yet — this is the first contact / no prior interactions recorded)';

  // === STATIC PREFIX (stable across all rounds → maximises DeepSeek prompt-cache hits) ===
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

/**
 * Strip the trailing [MOOD:..][TRUST:..][PATIENCE:..] tag from the LLM output
 * and return both the user-facing text and the parsed deltas.
 *
 * @param {string} raw
 * @returns {{ cleanText: string, mood: string|null, trustDelta: number, patienceDelta: number }}
 */
export function parseBuyerTags(raw) {
  if (!raw) return { cleanText: '', mood: null, trustDelta: 0, patienceDelta: 0 };

  const tagRegex = /\[\s*MOOD\s*:\s*(\w+)\s*\][\s　]*\[\s*TRUST\s*:\s*([+-]?\d+)\s*\][\s　]*\[\s*PATIENCE\s*:\s*([+-]?\d+)\s*\]/i;
  const match = raw.match(tagRegex);

  if (!match) {
    // Try lenient: any of the 3 fields missing — collect what we can
    const moodAlt = /\[\s*MOOD\s*:\s*(\w+)\s*\]/i.exec(raw);
    const trustAlt = /\[\s*TRUST\s*:\s*([+-]?\d+)\s*\]/i.exec(raw);
    const patAlt = /\[\s*PATIENCE\s*:\s*([+-]?\d+)\s*\]/i.exec(raw);
    const idx = [moodAlt, trustAlt, patAlt].filter(Boolean).reduce(
      (m, x) => Math.min(m, x.index),
      raw.length
    );
    const cleanText = raw.slice(0, idx).replace(/\s+$/, '');
    return {
      cleanText,
      mood: moodAlt && MOOD_VALUES.has(moodAlt[1].toLowerCase()) ? moodAlt[1].toLowerCase() : null,
      trustDelta: trustAlt ? clamp(Number(trustAlt[1]), -20, 20) : 0,
      patienceDelta: patAlt ? clamp(Number(patAlt[1]), -20, 20) : 0,
    };
  }

  const cleanText = raw.slice(0, match.index).replace(/\s+$/, '');
  const moodRaw = (match[1] || '').toLowerCase();
  const mood = MOOD_VALUES.has(moodRaw) ? moodRaw : null;
  return {
    cleanText,
    mood,
    trustDelta: clamp(Number(match[2]), -20, 20),
    patienceDelta: clamp(Number(match[3]), -20, 20),
  };
}

/**
 * Apply parsed tag deltas onto a buyerProfile, returning a new profile
 * with mood updated, trust / patience clamped to [0,100].
 */
export function applyBuyerTags(profile, parsed) {
  const trust = clamp((profile?.trust ?? 50) + (parsed?.trustDelta || 0), 0, 100);
  const patience = clamp((profile?.patience ?? 100) + (parsed?.patienceDelta || 0), 0, 100);
  return {
    ...(profile || {}),
    mood: parsed?.mood || profile?.mood || 'neutral',
    trust,
    patience,
  };
}

/** Quick helper to summarize a round into a memory fact. */
export function summarizeRoundFact({ stage, round, userText, signal }) {
  const trimmed = (userText || '').trim().slice(0, 120).replace(/\s+/g, ' ');
  const sig = signal ? ` [${signal}]` : '';
  return {
    stage,
    round,
    fact: `User said: "${trimmed}${trimmed.length >= 120 ? '…' : ''}"${sig}`,
    ts: Date.now(),
  };
}

function deduplicateMemory(facts) {
  return facts.filter((fact, i) => {
    const key = fact.fact.toLowerCase().slice(0, 50);
    return !facts.slice(i + 1).some((later) => later.fact.toLowerCase().includes(key));
  });
}

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
