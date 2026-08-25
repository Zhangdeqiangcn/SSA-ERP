// POST /api/tax-gateway/config — 金税系统配置管理
// GET /api/tax-gateway/config — 获取当前配置（脱敏）

import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (user.role !== 'admin') return json({ error: '需要管理员权限' }, 403);

  const config = await env?.TAX_GATEWAY?.get('config');
  if (!config) return json({ success: true, data: null, message: '未配置' });

  // 脱敏返回
  const parsed = JSON.parse(config);
  return json({
    success: true,
    data: {
      provider: parsed.provider || 'manual',
      providerName: getProviderName(parsed.provider),
      apiKey: parsed.apiKey ? parsed.apiKey.slice(0, 6) + '****' : '',
      hasSecret: !!parsed.apiSecret,
      dailyQuota: parsed.dailyQuota || 0,
      usedToday: parsed.usedToday || 0,
      lastCheckAt: parsed.lastCheckAt,
    },
  });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (user.role !== 'admin') return json({ error: '需要管理员权限' }, 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: '请求体格式错误' }, 400);
  }

  const { provider, apiKey, apiSecret, dailyQuota } = body;

  if (!['etoplive', 'lskj', 'manual'].includes(provider)) {
    return json({ success: false, error: '不支持的查验服务' }, 400);
  }

  // 保存配置（密钥加密存储）
  const config = {
    provider,
    apiKey: encryptApiKey(apiKey || ''),
    apiSecret: apiSecret ? encryptApiKey(apiSecret) : '',
    dailyQuota: dailyQuota || 1000,
    usedToday: 0,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id,
  };

  await env.TAX_GATEWAY.put('config', JSON.stringify(config), {
    expirationTtl: 86400 * 365, // 1年
  });

  // 记录审计
  await env.DB.prepare(
    `INSERT INTO audit_logs (org_id, action, entity, operator, details, ip_address)
     VALUES (?, 'tax_config_update', 'tax_gateway', ?, ?, ?)`
  ).bind(
    user.org_id,
    user.id,
    JSON.stringify({ provider, quota: dailyQuota }),
    request.headers.get('x-forwarded-for') || ''
  ).run();

  return json({ success: true, message: '配置已保存' });
}

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (user.role !== 'admin') return json({ error: '需要管理员权限' }, 403);

  await env.TAX_GATEWAY.delete('config');
  return json({ success: true, message: '配置已清除' });
}

// GET /api/tax-gateway/quota — 查询今日配额
export async function onRequestQuota(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const config = await env?.TAX_GATEWAY?.get('config');
  if (!config) return json({ success: false, error: '未配置金税网关' });

  const parsed = JSON.parse(config);
  return json({
    success: true,
    data: {
      provider: parsed.provider,
      dailyQuota: parsed.dailyQuota || 1000,
      usedToday: parsed.usedToday || 0,
      remaining: (parsed.dailyQuota || 1000) - (parsed.usedToday || 0),
      lastCheckAt: parsed.lastCheckAt,
    },
  });
}

function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    etoplive: '易通发票查验',
    lskj: '乐税科技',
    manual: '手动模式（无API）',
  };
  return names[provider] || provider;
}

// 简单混淆（生产环境应使用真正加密）
function encryptApiKey(key: string): string {
  if (!key) return '';
  // 实际应使用 AES-256 加密，这里仅作演示
  return Buffer.from(key).toString('base64');
}
