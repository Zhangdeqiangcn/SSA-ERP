// 套件 04 · 供应商主数据 CRUD + 前端/网关同源
// 覆盖：POST/GET/PUT/DELETE 全生命周期、扩展 JSON 列往返、前端写→网关读同一张 vendor_master
// 背景：V2.74.3 把前端 vendorStore 从 app_state Blob 迁到直连 D1 vendor_master；
//       期间暴露「PUT 绑参未传字段为 undefined 致 D1 500」真实缺陷，本套件常驻防回潮。
export const meta = { id: '04-vendor', title: '供应商 CRUD + 前端/网关同源（消除双数据源护栏）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;

  // ---------- 1. 创建（前端路径） ----------
  const code = `E2EV${runId}`;
  const create = await req('POST', '/api/vendors', {
    token,
    body: {
      code, name: 'E2E 常驻套件供应商', shortName: 'E2E供', type: 'manufacturer',
      contact: '张测试', phone: '13800000000', email: 'e2e@example.com',
      address: '成都市高新区', creditLimit: 1000000, usedCredit: 0,
      status: 'approved', creditLevel: 'A', taxId: '91510100E2E00000X',
      rating: 4.5, remarks: '生产 E2E 常驻套件创建，跑完自动清理',
    },
  });
  s.expectStatus('POST /api/vendors 创建供应商', create, 201);
  const vid = create.data?.id;
  if (!vid) {
    s.fail('创建未返回 id，后续供应商断言全部跳过', JSON.stringify(create.data)?.slice(0, 200));
    return;
  }
  ctx.track('vendor', vid);
  s.expectEq('创建回显 code 一致', create.data?.code, code);
  s.expectTrue('创建返回 createdBy 审计字段', !!create.data?.createdBy, `createdBy=${create.data?.createdBy}`);

  // ---------- 2. 详情读取 ----------
  const detail = await req('GET', `/api/vendors/${vid}`, { token });
  s.expectStatus('GET /api/vendors/:id 详情', detail, 200);
  s.expectEq('详情 creditLimit 与创建一致', Number(detail.data?.creditLimit), 1000000);
  s.expectEq('详情 name 与创建一致', detail.data?.name, 'E2E 常驻套件供应商');

  // ---------- 3. 列表可见 ----------
  const list = await req('GET', '/api/vendors', { token });
  const inList = (list.data?.data || []).some((v) => v.id === vid);
  s.expectTrue('新建供应商在列表中可见', inList, `total=${list.data?.total}`);

  // ---------- 4. 局部更新（仅传一个字段——V2.74.3 的 500 缺陷正在此处） ----------
  const put1 = await req('PUT', `/api/vendors/${vid}`, { token, body: { creditLimit: 88888 } });
  s.expectStatus('PUT /api/vendors/:id 仅传单字段不报 500（回潮护栏）', put1, 200);
  s.expectEq('局部更新后 creditLimit 生效', Number(put1.data?.creditLimit), 88888);
  s.expectEq('局部更新未清空 name（COALESCE 保留）', put1.data?.name, 'E2E 常驻套件供应商');

  // ---------- 5. 扩展 JSON 列往返（迁移 0017 补的 6 列） ----------
  const put2 = await req('PUT', `/api/vendors/${vid}`, {
    token,
    body: {
      customFields: { e2eField: 'e2eValue', n: 42 },
      blacklistReasonHistory: [{ reason: 'E2E 测试拉黑', at: '2026-01-01' }],
    },
  });
  s.expectStatus('PUT /api/vendors/:id 扩展 JSON 列写入', put2, 200);
  const detail2 = await req('GET', `/api/vendors/${vid}`, { token });
  const cf = detail2.data?.customFields;
  s.expectTrue('扩展列 customFields JSON 往返一致',
    cf && (cf.e2eField === 'e2eValue' || (typeof cf === 'string' && cf.includes('e2eValue'))),
    `customFields=${JSON.stringify(cf)?.slice(0, 120)}`);

  // ---------- 6. 前端/网关同源验证（核心：两条路径读写同一张 vendor_master） ----------
  const keyRes = await req('POST', '/api/open/keys', {
    token, body: { label: `e2e-${runId}-vendor-samesource`, scopes: 'write' },
  });
  const writeKey = keyRes.data?.plainKey;
  if (!writeKey) {
    s.warn('同源验证跳过', `无法创建网关 Key status=${keyRes.status}`);
  } else {
    ctx.writeKey = ctx.writeKey || writeKey; // 供 cleanup 删除网关创建的行
    const gw = await req('GET', '/api/open/vendors', { apiKey: writeKey });
    s.expectStatus('GET /api/open/vendors 网关读取', gw, 200);
    const found = (gw.data?.data || []).find((v) => v.id === vid || v.vendor_code === code);
    s.expectTrue('【同源】前端 POST 创建的供应商在网关可见', !!found,
      found ? `网关 code=${found.vendor_code}` : `网关 total=${gw.data?.total}（未找到 ${code}）`);
    s.expectTrue('【同源】网关读到的 credit_limit 反映前端 PUT 结果',
      Number(found?.credit_limit) === 88888,
      `网关 credit_limit=${found?.credit_limit} 期望=88888`);

    // 网关侧写入 → 前端侧应立即可见（反向同源）
    const gwPut = await req('PUT', `/api/open/vendors/${vid}`, {
      apiKey: writeKey, body: { credit_limit: 77777 },
    });
    s.expectStatus('PUT /api/open/vendors/:id 网关侧更新', gwPut, 200);
    const feAfter = await req('GET', `/api/vendors/${vid}`, { token });
    s.expectEq('【反向同源】网关写入在前端路径立即可见',
      Number(feAfter.data?.creditLimit), 77777, 'creditLimit');
  }

  // ---------- 7. 删除 → 两条路径同时消失 ----------
  const del = await req('DELETE', `/api/vendors/${vid}`, { token });
  s.expectStatus('DELETE /api/vendors/:id 删除', del, 200);
  const gone = await req('GET', `/api/vendors/${vid}`, { token });
  s.expectStatus('删除后前端详情 404', gone, 404);
  if (writeKey) {
    const gw2 = await req('GET', '/api/open/vendors', { apiKey: writeKey });
    const still = (gw2.data?.data || []).some((v) => v.id === vid);
    s.expectTrue('【同源】删除后网关侧同步消失', !still, still ? '网关仍可见（同源被破坏）' : '已消失');
  }
}
