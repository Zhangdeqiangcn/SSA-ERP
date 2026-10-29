// GET /api/work-orders/picking — 分页查询工单领料（按 org_id 隔离）
// POST /api/work-orders/picking — 创建工单领料
import { getUserFromRequest, json } from '../../../_shared/auth';
import { validateOrReject, requireFields } from '../../../_shared/validate';
// V3.5.0 B6：补齐写审计
import { writeAudit } from '../../../_shared/auditLog';
// V3.21.0：materialName 搜索走统一安全处理（截断防 500 + 转义防通配符）
import { safeKeyword, likePattern } from '../../../_shared/searchKeyword';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const workOrderId = url.searchParams.get('workOrderId') || '';
  // V3.21.0：与 keyword 走同一套安全处理。
  //   本端点此前是内联 `` `%${materialName}%` `` 构造，V3.20.1 的关键词扫描
  //   未覆盖到它 —— 参数名叫 materialName 而非 keyword，属漏网之鱼：
  //   粘一个超长料名进来仍会触发 D1 的 LIKE 模式长度上限 → 500。
  const materialName = safeKeyword(url.searchParams.get('materialName'));

  let sql = `SELECT * FROM work_order_pickings WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];
  if (workOrderId) {
    sql += ` AND work_order_id = ?`;
    params.push(workOrderId);
  }
  if (materialName) {
    sql += ` AND material_name LIKE ? ESCAPE '\\'`;
    params.push(likePattern(materialName));
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const data = (result.results || []).map(r => ({
    ...r,
    quantity: Number(r.quantity),
  }));

  let countSql = `SELECT COUNT(*) as cnt FROM work_order_pickings WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (workOrderId) {
    countSql += ` AND work_order_id = ?`;
    countParams.push(workOrderId);
  }
  if (materialName) {
    countSql += ` AND material_name LIKE ? ESCAPE '\\'`;
    countParams.push(likePattern(materialName));
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  return json({
    data,
    pagination: {
      page,
      pageSize,
      total: countResult?.cnt || 0,
      totalPages: Math.ceil((countResult?.cnt || 0) / pageSize),
    },
  });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('work_order_pickings', body);
  if (_invalid) return _invalid;

  // 必填守卫（V3.22.0 · 实测缺陷）：
  // 旧行为里本端点连「空对象」都能建单成功（返回 200 并生成一条 id），因为 quantity 走
  // `Number(body.quantity) || 0` 兜底、物料与工单号都是可空列。这比 500 更隐蔽：
  //   · 建出「数量为 0」的领料占位 → 下方唯一性判断把它算作「该物料已领料」
  //     → 真正要领料时返回 409，业务被自己造的空记录卡死；
  //   · 倒冲发料（backflush）按 material_id 读已领数量，空记录会让差额计算失真。
  // 因此这里要求工单、物料、正数数量三样齐全，缺任一样直接 400 说明缺什么。
  const _missing = requireFields(body, ['workOrderId', 'materialId'], {
    workOrderId: '工单',
    materialId: '物料',
  });
  if (_missing) return _missing;
  const _qty = Number(body.quantity);
  if (!Number.isFinite(_qty) || _qty <= 0) {
    return json(
      { error: '请填写「领料数量」后再提交（必须大于 0，数量为 0 的领料单会占住该物料、导致后续无法真正领料）', code: 'INVALID_FIELD', field: 'quantity' },
      400
    );
  }
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const existing = await db.prepare(`SELECT id FROM work_order_pickings WHERE org_id = ? AND work_order_id = ? AND material_id = ?`).bind(user.org_id, body.workOrderId, body.materialId || null).first();
  if (existing) {
    return json({ error: '该物料已领料', id: existing.id }, 409);
  }

  const id = 'wop-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO work_order_pickings (id, org_id, work_order_id, work_order_no, material_id, material_code, material_name, unit, quantity, outbound_no, issued_at, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.workOrderId, body.workOrderNo || null, body.materialId || null, body.materialCode || null, body.materialName || null,
    body.unit || null, Number(body.quantity) || 0, body.outboundNo || null, body.issuedAt || null, now, now, user.name, user.name
  ).run();

  const row = await db.prepare(`SELECT * FROM work_order_pickings WHERE id = ?`).bind(id).first();

  // B6 审计：新建领料 = 原料出库 + 工单成本归集两件事同时发生。
  //   摘要带「工单号 / 物料 / 数量 / 出库单号」，这四项合起来就是一条完整的
  //   材料成本归集凭证摘要，事后做成本还原时可直接对上。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'work_order_pickings',
    entityId: id,
    action: 'create',
    summary:
      `工单领料 ${body.workOrderNo || body.workOrderId}` +
      `：${body.materialCode || body.materialId} ${body.materialName || ''}` +
      ` × ${Number(body.quantity) || 0} ${body.unit || ''}` +
      `（出库单：${body.outboundNo || '-'}）`,
  });

  return json(row);
}
