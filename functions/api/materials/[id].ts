// GET/PUT/DELETE /api/materials/:id
//
// V3.21.0（差距 19 第 ② 步试点域之二）：
//   GET 此前 `SELECT *` 原样返回（standard_price / moving_avg_price / stock_value 明文）；
//   PUT 是一张平铺的 `COALESCE(?, 列)` 列表，**零角色判定** —— 库管直接把
//   standardPrice 传上来就能改成本价。现补上读取侧剥离与写入侧门禁。
import { getUserFromRequest, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { validateOrReject } from '../../_shared/validate';

import { audit } from '../../_shared/auditLog';
import { guardOperation } from '../../_shared/operationGuard';
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowFields,
  findForbiddenFieldWrites,
  fieldPermissionError,
} from '../../_shared/fieldAccess';
export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const row = await env.DB.prepare(
    'SELECT * FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!row) return json({ error: '物料不存在' }, 404);

  // ★ V3.21.0：详情与列表必须用同一套剥离规则，否则「列表看不到、点进详情就看到了」
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'material');
  return json(stripRowFields(formatMaterial(row as any), 'material', hidden).row);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  
  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'material', 'update', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const _invalid = validateOrReject('materials', body, { partial: true });
  if (_invalid) return _invalid;

  // 先查行是否存在
  // ★ V3.21.0：改取整行（原为 SELECT id, code 两列）——
  //   字段级门禁需要拿「库中现值」与请求体比对，判断用户是否真的要改动该字段。
  const existing = await env.DB.prepare(
    'SELECT * FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!existing) return json({ error: '物料不存在' }, 404);

  // code 唯一性校验（排除自身）
  if (body.code && body.code !== (existing as any).code) {
    const dup = await env.DB.prepare(
      'SELECT id FROM materials WHERE org_id = ? AND code = ? AND id != ?'
    ).bind(user.org_id, body.code, params.id).first();
    if (dup) return json({ error: '物料编码已存在' }, 409);
  }

  // ★★ V3.21.0 写入侧字段级门禁：不可见字段「值确有变化」即拒绝并说明原因。
  //   判据是「值变了」而非「字段出现了」—— 编辑页保存时回传完整对象（含它看不到的
  //   字段原值），若出现即拒绝，库管改个名称都会被拦，功能直接不可用。
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'material');
  const forbidden = findForbiddenFieldWrites(body, 'material', hidden, formatMaterial(existing));
  if (forbidden.length) {
    return json(fieldPermissionError(forbidden), 403);
  }

  const now = new Date().toISOString();
  const {
    code, name, categoryId, categoryName, specification, model, unit,
    materialType, makeOrBuy,
    safetyStock, minStock, maxStock,
    price, currency, standardPrice,
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
      price = COALESCE(?, price),
      currency = COALESCE(?, currency),
      standard_price = COALESCE(?, standard_price),
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
  `  ).bind(
    code ?? null, name ?? null, categoryId ?? null, categoryName ?? null, specification ?? null, model ?? null, unit ?? null,
    materialType ?? null, makeOrBuy ?? null,
    safetyStock ?? null, minStock ?? null, maxStock ?? null,
    price ?? null, currency ?? null, standardPrice ?? null,
    leadTime ?? null, moq ?? null, mpq ?? null, defaultVendorId ?? null, defaultVendorName ?? null,
    purchaseUnit ?? null, unitConversion ?? null,
    purchasingGroup ?? null, orderUnit ?? null, purchasingValueKey ?? null, grProcessingDays ?? null,
    mrpType ?? null, mrpController ?? null, lotSize ?? null, reorderPoint ?? null, plannedDeliveryDays ?? null,
    taxClassification ?? null, deliveryUnit ?? null, minOrderQty ?? null, minDeliveryQty ?? null, accountAssignmentGroup ?? null,
    valuationClass ?? null, priceControl ?? null,
    routing ?? null, workCenter ?? null, cycleTime ?? null, scrapRate ?? null, inspectionPoint ?? null,
    status ?? null, lifecycleStatus ?? null,
    shelfLifeDays ?? null, shelfLifeWarningDays ?? null,
    batchManaged == null ? null : (batchManaged ? 1 : 0), serialized == null ? null : (serialized ? 1 : 0),
    gtin ?? null, remarks ?? null,
    parameters ? JSON.stringify(parameters) : null,
    plantParams ? JSON.stringify(plantParams) : null,
    customFields ? JSON.stringify(customFields) : null,
    now, user.username,
    params.id, user.org_id
  ).run();
  } catch (e: any) {
    return errorResponse(e, '更新');
  }

  const updated = await env.DB.prepare(
    'SELECT * FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).first();
  if (!updated) return json({ error: '物料不存在' }, 404);
  await audit(env.DB, user.org_id, user, 'materials', 'update', `更新物料 ${(existing as any)?.code || params.id}`);
  // ★ V3.21.0：回传同样剥离 —— 成功响应不该比列表接口多泄露字段
  return json(stripRowFields(formatMaterial(updated as any), 'material', hidden).row, 200);
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const result = await env.DB.prepare(
    'DELETE FROM materials WHERE id = ? AND org_id = ?'
  ).bind(params.id, user.org_id).run();

  if ((result.meta?.changes ?? result.changes) === 0) return json({ error: '物料不存在' }, 404);
  await audit(env.DB, user.org_id, user, 'materials', 'delete', `删除物料 ${params.id}`);
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
