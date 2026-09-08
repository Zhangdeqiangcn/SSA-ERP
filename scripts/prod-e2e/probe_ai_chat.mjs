#!/usr/bin/env node
// 生产探针：验证 C6 大模型助手经默认模型 Agnes 2.5 Flash 真实可用。
// 复刻现有生产探针登录模式（隔离组织注册拿 token），验证：
//   GET  /api/ai/models  → 默认模型为 Agnes 2.5 Flash
//   POST /api/ai/chat    → 真实返回非空回复（坐实接通）
import { createClient } from './lib/http.mjs';

const BASE = process.env.PROD_E2E_BASE || 'https://a62244cb.ssa-erp.pages.dev';
const req = createClient(BASE, { timeout: 30000 });
const runId = Date.now();

function assert(cond, name, detail) {
  console.log(`${cond ? '  ✅' : '  ❌'} ${name}${detail ? ' — ' + detail : ''}`);
  return cond;
}

async function bootstrap() {
  const reg = await req('POST', '/api/auth/register', {
    body: {
      username: `e2e_ai_${runId}`, password: 'E2eProd!2026', name: 'E2E AI 探针',
      companyCode: `E2EAI-${runId}`, role: 'admin', department: 'QA',
      orgName: `E2E AI 探针 ${runId}`,
    },
  });
  if (reg.status !== 200 || !reg.data?.token) {
    console.error('❌ bootstrap 注册失败', reg.status, JSON.stringify(reg.data)?.slice(0, 200));
    process.exit(2);
  }
  return reg.data.token;
}

async function main() {
  console.log(`\n▶ C6 大模型助手聊天探针：BASE=${BASE} runId=${runId}`);
  const token = await bootstrap();
  console.log('  ✅ 注册隔离组织拿到 token');
  let ok = true;

  // 1) 默认模型应为 Agnes 2.5 Flash
  const models = await req('GET', '/api/ai/models', { token });
  ok = assert(models.status === 200 && Array.isArray(models.data?.models), 'GET /api/ai/models 列表', `status=${models.status}`) && ok;
  const def = (models.data?.models || []).find((m) => m.default);
  ok = assert(!!def && def.provider === 'agnes' && def.modelId === 'agnes-2.5-flash',
    '默认模型为 Agnes 2.5 Flash', `default=${JSON.stringify(def && { provider: def.provider, modelId: def.modelId })}`) && ok;

  // 2) 真实聊天，断言 Agnes 返回非空回复
  const chat = await req('POST', '/api/ai/chat', {
    token,
    body: { messages: [{ role: 'user', content: '用一句话说明什么是企业资源计划（ERP）' }] },
  });
  ok = assert(chat.status === 200, 'POST /api/ai/chat 返回 200', `status=${chat.status}`) && ok;
  ok = assert(chat.data?.success === true, 'chat 返回 success=true', `success=${chat.data?.success}`) && ok;
  const content = chat.data?.content || '';
  ok = assert(content.length > 0, 'Agnes 返回非空回复', `len=${content.length}`) && ok;
  if (content) console.log(`  ℹ️ Agnes 回复片段：${content.slice(0, 100)}`);

  console.log(`\n结论：${ok ? '✅ C6 大模型助手接通成功（默认 Agnes 2.5 Flash，聊天链路真实返回）' : '❌ 存在失败断言'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('探针异常', e); process.exit(2); });
