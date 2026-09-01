import { create } from 'zustand';
import { Vendor, VendorRatingRecord } from '@/types';
import { vendors as mockVendors } from '@/mocks/data/vendor';
import { vendorApi } from '@/services/vendor';

// V2.74.3：供应商主数据改为直连 D1 vendor_master（与开放网关 /api/open/vendors 同源）。
// 移除原 backendStorage(app_state Blob) 持久化——app_state 不再是供应商来源，消除双数据源。
// 在线时：loadVendors 从 /api/vendors 拉取，增删改经 vendorApi 写回 vendor_master。
// 离线/未登录/接口异常：回退内存中的 mockVendors，保证页面可用（不阻塞业务）。

const RATINGS_LS_KEY = 'ssa-erp-vendor-ratings';
const BACKFILL_FLAG = 'ssa-erp-vendor-backfilled';

function loadRatingsFromLS(): VendorRatingRecord[] {
  try {
    const raw = window.localStorage.getItem(RATINGS_LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRatingsToLS(records: VendorRatingRecord[]) {
  try {
    window.localStorage.setItem(RATINGS_LS_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

// 从旧 app_state 持久化键（V2.74.2 及以前）取出供应商，做一次性回填；不存在则退回 mockVendors。
function readLegacyVendors(): Vendor[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-vendor');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.vendors && Array.isArray(st.vendors) && st.vendors.length) return st.vendors as Vendor[];
    }
  } catch {
    /* ignore */
  }
  return [...mockVendors];
}

interface VendorFilter {
  name?: string;
  type?: string;
  status?: string;
  rating?: number;
}

interface VendorState {
  vendors: Vendor[];
  ratingRecords: VendorRatingRecord[];
  filter: VendorFilter;
  selectedVendor: Vendor | null;
  /** V2.74.3：从 D1 vendor_master 拉取（在线）。失败回退内存 mockVendors。首次空库做一次 legacy 回填。 */
  loadVendors: () => Promise<void>;
  setVendors: (vendors: Vendor[]) => void;
  setRatingRecords: (records: VendorRatingRecord[]) => void;
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (id: string, patch: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  addRatingRecord: (record: VendorRatingRecord) => void;
  setFilter: (filter: VendorFilter) => void;
  resetFilter: () => void;
  setSelectedVendor: (vendor: Vendor | null) => void;
  applyVendorCreditDelta: (id: string, delta: number) => boolean;
  checkVendorCredit: (id: string, amount: number) => { ok: boolean; available: number; limit: number | null; used: number; vendorName?: string };
  reviewVendorProfilePending: (id: string, approve: boolean, reviewer?: string) => boolean;
  checkVendorBlacklist: (id: string) => { blacklisted: boolean; reason?: string; blacklistedAt?: string; vendorName?: string };
  setVendorBlacklist: (id: string, blacklisted: boolean, reason?: string, operator?: string) => boolean;
}

const initialFilter: VendorFilter = {};

export const useVendorStore = create<VendorState>()((set, get) => ({
  vendors: [...mockVendors],
  ratingRecords: loadRatingsFromLS(),
  filter: initialFilter,
  selectedVendor: null,

  loadVendors: async () => {
    try {
      const res = await vendorApi.getVendors({ page: 1, pageSize: 200 });
      const list = (res?.data || []) as Vendor[];
      set({ vendors: list });
      // 首次空库：从 legacy app_state / mockVendors 回填一次，消除双源过渡缺口
      if (list.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
        window.localStorage.setItem(BACKFILL_FLAG, '1');
        const legacy = readLegacyVendors();
        for (const v of legacy) {
          try {
            await vendorApi.createVendor({
              code: v.code,
              name: v.name,
              shortName: v.shortName,
              type: v.type,
              contact: v.contact,
              phone: v.phone,
              email: v.email,
              address: v.address,
              status: v.status,
              qualificationExpiry: v.qualificationExpiry,
              rating: v.rating,
              creditLevel: v.creditLevel,
              creditLimit: v.creditLimit,
              usedCredit: v.usedCredit,
              taxId: v.taxId,
              bankAccount: v.bankAccount,
              salesOrg: v.salesOrg,
              reconciliationAccount: v.reconciliationAccount,
              taxCode: v.taxCode,
            });
          } catch {
            /* 编码冲突等忽略，回填尽力而为 */
          }
        }
        // 回填后重新拉取，保证内存与 D1 一致
        const refreshed = await vendorApi.getVendors({ page: 1, pageSize: 200 });
        set({ vendors: (refreshed?.data || []) as Vendor[] });
      }
    } catch {
      // 离线/未登录/接口异常：保持内存 mockVendors，不阻断 UI
    }
  },

  setVendors: (vendors) => set({ vendors }),
  setRatingRecords: (records) => {
    saveRatingsToLS(records);
    set({ ratingRecords: records });
  },
  addRatingRecord: (record) => {
    const next = [record, ...get().ratingRecords];
    saveRatingsToLS(next);
    set({ ratingRecords: next });
  },
  setFilter: (filter) => set({ filter }),
  resetFilter: () => set({ filter: initialFilter }),
  setSelectedVendor: (vendor) => set({ selectedVendor: vendor }),

  addVendor: async (vendor) => {
    // 乐观更新：先入内存，再写 D1
    set((state) => ({ vendors: [vendor, ...state.vendors] }));
    try {
      const created = await vendorApi.createVendor({
        code: vendor.code,
        name: vendor.name,
        shortName: vendor.shortName,
        type: vendor.type,
        contact: vendor.contact,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address,
        status: vendor.status,
        qualificationExpiry: vendor.qualificationExpiry,
        rating: vendor.rating,
        creditLevel: vendor.creditLevel,
        creditLimit: vendor.creditLimit,
        usedCredit: vendor.usedCredit,
        taxId: vendor.taxId,
        bankAccount: vendor.bankAccount,
        salesOrg: vendor.salesOrg,
        reconciliationAccount: vendor.reconciliationAccount,
        taxCode: vendor.taxCode,
      });
      if (created?.id && created.id !== vendor.id) {
        set((state) => ({ vendors: state.vendors.map((v) => (v.id === vendor.id ? { ...v, id: created.id } : v)) }));
      }
    } catch {
      /* 写失败：保留内存态（离线容忍） */
    }
  },

  updateVendor: async (id, patch) => {
    set((state) => ({
      vendors: state.vendors.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') } : v)),
    }));
    try {
      await vendorApi.updateVendor(id, patch);
    } catch {
      /* 写失败：保留内存态 */
    }
  },

  deleteVendor: async (id) => {
    set((state) => ({ vendors: state.vendors.filter((v) => v.id !== id) }));
    try {
      await vendorApi.deleteVendor(id);
    } catch {
      /* 写失败：保留内存态 */
    }
  },

  applyVendorCreditDelta: (id, delta) => {
    const v = get().vendors.find((x) => x.id === id);
    if (!v) return false;
    const used = v.usedCredit ?? 0;
    let next = used + delta;
    if (next < 0) next = 0; // 释放超额 → 归零，不阻断
    if (delta > 0 && v.creditLimit != null && next > v.creditLimit) {
      return false; // 超授信上限，拒绝占用
    }
    get().updateVendor(id, { usedCredit: next });
    return true;
  },

  checkVendorCredit: (id, amount) => {
    const v = get().vendors.find((x) => x.id === id);
    if (!v) return { ok: false, available: 0, limit: null, used: 0 };
    const used = v.usedCredit ?? 0;
    if (v.creditLimit == null) {
      return { ok: true, available: Infinity, limit: null, used, vendorName: v.name };
    }
    const available = v.creditLimit - used;
    return {
      ok: amount <= available,
      available,
      limit: v.creditLimit,
      used,
      vendorName: v.name,
    };
  },

  checkVendorBlacklist: (id) => {
    const v = get().vendors.find((x) => x.id === id);
    if (!v) return { blacklisted: false };
    if (v.status !== 'blacklisted') return { blacklisted: false, vendorName: v.name };
    return {
      blacklisted: true,
      reason: v.blacklistReason,
      blacklistedAt: v.blacklistedAt,
      vendorName: v.name,
    };
  },

  setVendorBlacklist: (id, blacklisted, reason, operator) => {
    const v = get().vendors.find((x) => x.id === id);
    if (!v) return false;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const patch: Partial<Vendor> = { updatedAt: now };
    if (!blacklisted) {
      patch.status = 'approved';
      patch.blacklistReason = undefined;
      patch.blacklistedAt = undefined;
    } else {
      const history = [
        ...(v.blacklistReasonHistory ?? []),
        { reason: reason ?? '未填写原因', operator: operator ?? '系统', operatedAt: now },
      ];
      patch.status = 'blacklisted';
      patch.blacklistReason = reason ?? '未填写原因';
      patch.blacklistedAt = now.slice(0, 10);
      patch.blacklistReasonHistory = history;
    }
    get().updateVendor(id, patch);
    return true;
  },

  reviewVendorProfilePending: (id, approve, reviewer) => {
    const v = get().vendors.find((x) => x.id === id);
    if (!v) return false;
    const pending = v.profilePending as Record<string, unknown> | undefined;
    if (!pending) return false;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const cleared: Partial<Vendor> = {
      profilePending: undefined,
      profilePendingAt: undefined,
      profilePendingBy: undefined,
      updatedAt: now,
    };
    if (!approve) {
      get().updateVendor(id, cleared);
      return true;
    }
    const pick = (k: string) => (typeof pending[k] === 'string' && pending[k] ? (pending[k] as string) : undefined);
    get().updateVendor(id, {
      ...cleared,
      name: pick('companyName') ?? v.name,
      shortName: pick('shortName') ?? v.shortName,
      contact: pick('contact') ?? v.contact,
      phone: pick('contactPhone') ?? v.phone,
      email: pick('contactEmail') ?? v.email,
      address: pick('address') ?? v.address,
      taxId: pick('taxId') ?? pick('unifiedCode') ?? v.taxId,
      bankAccount: pick('bankAccount') ?? v.bankAccount,
      profileReviewedBy: reviewer,
    });
    return true;
  },
}));
