// 手动录入 access_token（无 OAuth 或不便走授权流的兜底；同样仅存服务端）
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';
import { getProvider, upsertCredential, expiresAt } from '../../../_shared/channelOAuth';

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
  const accessToken = String(body?.accessToken || '').trim();
  if (!accessToken) return json({ error: '请填写 access_token' }, 400);
  const expiresIn = body?.expiresIn ? Number(body.expiresIn) : undefined;
  const shopId = body?.shopId ? String(body.shopId) : null;
  const shopName = body?.shopName ? String(body.shopName) : null;

  await upsertCredential(env.DB, user.org_id, platform, {
    access_token: accessToken,
    token_expire: expiresAt(expiresIn && !Number.isNaN(expiresIn) ? expiresIn : undefined),
    auth_mode: 'manual',
    status: 'connected',
    shop_id: shopId,
    shop_name: shopName,
    is_mock: 0,
  });
  await audit(env.DB, user.org_id, user, 'channel', 'oauth_manual', `手动录入「${platform}」令牌`);
  return json({ ok: true, message: '令牌已保存（仅存于服务端）' });
}
