// 套件 22 · 采购域关系化护栏（V3.11.0 C1 数据关系化第五个域）
//
// ── 这个套件防的是什么回潮 ────────────────────────────────────────
// 采购域与前面四个域最大的不同有两点，各带来一类独有风险：
//
//  ★ 差异一：两张父表都在「同一业务链路」上，且 RLS 取值刻意相反
//     purchase_requests   = 'own'（个人提报的单据）
//     vendor_quotes       = 'all'（比价用的公司级公共信息）
//     同一域内两张表权限值不同，是本域最容易被「整批复制」搞错的地方
//     （见 _shared/purchaseConfig.ts 文件头）。若误把报价也设成 'own'，
//     表现是「采购员看不到别人录入的报价」—— 比价功能直接残废，
//     但界面上只是「列表少了几行」，没有任何报错。
//     → 本套件用**同组织内跨身份**验证：admin 建的报价，buyer 必须能看见。
//
//  ★ 差异二：两个子表主键来源不同（一个是前端 id、一个是后端生成）
//     PurchaseRequestItem **自带 id** → 主键直接用前端 id
//     QuoteItem           **没有 id** → 主键由后端 uid('ci') 生成
//     这是同一个通用助手内的两种分支。若实现只走通了一种，
//     另一种的表现是「明细写进去读不回来」或「读回来 id 全是 undefined」。
//     → 本套件对两条链路分别断言「行数一致 + 业务字段逐项一致」。
//
// 四类「搬过去了但静默少了数据」的失败模式（与前四个域同构，逐条钉死）：
//
//  ① **子表被静默丢弃**
//     通用实体路由 pickSnake 只挑登记过的列，嵌套数组不写、不报错、返回 201。
//     → 表现：申请单建成功了，进去一看物料明细一栏是空的。
//       这是采购域最痛的一种 —— 申请单没有明细就等于没有内容。
//
//  ② **父表可选字段被静默丢弃**
//     `remarks` / `projectNo` / `sourceType` / `sourceNo` / `sourceName`
//     实测生产库 5 条申请里**一条都没出现**，但**必须登记**。
//     用户一旦填写备注、或从 MRP 生成申请（带 sourceType/sourceNo），
//     未登记字段会被父表 pickCols 静默丢弃且返回 201。
//     → 本套件**刻意写入这些「库里当前没数据」的字段**并断言读回一致。
//       这是唯一能防住「现在没数据就不登记」这个错的做法。
//
//  ③ **JSON 文本列编解码错**
//     `approvalRecords`（对象数组）与 `customFields`（对象）在库里是 TEXT。
//     漏了任一方向的编解码会得到「读回是字符串」或「写进去变成 [object]」。
//     → 本套件断言 approvalRecords 读回是**真数组**、customFields 读回是**真对象**。
//
//  ④ **「不传子数组 = 保持原样」被写成「不传 = 清空」**
//     采购申请最频繁的操作是「提交流程推进状态」（PUT {status}），
//     最危险的路径是「审批通过后转采购订单」（PUT {status:'ordered'}）。
//     若语义写反，推进一次状态就把物料明细全删了 —— 用户看到的是「保存成功」。
//     → 本套件连续推进 5 个状态（draft→pending→approved→rejected→ordered），
//       每步都不传 items，最后明细必须仍是 4 行。
//
// 为什么断言要「POST 之后必须再 GET 一次」：
//   POST 的回执可能只是把请求体原样回显，证明不了真的落到了 D1。
//   只有重新 GET 一次（打在数据库上）才能证明写入生效。
export const meta = { id: '22-purchase-domain', title: '采购域关系化护栏（两子表主键来源分叉 + 两表 RLS 取值相反 + 可选字段不丢 + JSON 文本列往返）' };

const cleanup = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36).toUpperCase();

  // ══════════════════════════════════════════════════════════════
  // 1. 端点可达性与鉴权（漏登记 RLS 会返回空表而不是 200；未登录必须 401）
  // ══════════════════════════════════════════════════════════════
  for (const [label, path] of [
    ['采购申请', '/api/purchase-requests'],
    ['供应商报价', '/api/vendor-quotes'],
  ]) {
    const r = await req('GET', path, { token });
    const ok = s.expectStatus(`GET ${path} 返回 200（${label} RLS 已登记）`, r, 200,
      r.status === 200 ? `total=${r.data?.total}` : JSON.stringify(r.data).slice(0, 100));
    if (ok) s.expectListShape(`  └ ${label} 列表契约 {data,total,page,pageSize}`, r);
  }

  const anon1 = await req('GET', '/api/purchase-requests');
  s.expectStatus('未登录访问采购申请被拒 401', anon1, 401);
  const anon2 = await req('GET', '/api/vendor-quotes');
  s.expectStatus('未登录访问供应商报价被拒 401', anon2, 401);

  // ══════════════════════════════════════════════════════════════
  // 2. ★ 采购申请：items 嵌套数组（前端自带 id）+ 父表可选字段 + JSON 文本列
  // ══════════════════════════════════════════════════════════════
  const requestNo = `PR-E2E-${stamp}`;
  const requestItems = [
    { id: `pri-${stamp}-1`, materialId: 'mat-e2e-1', materialCode: 'M-E2E-001', materialName: '冷轧钢板', specification: 'SPCC 1.5mm', unit: '张', quantity: 200, estimatedPrice: 86.5, estimatedAmount: 17300, deliveryDate: '2026-10-10', remarks: '需附材质证明' },
    { id: `pri-${stamp}-2`, materialId: 'mat-e2e-2', materialCode: 'M-E2E-002', materialName: '深沟球轴承', specification: '6206-2RS', unit: '个', quantity: 500, estimatedPrice: 22.8, estimatedAmount: 11400, deliveryDate: '2026-10-15' },
    { id: `pri-${stamp}-3`, materialId: 'mat-e2e-3', materialCode: 'M-E2E-003', materialName: '三相异步电机', specification: 'YE3-132S-4 5.5kW', unit: '台', quantity: 8, estimatedPrice: 2180, estimatedAmount: 17440, deliveryDate: '2026-11-01' },
    { id: `pri-${stamp}-4`, materialId: 'mat-e2e-4', materialCode: 'M-E2E-004', materialName: '不锈钢螺栓', specification: 'M12×60 304', unit: '盒', quantity: 40, estimatedPrice: 135, estimatedAmount: 5400, deliveryDate: '2026-10-05' },
  ];
  // ★ approvalRecords（对象数组，走父表 JSON 文本列 —— 本域刻意不建子表）
  const approvalRecords = [
    { id: `ar-${stamp}-1`, step: 0, approver: '李主管', role: 'dept_manager', action: 'approve', comment: '需求合理，同意采购', at: '2026-10-01T09:12:00.000Z' },
    { id: `ar-${stamp}-2`, step: 1, approver: '王总监', role: 'finance_manager', action: 'approve', comment: '预算内，批准', at: '2026-10-01T14:30:00.000Z' },
  ];
  const requestBody = {
    id: `pr-e2e-${stamp}`,
    requestNo,
    title: '产线扩建设备采购申请',
    applicant: '张工',
    department: '生产技术部',
    type: 'material',
    priority: 'high',
    reason: '现有产线产能不足，需新增设备与配套材料',
    // ★ 以下 6 个可选字段实测生产库现存 5 条申请里一条都没出现，
    //   本套件刻意全部写入，验证「登记了就不会被静默丢弃」。
    remarks: '请优先采购电机，该件交期最长',
    expectedDate: '2026-11-10',
    status: 'draft',
    currentStep: 0,
    totalAmount: 51540,
    projectNo: `PRJ-E2E-${stamp}`,
    projectName: 'E2E 产线扩建项目',
    sourceType: 'mrp',
    sourceNo: `MRP-E2E-${stamp}`,
    sourceName: 'MRP 净需求运算结果',
    customFields: { costCenter: 'CC-PROD-01', budgetYear: '2026', urgentReason: '客户订单已确认' },
    approvalRecords,
    items: requestItems,
  };

  const pc = await req('POST', '/api/purchase-requests', { token, body: requestBody });
  const pcOk = s.expectStatus('★ 创建带 4 条物料明细的采购申请返回 201', pc, 201,
    pc.status !== 201 ? JSON.stringify(pc.data).slice(0, 200) : '');
  if (pcOk) cleanup.push({ path: '/api/purchase-requests', id: requestBody.id });
  if (pcOk && pc.data) {
    s.expectEq('★ 创建回执：物料明细 4 行（未被静默丢弃）',
      (pc.data.items || []).length, 4, '明细行数');
  }

  // ★ 必须重新 GET：证明真的落到了 D1，而不是回显请求体
  const pg = await req('GET', `/api/purchase-requests/${requestBody.id}`, { token });
  const pgOk = s.expectStatus('GET 采购申请单条返回 200', pg, 200);
  if (pgOk && pg.data) {
    const got = pg.data.items || [];
    s.expectEq('★ 从 D1 读回仍是 4 行明细（写入未丢行）', got.length, 4, '明细行数');
    // ★ 子表主键用的是**前端提供的 id**（PurchaseRequestItem 自带 id）
    s.expectTrue('★ 明细 id 保留为前端提供的 id（非后端重新生成）',
      got.every((it) => String(it.id).startsWith(`pri-${stamp}-`)),
      `ids=${got.map((it) => it.id).join(',')}`);
    const third = got.find((i) => i.materialCode === 'M-E2E-003');
    if (third) {
      s.expectEq('  第 3 行物料名一致', String(third.materialName), '三相异步电机');
      s.expectEq('  第 3 行规格一致', String(third.specification), 'YE3-132S-4 5.5kW');
      s.expectEq('  第 3 行数量一致', Number(third.quantity), 8);
      s.expectEq('  第 3 行预估单价一致', Number(third.estimatedPrice), 2180);
      s.expectEq('  第 3 行预估金额一致', Number(third.estimatedAmount), 17440);
      s.expectEq('  第 3 行期望交期一致', String(third.deliveryDate), '2026-11-01');
    } else {
      s.fail('  物料 M-E2E-003 明细读回', '未找到该明细行');
    }
    // 明细顺序按插入顺序（seq），不按数量/金额重排
    s.expectEq('★ 明细顺序保持插入顺序（第 1 行是最先录入的钢板）',
      String(got[0]?.materialCode), 'M-E2E-001');
    s.expectEq('  行备注读回一致', String(got[0]?.remarks), '需附材质证明');

    // 父表业务字段逐项比对（防「表结构对不上前端契约」的回潮 —— 0053 的教训）
    s.expectEq('  父表申请单号一致', String(pg.data.requestNo), requestNo);
    s.expectEq('  父表标题一致', String(pg.data.title), '产线扩建设备采购申请');
    s.expectEq('  父表申请人一致', String(pg.data.applicant), '张工');
    s.expectEq('  父表部门一致', String(pg.data.department), '生产技术部');
    s.expectEq('  父表类型一致', String(pg.data.type), 'material');
    s.expectEq('  父表优先级一致', String(pg.data.priority), 'high');
    s.expectEq('  父表状态一致', String(pg.data.status), 'draft');
    s.expectEq('  父表总额一致', Number(pg.data.totalAmount), 51540);
    s.expectEq('  父表当前步骤一致', Number(pg.data.currentStep), 0);

    // ★★ 可选字段专项：实测库里没有数据 ≠ 可以不登记
    s.expectEq('★★ 可选字段 remarks 未丢（库里原本无此数据）',
      String(pg.data.remarks), '请优先采购电机，该件交期最长');
    s.expectEq('★★ 可选字段 projectNo 未丢', String(pg.data.projectNo), `PRJ-E2E-${stamp}`);
    s.expectEq('★★ 可选字段 projectName 未丢', String(pg.data.projectName), 'E2E 产线扩建项目');
    s.expectEq('★★ 可选字段 sourceType 未丢（MRP 生成申请链路）', String(pg.data.sourceType), 'mrp');
    s.expectEq('★★ 可选字段 sourceNo 未丢', String(pg.data.sourceNo), `MRP-E2E-${stamp}`);
    s.expectEq('★★ 可选字段 sourceName 未丢', String(pg.data.sourceName), 'MRP 净需求运算结果');

    // ★ JSON 文本列：approvalRecords 必须是真数组，元素逐项一致
    const ar = pg.data.approvalRecords;
    s.expectTrue('★ approvalRecords 读回是真数组（不是字符串）',
      Array.isArray(ar), `类型=${typeof ar} 值=${JSON.stringify(ar)?.slice(0, 80)}`);
    if (Array.isArray(ar)) {
      s.expectEq('  审批记录数量一致', ar.length, 2, '记录数');
      const a2 = ar.find((x) => x.approver === '王总监') || ar[1];
      if (a2) {
        s.expectEq('  第 2 条审批人一致', String(a2.approver), '王总监');
        s.expectEq('  第 2 条动作一致', String(a2.action), 'approve');
        s.expectEq('  第 2 条意见一致', String(a2.comment), '预算内，批准');
      } else {
        s.fail('  第 2 条审批记录读回', '未找到 approver=王总监 的记录');
      }
    }

    // ★ JSON 文本列：customFields 必须是真对象
    const cf = pg.data.customFields;
    s.expectTrue('★ customFields 读回是真对象（不是字符串）',
      cf && typeof cf === 'object' && !Array.isArray(cf),
      `类型=${typeof cf} 值=${JSON.stringify(cf)?.slice(0, 80)}`);
    if (cf && typeof cf === 'object') {
      s.expectEq('  自定义字段 costCenter 一致', String(cf.costCenter), 'CC-PROD-01');
      s.expectEq('  自定义字段 budgetYear 一致', String(cf.budgetYear), '2026');
    }
  }

  // ★★ 只推进状态、不传 items → 明细一条都不能少（采购审批最常用操作）
  const statusChain = ['pending', 'approved', 'rejected', 'pending', 'ordered'];
  for (const st of statusChain) {
    const r = await req('PUT', `/api/purchase-requests/${requestBody.id}`, { token, body: { status: st } });
    if (st === statusChain[0]) s.expectStatus(`PUT 推进状态为 ${st} 返回 200`, r, 200);
  }
  const pg2 = await req('GET', `/api/purchase-requests/${requestBody.id}`, { token });
  if (pg2.status === 200 && pg2.data) {
    s.expectEq('★★ 连续推进 5 次状态后明细仍是 4 行（每次都不带 items）',
      (pg2.data.items || []).length, 4, '明细行数');
    s.expectEq('  状态已推进到 ordered', String(pg2.data.status), 'ordered');
    s.expectEq('  未传的申请人未被清空', String(pg2.data.applicant), '张工');
    s.expectEq('  未传的备注未被清空', String(pg2.data.remarks), '请优先采购电机，该件交期最长');
    // 只改状态也不能把 JSON 文本列冲掉
    s.expectTrue('★ 只改状态后 approvalRecords 未丢失',
      Array.isArray(pg2.data.approvalRecords) && pg2.data.approvalRecords.length === 2,
      `值=${JSON.stringify(pg2.data.approvalRecords)?.slice(0, 80)}`);
    s.expectTrue('  只改状态后 customFields 未丢失',
      pg2.data.customFields && typeof pg2.data.customFields === 'object'
        && String(pg2.data.customFields.costCenter) === 'CC-PROD-01',
      `值=${JSON.stringify(pg2.data.customFields)?.slice(0, 80)}`);
  } else {
    s.fail('推进状态后重新读回采购申请', `status=${pg2.status}`);
  }

  // 显式传 6 条明细 = 整体替换
  const six = Array.from({ length: 6 }, (_, i) => ({
    id: `pri-new-${stamp}-${i + 1}`, materialId: `mat-new-${i + 1}`,
    materialCode: `M-NEW-${String(i + 1).padStart(3, '0')}`,
    materialName: `重排物料${i + 1}`, unit: '件',
    quantity: (i + 1) * 10, estimatedPrice: 100 + i, estimatedAmount: (i + 1) * 10 * (100 + i),
  }));
  const pr = await req('PUT', `/api/purchase-requests/${requestBody.id}`, { token, body: { items: six } });
  s.expectStatus('PUT 显式传 6 条明细返回 200', pr, 200);
  const pg3 = await req('GET', `/api/purchase-requests/${requestBody.id}`, { token });
  if (pg3.status === 200 && pg3.data) {
    s.expectEq('  显式传数组时按整体替换（6 行）',
      (pg3.data.items || []).length, 6, '明细行数');
    s.expectEq('  替换后首行物料编码正确',
      String((pg3.data.items || [])[0]?.materialCode), 'M-NEW-001');
  }

  // ★ 唯一约束：同组织重复 request_no 应 409（且提示里是人看得懂的单号）
  //
  // ★★ 顺序很关键，这里踩过一次：这条断言必须**在原单据还活着的时候**做。
  //    最初把它写在「DELETE 采购申请」之后，于是「重复」的参照物已经不存在，
  //    唯一约束无冲突可报 → 正确返回 201 → 断言误报为 FAIL。
  //    **这不是产品缺陷，是我把「验证唯一性」和「验证删除」这两件事的先后搞反了。**
  //    规矩：凡是「重复/冲突」类断言，前置条件一定是「被冲突的那条记录仍然存在」。
  const dupReq = await req('POST', '/api/purchase-requests', {
    token, body: { ...requestBody, id: `pr-dup-${stamp}` },
  });
  s.expectTrue('★ 重复 request_no 被拒（409 而非静默建第二条）', dupReq.status === 409,
    `status=${dupReq.status}`);
  if (dupReq.status === 409) {
    const msg = JSON.stringify(dupReq.data || '');
    s.expectTrue('  409 提示里含可读单号（人用来辨认记录的那个字段）',
      msg.includes(requestNo), `body=${msg.slice(0, 160)}`);
  }
  if (dupReq.status === 201) {
    // 若误建了第二条，必须清理掉，否则脏数据留在生产库
    cleanup.push({ path: '/api/purchase-requests', id: `pr-dup-${stamp}` });
  }

  // ★ 删除连带：先补回明细再删，验证「删除时报告连带行数」
  await req('PUT', `/api/purchase-requests/${requestBody.id}`, {
    token,
    body: {
      items: [
        { id: `pri-del-${stamp}-1`, materialId: 'mat-del-1', materialCode: 'M-DEL-001', materialName: '待删物料一', quantity: 1, estimatedPrice: 10, estimatedAmount: 10 },
        { id: `pri-del-${stamp}-2`, materialId: 'mat-del-2', materialCode: 'M-DEL-002', materialName: '待删物料二', quantity: 2, estimatedPrice: 20, estimatedAmount: 40 },
      ],
    },
  });
  const pd = await req('DELETE', `/api/purchase-requests/${requestBody.id}`, { token });
  const pdOk = s.expectStatus('DELETE 采购申请返回 200', pd, 200);
  if (pdOk && pd.data) {
    const detail = String(pd.data.deletedDetail || '');
    s.expectTrue('★ 删除回执报告连带删除的物料明细行数',
      /items\s*2\s*行/.test(detail), `deletedDetail=${detail}`);
  }
  const pgd = await req('GET', `/api/purchase-requests/${requestBody.id}`, { token });
  s.expectStatus('删除采购申请后再查返回 404', pgd, 404);
  {
    const i = cleanup.findIndex((c) => c.id === requestBody.id);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // ★ 删除之后，同一单号应当**可以再次使用**（证明约束只在「存在」时生效，
  //   而不是把单号永久占用）—— 这同时反向验证了上一条断言的时序是对的。
  const reuseNo = await req('POST', '/api/purchase-requests', {
    token,
    body: { ...requestBody, id: `pr-reuse-${stamp}`, items: [] },
  });
  s.expectStatus('★ 原单据删除后同一 request_no 可再次使用（约束只在存在时生效）',
    reuseNo, 201);
  if (reuseNo.status === 201) {
    cleanup.push({ path: '/api/purchase-requests', id: `pr-reuse-${stamp}` });
  }

  // ══════════════════════════════════════════════════════════════
  // 3. ★ 供应商报价：items 嵌套数组（后端生成 id —— 与申请明细的分叉点）
  // ══════════════════════════════════════════════════════════════
  // 重新建一张申请单作为两张报价的挂靠对象（上一张已删除）
  const anchorReqId = `pr-anchor-${stamp}`;
  const anchorNo = `PR-ANCHOR-${stamp}`;
  const anchorCreate = await req('POST', '/api/purchase-requests', {
    token,
    body: {
      id: anchorReqId, requestNo: anchorNo, title: '比价基准申请单',
      applicant: '张工', department: '采购部', type: 'material', priority: 'normal',
      reason: '作为两张供应商报价的挂靠对象', expectedDate: '2026-11-20',
      status: 'pending', totalAmount: 5630,
      items: [
        { id: `pri-anchor-${stamp}-1`, materialId: 'mat-e2e-1', materialCode: 'M-E2E-001', materialName: '冷轧钢板', quantity: 200, estimatedPrice: 24, estimatedAmount: 4800 },
        { id: `pri-anchor-${stamp}-2`, materialId: 'mat-e2e-2', materialCode: 'M-E2E-002', materialName: '深沟球轴承', quantity: 50, estimatedPrice: 16.6, estimatedAmount: 830 },
      ],
    },
  });
  const anchorOk = s.expectStatus('创建比价基准申请单返回 201', anchorCreate, 201);
  if (anchorOk) cleanup.push({ path: '/api/purchase-requests', id: anchorReqId });

  const quoteAId = `vq-e2e-${stamp}-A`;
  const quoteA = {
    id: quoteAId,
    requestId: anchorReqId,
    vendorId: 'vendor-e2e-a',
    vendorName: 'E2E 甲供应商',
    totalAmount: 5600,
    validUntil: '2026-11-30',
    remarks: '含税含运，账期 30 天',
    submittedAt: '2026-10-08T10:00:00.000Z',
    // ★ QuoteItem **没有 id 字段** —— 只给业务字段，id 由后端生成
    items: [
      { materialId: 'mat-e2e-1', materialName: '冷轧钢板', quantity: 200, unitPrice: 23.8, amount: 4760 },
      { materialId: 'mat-e2e-2', materialName: '深沟球轴承', quantity: 50, unitPrice: 16.8, amount: 840 },
    ],
  };

  const qc = await req('POST', '/api/vendor-quotes', { token, body: quoteA });
  const qcOk = s.expectStatus('★ 创建带 2 条报价明细的供应商报价返回 201', qc, 201,
    qc.status !== 201 ? JSON.stringify(qc.data).slice(0, 200) : '');
  if (qcOk) cleanup.push({ path: '/api/vendor-quotes', id: quoteA.id });
  if (qcOk && qc.data) {
    s.expectEq('★ 创建回执：报价明细 2 行（未被静默丢弃）',
      (qc.data.items || []).length, 2, '明细行数');
  }

  const qg = await req('GET', `/api/vendor-quotes/${quoteA.id}`, { token });
  const qgOk = s.expectStatus('GET 供应商报价单条返回 200', qg, 200);
  if (qgOk && qg.data) {
    const gotQ = qg.data.items || [];
    s.expectEq('★ 从 D1 读回仍是 2 行报价明细（写入未丢行）', gotQ.length, 2, '明细行数');
    // ★ 子表主键由**后端生成**（QuoteItem 无 id）—— 必须存在且非 undefined
    s.expectTrue('★ 报价明细 id 由后端生成且非空（QuoteItem 契约里没有 id）',
      gotQ.every((it) => it.id && String(it.id) !== 'undefined' && String(it.id).length > 0),
      `ids=${gotQ.map((it) => it.id).join(',')}`);
    const firstQ = gotQ[0];
    if (firstQ) {
      s.expectEq('  第 1 行物料名一致', String(firstQ.materialName), '冷轧钢板');
      s.expectEq('  第 1 行数量一致', Number(firstQ.quantity), 200);
      s.expectEq('  第 1 行报价单价一致', Number(firstQ.unitPrice), 23.8);
      s.expectEq('  第 1 行金额一致', Number(firstQ.amount), 4760);
    }
    s.expectEq('  父表报价总额一致', Number(qg.data.totalAmount), 5600);
    s.expectEq('  父表关联申请 id 一致', String(qg.data.requestId), anchorReqId);
    s.expectEq('  父表供应商 id 一致', String(qg.data.vendorId), 'vendor-e2e-a');
    s.expectEq('  父表供应商名一致', String(qg.data.vendorName), 'E2E 甲供应商');
    s.expectEq('  父表有效期一致', String(qg.data.validUntil), '2026-11-30');
    s.expectEq('  父表备注一致', String(qg.data.remarks), '含税含运，账期 30 天');
    s.expectEq('  父表提交时间一致', String(qg.data.submittedAt), '2026-10-08T10:00:00.000Z');
  }

  // ── ★★ RLS 断言：vendor_quotes = 'all'（同组织内跨身份可见）──────────
  // 这是本域与前面所有域最不同的一条：同一域内两张表权限值刻意相反。
  // 用「同组织内另一个身份」来验证 —— 若被误设成 'own'，buyer 看不到 admin 的报价。
  const buyer = ctx.users.buyer || (await ctx.registerUser('buyer', 'buyer', '采购部'));
  if (!buyer) {
    s.fail('注册同组织 buyer 用户（用于 RLS 跨身份验证）', 'registerUser 返回 null');
  } else {
    // (a) vendor_quotes 应为 'all' → buyer 必须能读到 admin 建的报价
    const bq = await req('GET', `/api/vendor-quotes/${quoteA.id}`, { token: buyer.token });
    s.expectStatus('★★ 同事（buyer）能读到他建的供应商报价 200（RLS=all 生效）', bq, 200,
      bq.status !== 200 ? '若为 404 说明被误设成 own —— 比价功能残废' : '');
    const bqList = await req('GET', '/api/vendor-quotes', { token: buyer.token });
    if (bqList.status === 200) {
      const found = (bqList.data?.data || []).some((q) => q.id === quoteA.id);
      s.expectTrue('★★ buyer 的报价列表中能看到同事录入的报价（公司级公共信息）',
        found, `total=${bqList.data?.total} 是否含目标报价=${found}`);
    }
    // (b) purchase_requests 应为 'own' → 这条用「反向」验证：buyer 建的单 admin 可见性
    //     说明：'own' 的语义是「本人 + 部门/组织可见范围」，与 'all' 的差别在于
    //     是否受 owner 过滤。这里断言的是两条路径**都不报错且形状一致**，
    //     避免把「两种语义都返回 200」误当成「取值相同」。
    const br = await req('GET', '/api/purchase-requests', { token: buyer.token });
    s.expectStatus('★ 同组织 buyer 也能正常列出采购申请 200（own 语义不报错）', br, 200);
    if (br.status === 200) {
      s.expectTrue('  采购申请列表形状与 admin 一致（不缺字段）',
        Array.isArray(br.data?.data) && typeof br.data?.total === 'number',
        `data=${Array.isArray(br.data?.data)} total=${br.data?.total}`);
    }
  }

  // ── 第二张报价（同申请、不同供应商 —— 「比价」业务的真实数据形态）──────
  const quoteBId = `vq-e2e-${stamp}-B`;
  const quoteB = {
    id: quoteBId,
    requestId: anchorReqId,
    vendorId: 'vendor-e2e-b',
    vendorName: 'E2E 乙供应商',
    totalAmount: 5480,
    validUntil: '2026-12-05',
    remarks: '账期 60 天，不含运',
    submittedAt: '2026-10-09T09:30:00.000Z',
    items: [
      { materialId: 'mat-e2e-1', materialName: '冷轧钢板', quantity: 200, unitPrice: 23.2, amount: 4640 },
      { materialId: 'mat-e2e-2', materialName: '深沟球轴承', quantity: 50, unitPrice: 16.8, amount: 840 },
    ],
  };
  const qc2 = await req('POST', '/api/vendor-quotes', { token, body: quoteB });
  const qc2Ok = s.expectStatus('创建第二张报价（同申请、不同供应商）返回 201', qc2, 201);
  if (qc2Ok) cleanup.push({ path: '/api/vendor-quotes', id: quoteB.id });

  // 两张报价都能按 requestId 过滤出来（比价场景的唯一数据载体）
  const qList = await req('GET', `/api/vendor-quotes?requestId=${encodeURIComponent(anchorReqId)}`, { token });
  if (qList.status === 200) {
    const rows = qList.data?.data || [];
    const mine = rows.filter((q) => String(q.requestId) === anchorReqId);
    s.expectEq('★ 按 requestId 筛出该申请单的 2 张报价（比价数据载体完整）',
      mine.length, 2, '报价张数');
    const minTotal = Math.min(...mine.map((q) => Number(q.totalAmount)));
    s.expectEq('  两张报价里最低总价可辨（比价有意义）', minTotal, 5480);
  } else {
    s.warn('按 requestId 过滤报价', `status=${qList.status}（可能未支持该查询参数，不影响写入正确性）`);
  }

  // 报价明细整体替换 + 不传子数组保持
  const qr = await req('PUT', `/api/vendor-quotes/${quoteA.id}`, { token, body: { remarks: '改：含税不含运' } });
  s.expectStatus('PUT 只改报价备注返回 200', qr, 200);
  const qg2 = await req('GET', `/api/vendor-quotes/${quoteA.id}`, { token });
  if (qg2.status === 200 && qg2.data) {
    s.expectEq('★ 只改备注后报价明细仍是 2 行（不传子数组 ≠ 清空）',
      (qg2.data.items || []).length, 2, '明细行数');
    s.expectEq('  备注已更新', String(qg2.data.remarks), '改：含税不含运');
    s.expectEq('  未传的供应商名未被清空', String(qg2.data.vendorName), 'E2E 甲供应商');
  } else {
    s.fail('只改备注后重新读回报价', `status=${qg2.status}`);
  }

  // 报价明细显式传 3 条 = 整体替换（验证后端生成 id 在替换时也正常）
  const threeItems = [
    { materialId: 'mat-e2e-1', materialName: '冷轧钢板', quantity: 200, unitPrice: 22.5, amount: 4500 },
    { materialId: 'mat-e2e-2', materialName: '深沟球轴承', quantity: 50, unitPrice: 16.5, amount: 825 },
    { materialId: 'mat-e2e-3', materialName: '三相异步电机', quantity: 1, unitPrice: 2500, amount: 2500 },
  ];
  const qr2 = await req('PUT', `/api/vendor-quotes/${quoteA.id}`, { token, body: { items: threeItems } });
  s.expectStatus('PUT 显式传 3 条报价明细返回 200', qr2, 200);
  const qg3 = await req('GET', `/api/vendor-quotes/${quoteA.id}`, { token });
  if (qg3.status === 200 && qg3.data) {
    s.expectEq('  显式传数组时按整体替换（3 行）',
      (qg3.data.items || []).length, 3, '明细行数');
    const ids = (qg3.data.items || []).map((it) => String(it.id));
    s.expectTrue('★ 替换后新明细 id 均为后端生成且互不重复',
      ids.every((id) => id && id !== 'undefined') && new Set(ids).size === ids.length,
      `ids=${ids.join(',')}`);
  }

  // 显式传空数组 = 清空
  const qz = await req('PUT', `/api/vendor-quotes/${quoteA.id}`, { token, body: { items: [] } });
  s.expectStatus('PUT 传空数组清空报价明细返回 200', qz, 200);
  const qg4 = await req('GET', `/api/vendor-quotes/${quoteA.id}`, { token });
  if (qg4.status === 200 && qg4.data) {
    s.expectEq('  传空数组时清空报价明细（0 行）',
      (qg4.data.items || []).length, 0, '明细行数');
  }

  // 删除连带 + 404 确认
  await req('PUT', `/api/vendor-quotes/${quoteA.id}`, {
    token,
    body: { items: [{ materialId: 'mat-del', materialName: '待删报价行', quantity: 1, unitPrice: 1, amount: 1 }] },
  });

  // ★ 同一供应商对同一申请单重复报价必须被拒
  //   （uniq_vendor_quotes_req_vendor 索引，见 migrations/0060）
  //   否则比价列表里会出现两条同一供应商的记录，采购员无从判断哪条是新的。
  const dupQuote = await req('POST', '/api/vendor-quotes', {
    token,
    body: { ...quoteA, id: `vq-dup-${stamp}` },
  });
  s.expectTrue('★ 同供应商对同申请单重复报价被拒（409 而非静默建第二条）',
    dupQuote.status === 409, `status=${dupQuote.status}`);

  const qd = await req('DELETE', `/api/vendor-quotes/${quoteA.id}`, { token });
  const qdOk = s.expectStatus('DELETE 供应商报价返回 200', qd, 200);
  if (qdOk && qd.data) {
    const detail = String(qd.data.deletedDetail || '');
    s.expectTrue('★ 删除回执报告连带删除的报价明细行数',
      /items\s*1\s*行/.test(detail), `deletedDetail=${detail}`);
  }
  const qgd = await req('GET', `/api/vendor-quotes/${quoteA.id}`, { token });
  s.expectStatus('删除供应商报价后再查返回 404', qgd, 404);
  {
    const i = cleanup.findIndex((c) => c.id === quoteA.id);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // 4. 采购订单（V2.75.x 既有 D1 通道）不被本轮改造打破
  // ══════════════════════════════════════════════════════════════
  const poList = await req('GET', '/api/purchase-orders', { token });
  const poOk = s.expectStatus('GET /api/purchase-orders 仍返回 200（未被本轮改造打破）', poList, 200);
  if (poOk) s.expectListShape('  └ 采购订单列表契约未变', poList);

  // ══════════════════════════════════════════════════════════════
  // 5. 清理本轮残留（断言失败时中断也不会把测试数据留在生产库）
  //     ★ 注意：harness 的 ctx.cleanup() 的 pathOf 不含 request/quote，
  //       所以本套件内自行 DELETE（上面已做），此处兜底剩余挂靠单据与第二张报价。
  // ══════════════════════════════════════════════════════════════
  for (const c of cleanup.splice(0)) {
    try {
      await req('DELETE', `${c.path}/${c.id}`, { token });
    } catch {
      /* 清理尽力而为，失败不影响断言结果 */
    }
  }
}
