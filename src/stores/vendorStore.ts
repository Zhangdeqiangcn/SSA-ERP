import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vendor, VendorRatingRecord } from '@/types';
import { vendors as mockVendors } from '@/mocks/data/vendor';

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
  setVendors: (vendors: Vendor[]) => void;
  setRatingRecords: (records: VendorRatingRecord[]) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, patch: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  addRatingRecord: (record: VendorRatingRecord) => void;
  setFilter: (filter: VendorFilter) => void;
  resetFilter: () => void;
  setSelectedVendor: (vendor: Vendor | null) => void;
  /**
   * B1 信用卡点：统一的供应商信用额度增减入口。
   * delta > 0 表示占用额度（采购订单提交时），delta < 0 表示释放额度（收货过账 / 订单取消删除时）。
   * 规则：
   *  1) 供应商不存在 → 返回 false；
   *  2) 结果为负（释放超过已占用）→ 归零处理，仍返回 true（避免因历史脏数据卡死流程）；
   *  3) 占用后超过 creditLimit → 拒绝写入并返回 false（硬拦截）；
   *  4) 未设置 creditLimit 视为不限额，直接放行。
   */
  applyVendorCreditDelta: (id: string, delta: number) => boolean;
  /** B1：预检可用额度，不写入。返回 { ok, available, limit, used } */
  checkVendorCredit: (
    id: string,
    amount: number
  ) => { ok: boolean; available: number; limit: number | null; used: number; vendorName?: string };
  /**
   * B5 门户回写：甲方审核供应商在门户提交的待审资料。
   * approve=true 时把 profilePending 中与主数据对应的字段并入主数据并清空待审区；
   * approve=false 时仅清空待审区（驳回）。无待审资料返回 false。
   */
  reviewVendorProfilePending: (id: string, approve: boolean, reviewer?: string) => boolean;
  /**
   * B6 黑名单卡点：预检供应商是否处于黑名单，不写入。
   * 供应商不存在时按"未拉黑"处理（由各业务入口自行校验必填），
   * 命中时返回拉黑原因与供应商名称，供调用方组织提示文案。
   */
  checkVendorBlacklist: (
    id: string
  ) => { blacklisted: boolean; reason?: string; blacklistedAt?: string; vendorName?: string };
  /**
   * B6：拉黑 / 解除黑名单。拉黑时写入原因、时间并追加一条历史留痕；
   * 解除时状态回落到 approved 并清空当前原因（历史保留）。供应商不存在返回 false。
   */
  setVendorBlacklist: (
    id: string,
    blacklisted: boolean,
    reason?: string,
    operator?: string
  ) => boolean;
}

const initialFilter: VendorFilter = {};

export const useVendorStore = create<VendorState>()(
  persist(
    (set, get) => ({
      vendors: [...mockVendors],
      ratingRecords: [],
      filter: initialFilter,
      selectedVendor: null,
      setVendors: (vendors) => set({ vendors }),
      setRatingRecords: (records) => set({ ratingRecords: records }),
      addVendor: (vendor) => set((state) => ({ vendors: [vendor, ...state.vendors] })),
      updateVendor: (id, patch) =>
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') } : v
          ),
        })),
      deleteVendor: (id) =>
        set((state) => ({ vendors: state.vendors.filter((v) => v.id !== id) })),
      addRatingRecord: (record) => set((state) => ({ ratingRecords: [record, ...state.ratingRecords] })),
      setFilter: (filter) => set({ filter }),
      resetFilter: () => set({ filter: initialFilter }),
      setSelectedVendor: (vendor) => set({ selectedVendor: vendor }),
      applyVendorCreditDelta: (id, delta) => {
        let ok = false;
        set((state) => {
          const vendors = state.vendors.map((v) => {
            if (v.id !== id) return v;
            const used = v.usedCredit ?? 0;
            let next = used + delta;
            if (next < 0) next = 0; // 释放超额 → 归零，不阻断
            if (delta > 0 && v.creditLimit != null && next > v.creditLimit) {
              return v; // 超授信上限，拒绝占用
            }
            ok = true;
            return { ...v, usedCredit: next };
          });
          return { vendors };
        });
        return ok;
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
        let ok = false;
        set((state) => {
          const vendors = state.vendors.map((v) => {
            if (v.id !== id) return v;
            ok = true;
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            if (!blacklisted) {
              return {
                ...v,
                status: 'approved',
                blacklistReason: undefined,
                blacklistedAt: undefined,
                updatedAt: now,
              } as Vendor;
            }
            const history = [
              ...(v.blacklistReasonHistory ?? []),
              { reason: reason ?? '未填写原因', operator: operator ?? '系统', operatedAt: now },
            ];
            return {
              ...v,
              status: 'blacklisted',
              blacklistReason: reason ?? '未填写原因',
              blacklistedAt: now.slice(0, 10),
              blacklistReasonHistory: history,
              updatedAt: now,
            } as Vendor;
          });
          return { vendors };
        });
        return ok;
      },
      reviewVendorProfilePending: (id, approve, reviewer) => {
        let ok = false;
        set((state) => {
          const vendors = state.vendors.map((v) => {
            if (v.id !== id) return v;
            const pending = v.profilePending as Record<string, unknown> | undefined;
            if (!pending) return v;
            ok = true;
            const cleared = {
              ...v,
              profilePending: undefined,
              profilePendingAt: undefined,
              profilePendingBy: undefined,
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            } as Vendor;
            if (!approve) return cleared;
            // 只并入主数据实际持有的字段，其余门户扩展资料不污染主档
            const pick = (k: string) => (typeof pending[k] === 'string' && pending[k] ? (pending[k] as string) : undefined);
            return {
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
            } as Vendor;
          });
          return { vendors };
        });
        return ok;
      },
    }),
    {
      name: 'ssa-erp-vendor',
      version: 1,
      partialize: (state) => ({
        vendors: state.vendors,
        ratingRecords: state.ratingRecords,
      }),
    }
  )
);
