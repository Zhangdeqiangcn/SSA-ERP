import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow } from './entityBackedShared';

/**
 * 数电票核验台账 — V2.73
 * ------------------------------------------------------------
 * 核验结果原先只存在于页面 state：刷新即丢、无法追溯、无法复查历史。
 * 本 store 把每次核验沉淀为一个「批次」，支持：
 * - 历史批次回溯（张数/通过/不通过/异常 + 明细）
 * - 与发票 OCR 联动（OCR 识别结果可一键送入核验队列）
 * - 导出（CSV/Excel）
 *
 * 注意：后端 /api/tax-gateway/verify 当前为演示实现（etoplive 第三方待接密钥），
 * 因此核验结果为演示口径，正式环境接入第三方后本台账结构不变。
 *
 * persist key = ssa-erp-invoice-verify。
 */

export type VerifyStatus = 'valid' | 'invalid' | 'not_found' | 'error';

export interface VerifyRow {
  invoiceNo: string;
  type: string;
  isValid: boolean;
  status: VerifyStatus;
  message?: string;
  invoiceDate?: string;
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  sellerName?: string;
  buyerName?: string;
  checkedAt: string;
}

export interface VerifyBatch {
  id: string;
  createdAt: string;
  /** 来源：手工/CSV/剪贴板录入 = manual；OCR 识别送入 = ocr */
  source: 'manual' | 'ocr';
  count: number;
  valid: number;
  invalid: number;
  error: number;
  rows: VerifyRow[];
}

/** OCR 页送入核验队列的发票条目（与核验页录入表单同构） */
export interface OcrQueueItem {
  type: string;
  code?: string;
  number: string;
  date: string;
  amount: string;
  checkCode?: string;
  totalAmount?: string;
}

const MAX_BATCHES = 50;

interface InvoiceVerificationState {
  batches: VerifyBatch[];
  /** OCR → 核验 的待载入队列（纯内存，刷新即清，不上云） */
  ocrQueue: OcrQueueItem[];
  addBatch: (rows: VerifyRow[], source?: 'manual' | 'ocr') => VerifyBatch;
  removeBatch: (id: string) => void;
  clearBatches: () => void;
  pushOcrQueue: (items: OcrQueueItem[]) => void;
  takeOcrQueue: () => OcrQueueItem[];
  clearOcrQueue: () => void;
  /** V3.80.0：从 D1 水合 */
  hydrateInvoiceVerification: () => Promise<void>;
}

const RES = 'invoiceVerification';

export const useInvoiceVerificationStore = create<InvoiceVerificationState>()(
    (set, get) => ({
      batches: [],
      ocrQueue: [],
      addBatch: (rows, source = 'manual') => {
        const batch: VerifyBatch = {
          id: `VB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          source,
          count: rows.length,
          valid: rows.filter((r) => r.isValid).length,
          invalid: rows.filter((r) => r.status === 'invalid' || r.status === 'not_found').length,
          error: rows.filter((r) => r.status === 'error').length,
          rows,
        };
        set((s) => ({ batches: [batch, ...s.batches].slice(0, MAX_BATCHES) }));
        if (isAuthed()) writeRow(RES, batch.id, batch);
        return batch;
      },
      removeBatch: (id) => {
        set((s) => ({ batches: s.batches.filter((b) => b.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },
      clearBatches: () => {
        set({ batches: [] });
        if (isAuthed()) void entityRepo.list(RES, { page: 1, pageSize: 500 }).then((r: any) => (r?.data || []).forEach((row: any) => entityRepo.remove(RES, String(row?.id)).catch(() => {}))).catch(() => {});
      },
      pushOcrQueue: (items) =>
        set((s) => ({ ocrQueue: [...s.ocrQueue, ...items].slice(-100) })),
      takeOcrQueue: () => {
        const q = get().ocrQueue;
        if (q.length > 0) set({ ocrQueue: [] });
        return q;
      },
      clearOcrQueue: () => set({ ocrQueue: [] }),
      hydrateInvoiceVerification: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<VerifyBatch>(RES, { page: 1, pageSize: 500 });
          const rows = parsePayload<VerifyBatch>(res?.data || []);
          if (rows.length) set({ batches: rows });
        } catch {
          // 离线/异常：保留本地态
        }
      },
    }),
);

// 模块加载即自动水合（未登录/离线静默兜底）
void useInvoiceVerificationStore.getState().hydrateInvoiceVerification();
