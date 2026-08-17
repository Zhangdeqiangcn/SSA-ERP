// ============================================================
// P3-5 平台生态 / 低代码 类型定义
// 涵盖：低代码单据设计器、BPMN 工作流引擎、OpenAPI/Webhook 集成、
//       字段级权限、报表权限与订阅、多语言 i18n
// ============================================================

// ───────────── 低代码单据/流程设计器 (BOS/UAP 级) ─────────────
export type LowCodeFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

export interface LowCodeField {
  key: string;
  label: string;
  type: LowCodeFieldType;
  required?: boolean;
  options?: string[]; // 仅 select 类型使用
}

export interface LowCodeForm {
  id: string;
  name: string;
  description?: string;
  fields: LowCodeField[];
  createdAt: string;
  updatedAt: string;
}

export interface LowCodeRecord {
  id: string;
  formId: string;
  formName?: string;
  data: Record<string, unknown>;
  createdAt: string;
}

// ───────────── BPMN 工作流引擎 ─────────────
export type WorkflowNodeType = 'start' | 'task' | 'approval' | 'end';

export interface WorkflowNode {
  id: string;
  name: string;
  type: WorkflowNodeType;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  label?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  transitions: WorkflowTransition[];
  createdAt: string;
}

export type WorkflowInstanceStatus = 'running' | 'done' | 'rejected';

export interface WorkflowHistoryItem {
  nodeId: string;
  nodeName: string;
  action: 'start' | 'advance' | 'approve' | 'reject';
  at: string;
  operator?: string;
}

export interface WorkflowInstance {
  id: string;
  defId: string;
  defName?: string;
  currentNodeId: string;
  status: WorkflowInstanceStatus;
  history: WorkflowHistoryItem[];
  startedAt: string;
  initiator?: string;
}

// ───────────── OpenAPI / Webhook 集成 ─────────────
export type WebhookEvent =
  | 'sales.order.created'
  | 'purchase.order.created'
  | 'quality.inspection.lot.created'
  | 'production.workorder.created'
  | 'material.changed'
  // P1-24 扩展
  | 'inbound_completed'
  | 'outbound_completed'
  | 'inspection_completed'
  | 'invoice_generated'
  | 'payment_completed'
  | 'voucher_posted'
  | 'workorder_completed'
  | 'shipment_completed'
  | 'reconciliation_confirmed'
  | 'contract_expiring';

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'sales.order.created': '销售订单创建',
  'purchase.order.created': '采购订单创建',
  'quality.inspection.lot.created': '检验批创建',
  'production.workorder.created': '生产工单创建',
  'material.changed': '物料变更',
  'inbound_completed': '入库完成',
  'outbound_completed': '出库完成',
  'inspection_completed': '检验完成',
  'invoice_generated': '发票生成',
  'payment_completed': '付款完成',
  'voucher_posted': '凭证过账',
  'workorder_completed': '工单完成',
  'shipment_completed': '发货完成',
  'reconciliation_confirmed': '对账确认',
  'contract_expiring': '合同即将到期',
};

export type WebhookAuthType = 'none' | 'bearer' | 'basic';

export const WEBHOOK_AUTH_LABELS: Record<WebhookAuthType, string> = {
  none: '无鉴权',
  bearer: 'Bearer Token',
  basic: 'Basic Auth',
};

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
  createdAt: string;
  // C4：Webhook 鉴权与重试
  authType?: WebhookAuthType; // 缺省 'none'
  authToken?: string; // Bearer Token 值
  authUser?: string; // Basic Auth 用户名
  authPass?: string; // Basic Auth 密码
  retry?: number; // 失败重试次数（0 表示不重试），缺省 0
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  webhookName?: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  detail: string;
  at: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  module: string;
  description: string;
}

// ───────────── 字段级权限 ─────────────
// 字段权限模式：可见（仅显示控制）、只读（显示但不可编辑）、
// 必填（显示且强制填写）、脱敏（显示但掩码敏感内容）
export type FieldMode = 'visible' | 'readonly' | 'required' | 'mask';

export const FIELD_MODE_LABELS: Record<FieldMode, string> = {
  visible: '显示',
  readonly: '只读',
  required: '必填',
  mask: '脱敏',
};

export interface FieldPermission {
  field: string;
  label: string;
  visible: boolean;
  mode?: FieldMode; // 字段权限模式，缺省为 'visible'
  maskValue?: string; // 脱敏时的掩码字符（仅 mask 模式生效），缺省由 maskValue 工具决定
}

export type PlatformModule =
  | 'material'
  | 'vendor'
  | 'purchase'
  | 'sales'
  | 'warehouse'
  | 'quality'
  | 'production'
  | 'finance';

// ───────────── 报表权限与订阅 ─────────────
export type ReportRole = 'admin' | 'manager' | 'user' | 'finance' | 'warehouse';

export interface ReportPermission {
  reportId: string;
  reportName: string;
  allowedRoles: ReportRole[];
}

export type SubscriptionFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSubscription {
  id: string;
  reportId: string;
  reportName: string;
  frequency: SubscriptionFrequency;
  recipients: string; // 逗号分隔邮箱（模拟）
  channel: 'email' | 'webhook';
  enabled: boolean;
  createdAt: string;
}

// ───────────── 多语言 i18n ─────────────
export type Locale = 'zh-CN' | 'en-US';
