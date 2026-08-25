import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
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

const addItem = <T,>(list: T[], item: T) => [...list, item];
const updateItem = <T extends { id: string }>(list: T[], id: string, updates: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...updates } : x));
const deleteItem = <T extends { id: string }>(list: T[], id: string) =>
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
      addInspectionNotice: (n) => set((s) => ({ inspectionNotices: addItem(s.inspectionNotices, n) })),
      updateInspectionNotice: (id, u) => set((s) => ({ inspectionNotices: updateItem(s.inspectionNotices, id, u) })),
      deleteInspectionNotice: (id) => set((s) => ({ inspectionNotices: deleteItem(s.inspectionNotices, id) })),

      // VendorApplication
      addVendorApplication: (a) => set((s) => ({ vendorApplications: addItem(s.vendorApplications, a) })),
      updateVendorApplication: (id, u) => set((s) => ({ vendorApplications: updateItem(s.vendorApplications, id, u) })),
      deleteVendorApplication: (id) => set((s) => ({ vendorApplications: deleteItem(s.vendorApplications, id) })),

      // VendorOrderConfirm
      addVendorOrderConfirm: (c) => set((s) => ({ vendorOrderConfirms: addItem(s.vendorOrderConfirms, c) })),
      updateVendorOrderConfirm: (id, u) => set((s) => ({ vendorOrderConfirms: updateItem(s.vendorOrderConfirms, id, u) })),
      deleteVendorOrderConfirm: (id) => set((s) => ({ vendorOrderConfirms: deleteItem(s.vendorOrderConfirms, id) })),

      // DeliveryShipment
      addDeliveryShipment: (ship) => set((s) => ({ deliveryShipments: addItem(s.deliveryShipments, ship) })),
      updateDeliveryShipment: (id, u) => set((s) => ({ deliveryShipments: updateItem(s.deliveryShipments, id, u) })),
      deleteDeliveryShipment: (id) => set((s) => ({ deliveryShipments: deleteItem(s.deliveryShipments, id) })),

      // VendorQualityIssue
      addVendorQualityIssue: (i) => set((s) => ({ vendorQualityIssues: addItem(s.vendorQualityIssues, i) })),
      updateVendorQualityIssue: (id, u) => set((s) => ({ vendorQualityIssues: updateItem(s.vendorQualityIssues, id, u) })),
      deleteVendorQualityIssue: (id) => set((s) => ({ vendorQualityIssues: deleteItem(s.vendorQualityIssues, id) })),

      // VendorImprovementReport
      addVendorImprovementReport: (r) => set((s) => ({ vendorImprovementReports: addItem(s.vendorImprovementReports, r) })),
      updateVendorImprovementReport: (id, u) => set((s) => ({ vendorImprovementReports: updateItem(s.vendorImprovementReports, id, u) })),
      deleteVendorImprovementReport: (id) => set((s) => ({ vendorImprovementReports: deleteItem(s.vendorImprovementReports, id) })),

      // VendorStatement
      addVendorStatement: (st) => set((s) => ({ vendorStatements: addItem(s.vendorStatements, st) })),
      updateVendorStatement: (id, u) => set((s) => ({ vendorStatements: updateItem(s.vendorStatements, id, u) })),
      deleteVendorStatement: (id) => set((s) => ({ vendorStatements: deleteItem(s.vendorStatements, id) })),

      // VendorInvoiceRequest
      addVendorInvoiceRequest: (r) => set((s) => ({ vendorInvoiceRequests: addItem(s.vendorInvoiceRequests, r) })),
      updateVendorInvoiceRequest: (id, u) => set((s) => ({ vendorInvoiceRequests: updateItem(s.vendorInvoiceRequests, id, u) })),
      deleteVendorInvoiceRequest: (id) => set((s) => ({ vendorInvoiceRequests: deleteItem(s.vendorInvoiceRequests, id) })),
    }),
    { storage: backendStorage,
    
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
