// 打印模板单项端点（C1 数据关系化 · 打印模板域）
// GET    /api/print-templates/:id    取单条（含图片还原）
// PUT    /api/print-templates/:id    更新（只改传入字段；传 config 则整份替换并重建资源）
// DELETE /api/print-templates/:id    删除（连带清理图片资源）
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition, RLS_PRIVILEGED } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';
import { chunkStatements, loadAssets, pickTemplate, rowToApi } from './index';

export async function onRequestGet(context: any) {
  const { env, request, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const id = params.id;

  // ★ rlsCondition 返回 { clause, params }，取 .clause 拼 SQL、params 补 bind
  const rls = rlsCondition(user, 'print_templates');
  const row = await env.DB.prepare(
    `SELECT * FROM print_templates WHERE id = ? AND ${rls.clause}`
  )
    .bind(id, ...rls.params)
    .first();
  if (!row) return json({ error: '模板不存在或无权查看' }, 404);

  const assetMap = await loadAssets(env.DB, [id]);

  // 资源计数 = assetMap.size（loadAssets 的 Map 值只有 {mime, base64}，没有 id 字段）
  return json({
    success: true,
    template: rowToApi(row, assetMap),
    assets: assetMap.size,
  });
}

export async function onRequestPut(context: any) {
  const { env, request, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // P0 修复：PUT 同样加角色门槛，仅管理员可改模板（与下方资源归属校验并存）
  if (!RLS_PRIVILEGED.has(user.role)) {
    return json({ error: '权限不足：仅管理员可管理打印模板' }, 403);
  }
  const id = params.id;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求体不是合法 JSON' }, 400);
  }

  const existingRls = rlsCondition(user, 'print_templates');
  const existing: any = await env.DB.prepare(
    `SELECT * FROM print_templates WHERE id = ? AND ${existingRls.clause}`
  )
    .bind(id, ...existingRls.params)
    .first();
  if (!existing) return json({ error: '模板不存在或无权修改' }, 404);

  const now = new Date().toISOString();
  const { cols, assets } = pickTemplate(body, id);

  // 关键判断：正文相关字段被改动时才重建图片资源。
  // 只改模板名称/纸张时若也重建资源，会把图片读出来再写回去（白白搬运 200 KB）。
  const touchesContent =
    body.headerConfig !== undefined || body.footerConfig !== undefined;

  const stmts: any[] = [];
  const setCols = Object.keys(cols);
  if (setCols.length > 0) {
    stmts.push(
      env.DB.prepare(
        `UPDATE print_templates SET ${setCols.map((c) => `${c}=?`).join(',')}, updated_at=? WHERE id=?`
      ).bind(...[...Object.values(cols), now, id])
    );
  } else {
    stmts.push(
      env.DB.prepare('UPDATE print_templates SET updated_at=? WHERE id=?').bind(now, id)
    );
  }

  if (touchesContent) {
    // 先清分片再清资源（外键约束下顺序不能反）
    stmts.push(
      env.DB.prepare(
        'DELETE FROM print_template_asset_chunks WHERE asset_id IN (SELECT id FROM print_template_assets WHERE template_id = ?)'
      ).bind(id)
    );
    stmts.push(env.DB.prepare('DELETE FROM print_template_assets WHERE template_id = ?').bind(id));
    for (const a of assets) {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO print_template_assets
           (id, template_id, kind, mime, file_name, byte_size, content_hash, placeholder, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`
        ).bind(a.id, id, 'image', a.mime, null, a.bytes.length, a.hash, `{{asset:${a.id}}}`, now)
      );
      stmts.push(...chunkStatements(env.DB, a.id, a.bytes));
    }
  }

  await env.DB.batch(stmts);

  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'print_templates',
    action: 'update',
    entityId: id,
    summary: `修改打印模板「${body.name ?? existing.name}」${touchesContent ? `（正文变更，图片资源重建 ${assets.length} 个）` : '（仅属性变更，未触图片）'}`,
  });

  const row = await env.DB.prepare('SELECT * FROM print_templates WHERE id = ?').bind(id).first();
  const assetMap = await loadAssets(env.DB, [id]);
  return json({ success: true, template: rowToApi(row, assetMap) });
}

export async function onRequestDelete(context: any) {
  const { env, request, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // P0 修复：DELETE 同样加角色门槛，仅管理员可删模板（与下方资源归属校验并存）
  if (!RLS_PRIVILEGED.has(user.role)) {
    return json({ error: '权限不足：仅管理员可管理打印模板' }, 403);
  }
  const id = params.id;

  const delRls = rlsCondition(user, 'print_templates');
  const row: any = await env.DB.prepare(
    `SELECT * FROM print_templates WHERE id = ? AND ${delRls.clause}`
  )
    .bind(id, ...delRls.params)
    .first();
  if (!row) return json({ error: '模板不存在或无权删除' }, 404);

  // 数一下要连带清掉多少图片资源，写进审计摘要（删了多少是有意义的）
  const cnt: any = await env.DB.prepare(
    'SELECT COUNT(*) AS n, COALESCE(SUM(byte_size),0) AS bytes FROM print_template_assets WHERE template_id = ?'
  )
    .bind(id)
    .first();

  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM print_template_asset_chunks WHERE asset_id IN (SELECT id FROM print_template_assets WHERE template_id = ?)'
    ).bind(id),
    env.DB.prepare('DELETE FROM print_template_assets WHERE template_id = ?').bind(id),
    env.DB.prepare('DELETE FROM print_templates WHERE id = ?').bind(id),
  ]);

  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'print_templates',
    action: 'delete',
    entityId: id,
    summary: `删除打印模板「${row.name}」（适用于 ${row.entity}），连带清理图片资源 ${
      cnt?.n ?? 0
    } 个、释放 ${((cnt?.bytes ?? 0) / 1024).toFixed(1)} KB`,
  });

  return json({ success: true, deletedAssets: cnt?.n ?? 0, freedBytes: cnt?.bytes ?? 0 });
}
