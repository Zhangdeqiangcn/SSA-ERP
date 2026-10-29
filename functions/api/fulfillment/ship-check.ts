// 仓储执行层 · 发货校验（POST /api/fulfillment/ship-check）：订单行 vs 实扫清单逐项比对
// 关键纪律：不通过必须诚实返回 422 + 不符明细，绝不静默放行（防错发漏发）
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

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'fulfillment', 'update', env.DB, user.org_id);
  if (_g) return _g;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const { orderHubId, packNo, scanList } = body;
  if (!orderHubId || !Array.isArray(scanList)) {
    return json({ error: '订单与扫描清单必填' }, 400);
  }

  const rls = rlsCondition(user, 'order_hub');
  let where = 'id = ? AND org_id = ?';
  const params: any[] = [orderHubId, user.org_id];
  if (rls.clause !== '1=1') {
    where += ' AND ' + rls.clause;
    params.push(...rls.params);
  }
  const order = await env.DB.prepare(`SELECT lines FROM order_hub WHERE ${where}`).bind(...params).first();
  if (!order) return json({ error: '订单不存在' }, 404);

  const lines = safeJson(order.lines, []);
  // 期望：内部 SKU → 数量
  const expected = new Map<string, number>();
  for (const l of lines) {
    const sku = l.sku || l.platformSku;
    if (!sku) continue;
    expected.set(sku, (expected.get(sku) || 0) + l.quantity);
  }
  // 实扫：materialCode/sku → 数量
  const actual = new Map<string, number>();
  for (const s of scanList) {
    const code = s.materialCode || s.sku;
    if (!code) continue;
    actual.set(code, (actual.get(code) || 0) + (s.quantity || 0));
  }

  const mismatches: any[] = [];
  for (const [code, qty] of expected) {
    const got = actual.get(code) || 0;
    if (got !== qty) {
      mismatches.push({ materialCode: code, expected: qty, actual: got, type: got === 0 ? 'missing' : 'qty' });
    }
  }
  for (const [code, qty] of actual) {
    if (!expected.has(code)) mismatches.push({ materialCode: code, expected: 0, actual: qty, type: 'extra' });
  }
  for (const s of scanList) {
    const code = s.materialCode || s.sku;
    const line = lines.find((l: any) => (l.sku || l.platformSku) === code);
    if (line && line.barcode && s.barcode && line.barcode !== s.barcode) {
      mismatches.push({ materialCode: code, expected: -1, actual: -1, type: 'barcode' });
    }
  }

  const pass = mismatches.length === 0;
  const id = uid('sc');
  const now = new Date().toISOString();
  try {
    await env.DB
      .prepare(
        `INSERT INTO ship_checks (id, org_id, order_hub_id, pack_no, pass, detail, created_at)
         VALUES (?,?,?,?,?,?,?)`
      )
      .bind(id, user.org_id, orderHubId, packNo ?? null, pass ? 1 : 0, JSON.stringify(mismatches), now)
      .run();
  } catch (e: any) {
    return errorResponse(e, '发货校验');
  }

  await audit(
    env.DB,
    user.org_id,
    user,
    'fulfillment',
    'update',
    `发货校验 ${orderHubId} ${pass ? '通过' : '不通过(' + mismatches.length + '项不符)'}`
  );
  if (!pass) return json({ pass: false, mismatches }, 422);
  return json({ pass: true, id });
}
