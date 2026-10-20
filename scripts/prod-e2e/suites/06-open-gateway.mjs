// 套件 06 · 开放 API 网关（Key 生命周期 / scope 护栏 / 5 资源读写 / 组织隔离）
// 覆盖：admin 建 Key、非 admin 拒绝、read Key 不能写、无效 Key 401、吊销后失效、
//       5 个资源 GET/POST/PUT/DELETE、不支持资源 404、跨组织隔离
export const meta = { id: '06-open-gateway', title: '开放 API 网关（Key/scope 护栏/5 资源/隔离）' };

const RESOURCES = ['materials', 'vendors', 'customers', 'purchase-orders', 'sales-orders'];

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;

  // ---------- 1. Key 创建（admin） ----------
  const readKeyRes = await req('POST', '/api/open/keys', {
    token, body: { label: `e2e-${runId}-read`, scopes: 'read' },
  });
  s.expectStatus('POST /api/open/keys 创建 read Key（201）', readKeyRes, 201);
  const readKey = readKeyRes.data?.plainKey;
  s.expectTrue('read Key 返回明文 plainKey（仅此一次）', !!readKey, readKey ? `前缀=${String(readKey).slice(0, 6)}…` : '未返回');
  s.expectEq('read Key scopes 回显', readKeyRes.data?.scopes, 'read');

  const writeKeyRes = await req('POST', '/api/open/keys', {
    token, body: { label: `e2e-${runId}-write`, scopes: 'write' },
  });
  s.expectStatus('POST /api/open/keys 创建 write Key（201）', writeKeyRes, 201);
  const writeKey = writeKeyRes.data?.plainKey;
  if (writeKey) ctx.writeKey = writeKey;

  // ---------- 2. Key 列表 ----------
  const keyList = await req('GET', '/api/open/keys', { token });
  s.expectStatus('GET /api/open/keys 列表', keyList, 200);
  const rows = keyList.data?.data || [];
  s.expectTrue('列表包含本轮创建的两个 Key',
    rows.filter((k) => String(k.label).startsWith(`e2e-${runId}`)).length >= 2,
    `本轮 Key 数=${rows.filter((k) => String(k.label).startsWith(`e2e-${runId}`)).length}`);
  s.expectTrue('列表不泄露 key_hash / 明文',
    rows.every((k) => !('key_hash' in k) && !('plainKey' in k)),
    '仅返回 id/label/scopes/revoked 等元数据');

  // ---------- 3. 缺陷护栏：创建返回的 id 必须与库内真实 id 一致 ----------
  // functions/api/open/keys.ts 中 uid('ak') 被调用两次（INSERT 用第一个、响应返回第二个），
  // 而 uid 基于 crypto.randomUUID() → 返回 id 与库内 id 必然不同，导致调用方无法用它吊销。
  const returnedId = writeKeyRes.data?.id;
  const realRow = rows.find((k) => k.label === `e2e-${runId}-write`);
  s.expectTrue('创建响应的 id 可在 Key 列表中查到（否则调用方无法吊销）',
    !!returnedId && !!realRow && returnedId === realRow.id,
    `响应 id=${returnedId} 库内 id=${realRow?.id}`);

  // ---------- 4. 鉴权与 scope 护栏 ----------
  const noKey = await req('GET', '/api/open/materials');
  s.expectStatus('无 Key 访问网关拒绝 401', noKey, 401);

  const badKey = await req('GET', '/api/open/materials', { apiKey: 'sk_invalid_' + runId });
  s.expectStatus('无效 Key 访问网关拒绝 401', badKey, 401);

  if (readKey) {
    const readOk = await req('GET', '/api/open/materials', { apiKey: readKey });
    s.expectStatus('read Key 可读', readOk, 200);
    const readWrite = await req('POST', '/api/open/materials', {
      apiKey: readKey, body: { code: `E2E-RK-${runId}`, name: 'read key 越权探测' },
    });
    s.expectStatus('read Key 写入被拒 403（scope 护栏）', readWrite, 403);
  }

  if (writeKey) {
    const writeRead = await req('GET', '/api/open/materials', { apiKey: writeKey });
    s.expectStatus('write Key 天然可读（read ⊂ write）', writeRead, 200);
  }

  // 非 admin 不能管理 Key
  const buyer = ctx.users.buyer1 || await ctx.registerUser('buyer1', 'buyer', 'QA-采购部');
  if (buyer) {
    const nonAdminCreate = await req('POST', '/api/open/keys', {
      token: buyer.token, body: { label: `e2e-${runId}-nonadmin`, scopes: 'write' },
    });
    s.expectStatus('非管理员创建 Key 被拒 403', nonAdminCreate, 403);
    const nonAdminList = await req('GET', '/api/open/keys', { token: buyer.token });
    s.expectStatus('非管理员查看 Key 列表被拒 403', nonAdminList, 403);
  } else {
    s.warn('非管理员 Key 权限校验跳过', '普通用户注册失败');
  }

  // ---------- 5. 5 个资源可读 + 列表契约 ----------
  if (writeKey) {
    let ok = 0;
    for (const r of RESOURCES) {
      const res = await req('GET', `/api/open/${r}`, { apiKey: writeKey });
      if (s.expectStatus(`GET /api/open/${r} 可读`, res, 200, `total=${res.data?.total}`)) {
        ok += 1;
        const d = res.data || {};
        s.expectTrue(`  └ ${r} 契约 {data,total,page,pageSize}`,
          Array.isArray(d.data) && typeof d.total === 'number' && d.page !== undefined && d.pageSize !== undefined,
          `data=${Array.isArray(d.data) ? d.data.length : 'N/A'}`);
      }
    }
    s.expectEq(`网关资源可读性 ${ok}/${RESOURCES.length}`, ok, RESOURCES.length, '资源数');

    // 不支持的资源应 404 且给出可选清单
    const bad = await req('GET', '/api/open/not-a-resource', { apiKey: writeKey });
    s.expectStatus('不支持的资源返回 404', bad, 404);
    s.expectTrue('404 提示列出可选资源清单',
      typeof bad.data?.error === 'string' && bad.data.error.includes('materials'),
      `error=${String(bad.data?.error).slice(0, 100)}`);

    // ---------- 6. 网关写入全生命周期（materials） ----------
    const mcode = `E2E-GW-${runId}`;
    const gwCreate = await req('POST', '/api/open/materials', {
      apiKey: writeKey,
      body: { code: mcode, name: 'E2E 网关物料', specification: 'E2E 网关规格', unit: 'pcs', status: 'active', price: 12.34, remarks: 'E2E 常驻套件' },
    });
    s.expectStatus('POST /api/open/materials 网关创建（201）', gwCreate, 201);
    const gwId = gwCreate.data?.id;
    if (gwId) {
      ctx.track('openres:materials', gwId);
      const gwGet = await req('GET', `/api/open/materials/${gwId}`, { apiKey: writeKey });
      s.expectStatus('GET /api/open/materials/:id 详情', gwGet, 200);
      s.expectEq('网关创建内容落库正确（code）', gwGet.data?.code, mcode);

      const gwPut = await req('PUT', `/api/open/materials/${gwId}`, {
        apiKey: writeKey, body: { name: 'E2E 网关物料（已改）' },
      });
      s.expectStatus('PUT /api/open/materials/:id 网关更新', gwPut, 200);
      const gwGet2 = await req('GET', `/api/open/materials/${gwId}`, { apiKey: writeKey });
      s.expectEq('网关更新生效', gwGet2.data?.name, 'E2E 网关物料（已改）');

      // 前端会话路径应看到同一条（网关与内部端点同源）
      const feSee = await req('GET', `/api/materials/${gwId}`, { token });
      s.expectStatus('【同源】网关创建的物料在前端会话路径可见', feSee, 200);

      const gwDel = await req('DELETE', `/api/open/materials/${gwId}`, { apiKey: writeKey });
      s.expectStatus('DELETE /api/open/materials/:id 网关删除', gwDel, 200);
      const gwGone = await req('GET', `/api/open/materials/${gwId}`, { apiKey: writeKey });
      s.expectStatus('删除后网关详情 404', gwGone, 404);
    }

    // 不存在 id 的写操作应 404 而非 500
    const putNF = await req('PUT', '/api/open/materials/no_such_id_e2e', { apiKey: writeKey, body: { name: 'x' } });
    s.expectStatus('PUT 不存在 id 返回 404（非 500）', putNF, 404);
  }

  // ---------- 7. 吊销后 Key 立即失效 ----------
  const readRow = rows.find((k) => k.label === `e2e-${runId}-read`);
  if (readRow && readKey) {
    const revoke = await req('DELETE', `/api/open/keys/${readRow.id}`, { token });
    s.expectStatus('DELETE /api/open/keys/:id 吊销 Key', revoke, 200);
    const afterRevoke = await req('GET', '/api/open/materials', { apiKey: readKey });
    s.expectStatus('吊销后该 Key 立即失效 401', afterRevoke, 401);
    const revokeAgain = await req('DELETE', `/api/open/keys/${readRow.id}`, { token });
    s.expectStatus('重复吊销幂等（200/404，非 500）', revokeAgain, [200, 404]);
  } else {
    s.warn('Key 吊销校验跳过', '未能定位 read Key 库内 id');
  }

  // ---------- 8. 跨组织隔离：本组织 Key 读不到他组织数据 ----------
  if (writeKey) {
    const otherCC = `E2E-GWISO-${runId}`;
    const otherReg = await req('POST', '/api/auth/register', {
      body: { username: `e2e_gwiso_${runId}`, password: ctx.password, name: 'E2E 网关隔离', companyCode: otherCC, role: 'admin' },
    });
    if (otherReg.status === 200) {
      const otherVendor = await req('POST', '/api/vendors', {
        token: otherReg.data.token,
        body: { code: `E2E-ISOV-${runId}`, name: '他组织供应商', status: 'approved' },
      });
      if (otherVendor.status === 201) {
        const mine = await req('GET', '/api/open/vendors', { apiKey: writeKey });
        const leaked = (mine.data?.data || []).some((v) => v.id === otherVendor.data.id);
        s.expectTrue('【组织隔离】本组织 Key 读不到他组织供应商', !leaked,
          leaked ? '数据越界泄露！' : `本组织 total=${mine.data?.total}`);
      } else {
        s.warn('跨组织隔离校验降级', `他组织供应商创建失败 status=${otherVendor.status}`);
      }
    } else {
      s.warn('跨组织隔离校验跳过', `隔离组织注册失败 status=${otherReg.status}`);
    }
  }
}
