// 发起授权：拼授权页地址 + 写入 state 防篡改 Cookie，返回给前端跳转
import { getUserFromRequest, json } from '../../../_shared/auth';
import { audit } from '../../../_shared/auditLog';
import {
  getProvider,
  buildAuthorizeUrl,
  genState,
  getCredential,
} from '../../../_shared/channelOAuth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const platform = new URL(request.url).searchParams.get('platform') || '';
  const provider = getProvider(platform);
  if (!provider) return json({ error: `未支持的渠道平台：${platform}` }, 400);

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/channels/oauth/callback`;
  const state = genState();

  const cred = await getCredential(env.DB, user.org_id, platform);
  const hasRealApp = !!(cred?.app_key && cred?.app_secret);

  // 未配置真实应用密钥 → 走模拟授权页（界面/流程全真，令牌标 mock，绝不冒充真实平台）
  const authorizeUrl = hasRealApp
    ? buildAuthorizeUrl(provider, cred.app_key, redirectUri, state)
    : `${origin}/api/channels/oauth/mock?platform=${encodeURIComponent(platform)}&state=${encodeURIComponent(state)}`;

  const cookie = `ssa_oauth_state_${platform}=${state}; HttpOnly; SameSite=Lax; Path=/api/channels/oauth; Max-Age=600`;
  await audit(
    env.DB,
    user.org_id,
    user,
    'channel',
    'oauth_start',
    `发起「${provider.label}」授权（${hasRealApp ? '真实' : '模拟'}）`
  );
  return json({ authorizeUrl, mock: !hasRealApp, platform }, 200, cookie);
}
