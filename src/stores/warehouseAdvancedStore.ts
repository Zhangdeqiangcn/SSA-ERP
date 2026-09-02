import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import {
  StockTransfer, InventoryAdjustment, SerialMaster, QualityHold,
  InboundOrder, OutboundOrder,
} from '@/types';
import { serialApi } from '@/services/serial';

// W1-B1：序列号 / HU 主数据改为直连真实 D1 serial_masters（专用服务 serialApi，走 api 客户端），
// 替代原 b2Api 双写桥。serialMasters 不再落 app_state Blob（partialize 已移除），D1 为唯一真源，
// 根治双通道。stockTransfers / inventoryAdjustments / qualityHolds 三切片仍走 Blob（本批未迁移）。
// 在线时：loadSerialMasters 从 D1 拉取、增删改经 serialApi 写回；离线/未登录/异常回退内存 seed。

const SERIAL_BACKFILL_FLAG = 'ssa-erp-serial-backfilled';

import { useWarehouseStore } from '@/stores/warehouseStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useOrgStore } from '@/stores/orgStore';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

// ── C1 追溯链路种子：序列号 SN-2024-0001（交流接触器 / 批次 HQ20240508）──
const seedSerialMasters: SerialMaster[] = [
  {
    id: 'sn-001',
    serialNo: 'SN-2024-0001',
    materialId: 'mat-009',
    materialCode: 'MAT202405010009',
    materialName: '交流接触器 CJX2',
    batchNo: 'HQ20240508',
    warehouseId: 'wh-001',
    status: 'shipped',
    inboundDate: '2024-05-08',
    outboundDate: '2024-06-10',
    customerName: '宁波钢结构有限公司',
    remarks: 'C1 序列号追溯种子：交流接触器单件 SN-2024-0001（批次 HQ20240508）',
    movements: [
      { type: 'inbound', docNo: 'IN20240508001', date: '2024-05-08', status: 'in_stock', note: '深圳华强电气有限公司 入库' },
      { type: 'delivery', docNo: 'OUT20240610001', date: '2024-06-10', status: 'shipped', note: '销售发货至 宁波钢结构有限公司' },
    ],
    createdAt: "2024-05-08T08:00:00.000Z",
    updatedAt: "2024-06-10T08:00:00.000Z",
    createdBy: "system",
    updatedBy: "system",
  },
];

interface WarehouseAdvancedState {
  stockTransfers: StockTransfer[];
  inventoryAdjustments: InventoryAdjustment[];
  serialMasters: SerialMaster[];
  qualityHolds: QualityHold[];

  // 跨组织转储
  addStockTransfer: (t: StockTransfer) => void;
  updateStockTransfer: (id: string, u: Partial<StockTransfer>) => void;
  deleteStockTransfer: (id: string) => void;
  // 确认转储 → 调出方出库 + 调入方入库（双边过账）
  confirmTransfer: (transferId: string) => void;

  // 库存调整单
  addInventoryAdjustment: (a: InventoryAdjustment) => void;
  updateInventoryAdjustment: (id: string, u: Partial<InventoryAdjustment>) => void;
  deleteInventoryAdjustment: (id: string) => void;
  // 过账 → 调整库存 + 生成存货凭证
  postAdjustment: (adjustmentId: string) => void;

  // 序列号 / HU 主数据（W1-B1：直连 D1 serial_masters）
  loadSerialMasters: () => Promise<void>;
  addSerialMaster: (s: SerialMaster) => Promise<void>;
  updateSerialMaster: (id: string, u: Partial<SerialMaster>) => Promise<void>;
  deleteSerialMaster: (id: string) => Promise<void>;

  // 质检扣留（质检库存状态）
  addQualityHold: (h: QualityHold) => void;
  releaseQualityHold: (id: string, status: 'passed' | 'rejected', inspector?: string) => void;
}

export const useWarehouseAdvancedStore = create<WarehouseAdvancedState>()(
  persist(
    (set, get) => ({
      stockTransfers: [],
      inventoryAdjustments: [],
      serialMasters: seedSerialMasters,
      qualityHolds: [],

      // ── 跨组织转储 ──
      addStockTransfer: (t) => set((s) => ({ stockTransfers: [...s.stockTransfers, t] })),
      updateStockTransfer: (id, u) =>
        set((s) => ({ stockTransfers: s.stockTransfers.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteStockTransfer: (id) => set((s) => ({ stockTransfers: s.stockTransfers.filter((x) => x.id !== id) })),
      // 确认转储：调出方出库 + 调入方入库
      confirmTransfer: (transferId) => {
        const t = get().stockTransfers.find((x) => x.id === transferId);
        if (!t || t.status !== 'draft') return;
        const stamp = Date.now();
        const orgState = useOrgStore.getState();
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-trf-${stamp}`,
          outboundNo: `OB-TRF-${stamp}`,
          type: 'transfer',
          sourceNo: t.transferNo,
          status: 'completed',
          warehouseId: t.fromWarehouseId,
          warehouseName: t.fromWarehouseName,
          orgId: t.fromOrgId,
          operator: '当前用户',
          outboundDate: t.transferDate,
          items: t.items.map((it) => ({
            id: `obti-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            quantity: it.quantity,
            batchNo: it.batchNo,
            locationId: it.locationId,
          })),
          remarks: `跨组织转储调出 ${t.transferNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '当前用户',
          updatedBy: '当前用户',
        });
        useWarehouseStore.getState().addInboundOrder({
          id: `ib-trf-${stamp}`,
          inboundNo: `IB-TRF-${stamp}`,
          type: 'transfer',
          sourceNo: t.transferNo,
          status: 'completed',
          warehouseId: t.toWarehouseId,
          warehouseName: t.toWarehouseName,
          orgId: t.toOrgId,
          operator: '当前用户',
          inboundDate: t.transferDate,
          items: t.items.map((it) => ({
            id: `ibti-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            expectedQuantity: it.quantity,
            actualQuantity: it.quantity,
            batchNo: it.batchNo,
            locationId: it.locationId,
            qualityStatus: 'qualified' as const,
          })),
          remarks: `跨组织转储调入 ${t.transferNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '当前用户',
          updatedBy: '当前用户',
        });
        set((s) => ({
          stockTransfers: s.stockTransfers.map((x) =>
            x.id === transferId ? { ...x, status: 'completed', fromOrgId: x.fromOrgId || orgState.organizations.find((o) => o.id !== x.toOrgId)?.id } : x
          ),
        }));
      },

      // ── 库存调整单 ──
      addInventoryAdjustment: (a) => set((s) => ({ inventoryAdjustments: [...s.inventoryAdjustments, a] })),
      updateInventoryAdjustment: (id, u) =>
        set((s) => ({ inventoryAdjustments: s.inventoryAdjustments.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteInventoryAdjustment: (id) => set((s) => ({ inventoryAdjustments: s.inventoryAdjustments.filter((x) => x.id !== id) })),
      // 过账：调整库存 + 存货凭证
      postAdjustment: (adjustmentId) => {
        const adj = get().inventoryAdjustments.find((x) => x.id === adjustmentId);
        if (!adj || adj.status === 'posted') return;
        const wh = useWarehouseStore.getState();
        const materials = useMaterialStore.getState().materials;
        let records = [...wh.inventoryRecords];
        let totalValue = 0;
        for (const it of adj.items) {
          const price = materials.find((m) => m.id === it.materialId)?.price || 0;
          totalValue += it.deltaQty * price;
          const idx = records.findIndex(
            (r) => r.materialId === it.materialId && (it.locationId ? r.locationId === it.locationId : r.warehouseId === adj.warehouseId)
          );
          if (idx >= 0) {
            const nextQty = Math.max(0, records[idx].quantity + it.deltaQty);
            records = records.map((r, i) =>
              i === idx
                ? {
                    ...r,
                    quantity: nextQty,
                    availableQuantity: Math.max(0, r.availableQuantity + it.deltaQty),
                    lastInboundDate: it.deltaQty > 0 ? today() : r.lastInboundDate,
                    lastOutboundDate: it.deltaQty < 0 ? today() : r.lastOutboundDate,
                  }
                : r
            );
          } else if (it.deltaQty > 0) {
            records = [
              ...records,
              {
                id: `inv-${it.materialId}-${adj.warehouseId}-${it.locationId || 'default'}-${Date.now()}`,
                materialId: it.materialId,
                materialCode: it.materialCode || '',
                materialName: it.materialName || '',
                specification: '',
                warehouseId: adj.warehouseId,
                warehouseName: adj.warehouseName,
                orgId: wh.inventoryRecords.find((r) => r.warehouseId === adj.warehouseId)?.orgId,
                locationId: it.locationId,
                locationName: '',
                quantity: it.deltaQty,
                availableQuantity: it.deltaQty,
                frozenQuantity: 0,
                unit: it.unit || '',
                lastInboundDate: today(),
              },
            ];
          }
        }
        wh.setInventoryRecords(records);
        // 存货凭证：盘盈 借库存商品 贷待处理；盘亏相反
        if (totalValue !== 0) {
          const stamp = Date.now();
          const voucherNo = `V-ADJ-${adj.adjustmentNo}-${stamp}`;
          const entries = [
            {
              id: `aea-${stamp}-1`, entryNo: `JEADJ${stamp}1`, date: adj.date,
              description: `库存调整 ${adj.adjustmentNo}`,
              debitAccount: totalValue > 0 ? '库存商品' : '待处理财产损溢',
              creditAccount: totalValue > 0 ? '待处理财产损溢' : '库存商品',
              amount: Math.abs(totalValue), currency: 'CNY', voucherNo, createdBy: '当前用户',
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
            },
          ];
          entries.forEach((e) => useFinanceStore.getState().addAccountEntry(e));
          set((s) => ({
            inventoryAdjustments: s.inventoryAdjustments.map((x) => (x.id === adjustmentId ? { ...x, status: 'posted', voucherNo } : x)),
          }));
        } else {
          set((s) => ({
            inventoryAdjustments: s.inventoryAdjustments.map((x) => (x.id === adjustmentId ? { ...x, status: 'posted' } : x)),
          }));
        }
      },

      // ── 序列号 / HU（W1-B1：直连 D1 serial_masters）──
      // 启动期从 D1 拉取；空库（且本机未回填过）回填种子一次，消除双源过渡缺口。
      loadSerialMasters: async () => {
        try {
          const res = await serialApi.list({ page: 1, pageSize: 200 });
          const list = (res?.data || []) as SerialMaster[];
          set({ serialMasters: list });
          if (list.length === 0 && !window.localStorage.getItem(SERIAL_BACKFILL_FLAG)) {
            window.localStorage.setItem(SERIAL_BACKFILL_FLAG, '1');
            for (const s of seedSerialMasters) {
              try {
                const created = await serialApi.create(s);
                // 回填流转轨迹（入库 + 发货）
                for (const mv of s.movements || []) {
                  if (created?.id) {
                    try {
                      await serialApi.update(created.id, { movement: mv } as Partial<SerialMaster> & { movement: SerialMaster['movements'] extends Array<infer M> ? M : never });
                    } catch {
                      /* 轨迹回填尽力而为 */
                    }
                  }
                }
              } catch {
                /* 编码冲突等忽略，回填尽力而为 */
              }
            }
            const refreshed = await serialApi.list({ page: 1, pageSize: 200 });
            set({ serialMasters: (refreshed?.data || []) as SerialMaster[] });
          }
        } catch {
          // 离线/未登录/接口异常：保留内存 seedSerialMasters，不阻断 UI
        }
      },
      // 乐观更新先行；写 D1 后把本地 id 对齐为 D1 id（sm-...），保证后续 PUT/DELETE 精准。
      addSerialMaster: async (s) => {
        set((state) => ({ serialMasters: [...state.serialMasters, s] }));
        try {
          const created = await serialApi.create(s);
          if (created?.id && created.id !== s.id) {
            set((state) => ({
              serialMasters: state.serialMasters.map((x) =>
                x.id === s.id ? { ...x, id: created.id, movements: created.movements || x.movements } : x
              ),
            }));
          }
        } catch {
          /* 写失败：保留内存态（离线容忍） */
        }
      },
      updateSerialMaster: async (id, u) => {
        set((state) => ({ serialMasters: state.serialMasters.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) }));
        const merged = useWarehouseAdvancedStore.getState().serialMasters.find((x) => x.id === id);
        if (merged) {
          try {
            await serialApi.update(id, merged);
          } catch {
            /* 写失败：保留内存态 */
          }
        }
      },
      deleteSerialMaster: async (id) => {
        set((state) => ({ serialMasters: state.serialMasters.filter((x) => x.id !== id) }));
        try {
          await serialApi.remove(id);
        } catch {
          /* 写失败：保留内存态 */
        }
      },

      // ── 质检扣留 ──
      addQualityHold: (h) => set((state) => ({ qualityHolds: [...state.qualityHolds, h] })),
      releaseQualityHold: (id, status, inspector) =>
        set((state) => ({
          qualityHolds: state.qualityHolds.map((x) =>
            x.id === id ? { ...x, status, releaseDate: today(), inspector: inspector || x.inspector } : x
          ),
        })),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-wh-adv',
      version: 1,
      partialize: (state) => ({
        stockTransfers: state.stockTransfers,
        inventoryAdjustments: state.inventoryAdjustments,
        // W1-B1：serialMasters 不再落 Blob（已直连 D1），从 partialize 移除
        qualityHolds: state.qualityHolds,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// B2 事件驱动：序列号自动登记 / 核销（打通「序列号孤岛」）
// ---------------------------------------------------------------
// 规则：
//   1. 入库单完成过账 → 对 serialized 物料按数量自动生成序列号并登记为 in_stock；
//      单据行若已显填 serialNos 则以显填为准（预留逐件扫码界面的接入口）。
//   2. 出库单完成过账 → 按 FIFO 取在库序列号自动核销：
//      sale=shipped / pick=scrapped(领用消耗) / subcontract=in_transit(在供应商处) / transfer=in_transit。
//   3. 每次流转在 serial_masters 状态 + serial_movements 追加一条轨迹，形成一物一码全生命周期。
//   4. 幂等：种子单据 rehydration 前后一律标记已见，只处理「本次变更真正新增」的单据。
//   5. W1-B1：登记/核销经 serialApi 直写 D1（本地 id 在 create 后对齐 D1 id），不再走 b2Api 双写桥。
// ═══════════════════════════════════════════════════════════════

/** 出库类型 → 序列号流转后状态 */
const OUTBOUND_SN_STATUS: Record<string, SerialMaster['status']> = {
  sale: 'shipped',
  pick: 'scrapped',
  subcontract: 'in_transit',
  transfer: 'in_transit',
  return: 'shipped',
};

/** 出库类型 → 轨迹事件类型 */
const OUTBOUND_SN_MOVE: Record<string, NonNullable<SerialMaster['movements']>[number]['type']> = {
  sale: 'delivery',
  pick: 'issue',
  subcontract: 'subcontract',
  transfer: 'transfer',
  return: 'delivery',
};

const __snSeenIn = new Set<string>();
const __snSeenOut = new Set<string>();
const __snMarkSeen = () => {
  const wh = useWarehouseStore.getState();
  wh.inboundOrders.forEach((o) => __snSeenIn.add(o.id));
  wh.outboundOrders.forEach((o) => __snSeenOut.add(o.id));
};
// 延迟到模块初始化完成后执行：避免 warehouseStore 静态 import 本模块时，
// 顶层直接访问 useWarehouseStore 触发循环依赖 TDZ（Cannot access ... before initialization）
setTimeout(() => {
  __snMarkSeen();
  if (useWarehouseStore.persist?.onFinishHydration) {
    useWarehouseStore.persist.onFinishHydration(__snMarkSeen);
  }
}, 0);

/** 判断物料是否受序列号管控 */
const isSerialized = (materialId: string): boolean =>
  !!useMaterialStore.getState().materials.find((m) => m.id === materialId)?.serialized;

/** 入库：登记序列号为在库 */
const registerSerialsOnInbound = (o: InboundOrder) => {
  const store = useWarehouseAdvancedStore.getState();
  const existing = new Set(store.serialMasters.map((s) => s.serialNo));
  const created: SerialMaster[] = [];

  for (const item of o.items || []) {
    if (!isSerialized(item.materialId)) continue;
    const qty = Math.floor(item.actualQuantity || item.expectedQuantity || 0);
    if (qty <= 0) continue;
    // 显填优先；未填则按「单号-行号-序号」自动编码
    const nos =
      item.serialNos && item.serialNos.length > 0
        ? item.serialNos
        : Array.from({ length: qty }, (_, i) => `SN-${o.inboundNo}-${String(i + 1).padStart(3, '0')}`);
    nos.forEach((sn) => {
      if (existing.has(sn)) return;
      existing.add(sn);
      created.push({
        id: uid('sn'),
        serialNo: sn,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        batchNo: item.batchNo,
        warehouseId: o.warehouseId,
        huId: item.huId,
        status: 'in_stock',
        inboundDate: o.inboundDate,
        remarks: `${o.type === 'subcontract' ? '委外收货' : o.type === 'purchase' ? '采购收货' : '入库'}自动登记 ${o.inboundNo}`,
        movements: [
          { type: 'inbound', docNo: o.inboundNo, date: o.inboundDate, status: 'in_stock', note: o.warehouseName || o.vendorName },
        ],
        createdAt: today(),
        updatedAt: today(),
        createdBy: '系统',
        updatedBy: '系统',
      } as SerialMaster);
    });
  }
  if (created.length > 0) {
    useWarehouseAdvancedStore.setState((s) => ({ serialMasters: [...s.serialMasters, ...created] }));
    // W1-B1：入库自动登记的序列号直写 D1；create 返回 D1 id（sm-...），本地对齐，
    // 这样后续 FIFO 核销（consumeSerialsOnOutbound）用同一 id 精准 PUT。
    for (const sn of created) {
      serialApi.create(sn).then((data) => {
        if (data?.id && data.id !== sn.id) {
          useWarehouseAdvancedStore.setState((s) => ({
            serialMasters: s.serialMasters.map((x) => (x.id === sn.id ? { ...x, id: data.id, movements: data.movements || x.movements } : x)),
          }));
        }
      }).catch(() => {});
    }
  }
};

/** 出库：核销序列号状态 + 追加轨迹 */
const consumeSerialsOnOutbound = (o: OutboundOrder) => {
  const nextStatus = OUTBOUND_SN_STATUS[o.type] || 'shipped';
  const moveType = OUTBOUND_SN_MOVE[o.type] || 'delivery';
  const store = useWarehouseAdvancedStore.getState();
  const picked = new Map<string, SerialMaster['status']>(); // serialNo → 新状态

  for (const item of o.items || []) {
    if (!isSerialized(item.materialId)) continue;
    const qty = Math.floor(item.quantity || 0);
    if (qty <= 0) continue;
    if (item.serialNos && item.serialNos.length > 0) {
      item.serialNos.forEach((sn) => picked.set(sn, nextStatus));
      continue;
    }
    // 未显填 → FIFO 取在库序列号（按入库日期 + 编号排序）
    const candidates = store.serialMasters
      .filter((s) => s.materialId === item.materialId && s.status === 'in_stock' && !picked.has(s.serialNo))
      .sort((a, b) => (a.inboundDate || '').localeCompare(b.inboundDate || '') || a.serialNo.localeCompare(b.serialNo))
      .slice(0, qty);
    candidates.forEach((s) => picked.set(s.serialNo, nextStatus));
  }
  if (picked.size === 0) return;

  useWarehouseAdvancedStore.setState((s) => ({
    serialMasters: s.serialMasters.map((sm) => {
      const st = picked.get(sm.serialNo);
      if (!st) return sm;
      return {
        ...sm,
        status: st,
        outboundDate: o.outboundDate,
        customerName: o.customerName || sm.customerName,
        movements: [
          ...(sm.movements || []),
          { type: moveType, docNo: o.outboundNo, date: o.outboundDate, status: st, note: o.customerName || o.remarks },
        ],
        updatedAt: today(),
        updatedBy: '系统',
      };
    }),
  }));

  // W1-B1：核销结果直写 D1。本地 id 已对齐 D1 id，PUT 精准；附带 movement 落 serial_movements。
  const masters = useWarehouseAdvancedStore.getState().serialMasters;
  for (const serialNo of picked.keys()) {
    const sm = masters.find((m) => m.serialNo === serialNo);
    if (!sm) continue;
    serialApi.update(sm.id, {
      status: sm.status,
      outboundDate: sm.outboundDate,
      customerName: sm.customerName,
      movement: { type: moveType, docNo: o.outboundNo, date: o.outboundDate, status: sm.status, note: o.customerName || o.remarks },
    } as Partial<SerialMaster> & { movement: SerialMaster['movements'] extends Array<infer M> ? M : never }).catch(() => {});
  }
};

// 延迟注册订阅：避免 warehouseStore 静态 import 本模块时顶层访问 useWarehouseStore 触发循环依赖 TDZ
setTimeout(() => {
  useWarehouseStore.subscribe((state, prev) => {
    const prevIn = new Set((prev?.inboundOrders || []).map((o) => o.id));
    for (const o of state.inboundOrders) {
      if (prevIn.has(o.id) || __snSeenIn.has(o.id)) continue;
      __snSeenIn.add(o.id);
      if (o.status === 'completed') registerSerialsOnInbound(o);
    }
    const prevOut = new Set((prev?.outboundOrders || []).map((o) => o.id));
    for (const o of state.outboundOrders) {
      if (prevOut.has(o.id) || __snSeenOut.has(o.id)) continue;
      __snSeenOut.add(o.id);
      if (o.status === 'completed') consumeSerialsOnOutbound(o);
    }
  });
}, 0);
