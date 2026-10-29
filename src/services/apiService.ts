/**
 * 统一 API Facade — 模拟 RESTful 风格，桥接 Zustand Store
 * 不依赖 React，可独立 import 使用
 */
import { ApiResponse } from '@/types/common';
// 必须取别名：本文件自身导出的 facade 常量也叫 api（export const api = {...}），
// 直接 import { api } 会与之冲突。
import { api as httpApi } from './api';
import { generateLocalDocNo } from '@/utils/codeGenerator';
import type {
  Material, MaterialCategory,
} from '@/types/material';
import type { Vendor } from '@/types/vendor';
import type { Customer } from '@/types/customer';
import type {
  PurchaseRequest, PurchaseOrder, VendorQuote,
} from '@/types/purchase';
import type { PurchaseInfoRecord } from '@/types/purchase';
import type { SourceListItem } from '@/types/purchase';
import type {
  SalesOrder, Prospect, Project,
} from '@/types/sales';
import type { SalesContract } from '@/types/sales';
import type {
  InboundOrder, OutboundOrder, CheckTask, InventoryRecord,
} from '@/types/warehouse';
import type {
  InspectionTask, UnqualifiedItem, PDCARecord,
} from '@/types/quality';
import type { EightDRecord } from '@/types/quality';
import type {
  WorkOrder, ProcessRoute, MRPRecommendation,
} from '@/types/production';
import type { BOMHeader } from '@/types/bom';
import type {
  Voucher,
} from '@/types/finance';
import type { Receivable, Payable } from '@/types/finance';
import type {
  PriceInquiry, PriceListItem, PriceApproval,
} from '@/types/price';

// ── Store 导入（非 Hook 方式，使用 getState）──
import { useMaterialStore } from '@/stores/materialStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useCustomerStore } from '@/stores/customerStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePurchaseInfoRecordStore } from '@/stores/purchaseInfoRecordStore';
import { useSourceListStore } from '@/stores/sourceListStore';
import { useSalesStore } from '@/stores/salesStore';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useFMEAStore } from '@/stores/fmeaStore';
import type { FMEA } from '@/stores/fmeaStore';
import { useQualityAdvancedStore } from '@/stores/qualityAdvancedStore';
import { useProductionStore } from '@/stores/productionStore';
import { useBOMStore } from '@/stores/bomStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useArapStore } from '@/stores/arapStore';
import { usePriceStore } from '@/stores/priceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDataDictStore } from '@/stores/dataDictStore';
import { useOrgStore } from '@/stores/orgStore';
import { useNumberingStore } from '@/stores/numberingStore';
import { useCustomFieldStore } from '@/stores/customFieldStore';
import { useUserStore } from '@/stores/userStore';
import { useUnitConversionStore } from '@/stores/unitConversionStore';
import { useOrderTemplateStore } from '@/stores/orderTemplateStore';
import { usePrintTemplateStore } from '@/stores/printTemplateStore';
import { useIntegrationStore } from '@/stores/integrationStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useLowCodeStore } from '@/stores/lowCodeStore';
import { useI18nStore } from '@/stores/i18nStore';
import { useReportPermissionStore } from '@/stores/reportPermissionStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useWorkbenchStore } from '@/stores/workbenchStore';
import { useListPrefsStore } from '@/stores/listPrefsStore';
import { useDisplayStore } from '@/stores/displayStore';
import { useConditionStore } from '@/stores/conditionStore';
import { useECNStore } from '@/stores/ecnStore';
import { useRebateStore } from '@/stores/rebateStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuditStore } from '@/stores/auditStore';

// ── 工具函数 ──

/** 模拟网络延迟 100-300ms */
const delay = () => new Promise<void>(r => setTimeout(r, 100 + Math.random() * 200));

/** 成功响应 */
function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

/** 错误响应 */
function fail(code: string, message: string) {
  return { success: false, error: { code, message } } as unknown as ApiResponse<never>;
}

/** 安全包装 async 操作 */
async function wrap<T>(fn: () => T, notFoundMsg: string = '资源未找到'): Promise<ApiResponse<T | null>> {
  await delay();
  try {
    const result = fn();
    if (result === null || result === undefined) {
      return fail('NOT_FOUND', notFoundMsg);
    }
    return ok(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail('INTERNAL_ERROR', msg);
  }
}

// ── 基础类型 ──

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 内部分页工具 */
function paginate<T>(items: T[], params?: PaginationParams): T[] {
  if (!params) return items;
  const { page = 1, pageSize = 20 } = params;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

// ================================================================
//  物料 API
// ================================================================

export const materialApi = {
  async list(params?: PaginationParams & { categoryId?: string; status?: string }): Promise<ApiResponse<Material[]>> {
    await delay();
    try {
      const state = useMaterialStore.getState();
      let items = [...state.materials];
      if (params?.categoryId) {
        items = items.filter(m => m.categoryId === params.categoryId);
      }
      if (params?.status) {
        items = items.filter(m => m.status === params.status);
      }
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter(m =>
          (m.code?.toLowerCase().includes(kw) || false) ||
          (m.name?.toLowerCase().includes(kw) || false) ||
          (m.specification?.toLowerCase().includes(kw) || false)
        );
      }
      items = paginate(items, params);
      return ok(items);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async getById(id: string): Promise<ApiResponse<Material | null>> {
    return wrap(() => useMaterialStore.getState().materials.find(m => m.id === id) ?? null);
  },

  async create(data: Partial<Material>): Promise<ApiResponse<Material>> {
    await delay();
    try {
      const id = `mat-${Date.now()}`;
      const material: Material = {
        code: data.code || generateLocalDocNo('MAT'),
        name: data.name || '',
        categoryId: data.categoryId || '',
        unit: data.unit || '',
        safetyStock: data.safetyStock ?? 0,
        minStock: data.minStock ?? 0,
        maxStock: data.maxStock ?? 0,
        currentStock: data.currentStock ?? 0,
        price: data.price ?? 0,
        currency: data.currency || 'CNY',
        status: data.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '',
        updatedBy: '',
        ...data,
        id,
      } as unknown as Material;
      useMaterialStore.getState().addMaterial(material);
      return ok(material);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async update(id: string, data: Partial<Material>): Promise<ApiResponse<Material>> {
    await delay();
    try {
      const store = useMaterialStore.getState();
      const existing = store.materials.find(m => m.id === id);
      if (!existing) return fail('NOT_FOUND', '物料未找到');
      store.updateMaterial(id, data);
      const updated = useMaterialStore.getState().materials.find(m => m.id === id);
      return ok(updated!);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    await delay();
    try {
      useMaterialStore.getState().deleteMaterial(id);
      return ok(null);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  // 物料分类
  async getCategories(): Promise<ApiResponse<MaterialCategory[]>> {
    await delay();
    try {
      return ok(useMaterialStore.getState().categories);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },
};

// ================================================================
//  供应商 API
// ================================================================

export const vendorApi = {
  async list(params?: PaginationParams & { type?: string; status?: string; rating?: number; keyword?: string }): Promise<ApiResponse<Vendor[]>> {
    await delay();
    try {
      const state = useVendorStore.getState();
      let items = [...state.vendors];
      if (params?.type) items = items.filter(v => v.type === params.type);
      if (params?.status) items = items.filter(v => v.status === params.status);
      if (params?.rating) items = items.filter(v => (v.rating ?? 0) >= params.rating!);
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter(v =>
          (v.code?.toLowerCase().includes(kw) || false) ||
          (v.name?.toLowerCase().includes(kw) || false)
        );
      }
      items = paginate(items, params);
      return ok(items);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async getById(id: string): Promise<ApiResponse<Vendor | null>> {
    return wrap(() => useVendorStore.getState().vendors.find(v => v.id === id) ?? null);
  },

  async create(data: Partial<Vendor>): Promise<ApiResponse<Vendor>> {
    await delay();
    try {
      const id = `ven-${Date.now()}`;
      const vendor: Vendor = {
        id,
        code: data.code || generateLocalDocNo('VEN'),
        name: data.name || '',
        type: data.type || 'manufacturer',
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Vendor;
      Object.assign(vendor, data, { id });
      useVendorStore.getState().addVendor(vendor);
      return ok(vendor);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async update(id: string, data: Partial<Vendor>): Promise<ApiResponse<Vendor>> {
    await delay();
    try {
      const store = useVendorStore.getState();
      const existing = store.vendors.find(v => v.id === id);
      if (!existing) return fail('NOT_FOUND', '供应商未找到');
      store.updateVendor(id, data);
      const updated = useVendorStore.getState().vendors.find(v => v.id === id);
      return ok(updated!);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    await delay();
    try {
      useVendorStore.getState().deleteVendor(id);
      return ok(null);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async blacklist(id: string, reason: string): Promise<ApiResponse<Vendor>> {
    await delay();
    try {
      const store = useVendorStore.getState();
      const vendor = store.vendors.find(v => v.id === id);
      if (!vendor) return fail('NOT_FOUND', '供应商未找到');
      store.updateVendor(id, { status: 'blacklisted' as never, remarks: reason } as Partial<Vendor>);
      const updated = useVendorStore.getState().vendors.find(v => v.id === id);
      return ok(updated!);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async checkRating(id: string): Promise<ApiResponse<number>> {
    await delay();
    try {
      const rating = useVendorStore.getState().vendors.find(v => v.id === id)?.rating ?? 0;
      return ok(rating);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },
};

// ================================================================
//  客户 API
// ================================================================

export const customerApi = {
  async list(params?: PaginationParams & { status?: string; keyword?: string }): Promise<ApiResponse<Customer[]>> {
    await delay();
    try {
      const state = useCustomerStore.getState();
      let items = [...state.customers];
      if (params?.status) items = items.filter(c => c.status === params.status);
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        items = items.filter(c =>
          (c.code?.toLowerCase().includes(kw) || false) ||
          (c.name?.toLowerCase().includes(kw) || false)
        );
      }
      items = paginate(items, params);
      return ok(items);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async getById(id: string): Promise<ApiResponse<Customer | null>> {
    return wrap(() => useCustomerStore.getState().customers.find((c: any) => c.id === id) ?? null);
  },

  async create(data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    await delay();
    try {
      const id = `cus-${Date.now()}`;
      const customer: Customer = {
        id,
        code: data.code || generateLocalDocNo('CUS'),
        name: data.name || '',
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Customer;
      Object.assign(customer, data, { id });
      useCustomerStore.getState().addCustomer(customer);
      return ok(customer);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async update(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    await delay();
    try {
      const store = useCustomerStore.getState();
      const existing = store.customers.find((c: any) => c.id === id);
      if (!existing) return fail('NOT_FOUND', '客户未找到');
      store.updateCustomer(id, data);
      const updated = useCustomerStore.getState().customers.find((c: any) => c.id === id);
      return ok(updated!);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    await delay();
    try {
      useCustomerStore.getState().deleteCustomer(id);
      return ok(null);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },
};

// ================================================================
//  采购 API
// ================================================================

export const purchaseApi = {
  request: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<PurchaseRequest[]>> {
      await delay();
      try {
        const state = usePurchaseStore.getState();
        let items = [...state.purchaseRequests];
        if (params?.status) items = items.filter(r => r.status === params.status);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(r => r.requestNo?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<PurchaseRequest | null>> {
      return wrap(() => usePurchaseStore.getState().purchaseRequests.find(r => r.id === id) ?? null);
    },
    async create(data: Partial<PurchaseRequest>): Promise<ApiResponse<PurchaseRequest>> {
      await delay();
      try {
        const id = `pr-${Date.now()}`;
        const request = {
          id,
          requestNo: data.requestNo || generateLocalDocNo('PR'),
          title: data.title || '采购申请',
          applicant: data.applicant || '',
          department: data.department || '',
          type: data.type || ('material' as const),
          priority: data.priority || ('normal' as const),
          reason: data.reason || '',
          expectedDate: data.expectedDate || new Date().toISOString().split('T')[0],
          status: data.status || 'draft' as const,
          items: data.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as PurchaseRequest;
        usePurchaseStore.getState().addPurchaseRequest(request);
        return ok(request);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<PurchaseRequest>): Promise<ApiResponse<PurchaseRequest>> {
      await delay();
      try {
        const store = usePurchaseStore.getState();
        if (!store.purchaseRequests.find(r => r.id === id)) return fail('NOT_FOUND', '采购申请未找到');
        store.updatePurchaseRequest(id, data);
        return ok(usePurchaseStore.getState().purchaseRequests.find(r => r.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        usePurchaseStore.getState().deletePurchaseRequest(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  order: {
    async list(params?: PaginationParams & { status?: string; vendorId?: string }): Promise<ApiResponse<PurchaseOrder[]>> {
      await delay();
      try {
        const state = usePurchaseStore.getState();
        let items = [...state.purchaseOrders];
        if (params?.status) items = items.filter(o => o.status === params.status);
        if (params?.vendorId) items = items.filter(o => o.vendorId === params.vendorId);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(o => o.orderNo?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<PurchaseOrder | null>> {
      return wrap(() => usePurchaseStore.getState().purchaseOrders.find(o => o.id === id) ?? null);
    },
    async create(data: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> {
      await delay();
      try {
        const id = `po-${Date.now()}`;
        const order: PurchaseOrder = {
          id,
          orderNo: data.orderNo || generateLocalDocNo('PO'),
          vendorId: data.vendorId || '',
          vendorName: data.vendorName || '',
          status: data.status || 'draft',
          items: data.items || [],
          totalAmount: data.totalAmount ?? 0,
          currency: data.currency || 'CNY',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as PurchaseOrder;
        Object.assign(order, data, { id });
        usePurchaseStore.getState().addPurchaseOrder(order);
        return ok(order);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> {
      await delay();
      try {
        const store = usePurchaseStore.getState();
        if (!store.purchaseOrders.find(o => o.id === id)) return fail('NOT_FOUND', '采购订单未找到');
        store.updatePurchaseOrder(id, data);
        return ok(usePurchaseStore.getState().purchaseOrders.find(o => o.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        usePurchaseStore.getState().deletePurchaseOrder(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async confirm(id: string): Promise<ApiResponse<PurchaseOrder>> {
      await delay();
      try {
        const store = usePurchaseStore.getState();
        const order = store.purchaseOrders.find(o => o.id === id);
        if (!order) return fail('NOT_FOUND', '采购订单未找到');
        store.updatePurchaseOrder(id, { status: 'confirmed' } as Partial<PurchaseOrder>);
        return ok(usePurchaseStore.getState().purchaseOrders.find(o => o.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  infoRecord: {
    async list(params?: PaginationParams & { vendorId?: string; materialId?: string }): Promise<ApiResponse<PurchaseInfoRecord[]>> {
      await delay();
      try {
        const state = usePurchaseInfoRecordStore.getState();
        let items = [...state.records];
        if (params?.vendorId) items = items.filter(r => r.vendorId === params.vendorId);
        if (params?.materialId) items = items.filter(r => r.materialId === params.materialId);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<PurchaseInfoRecord>): Promise<ApiResponse<PurchaseInfoRecord>> {
      await delay();
      try {
        const id = `pir-${Date.now()}`;
        const record: PurchaseInfoRecord = { id, isDefault: false, ...data } as PurchaseInfoRecord;
        usePurchaseInfoRecordStore.getState().addRecord(record);
        return ok(record);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<PurchaseInfoRecord>): Promise<ApiResponse<PurchaseInfoRecord>> {
      await delay();
      try {
        usePurchaseInfoRecordStore.getState().updateRecord(id, data);
        const updated = usePurchaseInfoRecordStore.getState().records.find(r => r.id === id);
        if (!updated) return fail('NOT_FOUND', '信息记录未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        usePurchaseInfoRecordStore.getState().deleteRecord(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  sourceList: {
    async list(params?: PaginationParams & { materialId?: string }): Promise<ApiResponse<SourceListItem[]>> {
      await delay();
      try {
        const state = useSourceListStore.getState();
        let items = [...state.items];
        if (params?.materialId) items = items.filter(s => s.materialId === params.materialId);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<SourceListItem>): Promise<ApiResponse<SourceListItem>> {
      await delay();
      try {
        const id = `sl-${Date.now()}`;
        const item: SourceListItem = { id, ...data } as SourceListItem;
        useSourceListStore.getState().addItem(item);
        return ok(item);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<SourceListItem>): Promise<ApiResponse<SourceListItem>> {
      await delay();
      try {
        useSourceListStore.getState().updateItem(id, data);
        const updated = useSourceListStore.getState().items.find(s => s.id === id);
        if (!updated) return fail('NOT_FOUND', '货源清单条目未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useSourceListStore.getState().deleteItem(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  销售 API
// ================================================================

export const salesApi = {
  order: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<SalesOrder[]>> {
      await delay();
      try {
        const state = useSalesStore.getState();
        let items = [...state.salesOrders];
        if (params?.status) items = items.filter(o => o.status === params.status);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(o => o.orderNo?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<SalesOrder | null>> {
      return wrap(() => useSalesStore.getState().salesOrders.find(o => o.id === id) ?? null);
    },
    async create(data: Partial<SalesOrder>): Promise<ApiResponse<SalesOrder>> {
      await delay();
      try {
        const id = `so-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const order = {
          id,
          orderNo: data.orderNo || generateLocalDocNo('SO'),
          type: data.type || ('standard' as const),
          status: data.status || 'draft' as const,
          customerId: data.customerId || '',
          customerName: data.customerName || '',
          totalAmount: data.totalAmount ?? 0,
          taxRate: data.taxRate ?? 13,
          taxAmount: data.taxAmount ?? 0,
          grandTotal: data.grandTotal ?? 0,
          orderDate: data.orderDate || today,
          expectedDeliveryDate: data.expectedDeliveryDate || today,
          items: data.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as SalesOrder;
        useSalesStore.getState().addSalesOrder(order);
        return ok(order);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<SalesOrder>): Promise<ApiResponse<SalesOrder>> {
      await delay();
      try {
        const store = useSalesStore.getState();
        if (!store.salesOrders.find(o => o.id === id)) return fail('NOT_FOUND', '销售订单未找到');
        store.updateSalesOrder(id, data);
        return ok(useSalesStore.getState().salesOrders.find(o => o.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useSalesStore.getState().deleteSalesOrder(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  contract: {
    async list(params?: PaginationParams & { status?: string; customerId?: string }): Promise<ApiResponse<SalesContract[]>> {
      await delay();
      try {
        const state = useSalesContractStore.getState();
        let items = [...state.contracts];
        if (params?.status) items = items.filter(c => c.status === params.status);
        if (params?.customerId) items = items.filter(c => c.customerId === params.customerId);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(c => c.contractNo?.toLowerCase().includes(kw) || c.name?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<SalesContract | null>> {
      return wrap(() => useSalesContractStore.getState().contracts.find(c => c.id === id) ?? null);
    },
    async create(data: Partial<SalesContract>): Promise<ApiResponse<SalesContract>> {
      await delay();
      try {
        const id = `sc-${Date.now()}`;
        const contract: SalesContract = {
          id,
          contractNo: data.contractNo || generateLocalDocNo('SC'),
          name: data.name || '',
          customerId: data.customerId || '',
          customerName: data.customerName || '',
          salesPerson: data.salesPerson || '',
          amount: data.amount ?? 0,
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          status: data.status || 'draft',
          items: data.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as SalesContract;
        Object.assign(contract, data, { id });
        useSalesContractStore.getState().addContract(contract);
        return ok(contract);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<SalesContract>): Promise<ApiResponse<SalesContract>> {
      await delay();
      try {
        const store = useSalesContractStore.getState();
        if (!store.contracts.find(c => c.id === id)) return fail('NOT_FOUND', '合同未找到');
        store.updateContract(id, data);
        return ok(useSalesContractStore.getState().contracts.find(c => c.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useSalesContractStore.getState().deleteContract(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  prospect: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<Prospect[]>> {
      await delay();
      try {
        const state = useSalesStore.getState();
        let items = [...state.prospects];
        if (params?.status) items = items.filter(p => p.status === params.status);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(p => p.contactName?.toLowerCase().includes(kw) || p.companyName?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<Prospect>): Promise<ApiResponse<Prospect>> {
      await delay();
      try {
        const id = `prosp-${Date.now()}`;
        const prospect: Prospect = {
          id,
          prospectNo: data.prospectNo || generateLocalDocNo('PROSP'),
          companyName: data.companyName || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || '',
          source: data.source || 'referral',
          status: data.status || 'new',
          assignedTo: data.assignedTo || '',
          interestProducts: data.interestProducts || [],
          followupRecords: data.followupRecords || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Prospect;
        Object.assign(prospect, data, { id });
        useSalesStore.getState().addProspect(prospect);
        return ok(prospect);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<Prospect>): Promise<ApiResponse<Prospect>> {
      await delay();
      try {
        const store = useSalesStore.getState();
        if (!store.prospects.find(p => p.id === id)) return fail('NOT_FOUND', '意向客户未找到');
        store.updateProspect(id, data);
        return ok(useSalesStore.getState().prospects.find(p => p.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async convert(id: string, customerData?: Partial<Customer>): Promise<ApiResponse<Customer>> {
      await delay();
      try {
        const salesState = useSalesStore.getState();
        const prospect = salesState.prospects.find(p => p.id === id);
        if (!prospect) return fail('NOT_FOUND', '意向客户未找到');

        // 创建客户
        const customerId = `cus-${Date.now()}`;
        const customer: Customer = {
          id: customerId,
          code: customerData?.code || generateLocalDocNo('CUS'),
          name: customerData?.name || prospect.companyName || '',
          shortName: customerData?.shortName || prospect.companyName?.substring(0, 10),
          type: customerData?.type || 'enterprise',
          status: 'active',
          invoiceTitle: customerData?.invoiceTitle || prospect.companyName,
          invoicePhone: customerData?.invoicePhone || prospect.contactPhone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...customerData,
        } as Customer;

        useCustomerStore.getState().addCustomer(customer);
        // 标记意向客户为已转化
        salesState.updateProspect(id, { status: 'won' } as Partial<Prospect>);
        return ok(customer);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  仓储 API
// ================================================================

export const warehouseApi = {
  inbound: {
    async list(params?: PaginationParams & { status?: string; type?: string }): Promise<ApiResponse<InboundOrder[]>> {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.inboundOrders];
        if (params?.status) items = items.filter(o => o.status === params.status);
        if (params?.type) items = items.filter(o => o.type === params.type);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(o => o.inboundNo?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<InboundOrder>): Promise<ApiResponse<InboundOrder>> {
      await delay();
      try {
        const id = `ib-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const order = {
          id,
          inboundNo: data.inboundNo || generateLocalDocNo('IN'),
          type: data.type || 'purchase' as const,
          status: data.status || 'pending' as const,
          warehouseId: data.warehouseId || '',
          operator: data.operator || '',
          inboundDate: data.inboundDate || today,
          items: data.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as InboundOrder;
        useWarehouseStore.getState().addInboundOrder(order);
        return ok(order);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<InboundOrder>): Promise<ApiResponse<InboundOrder>> {
      await delay();
      try {
        const store = useWarehouseStore.getState();
        if (!store.inboundOrders.find(o => o.id === id)) return fail('NOT_FOUND', '入库单未找到');
        store.updateInboundOrder(id, data);
        return ok(useWarehouseStore.getState().inboundOrders.find(o => o.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  outbound: {
    async list(params?: PaginationParams & { status?: string; type?: string }): Promise<ApiResponse<OutboundOrder[]>> {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.outboundOrders];
        if (params?.status) items = items.filter(o => o.status === params.status);
        if (params?.type) items = items.filter(o => o.type === params.type);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(o => o.outboundNo?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<OutboundOrder>): Promise<ApiResponse<OutboundOrder>> {
      await delay();
      try {
        const id = `ob-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const order = {
          id,
          outboundNo: data.outboundNo || generateLocalDocNo('OUT'),
          type: data.type || 'sale' as const,
          status: data.status || 'pending' as const,
          warehouseId: data.warehouseId || '',
          operator: data.operator || '',
          outboundDate: data.outboundDate || today,
          items: data.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as OutboundOrder;
        useWarehouseStore.getState().addOutboundOrder(order);
        return ok(order);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<OutboundOrder>): Promise<ApiResponse<OutboundOrder>> {
      await delay();
      try {
        const store = useWarehouseStore.getState();
        if (!store.outboundOrders.find(o => o.id === id)) return fail('NOT_FOUND', '出库单未找到');
        store.updateOutboundOrder(id, data);
        return ok(useWarehouseStore.getState().outboundOrders.find(o => o.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  inventory: {
    async list(params?: PaginationParams & { warehouseId?: string; materialId?: string }): Promise<ApiResponse<InventoryRecord[]>> {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.inventoryRecords];
        if (params?.warehouseId) items = items.filter(r => r.warehouseId === params.warehouseId);
        if (params?.materialId) items = items.filter(r => r.materialId === params.materialId);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(r => r.materialName?.toLowerCase().includes(kw) || r.materialCode?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async query(params: { warehouseId?: string; materialId?: string; keyword?: string }): Promise<ApiResponse<InventoryRecord[]>> {
      return warehouseApi.inventory.list({ ...params, page: 1, pageSize: 1000 });
    },
  },

  check: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<CheckTask[]>> {
      await delay();
      try {
        const state = useWarehouseStore.getState();
        let items = [...state.checkTasks];
        if (params?.status) items = items.filter(t => t.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<CheckTask>): Promise<ApiResponse<CheckTask>> {
      await delay();
      try {
        const id = `ck-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const task = {
          id,
          taskNo: (data as Record<string, unknown>).taskNo || generateLocalDocNo('CK'),
          warehouseId: (data as Record<string, unknown>).warehouseId || '',
          type: (data as Record<string, unknown>).type || 'full',
          status: data.status || 'pending' as const,
          startDate: (data as Record<string, unknown>).startDate || today,
          operator: (data as Record<string, unknown>).operator || '',
          items: (data as Record<string, unknown>).items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as CheckTask;
        useWarehouseStore.getState().addCheckTask(task);
        return ok(task);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  质量 API
// ================================================================

export const qualityApi = {
  inspection: {
    async list(params?: PaginationParams & { type?: string; status?: string }): Promise<ApiResponse<InspectionTask[]>> {
      await delay();
      try {
        const state = useQualityStore.getState();
        let items = [...state.inspectionTasks];
        if (params?.type) items = items.filter(t => t.type === params.type);
        if (params?.status) items = items.filter(t => t.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<InspectionTask | null>> {
      return wrap(() => useQualityStore.getState().inspectionTasks.find(t => t.id === id) ?? null);
    },
    async create(data: Partial<InspectionTask>): Promise<ApiResponse<InspectionTask>> {
      await delay();
      try {
        const id = `insp-${Date.now()}`;
        const task = {
          id,
          taskNo: data.taskNo || generateLocalDocNo('INS'),
          type: data.type || 'incoming' as const,
          status: data.status || 'pending' as const,
          materialId: data.materialId || '',
          materialCode: data.materialCode || '',
          materialName: data.materialName || '',
          batchNo: data.batchNo || '',
          quantity: data.quantity ?? 0,
          sampleQuantity: data.sampleQuantity ?? 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as InspectionTask;
        useQualityStore.getState().addInspectionTask(task);
        return ok(task);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<InspectionTask>): Promise<ApiResponse<InspectionTask>> {
      await delay();
      try {
        useQualityStore.getState().updateInspectionTask(id, data);
        const updated = useQualityStore.getState().inspectionTasks.find(t => t.id === id);
        if (!updated) return fail('NOT_FOUND', '检验任务未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useQualityStore.getState().deleteInspectionTask(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  unqualified: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<UnqualifiedItem[]>> {
      await delay();
      try {
        const state = useQualityStore.getState();
        let items = [...state.unqualifiedItems];
        if (params?.status) items = items.filter(i => i.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<UnqualifiedItem>): Promise<ApiResponse<UnqualifiedItem>> {
      await delay();
      try {
        const id = `uq-${Date.now()}`;
        const d = data as Record<string, unknown>;
        const item = {
          id,
          itemNo: d.itemNo || generateLocalDocNo('UQ'),
          inspectionTaskId: d.inspectionTaskId || '',
          inspectionTaskNo: d.inspectionTaskNo || '',
          materialCode: d.materialCode || '',
          materialName: d.materialName || '',
          batchNo: d.batchNo || '',
          defectQuantity: d.defectQuantity ?? 0,
          defectDescription: d.defectDescription || '',
          disposition: d.disposition || 'rework',
          dispositionStatus: d.dispositionStatus || 'pending',
          status: data.status || 'open' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as UnqualifiedItem;
        useQualityStore.getState().addUnqualifiedItem(item);
        return ok(item);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<UnqualifiedItem>): Promise<ApiResponse<UnqualifiedItem>> {
      await delay();
      try {
        useQualityStore.getState().updateUnqualifiedItem(id, data);
        const updated = useQualityStore.getState().unqualifiedItems.find(i => i.id === id);
        if (!updated) return fail('NOT_FOUND', '不合格品未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  fmea: {
    async list(params?: PaginationParams & { materialCode?: string }): Promise<ApiResponse<FMEA[]>> {
      await delay();
      try {
        const state = useFMEAStore.getState();
        let items = [...state.items];
        if (params?.materialCode) items = items.filter(r => r.item === params.materialCode);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<FMEA>): Promise<ApiResponse<FMEA>> {
      await delay();
      try {
        const id = `fmea-${Date.now()}`;
        const record: FMEA = { id, createdBy: '', updatedBy: '', ...data } as FMEA;
        useFMEAStore.getState().addItem(record);
        return ok(record);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<FMEA>): Promise<ApiResponse<FMEA>> {
      await delay();
      try {
        useFMEAStore.getState().updateItem(id, data);
        const updated = useFMEAStore.getState().items.find(r => r.id === id);
        if (!updated) return fail('NOT_FOUND', 'FMEA记录未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useFMEAStore.getState().deleteItem(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  coa: {
    async list(params?: PaginationParams): Promise<ApiResponse<unknown[]>> {
      await delay();
      try {
        const state = useQualityAdvancedStore.getState();
        const items = paginate([...state.coqRecords], params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  生产 API
// ================================================================

export const productionApi = {
  workOrder: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<WorkOrder[]>> {
      await delay();
      try {
        const state = useProductionStore.getState();
        let items = [...state.workOrders];
        if (params?.status) items = items.filter(o => o.status === params.status);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(o => o.orderNo?.toLowerCase().includes(kw) || o.productName?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<WorkOrder | null>> {
      return wrap(() => useProductionStore.getState().workOrders.find(o => o.id === id) ?? null);
    },
    async create(data: Partial<WorkOrder>): Promise<ApiResponse<WorkOrder>> {
      await delay();
      try {
        const id = `wo-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const d = data as Record<string, unknown>;
        const order = {
          id,
          orderNo: d.orderNo || generateLocalDocNo('WO'),
          productCode: d.productCode || '',
          productName: d.productName || '',
          bomId: d.bomId || '',
          bomNo: d.bomNo || '',
          routeId: d.routeId || '',
          routeNo: d.routeNo || '',
          plannedQuantity: d.plannedQuantity ?? 0,
          completedQuantity: 0,
          scrapQuantity: 0,
          plannedStartDate: d.plannedStartDate || today,
          plannedEndDate: d.plannedEndDate || today,
          priority: d.priority || 'normal',
          workshop: d.workshop || '',
          supervisor: d.supervisor || '',
          status: data.status || 'draft' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as WorkOrder;
        useProductionStore.getState().addWorkOrder(order);
        return ok(order);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<WorkOrder>): Promise<ApiResponse<WorkOrder>> {
      await delay();
      try {
        const store = useProductionStore.getState();
        if (!store.workOrders.find(o => o.id === id)) return fail('NOT_FOUND', '生产工单未找到');
        store.updateWorkOrder(id, data);
        return ok(useProductionStore.getState().workOrders.find(o => o.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useProductionStore.getState().deleteWorkOrder(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  bom: {
    async list(params?: PaginationParams & { productId?: string }): Promise<ApiResponse<BOMHeader[]>> {
      await delay();
      try {
        const state = useBOMStore.getState();
        let items = [...state.bomList];
        if (params?.productId) items = items.filter(b => b.productId === params.productId);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<BOMHeader | null>> {
      return wrap(() => useBOMStore.getState().bomList.find(b => b.id === id) ?? null);
    },
    async create(data: Partial<BOMHeader>): Promise<ApiResponse<BOMHeader>> {
      await delay();
      try {
        const id = `bom-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];
        const d = data as Record<string, unknown>;
        const bom = {
          id,
          bomNo: d.bomNo || generateLocalDocNo('BOM'),
          name: d.name || '',
          type: d.type || 'MBOM',
          productId: d.productId || '',
          productCode: d.productCode || '',
          productName: d.productName || '',
          version: d.version || '1.0',
          status: data.status || 'draft' as const,
          effectiveDate: d.effectiveDate || today,
          currency: d.currency || 'CNY',
          items: d.items || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '',
          updatedBy: '',
          ...data,
        } as unknown as BOMHeader;
        useBOMStore.getState().addBOM(bom);
        return ok(bom);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<BOMHeader>): Promise<ApiResponse<BOMHeader>> {
      await delay();
      try {
        const store = useBOMStore.getState();
        if (!store.bomList.find(b => b.id === id)) return fail('NOT_FOUND', 'BOM未找到');
        store.updateBOM(id, data);
        return ok(useBOMStore.getState().bomList.find(b => b.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useBOMStore.getState().deleteBOM(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  mrp: {
    async list(params?: PaginationParams): Promise<ApiResponse<MRPRecommendation[]>> {
      await delay();
      try {
        const state = useProductionStore.getState();
        const items = paginate([...state.mrpRecommendations], params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  财务 API
// ================================================================

export const financeApi = {
  voucher: {
    async list(params?: PaginationParams & { period?: string; status?: string }): Promise<ApiResponse<Voucher[]>> {
      await delay();
      try {
        const state = useFinanceStore.getState();
        let items = [...state.vouchers];
        if (params?.status) items = items.filter(v => v.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<Voucher | null>> {
      return wrap(() => useFinanceStore.getState().vouchers.find(v => v.id === id) ?? null);
    },
    async create(data: Partial<Voucher>): Promise<ApiResponse<Voucher>> {
      await delay();
      try {
        const store = useFinanceStore.getState();
        const result = store.createVoucher({
          date: data.date || new Date().toISOString().split('T')[0],
          voucherType: data.voucherType || '记账',
          items: data.items || [],
          remark: data.remark || '',
        });
        if (!result.ok) return fail('VALIDATION', result.message);
        return ok(useFinanceStore.getState().vouchers[useFinanceStore.getState().vouchers.length - 1]!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<Voucher>): Promise<ApiResponse<Voucher>> {
      await delay();
      try {
        const store = useFinanceStore.getState();
        if (!store.vouchers.find(v => v.id === id)) return fail('NOT_FOUND', '凭证未找到');
        store.updateVoucher(id, data);
        return ok(useFinanceStore.getState().vouchers.find(v => v.id === id)!);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        useFinanceStore.getState().deleteVoucher(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  receivable: {
    async list(params?: PaginationParams & { status?: string; customerId?: string }): Promise<ApiResponse<Receivable[]>> {
      await delay();
      try {
        const state = useArapStore.getState();
        let items = [...state.receivables];
        if (params?.customerId) items = items.filter(r => r.customerId === params.customerId);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(r => r.customerName?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<Receivable | null>> {
      return wrap(() => useArapStore.getState().receivables.find(r => r.id === id) ?? null);
    },
  },

  payable: {
    async list(params?: PaginationParams & { status?: string; vendorId?: string }): Promise<ApiResponse<Payable[]>> {
      await delay();
      try {
        const state = useArapStore.getState();
        let items = [...state.payables];
        if (params?.vendorId) items = items.filter(p => p.vendorId === params.vendorId);
        if (params?.keyword) {
          const kw = params.keyword.toLowerCase();
          items = items.filter(p => p.vendorName?.toLowerCase().includes(kw) || false);
        }
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<Payable | null>> {
      return wrap(() => useArapStore.getState().payables.find(p => p.id === id) ?? null);
    },
  },

  threeway: {
    async list(): Promise<ApiResponse<unknown[]>> {
      try {
        // V3.19.0：改为读取服务端留档（GET /api/three-way-match）。
        // 此前这里读的是 useArapStore.threeWayMatches —— 而 arapStore 从来没有这个字段，
        // 于是永远返回空数组：调用方拿到「没有三单匹配记录」，却分不清
        // 是「真的没有」还是「字段名写错了」。
        // 这类「读一个不存在的字段」的幽灵实现比直接报错更难发现，
        // 因为它安静地给出一个看起来合理的空结果。
        const res = await httpApi.get<{ data: unknown[] }>('/three-way-match', { pageSize: 200 });
        return ok(res?.data ?? []);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  价格 API
// ================================================================

export const priceApi = {
  inquiry: {
    async list(params?: PaginationParams & { status?: string }): Promise<ApiResponse<PriceInquiry[]>> {
      await delay();
      try {
        const state = usePriceStore.getState();
        let items = [...state.priceInquiries];
        if (params?.status) items = items.filter(i => i.status === params.status);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async getById(id: string): Promise<ApiResponse<PriceInquiry | null>> {
      return wrap(() => usePriceStore.getState().priceInquiries.find(i => i.id === id) ?? null);
    },
    async create(data: Partial<PriceInquiry>): Promise<ApiResponse<PriceInquiry>> {
      await delay();
      try {
        const id = `inq-${Date.now()}`;
        const inquiry: PriceInquiry = {
          id,
          inquiryNo: data.inquiryNo || generateLocalDocNo('INQ'),
          status: data.status || 'draft',
          items: data.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as PriceInquiry;
        Object.assign(inquiry, data, { id });
        usePriceStore.getState().addPriceInquiry(inquiry);
        return ok(inquiry);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<PriceInquiry>): Promise<ApiResponse<PriceInquiry>> {
      await delay();
      try {
        usePriceStore.getState().updatePriceInquiry(id, data);
        const updated = usePriceStore.getState().priceInquiries.find(i => i.id === id);
        if (!updated) return fail('NOT_FOUND', '询价单未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        usePriceStore.getState().deletePriceInquiry(id);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  priceList: {
    async list(params?: PaginationParams & { status?: string; vendorId?: string }): Promise<ApiResponse<PriceListItem[]>> {
      await delay();
      try {
        const state = usePriceStore.getState();
        let items = [...state.priceList];
        if (params?.status) items = items.filter(p => p.status === params.status);
        if (params?.vendorId) items = items.filter(p => p.vendorId === params.vendorId);
        items = paginate(items, params);
        return ok(items);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async create(data: Partial<PriceListItem>): Promise<ApiResponse<PriceListItem>> {
      await delay();
      try {
        const id = `pl-${Date.now()}`;
        const item: PriceListItem = { id, ...data } as PriceListItem;
        usePriceStore.getState().addPriceListItem(item);
        return ok(item);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async update(id: string, data: Partial<PriceListItem>): Promise<ApiResponse<PriceListItem>> {
      await delay();
      try {
        usePriceStore.getState().updatePriceListItem(id, data);
        const updated = usePriceStore.getState().priceList.find(p => p.id === id);
        if (!updated) return fail('NOT_FOUND', '价格条目未找到');
        return ok(updated);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
    async delete(id: string): Promise<ApiResponse<null>> {
      await delay();
      try {
        // Price store doesn't have deletePriceListItem, use setPriceList with filter
        const store = usePriceStore.getState();
        const filtered = store.priceList.filter(p => p.id !== id);
        store.setPriceList(filtered);
        return ok(null);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },

  condition: {
    async list(): Promise<ApiResponse<unknown[]>> {
      await delay();
      try {
        const state = useConditionStore.getState();
        return ok([...(state.conditions ?? [])] as unknown[]);
      } catch (e: unknown) { return fail('ERROR', e instanceof Error ? e.message : String(e)); }
    },
  },
};

// ================================================================
//  系统 API
// ================================================================

export const systemApi = {
  async getStatus(): Promise<ApiResponse<{ version: string; storeCount: number; storageKB: number }>> {
    await delay();
    try {
      // 统计各 store 中的数据条数
      const stores = [
        useMaterialStore.getState(), useVendorStore.getState(), useCustomerStore.getState(),
        usePurchaseStore.getState(), useSalesStore.getState(), useWarehouseStore.getState(),
      ];
      let storeCount = 0;
      for (const s of stores) {
        const vals = Object.values(s);
        for (const v of vals) {
          if (Array.isArray(v)) storeCount += v.length;
        }
      }
      // 估算 localStorage 大小
      let storageKB = 0;
      try {
        const total = Object.keys(localStorage).reduce((sum, k) => sum + (localStorage.getItem(k)?.length ?? 0), 0);
        storageKB = Math.round(total / 1024);
      } catch { /* ignore */ }
      return ok({ version: '1.0.0', storeCount, storageKB });
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async exportAll(): Promise<ApiResponse<Record<string, unknown>>> {
    await delay();
    try {
      const data: Record<string, unknown> = {};
      const storeMap: Array<[string, { getState(): Record<string, unknown> }]> = [
        ['materials', useMaterialStore as unknown as { getState(): Record<string, unknown> }],
        ['vendors', useVendorStore as unknown as { getState(): Record<string, unknown> }],
        ['customers', useCustomerStore as unknown as { getState(): Record<string, unknown> }],
        ['purchase', usePurchaseStore as unknown as { getState(): Record<string, unknown> }],
        ['sales', useSalesStore as unknown as { getState(): Record<string, unknown> }],
        ['warehouse', useWarehouseStore as unknown as { getState(): Record<string, unknown> }],
        ['quality', useQualityStore as unknown as { getState(): Record<string, unknown> }],
        ['production', useProductionStore as unknown as { getState(): Record<string, unknown> }],
        ['finance', useFinanceStore as unknown as { getState(): Record<string, unknown> }],
        ['price', usePriceStore as unknown as { getState(): Record<string, unknown> }],
        ['settings', useSettingsStore as unknown as { getState(): Record<string, unknown> }],
      ];
      for (const [key, storeHook] of storeMap) {
        const state = storeHook.getState();
        for (const [sk, sv] of Object.entries(state)) {
          if (Array.isArray(sv)) {
            data[`${key}.${sk}`] = sv;
          }
        }
      }
      return ok(data);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },

  async importAll(data: Record<string, unknown>): Promise<ApiResponse<null>> {
    await delay();
    try {
      // 导入各 Store 的 set 操作
      const storeSetters: Record<string, (items: unknown[]) => void> = {
        'materials.materials': (items) => useMaterialStore.setState({ materials: items as never }),
        'vendors.vendors': (items) => useVendorStore.setState({ vendors: items as never }),
        'customers.customers': (items) => useCustomerStore.setState({ customers: items as never }),
      };
      for (const [key, value] of Object.entries(data)) {
        if (storeSetters[key] && Array.isArray(value)) {
          storeSetters[key](value);
        }
      }
      return ok(null);
    } catch (e: unknown) {
      return fail('ERROR', e instanceof Error ? e.message : String(e));
    }
  },
};

// ── 默认导出 ──

const api = {
  material: materialApi,
  vendor: vendorApi,
  customer: customerApi,
  purchase: purchaseApi,
  sales: salesApi,
  warehouse: warehouseApi,
  quality: qualityApi,
  production: productionApi,
  finance: financeApi,
  price: priceApi,
  system: systemApi,
};

export default api;
