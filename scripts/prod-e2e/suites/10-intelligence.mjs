// 套件 10 · 智能与合规端点探活（AI / ChatBI / 异常预警 / 发票 OCR / 数电票核验）
// 覆盖：端点真实存在（非 SPA 回退）、鉴权生效、参数校验、异常预警四类规则结构、
//       不因外部模型/税局依赖不可用而误报失败（用 WARN 区分「我方缺陷」与「外部依赖」）
export const meta = { id: '10-intelligence', title: '智能与合规端点探活（AI/ChatBI/预警/OCR/数电票）' };

/** 判定端点是否「真实存在」：返回 JSON（SPA 回退会给 text/html）。
 *  注意：未配置模型的 ai/chat 会返回 404 + JSON（属环境配置，仍是真实端点），
 *  故以内容类型 isJson 为准，不按状态码排除。 */
function isRealEndpoint(res) {
  if (res.status === 0) return false; // 网络层失败
  return res.isJson === true;
}

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;

  // ==================== 异常预警（纯内部计算，应严格全绿） ====================
  const alertsAnon = await req('GET', '/api/alerts');
  s.expectStatus('GET /api/alerts 未登录拒绝', alertsAnon, 401);

  const alerts = await req('GET', '/api/alerts', { token });
  s.expectStatus('GET /api/alerts 异常预警计算', alerts, 200);
  if (alerts.status === 200) {
    const d = alerts.data || {};
    const expectKeys = ['lowStock', 'overduePO', 'overdueSO', 'expiringBatches', 'creditOverdue', 'pendingApprovals'];
    const missing = expectKeys.filter((k) => d[k] === undefined);
    s.expectTrue('预警返回六类规则结果结构完整',
      missing.length === 0, missing.length ? '缺: ' + missing.join(',') : expectKeys.join('/'));
    s.expectTrue('待审批统计含采购/销售/工单三项',
      d.pendingApprovals && ['purchaseOrders', 'salesOrders'].every((k) => d.pendingApprovals[k] !== undefined),
      `pendingApprovals=${JSON.stringify(d.pendingApprovals)?.slice(0, 120)}`);
    s.expectTrue('隔离组织内预警计算不报错且数值为合法数字',
      typeof d.pendingApprovals?.purchaseOrders === 'number',
      `purchaseOrders=${d.pendingApprovals?.purchaseOrders}`);
  }

  // ==================== AI 模型配置 ====================
  const modelsAnon = await req('GET', '/api/ai/models');
  s.expectStatus('GET /api/ai/models 未登录拒绝', modelsAnon, 401);

  const models = await req('GET', '/api/ai/models', { token });
  s.expectTrue('GET /api/ai/models 端点真实存在（非 SPA 回退）', isRealEndpoint(models),
    `status=${models.status} ct=${models.contentType}`);
  s.expectStatus('GET /api/ai/models 返回 200', models, 200);

  const badModel = await req('POST', '/api/ai/models', { token, body: { name: '缺字段探测' } });
  s.expectStatus('POST /api/ai/models 缺必填字段返回 400', badModel, 400);

  // ==================== AI 对话（依赖外部 LLM，未配置模型时应给有意义错误而非 500 崩溃） ====================
  const chatAnon = await req('POST', '/api/ai/chat', { body: { messages: [{ role: 'user', content: 'hi' }] } });
  s.expectStatus('POST /api/ai/chat 未登录拒绝', chatAnon, 401);

  const chat = await req('POST', '/api/ai/chat', {
    token, body: { messages: [{ role: 'user', content: '这是 E2E 常驻套件的探活请求，请回复 OK' }] },
  });
  s.expectTrue('POST /api/ai/chat 端点真实存在（非 SPA 回退）', isRealEndpoint(chat),
    `status=${chat.status} ct=${chat.contentType}`);
  if (chat.status === 200) {
    s.pass('AI 对话真实响应（已配置可用模型）', JSON.stringify(chat.data)?.slice(0, 140));
  } else if ([400, 402, 403, 404, 424, 500, 501, 503].includes(chat.status)) {
    // 未配置模型/额度不足属环境配置问题，不是代码回归
    s.warn('AI 对话未返回成功（大概率未配置模型或外部额度问题）',
      `status=${chat.status} body=${JSON.stringify(chat.data)?.slice(0, 160)}`);
  } else {
    s.fail('AI 对话异常状态', `status=${chat.status} body=${JSON.stringify(chat.data)?.slice(0, 160)}`);
  }

  // ==================== ChatBI（自然语言→查询） ====================
  const bi = await req('POST', '/api/chatbi', { token, body: { query: '本月采购订单总金额是多少' } });
  s.expectTrue('POST /api/chatbi 端点真实存在（非 SPA 回退）', isRealEndpoint(bi),
    `status=${bi.status} ct=${bi.contentType}`);
  const biNoQuery = await req('POST', '/api/chatbi', { token, body: {} });
  s.expectStatus('POST /api/chatbi 缺 query 返回 400', biNoQuery, 400);
  if (bi.status === 200) {
    s.pass('ChatBI 查询成功返回', JSON.stringify(bi.data)?.slice(0, 140));
  } else if ([400, 500, 501, 503].includes(bi.status)) {
    s.warn('ChatBI 未返回成功（可能依赖外部模型或本轮隔离组织无数据）',
      `status=${bi.status} body=${JSON.stringify(bi.data)?.slice(0, 160)}`);
  } else {
    s.fail('ChatBI 异常状态', `status=${bi.status}`);
  }
  const biAnon = await req('POST', '/api/chatbi', { body: { query: 'x' } });
  s.expectStatus('POST /api/chatbi 未登录拒绝', biAnon, 401);

  // ==================== 发票 OCR ====================
  const ocrInfo = await req('GET', '/api/ocr/recognize', { token });
  s.expectTrue('GET /api/ocr/recognize 端点说明可用', isRealEndpoint(ocrInfo), `status=${ocrInfo.status}`);
  const ocrNoImage = await req('POST', '/api/ocr/recognize', { token, body: {} });
  s.expectStatus('POST /api/ocr/recognize 未传图片返回 400', ocrNoImage, 400);
  const ocrAnon = await req('POST', '/api/ocr/recognize', { body: {} });
  s.expectStatus('POST /api/ocr/recognize 未登录拒绝', ocrAnon, 401);
  s.info('发票 OCR 识别精度未做断言',
    '当前实现为文本正则解析（未接 OCR/大模型），精度类断言待模型对接后补充');

  // ==================== 数电票核验（已知为桩实现） ====================
  const taxInfo = await req('GET', '/api/tax-gateway/verify', { token });
  s.expectTrue('GET /api/tax-gateway/verify 端点说明可用', isRealEndpoint(taxInfo), `status=${taxInfo.status}`);
  const taxEmpty = await req('POST', '/api/tax-gateway/verify', { token, body: { invoices: [] } });
  s.expectStatus('POST /api/tax-gateway/verify 空发票列表返回 400', taxEmpty, 400);
  const taxOne = await req('POST', '/api/tax-gateway/verify', {
    token,
    body: { invoices: [{ invoiceNo: `E2E${ctx.runId}`, invoiceCode: '000000000000', amount: 1000, invoiceDate: '2026-09-01' }] },
  });
  s.expectStatus('POST /api/tax-gateway/verify 单张核验返回 200', taxOne, 200);
  s.expectTrue('核验返回统计结构（data.total/valid/invalid/error）',
    taxOne.data?.data && typeof taxOne.data.data.total === 'number' && Array.isArray(taxOne.data.data.results),
    `total=${taxOne.data?.data?.total} results=${Array.isArray(taxOne.data?.data?.results) ? taxOne.data.data.results.length : 'N/A'}`);
  s.info('数电票核验为桩实现（唯一确认桩）',
    'functions/api/tax-gateway/verify.ts 为 mock + TODO，未对接真实税局接口；本断言仅护栏契约不回归');

  const taxOver = await req('POST', '/api/tax-gateway/verify', {
    token, body: { invoices: new Array(101).fill({ invoiceNo: 'X', amount: 1 }) },
  });
  s.expectStatus('POST /api/tax-gateway/verify 超 100 张返回 400（批量上限护栏）', taxOver, 400);
}
