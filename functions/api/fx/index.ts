// GET/POST /api/fx — 汇率查询与手动维护（内部 session 鉴权）
import { getUserFromRequest, json, uid } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const url = new URL(context.request.url);
  const base = url.searchParams.get('base') || 'CNY';
  const rows = await context.env.DB.prepare(
    'SELECT * FROM fx_rates WHERE org_id = ? AND base_currency = ? ORDER BY quote_currency'
  ).bind(user.org_id, base).all();
  return json({
    data: (rows.results || []).map((r: any) => ({
      id: r.id, base: r.base_currency, quote: r.quote_currency,
      rate: r.rate, source: r.source, updatedAt: r.updated_at,
    })),
  });
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const body = await context.request.json().catch(() => ({}));
  const base = body.base || 'CNY';
  const quote = body.quote;
  const rate = Number(body.rate);
  if (!quote || !rate) return json({ error: 'quote 与 rate 必填' }, 400);

  const now = new Date().toISOString();
  await context.env.DB.prepare(`
    INSERT INTO fx_rates (id, org_id, base_currency, quote_currency, rate, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(org_id, base_currency, quote_currency)
    DO UPDATE SET rate = excluded.rate, source = excluded.source, updated_at = excluded.updated_at
  `).bind(uid('fx'), user.org_id, base, quote, rate, 'manual', now).run();
  return json({ ok: true });
}
