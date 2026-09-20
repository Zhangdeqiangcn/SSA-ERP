// V3.15.10 上线验收：真实端点往返（生产域）
// ① pcCreate 空载荷守卫：9 个共用端点空 body 应 400 且不含 D1_ERROR
// ② 正确载荷仍可创建（不能把正常业务拦死）→ 创建后立即删除复原
// ③ 数据导出应留下审计记录
// 用法：node scripts/_verify_31510_live.mjs
import { readFileSync } from 'node:fs';

const BASE = 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`  ✅ ${n}${e ? ' — ' + e : ''}`); } else { fail++; console.log(`  ❌ ${n}${e ? ' — ' + e : ''}`); } };

const lj = await (await fetch(BASE + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cred),
})).json();
const token = lj.token || lj.data?.token;
ok('登录取得令牌', !!token);
if (!token) process.exit(1);
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
const rnd = () => Math.random().toString(36).slice(2, 6);
const LEAK = /D1_ERROR|SQLITE_|syntax error|no such column/i;

console.log('\n① 空载荷守卫（共用 pcCreate 的 9 个端点）');
const PCS = [
  ['采购申请', 'purchase-requests', { requestNo: 'VF' + rnd(), applicant: '验证' }],
  ['供应商报价', 'vendor-quotes', { quoteNo: 'VF' + rnd(), vendorId: 'v1' }],
  ['意向客户', 'sales-prospects', { customerName: '验证客户', contactName: 't' }],
  ['发货单', 'shipments', { shipmentNo: 'VF' + rnd() }],
  ['工艺路线', 'process-routes', { routeNo: 'VF' + rnd() }],
  ['审批流', 'approval-flows', { module: 'vf' + rnd() }],
  ['付款计划', 'fin-payment-plans', { planNo: 'VF' + rnd() }],
  ['项目核算', 'fin-project-accounts', { accountNo: 'VF' + rnd() }],
  ['项目', 'projects', { projectNo: 'VF' + rnd(), projectName: '验证项目' }],
];

for (const [label, res, payload] of PCS) {
  let r = await fetch(BASE + `/api/${res}`, { method: 'POST', headers: H, body: JSON.stringify({}) });
  let t = await r.text();
  ok(`${label} 空载荷 → 400`, r.status === 400, `实际 ${r.status}`);
  ok(`${label} 空载荷不泄露数据库原文`, !LEAK.test(t), t.slice(0, 90));

  // 正确载荷仍要能创建（守卫不能误伤正常业务）
  r = await fetch(BASE + `/api/${res}`, { method: 'POST', headers: H, body: JSON.stringify(payload) });
  t = await r.text();
  const good = r.status < 300;
  ok(`${label} 正确载荷仍可创建`, good, `实际 ${r.status} ${t.slice(0, 70)}`);
  if (good) {
    let id = null;
    try { id = JSON.parse(t).id; } catch {}
    if (id) {
      await fetch(BASE + `/api/${res}/${id}`, { method: 'DELETE', headers: H });
      const g = await fetch(BASE + `/api/${res}/${id}`, { headers: H });
      ok(`${label} 测试数据已清理`, g.status === 404, `复检 GET=${g.status}`);
    }
  }
}

console.log('\n② 数据导出留痕');
const b = await fetch(BASE + '/api/system/backup?mode=manifest', { headers: H });
ok('导出接口可用', b.status === 200, `status=${b.status}`);
const a = await fetch(BASE + '/api/audit?entity=system_backup&action=export', { headers: H });
const aj = await a.json().catch(() => ({}));
const rows = aj.data || [];
ok('导出动作已写入审计日志', rows.length > 0, `命中 ${rows.length} 条`);
if (rows.length) console.log('     最新一条：', JSON.stringify(rows[0]).slice(0, 160));

console.log(`\n══ 结果：${pass} 通过 / ${fail} 失败 ══`);
process.exit(fail === 0 ? 0 : 1);
