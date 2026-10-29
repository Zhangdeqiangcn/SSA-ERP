// 渠道 OAuth 2.0 授权码流程 —— 后端助手（密钥只在后端持有，绝不落前端）
// 参考 GitHub 主流实现（Shopify connect-standalone-app / 抖音开放平台 / 拼多多开放平台）：
//   start 拼授权页 + state 防篡改  ->  平台登录授权带 code 跳回  ->  callback 用 code+AppSecret 换令牌落库。
// 本模块为后端专用（不 import src/），所有平台令牌交换走服务端 fetch。

export interface OAuthProviderMeta {
  platform: string;
  label: string;
  /** 授权页地址模板，占位符：{client_id}/{client_key}/{redirect_uri}/{state}/{scope} */
  authorizeUrl: string;
  /** 令牌交换地址（用 code 换 access_token） */
  tokenUrl: string;
  /** 默认权限范围 */
  scopes: string;
  /** 授权页 query 里客户端标识的字段名（抖音 client_key / 拼多多 client_id） */
  clientIdField: 'client_id' | 'client_key';
  /** 从令牌响应里抽取字段（不同平台响应结构不同） */
  parseToken: (json: any) => TokenResult;
  /** 构造令牌交换请求体 */
  buildTokenBody: (p: { clientId: string; clientSecret: string; code: string; redirectUri: string }) => Record<string, string>;
}

export interface TokenResult {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  shopId?: string;
  shopName?: string;
  error?: string;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderMeta> = {
  douyin: {
    platform: 'douyin',
    label: '抖音电商',
    // 抖店开放平台授权页（电商订单/物流场景）。⚠ 真实端点请以「抖店开放平台-授权」文档为准。
    authorizeUrl:
      'https://open.douyin.com/platform/oauth/authorize/?response_type=code' +
      '&client_key={client_key}&redirect_uri={redirect_uri}&state={state}&scope={scope}',
    tokenUrl: 'https://open.douyin.com/oauth/access_token/',
    scopes: 'power_expire_remind,order_detail,waybill',
    clientIdField: 'client_key',
    buildTokenBody: ({ clientId, clientSecret, code }) => ({
      client_key: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
    parseToken: (j: any) => {
      if (j?.error_code && j.error_code !== 0) return { error: j.description || `抖音授权失败(${j.error_code})` };
      const d = j?.data || {};
      if (!d.access_token) return { error: '抖音未返回 access_token' };
      return {
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        expiresIn: d.expires_in,
        scope: d.scope,
        shopId: d.open_id,
        shopName: d.nick_name,
      };
    },
  },
  pinduoduo: {
    platform: 'pinduoduo',
    label: '拼多多',
    authorizeUrl:
      'https://mms.pinduoduo.com/open.html?response_type=code' +
      '&client_id={client_id}&redirect_uri={redirect_uri}&state={state}',
    tokenUrl: 'https://open-api.pinduoduo.com/oauth/token',
    scopes: '',
    clientIdField: 'client_id',
    buildTokenBody: ({ clientId, clientSecret, code, redirectUri }) => ({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    parseToken: (j: any) => {
      if (j?.error_response) {
        return { error: j.error_response.error_msg || `拼多多授权失败(${j.error_response.error_code})` };
      }
      if (!j?.access_token) return { error: '拼多多未返回 access_token' };
      return {
        accessToken: j.access_token,
        refreshToken: j.refresh_token,
        expiresIn: j.expires_in,
        scope: j.scope,
      };
    },
  },
};

export function getProvider(platform: string): OAuthProviderMeta | null {
  return OAUTH_PROVIDERS[platform] || null;
}

/** 构造授权页 URL（替换占位符） */
export function buildAuthorizeUrl(p: OAuthProviderMeta, clientId: string, redirectUri: string, state: string): string {
  const clientFieldValue = clientId;
  return p.authorizeUrl
    .replace('{client_key}', encodeURIComponent(clientFieldValue))
    .replace('{client_id}', encodeURIComponent(clientFieldValue))
    .replace('{redirect_uri}', encodeURIComponent(redirectUri))
    .replace('{state}', encodeURIComponent(state))
    .replace('{scope}', encodeURIComponent(p.scopes));
}

/** 生成 state（防 CSRF，10 分钟有效） */
export function genState(): string {
  const rand = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `s_${rand}`;
}

/** 用 code 换令牌（真实平台调用；密钥由后端持有） */
export async function exchangeCodeForToken(
  p: OAuthProviderMeta,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<TokenResult> {
  try {
    const body = new URLSearchParams(p.buildTokenBody({ clientId, clientSecret, code, redirectUri }));
    const resp = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const json = await resp.json();
    const result = p.parseToken(json);
    if (result.error) return result;
    if (!result.accessToken) return { error: '令牌响应缺少 access_token' };
    return result;
  } catch (e: any) {
    return { error: `令牌交换请求失败：${String(e?.message || e)}` };
  }
}

/** 刷新令牌 */
export async function refreshAccessToken(
  p: OAuthProviderMeta,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenResult> {
  try {
    const body = new URLSearchParams({
      ...p.buildTokenBody({ clientId, clientSecret, code: '', redirectUri: '' }),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const resp = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const json = await resp.json();
    return p.parseToken(json);
  } catch (e: any) {
    return { error: `令牌刷新失败：${String(e?.message || e)}` };
  }
}

/** 模拟授权令牌（未配置真实应用密钥时，界面/流程全真、令牌标 mock，绝不冒充真实平台） */
export function makeMockToken(platform: string): TokenResult {
  const token = `mock_${platform}_${Date.now().toString(36)}`;
  return { accessToken: token, refreshToken: `mock_ref_${platform}`, expiresIn: 60 * 60 * 24 * 15, scope: 'mock' };
}

/** 计算令牌过期时间（ISO 字符串） */
export function expiresAt(expiresIn?: number): string | null {
  if (!expiresIn) return null;
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

/** 落库：新增或更新某平台凭证（按 org_id + platform 唯一） */
export async function upsertCredential(
  DB: any,
  orgId: string,
  platform: string,
  fields: Record<string, unknown>
): Promise<void> {
  const exist = await DB.prepare(
    'SELECT id FROM channel_credentials WHERE org_id = ? AND platform = ? LIMIT 1'
  )
    .bind(orgId, platform)
    .first();
  const now = new Date().toISOString();
  if (exist) {
    const sets: string[] = [];
    const binds: unknown[] = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      binds.push(v);
    }
    sets.push('updated_at = ?');
    binds.push(now);
    binds.push(orgId, platform);
    await DB.prepare(
      `UPDATE channel_credentials SET ${sets.join(', ')} WHERE org_id = ? AND platform = ?`
    )
      .bind(...binds)
      .run();
  } else {
    const cols = ['id', 'org_id', 'platform', ...Object.keys(fields), 'created_at', 'updated_at'];
    const vals = [crypto.randomUUID(), orgId, platform, ...Object.values(fields), now, now];
    const ph = cols.map(() => '?').join(', ');
    await DB.prepare(`INSERT INTO channel_credentials (${cols.join(', ')}) VALUES (${ph})`)
      .bind(...vals)
      .run();
  }
}

/** 读某平台凭证（仅后端内部用，含密钥；前端永不可见） */
export async function getCredential(DB: any, orgId: string, platform: string): Promise<any | null> {
  return DB.prepare(
    `SELECT id, app_key, app_secret, access_token, refresh_token, token_expire, scope,
            auth_mode, status, shop_id, shop_name, is_mock
     FROM channel_credentials WHERE org_id = ? AND platform = ? LIMIT 1`
  )
    .bind(orgId, platform)
    .first();
}
