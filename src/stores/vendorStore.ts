import { createEntityStore } from './createEntityStore';
import { UseBoundStore, StoreApi } from 'zustand';
import { Vendor, VendorRatingRecord } from '@/types';
import { vendors as mockVendors } from '@/mocks/data/vendor';
import { vendorApi } from '@/services/vendor';
import { isAuthed } from '@/services/b2Api';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// V2.74.3：供应商主数据改为直连 D1 vendor_master（与开放网关 /api/open/vendors 同源）。
// 移除原 backendStorage(app_state Blob) 持久化——app_state 不再是供应商来源，消除双数据源。
// 在线时：loadVendors 从 /api/vendors 拉取，增删改经 vendorApi 写回 vendor_master。
// 离线/未登录/接口异常：回退内存中的 mockVendors，保证页面可用（不阻塞业务）。
// V3.90.0：vendors 主数组的 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到
//   通用工厂 createEntityStore 的「可插拔后端」能力（backend=vendorApi 适配层）；
//   评级记录(ratingRecords)为本地存储副状态、信用原子端点/黑名单/评审等为领域逻辑，保留在 extend，调用方零改动。

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

const initialFilter: VendorFilter = {};

interface VendorState {
  vendors: Vendor[];
  ratingRecords: VendorRatingRecord[];
  filter: VendorFilter;
  selectedVendor: Vendor | null;
  loadVendors: () => Promise<void>;
  setVendors: (vendors: Vendor[]) => void;
  setRatingRecords: (records: VendorRatingRecord[]) => void;
  addRatingRecord: (record: VendorRatingRecord) => void;
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (id: string, patch: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  setFilter: (filter: VendorFilter) => void;
  resetFilter: () => void;
  setSelectedVendor: (vendor: Vendor | null) => void;
  applyVendorCreditDelta: (id: string, delta: number) => boolean;
  checkVendorCredit: (id: string, amount: number) => { ok: boolean; available: number; limit: number | null; used: number; vendorName?: string };
  checkVendorBlacklist: (id: string) => { blacklisted: boolean; reason?: string; blacklistedAt?: string; vendorName?: string };
  setVendorBlacklist: (id: string, blacklisted: boolean, reason?: string, operator?: string) => boolean;
  reviewVendorProfilePending: (id: string, approve: boolean, reviewer?: string) => boolean;
}

export const useVendorStore = createEntityStore<Vendor>({
  resource: 'vendor',
  seed: [...mockVendors],
  stateKey: 'vendors',
  backfillKey: BACKFILL_FLAG,
  // 可插拔后端：供应商域专用接口
  backend: {
    list: () => vendorApi.getVendors({ page: 1, pageSize: 200 }).then((r) => (r?.data || []) as Vendor[]),
    create: (item) => vendorApi.createVendor(item as any),
    update: (id, patch) => vendorApi.updateVendor(id, patch as any),
    remove: (id) => vendorApi.deleteVendor(id),
    seed: (items) => {
      const legacy = readLegacyVendors();
      const source = legacy.length ? legacy : items;
      return Promise.all(source.map((v) => vendorApi.createVendor(v as any).catch(() => {})));
    },
  },
  // 保留原 store 的中文告警行为
  onError: (op) => {
    const msg =
      op === 'add' ? '供应商创建失败，已回滚本地数据'
        : op === 'update' ? '供应商更新失败，已回滚本地数据'
          : '供应商删除失败，已回滚本地数据';
    useGlobalToastStore.getState().showError(msg);
  },
  // 领域接口与领域方法：委托给工厂内部 ops，保持调用方零改动
  extend: (ctx) => ({
    ratingRecords: loadRatingsFromLS(),
    filter: initialFilter,
    selectedVendor: null,

    setVendors: (vendors: any) => ctx.set({ vendors }),
    setRatingRecords: (records: any) => {
      saveRatingsToLS(records);
      ctx.set({ ratingRecords: records });
    },
    addRatingRecord: (record: any) => {
      const next = [record, ...ctx.get().ratingRecords];
      saveRatingsToLS(next);
      ctx.set({ ratingRecords: next });
    },
    setFilter: (filter: any) => ctx.set({ filter }),
    resetFilter: () => ctx.set({ filter: initialFilter }),
    setSelectedVendor: (vendor: any) => ctx.set({ selectedVendor: vendor }),

    loadVendors: () => ctx.get().load(),
    addVendor: (vendor: Vendor) => ctx.primary.add(vendor),
    updateVendor: (id: any, patch: any) => ctx.primary.update(id, patch),
    deleteVendor: (id: any) => ctx.primary.remove(id),

    applyVendorCreditDelta: (id: any, delta: any) => {
      const v = ctx.get().vendors.find((x: any) => x.id === id);
      if (!v) return false;
      const used = v.usedCredit ?? 0;
      let next = used + delta;
      if (next < 0) next = 0; // 释放超额 → 归零，不阻断
      if (delta > 0 && v.creditLimit != null && next > v.creditLimit) {
        return false; // 超授信上限，拒绝占用（本地预判；服务端端点另有权威护栏，双重保险）
      }
      // V3.66.0 P1-3：本地乐观更新保留既有同步语义（调用方零改）；
      // 登录态下经服务端**相对原子端点** /credit-delta 权威落库（数据库内 used_credit += delta），
      // 根治原「本地读 → 算 → 整字段 PUT」在并发下的丢更新竞态。
      const snapshot = ctx.get().vendors.map((x: any) => ({ ...x }));
      ctx.set((state: any) => ({
        vendors: state.vendors.map((x: Vendor) => (x.id === id ? { ...x, usedCredit: next } : x)),
      }));
      if (isAuthed()) {
        vendorApi.creditDelta(id, delta, '业务单据信用联动').then((res) => {
          if (res?.usedCredit != null) {
            ctx.set((state: any) => ({
              vendors: state.vendors.map((x: Vendor) => (x.id === id ? { ...x, usedCredit: res.usedCredit } : x)),
            }));
          }
        }).catch(() => {
          ctx.set({ vendors: snapshot });
        });
      }
      return true;
    },

    checkVendorCredit: (id: any, amount: any) => {
      const v = ctx.get().vendors.find((x: any) => x.id === id);
      if (!v) return { ok: false, available: 0, limit: null, used: 0 };
      const used = v.usedCredit ?? 0;
      if (v.creditLimit == null) {
        return { ok: true, available: Infinity, limit: null, used, vendorName: v.name };
      }
      const available = v.creditLimit - used;
      return { ok: amount <= available, available, limit: v.creditLimit, used, vendorName: v.name };
    },

    checkVendorBlacklist: (id: any) => {
      const v = ctx.get().vendors.find((x: any) => x.id === id);
      if (!v) return { blacklisted: false };
      if (v.status !== 'blacklisted') return { blacklisted: false, vendorName: v.name };
      return { blacklisted: true, reason: v.blacklistReason, blacklistedAt: v.blacklistedAt, vendorName: v.name };
    },

    setVendorBlacklist: (id: any, blacklisted: any, reason: any, operator: any) => {
      const v = ctx.get().vendors.find((x: any) => x.id === id);
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
      ctx.primary.update(id, patch);
      return true;
    },

    reviewVendorProfilePending: (id: any, approve: any, reviewer: any) => {
      const v = ctx.get().vendors.find((x: any) => x.id === id);
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
        ctx.primary.update(id, cleared);
        return true;
      }
      const pick = (k: string) => (typeof pending[k] === 'string' && pending[k] ? (pending[k] as string) : undefined);
      ctx.primary.update(id, {
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
  }),
}) as unknown as UseBoundStore<StoreApi<VendorState>>;
