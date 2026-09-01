// POST /api/fx/refresh — 从免费源 exchangerate.host 拉取汇率（无需 key）
import { getUserFromRequest, json, uid } from '../../_shared/auth';

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let base = 'CNY';
  try { base = (await context.request.json())?.base || 'CNY'; } catch { /* 默认 CNY */ }

  try {
    const resp = await fetch(`https://api.exchangerate.host/latest?base=${base}`);
    const j = await resp.json();
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
    return json({ ok: true, base, count: quotes.length });
  } catch (e: any) {
    return json({ error: '刷新失败: ' + (e?.message || '未知错误') }, 500);
  }
}
