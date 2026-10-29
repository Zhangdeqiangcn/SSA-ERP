import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow, withKind, splitByKind } from './entityBackedShared';
import {
  InspectionNotice, VendorApplication, VendorOrderConfirm, DeliveryShipment,
  VendorQualityIssue, VendorImprovementReport, VendorStatement, VendorInvoiceRequest,
} from '@/types';
import {
  inspectionNotices as mockInspectionNotices,
  vendorApplications as mockVendorApplications,
  vendorOrderConfirms as mockVendorOrderConfirms,
  deliveryShipments as mockDeliveryShipments,
  vendorQualityIssues as mockVendorQualityIssues,
  vendorImprovementReports as mockVendorImprovementReports,
  vendorStatements as mockVendorStatements,
  vendorInvoiceRequests as mockVendorInvoiceRequests,
} from '@/mocks/data/flowData';

interface FlowState {
  inspectionNotices: InspectionNotice[];
  vendorApplications: VendorApplication[];
  vendorOrderConfirms: VendorOrderConfirm[];
  deliveryShipments: DeliveryShipment[];
  vendorQualityIssues: VendorQualityIssue[];
  vendorImprovementReports: VendorImprovementReport[];
  vendorStatements: VendorStatement[];
  vendorInvoiceRequests: VendorInvoiceRequest[];

  // InspectionNotice
  addInspectionNotice: (n: InspectionNotice) => void;
  updateInspectionNotice: (id: string, updates: Partial<InspectionNotice>) => void;
  deleteInspectionNotice: (id: string) => void;

  // VendorApplication
  addVendorApplication: (a: VendorApplication) => void;
  updateVendorApplication: (id: string, updates: Partial<VendorApplication>) => void;
  deleteVendorApplication: (id: string) => void;

  // VendorOrderConfirm
  addVendorOrderConfirm: (c: VendorOrderConfirm) => void;
  updateVendorOrderConfirm: (id: string, updates: Partial<VendorOrderConfirm>) => void;
  deleteVendorOrderConfirm: (id: string) => void;

  // DeliveryShipment
  addDeliveryShipment: (s: DeliveryShipment) => void;
  updateDeliveryShipment: (id: string, updates: Partial<DeliveryShipment>) => void;
  deleteDeliveryShipment: (id: string) => void;

  // VendorQualityIssue
  addVendorQualityIssue: (i: VendorQualityIssue) => void;
  updateVendorQualityIssue: (id: string, updates: Partial<VendorQualityIssue>) => void;
  deleteVendorQualityIssue: (id: string) => void;

  // VendorImprovementReport
  addVendorImprovementReport: (r: VendorImprovementReport) => void;
  updateVendorImprovementReport: (id: string, updates: Partial<VendorImprovementReport>) => void;
  deleteVendorImprovementReport: (id: string) => void;

  // VendorStatement
  addVendorStatement: (s: VendorStatement) => void;
  updateVendorStatement: (id: string, updates: Partial<VendorStatement>) => void;
  deleteVendorStatement: (id: string) => void;

  // VendorInvoiceRequest
  addVendorInvoiceRequest: (r: VendorInvoiceRequest) => void;
  updateVendorInvoiceRequest: (id: string, updates: Partial<VendorInvoiceRequest>) => void;
  deleteVendorInvoiceRequest: (id: string) => void;

  /** V3.80.0：从 D1 水合 8 切片 */
  hydrateFlow: () => Promise<void>;
}

// V3.80.0：8 切片共用一张 flow_shared 表（__kind 标记分流），行主键 = 各对象 id。
const RES = 'flowShared';

/** 通用切片 CRUD：add/update/delete 均本地乐观更新 + 登录态写穿 D1（带 __kind） */
const sliceOps =
  <T extends { id: string }>(key: keyof FlowState, kind: string) =>
  (set: (fn: (s: FlowState) => Partial<FlowState>) => void, get: () => FlowState) => ({
    add: (item: T) => {
      set((s) => ({ [key]: [...(s[key] as unknown as T[]), item] } as unknown as Partial<FlowState>));
      if (isAuthed()) writeRow(RES, item.id, withKind(kind, item));
    },
    update: (id: string, u: Partial<T>) => {
      set((s) => ({ [key]: (s[key] as unknown as T[]).map((x) => (x.id === id ? { ...x, ...u } : x)) } as unknown as Partial<FlowState>));
      const merged = get()[key] as unknown as T[];
      const cur = merged.find((x) => x.id === id);
      if (cur && isAuthed()) writeRow(RES, id, withKind(kind, cur));
    },
    delete: (id: string) => {
      set((s) => ({ [key]: (s[key] as unknown as T[]).filter((x) => x.id !== id) } as unknown as Partial<FlowState>));
      if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
    },
  });

export const useFlowStore = create<FlowState>()((set, get) => {
  // 8 切片各走 sliceOps（__kind 标记 + 登录态写穿 D1 + 本地乐观更新）
  const insp = sliceOps<InspectionNotice>('inspectionNotices', 'inspectionNotice')(set, get);
  const va = sliceOps<VendorApplication>('vendorApplications', 'vendorApplication')(set, get);
  const voc = sliceOps<VendorOrderConfirm>('vendorOrderConfirms', 'vendorOrderConfirm')(set, get);
  const ds = sliceOps<DeliveryShipment>('deliveryShipments', 'deliveryShipment')(set, get);
  const vqi = sliceOps<VendorQualityIssue>('vendorQualityIssues', 'vendorQualityIssue')(set, get);
  const vir = sliceOps<VendorImprovementReport>('vendorImprovementReports', 'vendorImprovementReport')(set, get);
  const vs = sliceOps<VendorStatement>('vendorStatements', 'vendorStatement')(set, get);
  const virr = sliceOps<VendorInvoiceRequest>('vendorInvoiceRequests', 'vendorInvoiceRequest')(set, get);

  return {
    inspectionNotices: [...mockInspectionNotices],
    vendorApplications: [...mockVendorApplications],
    vendorOrderConfirms: [...mockVendorOrderConfirms],
    deliveryShipments: [...mockDeliveryShipments],
    vendorQualityIssues: [...mockVendorQualityIssues],
    vendorImprovementReports: [...mockVendorImprovementReports],
    vendorStatements: [...mockVendorStatements],
    vendorInvoiceRequests: [...mockVendorInvoiceRequests],

    // InspectionNotice
    addInspectionNotice: insp.add,
    updateInspectionNotice: insp.update,
    deleteInspectionNotice: insp.delete,

    // VendorApplication
    addVendorApplication: va.add,
    updateVendorApplication: va.update,
    deleteVendorApplication: va.delete,

    // VendorOrderConfirm
    addVendorOrderConfirm: voc.add,
    updateVendorOrderConfirm: voc.update,
    deleteVendorOrderConfirm: voc.delete,

    // DeliveryShipment
    addDeliveryShipment: ds.add,
    updateDeliveryShipment: ds.update,
    deleteDeliveryShipment: ds.delete,

    // VendorQualityIssue
    addVendorQualityIssue: vqi.add,
    updateVendorQualityIssue: vqi.update,
    deleteVendorQualityIssue: vqi.delete,

    // VendorImprovementReport
    addVendorImprovementReport: vir.add,
    updateVendorImprovementReport: vir.update,
    deleteVendorImprovementReport: vir.delete,

    // VendorStatement
    addVendorStatement: vs.add,
    updateVendorStatement: vs.update,
    deleteVendorStatement: vs.delete,

    // VendorInvoiceRequest
    addVendorInvoiceRequest: virr.add,
    updateVendorInvoiceRequest: virr.update,
    deleteVendorInvoiceRequest: virr.delete,

    hydrateFlow: async () => {
      if (!isAuthed()) return;
      try {
        const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
        const rows = parsePayload(res?.data || []);
        if (rows.length) {
          set({
            inspectionNotices: splitByKind<InspectionNotice>(rows, 'inspectionNotice'),
            vendorApplications: splitByKind<VendorApplication>(rows, 'vendorApplication'),
            vendorOrderConfirms: splitByKind<VendorOrderConfirm>(rows, 'vendorOrderConfirm'),
            deliveryShipments: splitByKind<DeliveryShipment>(rows, 'deliveryShipment'),
            vendorQualityIssues: splitByKind<VendorQualityIssue>(rows, 'vendorQualityIssue'),
            vendorImprovementReports: splitByKind<VendorImprovementReport>(rows, 'vendorImprovementReport'),
            vendorStatements: splitByKind<VendorStatement>(rows, 'vendorStatement'),
            vendorInvoiceRequests: splitByKind<VendorInvoiceRequest>(rows, 'vendorInvoiceRequest'),
          });
        }
      } catch {
        // 离线/异常：保留本地态（含种子）
      }
    },
  };
});

// 模块加载即自动水合（未登录/离线静默兜底）
void useFlowStore.getState().hydrateFlow();
