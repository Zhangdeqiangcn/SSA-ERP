/**
 * 乐观锁：防止并发修改同一条单据时后提交者静默覆盖先提交者
 *
 * 做法：更新语句带上版本条件 `AND version = ?`，用「影响行数是否为 0」判断是否冲突。
 * 而不是「先查版本号、再比对、再更新」——后者存在一个时间窗，两个请求可能同时通过检查。
 *
 * 兼容：客户端不传 version 时保持原有行为（不加锁），老客户端不受影响。
 */
import { json } from './auth';

export interface GuardOptions {
  db: any;
  table: string;      // 调用方已确保是硬编码表名，不接受外部输入
  id: string;
  orgId: string;
  body: any;
  /** SET 子句数组，形如 ['order_no = ?', ...]，与 values 严格一一对应（推荐用法） */
  setClauses?: string[];
  /** 与 setClauses 严格一一对应的绑定值 */
  values?: any[];
  /**
   * 整段 SET 子句，形如 'code = COALESCE(?, code), name = COALESCE(?, name)'，与 values 一一对应。
   * 用于 SET 内含表达式（COALESCE 等）、不便拆成数组的场景。
   * 传了 setClauses 时以 setClauses 为准（两者二选一）。
   */
  setSql?: string;
}

/**
 * 执行带版本保护的 UPDATE。
 * @returns 冲突时返回 409 响应（调用方直接 return 即可）；正常时返回 null。
 */
export async function withVersionGuard(opts: GuardOptions): Promise<any | null> {
  const { db, table, id, orgId, body, setSql } = opts;

  // SET 子句规范化：数组优先。数组模式下必须剔除调用方写入的 version = ? ——
  // 否则「拿着旧版本号还能把自己的旧版本号写回去」，锁就形同虚设。
  const sc = opts.setClauses ? opts.setClauses.slice() : null;
  const vs = opts.values ? opts.values.slice() : [];
  if (sc) {
    const vi = sc.findIndex((c) => /^version\s*=/i.test(c.trim()));
    if (vi >= 0) { sc.splice(vi, 1); vs.splice(vi, 1); }
  }
  const setOf = (bump: boolean): string => {
    const base = sc ? sc.join(', ') : (setSql || '');
    return bump ? `${base}, version = version + 1` : base;
  };

  const incoming = body?.version;
  // 未携带版本号（或非数字）：维持旧行为，不做并发保护（保证老客户端兼容）
  if (incoming === undefined || incoming === null || !Number.isFinite(Number(incoming))) {
    await db.prepare(`UPDATE ${table} SET ${setOf(false)} WHERE id = ?`)
      .bind(...vs, id).run();
    return null;
  }

  const expected = Number(incoming);
  const res = await db.prepare(
    `UPDATE ${table} SET ${setOf(true)} WHERE id = ? AND org_id = ? AND (version = ? OR version IS NULL)`
  ).bind(...vs, id, orgId, expected).run();

  const changes = (res as any)?.meta?.changes ?? 0;
  if (changes > 0) return null;

  // 没更新到：要么单据不存在/越权，要么版本已被别人推进
  const cur = await db.prepare(`SELECT version FROM ${table} WHERE id = ? AND org_id = ?`)
    .bind(id, orgId).first();
  if (!cur) {
    return json({ error: '单据不存在或无权访问', code: 'NOT_FOUND' }, 404);
  }
  return json(
    {
      error: '该单据已被其他人修改，请刷新后重新编辑',
      code: 'VERSION_CONFLICT',
      currentVersion: (cur as any).version ?? 1,
      yourVersion: expected,
    },
    409
  );
}
