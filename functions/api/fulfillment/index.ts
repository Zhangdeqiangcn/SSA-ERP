// 仓储执行层 · 波次 CRUD（GET 列表 / POST 建波次并拆拣货任务）
// 遵循后端硬规矩：getUserFromRequest / json / rlsCondition / audit / guardOperation / SQL 参数绑定防注入
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';

function safeJson(s: string | null, fallback: any) {
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

const TABLE_MAP: Record<string, string> = {
  wave: 'waves',
  pick: 'pick_tasks',
  pack: 'pack_records',
  ship: 'ship_checks',
};

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') || 'wave';
  const waveId = url.searchParams.get('waveId');
  const table = TABLE_MAP[kind] || 'waves';

  const rls = rlsCondition(user, table);
  let sql = `SELECT * FROM ${table} WHERE org_id = ?`;
  const params: any[] = [user.org_id];
  if (rls.clause !== '1=1') {
    sql += ' AND ' + rls.clause;
    params.push(...rls.params);
  }
  if ((kind === 'pick' || kind === 'pack') && waveId) {
    sql += ' AND wave_id = ?';
    params.push(waveId);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';

  const rows = await env.DB.prepare(sql).bind(...params).all();
  return json({ data: (rows.results || []).map((r: any) => formatRow(r, kind)) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'fulfillment', 'create', env.DB, user.org_id);
  if (_g) return _g;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const orderIds: string[] = Array.isArray(body.orderIds) ? body.orderIds : [];
  if (orderIds.length === 0) return json({ error: '请至少选择一个订单' }, 400);

  // 查订单中台这些订单的明细行（SQL 参数绑定防注入）
  const placeholders = orderIds.map(() => '?').join(',');
  const orders = await env.DB
    .prepare(`SELECT id, lines FROM order_hub WHERE org_id = ? AND id IN (${placeholders})`)
    .bind(user.org_id, ...orderIds)
    .all();
  const orderRows: any[] = orders.results || [];

  // 聚合内部 SKU → 应拣数量 / 名称（同 SKU 合并）
  const agg = new Map<string, { qty: number; name?: string }>();
  for (const o of orderRows) {
    const lines = safeJson(o.lines, []);
    for (const l of lines) {
      const sku = l.sku || l.platformSku;
      if (!sku) continue;
      const e = agg.get(sku) || { qty: 0 };
      e.qty += l.quantity;
      if (l.name && !e.name) e.name = l.name;
      agg.set(sku, e);
    }
  }
  if (agg.size === 0) return json({ error: '所选订单无可拣货明细' }, 400);

  const now = new Date().toISOString();
  const waveId = uid('wv');
  const waveNo = 'W' + now.slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 9000 + 1000);
  try {
    await env.DB
      .prepare(
        `INSERT INTO waves (id, org_id, wave_no, status, order_ids, remark, created_at, updated_at, created_by, updated_by, created_by_name, updated_by_name)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        waveId,
        user.org_id,
        waveNo,
        'released',
        JSON.stringify(orderIds),
        body.remark ?? null,
        now,
        now,
        user.id,
        user.id,
        user.name ?? user.username,
        user.name ?? user.username
      )
      .run();

    for (const [sku, { qty, name }] of agg) {
      const tid = uid('pk');
      await env.DB
        .prepare(
          `INSERT INTO pick_tasks (id, org_id, wave_id, order_hub_id, material_code, material_name, required_qty, picked_qty, status, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(tid, user.org_id, waveId, null, sku, name ?? null, qty, 0, 'pending', now)
        .run();
    }
  } catch (e: any) {
    return errorResponse(e, '创建波次与拣货任务');
  }

  await audit(
    env.DB,
    user.org_id,
    user,
    'fulfillment',
    'create',
    `创建波次 ${waveNo}：含 ${orderRows.length} 单 / ${agg.size} 拣货任务`
  );
  return json({ id: waveId, waveNo, pickTaskCount: agg.size }, 201);
}

function formatRow(r: any, kind: string) {
  if (kind === 'wave')
    return {
      id: r.id,
      waveNo: r.wave_no,
      status: r.status,
      orderIds: safeJson(r.order_ids, []),
      remark: r.remark,
      createdAt: r.created_at,
    };
  if (kind === 'pick')
    return {
      id: r.id,
      waveId: r.wave_id,
      orderHubId: r.order_hub_id,
      materialCode: r.material_code,
      materialName: r.material_name,
      locationId: r.location_id,
      locationName: r.location_name,
      barcode: r.barcode,
      requiredQty: r.required_qty,
      pickedQty: r.picked_qty,
      status: r.status,
    };
  if (kind === 'pack')
    return {
      id: r.id,
      waveId: r.wave_id,
      orderHubId: r.order_hub_id,
      packNo: r.pack_no,
      weight: r.weight,
      status: r.status,
      createdAt: r.created_at,
    };
  return {
    id: r.id,
    orderHubId: r.order_hub_id,
    packNo: r.pack_no,
    pass: !!r.pass,
    detail: safeJson(r.detail, null),
    createdAt: r.created_at,
  };
}
