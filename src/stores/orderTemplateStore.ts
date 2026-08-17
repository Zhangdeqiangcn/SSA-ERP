import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 订单模板单一数据源（全面 store 化 · V2.14）
 * ------------------------------------------------------------
 * 将采购订单模板从 OrderTemplateTab 的 localStorage `ssa-order-templates`
 * 收敛到唯一 zustand persist store。新建采购订单时由 OrderForm 直接消费本 store，
 * 消除「设置页写一份、OrderForm 又读 localStorage」的双点直读。首次启动从旧键迁移
 * （若有用户自定义），否则播种 2 条默认模板。
 */

export interface TemplateItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderTemplate {
  id: string;
  name: string;
  vendorId: string;
  vendorName: string;
  paymentTerms: string;
  tradeTerms: string;
  deliveryTerms: string;
  remarks: string;
  expectedDeliveryDate: string;
  items: TemplateItem[];
  createdAt: string;
}

export const DEFAULT_ORDER_TEMPLATES: OrderTemplate[] = [
  {
    id: 'tpl-001',
    name: '钢板标准采购模板',
    vendorId: 'ven-001',
    vendorName: '上海宝钢钢铁贸易有限公司',
    paymentTerms: '货到付款',
    tradeTerms: 'CIF（到岸价）',
    deliveryTerms: '含运费到厂',
    remarks: '钢板类物料标准采购模板',
    expectedDeliveryDate: '',
    items: [
      { materialId: 'mat-001', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', specification: '10mm*1500mm*6000mm', unit: '吨', quantity: 30, unitPrice: 4150 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-002',
    name: '紧固件批量采购模板',
    vendorId: 'ven-002',
    vendorName: '浙江温州紧固件有限公司',
    paymentTerms: '月结30天',
    tradeTerms: 'FOB（离岸价）',
    deliveryTerms: '自提',
    remarks: '螺栓螺母类物料批量采购',
    expectedDeliveryDate: '',
    items: [
      { materialId: 'mat-004', materialCode: 'MAT202405010004', materialName: '螺栓 M10', specification: 'M10*40 10.9级', unit: '套', quantity: 500, unitPrice: 2.3 },
      { materialId: 'mat-005', materialCode: 'MAT202405010005', materialName: '螺栓 M12', specification: 'M12*50 8.8级', unit: '套', quantity: 300, unitPrice: 3.0 },
    ],
    createdAt: new Date().toISOString(),
  },
];

const seedTemplates = (): OrderTemplate[] => {
  try {
    const raw = localStorage.getItem('ssa-order-templates');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.removeItem('ssa-order-templates');
        return parsed as OrderTemplate[];
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ORDER_TEMPLATES.map((t) => ({ ...t, items: t.items.map((i) => ({ ...i })) }));
};

interface OrderTemplateState {
  templates: OrderTemplate[];
  setTemplates: (templates: OrderTemplate[]) => void;
  upsertTemplate: (template: OrderTemplate) => void;
  removeTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
}

export const useOrderTemplateStore = create<OrderTemplateState>()(
  persist(
    (set) => ({
      templates: seedTemplates(),
      setTemplates: (templates) => set({ templates }),
      upsertTemplate: (template) =>
        set((state) => {
          const idx = state.templates.findIndex((t) => t.id === template.id);
          if (idx >= 0) {
            const next = [...state.templates];
            next[idx] = template;
            return { templates: next };
          }
          return { templates: [...state.templates, template] };
        }),
      removeTemplate: (id) => set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),
      duplicateTemplate: (id) =>
        set((state) => {
          const src = state.templates.find((t) => t.id === id);
          if (!src) return state;
          const clone: OrderTemplate = {
            ...src,
            id: `tpl-${Date.now()}`,
            name: `${src.name} (副本)`,
            items: src.items.map((i) => ({ ...i })),
            createdAt: new Date().toISOString(),
          };
          return { templates: [...state.templates, clone] };
        }),
    }),
    { name: 'ssa-erp-order-templates', version: 1 }
  )
);
