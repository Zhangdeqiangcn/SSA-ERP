// 审计与行级策略健康度接口（V3.3.0 · 评测 L-04 / L-05 整改）
//
//   GET /api/system/audit-health   管理员只读：审计写入降级情况 + 行级策略登记情况
//
// 为什么需要这个接口：
//   L-05 的原状是「审计失败被静默吞掉」——系统看上去一切正常，因为失败不产生任何痕迹。
//   只把失败记下来还不够，必须有一个**人能看见的入口**，否则等于换个地方静默。
//   同样地，L-04 的「未登记表被默认拒绝」也需要能被看见，否则表现为「有张表突然查不出数据」
//   而无人知道原因。
//
// 权限：仅 super_admin / admin。降级记录里含实体名、摘要与执行者，属于管理侧信息。
import { getUserFromRequest, json } from '../../_shared/auth';
import { auditHealth } from '../../_shared/auditLog';
import { rlsRegistryReport, findUnclassifiedTables, findPlatformTables, findStaleRegistryEntries } from '../../_shared/rls';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    return json({ error: '需要管理员权限' }, 403);
  }

  // 审计降级统计：super_admin 看全平台，组织管理员看本组织
  const scopeOrg = user.role === 'super_admin' ? null : user.org_id;

  let audit: any;
  try {
    audit = await auditHealth(env.DB, scopeOrg, 20);
  } catch (e: any) {
    // 降级表本身读不出来（例如迁移尚未在该库执行）时，不要把管理页整块打挂，
    // 而是如实回报「无法读取」，避免又变成一处静默。
    audit = {
      total: null,
      last24h: null,
      recent: [],
      unavailable: true,
      error: String(e?.message || e || '未知错误'),
    };
  }

  // 用真实数据库表清单核对「行级策略是否全量登记」——L-04 的机器校验闭环。
  //   拿 sqlite_master 里的真实表逐个比对登记表，任何一张既未登记、也未豁免的表都会被列出。
  //   查不到时如实回报 unavailable，而不是假装「0 张未登记」。
  let unclassified: string[] = [];
  let platformTables: string[] = [];
  let staleEntries: string[] = [];
  let tableCount: number | null = null;
  let unclassifiedUnavailable: any = null;
  try {
    const info: any = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
    ).all();
    const all = (info?.results || []).map((r: any) => r.name).filter(Boolean);
    tableCount = all.length;
    unclassified = findUnclassifiedTables(all);
    platformTables = findPlatformTables(all);
    // 「僵尸登记」：登记在案但库里不存在。与漏登记同样如实回报——
    // 一份含不存在条目的权限清单无法再作为审计依据，必须显式修掉。
    staleEntries = findStaleRegistryEntries(all);
  } catch (e: any) {
    unclassifiedUnavailable = String(e?.message || e || '未知错误');
  }

  return json({
    audit,
    rls: {
      ...rlsRegistryReport(),
      tableCount,
      unclassified,
      platformTables,
      staleEntries,
      unclassifiedUnavailable,
    },
    scopeText: { super_admin: '全平台', admin: '本组织' }[user.role as string] || '本组织',
  });
}
