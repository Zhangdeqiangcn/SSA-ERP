// 意向客户单条端点
// GET    /api/sales-prospects/:id   读取（含跟进记录）
// PUT    /api/sales-prospects/:id   更新（不传 followupRecords = 跟进记录保持原样；传 [] = 清空）
// DELETE /api/sales-prospects/:id   删除（连带删除跟进记录）
//
// 「不传」与「传空数组」必须区分（见 _shared/parentChild.ts 文件头不变量 ③）：
// 最典型的操作是「把状态从 negotiating 改成 won」，
// 若把「不传 followupRecords」当成清空，一次改状态就会删掉全部跟进历史 ——
// 而跟进历史正是判断这个客户为什么能成交的唯一依据。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { PROSPECT_PC } from '../../_shared/salesConfig';

export async function onRequestGet(context: any) {
  return pcGet(PROSPECT_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(PROSPECT_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(PROSPECT_PC, context);
}
