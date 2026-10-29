// GET/POST /api/fx — 汇率查询与手动维护（内部 session 鉴权）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
// V3.5.0 B6：补齐写审计（手工改汇率会直接改变外币单价的折算结果）
import { writeAudit } from '../../_shared/auditLog';
import { requireByRegistry } from '../../_shared/validate';

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
  // ★ V3.87.0 扩面：收口到集中必填登记表（表名 fx_rates）
  const _reqCore = requireByRegistry('fx_rates', body);
  if (_reqCore) return _reqCore;

  const now = new Date().toISOString();
  // 审计需要一个「改之前是多少」的对照值，否则只记新值无法判断这次改动的影响幅度。
  const before: any = await context.env.DB.prepare(
    'SELECT rate FROM fx_rates WHERE org_id = ? AND base_currency = ? AND quote_currency = ?'
  ).bind(user.org_id, base, quote).first();

  await context.env.DB.prepare(`
    INSERT INTO fx_rates (id, org_id, base_currency, quote_currency, rate, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(org_id, base_currency, quote_currency)
    DO UPDATE SET rate = excluded.rate, source = excluded.source, updated_at = excluded.updated_at
  `).bind(uid('fx'), user.org_id, base, quote, rate, 'manual', now).run();

  // B6 审计：汇率是「价格换算的公共乘数」——一处改动会同时影响所有以该币种计价的
  //   单据金额。摘要必须写清「币种对 + 旧值 → 新值 + 幅度」，因为事后核查异常报价时，
  //   第一个要排除的就是「是不是汇率被人改过」。
  const oldRate = before?.rate == null ? null : Number(before.rate);
  await writeAudit(context.env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'fx_rates',
    entityId: `${base}/${quote}`,
    action: 'update',
    summary:
      `手工设置汇率 ${base} → ${quote}：` +
      (oldRate === null ? `新建为 ${rate}` : `${oldRate} → ${rate}`) +
      (oldRate && oldRate !== rate
        ? `（变动 ${(((rate - oldRate) / oldRate) * 100).toFixed(2)}%）`
        : '') +
      '（来源：手工维护，非市场行情自动同步）',
  });

  return json({ ok: true });
}
