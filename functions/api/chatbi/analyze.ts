/**
 * POST /api/chatbi/analyze —— 自然语言查询分析
 *
 * ★ 为什么会有这个文件（V3.11.2 修复）：
 * 前端 `src/pages/Analytics/ChatBI.tsx` 调用 `POST /api/chatbi/analyze`，
 * 逻辑写在 `./index.ts` 的 `onRequest` 里。但 Pages Functions 的 `index.ts`
 * 只匹配精确根路径 `/api/chatbi`；子路径 `/analyze` 没有对应文件 → 请求被路由层
 * 拒为 **405 Method Not Allowed**（不是回退 HTML，所以更容易被误判成"鉴权问题"）。
 *
 * 实测（生产环境，2026-09-16）：
 *   POST /api/chatbi/analyze → 405（空响应体） ❌
 *   POST /api/chatbi         → 401 {"error":"未登录"} ✅ 根路径正常
 * 表现：ChatBI 页面任何提问都失败，前端 catch 后只显示「请求失败」，看不出是路由问题。
 *
 * 逻辑只在 `./index.ts` 一处，本文件仅转发。
 */
import { onRequest } from './index';

export { onRequest };
