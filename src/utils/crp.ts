import { WorkOrder, ProcessRoute, WorkCenter } from '@/types/production';

export interface CRPLine {
  workCenterId: string;
  name: string;
  capacityHours: number;      // 日产能（小时）
  requiredHours: number;      // 需求工时（来自未完工工单工序）
  loadPct: number;            // 负荷率 = requiredHours / capacityHours
  orderCount: number;         // 涉及工单数
}

// ── B3：班次日历 ────────────────────────────────────────────────────
//
// 为什么需要「日历」而不是「日产能 × 天数」：
//   制造业的可用产能不是均匀的。周六可能只上半天（或不开），周日通常停工，
//   节假日整段不开工。若 CRP 一律按「每天都能干 8 小时」计算，会出现两类严重误判：
//     ① 需求落在周日 → 系统说「负荷 60%，没问题」，实际那天一个人都没有 → 必然延期；
//     ② 需求跨周末 → 系统按 7 天算产能、实际只有 5 天 → 产能被高估 40%。
//   这就是「日负荷曲线」的意义：把需求摊到**真实的每个工作日**上，逐日比对。
//
// 为什么用「工作日集合」而不是复杂的班次班表：
//   班次（早/中/夜班各多少人、几点交接）属于考勤与排班系统的范畴，本系统没有这块数据。
//   在没有真实班表的前提下硬做多班次，只能编造数字 —— 那比不做更糟。
//   因此本实现只做「工作日 / 非工作日 + 每日工时系数」两件事：
//     · 工作日系数 1.0（满产能）
//     · 周六系数可配（默认 0.5，半天）
//     · 周日系数 0（停工）
//     · 节假日列表（可配，整段为 0）
//   这个粒度足以回答「这批货能不能按时做完」，且每个数字都能被车间主任核对。
export interface ShopCalendar {
  /** 周六的产能系数：0=停工，0.5=半天（默认），1=满产 */
  saturdayFactor: number;
  /** 周日的产能系数：默认 0（停工） */
  sundayFactor: number;
  /** 节假日（YYYY-MM-DD）：这些天产能为 0 */
  holidays: string[];
  /** 每日标准工时（小时）：用于把「可用小时」换算成「能出多少件」 */
  hoursPerDay: number;
}

export const DEFAULT_CALENDAR: ShopCalendar = {
  saturdayFactor: 0.5,
  sundayFactor: 0,
  holidays: [],
  hoursPerDay: 8,
};

export interface CRPDayLoad {
  date: string;            // YYYY-MM-DD
  weekday: number;         // 0=周日 … 6=周六
  capacityHours: number;   // 该日可用产能（已按班次日历折算）
  requiredHours: number;   // 该日需求工时
  loadPct: number;         // 负荷率
  isWorking: boolean;      // 是否开工日
  orderCount: number;      // 该日涉及工单数
}

export interface CRPCenterDaily {
  workCenterId: string;
  name: string;
  dailyCapacityHours: number;  // 基准日产能（主数据值）
  days: CRPDayLoad[];
  peakDate: string;            // 峰值日
  peakLoadPct: number;         // 峰值负荷率
  overloadDays: number;        // 超载天数（负荷率 > 100%）
  totalRequired: number;
  totalCapacity: number;       // 按日历折算后的总可用产能
  loadPct: number;             // 整体负荷率
}

export interface CRPResult {
  lines: CRPLine[];
  totalCapacity: number;
  totalRequired: number;
  overloadCount: number;      // 负荷率 > 100% 的资源数
  // ── B3 新增 ──
  /** 按工作中心的日负荷曲线（仅含基准日产能 > 0 的工作中心） */
  daily: CRPCenterDaily[];
  /** 排产窗口（起止日） */
  windowStart: string;
  windowEnd: string;
  /** 未落到窗口内的工单数（计划完工日早于窗口起点或缺失） */
  unplannedOrderCount: number;
}

// ── 日期工具（与 MRPPlan 内的实现同口径，避免两处各写一套而不一致）──
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 取某一天的产能系数（工作日 1 / 周六 sat / 周日 sun / 节假日 0） */
export function capacityFactor(date: Date, cal: ShopCalendar): number {
  const key = fmtDate(date);
  if (cal.holidays.includes(key)) return 0;
  const wd = date.getDay();
  if (wd === 6) return cal.saturdayFactor;
  if (wd === 0) return cal.sundayFactor;
  return 1;
}
/** 某一天是否为开工日（系数 > 0） */
export function isWorkingDay(date: Date, cal: ShopCalendar): boolean {
  return capacityFactor(date, cal) > 0;
}

/**
 * 把一张工单的某道工序，按其「计划起止日」均摊到各个自然日，
 * 跳过非开工日（产能系数为 0 的日期不承接任何工时 —— 这与现实一致：
 * 周日不开工，活不会自动挪到周日去做，而是往后挤压）。
 *
 * 为什么按「均摊」而不是「按日产能顺排」：
 *   本函数的目标是「暴露负荷冲突」，不是「生成排程」。均摊是最不假设的分配方式：
 *   它不臆断车间会怎么排产，只是把「这段时间要干这么多活」如实摊开；
 *   于是任何一天明显超出产能，就是真实的资源冲突信号。
 */
function distributeHours(
  totalHours: number,
  start: Date,
  end: Date,
  cal: ShopCalendar,
): Map<string, number> {
  const out = new Map<string, number>();

  // 收集区间内的开工日
  const workingDays: Date[] = [];
  let cursor = new Date(start);
  const last = new Date(end);
  // 上限保护：避免异常日期（如 1900 年）导致循环失控
  let guard = 0;
  while (cursor <= last && guard < 3660) {
    if (isWorkingDay(cursor, cal)) workingDays.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  // 区间内一个开工日都没有（例如正好落在整周假期）→ 退回「区间内的第一个开工日」
  if (workingDays.length === 0) {
    let probe = new Date(end);
    let n = 0;
    while (!isWorkingDay(probe, cal) && n < 30) {
      probe = addDays(probe, 1);
      n += 1;
    }
    out.set(fmtDate(probe), totalHours);
    return out;
  }

  const per = totalHours / workingDays.length;
  for (const d of workingDays) {
    const key = fmtDate(d);
    out.set(key, (out.get(key) ?? 0) + per);
  }
  return out;
}

/**
 * CRP 产能需求计划：把所有未完工工单按工艺路线展开，累计各工作中心的工序需求工时，
 * 与日产能比较得出负荷率。runTime 单位为 分钟/件，setupTime 为分钟。
 *
 * B3 增强：除原有的「总量负荷」外，额外把工时按工单的计划起止日摊到每个开工日，
 *   产出「日负荷曲线」；并用班次日历把周末与节假日从可用产能中扣除，
 *   使「可用天数」与「实际开工天数」一致。
 */
export function computeCRP(
  workOrders: WorkOrder[],
  routes: ProcessRoute[],
  workCenters: WorkCenter[],
  calendar: ShopCalendar = DEFAULT_CALENDAR,
): CRPResult {
  // 仅统计未完工（draft/released/in_progress）工单
  const active = workOrders.filter((w) => w.status !== 'completed' && w.status !== 'closed');
  const reqMap = new Map<string, { requiredHours: number; orderCount: number }>();

  // B3：日负荷明细：key = 工作中心名 → 日期 → { hours, orderIds }
  const dailyMap = new Map<string, Map<string, { hours: number; orderIds: Set<string> }>>();

  // 排产窗口：取所有活跃工单计划起止日的并集；无有效日期时退回「今天起 30 天」
  let winStart: Date | null = null;
  let winEnd: Date | null = null;
  let unplanned = 0;

  const today = new Date();
  const fallbackStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fallbackEnd = addDays(fallbackStart, 30);

  for (const wo of active) {
    const route =
      routes.find((r) => r.id === wo.routeId) ||
      routes.find((r) => r.routeNo === wo.routeNo) ||
      routes.find((r) => r.productCode === wo.productCode);
    if (!route) continue;

    // 该工单的排产区间：计划起 → 计划止；缺日期时用「今天 → 今天+提前量」
    const s = parseDate(wo.plannedStartDate) ?? parseDate(wo.plannedEndDate) ?? fallbackStart;
    const e = parseDate(wo.plannedEndDate) ?? parseDate(wo.plannedStartDate) ?? fallbackEnd;
    // 保证 s <= e（脏数据里起止写反的情况真实存在）
    const start = s <= e ? s : e;
    const end = s <= e ? e : s;
    if (!wo.plannedStartDate && !wo.plannedEndDate) unplanned += 1;

    if (!winStart || start < winStart) winStart = start;
    if (!winEnd || end > winEnd) winEnd = end;

    // 区间过长（>1 年）视为脏数据，截断到 90 天，避免把曲线摊成一条平线
    let daySpan = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const effectiveEnd = daySpan > 365 ? addDays(start, 90) : end;
    if (daySpan > 365) daySpan = 91;

    for (const op of route.operations) {
      const wcName = op.workCenter;
      const hours = (op.setupTime + op.runTime * wo.plannedQuantity) / 60; // 小时
      const prev = reqMap.get(wcName) || { requiredHours: 0, orderCount: 0 };
      reqMap.set(wcName, {
        requiredHours: prev.requiredHours + hours,
        orderCount: prev.orderCount + 1,
      });

      // B3：把这批工时摊到工单区间内的每个开工日
      const spread = distributeHours(hours, start, effectiveEnd, calendar);
      const wcDaily = dailyMap.get(wcName) ?? new Map();
      for (const [date, h] of spread) {
        const cur = wcDaily.get(date) ?? { hours: 0, orderIds: new Set<string>() };
        cur.hours += h;
        cur.orderIds.add(wo.id);
        wcDaily.set(date, cur);
      }
      dailyMap.set(wcName, wcDaily);
    }
  }

  const lines: CRPLine[] = workCenters.map((wc) => {
    const agg = reqMap.get(wc.name) || { requiredHours: 0, orderCount: 0 };
    const requiredHours = Math.round(agg.requiredHours * 100) / 100;
    return {
      workCenterId: wc.id,
      name: wc.name,
      capacityHours: wc.capacityHours,
      requiredHours,
      loadPct: wc.capacityHours > 0 ? Math.round((requiredHours / wc.capacityHours) * 1000) / 10 : 0,
      orderCount: agg.orderCount,
    };
  });

  const totalCapacity = lines.reduce((s, l) => s + l.capacityHours, 0);
  const totalRequired = Math.round(lines.reduce((s, l) => s + l.requiredHours, 0) * 100) / 100;
  const overloadCount = lines.filter((l) => l.loadPct > 100).length;

  // ── B3：构建日负荷曲线 ──────────────────────────────────────────
  const windowStart = winStart ?? fallbackStart;
  const windowEnd = winEnd ?? fallbackEnd;

  const daily: CRPCenterDaily[] = [];
  for (const wc of workCenters) {
    // 基准日产能为 0 的工作中心（如外协、未维护产能）无法算负荷率，不画曲线
    if (!(wc.capacityHours > 0)) continue;
    const wcDaily = dailyMap.get(wc.name);
    if (!wcDaily || wcDaily.size === 0) continue;

    const days: CRPDayLoad[] = [];
    let cursor = new Date(windowStart);
    let guard = 0;
    while (cursor <= windowEnd && guard < 400) {
      const key = fmtDate(cursor);
      const factor = capacityFactor(cursor, calendar);
      const capHours = wc.capacityHours * factor;
      const agg = wcDaily.get(key);
      const reqHours = agg ? Math.round(agg.hours * 100) / 100 : 0;
      days.push({
        date: key,
        weekday: cursor.getDay(),
        capacityHours: Math.round(capHours * 100) / 100,
        requiredHours: reqHours,
        // 非开工日的负荷率：有需求就算 100% 以上（代表这一天根本没人干活，必须顺延），
        // 没需求就是 0。这样「需求落在周日」这类问题不会被 0 产能稀释成 0%。
        loadPct: factor > 0
          ? Math.round((reqHours / capHours) * 1000) / 10
          : (reqHours > 0 ? 999 : 0),
        isWorking: factor > 0,
        orderCount: agg ? agg.orderIds.size : 0,
      });
      cursor = addDays(cursor, 1);
      guard += 1;
    }

    const peak = days.reduce((mx, d) => (d.requiredHours > mx.requiredHours ? d : mx), days[0]);
    const totalCap = days.reduce((s, d) => s + d.capacityHours, 0);
    const totalReq = days.reduce((s, d) => s + d.requiredHours, 0);

    daily.push({
      workCenterId: wc.id,
      name: wc.name,
      dailyCapacityHours: wc.capacityHours,
      days,
      peakDate: peak?.date ?? '',
      peakLoadPct: peak && peak.capacityHours > 0
        ? Math.round((peak.requiredHours / peak.capacityHours) * 1000) / 10
        : (peak && peak.requiredHours > 0 ? 999 : 0),
      overloadDays: days.filter((d) => d.isWorking && d.loadPct > 100).length,
      totalRequired: Math.round(totalReq * 100) / 100,
      totalCapacity: Math.round(totalCap * 100) / 100,
      loadPct: totalCap > 0 ? Math.round((totalReq / totalCap) * 1000) / 10 : 0,
    });
  }

  return {
    lines,
    totalCapacity,
    totalRequired,
    overloadCount,
    daily,
    windowStart: fmtDate(windowStart),
    windowEnd: fmtDate(windowEnd),
    unplannedOrderCount: unplanned,
  };
}
