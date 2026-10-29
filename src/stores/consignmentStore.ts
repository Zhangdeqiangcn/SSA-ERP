import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import type { ConsignmentStock } from '@/types/purchase';

/**
 * 寄售库存 store（V3.76.0 P1-5：Blob → D1 关系表）
 *
 * 迁移前：整状态 JSON 走 backendStorage（persist name 'ssa-erp-consignment'）——
 *   寄售台账只存在单浏览器/单组织的大对象里，换设备即丢（审计 P1-5「仍 Blob 的单据」）。
 * 迁移后：落 D1 关系表 consignment_stocks（迁移 0100，entities.ts 注册 consignment，
 *   rls.ts 组织共享 'all'），多用户/多终端共享真源。
 *
 * 数据流：登录态 D1 权威源 + 页面挂载水合（D1 空一次性回填种子）；未登录本地种子兜底；
 *   CRUD 本地即时 + 登录态写穿。旧 Blob 键回填后保留不删（回滚安全垫）。
 */

const seedRecords: ConsignmentStock[] = [
  {
    id: 'cs-001', vendorId: 'V001', vendorName: '宝钢股份', vendorCode: 'BG001',
    materialId: 'M001', materialCode: 'SPCC-1.0', materialName: '冷轧板 SPCC 1.0',
    specification: '1.0×1250×C', unit: '吨',
    agreedUnitPrice: 5200, consignedQty: 500, consumedQty: 320, balanceQty: 180,
    warehouseId: 'WH001', warehouseName: '原料仓A',
  },
  {
    id: 'cs-002', vendorId: 'V002', vendorName: '鞍钢集团', vendorCode: 'AG001',
    materialId: 'M002', materialCode: 'Q235B-2.0', materialName: '热轧卷 Q235B 2.0',
    specification: '2.0×1500×C', unit: '吨',
    agreedUnitPrice: 4800, consignedQty: 300, consumedQty: 120, balanceQty: 180,
    warehouseId: 'WH001', warehouseName: '原料仓A',
  },
  {
    id: 'cs-003', vendorId: 'V003', vendorName: '首钢集团', vendorCode: 'SG001',
    materialId: 'M003', materialCode: 'DX51D-0.8', materialName: '镀锌板 DX51D 0.8',
    specification: '0.8×1250×C', unit: '吨',
    agreedUnitPrice: 6200, consignedQty: 200, consumedQty: 80, balanceQty: 120,
    warehouseId: 'WH002', warehouseName: '原料仓B',
  },
];

/** 旧 Blob 持久化键（回填安全垫，不删） */
const LEGACY_BLOB_KEY = 'ssa-erp-consignment';

function readLegacyLocal(): ConsignmentStock[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_BLOB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const st = parsed?.state ?? parsed;
    if (Array.isArray(st?.records) && st.records.length) return st.records as ConsignmentStock[];
  } catch {
    /* 损坏的旧数据忽略，走种子 */
  }
  return null;
}

async function readLegacyCloud(): Promise<ConsignmentStock[] | null> {
  try {
    const { api } = await import('@/services/api');
    const res = await api.get<{ value?: string }>(`/state/${encodeURIComponent(LEGACY_BLOB_KEY)}`);
    if (typeof res?.value !== 'string' || !res.value) return null;
    const parsed = JSON.parse(res.value);
    const st = parsed?.state ?? parsed;
    if (Array.isArray(st?.records) && st.records.length) return st.records as ConsignmentStock[];
  } catch {
    /* 云端无旧数据或网络异常：忽略 */
  }
  return null;
}

export interface ConsignmentState {
  records: ConsignmentStock[];
  /** 消耗结算：增加已消耗数量、等量减少结存 */
  settleConsumption: (id: string, qty: number) => void;
  addRecord: (record: ConsignmentStock) => void;
  removeRecord: (id: string) => void;
  reset: () => void;
  /** V3.76.0：从 D1 水合（页面挂载调用；D1 空且本地/云端有旧 Blob 数据时一次性回填） */
  hydrateConsignment: () => Promise<void>;
}

export const useConsignmentStore = create<ConsignmentState>()((set) => ({
  records: [...seedRecords],

  settleConsumption: (id, qty) => {
    let updated: ConsignmentStock | undefined;
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== id) return r;
        updated = {
          ...r,
          consumedQty: r.consumedQty + qty,
          balanceQty: Math.max(0, r.consignedQty - (r.consumedQty + qty)),
        };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update('consignment', id, updated as any).catch(() => {});
  },
  addRecord: (record) => {
    set((s) => ({ records: [...s.records, record] }));
    if (isAuthed()) void entityRepo.create('consignment', record as any).catch(() => {});
  },
  removeRecord: (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    if (isAuthed()) void entityRepo.remove('consignment', id).catch(() => {});
  },
  reset: () => set({ records: [...seedRecords] }),

  hydrateConsignment: async () => {
    if (!isAuthed()) return; // 未登录：本地种子兜底
    try {
      const res = await entityRepo.list<ConsignmentStock>('consignment', { page: 1, pageSize: 500 });
      const rows = res?.data || [];
      if (rows.length === 0) {
        // 一次性回填：旧 Blob（本地优先、云端兜底）或种子
        const legacy = readLegacyLocal() || (await readLegacyCloud());
        const src = legacy && legacy.length ? legacy : seedRecords;
        for (const r of src) {
          try { await entityRepo.create('consignment', r as any); } catch { /* 冲突忽略 */ }
        }
        const refreshed = await entityRepo.list<ConsignmentStock>('consignment', { page: 1, pageSize: 500 });
        if ((refreshed?.data || []).length) set({ records: refreshed!.data as ConsignmentStock[] });
        return;
      }
      set({ records: rows as ConsignmentStock[] });
    } catch {
      // 离线或后端异常：保留本地种子态
    }
  },
}));
