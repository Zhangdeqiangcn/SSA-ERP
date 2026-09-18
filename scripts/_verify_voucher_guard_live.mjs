// 一次性脚本：V3.15.9 凭证服务端借贷平衡闸门 —— 生产真实端点往返验收
// 用法：node scripts/_verify_voucher_guard_live.mjs [base]
// 说明：结对「负例→正例→整单回写→边界例→清理」，全程自建数据、结尾自删，不触碰存量业务数据。
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] || 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
};

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => '');
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* 非 JSON */ }
  return { status: res.status, data, text };
}

const stamp = Date.now();
const mkItems = (debit, credit) => ([
  { lineNo: 1, summary: '验证借方', accountCode: '1001', accountName: '库存现金', debit, credit: 0, currency: 'CNY', exchangeRate: 1 },
  { lineNo: 2, summary: '验证贷方', accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: 0, credit, currency: 'CNY', exchangeRate: 1 },
]);

console.log(`\n══ 凭证服务端借贷平衡闸门 · 线上往返验收 ══\n基址：${BASE}\n`);

// ① 登录
console.log('① 登录');
const login = await call('POST', '/api/auth/login', null, { username: cred.username, password: cred.password });
ok('登录成功并取得令牌', login.status === 200 && !!login.data?.token, `status=${login.status}`);
if (!login.data?.token) { console.log('\n无法继续：登录失败'); process.exit(1); }
const T = login.data.token;
const orgId = login.data.user?.org_id;
console.log(`  组织：${orgId}　用户：${login.data.user?.name || cred.username}\n`);

// ② 基线：凭证列表可读（确认没有把接口改坏）
console.log('② 基线回归：凭证列表');
const list = await call('GET', '/api/vouchers?page=1&pageSize=5', T);
ok('凭证列表返回 200', list.status === 200, `status=${list.status}`);
ok('列表为 JSON 结构', !!list.data && Array.isArray(list.data.data), `total=${list.data?.pagination?.total}`);

// ③ 负例：借贷不平必须被拒绝且不写库
console.log('③ 负例：借贷不平的凭证（借方 100 / 贷方 90）');
const bad = await call('POST', '/api/vouchers', T, {
  id: `VCH-GUARD-BAD-${stamp}`, voucherNo: `GUARD-BAD-${stamp}`, date: '2026-09-19',
  voucherType: '记', status: 'draft', source: 'manual', currency: 'CNY',
  items: mkItems(100, 90),
});
ok('服务端拒绝（400）', bad.status === 400, `status=${bad.status}`);
ok('返回差额信息', /借贷不平衡/.test(String(bad.data?.error || '')) && bad.data?.difference === 10,
  `error=${bad.data?.error} difference=${bad.data?.difference}`);
ok('错误码标记', bad.data?.code === 'VOUCHER_UNBALANCED', `code=${bad.data?.code}`);
const badCheck = await call('GET', `/api/vouchers/${'VCH-GUARD-BAD-' + stamp}`, T);
ok('确认未写库（查不到该凭证）', badCheck.status === 404, `status=${badCheck.status}`);

// ④ 负例：缺科目
console.log('④ 负例：分录行未填科目');
const noAcct = await call('POST', '/api/vouchers', T, {
  id: `VCH-GUARD-NA-${stamp}`, voucherNo: `GUARD-NA-${stamp}`, date: '2026-09-19',
  status: 'draft', source: 'manual',
  items: [{ lineNo: 1, summary: '无科目', debit: 50, credit: 0 }, { lineNo: 2, summary: '无科目', debit: 0, credit: 50 }],
});
ok('服务端拒绝（400）', noAcct.status === 400, `status=${noAcct.status}`);
ok('提示指向具体行', /第 1 行/.test(String(noAcct.data?.error || '')), `error=${noAcct.data?.error}`);

// ⑤ 正例：平衡凭证应保存成功
console.log('⑤ 正例：借贷平衡的凭证（借方 100 / 贷方 100）');
const goodNo = `GUARD-OK-${stamp}`;
const good = await call('POST', '/api/vouchers', T, {
  id: `VCH-${goodNo}`, voucherNo: goodNo, date: '2026-09-19',
  voucherType: '记', status: 'draft', source: 'manual', currency: 'CNY',
  items: mkItems(100, 100),
});
ok('保存成功（201）', good.status === 201, `status=${good.status} body=${(good.text || '').slice(0, 120)}`);
if (good.status === 201) {
  ok('服务端按分录反推并回写借方合计', Number(good.data?.total_debit) === 100, `total_debit=${good.data?.total_debit}`);
  ok('服务端按分录反推并回写贷方合计', Number(good.data?.total_credit) === 100, `total_credit=${good.data?.total_credit}`);
}

// ⑥ 关键回归：整单回写（模拟过账 / 红冲的 persistVoucher 行为）不能被闸门误伤
console.log('⑥ 关键回归：整单回写（模拟过账，PUT 携带全部分录 + 状态）');
const putPosted = await call('PUT', `/api/vouchers/VCH-${goodNo}`, T, {
  voucherNo: goodNo, date: '2026-09-19', status: 'posted',
  postedBy: '验证脚本', postedAt: new Date().toISOString(),
  items: mkItems(100, 100),
});
ok('过账整单回写成功（不误伤）', putPosted.status === 200, `status=${putPosted.status} body=${(putPosted.text || '').slice(0, 120)}`);

// ⑦ 边界例：红字冲销凭证（借贷双方为负）必须放行
console.log('⑦ 边界例：红字冲销凭证（借方 -100 / 贷方 -100）');
const revNo = `GUARD-REV-${stamp}`;
const rev = await call('POST', '/api/vouchers', T, {
  id: `VCH-${revNo}`, voucherNo: revNo, date: '2026-09-19',
  voucherType: '记', status: 'posted', source: 'reversal', currency: 'CNY',
  items: mkItems(-100, -100),
});
ok('红字凭证放行（201，未被「金额不能为负」误拒）', rev.status === 201, `status=${rev.status} body=${(rev.text || '').slice(0, 120)}`);

// ⑧ 负例：更新为不平（PUT 通道同样有闸门）
console.log('⑧ 负例：把已存在的凭证改成借贷不平');
const putBad = await call('PUT', `/api/vouchers/VCH-${goodNo}`, T, {
  voucherNo: goodNo, status: 'draft', items: mkItems(100, 80),
});
ok('更新通道同样拒绝（400）', putBad.status === 400, `status=${putBad.status}`);

// ⑨ 清理：删除本次自建的两张测试凭证
console.log('⑨ 清理自建测试数据');
const d1 = await call('DELETE', `/api/vouchers/VCH-${goodNo}`, T);
const d2 = await call('DELETE', `/api/vouchers/VCH-${revNo}`, T);
ok(`删除 ${goodNo}`, d1.status === 200, `status=${d1.status}`);
ok(`删除 ${revNo}`, d2.status === 200, `status=${d2.status}`);
const gone1 = await call('GET', `/api/vouchers/VCH-${goodNo}`, T);
const gone2 = await call('GET', `/api/vouchers/VCH-${revNo}`, T);
ok('确认已清理干净', gone1.status === 404 && gone2.status === 404, `${gone1.status}/${gone2.status}`);

console.log(`\n══ 结果：${pass} 通过 / ${fail} 失败 ══\n`);
process.exit(fail === 0 ? 0 : 1);
