// 财务域父子表配置（C1 · V3.8.0）
//
// 两张配置驱动 /api/fin-payment-plans 与 /api/fin-project-accounts 四个端点，
// 实际 CRUD 逻辑在 `_shared/parentChild.ts`（通用父子表助手）。
//
// 列名来源：`src/types/finance.ts` 的 PaymentPlan / PaymentInstallment /
// ProjectAccount / ProjectCostItem，逐一转成 snake_case，**不按会计常识推断**
// （0053 就是这么错的，见 migrations/0054_finance_domain_fix.sql 文件头）。
import type { ParentChildConfig } from './parentChild';

/** 付款计划：父 fin_payment_plans + 子 fin_payment_plan_installments */
export const PAYMENT_PLAN_PC: ParentChildConfig = {
  parentTable: 'fin_payment_plans',
  module: 'finance', // P0-1：finance_manager / accountant 在 BUILTIN_ROLE_OPS 已有 finance 全权限
  children: [
    {
      childTable: 'fin_payment_plan_installments',
      childFkCol: 'plan_id',
      childField: 'installments',
      childCols: [
        ['seq', 'seq'],
        ['type', 'type'],
        ['label', 'label'],
        ['amount', 'amount'],
        ['due_date', 'dueDate'],
        ['status', 'status'],
        ['paid_date', 'paidDate'],
        ['note', 'note'],
      ],
      childOrder: 'seq ASC',
    },
  ],
  parentCols: [
    ['plan_no', 'planNo'],
    ['vendor_name', 'vendorName'],
    ['vendor_id', 'vendorId'],
    ['purchase_order_no', 'purchaseOrderNo'],
    ['invoice_no', 'invoiceNo'],
    ['total_amount', 'totalAmount'],
    ['paid_amount', 'paidAmount'],
    ['status', 'status'],
    ['due_date', 'dueDate'],
    ['paid_date', 'paidDate'],
    ['payment_method', 'paymentMethod'],
    ['bank_account', 'bankAccount'],
    ['note', 'note'],
    ['voucher_generated', 'voucherGenerated'],
    ['advance_amount', 'advanceAmount'],
    ['advance_occupied', 'advanceOccupied'],
    ['currency', 'currency'],
    ['exchange_rate', 'exchangeRate'],
  ],
  label: '付款计划',
  noSnake: 'plan_no',
  noCamel: 'planNo',
};

/**
 * 销售收款单：父 fin_sales_receipts（V3.61.0 · P0-2 · 应收冲减侧）
 * ------------------------------------------------------------------
 * 为什么需要：V3.60.0 补齐了销售开票确认应收（借1122/贷6001），但**收款冲减侧从未存在**
 *   —— 全库无销售收款端点，1002 只出现在采购付款 → 应收 1122 只增不减，
 *   应收账龄/周转率/DSO 永久失真，且与采购侧不对称（付款冲应付、收款不冲应收）。
 *
 * 单表（无子表），走 parentChild 框架复用 list/create/update + RLS + 权限 + 审计。
 */
export const SALES_RECEIPT_PC: ParentChildConfig = {
  parentTable: 'fin_sales_receipts',
  module: 'finance',
  children: [],
  parentCols: [
    ['receipt_no', 'receiptNo'],
    ['receipt_date', 'receiptDate'],
    ['customer_id', 'customerId'],
    ['customer_name', 'customerName'],
    ['sales_order_no', 'salesOrderNo'],
    ['amount', 'amount'],
    ['currency', 'currency'],
    ['exchange_rate', 'exchangeRate'],
    ['payment_method', 'paymentMethod'],
    ['bank_account', 'bankAccount'],
    ['status', 'status'],
    ['voucher_generated', 'voucherGenerated'],
    ['note', 'note'],
  ],
  label: '销售收款单',
  noSnake: 'receipt_no',
  noCamel: 'receiptNo',
};

/** 发票：父 fin_invoices + 子 fin_invoice_items（V3.56.0 · G3 数据对齐） */
// ── 为什么必须走专用端点而非通用实体路由 ──────────────────────────
// 通用路由（/api/entities/finInvoice）只能写平表（头表），发票明细 items
// 会被静默丢弃且返回 201 成功 → 三单匹配的行级比对读不到发票明细，
// 行级闸门永远走 NO_INVOICE_ITEMS 跳过，等于形同虚设。
// 专用端点走 parentChild 框架：头+明细在 db.batch 原子写入，与付款计划/项目核算同范式。
export const INVOICE_PC: ParentChildConfig = {
  parentTable: 'fin_invoices',
  module: 'finance', // P0-1：finance_manager / accountant 在 BUILTIN_ROLE_OPS 已有 finance 全权限
  children: [
    {
      childTable: 'fin_invoice_items',
      childFkCol: 'invoice_id',
      childField: 'items',
      childCols: [
        ['order_item_id', 'orderItemId'],
        ['material_id', 'materialId'],
        ['material_code', 'materialCode'],
        ['material_name', 'materialName'],
        ['quantity', 'quantity'],
        ['unit', 'unit'],
        ['unit_price', 'unitPrice'],
        ['amount', 'amount'],
        ['tax_rate', 'taxRate'],
        ['tax_amount', 'taxAmount'],
        ['total_amount', 'totalAmount'],
        ['unit_conversion_rate', 'unitConversionRate'],
        ['tolerance_rate', 'toleranceRate'],
        ['match_status', 'matchStatus'],
        ['match_note', 'matchNote'],
      ],
      childOrder: 'rowid',
    },
  ],
  parentCols: [
    ['invoice_no', 'invoiceNo'],
    ['invoice_type', 'invoiceType'],
    ['status', 'status'],
    ['vendor_name', 'vendorName'],
    ['vendor_tax_no', 'vendorTaxNo'],
    ['purchase_order_no', 'purchaseOrderNo'],
    ['invoice_date', 'invoiceDate'],
    ['received_date', 'receivedDate'],
    ['amount', 'amount'],
    ['tax_rate', 'taxRate'],
    ['tax_amount', 'taxAmount'],
    ['total_amount', 'totalAmount'],
    ['currency', 'currency'],
    ['exchange_rate', 'exchangeRate'],
    ['verified_by', 'verifiedBy'],
    ['verified_at', 'verifiedAt'],
    ['note', 'note'],
    ['voucher_generated', 'voucherGenerated'],
  ],
  label: '发票',
  noSnake: 'invoice_no',
  noCamel: 'invoiceNo',
};

/** 项目核算：父 fin_project_accounts + 子 fin_project_cost_items */
export const PROJECT_ACCOUNT_PC: ParentChildConfig = {
  parentTable: 'fin_project_accounts',
  module: 'finance', // P0-1：项目核算属财务域
  children: [
    {
      childTable: 'fin_project_cost_items',
      childFkCol: 'account_id',
      childField: 'costItems',
      childCols: [
        ['seq', 'seq'],
        ['category', 'category'],
        ['description', 'description'],
        ['budget_amount', 'budgetAmount'],
        ['actual_amount', 'actualAmount'],
        ['variance', 'variance'],
        ['variance_percent', 'variancePercent'],
      ],
      childOrder: 'seq ASC',
    },
  ],
  parentCols: [
    ['account_no', 'accountNo'],
    ['project_id', 'projectId'],
    ['project_no', 'projectNo'],
    ['project_name', 'projectName'],
    ['customer_name', 'customerName'],
    ['period', 'period'],
    ['total_budget', 'totalBudget'],
    ['total_actual', 'totalActual'],
    ['total_variance', 'totalVariance'],
    ['revenue', 'revenue'],
    ['gross_profit', 'grossProfit'],
    ['gross_margin', 'grossMargin'],
    ['status', 'status'],
    ['prepared_by', 'preparedBy'],
    ['approved_by', 'approvedBy'],
    ['remarks', 'remarks'],
  ],
  label: '项目核算',
  noSnake: 'account_no',
  noCamel: 'accountNo',
};
