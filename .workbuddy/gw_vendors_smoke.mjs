// V2.74.2 供应商网关端点专项实测：验证 vendor_master 表可用 + 不泄露门户凭据
const BASE = process.env.GW_BASE || 'https://ssa-erp.pages.dev';
const CC = 'ssa-gw-v' + Date.now();
const req = async (method, path, { token, apiKey, body } = {}) => {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  if (apiKey) h['Authorization'] = 'Bearer ' + apiKey;
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let d = null; try { d = JSON.parse(text); } catch {}
  return { status: r.status, data: d, text };
};
const created = [];
(async () => {
  const reg = await req('POST', '/api/auth/register', { body: { username: 'gwv_' + Date.now(), password: 'gwv123456', name: '供应商实测', companyCode: CC, role: 'admin', department: 'QA' } });
  if (!reg.data?.token) { console.log('REG FAIL', reg.status, reg.text); process.exit(1); }
  const sess = reg.data.token, orgId = reg.data.user.org_id;
  const wk = await req('POST', '/api/open/keys', { token: sess, body: { label: 'vw', scopes: 'write' } });
  const writeKey = wk.data.plainKey;
  const rk = await req('POST', '/api/open/keys', { token: sess, body: { label: 'vr', scopes: 'read' } });
  const readKey = rk.data.plainKey;

  const p1 = await req('POST', '/api/open/vendors', { apiKey: writeKey, body: { vendor_code: 'VTEST001', company_name: '实测供应商', contact_name: '张三', type: 'manufacturer', credit_limit: 50000, used_credit: 0 } });
  console.log('1) POST(no remarks) status', p1.status, JSON.stringify(p1.data));
  const vid = p1.data?.id; if (vid) created.push(vid);

  const g = await req('GET', '/api/open/vendors', { apiKey: writeKey });
  const row = g.data?.data?.[0]; const keys = row ? Object.keys(row) : [];
  console.log('2) GET status', g.status, 'total', g.data?.total, '字段数', keys.length);
  console.log('   泄露password_hash?', keys.includes('password_hash'), '| salt?', keys.includes('salt'), '| role?', keys.includes('role'));
  console.log('   字段:', keys.join(','));

  const p2 = await req('POST', '/api/open/vendors', { apiKey: writeKey, body: { vendor_code: 'VTEST002', company_name: '含备注', contact_name: '李四', type: 'trader', remarks: '测试备注OK' } });
  console.log('3) POST(with remarks) status', p2.status, JSON.stringify(p2.data));
  if (p2.data?.id) created.push(p2.data.id);

  if (vid) {
    const pu = await req('PUT', '/api/open/vendors/' + vid, { apiKey: writeKey, body: { credit_limit: 88888 } });
    console.log('4) PUT status', pu.status, JSON.stringify(pu.data));
    const gv = await req('GET', '/api/open/vendors/' + vid, { apiKey: writeKey });
    console.log('   GET/:id status', gv.status, 'credit_limit=', gv.data?.credit_limit);
  }

  const rp = await req('POST', '/api/open/vendors', { apiKey: readKey, body: { vendor_code: 'VTESTX', company_name: '越权' } });
  console.log('5) readKey POST (期望403) status', rp.status, JSON.stringify(rp.data));

  for (const id of created) { const d = await req('DELETE', '/api/open/vendors/' + id, { apiKey: writeKey }); console.log('6) DELETE', id, d.status, JSON.stringify(d.data)); }

  const list = await req('GET', '/api/open/keys', { token: sess });
  for (const k of list.data?.data || []) if (k.label === 'vw' || k.label === 'vr') await req('DELETE', '/api/open/keys/' + k.id, { token: sess });
  console.log('=== DONE org', orgId, '===');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
