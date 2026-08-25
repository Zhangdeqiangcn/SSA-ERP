import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { Equipment, MaintenanceOrder } from '@/types/production';

const STORE_KEY = 'ssa-erp-equipment';

const seedEquipments: Equipment[] = [
  {
    id: 'eq-001',
    code: 'EQ-CUT-01',
    name: '激光切割机 #1',
    category: 'machine',
    workCenterId: 'wc-cut',
    workCenterName: '切割中心',
    status: 'in_use',
    nextMaintenanceDate: '2026-08-01',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'eq-002',
    code: 'EQ-MOLD-01',
    name: '焊接夹具 A型',
    category: 'mold',
    workCenterId: 'wc-weld',
    workCenterName: '焊接中心',
    status: 'in_use',
    nextMaintenanceDate: '2026-07-25',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
];

const seedMaintenance: MaintenanceOrder[] = [
  {
    id: 'mo-001',
    equipmentId: 'eq-001',
    equipmentName: '激光切割机 #1',
    equipmentCode: 'EQ-CUT-01',
    type: '日常保养',
    date: '2026-07-01',
    cost: 300,
    status: 'done',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
];

interface EquipmentState {
  equipments: Equipment[];
  maintenanceOrders: MaintenanceOrder[];
  addEquipment: (e: Equipment) => void;
  updateEquipment: (id: string, patch: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  addMaintenance: (m: MaintenanceOrder) => void;
  updateMaintenance: (id: string, patch: Partial<MaintenanceOrder>) => void;
  deleteMaintenance: (id: string) => void;
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set) => ({
      equipments: seedEquipments.map((e) => ({ ...e })),
      maintenanceOrders: seedMaintenance.map((m) => ({ ...m })),
      addEquipment: (e) => set((s) => ({ equipments: [...s.equipments, e] })),
      updateEquipment: (id, patch) =>
        set((s) => ({ equipments: s.equipments.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteEquipment: (id) => set((s) => ({ equipments: s.equipments.filter((e) => e.id !== id) })),
      addMaintenance: (m) => set((s) => ({ maintenanceOrders: [...s.maintenanceOrders, m] })),
      updateMaintenance: (id, patch) =>
        set((s) => ({
          maintenanceOrders: s.maintenanceOrders.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteMaintenance: (id) =>
        set((s) => ({ maintenanceOrders: s.maintenanceOrders.filter((m) => m.id !== id) })),
    }),
    { storage: backendStorage,
    
      name: STORE_KEY,
      version: 1,
      partialize: (state) => ({ equipments: state.equipments, maintenanceOrders: state.maintenanceOrders }),
    },
  ),
);
