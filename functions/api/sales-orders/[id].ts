// GET/PUT/DELETE /api/sales-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { withVersionGuard } from '../../_shared/optimisticLock';
import { assertRlsOwnership } from '../../_shared/rls';
import { validateOrReject } from '../../_shared/validate';
import { guardStatusTransition } from '../../_shared/statusMachine';

import { audit } from '../../_shared/auditLog';
// P0-2：详情侧同口径剥离（列表遮了但详情裸奔会被绕过）
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowFields,
} from '../../_shared/fieldAccess';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM sales_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);
  // V2.97.0 修复（安全审计 B1）：单条读取补行级归属校验（列表与改/删均已校验，唯读取遗漏）。
  if (!assertRlsOwnership(user, row, 'sales_orders')) {
    return json({ error: '无权访问该订单' }, 403);
  }

  const items = await db.prepare(`SELECT * FROM sales_order_items WHERE sales_order_id = ?`).bind(id).all();

  // P0-2：订单头按角色剥离（与列表同策略），明细行保留
  const _policy = await resolveFieldPolicy(db, user.org_id);
  const _hidden = hiddenFieldsFor(_policy, user.role, 'sales');
  const strippedHeader = stripRowFields({ ...row } as any, 'sales', _hidden).row;

  return json({
    ...strippedHeader,
    items: (items.results || []).map(r => ({
      id: r.id, sales_order_id: r.sales_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, quantity: Number(r.quantity), unit_price: Number(r.unit_price),
      amount: Number(r.amount), delivery_date: r.delivery_date, remarks: r.remarks,
      delivered_quantity: r.delivered_quantity ? Number(r.delivered_quantity) : 0,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  // V3.58.0 修复 S-01：补取 status 列。此前只 SELECT id, owner_id，
  // 导致下方状态机守卫拿到的是 undefined（规则查不到 "undefined" 对应项 → 整段跳过），
  // 已完成/已取消订单可被改回任意状态。同时保留 owner_id 供 RLS 归属判定。
  const existing = await db.prepare(`SELECT id, owner_id, status, order_no FROM sales_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '订单不存在' }, 404);
  // V3.58.0 修复 S-16 副产物：行级归属拦截（owner_id 补写后真正生效）。
  // 33 号守护断言越权操作须返回 code=OPERATION_FORBIDDEN，
  // 因此行级归属拦截也必须携带同一错误码（行级先于模块级拦截，两者需统一对外错误码）。
  if (!assertRlsOwnership(user, existing, 'sales_orders')) {
    return json({ error: '无权限修改他人订单', code: 'OPERATION_FORBIDDEN' }, 403);
  }

  // V3.28.0: 操作权限服务端守卫（销售模块 — 销售管理员/销售员可改单，越权返回 403）
  const _opGuard = await guardOperation(user, 'sales', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('sales_orders', body, { partial: true });
  if (_invalid) return _invalid;

  // #9 服务端状态机：硬拦非法状态流转（如「已全发货」不可回退为「草稿」），绕开界面亦生效
  const _statusGuard = guardStatusTransition('sales_order', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // ★ V3.56.0 数据对齐（G6）：改单时若重传明细，头金额服务端以 Σ明细 复核覆盖（与 POST 同范式），
  //   杜绝「界面改了明细但头金额还是客户端自报旧值」的不对齐；明细未传时保持原值。
  if (Array.isArray(body.items) && body.items.length > 0) {
    let sumAmount = 0, sumDelivered = 0;
    for (const raw of body.items) {
      const it = (raw && typeof raw === 'object') ? raw : {};
      sumAmount += Number(it.amount) || 0;
      sumDelivered += Number(it.deliveredQuantity) || 0;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const headTaxRate = Number(body.taxRate) || 0;
    body.totalAmount = r2(sumAmount);
    body.taxAmount = r2((sumAmount * headTaxRate) / 100);
    body.grandTotal = r2(sumAmount + Number(body.taxAmount));
    body.deliveredQuantity = sumDelivered;
    if (body.creditAmount == null) body.creditAmount = body.grandTotal;
  }

  const fields = ['orderNo', 'type', 'status', 'customerId', 'customerName', 'customerCode', 'contactName', 'contactPhone',
    'projectId', 'projectNo', 'projectName', 'totalAmount', 'taxRate', 'taxAmount', 'grandTotal',
    'orderDate', 'expectedDeliveryDate', 'actualDeliveryDate', 'paymentTerms', 'deliveryAddress', 'salesPerson',
    'tradeTerms', 'shipToAddress', 'remarks', 'deliveredQuantity', 'receivedAmount', 'arDueDate',
    'creditOccupied', 'creditAmount', 'shippingMode', 'directShipVendorId', 'directShipVendorName',
    'thirdPartyCompanyName', 'contractId', 'contractNo'];

  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'customerId' ? 'customer_id' : f === 'customerName' ? 'customer_name' :
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
      setClauses.push(`${col} = ?`);
      values.push(body[f]);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  // 乐观锁：携带 version 时按版本号比对，被他人改过则 409，避免静默覆盖
  const conflict = await withVersionGuard({ db, table: 'sales_orders', id, orgId: user.org_id, body, setClauses, values });
  if (conflict) return conflict;

  // 同步更新行明细
  // V3.58.0 修复 S-18：PUT 明细替换改为 db.batch 原子批次（与 POST 同范式），
  // 杜绝「明细删了、部分插入失败」的半状态（中途失败留孤儿子项/缺行）。
  if (body.items && Array.isArray(body.items)) {
    // ★ V3.61.0 S-06：已发货订单的行已交数量**禁止被客户端改小/清零**。
    //   缺陷：下方 INSERT 的 delivered_quantity 直接取 `Number(it.deliveredQuantity) || 0`，
    //   即客户端自报值。已发货订单（存在已发货记录）时，客户端传 0 就会把已交量清零
    //   → 订单显示「未交」而发货单确实存在 → 订单与发货台账永久对不上，且可重复发货超收。
    //   修法（对标 V3.58.0 WH-01「已记账单据禁改明细」范式）：
    //   有已发货记录时**忽略**客户端传入的 deliveredQuantity，一律保留服务端既有值。
    let _lockedDelivery = false;
    try {
      const shipped = await db
        .prepare(`SELECT COUNT(*) AS c FROM shipments WHERE org_id = ? AND sales_order_no = ?`)
        .bind(user.org_id, String((existing as any)?.order_no || ''))
        .first();
      _lockedDelivery = Number((shipped as any)?.c || 0) > 0;
    } catch {
      // 探测失败按「不锁」处理（不因守卫探测异常阻断正常改单，fail-open 保守放行）
      _lockedDelivery = false;
    }
    // 已发货 → 从库里取回每行既有 delivered_quantity，按 material_code 对齐
    let _serverDelivered: Record<string, number> = {};
    if (_lockedDelivery) {
      const rows = await db
        .prepare(`SELECT material_code, delivered_quantity FROM sales_order_items WHERE sales_order_id = ?`)
        .bind(id)
        .all();
      for (const r of (rows.results || []) as any[]) {
        const k = String(r.material_code || '');
        if (k) _serverDelivered[k] = Number(r.delivered_quantity) || 0;
      }
    }
    const delStmt = db.prepare(`DELETE FROM sales_order_items WHERE sales_order_id = ?`).bind(id);
    const insStmts: any[] = body.items.map((raw: any) => {
      const it = (raw && typeof raw === 'object') ? raw : {};
      // 已发货订单：已交数量以服务端为准，忽略客户端传值（防清零/防篡改）
      const deliveredQty = _lockedDelivery
        ? (_serverDelivered[String(it.materialCode || '')] ?? 0)
        : (Number(it.deliveredQuantity) || 0);
      return db.prepare(`INSERT INTO sales_order_items (id, sales_order_id, material_id, material_code, material_name, specification, unit, quantity, unit_price, amount, delivery_date, remarks, delivered_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        it.id || `soi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, it.materialId ?? null, it.materialCode ?? null, it.materialName ?? null, it.specification ?? null, it.unit ?? null,
        Number(it.quantity) || 0, Number(it.unitPrice) || 0, Number(it.amount) || 0, it.deliveryDate ?? null, it.remarks ?? null, deliveredQty
      );
    });
    if (insStmts.length <= 99) {
      await db.batch([delStmt, ...insStmts]);
    } else {
      await delStmt.run();
      for (const s of insStmts) await s.run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM sales_orders WHERE id = ?`).bind(id).first();

  // V3.58.0 修复 S-07：改单时同步调整客户信用额度占用。
  //   ① 订单金额（credit_amount）变化 → 按「旧占用 vs 新占用」差额调整 used_credit；
  //   ② 订单状态被改为取消（cancelled/canceled）→ 释放全部占用。
  //   与建单累计（index.ts）成对，堵住「只增不减」的额度虚占。
  const _oldCredit = Number((existing as any).credit_amount) || 0;
  const _newCredit = Number((updated as any).credit_amount) || 0;
  const _custId = (updated as any).customer_id;
  const _newStatus = String((updated as any).status || '');
  const _isCancel = _newStatus === 'cancelled' || _newStatus === 'canceled';
  if (_custId) {
    try {
      if (_isCancel) {
        // 取消订单：释放全部占用（含历史累计的部分）
        await db.prepare(
          `UPDATE customers SET used_credit = MAX(0, COALESCE(used_credit, 0) - ?) WHERE id = ? AND org_id = ?`
        ).bind(_oldCredit, _custId, user.org_id).run();
      } else {
        // 改单：按占用差额调整（新占用 - 旧占用），释放/增加
        const _delta = _newCredit - _oldCredit;
        if (_delta !== 0) {
          await db.prepare(
            `UPDATE customers SET used_credit = MAX(0, COALESCE(used_credit, 0) + ?) WHERE id = ? AND org_id = ?`
          ).bind(_delta, _custId, user.org_id).run();
        }
      }
    } catch (e) {
      console.error('[sales-credit] 改单调整客户信用额度失败', (e as any)?.message || e);
    }
  }

  await audit(db, user.org_id, user, 'sales_orders', 'update', `更新销售订单 ${body?.orderNo || existing?.order_no || id}`);
  // P0-2：改单回传同样按角色剥离
  const _policy2 = await resolveFieldPolicy(db, user.org_id);
  const _hidden2 = hiddenFieldsFor(_policy2, user.role, 'sales');
  return json(stripRowFields((updated as any) || {}, 'sales', _hidden2).row);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id, owner_id, order_no, customer_id, credit_amount FROM sales_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);
  // V3.58.0 S-16 副产物：行级归属拦截响应体补 OPERATION_FORBIDDEN 码（与 33 号守护断言对齐）
  if (!assertRlsOwnership(user, row, 'sales_orders')) {
    return json({ error: '无权限删除他人订单', code: 'OPERATION_FORBIDDEN' }, 403);
  }

  // V3.28.0: 操作权限服务端守卫（销售模块 — 仅销售管理员可删，销售员无删除权）
  const _opGuard = await guardOperation(user, 'sales', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  // ★ V3.49.0 原子底座（R3 删不清子）：原「删头 → 删子项」两次独立执行，
  //   且 shipments/shipment_items 按 sales_order_no 字符串关联（非外键，D1 不自动级联），
  //   头删成功后发货台账全部孤儿。改为：先取订单号，再把「发货明细→发货→子项→头」
  //   收进同一 db.batch，先删子后删头，全成或全回滚。
  //   ★ order_no 必须从上面 SELECT 带出（下方 (row as any).order_no），否则恒 null、发货清理被跳过。
  const orderNo = (row as any).order_no || null;
  const batch: any[] = [];
  if (orderNo) {
    batch.push(db.prepare(`DELETE FROM shipment_items WHERE shipment_id IN (SELECT id FROM shipments WHERE sales_order_no = ?)`).bind(orderNo));
    batch.push(db.prepare(`DELETE FROM shipments WHERE sales_order_no = ?`).bind(orderNo));
  }
  batch.push(db.prepare(`DELETE FROM sales_order_items WHERE sales_order_id = ?`).bind(id));
  batch.push(db.prepare(`DELETE FROM sales_orders WHERE id = ?`).bind(id));
  await db.batch(batch);

  // V3.58.0 修复 S-07：删除订单时释放其占用的客户信用额度（used_credit -= 订单占用额）。
  // 与建单累计（index.ts）成对——只建不释放会把额度永久虚占、误伤客户后续下单。
  // 用 MAX(0, ...) 兜底，防止释放后 used_credit 变负（历史上曾多释放/未建单就释放）。
  const _relOccupy = Number((row as any).credit_amount) || 0;
  if ((row as any).customer_id && _relOccupy > 0) {
    try {
      await db.prepare(
        `UPDATE customers SET used_credit = MAX(0, COALESCE(used_credit, 0) - ?) WHERE id = ? AND org_id = ?`
      ).bind(_relOccupy, (row as any).customer_id, user.org_id).run();
    } catch (e) {
      console.error('[sales-credit] 删除订单释放客户信用额度失败', (e as any)?.message || e);
    }
  }

  await audit(db, user.org_id, user, 'sales_orders', 'delete', `删除销售订单 ${id}`);
  return json({ success: true });
}
