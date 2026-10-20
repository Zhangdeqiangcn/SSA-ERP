import { describe, it, expect } from 'vitest';
import { DouyinAdapter } from '@/services/channels/douyin';
import { PinduoduoAdapter } from '@/services/channels/pinduoduo';
import { getChannelAdapter, listSupportedPlatforms } from '@/services/channels';
import type { ChannelAdapter, NormalizedOrder } from '@/services/channels/types';

// 抖音原始报文（单价单位：分；tax_rate=0.13）
const douyinRaw = {
  order_id: '6930000001',
  order_no: 'D6930000001',
  user_name: '张三',
  post_addr: {
    province_name: '四川省',
    city_name: '成都市',
    town_name: '高新区',
    encrypt_detail_address: 'xx路1号',
    tel: '138****0000',
    name: '张三',
  },
  pay_time: '2026-10-17T10:00:00+08:00',
  order_status: 2,
  freight: 0,
  discount_amount: 0,
  product: [
    { sku_order_id: 'S1', product_id: 'P100', product_name: '螺丝M6', item_num: 2, price: 2000, tax_rate: 0.13 },
  ],
};

// 拼多多原始报文（goods_price 单位：分；goods_tax_rate=0.13）
const pddRaw = {
  order_sn: '260100123456',
  receiver_name: '李四',
  receiver_phone: '139****1111',
  receiver_address: '上海市xx路2号',
  province: '上海',
  city: '上海市',
  town: '浦东新区',
  pay_time: '2026-10-17T11:00:00+08:00',
  order_status: 2,
  postage: 0,
  discount_fee: 0,
  goods_list: [
    { sku_id: 'SK1', goods_id: 'G200', goods_name: '螺母M8', goods_number: 3, goods_price: 1500, goods_tax_rate: 0.13 },
  ],
};

describe('P1-3 渠道适配器契约门禁', () => {
  // 1) 所有注册平台都实现 ChannelAdapter 全部方法（防假接入）
  it('所有平台都注册了适配器且实现 ChannelAdapter 全部方法', () => {
    const adapters: ChannelAdapter[] = listSupportedPlatforms().map(getChannelAdapter);
    expect(adapters.length).toBeGreaterThanOrEqual(2);
    for (const a of adapters) {
      expect(typeof a.platform).toBe('string');
      expect(typeof a.pullOrders).toBe('function');
      expect(typeof a.pushInventory).toBe('function');
      expect(typeof a.pushLogistics).toBe('function');
      expect(typeof a.normalizeOrder).toBe('function');
    }
  });

  // 2) 抖音归一化：分→元、含税拆税、结构完整
  it('抖音归一化：分→元、含税拆税、结构完整', () => {
    const o: NormalizedOrder = new DouyinAdapter().normalizeOrder(douyinRaw);
    expect(o.platform).toBe('douyin');
    expect(o.platformOrderId).toBe('6930000001');
    expect(o.orderStatus).toBe('paid'); // status 2 → paid
    expect(o.lines).toHaveLength(1);
    const line = o.lines[0];
    expect(line.quantity).toBe(2);
    // 单价 2000 分 = 20 元（含税），税 13% → 未税 ≈ 17.70，单件税额 ≈ 2.30，行税额合计 = 2.30×2
    expect(line.unitPrice).toBeCloseTo(17.7, 1);
    expect(line.taxAmount).toBeCloseTo(4.6, 1); // 行税额合计 = 2.30 * 2
    expect(line.amount).toBeCloseTo(35.4, 1); // 17.70 * 2
    expect(o.totalAmount).toBeCloseTo(40.0, 1); // 35.40 + 4.60（价税合计）
    expect(o.currency).toBe('CNY');
  });

  // 3) 拼多多归一化：字段映射正确、金额计算正确
  it('拼多多归一化：字段映射与金额计算正确', () => {
    const o = new PinduoduoAdapter().normalizeOrder(pddRaw);
    expect(o.platform).toBe('pinduoduo');
    expect(o.platformOrderId).toBe('260100123456');
    expect(o.receiverName).toBe('李四');
    expect(o.province).toBe('上海');
    const line = o.lines[0];
    // 1500 分 = 15 元含税，税 13% → 未税 ≈ 13.27，单件税额 ≈ 1.73，行税额合计 = 1.73×3
    expect(line.unitPrice).toBeCloseTo(13.27, 1);
    expect(line.quantity).toBe(3);
    expect(o.totalAmount).toBeCloseTo(45.0, 1); // 13.27*3 + 1.73*3（价税合计）
  });

  // 4) 多平台归一化后字段名完全一致（订单中台可统一处理）
  it('多平台归一化后字段结构一致', () => {
    const dh = new DouyinAdapter().normalizeOrder(douyinRaw);
    const pdd = new PinduoduoAdapter().normalizeOrder(pddRaw);
    for (const o of [dh, pdd]) {
      expect(o).toHaveProperty('platformOrderId');
      expect(o).toHaveProperty('orderStatus');
      expect(Array.isArray(o.lines)).toBe(true);
      expect(o.lines[0]).toHaveProperty('sku');
      expect(o.lines[0]).toHaveProperty('taxAmount');
      expect(o.lines[0]).toHaveProperty('totalAmount');
    }
  });

  // 5) 异常/空输入不静默吞错：返回结构完整对象（便于审计与排查）
  it('异常输入不静默吞错', () => {
    const o = new DouyinAdapter().normalizeOrder({});
    expect(o.platformOrderId).toBe('');
    expect(o.lines).toEqual([]);
    expect(Number.isFinite(o.totalAmount)).toBe(true);
  });
});
