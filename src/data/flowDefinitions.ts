/**
 * 全局流程定义数据
 * 每个模块对应一组流程节点，供 FlowTracker 组件读取
 */

export interface FlowNode {
  id: string;
  label: string;          // 节点名称
  subLabel?: string;      // 副标题（如：负责人/部门）
  icon?: string;          // 图标标识
  route?: string;         // 关联页面路由（可选）
}

/** 跨模块流转链接 */
export interface CrossModuleLink {
  module: string;          // 关联模块标识
  moduleLabel: string;     // 关联模块名称
  direction: 'upstream' | 'downstream'; // 上游/下游
  description: string;     // 关联说明（如：由XX触发、流转到XX）
}

export interface FlowDefinition {
  module: string;
  moduleLabel: string;
  description: string;
  nodes: FlowNode[];
  crossModuleLinks?: CrossModuleLink[];  // 跨模块流转关系
}

// ── 1. 采购申请流程 ─────────────────────────────────────────
const purchaseRequestFlow: FlowDefinition = {
  module: 'purchase-request',
  moduleLabel: '采购申请',
  description: '物料需求 → 采购申请 → 部门审批 → 采购审批 → 财务确认 → 生成订单',
  nodes: [
    { id: 'pr_draft',     label: '新建申请',   subLabel: '需求部门', icon: 'draft' },
    { id: 'pr_submitted', label: '提交审核',   subLabel: '需求部门', icon: 'submit' },
    { id: 'pr_dept',      label: '部门主管审批', subLabel: '部门经理', icon: 'approval' },
    { id: 'pr_purchase',  label: '采购部审批',  subLabel: '采购经理', icon: 'approval' },
    { id: 'pr_finance',   label: '财务确认',   subLabel: '财务主管', icon: 'finance' },
    { id: 'pr_ordered',   label: '生成采购订单', subLabel: '采购员',   icon: 'done', route: '/purchase/orders' },
    { id: 'pr_completed', label: '完成',       subLabel: '系统',     icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'mrp', moduleLabel: 'MRP计划', direction: 'upstream', description: 'MRP运算生成物料需求 → 触发采购申请' },
    { module: 'price-inquiry', moduleLabel: '询价单', direction: 'downstream', description: '采购申请物料 → 支持发起询价流程' },
    { module: 'purchase-order', moduleLabel: '采购订单', direction: 'downstream', description: '审批通过 → 自动生成采购订单' },
  ],
};

// ── 2. 采购订单流程 ─────────────────────────────────────────
const purchaseOrderFlow: FlowDefinition = {
  module: 'purchase-order',
  moduleLabel: '采购订单',
  description: '采购订单确认 → 供应商接单 → 备货 → 发货 → 到货 → 报检 → 入库',
  nodes: [
    { id: 'po_draft',     label: '新建订单',   subLabel: '采购员', icon: 'draft' },
    { id: 'po_confirmed', label: '供应商确认',  subLabel: '供应商', icon: 'check', route: '/vendor-portal/orders/confirm' },
    { id: 'po_preparing', label: '备货中',     subLabel: '供应商', icon: 'progress' },
    { id: 'po_shipped',   label: '发货',       subLabel: '供应商', icon: 'ship', route: '/vendor-portal/orders/shipment' },
    { id: 'po_arrived',   label: '到货',       subLabel: '仓库',   icon: 'arrive' },
    { id: 'po_inspect',   label: '报检',       subLabel: '仓库/质量', icon: 'inspect', route: '/warehouse/inspection-notice' },
    { id: 'po_instore',   label: '入库',       subLabel: '仓库',   icon: 'instore', route: '/warehouse/inbound' },
    { id: 'po_completed', label: '完成',       subLabel: '系统',   icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'purchase-request', moduleLabel: '采购申请', direction: 'upstream', description: '采购申请审批通过 → 生成采购订单' },
    { module: 'vendor-order', moduleLabel: '供应商订单确认', direction: 'downstream', description: '订单下达 → 供应商接收确认' },
    { module: 'inspection-notice', moduleLabel: '报检单', direction: 'downstream', description: '到货后 → 仓库发起报检' },
    { module: 'inbound', moduleLabel: '入库单', direction: 'downstream', description: '检验合格 → 生成入库单' },
  ],
};

// ── 3. 报检流程（仓储→质量核心流转）─────────────────────────
const inspectionNoticeFlow: FlowDefinition = {
  module: 'inspection-notice',
  moduleLabel: '报检单',
  description: '仓库新建报检 → 质量接单 → 执行检验 → 判定结论 → 入库（合格）/ 不合格处理（不合格）',
  nodes: [
    { id: 'in_pending',    label: '仓库报检',   subLabel: '仓库管理员', icon: 'draft', route: '/warehouse/inspection-notice' },
    { id: 'in_accepted',   label: '质量接单',   subLabel: '质量主管',   icon: 'check', route: '/quality/inspection' },
    { id: 'in_inspecting', label: '执行检验',   subLabel: '检验员',     icon: 'inspect' },
    { id: 'in_conclusion', label: '判定结论',   subLabel: '质量主管',   icon: 'judge' },
    { id: 'in_passed',     label: '合格入库',   subLabel: '仓库管理员', icon: 'done', route: '/warehouse/inbound' },
    { id: 'in_failed',     label: '不合格处理',  subLabel: '质量工程师', icon: 'fail', route: '/quality/unqualified' },
  ],
  crossModuleLinks: [
    { module: 'purchase-order', moduleLabel: '采购订单', direction: 'upstream', description: '采购到货后 → 仓库发起报检' },
    { module: 'inspection-task', moduleLabel: '检验任务', direction: 'downstream', description: '报检 → 质量部生成检验任务' },
    { module: 'inbound', moduleLabel: '入库单', direction: 'downstream', description: '检验合格 → 系统生成入库单' },
    { module: 'unqualified', moduleLabel: '不合格品处理', direction: 'downstream', description: '检验不合格 → 进入不合格品处置流程' },
  ],
};

// ── 4. 入库单流程 ───────────────────────────────────────────
const inboundFlow: FlowDefinition = {
  module: 'inbound',
  moduleLabel: '入库单',
  description: '检验合格 → 生成入库单 → 仓库确认 → 质量确认 → 上架 → 完成',
  nodes: [
    { id: 'ib_created',    label: '生成入库单',  subLabel: '系统自动', icon: 'draft' },
    { id: 'ib_whconfirm',  label: '仓库确认',    subLabel: '仓管员',   icon: 'check' },
    { id: 'ib_qcconfirm',  label: '质量确认',    subLabel: '质检员',   icon: 'inspect' },
    { id: 'ib_shelving',   label: '上架',        subLabel: '仓管员',   icon: 'instore' },
    { id: 'ib_accounting', label: '财务记账',    subLabel: '会计',     icon: 'finance' },
    { id: 'ib_completed',  label: '入库完成',    subLabel: '系统',     icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'inspection-notice', moduleLabel: '报检单', direction: 'upstream', description: '检验合格判定 → 自动生成入库单' },
    { module: 'invoice', moduleLabel: '发票管理', direction: 'downstream', description: '入库完成 → 触发供应商开票流程' },
    { module: 'payment-plan', moduleLabel: '付款计划', direction: 'downstream', description: '入库记账 → 纳入付款计划' },
  ],
};

// ── 5. 出库单流程 ───────────────────────────────────────────
const outboundFlow: FlowDefinition = {
  module: 'outbound',
  moduleLabel: '出库单',
  description: '出库申请 → 审批 → 拣货配货 → 复核 → 发货 → 完成',
  nodes: [
    { id: 'ob_draft',     label: '新建出库单',  subLabel: '申请人',  icon: 'draft' },
    { id: 'ob_approved',  label: '审批通过',    subLabel: '主管',    icon: 'approval' },
    { id: 'ob_picking',   label: '拣货配货',    subLabel: '仓管员',  icon: 'pick' },
    { id: 'ob_review',    label: '复核',       subLabel: '复核员',  icon: 'inspect' },
    { id: 'ob_shipping',  label: '发货',       subLabel: '物流',    icon: 'ship' },
    { id: 'ob_completed', label: '完成',       subLabel: '系统',    icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'work-order', moduleLabel: '生产工单', direction: 'upstream', description: '生产领料需求 → 发起出库' },
  ],
};

// ── 6. 检验任务流程 ─────────────────────────────────────────
const inspectionTaskFlow: FlowDefinition = {
  module: 'inspection-task',
  moduleLabel: '检验任务',
  description: '接收任务 → 准备样品 → 执行检验 → 填写结论 → 提交审批 → 完成',
  nodes: [
    { id: 'it_received',   label: '接收任务',   subLabel: '检验员',   icon: 'check' },
    { id: 'it_preparing',  label: '准备样品',   subLabel: '检验员',   icon: 'prep' },
    { id: 'it_testing',    label: '执行检验',   subLabel: '检验员',   icon: 'inspect' },
    { id: 'it_result',     label: '填写结论',   subLabel: '检验员',   icon: 'judge' },
    { id: 'it_approved',   label: '提交审批',   subLabel: '质量主管', icon: 'approval' },
    { id: 'it_completed',  label: '完成',       subLabel: '系统',     icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'inspection-notice', moduleLabel: '报检单', direction: 'upstream', description: '仓库报检 → 生成检验任务' },
    { module: 'unqualified', moduleLabel: '不合格品处理', direction: 'downstream', description: '检验不合格 → 进入不合格品处置' },
  ],
};

// ── 7. 不合格品处理流程 ─────────────────────────────────────
const unqualifiedFlow: FlowDefinition = {
  module: 'unqualified',
  moduleLabel: '不合格品处理',
  description: '检验不合格 → 判定确认 → 选择处置方式 → 质量审批 → 执行处置 → 关闭',
  nodes: [
    { id: 'uq_found',      label: '发现不合格',  subLabel: '检验员',   icon: 'fail' },
    { id: 'uq_judge',      label: '判定确认',    subLabel: '质量工程师', icon: 'judge' },
    { id: 'uq_dispose',    label: '选择处置方式', subLabel: '质量主管',   icon: 'decide',
      route: '/quality/unqualified' },
    { id: 'uq_approval',   label: '质量审批',    subLabel: '质量经理',  icon: 'approval' },
    { id: 'uq_execute',    label: '执行处置',    subLabel: '执行部门',  icon: 'execute' },
    { id: 'uq_closed',     label: '关闭',       subLabel: '系统',     icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'inspection-notice', moduleLabel: '报检单', direction: 'upstream', description: '检验判定不合格 → 触发不合格品处理' },
    { module: 'inspection-task', moduleLabel: '检验任务', direction: 'upstream', description: '检验任务判定 → 不合格品流转' },
  ],
};

// ── 8. 生产工单流程 ─────────────────────────────────────────
const workOrderFlow: FlowDefinition = {
  module: 'work-order',
  moduleLabel: '生产工单',
  description: '创建工单 → 下达 → 领料 → 生产 → 报检 → 检验 → 入库',
  nodes: [
    { id: 'wo_draft',      label: '创建工单',    subLabel: '计划员',   icon: 'draft' },
    { id: 'wo_released',   label: '下达',       subLabel: '生产主管', icon: 'approval' },
    { id: 'wo_material',   label: '领料',       subLabel: '车间',     icon: 'pick', route: '/warehouse/outbound' },
    { id: 'wo_producing',  label: '生产中',      subLabel: '车间',     icon: 'progress' },
    { id: 'wo_inspect',    label: '报检',       subLabel: '车间',     icon: 'inspect', route: '/warehouse/inspection-notice' },
    { id: 'wo_qced',       label: '检验合格',    subLabel: '质量部',   icon: 'check', route: '/quality/inspection' },
    { id: 'wo_instore',    label: '成品入库',    subLabel: '仓库',     icon: 'done', route: '/warehouse/fg-inbound' },
    { id: 'wo_completed',  label: '完成',       subLabel: '系统',     icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'mrp', moduleLabel: 'MRP计划', direction: 'upstream', description: 'MRP运算 → 建议下达生产工单' },
    { module: 'bom', moduleLabel: 'BOM管理', direction: 'upstream', description: 'BOM数据 → 驱动产品物料需求' },
    { module: 'process-route', moduleLabel: '工艺流程', direction: 'upstream', description: '工艺流程 → 指导生产操作' },
    { module: 'outbound', moduleLabel: '出库单', direction: 'downstream', description: '生产领料 → 仓库出库' },
    { module: 'inspection-notice', moduleLabel: '报检单', direction: 'downstream', description: '生产完工 → 发起报检' },
  ],
};

// ── 9. 供应商准入流程 ───────────────────────────────────────
const vendorRegistrationFlow: FlowDefinition = {
  module: 'vendor-registration',
  moduleLabel: '供应商准入',
  description: '提交申请 → 资质审核 → 现场考察 → 评审 → 准入/驳回',
  nodes: [
    { id: 'vr_submitted',  label: '提交申请',    subLabel: '供应商',   icon: 'draft' },
    { id: 'vr_reviewing',  label: '资质审核',    subLabel: '采购部',   icon: 'approval' },
    { id: 'vr_onsite',     label: '现场考察',    subLabel: '质量部',   icon: 'inspect' },
    { id: 'vr_assess',     label: '综合评审',    subLabel: '评审委员会', icon: 'judge' },
    { id: 'vr_approved',   label: '准入通过',    subLabel: '系统',     icon: 'done' },
    { id: 'vr_rejected',   label: '驳回',       subLabel: '系统',     icon: 'fail' },
  ],
  crossModuleLinks: [
    { module: 'vendor-order', moduleLabel: '供应商订单确认', direction: 'downstream', description: '准入通过 → 可接收采购订单' },
    { module: 'purchase-order', moduleLabel: '采购订单', direction: 'downstream', description: '准入供应商 → 纳入采购订单合作范围' },
  ],
};

// ── 10. 供应商订单确认流程 ──────────────────────────────────
const vendorOrderFlow: FlowDefinition = {
  module: 'vendor-order',
  moduleLabel: '供应商订单确认',
  description: '订单下达 → 供应商接收 → 确认/反馈 → 备货 → 发货 → 完成',
  nodes: [
    { id: 'vo_released',   label: '采购方下单',   subLabel: '采购部', icon: 'draft' },
    { id: 'vo_received',   label: '供应商接收',   subLabel: '供应商', icon: 'check' },
    { id: 'vo_confirmed',  label: '供应商确认',   subLabel: '供应商', icon: 'approval', route: '/vendor-portal/orders/confirm' },
    { id: 'vo_preparing',  label: '备货',        subLabel: '供应商', icon: 'prep' },
    { id: 'vo_shipped',    label: '发货',        subLabel: '供应商', icon: 'ship', route: '/vendor-portal/orders/shipment' },
    { id: 'vo_arrived',    label: '到货',        subLabel: '仓库',   icon: 'arrive' },
    { id: 'vo_completed',  label: '完成',        subLabel: '系统',   icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'purchase-order', moduleLabel: '采购订单', direction: 'upstream', description: '采购方下达订单 → 供应商接收确认' },
    { module: 'vendor-registration', moduleLabel: '供应商准入', direction: 'upstream', description: '已准入供应商 → 接收订单' },
    { module: 'inspection-notice', moduleLabel: '报检单', direction: 'downstream', description: '供应商到货 → 仓库发起报检' },
  ],
};

// ── 11. 工艺流程 ─────────────────────────────────────────────
const processRouteFlow: FlowDefinition = {
  module: 'process-route',
  moduleLabel: '工艺流程',
  description: '工艺设计 → 审核 → 发布 → 生产执行',
  nodes: [
    { id: 'prt_design',   label: '工艺设计', subLabel: '工艺工程师', icon: 'draft' },
    { id: 'prt_review',   label: '审核',     subLabel: '技术主管',   icon: 'approval' },
    { id: 'prt_publish',  label: '发布',     subLabel: '系统',       icon: 'check' },
    { id: 'prt_execute',  label: '执行',     subLabel: '车间',       icon: 'execute' },
  ],
  crossModuleLinks: [
    { module: 'bom', moduleLabel: 'BOM管理', direction: 'upstream', description: 'BOM物料清单 → 定义产品加工工艺' },
    { module: 'work-order', moduleLabel: '生产工单', direction: 'downstream', description: '工艺流程发布 → 指导生产工单执行' },
  ],
};

// ── 12. 付款计划流程 ─────────────────────────────────────────
const paymentPlanFlow: FlowDefinition = {
  module: 'payment-plan',
  moduleLabel: '付款计划',
  description: '创建付款计划 → 财务审核 → 经理审批 → 执行付款 → 完成',
  nodes: [
    { id: 'pp_draft',     label: '创建计划',  subLabel: '会计',     icon: 'draft' },
    { id: 'pp_review',    label: '财务审核',  subLabel: '财务主管', icon: 'approval' },
    { id: 'pp_approved',  label: '经理审批',  subLabel: '财务经理', icon: 'judge' },
    { id: 'pp_paying',    label: '执行付款',  subLabel: '出纳',     icon: 'execute' },
    { id: 'pp_completed', label: '完成',      subLabel: '系统',     icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'inbound', moduleLabel: '入库单', direction: 'upstream', description: '入库完成 → 生成应付账款' },
    { module: 'invoice', moduleLabel: '发票管理', direction: 'upstream', description: '发票审核 → 生成付款计划' },
    { module: 'price-approval', moduleLabel: '价格审批', direction: 'upstream', description: '价格审批通过 → 基于约定价格付款' },
  ],
};

// ── 13. MRP 计划流程 ─────────────────────────────────────────
const mrpFlow: FlowDefinition = {
  module: 'mrp',
  moduleLabel: 'MRP计划',
  description: '需求输入 → MRP运算 → 计划结果 → 审核 → 下达采购/生产',
  nodes: [
    { id: 'mrp_input',    label: '需求输入',   subLabel: '计划员',   icon: 'draft' },
    { id: 'mrp_calc',     label: 'MRP运算',   subLabel: '系统',     icon: 'progress' },
    { id: 'mrp_result',   label: '计划结果',   subLabel: '计划员',   icon: 'check' },
    { id: 'mrp_approve',  label: '审核',      subLabel: '生产经理', icon: 'approval' },
    { id: 'mrp_release',  label: '下达',      subLabel: '采购/生产', icon: 'done', route: '/purchase/requests' },
  ],
  crossModuleLinks: [
    { module: 'bom', moduleLabel: 'BOM管理', direction: 'upstream', description: 'BOM清单 → MRP计算物料需求量' },
    { module: 'purchase-request', moduleLabel: '采购申请', direction: 'downstream', description: 'MRP运算 → 建议生成采购申请' },
    { module: 'work-order', moduleLabel: '生产工单', direction: 'downstream', description: 'MRP运算 → 建议下达生产工单' },
  ],
};

// ── 14. 发票管理流程 ─────────────────────────────────────────
const invoiceFlow: FlowDefinition = {
  module: 'invoice',
  moduleLabel: '发票管理',
  description: '供应商开票 → 收票登记 → 审核 → 记账 → 付款',
  nodes: [
    { id: 'iv_issued',    label: '供应商开票', subLabel: '供应商',  icon: 'draft', route: '/vendor-portal/finance/invoices' },
    { id: 'iv_received',  label: '收票登记',   subLabel: '财务',    icon: 'check' },
    { id: 'iv_reviewed',  label: '审核验证',   subLabel: '财务主管', icon: 'approval' },
    { id: 'iv_booked',    label: '记账',       subLabel: '会计',    icon: 'finance' },
    { id: 'iv_paid',      label: '付款',       subLabel: '出纳',    icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'inbound', moduleLabel: '入库单', direction: 'upstream', description: '入库完成 → 供应商开票' },
    { module: 'payment-plan', moduleLabel: '付款计划', direction: 'downstream', description: '发票审核 → 纳入付款计划' },
  ],
};

// ── 15. BOM 管理流程 ─────────────────────────────────────────
const bomFlow: FlowDefinition = {
  module: 'bom',
  moduleLabel: 'BOM管理',
  description: '设计BOM → 审核 → 发布 → 变更 → 成本卷积',
  nodes: [
    { id: 'bom_design',   label: '设计BOM',    subLabel: '研发工程师', icon: 'draft' },
    { id: 'bom_review',   label: '审核',       subLabel: '技术主管',   icon: 'approval' },
    { id: 'bom_release',  label: '发布',       subLabel: '系统',       icon: 'check' },
    { id: 'bom_change',   label: '变更',       subLabel: '研发',       icon: 'inspect' },
    { id: 'bom_cost',     label: '成本卷积',   subLabel: '财务',       icon: 'finance', route: '/bom/cost-rollup' },
  ],
  crossModuleLinks: [
    { module: 'mrp', moduleLabel: 'MRP计划', direction: 'downstream', description: 'BOM发布 → MRP运算物料需求' },
    { module: 'work-order', moduleLabel: '生产工单', direction: 'downstream', description: 'BOM物料 → 生产工单配料依据' },
    { module: 'process-route', moduleLabel: '工艺流程', direction: 'downstream', description: 'BOM产品结构 → 关联加工工艺' },
  ],
};

// ── 16. 价格管理-询价单流程 ──────────────────────────────────
const priceInquiryFlow: FlowDefinition = {
  module: 'price-inquiry',
  moduleLabel: '询价单',
  description: '创建询价单 → 发布询价 → 供应商报价 → 生成比价单',
  nodes: [
    { id: 'pi_draft',     label: '创建询价单',  subLabel: '采购员',   icon: 'draft' },
    { id: 'pi_published', label: '已发布询价',  subLabel: '采购员',   icon: 'publish' },
    { id: 'pi_quoting',   label: '供应商报价中', subLabel: '供应商',   icon: 'quote', route: '/vendor-portal/quotation' },
    { id: 'pi_closed',    label: '报价截止',    subLabel: '系统',     icon: 'close' },
    { id: 'pi_compared',  label: '生成比价单',  subLabel: '采购员',   icon: 'compare', route: '/price/comparisons' },
  ],
  crossModuleLinks: [
    { module: 'purchase-request', moduleLabel: '采购申请', direction: 'upstream', description: '采购申请物料 → 支持发起询价' },
    { module: 'price-comparison', moduleLabel: '比价单', direction: 'downstream', description: '供应商报价截止 → 自动生成比价单' },
  ],
};

// ── 17. 价格管理-比价单流程 ──────────────────────────────────
const priceComparisonFlow: FlowDefinition = {
  module: 'price-comparison',
  moduleLabel: '比价单',
  description: '自动汇总报价 → 对比分析 → 选定供应商 → 提交审批',
  nodes: [
    { id: 'pc_generated', label: '自动生成比价', subLabel: '系统',     icon: 'draft' },
    { id: 'pc_analyzing', label: '对比分析',     subLabel: '采购员',   icon: 'compare' },
    { id: 'pc_selected',  label: '选定供应商',   subLabel: '采购员',   icon: 'check' },
    { id: 'pc_submitted', label: '提交审批',     subLabel: '采购员',   icon: 'submit', route: '/price/approvals' },
    { id: 'pc_approved',  label: '审批通过',     subLabel: '管理层',   icon: 'approved' },
    { id: 'pc_updated',   label: '更新价目表',   subLabel: '系统',     icon: 'done', route: '/price/list' },
  ],
  crossModuleLinks: [
    { module: 'price-inquiry', moduleLabel: '询价单', direction: 'upstream', description: '询价截止 → 汇总各供应商报价' },
    { module: 'price-approval', moduleLabel: '价格审批', direction: 'downstream', description: '比价选定 → 提交价格审批' },
  ],
};

// ── 18. 价格管理-价格审批流程 ─────────────────────────────────
const priceApprovalFlow: FlowDefinition = {
  module: 'price-approval',
  moduleLabel: '价格审批',
  description: '提交审批 → 采购经理审批 → 财务审批 → 通过/驳回',
  nodes: [
    { id: 'pa_submitted',  label: '提交审批',    subLabel: '采购员',   icon: 'draft' },
    { id: 'pa_purchasing', label: '采购经理审批', subLabel: '采购经理', icon: 'approval' },
    { id: 'pa_finance',    label: '财务审批',    subLabel: '财务主管', icon: 'finance' },
    { id: 'pa_approved',   label: '审批通过',    subLabel: '系统',     icon: 'done', route: '/price/list' },
    { id: 'pa_rejected',   label: '审批驳回',    subLabel: '系统',     icon: 'fail' },
  ],
  crossModuleLinks: [
    { module: 'price-comparison', moduleLabel: '比价单', direction: 'upstream', description: '比价选定结果 → 提交价格审批' },
    { module: 'payment-plan', moduleLabel: '付款计划', direction: 'downstream', description: '价格审批通过 → 按约定价格付款' },
  ],
};

// ── 19. 销售订单流程 ──────────────────────────────────────────
const salesOrderFlow: FlowDefinition = {
  module: 'sales-order',
  moduleLabel: '销售订单',
  description: '创建销售订单 → 销售确认 → 生成采购需求 → 生产排产 → 发货 → 开票',
  nodes: [
    { id: 'sso_draft',     label: '新建订单',     subLabel: '销售员', icon: 'draft' },
    { id: 'sso_confirmed', label: '销售确认',     subLabel: '销售经理', icon: 'check' },
    { id: 'sso_planned',   label: '生成采购需求', subLabel: '采购员', icon: 'quote', route: '/purchase/requests' },
    { id: 'sso_producing', label: '生产排产',     subLabel: '生产主管', icon: 'production', route: '/production/orders' },
    { id: 'sso_shipping',  label: '发货',         subLabel: '物流', icon: 'ship', route: '/sales/logistics' },
    { id: 'sso_invoiced',  label: '开票',         subLabel: '财务', icon: 'invoice', route: '/finance/invoices' },
    { id: 'sso_completed', label: '完成',         subLabel: '系统', icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'purchase-request', moduleLabel: '采购申请', direction: 'downstream', description: '销售需求 → 生成采购申请' },
    { module: 'purchase-order', moduleLabel: '采购订单', direction: 'downstream', description: '采购申请审批 → 采购订单' },
    { module: 'work-order', moduleLabel: '生产工单', direction: 'downstream', description: '物料到齐 → 生产排产' },
  ],
};

// ── 20. 物流发货流程 ──────────────────────────────────────────
const logisticsFlow: FlowDefinition = {
  module: 'logistics',
  moduleLabel: '物流发货',
  description: '创建发货单 → 备货 → 装车 → 运输中 → 签收',
  nodes: [
    { id: 'lg_created',    label: '创建发货单', subLabel: '物流', icon: 'draft' },
    { id: 'lg_preparing',  label: '备货',       subLabel: '仓库', icon: 'progress' },
    { id: 'lg_loaded',     label: '装车',       subLabel: '物流', icon: 'inspect' },
    { id: 'lg_transit',    label: '运输中',     subLabel: '物流', icon: 'ship' },
    { id: 'lg_signed',     label: '签收',       subLabel: '客户', icon: 'arrive' },
    { id: 'lg_completed',  label: '完成',       subLabel: '系统', icon: 'done' },
  ],
  crossModuleLinks: [
    { module: 'sales-order', moduleLabel: '销售订单', direction: 'upstream', description: '销售订单生产完成 → 安排发货' },
    { module: 'invoice', moduleLabel: '发票管理', direction: 'downstream', description: '发货签收 → 生成发票' },
  ],
};
// ── 供应商准入之后：物料新增审批流程（外购件） ─────────────────────
const materialApprovalFlow: FlowDefinition = {
  module: 'material-approval',
  moduleLabel: '物料新增审批（外购件）',
  description: '发起申请（基本属性） → 采购审核（采购属性） → 批准生效',
  nodes: [
    { id: 'ma_submit',  label: '发起申请', subLabel: '研发/工艺', icon: 'draft' },
    { id: 'ma_purchase', label: '采购审核', subLabel: '采购员',   icon: 'approval' },
    { id: 'ma_approve',  label: '批准生效', subLabel: '管理员',   icon: 'done' },
  ],
};

// ── 物料新增审批流程（自制件）：发起 → 工艺审核 → 批准 ───────────────
const materialApprovalMakeFlow: FlowDefinition = {
  module: 'material-approval-make',
  moduleLabel: '物料新增审批（自制件）',
  description: '发起申请（基本属性） → 工艺审核（工艺属性） → 批准生效',
  nodes: [
    { id: 'mam_submit',   label: '发起申请', subLabel: '研发/工艺', icon: 'draft' },
    { id: 'mam_process',  label: '工艺审核', subLabel: '工艺工程师', icon: 'engineering' },
    { id: 'mam_approve',  label: '批准生效', subLabel: '管理员',     icon: 'done' },
  ],
};

import { buildApprovalFlowDefinition } from './approvalFlowConfig';

export const flowDefinitions: Record<string, FlowDefinition> = {
  'material-approval':        materialApprovalFlow,
  'material-approval-make':   materialApprovalMakeFlow,
  'purchase-request':    purchaseRequestFlow,
  'purchase-order':      purchaseOrderFlow,
  'inspection-notice':   inspectionNoticeFlow,
  'inbound':             inboundFlow,
  'outbound':            outboundFlow,
  'inspection-task':     inspectionTaskFlow,
  'unqualified':         unqualifiedFlow,
  'work-order':          workOrderFlow,
  'vendor-registration': vendorRegistrationFlow,
  'vendor-order':        vendorOrderFlow,
  'process-route':       processRouteFlow,
  'payment-plan':        paymentPlanFlow,
  'mrp':                 mrpFlow,
  'invoice':             invoiceFlow,
  'bom':                 bomFlow,
  'price-inquiry':       priceInquiryFlow,
  'price-comparison':    priceComparisonFlow,
  'price-approval':      priceApprovalFlow,
  'sales-order':         salesOrderFlow,
  'logistics':           logisticsFlow,
};

/**
 * 获取流程定义（若未定义则返回通用4节点流程）
 */
export function getFlowDefinition(module: string): FlowDefinition {
  // 优先使用审批流配置（ApprovalFlowTab 中可编辑），实现配置驱动的步骤渲染
  const cfg = buildApprovalFlowDefinition(module);
  if (cfg) return cfg;
  return flowDefinitions[module] || {
    module,
    moduleLabel: module,
    description: '通用流程',
    nodes: [
      { id: 'start',   label: '开始', subLabel: '', icon: 'draft' },
      { id: 'process', label: '处理中', subLabel: '', icon: 'progress' },
      { id: 'review',  label: '审核',  subLabel: '', icon: 'approval' },
      { id: 'end',     label: '完成',  subLabel: '', icon: 'done' },
    ],
  };
}
