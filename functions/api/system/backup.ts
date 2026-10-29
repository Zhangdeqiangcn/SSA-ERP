// GET /api/system/backup — 导出当前组织的真实业务数据（可用于恢复）
//
// V3.0.0 重建说明：
//   旧版只导出 app_state 的键值（前端状态快照），业务表一行都不含，
//   且系统内没有任何导入通道 —— 等于「有备份、无恢复」。本次重写为
//   「主表按 org_id 导出 + 明细表跟随父单导出」，并配套 /api/system/restore。
//
// 用法：
//   GET /api/system/backup                       导出全部业务表
//   GET /api/system/backup?mode=manifest         仅返回各表行数清单（不取数据，很快）
//   GET /api/system/backup?tables=customers,vendors
//                                                只导出指定表（大数据量时分批拉取）
//   GET /api/system/backup?limit=2000&offset=0   分页控制
import { getUserFromRequest, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { writeAudit } from '../../_shared/auditLog';
import { discoverTables, assertSafeTable, ORG_TABLE } from '../../_shared/backupSchema';

const MAX_LIMIT = 20000;
const DEFAULT_LIMIT = 5000;

function clampInt(raw: string | null, def: number, max: number): number {
  const n = parseInt(raw || '', 10);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  // 备份含本组织全部业务数据，属高敏感操作：仅管理员及以上
  if (!['super_admin', 'admin'].includes(user.role)) {
    return json({ error: '需管理员权限' }, 403);
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'data';
    const onlyRaw = url.searchParams.get('tables') || '';
    const limit = clampInt(url.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);

    const { parents, children } = await discoverTables(env);
    // 外部传入的表名必须落在可信清单内，其余一律丢弃
    const requested = onlyRaw
      ? onlyRaw.split(',').map((s) => s.trim()).filter((t) => assertSafeTable(t, parents, children))
      : null;

    // ---- 模式一：清单（只数行，不取数据）----
    // ★ V3.52.0 备份超时分批/异步专项：旧实现逐表串行 COUNT（主表 N 次 + 子表 M 次 D1 往返），
    //   生产库负载高时累计超 D1 单请求 30s → 间歇性 30s 超时/500。
    //   现改为把全部 COUNT 语句按 99 条/片收进 db.batch（1 片 = 1 次网络往返），
    //   计数结果按「语句序号」回填；单条 COUNT 失败时该表按 0 处理并记入 note（清单可用性优先，
    //   不把一张表的计数失败放大成整个端点 500）。
    if (mode === 'manifest') {
      const countStmts: { key: string; stmt: any }[] = [];
      for (const t of parents) {
        if (requested && !requested.includes(t) && t !== ORG_TABLE) continue;
        if (t === ORG_TABLE) {
          // 组织主记录按 id 精确计数（与 data 模式同口径）
          countStmts.push({
            key: t,
            stmt: env.DB.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE id = ?`).bind(user.org_id),
          });
        } else {
          countStmts.push({
            key: t,
            stmt: env.DB.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE org_id = ?`).bind(user.org_id),
          });
        }
      }
      for (const c of children) {
        if (requested && !requested.includes(c.table)) continue;
        countStmts.push({
          key: c.table,
          stmt: env.DB.prepare(
            `SELECT COUNT(*) AS c FROM ${c.table} WHERE ${c.fk} IN (SELECT id FROM ${c.parent} WHERE org_id = ?)`
          ).bind(user.org_id),
        });
      }
      const manifest: Record<string, number> = {};
      const failedTables: string[] = [];
      const CHUNK = 99; // D1 单 batch 语句上限
      for (let i = 0; i < countStmts.length; i += CHUNK) {
        const slice = countStmts.slice(i, i + CHUNK);
        let results: any[] = [];
        let allOk = true;
        try {
          results = await env.DB.batch(slice.map((j) => j.stmt));
        } catch (_e) {
          // 整片 batch 失败（D1 不允许 batch 内部分失败、要么全成要么全失败）：
          // 退回逐条执行这一片，让能成的计数尽量落地、把失败隔离到单表
          allOk = false;
          for (const j of slice) {
            try {
              const r = await j.stmt.first();
              manifest[j.key] = (r as any)?.c || 0;
            } catch (_e2) {
              manifest[j.key] = 0;
              failedTables.push(j.key);
            }
          }
        }
        if (allOk) {
          slice.forEach((j, idx) => {
            const r = results[idx];
            manifest[j.key] = (r?.results?.[0]?.c as number) || 0;
          });
        }
      }
      return json({
        schema: 'ssa-erp-d1-backup',
        version: 2,
        mode: 'manifest',
        orgId: user.org_id,
        tables: manifest,
        totalRows: Object.values(manifest).reduce((a, b) => a + b, 0),
        // 计数失败（单表异常）时按 0 记入的表名单列于此，供调用方区分「空表」与「计数失败」
        ...(failedTables.length ? { countErrors: failedTables } : {}),
        note: '行数为当前库实际值；导出默认每表 5000 行，超出请用 tables/limit/offset 分批' +
          (failedTables.length ? `；以下表计数失败已按 0 记入：${failedTables.join(', ')}` : ''),
      });
    }

    // ---- 模式二：导出数据 ----
    const tables: Record<string, any> = {};
    let totalRows = 0;
    const truncated: string[] = [];

    const wantParent = (t: string) => !requested || requested.includes(t) || t === ORG_TABLE;
    const wantChild = (t: string) => !requested || requested.includes(t);

    // 组织主记录（恢复时用于校验归属，防止把别的组织数据灌进来）
    if (wantParent(ORG_TABLE)) {
      const org = await env.DB.prepare(`SELECT * FROM ${ORG_TABLE} WHERE id = ?`)
        .bind(user.org_id).first();
      if (org) { tables[ORG_TABLE] = { rows: 1, data: [org] }; totalRows += 1; }
    }

    // 主表：按组织隔离
    for (const t of parents) {
      if (!wantParent(t)) continue;
      const res = await env.DB.prepare(
        `SELECT * FROM ${t} WHERE org_id = ? LIMIT ? OFFSET ?`
      ).bind(user.org_id, limit + 1, offset).all();
      const all = res.results || [];
      const data = all.slice(0, limit);
      tables[t] = { rows: data.length, data };
      totalRows += data.length;
      if (all.length > limit) truncated.push(t);
    }

    // 明细表：跟随本组织的父单
    for (const c of children) {
      if (!wantChild(c.table)) continue;
      const res = await env.DB.prepare(
        `SELECT * FROM ${c.table} WHERE ${c.fk} IN (SELECT id FROM ${c.parent} WHERE org_id = ?) LIMIT ? OFFSET ?`
      ).bind(user.org_id, limit + 1, offset).all();
      const all = res.results || [];
      const data = all.slice(0, limit);
      tables[c.table] = { rows: data.length, parent: c.parent, fk: c.fk, data };
      totalRows += data.length;
      if (all.length > limit) truncated.push(c.table);
    }

    // 导出留痕（V3.15.10）：数据导出是敏感动作，必须落审计。
    // 此前本端点全程无 writeAudit，谁在什么时候导走了多少数据，在审计日志里查不到。
    // 注意：留痕失败不能阻断导出本身（writeAudit 内部自带三层降级、不抛出）。
    await writeAudit(env.DB, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name || user.username },
      entity: 'system_backup',
      action: 'export',
      summary: `导出组织数据备份：${Object.keys(tables).length} 张表 / ${totalRows} 行${
        truncated.length ? `（被截断：${truncated.join(',')}）` : ''
      }`,
    });

    return json({
      schema: 'ssa-erp-d1-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      exportedBy: user.name || user.username,
      orgId: user.org_id,
      range: { limit, offset },
      tables,
      counts: { tables: Object.keys(tables).length, rows: totalRows, truncated },
      // 明确告诉使用方这份备份能不能直接用于恢复
      restorable: totalRows > 0,
      hint: truncated.length
        ? `以下表超过单次上限被截断，完整备份请按表分批导出：${truncated.join(', ')}`
        : '本文件可交由 /api/system/restore 恢复',
    });
  } catch (e: any) {
    return errorResponse(e, '备份导出');
  }
}
