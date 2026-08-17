import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 自定义字段（P2-1 剩余）
 * ------------------------------------------------------------
 * 允许管理员为指定业务实体（物料/采购订单/采购申请）动态配置扩展字段，
 * 无需改代码即可在对应表单上渲染并随主数据一起持久化。
 * 字段定义存于唯一 store（ssa-erp-customfield），各表单通过 useCustomFields
 * 读取当前实体的字段定义，用 <CustomFieldsSection> 统一渲染与收集值。
 */

export type CustomFieldEntity = 'material' | 'purchaseOrder' | 'purchaseRequest';

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
  persist(
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
    {
      name: 'ssa-erp-customfield',
      version: 1,
      partialize: (state) => ({ fields: state.fields }),
    }
  )
);

/** 便捷 hook：读取某实体的字段定义 */
export const useCustomFields = (entity: CustomFieldEntity): CustomFieldDef[] =>
  useCustomFieldStore((s) => s.fields[entity] || []);
