import { create } from 'zustand';
import { PurchaseRequest, PurchaseOrder, PurchaseOrderVersion, VendorQuote } from '@/types';
import { purchaseRequests as mockPurchaseRequests, purchaseOrders as mockPurchaseOrders, vendorQuotes as mockVendorQuotes } from '@/mocks/data/purchase';
import { purchaseApi, purchaseDomainApi, PURCHASE_PAGE_SIZE } from '@/services/purchase';
import { snakeToCamel } from '@/utils/case';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// ==================== C1 采购域关系化（V3.11.0）====================
//
// ── 改造前的状态：一个域、三个切片、两种命运 ────────────────────────
// 本 store 的 Blob（persist name: 'ssa-erp-purchase'，实测 4798 字节）
// 原本有三个数据切片，改造前处理方式各不相同：
//   · purchaseOrders   —— **V2.75.x 已直连 D1**（端点 /api/purchase-orders，
//     表 purchase_orders + purchase_order_items），partialize 早已不写它。
//     本轮**完全不动**，其 loadPurchaseOrders 通道原样保留。
//   · purchaseRequests —— 本轮迁 D1。5 条真实数据 / 8 行明细。
//   · vendorQuotes     —— 本轮迁 D1。2 条真实报价 / 6 行明细。
//
// ── ★★ vendorQuotes 为什么必须迁（与销售域 marketData 的关键分野）──
// V3.9.0 销售域有个 `marketData` 切片被**刻意不迁**，判据三条同时成立：
//   (a) 零 CRUD 调用点  (b) 仅一个只读消费方  (c) 本质是报表种子常量
// 本域 `vendorQuotes` **看似满足 (a)(b)** —— 全项目确实零写入调用点。
// 但 (c) 完全不成立：生产库里躺着 2 条真实供应商报价，
// 而且它们构成了一个完整业务场景 ——
//   `vq-001`（供应商A）与 `vq-002`（供应商B）对**同一张申请单 PR20240502001**
//   分别报价 2800 元与 2830 元，逐行明细（螺栓 M10 / M12 / 螺母 M10）价格各异。
//   **这正是「供应商比价」功能的唯一数据载体**（PointsCompare 页面读它
//   算最低价与节约额）。
// → **判据不是「像不像上一个不迁的先例」，而是「这份数据空了会怎样」。**
//   报价空了 = 比价功能没有任何依据 = 功能缺失，因此必须迁。
//
// ── 为什么本域必须「同步签名 + 乐观更新」（不能像销售域那样放开改 async）──
// 销售域 V3.9.0 覆盖了 10 个写调用点后放心改成 async，因为那些调用点
// 都是「调一下就走」。本域**形态相同但更极端**：15 处写调用点
// **没有一处 await 返回值、没有一处用返回值做分支**，例如
//   · `fromRequestIds.forEach((rid) => updatePurchaseRequest(rid, {...}))` 循环
//     （OrderForm.tsx 第 725 / 860 行 —— 批量把申请推进为 ordered）
//   · `pendingBatchDelete.forEach(r => deletePurchaseRequest(r.id))`（PurchaseList.tsx）
//   · `rows.forEach(r => addPurchaseRequest(r))` 导入循环（PurchaseList.tsx 第 275 行）
// 既然没人等返回值，**改 async 是安全的**；但保持同步签名收益更大：
// 15 处调用点零改动、零回归风险。因此采用与财务域同款的
// 「同步先改内存 → 异步落库 → 失败回滚 + 记 syncError」。
//
// ★ 唯一必须满足的隐式依赖：`src/services/apiService.ts` 里
//   `addPurchaseRequest(...)` 之后立刻读 `getState().purchaseRequests`。
//   「同步先改内存」天然满足这一点（异步落库时界面已是最新）。
//
// ── persist 必须删（与 BOM / 财务 / 销售同款理由）─────────────────
// backendStorage 的落点就是 app_state 那个大对象；保留 persist 等于
// 双通道照旧（D1 写一份、Blob 再写一份），C1 白改。
// 注意：partialize 原本就只写 purchaseRequests / vendorQuotes
// （purchaseOrders 早已排除），删掉 persist 后这两个切片也不再落 Blob。
//
// ── 接口形状一字不改 ─────────────────────────────────────────────
// 34 个业务消费方零改动：方法名、参数、返回值形状全部保持原样。
// **存储形态关系化，接口形状不变** —— 这是 C1 可复制的前提。

/** 首次空库回填标记：每个切片一个键，避免多端互相重复写入 */
const FLAG = {
  requests: 'ssa-erp-purchase-requests-backfilled',
  quotes: 'ssa-erp-purchase-quotes-backfilled',
};

/**
 * 采购**订单**切片的回填标记（W1 通道，V2.75.x 起既有）。
 * 刻意与上面两个分开：三个切片三条独立标记，
 * 「订单回填过了」不应阻止「申请再回填一次」，反之亦然。
 */
const ORDER_BACKFILL_FLAG = 'ssa-erp-purchase-backfilled';

/** localStorage 在某些环境（隐私模式 / 无痕）会抛异常，读写一律包一层 */
function flagGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function flagSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* 忽略 */ }
}

/** 把接口异常转成强哥看得懂的一句话（不暴露堆栈与状态码术语） */
function readableError(e: any): string {
  const status = e?.response?.status ?? e?.status;
  if (status === 401) return '登录已过期，请重新登录后重试';
  if (status === 403) return '当前账号没有采购数据的修改权限';
  if (status === 409) return '编号与服务器已有记录重复，请换一个编号';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

/** 读旧的 Blob 里的某一切片（仅用于首次回填，迁完之后这条路径自然废弃） */
function readLegacySlice<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-purchase');
    if (raw) {
      const st = JSON.parse(raw)?.state;
      if (st && Array.isArray(st[key])) return st[key] as T[];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * 拉取一个切片：成功返回数组，失败返回 null（调用方据此保留内存种子）。
 *
 * 空库回填只在**本设备第一次**发生（flag 落 localStorage）：
 * 否则多端会互相重复写入，也会让用户「删空了又长回来」——像灵异事件。
 * 回填来源优先取旧 Blob（保留用户已录入的真实数据），其次取 mock 种子。
 *
 * ★ 回填是逐条 POST，单条失败（单号冲突等）不阻断其余 ——
 *   但这意味着「回填部分成功」是可能的，因此回填后**必须重新拉一次列表**
 *   以服务器为准，而不是信任本地算出来的结果。
 */
/**
 * 从分页响应里稳健地取出数组（V3.115.0）。
 *
 * 为什么需要：不同后端/Mock 的包裹层数不一致 ——
 *   · 真实分页接口解包后是 { data: [...], total }
 *   · 部分 Mock（MSW）多包一层 { data: { data: [...], total } }
 * 原实现直接 `res?.data || []`，遇到第二种就把**对象**当数组塞进 store：
 * 列表页的 Array.isArray 守卫随即降级为空表 —— 表现为「采购申请明明有 5 条却显示暂无数据」，
 * 且不报任何错，极难排查。此处按层探测，取到数组即止，取不到返回空数组。
 */
function listFromResponse<T>(res: unknown): T[] {
  const r = res as Record<string, any> | null | undefined;
  const first = r?.data;
  if (Array.isArray(first)) return first as T[];
  const second = (first as Record<string, any> | undefined)?.data;
  if (Array.isArray(second)) return second as T[];
  const third = (second as Record<string, any> | undefined)?.data;
  if (Array.isArray(third)) return third as T[];
  return [];
}

async function pullSlice<T>(
  api: { list: (p?: Record<string, unknown>) => Promise<any>; create: (d: any) => Promise<any> },
  seed: T[],
  flagKey: string,
  legacyKey: string
): Promise<T[] | null> {
  try {
    const res = await api.list({ page: 1, pageSize: PURCHASE_PAGE_SIZE });
    const list = listFromResponse<T>(res);
    if (list.length === 0 && !flagGet(flagKey)) {
      flagSet(flagKey, '1');
      const legacy = readLegacySlice<T>(legacyKey);
      const source = legacy.length ? legacy : seed;
      let okCount = 0;
      for (const item of source) {
        try { await api.create(item); okCount += 1; } catch { /* 编号冲突等单条失败不阻断其余回填 */ }
      }
      const again = await api.list({ page: 1, pageSize: PURCHASE_PAGE_SIZE });
      const created = listFromResponse<T>(again);
      // V3.115.0 修复：回填一条都没成功、且读回来仍是空 → 说明是「后端不可用/未登录」，
      //   并非「用户真的把数据删空了」。此时必须返回 null 让调用方保留本地种子，
      //   否则列表会被刷成空表（实测表现：采购申请列表有种子数据却显示"暂无符合条件的数据"）。
      if (okCount === 0 && created.length === 0) return null;
      return created;
    }
    // list 为 0 且已回填过 = 用户确实把数据删空了，如实返回空数组，不再塞种子
    return list;
  } catch {
    return null;
  }
}

function rowToPurchaseOrder(row: any): PurchaseOrder {
  const m = snakeToCamel(row) as any;
  let history = m.history;
  if (typeof history === 'string') {
    try { history = JSON.parse(history); } catch { history = []; }
  }
  return { ...m, history: history || [] } as PurchaseOrder;
}

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

interface PurchaseFilter {
  requestNo?: string;
  title?: string;
  status?: string;
  priority?: string;
}

interface PurchaseState {
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  vendorQuotes: VendorQuote[];
  filter: PurchaseFilter;
  selectedRequest: PurchaseRequest | null;
  selectedOrder: PurchaseOrder | null;
  /** C1：两个新迁切片是否已从服务器拉取过 */
  loaded: boolean;
  /** C1：最近一次写库失败的可读中文原因（成功后自动清空） */
  syncError: string;

  // Request CRUD
  addPurchaseRequest: (request: PurchaseRequest) => void;
  updatePurchaseRequest: (id: string, updates: Partial<PurchaseRequest>) => void;
  deletePurchaseRequest: (id: string) => void;

  // Order CRUD
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  /** B10 订单变更单：变更生成新版本（非原地修改），已收货/终态锁定；返回 ok/error/新版本号 */
  changePurchaseOrder: (
    id: string,
    updates: Partial<Pick<PurchaseOrder, 'expectedDeliveryDate' | 'items' | 'paymentTerms' | 'tradeTerms' | 'deliveryAddress' | 'remarks' | 'totalAmount'>>,
    reason: string,
    changedBy?: string
  ) => { ok: boolean; error?: string; version?: number };
  deletePurchaseOrder: (id: string) => void;
  /**
   * B5 门户回写：供应商门户确认订单后，将主系统采购订单状态推进为 'vendorConfirmed'。
   * 幂等守卫：已是 vendorConfirmed/confirmed/received/closed/cancelled 则不重复回写。
   */
  confirmOrderByVendor: (poId: string, info: { vendorId: string; operator?: string; note?: string; confirmedDeliveryDate?: string }) => boolean;

  // Quote CRUD
  addVendorQuote: (quote: VendorQuote) => void;
  updateVendorQuote: (id: string, updates: Partial<VendorQuote>) => void;
  deleteVendorQuote: (id: string) => void;

  // Setters
  setPurchaseRequests: (requests: PurchaseRequest[]) => void;
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  setVendorQuotes: (quotes: VendorQuote[]) => void;
  /** W1 根治双通道：从 D1 purchase_orders 拉取（在线）。空库首次从 legacy Blob / mock 回填一次。 */
  loadPurchaseOrders: () => Promise<void>;
  /**
   * C1 采购域：从 D1 拉取**新迁的两个切片**（采购申请 + 供应商报价）。
   * 与 loadPurchaseOrders 分开、**互不覆盖** —— 订单切片有自己的回填标记与
   * 失败语义，合并进一个函数会让「订单拉取失败」误伤另两个切片的状态。
   */
  load: () => Promise<void>;
  setFilter: (filter: PurchaseFilter) => void;
  resetFilter: () => void;
  setSelectedRequest: (request: PurchaseRequest | null) => void;
  setSelectedOrder: (order: PurchaseOrder | null) => void;
}

const initialFilter: PurchaseFilter = {};

/**
 * 写库失败时的统一收尾：回滚内存 + 记可读原因。
 * 失败必须是**吵闹的**（回滚 + 中文提示 + syncError），不能静默 ——
 * 否则用户看到「保存成功」而数据其实没进服务器。
 */
function reportFailure(set: any, e: any, failMsg: string) {
  set({ syncError: `${failMsg}：${readableError(e)}` });
}

export const usePurchaseStore = create<PurchaseState>()((set, get) => ({
  // 启动时加载 Mock 种子；load() 成功后被 D1 数据整体覆盖。
  // ★ 种子只存在于内存（persist 已删），不会落 Blob。
  purchaseRequests: [...mockPurchaseRequests],
  purchaseOrders: [...mockPurchaseOrders],
  vendorQuotes: [...mockVendorQuotes],
  filter: initialFilter,
  selectedRequest: null,
  selectedOrder: null,
  loaded: false,
  syncError: '',

  // ── Request CRUD（C1：同步改内存 → 异步落库 → 失败回滚 + 记原因）──
  // ★ 保持**同步签名**（不返回 Promise）：15 处调用点全部不 await，
  //   含 `forEach` 批量循环与「提交后立刻跳转」；改 async 会牵动 15 处、
  //   收益为零、风险不小（见文件头说明）。
  addPurchaseRequest: (request) => {
    set((state) => ({ purchaseRequests: [request, ...state.purchaseRequests] }));
    purchaseDomainApi.requests
      .create(request as any)
      .then((created) => {
        // 后端可能规范化了字段（如 id 由服务端生成）→ 以服务器回执为准替换
        const mapped = snakeToCamel(created) as any;
        if (mapped?.id && mapped.id !== request.id) {
          set((state) => ({
            purchaseRequests: state.purchaseRequests.map((r) =>
              r.id === request.id ? ({ ...r, ...mapped } as PurchaseRequest) : r
            ),
          }));
        }
        if (get().syncError) set({ syncError: '' });
      })
      .catch((e) => {
        // 回滚：把刚乐观插入的那条移除（否则界面上有一条服务器没有的幽灵记录）
        set((state) => ({
          purchaseRequests: state.purchaseRequests.filter((r) => r.id !== request.id),
        }));
        reportFailure(set, e, '新增采购申请失败');
      });
  },

  updatePurchaseRequest: (id, updates) => {
    const before = get().purchaseRequests.find((r) => r.id === id);
    set((state) => ({
      purchaseRequests: state.purchaseRequests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
    // ★ 只传 updates（**不带 items**）：后端语义是「不传子数组 = 明细保持原样」。
    //   若把整条记录（含 items）一起 PUT，遇到「用旧版数据编辑后明细被截断」
    //   会极难查；且审批、下单这些高频操作根本不涉及明细，不该碰子表。
    purchaseDomainApi.requests
      .update(id, updates as any)
      .then(() => { if (get().syncError) set({ syncError: '' }); })
      .catch((e) => {
        if (before) {
          set((state) => ({
            purchaseRequests: state.purchaseRequests.map((r) => (r.id === id ? before : r)),
          }));
        }
        reportFailure(set, e, '更新采购申请失败');
      });
  },

  deletePurchaseRequest: (id) => {
    const before = get().purchaseRequests;
    set((state) => ({
      purchaseRequests: state.purchaseRequests.filter((r) => r.id !== id),
    }));
    purchaseDomainApi.requests
      .remove(id)
      .then(() => { if (get().syncError) set({ syncError: '' }); })
      .catch((e) => {
        // 回滚：整组恢复（删除只影响一条，但保持引用简单、避免漏恢复明细）
        set({ purchaseRequests: before });
        reportFailure(set, e, '删除采购申请失败');
      });
  },

      // Order CRUD
      addPurchaseOrder: async (order) => {
        // 乐观更新：先入内存，再写 D1
        set((state) => ({ purchaseOrders: [order, ...state.purchaseOrders] }));
        try {
          const created = await purchaseApi.createPurchaseOrder(order as any);
          const mapped = rowToPurchaseOrder(created);
          if (mapped?.id && mapped.id !== order.id) {
            set((state) => ({
              purchaseOrders: state.purchaseOrders.map((o) => (o.id === order.id ? mapped : o)),
            }));
          }
        } catch (e) {
          // 写失败：回滚乐观插入，避免界面出现服务器没有的幽灵记录（#38 静默失败消除；全局红条告警）
          set((state) => ({
            purchaseOrders: state.purchaseOrders.filter((o) => o.id !== order.id),
          }));
          useGlobalToastStore.getState().showError(`新增采购订单失败：${readableError(e)}`);
        }
      },

      updatePurchaseOrder: async (id, updates) => {
        const before = get().purchaseOrders.find((o) => o.id === id);
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        }));
        try {
          await purchaseApi.updatePurchaseOrder(id, updates as any);
        } catch (e) {
          // 写失败：回滚到改前快照（#38 静默失败消除）
          if (before) {
            set((state) => ({
              purchaseOrders: state.purchaseOrders.map((o) => (o.id === id ? before : o)),
            }));
          }
          useGlobalToastStore.getState().showError(`更新采购订单失败：${readableError(e)}`);
        }
      },

      confirmOrderByVendor: (poId, info) => {
        let ok = false;
        set((state) => {
          const po = state.purchaseOrders.find((o) => o.id === poId);
          if (!po) return {};
          // 幂等守卫：终态或已确认不再回写
          if (
            po.status === 'vendorConfirmed' ||
            po.status === 'confirmed' ||
            po.status === 'received' ||
            po.status === 'closed' ||
            po.status === 'cancelled'
          ) {
            ok = true; // 视为已处理成功，避免门户重复提交报错
            return {};
          }
          ok = true;
          return {
            purchaseOrders: state.purchaseOrders.map((o) =>
              o.id === poId
                ? {
                    ...o,
                    status: 'vendorConfirmed',
                    confirmedBy: info.operator || info.vendorId,
                    confirmedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    confirmedNote: info.note,
                    // B5: 供应商确认交期（独立列，不修改原expectedDeliveryDate）
                    vendorConfirmedDate: info.confirmedDeliveryDate || o.expectedDeliveryDate,
                  }
                : o
            ),
          };
        });
        // 根治双通道：供应商确认状态经 PUT 落真实 D1（fire-and-forget，写失败保留内存态）
        if (ok) {
          purchaseApi.updatePurchaseOrder(poId, {
            status: 'vendorConfirmed',
            confirmedBy: info.operator || info.vendorId,
            confirmedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            confirmedNote: info.note,
            vendorConfirmedDate: info.confirmedDeliveryDate,
          } as any).catch((e) => {
            // 回写失败：内存已乐观置 vendorConfirmed，全局红条告警（#38 静默失败消除）
            useGlobalToastStore.getState().showError(`供应商确认订单回写失败：${readableError(e)}`);
          });
        }
        return ok;
      },

      // ── B10 采购订单变更单：版本留痕，非原地修改 ──────────────
      changePurchaseOrder: (id, updates, reason, changedBy = 'admin') => {
        let result: { ok: boolean; error?: string; version?: number } = { ok: false };
        set((state) => {
          const po = state.purchaseOrders.find((o) => o.id === id);
          if (!po) {
            result = { ok: false, error: '采购订单不存在' };
            return {};
          }
          // 锁定规则：已收货（有累计收货量或收货态）或终态禁止变更
          const locked =
            (po.deliveredQuantity || 0) > 0 ||
            po.status === 'received' ||
            po.status === 'closed' ||
            po.status === 'cancelled';
          if (locked) {
            result = { ok: false, error: '订单已收货或已结束，禁止变更' };
            return {};
          }
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const curVersion = po.version || 1;
          // 快照当前关键字段入历史（最新在前），支撑差异对比与审计
          const historyEntry: PurchaseOrderVersion = {
            version: curVersion,
            changedAt: now,
            changedBy,
            changeReason: reason || '未填写变更原因',
            snapshot: {
              expectedDeliveryDate: po.expectedDeliveryDate,
              items: po.items,
              totalAmount: po.totalAmount,
              paymentTerms: po.paymentTerms,
              tradeTerms: po.tradeTerms,
              deliveryAddress: po.deliveryAddress,
              remarks: po.remarks,
            },
          };
          result = { ok: true, version: curVersion + 1 };
          return {
            purchaseOrders: state.purchaseOrders.map((o) =>
              o.id === id
                ? {
                    ...o,
                    ...updates,
                    version: curVersion + 1,
                    history: [historyEntry, ...(o.history || [])],
                  }
                : o
            ),
          };
        });
        // 根治双通道：B10 版本留痕经 PUT 落真实 D1（fire-and-forget，写失败保留内存态）
        if (result.ok) {
          const po = get().purchaseOrders.find((o) => o.id === id);
          if (po) {
            purchaseApi.updatePurchaseOrder(id, { ...updates, version: po.version, history: po.history } as any).catch((e) => {
              // 版本留痕回写失败：内存已乐观写入历史，全局红条告警（#38 静默失败消除）
              useGlobalToastStore.getState().showError(`采购订单变更保存失败：${readableError(e)}`);
            });
          }
        }
        return result;
      },

      deletePurchaseOrder: async (id) => {
        const before = get().purchaseOrders;
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter((o) => o.id !== id),
        }));
        try {
          await purchaseApi.deletePurchaseOrder(id);
        } catch (e) {
          // 写失败：恢复被删记录（#38 静默失败消除）
          set({ purchaseOrders: before });
          useGlobalToastStore.getState().showError(`删除采购订单失败：${readableError(e)}`);
        }
      },

      // ── W1 根治双通道：采购订单切片直连 D1（本轮**保持原样，不动**）──
      loadPurchaseOrders: async () => {
        try {
          const res = await purchaseApi.getPurchaseOrders({ page: 1, pageSize: 200 });
          const orders = (res?.data || []).map(rowToPurchaseOrder);
          set({ purchaseOrders: orders });
          // 首次空库：从 legacy app_state / mockPurchaseOrders 回填一次，消除双源过渡缺口
          if (orders.length === 0 && !flagGet(ORDER_BACKFILL_FLAG)) {
            flagSet(ORDER_BACKFILL_FLAG, '1');
            const legacy = readLegacySlice<PurchaseOrder>('purchaseOrders');
            const seed = legacy.length ? legacy : [...mockPurchaseOrders];
            for (const o of seed) {
              try { await purchaseApi.createPurchaseOrder(o as any); } catch { /* 单号冲突等忽略，回填尽力而为 */ }
            }
            const refreshed = await purchaseApi.getPurchaseOrders({ page: 1, pageSize: 200 });
            set({ purchaseOrders: (refreshed?.data || []).map(rowToPurchaseOrder) });
          }
        } catch {
          /* 离线/未登录/接口异常：保持内存 mockPurchaseOrders，不阻断 UI */
        }
      },

      // ── C1：新迁两个切片的服务端拉取（与订单通道各自独立）──────────
      load: async () => {
        const [requests, quotes] = await Promise.all([
          pullSlice<PurchaseRequest>(
            purchaseDomainApi.requests,
            mockPurchaseRequests,
            FLAG.requests,
            'purchaseRequests'
          ),
          pullSlice<VendorQuote>(
            purchaseDomainApi.quotes,
            mockVendorQuotes,
            FLAG.quotes,
            'vendorQuotes'
          ),
        ]);

        const patch: Partial<PurchaseState> = {};
        // pullSlice 返回 null = 拉取失败 → 保留内存种子，不覆盖（避免把有内容的表刷成空）
        if (requests) patch.purchaseRequests = requests;
        if (quotes) patch.vendorQuotes = quotes;

        const failed = [requests, quotes].filter((x) => x === null).length;
        set({
          ...patch,
          loaded: true,
          syncError:
            failed === 2
              ? '无法从服务器读取采购数据：网络或登录状态异常（当前显示的是本机示例数据）'
              : failed > 0
                ? `采购数据部分切片读取失败（${failed}/2），未成功的已保留本机数据`
                : '',
        });
      },

      // ── Quote CRUD（C1：同 Request，同步签名 + 乐观更新）──────────
      addVendorQuote: (quote) => {
        set((state) => ({ vendorQuotes: [quote, ...state.vendorQuotes] }));
        purchaseDomainApi.quotes
          .create(quote as any)
          .then((created) => {
            const mapped = snakeToCamel(created) as any;
            if (mapped?.id && mapped.id !== quote.id) {
              set((state) => ({
                vendorQuotes: state.vendorQuotes.map((q) =>
                  q.id === quote.id ? ({ ...q, ...mapped } as VendorQuote) : q
                ),
              }));
            }
            if (get().syncError) set({ syncError: '' });
          })
          .catch((e) => {
            set((state) => ({
              vendorQuotes: state.vendorQuotes.filter((q) => q.id !== quote.id),
            }));
            reportFailure(set, e, '新增供应商报价失败');
          });
      },

      updateVendorQuote: (id, updates) => {
        const before = get().vendorQuotes.find((q) => q.id === id);
        set((state) => ({
          vendorQuotes: state.vendorQuotes.map((q) =>
            q.id === id ? { ...q, ...updates } : q
          ),
        }));
        // 同样只传 updates（不带 items），保持子表原样
        purchaseDomainApi.quotes
          .update(id, updates as any)
          .then(() => { if (get().syncError) set({ syncError: '' }); })
          .catch((e) => {
            if (before) {
              set((state) => ({
                vendorQuotes: state.vendorQuotes.map((q) => (q.id === id ? before : q)),
              }));
            }
            reportFailure(set, e, '更新供应商报价失败');
          });
      },

      deleteVendorQuote: (id) => {
        const before = get().vendorQuotes;
        set((state) => ({
          vendorQuotes: state.vendorQuotes.filter((q) => q.id !== id),
        }));
        purchaseDomainApi.quotes
          .remove(id)
          .then(() => { if (get().syncError) set({ syncError: '' }); })
          .catch((e) => {
            set({ vendorQuotes: before });
            reportFailure(set, e, '删除供应商报价失败');
          });
      },

      // Setters
      setPurchaseRequests: (requests) => set({ purchaseRequests: requests }),
      setPurchaseOrders: (orders) => set({ purchaseOrders: orders }),
      setVendorQuotes: (quotes) => set({ vendorQuotes: quotes }),
      setFilter: (filter) => set({ filter }),
      resetFilter: () => set({ filter: initialFilter }),
      setSelectedRequest: (request) => set({ selectedRequest: request }),
      setSelectedOrder: (order) => set({ selectedOrder: order }),
}));

// ── C1：persist 已整体移除 ──────────────────────────────────────────
// 原实现用 `persist(..., { storage: backendStorage, name: 'ssa-erp-purchase',
// version: 2, partialize: {...}, migrate: ... })`。
// backendStorage 的落点就是 `app_state` 表里的 `ssa-erp-purchase` 键 ——
// 那正是本轮要清掉的 Blob。保留它 = 双通道照旧（D1 写一份、Blob 再写一份），
// C1 这次改造等于白做。因此 persist 与它的 partialize / migrate 一并删除。
//
// ★ 随 persist 一起失效的是 v1→v2 的 `migrate`（A2 税价拆分，为存量采购订单
//   回填币种与行级税字段）。它**不再需要**，因为：
//   · purchaseOrders 早已直连 D1（V2.75.x），D1 里的数据在写入时就带税字段；
//   · Blob 中残留的 purchaseOrders 只在「首次空库回填」时被读一次
//     （readLegacySlice('purchaseOrders')），而这只是一次性过渡路径。
//   · 因此 `normalizeOrderTax` 的导入也一并移除（本文件已无调用）。
//     若极老的本机 Blob 里仍有无税字段的订单，回填后会缺税字段 ——
//     这是**可接受的过渡代价**：回填是尽力而为的兼容路径，不是长期机制；
//     长期主源是 D1，而 D1 侧由后端订单链保证税字段完整。
//
// ★ ORDER_BACKFILL_FLAG 是**订单切片**（W1 通道）的标记，与本轮两个新切片
//   各自的 FLAG 分开 —— 三个切片三条独立标记，互不干扰：
//   「订单回填过了」不应阻止「申请再回填一次」，反之亦然。
