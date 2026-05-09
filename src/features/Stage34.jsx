import { useMemo, useState } from 'react';
import styles from './Stage34.module.css';
import Button from '../components/Button.jsx';
import AlertBox from '../components/AlertBox.jsx';
import ContextBriefing from '../components/ContextBriefing.jsx';
import DimensionFeedback from '../components/DimensionFeedback.jsx';
import LLMScorePanel from '../components/LLMScorePanel.jsx';
import { useAppState, useAppDispatch } from '../lib/StateContext.jsx';
import { checkProspectingEmail, checkInquiryReply, containsRisk, CERT_PATTERNS, LOW_PRICE_PATTERNS } from '../lib/rules.js';
import { PRINCIPLES } from '../lib/principles.js';
import { analyzeProspectingEmail, analyzeInquiryReply } from '../lib/dimensionAnalysis.js';
import { getActiveMaterials } from '../lib/stageMaterials.js';
import { getActiveCase } from '../lib/caseContext.js';
import { getRubric } from '../lib/scoringRubrics.js';

export default function Stage34() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const step = state.stage34Step || 'prospecting';

  const materials = getActiveMaterials(state);
  const caseCtx = getActiveCase(state);
  const persona = caseCtx?.buyerPersona || {};
  const buyerName = persona.name || 'Michael Braun';
  const buyerCompany = persona.company || 'Braun Kitchenware GmbH';
  const buyerFirstName = buyerName.split(' ')[0];
  const targetMarket = caseCtx?.targetMarket || persona.country || 'the target market';
  const product = caseCtx?.product || state.trainingCase?.product || 'product';
  const mandatoryCerts = caseCtx?.requiredCerts?.filter((c) => c.mandatory) || [];
  const certNames = mandatoryCerts.map((c) => c.name).join(' & ') || 'LFGB';

  // Build dynamic templates from caseContext + materials
  const prospectingTemplate = useMemo(() => {
    const opener = materials.stage3Hints?.openingExamples?.[0]
      || `I noticed your ${targetMarket} import range and believe our ${product.toLowerCase()} would be a great fit for your customers.`;
    const valueProps = materials.stage3Hints?.valuePropExamples?.length
      ? materials.stage3Hints.valuePropExamples.map((v) => `• ${v}`).join('\n')
      : `• ${certNames} certified – fully compliant for ${targetMarket}\n• High-quality materials\n• Custom OEM available`;
    return `Subject: ${certNames}-Certified ${product} – Perfect for ${targetMarket}

Dear ${buyerFirstName},

${opener}

I'm [Your Name] from [Company], specializing in ${product.toLowerCase()} for ${targetMarket}.

Our product features:
${valueProps}

Our current lead time is 25–30 days, and we support OEM/ODM orders.

Could we schedule a 15-minute call this week to discuss your needs? Alternatively, I'd be happy to send a sample so you can evaluate the quality firsthand.

Looking forward to hearing from you.

Best regards,
[Your Name]
[Company] | [Email] | [Phone]`;
  }, [materials, persona, targetMarket, product, certNames, buyerFirstName]);

  const inquiryReplyTemplate = useMemo(() => {
    const spec = materials.piDefaults?.spec || 'see specifications';
    const productDesc = materials.piDefaults?.productDesc || product;
    return `Dear ${buyerFirstName},

Thank you for your inquiry. Please find our product details and quotation below:

Product: ${productDesc}
Specifications: ${spec}
Certifications: ${certNames}

Price: USD [unit price]/pc FOB (MOQ [moq] pcs)
Lead time: 25–30 days after deposit confirmed
Payment: T/T 30% deposit, 70% before shipment

We can provide custom logo and color. Please let me know your preferred quantity and color, and I'll prepare a formal quotation.

Best regards,
[Your Name]`;
  }, [materials, product, certNames, buyerFirstName]);

  // Reading-gate items from materials (with default fallback)
  const INQUIRY_CHECKLIST = materials.stage4ReadingGate?.length
    ? materials.stage4ReadingGate
    : [
        { id: 'spec', label: '买家要求：产品规格（容量/重量/材质）' },
        { id: 'price', label: '买家要求：FOB 报价（500件）' },
        { id: 'cert', label: `买家关注：认证（${certNames}）` },
        { id: 'qty', label: '买家提到：数量区间' },
      ];

  const [prospecting, setProspecting] = useState(state.prospectingEmail || '');
  const [subjectLine, setSubjectLine] = useState(state.prospectingSubjectLine || '');
  const [inquiryReply, setInquiryReply] = useState(state.inquiryReply || '');
  const [pWarnings, setPWarnings] = useState([]);
  const [iWarnings, setIWarnings] = useState([]);

  // Inquiry reading gate
  const [inquiryChecks, setInquiryChecks] = useState({});
  const allChecked = INQUIRY_CHECKLIST.every((item) => inquiryChecks[item.id]);

  // Structured mode toggle for reply
  const [structuredMode, setStructuredMode] = useState(false);
  const [structuredFields, setStructuredFields] = useState({ spec: '', pricing: '', cert: '', payment: '' });

  // Buyer inquiry — prefer dynamic caseContext, fall back to seed message
  const buyerInquiryText =
    caseCtx?.initialInquiryEmail
    || state.messages.find((m) => m.id === 'msg_buyer_inquiry')?.content
    || '';
  // Approx timestamp for response-time indicator (seed has ts)
  const seedMsg = state.messages.find((m) => m.id === 'msg_buyer_inquiry');

  // Live dimension analysis
  const prospectingDims = analyzeProspectingEmail(prospecting);
  const replyDims = analyzeInquiryReply(structuredMode
    ? Object.values(structuredFields).join('\n')
    : inquiryReply
  );

  // Response time simulation
  const elapsedHours = seedMsg ? Math.round((Date.now() - seedMsg.ts) / 3600000) : 0;

  function handleProspectingSubmit() {
    const result = checkProspectingEmail(prospecting);
    setPWarnings(result.warnings || []);
    if (result.blocked) return;

    // Check for low-price language — hard stop
    if (containsRisk(prospecting, LOW_PRICE_PATTERNS)) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_LOW_PRICE_ANCHOR });
      return;
    }

    // Short email — hard stop
    const wordCount = prospecting.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
      dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_SHORT_EMAIL });
      return;
    }

    dispatch({ type: 'SET_PROSPECTING_EMAIL', value: prospecting });
    dispatch({ type: 'SET_PROSPECTING_SUBJECT', value: subjectLine });
    dispatch({ type: 'APPLY_SCORE', actionKey: 'PROSPECTING_PASS' });
    const hasCert = containsRisk(prospecting, CERT_PATTERNS);
    if (hasCert) {
      dispatch({ type: 'APPLY_SCORE', actionKey: 'PROSPECTING_HAS_CERT' });
    }
    const hasSample = /sample/i.test(prospecting);
    if (hasSample) {
      dispatch({ type: 'APPLY_SCORE', actionKey: 'PROSPECTING_HAS_SAMPLE' });
    }

    // Persist a memory fact so Stage 6 buyer LLM "remembers" how the user opened
    const summary = prospecting.trim().slice(0, 100).replace(/\s+/g, ' ');
    dispatch({
      type: 'APPEND_BUYER_MEMORY',
      fact: {
        stage: 3,
        fact: `User's opening prospecting email: "${summary}…" (${hasCert ? 'mentioned certification' : 'no cert mention'}, ${hasSample ? 'offered sample' : 'no sample offer'})`,
        ts: Date.now(),
      },
    });
    if (hasCert) {
      dispatch({
        type: 'UPDATE_BUYER_PROFILE',
        payload: { trust: Math.min(70, (state.buyerProfile?.trust ?? 50) + 5) },
      });
    }

    dispatch({ type: 'REVEAL_INQUIRY' });
    dispatch({ type: 'SET_STAGE34_STEP', step: 'inquiry_reply' });
  }

  function handleUseTemplate() {
    // First line of prospectingTemplate is "Subject: ..."
    const lines = prospectingTemplate.split('\n');
    const subjectMatch = lines[0].match(/^Subject:\s*(.*)$/i);
    if (subjectMatch) setSubjectLine(subjectMatch[1].trim());
    setProspecting(lines.slice(2).join('\n').trim());
  }

  function buildReplyFromStructured() {
    return [
      structuredFields.spec && `Product Specifications:\n${structuredFields.spec}`,
      structuredFields.pricing && `Pricing & Trade Terms:\n${structuredFields.pricing}`,
      structuredFields.cert && `Certifications:\n${structuredFields.cert}`,
      structuredFields.payment && `Payment Terms:\n${structuredFields.payment}`,
    ].filter(Boolean).join('\n\n');
  }

  function handleInquiryReplySubmit() {
    const finalText = structuredMode ? buildReplyFromStructured() : inquiryReply;
    const result = checkInquiryReply(finalText);
    setIWarnings(result.warnings || []);
    if (result.blocked) {
      // Check which dimension is missing and show principle
      if (!analyzeInquiryReply(finalText).find(d => d.label.includes('贸易条款'))?.score) {
        dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_NO_TRADE_TERM });
      } else {
        dispatch({ type: 'SHOW_PRINCIPLE_MODAL', modal: PRINCIPLES.PRINCIPLE_NO_SPEC });
      }
      return;
    }

    dispatch({ type: 'SET_INQUIRY_REPLY', value: finalText });
    dispatch({ type: 'APPLY_SCORE', actionKey: 'INQUIRY_REPLY_PASS' });

    const lowPrice = containsRisk(finalText, LOW_PRICE_PATTERNS);
    if (lowPrice) {
      dispatch({ type: 'APPLY_SCORE', actionKey: 'LOW_PRICE_WORDING' });
      dispatch({ type: 'ADD_RISK_FLAG', flag: { id: 'risk_lowprice_reply', level: 'warn', message: '阶段4：回复中使用低价话术，有损价格谈判空间' } });
    }

    // Persist a memory fact for Stage 6's buyer LLM
    const sum = finalText.trim().slice(0, 100).replace(/\s+/g, ' ');
    dispatch({
      type: 'APPEND_BUYER_MEMORY',
      fact: {
        stage: 4,
        fact: `User's inquiry reply: "${sum}…"${lowPrice ? ' [used low-price wording]' : ''}`,
        ts: Date.now(),
      },
    });

    dispatch({ type: 'SET_STAGE', stage: 5 });
  }

  function handleUseReplyTemplate() {
    setInquiryReply(inquiryReplyTemplate);
    dispatch({ type: 'APPLY_SCORE', actionKey: 'INQUIRY_REPLY_RECOMMENDED' });
  }

  const wordCount = prospecting.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.title}>阶段 3–4：客户开发 & 跟进回复</div>
        <div className={styles.subtitle}>先完成开发信，提交后解锁买家询盘，再回复询盘推进到报价阶段</div>
      </div>

      {/* Step indicator */}
      <div className={styles.steps}>
        <div className={`${styles.step} ${step === 'prospecting' ? styles.stepActive : styles.stepDone}`}>
          {step === 'inquiry_reply' ? '✓ ' : ''}3. 客户开发信
        </div>
        <div className={`${styles.step} ${step === 'inquiry_reply' ? styles.stepActive : ''}`}>
          4. 跟进回复
        </div>
      </div>

      {/* Step 1: Prospecting */}
      {step === 'prospecting' && (
        <ContextBriefing briefingKey="34_prospecting">
          <div className={styles.section}>
            <div className={styles.sectionTitle}>撰写开发信</div>

            {/* Subject line */}
            <div>
              <label className={styles.templateLabel}>邮件主题行 <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                value={subjectLine}
                onChange={(e) => setSubjectLine(e.target.value)}
                placeholder={`例：${certNames}-Certified ${product} – Interested in ${targetMarket}`}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
              />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {subjectLine.length} 字符 / 建议 ≤ 60 字符，{subjectLine.length > 60 ? '⚠️ 过长' : '✓'}
              </div>
            </div>

            <div>
              <div className={styles.templateLabel}>推荐模板参考</div>
              <div className={styles.template}>{prospectingTemplate}</div>
            </div>

            {/* Side-by-side layout */}
            <div className={styles.editorLayout}>
              <div>
                <textarea
                  className={styles.textarea}
                  value={prospecting}
                  onChange={(e) => setProspecting(e.target.value)}
                  placeholder="在此输入你的开发信正文…（不含主题行）"
                  rows={10}
                />
                <div className={styles.wordCount}>{wordCount} 词 / 建议 ≥ 80 词</div>
              </div>
              <LLMScorePanel
                text={prospecting}
                rubric={getRubric('prospecting_email', state)}
                fallbackDims={prospectingDims}
                cacheKey={state.caseContext ? 'with-case' : 'no-case'}
                minLength={50}
              />
            </div>

            <div className={styles.warnings}>
              {pWarnings.map((w, i) => <AlertBox key={i} level={w.level} msg={w.msg} />)}
            </div>

            <div className={styles.actions}>
              <Button onClick={handleProspectingSubmit} disabled={!prospecting.trim() || !subjectLine.trim()}>
                提交开发信，解锁买家询盘 →
              </Button>
              <Button variant="ghost" size="sm" onClick={handleUseTemplate}>一键采用推荐模板</Button>
            </div>
          </div>
        </ContextBriefing>
      )}

      {/* Step 2: Inquiry reply */}
      {step === 'inquiry_reply' && (
        <ContextBriefing briefingKey="34_inquiry_reply">
          <div className={styles.section}>
            {/* Response time indicator */}
            {elapsedHours > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                color: elapsedHours > 48 ? 'var(--color-error)' : elapsedHours > 24 ? 'var(--color-warn)' : 'var(--color-success)',
                padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)'
              }}>
                <span>⏱</span>
                <span>询盘已发出 {elapsedHours} 小时
                  {elapsedHours > 48 ? ' — ⚠️ 超过 48h，回复率已大幅下降' : elapsedHours > 24 ? ' — 建议尽快回复' : ' — 回复及时 ✓'}
                </span>
              </div>
            )}

            {/* Show buyer inquiry — prefer dynamic from caseContext */}
            {buyerInquiryText && (
              <div>
                <div className={styles.buyerMsgLabel}>📨 买家询盘（{buyerName}, {buyerCompany}）</div>
                <div className={styles.buyerMsg}>{buyerInquiryText}</div>
              </div>
            )}

            {/* Reading comprehension gate */}
            {!allChecked && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 10 }}>
                  先仔细阅读买家邮件，勾选你理解的买家需求（全部勾选后解锁回复区）
                </div>
                {INQUIRY_CHECKLIST.map((item) => (
                  <label key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!inquiryChecks[item.id]}
                      onChange={(e) => setInquiryChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            )}

            {allChecked && (
              <>
                {/* Mode toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>回复模式：</div>
                  <button
                    onClick={() => setStructuredMode(false)}
                    style={{
                      padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 16,
                      border: '1px solid var(--color-border)', cursor: 'pointer',
                      background: !structuredMode ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: !structuredMode ? '#fff' : 'var(--color-text)',
                    }}
                  >自由撰写</button>
                  <button
                    onClick={() => setStructuredMode(true)}
                    style={{
                      padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 16,
                      border: '1px solid var(--color-border)', cursor: 'pointer',
                      background: structuredMode ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: structuredMode ? '#fff' : 'var(--color-text)',
                    }}
                  >结构化模式（引导）</button>
                </div>

                <div className={styles.sectionHint}>
                  回复须包含：产品规格（尺寸/重量/材质）、含贸易条款的报价（FOB/CIF/DDP）
                </div>

                {!structuredMode && (
                  <>
                    <div>
                      <div className={styles.templateLabel}>推荐回复参考</div>
                      <div className={styles.template}>{inquiryReplyTemplate}</div>
                    </div>

                    <div className={styles.editorLayout}>
                      <textarea
                        className={styles.textarea}
                        value={inquiryReply}
                        onChange={(e) => setInquiryReply(e.target.value)}
                        placeholder="在此输入你的回复…"
                        rows={10}
                      />
                      <LLMScorePanel
                        text={inquiryReply}
                        rubric={getRubric('inquiry_reply', state)}
                        fallbackDims={replyDims}
                        cacheKey={state.caseContext ? 'with-case' : 'no-case'}
                        minLength={50}
                      />
                    </div>
                  </>
                )}

                {structuredMode && (
                  <div className={styles.editorLayout}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { key: 'spec', label: '① 产品规格（尺寸/重量/材质）', placeholder: '例：500ml, Ø70×H220mm, 280g, 304 stainless steel inner, BPA-free lid' },
                        { key: 'pricing', label: '② 报价 & 贸易条款（FOB/CIF/DDP）', placeholder: '例：USD 5.80/pc FOB Yiwu (MOQ 500 pcs), USD 5.50/pc FOB Yiwu (MOQ 1,000 pcs)' },
                        { key: 'cert', label: '③ 认证信息', placeholder: '例：LFGB certified, CE compliant, BPA-free, SGS tested' },
                        { key: 'payment', label: '④ 付款条件', placeholder: '例：T/T 30% deposit, 70% before shipment' },
                      ].map(field => (
                        <div key={field.key}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>{field.label}</div>
                          <textarea
                            rows={2}
                            value={structuredFields[field.key]}
                            onChange={(e) => setStructuredFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            style={{ width: '100%', padding: '8px', fontSize: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'inherit', resize: 'vertical' }}
                          />
                        </div>
                      ))}
                    </div>
                    <LLMScorePanel
                      text={Object.values(structuredFields).join('\n')}
                      rubric={getRubric('inquiry_reply', state)}
                      fallbackDims={replyDims}
                      cacheKey={state.caseContext ? 'with-case' : 'no-case'}
                      minLength={50}
                    />
                  </div>
                )}

                <div className={styles.warnings}>
                  {iWarnings.map((w, i) => <AlertBox key={i} level={w.level === 'block' ? 'error' : w.level} msg={w.msg} />)}
                </div>

                <div className={styles.actions}>
                  <Button onClick={handleInquiryReplySubmit} disabled={structuredMode ? !Object.values(structuredFields).some(v => v.trim()) : !inquiryReply.trim()}>
                    提交回复，进入报价阶段 →
                  </Button>
                  {!structuredMode && (
                    <Button variant="ghost" size="sm" onClick={handleUseReplyTemplate}>一键采用推荐回复</Button>
                  )}
                </div>
              </>
            )}
          </div>
        </ContextBriefing>
      )}
    </div>
  );
}
