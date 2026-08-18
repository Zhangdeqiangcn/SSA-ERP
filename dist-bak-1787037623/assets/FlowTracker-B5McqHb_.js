import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { y as buildApprovalFlowDefinition } from "./index-CU2cqxc8.js";
import { b9 as Dialog, ba as DialogTitle, m as Box, ab as AccountTree, T as Typography, aM as IconButton, aV as CloseIcon, bc as DialogContent, aO as Chip, dz as ArrowUpward, dA as ArrowDownward, bl as Alert, p as Tooltip } from "./vendor-mui-DsZGB15g.js";
const purchaseRequestFlow = {
  module: "purchase-request",
  moduleLabel: "采购申请",
  description: "物料需求 → 采购申请 → 部门审批 → 采购审批 → 财务确认 → 生成订单",
  nodes: [
    { id: "pr_draft", label: "新建申请", subLabel: "需求部门", icon: "draft" },
    { id: "pr_submitted", label: "提交审核", subLabel: "需求部门", icon: "submit" },
    { id: "pr_dept", label: "部门主管审批", subLabel: "部门经理", icon: "approval" },
    { id: "pr_purchase", label: "采购部审批", subLabel: "采购经理", icon: "approval" },
    { id: "pr_finance", label: "财务确认", subLabel: "财务主管", icon: "finance" },
    { id: "pr_ordered", label: "生成采购订单", subLabel: "采购员", icon: "done", route: "/purchase/orders" },
    { id: "pr_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "mrp", moduleLabel: "MRP计划", direction: "upstream", description: "MRP运算生成物料需求 → 触发采购申请" },
    { module: "price-inquiry", moduleLabel: "询价单", direction: "downstream", description: "采购申请物料 → 支持发起询价流程" },
    { module: "purchase-order", moduleLabel: "采购订单", direction: "downstream", description: "审批通过 → 自动生成采购订单" }
  ]
};
const purchaseOrderFlow = {
  module: "purchase-order",
  moduleLabel: "采购订单",
  description: "采购订单确认 → 供应商接单 → 备货 → 发货 → 到货 → 报检 → 入库",
  nodes: [
    { id: "po_draft", label: "新建订单", subLabel: "采购员", icon: "draft" },
    { id: "po_confirmed", label: "供应商确认", subLabel: "供应商", icon: "check", route: "/vendor-portal/orders/confirm" },
    { id: "po_preparing", label: "备货中", subLabel: "供应商", icon: "progress" },
    { id: "po_shipped", label: "发货", subLabel: "供应商", icon: "ship", route: "/vendor-portal/orders/shipment" },
    { id: "po_arrived", label: "到货", subLabel: "仓库", icon: "arrive" },
    { id: "po_inspect", label: "报检", subLabel: "仓库/质量", icon: "inspect", route: "/warehouse/inspection-notice" },
    { id: "po_instore", label: "入库", subLabel: "仓库", icon: "instore", route: "/warehouse/inbound" },
    { id: "po_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "purchase-request", moduleLabel: "采购申请", direction: "upstream", description: "采购申请审批通过 → 生成采购订单" },
    { module: "vendor-order", moduleLabel: "供应商订单确认", direction: "downstream", description: "订单下达 → 供应商接收确认" },
    { module: "inspection-notice", moduleLabel: "报检单", direction: "downstream", description: "到货后 → 仓库发起报检" },
    { module: "inbound", moduleLabel: "入库单", direction: "downstream", description: "检验合格 → 生成入库单" }
  ]
};
const inspectionNoticeFlow = {
  module: "inspection-notice",
  moduleLabel: "报检单",
  description: "仓库新建报检 → 质量接单 → 执行检验 → 判定结论 → 入库（合格）/ 不合格处理（不合格）",
  nodes: [
    { id: "in_pending", label: "仓库报检", subLabel: "仓库管理员", icon: "draft", route: "/warehouse/inspection-notice" },
    { id: "in_accepted", label: "质量接单", subLabel: "质量主管", icon: "check", route: "/quality/inspection" },
    { id: "in_inspecting", label: "执行检验", subLabel: "检验员", icon: "inspect" },
    { id: "in_conclusion", label: "判定结论", subLabel: "质量主管", icon: "judge" },
    { id: "in_passed", label: "合格入库", subLabel: "仓库管理员", icon: "done", route: "/warehouse/inbound" },
    { id: "in_failed", label: "不合格处理", subLabel: "质量工程师", icon: "fail", route: "/quality/unqualified" }
  ],
  crossModuleLinks: [
    { module: "purchase-order", moduleLabel: "采购订单", direction: "upstream", description: "采购到货后 → 仓库发起报检" },
    { module: "inspection-task", moduleLabel: "检验任务", direction: "downstream", description: "报检 → 质量部生成检验任务" },
    { module: "inbound", moduleLabel: "入库单", direction: "downstream", description: "检验合格 → 系统生成入库单" },
    { module: "unqualified", moduleLabel: "不合格品处理", direction: "downstream", description: "检验不合格 → 进入不合格品处置流程" }
  ]
};
const inboundFlow = {
  module: "inbound",
  moduleLabel: "入库单",
  description: "检验合格 → 生成入库单 → 仓库确认 → 质量确认 → 上架 → 完成",
  nodes: [
    { id: "ib_created", label: "生成入库单", subLabel: "系统自动", icon: "draft" },
    { id: "ib_whconfirm", label: "仓库确认", subLabel: "仓管员", icon: "check" },
    { id: "ib_qcconfirm", label: "质量确认", subLabel: "质检员", icon: "inspect" },
    { id: "ib_shelving", label: "上架", subLabel: "仓管员", icon: "instore" },
    { id: "ib_accounting", label: "财务记账", subLabel: "会计", icon: "finance" },
    { id: "ib_completed", label: "入库完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "inspection-notice", moduleLabel: "报检单", direction: "upstream", description: "检验合格判定 → 自动生成入库单" },
    { module: "invoice", moduleLabel: "发票管理", direction: "downstream", description: "入库完成 → 触发供应商开票流程" },
    { module: "payment-plan", moduleLabel: "付款计划", direction: "downstream", description: "入库记账 → 纳入付款计划" }
  ]
};
const outboundFlow = {
  module: "outbound",
  moduleLabel: "出库单",
  description: "出库申请 → 审批 → 拣货配货 → 复核 → 发货 → 完成",
  nodes: [
    { id: "ob_draft", label: "新建出库单", subLabel: "申请人", icon: "draft" },
    { id: "ob_approved", label: "审批通过", subLabel: "主管", icon: "approval" },
    { id: "ob_picking", label: "拣货配货", subLabel: "仓管员", icon: "pick" },
    { id: "ob_review", label: "复核", subLabel: "复核员", icon: "inspect" },
    { id: "ob_shipping", label: "发货", subLabel: "物流", icon: "ship" },
    { id: "ob_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "work-order", moduleLabel: "生产工单", direction: "upstream", description: "生产领料需求 → 发起出库" }
  ]
};
const inspectionTaskFlow = {
  module: "inspection-task",
  moduleLabel: "检验任务",
  description: "接收任务 → 准备样品 → 执行检验 → 填写结论 → 提交审批 → 完成",
  nodes: [
    { id: "it_received", label: "接收任务", subLabel: "检验员", icon: "check" },
    { id: "it_preparing", label: "准备样品", subLabel: "检验员", icon: "prep" },
    { id: "it_testing", label: "执行检验", subLabel: "检验员", icon: "inspect" },
    { id: "it_result", label: "填写结论", subLabel: "检验员", icon: "judge" },
    { id: "it_approved", label: "提交审批", subLabel: "质量主管", icon: "approval" },
    { id: "it_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "inspection-notice", moduleLabel: "报检单", direction: "upstream", description: "仓库报检 → 生成检验任务" },
    { module: "unqualified", moduleLabel: "不合格品处理", direction: "downstream", description: "检验不合格 → 进入不合格品处置" }
  ]
};
const unqualifiedFlow = {
  module: "unqualified",
  moduleLabel: "不合格品处理",
  description: "检验不合格 → 判定确认 → 选择处置方式 → 质量审批 → 执行处置 → 关闭",
  nodes: [
    { id: "uq_found", label: "发现不合格", subLabel: "检验员", icon: "fail" },
    { id: "uq_judge", label: "判定确认", subLabel: "质量工程师", icon: "judge" },
    {
      id: "uq_dispose",
      label: "选择处置方式",
      subLabel: "质量主管",
      icon: "decide",
      route: "/quality/unqualified"
    },
    { id: "uq_approval", label: "质量审批", subLabel: "质量经理", icon: "approval" },
    { id: "uq_execute", label: "执行处置", subLabel: "执行部门", icon: "execute" },
    { id: "uq_closed", label: "关闭", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "inspection-notice", moduleLabel: "报检单", direction: "upstream", description: "检验判定不合格 → 触发不合格品处理" },
    { module: "inspection-task", moduleLabel: "检验任务", direction: "upstream", description: "检验任务判定 → 不合格品流转" }
  ]
};
const workOrderFlow = {
  module: "work-order",
  moduleLabel: "生产工单",
  description: "创建工单 → 下达 → 领料 → 生产 → 报检 → 检验 → 入库",
  nodes: [
    { id: "wo_draft", label: "创建工单", subLabel: "计划员", icon: "draft" },
    { id: "wo_released", label: "下达", subLabel: "生产主管", icon: "approval" },
    { id: "wo_material", label: "领料", subLabel: "车间", icon: "pick", route: "/warehouse/outbound" },
    { id: "wo_producing", label: "生产中", subLabel: "车间", icon: "progress" },
    { id: "wo_inspect", label: "报检", subLabel: "车间", icon: "inspect", route: "/warehouse/inspection-notice" },
    { id: "wo_qced", label: "检验合格", subLabel: "质量部", icon: "check", route: "/quality/inspection" },
    { id: "wo_instore", label: "成品入库", subLabel: "仓库", icon: "done", route: "/warehouse/fg-inbound" },
    { id: "wo_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "mrp", moduleLabel: "MRP计划", direction: "upstream", description: "MRP运算 → 建议下达生产工单" },
    { module: "bom", moduleLabel: "BOM管理", direction: "upstream", description: "BOM数据 → 驱动产品物料需求" },
    { module: "process-route", moduleLabel: "工艺流程", direction: "upstream", description: "工艺流程 → 指导生产操作" },
    { module: "outbound", moduleLabel: "出库单", direction: "downstream", description: "生产领料 → 仓库出库" },
    { module: "inspection-notice", moduleLabel: "报检单", direction: "downstream", description: "生产完工 → 发起报检" }
  ]
};
const vendorRegistrationFlow = {
  module: "vendor-registration",
  moduleLabel: "供应商准入",
  description: "提交申请 → 资质审核 → 现场考察 → 评审 → 准入/驳回",
  nodes: [
    { id: "vr_submitted", label: "提交申请", subLabel: "供应商", icon: "draft" },
    { id: "vr_reviewing", label: "资质审核", subLabel: "采购部", icon: "approval" },
    { id: "vr_onsite", label: "现场考察", subLabel: "质量部", icon: "inspect" },
    { id: "vr_assess", label: "综合评审", subLabel: "评审委员会", icon: "judge" },
    { id: "vr_approved", label: "准入通过", subLabel: "系统", icon: "done" },
    { id: "vr_rejected", label: "驳回", subLabel: "系统", icon: "fail" }
  ],
  crossModuleLinks: [
    { module: "vendor-order", moduleLabel: "供应商订单确认", direction: "downstream", description: "准入通过 → 可接收采购订单" },
    { module: "purchase-order", moduleLabel: "采购订单", direction: "downstream", description: "准入供应商 → 纳入采购订单合作范围" }
  ]
};
const vendorOrderFlow = {
  module: "vendor-order",
  moduleLabel: "供应商订单确认",
  description: "订单下达 → 供应商接收 → 确认/反馈 → 备货 → 发货 → 完成",
  nodes: [
    { id: "vo_released", label: "采购方下单", subLabel: "采购部", icon: "draft" },
    { id: "vo_received", label: "供应商接收", subLabel: "供应商", icon: "check" },
    { id: "vo_confirmed", label: "供应商确认", subLabel: "供应商", icon: "approval", route: "/vendor-portal/orders/confirm" },
    { id: "vo_preparing", label: "备货", subLabel: "供应商", icon: "prep" },
    { id: "vo_shipped", label: "发货", subLabel: "供应商", icon: "ship", route: "/vendor-portal/orders/shipment" },
    { id: "vo_arrived", label: "到货", subLabel: "仓库", icon: "arrive" },
    { id: "vo_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "purchase-order", moduleLabel: "采购订单", direction: "upstream", description: "采购方下达订单 → 供应商接收确认" },
    { module: "vendor-registration", moduleLabel: "供应商准入", direction: "upstream", description: "已准入供应商 → 接收订单" },
    { module: "inspection-notice", moduleLabel: "报检单", direction: "downstream", description: "供应商到货 → 仓库发起报检" }
  ]
};
const processRouteFlow = {
  module: "process-route",
  moduleLabel: "工艺流程",
  description: "工艺设计 → 审核 → 发布 → 生产执行",
  nodes: [
    { id: "prt_design", label: "工艺设计", subLabel: "工艺工程师", icon: "draft" },
    { id: "prt_review", label: "审核", subLabel: "技术主管", icon: "approval" },
    { id: "prt_publish", label: "发布", subLabel: "系统", icon: "check" },
    { id: "prt_execute", label: "执行", subLabel: "车间", icon: "execute" }
  ],
  crossModuleLinks: [
    { module: "bom", moduleLabel: "BOM管理", direction: "upstream", description: "BOM物料清单 → 定义产品加工工艺" },
    { module: "work-order", moduleLabel: "生产工单", direction: "downstream", description: "工艺流程发布 → 指导生产工单执行" }
  ]
};
const paymentPlanFlow = {
  module: "payment-plan",
  moduleLabel: "付款计划",
  description: "创建付款计划 → 财务审核 → 经理审批 → 执行付款 → 完成",
  nodes: [
    { id: "pp_draft", label: "创建计划", subLabel: "会计", icon: "draft" },
    { id: "pp_review", label: "财务审核", subLabel: "财务主管", icon: "approval" },
    { id: "pp_approved", label: "经理审批", subLabel: "财务经理", icon: "judge" },
    { id: "pp_paying", label: "执行付款", subLabel: "出纳", icon: "execute" },
    { id: "pp_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "inbound", moduleLabel: "入库单", direction: "upstream", description: "入库完成 → 生成应付账款" },
    { module: "invoice", moduleLabel: "发票管理", direction: "upstream", description: "发票审核 → 生成付款计划" },
    { module: "price-approval", moduleLabel: "价格审批", direction: "upstream", description: "价格审批通过 → 基于约定价格付款" }
  ]
};
const mrpFlow = {
  module: "mrp",
  moduleLabel: "MRP计划",
  description: "需求输入 → MRP运算 → 计划结果 → 审核 → 下达采购/生产",
  nodes: [
    { id: "mrp_input", label: "需求输入", subLabel: "计划员", icon: "draft" },
    { id: "mrp_calc", label: "MRP运算", subLabel: "系统", icon: "progress" },
    { id: "mrp_result", label: "计划结果", subLabel: "计划员", icon: "check" },
    { id: "mrp_approve", label: "审核", subLabel: "生产经理", icon: "approval" },
    { id: "mrp_release", label: "下达", subLabel: "采购/生产", icon: "done", route: "/purchase/requests" }
  ],
  crossModuleLinks: [
    { module: "bom", moduleLabel: "BOM管理", direction: "upstream", description: "BOM清单 → MRP计算物料需求量" },
    { module: "purchase-request", moduleLabel: "采购申请", direction: "downstream", description: "MRP运算 → 建议生成采购申请" },
    { module: "work-order", moduleLabel: "生产工单", direction: "downstream", description: "MRP运算 → 建议下达生产工单" }
  ]
};
const invoiceFlow = {
  module: "invoice",
  moduleLabel: "发票管理",
  description: "供应商开票 → 收票登记 → 审核 → 记账 → 付款",
  nodes: [
    { id: "iv_issued", label: "供应商开票", subLabel: "供应商", icon: "draft", route: "/vendor-portal/finance/invoices" },
    { id: "iv_received", label: "收票登记", subLabel: "财务", icon: "check" },
    { id: "iv_reviewed", label: "审核验证", subLabel: "财务主管", icon: "approval" },
    { id: "iv_booked", label: "记账", subLabel: "会计", icon: "finance" },
    { id: "iv_paid", label: "付款", subLabel: "出纳", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "inbound", moduleLabel: "入库单", direction: "upstream", description: "入库完成 → 供应商开票" },
    { module: "payment-plan", moduleLabel: "付款计划", direction: "downstream", description: "发票审核 → 纳入付款计划" }
  ]
};
const bomFlow = {
  module: "bom",
  moduleLabel: "BOM管理",
  description: "设计BOM → 审核 → 发布 → 变更 → 成本卷积",
  nodes: [
    { id: "bom_design", label: "设计BOM", subLabel: "研发工程师", icon: "draft" },
    { id: "bom_review", label: "审核", subLabel: "技术主管", icon: "approval" },
    { id: "bom_release", label: "发布", subLabel: "系统", icon: "check" },
    { id: "bom_change", label: "变更", subLabel: "研发", icon: "inspect" },
    { id: "bom_cost", label: "成本卷积", subLabel: "财务", icon: "finance", route: "/bom/cost-rollup" }
  ],
  crossModuleLinks: [
    { module: "mrp", moduleLabel: "MRP计划", direction: "downstream", description: "BOM发布 → MRP运算物料需求" },
    { module: "work-order", moduleLabel: "生产工单", direction: "downstream", description: "BOM物料 → 生产工单配料依据" },
    { module: "process-route", moduleLabel: "工艺流程", direction: "downstream", description: "BOM产品结构 → 关联加工工艺" }
  ]
};
const priceInquiryFlow = {
  module: "price-inquiry",
  moduleLabel: "询价单",
  description: "创建询价单 → 发布询价 → 供应商报价 → 生成比价单",
  nodes: [
    { id: "pi_draft", label: "创建询价单", subLabel: "采购员", icon: "draft" },
    { id: "pi_published", label: "已发布询价", subLabel: "采购员", icon: "publish" },
    { id: "pi_quoting", label: "供应商报价中", subLabel: "供应商", icon: "quote", route: "/vendor-portal/quotation" },
    { id: "pi_closed", label: "报价截止", subLabel: "系统", icon: "close" },
    { id: "pi_compared", label: "生成比价单", subLabel: "采购员", icon: "compare", route: "/price/comparisons" }
  ],
  crossModuleLinks: [
    { module: "purchase-request", moduleLabel: "采购申请", direction: "upstream", description: "采购申请物料 → 支持发起询价" },
    { module: "price-comparison", moduleLabel: "比价单", direction: "downstream", description: "供应商报价截止 → 自动生成比价单" }
  ]
};
const priceComparisonFlow = {
  module: "price-comparison",
  moduleLabel: "比价单",
  description: "自动汇总报价 → 对比分析 → 选定供应商 → 提交审批",
  nodes: [
    { id: "pc_generated", label: "自动生成比价", subLabel: "系统", icon: "draft" },
    { id: "pc_analyzing", label: "对比分析", subLabel: "采购员", icon: "compare" },
    { id: "pc_selected", label: "选定供应商", subLabel: "采购员", icon: "check" },
    { id: "pc_submitted", label: "提交审批", subLabel: "采购员", icon: "submit", route: "/price/approvals" },
    { id: "pc_approved", label: "审批通过", subLabel: "管理层", icon: "approved" },
    { id: "pc_updated", label: "更新价目表", subLabel: "系统", icon: "done", route: "/price/list" }
  ],
  crossModuleLinks: [
    { module: "price-inquiry", moduleLabel: "询价单", direction: "upstream", description: "询价截止 → 汇总各供应商报价" },
    { module: "price-approval", moduleLabel: "价格审批", direction: "downstream", description: "比价选定 → 提交价格审批" }
  ]
};
const priceApprovalFlow = {
  module: "price-approval",
  moduleLabel: "价格审批",
  description: "提交审批 → 采购经理审批 → 财务审批 → 通过/驳回",
  nodes: [
    { id: "pa_submitted", label: "提交审批", subLabel: "采购员", icon: "draft" },
    { id: "pa_purchasing", label: "采购经理审批", subLabel: "采购经理", icon: "approval" },
    { id: "pa_finance", label: "财务审批", subLabel: "财务主管", icon: "finance" },
    { id: "pa_approved", label: "审批通过", subLabel: "系统", icon: "done", route: "/price/list" },
    { id: "pa_rejected", label: "审批驳回", subLabel: "系统", icon: "fail" }
  ],
  crossModuleLinks: [
    { module: "price-comparison", moduleLabel: "比价单", direction: "upstream", description: "比价选定结果 → 提交价格审批" },
    { module: "payment-plan", moduleLabel: "付款计划", direction: "downstream", description: "价格审批通过 → 按约定价格付款" }
  ]
};
const salesOrderFlow = {
  module: "sales-order",
  moduleLabel: "销售订单",
  description: "创建销售订单 → 销售确认 → 生成采购需求 → 生产排产 → 发货 → 开票",
  nodes: [
    { id: "sso_draft", label: "新建订单", subLabel: "销售员", icon: "draft" },
    { id: "sso_confirmed", label: "销售确认", subLabel: "销售经理", icon: "check" },
    { id: "sso_planned", label: "生成采购需求", subLabel: "采购员", icon: "quote", route: "/purchase/requests" },
    { id: "sso_producing", label: "生产排产", subLabel: "生产主管", icon: "production", route: "/production/orders" },
    { id: "sso_shipping", label: "发货", subLabel: "物流", icon: "ship", route: "/sales/logistics" },
    { id: "sso_invoiced", label: "开票", subLabel: "财务", icon: "invoice", route: "/finance/invoices" },
    { id: "sso_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "purchase-request", moduleLabel: "采购申请", direction: "downstream", description: "销售需求 → 生成采购申请" },
    { module: "purchase-order", moduleLabel: "采购订单", direction: "downstream", description: "采购申请审批 → 采购订单" },
    { module: "work-order", moduleLabel: "生产工单", direction: "downstream", description: "物料到齐 → 生产排产" }
  ]
};
const logisticsFlow = {
  module: "logistics",
  moduleLabel: "物流发货",
  description: "创建发货单 → 备货 → 装车 → 运输中 → 签收",
  nodes: [
    { id: "lg_created", label: "创建发货单", subLabel: "物流", icon: "draft" },
    { id: "lg_preparing", label: "备货", subLabel: "仓库", icon: "progress" },
    { id: "lg_loaded", label: "装车", subLabel: "物流", icon: "inspect" },
    { id: "lg_transit", label: "运输中", subLabel: "物流", icon: "ship" },
    { id: "lg_signed", label: "签收", subLabel: "客户", icon: "arrive" },
    { id: "lg_completed", label: "完成", subLabel: "系统", icon: "done" }
  ],
  crossModuleLinks: [
    { module: "sales-order", moduleLabel: "销售订单", direction: "upstream", description: "销售订单生产完成 → 安排发货" },
    { module: "invoice", moduleLabel: "发票管理", direction: "downstream", description: "发货签收 → 生成发票" }
  ]
};
const materialApprovalFlow = {
  module: "material-approval",
  moduleLabel: "物料新增审批（外购件）",
  description: "发起申请（基本属性） → 采购审核（采购属性） → 批准生效",
  nodes: [
    { id: "ma_submit", label: "发起申请", subLabel: "研发/工艺", icon: "draft" },
    { id: "ma_purchase", label: "采购审核", subLabel: "采购员", icon: "approval" },
    { id: "ma_approve", label: "批准生效", subLabel: "管理员", icon: "done" }
  ]
};
const materialApprovalMakeFlow = {
  module: "material-approval-make",
  moduleLabel: "物料新增审批（自制件）",
  description: "发起申请（基本属性） → 工艺审核（工艺属性） → 批准生效",
  nodes: [
    { id: "mam_submit", label: "发起申请", subLabel: "研发/工艺", icon: "draft" },
    { id: "mam_process", label: "工艺审核", subLabel: "工艺工程师", icon: "engineering" },
    { id: "mam_approve", label: "批准生效", subLabel: "管理员", icon: "done" }
  ]
};
const flowDefinitions = {
  "material-approval": materialApprovalFlow,
  "material-approval-make": materialApprovalMakeFlow,
  "purchase-request": purchaseRequestFlow,
  "purchase-order": purchaseOrderFlow,
  "inspection-notice": inspectionNoticeFlow,
  "inbound": inboundFlow,
  "outbound": outboundFlow,
  "inspection-task": inspectionTaskFlow,
  "unqualified": unqualifiedFlow,
  "work-order": workOrderFlow,
  "vendor-registration": vendorRegistrationFlow,
  "vendor-order": vendorOrderFlow,
  "process-route": processRouteFlow,
  "payment-plan": paymentPlanFlow,
  "mrp": mrpFlow,
  "invoice": invoiceFlow,
  "bom": bomFlow,
  "price-inquiry": priceInquiryFlow,
  "price-comparison": priceComparisonFlow,
  "price-approval": priceApprovalFlow,
  "sales-order": salesOrderFlow,
  "logistics": logisticsFlow
};
function getFlowDefinition(module) {
  const cfg = buildApprovalFlowDefinition(module);
  if (cfg) return cfg;
  return flowDefinitions[module] || {
    module,
    moduleLabel: module,
    description: "通用流程",
    nodes: [
      { id: "start", label: "开始", subLabel: "", icon: "draft" },
      { id: "process", label: "处理中", subLabel: "", icon: "progress" },
      { id: "review", label: "审核", subLabel: "", icon: "approval" },
      { id: "end", label: "完成", subLabel: "", icon: "done" }
    ]
  };
}
const NODE_ICONS = {
  draft: "📝",
  submit: "📤",
  check: "✅",
  approval: "👤",
  finance: "💰",
  done: "🏁",
  fail: "❌",
  progress: "⏳",
  inspect: "🔍",
  judge: "⚖️",
  instore: "📦",
  ship: "🚚",
  arrive: "📍",
  pick: "📋",
  prep: "🔧",
  decide: "🎯",
  execute: "⚡"
};
const FlowTracker = ({
  module,
  currentStatus,
  documentNo,
  label = "流程追踪",
  asButton = false,
  statusMap = "auto"
}) => {
  const [open, setOpen] = reactExports.useState(false);
  const flowDef = reactExports.useMemo(() => getFlowDefinition(module), [module]);
  const nodeStates = reactExports.useMemo(() => {
    const nodes = flowDef.nodes;
    if (statusMap !== "auto") return statusMap;
    const result = {};
    const currentIdx = nodes.findIndex((n) => n.id === currentStatus);
    const foundIdx = currentIdx >= 0 ? currentIdx : 0;
    nodes.forEach((node, idx) => {
      if (idx < foundIdx) result[node.id] = "completed";
      else if (idx === foundIdx) result[node.id] = "current";
      else result[node.id] = "pending";
    });
    return result;
  }, [flowDef, currentStatus, statusMap]);
  const currentNodeIdx = reactExports.useMemo(() => {
    const idx = flowDef.nodes.findIndex((n) => n.id === currentStatus);
    return idx >= 0 ? idx : 0;
  }, [flowDef, currentStatus]);
  const currentNode = flowDef.nodes[currentNodeIdx];
  const completedCount = flowDef.nodes.filter((n) => nodeStates[n.id] === "completed").length;
  const progressPercent = flowDef.nodes.length > 1 ? Math.round(completedCount / (flowDef.nodes.length - 1) * 100) : 0;
  const nodeCount = flowDef.nodes.length;
  const svgWidth = Math.max(680, nodeCount * 140 + 40);
  const nodeRadius = 28;
  const startX = 60;
  const nodeSpacing = (svgWidth - startX * 2) / (nodeCount - 1 || 1);
  const centerY = 80;
  const getNodeColor = (status) => {
    switch (status) {
      case "completed":
        return { fill: "#10B981", stroke: "#059669", text: "#065F46" };
      case "current":
        return { fill: "#3B82F6", stroke: "#2563EB", text: "#1E40AF" };
      case "skipped":
        return { fill: "#F59E0B", stroke: "#D97706", text: "#92400E" };
      default:
        return { fill: "#E2E8F0", stroke: "#CBD5E1", text: "#94A3B8" };
    }
  };
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const triggerElement = asButton ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    Chip,
    {
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, {}),
      label,
      clickable: true,
      color: "primary",
      variant: "outlined",
      size: "small",
      onClick: handleOpen,
      sx: { fontWeight: 600 }
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    IconButton,
    {
      onClick: handleOpen,
      size: "small",
      sx: {
        color: "#3B82F6",
        bgcolor: "#EFF6FF",
        "&:hover": { bgcolor: "#DBEAFE" }
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { fontSize: "small" })
    }
  ) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    triggerElement,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Dialog,
      {
        open,
        onClose: handleClose,
        maxWidth: "md",
        fullWidth: true,
        PaperProps: {
          sx: {
            borderRadius: 4,
            overflow: "hidden"
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DialogTitle,
            {
              sx: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                px: 3,
                py: 2
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1.5 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { sx: { color: "#3B82F6" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", sx: { fontWeight: 700, color: "#1E293B", lineHeight: 1.3 }, children: [
                      flowDef.moduleLabel,
                      " 流程追踪"
                    ] }),
                    documentNo && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B" }, children: [
                      "单据号：",
                      documentNo
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: handleClose, size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { py: 3, px: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Box,
              {
                sx: {
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  mb: 3,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "#F0F9FF",
                  border: "1px solid #BAE6FD"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: "当前节点" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body1", sx: { fontWeight: 700, color: "#1E40AF" }, children: [
                      currentNode.label,
                      currentNode.subLabel && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { component: "span", variant: "caption", sx: { ml: 1, color: "#64748B", fontWeight: 400 }, children: [
                        "(",
                        currentNode.subLabel,
                        ")"
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1 } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: "整体进度" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Box,
                        {
                          sx: {
                            width: 120,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: "#E2E8F0",
                            overflow: "hidden"
                          },
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Box,
                            {
                              sx: {
                                width: `${progressPercent}%`,
                                height: "100%",
                                borderRadius: 3,
                                bgcolor: "#3B82F6",
                                transition: "width 0.5s ease"
                              }
                            }
                          )
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { fontWeight: 600, color: "#3B82F6" }, children: [
                        progressPercent,
                        "%"
                      ] })
                    ] })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Typography,
              {
                variant: "body2",
                sx: {
                  color: "#64748B",
                  mb: 2,
                  px: 1,
                  fontSize: "0.8rem",
                  lineHeight: 1.6
                },
                children: [
                  "📌 流程路径：",
                  flowDef.description
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Box,
              {
                sx: {
                  overflowX: "auto",
                  bgcolor: "#FAFBFC",
                  borderRadius: 3,
                  border: "1px solid #E2E8F0",
                  p: 1,
                  "&::-webkit-scrollbar": { height: 6 },
                  "&::-webkit-scrollbar-thumb": { borderRadius: 3, bgcolor: "#CBD5E1" }
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "svg",
                  {
                    width: svgWidth,
                    height: 160,
                    viewBox: `0 0 ${svgWidth} 160`,
                    style: { display: "block" },
                    children: [
                      flowDef.nodes.map((node, idx) => {
                        if (idx === nodeCount - 1) return null;
                        getNodeColor(nodeStates[node.id]);
                        getNodeColor(nodeStates[flowDef.nodes[idx + 1].id]);
                        const x1 = startX + idx * nodeSpacing + nodeRadius;
                        const x2 = startX + (idx + 1) * nodeSpacing - nodeRadius;
                        const y = centerY;
                        const lineColor = nodeStates[node.id] === "completed" && nodeStates[flowDef.nodes[idx + 1].id] === "completed" ? "#10B981" : nodeStates[node.id] === "completed" && nodeStates[flowDef.nodes[idx + 1].id] === "current" ? "#3B82F6" : "#E2E8F0";
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "line",
                            {
                              x1,
                              y1: y,
                              x2,
                              y2: y,
                              stroke: lineColor,
                              strokeWidth: 3,
                              strokeLinecap: "round"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "polygon",
                            {
                              points: `${x2 - 6},${y - 4} ${x2},${y} ${x2 - 6},${y + 4}`,
                              fill: lineColor
                            }
                          )
                        ] }, `line-${idx}`);
                      }),
                      flowDef.nodes.map((node, idx) => {
                        const state = nodeStates[node.id];
                        const colors = getNodeColor(state);
                        const cx = startX + idx * nodeSpacing;
                        const cy = centerY;
                        const icon = NODE_ICONS[node.icon] || "📌";
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
                          state === "current" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            "circle",
                            {
                              cx,
                              cy,
                              r: nodeRadius + 6,
                              fill: "none",
                              stroke: "#3B82F6",
                              strokeWidth: 2,
                              opacity: 0.3,
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "animate",
                                  {
                                    attributeName: "r",
                                    from: nodeRadius + 4,
                                    to: nodeRadius + 10,
                                    dur: "1.5s",
                                    repeatCount: "indefinite"
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "animate",
                                  {
                                    attributeName: "opacity",
                                    from: 0.4,
                                    to: 0.05,
                                    dur: "1.5s",
                                    repeatCount: "indefinite"
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx, cy, r: nodeRadius, fill: colors.fill, stroke: colors.stroke, strokeWidth: 2.5 }),
                          state === "current" && /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx, cy, r: nodeRadius, fill: "none", stroke: "#fff", strokeWidth: 1.5, strokeDasharray: "4 3" }),
                          state === "completed" && /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: cx, y: cy + 7, textAnchor: "middle", fontSize: 20, fill: "#fff", children: "✓" }),
                          state !== "completed" && /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: cx, y: cy + 7, textAnchor: "middle", fontSize: 18, children: icon }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "text",
                            {
                              x: cx,
                              y: cy + nodeRadius + 18,
                              textAnchor: "middle",
                              fontSize: 12,
                              fontWeight: state === "current" ? 700 : 500,
                              fill: state === "current" ? "#1E40AF" : state === "completed" ? "#065F46" : "#94A3B8",
                              children: node.label
                            }
                          ),
                          node.subLabel && /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "text",
                            {
                              x: cx,
                              y: cy + nodeRadius + 34,
                              textAnchor: "middle",
                              fontSize: 10,
                              fill: "#94A3B8",
                              children: node.subLabel
                            }
                          )
                        ] }, `node-${idx}`);
                      }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { transform: `translate(${startX}, 145)`, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 0, y: 0, width: 12, height: 12, rx: 2, fill: "#10B981" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: 16, y: 10, fontSize: 11, fill: "#475569", children: "已完成" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 80, y: 0, width: 12, height: 12, rx: 2, fill: "#3B82F6" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: 96, y: 10, fontSize: 11, fill: "#475569", children: "当前节点" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: 180, y: 0, width: 12, height: 12, rx: 2, fill: "#E2E8F0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: 196, y: 10, fontSize: 11, fill: "#94A3B8", children: "待处理" })
                      ] })
                    ]
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 3 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, color: "#1E293B", mb: 1.5 }, children: "流程节点详情" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: flowDef.nodes.map((node, idx) => {
                const state = nodeStates[node.id];
                const stateLabel = state === "completed" ? "已完成" : state === "current" ? "进行中" : state === "skipped" ? "已跳过" : "待处理";
                const stateColor = state === "completed" ? "success" : state === "current" ? "primary" : state === "skipped" ? "warning" : "default";
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Box,
                  {
                    sx: {
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: state === "current" ? "#EFF6FF" : state === "completed" ? "#F0FDF4" : "transparent",
                      border: state === "current" ? "1px solid #BFDBFE" : state === "completed" ? "1px solid #BBF7D0" : "1px solid transparent",
                      transition: "all 0.2s"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Box,
                        {
                          sx: {
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: state === "completed" ? "#10B981" : state === "current" ? "#3B82F6" : "#E2E8F0",
                            color: state === "completed" || state === "current" ? "#fff" : "#94A3B8",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            flexShrink: 0
                          },
                          children: state === "completed" ? "✓" : idx + 1
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#1E293B" }, children: node.label }),
                        node.subLabel && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: node.subLabel })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Chip,
                        {
                          label: stateLabel,
                          color: stateColor,
                          size: "small",
                          sx: {
                            fontWeight: 600,
                            fontSize: "0.7rem",
                            flexShrink: 0
                          }
                        }
                      )
                    ]
                  },
                  node.id
                );
              }) })
            ] }),
            flowDef.crossModuleLinks && flowDef.crossModuleLinks.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 3 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, color: "#1E293B", mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }, children: "跨模块流转关系" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: flowDef.crossModuleLinks.map((link, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Box,
                {
                  sx: {
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: link.direction === "upstream" ? "#FFF7ED" : "#F0FDF4",
                    border: link.direction === "upstream" ? "1px solid #FED7AA" : "1px solid #BBF7D0",
                    transition: "all 0.2s"
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Box,
                      {
                        sx: {
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: link.direction === "upstream" ? "#F97316" : "#10B981",
                          color: "#fff",
                          flexShrink: 0
                        },
                        children: link.direction === "upstream" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpward, { fontSize: "small" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownward, { fontSize: "small" })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Chip,
                      {
                        label: link.moduleLabel,
                        size: "small",
                        color: link.direction === "upstream" ? "warning" : "success",
                        variant: "outlined",
                        sx: { fontWeight: 600, flexShrink: 0, minWidth: 80 }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#475569", flex: 1, lineHeight: 1.5 }, children: link.description }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Chip,
                      {
                        label: link.direction === "upstream" ? "上游模块" : "下游模块",
                        size: "small",
                        sx: {
                          fontWeight: 600,
                          fontSize: "0.65rem",
                          flexShrink: 0,
                          bgcolor: link.direction === "upstream" ? "#FFF7ED" : "#F0FDF4",
                          color: link.direction === "upstream" ? "#C2410C" : "#166534"
                        }
                      }
                    )
                  ]
                },
                `cross-${idx}`
              )) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Alert,
                {
                  severity: "info",
                  sx: {
                    mt: 1.5,
                    borderRadius: 2,
                    bgcolor: "#EFF6FF",
                    "& .MuiAlert-icon": { color: "#3B82F6" }
                  },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { fontWeight: 500 }, children: [
                    "当前模块在整个供应链中的位置：",
                    flowDef.crossModuleLinks.filter((l) => l.direction === "upstream").map((l) => l.moduleLabel).join("、") || "无",
                    " → ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: flowDef.moduleLabel }),
                    " → ",
                    flowDef.crossModuleLinks.filter((l) => l.direction === "downstream").map((l) => l.moduleLabel).join("、") || "无"
                  ] })
                }
              )
            ] })
          ] })
        ]
      }
    )
  ] });
};
export {
  FlowTracker as F
};
