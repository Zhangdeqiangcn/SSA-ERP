// AI模型配置管理API
import { getUserFromRequest, json } from '../../_shared/auth';

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
  return json({ success: true });
}
