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
import { errorResponse } from './_shared/errors';

const TICK_INTERVAL_MS = 60 * 1000;

/** 模块级节流标记：warm 实例复用，冷启动重置（最多多跑一次，无副作用） */
let lastTick = 0;

export async function onRequest(context: any) {
  const { next, env, request } = context;

  // ── ★ V3.12.0 新增：全站异常兜底（一处修改覆盖全部端点）──────────────
  // 为什么要有这一层（实测发现的系统性缺陷）：
  //   机器扫描 `scripts/_audit_trycatch.mjs` 显示，100 个端点文件里有 **60 个**
  //   写操作端点（POST/PUT/PATCH/DELETE）的 `.run()` **没有包 try/catch**。
  //   平时它们 100% 正常——但只要数据库抛一次错（CHECK 约束 / NOT NULL /
  //   唯一冲突 / 列不存在），异常就会一路冒到 Cloudflare 平台，
  //   返回的是平台的 **500 HTML 错误页**，而不是 JSON。
  //   前端 `res.json()` 解析 HTML → 抛 SyntaxError → **白屏**，
  //   用户只看到「服务器开了个小差」，真实原因（比如「供应商状态不能填 active」）
  //   被埋在三层之下，几乎不可能排查。
  //
  //   逐个给 60 个文件补 try/catch 既慢又危险（60 次改动 = 60 次出错机会），
  //   而根中间件站在**所有请求的必经之路**上，一次 `await next()` 就能全部兜住。
  //   **这是「修机制」而不是「修 60 个症状」。**
  //
  // 与「端点内显式校验」的关系：两者都要，不可替代。
  //   - 这一层保证「绝不返回 HTML、绝不白屏」（安全网）；
  //   - 端点内的枚举/业务校验保证「错误文案说人话」（可读性）。
  //   只留安全网，用户拿到的是通用的「操作失败」；只留端点校验，漏网的照样白屏。
  //
  // 只兜 /api/ 路径：静态资源（HTML/JS/CSS）走平台默认行为，不该被改成 JSON。
  //
  // ★ 顺序上的一个坑（我自己踩到并已修正）：不能「API 就提前 return」。
  //   第一次写成 `if (isApi) { ... return await next(); }`，结果 tick 那段
  //   **永远不会执行** —— 后台任务钩子被静默废掉，而这种错误没有任何报错。
  //   所以正确顺序是：先跑 tick（两个分支都需要），再分流。
  let isApi = false;
  try { isApi = new URL(request.url).pathname.startsWith('/api/'); } catch { isApi = false; }

  try {
    if (isApi && Date.now() - lastTick > TICK_INTERVAL_MS) {
      lastTick = Date.now();
      const task = runJobTick(env, 'middleware').catch(() => {});
      if (typeof context.waitUntil === 'function') {
        context.waitUntil(task); // 后台执行，不阻塞本次响应
      }
    }
  } catch {
    /* 钩子异常不得影响主请求 */
  }

  if (isApi) {
    try {
      return await next();
    } catch (e: any) {
      // 本工程不设 CORS 头（前端与 Functions 同域部署），故无需补响应头。
      return errorResponse(e, '请求处理');
    }
  }

  return next();
}
