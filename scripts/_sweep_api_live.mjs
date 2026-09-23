// 后端端点全量真实 HTTP 往返扫描（只读侦察 · 不修改源码 · 不 git 提交）
//
// 目的：functions/ 不在前端 tsc 覆盖内，历史多次「构建全绿、上线才 500」。
//   本脚本对生产站点打真实往返，抓后端缺陷：
//     · 500（含漏 import 的 ReferenceError，已被中间件包成 JSON 500）
//     · 鉴权缺失（未带 token 却 200，或带了 token 却 403 的异常）
//     · 入参未校验（空 body / 缺字段却 200/201/500 而非 400）
//     · 错误返回不规范（非 JSON / 无 error 字段 / 泄露堆栈或 DB 原文）
//
// 硬约束：任何 POST 创建的测试数据，结尾必须 DELETE 清理。
//
// ── V3.20.0：从「一次性侦察脚本」提升为**常驻检查工具** ─────────────────
// 背景：项目里「改了 functions/ 必须打真实端点往返」是硬规矩（㉗），但此前只有
//       临时手写的探针，跑完就没了 —— 下次改动又得重写一遍，等于这条规矩靠记性维持。
// 现在它常驻化的三处硬接口：
//   · 报告落盘固定路径 test-reports/api-sweep/latest.md（与 prod-e2e 报告同构，
//     不再写进一改就覆盖、也说不清是何时跑的 tmp/）；
//   · **退出码有意义**：检出任一 500 即 exit 1 —— 能被门禁与 CI 当阻断项用；
//   · 纳入 scripts/check-consistency.mjs 的第 ④ 步（`npm run check -- --live`）。
//     为什么不放进默认门禁：它会**写生产库**（创建再删除测试数据）。
//     默认门禁必须是无副作用的，所以要用显式开关 --live 才跑。
//
// 用法：
//   node scripts/_sweep_api_live.mjs [base]        # 默认打 https://ssa-erp.pages.dev
//   npm run check:api                              # 同上（推荐入口）
//   npm run check -- --live                        # 门禁里连本巡检一起跑（阻断）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = process.argv[2] || 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(resolve(__dirname, 'prod-e2e/.e2e-credentials.json'), 'utf8'));

const stamp = Date.now();
const rnd = () => Math.random().toString(36).slice(2, 7);
const FAKE = 'SWEEP_FAKE_000';

// ── 公开端点（未带 token 返回 200 属正常，不应判为鉴权缺失）────────────
const PUBLIC = new Set([
  'auth/login', 'vendor/login', 'vendor/register',
  'open', 'state/metrics', 'state/app',
]);

function isPublic(path) {
  return [...PUBLIC].some((p) => path.startsWith('/api/' + p));
}

// ── HTTP 调用 ───────────────────────────────────────────────────────
async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Connection': 'close', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => '');
  let data = null;
  let isJSON = false;
  try { data = text ? JSON.parse(text) : null; isJSON = true; } catch { isJSON = false; }
  return { status: res.status, text, data, isJSON };
}

// 堆栈 / DB 原文泄露特征
const LEAK_RE = /(ReferenceError|TypeError|SyntaxError|at\s+[a-z]|D1_ERROR|SQLITE_|stack|prepare\(|bind\(|Traceback|eval at)/i;

// ── 构造探针 ───────────────────────────────────────────────────────
// CRUD：有列表 + 详情 + 创建。base 为列表路径（不含 /api）。
const CRUD = [
  { res: 'materials', base: 'materials', payload: () => ({ code: 'SWPM' + stamp + rnd(), name: 'Sweep M ' + rnd() }) },
  { res: 'bom', base: 'bom', payload: () => ({ id: 'SWPB' + stamp + rnd(), bomNo: 'SWPB' + rnd(), name: 'Sweep BOM', productCode: 'SWPP' + rnd(), items: [] }) },
  { res: 'purchase-requests', base: 'purchase-requests', payload: () => ({ requestNo: 'SWPR' + rnd(), applicant: 'sweep', items: [{ materialCode: 'M', quantity: 1, estimatedPrice: 1 }] }) },
  { res: 'vendor-quotes', base: 'vendor-quotes', payload: () => ({ quoteNo: 'SWVQ' + rnd(), vendorId: 'x', items: [{ materialCode: 'M', quantity: 1, unitPrice: 1 }] }) },
  { res: 'purchase-orders', base: 'purchase-orders', payload: () => ({ orderNo: 'SWPO' + rnd(), vendorId: 'x', items: [{ materialCode: 'M', quantity: 1, unitPrice: 1 }] }) },
  { res: 'inbound-orders', base: 'inbound-orders', payload: () => ({ orderNo: 'SWIO' + rnd(), type: 'purchase', items: [{ materialCode: 'M', quantity: 1 }] }) },
  { res: 'quality-holds', base: 'quality-holds', payload: () => ({ code: 'SWQH' + rnd(), materialCode: 'M', quantity: 1, reason: 'sweep' }) },
  { res: 'sales-orders', base: 'sales-orders', payload: () => ({ orderNo: 'SWSO' + rnd(), customerId: 'x', items: [{ materialCode: 'M', quantity: 1, unitPrice: 1 }] }) },
  { res: 'sales-prospects', base: 'sales-prospects', payload: () => ({ customerName: 'Sweep ' + rnd(), contactName: 't', followupRecords: [] }) },
  { res: 'shipments', base: 'shipments', payload: () => ({ shipmentNo: 'SWSH' + rnd(), orderId: 'x', items: [{ materialCode: 'M', quantity: 1 }] }) },
  { res: 'outbound-orders', base: 'outbound-orders', payload: () => ({ orderNo: 'SWOO' + rnd(), type: 'sale', items: [{ materialCode: 'M', quantity: 1 }] }) },
  { res: 'stock-transfers', base: 'stock-transfers', payload: () => ({ transferNo: 'SWST' + rnd(), fromWarehouse: 'A', toWarehouse: 'B', items: [{ materialCode: 'M', quantity: 1 }] }) },
  { res: 'inventory-adjustments', base: 'inventory-adjustments', payload: () => ({ adjustmentNo: 'SWIA' + rnd(), type: 'count', items: [{ materialCode: 'M', quantity: 1, diffQty: 1 }] }) },
  { res: 'work-orders', base: 'work-orders', payload: () => ({ workOrderNo: 'SWWO' + rnd(), productCode: 'P', quantity: 1 }) },
  { res: 'work-orders/picking', base: 'work-orders/picking', payload: () => ({ pickingNo: 'SWPK' + rnd(), workOrderId: 'x', items: [{ materialCode: 'M', quantity: 1 }] }) },
  { res: 'process-routes', base: 'process-routes', payload: () => ({ routeNo: 'SWRT' + rnd(), productCode: 'P', operations: [] }) },
  { res: 'vouchers', base: 'vouchers', payload: () => ({ id: 'SWPV' + stamp + rnd(), voucherNo: 'SWPV' + rnd(), date: '2026-09-19', voucherType: '记', status: 'draft', currency: 'CNY', items: [{ lineNo: 1, summary: 's', accountCode: '1001', accountName: '现金', debit: 10, credit: 0 }, { lineNo: 2, summary: 's', accountCode: '2201', accountName: '暂估', debit: 0, credit: 10 }] }) },
  { res: 'print-templates', base: 'print-templates', payload: () => ({ name: 'Sweep Tpl ' + rnd(), type: 'material', content: '<div></div>' }) },
  { res: 'approval-flows', base: 'approval-flows', payload: () => ({ name: 'Sweep Flow ' + rnd(), nodes: [] }) },
  { res: 'customers', base: 'customers', payload: () => ({ code: 'SWC' + rnd(), name: 'Sweep Customer ' + rnd() }) },
  { res: 'vendors', base: 'vendors', payload: () => ({ code: 'SWV' + rnd(), name: 'Sweep Vendor ' + rnd() }) },
  { res: 'fin-payment-plans', base: 'fin-payment-plans', payload: () => ({ planNo: 'SWFP' + rnd(), projectId: 'x', installments: [] }) },
  { res: 'fin-project-accounts', base: 'fin-project-accounts', payload: () => ({ accountNo: 'SWFA' + rnd(), projectId: 'x', costItems: [] }) },
  { res: 'serial-numbers', base: 'serial-numbers', payload: () => ({ materialCode: 'M', serialNo: 'SWSE' + rnd(), quantity: 1 }) },
  { res: 'subcontracts', base: 'subcontracts', payload: () => ({ contractNo: 'SWSC' + rnd(), vendorId: 'x' }) },
  { res: 'projects', base: 'projects', payload: () => ({ code: 'SWPRJ' + rnd(), name: 'Sweep Project ' + rnd() }) },
  // orgs / users：跳过合法创建（避免发邮件等副作用），仍做空 body 校验探测
  { res: 'orgs', base: 'orgs', payload: null },
  { res: 'users', base: 'users', payload: null },
];

// 动态低代码资源（[resource]/[type]/[key]）：用样例值，不建合法数据，仅探测
const DYNAMIC = [
  { res: 'entities/[resource]', base: 'entities/materials', detail: 'entities/materials' },
  { res: 'open/[resource]', base: 'open/materials', detail: 'open/materials' },
  { res: 'state/[key]', base: 'state/app', detail: null },
  { res: 'protected-data/[type]', base: 'protected-data/org', detail: null },
];

// 只读 GET 资源（无标准创建）
const READONLY = [
  'inventory-records', 'planned-orders', 'alerts', 'ai/models', 'chatbi', 'consolidation',
  'fx', 'audit', 'audit/logs', 'system/audit-health', 'system/jobs', 'system/mail-config',
  'orgs/company-code', 'auth/me', 'auth/profile', 'auth/security-mailbox', 'auth/activate',
];

// 动作型 POST（非标准 CRUD，空 body 探测；不清理）
const ACTIONS = [
  { path: 'ai/chat', body: () => ({ message: 'hi' }) },
  { path: 'chatbi/analyze', body: () => ({ question: 'hi' }) },
  { path: 'fx/refresh', body: () => ({}) },
  { path: 'ocr/recognize', body: () => ({}) },
  { path: 'system/notify', body: () => ({}) },
  { path: 'system/restore', body: () => ({}) },
  { path: 'system/backup', body: () => ({}) },
  { path: 'system/migrate-materials', body: () => ({}) },
  { path: 'tax-gateway/verify', body: () => ({}) },
  { path: 'tax-gateway/index', body: () => ({}) },
  { path: 'three-way-match/create', body: () => ({}) },
  { path: 'vendor/login', body: () => ({ username: 'x', password: 'x' }), public: true },
  { path: 'vendor/register', body: () => ({ username: 'x', password: 'x' }), public: true },
  { path: 'auth/logout', body: () => ({}), auth: true },
  { path: 'auth/logout-all', body: () => ({}), auth: true },
  { path: 'auth/change-password', body: () => ({ oldPassword: 'x', newPassword: 'y' }), auth: true },
  { path: 'auth/register', body: () => ({ username: 'x', password: 'x', name: 'x' }), auth: false },
  { path: 'auth/send-code', body: () => ({ email: 'x@x.com' }), auth: false },
  { path: 'auth/verify-code', body: () => ({ email: 'x@x.com', code: '123456' }), auth: false },
  { path: 'auth/reset-password-send', body: () => ({ email: 'x@x.com' }), auth: false },
  { path: 'auth/reset-password-confirm', body: () => ({ token: 'x', password: 'y' }), auth: false },
  { path: 'auth/profile', body: () => ({ name: 'Sweep' }), method: 'PUT', auth: true },
];

// 生成探针
const probes = [];
for (const c of CRUD) {
  const base = '/api/' + c.base;
  probes.push({ cat: 'list', domain: c.res, method: 'GET', path: base, auth: true });
  probes.push({ cat: 'unauth-list', domain: c.res, method: 'GET', path: base, auth: false });
  probes.push({ cat: 'create-empty', domain: c.res, method: 'POST', path: base, auth: true, body: {} });
  probes.push({ cat: 'unauth-create', domain: c.res, method: 'POST', path: base, auth: false, body: {} });
  if (c.payload) probes.push({ cat: 'create-valid', domain: c.res, method: 'POST', path: base, auth: true, bodyFn: c.payload, capture: true });
  const det = base + '/' + FAKE;
  probes.push({ cat: 'detail-get', domain: c.res, method: 'GET', path: det, auth: true });
  probes.push({ cat: 'unauth-detail', domain: c.res, method: 'GET', path: det, auth: false });
  probes.push({ cat: 'detail-put', domain: c.res, method: 'PUT', path: det, auth: true, body: {} });
  probes.push({ cat: 'detail-del', domain: c.res, method: 'DELETE', path: det, auth: true });
}
for (const d of DYNAMIC) {
  const base = '/api/' + d.base;
  probes.push({ cat: 'list', domain: d.res, method: 'GET', path: base, auth: true });
  probes.push({ cat: 'unauth-list', domain: d.res, method: 'GET', path: base, auth: false });
  if (d.detail) {
    const det = '/api/' + d.detail + '/' + FAKE;
    probes.push({ cat: 'detail-get', domain: d.res, method: 'GET', path: det, auth: true });
    probes.push({ cat: 'unauth-detail', domain: d.res, method: 'GET', path: det, auth: false });
    probes.push({ cat: 'detail-put', domain: d.res, method: 'PUT', path: det, auth: true, body: {} });
    probes.push({ cat: 'detail-del', domain: d.res, method: 'DELETE', path: det, auth: true });
  }
}
for (const r of READONLY) {
  const base = '/api/' + r;
  probes.push({ cat: 'list', domain: r, method: 'GET', path: base, auth: true });
  probes.push({ cat: 'unauth-list', domain: r, method: 'GET', path: base, auth: false });
}
for (const a of ACTIONS) {
  const base = '/api/' + a.path;
  const method = a.method || 'POST';
  const auth = a.auth !== undefined ? a.auth : true;
  probes.push({ cat: 'action', domain: a.path, method, path: base, auth, bodyFn: a.body, public: a.public });
  if (!a.public) probes.push({ cat: 'unauth-action', domain: a.path, method, path: base, auth: false, bodyFn: a.body });
}

// ── 执行 ───────────────────────────────────────────────────────────
const results = [];
const created = []; // 需要清理的 {domain, path, id}

console.log(`\n══ 后端端点真实往返扫描 ══\n基址：${BASE}\n探针数：${probes.length}\n`);

let token = null;
// 登录
{
  const r = await call('POST', '/api/auth/login', null, { username: cred.username, password: cred.password });
  if (r.status === 200 && r.data?.token) {
    token = r.data.token;
    console.log(`✅ 登录成功（用户 ${r.data.user?.username} / 组织 ${r.data.user?.org_id}）`);
  } else {
    console.log(`❌ 登录失败 status=${r.status} body=${(r.text || '').slice(0, 200)}`);
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let idx = 0;
for (const p of probes) {
  idx++;
  const body = p.bodyFn ? p.bodyFn() : p.body;
  const r = await call(p.method, p.path, p.auth ? token : null, body);
  // 错误规范性检测
  let errField = false, leak = false;
  if (r.status >= 400) {
    errField = r.isJSON && (r.data && (r.data.error !== undefined || r.data.code !== undefined));
    if (!r.isJSON) errField = false;
    leak = LEAK_RE.test(r.text);
  }
  // 判定
  let verdict = '通过';
  const pub = p.public || isPublic(p.path);
  switch (p.cat) {
    case 'list':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401) verdict = '鉴权缺失(带token却401)';
      else if (!(r.status === 200 && r.isJSON)) verdict = '不规范/非预期';
      break;
    case 'unauth-list':
    case 'unauth-detail':
    case 'unauth-create':
    case 'unauth-action':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401 || r.status === 403) verdict = '通过';
      else if (pub) verdict = '通过(公开端点)';
      else verdict = '鉴权缺失(未带token却' + r.status + ')';
      break;
    case 'detail-get':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401) verdict = '鉴权缺失';
      else if (r.status === 404) verdict = '通过(查无返回404)';
      else if (r.status === 200) verdict = '可疑(假id竟返回200)';
      else verdict = '不规范(' + r.status + ')';
      break;
    case 'detail-put':
    case 'detail-del':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401) verdict = '鉴权缺失';
      else if (r.status === 404) verdict = '通过(查无返回404)';
      else if (r.status === 400) verdict = '通过(校验拦截)';
      else if (r.status === 200) verdict = '可疑(假id竟' + r.status + ')';
      else verdict = '不规范(' + r.status + ')';
      break;
    case 'create-empty':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401) verdict = '鉴权缺失';
      else if (r.status === 400 || r.status === 409 || r.status === 422) verdict = '通过(已校验)';
      else if (r.status === 200 || r.status === 201) { verdict = '未校验(空body竟' + r.status + ')'; captureCreated(p, r); }
      else verdict = '不规范(' + r.status + ')';
      break;
    case 'create-valid':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401) verdict = '鉴权缺失';
      else if (r.status === 200 || r.status === 201) { verdict = '通过(创建成功)'; captureCreated(p, r); }
      else if (r.status === 400 || r.status === 409) verdict = '通过(被校验/约束拦截)';
      else verdict = '不规范(' + r.status + ')';
      break;
    case 'action':
      if (r.status === 500) verdict = '500';
      else if (r.status === 401) verdict = '鉴权缺失';
      else if (r.isJSON) verdict = '通过';
      else verdict = '不规范(非JSON ' + r.status + ')';
      break;
  }
  // 错误规范性
  if (r.status >= 400 && r.status !== 500) {
    if (!r.isJSON) verdict = '不规范(错误体非JSON)';
    else if (!errField) verdict = '不规范(无error字段)';
    if (leak) verdict = '不规范(泄露堆栈/DB原文)';
  }
  if (r.status === 500 && leak) verdict = '500(泄露原文)';

  const ev = (r.text || '').replace(/\s+/g, ' ').slice(0, 160);
  results.push({ ...p, status: r.status, isJSON: r.isJSON, verdict, ev, leak });
  process.stdout.write(`\r  进度 ${idx}/${probes.length}`);
  await sleep(25); // 降低并发速率，规避 Cloudflare 在高速突发下把 API 请求误判为静态回退/405 的假象
}

function captureCreated(p, r) {
  let id = r.data?.id ?? r.data?.data?.id ?? (Array.isArray(r.data?.data) ? r.data.data[0]?.id : null);
  if (id) created.push({ domain: p.domain, path: '/api/' + p.base + '/' + id, id });
}

// ── 清理自建数据 ───────────────────────────────────────────────────
// 记录自建 id 到 JSON，便于二次清理脚本兜底（防止瞬态 405 残留脏数据）
mkdirSync(resolve(ROOT, 'tmp'), { recursive: true });
writeFileSync(resolve(ROOT, 'tmp/sweep_created.json'), JSON.stringify(created, null, 2), 'utf8');

console.log(`\n\n── 清理自建测试数据（${created.length} 条）──`);
const cleanupResults = [];
const delWithRetry = async (path) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await call('DELETE', path, token, undefined);
    if (r.status === 200 || r.status === 404) return r;
    await new Promise((res) => setTimeout(res, 800));
  }
  return await call('DELETE', path, token, undefined);
};
for (const c of created) {
  const r = await delWithRetry(c.path);
  cleanupResults.push({ domain: c.domain, id: c.id, status: r.status });
  console.log(`  ${r.status === 200 || r.status === 404 ? '✅' : '⚠️'} ${c.domain} id=${c.id} → DELETE ${r.status}`);
}
// 二次确认：对清理项再 GET 一次
for (const c of created) {
  const r = await call('GET', c.path, token, undefined);
  if (r.status !== 404) cleanupResults.push({ domain: c.domain, id: c.id, status: r.status, recheck: true });
}

// ── 统计 ───────────────────────────────────────────────────────────
const uniqEndpoints = new Set(results.map((r) => r.method + ' ' + r.path));
const total = uniqEndpoints.size;
const counts = {};
for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
const n500 = results.filter((r) => r.verdict.startsWith('500')).length;
const nAuthGap = results.filter((r) => r.verdict.includes('鉴权缺失')).length;
const nUnvalid = results.filter((r) => r.verdict.includes('未校验')).length;
const nNonStd = results.filter((r) => r.verdict.includes('不规范')).length;
const healthy = results.filter((r) => r.verdict === '通过' || r.verdict === '通过(公开端点)' || r.verdict.startsWith('通过(')).length;
// 健康端点（按唯一端点去重）
const healthyEndpoints = new Set(results.filter((r) => r.verdict.startsWith('通过')).map((r) => r.method + ' ' + r.path)).size;

// ── 落盘报告 ───────────────────────────────────────────────────────
// 固定路径、单一权威文件（与项目「同一事项只保留一个最新文件」的约定一致）
mkdirSync(resolve(ROOT, 'test-reports/api-sweep'), { recursive: true });
const out = [];
out.push(`# SSA ERP 后端端点真实往返扫描报告`);
out.push('');
out.push(`- 基址：${BASE}`);
out.push(`- 扫描时间：${new Date().toISOString()}`);
out.push(`- 登录用户：${cred.username}（组织 ${''}）`);
out.push(`- 探针总数：${probes.length}　唯一端点：${total}`);
out.push('');
out.push(`## 一、汇总`);
out.push('');
out.push(`| 指标 | 数值 |`);
out.push(`| --- | --- |`);
out.push(`| 实测端点数（唯一 method+path） | ${total} |`);
out.push(`| 探针次数 | ${probes.length} |`);
out.push(`| 健康数（行为符合预期） | ${healthyEndpoints} |`);
out.push(`| 健康率 | ${total ? ((healthyEndpoints / total) * 100).toFixed(1) : 0}% |`);
out.push(`| 500 端点数（含泄露原文） | ${n500} |`);
out.push(`| 鉴权缺失数 | ${nAuthGap} |`);
out.push(`| 入参未校验数 | ${nUnvalid} |`);
out.push(`| 错误返回不规范数 | ${nNonStd} |`);
out.push('');
out.push(`### 判定分布`);
out.push('');
for (const [k, v] of Object.entries(counts)) out.push(`- ${k}: ${v}`);
out.push('');

out.push(`## 二、端点清单与逐个结果`);
out.push('');
out.push(`| 方法 | 路径 | 状态码 | 是否JSON | 判定 | 证据(响应体片段) |`);
out.push(`| --- | --- | --- | --- | --- | --- |`);
for (const r of results) {
  const path = r.path.length > 46 ? r.path.slice(0, 46) + '…' : r.path;
  const ev = r.ev.replace(/\|/g, '\\|');
  out.push(`| ${r.method} | ${path} | ${r.status} | ${r.isJSON ? '是' : '否'} | ${r.verdict} | ${ev} |`);
}
out.push('');

out.push(`## 三、500 端点（最值钱 · 响应体原文）`);
out.push('');
const f500 = results.filter((r) => r.verdict.startsWith('500'));
if (f500.length === 0) {
  out.push(`本轮未检测到 500 端点。`);
} else {
  for (const r of f500) {
    out.push(`### ${r.method} ${r.path} — ${r.status}`);
    out.push('');
    out.push('```');
    out.push((r.ev || '').slice(0, 800));
    out.push('```');
    out.push('');
  }
}
out.push('');

out.push(`## 四、鉴权缺失 / 未校验 / 不规范 明细`);
out.push('');
const defects = results.filter((r) => r.verdict.includes('鉴权缺失') || r.verdict.includes('未校验') || r.verdict.includes('不规范') || r.verdict.includes('可疑'));
if (defects.length === 0) out.push('未发现问题项。');
else {
  out.push(`| 方法 | 路径 | 状态码 | 判定 | 证据 |`);
  out.push(`| --- | --- | --- | --- | --- |`);
  for (const r of defects) {
    const path = r.path.length > 50 ? r.path.slice(0, 50) + '…' : r.path;
    out.push(`| ${r.method} | ${path} | ${r.status} | ${r.verdict} | ${(r.ev || '').replace(/\|/g, '\\|').slice(0, 120)} |`);
  }
}
out.push('');

out.push(`## 五、测试数据清理确认`);
out.push('');
if (created.length === 0) {
  out.push(`本轮未创建任何测试数据（所有创建探针均被校验拦截，未产生脏数据）。`);
} else {
  out.push(`共创建并清理 ${created.length} 条测试数据：`);
  out.push('');
  out.push(`| 域 | id | DELETE状态 | 二次确认 |`);
  out.push(`| --- | --- | --- | --- |`);
  for (const c of created) {
    const cr = cleanupResults.find((x) => x.id === c.id && !x.recheck);
    const re = cleanupResults.find((x) => x.id === c.id && x.recheck);
    out.push(`| ${c.domain} | ${c.id} | ${cr?.status ?? '?'} | ${re ? 'GET=' + re.status : '未复检'} |`);
  }
  out.push('');
  const bad = cleanupResults.filter((x) => x.recheck && x.status !== 404);
  out.push(bad.length === 0 ? `✅ 全部测试数据已确认清理干净（复检均返回 404）。` : `⚠️ 仍有 ${bad.length} 条数据复检未返回 404，需人工核查：` + bad.map((b) => b.id).join(', '));
}
out.push('');

const reportPath = resolve(ROOT, 'test-reports/api-sweep/latest.md');
writeFileSync(reportPath, out.join('\n'), 'utf8');

// 控制台摘要
console.log(`\n══ 扫描完成 ══`);
console.log(`唯一端点：${total}　健康：${healthyEndpoints}（${total ? ((healthyEndpoints / total) * 100).toFixed(1) : 0}%）`);
console.log(`500：${n500}　鉴权缺失：${nAuthGap}　未校验：${nUnvalid}　不规范：${nNonStd}`);
console.log(`自建数据：${created.length} 条，清理：${cleanupResults.filter((x) => !x.recheck).length} 次`);
console.log(`报告已落盘：${reportPath}`);

// ── 退出码（常驻检查工具的关键）─────────────────────────────────────
// 判据只取「500」。为什么不用「鉴权缺失 / 未校验 / 不规范」当阻断项：
//   这三类的判定含大量启发式（例如某些端点本就允许公开、某些字段本就可选），
//   现在的结果里就有不少是「看似未校验、实为可选」。把它们做成阻断项，
//   第一次跑就会红一片，然后所有人学会忽略这个红灯 —— 那比没有更差。
//   等这些启发式收敛到可信之后，再逐步升级为阻断项。
if (n500 > 0) {
  console.error(`\n❌ 检出任一 500 端点视为后端缺陷：共 ${n500} 处。详见 ${reportPath}`);
  process.exit(1);
}
console.log('\n✅ 未检出任一 500 端点。');
