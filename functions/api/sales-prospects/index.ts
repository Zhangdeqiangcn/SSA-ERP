// 意向客户集合端点（C1 销售域 · 父子表）
// GET  /api/sales-prospects   列表（分页 / keyword / RLS，含每条跟进记录）
// POST /api/sales-prospects   创建（意向客户 + followupRecords 一次性写入）
//
// ── 为什么不用通用实体路由 ──────────────────────────────────────
// `Prospect.followupRecords: FollowupRecord[]` 是嵌套数组。
// 通用路由的 pickSnake 只挑 ENTITY_RESOURCES 里登记过的列，
// **followupRecords 未登记 → 静默丢弃且不报错**，
// 表现为「意向客户列表全都在、详情页打开正常，但跟进记录一条没有」，
// 而 save 仍然返回 201。销售漏斗的下一步动作全靠跟进记录驱动，
// 丢掉它等于把销售过程管理变成一张静态名片夹。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { PROSPECT_PC } from '../../_shared/salesConfig';

export async function onRequestGet(context: any) {
  return pcList(PROSPECT_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(PROSPECT_PC, context);
}
