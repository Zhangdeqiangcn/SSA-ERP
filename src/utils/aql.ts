// ===== GB/T 2828.1 (ANSI/ASQ Z1.4) 抽样方案计算（共享模块）=====
// 抽自 AqlSampling，供检验任务域复用，消除 localStorage 数据孤岛。
//
// 计算流程：批量大小 → 检验水平 → 样本量字码 → 主表(AQL×字码) → [Ac, Re]
// 主表中的 "↓" 表示沿字码表向下（较小样本量）查找， "↑" 表示采用 Ac=0/Re=1 特例。

/** 批量大小区间（下标即字码表的列） */
export const LOT_RANGES: { min: number; max: number }[] = [
  { min: 2, max: 8 }, { min: 9, max: 15 }, { min: 16, max: 25 },
  { min: 26, max: 50 }, { min: 51, max: 90 }, { min: 91, max: 150 },
  { min: 151, max: 280 }, { min: 281, max: 500 }, { min: 501, max: 1200 },
  { min: 1201, max: 3200 }, { min: 3201, max: 10000 }, { min: 10001, max: 35000 },
];

/** 检验水平：特殊水平 S-1..S-4，一般水平 I/II/III */
export const LEVELS = ['S-1', 'S-2', 'S-3', 'S-4', 'I', 'II', 'III'];

/** 支持的 AQL 接收质量限（%） */
export const AQLS = [0.65, 1.0, 1.5, 2.5, 4.0];

/** 样本量字码序列 */
export const CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R'];

/** 字码 → 样本量 n */
export const SAMPLE_SIZE: Record<string, number> = {
  A: 2, B: 3, C: 5, D: 8, E: 13, F: 20, G: 32, H: 50,
  J: 80, K: 125, L: 200, M: 315, N: 500, P: 800, Q: 1250, R: 2000,
};

/** 字码表：检验水平 → 12 个批量区间对应的字码 */
const CODE_LETTER_TABLE: Record<string, string[]> = {
  'S-1': ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'C', 'C', 'C', 'D'],
  'S-2': ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'E'],
  'S-3': ['A', 'A', 'A', 'A', 'B', 'B', 'C', 'D', 'D', 'E', 'E', 'F'],
  'S-4': ['A', 'A', 'A', 'B', 'B', 'C', 'D', 'E', 'E', 'F', 'G', 'G'],
  'I': ['A', 'A', 'B', 'C', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'H'],
  'II': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'L'],
  'III': ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'M'],
};

/** 主表：正常检验一次抽样方案（AQL × 字码）→ [ac, re] | '↓' | '↑' */
const MASTER: Record<string, Record<number, number[] | '↓' | '↑'>> = {
  A: { 0.65: '↓', 1.0: '↓', 1.5: '↓', 2.5: '↓', 4.0: '↓' },
  B: { 0.65: '↓', 1.0: '↓', 1.5: '↓', 2.5: '↓', 4.0: [0, 1] },
  C: { 0.65: '↓', 1.0: '↓', 1.5: [0, 1], 2.5: [0, 1], 4.0: [0, 1] },
  D: { 0.65: '↓', 1.0: [0, 1], 1.5: [0, 1], 2.5: '↓', 4.0: [0, 1] },
  E: { 0.65: '↓', 1.0: '↓', 1.5: '↓', 2.5: '↓', 4.0: [1, 2] },
  F: { 0.65: [0, 1], 1.0: [0, 1], 1.5: [1, 2], 2.5: [1, 2], 4.0: [1, 2] },
  G: { 0.65: [0, 1], 1.0: [1, 2], 1.5: [1, 2], 2.5: [2, 3], 4.0: [2, 3] },
  H: { 0.65: [1, 2], 1.0: [1, 2], 1.5: [2, 3], 2.5: [3, 4], 4.0: [3, 4] },
  J: { 0.65: [1, 2], 1.0: [2, 3], 1.5: [3, 4], 2.5: [5, 6], 4.0: [5, 6] },
  K: { 0.65: [2, 3], 1.0: [3, 4], 1.5: [5, 6], 2.5: [7, 8], 4.0: [7, 8] },
  L: { 0.65: [3, 4], 1.0: [5, 6], 1.5: [7, 8], 2.5: [10, 11], 4.0: [10, 11] },
  M: { 0.65: [5, 6], 1.0: [7, 8], 1.5: [10, 11], 2.5: [14, 15], 4.0: [14, 15] },
  N: { 0.65: [7, 8], 1.0: [10, 11], 1.5: [14, 15], 2.5: [21, 22], 4.0: [21, 22] },
  P: { 0.65: [10, 11], 1.0: [14, 15], 1.5: [21, 22], 2.5: [21, 22], 4.0: [21, 22] },
  Q: { 0.65: [14, 15], 1.0: [14, 15], 1.5: [21, 22], 2.5: [21, 22], 4.0: [21, 22] },
  R: { 0.65: [21, 22], 1.0: [21, 22], 1.5: [21, 22], 2.5: [21, 22], 4.0: [21, 22] },
};

/** 抽样方案结果 */
export interface AqlPlan {
  code: string;   // 样本量字码
  n: number;      // 样本量
  ac: number;     // 接收数
  re: number;     // 拒收数
}

/** 由批量大小和检验水平查字码 */
export function getCodeLetter(lotSize: number, level: string): string | null {
  const rangeIdx = LOT_RANGES.findIndex((r) => lotSize >= r.min && lotSize <= r.max);
  if (rangeIdx < 0) return null;
  const row = CODE_LETTER_TABLE[level];
  if (!row) return null;
  return row[rangeIdx];
}

/** 由字码与 AQL 解析抽样方案，处理 "↓"/"↑" 特例 */
export function resolvePlan(code: string, aql: number): AqlPlan {
  let idx = CODES.indexOf(code);
  if (idx < 0) idx = 0;
  let guard = 0;
  while (guard++ < 40) {
    const entry = MASTER[CODES[idx]]?.[aql];
    if (Array.isArray(entry)) {
      return { code: CODES[idx], n: SAMPLE_SIZE[CODES[idx]], ac: entry[0], re: entry[1] };
    }
    if (entry === '↓') {
      if (idx === 0) return { code: 'A', n: SAMPLE_SIZE.A, ac: 0, re: 1 };
      idx -= 1;
      continue;
    }
    if (entry === '↑') {
      // 标准顶部箭头特例：Ac=0，Re=1（采用箭头所指行的样本量）
      return { code: CODES[idx], n: SAMPLE_SIZE[CODES[idx]], ac: 0, re: 1 };
    }
    // 未编码单元：按标准近似公式 Ac≈n·AQL/100，Re=Ac+1
    const n = SAMPLE_SIZE[CODES[idx]];
    const ac = Math.max(0, Math.round((n * aql) / 100));
    return { code: CODES[idx], n, ac, re: ac + 1 };
  }
  return { code, n: SAMPLE_SIZE[code] ?? 0, ac: 0, re: 1 };
}

/**
 * 完整计算抽样方案：批量 + 检验水平 + AQL → 抽样方案。
 * 批量 < 2 或水平非法时返回 null（与 AqlSampling 历史行为一致）。
 */
export function computeAqlPlan(
  lotSize: number,
  level: string,
  aql: number,
): (AqlPlan & { code: string }) | null {
  if (!Number.isFinite(lotSize) || lotSize < 2) return null;
  const code = getCodeLetter(lotSize, level);
  if (!code) return null;
  return resolvePlan(code, aql);
}
