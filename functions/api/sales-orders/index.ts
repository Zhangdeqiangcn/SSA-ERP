// GET /api/sales-orders — 分页查询销售订单（按 org_id 隔离）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';
import { audit } from '../../_shared/entities';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status') || '';
  const customerId = url.searchParams.get('customerId') || '';

  let sql = `SELECT * FROM sales_orders WHERE org_id = ?`;
  const params = [user.org_id];
  const rls = rlsFragment(user, 'sales_orders');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(rls.param!); }

  if (keyword) {
    sql += ` AND (order_no LIKE ? OR customer_name LIKE ? OR sales_person LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (customerId) {
    sql += ` AND customer_id = ?`;
    params.push(customerId);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const orders = (result.results || []).map(row => ({
    ...row,
    total_amount: Number(row.total_amount),
    tax_rate: row.tax_rate ? Number(row.tax_rate) : null,
    tax_amount: Number(row.tax_amount),
    grand_total: Number(row.grand_total),
    delivered_quantity: row.delivered_quantity ? Number(row.delivered_quantity) : 0,
    received_amount: row.received_amount ? Number(row.received_amount) : 0,
    credit_amount: row.credit_amount ? Number(row.credit_amount) : 0,
  }));

  // 查询总数
  let countSql = `SELECT COUNT(*) as cnt FROM sales_orders WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(rls.param!); }
  if (keyword) {
    countSql += ` AND (order_no LIKE ? OR customer_name LIKE ? OR sales_person LIKE ?)`;
    countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
  }
  if (customerId) {
    countSql += ` AND customer_id = ?`;
    countParams.push(customerId);
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  // 行明细随列表一并返回（snake 原样，前端用 snakeToCamel 统一映射），保证前端 salesStore 取到完整订单
  const data = [];
  for (const r of orders) {
    const items = await db.prepare(`SELECT * FROM sales_order_items WHERE sales_order_id = ? ORDER BY rowid`).bind(r.id).all();
    data.push({ ...r, items: (items.results || []).map((it: any) => ({ ...it })) });
  }

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

// POST /api/sales-orders — 创建销售订单（W1 根治双通道：直写真实 D1 sales_orders）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  if (!body.orderNo || !body.customerName) return json({ error: '订单编号与客户名称必填' }, 400);
  // 防御：order_date / sales_person 为 NOT NULL 且无默认，前端必传；若缺失给安全默认值，避免 500
  if (!body.orderDate) body.orderDate = new Date().toISOString().slice(0, 10);
  if (!body.salesPerson) body.salesPerson = user.name || '系统';

  const dup = await db.prepare(`SELECT id FROM sales_orders WHERE org_id = ? AND order_no = ?`).bind(user.org_id, body.orderNo).first();
  if (dup) return json({ error: '订单编号已存在' }, 409);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = uid('so');

  const fields = ['orderNo', 'type', 'status', 'customerId', 'customerName', 'customerCode', 'contactName', 'contactPhone',
    'projectId', 'projectNo', 'projectName', 'totalAmount', 'taxRate', 'taxAmount', 'grandTotal',
    'orderDate', 'expectedDeliveryDate', 'actualDeliveryDate', 'paymentTerms', 'deliveryAddress', 'salesPerson',
    'tradeTerms', 'shipToAddress', 'remarks', 'deliveredQuantity', 'receivedAmount', 'arDueDate',
    'creditOccupied', 'creditAmount', 'shippingMode', 'directShipVendorId', 'directShipVendorName',
    'thirdPartyCompanyName', 'contractId', 'contractNo'];
  const colFor = (f) => f === 'orderNo' ? 'order_no' : f === 'customerId' ? 'customer_id' : f === 'customerName' ? 'customer_name' :
    f === 'customerCode' ? 'customer_code' : f === 'contactName' ? 'contact_name' : f === 'contactPhone' ? 'contact_phone' :
    f === 'projectId' ? 'project_id' : f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' :
    f === 'totalAmount' ? 'total_amount' : f === 'taxRate' ? 'tax_rate' : f === 'taxAmount' ? 'tax_amount' :
    f === 'grandTotal' ? 'grand_total' : f === 'orderDate' ? 'order_date' : f === 'expectedDeliveryDate' ? 'expected_delivery_date' :
    f === 'actualDeliveryDate' ? 'actual_delivery_date' : f === 'paymentTerms' ? 'payment_terms' : f === 'deliveryAddress' ? 'delivery_address' :
    f === 'salesPerson' ? 'sales_person' : f === 'tradeTerms' ? 'trade_terms' : f === 'shipToAddress' ? 'ship_to_address' :
    f === 'deliveredQuantity' ? 'delivered_quantity' : f === 'receivedAmount' ? 'received_amount' : f === 'arDueDate' ? 'ar_due_date' :
    f === 'creditOccupied' ? 'credit_occupied' : f === 'creditAmount' ? 'credit_amount' : f === 'shippingMode' ? 'shipping_mode' :
    f === 'directShipVendorId' ? 'direct_ship_vendor_id' : f === 'directShipVendorName' ? 'direct_ship_vendor_name' :
    f === 'thirdPartyCompanyName' ? 'third_party_company_name' : f === 'contractId' ? 'contract_id' : f === 'contractNo' ? 'contract_no' :
    f.toLowerCase();

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(now, now, user.id, user.name);

  await db.prepare(`INSERT INTO sales_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals).run();

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      await db.prepare(`INSERT INTO sales_order_items (id, sales_order_id, material_id, material_code, material_name, specification, unit, quantity, unit_price, amount, delivery_date, remarks, delivered_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || `soi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, item.materialId, item.materialCode, item.materialName, item.specification, item.unit,
        item.quantity || 0, item.unitPrice || 0, item.amount || 0, item.deliveryDate || null, item.remarks || null, item.deliveredQuantity || 0
      ).run();
    }
  }

  await audit(db, user.org_id, user, 'sales_orders', 'create', `创建销售订单 ${body.orderNo}`);
  const created = await db.prepare(`SELECT * FROM sales_orders WHERE id = ?`).bind(id).first();
  return json({ ...created, items: body.items || [] }, 201);
}
