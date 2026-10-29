// GET /api/purchase-orders — 分页查询采购订单（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit, stampByName } from '../../_shared/entities';
import { validateOrReject } from '../../_shared/validate';
import { guardOperation } from '../../_shared/operationGuard';
import { requireCoreFields } from '../../_shared/validate';
// V3.63.0 P0-ST-1：单据提交自动触发审批（审批流配置真正被业务消费；失败不阻断主单据）
import { startApprovalForDoc } from '../../_shared/autoApproval';
import { nextDocNo } from '../../_shared/numbering';
// P0-2：服务端脱敏——订单头金额等敏感列按角色剥离
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowsFields,
} from '../../_shared/fieldAccess';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const vendorId = url.searchParams.get('vendorId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'order_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE po.org_id = ?`;
  const params: (string | number)[] = [user.org_id];
  const rls = rlsCondition(user, 'purchase_orders');
  if (rls.clause !== '1=1') { where += ' AND ' + rls.clause.replace(/owner_id/g, 'po.owner_id'); params.push(...rls.params); }

  if (keyword) {
    where += ` AND (po.order_no LIKE ? ESCAPE '\\' OR po.vendor_name LIKE ? ESCAPE '\\' OR po.contact LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  if (vendorId) {
    where += ` AND po.vendor_id = ?`;
    params.push(vendorId);
  }
  if (status) {
    where += ` AND po.status = ?`;
    params.push(status);
  }

  const allowedSort = ['order_date', 'expected_delivery_date', 'total_amount', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'order_date';
  const order = `${sortCol} ${sortOrder}`;

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM purchase_orders po ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM purchase_orders po ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  // 行明细随列表一并返回（snake 原样，前端用 snakeToCamel 统一映射），保证前端 purchaseStore 取到完整订单
  const data: any[] = [];
  for (const r of (rows.results || [])) {
    const items = await db.prepare(`SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY rowid`).bind(r.id).all();
    data.push({ ...r, items: (items.results || []).map((it: any) => ({ ...it })) });
  }

  // P0-2：订单头金额等敏感列按角色剥离（明细行单价暂不逐行剥离，口径与销售单一致=头级）
  const policy = await resolveFieldPolicy(db, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'purchase');
  const stripped = stripRowsFields(data as any[], 'purchase', hidden).rows;

  return json({
    data: stripped,
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/purchase-orders — 创建采购订单（W1 根治双通道：直写真实 D1 purchase_orders）
// 会话鉴权 + org 隔离 + 单号唯一 + 行明细 + B10 version/history 落库 + 审计
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  // V3.24.0: 操作权限服务端守卫（采购模块 — 采购员可建采购单，越权角色返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'purchase', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;

  // V3.24.0: 核心必填项校验（采购单：供应商 + 订单日期）
  const _coreFields = requireCoreFields('purchase_orders', body);
  if (_coreFields) return _coreFields;

  const _invalid = validateOrReject('purchase_orders', body);
  if (_invalid) return _invalid;
  if (!body.vendorId) return json({ error: '供应商必填' }, 400);
  if (!body.orderNo) {
    // V3.67.0 立项①：未传单号 → 服务端 D1 权威取号（numbering_rules 原子自增，多终端不再漂移撞号）
    body.orderNo = await nextDocNo(db, user.org_id, 'PO');
    if (!body.orderNo) return json({ error: '无法生成订单编号（编号规则不可用），请刷新后重试或手工填写编号', code: 'NO_NUMBERING' }, 503);
  }
  // 防御：order_date 为 NOT NULL 且无默认，前端必传；若缺失给安全默认值，避免 500
  if (!body.orderDate) body.orderDate = new Date().toISOString().slice(0, 10);

  const dup = await db.prepare(`SELECT id FROM purchase_orders WHERE org_id = ? AND order_no = ?`).bind(user.org_id, body.orderNo).first();
  if (dup) return json({ error: '订单编号已存在' }, 409);

  // ★ V3.56.0 数据对齐（G1）：头表金额服务端以 Σ明细 复核覆盖，杜绝「头金额=前端自报、和明细对不上」。
  //   前端 OrderForm 本就用 calcTaxTotals(items) 现算这三个值，正常路径下覆盖结果一致；
  //   若客户端传错/被篡改，服务端以明细合计为准纠正（与入库单金额服务端自算同范式，不 400 拒绝合法单）。
  //   仅当存在明细行时才覆盖（头单无明细时保持原值，不误清零）。
  if (Array.isArray(body.items) && body.items.length > 0) {
    let sumAmount = 0, sumTax = 0, sumGrand = 0, sumDelivered = 0;
    for (const raw of body.items) {
      const it = (raw && typeof raw === 'object') ? raw : {};
      const amt = Number(it.amount) || 0;
      const tax = Number(it.taxAmount) || 0;
      sumAmount += amt;
      sumTax += tax;
      // 价税合计：优先用行 amountWithTax，缺则 = 未税 + 税额（与前端 calcTaxTotals 口径一致）
      sumGrand += (it.amountWithTax != null && !Number.isNaN(Number(it.amountWithTax)))
        ? Number(it.amountWithTax)
        : (amt + tax);
      sumDelivered += Number(it.deliveredQuantity) || 0;
    }
    body.totalAmount = Math.round(sumAmount * 100) / 100;
    body.totalTaxAmount = Math.round(sumTax * 100) / 100;
    body.grandTotal = Math.round(sumGrand * 100) / 100;
    // ★ V3.56.0（G5）：累计字段服务端复核——头 deliveredQuantity/creditAmount 以明细合计/价税合计为准
    body.deliveredQuantity = sumDelivered;
    if (body.creditAmount == null) body.creditAmount = body.grandTotal;
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = uid('po');

  // V3.104.0：deliveryTerms（交付条件）此前表单有输入框但未登记 → 填了静默丢弃，本批补上
  const fields = ['orderNo', 'vendorId', 'vendorName', 'contact', 'phone', 'status', 'purchaseType', 'orderDate',
    'expectedDeliveryDate', 'actualDeliveryDate', 'totalAmount', 'currency', 'exchangeRate', 'taxIncluded',
    'totalTaxAmount', 'grandTotal', 'paymentTerms', 'tradeTerms', 'deliveryTerms', 'deliveryAddress', 'remarks',
    'projectNo', 'projectName', 'deliveredQuantity', 'creditOccupied', 'creditAmount', 'creditReleasedAmount',
    'confirmedBy', 'confirmedAt', 'confirmedNote', 'orderMode'];
  const colFor = (f) => f === 'orderNo' ? 'order_no' : f === 'vendorId' ? 'vendor_id' : f === 'vendorName' ? 'vendor_name' :
    f === 'purchaseType' ? 'purchase_type' : f === 'orderDate' ? 'order_date' : f === 'expectedDeliveryDate' ? 'expected_delivery_date' :
    f === 'actualDeliveryDate' ? 'actual_delivery_date' : f === 'totalAmount' ? 'total_amount' : f === 'currency' ? 'currency' :
    f === 'exchangeRate' ? 'exchange_rate' : f === 'taxIncluded' ? 'tax_included' : f === 'totalTaxAmount' ? 'total_tax_amount' :
    f === 'grandTotal' ? 'grand_total' : f === 'paymentTerms' ? 'payment_terms' : f === 'tradeTerms' ? 'trade_terms' :
    f === 'deliveryTerms' ? 'delivery_terms' : f === 'deliveryAddress' ? 'delivery_address' : f === 'projectNo' ? 'project_no' : f === 'projectName' ? 'project_name' :
    f === 'deliveredQuantity' ? 'delivered_quantity' : f === 'creditOccupied' ? 'credit_occupied' : f === 'creditAmount' ? 'credit_amount' :
    f === 'creditReleasedAmount' ? 'credit_released_amount' : f === 'confirmedBy' ? 'confirmed_by' : f === 'confirmedAt' ? 'confirmed_at' :
    f === 'confirmedNote' ? 'confirmed_note' : f === 'orderMode' ? 'order_mode' : f.toLowerCase();

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('version', 'history', 'created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(body.version ?? 1, body.history ? JSON.stringify(body.history) : '[]', now, now, user.id, user.name);

  // ★ V3.51.0 原子底座（R1 多表写原子化）：头表 + 全部子项 INSERT 收进**同一 db.batch** 原子提交
  //   （先构建未执行语句、最后统一提交），全成或全回滚，杜绝「头已建、明细残缺」的半状态
  //   （原「头表 .run() + 循环逐条 .run()」两次独立执行，子项循环中途失败会留孤儿子项指向已建头）。
  //   ★ D1 单次 batch 上限 100 条语句：子项数 ≤99 时收 batch（1 头 + N 子）；>99 时退回逐条 .run()
  //   （保持既有行为，绝不引入「子项多超限整单全失败」这种比半状态更糟的行为）。
  const headStmt = db.prepare(`INSERT INTO purchase_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals);
  const itemStmts: any[] = [];
  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      // 兜底：明细行可能缺字段或类型不对，逐字段归一化，避免 undefined 直接进 bind 导致 500
      const it = (item && typeof item === 'object') ? item : {};
      // V3.104.0：行级供应商/预计交货/关联项目落库（此前固定 16 列不含它们，保存即静默丢弃）
      itemStmts.push(
        db.prepare(`INSERT INTO purchase_order_items (id, purchase_order_id, material_id, material_code, material_name, specification, unit, ordered_quantity, delivered_quantity, unit_price, amount, tax_rate, tax_amount, price_with_tax, amount_with_tax, remarks, vendor_id, vendor_name, expected_delivery_date, project_no, project_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          it.id || `poi-${id}-${Math.random().toString(36).slice(2, 6)}`,
          id, it.materialId ?? null, it.materialCode ?? null, it.materialName ?? null, it.specification ?? null, it.unit ?? null,
          Number(it.orderedQuantity) || 0, Number(it.deliveredQuantity) || 0, Number(it.unitPrice) || 0, Number(it.amount) || 0,
          it.taxRate ?? null, it.taxAmount ?? null, it.priceWithTax ?? null, it.amountWithTax ?? null, it.remarks ?? null,
          it.vendorId ?? null, it.vendorName ?? null, it.expectedDeliveryDate ?? null, it.projectNo ?? null, it.projectName ?? null
        )
      );
    }
  }
  if (itemStmts.length <= 99) {
    await db.batch([headStmt, ...itemStmts]);
  } else {
    await headStmt.run();
    for (const s of itemStmts) await s.run();
  }

  await audit(db, user.org_id, user, 'purchase_orders', 'create', `创建采购订单 ${body.orderNo}`);
  // V3.71.0：补「创建人/修改人 姓名」快照（列不存在的老库自动跳过，不 500）
  await stampByName(db, 'purchase_orders', id, user);
  // V3.63.0 P0-ST-1：采购订单落库后按审批流配置自动启动审批（有 enabled 审批流才生效，否则静默跳过）
  await startApprovalForDoc(db, user.org_id, user, 'purchase_order', id, body.orderNo).catch(() => {});
  const created = await db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).bind(id).first();

  // ★ V3.47.0 3-05：明细**回读数据库**而不是回显请求体。
  //   原式 `items: body.items || []` 回显的是客户端传来的原始数组，而明细行的
  //   `id` 是**服务端生成的**（`it.id || 'poi-...'`）—— 客户端在响应里永远拿不到它。
  //   直接后果：行级三单匹配要求前端把「订单行 id」传给入库单做行锚点，
  //   而前端根本拿不到这个 id ⇒ 锚点恒为空 ⇒ 行级比对退化为按物料编码匹配。
  //   这类"响应形状不对"的问题界面完全不出来（明细显示正常、少个 id 而已）。
  //   排序用 rowid：该表**没有 sequence 列**（0005 建表时未设），写 ORDER BY sequence
  //   会报 no such column —— 我首版就是这么写的，生产守护套件当场打出 SCHEMA_MISMATCH。
  const createdItems = await db
    .prepare(`SELECT id, material_id, material_code, material_name, specification, unit,
                     ordered_quantity, delivered_quantity, unit_price, amount,
                     tax_rate, tax_amount, price_with_tax, amount_with_tax, remarks,
                     vendor_id, vendor_name, expected_delivery_date, project_no, project_name
                FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY rowid`)
    .bind(id)
    .all();
  const itemsOut = (createdItems.results || []).map((r: any) => ({
    id: r.id,
    materialId: r.material_id,
    materialCode: r.material_code,
    materialName: r.material_name,
    specification: r.specification,
    unit: r.unit,
    orderedQuantity: r.ordered_quantity,
    deliveredQuantity: r.delivered_quantity,
    unitPrice: r.unit_price,
    amount: r.amount,
    taxRate: r.tax_rate,
    taxAmount: r.tax_amount,
    priceWithTax: r.price_with_tax,
    amountWithTax: r.amount_with_tax,
    remarks: r.remarks,
    // V3.104.0：行级供应商/预计交货/关联项目回读（迁移 0118 起有列；老库列缺失时 wrangler 部署前 apply 迁移，恒存在）
    vendorId: r.vendor_id,
    vendorName: r.vendor_name,
    expectedDeliveryDate: r.expected_delivery_date,
    projectNo: r.project_no,
    projectName: r.project_name,
  }));
  // P0-2：回传同样按角色剥离——创建成功响应不该比列表接口多泄露金额等字段
  const _policy = await resolveFieldPolicy(db, user.org_id);
  const _hidden = hiddenFieldsFor(_policy, user.role, 'purchase');
  return json(
    { ...(stripRowsFields([created as any], 'purchase', _hidden).rows[0] || {}), items: itemsOut },
    201
  );
}
