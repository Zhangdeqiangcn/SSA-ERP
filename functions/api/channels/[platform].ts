// 渠道通道（动态路由 /api/channels/<platform>）
// POST { action: 'pull' | 'inventory' | 'logistics', ... } —— 拉单 / 推库存 / 回写物流
// 平台密钥（AppKey/AppSecret/access_token）只在后端持有，前端经 SSA 自有接口调用，绝不暴露。
import { getUserFromRequest, json } from '../../_shared/auth';
import { audit } from '../../_shared/auditLog';

interface ChannelCreds {
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
}

// 读取渠道凭证（存 channel_credentials 表；生产建议改用 Cloudflare Secrets 或加密列）
async function getChannelCreds(DB: any, orgId: string, platform: string): Promise<ChannelCreds | null> {
  const row = await DB.prepare(
    'SELECT app_key, app_secret, access_token FROM channel_credentials WHERE org_id = ? AND platform = ? LIMIT 1'
  )
    .bind(orgId, platform)
    .first();
  if (!row) return null;
  return { appKey: row.app_key, appSecret: row.app_secret, accessToken: row.access_token };
}

// 真实拉单：需调用平台开放接口（OAuth + 签名）。密钥从 creds 取，绝不落前端。
// 当前无真实密钥时返回空数组（诚实降级，不造数据、不静默假成功）。
// TODO(P1-4): 接入各平台开放平台 SDK/接口
//   抖音: https://open.douyin.com  order 查询接口
//   拼多多: pdd.order.list.get / pdd.waybill 物流回写
async function fetchPlatformOrders(_platform: string, _creds: ChannelCreds, _params: any): Promise<any[]> {
  return [];
}

async function pushPlatformInventory(_platform: string, _creds: ChannelCreds, _items: any[]): Promise<{ success: boolean; message?: string }> {
  // TODO(P1-4): 调用平台库存更新接口
  return { success: true, message: '库存推送接口待接入（凭证就绪后生效）' };
}

async function pushPlatformLogistics(_platform: string, _creds: ChannelCreds, _input: any): Promise<{ success: boolean; message?: string }> {
  // TODO(P1-4): 调用平台物流回写/电子面单接口
  return { success: true, message: '物流回写接口待接入（凭证就绪后生效）' };
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const platform = context.params?.platform;
  if (!platform) return json({ error: '缺少平台参数' }, 400);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const action = body?.action;

  const creds = await getChannelCreds(env.DB, user.org_id, platform);
  if (!creds) {
    return json(
      { success: false, message: `未配置「${platform}」渠道凭证，请先在渠道设置中录入 AppKey/AppSecret` },
      400
    );
  }

  let result: any;
  try {
    if (action === 'pull') result = { data: await fetchPlatformOrders(platform, creds, body) };
    else if (action === 'inventory') result = await pushPlatformInventory(platform, creds, body.items || []);
    else if (action === 'logistics') result = await pushPlatformLogistics(platform, creds, body);
    else return json({ success: false, message: `未知 action: ${action}` }, 400);
  } catch (e: any) {
    await audit(env.DB, user.org_id, user, 'channel', 'sync_failed', `渠道 ${platform} ${action} 失败：${String(e?.message || e)}`);
    return json({ success: false, message: `渠道调用失败：${String(e?.message || e)}` }, 502);
  }

  await audit(env.DB, user.org_id, user, 'channel', 'sync', `渠道 ${platform} ${action} 成功`);
  return json({ success: true, ...result });
}
