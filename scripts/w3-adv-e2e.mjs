// SSA ERP · W2 收尾战役 · 仓库高级三切片直连真实 D1 集成验证
// 验证：stock-transfers / inventory-adjustments（含 items 子表）/ quality-holds（单表）
//       三域各自 POST → GET/:id 取回明细 → PUT 更新 → GET 列表 → DELETE 往返。
// 后端契约与前端 warehouseAdvancedStore.loadWarehouseAdvanced / add* / update* / delete* 严格对应。
// 运行前提：本地 `wrangler pages dev dist --local --persist-to .wrangler/local-state --port 8791` 已启动
//           （生产验证：BASE=https://<部署域名> node scripts/w3-adv-e2e.mjs）
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

async function crudCycle(domain, sample, itemField, itemAssert) {
  const runId = Date.now().toString(36);
  // 注入易识别的编号
  const body = JSON.parse(JSON.stringify(sample));
  if (body.transferNo) body.transferNo = `ST-W3-${runId}`;
  if (body.adjustmentNo) body.adjustmentNo = `ADJ-W3-${runId}`;
  if (body.sourceInboundNo) body.sourceInboundNo = `INB-W3-${runId}`;

  const p = await req('POST', `/api/${domain}`, body, TOKEN);
  const id = p.data?.id;
  rec(`${domain} POST 创建`, (p.status === 200 || p.status === 201) && !!id ? 'PASS' : 'FAIL',
    `status=${p.status} id=${id}`);
  if ((p.status !== 200 && p.status !== 201) || !id) return false;

  const one = await req('GET', `/api/${domain}/${id}`, undefined, TOKEN);
  const items = one.data?.[itemField] || [];
  const okRound = one.status === 200 && (itemField ? items.length > 0 && itemAssert(items[0]) : true);
  rec(`${domain} GET/:id 取回明细`, okRound ? 'PASS' : 'FAIL',
    `status=${one.status} items=${items.length}${itemField ? ' ' + JSON.stringify(items[0] || {}) : ''}`);

  const patch = itemField ? { status: 'completed' } : { status: 'passed' };
  const u = await req('PUT', `/api/${domain}/${id}`, patch, TOKEN);
  const one2 = await req('GET', `/api/${domain}/${id}`, undefined, TOKEN);
  const okPut = one2.status === 200 && one2.data?.status === patch.status;
  rec(`${domain} PUT 更新状态`, okPut ? 'PASS' : 'FAIL',
    `status=${one2.data?.status} expect=${patch.status}`);

  const g = await req('GET', `/api/${domain}`, undefined, TOKEN);
  const listArr = g.data?.data || [];
  const found = listArr.find(x => x.id === id);
  const okList = g.status === 200 && (g.data?.total ?? listArr.length) >= 0;
  const listItems = itemField ? (found?.[itemField]?.length || 0) : 0;
  rec(`${domain} GET 列表(load 路径)`, okList && (itemField ? listItems > 0 : true) ? 'PASS' : 'FAIL',
    `status=${g.status} total=${g.data?.total ?? listArr.length ?? '?'} listItems=${listItems}`);

  const d = await req('DELETE', `/api/${domain}/${id}`, undefined, TOKEN);
  const one3 = await req('GET', `/api/${domain}/${id}`, undefined, TOKEN);
  rec(`${domain} DELETE 删除`, (d.status === 200 && one3.status === 404) ? 'PASS' : 'FAIL',
    `del=${d.status} getAfter=${one3.status}`);
  return true;
}

let TOKEN = '';
async function main() {
  console.log(`\n=== SSA ERP W2 收尾 三切片 CRUD 验证 @ ${BASE} ===\n`);
  const uname = 'w3e2e_' + Date.now().toString(36);
  const r1 = await req('POST', '/api/auth/register', {
    username: uname, password: 'e2epwd123', name: 'W3E2E', companyCode: 'W3E2EORG', role: 'admin',
  });
  if (r1.status !== 200 || !r1.data?.token) { rec('register 隔离组织', 'FAIL', `status=${r1.status} ${JSON.stringify(r1.data)}`); return finish(1); }
  rec('register 隔离组织', 'PASS', `org_id=${r1.data.user.org_id}`);
  TOKEN = r1.data.token;

  // ── 1) 跨组织转储（含 items 子表）──
  await crudCycle('stock-transfers', {
    transferNo: 'ST-W3-PROBE', fromWarehouseId: 'WH1', fromWarehouseName: '主仓', toWarehouseId: 'WH2', toWarehouseName: '分仓',
    fromOrgId: 'ORG1', toOrgId: 'ORG2', status: 'draft', transferDate: '2026-09-05', remarks: 'W2收尾E2E',
    items: [{ materialId: 'M1', materialCode: 'M001', materialName: '物料A', unit: 'PCS', quantity: 5, batchNo: 'B1', locationId: 'L1' }],
  }, 'items', (it) => it.material_code === 'M001' && Number(it.quantity) === 5);

  // ── 2) 库存调整单（含 items 子表）──
  await crudCycle('inventory-adjustments', {
    adjustmentNo: 'ADJ-W3-PROBE', warehouseId: 'WH1', warehouseName: '主仓', status: 'draft', reason: '盘盈', date: '2026-09-05',
    totalDeltaQty: 3, voucherNo: null,
    items: [{ materialId: 'M1', materialCode: 'M001', materialName: '物料A', unit: 'PCS', locationId: 'L1', bookQty: 7, actualQty: 10, deltaQty: 3, reason: '盘点' }],
  }, 'items', (it) => it.material_code === 'M001' && Number(it.delta_qty) === 3);

  // ── 3) 质检扣留（单表，无 items）──
  await crudCycle('quality-holds', {
    materialId: 'M1', materialCode: 'M001', materialName: '物料A', warehouseId: 'WH1', warehouseName: '主仓',
    batchNo: 'B1', quantity: 2, status: 'pending', sourceInboundNo: 'INB-X', holdDate: '2026-09-05', inspector: 'QC1', reason: '外观不良',
  }, null, null);

  finish(0);
}
function finish(code) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n=== 汇总: PASS=${pass} FAIL=${fail} ===`);
  mkdirSync('.d1test8', { recursive: true });
  writeFileSync('.d1test8/w3-adv-e2e-result.json', JSON.stringify({ pass, fail, results }, null, 2));
  process.exit(code);
}
main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
