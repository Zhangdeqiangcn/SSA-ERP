// POST /api/system/restore — 由备份文件恢复本组织业务数据
//
// 安全约束（逐条对应评测发现的隐患）：
//   1. 仅管理员可执行；
//   2. 备份包的组织编号必须与当前登录者一致，否则拒绝 —— 防止把 A 公司数据灌进 B 公司；
//   3. 写入前强制把每一行的 org_id 改写为当前组织，即便文件被篡改也不会越界；
//   4. 列名以数据库真实结构为准做交集过滤，文件里的未知列直接丢弃 —— 防注入与脏列；
//   5. 先提供 dry-run 预演，确认行数与冲突后再真正写入，避免「一恢复就覆盖」。
//
// body: { payload: <备份JSON>, mode: 'dry-run' | 'merge' | 'replace', tables?: string[] }
//   merge   —— 按主键覆盖写入，已存在则替换，不存在则新增（推荐，风险最低）
//   replace —— 先清空本组织该表全部数据再写入（危险，仅用于整体回滚）
import { getUserFromRequest, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { writeAudit } from '../../_shared/auditLog';
import { discoverTables, tableColumns, assertSafeTable, ORG_TABLE } from '../../_shared/backupSchema';

const MAX_ROWS = 50000;   // 单次恢复行数上限，防止超大请求打爆数据库
const BATCH = 40;         // 每批提交条数

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!['super_admin', 'admin'].includes(user.role)) {
    return json({ error: '需管理员权限' }, 403);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const payload = body.payload;
    const mode = body.mode || 'dry-run';

    if (!payload || typeof payload !== 'object') {
      return json({ error: '请提供备份文件内容（payload）' }, 400);
    }
    if (payload.schema !== 'ssa-erp-d1-backup') {
      return json({ error: '不是有效的备份文件（schema 标识不匹配）' }, 400);
    }
    if (!['dry-run', 'merge', 'replace'].includes(mode)) {
      return json({ error: '恢复模式只能是 dry-run / merge / replace' }, 400);
    }
    // 归属校验：只允许恢复本组织的数据
    if (payload.orgId && payload.orgId !== user.org_id) {
      return json({ error: '备份文件属于其它组织，不能在本组织恢复' }, 400);
    }

    const { parents, children } = await discoverTables(env);
    const childDefs = new Map(children.map((c) => [c.table, c]));

    const entries = Object.entries(payload.tables || {}).filter(([t]) =>
      assertSafeTable(t, parents, children)
    );
    if (!entries.length) return json({ error: '备份文件中没有可恢复的数据表' }, 400);

    // 指定表时只恢复这些表
    const only: string[] | null = Array.isArray(body.tables) && body.tables.length
      ? body.tables.filter((t: string) => assertSafeTable(t, parents, children))
      : null;

    const report: any[] = [];
    let totalPlanned = 0;

    for (const [table, pack] of entries) {
      if (only && !only.includes(table)) continue;
      const rows: any[] = (pack && Array.isArray((pack as any).data)) ? (pack as any).data : [];
      if (!rows.length) { report.push({ table, planned: 0, skipped: 0, note: '空表，跳过' }); continue; }

      // 列名取「文件列 ∩ 数据库真实列」，未知列丢弃
      const realCols = await tableColumns(env, table);
      const hasOrg = realCols.includes('org_id');
      const cols = realCols.filter((c) => rows.some((r) => r && r[c] !== undefined));

      // 明细表不写 org_id（结构上就没有），主表强制写当前组织
      const writeCols = hasOrg ? (cols.includes('org_id') ? cols : [...cols, 'org_id']) : cols;
      if (!writeCols.includes('id')) {
        report.push({ table, planned: 0, skipped: rows.length, note: '缺主键 id，整表跳过' });
        continue;
      }

      let planned = 0;
      let skipped = 0;
      const stmts: any[] = [];
      const push = async (force: boolean) => {
        if (!stmts.length) return;
        if (mode !== 'dry-run' || force) await env.DB.batch(stmts);
        stmts.length = 0;
      };

      for (const r of rows) {
        if (!r || typeof r !== 'object' || !r.id) { skipped++; continue; }
        if (totalPlanned + planned >= MAX_ROWS) { skipped++; continue; }
        const vals = writeCols.map((c) => {
          if (c === 'org_id') return user.org_id;     // 强制归属，即便文件被改过
          const v = r[c];
          if (v !== null && typeof v === 'object') return JSON.stringify(v);
          return v === undefined ? null : v;
        });
        const ph = writeCols.map(() => '?').join(',');
        stmts.push(
          env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${writeCols.join(',')}) VALUES (${ph})`).bind(...vals)
        );
        planned++;
        if (stmts.length >= BATCH) await push(false);
      }

      if (mode === 'replace' && hasOrg && table !== ORG_TABLE && planned > 0) {
        await env.DB.prepare(`DELETE FROM ${table} WHERE org_id = ?`).bind(user.org_id).run();
      }
      await push(false);

      totalPlanned += planned;
      const isChild = childDefs.has(table);
      report.push({
        table,
        planned,
        skipped,
        written: mode === 'dry-run' ? 0 : planned,
        kind: isChild ? '明细表' : '主表',
      });
    }

    // 审计：恢复是高风险操作，必须留痕
    // V3.3.0（评测 L-05）：原先直插且不带 try/catch —— 一旦审计写入失败，
    //   数据其实已经写进去了，接口却因为审计异常返回 500，操作者会误以为恢复未执行
    //   而重复执行，属于「状态与反馈不一致」。改走 writeAudit 后，审计失败只降级留痕，
    //   不会让一个已完成的恢复动作在界面上表现为失败。
    if (mode !== 'dry-run') {
      await writeAudit(env.DB, {
        orgId: user.org_id,
        actor: { id: user.id, name: user.name || user.username || null },
        entity: 'system',
        action: 'restore',
        entityId: user.org_id,
        summary: `执行数据恢复（模式=${mode}），共写入 ${totalPlanned} 行`,
      });
    }

    return json({
      ok: true,
      mode,
      orgId: user.org_id,
      restoredAt: mode === 'dry-run' ? null : new Date().toISOString(),
      totalPlanned,
      report,
      message: mode === 'dry-run'
        ? `预演完成：将写入 ${totalPlanned} 行，未改动任何数据。确认无误后以 merge 模式执行。`
        : `恢复完成：已写入 ${totalPlanned} 行。`,
    });
  } catch (e: any) {
    return errorResponse(e, '数据恢复');
  }
}
