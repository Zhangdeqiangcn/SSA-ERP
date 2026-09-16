// 报表查询引擎（V3.5.0 B5：报表中心升级为真查询）
//
// ── 改造前的状况（为什么要做这件事）──────────────────────────────────
// B5 之前，`/reports` 报表中心是一面「导航卡片墙」：每张卡片写着一个报表名
//   （「采购汇总报表」「库存现状报表」…）和一句描述，点下去跳到别的模块页面。
// 问题在于：**它自己算不出任何一个数字**。
//   · 用户想看「本月采购金额合计」，得先跳到采购订单列表，再自己心算或用导出；
//   · 「库存现状」也一样 —— 列表页给的是明细，不是汇总。
// 于是「报表中心」名义上是报表，实际是个书签夹。这是对标里 D1（功能）与
//   D7（结构）双双失分的地方：SAP/金蝶/用友的报表中心第一屏就是**带数字的汇总**。
//
// ── 本次改造成什么 ───────────────────────────────────────────────
// 增加一层「报表查询引擎」：把报表定义成「数据源 + 维度 + 度量」的声明，
//   由统一引擎在数据源上做分组聚合，产出可直接渲染的表格与合计。
// 关键取舍：
//   · **不改用后端 SQL 聚合**。60 个业务域目前仍在 app_state JSON 大对象里
//     （主计划 C1 才迁关系表），后端无表可聚合。此时在前端做聚合是唯一可行路径，
//     而且是**正确**的路径：数据本来就已经在内存里，再走一次网络只增加延迟与失败面。
//     待 C1 数据关系化后，本引擎的 `executeReport` 只需替换实现，报表定义不用动 ——
//     这是把「未来会变的部分」（数据来源）与「不会变的部分」（报表口径）分开。
//   · **聚合口径写在定义里且可读**。每个报表的每个度量都带一句中文说明，
//     界面hover可见。报表最容易出的问题是「数字对不上」，而对不上的根因
//     几乎总是「口径没人写清楚」。
//
// ── 为什么不用 echarts/图表库 ──────────────────────────────────
// 本模块只负责「算出数字」，画图交给页面现有的 MUI 组件。
// 把计算与呈现分开，是为了让计算能被单独测试与复用（例如导出 CSV 时
// 不需要渲染任何图表）。

/** 一个报表的度量（列）定义 */
export interface ReportMeasure {
  /** 字段键（在行数据上的属性名） */
  key: string;
  /** 列标题 */
  label: string;
  /** 口径说明（界面 hover 展示）—— 写清「这个数是怎么算出来的」 */
  note: string;
  /** 展示格式 */
  format?: 'number' | 'money' | 'percent' | 'qty';
}

/** 一个维度的分组结果行 */
export interface ReportRow {
  /** 分组键值（如供应商名、月份、仓库名） */
  group: string;
  /** 该组的度量值 */
  values: Record<string, number>;
  /** 该组包含的明细条数（让用户知道这个数字背后有多少条记录，避免「1 条和 10000 条看起来一样」） */
  count: number;
}

export interface ReportResult {
  rows: ReportRow[];
  /** 合计行（各度量求和；比率类度量由调用方另行说明，不做简单求和） */
  totals: Record<string, number>;
  totalCount: number;
  /** 生成本报表时实际参与计算的数据条数（用于「数据为空」的诚实说明） */
  sourceCount: number;
  /** 是否有数据 */
  hasData: boolean;
}

/** 把一组带分组键与数值的明细聚合成报表行 */
export function aggregate(
  items: Array<{ group: string; metrics: Record<string, number> }>,
  groupOrder?: string[],
): ReportResult {
  const map = new Map<string, { values: Record<string, number>; count: number }>();

  for (const it of items) {
    const g = it.group || '(未分类)';
    const cur = map.get(g) ?? { values: {}, count: 0 };
    for (const [k, v] of Object.entries(it.metrics)) {
      cur.values[k] = (cur.values[k] ?? 0) + (Number.isFinite(v) ? v : 0);
    }
    cur.count += 1;
    map.set(g, cur);
  }

  const rows: ReportRow[] = [...map.entries()].map(([group, v]) => ({
    group,
    values: roundValues(v.values),
    count: v.count,
  }));

  // 排序：给了固定顺序（如月份 1~12）就按它排，否则按第一条度量降序
  // —— 报表的默认顺序应当是「大头在前」，而不是字母序（字母序里「安」永远排在「张」前，没有意义）
  if (groupOrder && groupOrder.length > 0) {
    const idx = new Map(groupOrder.map((g, i) => [g, i]));
    rows.sort((a, b) => (idx.get(a.group) ?? 9999) - (idx.get(b.group) ?? 9999));
  } else {
    const firstKey = rows.length > 0 ? Object.keys(rows[0].values)[0] : '';
    if (firstKey) rows.sort((a, b) => (b.values[firstKey] ?? 0) - (a.values[firstKey] ?? 0));
  }

  const totals: Record<string, number> = {};
  let totalCount = 0;
  for (const r of rows) {
    totalCount += r.count;
    for (const [k, v] of Object.entries(r.values)) {
      totals[k] = (totals[k] ?? 0) + v;
    }
  }

  return {
    rows,
    totals: roundValues(totals),
    totalCount,
    sourceCount: items.length,
    hasData: rows.length > 0,
  };
}

/** 统一保留两位小数：避免浮点误差产生 0.30000000000000004 这类数字出现在报表上 */
function roundValues(v: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) {
    out[k] = Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
  }
  return out;
}

/** 按 YYYY-MM 取月份键 */
export function monthKey(dateStr?: string | null): string {
  if (!dateStr) return '(无日期)';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '(无日期)';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 一组从早到晚的月份键（用于固定排序） */
export function makeMonthOrder(count: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
