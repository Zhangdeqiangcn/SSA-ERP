// 缺陷 #9 真实往返验证（绕开界面直接打接口，覆盖「服务端状态机」）
// 选取两类代表性单据：采购订单（业务单据）＋记账凭证（财务单据）
//   断言四类：
//     ① 锁定态回退 → 必须 400（台账痛点：已完成/已过账被退回草稿）
//     ② 非法状态值 → 必须 400
//     ③ 合法流转（含锁定态允许的前进）→ 必须放行
//     ④ 状态不变 / 不传 status → 必须放行（不能误伤"编辑保存"这类整单回写）
//   收尾清理自建测试数据，生产库无残留。
//
// ⚠️ 运行前提：新版（V3.17.4）已部署到生产域。旧版跑会全部"未拒绝"，属预期。
//   用法：node scripts/_verify_9_status_machine.mjs
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
  const PUT = (p, b) => fetch(BASE + p, { method: 'PUT', headers: H, body: JSON.stringify(b) });
  const d1 = (sql) => spawnSync(NODE, ['scripts/_d1q.mjs', sql], { encoding: 'utf8' });

  const out = [];
  const log = (...a) => { out.push(a.join(' ')); console.log(...a); };
  const assert = (name, actual, expect) => {
    const ok = actual === expect;
    log(`${ok ? '✅' : '❌'} ${name}: 实=${actual} 期=${expect}`);
    return ok;
  };

  const poIds = [];
  const vIds = [];
  const today = new Date().toISOString().slice(0, 10);

  // ── 采购订单：锁定态（已收货 / 已关闭）不可回退 ──
  const poNo = 'PO-SM-' + rnd();
  const cPo = await POST('/api/purchase-orders', {
    orderNo: poNo, vendorId: 'v-sm-' + rnd(), vendorName: '状态机测试供应商', status: 'created', orderDate: today,
  });
  const cPoJ = await J(cPo);
  if (cPoJ.id) poIds.push(cPoJ.id);
  log(`创建采购订单 ${poNo} → HTTP ${cPo.status}`);

  if (cPoJ.id) {
    // ④ 不误伤：状态不变（整单保存会原样回传当前状态）
    assert('采购订单 状态不变(created→created)放行', (await PUT(`/api/purchase-orders/${cPoJ.id}`, { status: 'created', remarks: '不变' })).status !== 400, true);
    // ④ 不误伤：不传 status（只改备注）
    assert('采购订单 不传 status 放行', (await PUT(`/api/purchase-orders/${cPoJ.id}`, { remarks: '只改备注' })).status !== 400, true);
    // ③ 非锁定态流转放行：created → received
    assert('采购订单 created→received 放行', (await PUT(`/api/purchase-orders/${cPoJ.id}`, { status: 'received' })).status !== 400, true);
    // ① 锁定态回退：received → created 必 400
    const r1 = await PUT(`/api/purchase-orders/${cPoJ.id}`, { status: 'created' });
    assert('采购订单 received→created 拒绝(400)', r1.status, 400);
    assert('  ↳ 拒绝码=STATUS_LOCKED', (await J(r1)).code, 'STATUS_LOCKED');
    // ③ 锁定态允许前进：received → closed
    assert('采购订单 received→closed 放行', (await PUT(`/api/purchase-orders/${cPoJ.id}`, { status: 'closed' })).status !== 400, true);
    // ① 完全锁定：closed → created 必 400
    assert('采购订单 closed→created 拒绝(400)', (await PUT(`/api/purchase-orders/${cPoJ.id}`, { status: 'created' })).status, 400);
    // ② 非法状态值必 400
    const r2 = await PUT(`/api/purchase-orders/${cPoJ.id}`, { status: 'not_a_status' });
    assert('采购订单 非法状态值拒绝(400)', r2.status, 400);
    assert('  ↳ 拒绝码=INVALID_STATUS', (await J(r2)).code, 'INVALID_STATUS');
  }

  // ── 记账凭证：已过账不可回退为草稿/已审核（只能红冲）──
  const vNo = 'VCH-SM-' + rnd();
  const cV = await POST('/api/vouchers', {
    voucherNo: vNo, date: today, description: '状态机测试凭证', status: 'draft',
    items: [
      { lineNo: 1, summary: '测试', accountCode: '1001', accountName: '库存现金', debit: 100, credit: 0 },
      { lineNo: 2, summary: '测试', accountCode: '6001', accountName: '主营业务收入', debit: 0, credit: 100 },
    ],
  });
  const cVJ = await J(cV);
  if (cVJ.id) vIds.push(cVJ.id);
  log(`创建记账凭证 ${vNo} → HTTP ${cV.status}`);

  if (cVJ.id) {
    assert('凭证 draft→reviewed 放行', (await PUT(`/api/vouchers/${cVJ.id}`, { status: 'reviewed' })).status !== 400, true);
    assert('凭证 reviewed→posted 放行', (await PUT(`/api/vouchers/${cVJ.id}`, { status: 'posted' })).status !== 400, true);
    // ① 台账痛点：已过账退回草稿
    const r3 = await PUT(`/api/vouchers/${cVJ.id}`, { status: 'draft' });
    assert('凭证 posted→draft 拒绝(400)', r3.status, 400);
    assert('  ↳ 拒绝码=STATUS_LOCKED', (await J(r3)).code, 'STATUS_LOCKED');
    assert('凭证 posted→reviewed 拒绝(400)', (await PUT(`/api/vouchers/${cVJ.id}`, { status: 'reviewed' })).status, 400);
    // ③ 合法前进：posted → reversed（红冲）
    assert('凭证 posted→reversed 放行(红冲)', (await PUT(`/api/vouchers/${cVJ.id}`, { status: 'reversed' })).status !== 400, true);
    // ① 已红冲完全锁定
    assert('凭证 reversed→draft 拒绝(400)', (await PUT(`/api/vouchers/${cVJ.id}`, { status: 'draft' })).status, 400);
  }

  // ── 清理自建测试数据 ──
  for (const id of poIds) {
    d1(`DELETE FROM purchase_order_items WHERE purchase_order_id = '${id}'`);
    d1(`DELETE FROM purchase_orders WHERE id = '${id}'`);
  }
  for (const id of vIds) {
    d1(`DELETE FROM voucher_items WHERE voucher_id = '${id}'`);
    d1(`DELETE FROM vouchers WHERE id = '${id}'`);
  }
  log(`已清理自建测试数据：采购订单 ${poIds.length} 条 / 凭证 ${vIds.length} 条`);

  const passed = out.filter((x) => x.startsWith('✅')).length;
  const failed = out.filter((x) => x.startsWith('❌')).length;
  log(`\n==== #9 状态机验证：${passed} 通过 / ${failed} 失败 ====`);
  return failed === 0;
};

run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error('脚本异常', e); process.exit(2); });
