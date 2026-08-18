const LOT_RANGES = [
  { min: 2, max: 8 },
  { min: 9, max: 15 },
  { min: 16, max: 25 },
  { min: 26, max: 50 },
  { min: 51, max: 90 },
  { min: 91, max: 150 },
  { min: 151, max: 280 },
  { min: 281, max: 500 },
  { min: 501, max: 1200 },
  { min: 1201, max: 3200 },
  { min: 3201, max: 1e4 },
  { min: 10001, max: 35e3 }
];
const LEVELS = ["S-1", "S-2", "S-3", "S-4", "I", "II", "III"];
const AQLS = [0.65, 1, 1.5, 2.5, 4];
const CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R"];
const SAMPLE_SIZE = {
  A: 2,
  B: 3,
  C: 5,
  D: 8,
  E: 13,
  F: 20,
  G: 32,
  H: 50,
  J: 80,
  K: 125,
  L: 200,
  M: 315,
  N: 500,
  P: 800,
  Q: 1250,
  R: 2e3
};
const CODE_LETTER_TABLE = {
  "S-1": ["A", "A", "A", "A", "A", "A", "B", "B", "C", "C", "C", "D"],
  "S-2": ["A", "A", "A", "A", "A", "B", "B", "C", "C", "D", "D", "E"],
  "S-3": ["A", "A", "A", "A", "B", "B", "C", "D", "D", "E", "E", "F"],
  "S-4": ["A", "A", "A", "B", "B", "C", "D", "E", "E", "F", "G", "G"],
  "I": ["A", "A", "B", "C", "C", "D", "E", "F", "G", "H", "J", "H"],
  "II": ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "L"],
  "III": ["B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "M"]
};
const MASTER = {
  A: { 0.65: "↓", 1: "↓", 1.5: "↓", 2.5: "↓", 4: "↓" },
  B: { 0.65: "↓", 1: "↓", 1.5: "↓", 2.5: "↓", 4: [0, 1] },
  C: { 0.65: "↓", 1: "↓", 1.5: [0, 1], 2.5: [0, 1], 4: [0, 1] },
  D: { 0.65: "↓", 1: [0, 1], 1.5: [0, 1], 2.5: "↓", 4: [0, 1] },
  E: { 0.65: "↓", 1: "↓", 1.5: "↓", 2.5: "↓", 4: [1, 2] },
  F: { 0.65: [0, 1], 1: [0, 1], 1.5: [1, 2], 2.5: [1, 2], 4: [1, 2] },
  G: { 0.65: [0, 1], 1: [1, 2], 1.5: [1, 2], 2.5: [2, 3], 4: [2, 3] },
  H: { 0.65: [1, 2], 1: [1, 2], 1.5: [2, 3], 2.5: [3, 4], 4: [3, 4] },
  J: { 0.65: [1, 2], 1: [2, 3], 1.5: [3, 4], 2.5: [5, 6], 4: [5, 6] },
  K: { 0.65: [2, 3], 1: [3, 4], 1.5: [5, 6], 2.5: [7, 8], 4: [7, 8] },
  L: { 0.65: [3, 4], 1: [5, 6], 1.5: [7, 8], 2.5: [10, 11], 4: [10, 11] },
  M: { 0.65: [5, 6], 1: [7, 8], 1.5: [10, 11], 2.5: [14, 15], 4: [14, 15] },
  N: { 0.65: [7, 8], 1: [10, 11], 1.5: [14, 15], 2.5: [21, 22], 4: [21, 22] },
  P: { 0.65: [10, 11], 1: [14, 15], 1.5: [21, 22], 2.5: [21, 22], 4: [21, 22] },
  Q: { 0.65: [14, 15], 1: [14, 15], 1.5: [21, 22], 2.5: [21, 22], 4: [21, 22] },
  R: { 0.65: [21, 22], 1: [21, 22], 1.5: [21, 22], 2.5: [21, 22], 4: [21, 22] }
};
function getCodeLetter(lotSize, level) {
  const rangeIdx = LOT_RANGES.findIndex((r) => lotSize >= r.min && lotSize <= r.max);
  if (rangeIdx < 0) return null;
  const row = CODE_LETTER_TABLE[level];
  if (!row) return null;
  return row[rangeIdx];
}
function resolvePlan(code, aql) {
  var _a;
  let idx = CODES.indexOf(code);
  if (idx < 0) idx = 0;
  let guard = 0;
  while (guard++ < 40) {
    const entry = (_a = MASTER[CODES[idx]]) == null ? void 0 : _a[aql];
    if (Array.isArray(entry)) {
      return { code: CODES[idx], n: SAMPLE_SIZE[CODES[idx]], ac: entry[0], re: entry[1] };
    }
    if (entry === "↓") {
      if (idx === 0) return { code: "A", n: SAMPLE_SIZE.A, ac: 0, re: 1 };
      idx -= 1;
      continue;
    }
    if (entry === "↑") {
      return { code: CODES[idx], n: SAMPLE_SIZE[CODES[idx]], ac: 0, re: 1 };
    }
    const n = SAMPLE_SIZE[CODES[idx]];
    const ac = Math.max(0, Math.round(n * aql / 100));
    return { code: CODES[idx], n, ac, re: ac + 1 };
  }
  return { code, n: SAMPLE_SIZE[code] ?? 0, ac: 0, re: 1 };
}
function computeAqlPlan(lotSize, level, aql) {
  if (!Number.isFinite(lotSize) || lotSize < 2) return null;
  const code = getCodeLetter(lotSize, level);
  if (!code) return null;
  const plan = resolvePlan(code, aql);
  return { code, ...plan };
}
export {
  AQLS as A,
  LEVELS as L,
  computeAqlPlan as c,
  getCodeLetter as g,
  resolvePlan as r
};
