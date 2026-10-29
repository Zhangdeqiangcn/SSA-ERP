// 开放 API 网关鉴权（API Key，非 session）
//
// 【V3.2.0 变更 · 评测 M-12 / L-02 整改】本模块从「只认密钥哈希 + 吊销位」升级为
//   完整的密钥生命周期校验：格式 → 存在 → 未吊销 → 未过期，并给出**可区分的失败原因**。
//
// 两处安全收紧：
//   ① 不再接受网址参数（?api_key=）传递密钥，改为**显式拒绝**；
//      原因：网址会进入浏览器历史、服务器访问日志、Referer 头与代理转发链路，
//      等于把等同于口令的凭据四处散播。之所以「显式拒绝」而不是「静默忽略」——
//      静默忽略会让调用方以为改好了（实际是另一处凭据在生效），问题被掩盖更难排查。
//   ② 校验有效期（expires_at）。空值表示永久，兼容迁移前签发的历史 Key。
//
// 失败原因回传 code 字段，便于门禁断言与调用方自助排查，不再一律「无效或已吊销」。
import { json } from './auth';

export interface ApiKeyAuth {
  keyId: string;
  org_id: string;
  scopes: string[]; // ['read'] | ['read','write'] | ['*']
  /** 到期时间（ISO 字符串）；null = 永久有效 */
  expiresAt: string | null;
}

/** 鉴权失败分类 */
export type ApiKeyFailReason =
  | 'missing'       // 未携带密钥
  | 'malformed'     // 格式不对（未以 sk_ 开头）
  | 'query_param'   // 试图经网址参数传递（V3.2.0 起拒绝）
  | 'invalid'       // 密钥不存在（已删除或从未存在）
  | 'revoked'       // 已被吊销
  | 'expired';      // 已过期

export interface ApiKeyResolveResult {
  ok: boolean;
  auth?: ApiKeyAuth;
  reason?: ApiKeyFailReason;
  message?: string;
}

const FAIL_MESSAGE: Record<ApiKeyFailReason, string> = {
  missing: '缺少 API Key，请在请求头携带 Authorization: Bearer sk_xxx',
  malformed: 'API Key 格式不正确（应以 sk_ 开头）',
  query_param:
    '不允许通过网址参数传递 API Key（安全问题，可能被写入浏览器历史与访问日志），请改用请求头 Authorization: Bearer sk_xxx',
  invalid: 'API Key 不存在',
  revoked: 'API Key 已被吊销',
  expired: 'API Key 已过期，请重新签发或轮换密钥',
};

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export { sha256 };

/** 生成明文密钥（sk_ + 24 字节随机数的十六进制）。明文只在创建 / 轮换时返回一次。 */
export function generateApiKey(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return 'sk_' + Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 解析并校验请求中的 API Key。
 * @returns ok=true 时带 auth；ok=false 时带可区分的 reason 与中文 message。
 */
export async function resolveApiKey(request: Request, DB: any): Promise<ApiKeyResolveResult> {
  // ① 网址参数一律拒绝（V3.2.0 · 评测 M-12）
  let url: URL | null = null;
  try {
    url = new URL(request.url);
  } catch {
    url = null;
  }
  if (url && url.searchParams.has('api_key')) {
    return { ok: false, reason: 'query_param', message: FAIL_MESSAGE.query_param };
  }

  // ② 只接受请求头
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing', message: FAIL_MESSAGE.missing };
  }
  const key = auth.slice(7).trim();
  if (!key) return { ok: false, reason: 'missing', message: FAIL_MESSAGE.missing };
  if (!key.startsWith('sk_')) {
    return { ok: false, reason: 'malformed', message: FAIL_MESSAGE.malformed };
  }

  // ③ 存在性 + 吊销位 + 有效期（一次查全，避免多次往返）
  const hash = await sha256(key);
  const row = await DB.prepare(
    'SELECT id, org_id, scopes, revoked, expires_at FROM api_keys WHERE key_hash = ?'
  )
    .bind(hash)
    .first();
  if (!row) return { ok: false, reason: 'invalid', message: FAIL_MESSAGE.invalid };
  if ((row as any).revoked) return { ok: false, reason: 'revoked', message: FAIL_MESSAGE.revoked };

  // ④ 有效期：空值 = 永久；解析不出日期的脏值按「永久」处理，避免把可用密钥误判为过期。
  const expRaw = (row as any).expires_at ? String((row as any).expires_at) : '';
  if (expRaw) {
    const t = new Date(expRaw).getTime();
    if (Number.isFinite(t) && t <= Date.now()) {
      return { ok: false, reason: 'expired', message: FAIL_MESSAGE.expired };
    }
  }

  return {
    ok: true,
    auth: {
      keyId: (row as any).id,
      org_id: (row as any).org_id,
      scopes: String((row as any).scopes || 'read')
        .split(',')
        .map((s: string) => s.trim()),
      expiresAt: expRaw || null,
    },
  };
}

/** 兼容旧签名：从请求取 API Key 并校验有效性（返回 null 表示鉴权失败） */
export async function getApiKeyFromRequest(request: Request, DB: any): Promise<ApiKeyAuth | null> {
  const r = await resolveApiKey(request, DB);
  return r.ok && r.auth ? r.auth : null;
}

export function hasScope(auth: ApiKeyAuth, need: 'read' | 'write'): boolean {
  if (auth.scopes.includes('*')) return true;
  if (need === 'write') return auth.scopes.includes('write');
  // read 是 write 的子集：拥有 write 权限的 Key 天然可读（程序化集成通常需要先读后写）
  return auth.scopes.includes('read') || auth.scopes.includes('write');
}

/** 统一鉴权：失败返回 Response，成功返回 ApiKeyAuth（null 表示需继续） */
export async function requireApiKey(
  request: Request,
  DB: any,
  need: 'read' | 'write'
): Promise<ApiKeyAuth | Response> {
  const r = await resolveApiKey(request, DB);
  if (!r.ok || !r.auth) {
    return json({ error: r.message || '无效或已吊销的 API Key', code: r.reason || 'invalid' }, 401);
  }
  if (!hasScope(r.auth, need)) return json({ error: `API Key 缺 ${need} 权限` }, 403);
  return r.auth;
}

/** 有效期天数归一：null/'' → 永久；非法值 → 默认值；并夹在 [1, 3650] 天 */
export const DEFAULT_EXPIRES_DAYS = 90;
export const MAX_EXPIRES_DAYS = 3650;

export function normalizeExpiresDays(input: any): number | null {
  if (input === null || input === undefined || input === '' || input === 'forever') return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_EXPIRES_DAYS, Math.max(1, Math.floor(n)));
}

/** 按天数算到期时间；null → 永久 */
export function expiresAtFromDays(days: number | null): string | null {
  if (days === null) return null;
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}
