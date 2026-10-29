// AI模型配置管理API
import { getUserFromRequest, json } from '../../_shared/auth';
// V3.5.0 B6：补齐写审计（模型配置含密钥与对外地址，属于 AI 出海口）
import { writeAudit } from '../../_shared/auditLog';

// 读取所有模型配置
async function getAllModels(env: any) {
  const models: any[] = [];
  const prefix = 'ai_model_';
  
  // KV list 功能需要 Wrangler，这里使用循环读取
  // 实际生产环境应该用 KV list API
  const defaultKeys = ['default'];
  for (const key of defaultKeys) {
    const value = await env.AI_MODELS?.get(`${prefix}${key}`);
    if (value) {
      try {
        models.push(JSON.parse(value));
      } catch {}
    }
  }
  
  return models;
}

// GET /api/ai/models — 获取模型列表（脱敏）
export async function onRequestGet(context: any) {
  const { env } = context;
  const user = await getUserFromRequest(context.request, env.DB);
  if (!user) return json({ success: false, error: '未登录' }, 401);

  const models = await getAllModels(env);
  
  // 返回脱敏后的列表
  return json({
    success: true,
    models: models.map((m: any) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      baseUrl: m.baseUrl,
      modelId: m.modelId,
      default: m.default,
      // 不返回 apiKey
    })),
  });
}

// POST /api/ai/models — 保存模型配置
export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ success: false, error: '未登录' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: '请求格式错误' }, 400);
  }

  const { id, name, provider, baseUrl, apiKey, modelId, default: isDefault } = body;

  if (!id || !name || !provider || !modelId) {
    return json({ success: false, error: '缺少必要字段' }, 400);
  }

  const config = {
    id,
    name,
    provider,
    baseUrl: baseUrl || '',
    apiKey: apiKey || '',
    modelId,
    default: isDefault || false,
    updatedAt: new Date().toISOString(),
  };

  // 保存到 KV
  await env.AI_MODELS?.put(`ai_model_${id}`, JSON.stringify(config));

  // 如果设为默认，清除其他默认标记
  if (isDefault) {
    const models = await getAllModels(env);
    for (const m of models) {
      if (m.id !== id) {
        m.default = false;
        await env.AI_MODELS?.put(`ai_model_${m.id}`, JSON.stringify(m));
      }
    }
  }

  // B6 审计：模型配置里含 API 密钥与接口地址 —— 改错会导致 AI 功能整体不可用，
  //   改对也可能被用来把公司数据的请求转发到非预期地址。密钥值绝不进审计，
  //   只记「是否设置过密钥」，这样既留痕又不把审计表变成第二份密钥库。
  await writeAudit(env.DB, {
    orgId: user.org_id ?? null,
    actor: { id: user.id, name: user.name || user.username },
    entity: 'ai_models',
    entityId: id,
    action: 'create',
    summary:
      `保存大模型配置「${name}」（服务商：${provider}；模型：${modelId}）` +
      (baseUrl ? `（接口地址：${baseUrl}）` : '（接口地址：使用服务商默认）') +
      (apiKey ? '（已设置密钥，值不予记录）' : '（未设置密钥）') +
      (isDefault ? '【已设为默认模型】' : ''),
  });

  return json({ success: true, id });
}

// PUT /api/ai/models/:id — 更新模型配置
export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ success: false, error: '未登录' }, 401);

  const id = params.id;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: '请求格式错误' }, 400);
  }

  const existing = await env.AI_MODELS?.get(`ai_model_${id}`);
  if (!existing) {
    return json({ success: false, error: '模型不存在' }, 404);
  }

  const config = JSON.parse(existing);
  const updated = {
    ...config,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await env.AI_MODELS?.put(`ai_model_${id}`, JSON.stringify(updated));

  // B6 审计：更新模型配置同样属于「改变 AI 出口」的动作。摘要只列被改动的字段名
  //   （值可能是密钥，不能写），这样既知道改了什么，又不泄露密钥。
  await writeAudit(env.DB, {
    orgId: user.org_id ?? null,
    actor: { id: user.id, name: user.name || user.username },
    entity: 'ai_models',
    entityId: id,
    action: 'update',
    summary:
      `更新大模型配置「${config.name || id}」（改动字段：${Object.keys(body).join('、') || '无'}）` +
      (Object.prototype.hasOwnProperty.call(body, 'apiKey') ? '（含密钥变更，值不予记录）' : '') +
      (body.default === true ? '【已设为默认模型】' : ''),
  });

  return json({ success: true, id });
}

// DELETE /api/ai/models/:id — 删除模型
export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ success: false, error: '未登录' }, 401);

  const id = params.id;
  
  // 不能删除默认配置
  if (id === 'default') {
    return json({ success: false, error: '不能删除默认配置' }, 400);
  }

  const existing = await env.AI_MODELS?.get(`ai_model_${id}`);
  if (!existing) {
    return json({ success: false, error: '模型不存在' }, 404);
  }

  await env.AI_MODELS?.delete(`ai_model_${id}`);

  // B6 审计：删除模型配置会连带清掉绑定的密钥，若删的是在用模型会立刻中断 AI 功能。
  let removed: any = null;
  try { removed = JSON.parse(existing); } catch { removed = null; }
  await writeAudit(env.DB, {
    orgId: user.org_id ?? null,
    actor: { id: user.id, name: user.name || user.username },
    entity: 'ai_models',
    entityId: id,
    action: 'delete',
    summary:
      `删除大模型配置「${removed?.name || id}」` +
      (removed?.provider ? `（服务商：${removed.provider}；模型：${removed.modelId || '-'}）` : '') +
      (removed?.default ? '【注意：被删除的是默认模型，AI 功能将失去默认出口，需重新指定】' : ''),
  });

  return json({ success: true });
}
