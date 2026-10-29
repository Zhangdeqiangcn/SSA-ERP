// ==================== C1 生产域关系化（V3.12.0）====================
//
// ── ★ 本域的特殊性：开工前才发现它是「半迁移」状态 ──────────────────
// 任务书给的基线是「生产域 3.7 KB / 消费方 25」，听起来像一个完整的域。
// 但读 `partialize` 才发现：三个切片里 **workOrders 早在 V2.75.x 就直连 D1**
// （端点 /api/work-orders + 表 work_orders），Blob 里**根本没有它**。
// 真正还在 app_state 的只有 processRoutes 与 mrpRecommendations 两个切片。
//   → 「域有多大」和「域里还剩什么没迁」是两件事；
//     后者只能读 `partialize`（现在还往 Blob 写什么），不能靠体积推断。
//
// ── 两个切片、两条通道（判据是「有没有嵌套」）──────────────────────
//   · processRoutes      —— 带 operations[]（每行还带 skills[]）
//                           → /api/process-routes（parentChild 父子表）
//   · mrpRecommendations —— 平表 → /api/entities/mrpRecommendation（通用路由）
//
// ── 改造后：D1 为唯一真相源，persist 整体删除 ───────────────────────
// 与 BOM / 财务 / 销售 / 审批流 / 采购同款设计：
//   backendStorage 的落点**就是** app_state 那个 JSON 大对象，
//   保留它 = D1 写一份、Blob 再写一份 = 双通道照旧、C1 白改。
//   初始值仍是 mock 种子，但只存在于内存，load() 成功后被 D1 整体覆盖。
//
// ── 为什么可以放心改 async（与财务域不同、与销售域相同）──────────────
// 实测全部 6 个写调用点**都不 await 返回值**：
//   addProcessRoute(ProcessRouteList:97) / updateProcessRoute(ProcessRouteList:95)
//   addMrpRecommendation(FlowSelfTest:145) / deleteMrpRecommendation(MRPPlan:565,629)
//   setMrpRecommendations(BOMDetail:99)
// 因此改成 async 对消费方零影响。
// （财务域因 33 个消费方同步依赖返回值，被迫保留同步签名 + 乐观更新壳 ——
//   **约束不同则手法不同，不可照抄**。）
import { create } from 'zustand';
import { WorkOrder, MRPRecommendation, ProcessRoute, IssuedMaterial } from '@/types/production';
import { FinishedGoodsInbound } from '@/types';
import { productionDomainApi, PRODUCTION_PAGE_SIZE } from '@/services/productionApi';
import {
  workOrders as mockWorkOrders,
  mrpRecommendations as mockMrpRecommendations,
  processRoutes as mockProcessRoutes,
} from '@/mocks/data/production';
// 跨模块回写：通过 getState() 读取，避免顶层循环依赖（与 subcontractStore 同范式）
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { roundAmount, roundPrice } from '@/utils/cost';
import { b2Api, isAuthed } from '@/services/b2Api';
import { workOrderApi } from '@/services/w1Api';
import { snakeToCamel } from '@/utils/case';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// W1 根治双通道：工单切片直连真实 D1 work_orders（仅 workOrders 迁 D1；
// mrpRecommendations / processRoutes 仍走 Blob，后端无对应写入端点）。
// 在线：loadWorkOrders 从 /api/work-orders 拉取；增改经 workOrderApi 写回。
const BACKFILL_FLAG = 'ssa-erp-production-backfilled';

// ── C1 相关的小工具（与 salesStore 同款，保持全项目一致）─────────────

/** 首次空库回填标记：每个切片一个键，避免多端互相重复写入 */
const FLAG = {
  processRoutes: 'ssa-erp-production-routes-backfilled',
  mrp: 'ssa-erp-production-mrp-backfilled',
};

function flagGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function flagSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* 忽略 */ }
}

/** 把接口异常转成强哥看得懂的一句话（不暴露堆栈与状态码术语） */
function readableError(e: any): string {
  const status = e?.response?.status ?? e?.status;
  if (status === 401) return '登录已过期，请重新登录后重试';
  if (status === 403) return '当前账号没有生产数据的修改权限';
  if (status === 409) return '编号与服务器已有记录重复，请换一个编号';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

/** 读旧的 Blob 里的某一切片（仅用于首次回填） */
function readLegacySlice(key: string): any[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-production');
    if (raw) {
      const st = JSON.parse(raw)?.state;
      if (st && Array.isArray(st[key])) return st[key];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * 拉取一个切片：成功返回数组，失败返回 null（调用方据此保留内存种子）。
 * 空库回填只在**本设备第一次**发生（flag 落 localStorage），
 * 否则多端会互相重复写入，也会让用户「删空了又长回来」。
 */
async function pullSlice<T>(
  api: { list: (p?: Record<string, unknown>) => Promise<any>; create: (d: any) => Promise<any> },
  seed: T[],
  flagKey: string,
  legacyKey: string
): Promise<T[] | null> {
  try {
    const res = await api.list({ page: 1, pageSize: PRODUCTION_PAGE_SIZE });
    const list = (res?.data || []) as T[];
    if (list.length === 0 && !flagGet(flagKey)) {
      flagSet(flagKey, '1');
      const legacy = readLegacySlice(legacyKey);
      const source = legacy.length ? legacy : seed;
      for (const item of source) {
        try { await api.create(item); } catch { /* 编号冲突等单条失败不阻断其余回填 */ }
      }
      const again = await api.list({ page: 1, pageSize: PRODUCTION_PAGE_SIZE });
      return (again?.data || []) as T[];
    }
    // list 为 0 且已回填过 = 用户确实把数据删空了，如实返回空数组
    return list;
  } catch {
    return null;
  }
}

function readLegacyWorkOrders(): WorkOrder[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-production');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.workOrders && Array.isArray(st.workOrders) && st.workOrders.length) return st.workOrders as WorkOrder[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function rowToWorkOrder(row: any): WorkOrder {
  return snakeToCamel(row) as WorkOrder;
}

/**
 * 完工结果（V3.20.0 差距13 倒冲发料返回值）
 *
 * 为什么要把「倒冲了什么」一路带回界面：
 * 倒冲是**服务端悄悄扣账**的动作，如果界面上不显示，用户看到的现象就是
 * 「点完工后，原材料库存凭空少了一截，没有任何单据说明原因」。这类「沉默的自动扣减」
 * 是最容易引发信任危机的（数据对不上却查不到出处）。因此把服务端返回的
 * 扣减明细（哪些料、扣多少、出库单号）原样带回，由界面展示。
 */
export interface CompleteWorkOrderResult {
  ok: boolean;
  /** 失败原因（面向用户的中文说明） */
  reason?: string;
  /** 服务端的倒冲发料结果；未登录/离线时为 undefined */
  backflush?: {
    posted: boolean;
    code: string;
    message: string;
    totalCost: number;
    outboundNo?: string;
    lines: {
      materialCode: string;
      materialName: string;
      unit: string;
      requiredQty: number;
      issuedQty: number;
      backflushQty: number;
      outcome: string;
    }[];
  };
}

interface ProductionState {
  workOrders: WorkOrder[];
  mrpRecommendations: MRPRecommendation[];
  processRoutes: ProcessRoute[];

  // WorkOrder CRUD
  addWorkOrder: (wo: WorkOrder) => void;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
  deleteWorkOrder: (id: string) => void;
  /** W1 根治双通道：从 D1 work_orders 拉取（在线）。空库首次从 legacy Blob / mock 回填一次。 */
  loadWorkOrders: () => Promise<void>;

  // B3 完工回写：工单完工 → 回写状态/数量/成本 + 自动生成成品入库单（事件驱动过账库存与生产成本凭证）
  // ★ V3.20.0：改为 async 并**先把完工落到服务端**。原因有两层：
  //   ① 原先只改内存、从不调 PUT —— 完工状态刷新页面就丢，等于「点完工没生效」；
  //   ② 差距13 的倒冲发料在服务端由这次 PUT 触发，必须等它返回才知道原料扣没扣、扣了什么。
  completeWorkOrder: (
    id: string,
    payload: {
      completedQuantity?: number;
      scrapQuantity?: number;
      actualEndDate?: string;
      actualTotalCost?: number;
      operator?: string;
    }
  ) => Promise<CompleteWorkOrderResult>;

  // B2-② 工单领料：按BOM展开生成生产领料出库单，扣减原料库存，回写工单领料明细
  issueMaterials: (
    id: string,
    items: { materialId: string; materialCode: string; materialName: string; quantity: number; unit: string }[]
  ) => { ok: boolean; outboundNo?: string; reason?: string };

  // MRP
  addMrpRecommendation: (rec: MRPRecommendation) => Promise<void>;
  updateMrpRecommendation: (id: string, updates: Partial<MRPRecommendation>) => Promise<void>;
  deleteMrpRecommendation: (id: string) => Promise<void>;
  setMrpRecommendations: (recs: MRPRecommendation[]) => Promise<void>;

  // ProcessRoute CRUD
  addProcessRoute: (route: ProcessRoute) => Promise<void>;
  updateProcessRoute: (id: string, updates: Partial<ProcessRoute>) => Promise<void>;
  deleteProcessRoute: (id: string) => Promise<void>;

  // C1：D1 拉取状态（与 salesStore / purchaseStore 同款，供界面提示失败）
  loaded: boolean;
  syncError: string;
  /** 从 D1 拉取本域全部已关系化切片（工艺路线 / MRP 建议 / 工单） */
  load: () => Promise<void>;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useProductionStore = create<ProductionState>()(
    (set, get) => ({
      workOrders: [...mockWorkOrders],
      mrpRecommendations: [...mockMrpRecommendations],
      processRoutes: [...mockProcessRoutes],
      loaded: false,
      syncError: '',

      // WorkOrder
      addWorkOrder: async (wo) => {
        set((s) => ({ workOrders: addArr(s.workOrders, wo) }));
        try {
          const created = await workOrderApi.createWorkOrder(wo as any);
          const mapped = rowToWorkOrder(created);
          if (mapped?.id && mapped.id !== wo.id) {
            set((s) => ({ workOrders: s.workOrders.map((o) => (o.id === wo.id ? mapped : o)) }));
          }
        } catch (e: any) {
          // ★ V3.45.0 消除静默失败（铁律㊴「界面点得动 ≠ 动作已落库」）：
          //   原 catch 完全空吞、**连 syncError 都不写** —— 是 V3.27~V3.41 系统性
          //   消除 60+ 处同类空吞后**全项目唯一遗漏**的点。
          //   后果：建单失败时界面留下一张"服务器上不存在的工单"，
          //   用户点它领料会 404，而界面上看不出任何异常。
          //   修法：乐观更新 + 回滚到改前快照 + 全局红条告警（对齐 V3.40 采购域策略）。
          set((s) => ({ workOrders: s.workOrders.filter((o) => o.id !== wo.id) }));
          useGlobalToastStore.getState().showError(
            `工单创建失败，已撤销：${e?.message || '请检查网络或单据字段后重试'}`
          );
        }
      },
      updateWorkOrder: async (id, u) => {
        // 改前快照：写失败要能回滚，否则"界面显示成功、刷新后数据回退"，
        // 而报工等副作用已基于新值发生 → 倒冲会按错误数量重复扣料。
        const before = get().workOrders.find((o) => o.id === id);
        set((s) => ({ workOrders: updateArr(s.workOrders, id, u) }));
        try {
          await workOrderApi.updateWorkOrder(id, u as any);
        } catch (e: any) {
          // ★ V3.45.0：原为 `catch {}` 完全空吞（连 syncError 都不写），全项目唯一
          //   放弃"乐观更新+回滚+提示"纪律的 store。
          //   后果最重的一条：报工回写失败时界面显示成功、刷新后完成数量回退，
          //   而报工记录仍在 → 倒冲算出的应补差额偏大 → **倒冲重复扣料**。
          if (before) set((s) => ({ workOrders: updateArr(s.workOrders, id, before) }));
          useGlobalToastStore.getState().showError(
            `工单更新失败，已回滚：${e?.message || '请检查网络或单据状态后重试'}`
          );
        }
      },
      deleteWorkOrder: async (id) => {
        const prev = get().workOrders;
        set((s) => ({ workOrders: deleteArr(s.workOrders, id) }));
        try {
          await workOrderApi.deleteWorkOrder(id);
        } catch (e: any) {
          // V3.58.0 修复 F-20：删除失败回滚本地 + 红条告警（铁律㊴ 界面点得动≠已落库）。
          // 原实现完全静默吞错（catch {} 不写任何痕迹），用户以为删掉了，刷新又出现。
          set({ workOrders: prev });
          useGlobalToastStore.getState().showError(`工单删除未同步到服务器：${e?.message || e}`);
        }
      },
      loadWorkOrders: async () => {
        try {
          const res = await workOrderApi.getWorkOrders({ page: 1, pageSize: 200 });
          const list = (res?.data || []).map(rowToWorkOrder);
          set({ workOrders: list });
          if (list.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
            window.localStorage.setItem(BACKFILL_FLAG, '1');
            const legacy = readLegacyWorkOrders();
            const seed = legacy.length ? legacy : [...mockWorkOrders];
            for (const o of seed) {
              try { await workOrderApi.createWorkOrder(o as any); } catch { /* 单号冲突等忽略 */ }
            }
            const refreshed = await workOrderApi.getWorkOrders({ page: 1, pageSize: 200 });
            set({ workOrders: (refreshed?.data || []).map(rowToWorkOrder) });
          }
        } catch {
          /* 离线/未登录/接口异常：保持内存 mockWorkOrders，不阻断 UI */
        }
      },

      // ── B2-② 工单领料：按BOM展开生成生产领料出库单，扣减原料库存，回写工单领料明细 ──
      // 对标 SAP 生产发料 261：借 5001 生产成本 / 贷 1403 原材料
      issueMaterials: (id, items) => {
        const wo = get().workOrders.find((o) => o.id === id);
        if (!wo) return { ok: false };
        // 幂等守卫：已完工/已关闭不再领料
        if (wo.status === 'completed' || wo.status === 'closed') return { ok: false };
        // 幂等守卫：已领料则不重复生成
        if (wo.issuedMaterials && wo.issuedMaterials.length > 0) return { ok: false };

        const today = new Date().toISOString().slice(0, 10);
        const stamp = Date.now();
        const outboundNo = `OUT-WO-ISSUE-${stamp}`;
        const outboundId = `out-wo-issue-${stamp}`;

        // 1. 检查库存充足
        const wh = useWarehouseStore.getState();
        for (const item of items) {
          const inventory = wh.inventoryRecords.find(
            (r) => r.materialId === item.materialId && r.warehouseId === 'wh-001'
          );
          const availableQty = inventory?.availableQuantity || 0;
          if (availableQty < item.quantity) {
            return {
              ok: false,
              reason: `物料 ${item.materialCode}（${item.materialName}）库存不足：当前可用 ${availableQty}，需领 ${item.quantity}`
            };
          }
        }

        // 2. 生成生产领料出库单（status: completed 触发仓库 store 事件驱动自动扣减库存）
        //    出库单经 warehouseStore.addOutboundOrder 中央双写落 D1（type='pick', sourceNo=工单号）。
        const outboundOrder = {
          id: outboundId,
          outboundNo,
          type: 'pick' as const,
          sourceNo: wo.orderNo,
          status: 'completed' as const,
          warehouseId: 'wh-001',
          warehouseName: '原材料仓',
          operator: wo.supervisor || '生产主管',
          outboundDate: today,
          remarks: `生产领料 - 工单${wo.orderNo} - ${wo.productName}`,
          items: items.map((item, idx) => ({
            id: `ob-wo-item-${idx}`,
            materialId: item.materialId,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: '',
            unit: item.unit,
            quantity: item.quantity,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: wo.supervisor || 'system',
          updatedBy: wo.supervisor || 'system',
        };
        wh.addOutboundOrder(outboundOrder);

        // 双写：工单领料明细逐条落 D1（POST /api/work-orders/picking），与本地领料明细一一对应
        if (isAuthed()) {
          for (const item of items) {
            b2Api
              .postPicking({
                workOrderId: wo.id,
                workOrderNo: wo.orderNo,
                materialId: item.materialId,
                materialCode: item.materialCode,
                materialName: item.materialName,
                unit: item.unit,
                quantity: item.quantity,
                outboundNo,
                issuedAt: today,
              })
              .catch(() => { useGlobalToastStore.getState().showError('工单领料明细同步失败，库存与领料记录可能不一致'); });
          }
        }

        // 3. 回写工单领料明细（防重复领料）
        const issuedMaterials: IssuedMaterial[] = items.map((item, idx) => ({
          id: `issued-${stamp}-${idx}`,
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          issuedAt: today,
          outboundNo,
        }));

        set((s) => ({
          workOrders: s.workOrders.map((o) =>
            o.id === id ? { ...o, issuedMaterials, updatedAt: new Date().toISOString() } : o
          ),
        }));

        return { ok: true, outboundNo };
      },
      // 对标 SAP 生产收货 101：借 1405 库存商品 / 贷 5001 生产成本 = 工单 actualTotalCost
      completeWorkOrder: async (id, payload) => {
        const wo = get().workOrders.find((o) => o.id === id);
        if (!wo) return { ok: false, reason: '工单不存在' };
        // 幂等：已完工/已关闭不再重复回写（避免重复入库与重复凭证）
        if (wo.status === 'completed' || wo.status === 'closed') {
          return { ok: false, reason: '该工单已完工或已关闭，不可重复完工' };
        }

        const completedQty = payload.completedQuantity ?? wo.plannedQuantity;
        const scrapQty = payload.scrapQuantity ?? 0;
        const qualifiedQty = Math.max(0, completedQty - scrapQty);
        const actualEndDate = payload.actualEndDate || new Date().toISOString().slice(0, 10);
        const actualTotalCost = payload.actualTotalCost ?? wo.actualTotalCost ?? 0;

        // 反查成品物料主数据（按 productCode 命中 B3 新增 mat-fg-xxx，落正确的 materialId）
        const mat = useMaterialStore.getState().materials.find((m) => m.code === wo.productCode);
        if (!mat) {
          return { ok: false, reason: `未找到产成品 ${wo.productCode} 的物料主数据，无法完工入库` };
        }

        // ① 先把完工提交到服务端（D1）。
        //    为什么必须在改内存之前：完工是不可逆动作（状态机锁定 completed 不可回退），
        //    且服务端在这次调用里会做倒冲发料。若先改内存再提交、提交失败了，
        //    界面显示「已完工」而库里根本没有，用户以为完成了，是最坏的结果。
        //    离线/未登录时（isAuthed 为假）跳过提交，沿用纯内存行为，保证演示流程可用。
        let backflush: CompleteWorkOrderResult['backflush'];
        if (isAuthed()) {
          try {
            const res: any = await workOrderApi.updateWorkOrder(id, {
              status: 'completed',
              completedQuantity: completedQty,
              scrapQuantity: scrapQty,
              qualifiedQuantity: qualifiedQty,
              actualEndDate,
              actualTotalCost,
            });
            backflush = res?.backflush;
          } catch (e: any) {
            return {
              ok: false,
              reason: `完工未保存到服务端：${e?.message || '请求失败'}。请检查网络后重试（工单状态未变更）。`,
            };
          }
        }

        // ② 回写工单状态/数量/成本（completed + 合格数量 + 实际完工日期 + 实际生产成本）
        set((s) => ({
          workOrders: s.workOrders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: 'completed',
                  completedQuantity: completedQty,
                  scrapQuantity: scrapQty,
                  qualifiedQuantity: qualifiedQty,
                  actualEndDate,
                  actualTotalCost,
                  // 倒冲成功后把服务端标记同步到内存，界面刷新前也能看到「原料已倒冲」
                  ...(backflush?.posted
                    ? { inventoryPosted: true, backflushOutboundNo: backflush.outboundNo }
                    : {}),
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        }));

        const stamp = Date.now();
        // 完工单位成本（4 位精度），用于滚动成品移动平均价
        const unitPrice = qualifiedQty > 0 ? roundPrice(actualTotalCost / qualifiedQty) : 0;
        const wh = useWarehouseStore.getState();

        // ② 生成成品入库单（事件驱动：completed → 自动过账库存 + 滚动移动均价 + 生成生产成本凭证）
        wh.addInboundOrder({
          id: `ib-prod-${stamp}`,
          inboundNo: `IB-PROD-${stamp}`,
          type: 'production',
          sourceNo: wo.orderNo,
          status: 'completed',
          warehouseId: 'wh-002',
          warehouseName: '成品仓',
          operator: payload.operator || '当前用户',
          inboundDate: actualEndDate,
          items: [
            {
              id: `ibpi-${stamp}`,
              materialId: mat.id,
              materialCode: mat.code,
              materialName: mat.name,
              specification: mat.specification,
              unit: mat.unit,
              expectedQuantity: qualifiedQty,
              actualQuantity: qualifiedQty,
              // V3.67.0 立项②：完工入库明细补批次号（沿用 fgi 成品批次口径 B${完工日期}），
              // 触发 postInboundToInventory 批次成本快照（cost = unitPrice×合格量 = 完工结转成本），
              // 成品批次正式进批次台账，批次级成本对账不再只算采购入库侧
              batchNo: `B${actualEndDate.replace(/-/g, '')}`,
              qualityStatus: 'qualified' as const,
              unitPrice,
              amount: roundAmount(actualTotalCost),
            },
          ],
          totalCost: roundAmount(actualTotalCost),
          remarks: `工单 ${wo.orderNo} 完工入库（合格 ${qualifiedQty} / 报废 ${scrapQty}）`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: payload.operator || '当前用户',
          updatedBy: payload.operator || '当前用户',
        });

        // ③ 同步生成成品入库台账（FinishedGoodsInbound），保持生产 → 仓储交接单据完整可追溯
        const fgi: FinishedGoodsInbound = {
          id: `fgi-${stamp}`,
          inboundNo: `FIN-PROD-${stamp}`,
          workOrderId: wo.id,
          workOrderNo: wo.orderNo,
          productId: mat.id,
          productCode: mat.code,
          productName: mat.name,
          specification: mat.specification || '',
          unit: mat.unit,
          plannedQty: wo.plannedQuantity,
          actualQty: completedQty,
          qualifiedQty,
          rejectedQty: scrapQty,
          batchNo: `B${actualEndDate.replace(/-/g, '')}`,
          warehouseId: 'wh-002',
          warehouseName: '成品仓',
          status: 'completed',
          operator: payload.operator || '当前用户',
          inboundDate: actualEndDate,
          remarks: `工单 ${wo.orderNo} 完工入库`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: payload.operator || '当前用户',
          updatedBy: payload.operator || '当前用户',
        };
        wh.addFinishedGoodsInbound(fgi);

        return { ok: true, backflush };
      },

      // ── MRP：平表切片 → 通用实体路由 /api/entities/mrpRecommendation ──
      // 全部调用点都不 await 返回值，故「同步改内存 → 异步落库 → 失败回滚」即可。
      addMrpRecommendation: async (rec) => {
        set((s) => ({ mrpRecommendations: addArr(s.mrpRecommendations, rec) }));
        try {
          await productionDomainApi.mrpRecommendations.create(rec as any);
        } catch (e) {
          set((s) => ({ mrpRecommendations: deleteArr(s.mrpRecommendations, rec.id), syncError: readableError(e) }));
        }
      },
      updateMrpRecommendation: async (id, u) => {
        const prev = get().mrpRecommendations.find((m) => m.id === id);
        set((s) => ({ mrpRecommendations: updateArr(s.mrpRecommendations, id, u) }));
        try {
          await productionDomainApi.mrpRecommendations.update(id, u as any);
        } catch (e) {
          if (prev) set((s) => ({ mrpRecommendations: updateArr(s.mrpRecommendations, id, prev), syncError: readableError(e) }));
        }
      },
      deleteMrpRecommendation: async (id) => {
        const prev = get().mrpRecommendations.find((m) => m.id === id);
        set((s) => ({ mrpRecommendations: deleteArr(s.mrpRecommendations, id) }));
        try {
          await productionDomainApi.mrpRecommendations.remove(id);
        } catch (e) {
          if (prev) set((s) => ({ mrpRecommendations: addArr(s.mrpRecommendations, prev), syncError: readableError(e) }));
        }
      },
      /**
       * 整体替换（BOMDetail 用：MRP 一次算出一批建议，整份覆盖）。
       *
       * ★ 与「明确的单条动作」不同，这里**必须在 store 内算差量**
       *   （新增 → POST / 变更 → PUT / 删除 → DELETE）。
       * ★ 判「变了没」用**序列化逐字符比较**，不能用引用比较：
       *   MRPPlan 每次重算都会构造全新对象，按引用判断会白发一轮全量 PUT。
       */
      setMrpRecommendations: async (recs) => {
        const prev = get().mrpRecommendations;
        set({ mrpRecommendations: recs });
        try {
          const prevMap = new Map(prev.map((m) => [m.id, m]));
          const nextMap = new Map(recs.map((m) => [m.id, m]));
          for (const m of recs) {
            const old = prevMap.get(m.id);
            if (!old) {
              await productionDomainApi.mrpRecommendations.create(m as any);
            } else if (JSON.stringify(old) !== JSON.stringify(m)) {
              await productionDomainApi.mrpRecommendations.update(m.id, m as any);
            }
          }
          for (const m of prev) {
            if (!nextMap.has(m.id)) {
              try { await productionDomainApi.mrpRecommendations.remove(m.id); } catch { /* 尽力而为 */ }
            }
          }
        } catch (e) {
          set({ mrpRecommendations: prev, syncError: readableError(e) });
        }
      },

      // ── ProcessRoute：带嵌套 → 专用父子表端点 /api/process-routes ──
      // ★ 与父表更新语义对齐：不传 operations = 工序保持原样；传 [] = 清空。
      //   ProcessRouteList 的 updateProcessRoute 会整份传 operations（含 id），
      //   因此这里是「显式替换」，语义正确。
      addProcessRoute: async (route) => {
        set((s) => ({ processRoutes: addArr(s.processRoutes, route) }));
        try {
          await productionDomainApi.processRoutes.create(route as any);
        } catch (e) {
          set((s) => ({ processRoutes: deleteArr(s.processRoutes, route.id), syncError: readableError(e) }));
        }
      },
      updateProcessRoute: async (id, u) => {
        const prev = get().processRoutes.find((r) => r.id === id);
        set((s) => ({ processRoutes: updateArr(s.processRoutes, id, u) }));
        try {
          await productionDomainApi.processRoutes.update(id, u as any);
        } catch (e) {
          if (prev) set((s) => ({ processRoutes: updateArr(s.processRoutes, id, prev), syncError: readableError(e) }));
        }
      },
      deleteProcessRoute: async (id) => {
        const prev = get().processRoutes.find((r) => r.id === id);
        set((s) => ({ processRoutes: deleteArr(s.processRoutes, id) }));
        try {
          await productionDomainApi.processRoutes.remove(id);
        } catch (e) {
          if (prev) set((s) => ({ processRoutes: addArr(s.processRoutes, prev), syncError: readableError(e) }));
        }
      },

      // ── C1：从 D1 拉取本域全部已关系化切片 ──
      load: async () => {
        const [routes, mrp] = await Promise.all([
          pullSlice<ProcessRoute>(
            productionDomainApi.processRoutes, mockProcessRoutes, FLAG.processRoutes, 'processRoutes'
          ),
          pullSlice<MRPRecommendation>(
            productionDomainApi.mrpRecommendations, mockMrpRecommendations, FLAG.mrp, 'mrpRecommendations'
          ),
        ]);

        const patch: Partial<ProductionState> = {};
        // pullSlice 返回 null = 拉取失败 → 保留内存种子，不覆盖（避免把有内容的表刷成空）
        if (routes) patch.processRoutes = routes;
        if (mrp) patch.mrpRecommendations = mrp;

        const failed = [routes, mrp].filter((x) => x === null).length;
        set({
          ...patch,
          loaded: true,
          syncError:
            failed === 2
              ? '无法从服务器读取生产数据：网络或登录状态异常（当前显示的是本机示例数据）'
              : failed > 0
                ? `生产数据部分切片读取失败（${failed}/2），未成功的已保留本机数据`
                : '',
        });

        // 工单沿用既有 D1 通道（V2.75.x 已直连）
        await get().loadWorkOrders();
      },
    })
);
