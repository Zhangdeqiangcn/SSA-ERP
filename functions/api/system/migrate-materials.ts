// POST /api/system/migrate-materials — 将 app_state 中的物料数据迁入 materials 关系表
// 幂等：ON CONFLICT(org_id, code) DO NOTHING，重复执行安全。
// 需 admin 角色（防止误操作）。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
// V3.5.0 B6：补齐写审计（批量写主数据表，必须留痕）
import { writeAudit } from '../../_shared/auditLog';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  // V2.97.0 修复（安全审计 C2）：① 原判断为 `role !== 'admin'`，会把超级管理员
  //   一并拒绝；② 源数据查询不带组织过滤，任一公司管理员即可触发影响全平台
  //   所有组织的批量写入。现收紧为「超管专属」，且只迁移当前用户所属组织。
  if (user.role !== 'super_admin') {
    return json({ error: '仅超级管理员可执行数据迁移' }, 403);
  }

  try {
    // 仅读取当前用户所属组织的物料数据（key = ssa-erp-materials）
    const rows = await env.DB.prepare(
      `SELECT org_id, value FROM app_state WHERE key = 'ssa-erp-materials' AND org_id = ?`
    ).bind(user.org_id).all();

    let totalInserted = 0;
    let totalSkipped = 0;
    const now = new Date().toISOString();

    for (const row of (rows.results || [])) {
      const orgId = (row as any).org_id;
      const raw = (row as any).value;
      let materials: any[];
      try { materials = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { continue; }
      if (!Array.isArray(materials)) continue;

      for (const m of materials) {
        const existing = await env.DB.prepare(
          `SELECT id FROM materials WHERE org_id = ? AND code = ?`
        ).bind(orgId, m.code).first();

        if (existing) {
          // 已存在则更新（允许主数据变更同步）
          await env.DB.prepare(`
            UPDATE materials SET
              id = ?, name = ?, category_id = ?, category_name = ?,
              specification = ?, model = ?, unit = ?,
              material_type = ?, make_or_buy = ?,
              safety_stock = ?, min_stock = ?, max_stock = ?, current_stock = ?,
              price = ?, currency = ?, standard_price = ?, moving_avg_price = ?, stock_value = ?,
              lead_time = ?, moq = ?, mpq = ?,
              default_vendor_id = ?, default_vendor_name = ?,
              purchase_unit = ?, unit_conversion = ?,
              purchasing_group = ?, order_unit = ?, purchasing_value_key = ?, gr_processing_days = ?,
              mrp_type = ?, mrp_controller = ?, lot_size = ?, reorder_point = ?, planned_delivery_days = ?,
              tax_classification = ?, delivery_unit = ?, min_order_qty = ?, min_delivery_qty = ?, account_assignment_group = ?,
              valuation_class = ?, price_control = ?,
              routing = ?, work_center = ?, cycle_time = ?, scrap_rate = ?, inspection_point = ?,
              status = ?, lifecycle_status = ?,
              shelf_life_days = ?, shelf_life_warning_days = ?,
              batch_managed = ?, serialized = ?, gtin = ?,
              remarks = ?,
              parameters = ?, plant_params = ?, custom_fields = ?,
              updated_at = ?, updated_by = ?
            WHERE org_id = ? AND code = ?
          `).bind(
            m.id || uid('mat'), m.name, m.categoryId || null, m.categoryName || null,
            m.specification || null, m.model || null, m.unit || '个',
            m.materialType || null, m.makeOrBuy || null,
            m.safetyStock ?? 0, m.minStock ?? 0, m.maxStock ?? 0, m.currentStock ?? 0,
            m.price ?? 0, m.currency || 'CNY', m.standardPrice, m.movingAvgPrice, m.stockValue,
            m.leadTime, m.moq, m.mpq,
            m.defaultVendorId, m.defaultVendorName,
            m.purchaseUnit, m.unitConversion,
            m.purchasingGroup, m.orderUnit, m.purchasingValueKey, m.grProcessingDays,
            m.mrpType, m.mrpController, m.lotSize, m.reorderPoint, m.plannedDeliveryDays,
            m.taxClassification, m.deliveryUnit, m.minOrderQty, m.minDeliveryQty, m.accountAssignmentGroup,
            m.valuationClass, m.priceControl,
            m.routing, m.workCenter, m.cycleTime, m.scrapRate, m.inspectionPoint,
            m.status || 'draft', m.lifecycleStatus,
            m.shelfLifeDays ?? 0, m.shelfLifeWarningDays ?? 0,
            m.batchManaged ? 1 : 0, m.serialized ? 1 : 0, m.gtin,
            m.remarks,
            m.parameters ? JSON.stringify(m.parameters) : null,
            m.plantParams ? JSON.stringify(m.plantParams) : null,
            m.customFields ? JSON.stringify(m.customFields) : null,
            now, user.username,
            orgId, m.code
          ).run();
          totalSkipped++; // 更新也算"已处理"
        } else {
          await env.DB.prepare(`
            INSERT INTO materials
              (org_id, id, code, name, category_id, category_name, specification, model, unit,
               material_type, make_or_buy,
               safety_stock, min_stock, max_stock, current_stock,
               price, currency, standard_price, moving_avg_price, stock_value,
               lead_time, moq, mpq,
               default_vendor_id, default_vendor_name,
               purchase_unit, unit_conversion,
               purchasing_group, order_unit, purchasing_value_key, gr_processing_days,
               mrp_type, mrp_controller, lot_size, reorder_point, planned_delivery_days,
               tax_classification, delivery_unit, min_order_qty, min_delivery_qty, account_assignment_group,
               valuation_class, price_control,
               routing, work_center, cycle_time, scrap_rate, inspection_point,
               status, lifecycle_status,
               shelf_life_days, shelf_life_warning_days,
               batch_managed, serialized, gtin,
               remarks, parameters, plant_params, custom_fields,
               created_at, updated_at, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            orgId, m.id || uid('mat'), m.code, m.name,
            m.categoryId || null, m.categoryName || null,
            m.specification || null, m.model || null, m.unit || '个',
            m.materialType || null, m.makeOrBuy || null,
            m.safetyStock ?? 0, m.minStock ?? 0, m.maxStock ?? 0, m.currentStock ?? 0,
            m.price ?? 0, m.currency || 'CNY', m.standardPrice || null, m.movingAvgPrice || null, m.stockValue || null,
            m.leadTime || null, m.moq || null, m.mpq || null,
            m.defaultVendorId || null, m.defaultVendorName || null,
            m.purchaseUnit || null, m.unitConversion || null,
            m.purchasingGroup || null, m.orderUnit || null, m.purchasingValueKey || null, m.grProcessingDays || null,
            m.mrpType || null, m.mrpController || null, m.lotSize || null, m.reorderPoint || null, m.plannedDeliveryDays || null,
            m.taxClassification || null, m.deliveryUnit || null, m.minOrderQty || null, m.minDeliveryQty || null, m.accountAssignmentGroup || null,
            m.valuationClass || null, m.priceControl || null,
            m.routing || null, m.workCenter || null, m.cycleTime || null, m.scrapRate || null, m.inspectionPoint || null,
            m.status || 'draft', m.lifecycleStatus || null,
            m.shelfLifeDays ?? 0, m.shelfLifeWarningDays ?? 0,
            m.batchManaged ? 1 : 0, m.serialized ? 1 : 0, m.gtin || null,
            m.remarks || null,
            m.parameters ? JSON.stringify(m.parameters) : null,
            m.plantParams ? JSON.stringify(m.plantParams) : null,
            m.customFields ? JSON.stringify(m.customFields) : null,
            now, now, user.username, user.username
          ).run();
          totalInserted++;
        }
      }
    }

    // 记录迁移版本
    await env.DB.prepare(
      `INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)
       ON CONFLICT(version) DO NOTHING`
    ).bind(now).run();

    // B6 审计：这是一次「批量写入主数据表」的动作（物料是后续所有单据的引用源），
    //   必须留痕。特别注意：本端点对已存在的编码执行的是 UPDATE（覆盖字段），
    //   也就是说它具备跳过低版本号批量改写主数据的能力，事后必须能查出是谁跑的、
    //   改了多少条。C1 数据关系化会把这类迁移做成常规运维，审计是它的前置条件。
    await writeAudit(env.DB, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name },
      entity: 'materials',
      entityId: 'migrate-from-app-state',
      action: 'migrate',
      summary:
        `物料数据迁移（app_state → materials 关系表）：新增 ${totalInserted} 条、` +
        `覆盖更新 ${totalSkipped} 条（组织 ${user.org_id}）`,
    });

    return json({
      ok: true,
      message: `物料迁移完成：新增 ${totalInserted} 条，更新 ${totalSkipped} 条`,
      inserted: totalInserted,
      updated: totalSkipped,
    });
  } catch (e: any) {
    return errorResponse(e, '迁移');
  }
}
