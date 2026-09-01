// 开放 API 网关鉴权（API Key，非 session）
import { json } from './auth';

export interface ApiKeyAuth {
  keyId: string;
  org_id: string;
  scopes: string[]; // ['read'] | ['read','write'] | ['*']
}

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export { sha256 };

/** 从请求取 API Key（Authorization: Bearer sk_xxx 或 ?api_key=）并校验有效性+未吊销 */
export async function getApiKeyFromRequest(request: Request, DB: any): Promise<ApiKeyAuth | null> {
  const auth = request.headers.get('Authorization') || '';
  let key = '';
  if (auth.startsWith('Bearer ')) key = auth.slice(7).trim();
  if (!key) {
    const u = new URL(request.url);
    key = u.searchParams.get('api_key') || '';
  }
  if (!key || !key.startsWith('sk_')) return null;

  const hash = await sha256(key);
  const row = await DB.prepare(
    'SELECT id, org_id, scopes, revoked FROM api_keys WHERE key_hash = ?'
  ).bind(hash).first();
  if (!row || row.revoked) return null;
  return {
    keyId: row.id,
    org_id: row.org_id,
    scopes: (row.scopes || 'read').split(',').map((s: string) => s.trim()),
  };
}

export function hasScope(auth: ApiKeyAuth, need: 'read' | 'write'): boolean {
  return auth.scopes.includes('*') || auth.scopes.includes(need);
}

/** 统一鉴权：失败返回 Response，成功返回 ApiKeyAuth（null 表示需继续） */
export async function requireApiKey(request: Request, DB: any, need: 'read' | 'write'): Promise<ApiKeyAuth | Response> {
  const auth = await getApiKeyFromRequest(request, DB);
  if (!auth) return json({ error: '无效或已吊销的 API Key' }, 401);
  if (!hasScope(auth, need)) return json({ error: `API Key 缺 ${need} 权限` }, 403);
  return auth;
}
