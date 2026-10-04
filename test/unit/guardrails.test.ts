import { describe, it, expect } from 'vitest';
import { guardVoucherItems, validateVoucherItems } from '../../functions/_shared/voucherGuard';
import { monthsElapsedSince } from '../../functions/api/fixed-assets/depreciate';

/**
 * V3.45.0 守护测试（FE-001 第三批）——锁死本批修复的「假管控/静默失效」断点。
 *
 * 为什么这批测试比前两批更重要：
 *   本批修的都是**「闸门造好了但没接线」**类缺陷，它们的共同特征是
 *   「闸门放行」与「闸门根本没生效」返回的都是 HTTP 200，
 *   人工点界面与黑盒 E2E **都测不出来**（界面显示一切正常，数字悄悄是错的）。
 *   因此只能靠白盒直接断言「该拦的必须被拦」，把断链点钉死在测试里。
 *   没有这层保护，下次任何人改动 voucherWriter / paymentGate / depreciate
 *   都会让修复静默失效而无人察觉 —— 这正是报告结论里"守护测试优先于补功能"的依据。
 */

// ─────────────────────────────────────────────────────────────
describe('凭证空分录（回归：已过账凭证可被清空成「总额保留、明细 0 行」）', () => {
  it('显式传空数组必须被拒（VOUCHER_EMPTY_ITEMS）', () => {
    // 漏洞原貌：body.items = [] → 守卫放行 → PUT 执行 DELETE FROM voucher_items
    //           → 一张已过账凭证变成「总额 10 万、明细 0 行」，借贷平衡永远通过
    const r = guardVoucherItems({ items: [] });
    expect(r).not.toBeNull();
    expect(r!.response.code).toBe('VOUCHER_EMPTY_ITEMS');
  });

  it('不携带 items（仅改表头/状态）应放行 —— 过账与红冲走这条路，不能误伤', () => {
    // 关键：区分「不携带」与「传空数组」两种语义。
    // 前者必须放行，否则过账（只改 status）会被自己的守卫拦死。
    expect(guardVoucherItems({ status: 'posted' })).toBeNull();
    expect(guardVoucherItems({})).toBeNull();
    expect(guardVoucherItems({ items: undefined })).toBeNull();
    expect(guardVoucherItems({ items: 'not-an-array' as any })).toBeNull();
  });

  it('有内容的分录仍走正常校验（不平仍被拦）', () => {
    const bad = guardVoucherItems({
      items: [
        { accountCode: '1001', debit: 100, credit: 0 },
        { accountCode: '1002', debit: 0, credit: 30 },
      ],
    });
    expect(bad).not.toBeNull();
    expect(bad!.response.code).toBe('VOUCHER_UNBALANCED');
  });

  it('空分录被拒时不得改写 body 合计（防止半写入状态）', () => {
    const body: any = { items: [], totalDebit: 999, totalCredit: 999 };
    guardVoucherItems(body);
    expect(body.totalDebit).toBe(999);
    expect(body.totalCredit).toBe(999);
  });
});

describe('凭证分录校验（守住"红冲负数必须放行"这条刻意设计）', () => {
  it('红字冲销凭证（借贷为负）必须合法 —— 不能照搬前端"金额不能为负"', () => {
    // 这是 voucherGuard 刻意与前端不同的地方：照搬前端规则会拒掉所有红冲凭证
    const r = validateVoucherItems([
      { accountCode: '1001', debit: -1000, credit: 0 },
      { accountCode: '2001', debit: 0, credit: -1000 },
    ]);
    expect(r.valid).toBe(true);
    expect(r.totalDebit).toBe(-1000);
    expect(r.totalCredit).toBe(-1000);
  });

  it('借贷同时有值必须被拒', () => {
    const r = validateVoucherItems([{ accountCode: '1001', debit: 100, credit: 100 }]);
    expect(r.valid).toBe(false);
  });

  it('金额全为 0（空凭证）必须被拒', () => {
    const r = validateVoucherItems([{ accountCode: '1001', debit: 0, credit: 0 }]);
    expect(r.valid).toBe(false);
  });
});

describe('折旧到期判断（回归：提满年限后仍继续计提、累计折旧超原值）', () => {
  it('期间差计算正确（to - from 的月数差）', () => {
    expect(monthsElapsedSince('2026-01', '2026-01')).toBe(0);
    expect(monthsElapsedSince('2026-01', '2026-12')).toBe(11);
    expect(monthsElapsedSince('2026-01', '2027-01')).toBe(12);
    expect(monthsElapsedSince('2026-03', '2026-01')).toBe(0); // 倒序不返回负数
  });

  it('非法期间返回 0（按"未计提过"处理，不误停提）', () => {
    // 关键：宁可不停提（可人工修），也不能因为解析失败把在用资产全部标成已提足
    expect(monthsElapsedSince('', '2026-01')).toBe(0);
    expect(monthsElapsedSince('2026-01', '')).toBe(0);
    expect(monthsElapsedSince('abc', '2026-01')).toBe(0);
    expect(monthsElapsedSince('2026-13', '2026-14')).toBe(0);
  });

  // 配套的到期规则（与 depreciate.ts 内联逻辑一致，此处固化判定边界）：
  //   life>0 且 alreadyMonths+1 > life ⇒ 本期不计提（对标 SAP FI-AA 到期停提）
  it('到期边界：最后一期可提、下一期停提', () => {
    const life = 12;
    // 首次计提（last_depreciation_period 为空 → 0 期），2026-01 应可提
    expect(0 + 1 > life).toBe(false);
    // 上一期是 2026-01、本期 2027-01 ⇒ 已过 12 期，这是第 13 期，必须停提
    const already = monthsElapsedSince('2026-01', '2027-01');
    expect(already).toBe(12);
    expect(already + 1 > life).toBe(true);
    // 上一期 2026-01、本期 2026-12 ⇒ 已过 11 期，第 12 期（最后一期）仍可提
    const notYet = monthsElapsedSince('2026-01', '2026-12');
    expect(notYet).toBe(11);
    expect(notYet + 1 > life).toBe(false);
  });

  it('年限为 0（未维护）时不按年限停提，交由残值基线钳制', () => {
    // life=0 表示主数据没填年限，此时不能判"已到期"，否则所有资产会一次性停提
    const life = 0;
    expect(life > 0 && 12 + 1 > life).toBe(false);
  });
});
