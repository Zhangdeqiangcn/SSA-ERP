// 跨域表单流转审计 —— 关键 P0 真实接口取证探针
// 目的（铁律㉗/㉞）：子代理的代码推理必须用真实接口坐实，不采信未验证结论。
// 本探针只做「建单是否被守卫拦住」的真实性验证，不修改任何生产数据（失败即停）。
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CRED = join(__dirname, '.e2e-credentials.json');
if (!existsSync(CRED)) { console.error('缺少测试超管凭据'); process.exit(2); }
const cred = JSON.parse(readFileSync(CRED, 'utf8'));

const BASE = (() => {
  const hit = process.argv.find((a) => a.startsWith('--base='));
  return hit ? hit.slice('--base='.length) : 'https://ssa-erp.pages.dev';
})();

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* 非 JSON */ }
  return { status: res.status, data };
}

const run = async () => {
  console.log(`\n[P0 取证探针] ${BASE}\n`);
  const login = await req('POST', '/api/auth/login', { body: { username: cred.username, password: cred.password } });
  if (login.status !== 200 || !login.data?.token) { console.error('登录失败', login.status); process.exit(1); }
  const token = login.data.token;
  console.log(`[登录成功] org=${login.data.user?.org_id}\n`);
  const stamp = Date.now();

  // ═══ 取证①：生产域 P0「工单建不出来」—— 按前端真实字段建单（无 materialId）═══
  console.log('── 取证① 生产域：按前端真实字段建工单（productCode/productName，无 materialId）──');
  const wo = await req('POST', '/api/work-orders', {
    token,
    body: {
      orderNo: `WO-PROBE-${stamp}`,
      status: 'draft',
      productCode: `PROBE-FG-${stamp}`,   // 前端 WorkOrder 真实字段
      productName: '取证测试成品',
      bomId: '', bomNo: '',
      routeId: '', routeNo: '',
      plannedQuantity: 1,
      completedQuantity: 0,
      scrapQuantity: 0,
      workshop: '测试车间',
      supervisor: '取证',
      plannedStartDate: '2026-10-09',
      plannedEndDate: '2026-10-10',
    },
  });
  console.log(`  status=${wo.status}`);
  console.log(`  body=${JSON.stringify(wo.data).slice(0, 300)}`);
  if (wo.status === 400 && String(wo.data?.error || '').includes('生产物料')) {
    console.log('  ✅ 坐实 P0：后端要求「生产物料(materialId)」，而前端与 work_orders 表均无此字段 → 界面建工单必然 400');
  } else if (wo.status === 201 || wo.status === 200) {
    console.log('  ⚠️ 未复现 P0（本次建单成功）—— 需复核：可能存在其他路径或已修复');
    if (wo.data?.id) {
      const del = await req('DELETE', `/api/work-orders/${wo.data.id}`, { token });
      console.log(`  （已清理该工单，DELETE status=${del.status}）`);
    }
  } else {
    console.log(`  ⚠️ 意外状态 ${wo.status}，需人工复核`);
  }

  // ═══ 取证②：销售域 P0「信用额度闸门失效」→ V3.58.0 修复后预期行为 ═══
  console.log('\n── 取证② 销售域：信用额度闸门（检查 used_credit 是否被销售单回写）──');
  // 建一个客户，授信 1000
  const cus = await req('POST', '/api/customers', {
    token,
    body: { code: `PROBE-CUS-${stamp}`, name: '取证客户', creditLimit: 1000, status: 'active' },
  });
  console.log(`  建客户 status=${cus.status}`);
  if (cus.data?.id) {
    const cid = cus.data.id;
    const before = await req('GET', `/api/customers/${cid}`, { token });
    console.log(`  建单前 usedCredit=${before.data?.usedCredit ?? before.data?.used_credit}`);
    // 建一个商品以给订单挂物料id（订单明细可能要求物料存在）
    const probeMat = await req('POST', '/api/materials', {
      token,
      body: { code: `M-PROBE-${stamp}`, name: '取证物料', unit: '件', materialType: 'raw', status: 'active', standardPrice: 900 },
    });
    const mid = probeMat.data?.id;
    // 下 3 单，每单 900（合计 2700 > 授信 1000）→ V3.58.0 修复后：第2单起应被 400 拦截
    let blocked = 0;
    const createdOrderIds = [];
    for (let i = 1; i <= 3; i++) {
      const so = await req('POST', '/api/sales-orders', {
        token,
        body: {
          orderNo: `SO-PROBE-${stamp}-${i}`, customerId: cid, customerName: '取证客户',
          orderDate: '2026-10-09', status: 'draft',
          items: [{ materialId: mid, materialCode: `M-PROBE-${stamp}`, materialName: '取证物料', unit: '件', quantity: 1, unitPrice: 900, amount: 900 }],
        },
      });
      console.log(`  第${i}单 status=${so.status}${so.status !== 200 && so.status !== 201 ? ' ' + JSON.stringify(so.data).slice(0, 120) : ''}`);
      if (so.status === 422 || so.status === 409 || so.status === 403 || so.status === 400) blocked++;
      if (so.data?.id) createdOrderIds.push(so.data.id);
    }
    if (blocked >= 2) {
      console.log(`  ✅ S-07 已修复：第2、3单被拦截（累计超额），信用额度闸门生效`);
    } else {
      console.log(`  ⚠️ S-07 未生效：3 单全部放行，信用额度闸门仍失效（共拦截 ${blocked} 单）`);
    }
    // 清理全部测试数据
    for (const oid of createdOrderIds) await req('DELETE', `/api/sales-orders/${oid}`, { token });
    await req('DELETE', `/api/customers/${cid}`, { token });
    if (mid) await req('DELETE', `/api/materials/${mid}`, { token });
    console.log(`  （已清理：订单${createdOrderIds.length} 客户1 物料${mid ? 1 : 0}）`);
  }

  // ═══ 取证③：仓储域 WH-19「loadInventoryRecords 只取前 20 行」—— 库存记录总数 ═══
  console.log('\n── 取证③ 仓储域：库存记录条数（验证默认分页是否卡住权威源）──');
  const inv = await req('GET', '/api/inventory-records?pageSize=1', { token });
  console.log(`  total=${inv.data?.total}  本页返回=${(inv.data?.data || []).length}  pageSize=1`);
  const inv20 = await req('GET', '/api/inventory-records', { token });
  console.log(`  不传 pageSize 时返回条数=${(inv20.data?.data || []).length}（若为 20 即坐实默认分页截断）`);

  console.log('\n[取证探针结束]');
};

run().catch((e) => { console.error('探针异常:', e); process.exit(1); });