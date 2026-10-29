// 云端邮件发送模块（零第三方依赖）
// 运行环境：Cloudflare Pages Functions（wrangler.toml 已启用 nodejs_compat）
//
// 实现思路：用 cloudflare:sockets 的 connect() 与邮件服务器建立加密 TCP 连接，
//   手写精简 SMTP 对话（问候 → EHLO → AUTH LOGIN → MAIL FROM → RCPT TO → DATA → QUIT）。
// 为什么选 465 端口 + secureTransport:'on'：163/QQ 等国内邮箱对「隐式 TLS」支持最稳，
//   不需要先明文再 STARTTLS 升级，少一轮协商也少一个失败点。
// 注意：Cloudflare 的 TCP 出站禁止 25 端口（防垃圾邮件），465/587 可用。

import { connect } from 'cloudflare:sockets';

const CRLF = '\r\n';
const encoder = new TextEncoder();

/** 一次 SMTP 对话允许的最长耗时（毫秒），超时即中止，避免函数挂死 */
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * 值得「重试一次」的 SMTP 错误特征。
 * 实测依据：163 会偶发拒绝来自 Cloudflare 边缘共享 IP 的登录（返回 535），
 * 但紧接着重试即可通过（首封测试邮件被拒后，连续 4 封全部成功），
 * 因此不能因为一次失败就判定通道不可用、让用户收不到验证码。
 * 注意：只重试 1 次（见下方 RETRY_MAX），避免把「授权码真的填错」这类永久错误
 * 反复提交给邮箱服务商，触发失败登录计数而把发件账号锁住。
 */
const RETRIABLE_SMTP_ERROR =
  /535|连接被对端关闭|被对端关闭|发送超时|连接超时|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i;
/** 重试前的等待时间（毫秒）：给对端风控一个短暂退避窗口 */
const RETRY_DELAY_MS = 800;
/** 最多额外重试次数（1 = 总共尝试 2 次） */
const RETRY_MAX = 1;

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  /** 'on' = 隐式 TLS（465）；'starttls' = 明文起步再升级（587）；'off' = 明文（不推荐） */
  secure: string;
}

export interface MailConfig extends SmtpConfig {
  enabled: boolean;
  notifyRecipients: string[];
}

export interface MailInput {
  to: string[];
  subject: string;
  html: string;
  timeoutMs?: number;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** UTF-8 安全的 base64（btoa 不能直接处理中文） */
function b64(str: string): string {
  const bytes = encoder.encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** 邮件头编码：纯 ASCII 原样返回，含中文等非 ASCII 字符时用 RFC2047 编码字 */
function encodeHeader(str: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(str)) return str;
  return '=?UTF-8?B?' + b64(str) + '?=';
}

/** 把 base64 正文按 76 字符折行（RFC2045 要求，同时规避超长行被截断） */
function wrap76(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += 76) out.push(s.slice(i, i + 76));
  return out.join(CRLF);
}

/** 读取 system_config 中的邮件配置 */
export async function getMailConfig(DB: any): Promise<MailConfig> {
  let map: Record<string, string> = {};
  try {
    const rows = await DB.prepare("SELECT key, value FROM system_config WHERE key LIKE 'mail.%'").all();
    for (const r of (rows?.results || [])) map[(r as any).key] = (r as any).value ?? '';
  } catch {
    // 表尚未建立（迁移未执行）时退化为默认值，不阻断主流程
    map = {};
  }
  return {
    enabled: map['mail.enabled'] === '1',
    host: map['mail.smtp_host'] || 'smtp.163.com',
    port: parseInt(map['mail.smtp_port'] || '465', 10) || 465,
    user: map['mail.smtp_user'] || '',
    pass: map['mail.smtp_pass'] || '',
    fromName: map['mail.from_name'] || 'SSA ERP 系统通知',
    secure: map['mail.smtp_secure'] || 'on',
    notifyRecipients: (map['mail.notify_recipients'] || '')
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * 发送一封 HTML 邮件。
 * 全程任何一步异常都会被捕获并转成 { ok:false, error }，绝不向上抛出——
 * 调用方（注册/登录/通知）不应因为邮件通道故障而整体失败。
 */
export async function sendMail(cfg: SmtpConfig, mail: MailInput): Promise<SendResult> {
  const timeoutMs = mail.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: '邮件服务未配置（缺少服务器地址/账号/授权码）' };
  }
  if (!mail.to.length) return { ok: false, error: '收件人为空' };

  let socket: any = null;

  const session = async (): Promise<SendResult> => {
    socket = connect(
      { hostname: cfg.host, port: cfg.port },
      { secureTransport: String(cfg.secure) === 'false' ? 'off' : 'on', allowHalfOpen: false }
    );
    await socket.opened;

    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    const decoder = new TextDecoder();
    let buf = '';

    /** 读一行（以 CRLF 结尾） */
    const readLine = async (): Promise<string> => {
      for (;;) {
        const idx = buf.indexOf(CRLF);
        if (idx >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          return line;
        }
        const { value, done } = await reader.read();
        if (done) throw new Error('SMTP 连接被对端关闭');
        buf += decoder.decode(value, { stream: true });
      }
    };

    /** 读一个完整响应；SMTP 多行响应形如 "250-xxx" 续行、末行 "250 yyy" */
    const readResponse = async (): Promise<{ code: number; text: string }> => {
      const lines: string[] = [];
      for (;;) {
        const line = await readLine();
        lines.push(line);
        if (line.length >= 4 && line.charAt(3) === '-') continue;
        break;
      }
      const last = lines[lines.length - 1] || '';
      return { code: parseInt(last.slice(0, 3), 10) || 0, text: lines.join(' | ') };
    };

    /** 发送一条命令并校验返回码；sensitive=true 时错误信息不回显命令内容（避免授权码进日志） */
    const cmd = async (command: string, expect: number[], sensitive = false): Promise<void> => {
      await writer.write(encoder.encode(command + CRLF));
      const res = await readResponse();
      if (!expect.includes(res.code)) {
        const shown = sensitive ? '(已隐藏)' : command;
        throw new Error(`SMTP 拒绝 ${shown} → ${res.code} ${res.text.slice(0, 180)}`);
      }
    };

    // 1) 服务端问候（220）
    const greeting = await readResponse();
    if (greeting.code !== 220) {
      throw new Error(`SMTP 问候异常：${greeting.text.slice(0, 160)}`);
    }

    // 2) EHLO（主机名随意填，仅作标识）
    await cmd('EHLO ssa-erp.pages.dev', [250]);

    // 3) 认证：AUTH LOGIN 分三步（命令 → 用户名 → 授权码）
    await cmd('AUTH LOGIN', [334]);
    await cmd(b64(cfg.user), [334], true);
    await cmd(b64(cfg.pass), [235], true);

    // 4) 信封：发件人 + 全部收件人
    await cmd(`MAIL FROM:<${cfg.user}>`, [250]);
    for (const to of mail.to) {
      await cmd(`RCPT TO:<${to}>`, [250, 251]);
    }

    // 5) 正文
    await cmd('DATA', [354]);
    const headers = [
      `From: ${encodeHeader(cfg.fromName)} <${cfg.user}>`,
      `To: ${mail.to.join(', ')}`,
      `Subject: ${encodeHeader(mail.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@ssa-erp.pages.dev>`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(b64(mail.html)),
    ].join(CRLF);
    await writer.write(encoder.encode(headers + CRLF + '.' + CRLF));
    const accepted = await readResponse();
    if (accepted.code !== 250) {
      throw new Error(`邮件未被接收：${accepted.code} ${accepted.text.slice(0, 180)}`);
    }

    try { await writer.write(encoder.encode('QUIT' + CRLF)); } catch { /* 忽略：邮件已投递成功 */ }
    try { reader.releaseLock(); } catch { /* ignore */ }
    try { writer.releaseLock(); } catch { /* ignore */ }
    return { ok: true };
  };

  /** 单次投递尝试（含超时保护）；无论成败都在结束时关闭本次连接 */
  const attempt = async (): Promise<SendResult> => {
    try {
      const timeout = new Promise<SendResult>((_, reject) =>
        setTimeout(() => reject(new Error(`发送超时（${timeoutMs} 毫秒内未完成）`)), timeoutMs)
      );
      return await Promise.race([session(), timeout]);
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    } finally {
      try { socket?.close?.(); } catch { /* ignore */ }
      socket = null;
    }
  };

  let result = await attempt();
  // 偶发风控（如 163 对 Cloudflare 边缘 IP 的 535）重试一次即可恢复
  for (let i = 0; i < RETRY_MAX && !result.ok && RETRIABLE_SMTP_ERROR.test(result.error || ''); i++) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    result = await attempt();
  }
  return result;
}

/** 写一条邮件发送日志（失败不影响主流程） */
export async function logMail(
  DB: any,
  entry: { id: string; topic: string; toAddr: string; subject: string; status: string; error?: string; batchId?: string }
): Promise<void> {
  try {
    await DB.prepare(
      `INSERT INTO mail_logs (id, topic, to_addr, subject, status, error, batch_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        entry.id,
        entry.topic,
        entry.toAddr,
        entry.subject,
        entry.status,
        entry.error ?? null,
        entry.batchId ?? null,
        new Date().toISOString()
      )
      .run();
  } catch {
    /* 日志失败不阻断 */
  }
}

// ── 邮件模板 ────────────────────────────────────────────────────

/** 统一的邮件外框（邮件客户端不支持外部样式，全部内联） */
function wrapLayout(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#0F172A;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;box-shadow:0 2px 12px rgba(15,23,42,.08);overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#1E3A8A,#0F172A);padding:20px 24px;">
      <div style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:.5px;">SSA ERP</div>
      <div style="color:#93C5FD;font-size:12px;margin-top:4px;">企业资源计划系统</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <div style="font-size:16px;font-weight:700;margin-bottom:14px;color:#0F172A;">${title}</div>
      ${inner}
    </td></tr>
    <tr><td style="padding:14px 24px 22px;border-top:1px solid #E2E8F0;">
      <div style="font-size:12px;color:#94A3B8;line-height:1.7;">
        本邮件由系统自动发出，请勿直接回复。<br/>
        如非本人操作，请忽略本邮件并尽快在系统「安全中心」修改密码。
      </div>
    </td></tr>
  </table>
</body></html>`;
}

/** 验证码邮件：code 为该邮箱专属验证码，label 标明这是主邮箱还是备用邮箱 */
export function renderCodeEmail(opts: {
  code: string;
  username: string;
  emailLabel: string;
  purposeText: string;
  expiresMinutes: number;
  peerEmails: string[];
}): { subject: string; html: string } {
  const digits = opts.code.split('').map(
    (d) =>
      `<td style="padding:0 5px;"><span style="display:inline-block;width:38px;line-height:46px;text-align:center;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;font-size:24px;font-weight:700;color:#1D4ED8;font-family:Menlo,Consolas,monospace;">${d}</span></td>`
  ).join('');

  const peer = opts.peerEmails.length
    ? `<div style="font-size:12px;color:#64748B;margin-top:10px;">本次验证还向以下邮箱发送了不同的验证码，两个邮箱的验证码都需填写：<br/>${opts.peerEmails.map((e) => `<span style="font-family:Menlo,Consolas,monospace;color:#334155;">${e}</span>`).join('<br/>')}</div>`
    : '';

  const inner = `
    <div style="font-size:14px;color:#334155;line-height:1.8;margin-bottom:16px;">
      您好${opts.username ? `，<strong>${opts.username}</strong>` : ''}：<br/>
      您正在进行<strong>${opts.purposeText}</strong>，该验证码由您的<strong>${opts.emailLabel}</strong>接收。
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;"><tr>${digits}</tr></table>
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;font-size:13px;color:#92400E;line-height:1.7;">
      验证码 <strong>${opts.expiresMinutes} 分钟内有效</strong>，连续输错 5 次将失效需重新获取。<br/>
      任何人向你索要验证码都是诈骗，请勿转发。
    </div>
    ${peer}`;
  return {
    subject: `【SSA ERP】${opts.purposeText}验证码（${opts.emailLabel}）`,
    html: wrapLayout('安全验证码', inner),
  };
}

/**
 * 安全邮箱备用通道邮件：一封邮件同时列出本批次的全部验证码。
 *
 * 与 renderCodeEmail 的区别：普通验证码邮件是「一个邮箱一枚码」，本模板是
 * 「同一个收件人一次拿到全部码」——因为安全邮箱本身就是那条异地备用通道，
 * 再拆分到两个邮箱反而增加取码难度。用户拿到全部码后在系统里一并填入即可。
 */
export function renderSecurityMailEmail(opts: {
  codes: string[];
  username: string;
  purposeText: string;
  expiresMinutes: number;
  delayHours: number;
  attempt: number;
  maxAttempts: number;
}): { subject: string; html: string } {
  const blocks = opts.codes
    .map((code, i) => {
      const digits = code
        .split('')
        .map(
          (d) =>
            `<td style="padding:0 5px;"><span style="display:inline-block;width:38px;line-height:46px;text-align:center;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;font-size:24px;font-weight:700;color:#047857;font-family:Menlo,Consolas,monospace;">${d}</span></td>`
        )
        .join('');
      return `
        <div style="margin-bottom:14px;">
          <div style="font-size:13px;color:#475569;font-weight:700;margin-bottom:6px;">验证码 ${i + 1}</div>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
        </div>`;
    })
    .join('');

  const resendNote =
    opts.maxAttempts > 1
      ? `本邮件共投递 ${opts.maxAttempts} 次，本次为第 ${opts.attempt} 次，若收到重复邮件属正常现象，验证码以任意一封为准。`
      : '';

  const inner = `
    <div style="font-size:14px;color:#334155;line-height:1.8;margin-bottom:16px;">
      您好${opts.username ? `，<strong>${opts.username}</strong>` : ''}：<br/>
      这是您通过<strong>安全邮箱备用通道</strong>申请的验证码，用于<strong>${opts.purposeText}</strong>。
      该通道在申请后 <strong>${opts.delayHours} 小时</strong>才投递，目的是确保它不依赖已登录的系统会话。
    </div>
    ${blocks}
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;font-size:13px;color:#92400E;line-height:1.7;">
      全部验证码需<strong>一并填入</strong>系统，缺一不可，<strong>${opts.expiresMinutes} 分钟内有效</strong>。<br/>
      在系统内任何界面都不会显示这些验证码。任何人向你索要验证码都是诈骗，请勿转发。
      ${resendNote ? `<br/>${resendNote}` : ''}
    </div>`;

  return {
    subject: `【SSA ERP】安全邮箱备用验证码（${opts.purposeText}）`,
    html: wrapLayout('安全邮箱备用验证码', inner),
  };
}

/** 版本升级 / 重大事件通知邮件 */
export function renderNoticeEmail(opts: {
  version: string;
  title: string;
  highlights: string[];
  note?: string;
}): { subject: string; html: string } {
  const list = opts.highlights.length
    ? `<ul style="margin:0;padding-left:20px;font-size:14px;color:#334155;line-height:1.9;">${opts.highlights
        .map((h) => `<li>${h}</li>`)
        .join('')}</ul>`
    : '';
  const inner = `
    <div style="display:inline-block;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;border-radius:999px;padding:3px 12px;font-size:12px;font-weight:700;margin-bottom:14px;">
      ${opts.version}
    </div>
    <div style="font-size:14px;color:#334155;line-height:1.8;margin-bottom:12px;">${opts.title}</div>
    ${list}
    ${opts.note ? `<div style="margin-top:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:13px;color:#475569;line-height:1.7;">${opts.note}</div>` : ''}`;
  return {
    subject: `【SSA ERP】${opts.version} 版本更新通知`,
    html: wrapLayout('版本更新通知', inner),
  };
}

/** 系统测试邮件 */
export function renderTestEmail(operator: string): { subject: string; html: string } {
  const inner = `
    <div style="font-size:14px;color:#334155;line-height:1.8;">
      邮件通道配置成功，本邮件由系统测试功能发出。<br/>
      操作人：<strong>${operator}</strong><br/>
      发送时间：<strong>${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</strong>
    </div>`;
  return { subject: '【SSA ERP】邮件通道测试', html: wrapLayout('邮件通道测试', inner) };
}
