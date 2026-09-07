#!/usr/bin/env node
// 生产探针：验证 V2.81.0 盘点任务 checkTask 实体端点（/api/entities/checkTask）
// 真落 D1（check_tasks 表）+ 嵌套 items JSON 列往返 + 增删改全链路。
// 复刻前端 toCheckTaskPayload：items 以 JSON 字符串落库（与真实 app 同口径）。
import { createClient } from './lib/http.mjs';

const BASE = process.env.PROD_E2E_BASE || 'https://ssa-erp.pages.dev';
const req = createClient(BASE, { timeout: 30000 });
const runId = Date.now();

function assert(cond, name, detail) {
  console.log(`${cond ? '  ✅' : '  ❌'} ${name}${detail ? ' — ' + detail : ''}`);
  return cond;
}

const sampleItems = [
  { id: 'cki-p1', materialId: 'mat-001', materialCode: 'MAT001', materialName: '钢板 Q235B', locationId: 'loc-001', bookQuantity: 10, countQuantity: 8, difference: -2 },
  { id: 'cki-p2', materialId: 'mat-002', materialCode: 'MAT002', materialName: 'H型钢', locationId: 'loc-002', bookQuantity: 5, countQuantity: 5, difference: 0 },
];

async function main() {
  console.log(`\n▶ 生产探针 checkTask：BASE=${BASE} runId=${runId}`);

  // 1) 注册隔离组织 + admin
  const reg = await req('POST', '/api/auth/register', {
    body: {
      username: `e2e_ct_${runId}`, password: 'E2eProd!2026', name: 'E2E 盘点探针',
      companyCode: `E2ECT-${runId}`, role: 'admin', department: 'QA',
      orgName: `E2E 盘点探针 ${runId}`,
    },
  });
  if (reg.status !== 200 || !reg.data?.token) {
    console.error('❌ bootstrap 注册失败', reg.status, JSON.stringify(reg.data)?.slice(0, 200));
    process.exit(2);
  }
  const token = reg.data.token;
  const orgId = reg.data.user.org_id;
  console.log(`  ✅ 注册隔离组织 org_id=${orgId}`);

  let ok = true;

  // 2) 创建盘点任务（items 以 JSON 字符串落库，对齐前端 toCheckTaskPayload）
  const payload = {
    taskNo: `CK-PROBE-${runId}`,
    warehouseId: 'wh-001',
    warehouseName: '主仓库-A区',
    type: 'full',
    status: 'processing',
    startDate: '2026-09-04',
    operator: 'probe',
    items: JSON.stringify(sampleItems),
    differenceAmount: 2,
    remarks: 'probe',
  };
  const post = await req('POST', '/api/entities/checkTask', { token, body: payload });
  ok = assert(post.status === 201 || post.status === 200, 'POST 创建盘点任务', `status=${post.status}`) && ok;
  const created = post.data;
  const taskId = created?.id;
  ok = assert(!!taskId, '返回任务 id', `id=${taskId}`) && ok;
  ok = assert(created?.taskNo === payload.taskNo, 'taskNo 回显一致', `taskNo=${created?.taskNo}`) && ok;
  ok = assert(created?.org_id === orgId, 'org_id 隔离归属正确', `org_id=${created?.org_id}`) && ok;
  // 后端返回 items 为 JSON 字符串（TEXT 列），应能解析回原数组
  let itemsBack = null;
  try { itemsBack = typeof created?.items === 'string' ? JSON.parse(created.items) : created?.items; } catch {}
  ok = assert(Array.isArray(itemsBack) && itemsBack.length === 2 && itemsBack[0].bookQuantity === 10, 'items JSON 列往返正确', `items=${JSON.stringify(itemsBack)?.slice(0, 80)}`) && ok;

  // 3) GET 列表可查到（按 org 隔离，仅本组织可见）
  const list = await req('GET', '/api/entities/checkTask?page=1&pageSize=20', { token });
  ok = assert(list.status === 200, 'GET 列表', `status=${list.status}`) && ok;
  const found = (list.data?.data || []).find((t) => t.id === taskId);
  ok = assert(!!found, '列表中查到本任务', `total=${list.data?.total}`) && ok;
  ok = assert(found?.status === 'processing', '列表项 status=processing', `status=${found?.status}`) && ok;

  // 4) PUT 更新状态为 completed（模拟 postCheckAdjustment 写回）
  const put = await req('PUT', `/api/entities/checkTask/${taskId}`, {
    token,
    body: { status: 'completed', endDate: '2026-09-04', items: JSON.stringify(sampleItems.map((i) => ({ ...i, adjusted: true }))) },
  });
  ok = assert(put.status === 200, 'PUT 更新任务', `status=${put.status}`) && ok;
  const getOne = await req('GET', `/api/entities/checkTask/${taskId}`, { token });
  ok = assert(getOne.data?.status === 'completed', '更新后 status=completed', `status=${getOne.data?.status}`) && ok;
  let items2 = null;
  try { items2 = typeof getOne.data?.items === 'string' ? JSON.parse(getOne.data.items) : getOne.data?.items; } catch {}
  ok = assert(Array.isArray(items2) && items2[0]?.adjusted === true, '更新后 items 仍往返正确', `items[0].adjusted=${items2?.[0]?.adjusted}`) && ok;

  // 5) DELETE 删除
  const del = await req('DELETE', `/api/entities/checkTask/${taskId}`, { token });
  ok = assert(del.status === 200, 'DELETE 删除任务', `status=${del.status}`) && ok;
  const getAfter = await req('GET', `/api/entities/checkTask/${taskId}`, { token });
  ok = assert(getAfter.status === 404, '删除后不可见', `status=${getAfter.status}`) && ok;

  // 6) 其他组织不可见（org 隔离）
  const reg2 = await req('POST', '/api/auth/register', {
    body: { username: `e2e_ct2_${runId}`, password: 'E2eProd!2026', name: 'E2E 其他', companyCode: `E2ECT2-${runId}`, role: 'admin', department: 'QA', orgName: 'other' },
  });
  const token2 = reg2.data?.token;
  const list2 = await req('GET', `/api/entities/checkTask?page=1&pageSize=20`, { token: token2 });
  const found2 = (list2.data?.data || []).find((t) => t.id === taskId);
  ok = assert(!found2, '他组织不可见本组织任务（org 隔离）', `visible=${!!found2}`) && ok;

  console.log(`\n结论：${ok ? '✅ checkTask 实体链路全绿（建/查/改/删 + items JSON 往返 + org 隔离）' : '❌ 存在失败断言'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('探针异常', e); process.exit(2); });
