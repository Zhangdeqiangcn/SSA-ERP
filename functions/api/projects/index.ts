// 项目集合端点（C1 销售域 · 多子表）
// GET  /api/projects   列表（分页 / keyword / RLS，含里程碑 + 异常）
// POST /api/projects   创建（项目 + milestones + exceptions 一次性写入）
//
// ── 这是全项目第一个「多子表」端点 ──────────────────────────────
// `Project` 一次带三个数组：milestones[] / exceptions[] / team: string[]。
// 财务域两张表各只有一个嵌套数组，单子表配置够用；到了这里必须扩展
// `_shared/parentChild.ts` 为 `children: ChildSpec[]`（本轮已完成），
// 否则第二个数组（exceptions）会被静默丢弃，表现为
// 「项目详情页正常、里程碑按计划显示，但异常列表永远空白」——
// 而项目管理的核心价值恰恰是「异常能被记录并跟踪到闭环」。
//
// team / linkedOrders 是字符串数组 → 父表 JSON 文本列（见 salesConfig.ts 注释）。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { PROJECT_PC } from '../../_shared/salesConfig';

export async function onRequestGet(context: any) {
  return pcList(PROJECT_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(PROJECT_PC, context);
}
