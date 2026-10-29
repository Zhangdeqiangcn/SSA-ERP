// 大对象键体积报表（A5 · 管理端可观测性）
//
// 为什么需要这个端点：A5 的守护只解决「爆掉时明确报错」，
// 但真正有价值的是**提前几周知道哪个域要爆**。这个端点把 app_state_metrics
// 表（迁移 0049）里的体积指标读出来，按接近危险线的程度排序返回。
//
// 权限：仅管理员（super_admin / admin）可读 —— 键名本身会暴露组织的数据结构，
//   且体积排行属于容量运维信息，不适合全员可见。
import { getUserFromRequest, json } from '../../_shared/auth';
import { isRlsPrivileged } from '../../_shared/rls';
import { SOFT_LIMIT_BYTES, HARD_LIMIT_BYTES, humanBytes } from '../../_shared/stateSizeGuard';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isRlsPrivileged(user.role)) {
    return json({ error: '数据容量报表仅管理员可见' }, 403);
  }

  let rows: any[] = [];
  try {
    const res = await env.DB.prepare(
      `SELECT key, bytes, peak_bytes, writes, updated_at
       FROM app_state_metrics
       WHERE org_id = ?
       ORDER BY bytes DESC
       LIMIT 200`
    )
      .bind(user.org_id)
      .all();
    rows = res?.results ?? [];
  } catch {
    // 迁移未执行（指标表不存在）→ 返回空清单而不是报错，
    // 前端据此提示「尚未采集到数据」，比抛 500 更有用
    return json({
      ok: true,
      available: false,
      softLimit: SOFT_LIMIT_BYTES,
      hardLimit: HARD_LIMIT_BYTES,
      items: [],
      message: '体积指标尚未采集（迁移 0049 未执行或本组织尚无业务写入）',
    });
  }

  const items = rows.map((r) => {
    const bytes = Number(r.bytes) || 0;
    const peak = Number(r.peak_bytes) || 0;
    const level: 'ok' | 'warn' | 'reject' =
      bytes > HARD_LIMIT_BYTES ? 'reject' : bytes > SOFT_LIMIT_BYTES ? 'warn' : 'ok';
    return {
      key: r.key,
      bytes,
      human: humanBytes(bytes),
      peakBytes: peak,
      peakHuman: humanBytes(peak),
      writes: Number(r.writes) || 0,
      updatedAt: r.updated_at || null,
      level,
      // 占硬阈值百分比：管理端一眼看出「离爆还有多远」
      usagePct: Math.round((bytes / HARD_LIMIT_BYTES) * 1000) / 10,
      // 增长信号：峰值显著高于当前值，说明该域波动大（例如做过批量导入）
      peakRatio: bytes > 0 ? Math.round((peak / bytes) * 100) / 100 : 0,
    };
  });

  const warnCount = items.filter((i) => i.level !== 'ok').length;
  const totalBytes = items.reduce((s, i) => s + i.bytes, 0);

  return json({
    ok: true,
    available: true,
    softLimit: SOFT_LIMIT_BYTES,
    hardLimit: HARD_LIMIT_BYTES,
    softLimitHuman: humanBytes(SOFT_LIMIT_BYTES),
    hardLimitHuman: humanBytes(HARD_LIMIT_BYTES),
    totalBytes,
    totalHuman: humanBytes(totalBytes),
    keyCount: items.length,
    warnCount,
    items,
  });
}
