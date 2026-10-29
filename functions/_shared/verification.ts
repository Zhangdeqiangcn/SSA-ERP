// 双邮箱验证码 + 一次性凭证的共享逻辑
// 被 send-code / verify-code / activate / change-password 复用。
//
// 核心规则（对应强哥的需求）：
//   · 「发送验证码」时按账号绑定的每个邮箱各生成一枚「互不相同」的验证码，分别发出；
//   · 校验时把用户提交的全部验证码与批次内的验证码做「集合比对」——
//     不要求用户分辨哪枚码来自哪个邮箱，但必须每个邮箱的码都正确，缺一不可；
//   · 校验通过后签发一次性凭证（ticket），由激活/改密接口消费一次，防止验证码被复用。

import {
  sendMail,
  getMailConfig,
  logMail,
  renderCodeEmail,
  renderSecurityMailEmail,
} from './mailer';
import { uid } from './auth';

/** 验证码有效期：5 分钟 */
export const CODE_TTL_MS = 5 * 60 * 1000;
/** 一次性凭证有效期：10 分钟（给用户留出设置密码的时间） */
export const TICKET_TTL_MS = 10 * 60 * 1000;
/** 单个批次最多允许的错误尝试次数 */
export const MAX_ATTEMPTS = 5;
/** 重发冷却：60 秒（同时起到防骚扰刷屏的作用） */
export const RESEND_COOLDOWN_MS = 60 * 1000;

export const PURPOSE_TEXT: Record<string, string> = {
  activate: '超级管理员首次激活',
  change_password: '修改密码',
};

/** 生成 6 位数字验证码；exclude 用于保证同一批次内两枚码不相同 */
export function genCode(exclude?: string): string {
  for (;;) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const code = String(arr[0] % 1000000).padStart(6, '0');
    if (!exclude || code !== exclude) return code;
  }
}

/** 邮箱脱敏：zhangdeqiangcn@163.com → zh*************@163.com */
export function maskEmail(email: string): string {
  const at = String(email || '').indexOf('@');
  if (at <= 0) return String(email || '');
  const name = email.slice(0, at);
  const domain = email.slice(at);
  const head = name.slice(0, Math.min(2, name.length));
  return head + '*'.repeat(Math.max(1, name.length - head.length)) + domain;
}

/** 账号绑定的验证码接收邮箱：主邮箱 + 备用（抄送）邮箱，自动去重 */
export function getVerifyEmails(u: any): string[] {
  const out: string[] = [];
  for (const v of [u?.email, u?.alt_email]) {
    const e = String(v || '').trim();
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

export interface SentItem {
  /** 脱敏后的邮箱，可直接展示给用户 */
  email: string;
  label: string;
  ok: boolean;
  error?: string;
}

export interface IssueResult {
  ok: boolean;
  error?: string;
  sent?: SentItem[];
  expiresInSeconds?: number;
  /** 全部邮箱均发送失败（此时需引导用户走兜底通道） */
  allFailed?: boolean;
}

/**
 * 生成并向账号绑定的每个邮箱发送验证码。
 * 验证码先落库再发信：即使发信失败，超管仍可通过兜底通道取到，不会把人锁死。
 */
export async function issueVerificationCodes(
  env: any,
  user: any,
  purpose: string
): Promise<IssueResult> {
  const emails = getVerifyEmails(user);
  if (!emails.length) {
    return { ok: false, error: '该账号尚未绑定验证邮箱，无法完成安全验证，请联系超级管理员' };
  }

  const cfg = await getMailConfig(env.DB);
  if (!cfg.enabled) {
    return { ok: false, error: '系统邮件通道尚未启用，请联系超级管理员在「安全中心」完成邮件配置' };
  }

  // 重发冷却
  const last = (await env.DB.prepare(
    `SELECT created_at FROM email_verifications
     WHERE user_id = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1`
  )
    .bind(user.id, purpose)
    .first()) as any;
  if (last?.created_at) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, error: `发送过于频繁，请 ${wait} 秒后再试` };
    }
  }

  // 作废同用途的历史未消费批次，保证同一时刻只有一批有效
  await env.DB.prepare(
    `UPDATE email_verifications SET consumed = 1
     WHERE user_id = ? AND purpose = ? AND consumed = 0`
  )
    .bind(user.id, purpose)
    .run();

  const batchId = uid('batch');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const now = new Date().toISOString();
  const primary = String(user.email || '').trim();
  const sent: SentItem[] = [];

  let prev = '';
  for (const email of emails) {
    const code = genCode(prev); // 两枚码必须不同，集合校验才可靠
    prev = code;

    await env.DB.prepare(
      `INSERT INTO email_verifications
       (id, user_id, username, purpose, email, code, batch_id, attempts, verified, consumed, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`
    )
      .bind(
        uid('ev'),
        user.id,
        user.username ?? '',
        purpose,
        email,
        code,
        batchId,
        expiresAt,
        now
      )
      .run();

    const label = email === primary ? '主邮箱' : '备用邮箱';
    const peers = emails.filter((e) => e !== email).map(maskEmail);
    const tpl = renderCodeEmail({
      code,
      username: user.name || user.username || '',
      emailLabel: label,
      purposeText: PURPOSE_TEXT[purpose] || '安全验证',
      expiresMinutes: Math.round(CODE_TTL_MS / 60000),
      peerEmails: peers,
    });

    const res = await sendMail(cfg, { to: [email], subject: tpl.subject, html: tpl.html });
    await logMail(env.DB, {
      id: uid('ml'),
      topic: 'verification',
      toAddr: email,
      subject: tpl.subject,
      status: res.ok ? 'sent' : 'failed',
      error: res.error,
      batchId,
    });
    sent.push({ email: maskEmail(email), label, ok: res.ok, error: res.ok ? undefined : res.error });
  }

  return {
    ok: true,
    sent,
    expiresInSeconds: Math.round(CODE_TTL_MS / 1000),
    allFailed: sent.every((s) => !s.ok),
  };
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  ticket?: string;
}

/**
 * 校验用户提交的全部验证码是否与最新批次「一一对应」。
 * 集合比对：不看顺序，只要求每枚码都能在批次中找到，不能缺少也不能重复。
 */
export async function verifyCodes(
  env: any,
  user: any,
  purpose: string,
  codes: string[]
): Promise<VerifyResult> {
  const nowIso = new Date().toISOString();

  const batch = (await env.DB.prepare(
    `SELECT batch_id FROM email_verifications
     WHERE user_id = ? AND purpose = ? AND consumed = 0 AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(user.id, purpose, nowIso)
    .first()) as any;
  if (!batch) return { ok: false, error: '验证码已失效或未发送，请先获取验证码' };

  const rows = await env.DB.prepare(
    `SELECT code, attempts FROM email_verifications WHERE batch_id = ? AND consumed = 0`
  )
    .bind(batch.batch_id)
    .all();
  const items = (rows.results || []) as any[];
  if (!items.length) return { ok: false, error: '验证码已失效，请重新获取' };

  const maxAttempts = Math.max(0, ...items.map((r) => Number(r.attempts) || 0));
  if (maxAttempts >= MAX_ATTEMPTS) {
    await env.DB.prepare(`UPDATE email_verifications SET consumed = 1 WHERE batch_id = ?`)
      .bind(batch.batch_id)
      .run();
    return { ok: false, error: '验证码错误次数过多，已失效，请重新获取' };
  }

  const norm = (s: string) => String(s || '').replace(/\D/g, '');
  const got = codes.map(norm).filter((c) => c.length === 6).sort();
  const need = items.map((r) => String(r.code)).sort();
  const pass = got.length === need.length && got.every((c, i) => c === need[i]);

  if (!pass) {
    // V2.98.0（评测 M-08）：原实现是「读出当前值 → 加一 → 写回」，两个并发请求
    //   会同时读到同一个旧值、都写回同一个新值 → 两次错误只记一次，5 次上限形同虚设。
    //   现改为「在数据库内自增 + 带上限的条件更新」，由 SQL 保证原子性；
    //   自增后回读真实值计算剩余次数，彻底消除丢失更新。
    await env.DB.prepare(
      `UPDATE email_verifications SET attempts = attempts + 1
        WHERE batch_id = ? AND consumed = 0 AND attempts < ?`
    )
      .bind(batch.batch_id, MAX_ATTEMPTS)
      .run();

    const after = (await env.DB.prepare(
      `SELECT MAX(attempts) AS mx FROM email_verifications WHERE batch_id = ?`
    )
      .bind(batch.batch_id)
      .first()) as any;
    const used = Number(after?.mx || 0);
    const left = Math.max(0, MAX_ATTEMPTS - used);
    if (left <= 0) {
      await env.DB.prepare(`UPDATE email_verifications SET consumed = 1 WHERE batch_id = ?`)
        .bind(batch.batch_id)
        .run();
      return { ok: false, error: '验证码错误次数过多，已失效，请重新获取' };
    }
    return {
      ok: false,
      error: `验证码不正确（需填写每个邮箱收到的验证码），还可尝试 ${left} 次`,
    };
  }

  // 通过：以「批次尚未被消费」为条件做原子抢占，仅抢占成功者签发凭证。
  // （V2.97.0 修复 · 安全审计 A6）原实现为无条件 UPDATE，两个并发请求可同时
  //  通过校验、各自签发一张 ticket，破坏「一次性凭证」语义。
  const claim = await env.DB.prepare(
    `UPDATE email_verifications SET verified = 1, consumed = 1 WHERE batch_id = ? AND consumed = 0`
  )
    .bind(batch.batch_id)
    .run();
  if ((claim?.meta?.changes ?? 0) === 0) {
    return { ok: false, error: '验证码已被使用，请重新获取' };
  }

  const ticket = uid('tkt') + crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare(
    `INSERT INTO security_tickets (ticket, user_id, purpose, used, expires_at, created_at)
     VALUES (?, ?, ?, 0, ?, ?)`
  )
    .bind(ticket, user.id, purpose, new Date(Date.now() + TICKET_TTL_MS).toISOString(), nowIso)
    .run();

  return { ok: true, ticket };
}

/**
 * 消费一次性凭证。用 `used = 0` 作为乐观锁条件，保证同一张凭证只能生效一次。
 */
export async function consumeTicket(
  env: any,
  ticket: string,
  userId: string,
  purpose: string
): Promise<boolean> {
  if (!ticket) return false;

  const row = (await env.DB.prepare(
    `SELECT ticket, expires_at, used FROM security_tickets
     WHERE ticket = ? AND user_id = ? AND purpose = ?`
  )
    .bind(ticket, userId, purpose)
    .first()) as any;
  if (!row || row.used) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  const res = await env.DB.prepare(
    `UPDATE security_tickets SET used = 1 WHERE ticket = ? AND used = 0`
  )
    .bind(ticket)
    .run();
  return (res?.meta?.changes ?? 0) > 0;
}

// ══════════════════════════════════════════════════════════════════
// 找回密码：单邮箱验证码（与双邮箱验证区分，purpose = 'reset_password'）
//
// 与双邮箱验证的区别：
//   · 只发往账号注册时填写的「主邮箱」（user.email），不需要双邮箱；
//   · 只生成一枚验证码，用户填一枚即可，降低普通用户的使用门槛；
//   · 用于登录页「找回密码」自助重置，不依赖登录态。
// ══════════════════════════════════════════════════════════════════

/** 向账号注册邮箱发送一枚找回密码验证码（先落库再发信） */
export async function issueResetCode(env: any, user: any): Promise<IssueResult> {
  const email = String(user?.email || '').trim();
  if (!email) return { ok: false, error: '该账号未绑定邮箱，无法发送验证码' };

  const cfg = await getMailConfig(env.DB);
  if (!cfg.enabled) {
    return { ok: false, error: '系统邮件通道尚未启用，请联系系统运维在「安全中心」完成邮件配置' };
  }

  // 重发冷却
  const last = (await env.DB.prepare(
    `SELECT created_at FROM email_verifications
     WHERE user_id = ? AND purpose = 'reset_password' ORDER BY created_at DESC LIMIT 1`
  )
    .bind(user.id)
    .first()) as any;
  if (last?.created_at) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, error: `发送过于频繁，请 ${wait} 秒后再试` };
    }
  }

  // 作废同用途的历史未消费批次，保证同一时刻只有一批有效
  await env.DB.prepare(
    `UPDATE email_verifications SET consumed = 1
     WHERE user_id = ? AND purpose = 'reset_password' AND consumed = 0`
  )
    .bind(user.id)
    .run();

  const batchId = uid('batch');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const now = new Date().toISOString();
  const code = genCode();

  await env.DB.prepare(
    `INSERT INTO email_verifications
     (id, user_id, username, purpose, email, code, batch_id, attempts, verified, consumed, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`
  )
    .bind(
      uid('ev'),
      user.id,
      user.username ?? '',
      'reset_password',
      email,
      code,
      batchId,
      expiresAt,
      now
    )
    .run();

  const tpl = renderCodeEmail({
    code,
    username: user.name || user.username || '',
    emailLabel: '注册邮箱',
    purposeText: '找回密码',
    expiresMinutes: Math.round(CODE_TTL_MS / 60000),
    peerEmails: [],
  });

  const res = await sendMail(cfg, { to: [email], subject: tpl.subject, html: tpl.html });
  await logMail(env.DB, {
    id: uid('ml'),
    topic: 'reset_password',
    toAddr: email,
    subject: tpl.subject,
    status: res.ok ? 'sent' : 'failed',
    error: res.error,
    batchId,
  });

  return {
    ok: true,
    sent: [{ email: maskEmail(email), label: '注册邮箱', ok: res.ok, error: res.ok ? undefined : res.error }],
    expiresInSeconds: Math.round(CODE_TTL_MS / 1000),
    allFailed: !res.ok,
  };
}

/** 校验并消费一枚找回密码验证码；成功后置 consumed=1，返回 ok */
export async function verifyResetCode(
  env: any,
  user: any,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();

  const rows = (await env.DB.prepare(
    `SELECT id, code, attempts FROM email_verifications
     WHERE user_id = ? AND purpose = 'reset_password' AND consumed = 0 AND expires_at > ?`
  )
    .bind(user.id, nowIso)
    .all()) as any;
  const items = (rows?.results || []) as any[];
  if (!items.length) return { ok: false, error: '验证码已失效或未发送，请先获取验证码' };

  const maxAttempts = Math.max(0, ...items.map((r: any) => Number(r.attempts) || 0));
  if (maxAttempts >= MAX_ATTEMPTS) {
    await env.DB.prepare(
      `UPDATE email_verifications SET consumed = 1
       WHERE user_id = ? AND purpose = 'reset_password' AND consumed = 0`
    )
      .bind(user.id)
      .run();
    return { ok: false, error: '验证码错误次数过多，已失效，请重新获取' };
  }

  const norm = String(code || '').replace(/\D/g, '');
  const pass = items.some((r: any) => String(r.code) === norm);
  if (!pass) {
    // 原子自增 attempts（数据库内自增，避免丢失更新）
    await env.DB.prepare(
      `UPDATE email_verifications SET attempts = attempts + 1
       WHERE user_id = ? AND purpose = 'reset_password' AND consumed = 0 AND attempts < ?`
    )
      .bind(user.id, MAX_ATTEMPTS)
      .run();

    const after = (await env.DB.prepare(
      `SELECT MAX(attempts) AS mx FROM email_verifications
       WHERE user_id = ? AND purpose = 'reset_password'`
    )
      .bind(user.id)
      .first()) as any;
    const left = Math.max(0, MAX_ATTEMPTS - Number(after?.mx || 0));
    if (left <= 0) {
      await env.DB.prepare(
        `UPDATE email_verifications SET consumed = 1
         WHERE user_id = ? AND purpose = 'reset_password' AND consumed = 0`
      )
        .bind(user.id)
        .run();
      return { ok: false, error: '验证码错误次数过多，已失效，请重新获取' };
    }
    return { ok: false, error: `验证码不正确，还可尝试 ${left} 次` };
  }

  // 通过：消费该验证码（同批次可能有多行，只消费匹配的那一枚）
  await env.DB.prepare(
    `UPDATE email_verifications SET verified = 1, consumed = 1
     WHERE id = ? AND consumed = 0`
  )
    .bind(items[0].id)
    .run();

  return { ok: true };
}

// ══════════════════════════════════════════════════════════════════
// 安全邮箱备用通道
// ══════════════════════════════════════════════════════════════════
// 背景：最初的兜底方案是「在安全中心用登录密码查看最近生成的验证码」，
//   但这条后路是无效的——能登录系统的人自然也能看到验证码，等于没有隔离。
// 现改为：把验证码「延后投递」到一个与登录体系无关的安全邮箱。
//   · 申请后延迟 N 小时（默认 8）才投递第一批；
//   · 投递一次后间隔 M 分钟（默认 10）再投递一次，防止首次丢信；
//   · 验证码在系统的任何界面、任何接口都不会被回传。
// 因此攻击者即使拿到登录密码，也必须等满延时并且能进入安全邮箱才可能得手。

/** 安全邮箱投递的验证码有效期：2 小时（覆盖首投与重投之间的取码窗口） */
export const SECURITY_MAIL_CODE_TTL_MS = 2 * 60 * 60 * 1000;
/** 备用通道申请冷却：24 小时（防止安全邮箱被反复骚扰） */
export const SECURITY_MAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** 单次懒执行最多处理的到期任务数（控制单个请求的耗时上限） */
const QUEUE_BATCH_LIMIT = 5;

export interface SecurityMailboxConfig {
  /** 安全邮箱地址；为空表示该通道不可用 */
  mailbox: string;
  delayHours: number;
  intervalMin: number;
  maxAttempts: number;
}

/** 读取安全邮箱通道配置（缺表 / 缺键时退化为默认值，不阻断主流程） */
export async function getSecurityMailboxConfig(DB: any): Promise<SecurityMailboxConfig> {
  let map: Record<string, string> = {};
  try {
    const rows = await DB.prepare(
      `SELECT key, value FROM system_config WHERE key IN
       ('security.mailbox','security.delay_hours','security.interval_min','security.max_attempts')`
    ).all();
    for (const r of rows?.results || []) map[(r as any).key] = (r as any).value ?? '';
  } catch {
    map = {};
  }
  const num = (v: any, d: number) => {
    const n = parseInt(String(v ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    mailbox: String(map['security.mailbox'] || '').trim(),
    delayHours: num(map['security.delay_hours'], 8),
    intervalMin: num(map['security.interval_min'], 10),
    maxAttempts: num(map['security.max_attempts'], 2),
  };
}

export interface EnqueueResult {
  ok: boolean;
  error?: string;
  /** 脱敏后的安全邮箱，可直接展示 */
  mailbox?: string;
  /** 首次投递时间（ISO 字符串） */
  deliverAt?: string;
  delayHours?: number;
  intervalMin?: number;
  maxAttempts?: number;
  attempt?: number;
  /** true = 已存在排队中的任务，本次未新建 */
  existing?: boolean;
}

/**
 * 申请启用安全邮箱备用通道：生成新的一批验证码并登记为「待投递」。
 * 到期后由 processSecurityMailQueue 真正发出。
 *
 * 重要：本函数**绝不返回明文验证码**——这正是该通道相对旧「查码」方案的核心改进。
 */
export async function enqueueSecurityMail(
  env: any,
  user: any,
  purpose: string
): Promise<EnqueueResult> {
  const cfg = await getSecurityMailboxConfig(env.DB);
  if (!cfg.mailbox) {
    return { ok: false, error: '系统尚未配置安全邮箱，请联系系统运维' };
  }

  const mailCfg = await getMailConfig(env.DB);
  if (!mailCfg.enabled || !mailCfg.user || !mailCfg.pass) {
    return { ok: false, error: '系统邮件通道尚未启用，暂时无法投递到安全邮箱' };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // 已有排队中的任务 → 直接回显，不重复新建（避免重复占用安全邮箱）
  const pend = (await env.DB.prepare(
    `SELECT deliver_at, attempt, max_attempts, delay_hours, interval_min
     FROM security_mail_queue
     WHERE user_id = ? AND purpose = ? AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(user.id, purpose)
    .first()) as any;
  if (pend) {
    return {
      ok: true,
      existing: true,
      mailbox: maskEmail(cfg.mailbox),
      deliverAt: String(pend.deliver_at || ''),
      delayHours: Number(pend.delay_hours) || cfg.delayHours,
      intervalMin: Number(pend.interval_min) || cfg.intervalMin,
      maxAttempts: Number(pend.max_attempts) || cfg.maxAttempts,
      attempt: Number(pend.attempt) || 0,
    };
  }

  // 冷却：24 小时内已申请过（不论成败）则不再受理
  const recent = (await env.DB.prepare(
    `SELECT created_at FROM security_mail_queue
     WHERE user_id = ? AND purpose = ? AND created_at > ?
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(user.id, purpose, new Date(Date.now() - SECURITY_MAIL_COOLDOWN_MS).toISOString())
    .first()) as any;
  if (recent?.created_at) {
    return { ok: false, error: '24 小时内已申请过安全邮箱通道，请勿重复申请' };
  }

  const codeA = genCode();
  const codeB = genCode(codeA); // 两枚码必须不同，集合校验才可靠
  const deliverAt = new Date(now.getTime() + cfg.delayHours * 3600 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO security_mail_queue
     (id, user_id, username, purpose, mailbox, codes, batch_id,
      delay_hours, interval_min, max_attempts, attempt, status, deliver_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?)`
  )
    .bind(
      uid('smq'),
      user.id,
      user.username ?? '',
      purpose,
      cfg.mailbox,
      JSON.stringify([codeA, codeB]),
      uid('sbatch'),
      cfg.delayHours,
      cfg.intervalMin,
      cfg.maxAttempts,
      deliverAt,
      nowIso,
      nowIso
    )
    .run();

  return {
    ok: true,
    mailbox: maskEmail(cfg.mailbox),
    deliverAt,
    delayHours: cfg.delayHours,
    intervalMin: cfg.intervalMin,
    maxAttempts: cfg.maxAttempts,
    attempt: 0,
  };
}

export interface QueueTickResult {
  processed: number;
  sent: number;
  failed: number;
}

/**
 * 懒执行：把到期的安全邮箱投递任务发送出去。
 *
 * Cloudflare Pages Functions 没有定时任务能力，因此由任意请求顺带触发
 * （入口见 functions/_middleware.ts，以及 security-mailbox / login 接口）。
 *
 * 并发安全：以 `attempt = 旧值` 作为乐观锁抢占任务，多个请求同时触发时
 * 也只会有一个真正执行投递，不会重复发信。
 */
export async function processSecurityMailQueue(
  env: any,
  limit = QUEUE_BATCH_LIMIT
): Promise<QueueTickResult> {
  const out: QueueTickResult = { processed: 0, sent: 0, failed: 0 };

  let due: any[] = [];
  try {
    const rows = await env.DB.prepare(
      `SELECT * FROM security_mail_queue
       WHERE status = 'pending'
         AND ( (deliver_at <= ? AND attempt < max_attempts)
               OR attempt >= max_attempts )
       ORDER BY deliver_at ASC LIMIT ?`
    )
      .bind(new Date().toISOString(), limit)
      .all();
    due = (rows?.results || []) as any[];
  } catch {
    return out; // 表尚未建立（迁移未执行）时静默跳过
  }
  if (!due.length) return out;

  const cfg = await getMailConfig(env.DB);

  for (const job of due) {
    const nowIso = new Date().toISOString();
    const prevAttempt = Number(job.attempt) || 0;
    const maxAttempts = Number(job.max_attempts) || 2;

    // 中间态收尾：若上一次投递之后的「收尾写入」失败，任务会停留在
    // attempt 已用尽、status 仍为 pending 的状态。这类任务不再投递，直接结清，
    // 避免它被后续扫描条件永久排除、导致该次申请静默失效。
    if (prevAttempt >= maxAttempts) {
      await env.DB.prepare(
        `UPDATE security_mail_queue SET status = ?, updated_at = ?
         WHERE id = ? AND status = 'pending'`
      )
        .bind(job.last_error ? 'failed' : 'done', nowIso, job.id)
        .run();
      continue;
    }

    // 抢占：只有把 attempt 从旧值推进一位的调用者负责投递
    const claim = await env.DB.prepare(
      `UPDATE security_mail_queue SET attempt = attempt + 1, updated_at = ?
       WHERE id = ? AND status = 'pending' AND attempt = ?`
    )
      .bind(nowIso, job.id, prevAttempt)
      .run();
    if (!((claim?.meta?.changes ?? 0) > 0)) continue;

    out.processed += 1;
    const attempt = prevAttempt + 1;

    let codes: string[] = [];
    try {
      codes = JSON.parse(String(job.codes || '[]'));
    } catch {
      codes = [];
    }

    let ok = false;
    let sendErr = '';
    if (!codes.length) {
      sendErr = '任务数据异常：验证码为空';
    } else if (!cfg.enabled || !cfg.user || !cfg.pass) {
      sendErr = '邮件通道未启用或未配置';
    } else {
      const tpl = renderSecurityMailEmail({
        codes,
        username: job.username || '',
        purposeText: PURPOSE_TEXT[job.purpose] || '安全验证',
        expiresMinutes: Math.round(SECURITY_MAIL_CODE_TTL_MS / 60000),
        delayHours: Number(job.delay_hours) || 8,
        attempt,
        maxAttempts,
      });
      const res = await sendMail(cfg, {
        to: [String(job.mailbox)],
        subject: tpl.subject,
        html: tpl.html,
      });
      ok = res.ok;
      sendErr = res.error || '';
      await logMail(env.DB, {
        id: uid('ml'),
        topic: 'security_mailbox',
        toAddr: String(job.mailbox),
        subject: tpl.subject,
        status: res.ok ? 'sent' : 'failed',
        error: sendErr || undefined,
        batchId: job.batch_id,
      });
    }

    // 首次投递成功时，才把该批验证码登记进校验表
    // （后续重投是同一批码，无需重复登记；有效期已覆盖重投窗口）
    if (ok && attempt === 1) {
      try {
        await env.DB.prepare(
          `UPDATE email_verifications SET consumed = 1
           WHERE user_id = ? AND purpose = ? AND consumed = 0`
        )
          .bind(job.user_id, job.purpose)
          .run();

        const expiresAt = new Date(Date.now() + SECURITY_MAIL_CODE_TTL_MS).toISOString();
        for (const code of codes) {
          await env.DB.prepare(
            `INSERT INTO email_verifications
             (id, user_id, username, purpose, email, code, batch_id, attempts, verified, consumed, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`
          )
            .bind(
              uid('ev'),
              job.user_id,
              job.username ?? '',
              job.purpose,
              String(job.mailbox),
              code,
              job.batch_id,
              expiresAt,
              nowIso
            )
            .run();
        }
      } catch {
        /* 校验表登记失败不影响「邮件已发出」这一事实，下次请求仍可重试登记 */
      }
    }

    // 排定下一次投递，或收尾
    const hasNext = attempt < maxAttempts;
    await env.DB.prepare(
      `UPDATE security_mail_queue
       SET status = ?, deliver_at = ?, last_error = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        hasNext ? 'pending' : ok ? 'done' : 'failed',
        hasNext
          ? new Date(Date.now() + (Number(job.interval_min) || 10) * 60 * 1000).toISOString()
          : nowIso,
        sendErr || null,
        nowIso,
        job.id
      )
      .run();

    // V3.1.0（评测 H-04）：每一次真实投递都留痕，失败原因入库，
    // 管理员可在安全中心看到「跑过几次、什么时候跑的、为什么失败」，并支持一键重放。
    try {
      await env.DB.prepare(
        `INSERT INTO job_runs (id, job_type, ref_id, attempt, status, target, error, started_at, finished_at)
         VALUES (?, 'security_mail', ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          uid('jr'),
          job.id,
          attempt,
          ok ? 'ok' : 'failed',
          String(job.mailbox || ''),
          sendErr || null,
          nowIso,
          new Date().toISOString()
        )
        .run();
    } catch {
      /* 留痕表缺失（迁移未执行）时静默跳过，不影响投递本身 */
    }

    if (ok) out.sent += 1;
    else out.failed += 1;
  }

  return out;
}

export interface SecurityMailStatusResult {
  ok: boolean;
  /** 安全邮箱是否已配置 */
  configured: boolean;
  /** 脱敏后的安全邮箱 */
  mailbox: string;
  delayHours: number;
  intervalMin: number;
  maxAttempts: number;
  job?: {
    status: string;
    attempt: number;
    maxAttempts: number;
    deliverAt: string;
    createdAt: string;
    lastError?: string;
  } | null;
}

/** 查询该用户安全邮箱通道的最新任务状态（同样不含验证码） */
export async function getSecurityMailStatus(
  env: any,
  userId: string,
  purpose: string
): Promise<SecurityMailStatusResult> {
  const cfg = await getSecurityMailboxConfig(env.DB);

  let job: any = null;
  try {
    job = await env.DB.prepare(
      `SELECT status, attempt, max_attempts, deliver_at, created_at, last_error
       FROM security_mail_queue
       WHERE user_id = ? AND purpose = ?
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(userId, purpose)
      .first();
  } catch {
    job = null;
  }

  return {
    ok: true,
    configured: !!cfg.mailbox,
    mailbox: cfg.mailbox ? maskEmail(cfg.mailbox) : '',
    delayHours: cfg.delayHours,
    intervalMin: cfg.intervalMin,
    maxAttempts: cfg.maxAttempts,
    job: job
      ? {
          status: String(job.status || 'pending'),
          attempt: Number(job.attempt) || 0,
          maxAttempts: Number(job.max_attempts) || cfg.maxAttempts,
          deliverAt: String(job.deliver_at || ''),
          createdAt: String(job.created_at || ''),
          lastError: job.last_error ? String(job.last_error) : undefined,
        }
      : null,
  };
}
