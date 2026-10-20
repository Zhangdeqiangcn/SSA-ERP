import { readFileSync } from 'node:fs';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));
const BASE = 'https://ssa-erp.pages.dev';
const call = async (m, p, t, b) => {
  const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined });
  const txt = await r.text();
  let isJSON = false; try { JSON.parse(txt); isJSON = true; } catch {}
  return { status: r.status, isJSON, txt, head: txt.slice(0, 60).replace(/\s+/g, ' ') };
};
const l = await call('POST', '/api/auth/login', null, { username: cred.username, password: cred.password });
const body = JSON.parse(l.txt || '{}');
if (!body.token) { console.log('登录失败', l.status, l.txt?.slice(0, 120)); process.exit(1); }
const T = body.token;
const paths = [
  '/api/audit/logs', '/api/auth/profile', '/api/auth/security-mailbox', '/api/auth/activate',
  '/api/orgs/SWEEP_FAKE_000', '/api/users/SWEEP_FAKE_000',
];
for (const p of paths) {
  const a = await call('GET', p, T);
  const u = await call('GET', p, null);
  console.log(p, '| token:', a.status, a.isJSON, a.head, '| notoken:', u.status, u.isJSON);
}
