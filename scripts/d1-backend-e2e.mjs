// SSA ERP · D1 后端集成验证（E2E 后端链路）
// ------------------------------------------------------------
// 目的：用真实 Cloudflare 运行时（wrangler pages dev --local）+ 本地 D1，
//       直接打 functions/api HTTP 端点，验证生产后端链路（HTTP→函数→D1→响应）真实可用，
//       并实证：① 系统-of-record 是 app_state Blob；② 关系表无业务创建(POST)端点；
//              ③ B2 三岛无专属后端。
// 运行前提：先启动 `wrangler pages dev dist --local --persist-to <本地D1> --port 8788`
// 用法：node scripts/d1-backend-e2e.mjs   （BASE 可用环境变量覆盖）
//
// 注意：本脚本只读/写本地 D1，绝不触达远程生产库。

import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail });
  const tag = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️ ';
  console.log(`${tag} ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, contentType: res.headers.get('content-type') || '' };
}

const BUSINESS_DOMAINS = [
  'materials', 'customers', 'vendors', 'purchase-orders', 'sales-orders',
  'inbound-orders', 'outbound-orders', 'work-orders', 'vouchers', 'inventory-records',
];

async function main() {
  console.log(`\n=== SSA ERP D1 后端集成验证 @ ${BASE} ===\n`);

  // 1) 注册（创建组织+用户+会话）→ 拿 token
  const uname = 'e2e_' + Date.now().toString(36);
  const r1 = await req('POST', '/api/auth/register', {
    username: uname, password: 'e2epwd123', name: 'E2E', companyCode: 'E2ETESTORG', role: 'admin',
  });
  if (r1.status === 200 && r1.data?.token) {
    rec('auth.register 创建组织/用户/会话', 'PASS', `org_id=${r1.data.user.org_id}`);
  } else {
    rec('auth.register', 'FAIL', `status=${r1.status} ${JSON.stringify(r1.data)}`);
    return finish(1);
  }
  const token = r1.data.token;

  // 2) 登录（同一账号）→ token
  const r2 = await req('POST', '/api/auth/login', { username: uname, password: 'e2epwd123' });
  if (r2.status === 200 && r2.data?.token) rec('auth.login 登录拿会话', 'PASS', '');
  else rec('auth.login', 'FAIL', `status=${r2.status}`);

  // 3) 系统-of-record：app_state Blob 读写删往返
  const KEY = '__e2e_blob__';
  const payload = { hello: 'world', ts: Date.now() };
  const w = await req('PUT', `/api/state/${KEY}`, { value: payload }, token);
  const rd = await req('GET', `/api/state/${KEY}`, undefined, token);
  let rdValue = rd.data?.value;
  try { rdValue = JSON.parse(rdValue); } catch {}
  let blobOk = w.status === 200 && rd.status === 200 &&
    JSON.stringify(rdValue) === JSON.stringify(payload);
  rec('app_state Blob 写→读 往返（系统-of-record）', blobOk ? 'PASS' : 'FAIL',
      `put=${w.status} get=${rd.status}`);
  const del = await req('DELETE', `/api/state/${KEY}`, undefined, token);
  const rd2 = await req('GET', `/api/state/${KEY}`, undefined, token);
  rec('app_state Blob 删除→读空', (del.status === 200 && (rd2.status === 404 || rd2.data?.value == null)) ? 'PASS' : 'FAIL',
      `del=${del.status} get=${rd2.status}`);

  // 4) 关系表 READ（GET 列表）
  let readOk = 0, readTotal = 0;
  for (const d of BUSINESS_DOMAINS) {
    const g = await req('GET', `/api/${d}`, undefined, token);
    readTotal++;
    if (g.status === 200) readOk++;
    else rec(`relational GET /api/${d}`, 'FAIL', `status=${g.status}`);
  }
  rec(`关系表 READ（GET 列表）${readOk}/${readTotal} 通过`, readOk === readTotal ? 'PASS' : 'FAIL', '均为组织隔离查询');

  // 5) 关系表 CREATE 缺失（POST 列表 → 应 404/405，证明无创建端点）
  let create404 = 0;
  const createDetails = [];
  for (const d of BUSINESS_DOMAINS) {
    const p = await req('POST', `/api/${d}`, { _probe: true }, token);
    if (p.status === 404 || p.status === 405) create404++;
    else createDetails.push(`${d}=${p.status}`);
  }
  rec(`关系表 CREATE(POST) 端点缺失 ${create404}/${BUSINESS_DOMAINS.length}`,
      create404 === BUSINESS_DOMAINS.length ? 'PASS' : 'FAIL',
      createDetails.length ? '存在意外创建端点: ' + createDetails.join(',') : '全部 404/405 = 无业务创建端点（数据仅经 Blob 写入）');

  // 6) 关系表 UPDATE/DELETE（对种子行）
  const mat = await req('GET', '/api/materials', undefined, token);
  const firstMat = mat.data?.data?.[0] || (Array.isArray(mat.data?.data) ? null : null);
  const mid = firstMat?.id;
  if (mid) {
    const u = await req('PUT', `/api/materials/${mid}`, { name: 'E2E_UPDATED' }, token);
    rec('relational PUT /api/materials/:id 更新', u.status === 200 ? 'PASS' : 'WARN', `status=${u.status}`);
    const dd = await req('DELETE', `/api/materials/${mid}`, undefined, token);
    rec('relational DELETE /api/materials/:id 删除', dd.status === 200 ? 'PASS' : 'WARN', `status=${dd.status}`);
  } else {
    rec('relational PUT/DELETE（无种子行可测）', 'INFO', 'materials 列表为空，跳过');
  }

  // 7) 专属创建端点（应存在，非 404）
  const twm = await req('POST', '/api/three-way-match', { _probe: true }, token);
  rec('专属创建端点 POST /api/three-way-match 存在', twm.status !== 404 ? 'PASS' : 'FAIL', `status=${twm.status}`);
  const aud = await req('POST', '/api/audit/logs', { action: 'e2e', detail: 'probe' }, token);
  rec('专属创建端点 POST /api/audit/logs 存在', aud.status !== 404 ? 'PASS' : 'FAIL', `status=${aud.status}`);

  // 8) B2 三岛专属后端探测（真实端点应返回 application/json；SPA 回退 text/html 或非 404/405 = 无专属后端）
  const B2 = [
    ['GET', '/api/serial-numbers', '序列号FIFO'], ['POST', '/api/subcontracts', '委外'],
    ['GET', '/api/work-orders/picking', '工单领料'], ['POST', '/api/fifo', 'FIFO核销'],
  ];
  let b2missing = 0;
  for (const [m, p, label] of B2) {
    const x = await req(m, p, m === 'POST' ? { _probe: true } : undefined, token);
    const isRealApi = x.contentType.includes('application/json') && x.status !== 404;
    if (!isRealApi) {
      b2missing++;
      const why = x.contentType.includes('text/html') ? 'SPA回退(text/html)'
        : (x.status === 404 ? '无函数(404)' : `无函数(${x.status})`);
      rec(`B2 专属后端缺失: ${label} ${m} ${p}`, 'PASS', why);
    } else {
      rec(`B2 探测 ${label} ${m} ${p}`, 'WARN', `status=${x.status} ct=${x.contentType}（竟有真实端点，需核查）`);
    }
  }
  rec(`B2 三岛专属 D1 后端缺失 ${b2missing}/${B2.length}`, b2missing === B2.length ? 'PASS' : 'FAIL',
      '序列号FIFO/委外/工单领料均无专属后端，数据存于 app_state Blob（前端 Mock 态）');

  finish(0);
}

function finish(code) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const info = results.filter(r => r.status === 'INFO').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  console.log(`\n=== 汇总: PASS=${pass} FAIL=${fail} WARN=${warn} INFO=${info} ===`);
  // 写出机器可读结果
  writeFileSync('.d1test4/backend-e2e-result.json', JSON.stringify({ pass, fail, warn, info, results }, null, 2));
  process.exit(code);
}

main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
