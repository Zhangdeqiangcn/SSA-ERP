// GET/PUT/DELETE /api/inventory-adjustments/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { validateOrReject } from '../../_shared/validate';
// V3.5.0 B6：补齐写审计（库存调整直接改账面数量，是舞弊风险最高的单据类型）
import { writeAudit } from '../../_shared/auditLog';
// ★ V3.45.0 操作权限服务端守卫：此前该端点零守卫（任何登录用户均可写）。
import { guardOperation } from '../../_shared/operationGuard';
// ★ V3.45.0 第3批：库存调整真正过账（盘盈入 / 盘亏出 + 调整凭证）
import { postInbound, postOutbound, assertPeriodOpen } from '../../_shared/inventoryPosting';
import { writeVoucher } from '../../_shared/voucherWriter';
import { roundAmount } from '../../_shared/money';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM inventory_adjustments WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '调整单不存在' }, 404);

  const items = await db.prepare(`SELECT * FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(id).all();

  return json({
    ...row,
    items: (items.results || []).map(r => ({
      id: r.id, material_id: r.material_id, material_code: r.material_code, material_name: r.material_name,
      unit: r.unit, location_id: r.location_id, book_qty: Number(r.book_qty), actual_qty: Number(r.actual_qty),
      delta_qty: Number(r.delta_qty), reason: r.reason,
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

  // ★ V3.45.0：SELECT 补齐仓库/日期字段（供「未传保持原值」使用）
  const existing = await db.prepare(
    `SELECT id, adjustment_no, status, total_delta_qty, warehouse_id, warehouse_name, date, reason
       FROM inventory_adjustments WHERE id = ? AND org_id = ?`
  ).bind(id, user.org_id).first();
  if (!existing) return json({ error: '调整单不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('inventory_adjustments', body, { partial: true });
  if (_invalid) return _invalid;

  // ★ V3.45.0：与调拨端点同一修正 —— 未传字段保持原值，不主动写 null。
  //   原实现 `body.warehouseId || null` 会让"只想改状态"的请求把仓库清空，
  //   过账时便拿不到仓库 → 库存不动却返回"已过账"（假成功）。
  const keep = (v: any, cur: any) => (v === undefined ? (cur ?? null) : (v === '' ? null : v));
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  await db.prepare(`UPDATE inventory_adjustments SET adjustment_no = ?, warehouse_id = ?, warehouse_name = ?, status = ?, reason = ?, date = ?, total_delta_qty = ?, voucher_no = ?, updated_at = ?, updated_by = ? WHERE id = ?`).bind(
    body.adjustmentNo || existing.adjustment_no,
    keep(body.warehouseId, existing.warehouse_id),
    keep(body.warehouseName, existing.warehouse_name),
    body.status || 'draft',
    keep(body.reason, existing.reason),
    keep(body.date, existing.date),
    body.totalDeltaQty === undefined ? Number(existing.total_delta_qty) || 0 : (Number(body.totalDeltaQty) || 0),
    keep(body.voucherNo, (existing as any).voucher_no), now, user.name, id
  ).run();

  if (body.items && Array.isArray(body.items)) {
    await db.prepare(`DELETE FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(id).run();
    for (const item of body.items) {
      await db.prepare(`INSERT INTO inventory_adjustment_items (id, inventory_adjustment_id, material_id, material_code, material_name, unit, location_id, book_qty, actual_qty, delta_qty, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'adji-' + crypto.randomUUID(), id, item.materialId || null, item.materialCode || null, item.materialName || null, item.unit || null,
        item.locationId || null, Number(item.bookQty) || 0, Number(item.actualQty) || 0, Number(item.deltaQty) || 0, item.reason || null
      ).run();
    }
  }

  // ★ V3.45.0 第3批：库存调整单真正过账（对标报告 S-04）。
  //   缺陷原状：调整单只更新单据，**从不触碰 inventory_records / materials**，
  //   也无盘盈盘亏凭证 → 「账面数量改成实际数量」却不影响库存，
  //   库存不准的另一个主要来源（且它是唯一能凭空改库存数字的单据类型）。
  //   现在：状态首次进入 completed 时按 delta 双向过账
  //     · delta > 0（盘盈）→ postInbound 增库存
  //     · delta < 0（盘亏）→ postOutbound 减库存
  //     · 凭证：盘盈借 1403/1405 存货、贷 2201 待处理；盘亏借 6602 管理费用、贷存货
  //       （对标金蝶/用友盘盈盘亏单；不直接冲 1403 是因为盘亏原因可能是管理责任）
  //   幂等靠 inventory_posted 标志（迁移 0079 新增）。
  let _posted = false;
  let _postMsg = '';
  let _voucherNo = '';
  let _voucherFail = '';
  if (body.status === 'completed') {
    try {
      const head: any = await db.prepare(
        `SELECT id, adjustment_no, status, inventory_posted, warehouse_id, warehouse_name, date
           FROM inventory_adjustments WHERE id = ? AND org_id = ?`
      ).bind(id, user.org_id).first();

      if (head && !Number((head as any).inventory_posted)) {
        // ★ V3.61.0 P0-1：期末结账守卫（盘盈/盘亏都写凭证，须一并拦住）
        try {
          await assertPeriodOpen(db, user.org_id, { date: (head as any).date }, '库存调整单');
        } catch (e: any) {
          return json({ error: e?.message || '会计期间已结账，禁止过账', code: 'PERIOD_CLOSED', period: String((head as any).date || '').slice(0, 7) }, 409);
        }
        // ★ 同调拨端点：SELECT 用别名映射成 camelCase，否则 it.material_id 取不到
        //   it.materialId → postInbound/postOutbound 静默跳过 → 库存不动却返回"已过账"。
        const items = (await db.prepare(
          `SELECT material_id AS materialId, material_code AS materialCode,
                  material_name AS materialName, unit, location_id AS locationId, delta_qty AS deltaQty
             FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`
        ).bind(id).all()).results || [];

        const gain: any[] = [];   // 盘盈
        const loss: any[] = [];   // 盘亏
        for (const it of items as any[]) {
          // ★ 上面 SELECT 已用 AS 把列名映射成 camelCase，这里必须按 camelCase 取值。
          //   踩坑记录：曾一边 SELECT 出 material_id、一边按 it.materialId 取 → 全 undefined
          //   → 循环里 continue 跳过全部行 → "盘盈 0 行 / 盘亏 0 行"却仍标记已过账（假成功）。
          const d = Number(it.deltaQty ?? it.delta_qty) || 0;
          if (Math.abs(d) < 1e-9) continue;
          const row = {
            materialId: it.materialId ?? it.material_id,
            materialCode: it.materialCode ?? it.material_code,
            materialName: it.materialName ?? it.material_name,
            unit: it.unit,
            locationId: it.locationId ?? it.location_id,
          };
          if (!row.materialId) continue; // 物料无效：宁可不计这行，也不静默编造
          if (d > 0) gain.push({ ...row, actualQuantity: d, expectedQuantity: d, quantity: d });
          else loss.push({ ...row, quantity: Math.abs(d) });
        }

        const adjNo = (head as any).adjustment_no;
        const adjDate = (head as any).date || now.slice(0, 10);
        const whId = (head as any).warehouse_id;

        if (gain.length > 0) {
          const r1 = await postInbound(db, user.org_id, user, {
            type: 'adjust_gain', inboundNo: adjNo, inboundDate: adjDate,
            warehouseId: whId, warehouseName: (head as any).warehouse_name || '', items: gain,
          });
          // postInbound 只返回总额，凭证需要逐行金额 → 按比例分摊到各行
          const totalGain = Number(r1?.totalCost) || 0;
          if (totalGain > 0 && gain.length > 0) {
            const sumQty = gain.reduce((s: number, g: any) => s + (Number(g.actualQuantity) || 0), 0) || 1;
            gain.forEach((g: any) => {
              g.costAmount = roundAmount(totalGain * ((Number(g.actualQuantity) || 0) / sumQty));
              g.valuationClass = g.valuationClass || 'RAW';
            });
          }
        }
        if (loss.length > 0) {
          const r2 = await postOutbound(db, user.org_id, user, {
            type: 'adjust_loss', outboundNo: adjNo, outboundDate: adjDate,
            warehouseId: whId, items: loss,
          });
          // postOutbound 返回 enrichedItems（带 unitCost/costAmount），直接回填
          const en = r2?.enrichedItems || [];
          loss.forEach((l: any, i: number) => {
            const e: any = en[i] || en.find((x: any) => x.materialId === l.materialId);
            l.costAmount = Math.abs(Number(e?.costAmount) || 0);
            l.valuationClass = e?.valuationClass || 'RAW';
          });
        }

        // 盘盈盘亏凭证（对标金蝶/用友盘盈盘亏单）
        //   盘盈：借 1403 原材料 / 1405 库存商品（按估值类别），贷 2201 待处理财产损溢
        //   盘亏：借 6602 管理费用（待处理财产损溢），贷 1403 / 1405
        //   为什么不用「其他应收/其他应付」：盘盈盘溢在月末结账时统一转到"待处理财产损溢"
        //   再结平本年利润，用 2201/6602 两个科目承接能让结账页直接看到待处理金额。
        //   注意：writeVoucher 对空 items 返回 null（借贷必不平），故只在有差异时调用。
        const vItems: any[] = [];
        for (const g of gain) {
          const cost = Math.abs(Number(g.costAmount) || 0);
          if (cost <= 0) continue;
          const isRaw = String(g.valuationClass || 'RAW').toUpperCase() === 'RAW';
          vItems.push({ summary: `盘盈入库 ${g.materialName || g.materialCode || ''}`, accountCode: isRaw ? '1403' : '1405', accountName: isRaw ? '原材料' : '库存商品', debit: cost, credit: 0 });
          vItems.push({ summary: `盘盈待处理 ${g.materialName || g.materialCode || ''}`, accountCode: '2201', accountName: '待处理财产损溢', debit: 0, credit: cost });
        }
        for (const l of loss) {
          const cost = Math.abs(Number((l as any).costAmount) || 0);
          if (cost <= 0) continue;
          const isRaw = String((l as any).valuationClass || 'RAW').toUpperCase() === 'RAW';
          vItems.push({ summary: `盘亏待处理 ${(l as any).materialName || (l as any).materialCode || ''}`, accountCode: '6602', accountName: '管理费用', debit: cost, credit: 0 });
          vItems.push({ summary: `盘亏出库 ${(l as any).materialName || (l as any).materialCode || ''}`, accountCode: isRaw ? '1403' : '1405', accountName: isRaw ? '原材料' : '库存商品', debit: 0, credit: cost });
        }
        // 诊断：凭证分录与成本（写失败时随响应带回，避免只看到 voucherNo=undefined 无从排查）
        _voucherFail = `诊断：vItems=${vItems.length} 行；`
          + `盘亏成本=${JSON.stringify(loss.map((l: any) => l.costAmount))}；`
          + `盘盈成本=${JSON.stringify(gain.map((g: any) => g.costAmount))}`;
        if (vItems.length > 0) {
          try {
            const vid = await writeVoucher(db, user.org_id, user, {
              voucherNo: `ADJ-${adjNo}`,
              voucherType: '转',
              date: adjDate,
              period: adjDate.slice(0, 7),
              source: 'inventory',
              sourceNo: adjNo,
              status: 'posted',
              description: `库存调整 ${adjNo}（${(head as any).warehouse_name || ''}）盘盈盘亏`,
              ledgerBook: '0000',
              totalDebit: roundAmount(vItems.reduce((s: number, it: any) => s + (it.debit || 0), 0)),
              totalCredit: roundAmount(vItems.reduce((s: number, it: any) => s + (it.credit || 0), 0)),
              items: vItems,
            } as any);
            if (vid) {
              await db.prepare(`UPDATE inventory_adjustments SET voucher_no = ? WHERE id = ? AND org_id = ?`)
                .bind(`ADJ-${adjNo}`, id, user.org_id).run();
              _voucherNo = `ADJ-${adjNo}`;
            } else {
              // writeVoucher 返回 null = 借贷不平或金额为 0（它自己会拒绝写脏凭证）。
              // 这里必须把原因带回，否则调用方只看到"voucherNo=undefined"无从排查。
              _voucherFail += `；writeVoucher 返回 null（借贷合计：借 ${roundAmount(vItems.reduce((s: number, it: any) => s + (it.debit || 0), 0))} / 贷 ${roundAmount(vItems.reduce((s: number, it: any) => s + (it.credit || 0), 0))}）`;
            }
          } catch (e: any) {
            // 凭证生成失败**不回滚库存**（账已实动），仅告警 —— 与折旧端点同策略
            _voucherFail += '；凭证生成异常：' + (e?.message || e);
            console.error('[inv-adjust-voucher] 调整凭证生成失败：', e?.message || e);
          }
        } else {
          _voucherFail += '；vItems 为空（成本为 0，无法生成盘盈盘亏凭证）'
            + `诊断：盘盈 ${gain.length} 行 / 盘亏 ${loss.length} 行；`
            + `盘亏成本=${JSON.stringify(loss.map((l: any) => l.costAmount))}；`
            + `盘盈成本=${JSON.stringify(gain.map((g: any) => g.costAmount))}`;
        }

        await db.prepare(
          `UPDATE inventory_adjustments SET inventory_posted = 1, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
        ).bind(now, user.name, id, user.org_id).run();
        _posted = true;
        _postMsg = `已过账：盘盈 ${gain.length} 行 / 盘亏 ${loss.length} 行`;

        // ★ 反假成功校验（同调拨端点）：postInbound/postOutbound 遇「库存行不存在 / 物料无效」
        //   会静默 continue，单据却被打上"已过账" —— 界面显示完成、库存没动、无任何痕迹。
        //   这里回读校验：有差异行但库存总额为 0 时，判定过账未生效并回滚报错。
        if (items.length > 0) {
          // ★ V3.61.0 W-E9：逐行回读校验（此前只核 items[0]，多行盘点中其余行
          //   静默 continue 仍报「已过账」）。逐行确认差异行对应的库存记录存在。
          const _failedLines: string[] = [];
          let _firstNowQty = 0;
          for (let i = 0; i < items.length; i++) {
            const it: any = items[i];
            if (!it?.materialId) continue;
            const row: any = await db.prepare(
              `SELECT COALESCE(SUM(quantity),0) AS qty FROM inventory_records
                WHERE org_id = ? AND material_id = ? AND warehouse_id = ?`
            ).bind(user.org_id, it.materialId, whId).first();
            const q = Number(row?.qty || 0);
            if (i === 0) _firstNowQty = q;
            // 盘亏行必须有库存（否则扣不动）；盘盈行无库存是正常的，不算失败
            const isLoss = Number(it.deltaQty ?? it.delta_qty) < 0;
            if (isLoss && q <= 0) {
              _failedLines.push(String(it.materialCode || it.materialId));
            }
          }
          const nowQty = _firstNowQty;
          if (_failedLines.length > 0) {
            await db.prepare(
              `UPDATE inventory_adjustments SET inventory_posted = 0, status = 'draft', updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
            ).bind(now, user.name, id, user.org_id).run();
            return json({
              error: `库存调整过账未生效：以下盘亏行在目标仓无库存记录（物料无效或未入库）：${_failedLines.join('、')}。单据已回退为草稿。`,
              code: 'ADJUSTMENT_POST_NO_EFFECT',
            }, 400);
          }
          _postMsg += `（调整后首行物料库存 ${nowQty}）`;
        }
      }
    } catch (e: any) {
      await db.prepare(
        `UPDATE inventory_adjustments SET status = 'draft', inventory_posted = 0, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
      ).bind(now, user.name, id, user.org_id).run();
      console.error('[inv-adjust-post] 调整过账失败，已回置草稿：', e?.message || e);
      return json({
        error: '库存调整过账失败，单据已回退为草稿：' + (e?.message || '请检查明细数据'),
        code: 'ADJUSTMENT_POST_FAILED',
      }, 400);
    }
  }

  const updated = await db.prepare(`SELECT * FROM inventory_adjustments WHERE id = ?`).bind(id).first();

  // B6 审计：库存调整单把「账面数量」直接改成「实际数量」，不做任何实物收发——
  //   也就是说这是唯一能凭空改变库存的数字、却没有物流凭证的单据类型。
  //   摘要必须把「调整量」写清楚（只写单号等于没写），并记调整原因与状态流转。
  const deltaQty = Number(body.totalDeltaQty) || 0;
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'inventory_adjustments',
    entityId: id,
    action: 'update',
    summary:
      `更新库存调整单 ${(existing as any).adjustment_no || id}` +
      `（仓库：${body.warehouseName ?? '-'}；调整量：${deltaQty >= 0 ? '+' : ''}${deltaQty}）` +
      `（原因：${String(body.reason ?? '').slice(0, 60) || '未填写'}）` +
      `（明细行：${Array.isArray(body.items) ? body.items.length : '未改动'}）` +
      `（状态：${(existing as any).status || '-'} → ${body.status || 'draft'}）`,
  });

  return json({
    ...(updated as any),
    inventory_posted: _posted ? 1 : (updated as any)?.inventory_posted,
    postMessage: _postMsg || undefined,
    // 凭证诊断：写失败时把原因带回，避免调用方只看到 voucherNo=undefined 无从排查
    voucherDiag: _voucherFail || undefined,
    // 同时给出驼峰别名：表字段是 voucher_no（snake_case），调用方多按驼峰写，
    // 少一个别名就会误判"凭证没生成"（本次 E2E 即踩过）。
    voucherNo: (updated as any)?.voucher_no ?? undefined,
  });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  // V3.45.0 操作权限服务端守卫（此前该端点零守卫，任何登录用户都能删库存调整单）
  const _opGuard = await guardOperation(user, 'warehouse', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  const row = await db.prepare(`SELECT id, adjustment_no, status, warehouse_name, total_delta_qty, reason FROM inventory_adjustments WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '调整单不存在' }, 404);

  await db.prepare(`DELETE FROM inventory_adjustments WHERE id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM inventory_adjustment_items WHERE inventory_adjustment_id = ?`).bind(id).run();

  // B6 审计：删除库存调整单 = 抹掉一次账实差异的处置痕迹，属于必须留痕的高风险动作。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'inventory_adjustments',
    entityId: id,
    action: 'delete',
    summary:
      `删除库存调整单 ${(row as any).adjustment_no || id}` +
      `（仓库：${(row as any).warehouse_name || '-'}；原调整量：${(row as any).total_delta_qty ?? '-'}）` +
      `（原原因：${String((row as any).reason ?? '').slice(0, 60) || '未填写'}）`,
  });

  return json({ success: true });
}
