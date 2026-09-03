// SSA ERP · W1 根治双通道 · 事务域 CRUD 本地 D1 集成验证
// 验证：vouchers(POST id+remark/GET/PUT/DELETE 往返) + work-orders/sales-orders/purchase-orders POST + 四域 GET 列表
// 运行前提：本地 `wrangler pages dev dist --local --persist-to .wrangler/local-state --port 8788` 已启动
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
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
  console.log(`\n=== SSA ERP W1 CRUD 验证 @ ${BASE} ===\n`);
  const uname = 'w1e2e_' + Date.now().toString(36);
  const r1 = await req('POST', '/api/auth/register', {
    username: uname, password: 'e2epwd123', name: 'W1E2E', companyCode: 'W1E2EORG', role: 'admin',
  });
  if (r1.status !== 200 || !r1.data?.token) { rec('register 隔离组织', 'FAIL', `status=${r1.status} ${JSON.stringify(r1.data)}`); return finish(1); }
  rec('register 隔离组织', 'PASS', `org_id=${r1.data.user.org_id}`);
  const token = r1.data.token;

  // ── 1) vouchers 全链路往返（W1 最高风险：id 透传 + remark→remarks + items）──
  const vId = 'VCH-W1E2E-0001';
  const voucher = {
    id: vId, voucherNo: 'W1E2E-0001', voucherType: '记', date: '2026-08-27', period: '2026-08',
    source: 'manual', status: 'draft', totalDebit: 100, totalCredit: 100, currency: 'CNY',
    attachmentCount: 0, sourceNo: null, createdBy: 'e2e', remark: 'W1 E2E 测试凭证',
    items: [
      { id: 'VI-1', lineNo: 1, summary: '借库存现金', accountCode: '1001', accountName: '库存现金', debit: 100, credit: 0, currency: 'CNY', exchangeRate: 1 },
      { id: 'VI-2', lineNo: 2, summary: '贷应付账款', accountCode: '2202', accountName: '应付账款', debit: 0, credit: 100, currency: 'CNY', exchangeRate: 1 },
    ],
  };
  const p = await req('POST', '/api/vouchers', voucher, token);
  rec('vouchers POST 创建(含 id+remark+items)', p.status === 201 && p.data?.id === vId ? 'PASS' : 'FAIL',
    `status=${p.status} id=${p.data?.id} remarks=${p.data?.remarks}`);
  if (p.status !== 201) return finish(1);

  // GET 列表应随行明细返回，且 remark 字段（snake→camel 映射 remarks→remark）
  const list = await req('GET', '/api/vouchers', undefined, token);
  const inList = (list.data?.data || []).find((v) => v.id === vId);
  rec('vouchers GET 列表含新建凭证', inList ? 'PASS' : 'FAIL',
    `total=${list.data?.pagination?.total} hasItems=${Array.isArray(inList?.items)} itemsLen=${inList?.items?.length}`);
  // GET 单条
  const one = await req('GET', `/api/vouchers/${vId}`, undefined, token);
  // 注：API 返回 snake_case（remarks/voucher_type），前端经 snakeToCamel 映射为 remark/voucherType；
  // 此处按 API 实际契约校验，避免误报（后端以 D1 列为真相源）。
  rec('vouchers GET/:id 明细+remark映射', (one.data?.id === vId && one.data?.remarks === 'W1 E2E 测试凭证' && one.data?.items?.length === 2) ? 'PASS' : 'FAIL',
    `remark=${one.data?.remarks} items=${one.data?.items?.length} voucherType=${one.data?.voucher_type}`);

  // PUT 更新 remark + 审核状态
  const u = await req('PUT', `/api/vouchers/${vId}`, { remark: 'W1 已更新备注', status: 'reviewed', reviewedBy: 'e2e' }, token);
  const one2 = await req('GET', `/api/vouchers/${vId}`, undefined, token);
  rec('vouchers PUT 更新 remark/status', (one2.data?.remarks === 'W1 已更新备注' && one2.data?.status === 'reviewed') ? 'PASS' : 'FAIL',
    `remark=${one2.data?.remarks} status=${one2.data?.status}`);

  // DELETE
  const d = await req('DELETE', `/api/vouchers/${vId}`, undefined, token);
  const one3 = await req('GET', `/api/vouchers/${vId}`, undefined, token);
  rec('vouchers DELETE 删除', (d.status === 200 && one3.status === 404) ? 'PASS' : 'FAIL', `del=${d.status} getAfter=${one3.status}`);

  // ── 2) 其余三域 POST（W1 补端点）──
  // 用每轮唯一单号，避免本地持久化库里历史单号导致 409（验证的是创建逻辑，非幂等）
  const runId = Date.now().toString(36);
  const wo = await req('POST', '/api/work-orders', { orderNo: `WO-W1-${runId}`, productCode: 'P001', productName: '测试品', status: 'planned' }, token);
  rec('work-orders POST 创建', wo.status === 201 ? 'PASS' : 'FAIL', `status=${wo.status}`);
  const po = await req('POST', '/api/purchase-orders', { orderNo: `PO-W1-${runId}`, vendorId: 'V-W1', vendorName: '测试供应商' }, token);
  rec('purchase-orders POST 创建', po.status === 201 ? 'PASS' : 'FAIL', `status=${po.status}`);
  const so = await req('POST', '/api/sales-orders', { orderNo: `SO-W1-${runId}`, customerName: '测试客户' }, token);
  rec('sales-orders POST 创建', so.status === 201 ? 'PASS' : 'FAIL', `status=${so.status}`);

  // ── 3) 四域 GET 列表（store 启动期 load 走此路径）──
  for (const d of ['vouchers', 'work-orders', 'purchase-orders', 'sales-orders']) {
    const g = await req('GET', `/api/${d}`, undefined, token);
    rec(`GET /api/${d} 列表(load 路径)`, g.status === 200 ? 'PASS' : 'FAIL', `status=${g.status} total=${g.data?.pagination?.total ?? '?'}`);
  }

  finish(0);
}
function finish(code) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n=== 汇总: PASS=${pass} FAIL=${fail} ===`);
  mkdirSync('.d1test7', { recursive: true });
  writeFileSync('.d1test7/w1-crud-e2e-result.json', JSON.stringify({ pass, fail, results }, null, 2));
  process.exit(code);
}
main().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
