import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { PurchaseReturn, PurchaseReturnItem } from '@/types';
import { round2, DEFAULT_TAX_RATE } from '@/utils/tax';
import { useWarehouseStore } from './warehouseStore';
import { useFinanceStore } from './financeStore';
import { usePurchaseStore } from './purchaseStore';
import { useVendorStore } from './vendorStore';
import { useQualityStore } from './qualityStore';
import { useVendorPerformanceStore } from './vendorPerformanceStore';

// ═══════════════════════════════════════════════════════════════════════════
// V3.63.0 退货独立单据关系化（根治审计 P1-VP-2 无独立后端单据）：
// 旧版采购退货嵌在 purchaseAdvancedStore 的 app_state Blob 里，无独立表。现迁 purchase_returns
// （行项目 items 封 extra_json）。completeReturn 的财务红冲逻辑（红字出库 + 应付冲销）保留并关系化回写。
// ═══════════════════════════════════════════════════════════════════════════

const today = () => new Date().toISOString().slice(0, 10);

const packReturn = (r: PurchaseReturn) => {
  const { items, ...rest } = r as any;
  return { ...rest, extraJson: JSON.stringify(items || []) };
};
const unpackReturn = (row: any): PurchaseReturn => {
  let items: PurchaseReturnItem[] = [];
  try { items = row.extraJson ? JSON.parse(row.extraJson) : []; } catch { items = []; }
  const { extraJson, ...rest } = row;
  return { ...(rest as any), items };
};

const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

interface PurchaseReturnState {
  purchaseReturns: PurchaseReturn[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  addReturn: (r: PurchaseReturn) => void;
  updateReturn: (id: string, u: Partial<PurchaseReturn>) => void;
  deleteReturn: (id: string) => void;
  completeReturn: (returnId: string) => void;
}

export const usePurchaseReturnStore = create<PurchaseReturnState>()((set, get) => ({
  purchaseReturns: [],
  loaded: false,

  hydrate: async () => {
    try {
      const res = await entityRepo.list<PurchaseReturn>('purchaseReturn', { page: 1, pageSize: 500 });
      const list = (res?.data || []).map(unpackReturn);
      set({ purchaseReturns: list, loaded: true });
    } catch {
      set({ purchaseReturns: [], loaded: true });
    }
  },

  addReturn: (r) => {
    set((s) => ({ purchaseReturns: [...s.purchaseReturns, r] }));
    entityRepo.create<PurchaseReturn>('purchaseReturn', packReturn(r) as any).catch(() => {});
  },
  updateReturn: (id, u) => {
    const prev = get().purchaseReturns.find((x) => x.id === id);
    const merged = packReturn({ ...(prev as any), ...u });
    set((s) => ({ purchaseReturns: s.purchaseReturns.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    entityRepo.update<PurchaseReturn>('purchaseReturn', id, merged as any).catch(() => {});
  },
  deleteReturn: (id) => {
    set((s) => ({ purchaseReturns: s.purchaseReturns.filter((x) => x.id !== id) }));
    entityRepo.remove('purchaseReturn', id).catch(() => {});
  },

  // 退货完成 → 红字出库(退供应商) + 应付冲销(AP)
  completeReturn: (returnId) => {
    const r = get().purchaseReturns.find((x) => x.id === returnId);
    if (!r || r.status === 'completed') return;
    const stamp = Date.now();
    // 1) 红字出库（退供应商）→ 库存扣减
    useWarehouseStore.getState().addOutboundOrder({
      id: `ob-ret-${stamp}`,
      outboundNo: `OB-RET-${stamp}`,
      type: 'return',
      sourceNo: r.returnNo,
      vendorId: r.vendorId,
      vendorName: r.vendorName,
      status: 'completed',
      warehouseId: 'wh-001',
      operator: '当前用户',
      outboundDate: r.returnDate,
      items: r.items.map((it) => ({
        id: `obi-${it.id}`,
        materialId: it.materialId,
        materialCode: it.materialCode,
        materialName: it.materialName,
        unit: it.unit,
        quantity: it.quantity,
      })),
      remarks: `采购退货 ${r.returnNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    });
    // 2) 应付冲销(AP)：借应付账款(含税)；贷原材料(净额)/贷进项税额(红字)
    const rateOf = (materialId: string): number => {
      const po = usePurchaseStore.getState().purchaseOrders.find((o) => o.orderNo === r.purchaseOrderNo);
      const it = po?.items.find((i) => i.materialId === materialId);
      return typeof it?.taxRate === 'number' ? it.taxRate : DEFAULT_TAX_RATE;
    };
    const apTax = round2(r.items.reduce((s, it) => s + it.amount * rateOf(it.materialId) / 100, 0));
    const apGross = round2(r.totalAmount + apTax);
    // 3) ★ V3.64.0 P0-4 信用对称占回：收货时按交货进度释放了供应商信用额度（warehouseStore
    //    applyVendorCreditDelta(-delta)），退货使"已占信用"减少，必须对称占回 +delta，否则
    //    退货越多额度虚占不释放、或重复释放。金额 = 退货金额（含税口径同 apGross 的净额部分）。
    if (r.vendorId) {
      useVendorStore.getState().applyVendorCreditDelta(r.vendorId, round2(r.totalAmount));
    }
    const voucherNo = `V-APCN-${r.returnNo}-${stamp}`;
    const entries = [
      {
        id: `aep-${stamp}-1`, entryNo: `JEAPCN${stamp}1`, date: r.returnDate,
        description: `采购退货冲应付 ${r.returnNo}`, debitAccount: '应付账款', creditAccount: '',
        amount: apGross, currency: 'CNY', voucherNo, createdBy: '当前用户',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
      },
      {
        id: `aep-${stamp}-2`, entryNo: `JEAPCN${stamp}2`, date: r.returnDate,
        description: `红冲原材料 ${r.returnNo}`, debitAccount: '', creditAccount: '原材料',
        amount: r.totalAmount, currency: 'CNY', voucherNo, createdBy: '当前用户',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
      },
      {
        id: `aep-${stamp}-3`, entryNo: `JEAPCN${stamp}3`, date: r.returnDate,
        description: `红冲进项税额 ${r.returnNo}`, debitAccount: '', creditAccount: '应交税费-应交增值税',
        amount: apTax, currency: 'CNY', voucherNo, createdBy: '当前用户',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
      },
    ];
    entries.forEach((e) => useFinanceStore.getState().addAccountEntry(e));

    // 4) ★ P0-1 质量闭环对称：质量原因采购退货 → 建来料 NCR + 供应商绩效扣分。
    //    与销售退货侧（质量原因退货→客户侧 NCR + 供应商门户 issue + 绩效扣分）对称，
    //    补齐「质量闭环在生产侧完整、采购侧缺角」——来料缺陷此前无法回流到 NCR/供应商绩效。
    const isQualityReason = /质量|不合格|缺陷|不良|损坏|变质|残次|不符|劣质|瑕疵/.test(r.reason || '');
    if (isQualityReason && r.vendorId) {
      const firstItem = r.items[0];
      const ncr = {
        id: `ncr-pr-${returnId}`,
        itemNo: `NCR-PR-${r.returnNo}`,
        inspectionTaskId: `inbound-return-${returnId}`,
        inspectionTaskNo: r.returnNo,
        materialCode: firstItem?.materialCode || '',
        materialName: firstItem?.materialName || '',
        batchNo: '-',
        defectQuantity: r.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
        defectDescription: `采购退货（质量原因）：${r.reason}`,
        disposition: 'rework' as const,
        dispositionStatus: 'pending' as const,
        status: 'open' as const,
        source: 'inbound' as const,
        vendorId: r.vendorId,
        vendorName: r.vendorName,
        responsiblePerson: r.vendorName,
        dueDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '当前用户',
        updatedBy: '当前用户',
      };
      useQualityStore.getState().addUnqualifiedItem(ncr as any);
      useVendorPerformanceStore.getState().recordQualityIncident(r.vendorId, r.vendorName, 5);
    }

    const updated: PurchaseReturn = { ...r, status: 'completed', voucherNo };
    set((s) => ({ purchaseReturns: s.purchaseReturns.map((x) => (x.id === returnId ? updated : x)) }));
    entityRepo.update<PurchaseReturn>('purchaseReturn', returnId, packReturn(updated) as any).catch(() => {});
  },
}));

void usePurchaseReturnStore.getState().hydrate();
