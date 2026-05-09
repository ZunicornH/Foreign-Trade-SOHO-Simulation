# 外贸 SOHO 模拟训练工作台 — v3 项目总览

> 一份给运营/产品视角的盘点：**有哪些功能**、**LLM 在哪里被调用**、**怎么省 token**。

---

## 1. 功能全景（9 阶段 + 横切系统）

### 阶段一览

| Stage | 名称 | 关键交互 | 教学锚点 |
|---|---|---|---|
| **1** | 选品定位 | 输入产品 / 市场 / USP → 生成专属训练案例 | USP 不能写"质量好/价格低"（PrincipleModal 拦截） |
| **2** | 供应商筛选 | 比较 2 家（便宜无证 vs 贵但合规），勾选 MOQ | 选 sup_a → 触发 cert 风险 scenario，三选项含 PRINCIPLE_CERT_SKIP |
| **3** | 客户开发信 | 写 subject + body，实时多维评分 | 含"cheapest" → PRINCIPLE_LOW_PRICE_ANCHOR；< 50 词 → PRINCIPLE_SHORT_EMAIL |
| **4** | 询盘回复 | 4 项 reading-gate 必勾，再回复（自由 / 结构化两种模式） | 缺贸易条款 → PRINCIPLE_NO_TRADE_TERM；缺规格 → PRINCIPLE_NO_SPEC |
| **5** | 报价测算 | 7 项成本 + 利润率，含利润压力测试表 | 利润率 < 15% / DDP 缺物流费 → PrincipleModal；含算术 quiz |
| **6** | 谈判模拟 | 策略标签 + LLM 实时回复 + 让步检测 | 三次无条件让价 → 拦截；BEC 诈骗 scenario；adaptive 收尾 |
| **7** | PI & 定金 | HS quiz（动态 4 选 1）+ PI 表单 + 3 项发送前 checklist | 漏检 BEC 提示；定金 < 25% 警告 |
| **8** | 生产 / 物流 | 4 子步：QC 决策 → B/L 核对 → 出运通知 → 尾款录入 | 漏检 HS 不符 → PRINCIPLE_BL_MISMATCH；尾款前放单 → PRINCIPLE_EARLY_TELEX |
| **9** | 售后 / 复购 | 3 子步：投诉应对 → 补偿方案 → 复购邮件 | 立刻退款 → PRINCIPLE_EAGER_REFUND；否认问题 → PRINCIPLE_DENY_COMPLAINT |

### 横切系统

| 系统 | 作用 |
|---|---|
| **ContextBriefing** | 每个 Stage 入口的"业务逻辑 / 常见错误 / 影响链"前置教学卡 |
| **PrincipleModal** | 犯关键错误时全屏拦截，4 段式（你做了什么 / 为什么危险 / 现实后果 / 正确做法），强制确认 |
| **DecisionQuiz** | Stage 1/2/5/6/7 关卡前的苏格拉底式选择题，正反双向解释 |
| **DimensionFeedback / LLMScorePanel** | 红/黄/绿三色 dim + hint，规则版瞬时显示，LLM 版按需触发深度评估 |
| **ScenarioInjector** | 中途突发情景：cert 风险、QC 公差、BEC 诈骗、尾款短付 |
| **CaseGenerationCard** | Stage 1 提交后展示 LLM 生成的全套案例画像（买家 hero + 认证 pills + HS / 关税 / 文化 / 坑点） |
| **StreamingMessage** | Stage 6 买家流式打字气泡（光标动画 + spring 入场） |
| **RightPanel** | 全程实时显示分数 / 风险旗 / 跨阶段后果 |
| **RoleNav (StageNav)** | 左侧 9 阶段进度导航，已完成 / 当前 / 锁定状态 |

### 数据持久化

- **localStorage key**：`soho-agent-v3-state`（schemaVersion=3，自动迁移老用户）
- 持久化范围：caseContext、stageMaterials、buyerProfile、negotiationMessages、scoreCard、principleAcks、riskFlags
- 刷新页面继续训练；点"重置训练"清空

---

## 2. LLM 调用全景

四个 Edge Function endpoint（部署后跑在 Vercel Edge Runtime；本地由 Vite 中间件挂载）：

### 2.1 `/api/generate-case` — 案例画像生成

**触发点**：Stage 1 用户点"生成训练案例 ✨"按钮

**输入**：`{ product, targetMarket, usp }` ≈ 200 input tokens

**输出**：caseContext JSON ≈ 1500 output tokens
- `requiredCerts` 2-4 项（mandatory + optional）
- `hsCodeRange`、`tariffNotes`、`culturalNotes`
- `buyerPersona` { name, company, city, country, role, background, style, language }
- `initialInquiryEmail`（6-10 句的真实询盘）
- `commonPitfalls` × 3 / `pricingBaseline` / `supplierProfileHint`

**单次成本**：~1700 tokens / 调用，**整个 session 1 次**

### 2.2 `/api/generate-stage-materials` — 全阶段训练材料生成

**触发点**：Stage 1 caseContext 返回后**后台**自动触发（不阻塞用户）

**输入**：`{ caseContext, product, targetMarket, usp }` ≈ 1200 input tokens

**输出**：stageMaterials JSON ≈ 3000 output tokens
- `suppliers` × 2（一便宜无证、一贵全证 — 保留 v2 教学张力）
- `hsCodeQuiz`：question + 4 选项（1 正 3 错，含 explanation）
- `qcChecklist` × 3（product-specific：玩具→掉漆/小零件/EN 71）
- `blFields` × 5（含 2 处故意错误：拼写 + HS 不符）
- `complaintScenario`（issueType / sampleData / factoryLeverageGood/Bad）
- `piDefaults` / `stage3Hints` / `stage4ReadingGate` / `shipmentNotifyRubric` / `repurchaseRubric`

**单次成本**：~4200 tokens / 调用，**整个 session 1 次**

### 2.3 `/api/buyer-chat` — 买家流式对话

**触发点**：Stage 6 谈判
- 进入 Stage 6 → 自动生成开场买家消息
- 用户每次提交回复 → 触发买家下一轮回复

**输入**：每次 ~600-2000 input tokens（system prompt + 累积对话历史）
**输出**：每次 ~300-400 output tokens（含尾部 [MOOD:..][TRUST:..][PATIENCE:..] tag）

**调用次数**：典型 4-6 轮 × 每轮 1 次 = **5-7 次 / session**
**单 session 累计**：~10k-15k tokens

### 2.4 `/api/score-text` — LLM 评分

**触发点**：用户在 5 个文本输入处点"✨ AI 评估"按钮
- Stage 1 USP 字段
- Stage 3 prospecting email
- Stage 4 inquiry reply
- Stage 8c shipment notification
- Stage 9c repurchase email

**输入**：~500 input tokens（rubric + context + 用户文本）
**输出**：~250 output tokens（JSON：4 个 dim × {score, hint}）

**调用次数**：用户主动触发，**典型 0-10 次 / session**（不点就不调）

---

## 3. 单次完整训练 token 用量估算

| 调用 | 次数 | 单次 input | 单次 output | 累计 |
|---|---|---|---|---|
| generate-case | 1 | 200 | 1500 | 1700 |
| generate-stage-materials | 1 | 1200 | 3000 | 4200 |
| buyer-chat | 5-7 | 1200 avg | 350 avg | 7700-10850 |
| score-text | 0-10 | 500 | 250 | 0-7500 |

**典型 session（用户每个评分都点 AI 评估，谈判 5 轮）**：
- 输入合计 ~ 11k tokens
- 输出合计 ~ 12k tokens
- DeepSeek 计费 ≈ ¥0.05 / session（约 7 美分）

**最重的 session**（10 次评分 + 7 轮谈判）≈ ¥0.08 / session

---

## 4. Token 节省策略（按收益排序）

### 4.1 已实现

| 策略 | 实现位置 | 节省 |
|---|---|---|
| **Memory 滑动窗口** | `buyerPersona.js` 取最近 8 条 fact | 谈判后期省 30-50% input |
| **Score 缓存** | `LLMScorePanel.jsx` 用 `lastScoredRef` 防重复打分 | 用户多次点同一文本 0 token |
| **localStorage 持久化** | `storage.js` | 刷新页面不重新生成案例 / 材料，省 5900 tokens |
| **Fallback 优先** | 所有 LLM 调用失败 → 关键词版 / 脚本版 | 网络问题不重试浪费 |
| **本地预过滤** | Stage 1 GENERIC_USP_WORDS、Stage 3 LOW_PRICE_PATTERNS、Stage 6 CREDIT_TERM_PATTERNS | 错误输入直接拦截，不发 LLM |
| **JSON Mode** | score-text / generate-case / generate-stage-materials 用 `response_format: json_object` | 输出更紧凑，无废话 |
| **score-text 触发改按钮** | 不在 keystroke 调用，仅显式点击 | 单字段调用 1 次而非 N 次 |

### 4.2 推荐补充实施

| 策略 | 收益估算 | 实现要点 |
|---|---|---|
| **DeepSeek prompt cache** | 谈判输入降 70% | DeepSeek 自动对相同前缀缓存（首 token 后命中），系统 prompt 保持稳定 + memory 列表只 append 不重排即可受益。**已天然支持，无需改代码** |
| **Negotiation history 折叠** | 6+ 轮时省 40% input | `streamBuyerChat` 调用前，把超过 4 轮的旧消息折叠成单条 summary fact 注入 memory |
| **降低 max_tokens** | 输出降 25% | buyer-chat 400→300、score-text 600→400、generate-stage-materials 3500→2800 |
| **caseContext 服务端缓存** | 重复案例 100% 省 | Edge Function 用 `(product+market+usp)` 哈希作 key 缓存到 Vercel KV / Edge Config，相同输入直接返回 |
| **批量评分** | 多文本评分省 50% input | 改 score-text 接受 `texts: [{key, text}]` 数组，一次评 N 个 dim |
| **可关闭 AI 评估** | 用户主动节流 | 设置面板加"快速模式 / 深度模式"开关，快速模式只用关键词分析 |
| **Memory 去重** | 谈判中后期降 5-15% | 写入前检查最近 3 条 fact 是否重复，重复就合并 |
| **首 token caching 验证** | 谈判降 60% | 在 prompt 里把 system prompt + 案例 context + memory 放在最前面（不变量），用户最新输入放最后（变量）— 当前已是这个顺序，可以确认日志 |
| **多模型路由** | 简单评分降 80% | 简单 dim 评分用 `deepseek-chat`，复杂买家对白用同一个但 temperature 较高；如未来加 `deepseek-reasoner`，仅在 PRINCIPLE 触发后用它生成解释 |
| **Token 用量面板** | 让用户感知 | 在 RightPanel 加"本次会话已用 X tokens / ¥Y"小卡，用户对成本敏感时自然会少点 AI 评估 |

### 4.3 极端省 token 模式（演示 / 教学场所）

如果做线下教室批量演示，可以考虑：

1. **预热 caseContext 缓存**：演示前手动跑 5 个常见案例（保温杯/玩具/电子/食品/纺织 × 主流市场），缓存到 KV，线下一键命中
2. **Stage 6 完全脚本化**：演示模式下 buyer-chat 直接走 BUYER_SCRIPTS fallback，不调 LLM
3. **score-text 全关**：演示时只用关键词版评分
4. **共享 caseContext**：让全班用同一个案例，1 次 generate-case 调用服务整堂课

### 4.4 上限保护（避免成本失控）

| 风险 | 防御 |
|---|---|
| 单用户疯狂点 AI 评估 | 客户端加每分钟 5 次 rate limit；服务端 Edge Function 加 IP 维度日上限 |
| 谈判被无限拖长 | 当前已加 MAX_ROUNDS=6 上限 |
| 长邮件被反复评分 | `LLMScorePanel` 已用 lastScoredRef 防重 |
| Bot 滥用公网部署 | 部署后启用 Vercel BotID 或 Cloudflare 防护 |
| Key 意外泄露 | `.env.local` gitignored；bundle build 后扫 `sk-` 必须 0 命中（已 README 标注） |

---

## 5. 技术债 / 已知瑕疵

| 项 | 影响 | 处理 |
|---|---|---|
| `complaintScenario.factoryLeverageGood/Bad` LLM 偶尔语义颠倒 | Stage 9 工厂 leverage 文案有时不准 | 加强 generate-stage-materials 的 prompt 约束 + 加输出后的语义校验 |
| Edge Function 冷启动 +200ms | 首次访问稍慢 | Vercel Fluid Compute 已自动复用实例，无需额外处理 |
| Persona 偶尔漂移（名字偶变） | 极少发生 | system prompt 已锁定姓名 + 输出后正则校验（待实现） |
| MOOD tag 漏写时 fallback parser 偶尔错位 | parser 已写 lenient 模式，但偶尔抓错索引 | 在 buyerPersona.js 加单元测试覆盖 4 种降级场景 |

---

## 6. 与 v2 的对比

| 维度 | v2 | v3 |
|---|---|---|
| 案例 | 1 个硬编码（保温杯/德国/Michael） | 任意商品 / 市场，LLM 生成 |
| 买家对话 | 5 轮固定脚本 | LLM 实时流式 + 跨阶段记忆 + adaptive 收尾 |
| 评分 | 关键词正则匹配 | 关键词版（即时） + LLM 版（按需深度） |
| 教学反馈 | 通用 PrincipleModal | 通用 + 案例化（cert 名 / 工厂名 / HS 编码全动态） |
| Token 成本 / session | 0 | ~¥0.05 |
| 部署门槛 | 静态站，任何 CDN | Vercel（Edge Function） |
| 离线能力 | 100% 可用 | 100% 可用（fallback 路径） |

---

## 7. 后续优化路线（v4 候选）

按 ROI 排序：

1. **服务端 caseContext 缓存（Vercel KV）** — 演示场景命中率 80%，立省 ¥0.04 / session
2. **Token 用量浮窗** — 让用户主动节制，体感 ROI 高
3. **谈判 history 折叠 + memory 去重** — 中后期 token 砍半
4. **多人/班级模式** — 教师在控制台看每个学员的 buyerProfile / 错误轨迹
5. **PDF 学习报告导出** — session 结束后导出"做对的 X / 踩坑的 Y"
6. **手机响应式** — 当前桌面优先，移动端适配未做
7. **i18n** — 中英文 UI 切换 + 案例自动跟随用户语言生成
8. **教练点评模式** — 用 reasoner 模型对整段 session 出具长评（贵但有价值）

---

## 附：关键文件快速索引

```
api/
├── buyer-chat.js              ← 流式买家对话
├── generate-case.js           ← 案例画像
├── generate-stage-materials.js← 各阶段材料
└── score-text.js              ← LLM 评分

src/lib/
├── llm.js                     ← 4 个 endpoint 客户端
├── caseContext.js             ← caseContext schema + FALLBACK
├── stageMaterials.js          ← stageMaterials schema + FALLBACK
├── buyerPersona.js            ← system prompt + tag parser
├── scoringRubrics.js          ← 5 套评分 rubric
└── StateContext.jsx           ← reducer + state

src/components/
├── CaseGenerationCard.jsx     ← Stage 1 案例展示
├── StreamingMessage.jsx       ← 流式买家气泡
├── LLMScorePanel.jsx          ← LLM 评估包装器
├── DimensionFeedback.jsx      ← 红/黄/绿 dim 显示
├── PrincipleModal.jsx         ← 错误拦截全屏弹窗
├── ContextBriefing.jsx        ← 阶段前置教学卡
└── DecisionQuiz.jsx           ← 选择题组件

src/features/Stage1.jsx — Stage9.jsx
```
