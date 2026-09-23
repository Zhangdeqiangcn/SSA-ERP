// 套件 19 · 财务域关系化护栏（V3.8.0 C1 数据关系化第二个域，消费方 33 个）
//
// ── 这个套件防的是什么回潮 ────────────────────────────────────────
// 财务域有 33 个消费方（全项目最多），是 C1 里风险最高的一次搬迁。它有三种
// 「搬过去了但静默少了数据」的失败模式，每一种界面上都看不出来：
//
//  ① **嵌套数组被静默丢弃**（最凶的一种）
//     付款计划带 installments（分期）、项目核算带 costItems（成本明细）。
//     通用实体路由 /api/entities/:resource 的 pickSnake 只挑已登记列，
//     嵌套数组**不会被写入、也不报错，照样返回 201 成功**。
//     → 表现：计划建成功了，进去一看「分期」一栏是空的。
//     本套件用「写进去 N 行、读回来必须还是 N 行」把这条线钉死。
//
//  ② **更新时把子表清空**
//     语义必须是：不传子数组 = 保持原样；传空数组 = 清空。
//     若把「不传」也当清空，改一次付款状态就会删光全部分期 ——
//     而这正是 PaymentPlan 页面点「确认付款」时的真实调用形态。
//
//  ③ **表字段与前端契约对不上，字段被静默丢弃**
//     0053 建表时按「会计常识」推断列名（entry_date/summary/debit/credit），
//     与前端 AccountEntry 的 date/description/debitAccount/creditAccount/amount
//     **一个都对不上**。通用路由挑不到列 → 全丢且不报错。
//     → 表现：分录列表有行数，点开详情摘要、科目、金额全是空。
//     0054 已按前端契约重建这三张表；本套件逐字段比对读回值，
//     只要 0054 没生效（或将来有人改回旧列名），这里立刻变红。
//
// 为什么断言要「POST 之后必须再 GET 一次」：
//   POST 的回执可能只是把请求体原样回显，证明不了真的落到了 D1。
//   只有重新 GET 一次（打在数据库上）才能证明写入生效。
export const meta = { id: '19-finance-domain', title: '财务域关系化护栏（分期/成本明细嵌套往返 + 字段契约 + 全生命周期）' };

const cleanup = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36).toUpperCase();

  // ══════════════════════════════════════════════════════════════
  // 1. 端点可达性与鉴权（漏登记 RLS 会返回空表而不是 200）
  // ══════════════════════════════════════════════════════════════
  for (const [label, path] of [
    ['付款计划', '/api/fin-payment-plans'],
    ['项目核算', '/api/fin-project-accounts'],
    ['会计分录', '/api/entities/finAccountEntry'],
    ['税务记录', '/api/entities/finTaxRecord'],
    ['财务发票', '/api/entities/finInvoice'],
    ['会计科目', '/api/entities/finChartAccount'],
  ]) {
    const r = await req('GET', path, { token });
    const ok = s.expectStatus(`GET ${path} 返回 200（${label} RLS 已登记）`, r, 200,
      r.status === 200 ? `total=${r.data?.total}` : JSON.stringify(r.data).slice(0, 100));
    if (ok) s.expectListShape(`  └ ${label} 列表契约 {data,total,page,pageSize}`, r);
  }

  const anon1 = await req('GET', '/api/fin-payment-plans');
  s.expectStatus('未登录访问付款计划被拒 401', anon1, 401);
  const anon2 = await req('GET', '/api/entities/finAccountEntry');
  s.expectStatus('未登录访问会计分录被拒 401', anon2, 401);

  // ══════════════════════════════════════════════════════════════
  // 2. ★ 付款计划：installments 嵌套数组往返
  // ══════════════════════════════════════════════════════════════
  // ★ V3.19.0 前置：付款闸门要求付款计划关联一张**真实存在**的采购订单。
  //   本套件原先用编造的 `PO-E2E-xxx` 单号，闸门上线后会被 PO_NOT_FOUND 拦下 ——
  //   那不是测试跑坏了，而是闸门确实在工作。
  //   因此这里先建一张真实订单（含明细：100 件 × 100 元 = 不含税 10000 元；
  //   闸门要求订单明细金额大于 0，光有主表金额不算）。
  //   同时给计划带上 advanceAmount（分期里本就含 30% 预付款），
  //   让闸门走「预付款允许无发票」这条正常业务路径，而不是被 NO_INVOICE 拦下。
  const gatePoNo = `PO-FIN-${stamp}`;
  const gatePo = await req('POST', '/api/purchase-orders', {
    token,
    body: {
      orderNo: gatePoNo,
      vendorId: 'vnd-e2e',
      vendorName: 'E2E 验证供应商',
      status: 'draft',
      orderDate: '2026-09-01',
      totalAmount: 10000,
      items: [{
        materialCode: 'M-FIN', materialName: 'E2E 财务域物料', unit: '件',
        orderedQuantity: 100, unitPrice: 100, amount: 10000, amountWithTax: 11300,
      }],
    },
  });
  // 用 ctx.track 而非本套件的局部 cleanup 数组：
  // 局部数组不会经过 harness 的清理通道（跑完只剩「尝试 0 项」），
  // 测试数据会一直留在隔离组织里。track 才会被真正删掉。
  if (gatePo.data?.id) ctx.track('purchase-order', gatePo.data.id);

  const planNo = `PP-E2E-${stamp}`;
  const installments = [
    { id: `ins-${stamp}-1`, seq: 1, type: 'advance', label: '预付款 30%', amount: 3000, dueDate: '2026-09-20', status: 'pending', note: '首期' },
    { id: `ins-${stamp}-2`, seq: 2, type: 'progress', label: '进度款 40%', amount: 4000, dueDate: '2026-10-20', status: 'pending', note: '到货付' },
    { id: `ins-${stamp}-3`, seq: 3, type: 'final', label: '尾款 30%', amount: 3000, dueDate: '2026-11-20', status: 'pending', note: '验收付' },
  ];
  const planBody = {
    id: `plan-e2e-${stamp}`,
    planNo,
    vendorName: 'E2E 验证供应商',
    vendorId: 'vnd-e2e',
    purchaseOrderNo: gatePoNo,
    totalAmount: 10000,
    paidAmount: 0,
    // 分期含 30% 预付款，闸门据此走「预付款允许无发票」路径（见 threeWayMatch.ts 第⑥步）
    advanceAmount: 3000,
    status: 'draft',
    dueDate: '2026-11-20',
    paymentMethod: 'transfer',
    currency: 'CNY',
    exchangeRate: 1,
    installments,
  };

  const pc = await req('POST', '/api/fin-payment-plans', { token, body: planBody });
  const pcOk = s.expectStatus('★ 创建带 3 期分期的付款计划返回 201', pc, 201,
    pc.status !== 201 ? JSON.stringify(pc.data).slice(0, 160) : '');
  if (pcOk) cleanup.push({ path: '/api/fin-payment-plans', id: planBody.id });
  if (pcOk && pc.data) {
    s.expectEq('★ 创建回执：分期数组 3 行（未被静默丢弃）',
      (pc.data.installments || []).length, 3, '分期行数');
  }

  // ★ 必须重新 GET：证明真的落到了 D1，而不是回显请求体
  const pg = await req('GET', `/api/fin-payment-plans/${planBody.id}`, { token });
  const pgOk = s.expectStatus('GET 付款计划单条返回 200', pg, 200);
  if (pgOk && pg.data) {
    const got = pg.data.installments || [];
    s.expectEq('★ 从 D1 读回仍是 3 期（写入未丢行）', got.length, 3, '分期行数');
    const second = got.find((i) => i.seq === 2) || got[1];
    if (second) {
      s.expectEq('  第 2 期金额一致', Number(second.amount), 4000);
      s.expectEq('  第 2 期到期日一致', String(second.dueDate), '2026-10-20');
      s.expectEq('  第 2 期类型一致', String(second.type), 'progress');
      s.expectEq('  第 2 期名称一致', String(second.label), '进度款 40%');
    } else {
      s.fail('  第 2 期分期读回', '未找到 seq=2 的分期行');
    }
    s.expectEq('  父表计划编号一致', String(pg.data.planNo), planNo);
    s.expectEq('  父表供应商一致', String(pg.data.vendorName), 'E2E 验证供应商');
    s.expectEq('  父表总金额一致', Number(pg.data.totalAmount), 10000);
  }

  // ★ 核心防回潮：只改状态、不传 installments，分期一行都不能少
  const pu = await req('PUT', `/api/fin-payment-plans/${planBody.id}`, {
    token, body: { status: 'partial', paidAmount: 3000 },
  });
  s.expectStatus('PUT 只改付款状态返回 200', pu, 200);
  const pg2 = await req('GET', `/api/fin-payment-plans/${planBody.id}`, { token });
  if (pg2.status === 200 && pg2.data) {
    s.expectEq('★ 只改状态后分期仍是 3 行（不传子数组 ≠ 清空）',
      (pg2.data.installments || []).length, 3, '分期行数');
    s.expectEq('  状态已更新为 partial', String(pg2.data.status), 'partial');
    s.expectEq('  未传的供应商字段未被清空', String(pg2.data.vendorName), 'E2E 验证供应商');
  } else {
    s.fail('只改状态后重新读回', `status=${pg2.status}`);
  }

  // 显式传 5 期 = 整体替换
  const five = Array.from({ length: 5 }, (_, i) => ({
    seq: i + 1, type: 'progress', label: `重排第${i + 1}期`, amount: 2000,
    dueDate: '2026-12-01', status: 'pending',
  }));
  const pr = await req('PUT', `/api/fin-payment-plans/${planBody.id}`, { token, body: { installments: five } });
  s.expectStatus('PUT 显式传 5 期返回 200', pr, 200);
  const pg3 = await req('GET', `/api/fin-payment-plans/${planBody.id}`, { token });
  if (pg3.status === 200 && pg3.data) {
    s.expectEq('  显式传数组时按整体替换（5 行）',
      (pg3.data.installments || []).length, 5, '分期行数');
  }

  // 显式传空数组 = 清空
  const pz = await req('PUT', `/api/fin-payment-plans/${planBody.id}`, { token, body: { installments: [] } });
  s.expectStatus('PUT 传空数组返回 200', pz, 200);
  const pg4 = await req('GET', `/api/fin-payment-plans/${planBody.id}`, { token });
  if (pg4.status === 200 && pg4.data) {
    s.expectEq('  传空数组时清空分期（0 行）',
      (pg4.data.installments || []).length, 0, '分期行数');
  }

  // 唯一约束：同组织重复 plan_no 应 409
  const dupPlan = await req('POST', '/api/fin-payment-plans', {
    token, body: { ...planBody, id: `${planBody.id}-dup` },
  });
  s.expectTrue('重复 plan_no 被拒（409 而非静默建第二条）', dupPlan.status === 409,
    `status=${dupPlan.status}`);

  // 删除：必须报告连带删除的分期行数
  const pd = await req('DELETE', `/api/fin-payment-plans/${planBody.id}`, { token });
  s.expectStatus('DELETE 付款计划返回 200', pd, 200);
  const pg5 = await req('GET', `/api/fin-payment-plans/${planBody.id}`, { token });
  s.expectStatus('删除后再查返回 404（确实删掉了）', pg5, 404);
  const idx = cleanup.findIndex((c) => c.id === planBody.id);
  if (idx >= 0) cleanup.splice(idx, 1);

  // ══════════════════════════════════════════════════════════════
  // 3. ★ 项目核算：costItems 嵌套数组往返（第二个嵌套数组）
  // ══════════════════════════════════════════════════════════════
  const accountNo = `PA-E2E-${stamp}`;
  const costItems = [
    { id: `ci-${stamp}-1`, seq: 1, category: 'material', description: '钢材', budgetAmount: 50000, actualAmount: 52000, variance: 2000, variancePercent: 4 },
    { id: `ci-${stamp}-2`, seq: 2, category: 'labor', description: '人工', budgetAmount: 20000, actualAmount: 19000, variance: -1000, variancePercent: -5 },
    { id: `ci-${stamp}-3`, seq: 3, category: 'equipment', description: '设备折旧', budgetAmount: 8000, actualAmount: 8000, variance: 0, variancePercent: 0 },
    { id: `ci-${stamp}-4`, seq: 4, category: 'outsource', description: '外协加工', budgetAmount: 12000, actualAmount: 15000, variance: 3000, variancePercent: 25 },
    { id: `ci-${stamp}-5`, seq: 5, category: 'overhead', description: '制造费用', budgetAmount: 6000, actualAmount: 5800, variance: -200, variancePercent: -3.33 },
  ];
  const paBody = {
    id: `pacc-e2e-${stamp}`,
    accountNo,
    projectId: 'prj-e2e',
    projectNo: `PRJ-E2E-${stamp}`,
    projectName: 'E2E 验证项目',
    customerName: 'E2E 验证客户',
    period: '2026-09',
    totalBudget: 96000,
    totalActual: 99800,
    totalVariance: 3800,
    revenue: 130000,
    grossProfit: 30200,
    grossMargin: 23.2,
    status: 'draft',
    preparedBy: 'E2E',
    remarks: '护栏套件验证用',
    costItems,
  };

  const ac = await req('POST', '/api/fin-project-accounts', { token, body: paBody });
  const acOk = s.expectStatus('★ 创建带 5 条成本明细的项目核算返回 201', ac, 201,
    ac.status !== 201 ? JSON.stringify(ac.data).slice(0, 160) : '');
  if (acOk) cleanup.push({ path: '/api/fin-project-accounts', id: paBody.id });
  if (acOk && ac.data) {
    s.expectEq('★ 创建回执：成本明细 5 行（未被静默丢弃）',
      (ac.data.costItems || []).length, 5, '成本明细行数');
  }

  const ag = await req('GET', `/api/fin-project-accounts/${paBody.id}`, { token });
  const agOk = s.expectStatus('GET 项目核算单条返回 200', ag, 200);
  if (agOk && ag.data) {
    const got = ag.data.costItems || [];
    s.expectEq('★ 从 D1 读回仍是 5 条（写入未丢行）', got.length, 5, '成本明细行数');
    const m = got.find((i) => i.category === 'material');
    if (m) {
      s.expectEq('  材料行预算金额一致', Number(m.budgetAmount), 50000);
      s.expectEq('  材料行实际金额一致', Number(m.actualAmount), 52000);
      s.expectEq('  材料行差异一致', Number(m.variance), 2000);
    } else {
      s.fail('  材料行成本明细读回', '未找到 category=material 的行');
    }
    s.expectEq('  父表核算编号一致', String(ag.data.accountNo), accountNo);
    s.expectEq('  父表项目名一致', String(ag.data.projectName), 'E2E 验证项目');
    s.expectEq('  父表毛利率一致', Number(ag.data.grossMargin), 23.2);
  }

  // 只改状态不清空明细
  const au = await req('PUT', `/api/fin-project-accounts/${paBody.id}`, {
    token, body: { status: 'submitted', approvedBy: 'E2E-审批人' },
  });
  s.expectStatus('PUT 只改审批状态返回 200', au, 200);
  const ag2 = await req('GET', `/api/fin-project-accounts/${paBody.id}`, { token });
  if (ag2.status === 200 && ag2.data) {
    s.expectEq('★ 只改状态后成本明细仍是 5 条',
      (ag2.data.costItems || []).length, 5, '成本明细行数');
    s.expectEq('  状态已更新为 submitted', String(ag2.data.status), 'submitted');
    s.expectEq('  未传的客户名未被清空', String(ag2.data.customerName), 'E2E 验证客户');
  } else {
    s.fail('只改状态后重新读回项目核算', `status=${ag2.status}`);
  }

  const ad = await req('DELETE', `/api/fin-project-accounts/${paBody.id}`, { token });
  s.expectStatus('DELETE 项目核算返回 200', ad, 200);
  if (ad.status === 200) {
    s.expectTrue('  删除回执报告了连带删除的明细行数（≥5）',
      Number(ad.data?.deletedChildren) >= 5,
      `deletedChildren=${ad.data?.deletedChildren}`);
  }
  const ag3 = await req('GET', `/api/fin-project-accounts/${paBody.id}`, { token });
  s.expectStatus('删除后再查返回 404（确实删掉了）', ag3, 404);
  const idx2 = cleanup.findIndex((c) => c.id === paBody.id);
  if (idx2 >= 0) cleanup.splice(idx2, 1);

  // ══════════════════════════════════════════════════════════════
  // 4. ★ 会计分录字段契约（0054 修正的直接验证）
  //    0053 的列是 entry_date/summary/account_code/debit/credit；
  //    若 0054 未生效，下面这些字段一个都读不回来。
  // ══════════════════════════════════════════════════════════════
  const entryBody = {
    id: `ent-e2e-${stamp}`,
    entryNo: `AE-E2E-${stamp}`,
    date: '2026-09-15',
    period: '2026-09',
    description: 'E2E 验证摘要',
    debitAccount: '原材料',
    creditAccount: '应付账款',
    amount: 12345.67,
    currency: 'CNY',
    voucherNo: `VOU-E2E-${stamp}`,
    costCenterId: 'cc-e2e',
    costCenterName: 'E2E 成本中心',
    projectId: 'prj-e2e',
    projectName: 'E2E 项目',
    auxNote: 'E2E 辅助核算备注',
  };
  const ec = await req('POST', '/api/entities/finAccountEntry', { token, body: entryBody });
  const ecOk = s.expectStatus('★ 创建会计分录返回 201（0054 新列可用）', ec, 201,
    ec.status !== 201 ? JSON.stringify(ec.data).slice(0, 160) : '');
  if (ecOk) cleanup.push({ path: '/api/entities/finAccountEntry', id: entryBody.id });

  const eg = await req('GET', `/api/entities/finAccountEntry/${entryBody.id}`, { token });
  const egOk = s.expectStatus('GET 会计分录单条返回 200', eg, 200);
  if (egOk && eg.data) {
    const d = eg.data;
    s.expectEq('★ 读回 date（0053 叫 entry_date，对不上就会是空）', String(d.date), '2026-09-15');
    s.expectEq('★ 读回 description（0053 叫 summary）', String(d.description), 'E2E 验证摘要');
    s.expectEq('★ 读回 debitAccount（0053 叫 account_code）', String(d.debitAccount), '原材料');
    s.expectEq('★ 读回 creditAccount（0053 叫 account_name）', String(d.creditAccount), '应付账款');
    s.expectEq('★ 读回 amount（0053 拆成 debit/credit 两列）', Number(d.amount), 12345.67);
    s.expectEq('  读回 costCenterName', String(d.costCenterName), 'E2E 成本中心');
    s.expectEq('  读回 projectName', String(d.projectName), 'E2E 项目');
    s.expectEq('  读回 auxNote', String(d.auxNote), 'E2E 辅助核算备注');
    s.expectEq('  读回 voucherNo', String(d.voucherNo), `VOU-E2E-${stamp}`);
  }

  // 列表关键字过滤命中（同时验证真的进了表）
  const ek = await req('GET', `/api/entities/finAccountEntry?keyword=${entryBody.entryNo}`, { token });
  if (ek.status === 200) {
    s.expectTrue('  按分录编号过滤命中刚建的分录',
      (ek.data?.data || []).some((r) => r.id === entryBody.id),
      `命中 ${ek.data?.data?.length} 条 total=${ek.data?.total}`);
  } else {
    s.fail('会计分录关键字过滤', `status=${ek.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 5. 税务记录字段契约（0053 缺一半字段：recordNo/periodType/category/…）
  // ══════════════════════════════════════════════════════════════
  const taxBody = {
    id: `tax-e2e-${stamp}`,
    recordNo: `TR-E2E-${stamp}`,
    period: '2026-08',
    periodType: 'monthly',
    category: 'vat',
    taxableAmount: 100000,
    taxRate: 13,
    taxAmount: 13000,
    deductedAmount: 8000,
    actualPayable: 5000,
    paidAmount: 5000,
    paymentDate: '2026-09-15',
    status: 'paid',
    remarks: 'E2E 税务备注',
  };
  const tc = await req('POST', '/api/entities/finTaxRecord', { token, body: taxBody });
  const tcOk = s.expectStatus('★ 创建税务记录返回 201', tc, 201,
    tc.status !== 201 ? JSON.stringify(tc.data).slice(0, 160) : '');
  if (tcOk) cleanup.push({ path: '/api/entities/finTaxRecord', id: taxBody.id });

  const tg = await req('GET', `/api/entities/finTaxRecord/${taxBody.id}`, { token });
  if (tg.status === 200 && tg.data) {
    const d = tg.data;
    s.expectEq('★ 读回 recordNo（0053 无此列）', String(d.recordNo), `TR-E2E-${stamp}`);
    s.expectEq('★ 读回 periodType（0053 无此列）', String(d.periodType), 'monthly');
    s.expectEq('★ 读回 category（0053 无此列）', String(d.category), 'vat');
    s.expectEq('  读回 deductedAmount', Number(d.deductedAmount), 8000);
    s.expectEq('  读回 actualPayable', Number(d.actualPayable), 5000);
    s.expectEq('  读回 paidAmount', Number(d.paidAmount), 5000);
    s.expectEq('  读回 paymentDate', String(d.paymentDate), '2026-09-15');
    s.expectEq('  读回 remarks', String(d.remarks), 'E2E 税务备注');
  } else {
    s.fail('GET 税务记录单条', `status=${tg.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 6. 发票与会计科目基本往返
  // ══════════════════════════════════════════════════════════════
  const invBody = {
    id: `inv-e2e-${stamp}`,
    invoiceNo: `INV-E2E-${stamp}`,
    invoiceType: 'special',
    vendorName: 'E2E 开票方',
    invoiceDate: '2026-09-01',
    amount: 88495.58,
    taxRate: 13,
    taxAmount: 11504.42,
    totalAmount: 100000,
    currency: 'CNY',
    status: 'pending',
    note: 'E2E 发票',
  };
  const ic = await req('POST', '/api/entities/finInvoice', { token, body: invBody });
  const icOk = s.expectStatus('创建财务发票返回 201', ic, 201,
    ic.status !== 201 ? JSON.stringify(ic.data).slice(0, 160) : '');
  if (icOk) cleanup.push({ path: '/api/entities/finInvoice', id: invBody.id });
  const ig = await req('GET', `/api/entities/finInvoice/${invBody.id}`, { token });
  if (ig.status === 200 && ig.data) {
    s.expectEq('  发票编号一致', String(ig.data.invoiceNo), invBody.invoiceNo);
    s.expectEq('  发票价税合计一致', Number(ig.data.totalAmount), 100000);
    s.expectEq('  发票税率一致', Number(ig.data.taxRate), 13);
  } else {
    s.fail('GET 财务发票单条', `status=${ig.status}`);
  }

  const coaBody = {
    id: `coa-e2e-${stamp}`,
    code: `1002-E2E-${stamp}`,
    name: 'E2E 银行存款',
    type: 'asset',
    parentCode: '1002',
    isLeaf: 1,
    balance: 50000,
    normalSide: 'debit',
    statement: 'balance',
    section: 'current_asset',
  };
  const cc = await req('POST', '/api/entities/finChartAccount', { token, body: coaBody });
  const ccOk = s.expectStatus('创建会计科目返回 201', cc, 201,
    cc.status !== 201 ? JSON.stringify(cc.data).slice(0, 160) : '');
  if (ccOk) cleanup.push({ path: '/api/entities/finChartAccount', id: coaBody.id });
  const cg = await req('GET', `/api/entities/finChartAccount/${coaBody.id}`, { token });
  if (cg.status === 200 && cg.data) {
    s.expectEq('  科目编码一致', String(cg.data.code), coaBody.code);
    s.expectEq('  科目余额方向一致', String(cg.data.normalSide), 'debit');
  } else {
    s.fail('GET 会计科目单条', `status=${cg.status}`);
  }

  // 更新：实体路由 PUT 只回 {ok:true}，必须重新 GET 校验
  const eu = await req('PUT', `/api/entities/finAccountEntry/${entryBody.id}`, {
    token, body: { amount: 999.99, description: 'E2E 已改金额' },
  });
  s.expectStatus('PUT 会计分录返回 200', eu, 200);
  const eg2 = await req('GET', `/api/entities/finAccountEntry/${entryBody.id}`, { token });
  if (eg2.status === 200 && eg2.data) {
    s.expectEq('  更新后金额已变', Number(eg2.data.amount), 999.99);
    s.expectEq('  未传的借方科目未被清空', String(eg2.data.debitAccount), '原材料');
  } else {
    s.fail('更新后重新读回分录', `status=${eg2.status}`);
  }

  // 删除：再查应为 404
  const ed = await req('DELETE', `/api/entities/finAccountEntry/${entryBody.id}`, { token });
  s.expectStatus('DELETE 会计分录返回 200', ed, 200);
  const eg3 = await req('GET', `/api/entities/finAccountEntry/${entryBody.id}`, { token });
  s.expectStatus('删除后再查分录返回 404', eg3, 404);
  const idx3 = cleanup.findIndex((c) => c.id === entryBody.id);
  if (idx3 >= 0) cleanup.splice(idx3, 1);

  // ══════════════════════════════════════════════════════════════
  // 7. 清理本轮残留（断言失败时中断也不会把测试数据留在生产库）
  // ══════════════════════════════════════════════════════════════
  for (const c of cleanup.splice(0)) {
    try {
      await req('DELETE', `${c.path}/${c.id}`, { token });
    } catch {
      /* 清理尽力而为，失败不影响断言结果 */
    }
  }
}
