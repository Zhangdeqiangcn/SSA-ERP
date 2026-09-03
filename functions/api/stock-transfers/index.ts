// GET /api/stock-transfers — 分页查询跨组织转储（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const status = url.searchParams.get('status') || undefined;

  const db = context.env.DB;
  let where = `WHERE st.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (st.transfer_no LIKE ? OR st.from_warehouse_name LIKE ? OR st.to_warehouse_name LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (status) {
    where += ` AND st.status = ?`;
    params.push(status);
  }

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM stock_transfers st ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM stock_transfers st ${where} ORDER BY st.transfer_date DESC, st.created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  // 列表回填 items（store 启动 load 路径需明细支撑 confirmTransfer 双边过账，等同迁移前 Blob 全量）
  const data = await Promise.all((rows.results || []).map(async (r) => {
    const items = await db.prepare(`SELECT * FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(r.id).all();
    return {
      ...r,
      items: (items.results || []).map(it => ({
        id: it.id, material_id: it.material_id, material_code: it.material_code, material_name: it.material_name,
        unit: it.unit, quantity: Number(it.quantity), batch_no: it.batch_no, location_id: it.location_id,
      })),
    };
  }));

  return json({
    data,
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/stock-transfers — 创建跨组织转储（含 items 子表）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'stf-' + crypto.randomUUID();
  await db.prepare(`INSERT INTO stock_transfers (id, org_id, transfer_no, from_warehouse_id, from_warehouse_name, to_warehouse_id, to_warehouse_name, from_org_id, to_org_id, status, transfer_date, remarks, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    id, user.org_id, body.transferNo || ('ST-' + id.slice(0, 8)), body.fromWarehouseId || null, body.fromWarehouseName || null,
    body.toWarehouseId || null, body.toWarehouseName || null, body.fromOrgId || null, body.toOrgId || null,
    body.status || 'draft', body.transferDate || null, body.remarks || null, now, now, user.name, user.name
  ).run();

  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      await db.prepare(`INSERT INTO stock_transfer_items (id, stock_transfer_id, material_id, material_code, material_name, unit, quantity, batch_no, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'sti-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
        item.unit || null, Number(item.quantity) || 0, item.batchNo || null, item.locationId || null
      ).run();
    }
  }

  const row = await db.prepare(`SELECT * FROM stock_transfers WHERE id = ?`).bind(id).first();
  return json(row);
}
