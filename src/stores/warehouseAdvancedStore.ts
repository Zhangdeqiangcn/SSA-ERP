import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import {
  StockTransfer, InventoryAdjustment, SerialMaster, QualityHold,
  InboundOrder, OutboundOrder,
} from '@/types';
import { b2Api, isAuthed } from '@/services/b2Api';

// B2 双写桥：本地 serialMasters 的 id 是前端 uid（'sn-...'），与 D1 后端的自增/生成 id 不同，
// 这里用模块级映射表把「本次会话新建/登记的序列号 localId → D1 backendId」桥接起来。
// 注意：映射表仅存活于当前会话（不落盘、不改类型），刷新后重建；
// 因此刷新前已存在（rehydration 恢复）的序列号，本会话内无法回写 D1（见报告「未覆盖点」）。
const serialBackendId = new Map<string, string>();

/** 把 SerialMaster 映射为 POST /api/serial-numbers 允许的字段（严格照后端字段调用） */
const toSerialPayload = (s: SerialMaster): Record<string, unknown> => ({
  serialNo: s.serialNo,
  materialId: s.materialId,
  materialCode: s.materialCode,
  materialName: s.materialName,
  batchNo: s.batchNo,
  warehouseId: s.warehouseId,
  huId: s.huId,
  status: s.status,
  inboundDate: s.inboundDate,
  customerName: s.customerName,
  remarks: s.remarks,
});
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

  // 序列号 / HU 主数据
  addSerialMaster: (s: SerialMaster) => void;
  updateSerialMaster: (id: string, u: Partial<SerialMaster>) => void;
  deleteSerialMaster: (id: string) => void;

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

      // ── 序列号 / HU ──
      // 双写：本地更新先行；登录态下再 fire-and-forget 落 D1（失败静默忽略，不影响本地 UI）
      addSerialMaster: (s) => {
        set((state) => ({ serialMasters: [...state.serialMasters, s] }));
        if (isAuthed()) {
          b2Api
            .postSerial(toSerialPayload(s))
            .then((data) => {
              if (data && data.id) serialBackendId.set(s.id, data.id);
            })
            .catch(() => {});
        }
      },
      updateSerialMaster: (id, u) => {
        set((state) => ({ serialMasters: state.serialMasters.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) }));
        const backendId = serialBackendId.get(id);
        if (isAuthed() && backendId) {
          const merged = useWarehouseAdvancedStore.getState().serialMasters.find((x) => x.id === id);
          if (merged) b2Api.putSerial(backendId, toSerialPayload(merged)).catch(() => {});
        }
      },
      deleteSerialMaster: (id) => {
        set((state) => ({ serialMasters: state.serialMasters.filter((x) => x.id !== id) }));
        const backendId = serialBackendId.get(id);
        if (isAuthed() && backendId) {
          b2Api.deleteSerial(backendId).catch(() => {});
          serialBackendId.delete(id);
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
    { storage: backendStorage,
    
      name: 'ssa-erp-wh-adv',
      version: 1,
      partialize: (state) => ({
        stockTransfers: state.stockTransfers,
        inventoryAdjustments: state.inventoryAdjustments,
        serialMasters: state.serialMasters,
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
//   3. 每次流转在 SerialMaster.movements 追加一条轨迹，形成一物一码全生命周期。
//   4. 幂等：种子单据 rehydration 前后一律标记已见，只处理「本次变更真正新增」的单据。
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
    // 双写：入库自动登记的序列号同时落 D1，并把 backendId 记入映射表，
    // 这样后续 FIFO 核销（consumeSerialsOnOutbound）才能用「逐条 PUT」精准对齐前端状态。
    if (isAuthed()) {
      for (const sn of created) {
        b2Api
          .postSerial(toSerialPayload(sn))
          .then((data) => {
            if (data && data.id) serialBackendId.set(sn.id, data.id);
          })
          .catch(() => {});
      }
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

  // 双写（逐条 PUT 同步）：完全对齐前端 FIFO 取号结果，把受影响序列号的状态/outboundDate/customerName 同步到 D1。
  // 仅同步「本会话已落 D1（有 backendId）」的序列号；刷新前遗留、无 backendId 的序列号跳过（见报告未覆盖点）。
  // 选「逐条 PUT」而非 consume 端点：前端 FIFO 取号是权威结果，PUT 能逐件精确对齐，避免与后端取号不一致。
  if (isAuthed()) {
    const masters = useWarehouseAdvancedStore.getState().serialMasters;
    for (const serialNo of picked.keys()) {
      const sm = masters.find((m) => m.serialNo === serialNo);
      if (!sm) continue;
      const backendId = serialBackendId.get(sm.id);
      if (!backendId) continue;
      b2Api.putSerial(backendId, toSerialPayload(sm)).catch(() => {});
    }
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
