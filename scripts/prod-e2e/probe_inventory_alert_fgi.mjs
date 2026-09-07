#!/usr/bin/env node
// 生产探针：验证 V2.82.0 库存预警 inventoryAlert + 产成品入库 finishedGoodsInbound 两个实体端点
// 真落 D1（inventory_alerts / finished_goods_inbounds 表）+ 增删改全链路 + org 隔离。
// 复刻前端写法：字段全标量，实体端点 snake↔camel 自动映射。
import { createClient } from './lib/http.mjs';

const BASE = process.env.PROD_E2E_BASE || 'https://ssa-erp.pages.dev';
const req = createClient(BASE, { timeout: 30000 });
const runId = Date.now();

function assert(cond, name, detail) {
  console.log(`${cond ? '  ✅' : '  ❌'} ${name}${detail ? ' — ' + detail : ''}`);
  return cond;
}

async function bootstrap() {
  const reg = await req('POST', '/api/auth/register', {
    body: {
      username: `e2e_ia_${runId}`, password: 'E2eProd!2026', name: 'E2E 预警探针',
      companyCode: `E2EIA-${runId}`, role: 'admin', department: 'QA',
      orgName: `E2E 预警探针 ${runId}`,
    },
  });
  if (reg.status !== 200 || !reg.data?.token) {
    console.error('❌ bootstrap 注册失败', reg.status, JSON.stringify(reg.data)?.slice(0, 200));
    process.exit(2);
  }
  return { token: reg.data.token, orgId: reg.data.user.org_id };
}

async function main() {
  console.log(`\n▶ 生产探针 inventoryAlert + finishedGoodsInbound：BASE=${BASE} runId=${runId}`);
  const { token, orgId } = await bootstrap();
  console.log(`  ✅ 注册隔离组织 org_id=${orgId}`);

  let ok = true;

  // ===== 1) inventoryAlert =====
  console.log('\n[1] inventoryAlert（库存预警）');
  const alertPayload = {
    materialId: 'mat-probe-001',
    materialCode: 'MATPROBE001',
    materialName: '探针物料-A',
    type: 'low_stock',
    currentQuantity: 5,
    threshold: 20,
    severity: 'critical',
    createdAt: '2026-09-07',
  };
  const postA = await req('POST', '/api/entities/inventoryAlert', { token, body: alertPayload });
  ok = assert(postA.status === 201 || postA.status === 200, 'POST 创建库存预警', `status=${postA.status}`) && ok;
  const alertId = postA.data?.id;
  ok = assert(!!alertId, '返回预警 id', `id=${alertId}`) && ok;
  ok = assert(postA.data?.org_id === orgId, 'org_id 隔离归属正确', `org_id=${postA.data?.org_id}`) && ok;
  ok = assert(postA.data?.materialCode === alertPayload.materialCode, 'materialCode 回显一致', `code=${postA.data?.materialCode}`) && ok;

  const listA = await req('GET', '/api/entities/inventoryAlert?page=1&pageSize=20', { token });
  ok = assert(listA.status === 200, 'GET 列表', `status=${listA.status}`) && ok;
  const foundA = (listA.data?.data || []).find((t) => t.id === alertId);
  ok = assert(!!foundA, '列表中查到本预警', `total=${listA.data?.total}`) && ok;

  const putA = await req('PUT', `/api/entities/inventoryAlert/${alertId}`, { token, body: { severity: 'warning', currentQuantity: 12 } });
  ok = assert(putA.status === 200, 'PUT 更新预警', `status=${putA.status}`) && ok;
  const getA = await req('GET', `/api/entities/inventoryAlert/${alertId}`, { token });
  ok = assert(getA.data?.severity === 'warning' && getA.data?.currentQuantity === 12, '更新后字段生效', `severity=${getA.data?.severity}, qty=${getA.data?.currentQuantity}`) && ok;

  const delA = await req('DELETE', `/api/entities/inventoryAlert/${alertId}`, { token });
  ok = assert(delA.status === 200, 'DELETE 删除预警', `status=${delA.status}`) && ok;
  const getAfterA = await req('GET', `/api/entities/inventoryAlert/${alertId}`, { token });
  ok = assert(getAfterA.status === 404, '删除后不可见', `status=${getAfterA.status}`) && ok;

  // ===== 2) finishedGoodsInbound =====
  console.log('\n[2] finishedGoodsInbound（产成品入库）');
  const fgiPayload = {
    inboundNo: `FIN-PROBE-${runId}`,
    workOrderId: 'wo-probe-001',
    workOrderNo: 'WO-PROBE-001',
    productId: 'prod-001',
    productCode: 'PRODPROBE001',
    productName: '探针产成品',
    specification: 'φ50×100',
    unit: '件',
    plannedQty: 100,
    actualQty: 98,
    qualifiedQty: 95,
    rejectedQty: 3,
    batchNo: 'B20260907',
    warehouseId: 'wh-001',
    warehouseName: '主仓库-A区',
    locationId: 'loc-001',
    locationName: 'A-01-01',
    inspectionTaskId: 'ins-probe-001',
    status: 'pending',
    operator: 'probe',
    inboundDate: '2026-09-07',
    remarks: 'probe',
    createdAt: '2026-09-07',
    updatedAt: '2026-09-07',
    createdBy: 'probe',
    updatedBy: 'probe',
  };
  const postF = await req('POST', '/api/entities/finishedGoodsInbound', { token, body: fgiPayload });
  ok = assert(postF.status === 201 || postF.status === 200, 'POST 创建产成品入库', `status=${postF.status}`) && ok;
  const fgiId = postF.data?.id;
  ok = assert(!!fgiId, '返回入库单 id', `id=${fgiId}`) && ok;
  ok = assert(postF.data?.org_id === orgId, 'org_id 隔离归属正确', `org_id=${postF.data?.org_id}`) && ok;
  ok = assert(postF.data?.inboundNo === fgiPayload.inboundNo, 'inboundNo 回显一致', `inboundNo=${postF.data?.inboundNo}`) && ok;
  ok = assert(postF.data?.qualifiedQty === 95, 'qualifiedQty 标量字段往返', `qty=${postF.data?.qualifiedQty}`) && ok;

  const listF = await req('GET', '/api/entities/finishedGoodsInbound?page=1&pageSize=20', { token });
  ok = assert(listF.status === 200, 'GET 列表', `status=${listF.status}`) && ok;
  const foundF = (listF.data?.data || []).find((t) => t.id === fgiId);
  ok = assert(!!foundF, '列表中查到本入库单', `total=${listF.data?.total}`) && ok;

  const putF = await req('PUT', `/api/entities/finishedGoodsInbound/${fgiId}`, { token, body: { status: 'completed', actualQty: 99 } });
  ok = assert(putF.status === 200, 'PUT 更新入库单', `status=${putF.status}`) && ok;
  const getF = await req('GET', `/api/entities/finishedGoodsInbound/${fgiId}`, { token });
  ok = assert(getF.data?.status === 'completed' && getF.data?.actualQty === 99, '更新后字段生效', `status=${getF.data?.status}, qty=${getF.data?.actualQty}`) && ok;

  const delF = await req('DELETE', `/api/entities/finishedGoodsInbound/${fgiId}`, { token });
  ok = assert(delF.status === 200, 'DELETE 删除入库单', `status=${delF.status}`) && ok;
  const getAfterF = await req('GET', `/api/entities/finishedGoodsInbound/${fgiId}`, { token });
  ok = assert(getAfterF.status === 404, '删除后不可见', `status=${getAfterF.status}`) && ok;

  // ===== 3) org 隔离（他组织不可见本组织数据）=====
  console.log('\n[3] org 隔离');
  const reg2 = await req('POST', '/api/auth/register', {
    body: { username: `e2e_ia2_${runId}`, password: 'E2eProd!2026', name: 'E2E 其他', companyCode: `E2EIA2-${runId}`, role: 'admin', department: 'QA', orgName: 'other' },
  });
  const token2 = reg2.data?.token;
  // 重建一个本组织预警用于隔离校验
  const postA2 = await req('POST', '/api/entities/inventoryAlert', { token, body: { ...alertPayload, materialCode: 'ISO-LATEST' } });
  const aid2 = postA2.data?.id;
  const list2 = await req('GET', '/api/entities/inventoryAlert?page=1&pageSize=20', { token: token2 });
  const found2 = (list2.data?.data || []).find((t) => t.id === aid2);
  ok = assert(!found2, '他组织不可见本组织预警（org 隔离）', `visible=${!!found2}`) && ok;
  if (aid2) await req('DELETE', `/api/entities/inventoryAlert/${aid2}`, { token });

  console.log(`\n结论：${ok ? '✅ inventoryAlert + finishedGoodsInbound 实体链路全绿（建/查/改/删 + 标量字段往返 + org 隔离）' : '❌ 存在失败断言'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('探针异常', e); process.exit(2); });
