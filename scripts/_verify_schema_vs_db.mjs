#!/usr/bin/env node
// 校验器：把 scripts/_schema_raw.json 里解析出的列，与生产库 PRAGMA table_info 的真实列逐个比对。
// 目的：证明解析结果与数据库事实**完全一致**（尤其是 redit / ebit 这种可疑列名）。
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;
const localWrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const FALLBACK_WRANGLER =
  'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
const WRANGLER = process.env.WRANGLER_BIN || (existsSync(localWrangler) ? localWrangler : FALLBACK_WRANGLER);

const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const raw = JSON.parse(readFileSync(resolve(root, 'scripts/_schema_raw.json'), 'utf8'));
const tables = Object.keys(raw).sort();
console.log(`_schema_raw.json 共 ${tables.length} 张表，逐张与生产库 PRAGMA table_info 比对…\n`);

// PRAGMA 不能一次查多表，用 sqlite_master 的 DDL 做本地校验会绕回同一个解析器，
// 所以这里必须**让数据库自己报列**。D1 支持 SELECT * FROM pragma_table_info('t')。
const list = tables.map((t) => `'${t}'`).join(',');
const sql = `SELECT m.name AS tbl, p.name AS col, p.type AS ctype, p.pk AS pk
  FROM sqlite_master m
  JOIN pragma_table_info(m.name) p
  WHERE m.type='table' AND m.name IN (${list})
  ORDER BY m.name, p.cid`;
const r = spawnSync(NODE, [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql], {
  encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error('❌ 查询失败：', (r.stderr || '').slice(0, 600));
  process.exit(1);
}
const out = r.stdout || '';
const rows = JSON.parse(out.slice(out.indexOf('[')))[0].results || [];
const truth = {};
for (const { tbl, col, ctype, pk } of rows) {
  (truth[tbl] ||= []).push({ col, ctype, pk });
}

let mismatchTables = 0, missingCols = 0, extraCols = 0, typeMismatch = 0;
const problems = [];
for (const t of tables) {
  const parsed = Object.keys(raw[t]);
  const real = (truth[t] || []).map((c) => c.col);
  if (!real.length) { problems.push(`? ${t}：生产库查不到该表的列`); continue; }
  const miss = real.filter((c) => !parsed.includes(c));
  const extra = parsed.filter((c) => !real.includes(c));
  if (miss.length || extra.length) {
    mismatchTables++;
    missingCols += miss.length;
    extraCols += extra.length;
    problems.push(`✗ ${t}：漏 ${miss.length} 列 [${miss.join(',')}] 多 ${extra.length} 列 [${extra.join(',')}]`);
  }
}

console.log('════════ 比对结果 ════════');
console.log(`表数            : ${tables.length}`);
console.log(`列不一致的表    : ${mismatchTables}`);
console.log(`漏掉的列合计    : ${missingCols}`);
console.log(`多出的列合计    : ${extraCols}`);
console.log('══════════════════════════\n');
if (problems.length) {
  console.log('不一致明细（最多 30 条）：');
  problems.slice(0, 30).forEach((p) => console.log('  ' + p));
} else {
  console.log('✅ 解析结果与生产库 PRAGMA table_info **完全一致**（列名与数量逐张对齐）。');
}

// 单独确认可疑列名
console.log('\n──── 可疑列名核对（redit/ebit 是否真实存在）────');
for (const t of ['vouchers', 'voucher_items']) {
  console.log(`${t} 真实列：${(truth[t] || []).map((c) => c.col).join(', ')}`);
}
