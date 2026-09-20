// V3.17.1 · #13 折旧计提彻底服务端化 真实往返验证（绕开界面直接打接口）
// 覆盖：
//   ① 新增固定资产（POST /api/fixed-assets）→ 201
//   ② 计提折旧（POST /api/fixed-assets/depreciate）→ 服务端更新累计折旧 + 生成折旧凭证
//      （借 6602 管理费用-折旧 / 贷 1602 累计折旧），断言凭证存在且借贷正确
//   ③ 同期间幂等：再次计提同期间 → duplicated:true 且凭证号不变、不重复出凭证
//   ④ 已结账期间计提被后端 400 拒绝（临时改 app_state closingPeriods，测后还原）
//   ⑤ 清理自建测试资产与折旧凭证，app_state 还原
// 用法：node scripts/_verify_depreciation.mjs  （需能连通生产域或本地 dev；依赖 scripts/prod-e2e/.e2e-credentials.json）
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

  const PERIOD_A = '2099-03'; // 计提 + 幂等
  const PERIOD_B = '2099-04'; // 已结账期间被拒

  // ── ① 新增测试固定资产（月折旧 = 120000*0.95/120 = 950）──
  const code = 'FA-V171-' + rnd();
  const cRes = await POST('/api/fixed-assets', {
    assetCode: code, assetName: 'V3.17.1折旧验证资产', category: '生产设备',
    originalValue: 120000, residualRate: 0.05, usefulLifeMonths: 120, startDate: '2099-01-01',
    status: 'in_use',
  });
  const cJ = await J(cRes);
  const assetId = cJ.data?.id;
  if (!assert('新增固定资产', cRes.status, 201)) { failed++; return finish(failed, out); }
  if (!assert('初始累计折旧=0', cJ.data?.accumulatedDepreciation, 0)) failed++;

  // ── ② 计提折旧（期间 A）→ 服务端更新累计折旧 + 生成折旧凭证 ──
  const dRes = await POST('/api/fixed-assets/depreciate', { period: PERIOD_A });
  const dJ = await J(dRes);
  const d = dJ.data || {};
  if (!assert('计提返回 200', dRes.status, 200)) failed++;
  if (!assert('计提合计=950', d.total, 950)) failed++;
  const depAsset = (d.assets || []).find((a) => a.id === assetId);
  if (!assert('资产累计折旧已更新(950)', depAsset?.accumulatedDepreciation, 950)) failed++;
  if (!assert('折旧凭证号=DEPR-2099-03', d.voucherNo, 'DEPR-' + PERIOD_A)) failed++;

  // 凭证存在性 + 借贷校验
  await sleep(400);
  const vList = await J(await GET('/api/vouchers?source=asset&keyword=DEPR-' + PERIOD_A));
  const depVoucher = (vList.data || []).find((v) => v.voucherNo === 'DEPR-' + PERIOD_A);
  if (!assert('折旧凭证已生成(存在)', depVoucher ? 1 : 0, 1)) failed++;
  else {
    const debit = depVoucher.items?.find((i) => i.debit > 0);
    const credit = depVoucher.items?.find((i) => i.credit > 0);
    if (!assert('折旧借 6602 管理费用', debit?.accountCode, '6602')) failed++;
    if (!assert('折旧贷 1602 累计折旧', credit?.accountCode, '1602')) failed++;
    if (!assert('折旧借贷平衡(950)', (debit?.debit || 0), 950)) failed++;
  }
  const depVoucherId = depVoucher?.id;

  // ── ③ 同期间幂等：再次计提 A → duplicated:true，凭证号不变，不再产生新凭证 ──
  const d2 = await POST('/api/fixed-assets/depreciate', { period: PERIOD_A });
  const d2J = await J(d2);
  if (!assert('幂等返回 duplicated:true', d2J.data?.duplicated, true)) failed++;
  if (!assert('幂等凭证号一致', d2J.data?.voucherNo, 'DEPR-' + PERIOD_A)) failed++;
  if (!assert('幂等不重复计提(累计仍=950)', (d2J.data?.assets || []).find((a) => a.id === assetId)?.accumulatedDepreciation, 950)) failed++;
  const vList2 = await J(await GET('/api/vouchers?source=asset&keyword=DEPR-' + PERIOD_A));
  const vouchers2 = (vList2.data || []).filter((v) => v.voucherNo === 'DEPR-' + PERIOD_A);
  if (!assert('期间 A 仅 1 张折旧凭证(幂等)', vouchers2.length, 1)) failed++;

  // ── ④ 已结账期间计提被拒（临时改 app_state，测后还原）──
  let originalValue = null;
  try {
    const st = await J(await GET('/api/state/ssa-erp-finance-ledger'));
    originalValue = st.value; // 可能为 null
    let parsed = originalValue ? JSON.parse(originalValue) : {};
    const list = Array.isArray(parsed.closingPeriods) ? parsed.closingPeriods : [];
    if (!list.some((c) => c.period === PERIOD_B && c.status === 'closed')) {
      const next = { ...parsed, closingPeriods: [...list, { period: PERIOD_B, status: 'closed' }] };
      d1q(`UPDATE app_state SET value = '${JSON.stringify(next).replace(/'/g, "''")}' WHERE org_id = '${orgId}' AND key = 'ssa-erp-finance-ledger'`);
      log(`🔧 已临时关闭期间 ${PERIOD_B}（原值已快照，测试后还原）`);
    }
    await sleep(300);
    const blocked = await POST('/api/fixed-assets/depreciate', { period: PERIOD_B });
    if (!assert('已结账期间计提被拒(400)', blocked.status, 400)) failed++;
    // 反例：未结账期间可计提
    const open = await POST('/api/fixed-assets/depreciate', { period: '2099-05' });
    const openJ = await J(open);
    if (!assert('未结账期间可计提(200)', open.status, 200)) failed++;
    else {
      // 清理反例产生的凭证（2099-05）
      const ov = await J(await GET('/api/vouchers?source=asset&keyword=DEPR-2099-05'));
      const ovId = (ov.data || []).find((v) => v.voucherNo === 'DEPR-2099-05')?.id;
      if (ovId) await DEL('/api/vouchers/' + ovId);
    }
  } finally {
    if (originalValue !== null) {
      d1q(`UPDATE app_state SET value = '${originalValue.replace(/'/g, "''")}' WHERE org_id = '${orgId}' AND key = 'ssa-erp-finance-ledger'`);
      log('🔧 app_state 已还原为测试前快照');
    } else {
      d1q(`DELETE FROM app_state WHERE org_id = '${orgId}' AND key = 'ssa-erp-finance-ledger'`);
      log('🔧 测试前无 finance-ledger 状态，已清除临时写入');
    }
  }

  // ── ⑤ 清理自建数据 ──
  if (depVoucherId) await DEL('/api/vouchers/' + depVoucherId);
  if (assetId) await DEL('/api/fixed-assets?id=' + encodeURIComponent(assetId));
  await sleep(300);
  const aFinal = await GET('/api/fixed-assets');
  const aFinalJ = await J(aFinal);
  const stillThere = (aFinalJ.data || []).some((a) => a.id === assetId);
  if (!assert('测试资产已删除', stillThere ? 1 : 0, 0)) failed++;

  return finish(failed, out);
};

const finish = (failed, out) => {
  const passed = out.filter((x) => x.startsWith('✅')).length;
  console.log(`\n==== V3.17.1 #13 折旧服务端化验证：${passed} 通过 / ${failed} 失败 ====`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((e) => { console.error('脚本异常', e); process.exit(2); });
