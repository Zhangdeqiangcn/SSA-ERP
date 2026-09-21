// 缺陷 #10 完整范围 真实往返验证（绕开界面直接打接口）
//
// 覆盖三道闸：
//   ① 乐观锁全量：带过期 version 的 PUT 必须 409（此前只有 5 个端点有锁，其余静默覆盖）
//   ② 幂等键：同一 Idempotency-Key 重复提交 → 只建一次，第二次回放上次结果
//   ③ 单号查重：同组织同单号重复提交（不带幂等键）→ 409 DUPLICATE_DOC_NO
//   ④ 不误伤：不带 version 的 PUT 必须正常放行（老客户端兼容）
//   收尾清理自建测试数据，生产库无残留。
//
// ⚠️ 运行前提：V3.17.7（含迁移 0072/0073）已部署到生产域。旧版跑会"未拒绝"，属预期。
//   用法：node scripts/_verify_10_lock_idem.mjs
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
  const POST = (p, b, extra = {}) => fetch(BASE + p, { method: 'POST', headers: { ...H, ...extra }, body: JSON.stringify(b) });
  const PUT = (p, b) => fetch(BASE + p, { method: 'PUT', headers: H, body: JSON.stringify(b) });
  const d1 = (sql) => spawnSync(NODE, ['scripts/_d1q.mjs', sql], { encoding: 'utf8' });

  const out = [];
  const log = (...a) => { out.push(a.join(' ')); console.log(...a); };
  const assert = (name, actual, expect) => {
    const ok = actual === expect;
    log(`${ok ? '✅' : '❌'} ${name}: 实=${actual} 期=${expect}`);
    return ok;
  };

  const cleanup = [];
  const today = new Date().toISOString().slice(0, 10);

  // ── ① 乐观锁：转储单（0072 新接入，此前无锁会静默覆盖）──
  const tfNo = 'STF-LOCK-' + rnd();
  const cTf = await POST('/api/stock-transfers', {
    transferNo: tfNo, fromWarehouseId: 'w1', toWarehouseId: 'w2', status: 'draft', transferDate: today,
    items: [{ materialCode: 'M-LOCK', qty: 1 }],
  });
  const cTfJ = await J(cTf);
  log(`创建转储单 ${tfNo} → HTTP ${cTf.status}`);
  if (!cTfJ.id) {
    log('❌ 转储单创建失败，后续乐观锁断言跳过（见上方返回）');
  } else {
    cleanup.push(`DELETE FROM stock_transfers WHERE id = '${cTfJ.id}'`);
    // 首次带 version=1 → 放行（版本匹配）
    const p1 = await PUT(`/api/stock-transfers/${cTfJ.id}`, { version: 1, remarks: '第一次改' });
    assert('转储单 带正确 version=1 放行', p1.status !== 409, true);
    // 版本已自增到 2，仍用旧 version=1 提交 → 必须 409（并发被他人改过）
    const p2 = await PUT(`/api/stock-transfers/${cTfJ.id}`, { version: 1, remarks: '第二次改(旧版本号)' });
    const p2j = await J(p2);
    assert('转储单 带过期 version=1 拒绝(409)', p2.status, 409);
    log(`   冲突提示：${p2j?.error || p2j?._raw || ''}`);
    // ④ 不误伤：不传 version（老客户端）必须放行
    const p3 = await PUT(`/api/stock-transfers/${cTfJ.id}`, { remarks: '不传版本号' });
    assert('转储单 不传 version 放行(老客户端兼容)', p3.status !== 409, true);
  }

  // ── ③ 单号查重：同单号重复提交（不带幂等键）→ 409 ──
  const tfNo2 = 'STF-DUP-' + rnd();
  const d1r = await POST('/api/stock-transfers', {
    transferNo: tfNo2, fromWarehouseId: 'w1', toWarehouseId: 'w2', status: 'draft', transferDate: today,
    items: [{ materialCode: 'M-DUP', qty: 1 }],
  });
  const d1j = await J(d1r);
  if (d1j.id) cleanup.push(`DELETE FROM stock_transfers WHERE id = '${d1j.id}'`);
  const d2r = await POST('/api/stock-transfers', {
    transferNo: tfNo2, fromWarehouseId: 'w1', toWarehouseId: 'w2', status: 'draft', transferDate: today,
    items: [{ materialCode: 'M-DUP', qty: 1 }],
  });
  const d2j = await J(d2r);
  assert('转储单 同单号重复提交 拒绝(409)', d2r.status, 409);
  log(`   查重提示：${d2j?.error || d2j?._raw || ''}`);

  // ── ② 幂等键：同一 Idempotency-Key 重复提交只建一次 ──
  const idem = 'idem-test-' + rnd();
  const iNo = 'INB-IDEM-' + rnd();
  const payload = { inboundNo: iNo, type: 'purchase', status: 'pending', warehouseId: 'w1', inboundDate: today, remarks: '幂等键测试' };
  const i1 = await POST('/api/inbound-orders', payload, { 'Idempotency-Key': idem });
  const i1j = await J(i1);
  log(`创建入库单 ${iNo}（带幂等键）→ HTTP ${i1.status}`);
  if (i1j.id) cleanup.push(`DELETE FROM inbound_orders WHERE id = '${i1j.id}'`);
  const i2 = await POST('/api/inbound-orders', { ...payload, inboundNo: iNo + '-B' }, { 'Idempotency-Key': idem });
  const i2j = await J(i2);
  assert('入库单 同幂等键重复提交 回放(200)', i2.status, 200);
  assert('入库单 回放返回 idempotentReplay 标记', i2j?.idempotentReplay, true);
  assert('入库单 回放的是第一次的结果(未重复建单)', i2j?.id === i1j?.id, true);
  log(`   第一次 id=${i1j?.id} / 回放 id=${i2j?.id}`);
  cleanup.push(`DELETE FROM idempotency_keys WHERE idem_key = '${idem}'`);

  // ── 清理：删除自建测试数据 ──
  log('── 清理自建测试数据 ──');
  for (const sql of cleanup) {
    const r = d1(sql);
    log(`   ${r.status === 0 ? '✅' : '⚠️'} ${sql.slice(0, 70)}…`);
  }

  const fail = out.filter((x) => x.startsWith('❌')).length;
  log(`\n===== 结果：${fail === 0 ? '全部通过' : fail + ' 条未通过'} =====`);
};

run().catch((e) => { console.error('运行失败：', e); process.exit(1); });
