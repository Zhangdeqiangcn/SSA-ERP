// 套件 31 · 核心写端点入参守卫（空入参不再 500）
// ------------------------------------------------------------------
// 覆盖 V3.22.0 修复。
//
// ── 缺陷是什么 ──────────────────────────────────────────────────
// 生产端点全量扫描（342 探针 / 189 唯一端点）检出 8 处 500，全部落在
// 「提交内容不完整」的写入请求上。根因统一：
//   单号等列在库里是 NOT NULL，旧代码拿到 undefined 直接 bind 给数据库，
//   数据库拒绝 → 端点未捕获 → 中间件兜底成 500「请求处理失败」。
// 也就是说：**本是用户输入问题，却被当成系统故障报了出来**，
// 使用者既不知道缺什么，也不知道能不能补救。
//
// ── 更隐蔽的那一半 ──────────────────────────────────────────────
// 工单领料端点连**空对象都能建单成功**（quantity 走 `|| 0` 兜底、工单与物料可空）。
// 这比 500 更危险：
//   · 「该物料是否已领料」按记录判断 → 数量为 0 的空记录占住位置
//     → 真正要领料时被 409 挡住，业务被自己造的空记录卡死；
//   · 倒冲发料按 material_id 读已领数量 → 空记录让差额计算失真。
// 因此本套件把「空领料单必须被拦」也列为断言。
//
// ── 本套件要证明的四件事 ────────────────────────────────────────
//   ① 五个写端点在空载荷下**全部返回 400**（不是 500）
//   ② 返回的中文原因**点名缺哪个字段**（不是笼统的「处理失败」）
//   ③ 序列号缺物料、领料数量为 0 这些「能建成但没意义」的情形被拦下
//   ④ ★ 正常完整入参**照样建得成**——只修报错、不误伤业务
//      （缺了这一条，套件会放过「为了不报错而把功能拦死」这种假修复）
//
// 安全：全部写操作发生在 run 级隔离组织（E2E-<runId>）内，跑完自动清理。
export const meta = { id: '31-write-payload-guard', title: '核心写端点入参守卫（空入参不再 500）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const P = (p, body) => req('POST', p, { token, body });
  const tag = `${runId}-${Date.now().toString().slice(-6)}`;

  // ══════════════════════════════════════════════════════════════
  // ① 空载荷：五个写端点一律 400，且原因点名缺哪个字段
  // ══════════════════════════════════════════════════════════════
  const emptyCases = [
    ['入库单', '/api/inbound-orders', '入库单号'],
    ['出库单', '/api/outbound-orders', '出库单号'],
    ['委外订单', '/api/subcontracts', '委外订单号'],
    ['序列号', '/api/serial-numbers', '序列号'],
    ['工单领料', '/api/work-orders/picking', '工单'],
  ];

  for (const [label, path, fieldName] of emptyCases) {
    const r = await P(path, {});
    s.expectStatus(`① ${label}：空载荷返回 400（修复前是 500）`, r, [400],
      r.status !== 400 ? `实得 ${r.status}：${JSON.stringify(r.data).slice(0, 160)}` : '');
    s.expectTrue(`① ${label}：原因点名「${fieldName}」`,
      String(r.data?.error || '').includes(fieldName),
      `实际原因：${r.data?.error || '(无)'}`);
    s.expectTrue(`① ${label}：不再返回笼统的「处理失败」`,
      !String(r.data?.error || '').includes('请求处理失败'),
      `实际原因：${r.data?.error || '(无)'}`);
  }

  // ══════════════════════════════════════════════════════════════
  // ② 错误码可机读（前端可据此定位到字段，而不是猜）
  // ══════════════════════════════════════════════════════════════
  const sn = await P('/api/serial-numbers', {});
  s.expectEq('② 序列号空载荷的错误码', sn.data?.code, 'MISSING_REQUIRED', 'code');

  // ══════════════════════════════════════════════════════════════
  // ③ 「能建成但没意义」的情形必须被拦下
  // ══════════════════════════════════════════════════════════════
  const snNoMat = await P('/api/serial-numbers', { serialNo: `E2ESN-${tag}` });
  s.expectStatus('③ 序列号缺所属物料 → 400', snNoMat, [400],
    snNoMat.status !== 400 ? `实得 ${snNoMat.status}` : '');
  s.expectTrue('③ 序列号缺物料的原因说明了「无法追溯」',
    String(snNoMat.data?.error || '').includes('物料'),
    `实际原因：${snNoMat.data?.error || '(无)'}`);

  const pickZero = await P('/api/work-orders/picking', {
    workOrderId: `E2EWO-${tag}`, materialId: 'E2EMAT', materialCode: 'E2EMAT',
    materialName: 'E2E 验证物料', quantity: 0, unit: '个',
  });
  s.expectStatus('③ 领料数量为 0 → 400（会占住物料导致后续真领料被 409）', pickZero, [400],
    pickZero.status !== 400 ? `实得 ${pickZero.status}：${JSON.stringify(pickZero.data).slice(0, 160)}` : '');
  s.expectTrue('③ 领料数量被拦的原因说明了「必须大于 0」',
    String(pickZero.data?.error || '').includes('大于 0'),
    `实际原因：${pickZero.data?.error || '(无)'}`);

  // 委外订单不传 type：库里该列 NOT NULL 且无默认值，修复前直接 500
  const scNoType = await P('/api/subcontracts', {
    orderNo: `E2ESC-${tag}`, materialCode: 'E2EMAT', materialName: 'E2E 验证物料',
    vendorName: 'E2E 外协厂', qty: 1,
  });
  s.expectStatus('③ 委外订单不传 type → 不再 500（按前端默认值兜底）', scNoType, [200, 201],
    scNoType.status >= 400 ? `实得 ${scNoType.status}：${JSON.stringify(scNoType.data).slice(0, 160)}` : '');
  if (scNoType.data?.id) ctx.track('subcontract', scNoType.data.id);

  // ══════════════════════════════════════════════════════════════
  // ④ ★ 正常完整入参照样建得成（防「为了不报错把功能拦死」的假修复）
  //    锚点取不到一律判失败——空跑出来的绿色比红字更危险。
  // ══════════════════════════════════════════════════════════════
  const normalCases = [
    ['入库单', '/api/inbound-orders', 'inbound-order', {
      inboundNo: `E2EIN-${tag}`, type: 'purchase', vendorName: 'E2E 供应商',
      warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件31',
      inboundDate: '2026-09-23',
      items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', actualQuantity: 1, unitPrice: 1 }],
    }],
    ['出库单', '/api/outbound-orders', 'outbound-order', {
      outboundNo: `E2EOUT-${tag}`, type: 'sale', customerName: 'E2E 客户',
      warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件31',
      outboundDate: '2026-09-23',
      items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', quantity: 1 }],
    }],
    ['委外订单', '/api/subcontracts', 'subcontract', {
      orderNo: `E2ESC2-${tag}`, type: 'process', vendorName: 'E2E 外协厂',
      materialCode: 'E2EMAT', materialName: 'E2E 验证物料', qty: 1, processFee: 10,
    }],
    ['序列号', '/api/serial-numbers', 'serial', {
      serialNo: `E2ESN2-${tag}`, materialCode: 'E2EMAT', materialName: 'E2E 验证物料', status: 'in_stock',
    }],
    ['工单领料', '/api/work-orders/picking', 'picking', {
      workOrderId: `E2EWO2-${tag}`, workOrderNo: `E2EWO2-${tag}`,
      materialId: 'E2EMAT', materialCode: 'E2EMAT', materialName: 'E2E 验证物料',
      quantity: 2, unit: '个',
    }],
  ];

  for (const [label, path, kind, body] of normalCases) {
    const r = await P(path, body);
    s.expectStatus(`④ ${label}：完整入参仍可创建（未被误拦）`, r, [200, 201],
      r.status >= 400 ? `实得 ${r.status}：${JSON.stringify(r.data).slice(0, 200)}` : '');
    if (r.data?.id) {
      ctx.track(kind, r.data.id);
    } else {
      // 拿不到 id 就无法清理 → 会残留测试数据，直接判失败而不是跳过
      s.expectTrue(`④ ${label}：拿到可清理的记录 id（否则会残留生产数据）`, false,
        `响应无 id：${JSON.stringify(r.data).slice(0, 200)}`);
    }
  }
}
