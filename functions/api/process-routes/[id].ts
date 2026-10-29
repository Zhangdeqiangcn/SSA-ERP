// 工艺路线单条端点（C1 生产域 · 父子表）
// GET    /api/process-routes/:id   读取（含全部工序）
// PUT    /api/process-routes/:id   更新（不传 operations = 工序保持原样；传 [] = 清空）
// DELETE /api/process-routes/:id   删除（连带删除工序）
//
// ── ★ 「不传」与「传空数组」必须区分（见 _shared/parentChild.ts 不变量 ③）──
// 工艺路线有一个高频操作**只改状态不改工序**：
//   「版本升版 / 作废」→ 只 PUT `{ status: 'obsolete' }`。
// 若把「不传 operations」当成清空，一次作废操作就把这条路线**全部工序删光**，
// 而 PUT 返回 200、界面提示保存成功；等下次开工单选这条路线时，
// 才看到它是空的 —— 那时已经无法判断是被删的还是本来就没配。
//
// ★ 反向的「传 [] = 清空」同样是合法操作：
//   整条工艺路线推倒重来时，前端会传 `operations: []` 再逐条加新的。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { PROCESS_ROUTE_PC } from '../../_shared/productionConfig';

export async function onRequestGet(context: any) {
  return pcGet(PROCESS_ROUTE_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(PROCESS_ROUTE_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(PROCESS_ROUTE_PC, context);
}
