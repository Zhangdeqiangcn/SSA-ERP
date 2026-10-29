// 质检扣留「占用实物」状态词表 —— 全链路唯一来源
//
// ★ 为什么必须集中（V3.113.3 P0-3 实测踩坑）：
//   扣留单的「生效态」决定两件事：
//     ① 冻结量要不要写进库存台账（inventory_records.frozen_quantity）
//     ② 出库时这批料算不算「可用」
//   这两处如果各写一份清单，迟早会分叉：
//     - PUT 放行回冲用一份（含 rejected）
//     - DELETE 删除回冲用另一份（不含 rejected）
//   分叉后果：判不合格但未处置的料，删单时冻结量不回冲 → 物料被永久锁死。
//
// 语义边界（关键）：
//   rejected =「已判定不合格，但尚未处置（未报废/未返工/未退货）」。
//   实物仍在库、仍不可用 → **必须继续占用可用量**，不能解冻。
//   只有 released（已放行，料已处置或退回可用）才不占用。
//
// 与前端 src/utils/supply.ts 的 isHoldActive 严格对齐（前后端口径分裂会重演本缺陷）。
export const HOLD_OCCUPYING_STATUSES: readonly string[] = [
  'pending',   // 待检
  'active',    // 生效（扣留中）
  'rejected',  // 判定不合格但未处置 → 实物仍占库
  'open',      // 开启
  'inspecting',// 检验中
];

/** 该扣留状态是否占用实物（要冻结） */
export function holdOccupiesStock(status: unknown): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return true; // 状态缺失 → 保守占用（宁可锁住也不误放）
  if (s === 'released' || s === 'passed') return false; // 已放行
  return HOLD_OCCUPYING_STATUSES.includes(s);
}
