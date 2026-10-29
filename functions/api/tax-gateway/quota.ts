/**
 * GET /api/tax-gateway/quota —— 查询今日配额
 *
 * ★ 为什么会有这个文件（V3.11.2 修复）：
 * `./index.ts` 里有一个完整实现的 `onRequestQuota`，但 **Pages Functions 只认
 * `onRequest` 或 `onRequest<HTTP方法名>`**（Get/Post/Put/Delete/...）。
 * `Quota` 不是 HTTP 方法，所以这个导出**从未被任何路由命中过** —— 是个写好了却
 * 接错线的功能，且从外部看完全像"已经实现"，属误导性死代码。
 *
 * 实测（生产环境，2026-09-16）：GET /api/tax-gateway/quota → 200 text/html（落到 SPA 回退）。
 *
 * 这里按 Pages 的约定转接成 `onRequestGet`。
 * 注：当前前端**尚未调用**该端点（税务配置页只调 /config 与 /verify），
 * 本文件属「把已实现的能力接对线」，未来要做配额展示可直接用，不必重写。
 */
import { onRequestQuota } from './index';

export const onRequestGet = onRequestQuota;
