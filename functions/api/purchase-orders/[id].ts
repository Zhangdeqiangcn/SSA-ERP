// GET/PUT/DELETE /api/purchase-orders/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { withVersionGuard } from '../../_shared/optimisticLock';
import { assertRlsOwnership } from '../../_shared/rls';
import { validateOrReject } from '../../_shared/validate';
import { guardStatusTransition } from '../../_shared/statusMachine';
// ★ V3.45.0 改为文件头静态 import：原写法在函数体内 `await import(...)` 每次请求都做动态
//   导入，且与其余 12 处守卫的写法不一致，容易在后续维护中漏改。
import { guardOperation } from '../../_shared/operationGuard';

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

  const row = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);
  // V2.97.0 修复（安全审计 B1）：单条读取补行级归属校验（列表与改/删均已校验，唯读取遗漏）。
  if (!assertRlsOwnership(user, row, 'purchase_orders')) {
    return json({ error: '无权访问该订单' }, 403);
  }

  // 查询行明细
  const items = await db.prepare(`SELECT * FROM purchase_order_items WHERE purchase_order_id = ?`).bind(id).all();

  // P0-2：订单头按角色剥离（与列表同策略），明细行保留
  const _policy = await resolveFieldPolicy(db, user.org_id);
  const _hidden = hiddenFieldsFor(_policy, user.role, 'purchase');
  const strippedHeader = stripRowFields({ ...row } as any, 'purchase', _hidden).row;

  return json({
    ...strippedHeader,
    items: (items.results || []).map(r => ({
      id: r.id, purchase_order_id: r.purchase_order_id, material_id: r.material_id,
      material_code: r.material_code, material_name: r.material_name, specification: r.specification,
      unit: r.unit, ordered_quantity: Number(r.ordered_quantity), delivered_quantity: Number(r.delivered_quantity),
      unit_price: Number(r.unit_price), amount: Number(r.amount), tax_rate: r.tax_rate ? Number(r.tax_rate) : null,
      tax_amount: r.tax_amount ? Number(r.tax_amount) : null, price_with_tax: r.price_with_tax ? Number(r.price_with_tax) : null,
      amount_with_tax: r.amount_with_tax ? Number(r.amount_with_tax) : null, remarks: r.remarks,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // ★ V3.45.0 根治硬伤：原先 `const db = context.env.DB` 写在第 47 行，而第 44 行的守卫
  //   已经把 `db` 传了进去 —— const 存在暂时性死区（TDZ），该行必然抛
  //   `ReferenceError: Cannot access 'db' before initialization` → 中间件兜底 500。
  //   后果：**采购订单的「修改」功能在服务端 100% 不可用**（DELETE 同一病因）。
  //   修法：db 声明上移到守卫之前（与 inbound-orders/[id].ts 等端点写法对齐）。
  const db = context.env.DB;
  const id = context.params.id;

  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await guardOperation(user, 'purchase', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  // 校验存在且属当前 org
  const existing = await db.prepare(`SELECT id, owner_id, status FROM purchase_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '订单不存在' }, 404);
  if (!assertRlsOwnership(user, existing, 'purchase_orders')) return json({ error: '无权限修改他人订单' }, 403);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('purchase_orders', body, { partial: true });
  if (_invalid) return _invalid;

  // #9 服务端状态机：硬拦非法状态流转（如「已收货」不可回退为「已创建」），绕开界面亦生效
  const _statusGuard = guardStatusTransition('purchase_order', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  // code 唯一性检查（若更新 order_no）
  if (body.orderNo) {
    const dup = await db.prepare(`SELECT id FROM purchase_orders WHERE org_id = ? AND order_no = ? AND id != ?`).bind(user.org_id, body.orderNo, id).first();
    if (dup) return json({ error: '订单编号已存在' }, 409);
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // ★ V3.56.0 数据对齐（G1/G5）：改单时若重传明细，头金额服务端以 Σ明细 复核覆盖（与 POST 同范式），
  //   杜绝「界面改了明细但头金额还是客户端自报旧值」的不对齐；明细未传时保持原值。
  //   前端口径：totalAmount=Σ行未税；totalTaxAmount=Σ行税额；grandTotal=价税合计（行 amountWithTax，缺则 未税+税额）。
  if (Array.isArray(body.items) && body.items.length > 0) {
    let sumAmount = 0, sumTax = 0, sumGrand = 0, sumDelivered = 0;
    for (const raw of body.items) {
      const it = (raw && typeof raw === 'object') ? raw : {};
      const amt = Number(it.amount) || 0;
      const tax = Number(it.taxAmount) || 0;
      sumAmount += amt;
      sumTax += tax;
      sumGrand += (it.amountWithTax != null && !Number.isNaN(Number(it.amountWithTax))) ? Number(it.amountWithTax) : (amt + tax);
      sumDelivered += Number(it.deliveredQuantity) || 0;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    body.totalAmount = r2(sumAmount);
    body.totalTaxAmount = r2(sumTax);
    body.grandTotal = r2(sumGrand);
    body.deliveredQuantity = sumDelivered;
    if (body.creditAmount == null) body.creditAmount = body.grandTotal;
  }

  // V3.104.0：deliveryTerms（交付条件）此前未登记 → 改单时静默丢弃，本批补上
  const fields = ['orderNo', 'vendorId', 'vendorName', 'contact', 'phone', 'status', 'purchaseType', 'orderDate',
    'expectedDeliveryDate', 'actualDeliveryDate', 'totalAmount', 'currency', 'exchangeRate', 'taxIncluded',
    'totalTaxAmount', 'grandTotal', 'paymentTerms', 'tradeTerms', 'deliveryTerms', 'deliveryAddress', 'remarks',
    'projectNo', 'projectName', 'deliveredQuantity', 'creditOccupied', 'creditAmount', 'creditReleasedAmount',
    'confirmedBy', 'confirmedAt', 'confirmedNote', 'orderMode', 'version', 'history'];

  const setClauses: string[] = [];
  const values: (string | number)[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const col = f === 'orderNo' ? 'order_no' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
        f === 'purchaseType' ? 'purchase_type' : f === 'orderDate' ? 'order_date' : f === 'expectedDeliveryDate' ? 'expected_delivery_date' :
        f === 'actualDeliveryDate' ? 'actual_delivery_date' : f === 'totalAmount' ? 'total_amount' : f === 'currency' ? 'currency' :
        f === 'exchangeRate' ? 'exchange_rate' : f === 'taxIncluded' ? 'tax_included' : f === 'totalTaxAmount' ? 'total_tax_amount' :
        f === 'grandTotal' ? 'grand_total' : f === 'paymentTerms' ? 'payment_terms' : f === 'tradeTerms' ? 'trade_terms' :
        f === 'deliveryTerms' ? 'delivery_terms' : f === 'deliveryAddress' ? 'delivery_address' : f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' :
        f === 'deliveredQuantity' ? 'delivered_quantity' : f === 'creditOccupied' ? 'credit_occupied' : f === 'creditAmount' ? 'credit_amount' :
        f === 'creditReleasedAmount' ? 'credit_released_amount' : f === 'confirmedBy' ? 'confirmed_by' : f === 'confirmedAt' ? 'confirmed_at' :
        f === 'confirmedNote' ? 'confirmed_note' : f === 'orderMode' ? 'order_mode' :

        f === 'version' ? 'version' : f === 'history' ? 'history' : f.toLowerCase();
      const v = f === 'history' ? (body[f] != null ? JSON.stringify(body[f]) : null) : body[f];
      setClauses.push(`${col} = ?`);
      values.push(v);
    }
  }
  setClauses.push('updated_at = ?', 'updated_by = ?');
  values.push(now, user.name);

  // 乐观锁：携带 version 时按版本号比对，被他人改过则 409，避免静默覆盖
  const conflict = await withVersionGuard({ db, table: 'purchase_orders', id, orgId: user.org_id, body, setClauses, values });
  if (conflict) return conflict;

  // 同步更新行明细（若提供）
  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`).bind(id).run();
    for (const item of body.items) {
      // 兜底：明细行可能缺字段或类型不对，逐字段归一化，避免 undefined 直接进 bind 导致 500
      const it = (item && typeof item === 'object') ? item : {};
      // V3.104.0：行级供应商/预计交货/关联项目落库（此前固定 16 列不含它们，保存即静默丢弃）
      await db.prepare(`INSERT INTO purchase_order_items (id, purchase_order_id, material_id, material_code, material_name, specification, unit, ordered_quantity, delivered_quantity, unit_price, amount, tax_rate, tax_amount, price_with_tax, amount_with_tax, remarks, vendor_id, vendor_name, expected_delivery_date, project_no, project_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        it.id || `poi-${id}-${Math.random().toString(36).slice(2, 6)}`,
        id, it.materialId ?? null, it.materialCode ?? null, it.materialName ?? null, it.specification ?? null, it.unit ?? null,
        Number(it.orderedQuantity) || 0, Number(it.deliveredQuantity) || 0, Number(it.unitPrice) || 0, Number(it.amount) || 0,
        it.taxRate ?? null, it.taxAmount ?? null, it.priceWithTax ?? null, it.amountWithTax ?? null, it.remarks ?? null,
        it.vendorId ?? null, it.vendorName ?? null, it.expectedDeliveryDate ?? null, it.projectNo ?? null, it.projectName ?? null
      ).run();
    }
  }

  const updated = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).bind(id).first();
  await audit(db, user.org_id, user, 'purchase_orders', 'update', `更新采购订单 ${body?.orderNo || existing?.order_no || id}`);
  // P0-2：改单回传同样按角色剥离
  const _policy2 = await resolveFieldPolicy(db, user.org_id);
  const _hidden2 = hiddenFieldsFor(_policy2, user.role, 'purchase');
  return json(stripRowFields((updated as any) || {}, 'purchase', _hidden2).row);
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // ★ V3.45.0：与 PUT 同一处 TDZ 硬伤（db 声明晚于守卫使用）→ 删除功能同样 100% 报 500。
  const db = context.env.DB;
  const id = context.params.id;

  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await guardOperation(user, 'purchase', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  const row = await db.prepare(`SELECT id, owner_id FROM purchase_orders WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '订单不存在' }, 404);
  if (!assertRlsOwnership(user, row, 'purchase_orders')) return json({ error: '无权限删除他人订单' }, 403);

  // ★ V3.49.0 原子底座（R3 删不清子）：原「先删头 → 再删子」两次独立 .run()，
  //   头删成功而子删失败时会留孤儿子行（三单匹配仍引用已删单）。
  //   收进同一 db.batch：先删子后删头，全成或全回滚，杜绝半状态。
  const delItems = db.prepare(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`).bind(id);
  const delHead = db.prepare(`DELETE FROM purchase_orders WHERE id = ?`).bind(id);
  await db.batch([delItems, delHead]);
  await audit(db, user.org_id, user, 'purchase_orders', 'delete', `删除采购订单 ${id}`);

  return json({ success: true });
}
