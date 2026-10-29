import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow, withKind, splitByKind } from './entityBackedShared';
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
  /** V3.80.0：从 D1 水合 */
  hydrateEquipment: () => Promise<void>;
}

const RES = 'equipmentLedger';
const KIND_EQ = 'equipment';
const KIND_MO = 'maintenanceOrder';

/** 写穿某切片某对象（打 __kind 标记落 payload，行主键 = 对象 id） */
const pushEq = (e: Equipment) => isAuthed() && writeRow(RES, e.id, withKind(KIND_EQ, e));
const pushMo = (m: MaintenanceOrder) => isAuthed() && writeRow(RES, m.id, withKind(KIND_MO, m));

export const useEquipmentStore = create<EquipmentState>()((set) => ({
  equipments: seedEquipments.map((e) => ({ ...e })),
  maintenanceOrders: seedMaintenance.map((m) => ({ ...m })),

  addEquipment: (e) => {
    set((s) => ({ equipments: [...s.equipments, e] }));
    pushEq(e);
  },
  updateEquipment: (id, patch) => {
    let updated: Equipment | undefined;
    set((s) => ({
      equipments: s.equipments.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch };
        return updated;
      }),
    }));
    if (updated) pushEq(updated);
  },
  deleteEquipment: (id) => {
    set((s) => ({ equipments: s.equipments.filter((e) => e.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  addMaintenance: (m) => {
    set((s) => ({ maintenanceOrders: [...s.maintenanceOrders, m] }));
    pushMo(m);
  },
  updateMaintenance: (id, patch) => {
    let updated: MaintenanceOrder | undefined;
    set((s) => ({
      maintenanceOrders: s.maintenanceOrders.map((m) => {
        if (m.id !== id) return m;
        updated = { ...m, ...patch };
        return updated;
      }),
    }));
    if (updated) pushMo(updated);
  },
  deleteMaintenance: (id) => {
    set((s) => ({ maintenanceOrders: s.maintenanceOrders.filter((m) => m.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  hydrateEquipment: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload(res?.data || []);
      if (rows.length) {
        set({
          equipments: splitByKind<Equipment>(rows, KIND_EQ),
          maintenanceOrders: splitByKind<MaintenanceOrder>(rows, KIND_MO),
        });
      }
    } catch {
      // 离线/异常：保留本地态（含种子）
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useEquipmentStore.getState().hydrateEquipment();
