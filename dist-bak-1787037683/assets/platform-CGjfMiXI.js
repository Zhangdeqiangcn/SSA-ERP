const WEBHOOK_EVENT_LABELS = {
  "sales.order.created": "销售订单创建",
  "purchase.order.created": "采购订单创建",
  "quality.inspection.lot.created": "检验批创建",
  "production.workorder.created": "生产工单创建",
  "material.changed": "物料变更",
  "inbound_completed": "入库完成",
  "outbound_completed": "出库完成",
  "inspection_completed": "检验完成",
  "invoice_generated": "发票生成",
  "payment_completed": "付款完成",
  "voucher_posted": "凭证过账",
  "workorder_completed": "工单完成",
  "shipment_completed": "发货完成",
  "reconciliation_confirmed": "对账确认",
  "contract_expiring": "合同即将到期"
};
const WEBHOOK_AUTH_LABELS = {
  none: "无鉴权",
  bearer: "Bearer Token",
  basic: "Basic Auth"
};
const FIELD_MODE_LABELS = {
  visible: "显示",
  readonly: "只读",
  required: "必填",
  mask: "脱敏"
};
export {
  FIELD_MODE_LABELS as F,
  WEBHOOK_EVENT_LABELS as W,
  WEBHOOK_AUTH_LABELS as a
};
