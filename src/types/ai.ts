// AI大模型配置类型定义
export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  default?: boolean;
}

export type AIProvider = 'openai' | 'azure' | 'anthropic' | 'deepseek' | 'zhipu' | 'moonshot' | 'siliconflow' | 'custom';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  success: boolean;
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}

// 预置厂商配置模板
export const AI_PROVIDER_TEMPLATES: Record<AIProvider, { name: string; baseUrl: string; examples: string[] }> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    examples: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: 'https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT',
    examples: ['gpt-4', 'gpt-35-turbo'],
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    examples: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    examples: ['deepseek-chat', 'deepseek-coder'],
  },
  zhipu: {
    name: '智谱AI GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    examples: ['glm-4-plus', 'glm-4', 'glm-3-turbo'],
  },
  moonshot: {
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    examples: ['kimi-k1.5', 'kimi-k2-turbo-preview'],
  },
  siliconflow: {
    name: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    examples: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
  },
  custom: {
    name: '自定义 OpenAI 兼容',
    baseUrl: '',
    examples: [],
  },
};

// 推荐模型列表（按厂商分类）
export const RECOMMENDED_MODELS = [
  { provider: 'openai', model: 'gpt-4o', name: 'GPT-4o', desc: '最新多模态模型，速度快' },
  { provider: 'openai', model: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: '推理能力强，支持长上下文' },
  { provider: 'deepseek', model: 'deepseek-chat', name: 'DeepSeek Chat', desc: '国产优秀模型，性价比高' },
  { provider: 'deepseek', model: 'deepseek-coder', name: 'DeepSeek Coder', desc: '代码生成专精' },
  { provider: 'zhipu', model: 'glm-4-plus', name: 'GLM-4 Plus', desc: '智谱旗舰模型' },
  { provider: 'zhipu', model: 'glm-4', name: 'GLM-4', desc: '智谱最新模型' },
  { provider: 'moonshot', model: 'kimi-k2-turbo-preview', name: 'Kimi K2 Turbo', desc: '长文本理解强' },
  { provider: 'siliconflow', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', desc: '硅基聚合，选择丰富' },
];

// 系统提示词模板（ERP场景）
export const ERP_SYSTEM_PROMPT = `你是一名专业的企业资源管理(ERP)系统AI助手。你的职责是：
1. 回答用户关于ERP系统的操作问题
2. 帮助查询库存、订单、财务等数据
3. 指导用户完成业务操作流程
4. 提供数据分析和建议

请根据用户的实际问题，结合以下模块信息给出专业回答：
- 物料管理：库存查询、物料主数据
- 采购管理：采购订单、入库、供应商
- 销售管理：销售订单、客户、发货
- 生产管理：工单、BOM、排产
- 财务管理：凭证、应收应付、报表

回答要求：简洁明了，专业准确，必要时提供具体操作步骤。`;
