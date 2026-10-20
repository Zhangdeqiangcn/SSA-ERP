import type { FlowDefinition } from './flowDefinitions';
import type { FlowStatus } from '@/stores/approvalFlowStore';
import { isFlowStatusActive } from '@/constants/approvalEnums';
import {
  useApprovalFlowStore,
  type ApprovalFlowConfig,
  type ApprovalFlowNode,
  type ApprovalProfile,
  type ApprovalCondition,
  type ConditionGroup,
  type ConditionOperator,
  type ConditionFieldType,
} from '@/stores/approvalFlowStore';

/**
 * 审批流配置读取器（统一消费 approvalFlowStore）
 *
 * 历史：ApprovalFlowTab（设置页）将审批节点保存到 localStorage（key = ssa-approval-flows），
 * 本模块又内置一份 DEFAULT_FLOWS 作为回退——形成「双源」。V2.14 起审批流配置收敛到
 * `approvalFlowStore` 单一数据源，本模块仅作为读取入口，供供应商准入 / 采购申请等审批队列
 * 与 FlowTracker 按配置驱动多步审批流程。所有读写均指向 store，不再直接触碰 localStorage。
 *
 * V2.55.19 起在读取层提供「有效步骤引擎」：结构化条件求值 + 简化 profile 裁剪 +
 * 跳过规则应用，供 UI 预览与 FlowTracker 深度消费；`getApprovalSteps` 保持旧语义不变
 * （返回所有启用节点，向后兼容审批队列 / 价格审批等消费端）。
 */

export type { ApprovalFlowConfig, ApprovalFlowNode };

/** 将任意命名（含连字符）归一为下划线形式，便于与配置 module 对齐 */
const normalizeModule = (m: string): string => m.replace(/-/g, '_');

/* ==========================================================================
 * 1. 条件字段注册表（CONDITION_FIELDS）
 *    驱动 UI 结构化条件构造器，并为求值器提供字段类型（number/string/enum）。
 * ========================================================================== */
export interface ConditionFieldMeta {
  key: string;
  label: string;
  type: ConditionFieldType;
  unit?: string;
  options?: string[];        // type = enum 时的可选项
}

export const CONDITION_FIELDS: ConditionFieldMeta[] = [
  { key: 'amount', label: '金额', type: 'number', unit: '元' },
  { key: 'quantity', label: '数量', type: 'number', unit: '件' },
  { key: 'category', label: '业务类别', type: 'enum', options: ['物料', '服务', '资产', '费用'] },
  { key: 'department', label: '申请部门', type: 'string' },
  { key: 'vendorLevel', label: '供应商等级', type: 'enum', options: ['A', 'B', 'C'] },
  { key: 'urgency', label: '紧急程度', type: 'enum', options: ['普通', '紧急', '特急'] },
];

const CONDITION_FIELD_MAP: Record<string, ConditionFieldMeta> = Object.fromEntries(
  CONDITION_FIELDS.map((f) => [f.key, f])
);

/** 审批上下文：业务单据在触发审批时提供的字段值，供结构化条件求值 */
export interface ApprovalContext {
  [field: string]: string | number | undefined;
}

/* ==========================================================================
 * 2. 条件求值器
 * ========================================================================== */
function toNumber(v: string | number | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
}

/** 单条条件求值 */
export function evaluateCondition(cond: ApprovalCondition, ctx: ApprovalContext): boolean {
  const meta = CONDITION_FIELD_MAP[cond.field];
  const left = ctx[cond.field];
  if (left === undefined) return false;

  if (meta?.type === 'number') {
    const l = toNumber(left);
    const r = toNumber(cond.value);
    if (l === undefined || r === undefined) return false;
    switch (cond.operator) {
      case '>': return l > r;
      case '>=': return l >= r;
      case '<': return l < r;
      case '<=': return l <= r;
      case '==': return l === r;
      case '!=': return l !== r;
      default: return false;
    }
  }

  // string / enum：支持 ==, !=, in, not_in
  const rightStr = String(cond.value);
  const leftStr = String(left);
  switch (cond.operator) {
    case '==': return leftStr === rightStr;
    case '!=': return leftStr !== rightStr;
    case 'in':
    case 'not_in': {
      const members = rightStr.split(',').map((s) => s.trim());
      const hit = members.includes(leftStr);
      return cond.operator === 'in' ? hit : !hit;
    }
    default: return false;
  }
}

/** 条件组求值（组内 AND/OR 组合，空组视为 true） */
export function evaluateConditionGroup(group: ConditionGroup | undefined, ctx: ApprovalContext): boolean {
  if (!group || group.conditions.length === 0) return true;
  const results = group.conditions.map((c) => evaluateCondition(c, ctx));
  return group.logic === 'and' ? results.every(Boolean) : results.some(Boolean);
}

/** 运算符中文标签（UI 展示用） */
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  '>': '大于', '>=': '不小于', '<': '小于', '<=': '不大于',
  '==': '等于', '!=': '不等于', 'in': '属于', 'not_in': '不属于',
};

/* ==========================================================================
 * 3. 读取器
 * ========================================================================== */
export function loadApprovalFlows(): ApprovalFlowConfig[] {
  return useApprovalFlowStore.getState().flows;
}

export function getApprovalFlow(module: string): ApprovalFlowConfig | undefined {
  const target = normalizeModule(module);
  return useApprovalFlowStore.getState().flows.find(
    (f) => normalizeModule(f.module) === target && isFlowStatusActive(f.status ?? 'system')
  );
}

/** 取某模块的审批步骤（按 order 排序），禁用或无配置时返回空数组。
 *  保持旧语义：返回所有节点（含 optional / 带条件节点），供既有消费端兼容。 */
export function getApprovalSteps(module: string): ApprovalFlowNode[] {
  const flow = getApprovalFlow(module);
  if (!flow || !flow.enabled) return [];
  return [...flow.nodes].sort((a, b) => a.order - b.order);
}

/**
 * 有效步骤引擎（V2.55.19）：根据 profile 与审批上下文计算「实际参与审批」的节点链。
 *   - 简化 profile：剔除 optional 节点（SAP 简化释放思路）
 *   - 提供 context 时：命中 skipRule.when 的节点按 action 处理
 *       · skip        → 从链中移除
 *       · auto_approve→ 保留但标记为自动通过
 * 不传 context 时仅做 profile 裁剪（用于 UI 预览 / 无需单据数据的场景）。
 */
export interface EffectiveStep extends ApprovalFlowNode {
  active: boolean;        // 是否实际参与审批
  autoApproved?: boolean; // 被 skipRule 自动通过
  skipReason?: string;    // 未参与原因
}

export function getEffectiveSteps(
  module: string,
  context?: ApprovalContext,
  options?: { profile?: ApprovalProfile }
): EffectiveStep[] {
  const flow = getApprovalFlow(module);
  if (!flow || !flow.enabled) return [];
  const profile = options?.profile ?? flow.profile ?? 'standard';

  return [...flow.nodes]
    .sort((a, b) => a.order - b.order)
    .map((node) => {
      const step: EffectiveStep = { ...node, active: true };

      // 简化模式：省略可选节点
      if (profile === 'simplified' && node.optional) {
        return { ...step, active: false, skipReason: '简化模式已省略可选节点' };
      }

      // 跳过规则（需 context）
      if (context && node.skipRule) {
        if (evaluateConditionGroup(node.skipRule.when, context)) {
          if (node.skipRule.action === 'skip') {
            return { ...step, active: false, skipReason: `命中跳过规则（${node.skipRule.action}）` };
          }
          return { ...step, active: true, autoApproved: true, skipReason: '命中自动通过规则' };
        }
      }
      return step;
    });
}

/** 供 FlowTracker 使用：将审批流配置转换为 FlowDe  }

/* ==========================================================================
 * 4. 运行时推进解析（B7-3）
 *    供各业务审批队列在「提交下一步」时调用，使结构化条件 + 跳过规则在运行时真正生效：
 *    - 命中 skipRule.action='auto_approve' 的节点：自动记为通过并跳过（需追加系统自动审批记录）
 *    - 命中 skipRule.action='skip'（或简化模式被省略）的节点：直接跳过（不记审批记录）
 *    - 其余节点：作为真正的下一步返回
 *    默认配置无 skipRule，等价于 nextStep = currentStep + 1，不改变既有行为（向后兼容 E2E）。
 * ========================================================================== */
export interface ResolvedApprovalAdvance {
  /** 真正的下一步索引（跳过 auto_approve / skip 节点后） */
  nextStep: number;
  /** 被自动通过的节点（需追加系统自动审批记录） */
  autoApprovedNodes: ApprovalFlowNode[];
  /** 被直接跳过的节点（不记审批记录） */
  skippedNodes: ApprovalFlowNode[];
}

export function resolveApprovalAdvance(
  module: string,
  currentStep: number,
  fullSteps: ApprovalFlowNode[],
  context?: ApprovalContext
): ResolvedApprovalAdvance {
  const autoApprovedNodes: ApprovalFlowNode[] = [];
  const skippedNodes: ApprovalFlowNode[] = [];
  // 不传 context（或无条件可求值）时，退化为简单 +1，保证向后兼容
  if (!context) {
    return { nextStep: Math.min(currentStep + 1, fullSteps.length), autoApprovedNodes, skippedNodes };
  }
  const eff = getEffectiveSteps(module, context);
  const effById = new Map(eff.map((s) => [s.id, s]));
  let next = currentStep + 1;
  while (next < fullSteps.length) {
    const e = effById.get(fullSteps[next].id);
    if (!e) { next = fullSteps.length; break; }       // 节点不在有效链中（极端情况），终止
    if (!e.active) { skippedNodes.push(fullSteps[next]); next++; continue; }   // 被跳过
    if (e.autoApproved) { autoApprovedNodes.push(fullSteps[next]); next++; continue; } // 自动通过
    break;                                              // 第一个需人工审批的节点即停
  }
  return { nextStep: next, autoApprovedNodes, skippedNodes };
}

/** 供 FlowTracker 使用：将审批流配置转换为 FlowDefinition（保持旧行为，返回全部节点） */
export function buildApprovalFlowDefinition(module: string): FlowDefinition | null {
  const flow = getApprovalFlow(module);
  if (!flow || !flow.enabled || flow.nodes.length === 0) return null;
  const nodes = [...flow.nodes]
    .sort((a, b) => a.order - b.order)
    .map((n) => ({
      id: n.id,
      label: n.name,
      subLabel: n.roleName,
      icon: 'approval' as const,
    }));
  return {
    module: normalizeModule(module),
    moduleLabel: flow.moduleLabel,
    description: nodes.map((n) => n.label).join(' → '),
    nodes,
  };
}

/**
 * 供 FlowTracker 深度消费（V2.55.19）：按 profile + context 过滤后的有效 FlowDefinition。
 * 不影响既有 buildApprovalFlowDefinition 的向后兼容语义。
 */
export function buildEffectiveApprovalFlowDefinition(
  module: string,
  context?: ApprovalContext,
  options?: { profile?: ApprovalProfile }
): FlowDefinition | null {
  const steps = getEffectiveSteps(module, context, options);
  const active = steps.filter((s) => s.active);
  if (active.length === 0) return null;
  const flow = getApprovalFlow(module)!;
  const nodes = active.map((n) => ({
    id: n.id,
    label: n.name,
    subLabel: n.autoApproved ? `${n.roleName}（自动通过）` : n.roleName,
    icon: 'approval' as const,
  }));
  return {
    module: normalizeModule(module),
    moduleLabel: flow.moduleLabel,
    description: nodes.map((n) => n.label).join(' → '),
    nodes,
  };
}

/* ==========================================================================
 * 5. 自定义流程读取器（V2.87.0）
 * ========================================================================== */

/** 获取全部自定义流程（非 system 状态的） */
export function getCustomFlows(filter?: { status?: FlowStatus }): ApprovalFlowConfig[] {
  const all = useApprovalFlowStore.getState().flows;
  return all.filter((f) => f.status !== 'system' && (!filter?.status || f.status === filter.status));
}

/** 按组织+角色过滤可见的自定义流程（已发布）
 *  - visibleRoles 为空或不含当前角色时：仅管理员(admin)全可见
 *  - orgId 隔离：不传或为空时不按组织过滤
 */
export function getVisibleCustomFlows(currentRole?: string, orgId?: string): ApprovalFlowConfig[] {
  const published = getCustomFlows({ status: 'published' });
  return published.filter((f) => {
    // 组织隔离
    if (orgId && f.orgId && f.orgId !== orgId) return false;
    // 角色可见性：visibleRoles 为空=全部可见；否则当前角色必须在列表中
    if (f.visibleRoles && f.visibleRoles.length > 0 && currentRole && !f.visibleRoles.includes(currentRole)) {
      if (currentRole !== 'admin') return false;
    }
    return true;
  });
}

/** 获取待审批的自定义流程列表（供管理员审批用） */
export function getPendingApprovalFlows(): ApprovalFlowConfig[] {
  return getCustomFlows({ status: 'pending' });
}
