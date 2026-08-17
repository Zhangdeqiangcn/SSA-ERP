import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FieldPermission, FieldMode, PlatformModule } from '@/types';

type ModuleFields = Record<PlatformModule, FieldPermission[]>;

interface FieldPermissionState {
  moduleFields: ModuleFields;
  setFieldVisible: (module: PlatformModule, field: string, visible: boolean) => void;
  getVisibleFields: (module: PlatformModule) => FieldPermission[];
  setFieldMode: (module: PlatformModule, field: string, mode: FieldMode) => void;
  getFieldMode: (module: PlatformModule, field: string) => FieldMode;
  maskValue: (value: string, mask?: string) => string;
}

const seed: ModuleFields = {
  material: [
    { field: 'valuationClass', label: '评估类', visible: true, mode: 'visible' },
    { field: 'standardPrice', label: '标准价', visible: true, mode: 'visible' },
    { field: 'movingAvgPrice', label: '移动平均价', visible: true, mode: 'visible' },
    { field: 'batchManaged', label: '批次管理', visible: true, mode: 'visible' },
  ],
  purchase: [
    { field: 'price', label: '单价', visible: true, mode: 'visible' },
    { field: 'tax', label: '税额', visible: true, mode: 'visible' },
    { field: 'supplierName', label: '供应商', visible: true, mode: 'visible' },
  ],
  sales: [
    { field: 'amount', label: '金额', visible: true, mode: 'visible' },
    { field: 'customerName', label: '客户', visible: true, mode: 'visible' },
  ],
  vendor: [],
  warehouse: [],
  quality: [],
  production: [],
  finance: [],
};

// 脱敏：保留首位与末位，中间以掩码字符替换；过短则整体掩码
export const maskValue = (value: string, mask = '•'): string => {
  const v = String(value ?? '');
  if (!v) return '';
  if (v.length <= 1) return mask.repeat(3);
  if (v.length === 2) return `${v[0]}${mask.repeat(2)}`;
  return `${v[0]}${mask.repeat(v.length - 2)}${v[v.length - 1]}`;
};

export const useFieldPermissionStore = create<FieldPermissionState>()(
  persist(
    (set, get) => ({
      moduleFields: seed,
      setFieldVisible: (module, field, visible) =>
        set((s) => {
          const list = s.moduleFields[module] ?? [];
          const exists = list.find((f) => f.field === field);
          const next = exists
            ? list.map((f) => (f.field === field ? { ...f, visible } : f))
            : [...list, { field, label: field, visible, mode: 'visible' }];
          return { moduleFields: { ...s.moduleFields, [module]: next } };
        }),
      getVisibleFields: (module) => get().moduleFields[module] ?? [],
      setFieldMode: (module, field, mode) =>
        set((s) => {
          const list = s.moduleFields[module] ?? [];
          const exists = list.find((f) => f.field === field);
          const next = exists
            ? list.map((f) => (f.field === field ? { ...f, mode } : f))
            : [...list, { field, label: field, visible: true, mode }];
          return { moduleFields: { ...s.moduleFields, [module]: next } };
        }),
      getFieldMode: (module, field) => {
        const list = get().moduleFields[module] ?? [];
        return list.find((f) => f.field === field)?.mode ?? 'visible';
      },
      maskValue,
    }),
    { name: 'ssa-erp-field-perm' },
  ),
);
