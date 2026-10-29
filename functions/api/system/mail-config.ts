// 邮件服务配置与测试发信（仅超级管理员）
//   GET  /api/system/mail-config  读取配置（授权码只回传「是否已设置」，绝不回传明文）
//   PUT  /api/system/mail-config  更新配置（授权码留空表示保持原值不变）
//   POST /api/system/mail-config  向指定邮箱发送一封测试邮件，用于验证通道是否打通
import { getUserFromRequest, json } from '../../_shared/auth';
import { getMailConfig, sendMail, logMail, renderTestEmail } from '../../_shared/mailer';
import { uid } from '../../_shared/auth';
// V3.5.0 B6：补齐写审计（改邮件配置 / 发测试邮件都会影响系统对外通信能力）
import { writeAudit } from '../../_shared/auditLog';

const ALLOWED_SECURE = new Set(['on', 'starttls', 'off']);

async function requireSuperAdmin(context: any) {
  const { request, env } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return { error: json({ error: '未登录' }, 401) };
  if (me.role !== 'super_admin') {
    return { error: json({ error: '仅超级管理员可管理邮件服务配置' }, 403) };
  }
  return { me };
}

export async function onRequestGet(context: any) {
  const { env } = context;
  const guard = await requireSuperAdmin(context);
  if (guard.error) return guard.error;

  const cfg = await getMailConfig(env.DB);
  return json({
    enabled: cfg.enabled,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user,
    fromName: cfg.fromName,
    notifyRecipients: cfg.notifyRecipients,
    hasPassword: !!cfg.pass,
    // V2.97.0 修复（安全审计 D1）：不再回传授权码的任何片段——即便只回传前 2 位，
    //   也属于敏感凭据的部分泄露。前端据 hasPassword 判断「是否已配置」即可
    //   （SecurityCenterTab 对空值显示为「已配置」，无需改动）。
    passwordHint: '',
  });
}

export async function onRequestPut(context: any) {
  const { request, env } = context;
  const guard = await requireSuperAdmin(context);
  if (guard.error) return guard.error;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const updates: Array<[string, string]> = [];
  if (body.enabled !== undefined) {
    updates.push(['mail.enabled', body.enabled ? '1' : '0']);
  }
  if (body.host !== undefined) {
    updates.push(['mail.smtp_host', String(body.host).trim()]);
  }
  if (body.port !== undefined) {
    const port = parseInt(String(body.port), 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      return json({ error: '端口号无效' }, 400);
    }
    updates.push(['mail.smtp_port', String(port)]);
  }
  if (body.secure !== undefined) {
    const s = String(body.secure);
    updates.push(['mail.smtp_secure', ALLOWED_SECURE.has(s) ? s : 'on']);
  }
  if (body.user !== undefined) {
    updates.push(['mail.smtp_user', String(body.user).trim()]);
  }
  // 授权码：留空 = 保持原值（前端回显的是掩码，不能写回数据库）
  if (body.password !== undefined && String(body.password).trim() !== '') {
    updates.push(['mail.smtp_pass', String(body.password).trim()]);
  }
  if (body.fromName !== undefined) {
    updates.push(['mail.from_name', String(body.fromName).trim() || 'SSA ERP 系统通知']);
  }
  if (body.notifyRecipients !== undefined) {
    const list = Array.isArray(body.notifyRecipients)
      ? body.notifyRecipients
      : String(body.notifyRecipients).split(/[,;\s]+/);
    updates.push([
      'mail.notify_recipients',
      list.map((s: any) => String(s).trim()).filter(Boolean).join(','),
    ]);
  }

  if (!updates.length) return json({ error: '没有需要更新的配置项' }, 400);

  const now = new Date().toISOString();
  for (const [key, value] of updates) {
    await env.DB.prepare(
      `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
      .bind(key, value, now)
      .run();
  }

  // B6 审计：改邮件配置会影响「系统还能不能发出通知」——把 host 填错，
  //   全公司的审批通知、密码重置邮件会一起静默失败。因此这一条必须留痕。
  //   注意：授权码明文绝不进审计（审计记录对多个角色可见），只记「是否改过授权码」。
  await writeAudit(env.DB, {
    orgId: (guard.me as any).org_id ?? null,
    actor: { id: (guard.me as any).id, name: (guard.me as any).name || (guard.me as any).username },
    entity: 'system_config',
    entityId: 'mail',
    action: 'update',
    summary:
      `修改邮件服务配置（共 ${updates.length} 项：${updates.map((u) => u[0]).join('、')}）` +
      (updates.some((u) => u[0] === 'mail.smtp_pass') ? '（含授权码变更，值不予记录）' : '') +
      (updates.some((u) => u[0] === 'mail.enabled') ? `（邮件通道：${body.enabled ? '已启用' : '已停用'}）` : ''),
  });

  return json({ ok: true, updated: updates.map((u) => u[0]) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const guard = await requireSuperAdmin(context);
  if (guard.error) return guard.error;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const cfg = await getMailConfig(env.DB);
  const to: string[] = Array.isArray(body.to) && body.to.length
    ? body.to.map((s: any) => String(s).trim()).filter(Boolean)
    : (cfg.notifyRecipients.length ? cfg.notifyRecipients : [cfg.user].filter(Boolean));

  if (!to.length) return json({ error: '请先填写收件邮箱' }, 400);
  if (!cfg.user || !cfg.pass) return json({ error: '请先填写发信账号与授权码' }, 400);

  const tpl = renderTestEmail((guard.me as any).name || (guard.me as any).username || '管理员');
  const res = await sendMail(cfg, { to, subject: tpl.subject, html: tpl.html, timeoutMs: 25000 });

  await logMail(env.DB, {
    id: uid('ml'),
    topic: 'test',
    toAddr: to.join(','),
    subject: tpl.subject,
    status: res.ok ? 'sent' : 'failed',
    error: res.error,
  });

  // B6 审计：测试发信会向真实邮箱投递邮件（可能外发给非公司地址），
  //   属于「以系统名义对外通信」，必须留痕。成功与失败都记 —— 失败的记录
  //   在排查「为什么通知发不出去」时同样有用。
  await writeAudit(env.DB, {
    orgId: (guard.me as any).org_id ?? null,
    actor: { id: (guard.me as any).id, name: (guard.me as any).name || (guard.me as any).username },
    entity: 'system_config',
    entityId: 'mail:test',
    action: 'send',
    summary:
      `发送测试邮件至 ${to.join('、')}：${res.ok ? '发送成功' : `发送失败（${res.error || '未知原因'}）`}`,
  });

  if (!res.ok) return json({ error: '测试邮件发送失败：' + (res.error || '未知原因'), to }, 502);
  return json({ ok: true, to, message: '测试邮件已发送，请到对应邮箱（含垃圾箱）确认' });
}
