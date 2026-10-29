// POST /api/audit/logs — 写入审计日志（含 diff）
//
// V3.3.0（评测 L-05 整改）：本接口原先自行拼 INSERT + 自行 try/catch，
//   失败后既无降级记录也无告警（且失败会让整个请求 500）。现统一走
//   `_shared/auditLog.writeAudit`：审计失败时降级留痕（降级表 + 结构化日志），
//   接口本身不再因审计问题失败，并通过 `degraded` 字段如实告知调用方。
import { getUserFromRequest, json } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';
import { onRequestGet as listAuditLogs } from './index';

// GET /api/audit/logs — 读取审计日志（V3.15.10 补齐）
//
// 背景：本文件历史上只有 POST（写入）处理器，没有 GET。而前端两处都在用 GET 拉数据：
//   · src/pages/Settings/ServerAuditTab.tsx:60 → GET /api/audit/logs?pageSize=200
//   · src/stores/auditStore.ts:107           → POST /api/audit/logs（写入，正常工作）
// 缺少 GET 处理器时，请求会落到 Pages 的静态资源回退，返回的是**首页 HTML 而不是 JSON**，
// 前端 `resp.json()` 解析失败并被 try/catch 静默吞掉 —— 表现就是「设置 → 服务端审计日志」
// 页面永远显示本地审计、看不到服务端真实落库的记录，且不报任何错。
//
// 修法：直接复用 /api/audit 的 GET 实现（同一套组织隔离 + 按角色收敛可见范围），
// 不另写一份查询逻辑，避免两处口径日后分叉。
export { listAuditLogs as onRequestGet };

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));

  const { entity, entityId, action, summary, diff } = body;
  if (!action || !entity) return json({ error: '缺少 action 或 entity' }, 400);

  const res = await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity,
    action,
    entityId: entityId || null,
    summary: summary || '',
    diff,
  });

  // 只保留最近 10000 条
  // 清理失败仅影响「历史条数上限」，与本次审计是否写入成功无关，故单独兜住，
  // 不让它反过来把一次成功的审计写变成接口失败。
  try {
    await db.prepare(
      `DELETE FROM audit_logs WHERE rowid NOT IN (SELECT rowid FROM audit_logs WHERE org_id = ? ORDER BY created_at DESC LIMIT 10000)`
    ).bind(user.org_id).run();
  } catch {
    /* 清理失败可忽略：下一次写入会再尝试 */
  }

  // 返回契约（V3.3.0 保持兼容）：`success` 表示「本次审计请求已处理完毕」，
  // `id` 为主审计记录 id（走降级通道时为 null），`degraded` 如实告知是否走了降级留痕。
  // 刻意保留 success:true —— 审计失败不再让本接口失败（业务连续性优先），
  // 但绝不再「假装写了」：id 为 null 与 degraded:true 同时给出，调用方可据此告警。
  return json({ success: true, id: res.id, degraded: res.degraded });
}
