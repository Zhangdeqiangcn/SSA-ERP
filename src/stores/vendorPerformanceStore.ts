import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { VendorPerformance } from '@/types';

interface VendorPerformanceState {
  records: VendorPerformance[];
  addRecord: (record: VendorPerformance) => void;
  updateRecord: (id: string, patch: Partial<VendorPerformance>) => void;
  deleteRecord: (id: string) => void;
  /** 按权重重新计算所有记录的总分和排名，默认权重 30/30/25/15 */
  calculateScore: (
    qualityWeight?: number,
    deliveryWeight?: number,
    priceWeight?: number,
    serviceWeight?: number
  ) => void;
}

const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

/** 计算排名：totalScore>=90→A, >=75→B, >=60→C, <60→D */
function computeRanking(totalScore: number): string {
  if (totalScore >= 90) return 'A';
  if (totalScore >= 75) return 'B';
  if (totalScore >= 60) return 'C';
  return 'D';
}

const seedRecords: VendorPerformance[] = [
  {
    id: 'perf-001',
    vendorId: 'cus-001',
    vendorName: '华润建筑',
    period: '2026-Q3',
    qualityScore: 88,
    deliveryScore: 92,
    priceScore: 80,
    serviceScore: 85,
    totalScore: 88 * 0.3 + 92 * 0.3 + 80 * 0.25 + 85 * 0.15, // 26.4+27.6+20+12.75 = 86.75
    ranking: 'B',
    remarks: '',
    evaluatedBy: '采购部主管',
    evaluatedAt: now,
    createdAt: now,
  },
  {
    id: 'perf-002',
    vendorId: 'cus-002',
    vendorName: '长江船舶',
    period: '2026-Q3',
    qualityScore: 75,
    deliveryScore: 70,
    priceScore: 65,
    serviceScore: 72,
    totalScore: 75 * 0.3 + 70 * 0.3 + 65 * 0.25 + 72 * 0.15, // 22.5+21+16.25+10.8 = 70.55
    ranking: 'C',
    remarks: '',
    evaluatedBy: '采购部主管',
    evaluatedAt: now,
    createdAt: now,
  },
  {
    id: 'perf-003',
    vendorId: 'cus-003',
    vendorName: '新源机械',
    period: '2026-Q3',
    qualityScore: 92,
    deliveryScore: 95,
    priceScore: 88,
    serviceScore: 90,
    totalScore: 92 * 0.3 + 95 * 0.3 + 88 * 0.25 + 90 * 0.15, // 27.6+28.5+22+13.5 = 91.6
    ranking: 'A',
    remarks: '',
    evaluatedBy: '采购部主管',
    evaluatedAt: now,
    createdAt: now,
  },
];

export const useVendorPerformanceStore = create<VendorPerformanceState>()(
  persist(
    (set) => ({
      records: [...seedRecords],

      addRecord: (record) => set((state) => ({ records: [record, ...state.records] })),

      updateRecord: (id, patch) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        })),

      deleteRecord: (id) =>
        set((state) => ({ records: state.records.filter((r) => r.id !== id) })),

      calculateScore: (
        qualityWeight = 30,
        deliveryWeight = 30,
        priceWeight = 25,
        serviceWeight = 15
      ) =>
        set((state) => {
          const qw = qualityWeight / 100;
          const dw = deliveryWeight / 100;
          const pw = priceWeight / 100;
          const sw = serviceWeight / 100;
          const records = state.records.map((r) => {
            const totalScore = Math.round(
              (r.qualityScore * qw + r.deliveryScore * dw + r.priceScore * pw + r.serviceScore * sw) * 100
            ) / 100;
            return { ...r, totalScore, ranking: computeRanking(totalScore) };
          });
          return { records };
        }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-vendor-performance',
      version: 1,
      partialize: (state) => ({ records: state.records }),
    }
  )
);
