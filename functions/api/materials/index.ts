// GET /api/materials — 分页查询物料列表（按 org_id 隔离）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
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

// POST /api/materials — 创建物料（D1 materials，会话鉴权）
// V2.74.5 起物料主数据直连 D1 materials（与开放网关 /api/open/materials 同源），消除 app_state Blob 双源。
export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  if (!body.code || !body.name) return json({ error: '物料编码与名称必填' }, 400);

  const dup = await env.DB.prepare(
    'SELECT id FROM materials WHERE org_id = ? AND code = ?'
  ).bind(user.org_id, body.code).first();
  if (dup) return json({ error: '物料编码已存在' }, 409);

  const id = uid('mat');
  const now = new Date().toISOString();
  const {
    code, name, categoryId, categoryName, specification, model, unit,
    materialType, makeOrBuy,
    safetyStock, minStock, maxStock, currentStock,
    price, currency, standardPrice, movingAvgPrice, stockValue,
    leadTime, moq, mpq, defaultVendorId, defaultVendorName,
    purchaseUnit, unitConversion,
    purchasingGroup, orderUnit, purchasingValueKey, grProcessingDays,
    mrpType, mrpController, lotSize, reorderPoint, plannedDeliveryDays,
    taxClassification, deliveryUnit, minOrderQty, minDeliveryQty, accountAssignmentGroup,
    valuationClass, priceControl,
    routing, workCenter, cycleTime, scrapRate, inspectionPoint,
    status, lifecycleStatus, shelfLifeDays, shelfLifeWarningDays,
    batchManaged, serialized, gtin,
    remarks, parameters, plantParams, customFields,
  } = body || {};

  try {
    const fields: Record<string, any> = {
      org_id: user.org_id,
      id,
      code, name,
      category_id: categoryId ?? null,
      category_name: categoryName ?? null,
      specification: specification ?? null,
      model: model ?? null,
      unit: unit || '个',
      material_type: materialType ?? null,
      make_or_buy: makeOrBuy ?? null,
      safety_stock: safetyStock ?? 0,
      min_stock: minStock ?? 0,
      max_stock: maxStock ?? 0,
      current_stock: currentStock ?? 0,
      price: price ?? 0,
      currency: currency || 'CNY',
      standard_price: standardPrice ?? null,
      moving_avg_price: movingAvgPrice ?? null,
      stock_value: stockValue ?? null,
      lead_time: leadTime ?? null,
      moq: moq ?? null,
      mpq: mpq ?? null,
      default_vendor_id: defaultVendorId ?? null,
      default_vendor_name: defaultVendorName ?? null,
      purchase_unit: purchaseUnit ?? null,
      unit_conversion: unitConversion ?? null,
      purchasing_group: purchasingGroup ?? null,
      order_unit: orderUnit ?? null,
      purchasing_value_key: purchasingValueKey ?? null,
      gr_processing_days: grProcessingDays ?? null,
      mrp_type: mrpType ?? null,
      mrp_controller: mrpController ?? null,
      lot_size: lotSize ?? null,
      reorder_point: reorderPoint ?? null,
      planned_delivery_days: plannedDeliveryDays ?? null,
      tax_classification: taxClassification ?? null,
      delivery_unit: deliveryUnit ?? null,
      min_order_qty: minOrderQty ?? null,
      min_delivery_qty: minDeliveryQty ?? null,
      account_assignment_group: accountAssignmentGroup ?? null,
      valuation_class: valuationClass ?? null,
      price_control: priceControl ?? null,
      routing: routing ?? null,
      work_center: workCenter ?? null,
      cycle_time: cycleTime ?? null,
      scrap_rate: scrapRate ?? null,
      inspection_point: inspectionPoint ?? null,
      status: status ?? 'draft',
      lifecycle_status: lifecycleStatus ?? null,
      shelf_life_days: shelfLifeDays ?? 0,
      shelf_life_warning_days: shelfLifeWarningDays ?? 0,
      batch_managed: batchManaged ? 1 : 0,
      serialized: serialized ? 1 : 0,
      gtin: gtin ?? null,
      remarks: remarks ?? null,
      parameters: parameters ? JSON.stringify(parameters) : null,
      plant_params: plantParams ? JSON.stringify(plantParams) : null,
      custom_fields: customFields ? JSON.stringify(customFields) : null,
      owner_id: user.id,
      dept_id: user.department || null,
      created_at: now,
      updated_at: now,
      created_by: user.id,
      updated_by: user.id,
    };
    const colNames = Object.keys(fields);
    const colValues = Object.values(fields);
    const placeholders = colNames.map(() => '?').join(',');
    await env.DB.prepare(
      `INSERT INTO materials (${colNames.join(',')}) VALUES (${placeholders})`
    ).bind(...colValues).run();
  } catch (e: any) {
    return json({ error: '创建失败: ' + (e?.message || String(e)) }, 500);
  }

  await audit(env.DB, user.org_id, user, 'materials', 'create', `创建物料 ${code} ${name}`);
  const created = await env.DB.prepare('SELECT * FROM materials WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json(formatMaterial(created as any), 201);
}

async function audit(DB: any, org_id: string, user: any, entity: string, action: string, summary: string) {
  try {
    await DB.prepare(
      `INSERT INTO audit_logs (id, org_id, user_id, user_name, entity, action, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uid('al'), org_id, user.id, user.name || user.username, entity, action, summary, new Date().toISOString()).run();
  } catch { /* 审计失败不阻断主流程 */ }
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
