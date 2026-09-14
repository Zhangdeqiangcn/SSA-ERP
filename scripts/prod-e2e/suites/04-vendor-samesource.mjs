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
    // V2.97.0（安全审计 B4）：网关读接口现已剔除主数据敏感字段（授信额度、税号、银行账号等），
    //   原先用 credit_limit 当「同源」探针已不再成立（取不到值是修复后的正确行为，不是同源被破坏）。
    //   故同源探针改用非敏感字段 creditLevel / credit_level，并补两条「敏感字段必须被剔除」的护栏断言。
    const putProbe = await req('PUT', `/api/vendors/${vid}`, { token, body: { creditLevel: 'B' } });
    s.expectStatus('PUT /api/vendors/:id 设置同源探针字段 creditLevel', putProbe, 200);

    const gw = await req('GET', '/api/open/vendors', { apiKey: writeKey });
    s.expectStatus('GET /api/open/vendors 网关读取', gw, 200);
    const found = (gw.data?.data || []).find((v) => v.id === vid || v.vendor_code === code);
    s.expectTrue('【同源】前端 POST 创建的供应商在网关可见', !!found,
      found ? `网关 code=${found.vendor_code}` : `网关 total=${gw.data?.total}（未找到 ${code}）`);
    s.expectEq('【同源】网关读到的 credit_level 反映前端 PUT 结果',
      found?.credit_level, 'B', 'credit_level');
    // B4 护栏：敏感字段不得出现在网关读取结果里，且响应须以 _hiddenFields 明确告知调用方
    s.expectTrue('【B4 护栏】网关读取已剔除 credit_limit',
      found !== undefined && found.credit_limit === undefined,
      `credit_limit=${found?.credit_limit}（应为 undefined）`);
    s.expectTrue('【B4 护栏】网关读取已剔除 tax_id / bank_account / used_credit',
      found !== undefined && found.tax_id === undefined && found.bank_account === undefined && found.used_credit === undefined,
      `tax_id=${found?.tax_id} bank_account=${found?.bank_account} used_credit=${found?.used_credit}`);
    s.expectTrue('【B4 护栏】响应以 _hiddenFields 告知被剔除字段',
      Array.isArray(found?._hiddenFields) && found._hiddenFields.includes('credit_limit') && found._hiddenFields.includes('tax_id'),
      `_hiddenFields=${JSON.stringify(found?._hiddenFields)}`);
    // B4 护栏：非敏感字段不得被误伤（防止收敛范围过大把正常字段也砍了）
    s.expectTrue('【B4 护栏】非敏感字段未被误剔除（code/name/credit_level 均在）',
      found !== undefined && !!found.vendor_code && !!found.company_name && !!found.credit_level,
      `vendor_code=${found?.vendor_code} company_name=${found?.company_name} credit_level=${found?.credit_level}`);

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
