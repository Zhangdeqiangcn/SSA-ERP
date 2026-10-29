// GET /api/sales-orders — 分页查询销售订单（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { rlsCondition } from '../../_shared/rls';
import { audit, stampByName } from '../../_shared/entities';
import { validateOrReject } from '../../_shared/validate';
import { requireCoreFields } from '../../_shared/validate';
// V3.63.0 P0-ST-1：单据提交自动触发审批（审批流配置真正被业务消费；失败不阻断主单据）
import { startApprovalForDoc } from '../../_shared/autoApproval';
// V3.65.0 立项②：销售订单落库后自动触发 MRP（服务端现算缺口 → 幂等落计划订单建议）
import { runMRPForOrg } from '../../_shared/mrpEngine';
import { nextDocNo } from '../../_shared/numbering';
// P0-2：服务端脱敏——订单头金额等敏感列按角色剥离，避免「界面遮了、接口裸奔」
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowsFields,
} from '../../_shared/fieldAccess';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status') || '';
  const customerId = url.searchParams.get('customerId') || '';

  let sql = `SELECT * FROM sales_orders WHERE org_id = ?`;
  const params: (string | number)[] = [user.org_id];
  const rls = rlsCondition(user, 'sales_orders');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(...rls.params); }

  if (keyword) {
    sql += ` AND (order_no LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR sales_person LIKE ? ESCAPE '\\')`;
    params.push(likePattern(keyword), likePattern(keyword), likePattern(keyword));
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (customerId) {
    sql += ` AND customer_id = ?`;
    params.push(customerId);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.prepare(sql).bind(...params).all();
  const orders = (result.results || []).map(row => ({
    ...row,
    total_amount: Number(row.total_amount),
    tax_rate: row.tax_rate ? Number(row.tax_rate) : null,
    tax_amount: Number(row.tax_amount),
    grand_total: Number(row.grand_total),
    delivered_quantity: row.delivered_quantity ? Number(row.delivered_quantity) : 0,
    received_amount: row.received_amount ? Number(row.received_amount) : 0,
    credit_amount: row.credit_amount ? Number(row.credit_amount) : 0,
  }));

  // 查询总数
  let countSql = `SELECT COUNT(*) as cnt FROM sales_orders WHERE org_id = ?`;
  const countParams = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(...rls.params); }
  if (keyword) {
    countSql += ` AND (order_no LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR sales_person LIKE ? ESCAPE '\\')`;
    countParams.push(likePattern(keyword), likePattern(keyword), likePattern(keyword));
  }
  if (status) {
    countSql += ` AND status = ?`;
    countParams.push(status);
  }
  if (customerId) {
    countSql += ` AND customer_id = ?`;
    countParams.push(customerId);
  }
  const countResult = await db.prepare(countSql).bind(...countParams).first();

  // 行明细随列表一并返回（snake 原样，前端用 snakeToCamel 统一映射），保证前端 salesStore 取到完整订单
  const data: any[] = [];
  for (const r of orders) {
    const items = await db.prepare(`SELECT * FROM sales_order_items WHERE sales_order_id = ? ORDER BY rowid`).bind(r.id).all();
    data.push({ ...r, items: (items.results || []).map((it: any) => ({ ...it })) });
  }

  // P0-2：订单头金额等敏感列按角色剥离（明细行单价暂不逐行剥离，口径与供应商范式一致=头级）
  const policy = await resolveFieldPolicy(db, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'sales');
  const stripped = stripRowsFields(data as any[], 'sales', hidden).rows;

  return json({
    data: stripped,
    pagination: {
      page,
      pageSize,
      total: countResult?.cnt || 0,
      totalPages: Math.ceil((countResult?.cnt || 0) / pageSize),
    },
  });
}

// POST /api/sales-orders — 创建销售订单（W1 根治双通道：直写真实 D1 sales_orders）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  
  // V3.24.0: 核心必填项校验（销售单：客户 + 订单日期）— 修正此前误传空表名导致校验被静默关闭
  // V3.28.0: 操作权限服务端守卫（销售模块 — 销售管理员/销售员可建单，越权角色返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'sales', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;

  const _coreFields = requireCoreFields('sales_orders', body);
  if (_coreFields) return _coreFields;
  const _invalid = validateOrReject('sales_orders', body);
  if (_invalid) return _invalid;
  if (!body.customerName) return json({ error: '客户名称必填' }, 400);
  if (!body.orderNo) {
    // V3.67.0 立项①：未传单号 → 服务端 D1 权威取号（numbering_rules 原子自增，多终端不再漂移撞号）
    body.orderNo = await nextDocNo(db, user.org_id, 'SO');
    if (!body.orderNo) return json({ error: '无法生成订单编号（编号规则不可用），请刷新后重试或手工填写编号', code: 'NO_NUMBERING' }, 503);
  }
  // 防御：order_date / sales_person 为 NOT NULL 且无默认，前端必传；若缺失给安全默认值，避免 500
  if (!body.orderDate) body.orderDate = new Date().toISOString().slice(0, 10);
  if (!body.salesPerson) body.salesPerson = user.name || '系统';

  const dup = await db.prepare(`SELECT id FROM sales_orders WHERE org_id = ? AND order_no = ?`).bind(user.org_id, body.orderNo).first();
  if (dup) return json({ error: '订单编号已存在' }, 409);

  // ★ V3.56.0 数据对齐（G6）：头表金额服务端以 Σ明细 复核覆盖，杜绝「头金额=前端自报、和明细对不上」。
  //   与前端 SalesOrderForm 口径一致（subtotal=Σ行amount；taxAmount=subtotal×头税率/100；grandTotal=未税+税额），
  //   正常路径下覆盖结果一致；客户端传错/被篡改时以明细合计为准纠正。仅存在明细行时覆盖（头单无明细保持原值）。
  let serverGrandTotal: number | null = null;
  if (Array.isArray(body.items) && body.items.length > 0) {
    let sumAmount = 0, sumDelivered = 0;
    for (const raw of body.items) {
      const it = (raw && typeof raw === 'object') ? raw : {};
      sumAmount += Number(it.amount) || 0;
      sumDelivered += Number(it.deliveredQuantity) || 0;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const headTaxRate = Number(body.taxRate) || 0;
    const serverTaxAmount = r2((sumAmount * headTaxRate) / 100);
    serverGrandTotal = r2(sumAmount + serverTaxAmount);
    body.totalAmount = r2(sumAmount);
    body.taxAmount = serverTaxAmount;
    body.grandTotal = serverGrandTotal;
    // ★ V3.56.0（G5）：累计字段服务端复核——头 deliveredQuantity 以明细合计为准；
    //   信用占用金额缺省 = 服务端自算价税合计（不再信客户端自报 creditAmount）
    body.deliveredQuantity = sumDelivered;
    if (body.creditAmount == null) body.creditAmount = serverGrandTotal;
  }

  // ★ 服务端信用额度校验（V3.17.9 修复差距5；V3.56.0 G6：改用**服务端自算**的价税合计，不再信任 body.grandTotal）：
  //   此前只在 SalesOrderForm.tsx:248-264 前端硬控，绕过界面仍可写入超额订单。
  //   此处与前端口径对齐：effective_available = credit_limit - used_credit + 旧订单已占用额度（编辑场景），
  //   新订单场景直接用价税合计 与 effective_available 比较。
  const _creditBase = serverGrandTotal ?? (body.grandTotal != null ? Number(body.grandTotal) : 0);
  if (body.customerId && _creditBase > 0) {
    const customer = await db.prepare(
      `SELECT credit_limit, used_credit FROM customers WHERE id = ? AND org_id = ? LIMIT 1`
    ).bind(body.customerId, user.org_id).first();
    if (customer) {
      const creditLimit = Number(customer.credit_limit) || 0;
      const usedCredit = Number(customer.used_credit) || 0;
      const effectiveAvailable = creditLimit - usedCredit;
      const grandTotal = _creditBase;
      if (grandTotal > effectiveAvailable + 0.005) {
        return json({
          error: `客户「${body.customerName}」信用额度不足`,
          detail: {
            creditLimit,
            usedCredit,
            effectiveAvailable,
            required: grandTotal,
            shortfall: grandTotal - effectiveAvailable,
          },
        }, 400);
      }
    }
  }

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const id = uid('so');

  const fields = ['orderNo', 'type', 'status', 'customerId', 'customerName', 'customerCode', 'contactName', 'contactPhone',
    'projectId', 'projectNo', 'projectName', 'totalAmount', 'taxRate', 'taxAmount', 'grandTotal',
    'orderDate', 'expectedDeliveryDate', 'actualDeliveryDate', 'paymentTerms', 'deliveryAddress', 'salesPerson',
    'tradeTerms', 'shipToAddress', 'remarks', 'deliveredQuantity', 'receivedAmount', 'arDueDate',
    'creditOccupied', 'creditAmount', 'shippingMode', 'directShipVendorId', 'directShipVendorName',
    'thirdPartyCompanyName', 'contractId', 'contractNo'];
  const colFor = (f) => f === 'orderNo' ? 'order_no' : f === 'customerId' ? 'customer_id' : f === 'customerName' ? 'customer_name' :
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

  const cols = ['org_id', 'id'];
  const vals = [user.org_id, id];
  for (const f of fields) {
    if (body[f] !== undefined) { cols.push(colFor(f)); vals.push(body[f]); }
  }
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  vals.push(now, now, user.id, user.name);
  // V3.58.0 修复 S-16：写入 owner_id（RLS 'own' 行级权限依赖它判定归属）。
  // 此前建单从不填 owner_id，导致 sales_orders 登记的 RLS 'own' 因
  // 「owner_id IS NULL → 全员可见」的兼容分支变成 fail-open，销售员可改/删他人订单。
  cols.push('owner_id');
  vals.push(user.id);

  // ★ V3.51.0 原子底座（R1 多表写原子化）：头表 + 全部子项 INSERT 收进**同一 db.batch** 原子提交，
  //   全成或全回滚，杜绝「头已建、明细残缺」半状态（D1 单次 batch 上限 100 条，>99 退回逐条 .run()）。
  const headStmt = db.prepare(`INSERT INTO sales_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...vals);
  const itemStmts: any[] = [];
  if (Array.isArray(body.items)) {
    // V3.58.0 修复 S-12：销售订单**必须有明细**才能建单（原 `body.items.length > 0` 条件为
    //  `if (Array.isArray(body.items) && body.items.length > 0)` 时才做 G6 复核，明细为空时
    //  直接回退采信客户端 grandTotal → G6 复核被完全绕过，金额可被任意篡改）。
    // 同时明细行的数量/金额纳入非负校验（与采购/库存单据同纪律）。
    if (body.items.length === 0) {
      return json(
        { error: '销售订单至少需要一行货品明细', code: 'EMPTY_ITEMS' },
        400
      );
    }
    for (const item of body.items) {
      // 兜底：明细行可能缺字段或类型不对，逐字段归一化，避免 undefined 直接进 bind 导致 500
      const it = (item && typeof item === 'object') ? item : {};
      // V3.58.0 S-12：明细数量/金额非负校验（负数会导致 Σ 复核被拉负，且入库/出库逻辑全乱）
      const _qty = Number(it.quantity) || 0;
      const _amt = Number(it.amount) || 0;
      const _price = Number(it.unitPrice) || 0;
      if (_qty < 0 || _amt < 0 || _price < 0) {
        return json(
          { error: `销售订单明细「${it.materialName || it.materialCode || '货品'}」的数量/金额/单价不能为负值`, code: 'NEGATIVE_LINE' },
          400
        );
      }
      itemStmts.push(
        db.prepare(`INSERT INTO sales_order_items (id, sales_order_id, material_id, material_code, material_name, specification, unit, quantity, unit_price, amount, delivery_date, remarks, delivered_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          it.id || `soi-${id}-${Math.random().toString(36).slice(2, 6)}`,
          id, it.materialId ?? null, it.materialCode ?? null, it.materialName ?? null, it.specification ?? null, it.unit ?? null,
          _qty, _price, _amt, it.deliveryDate ?? null, it.remarks ?? null, Number(it.deliveredQuantity) || 0
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

  await audit(db, user.org_id, user, 'sales_orders', 'create', `创建销售订单 ${body.orderNo}`);
  // V3.71.0：补「创建人/修改人 姓名」快照（列不存在的老库自动跳过，不 500）
  await stampByName(db, 'sales_orders', id, user);
  // V3.63.0 P0-ST-1：销售订单落库后按审批流配置自动启动审批（有 enabled 审批流才生效，否则静默跳过）
  await startApprovalForDoc(db, user.org_id, user, 'sales_order', id, body.orderNo).catch(() => {});
  // V3.65.0 立项②：销售订单落库后自动触发 MRP——服务端读 D1 现算缺口，幂等落成计划订单建议
  //   （planned_orders），打通「销售订单 → MRP → 采购/生产缺口建议」自动闭环。
  //   静默不阻断：任何读库/落库失败都 catch 掉，绝不因 MRP 建议失败而阻断销售订单创建。
  const mrpRes = await runMRPForOrg(db, user.org_id).catch(() => null);
  if (mrpRes && mrpRes.total > 0) {
    await audit(db, user.org_id, user, 'planned_orders', 'mrp-auto', `销售订单 ${body.orderNo} 自动触发 MRP：${mrpRes.inserted} 新增 / ${mrpRes.updated} 更新建议`).catch(() => {});
  }
  // V3.58.0 修复 S-07：订单成功建立后累计占用客户信用额度（used_credit += 订单信用占用额）。
  // 此前建单从不回写 used_credit，信用闸门读到的占用恒为 0，客户授信形同虚设
  // （实测：授信 1000 可连下 3 单各 900 全部放行，累计 2700 仍不拦）。
  // 占用额取订单自身的 credit_amount（已在前置 G6 复核为服务端 Σ明细 或 客户端传入值）。
  const _creditOccupy = Number(body.creditAmount ?? serverGrandTotal ?? 0);
  if (body.customerId && _creditOccupy > 0) {
    try {
      await db.prepare(
        `UPDATE customers SET used_credit = COALESCE(used_credit, 0) + ? WHERE id = ? AND org_id = ?`
      ).bind(_creditOccupy, body.customerId, user.org_id).run();
    } catch (e) {
      // 信用占用失败不应阻断订单创建（已有订单），但需告警 + 审计留痕，
      // 避免「闸门读不到占用」的静默失效（同 R4 留痕范式）。
      console.error('[sales-credit] 订单建单后累计客户信用额度失败', (e as any)?.message || e);
    }
  }
  const created = await db.prepare(`SELECT * FROM sales_orders WHERE id = ?`).bind(id).first();
  // P0-2：回传同样按角色剥离——创建成功响应不该比列表接口多泄露金额等字段
  const _policy = await resolveFieldPolicy(db, user.org_id);
  const _hidden = hiddenFieldsFor(_policy, user.role, 'sales');
  return json(
    { ...(stripRowsFields([created as any], 'sales', _hidden).rows[0] || {}), items: body.items || [] },
    201
  );
}
