// 共享鉴权逻辑（被各 /api 路由复用）
// 在 Cloudflare Pages Functions 运行时中执行

export interface SessionUser {
  id: string;
  org_id: string;
  username: string;
  name: string;
  role: string;
  department?: string;
  /** V3.15.0：把用户资料字段一并带出，避免各端点重复查库 */
  email?: string | null;
  alt_email?: string | null;
  phone?: string | null;
  status?: string;
}

/**
 * V3.15.0：把用户行规范化为「前端消费的客户端用户对象」。
 * 背景：此前登录接口只回 {id, org_id, username, name, role} 五个字段，
 *   导致个人中心把「部门」显示成"未设置"、「邮箱」显示成"未绑定"——
 *   并非数据没存，而是前端压根拿不到。此函数统一出口，login / me / profile 共用，
 *   字段名统一 camelCase（alt_email → altEmail），杜绝各处手写漏字段。
 */
export function toClientUser(u: any) {
  return {
    id: u?.id,
    org_id: u?.org_id,
    username: u?.username,
    name: u?.name,
    role: u?.role,
    department: u?.department ?? null,
    email: u?.email ?? null,
    altEmail: u?.alt_email ?? u?.altEmail ?? null,
    phone: u?.phone ?? null,
  };
}

// 会话 Cookie 名称（HttpOnly，JavaScript 读取不到 → 抗 XSS 窃取明文令牌）
export const AUTH_COOKIE_NAME = 'ssa-erp-auth';
/** 会话有效期（秒）：与登录签发时写入 sessions.expires_at 的 30 天保持一致 */
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * 从请求 Cookie 中取出会话令牌。
 * 仅读取本系统专用的 HttpOnly Cookie；其它站点注入的 Cookie 一律忽略。
 */
function parseAuthCookie(request: Request): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const seg = part.trim();
    if (!seg) continue;
    const eq = seg.indexOf('=');
    if (eq <= 0) continue;
    const k = seg.slice(0, eq);
    const v = seg.slice(eq + 1);
    if (k === AUTH_COOKIE_NAME) return decodeURIComponent(v);
  }
  return null;
}

/**
 * 构造 Set-Cookie 头内容。
 * - 种 Cookie：HttpOnly + Secure + SameSite=Strict，JS 读取不到，且不会被跨站请求携带；
 * - 清除 Cookie：Max-Age=0，浏览器收到即删除。
 * 注意：Secure 属性使「开发态 http://localhost」下浏览器拒绝存储该 Cookie，
 *   于是 dev 跨域代理场景天然回退到 Authorization 头（由前端内存令牌提供），无需特殊处理。
 */
export function buildAuthCookie(token: string, clear = false): string {
  const attrs = [
    `${AUTH_COOKIE_NAME}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Secure',
    clear ? 'Max-Age=0' : `Max-Age=${AUTH_COOKIE_MAX_AGE}`,
  ];
  return attrs.join('; ');
}

// 从请求头 / Cookie 取出当前登录用户（校验 Bearer token 或 HttpOnly 会话 Cookie + 会话有效期）
//
// V3.91.0 安全整改：优先读取 HttpOnly Cookie `ssa-erp-auth`（生产态浏览器自动携带、
// JavaScript 读取不到 → 即使发生 XSS 也无法窃取明文令牌），仅当无 Cookie 时回退到
// Authorization 头（兼容 API 客户端、E2E 脚本、dev 跨域代理等不发 Cookie 的场景）。
export async function getUserFromRequest(
  request: Request,
  DB: any
): Promise<SessionUser | null> {
  const cookieToken = parseAuthCookie(request);
  const auth = request.headers.get('Authorization');
  const headerToken =
    auth && auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;

  // 按「Cookie 优先 → 头部兜底」的顺序校验会话有效性，取第一个有效令牌
  const candidates = [cookieToken, headerToken].filter(
    (t): t is string => typeof t === 'string' && t.length > 0
  );
  let userId: any = null;
  for (const token of candidates) {
    const sess: any = await DB.prepare(
      'SELECT user_id, expires_at FROM sessions WHERE token = ?'
    )
      .bind(token)
      .first();
    if (sess) {
      const exp = new Date(sess.expires_at);
      if (exp.getTime() >= Date.now()) {
        userId = sess.user_id;
        break;
      }
    }
  }
  if (!userId) return null;

  // 账号信息 + 组织状态一次查出（JOIN 避免每请求多一次数据库往返）
  let user: any;
  try {
    user = await DB.prepare(
      `SELECT u.id, u.org_id, u.username, u.name, u.role, u.department, u.status,
              u.email, u.alt_email, u.phone,
              o.id AS org_found, IFNULL(o.status, 'active') AS org_status
         FROM users u
         LEFT JOIN orgs o ON o.id = u.org_id
        WHERE u.id = ?`
    )
      .bind(userId)
      .first();
  } catch {
    // 极老环境（尚未应用迁移 0041，orgs 表无 status 列）：退化为不含组织信息的查询。
    // 目的是「新增闸门不得把鉴权整体打挂」——宁可暂时跳过组织校验，也不能全站 500。
    user = await DB.prepare(
      'SELECT id, org_id, username, name, role, department, status FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();
    if (user) (user as any).org_found = undefined; // undefined = 无法判定 → 跳过组织闸门
  }
  if (!user) return null;

  // 账号状态闸门（V2.97.0 修复 · 安全审计 A1）
  // 此前只在「登录那一刻」校验账号状态，会话一经签发便不再过问，
  // 导致账号被停用/驳回后，其既有会话在 30 天有效期内依然畅通无阻。
  // 现将状态校验放到每次请求：待审批 / 已驳回 的账号，既有会话立即失效。
  // 兼容性：历史账号状态为 'active'（迁移 0040 默认值），不受影响；
  //         状态为空的历史数据按「正常」处理，避免误封锁。
  const status = String((user as any).status ?? '').trim();
  if (status === 'pending' || status === 'rejected') return null;

  // 供应商门户会话隔离（V2.97.0 修复 · 安全审计 A2）
  // 背景：/api/vendor/login 会把供应商账号以 role='vendor' 写进同一张 users 表，
  //   并往同一张 sessions 表签发会话——与内部员工共用同一套 Bearer 鉴权入口。
  //   此前该会话可畅通访问全部内部接口（叠加 C1 甚至能改写组织级权限矩阵），
  //   等于把内部系统整体暴露给任一已批准的供应商。
  // 判定依据：role='vendor' 不属于内部角色集合（见 src/types/settings.ts 的 Role 联合类型），
  //   且供应商门户登录后不再调用任何内部接口——门户令牌存于 sessionStorage.vendorPortalToken，
  //   与内部令牌键（localStorage.ssa-erp-auth-token）完全不同，二者本已天然分域。
  // 影响面：门户自身不受影响（其唯一后端调用 /api/vendor/login 不经过本函数）。
  if (String((user as any).role ?? '').trim() === 'vendor') return null;

  // 组织准入闸门（V3.2.0 修复 · 评测 L-03 整改）
  // 背景：此前只校验「账号」自身状态，从不校验其归属的「公司（组织）」，于是出现两类漏网：
  //   ① 组织已被删除/清空，成员账号仍在 —— 一批无人管理却持有有效会话的孤儿账号；
  //   ② 组织被停用（如欠费、违规、审批被撤销），成员既有会话照旧畅通。
  // 现在把组织状态也纳入「每次请求校验」，与账号状态闸门（V2.97.0 · A1）同一思路：
  //   只有「账号正常 + 公司正常」才放行。
  // 判定说明：org_found 为 undefined = 无法判定（老库降级），跳过而不误伤；
  //   为 null = 组织确实不存在 → 拒绝。
  // 豁免：super_admin 属平台级运维角色，必须在任一公司异常时仍能进入系统处置，
  //   否则一旦唯一的超管所在组织被停用，将无人能修复（属于「自锁」风险）。
  if ((user as any).org_found !== undefined && String((user as any).role ?? '').trim() !== 'super_admin') {
    if ((user as any).org_found === null) return null;
    const orgStatus = String((user as any).org_status ?? 'active').trim();
    if (orgStatus !== 'active') return null;
  }

  return {
    id: (user as any).id,
    org_id: (user as any).org_id,
    username: (user as any).username,
    name: (user as any).name,
    role: (user as any).role,
    department: (user as any).department,
    email: (user as any).email ?? null,
    alt_email: (user as any).alt_email ?? null,
    phone: (user as any).phone ?? null,
    status: (user as any).status ?? 'active',
  } as SessionUser;
}

// SHA-256 + 盐 密码哈希（旧格式，仅用于兼容存量账号的登录校验）
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 新格式：PBKDF2-HMAC-SHA-256（带随机盐 + 10 万次迭代），抗彩虹表/暴力破解
// 存储格式：pbkdf2$<iterations>$<saltHex>$<hashHex>
export const PBKDF2_ITERATIONS = 100000;

export async function hashPasswordPbkdf2(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hashHex}`;
}

// 兼容验证：自动识别新/旧哈希格式，存量账号无需重设密码即可平滑迁移
export async function verifyPassword(
  password: string,
  passwordHash: string,
  salt: string
): Promise<boolean> {
  if (passwordHash.startsWith('pbkdf2$')) {
    const parts = passwordHash.split('$');
    const iter = parseInt(parts[1], 10);
    const s = parts[2];
    const expected = parts[3];
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(s),
        iterations: iter,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashHex = Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex === expected;
  }
  // 旧 SHA-256(salt:password)
  const old = await hashPassword(password, salt);
  return old === passwordHash;
}

export function makeSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(16);
}

/**
 * 统一 JSON 响应构造。
 *
 * V3.91.0 安全整改 —— 自动处置会话 Cookie：
 *   · 响应体含 `token` 字段（登录 / 注册 / 激活成功）→ 自动种 HttpOnly Cookie，
 *     浏览器后续请求自动携带，前端 JS 读不到明文令牌；
 *   · 响应体含 `clearAuth: true`（登出 / 下线全部设备）→ 清除该 Cookie；
 *   · 允许 `cookie` 参数显式追加自定义 Set-Cookie（如自定义过期策略）。
 * 其余接口不返回这些字段，不受影响。
 */
export function json(data: any, status = 200, cookie?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  const setCookies: string[] = [];

  if (data && typeof data === 'object') {
    // 登录/注册/激活：响应体带回 token → 种 HttpOnly Cookie
    if (typeof data.token === 'string' && data.token.length > 0) {
      setCookies.push(buildAuthCookie(data.token));
    }
    // 登出/下线：显式清 Cookie
    if (data.clearAuth) {
      setCookies.push(buildAuthCookie('', true));
    }
  }
  if (cookie) setCookies.push(cookie);
  if (setCookies.length) headers['Set-Cookie'] = setCookies.join(', ');

  return new Response(JSON.stringify(data), { status, headers });
}

export function uid(prefix: string): string {
  return prefix + '_' + crypto.randomUUID().replace(/-/g, '');
}
