// V3.17.0 · #6/#7/#13 服务端算账 真实往返验证（绕开界面直接打接口）
// 覆盖：
//   ① #7 入库过账服务端生成采购暂估凭证（借1403/贷2201，draft）
//   ② #6 出库过账服务端生成 COGS 凭证（销售借6401/贷1405，draft）
//   ③ #13 已结账期间新增凭证被后端 400 拒绝（读 app_state closingPeriods）
//   ④ 清理自建测试数据（单据/物料/自动凭证），app_state 还原
// 用法：node scripts/_verify_613.mjs  （需能连通生产域或本地 dev；依赖 scripts/prod-e2e/.e2e-credentials.json）
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
  const orgId = l.org_id || l.data?.org_id || l.user?.org_id;
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

  // ── ① 建隔离测试物料（初始库存 0、移动均价 10）──
  const code = 'V613-' + rnd();
  const mRes = await POST('/api/materials', { code, name: 'V613测试物料', unit: '个', currentStock: 0, price: 10, movingAvgPrice: 10, stockValue: 0, makeOrBuy: 'buy' });
  const m0 = await J(mRes);
  const matId = m0.id;
  if (!assert('建物料', mRes.status, 201)) { failed++; return finish(failed, out); }

  // ── ② #7 入库过账 → 服务端生成暂估凭证 ──
  const inNo = 'V613-IN' + rnd();
  await POST('/api/inbound-orders', {
    inboundNo: inNo, type: 'purchase', status: 'completed', warehouseId: 'wh-001', warehouseName: '主仓',
    operator: '强哥', inboundDate: '2026-09-20', vendorName: '测试供应商',
    items: [{ materialId: matId, materialCode: code, materialName: 'V613测试物料', actualQuantity: 10, unitPrice: 10, unit: '个' }],
  });
  await sleep(500);
  const inV = await J(await GET('/api/vouchers?keyword=INV-' + inNo));
  const inVoucher = (inV.data || []).find((v) => v.voucherNo === 'INV-' + inNo);
  if (!assert('#7 入库生成暂估凭证(存在)', inVoucher ? 1 : 0, 1)) failed++;
  else {
    const debit = inVoucher.items?.find((i) => i.debit > 0);
    const credit = inVoucher.items?.find((i) => i.credit > 0);
    if (!assert('#7 暂估借1403', debit?.accountCode, '1403')) failed++;
    if (!assert('#7 暂估贷2201', credit?.accountCode, '2201')) failed++;
    if (!assert('#7 暂估金额=100', (debit?.debit || 0), 100)) failed++;
  }
  const inVoucherId = inVoucher?.id;

  // ── ③ #6 出库过账 → 服务端生成 COGS 凭证 ──
  const outNo = 'V613-OUT' + rnd();
  await POST('/api/outbound-orders', {
    outboundNo: outNo, type: 'sale', status: 'completed', warehouseId: 'wh-001', warehouseName: '主仓',
    operator: '强哥', outboundDate: '2026-09-20', customerName: '测试客户',
    items: [{ materialId: matId, materialCode: code, materialName: 'V613测试物料', quantity: 3, unit: '个' }],
  });
  await sleep(500);
  const outV = await J(await GET('/api/vouchers?keyword=OUT-' + outNo));
  const outVoucher = (outV.data || []).find((v) => v.voucherNo === 'OUT-' + outNo);
  if (!assert('#6 出库生成COGS凭证(存在)', outVoucher ? 1 : 0, 1)) failed++;
  else {
    const debit = outVoucher.items?.find((i) => i.debit > 0);
    const credit = outVoucher.items?.find((i) => i.credit > 0);
    if (!assert('#6 COGS借6401', debit?.accountCode, '6401')) failed++;
    if (!assert('#6 COGS贷1405', credit?.accountCode, '1405')) failed++;
  }
  const outVoucherId = outVoucher?.id;

  // ── ④ #13 已结账期间凭证被拒（直接改 app_state，测后还原）──
  const TEST_PERIOD = '2099-01';
  let originalValue = null;
  try {
    const st = await J(await GET('/api/state/ssa-erp-finance-ledger'));
    originalValue = st.value; // 可能为 null（未初始化）
    let parsed = originalValue ? JSON.parse(originalValue) : {};
    const list = Array.isArray(parsed.closingPeriods) ? parsed.closingPeriods : [];
    if (!list.some((c) => c.period === TEST_PERIOD && c.status === 'closed')) {
      const next = { ...parsed, closingPeriods: [...list, { period: TEST_PERIOD, status: 'closed' }] };
      d1q(`UPDATE app_state SET value = '${JSON.stringify(next).replace(/'/g, "''")}' WHERE org_id = '${orgId}' AND key = 'ssa-erp-finance-ledger'`);
      log(`🔧 已临时关闭期间 ${TEST_PERIOD}（原值已快照，测试后还原）`);
    }
    // 等待 app_state 缓存/读取生效
    await sleep(300);
    const blocked = await POST('/api/vouchers', {
      voucherNo: 'V613-T' + rnd(), date: '2099-01-15', period: TEST_PERIOD,
      items: [
        { id: 'a', summary: '测试', accountCode: '1001', accountName: '测试借', debit: 100, credit: 0 },
        { id: 'b', summary: '测试', accountCode: '1002', accountName: '测试贷', debit: 0, credit: 100 },
      ],
      source: 'manual', sourceNo: 'V613-T', remark: '期间关闭校验验证',
    });
    if (!assert('#13 已结账期间凭证被拒(400)', blocked.status, 400)) failed++;
    // 反例：未结账期间应可建
    const open = await POST('/api/vouchers', {
      voucherNo: 'V613-O' + rnd(), date: '2099-02-15', period: '2099-02',
      items: [
        { id: 'a', summary: '测试', accountCode: '1001', accountName: '测试借', debit: 100, credit: 0 },
        { id: 'b', summary: '测试', accountCode: '1002', accountName: '测试贷', debit: 0, credit: 100 },
      ],
      source: 'manual', sourceNo: 'V613-O', remark: '未结账期间对照',
    });
    const openJ = await J(open);
    if (!assert('#13 未结账期间凭证可建(201)', open.status, 201)) failed++;
    else if (openJ.id) await DEL('/api/vouchers/' + openJ.id); // 清理对照凭证
  } finally {
    // 还原 app_state（无论成败都还原，避免污染生产结账状态）
    if (originalValue !== null) {
      d1q(`UPDATE app_state SET value = '${originalValue.replace(/'/g, "''")}' WHERE org_id = '${orgId}' AND key = 'ssa-erp-finance-ledger'`);
      log('🔧 app_state 已还原为测试前快照');
    } else {
      d1q(`DELETE FROM app_state WHERE org_id = '${orgId}' AND key = 'ssa-erp-finance-ledger'`);
      log('🔧 测试前无 finance-ledger 状态，已清除临时写入');
    }
  }

  // ── ⑤ 清理自建数据 ──
  if (inVoucherId) await DEL('/api/vouchers/' + inVoucherId);
  if (outVoucherId) await DEL('/api/vouchers/' + outVoucherId);
  // 删出入库单（删除顺序：先子后母，避免外键）
  await DEL('/api/inbound-orders/' + inNo);
  await DEL('/api/outbound-orders/' + outNo);
  await DEL('/api/materials/' + matId);
  d1q(`DELETE FROM inventory_records WHERE material_id = '${matId}'`);
  await sleep(300);
  const mFinal = await GET('/api/materials/' + matId);
  if (!assert('物料已删除(404)', mFinal.status, 404)) failed++;
  const inVF = await J(await GET('/api/vouchers?keyword=INV-' + inNo));
  if (!assert('暂估凭证已清理(0)', (inVF.data || []).length, 0)) failed++;
  const outVF = await J(await GET('/api/vouchers?keyword=OUT-' + outNo));
  if (!assert('COGS凭证已清理(0)', (outVF.data || []).length, 0)) failed++;

  return finish(failed, out);
};

const finish = (failed, out) => {
  const passed = out.filter((x) => x.startsWith('✅')).length;
  console.log(`\n==== V3.17.0 #6/#7/#13 验证：${passed} 通过 / ${failed} 失败 ====`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((e) => { console.error('脚本异常', e); process.exit(2); });
