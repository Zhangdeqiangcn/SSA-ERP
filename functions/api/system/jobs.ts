// 后台任务调度接口（V3.1.0 · 评测 H-04 整改）
//
// 定位：Cloudflare Pages Functions 无定时任务，故把「触发权」交给外部定时源
// （Windows 计划任务 / 第三方调度），本接口是唯一的推进入口：
//   GET  /api/system/jobs         查看队列概览与执行留痕（管理员）
//   POST /api/system/jobs         推进 / 重放 / 轮换调度令牌
//
// 鉴权二选一：
//   ① 管理员登录态（super_admin / admin）→ 全部动作；
//   ② 请求头 X-Job-Token 与系统配置 jobs.tick_token 一致 → 仅允许「推进」。
//     外部调度令牌只具备「触发执行」这一最小能力，不能读队列、不能重放，
//     即使令牌泄露，攻击者也无法借此查看投递目标或重放任务。

import { getUserFromRequest, json } from '../../_shared/auth';
import {
  getJobConfig,
  getJobOverview,
  jobUnauthorized,
  replayFailedJobs,
  rotateJobToken,
  runJobTick,
  verifyJobToken,
} from '../../_shared/jobs';
// V3.5.0 B6：补齐写审计（重放失败任务、轮换调度令牌是两个高影响的管理动作）
import { writeAudit } from '../../_shared/auditLog';

/**
 * 审计主体解析（B6）。
 * 本端点有两种调用方：管理员登录态 与 外部调度令牌。审计要能区分二者 ——
 * 「谁触发了这次推进」在排查异常投递时是首要信息。令牌调用方没有用户身份，
 * 故用一个显式的伪主体 `{ id: 'job-token', name: '外部调度令牌' }`，
 * 而不是留空 —— 留空会让审计条目看起来像「无人操作」。
 */
async function resolveActor(request: Request, env: any): Promise<{ actor: { id: string | null; name: string }; orgId: string | null }> {
  const user = await getUserFromRequest(request, env.DB);
  if (user) return { actor: { id: user.id, name: user.name || user.username || '未知用户' }, orgId: user.org_id ?? null };
  return { actor: { id: 'job-token', name: '外部调度令牌' }, orgId: null };
}

async function isPrivileged(request: Request, env: any): Promise<boolean> {
  const user = await getUserFromRequest(request, env.DB);
  return !!user && (user.role === 'super_admin' || user.role === 'admin');
}

/** 中文来源名，便于留痕直接可读 */
const SOURCE_TEXT: Record<string, string> = {
  scheduler: '外部定时调度',
  middleware: '请求顺带触发（兜底）',
  manual: '管理员手动推进',
  login: '登录时触发',
};

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const privileged = await isPrivileged(request, env);
  const viaToken = !privileged && (await verifyJobToken(request, env.DB));
  if (!privileged && !viaToken) return jobUnauthorized();

  const overview = await getJobOverview(env.DB);
  const cfg = await getJobConfig(env.DB);

  return json({
    ...overview,
    config: {
      configured: !!cfg.token,
      enabled: cfg.enabled,
      intervalMin: cfg.intervalMin,
      // 令牌只在管理员身份下回显（外部调度令牌自身无权读取令牌）
      token: privileged ? cfg.token : undefined,
    },
    sourceText: SOURCE_TEXT,
  });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const privileged = await isPrivileged(request, env);
  const viaToken = !privileged && (await verifyJobToken(request, env.DB));
  if (!privileged && !viaToken) return jobUnauthorized();

  let body: any = {};
  try {
    const raw = await request.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const action = String(body.action || 'run');
  const limit = Math.min(Math.max(parseInt(String(body.limit ?? ''), 10) || 10, 1), 50);

  // 外部调度令牌：仅最小权限（推进），不得重放或轮换令牌
  if (viaToken && action !== 'run') {
    return json({ error: '调度令牌仅具备「推进任务」权限' }, 403);
  }

  if (action === 'replay') {
    const r = await replayFailedJobs(env.DB);
    const who = await resolveActor(request, env);
    // B6 审计：重放把「已判定失败」的任务重新排入投递队列 —— 可能造成重复发信，
    //   因此必须记「重放了几个」以及是谁按的。
    await writeAudit(env.DB, {
      orgId: who.orgId,
      actor: who.actor,
      entity: 'system_jobs',
      entityId: 'replay',
      action: 'replay',
      summary: `重放失败任务：${r.reset} 个任务重新排队（可能产生重复投递，请核对收件方是否重复收到）`,
    });
    return json({ ok: true, reset: r.reset, message: `已重新排队 ${r.reset} 个失败任务` });
  }

  if (action === 'rotate-token') {
    const token = await rotateJobToken(env.DB);
    const who = await resolveActor(request, env);
    // B6 审计：轮换令牌会让旧令牌立即失效（外部定时任务会因此报错直到配置更新）。
    //   这是「换锁」动作，必须留痕；令牌值本身绝不进审计（审计记录会被很多人看到）。
    await writeAudit(env.DB, {
      orgId: who.orgId,
      actor: who.actor,
      entity: 'system_jobs',
      entityId: 'tick_token',
      action: 'rotate',
      summary: '轮换外部调度令牌（旧令牌即刻失效，需同步更新定时任务配置）',
    });
    return json({ ok: true, token, message: '调度令牌已重新生成，请同步更新定时任务配置' });
  }

  const cfg = await getJobConfig(env.DB);
  if (viaToken && !cfg.enabled) {
    return json({ error: '外部调度已在系统配置中停用（jobs.tick_enabled=0）' }, 403);
  }

  const result = await runJobTick(env, viaToken ? 'scheduler' : 'manual', limit);
  return json({
    ok: result.ok,
    source: result.source,
    sourceText: SOURCE_TEXT[result.source] || result.source,
    processed: result.processed,
    sent: result.sent,
    failed: result.failed,
    durationMs: result.durationMs,
    error: result.error,
    message: result.ok
      ? `本次推进完成：处理 ${result.processed} 个、投递成功 ${result.sent} 个、失败 ${result.failed} 个`
      : `推进失败：${result.error || '未知错误'}`,
  });
}
