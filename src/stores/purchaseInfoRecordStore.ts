import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { PurchaseInfoRecord } from '@/types';

/**
 * 采购信息记录 store（V3.76.0 P1-5：Blob → D1 关系表）
 *
 * 迁移前：整状态 JSON 走 backendStorage（persist name 'ssa-erp-purchase-info-record'）——
 *   供应商-物料价格/货期主数据只存单浏览器大对象，采购员之间互不可见（审计 P1-5）。
 * 迁移后：落 D1 关系表 purchase_info_records（迁移 0100，entities.ts 注册
 *   purchaseInfoRecord，rls.ts 组织共享 'all'）。
 *
 * 数据流：登录态 D1 权威源 + 页面挂载水合（D1 空一次性回填种子）；未登录本地种子兜底；
 *   CRUD 本地即时 + 登录态写穿。旧 Blob 键回填后保留不删（回滚安全垫）。
 */

const seedRecords: PurchaseInfoRecord[] = [
  {
    id: 'ir-001',
    vendorId: 'cus-001',
    vendorName: '华润建筑',
    materialId: 'mat-001',
    materialName: '钢板',
    materialCode: 'MAT-001',
    specification: 'Q235B',
    unit: '吨',
    unitPrice: 4100,
    currency: 'CNY',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    minQty: 1,
    leadTime: 7,
    purchasingGroup: 'PG01',
    status: 'active',
  },
  {
    id: 'ir-002',
    vendorId: 'cus-002',
    vendorName: '长江船舶',
    materialId: 'mat-002',
    materialName: '不锈钢管',
    materialCode: 'MAT-002',
    specification: '304',
    unit: '吨',
    unitPrice: 3800,
    currency: 'CNY',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    minQty: 2,
    leadTime: 10,
    purchasingGroup: 'PG02',
    status: 'active',
  },
  {
    id: 'ir-003',
    vendorId: 'cus-003',
    vendorName: '新源机械',
    materialId: 'mat-003',
    materialName: '角钢',
    materialCode: 'MAT-003',
    specification: 'L50×5',
    unit: '吨',
    unitPrice: 5200,
    currency: 'CNY',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    minQty: 1,
    leadTime: 5,
    purchasingGroup: 'PG01',
    status: 'active',
  },
];

/** 旧 Blob 持久化键（回填安全垫，不删） */
const LEGACY_BLOB_KEY = 'ssa-erp-purchase-info-record';

function readLegacyLocal(): PurchaseInfoRecord[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_BLOB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const st = parsed?.state ?? parsed;
    if (Array.isArray(st?.records) && st.records.length) return st.records as PurchaseInfoRecord[];
  } catch {
    /* 损坏的旧数据忽略，走种子 */
  }
  return null;
}

async function readLegacyCloud(): Promise<PurchaseInfoRecord[] | null> {
  try {
    const { api } = await import('@/services/api');
    const res = await api.get<{ value?: string }>(`/state/${encodeURIComponent(LEGACY_BLOB_KEY)}`);
    if (typeof res?.value !== 'string' || !res.value) return null;
    const parsed = JSON.parse(res.value);
    const st = parsed?.state ?? parsed;
    if (Array.isArray(st?.records) && st.records.length) return st.records as PurchaseInfoRecord[];
  } catch {
    /* 云端无旧数据或网络异常：忽略 */
  }
  return null;
}

interface PurchaseInfoRecordState {
  records: PurchaseInfoRecord[];
  addRecord: (record: PurchaseInfoRecord) => void;
  updateRecord: (id: string, patch: Partial<PurchaseInfoRecord>) => void;
  deleteRecord: (id: string) => void;
  /** V3.76.0：从 D1 水合（页面挂载调用；D1 空且本地/云端有旧 Blob 数据时一次性回填） */
  hydrateInfoRecords: () => Promise<void>;
}

export const usePurchaseInfoRecordStore = create<PurchaseInfoRecordState>()((set) => ({
  records: [...seedRecords],
  addRecord: (record) => {
    set((state) => ({ records: [record, ...state.records] }));
    if (isAuthed()) void entityRepo.create('purchaseInfoRecord', record as any).catch(() => {});
  },
  updateRecord: (id, patch) => {
    let updated: PurchaseInfoRecord | undefined;
    set((state) => ({
      records: state.records.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update('purchaseInfoRecord', id, updated as any).catch(() => {});
  },
  deleteRecord: (id) => {
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
    if (isAuthed()) void entityRepo.remove('purchaseInfoRecord', id).catch(() => {});
  },

  hydrateInfoRecords: async () => {
    if (!isAuthed()) return; // 未登录：本地种子兜底
    try {
      const res = await entityRepo.list<PurchaseInfoRecord>('purchaseInfoRecord', { page: 1, pageSize: 500 });
      const rows = res?.data || [];
      if (rows.length === 0) {
        const legacy = readLegacyLocal() || (await readLegacyCloud());
        const src = legacy && legacy.length ? legacy : seedRecords;
        for (const r of src) {
          try { await entityRepo.create('purchaseInfoRecord', r as any); } catch { /* 冲突忽略 */ }
        }
        const refreshed = await entityRepo.list<PurchaseInfoRecord>('purchaseInfoRecord', { page: 1, pageSize: 500 });
        if ((refreshed?.data || []).length) set({ records: refreshed!.data as PurchaseInfoRecord[] });
        return;
      }
      set({ records: rows as PurchaseInfoRecord[] });
    } catch {
      // 离线或后端异常：保留本地种子态
    }
  },
}));
