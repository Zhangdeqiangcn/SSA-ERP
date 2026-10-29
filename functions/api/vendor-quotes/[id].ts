// 供应商报价单条端点（C1 采购域 · 父子表）
// GET    /api/vendor-quotes/:id   读取（含全部物料明细）
// PUT    /api/vendor-quotes/:id   更新（不传 items = 明细保持原样；传 [] = 清空）
// DELETE /api/vendor-quotes/:id   删除（连带删除明细）
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { VENDOR_QUOTE_PC } from '../../_shared/purchaseConfig';

export async function onRequestGet(context: any) {
  return pcGet(VENDOR_QUOTE_PC, context);
}

export async function onRequestPut(context: any) {
  return pcUpdate(VENDOR_QUOTE_PC, context);
}

export async function onRequestDelete(context: any) {
  return pcRemove(VENDOR_QUOTE_PC, context);
}
