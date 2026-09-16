#!/usr/bin/env node
// 探针：读取生产库 app_state['ssa-erp-production'] 的真实结构与各切片行数
// ★ 硬规矩：包裹层是 {"state":{...}}，直接查顶层键会全返回 null
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;
const localWrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const WRANGLER = existsSync(localWrangler)
  ? localWrangler
  : 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';

const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const KEY = process.argv[2] || 'ssa-erp-production';
const r = spawnSync(
  NODE,
  [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command',
   `SELECT org_id, key, value, LENGTH(value) AS bytes FROM app_state WHERE key='${KEY}'`],
  { encoding: 'utf8', cwd: root, maxBuffer: 256 * 1024 * 1024 }
);
const out = (r.stdout || '') + (r.stderr || '');
const s = out.search(/[[{]/);
if (s < 0) { console.error('❌ 无 JSON：\n' + out.slice(0, 1200)); process.exit(1); }
const rows = JSON.parse(out.slice(s))[0]?.results || [];
if (!rows.length) { console.log(`(无此键: ${KEY})`); process.exit(0); }

for (const row of rows) {
  console.log(`\n════ ${row.key}  org=${row.org_id}  bytes=${row.bytes}`);
  let v;
  try { v = JSON.parse(row.value); } catch { console.log('  (value 非合法 JSON)'); continue; }
  console.log('  顶层键:', Object.keys(v).join(', '));
  const st = v.state ?? v;
  console.log(`  包裹层: ${v.state ? '{"state":{...}}' : '裸对象'}  state 内键: ${Object.keys(st).join(', ')}`);
  for (const [k, val] of Object.entries(st)) {
    const n = Array.isArray(val) ? `Array(${val.length})` : typeof val;
    console.log(`    - ${k}: ${n}`);
  }
  // 逐切片打印首条，用于「生产库 vs 代码默认值」比对
  for (const [k, val] of Object.entries(st)) {
    if (Array.isArray(val) && val.length) {
      console.log(`\n  ── ${k} 首条 ──`);
      console.log('  ' + JSON.stringify(val[0], null, 2).split('\n').join('\n  '));
    }
  }
}
