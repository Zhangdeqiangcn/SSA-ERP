import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';

/**
 * 统一编号规则中心（C3 核心之一）
 * ------------------------------------------------------------
 * 替代此前散落在各业务模块里的硬编码编号（PO${Date.now()} / WO${ymd}${rand} 等），
 * 集中维护所有单据类型的「前缀 + 日期格式 + 序号位数 + 当前序号」，并提供统一的
 * nextNo / previewNext / updateRule / resetSeq。
 *
 * 业务接入约定：
 *   - 标准工单（WorkOrderList 新建）与采购订单（OrderForm）接入 nextNo；
 *   - MTO / MRP 工单保留特殊前缀（WO-MTO- / WO-MRP-），不纳入统一规则，避免破坏既有联动。
 */

export type DocType =
  | 'PO' | 'SO' | 'WO' | 'PR' | 'IN' | 'OUT' | 'FG' | 'QC' | 'MRP';

export type DatePattern = 'none' | 'YYYY' | 'YYYYMM' | 'YYYYMMDD';

export interface NumberingRule {
  docType: DocType;
  prefix: string;       // 业务前缀，如 WO / PO
  separator: string;    // 各段之间的分隔符，如 '-'
  datePattern: DatePattern;
  seqLength: number;    // 序号位数（不足前补 0）
  currentSeq: number;   // 当前序号（nextNo 时 +1）
  label: string;        // 中文名，展示用
}

const datePart = (pattern: DatePattern): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  switch (pattern) {
    case 'YYYY': return String(y);
    case 'YYYYMM': return `${y}${m}`;
    case 'YYYYMMDD': return `${y}${m}${day}`;
    default: return '';
  }
};

const formatNo = (rule: NumberingRule, seq: number): string => {
  const seqStr = seq.toString().padStart(rule.seqLength, '0');
  const dp = datePart(rule.datePattern);
  // 段间统一用 separator：prefix + sep + date + sep + seq
  // 例：WO + - + 2026 + - + 0001 => WO-2026-0001
  if (!dp) return `${rule.prefix}${rule.separator}${seqStr}`;
  return `${rule.prefix}${rule.separator}${dp}${rule.separator}${seqStr}`;
};

const seedRules: Record<DocType, NumberingRule> = {
  PO:  { docType: 'PO',  prefix: 'PO',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '采购订单' },
  SO:  { docType: 'SO',  prefix: 'SO',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '销售订单' },
  WO:  { docType: 'WO',  prefix: 'WO',  separator: '-', datePattern: 'YYYY',     seqLength: 4, currentSeq: 0,  label: '生产工单' },
  PR:  { docType: 'PR',  prefix: 'PR',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '采购申请' },
  IN:  { docType: 'IN',  prefix: 'IN',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '入库单' },
  OUT: { docType: 'OUT', prefix: 'OUT', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '出库单' },
  FG:  { docType: 'FG',  prefix: 'FG',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '成品入库' },
  QC:  { docType: 'QC',  prefix: 'QC',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '质检单' },
  MRP: { docType: 'MRP', prefix: 'MRP', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: 'MRP计划' },
};

export const DOC_TYPES = Object.keys(seedRules) as DocType[];

interface NumberingState {
  rules: Record<DocType, NumberingRule>;
  /** 生成下一个编号并自增序号（会持久化） */
  nextNo: (docType: DocType) => string;
  /** 预览下一个编号（不改变序号） */
  previewNext: (docType: DocType) => string;
  /** 修改某单据规则（prefix / separator / datePattern / seqLength） */
  updateRule: (docType: DocType, partial: Partial<NumberingRule>) => void;
  /** 重置某单据当前序号为 0 */
  resetSeq: (docType: DocType) => void;
  resetAll: () => void;
}

export const useNumberingStore = create<NumberingState>()(
  persist(
    (set, get) => ({
      rules: { ...seedRules },

      nextNo: (docType) => {
        const rule = get().rules[docType];
        const seq = rule.currentSeq + 1;
        const no = formatNo(rule, seq);
        set((s) => ({
          rules: { ...s.rules, [docType]: { ...rule, currentSeq: seq } },
        }));
        return no;
      },

      previewNext: (docType) => {
        const rule = get().rules[docType];
        return formatNo(rule, rule.currentSeq + 1);
      },

      updateRule: (docType, partial) =>
        set((s) => ({
          rules: {
            ...s.rules,
            [docType]: { ...s.rules[docType], ...partial, docType },
          },
        })),

      resetSeq: (docType) =>
        set((s) => ({
          rules: { ...s.rules, [docType]: { ...s.rules[docType], currentSeq: 0 } },
        })),

      resetAll: () => set({ rules: { ...seedRules } }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-numbering',
      version: 1,
      partialize: (state) => ({ rules: state.rules }),
    }
  )
);
