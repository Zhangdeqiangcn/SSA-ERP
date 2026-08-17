import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { currentUser } from './sessionStore';

/**
 * C7 服务端化雏形 · 审计日志落库
 * ------------------------------------------------------------
 * 所有经 serverService 写入的数据变更都会落一条审计记录：
 * 谁（会话用户） / 什么时候 / 对哪个实体 / 做了什么 / 摘要。
 *
 * persist key = ssa-erp-audit，最多保留 500 条（超出丢弃最旧的）。
 */

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export' | 'approve';

export interface AuditRecord {
  id: string;
  /** 实体名，如 salesPrice / purchaseOrder */
  entity: string;
  entityId?: string;
  action: AuditAction;
  /** 人类可读摘要 */
  summary: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
  login: '登录',
  export: '导出',
  approve: '审批',
};

const MAX_RECORDS = 500;

interface AuditState {
  records: AuditRecord[];
  recordAudit: (input: {
    entity: string;
    entityId?: string;
    action: AuditAction;
    summary: string;
  }) => AuditRecord;
  clearAudit: () => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      records: [],
      recordAudit: ({ entity, entityId, action, summary }) => {
        const u = currentUser();
        const rec: AuditRecord = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          entity,
          entityId,
          action,
          summary,
          userId: u.userId,
          userName: u.userName,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ records: [rec, ...state.records].slice(0, MAX_RECORDS) }));
        return rec;
      },
      clearAudit: () => set({ records: [] }),
    }),
    { name: 'ssa-erp-audit', version: 1 }
  )
);

/** 非 React 环境调用入口 */
export const recordAudit = (input: {
  entity: string;
  entityId?: string;
  action: AuditAction;
  summary: string;
}) => useAuditStore.getState().recordAudit(input);
