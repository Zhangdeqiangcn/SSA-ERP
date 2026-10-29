// 物流面单 · 运单 CRUD（GET 列表 / POST 建单取号）
// 遵循后端硬规矩：getUserFromRequest / json / rlsCondition / audit / guardOperation / SQL 参数绑定防注入
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';

const TABLE = 'waybills';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const carrier = url.searchParams.get('carrier');

  const rls = rlsCondition(user, TABLE);
  let sql = `SELECT * FROM ${TABLE} WHERE org_id = ?`;
  const params: any[] = [user.org_id];
  if (rls.clause !== '1=1') {
    sql += ' AND ' + rls.clause;
    params.push(...rls.params);
  }
  if (carrier) {
    sql += ' AND carrier = ?';
    params.push(carrier);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';

  const rows = await env.DB.prepare(sql).bind(...params).all();
  return json({ data: (rows.results || []).map(formatRow) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'logistics', 'create', env.DB, user.org_id);
  if (_g) return _g;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const {
    carrier, orderHubId, packNo, waveId,
    receiverName, receiverPhone, receiverAddress, weight,
  } = body;
  if (!carrier || !orderHubId || !packNo) {
    return json({ error: '承运商 / 订单 / 包裹号必填' }, 400);
  }

  // 查订单中台取收件人（参数绑定防注入）
  const rls = rlsCondition(user, 'order_hub');
  let where = 'id = ? AND org_id = ?';
  const oparams: any[] = [orderHubId, user.org_id];
  if (rls.clause !== '1=1') {
    where += ' AND ' + rls.clause;
    oparams.push(...rls.params);
  }
  const order: any = await env.DB
    .prepare(`SELECT receiver_name, receiver_phone, receiver_address, province, city, district FROM order_hub WHERE ${where}`)
    .bind(...oparams)
    .first();
  if (!order) return json({ error: '订单不存在' }, 404);

  // 校验包裹号归属本组织
  const pack = await env.DB
    .prepare(`SELECT id FROM pack_records WHERE org_id = ? AND pack_no = ?`)
    .bind(user.org_id, packNo)
    .first();
  if (!pack) return json({ error: '包裹号不存在：' + packNo }, 400);

  // 是否配置真实承运商凭证（channel_credentials 有非空 access_token）
  const cred = await env.DB
    .prepare(`SELECT id FROM channel_credentials WHERE org_id = ? AND platform = ? AND access_token IS NOT NULL AND access_token <> ''`)
    .bind(user.org_id, carrier)
    .first();

  const now = new Date().toISOString();
  let waybillNo: string;
  let labelUrl: string;
  let mock: boolean;

  if (cred) {
    // 真实承运商对接入口：OAuth/签名调用待强哥提供密钥后由后端发起（诚实提示，不假装成功）
    return json(
      { error: '真实承运商对接尚未启用：请确认密钥配置，后端将以服务端签名方式调用（待接入）', code: 'CARRIER_NOT_IMPLEMENTED' },
      501
    );
  }
  // 诚实降级：未接真实承运商，生成 Mock 面单（明确标注 mock，绝不静默冒充真实）
  waybillNo = `${carrier.toUpperCase()}${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
  labelUrl = `/labels/${waybillNo}.html`;
  mock = true;

  const id = uid('wb');
  try {
    await env.DB
      .prepare(
        `INSERT INTO waybills (id, org_id, carrier, waybill_no, order_hub_id, pack_no, wave_id,
           receiver_name, receiver_phone, receiver_address, province, city, district, weight, label_url, status, mock,
           created_at, updated_at, created_by, updated_by, created_by_name, updated_by_name)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        id, user.org_id, carrier, waybillNo, orderHubId, packNo, waveId ?? null,
        receiverName ?? order.receiver_name ?? null,
        receiverPhone ?? order.receiver_phone ?? null,
        receiverAddress ?? order.receiver_address ?? null,
        order.province ?? null, order.city ?? null, order.district ?? null,
        weight ?? null, labelUrl, 'created', mock ? 1 : 0,
        now, now, user.id, user.id, user.name ?? user.username, user.name ?? user.username
      )
      .run();
  } catch (e: any) {
    return errorResponse(e, '创建运单');
  }

  await audit(
    env.DB,
    user.org_id,
    user,
    'logistics',
    'create',
    `生成运单 ${waybillNo}（${mock ? 'Mock' : '真实'}）：订单 ${orderHubId} / 包裹 ${packNo}`
  );
  return json({ id, waybillNo, labelUrl, mock, status: 'created' }, 201);
}

function formatRow(r: any) {
  return {
    id: r.id,
    carrier: r.carrier,
    waybillNo: r.waybill_no,
    orderHubId: r.order_hub_id,
    packNo: r.pack_no,
    waveId: r.wave_id,
    receiverName: r.receiver_name,
    receiverPhone: r.receiver_phone,
    receiverAddress: r.receiver_address,
    weight: r.weight,
    labelUrl: r.label_url,
    status: r.status,
    mock: !!r.mock,
    createdAt: r.created_at,
  };
}
