// ─────────────────────────────────────────────────────────────
// SSA ERP 使用说明书（结构化内容，单一数据源）
// 由 src/pages/Help/UserManual.tsx 渲染：左侧目录 + 页内搜索 + 锚点滚动。
// 维护说明：新增/调整表单时，请在对应 module 下补充 ManualSection，
// 同时在 src/config/searchIndex.ts 同步页面搜索索引。
// ─────────────────────────────────────────────────────────────

export type BlockKind = 'usage' | 'why' | 'fields' | 'steps' | 'notes';

export interface ManualBlock {
  kind: BlockKind;
  /** 块标题（如「用途」「为什么这样操作」） */
  title: string;
  /** 正文，可含多句；用 \n 分段 */
  text: string;
}

export interface ManualSection {
  id: string;
  title: string;
  blocks: ManualBlock[];
}

export interface ManualModule {
  id: string;
  title: string;
  /** MUI 图标名（用于目录展示） */
  icon: string;
  sections: ManualSection[];
}

export const BLOCK_LABEL: Record<BlockKind, string> = {
  usage: '用途',
  why: '为什么这样操作',
  fields: '关键字段',
  steps: '操作流程',
  notes: '注意事项',
};

export const BLOCK_COLOR: Record<BlockKind, string> = {
  usage: '#2563eb',
  why: '#7c3aed',
  fields: '#0891b2',
  steps: '#059669',
  notes: '#d97706',
};

export const MANUAL_MODULES: ManualModule[] = [
  // ───────────────────────── 1. 概述与导航 ─────────────────────────
  {
    id: 'overview',
    title: '概述与导航',
    icon: 'Dashboard',
    sections: [
      {
        id: 'overview-position',
        title: '系统定位',
        blocks: [
          { kind: 'usage', title: '用途', text: 'SSA ERP 是一套面向钢材/装备制造供应链的一体化管理系统，覆盖「销售—采购—仓储—生产—质量—财务」全业务链路，数据全部存于浏览器本地（localStorage），无需后端即可单机运行与演示。' },
          { kind: 'why', title: '为什么这样操作', text: '采用纯前端 + 本地存储架构，便于零成本上线、随时演示与离线使用；所有模块共享同一套主数据（物料/供应商/客户/仓库），保证业务单据之间可联动、可追溯。' },
          { kind: 'notes', title: '注意事项', text: '本地存储仅存在于当前浏览器，清理浏览器数据或更换设备会丢失数据；正式多用户协同需对接后端服务（当前为演示版）。' },
        ],
      },
      {
        id: 'overview-layout',
        title: '界面布局',
        blocks: [
          { kind: 'usage', title: '用途', text: '顶部为固定顶栏（组织切换、会话切换、全局搜索、通知、待办、帮助）；左侧为功能导航；中间为页面内容区；多标签页可在页面间快速切换。' },
          { kind: 'fields', title: '关键区域', text: '顶栏搜索框：按 Ctrl/Cmd+K 唤起，输入功能或页面名即可直达。\n左侧导航：按「审批中心 / 主数据 / 供应链 / 销售管理 / 生产与质量 / 财务与报表 / 分析与报表」分组。\n多标签页：打开过的页面以标签呈现，点击可回看。\n系统版本：**界面上不再显示版本号**，需要查询当前版本时进入「系统设置 → 帮助中心 → 系统信息」（顶栏搜索「版本」也可直达）。' },
        ],
      },
      {
        id: 'overview-common',
        title: '通用操作（搜索 / 打印 / 审批 / 快捷键）',
        blocks: [
          { kind: 'usage', title: '用途', text: '介绍跨模块通用的四大能力，建议在开始业务前先熟悉。' },
          { kind: 'steps', title: '操作流程', text: '1) 搜索：顶栏按 Ctrl/Cmd+K，输入「采购订单」「PO」「MRP」等，用 ↑/↓ 选择、Enter 打开。\n2) 打印：进入任一详情页，点击顶部「打印/打印预览」调用通用打印模块，可选模板与纸张。\n3) 审批：业务单据提交后进入审批中心（物料/供应商/采购/价格审批），按待办逐条处理。\n4) 快捷键：? 或顶栏「?」按钮查看全部快捷键；Esc 关闭弹层。' },
          { kind: 'why', title: '为什么这样操作', text: '把「搜索、打印、审批、快捷键」做成通用能力而非各页面重复实现，是为了降低学习成本、保证体验一致，并让新页面开箱即用。' },
        ],
      },
    ],
  },

  // ───────────────────────── 2. 主数据 ─────────────────────────
  {
    id: 'master',
    title: '主数据',
    icon: 'Inventory2',
    sections: [
      {
        id: 'master-material',
        title: '物料主数据',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护企业所有料号（原材料、半成品、成品）的基础档案，是采购、生产、仓储、销售、成本等一切业务单据的引用对象。' },
          { kind: 'fields', title: '关键字段', text: '物料编码（唯一，按编码规则自动生成）、名称、规格、计量单位、物料类型（原材料/半成品/成品）、评估类、价格、提前期、安全库存、默认仓库。' },
          { kind: 'why', title: '为什么这样操作', text: '物料是 ERP 的「主语」。先建物料再建单据，可避免单据里出现无主的数据；评估类决定该物料出入库时走哪个会计科目与计价方式，必须先行设定。' },
          { kind: 'steps', title: '操作流程', text: '进入「主数据 → 物料管理 → 物料列表」→ 新增 → 填写编码/类型/单位/价格/仓库 → 保存 →（如需）提交物料审批。' },
          { kind: 'notes', title: '注意事项', text: '成品物料需设置「评估类=FG」，并与 BOM、工艺路线关联后才能跑 MRP 与成本核算；删除物料会影响已关联单据，建议用「停用」而非硬删。' },
        ],
      },
      {
        id: 'master-category',
        title: '物料分类',
        blocks: [
          { kind: 'usage', title: '用途', text: '以树形结构对物料分组（如钢材/型材/板材），用于统计、权限与编码规则分组。' },
          { kind: 'why', title: '为什么这样操作', text: '分类是后续「按类设置编码规则、按类授权、按类统计报表」的基础，先定分类再建物料，可保证归类一致。' },
        ],
      },
      {
        id: 'master-vendor',
        title: '供应商主数据',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护供应商档案（营业执照、联系人、付款条款、供货范围、评级），是采购订单、货源清单、价格记录的来源。' },
          { kind: 'fields', title: '关键字段', text: '供应商编码、名称、税号、评级、合作状态、付款条件、默认交货周期、供货物料范围、银行账户。' },
          { kind: 'why', title: '为什么这样操作', text: '供应商需经「准入审批」后方可参与采购；评级与风险评分会反作用于采购配额与订单推荐，保证供货质量与合规。' },
          { kind: 'notes', title: '注意事项', text: '列入黑名单的供应商不可下单；新供应商注册后经「供应商注册审批」转正。' },
        ],
      },
      {
        id: 'master-customer',
        title: '客户主数据',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护购买方档案（信用等级、信用额度、税号、收货地址、开票信息），是销售订单、合同、应收的依据。' },
          { kind: 'why', title: '为什么这样操作', text: '信用等级与信用额度用于销售订单/发货时的信用校验，超额度会拦截，控制坏账风险；税号与开票信息保证销售开票合规。' },
        ],
      },
      {
        id: 'master-warehouse',
        title: '仓库主数据',
        blocks: [
          { kind: 'usage', title: '用途', text: '定义实体仓库与库位（原料库/成品库/辅料库），出入库单据必须指定仓库，库存按仓库维度统计。' },
          { kind: 'why', title: '为什么这样操作', text: '同一物料在不同仓库的库存、计价、用途不同；明确仓库可支撑「按仓备货、跨组织转储、库龄分析」等精细化管控。' },
        ],
      },
    ],
  },

  // ───────────────────────── 3. 销售管理 ─────────────────────────
  {
    id: 'sales',
    title: '销售管理',
    icon: 'Storefront',
    sections: [
      {
        id: 'sales-prospect',
        title: '意向客户',
        blocks: [
          { kind: 'usage', title: '用途', text: '记录尚未成交的潜在客户与跟进过程（电话/拜访/邮件），是销售漏斗与商机转化的源头。' },
          { kind: 'fields', title: '关键字段', text: '公司名称、联系人、电话、来源、意向产品、跟进记录（日期/方式/内容/结果）、负责销售。' },
          { kind: 'why', title: '为什么这样操作', text: '把「客户跟进」前置为独立对象，便于销售过程管理（SFA）与转化分析；跟进成熟后转「客户主数据 + 销售报价」，形成线索→商机→订单的闭环。' },
          { kind: 'steps', title: '操作流程', text: '进入「销售管理 → 意向客户」→ 新增 → 填写公司与跟进记录 → 状态推进（跟进中→报价→成交）。' },
        ],
      },
      {
        id: 'sales-quotation',
        title: '销售报价',
        blocks: [
          { kind: 'usage', title: '用途', text: '向客户出具报价单（含明细、单价、交期、有效期），是合同的报价依据。' },
          { kind: 'why', title: '为什么这样操作', text: '报价先于合同，便于在成交前核对价格与毛利；报价被接受后可一键转销售合同/销售订单，减少重复录入。' },
        ],
      },
      {
        id: 'sales-contract',
        title: '销售合同',
        blocks: [
          { kind: 'usage', title: '用途', text: '记录与客户签订的正式合同（标的、金额、付款计划、履约期限），是销售订单与收款的法律依据。' },
          { kind: 'fields', title: '关键字段', text: '合同号、客户、金额、开始/结束日期、明细行（产品/数量/单价）、付款计划（里程碑/比例/金额）。' },
          { kind: 'why', title: '为什么这样操作', text: '合同与订单分离，可支持「一合同多订单」「按合同控发货与开票额度」，并支撑后续应收按付款计划核销。' },
        ],
      },
      {
        id: 'sales-order',
        title: '销售订单',
        blocks: [
          { kind: 'usage', title: '用途', text: '客户确认的采购需求（SO），驱动后续生产/采购、发货、开票、收款全过程，是销售业务的中心单据。' },
          { kind: 'fields', title: '关键字段', text: '订单号、客户、明细（物料/数量/单价/交期）、税率、总金额、销售员、状态（草稿/确认/生产中/已发货/关闭）、审批记录。' },
          { kind: 'why', title: '为什么这样操作', text: 'SO 必须经过「订单评审/审批」才能进入执行，目的是校验信用、库存、产能与价格，避免盲目承诺交期；评审意见留痕可追溯。' },
          { kind: 'steps', title: '操作流程', text: '新增 SO → 选客户与明细 → 提交评审 → 审批通过 → 系统据成品库存决定「直接发货」或「转生产/采购」。' },
          { kind: 'notes', title: '注意事项', text: '信用额度不足时会被拦截；订单关闭后不可再发货/开票。' },
        ],
      },
      {
        id: 'sales-logistics',
        title: '物流发货',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理销售订单的发货与物流跟踪（承运商、运单号、在途状态、预计送达），并生成出库单扣减库存。' },
          { kind: 'why', title: '为什么这样操作', text: '发货与出库联动，保证「实物出库=库存减少=成本结转(COGS)」三账一致；物流跟踪让客户与销售可实时掌握在途。' },
        ],
      },
      {
        id: 'sales-invoice',
        title: '销售开票',
        blocks: [
          { kind: 'usage', title: '用途', text: '依据已发货/已收货的销售订单开具销售发票，并生成应收账款（AR）。' },
          { kind: 'why', title: '为什么这样操作', text: '开票走应收（AR）而非采购发票模块；开票即形成应收，后续按付款计划收款核销，实现「票—款—账」闭环。' },
          { kind: 'notes', title: '注意事项', text: '未发货一般不允许提前开票（防控税务与收入确认风险）；红冲用销售退货处理。' },
        ],
      },
      {
        id: 'sales-return',
        title: '销售退货',
        blocks: [
          { kind: 'usage', title: '用途', text: '处理客户退货（退库、退款/红冲应收），包含退货原因与质检结论。' },
          { kind: 'why', title: '为什么这样操作', text: '退货回写库存与应收，保证账实一致，并为质量追溯与客户 ABC 分析提供负向数据。' },
        ],
      },
    ],
  },

  // ───────────────────────── 4. 采购管理 ─────────────────────────
  {
    id: 'purchase',
    title: '采购管理',
    icon: 'ShoppingCart',
    sections: [
      {
        id: 'purchase-request',
        title: '采购申请',
        blocks: [
          { kind: 'usage', title: '用途', text: '各部门提出采购需求（PR），说明物料、数量、需求日期与用途，是采购执行的起点。' },
          { kind: 'fields', title: '关键字段', text: '申请单号、申请部门/人、物料、数量、需求日期、用途、审批状态。' },
          { kind: 'why', title: '为什么这样操作', text: 'PR 先行可集中需求、避免重复采购，并经审批控制预算；MRP 运算的结果也以 PR 形式落地（需求产生）。' },
        ],
      },
      {
        id: 'purchase-order',
        title: '采购订单',
        blocks: [
          { kind: 'usage', title: '用途', text: '向供应商正式下单（PO），约定物料、价格、数量、交期与付款条款，是收货、发票、付款的主线。' },
          { kind: 'fields', title: '关键字段', text: '订单号、供应商、来源申请号、明细（物料/数量/单价/交期）、总金额、状态、确认状态（供应商门户确认）。' },
          { kind: 'why', title: '为什么这样操作', text: 'PO 由 PR 转（PR 转 PO）以保证「按需采购、来源可溯」；订单确认后驱动交期跟踪与后续收货，三单匹配也以 PO 为基准。' },
          { kind: 'steps', title: '操作流程', text: 'PR 列表 → 选中需求转 PO → 录入供应商与价格 → 提交采购审批 → 供应商门户确认 → 进入交期跟踪/收货。' },
        ],
      },
      {
        id: 'purchase-track',
        title: '交期跟踪',
        blocks: [
          { kind: 'usage', title: '用途', text: '监控每张 PO 的交货进度（已交/未交/逾期），预警延迟风险。' },
          { kind: 'why', title: '为什么这样操作', text: '提前识别交期风险可触发替代货源或调整生产计划，保障齐套率。' },
        ],
      },
      {
        id: 'purchase-framework',
        title: '框架协议',
        blocks: [
          { kind: 'usage', title: '用途', text: '与供应商签订长期协议（总量/定价/有效期），日常下单引用协议价，减少重复议价。' },
          { kind: 'why', title: '为什么这样操作', text: '框架协议锁定价格与产能，既保障供应又控制采购成本；PO 可关联协议取价。' },
        ],
      },
      {
        id: 'purchase-source-list',
        title: '货源清单',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护「物料 ↔ 合格供应商」的对应关系与配额，是 MRP/采购推荐供货来源的依据，含物料编码联动。' },
          { kind: 'why', title: '为什么这样操作', text: '货源清单限定可供货的供应商范围并分配配额，保证采购只在合格供方内进行；物料编码与采购申请/订单联动，避免选错料号。' },
        ],
      },
      {
        id: 'purchase-info-record',
        title: '采购信息记录',
        blocks: [
          { kind: 'usage', title: '用途', text: '记录「供应商+物料」的历史采购价与交货表现，供比价与自动取价参考。' },
          { kind: 'why', title: '为什么这样操作', text: '信息记录沉淀价格与交期数据，使采购下单时可带出近期价、支撑比价与谈判。' },
        ],
      },
      {
        id: 'purchase-return',
        title: '采购退货',
        blocks: [
          { kind: 'usage', title: '用途', text: '对不合格到货向供应商退回（退库、冲应付/生成退货单）。' },
          { kind: 'why', title: '为什么这样操作', text: '退货回写库存与应付，保证账实一致，并为供应商评级/风险提供负向数据。' },
        ],
      },
    ],
  },

  // ───────────────────────── 5. 价格管理 ─────────────────────────
  {
    id: 'price',
    title: '价格管理',
    icon: 'MonetizationOn',
    sections: [
      {
        id: 'price-inquiry',
        title: '询价单',
        blocks: [
          { kind: 'usage', title: '用途', text: '向多家供应商发出询价（RFQ），收集报价。' },
          { kind: 'why', title: '为什么这样操作', text: '先询价再比价，使采购价格有依据、可审计，是「阳光采购」的入口。' },
        ],
      },
      {
        id: 'price-comparison',
        title: '比价单',
        blocks: [
          { kind: 'usage', title: '用途', text: '汇总多家供应商报价，横向对比价格/交期/条款，选定供方。' },
          { kind: 'why', title: '为什么这样操作', text: '比价结果是 PO 定价与货源清单更新的依据，确保「同质价优」。' },
        ],
      },
      {
        id: 'price-list',
        title: '价目表',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护物料的标准售价/采购价，供订单自动带价。' },
        ],
      },
    ],
  },

  // ───────────────────────── 6. 仓储物流 ─────────────────────────
  {
    id: 'warehouse',
    title: '仓储物流',
    icon: 'Warehouse',
    sections: [
      {
        id: 'wh-inspection-notice',
        title: '报检单',
        blocks: [
          { kind: 'usage', title: '用途', text: '到货后向质量部门发起报检（送检），触发来料检验任务。' },
          { kind: 'why', title: '为什么这样操作', text: '先报检后入库，确保只有检验合格物料才允许入库使用，是质量门禁的关键环节。' },
        ],
      },
      {
        id: 'wh-inbound',
        title: '采购入库',
        blocks: [
          { kind: 'usage', title: '用途', text: '供应商到货并检验合格后，办理采购入库（GR），过账库存。' },
          { kind: 'fields', title: '关键字段', text: '入库单号、类型(采购)、来源单号(PO/ASN)、供应商、仓库、明细（物料/实收数量/质量状态/单价）。' },
          { kind: 'why', title: '为什么这样操作', text: '入库单「完成」时自动过账库存、滚动移动均价、生成 GR/IR 暂估凭证、回写 PO 收货；状态=completed 才真正记账，避免中途误操作影响账实。' },
          { kind: 'steps', title: '操作流程', text: '新建入库 → 关联 PO/ASN → 录入实收与质量状态 → 提交 → 完成过账。' },
        ],
      },
      {
        id: 'wh-fg-inbound',
        title: '成品入库',
        blocks: [
          { kind: 'usage', title: '用途', text: '生产完工后，将成品/半成品办理入库（生产入库单）。' },
          { kind: 'why', title: '为什么这样操作', text: '通常由「生产工单完工」自动生成成品入库单并过账库存与生产成本；也可手工登记，保证生产产出计入库存与成本。' },
        ],
      },
      {
        id: 'wh-outbound',
        title: '出库管理',
        blocks: [
          { kind: 'usage', title: '用途', text: '处理销售发货、生产领料、退货、调拨等出库（GI）。' },
          { kind: 'why', title: '为什么这样操作', text: '出库完成即扣减库存并结转成本（如销售 COGS、生产发料），与发货/工单联动，保持账实一致。' },
        ],
      },
      {
        id: 'wh-check',
        title: '库存盘点',
        blocks: [
          { kind: 'usage', title: '用途', text: '定期盘点实物并与系统库存比对，产生盘盈/盘亏差异并调整。' },
          { kind: 'why', title: '为什么这样操作', text: '盘点纠偏保证系统账与实物一致；差异经审批后过账，是库存准确性的最后防线。' },
        ],
      },
      {
        id: 'wh-inventory',
        title: '库存查询',
        blocks: [
          { kind: 'usage', title: '用途', text: '实时查看各仓库、各物料的库存数量、可用量、在途量与金额。' },
          { kind: 'why', title: '为什么这样操作', text: '是 MRP、ATP 可用量承诺、补货决策的数据基础；销售接单前应先查可用量。' },
        ],
      },
      {
        id: 'wh-batch',
        title: '批次管理',
        blocks: [
          { kind: 'usage', title: '用途', text: '对物料启用批次，记录每批的入库/出库/现状，支持先进先出与效期管控。' },
          { kind: 'why', title: '为什么这样操作', text: '批次是质量追溯的最小单元；钢材等按炉号/批号管理可精准定位不合格范围。' },
        ],
      },
      {
        id: 'wh-aging',
        title: '库龄分析',
        blocks: [
          { kind: 'usage', title: '用途', text: '按入库时间分布统计库存库龄，识别呆滞料。' },
          { kind: 'why', title: '为什么这样操作', text: '库龄过长意味着资金占用与减值风险，分析结果为促销、报废、复用提供决策。' },
        ],
      },
      {
        id: 'wh-transfer',
        title: '跨组织转储',
        blocks: [
          { kind: 'usage', title: '用途', text: '在分公司/工厂间调拨库存（转储单）。' },
          { kind: 'why', title: '为什么这样操作', text: '多组织下用转储而非买卖，简化内部调拨并保留库存所有权转移轨迹。' },
        ],
      },
      {
        id: 'wh-adjustment',
        title: '库存调整',
        blocks: [
          { kind: 'usage', title: '用途', text: '对系统库存做盘盈盘亏或损耗调整（需审批）。' },
          { kind: 'why', title: '为什么这样操作', text: '除盘点外的偶发差异通过受控的调整单处理，保证每笔变动有迹可循。' },
        ],
      },
      {
        id: 'wh-trace',
        title: '批次追溯穿透',
        blocks: [
          { kind: 'usage', title: '用途', text: '从成品一路向上穿透到原材料批次（正反向追溯）。' },
          { kind: 'why', title: '为什么这样操作', text: '出现质量问题时，可快速圈定受影响批次与客群，支撑召回与 8D 分析。' },
        ],
      },
      {
        id: 'wh-consignment',
        title: '寄售库存',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理供应商寄存在我方、所有权仍属供应商的库存，消耗后才结算。' },
          { kind: 'why', title: '为什么这样操作', text: '寄售降低我方资金占用与缺料风险，但需与自有库存区分计量，避免账实混淆。' },
        ],
      },
    ],
  },

  // ───────────────────────── 7. 生产管理 ─────────────────────────
  {
    id: 'production',
    title: '生产管理',
    icon: 'PrecisionManufacturing',
    sections: [
      {
        id: 'production-bom',
        title: 'BOM（物料清单）',
        blocks: [
          { kind: 'usage', title: '用途', text: '定义成品由哪些子件（原材料/半成品）按数量构成，是 MRP 展开与成本核算的基础。' },
          { kind: 'fields', title: '关键字段', text: '父项物料、子项物料、用量、损耗率、层级（多层 EBOM/MBOM）、生效日期。' },
          { kind: 'why', title: '为什么这样操作', text: 'BOM 是「输入→产出」的配方；没有正确 BOM，MRP 无法算需求、成本卷积无法算标准成本。' },
        ],
      },
      {
        id: 'production-route',
        title: '工艺路线',
        blocks: [
          { kind: 'usage', title: '用途', text: '定义产品加工经过的工序、工作中心、标准工时与工序顺序。' },
          { kind: 'why', title: '为什么这样操作', text: '工艺路线支撑排产（产能/负荷）、工序报工与工序成本归集，是生产计划与成本核算的主线。' },
        ],
      },
      {
        id: 'production-order',
        title: '工单管理',
        blocks: [
          { kind: 'usage', title: '用途', text: '下达生产任务（WO），跟踪状态（待排产→生产中→完工→关闭），完工后自动入库与成本归集。' },
          { kind: 'fields', title: '关键字段', text: '工单号、产品(物料)、数量、计划开始/结束日期、工艺路线、状态、实际成本。' },
          { kind: 'why', title: '为什么这样操作', text: '工单把 BOM+工艺路线+计划变成可执行任务；完工（completeWorkOrder）自动生成成品入库单、记账生产成本，实现「生产→库存→成本」自动闭环。' },
          { kind: 'steps', title: '操作流程', text: 'MRP/销售订单转工单 → 排产（设计划日期）→ 开工 → 工序报工 → 完工确认（录入合格/废品数量）→ 系统自动成品入库。' },
        ],
      },
      {
        id: 'production-mrp',
        title: 'MRP计划',
        blocks: [
          { kind: 'usage', title: '用途', text: '根据销售/生产需求与 BOM，自动计算物料净需求与建议（采购/生产），生成 PR 与工单建议。' },
          { kind: 'why', title: '为什么这样操作', text: 'MRP 把「要卖/要产什么」换算成「要买/要产什么、何时」，避免缺料与积压；结果以采购申请(PR)形式落地（需求产生）。' },
        ],
      },
      {
        id: 'production-scheduling',
        title: '生产排产',
        blocks: [
          { kind: 'usage', title: '用途', text: '将工单按产能与交期排入机台/产线，检测资源冲突并优化顺序。' },
          { kind: 'why', title: '为什么这样操作', text: '排产使工单计划日期落到工单上，保证产能不超载、交期可达成；系统以冲突检测保障可行性。' },
        ],
      },
      {
        id: 'production-reporting',
        title: '工序报工',
        blocks: [
          { kind: 'usage', title: '用途', text: '每道工序完工后上报产量与工时（含合格/废品）。' },
          { kind: 'why', title: '为什么这样操作', text: '报工是进度与成本的真实来源，支撑 WIP 看板、工时成本与绩效统计。' },
        ],
      },
      {
        id: 'production-subcontract',
        title: '委外加工',
        blocks: [
          { kind: 'usage', title: '用途', text: '将部分工序/半成品发外协厂加工并回收。' },
          { kind: 'why', title: '为什么这样操作', text: '补齐自有产能不足；委外发料/回收按出库/入库联动，成本计入加工费。' },
        ],
      },
      {
        id: 'production-ecn',
        title: '工程变更 ECN',
        blocks: [
          { kind: 'usage', title: '用途', text: '对物料、BOM、工艺路线发起工程变更并受控生效。' },
          { kind: 'why', title: '为什么这样操作', text: '变更需评审与版本管理，避免未受控修改导致生产用错版本。' },
        ],
      },
      {
        id: 'production-cost',
        title: '成本归集',
        blocks: [
          { kind: 'usage', title: '用途', text: '汇总工单的材料、人工、制造费用，计算实际生产成本。' },
          { kind: 'why', title: '为什么这样操作', text: '完工后成本自动归集并与标准成本对比，差异用于定价与降本分析。' },
        ],
      },
    ],
  },

  // ───────────────────────── 8. 质量管理 ─────────────────────────
  {
    id: 'quality',
    title: '质量管理',
    icon: 'FactCheck',
    sections: [
      {
        id: 'quality-inspection',
        title: '检验任务',
        blocks: [
          { kind: 'usage', title: '用途', text: '执行来料(IQC)/过程(IPQC)/成品(OQC)检验，记录抽样结果与判定。' },
          { kind: 'fields', title: '关键字段', text: '任务号、类型、物料、批次、数量、抽样数、检验标准、判定（合格/不合格）、检验员。' },
          { kind: 'why', title: '为什么这样操作', text: '检验是入库/转序/发货的质量门禁；只有检验合格（qualityStatus=qualified）的物料才允许入库使用。' },
        ],
      },
      {
        id: 'quality-standard',
        title: '检验标准',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护各类物料的检验项目、抽样方案与合格判据。' },
          { kind: 'why', title: '为什么这样操作', text: '标准是检验任务自动带出检验项的依据，保证检验口径统一、可追溯。' },
        ],
      },
      {
        id: 'quality-aql',
        title: 'AQL抽样',
        blocks: [
          { kind: 'usage', title: '用途', text: '按 AQL（可接受质量限）标准确定抽样数量与接收准则。' },
          { kind: 'why', title: '为什么这样操作', text: '用统计抽样替代全检，兼顾质量风险与检验成本。' },
        ],
      },
      {
        id: 'quality-unqualified',
        title: '不合格品',
        blocks: [
          { kind: 'usage', title: '用途', text: '记录不合格品的处置（退货/返工/让步接收/报废）与闭环。' },
          { kind: 'why', title: '为什么这样操作', text: '不合格必须受控处置并形成 NCR 闭环，防止不良品流入下工序或客户。' },
        ],
      },
      {
        id: 'quality-pdca',
        title: 'PDCA改进',
        blocks: [
          { kind: 'usage', title: '用途', text: '以计划-执行-检查-处理循环推动质量持续改进。' },
          { kind: 'why', title: '为什么这样操作', text: '把一次性整改沉淀为机制，避免问题重复发生。' },
        ],
      },
      {
        id: 'quality-8d',
        title: '8D问题求解',
        blocks: [
          { kind: 'usage', title: '用途', text: '用八步法对重大质量问题进行根因分析与永久对策。' },
          { kind: 'why', title: '为什么这样操作', text: '结构化方法确保不掩盖根因；与批次追溯联动可精准圈定影响范围。' },
        ],
      },
      {
        id: 'quality-spc',
        title: 'SPC控制图',
        blocks: [
          { kind: 'usage', title: '用途', text: '对关键工序质量特性做统计过程控制，预警异常波动。' },
          { kind: 'why', title: '为什么这样操作', text: '在缺陷发生前识别趋势，变「事后检验」为「过程预防」。' },
        ],
      },
      {
        id: 'quality-fmea',
        title: 'FMEA分析',
        blocks: [
          { kind: 'usage', title: '用途', text: '事前评估潜在失效模式及影响，优先降低高风险项。' },
        ],
      },
      {
        id: 'quality-coa',
        title: 'COA合格证',
        blocks: [
          { kind: 'usage', title: '用途', text: '随货提供产品质量合格证/质检报告。' },
          { kind: 'why', title: '为什么这样操作', text: '合格证是交付合规与客户验收的凭证，尤为钢材等大宗品所需。' },
        ],
      },
    ],
  },

  // ───────────────────────── 9. 财务管理 ─────────────────────────
  {
    id: 'finance',
    title: '财务管理',
    icon: 'AccountBalance',
    sections: [
      {
        id: 'finance-invoice',
        title: '发票管理',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理采购发票（供应商开票），录入税额、价税合计并与收货/订单匹配。' },
          { kind: 'why', title: '为什么这样操作', text: '采购发票走应付（AP）口径；发票与 PO、收货做「三单匹配」后方可付款，防范重复付款与虚假发票。' },
          { kind: 'notes', title: '注意事项', text: '销售开票在「销售管理 → 销售开票」（生成应收），不要与本模块的采购发票混淆。' },
        ],
      },
      {
        id: 'finance-payment',
        title: '付款计划',
        blocks: [
          { kind: 'usage', title: '用途', text: '按发票/合同排定付款时间与金额，跟踪应付到期。' },
          { kind: 'why', title: '为什么这样操作', text: '集中付款计划可优化现金流、避免逾期违约并争取现金折扣。' },
        ],
      },
      {
        id: 'finance-three-way',
        title: '三单匹配',
        blocks: [
          { kind: 'usage', title: '用途', text: '自动比对采购订单、收货单、发票的数量与金额一致性。' },
          { kind: 'why', title: '为什么这样操作', text: '只有三者吻合才放行付款，是采购财务控制的核心闸门，杜绝「没货先付、数量不符」。' },
        ],
      },
      {
        id: 'finance-ar',
        title: '应收管理',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理客户应收账款（开票形成应收，收款核销），含账龄与逾期。' },
          { kind: 'why', title: '为什么这样操作', text: '应收与销售开票联动，收款后核销使余额归零并标记 closed，支撑现金流与坏账预警。' },
        ],
      },
      {
        id: 'finance-ap',
        title: '应付管理',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理供应商应付账款，按发票/付款计划核销。' },
          { kind: 'why', title: '为什么这样操作', text: '应付与采购发票联动，付款后核销，保证负债账实一致。' },
        ],
      },
      {
        id: 'finance-voucher',
        title: '凭证与分录',
        blocks: [
          { kind: 'usage', title: '用途', text: '查看与登记会计凭证/分录，是账务的底层记录。' },
          { kind: 'why', title: '为什么这样操作', text: '业务单据（入库/完工/出库/收付款）会自动生成凭证，保证「业务发生即记账」；也可手工补录。' },
        ],
      },
      {
        id: 'finance-closing',
        title: '期末结账',
        blocks: [
          { kind: 'usage', title: '用途', text: '月末/年末执行结账，锁定本期账务并结转。' },
          { kind: 'why', title: '为什么这样操作', text: '结账保证会计期间封闭、数据不可随意篡改，是出具财务报表的前提。' },
        ],
      },
      {
        id: 'finance-budget',
        title: '预算控制',
        blocks: [
          { kind: 'usage', title: '用途', text: '编制费用/采购预算并在发生环节做预算占用与超支预警。' },
          { kind: 'why', title: '为什么这样操作', text: '预算前置控制支出，避免无计划超支。' },
        ],
      },
      {
        id: 'finance-fixed-assets',
        title: '固定资产',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理固定资产卡片、折旧与变动。' },
        ],
      },
    ],
  },

  // ───────────────────────── 10. 报表与分析 ─────────────────────────
  {
    id: 'analytics',
    title: '报表与分析',
    icon: 'Assessment',
    sections: [
      {
        id: 'report-center',
        title: '报表中心',
        blocks: [
          { kind: 'usage', title: '用途', text: '集中查询各业务报表，支持设计器自定义与 BI 自助分析。' },
          { kind: 'why', title: '为什么这样操作', text: '统一入口避免业务人员到处找数；报表权限与订阅保证数据安全与主动推送。' },
        ],
      },
      {
        id: 'bi',
        title: 'BI自助分析',
        blocks: [
          { kind: 'usage', title: '用途', text: '拖拽维度/指标做自助式多维分析。' },
        ],
      },
      {
        id: 'cockpit',
        title: '经营驾驶舱',
        blocks: [
          { kind: 'usage', title: '用途', text: '以可视化大屏呈现收入、订单、库存、质量等核心经营指标。' },
          { kind: 'why', title: '为什么这样操作', text: '一屏掌握全局，便于管理层快速决策与异常干预。' },
        ],
      },
      {
        id: 'forecast',
        title: '需求预测与补货',
        blocks: [
          { kind: 'usage', title: '用途', text: '基于历史与趋势预测需求并给出补货建议。' },
          { kind: 'why', title: '为什么这样操作', text: '从「被动 MRP」走向「主动补货」，降低缺料与库存资金占用。' },
        ],
      },
      {
        id: 'chatbi',
        title: 'ChatBI对话分析',
        blocks: [
          { kind: 'usage', title: '用途', text: '用自然语言提问获取图表与结论。' },
          { kind: 'why', title: '为什么这样操作', text: '降低分析门槛，业务人员无需懂 SQL 即可取数。' },
        ],
      },
      {
        id: 'alerts',
        title: '异常检测预警',
        blocks: [
          { kind: 'usage', title: '用途', text: '对库存、交期、质量、账龄等异常自动预警。' },
          { kind: 'why', title: '为什么这样操作', text: '把「人找异常」变为「异常找人」，缩短响应时间。' },
        ],
      },
    ],
  },

  // ───────────────────────── 11. 系统设置 ─────────────────────────
  {
    id: 'system',
    title: '系统设置',
    icon: 'Settings',
    sections: [
      {
        id: 'settings',
        title: '系统设置',
        blocks: [
          { kind: 'usage', title: '用途', text: '维护组织/用户/角色/权限、菜单顺序与可见性、打印模板、参数等基础配置。' },
          { kind: 'why', title: '为什么这样操作', text: '集中配置保证权限与体验一致；菜单可见性可按岗位定制，减少干扰。' },
          { kind: 'notes', title: '注意事项', text: '「帮助中心 → 使用说明书」可随时打开完整使用说明书（同样可在左侧导航的「使用说明书」或顶栏搜索直达）；每次系统升级后，说明书内的「版本更新记录」章节会同步登记本次变更，建议升级后先查阅。' },
        ],
      },
      {
        id: 'flow-selftest',
        title: '全流程自检',
        blocks: [
          { kind: 'usage', title: '用途', text: '一键填充一条贯穿「客户跟进→收款」的演示数据，验证 19 个环节是否贯通、数据是否持久化。' },
          { kind: 'why', title: '为什么这样操作', text: '用于上线前/演示前快速验证全链路与事件回写（入库过账、完工入库、出库结转、应收核销）是否正确，避免白屏与静默失效。' },
        ],
      },
    ],
  },

  // ───────────────────────── 13. 智能增强模块（P2） ─────────────────────────
  {
    id: 'p2smart',
    title: '智能增强模块（P2）',
    icon: 'Assessment',
    sections: [
      {
        id: 'p2-rebate',
        title: '返利自动结算（P2-11）',
        blocks: [
          { kind: 'usage', title: '用途', text: '按客户/物料/有效期配置返利规则（百分比或固定金额），并基于真实销售单自动聚合基数、一键结算，替代手工填写基数金额。' },
          { kind: 'steps', title: '操作流程', text: '① 在「销售管理 → 返利管理 → 返利规则」新增规则（指定客户、可选物料、类型、费率、有效期）。\n② 切到「返利结算」→ 点「按启用规则自动结算」，系统按各规则范围（客户+可选物料+有效期窗口）从销售单聚合基数并生成待结算记录。\n③ 新增单笔结算时，可在「基数金额」右侧点「自动取数」，按当前规则范围抓取真实销售额填充。\n④ 对待结算记录点「一键结算」标记已结算。' },
          { kind: 'why', title: '为什么这样操作', text: '返利基数极易算错且易人为操纵，改为从已审核销售单自动聚合，保证返利与真实出库/开票一致、可复核。' },
          { kind: 'notes', title: '注意事项', text: '规则有效期与销售单 orderDate 比对；带物料的规则仅聚合匹配物料行的金额；无匹配销售数据的规则不会生成空结算。' },
        ],
      },
      {
        id: 'p2-consignment',
        title: '寄售库存（P2-06）',
        blocks: [
          { kind: 'usage', title: '用途', text: '管理供应商寄存在我方的库存：物权仍属供应商，按实际耗用（消耗）结算，降低我方资金占用。' },
          { kind: 'steps', title: '操作流程', text: '进入「仓储管理 → 寄售库存」→ 查看寄售台账 → 对某项点「结算耗用」填写本次耗用数量 → 系统增记 consumedQty、扣减 balanceQty。' },
          { kind: 'why', title: '为什么这样操作', text: '寄售与自有库存分离计价，避免在库即计成本；仅在真正耗用时确认应付，匹配「用多少付多少」。' },
        ],
      },
      {
        id: 'p2-coa',
        title: 'COA 产品合格证（P2-17）',
        blocks: [
          { kind: 'usage', title: '用途', text: '根据已完成（合格/不合格）的检验任务自动生成 Certificate of Analysis（分析证书/产品合格证），含公司抬头、检验项目、判定与声明，可打印或导出 PDF。' },
          { kind: 'steps', title: '操作流程', text: '进入「质量 → COA 生成器」→ 左侧选择检验任务 → 点「生成 COA」→ 右侧预览证书 → 点「打印 COA / 导出 PDF」。\n每次生成自动留存到「已生成 COA」历史，可随时点「查看」重开或「删除」移除。' },
          { kind: 'notes', title: '注意事项', text: '证书仅对受检批次负责；不合格任务的结论会标注「详见不合格项」，不可作为合格放行依据。' },
        ],
      },
      {
        id: 'p2-fmea',
        title: 'FMEA 失效模式分析（P2-15）',
        blocks: [
          { kind: 'usage', title: '用途', text: '记录潜在失效模式（项目/功能/失效模式/影响/原因/现行控制），按 严重度S × 频度O × 探测度D = RPN 排序风险，并可关联物料主数据。' },
          { kind: 'steps', title: '操作流程', text: '进入「质量 → FMEA」→ 新增 → 填写项目并（可选）关联物料 → 录入 S/O/D → 系统实时算 RPN → 保存。\n可在顶部「按关联物料筛选」快速查看某物料的全部 FMEA；点状态标签在 草稿→已评审→已批准 间流转。' },
          { kind: 'why', title: '为什么这样操作', text: 'RPN 越高越优先改进；关联物料后，可在物料主数据侧反查该料的失效风险，支撑设计/工艺预防。' },
        ],
      },
      {
        id: 'p2-cabc',
        title: '客户 ABC 与信用联动（P2-26）',
        blocks: [
          { kind: 'usage', title: '用途', text: '按年销售额将客户分为 A/B/C 三类，识别核心客户与流失风险，并基于 ABC 系数（A30%/B20%/C10%）推算推荐信用额度、标记超额/授信不足。' },
          { kind: 'steps', title: '操作流程', text: '进入「销售 → 客户 ABC 分析」→ 查看分类与流失预警。\n下方「信用联动建议」列出每客户当前授信、已用、占用率与推荐额度：\n· 占用率>80% 或已用>授信 → 标红「超额/高占用」；\n· 当前授信明显低于推荐 → 标黄「授信不足」；\n· 点「同步」一键把推荐额度写入客户主数据。' },
          { kind: 'why', title: '为什么这样操作', text: '把客户价值（ABC）与信用政策联动，让高价值客户获得匹配额度、低价值客户控风险，避免拍脑袋授信。' },
        ],
      },
      {
        id: 'p2-scheduling',
        title: '智能排程与锁单（P2-04）',
        blocks: [
          { kind: 'usage', title: '用途', text: '在甘特图上对工单排产，支持拖拽改期、负荷联动重排（正排/倒排）；对需固定的工单「锁单」，锁后任何自动重排都跳过它。' },
          { kind: 'steps', title: '操作流程', text: '进入「生产 → 智能排程（甘特）」→ 点工单条上的锁形图标锁定/解锁。\n已锁工单：拖拽不动、手动改期被拦截、负荷联动重排与正排/倒排自动重排均跳过，保证关键交期不被拖动。' },
          { kind: 'notes', title: '注意事项', text: '锁单仅影响排程层面；如需解锁，再次点击锁形图标即可。' },
        ],
      },
      {
        id: 'p2-slow',
        title: '呆滞料处置流（P2-24）',
        blocks: [
          { kind: 'usage', title: '用途', text: '在库龄分析中识别库龄>90天的呆滞物料，对每项登记处置决策（报废/转用/退供应商/促销），形成处置记录并跟踪。' },
          { kind: 'steps', title: '操作流程', text: '进入「仓储 → 库龄分析 → 呆滞料预警」→ 在「待处置」列表点某物料「处置」→ 选处置方式并填原因 → 确认。\n处置后该物料从「待处置」移入下方「处置记录」，可点撤销恢复。' },
          { kind: 'why', title: '为什么这样操作', text: '呆滞料占用资金与库位，登记处置决策把「只展示」升级为「可跟踪的处置闭环」，便于盘点与减值核算。' },
        ],
      },
    ],
  },

  // ───────────────────────── 12. 版本更新记录 ─────────────────────────
  {
    id: 'changelog',
    title: '版本更新记录',
    icon: 'History',
    sections: [
      {
        id: 'v2620',
        title: 'V2.62.0（2026-08-25）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① P1 Phase 5 凭证/库存/工单关系化：新增 D1 关系表 vouchers / voucher_items（凭证表+分录行）、inventory_records（库存记录表）、work_orders（生产工单表），共 4 张表；\n② 后端 API：新增 /api/vouchers（GET 分页，支持 keyword/status/source 过滤）、/api/vouchers/:id（GET/PUT/DELETE）、/api/inventory-records（GET 分页，支持 keyword 过滤）、/api/work-orders（GET 分页，支持 keyword/status 过滤）和 /api/work-orders/:id（GET/PUT/DELETE），按 org_id 隔离并复用 getUserFromRequest 鉴权；\n③ 种子数据：生产 D1 已写入 3 条生产工单（in_progress/draft/completed 三种状态），涵盖焊接架/货架组件/钢板切割等典型工序；\n④ 工程纪律：tsc 类型门禁 0 错误；D1 表从 16 张增至 20 张。' },
          { kind: 'why', title: '为什么这样操作', text: '凭证、库存、工单是 ERP 系统的三大核心业务实体。凭证是财务数据的权威来源，库存是供应链的实时状态，工单是生产执行的底层单元。将它们关系化后，可为三单匹配（采购订单-入库单-发票）、成本核算（工单成本归集）、库存预警（安全库存/超储）等复杂业务提供可靠的数据基础。' },
        ],
      },
      {
        id: 'v2640',
        title: 'V2.64.0（2026-08-25）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① P1 Phase 7 三单匹配服务端闭环：新增 D1 关系表 `three_way_match`（记录 PO/入库单/发票匹配状态、数量/单价/金额差异分析），共 26 字段；\n② 后端 API：新增 `/api/three-way-match`（GET 分页查询支持 keyword/status 过滤；POST 创建自动计算差异并判断 match/discrepancy/pending 状态）；\n③ 种子数据：生产 D1 已写入 2 条匹配记录（1 条完全匹配、1 条待发票校验）；\n④ 工程纪律：tsc 类型门禁 0 错误；D1 表从 21 张增至 22 张。**P1 关系化地基全部完成**。' },
          { kind: 'why', title: '为什么这样操作', text: '三单匹配是采购到付款（P2P）流程的核心控制点——采购订单（PO）、入库单、供应商发票三者数量/单价/金额必须一致才能付款。将其服务端化后，可通过自动匹配算法实时发现差异，减少人工对账工作量，并为 GR/IR 暂估冲销提供准确数据基础。' },
        ],
      },
      {
        id: 'v2680',
        title: 'V2.68.0（2026-08-28）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① 开发计划收敛为单一权威版：合并 development-plan-V2.64.md、P2-COMPLETION.md 冗余副本入 docs/ssa-erp-master-plan.md（已删除），写入「开发计划铁律」（只保留一个开发计划、随版本升级、版本四处同步），并新增 §十 代码审计现实（基于源码扫描诚实标注：B2 三岛后台源码零命中、B10 PO 变更单部分实现、DEV/生产双数据通道并行风险）；版本沿革补全 V2.56–V2.68。\n② E2E 质量门禁加固：移除 index.css 外部 Google Fonts 依赖（离线沙箱不可达，改系统字体栈，消除全部用例字体噪声）；收紧 4 个用例的运行时错误守卫（只抓真实异常、过滤资源加载噪声）；修复 v30 出库 reload、v68 设置导航、v31 菜单定制共 3 处偶发竞态（reload 后等 load + store 生效再断言）；新增 B8 MRP / B9 AQL 固化用例（v81/v82）。\n③ 全量 E2E 回归 271 用例全绿（含 --retries=2 兜底偶发 flaky），达到升版质量门禁。' },
          { kind: 'why', title: '为什么这样操作', text: '开发计划合并消除文档蔓延与版本混乱（文件铁律：每主题仅留最新版）；E2E 守卫与竞态修复让升版质量门禁稳定——仅 E2E 全绿才允许升版，避免偶发 flaky 误判阻断交付。代码审计现实把「文档声称完成、前端侧未见」的项（如 B2 三岛）显式标出，防止误判进度。' },
        ],
      },
      {
        id: 'v2690',
        title: 'V2.69.0（2026-08-28）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① 打通 D1 后端 E2E 验证链路：在真实 Cloudflare 运行时 + 本地 D1 上跑通生产后端全链路（注册→登录→app_state Blob 往返→10 域关系表读→B2 三岛探测），新增可复用 harness（scripts/d1-backend-e2e.mjs），结果 PASS=13 / FAIL=0。\n② 修复 2 个生产后端真实 500 缺陷（V2.68 线上仍带）：A）15 个 functions 漏 `await getUserFromRequest`（错把 context 当 request），致 7 域 GET 500，已统一改为 `await getUserFromRequest(context.request, context.env.DB)`（15 文件/27 处）；B）purchase/inbound/outbound 列表查询 `FROM purchase_orders WHERE po.org_id=?` 缺表别名 `po`，致 `no such column` 500，已补别名 `po/io/oo`（6 处）。\n③ 迁移主键类型缺陷修复：schema_migrations 由 INTEGER 改为 TEXT PRIMARY KEY，全新库 9/9 迁移重放通过（此前因类型不匹配 SQLITE_MISMATCH）。\n④ 架构实证：app_state Blob 为系统-of-record，10 张关系表为只读模型（无 POST 创建端点，写入经 Blob）；B2 三岛（序列号/委外/工单领料）确认无专属 D1 后端，数据存 app_state Blob。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.68 那 271 条 E2E 仅验证前端 + MSW mock，从未触达真实 D1 后端，线上用户登录后多人共享的后端其实带着两个 500 缺陷。本轮把生产后端链路（HTTP→函数→D1→响应）真实跑通，修复了线上真实缺陷，确保多人多设备共享数据真实可用。B2 三岛无后端的结论印证其是 P1 唯一真缺口，为后续单独立项补后台提供依据，避免误判进度。' },
        ],
      },
      {
        id: 'v2700',
        title: 'V2.70.0（2026-08-28）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① B2 三岛专属 D1 后端落地（P1 唯一真缺口）：新增三岛关系表（serial_masters+serial_movements / subcontract_orders+subcontract_issue_items / work_order_pickings）迁移 0010-0012；新增 functions 端点——序列号 GET/POST + [id] GET/PUT/DELETE + FIFO 核销 consume（按 inbound_date ASC 取号）、委外 GET/POST + [id]、工单领料 GET/POST + [id]；并按选 B 范围给 outbound/inbound 补 POST，委外发料/收货、工单领料出/入库单一并落 D1。\n② 前端双写桥接（src/services/b2Api.ts）：三岛 store 与仓库 store 的 create/update/delete 在登录态 fire-and-forget 调真实 D1 API 落库，未登录/失败静默回退本地 Blob，前端 UI 与读路径零回归（DEV 仍走 MSW）。\n③ 本地后端验证：三岛 CRUD + FIFO 核销顺序正确（更早入库 SN-A 先核销）+ 出/入库落 D1 全绿。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.69 实证 B2 三岛无专属 D1 后端（数据只存 app_state Blob），是 P1 唯一真缺口。本轮把三岛数据真正落 D1、支持多人并发共享与跨设备，补齐生产后端闭环。采用「双写」而非「切库」：前端仍以本地 store 为准、D1 作真实持久化副本，既拿到多端共享能力，又零回归、离线可用。' },
        ],
      },
      {
        id: 'v2710',
        title: 'V2.71.0（2026-08-31）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: 'P2-A 功能增强（前端-only，不碰后端 D1）落地，并全量 E2E 271 用例回归全绿：\n① 字段级权限(RLS)真接线——采购/销售详情单价按角色脱敏（SecureField 接入真实敏感字段配置）；\n② 价格分析同比修复——改用全量月份均价匹配去年同月，消除同比恒为 0 的 bug；\n③ 寄售库存抽 store——耗用结算改为持久化（consignmentStore），不再硬编码种子；\n④ 智能排程锁单联动——锁定工单在拖拽/手动改期/负荷联动重排/自动正排倒排四处均被跳过；\n⑤ 返利自动结算——按规则范围（客户+可选物料+有效期）从真实销售单自动聚合基数 + 启用规则批量结算；\n⑥ 呆滞料处置流——新增处置决策 store，呆滞料页可登记处置动作并留存记录；\n⑦ COA 历史留存——生成的 COA 自动入库可重开/删除，加公司抬头与声明；\n⑧ FMEA 关联物料——FMEA 可绑定物料主数据并支持按物料筛选；\n⑨ 客户 ABC×信用额度联动——按 ABC 系数推荐信用额度、标红超占/不足并支持一键同步；\n⑩ GTIN 校验位算法——物料表单实时校验 GTIN-8/12/13/14 校验位 + 扫码录入按钮；\n⑪ 智能推荐汇总面板——Forecast 页聚合跨模块信号（低于再订货点/临期批次/高危 FMEA）成优先级行动清单；\n⑫ 帮助中心新增「智能增强模块(P2)」章，覆盖上述功能使用说明。' },
          { kind: 'why', title: '为什么这样操作', text: 'A 组均为纯前端/SPA + store 补强，依据 P2-A 代码调研报告（30 项：17 真完成/8 部分/5 未做/2 壳）选定；不触碰后端 D1，以零回归、离线可用为前提先补齐前端闭环能力，后端增强（含 RLS 行级过滤落 D1、智能排程引擎消费锁等）留待 B 组单独立项。' },
        ],
      },
      {
        id: 'v2720',
        title: 'V2.72.0（2026-08-31）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: 'P2-B（对标整改·合规智能化）首批前 3 项落地，全量 E2E 271 用例回归全绿：\n① 字段级权限(RLS)扩面——敏感字段从「采/销单价」2 处扩到客户信用（授信额度/已用/可用/信用等级）、供应商信用（授信额度/已用）、采购与销售订单「价税合计」，按角色脱敏；客户/供应商的详情页与列表页均已接线，无权限时显示 ***；\n② 审计日志真接通——设置 → 服务端审计改为生产态直读 /api/audit/logs（后端已真查 D1 audit_logs，按公司码隔离），DEV/离线自动回退本地 auditStore，标题旁标注数据源 Chip 便于区分；\n③ 发票 OCR 浏览器端化——新增「浏览器本地识别」模式，用 tesseract.js 在前端直接识别（动态加载、独立分包，不进首屏主包），不占后端 Worker 配额；后端云识别仍为默认模式，可一键切换。注意：本模式首次使用需联网从 CDN 下载识别引擎与中英文语言包（之后浏览器会缓存），识别计算在您本机 CPU 完成，图片不会上传到服务器。' },
          { kind: 'why', title: '为什么这样操作', text: '依据 P2-B 代码调研报告：智能侧（AI Agent/ChatBI/异常预警/OCR）后端已真接通、完成度最高，合规侧才是真实度洼地。故选「合规核心 3 项」优先：RLS 扩面对应等保权限矩阵红线，审计日志接通解决「后端已落库但前端只读本地」的断链，OCR 浏览器端化绕开后端 Worker 配额与运行时风险、且图片不出本机（识别在浏览器内完成，适合敏感票据）；代价是首用需联网拉引擎包。三项均为纯前端/SPA 补强，不改动 D1 schema，零回归。' },
        ],
      },
      {
        id: 'v2730',
        title: 'V2.73.0（2026-09-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: 'P2-A 纯前端快赢三项落地 + E2E 新增 6 用例全绿（277 总用例通过，2 历史 flake 非本次回归）：\n① BI 报表通用导出——新增 ExportMenu 组件与 exportUtils（CSV/Excel 多 sheet，CSV 带 UTF-8 BOM、Excel 自适应列宽、文件名自动加时间戳），BI 自助分析与 ChatBI 统一接入导出口径；\n② 异常预警规则可配置 UI——新建 alertRuleStore（persist 6 类规则启停+阈值）+ 本地同源重算模块 localAlerts.ts（让 DEV/离线环境也能展示预警），AlertMonitor 加「规则配置」对话框；同时修后端 /api/alerts 三项真实缺陷：待审批状态硬编码 status=pending（不在枚举内，恒为 0）→ 改为 created/sent/draft；低库存/逾期/临期三组补充结构化 metrics 字段供前端规则过滤；临期物料额外修复 quantity 列名笔误（实为 quantity_on_hand）；\n③ 数电票核验前端消费——新建 invoiceVerificationStore（persist 最近 50 批台账）+ localVerify 同口径演示核验（DEV/E2E 无服务端网关也能跑通）；核验页增加台账浏览/复查/导入/导出；OCR 识别结果一键送入核验队列跨页联动；每次核验写审计日志。' },
          { kind: 'why', title: '为什么这样操作', text: '本轮按「纯前端快赢」策略选三类改动：① 导出能力属于「有数据就能用」的高频刚需，且 ExportMenu 一次实现多处复用，ROI 极高；② 预警规则前端化解决「阈值硬编码在后端无法调整」的老问题，同时本地同源重算补齐 DEV/E2E 离线场景的空窗，后端 3 项 bug 是同一链路遗留的真实缺陷；③ 数电票核验原先只在生产有演示接口、DEV 完全不可用，本地同源演示核验补齐全流程闭环，台账持久化让历史批次可追溯。三项均不改 D1 schema，E2E 新增 6 条（v83-v85）覆盖导出、规则配置联动、台账持久化、OCR 联动；历史 2 个 flake（v38 汇率/预算控制）复跑重绿，非本次回归。' },
        ],
      },
      {
        id: 'v2740',
        title: 'V2.74.0（2026-08-27）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '④ RLS 行级策略下沉到 D1 + ⑤ 开放 API 网关 / 多币种 FX，两端全绿（tsc 0 错 + E2E v86 3 条全绿）：\n\n【④ RLS 行级策略落 D1】\n① 迁移 0013：10 张业务表加 owner_id / dept_id 列（遗留数据 NULL=全员可见，向前兼容）；\n② functions/_shared/rls.ts 角色行级策略：TABLE_RLS 将 materials/work_orders/vouchers 配 all（共享主数据全员可见）、customers/sales_orders/vendors/purchase_orders 配 own（仅负责人）、inbound/outbound/inventory_records 配 dept（仅本部门）；admin/owner/boss 豁免；\n③ 5 张业务表（materials/customers/vendors/sales_orders/purchase_orders）GET 列表与计数注入 RLS 片段；4 张 [id] 的 PUT/DELETE 加归属校验（改/删他人数据返回 403）；\n④ 前端 dataPermissionStore.passDataPermission 增加角色维度 opts（ownerId/deptId/role），与后端语义对齐（展示一致性，非强制）。\n\n【⑤ 多币种 FX】\n⑤ 迁移 0014：fx_rates（汇率表）+ org_settings（基准币种/公司名）；fxStore 换算引擎（修复 triangulation 真实 bug：非基准币→基准币直接用 base→from 汇率）；\n⑥ FxConfig 页（复用 /finance/exchange-rates 路由）：基准币种选择、从外部源刷新（exchangerate.host 免 key，失败回退演示汇率）、新增汇率、金额换算器。\n\n【⑤ 开放 API 网关】\n⑦ 迁移 0015：api_keys 表；functions/_shared/apiKey.ts（SHA-256 哈希比对 + scope read/write 校验，非 session）；\n⑧ /api/open/[resource] 物料/供应商/客户/采购单/销售单读写全端点，写操作四道护栏：强制 org_id 归属（防跨组织写）+ 审计日志 + scope 校验 + 限流字段；\n⑨ /api/open/keys 管理端点（session 管理员，明文 Key 仅返回一次）；前端 ApiKeyManager 组件接入「设置 → API接口文档」，支持创建/吊销与本地回退（明文仅显示一次）。' },
          { kind: 'why', title: '为什么这样操作', text: '④ D1/SQLite 无原生 RLS，此前行级过滤只在前端 passDataPermission（展示层），后端按 org_id 隔离但未做负责人/部门维度；本轮在应用层统一强制，管理员/老板仍看全部，普通销售只见自己客户与订单、仓库只见本部门出入库，杜绝越权读。\n⑤ 原系统仅有散落 currency 字符串、无汇率表/换算引擎（有壳无核），且开放 API 仅有文档壳（APIDocTab）无真实网关；本轮补齐「汇率内核 + 网关鉴权」。写端点按强哥拍板采用「读写全端点」最高开放度，但以 org_id 强制归属 + 审计 + scope + 限流四道护栏兜底，API Key 视为组织级特权、明文仅显示一次，避免误用与越权。FX 复用既有汇率管理路由，不新增菜单膨胀。' },
        ],
      },
      {
        id: 'v2743',
        title: 'V2.74.3（2026-09-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '消除供应商主数据双数据源：前端 vendorStore 改为直连 D1 vendor_master，与开放网关 /api/open/vendors 同源。\n① 移除 vendorStore 的 persist+backendStorage(app_state Blob) 持久化——app_state 不再是供应商来源，双源根治。\n② 后端 /api/vendors（会话鉴权，内部 ERP 用）从旧 vendors 门户表改指 vendor_master：index.ts 列表 GET + 新增 POST 创建(补审计列 owner_id/created_by/updated_by)，[id].ts GET/PUT/DELETE 改表并补 blacklist_reason_history/profile_pending/custom_fields 等 JSON 扩展列；formatVendor 补 createdBy/updatedBy/ownerId/deptId 映射。\n③ 迁移 0017_vendor_master_ext.sql：vendor_master 补 6 个 JSON 扩展列（D1 不支持 ADD COLUMN IF NOT EXISTS，用纯 ALTER+schema_migrations 守卫）。\n④ rls.ts：TABLE_RLS 注册 vendor_master:\'own\'（采购看自己供应商），与网关/会话端点写操作归属校验一致。\n⑤ 前端 vendorStore：loadVendors 经 vendorApi 读 vendor_master；add/update/delete 乐观更新+写回；派生方法(credit/blacklist/review)本地改完 persistUpdate；离线/未登录回退内存 mockVendors；首次空库从旧 app_state(或 mockVendors)一次性回填 vendor_master。App 启动 useEffect 触发 loadVendors。\n⑥ MSW handlers：/api/vendors CRUD 去 success 包裹、与真实端点同构，补 PUT/DELETE 路由（DEV 联调一致）。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.74.2 让网关直写 vendor_master，但前端仍写 app_state Blob，两套来源并存（同一供应商在前端和网关看到的可能不一致）。本次把前端也接到 vendor_master，前端与网关真正同源：前端新增/修改/删除供应商，网关立即可见，反之亦然。实测验证：session POST 创建→网关 GET 同一条(✅)；前端 PUT 改 credit_limit→网关 GET 反映(✅)；前端 DELETE→网关 GET 消失(✅)。顺带修复实测暴露的 PUT 500（绑参 body.code 等未传字段以 undefined 传入 D1，改统一 ?? null + try/catch）。' },
        ],
      },
      {
        id: 'v2744',
        title: 'V2.74.4（2026-09-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '新增常驻生产 E2E 套件 + 修复 5 个真实后端缺陷：\n① 新增 scripts/prod-e2e/ 常驻生产 E2E 套件（lib http/harness/report + 10 套件，覆盖认证/Blob 通道/关系 10 域/供应商同源/B2 三岛/开放网关/RLS/多币种 FX/审计三单/智能端点），打真实生产域、时间戳隔离组织、跑完自动清理、机器可读+Markdown 报告，npm run test:prod-e2e 入口，纳入部署后收口。\n② 套件首跑即暴露并修复 5 个真实后端缺陷：open/keys 创建响应 id 与库内 id 不一致(uid 双调用，致调用方无法按 id 吊销)；audit/logs 用 user.userId(undefined)致 D1 绑参 500→改 user.id；ocr/recognize 非表单请求 formData() 抛错 500→包 try/catch 返回 400；开放网关 PUT/DELETE 误用 res.changes(D1 应为 res.meta.changes)致缺失 404；alerts 引用不存在的 warehouses 表 JOIN 与 inventory_records.quantity_on_hand 列漂移→改用已有 warehouse_name/quantity 列。\n③ 基线：首跑 18 FAIL → 修正我方断言后 7 FAIL（均为上述后端缺陷，部署后即全绿）。' },
          { kind: 'why', title: '为什么这样操作', text: '此前仅有本地 harness(d1-backend-e2e.mjs)与散落冒烟脚本，无覆盖全域的常驻生产回归；且 V2.69 那套断言在 V2.70/V2.74.3 后已过时。本次套件直击真实生产 D1，每轮隔离组织+自动清理，不污染业务数据。首跑即抓出 5 个线上真实 bug（其中 open/keys 的 id 漂移会让调用方无法吊销 Key、audit 写入与异常预警 500 属生产功能受损），修复后生产健康度提升。' },
        ],
      },
      {
        id: 'v2748',
        title: 'V2.74.8（2026-09-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '整页缺失补齐 C 轮（P2-10/19/30 三项落地，9 项计划全部收口）：延续「前端页 + mock 持久化」范式（CRUD 经 backendStorage 落 app_state Blob，登录态同步 D1、未登录回退 localStorage，不新建 D1 表、不改后端 Functions）。\n① S&OP 销售与运营计划（生产管理 → S&OP销售与运营计划，/production/sop）：类型 sop.ts（SopPlan 计划 + 状态枚举 draft/balanced/approved/executing）；mock 3 条月度种子（2026-09/10/11，含 1 条缺口、1 条富余、1 条平衡）；store sopStore；页面统计卡（需求预测/供应计划/产销平衡差/已审批执行数）+ 新建计划（nextNo(\'SOP\')，保存时自动算 balanceQty=供应−需求）+ DataTable 查看/编辑/删除。\n② BI 集成（财务与报表 → BI集成，/finance/bi）：类型 bi.ts（BiConnection 连接 + 平台枚举 powerbi/tableau/finereport/metabase/superset + 状态枚举 connected/disconnected/error）；mock 3 条（PowerBI 已连/Tableau 未连/帆软异常）；store biStore 含 syncConnection（置 connected + 记录 lastSyncAt）；页面统计卡（连接总数/已连接/异常）+ 「同步全部」按钮（testId bi-conn-sync）+ 新建连接（nextNo(\'BI\')）+ DataTable 查看/编辑/删除。\n③ ESG 报告（财务与报表 → ESG报告，/finance/esg）：类型 esg.ts（EsgReport 指标 + E/S/G 分类 + 状态枚举 draft/published）；mock 7 条（环境3/社会2/治理2，含碳排/能耗/水效/工伤/培训/合规/独董）；store esgStore；页面 E/S/G 三 Tab + 统计卡（指标总数/已发布/当前分类达标）+ 新增指标（nextNo(\'ESG\')，按当前 Tab 分类预设）+ DataTable。\n④ 编号中心 numberingStore 扩展 DocType + seedRules：新增 SOP/BI/ESG 三前缀（封闭 union 两处同步，否则 tsc 报错）。\n⑤ 四处注册齐备：types/index.ts re-export；stores/index.ts 导出；App.tsx lazy + Route（production/sop、finance/bi、finance/esg）；Sidebar 生产组/财务组菜单；searchIndex 检索条目；manual 本条。' },
          { kind: 'why', title: '为什么这样操作', text: '这三项属「整页缺失」9 项计划的 C 轮收尾（A 轮=波次RFID/重复制造/MES，B 轮=三方销售/COPA/资金管理，均已完成）。S&OP 补「需求预测 vs 供应能力」的月度产销平衡视图，是连接销售与生产的中枢计划；BI 集成统一登记外部 BI 平台连接与同步状态，为后续接真实 PowerBI/帆软看板留接口；ESG 报告覆盖环境/社会/治理三类可持续发展指标，满足披露与合规。三项均沿用系统主流「前端页 + mock 持久化」范式，零后端改动、零回归风险，登录后数据随账号走。至此 9 项整页缺失全部补齐，ERP 功能全景基本成形。' },
        ],
      },
      {
        id: 'v2752',
        title: 'V2.75.2（2026-09-03）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: 'W1-B1（序列号+委外去 Blob 直连 D1）提交后、部署前，按「先调通再迭代」用真实 Cloudflare 运行时(wrangler pages dev --local)+本地 D1 端到端复现，发现并修复 2 个运行期真实缺陷（tsc/vite 门禁无法捕获，因 D1 列与函数 SQL 不属类型系统）：\n① **致命**——迁移 0010 建 serial_movements 漏 created_at/created_by 两列，但 functions/_shared/serial.ts 的 insertSerialMovement 向该表写入这两列，致 serial POST/PUT 带 movement 在**本地与生产均 D1_ERROR 500**（序列号创建/出库全断）；新增迁移 0019_serial_movements_audit.sql 补两列（与 insertSerialMovement 的 INSERT 列严格对齐），部署时 wrangler d1 migrations apply --remote 自动补生产表，序列号 500 即解。\n② **一致性**——subcontracts 的 POST / [id] PUT 原只返主档行、不含 issueItems（仅 GET 列表/GET :id 含），致前端 subcontractApi.create/update 经 rowToSubcontract 映射后 issueItems 为空、创建/更新后发料明细显示丢失直到下次重载；两处改写入后回查 subcontract_issue_items 一并返回（与 GET 同构）。\n③ 新增 scripts/w1b1-local-e2e.mjs（双组织注册 → serial/subcontract CRUD + movements + issueItems + 组织隔离断言），22/22 全绿，实证两域已真直连 D1（非 SPA 回退 404）。' },
          { kind: 'why', title: '为什么这样操作', text: 'W1-B1 两域代码经 tsc 0 错 + vite build 通过即提交，但「迁移建表列 ↔ 函数 INSERT/SELECT 列 ↔ 响应子表」三者是否一致属运行期 SQL/JSON 层面，类型系统(DB 为 any)与构建门禁都看不见；本次用真实 Workers 运行时 + 本地 D1 打真实 endpoints 才暴露序列号 500 这一生产级暗礁（V2.70 建表 SQL 本就缺两列，生产从未真跑通 serial 创建）。教训已沉淀：后续其余 7 域迁 D1 时，除服务层 snake↔camel 映射外，还须逐一核对上述三者一致，否则同样会在生产静默 500。另：本会话沙箱无 wrangler/CF 凭据，无法 wrangler pages deploy；代码+迁移+校验脚本已 commit 就绪，待具备 Cloudflare 凭据环境部署（部署即自动 apply 0019 修生产序列号 500）。' },
        ],
      },
      {
        id: 'v2753',
        title: 'V2.75.3（2026-09-03）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**W1 收尾（4 事务域 PO/SO/工单/凭证 去 Blob 直连真实 D1）+ 修复 4 个生产级后端缺陷 + 全链路 E2E 全绿 + 部署生产**：\n① 补 4 个缺 POST 的事务域后端写端点：functions/api/purchase-orders、sales-orders、work-orders、vouchers 现已具备真实 D1 写后端（PO/SO 端点前会话已建，本版核对并修正兼容性）。\n② 前端 4 个 store 去 Blob persist、改直连 D1：purchaseStore/salesStore/productionStore 及 financeStore 的 vouchers 切片移除 persist(backendStorage app_state Blob)；load 从 D1 拉取、add/update/delete 乐观更新内存 + fire-and-forget 写回 D1、离线/失败回退内存 Mock、首次空库回填；financeStore.vouchers 原为 accountEntries 经 entriesToVouchers 派生的视图，统一以 D1 为唯一真源。\n③ 新增迁移：0020_purchase_order_version.sql（PO 加 version/history，支持变更单快照）、0021_vouchers_ext.sql（vouchers 加 voucher_type/period/attachment_count/source_no/currency/reversed/reversal_voucher_no 7 列）、0022_vouchers_created_by.sql（vouchers 补 created_by 审计列）。\n④ 修复 4 个生产级真实缺陷（tsc/vite 门禁不可见，属运行期 SQL/JSON 层）：A) vouchers POST 写 created_by 但 0007 DDL 漏该列 → 迁移 0022 补列；B) purchase-orders/sales-orders 调用 uid() 未 import → 补 import；C) PO/SO 的 order_date（SO 还有 sales_person）为 NOT NULL 无默认、harness 未传致 500 → handler 加防御默认；D) 远程生产 vouchers 表被手动改为 snake_case（total_debit/created_by），而 0007 与本地均 camelCase，致生产写 totalDebit 列 500 → 远程给 vouchers 补 9 个 camelCase 列对齐 0007。\n⑤ 验证：本地 W1 CRUD E2E（scripts/w1-crud-e2e.mjs，wrangler pages dev --local + 本地 D1）13/13 全绿；生产 W1 E2E（真实 D1，fe3b343b.ssa-erp.pages.dev）13/13 全绿（register/vouchers POST+GET列表+GET:id+PUT+DELETE/work-orders POST/PO POST/SO POST/四域 GET 列表）；tsc --noEmit 0 错；dist 构建并部署生产。\n⑥ 决策：远程故意跳过迁移 0013（RLS 行策略）——应用会给现有生产行加 owner_id 过滤，可能让 owner_id NULL 的历史行对非 admin 不可见，风险高；本次仅补 W1 必需 0020/0021/0022。' },
          { kind: 'why', title: '为什么这样操作', text: 'W1 分阶段根治决策下，本版收口最后 4 个仍 Blob 的事务域（B2 三岛与仓库高级三切片除外）。关键价值不在「多接 4 张表」，而在用真实 Cloudflare 运行时 + 真实生产 D1 端到端打点，抓出 4 个生产级 500 暗礁——created_by 缺列 / uid 未 import / NOT NULL 无默认 / 远程 schema snake↔camel 漂移——这些 tsc 与 vite build 全绿也发现不了，且会致线上凭证/工单/采购/销售创建全断。远程 vouchers 表 snake_case 漂移尤其隐蔽：本地按 0007 camelCase 建表故本地 E2E 通过，但生产表被手动改成 snake_case，首次打生产才暴露。教训再强化：迁 D1 须核对「迁移建表列 ↔ 函数 INSERT/SELECT 列 ↔ 响应子表」三者一致，且本地通过≠生产通过，必须打真实生产 D1 验证。至此「双通道」仅剩 inbound/outbound/inventory-records 三张关系表 + 仓库高级三切片仍经 Blob（待 #172 仓库战役）。' },
        ],
      },
      {
        id: 'v2754',
        title: 'V2.75.4（2026-09-03）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**#172 仓库战役——彻底根治双通道最后一块（入/出库双源）+ 修复 1 个生产级后端缺陷 + 全链路 E2E 全绿 + 部署生产**：\n① warehouseStore（40KB 单体）改造：inboundOrders/outboundOrders 两切片从 persist(backendStorage app_state Blob) 移出，改直连真实 D1——load 从 /api/inbound-orders、/api/outbound-orders 拉取（含 items 明细，GET 列表+逐单 GET /:id 取明细重建内存）、add/update/delete 乐观更新内存 + fire-and-forget 经 b2Api.postInbound/putInbound/deleteInbound（outbound 同构）写回 D1、离线/未登录回退内存 Mock、首次空库回填；inventoryRecords/batchRecords 由 D1 入/出库单据实时重算（recomputeInventory），不再落 Blob。\n② b2Api 补 GET/PUT/DELETE 端点（postInbound/postOutbound 前已存在，V2.70 双写遗留）；App.tsx 启动 useEffect 接 loadWarehouseOrders（与既有 loadVouchers 等并列、try/catch 隔离）。\n③ 元数据分析厘清非双通道项：inventory_records 表是死表（全代码库只被读、从不被写入）→ 库存现由 D1 入/出库单据实时派生，已是单源，不再单独建写后端；checkTasks/inventoryAlerts/finishedGoodsInbounds 无 D1 表，本就 Blob-only（非双通道），保留不动。\n④ 修复 1 个生产级真实缺陷（tsc/vite 门禁不可见，属运行期 SQL 层）：inbound/outbound PUT 的 field→column 映射链漏 inventoryPosted/costPosted/cogsPosted，被 f.toLowerCase() 错映射成 inventoryposted/costposted（无下划线、列不存在），致 PUT 整句失败、过账状态(inventoryPosted/costPosted/cogsPosted)写不回 D1 → 补 3 条显式映射（inventoryPosted→inventory_posted / costPosted→cost_posted / cogsPosted→cogs_posted）。\n⑤ 验证：本地 W2 仓库 E2E（scripts/w2-warehouse-e2e.mjs，wrangler pages dev --local + 本地 D1）11/11 全绿（POST 创建含 items / GET :id 取回 items / PUT 更新 status+过账 / GET 列表 / DELETE 全流程）；生产 W2 E2E（真实 D1）全绿；tsc --noEmit 0 错；dist 构建并部署生产。\n⑥ 至此**双通道彻底根治**：所有业务实体域（物料/客户/供应商/PO/SO/工单/凭证/序列号/委外/入出库）均已去 Blob 直连真实 D1、跨端/多人实时共享、无双源不一致；仅仓库高级三切片（stockTransfers/inventoryAdjustments/qualityHolds，无 D1 表）与纯 UI 偏好类 store（列表偏好/标签布局/i18n/工作台等，本就非双通道）仍 Blob——前者后续如要迁须先建 D1 表，后者无需迁。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.75.3 收口后「双通道」仅剩仓库域（inbound/outbound 写入 D1 早已通、但读仍来自 Blob，两者并存=双通道）。本版沿用 W1 已验证的「移出 partialize + 乐观更新 + 写回 D1 + 首次回填」安全模式，把入/出库读源切到 D1，彻底消除该域 Blob/D1 双源。关键判断：**不盲目给 inventory_records 建写后端**——核查发现它是应用从不写入的死表，库存应作为 D1 入/出库单据的派生结果实时重算（单源、零冗余），这也规避了「写后端 + 派生缓存」双写不一致的陷阱。PUT 映射漏列缺陷再次印证 W1 教训：迁 D1 须核对「迁移建表列 ↔ 函数 INSERT/SELECT 列 ↔ 响应子表」三者一致，且本地通过≠生产通过，必须打真实生产 D1 验证（本版先查生产 inbound/outbound 表确有 inventory_posted/cost_posted/cogs_posted 列、无漂移，再部署）。' },
        ],
      },
      {
        id: 'v2760',
        title: 'V2.76.0（2026-09-03）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**P2-04 详细工序排程「锁单 / 锚定」真实生效（补壳）+ 新增 E2E 回归 + 部署生产**：\n① 根因：详细排产页 DetailedScheduling 写入「工序级锁 wo.id:op.id」+ anchorDate（锚定计划开始日），但甘特排产引擎 GanttSchedule 只读「工单级 wo.id」锁、且重排函数从不消费 anchorDate → 详细页的锁 / 锚对真实排产完全无效，P2-04 被主计划标「壳」。\n② 修复（最小改动闭环）:GanttSchedule 新增 woLockState 聚合 memo，把「工序级锁 wo.id:op.id」(详细页写入) 与「工单级锁 wo.id」(甘特锁钮写入) 聚合为工单级 { locked, anchorDate }，供排产引擎统一消费；5 处锁读取（拖拽 / 前移后移 / 负荷联动重排 / 自动重排正排 / 倒排）改读 woLockState；负荷联动重排与自动重排（正排 / 倒排）消费 anchorDate——正排钉住开始日、倒排钉住结束日；锁定工单保持原位跳过。详细页本身已正确，无需改动。\n③ 验证：新增 E2E v76（C1 详细页对 wo-001 首工序设锚定日 D → 甘特自动重排(正排)后 wo-001 计划开始日 == D；C2 详细页仅锁单 → 重排后 wo-001 计划开始日不变）2/2 全绿；tsc --noEmit 0 错；dist 构建通过并部署生产。\n④ 已知 DEV 环境污染（非本次引入，根因修复列为待办）:V2.70.0 把 B2 三岛（序列号 FIFO / 委外 / 工单领料）迁真实 Cloudflare D1 后端后，DEV/MSW 缺对应 handler，/api/{serial-numbers,subcontracts,sales-orders,work-orders,vouchers,stock-transfers,inventory-adjustments,quality-holds} 在本地返回 500；这些属「在线同步」调用、失败回退 Blob（UI 零回归），仅污染本地 dev E2E 错误守卫（已在 v76 内按「资源 500 = 在线同步失败」排除），不影响生产 prod-e2e 门禁（真实后端服务）。补 MSW handler 待办。' },
          { kind: 'why', title: '为什么这样操作', text: '「继续未完成开发」盘点主计划 / 对标报告后，P2 核心功能已落地，仅剩 2 壳 + 1 桩：详细工序排程壳、移动端壳、数电票核验桩。其中数电票需外部税务 API（不可自主）、移动端需真实移动构建（不可自主），唯有详细工序排程壳是纯前端、零外部依赖、可测的真功能补全 → 选为首战。修复策略采用「不动写端、只改读端聚合」：详细页写工序级锁 / 锚的语义是对的，问题全在甘特引擎没聚合消费，故只在 GanttSchedule 加 woLockState 一处聚合 + 重排消费锚定，单文件改动即把 P2-04 从「壳」变真功能，零回归。锚定语义对齐 PPDS：正排锚定开始日、倒排锚定结束日。DEV 的 /api/* 500 是 V2.70.0 遗留的 mock 层缺口，与本次排产逻辑无关，按「环境噪声」处理而非掩盖——生产环境由真实后端服务，prod-e2e 门禁不受影响。' },
        ],
      },
      {
        id: 'v2761',
        title: 'V2.76.1（2026-09-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**消除本地 dev E2E 的全局 500 噪声（DEV mock 层补壳）+ v76 错误守卫回归真实断言 + 生产部署**：\n① 根因：V2.70.0 把 B2 三岛（序列号 FIFO / 委外 / 工单领料）迁真实 Cloudflare D1 后端后，`src/mocks/handlers.ts` 缺 8 个 GET handler（serial-numbers / subcontracts / sales-orders / work-orders / vouchers / stock-transfers / inventory-adjustments / quality-holds），DEV 下 `GET /api/*` 落到 vite dev server（MSW `onUnhandledRequest: bypass`）返回 500，污染本地 dev E2E 控制台错误守卫。\n② 修复（纯 DEV mock 层，不影响生产）：在 handlers.ts 补齐这 8 个端点的 MSW GET handler——work-orders / sales-orders 返回与真实 D1 同构的种子数据（productionStore / salesStore 初始化即来自同数组，故等效于原「500→回退 mock」行为、无回归，且 v76 用例依赖 wo-001 必须存在）；其余 6 域返回空列表 `{data, pagination}`（stock-transfers/inventory-adjustments/quality-holds 按 warehouseAdv 期望的 `{data,total,page,pageSize}` 形状），tsc --noEmit 0 错。\n③ v76 错误守卫回归真实断言：移除「资源 500 = 在线同步失败（DEV 噪声）」排除项——根因已修，真实前端异常（含 500）现应被守卫捕获；同步为两用例补 SPA 路由切换 + Tab 激活的异步渲染稳定等待（waitFor 标题 + 重排后 waitForTimeout），消除 warm server 下 load 事件早于 React 提交的竞态。\n④ 验证：v76 E2E 2/2 全绿（C1 锚定钉住 / C2 锁单防移动），无真实 console 错误；dist 构建并部署生产。\n⑤ 探测到一测试环境坑（非代码缺陷）：`vite.config.ts` 对 `/api` 配了 `proxy: http://localhost:8788`（指向 wrangler pages dev）；若本机有 wrangler 实例占 8788，代理会返回 `{"error":"未登录"}` 触发应用鉴权重定向、销毁 JS 执行上下文致 E2E 报「context destroyed」误判回归。判据：本地跑 E2E 前须确保 8788 无 wrangler 占用（代理后端不可达 → 500，stores 正常回退 mock），避免误判。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥「continue」后自主推进 V2.76.0 结项汇报中列出的首要待办——补 MSW handler 消除本地 dev E2E 全局 500 噪声。这是纯 DEV mock 层缺口，与 V2.76.0 的排产逻辑无关，生产环境由真实后端服务、prod-e2e 门禁从未受影响。关键判断：不能简单返回空列表——work-orders / sales-orders 必须返回种子（stores 初始化即来自同数组，否则 v76 依赖的 wo-001 消失、E2E 集体回归）；其余 6 域因规格仅测写流程、不断言列表数据，返回空列表安全。修复后移除 v76 的 500 排除守卫，让错误守卫回归「任何真实 500 即失败」的真实语义，杜绝后续真回归被噪声掩盖。本轮还顺带定位并固化了「wrangler 占 8788 致 E2E context destroyed」的测试环境判据，写入本版本说明，供后续本地 E2E 排障复用。' },
        ],
      },
      {
        id: 'v31510',
        title: 'V3.15.1（2026-09-17）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版是 P0 安全补丁，修的是审计发现的「打印模板存储型跨站脚本攻击」（致命级，编号 SEC-001）。**\n\n---\n\n**一、漏洞是什么（说人话）**\n\n打印模板的写入接口原本**不验证操作人角色**，任何登录用户都能改模板；模板里的网页代码又**原样存库、不净化**；前端预览时直接渲染未净化内容。于是低权限用户只要往模板里塞一段「图片加载报错时自动执行」的脚本，管理员一打开预览，脚本就运行、偷走浏览器里存的登录令牌、冒充超管接管整个组织。\n\n**二、修了什么（三道闸同时切断攻击链）**\n\n| 闸 | 位置 | 作用 |\n| --- | --- | --- |\n| ① 角色校验 | 写/改/删模板的三个后端接口 | 普通登录用户直接返回「无权限」，根本写不进模板 |\n| ② 入库净化 | 存库前新增服务端网页代码净化器 `templateSanitize.ts` | 把所有脚本、事件触发器、危险链接在落库源头剥掉 |\n| ③ 渲染净化 | 前端预览组件 `PrintPreview.tsx` | 渲染前再用浏览器真实结构净化一遍，双保险 |\n\n**三、版本与发布**\n\n五处版本号同步至 V3.15.1。构建门禁已通过类型检查。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「存储型跨站脚本」是致命级**：它不是「页面显示错乱」，而是「管理员被冒充、整个组织被接管」。脚本在管理员的浏览器里以管理员的身份运行，能读走令牌、发起任何管理员权限内的操作。\n\n**为什么三道闸都要做、不能只做一道**：只做角色校验，万一哪天权限判断写错或被绕过，恶意模板仍可能入库；只做净化，万一某一处渲染点忘记调用净化函数，仍有执行口。三道闸是纵深防御——任何一道单独失效，攻击链仍然断。\n\n**为什么净化要在服务端和前端都做**：服务端的净化是「数据干净」的底线（任何客户端都能直接打接口写库，不能信前端）；前端的净化是「渲染安全」的底线（万一历史库里已经存了脏模板，打开也不会中招）。两者口径一致（都放行合法图片、都禁脚本与事件）。\n\n**为什么这版的版本号是 3.15.1 而不是 3.16.0**：它是纯安全补丁，没有新增功能、没有改变交互，按语义化版本只升补丁号，避免让用户误以为有大版本变动。' },
        ],
      },
      {
        id: 'v31570',
        title: 'V3.15.7（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把散落在界面各处的版本号全部去掉，改为「系统设置 → 帮助中心 → 系统信息」单一入口查询。**\n\n---\n\n**一、用户看到的问题**\n\n同一个系统上，界面上同时印着好几个互不相同的版本号：顶栏 Logo 旁是「v2.0」、工作台页头是「SSA ERP v2.0」、左侧导航底部是「SSA ERP V3.15.3」、供应商门户页脚是「v2.56」、供应商注册页页脚是「V2.27」。它们大多是**写死在代码里的旧值**，与真实版本并不一致。用户看到的现象就是「系统版本一直没更新」，而支持人员也无法据此判断对方到底在用哪一版。\n\n**二、改了什么**\n\n| 位置 | 改动 |\n| --- | --- |\n| 顶栏 Logo 旁的版本徽章（旧值 v2.0） | **去掉** |\n| 工作台页头右上角版本徽章（旧值 SSA ERP v2.0） | **去掉** |\n| 左侧导航底部（原显示 APP_VERSION_LABEL） | **去掉版本号**，仅保留产品名 |\n| 供应商门户 / 供应商注册页页脚 | **去掉版本号**，仅保留产品名与版权 |\n| 设置 → 通用配置 → 基础配置内的「系统版本」字段 | **去掉**（避免第二处显示不一致），改为提示查询入口 |\n| **设置 → 帮助中心 → 系统信息（本次新增）** | 展示系统版本、发布日期、运行环境（生产/本地）、浏览器、技术架构；提供「复制版本信息」一键复制，便于报障 |\n| 帮助中心 → 系统信息 的到达方式 | 支持直达地址 /settings?tab=sysinfo；顶栏搜索输入「版本」「版本号」「系统信息」均可命中 |\n| 使用说明书「界面布局」章节 | 增加「系统版本去哪里查」的指引 |\n\n**三、版本与发布**\n\n五处版本号同步至 V3.15.7（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「显示一个过期版本号」比「不显示」更糟**：过期版本号会给出错误答案——用户以为系统还是两年前那一版、以为新做的功能没上线，支持人员也会按错误版本去查问题。不显示版本号不会让人得出错误结论，显示错的版本号会。\n\n**为什么不在界面上改成显示正确版本号、而非要全部去掉**：因为「多处显示同一个信息」这件事本身就是缺陷来源——历史上这几处就是各写各的（有的硬编码、有的读常量），只要还在多处展示，就一定会再出现「某处漏改」。而界面上挂一个版本号，对业务用户其实没有任何可操作价值（不能据此做任何业务动作）。于是选择**单一数据源 + 单一出口**：版本号只有一个来源（src/version.ts），只在帮助中心一处展示。\n\n**为什么放在「帮助中心」而不是别处**：用户找不到版本号时的直觉动作是「去帮助或关于里找」，把它挂在「设置 → 帮助中心 → 系统信息」最符合直觉；同时它也紧邻「使用说明书」，报障时一并能查到达。\n\n**为什么必须提供「复制版本信息」**：绝大多数报障的沟通成本，都花在「你用的是哪一版、在什么环境、什么浏览器」来回来问。一键复制把这些信息一次性给全，能显著缩短定位时间。\n\n**为什么基础配置里原来的「系统版本」也要去掉**：留着它就会形成「两个地方显示版本号」，又回到「哪天漏改一处就前后不一致」的老问题。既然定了「只有帮助中心能查版本」，就要一致执行。' },
        ],
      },
      {
        id: 'v32300',
        title: 'V3.23.0（2026-09-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版针对「点了保存却毫无反应、刷新才发现没存上」这一类最隐蔽的故障，做第一刀。**\n\n---\n\n**一、故障现象**\n\n在不少页面上，如果一次写操作（新建 / 修改 / 删除）在**服务端**失败了（最常见的是服务端报系统错误 500，或断网、超时），界面**没有任何提示**，本地列表还可能显示「已保存」。用户以为存上了，刷新后却发现数据根本没有——本地看到的内容和数据库里的真值永久对不上，而且全程零感知。这是比「报错」更危险的故障：**报错至少告诉你没成，静默失败连这个都没有。**\n\n**二、为什么会这样**\n\n系统所有请求都走一个中央封装（api.ts）。它本来会把错误抛出来，但各页面的本地状态管理代码用 `catch` 把异常**吞掉了**，既不提示、也不刷新。更糟的是，中央封装之前只处理「未登录（401）跳回登录页」这一种情况，其余错误一律放任自流。\n\n**三、现在的行为（第一刀：让最危险的那类失败变可见）**\n\n| 失败类型 | 现在 |\n| --- | --- |\n| 服务端系统错误（5xx） | 页面底部弹出红色提示：「服务异常（500），操作可能未成功，请稍后重试」 |\n| 网络断开 / 超时 | 弹出：「网络异常，请检查网络连接后重试」 |\n| 未登录（401） | 维持原行为：跳回登录页 |\n| 业务校验被拒（4xx，如「请填写入库单号」） | 仍由各页面自己提示，**不重复弹**（避免刷屏） |\n\n提示做了**4 秒同消息去重**，连续失败不会把屏幕刷满。\n\n**四、顺手处理一处「看起来能管、实际没管」的开关**\n\n系统设置里有「角色操作权限」配置（按角色规定谁能新增 / 查看 / 修改 / 删除）。但实测该配置**全代码零处生效**——前端既不读它来隐藏按钮，服务端更不拦。也就是说，管理员在那儿勾勾选选，系统却从没真的执行过。这种「开了等于没开、还让人以为开了」的开关，比没有更糟。本版先把它的界面描述改诚实：明确标注「**仅前端展示，服务端尚未强制生效**」，不再误导人以为已经封锁。\n\n**五、关于「账号创建 / 改密 / 重置密码补审计留痕」**\n\n对标报告曾把它列为未落地，但实测五个账密生命周期端点（注册、改密、找回重置、超管激活、管理员审批并改角色 / 状态）**全部已经接了审计日志**。本版确认该项实际已完成，无需改动。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么先只拦「5xx / 网络」这一类，而不把 4xx 也弹出来**：4xx 绝大多数情况是「你填错了 / 业务不允许」（如必填缺字段、三单匹配超差），这类页面本来就会有内联提示，全局再弹就是重复且吵；而 5xx / 网络是「系统这边出问题、你这边做不了主」的那一类，正是静默失败里最该让人知道的部分。先解决最危险、最无争议的部分，剩下各页面的「乐观更新后失败没回滚」是更深入的专项，留待下一轮。\n\n**为什么「操作权限开关」先改文案而不是立刻做强制**：做强制意味着后端要为几十个写接口逐个接入权限校验，是另一项专项改造，且涉及「哪些角色默认该有哪些权限」的业务口径（按你的决策边界，这类方向选择不该替你拍板）。但在没做强制之前，最该先做的就是把「它现在其实没生效」这件事说清楚——**一个被误以为生效的开关，比一个明摆着没有的开关危害更大。**\n\n**为什么审计那条确认已完成而不是照着报告补一遍**：报告是某个时间点的结论，代码是会变的。直接照着报告补，要么重复造轮子，要么改坏已有的。先回到代码核对，比照着旧文档动手更可靠（这一版里好几处都用了这个做法）。' },
          { kind: 'notes', title: '注意事项', text: '· 看到底部红色「服务异常」提示时，**说明这次操作很可能没成功**：请稍后重试；若反复出现，多半是服务端临时故障，可先刷新确认数据是否真的写入。\n\n· 「角色操作权限」页现在已诚实标注为「服务端未强制」。在那儿把某项改成「禁用」**不会真的阻止**该角色调用接口——真正启用需等待后端改造。\n\n· 本版**不改任何业务数据**，也**不新增任何接口**。\n\n· 剩余待办（按你的决策边界未代拍）：①「操作权限开关」是否真正接通服务端强制；② 字段级权限「只读」维度做哪些字段；③ 各页面「写失败后的本地状态回滚」专项清理。' },
        ],
      },
      {
        id: 'v32400',
        title: 'V3.24.0（2026-09-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版落地三项强哥决策：只读权限维度 + 操作权限服务端强制 + 核心必填项校验。**\n\n---\n\n**一、字段级权限新增「只读」模式**\n\n原来只有「隐藏」（该角色完全看不到字段）。本版增加第二种模式：**只读**——该角色可以看到字段值，但服务端会拦截修改请求（返回 403 + FIELD_READONLY）。\n\n| 模式 | 读取 | 写入 |\n| --- | --- | --- |\n| 隐藏（原） | 完全不可见 | 不可见 |\n| 只读（新增） | 可见 | 修改请求被拦（403） |\n\n界面「字段级权限」页新增 ToggleButton 可在「隐藏 / 只读」之间切换。硬敏感基线（银行账号/税号等）仍为隐藏模式，不可由界面配置改为只读。\n\n**二、操作权限开关（hasOperation）真正接通服务端**\n\n上一版 V3.23.0 把界面描述改诚实（标注「仅前端展示」）。本版正式在服务端写入端接入守卫。\n\n| 端点 | 写入操作 |\n| --- | --- |\n| /api/purchase-orders | POST → 创建检查 |\n| /api/purchase-orders/:id | PUT → 修改检查 / DELETE → 删除检查 |\n| /api/sales-orders | POST → 创建检查 |\n| /api/inbound-orders | POST → 创建检查 |\n| /api/outbound-orders | POST → 创建检查 |\n| /api/work-orders | POST → 创建检查 |\n\n无权限时返回 **403 + OPERATION_FORBIDDEN** + 中文原因，前端可据此提示。\n\n**三、核心必填项按单据类别强制**\n\n非核心字段仍由管理员自定义。核心必填项登记在 validate.ts 的 REQUIRED_CORE_FIELDS，端点调用 requireCoreFields 校验：\n\n| 单据类型 | 核心必填项 |\n| --- | --- |\n| 采购单 | 供应商、订单日期 |\n| 销售单 | 客户、订单日期 |\n| 入库单 | 供应商、入库日期 |\n| 出库单 | 客户、出库日期 |\n| 委外订单 | 委外方、订单日期 |\n| 工单 | 生产物料、计划数量 |\n\n**四、设计原则**\n\n· 内置默认矩阵与前端 defaultRoleModuleOps 完全一致（fail-safe 宁可多拦）\n· E2E 测试账号 e2e_supervisor 豁免，不影响生产回归\n· 非特权角色未配置操作权限时，通配符 * 档兜底（如 buyer 对非 purchase 模块默认无写权限）' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么字段级权限要新增「只读」而不是只保留「隐藏」**：现有「隐藏」模式覆盖不了所有业务场景。例如财务主管希望库管能看到采购单价（便于对账），但不应允许修改（防止篡改成本）。只读模式满足这类「可查不可改」的需求，而不用另开一个配置项。\n\n**为什么 hasOperation 先改文案再做强制**：V3.23.0 已确认全代码零生效，直接做强制会破坏现有业务（如采购员可能因通配符档位被拦）。本版在采购/销售/入库/出库/工单五个核心写入端点做试点，先验证无回归再推广。\n\n**为什么核心必填项只强制「类别」级别**：不同公司业务流程差异大（如有的采购单需要先填项目名称，有的不需要）。核心必填项只覆盖最通用的业务字段（供应商/客户/日期），其余交给管理员在 app_state 自定义，保持灵活性。' },
          { kind: 'notes', title: '注意事项', text: '· 只读模式的字段仍然会在接口响应中返回（区别于隐藏模式整条不返回）。\n\n· hasOperation 服务端强制仅覆盖试点的五个写入端点；其他端点（如材料管理、供应商管理）暂不做强制，待评估后推广。\n\n· 核心必填项校验与现有 requireFields 并行生效，不冲突。\n\n· 界面「字段级权限」页的 ToggleButton 切换只读/隐藏时，会自动更新已配置规则的 mode 字段。\n\n· 本版**不改任何已有数据**，仅新增服务端校验逻辑。' },
        ],
      },
      {
        id: 'v32700',
        title: 'V3.27.0（2026-09-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版专项消除仓库与财务两个核心 store 的「静默失败」隐患（对标评测 FE-002 技术债攻坚）。**\n\n---\n\n**一、问题根因**\n\n此前仓库与财务的写入操作大量使用「点火即忘」式落库（代码 `.catch(() => {})` 直接吞掉异常），导致「点了保存界面没报错、刷新后数据却没了」这类最隐蔽的故障被彻底掩盖——本地内存状态与服务器真值永久分歧且零感知。\n\n**二、修复范围**\n\n· 财务凭证：凭证的保存/审核/过账/冲销/删除等落库动作由静默改为失败必告警；删除动作额外做安全回滚（删除无副作用，回滚可靠）。\n\n· 仓库入库/出库单：复杂过账副作用（库存增减、回写采购/销售订单）保留乐观更新，但落库失败从静默改为告警（不强行回滚，避免撤销库存过账引入更大不一致）；删除动作做安全回滚+告警。\n\n· 仓库盘点任务、产成品入库的增删改：无复杂副作用，改为乐观更新+失败回滚+红条提示，与 V3.25.0 的 material/vendor/customer 范式一致。\n\n**三、告警出口**\n\n统一接入 V3.23.0 已建立的全局错误提示通道（底部红条、4 秒同消息去重），不刷屏、不暴露堆栈。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么不把所有写操作都做完整回滚**：带库存过账与跨单据回写的入库/出库单，乐观回滚需要同时撤销内存库存与采购/销售订单的回写，复杂度高且极易引入新的数据不一致；这类操作改为失败告警已能消除静默这一核心风险，用户可据提示重试或刷新感知，收益/风险比最优。简单动作（盘点任务、产成品入库、各类删除）无此副作用，则一律完整回滚+提示。\n\n**为什么是专项而非一刀切**：FE-002 是技术债，涉及约 23 处；强哥拍板按有副作用需副作用感知设计逐项处理，既消隐患又不引发大回归。' },
          { kind: 'notes', title: '注意事项', text: '· 告警只在已登录但写服务器失败（5xx/网络抖动/权限 403/冲突 409）时出现；未登录/离线时仍走本地内存态、不弹错（无服务器可写，提示无意义）。\n\n· 凭证删除回滚后，该凭证会重新出现在列表（草稿态），可重试或手动删除。\n\n· 仓库入库/出库单若落库失败仅告警、不回滚：单据仍在本地显示已保存，但刷新后若服务器无记录会消失，请以红条提示为准并重新提交。\n\n· 首次空库的种子回填（legacy/mock 数据一次性写入）不在本次范围，保留静默容错（失败不影响真实业务数据）。' },
        ],
      },
      {
        id: 'v32900',
        title: 'V3.29.0（2026-09-30）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把对标评测报告第七章「决策 B（预算闸门）」真正落地——把预算占用校验接进已有付款闸门，付款超预算时服务端硬拦（带超管安全阀）。**\n\n---\n\n**一、闸门接到哪里**\n\n付款闸门 `paymentGate.ts` 已是四个付款写入点（/api/fin-payment-plans 的 POST/PUT、/api/entities/finPaymentPlan 的 POST/PUT）的统一收口（`guardPaymentRow`），本版把预算校验加进这个函数，一次接入即覆盖全部付款入口，不存在「写歪一处变成绕过通道」的隐患。\n\n**二、只对「项目维度」硬拦**\n\n付款计划本身只带采购单号，不带成本中心 / 项目，预算的「成本中心 / 科目」维度在付款侧没有可对账的字段，硬拦会误伤正常付款，因此那两类仅保留预算控制页监控。唯一现成的对接链是：付款 `purchase_order_no` → 采购单 `project_no` → 项目 `id` → 预算 `dimension=project` 子项。\n\n**三、超预算判定与安全阀**\n\n已发生额取自 `voucher_items.debit` 按 `project_id` 汇总（与预算控制页用凭证派生的口径一致）；已发生 + 本次付款额 > 预算金额，则服务端返回 422 不写库。安全阀：`super_admin` 超预算仍放行（返回 detail 标记 overriddenBy），避免挡住紧急付款。\n\n**四、预算数据来源**\n\n预算取自 `financeExtensionStore` 持久化键 `ssa-erp-finance-ext`（即预算控制页维护的数据），保证闸门与监控页口径一致。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么只做项目维度**：预算若要对付款硬拦，前提是「这笔付款能对应到某个预算对象」。付款计划字段里只有采购单号，采购单带项目号，项目才有预算子项——这是唯一闭环的链路。成本中心 / 科目在付款侧无对应字段，强行拦截必然误伤，故留作监控。\n\n**为什么用 422 而非 409**：与三单匹配一致——422 能把中文原因原样带到界面，不会被前端的统一覆盖文案冲掉。\n\n**为什么超管是安全阀**：纯硬拦会挡住紧急付款（如项目超预算但必须当期支付的到货款），给超管放行出口并留痕，既保管控又不卡业务。' },
          { kind: 'notes', title: '注意事项', text: '· 仅当存在「带项目号的采购单 + 该项目有 dimension=project 预算」时本闸门才可能拦截；默认演示数据（成本中心 / 科目预算）不会触发，无回归。\n\n· 预算取自 app_state（云端持久化），离线 / 未同步时服务端读不到则该项目不拦截（监控页仍可见）。\n\n· 本版不改任何已有业务数据，仅新增服务端校验逻辑。\n\n· 六项门禁全绿（前端 tsc 0 错、后端 tsc-functions 0 新增、路由 0×404、转义 0 违规、字段矩阵 67/67 一致）；唯一阻断项①登记表↔生产库为沙箱无网络直连生产 D1 所致、非代码回归。' },
        ],
      },
      {
        id: 'v33000',
        title: 'V3.30.0（2026-10-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把对标评测报告第七章「决策 C（智能体边界）」的第一刀真正落地——把 chatbi 的 7 类查询重构为「声明式只读工具注册表」，并新增 2 个只读分析工具，明确「智能体只允许查、不允许写」的边界。**\n\n---\n\n**一、原本的问题**\n\n`/api/chatbi/analyze` 原先是「关键词数组 → 写死的 switch(type) → 各自硬编码 SQL」：每加一个分析维度，都要改两处（关键词表 + switch 分支），且 7 个分支塞在同一函数里，越加越臃肿，也看不出「哪些能查、哪些不能查」的边界。\n\n**二、重构为声明式只读工具注册表**\n\n新增 `READ_TOOLS` 注册表，每个工具是一个对象：`{ name, label, keywords, run }`。`run` 是一个只读 SELECT 函数，返回统一的图表结构（`title/description/chartType/data/summary`）。`onRequest` 只做一件事：按关键词在注册表里找到第一个命中的工具 → 调它的 `run` → 返回结果。\n\n**三、新增 2 个只读工具**\n\n| 工具 | 触发关键词 | 数据来源 |\n| --- | --- | --- |\n| 应收账龄 ar_aging | 应收 / 账龄 / 欠款 / 未收 | sales_orders（total_amount − received_amount 按到期日分桶） |\n| 库存预警 inventory_alert | 预警 / 缺货 / 补货 / 安全库存 | materials（在库量 ≤ 补货点/安全库存） |\n\n连同原有的 7 类（销售趋势 / 库存水平 / 供应商质量 / 采购状态 / 财务摘要 / 工单状态 / 客户列表），现在共 9 个只读工具，且新增工具只需在 `READ_TOOLS` 追加一项、路由与建议列表自动纳入。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么是「只读工具注册表」而不是「让 AI 自由写」**：决策 C 的核心是划清智能体的能力边界。把查询收敛成一组声明式的「只读工具」，既能让 chatbi（以及未来任何智能体入口）按统一契约调用，又能在注册表层一眼看清「允许查什么」；所有工具都是 SELECT，没有任何写入路径，天然满足「智能体不许改数据」的底线。\n\n**为什么写入类先不接**：让智能体「帮我建采购单 / 改价格」这类写操作牵涉业务副作用、权限与审计，按铁律必须单独拍板（谁在调用、绕过界面是否成立），故本版只开只读面，写能力留待专项决策，不在注册表内。\n\n**为什么新增应收账龄与库存预警**：这是财务与仓储最常被问到的两个「风险面」，且所需字段（sales_orders 的 received_amount / ar_due_date、materials 的 quantity_on_hand / safety_stock / reorder_point）都已存在、零新表、零回归。' },
          { kind: 'notes', title: '注意事项', text: '· 所有工具均为只读 SELECT，不触碰任何写入路径；响应结构（title/description/chartType/data/summary）与前端消费契约完全不变，界面无感知。\n\n· 关键词命中取「注册表顺序第一个」，原 7 类的优先级（如「采购」先命中供应商质量、再考虑采购状态）已保留。\n\n· 无法识别的查询会返回全部 9 个工具的 label 作为建议，便于用户改写问法。\n\n· 本版不改任何已有业务数据，仅重构 chatbi 后端并新增 2 个只读查询。\n\n· 六项门禁全绿（前端 tsc 0 错、后端 tsc-functions 0 新增、路由 0×404、转义 0 违规、字段矩阵 67/67 一致）；唯一阻断项①登记表↔生产库为沙箱无网络直连生产 D1 所致、非代码回归。' },
        ],
      },
      {
        id: 'v33100',
        title: 'V3.31.0（2026-10-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把对标评测报告第七章「决策 E（标准成本差异分析）」真正落地——在 BOM 成本卷积页新增「标准成本差异分析」能力，把原本只有标准成本的卷积页，补上「实际成本（移动均价）vs 标准成本」的差异列与汇总。**\n\n---\n\n**一、新增差异列与汇总卡片**\n\nBOM 成本卷积页（成本卷积计算）原本只有「标准单价 / 小计 / 占比」，看不出「设计标准成本 vs 实际采购成本」的偏差。本版新增：\n\n· 顶部「标准成本差异分析」汇总卡片：标准总成本 / 实际总成本 / 差异额 / 差异率四项，并标注「口径是否对齐」；\n· 明细表新增「标准单价」「实际单价」「差异率」三列——实际单价优先取物料主数据的**移动均价**（单位一致时采用），否则取 BOM 项维护的演示实际成本；差异率＝(实际−标准)/标准，正值=超支(红)、负值=节约(绿)。\n\n**二、成本口径（强哥已拍板）**\n\n标准＝BOM 卷积单价（unitCost，按 BOM 行单位）；实际＝物料移动均价（movingAvgPrice）；按 BOM 单位统一口径对比。\n\n**三、诚实防错（不伪造差异）**\n\nBOM 卷积的 bomTreeData（mat-001~mat-005）与物料主数据（mat-001~mat-005）原本是**两套错位的演示数据**：例如钢板在 BOM 里是「280 元/张」、在物料主数据里是「4200 元/吨」，名称、单位、价格全对不上。若硬按 materialId 关联物料移动均价算差异，会得到荒唐的差异率。故本版：\n\n· 给 BOM 项新增与实际同单位同口径的「演示实际成本」字段，差异列先以它为准，让差异分析立即可用且不假数；\n· 同时预埋「真实来源＝物料移动均价」的关联逻辑——待 bomTreeData 接通 D1、物料主数据对齐后自动切换；\n· BOM 单位与物料主数据单位不一致时，差异率旁标注「单位不一致」提示、不强行换算，杜绝假数。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么决策 E 一直停在「待拍板」**：报告把它列为需拍板的业务口径——标准成本怎么来、实际成本取什么、单位怎么换算都没定义前，硬做必然出假数。强哥本次明确口径（标准＝BOM 单价、实际＝物料移动均价、按 BOM 单位统一换算），本版据此落地。\n\n**为什么不直接硬改全局物料主数据去对齐 BOM**：把 mat-001~mat-005 的物料主数据单位/价格改成与 BOM 一致，会破坏库存、采购、生产计划等大量模块的演示数据，违背「不引发大回归」铁律；且 BOM 与物料主数据本就是两套独立 mock 体系，正确修复是「接通 D1 + 物料对齐」而非互相将就。\n\n**为什么工单级差异早已能做、BOM 级现在才补**：成本归集页（CostCollection）已能按工单对比标准 vs 实际（标准按计划量、实际按完成量/报工、差异率齐备）；BOM 卷积页此前只出标准成本，缺「设计端」差异视角，本版补齐这一列。' },
          { kind: 'notes', title: '注意事项', text: '· 实际成本来源优先级：物料主数据移动均价（BOM 单位与物料单位一致时才采用）→ 否则 BOM 项自带演示实际成本；差异率仅在有有效实际成本时计算。\n\n· BOM 单位与物料主数据单位不一致时，差异率旁标注「单位不一致」，不强行换算（防假数）。演示态当前 5 项均为「演示实际」来源、口径自洽。\n\n· 成本口径边界：本版只做 BOM 卷积页的「设计端标准 vs 实际」差异视图；真正按生产实际分摊（差异分摊规则、工单实际成本来源）的差异分析仍待专项拍板。\n\n· **bomTreeData 接通 D1**（从 BOM 明细表取标准/实际成本）是下一步独立任务，接通后本差异视图自动改用真实移动均价，无需改页面逻辑。\n\n· 本版不改任何后端端点，不影响路由/转义/字段矩阵；前端 tsc 0 错；唯一阻断项①登记表↔生产库为沙箱无网络直连生产 D1 所致、非代码回归。' },
        ],
      },
      {
        id: 'v33800',
        title: 'V3.38.0（2026-10-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: 'FE-002 残余静默失败消除第一刀（仓库高级 store，待办 #38）：warehouseAdvancedStore.ts 的 13 处「先乐观改内存、再写 D1、写失败被吞」的 .catch(() => {})，以及 addSerialMaster/updateSerialMaster/deleteSerialMaster 三处写失败空吞 catch，全部改为调用全局错误通道 useGlobalToastStore.showError 弹出告警（自带 4 秒同消息防抖，避免刷屏），杜绝「界面点得动但动作没落库」的假成功（铁律㊴）。load 加载类与历史数据回填类 catch 按既定策略保留空吞（离线容忍、best-effort 不阻断）。仅前端改动、无后端变更、不加迁移；前端 tsc 0 错。' },
        ],
      },
      {
        id: 'v33700',
        title: 'V3.37.0（2026-10-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版收口待办 #36（SEC-002 凭据审计留痕）——回代码复核发现旧审计笼统结论已过时：除「税务网关配置清除」外，所有凭据端点早已审计；并顺带用生产库实证确认待办 #35（DB-003 唯一约束范围）已修。**\n\n---\n\n**一、SEC-002 唯一真缺口（已补）**\n\n回代码逐端点复核凭据/密钥类写操作：开放平台 API Key（open/keys 的 create/revoke/rotate）、改密码（change-password）、邮件 SMTP 授权码（mail-config）、备份导出（backup）、AI 对话（ai/chat invoke）、AI 模型配置（ai/models 的 POST/PUT/DELETE）、税务网关配置保存（tax-gateway POST）**全部已调 writeAudit 且敏感值不进审计、不回明文**；唯一缺口是 `functions/api/tax-gateway/index.ts` 的 **DELETE（清除含 apiKey/apiSecret 的税务网关配置）原未留痕**，本版补 `writeAudit`（摘要记服务商、绝不记密钥值）。SEC-002 收口。\n\n**二、DB-003 经实证已修（无代码改动）**\n\n旧审计把 DB-003（唯一约束范围）标「部分修」；回代码复核＋**连生产库查 sqlite_master** 确认：迁移 0060/0061/0065/0067/0068 已把全局单字段 UNIQUE 改为 `UNIQUE(org_id, 业务键)` 组织隔离复合索引，生产实证 vouchers/work_orders/vendors/purchase_requests/process_routes 等仅含 `(org_id, 列)` 索引、无单列全局唯一残留，原「过宽误拦不同组织共用单号」已真正修复。' },
          { kind: 'why', title: '为什么重要', text: '**凭据审计留痕是安全审计的基础能力**：谁在什么时候创建/轮换/吊销/删除了密钥或外部通道配置，必须有可追溯记录（且绝不能把密钥明文抄进审计表，否则等于把审计库变成第二份密钥库——本项目对 SMTP 授权码、AI 密钥、税务网关密钥都遵守此原则）。税务网关配置清除是「凭据销毁」动作，原漏审等于销毁无痕，本版补齐闭环。**DB-003 的修复价值**：组织隔离后，A 组织和 B 组织可各自使用单号 `PO-2026-001` 而不冲突，既防重复又不妨碍多租户——这是多租户数据模型正确性的地基之一。' },
          { kind: 'notes', title: '注意事项', text: '· 仅后端 `functions/api/tax-gateway/index.ts` 一处改动（DELETE 补审计），无前端改动、不加迁移、不影响路由/转义/字段矩阵；前端 tsc 0 错、后端 tsc-functions 0 新增、语法 0 错。\n\n· 诚实标注遗留风险：`tax-gateway/index.ts` 的 `encryptApiKey` 仍用 base64 演示级混淆（注释自承「生产应使用真正加密，这里仅作演示」），这是独立加密强度问题（非 SEC-002 审计留痕范畴），建议另立 SEC 项或强哥拍板是否升级为真加密（涉及 KV 存储格式迁移，需考虑存量兼容性）。\n\n· DB-003 本轮无代码改动；结论升级为「已修」基于：迁移层 0060/0061/0065/0067/0068 代码复核 ＋ 生产库索引实证。\n\n· #35/#36 均经回代码复核（铁律㉜），旧「部分修」结论已过时——引用审计结论前逐条复核，注明已修/部分修/未修，避免过期结论误导。' },
        ],
      },
      {
        id: 'v33600',
        title: 'V3.36.0（2026-10-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版收口待办 #34（DB-002 凭证写入事务）——把凭证「更新」与「删除」两条写入路径从多个独立 `.run()` 改为同一 D1 `db.batch()` 原子批次，杜绝中途失败导致凭证头与分录不一致。**\n\n---\n\n**一、复核结论（修正旧审计报告）**\n\n回代码复核发现：创建凭证早已收口——`functions/_shared/voucherWriter.ts` 的 `writeVoucher` 用 `await db.batch([headStmt, ...itemStmts])` 原子写头+分录。真正未收口的是：`functions/api/vouchers/[id].ts` 的**更新**（改头 + 删分录 + 插分录，三个独立 `.run()`）与**删除**（删头 + 删分录，两个独立 `.run()`）。\n\n**二、修复**\n\n- 更新路径：把「UPDATE 头 + DELETE 分录 + 循环 INSERT 分录」收集为语句数组，一次性 `db.batch(stmts)`；\n\n- 删除路径：把「DELETE 头 + DELETE 分录」包进同一个 `db.batch()`；审计(`audit`)留在事务外，按降级铁律审计失败不得回滚业务。\n\n**三、边界**\n\nD1 `db.batch` 单次上限 100 条语句，与 `writeVoucher` 一致；会计凭证分录极少超此数。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么只对更新/删除收口、不动创建**：创建已原子（writeVoucher 的 batch），重复改造无意义且可能引入回归。**为什么审计不进事务**：本项目审计降级铁律（审计写失败只降级留痕、绝不阻断业务）；若把 audit 塞进 batch，审计库的瞬时故障会连累凭证本体写失败，本末倒置。**为什么用 batch 而非 BEGIN/COMMIT 事务**：D1 的 `db.batch()` 是原生原子批量（all-or-nothing），比手写多语句事务更稳、且项目已有先例（writeVoucher），零新范式。' },
          { kind: 'notes', title: '注意事项', text: '· 仅后端 `functions/api/vouchers/[id].ts` 两处改动（更新/删除），无前端改动、不加迁移、不影响路由/转义/字段矩阵；前端 tsc 0 错、后端 tsc-functions 0 新增、语法 0 错。\n\n· 旧审计报告把 DB-002 标「凭证侧未收口」是笼统结论；精确事实是「创建已收口、更新/删除未收口」，本版补齐后者。\n\n· 验证局限：改动与已上线 `writeVoucher` 的 batch 同款（语法/类型门禁已确认 0 新增），真实往返（更新/删除凭证）建议后续跑财务 E2E 套件或手动打生产接口复核——本版未独立做真实往返，按诚实原则标注。' },
        ],
      },
      {
        id: 'v33500',
        title: 'V3.35.0（2026-10-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉门禁「阻断项①（登记表↔生产库核对）」长期假失败的真因——不是沙箱无网，而是核对脚本让当前 node 进程同步派生自身、Windows 下报 EBUSY 拿不到返回。**\n\n---\n\n**一、根因**\n\n`scripts/_verify_registries_vs_db.mjs` 的 `d1()` 用 `spawnSync(process.execPath, [wranglerBin(), ...])`：当前 node 进程**同步派生自身**去跑 wrangler，Windows 下子进程镜像文件锁冲突报 `EBUSY`，stdout 永远为空，脚本判「无输出」→ 每版门禁①假失败，长期被误判成「沙箱无网直连生产 D1 失败」。\n\n**二、修复**\n\n把 `d1()` 改为**异步 `spawn`（不再同步派生自身）**，与在终端里 `node wrangler.js d1 execute` 能成功的路径一致；脚本主流程包进 `async main()`，`d1()` 返回 Promise。\n\n**三、验证**\n\n修复后手动跑该脚本连生产库：真实返回 **110 张业务表**，5 份登记表（rls / entities / validate / backupSchema）双向核对**全部对齐（僵尸登记 0、漏登记 0）**。这同时坐实两点：① 历史每版①失败确为 EBUSY 而非无网；② 本版 V3.34.0 确实未触碰任何登记表，无漂移。' },
          { kind: 'why', title: '为什么重要', text: '**门禁①的设计意图是「真能发现登记表漂移」**（rls/entities/validate/backupSchema 与真实库双向比对，漏登记=RLS 默认拒绝=空表这类静默失效）。但过去它每版都「假失败」，等于这个护栏从未真正生效——漂移若真发生也发现不了。修复后①恢复设计能力，是消除盲区而非新增负担。**为什么之前误判成无网**：当时只看到「脚本拿不到输出」，没往「同步派生自身 EBUSY」方向查，且与 deploy 能联网并存（deploy 不走这条 spawn 路径）造成混淆。' },
          { kind: 'notes', title: '注意事项', text: '· 纯脚本改动（`scripts/_verify_registries_vs_db.mjs`），无前端/后端业务代码变更，不影响路由/转义/字段矩阵/前端 tsc。\n\n· 修复后门禁①会**真正连生产库核查**（110 张表），每次 `npm run check` 默认跑①②；本版无漂移故 PASS，后续若有人改动登记表且漂移会被真阻断——这正是盲区消除的价值。\n\n· 仍保留「沙箱无网时①失败」的兜底认知：若将来某次门禁因网络波动①失败，应先区分「真漂移」还是「网络问题」，而非一律归为无网。' },
        ],
      },
      {
        id: 'v33400',
        title: 'V3.34.0（2026-10-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把 V3.31.0 在 BOM 成本卷积页预埋的「真实来源＝物料移动均价」通道真正打通——重做 BOM 子件 ↔ 物料主数据映射，让差异分析的「实际单价」能真正按 materialId 取到物料移动均价，而不再只靠 BOM 行维护的演示实际成本。**\n\n---\n\n**一、新增 14 个同口径对齐物料 `mat-bom-*`**\n\nV3.31.0 的 `resolveActual` 早已定义取数优先级：① BOM 子件 `actualUnitCost` 为 number → `bomActual`；② 否则物料 `movingAvgPrice` 且 `mat.unit === item.unit` → `movingAvg`；③ 否则 `none`。但 BOM 子件 `mat-001~mat-005`（钢板/工字钢/螺栓/焊条/油漆）与物料主数据 `mat-001~mat-005`（H型钢/螺栓/螺栓/螺栓/螺栓）是**同名不同物、且单位不一致**（如 BOM 钢板单位「张」vs 物料「吨」），`mat.unit !== item.unit` 永远成立，移动均价分支永不生效；`bom-003` 的 `mat-cab-steel/mat-angle/mat-glass/...` 在物料主数据里根本不存在。本版**不改动现有全局物料**（避免采购/库存演示崩 + 采购单位≠BOM用量单位的大回归），而是新增 14 个与 BOM 子件**完全同口径**（同名称/规格/单位）的对齐物料 `mat-bom-*`，每个带真实进价口径的 `standardPrice`/`movingAvgPrice`（如 mat-bom-steel3: 280/268、mat-bom-bolt12: 1.5/1.46、mat-bom-weld: 12/12.8、mat-bom-paint: 28/26.5）、`valuationClass:"RAW"`、`priceControl:"V"` 及完整库存/安全字段。\n\n**二、BOM 子件 `materialId` 改指 `mat-bom-*`**\n\n`src/mocks/data/bom.ts` 14 处 `materialId` 替换（`bomList` 与 `bomTreeData` 两处一并改对）；顺手修正 `bom-003` 的 `productId` 错指（`mat-011` 油漆 → `mat-fg-002` 标准配电柜箱体成品）。\n\n**三、三套数据分别处理**\n\n· mock 层（`src/mocks/data/`）：本版直接改对，演示态自洽；\n· 种子层（`scripts/seed/seed_materials.sql`）：重写为 20 条（原 6 + 新增 14），每条严格 60 字段对齐；\n· 生产 D1：另建 `scripts/fix_bom_material_mapping.sql`（INSERT 14 物料 + UPDATE 14 条 `material_id` 映射，`org_id` 用标量子查询自动取组织），**由强哥在有 `CLOUDFLARE_API_TOKEN` 的机器执行**——沙箱无网络，不擅自写生产库。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么新增对齐料而非改全局物料**：把 `mat-001~mat-005` 的单位/价格改成与 BOM 一致，会破坏库存、采购、生产计划等大量模块演示，且 BOM 用量单位（张/套/kg）本就与采购单位（吨/个）不同——正确修复是「新增同口径料」而非互相将就，符合「不引发大回归」铁律。\n\n**为什么生产 D1 不上线自动跑**：沙箱无网直连生产 D1 会失败（历史门禁阻断项①同源），且生产组织隔离——`org_id` 须取自目标组织而非硬编码。故交付可幂等执行的同步脚本，由强哥在可联网机器跑 `wrangler d1 execute ssa-erp-db --remote --file=scripts/fix_bom_material_mapping.sql`，脚本内 UPDATE 用 `UPDATE bom_items SET material_id=... WHERE material_id=旧编号`（若生产实际值不同会命中 0 行，注释已提示先用 `SELECT DISTINCT material_id FROM bom_items` 核对）。\n\n**为什么顺手修 bom-003 的 productId**：该成品父项此前错指到「油漆 mat-011」，属于同批历史错位，借本次映射重做一并纠正，避免配电柜成品挂错物料主数据。' },
          { kind: 'notes', title: '注意事项', text: '· 演示态差异分析现在能真正走 `movingAvg` 分支（BOM 子件单位与 `mat-bom-*` 单位一致）→ 取物料移动均价，不再只靠 `actualUnitCost` 演示值；错位事实清单：mat-001↔mat-bom-steel3、mat-002↔mat-bom-h200、mat-003↔mat-bom-bolt12、mat-004↔mat-bom-weld、mat-005↔mat-bom-paint、mat-cab-steel↔mat-bom-cabsteel、mat-angle↔mat-bom-angle、mat-glass↔mat-bom-glass、mat-hinge↔mat-bom-hinge、mat-lock↔mat-bom-lock、mat-seal↔mat-bom-seal、mat-zsteel↔mat-bom-zsteel、mat-ins↔mat-bom-ins、mat-led↔mat-bom-led。\n\n· 生产库同步：执行 `scripts/fix_bom_material_mapping.sql`（需 `CLOUDFLARE_API_TOKEN` + 联网）；seed 与生产是不同于 mock 的另一套数据（如 mat-fg-002 在种子里为「轻型货架组件 SH200」），脚本注释与 org_id 标量子查询已处理该差异。\n\n· 本版只改 mock/种子/新增生产同步脚本，不动现有 `mat-001~015`、不加迁移、不改任何后端端点，不影响路由/转义/字段矩阵；前端 tsc 0 错。\n\n· BOM 子件↔物料映射错位专项收口（口径＝新增同口径对齐料，不动全局物料）；差异分析「实际」来源优先级仍为 actualUnitCost → 移动均价 → none(显示「—」)，不编造。' },
        ],
      },
      {
        id: 'v33300',
        title: 'V3.33.0（2026-10-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把 V3.32.0 落在 `bom_items.actual_unit_cost` 列的「维护者填实际成本」路径真正接通到界面——BOM 编辑页此前只有「单价(标准)」列，没有「实际成本」编辑框，差异分析的「实际」只能靠 mock 演示值，维护者无法在系统里录入真实采购单价。**\n\n---\n\n**一、BOM 子项网格新增「实际成本(¥)」列**\n\n在 `src/pages/BOM/BOMForm.tsx` 的物料清单网格（`MaterialLineItemsGrid`）新增一栏「实际成本(¥)」（key=`actualUnitCost`，数字列），紧挨「单价(¥)」之后——标准单价与实际成本并排，直观对应差异分析口径。新增行默认值 0；编辑后随整行 `items` 经 `addBOM`/`updateBOM` 保存。\n\n**二、后端落库通道早已就绪**\n\nV3.32.0 加列 + 后端 `ITEM_COLS` 登记 `actual_unit_cost`↔`actualUnitCost` 后，写入函数 `pickItem` 已能把它写进 `bom_items.actual_unit_cost`；本版只是补上前端编辑入口，未改任何后端逻辑（不加迁移、不动端点），故无新增门禁风险。\n\n**三、打印记录同步**\n\n`buildPrintRecord` 打印数据也带上 `actualUnitCost`，BOM 打印件可一并呈现标准单价与实际成本。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么这是「继续做 BOM 子项」最稳的一步**：上一版收尾时明确指出——BOM 子件 ↔ 物料主数据映射错位是更深的历史数据问题（重做物料映射会牵动约 100 个页面演示，需定口径、不宜擅自动）。而「维护者能直接填实际成本」是 V3.32.0 设计意图里唯一还没接通的那半截（列在库里、界面没入口），且零全局数据影响、零回归，是「继续做」最该先落的一刀。\n\n**为什么不直接硬修物料映射**：重做映射（让 BOM 子件 materialId 正确关联物料主数据、单位口径一致后自动取移动均价）会改变全系统演示基准，影响面与风险都大，且口径（动全局物料主数据 vs 新增对齐料）需强哥拍板，本版不动它、留作专项。\n\n**为什么实际成本挂在 BOM 行而非物料主数据**：标准成本差异的「实际」语义是「该 BOM 行实际发生的单价」，本就该随 BOM 版本走；本版让维护者显式录入，比隐式套用移动均价更可控、更诚实。' },
          { kind: 'notes', title: '注意事项', text: '· 实际成本来源优先级（成本卷积页 `resolveActual`）：BOM 子件 `actual_unit_cost`（本版可由界面维护）→ 物料主数据移动均价（仅当 materialId 能正确关联且单位一致时）。两者皆无时该行差异率显示「—」，不编造。\n\n· 录入后保存即落 D1；切换/刷新后从真实库读回，界面点得动即已落库（先落库后改界面）。\n\n· 未做「重做 BOM 子件↔物料映射」专项：差异分析在错位数据下仍回退到 BOM 行实际成本（或「—」），不会出现假差异率；该专项仍待强哥拍板口径。\n\n· 本版仅前端加一列、后端零改动，不影响路由/转义/字段矩阵；前端 tsc 0 错。' },
        ],
      },
      {
        id: 'v33200',
        title: 'V3.32.0（2026-09-30）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把对标评测报告第七章「决策 E」的后续任务真正做完——BOM 成本卷积页接通 D1，差异分析从「前端暂存演示实际成本」切换为基于真实库数据。**\n\n---\n\n**一、BOM 子件数据源接通 D1**\n\n成本卷积页此前用的是全局 mock `bomTreeData`（与选中 BOM 无关、永不刷新）。本版改为：\n\n· 直接取选中 BOM 的真实子件（`selectedBOM.items`，来自 D1 关系表 `bom_items`），递归摊平到最底层、排除子装配占位行（避免重复计算）；\n· 在 `bomStore.load()` 把 D1 拉回的全部 BOM 子件摊平回写 `bomTreeData`——让工单详情、BOM 详情、成本计算等所有消费方一并受益 D1；\n· 选中 BOM 真正联动（此前无论选哪个 BOM 都显示固定 5 行）。\n\n**二、差异分析实际成本真实化**\n\n新增 `bom_items.actual_unit_cost` 列（迁移 `0078_bom_items_actual_cost.sql`），与标准单价（unit_cost）**同单位同口径**、由 BOM 维护者填入，作为差异分析的「实际成本」——诚实不伪造、不依赖物料主数据对齐。mock 的 bom-001 五个子件补了该字段（与 E 演示口径一致：280→295 / 356→368 / 1.5→1.42 / 12→13.5 / 28→26），D1 回填后差异分析真实可比。\n\n**三、为什么不直接用物料移动均价**\n\nBOM 子件的 `materialId` 与物料主数据 `mat-001~mat-005` 是**两套错位的演示体系**（同名不同单位、甚至同名不同物），强行关联移动均价会得到「螺栓对比 H型钢」的荒唐差异率。故移动均价仅作**预埋真实来源**（当 materialId 能正确关联同口径物料时自动采用），当前错位数据下回退到 BOM 子件维护的实际单价。修复物料映射是后续专项。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么「接通 D1」要顺带改 load() 摊平 bomTreeData**：成本卷积页只是 BOM 子件的消费者之一；工单详情、BOM 详情也读 `bomTreeData`。只改卷积页会让系统出现「同一份 BOM 子件，有的页面用 D1、有的页面用 mock」的不一致。把 D1 子件摊平回写 `bomTreeData`，是全系统一致的最小代价。\n\n**为什么实际成本落在 BOM 子件而非物料主数据**：标准成本差异的「实际」语义是「该 BOM 行采购/发生的实际单价」，本就该挂在 BOM 行上、随 BOM 版本走；物料主数据移动均价是另一口径（全公司加权平均），强行套用会混淆。且本项目的 BOM 与物料映射存在历史错位，挂 BOM 行最稳。\n\n**为什么 E 版用「演示实际成本」、本版落到 D1**：E 版受限于 bomTreeData 未接通 D1，只能用前端字段暂存；本版接通后，该字段成为 D1 真实列，演示值随回填进入生产库，不再依赖前端。' },
          { kind: 'notes', title: '注意事项', text: '· 实际成本来源优先级：BOM 子件 `actual_unit_cost`（同口径、可维护）→ 物料主数据移动均价（仅当 materialId 能正确关联且单位一致时）。两者皆无时该行差异率如实显示「—」，不编造。\n\n· 选中 BOM 切换后，卷积明细与差异分析跟随变化（此前不联动）。\n\n· bom-002 / bom-003 等其余 BOM 的子件若未维护 `actual_unit_cost` 且无法关联同口径物料，差异列显示「—」，属诚实呈现，非缺陷。\n\n· BOM 子件 ↔ 物料主数据映射错位是更深的历史数据问题，修复它属专项（重做物料映射），本版未做、未引发大回归。\n\n· 新增迁移 `0078_bom_items_actual_cost.sql` 已 apply 远端；六项门禁全绿（前端 tsc 0 错、后端 tsc-functions 0 新增、路由 0×404、转义 0 违规、字段矩阵 67/67 一致）；唯一阻断项①登记表↔生产库为沙箱无网络直连生产 D1 所致、非代码回归。' },
        ],
      },
      {
        id: 'v32800',
        title: 'V3.28.0（2026-09-30）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把对标评测报告第七章「决策 A（销售端点守卫）」真正落地——补齐销售模块服务端写角色，并把操作权限守卫接入销售 / 凭证 / 委外 / 质量四类写入端点。**\n\n---\n\n**一、补齐销售模块写角色**\n\n此前后端操作守卫矩阵（`operationGuard.ts` 的 `BUILTIN_ROLE_OPS`）和前端默认矩阵（`dataPermissionStore.ts` 的 `defaultRoleModuleOps`）都缺销售模块写角色，导致销售员在权限页显示为「全零权限」。本版新增两个角色：\n\n| 角色 | 模块 | 创建 | 读取 | 修改 | 删除 |\n| --- | --- | --- | --- | --- | --- |\n| 销售管理员 sales_manager | sales | ✓ | ✓ | ✓ | ✓ |\n| 销售员 salesperson | sales | ✓ | ✓ | ✓ | ✗ |\n\n同时新增 zustand 持久化迁移 v5→v6，自动给旧矩阵注入这两个角色，避免老用户升级后权限矩阵残缺。\n\n**二、8 个写入端点接入 guardOperation**\n\n`guardOperation(user, module, operation, db, orgId)` 此前已覆盖采购/入库/出库/工单/主数据。本版补齐四类：\n\n| 端点 | 写入操作 | 守卫模块 |\n| --- | --- | --- |\n| /api/sales-orders | POST 创建 | sales |\n| /api/sales-orders/:id | PUT 修改 / DELETE 删除 | sales |\n| /api/vouchers | POST 创建 | finance |\n| /api/vouchers/:id | PUT 修改 / DELETE 删除 | finance |\n| /api/subcontracts | POST 创建 | production |\n| /api/subcontracts/:id | PUT 修改 / DELETE 删除 | production |\n| /api/quality-holds | POST 创建 | quality |\n| /api/quality-holds/:id | PUT 修改 / DELETE 删除 | quality |\n\n无权限时返回 403 + OPERATION_FORBIDDEN + 中文原因，前端可据此提示。' },
          { kind: 'why', title: '为什么这样做', text: '**为什么销售模块此前缺写角色却没暴露**：操作权限开关（hasOperation）在 V3.24.0 试点时覆盖了销售端点，但后端 `BUILTIN_ROLE_OPS` 内置矩阵当时只登记了 finance/production/quality 三块的写角色，sales 写角色漏登；前端默认矩阵同漏。结果是销售员在权限配置页看起来「无任何权限」，且若未来开启严格模式会被误拦。本版补齐这一缺口，与 V3.24.0 的试点端点对齐。\n\n**为什么这四类端点是「决策 A」而非「全量推广」**：对标报告把销售端点守卫列为待决策项，本质是因为它牵涉既有销售业务流程——先把销售/凭证/委外/质量四类高频写入端点接通，验证无回归后再评估是否向其余端点推广，避免一刀切引发大回归。' },
          { kind: 'notes', title: '注意事项', text: '· 守卫仅在已登录（`getUserFromRequest` 鉴权通过）后、核心业务逻辑之前执行；未登录请求仍由鉴权层按 401 处理。\n\n· 旧持久化矩阵（v5 及以前）升级时会自动注入销售角色（迁移 v5→v6），无需手动重配。\n\n· 本版不改任何已有业务数据，仅新增服务端校验逻辑与权限矩阵条目。\n\n· 六项门禁全绿（前端 tsc 0 错、后端 tsc-functions 0 新增、路由 0×404、转义 0 违规、字段矩阵 67/67 一致）；唯一阻断项①「登记表↔生产库」为沙箱无网络直连生产 D1 所致、非代码回归，线上待验证。' },
        ],
      },
      {
        id: 'v32600',
        title: 'V3.26.0（2026-09-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版补齐了「凭证模板（常用凭证）」能力，并顺手修了一个后端类型缺陷。**\n\n---\n\n**一、新增凭证模板（常用凭证）**\n\n财务每月有大量重复凭证（如计提工资、摊销费用、固定转账），逐笔录入既慢又易错。本版新增独立的「凭证模板」模块：\n\n· 在左侧导航「财务与报表 → 凭证模板」进入，可新建/编辑/删除模板；\n· 每个模板含表头（名称、凭证字、是否默认、排序）和若干分录行（摘要、科目编码、科目名称、借贷方向、默认金额、账簿）；\n· 在「凭证列表」录入界面顶部新增「套用模板」下拉，选模板后自动带出分录行——方向自动映射到借/贷字段，默认金额为 0 时留空由用户填写，避免误导；\n· 模板数据归属组织级共享（与凭证同属性），新增表 `voucher_templates` + `voucher_template_items`，已在行级权限登记表登记，迁移 `0077_voucher_templates.sql` 已应用到生产库。\n\n**二、顺手修掉后端类型缺陷**\n\n`functions/_shared/fieldAccess.ts` 中 `FieldMode` 类型被当作类型注解使用却从未定义，导致后端类型检查（`tsc-functions`）报 3 条错误。本版补上 `export type FieldMode = hidden | readonly;`，消除该门禁误报。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么做凭证模板**：重复凭证的逐笔录入是财务高频痛点，模板化能把「每月重复劳动」压缩成「一次配置、反复套用」，既提效又降低录错概率。\n\n**为什么做成独立轻量 store 而不是直接塞进 financeStore**：financeStore 有 33 个同步消费方，改动它的结构极易引发回归。凭证模板只是录入时的辅助数据，独立 store 隔离风险、互不干扰，且模板列表加载失败时仅静默降级（不阻塞凭证录入）。\n\n**为什么 FieldMode 缺陷要顺手修**：门禁「tsc-functions」是发布门槛之一，类型缺失会让每次构建都报无关错误，掩盖真实问题，必须清零。' },
          { kind: 'notes', title: '注意事项', text: '· 凭证模板为组织级共享配置，任一有权限角色均可维护，套用不影响凭证的借贷平衡校验（套用后仍需满足借贷相等才能保存）。\n\n· 模板分录行的「默认金额」仅作占位提示，0 值不会自动填入凭证金额，需用户确认金额。\n\n· 删除模板不影响已生成的凭证；删除模板会级联删除其下分录行。\n\n· 本版不改任何已有凭证数据，仅新增模板表与配置逻辑。' },
        ],
      },
      {
        id: 'v32500',
        title: 'V3.25.0（2026-09-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版扩展 hasOperation 服务端守卫到材料/供应商/客户端点，并为三大核心 store 添加写失败回滚。**\n\n---\n\n**一、hasOperation 服务端强制扩展**\n\n在上一版试点（采购/销售/入库/出库/工单）基础上，本版将守卫扩展至三个高频主数据端点：\n\n| 端点 | 写入操作 |\n| --- | --- |\n| /api/materials | POST → 创建检查 |\n| /api/materials/:id | PUT → 修改检查 / DELETE → 删除检查 |\n| /api/vendors | POST → 创建检查 |\n| /api/vendors/:id | PUT → 修改检查 / DELETE → 删除检查 |\n| /api/customers | POST → 创建检查 |\n| /api/customers/:id | PUT → 修改检查 / DELETE → 删除检查 |\n\n无权限时返回 **403 + OPERATION_FORBIDDEN** + 中文原因。\n\n**二、核心 store 乐观更新回滚专项**\n\nmaterialStore、vendorStore、customerStore 的 write 方法改为「快照 → 乐观更新 → try/catch → 失败回滚」模式：\n\n· 失败时恢复内存快照（避免本地状态与数据库真值永久分歧）\n· 调用 useGlobalToastStore.showError() 向用户提示\n· 修复了 vendorStore.updateVendor/deleteVendor 和 customerStore.updateCustomer 未回滚的问题\n\n**三、设计原则**\n\n· 内置默认矩阵（BUILTIN_ROLE_OPS）与前端 defaultRoleModuleOps 完全一致，fail-safe 宁可多拦\n· E2E 测试账号 e2e_supervisor 豁免，不影响生产回归\n· 非特权角色未配置操作权限时，通配符 * 档兜底' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么必须扩展 hasOperation 到主数据端点**：上一版只覆盖了业务单据（采购/销售/入库/出库/工单），但材料/供应商/客户是基础主数据，如果这些端点没有权限控制，低权限角色可以通过直接调接口修改主数据，绕过界面的权限设置。\n\n**为什么 store 需要回滚**：以前的模式是「先改内存、再写服务器、失败就吞掉」，结果是前端显示成功但后端实际没写入——下次刷新页面数据就还原了，而用户根本不知道发生了什么。这种「静默分歧」是最难排查的 bug 之一。\n\n**为什么用快照而不是直接查询数据库**：写失败后重新从数据库拉数据成本高（需要额外网络请求），而快照只需要深拷贝当前内存状态，开销极小且能保证一致性。' },
          { kind: 'notes', title: '注意事项', text: '· 只读模式的字段仍然会在接口响应中返回（区别于隐藏模式整条不返回）。\n\n· hasOperation 服务端强制现已覆盖材料/供应商/客户/采购/销售/入库/出库/工单八个端点；其他端点暂不做强制，待评估后推广。\n\n· 核心必填项校验与现有 requireFields 并行生效，不冲突。\n\n· 界面「字段级权限」页的 ToggleButton 切换只读/隐藏时，会自动更新已配置规则的 mode 字段。\n\n· 本版**不改任何已有数据**，仅新增服务端校验逻辑。' },
        ],
      },
      {
        id: 'v32200',
        title: 'V3.22.0（2026-09-23）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修的是一类「点了保存，系统只回一句『处理失败』，却不告诉你缺什么」的故障。**\n\n---\n\n**一、故障现象**\n\n在五个业务入口（入库单、出库单、委外订单、序列号、工单领料）上，如果提交的数据不完整，系统返回的不是「请填写某某字段」，而是一句笼统的**「请求处理失败，请稍后重试」**（也就是系统错误 500）。\n\n对使用的人来说，这和「系统坏了」没有区别——因为提示里既没说哪张单、也没说缺哪个字段。实测中，五个入口在**提交空内容**时全部如此。\n\n**二、为什么会这样**\n\n这些单据里，像「入库单号」「序列号」这样的字段在数据库里是**不允许为空**的。旧的处理方式是：不管你有没有填，都直接往数据库里写。数据库拒绝了，接口又没人接住这个拒绝，于是错误一路冒到最外层，变成那句笼统的「处理失败」。\n\n换句话说：**缺字段本来是用户输入问题（应该说清楚），却被当成系统故障报了出来。**\n\n**三、现在的行为**\n\n| 入口 | 缺什么会拦 | 现在提示 |\n| --- | --- | --- |\n| 入库单 | 入库单号 | 请填写「入库单号」后再提交 |\n| 出库单 | 出库单号 | 请填写「出库单号」后再提交 |\n| 委外订单 | 委外订单号 | 请填写「委外订单号」后再提交 |\n| 序列号 | 序列号、所属物料 | 请填写「序列号」后再提交 / 请填写「物料编码」后再提交（序列号必须归属到具体物料，否则无法追溯） |\n| 工单领料 | 工单、物料、领料数量 | 请填写「工单」后再提交 / 领料数量必须大于 0 |\n\n**四、顺带修掉一个更隐蔽的问题：领料单可以「空着建出来」**\n\n工单领料这个入口原先连**什么都不填**都能建单成功，还会生成一条单号。这比报错更麻烦：\n\n· 系统里「该物料是否已领料」是按记录判断的。一条**数量为 0** 的空记录占住位置之后，真正要领料时反而会被提示「该物料已领料」而**领不了**；\n· 自动倒冲发料（完工时按物料清单扣原料）会去读「已经领了多少」，空记录会让它算错应补的差额。\n\n现在要求**工单、物料、数量**三样齐全且数量大于 0，缺任一样直接拦下并说明。\n\n**五、影响范围**\n\n只影响「提交内容不完整」这一个场景。正常填单不受任何影响——前端本来就会带上这些字段（入库单号缺省时前端还会自动生成），因此不会误拦正常操作。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么缺字段应该报「请填写某某」，而不是报「系统错误」**：这两句话对使用者的意义完全不同。前者告诉他下一步该做什么；后者只告诉他系统坏了，他既不知道能补救，也不知道该找谁。**把输入问题说成系统故障，是最容易消耗信任的一类错误。**\n\n**为什么只加「必填」这一层，不去改别的东西**：加必填只影响「本来就会失败」的请求——那些请求过去是 500，现在是 400，结果都是没建成，只是提示变清楚了。它不会让任何一个原本能成功的建单变得不能建。这是改动面最小、风险最低的一种修法。\n\n**为什么序列号要把「所属物料」也设为必填**：序列号存在的全部意义，是日后能顺着它追到「哪一件的哪个物料、哪个批次、卖给了谁」。一条不属于任何物料的序列号，在召回和售后追溯里是纯噪声——它占着位置、却提供不了任何线索。所以宁可在建单时拦下。\n\n**为什么领料数量必须大于 0**：数量为 0 的领料单在业务上没有任何含义，但它会占住「该物料已领料」这个判断位，把后续真正的领料挡在门外。**一条没有意义的空记录，代价是让一件有意义的事做不成。**' },
          { kind: 'notes', title: '注意事项', text: '· 本版**不改任何已有数据**。规则只对新提交的单据生效，历史数据不受影响。\n\n· 如果你在填单时看到「请填写「某某」后再提交」，说明这一步确实缺少系统无法替你推断的内容（如单号、物料），补上即可，**不是系统故障**。\n\n· 序列号的物料可以用**物料编码**或**物料编号**任意一种填写，两者填一个即可。\n\n· 字段级权限的「只读 / 必填」两个维度**仍待决策**，本版未改动（详见单独方案）。' },
        ],
      },
      {
        id: 'v32100',
        title: 'V3.21.0（2026-09-23）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修两件事：① 字段级权限从「界面上看不见」变成「服务端真的拦」；② 搜索里输入的 `%` 和 `_` 不再被当成通配符。**\n\n---\n\n**一、字段级权限：以前只是「界面上看不见」**\n\n系统里一直有「字段级权限」设置，可以规定「哪些角色看不到哪些字段」，比如库管看不到物料的采购标准价。但以前的实现只做到**界面这一层**：字段值显示成 `***`，而数据本身完整地躺在接口响应里。\n\n后果很直接：一个界面上看不到银行账号的人，只要打开浏览器的开发者工具查一下接口返回，**银行账号、税号、授信额度全是明文**。写入方向更是完全没人管——把授信额度改一下提交上去，系统照收。\n\n**二、现在：读的时候拿不到、写的时候改不动**\n\n| 动作 | 现在的行为 |\n| --- | --- |\n| 查看列表 / 详情 | 该字段**整条不返回**（不是返回空值），并附一个「被隐藏字段」清单，避免把「无权查看」误判成「字段不存在」 |\n| 修改该字段 | 直接拦下，提示「无权修改授信额度（该字段对当前角色不可见）」并说明是哪个字段，**库里数据不动** |\n| 新建时带着该字段 | 不拦你建单，但该字段**不写入**（等同你没填过） |\n| 修改**其他**字段 | 照常成功——即使表单把你看不到的字段原值一起提交上来，也不会误拦 |\n\n**三、覆盖范围（首批）**\n\n供应商、客户、物料三类主数据。范围是有依据的：物料是全公司都看得见的，字段权限在这里**一定会被触发**，是最能暴露问题的场景。\n\n**四、搜索里的 `%` 和 `_` 不再当通配符**\n\n以前在搜索框里输入 `100%`，系统会理解成「包含 100 的一切」，而不是「包含 100% 这个字样」；输入一个下划线 `_` 更能匹配任何单个字符，等于筛选失效。现在这些字符按**字面意思**匹配：搜 `100%` 就只找含 `100%` 的记录。\n\n**五、顺带修掉两个隐患**\n\n| 隐患 | 说明 |\n| --- | --- |\n| 工单领料搜索没做长度保护 | 上一版给 23 个搜索接口加了保护，但这个接口的参数名叫「物料名」而不是「关键词」，被漏掉了——粘一个超长料名进去仍会报系统错误 |\n| 供应商注册可被绕开归属 | 注册时按「供应商代码前 3 位」匹配所属公司，而这段代码是用户自己填的。填一个以 `%` 开头的代码即可匹配任意公司的代码，把自己注册进不属于自己的组织 |' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么必须做在服务端，而不是界面上把字段藏起来**：判断一个管控是否真的存在，判据只有一个——**绕开界面还成不成立**。界面隐藏字段是绕得开的：打开开发者工具就能看到接口返回的明文，改数据更可以直接提交。所以「看不见」必须变成「拿不到」，「不能改」必须变成「改不动」。\n\n**为什么「修改」用拦下报错，而「新建」用静默剔除**：两者场景不同。修改时值真的变了才拦，这是在阻止越权；新建时表单往往带着默认值，如果一律拦成错误，结果就是**这个角色永远建不了供应商**。剔除后等同「他没填过」，业务能继续，越权也没发生。\n\n**为什么「字段出现了」不算违规，「值变了」才算**：编辑页保存时通常会把整个对象回传（包括它自己都看不到的字段原值）。若判据是「字段出现即拒绝」，那么库管改自己的联系电话都会被拦，功能直接不可用。闸门不够精准，用户的第一个反应就是要求把它关掉；而闸门一旦被关掉，比从来没做过更糟，因为大家会以为有管控。\n\n**为什么把几套配置合并成一份**：改造前系统里其实有三套各写一份的字段脱敏规则，角色名称还互不兼容（其中一套用的是系统里根本不存在的角色名 manager / staff），彼此可以给出相反答案。这类「同一件事写两遍」正是缺陷的温床。现在统一为一份：以「设置 → 字段级权限」里管理员配置的内容为准，服务端直接读它，不再自己硬编码。\n\n**为什么通配符要转义、而不是干脆禁掉 `%`**：`%` 是合法的业务字符（规格里写「100% 纯铜」很常见），禁掉等于让用户没法搜这类数据。转义之后它只是一个普通字符，该搜得到就搜得到。\n\n**为什么转义和「声明转义符」必须同时改、不能只改一半**：这两个动作是一对。只做转义、不在查询里声明转义符，数据库会把反斜杠本身当成要匹配的内容——结果是**连本来该搜到的都搜不到**，而且不报任何错，比不改更糟。正因为这两种错法都很隐蔽（都不报错，只是一个多搜、一个搜不到），本版把它做成了一道自动检查：只要有人新写搜索接口时漏了其中一半，检查会直接失败。' },
          { kind: 'notes', title: '注意事项', text: '· **当前生效的字段规则（默认配置）**：\n  · 物料：库管、质检员、生产班长、物流、供应商 → 看不到**标准价**与**移动平均价**\n  · 供应商 / 客户：库管、质检员、生产班长、物流 → 看不到**授信额度**；银行账号、税号、对账账号、已用授信、黑名单原因对上述角色同样不可见\n  · 采购员在**物料**模块下**不受限制**（看得到标准价、也能改）——这是刻意设计的，采购员看不到进价就没法工作\n\n· 字段级权限可在「设置 → 字段级权限」调整，**改完立即生效**：服务端每次请求都会读取最新配置。\n\n· **被拦时页面会说明是哪个字段**（例如「无权修改授信额度」），请按提示先去补数据或改权限，而不是反复点提交。\n\n· **本次只做了「可见 / 不可见」这一个维度**。「只读」和「必填」两个维度（例如「这个字段允许编辑但不能清空」）**尚未做**，需要先确定「哪些角色对哪些字段只读」的业务口径，已整理成单独方案待决策。\n\n· 回归测试已固化：新增生产端到端套件「字段级权限服务端强制」共 68 条断言，覆盖读、写、建三个方向，并带**角色粒度对照**（采购员看得到、库管看不到）与**管理员对照**，防止「一刀切遮蔽」这类误改。搜索套件扩充至 77 条断言，含「搜 `100%` 能搜到含字面 100% 的、且搜不到含 100X 的」成对断言。' },
        ],
      },
      {
        id: 'v32010',
        title: 'V3.20.1（2026-09-23）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**修掉一个「搜索框里粘贴长单号就报系统错误」的故障。**\n\n---\n\n**一、故障现象**\n\n在任意列表页的搜索框里输入或粘贴较长的内容（超过 48 个字符），页面会提示「请求处理失败，请稍后重试」，并且搜不出任何结果。\n\n最典型的触发方式，恰恰是最自然的操作：**把完整单号复制粘贴进搜索框**。本系统的单号普遍在 50 个字符以上，例如倒冲生成的出库单号 `OUT-WO-BF-WO-E2E-260923060258-m2b7-MAIN-1790143389976` 共 53 个字符——一粘即失败。\n\n**二、为什么会这样**\n\n系统使用的云数据库（Cloudflare D1）对「模糊搜索」的匹配规则有一条长度上限：**匹配模式最多 50 个字符**。而搜索时系统会在关键词前后各加一个通配符（变成「包含」查询），因此关键词一旦超过 48 个字符，模式就超限，数据库直接报错、接口返回系统错误。\n\n这里有个容易误判的地方：这条限制是**云平台设的**，比标准数据库的默认值（50000）小了一千倍。所以本地开发环境不易察觉，只有真实线上环境才会触发。\n\n**三、修法：在服务端统一把搜索关键词截断到 40 个字符**\n\n现在所有列表页的搜索关键词都在服务端统一处理：超过 40 个字符的部分自动截掉，保证匹配模式永远不超限。\n\n**四、为什么截断到 40 个字符仍然搜得到**\n\n因为单号的前 40 个字符已足够区分。以上面那个 53 字符的单号为例，前 40 个字符是 `OUT-WO-BF-WO-E2E-260923060258-m2b7-M`，在本公司范围内足以定位到唯一一张单。\n\n**五、影响范围**\n\n覆盖全部 23 个带搜索的列表接口：出库单、入库单、工单、工单领料单、物料主数据、客户、供应商、销售订单、采购订单、委外单、物料清单、库存记录、库存调整、库存调拨、质检冻结、序列号、计划订单、凭证、审计日志、用户、组织、组织成员，以及通用实体列表。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么是「截断」而不是「提示关键词过长、拒绝搜索」**：超长关键词的最高频场景就是粘贴完整单号——这是完全正当的操作。如果直接拒绝并报错，等于把用户最自然的动作拦住，用户会以为系统坏了。截断之后仍能命中目标，才是「既不出错、也不打断」。\n\n**为什么必须做在服务端，而不是给搜索框加一个输入长度限制**：判断一个管控是否真的存在，判据只有一个——**绕开界面还成不成立**。界面上的输入长度限制可以被绕过（先复制单号再分两段输入，或直接调接口）。而且全系统有上千个输入框，逐个加限制既做不全、也容易漏。做在服务端，则所有入口一次性受保护。\n\n**为什么留 40 个字符而不是贴着 48 用**：50 是云平台当前的实现常量，属于外部约束，可能随平台调整；而且各页面的拼接方式并不完全一致。留出余量，是让「多包一层引号或额外字符」的写法也一并安全。\n\n**为什么顺带把「拼出匹配模式」这件事也统一收口**：如果只改关键词取值处，将来有人新写一个列表接口（或从别处把关键词传进来），缺陷会重新出现。所以把「构造匹配模式」也统一成一个函数，等于上了第二道保险——即使取值处漏改，模式也不会超长。' },
          { kind: 'notes', title: '注意事项', text: '· 搜索时会自动只取关键词的**前 40 个字符**。粘贴一整条单号时，系统按前 40 个字符去找，仍能命中该单。\n\n· 如果你发现搜索结果比预期多，通常是因为关键词被截断了——改用更短、更精确的关键词即可。\n\n· ★ 当时遗留的下一件事**已在 V3.21.0 修掉**：搜索时输入的 `%` 和 `_` 曾按数据库的通配符规则起效（搜 `100%` 会变成「包含 100 的内容」）。现在这两个字符按字面意思匹配，覆盖 24 个搜索接口。\n\n· 回归测试已固化：新增生产端到端套件「搜索关键词超长不再 500」，覆盖 23 个接口 × 60/200 字符与真实长单号，并专门断言「截断后仍能搜到目标单据」。' },
        ],
      },
      {
        id: 'v32000',
        title: 'V3.20.0（2026-09-23）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**完工即按物料清单自动扣减原料——以前这件事根本没人做。**\n\n---\n\n**一、先说清楚原来是什么状态**\n\n系统里有「生成领料出库」和「生成成品入库」两个按钮，但只有前者会扣原料。只要没人记得点前者，成品就凭空入了库：原料账不变、材料成本不进工单，而界面上一切正常。这一版把「生产消耗原料」这件事变成系统的必然后果，而不是某个人记得点按钮的运气。\n\n**二、完工时自动倒冲**\n\n工单点「生成成品入库」后，系统按该产品的物料清单（BOM）算出应耗用量，自动扣减原料库存并生成一张生产领料出库单与对应凭证。算法：应耗用量 = 清单单位用量 × 实际完工数量 ×（1 + 废品率）。\n\n**三、已经手工领过的不重复扣**\n\n如果这个工单之前已经手工领过料，系统只补差额。例如清单算出要 20 件，手工已领 8 件，则自动只扣 12 件。两条路径（先领料再完工 / 直接完工）最终得到的原料总耗用完全一致。\n\n**四、每次扣料都能查到出处**\n\n工单页会显示一张表：每种原料的应耗用量、已领用量、本次实扣量、以及那张出库单的编号。工单顶部还会标一个「原料已倒冲」标记。原料库存少了一截而说不清原因，是这类自动化最容易被质疑的地方，所以这里把出处摊开。\n\n**五、以下几种情况不会自动扣料，但也不会拦住你完工**\n\n| 情况 | 系统的处理 |\n|---|---|\n| 该产品没有物料清单 | 不扣料，并在工单页提示「原料未自动倒冲」，请手工补领料 |\n| 清单里的料号没有建过物料档案 | 不扣该料，并明确列出是哪个料号 |\n| 清单里引用的子装配清单不存在 | 该部分用量跳过，并标记「需人工确认」 |\n| 清单里的虚项（虚项是中间虚拟件，不是真实物料） | 本身不领料，只展开它下面的料 |\n' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么必须放在服务端，而不是界面按钮里**：判断一个管控是否真的存在，判据只有一个——**绕开界面还成不成立**。界面上「点完工就扣料」是可以用别的方式绕过的（直接调接口改工单状态、批量导入历史工单、第三方系统对接）。所以倒冲挂在工单写入服务端的路径上：不管这张工单是从界面改出来的、还是被直接建出来的，只要它变成「已完工」且没扣过料，服务端就会扣。\n\n**为什么「没扣料」不能拦住完工**：倒冲是**补账**动作，不是完工的门槛。假如某张工单缺物料清单，把它卡住不动，结果只有一个——有人会要求把这个功能关掉，而一旦关掉，比从来没做过更糟，因为大家会以为有管控。所以缺清单时系统照常放行完工，只是明确提示「原料未自动扣料，请手工补领」。\n\n**为什么「已领料的部分不重复扣」是必须的**：手工领料和自动倒冲如果各自算各自的，同一种原料就会被扣两次，而且两次都不报错。所以倒冲先读这个工单已经领了多少，只补差额。\n\n**为什么留痕要和实扣一样重要**：自动扣账最大的信任风险不是扣错，而是「扣了但说不清」。所以每一次倒冲都生成一张真实的出库单（可在出库单列表查到）、写入领料台账、并在工单上记下出库单号。将来对账时能一路追到具体单据。' },
          { kind: 'notes', title: '注意事项', text: '· 本次倒冲按**实际完工数量**计算，不是计划数量。计划 10 件只完工 6 件，就只按 6 件耗料。\n\n· 报废品不消耗正常用料：有合格数量时按合格数量计算。\n\n· 同一张物料清单里，虚项（虚拟件）本身不领料，只展开它下面的子件——这与物料清单详情页的领料清单口径已经完全一致。\n\n· 已经完工但原料没倒冲的历史工单，工单页会显示黄色提示，请到「出库单」手工补一张领料出库单。\n\n· 扣料用的是「原料仓」，即主仓库。目前工单上没有可选的领料仓库，全公司统一从原料仓出料。' },
        ],
      },
      {
        id: 'v31900',
        title: 'V3.19.0（2026-09-23）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**付款前的三单核对从「给你看」变成了「真的拦」。**\n\n---\n\n**一、付款前的硬性核对（本次最要紧的一条）**\n\n系统里一直有个「三单匹配」功能，但那只是个对比表——表格上写着「存在差异」，款照样能付出去。现在它是真正的闸门：**建立付款计划、登记付款这两件事，都要先过核对**。\n\n核对的是三张单据能不能对上：采购订单、入库单（货到了多少）、发票（开了多少）。以下四种情况会被直接拦下、不允许提交：\n\n| 情形 | 为什么拦 |\n|---|---|\n| 没填采购订单号 | 付款必须有依据，没有订单就无从核对 |\n| 订单号在系统里查不到 | 单号可能写错了，或填了别家公司的订单 |\n| 开票金额超过订单金额 | 可能超付 |\n| 已入库金额少于发票金额 | 货还没到齐就要付钱 |\n| 本次付款金额超过发票金额 | 付的比发票还多 |\n\n数据对得上的照常放行。**只改备注、改到期日不受影响**——只有真正涉及付款的动作才校验。\n\n---\n\n**二、每次判定都留痕**\n\n谁、什么时候、依据什么数字、结论是放行还是拦截，都会记录下来，可在「三单匹配」页面查看。将来若发现付错款，第一个要回答的就是这几个问题。\n\n---\n\n**三、预付款是例外**\n\n预付款本来就是「先付钱、后拿票」，所以只要订单真实存在，没有发票也会放行（在付款计划上填了预付款金额即可）。\n\n---\n\n**四、三单匹配页面改了口径说明**\n\n以前这个页面的差异列是页面自己算的，与付款时用的口径不同，会出现「页面看着一致、付款却被拦」。现在页面明确标注**付款是否放行以服务端判定为准**，并新增「服务端判定记录」表。\n\n---\n\n**五、采购订单详情页的三单匹配结论也改由服务端给出**\n\n同一个订单，页面上显示的结论与付款时的判定现在是同一套，不会再出现两个答案。', },
          { kind: 'why', title: '为什么这样操作', text: '**为什么这类管控必须放在服务端，而不是界面上**：判断一个管控是否真的存在，判据只有一个——**绕开界面还成不成立**。界面拦截可以绕过（直接调接口、旧版本页面、脚本），服务端不能。所以这次把四个写入路径（付款计划的专用接口两个 + 通用实体接口两个）全部接上同一份判定，只堵其中一个等于没堵。\n\n**为什么判定顺序是「先订单、后金额」**：没有订单依据、订单根本不存在，这两类是根因；金额超差是结果。先报根因，业务人员才知道该去改什么，而不是拿着一个「金额不一致」到处找。\n\n**为什么预付款要单独开一个口子**：预付是正常业务（先付定金、后拿票）。若一刀切要求必须有发票，等于把预付业务整个禁掉——那不是管控，是功能障碍。\n\n**为什么只改备注不做校验**：闸门如果不够精准（连改个备注都被拦），用户的第一反应就是要求把它关掉。闸门一旦被关掉，比从来没做过更糟——因为大家会以为有管控。所以「是否属于付款动作」这件事专门做了判断：状态变成已付、或已付金额增加，才算付款。\n\n**为什么判定口径统一按不含税金额**：三张单据既有含税也有不含税字段，混用会凭空造出 13% 的差异（税率）而造成误拦。统一取不含税口径，跨表比对时用「各自金额 ÷ 同一张订单金额」的比例形式，口径偏差会同向抵消。', },
          { kind: 'notes', title: '注意事项', text: '· **付款计划必须关联真实存在的采购订单**，且订单里要有明细（有金额）。存量里那些没有订单依据的付款计划，在补上订单号之前无法提交付款——这是有意的，不是故障。\n\n· **容差是 1%**：订单 10000 元时，开票在 10100 元以内算一致。\n\n· **数量维度目前不参与判定**：发票在系统里没有明细行，拿不到「发票数量」，所以数量只能作为参考显示，不参与放行判断。若确实要比对数量，前提是先给发票建明细（列入后续规划）。\n\n· **被拦时页面会说明差多少**：例如「已入库 3000 元（到货率 30%），少于发票金额 10000 元，尚差 7000 元货未到」。请按提示先去补数据，而不是反复点提交。', },
        ],
      },
      {
        id: 'v31800',
        title: 'V3.18.0（2026-09-23）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**审批能撤回了、能催办了、出差能委托了；导出的数据有权限和留痕了；单位换算进了正式数据库。**\n\n---\n\n**一、审批中心的三个新动作（对应评测报告差距 9 / 10 / 11）**\n\n此前审批只有「提交」和「通过 / 拒绝」：单子填错了撤不回来只能等对方拒绝；审批人忘了处理没有任何提醒；审批人出差单子就卡死。这一版补齐三件事：\n\n| 动作 | 谁可以做 | 做了什么 |\n| --- | --- | --- |\n| **撤回** | 提交人本人或管理员 | 把单据收回来，**同时把它退回草稿**（不是只改一个状态字段，业务单据真的回到未提交状态），并可重新提交 |\n| **催办** | 提交人本人或管理员 | 提醒当前审批人，系统记录催过几次、什么时候催的；同一单据 30 分钟内只能催一次，避免变成刷屏骚扰 |\n| **委托** | 任何审批人 | 出差 / 请假期间把审批权交给同事，可限定只管某一类单据、也可管全部；委托期内轮到你审批的单子自动转给对方，单子上会标「代某某批」 |\n\n侧边栏「审批中心」新增「我提交的」分组（可催办 / 可撤回）与「审批委托」入口。原先把侧边栏的 ✓ / ✕ 按钮点下去是没有反应的（代码里是待办占位），现在会真的审批，或者在单据不支持快捷审批时明确提示「请到某某页面处理」，不再假装成功。\n\n**二、导出数据的管控**\n\n任何登录用户此前都能把任意列表全量导出为表格，没有权限要求、没有记录、文件里也没有标识。这一版：导出前检查权限；每次导出都写一条审计日志（谁、什么时候、在哪个页面、导出了多少条）；导出的文件名和 CSV 末尾带上导出人与时间戳。\n\n**三、单位换算规则进入正式数据库**\n\n换算规则（如 1 箱 = 12 个）此前只存在浏览器本地，换台电脑就不一样、也不进备份。现已迁入服务端数据库，全公司口径统一，改动有审计记录。\n\n**四、随本轮一并收口的四处遗留缺陷**\n\n这几项不是新功能，是复查时发现「上次说修了、其实没修好」的地方：\n\n| 位置 | 原来的毛病 | 现在 |\n| --- | --- | --- |\n| 质检抽样方案（GB/T 2828.1） | 显示出来的「字码」与「样本量」可能对不上——455 种「批量 × 检验水平 × AQL」组合里有 **124 种互相矛盾**（例如显示「字码 B、样本量 2」，而字码 B 对应的样本量是 3）。检验员照着执行会抽错数量，而质量判定直接建立在抽错的数量上 | 字码与样本量始终取自同一行；实测 455 种组合**零矛盾** |\n| 采购比价的评分条 | 一句本该「鼠标悬停才显示」的提示，被写成了页面上的正文，于是每条评分条旁边都多印出一行 `title="已计算分数"` 的字 | 提示恢复正常（悬停才显示） |\n| 采购比价页的「评分权重」按钮 | 引用了不存在的图标名，该页面**直接编译失败**（打开即白屏） | 换成实际存在的图标，页面恢复正常 |\n| 财务报表页 | 只能打印，不能导出 PDF | 新增「导出 PDF」按钮 |\n\n特别说明最后一张表里的第一项：「字码与样本量矛盾」属于「界面上看着正常、其实给人错数字」的类型，任何类型检查都抓不到（代码语法完全正确），只有把全部组合跑一遍做交叉核对才会暴露。这也是本轮把「同类判定必须放在同一屏对比」列为常规检查项的原因。', },
          { kind: 'why', title: '为什么这样操作', text: '**为什么撤回不能只改一个状态**：如果只把审批记录标记为「已撤回」，而采购申请单本身还挂着「审核中」，那么采购同事看到的仍是「在审」、审批人待办里也还在——用户以为撤回了，实际没有。所以撤回必须在同一动作里把业务单据退回草稿。\n\n**为什么催办要限流**：不限流的话，一个按钮就会被点成骚扰工具，审批人反而会把提醒当噪音忽略。30 分钟是一个「确实能促使处理、又不至于打扰」的间隔。\n\n**为什么委托要单独建一张关系表，而不是在用户资料上加一个「代理人」字段**：加字段只能表达「谁代理谁」，表达不了「代理到哪天」和「只代理采购类」这两件事。而出差是临时性的、范围通常也是局部的——这正是 ERP 里最常见的两种委托场景。\n\n**为什么导出必须留痕**：数据导出后就不再受系统控制（会被转发、会被带走）。系统留不下痕迹，就没法回答「这份客户名单是谁导出去的」。这是合规客户的必问项。\n\n**为什么普通审批人也能看到全公司成员名单**：委托时要选人，而唯一能列出用户的接口只有管理员能用——那结果就是「委托功能对普通主管不可用」。因此新增了一个只返回姓名、部门、角色的轻量名录接口，不返回邮箱和手机号：办事只需要知道找谁，不需要把账号信息全摊开。\n\n**为什么单位换算必须进数据库**：算料算钱都依赖换算率（1 箱到底算 12 个还是 24 个）。它只存在某台电脑的浏览器里，就意味着全公司可能在用不同的换算口径，而且这个错误没有任何地方能看到。', },
          { kind: 'steps', title: '操作流程', text: '**撤回 / 催办**：左侧导航「审批中心」→「我提交的」展开 → 找到单据 → 点铃铛图标催办、点撤回图标撤回。\n\n**委托**：左侧导航「审批中心」→「审批委托」→ 选择受委托人、委托范围（全部模块或某一类）、起止日期、事由 → 「建立委托」。已建立的委托在同一对话框上方列出，可随时「撤销」。\n\n**导出留痕**：任意列表页右上「导出」→ 正常导出即可，系统自动记录。管理员可在「系统设置 → 服务端审计日志」看到全部导出记录（动作类型为 export / batch_export）。', },
          { kind: 'notes', title: '注意事项', text: '· 撤回只对**仍在审批中**的单据生效；若单据已进入后续环节（例如已下单），撤回会被拒绝，请改用驳回或冲销。\n· 催办间隔 30 分钟，界面上会提示还需等待多久。\n· 委托关系建立后，**委托前已提交**的单子也会一并转到受委托人，不需要重新提交。\n· 委托期内原审批人不能再处理这些单据（避免两边都能批），如需自己处理请先撤销委托。\n· 审批通过 / 驳回只能由**当前节点的审批人本人**操作，管理员也不能代办（审批是责任动作，需要「谁批的」可追溯）。管理员若需纠错，走撤回。\n· **「三单匹配」目前不能当作付款的自动闸门**：本项此前在 V3.17.9 被标记为「已修」，本轮复查发现并没有真正接通——后端只是准备好了「超差则阻断」的标记，而界面上的三单匹配是前端自己另算的、从不调用后端那个接口，付款流程也没有读取该标记。也就是说**闸门造好了，但没有人接线，付款实际仍不会被拦**。现已如实记录并列入下一轮整改。在此期间，付款前的一致性核对仍需人工完成。\n\n· **【后记】该问题已在 V3.19.0（2026-09-23）真正接通**：四个写入路径全部接上同一份服务端判定，超差硬拦。本条保留为历史记录，请以 V3.19.0 的说明为准。', },
        ],
      },
      {
        id: 'v31790',
        title: 'V3.17.9（2026-09-21）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**审批中心动态化改造。**\n\n---\n\n**一、删除统一审批中心页面**\n\n此前新增了一个独立的 /approvals 页面用于聚合所有待审批项目。但这版设计有两个问题：一是硬编码了4个固定入口（采购/供应商/物料/价格），二是用户新增其他审批流程时还需要改代码。\n\n所以这一版改成了**完全动态**的审批中心——侧边栏只显示一个「待我审批」按钮，点击展开后显示具体项目列表，每项包含流程名称标签、标题、提交人和时间。\n\n**二、新的审批中心设计**\n\n| 特性 | 说明 |\n| --- | --- |\n| 动态聚合 | 从 purchaseStore / materialApprovalStore / vendorStore / priceStore 实时获取待审批数据 |\n| 折叠展示 | 点击「待我审批」展开列表，每项带 Chip 标签显示审批流程名称 |\n| 自动隐藏 | 无待审批事项时整个分组不显示 |\n| 操作按钮 | 每项提供通过/拒绝按钮（后续对接真实API） |\n\n**三、技术实现**\n\n- 在 Sidebar.tsx 新增 ApprovalCenterSection 组件\n- 新增 PendingApprovalItem 类型定义\n- 添加 IconButton / Chip / Check / Close 图标导入\n- 从各 store 聚合 pending 状态数据，按时间倒序排列\n\n**四、验证结果**\n\n- TypeScript 类型检查 0 错\n- Vite 构建成功（47秒）\n- 页面正常运行，显示3条待审批（供应商准入、采购申请、付款审批）\n- 无回归风险，原有四个审批子路由保持不变',
          },
          { kind: 'steps', title: '操作流程', text: '1. 点击侧边栏「审批中心」分组的「待我审批」按钮\n2. 展开后查看具体待审批项目列表\n3. 点击项目标题跳转到对应详情页（采购/物料/供应商/价格审批页面）\n4. 点击「通过」或「拒绝」按钮处理审批（需后续对接后端API）',
          },
          { kind: 'notes', title: '注意事项', text: '完全动态化设计——新增审批流程只需：① 在对应 store 中维护待审批数据；② 在 ApprovalCenterSection 的 pendingItems 计算中增加过滤逻辑。无需修改侧边栏代码。',
          },
        ],
      },
      {
        id: 'v31780',
        title: 'V3.17.8（2026-09-21）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把此前「来源不明的未提交改动」的 8 个文件统一入库，正式提交到版本历史。**\\n\\n---\\n\\n**一、文件清单与改动说明**\\n\\n| 文件 | 改动 |\\n| --- | --- |\\n| `functions/_shared/entities.ts` | 通用实体资源注册表 `ENTITY_RESOURCES` 大规模重构（对齐新业务域），删除死配置 `rlsScope` |\\n| `src/stores/auditStore.ts` | **前端审计日志 v2**：新增 diff 记录（变更前/变更后快照）、rollbackTo（回滚到指定版本）、version history（版本历史列表） |\\n| `src/components/common/DataTable.tsx` | 默认按 `createdAt` 倒序排序（列表页首屏按最新数据优先展示） |\\n| `src/pages/BOM/BOMForm.tsx` | 用 Snackbar 替换 alert（保存成功提示更友好） |\\n| `src/pages/Price/InquiryForm.tsx` | 同上 |\\n| `src/pages/Price/PriceApproval.tsx` | 同上 |\\n| `src/pages/Price/PriceComparison.tsx` | 同上 |\\n| `src/pages/Sales/SalesOrderForm.tsx` | 微小调整（1 行） |\\n\\n**二、背景说明**\\n\\n这 8 个文件此前一直存在于磁盘上、有未提交的改动，但没有进入 git 版本历史。本项目有自定义 git 加密 filter（`.gitattributes` 配置了 `ssaenc`），其中 `src/stores/**` 和 `functions/_shared/**` 在仓库里是 AES-256 加密存储，磁盘上是明文。\\n\\n经核对：\\n- `entities.ts` 和 `auditStore.ts` 是系统核心文件（后端实体注册表 + 前端审计日志），改动属于功能增强，不是垃圾或临时文件；\\n- 其余 6 个文件是 UI 体验优化（Snackbar 替换 alert + 默认排序），不影响业务正确性；\\n- 全部文件的改动都通过了三门禁验证（后端类型 0 新增 / 语法+打包 0 错 / 前端 tsc 0 错）。\\n\\n**三、版本与发布**\\n\\n五处版本号同步至 V3.17.8（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么要把「来源不明」的文件入库而不是继续忽略**：未提交的改动意味着这 8 个文件的功能增强没有被记录到版本历史里——下次部署时如果误删这些文件，或者换一台机器重建，这些功能就丢了。入库就是给它们一个明确的版本归属，让「这个功能从哪个版本开始可用」有据可查。\\n\\n**为什么不拆成多个版本单独提交**：这 8 个文件原本就是一个工作会话里同时改动的（从改动时间看是连续的），拆开反而会造成历史碎片化。统一为一个版本（V3.17.8）提交，历史更清晰。\\n\\n**为什么不改名为独立的功能版本（比如 V3.18.0）**：V3.17.x 系列一直在修缺陷台账，这次入库的文件属于「基础设施维护 + 体验优化」，不涉及新业务模块或新缺陷修复，升补丁版（.8）更合适，不破坏语义。' },
        ],
      },
      {
        id: 'v31770',
        title: 'V3.17.7（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #10：并发编辑「后提交者静默覆盖先提交者」的隐患——把乐观锁从只有 5 个端点覆盖，铺到全部核心单据；新建单据同时补「幂等键」防双击重复建单。**\\n\\n---\\n\\n**一、乐观锁全量接入（#10 完整范围）**\\n\\n迁移 0072 给 18 张核心业务表统一补 `version` 列（默认 1）：\\n- 单表端点（10 张）：委外订单、凭证、转储单、库存调整单、质检扣留、序列号、物料、客户、供应商、工单领料单\\n- 通用父子框架父表（8 张）：采购申请/供应商报价/项目/发货单/销售线索/付款计划/项目核算/审批流\\n\\n⚠️ **刻意排除两张表**（同名但业务含义是 TEXT 版本的「版本号字段」，接了会破坏语义）：`bom_headers.version` 与 `process_routes.version`——这两处已在 `parentChild.ts` 里登记在 `BUSINESS_VERSION_FIELDS` 白名单内，不会误加锁。\\n\\nPUT 端点分三种接入方式：\\n- **数组式 SET**（14 个端点，含前面 5 个已接+本次 9 个新接）：直接沿用既有 `withVersionGuard({ setClauses, values })` 通道；\\n- **整行 UPDATE**（3 个：库存调整单/转储单/质检扣留）：从内联 SQL 重构为 setClauses/values 结构，统一走守卫；\\n- **COALESCE 式 SET**（3 个：物料/客户/供应商，老业务接口用 COALESCE(?, col) 做"只传了才改"的半更新）：新增 `setSql` 通道（整段 SET 子句字符串），一次改造覆盖；\\n- **通用父子框架 `pcUpdate`**（8 张父表，一次接入覆盖采购申请/供应商报价/项目/发货单/销售线索/付款计划/项目核算/审批流）。\\n\\n**兼容铁律**：客户端不传 `version` 时**保持原行为不加锁**，老客户端零影响。\\n\\n**二、幂等键机制（#10 完整范围 · 新建单据防重复）**\\n\\n新建一张独立表 `idempotency_keys`（迁移 0073，唯一键 `(org_id, idem_key)`），配套写助手 `functions/_shared/idempotency.ts`（`dedupeByNo` 单号查重 + `resolveIdemKey/findIdem/saveIdem` 幂等键三件套）。\\n\\n接入两处：\\n- **通用 `pcCreate` 框架**（8 个端点同步获得幂等键能力）；\\n- **手写 6 个端点的 POST**：入库单/出库单/委外订单/转储单/库存调整单/质检扣留。\\n\\n两道闸：① **单号查重**（有业务单号的端点走 `dedupeByNo`，同组织同单号 → 409）；② **Idempotency-Key 请求头**（无业务单号的端点如质检扣留，或任一有单号的端点额外兜底）。命中登记则回传上次结果并标 `idempotentReplay: true`；**不带键时完全不启用**，老客户端零变化。\\n\\n**三、验证**\\n\\n- 后端双门禁：tsc-functions 0 新增 / _audit_syntax 139 文件语法+打包 0 错；前端 tsc 0 错；\\n- **真实代码实跑 14 条断言全过**（带过期 version 拒 409 / 正确版本放行 / 不传 version 不误伤 / setSql 通道 / 调用方自带 version=? 被剔除防失效 / 幂等键请求头优先于 body / 都无则不启用）；\\n- 附生产域往返验证脚本 `scripts/_verify_10_lock_idem.mjs`（乐观锁冲突 409 / 幂等键重复提交回放 / 单号查重 409 / 老客户端不传 version 放行 + 清理自建数据）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么乐观锁要「只做并发保护，不做功能白名单」？** 因为白名单一旦写漏一条合法流转（系统里已有大量自由流转），线上就会出现大面积「明明合规却被拒」的假错误。并发锁只问一句话——「你手里拿的版本号和数据库里的是否一致」——对合法与否不作判断，只拦并发覆盖，最稳。\\n\\n**为什么新接入 3 个 COALESCE 式端点要新增 `setSql` 通道**：这三张表（物料/客户/供应商）是历史上最早的手写接口，UPDATE 用 `COALESCE(?, col)` 实现「只传了才改」。不能拆成数组，否则要重写 3 个端点所有 SET 语句；新增 `setSql` 通道，不改调用方写法，直接复用守卫。\\n\\n**为什么幂等键要「显式传递」而非自动按请求内容指纹去重**：内容指纹会在「用户确实想连续建两张相同内容单据」时误判合并，属于静默错误——比重复建单更难排查。宁可只做确定性（单号查重）/ 显式（请求头传键）两种，不做猜测式去重。' },
        ],
      },
      {
        id: 'v31760',
        title: 'V3.17.6（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #14：委外加工的成本分配对不平——账面上「委托加工物资」永远结转不掉、「暂估应付」虚挂着本该属于材料的钱。根因有三层，全部修掉。**\n\n---\n\n**一、以前的问题**\n\n委外加工的业务是：把材料发给外协厂（材料成本先转到「委托加工物资」科目），外协厂加工完送回成品（成品价值 = 材料成本 + 加工费）。\n\n| 环节 | 应该怎么记账 | 改之前实际怎么记 |\n| --- | --- | --- |\n| 委外发料 | 借 委托加工物资 / 贷 原材料 | 正确 |\n| 委外收货 | 借 库存商品 / 贷 委托加工物资（材料）/ 贷 GR/IR 暂估（加工费） | **全额挂 GR/IR 暂估** |\n\n后果有两个：① 「委托加工物资」科目的余额永远挂着、结转不掉；② 「GR/IR 暂估应付」虚挂了一笔本该属于材料的钱。月结对账时这两处永远对不平。\n\n**二、三个根因与修法**\n\n**根因一：新建委外入库单时，材料成本这列根本没被存下来。**\n前端委外收货时算好了「材料成本」与「加工费」，也把材料成本随入库单上传了；但后端**新建**入库单的写入语句里漏了这一列——只有「更新」时才会写入。于是每一张新建的委外入库单，材料成本都是默认值 0，后端压根不知道那笔钱是材料还是加工费。（已补列落库。）\n\n**根因二：服务端生成委外入库凭证时「简化处理」，全额挂了暂估。**\n即便拿到了材料成本，原实现也是「全额挂 GR/IR 暂估」。现已改为按材料成本拆账：**借 库存商品（全额）/ 贷 委托加工物资（材料成本）/ 贷 GR/IR 暂估（加工费）**——材料成本从「委托加工物资」结转到成品，「暂估应付」只挂加工费。为兼容旧数据（材料成本缺失的单据），此时退化为全额挂暂估，行为与以前一致；材料成本若因异常超过总额，会被钳制到总额，保证凭证借贷平衡。\n\n**根因三：前端按比例分摊材料成本，多次收货会累积尾差。**\n发出材料 1000 元、分 3 次等量收货时，旧算法每次拿「1000 × 每次比例」各自四舍五入，得 333.33 × 3 = 999.99——与材料总额差 1 分钱；收货次数越多差越大，月结永远差几分钱找不到原因。现已改为**按累计量差分**：本次分摊 = 四舍五入（总额 × 本次后累计比例）− 四舍五入（总额 × 本次前累计比例）。最后一次累计比例达到 1，会自动把尾差补齐，累计相加精确等于材料总额。\n\n**三、验证**\n\n- 分摊算法：真实逻辑实跑对照——差分法分 3 次收货累计精确 = 1000；旧算法累计 = 999.99（差额 0.01），对照成立；\n- 凭证拆账：借 1405 = 100 / 贷 1408 = 66.67 / 贷 2201 = 33.33，借贷平衡；材料成本缺失时退化为全额挂 2201（兼容旧数据）；\n- 后端类型检查 0 新增、语法＋打包 0 错误；前端类型检查 0 错误；\n- 另有生产域往返验证脚本 `scripts/_verify_14_subcontract_cost.mjs`（建委外入库单 → 核对落库字段与凭证拆账 → 清理，需部署后连通生产域跑）。\n\n**四、版本与发布**\n\n五处版本号同步至 V3.17.6（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么材料成本要「先转出、再转回」，不能一次性全额挂暂估**：材料发出去的时候，它已经不在原材料里了，而是变成了「正在外协厂加工的在制品」（委托加工物资科目）。收货时如果把材料成本也挂成「暂估应付」，相当于对同一笔材料重复挂了两笔账——一笔留在委托加工物资、一笔挂成应付，两处都错。正确做法是：材料成本从「委托加工物资」结转到成品，只有外协厂真正提供的「加工服务」才形成暂估应付。这不是记账习惯问题，而是「同一笔钱不能同时被记两次」。\n\n**为什么「新建单据漏列」这种低级错误值得单独修**：因为它是最隐蔽的一类缺陷——界面照常工作、单据照常创建成功、没有任何报错，只有财务月末对不上账时才会暴露，而且极难反查到「原来是这一列没存」。凡是「界面传了、后端没存」的字段，都是静默数据丢失，必须补上并留注释说明。\n\n**为什么分摊尾差要用「累计差分」而不是「最后一次倒挤」**：倒挤（前面按比例、最后一次 = 总额 − 已分摊）也能补齐，但它依赖「记得把前几次算过的和存下来」；而累计差分不需要存任何中间状态——它用「总额 × 累计比例」这个可复算的量作为基准，第几次来都准确，最后一次自然补齐。少一个需要维护的状态，就少一处可能出错的地方。\n\n**为什么旧数据要「兼容退化」而不是强制要求材料成本**：已经建好的历史单据里没有材料成本（当时那列没存），如果改成「没有材料成本就报错」，历史单据的凭证就再也生成不出来。选择「缺失时退化回全额挂暂估」，是让旧数据保持可用、新数据正确拆分——修复不能以「让历史数据不可用」为代价。' },
        ],
      },
      {
        id: 'v31750',
        title: 'V3.17.5（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #8：系统里一直并存「两套账」——正式的「凭证」和一张没有借贷平衡校验的遗留「会计分录明细表」，而报表读的是后者。同一笔业务在两处各存一份，就会各自悄悄漂移。现在报表真源统一改为受保护的凭证表。**\n\n---\n\n**一、以前的问题（两套账）**\n\n| 账 | 是什么 | 有没有校验 |\n| --- | --- | --- |\n| 凭证（vouchers） | 正式记账凭证 | 有：V3.15.9 起服务端强制借贷平衡 |\n| 会计分录明细表（fin_account_entries） | 遗留的扁平分录表 | 没有：可以写任何数 |\n\n关键在于：**试算平衡、资产负债表、利润表、现金流量表、预算控制、辅助核算、分录列表等 7 张报表，读的都是那张没有校验的遗留表**。凭证过账时，又往它里面写一份派生分录——于是同一笔账在两张表里各存一份。\n\n**二、改了什么（报表改读凭证表）**\n\n1. 报表消费的「总账分录」不再是一份独立数据，而是**由凭证派生**——复用系统里已有的转换函数，严格保持「凭证里的一行分录 = 报表里的一条记录」，因此**报表本身一行都不用改**，取数口径和改之前完全一致；\n2. 只有**已过账**的凭证进总账；已红冲的凭证与其红字凭证一起保留（两者金额相反，合并后归零，与原口径一致）；\n3. 凭证的过账、红冲、付款结清、以及每次加载凭证，都改为「由凭证派生刷新」，**不再往旧表另写一份**；\n4. 旧表**停止读写、保留为历史存档**（一个字都不删，历史可查）；\n5. 「会计分录」页的手工录入**正名为「手工凭证」**——录入的一买一卖会归集到一张凭证上，天然借贷平衡；\n6. 分录的「单独修改 / 删除」改为明确提示（请改或红冲它所属的凭证），不再「改了却看不见效果」。\n\n**三、为什么这样最稳**\n\n- **账只有一个来源，就不会再对不上**：以前是「凭证」和「遗留表」两份数据各自可能漂移，现在只剩凭证一份权威数据。\n- **报表零改动 = 零回归风险**：派生严格等比复刻了原来的口径，报表读到的数字和以前一致，但从此受借贷平衡保护。\n- **历史不丢**：旧表原地保留，不删数据，只是不再有人写它。\n\n**四、验证**\n\n前端类型检查 0 错误；生产构建通过（13909 个模块，约 1 分 6 秒）；grep 复核确认代码里已无任何地方再写旧表。另有生产域核对脚本 `scripts/_verify_8_ledger_source.mjs`（按科目对比「旧表口径」与「凭证口径」的余额，让切换影响可见，需部署后连通生产域跑）。\n\n**五、版本与发布**\n\n五处版本号同步至 V3.17.5（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么是「报表改读凭证表」，而不是「给旧表也加上校验」**：给旧表加校验只是让它「少犯错」，但两套账并存的根子还在——同一笔业务仍有两次写入、两个可能漂移的副本。根治的做法是让账只有一个来源：报表读的那份数据，直接由受保护的凭证派生，物理上就不存在「第二个副本」。\n\n**为什么旧表要「留档」而不是「删掉」**：财务数据宁可多留、不可错删。旧表里可能有历史手工分录，删掉不可逆；而只要报表不再读它，留着它对正确性毫无影响，只是少了一个写入方。先「停止读写、原地留档」，等确认若干期间无碍后再由强哥决定是否清理，是最稳的顺序。\n\n**为什么手工录入要改成「手工凭证」**：手工分录如果不经过凭证、直接写旧表，就绕开了借贷平衡校验——这正是缺陷的来源。改成手工凭证后，录入的借贷两方进入同一张凭证，天然受「借贷必相等」约束，漏洞从入口就堵上了。\n\n**为什么保留「多条单边分录合并成一张凭证」的语义**：系统里有些业务是「先记借方一条、再记贷方一条」分别提交的，如果各成一张凭证就会单边不平、全部被拒。按凭证号把同一批分录归集起来合成一张平衡凭证，既守住了借贷平衡，又不改变原有业务写法。' },
        ],
      },
      {
        id: 'v31740',
        title: 'V3.17.4（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #9：单据的状态可以随便改——一张「已完成」的入库单能被改回「待处理」，一张「已过账」的凭证能被改回「草稿」，账实就此不符。现在服务端会把这些非法改动挡在门外。**\n\n---\n\n**一、以前的问题**\n\n全系统 20 多类单据，后端保存时把「状态」当普通字段直接写库，**不做任何校验**。于是无论从界面、还是绕过界面直接调接口／批量导入，都能把单据改成任何状态，最典型的就是：\n\n| 场景 | 改之前 | 隐患 |\n| --- | --- | --- |\n| 已收货的采购订单 | 能被改回「已创建」 | 货已收、库存已入账，单据却显示未收 |\n| 已完成的入库／出库单 | 能被改回「待处理」 | 库存已过账，状态回退造成账实不符 |\n| 已过账的凭证 | 能被改回「草稿」 | 已记账的凭证被改状态，账被打乱 |\n| 已完工的工单 | 能被改回「生产中」 | 已完工的报工记录被推翻 |\n\n**二、改了什么**\n\n新增服务端「单据状态机」，先管住 6 类最高频的核心单据（采购订单、销售订单、工单、入库单、出库单、记账凭证），规则两条：\n\n1. **状态值必须是合法值**——写一个不存在的状态直接拒绝；\n2. **实质完结的单据不可回退**——已收货／已全发货／已完工／已完成／已过账／已关闭／已取消／已红冲，一旦进入就不能改回前面的状态（例如「已过账」的凭证只能「红冲」，不能退回「草稿」）。\n\n**三、刻意「宽松」的地方（不是漏做，是防止误伤）**\n\n除了上面两条，其它状态之间的流转**一律放行**。因为系统里本来就有大量正常的自由流转——比如编辑一张订单时会把状态打回草稿、批量导入可以改状态、收货回写会把订单从「已创建」直接改成「已收货」。若把流转规则卡死，这些正常操作会全部报错。本版只堵「破坏完结状态」这个真正的痛点。\n\n**四、验证**\n\n用真实代码跑了 17 条断言（锁定态回退拒绝、非法值拒绝、合法流转放行、状态不变不误伤、凭证撤审放行），全部通过；后端类型检查 0 新增、语法＋打包 0 错误。另有部署后可在生产域运行的接口往返验证脚本 `scripts/_verify_9_status_machine.mjs`。\n\n**五、版本与发布**\n\n五处版本号同步至 V3.17.4（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么只锁「完结状态」、而不是把每种流转都列成一张精确的表**：精确的白名单听起来更严谨，但系统里存在大量既有的自由流转（编辑保存打回草稿、批量导入、收货回写），一刀切会把它们全部误杀，用户会遇到「好端端的编辑保存报错」。而缺陷台账 #9 的真正痛点，是「已完成／已过账被退回草稿」这类**破坏完结状态**的操作。因此策略是：**非完结态自由流转（兼容现状），完结态一旦进入不可回退（堵住痛点）**。规则要卡在「真正会出错的地方」，而不是卡得越严越好。\n\n**为什么必须放在服务端**：状态是所有业务都要读的共享事实。只要还有别的写入路径（接口、脚本、批量导入、未来的智能助手），规则就必须落在所有路径的交汇点——服务端。判断标准仍是那句：**绕开界面，这条规则还成不成立？**\n\n**为什么「状态不变」和「不传状态」必须放行**：整单保存时，前端会把当前状态原样回传（例如一张已收货的订单，保存备注时仍然带 status=received）。这不是「流转」，如果把它当成非法改动拒掉，那么任何一次编辑保存都会报错。这不是容错，而是必须正确区分「改状态」与「保存单据」。\n\n**为什么凭证的「已审核→草稿」（撤审）要放行、而「已过账→草稿」要拦**：撤审是财务的正常动作（退回重审），草稿不是完结态；而「已过账」意味着账已记入，退回草稿会直接破坏账务，只能通过「红冲」这个专门的会计动作来纠正。规则的松紧，取决于该状态在业务上到底还能不能回头。' },
        ],
      },
      {
        id: 'v31730',
        title: 'V3.17.3（2026-09-19）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #10 的一部分：工单（work_orders）此前没有接入乐观锁，两个人在同一张工单上先后保存，后一个人的修改会静默覆盖前一个人——并发改同一张单，锁形同虚设。**\n\n---\n\n**一、根因**\n\n乐观锁助手 `functions/_shared/optimisticLock.ts` 早就写好了（用「UPDATE 语句本身带 `AND version = ?` 条件、靠影响行数判断冲突」的写法，杜绝「先查后改」的时间窗竞态），但只接到了采购／入库／销售／出库四个订单类接口。生产执行核心的工单 PUT 端点从未接线，且 `work_orders` 表本身也缺 `version` 列。\n\n**二、改了什么**\n\n1. 迁移 0071 给 `work_orders` 补 `version` 列（默认值 1，与既有 4 张订单表同构）；\n2. `functions/api/work-orders/[id].ts` 的 PUT 接入 `withVersionGuard`——客户端带 `version` 时按版本号比对，被别人改过即返回 409（「该单据已被其他人修改，请刷新后重新编辑」），并回传当前版本号；客户端不传 `version`（老客户端）保持原行为，不受影响。\n\n**三、为什么只做工单、没做全部 30 个 PUT 端点**\n\n缺陷台账 #10 的完整描述是「乐观锁仅 4 接口启用、多数更新路径不带版本号、新建无幂等键」。工单是生产域最高频的并发编辑对象，先做它性价比最高、风险最低（纯新增列＋单端点接线，门禁可验证）。「全 30 个 PUT 端点补 version」「新建单据幂等键」属于更大的改造面，需要强哥拍板范围后再做（见待决策）。\n\n**四、验证**\n\n后端类型检查 0 新增、语法＋打包 0 错误；对照既有的 4 个订单接口接线模式确认写法一致。\n\n**五、版本与发布**\n\n五处版本号同步至 V3.17.3。' },
        ],
      },
      {
        id: 'v31720',
        title: 'V3.17.2（2026-09-19）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #12：服务端 6 个文件各自写了一份金额／单价四舍五入函数（round2 / roundAmount / roundPrice），口径碰巧一致但无单一来源，后续改动极易漂移。**\n\n---\n\n**一、根因**\n\n金额精度函数散落在 `voucherGuard.ts`、`voucherWriter.ts`、`fixed-assets/index.ts`、`fixed-assets/deprecate.ts`、`inventoryPosting.ts`、`consolidation/index.ts` 共 6 个文件，每份各写一份 `round2`／`roundAmount`。同源两处实现一旦对不齐，账就会悄悄错（硬规矩㉝：同源两处实现必须对得上）。\n\n**二、改了什么**\n\n新增 `functions/_shared/money.ts` 作为唯一来源，导出 `roundAmount`（金额 2 位）与 `roundPrice`（单价 4 位，规避移动均价滚动误差）；6 个文件删掉本地副本、统一 `import` 共享。纯后端重构，接口与计算口径不变（`+EPSILON` 技巧对两位精度无实质影响，统一后行为一致）。\n\n**三、验证**\n\n后端类型检查 0 新增、语法＋打包 0 错误、对照 6 文件确认无残留本地副本。\n\n**四、版本与发布**\n\n五处版本号同步至 V3.17.2（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。注：V3.17.0（服务端算账闭环）、V3.17.1（折旧彻底服务端化）的说明书版本记录此前漏登，详见主计划 §八。' },
        ],
      },
      {
        id: 'v31610',
        title: 'V3.16.1（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉缺陷台账 #11：物料清单、质检扣留、转储单、库存调整单四个手写端点，提交空请求会生成「全空记录」。**\n\n根因：全局入参校验（validateOrReject）只管「类型／长度／日期」，没有「必填字段」概念，而这四个端点不走通用实体路由、各自手写 INSERT，空请求能穿过去落库。\n\n**改了什么**：在 `functions/_shared/validate.ts` 新增独立 `requireFields` 辅助函数（只被这四个端点调用，不动全局校验器、零概率误伤其它接口），在每个 POST 里校验核心业务字段非空＋至少一条明细，否则返回 400 并提示「请填写 XX 后再提交」。四个端点的必填口径：\n\n| 端点 | 必填字段 |\n| --- | --- |\n| 物料清单（BOM） | BOM 名称 |\n| 质检扣留 | 物料编码、扣留原因 |\n| 转储单 | 调出仓库、调入仓库、至少一条明细 |\n| 库存调整单 | 仓库、至少一条明细 |\n\n**验证**：脚本 `scripts/_verify_11_emptypayload.mjs` 直打生产域，四个端点空请求全部 400、正常请求全部不被误拦、自建测试数据已清理，8/8 断言通过。' },
        ],
      },
      {
        id: 'v31600',
        title: 'V3.16.0（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把「库存数量、移动加权平均价、库存金额」的运算从浏览器挪到了服务端——库存账现在由服务端说了算（对标评测架构级问题，编号 N1）。**\n\n---\n\n**一、以前的问题（说人话）**\n\n入库单、出库单保存时，系统原本在**您的浏览器里**当场算一遍：这件物料现在库存多少、均价多少、值多少钱，再把结果写回物料表。这藏着三处隐患：\n\n1. **算完两边各写各的**：前端算一遍、后端又存一遍，两处逻辑一旦对不齐，账就会悄悄错。\n2. **绕开界面就没人算**：直接调接口、批量导入、脚本对接时，浏览器里的算法根本不参与，库存账要么不更新、要么只更新了一半。\n3. **超发（出库数量大于库存）会被算成负数**：旧算法在「库存」维度用 `Math.min` 把负数夹回 0，但在「物料主数据」维度却允许负数——两套账对不上，月底盘点会发现「库存账说有货、财务账说欠货」。\n\n**二、改了什么（用户能感知到的变化）**\n\n| 场景 | 改之前 | 改之后 |\n| --- | --- | --- |\n| 入库单保存 | 浏览器算库存并写回物料表 | **服务端直接改库存表与库存流水表**，浏览器只做「乐观预览」 |\n| 出库单保存 | 浏览器算成本并写回物料表 | **服务端按移动加权平均价算出库成本、扣减库存**，结果回传前端用于生成凭证 |\n| 超发（出库量 > 库存量） | 库存维度夹 0、物料维度变负，**两套账不一致** | **两个维度统一夹 0**（库存归零、库存金额归零），不再出现「一正一负」 |\n| 凭证（出入库对应的会计凭证） | 前端自己算单价与金额 | 改用服务端回传的单价与金额，数字同源 |\n\n**三、版本与发布**\n\n五处版本号同步至 V3.16.0（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「在浏览器里算库存」是根上的隐患**：库存是**所有业务都要来读**的共享账本。它只要还有别的写入路径（接口、脚本、批量导入、未来的智能助手），运算就必须落在**所有路径的交汇点**——也就是服务端。判断标准还是那句：**绕开界面，这条规则还成不成立？**不成立，就等于没算。\n\n**为什么超发要「两个维度都夹 0」、而不是「允许负数再报警」**：负数库存看似更「真实」（确实出了比库存多的货），但它会在「库存维度」和「物料主数据维度」之间制造矛盾——一个说 0、一个说 -5，任何读库存的地方都会得到两个不同答案。对制造企业而言，「账上到底是 0 还是欠 5」是会直接误导采购和生产决策的问题。强哥拍板的结论是：超发时两套账**统一归零**，把「实际欠多少」留给业务侧的超发提示去处理，而不是让财务账自己演一出负数。**规则搬位置的时候，必须重新问一遍它在新位置上还成不成立**——这正是上一版（V3.15.9 凭证借贷平衡）立的规矩。\n\n**为什么凭证生成这一版还留在前端**：服务端过账已经把「单价、金额」算好并回传给前端，前端凭证拿到的数字和服务端库存账是同一份，所以凭证这一版不必改动、也不会算错。凭证整体下沉服务端属于「跨财务域」的更大改动，留到下一轮专门做，不在本次范围。\n\n**为什么改完必须做真实接口往返验证**：后端代码不在自动类型检查覆盖范围内，历史上出过「检查全绿、上线才炸」。本次专门写了脚本，用隔离测试物料走「入库 10 → 库存 10／金额 100／均价 10 → 出库 3 → 库存 7／金额 70 → 超发出库 100 → 两套账都归 0 → 测试数据全部清理」全流程，六步断言全过才算收口。' },
        ],
      },
      {
        id: 'v315100',
        title: 'V3.15.10（2026-09-20）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修掉两个「平时看不见、出事才后悔」的后台缺陷：一是单据提交内容为空时系统会报错并把数据库内部信息显示出来，二是导出数据不留记录。**\n\n---\n\n**一、问题一：空单据提交会把数据库底细露出来**\n\n采购申请、供应商报价、意向客户、发货单、工艺路线、审批流、付款计划、项目核算、项目这九类单据，在**提交内容完全为空**（或填的字段系统一个都不认识）时，系统不是提示「请填写内容」，而是直接报一个看不懂的错误，并且把数据库的原始报错（含数据库语句片段、表名、列名）一并显示在页面上。\n\n| 场景 | 改之前 | 改之后 |\n| --- | --- | --- |\n| 提交空单据 | 报「创建失败：D1_ERROR: near \\",\\": syntax error」，并把数据库语句片段显示出来 | 提示「请填写采购申请内容后再提交」 |\n| 正常填写后提交 | 正常保存 | 不变（已逐项实测确认九类单据都能正常保存） |\n| 出错时是否泄露内部信息 | **会** | **不会**，内部错误只写进系统日志 |\n\n**二、问题二：导出数据不留痕**\n\n系统里唯一的后台数据导出接口，此前**不会留下任何操作记录**——谁在什么时候导走了哪些数据、导了多少行，事后查不到。本版补上：每次导出都会记一条审计记录，写明导出人、时间、多少张表、多少行、有没有被截断。\n\n**三、版本与发布**\n\n五处版本号同步至 V3.15.10（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么要拦「空单据」，而不是让它报错就算了**：报错也是一种结果，但它给的是错的结果。用户看到的是一句看不懂的英文错误，既不知道自己做错了什么、也不知道该怎么改；而系统本该在第一时间说「请填写内容」。更麻烦的是，**报错信息里带着数据库语句片段**，等于把系统的内部构造告诉了看到这条信息的人——这在安全上是明确要避免的。\n\n**为什么一处修改能修好九类单据**：这九类单据的保存动作走的是同一段共用代码。根因就在这段代码里：当没有任何可识别字段时，它拼出来的数据库语句会多出一个逗号，变成一句语法错误的语句。所以**改根因、而不是改九处表面**——这类「多个地方同时出问题」的现象，绝大多数都指向同一段共用代码。\n\n**为什么改完必须逐项实测**：后台代码不在自动类型检查的覆盖范围内，历史上出过「检查全绿、上线才报错」。所以本次对九类单据逐一实测：空提交应被拦下且不含内部信息，正常填写应仍能保存，保存后立即删除复原——三条全部确认通过后才算完成。\n\n**为什么导出必须留痕**：导出是一个「把整批数据带出系统」的动作，它和「看一眼」性质完全不同。缺少记录就意味着：一旦发生数据外流，事后**无法回答是谁做的、什么时候做的、拿走了多少**。留痕不是为了追责，而是为了让这件事可追溯。同时这里也做了取舍：留痕本身失败时**不阻断导出**（记录写不进去不至于让用户拿不到自己的备份），记录动作自带三层降级。' },
        ],
      },
      {
        id: 'v31590',
        title: 'V3.15.9（2026-09-19）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把「账目正确性」的最后一道闸门从界面挪到了服务端，并把低代码设计器的真实成熟度讲清楚。**\n\n---\n\n**一、问题是什么（说人话）**\n\n会计有一条铁律：一张凭证里，**借方金额合计必须等于贷方金额合计**。此前系统只在**录入界面**上拦这件事——填错了会提示、不准保存。但只要不从这个界面进来，比如直接调接口、用脚本批量导入、第三方系统对接，这道拦挡就完全不存在，一张借贷不平的凭证可以安安静静写进账套，往往要到月底结账、报表对不上时才被发现。\n\n对标评测把它定为**唯一致命级**问题。本版把它补成服务端强制校验。\n\n**二、改了什么（用户能感知到的变化）**\n\n| 场景 | 改之前 | 改之后 |\n| --- | --- | --- |\n| 从界面录入不平凭证 | 提示「借贷不平衡」、不让保存 | 不变（界面仍然拦，反应更快） |\n| **绕过界面**写入不平凭证 | **能写进去，无人知晓** | **直接拒绝，并告诉您差额是多少** |\n| 凭证的「借方合计 / 贷方合计」 | 采信客户端传来的数字 | **改由服务端按分录逐行重算**，杜绝「分录改了、合计没跟着改」 |\n\n拒绝时会同时返回四类明细：缺科目的行、借贷双方都填了的行、借方合计、贷方合计与差额，方便直接定位。\n\n**三、刻意没有做的三件事（都是会踩的坑）**\n\n1. **不拦「金额为负数」**：红字冲销凭证（用来冲掉一张错误凭证的凭证）借贷双方本来就是负数，照搬界面的规则会把**所有红冲凭证全部拒掉**，反而制造事故。\n2. **不拦「已过账凭证不能再改」**：系统里「过账」和「红冲」两个动作是**整张凭证连同分录一起回写**的，若按状态一刀切禁止，会直接把过账和冲销功能打断。\n3. **不重复报「至少两行分录」**：一行分录的凭证必然借贷不平，已被平衡规则覆盖，不必再单独报错。\n\n**四、低代码设计器加标注**\n\n「低代码单据设计器」页面顶部新增一条显著的黄色提示，写明：本页可以定义表单字段、在本页内试填并提交记录，但**尚未接入后端表单引擎**——自定义表单目前不会自动生成独立数据表、不会自动进入审批流与权限体系、也不会出现在业务单据的取数范围中。\n\n保留入口（内部试用仍有价值），但把成熟度讲清楚，避免对外演示时客户误判为已具备完整低代码平台能力。\n\n**五、版本与发布**\n\n五处版本号同步至 V3.15.9（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「只在界面上拦」等于没拦**：界面只是系统的一个入口。只要数据还有别的写入路径（接口、脚本、集成、未来的智能助手），校验就必须落在**所有路径的交汇点**——也就是服务端。判断标准很简单：**绕开界面，这条规则还成不成立？**不成立，就等于没有。\n\n**为什么合计要由服务端重算，而不是相信前端传来的数**：前端传来的「借方合计」本质上是客户端自己算的，它和分录行是两份各自维护的数字。任何一处改动漏了同步，就会出现「明细加起来 100、合计写着 80」的错位，而这类错位在报表上表现为「说不清差在哪」。合计本就是分录的**派生值**，派生值必须由服务端从源头算出来。\n\n**为什么宁可拒绝、也不「先存下来再提醒」**：不平的凭证一旦进了账套，就会污染总账、科目余额表和所有报表；再想修，往往要红冲、重录、重新过账，成本远高于当时拦住。账错了是最贵的错误，而且**越晚发现越贵**。\n\n**为什么红字冲销必须允许负数金额**：红冲的做法是把原凭证的借贷方向原样保留、金额取负，两张凭证相加后科目发生额正好归零。这里的负号是**正确的会计表达**，不是异常数据。把「金额不能为负」这条录入期的防呆规则搬到服务端，会把一个合法且关键的业务动作整体堵死——**规则搬位置的时候，必须重新问一遍它在新的位置上还成不成立**。\n\n**为什么低代码设计器不干脆下线**：下线最省事，但也一并丢掉了内部试用、收集需求的价值。真正的问题是「没说清楚」，而不是「不该存在」。标注成熟度，让看到的人得到准确预期，比藏起来更诚实，也保留了继续演进的空间。' },
        ],
      },
      {
        id: 'v31580',
        title: 'V3.15.8（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版补上一个治理缺口：当一家公司内部没有任何管理员时，它的成员审批与邀请码管理会自动上收到超级管理员。**\n\n---\n\n**一、问题是什么（说人话）**\n\n上一版（V3.15.5）改掉了「谁建公司，谁就自动是管理员」的旧设定，改为由超级管理员在批准时指定角色。这个改动本身是对的，但它留下了一个口子：**如果批准时忘了选「管理员」，那家公司就变成「没人管事」**——本公司没人能审批新成员加入，也没人能更换邀请码。\n\n更关键的是，这个口子**在系统里根本看不见**：没有地方标注「这家公司没有管理员」，超级管理员只能靠一个个翻用户列表去发现。也就是说，申请不会「自动」送到该处理的人面前。\n\n这不是假想问题。上线前核查生产库，**已经存在 3 家这样的公司**：\n\n| 公司 | 成员数 | 管理员数 |\n| --- | --- | --- |\n| 新光专用汽车 | 8 | **0** |\n| 调试公司 | 1 | **0** |\n| 创建公司 | 1 | **0** |\n\n**二、改了什么**\n\n| 位置 | 改动 |\n| --- | --- |\n| 用户管理页顶部 | 新增「需代管」警示横幅：列出无管理员的公司、各有多少成员、多少条申请在等，并说明「这些申请会自动送到本页由您处理」 |\n| 用户管理页 | 新增「只看需代管」一键筛选，只看这些公司的账号 |\n| 用户列表「所属公司」列 | 无管理员的公司打红色「暂无管理员」标记（悬停有说明） |\n| 用户列表操作列 | 新增「设为管理员」一键操作：把成员审批与邀请码管理交还本公司 |\n| 审批对话框 | 属无管理员公司时明确提示「本次由您代管」，并建议选择「管理员」 |\n| 邀请码页 | 新增**公司选择器**（可搜索，需代管的公司排在最前并标注），超级管理员可切换到任意公司代为管理邀请码 |\n| 邀请码页 | 代管其它公司时显示「代管其它公司」标记与说明 |\n| 操作结果提示 | 批准后若该公司仍无管理员，明确告知「已列入需代管清单」，而不是只回一句「操作成功」 |\n| 服务端 · 用户列表接口 | 每条账号新增「所属公司有无管理员」字段；新增需代管公司清单与筛选参数 |\n| 服务端 · 公司列表接口（新增） | 提供公司清单（含成员数、管理员数、有无管理员、需代管标记），供超管选择要代管的公司 |\n| 服务端 · 审批接口 | 回执返回「该公司现在有没有管理员」；属代管审批时在审计记录中明确写明 |\n\n**三、判定口径（怎么算「没人管事」）**\n\n同时满足三条才算「需代管」：\n\n1. **公司已生效**（尚未批准的新公司不计入——它们本就在「新公司待批」队列里）；\n2. **公司内没有任何「启用中」的管理员**；\n3. **公司内有真实成员**（只有平台超级管理员挂名的空壳公司不计入）。\n\n按此口径，生产库中 348 家公司里真正需要代管的是 **3 家**；另有 2 家（只有超管本人挂名）与 120 家（尚未批准的新公司）被正确排除，不进入提醒。\n\n**四、版本与发布**\n\n五处版本号同步至 V3.15.8（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么必须由超级管理员兜底，而不是干脆禁止「公司没有管理员」**：禁止看似更彻底，但它会把一个本可以灵活处理的业务场景堵死——比如公司刚成立、还没决定谁管，或原管理员离职交接期间。正确做法不是「不允许出现」，而是「出现了要有人接得住」。所以本版做的是**自动上收 + 明确标注 + 一键交还**，让缺口可见、可处理，而不是把它变成一道硬性拦截。\n\n**为什么判定口径要加「有真实成员」这一条**：核查生产数据时发现，按「没有管理员」这一条粗判会多出两个假阳性——「创业三人组」与「E2E 自动化测试沙箱」，它们里面只有平台超级管理员本人挂名。这类公司的「管理」由超管自己就能完成，标成「没人管事」是误导，会让提醒失去可信度。提醒一旦有噪声，人就会开始忽略它，这才是最坏的结果。\n\n**为什么「尚未批准的新公司」不计入**：它们的状态是「待批准」，本来就会出现在「新公司待批」角标里，由超管审批。如果它们也计进「需代管」，生产库上这个数字会瞬间变成 120（其中绝大多数是自动化测试残留数据），横幅会立刻沦为无用噪音。**一个只会喊「有 120 家」，却没告诉你是哪几家的提醒，等于没有提醒。**\n\n**为什么「有管理员」的判定要写 IFNULL(status, \'active\')，而不是直接写 status = \'active\'**：用户表的状态字段历史上允许为空值，系统其他位置（如登录校验）也都按「空值视为启用」处理。如果这里直接写 `status = \'active\'`，一位状态为空的管理员就会被漏算，于是**一家其实有管理员的公司会被误报成「没人管事」**。这类因空值导致的假阳性最难排查——数据看起来完全正常。\n\n**为什么邀请码页要专门加一个公司选择器**：这是本次最容易被忽略、但影响最直接的一处。核查发现，服务端**早就允许**超级管理员用 `?orgId=` 参数代管任意公司的邀请码，可是前端从来没有把这个参数传出去，也没有任何界面能选择公司——**能力在后端，入口在前端缺失**。结果就是：一家公司没有管理员时，它的邀请码在界面上真的没人能改。补上选择器后，「发现无管理员公司 → 代管其邀请码 → 指派一位管理员 → 权限交还本公司」这条链路才算完整闭环。\n\n**为什么要在审批回执和审计记录里写明「代管审批」**：常规审批的责任主体是本公司管理员，代管审批的责任主体是平台超级管理员——两者在事后追责与问题回溯时含义完全不同。把「谁替谁做的决定」写进记录，是治理动作必须留下的痕迹，否则将来没人说得清那次批准到底是谁批的。' },
        ],
      },
      {
        id: 'v31560',
        title: 'V3.15.6（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修的是一个「只有重建数据库时才会暴露」的隐患——新环境初始化 / 灾备恢复时，数据库结构搭不完整。**\n\n---\n\n**一、问题是什么（说人话）**\n\n本系统所有数据库表结构，都是靠一串「按顺序执行的结构变更文件」逐个搭起来的（共 70 个文件，编号 0001 到 0069）。系统历次上线时，每个文件都按顺序执行过一次，所以**现有系统的数据库是完整的、业务一直正常**。\n\n但独立测试做了一件事：拿一个**全新的空数据库**，从第一个文件开始一路执行到底——结果**中途失败、断在中间**，后面的结构文件（含最新那一个）全都没执行。也就是说：一旦需要「换新环境重新搭一套」或者「灾备恢复重建数据库」，搭出来的库是残缺的。\n\n**二、断在哪两处**\n\n| 断点 | 表面报错 | 真正原因（说人话） |\n| --- | --- | --- |\n| 第 0054 个文件 | 找不到「期间」这一列 | 该文件要改写三张财务表，写法是「表不存在才建」——可这张表**已经存在**，于是这段等于什么都没做；紧接着又要给表加索引、用到一个从未建出来的列，直接报错中断 |\n| 第 0068 个文件 | 找不到「借方合计」这一列 | 该文件为了改正「单号全局不能重复」的错误规则，要把凭证表**拆掉重建**；重建时要从旧表**抄数据**，抄写清单里包含 8 个列，而新环境里这 8 个列**从来就没被建出来过**（老环境是早年用另一套列名规则建的，所以有），于是抄不动、报错 |\n\n**三、为什么以前一直没发现**\n\n现有系统的数据库是**早年一路建起来的**，那时列名用的是「驼峰写法」（例如 totalDebit），后来系统统一改成了「下划线写法」（total_debit）。第 0064 个文件负责把旧的驼峰列删掉——于是**老环境两种列都有（留下的是下划线那批）、新环境却变成「驼峰被删掉、下划线从未创建」**，两条路径悄悄分叉。只有拿全新空库重建，才会把它露出来。\n\n**四、修了什么**\n\n① 第 0054 个文件恢复成「先删掉旧表、再按新规则重建」（这样「表已存在就跳过」的坑不再存在），并在文件里写明「为什么必须删后建」，防止以后又被改回去；\n② 第 0068 个文件在抄数据之前，先把新环境缺的那 8 个列补齐，抄完再重建；\n③ 登录页注册提示「请填写公司码」统一为「请填写公司邀请码」，与上一版口径一致；\n④ 项目自带的「一致性检查」还顺带抓出并修好了上一版留下的一处**登记遗漏**：上一版新建的一张「已吊销邀请码」记录表没有登记到系统的数据可见性清单里。经核实这两处使用都是服务端直连查询、不会真的读不到数据，但按项目铁律「一张表都不能漏登记」，已补登并写明理由——这也是把「靠人记得住」换成「机器核对」的价值所在。\n\n**五、验证结果（全部实测，不是推断）**\n\n| 验证项 | 结果 |\n| --- | --- |\n| 全新空库从第 1 个文件一路执行到第 69 个 | **一次通过，0 失败、0 报错** |\n| 再重复执行一次（检查会不会重复建列而报错） | 正常跳过，无任何报错 |\n| 全新库 与 现有生产库，**逐张表逐列比对** | **差异 0**（共 102 张表；凭证表 30 列、工单表 35 列、供应商表 34 列全部对齐） |\n| 业务单号「同公司内不重复、跨公司可复用」规则 | 两条路径结论一致，旧的「全局不能重复」规则已彻底清除 |\n| 项目一致性检查（登记清单 ↔ 生产库、前端调用 ↔ 后端路由） | **全部通过**（无漏登记、无僵尸登记、无「前端调了后端没有」的接口） |\n| 类型检查 / 后端检查 / 构建 | 前端 0 错、后端新增 0 条、构建通过 |\n\n**本次修复不影响现有线上数据与日常使用**（现有库的表结构本来就是完整的），它修的是「将来重建数据库能不能一次搭好」。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么这是一个该修的缺陷，而不是可以忽略的巧合**：它的可怕之处在于「平时完全看不出来」——线上一切正常，只有灾难恢复、更换新环境、或拿全新空库做测试时才会一头撞上，而那恰恰是**最不能出问题的时候**。这类「只在重建路径上暴露」的缺陷必须当真缺陷修掉，不能因为「现在没事」就放过。\n\n**为什么两条路径会分叉（值得记住的教训）**：结构变更文件是**可以事后修改的文本**，而已经建好的数据库是**改不了的历史事实**。有人后来把第 0007 个文件里的列名规则从驼峰改成了下划线——改文件不会回头去改已经建好的库，于是老库保留了旧规则下的列、新环境按新文件建出另一种列，两边从此不一致。**判据**：凡是「改动历史变更文件」的动作，都要先问一句「这条路径在全新环境下还成立吗」。\n\n**为什么第 0054 个文件要改回「先删后建」**：上一版为了让「重复执行不会清空数据」而改成「不存在才建」，但那个担心**前提是错的**——这套文件的执行器会记录「哪些文件已执行过」，已执行过的根本不会再执行，所以不存在「重放导致清空」。改成「不存在才建」之后，反而出现了「表已存在→跳过建表→后面却用到了新列」的断层，自己制造了一个真断点。**修问题要盯住真实机制，不能按想象中的机制改。**\n\n**为什么第 0068 个文件敢直接写「补列」而不做防重复**：因为它**在现有库里已经执行过、永远不会再执行**（同一套记录机制），会跑到这一行的只可能是全新库，而全新库一定缺这 8 列。这个「确定性」是结论成立的全部依据，因此已写进文件注释——**将来任何人改动它之前，必须重新确认这个前提**。\n\n**为什么第 0068 个文件不顺手把老文件（0007）也改对**：那样只会改变新环境的建成结果，而第 0064 个文件正等着删掉那些旧列名——一动就是连锁改动、风险更大。现在的做法是「在最后一个碰这张表的文件里，把新环境一次补齐到与老环境一致」，改动面最小、终态可证明收敛。' },
        ],
      },
      {
        id: 'v31550',
        title: 'V3.15.5（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把「公司码」升级为可轮换、带有效期的「公司邀请码」，并修正了「谁建公司谁就自动是管理员」的旧设定。**\n\n| 变更 | 说明（说人话） |\n| --- | --- |\n| **邀请码由管理员设置** | 新增「设置 → 用户与权限 → 公司与邀请码」页面：公司管理员（或系统超级管理员）可在此查看当前邀请码、一键生成新码、设置有效期、暂停/恢复接受新成员 |\n| **有效期** | 新建公司的邀请码默认 30 天有效；管理员可改为 90/180/365 天、任意自定义天数，或设为「永久有效」；到期后该码不能再用于注册（已加入的成员不受影响） |\n| **定期更换（轮换）** | 点「生成新邀请码」即换新码；**旧码立即失效**——旧码会记入服务端「已吊销邀请码」历史表，注册时被明确拒绝并提示索取新码，绝不被误判成「新公司」 |\n| **建公司者不再自动成为管理员** | 旧逻辑：第一个填写某公司码的人会自动成为该公司管理员。现在：建公司者只是「组织创建人」，**角色由系统超级管理员在批准时指定**——批准新公司创建人时会弹出「批准并分配角色」对话框 |\n| **加入仍需审批** | 持有效邀请码注册后，仍需该公司管理员审批通过才能登录（保持原有安全级别） |\n| **邀请码校验** | 注册时校验：邀请码不属于任何公司、属于已停用/已过期的公司、或属于已被更换的旧码——三种情况分别给出明确提示，不再一律建新公司 |\n\n**二、版本与发布**\n\n五处版本号同步至 V3.15.5；数据库迁移 0069 为组织表新增邀请码有效期/轮换/停用字段，并新建「已吊销邀请码」历史表。登录页注册表单的文案由「公司码」改为「公司邀请码（由公司管理员提供）」。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么要把「公司身份」和「加入凭证」拆开**：原来一个「公司码」既是公司的身份证、又是加入的钥匙，所以它一旦要「定期更换」，就会牵扯到公司本身的身份。本版把公司身份交给公司名称承载，邀请码降级为纯粹的「加入凭证」——换码只换钥匙、不换门牌，老成员登录完全不受影响。\n\n**为什么必须记「已吊销的旧码」**：注册逻辑里有一条「邀请码不属于任何公司就建一家新公司」。如果换了码却不记录旧码，那么有人拿着旧码来注册时，系统会认不出它、直接建出一家重名的新公司，反而添乱。把旧码记进历史表，就能在注册时明确告诉他「这个码已失效，请找管理员要新码」。\n\n**为什么建公司者不再自动是管理员**：一个组织的第一位注册者，未必就是适合当管理员的人（可能是先来试用的同事）。把「谁第一个注册」与「谁当管理员」解耦，由系统超级管理员在批准时明确指定角色，权责更清晰，也避免「随手注册就拿到管理员权限」。需注意：若批准新公司创建人时未选「管理员」，该公司将暂无管理员负责审批成员与维护邀请码，界面已就此给出提醒。\n\n**为什么有效期默认 30 天**：设成永久会让离职人员的旧码长期可用，太短又需要频繁重发。30 天是折中值，且管理员可随时改长改短或设永久，兼顾安全与便利。\n\n**为什么仍保留「加入需审批」**：邀请码能挡住「无关的人乱填码进来」，但挡不住「拿到码的人其实是外人」。保留管理员人工审批，是第二道闸——两道一起，才守住现有安全级别。' },
        ],
      },
      {
        id: 'v31540',
        title: 'V3.15.4（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修复登录页「找回密码」入口看不见的问题（纯界面可见性 bug，非功能缺失）。**\n\n「找回密码」功能本身自 V3.14.3 就已存在：登录页有触发按钮、挂了 `ForgotPasswordDialog` 对话框、`authStore` 有 `resetPasswordRequest` / `resetPasswordConfirm`、`functions/api/auth/reset-password-send` 与 `reset-password-confirm` 两个端点也都就绪——整条链路是通的。\n\n但 `Login.tsx` 里那个「忘记密码？点击找回」按钮的文字色被写成了 `rgba(255,255,255,0.85)`（近白色），而它所在的登录卡片是白底，于是「白字印白底」——按钮在网页结构里存在、点得到，但肉眼完全看不见，用户以为没有这个功能。\n\n修复：把按钮文字色改成主题主色 `primary.main`（蓝），在白底上一目了然。仅改样式，不动任何逻辑与链路。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么是「白字印白底」而不是「功能没了」**：先核查了 `authStore` 的两个方法、后端两个端点、以及 `Login.tsx` 的按钮与对话框挂载——全部存在且接线正确，所以排除了「功能没写」。问题只在那一行文字颜色，改色即可、不需要新增任何代码。\n\n**为什么顺带升到 V3.15.4 而不是静默改**：按版本管理铁律，任何可见性/行为变更都要五处同步版本号；登录页找不到入口属于会影响用户感知的可见性缺陷，应如实登记进变更记录，便于日后追溯。' },
        ],
      },
      {
        id: 'v31530',
        title: 'V3.15.3（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版落地安全评测报告的 P1 级修复（四类：并发污染 / 事务缺失 / 多租户唯一约束 / 系统性静默失败）。这四项比 P2 更靠近架构层，已在生产真实库上逐项验证、非纸面修复。**\n\n| 编号 | 问题（说人话） | 修复（做了什么） | 验证 |\n| --- | --- | --- | --- |\n| **DB-001 并发全局污染** | 父子表工厂 `parentChild.ts` 用了一个「模块级全局变量」`jsonCols` 来记哪些列要按网页数据格式存。同一进程里**同时**来两个不同业务的请求（如「建项目」和「建采购申请」），会互相改写这个全局变量，导致某一方的字段被当成错误类型交给数据库，报 `D1_TYPE_ERROR` 500 | 删除全局变量，改成「**每个请求**都从自己的配置里现算一份」（纯函数 `parentJsonSet(cfg)`），请求之间不再共享可变状态 | 后端 `tsc-functions` 0 错；构建门禁 0 错；存量 `npm run check` 门禁 FAIL 0 |\n| **DB-002 主表+子表事务缺失** | 凭证、工单这类「一父多子」的数据，原本是「先写父表、再循环一条条写子表」，中间任何一步失败，就会留下「有父无子」或「半截子表」的脏数据，且无法回滚 | 把父表语句和所有子表语句**合并成一个原子批次**（D1 的 `DB.batch`），要么全成、要么全不成；重复单号的「唯一约束冲突→409」语义保持不变 | 同上；UNIQUE→409 行为不变，调用方无需改动 |\n| **DB-003 多租户唯一约束** | `voucher_no`（凭证号）/ `order_no`（工单号）/ `vendor_code`（供应商编码）原本是**全库唯一**，导致**不同组织**不能用同一个单号（A 组织用了「PZ-001」，B 组织就用不了），而**同一组织内重复**却没被拦住（约束方向反了） | 唯一约束改为**（组织编号, 单号）**联合唯一——同一组织内重复被拒、跨组织可复用同单号。因 Cloudflare D1 **禁止删除自动唯一索引**，改用「**重建表 + 表级 UNIQUE 约束**」等价实现（work_orders / vendors 直接改名重建；vouchers 因有入站外键，先快照子表再解除引用、重建、恢复）；上线前已查重确认 0 行重复、数据无损 | 线上真实库核对：vouchers=43 / voucher_items=86 / work_orders=10 / vendors=15 全部保留；跨组织复用同单号可写入、同组织重复被拒 |\n| **FE-002 消除 b2Api 系统性静默失败** | 序列号 / 委外 / 工单领料三个「岛」的数据写接口一旦失败（断网、未登录、服务器错），前端**一声不吭地返回空、不报错也不提示**，用户以为「保存成功了」，实际丢数据 | 把 b2Api 改成「**失败可观测**」：失败进环形缓冲（上限 50 条，含方法/路径/状态码/报错）、支持订阅通知、`retryAll()` 按原操作重放；新增右下角**非阻塞**同步状态条「N 条本地修改未同步到服务器（点击重试）」。未登录无令牌仍静默返回、不计入失败（与原有 54 处调用约定完全兼容，方法名签名一字未改） | 前端 `tsc --noEmit` 0 错；`B2SyncStatus` 组件接入 `MainLayout`，手动关闭不阻塞 |\n| **FE-002 补刀（同版内）** | 独立 QA 回归抓到：首版 `request()` 对所有非 2xx 都 `recordFailure`，**缺 token 返回的 401 也被计入**，导致未登录用户误见「N 条未同步」假提示（与设计意图「未登录不计入失败」矛盾） | `rawRequest` 缺 token 分支加 `silent:true` 标志；`request()` 改为 `!ok && !silent` 才记录。真实服务端 401（token 失效）仍照常计入，仅「无会话」静默 | 已重建 + 重部署，线上最新 `https://802d2c40.ssa-erp.pages.dev`；两道门禁 0 错 |\n\n**二、版本与发布**\n\n五处版本号同步至 V3.15.3。构建门禁已通过类型检查，已部署生产。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么 P1 排在 P2 之前做**：P2 是「根因清楚、改法固定、低风险」的收口（审计缺口、迁移重放、缺唯一约束），而 P1 四项里有一多半触及**数据正确性与并发安全**——并发全局污染会在高峰时随机 500、事务缺失会留下不可逆的脏数据、唯一约束方向反了会让真实多组织业务互相踩踏。这些不及时修，越往后积压越难查，所以优先于 P2。\n\n**为什么 DB-001 必须消全局变量、而不是「加锁」**：加锁只能串行化、治标不治本，且全局变量一旦被任意一处漏改就又脏了；改成「每请求现算」是从根上消除共享可变状态，连竞态的土壤都没了。\n\n**为什么 DB-002 用 D1 的 batch 而不是自己写事务回滚**：Cloudflare D1 的事务语义靠 `DB.batch`（一组语句原子执行），这是平台给的、可靠的原语；自己手写「先写后删补偿」既复杂又容易漏边界。batch 把「要么全成要么全不成」交给引擎保证。\n\n**为什么 DB-003 不能「直接删索引重建」（诚实说明平台限制）**：Cloudflare D1 出于底层限制，**不允许删除由 UNIQUE / PRIMARY KEY 自动生成的索引**（会报 `index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped`）。原生 SQLite 可以，但 D1 不行。所以只能用「重建表 + 表级 UNIQUE 约束」这条等价路径——先把数据拷出来、建一张带正确约束的新表、把数据搬回去、删旧表。这是 D1 上的标准做法，已用「生产 schema + 真实数据」在本地复现验证过无损，才上生产。\n\n**为什么 FE-002 只做「可观测 + 重试」、不改成「失败就弹窗阻断」**：b2Api 有 54 处调用点，一旦失败就弹窗会打断大量正常交互（比如离线暂存本就是预期行为）；正确做法是「先记录、再提示、可一键重试」，既不丢数据、也不阻塞操作。未登录无令牌的返回仍保持静默，是因为那本就不是「失败」而是「未授权」，计入失败反而会误导用户。' },
        ],
      },
      {
        id: 'v31520',
        title: 'V3.15.2（2026-09-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版是安全评测报告的 P2 级质量修复收口（明确、低风险、有现成修法的问题）。**\n\n经审计复查，本轮落地四处修复：\n\n| 编号 | 问题 | 修复 |\n| --- | --- | --- |\n| SEC-002 审计缺口 | 注册、激活、修改密码、重置密码四个后端接口此前漏写审计日志，特权操作没有留痕 | 四个接口统一补写审计（操作人、动作、时间都记录进审计表） |\n| DB-005 迁移重放风险 | 财务域迁移 0054 用「先删表再建表」，重新部署会把已存在的财务数据表清空 | 改为「表不存在才建」，已存在的表原样保留，数据不丢 |\n| DB-007 凭证红冲 500（前提澄清） | 审计报告称 vouchers 的红冲字段（reversed_by / reversed_at）被上一轮误删、红冲写这两列报 500。但线上真实库核查：这两列**并未被删、仍然存在**（vouchers 共 30 列含此两列），端点映射 reversedBy→reversed_by、reversedAt→reversed_at 正确、入参校验放行，红冲在当前生产库下**不会因缺列而 500** | 原 0066 按「补建列」写法反而因「列已存在」报错、阻断部署；已改为幂等占位（仅登记不建列）解除阻塞，使 0067 唯一索引下发。DB-007「缺列导致 500」根因不成立，已如实更正（若仍能复现 500 请另查并提供复现步骤） |\n| DB-008 缺唯一约束 | 项目核算科目映射表没有唯一约束，同一组织下能重复录入相同科目 | 补（组织编号, 科目编码）唯一索引，上线前已查重确认无重复数据 |\n\n另有两项（DB-006 蛇形字段转换、FE-006 本地存储迁移）经逐行核实原已正确，本次不动。\n\n**二、版本与发布**\n\n五处版本号同步至 V3.15.2。构建门禁已通过类型检查。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么这些要修、为什么低风险**：它们都是「评测报告里明确点名、根因清楚、改法固定」的缺陷，不像 P1 级（并发竞态、事务缺失、多租户唯一约束）那样需要动架构，所以本轮优先收口。\n\n**审计缺口为什么必须补**：注册和改密是账号安全最敏感的动作，不写审计就等于「谁建了账号、谁改了密码」全无记录，事后无法追溯——这恰恰是合规和安全的底线。\n\n**迁移为什么不能「先删再建」**：迁移脚本在每次部署都会重跑（幂等），如果写「删表再建」，第一次建好的表在第二次部署时会被清空、数据全丢；改成「不存在才建」才能安全反复部署。\n\n**红冲字段为什么不是「被误删要补回」（诚实更正）**：审计报告 DB-007 原论断是「上一轮清理驼峰坏列时把红冲字段 reversed_by / reversed_at 一起删了，列没了红冲就 500，需补回」。但逐层核对迁移与线上库后推翻了它——迁移 0064 只删了**驼峰**列 `reversedBy` / `reversedAt`，从未碰**蛇形**列 `reversed_by` / `reversed_at`；这两列自最早建表起就一直在库里（线上查证 vouchers 含这两列）。红冲代码往蛇形列写值、映射与校验都正确，所以「缺列 500」在当前生产库下不成立。原 0066 迁移照「补建列」写，部署时反而因列已存在而报「duplicate column name」、把 0067 也卡住。因此本版不补列，而是把 0066 改成「只登记、不建列」的幂等占位，先解除部署阻塞。**若你在线上仍能复现红冲 500，那是另一回事，需要另查（请给复现步骤），不能算在本条已修复里。**\n\n**唯一约束为什么先查重再建**：建唯一索引时如果表里已有重复数据，建索引会直接失败；上线前用「按组织和科目分组、查重复行」确认 0 行重复，才安全地建了索引。' },
        ],
      },
      {
        id: 'v31500',
        title: 'V3.15.0（2026-09-17）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修的是「个人中心里邮箱显示未绑定、部门显示未设置」的显示问题，并顺手把个人工作台和个人中心合并、补上了手机号字段与自助改资料能力。**\n\n---\n\n**一、先说用户看到的现象与真相**\n\n用户反馈：个人中心里「邮箱显示未绑定」「部门显示未设置」，且之前明明设置过两个邮箱。\n\n真相不是数据没存，而是**前端拿不到这些字段**——登录接口只返回了 5 个字段（id / 组织 / 用户名 / 姓名 / 角色），把 department / email / 备用邮箱 / 手机号 全漏了。个人中心只能显示「未绑定 / 未设置」的占位文案。\n\n---\n\n**二、修了什么**\n\n**1. 补齐资料字段返回（根因修复）**\n\n| 改动 | 作用 |\n| --- | --- |\n| 新增 `toClientUser()` 规范化函数 | 登录接口、`/api/auth/me`、自服务更新三处统一从这里取字段，杜绝各写各的漏字段 |\n| 登录接口现在返回 department / 主邮箱 / 备用邮箱 / 手机号 | 个人中心能正确显示，不再显示占位文案 |\n| 应用启动时自动调一次 `/api/auth/me` 刷新当前用户 | 避免「已登录的旧会话」一直显示旧占位（刷新一次即补齐） |\n\n**2. 新增手机号字段（个人资料可改）**\n\n数据库里 `users.phone` 列早就存在，之前只是前端没展示、接口没返回。本版补上展示 + 自助修改。\n\n**3. 个人资料区分「可改」与「只读」**\n\n| 字段 | 谁能改 |\n| --- | --- |\n| 姓名 / 手机号 / 主邮箱 / 备用邮箱 | 本人自助修改 |\n| 用户名 / 部门 / 角色 / 状态 | 管理员在「用户管理」设置，个人中心只读并标注「管理员设置」 |\n\n**4. 新增自服务资料更新接口** `/api/auth/profile`（PATCH）\n\n只接受白名单字段（name / phone / email / altEmail）；任何试图改「部门 / 角色 / 用户名」等管理员字段的请求，一律拒绝并提示「由管理员设置，不可自行修改」。每次成功修改都写一条审计日志。\n\n**5. 个人中心与个人工作台合并**\n\n原本是两个独立页面、两个入口。现合并为一个页面、三个标签页：\n\n- **我的工作台**：原工作台（待办、预警、业务监控、常用功能）原样保留；\n- **个人资料**：展示 + 自助编辑（含手机号），用户名/部门/角色只读；\n- **账号安全**：修改密码（凭当前密码）。\n\n侧边栏「个人工作台」改为「个人中心」，头像菜单去掉重复的「个人工作台」项，`/workbench` 旧地址自动跳转到 `/profile`。\n\n---\n\n**三、版本与发布**\n\n五处版本号同步至 V3.15.0（src/version.ts / package.json / 项目记忆 / 本主计划 / 本手册）。构建门禁已通过类型检查。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「未绑定」是接口漏字段、不是数据没存**：个人中心里凡是显示「未绑定 / 未设置」的地方，99% 不是数据库空，而是「前端去要这个字段、后端没给」。这类问题的判据是——先去核对接口到底返回了什么字段，而不是去改显示文案。上一版之所以能修，正是因为在排查「线上找不到改密入口」时，顺手把接口返回字段量了一遍，发现少了整整四个。\n\n**为什么要把工作台和个人中心合并、而不是两页并排**：用户之前「找不到修改密码的位置」，根因之一正是入口太多、名字还不一样（一个叫个人中心、一个叫个人工作台）。合并成「个人中心」一个入口、三标签页，既减少入口数量，也避免「想改资料却点进了工作台」这类走错路。\n\n**为什么只读字段要显式标注「管理员设置」而不是干脆不显示**：不显示会让用户以为「系统没给我部门信息」，反而来问；标注清楚「这是管理员设的、你不能改」，既给了信息、也挡住了「我改了怎么没反应」的误解。这是把「权限边界」做成可见，而不是藏起来。\n\n**为什么自服务接口要搞「白名单 + 越权拒绝」而不是「前端不给输入框就行」**：前端不显示输入框，只是「看不见」，后端如果照单全收，任何一个会抓包的人都能把 `department` 或 `role` 一起 POST 上来改掉自己。所以白名单在服务端落地，不在前端——这是边界必须守在服务端的原则。\n\n**为什么应用启动时要自动刷新一次当前用户**：因为已经登录的用户，其资料是从「上次登录时返回的字段」里取的。新版本接口虽然开始返回新字段，但旧会话里存的还是旧的五个字段，不刷新就永远显示旧占位。启动刷一次，旧会话也立刻补齐，不必让用户退出重登。' },
        ],
      },
      {
        id: 'v31440',
        title: 'V3.14.4（2026-09-17）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版修的是「发布通道」和「一个点了会报错的导出按钮」，并首次把新功能真正推到线上做了实测。**\n\n---\n\n**一、先说为什么要做这一版**\n\n用户反馈「线上找不到修改密码的位置」。排查发现两个问题叠加：\n\n| 问题 | 事实 | 后果 |\n| --- | --- | --- |\n| **线上还是旧版本** | 线上打包文件里查不到新页面（`PersonalCenter=false`、版本号 `3.13.0`） | 新功能写了、提交了，但**从未发布到线上** |\n| **构建门禁被卡死** | `npm run build` 的第一步是类型检查，而 `ConsolidatedReport.tsx` 有 **13 条历史类型错误** | 构建直接失败，**任何新版本都发不出去** |\n\n第二条是关键：**发布通道本身是断的**，所以不只是这一个功能没上去。\n\n---\n\n**二、修了什么**\n\n**1. 清掉 13 条历史类型错误（恢复构建绿灯）**\n\n| 错误类型 | 数量 | 说明 |\n| --- | --- | --- |\n| 导出数据结构不符合通用导出组件契约 | 6 | 只给了表头和二维数组，缺少组件要求的「列定义」和「文件名」 |\n| 表格单元格用了不支持的属性 | 7 | `fontWeight` 不是表格单元格的合法属性，改用样式对象 |\n\n**2. 让合并报表的三个导出按钮真正可用**\n\n试算平衡表 / 合并资产负债表 / 合并利润表 三个视图的导出按钮，此前传的数据结构与通用导出组件不匹配。现已按标准契约重写，并让导出文件名带上会计期间（如「合并资产负债表_2026-09」），避免多次导出后文件名分不清。\n\n**3. 清理 3 处历史遗留的无用引用**（下载图标、对话框组件、旧导出函数）。\n\n**4. 线上发布 + 真机实测**\n\n| 实测项 | 结果 |\n| --- | --- |\n| 登录页「找回密码」入口与对话框 | 可见、可打开 |\n| 头像菜单里的「个人中心」 | 可见、点击后正确进入个人中心页 |\n| 个人中心「修改密码」表单 | 正常渲染（当前密码 / 新密码 / 确认新密码 + 保存修改） |\n| 输入错误的当前密码 | 页面正确提示「当前密码不正确」 |\n| 输入过弱的新密码 | 页面正确给出长度/复杂度提示 |\n| 页面运行期脚本错误 | **0 条** |\n\n后端接口另做了完整往返实测：错误当前密码被拒、弱新密码被拒、改密成功、新密码可登录、改回原密码、旧登录凭证被注销——全部符合预期。\n\n---\n\n**三、顺带发现的一条缺陷（尚未修复，已登记）**\n\n在实测过程中抓到一批创建失败（服务器报错 500）。根因是**通用父子表工厂**在「哪些列要按 JSON 存储」的登记表缺项时，会把数组/对象原样交给数据库，数据库不接受对象类型，于是创建直接失败。表现是「新建项目 / 采购申请 / 意向客户」时部分字段（参与人、物料、材质等）写入报错。**这条属于「登记表与真实情况不一致」的老问题类别**，已登记待修。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「版本写对了、功能也测过」还会出现「线上找不到」**：因为「提交到代码库」「构建成功」「部署上线」是三件独立的事，任何一环断掉，用户看到的都是同一句话——「没有这个功能」。这一轮真正断的是第二环（构建门禁），而它断掉的原因不是新代码写错，而是**一个上一版留下的历史类型错误**。\n\n**★ 最该记住的一条：构建门禁被历史错误卡住，会伪装成「新功能没做」。** 新功能明明写完了，但发布通道堵着，从用户视角看等于没做。所以「构建能不能过」必须当成第一优先级的事实去核实，而不是默认它会过。\n\n**为什么类型检查要放在构建第一步**：它能在代码离开开发机之前拦住错误。这次它拦住的正是「导出按钮传错数据结构」——这类错误在开发机上往往「界面能点、点了才崩」，属于最难靠肉眼发现的隐性缺陷。它被拦住越早，修起来越便宜。\n\n**为什么导出要按统一契约走，而不是每个页面各写一套**：因为「导出」在这个系统里已经被封装成通用能力（CSV / Excel 两种格式、按钮样式、空数据禁用提示都统一了）。每个页面各写一套的代价是不一致的体验和反复出现的同类错误——这一版的 6 条类型错误就是「写的时候没照契约来」的直接后果。\n\n**为什么这次要真机去点一遍，而不是只看构建成功**：前端构建工具只做语法转换，**不做「引用的东西是否真的存在」的检查**。也就是说，一个新页面即使引用了不存在的东西，构建也会成功，只有在浏览器里真正打开才会白屏。所以规矩是：**新页面必须真的打开一次**。这一轮实测就是这么做的，同时也顺带验证了「按钮点了会怎样」「报错提示长得对不对」这些构建永远查不出来的事。\n\n**为什么实测中发现的服务器错误不当场改**：它出在**通用的父子表工厂**里，一处改动会影响所有走这条通道的模块（项目、采购申请、意向客户、工单、发货单等）。这类改动必须先确认「读取端期望的是什么格式」，否则「写不进去」可能被改成「写得进去但读出来是乱码」。所以先登记证据与根因，确认后再动。' },
        ],
      },
      {
        id: 'v31430',
        title: 'V3.14.3（2026-09-17）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**补齐「找回密码」与「修改密码」两项长期缺失的账号安全能力。**\n\n**一、登录页「找回密码」**\n- 登录框下方新增「忘记密码？点击找回」入口，弹出对话框；\n- 流程：填用户名 → 系统向账号注册邮箱发送验证码 → 填验证码 + 新密码 → 重置成功；\n- 安全设计：验证码 5 分钟有效、连错 5 次作废、重置后强制注销该账号全部其他设备的登录态。\n\n**二、个人中心「修改密码」**\n- 顶部头像菜单新增「个人中心」入口；\n- 个人中心页展示当前用户资料（姓名/部门/邮箱/角色），并提供「修改密码」卡片：输入当前密码 + 新密码即可修改，全角色可用。\n\n**三、后端增强**\n- `change-password` 接口新增「当前密码改密」路径（全角色），保留超管双邮箱票据路径（向后兼容）；\n- 新增 `reset-password-send` / `reset-password-confirm` 端点 + `verification.ts` 单邮箱验证码能力（发码 / 校验消费）；\n- `authStore` 新增 `changePasswordSelf` / `resetPasswordRequest` / `resetPasswordConfirm`。\n\n**四、顺手修复**\n- `Login.tsx` 中 `activationInfo` 被重复声明两次（V3.14.x 遗留 TypeScript 报错），已删除重复份。\n\n**说明**：此前整套密码机制仅超管可用，普通用户无法自助找回/修改密码；本版从底层打通全角色，并补上缺失的 UI 入口。找回密码需账号已绑定邮箱且邮件通道已启用（安全中心配置），未绑定邮箱的账号提示「联系贵公司管理员重置」。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么之前没有这两功能**：登录页与个人中心从未接入密码自助流程，而底层 `send-code`/`change-password` 双邮箱验证原本专为超管设计，普通用户调用会被直接拒绝（「该账号无需邮箱验证码」），导致前端无从接界面。\n\n**为什么「修改密码」用「当前密码」而非邮件**：对已登录用户，凭当前密码改密是业界最自然、最安全（防他人盗号后改密）的自服务方式，且全角色一致、不依赖邮箱配置；超管的双邮箱高安全路径保留不动，向后兼容。\n\n**为什么找回密码强制注销其它设备**：重置密码意味着「原密码可能已泄露」，注销全部会话可阻断盗号者继续持有有效令牌，是账号安全底线做法。' },
        ],
      },
      {
        id: 'v31300',
        title: 'V3.13.0（2026-09-16）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版把系统从「单组织、一套账」升级到「一个公司可以有多套账 + 可以出合并报表」的地基。一句话：合并报表的发动机装好了，且用一套端到端能跑通的数据验证了它确实会算。\n\n---\n\n**一、先说改了什么（地基层，用户看不见但缺一不可）**\n\n| 改动 | 作用 |\n| --- | --- |\n| `orgs` 表加 5 个集团化字段（`parent_id` 上级公司 / `org_type` 公司类型 / `ledger_code` 账套编码 / `currency` 本位币 / `group_id` 所属集团） | 让「总公司和子公司」「一家公司的不同账套」在数据结构上能被表达 |\n| `vouchers` / `voucher_items` 加 `ledger_book` 账套维度（默认 `0000`=法定账套） | 一张凭证从此能标明它属于哪套账，老凭证不填也按法定账套算，行为不变 |\n| 新建 4 张合并表：`ledger_books` 账簿 / `consolidation_groups` 合并范围 / `elimination_rules` 抵消规则 / `consolidation_runs` 合并结果 | 合并报表的「配置」和「跑出来的结果」都有地方存 |\n\n**二、合并发动机怎么算（核心逻辑）**\n\n合并报表的本质只有两步：① 把参与合并的各个会计主体（各账套 / 各公司）的凭证，**按科目汇总借贷**；② 把母子公司之间的**内部往来互相抵消**（母公司应收 = 子公司应付，合并后应当压成 0，否则收入利润凭空翻倍）。\n\n本版做了**两个口径（scope）**：\n\n| scope | 含义 | 验证方式 |\n| --- | --- | --- |\n| `books` | 同组织内的多套账合并 | 门禁主验证路径（见下文「为什么这样设计」） |\n| `group` | 集团跨组织合并（母公司 + 子公司） | 基础设施已建好，权限闸门已加，待联调 |\n\n**三、门禁怎么证明它真会算**\n\n新增第 24 套件（22 条断言）：在同一个组织里建「法定账套 0000」和「管理账套 1000」两套账，录两笔互为镜像的内部往来凭证（法定账套借「内部应收 C2ARB」100、贷「银行 C2BANK」100；管理账套借「银行 C2BANK」100、贷「内部应付 C2APB」100），然后跑合并。断言全部命中：\n\n- 跨账簿科目「银行 C2BANK」被两账套汇总到一起；\n- 内部应收「C2ARB」抵消后余额 = **0**；\n- 内部应付「C2APB」抵消后余额 = **0**；\n- 抵消明细里这一笔的金额 = **100**；\n- 未登录访问被拦（401）；集团口径没有配置范围时返回 404。\n\n**四、版本与门禁**\n\n全量生产门禁 **PASS 961 / FAIL 0**（24 套件 / 共 977），较上一版 939 增加 22 条断言。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么先做「地基」而不是一上来就做完整集团合并**：合并报表在 ERP 里是 C 级（增强）路线的第二块（C2），排在 C1 数据关系化七域之后。这一版的目标是「把发动机装好并证明它会转」，而不是「把全集团报表做漂亮」。所以优先把数据维度（账套、集团、抵消规则）和引擎（双 scope 聚合 + 抵消）一次性做对，前端只给一个能触发合并、能看结果的页面。\n\n**★ 最关键的一个设计判断：门禁主验证为什么走「同组织多账簿」，而不是「集团跨组织」**。原因很实在——生产门禁每轮只在隔离组织里注册**一个**公司，没有「建子公司、用子公司账号登录、再合并」这条链路（跨组织登录成本高、且会污染共享生产库）。如果硬要做跨组织验证，要么改门禁框架（风险大），要么往生产库塞假子公司（污染）。\n\n但「同组织多账簿合并」和「集团跨组织合并」**用的是同一套发动机**——都是「按科目汇总 + 内部往来抵消」。区别只是数据来源的范围（一套账内的不同账套 vs 不同公司的账）。所以选同组织多账簿作为主验证路径，**既真实验证了聚合和抵消这两件最容易算错的事，又不必付出跨组织登录的代价**，且全量门禁保持 FAIL 0。集团跨组织的那层（orgs 集团化字段 + group scope + 跨组织权限闸门）已经一并建好，等将来有真实的母子公司数据时联调即可，不会推倒重来。\n\n**为什么跨组织读取必须单独加闸门、不能靠 RLS 的 `all`**：`rls.ts` 里把合并表登记成 `all`，只保证「本公司内所有人都能看这张配置表」，**不等于「可以跨公司把别家的数据拉来合并」**。合并的 group scope 必须再校验「当前用户所在组织是不是合并范围里的成员、或者是不是特权角色」，不是成员就 403。这是两道不同的门：RLS 管「单行能不能看」，跨组织聚合管「能不能把多个组织的数据算到一起」。只登记 RLS 会漏掉第二道门，后果是「随便一个组织都能合并别家的账」。\n\n**为什么「内部往来抵消」是合并报表里最该测、也最容易算错的一环**：不抵消，母子公司之间的应收应付、收入成本会在合并层面重复计算，报表凭空膨胀。这一版用「借应收 100 / 贷应付 100」的镜像凭证，专门把「抵消后余额归零、抵消明细金额=100」钉成断言，就是在防这种最典型的合并错报。\n\n**为什么沿用通用资源路由、零新增端点**：账簿、合并范围、抵消规则这三个配置都是「建表 + 登记进 ENTITY_RESOURCES」就能有完整增删改查，不需要为它们写专属接口——这是前七域沉淀下来的模板，继续用就不会新增维护面。' },
        ],
      },
      {
        id: 'v31200',
        title: 'V3.12.0（2026-09-16）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**这一版做了三件事：① 把生产域（工艺路线、生产建议）迁进真正的数据库；② 把系统里 5 份「登记表」全部和真实数据库对了一遍；③ 清掉会计凭证表里 9 个重复列。其中②③各挖出了「一直存在、但没人发现」的问题。**\n\n---\n\n**一、生产域迁进数据库（第七个模块）**\n\n先说一个重要发现：**「生产域」这个说法容易误导**。动手前按惯例数了三件事，结果是：\n\n| 数什么 | 数出来 |\n| --- | --- |\n| 谁在用它 | 工单模块 **25 个页面**、执行层 **9 个页面** |\n| 打包文件体积 | **3.7 KB** |\n| 里面还剩什么 | **只剩 2 类**：工艺路线 2 条（含 10 道工序）、生产建议 4 条 |\n\n**工单本身早就迁进数据库了**（以前做的）。也就是说，真正没迁的只有上面两类。\n\n如果照着「生产域 3.7 KB」这个旧结论直接建工单表，会做出一张**和已有表重复、而且根本没人往里写**的空表。\n\n**教训：体积和用量说明的是「这个模块有多大」，不是「这个模块里还剩下什么没迁」。** 后者要看「现在还在往打包文件里写什么」——那才是事实。\n\n**迁的时候做了两处区分：**\n\n| 数据 | 为什么单独处理 |\n| --- | --- |\n| 工艺路线 | **有嵌套**：一条路线下面挂多道工序，每道工序还带「技能要求」→ 必须父子两张表 |\n| 生产建议 | 13 个字段全是单值，**没有嵌套** → 用现成的通用通道即可，不新增接口 |\n\n**顺带修掉一个历史问题（很重要）**：以前的两次数据回填，把数据存到了**错误的公司名下**。表现是——迁移执行成功、条数对得上、自动检查全绿，**但真正的使用者打开页面看到的是空列表**。这是最难发现的一类故障：所有"看起来该对的"都对，只有用户看到的不是那么回事。\n\n---\n\n**二、把 5 份「登记表」和真实数据库逐条对了一遍**\n\n系统里有 5 份手工维护的登记表（权限表、资源表、父子表关系、备份范围等）。它们和上一版修的「字段类型表」是同一类东西——**两边各写一份，靠人记住对齐**，时间一长就会漂移。\n\n新建了一个核对程序，以**数据库里真实存在的表**为唯一标准，双向核对（既查"库里有、表里没登记"，也查"表里登记了、库里根本没有"）。\n\n结果：**94 张表，两边完全一致，零漂移。**\n\n**★ 核对程序自己有 4 个毛病，每一个都会给出假结果：**\n\n| 毛病 | 后果 |\n| --- | --- |\n| 权限表其实由两张表共同覆盖，我却只查了其中一张 | 19 张表被**误报**成漏登记 |\n| 找括号时命中了类型声明里的方括号 | 一张表被判成「0 项」 |\n| 有一份是对象结构，我却按数组去找 | 又一张表被判成「0 项」 |\n| **★ 把「0 项」当成了通过** | 解析失败时"错漏"自然是 0，于是给出一片**假绿灯** |\n\n**最后一条最危险**，已加闸门：**任何一份清单解析出 0 项，直接判失败**，逼人去看，而不是给个漂亮的通过。\n\n---\n\n**三、★ 挖出 3 个「界面在调、但后端根本没有」的功能**\n\n顺着「接口清单」继续查，发现 3 个功能在生产上**根本调不通**：\n\n| 功能 | 修复前 | 后果 |\n| --- | --- | --- |\n| 金税网关配置 | 返回的是**网页**而不是数据 | 页面「加载/保存/清除」三个操作全部失败 |\n| 智能问数（ChatBI） | 返回「方法不允许」 | 无论问什么都失败 |\n| 配额查询 | 返回的是**网页** | 功能从写好那天起就没被接上过 |\n\n**根因是同一条规则**：这类后端服务里，`index` 文件只负责**根路径**，子路径必须有自己的文件。旁边一个能正常用的功能就是这么写的，所以它能用。\n\n修法是**新建 3 个转发文件**（逻辑仍只在原处一份，不复制实现）。选它而不是"改前端地址"，是因为这样前端零改动、不会漏改，也和既有写法一致。\n\n**★ 这里踩到一个很容易被误导的坑：在这个架构下，用「返回码」判断接口存不存在是不可靠的。** 实测连一个瞎编的地址，返回码也是「200 成功」——因为系统会把认不出的地址统统送回首页。\n\n**可靠的判据是「返回的是数据还是网页」。** 并且每次探测都要带**对照组**：瞎编的地址必须判"不存在"、登录接口必须判"存在"，否则整批结论作废。\n\n---\n\n**四、清掉会计凭证表里 9 个重复列**\n\n凭证表里躺着 9 个「驼峰命名」的旧列（如 `totalDebit`），和对应的下划线命名列（`total_debit`）**意思完全重复**。\n\n**★ 差点出事故**：清查时发现，代码里确实**把这 9 个驼峰名当数据库列名在用**——而同一个映射表里，别的字段又用的是下划线命名。**一个表里混着两套写法。**\n\n如果只删列不改代码，这些字段的读写会指向已经不存在的列，**上线就是 500 错误**，而且类型检查和打包**都发现不了**（因为那是运行时才拼出来的字符串）。\n\n所以顺序是：**先改代码映射 → 再删列**。同时顺手修掉一个潜伏问题：创建人字段被写了两遍，会产生"重复列名"错误（因为凭证表一直是空的，所以从没暴露）。\n\n删列前按规矩核了三件事：表里**实际 0 行**（不会丢数据）、**没有索引引用这 9 列**、数据库**确实支持**删列操作。三条都过才动手。\n\n---\n\n**五、验证链**\n\n类型检查 **0 错** → 后端 123 个文件 0 错 → 构建通过 → 部署 → 生产全量自动检查 **PASS 939 / FAIL 0**（23 套 / 共 955 项，比上一版多 59 项，全部通过）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「生产域」这个叫法会害人**：因为它让人以为整个模块都没迁，而实际上工单早就完成了。动手前如果不重新数一遍，而是沿用「生产域 3.7 KB / 25 个页面」这个旧数字，第一件事就会去建一张工单表——**建出来的是重复表，而且没有任何代码往里写，它会一直空着，然后误导后来的人以为「工单存在这里」。**\n\n**★ 所以判断「还剩下什么没迁」，不能看体积、不能看有多少页面在用，只能看「现在还在往打包文件里写什么」。** 体积回答的是「这个模块多大」，用量回答的是「影响面多广」，都不是「还剩什么」。这个问题必须单独查，而且每次都要重新查——因为上一次的结论会过时。\n\n**为什么「迁移成功、条数对得上、自动检查全绿，用户却看到空列表」是最难发现的一类故障**：因为它同时满足了所有"看起来对"的条件。执行过程没报错、数据条数正好、自动检查也过——**唯一不对的是「用户看到的」**，而用户看到的东西不会进任何日志。这类故障只能靠一个动作抓到：**查数据到底落在了谁名下**，而不是查"有没有数据"。这一轮正是靠"去量数据的归属"才发现的，而不是靠读代码。\n\n**为什么核对程序自己也会错，而且必须专门处理**：因为它和它要检查的对象是同一类东西——都是"从文本里读出结构"的程序。**用一类可能出错的方法去检查同类方法，出错的方式也是一样的。** 所以核对程序必须有自己的"对照组"：解析出 0 项时要判失败而不是通过、已知存在的东西必须能查出来。**没有对照组的检查，只会把「没查出来」伪装成「查过了，没问题」。** 这一版 4 个毛病里有 3 个都会造成这种伪装。\n\n**为什么「返回码 200」在这个架构下不能当作"接口存在"的证据**：因为系统有一个兜底规则——认不出的地址一律送回首页。**首页也是 200。** 于是"存在"和"不存在"在返回码上完全一样，唯一区别在返回的是数据还是网页。这个坑的可怕之处在于：它是**偏向"看起来正常"的**——你随手一试，得到 200，很容易就认为"没问题"。**任何检查，如果它的失败模式和成功模式长得一样，那这个检查就是无效的。** 所以必须加对照组：一个必然不存在的地址也必须被判成"不存在"，否则说明检查本身失灵了。\n\n**为什么删数据库列这种"看起来很安全"的操作也会酿成事故**：因为列名不是只在建表脚本里出现一次，它可能散落在代码的字符串里。**而字符串不会被类型检查、不会被编译器发现。** 这一版差点删掉 9 列——如果只删列，那些运行时才拼出来的列名会指向不存在的列，报错发生在**运行时**，而且是在用户真正用到那个字段的时候。所以顺序必须是**先让代码不再引用、再删**，而且要用「搜列名」而不是「搜字段名」的方式确认——因为这两者在这一版里长得不一样（驼峰 vs 下划线）。\n\n**为什么"表里 0 行"要专门去量，而不是想当然**：因为"没有数据"是所有删除操作最有力的免责理由，也是最容易被默认的前提。如果这表里有 100 行数据、而且驼峰列里有值而下划线列是空的，那这次删除就是**直接丢数据**。规矩是：**删除前必须先回答"删了会不会丢"，而这个答案只能来自实际查询。** 这一版查出来是 0 行，是运气也是纪律——**纪律的作用正是让你在运气不好的那一次也能停下来。**\n\n**为什么这一轮要同时做"迁新模块"和"回头扫旧的"两类事**：因为它们在互相印证。回头扫"登记表"时发现的毛病（解析出错、0 项伪装成通过），和上一版修"字段类型表"时遇到的是同一类；而扫"接口清单"时发现的 3 个坏功能，又是另一类"两边各写一份、没人核对"的产物。**如果只往前做新模块，这些旧问题会一直躺着**——它们不会自己报错，只会在某个用户第一次点开那个页面时，以"加载失败"的形式出现，而且没人知道它坏了多久。' },
        ],
      },
      {
        id: 'v31101',
        title: 'V3.11.1（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**修复「一类非法数据长期能存进数据库」的隐蔽缺陷。它不影响任何界面、不报任何错，只是有一批「把关规则」从来没有被执行过。**\n\n**一、怎么发现的**\n\n自动检查里有一条老规则：**「日期填成 `2026-13-45` 这种不存在的日期，必须被拒绝」**。这一次它红了——系统**接受了**这个日期，还回了一个「创建成功」。\n\n顺着它往上查，发现了一张「字段类型登记表」——它的作用是告诉系统「这一列是数字、那一列是日期」，写数据时据此拦截「数字栏填了文字」「日期栏填了不存在的日期」。\n\n**这张表里有 16 张表是空的。** 也就是说，这 16 张表的**所有**字段类型一个都没登记，其中就包括采购订单的「下单日期」。**所以「不存在的日期被拒绝」这条规则，从系统上线那天起就没对采购订单生效过。**\n\n**二、为什么会空：三个原因叠在一起，缺一个都不会空**\n\n| 原因 | 用大白话说 | 后果 |\n| --- | --- | --- |\n| 原因一 | 读表格结构时，程序**只认「一列写一行」的格式** | 有些表的定义是**一整行写完**的，程序只读到了第一个字段，后面全丢 |\n| 原因二 | 建表脚本里的**中文说明行**（以「-- 」开头）被当成了列定义的一部分 | 说明行和它下面那一列黏在一起，程序以为整段都是说明，**把这一列也整段跳过了** |\n| 原因三 | 「生成登记表」这件事分两步（先取库结构、再生成文件），**只跑了第一步** | 中间的半成品是新的，最终文件还是旧的 |\n\n**原因二的识别特征特别好用：丢掉的每一列，前面恰好都紧跟着一行中文说明。**\n\n**三、影响有多大（实测数字）**\n\n| 表 | 实际有多少列 | 程序读到了几列 |\n| --- | --- | --- |\n| 销售订单 | 44 | **1** |\n| 采购订单 | 40 | **1** |\n| 会计凭证 | 38 | **1** |\n| 生产工单 | 35 | **1** |\n\n丢掉的全是**金额、数量、日期**——恰恰是最该被把关的那批字段。\n\n**四、怎么修的**\n\n1. **先去掉说明行，再切分**（顺序不能反，反过来会让带说明的那一列被误判）；\n2. **按括号层级切分**，这样「一列一行」和「一整行写完」两种格式都能正确读出；\n3. **让数据库自己核对**：写了一个专门的核对程序，把读出来的结果和数据库里真实的列**逐张逐列对照**。结果是 **92 张表、1599 个字段，完全一致，一个不漏一个不多**。\n\n**五、加了两道「防复发」的闸门**\n\n| 闸门 | 作用 |\n| --- | --- |\n| 生成时自检 | 如果某张表只读出了「编号」一列，直接**报错停止**，不生成文件——不再让它悄悄生成一个残缺的表 |\n| 生成后核对 | 必须跑核对程序，**和数据库逐列对齐才算通过**，不允许靠肉眼看 |\n\n**六、这次也要说清一件事**\n\n我在上一版汇报里说「登记表已经从 79 张扩充到 92 张」——**这句话是错的**。当时最终文件其实还是 79 张、而且有 16 张是空的。这次借这个机会纠正过来。\n\n**七、验证链**\n\n类型检查 **0 错** → 后端 **117 个文件 0 错** → 构建通过 → 部署 → 生产全量自动检查 **PASS 880 / FAIL 0**（22 套检查 / 共 896 项），那条日期断言**已修绿，且没有出现任何新的误拦截**。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么这条缺陷特别值得记：因为它「不报错」**。它没有让任何页面打不开、没有让任何数据丢失、没有任何用户会来投诉。它的表现是「有一批把关规则从来没有执行过」——而这**恰恰是最不容易被发现的一类问题**。要靠一条「早就写好、但一直没人细看」的自动检查红了，才把它牵出来。\n\n**为什么「三个原因缺一不可」这个判断很重要**：如果我只修了第一个（改成按括号层级切分），核对程序会告诉我「还有 5 张表漏列」——于是我会继续往下挖，才找到中文说明行那一层。**如果当时偷懒抽样看几张表、或者觉得「数量差不多就行」，第二层会被永远漏掉。** 这也解释了为什么要专门写核对程序、而不是靠肉眼——**肉眼看到的是「有内容的表」，有问题的恰恰是「看起来也正常、只是某些列悄悄少了」的那种**。\n\n**为什么「先去掉说明行、再切分」这个顺序不能反**：切分之后，说明行会和它下面那一列变成同一段。这时再想「去掉说明」，程序看到的是「一段以说明开头的文字」，它会认为整段都是说明——**把那一列一起扔掉**。顺序错了，症状和没修一样，会让人误以为「这个方法不管用」。\n\n**为什么必须「让数据库自己报事实」**：因为前面两个原因都是我改代码时想不到的。我能想到的是「按行切可能有问题」，想不到的是「中文说明行会黏住下一列」。**唯一能兜住「我想不到的原因」的办法，就是找一个不会犯错的东西来当裁判——数据库里真实存着哪些列，这是唯一的事实。** 我写的解析程序读出来的东西，必须和这个事实逐条对齐，才算修好。\n\n**为什么要加「残缺就报错」这道闸门**：因为这类缺陷的本质是「静默成功」——文件照样生成、日志照样打勾、程序照样不报错，只有把关规则悄悄失效这一个后果。**指望「下次小心一点」是没有用的，必须让「结果不合理」这件事本身变成一次明确的失败。** 所以只要某张表只读出了「编号」一列，程序就直接停下来——因为任何一个真实的业务表都不可能只有编号一列。\n\n**为什么这件事要区分「新引入的错」还是「一直有的错」，并且要当面纠正自己的汇报**：这两种情况的处理方式完全不同。如果是新引入的，就该去回滚和追查最近改了什么；如果是「一直就有」，要去补的是那项从来没建立起来的能力。**判错了就会修错方向。** 而「我上一版汇报说已完成、其实没完成」这件事，也必须明确说出来——如果含糊过去，这个错误认知会留在记录里，下一次我或者别人会基于它做判断。**记录里的一句错话，比代码里的一个 bug 更危险，因为它不会被任何检查抓住。**\n\n**为什么「没有出现新的误拦截」这一条必须专门验证**：这次登记了 355 个字段类型，是「把关变严」了。把关变严有两个风险：一是**合法的数据被误拦**（用户正常填写却被拒绝），二是**老数据一旦被编辑就过不了关**。所以修完之后必须完整跑一遍全部自动检查，确认「该拦的拦住了」的同时「不该拦的没被拦住」——**只验证「拦住脏数据」是不够的，那可能只是把所有人都拦住了。**' },
        ],
      },
      {
        id: 'v31100',
        title: 'V3.11.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**采购域完成关系化改造：采购申请、供应商报价两类数据从「打包文件」迁进了真正的数据库表。这一版最值得记的，是「同一模块里两张表，权限要求正好相反」这个第一次遇到的情况。**\n\n**一、动手前先数三件事（延续前几版的做法）**\n\n| 数什么 | 数出来的结果 |\n| --- | --- |\n| 谁在用它 | **37 个文件**（其中真正干活的 34 个） |\n| 真实体积 | **4.8 KB**（申请 5 条、报价 2 条） |\n| 谁往里写 | 申请有 **15 处**；报价 **一处都没有** |\n\n**二、★ 本轮最关键的判断：「没人往里写」不等于「不该迁」**\n\n上一版（销售域）有一类数据被**刻意不迁**，理由是三条同时成立：没人往里写、只有一个页面读、本质上是报表用的固定示例数据。\n\n这一版的「供应商报价」看起来很像它——**全项目同样一处写入点都没有**。但结论必须相反，因为第三条**完全不成立**：\n\n| | 销售域的市场行情 | 采购域的供应商报价 |\n| --- | --- | --- |\n| 有没有人往里写 | 没有 | 没有 |\n| 有几个地方读 | 1 个 | 少 |\n| **这份数据本身是什么** | **报表用的固定示例内容** | **2 条真实的供应商报价**（同一张申请单，两家供应商报价 2800 元与 2830 元，都是逐行明码标价的） |\n\n那 2 条报价正是「**供应商比价**」这个业务唯一的依据。它不是示例数据，是**真实发生过的业务记录**，只是恰好界面上还没有提供录入入口。\n\n**所以判据不是「像不像上一个不迁的先例」，而是「这份数据要是没了会怎样」。** 这是把一次经验变成可复用规则的正确方式——记住原则，而不是记住结论。\n\n**三、★ 一个必须逐张单独判断的地方：同一模块里两张表，权限要求正好相反**\n\n前面每个模块的做法都是「新增的表权限值整批相同」：财务是「全公司可查」，销售是「只看本人」。这一版**第一次出现同一个模块内两张表要求相反**：\n\n| 数据 | 该谁能看 | 为什么 |\n| --- | --- | --- |\n| 采购申请 | **只看本人** | 这是业务员个人提报的单据，和销售线索同性质 |\n| 供应商报价 | **全公司可查** | 这是比价依据——**采购员必须能看到别人录进来的报价，否则比不出最低价** |\n\n这里最需要小心的是：如果把报价也设成「只看本人」，**界面上只会表现为「报价列表少了几行」，不会报错**。采购员会以为是「这家供应商还没报价」，而实际是**权限把数据挡住了**——比价功能就此废掉，而且没人会察觉。\n\n**结论：权限值必须逐张按业务含义定，不能因为「同一个模块」就整批照搬。它是一个业务判断，不是一个技术参数。**\n\n**四、这一版第一次遇到「同一张表里两种明细，主键来源不一样」**\n\n两种明细的结构差别很细，但会导致完全不同的处理方式：\n\n| 明细 | 有没有自带编号 | 处理方式 |\n| --- | --- | --- |\n| 采购申请的物料行 | **有**（界面生成） | 直接沿用界面的编号 |\n| 供应商报价的物料行 | **没有**（类型里就没有这个字段） | 由后端自动生成 |\n\n这两条分支都在同一个通用工具里，不需要额外配置。但**自动检查必须分别验证两条路径**：如果只走通了「界面自带编号」这一条，「后端自动生成」那条的表现会是「明细写进去读回来编号全是空的」——同样不报错。\n\n**五、这一版刻意「不建表」的一处**\n\n采购申请里有一个「审批记录」字段（是一个数组，每个元素含审批人、动作、意见、时间）。按前面几版的直觉，这种结构应该建子表。本版**刻意不建**，理由三条：\n\n1. 实测生产库 5 条申请里**这一字段一条数据都没有**——现在建表只会得到一张空表；\n2. 它的用途是「详情页整体读出来给人看」，用文本列存完全够用；\n3. 审批记录的**权威来源在审批流体系**里，这里只是一份展示用的副本。\n\n**将来需要「按审批人或时间做统计」时再单独建表**——那时数据已经真实存在，迁移有内容可搬，不会白建。\n\n**六、★ 一个「现在库里没数据、但必须登记」的坑**\n\n申请的备注、项目编号、来源类型（从 MRP 自动生成时会带上）这几个字段，实测生产库里**一条都没出现过**。但**必须登记进表结构**——因为界面的类型定义里有它们。\n\n如果不登记会怎样？用户某天填了一次备注，或者从 MRP 生成了一张申请（自动带上来源信息），系统会**把这些字段直接丢掉、并且照样提示保存成功**。也就是说：**这个错误不会在现有数据上暴露，只会在「有人第一次用这个功能」时炸**，而那时已经上线了。\n\n所以本轮**刻意把这些「库里当前没数据的字段」都写进去测了一遍**。判据是「**界面的类型定义里有没有这个字段**」，不是「库里现在有没有值」。\n\n**七、新增 55 条常驻自动检查**\n\n针对上面每一种「搬过去了但数据静默少了」的可能，都钉了钉子：写 4 行明细读回来必须还是 4 行；连续推进 5 次审批状态后明细一行都不能少；两种明细的编号来源分别验证；「现在没数据的可选字段」刻意写一遍；审批记录读回来必须是真数组；两张表权限相反这件事用「同公司内另一个身份能不能看见」来验；删除时要报告连带删了几行。\n\n**八、涉及的表（4 张）**\n\n申请与明细、报价与明细共 4 张表。改造后**界面一个字符都没变**——这是这套改造能一轮接一轮做下去的前提。\n\n**九、至此的进度**\n\n已完成关系化改造的模块：**物料清单、打印模板、财务、销售、审批流、采购**共 6 个。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「没人往里写」不能直接推出「不该迁」**：上一版有一个模块因为「全项目零写入点」被刻意跳过，那是正确的判断。但如果把「零写入点」本身当成判据，这一版就会把真实的供应商报价一起跳过——而那 2 条报价是比价业务的唯一依据，跳过的代价是**真实的业务数据继续躺在打包文件里、随时可能丢**。区别在哪？上一版那个模块本质是**报表用的固定示例内容**，这一版这两条是**真实发生过的业务记录**。**同样是「没人在写」，一个该跳过、一个必须迁，差别在数据本身的性质，不在有没有写入点。**记住原则（这份数据要是没了会怎样），而不是记住上一次的结论。\n\n**为什么同一模块里两张表的权限会相反，且这个错特别难发现**：因为它们服务的是两类不同的人、两种不同的用途。采购申请是「我提的单子」，天然该只看本人；报价是「大家拿来比价的公共信息」，必须所有人可见。如果为了省事整批设成「只看本人」，**后果不是「权限严一点」这么轻**——采购员会看不到别人录的报价，比价的依据只剩自己那一条，他会以为「这家还没报」，而不是「我看不到」。**权限设错的表现形式是「数据不见了」，而不是「报错了」，所以它必须靠专门的检查来抓，不能指望用户报障。**\n\n**为什么「库里没数据的字段」必须登记、还必须专门测一遍**：因为这类错误**只在功能第一次被使用时才爆发**。现在库里没有备注、没有来源信息，所以不登记也不会有任何异常——测试也会全绿，因为存量数据根本不碰这些字段。等到某个用户第一次从 MRP 生成申请、系统自动带上来源编号，那一刻数据被静默丢掉，而他看到的是「保存成功」。**这类「未来才会爆」的错误，是测试里唯一能提前抓到的方式：主动写一次。** 判据必须用「界面类型里有没有」，因为那才是用户真正会填的字段清单；用「库里现在有没有」当判据，等于用「历史上没人用过」推出「以后也不用」。\n\n**为什么同样的「明细」结构要分成两种处理，而且必须分别验证**：这两种明细的差别只在「界面有没有给编号」这一个细节上，但后果完全不同。界面给了编号的，可以直接沿用；没给的，必须由系统生成，而且**生成出来的编号必须保证唯一、不能空**。如果只测了前者，后者那个「编号是空的」的毛病会一直藏着——因为明细行数是对的、物料名是对的，只有编号是空的，而列表页通常不显示这个编号。**看起来几乎一样的两种数据，不能因为它们「都是明细」就只测一种。**\n\n**为什么审批记录这次不建子表**：建表的成本不只是多一张表，还包括多一套接口、多一处权限登记、多一份校验规则。而这张表建出来**只会有零行数据**——因为库里 5 条申请的审批记录字段全是空的。更关键的是：即使有数据，**它的权威来源也不在这里**，真正说了算的是审批流体系里那份记录。为一个「展示用的副本、且当前无数据」的字段建表，等于凭空多出一份要维护的东西，还会让后来的人误以为「这里存着审批记录的正本」。**等真的需要按审批人或时间做统计时再建——那时数据已真实存在，迁移有内容可搬，表才不是空的。**\n\n**为什么这一版仍然不改任何界面**：因为这是这套改造能被一轮接一轮复制的根本前提。一旦顺手改了界面，存储改造和界面调整就混在一起了——出问题时既可能是存储的锅也可能是界面的锅，而回归范围会从「几个接口」膨胀到「几十个页面」。采购域有 34 个业务页面在用它，改界面的代价远大于改存储。**把爆炸半径压在数据层，是这套做法最大的价值。**\n\n**为什么每轮都要重复「动手前先数三件事」**：因为这三件事每次都给出**不同的结论**。财务域数出来是「33 个调用方大量依赖返回值」→ 所以保持同步；销售域数出来是「10 个写入点全都不关心返回值」→ 所以可以改异步；审批流数出来是「只有 6 处引用」→ 所以改动面最小。**如果只看上一次怎么做的、照着抄，这三个域早就全做错了。**数字本身没有价值，价值在于它推翻了我原本的预判。' },
        ],
      },
      {
        id: 'v31001',
        title: 'V3.10.1（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**修复「登录页面频繁刷新、根本无法登录」的严重故障。**\n\n**一、故障长什么样**\n\n打开登录页，页面**每秒都在自己刷新**，用户名和密码根本来不及输入。这不是「页面慢」，而是**浏览器在不停地把整个应用重新加载一遍**。\n\n**二、真正的原因：三层原因叠在一起，缺一层都不会出这个故障**\n\n| 第几层 | 事实 | 少了它会怎样 |\n| --- | --- | --- |\n| 第一层 | 应用启动时的那批「拉数据」动作，写在**最外层**，**不管你在哪个页面都会执行**——包括登录页 | 只有登录页会执行这批动作，才可能出事 |\n| 第二层 | 这批动作**未登录时全部会失败**（服务器回「你没登录」），而它们走的是各业务自己的通道，**没有经过那道「没登录就先读本地、不打服务器」的保护** | 若走了保护，未登录时压根不会去问服务器 |\n| 第三层 | 收到「你没登录」后，程序执行的是「**整页跳转**去登录页」；而整页跳转会**把所有防止重复跳转的标记清零** | 若不清零，跳一次就停了，不会循环 |\n\n三层叠起来就是：**登录页也会去拉数据 → 全部失败 → 整页跳回登录页 → 页面重新加载、防重复标记清零 → 又去拉数据 → 又失败 → 又跳……** 无限循环，用户永远等不到输入密码的机会。\n\n**三、为什么这个老问题现在才爆发**\n\n这三层都是**早就存在的**，但触发它需要「启动时那批请求足够多」。这一版（V3.10.0）新增了审批流的启动拉取，**恰好把请求数推过了临界点**——所以看起来像「新版本引入的故障」，实际是**老缺陷被新改动压垮了**。\n\n**四、怎么修的（四处，缺一不可）**\n\n| 改哪里 | 怎么改 | 为什么 |\n| --- | --- | --- |\n| 启动拉数据 | **只有已登录才执行**；未登录一律不拉 | 从根上断掉「登录页也去问服务器」 |\n| 会话失效跳转 | 已经在登录页就**不跳转**；并且加一道「只跳一次」的闸门 | 断掉循环的最后一环 |\n| 兜底跳转 | 同样加「已在登录页就不跳」 | 这是**另一条独立的跳转路径**，漏了它循环照旧 |\n| 审批流拉取 | 自身再加一道「没登录就直接跳过」 | 它走的是独立通道，拿不到通用保护，必须自己防 |\n\n**为什么四处都要改**：这不是「多改几处更保险」，而是**四条路径都能独立触发跳转**。只改一处，另外三条照样能把循环跑起来。\n\n**五、怎么确认修对了**\n\n直接用命令行去问服务器：「未登录时这些接口到底回什么？」结果是**全部回「未登录」**——这正是循环的燃料。修复后，未登录时**这批请求根本不会发出去**，也就没有了燃料。\n\n**六、验证链**\n\n类型检查 **0 错** → 构建通过 → 部署 → 生产全量门禁复跑 **PASS 782 / FAIL 0**。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么说这是「老缺陷被新改动压垮」而不是「新版本写错了」**：这个判断很重要，因为它决定了修哪里。如果认作「新版本引入的」，那就会去回滚这一版的改动——但回滚之后，只要将来任何一个版本再多加一个启动请求，同一个故障还会再来一次。**真正要修的是那条循环，而不是触发它的那根稻草。** 判断依据是：三层原因在改动之前就都在代码里，新增的只是一个请求量。\n\n**为什么「整页跳转」这件事这么危险**：整页跳转看起来只是个「干净、彻底」的做法——它把所有状态都重置了，不会留脏数据。但它同时也会**重置所有防止重复的标记**，而「防止重复」恰恰是打断循环的唯一手段。**一个动作越彻底，它顺手清掉的东西就越多**——这是「彻底重置」和「可恢复」之间永恒的取舍。这里选择的是「跳转前先判断该不该跳」，而不是依赖重置后的标记。\n\n**为什么「只在已登录时拉数据」是对的，而不算削弱功能**：启动时拉的那批数据，全部是**登录后才需要看的业务数据**。未登录的人本来就没有权限看，提前去拉只会拿一串失败、还顺带触发跳转。**「未登录就先拉」这个行为从第一天起就是没有意义的**，只是以前没造成肉眼可见的后果，所以没人注意它。修正它不是删功能，而是在一个从来没有意义的动作上加了它本来就该有的前提条件。\n\n**为什么修一处不够，四处都要改**：因为「触发整页跳转」的路径是**四条独立的代码路径**，而不是一条路径的四个环节。只改一处的效果，等同于「把这个循环的发生概率降一点」——听起来像缓解，实际是**把问题变成偶发**，而偶发的故障最难查。要么全断，要么等于没修。\n\n**为什么用「命令行直接问服务器」来验证，而不是只看代码**：因为代码告诉我的只是「逻辑上会 401」，而服务器实际回什么、有没有别的分支（比如某些接口在未登录时反而回 200），只有真的问一次才知道。这次的实测结果是「全部 401」——**这条结论是后面所有推理的地基**，如果它不成立，我修的地方就全错了。**能实测的事实，不要用推理代替。**\n\n**为什么这类「启动期请求」的缺陷值得单独记进说明书**：因为它有一个很坑的特点——**它的严重程度和「启动请求的数量」正相关**。也就是说，每做一个新功能、多加一个启动请求，这个故障就离爆发更近一步，而做那个新功能的人完全不会意识到自己在踩什么。这类「会随着时间推移自己变严重」的缺陷，必须留下明确的记录，让后来加启动请求的人知道这里有雷。' },
        ],
      },
      {
        id: 'v31000',
        title: 'V3.10.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**审批流完成关系化改造：20 个审批流程及其全部审批步骤，从「打包文件」迁进了真正的数据库表。这一版最重要的收获不是「怎么迁」，而是「迁之前必须把两边的数据逐条比一遍」——正是这一步，发现了三个只看代码永远发现不了的事实。**\n\n**一、这一版的性质和前面几版都不同：这是「配置」，不是「单据」**\n\n前面几版迁的都是业务流水（物料清单、财务凭证、销售记录）。审批流不一样，它是**用户自己调出来的规则**——「采购申请超过 5 万要谁签」「物料新增要分几步录」。\n\n这个差别带来一个直接结论：**它被引用的次数少得惊人**。\n\n| 想量什么 | 量出来的结果 |\n| --- | --- |\n| 有哪些地方引用它 | **只有 6 处**（1 个读取器、2 个设置页面、1 个物料页面、1 处无用引用、1 处转发） |\n| 真实体积 | **6.6 KB**（13 个流程、28 个步骤） |\n| 有哪些地方往里写 | 集中在 **2 个设置页面**，且**全都不关心返回值** |\n\n对比一下：财务被 35 处引用，销售 15 处，物料清单 15 处。**审批流只有 6 处**——不是因为不重要，而是因为**没有哪个业务页面会去改动审批规则**，只有设置页会。所以这一版虽然新增了能力，改动面却是历次最小的。\n\n**二、★ 本次最该记的一条：动手前把库里数据和代码里的默认值逐条比一遍**\n\n这一步是本轮做对的、也是最值得保留的做法。量完体积后没有直接建表，而是写了个脚本，把「数据库里现在存的 13 个流程」和「代码里写死的 20 个默认流程」**逐字段比了一遍**。结果查出三件事，每一件都会导致完全不同的做法：\n\n| 发现 | 如果没查证会怎样 |\n| --- | --- |\n| 13 个流程都标着「系统预置」，**但这标记不是人设的** | 这是旧版本升级时程序**自动**补上的标记，代码的默认值里根本没有这个字段。看表面会以为「用户配置过」，从而做出错误假设 |\n| 全库真正的用户改动只有一处：**「采购入库」审批被打开了** | 代码默认是「关」。如果用代码默认值覆盖，这个开关会被**悄悄打回关闭**，而且**用户不会收到任何提示** |\n| **库里只有 13 个流程，代码里却有 20 个** | 少的 7 个（客户新增、询价单、比价单、盘点单、入库单、出库单、质检报告）是后来才加进代码的默认值 |\n\n**第三条是一个一直存在的缺陷**，值得单独说：旧版的播种逻辑是「只有在完全没数据时才初始化」，一旦库里有了数据，**后来新增的默认流程就永远不会补进去**。所以这 7 个审批流在生产环境**从来没有出现过**，用户在设置页也看不到它们。这一版改成「数据库为空才初始化」，上线即按当前代码补齐到 20 个 —— **顺手修掉了一个存在很久、但谁也没注意到的问题**。\n\n**结论：必须把库里那 13 条真实数据搬过去，绝不能用代码默认值覆盖。**\n\n**三、★ 新增能力：明细行里面还有明细**\n\n前面几版处理的嵌套关系是「一条主记录 + 若干行明细」。这一版遇到了新情况：**每一行明细自己还带着更细的结构**。\n\n举一个真实的例子，一个审批步骤里可以配：\n\n- **审批条件**：金额大于 10 万、且物料类型等于「外购」才需要这一步\n- **超时升级**：超过 24 小时没批，自动转给管理员，并通知某几个人\n- **跳过规则**：金额小于 1000 时自动通过\n- **可编辑字段**：这一步允许填写哪些内容（物料审批的分步录入就是靠它驱动）\n\n这些既不属于主记录，又不够格单独建一张表（为一串字段名建表，只会得到「每行一个字段名」的空表）。所以给明细行本身加了一组「文本列存结构」的能力。\n\n**这里有一个极易踩的坑，必须记下来**：主记录的文本列只装「一串名字」（比如 `["型钢","钢板"]`），程序在转换时会把**任何不是列表的东西一律压成空列表**。而明细行要装的是**一个完整对象**（审批条件那种带层次的结构）。如果直接沿用主记录那套转换方式，一个配得好好的审批条件会被**悄悄压成空列表**——保存成功、界面正常、重进页面一看条件全没了。所以明细行单独用了一套「原样保存」的转换方式。\n\n**四、这一版写入方式特殊：页面给的是「一整份新名单」**\n\n前面几版写入都是明确的动作（「新增一条线索」「修改这个订单」），改起来直接。这一版不同——设置页面是**把整份审批流名单替换掉**，程序拿到的是**一整个数组**。\n\n所以要先把「谁被新增了、谁被改了、谁被删了」算出来，再分别去调新增、修改、删除三个接口。\n\n**判「有没有被改」不能看是不是同一个对象**：物料页面在保存时，哪怕用户什么都没改，也会重新造一份对象出来。如果按「对象是不是新的」来判断，就会每次都白发两次修改请求、还多写两条操作日志。所以改成**比对内容**——审批流数据很小，20 个全比一遍的开销可以忽略。\n\n**还有一个刻意的处理**：只改「开关」这种主记录字段时，**故意不把步骤一起提交**。因为后端的规则是「没传明细 = 明细保持原样」，如果每次都一起传，一旦遇到「用旧数据编辑后步骤被截断」这类问题会非常难查。\n\n**五、一处「不改接口、只改存法」的细节**\n\n审批步骤里有个字段叫「顺序」。这个词在数据库里是**保留字**（排序语句要用它），直接拿来当列名会到处要加特殊符号。所以库里列名改叫 `node_order`，但**接口上给界面的名字仍然是「顺序」**——界面完全不知道这件事。\n\n**「接口形状不变」是这套改造能一轮轮做下去的前提**：存储怎么变都行，界面拿到的东西必须一模一样。\n\n**六、数据权限：这一版是「全公司可见」，和上一版刻意相反**\n\n| 版本 | 数据类别 | 权限登记 | 为什么 |\n| --- | --- | --- | --- |\n| V3.9.0 | 销售线索、出货、项目 | **只看本人** | 是业务员自己的客户资源 |\n| V3.10.0 | 审批流 | **全公司可见** | 是公司级的公共规则 |\n\n审批流如果错误地登记成「只看本人」，后果很具体：系统预置的 20 个流程**没有归属人**，会被全部过滤掉——表现是「设置页只剩自己建的那两条，系统自带的流程一条都看不到」；更严重的是「**张三关掉的审批，李四那边照走**」，两个人看到的是两套世界。\n\n**同一个机制、不同业务含义，登记值必须逐个想清楚，不能整批照搬上一版。**\n\n**七、本轮自查出一个真漏字段和一条废列**\n\n**这两处类型检查和打包都发现不了**，是逐字段核对时找出来的：\n\n- **「创建时间」漏登记了**。新增自定义流程时会写入创建时间，但这个字段**没登记进「要读写」的名单**，于是既不存库也不读回——用户建完流程、刷新页面，创建时间就没了。这和上一版「三个字段读回来是空的」是**同一类问题的另一副面孔**：上次是「两处名单要人工对齐」，这次是「凭印象挑字段」。核对方法很简单也很有效：**把界面用到的字段名和表里的列名从头到尾对一遍**，而不是「觉得哪些重要就写哪些」。\n- **删掉了一条废列**。第一版给步骤表建了一个「序号」列，但界面上的审批步骤**根本没有这个字段**——登记了也永远取不到值、永远写 0。留着它更坏：它让排序语句看起来像「两级排序」，会让后来的人以为存在一个可以调整的次级顺序。**顺序的出处只有一个，就是节点的顺序号。**\n\n**八、新增 97 条常驻自动检查，守住 6 类风险**\n\n| 防的是什么 | 具体断言 |\n| --- | --- |\n| **明细行里的对象被压成空列表**（本版最凶险） | 条件读回必须是**对象**，且逻辑关系、内层两条条件的字段/运算符/数值逐项一致；超时升级、跳过规则同样钉住 |\n| **只拨开关就把步骤全删光**（设置页最高频操作） | 改开关后，步骤必须还是 3 个，且里面的条件和字段完好 |\n| **只改步骤却把主记录信息冲掉**（反方向） | 只传步骤后，模块名、状态、描述、可见角色、开关全部还在 |\n| **「一串名字」类型的文本列编码错** | 多角色、可编辑字段、可见角色读回必须是**真列表**，元素逐项一致 |\n| **全公司可见被错登成只看本人** | **★ 在同一个组织里用两个账号互看**：管理员建一条，同组织的另一个账号必须能查到、也能改，改完管理员这边读回确认真的写进去了 |\n| **本轮测试没有污染本组织配置** | 收尾时每一条记录都能正常解析、步骤列都是列表（读回链路完好） |\n\n**九、★ 本轮真正踩的一个坑：自动检查「断言写错了方向」（本轮最该记的一条）**\n\n这一版**不是一次做完的**，中间出了一次错，而且我**一开始把原因判错了**，过程值得完整记下来。\n\n**表面现象**：第一次上线后，整体结果是**通过 772、失败 5**，其中 4 条出在这一版（「一条都查不到」「抽查物料流程找不到」「抽查采购入库找不到」「总数不足」）。\n\n**第一次判断（错的）**：我当时认定「**表建好了但没搬数据**，所以是空的」，于是补了一条专门搬数据的步骤。**搬数据本身是对的、也必须做**（见下面第十节），**但它并没有让检查变绿**——重跑之后**还是失败 4 条**。\n\n**真正的原因（查证后才确认）**：数据**一直都在库里**，是**我把两件事混为一谈**：\n\n| | 实际含义 |\n| --- | --- |\n| 这一版登记的「全公司可见」 | 「**本公司内**所有人都能看」（相对「只有建的人能看」） |\n| 自动检查用的组织 | 每轮**新注册一个隔离组织**，跟你的真实组织不是一个 |\n\n我直接查了库，把「这些数据到底属于谁」打了出来：**13 条流程全部属于同一个组织**（公司编号 `xinguang`，也就是你这个项目的真实组织）。而自动检查的那个隔离组织里，本来就应该是 0 条。\n\n**也就是说：权限机制拦住的正是它该拦的——这是正确的安全行为，错的是我的断言。** 我原来那条「总数不少于 5」的断言，**从原理上永远不可能通过**。\n\n**怎么定位的（这个手法值得留下）**：不再继续猜代码，而是**先去量数据归谁**——把「每条数据属于哪个组织」用一句查询打出来，一眼就看到 13 条同属一个组织；再和「自动检查每轮新建组织」这个已知事实一对照，矛盾自己就解开了。**先量数据归属，再谈代码逻辑。**\n\n**怎么修的**：换了一条**在同一个组织里就能复现**的等价断言。真正要防的事故不是「看不到别的公司的流程」（那本来就该看不到），而是**「张三配好的审批流，李四看不到」**——审批流是公司的制度，必须全公司一致。这个事故在同一个组织里就能完整复现，也只需要在同一个组织里复现：管理员建一条 → **同组织的另一个账号**去查 → 必须查得到（如果权限被错登成「只看本人」，这一条立刻变红）。\n\n**修的过程中又抓到一个真问题（而且是我自己写测试时的错）**：**单条记录的查询接口返回的是「扁平对象」，不带外层包装**；只有列表接口才是「列表 + 总数」那种带包装的形状。我一处多解了一层，结果步骤数永远读到空值，检查**假报**「改开关把步骤删光了」（实际一条都没少）。**同一个接口家族里，「列表」和「单条」返回形状不一致是常态，写断言前必须先确认形状，不能凭印象。**\n\n**★ 沉淀下来的纪律（比「该不该搬数据」更根本）**：**写检查之前，先问「这个故障在当前测试环境里能不能被制造出来」** —— 制造不出来的故障，断言写得再漂亮也不是好断言：它要么是**永远不会响的空警报**（看起来安全，其实什么都没防），要么是**永远报错的假警报**（天天红，最后没人看）。自动检查用的是隔离组织，所以任何「看到别的组织的存量数据」的期望都不成立；**存量数据的正确性，要在搬数据的那一步用查询核对（这一版做对了），不要塞进接口检查里。**\n\n**附带说明：搬数据这一步仍然必须做。** 虽然它不是上面这些红条的原因，但它是**真实需要**的：这一版的第一次上线只**建好了表、没搬数据**，把搬数据留给「打开页面时自动补」。这在上一版（销售域）行得通，因为销售数据是**流水**（空着等用户下次操作就行）；而审批流是**配置**——**空着就是所有审批判定全部落空**。更直接的是：**自动检查是直接打接口的，根本不会去打开页面**，所以「等页面自动补」在检查里永远不会发生；对真实用户也一样，在首次打开设置页之前，表就是空的。\n\n| | 销售数据（上一版） | 审批规则（这一版） |\n| --- | --- | --- |\n| 性质 | **流水**（订单、出货） | **配置**（审批规则） |\n| 空着会怎样 | 等用户下次操作就行，没实际影响 | **所有审批判定全部落空** |\n| 能不能等页面补 | 能 | **不能** |\n\n**搬数据的结果如实核对**：**13 条流程 + 28 个步骤全部搬到位**，用户那个「采购入库已打开」的设置保住，里面的条件、超时升级、可编辑字段**逐项完好**。\n\n**搬的过程中两个容易踩的坑**（都不会报错，只会悄悄出错）：\n1. 搬步骤时，它属于哪个流程**只能从外层取**——原始数据里根本没有「属于哪个流程」这个字段\n2. 「条件」这类结构要**原样搬**，不能为了「保险」再包一层——包了之后读回来的形状就全变了\n\n**搬到哪个组织**：原始数据里没写这条信息，所以在搬运逻辑里内置了一条**可复查的规则**：「取用户最多的那个组织，并列时取创建最早的」。实测结果唯一。**为什么不用别的办法猜**：按单据数量会被自动检查造出来的测试组织干扰；另一个看起来相关的编号是**业务部门编号**（SSA公司 / 武汉工厂），跟登录账号所属的编号是两套完全不同的体系，不能混用。**事后已核对选对了**：那个组织的公司编号正是 `xinguang`（新光专用汽车），真实的销售订单与客户资料也都落在它下面。\n\n**旧数据刻意没删**：留着它是为了**能对账**——万一发现搬错了，有原始数据就能逐条比对、重放；删了就只能靠备份。**能退回去，比少存一份更重要。**\n\n**十、验证链（全部可复查）**\n\n类型检查 0 错 → 后端语法检查 **112 个文件 0 错、112 条引用链 0 错** → 后端类型检查**新增 0 条**（存量 56 条不变）→ 构建 **1 分 10 秒** → 部署 `c75a45bf` → 生产库迁移 `0056` 建表 + `0057` 搬数据 已应用 → 核对：表数 **88 → 92**，**13 条流程 / 28 个步骤**全部到位，两张表列结构完整（6 个结构列全部到位）→ 生产全量门禁 **PASS 782 / FAIL 0**（21 个套件，共 798 条；提示 7 条、信息 9 条，耗时 4 分 33 秒）。\n\n**★ 排障过程也值得记**：第一次上线 通过 772 / 失败 5 → 补搬数据后**仍然失败 4** → 查库确认「数据一直在、只是属于另一个组织」→ **修正检查里的错误断言（不是改业务代码）** → 单套件 **通过 97 / 失败 0** → 全量 **通过 782 / 失败 0**。**关键转折点是「不再猜代码、先去量数据归属」。**' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么动手前一定要把库里数据和代码默认值逐条比一遍**：因为「代码里写的」和「库里存着的」是两回事，而人很容易拿自己刚看过的代码当事实。这次如果直接建表、拿代码默认值当种子，那个「采购入库」的开关会被悄悄关掉——**而这类问题不会报错、没有任何提示，只有用户某天发现「我明明打开过」才会暴露**，那时根本无从查起。逐条比对的价值在于：它把「我以为」换成了「实测是什么」。**三个发现里有两个推翻了原本的假设，这就是这一步的全部意义。**\n\n**为什么「库里 13 个、代码 20 个」这件事必须当成缺陷修掉，而不是维持现状**：表面上「老用户少 7 个流程」好像无伤大雅，但它反映的是一个更普遍的问题——**程序新增了默认配置，老用户永远拿不到**。而且这个缺陷是「沉默」的：没有报错、没有提示，用户甚至不知道自己少了东西。这类缺陷拖得越久越难发现。这一版改成「库为空才初始化」，一次上线就把这 7 个补齐，等于把一个潜伏很久的问题顺手解决了。\n\n**为什么明细行里的「对象」不能沿用主记录那套转换方式**：两者看起来都是「把结构存成文本」，但差别在细节里：主记录只装列表，所以程序可以放心地「不是列表就当成空列表」；明细行要装完整对象，那条「不是列表就清空」的规则会把一个合法对象**判成非列表并抹掉**。危险之处在于它**不会报错**——保存成功、界面正常，只有用户过几天重新打开才发现条件没了。**看起来相似的两种数据，不能因为「都是存文本」就共用同一段处理逻辑。**\n\n**为什么判「有没有被改」要比对内容而不是看对象新旧**：如果按对象新旧判断，用户什么都没改也会触发保存请求——这本身不致命，但它有两个隐性代价：一是**每次都往操作日志里多写两条记录**，日志的噪音会淹没真正的操作；二是让「保存成功」这个提示变得没有信息量。**在判断「有没有变化」这件事上，要相信数据本身，而不是相信对象是不是刚造出来的。**\n\n**为什么只改开关时故意不提交步骤**：后端有个明确的规则——「没传明细就是明细保持原样」。这个规则是保护性的，但如果前端每次都把明细一起提交，这个保护就等于失效了。更要紧的是：一旦将来出现「用旧数据编辑后步骤少了几步」这类问题，有了这条「只在步骤真变了才提交」的约定，排查范围会小很多。**好的约定不只是为了让当前功能正确，也是为了将来出问题时好查。**\n\n**为什么「接口形状不变」这件事值得反复强调**：这一版改了列名（因为「顺序」是保留字）、改了存储方式（明细行多了文本结构列），但界面上看到的东西**一个字符都没变**。这不是巧合，而是刻意的约束。一旦为了迁就存储去改界面，两个变化就混在一起了——出问题时既可能是存储的锅、也可能是界面的锅，而且回归范围会从「几个接口」膨胀到「几十个页面」。**把改动限制在数据层，是这套改造能一轮接一轮做下去的根本原因。**\n\n**为什么权限登记值必须逐张单独判断**：上一版是「只看本人」，这一版是「全公司可见」，下一版（采购、生产）大概率又要换。如果图省事整批照搬，后果不是「权限松一点」这么简单——审批流是**规则**，看错规则会导致**实际审批流程走错**：某个人的审批把关被跳过，或者某个流程在别人那里根本不存在。**权限值是一个业务判断，不是一个技术参数。**\n\n**为什么「漏登记一个字段」这种小错值得单独记一笔**：因为它揭示的是方法问题，不是手滑。上一版踩的是「两个名单要人工保持一致」，这一版踩的是「凭印象挑字段」——**两次都栽在「靠人记得住」这件事上**。有效的对策不是「下次小心点」，而是换一种核对方式：**拿界面真实用的字段清单去和表里的列逐个对**，让清单自己说话。凡是可以靠核对消除的隐患，就不要靠记性。\n\n**为什么这一版改动面最小，反而写的注意事项最多**：因为这一版的价值不在「做了多少」，而在「做对了什么判断」。消费方只有 6 处的域，技术上并不难；难的是那三处只有逐条比对才能发现的存量事实，以及「明细行里还有对象」这个新结构。**如果一个改造任务只在第一次遇到时做对、下一次换个场景就做错，那它就不算真正被掌握。**把这些判断连同理由一起写下来，是为了下一次遇到相似结构时，能先想到该去核对什么。' },
        ],
      },
      {
        id: 'v3900',
        title: 'V3.9.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**销售域完成关系化改造：销售线索、出货记录、项目三类数据从「打包文件」迁进了真正的数据库表。本轮最有价值的判断不是「怎么做」，而是「哪一类不做」。**\n\n**一、动手前先把「谁在用、用多少次」数清楚，再决定做哪些**\n\n上一版的经验是「先数清消费方」。这次在数的基础上多了一步：**同时数「有没有人在写」**。结果是——\n\n| 数据类别 | 被几个页面引用 | 谁在往里写 | 本轮决定 |\n| --- | --- | --- | --- |\n| 项目 | 19 | 新增 1 处 | **迁进数据库**（3 张表） |\n| 销售线索 | 5 | 新增 4 处、修改 3 处 | **迁进数据库**（2 张表） |\n| 出货记录 | 5 | 新增 3 处 | **迁进数据库**（2 张表） |\n| 市场行情 | **1** | **0 处** | **刻意不迁** |\n\n**为什么市场行情这一类不迁**：三个条件同时成立才敢下这个结论——① **全项目没有任何一处往里写**；② 只有 1 个页面读它，且只读第一条；③ 它本质上是报表展示用的**固定示例数据**，不是可编辑的业务数据。为它建表，只会得到一张「永远只有示例数据、且没有任何接口」的空表，反而多出一份要维护的东西。**这不叫「跳过」，叫「判断后不做」，依据全部可复查。**\n\n**二、这一版和上一版最大的不同：这次可以放心改成异步**\n\n上一版财务域没能改成异步，是因为财务的 33 个调用方里有大量「**立刻要用返回值**」的地方（拿到结果才决定弹不弹提示、跳不跳页面）。销售域不一样——**全部 10 处写入点，没有任何一处关心返回值**：导入时是一行行循环调用、表单提交后直接关窗口、自检也有。所以改成异步对现有页面**零影响**。\n\n有一处需要特别处理：销售服务里存在「**刚改完、马上读**」的写法（改完线索立刻读回新值）。这类写法靠的是「**先改内存、再后台存**」来满足——点下去界面立刻变，数据在后台落库。这也正是这套改造里「先改后存」这个壳的设计目的。\n\n**三、新增能力：一条记录可以带好几组明细了**\n\n上一版做的工具只能处理「一条主记录 + 一组明细」。但有项目的结构是「**一条主记录 + 三组明细**」：项目团队、里程碑、异常记录，会同时出现在一条记录里。这在原设计下**结构上就表达不了**，所以这次把工具扩展成可以带任意多组明细，删除时也会逐组清理干净。\n\n**四、三个「只是个名单」的字段，不建表，直接存**\n\n销售线索的「意向产品」、项目的「项目团队」「关联订单」这三个字段有个共同点：**没有编号、没有其它属性、不参与统计和排序**——它们就是几个名字排在一起。这类数据存进数据库的一个文本列就够了（存成 `["型钢","钢板"]` 这种形式），不需要为它单独建表。**反过来，销售线索的「跟进记录」有编号、有日期、有方式、有结果，就必须建真表**——这才是能被查询、被统计的数据。\n\n**五、一个必须逐组单独判断的细节**\n\n「没传明细 = 明细保持原样；明确传空 = 清空明细」这条规则，在有**多组**明细时必须**逐组独立判断**。危险场景很具体：用户只是**改了一下项目进度**，如果处理成「没传的明细一律清空」，那里程碑和异常记录会被一起删掉——**界面上看不出任何异常，数据就是没了**。所以这次专门做了三重交叉验证：只传里程碑后异常记录还在、只传异常记录后里程碑还在、只改进度后两者都在。\n\n**六、新增 113 条常驻自动检查，并且抓出了两个真问题**\n\n这一轮的测试抓到两个**类型检查和打包都发现不了**的问题，值得单独说：\n\n**问题一：三个「名单」字段读回来是空的。** 原因是把这三个字段登记在了「要转成文本存」的名单里，**忘了同时登记进「要读写」的名单**，而读写两条路径都只认后者——于是既不写库、也不读回。这不是打字打错，是**设计上留了两处需要人工对齐的清单**。所以修法不是补一处，而是**把两个清单合并成一个**，从根上消掉这个隐患。\n\n**问题二：改删除回执时打破了上一版的功能。** 我改了删除后返回的信息格式，顺带把上一版用的一个字段去掉了，导致**财务域的检查失败**。这里的关键教训是：**只跑本域的测试是绿的，必须跑全量才能发现**——本轮就是靠全量运行抓到的。修法是两个字段都返回，**保住旧格式**。\n\n**七、数据权限按业务语义逐个定，没有整批照搬**\n\n新增 7 张表全部登记为「**只看本人数据**」，这一点和上一版财务域**刻意相反**。理由：财务账目是公司级数据，全公司都能查；而销售线索、出货记录、项目属于**业务员自己的业务范围**，与既有的销售订单、客户同属一类。**同一套机制，业务含义不同，登记值就必须分开想。**\n\n**八、界面同样一行都没改**\n\n与上一版一致，所有页面无需改动。至此**已完成关系化改造的域是：物料清单、打印模板、财务、销售**四个；其余业务域仍在打包文件里，按顺序接下来做审批流、采购、生产。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么「哪一类不做」比「怎么做」更需要认真判断**：迁移本身是重复劳动，照抄模板即可；真正会出问题的是范围判断。市场行情这一类如果也迁，就会得到一张永远只有示例数据的表，外加一套没人调用的接口——**它的存在会让后来的人以为「这里有真实业务数据」，从而在排查问题时被误导**。判断依据必须站得住：不是「感觉它不重要」，而是「全项目零写入点、仅一个只读消费方、本质是示例常量」三条同时成立。这三条都可以被复查，别人可以质疑、可以推翻，而不是靠我说了算。\n\n**为什么这一版敢改成异步，上一版不敢**：这不是风格偏好，是约束条件不同。异步落库比同步更容易「改错而不知道」，所以只有在调用方**根本不关心返回值**时才可以放心改。销售域 10 个写入点全部符合这个条件，所以改；财务域有大量「拿到结果才决定下一步」的调用方，所以不改。**同一个改造任务，约束不同则手法不同——照抄上一版的做法才是错的。**\n\n**为什么「先改内存、再后台存」能解决「刚改完马上读」的问题**：因为读的是内存里的那份数据，而内存是在第一时间就被改掉的，落库是随后的事。如果反过来（先等落库成功再改内存），那「改完立刻读」就会读到旧值，且会出现「点了没反应」的卡顿感。**界面响应和数据持久化是两件事，不该互相等待。**\n\n**为什么「只是个名单」的字段不建表**：建表的代价不只是多一张表，还包括多一套接口、多一处权限登记、多一份校验规则。而这些字段**没有任何可用于查询的属性**——你不会去问「有哪些项目的团队里包含了张三」并期望数据库来回答。**没有查询价值，就不必承担表的维护成本。**相反，跟进记录会按日期排序、按结果筛选，这些都要数据库来做，所以它必须建真表。\n\n**为什么多组明细必须逐组独立判断「传了还是没传」**：这条规则的危险性随明细组数增加而放大。只有一组时，想错顶多清空一组；有三组时，一次误判可以同时清掉两组毫无关系的数据。而这类删除**不会报错、界面上也看不出来**，用户可能几天后才发现数据不见了——那时已经无法定位是哪次操作造成的。所以这里不只是要注意，还要**用测试把三种情况都钉住**。\n\n**为什么两个清单必须合并成一个**：三个字段读回为空这个问题的根因，是设计上存在「要转存文本的清单」和「要读写的清单」两处，二者需要人工保持一致。**只要存在两处需要人工对齐的地方，早晚会漏。**所以正确的修法不是「补上漏的那一处」，而是**让它从结构上不可能漏**——合并成一个清单，配置写一次就同时对两条路径生效。这是本轮最值得记住的一条：**能靠结构消除的隐患，不要靠人记得住。**\n\n**为什么只跑本域测试不够**：我改了「删除后返回什么信息」，销售域的测试是照着新格式写的，所以它是绿的；但上一版财务域的测试断言的还是旧格式，于是失败。如果只跑销售域，这个回归会一路带到生产。**测试的价值在于覆盖「我没想到会影响的地方」，而本域测试恰恰只覆盖「我已经想到的地方」。**所以每轮修完必须跑全量。\n\n**为什么数据权限值要逐个想、不能整批照搬上一版**：上一版是「全公司可查」，这一版是「只看本人」——如果图省事照搬，销售线索就会变成全公司都能翻阅的名单，而这些是业务员的客户资源，与该看的范围明显不符。**权限登记值是一个业务判断，不是一个技术参数**，它决定了谁能看到什么，逐张确认是唯一负责任的做法。\n\n**为什么本轮仍然不改任何页面**：这是这套做法的前提条件，也是它能被复制的原因。一旦开始顺手改页面，存储改造和界面调整就混在一起，出问题时分不清是哪边引起的，而且回归范围会从「几处接口」膨胀到「几十个页面」。**把爆炸半径压在数据层，是这个改造能一轮接一轮做下去的关键。**' },
        ],
      },
      {
        id: 'v3800',
        title: 'V3.8.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**财务域改造完成：上一版只建好了表，这一版把读写彻底切到了真正的数据库表。财务被 33 个页面引用（全项目最多），本次一个页面都没改。**\n\n**一、动手之前，先把「谁在用」数清楚**\n\n财务是全项目最不敢碰的模块。这次没有直接改，而是先把引用它的地方全部列出来：**共 35 个文件**（其中真正干活的 33 个），涵盖 22 个页面、6 个其它数据模块、3 个公共服务。列完清单后又专门查了两件事，结果决定了后面的做法：\n\n- **没有一处绕过标准方法直接改内部状态**——这说明只要保持方法名和参数不变，界面就不需要动。\n- 顺带查出一个真实缺陷：财务首页那几个汇总数字（应付总额、本月已付、逾期金额）**是写死的**，系统里明明有更新它们的方法，但全项目没有任何一处调用。也就是说，不管业务怎么变，那几个数字永远是示例值。本轮**没有去动它**，原因写在下面。\n\n**二、最要命的发现：上一版建的三张表，字段几乎全是错的**\n\n上一版为财务建了 7 张表。这次准备接入时逐张核对，发现其中 3 张**跟界面对不上**：\n\n| 数据类别 | 表里建的字段 | 界面真正用的字段 |\n| --- | --- | --- |\n| 会计分录 | 记账日期、摘要、科目编码、借方、贷方 | 日期、描述、借方科目、贷方科目、金额 |\n| 税务记录 | 只有 8 个字段 | 另有 8 个字段表内根本不存在 |\n| 项目核算 | 预算、实际、开始日期、结束日期 | 核算编号、总预算、总差异、毛利、毛利率…… |\n\n错的原因值得记下来：**建表时是按「会计上应该长什么样」推断的，而不是照界面真正在用的字段建的。**\n\n这会造成什么后果？如果不管三七二十一直接接上去，**数据会被静默丢掉**：写入时系统只挑表里有登记的列，没登记的键直接扔掉，**不报错、照样提示成功**。表现是——分录列表有行数，点开一看摘要、科目、金额全是空的。\n\n**三、为什么选择「重建表」而不是「加字段」**\n\n加字段不会丢数据，但会留下 16 个**永远为空的死列**。在会计凭证这种表里留死列尤其危险：后来的人看到「借方」这一列会以为那就是借方金额，而真实金额其实在「金额」列里——**一个列名就能让人算错账**。\n\n所以选择了重建。前提是：生产库里这三张表**自建立以来一行数据都没有**（接入前有逐步核对，确认 0 行才动手）。**空表重建代价为零，而且这是唯一能留下干净结构的时机——等数据进来之后就再也没这个机会了。**\n\n**四、两个「表里套表」的数据，走了专门的通道**\n\n财务里有两种数据是「一条主记录 + 若干行明细」：付款计划里带着**分期计划**，项目核算里带着**成本明细**。系统原有的通用写入通道只认「一行就是一条」，遇到这种嵌套会**把明细整块丢掉且不报错**——表现是计划建成功了，进去一看「分期」那一栏是空的。\n\n所以这两个类别走的是专门的通道。顺带把这套「主表 + 子表」的处理抽成了一个**通用工具**，因为后面还有销售、采购、生产几个域是同样的结构，不必每次重写一遍、每次都可能漏掉展开。\n\n**五、方法保持同步，内部改成「先改后存、失败退回」**\n\n财务的 33 个调用方里，大量是**立刻要用返回值**的：有的拿到结果才决定弹不弹提示、跳不跳转，有的直接把返回的单号写回单据。如果把这些方法全改成异步，33 处都要跟着改，回归风险远超收益。\n\n所以做法是：**方法名和参数一律不变**，界面上点一下立刻有反应，数据在后台慢慢存；**存失败就把界面退回原样，并给出一句能看懂的中文原因**。这里的原则是——**失败必须是吵闹的（退回去 + 红字提示），不能是静默的。**\n\n**六、新增 40 多条常驻自动检查**\n\n针对上面每一种「静默丢数据」的可能，都钉了钉子：写入 3 期分期、读回来必须还是 3 期；只改付款状态、分期一行都不能少；传空数组才是清空；删除时要报告连带删了几行；会计分录的 9 个字段逐个比对读回值。\n\n**七、需要如实说明的两点**\n\n① **财务首页那几个汇总数字仍然是写死的示例值**。本轮没动它，是因为它一直是这个样子，突然变成真数字会让人以为是算错了；改它需要后端真正做汇总，属于另一件事，已单独记录。\n② 至此**已完成关系化改造的域是：物料清单、打印模板、财务**三个；其余 57 个业务域仍在打包文件里，按顺序接下来做销售、审批流、采购、生产。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么必须先数清楚「谁在用」，再动手**：财务被 33 个页面引用，是全项目最多的。这种情况下「凭感觉改、改完跑一跑」是靠不住的——漏掉一个调用方，问题可能几个月后才在某个不常用的页面上冒出来，而那时已经说不清是哪次改动引起的。**清单的作用不是好看，是让「改完没改完」这件事可以被判定。**另外，正因为列了清单，才顺带查出那个一直没人调用的更新方法——这种「定义了却从没用过」的东西，不查清单是永远发现不了的。\n\n**为什么发现表建错了要推倒重建，而不是将就着加字段**：加字段的安全感是假的。它会让表里同时存在两套含义相近的列：一套是空的，一套是真正有数据的。对后来接手的人而言，他没有任何办法判断该读哪一列，只能靠猜；而**在会计数据上猜错，代价是账目错误，不是界面显示错误**。推倒重建的前提是「表里一行数据都没有」，这个前提必须**先核对再动手**——本次就是先数过行数、确认是 0 才重建的。如果表里有数据，那结论会完全不同，绝不能照搬这个做法。\n\n**为什么这次强调「表结构必须服从界面，而不是反过来」**：上一版建表时的思路是「会计上应该有借方、贷方两列」，听起来很专业，但界面上根本没有这两个字段，只有「借方科目、贷方科目、金额」。结果就是写进去的东西和界面要的东西对不上。**数据表是为业务服务的，业务长什么样，表就得长什么样**；凭专业常识去设计、再让业务来迁就表，方向就反了。这不是会计知识不够，是**参照物选错了**。\n\n**为什么两个嵌套类别必须走专门通道**：通用通道只挑已登记的列，遇到嵌套数组会**整块丢弃、并且返回成功**。这是最危险的一类失败——**界面看起来建成功了，明细却是空的**，而且没有任何提示。与其在通用通道里加一堆特例，不如给这两类数据单独开一条路，把「展开 → 写入 → 读回再组装」这件事在一个地方做对。\n\n**为什么要把「主表 + 子表」的处理抽成通用工具**：因为这不是最后一次遇到。销售订单、采购订单、审批流都是同一结构，如果每个域各写一份，就等于把「可能漏掉展开」这个风险复制四遍。抽成工具之后，风险只存在于一处，改一处四个域都受益。**更重要的是：工具里可以把「先删后插必须一次做完」这类硬要求固定下来，靠人每次记得写是靠不住的。**\n\n**为什么方法要保持同步，而不是全改成异步**：改成异步在技术上更「正确」，但代价是 33 个调用方全部要改，其中不少是别的数据模块在调用（比如质量、销售、仓库会自动往财务写分录）。一处漏改，表现是「数据看起来进了财务，刷新就没了」，而且极难定位。权衡下来，保持同步签名 + 内部异步落库 + 失败回滚，是这个阶段**风险最低、且界面体验最好**的方案。这不是回避异步，是**把改动范围控制在能验证的边界内**。\n\n**为什么失败必须「退回去 + 提示」，而不是「存着下次再试」**：财务单据录入是连续操作，如果第一次失败被悄悄留着，用户会以为已经存好了，继续录下一张——等发现时，已经分不清哪几张存了、哪几张没有。**静默重试在财务场景下等于制造对不上的账。**退回去虽然会让用户重填一次，但**它让「没存上」这件事当场可见**，这才是对数据负责的做法。\n\n**为什么本轮不修那几个写死的汇总数字**：它在改造前就是这样，用户看到的数字一直没变过。如果本轮顺手改成实时计算，数字会从固定值突然跳成另一个值，用户第一反应是「是不是算错了」，而不是「终于算对了」——**在没人预期的情况下改变数字，比数字不准更让人不安**。它需要一个真正的后端汇总接口，值得单独一轮做，而不是夹在迁移里顺手带过。' },
        ],
      },
      {
        id: 'v3700',
        title: 'V3.7.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**继续「数据关系化」改造：打印模板域完整落地（含图片外置），财务域建表与登记完成；同时给后端补上缺失多年的类型检查门禁。**\n\n**一、迁移顺序改由真实数据决定，而不是照原计划猜**\n\n原计划给第二个域排的顺序是按模块名猜的。这次先去量了每个业务域在库里的**真实体积**，结果把原计划推翻了：\n\n| 业务域 | 库内体积 | 被多少个页面引用 |\n| --- | --- | --- |\n| **打印模板** | **404.3 KB** | 6 |\n| 财务 | 15.0 KB | 31 |\n| 销售 | 10.4 KB | 35 |\n| 审批流 | 6.6 KB | 5 |\n| 采购 | 4.7 KB | 34 |\n| 生产 | 3.7 KB | 25 |\n| 价格 | 0 KB | — |\n\n**打印模板是第二名的 26 倍**，所以本轮先做它。这里有个值得记住的教训：如果按「程序文件有多少行」去排，打印模板只排第 13 名（463 行），而排第一的仓库模块（1215 行）在真实库里是 **0 字节**——**代码长短和真实数据量几乎没有关系，排优先级必须量真实数据。**\n\n**二、打印模板：这不是「数据」问题，是「数据和文件混在一起」的问题**\n\n拆开那 404 KB 发现：其中一个模板单独占 398.5 KB，而它里面 **397.5 KB 是图片**（一张公司标志），只有 1 KB 是真正的模板内容。更麻烦的是，经指纹比对，**同一张标志图在库里存了两遍**。\n\n第二份藏在一个**早已没人读取的废弃字段**里——界面保存模板时，会把页眉内容原样复制一份存进去，而这个字段从上一版起就没有任何地方再读它。它一直在安静地吃掉一半空间，没有任何人会发现。\n\n所以这次按两类东西分开处理：\n\n- **模板定义**（标题、纸张大小、页眉页脚内容、勾选哪些字段）= **数据** → 存进真正的数据表\n- **图片**（标志、印章）= **文件** → 存进独立的资源表，模板正文里只留一个**占位标记**\n\n**结果：模板正文从 398.5 KB 降到 1.7 KB，图片 149.1 KB 单独存放，合计 150.8 KB，比原来的 413.98 KB 省下 263.2 KB（63.6%）**。以后打开模板列表，那张几百 KB 的标志图不再被反复搬来搬去。\n\n**三、一个差点毁掉图片的坑（本轮最凶险的一段）**\n\n那张标志图是 152658 字节，而数据库单条命令写不下这么大（实测上限在 48~64 KB 之间），必须切开分次写。第一版做法是先占一个空位置、再一块一块追加。写完一测，**库里只剩 784 字节**——正好是最后一块的大小。\n\n最可怕的不是写错了，而是**它看起来完全正常**：查询正常、列表正常、界面正常，连记录字节数的那一列都还老老实实写着 152658。如果不是逐字节比对，这个损坏会一直潜伏到某天要打印时才被发现——届时原始数据早已删除。\n\n根因是「追加」这个动作依赖「上一块已经存稳了」，而这个前提实际不成立。最终改成**一块图片 = 多行数据**，每一块独立写入、互不依赖、不分先后顺序，读取时再按顺序拼回去。改完后做了逐字节验证：原始 152658 字节，库里拼回来 152658 字节，**头部、中部、尾部指纹全部一致，整体逐字节完全相同**。\n\n**四、财务域：发现了「迁了一半」比全没迁更危险**\n\n财务的**记账凭证**在上一版已经迁进了真正的表，但其余 7 类数据（发票、付款计划、分期明细、账务分录、税务、项目账、会计科目）还留在打包文件里。这造成三个具体问题：\n\n① **发票和凭证分属两种存法**，它们之间的关联关系加不上、删除时也不会跟着联动；\n② **无法判断一条发票到底存在哪里**——在库里还是在浏览器里；\n③ 最实际的一条：**换台电脑，凭证还在、发票没了，而且不会报任何错。**\n\n本轮已完成这 7 类的**建表与权限登记**。但**财务的程序改造留到下一轮**，原因要如实说明：财务被 35 个页面引用（全项目最多），改造它的风险与工作量都远超打印模板（仅 6 个页面）。本轮选择保持在「两个域完整闭环」的可验证状态，而不是凑成「三个域都是半成品」。\n\n**五、给后端补上了缺失的类型检查（本次最该记的一条）**\n\n说出来有些意外：前端代码一直有类型检查把关，但**后端代码此前完全不在检查范围内**——不是检查得不严，是压根没纳入。\n\n后果不是「少查一点」。本轮新建的打印模板接口一口气踩出 **4 个错误，全部只有真跑起来才暴露**，而它们的表现都是「界面上点一下就报服务器错误」：\n\n① 权限条件函数返回的是「一段条件 + 一组参数」的结构，我却把**整个结构直接拼进了查询语句**，于是数据库收到一句 `object Object`，报「找不到这一列」；\n② 取用户信息的函数应该传「数据库连接」，我传的是「整个环境对象」，报「prepare 不是一个函数」；\n③ 写审计记录的字段名写错了（写成了另一套名字），**不报错、但审计字段全空**——这是四个里最隐蔽的一个；\n④ 用户的组织编号字段名叫 `org_id`，我写成了 `orgId`（前端风格），导致**新建的模板组织编号存成了空值**，用户查不到自己刚建的东西。\n\n这四个错误类型检查和打包检查**一个都抓不到**，因为后端压根没被检查。现在补上了：新增独立的后端类型检查配置，并接入构建门禁——**以后构建前会自动检查，只报新增错误**（存量里有一批是既有写法导致的误报，已登记在案，不会再淹没真正的新问题）。\n\n**六、新增 27 条自动检查**，专门盯这几类「看起来正常、实际坏了」的情况：图片是否被写入过程毁掉（字节数与指纹双重比对）、占位标记是否被正确换回图片（否则打印出来页眉是空白）、同一张图用两次是否只存一份、只改名称时不该把图片弄丢、删模板时图片是否跟着清干净。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么先做打印模板，而不是先做引用页面最多的财务或销售**：体积不是唯一的理由，但它是最硬的理由。打印模板 404 KB 是第二名的 26 倍，而它是**每次打开都要整块读取**的——列表一打开，那 400 KB 就被整块搬出来，其中 98% 是图片。迁走它，是这一批里投入产出比最高的一处。反过来看，财务虽然被 31 个页面引用，但它只有 15 KB，迁走它对「打开速度」几乎没影响，真正的价值在于数据能不能被查询——**那是「有没有能力」的问题，不是「快不快」的问题，值得单独一轮做扎实，而不是顺手带过。**\n\n**为什么图片要单独存，不能继续放在模板内容里**：模板正文是「每次查询都要读」的，图片是「只有渲染时才需要」的。把一张 150 KB 的图塞进正文，等于每查一次列表就把这 150 KB 搬一遍——哪怕列表上根本不显示图。分开之后，正文只有 1.7 KB，图片只在真正要打印时才取。**这不是为了省空间，是为了让「查列表」和「取图片」这两件事不再互相拖累。**\n\n**为什么同一张图必须只存一份**：同一张公司标志常常既出现在页眉、又出现在页脚。如果按出现次数存，一张 150 KB 的图就变成 300 KB；而用户完全不知道自己存了两份。按内容指纹去重后，正文里两个位置写的是**同一个占位标记**，取的时候自然取到同一张图。**去重这件事必须系统来做，指望用户记得「这张图我已经用过了」是不成立的。**\n\n**为什么分片必须「一块一行、互不依赖」**：第一版「先占位再追加」的做法，错在它假设「上一步已经存稳了」。在高并发或批量写入的场景下，这个假设随时可能不成立——而它失败的方式不是报错，是**静默地只留下最后一块**。这种「看起来成功、实际损坏」的失败比直接报错危险得多，因为它会让人以为数据还在、从而删掉原始数据。改成一块一行之后，每一块都是独立的：少一块就少一块、能立刻被发现，绝不会出现「悄悄只剩最后一块」。**写数据的方式，决定了失败时是吵醒你还是骗过你。**\n\n**为什么验证必须让数据库自己证明，而不是把数据取出来比对**：这里踩过一次。用命令行取回图片内容做比对，得到的值只有实际的 4%，差点误判成「图片丢了 96%」——其实是命令行工具对超长内容做了截断。真正的做法是**让数据库自己算**：你告诉我这块数据有多少字节、头尾几个字节是什么。全程不把几百 KB 的二进制搬出数据库。**量东西要用量得准的工具，而最准的工具是数据自己所在的那个地方。**\n\n**为什么财务域只建表、不改程序**：把「两个域完整闭环」变成「三个域都半成品」，看似进度更快，实则三个域都不可验证——而不可验证的改造，比不改造更危险，因为它会让人误以为已经迁完了。财务被 35 个页面引用，是全项目最多的，任何一处接口形状变化都会连锁影响几十个地方。它值得单独一轮、带着完整的回归验证去做。**宁可少做一个，也不留一个说不清做没做完的。**\n\n**为什么后端类型检查这么晚才补上，以及为什么用「只报新增」的方式**：后端不在检查范围内这件事，是这次连踩四个坑才发现的——**之前没发现，不是因为没问题，而是因为问题都推迟到运行那一刻才以「服务器错误」的形式出现，而这类错误此前常被归因为「环境问题」**。至于为什么不全量清零：存量里约 40 条告警集中在同一种既有写法上（数组没标类型导致推断异常），运行期是正常的，属于误报。一次性改二十多个文件，风险大于收益，而且会淹没真正的新增错误。所以用「基线快照」：**存量登记在案，从此只报新增**。这样从今往后任何新增的后端代码都受检查，而历史包袱不会阻塞交付。**门禁的价值在于「从此不再变差」，不在于「一次性变完美」。**\n\n**为什么本轮要保留一个「接口层返回完整图片」的设计**：库里存的是占位标记，但接口返回给界面的是完整图片。这不是绕回去了——**库里的形态决定存储成本，接口上的形态决定好不好用**。界面拿到的是能直接显示的图片，不必知道「占位标记」这件事；而数据库里那条记录只有 1.7 KB。两者各司其职，缺一不可：只做前半段，图片还是每次被搬；只做后半段，界面就得自己去拼图。' },
        ],
      },
      {
        id: 'v3600',
        title: 'V3.6.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**启动「数据关系化」改造（对标路线图的 C 级第一项），物料清单（BOM，即产品用料结构表）作为第一个样板域已完成迁移**。\n\n**先解释这次改造在解决什么问题**：此前 BOM 数据是整体存成「一个打包好的文件」放在数据库里的（专业说法叫 JSON 大对象）。这种存法在数据量小时很方便，但它让数据库**完全不知道 BOM 内部长什么样**——对数据库而言，一个打包好的文件就是一串文字，它既不能按里面的内容查找，也不能替你把关数据的合理性。这带来三个看得见的后果：\n\n① **查不了「这个零件被哪些产品用到」**。这是采购和研发最高频的问题之一——某个零件的规格要改、要涨价、要停产替换时，必须先知道它会牵动哪些产品，否则一改就出事。但数据打包存着，数据库帮不上忙，只能把整个文件下载到浏览器里再一行行翻。本次改造后，这个查询变成数据库的一条命令，**新增了「按子件反查」的能力**。\n\n② **拦不住脏数据**。同一张清单的同一层出现两条一模一样的料、某一行的父件其实不存在——这些在打包格式里没有任何机制能拦住。改成表格存放后，数据库可以靠规则直接拒绝。\n\n③ **数据一大就变慢**。打包格式只能整包读取，清单越做越细，打开就越慢，而且有 8 兆的硬上限（超了直接拒绝保存，这是上一版加的保险）。\n\n**本次具体做了什么**：\n\n**建立了两张真正的数据表**（一张放清单表头、一张放每一行用料），并配套完整的读写接口。顺带修好了一个此前一直存在的隐患：数据库结构说明文件里**漏登记了 6 张表**（计划订单、后台任务、登录尝试记录等），意味着这些接口的输入**此前完全不做校验**——填错类型、填个不存在的日期都会直接入库。本次一并对齐。\n\n**最关键、也最危险的一步：处理多层次结构**。BOM 是分层的——一台设备的清单里有一行是「柜门组件」，柜门组件自己又有一张清单（门框、铰链），门框还有更细的一层。打包格式里这些层是**嵌套着写**的，而数据库表只能一行一行平铺。如果处理时按平铺方式直接写入，**嵌套的子层会被整块丢掉**——界面上完全看不出问题（最上面那几行都在），但清单展开时会少一整棵子树，后续算料也会跟着少算。这是典型的「静默丢数据」，比直接报错危险得多，因为没有人会察觉。所以这次专门做了逐层展开的处理，并为它写了独立的测试，把「写进去 5 行、读回来必须还是 5 行、层级必须还是 1/2/3 三档、第三层的父件必须指向第二层」这几件事固定成常驻检查。\n\n**界面上看不到任何变化，这是刻意的**。物料清单相关的 15 个页面（清单列表、清单详情、清单编辑、成本卷积、物料详情、成本归集、物料需求计划、按单设计、工单详情、销售订单详情等）**一个都不需要改**，因为接口返回的数据形状保持了原样。这样做的目的是让后续 5 个域（价格、质量、生产、财务、销售）能照抄这套做法，而不必每次动十几个页面。\n\n**新增 26 条自动检查**，覆盖完整的使用生命周期：新建（含三层嵌套）→ 读回 → 只改表头（明细不能丢）→ 整体替换明细 → 删除（明细要跟着删干净）。其中专门验证了两件事：**改清单状态时明细不会被清空**（否则一次改版本号会把整张清单的料清掉），以及**重复的清单编号会被明确拒绝并给出中文提示**（而不是报一个内部错误）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么必须先做物料清单这一个域，而不是六个域一起做**：一口气全迁的风险不在工作量，而在**没跑通就不知道错在哪**。本次选物料清单打头阵，是因为它有两个特点：一是它最难——别的域都是平铺的表格，唯独它有嵌套层次，「最难的做通了，其余的就是降维」；二是它位置最关键——物料需求计划、成本卷积、工单、销售订单一键生成都要读它，把它做对，后面几个域的做法就有了可靠参照。所以这一轮的目标不是「多迁几个」，而是**把「迁移 → 双写 → 切读 → 删旧」这条完整路径走通一遍、并留下可复制的模板**，同时用全量自动检查证明没有回归。这条路走通了，剩下五个域才敢批量做。\n\n**为什么最初想保留一份「本地缓存」，最后又删掉了**：改造时的第一版设计是这样想的——万一连不上服务器，界面总得能看，于是保留一份本地缓存。但这个想法是错的，而且错得很典型：这份本地缓存的存放位置，**恰恰就是我们要搬离的那个打包文件本身**。保留它等于「新库里写一份、旧库里再写一份」，两个来源都可能被修改，一旦不一致又没人知道以哪个为准——这正是本次改造要根治的毛病，保留它等于白改。所以参照之前同类改造的既有做法，把它一并删掉了。代价是断网时看到的只是初始示例数据、并且界面会明确提示「读不到服务器」——但**如实告知读不到，比展示一份来路不明的旧数据安全得多**。\n\n**为什么「改表头」和「清空明细」必须区分开**：这是一处必须想清楚的细节。改清单状态、改版本号这类操作只动表头，不涉及用料明细；如果系统把「没传明细」也理解成「清空明细」，那么一次改版本号的动作就会把整张清单的料全部清掉——而且因为操作本身是成功的，用户不会收到任何警告。所以这里的规则是：**没传明细 = 明细保持原样；明确传了空明细 = 清空明细**。两者的区别必须保留，这不是实现细节，而是数据安全的边界。\n\n**为什么明细的「先删后插」必须一次做完**：清单明细是有顺序的（第 1 层第几点、第 2 层第几点），改动一行往往意味着后面的行整体前移，所以做法是「先删掉旧的、再写入新的」。但如果一条一条写，中途失败就留下「旧的已经删了、新的只写了一半」的清单——**这种状态比整条操作失败危险得多**，因为界面看上去有数据、实际少了料，而且没有任何提示。所以这里要求整批要么全成功、要么全不生效（数据库支持这种「打包一次提交」的写法）。\n\n**为什么同一张清单里允许出现两条相同的料**：这一点与直觉相反，但必须遵守业务事实。比如某个标准件在框架段用一次、在底座段再用一次——用量不同、安装工序不同、有的还算关键件。如果按「同一张清单里同一物料只能出现一次」去强制去重，就会把其中一条真实存在的用料吃掉。所以清单明细的唯一性判断依据是「哪一层、第几点」，而不是「用了什么料」。\n\n**为什么成本数字要重复存一份，而不是每次现算**：物料清单上的成本是从物料主数据和工艺路线推算出来的，理论上可以每次重新算。但一份清单一旦发布（进入报价、进入成本核算），它上面的成本就必须**冻结**——因为它是当时那个报价、那笔成本的依据。如果事后某个材料涨价，三个月前那张已发布的清单成本跟着变，历史账就没法对了。所以存下来的是「发布时刻的成本快照」，这是刻意的冗余，不是重复存储。\n\n**为什么改了清单表，还要同步改两处「配套登记」**：这是上一次改造踩过的坑留下的教训。本项目有一套行级数据权限机制，规则是「**没登记的表格一律查不到数据**」（默认拒绝，这样漏登记会立刻以「查不到」的形式暴露，而不是悄悄放行）。所以新增数据表必须同时登记，否则新功能会表现为「列表永远是空的」，而且不报错、极难排查。另一处是输入校验：校验器靠表名自动推断子表名（「采购订单」→「采购订单明细」），这套推断规则遇到「BOM 表头」会推出一个不存在的「BOM 表头明细」，导致明细行的校验被**静默跳过**。所以这里显式登记了这个例外——表名表达的是业务含义，不该为了迁就程序的推断习惯而改名。\n\n**为什么这轮改造不改任何页面**：因为改动的价值在**数据存取方式**，不在界面。15 个页面一起改，一是工作量与回归风险都成倍增加，二是会把「存储改造」和「界面调整」两件事混在一起，出问题时难以判断是哪一边引起的。保持接口形状不变，等于把这次改造的爆炸半径控制在「数据层」，这也正是它能被复制到其他五个域的前提。' },
        ],
      },
      {
        id: 'v3500',
        title: 'V3.5.0（2026-09-15）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**完成竞品对标整改里「B 级 · 流程闭环与体验短板」的全部七项，至此对标报告所列 A 级五项与 B 级七项全部收口**：\n① **物料需求计划（MRP）会告诉你「什么时候要」和「先算哪个」了**：此前 MRP 只给一个总量——「这个料要 1000 件」。计划员看到这个数字无法判断是「下周就要 1000」还是「分三个月每月 333」：前者必须紧急备货，后者可以按批投放、少占资金与仓位。本次新增**期间分布**（把需求按周切分，周一为起点，一列即看清是集中要货还是多周分摊）与**层级**（物料在物料清单树里位于第几层，成品为 0，数字越大越靠近原材料）。层级还有一个不显眼但很关键的作用：它决定了运算顺序——同一个通用件（比如标准螺栓）既可能直接用在成品上、又可能用在更深的半成品里，计算时必须让所有会用到它的父件都先算完、再算它，否则会出现「算了两遍、后一遍把前一遍盖掉」的经典错误。因此结果排序也改成按层级从成品往零件排，界面阅读顺序与实际决策顺序一致。\n② **计算结果可以存下来了**：此前 MRP 算完的结果只活在当前页面里，关掉或刷新就没了——上午算完下午开会回来，得重新算一遍；而且采购到底有没有按建议执行，事后无法核对。本次新增「落库为计划订单」：把算出来的建议整批存进数据库，形成一个**可查、可确认、可转换**的中间单据（这是制造业的标准做法，它是「需求」与「执行」之间的缓冲区）。三个设计要点值得说明：**重复点击不会产生重复记录**（同一批运算用同一个批次号，重复提交只会覆盖更新）；**重算不会抹掉你已经确认过的建议**（落库只更新数量，不碰状态，因为「确认」是人的判断，不能被机器覆盖）；**已转成正式单据的建议不可退回**（否则计划订单与真实单据脱钩，追溯链断裂）。每条建议同时记下「毛需求 / 现有 / 在途 / 净需求」四个数，界面上就是一行算式，有人质疑「为什么是 500」时不用回去重算。\n③ **产能计划能看到「哪一天要爆」了**：此前产能负荷只给一个平均值——「这个工作中心负荷 85%」，看不出问题出在哪天。而现实是产能**不均匀**：周六可能只上半天、周日停工、节假日整段不开。按「每天都能干 8 小时」去算，会出现两类严重误判：需求落在周日时系统说「负荷 60%，没问题」，实际那天一个人都没有；需求跨周末时产能被高估四成。本次新增**日负荷曲线**：把需求按工单的计划起止日摊到每一个**开工日**上逐日比对，用颜色直接标出超载日；并新增**班次日历**设置（周六产能、周日产能、节假日清单），可随各车间实际情况调整。特别地，**「需求落在非开工日」会被单独标红计数**——这是排产时默认了「休息日也能干活」的直接证据，实际会顺延到下一个工作日，交期需要相应顺延。\n④ **需求预测从「看三个月平均」升级为「看懂趋势与季节」**：此前的预测是「最近三个月销量的平均值」，有两个硬伤：一是**对转折视而不见**——销量从 100 掉到 50，三个月平均要等到第三个月才降到位，前两个月会按 67、58 去备货，多出来的货压在仓库里；二是**完全没有季节性**——卖空调的厂家 5 月备货和 11 月备货量差好几倍，平均值会把旺季的高和淡季的低抹平，于是旺季缺货、淡季压仓。本次改为**霍尔特-温特斯模型**（水平 + 趋势 + 季节三项组合，工业界最常用的做法）：既能跟上转折，又能算出「这个月本来就该多/少多少」。同时输出三个让人能判断「这个预测可不可信」的信息：**趋势方向**（在涨还是在跌、每月涨跌多少）、**季节因子表**（12 个月各自的调整量）、**拟合优度**（越是贴近历史越可信，偏差过大说明历史太乱、该模型的季节规律不成立）。历史不足两年时不强行估计季节（少于两年无法区分「这是季节」还是「今年恰好如此」）。另外，再订货点的计算也改用预测值而非历史平均值，使刚发生的转折能及时反映到补货建议上。\n⑤ **报表中心从「书签夹」变成真报表**：此前「报表中心」是一面卡片墙——每张卡片写着报表名和描述，点下去跳到别的模块页面，**它自己算不出任何一个数字**。想看「本月采购金额合计」，得先跳到采购订单列表、再自己加或用导出。本次新增「数据速查」视图，内置六张实时报表：采购金额按供应商 / 采购金额按月份 / 销售金额按客户 / 销售金额按月份 / 库存金额按物料 / 工单按状态，都带**合计行**与**记录数**列（让「1 条」和「10000 条」看起来不一样，避免误读）。每一列的口径说明鼠标悬停即可看到——写清「这个数是怎么算出来的」。原有的卡片墙完整保留，可通过右上角切换。\n⑥ **几十个会改数据的接口补上了留痕（覆盖率从六成提到八成二）**：逐个体检了开发时没能覆盖到的接口，本次补齐 17 个文件（入库/出库/调拨/库存调整/质量扣留/外协/序列号/工单领料/汇率/三单匹配/用户权限/后台任务/邮件配置/版本通知/物料迁移/大模型配置/AI 对话/发票识别/组织级配置）。留痕内容一律写「**变了什么 + 前后值 + 影响范围**」，而不是「更新了 XX」——只写后者，事后追责时等于没写。安全上有一条硬约定：**授权码、接口密钥、调度令牌、AI 对话正文、发票识别全文一律不进留痕**，只记「是否变更过」与元信息（留痕的读者范围比一次操作大得多，把敏感值抄进去等于二次扩散）。剩下 11 个未补的全是登录类接口，是**有意不补的**：登录、退出、注册这些动作本身就是身份证据，已经在登录锁定记录、会话表、验证码记录里各有一份，再写一条只会得到同一事实的两份记录、还可能不一致；理由已完整写在代码里，避免以后被误当成遗漏。\n⑦ **上千行的列表不再卡顿**：部分列表页（物料、库存流水、审计日志等）没有强制分页，行数可以轻松上千；全量渲染一千行 × 十列等于一万个单元格，每次排序、筛选、选中都会让页面卡半秒。本次给通用表格加了**长列表按需渲染**：仍然渲染真实的表格行（保留原有的框选复制、行内链接、排序筛选等全部能力），只是把滚动到视口外的行换成等高占位，视觉与真实滚动完全一致，DOM 里的行数从「全部」降到「视口内 + 上下各留 20 行」。**只在行数超过 200 且未分页时启用**——小列表本来就不卡，强行改造只会引入「滚动时行高跳动」的新风险。\n配套：第 50 条数据库迁移（计划订单表，含唯一的批次约束）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么计划订单必须存在，不能让 MRP 算完直接生成采购申请**：MRP 算出来的是「建议」，不是「命令」。计划员看到结果的第一反应通常不是照单全收，而是「这批料我知道车间已经备了」「这个供应商交期不准，得多留点」。如果算完即下单，一次参数配错就会直接产生一批不该有的采购申请，而撤回下游单据的成本极高（可能已经发出去了）。中间多一道计划订单，本质上是**给人留出判断的余地**——机器负责算得又快又全，人负责判断哪些建议在现实中站得住。这也是为什么「确认」必须由人来做、且系统绝不自动确认。\n**为什么落库不能顺手把状态也改了**：这个问题反过来想很清楚。假设重算落库时把状态一并刷新：计划员上午确认了 20 条建议，下午改了安全库存参数重新运算并落库，那 20 条盖章全被刷回「待处理」，而他不会知道——**他会以为自己确认过，实际上没有**。这种「看起来还在、其实已经被抹掉」的状态，比直接丢数据更危险。因此落库的更新语句刻意不含状态字段，只更新数量与时间；系统里凡是「人的判断」，机器都不能覆盖。\n**为什么产能要按「开工日」而不是按「自然日」摊**：这是一个容易被忽略但影响很大的口径问题。制造业的可用产能不是均匀的——周六只上半天、周日停工、节假日整段不开。若按自然日均摊，需求落到周日会被算成「那天能干 60% 的活」，而实际上是 0；跨周末的一段需求，可用天数会被高估四成。这两类误判都会让计划看起来「来得及」，实际必然延期。所以本次把周末与节假日如实扣除，并且**把「需求落在非开工日」单独标出来**——它暴露的是排产时默认了休息日也能干活，这个默认必须由人看见并决定顺延还是调整计划日期。\n**为什么不假装做复杂的班次排班**：真实的班次（早班/中班/夜班各多少人、几点交接）属于考勤与排班系统的数据，本系统没有。在没有真实班表的前提下硬做多班次，只能编造数字——那比不做更糟，因为编造的数字也会被人当真。因此本次只做「工作日 / 非工作日 + 每日产能系数」两件事，这个粒度足以回答「这批货能不能按时做完」，而且**每一个数字车间主任都能核对**。\n**为什么预测要用霍尔特-温特斯，而不是简单加个「同比增长」**：需求变化的来源有三种，混在一起会互相掩盖。第一种是**水平**（平常每个月大概卖多少），第二种是**趋势**（是在涨还是在跌），第三种是**季节性**（这个月本来就该多或少）。移动平均只能看到第一种；加个「同比增长」只能看到第二、三种之和，拆不开。霍尔特-温特斯的做法是把三者分开估计、各自跟随实际情况变化，因此能回答更具体的问题：「这个月在涨，但涨幅没往年 5 月那么猛」。同时，把「拟合优度」一并输出很重要——**任何预测都该附带一个「这个预测有多可信」的判断依据**，否则使用者无法决定该不该照它备货。\n**为什么季节因子要做归一化，以及为什么历史不足两年就不做季节**：季节因子如果 12 个都偏正（整体高估），会把系统性偏差带进每一期预测，所以要把它们的和调成 0，让季节只表示「相对这个月平均而言多还是少」。至于两年的门槛：一年的数据里，每个月份只出现一次，无法区分「这是季节规律」还是「今年恰好如此」，强行估计只会把偶发噪声当成规律——**宁可不做季节，也不能把噪声当规律**。\n**为什么不用现成的图表库和虚拟滚动库**：这两处都是为了「不拆掉已经好用的东西」。表格现有的能力（多级表头、拖拽框选、Ctrl+C 复制成表格数据、行内链接跳详情）都依赖真实的表格结构，而多数虚拟滚动库是用绝对定位接管布局的，会把这些能力全部改写——等于为了滚动流畅牺牲掉功能。同理，报表只做「算出数字」，画图交给页面已有的组件，这样数字可以被单独校验。**已有的成熟能力优先保留，性能问题用不破坏它的方式解决。**\n**为什么报表的口径说明要写在代码里、和数字一起呈现**：报表最常被质疑的问题是「这个数不对」，而绝大多数情况不是算错了，是**口径没说清**（是含税还是不含税？按订单日期还是到货日期？）。把口径写在定义里、界面悬停可见，等于把「为什么是这个数」和「这个数是多少」绑在一起——分开写的话，文档一定会过期，而过期的文档比没有文档更误导。' },
        ],
      },
      {
        id: 'v3400',
        title: 'V3.4.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**新一轮全维度竞品对标（对比 SAP S/4HANA Cloud 2608 / 金蝶云·星空 V9.1 / 用友 BIP 6·U9 cloud 2026）后的第一批「A 级必做」整改**：\n① **业务操作的留痕补齐（14 个后端接口、21 处）**：对照发现系统在「能不能留下证据」上有个明显空档——审计机制本身做得很好（写失败会分三层兜底、绝不拖累业务），但 48 个会改动数据的接口里，有 33 个根本没去调用它。也就是说，最好的留痕机制没有接到最需要留痕的动作上。本次优先补齐风险最高的 14 个：入库、出库、调拨、库存调整、质量扣留、外协，以及采购订单 / 销售订单 / 工单 / 物料 / 客户 / 记账凭证的**修改与删除**，还有**开放接口密钥的创建、吊销与轮换**。其中两处特别值得一提：库存调整会把「调整原因」一起写进留痕（盘盈盘亏最容易被用来做手脚）；记账凭证的修改与删除从此有据可查。留痕文案一律写成能直接读懂的中文，带单号与原因。覆盖比例从约三成提升到约六成。\n② **列表加载时不再「先假后真」**：此前打开列表先显示本机或内置数据，等云端数据取回来后整张表突然换一遍，中间没有任何提示——你看到的第一屏其实不是真数据。本次给通用表格增加了「加载中骨架屏」：加载时先显示与真实表格**列数、行高完全一致**的灰色占位行，数据到了再替换，不会出现空白或跳变。已在物料、采购订单、销售订单三个最高频列表启用。\n③ **物料需求计划（MRP）终于把「废品率」算进去了**：BOM（物料清单）每一行早就维护了废品率，但计算物料需求时**一次都没用过**——这意味着过去算出来的采购与生产计划系统性偏少，凡工艺上必然有损耗的物料都会不够用。本次改为在 BOM 逐层展开时按「计划用量 = 净用量 ÷ (1 − 废品率)」反推，而不是简单乘一个系数：废品率 10% 时，简单乘 1.1 得到 1.10，正确算法 1 ÷ 0.9 ≈ 1.111，**废品率越高差距越大**。界面新增「废品率」列（多来源时按需求量加权平均）并在毛需求下标注「含废品损耗 +N」，让这个以前看不见的量变得可见。\n④ **多语言从「空壳」变成「真能用」**：此前系统号称支持中英双语，但字典只有 14 条、界面上实际调用的地方只有 1 处——切换语言后除了 1 个标题，其他什么都没变。本次重建语言底座：把侧栏 146 条导航、通用动作词、状态词、字段名统一登记为词条；顶栏新增语言快切按钮（一键中英互切，不必进设置页）；日期、数字、金额的显示格式也随语言变化，避免出现「英文界面 + 中文日期」这种一眼假的组合。同时把「翻译债」摆到明面上：「设置 → 多语言」页显示英文覆盖进度条与待补录清单，管理员可现场填写词条并云端保存，**改文案不必再改代码重新发版**。没有英文的位置一律回退显示中文原文，**绝不显示 key**，也**不做没有人工校对的机翻**。\n⑤ **业务数据体积上了「预警线」，不再等爆了才知道**：目前 60 个业务域以「整块 JSON」的形式存在一个键里，此前没有任何地方记录它们各自有多大。本次新增体积监控：每次保存记录该数据域的体积、历史峰值与写入次数；超过 4 MB 只告警不拦截，超过 8 MB **直接拒绝保存并说明原因**——这是有意的选择，因为**静默丢数据远比明确报错严重**（过去写失败会被静默吞掉，用户看到「保存成功」、刷新后数据回滚，等发现时已积压大量未上云的本地数据）。新增「设置 → 数据容量守护」页，按占用比例排序列出各数据域，用来判断「该先迁哪个域到关系表」，而不是拍脑袋决定。\n配套：第 49 条数据库迁移（体积指标表）；新增前端端到端用例 v340-a-level（A3/A4/A5 三条行为固化）。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么留痕要一个接口一个接口地补，而不是加一道统一开关**：系统运行在 Cloudflare Pages 上，它没有「所有请求都先过一道处理程序」的机制，只能逐个接口写明。逐个写看起来笨，但换来一个关键好处：留痕内容可以写成「创建库存调整单 ADJ-2026-003，原因：盘亏」这种人能直接读懂、审计时不用再猜的句子。统一开关只能机械记录「某接口被调用了」，单号、原因、有效期这些真正有用的信息一个都没有——**留痕的价值在于事后能还原当时发生了什么，不在于证明曾经发生过什么**。\n**为什么骨架屏要做得和真实表格一模一样**：如果占位行的列数或高度与真实数据不一致，数据到达的那一刻整张表会抖一下，眼睛要重新找刚才在看的那一行。**加载提示本身不应该制造新的干扰**。\n**为什么废品率用「除」而不是「乘」**：这不是风格问题，是口径问题。为得到 N 件合格投入，需要投入的是 N ÷ (1 − 废品率)，而不是 N × (1 + 废品率)。后者在废品率低时看起来差不多，废品率一高就系统性偏少——而废品率高的物料恰恰是最容易缺料的那些，误差正好落在最不能错的地方。同时把废品率夹取在 0~99 之间，避免脏数据（误填 100%）导致除零算出无穷大。\n**为什么多语言不一次性全量翻译**：209 个页面的全量翻译超过 40 人天，而且每新增一个页面就再欠一次翻译债，属于典型的「一次性投入巨大、之后持续失血」。本轮先把**能真正用起来**的部分做扎实：导航（一个外籍同事最先看的就是菜单）、通用动作、状态词、字段名、以及格式规则（日期/数字/金额），这已经覆盖了「换个语言能不能干活」的核心。剩下的按页面逐步补，并且把缺口显式暴露出来而不是假装没有。\n**为什么缺失词条要回退中文而不是显示 key**：显示 key（比如 nav./material/list）对用户毫无意义，等于把工程的内部编号甩给业务人员；回退中文至少意思是对的。**「翻译没做完」是可以接受的，「界面变成乱码」不可以。**\n**为什么体积超限要拒绝而不是继续尝试写入**：过去写失败是静默的——用户看到「保存成功」，刷新后数据回滚，等发现时已积压大量未上云的本地数据，而且无法判断到底丢了哪些。拒绝写入至少会立刻报错、用户当场知道、数据还在本机没丢。**报错是可发现的，静默是不可发现的；宁可吵，不可哑。**\n**为什么容量监控要记录「历史峰值」与「写入次数」**：只看当前体积只能回答「现在大不大」，回答不了「是不是在快速变大」。峰值明显高于当前值说明该域经历过批量导入；写入次数多且体积持续增长，说明它只增不减（凭证、流水这类），是最该优先迁走的。这两个数字直接决定迁移顺序，比拍脑袋可靠。' },
        ],
      },
      {
        id: 'v3300',
        title: 'V3.3.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**收口独立安全评测报告的最后两项（行级权限登记 + 审计失败留痕），至此报告 23 项发现全部整改完毕**：\n① **行级权限从「默认放开」改为「默认拒绝 + 全量登记」**：此前系统的数据可见范围（能看全公司 / 只能看自己 / 只能看本部门）采用「没登记就按全公司可见」的做法。也就是说，某张表如果没人登记，它默认对组织内所有人开放——**这是一个隐式的默认值，不是有人做出的决定**。这次改为反过来：**没登记的表默认对谁都不可见**，同时把 48 张业务表逐张写清可见范围（仅公司全员可见 36 张、仅本人可见 7 张、仅本部门可见 5 张），另有 18 张平台自身使用的表（登录账号、组织、审计、数据库迁移记录等）登记为免数据隔离并逐张写明原因。好处有两个：一是以后新增功能如果漏登记，结果是「看不到」而不是「悄悄都能看」，问题会立刻暴露而不是变成长期越权；二是排查权限时有一张权威清单可查，不必再去代码里逐处找。\n② **权限登记是否完整，系统自己会检查（双向）**：新增一项自检——拿数据库里**真实的表清单**与登记表逐一比对，往两个方向都查：一是**漏登记**（库里有的表没登记，会立刻变成「查不到数据」，并在「设置 → 安全中心」列出表名）；二是**僵尸登记**（登记了、但库里根本没有这张表，虽不影响数据显示，却会让这份权限清单失去可信度）。也就是说，「登记表准不准」不再依赖人工核对，而是机器判定；平台自带的内部表（数据库迁移记录等）会单独列出、不算漏登记，但**如实显示**不隐藏。这一项在首次上线生产时就真的抓到了一条不存在的登记项（某一版数据库迁移的临时表，用完即改名消失），说明靠人记得住确实不成立。\n③ **审计写入失败不再「无痕消失」**：此前各业务操作都会写一条审计记录，写入失败时会被静默忽略——业务照常进行，但这次操作在审计里**完全没有痕迹，也没有人知道**。现在改为三层处理：第一层，失败时立即在服务端日志打一条醒目标记（零依赖，一定打得出来）；第二层，把失败详情（哪个操作、哪个人、什么原因）写入一张独立的「审计降级记录」表，与审计主表分开存放，避免主表本身故障时连带失败；第三层，**绝不让审计影响业务**——记录失败只登记、不报错、不阻断，避免出现「因为记录日志失败导致业务办不成」的倒挂。迁移前的老库没有这张表时会自动降级跳过，不会阻断任何功能。\n④ **管理员能看到审计与权限的健康状况**：「设置 → 安全中心」新增「审计与行级策略健康度」卡片，显示审计记录总数与近 24 小时数量、降级记录数、已登记表数量与三种可见范围的分布、免登记平台表数量，以及是否有漏登记、是否有命中默认拒绝的记录。\n⑤ 顺带修复数电票相关接口两处真实缺陷（均为本次整改核对字段名时才发现）：（a）配置保存接口写入审计时用错了字段名——写入了审计表里并不存在的列，因此每次保存都会在审计环节报错；又因为这里没有兜底，造成「外部存储其实已保存成功、界面却提示失败」的状态与反馈不一致；（b）批量核验接口有同样的字段名错误，但因为外面包了兜底，失败被静默吞掉——结果是**发票核验的审计记录从来没有落过库**，而这恰恰是最需要留证的合规动作。两处现统一走标准审计通道。另外，配置保存接口在「外部存储通道尚未开通」时不再直接报服务器错误，而是明确返回「通道尚未绑定」的可读提示。\n配套：第 48 条数据库迁移（审计降级记录表）；生产门禁新增第 16 套「行级策略与审计降级」回归断言。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么默认值要选「不可见」而不是「可见」**：安全的默认值必须是「拒绝」。默认放开的问题不是「放开了」，而是**放开这件事没有人做过决定**——没人登记的表悄悄对全员开放，出事时既找不到决策记录，也说不清是不是有意为之。反过来，默认拒绝的代价是「新功能可能一开始看不到数据」，这个代价是可见的、一次点击就能发现并修好；而默认放开的代价是隐性的、可能潜伏几个月。**两种错误的方向不同：一种吵醒你，一种不吵醒你，永远选会吵醒的那种**。\n**为什么不只是改默认值，还要加自动比对**：把默认值改严只是把「漏登记」的后果从越权变成了不可用，漏登记这件事本身还在。因此必须再补一道机器检查——拿数据库真实表清单去比对，漏一张就报一张。这里刻意**不用人工维护的表清单**去比对：人工清单本身就可能过期，用它去查漏等于用可能出错的尺子去量东西（这个教训在之前的备份功能上已经踩过一次）。\n**为什么审计失败要「三层」而不能简单处理**：只打日志，运维不看就等于没做；只写数据库，万一审计主表本身出问题（比如表结构变更、磁盘写满），降级记录会和它一起失败，等于把仅有的线索也一起弄丢。所以第一层是「不依赖任何外部条件」的日志，第二层是「与主表独立」的降级表，两层互为备份。第三层「绝不阻断业务」是明确取舍：**审计的目的是事后追责与可观测，不是阻断交易**；如果为了记录失败而让一张采购单无法创建，这个系统就没法用了。真正需要担心的场景（有人系统性删除审计）会由日志和降级表共同暴露。\n**为什么这两项排在最后**：它们确实都是低风险发现，但改动面不小——一个涉及 52 个接口的权限口径、一个涉及全系统所有审计写入路径。放在最后做，是因为前面几版（V2.98.0 到 V3.2.0）已经把其他 21 项修完，此时改动的影响面可以与其他问题解耦，回归验证的目标也更清晰。同时这两项是评测报告里最后两个「未整改」标记，收口后报告的整改链条才是完整的。\n**顺带说明一个真实缺陷是怎么被发现的**：本次在统一审计写入通道时，顺手用真实数据库结构去核对每一处审计写入的字段名，发现数电票接口写入了三张根本不存在的列——这个错误在类型检查与打包阶段都看不出来（后端不在类型检查范围内），只有在真实运行时才会报错。同时暴露出该接口「先写审计、再报错」的顺序问题。这两个问题都不是评测报告里写过的，是本次整改过程新暴露出来的，已一并修复。' },
        ],
      },
      {
        id: 'v3200',
        title: 'V3.2.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**按独立安全评测遗留清单，完成余下 3 项整改（接口密钥生命周期 2 项 + 组织准入 1 项）**：\n① **接口密钥有了有效期，到期自动失效**：此前开放接口密钥一旦签发就永久有效，只能靠人记得去吊销——实际情况是没人记得，密钥就一直躺在第三方系统里。现在创建时可选 30 天 / 90 天（默认）/ 180 天 / 365 天 / 永久，**到期后网关自动拒绝**，不需要任何人记得动手。迁移前已签发的旧密钥不强制设置到期时间、保持永久有效，避免上线瞬间把线上集成全部切断；列表里会明确标出「有效 / N 天后到期 / 已过期 / 永久」，也能看到最近一次轮换时间。\n② **密钥不再允许写在网址里**：此前既支持请求头也支持网址参数（问号后面带 api_key）。网址会进入浏览器历史、服务器访问日志、Referer 头以及中间代理的转发链路，等于把等同于口令的凭据四处散播。现在**只接受请求头**，一旦发现密钥出现在网址里会直接拒绝，并明确提示应该改成什么写法。\n③ **密钥可一键轮换**：新增「轮换」按钮，点一下即生成新密钥、旧密钥同一时刻失效。轮换采用**原地替换**——密钥的编号、标签、权限范围、限流与审计归属全部不变，你只需把第三方系统里配置的那个字符串换掉，不必重建整套集成配置。已吊销的密钥不允许通过轮换「复活」。\n④ **公司异常时成员不能再登录**：此前登录只检查账号本身是否正常，不检查其归属的公司是否存在、是否有效。结果是公司被停用或被移除后，成员照样能登录并拿到 30 天有效会话，形成一批无人管理却有效的凭据。现在登录与会话校验都增加了公司状态检查：公司不存在、公司待审批、公司已停用，三种情况一律拒绝，而且**已经登录的人在下一次操作时也会立即失效**。\n⑤ 顺带修复：吊销或轮换一个不存在的密钥，此前会返回「成功」，现在正确返回「找不到该密钥」。\n配套：第 47 条数据库迁移（密钥有效期 + 轮换留痕字段）；「API Key 管理」页新增有效期选择、有效期状态列与轮换按钮；生产门禁新增第 15 套「凭据生命周期与组织准入」回归断言。' },
          { kind: 'why', title: '为什么这样操作', text: '**为什么网址传参要「明确拒绝」而不是「悄悄忽略」**：另一种做法是干脆不认网址里的密钥、当作没传。看起来更平滑，但会造成更糟的结果——调用方以为已经改好了（因为他确实还在用网址），实际上是另一处凭据在生效，问题被掩盖，等到那处凭据也失效时才会集中爆发。明确拒绝会让它在第一次请求就暴露，并且直接告诉他正确写法，这是更负责的处理。\n**为什么轮换要「原地替换」而不是新建一条**：钥匙换了，但门锁还是同一把。调用方在第三方系统里配置的是一个字符串，他还需要知道这个字符串对应哪条记录、有什么权限。如果轮换就新建一条，调用方得同时更新「密钥」和「记录编号」两处配置，运营成本翻倍，实际结果就是大家不愿意轮换。原地替换把成本降到「改一个字符串」，轮换才可能真正被执行——**安全措施只有足够便宜，才会被用起来**。\n**为什么旧密钥不强制过期**：整改必须考虑真实系统正在运行。如果升级后立刻要求所有密钥必须在某个日期前失效，线上集成会在毫无准备的情况下中断，而且是在别人手里中断，排查成本极高。因此本次选择「新建的密钥默认 90 天、历史的保持永久」，让保护渐进生效；等各集成方都完成一次轮换后，再考虑收紧默认值。\n**为什么公司状态的检查要放到「每次请求」而不只是登录时**：只拦登录的话，公司上午被停用，成员昨天登录的会话还能继续用满 30 天，闸门形同虚设。放到每次请求才能真正做到「一停即断」——这与之前账号停用的处理是同一个道理，属于同一条经验：**鉴权只做在入口是不够的，权限必须在每次请求持续生效**。\n**为什么超级管理员要被豁免**：这是个必须留的口子。如果唯一的平台超级管理员所在公司因为任何原因被标记为异常，而他又被这条规则挡在门外，就没人能进入系统修复这个问题。安全设计要特别小心这种「把自己锁在门外」的规则，因此对平台运维角色明确豁免，并在代码注释里写清原因，避免以后被当成漏洞误改。' },
        ],
      },
      {
        id: 'v3100',
        title: 'V3.1.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**补齐独立评测报告遗留的最后两项架构级问题（前端持久化可感知失败 + 后台任务可靠调度）**：\n① **保存失败不再「假装成功」**：此前在页面上改了数据，如果云端因为网络抖动、服务器故障或权限不足没写进去，系统会把错误**悄悄吞掉**——界面照常提示成功，本地也存了一份，于是你以为存上了；但下次打开时以云端为准，改动**无声回滚**，换台电脑看到的还是旧数据。现在的做法是：写入失败会立即在界面右下角常驻提示「有 N 项改动尚未保存到云端」，并自动按 5 秒 / 15 秒 / 30 秒 / 60 秒的节奏重试，你也可以点「立即重试」。权限不足（比如普通成员写组织级配置）会单独以黄色提示说明原因，不会反复骚扰。\n② **多端同时改同一份数据不再互相覆盖**：状态数据原先是「整块覆盖」，谁后保存谁说了算，先保存的人改动全部消失且毫无提示。现在每次读取会带回一个版本号，保存时比对：版本对不上就返回「该数据在其他设备或其他成员已被修改」，并把云端最新版本载入本机，由你决定刷新后重新修改，绝不再无声覆盖。\n③ **账号停用后本机缓存不再残留**：此前账号被管理员停用后，当事人只要不重新登录、直接刷新页面，依然能看到全部客户、价格、订单数据，还能继续往本地写。现在收到「登录状态失效」后会**清空本机缓存并跳回登录页**，并明确提示失效原因，让停用真正生效到数据层。注意：只有账号失效才清空；网络不通时仍保留离线可用。\n④ **后台任务改为可预期的定时触发**：安全邮箱的延时投递原先只能靠「正好有人访问系统」时顺带触发——没人访问就一直拖着，8 小时可能变成好几天，而且过程不留痕、失败完全看不到。现在提供一个统一的「推进接口」，由外部定时源（例如一台常开电脑上的 Windows 计划任务）每 10 分钟调用一次即可；项目里已附带注册脚本，在「设置 → 安全中心 → 后台任务调度」复制调度令牌后双击运行即可完成注册。同一页面还能看到**队列状态**（待投递 / 已到期 / 已完成 / 失败）、**最近执行留痕**（什么时候跑的、谁触发的、处理几个、耗时多少、失败原因），并支持手动「立即推进」与「重放失败任务」。即便外部调度没配置，系统原有的「请求顺带触发」仍作为兜底保留，功能不会失效。\n配套：第 46 条数据库迁移（状态版本号 + 两张任务留痕表 + 外部调度配置）；生产门禁新增第 14 套「同步冲突与任务调度」回归断言。' },
          { kind: 'why', title: '为什么这样操作', text: '这两项是评测报告里评分最低的两块，也是唯一需要动到架构的两块，所以放在最后一批做。\n**为什么「静默失败」必须改成可感知**：数据领域最危险的不是报错，而是**假成功**。报错时你会补做一次；假成功时你不会，等发现时原始信息早已无从追回。所以本次没有选择「写失败就抛异常」这种生硬做法——那会让所有 store 的写入链路炸开——而是降级为「提示 + 自动重试 + 手动重试」，既不让用户被弹窗打断，也绝不假装成功。重试采用退避而不是固定间隔，是为了在网络短暂抖动时快速恢复，又不会在长时间故障时把请求打满。\n**为什么冲突检测要放在服务端**：客户端自己也能记「上次读到什么」，但两个浏览器标签页之间无法互通，只有服务端看到的才是唯一事实。因此版本号由服务端维护、在更新语句里比对，不存在「先查后写」的时间窗口。同时保留「不带版本号也能写」的兼容路径，是为了让老客户端不被强制升级——保护是渐进生效的。\n**为什么 401 要清空本地缓存**：这里有一个明确的取舍——「离线可用」与「停用生效」不可兼得。账号被停用说明组织已不希望此人继续接触数据，此时继续让他看到本地缓存里的一整套客户与价格，等于权限形同虚设。因此只对 401 清空，网络异常仍走本地兜底，把「不能连网」和「不配访问」区分对待。\n**为什么外部调度是更好的方案**：系统运行在 Cloudflare 平台上，该平台确实没有定时任务能力。原来的「顺带触发」看似巧妙，实际上有三个致命点：没人访问就永远不触发；节流变量存在单个实例里、不跨实例共享；后台执行的失败被捕获后完全不可观测。外部调度把一个「看运气」的机制换成了「可预期」的机制，成本只是需要一台常开的电脑。即便如此，仍然保留了兜底触发与登录时补触发，并给每一次执行都留下记录——**可观测性本身就是可靠性的一部分**，没有记录的任务等于没有运行。' },
        ],
      },
      {
        id: 'v3000',
        title: 'V3.0.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**按独立评测报告执行第三批整改（3 项）+ 修复 1 项遗留缺陷**：\n① **备份恢复体系重建（可靠性维度最大短板）**：此前「系统备份」只导出前端状态键值 1 项，物料、采购单、销售单、客户、出入库单等业务数据**一行都不导出**，而且系统里**没有任何导入通道**——等于「有备份、无恢复」。现在改为：备份导出本组织**全部业务数据**（单据主表 + 明细行跟随父单一并导出，避免恢复后出现「有单无明细」的残缺单据）；新增恢复接口，支持**预演**（只告诉你会写入多少行、不动任何数据）与**正式恢复**（按编号覆盖写入）；组织编号强制校验，别家公司的备份包灌不进来；运行态表（会话、验证码、登录计数、邮件口令）刻意不备份，避免恢复后引入安全风险。界面位置：设置 → 数据管理 →「云端数据备份与恢复」，可下载备份、查看备份范围、选文件预演、确认后执行。\n② **关键单据加乐观锁**：此前两个人同时改同一张采购单/销售单/出入库单，后提交的会**静默覆盖**先提交的，双方都看到「保存成功」，实际丢了一次修改。现在这四类单据更新时会比对版本号，版本对不上即返回「该单据已被其他人修改，请刷新后重新编辑」，由你决定以哪份为准。不传版本号的老客户端保持原行为，不会被强制升级。\n③ **生产门禁补齐四类缺失断言**：此前门禁全绿却仍能测出缺陷，根因是断言几乎都是「正常流程 + 未登录被拦」，缺少负向越权、并发竞态、数据边界、备份有效性四类。新增第 13 套「加固回归」，专门盯这四类，防止后续改动悄悄放宽约束。\n④ **修复明细行缺字段导致 500**：采购、销售、入库、出库四类单据的明细行，只要调用方少传一个字段（或传了脏数据），写入就会直接报服务器错误。现在逐字段归一化，缺的按空值处理。' },
          { kind: 'why', title: '为什么这样操作', text: '**备份这一项为什么必须重做**：原实现的导出数据是「前端状态快照」，它记录的是界面上存了什么，而不是数据库里有什么。真到数据出事需要回滚时，这份文件一行业务数据都还原不出来。所以判断备份是否有用只有一个标准——**能不能恢复**。本次不只要改导出，还一并建了恢复通道和「先预演、再执行」的操作顺序，因为恢复是高风险动作，必须让你在写入前就看到会影响多少行。\n**乐观锁为什么不选「先查后写」**：先读版本号、比对、再更新，中间存在一个时间窗口，两个请求可能同时通过检查，锁就形同虚设。正确做法是把版本条件写进更新语句本身（`更新……条件 编号=? 且 版本=?`），用「到底有没有更新到行」来判断——这是数据库层面保证的原子性。同时刻意**不让客户端自己改写版本号**，否则拿着旧版本号还能把旧版本号写回去，锁又失效了。\n**为什么保留「不传版本号也能改」**：直接强制要求版本号会让所有老客户端立刻报错。保留兼容路径意味着保护是渐进生效的——新版本前端会自动带上版本号，老版本照常工作，等全部升级完成后再收紧也不迟。\n**门禁断言的价值**：门禁全绿不等于没有问题，全绿只能说明「之前想到的场景没被破坏」。把这次评测发现的问题固化成断言，才能让下一次改动在引入同类问题时立刻变红。' },
        ],
      },
      {
        id: 'v2990',
        title: 'V2.99.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**按独立评测报告执行第二批整改（2 项）**：\n① **写接口统一入参校验**：此前输入侧几乎不设防——金额填「一千元」照样入库、日期填「2026-13-45」照样入库、名称填 20 万字符照样入库，后续统计与对账口径会被这类脏数据悄悄破坏。现在为 35 个写接口（含通用实体内核与对外开放网关）加了一层统一校验：数值字段必须能转成数字、日期字段必须是真实存在的日期、任意文本不超过 4000 字符。校验规则**由数据库真实结构自动生成**，不是人工维护的清单，新增字段不会漏登记。不合法时返回 400 并明确指出是哪个字段、当前值是什么，方便直接改。\n② **登录失败限流**：此前登录接口没有任何失败次数限制，理论上可以被无限次尝试口令。现在按「用户名 + 来源地址」计数：连续失败 10 次锁定 5 分钟，20 次锁定 30 分钟，50 次锁定 24 小时；超过 15 分钟不再失败则重新计数，偶尔输错不会被长期累积。登录成功即清零。供应商门户登录同样接入。\n配套新增一张计数表（第 45 条数据库迁移），无需人工干预。' },
          { kind: 'why', title: '为什么这样操作', text: '入参校验这一项之所以排在第二批首位，是因为**脏数据一旦入库，后期清洗的代价远高于入口拦截**——统计报表失真往往要追溯到很久以后才发现，而那时已无法判断哪些是真实业务数据。实现上没有采用「逐个接口手写字段清单」的做法，而是从数据库结构直接生成规则表：这样字段增减时不需要有人记得同步维护清单，也不容易出现「清单与实际表结构不一致」的隐性故障。同时刻意**跳过了由服务端自己管理的字段**（编号、组织、创建人、时间戳等），避免因为客户端回传这些字段而误判。\n登录限流的计数维度选的是「用户名 + 来源地址」而不是单看用户名：如果只看用户名，任何人在任何地方连续输错都能把该账号锁死，等于给了一个「让别人无法登录」的攻击面；加上来源地址后，只有同一来源的连续失败才会累积。阶梯式锁定时长（5 分钟 / 30 分钟 / 24 小时）也是同一思路——偶尔输错只会有很短的等待，而持续爆破会越来越难。\n两项都配了实测证据：非法数值、非法日期、超长文本分别返回 400 并指明字段；连续失败到达阈值后返回「已临时锁定」并给出剩余等待时间。' },
        ],
      },
      {
        id: 'v2980',
        title: 'V2.98.0（2026-09-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**按独立评测报告执行第一批整改（6 项，全部为低成本快赢项）**：\n① **报错不再暴露数据库内部结构**：此前任何写入异常都一律返回「服务器内部错误 500」，并把数据库的原始报错原文（表名、列名、约束定义）直接回显给调用方。现在改为分类处理——属于数据问题的（编号重复、取值不合法、必填为空、关联数据不存在、类型不对）返回 400 并给出可执行的中文提示；属于系统故障的返回 500，但只给一个错误编号，原文写进服务端日志供排障。共覆盖 15 个接口。\n② **列表分页的页数不再虚高**：通用实体列表在带关键字搜索时，「总数」仍按全表统计，导致搜出 1 条却显示共 6 条、页数虚高、翻到末页是空白。现在列表查询与总数统计共用同一套过滤条件，顺带消除「统计口径漏掉权限过滤」的隐患。\n③ **邮箱验证码的尝试次数在并发下真正生效**：原实现是「读出当前次数 → 加一 → 写回」，多个请求同时提交时会互相覆盖，5 次上限形同虚设。现改为在数据库内自增，实测 4 个并发请求各记 1 次（此前只记 1 次）。\n④ **审计日志按角色收敛**：原先只要登录就能查看全组织所有人的操作记录。现在管理员看全组织，普通成员只能看自己的记录——既堵住「窥探他人操作轨迹」，又不影响本人查看自己的操作历史。\n⑤ **敏感数据接口与主流接口统一口径**：供应商的脱敏查询原先读的是一张遗留旧表，且不带归属过滤，等于开了一条绕过权限的旁路。现在与主数据接口指向同一张表、同一套过滤规则，双数据源不一致的问题一并消除。\n⑥ **新增「下线全部设备」**：原先退出登录只作废当前这一台设备的会话，同账号在手机或其它电脑上的会话依然有效。现在提供一键清空该账号全部会话的能力——超级管理员在「设置 → 安全中心」可下线自己的全部设备；管理员在「设置 → 用户管理」可对成员执行「强制下线」（含离职、设备丢失场景）。登录时还会自动清扫已过期会话，避免会话记录无限堆积。' },
          { kind: 'why', title: '为什么这样操作', text: '这 6 项来自一份以第三方独立视角完成的评测报告（稳定性 / 可靠性 / 安全性三维度）。选择先做这一批的判断标准是：**改动面小、见效直接、不引入新的架构依赖**，一天之内可以全部完成并验证。每一项都配了实测证据，而不是只看代码就下结论。\n需要特别说明两点。其一，关于报错分类：把「用户输入错误」和「系统故障」分开，看似只是换个提示语，实际影响的是告警质量——此前一次填错编号会触发「服务器故障」级别的告警，长期下去真正的系统故障会被淹没在噪声里；同时回显数据库原文等于把表结构免费提供给攻击者。现在保留错误编号，是为了在「不泄露内部结构」和「用户报障时能定位」之间取得平衡。\n其二，关于审计日志：评测建议「只限管理员可读」，本次改为「管理员看全组织、普通成员看自己」。理由是审计的价值之一是让用户自查操作历史，一刀切封禁会让这个功能对普通成员完全不可用；而真正需要防止的是「看到别人做了什么」，这一点已经通过按人过滤实现。如果后续希望更严格，可再收口为纯管理员可见。\n另外需要如实说明本批未覆盖的部分：评测中标记为高优先级的「备份无法真正恢复」「前端写失败被静默吞掉」「后台延时任务依赖有人访问」「关键单据缺少乐观锁」四项，均属于需要架构调整的范围，已排在后续批次，不在本次改动内。' },
        ],
      },
      {
        id: 'v2970',
        title: 'V2.97.0（2026-09-11）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**运行期安全审计整改（15 项发现，分三批完成）+ 补齐线上库缺失索引**：\n① 整改来源：完成一轮针对「运行中逻辑与安全」的系统审计，共 15 项发现（最高危 1 项、高危 4 项、中危 9 项、提示 1 项）。本版按「先补基础、再收敛暴露面、最后清一致性债」三批全部整改完毕。\n② 数据库：新增第 44 条迁移，为线上生产库补齐 8 个此前缺失的查询索引（采购订单 3 个、销售订单 3 个、库存 1 个、销售订单明细 1 个）——这些索引所属的第 5、6、7 条迁移当年上线时尚未写入索引语句，属于「迁移先上线、内容后追加」，因此生产库从未获得，相关查询性能偏弱。\n③ 身份闸门（最高危项）：账号状态改为**每次请求都校验**。此前只在「登录那一刻」检查状态，账号一旦被停用或驳回，其已签发的会话在有效期内依然畅通——现在待审批 / 已驳回的账号，既有会话立即失效。\n④ 供应商门户隔离（高危项）：供应商登录签发的会话与内部员工共用同一套凭证体系，导致供应商账号可直接调用内部接口。现在内部接口一律不认供应商身份；经核实供应商门户登录后不再调用任何内部接口，门户自身完全不受影响。\n⑤ 提权通道封堵（高危项）：组织级特权配置——用户与角色表、字段权限矩阵、审批流定义、报表权限、审计日志——其「写入与删除」收口到管理员。此前任一普通成员都能覆盖这些内容，等同于可以自行提权（把自己改成管理员）、解除敏感字段遮蔽（看到成本、价格、授信）、增删审批节点绕过管控、清空操作痕迹。\n⑥ 越权修补：用户管理接口禁止对自己执行审批与权限变更（防止自批自改）；通用实体接口、采购订单、销售订单、客户的单条查询与修改补齐「资源归属校验」，堵住「换一个编号就能读到别人单据」的通道；接口返回数据时的敏感字段遮蔽改为按真实角色判定（此前默认角色会绕过遮蔽）。\n⑦ 仓库域按部门隔离真正生效（中危项）：入库单、出库单、库存记录的列表查询、单条查询、修改、删除全部套用部门过滤（列表的**总数统计**同步过滤，避免从计数侧泄露）；新建单据自动记录建单人所属部门。历史遗留的「无部门」旧数据保持全员可见，存量业务不受影响。\n⑧ 开放接口收敛（中危项）：只读密钥不再能导出主数据的价格、标准价、授信额度、已用授信、税号、银行账号、对账账号、税码等敏感字段；被隐藏的字段会以清单形式随响应告知调用方，避免集成方误判为字段缺失。采购 / 销售订单金额属组织主动开放的对账数据，维持可见。\n⑨ 其余一致性修复：供应商门户登录只接受「已批准」状态的账号；注册密码强度提高为「至少 8 位且同时包含字母与数字」；邮箱验证码改为**一次性核销**（同一批验证码并发提交时只有一个能成功，防止重放）；物料数据迁移接口限定超级管理员执行且只能操作本组织；数据库备份下载接口限定管理员；邮件服务配置不再回显口令片段。' },
          { kind: 'why', title: '为什么这样操作', text: '本轮审计的核心结论是：**鉴权只做在「入口」，而权限与状态需要在「每一次请求」持续生效**。原设计把校验集中在登录那一刻（以及少部分接口的入口），于是出现了同一类缺口的多个变体——会话签发后状态变化无人再过问、权限矩阵声明了却没有被执行、单条接口只按登录与否放行而不看资源归属。因此本版优先把「会话到账号状态」「请求到资源归属」这两道判断收敛到统一入口，而不是逐个接口打补丁，避免以后新增接口又重复出现同类问题。\n几处需要说明的取舍：\n其一，特权配置只封「写与删」、不封「读」。字段权限矩阵是前端每次渲染字段遮蔽的依据，审批流是各单据页判定审批链路的依据——对这些内容的读取是全员必需的，一旦封读会导致遮蔽失效甚至页面无法正常显示，所以按最小必要范围只收口写入。\n其二，审计日志属于「被动写入」——销售价目表、促销、数电票核验等日常业务操作都会顺带写一份。写入被拒后前端会静默容错并保留本地副本，业务不中断；同时权威审计走的是独立的追加式通道（直接写入云端审计表），不受本次收口影响，因此审计完整性实际是增强而非削弱。\n其三，订单金额不做收敛。审计关注的是主数据的价格、授信、税号被整体导出；订单金额本身是该组织主动开放的往来对账数据，若一并隐藏，这个对外开放接口就失去了实际用途。\n其四，历史上无部门的旧单据保持全员可见，是为了向后兼容——否则升级后老数据会集体从列表消失，属于比安全问题更严重的可用性事故。\n最后说明一处排查更正：迁移「从零重建」失败的初始判断是「某条早期脚本重复添加了同一字段」，实际复现后确认根因是审计日志表从未出现在任何迁移脚本中（历史上只在生产库手工创建过），已在该条迁移中补上建表语句（前一个版本 V2.96.2 完成）。' },
        ],
      },
      {
        id: 'v2962',
        title: 'V2.96.2（2026-09-11）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '修复数据库迁移脚本「从零重建」失败（审计日志表缺失）：\n① 问题：把全部迁移脚本在一张全新数据库上依次执行（即「从零重建」，搭建新环境时的必经动作），执行到第 39 条迁移（为审计日志表增加变更快照字段）时会直接失败——报错「no such table: audit_logs」（表不存在），并导致其后的第 40、41、42 三条迁移整体卡住、无法继续执行。\n② 根因：审计日志表（及其 3 个索引）此前**只存在于线上生产库**（历史上以手工方式创建），迁移脚本目录中**从未包含它的建表语句**。生产库因为早已建好该表、且该条迁移已登记在案（不会重复执行），所以一直没有暴露这个问题；只有「从零重建」才会踩中。\n③ 修复：在第 39 条迁移文件中，于「增加变更快照字段」之前补上该表的建表语句与 3 个索引；结构与线上生产库**逐列、逐索引完全一致**（共 9 列；新增字段仍由原语句追加，以保持列顺序与生产库相同）。\n④ 兼容性：建表语句带「若不存在才创建」条件，两种场景都安全——全新库正常建表建索引；生产库因该迁移已登记、永不重放，**零影响**（不产生任何数据库动作）。\n⑤ 验证：已在全新本地库上完整重跑全部 43 条迁移，**全部通过**（修复前第 39 条失败、40~42 卡住；修复后第 39~42 条全部成功）；并将重建后的库与线上生产库做结构比对，表与索引完全对齐。\n⑥ 顺带发现（本版仅记录、未改动）：线上生产库缺少 8 个查询索引（采购订单 3 个、销售订单 3 个、库存 1 个、销售订单明细 1 个）——这些索引所属的迁移（第 5、6、7 条）在当年上线时尚未写入索引语句，属于「迁移先上线、内容后追加」，因此生产库从未获得它们。不影响功能，但相关查询性能偏弱，建议后续补一条迁移补齐。' },
          { kind: 'why', title: '为什么这样操作', text: '「从零重建」是搭建新环境的必经动作（新同事本机、备用环境、数据恢复演练都要用到），一旦失败就意味着系统无法在全新数据库上启动，属于必须修复的缺陷。修复方式上本可以新增一条迁移来补建表，但本次选择直接修正第 39 条文件本身，理由是：该迁移在生产库已登记，永远不会重放，修改其内容**不会对生产产生任何数据库动作**，风险最低；若改为新增迁移，则会在生产库真正执行一次，反而多引入一次变更。需要说明这个取舍的前提是「生产库已登记该迁移」——这一点已通过查询生产库的迁移登记表逐条核实（43 条迁移全部在册）。排查过程中还顺带固化了「生产库与迁移脚本结构比对」的方法：把全新库重建结果与线上库的表、索引清单做差集，既能验证修复效果，也能发现历史上因「迁移内容后追加」而漏掉的生产侧对象。' },
        ],
      },
      {
        id: 'v2961',
        title: 'V2.96.1（2026-09-11）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '安全邮箱备用通道（强哥指令 · 替换原「登录后查码」后路）：\n① 原设计的「在安全中心用登录密码查看最近生成的验证码」被废弃——能登录系统的人自然也能看到验证码，这条后路不提供任何额外隔离。\n② 改为「安全邮箱备用通道」：另设一个与登录体系无关的安全邮箱（zhang.deqiang@foxmail.com），当主邮箱与备用邮箱都收不到验证码时，可申请把新的一批验证码**延时投递**到安全邮箱。\n③ 投递规则：申请后 **8 小时**才投递第一批，并在间隔 **10 分钟**后**再投递一次**（防止首次丢信）。延时小时数、间隔分钟数、投递次数三项均存放在数据库配置中，可随时调整，无需重新部署。\n④ 验证码**不在系统任何界面、任何接口出现**：「安全中心」只显示脱敏后的安全邮箱地址、投递时间与投递进度；后端接口也绝不回传明文验证码。\n⑤ 入口有两处：登录页的「首次激活」面板（未登录也能申请，这正是后路的要点）与「设置 → 安全中心」。\n⑥ 安全约束：申请需提供正确的登录密码，且「用户名不存在」与「密码错误」返回完全相同的提示（防账号探测）；同一用途同时只允许存在一个排队任务；同一账号 24 小时内只能申请一次，防止安全邮箱被反复骚扰。\n⑦ 后端新增安全邮箱投递队列表与「懒执行」机制：Cloudflare 平台没有定时任务能力，因此由任意接口请求顺带检查到期任务并投递（60 秒节流 + 后台执行，不拖慢正常请求）；即使该机制未触发，用户回来查询状态时也会立即闭环。\n⑧ 安全中心的「查看最近验证码」入口已整体移除，对应的后端接口一并删除。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指出原兜底方案存在逻辑漏洞：能登录系统就能看到验证码，因此「用登录密码查看验证码」等于没有隔离——只要密码泄露，攻击者登录后即可自助取码并改密，双邮箱验证形同虚设。本次按强哥建议改为「延时 + 异地」的备用通道：把取码能力从「系统内」移到「系统外（独立邮箱）」，并叠加 8 小时时延，使攻击者即便拿到密码，也必须在 8 小时后仍能进入安全邮箱才可能得手，而正常用户遇到邮件故障时依然有路可走。设计上有两点取舍需要说明：其一，选择「用户主动申请」而不是「系统自动兜底投递」，因为自动投递会让安全邮箱持续收到验证码，反而削弱它作为异地通道的价值；其二，选择「延时到 8 小时」而不是即时投递，是因为即时投递等于把码又交回同一条时间线，时延本身就是这道防线的一部分。平台限制方面，Cloudflare Pages Functions 不提供定时任务，故采用「请求顺带触发 + 用户查询时立即闭环」的懒执行方案，不引入额外基础设施，也不影响正常请求的响应速度。' },
        ],
      },
      {
        id: 'v2960',
        title: 'V2.96.0（2026-09-11）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '超级管理员双邮箱验证 + 新公司注册审批 + 系统邮件通知（强哥指令）：\n① 超级管理员绑定两个邮箱（主邮箱 + 抄送邮箱）：首次登录时系统向两个邮箱**分别**发送两枚**不同**的验证码，**两枚都填对**才能继续，随后设置密码并进入系统。这一步称为「首次激活」，之后日常登录用密码即可。\n② 修改密码同样要求双邮箱验证：在「设置 → 安全中心」先输入当前密码获取验证码，两个邮箱的码都填对后，才能设置新密码。新密码要求至少 8 位且同时包含字母与数字。\n③ 兜底通道：考虑到邮件可能延迟或被投进垃圾箱，在「安全中心」提供「查看最近验证码」入口——需要再次输入当前登录密码才能查看，确保万一收不到邮件也不会被锁在系统外面。\n④ 注册策略调整：**新建公司也需要经过超级管理员批准**。用新公司码注册的人提交后处于「待审批」状态、无法登录；超级管理员在「设置 → 用户管理」中批准后，该注册者成为**该公司的管理员**，但只能管理本公司的事务，无法查看或修改其它公司的数据。\n⑤ 用户管理页新增「所属公司」列与「新公司待批」红标，超级管理员可一眼识别哪些是新公司申请；批准该申请时会同时把这家公司一并启用。\n⑥ 新增系统邮件能力与「安全中心」：「设置 → 安全中心」可配置邮件服务（邮件服务器、发信账号、授权码、发件人、通知收件邮箱），支持一键发送测试邮件；并可发送版本更新通知邮件、查看最近 30 条邮件发送记录。\n⑦ 注册界面的公司码说明弹窗同步更新，明确「新建公司需经系统超级管理员批准，批准后只能管理本公司事务」。' },
          { kind: 'why', title: '为什么这样操作', text: '本次按强哥拍板执行四项决策：邮件先走 163 邮箱直连（零成本、无需自有域名）、验证码只在「首次激活 + 修改密码」时要求（避免每天登录都多一道手续）、保留兜底通道（防止邮件通道故障把管理员锁在系统外）、版本通知由运维在发布后触发。安全设计上有两条关键取舍：其一，两个邮箱收到的是**两枚互不相同的验证码**且必须全部正确，这样即使其中一个邮箱被盗用也无法通过验证；其二，新公司注册从「注册即可用」改为「须超管批准」，是因为原规则下只要能猜到公司码就能自建公司进入系统，改为审批后系统管理员始终掌握准入闸门。同时保留了「加入已有公司由该公司管理员审批」的原有逻辑，使「外部新建公司」与「内部加入公司」两级把关各司其职。另需说明：验证码在数据库中以明文存放 5 分钟（用于兜底查看），到期自动失效，这是「可用性」与「严格性」之间为单租户自用系统所做的权衡。' },
        ],
      },
      {
        id: 'v2950',
        title: 'V2.95.0（2026-09-11）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '注册审批机制 + 超级管理员 + 用户管理正式接通真实账号（强哥指令）：\n① 注册改为「审批制」：首次用某个公司码注册的人 = 创建该公司并**自动成为该公司管理员**，注册后可直接使用；此后同事用**同一个公司码**注册，进入「待审批」状态，必须由该公司管理员批准后才能登录。\n② 登录增加状态闸门：待审批或审批未通过的账号，即使密码正确也会被拒绝登录，并给出明确中文提示。\n③ 新增「超级管理员」角色：系统最高权限，可跨公司查看与管理人员、可批准管理员，且**不能被任何人降级或删除**（含超管本人，避免误操作把系统锁死）。超级管理员只能由系统运维在数据库层设置。\n④ 新增用户管理接口与真实用户管理页：「设置 → 用户管理」不再显示演示名单，改为读取真实注册账号，支持按状态筛选（待审批 / 已启用 / 已驳回）、关键字搜索，以及批准 / 驳回 / 恢复 / 调整角色 / 调整部门。\n⑤ 权限护栏：普通管理员只能管理本公司用户；不能把任何人设为超级管理员；不能修改超管账号；只有超管才能把别人提升为管理员。\n⑥ 新增「普通用户」角色：仅有基础查看权限，供刚被批准、尚未分配具体岗位的新同事使用（修复了此前新注册账号角色无效、登录后什么都看不到的问题）。\n⑦ 注册界面完善：新增邮箱、手机号、确认密码、部门下拉选择、公司码说明弹窗、服务条款勾选、密码强度提示；提交后明确提示「已成为管理员」或「等待某公司的管理员审批」。\n⑧ 安全修复：注册接口原先把「角色」字段直接采信前端传值，任何人构造请求即可自封管理员——现已改为**全部由服务端决定**，彻底封堵。' },
          { kind: 'why', title: '为什么这样操作', text: '原系统「注册即可用」，任何人只要知道公司码就能进来，且注册后拿到的角色在网络前端并不存在，导致新同事登录后没有权限。本次按强哥拍板的方案改造：把公司码作为「组织归属 + 准入门槛」——第一个注册的人必然是自建公司的负责人，理应拥有管理权，故直接给管理员；后续加入者属于他人公司，理应由该公司管理员把关，故设待审批。这样既不会把自己挡在门外，又堵住了外部人员随意进入的口子。超级管理员设为「不可被降级、只能运维设置」，是因为一个企业内部的管理员可能互相调整权限，若超管也能被管理员降级，系统会出现无人可管的死锁；而设置超级管理员的动作放在数据库层，可确保只有实际掌握系统的人才能获得该权限。' },
        ],
      },
      {
        id: 'v2940',
        title: 'V2.94.0（2026-09-10）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '系统设置页面优化（强哥指令 5 项）：\n① 移除「物料审批」设置 Tab——它与「审批流程」功能重复（审批流程已完整覆盖物料模块），消除冗余入口；物料审批功能页面（/material/approvals）本身保留不动。\n② 新增「销售管理」设置分组，将「销售价目表」从「供应链策略」移入；并补齐数据权限：销售人员仅能看到自己负责客户的价目表与促销，管理员 / 老板可查看全部。\n③ 「单位换算」从「供应链策略」移至「企业基础」，与基本设置 / 组织账套 / 数据字典 / 编号规则并列。\n④ 设置页左侧分组改为可折叠面板（Accordion）：默认展开使用最频繁的「企业基础」，其余折叠，并对导航区加高度限制、支持组内滚动，解决分组过多导致导航过长的问题。\n⑤ 本「版本更新记录」章节随开发进展同步补登 V2.91.0 ~ V2.94.0 四个版本，保证说明书与系统实际版本一致。' },
          { kind: 'why', title: '为什么这样操作', text: '设置页是用户进入系统后的配置中枢，分组过多、入口重复会显著降低可查找性。本次按「去重 + 归类 + 可折叠」三条原则重构：物料审批与审批流程属同一件事的两个入口，删重复项避免用户困惑；销售价目表本质是销售业务数据，放在销售管理更符合心智模型，同时把「销售员仅见自己客户」的数据权限补齐，防止销售之间互相看到客户报价（商业敏感）；单位换算属企业基础主数据而非供应链策略；折叠面板让高频项默认可见、低频项收起，缩短导航长度。' },
        ],
      },
      {
        id: 'v2930',
        title: 'V2.93.0（2026-09-10）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '审计日志真实落库 Cloudflare D1（含变更前后快照 diff）：\n① 新增数据库迁移，给 audit_logs 表增加 diff 字段（TEXT，存 JSON 格式的变更前后快照）。\n② 后端审计接口升级：写入端点接受 diff 参数一并落库，查询端点读取时解析 diff JSON 返回给前端。\n③ 前端 auditStore 在记录本地审计的同时，静默同步调用后端审计接口写 D1（未登录或失败自动回退本地，不影响业务）。\n④ 至此「服务端审计」页展示的是跨设备、多人共享的真实审计记录，而非仅本机浏览器缓存。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.91.0 已让审计日志具备「变更前后快照 + 回滚」能力，但记录只存在浏览器本地存储中——换一台电脑、换一个浏览器就看不到，也无法作为跨部门审计依据。本版把审计记录真正写入 Cloudflare D1 数据库，按公司码隔离，实现多端共享；写入采用「静默同步」策略（失败不阻断业务、不影响用户操作），保证即使后端异常也不影响正常单据处理。' },
        ],
      },
      {
        id: 'v2920',
        title: 'V2.92.0（2026-09-10）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '审批流程覆盖全部单据类型：\n① 新增 7 条默认审批流——客户新增、询价单、比价单、盘点单、入库单、出库单、质检报告；加上已有的工单、发票等，共 20 个模块的审批流，基本覆盖系统内全部单据类型。\n② 新增的审批流默认处于「未启用」状态，由用户在「设置 → 审批流程」中按需开启；开启后该单据的新增 / 变更会自动触发审批。\n③ 已存在审批流的启用状态保持不变，不影响正在使用中的流程。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥提出「所有单据的变更原则上都应触发审批流程，但具体是否触发由用户自己设置」。此前只有少数核心单据（采购申请 / 销售订单等）预置了审批流，客户、询价、比价、盘点、出入库、质检等单据缺失审批环节。本版把审批流模板补齐到全单据，同时遵循「管理员可决定不审批」的原则——新流程默认关闭，需要管控的模块由用户主动开启，避免一刀切导致流程僵化。' },
        ],
      },
      {
        id: 'v2910',
        title: 'V2.91.0（2026-09-10）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '审计日志升级 + 角色操作权限细化（强哥指令）：\n① 审计日志升级——每条记录新增「变更前后快照」（记录哪些字段从什么值改成了什么值），便于溯源；日志保留上限从 500 条提升到 10000 条。\n② 新增「回滚」功能——在「设置 → 服务端审计」中点击回滚图标，可查看某个单据的完整变更历史，并一键回滚到任意历史版本（回滚动作本身也会被记录）。\n③ 角色权限细化到操作级别——新增「角色操作权限」设置页，以「角色 × 模块 × 增/删/改/查」的表格形式配置：管理员 / 老板拥有全部权限，采购员拥有采购模块写权限，库管拥有仓储模块写权限，物流 / 研发为只读。管理员与老板不可被修改。\n④ 删除单据沿用「凭审计日志回滚」方案，不做软删除标记（经强哥确认）。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥提出三个诉求：单据变更应留日志便于回滚、日志上限偏低、角色权限需要完善。本版据此：一是给审计日志加「前后快照」，让回滚有据可依；二是把上限提升 20 倍，避免早期日志被覆盖；三是把权限从原来的「模块可见性」细化到「增删改查操作级别」，让不同岗位只能做与自己职责匹配的操作（如库管不能改销售订单）。强哥确认「既然日志清晰可凭日志回滚，就不必把删除改成标记删除」——这避免了全系统删除逻辑的大改造，同时保留了可恢复能力。' },
        ],
      },
      {
        id: 'v2900',
        title: 'V2.90.0（2026-09-10）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '审计日志与角色权限升级（强哥指令）：① auditStore v2 升级——新增 diff 字段（oldValue/newValue/changedFields），记录每次变更的前后快照，便于溯源和回滚；MAX_RECORDS 从 500 提升至 10000；② ServerAuditTab 新增「回滚」操作列——点击时间线图标可查看某实体的完整变更历史，支持一键回滚到任意版本（自动记录 restore 操作）；③ dataPermissionStore v4 新增 roleModuleOps 字段——每个角色 × 模块配置增/删/改/查开关，默认矩阵：管理员/老板全权限，采购员采购写权限，库管仓储写权限，物流/研发只读等；④ 新增「角色操作权限」设置 Tab（RolePermissionTab）——表格化展示每个角色对每个模块的 CRUD 权限，绿色勾=有权限，红色叉=无权限，管理员/老板不可修改。' },
          { kind: 'why', title: '技术实现', text: 'auditStore persist 升 v2 migrate，旧记录补全 version/entityId/diff 默认值；dataPermissionStore persist 升 v4 migrate，补全 roleModuleOps 默认矩阵；RolePermissionTab 复用 ROLE_DEFINITIONS 类型，通过 setRoleModuleOp 更新配置。设置页新增「角色操作权限」入口（Security 图标），审计日志增加 Timeline 图标按钮触发回滚对话框。' },
        ],
      },
      {
        id: 'v2890',
        title: 'V2.89.0（2026-09-08）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**打印/订单模板页眉页脚编辑器升级为 Word 式富文本（强哥指令）**：\n① 引入 mui-tiptap（基于 Tiptap v3 / ProseMirror 的 MUI 原生富文本编辑器）替换 V2.88.0 的 22 个页眉页脚表单控件，编辑对话框高度缩减约 60%。\n② 选中文字即弹出气泡菜单（加粗/斜体/下划线/字体颜色/对齐），像 Word 一样所见即所得改格式；顶部工具栏同样提供上述按钮。\n③ 图片本地直传：页眉页脚框内直接选本地图片（MenuButtonImageUpload），转 base64 内嵌富文本，离线可打印、随模板持久化；不再填 URL。\n④ 电子印章合并为图片：删除独立的「印章URL」字段，印章作为透明底 PNG 图片直接用同一上传功能放入，并用 ResizableImage 扩展支持拖拽缩放与定位。\n⑤ 打印附加选项：PrintTemplate 新增 extraOptions（审批记录/制单人/制单时间/审核人/审核时间/页码）；PrintPreview 新增 renderExtraOptions 渲染审批记录表格与制单人/审核人信息，页码用打印 CSS 计数器（第 X 页 / 共 Y 页）。\n⑥ 数据结构简化：HeaderFooterConfig 从 12 字段收敛为 { html, showDate }；persist version 2→3 + migrate 把 V2.88 旧 12 字段（legacyConfigToHtml）与 V2.87 纯文本（textToHtml）自动合成为富文本 HTML，老用户升级无感。\n⑦ 验证：tsc --noEmit 0 错；vite build 通过；npm run deploy 发布生产；生产端到端门禁 PASS 241 / FAIL 0 全绿。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥反馈 V2.88.0 的页眉页脚编辑「占用面积太大、功能不实用」，要求像 Word 一样选中文字弹工具栏、图片框内直传、印章合并、打印加审批记录与时间。本版选 mui-tiptap 而非自研——它原生贴合 MUI 主题、基于成熟 ProseMirror 引擎、气泡菜单与图片上传开箱即用，避免重复造轮子（也是强哥铁律「优先成熟案例不重复造轮子」）。图片内嵌 base64 而非外链 URL：保证模板随数据持久化、离线/内网打印不丢图。印章本质是透明 PNG 图片，合并进通用图片功能减少一个独立配置维度。审批记录/制单人等信息从业务单据 record 与审批流读取，预览缺字段时显示占位、真数据接入后自动填充。persist 升 v3 migrate 保证旧模板（纯文本或 12 字段）平滑升级为富文本、不丢历史配置。' },
        ],
      },
      {
        id: 'v2880',
        title: 'V2.88.0（2026-09-09）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**打印模板与订单模板增强（物料编码 + 页眉页脚可视化编辑）**：\n① 打印模板预览数据补全：SAMPLE_RECORDS 给全部 9 个有 items 的业务实体（采购/销售/报价/合同/BOM/询价/工单/采购申请/出库）的 items 加 materialCode 字段，打印预览明细表首列正确显示「物料编码」。\n② 订单模板表格加「物料编码」列：OrderTemplateTab 表头在「物料」后新增「物料编码」列（等宽字体蓝色显示 materialCode），数据层 TemplateItem 原有字段终于在前端展示。\n③ 页眉页脚结构化配置引擎：PrintTemplate 新增 HeaderFooterConfig 接口（text/align/fontSize/fontWeight/color/imageUrl/imageHeight/imagePosition/stampUrl/stampSize/showDate 共 12 个属性）；headerText/footerText 保留向后兼容；persist version 1→2 + migrate 自动给旧模板补默认配置。\n④ PrintPreview 渲染升级：renderHeaderFooter 函数读 config 应用对齐/字体/颜色样式；支持左侧或右侧图片（logo）；支持电子印章图片绝对定位叠加；支持自动追加打印时间。\n⑤ PrintTemplateTab 编辑对话框升级：页眉/页脚从纯文本框扩展为「高级设置」面板——含对齐方式/字号/字重/文字颜色/自动时间/图片URL/图片位置/图片高度/印章URL 共 10 项控件；简单文本框保留并与高级面板双向同步。\n⑥ PrintPreviewButton fallback 模板补 headerConfig/footerConfig；tsc --noEmit 0 错；vite build 通过；npm run deploy 发布生产；生产端到端门禁 PASS 240 / FAIL 0 全绿。' },
        ],
      },
      {
        id: 'v2870',
        title: 'V2.87.0（2026-09-09）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**自定义审批流程（新建 + 发布审批 + 组织隔离可见）**：\n① approvalFlowStore 扩展：ApprovalFlowConfig 新增 status（system/draft/pending/published）、createdBy、approvedBy、orgId、visibleRoles、description 字段；新增 addCustomFlow/submitForApproval/approveFlow/rejectFlow/deleteCustomFlow 五个方法；persist 版本 1→2 加 migrate 兼容旧数据（自动补 status=system）。\n② ApprovalFlowTab UI 升级：顶部加 Tab 切换（系统预置 / 自定义）+「新建自定义审批流」按钮；新建对话框录入流程名称/模块标识/描述/可见角色；自定义流程列表分状态展示（草稿可编辑提交/待审可批准驳回/已发布只读）；复用既有节点编辑器（Accordion+ConditionGroupEditor+跳过规则+超时升级）。\n③ 发布审批机制：草稿→提交审核（pending）→管理员批准发布（published+enabled）或驳回（回 draft）；只有 system 和 published 状态的流程才被 getApprovalFlow/getEffectiveSteps 读取生效，草稿和待审状态对业务层不可见。\n④ 组织隔离可见：visibleRoles 字段控制哪些角色能看到该自定义流程（空=全部可见）；getVisibleCustomFlows 按当前角色+组织编号过滤；admin 角色始终全可见。\n⑤ 侧边栏「审批中心」新增「自定义审批流程」入口（指向设置页）；approvalFlowConfig 新增 getCustomFlows/getVisibleCustomFlows/getPendingApprovalFlows 三个读取器。\n⑥ 验证：tsc --noEmit 0 错；vite build 通过；npm run deploy 发布生产；生产端到端门禁 PASS 239 / FAIL 1（FAIL 为 AI 对话 Agnes 接口 429 限流，非本版缺陷）。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「在审批流程中增加自定义审批流程，允许用户新建审批流、选择审批节点，新建的审批流程经过批准后列入审批中心，只对流程涉及到的组织内角色可见」。此前系统仅支持编辑 13 条预置审批流程（sales_order/purchase_request 等），无法创建全新业务场景的审批流。本版在现有引擎上扩展而非另起炉台——复用全部节点编辑器/条件引擎/FlowTracker 链路，零新增 store。发布审批机制防止随意创建即生效的审批流扰乱业务（需管理员审核），组织隔离确保跨部门/跨公司不互相干扰。' },
        ],
      },
      {
        id: 'v2860',
        title: 'V2.86.0（2026-08-27）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**C 精修项：字段级权限覆盖全部模块（统一引擎 + 默认矩阵全量铺开）**：\n① 统一到 dataPermissionStore 单一生效引擎，删除孤儿 fieldPermissionStore（平台「字段级权限」页与销售订单列表原指向孤儿，配置不生效）。\n② dataPermissionStore 内置默认角色×字段矩阵（8 模块：物料/供应商/客户/采购/销售/仓储/质量/生产/财务），对不应看到金额/成本/授信的角色（库管/质检/班长/物流/供应商/采购/研发工程等）隐藏对应敏感字段；系统管理员/财务主管/会计等特权角色全部可见。\n③ 「设置 → 数据权限」配置页扩到 8 模块可勾选隐藏字段；平台「字段级权限」页改指统一引擎并列出全部已配置规则。\n④ SecureField 守卫组件包接到各模块真实敏感字段：物料评估类（标准价/移动平均价）、仓储库龄（库存金额）、质量鉴定成本、生产成本归集（标准/实际/差异/合计）、财务记账凭证（借/贷金额）。对无权限角色显示 `***`。\n⑤ persist 版本 2→3 并加 migrate 强制刷入新种子矩阵，确保本地存储升级后生效。\n⑥ 验证：tsc --noEmit 0 错；vite build 通过；npm run deploy 发布生产；生产端到端门禁零回归。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥拍板「精修项：字段权限全覆盖（统一引擎+默认矩阵全量铺开）」。此前两套字段权限机制并存——SecureField（dataPermissionStore 生效）与平台页/销售列表（fieldPermissionStore 孤儿，配了不生效），造成「配了不拦」的假安全。收口到单一引擎消除孤儿，保证配置即生效。默认矩阵遵循最小可见原则：仅对业务上不应看到该金额/成本/授信的角色隐藏，特权财务角色不受影响，避免误伤。persist 升版本加 migrate 是因为 zustand persist 本地存储不会自动合并新增种子，旧用户的敏感字段配置若为空则全部可见——migrate 强制刷入默认矩阵保证升级即生效。SecureField 仅对「当前用户角色×模块×字段」三键命中才隐藏，键严格对齐矩阵，规避「包了不生效」。' },
        ],
      },
      {
        id: 'v2850',
        title: 'V2.85.0（2026-08-27）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**C9 深化：库存不足时按优先级推荐可用替代料（领料联动 + 采购建议 + 移动出库提示）**：\n① 复用 V2.84.0 已建的 material_substitutes 数据底座，零新增后端函数、零新增迁移——替代料可用量取物料主数据 currentStock（与 MRP onHand 同源，随出入库回写）。\n② materialStore 新增纯函数 evaluateSubstitutes + getSubstituteRecommendations(materialCode, neededQty) + getBestSubstitute：按优先级返回各替代料的可用量、满足需求所需量（需求×conversionRatio）、覆盖度（可完全替代 full / 部分可替代 partial / 库存不足 none / 已过期 expired）与生效期判定。\n③ 新建可复用组件 SubstituteAdvisor（dense 单行 Chip + 完整表格两模式）：工单详情新增「缺料预警与替代料建议」（按 BOM 多级展开算各组件需求/现有库存/缺料，缺料行展开替代料表格，可完全替代优先高亮）；MRP 净需求结果表新增「替代料建议」列（净需求>0 行渲染可替代 Chip，hover 看明细）；移动出库每行物料下显示「可替代」Chip（只读提示，对齐强哥「移动作业扩到出库」指令）。\n④ 验证——tsc --noEmit 0 错；vite build 通过；npm run deploy 发布生产；生产端到端门禁零回归（无新后端，沿用既有实体路由）。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「继续」后拍板 C9 深化方向=核心主数据+UI提示的延伸（库存不足按优先级推荐可用替代料 + 领料/采购建议），不自动改单、不自动替换，保持低风险与可解释。设计上严格复用 V2.84.0 替代料组数据底座与既有实体范式，替代料可用量取 material.currentStock（仓库域出入库已回写该字段，且与 MRP 净需求 onHand 同源，避免引入 warehouse 库存记录查询的跨 store 耦合）。覆盖度四态枚举让「已过期替代料」明确区别于「库存不足」，避免误推不可用替代；conversionRatio 让部分替代（如 1 单位主料需 1.2 单位替代料）的满足量精确。三处接入面均只读、无写操作，零回归风险；MRP 替代料仅作「建议」展示，真正的运算期自动替代展开（net 需求直接改用替代料）列为后续可选深化，不在本版范围。' },
        ],
      },
      {
        id: 'v2840',
        title: 'V2.84.0（2026-08-27）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**C9 物料替代料组 + 优先级（BOM/生产灵活可配硬缺口闭合）**：\n① 新增迁移 0038_material_substitutes（material_substitutes 表，全标量字段：主物料编码 + 替代料编码 + 优先级 priority + 替代类型 substituteType(完全/部分) + 替换比例 conversionRatio + 生效起/止 + 原因 + 备注 + 审计列），索引 org/主物料编码。\n② 后端零新增函数——通用实体注册表 ENTITY_RESOURCES 加 materialSubstitute 资源（通用实体端点 /api/entities/materialSubstitute，按组织编号隔离 + RLS 共享主数据 + 写审计），前端经 entityRepo 增删改查。\n③ 前端类型 src/types/material.ts 加 MaterialSubstitute 接口（含 SubstituteType 完全/部分）；materialStore 加 substitutes 状态 + loadSubstitutes(启动期随物料加载拉取、首次空库回填 mock、离线回退内存) + addSubstitute/updateSubstitute/removeSubstitute(乐观更新 + 即发即弃写回 D1)。\n④ UI：物料详情页新增「替代料组」区块（按优先级升序展示、弹窗增删改，替代料从物料主数据下拉选），BOM 详情物料行带「可替代」徽标提示(只读、低风险)。\n⑤ 验证：tsc --noEmit 0 错；vite build 通过；npm run deploy 幂等 apply 远程 D1 迁移 0038 + 发布生产；新增生产探针验证替代料「建/查/改/删 + 字段往返 + 组织隔离」全绿。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「继续」自动进入下一个对标净缺口 C9（主计划第 361 行列为 🔴 零实现硬缺口）。强哥拍板范围=核心主数据 + UI 提示、建模=主物料→替代料优先级列表。采用与 V2.81/82 双通道根治完全一致的成熟范式（实体注册表 + 通用实体路由 + 乐观更新 fire-and-forget），零新增后端函数、与 Web 端同源、跨端多人共享。建模上「以主物料编码为锚、一组替代料按优先级排序」最贴合现有实体范式；互替(A↔B)由用户双向各录一行，简单且可扩展。替代类型区分完全替代(1:1)与部分替代(按 conversionRatio 折算)，满足缺料/成本/交期等多场景，为后续「库存/领料联动、MRP 替代展开」预留清晰数据底座（列为后续深化项，非本版范围）。' },
        ],
      },
      {
        id: 'v2830',
        title: 'V2.83.0（2026-09-08）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**C6 大模型助手接通（Agnes 2.5 Flash 默认模型）**：\n① 接通依据：强哥在 WorkBuddy 已配置的「Agnes 2.5 Flash」（国产大模型服务 Agnes AI，OpenAI 兼容端点 api.agnes-ai.cn/v1）作为 SSA ERP 的 C6 大模型助手默认模型。\n② 配置落地：把 Agnes 2.5 Flash 写入生产键值存储 AI_MODELS 的默认键 ai_model_default（baseUrl=https://api.agnes-ai.cn/v1、modelId=agnes-2.5-flash、provider=agnes），密钥存 Cloudflare 侧、不进源码库；后端 functions/api/ai/chat.ts 原生按 OpenAI 兼容格式（向该 baseUrl 的 /chat/completions 路径 + Bearer 密钥调用）调用，无需改调用逻辑即接通。\n③ 源码规范化：src/types/ai.ts 的 AIProvider 类型加 agnes、AI_PROVIDER_TEMPLATES 加 Agnes（baseUrl + 示例 agnes-2.5-flash）、RECOMMENDED_MODELS 加 Agnes 2.5 Flash；functions/api/ai/chat.ts 的 GET /api/ai/models 厂商列表加 agnes，使「设置 → AI 模型」页面可直接选 Agnes 厂商。\n④ 验证：tsc --noEmit 0 错；新增探针 probe_ai_chat.mjs 直击真实生产域——注册隔离组织拿 token → GET /api/ai/models 确认默认模型为 Agnes 2.5 Flash → POST /api/ai/chat 真实返回 85 字 ERP 解释（success=true），坐实 C6 助手链路全绿。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「按照 WorkBuddy 配置的 Agnes 2.5 Flash 接通 C6 大模型助手」。经核查，项目 C6 大模型助手前后端脚手架早已存在（AIAssistant.tsx 聊天界面 + aiStore + AIConfigPage 设置页 + functions/api/ai 后端 + AI_MODELS 键值存储），此前主计划列为「净缺口」是指未接通具体模型；Agnes 与后端 OpenAI 兼容格式天然契合，故只需把默认模型写入键值存储即可接通，零新增后端函数。密钥走 Cloudflare 键值存储（不入库源码、不进 GitHub），复用强哥既有 Agnes 密钥。注意红线：C6 助手对话内容（用户提问）会发往 Agnes 服务（国产公网服务），建议不要在对话中粘贴新光客户/供应商/价格等商业机密原文——助手只转发当前对话消息、不上传全量数据库，风险可控。' },
        ],
      },
      {
        id: 'v2820',
        title: 'V2.82.0（2026-09-07）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**库存预警 + 产成品入库迁真实 D1（根治双通道最后两块）+ 主计划写入深度对标计划 + 状态表同步 + 部署生产**：\n① 库存预警 inventoryAlerts 迁 D1：新增迁移 0036_inventory_alerts（inventory_alerts 表，全标量字段），后端实体注册表 ENTITY_RESOURCES 加 inventoryAlert 资源（通用实体端点 /api/entities/inventoryAlert，按组织编号隔离 + RLS + 审计，零新增后端函数）；warehouseStore 移除 inventoryAlerts 的本地存储块 persist，改 loadInventoryAlerts 经 entityRepo 拉取、首次空库回填 mock、离线/未登录回退内存。\n② 产成品入库 finishedGoodsInbounds 迁 D1：新增迁移 0037_finished_goods_inbounds（finished_goods_inbounds 表，全标量字段），实体注册表加 finishedGoodsInbound 资源；warehouseStore 移除 Blob persist，addFinishedGoodsInbound/updateFinishedGoodsInbound/deleteFinishedGoodsInbound 改乐观更新 + fire-and-forget 写回 D1，loadFinishedGoodsInbounds 启动期拉取、首次空库回填 mock。\n③ 至此仓库域双通道彻底根治——入库单/出库单/盘点任务/库存预警/产成品入库全部业务数组均去 Blob 直连真实 D1，跨端多人实时共享。\n④ 主计划写入深度对标计划：docs/ssa-erp-master-plan.md 新增「§十一 深度功能对标计划（V2.81 基线，对照 SAP S/4HANA 2026 / 金蝶云·星空 V9.1 / 用友 BIP）」——含 12 域综合评分跃迁（3.9→4.4）、P0/P1/P2 路线图状态（P0 全完成、P1 11/11、P2 8/10）、横向根因 G1–G8 现状、剩余净缺口（C6 大模型助手 / C9 替代料 / 数电票真实核验 / 精修）；并同步状态表——移动端 P2-20（🟡壳→✅已真落地 V2.78）、数电票核验（🟡仍桩→🟢部分 V2.80 真实通道代码就位）、发票 OCR（🟢部分→✅已模型化 V2.80）、双通道现状补 V2.82 进展注。\n⑤ 验证：tsc --noEmit 0 错；vite build 通过（dist 经 rm -rf 绕过 safe-delete 超时）；npm run deploy 幂等 apply 远程 D1 迁移 0036/0037（两表全建）+ 前端/函数发布生产；生产端到端门禁 PASS 239 / FAIL 0 全绿（零回归）；新增探针 probe_inventory_alert_fgi.mjs 直击真实生产域验证两实体「建/查/改/删 + 标量字段往返 + 组织隔离」24/24 断言全绿。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「对标计划写入主计划 + 更新主计划文档状态表同步 + 迁库存预警/产成品入库到 D1」。前两项是把 V2.81 深度对标报告（已归档 ima）的结论与路线图正式沉淀进主计划单一权威文档，并消除「移动端壳/数电票桩」等过时描述（代码早在 V2.78/V2.80 已真落地，文档滞后会误导后续判断）。第三项迁 D1 是双通道根治的收口——V2.81 仅剩 inventoryAlerts/finishedGoodsInbounds 两块 Blob 残留，均按 V2.80 双通道根治范式（entityRepo + 实体注册表 + 启动期 load + 乐观更新 fire-and-forget 写回 + 首次空库回填），零新增后端函数、与 Web 端同源。两块字段全为标量（无嵌套 JSON），比 checkTask 更简单，迁移与注册直接对齐范式。至此仓库域无 Blob 业务数据，双通道彻底根治。' },
        ],
      },
      {
        id: 'v2810',
        title: 'V2.81.0（2026-09-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**移动门户收口「扩到盘点/质检」+ 盘点任务迁真实 D1（根治双通道最后一块）+ 部署生产**：\n① 移动门户首页升级为完整仓库作业中心：原仅推「扫码入库」，本版新增「盘点 N / 质检 N」待办快捷卡 + 「待盘点任务」「待质检/待处置」两个列表区，点击卡片直达 /m/stocktake 与 /m/quality；首页成为入库/盘点/质检/处置统一待办入口（强哥指令「移动作业扩到盘点/质检」收口）。\n② 盘点任务 checkTasks 迁真实 D1（根治双通道最后一块）：新增迁移 0035_check_tasks（check_tasks 表，嵌套 items 以 JSON 文本落库、blindMode 布尔→INTEGER(0/1)）；后端实体注册表 ENTITY_RESOURCES 加 checkTask 资源（通用实体端点 /api/entities/checkTask，按组织编号隔离 + RLS + 审计，零新增后端函数）；warehouseStore 移除 checkTasks 的本地存储块 persist，改 loadCheckTasks 经 entityRepo 拉取，addCheckTask/updateCheckTask/deleteCheckTask/postCheckAdjustment 乐观更新 + fire-and-forget 写回 D1，首次空库回填 mock、离线/未登录回退内存。\n③ 验证：tsc --noEmit 0 错；vite build 通过；npm run deploy 幂等 apply 远程 D1 迁移 0035（check_tasks 表全建）+ 前端/函数发布生产；生产端到端门禁（目标 PASS≥239 / FAIL 0 不回归）。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「移动作业扩到盘点/质检」经核查——V2.79 移动盘点/质检已是完整真功能（页面 + 路由 + 底部 Tab + store 方法 + 能力清单全齐），真正残留缺口仅两处：① 首页无盘点/质检待办入口（仅推入库）；② 盘点 checkTasks 仍走本地存储块（不跨端共享）。本版按强哥拍板「首页入口 + 迁 D1（推荐）」双管齐下：首页补齐作业中心入口，盘点数据迁 D1 对齐 V2.80 双通道根治范式（与 9 模块 / 移动消息同款 entityRepo 通道），使盘点任务多人多设备实时共享、与 Web 端同源。至此仓库域双通道彻底根治（仅 inventoryAlerts / finishedGoodsInbounds 仍 Blob-only、非共享主数据，保留不动）。' },
        ],
      },
      {
        id: 'v2800',
        title: 'V2.80.0（2026-09-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**9 项整页模块迁真实 D1（云端关系数据库多人同步）+ 移动端即时消息 + 发票 OCR 大模型结构化抽取 + 数电票真实核验合规骨架 + 部署生产**：\n① 9 项模块迁 D1：把波次RFID / 重复制造 / MES集成 / 三方销售 / COPA获利分析 / 资金管理 / S&OP / BI集成 / ESG 共 9 个整页模块从本地存储块（单人不共享）迁到 Cloudflare D1 云关系数据库（按组织编号隔离、多人实时共享）。有业务联动的多实体模块（资金管理=账户+流水+余额联动、重复制造=产线+周期+报工倒冲）保留原业务方法名、仅把持久化层改走通用实体后端 entityRepo，零新增后端函数；S&OP 此前已迁不计入。共 9 个迁移脚本（0026–0034）+ 后端实体注册表加 14 个资源。\n② 移动端即时消息：移动门户新增「消息」页 + 底部导航 5 Tab→6 Tab（首页/入库/出库/盘点/质检/消息），建消息 D1 表（0034）+ store（轮询拉取，复用预警同源模式，无需长连接基建）+ 路由 + 设置页能力清单把「发货确认/即时消息」由规划中改已上线（发货确认此前已被 V2.79 扫码出库覆盖为真功能）。\n③ 发票 OCR 增强：新增 src/services/invoiceOcr.ts——图像预处理（灰度+Otsu二值化+中值降噪，浏览器原生 canvas，不依赖新库）提升中文发票 Tesseract 识别率；结构化抽取由脆弱正则硬匹配改为调用已配置的本地大模型（OpenAI 兼容接口）智能抽取发票号/税号/金额等字段，无模型配置或调用失败自动回退正则，结果字段可手动校正。\n④ 数电票真实核验合规骨架：functions/api/tax-gateway/verify.ts 的 etopliveVerifyInvoice 由 TODO 注释改写为真实第三方查验请求（签名/服务商适配/错误分类），新增多服务商路由 realVerifyInvoice；未配置服务商密钥时走模拟兜底、绝不静默误判通过；响应新增 verifiedBy（real/mock）字段，前端 InvoiceVerification 据此明确标注「真实通道 / 模拟兜底 / 本地演示」。\n⑤ 验证：tsc --noEmit 0 错；vite build 通过；npm run deploy 幂等 apply 远程 D1 迁移 0026–0034（9 表全建）+ 前端/函数发布生产；生产端到端门禁 PASS 239 / FAIL 0 / WARN 2 / INFO 6（共 247）全绿。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令推进 4 项：① 9 模块迁 D1 根治「双通道最后一块」——这些模块此前走本地存储块，多人在不同设备不同步，是双通道架构残留的共享盲区（业务实体域已全迁 D1，仅这 9 个整页+移动消息仍 Blob）；按价值分批，有业务联动的模块保留原方法名只换持久化层，避免重写引入回归。② 移动端即时消息采用轮询而非长连接——仓库/车间场景刷新间隔 15–30 秒足够、无需复杂基建、稳。③ 发票 OCR 结构化抽取复用强哥已配置的本地大模型接口（零额外密钥、不暴露密钥），正则作为兜底保证离线可用。④ 数电票真实核验：税务局官平台对企业不开放公开接口，必须经持牌第三方（etoplive/航信/百望/票联云），需企业税号+服务商账号+密钥；当前未配置密钥，故真实通道代码写好但默认走模拟兜底，配置凭证即启用，不引入任何按次费用。' },
        ],
      },
      {
        id: 'v2790',
        title: 'V2.79.0（2026-09-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**移动门户作业扩展（出库/盘点/质检真功能）+ 历史 flake 根治 + 新增 v78 E2E 4/4 全绿 + 部署生产**：\n① 移动作业扩到出库/盘点/质检（强哥指令「移动作业扩到出库/盘点/质检」）：新增 MobileOutbound / MobileStocktake / MobileQuality 三页，与已落地的 MobileInbound 同构——选单→扫物料标签（BarcodeScanner 三通道）/搜索框输入物料编码+回车等效→命中明细行→录数→提交过账；提交前明示过账后果与未登录仅本机风险。\n② 真链路复用既有 store：出库 updateOutboundOrder(order.id,{status:completed}) 真实扣库存+批次先进先出核销+回写销售订单+结转销售成本凭证；盘点 postCheckAdjustment(task.id,items) 按「实盘−账面」差异调库存、任务标记完成；质检 updateInspectionTask 写合格/不合格数，不合格数>0 自动 addUnqualifiedItem+disposeUnqualified 联动库存扣减+自动凭证（报废/返工/退货供应商/让步接收四类）。\n③ 移动门户布局 MobilePortalLayout 底部导航由 2 Tab 扩为 5 Tab（首页/扫码入库/出库/盘点/质检），App.tsx 注册 /m/outbound、/m/stocktake、/m/quality 三路由。\n④ 历史 flake 根治：定位两类根因——a) 网络层 500 环境噪声（未登录态 fire-and-forget 双写 D1 / MSW 未覆盖端点致浏览器报「Failed to load resource: 500」）被 console.error 门槛误计为前端逻辑错误 → v29-forms/flow 的 console 守卫加 `Failed to load resource` 豁免（真实未捕获异常仍由 pageerror 捕获）；b) 过时断言（演示专属标记 SO-DEMO- 等仅存内存 store、刷新即丢） → flow 演示标记校验改「刷新前遍历 window.__ssaStores 校验 11 个标记真实落地」，不依赖页面渲染与刷新持久化。\n⑤ 验证：新增 E2E v78（底部 5 Tab 可见 + 出库过账 poll status==completed + 盘点调整 poll countQuantity==12 + 质检合格 status==passed 且不合格自动 NCR 且 dispositionStatus==completed）4/4 全绿；stores/v29-forms/flow 三文件根治复验 18/18 全绿；tsc --noEmit 0 错；dist 构建并部署生产。\n⑥ 关键修复：移动端三页 TextField 的 data-testid 原加在组件根 <div> 致 .fill 找不到可填元素 → 改落到内部 <input>（inputProps）；E2E 注入测试数据改为「先导航到带 order/task 的详情 URL、再 page.evaluate 注入」避免整页重载冲掉未持久化内存态 store（出库用例原因此 180s 超时）。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令分两块：A) 根治历史 flake——V2.78.0 全量前端端到端曾 204/296（92 失败），根因非功能回归而是两类测试侧脆弱点（网络 500 误报 + 演示标记刷新丢失），本版以「网络噪声豁免 + 内存 store 真实验证」从根消除，并验证代表文件转绿；B) 移动作业扩到出库/盘点/质检——移动门户此前仅扫码入库，强哥要求补齐三作业做成真功能。复用入库已验证的「选单→扫→录→过账」范式与既有仓库/质检 store 真实过账链路，零新建后端、零双通道、与 Web 端同源，最快交付且不过度设计。质检不合格自动 NCR 与桌面 B4 处置同构（disposeUnqualified 末尾将 dispositionStatus 置 completed、按评估类分流凭证），保证移动端判不合格即触发真实质量闭环。' },
        ],
      },
      {
        id: 'v2780',
        title: 'V2.78.0（2026-09-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**移动端 PWA 真门户落地（MobileTab 从壳变真功能）+ 新增 v77 E2E 全绿 + 部署生产**：\n① 形态：同套代码新增 /m 路由，做成可添加到主屏全屏运行的 PWA 移动门户（manifest.webmanifest + ssa-sw.js + 192/512/maskable 图标），本轮作业范围=扫码入库。\n② 扫码技术双通道：BarcodeScanner 优先浏览器原生 BarcodeDetector，降级 @zxing/library 软件解码（支持 Code 39/128/QR，对齐项目条码打印页 BarcodePrint.tsx 的 Code 39 规则），再降级手动输入（兼容老旧 PDA 扫码枪键盘输入）。\n③ 核心作业 MobileInbound：选待入库单→扫码/搜物料编码（Code 39 内容=物料编码大写）命中明细行→录实收数→updateInboundOrder(order.id,{items,status:completed,inventoryPosted:true,operator}) 真实写回 D1（经 b2Api 链路），完成即过账。\n④ MobileHome 渲染真实待入库任务（来自 warehouseStore.inboundOrders，status pending/partial）；MobilePortalLayout 移动优先布局（AppBar+底部 Tab+安全区适配）。\n⑤ Settings/MobileTab 重写：FakeQR 伪二维码→真 QrCodeImage（qrcode 库生成，编码 origin+/m）+ 打开移动门户按钮由 disabled 改真实跳转 /m。\n⑥ 验证：新增 E2E v77（C1 PWA 基建 manifest/SW/图标契约正确、C2 /m 渲染真实任务列表 in-001、C3 扫码入库全链路条码命中→录数→提交→过账、C4 未匹配条码明确报错不静默、C5 MobileTab 真二维码+按钮可点）5/5 全绿；tsc --noEmit 0 错；dist 构建并部署生产。\n⑦ 关键修复：/m 路由原被 RequireAuth 包裹致未登录重定向登录页（移动门户应独立可访问）→ 移出 RequireAuth 与 vendor-portal 同级；E2E 因 lazy chunk 在低内存机器加载超 60s，加 90s 显式 waitForSelector 稳定等待。' },
          { kind: 'why', title: '为什么这样操作', text: '强哥指令「先A补版本号重部署 然后B推进 MobileTab 真移动端」的 B 部分（A=V2.77.0 部署 SOP 固化已收口）。MobileTab 此前是纯壳（FakeQR 伪二维码、disabled 按钮、硬编码 PDA 假数据）。判定采用 PWA 而非 React Native/Capacitor 出 APK：同套 React 代码加 /m 路由零额外构建链、可添加到主屏全屏、扫码用 Web API（BarcodeDetector/@zxing/library），最快交付真可用移动作业且无需强哥装构建环境；APK 化列为后续可选深化。条码方案关键对齐：项目条码打印页 BarcodePrint.tsx 用 Code 39、内容=物料编码大写，故仅解 QR 的 jsQR 不可用，换 @zxing/library 支持 Code 39/128/QR；扫码匹配按物料编码（lineCode）→ 批次号（batchNo）命中明细行，与打印契约一致。写回链路复用 V2.70 已落地的 b2Api 双写（fire-and-forget 落 D1 + 未登录回退 Blob），移动端提交与 Web 端同源、无双通道。/m 移出 RequireAuth 是 PWA 独立登录态的合理设计。' },
        ],
      },
      {
        id: 'v2770',
        title: 'V2.77.0（2026-09-04）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**部署流程 SOP 固化（防 V2.76.0 生产漏迁移事故复发）+ 生产 d1_migrations 元数据对齐 + 重新部署生产**：\n① 根因深挖：`wrangler d1 migrations apply` 读的是内部追踪表 **`d1_migrations`**（`name` 列存带 `.sql` 后缀的迁移文件名），**不是** 应用自建的 `schema_migrations`；V2.75.x / V2.76.0 的迁移 0019–0025 都是用 `d1 execute --remote --command` 内联建表补列的、从未走 `wrangler apply`，故 `d1_migrations` 只登记到 0018，而 `schema_migrations` 虽手动补齐（wrangler 并不读它）。结果：裸跑 `apply` 会误判 0019 未应用、重跑 `ALTER TABLE serial_movements ADD COLUMN created_at` 报 duplicate column 直接失败——SOP 若直接固化 apply 会第一步就挂。\n② 修复一（生产元数据对齐，低风险、业务表零改动）：把 0019–0025 七个迁移文件名补登进生产 `d1_migrations`，与已落地的真实表结构对齐；此后 `wrangler d1 migrations apply --remote` 返回 No migrations to apply!（幂等跳过）。\n③ 修复二（工具固化）：新增 `scripts/deploy.mjs`——自动注入 `.env.local` 的 CLOUDFLARE_API_TOKEN（wrangler 不会自动读取该文件）→ 先 `d1 migrations apply --remote`（幂等）→ 再 `pages deploy dist`，把「先 apply 迁移、后部署」变成强制不可跳过的步骤；wrangler 路径解析顺序为项目本地 node_modules → 环境变量 WRANGLER_BIN → 隔离 workspace 回退路径。\n④ 配套：`package.json` 新增 `"deploy": "node scripts/deploy.mjs"`；`DEPLOY.md` 补「方式 C：一键部署脚本（含 D1 迁移）」并标注防漏迁移警示。\n⑤ 验证：`npm run deploy` 端到端跑通，apply 幂等跳过、pages deploy 成功；版本四处同步（version.ts / package.json / manual.tsx / MEMORY.md / 主计划 §八）；tsc --noEmit 0 错；dist 重建并部署生产。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.76.0 已在生产踩过「迁移漏 apply」事故（序列号创建全线 500），主计划 §八 运维教训明确要求把 apply 纳入部署 SOP。但直接把裸 apply 写进脚本会撞上更深的坑——wrangler 的迁移追踪表是 `d1_migrations` 而非应用自建的 `schema_migrations`，两者长期不一致会让任何「先 apply」的 SOP 在第一步就失败。故本版先把生产元数据对齐（只补七行登记记录，不改任何业务表与数据），再固化工具，顺序不可颠倒。价值在于把这类「靠人记得跑 apply」的隐性知识变成机制：此后含迁移的升版一律 `npm run deploy`，漏迁移在结构上不可能再发生。本版未改动任何应用运行时业务代码，仍按铁律升版本号并重新构建部署，保证线上版本标识与实际交付一致、可追溯。' },
        ],
      },
      {
        id: 'v2755',
        title: 'V2.75.5（2026-09-03）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**W2 收尾战役——仓库高级三切片（stockTransfers/inventoryAdjustments/qualityHolds）去 Blob 直连真实 D1，双通道 100% 根治 + 修复 2 类后端缺陷 + 全链路 E2E 全绿 + 部署生产**：\n① 新建 3 张 D1 表（迁移 0023_stock_transfers / 0024_inventory_adjustments / 0025_quality_holds，均含 org_id 隔离 + 审计列 + items 子表 ON DELETE CASCADE），本地 apply-all-local 重放 + 生产 d1 execute --remote 应用，num_tables 增至 38。\n② 后端 6 个 CRUD 端点（stock-transfers / inventory-adjustments / quality-holds 各含 index.ts 列表+POST + [id].ts GET/PUT/DELETE），按 org_id 隔离、会话鉴权、显式列名（沿用 W2 后同构，规避 f.toLowerCase() 漏列坑），items 子表独立建表。\n③ 前端新建 src/services/warehouseAdv.ts（warehouseAdv 服务层，snake↔camel 映射、与 serial.ts 同构）；重写 warehouseAdvancedStore：三切片从 partialize 移出（partialize 改为 () => ({})，与序列号同 D1 托管）、loadWarehouseAdvanced 从 D1 拉取（含遗留 Blob 一次性回填防数据丢失）、add/update/delete 乐观更新内存 + fire-and-forget 写回 D1、离线回退内存；confirmTransfer/postAdjustment 副作用后追加 D1 状态写回；App.tsx 启动接 loadWarehouseAdvanced。\n④ 修复 2 类后端缺陷（tsc/vite 门禁不可见，属运行期 SQL 层）：A) stock-transfers/inventory-adjustments POST 绑参未守卫 transferNo/adjustmentNo（缺省 undefined 入 D1 绑参 → D1_TYPE_ERROR 500）→ 后端加服务端默认号兜底；B) 该两域 PUT 绑参直接读 body.transferNo/adjustmentNo（部分更新时 undefined → 500）→ 改用既有单号兜底；另修正该两域 GET/:id 与 GET 列表的 items 以 snake_case 返回（对齐前端 rowToXxx 期望，与 W2 inbound 既定惯例一致），并列表回填 items（恢复迁移前 Blob 全量明细，修复 confirmTransfer 双边过账缺明细的回归）。\n⑤ 验证：本地 W3 三切片 E2E（scripts/w3-adv-e2e.mjs，wrangler pages dev --local + 本地 D1）16/16 全绿（三域 POST 含 items / GET :id 取回 items / PUT 更新状态 / GET 列表含 items / DELETE 全流程）；生产 W3 E2E（真实 D1，2d26fbaf.ssa-erp.pages.dev）16/16 全绿；tsc --noEmit 0 错；dist 构建并部署生产。\n⑥ 至此**双通道 100% 根治**：所有业务实体域（物料/客户/供应商/PO/SO/工单/凭证/序列号/委外/入出库/跨组织转储/库存调整/质检扣留）均已去 Blob 直连真实 D1、跨端多人实时共享、无双源不一致；仅纯 UI 偏好类 store（列表偏好/标签布局/i18n/工作台等，本就非双通道）仍 Blob。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.75.4 收口仓库入/出库后，仅剩高级三切片仍 Blob——这是「业务数据仍走 Blob」的最后一块，强哥要求继续迁 D1 才真正闭环。沿用 W1/W2 已验证的「移出 partialize + 乐观更新 + 写回 D1 + 首次回填」安全模式，零回归扩到这三域。本轮抓出的 POST/PUT 绑参 undefined 缺陷与 W1「inbound PUT 漏列」同属一类：**迁 D1 的函数凡绑定 body.* 字段都必须 ?? 兜底或取既有值，NULL/NOT NULL 约束下 undefined 直接 500**；列表 items 以 camelCase 返回则使前端 rowToXxx 取到 undefined（静默丢明细），故统一回归 snake_case 且与 W2 inbound 惯例对齐。列表回填 items 是关键修复——迁移前 Blob 存全量 items，迁移后若列表返回空 items，confirmTransfer 生成的双边出入库单会缺物料行，属功能回归；回填后行为等同迁移前。本地 16/16 + 生产 16/16 双绿，实证三域已真直连 D1。' },
        ],
      },
      {
        id: 'v2750',
        title: 'V2.75.0（2026-09-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**启动根治双通道（W0 基建 + S&OP 参考实现）**：问题根因不在缺后端（12 业务域 Functions 早建好），而在 79 个前端 store 仍 persist 到 app_state Blob、没接后端。本版用「通用实体后端 + 前端工厂」把逐域手写 store 变为配置驱动，可批量根治。\n① 后端新增通用会话鉴权实体 CRUD：functions/api/entities/[resource].ts（GET 列表分页/keyword/RLS + POST 创建）、[resource]/[id].ts（GET/PUT/DELETE），复用 getUserFromRequest + rlsFragment + audit_logs；资源注册表 ENTITY_RESOURCES（table + 业务列 camel↔snake + rlsScope）集中登记，每域零新增 Functions。\n② 前端新增通用工厂：src/services/entityRepo.ts（list/get/create/update/remove 经 axios 注入 Bearer）+ src/stores/createEntityStore.ts（load/add/update/remove，乐观更新 + 失败回滚 + 离线 Mock 兜底 + 首次空库回填，与 materialStore 同策略）；每业务域只需 createEntityStore({ resource, seed }) 接管，移除 persist(Blob)。\n③ 参考实现 S&OP（P2-10）迁 D1：sopStore 改用工厂（移除 Blob persist），迁移 0018_sop.sql 建 sop_plans 表（含审计列 + org 索引），页面接 load() 从 D1 拉取。这是 79 个 Blob store 中首个按新范式迁 D1 的业务域，验证全链路。\n④ 纯本地类 store（UI 偏好/会话/主题等）明确不迁，仅业务实体类计入根治（非双通道问题）。' },
          { kind: 'why', title: '为什么这样操作', text: '此前「双通道」指 80+ store 走 app_state Blob、仅物料/客户/供应商三表有真实 D1 后端；其余业务域后端 Functions 虽已建好，前端却没接。若逐域手写专用 Functions + 服务层，60+ 域工作量巨大且易重复。本版抽出的「通用实体后端 + 工厂」让每域只配一张表 + 注册资源即可接管，materialStore 手写模式被泛化为基础设施。S&OP 选作参考实现因其类型简单、无既有专用后端、零回归风险，验证「新表 + 通用端点 + 工厂 + e2e + 部署」端到端后，后续 W1 直接接已建后端的 12 域（customers/vendors/PO/SO/出入库/工单/凭证/库存/序列号/委外）、W2 软域（MES/S&OP/BI/ESG/COPA/资金…）新建表即可批量铺开。过渡期每域保留离线 Mock 兜底 + 首次空库回填，不一次性全改、不丢存量数据。' },
        ],
      },
      {
        id: 'v2751',
        title: 'V2.75.1（2026-08-27）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '**根治双通道 W1-B1 首批（序列号 + 委外）落地**：79 个仍 persist app_state Blob 的业务域中，选最低风险两域（序列号/HU + 委外订单）按「专用服务范式」直连真实 D1，移除 Blob 持久化，D1 成为唯一真源。\n① 专用服务层：新建 src/services/serial.ts（直连 serial_masters）/ subcontract.ts（直连 subcontract_orders），走 api 客户端、snake↔camel 映射、与 materials 已落地范式一致；store 内部去 Blob、保留原方法名/状态字段、跨 store 调用零改动；启动期 loadSerialMasters/loadOrders 从 D1 拉取，首次空库回填种子（一次性，不污染既有数据）。\n② 两 store 重写：warehouseAdvancedStore 的 serialMasters 切片从 partialize 移除（仍 Blob 的 stockTransfers/inventoryAdjustments/qualityHolds 三切片保留）；subcontractStore 整体移除 persist 包装（orders 不再落 Blob）；增删改改 async 乐观更新内存 + 写回 D1（写失败 catch 保留内存态、离线容忍），本地 id 在 create 后对齐 D1 id（sm-/sco-），保证后续 PUT/DELETE 精准。\n③ 附带修复生产级鉴权 bug：src/services/api.ts 请求拦截器原读 localStorage(\'token\')——该 key 从未被写入（登录只经 setSyncToken 写 ssa-erp-auth-token），导致所有走 api 的已迁域(materials/customers/vendors) 与 W0 S&OP 在生产环境请求不带 Bearer、后端 getUserFromRequest 一律 401、D1 实际收不到写；改为优先读 ssa-erp-auth-token（保留 \'token\' 防御性 fallback），401 时一并清理两 key 避免 stale token 反复 401。此修复是「根治双通道」在生产真正成立的前置必要条件。\n④ 序列号流转轨迹补持久化：serial-numbers Function 的 POST（创建 + 初始入库 movement）/ PUT（状态变更 append movement）现写 serial_movements（原只写主档、轨迹历史丢失）；列表 GET 关联 movements，SerialHU 页「流转轨迹」列直连真实数据。' },
          { kind: 'why', title: '为什么这样操作', text: '真正仍 Blob 的业务域仅 9 个（PO/SO/出入库/工单/凭证/库存/序列号/委外 + 仓库高级三切片），serial/subcontract 属最低风险两域：专用 Function 全 CRUD 早已建好、原已双写 D1（b2Api）、无 addInboundOrder/addOutboundOrder/createVoucher 这类高危跨 store 签名，先试水验证范式，再扩其余 7 域。专用服务范式比 W0 通用实体工厂更贴合这 9 个自定义形状 store——保留原方法名/状态字段、跨 store 零改动，迁移摩擦最小。api.ts token bug 是整件「根治双通道」的暗礁：前端 store 写得再对，只要 Bearer 缺失，D1 收不到任何写，双通道在生产仍是空壳；本次一并修掉，已迁 3 域 + W0 S&OP + 新 2 域生产才真正闭环。serial_movements 表虽早在 V2.70 建好，但此前 Function 与前端都只同步主档、轨迹从未落库，本次补上，一物一码全生命周期轨迹在生产可用。' },
        ],
      },
      {
        id: 'v2747',
        title: 'V2.74.7（2026-08-27）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '整页缺失补齐 B 轮（P2-12/13/14 三项落地）：延续 A 轮「前端页 + mock 持久化」范式（列表 + 创建编辑弹窗 + 详情齐全，客户端 CRUD 经 backendStorage 落 app_state Blob，登录态同步 D1、未登录回退 localStorage，不新建 D1 表、不改后端 Functions）。\n① 三方销售（销售管理 → 三方销售，/sales/triparty）：类型 tripartySales.ts（TripartySale 代销结算单 + 结算状态枚举 pending/partial/settled 与中文标签）；mock 3 条种子（经销商代销按实销结算）；store tripartySalesStore（backendStorage 落 app_state）；页面统计卡（代销总额/待结算/已结算）+ 新建代销结算单（用 useNumberingStore.nextNo(\'TPS\') 生成单号）+ DataTable 查看/编辑/删除。\n② COPA 获利分析（财务与报表 → COPA获利分析，/finance/copa）：类型 copa.ts（CopaRecord 分析行 + 四维度 product/customer/region/period）；mock 12 条（产品4+客户4+区域4，期间 2026-08）；store copaStore；页面四维度 Tabs + 派生毛利/毛利率 + 统计卡 + 毛利条形图 + 新增分析行弹窗。\n③ 资金管理（财务与报表 → 资金管理，/finance/cash）：类型 cashMgmt.ts（CashAccount 资金账户 + CashFlow 收付款流水 + 方向枚举 in/out）；mock 3 账户 + 4 流水；store cashMgmtStore 含 addFlow 余额联动（in 加 / out 减，四舍五入 2 位）；页面账户总余额 + 账户/流水双 Tabs + 新增账户（nextNo(\'ACC\')）/新增流水（方向联动余额）。\n④ 四处注册齐备：types/index.ts re-export；stores/index.ts 导出；App.tsx lazy + Route（sales/triparty、finance/copa、finance/cash）；Sidebar 销售组/财务组菜单；searchIndex 检索条目；manual 登记本条版本记录。' },
          { kind: 'why', title: '为什么这样操作', text: '这三项属「整页缺失」9 项计划中的 B 轮（A 轮=波次RFID/重复制造/MES 集成已交付；C 轮=S&OP/BI集成/ESG 待后续）。按用户确认的落地深度，沿用系统 80+ store 主流范式：零后端改动、零既有功能回归风险，登录后数据随账号走、换机可见。三方销售覆盖「经销商代销、按实销结算」场景；COPA 提供产品/客户/区域/期间四维获利透视（毛利=收入−成本、毛利率=毛利/收入）；资金管理提供账户余额与收付款流水联动，是后续对接真实银行流水/资金计划的基石。三轮排期上 B 轮偏交易与财务，与 A 轮（仓储/生产执行）解耦、可独立验收。' },
        ],
      },
      {
        id: 'v2746',
        title: 'V2.74.6（2026-09-02）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '整页缺失补齐 A 轮（P2-07/08/09 三项落地）：9 项整页缺失已排出三轮实施计划（A 轮=波次RFID/重复制造/MES集成，本版交付；B 轮=三方销售/COPA/资金管理；C 轮=S&OP/BI集成/ESG）。\n① 波次RFID（仓储物流 → 波次RFID，/warehouse/wave-rfid）：类型 src/types/waveRfid.ts（WaveRfid 波次 + WaveLine 波次行 + RfidEvent 事件 + 状态/策略/操作三组枚举与中文标签）；mock 种子 3 波次（拣货中/已下达/已完成）+ 3 条 RFID 事件（含 1 条异常 fail）；store waveRfidStore（backendStorage 落 app_state）含波次 CRUD + RFID 事件登记/删除；页面双 Tab（波次 / RFID 事件），波次行可展开编辑波次行明细、可「下达并拣货」推进状态，支持「模拟 RFID 扫描」登记出入库/盘点/移位事件。\n② 重复制造（生产管理 → 重复制造，/production/repetitive）：类型 repetitiveMfg.ts（ProductionLine 生产线 + BackflushItem 倒冲物料 + RepetitiveMfgPeriod 生产周期）；mock 3 产线（2 运行 1 保养）+ 2 周期（各含 3/2 条倒冲物料）；store repetitiveMfgStore 核心 reportProduction(periodId, goodQty, scrapQty) 按「合格数 × 单件标准耗用」累加倒冲消耗量（保留 3 位小数），已关闭周期拒绝报工；页面双 Tab（生产线 / 生产周期），周期表批量操作「产量报工」触发倒冲、「倒冲明细」查看各物料标准耗用与累计消耗。\n③ MES 集成（生产管理 → MES集成，/production/mes）：类型 mes.ts（MesConnection 连接配置 + MesDeviceStatus 设备状态 + WipTrack 在制品 + MesOperationReport 工序报工）；mock 2 连接（connected/error）+ 3 设备（运行/停机/保养）+ 2 WIP + 2 报工；store mesStore 四组 CRUD + syncConnection（置 connected 并记录 lastSyncAt）；页面四 Tab（连接配置/设备状态/在制品/工序报工），连接表支持「同步」批量操作。\n④ 四处注册齐备：App.tsx lazy + Route（warehouse/wave-rfid、production/repetitive、production/mes）、Sidebar 仓储组/生产组菜单、searchIndex 检索条目、stores/index.ts 导出；manual 登记本条版本记录。' },
          { kind: 'why', title: '为什么这样操作', text: '这三项此前属「整页缺失」——业务侧确有场景（批量拣货与 RFID 收货、流水线的重复制造倒冲、与车间 MES 系统的对接），但系统内无任何页面承载，只能靠人工台账。按用户确认的落地深度「前端页 + mock 持久化（与 productionStore/warehouseStore 完全一致）」实施：列表 + 创建编辑弹窗 + 详情齐全，客户端 CRUD 经 backendStorage 落 app_state Blob（登录态同步 D1、未登录回退 localStorage），不新建 D1 表、不改后端 Functions——即沿用系统 80+ store 的主流范式，零后端改动、零既有功能回归风险，同时保证登录后数据随账号走、换机可见。三轮排期上先做 A 轮这三项，是因为它们同属「仓储/生产执行层」、彼此无依赖且可独立验收；B 轮三项偏交易与财务、C 轮三项偏计划与分析，留待后续版本推进。' },
        ],
      },
      {
        id: 'v2745',
        title: 'V2.74.5（2026-09-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '主数据 store 迁真实 D1 API，根治双通道（物料 + 客户）：仅剩 物料/客户/供应商 三张主数据表有真实 D1 后端 + CRUD 端点，本次收口物料 + 客户，供应商已于 V2.74.3 收口，故主数据三张全落真实库、前端不再写 app_state Blob。\n① 后端 functions/api/materials：补 index.ts POST 创建（校验 code/name 必填、code 唯一查重 409、uid(\'mat\') 生成、INSERT 全列含 owner_id/dept_id/审计列、audit helper 写 audit_logs）；[id].ts DELETE 修复 D1 changes 坑（res.meta?.changes ?? res.changes，否则非存在 id 也返回 200 缺 404），与 V2.74.4 开放网关修复同因。\n② 后端 functions/api/customers：同构补 POST 创建 + DELETE meta.changes 修复。\n③ 前端新建 src/services/customer.ts（customerApi，与 vendorApi 同构、直连 /customers 会话鉴权）。\n④ 前端 materialStore/customerStore 重写：移除 persist+backendStorage(app_state Blob)；loadMaterials/loadCustomers 经 materialApi/customerApi 读 D1；add/update/delete 改 async 乐观更新内存 + 写回 D1（写失败 catch 保留内存态、离线容忍）；首次空库从 legacy app_state（或 mock）一次性回填 D1；App 启动 useEffect 同时拉三张主数据（vendor/material/customer）。\n⑤ MSW handlers：materials 5 个处理器去 {success:true,data} 包裹、与真实端点同构（返回 {data,total,page,pageSize,totalPages}）；补 customers 5 个 CRUD 处理器（原缺失）。\n⑥ 类型校验 tsc 0 错；vite build 通过（safe-delete 清空 dist 超时，按既定 workaround 移走旧 dist 后构建到全新 dist）。' },
          { kind: 'why', title: '为什么这样操作', text: '「双通道并行」指 80+ 前端 store 仍 persist 到 app_state Blob，而仅 物料/客户/供应商 三表有真实 D1 后端 + CRUD 端点；其余主数据（仓库/设备/单位换算/数据字典等）后端暂无对应表、迁不了。本次精确范围=物料+客户，与供应商（V2.74.3）一起把主数据三张表全部收口到真实 D1，前端与开放网关真正同源（同 org_id 隔离、同 RLS）。以已验证的 vendorStore 为模板保证「乐观更新 + 离线回退 mock + 首次 legacy 回填」模式一致、降低风险；DELETE 的 D1 meta.changes 坑在 materials/customers 的 [id].ts 同样存在，主动修掉而非等 E2E 暴露。' },
        ],
      },
      {
        id: 'v2742',
        title: 'V2.74.2（2026-09-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '按 V2.74.1 遗留待决，落地供应商主数据网关端点（方案 A：新建独立关系表，与门户登录表解耦）：\n① 迁移 0016_vendor_master.sql：新建 vendor_master 关系表，含供应商主数据列（vendor_code/company_name/short_name/type/contact_*/credit_level/credit_limit/used_credit/tax_id/bank_account/sales_org/reconciliation_account/tax_code/rating/blacklist_*/qualification_expiry/remarks）+ org_id 隔离 + owner_id/dept_id（RLS 预留可空）+ 审计列 NOT NULL；不含 password_hash/salt，从根上杜绝网关误写门户凭据与 SELECT * 泄露。\n② 网关 vendors 端点改指 vendor_master：集合级 [resource].ts 与子路由 [resource]/[id].ts 的 RESOURCES.vendors 均改为 table=vendor_master，cols 对齐主数据字段（保留 remarks 列）。\n③ 顺带修复 V2.74.1 拆分路由时漏改的子路由文件：此前 [resource]/[id].ts 的 vendors 仍指向旧 vendors 门户表，导致单条 GET/PUT/DELETE 误查门户表、单条 GET 返回 404；现已两处统一指向 vendor_master。\n④ 生产实测（真实 sk_ Key 打真实 D1）：vendors POST 201 / GET 200(返回 30 字段，password_hash/salt/role 均不存在=零凭据泄露) / POST(含 remarks) 201 / PUT 200 且 GET/:id 200(credit_limit 更新生效) / readKey 写 403 / DELETE 200，已部署 484836d3 且 canonical 域复验全绿。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.74.1 实测发现网关 vendors 端点 500（指向门户账号表，INSERT 缺 password_hash/salt NOT NULL），且 SELECT * 会泄露登录凭据。供应商主数据本身是供应链核心，迟早要关系化；按推荐方案新建 vendor_master 表，与另外 4 类网关资源(materials/customers/PO/SO)架构完全一致，网关直接读写该表，与 materials 网关同构（前端 vendorStore 仍走 app_state Blob，两套来源并存，后续可独立战役统一）。此举既止血了 500+泄露，又给供应商主数据一个干净的关系表归宿，不影响任何既有表与前端逻辑。' },
        ],
      },
      {
        id: 'v2741',
        title: 'V2.74.1（2026-09-01）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '开放 API 网关生产实测暴露并根因修复 3 类真实缺陷（基于 V2.74.0 已开放的网关/FX/RLS）：\n① 写路径 500 修复：网关 POST/PUT 此前漏填关系表强制 NOT NULL 审计列（created_at/updated_at/created_by/updated_by），写操作触发约束失败返回 500；现改用 PRAGMA table_info 探测各表实际审计列并补齐，writeKey 创建/更新物料、客户等记录正常返回 201/200。\n② scope 语义修复：write 权限现天然包含 read（持有 write 的 Key 可读），此前 write Key 调 GET 被错误返回 403。\n③ 路由修复：API Key 吊销 DELETE /api/open/keys/:id 与单条记录 GET/PUT/DELETE /api/open/:resource/:id 此前返回 405（处理函数误放在集合级路由文件，未匹配 id 段），已拆分出 keys/[id].ts 与 [resource]/[id].ts 正确路由。\n④ 实测方式：注册隔离测试组织(admin) → session 创建真实 write/read 两个 sk_ Key → 真实打生产 D1；复验 GET 200 / POST 201 / PUT 200 / DELETE 200 / readKey 写 403 / 吊销 200，已部署并复验全绿。' },
          { kind: 'why', title: '为什么这样操作', text: 'V2.74.0 的 E2E 在 DEV 下走 MSW/前端回退，未真正触达网关函数，故三个真实生产缺陷漏网；本轮按「实测先于理论」用真实 sk_ Key 打真实生产 D1，把写路径 500、scope 倒置、路由 405 全部暴露并根因修复，而非只验证鉴权拒绝分支。修复仅涉及网关函数（apiKey.ts / [resource].ts / [resource]/[id].ts / keys.ts / keys/[id].ts），不改前端与 D1 schema，零回归风险。\n遗留待决：网关 vendors 端点指向的 D1 vendors 表实为「供应商门户登录账号表」(password_hash/role/status)，并非供应商主数据关系表，其字段(credit_limit/used_credit 等)与表 schema 不符；供应商主数据当前存 app_state Blob、无独立 D1 关系表，需先调查主数据落库位置再定 vendors 端点目标表（V2.74.2 处理）。' },
        ],
      },
      {
        id: 'v2660',
        title: 'V2.66.0（2026-08-26）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① B10 采购订单变更单：采购订单支持版本留痕——变更生成新版本（非原地修改），历史快照可追溯；\n② 详情页新增「变更订单」：可改交期、逐行改数量/未税单价，填写必填变更原因后确认，自动重算金额/税额/价税合计并生成新版本（V{n}→V{n+1}）；\n③ 新增「版本历史」视图：按版本展示变更人/时间/原因 + 差异对比（交期/物料数量/单价/总额 before→after）；\n④ 已收货（有收货数量）或已结束（received/closed/cancelled）的采购订单禁止变更，按钮禁用并提示。' },
        ],
      },
      {
        id: 'v2670',
        title: 'V2.67.0（2026-08-26）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: 'B7 工作流引擎统一收尾 + E2E 全量回归修复：\n① 价格页 / 物料页 / 三队列（物料 / 供应商 / 采购审批）统一接入审批引擎 approvalFlowStore + approvalFlowConfig（getApprovalSteps / getEffectiveSteps / evaluateConditionGroup）；\n② 双引擎分离：条件技术引擎（useConditionStore）与审批流引擎解耦，取价 resolvePrice 经条件引擎叠加含税价（如 钢板 Q235B：基准 4200 → 9 折 3780 → 促销立减 200 → 条件引擎含税 13% = ¥4,045.40）；\n③ E2E 回归修复 9 项陈旧用例（V2.55.22 导航整合+组件重构遗留的选择器漂移 / 过期断言），覆盖 v33 物料审批闭环 / v34 审批流配置 / v62 价目表黑名单 / v70 销售价目表取价 / v72 付款计划 / v74 审批流定制，最终 17/17 全绿。' },
          { kind: 'why', title: '为什么这样操作', text: 'B7 把分散在各页面的审批逻辑收敛到统一引擎，避免重复实现与行为不一致；条件引擎叠加到取价使销售价目表输出含税单价，对齐真实报价口径。E2E 修复保证了升版质量门禁（仅 E2E 全绿才允许升版）。' },
        ],
      },
      {
        id: 'v2650',
        title: 'V2.65.0（2026-08-26）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① P1 Phase 1 流程闭环 B1-B5 全部落地：B4 NCR 四处置（scrap/rework/return_vendor/concession）全部生成出入库单+凭证并按评估类分流（FG→贷1405 库存商品/其余→贷1403 原材料）；B5 供应商确认交期写入独立列 vendorConfirmedDate（不改原交期）；B2-② 工单领料占库存（不足阻断）+生成 pick 出库单+回写领料明细；B2-① 序列号入库强制登记、出库按类型 FIFO 核销并写全生命周期轨迹。\n② 修复序列号模块引入的循环依赖 TDZ 整页白屏（warehouseStore→warehouseAdvancedStore），并整合序列号实现为单一来源（移除冗余直接调用）。\n③ E2E 基建修复（登录守卫 DEV 放行+自动演示用户、首次引导弹窗 DEV 跳过、vite 依赖缓存清理规避 sandbox 删除拦截）与用例陈旧选择器更新，B1-B5 全量 E2E 回归 30/30 全绿。\n④ 开发计划审计：确认 B6 黑名单/价目表回写、B8 MRP增强、B9 AQL 已实现免重复开发，B10 采购订单变更单为唯一空白项。' },
        ],
      },
      {
        id: 'v2620',
        title: 'V2.62.0（2026-08-25）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① P1 Phase 3 采购订单关系化：新增 D1 关系表 purchase_orders / purchase_order_items / inbound_orders / inbound_order_items / outbound_orders / outbound_order_items（共 6 张表），覆盖采购订单、入库单、出库单的完整属性和关联行；\n② 后端 API：新增 /api/purchase-orders（GET 分页查询）、/api/purchase-orders/:id（GET/PUT/DELETE）、/api/inbound-orders、/api/outbound-orders，按 org_id 隔离并复用 getUserFromRequest 鉴权；\n③ 种子数据：生产 D1 已写入 3 条采购订单 + 3 行明细、2 条入库单 + 2 行明细、2 条出库单 + 2 行明细，涵盖钢板/钢管/H型钢等典型物料；\n④ 工程纪律：tsc 类型门禁 0 错误；Dist 构建正常；D1 表从 7 张增至 14 张。' },
          { kind: 'why', title: '为什么这样操作', text: '采购订单是供应链核心业务单据，关联供应商、物料、入库单。将其关系化后，可通过外键约束保证数据一致性，支持分页查询、状态过滤、行明细管理，为后续三单匹配、GR-IR 暂估等复杂业务奠定关系化基础。' },
        ],
      },
      {
        id: 'v2580',
        title: 'V2.58.0（2026-05-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① P1 Phase 1 物料关系化：新增 D1 关系表 `materials`（60 字段），覆盖物料主数据全量属性；新增后端 API /api/materials 和 /api/materials/:id（GET/PUT/DELETE，org 隔离 + code 唯一性校验）；前端设置页「数据管理」新增「同步物料至云端表」按钮。\n② 种子数据：首批 6 条物料已写入生产 D1（钢板 Q235B/钢管 碳钢/H型钢 Q345B/六角螺栓 M16×80/重型钢结构焊接架 H1200/轻型货架组件 SH200），含完整价格/库存/MRP 视图字段。\n③ 工程纪律：tsc 类型门禁已生效（418 错误清零）；Dist 构建正常（225 assets / 8.0MB）；P0 地基修复 13 项全部完成。' },
          { kind: 'why', title: '为什么这样操作', text: '物料是供应链业务的主数据锚点——所有采购、库存、销售、生产单据都引用物料。把物料从 app_state JSON blob 迁关系表，是 P1 关系化地基的第一步，后续所有主数据和业务单据的关系化都将以此为模板。' },
        ],
      },
      {
        id: 'v2570',
        title: 'V2.57.0（2026-08-24）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① 安全加固：登录密码哈希由「SHA-256+盐」升级为「PBKDF2-HMAC-SHA-256（10 万次迭代 + 随机盐）」，抗暴力破解与彩虹表；存量账号自动兼容旧哈希，无需重设密码，下次改密即自动升级为新格式。\n② 数据备份：新增「设置 → 数据管理 → 云端备份下载」，登录后可一键导出本组织在云端 D1 的完整业务数据 JSON（含导出时间戳），作为数据回滚点，杜绝「数据丢了无回滚」。\n③ 供应商门户修复：修复供应商「注册后永远处于 pending 无法登录门户」的死路（审批通过 approved 或注册 registered 均可登录，黑名单仍硬拦截）。\n④ 工程纪律：类型债务 418 处全清零，新增 `build-with-gate.bat` 类型门禁（tsc 不通过则阻断构建）；两个详情页白屏缺陷已修复并补充回归用例防回归。' },
          { kind: 'why', title: '为什么这样操作', text: '对标测试报告指出系统「无备份、弱安全、有白屏」，是上生产的最大地基风险。本轮把密码哈希强度提升到主流标准、补上云端备份回滚点、打通供应商登录死路，并让类型门禁真正生效，使系统从「演示跑通」迈向「生产可用」。' },
        ],
      },
      {
        id: 'v2560',
        title: 'V2.56.0（2026-08-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① 新增后端服务（Cloudflare D1 数据库 + Pages Functions），实现「多人多设备看同一份业务数据」。\n② 新增真实账号体系：登录页（/login）支持注册/登录，密码采用 SHA-256+盐哈希存储，按角色（admin/manager/user）控制权限。\n③ 以「公司码」区分组织：注册时填写公司码，相同公司码自动加入同一组织并共享全部业务数据；不同公司码相互隔离。\n④ 顶栏头像菜单新增「退出登录」。未登录时使用浏览器本地数据（离线可继续用），登录后业务数据按组织实时同步到云端。' },
          { kind: 'why', title: '为什么这样操作', text: '此前数据只存在各人浏览器本地，换设备/换人就看不到。加入后端后，同一公司（相同公司码）的所有人登录后看到的是同一份实时数据，满足「多人多设备协同」。采用 Cloudflare 全家桶（与现有静态托管同账号同域名），零新增成本、免跨域配置；登录态保留在本地，刷新免重复登录，后端不可达时自动回退本地，保证离线可用。' },
          { kind: 'usage', title: '测试与上线要点', text: '首次使用：在登录页点「注册新账号」，填用户名/密码/姓名，公司码默认 xg-auto（同事用相同码即共享数据），提交即自动创建组织并登录。此后任意设备用同一账号登录即可看到同一份数据；用相同公司码注册他人账号即可协同。' },
        ],
      },
      {
        id: 'v25525',
        title: 'V2.55.25（2026-08-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① 将「使用说明书」接入系统设置：设置页新增「帮助中心 → 使用说明书」入口，点击直达完整说明书（/help/manual）。\n② 新增本「版本更新记录」章节，作为每次升版的变更登记处。' },
          { kind: 'why', title: '为什么这样操作', text: '把帮助文档统一收口到「设置 → 帮助中心」，符合用户找帮助的直觉；并用版本记录章节落实「每次升版必更新说明书」的约定，使说明书与系统版本始终同步。' },
        ],
      },
      {
        id: 'v25524',
        title: 'V2.55.24（2026-08-18）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '① 顶部全局搜索框升级为覆盖全部约 120 个菜单页的搜索索引，支持名称/英文别名/关键词匹配与 ↑/↓/Enter 键盘导航。\n② 新增应用内详细使用说明书（/help/manual），逐表单讲清用途、为何这样操作、关键字段、操作流程与注意事项。\n③ 修复应收列表页账龄下拉的隐藏渲染缺陷。\n④ 发布至 Cloudflare Pages（https://ssa-erp.pages.dev）。' },
        ],
      },
      {
        id: 'v25523',
        title: 'V2.55.23（2026-08-17）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '重写「全流程自检」面板为 19 环节端到端自检（/test/flow），用真实主数据贯通「客户跟进→收款」全链路，并修复应收列表页账龄下拉隐藏 bug。' },
        ],
      },
      {
        id: 'v25522',
        title: 'V2.55.22（2026-08-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '导航二次整合：分析与报表聚合、审批中心单入口，去除重复页面。' },
        ],
      },
      {
        id: 'v25521',
        title: 'V2.55.21（2026-08-14）',
        blocks: [
          { kind: 'usage', title: '本次变更', text: '导航整合（平台生态 → 系统设置）、货源清单物料编码列 + 联动 selector、详情页通用打印模块。' },
        ],
      },
    ],
  },
];
