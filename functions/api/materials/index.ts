// GET /api/materials — 分页查询物料列表（按 org_id 隔离）
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsFragment } from '../../_shared/rls';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const keyword = (url.searchParams.get('keyword') || '').trim();
  const materialType = url.searchParams.get('materialType');
  const status = url.searchParams.get('status');

  let sql = 'SELECT * FROM materials WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsFragment(user, 'materials');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(rls.param!); }

  if (keyword) {
    sql += ' AND (code LIKE ? OR name LIKE ? OR specification LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (materialType) {
    sql += ' AND material_type = ?';
    params.push(materialType);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();
  const data = (rows.results || []).map((r: any) => formatMaterial(r));

  // 总数（不含分页条件）
  let countSql = 'SELECT COUNT(*) as cnt FROM materials WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(rls.param!); }
  if (keyword) {
    countSql += ' AND (code LIKE ? OR name LIKE ? OR specification LIKE ?)';
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw);
  }
  if (materialType) {
    countSql += ' AND material_type = ?';
    countParams.push(materialType);
  }
  if (status) {
    countSql += ' AND status = ?';
    countParams.push(status);
  }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

function formatMaterial(r: any) {
  return {
    id: r.id,
    org_id: r.org_id,
    code: r.code,
    name: r.name,
    categoryId: r.category_id,
    categoryName: r.category_name,
    specification: r.specification,
    model: r.model,
    unit: r.unit,
    materialType: r.material_type,
    makeOrBuy: r.make_or_buy,
    safetyStock: r.safety_stock,
    minStock: r.min_stock,
    maxStock: r.max_stock,
    currentStock: r.current_stock,
    price: r.price,
    currency: r.currency,
    standardPrice: r.standard_price,
    movingAvgPrice: r.moving_avg_price,
    stockValue: r.stock_value,
    leadTime: r.lead_time,
    moq: r.moq,
    mpq: r.mpq,
    defaultVendorId: r.default_vendor_id,
    defaultVendorName: r.default_vendor_name,
    purchaseUnit: r.purchase_unit,
    unitConversion: r.unit_conversion,
    purchasingGroup: r.purchasing_group,
    orderUnit: r.order_unit,
    purchasingValueKey: r.purchasing_value_key,
    grProcessingDays: r.gr_processing_days,
    mrpType: r.mrp_type,
    mrpController: r.mrp_controller,
    lotSize: r.lot_size,
    reorderPoint: r.reorder_point,
    plannedDeliveryDays: r.planned_delivery_days,
    taxClassification: r.tax_classification,
    deliveryUnit: r.delivery_unit,
    minOrderQty: r.min_order_qty,
    minDeliveryQty: r.min_delivery_qty,
    accountAssignmentGroup: r.account_assignment_group,
    valuationClass: r.valuation_class,
    priceControl: r.price_control,
    routing: r.routing,
    workCenter: r.work_center,
    cycleTime: r.cycle_time,
    scrapRate: r.scrap_rate,
    inspectionPoint: r.inspection_point,
    status: r.status,
    lifecycleStatus: r.lifecycle_status,
    shelfLifeDays: r.shelf_life_days,
    shelfLifeWarningDays: r.shelf_life_warning_days,
    batchManaged: !!r.batch_managed,
    serialized: !!r.serialized,
    gtin: r.gtin,
    remarks: r.remarks,
    parameters: safeJsonParse(r.parameters),
    plantParams: safeJsonParse(r.plant_params),
    customFields: safeJsonParse(r.custom_fields),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

function safeJsonParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}
