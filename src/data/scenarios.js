// Scenario definitions for ScenarioInjector

export const SCENARIOS = {
  SCENARIO_CERT_RISK: {
    id: 'SCENARIO_CERT_RISK',
    title: '突发情况：供应商不支持 LFGB 认证',
    body: '义乌恒温制品厂回复：他们之前从未出口德国市场，LFGB 认证需要你自行委托第三方检测机构（如 SGS/BV），费用约 ¥8,000–12,000，检测周期 3–4 周，且需要工厂配合提供样品和材质报告。',
    question: '你会怎么处理？',
    options: [
      {
        label: '换深圳供应商（优杯科技）——他们支持 LFGB，虽然贵 ¥4/个',
        outcome: 'GOOD',
        explanation: '正确选择。认证支持是隐性成本，¥4/个的价差（500件 = ¥2,000）远小于自行认证的费用和时间成本。而且优杯科技的 in-house QC 在阶段8验货时也更有保障。',
      },
      {
        label: '继续用义乌工厂，自己出认证费用并摊入报价（每件加 ¥16–24）',
        outcome: 'OK',
        explanation: '可以接受，但要注意：3–4 周认证周期会延长交期，你需要提前告知买家。认证费用按 500 件摊算约 ¥16–24/件，必须加进报价，否则认证费从利润里扣。',
      },
      {
        label: '跳过 LFGB 认证，先发货试试看，德国海关不一定会查',
        outcome: 'BAD',
        principleId: 'PRINCIPLE_CERT_SKIP',
        explanation: '高风险操作，会触发原理说明。',
      },
    ],
  },

  SCENARIO_QC_REJECT_MINOR: {
    id: 'SCENARIO_QC_REJECT_MINOR',
    title: '验货争议：Logo 偏移，工厂说在公差内',
    body: '你要求工厂重做，工厂回复：Logo 偏移 3mm 属于行业正常公差（±5mm），重做需要额外 7 天和 ¥2,000 费用，而且此时已比承诺给买家的交期晚 3 天了。',
    question: '你会怎么处理？',
    options: [
      {
        label: '接受当前批次（偏移在公差内），主动告知买家并提供验货照片',
        outcome: 'GOOD',
        explanation: '正确处理。公差 3mm 在行业标准内，主动沟通比被动等买家发现要好得多。提供验货照片也是建立信任的手段。买家通常理解质量波动，但不接受信息隐瞒。',
      },
      {
        label: '要求重做，同时向买家说明延期原因，争取宽限',
        outcome: 'OK',
        explanation: '可以接受，但要权衡：额外 7 天 + ¥2,000 是否值得。如果买家有硬截止（如圣诞前上架），延期的代价可能远大于 Logo 偏移的影响。需要先和买家沟通确认他们的容忍度。',
      },
      {
        label: '不告知买家，直接发货，希望买家不注意到',
        outcome: 'BAD',
        explanation: '最差选择。买家发现后的信任损失远大于一开始主动沟通的代价。阶段9的投诉场景中，这个选择会被追溯——工厂有权否认责任，而你没有书面记录。',
      },
    ],
  },

  SCENARIO_BEC_ATTACK: {
    id: 'SCENARIO_BEC_ATTACK',
    title: '⚠️ 紧急：可疑账户更换请求',
    body: '在你们谈判接近尾声时，Michael 突然发来一封邮件：\n\n"Hi, I hope you are well. Please note that our company has recently changed our banking details due to an internal restructuring. Please update the bank account in your PI to the following: [Bank: Commerzbank Frankfurt | IBAN: DE89370400440532013000 | SWIFT: COBADEFFXXX]. This is urgent as we need to process payments before month-end. Thank you, Michael Braun"',
    question: '你会怎么处理？',
    options: [
      {
        label: '立刻按邮件指示更新 PI 上的银行账户',
        outcome: 'BAD',
        principleId: 'PRINCIPLE_BEC',
        explanation: '严重错误！这是典型的 BEC 诈骗手法。',
      },
      {
        label: '用你之前认识的电话号码直接致电 Michael 确认（不用邮件里提到的号码）',
        outcome: 'GOOD',
        explanation: '正确！这是唯一有效的防御手段——带外验证（Out-of-band Verification）。使用你已知的 Michael 电话号码（不是邮件里的），直接确认是否真的更换账户。如果 Michael 说没有发过这封邮件，立即通知他邮箱已被入侵，并向你们的银行发出欺诈警告。',
      },
      {
        label: '回邮件问 Michael 为什么要换账户，等他解释',
        outcome: 'BAD',
        explanation: '不安全。如果攻击者控制了 Michael 的邮箱，他可以伪造任何解释。邮件渠道已经不可信，必须换到电话或其他带外渠道验证。',
      },
    ],
  },

  SCENARIO_SHORT_PAYMENT: {
    id: 'SCENARIO_SHORT_PAYMENT',
    title: '尾款短付：差额 USD 15',
    body: '你收到了买家的尾款，但实际收到金额是 USD 2,435，而应收尾款是 USD 2,450，差额 USD 15。买家说这是银行的国际汇款手续费，不是他们故意少付的。',
    question: '你会怎么处理？',
    options: [
      {
        label: '接受，USD 15 的手续费差额属于正常的国际汇款成本，不影响关系',
        outcome: 'GOOD',
        explanation: '正确处理。国际电汇（SWIFT）通常有 USD 10–30 的中间行手续费，这是行业惯例。为 USD 15 追讨会损害关系，而且追讨成本本身可能超过 USD 15。建议在下次 PI 中加一句"All bank charges on buyer\'s account"来明确未来的费用归属。',
      },
      {
        label: '要求买家补足 USD 15，这是应收款必须全额到账',
        outcome: 'OK',
        explanation: '原则上有道理，但在实操中，为 USD 15 催款会让买家觉得你斤斤计较，影响长期关系。建议在 PI 条款中提前约定"all banking charges for buyer\'s account"，而不是事后追讨。',
      },
      {
        label: '暂时不放单，等 USD 15 全额到账再操作',
        outcome: 'OK',
        explanation: '可以接受，但可能引发不必要的摩擦。更好的做法是先放单，同时友好提醒买家下次 PI 中明确约定手续费归属，或者请买家补汇。对于长期客户，这个差额通常不值得为此延误放单。',
      },
    ],
  },
};
