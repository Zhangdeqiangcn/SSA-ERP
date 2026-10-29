// POST /api/auth/security-mailbox — 安全邮箱备用通道
// 请求体：{ username, password, purpose, action }
//   action = 'enqueue' 申请排队（验证码延时投递到安全邮箱）
//   action = 'status'  查询最新排队/投递状态
//
// 为什么**不要求登录态**：这条通道的用途恰恰是「进不去系统时的备用取码路径」。
//   若要求先登录才能申请，等于把后路锁在系统内部——上一版方案正是因此被否决
//   （能登录的人自然也能看到验证码，起不到任何隔离作用）。
//
// 安全性由四点共同保证：
//   1) 必须提供正确的登录密码，且账号与密码错误返回同一提示，避免被用来探测账号；
//   2) 验证码不在任何接口、任何界面回传，只会投递到独立的安全邮箱；
//   3) 延时投递（默认 8 小时）+ 间隔重投（默认 10 分钟）；
//   4) 同一用途同时只允许存在一个排队任务，且有 24 小时申请冷却，防止安全邮箱被骚扰。
import { verifyPassword, json } from '../../_shared/auth';
import {
  enqueueSecurityMail,
  getSecurityMailStatus,
  PURPOSE_TEXT,
} from '../../_shared/verification';
import { runJobTick } from '../../_shared/jobs';

const ALLOWED_PURPOSES = new Set(['activate', 'change_password']);
const ALLOWED_ACTIONS = new Set(['enqueue', 'status']);

export async function onRequestPost(context: any) {
  const { request, env } = context;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const purpose = String(body.purpose ?? '').trim();
  const action = String(body.action ?? 'status').trim();

  if (!username || !password) return json({ error: '请输入用户名和密码' }, 400);
  if (!ALLOWED_PURPOSES.has(purpose)) return json({ error: '不支持的验证场景' }, 400);
  if (!ALLOWED_ACTIONS.has(action)) return json({ error: '不支持的操作' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  const u = user as any;
  if (!u) return json({ error: '用户名或密码错误' }, 401);

  const passOk = await verifyPassword(password, u.password_hash, u.salt);
  if (!passOk) return json({ error: '用户名或密码错误' }, 401);

  // 目前只有超级管理员需要邮箱验证码
  if (u.role !== 'super_admin') {
    return json({ error: '该账号无需邮箱验证码' }, 400);
  }

  // 与 send-code 保持一致：未通过审批的账号不允许走安全验证流程
  const status = String(u.status ?? 'active');
  if (status === 'pending' || status === 'rejected') {
    return json({ error: '账号尚未通过审批，无法进行安全验证' }, 403);
  }

  // 顺带推进到期任务：用户来查状态时，正好把已经到期的投递发出去。
  // 这样即使全局中间件从未触发（例如长期无人访问），用户一次查询就能闭环。
  //
  // 这里刻意「不阻塞等待」：SMTP 在极端情况下（对端无响应 + 重试一次）可能耗时数十秒，
  // 若同步等待会把「查询状态」这个轻量接口拖到超时。投递放到后台执行，
  // 本次返回的可能是投递前的状态，用户再查一次即可看到最新结果——安全性不受影响。
  try {
    const task = runJobTick(env, 'login').catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(task);
  } catch {
    /* 触发失败不影响本次状态查询 */
  }

  if (action === 'enqueue') {
    const r = await enqueueSecurityMail(env, u, purpose);
    if (!r.ok) return json({ error: r.error }, 400);
    return json({
      ok: true,
      action: 'enqueue',
      purpose,
      purposeText: PURPOSE_TEXT[purpose],
      mailbox: r.mailbox,
      deliverAt: r.deliverAt,
      delayHours: r.delayHours,
      intervalMin: r.intervalMin,
      maxAttempts: r.maxAttempts,
      attempt: r.attempt,
      existing: !!r.existing,
      message: r.existing
        ? '已存在排队中的安全邮箱投递任务，无需重复申请'
        : `已登记：验证码将在 ${r.delayHours} 小时后投递到安全邮箱，并在此后 ${r.intervalMin} 分钟再投递一次`,
    });
  }

  const st = await getSecurityMailStatus(env, u.id, purpose);
  return json({
    action: 'status',
    purpose,
    purposeText: PURPOSE_TEXT[purpose],
    ...st,
  });
}
