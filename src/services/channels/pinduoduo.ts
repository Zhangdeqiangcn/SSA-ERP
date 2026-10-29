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

// 拼多多开放平台订单原始结构（精简字段，实际对接以开放平台文档为准）
interface PddRawGoods {
  sku_id?: string;
  goods_id?: string;
  goods_name?: string;
  goods_number?: number; // 数量
  goods_price?: number; // 单价（分）
  goods_tax_rate?: number; // 税率（0~1）
}
interface PddRawOrder {
  order_sn?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  province?: string;
  city?: string;
  town?: string;
  pay_time?: string;
  order_status?: number; // 1待付款 2待发货 3待收货 4待评价 5完成 6退款/取消
  postage?: number; // 运费（分）
  discount_fee?: number; // 优惠（分）
  goods_list?: PddRawGoods[];
}

const STATUS_MAP: Record<number, OrderStatus> = {
  1: 'pending',
  2: 'paid',
  3: 'shipped',
  4: 'shipped',
  5: 'completed',
  6: 'refunded',
};

export class PinduoduoAdapter implements ChannelAdapter {
  readonly platform: ChannelPlatform = 'pinduoduo';

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

  // 纯函数：拼多多订单 → 归一化订单
  normalizeOrder(raw: unknown): NormalizedOrder {
    const o = (raw || {}) as PddRawOrder;
    const orderId = String(o.order_sn ?? '');
    const taxRate = round2(o.goods_list?.[0]?.goods_tax_rate ?? 0);
    const lines: NormalizedOrderLine[] = (o.goods_list || []).map((g, i) => {
      const qty = Number(g.goods_number ?? 1);
      const priceFen = Number(g.goods_price ?? 0);
      const priceWithTax = round2(priceFen / 100); // 分→元（视为含税）
      const { net, tax } = splitPrice(priceWithTax, taxRate);
      const amount = round2(net * qty);
      const lineTax = round2(tax * qty);
      return {
        lineNo: String(g.sku_id ?? i + 1),
        platformSku: String(g.sku_id ?? ''),
        sku: String(g.goods_id ?? ''),
        name: String(g.goods_name ?? ''),
        quantity: qty,
        unitPrice: net,
        taxRate,
        taxAmount: lineTax,
        amount,
        totalAmount: round2(amount + lineTax),
        discountAmount: 0,
      };
    });
    const freight = round2(Number(o.postage ?? 0) / 100);
    const discount = round2(Number(o.discount_fee ?? 0) / 100);
    const totalTax = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
    const totalNet = round2(lines.reduce((s, l) => s + l.amount, 0));
    return {
      id: `pdd-${orderId}`,
      platform: 'pinduoduo',
      platformOrderId: orderId,
      orderStatus: STATUS_MAP[o.order_status ?? 1] ?? 'pending',
      buyerName: String(o.receiver_name ?? ''),
      receiverName: o.receiver_name,
      receiverPhone: o.receiver_phone,
      receiverAddress: o.receiver_address,
      province: o.province,
      city: o.city,
      district: o.town,
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
