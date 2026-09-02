import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';

export interface EntityStoreConfig<T> {
  /** 后端资源名（对应 ENTITY_RESOURCES 注册键，也是 D1 表逻辑名） */
  resource: string;
  /** 离线/未登录时的 Mock 兜底数据，以及首次空库回填源 */
  seed: T[];
  /** 主键字段名，默认 'id' */
  idKey?: keyof T;
  /** 首次空库时把 seed 回填到 D1（避免存量数据丢失），默认开启 */
  backfill?: boolean;
}

export interface EntityState<T> {
  items: T[];
  loaded: boolean;
  /** 从 D1 拉取（失败回退 Mock）；空库且开启回填时一次性写入 seed */
  load: () => Promise<void>;
  add: (item: T) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

// 通用实体 Store 工厂（根治双通道核心）：
// 数据主源 = D1（经 entityRepo），乐观更新 + 失败回滚 + 离线/Mock 兜底。
// 每业务域只需 createEntityStore({ resource, seed })，无需手写 persist(Blob) 或专用 Functions。
export function createEntityStore<T extends { id: string }>(cfg: EntityStoreConfig<T>) {
  const idKey = (cfg.idKey as string) || 'id';
  const backfill = cfg.backfill !== false;
  const flagKey = `ssa-erp-backfilled-${cfg.resource}`;

  return create<EntityState<T>>()((set, get) => ({
    items: [...cfg.seed],
    loaded: false,

    load: async () => {
      try {
        const res = await entityRepo.list<T>(cfg.resource, { page: 1, pageSize: 200 });
        const list = (res?.data || []) as T[];
        if (list.length === 0 && backfill && !localStorage.getItem(flagKey)) {
          localStorage.setItem(flagKey, '1');
          for (const item of cfg.seed) {
            try {
              await entityRepo.create<T>(cfg.resource, item);
            } catch {
              /* 编码冲突等忽略，回填尽力而为 */
            }
          }
          const refreshed = await entityRepo.list<T>(cfg.resource, { page: 1, pageSize: 200 });
          set({ items: (refreshed?.data || []) as T[], loaded: true });
          return;
        }
        set({ items: list.length ? list : [...cfg.seed], loaded: true });
      } catch {
        set({ items: [...cfg.seed], loaded: true }); // 离线/未登录/接口异常：保持 Mock，不阻断 UI
      }
    },

    add: async (item) => {
      set((s) => ({ items: [...s.items, item] }));
      try {
        const created = await entityRepo.create<T>(cfg.resource, item);
        set((s) => ({ items: s.items.map((x) => (x[idKey] === item[idKey] ? (created as T) : x)) }));
      } catch {
        set((s) => ({ items: s.items.filter((x) => x[idKey] !== item[idKey]) }));
      }
    },

    update: async (id, updates) => {
      const prev = get().items.find((x) => x[idKey] === id);
      set((s) => ({ items: s.items.map((x) => (x[idKey] === id ? { ...x, ...updates } : x)) }));
      try {
        await entityRepo.update<T>(cfg.resource, id, updates);
      } catch {
        if (prev) set((s) => ({ items: s.items.map((x) => (x[idKey] === id ? prev : x)) }));
      }
    },

    remove: async (id) => {
      const prev = [...get().items];
      set((s) => ({ items: s.items.filter((x) => x[idKey] !== id) }));
      try {
        await entityRepo.remove(cfg.resource, id);
      } catch {
        set({ items: prev });
      }
    },
  }));
}
