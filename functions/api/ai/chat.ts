// POST /api/ai/chat — AI对话接口
import { getUserFromRequest, json } from '../../_shared/auth';
// V3.5.0 B6：补齐写审计。本端点不写业务表，但它会把用户输入**发往公司外部**的
//   大模型服务 —— 属于「数据出境」行为，从合规角度必须能回答
//   「谁在什么时候把哪些内容发到了哪个服务商」。故只记元信息，不记对话内容本身
//   （对话内容可能含商业敏感信息，把它抄进审计表等于又泄露一次）。
import { writeAudit } from '../../_shared/auditLog';

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

    const data: any = await response.json();

    // B6 审计：记录「谁把多少内容发给了哪个模型」。刻意不记录对话正文与模型回复 ——
    //   审计表的读者范围大于一次对话，把正文抄进去会造成二次扩散。
    //   需要的是可追溯的元信息：发起人、服务商、模型、消息条数、字符总量。
    const inputChars = apiMessages.reduce(
      (n: number, m: any) => n + String(m.content ?? '').length, 0);
    await writeAudit(env.DB, {
      orgId: user.org_id ?? null,
      actor: { id: user.id, name: user.name || user.username },
      entity: 'ai_chat',
      entityId: config.modelId || 'unknown',
      action: 'invoke',
      summary:
        `调用大模型（服务商：${config.provider || '-'}；模型：${config.modelId || '-'}）：` +
        `发出 ${apiMessages.length} 条消息、约 ${inputChars} 字` +
        `（提示：内容已发往公司外部服务，审计仅记录元信息，不记录对话正文）`,
    });

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
      { id: 'agnes', name: 'Agnes AI', examples: ['agnes-2.5-flash'] },
      { id: 'custom', name: '自定义', examples: [] },
    ],
  });
}
