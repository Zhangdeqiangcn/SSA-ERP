/**
 * 通用工作流引擎（BPMN-lite，实验性）
 * ------------------------------------------------------------
 * ⚠️ 定位澄清（B7-4）：本 store / WorkflowEngine 是一个「通用流程设计器」，
 * 提供起止节点 + 任意 transition 的可视化编排（开始→审批→执行→结束），
 * 用于自定义非标流程（如 OA 流转、特殊项目审批）的沙盒演练。
 *
 * 它与业务审批引擎 `approvalFlowStore` 是**两套独立机制**，请勿混淆：
 *   - approvalFlowStore：采购申请 / 供应商准入 / 价格审批 / 物料新增等
 *     业务审批的「单一数据源」，由各业务审批队列（Vendor/ApprovalQueue、
 *     Purchase/PurchaseApproval、Price/PriceApproval、Material/MaterialApprovalQueue）
 *     与 FlowTracker 按配置驱动多步审批，并支持结构化条件 + 跳过规则运行时执行。
 *   - workflowStore（本文件）：通用工作流设计器，示例/实验用途，不参与上述
 *     业务审批的真实推进链路。
 * 两者不强制合并，避免破坏已上线的业务审批闭环。
 */
import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeRow, withKind, splitByKind } from './entityBackedShared';
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowNode,
} from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const now = () => new Date().toISOString();

interface WorkflowState {
  definitions: WorkflowDefinition[];
  instances: WorkflowInstance[];
  addDefinition: (def: Omit<WorkflowDefinition, 'id' | 'createdAt'>) => void;
  deleteDefinition: (id: string) => void;
  startInstance: (defId: string, initiator?: string) => string;
  advanceInstance: (instanceId: string, operator?: string) => void;
  rejectInstance: (instanceId: string, operator?: string) => void;
}

const seedDef: WorkflowDefinition = {
  id: 'wf-seed-1',
  name: '采购申请审批流',
  createdAt: now(),
  nodes: [
    { id: 'n1', name: '发起申请', type: 'start' },
    { id: 'n2', name: '主管审批', type: 'approval' },
    { id: 'n3', name: '采购执行', type: 'task' },
    { id: 'n4', name: '结束', type: 'end' },
  ],
  transitions: [
    { from: 'n1', to: 'n2', label: '提交' },
    { from: 'n2', to: 'n3', label: '通过' },
    { from: 'n3', to: 'n4', label: '完成' },
  ],
};

const RES = 'workflowShared';
const KIND_DEF = 'workflowDefinition';
const KIND_INST = 'workflowInstance';

/** 双切片写穿（__kind 标记，行主键 = 各对象 id） */
const pushDef = (d: WorkflowDefinition) => isAuthed() && writeRow(RES, d.id, withKind(KIND_DEF, d));
const pushInst = (i: WorkflowInstance) => isAuthed() && writeRow(RES, i.id, withKind(KIND_INST, i));

export const useWorkflowStore = create<WorkflowState>()(
    (set, get) => ({
      definitions: [seedDef],
      instances: [],
      addDefinition: (def) => {
        const rec: WorkflowDefinition = { ...def, id: uid('wf'), createdAt: now() };
        set((s) => ({ definitions: [...s.definitions, rec] }));
        pushDef(rec);
      },
      deleteDefinition: (id) => {
        set((s) => ({ definitions: s.definitions.filter((d) => d.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },
      startInstance: (defId, initiator) => {
        const def = get().definitions.find((d) => d.id === defId);
        if (!def) return '';
        const startNode = def.nodes.find((n) => n.type === 'start') ?? def.nodes[0];
        const id = uid('wfi');
        const instance: WorkflowInstance = {
          id,
          defId,
          defName: def.name,
          currentNodeId: startNode.id,
          status: 'running',
          startedAt: now(),
          initiator,
          history: [
            { nodeId: startNode.id, nodeName: startNode.name, action: 'start', at: now() },
          ],
        };
        set((s) => ({ instances: [...s.instances, instance] }));
        pushInst(instance);
        return id;
      },
      advanceInstance: (instanceId, operator) =>
        set((s) => {
          const next = s.instances.map((inst) => {
            if (inst.id !== instanceId || inst.status !== 'running') return inst;
            const def = get().definitions.find((d) => d.id === inst.defId);
            if (!def) return inst;
            const current = def.nodes.find((n) => n.id === inst.currentNodeId);
            if (!current || current.type === 'end') return inst;
            const trans = def.transitions.find((t) => t.from === current.id);
            if (!trans) return inst;
            const target: WorkflowNode = def.nodes.find((n) => n.id === trans.to)!;
            const action = current.type === 'approval' ? 'approve' : 'advance';
            const updated: WorkflowInstance = {
              ...inst,
              currentNodeId: target.id,
              status: target.type === 'end' ? 'done' : 'running',
              history: [
                ...inst.history,
                { nodeId: target.id, nodeName: target.name, action, at: now(), operator },
              ],
            };
            pushInst(updated);
            return updated;
          });
          return { instances: next };
        }),
      rejectInstance: (instanceId, operator) =>
        set((s) => {
          const next = s.instances.map((inst) => {
            if (inst.id !== instanceId || inst.status !== 'running') return inst;
            const def = get().definitions.find((d) => d.id === inst.defId);
            if (!def) return inst;
            const current = def.nodes.find((n) => n.id === inst.currentNodeId);
            if (!current || current.type !== 'approval') return inst;
            const updated: WorkflowInstance = {
              ...inst,
              status: 'rejected',
              history: [
                ...inst.history,
                { nodeId: current.id, nodeName: current.name, action: 'reject', at: now(), operator },
              ],
            };
            pushInst(updated);
            return updated;
          });
          return { instances: next };
        }),
    }),
);

// ── V3.81.0 D1 同步层：双切片（definitions + instances）挂载水合 ──
let hydrating = false;
async function hydrateWorkflow() {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
    const rows = parsePayload(res?.data || []);
    if (rows.length) {
      useWorkflowStore.setState({
        definitions: splitByKind<WorkflowDefinition>(rows, KIND_DEF),
        instances: splitByKind<WorkflowInstance>(rows, KIND_INST),
      });
    }
  } catch {
    /* 离线/异常：保留本地态 */
  } finally {
    hydrating = false;
  }
}

void hydrateWorkflow();
