// 审批实例 / 动作流水 / 委托关系类型（V3.17.9 修复差距 9/10/11）
//
// 与迁移 0075 的字段一一对应。命名口径：字段用驼峰，服务端返回的是下划线，
// 由 store 统一转换（不在这里做兼容，避免两处各转一套）。
//
// 为什么单独建类型文件而不是塞进 types/common.ts：
//   这三种实体属于「审批过程」，不是任何一种业务单据的附属字段；
//   types/common.ts 里的 ApprovalRecord 是「单据上挂的审批意见数组」，
//   两者语义不同（一个是过程账本，一个是单据快照），不要混用。

/** 审批实例状态：审批中 / 已通过 / 已驳回 / 已撤回 */
export type ApprovalInstanceStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

/** 审批动作类型（只追加，不可修改） */
export type ApprovalActionType =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'withdraw'
  | 'urge'
  | 'delegate'
  | 'revoke_delegate';

/** 一次「提交—审批」过程 */
export interface ApprovalInstance {
  id: string;
  flowId?: string;
  /** 业务模块标识，如 purchase_request / sales_order / material_application / price_approval */
  module: string;
  /** 业务单据 id */
  entityId: string;
  /** 单据编号（界面展示用） */
  entityNo?: string;
  title?: string;
  submitterId?: string;
  submitterName?: string;
  status: ApprovalInstanceStatus;
  totalNodes: number;
  currentNodeOrder: number;
  currentNodeName?: string;
  /** 当前应审批人（已按委托路由后的「实际」审批人） */
  currentApproverId?: string;
  currentApproverName?: string;
  /** 配置上本应的审批人（与 currentApproverId 不同 = 这张单走了委托） */
  originalApproverId?: string;
  submittedAt: string;
  finishedAt?: string;
  withdrawnAt?: string;
  withdrawnBy?: string;
  withdrawReason?: string;
  /** 累计催办次数 */
  urgeCount: number;
  lastUrgedAt?: string;
  version?: number;
}

/** 一条审批动作流水 */
export interface ApprovalActionRow {
  id: string;
  instanceId: string;
  action: ApprovalActionType;
  nodeOrder?: number;
  nodeName?: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  comment?: string;
  createdAt: string;
}

/** 委托关系 */
export interface ApprovalDelegate {
  id: string;
  delegatorId: string;
  delegatorName?: string;
  delegateId: string;
  delegateName?: string;
  /** 空 = 全部模块 */
  module?: string | null;
  startDate: string;
  endDate: string;
  reason?: string;
  active: number;
  /** 服务端算好的「当前是否生效」，前端不重复算日期区间 */
  effective?: boolean;
  createdAt: string;
}

/**
 * 审批实例状态中文标签（V3.75.0 P1-4 收敛：改从统一登记表派生，
 * 词表与标签的唯一来源是 src/constants/approvalEnums.ts；
 * 原字面量与本表逐项一致，零显示变化）
 */
export { APPROVAL_INSTANCE_STATUS_LABELS as APPROVAL_STATUS_LABELS } from '@/constants/approvalEnums';

export const APPROVAL_ACTION_LABELS: Record<ApprovalActionType, string> = {
  submit: '提交',
  approve: '同意',
  reject: '驳回',
  withdraw: '撤回',
  urge: '催办',
  delegate: '委托',
  revoke_delegate: '撤销委托',
};

/** 模块标识 → 中文名（界面展示用；新增模块时只改这一处） */
export const APPROVAL_MODULE_LABELS: Record<string, string> = {
  purchase_request: '采购申请',
  purchase_order: '采购订单',
  sales_order: '销售订单',
  price_approval: '价格变更',
  material_application: '物料申请',
  vendor_profile: '供应商注册',
  payment_plan: '付款计划',
};

export const approvalModuleLabel = (module: string): string =>
  APPROVAL_MODULE_LABELS[module] || module;

/** 审批中心的三个视图 */
export type ApprovalView = 'pending' | 'submitted' | 'delegated';
