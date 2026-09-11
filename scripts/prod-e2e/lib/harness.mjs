// SSA ERP · 生产 E2E 常驻套件 — 断言器 + 测试上下文 + 自动清理
// ------------------------------------------------------------
// Suite：结构化断言记录（PASS/FAIL/WARN/INFO），不抛异常中断，跑完全部再汇总。
// Context：隔离测试组织（时间戳公司码）+ 多角色用户 + 资源追踪 + 跑完自动清理。
//
// 设计原则：
//  1) 生产库安全 —— 所有写操作只发生在本轮隔离 org 内，跑完自动删除业务行。
//  2) 不中断 —— 单条断言失败不影响后续，最大化一轮暴露的信息量。
//  3) 可追溯 —— 每条断言带 detail（真实 status/字段值），失败可直接定位。

// 后端用户管理接口允许设置的角色（与 functions/api/users/[id].ts 的 VALID_ROLES 一致）。
// 注意：super_admin 不在此列 —— 该值任何情况下都不可经接口授予，只能由数据库运维直接设置。
const VALID_ROLES = new Set([
  'admin', 'rd_engineer', 'process_engineer', 'qa_engineer', 'qa_inspector',
  'warehouse_keeper', 'logistics', 'finance_manager', 'accountant', 'buyer',
  'prod_manager', 'prod_leader', 'vendor', 'user',
]);

/** 一个测试套件的断言记录器 */
export class Suite {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.results = [];
    this.startedAt = Date.now();
  }

  _push(status, name, detail) {
    this.results.push({ status, name, detail: detail || '' });
    const tag = { PASS: '  ✅', FAIL: '  ❌', WARN: '  ⚠️ ', INFO: '  ℹ️ ' }[status];
    console.log(`${tag} ${name}${detail ? ' — ' + detail : ''}`);
    return status === 'PASS';
  }

  pass(name, detail) { return this._push('PASS', name, detail); }
  fail(name, detail) { return this._push('FAIL', name, detail); }
  warn(name, detail) { return this._push('WARN', name, detail); }
  info(name, detail) { return this._push('INFO', name, detail); }

  /** 断言 HTTP 状态码；want 可为数字或数字数组 */
  expectStatus(name, res, want, extra) {
    const wants = Array.isArray(want) ? want : [want];
    const detailBits = [`status=${res.status}`];
    if (extra) detailBits.push(extra);
    if (res.error) detailBits.push('err=' + res.error);
    if (wants.includes(res.status)) return this.pass(name, detailBits.join(' '));
    detailBits.push(`期望=${wants.join('|')}`);
    const body = res.data ? JSON.stringify(res.data).slice(0, 220) : (res.text || '').slice(0, 120);
    if (body) detailBits.push('body=' + body);
    return this.fail(name, detailBits.join(' '));
  }

  /** 断言布尔条件 */
  expectTrue(name, cond, detail) {
    return cond ? this.pass(name, detail) : this.fail(name, detail);
  }

  /** 断言相等（宽松比较，用于数字/字符串） */
  expectEq(name, actual, expected, label) {
    const same = actual === expected
      || (typeof actual === 'number' && Number(expected) === actual)
      || JSON.stringify(actual) === JSON.stringify(expected);
    const detail = `${label ? label + ': ' : ''}实际=${JSON.stringify(actual)} 期望=${JSON.stringify(expected)}`;
    return same ? this.pass(name, detail) : this.fail(name, detail);
  }

  /** 断言列表响应契约 { data:[], total, page, pageSize }
   *  兼容两种分页返回形态：
   *   - 顶层：{ data, total, page, pageSize }（开放网关等）
   *   - 嵌套：{ data, pagination:{ total, page, pageSize } }（关系域/B2 内部端点） */
  expectListShape(name, res) {
    if (res.status !== 200) {
      return this.fail(name, `status=${res.status} 非 200，无法校验契约`);
    }
    const d = res.data || {};
    const pg = d.pagination || d; // 兼容嵌套
    const missing = [];
    if (!Array.isArray(d.data)) missing.push('data[]');
    if (typeof pg.total !== 'number') missing.push('total');
    if (pg.page === undefined) missing.push('page');
    if (pg.pageSize === undefined) missing.push('pageSize');
    return missing.length === 0
      ? this.pass(name, `data=${d.data.length}条 total=${pg.total} page=${pg.page}/${pg.pageSize}`)
      : this.fail(name, '缺字段: ' + missing.join(','));
  }

  summary() {
    const c = (s) => this.results.filter((r) => r.status === s).length;
    return {
      id: this.id,
      title: this.title,
      pass: c('PASS'), fail: c('FAIL'), warn: c('WARN'), info: c('INFO'),
      total: this.results.length,
      ms: Date.now() - this.startedAt,
      results: this.results,
    };
  }
}

/**
 * 创建测试上下文：注册隔离组织 + admin 用户，准备资源追踪与清理。
 * 失败直接抛错（bootstrap 失败无法继续任何 suite）。
 */
export async function createContext({ req, runId }) {
  const companyCode = `E2E-${runId}`;
  const adminUsername = `e2e_admin_${runId}`;
  const password = 'E2eProd!2026';

  const reg = await req('POST', '/api/auth/register', {
    body: {
      username: adminUsername, password, name: 'E2E 管理员',
      companyCode, role: 'admin', department: 'QA',
      orgName: `E2E 常驻套件 ${runId}`,
    },
  });
  if (reg.status !== 200 || !reg.data?.token) {
    throw new Error(`bootstrap 注册失败 status=${reg.status} body=${JSON.stringify(reg.data)?.slice(0, 300)}`);
  }

  /** 待清理资源，形如 { kind, id } —— 清理按注册逆序执行 */
  const tracked = [];

  const ctx = {
    req,
    runId,
    password,
    org: { companyCode, orgId: reg.data.user.org_id },
    admin: { token: reg.data.token, user: reg.data.user, username: adminUsername },
    /** 本轮额外注册的普通角色用户（供 RLS suite 使用） */
    users: {},

    /** 追踪一个需清理的资源 */
    track(kind, id, extra) {
      if (id) tracked.push({ kind, id, extra });
      return id;
    },

    /**
     * 在同一组织内注册一个用户，并走完整审批链路（新契约，用于 RLS 多主体验证等）。
     * 新契约流程：注册 → 待审批(202) → 管理员批准 → 才能登录。
     *   - 注册请求体**不再传 role**（服务端已忽略请求体 role，传了只会误导读者）。
     *   - 仅当调用方请求的 role 合法、且不属于 admin 时，才在批准时带上 role 字段；
     *     授予 admin 需 super_admin 权限，而本组织 admin 由「首次注册新公司码」bootstrap 产生，
     *     并非 super_admin，故会被跳过并标记 roleSkipped。
     * 遗留说明：orgs/users/sessions 无删除端点，本函数创建的测试账号会残留（不影响业务数据）。
     */
    async registerUser(key, role, department) {
      const username = `e2e_${key}_${runId}`;

      // 1) 同公司码注册 → 期望 202 待审批（且不得返回登录凭证）
      const reg = await req('POST', '/api/auth/register', {
        body: { username, password, name: `E2E ${key}`, companyCode, department },
      });
      if (reg.status !== 202 || reg.data?.pending !== true || reg.data?.token) return null;

      // 2) 待审批账号立即登录 → 期望 403（闸门生效），记录状态供套件断言
      const pendingLogin = await req('POST', '/api/auth/login', {
        body: { username, password },
      });
      const pendingLoginStatus = pendingLogin.status;

      // 3) 用 admin 令牌按 username 查出待审批用户的真实 id
      const found = await req('GET', `/api/users?status=pending&keyword=${encodeURIComponent(username)}`, {
        token: ctx.admin.token,
      });
      const id = found.data?.data?.[0]?.id;
      if (!id) return null;

      // 4) 批准的 role：合法且非 admin 才带上（admin 需 super_admin 授权）
      const putBody = { action: 'approve' };
      let roleSkipped = false;
      if (role && VALID_ROLES.has(role) && role !== 'admin') {
        putBody.role = role;
      } else if (role) {
        roleSkipped = true;
      }
      const approve = await req('PUT', `/api/users/${id}`, { token: ctx.admin.token, body: putBody });
      if (approve.status !== 200) return null;

      // 5) 批准后再次登录 → 期望 200 且有 token
      const login = await req('POST', '/api/auth/login', { body: { username, password } });
      if (login.status !== 200 || !login.data?.token) return null;

      const actualRole = approve.data?.data?.role || login.data?.user?.role || 'user';
      ctx.users[key] = {
        id,
        token: login.data.token,
        user: login.data.user,
        username,
        role: actualRole,       // 批准后的实际角色（服务端决定）
        department,
        pendingLoginStatus,     // 待审批时登录的状态码（期望 403）
        roleSkipped,
      };
      return ctx.users[key];
    },

    /**
     * 自动清理：删除本轮创建的全部业务行 + 吊销测试 Key。
     * 注意：orgs/users/sessions 无删除端点，会残留少量僵尸账号（不影响业务数据）。
     */
    async cleanup() {
      const token = ctx.admin.token;
      const report = { attempted: 0, removed: 0, failed: [] };
      const pathOf = {
        vendor: (id) => `/api/vendors/${id}`,
        serial: (id) => `/api/serial-numbers/${id}`,
        subcontract: (id) => `/api/subcontracts/${id}`,
        picking: (id) => `/api/work-orders/picking/${id}`,
        state: (id) => `/api/state/${id}`,
      };

      for (const item of [...tracked].reverse()) {
        // API Key 单独处理（见下方按 label 前缀吊销）
        if (item.kind === 'apikey') continue;
        // 开放网关创建的行，用 write key 走网关删除
        if (item.kind.startsWith('openres:')) {
          const resource = item.kind.slice('openres:'.length);
          if (!ctx.writeKey) { report.failed.push(`${item.kind}/${item.id}(无 writeKey)`); continue; }
          report.attempted += 1;
          const d = await req('DELETE', `/api/open/${resource}/${item.id}`, { apiKey: ctx.writeKey });
          if (d.status === 200) report.removed += 1;
          else report.failed.push(`${item.kind}/${item.id}=${d.status}`);
          continue;
        }
        const build = pathOf[item.kind];
        if (!build) { report.failed.push(`${item.kind}(未知类型)`); continue; }
        report.attempted += 1;
        const d = await req('DELETE', build(item.id), { token });
        if (d.status === 200 || d.status === 404) report.removed += 1;
        else report.failed.push(`${item.kind}/${item.id}=${d.status}`);
      }

      // 吊销本轮全部测试 Key：因创建端点返回 id 不可信（见 06 suite 缺陷断言），
      // 统一改为列表按 label 前缀匹配真实 id 后吊销。
      const list = await req('GET', '/api/open/keys', { token });
      for (const k of list.data?.data || []) {
        if (typeof k.label === 'string' && k.label.startsWith(`e2e-${runId}`) && !k.revoked) {
          report.attempted += 1;
          const d = await req('DELETE', `/api/open/keys/${k.id}`, { token });
          if (d.status === 200) report.removed += 1;
          else report.failed.push(`apikey/${k.label}=${d.status}`);
        }
      }
      return report;
    },
  };

  return ctx;
}
