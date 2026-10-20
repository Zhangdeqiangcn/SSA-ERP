// 列表检索统一工具（V3.85.0 标准化整改）
// ─────────────────────────────────────────────────────────────────────────────
// 目标：让「所有列表的检索都能覆盖每一列、默认显 5 项、其余可展开、并按字段权限门控」
//       一次组件级改造覆盖全站，避免每页手写 filterFields + 过滤逻辑导致口径不一。
//
// 用法（列表页两步即可）：
//   1) 在列定义上声明 meta.searchable（可选 filterType / filterOptions / filterModule / filterField）
//   2) 把 columns 传给 <FilterBar columns={columns} module="vendor" />，
//      并用 applyColumnFilters(data, columns, filterData, { module }) 替代原 filteredData。
// 编号列（业务单号/编码）默认作为首列，并配 DataTable 的 codeColumnId 做详情链接。

import type { ColumnDef } from '@tanstack/react-table';
import type { FilterField } from '@/components/common/FilterBar';
import { useSessionStore } from '@/stores/sessionStore';
import { useDataPermissionStore } from '@/stores/dataPermissionStore';

// ── TanStack 列元信息扩展：声明「可被列表检索」相关标记 ──
// 任意列表页的列定义写上 meta: { searchable: true } 即可被筛选条自动纳为检索项。
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** 是否在列表检索条中作为可搜字段（默认 false → 不出现） */
    searchable?: boolean;
    /** 检索控件：text=模糊包含；select=精确等于（需配 filterOptions） */
    filterType?: 'text' | 'select';
    /** select 类型的候选项 */
    filterOptions?: { value: string | number; label: string }[];
    /** 字段权限模块（与 filterField 配合按用户权限门控该检索项是否出现），如 'vendor' */
    filterModule?: string;
    /** 字段权限字段名（缺省取 accessorKey） */
    filterField?: string;
  }
}

/** 取当前登录用户角色（非响应式，供过滤/派生时一次性读取） */
function currentRole(): string {
  return useSessionStore.getState().current?.role ?? '';
}

/**
 * 从表格列定义派生列表检索字段。
 * - 仅处理带字符串 accessorKey 的列（可直接映射到数据字段）。
 * - 列需声明 meta.searchable 才进入检索项。
 * - 若列声明了 filterModule，则按字段权限（isFieldVisible）门控：当前角色不可见的字段不出现，
 *   实现「必须都可以按用户权限查询对应内容」。
 */
export function deriveFilterFields<T>(
  columns: ColumnDef<T, unknown>[],
  opts?: { module?: string }
): FilterField[] {
  const role = currentRole();
  const fields: FilterField[] = [];
  for (const col of columns) {
    const meta = (col as { meta?: ColumnMetaLike }).meta;
    if (!meta?.searchable) continue;
    // 优先取 accessorKey；部分列表页用 id + accessorFn 写法，回退到 col.id 作为数据字段
    const accessorKey =
      (col as { accessorKey?: string }).accessorKey ?? (col as { id?: string }).id;
    if (!accessorKey) continue; // 仅 id、无直接数据字段的展示列不参与检索
    const moduleKey = meta.filterModule ?? opts?.module;
    const fieldName = meta.filterField ?? accessorKey;
    if (moduleKey && role) {
      const visible = useDataPermissionStore
        .getState()
        .isFieldVisible(role, moduleKey, fieldName);
      if (!visible) continue;
    }
    const header =
      typeof (col as { header?: unknown }).header === 'string'
        ? ((col as { header: string }).header as string)
        : accessorKey;
    fields.push({
      name: accessorKey,
      label: header,
      type: meta.filterType ?? 'text',
      ...(meta.filterOptions ? { options: meta.filterOptions } : {}),
    });
  }
  return fields;
}

/**
 * 通用列检索：对声明了 meta.searchable 的列做 text(模糊包含) / select(精确等于) 过滤。
 * 权限门控同 deriveFilterFields：当前角色不可见的字段不参与过滤。
 * 返回过滤后的数据；与原列表页的 filteredData 语义一致，可整体替换手写过滤逻辑。
 */
export function applyColumnFilters<T>(
  data: T[],
  columns: ColumnDef<T, unknown>[],
  values: Record<string, unknown>,
  opts?: { module?: string }
): T[] {
  const role = currentRole();
  let result = data;
  for (const col of columns) {
    const meta = (col as { meta?: ColumnMetaLike }).meta;
    if (!meta?.searchable) continue;
    // 优先取 accessorKey；部分列表页用 id + accessorFn 写法，回退到 col.id 作为数据字段
    const accessorKey =
      (col as { accessorKey?: string }).accessorKey ?? (col as { id?: string }).id;
    if (!accessorKey) continue;
    const moduleKey = meta.filterModule ?? opts?.module;
    const fieldName = meta.filterField ?? accessorKey;
    if (moduleKey && role) {
      if (
        !useDataPermissionStore.getState().isFieldVisible(role, moduleKey, fieldName)
      )
        continue;
    }
    const v = values[accessorKey];
    if (v == null || v === '') continue;
    const sv = String(v).trim().toLowerCase();
    result = result.filter((row) => {
      const cellVal = (row as Record<string, unknown>)[accessorKey];
      if (cellVal == null) return false;
      if (meta.filterType === 'select') return String(cellVal) === String(v);
      return String(cellVal).toLowerCase().includes(sv);
    });
  }
  return result;
}

/** 列元信息内部结构（与上面的 declare module 对齐，仅运行期读取用） */
interface ColumnMetaLike {
  searchable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { value: string | number; label: string }[];
  filterModule?: string;
  filterField?: string;
}
