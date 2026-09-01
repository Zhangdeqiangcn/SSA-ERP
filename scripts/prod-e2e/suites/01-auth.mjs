// 套件 01 · 认证与会话
// 覆盖：注册（同公司码归并同组织）、登录、会话查询、错误密码拒绝、无凭据拒绝、登出失效
export const meta = { id: '01-auth', title: '认证与会话（注册/登录/会话/登出/拒绝路径）' };

export default async function run(ctx, s) {
  const { req, runId, password } = ctx;

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

  // 4) 同公司码注册第二个用户 → 应归并进同一组织（RLS 多主体验证的前提）
  //    注：自注册角色白名单仅允许 ['admin','manager','user']（见 register.ts），
  //    故用合法的 manager（非特权）角色，断言其被正确采纳且归并同一组织。
  const u = await ctx.registerUser('buyer1', 'manager', 'QA-采购部');
  if (!u) {
    s.fail('同公司码注册普通用户（manager）', '注册失败，后续 RLS 套件将降级');
  } else {
    s.pass('同公司码注册普通用户（manager）', `username=${u.username}`);
    s.expectEq('同公司码归并至同一组织 org_id', u.user.org_id, ctx.org.orgId, '组织归并');
    s.expectEq('普通用户角色为 manager（非特权）', u.user.role, 'manager');
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

  // 8) 重复用户名注册必须拒绝
  const dup = await req('POST', '/api/auth/register', {
    body: { username: ctx.admin.username, password, name: 'dup', companyCode: ctx.org.companyCode, role: 'admin' },
  });
  s.expectStatus('POST /api/auth/register 重复用户名拒绝', dup, [400, 409]);

  // 9) 缺公司码注册必须拒绝
  const noCC = await req('POST', '/api/auth/register', {
    body: { username: 'e2e_nocc_' + runId, password, name: 'nocc', role: 'admin' },
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
