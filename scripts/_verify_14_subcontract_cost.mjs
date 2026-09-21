// V3.17.6 · #14 委外成本分配对不平 真实往返验证（绕开界面直接打接口）
// 覆盖：
//   ① 后端修复：新建委外入库单时 subcontract_material_cost 真的落库（原先 INSERT 漏列恒为 0）
//   ② 服务端凭证拆账：委外入库凭证 = 借1405(全额) / 贷1408(材料成本) / 贷2201(加工费)，且借贷平衡
//      —— 原实现全额挂 2201，1408 永不结转、2201 虚挂材料成本（对不平的根因）
//   ③ 前端分摊算法对照：差分法分 3 次收货累计精确 = 总额；旧算法（逐次按比例四舍五入）累计差 0.01
//   ④ 清理自建测试数据（单据/物料/自动凭证）
// 用法：node scripts/_verify_14_subcontract_cost.mjs  （需连通生产域；依赖 scripts/prod-e2e/.e2e-credentials.json）
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'https://ssa-erp.pages.dev';
const NODE = process.execPath;
const cred = JSON.parse(readFileSync('scripts/prod-e2e/.e2e-credentials.json', 'utf8'));
const rnd = () => Math.random().toString(36).slice(2, 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d1q = (sql) =>
  spawnSync(NODE, ['scripts/_d1q.mjs', sql], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

const run = async () => {
  const l = await (await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cred),
  })).json();
  const token = l.token || l.data?.token;
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
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
  let failed = 0;

  // ── ③ 前端分摊算法纯逻辑复算（先跑，不依赖网络）──
  //   差分法：本次分摊 = round(总额×本次后累计比例) − round(总额×本次前累计比例)
  const roundAmount = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const split = (total, totalQty, already, receiveQty) => {
    const cumBefore = totalQty > 0 ? roundAmount(total * (already / totalQty)) : 0;
    const cumAfter = totalQty > 0 ? roundAmount(total * ((already + receiveQty) / totalQty)) : total;
    return roundAmount(cumAfter - cumBefore);
  };
  let accNew = 0;
  for (let i = 0; i < 3; i++) accNew = roundAmount(accNew + split(1000, 3, i, 1));
  if (!assert('③ 差分法 3 次收货累计 = 1000（精确勾稽）', accNew, 1000)) failed++;
  let accOld = 0;
  for (let i = 0; i < 3; i++) accOld = roundAmount(accOld + Math.round(1000 * (1 / 3) * 100) / 100);
  if (!assert('③ 对照：旧算法 3 次累计 = 999.99（尾差 0.01）', accOld, 999.99)) failed++;

  // ── ① 建隔离测试物料 ──
  const code = 'V14-' + rnd();
  const mRes = await POST('/api/materials', { code, name: 'V14委外测试物料', unit: '个', currentStock: 0, price: 50, movingAvgPrice: 50, stockValue: 0, makeOrBuy: 'buy' });
  const m0 = await J(mRes);
  const matId = m0.id;
  if (!assert('① 建物料', mRes.status, 201)) { return finish(failed, out); }

  // ── ② 建委外入库单（材料成本 66.67 + 加工费 33.33 = 100）→ 触发服务端过账与凭证 ──
  const MAT_COST = 66.67, TOTAL = 100;
  const inNo = 'V14-SUB-' + rnd();
  const inRes = await POST('/api/inbound-orders', {
    inboundNo: inNo, type: 'subcontract', status: 'completed', warehouseId: 'wh-001', warehouseName: '主仓',
    operator: '强哥', inboundDate: '2026-09-20', vendorName: 'V14外协厂',
    subcontractMaterialCost: MAT_COST,
    items: [{ materialId: matId, materialCode: code, materialName: 'V14委外测试物料', actualQuantity: 2, expectedQuantity: 2, unitPrice: TOTAL / 2, amount: TOTAL, unit: '个' }],
  });
  if (!assert('② 建委外入库单', inRes.status, 201)) failed++;
  // 等待服务端异步过账完成（凭证生成是异步的）
  await sleep(2000);

  // ① 断言 subcontract_material_cost 真的落库（这是被修掉的丢列 bug）
  const inList = await J(await GET('/api/inbound-orders?keyword=' + inNo));
  const inRow = (inList.data || []).find((r) => r.inbound_no === inNo);
  if (!assert('① 入库单落库 subcontract_material_cost', Number(inRow?.subcontract_material_cost), MAT_COST)) failed++;

  // ② 断言凭证拆账正确（API返回snake_case字段）
  const vRes = await J(await GET('/api/vouchers?keyword=' + inNo));
  const voucher = (vRes.data || []).find((v) => v.source_no === inNo);
  if (!assert('② 委外入库生成凭证(存在)', voucher ? 1 : 0, 1)) failed++;
  else {
    const items = voucher.items || [];
    const debit1405 = items.find((i) => i.account_code === '1405' && i.debit > 0);
    const credit1408 = items.find((i) => i.account_code === '1408' && i.credit > 0);
    const credit2201 = items.find((i) => i.account_code === '2201' && i.credit > 0);
    if (!assert('② 借 1405 库存商品 = 100', debit1405?.debit, TOTAL)) failed++;
    if (!assert('② 贷 1408 委托加工物资 = 66.67（材料成本结转掉）', credit1408?.credit, MAT_COST)) failed++;
    if (!assert('② 贷 2201 GR/IR暂估 = 33.33（只挂加工费）', credit2201?.credit, roundAmount(TOTAL - MAT_COST))) failed++;
    const td = roundAmount(items.reduce((s, i) => s + (i.debit || 0), 0));
    const tc = roundAmount(items.reduce((s, i) => s + (i.credit || 0), 0));
    if (!assert('② 借贷平衡（Σ借=Σ贷=100）', `${td}/${tc}`, '100/100')) failed++;
    if (!assert('② 1408 已被结转（不再全额挂 2201 的旧行为）', credit1408 ? 1 : 0, 1)) failed++;
  }
  const voucherId = voucher?.id;
  const inRowId = inRow?.id;

  // ── ④ 清理自建数据 ──
  if (voucherId) await DEL('/api/vouchers/' + voucherId);
  if (inRowId) await DEL('/api/inbound-orders/' + inRowId);
  await DEL('/api/materials/' + matId);
  d1q(`DELETE FROM inventory_records WHERE material_id = '${matId}'`);
  d1q(`DELETE FROM inbound_order_items WHERE inbound_order_id = '${inRowId}'`);
  await sleep(400);
  const vFinal = await J(await GET('/api/vouchers?keyword=' + inNo));
  if (!assert('④ 凭证已清理(0)', (vFinal.data || []).filter((v) => v.source_no === inNo).length, 0)) failed++;

  return finish(failed, out);
};

const finish = (failed, out) => {
  const passed = out.filter((x) => x.startsWith('✅')).length;
  console.log(`\n==== V3.17.6 #14 委外成本分配验证：${passed} 通过 / ${failed} 失败 ====`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((e) => { console.error('脚本异常', e); process.exit(2); });
