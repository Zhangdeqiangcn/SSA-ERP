#!/usr/bin/env node
// 探针：全库数据归属盘点（按 org_id 分组计数）
// ★ 用途：判断「某个域的存量数据应该回填到哪个组织」。
//   0057/0059 用「users 最多」推导，但 **app_state 表本身就带 org_id** ——
//   这是比推导更硬的一手证据（Blob 是登录用户写进去的，org 即其所属组织）。
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

function q(sql) {
  const r = spawnSync(NODE, [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql],
    { encoding: 'utf8', cwd: root, maxBuffer: 256 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const s = out.search(/[[{]/);
  if (s < 0) return [];
  try { return JSON.parse(out.slice(s))[0]?.results || []; } catch { return []; }
}

const TABLES = [
  'work_orders', 'sales_orders', 'customers', 'purchase_orders', 'vendor_master',
  'materials', 'bom_headers', 'inventory_records', 'inbound_orders', 'outbound_orders',
  'purchase_requests', 'vendor_quotes', 'approval_flows', 'sales_prospects', 'shipments',
  'projects', 'fin_invoices', 'fin_payment_plans', 'vouchers', 'planned_orders',
  'print_templates', 'finished_goods_inbounds',
];

const orgs = new Map();
for (const o of q('SELECT id, company_code, name FROM orgs')) orgs.set(o.id, o);
const userCnt = new Map();
for (const u of q('SELECT org_id, COUNT(*) AS n FROM users GROUP BY org_id')) userCnt.set(u.org_id, u.n);

// 真实（非 E2E）组织
const realOrgs = [...orgs.values()].filter((o) => !/^E2E|^W1E2E/.test(o.company_code || ''));

console.log('════ 非门禁（真实）组织 ════');
for (const o of realOrgs) {
  console.log(`  ${o.id}  ${o.company_code}  ${o.name}  用户数=${userCnt.get(o.id) || 0}  创建=${o.created_at}`);
}

console.log('\n════ app_state 各键的归属组织（一手证据）════');
for (const r of q("SELECT org_id, key, LENGTH(value) AS bytes FROM app_state ORDER BY bytes DESC")) {
  const o = orgs.get(r.org_id);
  console.log(`  ${r.key.padEnd(28)} ${String(r.bytes).padStart(7)} B  ${o?.company_code || r.org_id}`);
}

console.log('\n════ 各业务表按组织计数（仅显示非门禁组织）════');
const realIds = new Set(realOrgs.map((o) => o.id));
for (const t of TABLES) {
  const rows = q(`SELECT org_id, COUNT(*) AS n FROM ${t} GROUP BY org_id`);
  const parts = rows
    .filter((r) => realIds.has(r.org_id))
    .map((r) => `${orgs.get(r.org_id)?.company_code || r.org_id}=${r.n}`);
  const e2e = rows.filter((r) => !realIds.has(r.org_id)).reduce((a, b) => a + b.n, 0);
  const tot = rows.reduce((a, b) => a + b.n, 0);
  console.log(`  ${t.padEnd(28)} 总=${String(tot).padStart(4)}  真实组织: ${parts.join(', ') || '（无）'}  门禁=${e2e}`);
}
