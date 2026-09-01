// 套件 05 · B2 三岛专属后端（序列号 FIFO / 委外 / 工单领料）
// 覆盖：三岛 CRUD、序列号 FIFO 先进先出核销正确性、在库不足 409、领料重复 409
// 背景：V2.70 为三岛建专属 D1 表与端点（迁移 0010-0012）。老 harness 曾断言「三岛无专属后端」，
//       该断言在 V2.70 后已过时——本套件取而代之，正向验证三岛真实可用。
export const meta = { id: '05-b2-islands', title: 'B2 三岛后端（序列号 FIFO/委外/工单领料）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;

  // ==================== 岛 1：序列号主档 + FIFO 核销 ====================
  const listSerial = await req('GET', '/api/serial-numbers', { token });
  s.expectStatus('GET /api/serial-numbers 列表', listSerial, 200);
  s.expectListShape('  └ 序列号列表契约', listSerial);

  const matId = `e2e-mat-${runId}`;
  // 故意乱序创建：先建入库日期较晚的，验证 FIFO 按 inbound_date 而非插入顺序
  const seeds = [
    { serialNo: `SN-${runId}-C`, inboundDate: '2026-03-03' },
    { serialNo: `SN-${runId}-A`, inboundDate: '2026-01-01' },
    { serialNo: `SN-${runId}-B`, inboundDate: '2026-02-02' },
  ];
  const createdSerials = [];
  for (const seed of seeds) {
    const r = await req('POST', '/api/serial-numbers', {
      token,
      body: {
        serialNo: seed.serialNo, materialId: matId, materialCode: 'E2E-MAT',
        materialName: 'E2E 测试物料', batchNo: `B-${runId}`, warehouseId: 'WH-E2E',
        status: 'in_stock', inboundDate: seed.inboundDate,
        remarks: 'E2E 常驻套件，跑完自动清理',
      },
    });
    if (r.status === 200 && r.data?.id) {
      createdSerials.push({ id: r.data.id, ...seed });
      ctx.track('serial', r.data.id);
    } else {
      s.fail(`POST /api/serial-numbers 创建 ${seed.serialNo}`, `status=${r.status} ${JSON.stringify(r.data)?.slice(0, 140)}`);
    }
  }
  s.expectEq('序列号主档创建 3 条', createdSerials.length, 3, '成功条数');

  if (createdSerials.length === 3) {
    // FIFO 核销 2 个 → 应命中最早入库的 A(01-01) 与 B(02-02)，而非插入顺序首个 C
    const consume = await req('POST', '/api/serial-numbers/consume', {
      token,
      body: { materialId: matId, qty: 2, newStatus: 'shipped', type: 'outbound', docNo: `E2E-OUT-${runId}` },
    });
    s.expectStatus('POST /api/serial-numbers/consume FIFO 核销 2 个', consume, 200);
    const consumedNos = (consume.data?.consumed || []).map((c) => c.serial_no || c.serialNo || c);
    s.expectEq('核销数量为 2', consumedNos.length, 2, '核销条数');
    const expectFifo = [`SN-${runId}-A`, `SN-${runId}-B`];
    const fifoCorrect = expectFifo.every((n) => consumedNos.some((c) => String(c).includes(n.split('-').pop())));
    s.expectTrue('【FIFO 正确性】核销命中最早入库的 A(01-01)+B(02-02)',
      fifoCorrect,
      `实际核销=${JSON.stringify(consumedNos)} 期望含=${JSON.stringify(expectFifo)}`);

    // 剩余在库应仅 1 个（C）
    const remain = await req('GET', `/api/serial-numbers?materialId=${matId}&status=in_stock`, { token });
    const remainRows = (remain.data?.data || []).filter((r) => r.material_id === matId && r.status === 'in_stock');
    s.expectEq('核销后在库仅剩 1 个', remainRows.length, 1, '在库条数');
    s.expectTrue('剩余在库者为入库最晚的 C(03-03)',
      remainRows[0]?.serial_no?.includes('-C'),
      `剩余=${remainRows[0]?.serial_no}`);

    // 在库不足应 409（而非静默成功或 500）
    const over = await req('POST', '/api/serial-numbers/consume', {
      token, body: { materialId: matId, qty: 99, newStatus: 'shipped' },
    });
    s.expectStatus('在库不足核销返回 409（不静默成功）', over, 409,
      `available=${over.data?.available} required=${over.data?.required}`);

    // 参数校验
    const badQty = await req('POST', '/api/serial-numbers/consume', {
      token, body: { materialId: matId, qty: 0 },
    });
    s.expectStatus('核销 qty=0 参数校验 400', badQty, 400);
  }

  // ==================== 岛 2：委外订单 ====================
  const listSub = await req('GET', '/api/subcontracts', { token });
  s.expectStatus('GET /api/subcontracts 列表', listSub, 200);
  s.expectListShape('  └ 委外列表契约', listSub);

  const subCreate = await req('POST', '/api/subcontracts', {
    token,
    body: {
      orderNo: `E2E-SUB-${runId}`, type: 'process', materialId: matId,
      materialCode: 'E2E-MAT', materialName: 'E2E 测试物料',
      vendorId: `e2e-vendor-${runId}`, vendorName: 'E2E 委外供应商',
      status: 'draft', qty: 100, planDate: '2026-12-31', processFee: 3500,
      issueItems: [
        { materialId: `${matId}-raw1`, materialCode: 'RAW-1', materialName: '原料一', unit: 'kg', qty: 50 },
        { materialId: `${matId}-raw2`, materialCode: 'RAW-2', materialName: '原料二', unit: 'kg', qty: 30 },
      ],
    },
  });
  s.expectStatus('POST /api/subcontracts 创建委外单（含发料明细）', subCreate, 200);
  const subId = subCreate.data?.id;
  if (subId) {
    ctx.track('subcontract', subId);
    s.expectEq('委外单回显 order_no', subCreate.data?.order_no, `E2E-SUB-${runId}`);
    s.expectEq('委外单 qty 落库正确', Number(subCreate.data?.qty), 100);
    s.expectEq('委外单加工费落库正确', Number(subCreate.data?.process_fee), 3500);

    const subDetail = await req('GET', `/api/subcontracts/${subId}`, { token });
    s.expectStatus('GET /api/subcontracts/:id 详情', subDetail, 200);
    const items = subDetail.data?.issueItems || subDetail.data?.issue_items;
    s.expectTrue('委外发料明细 2 条随主单返回',
      Array.isArray(items) && items.length === 2,
      `明细条数=${Array.isArray(items) ? items.length : '未返回(' + typeof items + ')'}`);

    const subPut = await req('PUT', `/api/subcontracts/${subId}`, { token, body: { status: 'issued' } });
    s.expectStatus('PUT /api/subcontracts/:id 状态流转', subPut, 200);
  }

  // ==================== 岛 3：工单领料 ====================
  const listPick = await req('GET', '/api/work-orders/picking', { token });
  s.expectStatus('GET /api/work-orders/picking 列表', listPick, 200);
  s.expectListShape('  └ 工单领料列表契约', listPick);

  const woId = `e2e-wo-${runId}`;
  const pick = await req('POST', '/api/work-orders/picking', {
    token,
    body: {
      workOrderId: woId, workOrderNo: `E2E-WO-${runId}`, materialId: matId,
      materialCode: 'E2E-MAT', materialName: 'E2E 测试物料', unit: 'pcs',
      quantity: 20, outboundNo: `E2E-PICK-${runId}`, issuedAt: '2026-09-01',
    },
  });
  s.expectStatus('POST /api/work-orders/picking 创建领料记录', pick, 200);
  const pickId = pick.data?.id;
  if (pickId) {
    ctx.track('picking', pickId);
    s.expectEq('领料数量落库正确', Number(pick.data?.quantity), 20);

    // 幂等护栏：同 (workOrderId, materialId) 重复领料应 409
    const dup = await req('POST', '/api/work-orders/picking', {
      token, body: { workOrderId: woId, materialId: matId, quantity: 5 },
    });
    s.expectStatus('同工单同物料重复领料返回 409（幂等护栏）', dup, 409,
      `既有 id=${dup.data?.id}`);

    const pickDetail = await req('GET', `/api/work-orders/picking/${pickId}`, { token });
    s.expectStatus('GET /api/work-orders/picking/:id 详情', pickDetail, 200);
  }

  // 三岛未登录一律拒绝
  let denied = 0;
  const paths = ['/api/serial-numbers', '/api/subcontracts', '/api/work-orders/picking'];
  const leaked = [];
  for (const p of paths) {
    const r = await req('GET', p);
    if (r.status === 401) denied += 1; else leaked.push(`${p}=${r.status}`);
  }
  s.expectEq('三岛端点未登录全部拒绝', denied, paths.length,
    leaked.length ? '泄露: ' + leaked.join(',') : '全部 401');
}
