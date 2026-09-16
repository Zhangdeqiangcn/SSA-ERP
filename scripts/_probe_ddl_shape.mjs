#!/usr/bin/env node
// 探针：生产库里那些「在 fieldSchema 中是空对象」的表，DDL 到底长什么样？
// 目的：证实/证伪「_gen_schema_prod.mjs 只认一列一行 DDL，单行 DDL 会丢列」。
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

// 这些表在 fieldSchema.ts 里是空对象 {}
const SUSPECT = [
  'audit_degraded', 'inbound_order_items', 'inbound_orders', 'inventory_records',
  'mes_wips', 'outbound_order_items', 'outbound_orders', 'purchase_order_items',
  'purchase_orders', 'sales_order_items', 'sales_orders', 'three_way_match',
  'vendors', 'voucher_items', 'vouchers', 'work_orders',
];
const list = SUSPECT.map((t) => `'${t}'`).join(',');

const sql = `SELECT name, sql AS ddl FROM sqlite_master WHERE type='table' AND name IN (${list}) ORDER BY name`;
const r = spawnSync(NODE, [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql], {
  encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error('❌ 查询失败：', (r.stderr || '').slice(0, 600));
  process.exit(1);
}
const out = r.stdout || '';
const start = out.indexOf('[');
const rows = JSON.parse(out.slice(start))[0].results || [];

const NUM = /\b(INT|REAL|NUM|DEC|FLOAT|DOUBLE|BOOL)\w*/i;
const DATE_NAME = /(_at|_date$|^date$|date_|expiry|deadline|period_start|period_end)/i;

console.log(`取得 ${rows.length} 张表的 DDL\n`);
console.log('表名'.padEnd(24) + 'DDL长度'.padEnd(9) + '行数'.padEnd(6) + '旧解析器(逐行)得列'.padEnd(20) + '通用解析器得列');
console.log('-'.repeat(96));

const parserRowBased = (ddl) => {
  const cols = [];
  const body = ddl.slice(ddl.indexOf('(') + 1, ddl.lastIndexOf(')'));
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line) continue;
    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(line)) continue;
    const m = line.match(/^["'`\[]?([A-Za-z_][A-Za-z0-9_]*)["'`\]]?\s+([A-Za-z_]+)/);
    if (m) cols.push(m[1]);
  }
  return cols;
};
// 通用解析：先按 () 顶层切分逗号，再取每段首个标识符
const parserFlat = (ddl) => {
  const cols = [];
  const body = ddl.slice(ddl.indexOf('(') + 1, ddl.lastIndexOf(')'));
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  for (const p of parts) {
    const line = p.trim().replace(/\s+/g, ' ');
    if (!line) continue;
    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(line)) continue;
    const m = line.match(/^["'`\[]?([A-Za-z_][A-Za-z0-9_]*)["'`\]]?\s+([A-Za-z_]+)/);
    if (m) cols.push(m[1]);
  }
  return cols;
};

let broken = 0;
for (const { name, ddl } of rows) {
  const nl = (ddl || '').includes('\n') ? '多行' : '单行';
  const a = parserRowBased(ddl || '');
  const b = parserFlat(ddl || '');
  const lost = b.length - a.length;
  if (lost > 0) broken++;
  console.log(
    name.padEnd(24) +
    String((ddl || '').length).padEnd(9) +
    nl.padEnd(6) +
    `${a.length} 列(${a.join(',')})`.slice(0, 19).padEnd(20) +
    `${b.length} 列` + (lost > 0 ? `  ← 旧解析器丢 ${lost} 列` : '')
  );
}
console.log('-'.repeat(96));
console.log(`\n结论：${rows.length} 张表中有 ${broken} 张会被旧解析器丢列。`);
