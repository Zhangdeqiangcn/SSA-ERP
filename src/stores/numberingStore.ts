import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
// V3.68.0 立项③ 多组织编号隔离：取号规则按「会话组织 + 单据类型」复合键隔离
import { useAuthStore } from './authStore';
import { isAuthed } from '@/services/b2Api';

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
  | 'PO' | 'SO' | 'WO' | 'PR' | 'IN' | 'OUT' | 'FG' | 'QC' | 'MRP'
  | 'TPS' | 'ACC'
  | 'SOP' | 'BI' | 'ESG';

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
  TPS: { docType: 'TPS', prefix: 'TPS', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '三方销售单' },
  ACC: { docType: 'ACC', prefix: 'ACC', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0,  label: '资金账户' },
  SOP: { docType: 'SOP', prefix: 'SOP', separator: '-', datePattern: 'YYYYMM', seqLength: 4, currentSeq: 0, label: 'S&OP计划' },
  BI:  { docType: 'BI',  prefix: 'BI',  separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0, label: 'BI连接' },
  ESG: { docType: 'ESG', prefix: 'ESG', separator: '-', datePattern: 'YYYYMMDD', seqLength: 4, currentSeq: 0, label: 'ESG报告' },
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
  /** V3.66.0 P0-2：启动时从 D1 numbering_rules 水合（主源 = D1，本地 Blob 降为离线兜底） */
  hydrateNumbering: () => Promise<void>;
}

// V3.68.0 立项③ 多组织编号隔离：自然键 id 从裸 docType 升级为「会话组织::docType」
// 复合键（与服务端 functions/_shared/numbering.ts 的 ruleKey 严格一致，迁移 0097 把
// 旧格式行改名为 org::docType）。组织前缀取 **authStore 会话组织**（= 服务端会话
// user.org_id，即 entityRepo 写 org_id 列的同源值），不用多组织切换器 useOrgStore 的
// 演示种子值（ORG-001 等与生产 org_xxx 不一致，混用会造成 id 前缀与 org_id 列错位）。
// 会话组织未知（token 已持久化但 currentUser 尚未水合等时序窗口）返回 null → 调用方
// 跳过 D1 写（宁可漏写一次、下次取号补写，绝不用错前缀污染编号表产生双行）。
const currentOrgId = (): string | null => useAuthStore.getState().currentUser?.org_id || null;
/** 多组织复合自然键（org::docType）；会话组织未知 → null */
const ruleKey = (docType: string): string | null => {
  const orgId = currentOrgId();
  return orgId ? `${orgId}::${docType}` : null;
};

const packRule = (docType: DocType, r: NumberingRule) => ({
  id: ruleKey(docType) ?? `dev::${docType}`, docType, prefix: r.prefix, separator: r.separator,
  datePattern: r.datePattern, seqLength: r.seqLength, currentSeq: r.currentSeq, label: r.label,
});

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
        // V3.66.0 P0-2 + V3.68.0 立项③：序号自增同步 D1（多终端不漂移；多组织按 org::docType 隔离）。
        // 仅登录态下写 D1（未登录演示态无会话组织，写会 401，纯本地不阻断）；复合键 update 失败回退 create。
        if (isAuthed()) {
          const key = ruleKey(docType);
          if (key) entityRepo.update('numberingRule', key, { currentSeq: seq })
            .catch(() => entityRepo.create('numberingRule', packRule(docType, { ...rule, currentSeq: seq })).catch(() => {}));
        }
        return no;
      },

      previewNext: (docType) => {
        const rule = get().rules[docType];
        return formatNo(rule, rule.currentSeq + 1);
      },

      updateRule: (docType, partial) =>
        set((s) => {
          const next = { ...s.rules, [docType]: { ...s.rules[docType], ...partial, docType } };
          // V3.68.0 立项③：多组织复合键 + 登录态门控
          if (isAuthed()) {
            const key = ruleKey(docType);
            if (key) entityRepo.update('numberingRule', key, packRule(docType, next[docType])).catch(() => {});
          }
          return { rules: next };
        }),

      resetSeq: (docType) =>
        set((s) => {
          const next = { ...s.rules, [docType]: { ...s.rules[docType], currentSeq: 0 } };
          if (isAuthed()) {
            const key = ruleKey(docType);
            if (key) entityRepo.update('numberingRule', key, { currentSeq: 0 }).catch(() => {});
          }
          return { rules: next };
        }),

      resetAll: () => {
        set({ rules: { ...seedRules } });
        if (isAuthed()) {
          Object.keys(seedRules).forEach((dt) => {
            const key = ruleKey(dt as DocType);
            if (key) entityRepo.update('numberingRule', key, packRule(dt as DocType, seedRules[dt as DocType])).catch(() => {});
          });
        }
      },

      hydrateNumbering: async () => {
        // V3.68.0 立项③：未登录演示态不拉 D1（无会话组织，list 会 401 且前缀不对），保持本地 seed
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<any>('numberingRule', { page: 1, pageSize: 100 });
          const rows: any[] = res?.data || [];
          if (rows.length === 0) {
            // V3.68.0 立项③ 防污染：会话组织未知（key=null，如 token 已持久化但 currentUser 尚未水合）
            // 时跳过 D1 回填——packRule 的 dev:: 兜底前缀与登录态真实 org_id 错位，写进去会成脏数据。
            // 本地 seed 保留即可，登录态组织就绪后下次取号/水合自然补写，不阻断。
            if (!ruleKey(DOC_TYPES[0])) return;
            // 空库首次：本地 seed 回填 D1（保护既有编号连续性；复合键 org::docType）
            for (const dt of DOC_TYPES) {
              try { await entityRepo.create('numberingRule', packRule(dt, seedRules[dt])); } catch { /* 冲突忽略 */ }
            }
            return;
          }
          const merged: Record<string, NumberingRule> = { ...seedRules };
          rows.forEach((r) => {
            if (r.docType && merged[r.docType]) {
              merged[r.docType] = {
                ...merged[r.docType],
                prefix: r.prefix ?? merged[r.docType].prefix,
                separator: r.separator ?? merged[r.docType].separator,
                datePattern: r.datePattern ?? merged[r.docType].datePattern,
                seqLength: typeof r.seqLength === 'number' ? r.seqLength : merged[r.docType].seqLength,
                currentSeq: typeof r.currentSeq === 'number' ? r.currentSeq : merged[r.docType].currentSeq,
                label: r.label || merged[r.docType].label,
              };
            }
          });
          set({ rules: merged });
        } catch {
          /* 离线/异常：保留本地 Blob 副本（persist 水合结果），不阻断 */
        }
      },
    }),
    { storage: backendStorage,

      name: 'ssa-erp-numbering',
      version: 2,
      partialize: (state) => ({ rules: state.rules }),
    }
  )
);

// ── V3.66.0 P0-2：启动水合编号规则（D1 主源，与 qualityStore 同款顶层触发）──
void useNumberingStore.getState().hydrateNumbering();
