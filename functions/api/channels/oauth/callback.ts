// 授权回调：校验 state → 用 code 换令牌（真实 or 模拟）→ 落库 → 渲染结果页跳回设置
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';
import {
  getProvider,
  exchangeCodeForToken,
  makeMockToken,
  expiresAt,
  upsertCredential,
  getCredential,
  type TokenResult,
} from '../../../_shared/channelOAuth';

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function resultHtml(success: boolean, message: string, platform: string, origin: string): string {
  const color = success ? '#16A34A' : '#DC2626';
  const back = `${origin}/settings?tab=channel-auth&oauth=${success ? 'success' : 'fail'}&platform=${encodeURIComponent(platform)}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<meta http-equiv="refresh" content="2;url=${back}"/>
<title>授权结果</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;height:100vh}
 .card{background:#fff;border-radius:16px;padding:32px;width:380px;box-shadow:0 8px 30px rgba(15,23,42,.08);text-align:center}
 .dot{width:46px;height:46px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;background:${color}}
 h2{margin:0 0 6px;color:#0F172A}.sub{color:#64748B;font-size:13px}
 a{display:inline-block;margin-top:18px;color:#2563EB;font-size:14px;text-decoration:none}
</style></head><body><div class="card">
 <div class="dot">${success ? '✓' : '✕'}</div>
 <h2>${success ? '授权成功' : '授权失败'}</h2>
 <div class="sub">${message}</div>
 <a href="${back}">返回系统设置（2 秒后自动跳转）</a>
</div></body></html>`;
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const deny = await guardOperation(user, 'channel', 'update', env.DB, user.org_id);
  if (deny) return deny;

  const url = new URL(request.url);
  const platform = url.searchParams.get('platform') || '';
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const provider = getProvider(platform);
  const origin = url.origin;
  const clearCookie = `ssa_oauth_state_${platform}=; HttpOnly; SameSite=Lax; Path=/api/channels/oauth; Max-Age=0`;

  if (!provider) {
    return new Response(resultHtml(false, `未支持的渠道平台：${platform}`, platform, origin), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearCookie },
    });
  }

  // state 校验（防 CSRF / 防重放）
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const expected = cookies[`ssa_oauth_state_${platform}`];
  if (!expected || expected !== state) {
    return new Response(
      resultHtml(false, 'state 校验失败（可能是跨站请求或授权已过期，请重试）', platform, origin),
      { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearCookie } }
    );
  }

  const cred = await getCredential(env.DB, user.org_id, platform);
  const isMock = !cred?.app_secret || code.startsWith('mock_');

  let token: TokenResult;
  if (isMock) {
    token = makeMockToken(platform);
  } else {
    const redirectUri = `${origin}/api/channels/oauth/callback`;
    token = await exchangeCodeForToken(provider, cred.app_key, cred.app_secret, code, redirectUri);
  }
  if (token.error) {
    return new Response(resultHtml(false, token.error, platform, origin), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearCookie },
    });
  }

  await upsertCredential(env.DB, user.org_id, platform, {
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    token_expire: expiresAt(token.expiresIn),
    scope: token.scope || provider.scopes,
    auth_mode: isMock ? 'manual' : 'oauth',
    status: 'connected',
    shop_id: token.shopId || null,
    shop_name: token.shopName || null,
    is_mock: isMock ? 1 : 0,
  });
  await audit(
    env.DB,
    user.org_id,
    user,
    'channel',
    'oauth_callback',
    `「${provider.label}」授权成功（${isMock ? '模拟' : '真实'}）`
  );
  return new Response(resultHtml(true, `「${provider.label}」已连接`, platform, origin), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearCookie },
  });
}
