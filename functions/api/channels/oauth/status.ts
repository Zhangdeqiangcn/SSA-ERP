// 查询各平台连接状态（前端卡片渲染用；不含任何密钥）
import { getUserFromRequest, json } from '../../../_shared/auth';
import { OAUTH_PROVIDERS } from '../../../_shared/channelOAuth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const rows: any[] =
    (
      await env.DB.prepare(
        `SELECT platform, status, auth_mode, token_expire, shop_name, is_mock
         FROM channel_credentials WHERE org_id = ?`
      )
        .bind(user.org_id)
        .all()
    ).results || [];

  const map = new Map(rows.map((r) => [r.platform, r]));
  const now = Date.now();

  const platforms = Object.keys(OAUTH_PROVIDERS).map((p) => {
    const row = map.get(p);
    let status = 'disconnected';
    if (row?.status === 'connected') {
      status =
        row.token_expire && new Date(String(row.token_expire)).getTime() < now ? 'expired' : 'connected';
    }
    return {
      platform: p,
      label: OAUTH_PROVIDERS[p].label,
      status,
      authMode: row?.auth_mode || null,
      tokenExpire: row?.token_expire || null,
      shopName: row?.shop_name || null,
      isMock: !!row?.is_mock,
      hasApp: false, // 由前端另查/或这里补：是否配置了应用密钥（不含密钥值）
    };
  });

  // 标记是否已配置应用密钥（仅布尔，不返回密钥）
  for (const pf of platforms) {
    const row = map.get(pf.platform);
    pf.hasApp = !!(row && (await hasApp(env.DB, user.org_id, pf.platform)));
  }

  return json({ platforms });
}

async function hasApp(DB: any, orgId: string, platform: string): Promise<boolean> {
  const r = await DB.prepare(
    'SELECT app_key FROM channel_credentials WHERE org_id = ? AND platform = ? AND app_key IS NOT NULL LIMIT 1'
  )
    .bind(orgId, platform)
    .first();
  return !!r;
}
