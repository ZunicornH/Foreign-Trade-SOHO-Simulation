# 外贸 SOHO 模拟训练工作台 — v3

LLM 驱动的外贸全流程仿真训练。用户输入「商品 + 目标市场 + 卖点」，系统自动生成专属案例（认证体系、HS 编码、买家人设、供应商画像、QC 检查项、投诉场景…），全程 9 个阶段的内容都贴合该案例，买家由 LLM 实时驱动并跨阶段记忆用户行为。

## 技术栈

- **前端**：Vite + React 18，CSS Modules（编辑级双字体：Fraunces + Manrope）
- **后端**：Vercel Edge Functions（4 个 endpoint），DeepSeek API（OpenAI 兼容）
- **本地开发**：Vite 中间件直接挂载 `api/*.js`，无需 vercel CLI

## 本地启动

```bash
# 1. 安装依赖
npm install

# 2. 配置 DeepSeek key
cp .env.example .env.local
# 编辑 .env.local，填入你的 DEEPSEEK_API_KEY

# 3. 启动
npm run dev
# → http://localhost:5173
```

## API Endpoints（自动挂载）

| 路径 | 用途 | 输入 | 输出 |
|---|---|---|---|
| `/api/generate-case` | 生成案例画像 | `{product, targetMarket, usp}` | caseContext JSON |
| `/api/generate-stage-materials` | 生成 Stage 2-9 训练材料 | `{caseContext, product, targetMarket, usp}` | suppliers / hsQuiz / qcChecklist / blFields / complaintScenario / piDefaults / etc. |
| `/api/buyer-chat` | 买家流式对话（Stage 6） | `{systemPrompt, messages, maxTokens, temperature}` | SSE stream |
| `/api/score-text` | LLM 评分（Stage 1/3/4/8/9） | `{rubric, text}` | `{dim_key: {score, hint}}` |

所有 endpoint 都在 Edge Runtime 上跑（30s+ 超时，自动重试 5xx 一次）。Key 只存在于 `.env.local` / Vercel env，不进前端 bundle。

## 项目架构

```
src/
├── lib/
│   ├── llm.js              — 4 个 endpoint 的客户端封装
│   ├── caseContext.js      — caseContext schema + FALLBACK_CASE
│   ├── stageMaterials.js   — stageMaterials schema + FALLBACK_MATERIALS
│   ├── buyerPersona.js     — Stage 6 LLM system prompt builder + tag parser
│   ├── scoringRubrics.js   — 5 个评分 rubric 定义
│   └── StateContext.jsx    — Context + useReducer，含 v3 reducer cases
├── components/
│   ├── CaseGenerationCard.jsx   — Stage 1 案例展示卡
│   ├── StreamingMessage.jsx     — 买家流式对话气泡
│   ├── LLMScorePanel.jsx        — LLM 评估包装器（带 fallback）
│   └── DimensionFeedback.jsx    — 红/黄/绿 dim 显示
├── features/
│   ├── Stage1.jsx — Stage9.jsx  — 9 阶段训练流程
│   └── ...
└── data/
    ├── seed.js                  — 默认 fallback 数据 + BUYER_SCRIPTS
    └── scenarios.js             — buildCertRiskScenario / buildQcRejectScenario
```

## 部署到 Vercel

```bash
# 1. 安装 Vercel CLI（首次）
npm i -g vercel

# 2. 部署
vercel deploy

# 3. 在 Vercel 控制台 → Settings → Environment Variables 加：
#    DEEPSEEK_API_KEY=sk-...
#    DEEPSEEK_BASE_URL=https://api.deepseek.com  (可选，默认值)
#    DEEPSEEK_MODEL=deepseek-chat                (可选，默认值)

# 4. 生产部署
vercel deploy --prod
```

部署后 `api/*.js` 会被识别为 Edge Functions 自动启用，无需额外配置。

## 关键设计

- **Fallback 优先**：所有 LLM 调用失败时回退到硬编码的"保温杯/德国/Michael"案例，训练流程绝不阻塞。
- **跨阶段 memory**：Stage 3/5/8/9 的关键决策都写入 `state.buyerProfile.memory`，Stage 6 谈判时 LLM 会"记得"用户开发信写了什么、定价多少、QC 时是否接受公差。
- **本地 Edge 模拟**：`vite.config.js` 自定义中间件挂载 `api/*.js`，本地 `npm run dev` 即可同时跑前端 + Edge handlers，Windows 友好。

## License

私有 / 训练用途。DeepSeek API 调用产生的费用归 key 所有人。
