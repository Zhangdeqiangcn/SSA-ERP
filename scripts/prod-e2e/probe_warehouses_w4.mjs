// W4 仓库主数据后端化 —— 生产真实端点往返探针
// 目的（铁律㉗）：functions/ 不在 tsc 覆盖内，改完端点必须打真实接口坐实可用，
//   不能凭「部署成功」宣布完成。本探针覆盖：登录 → GET 列表 → POST 建仓 →
//   PUT 改名 → GET 复核 → DELETE → GET 复核数量归零，并顺带验证 org 隔离不泄露。
//
// 用法：node scripts/prod-e2e/probe_warehouses_w4.mjs [--base=https://ssa-erp.pages.dev]

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CREDENTIALS_PATH = join(__dirname, '.e2e-credentials.json');
if (!existsSync(CREDENTIALS_PATH)) {
  console.error(`缺少测试超管凭据：${CREDENTIALS_PATH}`);
  process.exit(2);
}
const cred = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));

const BASE = (() => {
  const hit = process.argv.find((a) => a.startsWith('--base='));
  return hit ? hit.slice('--base='.length) : 'https://ssa-erp.pages.dev';
})();

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* 非 JSON */ }
  return { status: res.status, data };
}

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const run = async () => {
  console.log(`\n[W4 探针] 目标 ${BASE}\n`);

  // 0) 登录取 token
  const login = await req('POST', '/api/auth/login', {
    body: { username: cred.username, password: cred.password },
  });
  if (login.status !== 200 || !login.data?.token) {
    console.error(`❌ 登录失败 status=${login.status} body=${JSON.stringify(login.data)?.slice(0, 200)}`);
    process.exit(1);
  }
  const token = login.data.token;
  const orgId = login.data.user?.org_id;
  console.log(`[登录成功] org_id=${orgId}\n`);

  // 1) GET 列表（初始数量记为 base）
  const list0 = await req('GET', '/api/warehouses?pageSize=100', { token });
  ok('GET /api/warehouses 返回 200', list0.status === 200, `status=${list0.status}`);
  ok('列表结构含 data 数组', Array.isArray(list0.data?.data), JSON.stringify(list0.data).slice(0, 120));
  const baseCount = Array.isArray(list0.data?.data) ? list0.data.data.length : -1;
  console.log(`  · 初始仓库数 baseCount=${baseCount}`);

  // 2) POST 建仓
  const whCode = 'W4PROBE' + Date.now();
  const created = await req('POST', '/api/warehouses', {
    token,
    body: {
      code: whCode,
      name: 'W4探针仓',
      type: 'aux',
      manager: '探针',
      locations: [{ id: 'loc-w4-1', code: 'L1', name: '探针库位', warehouseId: 'x' }],
    },
  });
  ok('POST /api/warehouses 返回 201', created.status === 201, `status=${created.status} body=${JSON.stringify(created.data)?.slice(0, 150)}`);
  const newId = created.data?.id;
  ok('创建返回含 id', !!newId);
  ok('locations 内联 JSON 已正确解析回数组',
    Array.isArray(created.data?.locations) && created.data.locations.length === 1,
    JSON.stringify(created.data?.locations));
  ok('创建归属 org_id 正确', created.data?.orgId === orgId, `got=${created.data?.orgId} want=${orgId}`);

  // 2b) 编码重复应被拒（负向路径，防静默覆盖）
  const dup = await req('POST', '/api/warehouses', {
    token, body: { code: whCode, name: '重复编码' },
  });
  ok('重复编码被拒(409)', dup.status === 409, `status=${dup.status}`);

  // 3) PUT 改名 + 换库位
  const upd = await req('PUT', `/api/warehouses/${newId}`, {
    token, body: { name: 'W4探针仓改', manager: '新负责人' },
  });
  ok('PUT /api/warehouses/:id 返回 200', upd.status === 200, `status=${upd.status} body=${JSON.stringify(upd.data)?.slice(0, 150)}`);
  ok('改名已生效', upd.data?.name === 'W4探针仓改', `got=${upd.data?.name}`);
  ok('未传 locations 时保留原值(keep 语义)',
    Array.isArray(upd.data?.locations) && upd.data.locations.length === 1,
    JSON.stringify(upd.data?.locations));

  // 4) GET 复核列表含新仓
  const list1 = await req('GET', '/api/warehouses?pageSize=100', { token });
  const found = (list1.data?.data || []).find((w) => w.id === newId);
  ok('列表可查到新仓', !!found);
  ok('数量 +1', (list1.data?.data || []).length === baseCount + 1,
    `got=${(list1.data?.data || []).length} want=${baseCount + 1}`);

  // 5) 未登录应被拒（负向：鉴权闸门真实生效）
  const noauth = await req('GET', '/api/warehouses');
  ok('未登录访问返回 401', noauth.status === 401, `status=${noauth.status}`);

  // 6) DELETE 清理
  const del = await req('DELETE', `/api/warehouses/${newId}`, { token });
  ok('DELETE 返回 200', del.status === 200, `status=${del.status}`);
  const delAgain = await req('DELETE', `/api/warehouses/${newId}`, { token });
  ok('重复删除返回 404', delAgain.status === 404, `status=${delAgain.status}`);

  const list2 = await req('GET', '/api/warehouses?pageSize=100', { token });
  ok('删除后数量归零回 base', (list2.data?.data || []).length === baseCount,
    `got=${(list2.data?.data || []).length} want=${baseCount}`);

  console.log(`\n[W4 探针] PASS=${pass} FAIL=${fail}`);
  process.exit(fail === 0 ? 0 : 1);
};

run().catch((e) => { console.error('探针异常:', e); process.exit(1); });