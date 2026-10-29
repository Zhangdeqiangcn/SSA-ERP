// 凭证分录服务端校验（V3.15.9 · 补后端借贷平衡闸门）
//
// 为什么要有这个文件：
//   借贷平衡校验此前**只存在于前端**（src/utils/voucher.ts 的 validateVoucher）。
//   任何绕过界面的写入 —— 直接调接口、脚本导入、第三方集成、未来的人工智能助手 ——
//   都能把一张借贷不平的凭证写进账套。账错了是最贵的错误，且往往到月结才发现。
//   这里把它下沉为服务端强制闸门，与前端形成"两道闸"。
//
// 与前端口径对齐，但有三处**刻意不同**（都是踩过的坑，改动前请先读完）：
//   ① 不校验"金额不能为负数"：红字冲销凭证（buildReversalVoucher）借贷双方取负，
//      金额必须为负才是正确的会计处理。前端那条规则只适用于表单手工录入期，
//      若照搬会把**所有红冲凭证全部拒掉**。
//   ② 不强制"至少 2 行分录"：单行凭证必然借贷不平，已被平衡规则覆盖，
//      无需重复报错，也避免误伤合法的极简凭证。
//   ③ 只校验分录本身，**不拦截 posted/reversed 状态**的写入：
//      过账与红冲走的是 persistVoucher「整单 PUT」（整张凭证含分录一起回写），
//      若按状态禁止修改分录，会直接打断过账与冲销流程。
//
// 校验项（与前端 validateVoucher 一致的部分）：
//   1) 每行必须有会计科目（科目编码或科目名称至少填一个）
//   2) 每行借方与贷方不能同时有值
//   3) 借方合计必须等于贷方合计（容差 0.005 元，规避浮点误差）
//   4) 借贷合计不能同时为 0（空凭证无意义）

/** 借贷平衡允许的最大误差（元）——与前端 BALANCE_TOLERANCE 保持一致 */
export const VOUCHER_BALANCE_TOLERANCE = 0.005;

/** 金额保留 2 位，规避浮点累加误差 */
import { roundAmount } from './money';

export interface VoucherGuardResult {
  valid: boolean;
  errors: string[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
}

/**
 * 校验凭证分录行。
 * @param items 分录行数组（前端 VoucherItem 形状：{ lineNo, summary, accountCode, accountName, debit, credit }）
 * @returns valid=false 时 errors 为可直接展示给用户的中文提示
 */
export function validateVoucherItems(items: any[]): VoucherGuardResult {
  const errors: string[] = [];
  const list = Array.isArray(items) ? items : [];

  let totalDebit = 0;
  let totalCredit = 0;

  list.forEach((it: any, idx: number) => {
    const line = Number(it?.lineNo) || idx + 1;
    const d = Number(it?.debit) || 0;
    const c = Number(it?.credit) || 0;

    if (!it?.accountCode && !it?.accountName) {
      errors.push(`第 ${line} 行：请选择会计科目`);
    }
    if (d !== 0 && c !== 0) {
      errors.push(`第 ${line} 行：借方和贷方只能填写一边`);
    }

    totalDebit += d;
    totalCredit += c;
  });

  totalDebit = roundAmount(totalDebit);
  totalCredit = roundAmount(totalCredit);
  const difference = roundAmount(totalDebit - totalCredit);

  if (totalDebit === 0 && totalCredit === 0) {
    errors.push('凭证金额不能为 0');
  } else if (Math.abs(difference) >= VOUCHER_BALANCE_TOLERANCE) {
    errors.push(
      `借贷不平衡：借方合计 ${totalDebit.toFixed(2)}，贷方合计 ${totalCredit.toFixed(2)}，差额 ${difference.toFixed(2)}`
    );
  }

  return { valid: errors.length === 0, errors, totalDebit, totalCredit, difference };
}

/**
 * 条目化封装：给接口用的"要么放行、要么返回 400 响应"。
 * 返回 null 表示校验通过；非 null 为可直接 return 的错误响应。
 * 校验通过时会**就地**把合计写回 body.totalDebit / body.totalCredit ——
 * 合计应由服务端从分录行反推，而不是直接采信客户端传来的数字。
 */
export function guardVoucherItems(body: any): { response: any } | null {
  // V3.45.0 修正「空分录数组」语义（此前是一个能让已过账凭证凭空消失金额的漏洞）：
  //   旧代码 `items.length === 0 → return null`（放行），而 PUT 端点的写入条件
  //   `if (body.items && Array.isArray(body.items))` 对 `[]` 判真 → 执行
  //   `DELETE FROM voucher_items WHERE voucher_id = ?` 后插入 0 行
  //   ⇒ 一张已过账凭证变成「总额保留、明细 0 行」，借贷平衡校验永远通过，返回成功无报错。
  // 现在区分两种语义：
  //   undefined / 非数组 → 本次不携带分录（调用方只改表头），放行；
  //   空数组           → 显式要求"清空分录"，拒绝。
  if (!body || body.items === undefined || !Array.isArray(body.items)) return null;
  if (body.items.length === 0) {
    return {
      response: {
        error: '凭证分录不能为空：如需修改已记账凭证的金额，请通过红字冲销后重新录入',
        code: 'VOUCHER_EMPTY_ITEMS',
        errors: ['凭证分录不能为空'],
      },
    };
  }

  const r = validateVoucherItems(body.items);
  if (!r.valid) {
    return {
      response: {
        error: r.errors[0],
        errors: r.errors,
        code: 'VOUCHER_UNBALANCED',
        totalDebit: r.totalDebit,
        totalCredit: r.totalCredit,
        difference: r.difference,
      },
    };
  }

  // 合计以服务端反推为准，避免"分录改了、合计没跟着改"的错位
  body.totalDebit = r.totalDebit;
  body.totalCredit = r.totalCredit;
  return null;
}
