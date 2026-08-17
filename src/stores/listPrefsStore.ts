// P4-3 全局列表参数体系：查询方案 / 列方案（用户级记忆，按 listKey 区分）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QueryScheme {
  id: string;
  name: string;
  filters: Record<string, unknown>;
}

export interface ColumnScheme {
  id: string;
  name: string;
  hidden: string[]; // 隐藏的列 id 列表（与 DataTable 存储格式一致）
}

interface ListPrefsState {
  querySchemes: Record<string, QueryScheme[]>;
  columnSchemes: Record<string, ColumnScheme[]>;
  /** 检索栏字段显隐偏好：每个 listKey 记录用户勾选显示的 filter field name 列表 */
  filterFieldPrefs: Record<string, string[]>;
  saveQueryScheme: (listKey: string, name: string, filters: Record<string, unknown>) => void;
  deleteQueryScheme: (listKey: string, id: string) => void;
  saveColumnScheme: (listKey: string, name: string, hidden: string[]) => void;
  deleteColumnScheme: (listKey: string, id: string) => void;
  /** 保存某列表的检索字段显隐偏好 */
  setFilterFieldPrefs: (listKey: string, names: string[]) => void;
  /** 重置某列表的检索字段显隐偏好（回到默认前 N 项） */
  resetFilterFieldPrefs: (listKey: string) => void;
}

export const useListPrefsStore = create<ListPrefsState>()(
  persist(
    (set) => ({
      querySchemes: {},
      columnSchemes: {},
      filterFieldPrefs: {},
      saveQueryScheme: (listKey, name, filters) =>
        set((s) => {
          const list = s.querySchemes[listKey] ?? [];
          const scheme: QueryScheme = { id: `qs-${Date.now()}`, name, filters };
          return { querySchemes: { ...s.querySchemes, [listKey]: [...list, scheme] } };
        }),
      deleteQueryScheme: (listKey, id) =>
        set((s) => ({
          querySchemes: {
            ...s.querySchemes,
            [listKey]: (s.querySchemes[listKey] ?? []).filter((q) => q.id !== id),
          },
        })),
      saveColumnScheme: (listKey, name, hidden) =>
        set((s) => {
          const list = s.columnSchemes[listKey] ?? [];
          const scheme: ColumnScheme = { id: `cs-${Date.now()}`, name, hidden };
          return { columnSchemes: { ...s.columnSchemes, [listKey]: [...list, scheme] } };
        }),
      deleteColumnScheme: (listKey, id) =>
        set((s) => ({
          columnSchemes: {
            ...s.columnSchemes,
            [listKey]: (s.columnSchemes[listKey] ?? []).filter((c) => c.id !== id),
          },
        })),
      setFilterFieldPrefs: (listKey, names) =>
        set((s) => ({
          filterFieldPrefs: { ...s.filterFieldPrefs, [listKey]: [...names] },
        })),
      resetFilterFieldPrefs: (listKey) =>
        set((s) => {
          const next = { ...s.filterFieldPrefs };
          delete next[listKey];
          return { filterFieldPrefs: next };
        }),
    }),
    { name: 'ssa-erp-listprefs' }
  )
);
