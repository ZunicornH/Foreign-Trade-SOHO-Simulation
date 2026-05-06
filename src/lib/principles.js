// All PrincipleModal content — keyed by principle ID.
// Components dispatch SHOW_PRINCIPLE_MODAL with one of these objects.

export const PRINCIPLES = {
  PRINCIPLE_USP_GENERIC: {
    id: 'PRINCIPLE_USP_GENERIC',
    title: '泛泛卖点 = 主动放弃定价权',
    whatYouDid: '你填写的差异化卖点过于笼统（如"质量好""价格低"），与所有竞争对手的说法完全相同。',
    why: '差异化卖点的本质是"定价权"。当买家无法区分你和竞争对手时，他唯一能用的标准就是价格。具体的、可验证的卖点（LFGB 认证 + 304 不锈钢 + 12 色哑光定制）让买家无法做苹果对苹果的比价——这就是溢价的来源。认证、材质、功能数据比任何形容词都有力。',
    realLife: '一位深圳 SOHO 卖家用"质量好"定位三年，被买家长期压价；换成"LFGB 认证 + SGS 检测报告"后，同款产品提价 20% 仍成交。',
    correctApproach: '把卖点改为可验证的具体项：认证编号、检测数据、定制能力（颜色数量、LOGO 工艺）、交期承诺。每一条都要能让买家拿去向他的客户证明。',
  },

  PRINCIPLE_CERT_SKIP: {
    id: 'PRINCIPLE_CERT_SKIP',
    title: '跳过 LFGB 认证 = 让买家承担法律炸弹',
    whatYouDid: '你选择跳过 LFGB 认证，直接向德国市场发货。',
    why: '德国《食品和日用品法》（LFGB）规定，在德国销售的接触食品器具必须通过 LFGB 测试。这不是加分项，而是法律门槛。未认证产品被德国海关检出后，全批次可被扣押销毁，买家面临最高 €50,000 的行政罚款。这个法律责任最终会被转嫁给你（供应商）。',
    realLife: '2022 年有供应商未附认证，德国买家在进口时被海关全批次退回，运费损失 €3,200，买家提出索赔，SOHO 卖家净亏约 ¥45,000。',
    correctApproach: '认证费用（¥8,000–15,000）必须纳入报价，按订单量摊销到单价里。若工厂不支持，联系第三方检测机构（SGS、BV）直接委托检测，周期约 3–4 周。',
  },

  PRINCIPLE_LOW_PRICE_ANCHOR: {
    id: 'PRINCIPLE_LOW_PRICE_ANCHOR',
    title: '低价定位：你在开局就输了谈判',
    whatYouDid: '你在开发信或回复中使用了"cheapest""best price""lowest price"等低价话术。',
    why: '价格锚定（Price Anchoring）是谈判心理学的核心机制。你说的第一个价格定义了后续谈判的参照系。"Cheapest"暗示你还有压缩空间，买家会把它作为起点继续砍价。而"competitive pricing backed by LFGB certification"传递的是"价格合理且有支撑"，把谈判焦点从价格转向价值。',
    realLife: '开发信里写了"best price"的供应商，平均谈判轮次比不写的多 2 轮，最终成交价低 8–12%。',
    correctApproach: '删除所有低价形容词。用认证、交期、定制能力作为竞争力支撑。如需说价格，用"competitive"配合具体价值背书。',
  },

  PRINCIPLE_SHORT_EMAIL: {
    id: 'PRINCIPLE_SHORT_EMAIL',
    title: '邮件太短 = 买家没有回复的理由',
    whatYouDid: '你提交的开发信不足 50 词，缺少让买家回复的充分信息。',
    why: '买家决定是否回复在 3 秒内完成，但决定"怎么回"需要信息支撑。80 词以下的邮件通常缺少三个要素中的至少一个：① 可验证的凭证（认证/样品/案例）② 具体的产品价值 ③ 明确的下一步行动（CTA）。没有这三个，买家没有充分理由回复——不是不想，是没有足够信息去内部推进。',
    realLife: '对比测试：同一产品，80 词邮件回复率约 6%，40 词邮件回复率约 1.5%。',
    correctApproach: '至少写 80 词，包含：①一句个性化开场（提及买家产品或市场）②产品核心卖点（含认证）③一个具体的 CTA（约定通话时间或邀请索样）。',
  },

  PRINCIPLE_NO_TRADE_TERM: {
    id: 'PRINCIPLE_NO_TRADE_TERM',
    title: '没有贸易条款 = 风险归属不清',
    whatYouDid: '你的询盘回复中没有说明贸易条款（FOB/CIF/DDP）。',
    why: '贸易条款决定风险转移点和费用归属。FOB = 货离港口后买家负责；CIF = 你负责到目的港；DDP = 你负责到买家仓库门口（含关税）。买家问贸易条款，本质是在问"出了问题，谁负责，谁出钱"。没有贸易条款的报价不是完整报价，买家无法做内部采购申请，也无法比价。',
    realLife: '缺少贸易条款的回复往往导致买家再发一封追问邮件，额外耗时 24–48 小时，丧失成交时机。',
    correctApproach: '回复中明确写出：FOB [港口名称] USD X.XX/pc，或 CIF Hamburg USD X.XX/pc。每种贸易条款对应不同的成本结构，阶段 5 会详细计算。',
  },

  PRINCIPLE_NO_SPEC: {
    id: 'PRINCIPLE_NO_SPEC',
    title: '没有规格 = 买家无法内部推进',
    whatYouDid: '你的询盘回复中没有提供产品规格（尺寸、重量、材质等）。',
    why: '买家回复你的邮件之后，第一件事是把信息转发给他的采购经理或仓库。如果规格不完整，他根本无法完成内部流程——不是不愿意继续谈，是没有足够信息去推进。规格是买家进行内部审批的工具，不是可选的附件。',
    realLife: '缺少规格的报价平均多一轮来回沟通，而每一轮额外沟通都会让买家的兴趣降低约 20%。',
    correctApproach: '标准规格格式：容量（ml）/ 尺寸（直径×高度mm）/ 重量（g）/ 材质（内胆/外壳/盖子）/ 认证。这六项缺一不可。',
  },

  PRINCIPLE_ZERO_MARGIN: {
    id: 'PRINCIPLE_ZERO_MARGIN',
    title: '零利润 = 你在免费承担所有风险',
    whatYouDid: '你将目标利润率设置为 0% 或接近 0%。',
    why: '外贸 SOHO 的利润不只是收益，它是你的风险缓冲垫。以下任何一个事件都会从利润里扣：汇率波动 ±3%（很常见）、买家谈判压价 5–10%、一次部分退货或质量索赔、认证更新费用、运费临时上涨。利润率 0% 意味着上述任何一件事都会让这笔订单变成净亏损。',
    realLife: '2023 年人民币升值约 4%，零利润订单的 SOHO 卖家实际亏损约 4%。',
    correctApproach: '最低设置 20% 利润率作为安全底线，25%+ 才有足够的谈判让步空间。利润率是你和买家谈判的"子弹"，不能打光。',
  },

  PRINCIPLE_LOW_MARGIN: {
    id: 'PRINCIPLE_LOW_MARGIN',
    title: '利润率 < 15%：你没有任何谈判空间',
    whatYouDid: '你设置的利润率低于 15%，低于外贸 SOHO 的生存警戒线。',
    why: '15% 是外贸 SOHO 的生存线，原因是：① 汇率波动 3% = 利润被侵蚀 20% ② 买家通常要求 5–10% 折扣空间 ③ 偶发质量问题补货成本 ④ 认证续期、运费上涨均需利润吸收。低于 15%，任意两个事件叠加就会亏损。更重要的是：下一阶段谈判中，你将面对买家的砍价，15% 的利润根本无法支撑任何让步。',
    realLife: '利润率 12% 的订单，买家要求 8% 折扣后，实际利润仅剩 4.4%，加上汇率波动后亏损。',
    correctApproach: '重新核算成本，目标利润率 25%+。认证摊销、汇率缓冲（建议额外预留 2–3%）都要计入成本结构。',
  },

  PRINCIPLE_DDP_BLIND: {
    id: 'PRINCIPLE_DDP_BLIND',
    title: 'DDP 不填物流费 = 在未知成本下签合同',
    whatYouDid: '你选择了 DDP 贸易条款，但没有填写国际物流费和进口关税。',
    why: 'DDP（Delivered Duty Paid）意味着你负责将货物送到买家仓库门口，包含国际运费、进口清关费、德国进口关税（保温杯约 3.7%）、最后一公里配送。这些费用合计可达产品价值的 8–15%。如果不计入报价，这些成本全部从你的利润里扣，很可能导致实际亏损。',
    realLife: '一位新手选择 DDP 但未计运费，发货后发现物流费折合每件 USD 1.8，实际利润从 25% 跌至 11%。',
    correctApproach: '选择 DDP 前，先向货代询价（目的港 + 清关费 + 关税），将总费用除以件数，填入"国际物流费"字段，再计算报价。',
  },

  PRINCIPLE_EAGER_CONCESSION: {
    id: 'PRINCIPLE_EAGER_CONCESSION',
    title: '首轮立刻让价：你向买家宣告了还有更多空间',
    whatYouDid: '买家第一次要求折扣，你立刻表示同意。',
    why: '谈判是信息博弈。你的第一个反应设定了整场谈判的基调。立刻让价传递两个信号：① 你的报价本来就虚高，还有压缩空间；② 你急于成交，买家处于主动地位。之后每一轮，他都会从这个让步点继续往下压，因为他已经知道你会让。正确的首轮策略是：询问他的顾虑，或坚守价格并解释价值——这才是锚定谈判区间的正确方式。',
    realLife: '研究显示，第一轮立刻让步的卖家，最终成交价平均比坚守首轮的卖家低 12–15%。',
    correctApproach: '首轮策略：询问买家顾虑（"What specific aspect of the pricing concerns you?"）或解释价值来源（LFGB 认证成本 + 304 不锈钢材质）。如必须让步，以增量或付款条件作为交换条件。',
  },

  PRINCIPLE_TRIPLE_CONCESSION: {
    id: 'PRINCIPLE_TRIPLE_CONCESSION',
    title: '三次无条件让价：你失去了整场谈判',
    whatYouDid: '你已经进行了三次无条件让价，没有要求任何交换条件。',
    why: '谈判心理学中，连续无条件让步会形成"让步惯例"——买家预期你每次都会让，因此会持续要求更多。更重要的是：每次让价都永久改变了买家对你价格底线的认知。他会在下一笔订单中以当前价格为起点再次砍价。"无条件让价"本质上是在训练买家持续压价。',
    realLife: '三次无条件让价后，74% 的买家在下一笔订单中仍然要求降价，因为他们认为这是常规流程。',
    correctApproach: '立即停止无条件让价。如需让步，必须附带条件："If you can increase the order to 1,000 pcs" 或 "if you confirm T/T 50% deposit"。条件交换才能保住谈判地位。',
  },

  PRINCIPLE_BEC: {
    id: 'PRINCIPLE_BEC',
    title: 'BEC 诈骗：国际贸易最大的财务威胁',
    whatYouDid: '你准备接受或已接受通过邮件要求更换收款账户的指令。',
    why: '商业邮件诈骗（Business Email Compromise, BEC）是国际贸易中损失最大的欺诈类型。2023 年全球 BEC 损失超过 29 亿美元（FBI 数据）。攻击者入侵买家或供应商的邮箱，等到交易关键节点（PI 发出、临近付款）才发出"换账户"请求。一旦货款打入诈骗账户，几乎无法追回。邮件本身在你看来完全合法，因为它确实来自买家的邮箱（被攻陷的那个）。',
    realLife: '某 SOHO 卖家收到"Michael"要求更换账户的邮件，货款 €8,500 打入诈骗账户，事后确认 Michael 的邮箱被黑客入侵，钱款无法追回。',
    correctApproach: '唯一有效防御：带外验证（Out-of-band Verification）——用你之前已知的电话号码（不是邮件里提到的）直接致电 Michael 确认。永远不要只凭邮件更改付款账户。',
  },

  PRINCIPLE_BL_MISMATCH: {
    id: 'PRINCIPLE_BL_MISMATCH',
    title: '提单信息不一致：清关失败的直接原因',
    whatYouDid: '你放过了提单中的错误信息（HS 编码或收货人信息与实际不符）。',
    why: '德国海关核查提单（B/L）、商业发票和装箱单的一致性。任何字段不一致——包括收货人拼写错误、HS 编码与申报不符——都会触发扣押或重新申报程序。重新申报至少延误 5–10 个工作日，产生额外费用，买家可能因延误提出索赔。HS 编码错误还可能导致被追缴差价关税。',
    realLife: '收货人名称中多一个字母（"Kitchenwere" vs "Kitchenware"），导致德国汉堡港扣押 3 天，额外产生 €420 的存仓费和代理费。',
    correctApproach: '发货前三检：① 提单收货人与买家公司名称完全一致 ② HS 编码与报关单、商业发票一致 ③ 货物描述与 PI 一致。任何不一致必须在放货前要求船公司更正。',
  },

  PRINCIPLE_EARLY_TELEX: {
    id: 'PRINCIPLE_EARLY_TELEX',
    title: '尾款未到先放单：你放弃了货物的唯一担保',
    whatYouDid: '你在尾款未到账前准备发出提单放行指令（Telex Release）。',
    why: '提单（Bill of Lading）是货物所有权的法律凭证。在尾款到账之前，提单是你对买家唯一的制衡工具：只要你不放单，买家就无法提货。一旦发出 Telex Release，货物控制权永久转移给买家。此后如果买家拒付尾款，你既无法追回货物（已被提走），法律追索也极为困难（跨国诉讼成本高、周期长）。',
    realLife: '某供应商因买家催得急，在尾款确认前一天放单，之后买家以"质量问题"为由拒付尾款 USD 3,500，供应商损失全部尾款。',
    correctApproach: '铁律：尾款到账后再放单，不谈例外。在 PI 中明确写明"Original B/L to be released upon receipt of balance payment"。收到银行入账通知（MT103 或截图）后才发出 Telex Release 指令。',
  },

  PRINCIPLE_EAGER_REFUND: {
    id: 'PRINCIPLE_EAGER_REFUND',
    title: '未取证就退款：你在训练买家持续投诉',
    whatYouDid: '买家投诉后，你在没有要求证据的情况下立刻提出全额退款。',
    why: '未经核实就同意全额退款有三个问题：① 你无法向工厂索赔（没有照片/视频证据，工厂可以否认责任）② 你无法判断问题的实际范围（30 件？全部？）③ 这向买家传递了"投诉就能得到退款"的信号——下次会有更多投诉，甚至虚假投诉。正确流程是：先取证，再判责，后补偿。',
    realLife: '一位 SOHO 卖家未取证直接退款 USD 600，事后工厂否认质量问题，且买家此后每次订单都有"小投诉"要求折扣。',
    correctApproach: '第一步永远是："Thank you for the feedback. Could you please send photos/videos of the issue?" 收到证据后，评估责任方（工厂/运输/买家使用问题），再提出针对性的补偿方案。',
  },

  PRINCIPLE_DENY_COMPLAINT: {
    id: 'PRINCIPLE_DENY_COMPLAINT',
    title: '否认质量投诉：你在消灭复购的机会',
    whatYouDid: '你否认了买家反映的质量问题，表示产品在正常范围内。',
    why: '客户关系的研究显示：处理得当的投诉，反而能提高客户忠诚度（比从未投诉的客户高 25%）。原因是：投诉是买家在给你一次证明自己的机会。否认投诉会让买家感到不被尊重，直接斩断复购可能。外贸 SOHO 的业务价值很大程度上来自复购——失去一个客户的长期价值远大于一次补偿的成本。',
    realLife: '处理好的色差投诉（补发 30 件）最终促成该买家年度复购 3 次，累计金额是首单的 6 倍。',
    correctApproach: '即使问题轻微，也要以同理心回应："I understand this is frustrating. Let me look into this immediately." 先承认影响，再核实事实，再提出解决方案。',
  },
};
