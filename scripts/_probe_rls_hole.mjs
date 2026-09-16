// ★ 坐实「RLS 漏登记 → 列表静默为空」：接口实测 + 数据库直查双证据
//
// 只证明一件事：出库单写进去了（数据库里有），但列表接口查不到（RLS 挡了）。
// 接口返回 200 + 空数组 是最阴的一类故障——没有报错、没有日志、界面只显示「暂无数据」。
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const localW = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const FALLBACK = 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
const WRANGLER = existsSync(localW) ? localW : FALLBACK;
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
function sql(q) {
  const r = spawnSync(process.execPath, [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', q],
    { encoding: 'utf8', cwd: root, maxBuffer: 256 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const s = out.search(/[[{]/);
  if (s < 0) return [];
  const p = JSON.parse(out.slice(s));
  return (Array.isArray(p) ? p : p?.results || [])[0]?.results || [];
}

const BASE = 'https://ssa-erp.pages.dev';
const CRED = JSON.parse(readFileSync('scripts/prod-e2e/.e2e-credentials.json', 'utf8'));
async function req(m, p, { token, body } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + p, { method: m, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t.slice(0, 200) }; }
  return { status: r.status, data: d };
}

const STAMP = Date.now().toString(36).toUpperCase();
const sup = await req('POST', '/api/auth/login', { body: { username: CRED.username, password: CRED.password } });
const uname = `rls_${STAMP.toLowerCase()}`;
await req('POST', '/api/auth/register', { body: { username: uname, password: 'Rls@2026!qa', name: 'RLS探针', companyCode: `RLS-${STAMP}`, department: 'QA' } });
const f = await req('GET', `/api/users?status=pending&keyword=${uname}`, { token: sup.data.token });
const uid = f.data?.data?.[0]?.id;
await req('PUT', `/api/users/${uid}`, { token: sup.data.token, body: { action: 'approve' } });
const lg = await req('POST', '/api/auth/login', { body: { username: uname, password: 'Rls@2026!qa' } });
const token = lg.data.token;

console.log('══════ RLS 漏登记实证 ══════');
for (const [label, path, body] of [
  ['出库单 /api/outbound-orders', '/api/outbound-orders', {
    outboundNo: `OB-${STAMP}`, type: 'sale', status: 'pending',
    warehouseId: 'wh-main', warehouseName: '主仓', operator: 'RLS探针',
    outboundDate: '2026-08-10', remarks: 'RLS 探针',
  }],
  ['入库单 /api/inbound-orders', '/api/inbound-orders', {
    inboundNo: `IB-${STAMP}`, type: 'purchase', status: 'pending',
    warehouseId: 'wh-main', warehouseName: '主仓', operator: 'RLS探针',
    inboundDate: '2026-08-10', remarks: 'RLS 探针',
  }],
]) {
  const c = await req('POST', path, { token, body });
  const list = await req('GET', `${path}?page=1&pageSize=50`, { token });
  const n = (list.data?.data || []).length;
  console.log(`   ${label} 创建 → status=${c.status} body=${JSON.stringify(c.data).slice(0,240)}`);
  console.log(`${label}: 创建 status=${c.status} → 列表 status=${list.status} 行数=${n}  ${n === 0 ? '❌ 写入成功却查不到（RLS 默认拒绝）' : '✅ 正常'}`);
}

// 数据库直查：证明行确实写进去了
const rows = sql(`SELECT 'outbound_orders' t, COUNT(*) n FROM outbound_orders WHERE order_no='OB-${STAMP}' UNION ALL SELECT 'inbound_orders', COUNT(*) FROM inbound_orders WHERE order_no='IB-${STAMP}'`);
console.log('\n数据库直查（证明数据真的在库里）：');
console.log(JSON.stringify(rows));
