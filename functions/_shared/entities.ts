// 通用实体资源注册表 + 行列映射（根治双通道：config 驱动，每业务域只配一张表 + 注册，无需新增 Functions）
import { json, uid } from './auth';

export interface EntityColumn {
  snake: string;
  camel: string;
}

export interface EntityResource {
  table: string;
  columns: EntityColumn[];
  /** RLS 可见性范围（缺省 'all' 共享主数据） */
  rlsScope?: 'all' | 'own' | 'dept';
}

// 所有关系表统一的主键 + 审计列（camel 映射）
const BASE_COLS: EntityColumn[] = [
  { snake: 'id', camel: 'id' },
  { snake: 'org_id', camel: 'org_id' },
  { snake: 'created_at', camel: 'createdAt' },
  { snake: 'updated_at', camel: 'updatedAt' },
  { snake: 'created_by', camel: 'createdBy' },
  { snake: 'updated_by', camel: 'updatedBy' },
];

// W0 参考实现：S&OP 计划。后续 W1/W2 业务域只需在此登记（table + 业务列 + rlsScope），
// 前端用 createEntityStore 配置同名 resource 即可接管，后端零新增代码。
export const ENTITY_RESOURCES: Record<string, EntityResource> = {
  sop: {
    table: 'sop_plans',
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
    columns: [
      { snake: 'work_order_id', camel: 'workOrderId' },
      { snake: 'work_order_no', camel: 'workOrderNo' },
      { snake: 'operation_name', camel: 'operationName' },
      { snake: 'work_center', camel: 'workCenter' },
      { snake: 'good_quantity', camel: 'goodQuantity' },
      { snake: 'scrap_quantity', camel: 'scrapQuantity' },
      { snake: 'reported_at', camel: 'reportedAt' },
    ],
  },
  // V2.80.0 W1：波次/RFID（2 表，lines 以 JSON 存）
  waveRfid: {
    table: 'wave_rfid',
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
    rlsScope: 'all',
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
      vals.push(body[c.camel]);
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

/** 写操作审计（失败不阻断主流程） */
export async function audit(
  DB: any,
  org_id: string,
  user: any,
  entity: string,
  action: string,
  summary: string,
) {
  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, entity, action, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(uid('al'), org_id, user.id, user.name || user.username, entity, action, summary, new Date().toISOString())
      .run();
  } catch {
    /* 审计失败不阻断主流程 */
  }
}
