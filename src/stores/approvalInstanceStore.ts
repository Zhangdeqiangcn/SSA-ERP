import { create } from 'zustand';
import { authHeaders } from '@/utils/authHeaders';
import { hasSession } from '@/stores/persistStorage';
import type {
  ApprovalInstance,
  ApprovalActionRow,
  ApprovalDelegate,
} from '@/types/approval';

/**
 * 审批实例 store（V3.17.9 修复差距 9/10/11）
 * ------------------------------------------------------------
 * 数据源：D1（/api/approval-instances、/api/approval-delegates）。
 * **刻意不用 zustand persist**：审批实例是「跨人的协作数据」，
 * 放进浏览器本地存储会造成两个后果 ——
 *   ① 换了设备就看不到别人提交给我审批的单子；
 *   ② 撤回/催办会产生「本地改了、服务端没改」的分歧。
 * 这与差距16「数据双通道残留」是同一类问题，新代码不再新增一条通道。
 *
 * 未登录时的行为（铁律⑫）：不发起任何业务请求，直接返回空结果。
 */

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: authHeaders({
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...((init?.headers as Record<string, string>) || {}),
      }),
    });
    const text = await res.text();
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
    if (!res.ok) {
      return { ok: false, status: res.status, error: payload?.error || `请求失败（HTTP ${res.status}）` };
    }
    return { ok: true, status: res.status, data: payload };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || '网络异常' };
  }
}

/** 服务端下划线字段 → 前端驼峰（新字段只在这两处加，不要散落到组件里） */
function toInstance(r: any): ApprovalInstance {
  return {
    id: r.id,
    flowId: r.flow_id ?? undefined,
    module: r.module,
    entityId: r.entity_id,
    entityNo: r.entity_no ?? undefined,
    title: r.title ?? undefined,
    submitterId: r.submitter_id ?? undefined,
    submitterName: r.submitter_name ?? undefined,
    status: r.status,
    totalNodes: Number(r.total_nodes) || 0,
    currentNodeOrder: Number(r.current_node_order) || 0,
    currentNodeName: r.current_node_name ?? undefined,
    currentApproverId: r.current_approver_id ?? undefined,
    currentApproverName: r.current_approver_name ?? undefined,
    originalApproverId: r.original_approver_id ?? undefined,
    submittedAt: r.submitted_at,
    finishedAt: r.finished_at ?? undefined,
    withdrawnAt: r.withdrawn_at ?? undefined,
    withdrawnBy: r.withdrawn_by ?? undefined,
    withdrawReason: r.withdraw_reason ?? undefined,
    urgeCount: Number(r.urge_count) || 0,
    lastUrgedAt: r.last_urged_at ?? undefined,
    version: Number(r.version) || 1,
  };
}

function toDelegate(r: any): ApprovalDelegate {
  return {
    id: r.id,
    delegatorId: r.delegator_id,
    delegatorName: r.delegator_name ?? undefined,
    delegateId: r.delegate_id,
    delegateName: r.delegate_name ?? undefined,
    module: r.module ?? null,
    startDate: r.start_date,
    endDate: r.end_date,
    reason: r.reason ?? undefined,
    active: Number(r.active) || 0,
    effective: !!r.effective,
    createdAt: r.created_at,
  };
}

function toAction(r: any): ApprovalActionRow {
  return {
    id: r.id,
    instanceId: r.instance_id,
    action: r.action,
    nodeOrder: r.node_order ?? undefined,
    nodeName: r.node_name ?? undefined,
    actorId: r.actor_id ?? undefined,
    actorName: r.actor_name ?? undefined,
    targetId: r.target_id ?? undefined,
    targetName: r.target_name ?? undefined,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
  };
}

interface ActionFeedback {
  ok: boolean;
  error?: string;
}

interface SubmitInput {
  module: string;
  entityId: string;
  entityNo?: string;
  title?: string;
  flowId?: string;
  totalNodes?: number;
  nodeOrder?: number;
  nodeName?: string;
  approverId?: string | null;
  approverName?: string | null;
  comment?: string;
}

interface ApprovalInstanceState {
  loading: boolean;
  lastError: string | null;
  /** 待我处理（含「别人委托给我的」） */
  pendingForMe: ApprovalInstance[];
  /** 我提交的（用于撤回 / 催办） */
  submittedByMe: ApprovalInstance[];
  /** 走了委托、落到我头上的（界面标注「代 XX 审批」） */
  delegatedToMe: ApprovalInstance[];
  /** 我作为受委托人，代理了谁 */
  delegators: Array<{ delegatorId: string; delegatorName: string; module: string | null }>;
  /** 我委托出去的 */
  myDelegates: ApprovalDelegate[];
  /** 别人委托给我的 */
  incomingDelegates: ApprovalDelegate[];
  loadedAt: number | null;

  loadAll: (opts?: { silent?: boolean }) => Promise<void>;
  /** 按 模块+单据 找到对应实例（用于把业务单据和它的审批过程对上） */
  byEntity: (module: string, entityId: string) => ApprovalInstance | undefined;
  fetchActions: (instanceId: string) => Promise<ApprovalActionRow[]>;

  submitApproval: (input: SubmitInput) => Promise<ActionFeedback & { id?: string }>;
  approve: (id: string, opts?: { comment?: string; nextNodeName?: string; nextApproverId?: string | null; nextApproverName?: string | null; version?: number }) => Promise<ActionFeedback>;
  reject: (id: string, comment?: string, version?: number) => Promise<ActionFeedback>;
  withdraw: (id: string, reason?: string, version?: number) => Promise<ActionFeedback>;
  urge: (id: string, comment?: string) => Promise<ActionFeedback>;

  createDelegate: (input: { delegateId: string; delegateName?: string; module?: string | null; startDate: string; endDate: string; reason?: string }) => Promise<ActionFeedback>;
  revokeDelegate: (id: string) => Promise<ActionFeedback>;
  deleteDelegate: (id: string) => Promise<ActionFeedback>;
}

export const useApprovalInstanceStore = create<ApprovalInstanceState>()((set, get) => ({
  loading: false,
  lastError: null,
  pendingForMe: [],
  submittedByMe: [],
  delegatedToMe: [],
  delegators: [],
  myDelegates: [],
  incomingDelegates: [],
  loadedAt: null,

  loadAll: async (opts) => {
    // 未登录不发业务请求：审批是私有协作数据，匿名拉取只会得到 401 噪音
    let hasToken = false;
    try { hasToken = hasSession(); } catch { /* ignore */ }
    if (!hasToken) {
      set({ pendingForMe: [], submittedByMe: [], delegatedToMe: [], delegators: [], myDelegates: [], incomingDelegates: [], loadedAt: Date.now() });
      return;
    }

    if (!opts?.silent) set({ loading: true });
    try {
      const [pending, submitted, delegated, out, incoming] = await Promise.all([
        req<any>('/approval-instances?view=pending'),
        req<any>('/approval-instances?view=submitted'),
        req<any>('/approval-instances?view=delegated'),
        req<any>('/approval-delegates?view=out'),
        req<any>('/approval-delegates?view=in'),
      ]);

      if (!pending.ok) {
        set({ lastError: pending.error || '审批实例加载失败', loading: false });
        return;
      }

      set({
        pendingForMe: (pending.data?.data || []).map(toInstance),
        submittedByMe: (submitted.data?.data || []).map(toInstance),
        delegatedToMe: (delegated.data?.data || []).map(toInstance),
        delegators: pending.data?.delegators || [],
        myDelegates: (out.data?.data || []).map(toDelegate),
        incomingDelegates: (incoming.data?.data || []).map(toDelegate),
        lastError: null,
        loading: false,
        loadedAt: Date.now(),
      });
    } catch (e: any) {
      set({ lastError: e?.message || '审批实例加载失败', loading: false });
    }
  },

  byEntity: (module, entityId) => {
    const { pendingForMe, submittedByMe, delegatedToMe } = get();
    return [...pendingForMe, ...submittedByMe, ...delegatedToMe]
      .find((i) => i.module === module && i.entityId === entityId);
  },

  fetchActions: async (instanceId) => {
    const r = await req<any>(`/approval-instances/${instanceId}`);
    if (!r.ok) return [];
    return (r.data?.data?.actions || []).map(toAction);
  },

  submitApproval: async (input) => {
    const r = await req<any>('/approval-instances', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true, id: r.data?.data?.id };
  },

  approve: async (id, opts) => {
    const r = await req<any>(`/approval-instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'approve', ...(opts || {}) }),
    });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },

  reject: async (id, comment, version) => {
    const r = await req<any>(`/approval-instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'reject', comment, version }),
    });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },

  withdraw: async (id, reason, version) => {
    const r = await req<any>(`/approval-instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'withdraw', comment: reason, version }),
    });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },

  urge: async (id, comment) => {
    const r = await req<any>(`/approval-instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'urge', comment }),
    });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },

  createDelegate: async (input) => {
    const r = await req<any>('/approval-delegates', { method: 'POST', body: JSON.stringify(input) });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },

  revokeDelegate: async (id) => {
    const r = await req<any>(`/approval-delegates/${id}`, { method: 'PUT', body: JSON.stringify({ active: 0 }) });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },

  deleteDelegate: async (id) => {
    const r = await req<any>(`/approval-delegates/${id}`, { method: 'DELETE' });
    if (!r.ok) return { ok: false, error: r.error };
    await get().loadAll({ silent: true });
    return { ok: true };
  },
}));

/** 业务侧 module → 审批实例 module 的映射（各页面提交审批时用） */
export const MODULE_BY_APPROVAL_TYPE: Record<string, string> = {
  purchase: 'purchase_request',
  material: 'material_application',
  vendor: 'vendor_profile',
  price: 'price_approval',
  sales: 'sales_order',
};
