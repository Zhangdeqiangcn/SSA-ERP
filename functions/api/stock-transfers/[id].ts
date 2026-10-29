// GET/PUT/DELETE /api/stock-transfers/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { validateOrReject } from '../../_shared/validate';
// V3.5.0 B6：补齐写审计（跨仓/跨组织调拨是库存账最容易出错的场景）
// #10（V3.17.7）：PUT 接入乐观锁，防并发编辑静默覆盖
import { writeAudit } from '../../_shared/auditLog';
import { withVersionGuard } from '../../_shared/optimisticLock';
// ★ V3.45.0 操作权限服务端守卫：此前该端点零守卫（任何登录用户均可写）。
import { guardOperation } from '../../_shared/operationGuard';
// ★ V3.45.0 第3批：调拨过账所需的库存过账与状态机守卫
import { postInbound, postOutbound, assertPeriodOpen } from '../../_shared/inventoryPosting';
import { guardStatusTransition } from '../../_shared/statusMachine';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM stock_transfers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '转储单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, material_id: r.material_id, material_code: r.material_code, material_name: r.material_name,
      unit: r.unit, quantity: Number(r.quantity), batch_no: r.batch_no, location_id: r.location_id,
    })),
  });
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;

  // V3.45.0：写端点服务端硬拦，越权返回 403 OPERATION_FORBIDDEN（绕开界面亦生效）。
  const _opGuard = await guardOperation(user, 'warehouse', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;
  const id = context.params.id;

  // ★ V3.45.0：SELECT 补齐仓库/日期等字段 —— 「未传保持原值」的实现需要读原值，
  //   只查 id/no/status/version 会导致所有未传字段被当成 null 清空。
  const existing = await db.prepare(
    `SELECT id, transfer_no, status, version, from_warehouse_id, from_warehouse_name,
            to_warehouse_id, to_warehouse_name, from_org_id, to_org_id, transfer_date, remarks
       FROM stock_transfers WHERE id = ? AND org_id = ?`
  ).bind(id, user.org_id).first();
  if (!existing) return json({ error: '转储单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('stock_transfers', body, { partial: true });
  if (_invalid) return _invalid;

  // ★ V3.45.0 第3批：状态机守卫（此前 DocType 无 stock_transfer，状态可任意赋值）
  const _statusGuard = guardStatusTransition('stock_transfer', (existing as any).status, body);
  if (_statusGuard) return json(_statusGuard.response, 400);

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // #10 乐观锁：构建 SET 子句并交给 withVersionGuard 统一执行（含版本比对 + 自增）
  const setClauses: string[] = [];
  const values: any[] = [];
  const add = (col: string, val: any) => {
    setClauses.push(`${col} = ?`);
    values.push(val);
  };
  // ★ V3.45.0 第3批修正「部分更新被当成全量覆盖」：
  //   原实现是 `add('from_warehouse_id', body.fromWarehouseId || null)` ——
  //   只要请求里没带这个字段，就**主动把它写成 NULL**。
  //   后果有两层：
  //     ① 数据丢失：前端只想改状态，却把调出/调入仓、单号、日期全清空了；
  //     ② 过账拿不到仓库（本次调拨过账就因此拿不到 from/to warehouse，
  //        出现"接口返回已过账、库存却没动"的假成功）。
  //   正确语义：未传（undefined）→ 保持库中原值；传了 null → 明确清空。
  const keep = (v: any, cur: any) => (v === undefined ? (cur ?? null) : (v === '' ? null : v));
  add('transfer_no', body.transferNo || existing.transfer_no);
  add('from_warehouse_id', keep(body.fromWarehouseId, existing.from_warehouse_id));
  add('from_warehouse_name', keep(body.fromWarehouseName, existing.from_warehouse_name));
  add('to_warehouse_id', keep(body.toWarehouseId, existing.to_warehouse_id));
  add('to_warehouse_name', keep(body.toWarehouseName, existing.to_warehouse_name));
  add('from_org_id', keep(body.fromOrgId, existing.from_org_id));
  add('to_org_id', keep(body.toOrgId, existing.to_org_id));
  add('status', body.status || 'draft');
  add('transfer_date', keep(body.transferDate, existing.transfer_date));
  add('remarks', keep(body.remarks, existing.remarks));
  add('updated_at', now);
  add('updated_by', user.name);

  const _lock = await withVersionGuard({ db, table: 'stock_transfers', id, orgId: user.org_id, body, setClauses, values });
  if (_lock) return json(_lock.response, 409);

  // 明细行仍由端点自己处理（guard 只负责头表）
  let _newItems: any[] | null = null;
  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO stock_transfer_items (id, stock_transfer_id, material_id, material_code, material_name, unit, quantity, batch_no, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'sti-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null,
        item.unit || null, Number(item.quantity) || 0, item.batchNo || null, item.locationId || null
      ).run();
    }
    _newItems = body.items;
  }

  // ★ V3.45.0 第3批：调拨单真正过账（此前是「只留单据的空壳」——对标报告 S-05）。
  //   缺陷原状：PUT 只更新单据头尾与明细，全文**无一句** postInbound/postOutbound，
  //   且 statusMachine 的 DocType 也没有 stock_transfer → 状态可任意设 completed，
  //   不扣调出仓、不加调入仓 → 两仓数字永久偏差且系统内无任何痕迹。
  //   现在：状态**首次**进入 completed 时做双向过账，幂等靠 inventory_posted 标志。
  //   成本口径（同组织内调拨，属位置转移、成本不变，对标 SAP 移动类型 301）：
  //     ① 调出仓：postOutbound 按调出仓移动均价结转（返回 unitCost）；
  //     ② 调入仓：postInbound 传 costPriceOverride = 调出成本，**不重新取采购价** ——
  //        否则同一物料两个仓出现两个成本，调拨一批货反而"改变"了存货价值。
  //   凭证：调拨属内部转移、不产生损益，故 transfer 类型不入库凭证（沿用既有约定）。
  let _posted = false;
  let _postMsg = '';
  if (body.status === 'completed') {
    try {
      const head: any = await db.prepare(
        `SELECT id, transfer_no, status, inventory_posted, from_warehouse_id, from_warehouse_name,
                to_warehouse_id, to_warehouse_name, transfer_date
           FROM stock_transfers WHERE id = ? AND org_id = ?`
      ).bind(id, user.org_id).first();

      if (head && !Number((head as any).inventory_posted)) {
        // ★ V3.61.0 P0-1：期末结账守卫在抢占之前（否则被过账 catch 吞成假成功）
        try {
          await assertPeriodOpen(db, user.org_id, { transferDate: (head as any).transfer_date }, '库存调拨单');
        } catch (e: any) {
          return json({ error: e?.message || '会计期间已结账，禁止过账', code: 'PERIOD_CLOSED', period: String((head as any).transfer_date || '').slice(0, 7) }, 409);
        }
        // ★ V3.48.0 止血①（P0 过账竞态）：把「置过账标志」提前为**条件 UPDATE 抢占**——
        //   SET inventory_posted=1 WHERE id=? AND org_id=? AND inventory_posted=0，读 meta.changes 判定本次是否抢到。
        //   原「先读 !posted → 双向过账 → 后置 1」两次并发首次请求都能读到 0 而双扣调出仓/双入调入仓。
        //   抢占成功（changes=1）才执行下方过账；抢占失败（changes=0，并发方已置位）则跳过，杜绝双过账。
        //   过账无效果/失败时下方反假成功校验与 catch 会把 inventory_posted 回滚 0（与入/出库抢占回滚同语义，可重试）。
        const _claimT = await db.prepare(
          `UPDATE stock_transfers SET inventory_posted = 1 WHERE id = ? AND org_id = ? AND inventory_posted = 0`
        ).bind(id, user.org_id).run();        const _claimedT = (((_claimT as any)?.meta?.changes ?? 0) > 0);
        // ★ 用 SQL 别名把 snake_case 直接映射成 camelCase。
        //   踩坑记录：此前 SELECT 出来的是 material_id / batch_no / location_id，
        //   而下面按 it.materialId / it.batchNo / it.locationId 取值 → 全是 undefined
        //   → postInbound 的 `if (!materialId) continue` 静默跳过 → 库存不动，
        //   但接口仍返回"已过账"（假成功，比不过账更危险）。
        const items = _newItems || (await db.prepare(
          `SELECT material_id AS materialId, material_code AS materialCode,
                  material_name AS materialName, unit, quantity,
                  batch_no AS batchNo, location_id AS locationId
             FROM stock_transfer_items WHERE stock_transfer_id = ?`
        ).bind(id).all()).results || [];

        // ★ V3.48.0 止血①：只有本次「抢到」过账标志的请求才执行双向过账（_claimedT）。
        //   并发后到者抢占 changes=0 → _claimedT=false → 跳过，避免调出仓双扣、调入仓双入。
        if (_claimedT && items.length > 0) {
          // ★ V3.61.0 修 W-E10（跨组织字段不同源）：此前 org 取自**更新前**快照 existing、
          //   warehouse 取自**更新后** head —— 同一次请求内 org 与仓库可能来自两次不同的
          //   数据版本（本次改了 fromOrgId/fromWarehouseId 时就会出现「按新仓扣、按旧组织记账」，
          //   造成库存与账跨组织错位）。现在 org / warehouse 统一取更新后的 head（本次未传时
          //   pcUpdate 会保留原值，语义等价于旧行为）。
          const fromOrgId = (head as any).from_org_id || (existing as any).from_org_id || user.org_id;
          const toOrgId = (head as any).to_org_id || (existing as any).to_org_id || user.org_id;

          // ① 调出仓：扣减 + 结转成本
          const outRes = await postOutbound(db, fromOrgId, user, {
            type: 'transfer',
            outboundNo: (head as any).transfer_no,
            outboundDate: (head as any).transfer_date || now.slice(0, 10),
            warehouseId: (head as any).from_warehouse_id,
            items: items.map((it: any) => ({ ...it, quantity: Number(it.quantity) || 0 })),
          });

          // ② 调入仓：按调出成本入库（成本不漂移）
          //   ★ warehouseName 必须一起传：postInbound 的 INSERT 会把它写进
          //     inventory_records.warehouse_name，缺值时 D1 抛
          //     "Type 'undefined' not supported" → 整笔过账失败。
          await postInbound(db, toOrgId, user, {
            type: 'transfer',
            inboundNo: (head as any).transfer_no,
            inboundDate: (head as any).transfer_date || now.slice(0, 10),
            warehouseId: (head as any).to_warehouse_id,
            warehouseName: (head as any).to_warehouse_name || '',
            items: (outRes?.enrichedItems || []).map((it: any) => ({
              materialId: it.materialId,
              materialCode: it.materialCode,
              materialName: it.materialName,
              unit: it.unit,
              batchNo: it.batchNo,
              locationId: it.locationId,
              actualQuantity: Number(it.quantity) || 0,
              expectedQuantity: Number(it.quantity) || 0,
              costPriceOverride: Number(it.unitCost) || 0, // ★ 按调出成本入库
            })),
          });

          await db.prepare(
            `UPDATE stock_transfers SET inventory_posted = 1, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
          ).bind(now, user.name, id, user.org_id).run();
          _posted = true;
          _postMsg = `已过账：调出 ${(head as any).from_warehouse_name || '-'} → 调入 ${(head as any).to_warehouse_name || '-'}`;

          // ★ 反假成功校验（对标铁律㊴「界面点得动 ≠ 已落库」）：
          //   postOutbound / postInbound 在「库存行不存在 / 物料无效」时会**静默 continue**，
          //   于是单据被标记为已过账、而库存数字纹丝不动 —— 用户看到"已完成"，
          //   两仓却仍差着 30 件，系统内无任何痕迹。这是比"不过账"更糟的状态。
          //   现在过账后**回读校验**：调出仓必须真的少了、调入仓必须真的多了，
          //   否则回滚标记并明确报错，不把假成功当成成功返回。
          const _check = async (orgId: any, wh: any, materialId: any) => {
            const row: any = await db.prepare(
              `SELECT COALESCE(SUM(quantity),0) AS qty FROM inventory_records
                WHERE org_id = ? AND material_id = ? AND warehouse_id = ?`
            ).bind(orgId || user.org_id, materialId, wh).first();
            return Number(row?.qty || 0);
          };
          // ★ V3.61.0 W-E9 + W-E10：逐行校验（此前只核 items[0]，多行调拨中其余行静默 continue
          //   仍报「已过账」）；且 org 与 warehouse 必须**同源**（均取更新后的 head），
          //   否则会出现「按新仓校验、按旧组织校验」的错位判定。
          // 未过账的行清单（用于把错误信息说清楚是哪一行没生效）
          const _failedLines: string[] = [];
          for (const it of (items || []) as any[]) {
            const mid = it?.materialId;
            if (!mid) continue;
            const qty = await _check(toOrgId, (head as any).to_warehouse_id, mid);
            if (qty <= 0) {
              _failedLines.push(String(it?.materialCode || mid));
            }
          }
          if (items.length > 0 && _failedLines.length === items.length) {
            // 全部行都未过账 → 判定过账未生效
            await db.prepare(
              `UPDATE stock_transfers SET inventory_posted = 0, status = 'draft', updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
            ).bind(now, user.name, id, user.org_id).run();
            return json({
              error: '调拨过账未生效：调入仓库存没有增加（物料主数据或库存行缺失），单据已回退为草稿。请检查物料是否有效。',
              code: 'TRANSFER_POST_NO_EFFECT',
            }, 400);
          }
          // 把两仓实际数量回传，便于界面提示与 E2E 断言核验"库存真的动了"
          //   （取第一行物料的两仓余量作示意；与上方校验同源，均用更新后的 head）
          const _demo = (items || [])[0];
          const fromNow = _demo?.materialId ? await _check(fromOrgId, (head as any).from_warehouse_id, _demo.materialId) : 0;
          const toNow = _demo?.materialId ? await _check(toOrgId, (head as any).to_warehouse_id, _demo.materialId) : 0;
          _postMsg = `已过账：调出 ${(head as any).from_warehouse_name || '-'} → 调入 ${(head as any).to_warehouse_name || '-'}`
            + `（调出仓余 ${fromNow}，调入仓现有 ${toNow}）`;
        }
      }
    } catch (e: any) {
      // 过账失败：置回 draft 并明确报错，**绝不留在"状态已完成但库存没动"的中间态**
      // （那是比不做更糟的状态：单据显示完成、两仓数字却已偏差且无人知晓）。
      await db.prepare(
        `UPDATE stock_transfers SET status = 'draft', inventory_posted = 0, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
      ).bind(now, user.name, id, user.org_id).run();
      console.error('[stock-transfer-post] 调拨过账失败，已回置草稿：', e?.message || e);
      return json({
        error: '调拨过账失败，单据已回退为草稿：' + (e?.message || '请检查调出仓库存是否充足'),
        code: 'TRANSFER_POST_FAILED',
      }, 400);
    }
  }

  const updated = await db.prepare(`SELECT * FROM stock_transfers WHERE id = ?`).bind(id).first();

  // B6 审计：调拨单改变「同一物料在不同仓库/不同组织」的分布，是库存对账差异的
  //   高发环节。摘要把「调出仓 → 调入仓」写成箭头形式，并记跨组织标记 ——
  //   跨组织调拨涉及两套账，与同组织内调拨的核查方式完全不同，必须能一眼区分。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'stock_transfers',
    entityId: id,
    action: 'update',
    summary:
      `更新转储单 ${(existing as any).transfer_no || id}` +
      `（${body.fromWarehouseName ?? '-'} → ${body.toWarehouseName ?? '-'}）` +
      `（明细行：${Array.isArray(body.items) ? body.items.length : '未改动'}）` +
      `（状态：${(existing as any).status || '-'} → ${body.status || 'draft'}）` +
      (body.fromOrgId && body.toOrgId && body.fromOrgId !== body.toOrgId ? '【跨组织调拨】' : ''),
  });

  return json({ ...(updated as any), inventory_posted: _posted ? 1 : (updated as any)?.inventory_posted, postMessage: _postMsg || undefined });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  // V3.45.0 操作权限服务端守卫（此前该端点零守卫，任何登录用户都能删转储单）
  const _opGuard = await guardOperation(user, 'warehouse', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  const row = await db.prepare(`SELECT id, transfer_no, status, from_warehouse_name, to_warehouse_name FROM stock_transfers WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '转储单不存在' }, 404);

  await db.prepare(`DELETE FROM stock_transfers WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM stock_transfer_items WHERE stock_transfer_id = ?`).bind(id).run();

  // B6 审计：删除调拨单会让两侧仓库的在途数同时消失，必须留痕（含单号与调拨方向）。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'stock_transfers',
    entityId: id,
    action: 'delete',
    summary:
      `删除转储单 ${(row as any).transfer_no || id}` +
      `（${(row as any).from_warehouse_name || '-'} → ${(row as any).to_warehouse_name || '-'}；状态：${(row as any).status || '-'}）`,
  });

  return json({ success: true });
}
