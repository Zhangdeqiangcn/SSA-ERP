// SSA ERP · W2 仓库战役 · 入/出库直连真实 D1 集成验证
// 验证：inbound-orders(POST+GET/:id取回items+PUT+DELETE 往返) + outbound-orders(POST+GET/:id) + inventory-records GET
// 后端契约与前端 warehouseStore.loadWarehouseOrders / add*Order / update*Order / delete*Order 严格对应。
// 运行前提：本地 `wrangler pages dev dist --local --persist-to .wrangler/local-state --port 8791` 已启动
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8791';
const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail });
  const tag = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️ ';
  console.log(`${tag} ${name}${detail ? ' — ' + detail : ''}`);
}
async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function main() {
  console.log(`\n=== SSA ERP W2 仓库 CRUD 验证 @ ${BASE} ===\n`);
  const uname = 'w2e2e_' + Date.now().toString(36);
  const r1 = await req('POST', '/api/auth/register', {
    username: uname, password: 'e2epwd123', name: 'W2E2E', companyCode: 'W2E2EORG', role: 'admin',
  });
  if (r1.status !== 200 || !r1.data?.token) { rec('register 隔离组织', 'FAIL', `status=${r1.status} ${JSON.stringify(r1.data)}`); return finish(1); }
  rec('register 隔离组织', 'PASS', `org_id=${r1.data.user.org_id}`);
  const token = r1.data.token;
  const runId = Date.now().toString(36);

  // ── 1) 入库单全链路（前端 loadWarehouseOrders 依赖 GET 列表 + GET/:id 取 items）──
  const inbound = {
    inboundNo: 'INB-W2-' + runId, type: 'purchase', sourceNo: 'PO-W2-' + runId,
    vendorId: 'V-W2', vendorName: '测试供应商', status: 'pending',
    warehouseId: 'WH1', warehouseName: '主仓', operator: 'e2e', inboundDate: '2026-09-03',
    remarks: 'W2 入库E2E', totalCost: 50,
    items: [{ materialId: 'M1', materialCode: 'M001', materialName: '物料A', unit: 'PCS',
      expectedQuantity: 10, actualQuantity: 10, batchNo: 'B1', locationId: 'L1', locationName: '库位1',
      qualityStatus: 'qualified', unitPrice: 5, amount: 50 }],
  };
  const p = await req('POST', '/api/inbound-orders', inbound, token);
  const inId = p.data?.id;
  // 注：POST 响应仅返回表头（items 在子表），status 为 200（json() 默认）；items 经 GET/:id 取回
  rec('inbound-orders POST 创建', (p.status === 200 || p.status === 201) && !!inId ? 'PASS' : 'FAIL',
    `status=${p.status} id=${inId}`);
  if ((p.status !== 200 && p.status !== 201) || !inId) return finish(1);

  // GET /:id 必须取回 items（前端 load 依赖此重建库存/批次）
  const one = await req('GET', `/api/inbound-orders/${inId}`, undefined, token);
  const it = one.data?.items?.[0];
  rec('inbound-orders GET/:id 取回items明细',
    (one.status === 200 && one.data?.items?.length === 1 && it?.material_code === 'M001' && Number(it?.actual_quantity) === 10) ? 'PASS' : 'FAIL',
    `status=${one.status} items=${one.data?.items?.length} material=${it?.material_code} qty=${it?.actual_quantity}`);

  // PUT：状态置 completed + inventoryPosted（前端 updateInboundOrder 过账后写回）
  const u = await req('PUT', `/api/inbound-orders/${inId}`,
    { status: 'completed', inventoryPosted: true, costPosted: true }, token);
  const one2 = await req('GET', `/api/inbound-orders/${inId}`, undefined, token);
  rec('inbound-orders PUT 更新 status/inventoryPosted',
    (one2.data?.status === 'completed' && one2.data?.inventory_posted === 1 && one2.data?.cost_posted === 1) ? 'PASS' : 'FAIL',
    `status=${one2.data?.status} invPosted=${one2.data?.inventory_posted} costPosted=${one2.data?.cost_posted}`);

  // ── 2) 出库单全链路 ──
  const outbound = {
    outboundNo: 'OUT-W2-' + runId, type: 'sale', sourceNo: 'SO-W2-' + runId,
    customerId: 'C1', customerName: '测试客户', status: 'pending',
    warehouseId: 'WH1', warehouseName: '主仓', operator: 'e2e', outboundDate: '2026-09-03',
    remarks: 'W2 出库E2E',
    items: [{ materialId: 'M1', materialCode: 'M001', materialName: '物料A', unit: 'PCS',
      quantity: 3, batchNo: 'B1', locationId: 'L1', locationName: '库位1', unitCost: 5, costAmount: 15 }],
  };
  const po = await req('POST', '/api/outbound-orders', outbound, token);
  const outId = po.data?.id;
  rec('outbound-orders POST 创建', (po.status === 200 || po.status === 201) && !!outId ? 'PASS' : 'FAIL',
    `status=${po.status} id=${outId}`);
  if ((po.status !== 200 && po.status !== 201) || !outId) return finish(1);

  const oneO = await req('GET', `/api/outbound-orders/${outId}`, undefined, token);
  const oit = oneO.data?.items?.[0];
  rec('outbound-orders GET/:id 取回items明细',
    (oneO.status === 200 && oneO.data?.items?.length === 1 && oit?.material_code === 'M001' && Number(oit?.quantity) === 3) ? 'PASS' : 'FAIL',
    `status=${oneO.status} items=${oneO.data?.items?.length} material=${oit?.material_code} qty=${oit?.quantity}`);

  // ── 3) 列表 GET（store 启动期 load 路径）──
  for (const d of ['inbound-orders', 'outbound-orders', 'inventory-records']) {
    const g = await req('GET', `/api/${d}`, undefined, token);
    rec(`GET /api/${d} 列表(load 路径)`, g.status === 200 ? 'PASS' : 'FAIL',
      `status=${g.status} total=${g.data?.total ?? g.data?.pagination?.total ?? '?'}`);
  }

  // ── 4) DELETE（前端 deleteInboundOrder/deleteOutboundOrder 写回）──
  const d = await req('DELETE', `/api/inbound-orders/${inId}`, undefined, token);
  const one3 = await req('GET', `/api/inbound-orders/${inId}`, undefined, token);
  rec('inbound-orders DELETE 删除', (d.status === 200 && one3.status === 404) ? 'PASS' : 'FAIL', `del=${d.status} getAfter=${one3.status}`);
  const d2 = await req('DELETE', `/api/outbound-orders/${outId}`, undefined, token);
  const one4 = await req('GET', `/api/outbound-orders/${outId}`, undefined, token);
  rec('outbound-orders DELETE 删除', (d2.status === 200 && one4.status === 404) ? 'PASS' : 'FAIL', `del=${d2.status} getAfter=${one4.status}`);

  finish(0);
}
function finish(code) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n=== 汇总: PASS=${pass} FAIL=${fail} ===`);
  mkdirSync('.d1test7', { recursive: true });
  writeFileSync('.d1test7/w2-warehouse-e2e-result.json', JSON.stringify({ pass, fail, results }, null, 2));
  process.exit(code);
}
main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
