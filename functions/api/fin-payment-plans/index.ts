// 付款计划集合端点（C1 财务域 · 父子表）
// GET  /api/fin-payment-plans   列表（分页 / keyword / RLS，含每期明细）
// POST /api/fin-payment-plans   创建（计划 + installments 一次性写入）
//
// ── 为什么不用通用实体路由 /api/entities/finPaymentPlan ──────────────
// `PaymentPlan.installments?: PaymentInstallment[]` 是嵌套数组。
// 通用路由的 pickSnake 只挑 ENTITY_RESOURCES 里登记过的列，
// **installments 未登记 → 静默丢弃且不报错**。
// 后果正是 BOM 轮次踩过的同款坑：界面顶层计划全都在（看不出异常），
// 但展开没有分期、B11 的「逐期付款 + 预付款占用供应商信用」全部失效，
// 且 save 返回 201 成功。
//
// 因此走 `_shared/parentChild.ts`：父表 fin_payment_plans + 子表
// fin_payment_plan_installments（一期一行，可 SQL 统计「哪几期还没付」）。
//
// ── V3.19.0：付款闸门（三单匹配）────────────────────────────────────
// 「申请付款」本身就是付款动作：计划一旦建立，后续就会按它出钱。
// 因此建计划时必须先过三单匹配闸门（订单 / 入库 / 发票是否对得上），
// 而不是等到点「付款」才校验 —— 问题要拦在钱出去之前，也要拦在
// 「已经承诺付款」之前。判定由 _shared/paymentGate.ts 统一执行。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { PAYMENT_PLAN_PC } from '../../_shared/finConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardPaymentRow } from '../../_shared/paymentGate';

export async function onRequestGet(context: any) {
  return pcList(PAYMENT_PLAN_PC, context);
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // 必须 clone：pcCreate 内部会自行读取请求体，先读完会让它拿到空对象。
  const body: any = await request
    .clone()
    .json()
    .catch(() => ({}));

  // existing 传 null 表示新建：建计划本身就是付款动作（计划一旦建立就会按它出钱）
  const blocked = await guardPaymentRow(env.DB, user, body, null);
  if (blocked) return blocked;

  return pcCreate(PAYMENT_PLAN_PC, context);
}
