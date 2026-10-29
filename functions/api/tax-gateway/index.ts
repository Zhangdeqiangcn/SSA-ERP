// POST /api/tax-gateway/config — 金税系统配置管理
// GET /api/tax-gateway/config — 获取当前配置（脱敏）

import { getUserFromRequest, json } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';

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

  // V3.3.0：KV 绑定缺失时给出可读提示，而不是抛 `Cannot read properties of undefined`
  //   变成原始 500。读路径一直用的是 `env?.TAX_GATEWAY?.get`（安全），
  //   写路径却直接 `env.TAX_GATEWAY.put`——在「KV 尚未绑定」阶段（数电票真实通道
  //   待密钥，见主计划 §七）会直接炸成 500，管理员只能看到一句技术错误。
  if (!env?.TAX_GATEWAY) {
    return json(
      {
        success: false,
        error: '税务网关存储尚未绑定（KV 命名空间 TAX_GATEWAY），暂时无法保存配置。'
          + '启用数电票真实核验需先在部署环境绑定该命名空间并填入服务商密钥。',
        code: 'KV_UNBOUND',
      },
      503,
    );
  }

  await env.TAX_GATEWAY.put('config', JSON.stringify(config), {
    expirationTtl: 86400 * 365, // 1年
  });

  // 审计：税务网关配置变更
  // V3.3.0（评测 L-05 整改）暴露并修复的真实缺陷：
  //   原先直插 (operator, details, ip_address) 三列，而这三列在 audit_logs 表中
  //   并不存在（真实结构见迁移 0039：id/org_id/user_id/user_name/action/entity/
  //   entity_id/summary/created_at/diff）。因此该语句必然报 no such column: operator；
  //   又因为此处没有 try/catch，会造成「KV 已写入成功、接口却返回 500」——
  //   管理员看到保存失败、实际配置已生效，属于典型的「状态与反馈不一致」。
  //   现统一走 writeAudit：列结构由统一入口保证，失败也走降级通道而非炸掉请求。
  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'tax_gateway',
    action: 'tax_config_update',
    summary: `更新税务网关配置：服务商=${provider}，日配额=${dailyQuota || 1000}`,
    diff: {
      provider,
      quota: dailyQuota || 1000,
      ip: request.headers.get('x-forwarded-for') || '',
    },
  });

  return json({ success: true, message: '配置已保存' });
}

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (user.role !== 'admin') return json({ error: '需要管理员权限' }, 403);

  // V3.3.0：与 POST 同理——KV 未绑定时给出可读提示，而非原始 500
  if (!env?.TAX_GATEWAY) {
    return json(
      {
        success: false,
        error: '税务网关存储尚未绑定（KV 命名空间 TAX_GATEWAY），无需清除。',
        code: 'KV_UNBOUND',
      },
      503,
    );
  }

  // 清空前先取原服务商（用于审计摘要，绝不取密钥值）
  const prev = await env?.TAX_GATEWAY?.get('config');
  let prevProvider = '未配置';
  try { prevProvider = prev ? String(JSON.parse(prev).provider || '未配置') : '未配置'; } catch {}
  await env.TAX_GATEWAY.delete('config');
  // SEC-002 收口：清除税务网关配置（含 apiKey/apiSecret）是凭据销毁动作，必须留痕
  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'tax_gateway',
    action: 'tax_config_delete',
    summary: `清除税务网关配置（原服务商=${prevProvider}，含 API 密钥一并删除；密钥值不记录）`,
  });
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
  return btoa(key);
}
