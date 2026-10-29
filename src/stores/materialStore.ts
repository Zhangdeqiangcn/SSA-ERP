import { createEntityStore } from './createEntityStore';
import { UseBoundStore, StoreApi } from 'zustand';
import { Material, MaterialCategory, MaterialFilter, MaterialSubstitute } from '@/types';
import { materials as mockMaterials, materialCategories as mockCategories } from '@/mocks/data/material';
import { normalizeMaterialCost } from '@/utils/cost';
import { materialApi } from '@/services/material';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// V2.74.5：物料主数据改为直连 D1 materials（与开放网关 /api/open/materials 同源）。
// 移除原 backendStorage(app_state Blob) 持久化——app_state 不再是物料来源，消除双数据源。
// 在线时：loadMaterials 从 /api/materials 拉取，增删改经 materialApi 写回 materials。
// 离线/未登录/接口异常：回退内存中的 mockMaterials，保证页面可用（不阻塞业务）。
// 物料分类(categories)为固定 taxonomy，保留内存 mock，不经过 Blob/API。
// V3.90.0：materials 主数组的 CRUD 骨架（乐观更新+失败回滚+离线兜底+空库回填）统一收敛到
//   通用工厂 createEntityStore 的「可插拔后端」能力（backend=materialApi 适配层）；
//   替代料组(substitutes)为独立 D1 资源（原走 entityRepo，含 isAuthed 守卫与独立回填），
//   分类(categories)为固定 taxonomy，二者连同领域方法保留在 extend，调用方零改动。

const BACKFILL_FLAG = 'ssa-erp-material-backfilled';

// V2.84.0 C9：演示态替代料（首次空库回填一次，flag 防重复；非商业数据）。
const SUBSTITUTE_BACKFILL_FLAG = 'ssa-erp-substitute-backfilled';
// V3.94.0：物料分类首次空库回填一次（flag 防重复）；分类为共享主数据，非商业敏感。
const CATEGORY_BACKFILL_FLAG = 'ssa-erp-category-backfilled';
const mockMaterialSubstitutes: MaterialSubstitute[] = [
  { id: 'ms_demo_1', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', substituteCode: 'MAT202405010002', substituteName: '不锈钢板 304', priority: 1, substituteType: 'partial', conversionRatio: 1, reason: '缺料时替代', remarks: '演示数据' },
  { id: 'ms_demo_2', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', substituteCode: 'MAT202405010003', substituteName: '镀锌板', priority: 2, substituteType: 'full', conversionRatio: 1, reason: '成本优化', remarks: '演示数据' },
  { id: 'ms_demo_3', materialCode: 'MAT202405010002', materialName: '不锈钢板 304', substituteCode: 'MAT202405010001', substituteName: '钢板 Q235B', priority: 1, substituteType: 'partial', conversionRatio: 1, reason: '互替', remarks: '演示数据' },
];

/** 递归遍历分类树，按 id 查找分类（含子节点） */
export const findCategoryById = (
  cats: MaterialCategory[],
  id: string
): MaterialCategory | null => {
  for (const c of cats) {
    if (c.id === id) return c;
    if (c.children?.length) {
      const found = findCategoryById(c.children, id);
      if (found) return found;
    }
  }
  return null;
};

// ── V3.94.0 分类树 ↔ D1 扁平行 互转助手（通用实体路由按 parentId 存扁平行，UI 用嵌套树）──
/** 树 → 扁平行（剔除 children，parentId 显式关联） */
export function flattenCategories(
  nodes: MaterialCategory[],
  parentId: string | null = null,
): MaterialCategory[] {
  const out: MaterialCategory[] = [];
  for (const n of nodes) {
    out.push({ ...n, parentId: (n.parentId ?? parentId) as string | null, children: undefined });
    if (n.children?.length) out.push(...flattenCategories(n.children, n.id));
  }
  return out;
}

/** 扁平行 → 树（按 parentId 重建 children 嵌套） */
export function buildCategoryTree(flat: MaterialCategory[]): MaterialCategory[] {
  const map = new Map<string, MaterialCategory & { children: MaterialCategory[] }>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: MaterialCategory[] = [];
  flat.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** D1 行 → 前端类型：responsiblePersons / defaultVendors / attributes 可能是 JSON 字符串（TEXT 列），统一解析 */
function parseCategoryRow(row: any): MaterialCategory {
  let responsiblePersons = row.responsiblePersons;
  let defaultVendors = row.defaultVendors;
  let attributes = row.attributes;
  try { if (typeof responsiblePersons === 'string') responsiblePersons = JSON.parse(responsiblePersons); } catch { responsiblePersons = {}; }
  try { if (typeof defaultVendors === 'string') defaultVendors = JSON.parse(defaultVendors); } catch { defaultVendors = []; }
  try { if (typeof attributes === 'string') attributes = JSON.parse(attributes); } catch { attributes = {}; }
  return {
    ...row,
    responsiblePersons: responsiblePersons || {},
    defaultVendors: Array.isArray(defaultVendors) ? defaultVendors : (defaultVendors || []),
    attributes: attributes || {},
  };
}

// 从旧 app_state 持久化键（V2.74.4 及以前）取出物料，做一次性回填；不存在则退回 mockMaterials。
function readLegacyMaterials(): Material[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-material');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.materials && Array.isArray(st.materials) && st.materials.length) return st.materials as Material[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

// V2.85.0 C9 深化：库存不足时按优先级推荐可用替代料（可用量取 material.currentStock，与 MRP onHand 同源）
export type SubstituteCoverage = 'full' | 'partial' | 'none' | 'expired';
export interface SubstituteRecommendation {
  substituteCode: string;
  substituteName?: string;
  priority: number;
  substituteType: MaterialSubstitute['substituteType'];
  conversionRatio: number;
  availableStock: number;
  requiredForNeed: number;
  coverage: SubstituteCoverage;
  effective: boolean;
  reason?: string;
}

/** 生效期判定：from/to 为空视为永久有效；today 落在 [from, to] 内为有效 */
function isEffectivePeriod(from?: string, to?: string, today?: string): boolean {
  const t = today || new Date().toISOString().slice(0, 10);
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
}

/**
 * 纯函数：给定主物料与需求数量，按优先级返回各替代料的可用量与覆盖度。
 * 替代料可用量取物料主数据 currentStock（与 MRP onHand 同源，随出入库回写）。
 * 供 materialStore.getSubstituteRecommendations 与 SubstituteAdvisor 组件共用，避免逻辑重复。
 */
export function evaluateSubstitutes(
  substitutes: MaterialSubstitute[],
  materials: Material[],
  materialCode: string,
  neededQty = 0,
): SubstituteRecommendation[] {
  const subs = substitutes
    .filter((s) => s.materialCode === materialCode)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const today = new Date().toISOString().slice(0, 10);
  return subs.map((s) => {
    const mat = materials.find((m) => m.code === s.substituteCode);
    const availableStock = mat?.currentStock || 0;
    const requiredForNeed = (neededQty || 0) * (s.conversionRatio || 1);
    const effective = isEffectivePeriod(s.effectiveFrom, s.effectiveTo, today);
    const coverage: SubstituteCoverage =
      !effective ? 'expired'
        : availableStock >= requiredForNeed ? 'full'
          : availableStock > 0 ? 'partial'
            : 'none';
    return {
      substituteCode: s.substituteCode,
      substituteName: s.substituteName,
      priority: s.priority || 0,
      substituteType: s.substituteType,
      conversionRatio: s.conversionRatio || 1,
      availableStock,
      requiredForNeed,
      coverage,
      effective,
      reason: s.reason,
    };
  });
}

interface MaterialState {
  materials: Material[];
  categories: MaterialCategory[];
  selectedCategory: string | null;
  filter: MaterialFilter;
  substitutes: MaterialSubstitute[];
  setSelectedCategory: (categoryId: string | null) => void;
  setFilter: (filter: MaterialFilter) => void;
  resetFilter: () => void;
  addMaterial: (material: Material) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  resetMaterials: () => void;
  setCategories: (categories: MaterialCategory[]) => void;
  getCategoryById: (id: string) => MaterialCategory | null;
  /** 从 D1 material_categories 拉取（在线），构建树；首次空库回填 mock 演示态。离线/异常回退内存态。 */
  loadCategories: () => Promise<void>;
  /** 乐观新增 + 即发即弃写回 D1（失败回滚）。payload 含 parentId 决定层级。 */
  addCategory: (payload: Partial<MaterialCategory> & { parentId?: string | null }) => void;
  /** 乐观更新 + 即发即弃写回 D1（失败回滚到改前快照）。 */
  updateCategory: (id: string, patch: Partial<MaterialCategory>) => void;
  /** 乐观删除（含子孙级联）+ 即发即弃写回 D1（失败恢复整组）。 */
  removeCategory: (id: string) => void;
  /** 从 D1 materials 拉取（在线）。失败回退内存 mockMaterials。首次空库做一次 legacy 回填。 */
  loadMaterials: () => Promise<void>;
  /** 从 /api/entities/materialSubstitute 拉取（org 隔离）；首次空库回填 mock 演示态（flag 防重复）。离线/异常回退内存态。 */
  loadSubstitutes: () => Promise<void>;
  /** 乐观新增 + 即发即弃写回 D1（fire-and-forget，失败不阻断 UI） */
  addSubstitute: (data: Omit<MaterialSubstitute, 'id'>) => void;
  updateSubstitute: (id: string, updates: Partial<MaterialSubstitute>) => void;
  removeSubstitute: (id: string) => void;
  /** 取某主物料的全部替代料（按优先级升序），供 BOM/生产只读提示 */
  getSubstitutesFor: (materialCode: string) => MaterialSubstitute[];
  /** V2.85.0 C9 深化：给定物料与需求数量，按优先级返回各替代料的可用量/覆盖度/生效期，供领料与采购建议 */
  getSubstituteRecommendations: (materialCode: string, neededQty?: number) => SubstituteRecommendation[];
  /** 取首个可覆盖（full>partial）的替代料，无则返回 null */
  getBestSubstitute: (materialCode: string, neededQty?: number) => SubstituteRecommendation | null;
}

const initialFilter: MaterialFilter = {};

export const useMaterialStore = createEntityStore<Material>({
  resource: 'material',
  seed: mockMaterials.map(normalizeMaterialCost),
  stateKey: 'materials',
  backfillKey: BACKFILL_FLAG,
  // 可插拔后端：物料域专用接口
  backend: {
    list: () => materialApi.getMaterials({ page: 1, pageSize: 200 }).then((r) => (r?.data || []) as Material[]),
    create: (item) => materialApi.createMaterial(item as any),
    update: (id, patch) => materialApi.updateMaterial(id, patch as any),
    remove: (id) => materialApi.deleteMaterial(id),
    seed: (items) => {
      const legacy = readLegacyMaterials();
      const source = legacy.length ? legacy : items;
      return Promise.all(source.map((m) => materialApi.createMaterial(m as any).catch(() => {})));
    },
  },
  // 保留原 store 的中文告警行为
  onError: (op) => {
    const msg =
      op === 'add' ? '物料创建失败，已回滚本地数据'
        : op === 'update' ? '物料更新失败，已回滚本地数据'
          : '物料删除失败，已回滚本地数据';
    useGlobalToastStore.getState().showError(msg);
  },
  // 领域接口与领域方法：materials 主数组 CRUD 委托工厂内部 ops；
  // 替代料/分类/推荐计算等保留原逻辑，调用方零改动。
  extend: (ctx) => ({
    categories: [...mockCategories],
    substitutes: [...mockMaterialSubstitutes],
    selectedCategory: null,
    filter: initialFilter,

    setSelectedCategory: (categoryId: any) => ctx.set({ selectedCategory: categoryId }),
    setFilter: (filter: any) => ctx.set({ filter }),
    resetFilter: () => ctx.set({ filter: initialFilter, selectedCategory: null }),

    loadMaterials: async () => {
      // 拉取物料主数据（工厂 load）
      await ctx.get().load();
      // 并行拉取替代料组（org 隔离，独立容错）—— 原 loadMaterials 的内部调用
      await ctx.get().loadSubstitutes();
    },

    // V2.84.0 C9 物料替代料组 + 优先级（根治 Blob 双通道：经通用实体路由 /api/entities/materialSubstitute）
    loadSubstitutes: async () => {
      if (!isAuthed()) return;
      try {
        const res = await entityRepo.list<MaterialSubstitute>('materialSubstitute', { page: 1, pageSize: 200 });
        const list = (res?.data || []) as MaterialSubstitute[];
        if (list.length === 0 && !localStorage.getItem(SUBSTITUTE_BACKFILL_FLAG)) {
          localStorage.setItem(SUBSTITUTE_BACKFILL_FLAG, '1');
          for (const s of mockMaterialSubstitutes) {
            try {
              await entityRepo.create('materialSubstitute', s as Partial<MaterialSubstitute>);
            } catch {
              /* 回填尽力而为 */
            }
          }
          const refreshed = await entityRepo.list<MaterialSubstitute>('materialSubstitute', { page: 1, pageSize: 200 });
          const r2 = (refreshed?.data || []) as MaterialSubstitute[];
          ctx.set({ substitutes: r2.length ? r2 : [...mockMaterialSubstitutes] });
          return;
        }
        ctx.set({ substitutes: list.length ? list : [...mockMaterialSubstitutes] });
      } catch {
        /* 离线/未登录/接口异常：保持内存 mock 演示态，不阻断 UI */
      }
    },

    addSubstitute: (data: any) => {
      const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'ms_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const row: MaterialSubstitute = { ...(data as MaterialSubstitute), id };
      ctx.set((state: any) => ({ substitutes: [...state.substitutes, row] }));
      if (isAuthed()) {
        entityRepo.create('materialSubstitute', {
          materialCode: row.materialCode, materialName: row.materialName, substituteCode: row.substituteCode,
          substituteName: row.substituteName, priority: row.priority, substituteType: row.substituteType,
          conversionRatio: row.conversionRatio, effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo,
          reason: row.reason, remarks: row.remarks,
        } as Partial<MaterialSubstitute>).catch(() => {
          // 写失败：回滚乐观插入，避免界面出现服务器没有的幽灵记录（#38 静默失败消除）
          ctx.set((state: any) => ({ substitutes: state.substitutes.filter((s: MaterialSubstitute) => s.id !== id) }));
          useGlobalToastStore.getState().showError('替代料新增失败，已回滚本地数据');
        });
      }
    },

    updateSubstitute: (id: any, updates: any) => {
      const before = ctx.get().substitutes.find((s: any) => s.id === id);
      ctx.set((state: any) => ({
        substitutes: state.substitutes.map((s: MaterialSubstitute) => (s.id === id ? { ...s, ...updates } : s)),
      }));
      if (isAuthed()) {
        entityRepo.update('materialSubstitute', id, {
          materialCode: updates.materialCode, materialName: updates.materialName, substituteCode: updates.substituteCode,
          substituteName: updates.substituteName, priority: updates.priority, substituteType: updates.substituteType,
          conversionRatio: updates.conversionRatio, effectiveFrom: updates.effectiveFrom, effectiveTo: updates.effectiveTo,
          reason: updates.reason, remarks: updates.remarks,
        } as Partial<MaterialSubstitute>).catch(() => {
          // 写失败：回滚到改前快照（#38 静默失败消除）
          if (before) ctx.set((state: any) => ({ substitutes: state.substitutes.map((s: MaterialSubstitute) => (s.id === id ? before : s)) }));
          useGlobalToastStore.getState().showError('替代料更新失败，已回滚本地数据');
        });
      }
    },

    removeSubstitute: (id: any) => {
      const before = ctx.get().substitutes;
      ctx.set((state: any) => ({ substitutes: state.substitutes.filter((s: MaterialSubstitute) => s.id !== id) }));
      if (isAuthed()) entityRepo.remove('materialSubstitute', id).catch(() => {
        // 写失败：恢复被删记录（#38 静默失败消除）
        ctx.set({ substitutes: before });
        useGlobalToastStore.getState().showError('替代料删除失败，已回滚本地数据');
      });
    },

    getSubstitutesFor: (materialCode: any) =>
      ctx.get().substitutes
        .filter((s: MaterialSubstitute) => s.materialCode === materialCode)
        .sort((a: MaterialSubstitute, b: MaterialSubstitute) => (a.priority || 0) - (b.priority || 0)),

    // V2.85.0 C9 深化：库存不足时按优先级推荐可用替代料（复用 evaluateSubstitutes 纯函数）
    getSubstituteRecommendations: (materialCode: any, neededQty = 0) =>
      evaluateSubstitutes(ctx.get().substitutes, ctx.get().materials, materialCode, neededQty),

    getBestSubstitute: (materialCode: any, neededQty = 0) => {
      const recs = evaluateSubstitutes(ctx.get().substitutes, ctx.get().materials, materialCode, neededQty);
      return recs.find((r) => r.coverage === 'full') || recs.find((r) => r.coverage === 'partial') || null;
    },

    addMaterial: (material: any) => ctx.primary.add(material),
    updateMaterial: (id: any, patch: any) => ctx.primary.update(id, patch),
    deleteMaterial: (id: any) => ctx.primary.remove(id),

    // 恢复到初始 Mock 数据（调试用），仅内存态（不再持久化）
    resetMaterials: () => ctx.set({ materials: mockMaterials.map(normalizeMaterialCost) }),

    setCategories: (categories: any) => ctx.set({ categories }),

    getCategoryById: (id: any) => findCategoryById(ctx.get().categories, id),

    // V3.94.0 分类落库：从 D1 material_categories 拉取并构建树（含 JSON 列解析）。
    // 首次空库回填 mock 演示态（flag 防重复）；离线/未登录/异常回退内存态，不阻断 UI。
    loadCategories: async () => {
      if (!isAuthed()) return;
      try {
        const res = await entityRepo.list<MaterialCategory>('materialCategory', { page: 1, pageSize: 500 });
        const list = (res?.data || []).map(parseCategoryRow);
        if (list.length === 0 && !localStorage.getItem(CATEGORY_BACKFILL_FLAG)) {
          localStorage.setItem(CATEGORY_BACKFILL_FLAG, '1');
          const flat = flattenCategories(mockCategories);
          for (const c of flat) {
            const { children, ...row } = c;
            try {
              await entityRepo.create('materialCategory', {
                id: row.id, parentId: row.parentId ?? null, code: row.code, name: row.name,
                sequenceLength: row.sequenceLength, responsiblePersons: row.responsiblePersons || {},
                defaultVendors: row.defaultVendors || [], attributes: row.attributes || {}, sortOrder: row.sortOrder, level: row.level,
                description: row.description,
              } as Partial<MaterialCategory>);
            } catch {
              /* 回填尽力而为 */
            }
          }
          const refreshed = await entityRepo.list<MaterialCategory>('materialCategory', { page: 1, pageSize: 500 });
          const r2 = (refreshed?.data || []).map(parseCategoryRow);
          ctx.set({ categories: buildCategoryTree(r2.length ? r2 : flat.map(parseCategoryRow)) });
          return;
        }
        ctx.set({ categories: buildCategoryTree(list.length ? list : mockCategories) });
      } catch {
        /* 离线/未登录/接口异常：保持内存 mock 演示态 */
      }
    },

    // 乐观新增分类 + 即发即弃写回 D1（失败回滚本地插入）
    addCategory: (payload: Partial<MaterialCategory> & { parentId?: string | null }) => {
      const id = payload.id || `cat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const parent = payload.parentId ? findCategoryById(ctx.get().categories, payload.parentId) : null;
      const level = parent ? ((parent.level || 1) + 1) : 1;
      const node: MaterialCategory = {
        id,
        parentId: payload.parentId || null,
        code: payload.code || '',
        name: payload.name || '',
        sequenceLength: payload.sequenceLength,
        responsiblePersons: payload.responsiblePersons || {},
        defaultVendors: payload.defaultVendors || [],
        attributes: payload.attributes || {},
        description: payload.description,
        sortOrder: payload.sortOrder ?? 0,
        level,
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      ctx.set((state: any) => {
        if (node.parentId) {
          const addToParent = (nodes: MaterialCategory[]): MaterialCategory[] =>
            nodes.map((n) =>
              n.id === node.parentId
                ? { ...n, children: [...(n.children || []), node] }
                : n.children ? { ...n, children: addToParent(n.children) } : n,
            );
          return { categories: addToParent(state.categories) };
        }
        return { categories: [...state.categories, node] };
      });
      if (isAuthed()) {
        entityRepo.create('materialCategory', {
          id, parentId: node.parentId, code: node.code, name: node.name,
          sequenceLength: node.sequenceLength, responsiblePersons: node.responsiblePersons,
          defaultVendors: node.defaultVendors,
          attributes: node.attributes, sortOrder: node.sortOrder, level: node.level,
          description: node.description,
        } as Partial<MaterialCategory>).catch(() => {
          ctx.set((state: any) => ({ categories: state.categories.filter((c: MaterialCategory) => c.id !== id) }));
          useGlobalToastStore.getState().showError('分类新增失败，已回滚本地数据');
        });
      }
    },

    // 乐观更新分类 + 即发即弃写回 D1（失败回滚到改前快照）
    updateCategory: (id: any, patch: Partial<MaterialCategory>) => {
      const before = findCategoryById(ctx.get().categories, id);
      ctx.set((state: any) => {
        const upd = (nodes: MaterialCategory[]): MaterialCategory[] =>
          nodes.map((n) => {
            if (n.id === id) return { ...n, ...patch, updatedAt: new Date().toISOString() };
            if (n.children) return { ...n, children: upd(n.children) };
            return n;
          });
        return { categories: upd(state.categories) };
      });
      if (isAuthed()) {
        entityRepo.update('materialCategory', id, {
          parentId: patch.parentId, code: patch.code, name: patch.name,
          sequenceLength: patch.sequenceLength, responsiblePersons: patch.responsiblePersons,
          defaultVendors: patch.defaultVendors,
          attributes: patch.attributes, sortOrder: patch.sortOrder, level: patch.level,
          description: patch.description,
        } as Partial<MaterialCategory>).catch(() => {
          if (before) ctx.set((state: any) => {
            const rb = (nodes: MaterialCategory[]): MaterialCategory[] =>
              nodes.map((n) => n.id === id ? before : n.children ? { ...n, children: rb(n.children) } : n);
            return { categories: rb(state.categories) };
          });
          useGlobalToastStore.getState().showError('分类更新失败，已回滚本地数据');
        });
      }
    },

    // 乐观删除分类（含子孙级联）+ 即发即弃写回 D1（失败恢复整组）
    removeCategory: (id: any) => {
      const collectIds = (nodes: MaterialCategory[], acc: string[]): string[] => {
        for (const n of nodes) {
          if (n.id === id) {
            acc.push(n.id);
            if (n.children) n.children.forEach((c) => collectIds([c], acc));
          } else if (n.children) collectIds(n.children, acc);
        }
        return acc;
      };
      const removeNode = (nodes: MaterialCategory[]): MaterialCategory[] =>
        nodes
          .filter((n) => n.id !== id)
          .map((n) => n.children ? { ...n, children: removeNode(n.children) } : n);
      const before = ctx.get().categories;
      const ids = collectIds(before, []);
      ctx.set({ categories: removeNode(before) });
      if (isAuthed()) {
        Promise.all(ids.map((rid) => entityRepo.remove('materialCategory', rid)))
          .catch(() => {
            ctx.set({ categories: before });
            useGlobalToastStore.getState().showError('分类删除失败，已回滚本地数据');
          });
      }
    },
  }),
}) as unknown as UseBoundStore<StoreApi<MaterialState>>;
