// GET /api/inbound-orders — 分页查询入库单（按 org_id 隔离）
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { validateOrReject, requireFields } from '../../_shared/validate';
import { dedupeByNo, resolveIdemKey, findIdem, saveIdem } from '../../_shared/idempotency';

import { audit } from '../../_shared/auditLog';
import { postInbound, assertPeriodOpen } from '../../_shared/inventoryPosting';
import { guardOperation } from '../../_shared/operationGuard';
import { requireCoreFields } from '../../_shared/validate';
// ★ V3.45.0：金额自算用项目统一的 roundAmount（money.ts 单一来源），不另造 round2。
import { roundAmount } from '../../_shared/money';
// V3.61.0 D-02/D-03：采购订单已交量行级回写 + 状态推进（共用助手，与 PUT 路径同源）
import { writeBackPurchaseDelivered, advancePurchaseOrderStatus, readWorkOrderCosts } from '../../_shared/purchaseReceiptWriteback';
// V3.64.0 P0-5：审批流扩面——入库单落库后自动触发审批（静默幂等，无启用审批流则跳过，不阻断业务）
import { startApprovalForDoc } from '../../_shared/autoApproval';
import { nextDocNo } from '../../_shared/numbering';
import { stampByName } from '../../_shared/entities';
export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const vendorId = url.searchParams.get('vendorId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'inbound_date';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const db = context.env.DB;
  let where = `WHERE io.org_id = ?`;
  const params = [user.org_id];

  if (keyword) {
    where += ` AND (io.inbound_no LIKE ? ESCAPE '\\' OR io.vendor_name LIKE ? ESCAPE '\\')`;
    const kw = likePattern(keyword);
    params.push(kw, kw);
  }
  if (vendorId) {
    where += ` AND io.vendor_id = ?`;
    params.push(vendorId);
  }
  if (status) {
    where += ` AND io.status = ?`;
    params.push(status);
  }
  if (type) {
    where += ` AND io.type = ?`;
    params.push(type);
  }

  const rls = rlsCondition(user, 'inbound_orders');
  if (rls.clause !== '1=1') {
    where += ' AND ' + rls.clause;
    params.push(...rls.params);
  }

  const allowedSort = ['inbound_date', 'total_cost', 'created_at'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'inbound_date';

  const offset = (page - 1) * pageSize;
  const totalRows = await db.prepare(`SELECT COUNT(*) as cnt FROM inbound_orders io ${where}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM inbound_orders io ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`).bind(...params, pageSize, offset).all();

  return json({
    data: (rows.results || []).map(r => ({ ...r, items: [] })),
    total: totalRows?.cnt || 0,
    page,
    pageSize,
  });
}

// POST /api/inbound-orders — 创建入库单（仅新增，未改动上方 onRequestGet）
export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  // V3.26.0: 操作权限服务端守卫（仓储模块 — 库管可建入库单，越权角色建单返回 403 + OPERATION_FORBIDDEN）
  const _opGuard = await guardOperation(user, 'warehouse', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;

  // V3.24.0: 核心必填项校验（入库单：供应商 + 入库日期）
  const _coreFields = requireCoreFields('inbound_orders', body);
  if (_coreFields) return _coreFields;
  const _invalid = validateOrReject('inbound_orders', body);
  if (_invalid) return _invalid;

  // 必填守卫（V3.22.0 · 修复「空入参直接 500」）：
  // 入库单号 inbound_no 在库里是 NOT NULL，前端一直会传（缺省时前端会兜底生成 IN-时间戳）。
  // 缺它时旧行为是 bind undefined → 数据库报约束错误 → 端点未捕获 → 中间件兜底 500，
  // 用户只看到「系统错误」而不知道缺什么。这里提前拦成 400 并说明缺哪个字段。
  // V3.67.0 立项①：未传入库单号 → 服务端 D1 权威取号（numbering_rules 原子自增，多终端不再漂移撞号）；
  // 取号成功则继续既有 dedupe 查重，取号失败（编号规则不可用）才拦 400。
  if (!body.inboundNo) {
    body.inboundNo = await nextDocNo(context.env.DB, user.org_id, 'IN');
    if (!body.inboundNo) {
      return json({ error: '无法生成入库单号（编号规则不可用），请刷新后重试或手工填写入库单号', code: 'NO_NUMBERING' }, 503);
    }
  }
  const _missing = requireFields(body, ['inboundNo'], { inboundNo: '入库单号' });
  if (_missing) return _missing;

  // ★ 数量非负守卫（对标 SAP/金蝶：入库收货数量必须 ≥ 0，负数会落成负库存）。
  //   明细的实收/预收数量一旦为负，倒冲、库存台账、三单匹配都会被静默做坏且事后难察觉，
  //   故在写入头表之前就拦下（而不是等循环里才发现、留下「头已建、明细残缺」的半状态）。
  //   注：只拦「入库」方向（收货天然非负）；出库单的销售退货/红冲场景语义不同，不在本守卫内。
  if (Array.isArray(body.items)) {
    for (const it of body.items) {
      const _n = Number(it?.actualQuantity ?? it?.expectedQuantity ?? 0);
      if (Number.isFinite(_n) && _n < 0) {
        return json({
          error: `入库数量不能为负数（物料 ${it?.materialCode || it?.materialName || '?'} 填了 ${_n}）`,
          code: 'NEGATIVE_QUANTITY',
          field: 'items.actualQuantity',
        }, 400);
      }
    }
  }

  // #10 防重复建单：① Idempotency-Key 幂等键（优先检查，命中则直接回放）
  //                ② 单号查重（同组织同单号已存在 → 409，双击保存/网络重试正好被拦住）
  const _idemKey = resolveIdemKey(context.request, body);
  if (_idemKey) {
    const _hit = await findIdem(context.env.DB, user.org_id, _idemKey);
    if (_hit) {
      const _prev = await context.env.DB.prepare(`SELECT * FROM inbound_orders WHERE id = ? AND org_id = ?`).bind(_hit.resultId, user.org_id).first().catch(() => null);
      if (_prev) return json({ ...(_prev as any), idempotentReplay: true }, 200);
    }
  }
  const _dupNo = await dedupeByNo(context.env.DB, { table: 'inbound_orders', noCol: 'inbound_no', orgId: user.org_id, no: body.inboundNo, label: '入库单' });
  if (_dupNo) return json(_dupNo.response, 409);
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  const id = 'inb-' + crypto.randomUUID();
  // ★ #14（V3.17.6）修复：原 INSERT 漏了 subcontract_material_cost 列，前端委外收货传来的
  //   材料成本被静默丢弃（恒为默认值 0）→ 委外入库凭证无法拆分材料/加工费，1408 委托加工物资
  //   永远结转不掉、2201 暂估虚挂材料成本，账对不平。此处补列落库。
  // ★ V3.51.0 原子底座（R1 多表写原子化）：头表 + 全部子项 INSERT 收进**同一 db.batch** 原子提交，
  //   全成或全回滚，杜绝「头已建、明细残缺」半状态（原头表 .run() + 子项循环逐条 .run() 两次独立执行）。
  //   ★ 子项的「取物料主数据兜底单价」是异步读、须在构建 bind 参数前完成，故循环内先算好 _price/_amount
  //     再把子项 INSERT push 进 itemStmts；D1 单次 batch 上限 100 条，子项 >99 时退回逐条 .run()（保持既有行为）。
  //   过账（postInbound）在下方、其内部本就原子，这里只收「建单」的头+子写。
  // V3.58.0 修复 S-16：新增 owner_id 列（RLS 行级权限用），写入 user.id 避免 'own' 策略 fail-open。
  const headStmt = db.prepare(`INSERT INTO inbound_orders (id, org_id, dept_id, owner_id, inbound_no, type, source_no, vendor_id, vendor_name, status, warehouse_id, warehouse_name, operator, inbound_date, remarks, subcontract_material_cost, asn_shipment_no, created_at, updated_at, created_by, updated_by, inventory_posted, cost_posted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`).bind(
    id, user.org_id, user.department || null, user.id, body.inboundNo, body.type || 'purchase', body.sourceNo || null, body.vendorId || null, body.vendorName || null,
    body.status || 'pending', body.warehouseId || null, body.warehouseName || null, body.operator || null, body.inboundDate || null,
    body.remarks || null, Number(body.subcontractMaterialCost) || 0, body.asnShipmentNo || null, now, now, user.name, user.name
  );
  const itemStmts: any[] = [];
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      const serialNos = Array.isArray(item.serialNos) ? JSON.stringify(item.serialNos) : (item.serialNos || null);
      // ★ V3.45.0 服务端自算明细金额（根治「入库金额恒为 0」）：
      //   原式 `Number(item.amount) || 0` 完全信任前端，而 InboundForm 建单时**只传数量、
      //   不传单价与金额** ⇒ amount 列恒为 0 ⇒ 三单匹配的入库金额恒为 0
      //   ⇒ 付款闸门 100% 拦截正常采购付款、到货率永远 0%。
      //   现在按「实收数量 × 单价」实算；**单价缺失时从物料主数据兜底** ——
      //   口径与 inventoryPosting.getUnitCost（移动均价 > 标准价 > 采购价）完全一致，
      //   不另造一套优先级，避免"入库金额用 A 口径、库存成本用 B 口径"的错位。
      //   （E2E 守护套件实测发现：不带兜底时，界面若未回填单价则金额仍为 0，
      //     三单匹配会继续误判"货未到" —— 与修复前症状一致，故兜底是必需项而非优化项。）
      const _qty = Number(item.actualQuantity) || 0;
      let _price = Number(item.unitPrice) || 0;
      if (_price <= 0 && (item.materialId || item.materialCode)) {
        try {
          const _m: any = await db
            .prepare('SELECT moving_avg_price, standard_price, price FROM materials WHERE org_id = ? AND (id = ? OR code = ?) LIMIT 1')
            .bind(user.org_id, item.materialId || item.materialCode, item.materialCode || item.materialId)
            .first();
          if (_m) {
            _price = Number(_m.moving_avg_price) > 0 ? Number(_m.moving_avg_price)
              : Number(_m.standard_price) > 0 ? Number(_m.standard_price)
              : Number(_m.price) || 0;
          }
        } catch { /* 取不到主数据则保持 0，交由三单匹配既有规则处理，不静默编数 */ }
      }
      const _amount = _price > 0 ? roundAmount(_qty * _price) : (Number(item.amount) || 0);
      // ★ V3.56.0 G4 入库金额退化 fail-closed 守卫：
      //   当物料无单价（主数据兜底也取不到）且前端也没传金额，且实收数量 > 0 时，
      //   若放行则 amount 列会静默为 0 → 三单匹配入库金额恒 0 → 付款闸门误拦。
      //   fail-closed：有数量无金额=信息不全，应补齐而非静默落 0。
      //   注：数量=0 的行（如备注行/占位行）不拦，允许 0×0=0 的合理场景。
      if (_qty > 0 && _price <= 0 && _amount <= 0) {
        return json({
          error: `入库明细「${item.materialName || item.materialCode || '?'}」有数量（${_qty}）但无法确定金额：物料主数据无单价且未传入库金额。请先在物料主数据中维护单价，或在入库单中填写单价/金额。`,
          code: 'AMOUNT_DEGRADATION',
          field: 'items.unitPrice',
        }, 400);
      }
      itemStmts.push(
        db.prepare(`INSERT INTO inbound_order_items (id, inbound_order_id, material_id, material_code, material_name, specification, unit, expected_quantity, actual_quantity, batch_no, location_id, location_name, quality_status, unit_price, amount, serial_nos, hu_id, production_date, expiry_date, order_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          'inoi-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.specification || null, item.unit || null,
          Number(item.expectedQuantity) || 0, _qty, item.batchNo || null, item.locationId || null, item.locationName || null,
          item.qualityStatus || 'qualified', _price, _amount, serialNos, item.huId || null, item.productionDate || null, item.expiryDate || null,
          // ★ V3.47.0 3-05：订单行锚点（行级三单匹配靠它把入库行对到订单行）。
          //   为空时行级比对会退回按物料编码+单位匹配（同物料在一个订单里多行时会失真）。
          item.orderItemId || null
        )
      );
    }
  }

  // 建单的头表 + 全部子项原子提交（口径见上方 headStmt / itemStmts 注释）：
  //   子项 ≤99 条收进同一 db.batch（全成或全回滚）；>99 条退回逐条 .run()（D1 单次 batch 上限 100）。
  if (itemStmts.length <= 99) {
    await db.batch([headStmt, ...itemStmts]);
  } else {
    await headStmt.run();
    for (const s of itemStmts) await s.run();
  }

  // V3.71.0 ③ by_name：建单后回填创建/修改人姓名（fail-safe，列不存在自动跳过）
  await stampByName(db, 'inbound_orders', id, user);

  // #10 幂等键登记：建单成功后把 (组织, 键) → 结果 id 记下来，供后续重复提交命中回放
  if (_idemKey) await saveIdem(db, user.org_id, _idemKey, 'inbound_orders', id);
  const row = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ?`).bind(id).first();

  // N1 服务端过账（2026-09-20）：状态为 completed 且尚未过账时，在服务端统一滚动物料
  // 移动均价 + 写库存记录，成为唯一权威源；绕开界面直接建单也会过账。幂等靠 inventory_posted 守卫。
  // ★ 先查询 items 表获取明细，避免直接用 request body 中的 items（可能不完整）
  //   items 表使用 snake_case，需转换为 camelCase 以匹配 postInbound 期望的字段名
  // ★ R4 留痕：凭证生成失败（库存已动、不回滚）时回传 voucherIssues，不阻断但留痕
  const _voucherIssues: string[] = [];
  if (row && row.status === 'completed' && !row.inventory_posted) {
    // ★ V3.61.0 P0-1：期末结账守卫**必须在抢占之前**校验并直接返回 4xx。
    //   若只靠 postInbound 内部抛错，错误会被下面过账的 catch 吞掉、只回滚抢占标志，
    //   端点仍返回 201 —— 变成「入库单建成功但实际没过账」的假成功（铁律㊴反假成功）。
    try {
      await assertPeriodOpen(db, user.org_id, { inboundDate: row.inbound_date }, '入库单');
    } catch (e: any) {
      return json({ error: e?.message || '会计期间已结账，禁止过账', code: 'PERIOD_CLOSED', period: String(row.inbound_date || '').slice(0, 7) }, 409);
    }
    // ★ V3.48.0 止血①（P0 过账竞态）：把「置过账标志」提前为**条件 UPDATE 抢占**
    //   （SET inventory_posted=1 WHERE id=? AND inventory_posted=0，读 meta.changes 判定本次是否抢到）。
    //   原「先读 !posted → 过账 → 后置 1」两次并发首次请求都能读到 0 而双过账（流水/total 双写）。
    //   抢占后只有一个请求 changes=1 会过账，其余请求拿到 0 直接跳过；过账失败会回滚抢占（见 catch）。
    const _claim = await db.prepare(
      `UPDATE inbound_orders SET inventory_posted = 1 WHERE id = ? AND inventory_posted = 0`
    ).bind(id).run();
    if (((_claim as any)?.meta?.changes ?? 0) > 0) {
      try {
        const items = await db.prepare(`SELECT * FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).all();
        // 将 snake_case 字段转换为 camelCase
        const camelCaseItems = (items.results || []).map(r => ({
          materialId: r.material_id,
          materialCode: r.material_code,
          materialName: r.material_name,
          actualQuantity: r.actual_quantity,
          expectedQuantity: r.expected_quantity,
          unitPrice: r.unit_price,
          amount: r.amount,
          unit: r.unit,
          locationId: r.location_id,
          batchNo: r.batch_no,
          serialNos: r.serial_nos ? JSON.parse(r.serial_nos) : null,
        }));
        const r = await postInbound(db, user.org_id, user, {
          items: camelCaseItems,
          warehouseId: row.warehouse_id,
          warehouseName: row.warehouse_name,
          inboundDate: row.inbound_date,
          type: row.type,
          inboundNo: row.inbound_no,
          vendorName: row.vendor_name,
          operator: row.operator,
          sourceNo: row.source_no,
          // ★ #14（V3.17.6）：把材料成本带给凭证生成，委外入库才能拆成 借1405 / 贷1408 / 贷2201
          subcontractMaterialCost: row.subcontract_material_cost,
          // ★ V3.61.0 W-C3：生产完工入库需带上工单人工成本，结转才是完整生产成本
          // ★ V3.62.0 边界①：再带上工单折旧与制造费用，5001 结转含 材料+人工+折旧+制造费用
          laborCost: 0,
          depreciationCost: 0,
          overheadCost: 0,
          ...(row.type === 'production' && row.source_no
            ? await readWorkOrderCosts(db, user.org_id, row.source_no)
            : {}),
        });
        // inventory_posted 已在抢占时置 1，这里只回写金额（避免与抢占的语义重复）
        await db.prepare(`UPDATE inbound_orders SET total_cost = ? WHERE id = ?`).bind(r.totalCost, id).run();
        // ★ V3.58.0 修复 PO-01：建单即过账路径同样回写采购订单已交量（与 [id].ts PUT 路径同范式）。
        if (row.type === 'purchase' && row.source_no) {
          try {
            const sumQty = camelCaseItems.reduce((a: number, it: any) => a + (Number(it.actualQuantity) || 0), 0);
            if (sumQty > 0) {
              await writeBackPurchaseDelivered(db, user.org_id, row.source_no, camelCaseItems);
              await advancePurchaseOrderStatus(db, user.org_id, row.source_no);
            }
          } catch (e) {
            console.error('[inbound-po] 回写采购订单已交量失败（POST 路径）', (e as any)?.message || e);
          }
        }
        // ★ R4 留痕：凭证生成失败（库存已动、不回滚）的原因收集到响应，让「账实动了但凭证缺失」可见
        _voucherIssues.push(...(r.voucherIssues || []));
      } catch (e) {
        // ★ V3.48.0 止血①：过账失败→回滚抢占（inventory_posted 置回 0）保持可重试、不产生"假已置位"；
        //   建单已成功（审计留痕），仅告警。并发方见 posted=0 可再次抢占。
        try { await db.prepare(`UPDATE inbound_orders SET inventory_posted = 0 WHERE id = ?`).bind(id).run(); } catch { /* 回滚标志尽力而为 */ }
        console.error('[inbound-post] failed（已回滚过账标志，可重试）', e);
      }
    }
  }

  await audit(db, user.org_id, user, 'inbound_orders', 'create', `创建入库单 ${row?.inbound_no || id}`);
  // ★ V3.64.0 P0-5：入库单落库后触发审批（审批流 module='inbound' 启用时；未启用/无审批人/SoD/失败均静默跳过，绝不阻断建单）
  await startApprovalForDoc(db, user.org_id, user, 'inbound', id, row?.inbound_no).catch(() => {});
  // 过账后重新查询以获取最新状态
  const updatedRow = await db.prepare(`SELECT * FROM inbound_orders WHERE id = ?`).bind(id).first();
  const itemsRow = await db.prepare(`SELECT * FROM inbound_order_items WHERE inbound_order_id = ?`).bind(id).all();
  const result = { ...updatedRow, items: (itemsRow.results || []).map(r => ({
    id: r.id, material_id: r.material_id, material_code: r.material_code, material_name: r.material_name,
    unit: r.unit, expected_quantity: Number(r.expected_quantity), actual_quantity: Number(r.actual_quantity),
    batch_no: r.batch_no, location_id: r.location_id, location_name: r.location_name,
    quality_status: r.quality_status, unit_price: Number(r.unit_price), amount: Number(r.amount),
  })) };
  // ★ R4：凭证生成失败时显式回传（库存已过账不回滚，但缺失的凭证必须让人知道去补录）
  if (_voucherIssues.length > 0) result.voucherIssues = _voucherIssues;
  return json(result, 201);
}
