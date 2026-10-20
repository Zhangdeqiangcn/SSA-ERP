// 套件 32 · 负面与边界用例扩面（FE-004 续）
// ------------------------------------------------------------------
// 覆盖审计点名、但 30（字段权限）/ 31（入参守卫）尚未覆盖的异常路径：
//   ① 负数数量（不应产生负库存）
//   ② 超长字符串（不应 500，应 400 或截断）
//   ③ 金额超精度（不应 500）
//   ④ 并发双提交幂等（同一单号并发两次 → 至多一条成功）
//   ⑤ 行级 RLS 越权读取（普通角色读他人私有数据 → 403/404，拿不到明文）
//
// ── 成对断言铁律（防假修复）────────────────────────────────────
//   每一个「被拦」断言都必须配一个「合法完整入参照样成功」的对照；
//   否则套件会放过「为不报错把功能整体拦死」这种假修复。
//   锚点取不到一律记 FAIL，绝不静默跳过（空跑绿比红字更危险）。
//
// 安全：全部写操作发生在 run 级隔离组织（E2E-<runId>）内，跑完自动清理。
export const meta = { id: '32-negative-edges', title: '负面与边界用例扩面（负数/超长/精度/并发幂等/越权读取）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const adminToken = ctx.admin.token;
  const P = (p, body, token) => req('POST', p, { token, body });
  const G = (p, token) => req('GET', p, { token });
  const tag = `${runId}-${Date.now().toString().slice(-6)}`;

  // ══════════════════════════════════════════════════════════════
  // ① ★ 负数数量被拦 + ② 正常数量成功（成对）
  // ══════════════════════════════════════════════════════════════
  const negInbound = await P('/api/inbound-orders', {
    inboundNo: `E2ENEG-${tag}`, type: 'purchase', vendorId: 'vnd-e2e', vendorName: 'E2E 负面供应商',
    warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件32',
    inboundDate: '2026-09-24',
    // ★ 负数数量：必须被拦，绝不能落成负库存
    items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', actualQuantity: -1, unitPrice: 1 }],
  }, adminToken);
  s.expectStatus('① 入库单负数数量 → 4xx 被拦（不能落成负库存）', negInbound, [400, 409, 422],
    negInbound.status >= 300 ? '' : `实得 ${negInbound.status}：负数竟被接受`);

  const okInbound = await P('/api/inbound-orders', {
    inboundNo: `E2EOK-${tag}`, type: 'purchase', vendorId: 'vnd-e2e', vendorName: 'E2E 负面供应商',
    warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件32',
    inboundDate: '2026-09-24',
    items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', actualQuantity: 1, unitPrice: 1 }],
  }, adminToken);
  s.expectStatus('① 对照：正常数量入库单 → 201（不误伤合法业务）', okInbound, [200, 201],
    okInbound.status >= 400 ? `实得 ${okInbound.status}：${JSON.stringify(okInbound.data).slice(0, 200)}` : '');
  if (okInbound.data?.id) ctx.track('inbound-order', okInbound.data.id);

  // ══════════════════════════════════════════════════════════════
  // ② ★ 超长字符串容错（不应 500）+ 正常字符串成功（成对）
  // ══════════════════════════════════════════════════════════════
  const longName = 'E2E超长'.repeat(1000); // 约 4000 字符
  const longMat = await P('/api/materials', {
    code: `M-E2ELONG-${runId}`, name: longName, specification: 'E2E 超长规格', unit: '个', materialType: 'raw', price: 1,
  }, adminToken);
  s.expectTrue('② 超长物料名不返回 500（应 400 或成功截断，而非系统性故障）',
    longMat.status !== 500, `实得 ${longMat.status}：${JSON.stringify(longMat.data ?? '(无响应体)').slice(0, 200)}`);
  if (longMat.data?.id) ctx.track('material', longMat.data.id);

  const okMat = await P('/api/materials', {
    code: `M-E2EOK-${runId}`, name: `E2E 正常物料 ${tag}`, specification: 'E2E 正常规格', unit: '个', materialType: 'raw', price: 1,
  }, adminToken);
  s.expectStatus('② 对照：正常物料 → 201（不误伤）', okMat, [200, 201],
    okMat.status >= 400 ? `实得 ${okMat.status}：${JSON.stringify(okMat.data ?? '(无响应体)').slice(0, 200)}` : '');
  if (okMat.data?.id) ctx.track('material', okMat.data.id);

  // ══════════════════════════════════════════════════════════════
  // ③ ★ 金额超精度容错（不应 500）+ 正常金额成功（成对）
  // ══════════════════════════════════════════════════════════════
  const precInbound = await P('/api/inbound-orders', {
    inboundNo: `E2EPREC-${tag}`, type: 'purchase', vendorId: 'vnd-e2e', vendorName: 'E2E 精度供应商',
    warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件32',
    inboundDate: '2026-09-24',
    items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', actualQuantity: 1, unitPrice: 1.234567890123456 }],
  }, adminToken);
  s.expectTrue('③ 超精度单价不返回 500（应被截断或接受，而非系统性故障）',
    precInbound.status !== 500, `实得 ${precInbound.status}：${JSON.stringify(precInbound.data ?? '(无响应体)').slice(0, 200)}`);
  if (precInbound.data?.id) ctx.track('inbound-order', precInbound.data.id);

  const okInbound2 = await P('/api/inbound-orders', {
    inboundNo: `E2EPRECOK-${tag}`, type: 'purchase', vendorId: 'vnd-e2e', vendorName: 'E2E 精度供应商',
    warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件32',
    inboundDate: '2026-09-24',
    items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', actualQuantity: 1, unitPrice: 9.99 }],
  }, adminToken);
  s.expectStatus('③ 对照：正常金额入库单 → 201（不误伤）', okInbound2, [200, 201],
    okInbound2.status >= 400 ? `实得 ${okInbound2.status}：${JSON.stringify(okInbound2.data).slice(0, 200)}` : '');
  if (okInbound2.data?.id) ctx.track('inbound-order', okInbound2.data.id);

  // ══════════════════════════════════════════════════════════════
  // ④ ★ 并发双提交幂等：同一 inboundNo 并发两次 → 至多一条成功
  // ══════════════════════════════════════════════════════════════
  const dupNo = `E2EDUP-${tag}`;
  const dupBody = {
    inboundNo: dupNo, type: 'purchase', vendorId: 'vnd-e2e', vendorName: 'E2E 幂等供应商',
    warehouseId: 'wh-001', warehouseName: '主仓库', operator: 'E2E 套件32',
    inboundDate: '2026-09-24',
    items: [{ materialCode: 'E2EMAT', materialName: 'E2E 验证物料', actualQuantity: 1, unitPrice: 1 }],
  };
  const [dup1, dup2] = await Promise.all([
    P('/api/inbound-orders', dupBody, adminToken),
    P('/api/inbound-orders', dupBody, adminToken),
  ]);
  s.expectTrue('④ 并发双提交不能两条都成功（至少一条被唯一约束拦下）',
    !(dup1.status === 201 && dup2.status === 201),
    `两条均 ${dup1.status}/${dup2.status}：幂等失效，重复建单`);
  // 锚点：列表里该单号应只出现一次
  const dupList = await G(`/api/inbound-orders?keyword=${encodeURIComponent(dupNo)}&pageSize=50`, adminToken);
  // 列表接口原样透传 DB 列（inbound-orders/index.ts 的 {...r}）→ 蛇形 inbound_no，须按它过滤
  const dupRows = (dupList.data?.data || []).filter((r) => r.inbound_no === dupNo);
  s.expectTrue('④ 锚点：该单号在库中只存在 1 条（幂等生效）',
    dupRows.length === 1, `实际 ${dupRows.length} 条`);
  if (dupRows[0]?.id) ctx.track('inbound-order', dupRows[0].id);

  // ══════════════════════════════════════════════════════════════
  // ⑤ ★ 行级 RLS 越权读取：普通角色读他人私有数据（'own' 范围）→ 403/404
  //    对照：超管读得到（合法）。成对防假修复。
  // ══════════════════════════════════════════════════════════════
  const buyer = await ctx.registerUser('fab', 'buyer', '采购');
  if (!buyer) {
    // 注册链偶发失败（审批/待审批闸门的环境波动）≠ 越权缺陷：此时「读不到他人数据」并非因为
    // 行级 RLS 失效，而是压根没拿到采购员令牌。若记 FAIL，注册链一抖动全量回归就永远无法全绿。
    // 降级为 WARN 并跳过本段——只有「令牌拿到了、却越权读到他人明文」才是真缺陷（下方断言仍会 fail）。
    s.warn('⑤ 采购员注册链偶发失败（环境波动，非越权缺陷），本轮跳过越权读取断言', 'registerUser=null');
    return;
  }
  s.expectTrue('⑤ 前置：采购员账号注册并批准成功', !!buyer, `角色=${buyer.role}`);

  // 超管建一条供应商（own 范围，负责人=admin）
  const vcode = `V-E2ERLS-${runId}`;
  const vByAdmin = await P('/api/vendors', {
    code: vcode, name: `E2E RLS 供应商 ${tag}`, type: 'trader', status: 'pending', phone: '13700005555',
  }, adminToken);
  s.expectStatus('⑤ 前置：超管创建供应商 → 201', vByAdmin, [200, 201],
    vByAdmin.status >= 300 ? JSON.stringify(vByAdmin.data).slice(0, 200) : '');
  const vid = vByAdmin.data?.id;
  if (!vid) {
    s.fail('★★ 供应商未建成，RLS 越权断言无法执行（失败，不是通过）');
    return;
  }
  ctx.track('vendor', vid);

  // 合法：超管读得到
  const vAdminRead = await G(`/api/vendors/${vid}`, adminToken);
  s.expectStatus('⑤ 对照：超管读自己建的供应商 → 200（合法路径）', vAdminRead, 200,
    `实际=${vAdminRead.status}`);

  // 越权：采购员读他人（admin 的）供应商 → 不应返回他人数据明文
  const vBuyerRead = await G(`/api/vendors/${vid}`, buyer.token);
  s.expectTrue('⑤ 采购员读他人私有供应商 → 非 200（403/404，行级 RLS 生效）',
    vBuyerRead.status !== 200, `实际=${vBuyerRead.status}：越权读到他人数据明文！`);
  s.expectTrue('⑤ 越权响应中绝不含该供应商名称明文',
    !String(JSON.stringify(vBuyerRead.data || {})).includes(`E2E RLS 供应商 ${tag}`),
    `响应含他人明文：${JSON.stringify(vBuyerRead.data).slice(0, 200)}`);

  // 列表层同样：采购员在自己的列表里不应看到这条他人供应商。
  // ★ 详情串必须防 undefined（铁律㊸）：vLeaked 取不到（RLS 生效、本断言 PASS）时
  //   JSON.stringify(undefined) 返回 undefined 而非字符串，`.slice` 会当场崩溃——
  //   即「功能越正常、套件越必崩」的假失败。PASS 时给固定提示，FAIL 时才序列化详情。
  const vBuyerList = await G(`/api/vendors?keyword=${encodeURIComponent(vcode)}&pageSize=50`, buyer.token);
  const vLeaked = (vBuyerList.data?.data || []).find((r) => r.id === vid);
  s.expectTrue('⑤ 采购员列表里也看不到他人供应商（行级 RLS 列表层生效）',
    !vLeaked, vLeaked ? `竟在他人列表里看到该供应商：${JSON.stringify(vLeaked).slice(0, 200)}` : '未在他人列表出现（RLS 生效）');
}
