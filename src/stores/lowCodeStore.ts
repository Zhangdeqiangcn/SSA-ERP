import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import type { LowCodeForm, LowCodeRecord, LowCodeField } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

interface LowCodeState {
  formDefinitions: LowCodeForm[];
  formRecords: LowCodeRecord[];
  addFormDefinition: (form: Omit<LowCodeForm, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFormDefinition: (id: string, patch: Partial<Omit<LowCodeForm, 'id' | 'createdAt'>>) => void;
  deleteFormDefinition: (id: string) => void;
  submitForm: (formId: string, data: Record<string, unknown>) => void;
  deleteRecord: (id: string) => void;
}

const seedForm: LowCodeForm = {
  id: 'lc-seed-1',
  name: '客户回访单',
  description: '低代码示例：客户回访信息登记',
  fields: [
    { key: 'customer', label: '客户名称', type: 'text', required: true },
    { key: 'score', label: '满意度评分', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { key: 'visitDate', label: '回访日期', type: 'date' },
    { key: 'note', label: '备注', type: 'textarea' },
  ],
  createdAt: today(),
  updatedAt: today(),
};

export const useLowCodeStore = create<LowCodeState>()(
  persist(
    (set) => ({
      formDefinitions: [seedForm],
      formRecords: [
        {
          id: 'lcr-seed-1',
          formId: 'lc-seed-1',
          formName: '客户回访单',
          data: { customer: '示例客户A', score: '5', visitDate: today(), note: '满意' },
          createdAt: today(),
        },
      ],
      addFormDefinition: (form) =>
        set((s) => ({
          formDefinitions: [
            ...s.formDefinitions,
            { ...form, id: uid('lc'), createdAt: today(), updatedAt: today() },
          ],
        })),
      updateFormDefinition: (id, patch) =>
        set((s) => ({
          formDefinitions: s.formDefinitions.map((f) =>
            f.id === id ? { ...f, ...patch, updatedAt: today() } : f,
          ),
        })),
      deleteFormDefinition: (id) =>
        set((s) => ({ formDefinitions: s.formDefinitions.filter((f) => f.id !== id) })),
      submitForm: (formId, data) =>
        set((s) => {
          const form = s.formDefinitions.find((f) => f.id === formId);
          return {
            formRecords: [
              ...s.formRecords,
              {
                id: uid('lcr'),
                formId,
                formName: form?.name,
                data,
                createdAt: today(),
              },
            ],
          };
        }),
      deleteRecord: (id) =>
        set((s) => ({ formRecords: s.formRecords.filter((r) => r.id !== id) })),
    }),
    { storage: backendStorage,
     name: 'ssa-erp-lowcode' },
  ),
);
