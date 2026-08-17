import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
}

const addItem = <T,>(setter: (v: T[]) => void, list: T[], item: T) => [...list, item];
const updateItem = <T extends { id: string }>(setter: (v: T[]) => void, list: T[], id: string, updates: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...updates } : x));
const deleteItem = <T extends { id: string }>(setter: (v: T[]) => void, list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useFlowStore = create<FlowState>()(
  persist(
    (set) => ({
      inspectionNotices: [...mockInspectionNotices],
      vendorApplications: [...mockVendorApplications],
      vendorOrderConfirms: [...mockVendorOrderConfirms],
      deliveryShipments: [...mockDeliveryShipments],
      vendorQualityIssues: [...mockVendorQualityIssues],
      vendorImprovementReports: [...mockVendorImprovementReports],
      vendorStatements: [...mockVendorStatements],
      vendorInvoiceRequests: [...mockVendorInvoiceRequests],

      // InspectionNotice
      addInspectionNotice: (n) => set((s) => ({ inspectionNotices: addItem(set, s.inspectionNotices, n) })),
      updateInspectionNotice: (id, u) => set((s) => ({ inspectionNotices: updateItem(set, s.inspectionNotices, id, u) })),
      deleteInspectionNotice: (id) => set((s) => ({ inspectionNotices: deleteItem(set, s.inspectionNotices, id) })),

      // VendorApplication
      addVendorApplication: (a) => set((s) => ({ vendorApplications: addItem(set, s.vendorApplications, a) })),
      updateVendorApplication: (id, u) => set((s) => ({ vendorApplications: updateItem(set, s.vendorApplications, id, u) })),
      deleteVendorApplication: (id) => set((s) => ({ vendorApplications: deleteItem(set, s.vendorApplications, id) })),

      // VendorOrderConfirm
      addVendorOrderConfirm: (c) => set((s) => ({ vendorOrderConfirms: addItem(set, s.vendorOrderConfirms, c) })),
      updateVendorOrderConfirm: (id, u) => set((s) => ({ vendorOrderConfirms: updateItem(set, s.vendorOrderConfirms, id, u) })),
      deleteVendorOrderConfirm: (id) => set((s) => ({ vendorOrderConfirms: deleteItem(set, s.vendorOrderConfirms, id) })),

      // DeliveryShipment
      addDeliveryShipment: (ship) => set((s) => ({ deliveryShipments: addItem(set, s.deliveryShipments, ship) })),
      updateDeliveryShipment: (id, u) => set((s) => ({ deliveryShipments: updateItem(set, s.deliveryShipments, id, u) })),
      deleteDeliveryShipment: (id) => set((s) => ({ deliveryShipments: deleteItem(set, s.deliveryShipments, id) })),

      // VendorQualityIssue
      addVendorQualityIssue: (i) => set((s) => ({ vendorQualityIssues: addItem(set, s.vendorQualityIssues, i) })),
      updateVendorQualityIssue: (id, u) => set((s) => ({ vendorQualityIssues: updateItem(set, s.vendorQualityIssues, id, u) })),
      deleteVendorQualityIssue: (id) => set((s) => ({ vendorQualityIssues: deleteItem(set, s.vendorQualityIssues, id) })),

      // VendorImprovementReport
      addVendorImprovementReport: (r) => set((s) => ({ vendorImprovementReports: addItem(set, s.vendorImprovementReports, r) })),
      updateVendorImprovementReport: (id, u) => set((s) => ({ vendorImprovementReports: updateItem(set, s.vendorImprovementReports, id, u) })),
      deleteVendorImprovementReport: (id) => set((s) => ({ vendorImprovementReports: deleteItem(set, s.vendorImprovementReports, id) })),

      // VendorStatement
      addVendorStatement: (st) => set((s) => ({ vendorStatements: addItem(set, s.vendorStatements, st) })),
      updateVendorStatement: (id, u) => set((s) => ({ vendorStatements: updateItem(set, s.vendorStatements, id, u) })),
      deleteVendorStatement: (id) => set((s) => ({ vendorStatements: deleteItem(set, s.vendorStatements, id) })),

      // VendorInvoiceRequest
      addVendorInvoiceRequest: (r) => set((s) => ({ vendorInvoiceRequests: addItem(set, s.vendorInvoiceRequests, r) })),
      updateVendorInvoiceRequest: (id, u) => set((s) => ({ vendorInvoiceRequests: updateItem(set, s.vendorInvoiceRequests, id, u) })),
      deleteVendorInvoiceRequest: (id) => set((s) => ({ vendorInvoiceRequests: deleteItem(set, s.vendorInvoiceRequests, id) })),
    }),
    {
      name: 'ssa-erp-flow',
      version: 1,
      partialize: (state) => ({
        inspectionNotices: state.inspectionNotices,
        vendorApplications: state.vendorApplications,
        vendorOrderConfirms: state.vendorOrderConfirms,
        deliveryShipments: state.deliveryShipments,
        vendorQualityIssues: state.vendorQualityIssues,
        vendorImprovementReports: state.vendorImprovementReports,
        vendorStatements: state.vendorStatements,
        vendorInvoiceRequests: state.vendorInvoiceRequests,
      }),
    }
  )
);
