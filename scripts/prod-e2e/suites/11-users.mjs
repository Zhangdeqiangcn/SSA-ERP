// 套件 11 · 用户管理接口（GET /api/users 列表 + PUT /api/users/:id 审批/角色护栏）
// 覆盖：鉴权（401/403）、列表契约与组织可见范围、status 过滤、不存在 id 404、
//       越权/非法角色/空更新 400、审批幂等、拒绝→恢复的登录链路。
// 说明：所有待审批测试用户均在本套件内用「同公司码注册」现造，不依赖其它套件的残留状态。
export const meta = { id: '11-users', title: '用户管理接口（列表契约/审批/角色护栏）' };

export default async function run(ctx, s) {
  const { req, runId, password } = ctx;
  const adminToken = ctx.admin.token;

  // 复用 01/06/07 已建的普通用户作为「非管理员」主体，避免额外账号
  const buyer = ctx.users.buyer1 || await ctx.registerUser('buyer1', 'buyer', 'QA-采购部');

  // ---------- 1. 鉴权 ----------
  const anon = await req('GET', '/api/users');
  s.expectStatus('GET /api/users 无凭据拒绝 401', anon, 401);

  if (buyer) {
    const nonAdmin = await req('GET', '/api/users', { token: buyer.token });
    s.expectStatus('GET /api/users 普通角色拒绝 403', nonAdmin, 403);
  } else {
    s.warn('普通角色鉴权校验跳过', '未取到非特权用户 buyer1');
  }

  // ---------- 2. admin 列表：契约 + 组织可见范围 ----------
  const list = await req('GET', '/api/users', { token: adminToken });
  s.expectStatus('GET /api/users 管理员可读 200', list, 200);
  s.expectListShape('GET /api/users 返回 {data,total,page,pageSize}', list);
  s.expectTrue('GET /api/users 含 pendingCount 字段',
    typeof list.data?.pendingCount === 'number',
    `pendingCount=${list.data?.pendingCount}`);
  const rows = list.data?.data || [];
  s.expectTrue('管理员只能看到本组织用户（orgId 全部一致）',
    rows.length > 0 && rows.every((r) => r.orgId === ctx.org.orgId),
    `共 ${rows.length} 条，非本组织 ${rows.filter((r) => r.orgId !== ctx.org.orgId).length} 条`);

  // ---------- 3. 现造一个待审批用户，供过滤 / 护栏 / 审批链路复用 ----------
  const puName = `e2e_um_pending_${runId}`;
  const puReg = await req('POST', '/api/auth/register', {
    body: { username: puName, password, name: 'E2E 待审批用户', companyCode: ctx.org.companyCode, department: 'QA-用户管理' },
  });
  s.expectStatus('现造待审批用户（同公司码注册返回 202）', puReg, 202);

  const pendFilter = await req('GET', '/api/users?status=pending', { token: adminToken });
  s.expectStatus('GET /api/users?status=pending 可读 200', pendFilter, 200);
  const pendRows = pendFilter.data?.data || [];
  s.expectTrue('status=pending 过滤生效（返回项全为 pending）',
    pendRows.length > 0 && pendRows.every((r) => r.status === 'pending'),
    `共 ${pendRows.length} 条，非 pending ${pendRows.filter((r) => r.status !== 'pending').length} 条`);

  const puId = (await req('GET', `/api/users?keyword=${encodeURIComponent(puName)}`, { token: adminToken }))
    .data?.data?.[0]?.id;
  s.expectTrue('可按 keyword 定位待审批用户 id', !!puId, `id=${puId}`);

  if (!puId) {
    s.fail('用户管理护栏校验中止', '未取到待审批用户 id');
    return;
  }

  // ---------- 4. 错误路径（不存在 id / 越权角色 / 非法角色 / 空更新） ----------
  const notFound = await req('PUT', `/api/users/no_such_user_um_${runId}`, {
    token: adminToken, body: { action: 'approve' },
  });
  s.expectStatus('PUT /api/users/<不存在id> 返回 404', notFound, 404);

  const setSuper = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: { role: 'super_admin' } });
  s.expectStatus('PUT 传 role=super_admin 被拒 400', setSuper, 400);
  s.expectTrue('拒绝文案包含「超级管理员」',
    /超级管理员/.test(setSuper.data?.error || ''),
    `error=${setSuper.data?.error}`);

  const badRole = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: { role: 'root' } });
  s.expectStatus('PUT 传非法角色 root 被拒 400', badRole, 400);

  const empty = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: {} });
  s.expectStatus('PUT 空 body 被拒 400', empty, 400);

  // ---------- 5. 审批幂等 ----------
  const appr1 = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: { action: 'approve' } });
  s.expectStatus('首次批准成功 200', appr1, 200);
  const appr2 = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: { action: 'approve' } });
  s.expectStatus('重复批准幂等（仍 200）', appr2, 200);
  const afterAppr = await req('GET', `/api/users?keyword=${encodeURIComponent(puName)}`, { token: adminToken });
  s.expectEq('批准后状态为 active', afterAppr.data?.data?.[0]?.status, 'active');

  // ---------- 6. 拒绝路径 → 登录被拦 → 恢复 → 可登录 ----------
  const rej = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: { action: 'reject' } });
  s.expectStatus('拒绝（action=reject）成功 200', rej, 200);
  const loginRej = await req('POST', '/api/auth/login', { body: { username: puName, password } });
  s.expectStatus('被拒账号登录被拦 403', loginRej, 403);
  s.expectTrue('被拒登录文案含「审批」',
    /审批/.test(loginRej.data?.error || ''),
    `error=${loginRej.data?.error}`);

  const reAppr = await req('PUT', `/api/users/${puId}`, { token: adminToken, body: { action: 'approve' } });
  s.expectStatus('恢复批准成功 200', reAppr, 200);
  const loginOk = await req('POST', '/api/auth/login', { body: { username: puName, password } });
  s.expectStatus('恢复后登录成功 200', loginOk, 200);
  s.expectTrue('恢复后登录返回 token', !!loginOk.data?.token, `token=${loginOk.data?.token ? '有' : '无'}`);
}
