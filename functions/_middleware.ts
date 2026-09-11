// 全局懒执行钩子（Cloudflare Pages Functions 中间件）
//
// 用途：为「安全邮箱延时投递」提供一个到期就能发信的执行点。
// Cloudflare Pages Functions 没有定时任务（Cron Trigger）能力，而本机制要求
// 「申请后 8 小时」自动投递、再间隔 10 分钟重投一次——因此利用「任何 API 请求
// 都会经过中间件」这一特性，顺带检查一次到期任务。
//
// 两点设计取舍：
//   1) 60 秒节流：避免给每个请求都追加一次数据库查询；
//   2) 不阻塞响应：投递放到 waitUntil 后台执行，主请求立即返回。
//
// 可靠性说明：本钩子只是「加速器」。即使它从未触发（例如长期无人访问），
// 用户在登录或查询通道状态时（login / security-mailbox 接口）也会触发同一段逻辑，
// 功能不会因此失效。任何异常都被吞掉，绝不影响主请求。
import { processSecurityMailQueue } from './_shared/verification';

const TICK_INTERVAL_MS = 60 * 1000;

/** 模块级节流标记：warm 实例复用，冷启动重置（最多多查几次，无副作用） */
let lastTick = 0;

export async function onRequest(context: any) {
  const { next, env, request } = context;
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') && Date.now() - lastTick > TICK_INTERVAL_MS) {
      lastTick = Date.now();
      const task = processSecurityMailQueue(env).catch(() => {});
      if (typeof context.waitUntil === 'function') {
        context.waitUntil(task); // 后台执行，不阻塞本次响应
      }
    }
  } catch {
    /* 钩子异常不得影响主请求 */
  }
  return next();
}
