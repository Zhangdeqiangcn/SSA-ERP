import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      definitions: [seedDef],
      instances: [],
      addDefinition: (def) =>
        set((s) => ({
          definitions: [...s.definitions, { ...def, id: uid('wf'), createdAt: now() }],
        })),
      deleteDefinition: (id) =>
        set((s) => ({ definitions: s.definitions.filter((d) => d.id !== id) })),
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
        return id;
      },
      advanceInstance: (instanceId, operator) =>
        set((s) => ({
          instances: s.instances.map((inst) => {
            if (inst.id !== instanceId || inst.status !== 'running') return inst;
            const def = get().definitions.find((d) => d.id === inst.defId);
            if (!def) return inst;
            const current = def.nodes.find((n) => n.id === inst.currentNodeId);
            if (!current || current.type === 'end') return inst;
            const trans = def.transitions.find((t) => t.from === current.id);
            if (!trans) return inst;
            const target: WorkflowNode = def.nodes.find((n) => n.id === trans.to)!;
            const action = current.type === 'approval' ? 'approve' : 'advance';
            return {
              ...inst,
              currentNodeId: target.id,
              status: target.type === 'end' ? 'done' : 'running',
              history: [
                ...inst.history,
                { nodeId: target.id, nodeName: target.name, action, at: now(), operator },
              ],
            };
          }),
        })),
      rejectInstance: (instanceId, operator) =>
        set((s) => ({
          instances: s.instances.map((inst) => {
            if (inst.id !== instanceId || inst.status !== 'running') return inst;
            const def = get().definitions.find((d) => d.id === inst.defId);
            if (!def) return inst;
            const current = def.nodes.find((n) => n.id === inst.currentNodeId);
            if (!current || current.type !== 'approval') return inst;
            return {
              ...inst,
              status: 'rejected',
              history: [
                ...inst.history,
                { nodeId: current.id, nodeName: current.name, action: 'reject', at: now(), operator },
              ],
            };
          }),
        })),
    }),
    { name: 'ssa-erp-workflow' },
  ),
);
