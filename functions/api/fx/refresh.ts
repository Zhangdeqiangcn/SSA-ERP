// POST /api/fx/refresh — 从免费源 exchangerate.host 拉取汇率（无需 key）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
// V3.5.0 B6：补齐写审计（一次刷新会批量改写全部币种汇率）
import { writeAudit } from '../../_shared/auditLog';
// ★ V3.49.0 R6：汇率刷新属财务写操作，补操作权限守卫（此前零写守卫，只读角色可批量改全组织汇率）
import { guardOperation } from '../../_shared/operationGuard';

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // ★ V3.49.0 R6 越权写根治：一次刷新会 ON CONFLICT 覆盖该基准币种下的**全部**报价币种，
  //   影响面远大于手工改一个币种对。原端点在此之前无任何写守卫 → 只读角色
  //   （user / rd_engineer / logistics…）也能批量改写全组织汇率（越权写）。
  //   挂 finance 模块的 update 守卫：财务主管/会计与特权角色照常刷新，只读角色 403。
  const _opGuard = await guardOperation(user, 'finance', 'update', context.env.DB, user.org_id);
  if (_opGuard) return _opGuard;

  let base = 'CNY';
  try { base = (await context.request.json())?.base || 'CNY'; } catch { /* 默认 CNY */ }

  try {
    const resp = await fetch(`https://api.exchangerate.host/latest?base=${base}`);
    const j: any = await resp.json();
    if (!j || !j.rates) return json({ error: '外部汇率源不可用' }, 502);

    const now = new Date().toISOString();
    const quotes = Object.keys(j.rates);
    for (const q of quotes) {
      await context.env.DB.prepare(`
        INSERT INTO fx_rates (id, org_id, base_currency, quote_currency, rate, source, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(org_id, base_currency, quote_currency)
        DO UPDATE SET rate = excluded.rate, source = excluded.source, updated_at = excluded.updated_at
      `).bind(uid('fx'), user.org_id, base, q, j.rates[q], 'exchangerate.host', now).run();
    }
    // B6 审计：一次刷新会**批量覆盖**该基准币种下的全部报价币种 —— 影响面远大于
    //   手工改一个币种对。摘要记「基准币种 + 覆盖币种数 + 来源」，用于事后区分
    //   「汇率是市场同步来的」还是「被人手工改过」（手工改的那条审计里会写「手工维护」）。
    await writeAudit(context.env.DB, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name || user.username },
      entity: 'fx_rates',
      entityId: base,
      action: 'refresh',
      summary:
        `从外部汇率源批量刷新汇率：基准 ${base}，覆盖 ${quotes.length} 个报价币种` +
        '（来源：exchangerate.host 自动同步）',
    });

    return json({ ok: true, base, count: quotes.length });
  } catch (e: any) {
    return errorResponse(e, '刷新');
  }
}
