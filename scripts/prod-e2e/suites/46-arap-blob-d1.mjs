// 套件 46 · 应收应付台账 + Blob 残余迁 D1 关系表（V3.76.0 / 迁移 0100）
// 覆盖：5 个新资源（receivable/payable/consignment/purchaseInfoRecord/salesQuotation）的
//       列表契约 / 未登录拒绝 / 建单 201 / 字段读回（camel 映射）/ 更新 / 删除 404 /
//       报价单 extra_json 明细（items）往返 / 组织隔离（越组织读 404）
// 背景：迁移前这 4 处数据是整状态 Blob（arap/consignment/purchase-info-record/sales-adv），
//       换设备即丢、多用户互不可见；本套件守住「迁 D1 后通用实体路由全链路可用」。
export const meta = { id: '46-arap-blob-d1', title: '应收应付+Blob 迁 D1 关系表（5 资源 CRUD/契约/隔离）' };

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now();
  const cleanup = [];

  // ══════════════════════════════════════════════════════════════
  // 1. 列表契约 + 未登录拒绝（鉴权漏 await 会在这里现形）
  // ══════════════════════════════════════════════════════════════
  const RESOURCES = [
    ['receivable', '应收台账'],
    ['payable', '应付台账'],
    ['consignment', '寄售库存'],
    ['purchaseInfoRecord', '采购信息记录'],
    ['salesQuotation', '销售报价'],
  ];
  for (const [res, label] of RESOURCES) {
    const r = await req('GET', `/api/entities/${res}`, { token });
    if (s.expectStatus(`GET /api/entities/${res}（${label}）返回 200`, r, 200)) {
      s.expectListShape(`  └ ${res} 列表契约 {data,total,page,pageSize}`, r);
    }
    const anon = await req('GET', `/api/entities/${res}`);
    s.expectStatus(`  └ 未登录访问 ${res} 被拒 401`, anon, 401);
  }

  // ══════════════════════════════════════════════════════════════
  // 2. 应收台账：建单 201 + 字段读回 + 更新 + 删除 404
  // ══════════════════════════════════════════════════════════════
  const arId = `ar-e2e-${stamp}`;
  const arBody = {
    id: arId,
    customerId: 'cust-e2e', customerName: 'E2E 客户',
    invoiceNo: `SI-E2E-${stamp}`, amount: 120000, paidAmount: 20000, balance: 100000,
    dueDate: '2026-12-31', agingBucket: 'current', status: 'partial', remarks: 'E2E 应收备注',
  };
  const arc = await req('POST', '/api/entities/receivable', { token, body: arBody });
  const arcOk = s.expectStatus('★ 创建应收台账返回 201', arc, 201,
    arc.status !== 201 ? JSON.stringify(arc.data).slice(0, 160) : '');
  if (arcOk) cleanup.push({ path: '/api/entities/receivable', id: arId });

  const arg = await req('GET', `/api/entities/receivable/${arId}`, { token });
  if (s.expectStatus('GET 应收单条返回 200', arg, 200) && arg.data) {
    const d = arg.data;
    s.expectEq('  读回 invoiceNo', String(d.invoiceNo), arBody.invoiceNo);
    s.expectEq('  读回 customerId', String(d.customerId), 'cust-e2e');
    s.expectEq('  读回 amount', Number(d.amount), 120000);
    s.expectEq('  读回 balance', Number(d.balance), 100000);
    s.expectEq('  读回 agingBucket', String(d.agingBucket), 'current');
    s.expectEq('  读回 status', String(d.status), 'partial');
    s.expectEq('  读回 dueDate', String(d.dueDate), '2026-12-31');
  }

  const aru = await req('PUT', `/api/entities/receivable/${arId}`, {
    token, body: { paidAmount: 50000, balance: 70000, status: 'partial' },
  });
  s.expectStatus('PUT 应收返回 200', aru, 200);
  const arg2 = await req('GET', `/api/entities/receivable/${arId}`, { token });
  if (arg2.status === 200 && arg2.data) {
    s.expectEq('  更新后 paidAmount 已变', Number(arg2.data.paidAmount), 50000);
    s.expectEq('  未传的 invoiceNo 未被清空', String(arg2.data.invoiceNo), arBody.invoiceNo);
  } else {
    s.fail('更新后重新读回应收', `status=${arg2.status}`);
  }

  // 组织隔离：跨组织超管读不到（默认拒绝而非泄漏；超管凭据缺失时降级跳过）
  if (ctx.supervisor?.token) {
    const arOther = await req('GET', `/api/entities/receivable/${arId}`, { token: ctx.supervisor.token });
    s.expectTrue('  跨组织读应收单条不泄漏（404 或空）',
      arOther.status === 404 || (arOther.status === 200 && arOther.data == null),
      `status=${arOther.status}`);
  } else {
    s.warn('跨组织隔离验证跳过：supervisor 凭据缺失（测试架构局限，非后端缺陷）');
  }

  // ══════════════════════════════════════════════════════════════
  // 3. 应付台账：建单 + paymentDate 字段 + 删除
  // ══════════════════════════════════════════════════════════════
  const apId = `ap-e2e-${stamp}`;
  const apBody = {
    id: apId,
    vendorId: 'vend-e2e', vendorName: 'E2E 供应商',
    invoiceNo: `PI-E2E-${stamp}`, amount: 60000, paidAmount: 0, balance: 60000,
    dueDate: '2026-11-30', agingBucket: 'current', status: 'open',
  };
  const apc = await req('POST', '/api/entities/payable', { token, body: apBody });
  const apcOk = s.expectStatus('★ 创建应付台账返回 201', apc, 201,
    apc.status !== 201 ? JSON.stringify(apc.data).slice(0, 160) : '');
  if (apcOk) cleanup.push({ path: '/api/entities/payable', id: apId });

  const apg = await req('GET', `/api/entities/payable/${apId}`, { token });
  if (s.expectStatus('GET 应付单条返回 200', apg, 200) && apg.data) {
    s.expectEq('  读回 invoiceNo', String(apg.data.invoiceNo), apBody.invoiceNo);
    s.expectEq('  读回 vendorId', String(apg.data.vendorId), 'vend-e2e');
    s.expectEq('  读回 balance', Number(apg.data.balance), 60000);
  }
  const apd = await req('DELETE', `/api/entities/payable/${apId}`, { token });
  s.expectStatus('DELETE 应付返回 200', apd, 200);
  const apg2 = await req('GET', `/api/entities/payable/${apId}`, { token });
  s.expectStatus('删除后再查应付返回 404', apg2, 404);
  const apIdx = cleanup.findIndex((c) => c.id === apId);
  if (apIdx >= 0) cleanup.splice(apIdx, 1);

  // ══════════════════════════════════════════════════════════════
  // 4. 寄售库存：数量三件套（consigned/consumed/balance）+ 更新
  // ══════════════════════════════════════════════════════════════
  const csId = `cs-e2e-${stamp}`;
  const csBody = {
    id: csId,
    vendorId: 'V-e2e', vendorName: 'E2E 寄售供应商', vendorCode: 'VCS-E2E',
    materialId: 'M-e2e', materialCode: 'MAT-E2E', materialName: 'E2E 寄售物料',
    specification: 'E2E 规格', unit: '吨',
    agreedUnitPrice: 5000, consignedQty: 100, consumedQty: 30, balanceQty: 70,
    warehouseId: 'WH-e2e', warehouseName: 'E2E 仓',
  };
  const csc = await req('POST', '/api/entities/consignment', { token, body: csBody });
  const cscOk = s.expectStatus('★ 创建寄售库存返回 201', csc, 201,
    csc.status !== 201 ? JSON.stringify(csc.data).slice(0, 160) : '');
  if (cscOk) cleanup.push({ path: '/api/entities/consignment', id: csId });

  const csg = await req('GET', `/api/entities/consignment/${csId}`, { token });
  if (s.expectStatus('GET 寄售单条返回 200', csg, 200) && csg.data) {
    s.expectEq('  读回 consignedQty', Number(csg.data.consignedQty), 100);
    s.expectEq('  读回 consumedQty', Number(csg.data.consumedQty), 30);
    s.expectEq('  读回 balanceQty', Number(csg.data.balanceQty), 70);
    s.expectEq('  读回 agreedUnitPrice', Number(csg.data.agreedUnitPrice), 5000);
    s.expectEq('  读回 materialCode', String(csg.data.materialCode), 'MAT-E2E');
  }
  const csu = await req('PUT', `/api/entities/consignment/${csId}`, {
    token, body: { consumedQty: 50, balanceQty: 50 },
  });
  s.expectStatus('PUT 寄售返回 200', csu, 200);
  const csg2 = await req('GET', `/api/entities/consignment/${csId}`, { token });
  if (csg2.status === 200 && csg2.data) {
    s.expectEq('  消耗结算后 balanceQty 已变', Number(csg2.data.balanceQty), 50);
  } else {
    s.fail('更新后重新读回寄售', `status=${csg2.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 5. 采购信息记录：价格/货期字段 + 状态
  // ══════════════════════════════════════════════════════════════
  const irId = `ir-e2e-${stamp}`;
  const irBody = {
    id: irId,
    vendorId: 'vend-e2e', vendorName: 'E2E 供应商',
    materialId: 'M-e2e', materialCode: 'MAT-E2E', materialName: 'E2E 物料',
    specification: 'E2E 规格', unit: '吨',
    unitPrice: 4100, currency: 'CNY',
    validFrom: '2026-01-01', validTo: '2026-12-31',
    minQty: 1, leadTime: 7, purchasingGroup: 'PG01', status: 'active',
  };
  const irc = await req('POST', '/api/entities/purchaseInfoRecord', { token, body: irBody });
  const ircOk = s.expectStatus('★ 创建采购信息记录返回 201', irc, 201,
    irc.status !== 201 ? JSON.stringify(irc.data).slice(0, 160) : '');
  if (ircOk) cleanup.push({ path: '/api/entities/purchaseInfoRecord', id: irId });

  const irg = await req('GET', `/api/entities/purchaseInfoRecord/${irId}`, { token });
  if (s.expectStatus('GET 采购信息记录单条返回 200', irg, 200) && irg.data) {
    s.expectEq('  读回 unitPrice', Number(irg.data.unitPrice), 4100);
    s.expectEq('  读回 leadTime', Number(irg.data.leadTime), 7);
    s.expectEq('  读回 validFrom', String(irg.data.validFrom), '2026-01-01');
    s.expectEq('  读回 status', String(irg.data.status), 'active');
    s.expectEq('  读回 purchasingGroup', String(irg.data.purchasingGroup), 'PG01');
  }

  // ══════════════════════════════════════════════════════════════
  // 6. 销售报价：头部金额列 + extra_json 明细 items 往返
  //    （items 封 extra_json 是与 salesContract 一致的范式，读回必须原样拆出）
  // ══════════════════════════════════════════════════════════════
  const qId = `q-e2e-${stamp}`;
  const qItems = [
    { id: `qi-e2e-${stamp}-1`, materialId: 'M-e2e', materialCode: 'MAT-E2E', materialName: 'E2E 物料', unit: '吨', quantity: 100, unitPrice: 42, amount: 4200 },
  ];
  // 注意：明细 items 是未登记列，通用路由 pickSnake 只挑已登记列——
  // 与前端 store 的 packQuotation 一致，必须打成 extraJson（JSON 串）入参，
  // 读回时 rowToCamel 给回 extraJson，store 的 unpackQuotation 再拆出 items。
  const qBody = {
    id: qId,
    quotationNo: `Q-E2E-${stamp}`,
    customerName: 'E2E 报价客户', customerCode: 'CUST-E2E', customerId: 'cust-e2e',
    status: 'draft', validUntil: '2026-12-31', currency: 'CNY',
    totalAmount: 4200, taxRate: 13, taxAmount: 546, grandTotal: 4746,
    salesPerson: 'E2E 销售员', remarks: 'E2E 报价备注',
    extraJson: JSON.stringify({ items: qItems }),
  };
  const qc = await req('POST', '/api/entities/salesQuotation', { token, body: qBody });
  const qcOk = s.expectStatus('★ 创建销售报价返回 201', qc, 201,
    qc.status !== 201 ? JSON.stringify(qc.data).slice(0, 160) : '');
  if (qcOk) cleanup.push({ path: '/api/entities/salesQuotation', id: qId });

  const qg = await req('GET', `/api/entities/salesQuotation/${qId}`, { token });
  if (s.expectStatus('GET 报价单条返回 200', qg, 200) && qg.data) {
    const d = qg.data;
    s.expectEq('  读回 quotationNo', String(d.quotationNo), qBody.quotationNo);
    s.expectEq('  读回 grandTotal', Number(d.grandTotal), 4746);
    s.expectEq('  读回 customerId', String(d.customerId), 'cust-e2e');
    s.expectEq('  读回 status', String(d.status), 'draft');
    // extra_json 明细往返：服务端只存/返 extraJson 串，拆出 items 是前端 store 的职责，
    // 这里验证「串在、内容对」——store 的 unpackQuotation 才能拆出可渲染的明细。
    let extra = {};
    try { extra = d.extraJson ? JSON.parse(d.extraJson) : {}; } catch { extra = {}; }
    s.expectTrue('  ★ extra_json 往返含 items 明细（数量对）',
      Array.isArray(extra.items) && extra.items.length === 1,
      `extraJson=${String(d.extraJson)?.slice(0, 120)}`);
    if (Array.isArray(extra.items) && extra.items.length === 1) {
      s.expectEq('  └ items[0].quantity', Number(extra.items[0].quantity), 100);
      s.expectEq('  └ items[0].unitPrice', Number(extra.items[0].unitPrice), 42);
      s.expectEq('  └ items[0].materialCode', String(extra.items[0].materialCode), 'MAT-E2E');
    }
  }

  // 报价转订单状态回写（convertQuotationToSO 的 PUT 路径）
  const qu = await req('PUT', `/api/entities/salesQuotation/${qId}`, {
    token, body: { status: 'converted', convertedOrderId: 'so-e2e', convertedOrderNo: `SO-E2E-${stamp}` },
  });
  s.expectStatus('PUT 报价（转订单状态）返回 200', qu, 200);
  const qg2 = await req('GET', `/api/entities/salesQuotation/${qId}`, { token });
  if (qg2.status === 200 && qg2.data) {
    s.expectEq('  读回 status=converted', String(qg2.data.status), 'converted');
    s.expectEq('  读回 convertedOrderNo', String(qg2.data.convertedOrderNo), `SO-E2E-${stamp}`);
  } else {
    s.fail('更新后重新读回报价', `status=${qg2.status}`);
  }

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
