// 电商渠道连接器抽象层 —— 共享类型（前后端通用）
// 参考 OpenLinker 的 Port/Adapter 模式：每个平台一个 Adapter，归一化到内部统一订单模型。

export type ChannelPlatform =
  | 'douyin'
  | 'pinduoduo'
  | 'taobao'
  | 'jd'
  | 'kuaishou'
  | 'manual';

export type OrderStatus =
  | 'pending' // 待付款
  | 'paid' // 已付款待发货
  | 'shipped' // 已发货
  | 'completed' // 已完成
  | 'refunded' // 已退款
  | 'cancelled'; // 已取消

export interface NormalizedOrderLine {
  lineNo: string;
  platformSku: string; // 平台 SKU
  sku: string; // 内部 SKU（映射后；未映射时等于 platformSku）
  name: string;
  quantity: number;
  unitPrice: number; // 未税单价
  taxRate: number; // 税率（0~1）
  taxAmount: number; // 税额
  amount: number; // 未税金额 = unitPrice * quantity
  totalAmount: number; // 价税合计 = amount + taxAmount
  discountAmount: number;
}

export interface NormalizedOrder {
  id: string;
  platform: ChannelPlatform;
  platformOrderId: string;
  orderStatus: OrderStatus;
  buyerName: string;
  buyerPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  province?: string;
  city?: string;
  district?: string;
  payTime?: string;
  createdAt: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  freight: number;
  currency: string;
  lines: NormalizedOrderLine[];
  rawPayload?: unknown;
  orgId?: string;
}

export interface PushInventoryInput {
  sku: string;
  quantity: number;
  warehouseCode?: string;
}

export interface PushLogisticsInput {
  platformOrderId: string;
  logisticsCompany: string;
  trackingNo: string;
  shipTime?: string;
}

export interface ChannelResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

// 适配器统一接口：每个平台必须实现全部方法（契约测试会强制校验，防假接入）
export interface ChannelAdapter {
  readonly platform: ChannelPlatform;
  // 拉单（内部调用 SSA 后端 /api/channels/<platform>，密钥由后端持有）
  pullOrders(params?: { since?: string; page?: number }): Promise<NormalizedOrder[]>;
  // 推送库存到平台
  pushInventory(items: PushInventoryInput[]): Promise<ChannelResult>;
  // 回写物流单号到平台
  pushLogistics(input: PushLogisticsInput): Promise<ChannelResult>;
  // 纯函数：把平台原始报文归一化为内部订单（必须可独立测试，不依赖网络）
  normalizeOrder(raw: unknown): NormalizedOrder;
}

// ── 轻量金额工具（含税价 ↔ 未税价 ↔ 税额，P0-2 口径）──
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// 已知未税金额与税率 → 税额
export function taxFromNet(net: number, taxRate: number): number {
  return round2(net * taxRate);
}

// 已知含税价（价税合计）与税率 → 拆未税额 + 税额
export function splitPrice(priceWithTax: number, taxRate: number): { net: number; tax: number } {
  if (taxRate <= 0) return { net: round2(priceWithTax), tax: 0 };
  const net = round2(priceWithTax / (1 + taxRate));
  return { net, tax: round2(priceWithTax - net) };
}
