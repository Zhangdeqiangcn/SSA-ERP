/**
 * vouchers 表「驼峰坏列」清理前的数据核对
 *
 * 背景：vouchers 表存在 9 个驼峰列，与蛇形列语义重复：
 *   totalDebit/totalCredit/createdBy/reviewedBy/reviewedAt/postedBy/postedAt/reversedBy/reversedAt
 * 成因：早期建表脚本按前端字段名直接建列，后来统一走 snake_case，旧列没清。
 *
 * ★ 删列前必须回答两个问题（硬规矩「前提核对不能省」）：
 *   Q1 驼峰列里到底有没有数据？
 *   Q2 是否存在「驼峰有值、对应蛇形为 NULL」的行？—— 有则必须先搬，否则删了就丢数据。
 * 只有 Q1=无数据（或 Q2=0 行）才能安全 DROP。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function loadEnv() {
  const p = resolve(root, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
loadEnv();

function wranglerBin() {
  if (process.env.WRANGLER_BIN) return process.env.WRANGLER_BIN;
  const local = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
  if (existsSync(local)) return local;
  return 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
}

function d1(sql) {
  const r = spawnSync(process.execPath, [wranglerBin(), 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql], {
    encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024,
  });
  const out = r.stdout || '';
  const a = out.indexOf('['), b = out.indexOf('{');
  const start = a === -1 ? b : b === -1 ? a : Math.min(a, b);
  if (start === -1) throw new Error('wrangler 无输出：' + (r.stderr || '').slice(0, 400));
  const p = JSON.parse(out.slice(start));
  if (p && p.error) throw new Error('SQL 失败：' + JSON.stringify(p.error.notes || p.error));
  const first = Array.isArray(p) ? p[0] : p;
  if (first && first.error) throw new Error('SQL 失败：' + JSON.stringify(first.error));
  return (first && first.results) || [];
}

// 驼峰列 → 对应蛇形列
const PAIRS = [
  ['totalDebit', 'total_debit'],
  ['totalCredit', 'total_credit'],
  ['createdBy', 'created_by'],
  ['reviewedBy', 'reviewed_by'],
  ['reviewedAt', 'reviewed_at'],
  ['postedBy', 'posted_by'],
  ['postedAt', 'posted_at'],
  ['reversedBy', 'reversed_by'],
  ['reversedAt', 'reversed_at'],
];

console.log('══════ vouchers 驼峰列清理前核对 ══════\n');

// 0. 总行数
const total = d1('SELECT COUNT(*) AS n FROM vouchers')[0]?.n ?? 0;
console.log(`vouchers 总行数 = ${total}`);
if (total === 0) {
  console.log('\n★ 表内 0 行 —— 没有数据可丢，9 个驼峰列可以安全删除。');
} else {
  // 1. 每个驼峰列的非 NULL 计数 + 「驼峰有值但蛇形为空」的行数
  const cols = PAIRS.map(([c, s]) =>
    `SUM(CASE WHEN "${c}" IS NOT NULL AND TRIM(CAST("${c}" AS TEXT))<>'' THEN 1 ELSE 0 END) AS nn_${c},
     SUM(CASE WHEN ("${c}" IS NOT NULL AND TRIM(CAST("${c}" AS TEXT))<>'') AND ("${s}" IS NULL OR TRIM(CAST("${s}" AS TEXT))='') THEN 1 ELSE 0 END) AS risk_${c}`
  ).join(',\n     ');
  const r = d1(`SELECT ${cols} FROM vouchers`)[0] || {};

  console.log('\n列名            驼峰列有值   驼峰有值但蛇形为空(风险)');
  console.log('─────────────────────────────────────────────────');
  let maxRisk = 0;
  for (const [c] of PAIRS) {
    const nn = r[`nn_${c}`] ?? 0;
    const rk = r[`risk_${c}`] ?? 0;
    maxRisk = Math.max(maxRisk, rk);
    console.log(`${c.padEnd(14)} ${String(nn).padStart(6)}      ${String(rk).padStart(6)}${rk > 0 ? '  ❌' : ''}`);
  }
  console.log('─────────────────────────────────────────────────');
  if (maxRisk === 0) {
    console.log('\n✅ 风险行数 = 0：不存在「驼峰有值而蛇形为空」的行，删除驼峰列不会丢数据。');
  } else {
    console.log(`\n❌ 存在 ${maxRisk} 行风险数据 —— 必须先把驼峰列的值搬到蛇形列，再删列。`);
  }
}

// 2. 抽查：看看这些列在真实行里长什么样（只取前 3 行，避免大对象）
if (total > 0) {
  const sample = d1(`SELECT id, total_debit, totalDebit, created_by, createdBy, reviewed_at, reviewedAt FROM vouchers LIMIT 3`);
  console.log('\n抽查前 3 行（蛇形 vs 驼峰对照）：');
  for (const s of sample) console.log('  ' + JSON.stringify(s));
}

process.exit(0);
