import { createEntityStore } from './createEntityStore';
import type { UseBoundStore, StoreApi } from 'zustand';
import { fulfillmentApi } from '@/services/fulfillmentApi';
import { applyPick, type PickTask } from '@/services/fulfillment';

export interface Wave {
  id: string;
  waveNo: string;
  status: string; // draft/released/picking/picked/packed/shipped
  orderIds: string[];
  remark?: string;
  createdAt?: string;
  createdBy?: string;
}
export interface PackRecord {
  id: string;
  waveId?: string;
  orderHubId?: string;
  packNo: string;
  weight?: number;
  status?: string;
}
export interface ShipCheck {
  id: string;
  orderHubId: string;
  packNo?: string;
  pass: boolean;
  detail?: any;
}

interface FulfillmentState {
  waves: Wave[];
  pickTasks: PickTask[];
  packRecords: PackRecord[];
  shipChecks: ShipCheck[];
  loaded: boolean;
  load: () => Promise<void>;
  createWaveFromOrders: (orderIds: string[], remark?: string) => Promise<any>;
  confirmPick: (taskId: string, scannedQty: number, barcode?: string) => Promise<void>;
  packOrder: (payload: { waveId: string; orderHubId: string; packNo: string; weight?: number }) => Promise<any>;
  checkShip: (payload: { orderHubId: string; packNo?: string; scanList: any[] }) => Promise<any>;
}

// order_ids 列（JSON 字符串）↔ 数组
const parseWave = (w: any): Wave => ({
  ...w,
  orderIds: typeof w.orderIds === 'string' ? (() => { try { return JSON.parse(w.orderIds); } catch { return []; } })() : w.orderIds || [],
});

// 仓储执行层：复用通用仓储工厂，主资源 wave + 三附属资源（拣货/打包/发货校验）。
// 波次/拣货/配货状态机与强校验逻辑走后端权威执行，前端 extend 方法负责编排与本地预校验。
export const useFulfillmentStore = createEntityStore<Wave>({
  resource: 'wave',
  seed: [],
  stateKey: 'waves',
  parse: parseWave,
  backend: {
    list: () => fulfillmentApi.listWaves(),
    create: (item) => fulfillmentApi.createWave(item),
    update: (id, patch) => fulfillmentApi.updateWave(id, patch),
    remove: () => Promise.reject(new Error('波次不支持删除')),
  },
  extraResources: [
    {
      resource: 'pickTask',
      seed: [],
      stateKey: 'pickTasks',
      backend: {
        list: (p?: any) => fulfillmentApi.listPickTasks(p?.waveId),
        update: (id, patch) =>
          fulfillmentApi.confirmPick({ taskId: id, ...(patch as any) }).then((r: any) => r?.data ?? r),
      },
    },
    {
      resource: 'packRecord',
      seed: [],
      stateKey: 'packRecords',
      backend: { list: (p?: any) => fulfillmentApi.listPackRecords(p?.waveId) },
    },
    {
      resource: 'shipCheck',
      seed: [],
      stateKey: 'shipChecks',
      backend: { list: () => fulfillmentApi.listShipChecks() },
    },
  ],
  extend: (ctx) => ({
    loadFulfillment: async () => {
      await ctx.get().load();
    },
    // 从订单中台选单生成波次（后端负责拆拣货任务 + 库存可用性预检）
    createWaveFromOrders: async (orderIds: string[], remark?: string) => {
      const w = await fulfillmentApi.createWave({ orderIds, remark });
      await ctx.get().load();
      return w;
    },
    // 拣货确认：本地先用纯函数预校验（条码/数量），失败直接拦截，不触网
    confirmPick: async (taskId: string, scannedQty: number, barcode?: string) => {
      const task = (ctx.get().pickTasks as PickTask[]).find((t) => t.id === taskId);
      if (!task) throw new Error('拣货任务不存在');
      const r = applyPick(task, scannedQty, barcode);
      if (!r.ok) throw new Error(r.error);
      await ctx.extras.pickTasks.update(taskId, { pickedQty: r.task.pickedQty, status: r.task.status });
    },
    packOrder: async (payload: { waveId: string; orderHubId: string; packNo: string; weight?: number }) => {
      const rec: any = await fulfillmentApi.packOrder(payload);
      const packs = await fulfillmentApi.listPackRecords(payload.waveId);
      ctx.set({ packRecords: packs });
      return rec;
    },
    checkShip: async (payload: { orderHubId: string; packNo?: string; scanList: any[] }) => {
      const res: any = await fulfillmentApi.checkShip(payload);
      const checks = await fulfillmentApi.listShipChecks();
      ctx.set({ shipChecks: checks });
      return res;
    },
  }),
}) as unknown as UseBoundStore<StoreApi<FulfillmentState>>;
