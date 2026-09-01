// 生产网关真实 sk_ Key 读写冒烟测试
// 用法：node gw_smoke.mjs
const BASE = process.env.GW_BASE || 'https://ssa-erp.pages.dev';
const CC = 'ssa-gw-smoke-' + Date.now(); // 隔离测试组织
const log = (...a) => console.log(...a);

async function req(method, path, { token, apiKey, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
  const r = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

(async () => {
  log('=== BASE:', BASE, '===');
  log('--- 0. 注册隔离测试组织(admin) ---');
  const reg = await req('POST', '/api/auth/register', {
    body: { username: 'gw_smoke_' + Date.now(), password: 'gwSmoke123', name: '网关冒烟', companyCode: CC, role: 'admin', department: 'QA' },
  });
  log('register.status', reg.status);
  if (reg.status !== 200 || !reg.data?.token) {
    log('REGISTER FAILED:', JSON.stringify(reg.data));
    process.exit(2);
  }
  const sess = reg.data.token;
  const orgId = reg.data.user.org_id;
  log('org_id:', orgId, 'username:', reg.data.user.username);

  log('--- 1. 用 session 创建 write Key ---');
  const wk = await req('POST', '/api/open/keys', { token: sess, body: { label: 'smoke-write', scopes: 'write' } });
  log('writeKey.create.status', wk.status, 'plainKey?', !!wk.data?.plainKey);
  if (wk.status !== 201 || !wk.data?.plainKey) { log('KEY CREATE FAILED:', JSON.stringify(wk.data)); process.exit(3); }
  const writeKey = wk.data.plainKey;
  log('  scopes:', wk.data.scopes);

  log('--- 2. 用 session 创建 read Key ---');
  const rk = await req('POST', '/api/open/keys', { token: sess, body: { label: 'smoke-read', scopes: 'read' } });
  const readKey = rk.data?.plainKey;
  log('readKey.create.status', rk.status, 'scopes:', rk.data?.scopes);

  log('--- 3. writeKey GET /api/open/materials (期望 200) ---');
  const rGet1 = await req('GET', '/api/open/materials', { apiKey: writeKey });
  log('GET.status', rGet1.status, 'total', rGet1.data?.total, 'rows', (rGet1.data?.data || []).length);

  log('--- 4. readKey GET /api/open/materials (期望 200) ---');
  const rGet2 = await req('GET', '/api/open/materials', { apiKey: readKey });
  log('GET.status', rGet2.status, 'total', rGet2.data?.total);

  log('--- 5. writeKey POST /api/open/materials (期望 201, 若为 500 即暴露真实 bug) ---');
  const rPost = await req('POST', '/api/open/materials', {
    apiKey: writeKey,
    body: { code: 'GWSMOKE001', name: '网关冒烟物料', category_name: '测试', unit: '个', material_type: 'purchased', price: 12.5, currency: 'CNY' },
  });
  log('POST.status', rPost.status, 'body', JSON.stringify(rPost.data));
  const createdId = rPost.data?.id;

  log('--- 5b. writeKey POST /api/open/customers (泛化验证，期望 201) ---');
  const rCust = await req('POST', '/api/open/customers', {
    apiKey: writeKey,
    body: { code: 'C-GWSMOKE', name: '网关冒烟客户', type: 'direct', credit_level: 'A', credit_limit: 100000, used_credit: 0 },
  });
  log('POST.customers.status', rCust.status, 'body', JSON.stringify(rCust.data));
  const custId = rCust.data?.id;

  log('--- 6. readKey POST /api/open/materials (期望 403 scope 拒绝) ---');
  const rPostRead = await req('POST', '/api/open/materials', {
    apiKey: readKey,
    body: { code: 'GWSMOKE002', name: '越权写', unit: '个' },
  });
  log('POST.status', rPostRead.status, 'body', JSON.stringify(rPostRead.data));

  if (createdId) {
    log('--- 7. writeKey PUT /api/open/materials/:id (期望 200) ---');
    const rPut = await req('PUT', '/api/open/materials/' + createdId, { apiKey: writeKey, body: { price: 99.9 } });
    log('PUT.status', rPut.status, 'body', JSON.stringify(rPut.data));
    log('--- 8. writeKey DELETE /api/open/materials/:id (清理) ---');
    const rDel = await req('DELETE', '/api/open/materials/' + createdId, { apiKey: writeKey });
    log('DELETE.status', rDel.status, 'body', JSON.stringify(rDel.data));
  } else {
    log('--- 7/8. 跳过 PUT/DELETE：POST 未成功创建，无法继续写链路验证 ---');
  }
  if (custId) {
    const rCDel = await req('DELETE', '/api/open/customers/' + custId, { apiKey: writeKey });
    log('DELETE.customers.status', rCDel.status);
  }

  log('--- 9. 吊销两个测试 Key (session 清理，期望 200) ---');
  const list = await req('GET', '/api/open/keys', { token: sess });
  for (const k of list.data?.data || []) {
    if (k.label && k.label.startsWith('smoke-')) {
      const d = await req('DELETE', '/api/open/keys/' + k.id, { token: sess });
      log('  revoke', k.label, d.status, JSON.stringify(d.data));
    }
  }
  log('=== DONE ===');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
