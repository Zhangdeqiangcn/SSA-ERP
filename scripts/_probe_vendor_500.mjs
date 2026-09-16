// 探针：定位 POST /api/vendors 返回 500 的根因
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = 'https://ssa-erp.pages.dev';
const CRED = JSON.parse(readFileSync(resolve(root, 'scripts/prod-e2e/.e2e-credentials.json'), 'utf8'));

async function req(m, p, { token, body } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(BASE + p, { method: m, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t.slice(0, 300) }; }
  return { status: r.status, data: d };
}

const STAMP = Date.now().toString(36).toUpperCase();
const user = 'pv_' + STAMP.toLowerCase();
const pw = 'Pv@2026!qa';
const sup = await req('POST', '/api/auth/login', { body: { username: CRED.username, password: CRED.password } });
await req('POST', '/api/auth/register', { body: { username: user, password: pw, name: 'PV', companyCode: 'PV-' + STAMP, department: 'QA' } });
const f = await req('GET', '/api/users?status=pending&keyword=' + encodeURIComponent(user), { token: sup.data.token });
const id = f.data?.data?.[0]?.id;
await req('PUT', '/api/users/' + id, { token: sup.data.token, body: { action: 'approve' } });
const lg = await req('POST', '/api/auth/login', { body: { username: user, password: pw } });
const token = lg.data.token;
console.log('登录成功 =', !!token);

const cases = [
  ['最小 {code,name}', { code: 'V-' + STAMP, name: '最小供应商' }],
  ['加 status', { code: 'V2-' + STAMP, name: '带状态供应商', status: 'active' }],
  ['加 contact', { code: 'V3-' + STAMP, name: '带联系人', status: 'active', contactName: '张三', contactPhone: '13900000000' }],
  ['加 rating(数字)', { code: 'V4-' + STAMP, name: '带评分', status: 'active', rating: 90 }],
  ['加 qualificationExpiry', { code: 'V5-' + STAMP, name: '带资质到期', status: 'active', qualificationExpiry: '2027-12-31' }],
];
for (const [label, body] of cases) {
  const r = await req('POST', '/api/vendors', { token, body });
  console.log(label, '→', r.status, JSON.stringify(r.data).slice(0, 220));
}
