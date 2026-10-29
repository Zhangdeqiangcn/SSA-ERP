// BOM 域单条端点（C1 数据关系化样板）
// GET    /api/bom/:id   读取（表头 + 嵌套明细）
// PUT    /api/bom/:id   更新（表头字段 + 明细整体替换）
// DELETE /api/bom/:id   删除（明细按外键级联删除，此处显式删一次以兼容未开外键的连接）
//
// ── 为什么更新要走「字段级差异」而不是「整体覆盖」──────────────────
// 前端传来的 body 可能只含被改动的字段（例如 productionVersionStore 的 ECN 只改
// status 与 version 两个字段）。若直接整体覆盖，未传字段会被写成 NULL ——
// 一次「改版本号」的操作会把产品名称、成本、生效日期全部清空。
// 因此这里只更新 body 中出现的字段（pickHeader 已按此语义实现）。
//
// ── 为什么删除会同时删明细 ───────────────────────────────────────
// 迁移里已声明 `ON DELETE CASCADE`，理论上删表头会自动删明细。
// 但 D1 的每个连接是否启用 `PRAGMA foreign_keys` 不保证（迁移里开过，运行时未必），
// 级联可能不生效 → 留下孤儿明细行，它们会污染「按子件反查」的结果
// （查到某个零件属于一张已经不存在的 BOM）。所以显式删一次，成本极低、收益明确。
import { getUserFromRequest, json } from '../../_shared/auth';
import { validateOrReject } from '../../_shared/validate';
import { writeAudit } from '../../_shared/auditLog';
import { headerToApi, pickHeader, pickItem, findHeader, flattenItems } from './index';

export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const DB = context.env.DB;
  const id = context.params.id;

  const header = await findHeader(DB, id, user.org_id);
  if (!header) return json({ error: 'BOM 不存在' }, 404);

  const items = await DB.prepare(`SELECT * FROM bom_items WHERE bom_id = ? ORDER BY level ASC, sequence ASC`)
    .bind(id)
    .all();

  return json(headerToApi(header, items.results || []));
}

export async function onRequestPut(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const DB = context.env.DB;
  const id = context.params.id;

  const existing = await findHeader(DB, id, user.org_id);
  if (!existing) return json({ error: 'BOM 不存在' }, 404);

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('bom_headers', body, { partial: true });
  if (_invalid) return _invalid;

  const now = new Date().toISOString();
  const { cols, vals } = pickHeader(body);

  // 只更新传了的字段（见文件头说明）。全都没传时跳过 UPDATE，
  // 避免生成 `UPDATE ... SET updated_at = ?` 这种「只改时间戳」的空更新 ——
  // 它会无意义地触发乐观锁版本变化。
  if (cols.length > 0) {
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    try {
      await DB.prepare(
        `UPDATE bom_headers SET ${setClause}, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`
      )
        .bind(...vals, now, user.id, id, user.org_id)
        .run();
    } catch (e: any) {
      if (String(e?.message || '').includes('UNIQUE')) {
        return json({ error: `更新失败：BOM 编号 ${body.bomNo || ''} 在本组织已存在` }, 409);
      }
      return json({ error: `更新 BOM 失败：${e?.message || '未知错误'}` }, 500);
    }
  }

  // 明细：仅当显式传了 items 数组才替换。
  // 传 `items: []` = 清空明细（合法操作，表示这张 BOM 暂时没有配料）；
  // 不传 items = 明细保持原样（这是「只改表头」的语义）。
  // 两者的区别必须保留 —— 若把 「不传」也当成清空，ECN 改状态会把整张 BOM 的料清掉。
  let itemInfo = '未改动';
  if (Array.isArray(body.items)) {
    // ★ 与创建走同一条摊平逻辑（flattenItems）：不摊平会静默丢掉嵌套子树。
    //   两处必须共用同一个函数，否则「创建对了、编辑后又少了」这类问题极难定位。
    const flat = flattenItems(body.items);
    const stmts: any[] = [DB.prepare(`DELETE FROM bom_items WHERE bom_id = ?`).bind(id)];
    for (const item of flat) {
      const { cols: ic, vals: iv } = pickItem(item);
      const c2 = [...ic];
      const v2 = [...iv];
      if (!c2.includes('level')) { c2.push('level'); v2.push(1); }
      if (!c2.includes('sequence')) { c2.push('sequence'); v2.push(0); }
      const itemId = item.id ? String(item.id) : crypto.randomUUID().replace(/-/g, '').slice(0, 20);
      const allCols = ['id', 'bom_id', ...c2, 'created_at', 'updated_at'];
      const allVals = [itemId, id, ...v2, now, now];
      stmts.push(
        DB.prepare(`INSERT INTO bom_items (${allCols.join(',')}) VALUES (${allCols.map(() => '?').join(',')})`).bind(
          ...allVals
        )
      );
    }
    try {
      await DB.batch(stmts);
      // 回报「摊平后共几行」而不只是顶层条数 —— 让审计能看出嵌套被展开了
      itemInfo = `${flat.length} 行${flat.length !== body.items.length ? `（由 ${body.items.length} 个顶层项展开）` : ''}`;
    } catch (e: any) {
      // 明细批次失败时表头已改，必须如实回报而不是假装成功
      return json({ error: `BOM 明细保存失败（表头已更新）：${e?.message || '未知错误'}` }, 500);
    }
  }

  await writeAudit(DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'bom_headers',
    entityId: id,
    action: 'update',
    summary:
      `更新 BOM ${(existing as any).bom_no || id}（${(existing as any).product_name || (existing as any).product_code || '-'}）` +
      `（改动字段：${cols.length > 0 ? cols.join('、') : '无'}）` +
      `（版本：${(existing as any).version || '-'} → ${body.version ?? (existing as any).version ?? '-'}）` +
      `（状态：${(existing as any).status || '-'} → ${body.status ?? ((existing as any).status || '-')}）` +
      `（明细：${itemInfo}）`,
  });

  const updated = await findHeader(DB, id, user.org_id);
  const items = await DB.prepare(`SELECT * FROM bom_items WHERE bom_id = ? ORDER BY level ASC, sequence ASC`)
    .bind(id)
    .all();
  return json(headerToApi(updated, items.results || []));
}

export async function onRequestDelete(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const DB = context.env.DB;
  const id = context.params.id;

  const existing = await findHeader(DB, id, user.org_id);
  if (!existing) return json({ error: 'BOM 不存在' }, 404);

  // 删除前先数一下明细行数，写进审计摘要 —— 「删掉了一张 12 行配料的 BOM」
  // 与「删掉了一张空 BOM」是完全不同的后果，只记单号不足以事后追责。
  const cnt: any = await DB.prepare(`SELECT COUNT(*) as c FROM bom_items WHERE bom_id = ?`).bind(id).first();
  const itemCount = cnt?.c || 0;

  await DB.batch([
    DB.prepare(`DELETE FROM bom_headers WHERE id = ? AND org_id = ?`).bind(id, user.org_id),
    DB.prepare(`DELETE FROM bom_items WHERE bom_id = ?`).bind(id),
  ]);

  await writeAudit(DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'bom_headers',
    entityId: id,
    action: 'delete',
    summary:
      `删除 BOM ${(existing as any).bom_no || id}（${(existing as any).product_name || (existing as any).product_code || '-'} / ${(existing as any).version || '-'}）` +
      `（连带删除明细 ${itemCount} 行）` +
      `（原状态：${(existing as any).status || '-'}）`,
  });

  return json({ success: true, deletedItems: itemCount });
}
