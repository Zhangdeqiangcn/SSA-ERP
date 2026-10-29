// GET /api/materials — 分页查询物料列表（按 org_id 隔离）
//
// V3.21.0（差距 19 第 ② 步试点域之二）：本接口此前 `SELECT *` 返回全列，
//   标准价 / 移动平均价 / 库存价值对任何登录角色都是明文 —— 而前端「字段级权限」
//   页面里明明声明了「库管、质检、班长、物流、供应商看不到标准价与移动平均价」。
//   materials 的行级范围是 'all'（全员可见），所以这条声明**一定会被触发**：
//   库管打开物料列表就能读到成本价。现改为读取侧按角色剥离。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { validateOrReject } from '../../_shared/validate';
import { guardOperation } from '../../_shared/operationGuard';
import { stampByName } from '../../_shared/entities';
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowsFields,
} from '../../_shared/fieldAccess';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const materialType = url.searchParams.get('materialType');
  const status = url.searchParams.get('status');

  let sql = 'SELECT * FROM materials WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsCondition(user, 'materials');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(...rls.params); }

  if (keyword) {
    sql += ' AND (code LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\' OR specification LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
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

  // ★ V3.21.0：读取侧字段剥离 —— 让「界面上看不到」变成「数据里也拿不到」
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'material');
  const data = stripRowsFields(
    (rows.results || []).map((r: any) => formatMaterial(r)),
    'material',
    hidden
  ).rows;

  // 总数（不含分页条件）
  let countSql = 'SELECT COUNT(*) as cnt FROM materials WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(...rls.params); }
  if (keyword) {
    countSql += ' AND (code LIKE ? ESCAPE \'\\\' OR name LIKE ? ESCAPE \'\\\' OR specification LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
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
  
  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'material', 'create', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const _invalid = validateOrReject('materials', body);
  if (_invalid) return _invalid;
  if (!body.code || !body.name) return json({ error: '物料编码与名称必填' }, 400);

  const dup = await env.DB.prepare(
    'SELECT id FROM materials WHERE org_id = ? AND code = ?'
  ).bind(user.org_id, body.code).first();
  if (dup) return json({ error: '物料编码已存在' }, 409);

  // ★ V3.21.0：创建时「不可见字段一律不落库」。
  //   与「修改」的策略刻意不同（修改时值有变化 → 403）：创建表单往往带着默认值，
  //   拦成 403 会让无权角色**彻底建不了物料**；剔除后由下方 ?? 默认值落库，
  //   等同「该角色从未填过这个字段」。★ 必须在解构 body 之前执行。
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'material');
  const droppedFields: string[] = [];
  for (const f of hidden) {
    if (f in body) { delete body[f]; droppedFields.push(f); }
  }

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
    // V3.71.0：补「创建人/修改人 姓名」快照（列不存在的老库自动跳过，不 500）
    await stampByName(env.DB, 'materials', id, user);
  } catch (e: any) {
    return errorResponse(e, '创建');
  }

  await audit(env.DB, user.org_id, user, 'materials', 'create', `创建物料 ${code} ${name}`);
  const created = await env.DB.prepare('SELECT * FROM materials WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json(formatMaterial(created as any), 201);
}

// V3.3.0（评测 L-05）：原本地 audit() 的静默 catch 已删除，统一改用 _shared/auditLog 的
//   audit()——审计失败不再被吞掉，而是走「结构化日志 → 降级表留痕 → 永不抛出」三层降级。

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
