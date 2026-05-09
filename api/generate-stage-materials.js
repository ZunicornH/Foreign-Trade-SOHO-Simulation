// Vercel Edge Function — given a generated caseContext, produces all stage-specific
// training materials (suppliers, HS quiz, QC items, B/L fields, complaint scenario, etc.)
// in one shot so every stage adapts to the user's chosen product/market.
//
// POST /api/generate-stage-materials
// Body: { caseContext, product, targetMarket, usp }
// Response: see SCHEMA in src/lib/stageMaterials.js for shape.

export const config = { maxDuration: 60 };

import { getCorsHeaders, handlePreflight, checkAuth, jsonCors } from './_shared.js';

const stripJsonFences = (s) => s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const SYSTEM_PROMPT = `You are a senior foreign-trade SOHO mentor. Given a training case (product/market/buyer persona/required certs already established), produce all stage-specific training materials in one strict JSON object. Be concrete, product-specific, and pedagogically rich.

Output STRICT JSON only (no markdown, no comments). Schema:

{
  "suppliers": [
    {
      "id": "sup_a" | "sup_b",
      "name": "realistic Chinese supplier name fitting the industry, e.g. '义乌恒美玩具有限公司'",
      "city": "Chinese city (Yiwu / Shenzhen / Dongguan / Ningbo / Foshan / 等)",
      "factoryPriceCNY": number,
      "moq": number,
      "sampleFee": number,
      "certSupport": true | false,
      "qcCapability": "third-party" | "in-house",
      "leadTimeDays": number,
      "profileNote": "≤30 char Chinese tip about this supplier's strength/weakness"
    }
    // EXACTLY 2 entries. Design tension: ONE should be cheaper but lacks the mandatory cert(s) (certSupport:false, third-party QC, longer leadtime); the OTHER pricier with cert + in-house QC + faster leadtime.
  ],
  "hsCodeQuiz": {
    "question": "针对你的<product>...哪个 HS 编码最准确？",
    "options": [
      {
        "code": "actual realistic HS code (e.g. 9503.00.00)",
        "name": "Chinese description of category",
        "correct": true | false,
        "explanation": "≤80 char Chinese, why this is right or wrong"
      }
      // EXACTLY 4 options. Exactly ONE correct. Distractors should be plausible — adjacent chapters, related materials, common confusion (e.g. plastic vs wood).
    ]
  },
  "qcChecklist": [
    {
      "id": "qc_1" | "qc_2" | "qc_3",
      "label": "≤12 char Chinese label, e.g. '掉漆测试' / '尺寸公差' / '功能测试'",
      "description": "≤60 char Chinese, what is being checked and why",
      "riskLevel": "high" | "medium" | "low",
      "factoryToleranceClaim": "≤40 char Chinese, factory's typical defense if user rejects (e.g. '该公差在行业标准内')"
    }
    // EXACTLY 3 items. Must be product-specific. Toys → small parts/paint/finish. Electronics → function/labels/packaging. Food → weight/seal/expiry. Apparel → stitching/colorfast/sizing.
  ],
  "blFields": [
    { "label": "Consignee", "value": "string (intentional typo if isError)", "isError": true | false, "errorType": "spelling" | null },
    { "label": "HS Code",   "value": "actual code matching PI", "isError": true | false, "errorType": "mismatch" | null },
    { "label": "Port of Loading", "value": "string", "isError": false, "errorType": null },
    { "label": "Port of Discharge", "value": "string", "isError": false, "errorType": null },
    { "label": "Quantity / Description", "value": "string", "isError": false, "errorType": null }
    // EXACTLY 5 items. EXACTLY 2 errors: one consignee typo (spelling) + one HS code that mismatches the correct HS (different from hsCodeQuiz correct answer).
  ],
  "complaintScenario": {
    "issueType": "string Chinese, ≤20 char (e.g. '掉漆' / '功能失灵' / '色差')",
    "issueDetailEn": "string English, ≤120 char — Michael's complaint email body fragment about this issue",
    "sampleData": "string Chinese, ≤30 char (e.g. '500件中30件出现掉漆，6%')",
    "factoryLeverageGood": "≤60 char Chinese — what factory says if user REJECTED tolerance in Stage 8 (better leverage)",
    "factoryLeverageBad":  "≤60 char Chinese — what factory says if user ACCEPTED tolerance in Stage 8 (factory uses it as precedent)"
  },
  "piDefaults": {
    "productDesc": "≤80 char Chinese — typical PI product description for this product",
    "spec":        "≤80 char (mix Chinese + technical specs in English/numbers as natural)"
  },
  "stage3Hints": {
    "openingExamples": [
      "≤80 char English realistic email opener for THIS product/market — 3 options"
    ],
    "valuePropExamples": [
      "≤80 char English value-prop sentence — 3 options"
    ]
  },
  "stage4ReadingGate": [
    { "id": "rg_1" | "rg_2" | "rg_3" | "rg_4", "label": "≤30 char Chinese — what buyer asked about (specs / certs / pricing / quantity / etc.)" }
    // EXACTLY 4 items. These are the 'reading-gate' checkboxes user must tick before replying. Should match what's in caseContext.initialInquiryEmail.
  ],
  "shipmentNotifyRubric": {
    "dimensions": [
      { "key": "tracking", "label": "追踪号 / B/L 引用" },
      { "key": "balance",  "label": "尾款金额明确" },
      { "key": "deadline", "label": "付款截止具体日期" },
      { "key": "<product-specific>", "label": "≤16 char Chinese — product-specific dim, e.g. 易碎品提示 / 温控提醒 / 海关申报值确认" }
    ]
  },
  "repurchaseRubric": {
    "dimensions": [
      { "key": "newProduct", "label": "新品 / 系列引导" },
      { "key": "urgency",    "label": "紧迫感 / 季节钩" },
      { "key": "personalization", "label": "个性化称呼" },
      { "key": "loyalty",    "label": "忠诚度激励" }
    ]
  }
}

Hard rules:
- Stick to provided caseContext when sensible (use buyerPersona.name, requiredCerts, hsCodeRange, etc.). Do NOT introduce a different buyer name.
- Suppliers MUST create real teaching tension: one cheaper-but-non-compliant, one pricier-but-compliant. The mandatory cert(s) from caseContext.requiredCerts is what differentiates them.
- HS quiz correct option's code MUST be plausible per caseContext.hsCodeRange.
- B/L mismatched HS code (the error) must be ADJACENT/CONFUSABLE but wrong (different chapter or material).
- Complaint scenario MUST be a defect type that QC could plausibly have caught in Stage 8 — connect the two stages.
- All Chinese text within stated character limits.`;

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

  const { caseContext, product, targetMarket, usp } = body;
  if (!caseContext || !product || !targetMarket) {
    return jsonCors({ error: 'caseContext + product + targetMarket required' }, 400, cors);
  }

  const ctxSummary = JSON.stringify(
    {
      product,
      targetMarket,
      usp,
      requiredCerts: caseContext.requiredCerts,
      hsCodeRange: caseContext.hsCodeRange,
      buyerPersona: caseContext.buyerPersona,
      pricingBaseline: caseContext.pricingBaseline,
      supplierProfileHint: caseContext.supplierProfileHint,
      culturalNotes: caseContext.culturalNotes,
      tariffNotes: caseContext.tariffNotes,
      commonPitfalls: caseContext.commonPitfalls,
    },
    null,
    2
  );

  const userPrompt = `Case context:\n${ctxSummary}\n\nGenerate the stage materials JSON now.`;

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
        max_tokens: 2800,
        temperature: 0.7,
      }),
      // 45s fits within Vercel Edge Function max duration; original 60s risked timeout.
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    return jsonCors({ error: 'Upstream fetch failed', detail: String(e) }, 502, cors);
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return jsonCors(
      { error: 'Upstream error', status: upstream.status, detail: errText },
      upstream.status,
      cors
    );
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
    parsed = JSON.parse(stripJsonFences(content));
  } catch {
    return jsonCors({ error: 'LLM output was not valid JSON', raw: content }, 502, cors);
  }

  const usage = data.usage;
  return jsonCors(
    { ...parsed, _usage: usage ? { input: usage.prompt_tokens, output: usage.completion_tokens } : undefined },
    200,
    cors
  );
}
