// 交叉验证：复核后端扫描报的「带正确载荷仍 500」的端点
// 目的：任一路报的缺陷，第二路必须独立复现或给出反证。
// 用法：node scripts/_xf_check_500.mjs
import { readFileSync } from 'node:fs';

const BASE = 'https://ssa-erp.pages.dev';
const cred = JSON.parse(readFileSync(new URL('./prod-e2e/.e2e-credentials.json', import.meta.url), 'utf8'));

const login = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: cred.username, password: cred.password }),
});
const lj = await login.json();
const token = lj.token || lj.data?.token;
console.log('登录：', login.status, token ? '已取得令牌' : JSON.stringify(lj).slice(0, 120));
if (!token) process.exit(1);

const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
const rnd = () => Math.random().toString(36).slice(2, 6);

async function post(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const t = await r.text();
  return { status: r.status, text: t.slice(0, 260) };
}
async function del(path) {
  const r = await fetch(BASE + path, { method: 'DELETE', headers: H });
  return r.status;
}

// 逐个用「最小合法载荷」试，再用「较完整载荷」试，区分「入参未校验」与「功能彻底坏」
const CASES = [
  {
    name: '入库单 inbound-orders', path: '/api/inbound-orders',
    min: { orderNo: 'XF' + rnd() },
    full: { orderNo: 'XF' + rnd(), type: 'purchase', warehouseId: 'wh-001', warehouseName: '主仓', supplierId: 'ven-001', supplierName: '测试供应商', remark: '交叉验证', items: [{ materialCode: 'MAT202405010001', materialName: '钢板', quantity: 1, unitPrice: 10, amount: 10 }] },
  },
  {
    name: '出库单 outbound-orders', path: '/api/outbound-orders',
    min: { orderNo: 'XF' + rnd() },
    full: { orderNo: 'XF' + rnd(), type: 'sale', warehouseId: 'wh-001', warehouseName: '主仓', customerId: 'cus-001', customerName: '测试客户', remark: '交叉验证', items: [{ materialCode: 'MAT202405010001', materialName: '钢板', quantity: 1, unitPrice: 10, amount: 10 }] },
  },
  {
    name: '委外订单 subcontracts', path: '/api/subcontracts',
    min: { orderNo: 'XF' + rnd() },
    full: { orderNo: 'XF' + rnd(), type: 'process', vendorId: 'ven-001', vendorName: '测试供应商', materialCode: 'MAT202405010001', materialName: '钢板', quantity: 1, processFee: 10, remark: '交叉验证' },
  },
  {
    name: '项目 projects', path: '/api/projects',
    min: { projectNo: 'XF' + rnd(), projectName: '交叉验证项目' },
    full: { projectNo: 'XF' + rnd(), projectName: '交叉验证项目', customerName: '测试客户', status: 'planning', startDate: '2026-09-20', endDate: '2026-12-31', budget: 1000, manager: 'x', remark: '交叉验证' },
  },
  {
    name: '审批流 approval-flows', path: '/api/approval-flows',
    min: { module: 'xf_test' },
    full: { module: 'xf_test', moduleLabel: '交叉验证', enabled: 1, profile: 'standard', nodes: [{ name: '一级审批', role: 'admin' }] },
  },
];

const created = [];
console.log('\n══ 交叉验证：带正确载荷是否仍 500 ══\n');
for (const c of CASES) {
  console.log(`── ${c.name}  ${c.path}`);
  const a = await post(c.path, c.min);
  console.log(`   最小载荷 : ${a.status}  ${a.text}`);
  const b = await post(c.path, c.full);
  console.log(`   完整载荷 : ${b.status}  ${b.text}`);
  let id = null;
  try { id = JSON.parse(b.text).id || JSON.parse(b.text).data?.id; } catch {}
  if (b.status < 300 && id) {
    created.push({ path: c.path, id });
    const d = await del(`${c.path}/${id}`);
    const g = await fetch(BASE + `${c.path}/${id}`, { headers: H });
    console.log(`   清理     : DELETE=${d}  复检GET=${g.status}（404 为已清理）`);
  }
  console.log('');
}
console.log('══ 完成 ══');
console.log('创建并清理：', created.length ? JSON.stringify(created) : '无（全部失败，无需清理）');
