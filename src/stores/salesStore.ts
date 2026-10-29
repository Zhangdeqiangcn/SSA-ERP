import { create } from 'zustand';
import { SalesOrder, Prospect, Shipment, Project, MarketData } from '@/types';
import {
  salesOrders as mockSalesOrders,
  prospects as mockProspects,
  shipments as mockShipments,
  projects as mockProjects,
  marketData as mockMarketData,
} from '@/mocks/data/sales';
import { customers as mockCustomerSeed } from '@/mocks/data/customer';
import { salesApi } from '@/services/w1Api';
import { salesDomainApi, SALES_PAGE_SIZE } from '@/services/salesApi';
import { snakeToCamel } from '@/utils/case';
import { useGlobalToastStore } from '@/stores/globalToastStore';
import { useSalesContractStore } from './salesContractStore';

// ==================== C1 销售域关系化（V3.9.0）====================
//
// ── 改造前的状态：一个域、两套存储 ──────────────────────────────────
// 销售域与财务域同样是「迁了一半」，但残留方式不同：
//   · `salesOrders` 已在 W1「根治双通道」中迁到真实 D1
//     （端点 /api/sales-orders，表 sales_orders 44 列 + sales_order_items）；
//   · `prospects / shipments / projects / marketData` 四个切片仍在
//     `app_state` 的 JSON 大对象里（persist name: 'ssa-erp-sales'）。
// 实测该键体积 10668 字节，四个切片合计约 10.4 KB。
//
// 后果与财务域同款：**数据会分家**。换台电脑打开，订单还在、意向客户没了，
// 且没有任何报错。「意向客户 → 销售订单」的转化链路一头是关系表、
// 一头是 JSON，外键加不上、按客户统计跟进转化率根本无从下手。
//
// ── 改造后：D1 为唯一真相源，persist 整体删除 ───────────────────────
// 与 BOM（V3.6.0）、财务（V3.8.0）同一套设计：
//   ① 数据主源 = D1 关系表，经 salesDomainApi / salesApi 读写；
//   ② **彻底移除 persist** —— backendStorage 的落点就是 app_state 那个大对象，
//      保留它等于双通道照旧（D1 写一份、Blob 再写一份），C1 白改；
//   ③ 初始值仍是 mock 种子，但**只存在于内存**，load() 成功后被 D1 数据整体覆盖。
//
// ── 为什么 `marketData` 刻意留在内存（这是判断，不是遗漏）────────────
// 全项目仅 MarketAnalysis.tsx 一个消费方，只做 `marketData[0]` 读取，
// **store 里没有任何 addMarketData / updateMarketData / deleteMarketData**。
// 也就是说它没有写入方、没有单一事实来源，本质是报表种子常量。
// 为它建三张子表（topProducts / regionalData / salesTrend）只会得到
// 「永远只有种子数据的表 + 零个端点」，白白增加三张需要在 RLS 里登记、
// 需要维护的表。因此保留为内存常量，并在 load() 里显式不参与拉取。
//
// ── 与财务域最大的不同：本域可以放心改 async ────────────────────────
// 财务 store 有 33 个消费方大量**同步**依赖返回值（createVoucher 返回
// VoucherActionResult、generateVoucherFromInvoice 返回 voucherNo），
// 被迫保留同步签名 + 乐观更新壳。
// 销售域则相反：全部 10 个写方法调用点都是「调一下就走」——
//   · ProspectList / ProjectList / LogisticsList 的导入循环 `rows.forEach(...)`
//   · 表单提交后直接关弹窗
//   · Test/FlowSelfTest 的流程自检
// 没有一个 await 返回值、没有一个用返回值做分支。
// 唯一的隐式依赖在 services/apiService.ts：`updateProspect(id, data)` 之后
// 立刻 `getState().prospects.find(...)` —— 只要乐观更新是「同步先改内存」
// 就能满足（实现见下），因此改成 async 是安全的，且不再需要财务那套回滚壳。
//
// ── 一个保留的取舍：乐观更新下「界面先动、落库后到」──────────────────
// 所有写方法都是「同步改内存 → 异步落库 → 失败回滚内存 + 记 syncError」。
// 失败必须是吵闹的（回滚 + 可读中文原因），不能静默 ——
// 否则用户看到「已保存成功」而数据其实没进服务器。

/** 首次空库回填标记：每个切片一个键，避免多端互相重复写入 */
const FLAG = {
  prospects: 'ssa-erp-sales-prospects-backfilled',
  shipments: 'ssa-erp-sales-shipments-backfilled',
  projects: 'ssa-erp-sales-projects-backfilled',
};

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
  if (status === 403) return '当前账号没有销售数据的修改权限';
  if (status === 409) return '编号与服务器已有记录重复，请换一个编号';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

/** 读旧的 Blob 里的某一切片（仅用于首次回填，迁完之后这条路径自然废弃） */
function readLegacySlice<T>(key: keyof SalesState): T[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-sales');
    if (raw) {
      const st = JSON.parse(raw)?.state;
      if (st && Array.isArray(st[key])) return st[key] as T[];
    }
  } catch { /* ignore */ }
  return [];
}

function rowToSalesOrder(row: any): SalesOrder {
  return snakeToCamel(row) as SalesOrder;
}

/**
 * 拉取一个切片：成功返回数组，失败返回 null（调用方据此保留内存种子）。
 *
 * 空库回填只在**本设备第一次**发生（flag 落 localStorage）：
 * 否则多端会互相重复写入，也会让用户「删空了又长回来」——像灵异事件。
 * 回填来源优先取旧 Blob（保留用户已录入的真实数据），其次取 mock 种子。
 */
async function pullSlice<T>(
  api: { list: (p?: Record<string, unknown>) => Promise<any>; create: (d: any) => Promise<any> },
  seed: T[],
  flagKey: string,
  legacyKey: keyof SalesState
): Promise<T[] | null> {
  try {
    const res = await api.list({ page: 1, pageSize: SALES_PAGE_SIZE });
    const list = (res?.data || []) as T[];
    if (list.length === 0 && !flagGet(flagKey)) {
      flagSet(flagKey, '1');
      const legacy = readLegacySlice<T>(legacyKey);
      const source = legacy.length ? legacy : seed;
      for (const item of source) {
        try { await api.create(item); } catch { /* 编号冲突等单条失败不阻断其余回填 */ }
      }
      const again = await api.list({ page: 1, pageSize: SALES_PAGE_SIZE });
      return (again?.data || []) as T[];
    }
    // list 为 0 且已回填过 = 用户确实把数据删空了，如实返回空数组，不再塞种子
    return list;
  } catch {
    return null;
  }
}

interface SalesState {
  salesOrders: SalesOrder[];
  prospects: Prospect[];
  shipments: Shipment[];
  projects: Project[];
  /** ★ 刻意不迁 D1：零 CRUD 的报表种子数据（见文件头说明） */
  marketData: MarketData[];

  /** C1：D1 同步状态（页面可据此显示加载态 / 失败原因） */
  loaded: boolean;
  syncError: string;

  // SalesOrder CRUD
  addSalesOrder: (order: SalesOrder) => Promise<void>;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => Promise<void>;
  deleteSalesOrder: (id: string) => Promise<void>;
  /** W1 根治双通道：从 D1 sales_orders 拉取（在线）。空库首次从 legacy Blob / mock 回填一次。 */
  loadSalesOrders: () => Promise<void>;

  // Prospect CRUD
  addProspect: (prospect: Prospect) => Promise<void>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;

  // Shipment CRUD
  addShipment: (shipment: Shipment) => Promise<void>;
  updateShipment: (id: string, updates: Partial<Shipment>) => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;

  // Project CRUD
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  /** C1：从 D1 拉取全部已关系化的切片（意向客户 / 发货单 / 项目） */
  load: () => Promise<void>;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useSalesStore = create<SalesState>()((set, get) => {
  /**
   * 乐观提交：同步改内存 → 异步落库 → 失败回滚内存并记下可读原因。
   *
   * 与财务 store 的 commit 壳同一套语义，但**不需要 await 拿到结果**——
   * 本域没有调用方依赖写方法的返回值（见文件头说明），
   * 因此统一返回 Promise<void>，调用方 await 与否都不会出错。
   */
  const commit = async (
    apply: () => void,
    rollback: () => void,
    persist: () => Promise<unknown>,
    failMsg: string
  ) => {
    apply();
    try {
      const res: any = await persist();
      // ★ V3.61.0 S-02：服务端过账失败（发货→自动生成出库单失败）会在响应体回传
      //   postingError，但 HTTP 仍是 200 —— 只看 HTTP 异常会让「界面显示已发货、
      //   实际没出库」对用户零感知（铁律㊴ 反假成功）。此处照搬仓库侧
      //   warehouseStore 的既有实现：读响应体 postingError → 红条 + 重新拉取真实状态。
      if (res && typeof res === 'object' && res.postingError) {
        rollback();
        set({ syncError: `${failMsg}：${res.postingError}` });
        useGlobalToastStore.getState().showError(`${failMsg}：${res.postingError}`);
        return;
      }
      if (get().syncError) set({ syncError: '' });
    } catch (e: any) {
      rollback();
      set({ syncError: `${failMsg}：${readableError(e)}` });
    }
  };

  return {
    salesOrders: [...mockSalesOrders],
    prospects: [...mockProspects],
    shipments: [...mockShipments],
    projects: [...mockProjects],
    marketData: [...mockMarketData],
    loaded: false,
    syncError: '',

    // ==================== SalesOrder（W1 既有 D1 通道，保持不变）====================
    addSalesOrder: async (order) => {
      set((s) => ({ salesOrders: addArr(s.salesOrders, order) }));
      // P0-2：订单创建后回写关联合同（合同侧聚合 linkedOrderNos），实现合同↔订单双向可达。
      if (order.contractId) {
        useSalesContractStore.getState().linkOrder(order.contractId, order.orderNo);
      }
      try {
        const created = await salesApi.createSalesOrder(order as any);
        const mapped = rowToSalesOrder(created);
        if (mapped?.id && mapped.id !== order.id) {
          set((s) => ({ salesOrders: s.salesOrders.map((o) => (o.id === order.id ? mapped : o)) }));
        }
      } catch (e: any) {
        // V3.58.0 修复 S-19：销售订单写失败接入全局红条告警（铁律㊴ 界面点得动≠已落库）。
        // 原实现只写 syncError（销售页无人渲染该字段），用户以为存上了、刷新才消失。
        set((s) => {
          const idx = s.salesOrders.findIndex((o) => o.id === order.id);
          if (idx < 0) return {};
          const next = [...s.salesOrders];
          next.splice(idx, 1);
          return { salesOrders: next, syncError: `订单「${order.orderNo || order.id}」保存到服务器失败，已撤回：${readableError(e)}` };
        });
        useGlobalToastStore.getState().showError(
          `销售订单「${order.orderNo || order.id}」保存到服务器失败，已撤回：${readableError(e)}`
        );
      }
    },
    updateSalesOrder: async (id, u) => {
      const prev = get().salesOrders.find((o) => o.id === id);
      // P0-2：contractId 变化时同步合同侧聚合（解绑旧合同 + 绑定新合同），保持双向一致。
      const prevContract = prev?.contractId;
      const nextContract = u.contractId !== undefined ? u.contractId : prevContract;
      if (prevContract && prevContract !== nextContract) {
        useSalesContractStore.getState().unlinkOrder(prevContract, prev?.orderNo || '');
      }
      if (nextContract && nextContract !== prevContract) {
        useSalesContractStore.getState().linkOrder(nextContract, prev?.orderNo || (u.orderNo as string) || '');
      }
      await commit(
        () => set((s) => ({ salesOrders: updateArr(s.salesOrders, id, u) })),
        () => { if (prev) set((s) => ({ salesOrders: s.salesOrders.map((o) => (o.id === id ? prev : o)) })); },
        () => salesApi.updateSalesOrder(id, u as any),
        `订单「${prev?.orderNo || id}」修改未保存，已还原`
      );
    },
    deleteSalesOrder: async (id) => {
      const prev = get().salesOrders.find((o) => o.id === id);
      // P0-2：订单删除时解除与合同的关联，保持双向一致。
      if (prev?.contractId) {
        useSalesContractStore.getState().unlinkOrder(prev.contractId, prev.orderNo);
      }
      await commit(
        () => set((s) => ({ salesOrders: deleteArr(s.salesOrders, id) })),
        () => { if (prev) set((s) => ({ salesOrders: addArr(s.salesOrders, prev) })); },
        () => salesApi.deleteSalesOrder(id),
        `订单「${prev?.orderNo || id}」删除未生效，已还原`
      );
    },
    loadSalesOrders: async () => {
      try {
        const res = await salesApi.getSalesOrders({ page: 1, pageSize: 200 });
        const orders = (res?.data || []).map(rowToSalesOrder);
        set({ salesOrders: orders });
        if (orders.length === 0 && !window.localStorage.getItem('ssa-erp-sales-backfilled')) {
          window.localStorage.setItem('ssa-erp-sales-backfilled', '1');
          const seed = [...mockSalesOrders];
          for (const o of seed) {
            try { await salesApi.createSalesOrder(o as any); } catch { /* 单号冲突等忽略 */ }
          }
          const refreshed = await salesApi.getSalesOrders({ page: 1, pageSize: 200 });
          set({ salesOrders: (refreshed?.data || []).map(rowToSalesOrder) });
        }
      } catch {
        /* 离线/未登录/接口异常：保持内存 mockSalesOrders，不阻断 UI */
      }
    },

    // ==================== Prospect（C1 迁 D1）====================
    addProspect: async (prospect) =>
      commit(
        () => set((s) => ({ prospects: addArr(s.prospects, prospect) })),
        () => set((s) => ({ prospects: deleteArr(s.prospects, prospect.id) })),
        () => salesDomainApi.prospects.create(prospect),
        `意向客户「${prospect.companyName || prospect.id}」保存到服务器失败，已撤回`
      ),
    updateProspect: async (id, u) => {
      const prev = get().prospects.find((p) => p.id === id);
      await commit(
        () => set((s) => ({ prospects: updateArr(s.prospects, id, u) })),
        () => { if (prev) set((s) => ({ prospects: s.prospects.map((p) => (p.id === id ? prev : p)) })); },
        () => salesDomainApi.prospects.update(id, u),
        `意向客户「${prev?.companyName || id}」修改未保存，已还原`
      );
    },
    deleteProspect: async (id) => {
      const prev = get().prospects.find((p) => p.id === id);
      await commit(
        () => set((s) => ({ prospects: deleteArr(s.prospects, id) })),
        () => { if (prev) set((s) => ({ prospects: addArr(s.prospects, prev) })); },
        () => salesDomainApi.prospects.remove(id),
        `意向客户「${prev?.companyName || id}」删除未生效，已还原`
      );
    },

    // ==================== Shipment（C1 迁 D1）====================
    addShipment: async (shipment) =>
      commit(
        () => set((s) => ({ shipments: addArr(s.shipments, shipment) })),
        () => set((s) => ({ shipments: deleteArr(s.shipments, shipment.id) })),
        () => salesDomainApi.shipments.create(shipment),
        `发货单「${shipment.shipmentNo || shipment.id}」保存到服务器失败，已撤回`
      ),
    updateShipment: async (id, u) => {
      const prev = get().shipments.find((x) => x.id === id);
      await commit(
        () => set((s) => ({ shipments: updateArr(s.shipments, id, u) })),
        () => { if (prev) set((s) => ({ shipments: s.shipments.map((x) => (x.id === id ? prev : x)) })); },
        () => salesDomainApi.shipments.update(id, u),
        `发货单「${prev?.shipmentNo || id}」修改未保存，已还原`
      );
    },
    deleteShipment: async (id) => {
      const prev = get().shipments.find((x) => x.id === id);
      await commit(
        () => set((s) => ({ shipments: deleteArr(s.shipments, id) })),
        () => { if (prev) set((s) => ({ shipments: addArr(s.shipments, prev) })); },
        () => salesDomainApi.shipments.remove(id),
        `发货单「${prev?.shipmentNo || id}」删除未生效，已还原`
      );
    },

    // ==================== Project（C1 迁 D1）====================
    // 归一化：保证必填数组字段存在，避免脏数据导致详情页访问 undefined 崩溃
    addProject: async (project) => {
      const normalized: Project = {
        ...project,
        milestones: project.milestones || [],
        exceptions: project.exceptions || [],
        // team / linkedOrders 在类型上是必填数组，但导入行可能缺省 ——
        // 缺省会让后端 JSON 列写入 `[]`（而非 undefined 导致列被跳过）
        team: project.team || [],
        linkedOrders: project.linkedOrders || [],
      };
      await commit(
        () => set((s) => ({ projects: addArr(s.projects, normalized) })),
        () => set((s) => ({ projects: deleteArr(s.projects, project.id) })),
        () => salesDomainApi.projects.create(normalized),
        `项目「${project.projectName || project.id}」保存到服务器失败，已撤回`
      );
    },
    updateProject: async (id, u) => {
      const prev = get().projects.find((p) => p.id === id);
      await commit(
        () => set((s) => ({ projects: updateArr(s.projects, id, u) })),
        () => { if (prev) set((s) => ({ projects: s.projects.map((p) => (p.id === id ? prev : p)) })); },
        () => salesDomainApi.projects.update(id, u),
        `项目「${prev?.projectName || id}」修改未保存，已还原`
      );
    },
    deleteProject: async (id) => {
      const prev = get().projects.find((p) => p.id === id);
      await commit(
        () => set((s) => ({ projects: deleteArr(s.projects, id) })),
        () => { if (prev) set((s) => ({ projects: addArr(s.projects, prev) })); },
        () => salesDomainApi.projects.remove(id),
        `项目「${prev?.projectName || id}」删除未生效，已还原`
      );
    },

    // ==================== C1：从 D1 拉取全部已关系化切片 ====================
    load: async () => {
      const [prospects, shipments, projects] = await Promise.all([
        pullSlice<Prospect>(salesDomainApi.prospects, mockProspects, FLAG.prospects, 'prospects'),
        pullSlice<Shipment>(salesDomainApi.shipments, mockShipments, FLAG.shipments, 'shipments'),
        pullSlice<Project>(salesDomainApi.projects, mockProjects, FLAG.projects, 'projects'),
      ]);

      const patch: Partial<SalesState> = {};
      // pullSlice 返回 null = 拉取失败 → 保留内存种子，不覆盖（避免把有内容的表刷成空）
      if (prospects) patch.prospects = prospects;
      if (shipments) patch.shipments = shipments;
      if (projects) patch.projects = projects;

      const failed = [prospects, shipments, projects].filter((x) => x === null).length;
      set({
        ...patch,
        loaded: true,
        syncError:
          failed === 3
            ? '无法从服务器读取销售数据：网络或登录状态异常（当前显示的是本机示例数据）'
            : failed > 0
              ? `销售数据部分切片读取失败（${failed}/3），未成功的已保留本机数据`
              : '',
      });

      // 销售订单沿用既有 D1 通道
      await get().loadSalesOrders();
    },
  };
});
