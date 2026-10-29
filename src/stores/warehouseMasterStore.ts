import { create } from 'zustand';
import { Warehouse, WarehouseLocation, WarehouseType } from '@/types';
import { b2Api, isAuthed } from '@/services/b2Api';

/**
 * 仓库 / 库位主数据（P2-2，替代各表单中的硬编码仓库名）
 * ------------------------------------------------------------
 * W4 整改：仓库主数据由「纯前端 localStorage 单人不共享」升级为「后端 D1 权威源 + 本地种子基线」。
 *   · 本地 seed 作为离线基线，保证未登录 / 后端异常时仍能渲染与业务表单取数；
 *   · 登录在线时 loadWarehouses() 从 /api/warehouses 拉取并「按 id 合并」——
 *     后端同 id 覆盖（权威）、后端独有追加、本地独有（如本会话新增）保留；
 *   · 所有写操作（增/改/删/库位）本地即时生效 + fire-and-forget 写穿后端，
 *     使后端 inventory_records.warehouse_name 等引用与界面同源（根治 W4 账面≠界面）。
 */

const today = (): string => new Date().toISOString().slice(0, 10);

const mkLoc = (
  id: string,
  code: string,
  name: string,
  warehouseId: string,
  zone?: string
): WarehouseLocation => ({
  id,
  code,
  name,
  warehouseId,
  zone,
  createdAt: today(),
  updatedAt: today(),
  createdBy: 'system',
  updatedBy: 'system',
});

const seedWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    code: 'WH001',
    name: '主仓库',
    orgId: 'ORG-001',
    type: 'raw',
    address: '上海市浦东新区世纪大道 100 号 厂区A',
    manager: '赵磊',
    status: 'active',
    locations: [
      mkLoc('loc-001', 'A-01-01', 'A区-01排-01架', 'wh-001', 'A区'),
      mkLoc('loc-002', 'A-01-02', 'A区-01排-02架', 'wh-001', 'A区'),
      mkLoc('loc-003', 'A-02-01', 'A区-02排-01架', 'wh-001', 'A区'),
      mkLoc('loc-004', 'A-01-05', 'A区-01排-05架', 'wh-001', 'A区'),
      mkLoc('loc-005', 'A-03-02', 'A区-03排-02架', 'wh-001', 'A区'),
      mkLoc('loc-009', 'A-03-01', 'A区-03排-01架', 'wh-001', 'A区'),
      mkLoc('loc-006', 'B-01-01', 'B区-01排-01架', 'wh-001', 'B区'),
      mkLoc('loc-007', 'B-01-02', 'B区-01排-02架', 'wh-001', 'B区'),
      mkLoc('loc-008', 'B-01-03', 'B区-01排-03架', 'wh-001', 'B区'),
      mkLoc('loc-010', 'B-02-03', 'B区-02排-03架', 'wh-001', 'B区'),
      mkLoc('loc-011', 'B-02-04', 'B区-02排-04架', 'wh-001', 'B区'),
      mkLoc('loc-012', 'A-03-01', 'A区-03排-01架', 'wh-001', 'A区'),
    ],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'wh-002',
    code: 'WH002',
    name: '辅料仓库',
    orgId: 'ORG-001',
    type: 'aux',
    manager: '孙倩',
    status: 'active',
    locations: [mkLoc('loc-020', 'C-01-01', 'C区-01排-01架', 'wh-002', 'C区')],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'wh-003',
    code: 'WH003',
    name: '成品仓库',
    orgId: 'ORG-001',
    type: 'finished',
    manager: '周敏',
    status: 'active',
    locations: [mkLoc('loc-fg-01', 'FG-01-01', '成品区-01排-01架', 'wh-003', '成品区')],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'wh-201',
    code: 'WH201',
    name: '华东原料库',
    orgId: 'ORG-002',
    type: 'raw',
    address: '江苏省苏州市工业园区星湖街 88 号',
    manager: '钱伟',
    status: 'active',
    locations: [mkLoc('loc-e-01', 'E-01-01', '华东-01排-01架', 'wh-201', '华东区')],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
];

/** 后端行（snake）→ 前端 Warehouse（W4：与 functions/_shared/warehouseShape.prevToWh 对应，但放在 src 侧避免跨边界引用） */
function rowToWarehouse(r: any): Warehouse {
  let locations: WarehouseLocation[] = [];
  try { locations = r.locations ? JSON.parse(r.locations) : []; } catch { locations = []; }
  return {
    id: r.id,
    orgId: r.org_id,
    code: r.code,
    name: r.name,
    type: r.type,
    address: r.address,
    manager: r.manager,
    status: r.status,
    locations: Array.isArray(locations) ? locations : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

/** 合并：本地种子基线 + 后端权威（同 id 后端覆盖；后端独有追加；本地独有保留） */
function mergeWarehouses(local: Warehouse[], backend: Warehouse[]): Warehouse[] {
  const map = new Map<string, Warehouse>();
  for (const w of local) map.set(w.id, w);
  for (const w of backend) map.set(w.id, w);
  return [...map.values()];
}

interface WarehouseMasterState {
  warehouses: Warehouse[];
  loadWarehouses: () => Promise<void>;
  addWarehouse: (w: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  updateWarehouse: (id: string, u: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  addLocation: (warehouseId: string, loc: Omit<WarehouseLocation, 'id' | 'warehouseId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  updateLocation: (warehouseId: string, locId: string, u: Partial<WarehouseLocation>) => void;
  deleteLocation: (warehouseId: string, locId: string) => void;
  resetWarehouses: () => void;
}

export const useWarehouseMasterStore = create<WarehouseMasterState>()(
  (set) => ({
      warehouses: [...seedWarehouses],

      // ── W4：在线拉取后端权威源并合并（离线/异常则保留本地种子）──
      loadWarehouses: async () => {
        if (!isAuthed()) return;
        try {
          const res = await b2Api.getWarehouses<{ data?: any[] }>();
          const list = (res?.data || []) as any[];
          const recs = list.map(rowToWarehouse).filter(Boolean) as Warehouse[];
          if (recs.length > 0) {
            set((state) => ({ warehouses: mergeWarehouses(state.warehouses, recs) }));
          }
        } catch {
          // 离线或后端异常：保持本地种子态，不阻断 UI
        }
      },

      // ── 新增仓库：本地即时 + 写穿后端（id 本地生成，前后端一致）──
      addWarehouse: (w) => {
        const newWh: Warehouse = {
          ...w,
          id: `wh-${Date.now()}`,
          createdAt: today(),
          updatedAt: today(),
          createdBy: 'admin',
          updatedBy: 'admin',
        };
        if (isAuthed()) {
          void b2Api.postWarehouse(newWh as unknown as Record<string, unknown>).catch(() => {});
        }
        set((state) => ({ warehouses: [...state.warehouses, newWh] }));
      },

      // ── 编辑仓库：本地即时 + 写穿后端 ──
      updateWarehouse: (id, u) => {
        let updated: Warehouse | undefined;
        set((state) => ({
          warehouses: state.warehouses.map((x) => {
            if (x.id !== id) return x;
            updated = { ...x, ...u, updatedAt: today(), updatedBy: 'admin' };
            return updated;
          }),
        }));
        if (updated && isAuthed()) {
          void b2Api.putWarehouse(id, updated as unknown as Record<string, unknown>).catch(() => {});
        }
      },

      // ── 删除仓库：本地即时 + 写穿后端 ──
      deleteWarehouse: (id) => {
        set((state) => ({ warehouses: state.warehouses.filter((x) => x.id !== id) }));
        if (isAuthed()) {
          void b2Api.deleteWarehouse(id).catch(() => {});
        }
      },

      // ── 新增库位：本地即时 + 写穿父仓库 ──
      addLocation: (warehouseId, loc) => {
        let parent: Warehouse | undefined;
        set((state) => ({
          warehouses: state.warehouses.map((w) => {
            if (w.id !== warehouseId) return w;
            const newLoc: WarehouseLocation = {
              ...loc,
              id: `loc-${Date.now()}`,
              warehouseId,
              createdAt: today(),
              updatedAt: today(),
              createdBy: 'admin',
              updatedBy: 'admin',
            };
            parent = { ...w, locations: [...w.locations, newLoc], updatedAt: today(), updatedBy: 'admin' };
            return parent;
          }),
        }));
        if (parent && isAuthed()) {
          void b2Api.putWarehouse(warehouseId, parent as unknown as Record<string, unknown>).catch(() => {});
        }
      },

      // ── 编辑库位：本地即时 + 写穿父仓库 ──
      updateLocation: (warehouseId, locId, u) => {
        let parent: Warehouse | undefined;
        set((state) => ({
          warehouses: state.warehouses.map((w) => {
            if (w.id !== warehouseId) return w;
            const locations = w.locations.map((l) =>
              l.id === locId ? { ...l, ...u, updatedAt: today(), updatedBy: 'admin' } : l
            );
            parent = { ...w, locations, updatedAt: today(), updatedBy: 'admin' };
            return parent;
          }),
        }));
        if (parent && isAuthed()) {
          void b2Api.putWarehouse(warehouseId, parent as unknown as Record<string, unknown>).catch(() => {});
        }
      },

      // ── 删除库位：本地即时 + 写穿父仓库 ──
      deleteLocation: (warehouseId, locId) => {
        let parent: Warehouse | undefined;
        set((state) => ({
          warehouses: state.warehouses.map((w) => {
            if (w.id !== warehouseId) return w;
            const locations = w.locations.filter((l) => l.id !== locId);
            parent = { ...w, locations, updatedAt: today(), updatedBy: 'admin' };
            return parent;
          }),
        }));
        if (parent && isAuthed()) {
          void b2Api.putWarehouse(warehouseId, parent as unknown as Record<string, unknown>).catch(() => {});
        }
      },

      resetWarehouses: () => set({ warehouses: [...seedWarehouses] }),
    })
);

/** 按组织过滤可见仓库（沿用 matchOrg 软规则） */
export const selectWarehousesByOrg = (orgId?: string) => (w: Warehouse): boolean =>
  !w.orgId || !orgId || w.orgId === orgId;

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  raw: '原料仓',
  finished: '成品仓',
  wip: '半成品仓',
  aux: '辅料仓',
  transit: '中转仓',
};
