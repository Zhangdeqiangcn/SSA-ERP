import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';

/**
 * 订单模板单一数据源（全面 store 化 · V2.14）
 * ------------------------------------------------------------
 * 将采购订单模板从 OrderTemplateTab 的 localStorage `ssa-order-templates`
 * 收敛到唯一 zustand persist store。新建采购订单时由 OrderForm 直接消费本 store，
 * 消除「设置页写一份、OrderForm 又读 localStorage」的双点直读。首次启动从旧键迁移
 * （若有用户自定义），否则播种 2 条默认模板。
 *
 * V3.66.0 P0-2 订单模板 D1 化：数据主源 = D1 order_templates 表（items 明细封 extra_json），
 * 增删改经 entityRepo 同步；启动水合 D1，空库回填本地 seed（含旧 localStorage 迁移）。
 * 对外接口不变（upsertTemplate/removeTemplate/duplicateTemplate 签名未动）。
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

// ── V3.66.0 P0-2：嵌套 items 打包/解包（extra_json）────────────────────────
function packTemplate(t: OrderTemplate) {
  const { items, ...rest } = t;
  return { ...rest, extraJson: JSON.stringify(items || []) };
}
function unpackTemplate(r: any): OrderTemplate {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), items: extra.items ?? [] };
}

interface OrderTemplateState {
  templates: OrderTemplate[];
  setTemplates: (templates: OrderTemplate[]) => void;
  upsertTemplate: (template: OrderTemplate) => void;
  removeTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  /** V3.66.0 P0-2：启动时从 D1 order_templates 水合（主源 = D1，本地 Blob 降为离线兜底） */
  hydrateTemplates: () => Promise<void>;
}

export const useOrderTemplateStore = create<OrderTemplateState>()(
  persist(
    (set) => ({
      templates: seedTemplates(),
      setTemplates: (templates) => set({ templates }),
      upsertTemplate: (template) => {
        set((state) => {
          const idx = state.templates.findIndex((t) => t.id === template.id);
          if (idx >= 0) {
            const next = [...state.templates];
            next[idx] = template;
            return { templates: next };
          }
          return { templates: [...state.templates, template] };
        });
        // V3.66.0 P0-2：模板变更同步 D1（items 封 extra_json；失败静默不阻断本地）
        entityRepo.update('orderTemplate', template.id, packTemplate(template))
          .catch(() => { const p = packTemplate(template); entityRepo.create('orderTemplate', { ...p, id: template.id }).catch(() => {}); });
      },
      removeTemplate: (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
        entityRepo.remove('orderTemplate', id).catch(() => {});
      },
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
          entityRepo.create('orderTemplate', packTemplate(clone)).catch(() => {});
          return { templates: [...state.templates, clone] };
        }),

      hydrateTemplates: async () => {
        try {
          const res = await entityRepo.list<any>('orderTemplate', { page: 1, pageSize: 200 });
          const rows: any[] = res?.data || [];
          if (rows.length === 0) {
            // 空库首次：本地 seed（含旧 localStorage 迁移结果）回填 D1
            for (const t of seedTemplates()) {
              try { await entityRepo.create('orderTemplate', packTemplate(t)); } catch { /* 冲突忽略 */ }
            }
            return;
          }
          set({ templates: rows.map(unpackTemplate) });
        } catch {
          /* 离线/异常：保留本地 Blob 副本（persist 水合结果），不阻断 */
        }
      },
    }),
    { storage: backendStorage,
     name: 'ssa-erp-order-templates', version: 2 }
  )
);

// ── V3.66.0 P0-2：启动水合订单模板（D1 主源，与 qualityStore 同款顶层触发）──
void useOrderTemplateStore.getState().hydrateTemplates();
