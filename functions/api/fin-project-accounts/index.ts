// 项目核算集合端点（C1 财务域 · 父子表）
// GET  /api/fin-project-accounts   列表（含成本明细）
// POST /api/fin-project-accounts   创建（核算单 + costItems 一次性写入）
//
// 与付款计划同款理由：`ProjectAccount.costItems: ProjectCostItem[]` 是嵌套数组，
// 走通用实体路由会被静默丢弃 —— 界面上「核算项目」列表正常显示，
// 但点开详情的成本明细表是空的，且保存接口返回成功。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { PROJECT_ACCOUNT_PC } from '../../_shared/finConfig';

export async function onRequestGet(context: any) {
  return pcList(PROJECT_ACCOUNT_PC, context);
}

export async function onRequestPost(context: any) {
  return pcCreate(PROJECT_ACCOUNT_PC, context);
}
