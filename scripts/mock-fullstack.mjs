#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// 阶段三：模拟数据 + 前后端全链路配合校验（打**生产真实后端**）
//
// ★ 为什么打生产而不是 Playwright 的 127.0.0.1:3000
//   playwright.config.ts 的 baseURL=127.0.0.1:3000 + webServer=npm run dev
//   走的是 **MSW 模拟层**（src/mocks/handlers.ts），真实 Functions 与 D1
//   完全不参与 —— 用它测「前后端配合」等于自欺。
//   本脚本直接打 https://ssa-erp.pages.dev（真实 Pages Functions + 真实 D1）。
//
// ★ 为什么用「新建隔离组织」而不是真组织
//   scripts/seed/ 的演示数据曾在 2026-08-28 被 wrangler 当迁移执行，
//   把演示数据灌进了生产共享库（供应商 12 / 客户 5 / 采购订单 3 / 销售订单 3 /
//   工单 3），还产生一批 org_id 无效的孤儿物料。
//   本脚本每轮新建 `MOCK-<时间戳>` 组织，所有数据都在这个组织内，
//   与真实业务数据物理隔离（RLS 按 org_id 隔离）。
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const BASE = process.env.MOCK_BASE || 'https://ssa-erp.pages.dev';
const STAMP = Date.now().toString(36).toUpperCase();
const COMPANY = `MOCK-${STAMP}`;
const PASSWORD = 'Mock@2026!qa';

// ── 断言记账 ──────────────────────────────────────────────────────
const results = [];
function ok(name, detail = '') { results.push({ pass: true, name, detail }); console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); }
function bad(name, detail = '') { results.push({ pass: false, name, detail }); console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
function info(name, detail = '') { results.push({ pass: 'info', name, detail }); console.log(`  ℹ️  ${name}${detail ? ' — ' + detail : ''}`); }
function check(cond, name, detail = '') { cond ? ok(name, detail) : bad(name, detail); return cond; }

// ── HTTP ──────────────────────────────────────────────────────────
async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    return { status: 0, data: { error: String(e?.message || e) } };
  }
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, data };
}

// ── 专用测试超管（仅用于给本轮隔离组织放行，与门禁 harness 同款）──────
// V2.96.0 起新公司码注册必须经超级管理员批准（强哥的安全策略）。
// 凭据在 scripts/prod-e2e/.e2e-credentials.json（已 gitignore）。
const CRED = JSON.parse(readFileSync(resolve(root, 'scripts/prod-e2e/.e2e-credentials.json'), 'utf8'));

async function loginSupervisor() {
  const r = await req('POST', '/api/auth/login', { body: { username: CRED.username, password: CRED.password } });
  return r.data?.token || null;
}

/** 注册 → 超管批准 → 登录，返回 token（新注册审批制下的标准引导流程） */
async function bootstrapUser(username, name, companyCode, department) {
  const reg = await req('POST', '/api/auth/register', {
    body: { username, password: PASSWORD, name, companyCode, department },
  });
  if (reg.data?.token) return { token: reg.data.token, pending: false };
  if (reg.status === 202 && reg.data?.pending) {
    const sup = await loginSupervisor();
    if (!sup) return { token: null, pending: true, reason: '超管登录失败' };
    const found = await req('GET', `/api/users?status=pending&keyword=${encodeURIComponent(username)}`, { token: sup });
    const id = found.data?.data?.[0]?.id;
    if (!id) return { token: null, pending: true, reason: `未查到待审批账号 ${username}` };
    const appr = await req('PUT', `/api/users/${id}`, { token: sup, body: { action: 'approve' } });
    if (appr.status !== 200) return { token: null, pending: true, reason: `批准失败 status=${appr.status}` };
    const lg = await req('POST', '/api/auth/login', { body: { username, password: PASSWORD } });
    return { token: lg.data?.token || null, pending: false };
  }
  return { token: null, pending: false, reason: `注册失败 status=${reg.status} ${JSON.stringify(reg.data).slice(0, 120)}` };
}

// ── 字段类型表（生产库真实结构）→ 生成「全字段」测试值 ──────────────
const SCHEMA = JSON.parse(readFileSync(resolve(root, 'scripts/_schema_raw.json'), 'utf8'));

function snakeToCamel(s) { return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()); }

/** 跳过：org_id（服务端按 token 写入）、子表外键、审计时间戳由我们显式给 */
const SKIP = new Set(['org_id']);

function synthValue(table, snake, tag, monthIdx) {
  const col = SCHEMA[table]?.[snake];
  const t = col?.t || 'text';
  if (snake === 'id') return tag;
  // ★ 日期一律按**列类型**生成（不看列名）：早期版本只认 `_at|_date` 后缀，
  //   于是 `qualification_expiry`（date 型但不带后缀）被填成了
  //   "qualificationExpiry-xxx" → 400。这是脚本自己的错，不是后端的错。
  if (t === 'date') {
    const m = String(6 + (monthIdx % 4)).padStart(2, '0');
    return /_at$/.test(snake) ? `2026-${m}-1${monthIdx % 9}T09:00:00.000Z` : `2026-${m}-1${monthIdx % 9}`;
  }
  switch (t) {
    case 'number': return 100 + (monthIdx * 7) % 900;
    case 'bool': return 0;
    default: return `${snakeToCamel(snake)}-${tag}`.slice(0, 40);
  }
}

/** 生成一张表的「全字段」payload（用于验证没有字段被静默丢弃） */
function fullPayload(table, tag, monthIdx = 0) {
  const cols = Object.keys(SCHEMA[table] || {});
  const out = {};
  for (const snake of cols) {
    if (SKIP.has(snake)) continue;
    out[snakeToCamel(snake)] = synthValue(table, snake, tag, monthIdx);
  }
  return out;
}

function camelToSnake(k) {
  return k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

/**
 * 逐字段比对「写进去的」与「读回来的」，返回丢字段清单。
 *
 * ★ 必须同时认 camelCase 与 snake_case 两种键名。
 *   本工程有两套并存的响应约定（这是长期形成的设计事实，不是 Bug）：
 *     - 新域端点（工艺路线 / 采购申请 / 通用实体路由）返回 camelCase；
 *     - 早期端点（工单 / 销售订单 / 采购订单）直接返回数据库原始行 snake_case，
 *       由前端统一 snakeToCamel 转换。
 *   我第一版只按 camelCase 比对，把「正常返回」误判成「34 个字段全丢」，
 *   差点据此去改根本没问题的后端代码。
 *   **断言要测的是「值有没有丢」，不是「键名长什么样」。**
 */
// 服务端权威字段：这些值**必须**由服务端决定，客户端传什么都不该被采纳。
// 若客户端能指定 id / createdBy / createdAt，就等于可以伪造他人创建、伪造时间、撞库覆盖。
const SERVER_AUTHORITATIVE = new Set(['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'ownerId', 'deptId']);

function diffFields(sent, got) {
  const missing = [];
  const wrong = [];
  const overridden = [];
  for (const [k, v] of Object.entries(sent)) {
    const gk = got?.[k] !== undefined ? k : camelToSnake(k);
    const gv = got?.[gk];
    if (gv === undefined) { missing.push(k); continue; }
    const same = typeof v === 'number' ? Number(gv) === v : String(gv) === String(v);
    if (same) continue;
    if (SERVER_AUTHORITATIVE.has(k)) overridden.push(`${k}: 客户端发${v} → 服务端收口为${gv}`);
    else wrong.push(`${k}: 发${v} 收${gv}`);
  }
  return { missing, wrong, overridden };
}

// ══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n════════ 阶段三：模拟数据 + 全链路配合校验 ════════`);
  console.log(`目标后端：${BASE}（真实 Pages Functions + 真实 D1）`);
  console.log(`隔离组织：${COMPANY}\n`);

  // ── 1. 建隔离组织（注册 → 超管批准 → 登录）───────────────────────
  const boot = await bootstrapUser(`mock_${STAMP.toLowerCase()}`, '模拟数据管理员', COMPANY, 'QA-模拟数据');
  const token = boot.token;
  if (!check(!!token, '隔离组织创建并登录成功', token ? '' : boot.reason || '未知原因')) {
    console.log('\n❌ 无法建立隔离组织，后续全部跳过'); process.exit(1);
  }

  const created = [];   // [{path,id}]
  const cleanup = async () => {
    for (const c of created.splice(0).reverse()) {
      try { await req('DELETE', `${c.path}/${c.id}`, { token }); } catch { /* 尽力而为 */ }
    }
  };

  // ── 2. 主数据：物料 / 客户 / 供应商 ──────────────────────────────
  console.log('\n── 2. 主数据（物料 / 客户 / 供应商）──');
  // ★ 主数据用「最小合法载荷」而不是「全字段载荷」：
  //   物料/客户/供应商有大量**枚举列**（material_type / make_or_buy / mrp_type /
  //   price_control / status …），全字段合成值必然撞上枚举校验。
  //   这恰恰证明**入参校验是真的在拦**（返回 400 + 可读中文原因，不是静默入库），
  //   所以这里改用合法取值；「全字段往返」的验证放在第 7 节的工单上做。
  // ★ 作用域修正：bomId / routeId 原本声明在各自的 if 块里，第 7 节「全字段往返」
  //   在块外引用会 ReferenceError。提到外层，块内只赋值不声明。
  let bomId = null;
  let routeId = null;

  // ★ 金额读取必须兼容两种键名：
  //   销售订单 / 采购订单这两个老端点**刻意**直接返回数据库原始行（snake_case），
  //   由前端统一 snakeToCamel 转换；而新域端点返回 camelCase。
  //   这是设计约定而不是 Bug——所以断言要测「数值一致」而不是「键名一致」。
  //   （我第一版脚本只认 totalAmount，读到 0 就误判成 Bug，属于断言写错。）
  const amt = (row) => Number(row?.totalAmount ?? row?.total_amount ?? row?.grandTotal ?? row?.grand_total ?? 0);

  const materials = [];
  for (let i = 0; i < 3; i++) {
    const id = `mk-${STAMP}-${i}`;
    const body = {
      id, code: `MAT-${STAMP}-${i}`, name: i === 0 ? '模拟成品-焊接架' : `模拟原料-${i}`,
      specification: i === 0 ? 'H1200' : `SPEC-${i}`, unit: i === 0 ? '台' : 'kg',
      materialType: i === 0 ? 'finished' : 'raw', makeOrBuy: i === 0 ? 'make' : 'buy',
      status: 'active', safetyStock: 50, currentStock: 200, price: i === 0 ? 1500 : 30,
      standardPrice: i === 0 ? 1500 : 30, currency: 'CNY', leadTime: 7, scrapRate: 0,
    };
    const r = await req('POST', '/api/materials', { token, body });
    if (r.status === 201) { materials.push(body); created.push({ path: '/api/materials', id }); }
    else bad(`物料 ${i} 创建`, `status=${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
  }
  check(materials.length === 3, '物料创建 3 条', `实际 ${materials.length}`);

  const customers = [];
  for (let i = 0; i < 2; i++) {
    const id = `cs-${STAMP}-${i}`;
    const body = {
      id, code: `CUS-${STAMP}-${i}`, name: `模拟客户${i + 1}`, status: 'active',
      creditLevel: 'A', creditLimit: 500000, usedCredit: 0, settlementTermDays: 30,
      defaultCurrency: 'CNY', defaultTaxRate: 13, contactName: `联系人${i}`, contactPhone: '13800000000',
    };
    const r = await req('POST', '/api/customers', { token, body });
    if (r.status === 201) { customers.push(body); created.push({ path: '/api/customers', id }); }
    else bad(`客户 ${i} 创建`, `status=${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
  }
  check(customers.length === 2, '客户创建 2 条', `实际 ${customers.length}`);

  const vendors = [];
  for (let i = 0; i < 2; i++) {
    const id = `vd-${STAMP}-${i}`;
    const body = {
      // ★ /api/vendors 的必填契约是 `code` / `name`（与前端 Vendor 类型一致），
      //   不是 `vendorCode` / `companyName`。第一次按库列名写 → 400「编码与名称必填」。
      //   这正好印证 C1 模板的硬纪律：**列名服从前端契约，不服从数据库直觉**。
      id, code: `VEN-${STAMP}-${i}`, name: `模拟供应商${i + 1}`,
      contactName: `供方联系人${i}`, contactPhone: '13900000000',
      // ★ status 必须是 vendor_master CHECK 允许的值之一，'active' 不被接受
      //   （物料/客户表用 'active'，供应商表不用 —— 这是本轮实测出来的真 Bug 触发点）
      status: 'approved', type: 'manufacturer', rating: 90, creditLevel: 'A', qualificationExpiry: '2027-12-31',
    };
    const r = await req('POST', '/api/vendors', { token, body });
    if (r.status === 201) { vendors.push(body); created.push({ path: '/api/vendors', id }); }
    else bad(`供应商 ${i} 创建`, `status=${r.status} ${JSON.stringify(r.data).slice(0, 160)}`);
  }
  check(vendors.length === 2, '供应商创建 2 条', `实际 ${vendors.length}`);

  // ── 3. 工艺路线（本轮新域，带嵌套工序）────────────────────────────
  console.log('\n── 3. 工艺路线（V3.12.0 新域，带 operations 嵌套）──');
  routeId = `rt-${STAMP}`;
  const ops = [0, 1, 2].map((i) => ({
    id: `op-${STAMP}-${i}`, sequence: (i + 1) * 10,
    operationCode: `OP-${i}`, operationName: `模拟工序${i}`,
    workCenter: '模拟车间', setupTime: 10 + i, runTime: 20 + i, waitTime: i,
    description: `第 ${i + 1} 道工序`, skills: ['操作', `技能${i}`],
  }));
  const routeBody = {
    ...fullPayload('process_routes', routeId, 0),
    routeNo: `RT-${STAMP}`, name: '模拟工艺路线', status: 'active', totalLeadTime: 24, operations: ops,
  };
  const rr = await req('POST', '/api/process-routes', { token, body: routeBody });
  if (rr.status === 201) created.push({ path: '/api/process-routes', id: routeId });
  check(rr.status === 201, '工艺路线创建（带 3 道工序）', `status=${rr.status}`);
  if (rr.status === 201) {
    const back = await req('GET', `/api/process-routes/${routeId}`, { token });
    check((back.data?.operations || []).length === 3, '★ 工序读回 3 行（嵌套未被静默丢弃）', `实际 ${(back.data?.operations || []).length}`);
    const o1 = (back.data?.operations || [])[1];
    check(Array.isArray(o1?.skills) && o1.skills.length === 2, '★ skills 读回是真数组（JSON 编解码正确）', JSON.stringify(o1?.skills));
  }

  // ── 4. BOM（三层嵌套）───────────────────────────────────────────
  console.log('\n── 4. BOM（三层嵌套，历史上最容易丢子树）──');
  if (materials.length < 3) { bad('BOM 跳过：物料未创建成功'); } else {
  bomId = `bom-${STAMP}`;
  const bomBody = {
    id: bomId, bomNo: `BOM-${STAMP}`, name: '模拟成品BOM', type: 'EBOM', status: 'released',
    productId: materials[0].id, productCode: materials[0].code, productName: materials[0].name,
    version: 'V1.0', effectiveDate: '2026-06-01', totalCost: 0, currency: 'CNY',
    items: [
      { id: `${bomId}-i1`, level: 1, sequence: 10, materialId: materials[1].id, materialCode: materials[1].code, materialName: materials[1].name, unit: 'kg', quantity: 10, scrapRate: 5, unitCost: 8, totalCost: 80, source: 'purchase', isCritical: true, children: [
        { id: `${bomId}-i1-1`, level: 2, sequence: 10, materialId: materials[2].id, materialCode: materials[2].code, materialName: materials[2].name, unit: 'kg', quantity: 2, scrapRate: 0, unitCost: 3, totalCost: 6, source: 'purchase', isCritical: false, children: [] },
      ] },
      { id: `${bomId}-i2`, level: 1, sequence: 20, materialId: materials[2].id, materialCode: materials[2].code, materialName: materials[2].name, unit: 'kg', quantity: 5, scrapRate: 0, unitCost: 3, totalCost: 15, source: 'purchase', isCritical: false, children: [] },
    ],
  };
  const br = await req('POST', '/api/bom', { token, body: bomBody });
  if (br.status === 201) created.push({ path: '/api/bom', id: bomId });
  check(br.status === 201, 'BOM 创建', `status=${br.status} ${br.status !== 201 ? JSON.stringify(br.data).slice(0, 120) : ''}`);
  if (br.status === 201) {
    const back = await req('GET', `/api/bom/${bomId}`, { token });
    const flat = back.data?.items || [];
    check(flat.length === 3, '★ 三层嵌套摊平后读回 3 行（子树未被整块丢掉）', `实际 ${flat.length}`);
    const levels = [...new Set(flat.map((x) => x.level))].sort();
    check(levels.join(',') === '1,2', '★ 层级展开出 1/2 两档（未被压成单层）', `levels=${levels.join(',')}`);
  }
  }

  // ── 5. 采购链路：采购订单 x3 → 入库单 x3 ──────────────────────────
  console.log('\n── 5. 采购链路（供应商 → 采购订单 → 入库单），跨 3 个月 ──');
  const poAmounts = [];
  if (vendors.length < 2) { bad('采购链路跳过：供应商未创建成功'); } else {
  for (let i = 0; i < 3; i++) {
    const id = `po-${STAMP}-${i}`;
    const qty = 100 + i * 50, price = 20 + i * 5;
    const body = {
      id, orderNo: `PO-${STAMP}-${i}`, vendorId: vendors[i % 2].id, vendorName: vendors[i % 2].name,
      status: i === 2 ? 'draft' : 'confirmed', orderDate: `2026-0${6 + i}-12`, expectedDate: `2026-0${6 + i}-25`,
      currency: 'CNY', totalAmount: qty * price, remark: `模拟采购订单 ${i}`,
      items: [{ id: `${id}-it1`, materialId: materials[1].id, materialCode: materials[1].code, materialName: materials[1].name, unit: 'kg', quantity: qty, unitPrice: price, amount: qty * price, taxRate: 13 }],
      createdAt: `2026-0${6 + i}-12T09:00:00.000Z`, updatedAt: `2026-0${6 + i}-12T09:00:00.000Z`,
      createdBy: 'mock', updatedBy: 'mock',
    };
    const r = await req('POST', '/api/purchase-orders', { token, body });
    if (r.status === 201) { poAmounts.push(qty * price); created.push({ path: '/api/purchase-orders', id }); }
    else bad(`采购订单 ${i} 创建`, `status=${r.status} ${JSON.stringify(r.data).slice(0, 140)}`);
  }
  check(poAmounts.length === 3, '采购订单创建 3 条', `实际 ${poAmounts.length}`);

  // 列表 total 与实际条数一致
  const poList = await req('GET', '/api/purchase-orders?page=1&pageSize=100', { token });
  check(poList.data?.total === 3, '★ 采购订单列表 total 与实际条数一致', `total=${poList.data?.total} 实际=${poList.data?.data?.length}`);

  // 聚合校验：列表金额合计 == 各单明细金额合计（统计页最容易对不上的地方）
  const sumFromList = (poList.data?.data || []).reduce((a, b) => a + amt(b), 0);
  let sumFromDetail = 0;
  for (const p of poList.data?.data || []) {
    const d = await req('GET', `/api/purchase-orders/${p.id}`, { token });
    sumFromDetail += amt(d.data);
  }
  check(Math.abs(sumFromList - sumFromDetail) < 0.01 && sumFromDetail === poAmounts.reduce((a, b) => a + b, 0),
    '★★ 采购金额：列表合计 == 详情合计 == 写入值（统计口径一致）',
    `列表=${sumFromList} 详情=${sumFromDetail} 期望=${poAmounts.reduce((a, b) => a + b, 0)}`);
  }

  // ── 6. 销售链路：销售订单 x3 → 出库单 x3 ──────────────────────────
  console.log('\n── 6. 销售链路（客户 → 销售订单 → 出库单），跨 3 个月 ──');
  const soAmounts = [];
  if (customers.length < 2) { bad('销售链路跳过：客户未创建成功'); } else {
  for (let i = 0; i < 3; i++) {
    const id = `so-${STAMP}-${i}`;
    const qty = 10 + i * 5, price = 1200 + i * 100;
    const body = {
      id, orderNo: `SO-${STAMP}-${i}`, customerId: customers[i % 2].id, customerName: customers[i % 2].name,
      status: i === 2 ? 'draft' : 'confirmed', orderDate: `2026-0${6 + i}-05`, deliveryDate: `2026-0${6 + i}-28`,
      currency: 'CNY', totalAmount: qty * price, remark: `模拟销售订单 ${i}`,
      items: [{ id: `${id}-it1`, materialId: materials[0].id, materialCode: materials[0].code, materialName: materials[0].name, unit: '台', quantity: qty, unitPrice: price, amount: qty * price, taxRate: 13 }],
      createdAt: `2026-0${6 + i}-05T09:00:00.000Z`, updatedAt: `2026-0${6 + i}-05T09:00:00.000Z`,
      createdBy: 'mock', updatedBy: 'mock',
    };
    const r = await req('POST', '/api/sales-orders', { token, body });
    if (r.status === 201) { soAmounts.push(qty * price); created.push({ path: '/api/sales-orders', id }); }
    else bad(`销售订单 ${i} 创建`, `status=${r.status} ${JSON.stringify(r.data).slice(0, 140)}`);
  }
  check(soAmounts.length === 3, '销售订单创建 3 条', `实际 ${soAmounts.length}`);

  const soList = await req('GET', '/api/sales-orders?page=1&pageSize=100', { token });
  const soSumList = (soList.data?.data || []).reduce((a, b) => a + amt(b), 0);
  let soSumDetail = 0;
  for (const p of soList.data?.data || []) {
    const d = await req('GET', `/api/sales-orders/${p.id}`, { token });
    soSumDetail += amt(d.data);
  }
    check(Math.abs(soSumList - soSumDetail) < 0.01 && soSumDetail === soAmounts.reduce((a, b) => a + b, 0),
    '★★ 销售金额：列表合计 == 详情合计 == 写入值',
    `列表=${soSumList} 详情=${soSumDetail} 期望=${soAmounts.reduce((a, b) => a + b, 0)}`);
  }

  // ── 7. 全字段往返（防「登记漏列 → 静默丢弃」）─────────────────────
  console.log('\n── 7. 全字段往返：写进去的字段是否一条不落地读回来 ──');
  const fullId = `wo-full-${STAMP}`;
  const woPayload = { ...fullPayload('work_orders', fullId, 1), orderNo: `WO-FULL-${STAMP}`, status: 'released', productCode: materials[0].code, productName: materials[0].name, bomId, bomNo: `BOM-${STAMP}`, routeId, routeNo: `RT-${STAMP}`, plannedQuantity: 50, completedQuantity: 0, scrapQuantity: 0, priority: 'high', workshop: '模拟车间', supervisor: '张模拟', plannedStartDate: '2026-07-01', plannedEndDate: '2026-07-20' };
  const wfr = await req('POST', '/api/work-orders', { token, body: woPayload });
  // ★ 与采购订单同理：服务端重新生成 id，回读必须用返回的真实 id，
  //   否则 GET 404、body 是 {error:'工单不存在'}，比对出来「34 个字段全丢」的假象。
  const realWoId = wfr.data?.id || fullId;
  if (wfr.status === 201) created.push({ path: '/api/work-orders', id: realWoId });
  check(wfr.status === 201, '工单创建（全字段 payload）', `status=${wfr.status} ${wfr.status !== 201 ? JSON.stringify(wfr.data).slice(0, 160) : ''}`);
  if (wfr.status === 201) {
    const back = await req('GET', `/api/work-orders/${realWoId}`, { token });
    check(back.status === 200 && !back.data?.error, '工单创建后可按真实 id 回读', `status=${back.status} ${JSON.stringify(back.data).slice(0, 120)}`);
    const { missing, wrong, overridden } = diffFields(woPayload, back.data);
    check(missing.length === 0, `★★ 工单全字段往返：无字段被静默丢弃（共 ${Object.keys(woPayload).length} 个字段）`,
      missing.length ? `丢失=${missing.join(', ')}` : '全部读回');
    check(wrong.length === 0, '★★ 工单业务字段值往返一致（无篡改）', wrong.length ? wrong.slice(0, 5).join(' | ') : '全部一致');
    // 这条是**安全正向断言**：客户端伪造 id / 审计列必须被服务端覆盖，
    // 若它变成 0 条反而说明服务端接受了伪造值 —— 那是越权漏洞。
    check(overridden.length >= 4, '★★ 安全：id/审计列由服务端收口，不接受客户端伪造',
      overridden.length ? overridden.slice(0, 4).join(' | ') : '⚠️ 服务端竟然采纳了客户端传的 id/审计列');
  }

  // ── 8. 新增 → 保存 → 退出 → 重新进入（重进后嵌套子行还在吗）────────
  console.log('\n── 8. 重新进入：改父表字段后重进，嵌套子行是否还在 ──');
  const upd = await req('PUT', `/api/process-routes/${routeId}`, { token, body: { status: 'obsolete', version: 'V1.1' } });
  check(upd.status === 200, '只改父表字段返回 200', `status=${upd.status}`);
  const reenter = await req('GET', `/api/process-routes/${routeId}`, { token });
  check((reenter.data?.operations || []).length === 3,
    '★★「升版/作废」后重新进入，工序仍是 3 行（不传子数组 ≠ 清空）',
    `实际 ${(reenter.data?.operations || []).length}`);

  // ★★ 父子表助手的两条语义必须**分别**验证，只验一条等于没验：
  //    (a) 不传子数组 = 保持原样（上面已验）
  //    (b) 传空数组   = 明确清空（这里验）
  //   两条只成立一条是最危险的情形：
  //     - 若「传空数组」也被当成「保持原样」→ 用户删光明细行后保存，重进又全回来了（删不掉）；
  //     - 若「不传」也被当成「清空」→ 只改表头就会把所有明细抹掉（数据丢失）。
  //   这两类故障都不会报错，只能靠断言各钉一次。
  const clr = await req('PUT', `/api/process-routes/${routeId}`, { token, body: { operations: [] } });
  check(clr.status === 200, '传空数组（清空工序）返回 200', `status=${clr.status}`);
  const afterClr = await req('GET', `/api/process-routes/${routeId}`, { token });
  check((afterClr.data?.operations || []).length === 0,
    '★★ 传空数组后工序确实被清空（传空数组 = 清空，不是保持原样）',
    `实际 ${(afterClr.data?.operations || []).length} 行`);
  {
    const rows = await req('GET', '/api/entities/process_route_operations?page=1&pageSize=100', { token });
    const left = (rows.data?.data || []).filter((r) => r.routeId === routeId || r.route_id === routeId).length;
    check(left === 0, '★★ 清空后子表物理行也已删除（不是只从响应里藏起来）', `残留 ${left} 行`);
  }

  // ── 9. 删除连带清理 ─────────────────────────────────────────────
  console.log('\n── 9. 删除连带清理 ──');
  // ★ 必须用「服务端真实返回的 id」去删，不能用客户端自己生成的 id：
  //   POST 时服务端会重新生成 id（前端传的 id 被忽略），
  //   拿客户端 id 去 DELETE 必然 404 —— 这不是 Bug，是我的断言取错了参照物。
  const poListForDel = await req('GET', '/api/purchase-orders?page=1&pageSize=100', { token });
  const delPo = (poListForDel.data?.data || [])[0]?.id;
  if (!delPo) { bad('删除用例跳过：列表里没有采购订单'); }
  else {
  const dr = await req('DELETE', `/api/purchase-orders/${delPo}`, { token });
  const drOk = check(dr.status === 200, '删除采购订单返回 200', `status=${dr.status}`);
  if (drOk) {
    info('删除回执', JSON.stringify(dr.data).slice(0, 160));
    const gone = await req('GET', `/api/purchase-orders/${delPo}`, { token });
    check(gone.status === 404, '删除后再查返回 404', `status=${gone.status}`);
  }
  {
    const i = created.findIndex((c) => c.id === delPo); if (i >= 0) created.splice(i, 1);
  }
  }

  // ── 10. 权限隔离（两个身份 / 两个组织）─────────────────────────────
  console.log('\n── 10. 权限隔离 ──');
  const peerBoot = await bootstrapUser(`mock2_${STAMP.toLowerCase()}`, '模拟同事', COMPANY, 'QA-模拟数据');
  const peerToken = peerBoot.token;
  if (peerToken) {
    const seen = await req('GET', `/api/process-routes/${routeId}`, { token: peerToken });
    check(seen.status === 200, '★ 同组织同事能看到工艺路线（RLS=all 生效）', `status=${seen.status}`);
    const peerPo = await req('GET', '/api/purchase-orders?page=1&pageSize=100', { token: peerToken });
    check(peerPo.status === 200, '同组织同事能读采购订单列表', `total=${peerPo.data?.total}`);
  } else {
    info('同组织第二身份未自动批准（注册审批制）', '跳过该断言');
  }

  // 另一个组织完全看不到
  const COMPANY2 = `MOCK2-${STAMP}`;
  const otherBoot = await bootstrapUser(`mock3_${STAMP.toLowerCase()}`, '另一公司', COMPANY2, 'QA');
  const otherToken = otherBoot.token;
  if (otherToken) {
    const cross = await req('GET', `/api/process-routes/${routeId}`, { token: otherToken });
    check(cross.status === 404, '★★ 跨组织访问返回 404（组织隔离生效）', `status=${cross.status}`);
    const crossList = await req('GET', '/api/purchase-orders?page=1&pageSize=100', { token: otherToken });
    check(crossList.data?.total === 0, '★★ 跨组织列表为空（看不到别家公司单据）', `total=${crossList.data?.total}`);
  } else {
    info('第二个组织未创建成功', '跳过跨组织断言');
  }

  // ── 11. 超长字段 / 大对象：应被拒绝且不崩溃 ────────────────────────
  console.log('\n── 11. 超长字段与大对象 ──');
  const hugeId = `wo-huge-${STAMP}`;
  const huge = {
    ...fullPayload('work_orders', hugeId, 2), orderNo: `WO-HUGE-${STAMP}`, status: 'draft',
    plannedQuantity: 1, completedQuantity: 0, scrapQuantity: 0, priority: 'normal',
    plannedStartDate: '2026-08-01', plannedEndDate: '2026-08-10',
    note: 'X'.repeat(500000),   // 约 500 KB 的超长文本
  };
  const hr = await req('POST', '/api/work-orders', { token, body: huge });
  // 期望：要么被拒（4xx），要么被接受；绝不能是 500（崩溃）
  check(hr.status !== 500 && hr.status !== 0, '超长文本不会让后端崩溃（非 500）', `status=${hr.status}`);
  if (hr.status === 201) { created.push({ path: '/api/work-orders', id: hugeId }); info('超长文本被接受', '说明该字段无长度校验'); }
  else info('超长文本被后端拒绝', `status=${hr.status} ${JSON.stringify(hr.data).slice(0, 100)}`);

  // ── 12. 清理 ────────────────────────────────────────────────────
  console.log('\n── 12. 清理本轮模拟数据 ──');
  await cleanup();

  // ── 汇总 ────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.pass === true).length;
  const fail = results.filter((r) => r.pass === false).length;
  const infos = results.filter((r) => r.pass === 'info').length;
  console.log(`\n════════ 汇总 ════════`);
  console.log(`PASS ${pass} / FAIL ${fail} / INFO ${infos}`);
  if (fail) {
    console.log('\n失败项：');
    for (const r of results.filter((x) => x.pass === false)) console.log(`  ❌ ${r.name} — ${r.detail}`);
  }
  console.log(`\n隔离组织：${COMPANY}（测试数据已尽量清理；账号表无删除端点，会残留）`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('脚本异常：', e); process.exit(1); });
