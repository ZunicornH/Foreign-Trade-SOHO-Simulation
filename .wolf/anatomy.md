# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-06T08:30:41.222Z
> Files: 64 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.gitignore` — Git ignore rules (~20 tok)
- `CLAUDE.md` — OpenWolf (~57 tok)
- `index.html` — 外贸 SOHO 模拟训练工作台 (~201 tok)
- `package-lock.json` — npm lock file (~16041 tok)
- `package.json` — Node.js package manifest (~103 tok)
- `vite.config.js` — Vite build configuration (~38 tok)

## .claude/

- `launch.json` (~54 tok)
- `settings.json` (~441 tok)
- `settings.local.json` (~177 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## C:/Users/20443/.claude/plans/

- `https-vercel-com-docs-agent-resources-s-functional-teacup.md` — Plan: 初始化 Git 仓库并推送到 GitHub (~156 tok)

## src/

- `App.jsx` — StagePanel (~679 tok)
- `App.module.css` — Styles: 11 rules (~585 tok)
- `main.jsx` (~98 tok)

## src/components/

- `AlertBox.jsx` — ICONS (~103 tok)
- `AlertBox.module.css` — Styles: 7 rules (~273 tok)
- `Button.jsx` — Button (~125 tok)
- `Button.module.css` — Styles: 12 rules (~538 tok)
- `Card.jsx` — Card (~73 tok)
- `Card.module.css` — Styles: 2 rules (~95 tok)
- `ContextBriefing.jsx` — ContextBriefing — uses useState (~687 tok)
- `ContextBriefing.module.css` — Styles: 22 rules (~1042 tok)
- `DecisionQuiz.jsx` — Props: (~950 tok)
- `DecisionQuiz.module.css` — Styles: 28 rules (~1163 tok)
- `DimensionFeedback.jsx` — Props: (~289 tok)
- `DimensionFeedback.module.css` — Styles: 9 rules (~333 tok)
- `PrincipleModal.jsx` — PrincipleModal (~455 tok)
- `PrincipleModal.module.css` — Styles: 22 rules (~962 tok)

## src/data/

- `briefings.js` — ContextBriefing content — shown before each stage's operation area. (~1180 tok)
- `guideContent.js` — Per-stage learning guide content and post-stage case review content (~1508 tok)
- `scenarios.js` — Scenario definitions for ScenarioInjector (~1070 tok)
- `seed.js` — Exports SEED_STATE, BUYER_SCRIPTS (~1274 tok)

## src/features/

- `CaseReview.jsx` — CaseReview (~878 tok)
- `CaseReview.module.css` — Styles: 22 rules (~685 tok)
- `InlineRiskBar.jsx` — ICON (~296 tok)
- `InlineRiskBar.module.css` — Styles: 11 rules, 1 animations (~327 tok)
- `LearningGuide.jsx` — LearningGuide — uses useState (~442 tok)
- `LearningGuide.module.css` — Styles: 12 rules (~646 tok)
- `RightPanel.jsx` — ScoreItem (~1924 tok)
- `RightPanel.module.css` — Styles: 28 rules (~1155 tok)
- `Stage1.jsx` — BATTERY_LIQUID — uses useState (~1647 tok)
- `Stage1.module.css` — Styles: 11 rules (~422 tok)
- `Stage2.jsx` — Stage2 — uses useState (~2704 tok)
- `Stage34.jsx` — PROSPECTING_TEMPLATE — uses useState (~4818 tok)
- `Stage34.module.css` — Styles: 22 rules (~685 tok)
- `Stage5.jsx` — DEFAULT_RATE — uses useState (~3916 tok)
- `Stage5.module.css` — Styles: 30 rules (~872 tok)
- `Stage6.jsx` — STRATEGY_TAGS — uses useState (~5942 tok)
- `Stage6.module.css` — Styles: 37 rules (~1323 tok)
- `Stage7.jsx` — HS_QUIZ_OPTIONS — uses useState (~3680 tok)
- `Stage7.module.css` — Styles: 18 rules (~472 tok)
- `Stage8.jsx` — ── QC items ────────────────────────────────────────────────────────────────── (~4997 tok)
- `Stage89.module.css` — Styles: 66 rules (~2086 tok)
- `Stage9.jsx` — COMPLAINT_EMAIL — uses useState (~3473 tok)
- `StageNav.jsx` — STAGES (~540 tok)
- `StageNav.module.css` — Styles: 14 rules (~745 tok)

## src/lib/

- `dimensionAnalysis.js` — Real-time multi-dimension text analysis functions (~2433 tok)
- `principles.js` — All PrincipleModal content — keyed by principle ID. (~2233 tok)
- `quoteCalc.js` — Exports calcQuote (~258 tok)
- `rules.js` — Normalize text for keyword matching: lowercase + collapse whitespace (~1796 tok)
- `scoreEngine.js` — Exports SCORE_ACTIONS, applyScore (~525 tok)
- `StateContext.jsx` — StateContext — uses useReducer, useEffect, useContext (~1412 tok)
- `storage.js` — Exports loadState, saveState, resetState (~198 tok)

## src/styles/

- `global.css` — Styles: 5 rules, 47 vars (~1982 tok)
