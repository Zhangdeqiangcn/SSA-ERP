import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow, withKind, splitByKind } from './entityBackedShared';
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

const RES = 'lowCodeShared';
const KIND_DEF = 'formDefinition';
const KIND_REC = 'formRecord';

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

/** 双切片写穿（__kind 标记，行主键 = 各对象 id） */
const pushDef = (f: LowCodeForm) => isAuthed() && writeRow(RES, f.id, withKind(KIND_DEF, f));
const pushRec = (r: LowCodeRecord) => isAuthed() && writeRow(RES, r.id, withKind(KIND_REC, r));

export const useLowCodeStore = create<LowCodeState>()(
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
      addFormDefinition: (form) => {
        const rec: LowCodeForm = { ...form, id: uid('lc'), createdAt: today(), updatedAt: today() };
        set((s) => ({ formDefinitions: [...s.formDefinitions, rec] }));
        pushDef(rec);
      },
      updateFormDefinition: (id, patch) => {
        let updated: LowCodeForm | undefined;
        set((s) => ({
          formDefinitions: s.formDefinitions.map((f) => {
            if (f.id !== id) return f;
            updated = { ...f, ...patch, updatedAt: today() };
            return updated;
          }),
        }));
        if (updated) pushDef(updated);
      },
      deleteFormDefinition: (id) => {
        set((s) => ({ formDefinitions: s.formDefinitions.filter((f) => f.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },
      submitForm: (formId, data) => {
        set((s) => {
          const form = s.formDefinitions.find((f) => f.id === formId);
          const rec: LowCodeRecord = {
            id: uid('lcr'),
            formId,
            formName: form?.name,
            data,
            createdAt: today(),
          };
          pushRec(rec);
          return { formRecords: [...s.formRecords, rec] };
        });
      },
      deleteRecord: (id) => {
        set((s) => ({ formRecords: s.formRecords.filter((r) => r.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },
    }),
);

// ── V3.81.0 D1 同步层：双切片（formDefinitions + formRecords）挂载水合 ──
let hydrating = false;
async function hydrateLowCode() {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
    const rows = parsePayload(res?.data || []);
    if (rows.length) {
      useLowCodeStore.setState({
        formDefinitions: splitByKind<LowCodeForm>(rows, KIND_DEF),
        formRecords: splitByKind<LowCodeRecord>(rows, KIND_REC),
      });
    }
  } catch {
    /* 离线/异常：保留本地态 */
  } finally {
    hydrating = false;
  }
}

void hydrateLowCode();
