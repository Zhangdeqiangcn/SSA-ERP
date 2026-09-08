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
          { kind: 'fields', title: '关键区域', text: '顶栏搜索框：按 Ctrl/Cmd+K 唤起，输入功能或页面名即可直达。\n左侧导航：按「审批中心 / 主数据 / 供应链 / 销售管理 / 生产与质量 / 财务与报表 / 分析与报表」分组。\n多标签页：打开过的页面以标签呈现，点击可回看。' },
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
