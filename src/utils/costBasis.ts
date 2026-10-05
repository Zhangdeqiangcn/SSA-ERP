import type { BOMItem } from '@/types/bom';
import { roundAmount } from './cost';

/**
 * ★ V3.47.0 第3批 3-04：唯一的成本口径计算模块
 *
 * ── 为什么必须收敛到一个模块（此前散落三套，口径互相打架）──────────
 * 「BOM 的人工成本是多少」这件事，项目里有三个互不相干的算法：
 *   A. `CostRollup.tsx`（成本卷积页）：`materialCost * 0.15` —— **写死系数**
 *   B. `CostCollection.tsx`（成本归集页）：`工时 * laborRate` —— 用真实费率
 *   C. BOM 明细的 `laborCost` / `processCost` 两列：表里有、API 透传了、
 *      **但全项目没有任何一处写入**（默认 0）→ BOM 详情页「人工/工序」永远显示 0
 *
 * 后果不是"三个数字不一样"，而是**三个数字分别对各自页面的局部是对的**：
 *   · 卷积页把 15% 当真，标准成本虚高一档（材料越便宜，人工占比被抬得越高）
 *   · 归集页用工时×费率，卷积页用工料×15% —— 同一工单两个页面的差异率符号都可能反
 *   · BOM 详情页恒显示 ¥0.00，主数据维护者根本不知道还要填这两列
 * 而对标金蝶/用友/SAP：**人工成本 = 工序工时 × 费率**（KSAL/KSTK 口径），
 * 制造费用按费率或作业量分摊，**都没有"按材料金额拍一个百分比"这回事**。
 *
 * ── 统一后的口径（唯一真相）────────────────────────────────────
 *   单件工时(h) = Σ 工序.run_time(分钟/件) ÷ 60
 *                 ＋ Σ 工序.setup_time(分钟) ÷ 60 ÷ 计划产量   （准备时间按批量摊）
 *   批量工时    = 单件工时 × 计划数量  （含废品率放大）
 *   人工成本    = 批量工时 × 人工费率(元/小时)
 *   工序成本    = 批量工时 × 机器费率(元/小时)
 *   材料成本    = Σ(标准单价 × (1+废品率) × 数量)   ← 废品率在此放大一次，避免各处重复放大
 *
 * 若某 BOM 没有挂工艺路线（operations 为空），**不猜、不按 15% 兜底**，
 * 返回 0 并由调用方显式标注"无工艺路线，人工成本待维护"。
 * 理由：凭空拍系数比返回 0 更危险 —— 0 会被看见并去维护，假的数字会被信。
 */

export interface OperationLike {
  /** 运行时间（分钟/件）—— 工艺路线工序的单件工时来源 */
  runTime?: number | null;
  /** 准备时间（分钟）—— 按批量摊到单件 */
  setupTime?: number | null;
}

export interface RateLike {
  /** 人工费率（元/小时） */
  laborRate: number;
  /** 机器费率（元/小时） */
  machineRate: number;
}

export interface LaborCostInput {
  /** 挂在该 BOM 上的工序清单（来自工艺路线） */
  operations?: OperationLike[] | null;
  /** 计划/批量数量（用于摊销准备时间） */
  plannedQty?: number | null;
  /** 费率（来自 production_rates，按业务日期取生效值） */
  rates: RateLike;
}

export interface LaborCostResult {
  /** 单件工时（小时） */
  hoursPerUnit: number;
  /** 批量工时（小时） */
  totalHours: number;
  /** 人工成本（元） */
  laborCost: number;
  /** 工序/机器成本（元） */
  processCost: number;
  /** 合计（人工 + 工序） */
  total: number;
  /** 是否因缺工艺路线而无法计算 —— 调用方必须据此显式提示，不得静默按系数兜底 */
  missingRoute: boolean;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * 工序工时 → 人工/工序成本（唯一口径入口）
 *
 * @param input 工序清单 + 计划数量 + 费率
 * @returns 工时与成本明细；缺工艺路线时 missingRoute=true 且成本为 0
 */
export function calcLaborCost(input: LaborCostInput): LaborCostResult {
  const ops = Array.isArray(input.operations) ? input.operations.filter(Boolean) : [];
  const plannedQty = Math.max(0, num(input.plannedQty));
  const laborRate = Math.max(0, num(input.rates?.laborRate));
  const machineRate = Math.max(0, num(input.rates?.machineRate));

  // 单件运行工时：分钟 → 小时
  const runMinutes = ops.reduce((s, o) => s + Math.max(0, num(o.runTime)), 0);
  // 准备时间按批量摊：总量分钟 ÷ 计划数量 ÷ 60（计划数量为 0 时不摊，避免除零）
  const setupMinutes = ops.reduce((s, o) => s + Math.max(0, num(o.setupTime)), 0);
  const setupPerUnitHours = plannedQty > 0 ? setupMinutes / plannedQty / 60 : 0;

  const hoursPerUnit = roundAmount(runMinutes / 60 + setupPerUnitHours);
  const totalHours = roundAmount(hoursPerUnit * plannedQty);
  const laborCost = roundAmount(totalHours * laborRate);
  const processCost = roundAmount(totalHours * machineRate);

  return {
    hoursPerUnit,
    totalHours,
    laborCost,
    processCost,
    total: roundAmount(laborCost + processCost),
    missingRoute: ops.length === 0,
  };
}

/**
 * 材料成本：标准单价 × 数量 × (1+废品率)
 *
 * ★ 废品率只在这里放大**一次**。此前各处（卷积页、领料、成本归集）各自
 *   `quantity * (1 + scrapRate/100)`，有一处漏乘就会让材料成本少算/多算。
 */
export function calcMaterialCost(items: (Pick<BOMItem, 'unitCost' | 'quantity' | 'scrapRate'> & Record<string, any>)[]): number {
  const rows = Array.isArray(items) ? items : [];
  return roundAmount(
    rows.reduce((s, i) => {
      const qty = num(i?.quantity);
      const rate = num(i?.scrapRate) / 100;
      return s + num(i?.unitCost) * qty * (1 + rate);
    }, 0)
  );
}

/**
 * 把计算结果回写到 BOM 明细的 laborCost / processCost 列。
 *
 * 存在的意义：这两列此前**存在但没人写**（恒 0），导致 BOM 详情页的
 * 「人工/工序」永远是 ¥0.00，主数据维护者根本不知道还有这两列。
 * 统一口径后由本函数一处写入，避免各页面各算一套。
 *
 * @returns 是否发生了实质变化（未变化则不写库，减少无谓 UPDATE）
 */
export function applyLaborCostToItems<T extends Record<string, any>>(
  items: T[],
  result: LaborCostResult,
  laborKey = 'laborCost',
  processKey = 'processCost'
): { items: T[]; changed: boolean } {
  const list = Array.isArray(items) ? items : [];
  let changed = false;
  const next = list.map((it, idx) => {
    // 工时是整张 BOM 的属性，按首行承载（与明细表一行一子件的结构对应），
    // 避免同一张 BOM 的各行人工成本被重复累加成 N 倍
    const labor = idx === 0 ? result.laborCost : 0;
    const proc = idx === 0 ? result.processCost : 0;
    const oldLabor = num(it?.[laborKey]);
    const oldProc = num(it?.[processKey]);
    if (roundAmount(oldLabor - labor) !== 0 || roundAmount(oldProc - proc) !== 0) changed = true;
    return { ...it, [laborKey]: labor, [processKey]: proc };
  });
  return { items: changed ? next : list, changed };
}

/**
 * 制造费用分摊（对标 SAP 按作业量/费率分摊，而非按材料金额拍比例）
 *
 * 口径：按**工时**分摊（最常见的作业量口径）。无工时数据时返回 0，
 * 不退回"按材料金额的 12%"——那会让人工与制造费随采购价波动，
 * 出现「材料涨价导致制造费用上涨」这种会计上错误的联动。
 */
export function calcOverheadCost(totalHours: number, overheadRatePerHour: number): number {
  return roundAmount(Math.max(0, num(totalHours)) * Math.max(0, num(overheadRatePerHour)));
}
