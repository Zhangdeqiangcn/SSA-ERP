// GET /api/alerts — 获取四类异常预警数据
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = env.DB;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const threshold30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const threshold7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 1. 低库存预警（可用量 < 安全库存）
  const lowStockRows = await db.prepare(`
    SELECT m.code as material_code, m.name as material_name,
           COALESCE(i.quantity, 0) as available_qty,
           COALESCE(i.quantity, 0) as total_qty,
           COALESCE(m.safety_stock, 100) as safety_stock,
           i.warehouse_name as warehouse_name
    FROM materials m
    LEFT JOIN inventory_records i ON m.id = i.material_id AND i.org_id = ?
    WHERE m.org_id = ? AND m.status = 'active'
      AND COALESCE(i.quantity, 0) < COALESCE(m.safety_stock, 100)
    ORDER BY available_qty ASC
    LIMIT 20
  `).bind(user.org_id, user.org_id).all();

  // V2.73：下发结构化数值，供前端规则阈值二次过滤（不再依赖文本解析）
  const lowStockAlerts = (lowStockRows.results || []).map((r: any) => {
    const qty = Number(r.available_qty) || 0;
    const safety = Number(r.safety_stock) || 0;
    return {
      id: r.material_code,
      label: `${r.material_name} (${r.material_code})`,
      value: `可用 ${qty} / 安全库存 ${safety}`,
      extra: r.warehouse_name || '-',
      metrics: { qty, safetyStock: safety, ratioPct: safety > 0 ? (qty / safety) * 100 : 0 },
    };
  });

  // 2. 逾期采购订单
  const poOverdueRows = await db.prepare(`
    SELECT order_no, vendor_name, expected_delivery_date, status
    FROM purchase_orders
    WHERE org_id = ? AND expected_delivery_date < ?
      AND status NOT IN ('completed', 'cancelled')
    ORDER BY expected_delivery_date ASC
    LIMIT 10
  `).bind(user.org_id, todayStr).all();

  const poOverdue = (poOverdueRows.results || []).map((r: any) => {
    const days = Math.floor((today.getTime() - new Date(r.expected_delivery_date).getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: r.order_no,
      label: `${r.order_no} - ${r.vendor_name}`,
      value: `期望 ${r.expected_delivery_date}，逾期 ${days} 天`,
      extra: r.status,
      metrics: { overdueDays: days },
    };
  });

  // 3. 逾期销售订单
  const soOverdueRows = await db.prepare(`
    SELECT order_no, customer_name, expected_delivery_date, status
    FROM sales_orders
    WHERE org_id = ? AND expected_delivery_date < ?
      AND status NOT IN ('completed', 'cancelled')
    ORDER BY expected_delivery_date ASC
    LIMIT 10
  `).bind(user.org_id, todayStr).all();

  const soOverdue = (soOverdueRows.results || []).map((r: any) => {
    const days = Math.floor((today.getTime() - new Date(r.expected_delivery_date).getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: r.order_no,
      label: `${r.order_no} - ${r.customer_name}`,
      value: `期望 ${r.expected_delivery_date}，逾期 ${days} 天`,
      extra: r.status,
      metrics: { overdueDays: days },
    };
  });

  // 4. 临期物料（shelf_life_status = 'expiring' 或 'expired'）
  const expiringRows = await db.prepare(`
    SELECT material_code, material_name, quantity as quantity_on_hand, shelf_life_status
    FROM inventory_records
    WHERE org_id = ? AND shelf_life_status IN ('expiring', 'expired') AND quantity > 0
    ORDER BY updated_at DESC
    LIMIT 20
  `).bind(user.org_id).all();

  const expiringBatches = (expiringRows.results || []).map((r: any) => ({
    id: r.material_code,
    label: `${r.material_name} (${r.material_code})`,
    value: `状态: ${r.shelf_life_status === 'expiring' ? '临期' : '过期'}`,
    // V2.73 修复：原引用 r.quantity，但 SELECT 的是 quantity_on_hand，导致显示 undefined
    extra: `库存 ${r.quantity_on_hand}`,
    metrics: { expired: r.shelf_life_status === 'expired', qty: Number(r.quantity_on_hand) || 0 },
  }));

  // 5. 信用超额客户
  const creditRows = await db.prepare(`
    SELECT code, name, credit_limit, used_credit
    FROM customers
    WHERE org_id = ? AND credit_limit > 0 AND used_credit > credit_limit
    ORDER BY used_credit DESC
    LIMIT 10
  `).bind(user.org_id).all();

  const creditOverdue = (creditRows.results || []).map((r: any) => {
    const limit = Number(r.credit_limit) || 0;
    const used = Number(r.used_credit) || 0;
    return {
      id: r.code,
      label: r.name,
      value: `已用 ¥${used.toLocaleString()} / 授信 ¥${limit.toLocaleString()}`,
      extra: `超出 ¥${(used - limit).toLocaleString()}`,
      metrics: { overRatePct: limit > 0 ? ((used - limit) / limit) * 100 : 0 },
    };
  });

  // 6. 待审批单据
  // V2.73 修复：原口径用 status='pending'，但该值不在订单状态枚举内（采购默认 'draft'），
  // 导致三项计数恒为 0。改为与前端一致的真实待处理状态集：
  //   采购 created/sent（已下单待供应商确认）、销售 draft、工单 draft
  const pendingPO = await db
    .prepare(`SELECT COUNT(*) as cnt FROM purchase_orders WHERE org_id = ? AND status IN ('created','sent')`)
    .bind(user.org_id)
    .first();
  const pendingSO = await db.prepare(`SELECT COUNT(*) as cnt FROM sales_orders WHERE org_id = ? AND status = 'draft'`).bind(user.org_id).first();
  const pendingWO = await db.prepare(`SELECT COUNT(*) as cnt FROM work_orders WHERE org_id = ? AND status = 'draft'`).bind(user.org_id).first();

  return json({
    lowStock: lowStockAlerts,
    overduePO: poOverdue,
    overdueSO: soOverdue,
    expiringBatches: expiringBatches,
    creditOverdue: creditOverdue,
    pendingApprovals: {
      purchaseOrders: Number(pendingPO?.cnt) || 0,
      salesOrders: Number(pendingSO?.cnt) || 0,
      workOrders: Number(pendingWO?.cnt) || 0,
    },
    summary: {
      total: lowStockAlerts.length + poOverdue.length + soOverdue.length + expiringBatches.length + creditOverdue.length,
      critical: poOverdue.length + soOverdue.length + creditOverdue.length,
    },
  });
}
