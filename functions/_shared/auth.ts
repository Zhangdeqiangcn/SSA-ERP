// 共享鉴权逻辑（被各 /api 路由复用）
// 在 Cloudflare Pages Functions 运行时中执行

export interface SessionUser {
  id: string;
  org_id: string;
  username: string;
  name: string;
  role: string;
  department?: string;
}

// 从请求头取出当前登录用户（校验 Bearer token + 会话有效期）
export async function getUserFromRequest(
  request: Request,
  DB: any
): Promise<SessionUser | null> {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  const sess = await DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?'
  )
    .bind(token)
    .first();
  if (!sess) return null;

  const expires = new Date((sess as any).expires_at);
  if (expires.getTime() < Date.now()) return null;

  const user = await DB.prepare(
    'SELECT id, org_id, username, name, role, department FROM users WHERE id = ?'
  )
    .bind((sess as any).user_id)
    .first();
  if (!user) return null;

  return user as unknown as SessionUser;
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

export function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function uid(prefix: string): string {
  return prefix + '_' + crypto.randomUUID().replace(/-/g, '');
}
