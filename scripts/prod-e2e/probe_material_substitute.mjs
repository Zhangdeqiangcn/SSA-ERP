#!/usr/bin/env node
// 生产探针：验证 V2.84.0 物料替代料组 materialSubstitute 实体端点
// 真落 D1（material_substitutes 表）+ 增删改全链路 + 字段往返 + org 隔离。
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
      username: `e2e_ms_${runId}`, password: 'E2eProd!2026', name: 'E2E 替代料探针',
      companyCode: `E2EMS-${runId}`, role: 'admin', department: 'QA',
      orgName: `E2E 替代料探针 ${runId}`,
    },
  });
  if (reg.status !== 200 || !reg.data?.token) {
    console.error('❌ bootstrap 注册失败', reg.status, JSON.stringify(reg.data)?.slice(0, 200));
    process.exit(2);
  }
  return { token: reg.data.token, orgId: reg.data.user.org_id };
}

async function main() {
  console.log(`\n▶ 生产探针 materialSubstitute：BASE=${BASE} runId=${runId}`);
  const { token, orgId } = await bootstrap();
  console.log(`  ✅ 注册隔离组织 org_id=${orgId}`);

  let ok = true;

  // ===== 1) materialSubstitute 建/查/改/删 =====
  console.log('\n[1] materialSubstitute（物料替代料组）');
  const subPayload = {
    materialCode: 'MATPROBE001',
    materialName: '探针主物料-A',
    substituteCode: 'MATPROBE002',
    substituteName: '探针替代料-B',
    priority: 1,
    substituteType: 'partial',
    conversionRatio: 1,
    effectiveFrom: '2026-08-27',
    effectiveTo: '2026-12-31',
    reason: '缺料时替代',
    remarks: 'probe',
  };
  const post = await req('POST', '/api/entities/materialSubstitute', { token, body: subPayload });
  ok = assert(post.status === 201 || post.status === 200, 'POST 创建替代料', `status=${post.status}`) && ok;
  const subId = post.data?.id;
  ok = assert(!!subId, '返回替代料 id', `id=${subId}`) && ok;
  ok = assert(post.data?.org_id === orgId, 'org_id 隔离归属正确', `org_id=${post.data?.org_id}`) && ok;
  ok = assert(post.data?.materialCode === subPayload.materialCode, 'materialCode 回显一致', `code=${post.data?.materialCode}`) && ok;
  ok = assert(post.data?.substituteType === 'partial', 'substituteType 标量字段往返', `type=${post.data?.substituteType}`) && ok;
  ok = assert(post.data?.conversionRatio === 1, 'conversionRatio 标量字段往返', `ratio=${post.data?.conversionRatio}`) && ok;

  const list = await req('GET', '/api/entities/materialSubstitute?page=1&pageSize=20', { token });
  ok = assert(list.status === 200, 'GET 列表', `status=${list.status}`) && ok;
  const found = (list.data?.data || []).find((t) => t.id === subId);
  ok = assert(!!found, '列表中查到本替代料', `total=${list.data?.total}`) && ok;

  const put = await req('PUT', `/api/entities/materialSubstitute/${subId}`, { token, body: { priority: 2, substituteType: 'full' } });
  ok = assert(put.status === 200, 'PUT 更新替代料', `status=${put.status}`) && ok;
  const get = await req('GET', `/api/entities/materialSubstitute/${subId}`, { token });
  ok = assert(get.data?.priority === 2 && get.data?.substituteType === 'full', '更新后字段生效', `priority=${get.data?.priority}, type=${get.data?.substituteType}`) && ok;

  const del = await req('DELETE', `/api/entities/materialSubstitute/${subId}`, { token });
  ok = assert(del.status === 200, 'DELETE 删除替代料', `status=${del.status}`) && ok;
  const getAfter = await req('GET', `/api/entities/materialSubstitute/${subId}`, { token });
  ok = assert(getAfter.status === 404, '删除后不可见', `status=${getAfter.status}`) && ok;

  // ===== 2) org 隔离（他组织不可见本组织数据）=====
  console.log('\n[2] org 隔离');
  const reg2 = await req('POST', '/api/auth/register', {
    body: { username: `e2e_ms2_${runId}`, password: 'E2eProd!2026', name: 'E2E 其他', companyCode: `E2EMS2-${runId}`, role: 'admin', department: 'QA', orgName: 'other' },
  });
  const token2 = reg2.data?.token;
  const post2 = await req('POST', '/api/entities/materialSubstitute', { token, body: { ...subPayload, substituteCode: 'ISO-LATEST' } });
  const sid2 = post2.data?.id;
  const list2 = await req('GET', '/api/entities/materialSubstitute?page=1&pageSize=20', { token: token2 });
  const found2 = (list2.data?.data || []).find((t) => t.id === sid2);
  ok = assert(!found2, '他组织不可见本组织替代料（org 隔离）', `visible=${!!found2}`) && ok;
  if (sid2) await req('DELETE', `/api/entities/materialSubstitute/${sid2}`, { token });

  console.log(`\n结论：${ok ? '✅ materialSubstitute 实体链路全绿（建/查/改/删 + 标量字段往返 + org 隔离）' : '❌ 存在失败断言'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('探针异常', e); process.exit(2); });
