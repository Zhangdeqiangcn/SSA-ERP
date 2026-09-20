// 缺陷 #11 真实往返验证（绕开界面直接打接口）
// 覆盖：物料清单/质检扣留/转储单/库存调整单 四个手写端点
//   - 空请求 {} → 必须 400（不再生成全空记录）
//   - 正常请求（含必填字段）→ 必须不是 400（证明必填守卫未误伤正常业务）
//   - 清理自建测试数据，生产库无残留
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = 'https://ssa-erp.pages.dev';
const NODE = process.execPath;
const cred = JSON.parse(readFileSync('scripts/prod-e2e/.e2e-credentials.json', 'utf8'));
const rnd = () => Math.random().toString(36).slice(2, 6);

const run = async () => {
  const l = await (await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cred),
  })).json();
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (l.token || l.data?.token) };
  const J = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return { _raw: t }; } };
  const POST = (p, b) => fetch(BASE + p, { method: 'POST', headers: H, body: JSON.stringify(b) });
  const d1 = (sql) => spawnSync(NODE, ['scripts/_d1q.mjs', sql], { encoding: 'utf8' });

  const out = [];
  const log = (...a) => { out.push(a.join(' ')); console.log(...a); };
  const assert = (name, actual, expect) => {
    const ok = actual === expect;
    log(`${ok ? '✅' : '❌'} ${name}: 实=${actual} 期=${expect}`);
    return ok;
  };

  const created = []; // {table, id, childTable, childFk}

  // ── 空请求必须 400 ──
  const emptyCases = [
    ['/api/bom', 'BOM'],
    ['/api/quality-holds', '质检扣留'],
    ['/api/stock-transfers', '转储单'],
    ['/api/inventory-adjustments', '库存调整单'],
  ];
  for (const [p, label] of emptyCases) {
    const r = await POST(p, {});
    assert(`${label} 空请求→400`, r.status, 400);
  }

  // ── 正常请求必须不被必填守卫拦（不为 400）──
  const vBom = await POST('/api/bom', {
    name: 'T11 BOM ' + rnd(), productCode: 'PT11' + rnd(), bomNo: 'BOMT' + rnd(), type: 'EBOM', status: 'draft',
    items: [{ materialCode: 'MT11' + rnd(), materialName: '测试料', quantity: 1, level: 0, sequence: 1 }],
  });
  const vBomJ = await J(vBom);
  assert('BOM 正常请求不被拦(≠400)', vBom.status !== 400, true);
  if (vBomJ.id) created.push({ table: 'bom_headers', id: vBomJ.id, childTable: 'bom_items', childFk: 'bom_id' });

  const vQh = await POST('/api/quality-holds', {
    materialCode: 'MT11' + rnd(), materialName: '测试物料', reason: '测试扣留', quantity: 5, warehouseName: '主仓',
  });
  const vQhJ = await J(vQh);
  assert('质检扣留 正常请求不被拦(≠400)', vQh.status !== 400, true);
  if (vQhJ.id) created.push({ table: 'quality_holds', id: vQhJ.id });

  const vSt = await POST('/api/stock-transfers', {
    fromWarehouseId: 'wh-001', fromWarehouseName: '主仓', toWarehouseId: 'wh-002', toWarehouseName: '二仓',
    transferNo: 'STT' + rnd(), items: [{ materialCode: 'MT11' + rnd(), materialName: '测试料', quantity: 1, unit: '个' }],
  });
  const vStJ = await J(vSt);
  assert('转储单 正常请求不被拦(≠400)', vSt.status !== 400, true);
  if (vStJ.id) created.push({ table: 'stock_transfers', id: vStJ.id, childTable: 'stock_transfer_items', childFk: 'stock_transfer_id' });

  const vAdj = await POST('/api/inventory-adjustments', {
    warehouseId: 'wh-001', warehouseName: '主仓', adjustmentNo: 'ADJT' + rnd(), reason: '测试',
    items: [{ materialCode: 'MT11' + rnd(), materialName: '测试料', bookQty: 10, actualQty: 8, deltaQty: -2, unit: '个' }],
  });
  const vAdjJ = await J(vAdj);
  assert('库存调整单 正常请求不被拦(≠400)', vAdj.status !== 400, true);
  if (vAdjJ.id) created.push({ table: 'inventory_adjustments', id: vAdjJ.id, childTable: 'inventory_adjustment_items', childFk: 'inventory_adjustment_id' });

  // ── 清理自建测试数据 ──
  for (const c of created) {
    if (c.childTable) d1(`DELETE FROM ${c.childTable} WHERE ${c.childFk} = '${c.id}'`);
    d1(`DELETE FROM ${c.table} WHERE id = '${c.id}'`);
  }
  log(`已清理自建测试数据 ${created.length} 条`);

  const passed = out.filter((x) => x.startsWith('✅')).length;
  const failed = out.filter((x) => x.startsWith('❌')).length;
  log(`\n==== #11 空载荷验证：${passed} 通过 / ${failed} 失败 ====`);
  return failed === 0;
};

run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error('脚本异常', e); process.exit(2); });
