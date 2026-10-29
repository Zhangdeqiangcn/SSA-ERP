// 项目单条端点
// GET    /api/projects/:id   读取（含里程碑 + 异常）
// PUT    /api/projects/:id   更新（不传的数组保持原样；传 [] = 清空该数组）
// DELETE /api/projects/:id   删除（连带删除里程碑 + 异常）
//
// ★★ 多子表下的语义区分是本文件最重要的约束（见 parentChild.ts 不变量 ③）★
//   项目详情页有多个独立操作入口：
//     · 拖进度条  → 只传 progress
//     · 标记里程碑完成 → 只传 milestones
//     · 登记一条异常   → 只传 exceptions
//     · 调整项目团队   → 只传 team
//   因此「没出现在请求体里的数组 = 保持原样」这条规则必须逐张子表独立判断。
//   若实现成「只要请求体里没有任何数组就清空全部子表」，或「按第一个匹配的
//   数组清空其余」，都会造成：改一次进度就把里程碑和异常全删掉。
//   replaceAllChildren 逐张检查 `Array.isArray(body[spec.childField])`，
//   只有显式传了该数组才动该子表。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { PROJECT_PC } from '../../_shared/salesConfig';

export async function onRequestGet(context: any) {
  return pcGet(PROJECT_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(PROJECT_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(PROJECT_PC, context);
}
