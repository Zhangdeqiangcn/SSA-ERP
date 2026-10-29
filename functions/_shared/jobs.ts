// 后台任务调度（V3.1.0 · 评测 H-04 整改）
//
// 背景：Cloudflare Pages Functions 没有定时任务（Cron Trigger）能力，
//   V2.96.1 把「安全邮箱延时投递」做成了「任意接口请求顺带触发」（见 _middleware.ts）。
//   该做法有三个硬伤：
//     ① 没人访问 → 任务永不触发，8 小时延时可能变成好几天；
//     ② 节流变量是模块级变量，不跨实例共享，冷启动即重置；
//     ③ 过程无留痕，失败被 catch 吞掉，完全不可观测、不可重放。
//
// 整改思路（对应报告建议 ③）：
//   · 把「触发」与「执行」解耦：对外只暴露一个推进接口 POST /api/system/jobs，
//     由**外部定时源**（Windows 计划任务 / 第三方调度）按固定周期调用，
//     投递时间从「不可控」变成「可预期」；
//   · 每一次推进写一行 job_ticks、每一次真实投递写一行 job_runs，
//     失败留 error，管理员在安全中心即可看到「什么时候跑过、跑成什么样」；
//   · 失败任务支持重放（replay），不需要人工改数据库；
//   · 中间件「顺带触发」保留但降级为兜底（source=middleware），不再是唯一依靠。

import { json, uid } from './auth';
import { processSecurityMailQueue } from './verification';
import { replayDegradedAudit } from './auditLog';

export type TickSource = 'scheduler' | 'middleware' | 'manual' | 'login';

export interface TickResult {
  ok: boolean;
  source: string;
  processed: number;
  sent: number;
  failed: number;
  durationMs: number;
  /** V3.91.0：本次 tick 回收的审计降级记录数 */
  auditRecovered?: number;
  auditFailed?: number;
  error?: string;
}

/** 单次推进最多处理的任务数（控制单次请求耗时） */
export const DEFAULT_TICK_LIMIT = 10;

/** 读取任务调度配置：外部调度令牌、建议周期、是否允许外部调度 */
export async function getJobConfig(DB: any): Promise<{
  token: string;
  intervalMin: number;
  enabled: boolean;
}> {
  let map: Record<string, string> = {};
  try {
    const rows = await DB.prepare(
      `SELECT key, value FROM system_config
       WHERE key IN ('jobs.tick_token','jobs.tick_interval_min','jobs.tick_enabled')`
    ).all();
    for (const r of rows?.results || []) map[(r as any).key] = (r as any).value ?? '';
  } catch {
    map = {};
  }
  const n = parseInt(String(map['jobs.tick_interval_min'] ?? '').trim(), 10);
  return {
    token: String(map['jobs.tick_token'] || '').trim(),
    intervalMin: Number.isFinite(n) && n > 0 ? n : 10,
    enabled: String(map['jobs.tick_enabled'] ?? '1').trim() !== '0',
  };
}

/**
 * 生成（或重新生成）外部调度令牌。
 * 只有管理员可调用；令牌用于定时任务在请求头带 X-Job-Token 触发推进。
 */
export async function rotateJobToken(DB: any): Promise<string> {
  const token = 'jt_' + uid('k') + crypto.randomUUID().replace(/-/g, '');
  await DB.prepare(
    `INSERT INTO system_config (key, value, updated_at) VALUES ('jobs.tick_token', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(token)
    .run();
  return token;
}

/** 外部调度令牌校验（恒定时间比较，避免计时侧信道） */
export async function verifyJobToken(request: Request, DB: any): Promise<boolean> {
  const got = String(request.headers.get('X-Job-Token') || '').trim();
  if (!got) return false;
  const cfg = await getJobConfig(DB);
  if (!cfg.enabled || !cfg.token) return false;
  return timingSafeEqual(got, cfg.token);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * 推进一次后台任务。所有触发路径（外部调度 / 手动 / 中间件 / 登录）都必须走这里，
 * 保证「任何一次执行都有留痕」。异常被收敛为 failed 记录，绝不影响调用方主流程。
 */
export async function runJobTick(
  env: any,
  source: TickSource,
  limit = DEFAULT_TICK_LIMIT
): Promise<TickResult> {
  const started = Date.now();
  const id = uid('jt');
  const startedAt = new Date(started).toISOString();

  let out = { processed: 0, sent: 0, failed: 0 };
  let error = '';
  try {
    out = await processSecurityMailQueue(env, limit);
  } catch (e: any) {
    error = String(e?.message || e || '未知错误');
    console.error('[jobs] tick failed', source, e);
  }

  // V3.91.0：每次 tick 顺带回收审计降级记录（主表恢复后自动补写，成功即删降级行）
  let audit = { recovered: 0, failed: 0 };
  try {
    const a = await replayDegradedAudit(env.DB, limit);
    audit.recovered = a.recovered;
    audit.failed = a.failed;
  } catch (e: any) {
    console.error('[jobs] audit replay failed', source, e);
  }

  const finished = Date.now();
  const result: TickResult = {
    ok: !error,
    source,
    processed: out.processed,
    sent: out.sent,
    failed: out.failed,
    durationMs: finished - started,
    auditRecovered: audit.recovered,
    auditFailed: audit.failed,
    error: error || undefined,
  };

  // 留痕失败不得影响调用方
  try {
    await env.DB.prepare(
      `INSERT INTO job_ticks (id, source, status, processed, sent, failed, duration_ms, error, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        source,
        result.ok ? 'ok' : 'failed',
        result.processed,
        result.sent,
        result.failed,
        result.durationMs,
        error || null,
        startedAt,
        new Date(finished).toISOString()
      )
      .run();
  } catch {
    /* 留痕表缺失（迁移未执行）时静默跳过 */
  }

  return result;
}

/** 任务队列概览：待投递 / 成功 / 失败数量，最近一次推进，最近失败原因 */
export async function getJobOverview(DB: any): Promise<{
  ok: boolean;
  queue: { pending: number; due: number; done: number; failed: number };
  ticks: Array<{
    id: string;
    source: string;
    status: string;
    processed: number;
    sent: number;
    failed: number;
    durationMs: number;
    error?: string;
    startedAt: string;
  }>;
  lastError?: string;
}> {
  const empty = { pending: 0, due: 0, done: 0, failed: 0 };
  let queue = { ...empty };
  let ticks: any[] = [];

  try {
    const rows = await DB.prepare(
      `SELECT status, COUNT(*) AS n,
              SUM(CASE WHEN status='pending' AND deliver_at <= ? THEN 1 ELSE 0 END) AS due
       FROM security_mail_queue GROUP BY status`
    )
      .bind(new Date().toISOString())
      .all();
    for (const r of (rows?.results || []) as any[]) {
      const s = String(r.status || '');
      const n = Number(r.n) || 0;
      if (s === 'pending') queue.pending = n;
      else if (s === 'done') queue.done = n;
      else if (s === 'failed') queue.failed = n;
    }
    queue.due = Number(((rows?.results || []) as any[]).reduce((a, r) => a + (Number(r.due) || 0), 0)) || 0;
  } catch {
    queue = { ...empty };
  }

  try {
    const t = await DB.prepare(
      `SELECT id, source, status, processed, sent, failed, duration_ms, error, started_at
       FROM job_ticks ORDER BY started_at DESC LIMIT 10`
    ).all();
    ticks = ((t?.results || []) as any[]).map((r) => ({
      id: String(r.id),
      source: String(r.source || ''),
      status: String(r.status || ''),
      processed: Number(r.processed) || 0,
      sent: Number(r.sent) || 0,
      failed: Number(r.failed) || 0,
      durationMs: Number(r.duration_ms) || 0,
      error: r.error ? String(r.error) : undefined,
      startedAt: String(r.started_at || ''),
    }));
  } catch {
    ticks = [];
  }

  return {
    ok: true,
    queue,
    ticks,
    lastError: ticks.find((t) => t.status === 'failed')?.error,
  };
}

/**
 * 重放失败任务：把投递失败的任务重新置为待投递，并从现在起尽快再投一次。
 * 不删除原记录，保留 job_runs 里已有的尝试痕迹，便于排障。
 */
export async function replayFailedJobs(DB: any): Promise<{ reset: number }> {
  const now = new Date().toISOString();
  const res = await DB.prepare(
    `UPDATE security_mail_queue
     SET status = 'pending', attempt = 0, deliver_at = ?, last_error = NULL, updated_at = ?
     WHERE status = 'failed'`
  )
    .bind(now, now)
    .run();
  return { reset: res?.meta?.changes ?? 0 };
}

/** 统一响应：任务接口鉴权失败时复用 */
export function jobUnauthorized(): Response {
  return json({ error: '需要管理员权限或有效的调度令牌' }, 401);
}
