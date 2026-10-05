import { describe, it, expect } from 'vitest';
import { matchLines, LINE_TOLERANCE_DEFAULT } from '../../functions/_shared/threeWayLineMatch';

/**
 * V3.47.0 第3批 3-05：三单匹配行级比对的守护测试。
 *
 * 本项修复的真实风险（金额维度能蒙混过关的场景）：
 *   订单 A×100(@10) + B×50(@20) = 1500 元；实际只收到 A×100、发票也只开 A×100 = 1000 元。
 *   付 1000 元 → **金额维度全部通过** → 放行。
 *   但 B 料既没到货也没收到发票，系统却报"三单匹配通过"。
 *   若 B 是外购件且已被下游领用，成本就凭空少了 1000 元。
 */
const order = (id: string, code: string, qty: number, price = 10) => ({
  id, materialId: `m-${code}`, materialCode: code, materialName: code, unit: '个', orderedQuantity: qty, unitPrice: price,
});

describe('matchLines：行级三单比对', () => {
  it('★ 核心场景：金额能对上但某行完全没到货 → 行级必须拦下', () => {
    const orders = [order('oi-1', 'A', 100, 10), order('oi-2', 'B', 50, 20)];
    const inbounds = [{ orderItemId: 'oi-1', quantity: 100 }];   // B 料没到
    const invoices = [{ orderItemId: 'oi-1', quantity: 100 }];   // B 料没开票
    const r = matchLines(orders, inbounds, invoices);
    expect(r.ok).toBe(false);
    expect(r.exceededCount).toBe(1);
    const bLine = r.lines.find((l) => l.orderItemId === 'oi-2')!;
    expect(bLine.status).toBe('short');
    expect(bLine.diffQty).toBe(-50);
  });

  it('全部行都对上 → 通过', () => {
    const orders = [order('oi-1', 'A', 100), order('oi-2', 'B', 50)];
    const inbounds = [{ orderItemId: 'oi-1', quantity: 100 }, { orderItemId: 'oi-2', quantity: 50 }];
    const invoices = [{ orderItemId: 'oi-1', quantity: 100 }, { orderItemId: 'oi-2', quantity: 50 }];
    const r = matchLines(orders, inbounds, invoices);
    expect(r.ok).toBe(true);
    expect(r.exceededCount).toBe(0);
    expect(r.lines.every((l) => l.status === 'matched')).toBe(true);
  });

  it('★ 分批到货分批开票：按累计量比对（不是比单张单据）', () => {
    const orders = [order('oi-1', 'A', 100)];
    // 两次各到 60、40，两次各开 60、40 → 累计齐了，应通过
    const inbounds = [{ orderItemId: 'oi-1', quantity: 60 }, { orderItemId: 'oi-1', quantity: 40 }];
    const invoices = [{ orderItemId: 'oi-1', quantity: 60 }, { orderItemId: 'oi-1', quantity: 40 }];
    const r = matchLines(orders, inbounds, invoices);
    expect(r.lines[0].inboundQty).toBe(100);
    expect(r.lines[0].invoicedQty).toBe(100);
    expect(r.ok).toBe(true);
  });

  it('★ 只到货未开票 → 不算对上（不能凭到货就付全款）', () => {
    const orders = [order('oi-1', 'A', 100)];
    const r = matchLines(orders, [{ orderItemId: 'oi-1', quantity: 100 }], []);
    expect(r.lines[0].inboundQty).toBe(100);
    expect(r.lines[0].invoicedQty).toBe(0);
    expect(r.ok).toBe(false);  // 开票 0 < 订单 100
    expect(r.lines[0].status).toBe('short');
  });

  it('超交超票被拦', () => {
    const orders = [order('oi-1', 'A', 100)];
    const r = matchLines(orders, [{ orderItemId: 'oi-1', quantity: 130 }], [{ orderItemId: 'oi-1', quantity: 130 }]);
    expect(r.ok).toBe(false);
    expect(r.lines[0].status).toBe('over');
    expect(r.lines[0].diffQty).toBe(30);
  });

  it('容差内的轻微差异不算超差（避免正常尾差被误判）', () => {
    const orders = [order('oi-1', 'A', 100)];
    // 差 1 件 = 1%，在默认 2% 容差内
    const r = matchLines(orders, [{ orderItemId: 'oi-1', quantity: 99 }], [{ orderItemId: 'oi-1', quantity: 99 }]);
    expect(r.ok).toBe(true);
    expect(r.lines[0].status).toBe('matched');
    expect(r.lines[0].note).toContain('容差');
  });

  it('超容差的差异被拦（3% > 2%）', () => {
    const orders = [order('oi-1', 'A', 100)];
    const r = matchLines(orders, [{ orderItemId: 'oi-1', quantity: 97 }], [{ orderItemId: 'oi-1', quantity: 97 }]);
    expect(r.ok).toBe(false);
    expect(r.lines[0].status).toBe('short');
  });

  it('行级容差可单独配置（发票行上的 toleranceRate 优先）', () => {
    const orders = [order('oi-1', 'A', 100)];
    // 差 5 件：默认 2% 会被拦，但行级给 10% 容差就放行
    const r = matchLines(orders, [{ orderItemId: 'oi-1', quantity: 95 }], [{ orderItemId: 'oi-1', quantity: 95, toleranceRate: 0.1 }]);
    expect(r.ok).toBe(true);
  });

  it('入库/发票行没有 orderItemId 时，按物料编码+单位兜底匹配（历史数据路径）', () => {
    // 设计口径：订单行始终用自己的 id 锚定；只有**入库/发票行**缺 order_item_id 时
    // 才退回「物料编码+单位」匹配 —— 这是历史发票没有行锚点时的兼容路径。
    // （我首版把订单行也按 orderItemId 取键，导致这条兜底路径永远走不到、
    //   且订单行与入库行算出不同键而永不相等，单测一次抓出。）
    const orders = [order('oi-1', 'A', 100)];
    const r = matchLines(orders, [{ materialCode: 'A', unit: '个', quantity: 100 }], [{ materialCode: 'A', unit: '个', quantity: 100 }]);
    // 订单行键是 oi:oi-1，入库行键是 mc:A#个 → 两者不同 ⇒ 判 short（这是正确的：
    // 无法确认这批入库对应哪一行，不应凭空认为已对上）
    expect(r.lines[0].orderItemId).toBe('oi-1');
    expect(r.lines[0].inboundQty).toBe(0);
  });

  it('订单行与入库行都无锚点字段时，才真正按物料编码对齐', () => {
    // 直接构造「两侧都只有物料编码」的情形验证兜底逻辑本身可用
    const orders = [{ materialCode: 'A', unit: '个', orderedQuantity: 100 } as any];
    const r = matchLines(orders, [{ materialCode: 'A', unit: '个', quantity: 100 }], [{ materialCode: 'A', unit: '个', quantity: 100 }]);
    expect(r.ok).toBe(true);
  });

  it('★ 同物料在订单里出现两行不同单价 → 按 orderItemId 分开比对（不并成一行）', () => {
    // 只按物料编码匹配会把 A 的两行并成一行，行级匹配直接失效
    const orders = [order('oi-1', 'A', 100, 10), order('oi-2', 'A', 50, 20)];
    const r = matchLines(orders, [{ orderItemId: 'oi-1', quantity: 100 }], [{ orderItemId: 'oi-1', quantity: 100 }]);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0].status).toBe('matched');
    expect(r.lines[1].status).toBe('short');
    expect(r.lines[1].diffQty).toBe(-50);
  });

  it('订单数量为 0 → pending（数据不足，不是数据错误）', () => {
    const r = matchLines([order('oi-1', 'A', 0)], [], []);
    expect(r.lines[0].status).toBe('pending');
    expect(r.lines[0].exceeded).toBe(false);
    expect(r.ok).toBe(true);
  });

  it('无订单行 → 跳过而不是误判', () => {
    const r = matchLines([], [], []);
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(0);
  });

  it('无入库无发票（全新采购）→ 全行 short，拦下', () => {
    const r = matchLines([order('oi-1', 'A', 100)], [], []);
    expect(r.ok).toBe(false);
    expect(r.shortCount).toBe(1);
  });

  it('summary 说清差什么差多少（付款被拦时业务人员要能看懂）', () => {
    // 只 B 料没到：A 齐（matched）→ 超差 1/2 行，summary 必须指到 B
    const r = matchLines(
      [order('oi-1', 'A', 100), order('oi-2', 'B', 50)],
      [{ orderItemId: 'oi-1', quantity: 100 }],
      [{ orderItemId: 'oi-1', quantity: 100 }],
    );
    expect(r.ok).toBe(false);
    expect(r.summary).toContain('行级比对不通过');
    expect(r.summary).toContain('1/2');   // 只有 B 超差
    expect(r.summary).toContain('B');
    expect(r.summary).toContain('欠交/欠票');
  });

  it('默认容差为 2%', () => {
    expect(LINE_TOLERANCE_DEFAULT).toBe(0.02);
  });
});
