// 全局任务兜底钩子（Cloudflare Pages Functions 中间件）
//
// 【V3.1.0 变更 · 评测 H-04 整改】本钩子已从「主要执行点」降级为「兜底」。
//
// 旧做法的问题：Cloudflare Pages Functions 没有定时任务，于是把「安全邮箱延时投递」
//   做成「任何接口请求顺带触发」。这带来三个硬伤：
//     ① 长时间无人访问 → 任务永不触发，8 小时延时可能拖成好几天；
//     ② 节流变量 lastTick 是模块级变量，不跨实例共享，冷启动即重置；
//     ③ waitUntil 后台执行的失败被 catch 吞掉，故障完全不可观测。
//
// 新做法：由**外部定时源**（Windows 计划任务 / 第三方调度）按固定周期调用
//   POST /api/system/jobs（带 X-Job-Token），投递时间因此可预期；
//   本钩子保留，作用是「万一外部调度没配上，仍有机会被顺带推一把」，
//   并且现在每次执行都会写入 job_ticks 留痕，失败原因入库、可在安全中心查看。
//
// 两点设计取舍（沿用）：
//   1) 60 秒节流：避免每个请求都追加一次数据库查询；
//   2) 不阻塞响应：投递放到 waitUntil 后台执行，主请求立即返回。
//
// 可靠性说明：即使本钩子从未触发，用户在登录或查询通道状态时也会触发同一段逻辑，
// 功能不会失效。任何异常都被吞掉，绝不影响主请求。
import { runJobTick } from './_shared/jobs';

const TICK_INTERVAL_MS = 60 * 1000;

/** 模块级节流标记：warm 实例复用，冷启动重置（最多多跑一次，无副作用） */
let lastTick = 0;

export async function onRequest(context: any) {
  const { next, env, request } = context;
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') && Date.now() - lastTick > TICK_INTERVAL_MS) {
      lastTick = Date.now();
      const task = runJobTick(env, 'middleware').catch(() => {});
      if (typeof context.waitUntil === 'function') {
        context.waitUntil(task); // 后台执行，不阻塞本次响应
      }
    }
  } catch {
    /* 钩子异常不得影响主请求 */
  }
  return next();
}
