// 断开连接：清除令牌并置为未连接（保留应用密钥，便于重新授权）
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { audit } from '../../../_shared/auditLog';
import { getProvider } from '../../../_shared/channelOAuth';

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

  await env.DB.prepare(
    `UPDATE channel_credentials
     SET access_token = NULL, refresh_token = NULL, status = 'disconnected',
         token_expire = NULL, shop_id = NULL, shop_name = NULL, is_mock = 0, updated_at = ?
     WHERE org_id = ? AND platform = ?`
  )
    .bind(new Date().toISOString(), user.org_id, platform)
    .run();

  await audit(env.DB, user.org_id, user, 'channel', 'oauth_disconnect', `断开「${platform}」连接`);

  // 同步清掉订单中台里该平台的待处理数据绑定（可选）：此处仅标记连接断开
  return json({ ok: true, message: '已断开连接（应用密钥保留，可重新授权）' });
}
