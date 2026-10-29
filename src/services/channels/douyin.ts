import {
  ChannelAdapter,
  ChannelPlatform,
  NormalizedOrder,
  NormalizedOrderLine,
  PushInventoryInput,
  PushLogisticsInput,
  ChannelResult,
  OrderStatus,
  splitPrice,
  round2,
} from './types';
// channelApi 在方法内按需动态导入：避免契约测试加载浏览器端依赖链（normalizeOrder 为纯函数，不依赖网络）

// 抖音开放平台订单原始结构（精简字段，实际对接以开放平台文档为准）
interface DouyinRawProduct {
  sku_order_id?: string;
  product_id?: string;
  product_name?: string;
  item_num?: number; // 数量
  price?: number; // 单价（分）
  tax_rate?: number; // 税率（0~1，企业店有；默认 0）
}
interface DouyinRawOrder {
  order_id?: string;
  order_no?: string;
  user_name?: string;
  post_addr?: {
    province_name?: string;
    city_name?: string;
    town_name?: string;
    encrypt_detail_address?: string;
    tel?: string;
    name?: string;
  };
  pay_time?: string;
  order_status?: number; // 1待支付 2待发货 3部分发货 4待收货 5完成 6关闭
  freight?: number; // 运费（分）
  discount_amount?: number; // 优惠（分）
  product?: DouyinRawProduct[];
  pay_amount?: number; // 实付（分）
}

const STATUS_MAP: Record<number, OrderStatus> = {
  1: 'pending',
  2: 'paid',
  3: 'paid',
  4: 'shipped',
  5: 'completed',
  6: 'cancelled',
};

export class DouyinAdapter implements ChannelAdapter {
  readonly platform: ChannelPlatform = 'douyin';

  async pullOrders(params?: { since?: string; page?: number }): Promise<NormalizedOrder[]> {
    const { channelApi } = await import('@/services/channelApi');
    const raw = await channelApi.pullOrders(this.platform, params);
    return raw.map((r: any) => this.normalizeOrder(r));
  }

  async pushInventory(items: PushInventoryInput[]): Promise<ChannelResult> {
    const { channelApi } = await import('@/services/channelApi');
    return channelApi.pushInventory(this.platform, items);
  }

  async pushLogistics(input: PushLogisticsInput): Promise<ChannelResult> {
    const { channelApi } = await import('@/services/channelApi');
    return channelApi.pushLogistics(this.platform, input);
  }

  // 纯函数：抖音订单 → 归一化订单（金额单位 分→元；单价视为含税）
  normalizeOrder(raw: unknown): NormalizedOrder {
    const o = (raw || {}) as DouyinRawOrder;
    const orderId = String(o.order_id ?? o.order_no ?? '');
    const taxRate = round2(o.product?.[0]?.tax_rate ?? 0);
    const lines: NormalizedOrderLine[] = (o.product || []).map((p, i) => {
      const qty = Number(p.item_num ?? 1);
      const priceFen = Number(p.price ?? 0);
      const priceWithTax = round2(priceFen / 100); // 分→元（视为含税）
      const { net, tax } = splitPrice(priceWithTax, taxRate);
      const amount = round2(net * qty);
      const lineTax = round2(tax * qty);
      return {
        lineNo: String(p.sku_order_id ?? i + 1),
        platformSku: String(p.product_id ?? ''),
        sku: String(p.product_id ?? ''),
        name: String(p.product_name ?? ''),
        quantity: qty,
        unitPrice: net,
        taxRate,
        taxAmount: lineTax,
        amount,
        totalAmount: round2(amount + lineTax),
        discountAmount: 0,
      };
    });
    const freight = round2(Number(o.freight ?? 0) / 100);
    const discount = round2(Number(o.discount_amount ?? 0) / 100);
    const totalTax = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
    const totalNet = round2(lines.reduce((s, l) => s + l.amount, 0));
    return {
      id: `dh-${orderId}`,
      platform: 'douyin',
      platformOrderId: orderId,
      orderStatus: STATUS_MAP[o.order_status ?? 1] ?? 'pending',
      buyerName: String(o.user_name ?? ''),
      receiverName: o.post_addr?.name,
      receiverPhone: o.post_addr?.tel,
      receiverAddress: o.post_addr?.encrypt_detail_address,
      province: o.post_addr?.province_name,
      city: o.post_addr?.city_name,
      district: o.post_addr?.town_name,
      payTime: o.pay_time,
      createdAt: o.pay_time ?? new Date().toISOString(),
      totalAmount: round2(totalNet + totalTax + freight - discount),
      taxAmount: totalTax,
      discountAmount: discount,
      freight,
      currency: 'CNY',
      lines,
      rawPayload: o,
    };
  }
}
