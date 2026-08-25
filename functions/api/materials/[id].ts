// GET/PUT/DELETE /api/materials/:id
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '物料不存在' }, 404);

  return json(formatMaterial(row as any));
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }

  // 先查行是否存在
  const existing = await env.DB.prepare(
    'SELECT id, code FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '物料不存在' }, 404);

  // code 唯一性校验（排除自身）
  if (body.code && body.code !== (existing as any).code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM materials WHERE org_id = ? AND code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '物料编码已存在' }, 409);
  }

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

  await env.DB.prepare(`
    UPDATE materials SET
      code = COALESCE(?, code),
      name = COALESCE(?, name),
      category_id = COALESCE(?, category_id),
      category_name = COALESCE(?, category_name),
      specification = COALESCE(?, specification),
      model = COALESCE(?, model),
      unit = COALESCE(?, unit),
      material_type = COALESCE(?, material_type),
      make_or_buy = COALESCE(?, make_or_buy),
      safety_stock = COALESCE(?, safety_stock),
      min_stock = COALESCE(?, min_stock),
      max_stock = COALESCE(?, max_stock),
      current_stock = COALESCE(?, current_stock),
      price = COALESCE(?, price),
      currency = COALESCE(?, currency),
      standard_price = COALESCE(?, standard_price),
      moving_avg_price = COALESCE(?, moving_avg_price),
      stock_value = COALESCE(?, stock_value),
      lead_time = COALESCE(?, lead_time),
      moq = COALESCE(?, moq),
      mpq = COALESCE(?, mpq),
      default_vendor_id = COALESCE(?, default_vendor_id),
      default_vendor_name = COALESCE(?, default_vendor_name),
      purchase_unit = COALESCE(?, purchase_unit),
      unit_conversion = COALESCE(?, unit_conversion),
      purchasing_group = COALESCE(?, purchasing_group),
      order_unit = COALESCE(?, order_unit),
      purchasing_value_key = COALESCE(?, purchasing_value_key),
      gr_processing_days = COALESCE(?, gr_processing_days),
      mrp_type = COALESCE(?, mrp_type),
      mrp_controller = COALESCE(?, mrp_controller),
      lot_size = COALESCE(?, lot_size),
      reorder_point = COALESCE(?, reorder_point),
      planned_delivery_days = COALESCE(?, planned_delivery_days),
      tax_classification = COALESCE(?, tax_classification),
      delivery_unit = COALESCE(?, delivery_unit),
      min_order_qty = COALESCE(?, min_order_qty),
      min_delivery_qty = COALESCE(?, min_delivery_qty),
      account_assignment_group = COALESCE(?, account_assignment_group),
      valuation_class = COALESCE(?, valuation_class),
      price_control = COALESCE(?, price_control),
      routing = COALESCE(?, routing),
      work_center = COALESCE(?, work_center),
      cycle_time = COALESCE(?, cycle_time),
      scrap_rate = COALESCE(?, scrap_rate),
      inspection_point = COALESCE(?, inspection_point),
      status = COALESCE(?, status),
      lifecycle_status = COALESCE(?, lifecycle_status),
      shelf_life_days = COALESCE(?, shelf_life_days),
      shelf_life_warning_days = COALESCE(?, shelf_life_warning_days),
      batch_managed = COALESCE(?, batch_managed),
      serialized = COALESCE(?, serialized),
      gtin = COALESCE(?, gtin),
      remarks = COALESCE(?, remarks),
      parameters = COALESCE(?, parameters),
      plant_params = COALESCE(?, plant_params),
      custom_fields = COALESCE(?, custom_fields),
      updated_at = ?,
      updated_by = ?
    WHERE id = ? AND org_id = ?
  `).bind(
    code, name, categoryId, categoryName, specification, model, unit,
    materialType, makeOrBuy,
    safetyStock ?? 0, minStock ?? 0, maxStock ?? 0, currentStock ?? 0,
    price ?? 0, currency || 'CNY', standardPrice, movingAvgPrice, stockValue,
    leadTime, moq, mpq, defaultVendorId, defaultVendorName,
    purchaseUnit, unitConversion,
    purchasingGroup, orderUnit, purchasingValueKey, grProcessingDays,
    mrpType, mrpController, lotSize, reorderPoint, plannedDeliveryDays,
    taxClassification, deliveryUnit, minOrderQty, minDeliveryQty, accountAssignmentGroup,
    valuationClass, priceControl,
    routing, workCenter, cycleTime, scrapRate, inspectionPoint,
    status, lifecycleStatus,
    shelfLifeDays ?? 0, shelfLifeWarningDays ?? 0,
    batchManaged ? 1 : 0, serialized ? 1 : 0,
    gtin, remarks,
    parameters ? JSON.stringify(parameters) : null,
    plantParams ? JSON.stringify(plantParams) : null,
    customFields ? JSON.stringify(customFields) : null,
    now, user.username,
    params.id, user.org_id
  ).run();

  const updated = await env.DB.prepare(
    'SELECT * FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  return json(formatMaterial(updated as any), 200);
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const result = await env.DB.prepare(
    'DELETE FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();

  if (result.changes === 0) return json({ error: '物料不存在' }, 404);
  return json({ ok: true });
}

function formatMaterial(r: any) {
  return {
    id: r.id, org_id: r.org_id, code: r.code, name: r.name,
    categoryId: r.category_id, categoryName: r.category_name,
    specification: r.specification, model: r.model, unit: r.unit,
    materialType: r.material_type, makeOrBuy: r.make_or_buy,
    safetyStock: r.safety_stock, minStock: r.min_stock, maxStock: r.max_stock,
    currentStock: r.current_stock, price: r.price, currency: r.currency,
    standardPrice: r.standard_price, movingAvgPrice: r.moving_avg_price,
    stockValue: r.stock_value,
    leadTime: r.lead_time, moq: r.moq, mpq: r.mpq,
    defaultVendorId: r.default_vendor_id, defaultVendorName: r.default_vendor_name,
    purchaseUnit: r.purchase_unit, unitConversion: r.unit_conversion,
    purchasingGroup: r.purchasing_group, orderUnit: r.order_unit,
    purchasingValueKey: r.purchasing_value_key, grProcessingDays: r.gr_processing_days,
    mrpType: r.mrp_type, mrpController: r.mrp_controller, lotSize: r.lot_size,
    reorderPoint: r.reorder_point, plannedDeliveryDays: r.planned_delivery_days,
    taxClassification: r.tax_classification, deliveryUnit: r.delivery_unit,
    minOrderQty: r.min_order_qty, minDeliveryQty: r.min_delivery_qty,
    accountAssignmentGroup: r.account_assignment_group,
    valuationClass: r.valuation_class, priceControl: r.price_control,
    routing: r.routing, workCenter: r.work_center, cycleTime: r.cycle_time,
    scrapRate: r.scrap_rate, inspectionPoint: r.inspection_point,
    status: r.status, lifecycleStatus: r.lifecycle_status,
    shelfLifeDays: r.shelf_life_days, shelfLifeWarningDays: r.shelf_life_warning_days,
    batchManaged: !!r.batch_managed, serialized: !!r.serialized, gtin: r.gtin,
    remarks: r.remarks,
    parameters: safeParse(r.parameters), plantParams: safeParse(r.plant_params),
    customFields: safeParse(r.custom_fields),
    createdAt: r.created_at, updatedAt: r.updated_at,
    createdBy: r.created_by, updatedBy: r.updated_by,
  };
}

function safeParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}
