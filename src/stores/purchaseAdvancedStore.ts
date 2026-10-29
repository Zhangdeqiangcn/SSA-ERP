import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
import { FrameworkAgreement } from '@/types';
import { usePurchaseStore } from '@/stores/purchaseStore';
// V3.63.0：采购退货切片（purchaseReturns/addReturn/completeReturn 等）迁至独立关系化 store
// src/stores/purchaseReturnStore.ts（purchase_returns 表）；useFinanceStore/useWarehouseStore/
// round2/DEFAULT_TAX_RATE 随退货迁走，本处不再使用。
// V3.65.0 立项④：框架协议（协议价基准）关系化——根治 P1-4「付款核验无协议价基准」。
//   此前 frameworkAgreements 整块存 app_state Blob（persist backendStorage），后端无表，
//   付款核验读不到协议价 ceiling_price → 只能做「累计超计划总额」最小留痕（造假风险）。
//   现迁为真实 D1 关系表：头表 framework_agreements（releases 封 extra_json）+
//   明细表 framework_agreement_items（ceiling_price 为真实列，服务端付款核验基准）。
//   启动水合、空库回填 seed；对外 API（4 方法 + 数组）不变，FrameworkAgreement.tsx 页面零改。

const today = () => new Date().toISOString().slice(0, 10);

// ── 嵌套字段打包/解包（extra_json + 明细独立表）────────────────────────────
/** 头表 pack：releases 封 extra_json；items 走独立明细表（不塞头） */
const packHead = (a: FrameworkAgreement): any => {
  const { items, ...rest } = a;
  return { ...rest, extraJson: JSON.stringify({ releases: a.releases ?? [] }) };
};
/** 头表 unpack：extra_json 解出 releases；明细从明细表合并进来 */
const unpackHead = (row: any, items: FrameworkAgreement['items']): FrameworkAgreement => {
  let releases: any[] = [];
  try { releases = row.extraJson ? (JSON.parse(row.extraJson).releases ?? []) : []; } catch { releases = []; }
  const { extraJson, ...rest } = row;
  return { ...(rest as any), items, releases };
};

const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

interface PurchaseAdvancedState {
  frameworkAgreements: FrameworkAgreement[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  // 框架协议
  addFramework: (a: FrameworkAgreement) => void;
  updateFramework: (id: string, u: Partial<FrameworkAgreement>) => void;
  deleteFramework: (id: string) => void;
  // 框架释放 → 生成采购订单（跨模块联动）
  releaseFramework: (agreementId: string, release: { id: string; releaseNo: string; date: string; amount: number; poNo?: string; note?: string }) => string | null;
}

const seedFrameworks: FrameworkAgreement[] = [
  {
    id: 'fa-seed-1', agreementNo: 'FA-2026-0001', vendorId: 'ven-001', vendorName: '宝钢股份',
    status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', currency: 'CNY',
    totalCeiling: 5000000, releasedAmount: 0,
    items: [
      { id: 'fai-1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: 'Q345 钢板', unit: 'kg', ceilingPrice: 42, committedQty: 0 },
    ],
    releases: [],
    createdAt: '2026-01-01', updatedAt: '2026-01-01', createdBy: '采购员', updatedBy: '采购员',
  },
];

export const usePurchaseAdvancedStore = create<PurchaseAdvancedState>()(
  persist(
    (set, get) => ({
      frameworkAgreements: [...seedFrameworks],
      loaded: false,

      // V3.65.0 立项④：启动水合——头表 + 明细表并行读 D1，按 agreement_id 分组合并；
      // 空库且首次回填 seed（头 + 明细），与 qualityStore 范式一致；离线/异常回退 seed。
      hydrate: async () => {
        try {
          const [headRes, itemRes] = await Promise.all([
            entityRepo.list<any>('frameworkAgreement', { page: 1, pageSize: 500 }),
            entityRepo.list<any>('frameworkAgreementItem', { page: 1, pageSize: 500 }),
          ]);
          const heads = headRes?.data || [];
          const items = itemRes?.data || [];
          if (heads.length === 0 && !lsGet('ssa-erp-backfilled-frameworkAgreement')) {
            // 空库回填：先落 seed 头 + 明细，再重读
            lsSet('ssa-erp-backfilled-frameworkAgreement', '1');
            for (const fa of seedFrameworks) {
              try {
                await entityRepo.create('frameworkAgreement', packHead(fa));
                for (const it of fa.items ?? []) {
                  await entityRepo.create('frameworkAgreementItem', {
                    ...it,
                    agreementId: fa.id,
                  } as any);
                }
              } catch { /* 编码冲突忽略 */ }
            }
            const r1 = await entityRepo.list<any>('frameworkAgreement', { page: 1, pageSize: 500 });
            const r2 = await entityRepo.list<any>('frameworkAgreementItem', { page: 1, pageSize: 500 });
            const hs = r1?.data || [];
            const is = r2?.data || [];
            const byAg = new Map<string, any[]>();
            is.forEach((x: any) => { const k = x.agreementId; if (!byAg.has(k)) byAg.set(k, []); byAg.get(k)!.push(x); });
            set({ frameworkAgreements: hs.map((h: any) => unpackHead(h, (byAg.get(h.id) || []) as any)), loaded: true });
            return;
          }
          const byAg2 = new Map<string, any[]>();
          items.forEach((x: any) => { const k = x.agreementId; if (!byAg2.has(k)) byAg2.set(k, []); byAg2.get(k)!.push(x); });
          const merged = heads.map((h: any) => {
            const hItems = (byAg2.get(h.id) || []).map((it: any) => {
              const { agreementId, ...rest } = it;
              return { ...(rest as any) };
            });
            return unpackHead(h, hItems as any);
          });
          set({ frameworkAgreements: merged, loaded: true });
        } catch {
          set({ frameworkAgreements: [...seedFrameworks], loaded: true });
        }
      },

      // ── 框架协议（D1 主源：头 + 明细两表）──
      addFramework: (a) => {
        set((s) => ({ frameworkAgreements: [...s.frameworkAgreements, a] }));
        entityRepo.create('frameworkAgreement', packHead(a)).catch(() => {});
        (a.items ?? []).forEach((it) => {
          entityRepo.create('frameworkAgreementItem', { ...it, agreementId: a.id } as any).catch(() => {});
        });
      },
      updateFramework: (id, u) => {
        const prev = get().frameworkAgreements.find((x) => x.id === id);
        if (!prev) return;
        const merged: FrameworkAgreement = { ...prev, ...u, updatedAt: today(), updatedBy: '当前用户' };
        set((s) => ({ frameworkAgreements: s.frameworkAgreements.map((x) => (x.id === id ? merged : x)) }));
        entityRepo.update('frameworkAgreement', id, packHead(merged)).catch(() => {});
        // 明细变更 → 重建（先删旧行再建新行；协议价基准须始终一致，避免残留脏行）
        if (u.items) {
          (prev.items ?? []).forEach((it) => { if (it.id) entityRepo.remove('frameworkAgreementItem', it.id).catch(() => {}); });
          (merged.items ?? []).forEach((it) => {
            const exists = (prev.items ?? []).some((o) => o.id === it.id);
            if (!exists) entityRepo.create('frameworkAgreementItem', { ...it, agreementId: id, id: it.id } as any).catch(() => {});
            else entityRepo.update('frameworkAgreementItem', it.id, { ...it, agreementId: id } as any).catch(() => {});
          });
        }
      },
      deleteFramework: (id) => {
        const prev = get().frameworkAgreements.find((x) => x.id === id);
        set((s) => ({ frameworkAgreements: s.frameworkAgreements.filter((x) => x.id !== id) }));
        entityRepo.remove('frameworkAgreement', id).catch(() => {});
        (prev?.items ?? []).forEach((it) => { if (it.id) entityRepo.remove('frameworkAgreementItem', it.id).catch(() => {}); });
      },
      // 框架释放 → 采购订单（跨模块联动，保留；releasedAmount/releases 同步写回头表）
      releaseFramework: (agreementId, release) => {
        const fa = get().frameworkAgreements.find((x) => x.id === agreementId);
        if (!fa || fa.status !== 'active') return null;
        const stamp = Date.now();
        const orderNo = `PO-2026-${stamp}`;
        const poId = `po-${stamp}`;
        const po = {
          id: poId,
          orderNo,
          vendorId: fa.vendorId,
          vendorName: fa.vendorName,
          status: 'confirmed' as const,
          orderDate: release.date,
          expectedDeliveryDate: release.date,
          items: fa.items.map((it) => ({
            id: `poi-${it.id}-${stamp}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            specification: '',
            unit: it.unit,
            orderedQuantity: it.committedQty,
            deliveredQuantity: 0,
            unitPrice: it.ceilingPrice,
            amount: it.ceilingPrice * it.committedQty,
          })),
          totalAmount: fa.items.reduce((s, it) => s + it.ceilingPrice * it.committedQty, 0),
          remarks: `框架协议释放 ${fa.agreementNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '采购员',
          updatedBy: '采购员',
        };
        usePurchaseStore.getState().addPurchaseOrder(po);
        const rel = { ...release, poNo: orderNo };
        const updatedFa: FrameworkAgreement = {
          ...fa,
          releasedAmount: fa.releasedAmount + release.amount,
          releases: [...(fa.releases ?? []), rel],
          updatedAt: today(),
        };
        set((s) => ({ frameworkAgreements: s.frameworkAgreements.map((x) => (x.id === agreementId ? updatedFa : x)) }));
        // 释放记录 + 已释放金额同步写回头表（releases 封 extra_json）
        entityRepo.update('frameworkAgreement', agreementId, packHead(updatedFa)).catch(() => {});
        return poId;
      },
    }),
    { storage: backendStorage,
      name: 'ssa-erp-purchase-adv',
      version: 1,
      partialize: (state) => ({
        frameworkAgreements: state.frameworkAgreements,
      }),
    }
  )
);

void usePurchaseAdvancedStore.getState().hydrate();
