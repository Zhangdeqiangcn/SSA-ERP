// POST /api/system/notify — 发送版本升级等重大事件通知邮件（仅超级管理员）
// 请求体：{ version, title, highlights: string[], note?, to?: string[] }
// 收件人：请求体 to 优先；否则取 system_config 的 mail.notify_recipients；
//   再否则退化为「发信账号自己」（即超管绑定的邮箱）。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { getMailConfig, sendMail, logMail, renderNoticeEmail } from '../../_shared/mailer';
// V3.5.0 B6：补齐写审计（向多人广播版本通知，属于以系统名义对外通信）
import { writeAudit } from '../../_shared/auditLog';

export async function onRequestPost(context: any) {
  const { request, env } = context;

  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (me.role !== 'super_admin') {
    return json({ error: '仅超级管理员可发送系统通知' }, 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const version = String(body.version ?? '').trim();
  const title = String(body.title ?? '').trim();
  const highlights: string[] = Array.isArray(body.highlights)
    ? body.highlights.map((h: any) => String(h ?? '').trim()).filter(Boolean)
    : [];
  const note = body.note ? String(body.note) : undefined;

  if (!version) return json({ error: '请填写版本号，例如 V2.96.0' }, 400);
  if (!title) return json({ error: '请填写通知标题' }, 400);

  const cfg = await getMailConfig(env.DB);
  if (!cfg.user || !cfg.pass) {
    return json({ error: '邮件服务尚未配置，请先在下方填写发信账号与授权码' }, 400);
  }

  const to: string[] = Array.isArray(body.to) && body.to.length
    ? body.to.map((s: any) => String(s).trim()).filter(Boolean)
    : (cfg.notifyRecipients.length ? cfg.notifyRecipients : [cfg.user]);

  const tpl = renderNoticeEmail({ version, title, highlights, note });
  const res = await sendMail(cfg, { to, subject: tpl.subject, html: tpl.html, timeoutMs: 25000 });

  await logMail(env.DB, {
    id: uid('ml'),
    topic: 'version_notice',
    toAddr: to.join(','),
    subject: tpl.subject,
    status: res.ok ? 'sent' : 'failed',
    error: res.error,
  });

  // B6 审计：版本通知是「一次性发给多个收件人」的对外广播，误发后无法撤回。
  //   摘要记清 版本号 + 收件人数 + 成败，便于事后核对「谁在什么时候把它发出去了」。
  await writeAudit(env.DB, {
    orgId: (me as any).org_id ?? null,
    actor: { id: (me as any).id, name: (me as any).name || (me as any).username },
    entity: 'system_notify',
    entityId: version,
    action: 'send',
    summary:
      `发送版本通知「${title}」（版本 ${version}）至 ${to.length} 个收件人：` +
      `${res.ok ? '发送成功' : `发送失败（${res.error || '未知原因'}）`}` +
      `（要点 ${highlights.length} 条；收件人：${to.join('、')}）`,
  });

  if (!res.ok) {
    return json({ error: '通知邮件发送失败：' + (res.error || '未知原因'), to }, 502);
  }
  return json({ ok: true, to, subject: tpl.subject, message: '版本通知已发送' });
}

// GET：查看最近的邮件发送记录，便于排查「为什么没收到」
export async function onRequestGet(context: any) {
  const { request, env } = context;

  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (me.role !== 'super_admin') {
    return json({ error: '仅超级管理员可查看邮件发送记录' }, 403);
  }

  const rows = await env.DB.prepare(
    `SELECT id, topic, to_addr, subject, status, error, created_at
     FROM mail_logs ORDER BY created_at DESC LIMIT 30`
  ).all();

  return json({
    data: ((rows.results || []) as any[]).map((r) => ({
      id: r.id,
      topic: r.topic,
      to: r.to_addr,
      subject: r.subject,
      status: r.status,
      error: r.error ?? null,
      createdAt: r.created_at,
    })),
  });
}
