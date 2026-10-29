// 保存平台「应用密钥」（AppKey/AppSecret）—— 仅存服务端，前端永不可见
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';
import { getProvider, upsertCredential } from '../../../_shared/channelOAuth';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const deny = await guardOperation(user, 'channel', 'update', env.DB, user.org_id);
  if (deny) return deny;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const platform = String(body?.platform || '');
  if (!getProvider(platform)) return json({ error: `未支持的渠道平台：${platform}` }, 400);
  const appKey = String(body?.appKey || '').trim();
  const appSecret = String(body?.appSecret || '').trim();
  if (!appKey || !appSecret) return json({ error: '请填写 AppKey 与 AppSecret' }, 400);

  await upsertCredential(env.DB, user.org_id, platform, { app_key: appKey, app_secret: appSecret });
  await audit(env.DB, user.org_id, user, 'channel', 'oauth_app', `配置「${platform}」应用密钥`);

  // 若此前已有连接，重置为需重新授权（密钥变更后旧令牌失效）
  await env.DB.prepare(
    `UPDATE channel_credentials SET status = 'disconnected' WHERE org_id = ? AND platform = ? AND status = 'connected'`
  )
    .bind(user.org_id, platform)
    .run();

  return json({ ok: true, message: '应用密钥已保存（仅存于服务端，前端不可见）' });
}
