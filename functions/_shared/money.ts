/**
 * 金额精度统一工具（#12 缺陷修复 · 2026-09-20）
 * ------------------------------------------------------------------
 * 之前四舍五入函数在 6 个文件各写一份（round2 / roundAmount / roundPrice 散落），
 * 口径碰巧一致但无单一来源，后续改动极易漂移（硬规矩㉝：同源两处实现必须对得上）。
 * 统一到此处，所有服务端金额 / 单价精度只此一份：
 *   · roundAmount：金额保留 2 位小数（元）
 *   · roundPrice ：单价保留 4 位小数（规避移动均价滚动误差）
 * 均为纯函数、零副作用；null / undefined / NaN 归 0。
 */
/** 金额保留 2 位小数（元），规避浮点累加误差 */
export const roundAmount = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** 单价保留 4 位小数 */
export const roundPrice = (n: number): number => Math.round((Number(n) || 0) * 10000) / 10000;
