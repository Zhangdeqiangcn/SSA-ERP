import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
import { SalesContract } from '@/types';

// ---- 种子数据 ----
const now = new Date().toISOString();
const seed: SalesContract[] = [
  {
    id: 'sc-001',
    contractNo: 'SC-2026-001',
    name: '华润建筑钢材供应合同',
    customerId: 'cus-001',
    customerName: '华润建筑',
    customerCode: 'HR-001',
    salesPerson: '陈伟',
    amount: 2580000,
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    status: 'active',
    items: [
      { id: 'sci-001', materialId: 'mat-001', materialCode: 'GC-HRB400-12', materialName: '热轧带肋钢筋 HRB400 φ12', specification: 'φ12×9000', unit: '吨', quantity: 200, unitPrice: 4200, amount: 840000, deliveryDate: '2026-04-15' },
      { id: 'sci-002', materialId: 'mat-002', materialCode: 'GC-HRB400-16', materialName: '热轧带肋钢筋 HRB400 φ16', specification: 'φ16×9000', unit: '吨', quantity: 300, unitPrice: 4100, amount: 1230000, deliveryDate: '2026-05-20' },
      { id: 'sci-003', materialId: 'mat-005', materialCode: 'GC-Q235B-6', materialName: '热轧钢板 Q235B 6mm', specification: '6×1500×6000', unit: '吨', quantity: 100, unitPrice: 5100, amount: 510000, deliveryDate: '2026-06-10' },
    ],
    paymentSchedule: [
      { id: 'pay-001', stage: '合同签订', percentage: 30, amount: 774000, dueDate: '2026-03-15', receivedDate: '2026-03-16', received: true },
      { id: 'pay-002', stage: '首批到货', percentage: 40, amount: 1032000, dueDate: '2026-05-15', received: false },
      { id: 'pay-003', stage: '全部到货验收', percentage: 25, amount: 645000, dueDate: '2026-07-30', received: false },
      { id: 'pay-004', stage: '质保期满', percentage: 5, amount: 129000, dueDate: '2027-06-30', received: false },
    ],
    terms: '1. 供方按国家标准 GB1499.2 交货，附质量证明书。\n2. 需方应在收货后 7 日内完成验收，逾期视为合格。\n3. 分批交货，每批以需方地磅过磅重量为准。\n4. 质保期自最后一批验收合格之日起 12 个月。',
    remarks: '长协合同，按月度计划分批交货',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'sc-002',
    contractNo: 'SC-2026-002',
    name: '长江船舶船板采购合同',
    customerId: 'cus-002',
    customerName: '长江船舶',
    customerCode: 'CJ-001',
    salesPerson: '刘洋',
    amount: 1850000,
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    status: 'draft',
    items: [
      { id: 'sci-004', materialId: 'mat-003', materialCode: 'GC-Q355B-10', materialName: '低合金钢板 Q355B 10mm', specification: '10×2000×8000', unit: '吨', quantity: 150, unitPrice: 5600, amount: 840000, deliveryDate: '2026-05-01' },
      { id: 'sci-005', materialId: 'mat-006', materialCode: 'GC-Q235B-12', materialName: '热轧钢板 Q235B 12mm', specification: '12×2000×8000', unit: '吨', quantity: 200, unitPrice: 5050, amount: 1010000, deliveryDate: '2026-06-01' },
    ],
    paymentSchedule: [
      { id: 'pay-005', stage: '预付款', percentage: 20, amount: 370000, dueDate: '2026-04-10', received: false },
      { id: 'pay-006', stage: '到货验收', percentage: 60, amount: 1110000, dueDate: '2026-07-15', received: false },
      { id: 'pay-007', stage: '质保金', percentage: 20, amount: 370000, dueDate: '2026-12-31', received: false },
    ],
    terms: '1. 船用钢板执行 CCS 船级社规范。\n2. 每批附材质证明书及探伤报告。',
    remarks: '新客户首单，合同金额较大，需重点关注回款',
    createdAt: now,
    updatedAt: now,
  },
];

interface SalesContractState {
  contracts: SalesContract[];
  addContract: (contract: SalesContract) => void;
  updateContract: (id: string, updates: Partial<SalesContract>) => void;
  deleteContract: (id: string) => void;
  /** V3.66.0 P1-2：启动时从 D1 sales_contracts 水合（主源 = D1，本地 Blob 降为离线兜底） */
  hydrateContracts: () => Promise<void>;
  /** P0-2：订单创建/更新时由 salesStore 回调回填，聚合本合同的关联销售订单号 */
  linkOrder: (contractId: string, orderNo: string) => void;
  /** P0-2：订单删除时由 salesStore 回调解除关联，保持双向一致 */
  unlinkOrder: (contractId: string, orderNo: string) => void;
}

// ── V3.66.0 P1-2：嵌套明细打包/解包（items/paymentSchedule/附件封 extra_json）──
function packContract(c: SalesContract) {
  const { items, paymentSchedule, attachments, linkedOrderNos, ...rest } = c as any;
  return {
    ...rest,
    extraJson: JSON.stringify({ items: items ?? [], paymentSchedule: paymentSchedule ?? [], attachments: attachments ?? [], linkedOrderNos: linkedOrderNos ?? [] }),
  };
}
function unpackContract(r: any): SalesContract {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), items: extra.items ?? [], paymentSchedule: extra.paymentSchedule ?? [], attachments: extra.attachments ?? [], linkedOrderNos: extra.linkedOrderNos ?? [] };
}

export const useSalesContractStore = create<SalesContractState>()(
  persist(
    (set, get) => ({
      contracts: [...seed],

      addContract: (contract) => {
        set((s) => ({ contracts: [...s.contracts, contract] }));
        // V3.66.0 P1-2：合同同步 D1（履约跟踪/回款计划多用户可见；失败静默不阻断）
        entityRepo.create('salesContract', packContract(contract) as any).catch(() => {});
      },

      updateContract: (id, updates) => {
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
        const cur = useSalesContractStore.getState().contracts.find((c) => c.id === id);
        if (cur) entityRepo.update('salesContract', id, packContract(cur) as any).catch(() => {});
      },

      deleteContract: (id) => {
        set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) }));
        entityRepo.remove('salesContract', id).catch(() => {});
      },

      // P0-2：聚合关联订单号（合同侧反向索引），由 salesStore 在订单增删时回调，实现合同↔订单双向可达。
      linkOrder: (contractId, orderNo) => {
        const c = get().contracts.find((x) => x.id === contractId);
        if (!c) return;
        const nos = c.linkedOrderNos || [];
        if (nos.includes(orderNo)) return;
        const updated = { ...c, linkedOrderNos: [...nos, orderNo], updatedAt: new Date().toISOString() };
        set((s) => ({ contracts: s.contracts.map((x) => (x.id === contractId ? updated : x)) }));
        entityRepo.update('salesContract', contractId, packContract(updated) as any).catch(() => {});
      },
      unlinkOrder: (contractId, orderNo) => {
        const c = get().contracts.find((x) => x.id === contractId);
        if (!c || !c.linkedOrderNos) return;
        const updated = { ...c, linkedOrderNos: c.linkedOrderNos.filter((n) => n !== orderNo), updatedAt: new Date().toISOString() };
        set((s) => ({ contracts: s.contracts.map((x) => (x.id === contractId ? updated : x)) }));
        entityRepo.update('salesContract', contractId, packContract(updated) as any).catch(() => {});
      },

      // V3.66.0 P1-2：销售合同水合（D1 主源；空库回填本地 seed，之后 CRUD 经 D1 同步）
      hydrateContracts: async () => {
        try {
          const res = await entityRepo.list<any>('salesContract', { page: 1, pageSize: 500 });
          const rows: any[] = res?.data || [];
          if (rows.length === 0) {
            for (const c of seed) {
              try { await entityRepo.create('salesContract', packContract(c) as any); } catch { /* 冲突忽略 */ }
            }
            const refreshed = await entityRepo.list<any>('salesContract', { page: 1, pageSize: 500 });
            set({ contracts: (refreshed?.data || []).map(unpackContract) });
            return;
          }
          set({ contracts: rows.map(unpackContract) });
        } catch {
          /* 离线/异常：保留本地 Blob 副本（persist 水合结果），不阻断 */
        }
      },
    }),
    { storage: backendStorage,
     name: 'ssa-erp-sales-contract',
     version: 2,
     partialize: (state) => ({ contracts: state.contracts }) }
  )
);

// ── V3.66.0 P1-2：启动水合销售合同（D1 主源，与 qualityStore 同款顶层触发）──
void useSalesContractStore.getState().hydrateContracts();
