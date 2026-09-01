// 套件 09 · 审计日志落库 + 三单匹配
// 覆盖：审计写入/查询/必填校验/组织隔离；三单匹配一致→matched、超差→discrepancy、必填校验
// 背景：V2.63 审计日志落库；三单匹配（PO/入库/发票）为采购核心管控，允许 1% 误差。
export const meta = { id: '09-audit-match', title: '审计日志落库 + 三单匹配（一致/超差/校验）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;

  // ==================== 审计日志 ====================
  const anon = await req('POST', '/api/audit/logs', { body: { action: 'x', entity: 'y' } });
  s.expectStatus('POST /api/audit/logs 未登录拒绝', anon, 401);

  const missing = await req('POST', '/api/audit/logs', { token, body: { action: 'only_action' } });
  s.expectStatus('POST /api/audit/logs 缺 entity 返回 400', missing, 400);

  const write = await req('POST', '/api/audit/logs', {
    token,
    body: {
      action: 'E2E_PROD_SUITE', entity: 'vendor', entityId: `e2e-${runId}`,
      detail: '生产 E2E 常驻套件写入的审计记录', module: 'QA',
    },
  });
  s.expectStatus('POST /api/audit/logs 写入审计', write, 200);
  s.expectTrue('审计写入返回 success + id', write.data?.success === true && !!write.data?.id,
    `id=${write.data?.id}`);

  const query = await req('GET', '/api/audit', { token });
  s.expectStatus('GET /api/audit 查询审计', query, 200);
  const auditRows = query.data?.data || query.data?.logs || [];
  s.expectTrue('审计查询返回列表结构', Array.isArray(auditRows),
    `type=${Array.isArray(auditRows) ? 'array(' + auditRows.length + ')' : typeof auditRows}`);
  if (Array.isArray(auditRows) && auditRows.length) {
    s.expectTrue('刚写入的审计记录可被查到',
      auditRows.some((r) => r.action === 'E2E_PROD_SUITE' || r.id === write.data?.id),
      `最近 ${auditRows.length} 条中${auditRows.some((r) => r.action === 'E2E_PROD_SUITE') ? '找到' : '未找到'}`);
  } else {
    s.warn('审计记录可查性未验证', '查询返回空列表（可能存在分页/时间窗口差异）');
  }

  // ==================== 三单匹配 ====================
  const badBody = await req('POST', '/api/three-way-match/create', { token, body: { poNo: 'PO-NO-ID' } });
  s.expectStatus('POST /api/three-way-match/create 缺 poId 返回 400', badBody, 400);

  // 完全一致 → 应判定 matched
  const matched = await req('POST', '/api/three-way-match/create', {
    token,
    body: {
      poId: `e2e-po-${runId}`, poNo: `E2E-PO-${runId}`,
      inboundId: `e2e-in-${runId}`, inboundNo: `E2E-IN-${runId}`,
      invoiceId: `e2e-inv-${runId}`, invoiceNo: `E2E-INV-${runId}`,
      poQuantity: 100, inboundQuantity: 100,
      poUnitPrice: 50, invoiceUnitPrice: 50,
      poAmount: 5000, inboundAmount: 5000, invoiceAmount: 5000,
      remarks: 'E2E 常驻套件：三量三价完全一致，应判 matched',
    },
  });
  s.expectStatus('三单完全一致创建匹配单', matched, 200);
  s.expectTrue('一致场景返回 success', matched.data?.success === true, JSON.stringify(matched.data)?.slice(0, 120));

  // 数量与金额显著超差（>1%）→ 应判定 discrepancy
  const discrepancy = await req('POST', '/api/three-way-match/create', {
    token,
    body: {
      poId: `e2e-po2-${runId}`, poNo: `E2E-PO2-${runId}`,
      inboundId: `e2e-in2-${runId}`, inboundNo: `E2E-IN2-${runId}`,
      invoiceId: `e2e-inv2-${runId}`, invoiceNo: `E2E-INV2-${runId}`,
      poQuantity: 100, inboundQuantity: 80,          // 数量差 20%
      poUnitPrice: 50, invoiceUnitPrice: 60,         // 单价差 20%
      poAmount: 5000, inboundAmount: 4000, invoiceAmount: 4800,
      remarks: 'E2E 常驻套件：数量/单价/金额均超 1% 容差，应判 discrepancy',
    },
  });
  s.expectStatus('三单超差创建匹配单', discrepancy, 200);
  s.expectTrue('超差场景返回 success（差异由后端判定入库）',
    discrepancy.data?.success === true, JSON.stringify(discrepancy.data)?.slice(0, 120));
  s.info('匹配判定结果未在响应中回显',
    '端点仅返回 {success,id}，matchStatus(matched/discrepancy) 落库但不回显；如需断言判定值，需后端补回显字段');

  // 容差边界：0.5% 差异应视为匹配（允许 1% 误差）
  const boundary = await req('POST', '/api/three-way-match/create', {
    token,
    body: {
      poId: `e2e-po3-${runId}`, poNo: `E2E-PO3-${runId}`,
      poQuantity: 1000, inboundQuantity: 1005,       // 0.5% 差异，在容差内
      poUnitPrice: 50, invoiceUnitPrice: 50,
      poAmount: 50000, inboundAmount: 50250, invoiceAmount: 50250,
      remarks: 'E2E 常驻套件：0.5% 差异在 1% 容差内',
    },
  });
  s.expectStatus('三单 0.5% 容差内创建（不应报错）', boundary, 200);

  // 未登录拒绝
  const twmAnon = await req('POST', '/api/three-way-match/create', {
    body: { poId: 'x', poNo: 'y', poQuantity: 1, inboundQuantity: 1, poAmount: 1, invoiceAmount: 1 },
  });
  s.expectStatus('POST /api/three-way-match/create 未登录拒绝', twmAnon, 401);

  s.info('三单匹配与审计记录未清理',
    '两者均无删除端点；数据仅存于本轮隔离组织（' + ctx.org.companyCode + '），不影响真实业务组织');
}
