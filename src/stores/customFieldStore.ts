import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeConfig } from './entityBackedShared';

/**
 * 自定义字段（P2-1 剩余）
 * ------------------------------------------------------------
 * 允许管理员为指定业务实体（物料/采购订单/采购申请）动态配置扩展字段，
 * 无需改代码即可在对应表单上渲染并随主数据一起持久化。
 * 字段定义存于唯一 store（ssa-erp-customfield），各表单通过 useCustomFields
 * 读取当前实体的字段定义，用 <CustomFieldsSection> 统一渲染与收集值。
 */

export type CustomFieldEntity = 'material' | 'purchaseOrder' | 'purchaseRequest' | 'category' | 'vendor';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

export interface CustomFieldDef {
  /** 字段唯一标识（同一实体内唯一） */
  key: string;
  /** 显示名称 */
  label: string;
  /** 字段类型 */
  type: CustomFieldType;
  /** select 类型的可选项 */
  options?: string[];
  /** 是否必填 */
  required?: boolean;
  /** 输入占位提示 */
  placeholder?: string;
}

export const CUSTOM_FIELD_ENTITY_LABELS: Record<CustomFieldEntity, string> = {
  material: '物料',
  purchaseOrder: '采购订单',
  purchaseRequest: '采购申请',
  category: '物料分类',
  vendor: '供应商',
};

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: '文本',
  number: '数字',
  date: '日期',
  select: '下拉选择',
  textarea: '多行文本',
  checkbox: '勾选框',
};

type EntityFields = Record<CustomFieldEntity, CustomFieldDef[]>;

export interface CustomFieldState {
  fields: EntityFields;
  addField: (entity: CustomFieldEntity, def: CustomFieldDef) => void;
  updateField: (entity: CustomFieldEntity, key: string, patch: Partial<CustomFieldDef>) => void;
  removeField: (entity: CustomFieldEntity, key: string) => void;
  moveField: (entity: CustomFieldEntity, key: string, dir: -1 | 1) => void;
  resetEntity: (entity: CustomFieldEntity) => void;
  resetAll: () => void;
}

const EMPTY: EntityFields = {
  material: [],
  purchaseOrder: [],
  purchaseRequest: [],
  category: [],
  vendor: [],
};

/** 工厂：生成唯一字段 key */
export const makeFieldKey = (label: string): string => {
  const slug = label
    .trim()
    .replace(/[^\w一-龥]/g, '')
    .slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 6);
  return `cf_${slug || 'field'}_${rand}`;
};

export const useCustomFieldStore = create<CustomFieldState>()(
    (set) => ({
      fields: { ...EMPTY },

      addField: (entity, def) =>
        set((state) => ({
          fields: {
            ...state.fields,
            [entity]: [...state.fields[entity], def],
          },
        })),

      updateField: (entity, key, patch) =>
        set((state) => ({
          fields: {
            ...state.fields,
            [entity]: state.fields[entity].map((f) =>
              f.key === key ? { ...f, ...patch } : f
            ),
          },
        })),

      removeField: (entity, key) =>
        set((state) => ({
          fields: {
            ...state.fields,
            [entity]: state.fields[entity].filter((f) => f.key !== key),
          },
        })),

      moveField: (entity, key, dir) =>
        set((state) => {
          const list = [...state.fields[entity]];
          const idx = list.findIndex((f) => f.key === key);
          if (idx < 0) return state;
          const next = idx + dir;
          if (next < 0 || next >= list.length) return state;
          [list[idx], list[next]] = [list[next], list[idx]];
          return { fields: { ...state.fields, [entity]: list } };
        }),

      resetEntity: (entity) =>
        set((state) => ({
          fields: { ...state.fields, [entity]: [] },
        })),

      resetAll: () => set({ fields: { ...EMPTY } }),
    }),
);

// ── V3.81.0 D1 同步层（组织共享配置，整块 EntityFields 单行，避免各终端配置漂移）──
const RES = 'customFields';
const CFG_ID = 'custom-field-defs';

function snapshotFields(s: CustomFieldState) {
  return { fields: s.fields };
}

let hydrating = false;
async function hydrateCustomFields() {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 50 });
    const rows = parsePayload<{ id?: string; fields?: EntityFields }>(res?.data || []);
    const cfg = rows.find((r) => r?.id === CFG_ID);
    if (cfg?.fields) {
      useCustomFieldStore.setState({ fields: cfg.fields });
    } else {
      // 首跑：把当前（含旧 blob 迁移来的）配置写回 D1
      writeConfig(RES, CFG_ID, { id: CFG_ID, ...snapshotFields(useCustomFieldStore.getState()) });
    }
  } catch {
    /* 离线/异常：保留本地态 */
  } finally {
    hydrating = false;
  }
}

// 任何字段定义变更 → 写穿 D1（hydrate 自身 set 不触发）
useCustomFieldStore.subscribe((s) => {
  if (hydrating) return;
  if (isAuthed()) writeConfig(RES, CFG_ID, { id: CFG_ID, ...snapshotFields(s) });
});

// 模块加载即自动水合（未登录/离线静默兜底）
void hydrateCustomFields();

/** 便捷 hook：读取某实体的字段定义 */
export const useCustomFields = (entity: CustomFieldEntity): CustomFieldDef[] =>
  useCustomFieldStore((s) => s.fields[entity] || []);
