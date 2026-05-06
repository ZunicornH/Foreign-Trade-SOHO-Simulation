// ContextBriefing content — shown before each stage's operation area.
// Each briefing has: logic (why this step matters), topMistake (pre-warn common error), and impact (downstream effects).

export const BRIEFINGS = {
  1: {
    stage: '阶段 1',
    title: '选品定位',
    logic: '外贸 SOHO 的溢价能力在第一步就被决定了。你对产品的定位（卖点是否具体、市场是否精准）决定了后续报价时的议价底气，以及买家是否值得花时间回复你的邮件。',
    topMistake: '最常见的错误：用"质量好""价格有竞争力"描述卖点。这和所有竞争对手一模一样，买家的下意识反应是：那就比价格吧。',
    impact: [
      { from: '卖点是否具体', to: '阶段3 开发信回复率', arrow: true },
      { from: '认证是否到位', to: '阶段5 报价溢价空间', arrow: true },
      { from: '目标市场精准度', to: '阶段4 询盘质量', arrow: true },
    ],
  },
  2: {
    stage: '阶段 2',
    title: '供应商筛选',
    logic: '供应商选择不只是比价格。认证支持能力、QC 能力、交期稳定性，任何一个短板都会在后续阶段变成真实的业务危机。双供应商体系（主力 + 备份）是外贸 SOHO 最重要的风控措施。',
    topMistake: '最常见的错误：只选最便宜的工厂，忽略认证支持。LFGB 认证缺失会导致德国市场全批次被扣押，损失远超节省的价格差。',
    impact: [
      { from: '认证支持能力', to: '阶段3 开发信可信度', arrow: true },
      { from: '工厂 QC 能力', to: '阶段8 验货风险', arrow: true },
      { from: '备用供应商', to: '阶段8 交期稳定性', arrow: true },
    ],
  },
  '34_prospecting': {
    stage: '阶段 3',
    title: '客户开发信',
    logic: '买家每天收到 50+ 封开发信，回复决策在 3 秒内完成。真正有效的开发信不是展示你有多强，而是让买家在开头两行就看到"这和我的生意有关"。个性化 + 具体价值 + 明确行动号召，三个要素缺一回复率就会大幅下降。',
    topMistake: '最常见的错误：用"We are a professional manufacturer with 10 years of experience"开头——买家见过一万次，直接无视。',
    impact: [
      { from: '开发信质量', to: '阶段4 询盘质量（买家是否认真）', arrow: true },
      { from: '价格定位话术', to: '阶段6 谈判起点', arrow: true },
    ],
  },
  '34_inquiry_reply': {
    stage: '阶段 4',
    title: '询盘回复',
    logic: '买家发出询盘意味着他有真实采购需求。24 小时内的专业回复，成交概率是 48 小时后的 3 倍。回复的质量（规格是否完整、贸易条款是否清晰、认证是否提及）直接决定买家是否愿意进入价格谈判。',
    topMistake: '最常见的错误：只报价格，不说贸易条款——买家无法做内部采购申请，也无法比较不同报价的实际成本。',
    impact: [
      { from: '规格完整度', to: '阶段5 报价准确性', arrow: true },
      { from: '贸易条款明确', to: '阶段7 PI 无争议', arrow: true },
      { from: '回复速度', to: '买家合作意愿', arrow: true },
    ],
  },
  5: {
    stage: '阶段 5',
    title: '报价测算',
    logic: '外贸新手最常见的亏损来源：用"出厂价 × 系数"报价，遗漏认证摊销、汇率波动、退税差异。正确的报价逻辑是：建立完整成本模型 → 设定目标利润率 → 倒推售价。利润率不只是收益，它是你在下一阶段谈判中可以让步的"弹药"，也是应对汇率、质量索赔等风险的缓冲垫。',
    topMistake: '最常见的错误：利润率 < 15%。买家谈判时通常要求 5–10% 折扣，汇率波动 3% 很常见——两者叠加，利润率 15% 的订单直接亏损。',
    impact: [
      { from: '报价利润率', to: '阶段6 谈判底线和让步空间', arrow: true },
      { from: '贸易条款', to: '阶段7 PI 条款一致性', arrow: true },
      { from: '成本模型准确性', to: '实际订单盈利能力', arrow: true },
    ],
  },
  6: {
    stage: '阶段 6',
    title: '谈判模拟',
    logic: '买家砍价是职业习惯，不代表你的价格真的贵。第一次报价就被接受，往往意味着你报低了。谈判的核心框架是"价值锚定 + 条件交换"：每次让步必须有所得（增量、更快付款、下单承诺），无条件让价只会被持续压价。',
    topMistake: '最常见的错误：连续无条件让价。三次无条件让步后，买家会认为你的价格始终有更多空间，在这笔订单和所有后续订单中持续压价。',
    impact: [
      { from: '谈判最终价格', to: '阶段7 PI 金额', arrow: true },
      { from: '付款条件谈判', to: '阶段8 收款风险', arrow: true },
      { from: '让价幅度', to: '实际订单利润率', arrow: true },
    ],
  },
  7: {
    stage: '阶段 7',
    title: 'PI & 定金确认',
    logic: 'PI（形式发票）是把口头协议变成书面法律文件的关键步骤。HS 编码决定进口税率和合规性；银行账户是 BEC 诈骗的核心攻击目标；定金比例决定你在生产阶段的资金风险。三个字段，任何一个错了都可能造成严重损失。',
    topMistake: '最常见的错误：BEC 诈骗——黑客在 PI 发送节点入侵买家邮箱，要求更换收款账户。2023 年全球 BEC 损失 29 亿美元，外贸是高发行业。',
    impact: [
      { from: 'HS 编码准确性', to: '阶段8 清关顺利与否', arrow: true },
      { from: '定金比例', to: '阶段8 工厂排产时间', arrow: true },
      { from: '付款条款', to: '阶段8 尾款催收依据', arrow: true },
    ],
  },
  8: {
    stage: '阶段 8',
    title: '生产 / 物流',
    logic: '定金到账不等于订单完成。从验货到收到尾款，每个节点都有真实的财务风险：验货缺陷影响买家验收；提单错误导致清关延误；提前放单意味着放弃货物控制权。这一阶段的核心原则是：每个节点都要有书面证据，尾款到账才放单。',
    topMistake: '最常见的错误：尾款未到账就发出 Telex Release（提单放行）。一旦放单，货物控制权永久转移，若买家拒付尾款几乎无法追索。',
    impact: [
      { from: 'QC 验货质量', to: '阶段9 投诉风险', arrow: true },
      { from: '提单准确性', to: '清关时间和费用', arrow: true },
      { from: '尾款催收策略', to: '实际回款时间', arrow: true },
    ],
  },
  9: {
    stage: '阶段 9',
    title: '售后复购',
    logic: '获取一个新客户的成本是维护现有客户的 5–7 倍。Michael 已经验证了你的产品（完成首单），信任成本已经付出。正确处理投诉、主动跟进复购，是外贸 SOHO 从"做一单"到"做长期"的关键转变。',
    topMistake: '最常见的错误：投诉时未取证就退款，或忽视复购跟进。前者让你损失索赔能力，后者让你永远只能不断开发新客户。',
    impact: [
      { from: '投诉处理质量', to: '客户长期信任度', arrow: true },
      { from: '复购邮件时机', to: '年度订单量', arrow: true },
      { from: '客户维护', to: '口碑和转介绍', arrow: true },
    ],
  },
};
