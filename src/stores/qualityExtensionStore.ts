import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EightDRecord, SpcChart, LabEquipment } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (base: string, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

interface QualityExtensionState {
  eightDRecords: EightDRecord[];
  spcCharts: SpcChart[];
  labEquipments: LabEquipment[];

  // 8D
  addEightD: (r: EightDRecord) => void;
  updateEightD: (id: string, u: Partial<EightDRecord>) => void;
  deleteEightD: (id: string) => void;
  closeEightD: (id: string, d8?: string) => void;

  // SPC
  addSpcChart: (c: SpcChart) => void;
  updateSpcChart: (id: string, u: Partial<SpcChart>) => void;
  deleteSpcChart: (id: string) => void;

  // 实验室 / 检验设备
  addLabEquipment: (e: LabEquipment) => void;
  updateLabEquipment: (id: string, u: Partial<LabEquipment>) => void;
  deleteLabEquipment: (id: string) => void;
  calibrateEquipment: (id: string, date: string) => void;
}

const seedLab: LabEquipment[] = [
  {
    id: 'lab-seed-1', equipmentNo: 'LAB-CAL-001', name: '数显千分尺', type: 'gauge', model: '293-240',
    manufacturer: 'Mitutoyo', location: '计量室', custodian: '李计量', calibrationCycleDays: 180,
    lastCalibrationDate: addDays(today(), -185), nextCalibrationDate: addDays(today(), -5), status: 'in_use',
    accuracy: '±0.001mm', createdAt: today(), updatedAt: today(), createdBy: '质量部', updatedBy: '质量部',
  },
  {
    id: 'lab-seed-2', equipmentNo: 'LAB-CMM-002', name: '三坐标测量机', type: 'cmm', model: 'EXPLORER',
    manufacturer: 'HEXAGON', location: '精测间', custodian: '王精测', calibrationCycleDays: 365,
    lastCalibrationDate: addDays(today(), -30), nextCalibrationDate: addDays(today(), 335), status: 'in_use',
    accuracy: '±1.5μm', createdAt: today(), updatedAt: today(), createdBy: '质量部', updatedBy: '质量部',
  },
];

const seedSpc: SpcChart[] = [
  {
    id: 'spc-seed-1', name: '缸体孔径 SPC', characteristic: '缸体孔径', unit: 'mm', subgroupSize: 5,
    usl: 80.05, lsl: 79.95,
    subgroups: [
      { id: 'g1', label: 'G1', values: [80.01, 80.00, 79.99, 80.02, 80.00] },
      { id: 'g2', label: 'G2', values: [79.98, 80.01, 80.00, 79.99, 80.02] },
      { id: 'g3', label: 'G3', values: [80.03, 80.02, 80.01, 80.04, 80.00] },
      { id: 'g4', label: 'G4', values: [80.20, 80.18, 80.19, 80.21, 80.17] }, // 失控子组
      { id: 'g5', label: 'G5', values: [79.99, 80.00, 80.01, 79.98, 80.00] },
    ],
    createdAt: today(), updatedAt: today(), createdBy: '质量部', updatedBy: '质量部',
  },
];

const seed8D: EightDRecord[] = [
  {
    id: 'd8-seed-1', code: '8D-2026-001', title: '钢板表面划伤客诉', sourceType: 'customer_complaint',
    sourceNo: 'CUST-2026-0312', priority: 'high', status: 'in_progress', owner: '张质量',
    team: ['张质量', '李工艺', '王生产'], d0: '客户现场隔离在制品 200 件', d1: '成立专项小组',
    d2: '批次 STEEL-001 表面划伤率 3.2%', d3: '暂停发货并全检',
    dueDate: addDays(today(), 15), createdAt: today(), updatedAt: today(), createdBy: '质量部', updatedBy: '质量部',
  },
];

export const useQualityExtensionStore = create<QualityExtensionState>()(
  persist(
    (set) => ({
      eightDRecords: [...seed8D],
      spcCharts: [...seedSpc],
      labEquipments: [...seedLab],

      addEightD: (r) => set((s) => ({ eightDRecords: [...s.eightDRecords, r] })),
      updateEightD: (id, u) =>
        set((s) => ({ eightDRecords: s.eightDRecords.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteEightD: (id) => set((s) => ({ eightDRecords: s.eightDRecords.filter((x) => x.id !== id) })),
      closeEightD: (id, d8) =>
        set((s) => ({ eightDRecords: s.eightDRecords.map((x) => (x.id === id ? { ...x, status: 'closed', d8: d8 || x.d8, closedDate: today(), updatedAt: today(), updatedBy: '当前用户' } : x)) })),

      addSpcChart: (c) => set((s) => ({ spcCharts: [...s.spcCharts, c] })),
      updateSpcChart: (id, u) =>
        set((s) => ({ spcCharts: s.spcCharts.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteSpcChart: (id) => set((s) => ({ spcCharts: s.spcCharts.filter((x) => x.id !== id) })),

      addLabEquipment: (e) => set((s) => ({ labEquipments: [...s.labEquipments, e] })),
      updateLabEquipment: (id, u) =>
        set((s) => ({ labEquipments: s.labEquipments.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteLabEquipment: (id) => set((s) => ({ labEquipments: s.labEquipments.filter((x) => x.id !== id) })),
      calibrateEquipment: (id, date) =>
        set((s) => ({
          labEquipments: s.labEquipments.map((x) => {
            if (x.id !== id) return x;
            const next = addDays(date, x.calibrationCycleDays);
            return { ...x, lastCalibrationDate: date, nextCalibrationDate: next, status: 'in_use', updatedAt: today(), updatedBy: '当前用户' };
          }),
        })),
    }),
    {
      name: 'ssa-erp-quality-ext',
      version: 1,
      partialize: (state) => ({
        eightDRecords: state.eightDRecords,
        spcCharts: state.spcCharts,
        labEquipments: state.labEquipments,
      }),
    }
  )
);
