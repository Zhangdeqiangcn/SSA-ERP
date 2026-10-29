// 项目核算单条端点
// GET    /api/fin-project-accounts/:id   读取（核算单 + 成本明细）
// PUT    /api/fin-project-accounts/:id   更新（不传 costItems = 明细保持原样）
// DELETE /api/fin-project-accounts/:id   删除（连带删除成本明细）
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { PROJECT_ACCOUNT_PC } from '../../_shared/finConfig';

export async function onRequestGet(context: any) {
  return pcGet(PROJECT_ACCOUNT_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(PROJECT_ACCOUNT_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(PROJECT_ACCOUNT_PC, context);
}
