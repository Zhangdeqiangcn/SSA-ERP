// POST /api/ai/chat — AI对话接口
import { getUserFromRequest, json } from '../../_shared/auth';

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

  const { messages, modelId, systemPrompt } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return json({ success: false, error: '消息不能为空' }, 400);
  }

  // 读取模型配置（从KV存储）
  const modelKey = `ai_model_${modelId || 'default'}`;
  const modelConfig = await env.AI_MODELS?.get(modelKey);
  
  if (!modelConfig) {
    return json({ 
      success: false, 
      error: '模型配置未找到，请先在设置中配置AI模型' 
    }, 404);
  }

  let config: any;
  try {
    config = JSON.parse(modelConfig);
  } catch {
    return json({ success: false, error: '模型配置格式错误' }, 500);
  }

  // 构建请求体（兼容OpenAI格式）
  const apiMessages = [
    { role: 'system', content: systemPrompt || '你是一名专业的ERP系统AI助手。' },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    // 调用上游API
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return json({ 
        success: false, 
        error: `API请求失败: ${response.status} - ${errText}` 
      }, response.status);
    }

    const data = await response.json();
    
    return json({
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
      model: config.modelId,
    });
  } catch (error: any) {
    return json({ 
      success: false, 
      error: error.message || '请求失败' 
    }, 500);
  }
}

// GET 返回可用模型列表（不含密钥）
export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ success: false, error: '未登录' }, 401);

  // 返回预置模板信息
  return json({
    success: true,
    providers: [
      { id: 'openai', name: 'OpenAI', examples: ['gpt-4o', 'gpt-4-turbo'] },
      { id: 'deepseek', name: 'DeepSeek', examples: ['deepseek-chat', 'deepseek-coder'] },
      { id: 'zhipu', name: '智谱AI', examples: ['glm-4-plus', 'glm-4'] },
      { id: 'moonshot', name: 'Kimi', examples: ['kimi-k2-turbo-preview'] },
      { id: 'siliconflow', name: 'SiliconFlow', examples: ['deepseek-ai/DeepSeek-V3'] },
      { id: 'custom', name: '自定义', examples: [] },
    ],
  });
}
