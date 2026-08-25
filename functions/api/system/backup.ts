// GET /api/system/backup — 导出当前组织的 D1 业务数据（回滚点）
// 作用域：仅导出请求者所属组织（org_id），天然隔离其他组织数据。
// 仅要求已登录；导出内容含 app_state（业务 JSON blob）+ 组织元信息 + 时间戳。
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  try {
    const org = await env.DB.prepare('SELECT id, name, company_code, created_at FROM orgs WHERE id = ?')
      .bind(user.org_id)
      .first();

    const rows = await env.DB.prepare(
      'SELECT key, value, updated_at FROM app_state WHERE org_id = ? ORDER BY key'
    )
      .bind(user.org_id)
      .all();

    const state: Record<string, any> = {};
    (rows.results || []).forEach((r: any) => {
      state[r.key] = r.value;
    });

    const payload = {
      schema: 'ssa-erp-d1-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      org: org || { id: user.org_id },
      state,
      counts: {
        tables: Object.keys(state).length,
      },
    };

    return json(payload);
  } catch (e: any) {
    return json({ error: '备份导出失败: ' + (e?.message || 'unknown') }, 500);
  }
}
