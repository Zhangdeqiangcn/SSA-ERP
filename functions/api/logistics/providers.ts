// 物流面单 · 承运商列表（GET /api/logistics/providers）
// 与前端 PROVIDER_LABELS 镜像；isConfigured 由 channel_credentials 是否含该平台非空令牌动态判定（诚实反映真实对接状态）。
import { getUserFromRequest, json } from '../../_shared/auth';

const CODES: { code: string; label: string }[] = [
  { code: 'douyin', label: '抖音电子面单' },
  { code: 'pinduoduo', label: '拼多多电子面单' },
  { code: 'kdniao', label: '快递鸟（聚合）' },
];

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const rows: any =
    (await env.DB
      .prepare(`SELECT platform, access_token FROM channel_credentials WHERE org_id = ?`)
      .bind(user.org_id)
      .all()) || {};
  const credMap = new Map((rows.results || []).map((r: any) => [r.platform, !!r.access_token]));

  const data = CODES.map((c) => ({
    code: c.code,
    label: c.label,
    isConfigured: credMap.get(c.code) || false,
  }));
  return json({ data });
}
