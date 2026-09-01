// 套件 04b · 物料/客户主数据 CRUD + 前端/网关同源
// 覆盖：materials/customers 的 POST/GET/PUT/DELETE 全生命周期、
//       DELETE 不存在 id 必须 404（V2.74.5 修复 D1 changes 在 meta.changes 非顶层的坑，回潮护栏）、
//       前端写 → 网关读同一张 D1 表（同源）。
// 背景：V2.74.5 把前端 materialStore/customerStore 从 app_state Blob 迁到直连 D1 materials/customers；
//       与 V2.74.3 供应商同源治理对齐，主数据三张表（materials/customers/vendors）全部脱离 Blob 双源。
export const meta = { id: '04b-material-customer', title: '物料/客户 CRUD + 前端/网关同源（消除双数据源护栏）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  let writeKey = null;

  // ===================== 物料 =====================
  const mcode = `E2EM${runId}`;
  const mCreate = await req('POST', '/api/materials', {
    token,
    body: {
      code: mcode, name: 'E2E 常驻物料', specification: 'Φ10 圆钢', unit: '个',
      materialType: 'raw', price: 100, standardPrice: 100, status: 'active',
      remarks: '生产 E2E 常驻套件创建，跑完自动清理',
    },
  });
  s.expectStatus('POST /api/materials 创建物料', mCreate, 201);
  const mid = mCreate.data?.id;
  if (!mid) {
    s.fail('物料创建未返回 id，后续物料断言全部跳过', JSON.stringify(mCreate.data)?.slice(0, 200));
  } else {
    ctx.track('material', mid);
    s.expectEq('物料创建回显 code 一致', mCreate.data?.code, mcode);

    const mDetail = await req('GET', `/api/materials/${mid}`, { token });
    s.expectStatus('GET /api/materials/:id 详情', mDetail, 200);
    s.expectEq('详情 name 与创建一致', mDetail.data?.name, 'E2E 常驻物料');

    const mList = await req('GET', '/api/materials', { token });
    s.expectTrue('新建物料在列表可见', (mList.data?.data || []).some((x) => x.id === mid), `total=${mList.data?.total}`);

    // 局部更新（仅传一个字段——验证不 500、值生效、其余字段保留）
    const mPut = await req('PUT', `/api/materials/${mid}`, { token, body: { price: 999 } });
    s.expectStatus('PUT /api/materials/:id 局部更新不报 500', mPut, 200);
    s.expectEq('局部更新后 price 生效', Number(mPut.data?.price), 999);
    s.expectEq('局部更新未清空 name', mPut.data?.name, 'E2E 常驻物料');

    // 前端/网关同源
    const keyRes = await req('POST', '/api/open/keys', { token, body: { label: `e2e-${runId}-mc`, scopes: 'write' } });
    writeKey = keyRes.data?.plainKey || null;
    if (writeKey) {
      ctx.writeKey = ctx.writeKey || writeKey;
      const gwM = await req('GET', '/api/open/materials', { apiKey: writeKey });
      s.expectStatus('GET /api/open/materials 网关读取', gwM, 200);
      const mf = (gwM.data?.data || []).find((x) => x.id === mid || x.code === mcode);
      s.expectTrue('【同源】前端创建的物料在网关可见', !!mf, mf ? `网关 code=${mf.code}` : `网关 total=${gwM.data?.total}`);
    } else {
      s.warn('物料同源验证跳过', `无法创建网关 Key status=${keyRes.status}`);
    }

    const mDel = await req('DELETE', `/api/materials/${mid}`, { token });
    s.expectStatus('DELETE /api/materials/:id 删除', mDel, 200);
    const mGone = await req('GET', `/api/materials/${mid}`, { token });
    s.expectStatus('删除后前端详情 404', mGone, 404);
  }
  // 回潮护栏：DELETE 不存在 id 必须 404（D1 changes 在 meta.changes 而非顶层）
  const mDel404 = await req('DELETE', `/api/materials/no_such_material_e2e_${runId}`, { token });
  s.expectStatus('DELETE /api/materials/:id 不存在返回 404（meta.changes 修复护栏）', mDel404, 404);

  // ===================== 客户 =====================
  const ccode = `E2EC${runId}`;
  const cCreate = await req('POST', '/api/customers', {
    token,
    body: {
      code: ccode, name: 'E2E 常驻客户', shortName: 'E2E客', type: 'direct',
      status: 'active', creditLimit: 500000, contactName: '李测试', contactPhone: '13900000000',
      taxId: '91510100E2EC0000Y', remarks: '生产 E2E 常驻套件创建，跑完自动清理',
    },
  });
  s.expectStatus('POST /api/customers 创建客户', cCreate, 201);
  const cid = cCreate.data?.id;
  if (!cid) {
    s.fail('客户创建未返回 id，后续客户断言全部跳过', JSON.stringify(cCreate.data)?.slice(0, 200));
  } else {
    ctx.track('customer', cid);
    s.expectEq('客户创建回显 code 一致', cCreate.data?.code, ccode);

    const cDetail = await req('GET', `/api/customers/${cid}`, { token });
    s.expectStatus('GET /api/customers/:id 详情', cDetail, 200);
    s.expectEq('详情 name 与创建一致', cDetail.data?.name, 'E2E 常驻客户');

    const cList = await req('GET', '/api/customers', { token });
    s.expectTrue('新建客户在列表可见', (cList.data?.data || []).some((x) => x.id === cid), `total=${cList.data?.total}`);

    const cPut = await req('PUT', `/api/customers/${cid}`, { token, body: { creditLimit: 123456 } });
    s.expectStatus('PUT /api/customers/:id 局部更新不报 500', cPut, 200);
    s.expectEq('局部更新后 creditLimit 生效', Number(cPut.data?.creditLimit), 123456);

    if (writeKey) {
      const gwC = await req('GET', '/api/open/customers', { apiKey: writeKey });
      s.expectStatus('GET /api/open/customers 网关读取', gwC, 200);
      const cf = (gwC.data?.data || []).find((x) => x.id === cid || x.code === ccode);
      s.expectTrue('【同源】前端创建的客户在网关可见', !!cf, cf ? `网关 code=${cf.code}` : `网关 total=${gwC.data?.total}`);
    }

    const cDel = await req('DELETE', `/api/customers/${cid}`, { token });
    s.expectStatus('DELETE /api/customers/:id 删除', cDel, 200);
    const cGone = await req('GET', `/api/customers/${cid}`, { token });
    s.expectStatus('删除后前端详情 404', cGone, 404);
  }
  const cDel404 = await req('DELETE', `/api/customers/no_such_customer_e2e_${runId}`, { token });
  s.expectStatus('DELETE /api/customers/:id 不存在返回 404（meta.changes 修复护栏）', cDel404, 404);
}
