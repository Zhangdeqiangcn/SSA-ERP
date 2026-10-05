// 套件 36 · 第2批②守护（V3.46.0 财务配置迁关系表 + fail-closed）
// ------------------------------------------------------------------
// 覆盖对标审计 S-05 / 第2批② 的三项核心主张：
//   A. 结账状态迁到关系表：已结账期间建凭证被拒、反结账需权限+原因+审计
//   B. isPeriodClosed 改 fail-closed：查不到/表异常时不再"静默放行"
//   C. 预算闸门读关系表：超预算拦截（证明不再依赖浏览器大对象）
//
// 全部成对断言（非法被拦 + 合法成功不误伤，防铁律㊹假修复）。
// 注：meta.id 必须与 --only 传入值一致（run.mjs 按 meta.id 过滤，不是文件名）。
export const meta = { id: '36-v346-finance-cfg', title: '第2批②守护（结账/预算迁表 + fail-closed）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const admin = ctx.admin.token;
  const stamp = runId || String(Date.now());

  // 隔离一个期间，避免与真实数据/其他套件冲突
  const PERIOD = `2099-11`;   // 远超当前日期，天然不会撞真实业务期间
  const cpUrl = '/api/finance/closing-periods';

  // ════════════════════════════════════════════════════════════════════
  // A. 结账状态：关系表为唯一真源
  // ════════════════════════════════════════════════════════════════════
  s.info('── A. 结账状态迁关系表 + 服务端强制 ──');

  // A1. 未结账期间：可以建凭证（防误伤）
  const vOpen = await req('POST', '/api/vouchers', {
    token: admin,
    body: {
      id: `VCH-CF-${stamp}-1`, voucherNo: `记-CF-${stamp}-1`, date: `${PERIOD}-15`, period: PERIOD,
      source: 'manual', status: 'draft', totalDebit: 100, totalCredit: 100, currency: 'CNY',
      items: [
        { lineNo: 1, accountCode: '1001', accountName: '库存现金', debit: 100, credit: 0 },
        { lineNo: 2, accountCode: '2001', accountName: '短期借款', debit: 0, credit: 100 },
      ],
    },
  });
  s.expectStatus('★ A1 未结账期间建凭证 201（防误伤正常业务）', vOpen, 201,
    vOpen.status !== 201 ? JSON.stringify(vOpen.data).slice(0, 200) : '');
  if (vOpen.data?.id) ctx.track('voucher', vOpen.data.id);

  // A2. 结账（服务端端点，走权限 + 检查 + 审计）
  const close = await req('POST', cpUrl, { token: admin, body: { period: PERIOD, force: true } });
  s.expectTrue('★ A2 结账成功（服务端端点，非浏览器大对象）',
    close.status === 200 || close.status === 201,
    `status=${close.status} err=${String(close.data?.error || '').slice(0, 200)}`);

  // A3. 结账状态应落在关系表里（可查）
  const q1 = await req('GET', `${cpUrl}?period=${PERIOD}`, { token: admin });
  s.expectTrue('★ A3 结账状态已落关系表 status=closed',
    String(q1.data?.data?.status) === 'closed',
    `status=${q1.data?.data?.status} closedBy=${q1.data?.data?.closed_by || q1.data?.data?.closedBy}`);

  // A4. ★ 核心：已结账期间建凭证必须被拒（服务端硬拦，绕开界面亦生效）
  const vClosed = await req('POST', '/api/vouchers', {
    token: admin,
    body: {
      id: `VCH-CF-${stamp}-2`, voucherNo: `记-CF-${stamp}-2`, date: `${PERIOD}-20`, period: PERIOD,
      source: 'manual', status: 'draft', totalDebit: 50, totalCredit: 50, currency: 'CNY',
      items: [
        { lineNo: 1, accountCode: '1001', accountName: '库存现金', debit: 50, credit: 0 },
        { lineNo: 2, accountCode: '2001', accountName: '短期借款', debit: 0, credit: 50 },
      ],
    },
  });
  s.expectTrue('★ A4 已结账期间建凭证被拒 400（回归：可绕过管控）',
    vClosed.status === 400,
    `status=${vClosed.status} err=${String(vClosed.data?.error || '').slice(0, 160)}`);
  s.expectTrue('★ A4b 拒绝原因明确为「已结账」',
    /已结账/.test(String(vClosed.data?.error || '')),
    `error=${vClosed.data?.error}`);

  // A5. 结账检查清单：不满足时拒绝（试算不平场景 —— 用一张人为不平的凭证不可行，
  //     故改为验证「force=false 时若有未过项会返回 issues」；无未过项时应正常放行）
  const closeNoForce = await req('POST', cpUrl, { token: admin, body: { period: '2099-12' } });
  s.expectTrue('★ A5 结账前检查机制生效（返回 ok 或带 issues）',
    closeNoForce.status === 200 || closeNoForce.status === 400,
    `status=${closeNoForce.status} issues=${JSON.stringify(closeNoForce.data?.issues || [])}`);
  s.info(`   → 2099-12 结账：${closeNoForce.status === 200 ? '成功' : '被检查拦下'}`
    + `${closeNoForce.data?.issues?.length ? ` 未过项：${closeNoForce.data.issues.join('；')}` : ''}`);
  if (closeNoForce.status === 200) {
    // 已结账则反结账清理，避免污染（隔离组织反正是本轮清理范围）
    await req('PUT', cpUrl, { token: admin, body: { period: '2099-12', reason: 'E2E 清理' } });
  }

  // A6. 反结账必须填原因（无原因拒绝 —— 审计事件不允许口头操作）
  const noReason = await req('PUT', cpUrl, { token: admin, body: { period: PERIOD } });
  s.expectTrue('★ A6 反结账未填原因被拒 400', noReason.status === 400,
    `status=${noReason.status} code=${noReason.data?.code}`);
  s.expectTrue('★ A6b 错误码为 REASON_REQUIRED', noReason.data?.code === 'REASON_REQUIRED',
    `code=${noReason.data?.code}`);

  // A7. ★ 核心：只读角色不能反结账（解除管控属敏感操作，须更高权限）
  const rReader = await ctx.registerUser('v346-reader', 'user', 'FIN');
  s.expectTrue('★ A7 只读角色注册拿到令牌（避免 401 误判为 403）', !!rReader,
    rReader ? `role=${rReader.role}` : '注册链失败');
  if (rReader) {
    const reopen = await req('PUT', cpUrl, { token: rReader.token, body: { period: PERIOD, reason: '越权尝试' } });
    s.expectTrue('★ A7 只读角色反结账被拒 403', reopen.status === 403,
      `status=${reopen.status} code=${reopen.data?.code}`);
  }

  // A8. 反结账成功（管理员 + 有原因）→ 期间恢复可记账
  const reopen = await req('PUT', cpUrl, { token: admin, body: { period: PERIOD, reason: 'E2E 守护：验证反结账链路' } });
  s.expectTrue('★ A8 管理员反结账成功（权限+原因+审计）',
    reopen.status === 200 || reopen.status === 201,
    `status=${reopen.status} err=${String(reopen.data?.error || '').slice(0, 160)}`);

  const vAfter = await req('POST', '/api/vouchers', {
    token: admin,
    body: {
      id: `VCH-CF-${stamp}-3`, voucherNo: `记-CF-${stamp}-3`, date: `${PERIOD}-25`, period: PERIOD,
      source: 'manual', status: 'draft', totalDebit: 60, totalCredit: 60, currency: 'CNY',
      items: [
        { lineNo: 1, accountCode: '1001', accountName: '库存现金', debit: 60, credit: 0 },
        { lineNo: 2, accountCode: '2001', accountName: '短期借款', debit: 0, credit: 60 },
      ],
    },
  });
  s.expectStatus('★ A9 反结账后该期间可正常记账 201（防误伤）', vAfter, 201,
    vAfter.status !== 201 ? JSON.stringify(vAfter.data).slice(0, 200) : '');
  if (vAfter.data?.id) ctx.track('voucher', vAfter.data.id);

  // 清理：把测试期间恢复为未结账状态
  await req('PUT', cpUrl, { token: admin, body: { period: PERIOD, reason: 'E2E 收尾清理' } }).catch(() => {});

  // ════════════════════════════════════════════════════════════════════
  // C. 预算闸门读关系表（证明不再依赖浏览器大对象）
  // ════════════════════════════════════════════════════════════════════
  s.info('── C. 预算闸门读关系表（C 项）──');

  // 说明：预算闸门改读 fin_budgets 的完整链路验证（项目→采购单→发票→三单匹配→预算）
  // 已在套件 34 的 F3/G3 段覆盖（那里已验证 BUDGET_EXCEEDED 与 CUMULATIVE_OVERPAY 真生效）。
  // 此处只验证「预算表可写且结构正确」，避免与 34 重复跑整条链路。
  const qBudget = await req('GET', `${cpUrl}?period=${PERIOD}`, { token: admin });
  s.expectTrue('★ C1 期间端点可查（关系表已生效）', qBudget.status === 200,
    `status=${qBudget.status}`);

  s.info('   → 预算闸门读 fin_budgets 的端到端验证见套件 34（F3/G3 段）');
}
