import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { SalesReturn, SalesInvoice, SalesReturnItem } from '@/types';
import { round2, DEFAULT_TAX_RATE } from '@/utils/tax';
import { useWarehouseStore } from './warehouseStore';
import { useFinanceStore } from './financeStore';
import { useSalesStore } from './salesStore';
import { useSalesAdvancedStore } from './salesAdvancedStore';
import { useQualityStore } from './qualityStore';
// V3.66.0 P0-4：客户退货追责直连供应商门户（物料溯源最近采购订单供应商 + 门户 issue + 绩效扣减）
import { useFlowStore } from './flowStore';
import { useVendorPerformanceStore } from './vendorPerformanceStore';
import { usePurchaseStore } from './purchaseStore';

// ═══════════════════════════════════════════════════════════════════════════
// V3.63.0 退货独立单据关系化（根治审计 P1-VP-2 无独立后端单据）：
// 旧版销售退货嵌在 salesAdvancedStore 的 app_state Blob 里，无独立表，财务/退货无法按行引用。
// 现迁为真实关系表 sales_returns（行项目 items 封 extra_json），数据主源 = D1，启动水合；
// completeReturn 的财务红冲逻辑（红字入库 + 红冲应收 + 红字发票）保留并改关系化回写。
// ═══════════════════════════════════════════════════════════════════════════

const today = () => new Date().toISOString().slice(0, 10);

const packReturn = (r: SalesReturn) => {
  const { items, ...rest } = r as any;
  return { ...rest, extraJson: JSON.stringify(items || []) };
};
const unpackReturn = (row: any): SalesReturn => {
  let items: SalesReturnItem[] = [];
  try { items = row.extraJson ? JSON.parse(row.extraJson) : []; } catch { items = []; }
  const { extraJson, ...rest } = row;
  return { ...(rest as any), items };
};

const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

interface SalesReturnState {
  salesReturns: SalesReturn[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  addReturn: (r: SalesReturn) => void;
  updateReturn: (id: string, u: Partial<SalesReturn>) => void;
  deleteReturn: (id: string) => void;
  completeReturn: (returnId: string) => void;
}

export const useSalesReturnStore = create<SalesReturnState>()((set, get) => ({
  salesReturns: [],
  loaded: false,

  hydrate: async () => {
    try {
      const res = await entityRepo.list<SalesReturn>('salesReturn', { page: 1, pageSize: 500 });
      const list = (res?.data || []).map(unpackReturn);
      set({ salesReturns: list, loaded: true });
    } catch {
      set({ salesReturns: [], loaded: true });
    }
  },

  addReturn: (r) => {
    set((s) => ({ salesReturns: [...s.salesReturns, r] }));
    entityRepo.create<SalesReturn>('salesReturn', packReturn(r) as any).catch(() => {});
  },
  updateReturn: (id, u) => {
    const prev = get().salesReturns.find((x) => x.id === id);
    const merged = packReturn({ ...(prev as any), ...u });
    set((s) => ({ salesReturns: s.salesReturns.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
    entityRepo.update<SalesReturn>('salesReturn', id, merged as any).catch(() => {});
  },
  deleteReturn: (id) => {
    set((s) => ({ salesReturns: s.salesReturns.filter((x) => x.id !== id) }));
    entityRepo.remove('salesReturn', id).catch(() => {});
  },

  // 退货完成 → 红字入库(客户退货入库) + 红冲应收(AR) + 生成红字发票
  completeReturn: (returnId) => {
    const r = get().salesReturns.find((x) => x.id === returnId);
    if (!r || r.status === 'completed') return;
    // 1) 红字入库(客户退货入库) → 库存回增
    const stamp = Date.now();
    useWarehouseStore.getState().addInboundOrder({
      id: `ib-ret-${stamp}`,
      inboundNo: `IB-RET-${stamp}`,
      type: 'return',
      sourceNo: r.returnNo,
      status: 'completed',
      warehouseId: 'wh-001',
      operator: '当前用户',
      inboundDate: r.returnDate,
      items: r.items.map((it) => ({
        id: `ibi-${it.id}`,
        materialId: it.materialId,
        materialCode: it.materialCode,
        materialName: it.materialName,
        unit: it.unit,
        expectedQuantity: it.quantity,
        actualQuantity: it.quantity,
        qualityStatus: 'qualified' as const,
      })),
      remarks: `销售退货 ${r.returnNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    });
    // 2) 红冲应收(AR)：借主营业务收入(净额)/借销项税额(税)；贷应收账款(含税)
    const rateOf = (_materialId: string): number => {
      const so = useSalesStore.getState().salesOrders.find((o) => o.orderNo === r.salesOrderNo);
      return typeof so?.taxRate === 'number' ? so.taxRate : DEFAULT_TAX_RATE;
    };
    const cnItems = r.items.map((it) => {
      const rate = rateOf(it.materialId);
      const tax = round2(it.amount * rate / 100);
      return {
        id: `cni-${it.id}`, materialId: it.materialId, materialCode: it.materialCode, materialName: it.materialName,
        quantity: it.quantity, unitPrice: it.unitPrice, amount: it.amount, taxRate: rate, taxAmount: tax,
      };
    });
    const cnTax = round2(cnItems.reduce((s, i) => s + i.taxAmount, 0));
    const cnTotal = round2(r.totalAmount + cnTax);
    const creditNo = `CN-2026-${stamp}`;
    const voucherNo = `V-ARCN-${r.returnNo}-${stamp}`;
    const entries = [
      {
        id: `aec-${stamp}-1`, entryNo: `JECN${stamp}1`, date: r.returnDate,
        description: `销售退货红冲收入 ${r.returnNo}`, debitAccount: '主营业务收入', creditAccount: '',
        amount: r.totalAmount, currency: 'CNY', voucherNo, createdBy: '当前用户',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
      },
      {
        id: `aec-${stamp}-2`, entryNo: `JECN${stamp}2`, date: r.returnDate,
        description: `红冲销项税额 ${r.returnNo}`, debitAccount: '应交税费-应交增值税', creditAccount: '',
        amount: cnTax, currency: 'CNY', voucherNo, createdBy: '当前用户',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
      },
      {
        id: `aec-${stamp}-3`, entryNo: `JECN${stamp}3`, date: r.returnDate,
        description: `红冲应收账款 ${r.returnNo}`, debitAccount: '', creditAccount: '应收账款',
        amount: cnTotal, currency: 'CNY', voucherNo, createdBy: '当前用户',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
      },
    ];
    entries.forEach((e) => useFinanceStore.getState().addAccountEntry(e));
    // ★ V3.64.0 P1-6 客户退货质量回流：退货原因属质量类（缺陷/破损/不合格）时，
    //   自动在质量模块建一条 customer_complaint 不合格品（NCR），锚定退货单号幂等，
    //   打通「客户退货 → 质量追溯」闭环（此前客户侧质量反馈无落点，只记在退货原因文本里）。
    const qualityKeywords = ['质量', '缺陷', '破损', '不合格', '瑕疵', '损坏', 'quality', 'defect', 'damage'];
    const isQualityReturn = qualityKeywords.some((k) => (r.reason || '').toLowerCase().includes(k));
    if (isQualityReturn) {
      const qst = useQualityStore.getState();
      const alreadyLinked = qst.unqualifiedItems.some((u) => u.portalIssueId === r.returnNo);
      if (!alreadyLinked) {
        const ts = Date.now();
        // ★ V3.66.0 P0-4 客户退货追责直连供应商门户：按物料溯源「最近的采购订单供应商」作为追责对象
        //   （销售订单行无供应商字段，走物料→采购单的真实溯源路径；无采购记录则只建 NCR 不推门户，不造假）。
        const item0 = r.items[0];
        let srcVendor: { vendorId?: string; vendorName?: string; poNo?: string } | undefined;
        if (item0?.materialId) {
          const pos = usePurchaseStore.getState().purchaseOrders
            .filter((o) => o.items?.some((it) => it.materialId === item0.materialId))
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
          const po = pos[0];
          if (po) srcVendor = { vendorId: po.vendorId, vendorName: po.vendorName || '', poNo: po.orderNo };
        }
        qst.addUnqualifiedItem({
          id: `uq-sr-${ts}`,
          itemNo: `NCR-SR-${r.returnNo}`,
          inspectionTaskId: '',
          inspectionTaskNo: r.returnNo,
          materialCode: item0?.materialCode || '',
          materialName: item0?.materialName || r.customerName || '',
          batchNo: '-',
          defectQuantity: r.items.reduce((s, it) => s + (it.quantity || 0), 0),
          defectDescription: `客户退货质量回流 ${r.returnNo}（${r.reason || '质量原因'}）${srcVendor?.vendorName ? `，溯源供应商：${srcVendor.vendorName}（PO ${srcVendor.poNo}）` : ''}`,
          disposition: 'other',
          dispositionStatus: 'pending',
          status: 'open',
          source: 'customer_complaint',
          portalIssueId: r.returnNo,
          vendorId: srcVendor?.vendorId,
          vendorName: srcVendor?.vendorName,
          responsiblePerson: '质量员',
          dueDate: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system',
        } as any);
        // 推供应商门户一条 customer_return issue（门户 VendorPortal/VendorQualityPage 消费，供应商可响应/8D）
        if (srcVendor?.vendorId) {
          const fls = useFlowStore.getState();
          const nowTs = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
          const tsNow = nowTs();
          fls.addVendorQualityIssue({
            id: `vqi-csr-${r.returnNo}`,
            issueNo: `VQI-CS-${r.returnNo}`,
            vendorId: srcVendor.vendorId,
            vendorName: srcVendor.vendorName || '',
            materialCode: item0?.materialCode || '',
            materialName: item0?.materialName || '',
            batchNo: '-',
            issueType: 'customer_return',
            severity: 'major',
            description: `客户退货追责 ${r.returnNo}：客户 ${r.customerName} 因「${r.reason || '质量原因'}」退货，溯源采购订单 ${srcVendor.poNo}，请响应并提 8D 改善报告`,
            defectQty: r.items.reduce((s, it) => s + (it.quantity || 0), 0),
            totalQty: r.items.reduce((s, it) => s + (it.quantity || 0), 0),
            defectRate: 100,
            status: 'open',
            createdAt: tsNow,
            updatedAt: tsNow,
            createdBy: '客户退货自动追责',
            updatedBy: '客户退货自动追责',
          } as any);
          // 同步供应商绩效质量分扣减（既有联动引擎，与来料质检同口径）
          useVendorPerformanceStore.getState().recordQualityIncident(srcVendor.vendorId, srcVendor.vendorName || '');
        }
      }
    }
    // 3) 生成红字发票（税额/价税合计按实际税率计算）
    const creditNote: SalesInvoice = {
      id: `inv-cn-${stamp}`,
      invoiceNo: creditNo,
      invoiceType: 'credit_note',
      salesOrderNo: r.salesOrderNo,
      customerName: r.customerName,
      status: 'issued',
      invoiceDate: r.returnDate,
      currency: 'CNY',
      items: cnItems,
      amount: r.totalAmount, taxAmount: cnTax, totalAmount: cnTotal,
      linkedReturnNo: r.returnNo, voucherNo,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    useSalesAdvancedStore.getState().addInvoice(creditNote);

    const updated: SalesReturn = { ...r, status: 'completed', creditNoteNo: creditNo };
    set((s) => ({ salesReturns: s.salesReturns.map((x) => (x.id === returnId ? updated : x)) }));
    entityRepo.update<SalesReturn>('salesReturn', returnId, packReturn(updated) as any).catch(() => {});
  },
}));

void useSalesReturnStore.getState().hydrate();
