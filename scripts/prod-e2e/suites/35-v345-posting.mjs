// 套件 35 · 第3批整改守护（V3.45.0 调拨/盘点过账 + 成本双轨消除）
// ------------------------------------------------------------------
// 本套件验证第3批前两项（对标审计 S-03 / S-04 / S-05）：
//   A. 库存调拨真正过账：调出仓扣减 + 调入仓增加，且**成本不漂移**
//      （同组织内调拨是位置转移，成本应保持不变 —— 对标 SAP 移动类型 301）
//   B. 库存调整/盘点真正过账：盘盈入库 + 盘亏出库，并生成盘盈盘亏凭证
//
// 为什么必须打真实端点：这两条的缺陷本质是「单据状态变了但库存数字没变」，
//   界面显示一切正常、只有比对库存台账才看得出 —— 白盒与界面测试都测不出。
//
// 全部成对断言（非法被拦 + 合法成功不误伤，防铁律㊹假修复）。
// 注：meta.id 必须与 --only 传入值一致（run.mjs 按 meta.id 过滤，不是文件名）。
export const meta = { id: '35-v345-posting', title: '第3批守护（调拨过账/盘点过账/成本双轨）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const admin = ctx.admin.token;
  const stamp = runId || String(Date.now());

  /**
   * 读某物料在某仓的库存数量。
   * ★ 注意：/api/inventory-records **只支持 keyword 过滤**（按物料编码/名称模糊查），
   *   不接受 materialId / warehouseId 查询参数 —— 传了会被静默忽略、返回第一页全量数据，
   *   看起来像"库存没变"，实则是查询方式错了。本次已踩过。
   *   正确做法：按 materialCode 用 keyword 查，再在本地按 warehouseId 过滤。
   * @returns 数量；该仓无此物料库存行时返回 null
   */
  const readInv = async (materialCode, warehouseId, materialId) => {
    const r = await req('GET', `/api/inventory-records?keyword=${encodeURIComponent(materialCode)}&pageSize=100`, { token: admin });
    const list = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
    // ★ 该端点返回 **snake_case**（warehouse_id / material_id / material_code），
    //   不是 camelCase —— 读 camelCase 会永远取不到值，表现为"库存没变"的假象。
    //   本次已踩过（探针打印原始返回才定位到）。
    const hit = list.find((x) => String(x.warehouse_id ?? x.warehouseId) === String(warehouseId)
      && (String(x.material_id ?? x.materialId) === String(materialId)
        || String(x.material_code ?? x.materialCode) === String(materialCode)));
    return hit ? Number(hit.quantity ?? hit.qty ?? 0) : null;
  };
  /** 读物料主数据的库存数量与移动均价 */
  const readMat = async (materialCode) => {
    const r = await req('GET', `/api/materials?keyword=${encodeURIComponent(materialCode)}&pageSize=50`, { token: admin });
    const list = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
    const hit = list.find((x) => String(x.code || '').toUpperCase() === String(materialCode).toUpperCase());
    return hit ? {
      id: hit.id,
      stock: Number(hit.currentStock ?? hit.current_stock ?? 0),
      avg: Number(hit.movingAvgPrice ?? hit.moving_avg_price ?? 0),
    } : null;
  };

  // ════════════════════════════════════════════════════════════════════
  // 前置：建物料 + 入库 100 件（建立初始库存与成本）
  // ════════════════════════════════════════════════════════════════════
  s.info('── 前置：建物料并入库 100 件 ──');

  const MAT = `MAT-POST-${stamp}`;
  const mat = await req('POST', '/api/materials', {
    token: admin,
    body: {
      code: MAT, name: '过账守护物料', spec: 'E2E', unit: '个', category: '原材料',
      price: 10, standardPrice: 10, currentStock: 0, status: 'active',
    },
  });
  s.expectTrue('★ 前置 建物料 201', mat.status === 201 || mat.status === 200,
    `status=${mat.status} ${JSON.stringify(mat.data).slice(0, 160)}`);
  if (mat.data?.id) ctx.track('material', mat.data.id);
  const matId = String(mat.data?.id || '');

  // 入库单：warehouse A，100 件 × 10 元
  const inNo = `IN-POST-${stamp}`;
  const inb = await req('POST', '/api/inbound-orders', {
    token: admin,
    body: {
      inboundNo: inNo, type: 'purchase', vendorId: 'v-post', vendorName: '过账守护供应商',
      status: 'completed', inboundDate: '2026-06-10',
      warehouseId: 'wh-A', warehouseName: 'A仓', operator: 'E2E',
      items: [{ materialId: matId, materialCode: MAT, materialName: '过账守护物料', unit: '个',
        expectedQuantity: 100, actualQuantity: 100, unitPrice: 10, amount: 1000 }],
    },
  });
  s.expectStatus('★ 前置 建入库单 201', inb, 201, inb.status !== 201 ? JSON.stringify(inb.data).slice(0, 200) : '');
  if (inb.data?.id) ctx.track('inbound-order', inb.data.id);

  const afterIn = await readMat(MAT);
  s.expectTrue('★ 前置 入库后物料库存=100', afterIn && afterIn.stock === 100,
    `stock=${afterIn?.stock}`);
  const costBefore = afterIn?.avg || 0;
  s.info(`   → 入库后移动均价 = ${costBefore}（调拨后应保持不变）`);

  // ════════════════════════════════════════════════════════════════════
  // A. 库存调拨真正过账（S-05）
  // ════════════════════════════════════════════════════════════════════
  s.info('── A. 库存调拨过账（A仓 → B仓，30 件）──');

  const trNo = `TR-POST-${stamp}`;
  const trCreate = await req('POST', '/api/stock-transfers', {
    token: admin,
    body: {
      transferNo: trNo, status: 'draft', transferDate: '2026-06-12',
      fromWarehouseId: 'wh-A', fromWarehouseName: 'A仓',
      toWarehouseId: 'wh-B', toWarehouseName: 'B仓',
      items: [{ materialId: matId, materialCode: MAT, materialName: '过账守护物料', unit: '个', quantity: 30 }],
    },
  });
  // 建单端点返回 200（parentChild 统一以 200 返回创建结果，非 201），
  // 故断言 200/201 均可，避免"状态码风格差异"被误报为失败。
  s.expectTrue('★ A1 建调拨单成功（200/201）',
    trCreate.status === 200 || trCreate.status === 201,
    `status=${trCreate.status} ${JSON.stringify(trCreate.data).slice(0, 160)}`);
  const trId = trCreate.data?.id;
  if (trId) ctx.track('stock-transfer', trId);

  // A2. ★ 核心：置为 completed 必须真正过账
  const trPost = await req('PUT', `/api/stock-transfers/${trId}`, {
    token: admin,
    body: { status: 'completed' },
  });
  s.expectTrue('★ A2 调拨置完成返回 200/201',
    trPost.status === 200 || trPost.status === 201,
    `status=${trPost.status} err=${String(trPost.data?.error || '').slice(0, 200)}`);
  s.expectTrue('★ A2 响应标记已过账 inventory_posted=1',
    Number(trPost.data?.inventory_posted) === 1,
    `inventory_posted=${trPost.data?.inventory_posted} msg=${trPost.data?.postMessage || ''}`);

  // A3. ★ 精准性：调出仓减、调入仓加（此前两者都不变）
  const aQty = await readInv(MAT, 'wh-A', matId);
  const bQty = await readInv(MAT, 'wh-B', matId);
  s.expectTrue('★ A3 调出仓 A 库存已扣减（100→70）', aQty === 70, `A仓库存=${aQty}（期望 70）`);
  s.expectTrue('★ A3 调入仓 B 库存已增加（0→30）', bQty === 30, `B仓库存=${bQty}（期望 30）`);

  // A4. ★ 成本不漂移：同组织内调拨是位置转移，成本应保持不变
  //     若调入仓按自己的采购价重新取值，会出现"调一批货反而改变了存货价值"
  const afterTr = await readMat(MAT);
  s.expectTrue('★ A4 调拨后移动均价不变（成本不漂移，对标 SAP 301）',
    afterTr && Math.abs(afterTr.avg - costBefore) < 0.01,
    `调拨前=${costBefore} 调拨后=${afterTr?.avg}`);

  // A5. 幂等：重复置完成不应再扣一次
  const trAgain = await req('PUT', `/api/stock-transfers/${trId}`, { token: admin, body: { status: 'completed' } });
  const aQty2 = await readInv(MAT, 'wh-A', matId);
  s.expectTrue('★ A5 重复提交幂等（不会二次扣减）',
    aQty2 === 70, `重复提交后 A仓库存=${aQty2}（期望仍为 70）`);
  s.info(`   → 重复提交返回 status=${trAgain.status}（completed 为锁定态，状态机应拦或幂等返回）`);

  // ════════════════════════════════════════════════════════════════════
  // B. 库存调整/盘点真正过账（S-04）
  // ════════════════════════════════════════════════════════════════════
  s.info('── B. 库存调整过账（B仓盘亏 5 件）──');

  const adjNo = `ADJ-POST-${stamp}`;
  const adjCreate = await req('POST', '/api/inventory-adjustments', {
    token: admin,
    body: {
      adjustmentNo: adjNo, status: 'draft', date: '2026-06-15',
      warehouseId: 'wh-B', warehouseName: 'B仓',
      adjustmentType: 'damage', reason: 'E2E 守护：盘亏测试',
      items: [{ materialId: matId, materialCode: MAT, materialName: '过账守护物料', unit: '个',
        bookQty: 30, actualQty: 25, deltaQty: -5, reason: '破损' }],
    },
  });
  s.expectTrue('★ B1 建库存调整单 201/200',
    adjCreate.status === 201 || adjCreate.status === 200,
    `status=${adjCreate.status} ${JSON.stringify(adjCreate.data).slice(0, 160)}`);
  const adjId = adjCreate.data?.id;
  if (adjId) ctx.track('inventory-adjustment', adjId);

  if (adjId) {
    // B2. ★ 核心：置 completed 必须真正过账（盘亏 5 件 → B仓 30→25）
    const adjPost = await req('PUT', `/api/inventory-adjustments/${adjId}`, {
      token: admin,
      body: { status: 'completed', date: '2026-06-15' },
    });
    s.expectTrue('★ B2 库存调整置完成返回 200/201',
      adjPost.status === 200 || adjPost.status === 201,
      `status=${adjPost.status} err=${String(adjPost.data?.error || '').slice(0, 200)}`);
    s.expectTrue('★ B2 响应标记已过账 inventory_posted=1',
      Number(adjPost.data?.inventory_posted) === 1,
      `inventory_posted=${adjPost.data?.inventory_posted} msg=${adjPost.data?.postMessage || ''}`);

    // B3. ★ 精准性：盘亏必须真的扣库存（此前刷新即失、库存完全不动）
    const bQty2 = await readInv(MAT, 'wh-B', matId);
    s.expectTrue('★ B3 盘亏已落到库存（B仓 30→25）', bQty2 === 25, `B仓库存=${bQty2}（期望 25）`);

    // B4. 盘盈盘亏凭证已生成（ADJ-<单号>）
    //     失败时把服务端的诊断原因（voucherDiag）带出来，避免只看到 undefined 无从排查；
    //     并直接查凭证表确认「到底有没有写进去」——区分"没生成"与"生成了但没回写单据"。
    const vq = await req('GET', `/api/vouchers?keyword=${encodeURIComponent(`ADJ-${adjNo}`)}&pageSize=20`, { token: admin });
    const vlist = Array.isArray(vq.data?.data) ? vq.data.data : Array.isArray(vq.data) ? vq.data : [];
    const vhit = vlist.find((v) => String(v.voucher_no || v.voucherNo || '').startsWith('ADJ-'));
    s.expectTrue('★ B4 盘盈盘亏凭证已生成并回写单据',
      // ★ 该端点返回的库存调整单是 snake_case（voucher_no），不是 voucherNo ——
      //   读 camelCase 永远取不到值，会误判为"凭证没生成"。本次已踩过。
      String(adjPost.data?.voucher_no || adjPost.data?.voucherNo || '').startsWith('ADJ-'),
      `voucher_no=${adjPost.data?.voucher_no} voucherNo=${adjPost.data?.voucherNo} `
      + `｜凭证表实查：${vhit ? `已存在 id=${vhit.id} 借=${vhit.total_debit ?? vhit.totalDebit} 贷=${vhit.total_credit ?? vhit.totalCredit}` : '未查到'}`);

    // B5. 幂等：重复提交不二次扣减
    await req('PUT', `/api/inventory-adjustments/${adjId}`, { token: admin, body: { status: 'completed' } });
    const bQty3 = await readInv(MAT, 'wh-B', matId);
    s.expectTrue('★ B5 重复提交幂等（不会二次扣减）', bQty3 === 25, `重复提交后 B仓库存=${bQty3}（期望仍为 25）`);
  }

  // ════════════════════════════════════════════════════════════════════
  // C. 成本双轨消除（S-03）—— 验证服务端是唯一算账源
  // ════════════════════════════════════════════════════════════════════
  s.info('── C. 服务端算账为唯一权威源（S-03）──');

  // C1. 再入 50 件（不同单价 12 元）→ 移动均价应按 (100×10+50×12)/150 = 10.667
  const inNo2 = `IN-POST2-${stamp}`;
  const inb2 = await req('POST', '/api/inbound-orders', {
    token: admin,
    body: {
      inboundNo: inNo2, type: 'purchase', vendorId: 'v-post', vendorName: '过账守护供应商',
      status: 'completed', inboundDate: '2026-06-18',
      warehouseId: 'wh-A', warehouseName: 'A仓', operator: 'E2E',
      items: [{ materialId: matId, materialCode: MAT, materialName: '过账守护物料', unit: '个',
        expectedQuantity: 50, actualQuantity: 50, unitPrice: 12, amount: 600 }],
    },
  });
  s.expectStatus('★ C1 二次入库 50 件@12元 201', inb2, 201, inb2.status !== 201 ? JSON.stringify(inb2.data).slice(0, 200) : '');
  if (inb2.data?.id) ctx.track('inbound-order', inb2.data.id);

  const afterIn2 = await readMat(MAT);
  // 主数据数量：A仓 70 + B仓 25 = 95，再 +50 = 145
  s.expectTrue('★ C1 入库后主数据库存已更新（服务端算账，非浏览器内存）',
    afterIn2 && afterIn2.stock === 145,
    `stock=${afterIn2?.stock}（期望 145 = 70+25+50）`);
  // 移动均价：调拨与盘亏都不改变均价，第二次入库按加权平均
  //   初始 1000 元/100 件；B仓盘亏 5 件按 10 元成本出 → 950/95；再入 600/50
  //   → (950+600)/(95+50) = 10.689…
  const expectAvg = (950 + 600) / 145;
  s.expectTrue('★ C2 移动均价由服务端按加权平均滚动（口径唯一）',
    afterIn2 && Math.abs(afterIn2.avg - expectAvg) < 0.02,
    `实际=${afterIn2?.avg} 期望≈${expectAvg.toFixed(4)}（若不符说明存在前端/后端双算）`);

  s.info(`   → 最终：库存=${afterIn2?.stock} 件，移动均价=${afterIn2?.avg}`);
}
