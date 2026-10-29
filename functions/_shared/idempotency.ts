/**
 * 新建单据的「防重复」助手（缺陷台账 #10 完整范围 · 幂等键部分）
 *
 * 背景：此前系统里所有防重复手段都只覆盖「副作用」——库存过账靠 inventory_posted 守卫、
 * 折旧计提靠期间查重、MRP 落库靠 run_id —— 但**建单本身没有任何防重复**。用户双击「保存」、
 * 或网络超时后前端自动重试，会静默建出两张一模一样的单据（客户/供应商/库存/凭证都会受影响）。
 *
 * 提供两道闸，端点按需选用：
 *
 * ① dedupeByNo —— 单号查重（推荐，零误判）
 *    客户端创建时带业务单号（inboundNo / transferNo …），若本组织已存在同号单据 → 409。
 *    判据是「同组织 + 同单号」，是确定性事实，不存在误判；双击提交的单号相同，正好被拦住。
 *
 * ② Idempotency-Key 幂等键（供无业务单号的端点用，如库存调整单/质检扣留）
 *    客户端可带请求头 `Idempotency-Key` 或 body.idempotencyKey。服务端按 (org_id, key) 唯一登记，
 *    命中已有登记则直接回传上一次的结果（replay），不再重复建单。
 *    ★ 不带键时完全不启用，老客户端行为零变化。
 *
 * 为什么【不做】「按请求内容指纹 + 短时间窗」自动去重：
 *   内容指纹会在「用户确实想连续建两张内容相同的单据」时误判合并，属静默错误，
 *   比重复建单更难排查。宁可只做确定性/显式两种，不做猜测式去重。
 */

/** 从请求头或 body 取幂等键；都没有则返回 null（表示本次不启用幂等）。 */
export function resolveIdemKey(request: Request, body: any): string | null {
  const h = (request?.headers?.get?.('Idempotency-Key') || '').trim();
  if (h) return h.slice(0, 128);
  const b = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  return b ? b.slice(0, 128) : null;
}

/**
 * ① 单号查重：本组织已存在同号单据则返回待回的 409 响应对象（交给端点 `return json(...)`），否则 null。
 * 不传单号（no 为空）时直接放行，不做任何判断。
 */
export async function dedupeByNo(
  db: any,
  opts: { table: string; noCol: string; orgId: string; no?: string | null; label: string },
): Promise<{ response: any } | null> {
  const no = (opts.no || '').toString().trim();
  if (!no) return null;
  const hit = await db
    .prepare(`SELECT id FROM ${opts.table} WHERE org_id = ? AND ${opts.noCol} = ? LIMIT 1`)
    .bind(opts.orgId, no)
    .first()
    .catch(() => null);
  // 表还没有该列 / 查询异常时不拦，避免把建单功能整个打挂（fail-open）
  if (!hit) return null;
  return {
    response: {
      error: `${opts.label}单号「${no}」已存在，未重复创建`,
      code: 'DUPLICATE_DOC_NO',
      existingId: hit.id,
    },
  };
}

/**
 * ② 幂等键登记查询：命中则返回既有结果 id，端点应直接回传上一次结果；未命中返回 null。
 */
export async function findIdem(db: any, orgId: string, key: string): Promise<{ resource: string; resultId: string } | null> {
  const row = await db
    .prepare(`SELECT resource, result_id FROM idempotency_keys WHERE org_id = ? AND idem_key = ? LIMIT 1`)
    .bind(orgId, key)
    .first()
    .catch(() => null);
  if (!row) return null;
  return { resource: row.resource, resultId: row.result_id };
}

/** ② 幂等键登记写入：建单成功后调用。失败不影响主流程（best-effort）。 */
export async function saveIdem(
  db: any,
  orgId: string,
  key: string,
  resource: string,
  resultId: string,
): Promise<void> {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  await db
    .prepare(
      `INSERT OR IGNORE INTO idempotency_keys (id, org_id, idem_key, resource, result_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(`idem-${crypto.randomUUID()}`, orgId, key, resource, resultId, now)
    .run()
    .catch(() => {});
}
