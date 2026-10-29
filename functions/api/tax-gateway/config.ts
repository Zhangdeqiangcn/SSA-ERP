/**
 * GET/POST/DELETE /api/tax-gateway/config —— 金税网关配置管理
 *
 * ★ 为什么会有这个文件（V3.11.2 修复）：
 * 前端 `src/pages/Settings/TaxConfig/TaxConfigPage.tsx` 三处调用的完整路径是
 * `/api/tax-gateway/config`，而逻辑写在 `./index.ts` 里。
 * Cloudflare Pages Functions 的路由规则是：**`index.ts` 里的 `onRequestGet/Post/Delete`
 * 只匹配精确根路径 `/api/tax-gateway`**，子路径 `/config` 必须有对应的文件才会被路由命中，
 * 否则请求会落到 SPA 回退 —— 返回 `200 text/html`（首页 HTML），前端 `resp.json()` 直接抛错。
 *
 * 实测（生产环境，2026-09-16）：
 *   GET /api/tax-gateway/config  → 200 text/html   ❌ 落到回退，端点等于不存在
 *   GET /api/tax-gateway         → 401 application/json ✅ 根路径正常
 *   GET /api/tax-gateway/verify  → 200 application/json ✅ 因为有 verify.ts
 * 表现：税务配置页「加载/保存/清除配置」三个操作**在生产全部失败**，且不报有意义的错。
 *
 * ★ 为什么是「建文件」而不是「前端改路径」：
 *   1. 旁边 `verify.ts` 就是这个模式，保持一致；
 *   2. 前端零改动，避免漏改某处；
 *   3. 路径语义更清楚（`/config` 表达"配置"这个资源）。
 *   逻辑只在 `./index.ts` 一处，本文件仅转发 —— 绝不做第二份实现，避免改一处漏一处。
 */
import { onRequestGet, onRequestPost, onRequestDelete } from './index';

export { onRequestGet, onRequestPost, onRequestDelete };
