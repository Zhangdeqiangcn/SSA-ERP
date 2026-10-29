// 组织级 app_state 业务状态读取（与 /api/state/[key].ts 同源，org 隔离）。
// 用于把"此前只在客户端维护"的业务状态（如会计期间结账）在服务端复用为强制校验依据，
// 消除"前端改个状态就能绕过管控"的漏洞（缺陷台账 #13）。

/** 读取组织级 app_state 键值（org 隔离）。读不到/异常 → null。 */
export async function getAppStateValue(
  db: any,
  orgId: string,
  key: string
): Promise<string | null> {
  try {
    const row: any = await db
      .prepare('SELECT value FROM app_state WHERE org_id = ? AND key = ?')
      .bind(orgId, key)
      .first();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * 判断指定会计期间（YYYY-MM）是否已结账。
 *
 * ★ V3.46.0 第2批②：权威源从 app_state 迁到关系表 `fin_closing_periods`。
 *
 * 为什么必须迁（对标审计 S-05 / SAP TFASTAT + F.OB52）：
 *   ① app_state 走通用 /api/state/<key> 端点，**任何登录用户都能覆写** ——
 *      覆盖该键即可一键解除全部期间锁定，结账管控形同虚设；
 *   ② 无审计：谁在何时结的账不可追；
 *   ③ 原实现是 **fail-open**（键不存在/解析失败 → 视为未结账），
 *      一次误清缓存或格式损坏，全部期间锁立即失效 —— 而用户以为已结账。
 *      这比"没有管控"更危险：它给出**错误的安全感**。
 *
 * 现在的策略：
 *   · 优先读 fin_closing_periods（有行才作数，status='closed' 判定）；
 *   · 该表**有行但查不到本期** → 视为未结账（正常：期间未结）；
 *   · 该表**完全无行**（组织尚未初始化财务）→ 回退读旧 app_state 键做兼容，
 *     避免切换期把老组织的期间锁全部失效（这是迁移期必须的安全网）；
 *   · 查询异常 → **fail-closed**（按已结账处理，宁可拦住也不能让管控失效）。
 */
export async function isPeriodClosed(
  db: any,
  orgId: string,
  period: string
): Promise<boolean> {
  if (!period) return false;

  // ① 权威源：关系表
  try {
    const row: any = await db
      .prepare('SELECT status FROM fin_closing_periods WHERE org_id = ? AND period = ? LIMIT 1')
      .bind(orgId, period)
      .first();
    if (row) return String(row.status) === 'closed';

    // 该期无行 → 看看这个组织是否已初始化过结账表
    const anyRow: any = await db
      .prepare('SELECT 1 AS x FROM fin_closing_periods WHERE org_id = ? LIMIT 1')
      .bind(orgId)
      .first();
    if (anyRow) return false; // 已初始化、本期未结 → 正常放行
  } catch (e: any) {
    // 表不存在（迁移未应用）或查询异常 → fail-closed，不静默放行
    console.error('[isPeriodClosed] 读取 fin_closing_periods 失败，按已结账处理（fail-closed）：', e?.message || e);
    return true;
  }

  // ② 兼容回退：组织尚未初始化新表时，读旧 app_state 键
  // P1-C 根治 fail-open 后门：这里必须区分两种语义（原实现两者都 return false=放行，
  //   与头部「查询异常 fail-closed」注释自相矛盾）：
  //   · 旧键**从未配置过**（rawOld === null）→ 该组织没有任何结账记录 → 正常放行（无期间被结）；
  //   · 旧键**存在但解析失败** → fail-closed（按已结账处理）。否则「有人配置过结账、
  //     数据却损坏」会把全部期间锁静默解除，给出「以为已结账、其实没锁」的错误安全感。
  const rawOld = await getAppStateValue(db, orgId, 'ssa-erp-finance-ledger');
  if (rawOld === null) return false;
  try {
    const state: any = JSON.parse(rawOld);
    const list: any[] = Array.isArray(state?.closingPeriods) ? state.closingPeriods : [];
    return list.some((c) => c && c.period === period && c.status === 'closed');
  } catch {
    console.error('[isPeriodClosed] 旧结账键存在但解析失败，按已结账处理（fail-closed）');
    return true;
  }
}

/** 从日期/期间字段推导 YYYY-MM（date 为 YYYY-MM-DD 或 YYYY-MM 均可）。 */
export function toPeriod(date?: string, period?: string): string {
  if (period && /^\d{4}-\d{2}$/.test(period)) return period;
  if (date && date.length >= 7) return date.slice(0, 7);
  return '';
}
