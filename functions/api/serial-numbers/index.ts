// GET /api/serial-numbers — 分页查询序列号主档（按 org_id 隔离）
// POST /api/serial-numbers — 创建序列号主档
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { insertSerialMovement } from '../../_shared/serial';
import { validateOrReject, requireFields } from '../../_shared/validate';
// V3.5.0 B6：补齐写审计
import { writeAudit } from '../../_shared/auditLog';
// ★ V3.45.0 操作权限服务端守卫：此前该端点零守卫（任何登录用户均可写）。
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || '';

  let sql = `SELECT * FROM serial_masters WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];

  if (keyword) {
    sql += ` AND (serial_no LIKE ? ESCAPE '\\' OR material_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const rows = result.results || [];

  // 关联流转记录：一次 IN 查询按 serial_master_id 归组，避免 N+1；列表也展示全生命周期轨迹
  const movementsByMaster: Record<string, unknown[]> = {};
  if (rows.length) {
    const ids = rows.map((r) => (r as Record<string, unknown>).id);
    const placeholders = ids.map(() => '?').join(',');
    const mvRes = await db
      .prepare(`SELECT * FROM serial_movements WHERE serial_master_id IN (${placeholders})`)
      .bind(...ids)
      .all();
    for (const mv of mvRes.results || []) {
      const mid = (mv as Record<string, unknown>).serial_master_id as string;
      (movementsByMaster[mid] = movementsByMaster[mid] || []).push(mv);
    }
  }
  const data = rows.map((r) => ({ ...r, movements: movementsByMaster[(r as Record<string, unknown>).id as string] || [] }));

  let countSql = `SELECT COUNT(*) as cnt FROM serial_masters WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (keyword) {
    countSql += ` AND (serial_no LIKE ? ESCAPE '\\' OR material_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    countParams.push(kw, kw);
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
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

  // V3.45.0：写端点服务端硬拦，越权返回 403 OPERATION_FORBIDDEN（绕开界面亦生效）。
  const _opGuard = await guardOperation(user, 'serial', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;
  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('serial_masters', body);
  if (_invalid) return _invalid;

  // 必填守卫（V3.22.0 · 修复「空入参直接 500」）：
  // 序列号 serial_no 在库里是 NOT NULL 且带 UNIQUE(org_id, serial_no)。缺它时旧行为是
  // bind undefined → 数据库报约束错误 → 端点未捕获 → 中间件兜底 500。
  // 物料归属（materialCode / materialId 二选一）同属必填：序列号存在的意义就是追溯到具体
  // 物料，没有物料的序列号在召回与售后追溯里是纯噪声，宁可建单时拦下。
  const _missing = requireFields(body, ['serialNo'], { serialNo: '序列号' });
  if (_missing) return _missing;
  if (!body.materialCode && !body.materialId) {
    return json(
      { error: '请填写「物料编码」后再提交（序列号必须归属到具体物料，否则无法追溯）', code: 'MISSING_REQUIRED', field: 'materialCode' },
      400
    );
  }
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'sm-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO serial_masters (id, org_id, serial_no, material_id, material_code, material_name, batch_no, warehouse_id, hu_id, status, inbound_date, customer_name, remarks, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.serialNo, body.materialId || null, body.materialCode || null, body.materialName || null,
    body.batchNo || null, body.warehouseId || null, body.huId || null, body.status || 'in_stock',
    body.inboundDate || null, body.customerName || null, body.remarks || null, now, now, user.name, user.name
  ).run();

  const row = await db.prepare(`SELECT * FROM serial_masters WHERE id = ?`).bind(id).first();

  // 写入流转记录：若显式传入 movement 则按传入；否则若带入库日期且状态为在库，
  // 自动补一条入库流转，保证历史轨迹完整。
  if (body.movement && typeof body.movement === 'object') {
    await insertSerialMovement(db, id, body.movement, user, now);
  } else if (body.inboundDate && (body.status || 'in_stock') === 'in_stock') {
    await insertSerialMovement(db, id, { type: 'inbound', docNo: body.docNo || null, date: body.inboundDate, status: 'in_stock', note: '初始入库' }, user, now);
  }

  const movements = await db.prepare(`SELECT * FROM serial_movements WHERE serial_master_id = ?`).bind(id).all();

  // B6 审计：新建序列号 = 为某个单件建立追溯起点，后续所有售后/召回都以它为准。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'serial_masters',
    entityId: id,
    action: 'create',
    summary:
      `新建序列号 ${body.serialNo}` +
      `（物料：${body.materialCode || body.materialId || '-'} ${body.materialName || ''}；` +
      `批次：${body.batchNo || '-'}；状态：${body.status || 'in_stock'}）`,
  });

  return json({ ...row, movements: movements.results || [] });
}
