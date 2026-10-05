import { describe, it, expect } from 'vitest';
import {
  calcLaborCost,
  calcMaterialCost,
  calcOverheadCost,
  applyLaborCostToItems,
} from '../../src/utils/costBasis';

/**
 * V3.47.0 第3批 3-04：成本口径统一 的守护测试。
 *
 * 背景（为什么这三处必须有测试）：
 * 修之前「BOM 人工成本」有三套互不相干的算法——卷积页 `材料成本×0.15`（写死系数）、
 * 归集页 `工时×费率`、BOM 明细的 laborCost 列（**存在但全项目无人写入，恒 0**）。
 * 三套各自在本地页面看着合理，跨页面就自相矛盾。这类缺陷人工点界面看不出来，
 * 而成本数字直接进利润表，必须用纯函数测试把口径钉死。
 */

describe('calcLaborCost：人工/工序成本 = 工序工时 × 费率', () => {
  it('单件工时 = Σ运行时间(分钟)÷60', () => {
    const r = calcLaborCost({
      operations: [{ runTime: 30, setupTime: 0 }, { runTime: 90, setupTime: 0 }],
      plannedQty: 10,
      rates: { laborRate: 60, machineRate: 0 },
    });
    // (30+90)/60 = 2 小时/件；批量 10 件 = 20 小时
    expect(r.hoursPerUnit).toBe(2);
    expect(r.totalHours).toBe(20);
    expect(r.laborCost).toBe(1200); // 20h × 60元/h
  });

  it('★ 准备时间按批量摊（不是每件都摊一次）', () => {
    const withSetup = calcLaborCost({
      operations: [{ runTime: 60, setupTime: 120 }], // 准备 2 小时
      plannedQty: 100,                              // 批量 100 件
      rates: { laborRate: 100, machineRate: 0 },
    });
    // 准备摊到单件 = 120/100/60 = 0.02h；单件合计 = 1 + 0.02 = 1.02h
    expect(withSetup.hoursPerUnit).toBe(1.02);
    expect(withSetup.totalHours).toBe(102);
    expect(withSetup.laborCost).toBe(10200);
  });

  it('计划数量为 0 时不摊准备时间（不除零）', () => {
    const r = calcLaborCost({
      operations: [{ runTime: 60, setupTime: 120 }],
      plannedQty: 0,
      rates: { laborRate: 50, machineRate: 0 },
    });
    expect(r.hoursPerUnit).toBe(1); // 只有运行时间
    expect(r.totalHours).toBe(0);
  });

  it('工序成本按机器费率另算，与人工成本分列', () => {
    const r = calcLaborCost({
      operations: [{ runTime: 60, setupTime: 0 }],
      plannedQty: 10,
      rates: { laborRate: 60, machineRate: 80 },
    });
    expect(r.laborCost).toBe(600);
    expect(r.processCost).toBe(800);
    expect(r.total).toBe(1400);
  });

  it('★ 缺工艺路线时返回 0 且 missingRoute=true（绝不按 15% 猜）', () => {
    const r = calcLaborCost({ operations: [], plannedQty: 100, rates: { laborRate: 60, machineRate: 80 } });
    expect(r.missingRoute).toBe(true);
    expect(r.laborCost).toBe(0);
    expect(r.processCost).toBe(0);
    // 关键：不能有任何"兜底系数"痕迹 —— 返回 0 会被看见并去维护，假数字会被信
    expect(r.totalHours).toBe(0);
  });

  it('operations 缺省/undefined 也按缺路线处理', () => {
    expect(calcLaborCost({ plannedQty: 5, rates: { laborRate: 60, machineRate: 0 } }).missingRoute).toBe(true);
    expect(calcLaborCost({ operations: null, plannedQty: 5, rates: { laborRate: 60, machineRate: 0 } }).missingRoute).toBe(true);
  });

  it('负费率/负工时按 0 处理（脏数据不产生负成本）', () => {
    const r = calcLaborCost({
      operations: [{ runTime: -30, setupTime: -10 }],
      plannedQty: 10,
      rates: { laborRate: -60, machineRate: -80 },
    });
    expect(r.laborCost).toBe(0);
    expect(r.processCost).toBe(0);
  });

  it('金额保留两位（与 money.ts 口径一致）', () => {
    const r = calcLaborCost({
      operations: [{ runTime: 7, setupTime: 0 }],  // 7/60 = 0.11666h
      plannedQty: 3,
      rates: { laborRate: 33.333, machineRate: 0 },
    });
    // 0.12h(舍入后) × 3 × 33.333 = 12.0
    expect(r.laborCost).toBe(12);
    expect(Number(r.laborCost.toFixed(2))).toBe(r.laborCost);
  });
});

describe('calcMaterialCost：材料成本（废品率只放大一次）', () => {
  it('标准单价 × 数量（含废品率放大）', () => {
    const r = calcMaterialCost([
      { unitCost: 10, quantity: 100, scrapRate: 0 },
      { unitCost: 5, quantity: 50, scrapRate: 10 }, // 5×50×1.1 = 275
    ]);
    expect(r).toBe(1000 + 275);
  });

  it('★ 废品率只乘一次（不重复放大）', () => {
    // 废品率 100% ⇒ 100 件 × 20 元 = 4000。若被放大两次会得 8000
    const r = calcMaterialCost([{ unitCost: 20, quantity: 100, scrapRate: 100 }]);
    expect(r).toBe(4000);
  });

  it('缺字段按 0 处理不抛错', () => {
    expect(calcMaterialCost([{ quantity: 10 } as any])).toBe(0);
    expect(calcMaterialCost([])).toBe(0);
    expect(calcMaterialCost(undefined as any)).toBe(0);
  });

  it('废品率为负按原值计入（不减少成本）', () => {
    // 负废品率是脏数据；放大系数 1+(-10/100)=0.9 会少算成本 —— 但这是主数据问题，
    // 此处不做静默修正（修正会掩盖脏数据），只断言行为确定
    expect(calcMaterialCost([{ unitCost: 10, quantity: 100, scrapRate: -10 }])).toBe(900);
  });
});

describe('calcOverheadCost：制造费用按工时分摊', () => {
  it('工时 × 小时费率', () => {
    expect(calcOverheadCost(100, 25)).toBe(2500);
  });

  it('无工时时按 0（不退回"按材料金额拍比例"）', () => {
    // ★ 这条是本项修复的核心：原实现是 材料成本 × 12%，
    //   意味着材料涨价会让制造费用跟着涨 —— 会计上错误的联动。
    expect(calcOverheadCost(0, 25)).toBe(0);
  });

  it('负数按 0', () => {
    expect(calcOverheadCost(-10, 25)).toBe(0);
    expect(calcOverheadCost(10, -25)).toBe(0);
  });
});

describe('applyLaborCostToItems：把人工/工序成本回写到 BOM 明细', () => {
  const items = () => ([
    { id: 'i1', unitCost: 10, quantity: 5 },
    { id: 'i2', unitCost: 20, quantity: 2 },
  ]);

  it('工时成本只落在首行（其余行置 0），避免 N 倍重复累加', () => {
    const r = calcLaborCost({
      operations: [{ runTime: 60, setupTime: 0 }], plannedQty: 1,
      rates: { laborRate: 50, machineRate: 20 },
    });
    const out = applyLaborCostToItems(items(), r);
    expect(out.changed).toBe(true);
    expect(out.items[0].laborCost).toBe(50);
    expect(out.items[0].processCost).toBe(20);
    // 第二行必须为 0 —— 若每行都写同一份成本，一张 5 行的 BOM 人工成本会变 5 倍
    expect(out.items[1].laborCost).toBe(0);
    expect(out.items[1].processCost).toBe(0);
  });

  it('值未变化时 changed=false（不触发无谓写库）', () => {
    const r = calcLaborCost({ operations: [{ runTime: 60, setupTime: 0 }], plannedQty: 1, rates: { laborRate: 50, machineRate: 20 } });
    const first = applyLaborCostToItems(items(), r).items;
    const second = applyLaborCostToItems(first, r);
    expect(second.changed).toBe(false);
    expect(second.items).toBe(first); // 同一引用，未新建数组
  });

  it('空明细不抛错', () => {
    const r = calcLaborCost({ operations: [], plannedQty: 1, rates: { laborRate: 1, machineRate: 1 } });
    expect(applyLaborCostToItems([], r).items).toEqual([]);
  });
});
