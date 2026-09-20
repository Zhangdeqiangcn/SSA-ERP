// N1 服务端过账真实往返验证（绕开界面直接打接口，验证"运算在服务端发生"）
// 覆盖：入库滚均价+库存、出库扣减、超发两账本都卡0、清理无残留
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = 'https://ssa-erp.pages.dev';
const NODE = process.execPath;
const cred = JSON.parse(readFileSync('scripts/prod-e2e/.e2e-credentials.json', 'utf8'));
const rnd = () => Math.random().toString(36).slice(2, 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const l = await (await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cred),
  })).json();
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (l.token || l.data?.token) };
  const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t }; } };
  const POST = (p, b) => fetch(BASE + p, { method: 'POST', headers: H, body: JSON.stringify(b) });
  const GET = (p) => fetch(BASE + p, { headers: H });
  const DEL = (p) => fetch(BASE + p, { method: 'DELETE', headers: H });

  const out = [];
  const log = (...a) => { out.push(a.join(' ')); console.log(...a); };
  const assert = (name, actual, expect) => {
    const ok = actual === expect;
    log(`${ok ? '✅' : '❌'} ${name}: 实=${actual} 期=${expect}`);
    return ok;
  };

  // 1) 建隔离测试物料（初始库存 0、移动均价 10、金额 0）
  const code = 'N1T-' + rnd();
  const mres = await POST('/api/materials', { code, name: 'N1测试物料', unit: '个', currentStock: 0, price: 10, movingAvgPrice: 10, stockValue: 0, makeOrBuy: 'buy' });
  const m0 = await J(mres);
  const matId = m0.id;
  assert('建物料', mres.status, 201);

  // 2) 入库 10 个（单价 10），绕开界面直接打接口
  const inNo = 'N1T-IN' + rnd();
  const ib = await POST('/api/inbound-orders', {
    inboundNo: inNo, type: 'purchase', status: 'completed', warehouseId: 'wh-001', warehouseName: '主仓',
    operator: '强哥', inboundDate: '2026-09-20',
    items: [{ materialId: matId, materialCode: code, materialName: 'N1测试物料', actualQuantity: 10, unitPrice: 10, unit: '个' }],
  });
  const ibj = await J(ib);
  const inbId = ibj.id;
  await sleep(300);
  const m1 = await J(await GET('/api/materials/' + matId));
  assert('入库后 currentStock', m1.currentStock, 10);
  assert('入库后 stockValue', m1.stockValue, 100);
  assert('入库后 movingAvgPrice', m1.movingAvgPrice, 10);
  const inv1 = await J(await GET('/api/inventory-records?keyword=' + code));
  const invRow1 = (inv1.data || [])[0];
  assert('入库后 inventory_records.quantity', invRow1 ? invRow1.quantity : null, 10);

  // 3) 正常出库 3 个
  const ob = await POST('/api/outbound-orders', {
    outboundNo: 'N1T-OUT' + rnd(), type: 'sale', status: 'completed', warehouseId: 'wh-001', warehouseName: '主仓',
    operator: '强哥', outboundDate: '2026-09-20',
    items: [{ materialId: matId, materialCode: code, materialName: 'N1测试物料', quantity: 3, unit: '个' }],
  });
  const obj = await J(ob);
  const outId = obj.id;
  await sleep(300);
  const m2 = await J(await GET('/api/materials/' + matId));
  assert('出库3后 currentStock', m2.currentStock, 7);
  assert('出库3后 stockValue', m2.stockValue, 70);
  const inv2 = await J(await GET('/api/inventory-records?keyword=' + code));
  const invRow2 = (inv2.data || [])[0];
  assert('出库3后 inventory_records.quantity', invRow2 ? invRow2.quantity : null, 7);

  // 4) 超发：出库 100（库存仅 7）→ 两账本都应卡 0
  const ob2 = await POST('/api/outbound-orders', {
    outboundNo: 'N1T-OVF' + rnd(), type: 'sale', status: 'completed', warehouseId: 'wh-001', warehouseName: '主仓',
    operator: '强哥', outboundDate: '2026-09-20',
    items: [{ materialId: matId, materialCode: code, materialName: 'N1测试物料', quantity: 100, unit: '个' }],
  });
  const obj2 = await J(ob2);
  const outId2 = obj2.id;
  await sleep(300);
  const m3 = await J(await GET('/api/materials/' + matId));
  assert('超发后 currentStock(卡0)', m3.currentStock, 0);
  assert('超发后 stockValue(卡0)', m3.stockValue, 0);
  const inv3 = await J(await GET('/api/inventory-records?keyword=' + code));
  const invRow3 = (inv3.data || [])[0];
  assert('超发后 inventory_records.quantity(卡0)', invRow3 ? invRow3.quantity : null, 0);

  // 5) 清理：删单据 + 物料 + 库存行（inventory_records 经 wrangler 直接 DELETE）
  await DEL('/api/inbound-orders/' + inbId);
  await DEL('/api/outbound-orders/' + outId);
  await DEL('/api/outbound-orders/' + outId2);
  await DEL('/api/materials/' + matId);
  spawnSync(NODE, ['scripts/_d1q.mjs', `DELETE FROM inventory_records WHERE material_id = '${matId}'`], { encoding: 'utf8' });
  await sleep(300);
  const mFinal = await GET('/api/materials/' + matId);
  assert('物料已删除(404)', mFinal.status, 404);
  const invFinal = await J(await GET('/api/inventory-records?keyword=' + code));
  assert('库存行已清理(0行)', (invFinal.data || []).length, 0);

  const passed = out.filter((x) => x.startsWith('✅')).length;
  const failed = out.filter((x) => x.startsWith('❌')).length;
  log(`\n==== N1 过账验证：${passed} 通过 / ${failed} 失败 ====`);
  return failed === 0;
};

run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error('脚本异常', e); process.exit(2); });
