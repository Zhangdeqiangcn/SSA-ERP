// 质量 SPC 控制图计算（X-bar & R）
// 控制限常数表（子组容量 n → A2 / D3 / D4 / d2）
interface SpcConst {
  A2: number;
  D3: number;
  D4: number;
  d2: number;
}
const SPC_CONST: Record<number, SpcConst> = {
  2: { A2: 1.88, D3: 0, D4: 3.267, d2: 1.128 },
  3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
  5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.97 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
};

export interface SpcSubgroupStat {
  label: string;
  mean: number;
  range: number;
  outOfControl: boolean;
}

export interface SpcResult {
  subgroupSize: number;
  grandMean: number; // X-bar-bar
  avgRange: number; // R-bar
  xbar: { cl: number; ucl: number; lcl: number };
  r: { cl: number; ucl: number; lcl: number };
  subgroups: SpcSubgroupStat[];
  oocCount: number;
  cp?: number;
  cpk?: number;
  cpu?: number;      // 上限能力指数
  cpl?: number;      // 下限能力指数
  pp?: number;       // 过程性能指数
  ppk?: number;      // 过程性能能力指数
  sigmaWithin?: number;  // 组内标准差估计 (R-bar / d2)
  sigmaOverall?: number; // 总体标准差（所有个体值）
  capable: boolean; // 是否具备规格限且 Cpk >= 1.0
  cpkGrade?: 'green' | 'yellow' | 'red'; // Cpk等级
}

const round = (v: number) => Math.round(v * 1000) / 1000;

export function computeSPC(
  subgroups: { label: string; values: number[] }[],
  opts?: { usl?: number; lsl?: number }
): SpcResult {
  const n = subgroups.length ? subgroups[0].values.length : 0;
  const c = SPC_CONST[n] || SPC_CONST[5];

  const raw = subgroups.map((g) => {
    const vals = g.values;
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
    return { label: g.label, mean, range };
  });

  const grandMean = raw.reduce((a, s) => a + s.mean, 0) / (raw.length || 1);
  const avgRange = raw.reduce((a, s) => a + s.range, 0) / (raw.length || 1);

  const xbarUCL = grandMean + c.A2 * avgRange;
  const xbarLCL = grandMean - c.A2 * avgRange;
  const rUCL = c.D4 * avgRange;
  const rLCL = c.D3 * avgRange;

  let oocCount = 0;
  const enriched = raw.map((s) => {
    const ooc = s.mean > xbarUCL || s.mean < xbarLCL || s.range > rUCL || s.range < rLCL;
    if (ooc) oocCount++;
    return { label: s.label, mean: round(s.mean), range: round(s.range), outOfControl: ooc };
  });

  // 过程能力（有规格限且 R-bar>0）
  let cp: number | undefined;
  let cpk: number | undefined;
  let cpu: number | undefined;
  let cpl: number | undefined;
  let pp: number | undefined;
  let ppk: number | undefined;
  let sigmaWithin: number | undefined;
  let sigmaOverall: number | undefined;
  let capable = false;
  let cpkGrade: 'green' | 'yellow' | 'red' = 'red';
  if (opts?.usl != null && opts?.lsl != null && avgRange > 0) {
    const sw = avgRange / c.d2; // 组内标准差估计 (sigma_within)
    sigmaWithin = round(sw);

    // 总体标准差（所有个体值的标准差）
    const allValues = subgroups.flatMap((g) => g.values);
    const overallMean = allValues.reduce((a, v) => a + v, 0) / (allValues.length || 1);
    const variance = allValues.reduce((sum, v) => sum + (v - overallMean) ** 2, 0) / (allValues.length - 1 || 1);
    sigmaOverall = round(Math.sqrt(variance));

    cp = round((opts.usl - opts.lsl) / (6 * sw));
    cpu = round((opts.usl - grandMean) / (3 * sw));
    cpl = round((grandMean - opts.lsl) / (3 * sw));
    cpk = round(Math.min(cpu, cpl));
    capable = cpk >= 1.0;

    // Pp / Ppk（基于总体标准差）
    pp = sigmaOverall > 0 ? round((opts.usl - opts.lsl) / (6 * sigmaOverall)) : 0;
    ppk = sigmaOverall > 0
      ? round(Math.min((opts.usl - overallMean) / (3 * sigmaOverall), (overallMean - opts.lsl) / (3 * sigmaOverall)))
      : 0;

    // Cpk 等级判定
    if (cpk >= 1.33) cpkGrade = 'green';
    else if (cpk >= 1.0) cpkGrade = 'yellow';
    else cpkGrade = 'red';
  }

  return {
    subgroupSize: n,
    grandMean: round(grandMean),
    avgRange: round(avgRange),
    xbar: { cl: round(grandMean), ucl: round(xbarUCL), lcl: round(xbarLCL) },
    r: { cl: round(avgRange), ucl: round(rUCL), lcl: round(rLCL) },
    subgroups: enriched,
    oocCount,
    cp,
    cpk,
    cpu,
    cpl,
    pp,
    ppk,
    sigmaWithin,
    sigmaOverall,
    capable,
    cpkGrade,
  };
}
