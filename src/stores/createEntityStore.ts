import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';

/**
 * 通用实体仓储工厂（V3 可插拔后端版）
 * ------------------------------------------------------------
 * 以云端数据库（统一数据访问服务 entityRepo）为唯一主源，乐观更新 + 失败回滚
 * + 离线/模拟兜底 + 空库一次性回填（浏览器本地标记防重）。
 *
 * V3 新增「可插拔后端 backend」：核心域（客户/供应商/物料等）走各自专用接口
 * （customerApi/vendorApi/materialApi...），不再强制绑定 entityRepo。
 * 工厂只负责 CRUD 骨架（乐观更新/回滚/回填/离线兜底），后端差异由 backend 适配层隔离。
 * 保留 V2 全部能力（stateKey / parse·serialize / extraResources / extend / backfillKey）
 * 与向后兼容（sopStore 等无 backend 的仓库仍走 entityRepo）。
 */

/** 可插拔后端：核心域专用接口的适配层（工厂负责 CRUD 骨架，后端差异在此隔离） */
export interface EntityBackend<T> {
  /** 拉取列表：返回数组，或 { data: T[] } 包装 */
  list?: () => Promise<T[] | { data?: T[] }>;
  /** 创建：返回含 id 的对象（工厂仅取 .id 回写）；失败抛错触发回滚 */
  create?: (item: T) => Promise<any>;
  /** 更新：传 id 与增量 */
  update?: (id: string, patch: Partial<T>) => Promise<any>;
  /** 删除 */
  remove?: (id: string) => Promise<any>;
  /** 首次空库回填：把种子逐条写入后端（失败尽力而为） */
  seed?: (items: T[]) => Promise<any>;
}

export interface EntityStoreConfig<T> {
  /** 后端资源名（对应 ENTITY_RESOURCES 注册键，也是云端数据库表逻辑名） */
  resource: string;
  /** 离线/未登录时的模拟兜底数据，以及首次空库回填源 */
  seed: T[];
  /** 主键字段名，默认 'id' */
  idKey?: keyof T;
  /** 首次空库时把 seed 回填到云端数据库（避免存量数据丢失），默认开启 */
  backfill?: boolean;
  /** 主数组在 store 中的字段名，默认 'items'。为兼容既有领域接口（如 list/accounts）可改名 */
  stateKey?: string;
  /** 行 → 领域对象（读取时）；用于嵌套 JSON 等反序列化 */
  parse?: (row: any) => T;
  /** 领域对象 → 行（写入时）；用于嵌套 JSON 等序列化 */
  serialize?: (item: T) => any;
  /** 回填防重标记键；默认 ssa-erp-backfilled-${resource}。迁移既有仓库时传入原 flag 避免重复回填 */
  backfillKey?: string;
  /** V3：可插拔后端（核心域专用接口）。提供则主资源 CRUD 走 backend，否则走 entityRepo */
  backend?: EntityBackend<T>;
  /** 失败回调：ops 回滚后调用，用于保留原 store 的中文告警等行为 */
  onError?: (op: 'add' | 'update' | 'remove', error: any) => void;
  /** 额外资源（多资源仓库）：每个独立读写、独立回填、独立状态数组 */
  extraResources?: ExtraResource[];
  /** 自定义方法 / 跨资源逻辑：接收工厂内部 API，返回领域方法合并进 store（保留既有调用方接口） */
  extend?: (ctx: FactoryCtx<T>) => Record<string, any>;
}

export interface ExtraResource {
  resource: string;
  seed: any[];
  /** 该资源在 store 中的状态数组字段名（如 'flows' / 'rfidEvents'） */
  stateKey: string;
  idKey?: string;
  parse?: (row: any) => any;
  serialize?: (item: any) => any;
  backfill?: boolean;
  pageSize?: number;
  /** V3：该资源可独立指定后端（默认走 entityRepo） */
  backend?: EntityBackend<any>;
}

/** 单个资源的增 / 改 / 删操作（乐观更新 + 失败回滚，由工厂统一提供） */
export interface ResourceOps<T> {
  add: (item: T) => Promise<void>;
  update: (id: string, u: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** extend 钩子收到的工厂内部 API */
export interface FactoryCtx<T> {
  set: (partial: any) => void;
  get: () => any;
  repo: typeof entityRepo;
  /** 主资源操作 */
  primary: ResourceOps<T>;
  /** 额外资源操作，按 stateKey 索引 */
  extras: Record<string, ResourceOps<any>>;
}

export interface EntityState<T> {
  items: T[];
  loaded: boolean;
  /** 从云端数据库拉取（失败回退模拟）；空库且开启回填时一次性写入 seed */
  load: () => Promise<void>;
  add: (item: T) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const identity = (x: any): any => x;

export function createEntityStore<T extends { id: string }>(
  cfg: EntityStoreConfig<T>
) {
  const idKey = (cfg.idKey as string) || 'id';
  const backfill = cfg.backfill !== false;
  const stateKey = cfg.stateKey || 'items';
  const parse = cfg.parse || identity;
  const serialize = cfg.serialize || identity;
  const flagKey = cfg.backfillKey || `ssa-erp-backfilled-${cfg.resource}`;
  const extras = cfg.extraResources || [];

  return create<EntityState<T> & Record<string, any>>()((set, get) => {
    // 构造单资源 ops：乐观更新 + 失败回滚，供主资源与额外资源复用。
    // 优先 backend（核心域专用接口），否则 entityRepo（统一数据访问服务）。
    const makeOps = (
      resource: string,
      sKey: string,
      sIdKey: string,
      sSerialize: (i: any) => any,
      backend?: EntityBackend<any>,
      onErr?: (op: 'add' | 'update' | 'remove', e: any) => void
    ): ResourceOps<any> => ({
      add: async (item: any) => {
        // 乐观插入
        set((s: any) => ({ [sKey]: [item, ...s[sKey]] }));
        try {
          if (backend?.create) {
            const created: any = await backend.create(sSerialize(item));
            // 后端返回 {id}：仅回写主键（item 已是完整领域对象，避免整体替换丢字段）
            const newId = created && typeof created === 'object' ? created.id : undefined;
            if (newId && newId !== item[sIdKey]) {
              set((s: any) => ({
                [sKey]: s[sKey].map((x: any) =>
                  x[sIdKey] === item[sIdKey] ? { ...x, [sIdKey]: newId } : x
                ),
              }));
            }
          } else {
            // entityRepo 路径保持 V2 行为：整体替换（含服务端规范化字段）
            const created: any = await entityRepo.create(resource, sSerialize(item));
            set((s: any) => ({
              [sKey]: s[sKey].map((x: any) => (x[sIdKey] === item[sIdKey] ? created : x)),
            }));
          }
        } catch (e) {
          // 写失败：回滚乐观插入，避免幽灵记录
          set((s: any) => ({ [sKey]: s[sKey].filter((x: any) => x[sIdKey] !== item[sIdKey]) }));
          onErr?.('add', e);
        }
      },
      update: async (id: string, u: Partial<any>) => {
        const prev = (get() as any)[sKey]?.find((x: any) => x[sIdKey] === id);
        // 乐观更新
        set((s: any) => ({ [sKey]: s[sKey].map((x: any) => (x[sIdKey] === id ? { ...x, ...u } : x)) }));
        try {
          if (backend?.update) await backend.update(id, sSerialize(u));
          else await entityRepo.update(resource, id, sSerialize(u));
        } catch (e) {
          // 写失败：回滚到改前快照
          if (prev) set((s: any) => ({ [sKey]: s[sKey].map((x: any) => (x[sIdKey] === id ? prev : x)) }));
          onErr?.('update', e);
        }
      },
      remove: async (id: string) => {
        const prev = [...((get() as any)[sKey] || [])];
        // 乐观删除
        set((s: any) => ({ [sKey]: s[sKey].filter((x: any) => x[sIdKey] !== id) }));
        try {
          if (backend?.remove) await backend.remove(id);
          else await entityRepo.remove(resource, id);
        } catch (e) {
          // 写失败：恢复被删记录
          set((s: any) => ({ [sKey]: prev }));
          onErr?.('remove', e);
        }
      },
    });

    const primaryOps = makeOps(cfg.resource, stateKey, idKey, serialize, cfg.backend, cfg.onError);
    const extraOps: Record<string, ResourceOps<any>> = {};
    for (const e of extras) {
      extraOps[e.stateKey] = makeOps(
        e.resource, e.stateKey, e.idKey || 'id',
        e.serialize || identity, e.backend, cfg.onError
      );
    }

    // 重新拉取并以服务端为准（回填后调用一次）
    const refetch = async (): Promise<any> => {
      let primaryList: any[] = [];
      if (cfg.backend?.list) {
        const r: any = await cfg.backend.list();
        primaryList = Array.isArray(r) ? r : (r?.data || []);
      } else {
        const r = await entityRepo.list<T>(cfg.resource, { page: 1, pageSize: 200 });
        primaryList = (r?.data || []) as any[];
      }
      const exRaw = await Promise.all(
        extras.map(async (e) => {
          if (e.backend?.list) {
            const r: any = await e.backend.list();
            return Array.isArray(r) ? r : (r?.data || []);
          }
          const r = await entityRepo.list(e.resource, { page: 1, pageSize: e.pageSize || 200 });
          return (r?.data || []) as any[];
        })
      );
      const patch: any = { [stateKey]: primaryList.map(parse), loaded: true };
      extras.forEach((e, i) => { patch[e.stateKey] = (exRaw[i] || []).map(e.parse || identity); });
      return patch;
    };

    const base: any = {
      [stateKey]: [...cfg.seed],
      loaded: false,
      // 额外资源初始态同样给种子：load() 是异步的，深链/刷新直达页面时首屏渲染就会读
      // 这些数组（如 WaveRfidList 的 rfidEvents.length），漏初始化会直接白屏崩溃。
      ...Object.fromEntries(extras.map((e) => [e.stateKey, [...e.seed]])),

      load: async () => {
        try {
          // 主资源列表
          let primaryList: any[] = [];
          if (cfg.backend?.list) {
            const r: any = await cfg.backend.list();
            primaryList = Array.isArray(r) ? r : (r?.data || []);
          } else {
            const r = await entityRepo.list<T>(cfg.resource, { page: 1, pageSize: 200 });
            primaryList = (r?.data || []) as any[];
          }
          // 额外资源列表
          const exRaw = await Promise.all(
            extras.map(async (e) => {
              if (e.backend?.list) {
                const r: any = await e.backend.list();
                return Array.isArray(r) ? r : (r?.data || []);
              }
              const r = await entityRepo.list(e.resource, { page: 1, pageSize: e.pageSize || 200 });
              return (r?.data || []) as any[];
            })
          );
          const exLists = exRaw.map((l) => l as any[]);
          const allEmpty = primaryList.length === 0 && exLists.every((l) => l.length === 0);

          // 空库 + 开启回填 + 未回填过：先把种子写入云端（尽力而为），再读回
          if (allEmpty && backfill && !localStorage.getItem(flagKey)) {
            localStorage.setItem(flagKey, '1');
            if (cfg.backend?.seed) {
              await cfg.backend.seed([...cfg.seed]);
            } else {
              for (const s of cfg.seed) {
                try { await entityRepo.create(cfg.resource, serialize(s as any)); } catch { /* 编码冲突等忽略 */ }
              }
            }
            for (const e of extras) {
              if (e.backend?.seed) {
                await e.backend.seed([...e.seed]);
              } else {
                for (const s of e.seed) {
                  try { await entityRepo.create(e.resource, e.serialize ? e.serialize(s) : s); } catch { /* 忽略 */ }
                }
              }
            }
            // 回填后重新拉取，保证内存与云端一致
            set(await refetch());
            return;
          }

          // 正常路径：有数据用云端数据，无数据回退模拟（不阻断 UI）
          const patch: any = {
            [stateKey]: primaryList.length ? primaryList.map(parse) : [...cfg.seed],
            loaded: true,
          };
          extras.forEach((e, i) => {
            const l = exLists[i].map(e.parse || identity);
            patch[e.stateKey] = l.length ? l : [...e.seed];
          });
          set(patch);
        } catch {
          // 离线/未登录/接口异常：保持模拟数据，不阻断 UI
          const patch: any = { [stateKey]: [...cfg.seed], loaded: true };
          extras.forEach((e) => { patch[e.stateKey] = [...e.seed]; });
          set(patch);
        }
      },

      ...primaryOps,
    };

    // 合并领域自定义方法（保持既有调用方接口）
    if (cfg.extend) {
      const ctx: FactoryCtx<T> = {
        set: (p: any) => set(p),
        get: () => get(),
        repo: entityRepo,
        primary: primaryOps,
        extras: extraOps,
      };
      Object.assign(base, cfg.extend(ctx));
    }

    return base;
  });
}
