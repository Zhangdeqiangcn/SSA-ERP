// 套件 12 · 账号安全与系统邮件（V2.96.0 新增能力）
// 覆盖：
//   1) 用户列表的新契约 —— 新增所属公司（orgName/orgStatus）与待批公司计数（newCompanyCount）
//   2) 超级管理员专属接口的权限护栏（无凭据 401 / 普通管理员 403）
//   3) 兜底通道（查看近期验证码）的身份 + 密码双重校验
//   4) 双邮箱验证码接口对「非超管账号」「未绑定邮箱的超管」的拒绝路径
//
// 说明：真实的「双邮箱发码 → 双码校验 → 激活/改密」完整成功链路需要超级管理员账号
//   及其绑定的两个真实邮箱，自动化环境不持有该凭据（安全约束），因此改由部署后的生产实测覆盖；
//   本套件专注权限与契约层面的回归，防止后续改动悄悄放宽权限。
export const meta = { id: '12-security', title: '账号安全与系统邮件（权限护栏与契约）' };

export default async function run(ctx, s) {
  const { req, password, supervisor } = ctx;
  const runId = ctx.runId;

  // ── 1) 用户列表新契约 ─────────────────────────────────────────
  const list = await req('GET', '/api/users?pageSize=5', { token: ctx.admin.token });
  s.expectStatus('GET /api/users 正常返回', list, 200);
  s.expectListShape('用户列表契约 {data,total,page,pageSize}', list);
  s.expectTrue(
    '用户列表含 newCompanyCount（待批新公司计数）',
    typeof list.data?.newCompanyCount === 'number',
    `newCompanyCount=${list.data?.newCompanyCount}`
  );
  const first = list.data?.data?.[0];
  s.expectTrue(
    '用户行含所属公司信息（orgName / orgStatus）',
    !!first && 'orgName' in first && 'orgStatus' in first,
    first ? `orgName=${first.orgName} orgStatus=${first.orgStatus}` : '列表为空，无法校验'
  );
  s.expectTrue(
    '本组织管理员只能看到本组织用户',
    Array.isArray(list.data?.data) && list.data.data.every((r) => r.orgId === ctx.org.orgId),
    `共 ${list.data?.data?.length ?? 0} 条，非本组织 ${(list.data?.data || []).filter((r) => r.orgId !== ctx.org.orgId).length} 条`
  );

  // ── 2) 超管专属接口的权限护栏 ─────────────────────────────────
  const guarded = [
    ['GET', '/api/system/mail-config'],
    ['PUT', '/api/system/mail-config'],
    ['POST', '/api/system/mail-config'],
    ['GET', '/api/system/notify'],
    ['POST', '/api/system/notify'],
  ];
  for (const [method, path] of guarded) {
    // GET/HEAD 不允许携带请求体（否则 fetch 直接抛错），仅在写方法上传空对象
    const opts = method === 'GET' ? {} : { body: {} };

    const anon = await req(method, path, opts);
    s.expectStatus(`${method} ${path} 无凭据拒绝 401`, anon, 401);

    const asAdmin = await req(method, path, { token: ctx.admin.token, ...opts });
    s.expectStatus(`${method} ${path} 普通管理员拒绝 403`, asAdmin, 403);
  }

  // ── 3) 兜底通道：身份 + 密码双重校验 ───────────────────────────
  const anonCodes = await req('POST', '/api/security/codes', { body: { password } });
  s.expectStatus('POST /api/security/codes 无凭据拒绝 401', anonCodes, 401);

  const adminCodes = await req('POST', '/api/security/codes', {
    token: ctx.admin.token,
    body: { password },
  });
  s.expectStatus('POST /api/security/codes 普通管理员拒绝 403', adminCodes, 403);

  if (supervisor?.token) {
    const noPwd = await req('POST', '/api/security/codes', { token: supervisor.token, body: {} });
    s.expectStatus('兜底通道缺少密码拒绝 400', noPwd, 400);

    const wrongPwd = await req('POST', '/api/security/codes', {
      token: supervisor.token,
      body: { password: `wrong-${runId}-pwd` },
    });
    s.expectStatus('兜底通道密码错误拒绝 401', wrongPwd, 401);
    s.expectTrue(
      '兜底通道错误文案不泄露账号信息',
      /密码/.test(wrongPwd.data?.error || ''),
      `error=${wrongPwd.data?.error}`
    );
  } else {
    s.warn('兜底通道超管路径未覆盖', '缺少测试超管令牌，跳过');
  }

  // ── 4) 双邮箱验证码接口的拒绝路径 ─────────────────────────────
  // 4a) 普通账号（非超管）不应支持邮箱验证码
  const normalSend = await req('POST', '/api/auth/send-code', {
    body: { username: ctx.admin.username, password, purpose: 'change_password' },
  });
  s.expectStatus('非超管账号请求发码返回 400', normalSend, 400);
  s.expectTrue(
    '非超管发码提示「无需邮箱验证码」',
    /无需/.test(normalSend.data?.error || ''),
    `error=${normalSend.data?.error}`
  );

  // 4b) 非法 purpose 必须拒绝
  const badPurpose = await req('POST', '/api/auth/send-code', {
    body: { username: ctx.admin.username, password, purpose: 'hack_the_planet' },
  });
  s.expectStatus('非法 purpose 拒绝 400', badPurpose, 400);

  // 4c) 密码错误不得触发发码（防止任何人凭用户名骚扰超管邮箱）
  if (supervisor?.token) {
    const wrongPwdSend = await req('POST', '/api/auth/send-code', {
      body: { username: supervisor.username, password: `wrong-${runId}`, purpose: 'activate' },
    });
    s.expectStatus('超管发码时密码错误拒绝 401', wrongPwdSend, 401);
    s.expectTrue(
      '发码接口对「账号不存在」与「密码错误」返回同一提示（防账号探测）',
      /用户名或密码错误/.test(wrongPwdSend.data?.error || ''),
      `error=${wrongPwdSend.data?.error}`
    );

    // 4d) 未绑定验证邮箱的超管：发码应给出明确指引而不是 500
    const noMailbox = await req('POST', '/api/auth/send-code', {
      body: { username: supervisor.username, password: supervisor.password, purpose: 'activate' },
    });
    s.expectTrue(
      '未绑定验证邮箱时给出明确中文指引（400/401，非 500）',
      [400, 401].includes(noMailbox.status),
      `status=${noMailbox.status} error=${noMailbox.data?.error}`
    );
  }

  // 4e) 校验接口：无有效批次时必须失败（不得凭空放行）
  const fakeVerify = await req('POST', '/api/auth/verify-code', {
    body: { username: ctx.admin.username, password, purpose: 'activate', codes: ['000000', '111111'] },
  });
  s.expectTrue(
    '校验接口对非超管账号拒绝（400）',
    fakeVerify.status === 400,
    `status=${fakeVerify.status} error=${fakeVerify.data?.error}`
  );

  // 4f) 激活接口：伪造凭证必须被拒
  const fakeActivate = await req('POST', '/api/auth/activate', {
    body: { username: supervisor?.username || ctx.admin.username, ticket: 'tkt_fake_' + runId, newPassword: 'Abcd1234' },
  });
  s.expectTrue(
    '激活接口拒绝伪造凭证（400，且不签发会话）',
    fakeActivate.status === 400 && !fakeActivate.data?.token,
    `status=${fakeActivate.status} error=${fakeActivate.data?.error}`
  );

  // 4g) 激活接口的密码强度校验（弱密码必须拒绝）
  const weakPwd = await req('POST', '/api/auth/activate', {
    body: { username: supervisor?.username || ctx.admin.username, ticket: 'tkt_fake_' + runId, newPassword: '123' },
  });
  s.expectStatus('激活接口拒绝过短密码 400', weakPwd, 400);

  // 4h) 改密接口未登录必须拒绝
  const anonChange = await req('POST', '/api/auth/change-password', {
    body: { ticket: 'tkt_fake_' + runId, newPassword: 'Abcd1234' },
  });
  s.expectStatus('POST /api/auth/change-password 未登录拒绝 401', anonChange, 401);
}
