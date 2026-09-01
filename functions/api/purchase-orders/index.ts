// GET /api/purchase-orders — 分页查询采购订单（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const vendorId = url.searchParams.get('vendorId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'order_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE po.org_id = ?`;
  const params = [user.org_id];
  const rls = rlsFragment(user, 'purchase_orders');
  if (rls.clause !== '1=1') { where += ' AND ' + rls.clause.replace(/owner_id/g, 'po.owner_id'); params.push(rls.param!); }

  if (keyword) {
    where += ` AND (po.order_no LIKE ? OR po.vendor_name LIKE ? OR po.contact LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (vendorId) {
    where += ` AND po.vendor_id = ?`;
    params.push(vendorId);
  }
  if (status) {
    where += ` AND po.status = ?`;
    params.push(status);
  }

  const allowedSort = ['order_date', 'expected_delivery_date', 'total_amount', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'order_date';
  const order = `${sortCol} ${sortOrder}`;

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM purchase_orders po ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM purchase_orders po ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({
      ...r,
      items: [], // 行明细需单独查询，此处暂空
    })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}
