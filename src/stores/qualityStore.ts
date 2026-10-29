import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import {
  InspectionTask,
  InspectionStandard,
  UnqualifiedItem,
  PDCARecord,
} from '@/types/quality';
import type { VendorQualityIssue } from '@/mocks/data/flowData';
import { useWarehouseStore } from './warehouseStore';
import { useFinanceStore } from './financeStore';
import { useMaterialStore } from './materialStore';
import { useVendorPerformanceStore } from './vendorPerformanceStore';
// V3.65.0 立项③：检验标准配置引擎消费面——建检验任务时按物料类别自动套用配置的 AQL/检验水平
import { useSettingsStore, resolveInspectionConfig } from './settingsStore';
import {
  inspectionTasks as mockInspectionTasks,
  inspectionStandards as mockInspectionStandards,
  unqualifiedItems as mockUnqualifiedItems,
  pdcaRecords as mockPdcaRecords,
} from '@/mocks/data/quality';

// ═══════════════════════════════════════════════════════════════════════════
// V3.63.0 关系化重构（根治审计 P0 质量数据孤岛）：
// 旧版 qualityStore 用 persist(backendStorage) 把 4 类质量单据整体存进 app_state 的
// 一个大 JSON Blob —— 能"存"但无法被采购/生产/财务按行引用，形成数据孤岛。
// 现改为：数据主源 = D1 关系表（inspection_tasks / inspection_standards /
// unqualified_items / pdca_records），经通用实体路由 /api/entities/* 读写；
// 嵌套字段（缺陷项/检验项/附件/行动项）封进 extra_json（后端自动 JSON 序列化，前端解析）。
// 启动时从 D1 水合，空库且首次时回填 seed（保留演示数据）；离线/异常回退 Mock。
// 公开 API（同步方法 + 4 个数组）保持不变，质量页面零改动。
// ═══════════════════════════════════════════════════════════════════════════

// ── 嵌套字段打包/解包（extra_json）────────────────────────────────────────
function packTask(t: any) {
  const { defectItems, attachments, ...rest } = t;
  return { ...rest, extraJson: JSON.stringify({ defectItems: defectItems ?? [], attachments: attachments ?? [] }) };
}
function unpackTask(r: any): InspectionTask {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), defectItems: extra.defectItems ?? [], attachments: extra.attachments ?? [] };
}
function packStandard(s: any) {
  const { inspectionItems, ...rest } = s;
  return { ...rest, extraJson: JSON.stringify({ inspectionItems: inspectionItems ?? [] }) };
}
function unpackStandard(r: any): InspectionStandard {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), inspectionItems: extra.inspectionItems ?? [] };
}
function packUnqualified(u: any) {
  const { attachments, approvalRecords, ...rest } = u;
  return { ...rest, extraJson: JSON.stringify({ attachments: attachments ?? [], approvalRecords: approvalRecords ?? [] }) };
}
function unpackUnqualified(r: any): UnqualifiedItem {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), attachments: extra.attachments ?? [], approvalRecords: extra.approvalRecords ?? [] };
}
function packPdca(p: any) {
  const { actionItems, ...rest } = p;
  return { ...rest, extraJson: JSON.stringify({ actionItems: actionItems ?? [] }) };
}
function unpackPdca(r: any): PDCARecord {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), actionItems: extra.actionItems ?? [] };
}

// 本地 nowStr（与门户页面一致：YYYY-MM-DD HH:MM:SS）
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// localStorage 安全访问（模块顶层 hydrate 在 Node/SSR 缺失时不崩）
const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

interface QualityState {
  inspectionTasks: InspectionTask[];
  inspectionStandards: InspectionStandard[];
  unqualifiedItems: UnqualifiedItem[];
  pdcaRecords: PDCARecord[];
  loaded: boolean;

  hydrate: () => Promise<void>;

  addInspectionTask: (task: InspectionTask) => void;
  updateInspectionTask: (id: string, updates: Partial<InspectionTask>) => void;
  deleteInspectionTask: (id: string) => void;

  addInspectionStandard: (standard: InspectionStandard) => void;
  updateInspectionStandard: (id: string, updates: Partial<InspectionStandard>) => void;
  deleteInspectionStandard: (id: string) => void;

  addUnqualifiedItem: (item: UnqualifiedItem) => void;
  updateUnqualifiedItem: (id: string, updates: Partial<UnqualifiedItem>) => void;
  deleteUnqualifiedItem: (id: string) => void;

  /** B7-T2：供应商门户质量问题单 → 主 ERP 不合格品(NCR) 回写，幂等守卫 */
  addVendorQualityIssue: (issue: VendorQualityIssue) => void;

  /** B4：NCR 处置联动 —— scrap 报废联动库存扣减+凭证；其余处置方式仅完成状态闭环 */
  disposeUnqualified: (
    id: string,
    payload?: { disposition?: string; operator?: string; actualCost?: number; remark?: string }
  ) => boolean;

  addPdcaRecord: (record: PDCARecord) => void;
  updatePdcaRecord: (id: string, updates: Partial<PDCARecord>) => void;
  deletePdcaRecord: (id: string) => void;
}

export const useQualityStore = create<QualityState>()((set, get) => ({
  inspectionTasks: [...mockInspectionTasks],
  inspectionStandards: [...mockInspectionStandards],
  unqualifiedItems: [...mockUnqualifiedItems],
  pdcaRecords: [...mockPdcaRecords],
  loaded: false,

  hydrate: async () => {
    const loadOne = async <T,>(resource: string, unpack: (r: any) => T, seed: T[]): Promise<T[]> => {
      try {
        const res = await entityRepo.list<T>(resource, { page: 1, pageSize: 500 });
        const list = (res?.data || []).map(unpack);
        if (list.length === 0 && !lsGet(`ssa-erp-backfilled-${resource}`)) {
          lsSet(`ssa-erp-backfilled-${resource}`, '1');
          for (const item of seed) {
            try { await entityRepo.create<T>(resource, item as any); } catch { /* 编码冲突忽略 */ }
          }
          const refreshed = await entityRepo.list<T>(resource, { page: 1, pageSize: 500 });
          return (refreshed?.data || []).map(unpack);
        }
        return list.length ? list : [...seed];
      } catch {
        return [...seed];
      }
    };
    const [it, is, uq, pd] = await Promise.all([
      loadOne('inspectionTask', unpackTask, mockInspectionTasks as any),
      loadOne('inspectionStandard', unpackStandard, mockInspectionStandards as any),
      loadOne('unqualifiedItem', unpackUnqualified, mockUnqualifiedItems as any),
      loadOne('pdca', unpackPdca, mockPdcaRecords as any),
    ]);
    set({ inspectionTasks: it, inspectionStandards: is, unqualifiedItems: uq, pdcaRecords: pd, loaded: true });
  },

  addInspectionTask: (task) => {
    // V3.65.0 立项③：检验标准配置引擎消费面——任务未显式填 AQL/检验水平（或缺省 'N/A'）时，
    //   按关联检验标准的物料类别经 resolveInspectionConfig 自动补齐；未命中/配置停用回退安全默认，绝不卡建任务。
    const cfg = useSettingsStore.getState().inspectionStandardConfig;
    let materialCategory: string | undefined;
    if (task.inspectionStandardId) {
      materialCategory = get().inspectionStandards.find((s) => s.id === task.inspectionStandardId)?.materialCategory;
    }
    const resolved = resolveInspectionConfig(cfg, materialCategory);
    const needAql = !task.aql || !(Number(task.aql) > 0);
    const needLevel = !task.inspectionLevel || task.inspectionLevel === 'N/A';
    const enriched: InspectionTask = needAql || needLevel
      ? {
          ...task,
          aql: needAql ? resolved.aql : task.aql,
          inspectionLevel: needLevel ? resolved.level : task.inspectionLevel,
        }
      : task;
    set((s) => ({ inspectionTasks: [...s.inspectionTasks, enriched] }));
    entityRepo.create('inspectionTask', packTask(enriched) as any).catch(() => {});
    // P0-3：手工建 incoming 检验任务时，关联已存在的待检批（按 materialCode 匹配最近 pending 批，双向互引）。
    //   覆盖「先建批（入库自动建批）后建任务」路径：任务建好后反向回写 批.inspectionTaskId + 任务.inspectionLotId。
    //   动态 import 避免与 qualityAdvancedStore 的静态 import 形成循环依赖。
    if (enriched.type === 'incoming' && enriched.materialCode) {
      import('@/stores/qualityAdvancedStore').then((mod) => {
        const adv = mod.useQualityAdvancedStore.getState();
        const lot = adv.inspectionLots.find(
          (l) => l.materialCode === enriched.materialCode && l.status === 'pending' && !l.inspectionTaskId
        );
        if (lot) {
          adv.updateInspectionLot(lot.id, { inspectionTaskId: enriched.id });
          useQualityStore.getState().updateInspectionTask(enriched.id, { inspectionLotId: lot.id });
        }
      }).catch(() => {});
    }
  },
  updateInspectionTask: (id, u) => {
    const prev = get().inspectionTasks.find((x) => x.id === id);
    const merged = packTask({ ...(prev as any), ...u });
    set((s) => ({ inspectionTasks: s.inspectionTasks.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    entityRepo.update('inspectionTask', id, merged as any).catch(() => {});
  },
  deleteInspectionTask: (id) => {
    set((s) => ({ inspectionTasks: s.inspectionTasks.filter((x) => x.id !== id) }));
    entityRepo.remove('inspectionTask', id).catch(() => {});
  },

  addInspectionStandard: (standard) => {
    set((s) => ({ inspectionStandards: [...s.inspectionStandards, standard] }));
    entityRepo.create('inspectionStandard', packStandard(standard) as any).catch(() => {});
  },
  updateInspectionStandard: (id, u) => {
    const prev = get().inspectionStandards.find((x) => x.id === id);
    const merged = packStandard({ ...(prev as any), ...u });
    set((s) => ({ inspectionStandards: s.inspectionStandards.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    entityRepo.update('inspectionStandard', id, merged as any).catch(() => {});
  },
  deleteInspectionStandard: (id) => {
    set((s) => ({ inspectionStandards: s.inspectionStandards.filter((x) => x.id !== id) }));
    entityRepo.remove('inspectionStandard', id).catch(() => {});
  },

  addUnqualifiedItem: (item) => {
    set((s) => ({ unqualifiedItems: [...s.unqualifiedItems, item] }));
    entityRepo.create('unqualifiedItem', packUnqualified(item) as any).catch(() => {});
  },
  updateUnqualifiedItem: (id, u) => {
    const prev = get().unqualifiedItems.find((x) => x.id === id);
    const merged = packUnqualified({ ...(prev as any), ...u });
    set((s) => ({ unqualifiedItems: s.unqualifiedItems.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    entityRepo.update('unqualifiedItem', id, merged as any).catch(() => {});
  },
  deleteUnqualifiedItem: (id) => {
    set((s) => ({ unqualifiedItems: s.unqualifiedItems.filter((x) => x.id !== id) }));
    entityRepo.remove('unqualifiedItem', id).catch(() => {});
  },

  // ── B7-T2：门户质量异常单 → 主 ERP 不合格品(NCR) ──────────────
  addVendorQualityIssue: (issue) => {
    if (get().unqualifiedItems.some((x) => x.portalIssueId === issue.id)) return;
    const item: UnqualifiedItem = {
      id: `uq-vendor-${issue.id}`,
      itemNo: issue.issueNo,
      inspectionTaskId: `portal-${issue.id}`,
      inspectionTaskNo: issue.issueNo,
      materialCode: issue.materialCode,
      materialName: issue.materialName,
      batchNo: issue.batchNo || '-',
      defectQuantity: issue.defectQty,
      defectDescription: issue.description,
      disposition: 'rework',
      dispositionStatus: 'pending',
      status: 'open',
      source: 'vendor',
      portalIssueId: issue.id,
      vendorReported: true,
      responsiblePerson: issue.vendorName,
      dueDate: '',
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: issue.vendorId,
      updatedBy: issue.vendorId,
    };
    set((s) => ({ unqualifiedItems: [...s.unqualifiedItems, item] }));
    entityRepo.create('unqualifiedItem', packUnqualified(item) as any).catch(() => {});
    // V3.63.0 质量反馈 → 供应商绩效联动：供应商上报的质量异常扣减其质量分并重算评级
    useVendorPerformanceStore.getState().recordQualityIncident(issue.vendorId, issue.vendorName, 5);
  },

  // ── B4：NCR 处置联动库存与财务 ──────────────────────────────
  disposeUnqualified: (id, payload = {}) => {
    const item = get().unqualifiedItems.find((x) => x.id === id);
    if (!item) return false;
    if (item.dispositionStatus === 'completed') return false;

    const method = payload.disposition || item.disposition || 'other';
    const operator = payload.operator || item.responsiblePerson || '质量员';
    const today = new Date().toISOString().slice(0, 10);
    const cost = payload.actualCost || 0;

    let linkedOutboundNo: string | undefined;
    let linkedInboundNo: string | undefined;
    let actualDisposition: string | undefined;

    const material = useMaterialStore.getState().materials.find((m) => m.code === item.materialCode);
    const unitCost = material?.price || cost / item.defectQuantity || 0;
    const totalCost = unitCost * item.defectQuantity;
    const isFG = material?.valuationClass === 'FG' || material?.materialType === 'finished';
    const creditAccount = isFG ? { code: '1405', name: '库存商品' } : { code: '1403', name: '原材料' };

    if (method === 'scrap') {
      if (material) {
        const ts = Date.now();
        const outboundNo = `OUT-SCRAP-${ts}`;
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-scrap-${ts}`,
          outboundNo,
          type: 'scrap',
          status: 'completed',
          warehouseId: 'wh-001',
          warehouseName: '主仓库-A区',
          operator,
          outboundDate: today,
          items: [
            {
              id: `ob-scrap-item-${ts}`,
              materialId: material.id,
              materialCode: material.code,
              materialName: material.name,
              specification: material.specification,
              unit: material.unit,
              quantity: item.defectQuantity,
            },
          ],
          remarks: `NCR 报废处置联动：${item.itemNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system',
        });
        linkedOutboundNo = outboundNo;
      }
      useFinanceStore.getState().createVoucher({
        date: today,
        items: [
          { id: `voucher-scrap-d`, lineNo: 0, summary: `NCR报废 ${item.itemNo}`, accountCode: '6602', accountName: '管理费用', debit: totalCost, credit: 0 },
          { id: `voucher-scrap-c`, lineNo: 0, summary: `结转报废损失 ${item.itemNo}（${creditAccount.name}）`, accountCode: creditAccount.code, accountName: creditAccount.name, debit: 0, credit: totalCost },
        ],
        source: 'ocr',
        sourceNo: item.itemNo,
        remark: `NCR报废处置：${item.itemNo}`,
        createdBy: operator,
      });
      actualDisposition = 'scrap';
    } else if (method === 'rework') {
      if (material) {
        const ts = Date.now();
        const inboundNo = `IN-REWORK-${ts}`;
        useWarehouseStore.getState().addInboundOrder({
          id: `ib-rework-${ts}`,
          inboundNo,
          type: 'rework',
          sourceNo: item.itemNo,
          status: 'completed',
          warehouseId: 'wh-001',
          warehouseName: '主仓库-A区',
          operator,
          inboundDate: today,
          items: [
            {
              id: `ib-rework-item-${ts}`,
              materialId: material.id,
              materialCode: material.code,
              materialName: material.name,
              specification: material.specification,
              unit: material.unit,
              expectedQuantity: item.defectQuantity,
              actualQuantity: item.defectQuantity,
              qualityStatus: 'passed' as any,
            },
          ],
          remarks: `NCR 返工入库联动：${item.itemNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system',
        });
        linkedInboundNo = inboundNo;
      }
      useFinanceStore.getState().createVoucher({
        date: today,
        items: [
          { id: `voucher-rework-d`, lineNo: 0, summary: `NCR返工入库 ${item.itemNo}`, accountCode: '1403', accountName: '原材料', debit: totalCost, credit: 0 },
          { id: `voucher-rework-c`, lineNo: 0, summary: `结转返工损失 ${item.itemNo}`, accountCode: '6601', accountName: '生产损失', debit: 0, credit: totalCost },
        ],
        source: 'ocr',
        sourceNo: item.itemNo,
        remark: `NCR返工处置：${item.itemNo}`,
        createdBy: operator,
      });
      actualDisposition = 'rework';
    } else if (method === 'return_vendor') {
      if (material) {
        const ts = Date.now();
        const outboundNo = `OUT-RETURN-${ts}`;
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-return-${ts}`,
          outboundNo,
          type: 'return',
          status: 'completed',
          warehouseId: 'wh-001',
          warehouseName: '主仓库-A区',
          operator,
          outboundDate: today,
          items: [
            {
              id: `ob-return-item-${ts}`,
              materialId: material.id,
              materialCode: material.code,
              materialName: material.name,
              specification: material.specification,
              unit: material.unit,
              quantity: item.defectQuantity,
            },
          ],
          remarks: `NCR 退货供应商联动：${item.itemNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system',
        });
        linkedOutboundNo = outboundNo;
      }
      useFinanceStore.getState().createVoucher({
        date: today,
        items: [
          { id: `voucher-return-d`, lineNo: 0, summary: `NCR退货冲销 ${item.itemNo}`, accountCode: '2202', accountName: '应付账款', debit: totalCost, credit: 0 },
          { id: `voucher-return-c`, lineNo: 0, summary: `结转退货库存 ${item.itemNo}（${creditAccount.name}）`, accountCode: creditAccount.code, accountName: creditAccount.name, debit: 0, credit: totalCost },
        ],
        source: 'ocr',
        sourceNo: item.itemNo,
        remark: `NCR退货处置：${item.itemNo}`,
        createdBy: operator,
      });
      actualDisposition = 'return_vendor';
    } else if (method === 'conditional_accept') {
      useFinanceStore.getState().createVoucher({
        date: today,
        items: [
          { id: `voucher-concession-d`, lineNo: 0, summary: `NCR让步接收 ${item.itemNo}`, accountCode: '6602', accountName: '管理费用', debit: totalCost, credit: 0 },
          { id: `voucher-concession-c`, lineNo: 0, summary: `结转让步损失 ${item.itemNo}`, accountCode: '1403', accountName: '原材料', debit: 0, credit: totalCost },
        ],
        source: 'ocr',
        sourceNo: item.itemNo,
        remark: `NCR让步接收处置：${item.itemNo}`,
        createdBy: operator,
      });
      actualDisposition = 'conditional_accept';
    } else {
      actualDisposition = method;
    }

    const updated = {
      dispositionStatus: 'completed' as const,
      completedDate: item.completedDate || today,
      linkedOutboundNo: linkedOutboundNo ?? item.linkedOutboundNo,
      linkedInboundNo: linkedInboundNo ?? item.linkedInboundNo,
      actualDisposition: actualDisposition ?? item.actualDisposition,
    };
    set((s) => ({
      unqualifiedItems: s.unqualifiedItems.map((x) => (x.id === id ? { ...x, ...updated } : x)),
    }));
    entityRepo.update('unqualifiedItem', id, packUnqualified({ ...item, ...updated }) as any).catch(() => {});
    return true;
  },

  addPdcaRecord: (record) => {
    set((s) => ({ pdcaRecords: [...s.pdcaRecords, record] }));
    entityRepo.create('pdca', packPdca(record) as any).catch(() => {});
  },
  updatePdcaRecord: (id, u) => {
    const prev = get().pdcaRecords.find((x) => x.id === id);
    const merged = packPdca({ ...(prev as any), ...u });
    set((s) => ({ pdcaRecords: s.pdcaRecords.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    entityRepo.update('pdca', id, merged as any).catch(() => {});
  },
  deletePdcaRecord: (id) => {
    set((s) => ({ pdcaRecords: s.pdcaRecords.filter((x) => x.id !== id) }));
    entityRepo.remove('pdca', id).catch(() => {});
  },
}));

// 启动后即水合（离线/未登录时回退 Mock，不阻断 UI）
void useQualityStore.getState().hydrate();
