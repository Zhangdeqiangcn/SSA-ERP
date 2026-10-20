// 紧急清理：删除 _sweep_api_live 误建（且首轮 DELETE 返回 405 的）22 条测试数据。
// 仅删除脚本自建的测试 id，绝不碰存量业务数据。用法：node scripts/_sweep_cleanup_live.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.argv[2] || 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(resolve('scripts/prod-e2e/.e2e-credentials.json'), 'utf8'));

const call = async (m, p, t, b) => {
  const r = await fetch(BASE + p, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: b !== undefined ? JSON.stringify(b) : undefined,
  });
  const txt = await r.text();
  return { status: r.status, txt };
};

// 优先读取 _sweep_api_live.mjs 生成的本次自建 id 清单；读取失败才用硬编码兜底。
let DIRTY = [];
try {
  const j = JSON.parse(readFileSync(resolve('tmp/sweep_created.json'), 'utf8'));
  DIRTY = j.map((c) => ({ base: c.base || c.domain, id: c.id, entity: c.entity }));
} catch {}
if (DIRTY.length === 0) {
  DIRTY = [
  { base: 'materials', id: 'mat_8a5328a9aaa3412cbad61ee8a0acd1d7' },
  { base: 'bom', id: 'bom_18e90955b5cf4ccc829dae533319f8a7' },
  { base: 'bom', id: 'SWPB1789832367726knfvz' },
  { base: 'purchase-requests', id: 'pc_bcf11665346347f48b8215850ea71cbf' },
  { base: 'vendor-quotes', id: 'pc_36f151915315442a86cc99a88e8c78d3' },
  { base: 'purchase-orders', id: 'po_10635f798c0a4101ad76a77b043c2923' },
  { base: 'quality-holds', id: 'qh-b9e29702-6d25-4a66-ab94-aa4b5b5d324e' },
  { base: 'quality-holds', id: 'qh-9116b23e-691c-4bfe-88e7-f7f9e735a098' },
  { base: 'sales-prospects', id: 'pc_492982098f18475ab3e9b1063e5e7e14' },
  { base: 'shipments', id: 'pc_d9e1d4e1c673469e94840c2688cdcb31' },
  { base: 'stock-transfers', id: 'stf-139b748c-a482-4f66-a3f0-45d1211a34e2' },
  { base: 'stock-transfers', id: 'stf-61f06e45-0829-4481-8f65-591cf22729f5' },
  { base: 'inventory-adjustments', id: 'adj-535b89db-7276-4c9e-b071-540a013006cb' },
  { base: 'inventory-adjustments', id: 'adj-bb48f5c4-a1fa-4790-a4e5-670c8348b863' },
  { base: 'work-orders/picking', id: 'wop-f5ce1929-824d-48bf-bdb1-ca451bec7a79' },
  { base: 'process-routes', id: 'pc_410eb693f09b4c0c8fb1f0288529b0f1' },
  { base: 'vouchers', id: 'SWPV1789832367726wnffq' },
  { base: 'customers', id: 'cus_cfb666d60d46485695e569943b04cefa' },
  { base: 'vendors', id: 'ven_37dcada0bc5d4287a5461d55bfeca097' },
  { base: 'fin-payment-plans', id: 'pc_b679d36697cf41618742502d955008de', entity: 'finPaymentPlan' },
  { base: 'fin-project-accounts', id: 'pc_c23e0129cc3c45d49d7d08609ac5c4f8', entity: 'finProjectAccount' },
  { base: 'serial-numbers', id: 'sm-ad0bdde9-2e2e-4e42-b71b-bd15067464a3' },
  ];
}

const l = await call('POST', '/api/auth/login', null, { username: cred.username, password: cred.password });
if (l.status !== 200) { console.log('登录失败', l.status, l.txt.slice(0, 120)); process.exit(1); }
const T = JSON.parse(l.txt).token;
console.log(`登录成功，开始清理 ${DIRTY.length} 条测试数据\n`);

let ok = 0, fail = 0;
const remaining = [];
const delRetry = async (p) => {
  let r = await call('DELETE', p, T);
  for (let i = 0; i < 3 && r.status !== 200 && r.status !== 404; i++) {
    await new Promise((x) => setTimeout(x, 800));
    r = await call('DELETE', p, T);
  }
  return r;
};
for (const d of DIRTY) {
  // 先确认存在（GET）
  const g = await call('GET', `/api/${d.base}/${d.id}`, T);
  if (g.status === 404) { console.log(`✅ 已不存在 ${d.base}/${d.id}`); ok++; continue; }
  // 尝试直接 DELETE（带重试，克服瞬态 405）
  let del = await delRetry(`/api/${d.base}/${d.id}`);
  if (del.status !== 200 && del.status !== 404 && d.entity) {
    del = await delRetry(`/api/entities/${d.entity}/${d.id}`);
  }
  if (del.status === 200 || del.status === 404) {
    console.log(`✅ 已删除 ${d.base}/${d.id} (DELETE ${del.status})`);
    ok++;
  } else {
    console.log(`⚠️ 删除失败 ${d.base}/${d.id} (DELETE ${del.status}) ${del.txt.slice(0, 100)}`);
    fail++;
    remaining.push(d);
  }
}
// 二次确认：对仍存在的再 GET 一次
console.log('\n── 二次确认 ──');
for (const d of DIRTY) {
  const g = await call('GET', `/api/${d.base}/${d.id}`, T);
  const tag = g.status === 404 ? '✅' : '⚠️';
  if (g.status !== 404) { fail++; remaining.push(d); }
  console.log(`${tag} ${d.base}/${d.id} GET=${g.status}`);
}

console.log(`\n清理结果：成功 ${ok}，残留 ${remaining.length}`);
if (remaining.length) console.log('残留 id：', remaining.map((r) => `${r.base}/${r.id}`).join(', '));
