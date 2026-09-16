#!/usr/bin/env node
// 通用生产库查询器：node scripts/_d1q.mjs "<单行 SQL>"
// 规则：查询走 --command（--file 只回摘要）；多行 SQL 会被拆坏，须压成单行。
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
const WRANGLER = existsSync(localWrangler) ? localWrangler : FALLBACK_WRANGLER;
const DB = 'ssa-erp-db';

const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const sql = process.argv[2];
if (!sql) { console.error('用法: node scripts/_d1q.mjs "<单行 SQL>"'); process.exit(1); }

const r = spawnSync(
  NODE,
  [WRANGLER, 'd1', 'execute', DB, '--remote', '--json', '--command', sql],
  { encoding: 'utf8', cwd: root, maxBuffer: 256 * 1024 * 1024 }
);
const out = (r.stdout || '') + (r.stderr || '');
// wrangler 会在最前面打印代理/环境提示 → 从第一个 [ 或 { 开始截取
const s = out.search(/[[{]/);
if (s < 0) { console.error('❌ 无 JSON 输出：\n' + out.slice(0, 1500)); process.exit(1); }
let parsed;
try { parsed = JSON.parse(out.slice(s)); }
catch (e) { console.error('❌ JSON 解析失败：\n' + out.slice(s, s + 1500)); process.exit(1); }
const results = Array.isArray(parsed) ? parsed : parsed?.results || [];
const rows = results[0]?.results || [];
console.log(JSON.stringify(rows, null, 2));
console.log(`-- 行数: ${rows.length}`);
