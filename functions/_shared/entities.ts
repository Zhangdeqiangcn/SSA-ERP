// 通用实体资源注册表 + 行列映射（根治双通道：config 驱动，每业务域只配一张表 + 注册，无需新增 Functions）
import { json } from './auth';

export interface EntityColumn {
  snake: string;
  camel: string;
}

export interface EntityResource {
  table: string;
  columns: EntityColumn[];
}

// 所有关系表统一的主键 + 审计列（camel 映射）
// V3.71.0：补 created_by_name / updated_by_name（冗余「创建人/修改人 姓名」快照，
//   随记录自带，供界面直接显示"谁建/谁改"，不必再反查 users/audit_logs）。
//   写库值由端点侧 presentCols 动态探测「表有该列才写」（见 [resource].ts /
//   parentChild.ts / dataAccess.ts），本处只负责「读回」透传给前端 camel。
//   BASE_COLS 仅参与 rowToCamel（读，容错）与 allColumns（读）——**不参与 INSERT**
//   （INSERT 走 pickSnake 的 res.columns + 动态 presentCols 审计列），加列零副作用。
const BASE_COLS: EntityColumn[] = [
  { snake: 'id', camel: 'id' },
  { snake: 'org_id', camel: 'org_id' },
  { snake: 'created_at', camel: 'createdAt' },
  { snake: 'updated_at', camel: 'updatedAt' },
  { snake: 'created_by', camel: 'createdBy' },
  { snake: 'updated_by', camel: 'updatedBy' },
  { snake: 'created_by_name', camel: 'createdByName' },
  { snake: 'updated_by_name', camel: 'updatedByName' },
];

// W0 参考实现：S&OP 计划。后续 W1/W2 业务域只需在此登记（table + 业务列），
// 前端用 createEntityStore 配置同名 resource 即可接管，后端零新增代码。
//
// 注意（V3.3.0 · 评测 L-04）：行级可见性**不在这里配置**。此前的 `rlsScope` 字段
//   声明了却从未被任何代码读取（通用实体端点走的是 `rlsCondition(user, def.table)`），
//   属于「两套口径」的死配置——它显示的 'all' 与真实策略无关联，容易让人误以为已生效。
//   现已删除该字段，行级策略的**唯一权威来源**是 `_shared/rls.ts` 的 `RLS_SCOPE`；
//   新增资源时必须同时在那张表里登记对应表名，否则该表会被默认拒绝（`1=0`）。
export const ENTITY_RESOURCES: Record<string, EntityResource> = {
  // ════════ V3.7.0 C1 财务域切片（7 个）════════════════════════════
  // 这些切片此前全在 app_state 的 JSON 大对象里（financeStore 的 partialize），
  // 而**凭证部分早已迁到 D1** —— 形成「一半在表、一半在 Blob」的状态。
  // 后果：发票与凭证分属两种存储，外键加不上、级联删除做不了，
  // 换台电脑打开时凭证还在、发票没了，且没有任何报错。
  // 它们都是**平表结构**（无嵌套），正是本通用路由的设计场景，故只登记不新增端点。
  // 注意：登记后必须在 _shared/rls.ts 的 RLS_SCOPE 同步登记，否则会被默认拒绝。
  // ★ V3.47.0 第3批 3-05：发票明细（迁移 0083）——行级三单匹配的数量来源。
  //   order_item_id 是行级比对的核心锚点（同一物料在一个订单里可能有多行，
  //   只按物料编码匹配会把多行并成一行）。
  finInvoiceItem: {
    table: 'fin_invoice_items',
    columns: [
      { snake: 'invoice_id', camel: 'invoiceId' },
      { snake: 'order_item_id', camel: 'orderItemId' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'quantity', camel: 'quantity' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'unit_price', camel: 'unitPrice' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'tax_rate', camel: 'taxRate' },
      { snake: 'tax_amount', camel: 'taxAmount' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'unit_conversion_rate', camel: 'unitConversionRate' },
      { snake: 'tolerance_rate', camel: 'toleranceRate' },
      { snake: 'match_status', camel: 'matchStatus' },
      { snake: 'match_note', camel: 'matchNote' },
    ],
  },
  finInvoice: {
    table: 'fin_invoices',
    columns: [
      { snake: 'invoice_no', camel: 'invoiceNo' },
      { snake: 'invoice_type', camel: 'invoiceType' },
      { snake: 'status', camel: 'status' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'vendor_tax_no', camel: 'vendorTaxNo' },
      { snake: 'purchase_order_no', camel: 'purchaseOrderNo' },
      { snake: 'invoice_date', camel: 'invoiceDate' },
      { snake: 'received_date', camel: 'receivedDate' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'tax_rate', camel: 'taxRate' },
      { snake: 'tax_amount', camel: 'taxAmount' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'exchange_rate', camel: 'exchangeRate' },
      { snake: 'verified_by', camel: 'verifiedBy' },
      { snake: 'verified_at', camel: 'verifiedAt' },
      { snake: 'note', camel: 'note' },
      { snake: 'voucher_generated', camel: 'voucherGenerated' },
    ],
  },
  finPaymentPlan: {
    table: 'fin_payment_plans',
    columns: [
      { snake: 'plan_no', camel: 'planNo' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'purchase_order_no', camel: 'purchaseOrderNo' },
      { snake: 'invoice_no', camel: 'invoiceNo' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'paid_amount', camel: 'paidAmount' },
      { snake: 'status', camel: 'status' },
      { snake: 'due_date', camel: 'dueDate' },
      { snake: 'paid_date', camel: 'paidDate' },
      { snake: 'payment_method', camel: 'paymentMethod' },
      { snake: 'bank_account', camel: 'bankAccount' },
      { snake: 'note', camel: 'note' },
      { snake: 'voucher_generated', camel: 'voucherGenerated' },
      { snake: 'advance_amount', camel: 'advanceAmount' },
      { snake: 'advance_occupied', camel: 'advanceOccupied' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'exchange_rate', camel: 'exchangeRate' },
    ],
  },
  // 字段契约以 `src/types/finance.ts` 的 AccountEntry 为准（V3.8.0 修正）。
  // 0053 初版把列写成 entry_date/summary/account_code/debit/credit（按会计常识推断），
  // 与前端 date/description/debitAccount/creditAccount/amount 一个都对不上 ——
  // 通用路由的 pickSnake 只挑已登记列，未登记的键静默丢弃，等于每次写分录都丢光业务字段。
  finAccountEntry: {
    table: 'fin_account_entries',
    columns: [
      { snake: 'entry_no', camel: 'entryNo' },
      { snake: 'date', camel: 'date' },
      { snake: 'period', camel: 'period' },
      { snake: 'description', camel: 'description' },
      { snake: 'debit_account', camel: 'debitAccount' },
      { snake: 'credit_account', camel: 'creditAccount' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'voucher_no', camel: 'voucherNo' },
      { snake: 'cost_center_id', camel: 'costCenterId' },
      { snake: 'cost_center_name', camel: 'costCenterName' },
      { snake: 'project_id', camel: 'projectId' },
      { snake: 'project_name', camel: 'projectName' },
      { snake: 'aux_note', camel: 'auxNote' },
    ],
  },
  finTaxRecord: {
    table: 'fin_tax_records',
    columns: [
      { snake: 'record_no', camel: 'recordNo' },
      { snake: 'period', camel: 'period' },
      { snake: 'period_type', camel: 'periodType' },
      { snake: 'category', camel: 'category' },
      { snake: 'taxable_amount', camel: 'taxableAmount' },
      { snake: 'tax_rate', camel: 'taxRate' },
      { snake: 'tax_amount', camel: 'taxAmount' },
      { snake: 'deducted_amount', camel: 'deductedAmount' },
      { snake: 'actual_payable', camel: 'actualPayable' },
      { snake: 'paid_amount', camel: 'paidAmount' },
      { snake: 'payment_date', camel: 'paymentDate' },
      { snake: 'status', camel: 'status' },
      { snake: 'remarks', camel: 'remarks' },
    ],
  },
  // 注意：costItems 是嵌套数组，不在此登记 —— 由专用端点 /api/fin-project-accounts
  // 拆到子表 fin_project_cost_items（与 BOM children / 付款计划 installments 同款）。
  finProjectAccount: {
    table: 'fin_project_accounts',
    columns: [
      { snake: 'account_no', camel: 'accountNo' },
      { snake: 'project_id', camel: 'projectId' },
      { snake: 'project_no', camel: 'projectNo' },
      { snake: 'project_name', camel: 'projectName' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'period', camel: 'period' },
      { snake: 'total_budget', camel: 'totalBudget' },
      { snake: 'total_actual', camel: 'totalActual' },
      { snake: 'total_variance', camel: 'totalVariance' },
      { snake: 'revenue', camel: 'revenue' },
      { snake: 'gross_profit', camel: 'grossProfit' },
      { snake: 'gross_margin', camel: 'grossMargin' },
      { snake: 'status', camel: 'status' },
      { snake: 'prepared_by', camel: 'preparedBy' },
      { snake: 'approved_by', camel: 'approvedBy' },
      { snake: 'remarks', camel: 'remarks' },
    ],
  },
  finProjectCostItem: {
    table: 'fin_project_cost_items',
    columns: [
      { snake: 'account_id', camel: 'accountId' },
      { snake: 'seq', camel: 'seq' },
      { snake: 'category', camel: 'category' },
      { snake: 'description', camel: 'description' },
      { snake: 'budget_amount', camel: 'budgetAmount' },
      { snake: 'actual_amount', camel: 'actualAmount' },
      { snake: 'variance', camel: 'variance' },
      { snake: 'variance_percent', camel: 'variancePercent' },
    ],
  },
  finChartAccount: {
    table: 'fin_chart_of_accounts',
    columns: [
      { snake: 'code', camel: 'code' },
      { snake: 'name', camel: 'name' },
      { snake: 'type', camel: 'type' },
      { snake: 'parent_code', camel: 'parentCode' },
      { snake: 'is_leaf', camel: 'isLeaf' },
      { snake: 'balance', camel: 'balance' },
      { snake: 'normal_side', camel: 'normalSide' },
      { snake: 'statement', camel: 'statement' },
      { snake: 'section', camel: 'section' },
    ],
  },
  // V3.96.0：税码主数据（迁移 0114）。组织级共享主数据，供采购/财务在审批供应商时
  //   从下拉选择税码。与 finChartAccount 同范式，通用实体路由接管，零新增后端函数。
  finTaxCode: {
    table: 'fin_tax_codes',
    columns: [
      { snake: 'code', camel: 'code' },
      { snake: 'name', camel: 'name' },
      { snake: 'tax_rate', camel: 'taxRate' },
      { snake: 'deductible', camel: 'deductible' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V3.100.0：采购员定向邀请供应商注册（迁移 0115）。采购员生成专属邀请链接，
  //   供应商凭链接注册后自动归属到该采购员。owner_id = 发起采购员（RLS 'own'），
  //   通用实体路由接管 CRUD，零新增后端函数。
  vendorInvitation: {
    table: 'vendor_invitations',
    columns: [
      { snake: 'code', camel: 'code' },
      { snake: 'buyer_id', camel: 'buyerId' },
      { snake: 'buyer_name', camel: 'buyerName' },
      { snake: 'sales_org', camel: 'salesOrg' },
      { snake: 'status', camel: 'status' },
      { snake: 'expires_at', camel: 'expiresAt' },
      { snake: 'used_at', camel: 'usedAt' },
      { snake: 'owner_id', camel: 'ownerId' },
    ],
  },
  sop: {
    table: 'sop_plans',
    columns: [
      { snake: 'plan_no', camel: 'planNo' },
      { snake: 'period', camel: 'period' },
      { snake: 'demand_forecast', camel: 'demandForecast' },
      { snake: 'supply_plan', camel: 'supplyPlan' },
      { snake: 'balance_qty', camel: 'balanceQty' },
      { snake: 'status', camel: 'status' },
      { snake: 'owner', camel: 'owner' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V2.80.0 W1：资金管理（双资源）
  cashAccount: {
    table: 'cash_accounts',
    columns: [
      { snake: 'account_no', camel: 'accountNo' },
      { snake: 'account_name', camel: 'accountName' },
      { snake: 'bank', camel: 'bank' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'opening_balance', camel: 'openingBalance' },
      { snake: 'current_balance', camel: 'currentBalance' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  cashFlow: {
    table: 'cash_flows',
    columns: [
      { snake: 'account_id', camel: 'accountId' },
      { snake: 'direction', camel: 'direction' },
      { snake: 'category', camel: 'category' },
      { snake: 'counterparty', camel: 'counterparty' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'flow_date', camel: 'flowDate' },
      { snake: 'related_doc', camel: 'relatedDoc' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V2.80.0 W1：三方销售（代销结算）
  tripartySale: {
    table: 'triparty_sales',
    columns: [
      { snake: 'doc_no', camel: 'docNo' },
      { snake: 'party_code', camel: 'partyCode' },
      { snake: 'party_name', camel: 'partyName' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'warehouse', camel: 'warehouse' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'spec', camel: 'spec' },
      { snake: 'quantity', camel: 'quantity' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'settle_price', camel: 'settlePrice' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'settle_status', camel: 'settleStatus' },
      { snake: 'order_date', camel: 'orderDate' },
      { snake: 'settle_date', camel: 'settleDate' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V2.80.0 W1：重复制造（双资源，倒冲明细以 JSON 存 backflush_items）
  repMfgLine: {
    table: 'rep_mfg_lines',
    columns: [
      { snake: 'line_no', camel: 'lineNo' },
      { snake: 'name', camel: 'name' },
      { snake: 'work_center_id', camel: 'workCenterId' },
      { snake: 'work_center_name', camel: 'workCenterName' },
      { snake: 'status', camel: 'status' },
      { snake: 'daily_capacity', camel: 'dailyCapacity' },
      { snake: 'note', camel: 'note' },
    ],
  },
  repMfgPeriod: {
    table: 'rep_mfg_periods',
    columns: [
      { snake: 'period_no', camel: 'periodNo' },
      { snake: 'line_id', camel: 'lineId' },
      { snake: 'line_no', camel: 'lineNo' },
      { snake: 'line_name', camel: 'lineName' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'start_date', camel: 'startDate' },
      { snake: 'end_date', camel: 'endDate' },
      { snake: 'planned_qty', camel: 'plannedQty' },
      { snake: 'produced_qty', camel: 'producedQty' },
      { snake: 'scrap_qty', camel: 'scrapQty' },
      { snake: 'status', camel: 'status' },
      { snake: 'note', camel: 'note' },
      { snake: 'backflush_items', camel: 'backflushItems' },
    ],
  },
  // V2.80.0 W1：COPA 获利分析
  copa: {
    table: 'copa_analysis',
    columns: [
      { snake: 'dimension', camel: 'dimension' },
      { snake: 'key', camel: 'key' },
      { snake: 'label', camel: 'label' },
      { snake: 'period', camel: 'period' },
      { snake: 'revenue', camel: 'revenue' },
      { snake: 'cogs', camel: 'cogs' },
    ],
  },
  // V2.80.0 W1：MES 集成（4 子表）
  mesConnection: {
    table: 'mes_connections',
    columns: [
      { snake: 'name', camel: 'name' },
      { snake: 'endpoint', camel: 'endpoint' },
      { snake: 'protocol', camel: 'protocol' },
      { snake: 'status', camel: 'status' },
      { snake: 'api_key', camel: 'apiKey' },
      { snake: 'last_sync_at', camel: 'lastSyncAt' },
      { snake: 'note', camel: 'note' },
    ],
  },
  mesDevice: {
    table: 'mes_devices',
    columns: [
      { snake: 'device_code', camel: 'deviceCode' },
      { snake: 'device_name', camel: 'deviceName' },
      { snake: 'work_center', camel: 'workCenter' },
      { snake: 'oee', camel: 'oee' },
      { snake: 'reported_at', camel: 'reportedAt' },
    ],
  },
  mesWip: {
    table: 'mes_wips',
    columns: [
      { snake: 'work_order_id', camel: 'workOrderId' },
      { snake: 'work_order_no', camel: 'workOrderNo' },
      { snake: 'product_code', camel: 'productCode' },
      { snake: 'product_name', camel: 'productName' },
      { snake: 'station', camel: 'station' },
    ],
  },
  mesOperationReport: {
    table: 'mes_operation_reports',
    columns: [
      { snake: 'work_order_id', camel: 'workOrderId' },
      { snake: 'work_order_no', camel: 'workOrderNo' },
      { snake: 'operation_name', camel: 'operationName' },
      { snake: 'work_center', camel: 'workCenter' },
      { snake: 'good_quantity', camel: 'goodQuantity' },
      { snake: 'scrap_quantity', camel: 'scrapQuantity' },
      { snake: 'reported_at', camel: 'reportedAt' },
      // ★ V3.46.0 第2批③ 补齐（迁移 0082）：原先只登记 6 列，而报工真实需要
      //   operation_id（工序标识，改名即与历史脱钩）/ operator（报工人，责任追溯）
      //   / start_time·end_time（单件工时与在制时长）/ labor_hours（**人工成本直接
      //   依赖它**，缺则人工成本恒 0）/ station / note。缺列 ⇒ 前端写不进去也读不回来。
      { snake: 'operation_id', camel: 'operationId' },
      { snake: 'operator', camel: 'operator' },
      { snake: 'start_time', camel: 'startTime' },
      { snake: 'end_time', camel: 'endTime' },
      { snake: 'labor_hours', camel: 'laborHours' },
      { snake: 'station', camel: 'station' },
      { snake: 'note', camel: 'note' },
    ],
  },
  // ★ V3.46.0 第2批③：工作中心主数据（迁移 0082）
  //   此前只在前端 store 里，产能工时是排产与标准工时的输入，换设备即口径不一。
  workCenter: {
    table: 'work_centers',
    columns: [
      { snake: 'code', camel: 'code' },
      { snake: 'name', camel: 'name' },
      { snake: 'description', camel: 'description' },
      { snake: 'capacity_hours', camel: 'capacityHours' },
      { snake: 'shift_count', camel: 'shiftCount' },
      { snake: 'hourly_rate', camel: 'hourlyRate' },
      { snake: 'active', camel: 'active' },
    ],
  },
  // ★ V3.46.0 第2批③：成本费率（迁移 0082）
  //   按 effective_date 存多行 —— 同一批产品跨月完工时，人工费率调整不该
  //   把历史成本一起改掉（此前单值存在浏览器，调价后历史全变、无法复算）。
  productionRate: {
    table: 'production_rates',
    columns: [
      { snake: 'rate_type', camel: 'rateType' },
      { snake: 'effective_date', camel: 'effectiveDate' },
      { snake: 'rate', camel: 'rate' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V2.80.0 W1：波次/RFID（2 表，lines 以 JSON 存）
  waveRfid: {
    table: 'wave_rfid',
    columns: [
      { snake: 'wave_no', camel: 'waveNo' },
      { snake: 'name', camel: 'name' },
      { snake: 'status', camel: 'status' },
      { snake: 'strategy', camel: 'strategy' },
      { snake: 'warehouse_id', camel: 'warehouseId' },
      { snake: 'warehouse_name', camel: 'warehouseName' },
      { snake: 'order_count', camel: 'orderCount' },
      { snake: 'line_count', camel: 'lineCount' },
      { snake: 'planned_date', camel: 'plannedDate' },
      { snake: 'released_at', camel: 'releasedAt' },
      { snake: 'note', camel: 'note' },
      { snake: 'lines', camel: 'lines' },
    ],
  },
  waveRfidTag: {
    table: 'wave_rfid_tags',
    columns: [
      { snake: 'tag_id', camel: 'tagId' },
      { snake: 'epc', camel: 'epc' },
      { snake: 'op_type', camel: 'opType' },
      { snake: 'biz_no', camel: 'bizNo' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'location', camel: 'location' },
      { snake: 'operator', camel: 'operator' },
      { snake: 'scanned_at', camel: 'scannedAt' },
      { snake: 'result', camel: 'result' },
      { snake: 'message', camel: 'message' },
    ],
  },
  // V2.80.0 W1：BI 集成
  biIntegration: {
    table: 'bi_integrations',
    columns: [
      { snake: 'conn_no', camel: 'connNo' },
      { snake: 'conn_name', camel: 'connName' },
      { snake: 'platform', camel: 'platform' },
      { snake: 'endpoint', camel: 'endpoint' },
      { snake: 'dataset', camel: 'dataset' },
      { snake: 'status', camel: 'status' },
      { snake: 'last_sync_at', camel: 'lastSyncAt' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V2.80.0 W1：ESG 报告
  esgReport: {
    table: 'esg_reports',
    columns: [
      { snake: 'report_no', camel: 'reportNo' },
      { snake: 'period', camel: 'period' },
      { snake: 'category', camel: 'category' },
      { snake: 'indicator', camel: 'indicator' },
      { snake: 'value', camel: 'value' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'target', camel: 'target' },
      { snake: 'status', camel: 'status' },
      { snake: 'remark', camel: 'remark' },
    ],
  },
  // V2.80.0 W2：移动端即时消息（轮询拉取，D1 多人共享）
  mobileMsg: {
    table: 'messages',
    columns: [
      { snake: 'sender_id', camel: 'senderId' },
      { snake: 'sender_name', camel: 'senderName' },
      { snake: 'recipient_id', camel: 'recipientId' },
      { snake: 'recipient_role', camel: 'recipientRole' },
      { snake: 'title', camel: 'title' },
      { snake: 'body', camel: 'body' },
      { snake: 'type', camel: 'type' },
      { snake: 'ref_module', camel: 'refModule' },
      { snake: 'ref_id', camel: 'refId' },
      { snake: 'read', camel: 'read' },
      { snake: 'read_at', camel: 'readAt' },
    ],
  },
  // V2.81.0 盘点任务（根治 Blob 双通道，落真实 D1 check_tasks 表；嵌套 items 以 JSON 文本存储）
  checkTask: {
    table: 'check_tasks',
    columns: [
      { snake: 'task_no', camel: 'taskNo' },
      { snake: 'warehouse_id', camel: 'warehouseId' },
      { snake: 'warehouse_name', camel: 'warehouseName' },
      { snake: 'type', camel: 'type' },
      { snake: 'status', camel: 'status' },
      { snake: 'start_date', camel: 'startDate' },
      { snake: 'end_date', camel: 'endDate' },
      { snake: 'operator', camel: 'operator' },
      { snake: 'items', camel: 'items' },
      { snake: 'difference_amount', camel: 'differenceAmount' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'blind_mode', camel: 'blindMode' },
    ],
  },
  inventoryAlert: {
    table: 'inventory_alerts',
    columns: [
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'type', camel: 'type' },
      { snake: 'current_quantity', camel: 'currentQuantity' },
      { snake: 'threshold', camel: 'threshold' },
      { snake: 'severity', camel: 'severity' },
      { snake: 'created_at', camel: 'createdAt' },
    ],
  },
  finishedGoodsInbound: {
    table: 'finished_goods_inbounds',
    columns: [
      { snake: 'inbound_no', camel: 'inboundNo' },
      { snake: 'work_order_id', camel: 'workOrderId' },
      { snake: 'work_order_no', camel: 'workOrderNo' },
      { snake: 'product_id', camel: 'productId' },
      { snake: 'product_code', camel: 'productCode' },
      { snake: 'product_name', camel: 'productName' },
      { snake: 'specification', camel: 'specification' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'planned_qty', camel: 'plannedQty' },
      { snake: 'actual_qty', camel: 'actualQty' },
      { snake: 'qualified_qty', camel: 'qualifiedQty' },
      { snake: 'rejected_qty', camel: 'rejectedQty' },
      { snake: 'batch_no', camel: 'batchNo' },
      { snake: 'warehouse_id', camel: 'warehouseId' },
      { snake: 'warehouse_name', camel: 'warehouseName' },
      { snake: 'location_id', camel: 'locationId' },
      { snake: 'location_name', camel: 'locationName' },
      { snake: 'inspection_task_id', camel: 'inspectionTaskId' },
      { snake: 'status', camel: 'status' },
      { snake: 'operator', camel: 'operator' },
      { snake: 'inbound_date', camel: 'inboundDate' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'created_at', camel: 'createdAt' },
      { snake: 'updated_at', camel: 'updatedAt' },
      { snake: 'created_by', camel: 'createdBy' },
      { snake: 'updated_by', camel: 'updatedBy' },
    ],
  },
  // V2.84.0 C9 物料替代料组 + 优先级（根治 BOM/生产灵活可配硬缺口，源码零实现 → 闭合）
  // 复用通用实体路由 /api/entities/materialSubstitute（会话鉴权 + org 隔离 + RLS + 审计），零新增后端函数。
  materialSubstitute: {
    table: 'material_substitutes',
    columns: [
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'substitute_code', camel: 'substituteCode' },
      { snake: 'substitute_name', camel: 'substituteName' },
      { snake: 'priority', camel: 'priority' },
      { snake: 'substitute_type', camel: 'substituteType' },
      { snake: 'conversion_ratio', camel: 'conversionRatio' },
      { snake: 'effective_from', camel: 'effectiveFrom' },
      { snake: 'effective_to', camel: 'effectiveTo' },
      { snake: 'reason', camel: 'reason' },
      { snake: 'remarks', camel: 'remarks' },
    ],
  },
  // ════════ V3.94.0 物料分类（落库，开启分类自配置自定义字段）════════
  // 原仅存在于前端内存 mock（materialStore.categories），无 D1 表，导致「分类上挂采购员/
  // 供应商类别 → 驱动采购申请自动化」链路缺地基。现迁 D1，复用通用实体路由，零新增后端函数。
  // 登记后必须同步在 _shared/rls.ts 的 RLS_SCOPE 登记 material_categories: 'all'，
  // 否则会被默认拒绝（1=0）。responsible_persons / attributes 为 JSON 文本列，
  // pickSnake 自动序列化对象/数组，前端读取后自行 JSON.parse。
  materialCategory: {
    table: 'material_categories',
    columns: [
      { snake: 'parent_id', camel: 'parentId' },
      { snake: 'code', camel: 'code' },
      { snake: 'name', camel: 'name' },
      { snake: 'sequence_length', camel: 'sequenceLength' },
      { snake: 'responsible_persons', camel: 'responsiblePersons' },
      { snake: 'default_vendors', camel: 'defaultVendors' },
      { snake: 'attributes', camel: 'attributes' },
      { snake: 'sort_order', camel: 'sortOrder' },
      { snake: 'level', camel: 'level' },
      { snake: 'description', camel: 'description' },
    ],
  },
  // ════════ V3.13.0 C2 合并报表/多账簿：配置类平表（3 个，零新增端点）════════
  // 均为组织级共享配置，复用通用实体路由（与财务域 7 个切片同款）。
  // 注意：写入后必须在 _shared/rls.ts 的 RLS_SCOPE 同步登记（已在 V3.13.0 登记为 'all'），
  // 否则会被默认拒绝（1=0）。memberOrgIds 以 JSON 文本落库，前端读取后自行 JSON.parse。
  ledgerBook: {
    table: 'ledger_books',
    columns: [
      { snake: 'ledger_code', camel: 'ledgerCode' },
      { snake: 'name', camel: 'name' },
      { snake: 'type', camel: 'type' },
      { snake: 'base_currency', camel: 'baseCurrency' },
      { snake: 'description', camel: 'description' },
    ],
  },
  consolidationGroup: {
    table: 'consolidation_groups',
    columns: [
      { snake: 'code', camel: 'code' },
      { snake: 'name', camel: 'name' },
      { snake: 'description', camel: 'description' },
      { snake: 'member_org_ids', camel: 'memberOrgIds' },
      { snake: 'base_currency', camel: 'baseCurrency' },
    ],
  },
  eliminationRule: {
    table: 'elimination_rules',
    columns: [
      { snake: 'code', camel: 'code' },
      { snake: 'name', camel: 'name' },
      { snake: 'description', camel: 'description' },
      { snake: 'receivable_account', camel: 'receivableAccount' },
      { snake: 'payable_account', camel: 'payableAccount' },
    ],
  },
  // ════════ V3.12.0 C1 生产域：MRP 建议（平表，零新增端点）════════
  // `MRPRecommendation` 的 13 个字段**全是标量**，没有嵌套数组 ——
  // 正是本通用路由的设计场景，故只登记不新增端点（与 V3.7.0 财务域 7 个切片同款）。
  //
  // ★ 同一 store 的另一个切片 processRoutes **不能**走这里：它带
  //   `operations[]`（且每行还带 `skills[]`），pickSnake 会把整个数组
  //   **静默丢弃且返回 201** → 「路线列表都在、工序一条没有」。
  //   那条走 `_shared/parentChild.ts`（/api/process-routes）。
  //   **同一个 store 的两个切片走两条不同通道 —— 判据是「有没有嵌套」，
  //   不是「属不属于同一个域」。**
  //
  // 列名严格按 `src/types/production.ts` 的 MRPRecommendation 反推为 snake_case
  // （0053 的教训：按业务常识推断列名 → 与前端契约全对不上）。
  mrpRecommendation: {
    table: 'mrp_recommendations',
    columns: [
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'current_stock', camel: 'currentStock' },
      { snake: 'safety_stock', camel: 'safetyStock' },
      { snake: 'required_quantity', camel: 'requiredQuantity' },
      { snake: 'on_order_quantity', camel: 'onOrderQuantity' },
      { snake: 'suggested_quantity', camel: 'suggestedQuantity' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'suggested_date', camel: 'suggestedDate' },
      { snake: 'reason', camel: 'reason' },
      { snake: 'type', camel: 'type' },
      { snake: 'priority', camel: 'priority' },
    ],
  },
  // ════════ V3.63.0 质量域切片（4 个，根治数据孤岛 P0）════════════════
  // 此前质量核心单据全在 app_state Blob（qualityStore persist），无法被采购/生产/财务按行引用。
  // 迁为真实关系表：检验任务 / 检验标准 / 不合格品 / PDCA。
  // 嵌套字段（缺陷项/检验项/附件/行动项）封进 extra_json（框架自动 JSON 序列化，回传为字符串需前端解析）。
  inspectionTask: {
    table: 'inspection_tasks',
    columns: [
      { snake: 'task_no', camel: 'taskNo' },
      { snake: 'type', camel: 'type' },
      { snake: 'status', camel: 'status' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'batch_no', camel: 'batchNo' },
      { snake: 'quantity', camel: 'quantity' },
      { snake: 'sample_quantity', camel: 'sampleQuantity' },
      { snake: 'aql', camel: 'aql' },
      { snake: 'inspection_level', camel: 'inspectionLevel' },
      { snake: 'aql_code', camel: 'aqlCode' },
      { snake: 'aql_ac', camel: 'aqlAc' },
      { snake: 'aql_re', camel: 'aqlRe' },
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'purchase_order_no', camel: 'purchaseOrderNo' },
      { snake: 'work_order_no', camel: 'workOrderNo' },
      { snake: 'project_no', camel: 'projectNo' },
      { snake: 'project_name', camel: 'projectName' },
      { snake: 'inspection_standard_id', camel: 'inspectionStandardId' },
      { snake: 'inspection_standard_name', camel: 'inspectionStandardName' },
      { snake: 'assigned_to', camel: 'assignedTo' },
      { snake: 'planned_date', camel: 'plannedDate' },
      { snake: 'completed_date', camel: 'completedDate' },
      { snake: 'passed_quantity', camel: 'passedQuantity' },
      { snake: 'failed_quantity', camel: 'failedQuantity' },
      { snake: 'conclusion', camel: 'conclusion' },
      { snake: 'source', camel: 'source' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  inspectionStandard: {
    table: 'inspection_standards',
    columns: [
      { snake: 'standard_no', camel: 'standardNo' },
      { snake: 'name', camel: 'name' },
      { snake: 'material_category', camel: 'materialCategory' },
      { snake: 'version', camel: 'version' },
      { snake: 'status', camel: 'status' },
      { snake: 'description', camel: 'description' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  unqualifiedItem: {
    table: 'unqualified_items',
    columns: [
      { snake: 'item_no', camel: 'itemNo' },
      { snake: 'inspection_task_id', camel: 'inspectionTaskId' },
      { snake: 'inspection_task_no', camel: 'inspectionTaskNo' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'batch_no', camel: 'batchNo' },
      { snake: 'defect_quantity', camel: 'defectQuantity' },
      { snake: 'defect_description', camel: 'defectDescription' },
      { snake: 'disposition', camel: 'disposition' },
      { snake: 'disposition_status', camel: 'dispositionStatus' },
      { snake: 'actual_disposition', camel: 'actualDisposition' },
      { snake: 'linked_outbound_no', camel: 'linkedOutboundNo' },
      { snake: 'linked_inbound_no', camel: 'linkedInboundNo' },
      { snake: 'source', camel: 'source' },
      { snake: 'portal_issue_id', camel: 'portalIssueId' },
      { snake: 'vendor_reported', camel: 'vendorReported' },
      // V3.66.0 P0-3/P0-4：质量追责链补供应商归属（生产投诉/客户退货推门户时锚定 vendor）
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'status', camel: 'status' },
      { snake: 'responsible_person', camel: 'responsiblePerson' },
      { snake: 'due_date', camel: 'dueDate' },
      { snake: 'completed_date', camel: 'completedDate' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  pdca: {
    table: 'pdca_records',
    columns: [
      { snake: 'pdca_no', camel: 'pdcaNo' },
      { snake: 'title', camel: 'title' },
      { snake: 'status', camel: 'status' },
      { snake: 'source', camel: 'source' },
      { snake: 'related_item_id', camel: 'relatedItemId' },
      { snake: 'priority', camel: 'priority' },
      { snake: 'problem_description', camel: 'problemDescription' },
      { snake: 'root_cause', camel: 'rootCause' },
      { snake: 'target_date', camel: 'targetDate' },
      { snake: 'check_result', camel: 'checkResult' },
      { snake: 'check_date', camel: 'checkDate' },
      { snake: 'corrective_action', camel: 'correctiveAction' },
      { snake: 'preventive_action', camel: 'preventiveAction' },
      { snake: 'verification_result', camel: 'verificationResult' },
      { snake: 'closed_date', camel: 'closedDate' },
      { snake: 'owner', camel: 'owner' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // ════════ V3.63.0 供应商绩效（根治 P1-VP-1 零后端孤岛）════════════════
  // 此前 vendorPerformanceStore 用 persist(backendStorage) 把整个绩效数组存成 app_state Blob，
  // 采购评标/质量反馈无法回写评级。迁为真实关系表 vendor_performance，全扁平字段无需 extra_json。
  vendorPerformance: {
    table: 'vendor_performance',
    columns: [
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'vendor_code', camel: 'vendorCode' },
      { snake: 'period', camel: 'period' },
      { snake: 'quality_score', camel: 'qualityScore' },
      { snake: 'delivery_score', camel: 'deliveryScore' },
      { snake: 'price_score', camel: 'priceScore' },
      { snake: 'service_score', camel: 'serviceScore' },
      { snake: 'total_score', camel: 'totalScore' },
      { snake: 'ranking', camel: 'ranking' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'evaluated_by', camel: 'evaluatedBy' },
      { snake: 'evaluated_at', camel: 'evaluatedAt' },
    ],
  },
  // ════════ V3.63.0 销售退货（根治 P1-VP-2 无独立后端单据）════════════════
  // 此前退货单据嵌在 salesAdvancedStore 的 app_state Blob 里，无独立表。现迁 sales_returns。
  // 行项目 items 封 extra_json（框架自动 JSON 序列化，前端解析）。
  salesReturn: {
    table: 'sales_returns',
    columns: [
      { snake: 'return_no', camel: 'returnNo' },
      { snake: 'sales_order_no', camel: 'salesOrderNo' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'status', camel: 'status' },
      { snake: 'return_date', camel: 'returnDate' },
      { snake: 'reason', camel: 'reason' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'credit_note_no', camel: 'creditNoteNo' },
      // V3.64.0 P0-3：退货串联锚点（指向触发的采购退货单号，可为 NULL）
      { snake: 'linked_purchase_return_no', camel: 'linkedPurchaseReturnNo' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // ════════ V3.63.0 采购退货（同上，根治 P1-VP-2）════════════════
  purchaseReturn: {
    table: 'purchase_returns',
    columns: [
      { snake: 'return_no', camel: 'returnNo' },
      { snake: 'purchase_order_no', camel: 'purchaseOrderNo' },
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'status', camel: 'status' },
      { snake: 'return_date', camel: 'returnDate' },
      { snake: 'reason', camel: 'reason' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'voucher_no', camel: 'voucherNo' },
      // V3.64.0 P0-3：退货串联锚点（指回销售退货来源单号，可为 NULL）
      { snake: 'linked_sales_return_no', camel: 'linkedSalesReturnNo' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // ════════ V3.65.0 立项④ 供应商框架协议（协议价基准，根治 P1-4 付款核验无基准）════════════════
  // 头表：框架协议（releases 释放记录封 extra_json）；明细表：物料行（ceiling_price = 协议价上限，付款核验基准）。
  // V3.66.0 页面级联动审计 P0 数据地基：检验批台账关系化（此前 Blob 化，与服务端拦截不同源）
  inspectionLot: {
    table: 'inspection_lots',
    columns: [
      { snake: 'lot_no', camel: 'lotNo' },
      { snake: 'source_type', camel: 'sourceType' },
      { snake: 'source_no', camel: 'sourceNo' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'batch_no', camel: 'batchNo' },
      { snake: 'quantity', camel: 'quantity' },
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'inspection_task_no', camel: 'inspectionTaskNo' },
      { snake: 'status', camel: 'status' },
      { snake: 'created_from', camel: 'createdFrom' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P0-2：编号规则 D1 化（多终端/重新部署不再漂移撞号）
  numberingRule: {
    table: 'numbering_rules',
    columns: [
      { snake: 'doc_type', camel: 'docType' },
      { snake: 'prefix', camel: 'prefix' },
      { snake: 'separator', camel: 'separator' },
      { snake: 'date_pattern', camel: 'datePattern' },
      { snake: 'seq_length', camel: 'seqLength' },
      { snake: 'current_seq', camel: 'currentSeq' },
      { snake: 'label', camel: 'label' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P0-5：批次台账独立表（批次级成本/库位对账）
  batchRecord: {
    table: 'batch_records',
    columns: [
      { snake: 'batch_no', camel: 'batchNo' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'warehouse_id', camel: 'warehouseId' },
      { snake: 'warehouse_name', camel: 'warehouseName' },
      { snake: 'location_id', camel: 'locationId' },
      { snake: 'quantity', camel: 'quantity' },
      { snake: 'cost', camel: 'cost' },
      { snake: 'production_date', camel: 'productionDate' },
      { snake: 'expiry_date', camel: 'expiryDate' },
      { snake: 'inbound_no', camel: 'inboundNo' },
      { snake: 'inbound_date', camel: 'inboundDate' },
      { snake: 'supplier_name', camel: 'supplierName' },
      { snake: 'status', camel: 'status' },
      { snake: 'locked', camel: 'locked' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P0-2：订单模板 D1 化（items 明细封 extra_json）
  orderTemplate: {
    table: 'order_templates',
    columns: [
      { snake: 'name', camel: 'name' },
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'payment_terms', camel: 'paymentTerms' },
      { snake: 'trade_terms', camel: 'tradeTerms' },
      { snake: 'delivery_terms', camel: 'deliveryTerms' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'expected_delivery_date', camel: 'expectedDeliveryDate' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P0-2：数据字典 D1 化（每值一行：category + item_value）
  dataDict: {
    table: 'data_dict',
    columns: [
      { snake: 'category', camel: 'category' },
      { snake: 'item_value', camel: 'itemValue' },
      { snake: 'sort_order', camel: 'sortOrder' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P1-1：排程锁 D1 化（多用户排产互不可见 → 共享真源；Record 一行一锁）
  schedulingLock: {
    table: 'scheduling_locks',
    columns: [
      { snake: 'lock_key', camel: 'lockKey' },
      { snake: 'locked', camel: 'locked' },
      { snake: 'anchor_date', camel: 'anchorDate' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P1-2：返利规则/结算 D1 化（财务返利计提可按行引用）
  rebateRule: {
    table: 'rebate_rules',
    columns: [
      { snake: 'name', camel: 'name' },
      { snake: 'customer_id', camel: 'customerId' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'type', camel: 'type' },
      { snake: 'rate', camel: 'rate' },
      { snake: 'min_amount', camel: 'minAmount' },
      { snake: 'valid_from', camel: 'validFrom' },
      { snake: 'valid_to', camel: 'validTo' },
      { snake: 'enabled', camel: 'enabled' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  rebateSettlement: {
    table: 'rebate_settlements',
    columns: [
      { snake: 'rule_id', camel: 'ruleId' },
      { snake: 'rule_name', camel: 'ruleName' },
      { snake: 'customer_id', camel: 'customerId' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'period', camel: 'period' },
      { snake: 'base_amount', camel: 'baseAmount' },
      { snake: 'rebate_amount', camel: 'rebateAmount' },
      { snake: 'status', camel: 'status' },
      { snake: 'settled_at', camel: 'settledAt' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.66.0 页面级联动审计 P1-2：销售合同 D1 化（履约跟踪/回款计划；明细封 extra_json）
  salesContract: {
    table: 'sales_contracts',
    columns: [
      { snake: 'contract_no', camel: 'contractNo' },
      { snake: 'name', camel: 'name' },
      { snake: 'customer_id', camel: 'customerId' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'customer_code', camel: 'customerCode' },
      { snake: 'sales_person', camel: 'salesPerson' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'start_date', camel: 'startDate' },
      { snake: 'end_date', camel: 'endDate' },
      { snake: 'status', camel: 'status' },
      { snake: 'terms', camel: 'terms' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  frameworkAgreement: {
    table: 'framework_agreements',
    columns: [
      { snake: 'agreement_no', camel: 'agreementNo' },
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'status', camel: 'status' },
      { snake: 'start_date', camel: 'startDate' },
      { snake: 'end_date', camel: 'endDate' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'total_ceiling', camel: 'totalCeiling' },
      { snake: 'released_amount', camel: 'releasedAmount' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  frameworkAgreementItem: {
    table: 'framework_agreement_items',
    columns: [
      { snake: 'agreement_id', camel: 'agreementId' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'ceiling_price', camel: 'ceilingPrice' },
      { snake: 'committed_qty', camel: 'committedQty' },
    ],
  },
  // ════════ V3.76.0 B 类第 4 批：应收应付台账 + Blob 残余迁 D1（迁移 0100）═══════════
  // 原 4 处整状态 Blob（arapStore/consignmentStore/purchaseInfoRecordStore/salesAdvancedStore）
  // 迁关系表；报价明细 items 封 extra_json（与 salesContract 范式一致，头部金额列支持列表直查）。
  receivable: {
    table: 'fin_receivables',
    columns: [
      { snake: 'customer_id', camel: 'customerId' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'invoice_no', camel: 'invoiceNo' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'paid_amount', camel: 'paidAmount' },
      { snake: 'balance', camel: 'balance' },
      { snake: 'due_date', camel: 'dueDate' },
      { snake: 'aging_bucket', camel: 'agingBucket' },
      { snake: 'status', camel: 'status' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  payable: {
    table: 'fin_payables',
    columns: [
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'invoice_no', camel: 'invoiceNo' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'paid_amount', camel: 'paidAmount' },
      { snake: 'balance', camel: 'balance' },
      { snake: 'due_date', camel: 'dueDate' },
      { snake: 'aging_bucket', camel: 'agingBucket' },
      { snake: 'status', camel: 'status' },
      { snake: 'payment_date', camel: 'paymentDate' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  consignment: {
    table: 'consignment_stocks',
    columns: [
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'vendor_code', camel: 'vendorCode' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'specification', camel: 'specification' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'agreed_unit_price', camel: 'agreedUnitPrice' },
      { snake: 'consigned_qty', camel: 'consignedQty' },
      { snake: 'consumed_qty', camel: 'consumedQty' },
      { snake: 'balance_qty', camel: 'balanceQty' },
      { snake: 'warehouse_id', camel: 'warehouseId' },
      { snake: 'warehouse_name', camel: 'warehouseName' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  purchaseInfoRecord: {
    table: 'purchase_info_records',
    columns: [
      { snake: 'vendor_id', camel: 'vendorId' },
      { snake: 'vendor_name', camel: 'vendorName' },
      { snake: 'vendor_code', camel: 'vendorCode' },
      { snake: 'material_id', camel: 'materialId' },
      { snake: 'material_code', camel: 'materialCode' },
      { snake: 'material_name', camel: 'materialName' },
      { snake: 'specification', camel: 'specification' },
      { snake: 'unit', camel: 'unit' },
      { snake: 'unit_price', camel: 'unitPrice' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'valid_from', camel: 'validFrom' },
      { snake: 'valid_to', camel: 'validTo' },
      { snake: 'min_qty', camel: 'minQty' },
      { snake: 'lead_time', camel: 'leadTime' },
      { snake: 'purchasing_group', camel: 'purchasingGroup' },
      { snake: 'status', camel: 'status' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  salesQuotation: {
    table: 'sales_quotations',
    columns: [
      { snake: 'quotation_no', camel: 'quotationNo' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'customer_code', camel: 'customerCode' },
      { snake: 'customer_id', camel: 'customerId' },
      { snake: 'status', camel: 'status' },
      { snake: 'valid_until', camel: 'validUntil' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'tax_rate', camel: 'taxRate' },
      { snake: 'tax_amount', camel: 'taxAmount' },
      { snake: 'grand_total', camel: 'grandTotal' },
      { snake: 'sales_person', camel: 'salesPerson' },
      { snake: 'remarks', camel: 'remarks' },
      { snake: 'source_prospect_id', camel: 'sourceProspectId' },
      { snake: 'converted_order_id', camel: 'convertedOrderId' },
      { snake: 'converted_order_no', camel: 'convertedOrderNo' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // V3.112.0：销售发票（克隆 sales_quotations 范式；items 封 extra_json，头部金额列直查）
  salesInvoice: {
    table: 'sales_invoices',
    columns: [
      { snake: 'invoice_no', camel: 'invoiceNo' },
      { snake: 'invoice_type', camel: 'invoiceType' },
      { snake: 'sales_order_no', camel: 'salesOrderNo' },
      { snake: 'customer_name', camel: 'customerName' },
      { snake: 'status', camel: 'status' },
      { snake: 'invoice_date', camel: 'invoiceDate' },
      { snake: 'currency', camel: 'currency' },
      { snake: 'amount', camel: 'amount' },
      { snake: 'tax_amount', camel: 'taxAmount' },
      { snake: 'total_amount', camel: 'totalAmount' },
      { snake: 'linked_return_no', camel: 'linkedReturnNo' },
      { snake: 'voucher_no', camel: 'voucherNo' },
      { snake: 'extra_json', camel: 'extraJson' },
    ],
  },
  // ════════ V3.77.0 全模块联动审计整改·数据地基（迁移 0101）════════
  // 将审计发现的本地孤岛 store 迁为 D1 关系表（统一 payload 列范式）。
  // 整对象 JSON 落 payload 列；前端 store 保留原方法名，内部改走 entityRepo。
  // 嵌套/复杂对象一律 JSON 序列化（pickSnake 对 object/array 自动 JSON.stringify）。
  ecn: {
    table: 'ecns',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  productionVersion: {
    table: 'production_versions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  productionEcn: {
    table: 'production_ecns',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  priceInquiry: {
    table: 'price_inquiries',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  priceQuotation: {
    table: 'price_quotations',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  priceComparison: {
    table: 'price_comparisons',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  priceApproval: {
    table: 'price_approvals',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  priceList: {
    table: 'price_lists',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  coaReport: {
    table: 'coa_reports',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  vendorPortal: {
    table: 'vendor_portals',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  salesPrice: {
    table: 'sales_prices',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  materialExtension: {
    table: 'material_extensions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  qualityExtension: {
    table: 'quality_extensions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  materialApproval: {
    table: 'material_approvals',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  financeExtension: {
    table: 'finance_extensions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  systemSetting: {
    table: 'system_settings',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  reportPermission: {
    table: 'report_permissions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  dataPermission: {
    table: 'data_permissions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  // P0-2：设置侧用户/组织目录（与鉴权 users/orgs 表解耦，避免触碰登录）
  systemUser: {
    table: 'system_users',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  systemOrg: {
    table: 'system_orgs',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  // ════════ V3.80.0 强协作型本地 blob store 迁 D1（迁移 0102）════════
  // 6 个 store 此前整块 blob（backendStorage /api/state/:key）多人改不同记录触发 409/413，
  // 现迁行级 D1（统一 payload 列范式；多切片同表用 __kind 标记在 payload 内分流）。
  // 整对象 JSON 落 payload；嵌套/数组字段框架自动 JSON 序列化。
  flowShared: {
    table: 'flow_shared',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  equipmentLedger: {
    table: 'equipment_ledger',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  invoiceVerification: {
    table: 'invoice_verification',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  purchaseCondition: {
    table: 'purchase_conditions',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  sourceList: {
    table: 'source_lists',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  slowMovingDisposal: {
    table: 'slow_moving_disposals',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  // ════════ V3.81.0 B 类共享配置/留痕型 blob store 迁 D1（迁移 0103）════════
  // 承接 V3.80；config 型整块单行 payload、逐行/双切片型 __kind 分流，整对象 JSON 落 payload。
  customFields: {
    table: 'custom_fields',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  alertRules: {
    table: 'alert_rules',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  fmeaItem: {
    table: 'fmea_items',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  integrationShared: {
    table: 'integration_shared',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  lowCodeShared: {
    table: 'low_code_shared',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  workflowShared: {
    table: 'workflow_shared',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  // ════════ V3.95.0 自动化设置中心（物料类别分工驱动的表单自动流转，迁移 0113）════════
  // 范式对齐 customFields/systemSettings：整对象 JSON 落 payload 单列，复用通用实体路由。
  // 写后须同步在 _shared/rls.ts 登记 'all'，否则默认 1=0 查空。
  automationConfig: {
    table: 'automation_config',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  automationLog: {
    table: 'automation_logs',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
  analyticsShared: {
    table: 'analytics_shared',
    columns: [{ snake: 'payload', camel: 'payload' }],
  },
};

export function allColumns(res: EntityResource): EntityColumn[] {
  return [...BASE_COLS, ...res.columns];
}

/** 行 → camelCase 对象（前端类型直接消费） */
export function rowToCamel(row: any, res: EntityResource): any {
  const out: any = {};
  for (const c of allColumns(res)) {
    if (row[c.snake] !== undefined && row[c.snake] !== null) out[c.camel] = row[c.snake];
  }
  return out;
}

/** 仅提取已注册业务列（client 以 camel 传参 → snake 落库） */
export function pickSnake(body: any, res: EntityResource): { cols: string[]; vals: any[] } {
  const cols: string[] = [];
  const vals: any[] = [];
  for (const c of res.columns) {
    if (body[c.camel] !== undefined) {
      cols.push(c.snake);
      const v = body[c.camel];
      // DB-006：D1 的 bind 不接受对象/数组，原样入参会 500/脏数据；
      // 对 object/array 类型（JSON 列）序列化后再入 vals。
      if (v !== null && typeof v === 'object' && !(v instanceof Uint8Array) && !(v instanceof ArrayBuffer)) {
        vals.push(JSON.stringify(v));
      } else {
        vals.push(v);
      }
    }
  }
  return { cols, vals };
}

export function badResource(): Response {
  return json({ error: '不支持的资源，可选: ' + Object.keys(ENTITY_RESOURCES).join(', ') }, 404);
}

/** 探测表实际存在的审计列（各关系表 NOT NULL 审计列不一致，避免 500） */
export async function presentCols(DB: any, table: string): Promise<Set<string>> {
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((info.results || []).map((r: any) => r.name));
}

/**
 * V3.71.0：给「刚写入的一行」补「创建人/修改人 姓名」快照（fail-safe）。
 *
 * 背景：集中 3 通道（entities/[resource] / parentChild / dataAccess）在建单时内联写
 *   created_by_name/updated_by_name；但各专用端点（物料 / 凭证 / 出入库 / 工单 …）
 *   的 INSERT 拼列写法各不相同（对象字面量 / cols 数组 / 固定字符串），逐一改造风险面
 *   大。本助手统一兜底：写入行后按 presentCols 探测「表有该列才 UPDATE 姓名」，列不
 *   存在的老库/新表自动跳过，绝不因缺列 500（本地绿生产红零风险）。失败静默降级，
 *   与 writeAudit 同级——审计姓名补充不阻断主流程。
 */
export async function stampByName(
  DB: any,
  table: string,
  id: string,
  user: { id: string; name?: string; username?: string },
): Promise<void> {
  try {
    if (!id) return;
    const present = await presentCols(DB, table);
    if (!present.has('created_by_name') && !present.has('updated_by_name')) return;
    const name = user.name || user.username || user.id;
    const sets: string[] = [];
    const vals: any[] = [];
    if (present.has('created_by_name')) { sets.push('created_by_name = ?'); vals.push(name); }
    if (present.has('updated_by_name')) { sets.push('updated_by_name = ?'); vals.push(name); }
    if (sets.length) {
      await DB.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
    }
  } catch {
    // 审计姓名补充失败不阻断主流程（行已写入 created_by/updated_by 的 user.id 不受影响）
  }
}

/**
 * 写操作审计（失败不阻断主流程）。
 *
 * V3.3.0（评测 L-05）：实现已统一收敛到 `_shared/auditLog.ts` —— 审计失败不再
 *   静默丢弃，而是走「结构化日志 → 降级表留痕 → 永不抛出」三层降级通道。
 *   本处保留同名再导出，仅为不打断既有 4 个调用方（采购单 / 销售单 / 凭证 / 工单）。
 */
export { audit } from './auditLog';
