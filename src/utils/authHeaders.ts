// 统一的「带登录令牌的请求头」出口（V3.17.9 新增）
//
// ── 为什么需要它 ────────────────────────────────────────────────
// 本项目里有多处用**原生 fetch** 直打后端（审计留痕、状态同步等），而不是走
// `src/services/api.ts`（axios，会自动注入令牌）或 `src/services/b2Api.ts`。
// 这些原生 fetch 调用点历史上各写各的，绝大多数**漏了 Authorization 头**：
// 后端 `getUserFromRequest()` 取不到 Bearer → 一律返回 401 →
// 调用方又是 `.catch(() => {})` 静默吞掉 ——
// 表现就是「功能看起来已经做了、代码也写得像模像样，数据其实一条都没落库」。
// 这是最隐蔽的一类缺陷：不报错、不白屏、只是什么都没发生。
//
// 已知的真实案例（本次修复）：
//   · src/stores/auditStore.ts      → POST /api/audit/logs 从不带令牌，审计从未落 D1
//   · src/components/common/DataTable.tsx → 导出留痕同上，导致「导出管控」形同虚设
//
// ── 为什么令牌键必须只有一处定义 ────────────────────────────────
// 令牌键 `ssa-erp-auth-token` 目前已在 4 个文件里各写一遍：
//   services/api.ts、services/b2Api.ts、stores/persistStorage.ts、本文件。
// 历史上曾有代码读 `'token'`（该键从未被写入），导致整域请求 401 而无人察觉。
// 本文件是**新代码的唯一推荐入口**，请勿再抄一份字面量。
//
// 边界：本文件不依赖 axios，也不触发 401 跳登录 —— 因为审计留痕这类调用
// 失败时不应把用户踢出当前页面。

const TOKEN_KEY = 'ssa-erp-auth-token';

/** 读取当前登录令牌；未登录 / 读取失败返回 null（绝不抛错） */
export function getAuthToken(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

/**
 * 构造请求头：令牌存在时附加 `Authorization: Bearer <token>`。
 * @param extra 额外头（如 `{ 'Content-Type': 'application/json' }`），会覆盖同名项
 */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(extra || {}) };
}
