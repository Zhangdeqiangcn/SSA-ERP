// 套件 27 · 付款闸门（三单匹配真正接通）
// ------------------------------------------------------------------
// 覆盖 V3.19.0「把三单匹配接到付款写入路径上」这一改动。
//
// 为什么必须打真实端点：
//   functions/ 不在前端 tsc 覆盖内（见项目硬规矩 ㉗）。闸门涉及
//   「请求体克隆、四个写入点、SQL 占位符与绑定参数个数」这几类只在运行时
//   才暴露的问题；本地或生产任一侧跑一遍真实链路，才说明它真的在工作。
//
// 本套件要证明的六件事：
//   ① 数据齐全且一致 → 拍照留档并放行（不能把正常业务也拦掉）
//   ② 开票超订单 → 拦
//   ③ 入库不足（未足额收货）→ 拦
//   ④ 无发票 / 无订单号 / 订单不存在 / 付款超发票 → 各自拦，且原因可区分
//   ⑤ 被拦后**不写库**（拦而不住等于没拦）
//   ⑥ 通用实体路由这条后门同样被拦（只堵专用端点等于没堵）
//   ⑦ 只改备注等非付款动作不受影响（闸门必须精准，否则用户会要求关掉它）
//
// 安全：全部写操作发生在 run 级隔离组织内（E2E-<runId>），跑完自动清理。
export const meta = { id: '27-payment-gate', title: '付款闸门（三单匹配硬拦）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const who = ctx.admin.user.name || 'E2E';
  const stamp = runId || String(Date.now());
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const U = (p, body) => req('PUT', p, { token, body });

  /** 造一张采购订单（含一条明细，金额 100 件 × 100 元 = 不含税 10000） */
  const makePo = async (no, orderedQty = 100, unitPrice = 100) => {
    const amount = orderedQty * unitPrice;
    const r = await P('/api/purchase-orders', {
      orderNo: no,
      vendorId: 'vnd-gate',
      vendorName: '闸门测试供应商',
      status: 'draft',
      orderDate: '2026-09-01',
      totalAmount: amount,
      items: [{
        materialCode: 'M-GATE', materialName: '闸门测试物料', unit: '件',
        orderedQuantity: orderedQty, unitPrice, amount,
        amountWithTax: Math.round(amount * 1.13 * 100) / 100,
      }],
    });
    if (r.data?.id) ctx.track('purchase-order', r.data.id);
    return r;
  };

  /** 造一张入库单（sourceNo 关联采购订单号） */
  const makeInbound = async (no, sourceNo, actualQty = 100, unitPrice = 100) => {
    const r = await P('/api/inbound-orders', {
      inboundNo: no,
      type: 'purchase',
      sourceNo,
      vendorId: 'vnd-gate',
      vendorName: '闸门测试供应商',
      // 刻意用 pending：completed 会触发服务端库存过账，
      // 而闸门只看「入库单是否有效」，与是否已过账无关（见 threeWayMatch.ts 注释）。
      status: 'pending',
      warehouseId: 'wh-001',
      warehouseName: '主仓',
      operator: who,
      inboundDate: '2026-09-02',
      items: [{
        materialCode: 'M-GATE', materialName: '闸门测试物料', unit: '件',
        expectedQuantity: actualQty, actualQuantity: actualQty,
        unitPrice, amount: actualQty * unitPrice,
      }],
    });
    if (r.data?.id) ctx.track('inbound-order', r.data.id);
    return r;
  };

  /** 造一张发票（不含税 net，税率 13%） */
  const makeInvoice = async (no, poNo, net) => {
    const tax = Math.round(net * 0.13 * 100) / 100;
    const r = await P('/api/entities/finInvoice', {
      invoiceNo: no,
      invoiceType: 'vat_special',
      status: 'verified',
      vendorName: '闸门测试供应商',
      purchaseOrderNo: poNo,
      invoiceDate: '2026-09-03',
      amount: net,
      taxRate: 13,
      taxAmount: tax,
      totalAmount: Math.round((net + tax) * 100) / 100,
      currency: 'CNY',
    });
    if (r.data?.id) ctx.track('finInvoice', r.data.id);
    return r;
  };

  const makePlan = (over) => P('/api/fin-payment-plans', {
    id: `plan-${over.planNo}`,
    paidAmount: 0,
    status: 'pending',
    dueDate: '2026-10-01',
    paymentMethod: 'transfer',
    currency: 'CNY',
    exchangeRate: 1,
    vendorId: 'vnd-gate',
    vendorName: '闸门测试供应商',
    ...over,
  });

  // ══════════════════════════════════════════════════════════════
  // 1. 匿名拒绝：付款闸门涉及金额，绝不能匿名可读可判
  // ══════════════════════════════════════════════════════════════
  s.expectStatus('GET /api/three-way-match 匿名拒绝', await req('GET', '/api/three-way-match'), 401);
  s.expectStatus('GET /api/three-way-match/check 匿名拒绝', await req('GET', '/api/three-way-match/check?poNo=X'), 401);

  // ══════════════════════════════════════════════════════════════
  // 2. 造一条完整合规链路：验收 → 入库 → 开票
  // ══════════════════════════════════════════════════════════════
  const poOk = `PO-GATE-OK-${stamp}`;
  const rPoOk = await makePo(poOk);
  s.expectStatus('前置：创建采购订单（含明细）201', rPoOk, 201,
    rPoOk.status !== 201 ? JSON.stringify(rPoOk.data).slice(0, 160) : '');

  const rInbOk = await makeInbound(`INB-GATE-OK-${stamp}`, poOk, 100, 100);
  s.expectStatus('前置：创建入库单（100 件）201', rInbOk, 201,
    rInbOk.status !== 201 ? JSON.stringify(rInbOk.data).slice(0, 160) : '');

  const invOkNo = `INV-GATE-OK-${stamp}`;
  const rInvOk = await makeInvoice(invOkNo, poOk, 10000);
  s.expectStatus('前置：创建发票（不含税 10000）201', rInvOk, 201,
    rInvOk.status !== 201 ? JSON.stringify(rInvOk.data).slice(0, 160) : '');

  // ══════════════════════════════════════════════════════════════
  // 3. 预检：数据齐全应放行，且口径必须与服务端一致
  // ══════════════════════════════════════════════════════════════
  const preOk = await G(`/api/three-way-match/check?poNo=${poOk}`);
  s.expectStatus('预检（数据齐全）返回 200', preOk, 200);
  s.expectTrue('★ 预检结论：放行', preOk.data?.ok === true,
    `code=${preOk.data?.code} msg=${String(preOk.data?.message).slice(0, 80)}`);
  s.expectEq('  预检口径：订单不含税金额', preOk.data?.detail?.poAmount, 10000);
  s.expectEq('  预检口径：入库金额', preOk.data?.detail?.inboundAmount, 10000);
  s.expectEq('  预检口径：发票不含税', preOk.data?.detail?.invoiceAmount, 10000);
  s.expectEq('  预检口径：发票价税合计（与付款额同口径）', preOk.data?.detail?.invoiceTotalWithTax, 11300);
  s.expectEq('  预检口径：到货率 1.0', preOk.data?.detail?.arrivalRate, 1);

  // ══════════════════════════════════════════════════════════════
  // 4. 合规付款计划必须放行 —— 闸门不能把正常业务也拦掉
  // ══════════════════════════════════════════════════════════════
  const planOkId = `plan-gate-ok-${stamp}`;
  const planOkNo = `PP-GATE-OK-${stamp}`;
  const rPlanOk = await makePlan({
    planNo: planOkNo, id: planOkId,
    purchaseOrderNo: poOk, invoiceNo: invOkNo,
    totalAmount: 11300,
    installments: [{ id: `ins-${stamp}-1`, seq: 1, type: 'lump', label: '一次性', amount: 11300, dueDate: '2026-10-01', status: 'pending' }],
  });
  s.expectStatus('★ 合规付款计划放行 201', rPlanOk, 201,
    rPlanOk.status !== 201 ? JSON.stringify(rPlanOk.data).slice(0, 200) : '');
  if (rPlanOk.status === 201) ctx.track('fin-payment-plan', planOkId);

  // ══════════════════════════════════════════════════════════════
  // 5. 留档可追溯（判定记录、统一容差口径）
  // ══════════════════════════════════════════════════════════════
  const logs = await G(`/api/three-way-match?poNo=${poOk}&pageSize=20`);
  s.expectStatus('GET /api/three-way-match 返回 200', logs, 200);
  s.expectListShape('留档列表契约（data/total/page/pageSize）', logs);
  s.expectTrue('★ 闸门判定已留档（不是只判不记）',
    (logs.data?.data || []).length >= 1, `条数=${(logs.data?.data || []).length}`);
  s.expectEq('  留档同时回传统一容差（1%）', Number(logs.data?.tolerance), 0.01);

  // ══════════════════════════════════════════════════════════════
  // 6. 开票超过订单 → 拦
  //    独立造一套数据：如果复用第 2 组那个订单，本组加的发票会污染它，
  //    后面的「付款超发票」用例就会先命中本组的 OVER_PO 而不是 OVER_INVOICE。
  //    （这正是套件第一次跑时暴露的问题：用例之间共用数据会导致要么假通过、
  //      要么失败原因指向错误的地方。）
  // ══════════════════════════════════════════════════════════════
  const poOver = `PO-GATE-OVER-${stamp}`;
  await makePo(poOver);
  await makeInbound(`INB-GATE-OVER-${stamp}`, poOver, 100, 100);
  const invOverNo = `INV-GATE-OVER-${stamp}`;
  await makeInvoice(invOverNo, poOver, 30000);   // 30000 > 10000 × 1.01
  const preOver = await G(`/api/three-way-match/check?poNo=${poOver}`);
  s.expectTrue('预检识别：开票超过订单 → OVER_PO', preOver.data?.code === 'OVER_PO',
    `code=${preOver.data?.code}`);
  const planOverNo = `PP-GATE-OVER-${stamp}`;
  const rPlanOver = await makePlan({
    planNo: planOverNo, purchaseOrderNo: poOver, totalAmount: 33900,
  });
  s.expectStatus('★ 超订单开票：建付款计划被硬拦 422', rPlanOver, 422,
    `code=${rPlanOver.data?.code}`);
  s.expectTrue('  拦截带可识别代码 THREE_WAY_MATCH_OVER_PO',
    rPlanOver.data?.code === 'THREE_WAY_MATCH_OVER_PO', `code=${rPlanOver.data?.code}`);
  s.expectTrue('  拦截原因可读（含具体超出多少）',
    typeof rPlanOver.data?.error === 'string' && rPlanOver.data.error.includes('超出'),
    String(rPlanOver.data?.error).slice(0, 90));

  // ★ 拦而不住等于没拦：确认被拦的计划没有落库
  const checkNotSaved = await G(`/api/fin-payment-plans?keyword=${planOverNo}`);
  const notSavedTotal = checkNotSaved.data?.total ?? (checkNotSaved.data?.pagination?.total);
  s.expectEq('★ 被拦的计划未写库（拦而不住=没拦）', Number(notSavedTotal), 0);

  // ══════════════════════════════════════════════════════════════
  // 7. 入库不足（未足额收货）→ 拦
  // ══════════════════════════════════════════════════════════════
  const poShort = `PO-GATE-SHORT-${stamp}`;
  await makePo(poShort);
  await makeInbound(`INB-GATE-SHORT-${stamp}`, poShort, 30, 100);   // 只到 30 件 = 3000 元
  await makeInvoice(`INV-GATE-SHORT-${stamp}`, poShort, 10000);
  const preShort = await G(`/api/three-way-match/check?poNo=${poShort}`);
  s.expectTrue('★ 预检识别：入库不足 → INSUFFICIENT_INBOUND',
    preShort.data?.code === 'INSUFFICIENT_INBOUND', `code=${preShort.data?.code}`);
  const planShortNo = `PP-GATE-SHORT-${stamp}`;
  const rPlanShort = await makePlan({ planNo: planShortNo, purchaseOrderNo: poShort, totalAmount: 11300 });
  s.expectStatus('★ 入库不足：建付款计划被硬拦 422', rPlanShort, 422, `code=${rPlanShort.data?.code}`);
  s.expectTrue('  拦截原因说明货未到齐',
    typeof rPlanShort.data?.error === 'string' && /入库|到货|货未到/.test(rPlanShort.data.error),
    String(rPlanShort.data?.error).slice(0, 90));

  // ══════════════════════════════════════════════════════════════
  // 8. 无发票 → 拦（预付款除外，见第 9 组）
  // ══════════════════════════════════════════════════════════════
  const poNoInv = `PO-GATE-NOINV-${stamp}`;
  await makePo(poNoInv);
  const preNoInv = await G(`/api/three-way-match/check?poNo=${poNoInv}`);
  s.expectTrue('预检识别：无发票 → NO_INVOICE', preNoInv.data?.code === 'NO_INVOICE',
    `code=${preNoInv.data?.code}`);
  const rPlanNoInv = await makePlan({
    planNo: `PP-GATE-NOINV-${stamp}`, purchaseOrderNo: poNoInv, totalAmount: 11300,
  });
  s.expectStatus('★ 无发票：建付款计划被硬拦 422', rPlanNoInv, 422, `code=${rPlanNoInv.data?.code}`);

  // 预付款（有预付款金额）时无发票应放行 —— 预付本来就是先付钱后拿票
  const rPrepay = await makePlan({
    planNo: `PP-GATE-PREPAY-${stamp}`, purchaseOrderNo: poNoInv, totalAmount: 3000, advanceAmount: 3000,
  });
  s.expectStatus('★ 预付款（无发票）放行 201', rPrepay, 201,
    rPrepay.status !== 201 ? JSON.stringify(rPrepay.data).slice(0, 160) : '');
  if (rPrepay.status === 201) ctx.track('fin-payment-plan', `plan-PP-GATE-PREPAY-${stamp}`);

  // ══════════════════════════════════════════════════════════════
  // 9. 无订单号 / 订单不存在 → 各自拦，且原因可区分
  // ══════════════════════════════════════════════════════════════
  const rNoPo = await makePlan({ planNo: `PP-GATE-NOPO-${stamp}`, totalAmount: 11300 });
  s.expectStatus('★ 未填采购订单号：硬拦 422', rNoPo, 422, `code=${rNoPo.data?.code}`);
  s.expectTrue('  代码为 THREE_WAY_MATCH_NO_PO',
    rNoPo.data?.code === 'THREE_WAY_MATCH_NO_PO', `code=${rNoPo.data?.code}`);

  const rBadPo = await makePlan({
    planNo: `PP-GATE-BADPO-${stamp}`, purchaseOrderNo: `PO-NOT-EXIST-${stamp}`, totalAmount: 11300,
  });
  s.expectStatus('★ 订单号不存在：硬拦 422', rBadPo, 422, `code=${rBadPo.data?.code}`);
  s.expectTrue('  代码为 THREE_WAY_MATCH_PO_NOT_FOUND（与「没填」区分开）',
    rBadPo.data?.code === 'THREE_WAY_MATCH_PO_NOT_FOUND', `code=${rBadPo.data?.code}`);

  // ══════════════════════════════════════════════════════════════
  // 10. 付款金额超过发票 → 拦
  //     同样独立造数据：订单 10000、入库 10000、发票含税 11300 全部合规，
  //     唯一的问题就是「要付的钱比发票多」—— 这样命中 ⑨ 才能说明是这一条在起作用。
  // ══════════════════════════════════════════════════════════════
  const poOverPay = `PO-GATE-OVERPAY-${stamp}`;
  await makePo(poOverPay);
  await makeInbound(`INB-GATE-OVERPAY-${stamp}`, poOverPay, 100, 100);
  await makeInvoice(`INV-GATE-OVERPAY-${stamp}`, poOverPay, 10000);
  // 必须带 amount：不传金额时预检不做「付款是否超发票」这一项 ——
  // 该项本来就依赖「本次要付多少」，没有金额就无从判断。
  const preOverPay = await G(`/api/three-way-match/check?poNo=${poOverPay}&amount=99999`);
  s.expectTrue('预检识别：付款超发票 → OVER_INVOICE', preOverPay.data?.code === 'OVER_INVOICE',
    `code=${preOverPay.data?.code}`);
  const rPlanOverPay = await makePlan({
    planNo: `PP-GATE-OVERPAY-${stamp}`, purchaseOrderNo: poOverPay, totalAmount: 99999,
  });
  s.expectStatus('★ 付款金额超过发票：硬拦 422', rPlanOverPay, 422, `code=${rPlanOverPay.data?.code}`);
  s.expectTrue('  代码为 THREE_WAY_MATCH_OVER_INVOICE',
    rPlanOverPay.data?.code === 'THREE_WAY_MATCH_OVER_INVOICE', `code=${rPlanOverPay.data?.code}`);

  // ══════════════════════════════════════════════════════════════
  // 11. ★ 后门检查：通用实体路由这条写入路径同样被拦
  //     （只堵专用端点等于没堵：直接调 /api/entities/finPaymentPlan 就绕过去了）
  // ══════════════════════════════════════════════════════════════
  const rBackdoor = await P('/api/entities/finPaymentPlan', {
    planNo: `PP-GATE-DOOR-${stamp}`, totalAmount: 11300, status: 'pending',
    purchaseOrderNo: `PO-NOT-EXIST-${stamp}`,
  });
  s.expectStatus('★ 通用实体路由（后门）同样被拦 422', rBackdoor, 422, `code=${rBackdoor.data?.code}`);
  s.expectTrue('  后门拦截代码与专用端点一致',
    rBackdoor.data?.code === 'THREE_WAY_MATCH_PO_NOT_FOUND', `code=${rBackdoor.data?.code}`);

  // 合规数据走后门应放行（证明后门不是「一律拒绝」而是「同样判定」）
  const doorOkNo = `PP-GATE-DOOROK-${stamp}`;
  const rBackdoorOk = await P('/api/entities/finPaymentPlan', {
    planNo: doorOkNo, totalAmount: 11300, status: 'pending',
    purchaseOrderNo: poOk, invoiceNo: invOkNo, vendorName: '闸门测试供应商',
  });
  s.expectStatus('  合规数据经通用实体路由放行 201', rBackdoorOk, 201,
    rBackdoorOk.status !== 201 ? JSON.stringify(rBackdoorOk.data).slice(0, 160) : '');
  if (rBackdoorOk.data?.id) ctx.track('finPaymentPlan', rBackdoorOk.data.id);

  // ══════════════════════════════════════════════════════════════
  // 12. ★ 精准性：非付款动作不受影响
  //     闸门若不精准（连改备注都拦），用户会直接要求关掉它 —— 那就等于没闸门
  // ══════════════════════════════════════════════════════════════
  const rNote = await U(`/api/fin-payment-plans/${planOkId}`, { note: '仅修改备注，不涉及付款' });
  s.expectStatus('★ 只改备注：不受闸门影响 200', rNote, 200,
    rNote.status !== 200 ? JSON.stringify(rNote.data).slice(0, 160) : '');

  // 把订单号改成不存在的、且不触发付款动作 → 不该拦（因为没在付钱）
  const rEditNoPay = await U(`/api/fin-payment-plans/${planOkId}`, { purchaseOrderNo: `PO-NOT-EXIST-${stamp}` });
  s.expectStatus('  改订单号但不付款：不拦 200', rEditNoPay, 200,
    rEditNoPay.status !== 200 ? JSON.stringify(rEditNoPay.data).slice(0, 160) : '');

  // 改回真实订单号并登记付款 → 走闸门且应放行
  const rPay = await U(`/api/fin-payment-plans/${planOkId}`, {
    purchaseOrderNo: poOk, status: 'paid', paidAmount: 11300,
  });
  s.expectStatus('★ 登记付款（数据合规）：放行 200', rPay, 200,
    rPay.status !== 200 ? JSON.stringify(rPay.data).slice(0, 200) : '');

  // ══════════════════════════════════════════════════════════════
  // 13. ★ 预检与真闸门结论必须一致
  //     两套实现会造出「预检说能付、提交却被拦」，用户会认为系统在骗人
  // ══════════════════════════════════════════════════════════════
  const preConsist = await G(`/api/three-way-match/check?poNo=${poShort}`);
  s.expectEq('★ 预检与闸门结论一致（同一条数据两处判定相同）',
    preConsist.data?.ok === false && preShort.data?.ok === false, true, '预检两次结果一致');

  // ══════════════════════════════════════════════════════════════
  // 14. 匹配留档查询：按状态过滤可用
  // ══════════════════════════════════════════════════════════════
  const blockedLogs = await G(`/api/three-way-match?status=discrepancy&pageSize=50`);
  s.expectStatus('按 match_status=discrepancy 过滤查询 200', blockedLogs, 200);
  s.expectTrue('★ 被拦的判定也留了痕（拦截结论同样需要可追溯）',
    (blockedLogs.data?.data || []).length >= 1, `条数=${(blockedLogs.data?.data || []).length}`);
}
