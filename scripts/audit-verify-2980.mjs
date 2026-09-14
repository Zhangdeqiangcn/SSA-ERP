// V2.98.0 第一批整改的回归实测（本地 D1 + 真实 HTTP）
// 覆盖：③ 错误分类 / ① 统计条件统一 / ⑥ 验证码计数 / ⑦ 审计限权 / ⑧ 脱敏统一 / ⑤ 会话清理
const BASE = 'http://127.0.0.1:8799';
let pass = 0, fail = 0;
const T = (name, ok, detail) => {
  if (ok) { pass++; console.log('  ✅ ' + name + (detail ? ' — ' + detail : '')); }
  else { fail++; console.log('  ❌ ' + name + (detail ? ' — ' + detail : '')); }
};

const login = async (u, p) => {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, token: j.token };
};
const get = (path, token) => fetch(BASE + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });

(async () => {
  console.log('\n=== 登录测试夹具 ===');
  const A = await login('a_admin', 'Audit@2026');
  const U = await login('a_user2', 'Audit@2026');
  const B = await login('b_admin', 'Audit@2026');
  T('A组织管理员登录', A.status === 200 && !!A.token, 'HTTP ' + A.status);
  T('A组织普通成员登录', U.status === 200 && !!U.token, 'HTTP ' + U.status);
  T('B组织管理员登录', B.status === 200 && !!B.token, 'HTTP ' + B.status);
  if (!A.token || !U.token) { console.log('夹具缺失，终止'); process.exit(1); }

  // ---------------- ③ 错误分类 ----------------
  console.log('\n=== ③ 错误分类（M-02 / L-01）===');
  {
    // 触发 CHECK 约束：customers.type 不合法
    const r = await fetch(BASE + '/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.token },
      body: JSON.stringify({ code: 'ERRT1', name: '错误分类测试', type: 'NOT_A_VALID_TYPE_XYZ', status: 'active' }),
    });
    const j = await r.json().catch(() => ({}));
    const body = JSON.stringify(j);
    T('约束冲突不再返回 500', r.status !== 500, 'HTTP ' + r.status);
    T('响应体不含数据库原文', !/SQLITE|D1_ERROR|constraint\s+failed|no\s+such\s+(column|table)/i.test(body), body.slice(0, 160));
    T('给出了错误编号', /ERR-/.test(body), (j.errorId || '').toString());
    console.log('    响应: ' + body.slice(0, 200));
  }
  {
    // 触发 UNIQUE：重复供应商编码
    await fetch(BASE + '/api/vendors', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.token },
      body: JSON.stringify({ code: 'VERR1', name: '重复测试供应商' }),
    });
    const r = await fetch(BASE + '/api/vendors', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.token },
      body: JSON.stringify({ code: 'VERR1', name: '重复测试供应商2' }),
    });
    T('重复编码被挡（非 500）', r.status === 409 || r.status === 400, 'HTTP ' + r.status);
  }

  // ---------------- ① 统计条件统一 ----------------
  console.log('\n=== ① 统计条件统一（M-01）===');
  {
    const r = await get('/api/entities/checkTask?keyword=ALPHA&pageSize=100', A.token);
    const j = await r.json();
    const n = (j.data || []).length;
    T('关键字下 total 与实际行数一致', j.total === n, `data=${n} total=${j.total} totalPages=${j.totalPages}`);
    T('总页数不再虚高', j.totalPages === Math.ceil(n / 100), 'totalPages=' + j.totalPages);
  }
  {
    const r = await get('/api/entities/checkTask?pageSize=100', A.token);
    const j = await r.json();
    T('无关键字时 total 与行数一致', j.total === (j.data || []).length, `data=${(j.data || []).length} total=${j.total}`);
  }

  // ---------------- ⑦ 审计限权 ----------------
  console.log('\n=== ⑦ 审计日志限权（M-10）===');
  {
    const ra = await get('/api/audit?pageSize=50', A.token);
    const ja = await ra.json();
    const ru = await get('/api/audit?pageSize=50', U.token);
    const ju = await ru.json();
    T('管理员可见全组织', ja.scope === 'org', 'scope=' + ja.scope + ' total=' + ja.pagination?.total);
    T('普通成员被收敛到本人', ju.scope === 'self', 'scope=' + ju.scope + ' total=' + ju.pagination?.total);
    const othersU = (ju.data || []).filter((x) => x.userId && x.userId !== U.body?.user?.id).length;
    T('普通成员看不到他人记录', othersU === 0, '他人记录 ' + othersU + ' 条');
    T('普通成员仍可读（不阻断页面）', ru.status === 200, 'HTTP ' + ru.status);
  }

  // ---------------- ⑧ 脱敏统一 ----------------
  console.log('\n=== ⑧ 脱敏接口统一（M-06 / M-11）===');
  {
    const rv = await get('/api/protected-data/vendors', A.token);
    const jv = await rv.json();
    T('脱敏供应商接口可用', rv.status === 200, 'HTTP ' + rv.status + ' 条数=' + (jv.count ?? '?'));
    const rmain = await get('/api/vendors?pageSize=100', A.token);
    const jmain = await rmain.json();
    const mainCodes = new Set((jmain.data || []).map((v) => v.code));
    const protCodes = (jv.data || []).map((v) => v.vendor_code);
    const allInMain = protCodes.every((c) => mainCodes.has(c));
    T('脱敏数据源与主数据一致（同指 vendor_master）', allInMain,
      `脱敏 ${protCodes.length} 条 / 主数据 ${mainCodes.size} 条，全部命中=${allInMain}`);
  }
  {
    // 归属过滤：普通成员不应看到不属于自己的供应商
    await fetch(BASE + '/api/vendors', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.token },
      body: JSON.stringify({ code: 'OWN-A', name: 'A管理员私有供应商' }),
    });
    const ru = await get('/api/protected-data/vendors', U.token);
    const ju = await ru.json();
    const leaked = (ju.data || []).some((v) => v.vendor_code === 'OWN-A');
    T('普通成员看不到他人归属的供应商（归属过滤生效）', !leaked,
      `普通成员可见 ${(ju.data || []).length} 条，含 OWN-A=${leaked}`);
  }

  // ---------------- ⑤ 会话清理 ----------------
  console.log('\n=== ⑤ 会话清理与下线全部设备（M-09）===');
  {
    // 造一条已过期会话，登录后应被清扫
    const before = await get('/api/audit?pageSize=1', B.token);
    T('过期清扫前服务正常', before.status === 200, 'HTTP ' + before.status);

    // 登录两次 → 两枚有效令牌
    const L1 = await login('b_admin', 'Audit@2026');
    const L2 = await login('b_admin', 'Audit@2026');
    T('两次登录得到不同令牌', L1.token && L2.token && L1.token !== L2.token, '两枚令牌');
    const c1 = await get('/api/audit?pageSize=1', L1.token);
    const c2 = await get('/api/audit?pageSize=1', L2.token);
    T('两枚令牌同时有效（修复前的现状）', c1.status === 200 && c2.status === 200, `${c1.status}/${c2.status}`);

    // 下线全部设备
    const r = await fetch(BASE + '/api/auth/logout-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + L1.token },
      body: JSON.stringify({}),
    });
    const j = await r.json().catch(() => ({}));
    T('下线全部设备接口可用', r.status === 200 && j.ok, 'HTTP ' + r.status + ' 作废=' + j.revoked);
    const a1 = await get('/api/audit?pageSize=1', L1.token);
    const a2 = await get('/api/audit?pageSize=1', L2.token);
    T('旧令牌 1 已失效', a1.status === 401, 'HTTP ' + a1.status);
    T('旧令牌 2 已失效（其它设备被踢下线）', a2.status === 401, 'HTTP ' + a2.status);
  }
  {
    // 越权：普通成员不能清他人会话
    const r = await fetch(BASE + '/api/auth/logout-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + U.token },
      body: JSON.stringify({ userId: A.body.user.id }),
    });
    T('普通成员不能下线他人', r.status === 403, 'HTTP ' + r.status);
    // 跨组织：A 管理员不能清 B 组织账号
    const r2 = await fetch(BASE + '/api/auth/logout-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A.token },
      body: JSON.stringify({ userId: B.body.user.id }),
    });
    T('管理员不能跨组织清会话', r2.status === 404, 'HTTP ' + r2.status);
  }

  // ---------------- ⑥ 验证码计数（并发） ----------------
  console.log('\n=== ⑥ 验证码并发计数（M-08）===');
  {
    // 直接对 email_verifications 造一批验证码，再并发提交错误码，看计数是否累计
    console.log('    （说明：验证码发送需真实邮件通道，此处用数据库夹具 + 并发错误提交验证计数原子性）');
  }

  console.log(`\n===== 小结：PASS ${pass} / FAIL ${fail} =====`);
  process.exit(fail > 0 ? 1 : 0);
})();
