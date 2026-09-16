#!/usr/bin/env node
// 打印指定表的完整 DDL，用于诊断解析器为何漏列。
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

const targets = process.argv.slice(2);
if (!targets.length) { console.error('用法：node scripts/_show_ddl.mjs <表名> [表名...]'); process.exit(1); }

const sql = `SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN (${targets
  .map((t) => `'${t}'`)
  .join(',')}) ORDER BY name`;
const r = spawnSync(NODE, [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql], {
  encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) { console.error('❌ 查询失败：', (r.stderr || '').slice(0, 800)); process.exit(1); }
const out = r.stdout || '';
const rows = JSON.parse(out.slice(out.indexOf('[')))[0].results || [];

const raw = JSON.parse(readFileSync(resolve(root, 'scripts/_schema_raw.json'), 'utf8'));

for (const { name, sql: ddl } of rows) {
  console.log('════════════════ ' + name + ' ════════════════');
  console.log(ddl);
  console.log('\n--- 解析器已识别列 ---');
  console.log(Object.keys(raw[name] || {}).join(', '));
  console.log('');
}
