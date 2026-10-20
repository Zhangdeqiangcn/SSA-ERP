// 套件 28 · 生产倒冲发料（完工按 BOM 自动扣原料）
// ------------------------------------------------------------------
// 覆盖 V3.20.0「把倒冲发料下沉到服务端」这一改动（对标差距 13）。
//
// 为什么必须打真实端点：
//   functions/ 不在前端 tsc 覆盖内（项目硬规矩 ㉗）。倒冲涉及
//   「多级 BOM 展开、已领料差额、SQL 绑定参数、UPSERT 冲突目标、
//     幂等标记、并发重试」这几类只在运行时才暴露的问题。
//
// 本套件要证明的十件事：
//   ① 完工后原料库存真的减少了（不是只在界面上说扣了）
//   ② 多级展开口径正确：含废品率、含 child_product_code 引用的子装配
//   ③ 虚项(phantom) 本身不领料（与 BOM 详情页的领料清单同一口径）
//   ④ 子装配引用行本身不是物料，不被当成叶子扣料
//   ⑤ 已手工领料的部分不重复扣，只补差额
//   ⑥ 应耗用已被领料覆盖时，标记为「已覆盖」而不是报错
//   ⑦ 没有 BOM 时**不阻断开完工**，只是不倒冲（补账动作不能变成门槛）
//   ⑧ 幂等：完工后再改单（如关闭工单）不会重复扣料
//   ⑨ 直接以「已完工」状态建单（导入/集成路径）同样会倒冲
//   ⑩ 扣料留痕：出库单 + 领料台账的倒冲份额 + 工单上的出库单号，三处都能追
//
// 安全：全部写操作发生在 run 级隔离组织内（E2E-<runId>），跑完自动清理。
export const meta = { id: '28-work-order-backflush', title: '生产倒冲发料（完工自动扣原料）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const stamp = runId || String(Date.now());
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });
  const U = (p, body) => req('PUT', p, { token, body });

  const codeOf = (kind, tail) => `${kind}-E2E-${stamp}-${tail}`;

  // ══════════════════════════════════════════════════════════════
  // 1. 前置：4 个物料（原料A、原料B、虚项料、子装配料）+ 2 张 BOM（主 + 子装配）
  //    每个物料都**建了物料主数据并给了库存** —— 这一点很关键：
  //    如果虚项/子装配料没有主数据，即使代码把它错当成叶子扣料，也会因为
  //    「找不到物料」而跳过，测试就会假通过。给了主数据与库存，才能真证规则生效。
  // ══════════════════════════════════════════════════════════════
  const matRows = [
    { code: codeOf('MAT', 'A'), name: 'E2E 原料A', stock: 1000, avgPrice: 10 },
    { code: codeOf('MAT', 'B'), name: 'E2E 原料B', stock: 500, avgPrice: 20 },
    { code: codeOf('MAT', 'PH'), name: 'E2E 虚项料（不应被领用）', stock: 300, avgPrice: 5 },
    { code: codeOf('MAT', 'SUB'), name: 'E2E 子装配料（不应被领用）', stock: 300, avgPrice: 7 },
    { code: codeOf('MAT', 'MISSING'), name: 'E2E 料号存在', stock: 100, avgPrice: 3 },
  ];
  const matId = {};
  for (const r of matRows) {
    const res = await P('/api/materials', {
      code: r.code,
      name: r.name,
      specification: 'E2E-SPEC',
      unit: '件',
      status: 'active',
      currentStock: r.stock,
      movingAvgPrice: r.avgPrice,
      stockValue: r.stock * r.avgPrice,
      price: r.avgPrice,
    });
    if (res.data?.id) {
      matId[r.code] = res.data.id;
      ctx.track('material', res.data.id);
    }
  }
  s.expectEq('前置：物料主数据全部创建成功', Object.keys(matId).length, matRows.length, '创建数');

  /** 逐项读回库存（用列表接口按 keyword 精确取回） */
  const stockOf = async (code) => {
    const r = await G(`/api/materials?keyword=${encodeURIComponent(code)}&pageSize=50`);
    const hit = (r.data?.data || []).find((m) => m.code === code);
    return hit ? Number(hit.currentStock) : null;
  };

  const prodCode = codeOf('PRD', 'MAIN');
  const subCode = codeOf('PRD', 'SUB');

  // 子装配 BOM：productCode = 子装配产品 → 其下 1 件原料B
  const bomSubNo = codeOf('BOM', 'SUB');
  const bomSub = await P('/api/bom', {
    bomNo: bomSubNo,
    name: 'E2E 子装配清单',
    productCode: subCode,
    productName: 'E2E 子装配产品',
    status: 'released',
    version: 'V1.0',
    items: [
      { level: 1, sequence: 10, materialId: matId[matRows[1].code], materialCode: matRows[1].code, materialName: matRows[1].name, unit: '件', quantity: 1, scrapRate: 0, source: 'purchase' },
    ],
  });
  s.expectStatus('前置：子装配 BOM 创建 201', bomSub, 201);
  if (bomSub.data?.id) ctx.track('bom', bomSub.data.id);

  // 主 BOM：4 行，分别验证「正常用量 / 废品率 / 虚项 / 子装配引用」
  const bomMainNo = codeOf('BOM', 'MAIN');
  const bomMain = await P('/api/bom', {
    bomNo: bomMainNo,
    name: 'E2E 主清单',
    productCode: prodCode,
    productName: 'E2E 主产品',
    status: 'released',
    version: 'V1.0',
    items: [
      { level: 1, sequence: 10, materialId: matId[matRows[0].code], materialCode: matRows[0].code, materialName: matRows[0].name, unit: '件', quantity: 2, scrapRate: 0, source: 'purchase' },
      { level: 1, sequence: 20, materialId: matId[matRows[1].code], materialCode: matRows[1].code, materialName: matRows[1].name, unit: '件', quantity: 1, scrapRate: 10, source: 'purchase' },
      { level: 1, sequence: 30, materialId: matId[matRows[2].code], materialCode: matRows[2].code, materialName: matRows[2].name, unit: '件', quantity: 5, scrapRate: 0, source: 'phantom' },
      { level: 1, sequence: 40, materialId: matId[matRows[3].code], materialCode: matRows[3].code, materialName: matRows[3].name, unit: '件', quantity: 1, scrapRate: 0, source: 'manufacture', childProductCode: subCode },
    ],
  });
  s.expectStatus('前置：主 BOM 创建 201', bomMain, 201);
  if (bomMain.data?.id) ctx.track('bom', bomMain.data.id);

  // ══════════════════════════════════════════════════════════════
  // 2. 主场景：完工 10 件 → 预期应耗用
  //      原料A = 2 × 10           = 20
  //      原料B = 1 × 1.1 × 10     = 11（含 10% 废品率）
  //              + 子装配 1 × 1 × 10 = 10  → 合计 21
  //      虚项料 = 不领料（0）
  //      子装配料 = 不是叶子物料（0）
  // ══════════════════════════════════════════════════════════════
  const stockABefore = await stockOf(matRows[0].code);
  const stockBBefore = await stockOf(matRows[1].code);
  const stockPHBefore = await stockOf(matRows[2].code);
  const stockSUBBefore = await stockOf(matRows[3].code);

  const woNo = codeOf('WO', 'MAIN');
  const wo = await P('/api/work-orders', {
    orderNo: woNo,
    status: 'in_progress',
    productCode: prodCode,
    productName: 'E2E 主产品',
    bomNo: bomMainNo,
    materialId: matId[matRows[0].code],
    plannedQuantity: 10,
    completedQuantity: 0,
    scrapQuantity: 0,
    plannedStartDate: '2026-09-01',
    plannedEndDate: '2026-09-10',
    priority: 'normal',
    workshop: 'E2E 车间',
    supervisor: 'E2E 主管',
  });
  s.expectStatus('前置：工单创建 201', wo, 201);
  const woId = wo.data?.id;
  if (woId) ctx.track('work-order', woId);

  const done = await U(`/api/work-orders/${woId}`, {
    status: 'completed',
    completedQuantity: 10,
    qualifiedQuantity: 10,
    scrapQuantity: 0,
    actualEndDate: '2026-09-10',
  });
  s.expectStatus('★ 工单完工 200', done, 200,
    done.status !== 200 ? JSON.stringify(done.data).slice(0, 200) : '');

  const bf = done.data?.backflush;
  s.expectTrue('★ 完工响应带回倒冲结果（不是悄悄扣）', !!bf, bf ? `code=${bf.code}` : '无 backflush 字段');
  s.expectTrue('★ 倒冲已扣账（posted=true）', bf?.posted === true, bf ? `code=${bf.code} message=${bf.message}` : '');

  const lineOf = (code) => (bf?.lines || []).find((l) => l.materialCode === code) || {};

  const la = lineOf(matRows[0].code);
  s.expectEq('★ 原料A 应耗用（2 × 完工10）', la.requiredQty, 20, '应耗用');
  s.expectEq('★ 原料A 实际倒冲扣减量', la.backflushQty, 20, '倒冲量');

  const lb = lineOf(matRows[1].code);
  s.expectEq('★ 原料B 应耗用（含10%废品率 + 子装配引用，1×1.1×10 + 1×1×10）', lb.requiredQty, 21, '应耗用');
  s.expectEq('★ 原料B 实际倒冲扣减量', lb.backflushQty, 21, '倒冲量');

  const lph = lineOf(matRows[2].code);
  s.expectEq('★ 虚项(phantom) 本身不领料 —— 不扣减', lph.backflushQty, 0, '倒冲量');
  s.expectTrue('★ 虚项被明确标为「虚项透传」而非静默忽略',
    lph.outcome === 'phantom_skipped', `outcome=${lph.outcome}`);

  const lsub = lineOf(matRows[3].code);
  s.expectEq('★ 子装配引用行本身不扣料（已展开为其子件）', lsub.backflushQty, 0, '倒冲量');
  s.expectTrue('★ 子装配行被明确标为「已展开」而非静默消失',
    lsub.outcome === 'expanded', `outcome=${lsub.outcome}`);

  // ══════════════════════════════════════════════════════════════
  // 3. ★ 库存真的减少了（这是本套件的核心：不是只回一个 JSON）
  // ══════════════════════════════════════════════════════════════
  const stockAAfter = await stockOf(matRows[0].code);
  const stockBAfter = await stockOf(matRows[1].code);
  const stockPHAfter = await stockOf(matRows[2].code);
  const stockSUBAfter = await stockOf(matRows[3].code);

  s.expectEq('★ 原料A 库存已扣减 20', stockAAfter, (stockABefore ?? 0) - 20, '库存');
  s.expectEq('★ 原料B 库存已扣减 21', stockBAfter, (stockBBefore ?? 0) - 21, '库存');
  s.expectEq('★ 虚项料库存**未变**（不领料才是对的）', stockPHAfter, stockPHBefore, '库存');
  s.expectEq('★ 子装配料库存**未变**（不是叶子物料）', stockSUBAfter, stockSUBBefore, '库存');

  // ══════════════════════════════════════════════════════════════
  // 4. 留痕三处可追：出库单 / 领料台账倒冲份额 / 工单上的出库单号
  // ══════════════════════════════════════════════════════════════
  s.expectTrue('留痕：工单上记下了倒冲出库单号', !!done.data?.backflush_outbound_no || !!bf?.outboundNo,
    `outboundNo=${bf?.outboundNo || done.data?.backflush_outbound_no}`);
  s.expectEq('留痕：工单已标记 inventory_posted', Number(done.data?.inventory_posted), 1, 'inventory_posted');

  const outboundNo = bf?.outboundNo || '';
  const obList = await G(`/api/outbound-orders?keyword=${encodeURIComponent(outboundNo)}&pageSize=20`);
  s.expectStatus('留痕：倒冲出库单可查 200', obList, 200);
  const obHit = (obList.data?.data || []).find((o) => o.outbound_no === outboundNo);
  s.expectTrue('留痕：倒冲出库单确实存在且类型为生产领料(pick)', !!obHit && obHit.type === 'pick',
    obHit ? `type=${obHit.type} sourceNo=${obHit.source_no}` : '未查到');
  if (obHit?.id) ctx.track('outbound-order', obHit.id);

  const picking = await G(`/api/work-orders/picking?workOrderId=${woId}&pageSize=50`);
  s.expectStatus('留痕：工单领料台账可查 200', picking, 200);
  const pkA = (picking.data?.data || []).find((p) => p.material_code === matRows[0].code);
  s.expectTrue('留痕：领料台账记录了倒冲份额（与手工领料分开记）', !!pkA, pkA ? `qty=${pkA.quantity}` : '未查到');
  s.expectEq('留痕：倒冲份额与实扣一致', Number(pkA?.backflush_quantity), 20, 'backflush_quantity');

  // ══════════════════════════════════════════════════════════════
  // 5. ★ 幂等：完工后再改单（关闭工单）不得重复扣料
  // ══════════════════════════════════════════════════════════════
  const close = await U(`/api/work-orders/${woId}`, { status: 'closed' });
  s.expectStatus('幂等：完工后可继续关闭 200', close, 200);
  s.expectTrue('幂等：关闭单不重复触发倒冲', !close.data?.backflush, '关闭响应不含 backflush');

  const stockAAfter2 = await stockOf(matRows[0].code);
  s.expectEq('★ 幂等：再次改单后原料A库存未再减少', stockAAfter2, stockAAfter, '库存');

  // ══════════════════════════════════════════════════════════════
  // 6. ★ 已手工领料的部分不重复扣（只补差额）
  // ══════════════════════════════════════════════════════════════
  const woNo2 = codeOf('WO', 'PARTIAL');
  const wo2 = await P('/api/work-orders', {
    orderNo: woNo2, status: 'in_progress', productCode: prodCode, productName: 'E2E 主产品',
    bomNo: bomMainNo, materialId: matId[matRows[0].code], plannedQuantity: 10, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  const wo2Id = ctx.track('work-order', wo2.data?.id);
  s.expectStatus('前置：第二张工单创建 201', wo2, 201);

  // 手工先领 8 件原料A（应耗用 20，剩 12 由倒冲补）
  const pickRes = await P('/api/work-orders/picking', {
    workOrderId: wo2Id, workOrderNo: woNo2,
    materialId: matId[matRows[0].code], materialCode: matRows[0].code, materialName: matRows[0].name,
    unit: '件', quantity: 8, outboundNo: `OUT-MANUAL-${stamp}`, issuedAt: '2026-09-05',
  });
  s.expectStatus('前置：手工领料 8 件创建成功', pickRes, [200, 201],
    pickRes.status !== 200 && pickRes.status !== 201 ? JSON.stringify(pickRes.data).slice(0, 200) : '');
  if (pickRes.data?.id) ctx.track('picking', pickRes.data.id);

  const stockA3 = await stockOf(matRows[0].code);
  const done2 = await U(`/api/work-orders/${wo2Id}`, {
    status: 'completed', completedQuantity: 10, qualifiedQuantity: 10, scrapQuantity: 0, actualEndDate: '2026-09-10',
  });
  s.expectStatus('完工（含部分手工领料）200', done2, 200);
  const bf2 = done2.data?.backflush;
  const la2 = (bf2?.lines || []).find((l) => l.materialCode === matRows[0].code) || {};
  s.expectEq('★ 已手工领用数量被识别', la2.issuedQty, 8, '已领用量');
  s.expectEq('★ 只补差额：应耗用20 − 已领8 = 12', la2.backflushQty, 12, '倒冲量');
  const stockA4 = await stockOf(matRows[0].code);
  s.expectEq('★ 库存只再减 12（不重复扣 20）', stockA4, (stockA3 ?? 0) - 12, '库存');

  // ══════════════════════════════════════════════════════════════
  // 7. ★ 应耗用已被手工领料完全覆盖 → 标记「已覆盖」，不报错也不扣
  // ══════════════════════════════════════════════════════════════
  const woNo3 = codeOf('WO', 'COVERED');
  const wo3 = await P('/api/work-orders', {
    orderNo: woNo3, status: 'in_progress', productCode: prodCode, productName: 'E2E 主产品',
    bomNo: bomMainNo, materialId: matId[matRows[0].code], plannedQuantity: 10, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  const wo3Id = ctx.track('work-order', wo3.data?.id);
  const pk3 = await P('/api/work-orders/picking', {
    workOrderId: wo3Id, workOrderNo: woNo3,
    materialId: matId[matRows[0].code], materialCode: matRows[0].code, materialName: matRows[0].name,
    unit: '件', quantity: 20, outboundNo: `OUT-MANUAL2-${stamp}`, issuedAt: '2026-09-05',
  });
  if (pk3.data?.id) ctx.track('picking', pk3.data.id);
  const stockA5 = await stockOf(matRows[0].code);
  const done3 = await U(`/api/work-orders/${wo3Id}`, {
    status: 'completed', completedQuantity: 10, qualifiedQuantity: 10, scrapQuantity: 0, actualEndDate: '2026-09-10',
  });
  s.expectStatus('完工（应耗用已被领料覆盖）200', done3, 200);
  const la3 = (done3.data?.backflush?.lines || []).find((l) => l.materialCode === matRows[0].code) || {};
  s.expectEq('★ 被覆盖项倒冲量为 0', la3.backflushQty, 0, '倒冲量');
  s.expectTrue('★ 被覆盖项标记为 covered（正常业务，不是错误）', la3.outcome === 'covered', `outcome=${la3.outcome}`);
  const stockA6 = await stockOf(matRows[0].code);
  s.expectEq('★ 被覆盖项库存不再变动', stockA6, stockA5, '库存');

  // ══════════════════════════════════════════════════════════════
  // 8. ★ 没有 BOM 时：不阻断完工，只是不倒冲
  //     把补账动作做成门槛，结果一定是有人把功能关掉（比没做更糟）
  // ══════════════════════════════════════════════════════════════
  const woNo4 = codeOf('WO', 'NOBOM');
  const wo4 = await P('/api/work-orders', {
    orderNo: woNo4, status: 'in_progress', productCode: `${prodCode}-NOBOM`, productName: 'E2E 无清单产品',
    materialId: matId[matRows[0].code], plannedQuantity: 5, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  const wo4Id = ctx.track('work-order', wo4.data?.id);
  const done4 = await U(`/api/work-orders/${wo4Id}`, {
    status: 'completed', completedQuantity: 5, qualifiedQuantity: 5, scrapQuantity: 0, actualEndDate: '2026-09-10',
  });
  s.expectStatus('★ 无 BOM 时完工仍然成功（不阻断业务）200', done4, 200,
    done4.status !== 200 ? JSON.stringify(done4.data).slice(0, 200) : '');
  s.expectEq('★ 无 BOM 时倒冲结论为 NO_BOM', done4.data?.backflush?.code, 'NO_BOM', 'code');
  s.expectTrue('★ 无 BOM 时不扣任何料（posted=false）', done4.data?.backflush?.posted === false, 'posted');
  s.expectEq('无 BOM 时工单未被标记已过账（可人工补领料）', Number(done4.data?.inventory_posted), 0, 'inventory_posted');

  // ══════════════════════════════════════════════════════════════
  // 9. ★ 直接以「已完工」状态建单（导入 / 第三方集成路径）同样倒冲 —— 后门也要堵
  // ══════════════════════════════════════════════════════════════
  const woNo5 = codeOf('WO', 'CREATEDONE');
  const stockA7 = await stockOf(matRows[0].code);
  const wo5 = await P('/api/work-orders', {
    orderNo: woNo5, status: 'completed', productCode: prodCode, productName: 'E2E 主产品',
    bomNo: bomMainNo, materialId: matId[matRows[0].code], plannedQuantity: 5, completedQuantity: 5, qualifiedQuantity: 5, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  s.expectStatus('★ 直接以已完工建单 201', wo5, 201);
  const wo5Id = ctx.track('work-order', wo5.data?.id);
  s.expectTrue('★ 建单即完工也执行了倒冲（后门同样生效）', wo5.data?.backflush?.posted === true,
    `code=${wo5.data?.backflush?.code}`);
  const stockA8 = await stockOf(matRows[0].code);
  s.expectEq('★ 建单即完工：原料A 库存已扣 10（2 × 完工5）', stockA8, (stockA7 ?? 0) - 10, '库存');

  // ══════════════════════════════════════════════════════════════
  // 10. 未完工的工单不得倒冲（状态不满足）
  // ══════════════════════════════════════════════════════════════
  const woNo6 = codeOf('WO', 'DRAFT');
  const wo6 = await P('/api/work-orders', {
    orderNo: woNo6, status: 'draft', productCode: prodCode, productName: 'E2E 主产品',
    bomNo: bomMainNo, materialId: matId[matRows[0].code], plannedQuantity: 3, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  ctx.track('work-order', wo6.data?.id);
  s.expectTrue('未完工建单不倒冲（草稿状态）', !wo6.data?.backflush, '无 backflush 字段');

  // ══════════════════════════════════════════════════════════════
  // 11. 料号在物料主数据中不存在 → 明确标记，不静默丢
  //     造假：把「存在」的那个料号删掉，让 BOM 里出现一个不存在的料号
  // ══════════════════════════════════════════════════════════════
  const missingCode = matRows[4].code;
  const delMissing = await req('DELETE', `/api/materials/${matId[missingCode]}`, { token });
  s.expectStatus('前置：删除待测料号的主数据 200', delMissing, 200);
  const bomMissNo = codeOf('BOM', 'MISSING');
  const bomMiss = await P('/api/bom', {
    bomNo: bomMissNo, name: 'E2E 缺主数据清单', productCode: `${prodCode}-MISS`, productName: 'E2E 缺料产品',
    status: 'released', version: 'V1.0',
    items: [
      { level: 1, sequence: 10, materialCode: missingCode, materialName: 'E2E 料号存在', unit: '件', quantity: 3, scrapRate: 0, source: 'purchase' },
    ],
  });
  if (bomMiss.data?.id) ctx.track('bom', bomMiss.data.id);
  const woNo7 = codeOf('WO', 'MISSING');
  const wo7 = await P('/api/work-orders', {
    orderNo: woNo7, status: 'in_progress', productCode: `${prodCode}-MISS`, productName: 'E2E 缺料产品',
    bomNo: bomMissNo, materialId: matId[matRows[0].code], plannedQuantity: 2, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  const wo7Id = ctx.track('work-order', wo7.data?.id);
  const done7 = await U(`/api/work-orders/${wo7Id}`, {
    status: 'completed', completedQuantity: 2, qualifiedQuantity: 2, scrapQuantity: 0, actualEndDate: '2026-09-10',
  });
  s.expectStatus('料号缺主数据时完工仍成功 200', done7, 200);
  const bf7 = done7.data?.backflush;
  const lm = (bf7?.lines || []).find((l) => l.materialCode === missingCode) || {};
  s.expectTrue('★ 缺主数据的料号被显式标记（不静默丢料）', lm.outcome === 'missing_material',
    `outcome=${lm.outcome}`);
  s.expectEq('★ 全部料号缺主数据时结论为 NO_MATERIAL', bf7?.code, 'NO_MATERIAL', 'code');
  s.expectTrue('★ 缺主数据时给出可读提示', typeof bf7?.message === 'string' && bf7.message.includes('物料主数据'),
    (bf7?.message || '').slice(0, 80));

  // ══════════════════════════════════════════════════════════════
  // 12. ★ 引用的子装配清单不存在 → 用 missing_bom 显式留痕
  //     这是最危险的一种「静默少扣料」：那部分用量根本没人知道被跳过了。
  //     必须与「虚项不领料」（设计如此）区分开 —— 一个是缺陷，一个是设计。
  // ══════════════════════════════════════════════════════════════
  const orphanCode = codeOf('MAT', 'ORPHAN');
  const bomOrphanNo = codeOf('BOM', 'ORPHAN');
  const bomOrphan = await P('/api/bom', {
    bomNo: bomOrphanNo, name: 'E2E 孤立子装配清单', productCode: `${prodCode}-ORPHAN`, productName: 'E2E 孤立子装配产品',
    status: 'released', version: 'V1.0',
    items: [
      // 引用了一个在 bom_headers 里根本不存在的产品码
      { level: 1, sequence: 10, materialCode: orphanCode, materialName: 'E2E 孤立子装配', unit: '套', quantity: 1, scrapRate: 0, source: 'manufacture', childProductCode: `NOPE-${stamp}` },
      { level: 1, sequence: 20, materialId: matId[matRows[0].code], materialCode: matRows[0].code, materialName: matRows[0].name, unit: '件', quantity: 1, scrapRate: 0, source: 'purchase' },
    ],
  });
  if (bomOrphan.data?.id) ctx.track('bom', bomOrphan.data.id);
  const woNo8 = codeOf('WO', 'ORPHAN');
  const wo8 = await P('/api/work-orders', {
    orderNo: woNo8, status: 'in_progress', productCode: `${prodCode}-ORPHAN`, productName: 'E2E 孤立子装配产品',
    bomNo: bomOrphanNo, materialId: matId[matRows[0].code], plannedQuantity: 4, completedQuantity: 0, scrapQuantity: 0,
    plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10', priority: 'normal',
    workshop: 'E2E 车间', supervisor: 'E2E 主管',
  });
  const wo8Id = ctx.track('work-order', wo8.data?.id);
  const done8 = await U(`/api/work-orders/${wo8Id}`, {
    status: 'completed', completedQuantity: 4, qualifiedQuantity: 4, scrapQuantity: 0, actualEndDate: '2026-09-10',
  });
  s.expectStatus('子装配清单缺失时完工仍成功 200', done8, 200);
  const lo = (done8.data?.backflush?.lines || []).find((l) => l.materialCode === orphanCode) || {};
  s.expectTrue('★ 子装配清单缺失被标为 missing_bom（与虚项区分开）', lo.outcome === 'missing_bom',
    `outcome=${lo.outcome}`);
  s.expectEq('★ 子装配清单缺失时不乱扣（倒冲量为 0）', lo.backflushQty, 0, '倒冲量');
  const laOrphan = (done8.data?.backflush?.lines || []).find((l) => l.materialCode === matRows[0].code) || {};
  s.expectEq('★ 同一张清单里的正常行照常倒冲（1 × 完工4）', laOrphan.backflushQty, 4, '倒冲量');
}
