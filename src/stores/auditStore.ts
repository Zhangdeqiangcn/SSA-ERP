import { create } from 'zustand';
import { currentUser } from './sessionStore';
import { authHeaders } from '@/utils/authHeaders';
import { isAuthed } from '@/services/b2Api';

/**
 * 审计日志 v2 · 支持 diff 记录 + 回滚 + 版本历史
 * ------------------------------------------------------------
 * - oldValue / newValue: JSON 格式的变更前后快照（用于回滚）
 * - rollbackTo(entityId, targetVersion): 回滚到指定历史版本
 * - getVersionHistory(entity, entityId): 获取某实体的完整变更历史
 * - MAX_RECORDS 提升至 10000 条
 */

export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'login' | 'export' | 'approve';

export interface AuditDiff {
  /** 变更前的字段值快照（update/delete 时记录） */
  oldValue?: Record<string, any>;
  /** 变更后的字段值快照（update/create 时记录） */
  newValue?: Record<string, any>;
  /** 变更字段列表（用于快速展示 diff） */
  changedFields?: string[];
}

export interface AuditRecord {
  id: string;
  version: number;           // 该实体的第几次变更（从 1 开始）
  /** 实体名，如 vendor / material / purchaseOrder */
  entity: string;
  entityId: string;          // 实体 ID（必填）
  action: AuditAction;
  /** 人类可读摘要 */
  summary: string;
  /** diff 快照（update 时记录 oldValue/newValue，便于回滚） */
  diff?: AuditDiff;
  userId: string;
  userName: string;
  createdAt: string;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
  restore: '恢复',
  login: '登录',
  export: '导出',
  approve: '审批',
};

const MAX_RECORDS = 10000;

interface AuditState {
  records: AuditRecord[];
  /** 记录审计（支持 diff） */
  recordAudit: (input: {
    entity: string;
    entityId: string;
    action: AuditAction;
    summary: string;
    diff?: AuditDiff;
  }) => AuditRecord;
  /** 获取某实体的完整变更历史（按时间倒序） */
  getVersionHistory: (entity: string, entityId: string) => AuditRecord[];
  /** V3.83.0 跨端：从服务端拉某实体的版本链（按 version 正序，多人/换端/刷新后仍可见） */
  getServerVersionHistory: (entity: string, entityId: string) => Promise<AuditRecord[]>;
  /** 回滚到指定版本（恢复该版本的 newValue 到 store） */
  rollbackTo: (entity: string, entityId: string, targetVersion: number) => boolean;
  clearAudit: () => void;
}

/** 工具：计算两个对象的 diff */
export const computeDiff = (oldObj: Record<string, any>, newObj: Record<string, any>): AuditDiff => {
  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})]);
  for (const key of allKeys) {
    if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
      changedFields.push(key);
    }
  }
  return { oldValue: oldObj, newValue: newObj, changedFields };
};

export const useAuditStore = create<AuditState>()(
    (set, get) => ({
      // V3.82.0 去双源：records 不再整块 blob 共享（根治多人 409 / 换端看不到别人审计），
      // 改纯内存会话态；recordAudit 每次仍双写服务端 /api/audit/logs（权威、org 隔离），
      // 本地 records 只承载当前会话内「版本历史 + 回滚」的即时能力（刷新即清，不影响服务端留痕）。
      records: [],
      recordAudit: ({ entity, entityId, action, summary, diff }) => {
        const u = currentUser();
        // 计算该实体的最新版本号
        const existing = get().records.filter((r) => r.entity === entity && r.entityId === entityId);
        const nextVersion = existing.length + 1;
        const rec: AuditRecord = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          version: nextVersion,
          entity,
          entityId,
          action,
          summary,
          diff,
          userId: u.userId,
          userName: u.userName,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ records: [rec, ...state.records].slice(0, MAX_RECORDS) }));
        // 同步到 D1 后端（静默失败）
        // ★ 必须带登录令牌：后端 /api/audit/logs 走 getUserFromRequest，无 Bearer 直接 401。
        //   此前只传 Content-Type，请求被后端拒绝、又被下面的 .catch 吞掉 ——
        //   表现为「本地版本历史看得见、服务端审计日志永远空」。见 utils/authHeaders.ts。
        try {
          fetch('/api/audit/logs', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ entity, entityId, action, summary, diff }),
          }).catch(() => { /* 离线/超时不影响本地记录 */ });
        } catch { /* ignore */ }
        return rec;
      },
      getVersionHistory: (entity, entityId) => {
        return get().records
          .filter((r) => r.entity === entity && r.entityId === entityId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
      // V3.83.0 跨端精确回滚地基：从服务端拉某实体的版本链（按 version 正序）。
      //   服务端 audit_logs 已加 version 列（0104）+ GET 返回 version，故他人/换端/刷新后
      //   留下的变更也能看到并据此回滚。非管理员只回收到本人记录（沿用 GET 端点的 RLS 口径）。
      //   未登录/离线返回空数组（调用方回落本地 getVersionHistory）。
      getServerVersionHistory: async (entity, entityId) => {
        if (!isAuthed()) return [];
        try {
          // GET /api/audit 按 entity 过滤（entityId 在端点不支持，客户端二次过滤）
          const url = `/api/audit?entity=${encodeURIComponent(entity)}&pageSize=200`;
          const res = await fetch(url, { headers: authHeaders() });
          if (!res.ok) return [];
          const r = await res.json();
          const rows: any[] = Array.isArray(r?.data) ? r.data : [];
          return rows
            .filter((x) => x?.entityId === entityId)
            .map((x) => ({
              id: x.id,
              version: Number(x.version ?? 1),
              entity: x.entity,
              entityId: x.entityId,
              action: x.action as AuditAction,
              summary: x.summary,
              diff: x.diff ?? undefined,
              userId: x.userId ?? '',
              userName: x.userName ?? '',
              createdAt: x.createdAt,
            }))
            .sort((a, b) => a.version - b.version);
        } catch {
          return [];
        }
      },
      rollbackTo: (entity, entityId, targetVersion) => {
        const history = get().getVersionHistory(entity, entityId);
        const target = history.find((r) => r.version === targetVersion);
        if (!target || !target.diff?.newValue) return false;
        // 记录回滚操作，同时返回是否成功
        const u = currentUser();
        const rollbackRecord: AuditRecord = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          version: history.length + 1,
          entity,
          entityId,
          action: 'restore',
          summary: `回滚到版本 ${targetVersion}（由 ${u.userName} 操作）`,
          diff: { oldValue: target.diff.newValue, newValue: target.diff.oldValue },
          userId: u.userId,
          userName: u.userName,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ records: [rollbackRecord, ...state.records].slice(0, MAX_RECORDS) }));
        // V3.83.0 跨端：回滚动作双写服务端（留痕，他端/刷新后可见该次 restore）
        try {
          fetch('/api/audit/logs', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              entity,
              entityId,
              action: 'restore',
              summary: rollbackRecord.summary,
              diff: rollbackRecord.diff,
            }),
          }).catch(() => { /* 离线不影响本地回滚记录 */ });
        } catch { /* ignore */ }
        return true;
      },
      clearAudit: () => set({ records: [] }),
    }),
);

/** 非 React 环境调用入口 */
export const recordAudit = (input: {
  entity: string;
  entityId: string;
  action: AuditAction;
  summary: string;
  diff?: AuditDiff;
}) => useAuditStore.getState().recordAudit(input);
