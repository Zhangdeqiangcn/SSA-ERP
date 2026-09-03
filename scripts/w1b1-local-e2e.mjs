// SSA ERP · W1-B1 本地验证（根治双通道 · 试水两域：序列号 + 委外）
// ------------------------------------------------------------
// 目的：用真实 Cloudflare 运行时（wrangler pages dev --local）+ 本地 D1，
//       直接打 functions/api 端点，验证 W1-B1 两域已真实直连 D1（不再是 SPA 回退 404），
//       且 CRUD + 流转轨迹(movements) + 发料明细(issueItems) + 组织隔离 全部正确落库。
// 运行前提：先启动 `wrangler pages dev dist --local --persist-to .wrangler/local-state --port 8788`
// 用法：node scripts/w1b1-local-e2e.mjs   （BASE 可用环境变量覆盖）
// 注意：只读/写本地 D1，绝不触达远程生产库。

import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const RUN = Date.now().toString(36);
const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail });
  const tag = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️ ';
  console.log(`${tag} ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, contentType: res.headers.get('content-type') || '' };
}

async function main() {
  console.log(`\n=== W1-B1 本地验证 @ ${BASE} ===\n`);

  // 1) 注册组织 A（创建组织+用户+会话）→ 拿 token
  const orgA = 'w1b1a_' + Date.now().toString(36);
  const r1 = await req('POST', '/api/auth/register', {
    username: orgA, password: 'pwd123456', name: 'A', companyCode: 'W1B1A', role: 'admin',
  });
  if (r1.status === 200 && r1.data?.token) {
    rec('A: register 创建组织/用户/会话', 'PASS', `org_id=${r1.data.user.org_id}`);
  } else {
    rec('A: register', 'FAIL', `status=${r1.status} ${JSON.stringify(r1.data)}`);
    return finish(1);
  }
  const tokenA = r1.data.token;

  // 2) 注册组织 B（用于组织隔离验证）
  const orgB = 'w1b1b_' + Date.now().toString(36);
  const r2 = await req('POST', '/api/auth/register', {
    username: orgB, password: 'pwd123456', name: 'B', companyCode: 'W1B1B', role: 'admin',
  });
  const tokenB = r2.data?.token;
  rec('B: register 第二组织', r2.status === 200 && tokenB ? 'PASS' : 'FAIL', `org_id=${r2.data?.user?.org_id}`);

  // ===== 序列号域 =====
  // POST 创建（带显式 movement）
  const snBody = {
    serialNo: 'SN-W1B1-' + RUN, materialId: 'mat-x', materialCode: 'M-X', materialName: '测试件',
    batchNo: 'B1', warehouseId: 'wh1', status: 'in_stock', inboundDate: '2026-09-03',
    movement: { type: 'inbound', docNo: 'IN-1', date: '2026-09-03', status: 'in_stock', note: '初始入库' },
  };
  const c1 = await req('POST', '/api/serial-numbers', snBody, tokenA);
  const snId = c1.data?.id;
  rec('序列号 POST 创建落 D1', c1.status === 200 && snId ? 'PASS' : 'FAIL', `status=${c1.status} id=${snId}`);
  const mv = c1.data?.movements || [];
  rec('序列号 POST 响应含 movements 轨迹(W1-B1关键)', Array.isArray(mv) && mv.length >= 1 ? 'PASS' : 'FAIL', `movements=${mv.length}`);

  // GET 列表（应是非 SPA 回退的真实 JSON）
  const g1 = await req('GET', '/api/serial-numbers?pageSize=50', undefined, tokenA);
  const listA = g1.data?.data || [];
  const isReal = g1.contentType.includes('application/json') && g1.status === 200;
  rec('序列号 GET 列表（真实 D1 后端，非 SPA 回退）', isReal ? 'PASS' : 'FAIL', `status=${g1.status} ct=${g1.contentType} total=${g1.data?.pagination?.total}`);
  const firstSn = listA.find(r => r.id === snId);
  rec('序列号 GET 列表含刚创建行', firstSn ? 'PASS' : 'FAIL', `listLen=${listA.length}`);
  rec('序列号 列表行含 snake 字段(serial_no)+movements', firstSn && firstSn.serial_no && Array.isArray(firstSn.movements) ? 'PASS' : 'FAIL', `serial_no=${firstSn?.serial_no} mv=${firstSn?.movements?.length}`);

  // PUT 更新 + 追加 movement
  const u1 = await req('PUT', `/api/serial-numbers/${snId}`, {
    status: 'out_stock', outboundDate: '2026-09-04',
    movement: { type: 'outbound', docNo: 'OUT-1', date: '2026-09-04', status: 'out_stock', note: '出库' },
  }, tokenA);
  rec('序列号 PUT 更新落 D1', u1.status === 200 ? 'PASS' : 'FAIL', `status=${u1.status}`);
  const mvAfter = u1.data?.movements || [];
  rec('序列号 PUT 后 movements 累积(入库+出库=2)', mvAfter.length === 2 ? 'PASS' : 'FAIL', `movements=${mvAfter.length}`);

  // 组织隔离：B 看不到 A 的序列号
  const gB = await req('GET', '/api/serial-numbers?pageSize=50', undefined, tokenB);
  const listB = gB.data?.data || [];
  rec('序列号 组织隔离(B 看不到 A 的数据)', !listB.some(r => r.id === snId) ? 'PASS' : 'FAIL', `B 列表含 A 行? ${listB.some(r => r.id === snId)}`);

  // DELETE
  const d1 = await req('DELETE', `/api/serial-numbers/${snId}`, undefined, tokenA);
  rec('序列号 DELETE 落 D1', d1.status === 200 ? 'PASS' : 'FAIL', `status=${d1.status}`);
  const gAfterDel = await req('GET', `/api/serial-numbers/${snId}`, undefined, tokenA);
  rec('序列号 DELETE 后 GET 404', gAfterDel.status === 404 ? 'PASS' : 'FAIL', `status=${gAfterDel.status}`);

  // ===== 委外域 =====
  const scoBody = {
    orderNo: 'SCO-W1B1-' + RUN, type: 'process', materialId: 'mat-y', materialCode: 'M-Y', materialName: '外壳',
    vendorId: 'v1', vendorName: '委外厂', qty: 100, planDate: '2026-09-10', processFee: 5.5,
    issueItems: [{ materialId: 'mat-z', materialCode: 'M-Z', materialName: '螺丝', unit: '个', qty: 200 }],
  };
  const sc1 = await req('POST', '/api/subcontracts', scoBody, tokenA);
  const scoId = sc1.data?.id;
  rec('委外 POST 创建落 D1', sc1.status === 200 && scoId ? 'PASS' : 'FAIL', `status=${sc1.status} id=${scoId}`);
  rec('委外 POST 响应含 issueItems(W1-B1一致性修复)', Array.isArray(sc1.data?.issueItems) && sc1.data.issueItems.length === 1 ? 'PASS' : 'FAIL', `issueItems=${(sc1.data?.issueItems || []).length}`);

  const sg1 = await req('GET', '/api/subcontracts?pageSize=50', undefined, tokenA);
  const scoListA = sg1.data?.data || [];
  const isRealSco = sg1.contentType.includes('application/json') && sg1.status === 200;
  rec('委外 GET 列表（真实 D1 后端，非 SPA 回退）', isRealSco ? 'PASS' : 'FAIL', `status=${sg1.status} ct=${sg1.contentType} total=${sg1.data?.pagination?.total}`);
  const firstSco = scoListA.find(r => r.id === scoId);
  rec('委外 列表行含 issueItems(W1-B1增强)', firstSco && Array.isArray(firstSco.issueItems) && firstSco.issueItems.length === 1 ? 'PASS' : 'FAIL', `listIssueItems=${(firstSco?.issueItems || []).length}`);
  rec('委外 数值字段 Number 化(qty/process_fee)', firstSco && typeof firstSco.qty === 'number' && typeof firstSco.process_fee === 'number' ? 'PASS' : 'FAIL', `qty=${firstSco?.qty} fee=${firstSco?.process_fee}`);

  // PUT 更新 + 改 issueItems
  const su1 = await req('PUT', `/api/subcontracts/${scoId}`, {
    status: 'issued', qty: 120,
    issueItems: [
      { materialId: 'mat-z', materialCode: 'M-Z', materialName: '螺丝', unit: '个', qty: 240 },
      { materialId: 'mat-w', materialCode: 'M-W', materialName: '垫片', unit: '个', qty: 50 },
    ],
  }, tokenA);
  rec('委外 PUT 更新落 D1', su1.status === 200 ? 'PASS' : 'FAIL', `status=${su1.status}`);
  const suItems = su1.data?.issueItems || [];
  rec('委外 PUT 响应含 issueItems(W1-B1一致性修复)', suItems.length === 2 ? 'PASS' : 'FAIL', `issueItems=${suItems.length}`);

  // 组织隔离
  const sgB = await req('GET', '/api/subcontracts?pageSize=50', undefined, tokenB);
  const scoListB = sgB.data?.data || [];
  rec('委外 组织隔离(B 看不到 A 的数据)', !scoListB.some(r => r.id === scoId) ? 'PASS' : 'FAIL', `B 列表含 A 行? ${scoListB.some(r => r.id === scoId)}`);

  // DELETE
  const sd1 = await req('DELETE', `/api/subcontracts/${scoId}`, undefined, tokenA);
  rec('委外 DELETE 落 D1', sd1.status === 200 ? 'PASS' : 'FAIL', `status=${sd1.status}`);
  const sdAfter = await req('GET', `/api/subcontracts/${scoId}`, undefined, tokenA);
  rec('委外 DELETE 后 GET 404', sdAfter.status === 404 ? 'PASS' : 'FAIL', `status=${sdAfter.status}`);

  finish(0);
}

function finish(code) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const info = results.filter(r => r.status === 'INFO').length;
  console.log(`\n=== W1-B1 汇总: PASS=${pass} FAIL=${fail} INFO=${info} ===`);
  try {
    writeFileSync('.wrangler/w1b1-local-result.json', JSON.stringify({ pass, fail, info, results }, null, 2));
  } catch {}
  process.exit(code);
}

main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
