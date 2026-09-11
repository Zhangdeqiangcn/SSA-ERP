// 套件 01 · 认证与会话
// 覆盖：注册（同公司码归并同组织）、注册审批链路（202 待审批→批准→可登录）、越权角色被忽略、
//       登录、会话查询、错误密码拒绝、无凭据拒绝、登出失效
export const meta = { id: '01-auth', title: '认证与会话（注册/登录/会话/登出/拒绝路径）' };

export default async function run(ctx, s) {
  const { req, runId, password } = ctx;

  // 0) 引导阶段的新公司注册审批链路（V2.96.0 新契约，强哥的安全策略）
  //    新公司码首注册者不再直接可用：注册返回 202 待审批 → 登录被 403 拦下
  //    → 超级管理员批准 → 该公司被同步启用 → 才能登录。
  const bs = ctx.bootstrap || {};
  s.expectEq('新公司码首次注册返回 202 待审批', bs.registerStatus, 202);
  s.expectTrue('注册响应标记为新公司（newCompany）', bs.newCompany === true, `newCompany=${bs.newCompany}`);
  s.expectEq('待审批账号登录被闸门拦下', bs.blockedLoginStatus, 403);
  s.expectTrue('超管批准后该公司被同步启用', !!bs.approvedOrgName, `orgActivated=${bs.approvedOrgName}`);

  // 1) bootstrap 注册已成功（上下文建立即证明），此处校验会话有效性
  const me = await req('GET', '/api/auth/me', { token: ctx.admin.token });
  s.expectStatus('GET /api/auth/me 会话有效', me, 200);
  s.expectTrue('me 返回当前用户且组织一致',
    me.data?.user?.org_id === ctx.org.orgId,
    `org_id=${me.data?.user?.org_id} 期望=${ctx.org.orgId}`);
  s.expectEq('me 角色为 admin', me.data?.user?.role, 'admin');

  // 2) 无凭据必须拒绝
  const anon = await req('GET', '/api/auth/me');
  s.expectStatus('GET /api/auth/me 无凭据拒绝', anon, 401);

  // 3) 伪造 token 必须拒绝
  const fake = await req('GET', '/api/auth/me', { token: 'fake_token_' + runId });
  s.expectStatus('GET /api/auth/me 伪造 token 拒绝', fake, 401);

  // 4) 同公司码注册第二个用户 → 新契约：202 待审批（不再直接发登录凭证），管理员批准后方可登录。
  //    新契约：注册 → 待审批 → 管理员批准 → 才能登录。角色由服务端决定，请求体 role 一律被忽略。
  //    （此用户批准后角色为服务端默认的普通用户 'user'，作为后续 RLS 套件的非特权主体。）
  const u2username = `e2e_buyer1_${runId}`;
  const u2reg = await req('POST', '/api/auth/register', {
    body: { username: u2username, password, name: 'E2E buyer1', companyCode: ctx.org.companyCode, department: 'QA-采购部' },
  });
  s.expectStatus('同公司码注册第二个用户返回 202 待审批', u2reg, 202);
  s.expectTrue('待审批响应标记 pending 且不返回 token',
    u2reg.data?.pending === true && !u2reg.data?.token,
    `pending=${u2reg.data?.pending} token=${u2reg.data?.token ? '有' : '无'}`);

  // 4a) 待审批账号登录必须被拦（闸门生效）
  const pendLogin = await req('POST', '/api/auth/login', { body: { username: u2username, password } });
  s.expectStatus('待审批账号登录被拒 403', pendLogin, 403);
  s.expectTrue('待审批登录错误文案含「审批」',
    /审批/.test(pendLogin.data?.error || ''),
    `error=${pendLogin.data?.error}`);

  // 4b) 管理员查出该待审批用户并批准
  const pendList = await req('GET', `/api/users?status=pending&keyword=${encodeURIComponent(u2username)}`, { token: ctx.admin.token });
  const pendId = pendList.data?.data?.[0]?.id;
  s.expectTrue('管理员可查到本组织待审批用户', !!pendId, `id=${pendId}`);
  if (pendId) {
    const appr = await req('PUT', `/api/users/${pendId}`, { token: ctx.admin.token, body: { action: 'approve' } });
    s.expectStatus('管理员批准待审批用户（PUT action=approve）', appr, 200);

    // 4c) 批准后即可登录
    const u2login = await req('POST', '/api/auth/login', { body: { username: u2username, password } });
    s.expectStatus('批准后再次登录成功 200', u2login, 200);
    s.expectTrue('批准后登录返回 token', !!u2login.data?.token, `token=${u2login.data?.token ? '有' : '无'}`);
    // 4d) 组织归并语义保留
    s.expectEq('同公司码归并至同一组织 org_id', u2login.data?.user?.org_id, ctx.org.orgId, '组织归并');
    // 4e) 服务端决定角色：不传 role → 普通用户 'user'（非 manager）
    s.expectEq('批准后角色为服务端默认的普通用户 user', u2login.data?.user?.role, 'user');

    // 供 06/07 等下游套件复用为非特权主体，避免重复造号
    ctx.users.buyer1 = {
      id: pendId,
      token: u2login.data?.token,
      user: u2login.data?.user,
      username: u2username,
      role: u2login.data?.user?.role,
      department: 'QA-采购部',
      pendingLoginStatus: pendLogin.status,
      roleSkipped: false,
    };
  } else {
    s.fail('同公司码注册普通用户（buyer1）', '未取到待审批用户 id，后续 RLS 套件将降级');
  }

  // 4f) 安全断言：注册请求体伪造 role:'super_admin' 必须被服务端忽略（原「自封 admin」越权漏洞已封堵）
  const secUsername = `e2e_esusersec_${runId}`;
  const secReg = await req('POST', '/api/auth/register', {
    body: { username: secUsername, password, name: 'E2E 越权探测', companyCode: ctx.org.companyCode, role: 'super_admin', department: 'QA' },
  });
  s.expectStatus('注册请求体传 super_admin 仍走 202 待审批', secReg, 202);
  const secFound = await req('GET', `/api/users?status=pending&keyword=${encodeURIComponent(secUsername)}`, { token: ctx.admin.token });
  const secId = secFound.data?.data?.[0]?.id;
  if (secId) {
    await req('PUT', `/api/users/${secId}`, { token: ctx.admin.token, body: { action: 'approve' } });
    const secAfter = await req('GET', `/api/users?keyword=${encodeURIComponent(secUsername)}`, { token: ctx.admin.token });
    const secRole = secAfter.data?.data?.[0]?.role;
    s.expectTrue('注册请求体传 super_admin 被服务端忽略',
      secRole !== 'super_admin',
      `批准后实际角色=${secRole}（期望非 super_admin，应为 user）`);
  } else {
    s.fail('注册请求体传 super_admin 被服务端忽略', '未取到该用户 id，无法验证');
  }

  // 5) 登录（用 bootstrap 的 admin 账号）
  const login = await req('POST', '/api/auth/login', {
    body: { username: ctx.admin.username, password },
  });
  s.expectStatus('POST /api/auth/login 正确密码登录', login, 200);
  s.expectTrue('登录返回新会话 token', !!login.data?.token, `token=${login.data?.token ? '有' : '无'}`);

  // 6) 错误密码必须拒绝
  const badPwd = await req('POST', '/api/auth/login', {
    body: { username: ctx.admin.username, password: 'wrong-password-xxx' },
  });
  s.expectStatus('POST /api/auth/login 错误密码拒绝', badPwd, [400, 401]);

  // 7) 不存在的用户名必须拒绝
  const noUser = await req('POST', '/api/auth/login', {
    body: { username: 'no_such_user_' + runId, password },
  });
  s.expectStatus('POST /api/auth/login 不存在用户拒绝', noUser, [400, 401]);

  // 8) 重复用户名注册必须拒绝（body 不再带 role —— 新契约下服务端一律忽略请求体 role）
  const dup = await req('POST', '/api/auth/register', {
    body: { username: ctx.admin.username, password, name: 'dup', companyCode: ctx.org.companyCode },
  });
  s.expectStatus('POST /api/auth/register 重复用户名拒绝', dup, [400, 409]);

  // 9) 缺公司码注册必须拒绝
  const noCC = await req('POST', '/api/auth/register', {
    body: { username: 'e2e_nocc_' + runId, password, name: 'nocc' },
  });
  s.expectStatus('POST /api/auth/register 缺公司码拒绝', noCC, 400);

  // 10) 登出后该会话失效（用步骤 5 拿到的独立 token，避免影响主会话）
  if (login.data?.token) {
    const lo = await req('POST', '/api/auth/logout', { token: login.data.token });
    s.expectStatus('POST /api/auth/logout 登出', lo, 200);
    const after = await req('GET', '/api/auth/me', { token: login.data.token });
    s.expectStatus('登出后原会话失效', after, 401);
  }

  // 主会话仍应可用（登出不应误伤其他会话）
  const meAgain = await req('GET', '/api/auth/me', { token: ctx.admin.token });
  s.expectStatus('登出其他会话不影响主会话', meAgain, 200);
}
