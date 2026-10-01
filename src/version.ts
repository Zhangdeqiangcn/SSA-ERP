// ============================================================
// SSA ERP 单一版本来源 (single source of truth)
// ------------------------------------------------------------
// ⚠️ 版本管理铁律（每次更新都必须遵守）：
//   1. 修改本文件的 APP_VERSION / APP_VERSION_LABEL；
//   2. 同步修改 package.json 的 "version" 字段，二者必须一致；
//   3. 在 .workbuddy/memory/MEMORY.md 的「版本沿革」追加一条变更说明；
//   4. 同步更新 src/content/manual.tsx 的「版本更新记录」章节（登记本次变更），
//      并在「设置 → 帮助中心」「侧边栏」或 src/config/searchIndex.ts 中补录新增功能入口；
//   5. 同步更新 docs/ssa-erp-master-plan.md（顶部基线 + §八版本沿革）。
// 任何改动若跳过版本号同步，都视为未完成。
// ============================================================
export const APP_NAME = 'SSA ERP 企业资源管理平台';
export const APP_VERSION = '3.36.0';
export const APP_VERSION_LABEL = 'V3.36.0';
export const APP_BUILD_DATE = '2026-10-02';
