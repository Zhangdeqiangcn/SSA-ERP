import { describe, it, expect } from 'vitest';
import {
  reconcileStatement, summarize, normNo,
  type ReconcileInput,
} from '../../src/utils/finance/statementReconcile';

/**
 * V3.118.0 供应商对账单跨端核对 · 守护测试。
 *
 * 本模块要防的真实事故（财务认错金额）：
 *   门户对账单是**供应商单方面口径**，主 ERP 直接照它生成应付，
 *   一旦对账单多报（数量写多、单价抬高、挂了张根本不存在的发票），
 *   多出来的钱会真的付出去。故核对必须能明确区分四件事：
 *     ① 金额一致          ② 金额有差异
 *     ③ 订单根本就不存在（不是差异，是"无法核对"）④ 声称的发票查不到
 */

/** 建一张标准对账单：订单 PO20240506001 / 钢板 30 吨 @4150 / 税 13% */
const baseInput = (over: Partial<ReconcileInput> = {}): ReconcileInput => ({
  statement: {
    statementNo: 'VS20240531001',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    statementPeriod: '2024-05',
    subtotal: 124500,
    taxTotal: 16185,
    grandTotal: 140685,
    status: 'confirmed',
    items: [{
      purchaseOrderNo: 'PO20240506001',
      inboundNo: 'IN20240510001',
      materialCode: 'MAT202405010001',
      materialName: '钢板 Q235B',
      qty: 30, unitPrice: 4150, amount: 124500,
      taxAmount: 16185, totalAmount: 140685,
      invoiced: true, invoiceNo: 'FP20240510001',
    }],
  },
  purchaseOrders: [{
    orderNo: 'PO20240506001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    totalAmount: 124500,
    totalTaxAmount: 16185,
    grandTotal: 140685,
    items: [{
      materialCode: 'MAT202405010001',
      orderedQuantity: 30, unitPrice: 4150,
      amount: 124500, taxAmount: 16185, amountWithTax: 140685,
    }],
  }],
  inboundOrders: [{
    inboundNo: 'IN20240510001', type: 'purchase', sourceNo: 'PO20240506001', status: 'completed',
    items: [{ materialCode: 'MAT202405010001', actualQuantity: 30, expectedQuantity: 30 }],
  }],
  invoices: [{ invoiceNo: 'FP20240510001', purchaseOrderNo: 'PO20240506001', totalAmount: 140685 }],
  reconciliations: [],
  ...over,
});

describe('normNo：单号归一化', () => {
  it('不同编码风格归一到同一 key（门户 PO20240506001 vs 台账 PO-2024-0506-001 风格）', () => {
    expect(normNo('PO20240506001')).toBe('po20240506001');
    expect(normNo('PO-2024-0321')).toBe('po20240321');
    expect(normNo('po 2024 05 06 001')).toBe('po20240506001');
  });

  it('空值不抛错', () => {
    expect(normNo(undefined)).toBe('');
    expect(normNo(null)).toBe('');
  });
});

describe('reconcileStatement：一致场景', () => {
  it('订单/入库/发票全对上 → matched，差异为 0', () => {
    const r = reconcileStatement(baseInput());
    expect(r.conclusion).toBe('matched');
    expect(r.amountDiff).toBe(0);
    expect(r.taxDiff).toBe(0);
    expect(r.totalDiff).toBe(0);
    expect(r.missingPoLines).toBe(0);
    expect(r.missingInvoices).toEqual([]);
    expect(r.lines[0].level).toBe('ok');
    expect(r.lines[0].poFound).toBe(true);
    expect(r.lines[0].invoiceFound).toBe(true);
  });

  it('单号体系不同源也能对上（门户 PO20240506001 / 订单表 PO-2024-0506-001 风格）', () => {
    const r = reconcileStatement(baseInput({
      statement: {
        ...baseInput().statement,
        items: [{ ...baseInput().statement.items![0], purchaseOrderNo: 'PO-2024-0506-001' }],
      },
    }));
    expect(r.lines[0].poFound).toBe(true);
    expect(r.conclusion).toBe('matched');
  });

  it('已入库数量从入库单汇总（一张订单分两次到货）', () => {
    const r = reconcileStatement(baseInput({
      inboundOrders: [
        { inboundNo: 'IN-A', sourceNo: 'PO20240506001', items: [{ materialCode: 'MAT202405010001', actualQuantity: 20 }] },
        { inboundNo: 'IN-B', sourceNo: 'PO20240506001', items: [{ materialCode: 'MAT202405010001', actualQuantity: 10 }] },
      ],
    }));
    expect(r.lines[0].inboundQty).toBe(30);
    expect(r.inboundQty).toBe(30);
  });
});

describe('reconcileStatement：差异场景', () => {
  it('★ 数量多报（供应商说 35 吨，实际下单 30 吨）→ 必须报差异，不能静默放过', () => {
    const input = baseInput();
    input.statement.items![0] = {
      ...input.statement.items![0],
      qty: 35, amount: 145250, taxAmount: 18882.5, totalAmount: 164132.5,
    };
    input.statement.subtotal = 145250;
    input.statement.taxTotal = 18882.5;
    input.statement.grandTotal = 164132.5;
    const r = reconcileStatement(input);
    expect(r.conclusion).toBe('diff');
    expect(r.lines[0].qtyDiff).toBe(5);
    expect(r.lines[0].level).toBe('error');
    expect(r.amountDiff).toBeCloseTo(20750, 2);
    expect(r.issues.join()).toContain('数量');
  });

  it('★ 金额抬价（数量对、单价从 4150 抬到 4300）→ 单价差反映到金额差异', () => {
    const input = baseInput();
    input.statement.items![0] = {
      ...input.statement.items![0],
      unitPrice: 4300, amount: 129000, taxAmount: 16770, totalAmount: 145770,
    };
    input.statement.subtotal = 129000;
    input.statement.taxTotal = 16770;
    input.statement.grandTotal = 145770;
    const r = reconcileStatement(input);
    expect(r.conclusion).toBe('diff');
    expect(r.amountDiff).toBeCloseTo(4500, 2);
  });

  it('仅 0.5 元尾差 → 不算实质差异（容差 1 元内视作一致）', () => {
    const input = baseInput();
    input.statement.subtotal = 124500.5;
    input.statement.grandTotal = 140685.5;
    const r = reconcileStatement(input);
    expect(r.conclusion).toBe('matched');
  });
});

describe('reconcileStatement：缺单据场景（与"有差异"必须区分）', () => {
  it('★ 对账单挂的采购订单在 ERP 里不存在 → incomplete（不是 diff）', () => {
    const input = baseInput();
    input.statement.items![0] = { ...input.statement.items![0], purchaseOrderNo: 'PO20240999999' };
    const r = reconcileStatement(input);
    expect(r.conclusion).toBe('incomplete');
    expect(r.missingPoLines).toBe(1);
    expect(r.lines[0].poFound).toBe(false);
    // 订单不存在时不应凭空算出金额差异（poTotal 为 0 会给出 100% 差异，属误导）
    expect(r.poTotal).toBe(0);
    expect(r.conclusionText).toContain('不存在');
  });

  it('★ 行声称已开票但发票台账查不到 → diff，并列出缺的发票号', () => {
    const input = baseInput({ invoices: [] });
    const r = reconcileStatement(input);
    expect(r.conclusion).toBe('diff');
    expect(r.missingInvoices).toEqual(['FP20240510001']);
    expect(r.lines[0].invoiceFound).toBe(false);
    expect(r.issues.join()).toContain('FP20240510001');
    // 金额其实与订单一致 —— 结论文案必须说清"差在发票没入账"，
    // 不能让页面同时出现「金额一致」与「存在差异」两个互相矛盾的信号
    expect(r.totalDiff).toBe(0);
    expect(r.conclusionText).toContain('发票未进财务台账');
  });

  it('对账单无明细行 → incomplete，不编造"一致"结论', () => {
    const input = baseInput();
    input.statement.items = [];
    const r = reconcileStatement(input);
    expect(r.conclusion).toBe('incomplete');
    expect(r.lines).toHaveLength(0);
  });

  it('订单存在但没有对账单所指物料 → error（对错单了）', () => {
    const input = baseInput();
    input.statement.items![0] = { ...input.statement.items![0], materialCode: 'MAT-NOT-EXIST' };
    const r = reconcileStatement(input);
    expect(r.lines[0].level).toBe('error');
    expect(r.lines[0].issues.join()).toContain('没有物料');
  });
});

describe('reconcileStatement：回写状态', () => {
  it('门户已确认 + 主 ERP 已有对账记录 → reconciled=true，不报"未回写"', () => {
    const r = reconcileStatement(baseInput({
      reconciliations: [{ statementNo: 'VS20240531001', vendorId: 'ven-001', status: 'confirmed', amount: 124500 }],
    }));
    expect(r.reconciled).toBe(true);
    expect(r.issues.join()).not.toContain('尚未回写');
  });

  it('★ 门户已确认但主 ERP 无回写 → 明确提示（两边结论不一致）', () => {
    const r = reconcileStatement(baseInput({ reconciliations: [] }));
    expect(r.reconciled).toBe(false);
    expect(r.issues.join()).toContain('尚未回写');
  });

  it('对账记录 status 非 confirmed → 视为未回写', () => {
    const r = reconcileStatement(baseInput({
      reconciliations: [{ statementNo: 'VS20240531001', vendorId: 'ven-001', status: 'pending' }],
    }));
    expect(r.reconciled).toBe(false);
  });
});

describe('summarize：KPI 汇总', () => {
  it('按结论分类计数 + 差异金额取绝对值累加', () => {
    const ok = reconcileStatement(baseInput());
    const diffInput = baseInput();
    diffInput.statement = { ...diffInput.statement, statementNo: 'VS-X' };
    diffInput.statement.items![0] = {
      ...diffInput.statement.items![0],
      qty: 40, amount: 166000, taxAmount: 21580, totalAmount: 187580,
    };
    diffInput.statement.subtotal = 166000;
    diffInput.statement.taxTotal = 21580;
    diffInput.statement.grandTotal = 187580;
    const diff = reconcileStatement(diffInput);

    const s = summarize([ok, diff]);
    expect(s.total).toBe(2);
    expect(s.matched).toBe(1);
    expect(s.diff).toBe(1);
    expect(s.pendingWriteBack).toBe(2);
    expect(s.diffAmount).toBeCloseTo(Math.abs(diff.totalDiff), 2);
    expect(s.totalAmount).toBeCloseTo(140685 + 187580, 2);
  });
});
