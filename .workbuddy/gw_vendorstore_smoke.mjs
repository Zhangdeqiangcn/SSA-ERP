// 生产「同源」冒烟：前端路径 POST /api/vendors 写 vendor_master，网关路径 GET /api/open/vendors 读同一张表
// 关键证明：两个端点读写的是同一张 vendor_master（消除双数据源）。
const BASE = process.env.GW_BASE || 'https://ssa-erp.pages.dev';
const CC = 'ssa-vstore-' + Date.now();
const log = (...a) => console.log(...a);

async function req(method, path, { token, apiKey, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

(async () => {
  log('=== BASE:', BASE, '===');
  log('--- 0. 注册隔离测试组织(admin) ---');
  const reg = await req('POST', '/api/auth/register', {
    body: { username: 'vstore_' + Date.now(), password: 'vStore123', name: '同源冒烟', companyCode: CC, role: 'admin', department: 'QA' },
  });
  if (reg.status !== 200 || !reg.data?.token) { log('REGISTER FAILED:', JSON.stringify(reg.data)); process.exit(2); }
  const sess = reg.data.token;
  const orgId = reg.data.user.org_id;
  log('org_id:', orgId);

  log('--- 1. session 创建 write Key（网关路径用）---');
  const wk = await req('POST', '/api/open/keys', { token: sess, body: { label: 'vstore-write', scopes: 'write' } });
  if (wk.status !== 201 || !wk.data?.plainKey) { log('KEY FAILED:', JSON.stringify(wk.data)); process.exit(3); }
  const writeKey = wk.data.plainKey;

  log('--- 2. 【前端路径】POST /api/vendors 创建供应商 (期望 201, 写入 vendor_master) ---');
  const code = 'VS' + Date.now();
  const created = await req('POST', '/api/vendors', {
    token: sess,
    body: { code, name: '同源冒烟供应商', shortName: '同源', type: 'manufacturer', contact: '张三', phone: '13800000000', creditLimit: 1000000, usedCredit: 0, status: 'approved' },
  });
  log('POST.status', created.status, 'id', created.data?.id, 'code', created.data?.code);
  const vid = created.data?.id;
  if (created.status !== 201 || !vid) { log('FRONTEND CREATE FAILED:', JSON.stringify(created.data)); process.exit(4); }

  log('--- 3. 【网关路径】GET /api/open/vendors 是否可见同一条 (期望找到 code=' + code + ') ---');
  const gwList = await req('GET', '/api/open/vendors', { apiKey: writeKey });
  log('GET.status', gwList.status, 'total', gwList.data?.total);
  const found = (gwList.data?.data || []).find((v) => v.vendor_code === code || v.id === vid);
  log('  网关可见该供应商?', !!found, found ? JSON.stringify({ id: found.id, code: found.vendor_code, name: found.company_name }) : '(未找到)');
  if (!found) { log('❌ 同源失败：前端写的 vendor_master 网关读不到'); process.exit(5); }
  log('✅ 同源验证通过：前端 POST 与网关 GET 命中同一张 vendor_master');

  log('--- 4. 【前端路径】PUT /api/vendors/:id 改 credit_limit=88888 (期望 200) ---');
  const upd = await req('PUT', '/api/vendors/' + vid, { token: sess, body: { creditLimit: 88888 } });
  log('PUT.status', upd.status, 'creditLimit', upd.data?.creditLimit);

  log('--- 5. 【网关路径】GET /api/open/vendors 是否反映 credit_limit=88888 ---');
  const gwList2 = await req('GET', '/api/open/vendors', { apiKey: writeKey });
  const f2 = (gwList2.data?.data || []).find((v) => v.id === vid);
  log('  网关 credit_limit =', f2?.credit_limit, f2?.credit_limit === 88888 ? '✅ 一致' : '❌ 不一致');
  if (f2?.credit_limit !== 88888) { log('❌ 同源写回失败'); process.exit(6); }

  log('--- 6. 【前端路径】DELETE /api/vendors/:id (期望 ok) ---');
  const del = await req('DELETE', '/api/vendors/' + vid, { token: sess });
  log('DELETE.status', del.status, JSON.stringify(del.data));

  log('--- 7. 【网关路径】GET /api/open/vendors 该供应商应已消失 ---');
  const gwList3 = await req('GET', '/api/open/vendors', { apiKey: writeKey });
  const f3 = (gwList3.data?.data || []).find((v) => v.id === vid);
  log('  网关仍可见?', !!f3, !f3 ? '✅ 已删除(同源删除生效)' : '❌ 仍存在');
  if (f3) { log('❌ 同源删除失败'); process.exit(7); }

  log('--- 8. 吊销测试 Key + 清理 ---');
  const list = await req('GET', '/api/open/keys', { token: sess });
  for (const k of list.data?.data || []) {
    if (k.label && k.label.startsWith('vstore-')) {
      const d = await req('DELETE', '/api/open/keys/' + k.id, { token: sess });
      log('  revoke', k.label, d.status);
    }
  }
  log('=== DONE：同源验证全部通过 ✅ ===');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
