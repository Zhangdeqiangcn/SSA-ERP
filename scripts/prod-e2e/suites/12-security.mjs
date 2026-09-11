// 套件 12 · 账号安全与系统邮件（V2.96.0 新增能力）
// 覆盖：
//   1) 用户列表的新契约 —— 新增所属公司（orgName/orgStatus）与待批公司计数（newCompanyCount）
//   2) 超级管理员专属接口的权限护栏（无凭据 401 / 普通管理员 403）
//   3) 安全邮箱备用通道（不要求登录态）：身份校验 + 验证码绝不回传的护栏
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

  // ── 3) 安全邮箱备用通道：身份校验与「验证码不回传」护栏 ────────────
  // 说明：本通道不要求登录态（它就是「进不去系统时」的后路）。
  //   关键约束：enqueue 的成功路径会在生产库登记一条真实投递任务，
  //   8 小时后真的向管理员的安全邮箱发信（对外副作用），生产门禁绝不可触发；
  //   因此下方只测「拒绝路径」+ 「status 查询（只读、不创建任务）」。
  //   超管凭据相关断言在 ctx.supervisor 缺失时退化为 s.warn，避免套件失败。

  // 3a) 缺参数（不带任何凭据 + body 为空）→ 400
  const noParam = await req('POST', '/api/auth/security-mailbox', { body: {} });
  s.expectStatus('安全邮箱通道：缺参数被拒', noParam, 400);

  // 3b) 防账号探测：「不存在的用户名」与「真实超管错误密码」同为 401，且提示文字完全一致
  // 注意：必须带上合法的 purpose/action，否则请求会先被「参数校验」拦成 400，
  //   走不到身份校验那一步，断言就会测错对象（此处曾踩过这个坑）。
  const notExist = await req('POST', '/api/auth/security-mailbox', {
    body: {
      username: `definitely_not_a_user_${runId}`,
      password: 'whatever',
      purpose: 'change_password',
      action: 'status',
    },
  });
  s.expectStatus('安全邮箱通道：不存在用户被拒 401', notExist, 401);
  if (supervisor?.username) {
    const wrongSuper = await req('POST', '/api/auth/security-mailbox', {
      body: {
        username: supervisor.username,
        password: `wrong-${runId}-pwd`,
        purpose: 'change_password',
        action: 'status',
      },
    });
    s.expectStatus('安全邮箱通道：超管错误密码被拒 401', wrongSuper, 401);
    s.expectEq(
      '安全邮箱通道：防账号探测（同提示）',
      notExist.data?.error,
      wrongSuper.data?.error,
      `不存在用户提示=${notExist.data?.error} / 超管错误密码提示=${wrongSuper.data?.error}`
    );
  } else {
    s.warn('安全邮箱通道：防账号探测后半段未覆盖', '缺少测试超管用户名，跳过超管错误密码对比');
  }

  // 3c) 非超管被拒（普通管理员 + 合法 purpose/action）→ 400 且提示含「无需」
  const normalAdmin = await req('POST', '/api/auth/security-mailbox', {
    body: { username: ctx.admin.username, password, purpose: 'change_password', action: 'status' },
  });
  s.expectStatus('安全邮箱通道：非超管被拒', normalAdmin, 400);
  s.expectTrue(
    '安全邮箱通道：非超管提示含「无需」',
    /无需/.test(normalAdmin.data?.error || ''),
    `error=${normalAdmin.data?.error}`
  );

  // 3c2) 拒绝路径：非超管 + action=enqueue → 400（不会创建投递任务，安全可测）
  const normalEnqueue = await req('POST', '/api/auth/security-mailbox', {
    body: { username: ctx.admin.username, password, purpose: 'change_password', action: 'enqueue' },
  });
  s.expectStatus('安全邮箱通道：非超管 enqueue 拒绝 400', normalEnqueue, 400);

  // 3d) 非法 purpose / action 被拒（需超管凭据）
  if (supervisor?.username) {
    const badPurpose = await req('POST', '/api/auth/security-mailbox', {
      body: { username: supervisor.username, password: supervisor.password, purpose: 'unknown', action: 'status' },
    });
    s.expectStatus('安全邮箱通道：非法场景被拒', badPurpose, 400);

    const badAction = await req('POST', '/api/auth/security-mailbox', {
      body: { username: supervisor.username, password: supervisor.password, purpose: 'change_password', action: 'drop-table' },
    });
    s.expectStatus('安全邮箱通道：非法操作被拒', badAction, 400);

    // 3e) 超管可查询状态（只读 status，不触发投递）
    const status = await req('POST', '/api/auth/security-mailbox', {
      body: { username: supervisor.username, password: supervisor.password, purpose: 'change_password', action: 'status' },
    });
    s.expectStatus('安全邮箱通道：超管可查询状态', status, 200);
    s.expectTrue(
      '安全邮箱通道：状态含 configured（布尔）',
      typeof status.data?.configured === 'boolean',
      `configured=${status.data?.configured}`
    );
    s.expectTrue(
      '安全邮箱通道：delayHours 为数字且 > 0',
      typeof status.data?.delayHours === 'number' && status.data.delayHours > 0,
      `delayHours=${status.data?.delayHours}`
    );
    s.expectTrue(
      '安全邮箱通道：intervalMin 为数字且 > 0',
      typeof status.data?.intervalMin === 'number' && status.data.intervalMin > 0,
      `intervalMin=${status.data?.intervalMin}`
    );
    s.expectTrue(
      '安全邮箱通道：maxAttempts 为数字且 > 0',
      typeof status.data?.maxAttempts === 'number' && status.data.maxAttempts > 0,
      `maxAttempts=${status.data?.maxAttempts}`
    );

    // 3f) 核心安全断言：响应体绝不含明文验证码，也不回传任何 code 字段
    const dumped = JSON.stringify(status.data);
    s.expectTrue(
      '安全邮箱通道：响应不含验证码',
      !/\b\d{6}\b/.test(dumped),
      `响应片段=${dumped.slice(0, 200)}`
    );
    s.expectTrue(
      '安全邮箱通道：不回传 code/codes/job.code',
      status.data?.job?.code === undefined &&
        status.data?.code === undefined &&
        status.data?.codes === undefined,
      `job?.code=${status.data?.job?.code} code=${status.data?.code} codes=${status.data?.codes}`
    );
  } else {
    s.warn('安全邮箱通道：缺少测试超管凭据，跳过', '超管状态查询 / 验证码不回传等需超管凭据的断言已跳过');
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
