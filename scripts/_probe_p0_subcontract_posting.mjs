// P0-1 专项实测：委外发料到底过不过账？
// 方法：直接打后端 API 走「委外发料」真实链路（前端 issueMaterials → warehouseStore.addOutboundOrder
//   → POST /api/outbound-orders(status=completed,type=subcontract) → 服务端 postOutbound），
//   然后查 D1：materials.current_stock 是否减少、vouchers 是否生成借1408/贷1403。
// 不依赖 UI，避免前端内存态掩盖真实账实。
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://127.0.0.1:8805';
const ROOT = 'C:/Users/zhangdeqiang/WorkBuddy/2026-05-08-task-1/ssa-erp';
const cred = JSON.parse(readFileSync(`${ROOT}/scripts/prod-e2e/.e2e-credentials.json`, 'utf8'));

// ★ 本机有代理（HTTP_PROXY=127.0.0.1:60145），Node 内置 fetch（undici）走代理访问 127.0.0.1
//   会被 ECONNRESET（表现为「连接被重置」，实为代理干扰，与业务无关）。
//   故本地实测一律改用 curl 发请求（curl 已被沙箱正确放行本地回环）。
import { execFileSync } from 'node:child_process';

function curl(method, path, { token, body } = {}) {
  const args = ['-s', '-m', '60', '-o', '-', '-w', '\\n__HTTP__%{http_code}', '-X', method, BASE + path, '-H', 'Content-Type: application/json'];
  if (token) args.push('-H', 'Authorization: Bearer ' + token);
  if (body !== undefined) args.push('-d', JSON.stringify(body));
  const raw = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const m = raw.match(/\n__HTTP__(\d{3})$/);
  const status = m ? Number(m[1]) : 0;
  const text = m ? raw.slice(0, raw.lastIndexOf('\n__HTTP__')) : raw;
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* 非 JSON */ }
  return { status, data, text };
}

function d1(sql) {
  const out = execSync(
    `npx wrangler d1 execute ssa-erp-db --local --command "${sql.replace(/"/g, '\\"')}"`,
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  // wrangler 输出是多行 pretty JSON：先定位最外层数组，再整体解析
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  if (start < 0 || end < 0) return [];
  try {
    const arr = JSON.parse(out.slice(start, end + 1));
    const rows = [];
    for (const chunk of arr) {
      if (chunk && Array.isArray(chunk.results)) rows.push(...chunk.results);
    }
    return rows;
  } catch {
    return [];
  }
}

async function api(method, path, { token, body } = {}) {
  return curl(method, path, { token, body });
}

const STAMP = Date.now();
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

console.log('=== P0-1 实测：委外发料过账链路 ===');
console.log('BASE =', BASE);

// ── 0. 登录 ──────────────────────────────────────────────
const login = await api('POST', '/api/auth/login', {
  body: { username: cred.username, password: cred.password },
});
if (login.status !== 200 || !login.data?.token) {
  console.log('登录失败：', login.status, login.text?.slice(0, 300));
  process.exit(1);
}
const token = login.data.token;
console.log('登录成功');

const ORG = 'org_e2e_sandbox';
const MAT = 'MAT-P0-1-TEST';
const MAT_CODE = 'P0-1-TEST';
const WAREHOUSE = 'wh-001';

// ── 1. 准备物料（有库存、有移动均价）──────────────────────
const now = new Date().toISOString();
d1(`DELETE FROM inventory_records WHERE org_id='${ORG}' AND material_id='${MAT}'`);
d1(`DELETE FROM inventory_transactions WHERE org_id='${ORG}' AND material_id='${MAT}'`);
d1(`DELETE FROM materials WHERE id='${MAT}'`);
d1(`INSERT INTO materials (id, org_id, code, name, current_stock, stock_value, moving_avg_price, standard_price, price, unit, valuation_class, created_at, updated_at, created_by, updated_by) VALUES ('${MAT}','${ORG}','${MAT_CODE}','P0-1 测试料',100,1000,10,10,10,'PCS','RAW','${now}','${now}','probe','probe')`);
d1(`INSERT INTO inventory_records (id, org_id, material_id, material_code, material_name, warehouse_id, warehouse_name, quantity, available_quantity, frozen_quantity, unit, created_at, updated_at) VALUES ('ir-p0-1','${ORG}','${MAT}','${MAT_CODE}','P0-1 测试料','${WAREHOUSE}','主仓库-A区',100,100,0,'PCS','${now}','${now}')`);

const before = d1(`SELECT current_stock, stock_value FROM materials WHERE id='${MAT}'`)[0];
console.log(`  发料前库存：current_stock=${before?.current_stock} stock_value=${before?.stock_value}`);

// ── 2. 走委外发料的真实链路（等价前端 issueMaterials）─────
// 前端 subcontractStore.issueMaterials → warehouseStore.addOutboundOrder(
//   { outboundNo:'OB-SUB-xxx', type:'subcontract', sourceNo:委外单号, status:'completed',
//     warehouseId:'wh-001', items:[{materialId, materialCode, materialName, quantity}] })
const outboundNo = `OB-SUB-P01-${STAMP}`;
const subOrderNo = `SC-P01-${STAMP}`;
const po = await api('POST', '/api/outbound-orders', {
  token,
  body: {
    outboundNo,
    type: 'subcontract',
    sourceNo: subOrderNo,
    customerId: 'CUST-P0-1',
    customerName: 'P0-1 委外供应商',
    status: 'completed',
    warehouseId: WAREHOUSE,
    warehouseName: '主仓库-A区',
    operator: 'P0-1 测试',
    outboundDate: now.slice(0, 10),
    remarks: `P0-1 委外发料实测 ${subOrderNo}`,
    items: [{ materialId: MAT, materialCode: MAT_CODE, materialName: 'P0-1 测试料', unit: 'PCS', quantity: 40 }],
  },
});
console.log(`  POST /api/outbound-orders → HTTP ${po.status}`);
if (po.data?.voucherIssues?.length) console.log('  voucherIssues:', po.data.voucherIssues);

// ── 3. 查账实 ────────────────────────────────────────────
// ★ 本地 D1 被 pages dev 进程持有，多条 d1 调用并发会撞 "internal error"（SQLITE_BUSY）。
//   故把全部校验查询合并成 1 条 SELECT，用 JOIN 一次取回，减少锁冲突。
const snap = d1(`SELECT m.current_stock, m.stock_value, (SELECT quantity FROM inventory_records WHERE org_id='${ORG}' AND material_id='${MAT}') AS inv_qty, (SELECT available_quantity FROM inventory_records WHERE org_id='${ORG}' AND material_id='${MAT}') AS inv_avail, (SELECT id FROM vouchers WHERE org_id='${ORG}' AND source_no='${outboundNo}') AS voucher_id, (SELECT voucher_no FROM vouchers WHERE org_id='${ORG}' AND source_no='${outboundNo}') AS voucher_no, (SELECT source FROM vouchers WHERE org_id='${ORG}' AND source_no='${outboundNo}') AS voucher_source, (SELECT status FROM vouchers WHERE org_id='${ORG}' AND source_no='${outboundNo}') AS voucher_status, (SELECT total_debit FROM vouchers WHERE org_id='${ORG}' AND source_no='${outboundNo}') AS total_debit, (SELECT total_credit FROM vouchers WHERE org_id='${ORG}' AND source_no='${outboundNo}') AS total_credit FROM materials m WHERE m.id='${MAT}'`)[0] || {};

const after = snap;
const invRec = { quantity: snap.inv_qty, available_quantity: snap.inv_avail };
const vouches = snap.voucher_id
  ? [{ id: snap.voucher_id, voucher_no: snap.voucher_no, source: snap.voucher_source, status: snap.voucher_status, total_debit: snap.total_debit, total_credit: snap.total_credit }]
  : [];
const items = vouches.length
  ? d1(`SELECT account_code, account_name, debit, credit FROM voucher_items WHERE voucher_id='${snap.voucher_id}' ORDER BY line_no`)
  : [];

console.log(`  发料后库存：current_stock=${after?.current_stock} stock_value=${after?.stock_value}`);
console.log(`  库存记录：quantity=${invRec?.quantity} available=${invRec?.available_quantity}`);
console.log(`  凭证数：${vouches.length}`);
for (const v of vouches) console.log(`    ${v.voucher_no} source=${v.source} status=${v.status} 借=${v.total_debit} 贷=${v.total_credit}`);
for (const it of items) console.log(`    ${it.account_code} ${it.account_name} 借=${it.debit} 贷=${it.credit}`);

const stockDropped = Number(after?.current_stock) === Number(before?.current_stock) - 40;
const valueDropped = Number(after?.stock_value) === Number(before?.stock_value) - 400;
const hasVoucher = vouches.length > 0;
const has1408 = items.some((i) => i.account_code === '1408' && Number(i.debit) > 0);
const has1403 = items.some((i) => i.account_code === '1403' && Number(i.credit) > 0);
const balanced = vouches.length > 0 && Math.abs(Number(vouches[0].total_debit) - Number(vouches[0].total_credit)) < 0.01;

console.log('');
if (stockDropped) ok(`库存实减：${before?.current_stock} → ${after?.current_stock}（应减 40）`);
else bad(`库存未减：${before?.current_stock} → ${after?.current_stock}（应减 40）`);
if (valueDropped) ok(`存货价值实减：${before?.stock_value} → ${after?.stock_value}（应减 400）`);
else bad(`存货价值未减：${before?.stock_value} → ${after?.stock_value}`);
if (invRec && Number(invRec.quantity) === 60) ok(`库存记录已扣：quantity=${invRec.quantity} available=${invRec.available_quantity}`);
else bad(`库存记录未正确扣减：${JSON.stringify(invRec)}`);
if (hasVoucher) ok(`已生成出库凭证：${vouches[0].voucher_no}`);
else bad('未生成出库凭证（借贷不平的根源）');
if (has1408) ok('1408 委托加工物资 借方已发生');
else bad('1408 借方未发生');
if (has1403) ok('1403 原材料 贷方已发生');
else bad('1403 贷方未发生');
if (balanced) ok('借贷平衡');
else bad('借贷不平');

console.log('');
console.log(`通过 ${pass} / 失败 ${fail}`);
process.exit(fail > 0 ? 1 : 0);
