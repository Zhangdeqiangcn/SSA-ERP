// GET/PUT/DELETE /api/quality-holds/:id
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardOperation } from '../../_shared/operationGuard';
import { validateOrReject } from '../../_shared/validate';
// V3.5.0 B6：补齐写审计（扣留/放行直接决定物料能不能用，属于质量放行权）
import { writeAudit } from '../../_shared/auditLog';
// ★ V3.113.3 P0-3：放行（released）必须**回冲冻结量**，否则冻结量只增不减，
//   物料被永久锁死（可用量永远回不来）。
import { adjustFrozenQuantity } from '../../_shared/inventoryPosting';
import { HOLD_OCCUPYING_STATUSES } from '../../_shared/qualityHoldStatus';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT * FROM quality_holds WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '质检扣留不存在' }, 404);

  return json(row);
}

export async function onRequestPut(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const existing = await db.prepare(`SELECT * FROM quality_holds WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!existing) return json({ error: '质检扣留不存在' }, 404);

  // V3.28.0: 操作权限服务端守卫（质量模块 — 质检可改扣留/放行，越权返回 403）
  const _opGuard = await guardOperation(user, 'quality', 'update', db, user.org_id);
  if (_opGuard) return _opGuard;

  const body = await context.request.json().catch(() => ({}));
  const _invalid = validateOrReject('quality_holds', body, { partial: true });
  if (_invalid) return _invalid;
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // ★ V3.49.0 原子底座（R3 覆盖式改写）：原 UPDATE 是「整表覆盖式」——
  //   每列都写成 `body.x || null`，只拨一个状态开关就会把没传过来的
  //   物料/批次/仓库全部清空。改为「字段级更新」：只对本次携带的字段生成
  //   SET 子句，未携带的列保留 existing 原值；未携带任何字段时只刷时间戳。
  const ex = existing as any;
  const setClauses: string[] = [];
  const setValues: any[] = [];
  const pick = (key: string, toCol: string, cast?: (v: any, cur: any) => any) => {
    if (body[key] !== undefined) {
      setClauses.push(`${toCol} = ?`);
      setValues.push(cast ? cast(body[key], ex[toCol]) : (body[key] ?? null));
    }
  };
  pick('materialId', 'material_id');
  pick('materialCode', 'material_code');
  pick('materialName', 'material_name');
  pick('warehouseId', 'warehouse_id');
  pick('warehouseName', 'warehouse_name');
  pick('batchNo', 'batch_no');
  if (body.quantity !== undefined) { setClauses.push('quantity = ?'); setValues.push(Number(body.quantity) || 0); }
  if (body.status !== undefined) { setClauses.push('status = ?'); setValues.push(body.status); }
  pick('sourceInboundNo', 'source_inbound_no');
  pick('holdDate', 'hold_date');
  pick('releaseDate', 'release_date');
  pick('inspector', 'inspector');
  pick('reason', 'reason');
  // 时间戳与操作人恒定更新（不在字段级范围内，避免误清空）
  setClauses.push('updated_at = ?', 'updated_by = ?');
  setValues.push(now, user.name);

  await db.prepare(`UPDATE quality_holds SET ${setClauses.join(', ')} WHERE id = ?`).bind(...setValues, id).run();

  const updated = await db.prepare(`SELECT * FROM quality_holds WHERE id = ?`).bind(id).first();

  // ★ V3.113.3 P0-3：冻结量回冲。
  //   规则：只有「从生效态 → 非生效态」才回冲（放行/作废才解锁）；
  //   反向（从非生效 → 生效）要重新冻结；生效态内改数量则按差额调整。
  //   否则会出现「改数量时冻结量错乱」或「重复放行把可用量虚增」。
  //
  //   ★ 语义边界：**判定不合格（rejected）≠ 已处置**。
  //   判不合格的料实物仍在库、仍未报废/返工/退货 → 仍占用可用量，不能解冻。
  //   与前端 utils/supply.ts 的 isHoldActive 严格对齐（口径分裂会重演本缺陷）。
  const ACTIVE = HOLD_OCCUPYING_STATUSES;
  const wasActive = ACTIVE.includes(String(ex.status));
  const nowActive = ACTIVE.includes(String((updated as any)?.status));
  let frozenApplied = true;
  let frozenNote = '';
  const exMat = ex.material_id as string | null;
  const exQty = Number(ex.quantity) || 0;
  const newQty = Number((updated as any)?.quantity) || 0;
  if (exMat && exQty > 0) {
    let delta = 0;
    if (wasActive && !nowActive) delta = -exQty;              // 放行：全量解冻
    else if (!wasActive && nowActive) delta = newQty;        // 重新生效：全量冻结
    else if (wasActive && nowActive) delta = newQty - exQty; // 生效态内改量：按差额
    if (delta !== 0) {
      const fr = await adjustFrozenQuantity(db, user.org_id, user, {
        materialId: String(exMat),
        warehouseId: (updated as any)?.warehouse_id || ex.warehouse_id || null,
        delta,
        reason: `质检扣留状态 ${ex.status} → ${(updated as any)?.status}`,
      });
      frozenApplied = fr.ok;
      if (!fr.ok) frozenNote = fr.message || '冻结量回冲失败';
    }
  } else if (exMat && exQty === 0 && newQty > 0 && nowActive) {
    // 原数量为 0（历史数据没填数量）现补填且生效 → 冻结新数量
    const fr = await adjustFrozenQuantity(db, user.org_id, user, {
      materialId: String(exMat),
      warehouseId: (updated as any)?.warehouse_id || ex.warehouse_id || null,
      delta: newQty,
      reason: `质检扣留补填数量并生效`,
    });
    frozenApplied = fr.ok;
    if (!fr.ok) frozenNote = fr.message || '冻结量写入失败';
  }

  // B6 审计：质量扣留是「判定物料不可用」，放行是「判定可用」——两者都是质量放行权
  //   的行使。质量事故复盘时第一个要问的就是「谁在什么时候放行的」，
  //   因此摘要必须写清 批次 + 数量 + 状态流转 + 检验人，缺一不可。
  //   ★ 状态/批次/检验人展示值取「改后」行（existing 是改前快照），只改状态也不会清掉这些字段。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'quality_holds',
    entityId: id,
    action: (updated as any)?.status === 'released' ? 'release' : 'update',
    summary:
      `更新质检扣留 ${(updated as any)?.material_code || id}` +
      `（批次：${(updated as any)?.batch_no ?? '-'}；数量：${(updated as any)?.quantity ?? '-'}）` +
      `（状态：${ex.status || '-'} → ${(updated as any)?.status || ex.status || '-'}）` +
      `（检验人：${(updated as any)?.inspector ?? ex.inspector ?? '-'}；原因：${String((updated as any)?.reason ?? ex.reason ?? '').slice(0, 60) || '未填写'}）`,
  });

  return json({ ...updated, frozenApplied, ...(frozenNote ? { warning: frozenNote } : {}) });
}

export async function onRequestDelete(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const id = context.params.id;

  const row = await db.prepare(`SELECT id, org_id, material_id, material_code, material_name, batch_no, quantity, status, source_inbound_no, warehouse_id FROM quality_holds WHERE id = ? AND org_id = ?`).bind(id, user.org_id).first();
  if (!row) return json({ error: '质检扣留不存在' }, 404);

  // ★ V3.113.3 P0-3：删除扣留单必须回冲冻结量 —— 否则物料被永久锁死（可用量回不来）。
  if ((row as any).material_id && Number((row as any).quantity) > 0
    && HOLD_OCCUPYING_STATUSES.includes(String((row as any).status))) {
    const fr = await adjustFrozenQuantity(db, user.org_id, user, {
      materialId: String((row as any).material_id),
      warehouseId: (row as any).warehouse_id || null,
      delta: -Number((row as any).quantity),
      reason: '质检扣留单删除回冲',
    });
    if (!fr.ok) {
      // 回冲失败必须留痕（铁律㊾）：删除继续，但记 error 日志（冻结量未回冲 → 物料被锁）
      console.error('[quality-holds] 删除扣留单时冻结量回冲失败', id, fr.message || '');
    }
  }

  // V3.28.0: 操作权限服务端守卫（质量模块 — 质检可删扣留，越权返回 403）
  const _opGuard = await guardOperation(user, 'quality', 'delete', db, user.org_id);
  if (_opGuard) return _opGuard;

  await db.prepare(`DELETE FROM quality_holds WHERE id = ?`).bind(id).run();

  // B6 审计：删除扣留记录会让「这批料曾被判定不合格」这一事实从系统里消失。
  //   若该扣留尚未放行（status != released）就删除，等于绕过了质量放行流程，
  //   单独标注出来供质量部复核。
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'quality_holds',
    entityId: id,
    action: 'delete',
    summary:
      `删除质检扣留 ${(row as any).material_code || id}` +
      `（批次：${(row as any).batch_no || '-'}；数量：${(row as any).quantity ?? '-'}；状态：${(row as any).status || '-'}）` +
      `（来源入库单：${(row as any).source_inbound_no || '-'}）` +
      ((row as any).status !== 'released' ? '【注意：未放行即删除，疑似绕过质量放行流程，请质量部复核】' : ''),
  });

  return json({ success: true });
}
