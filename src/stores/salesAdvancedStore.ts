import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import {
  Quotation, SalesInvoice,
} from '@/types';
import { useSalesStore } from '@/stores/salesStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
// V3.63.0：round2 / DEFAULT_TAX_RATE 随退货切片迁至 salesReturnStore.ts，本处不再使用
import { getAuthToken, authHeaders } from '@/utils/authHeaders';
// V3.61.0 S-03：开票凭证失败必须对用户可见（原来.catch(()=>{}) 静默吞掉）
import { useGlobalToastStore } from '@/stores/globalToastStore';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

// V3.63.0：销售退货（addReturn/updateReturn/deleteReturn/completeReturn + salesReturns）已迁至
// 独立关系化 store src/stores/salesReturnStore.ts（sales_returns 表），本处不再承载退货。
interface SalesAdvancedState {
  quotations: Quotation[];
  salesInvoices: SalesInvoice[];

  // 报价单
  addQuotation: (q: Quotation) => void;
  updateQuotation: (id: string, u: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  // 报价单 → 销售订单（跨模块联动）
  convertQuotationToSO: (quotationId: string) => string | null;
  /** V3.76.0：报价单从 D1 水合（页面挂载调用；D1 空且本地/云端有旧 Blob 数据时一次性回填） */
  hydrateQuotations: () => Promise<void>;
  /** V3.112.0：销售发票从 D1 水合（页面挂载调用；D1 空且内存有存量时回填，之后纯 D1） */
  hydrateInvoices: () => Promise<void>;

  // 销售开票（应收）
  addInvoice: (inv: SalesInvoice) => void;
  updateInvoice: (id: string, u: Partial<SalesInvoice>) => void;
  deleteInvoice: (id: string) => void;
  // 开票 → 自动写应收(AR)凭证
  issueInvoice: (invoiceId: string) => void;
}

const seedQuotations: Quotation[] = [
  {
    id: 'q-seed-1', quotationNo: 'Q-2026-0001', customerName: '东风汽车零部件', customerCode: 'CUST-001',
    status: 'approved', validUntil: '2026-08-31', currency: 'CNY',
    items: [
      { id: 'qi-1', materialId: 'mat-001', materialCode: 'STEEL-001', materialName: 'Q345 钢板', unit: 'kg', quantity: 5000, unitPrice: 42, amount: 210000 },
    ],
    totalAmount: 210000, taxRate: 13, taxAmount: 27300, grandTotal: 237300, salesPerson: '王伟', createdAt: '2026-07-01', updatedAt: '2026-07-01', createdBy: '王伟', updatedBy: '王伟',
  },
];

/** 报价单 → D1 行：明细 items 封 extra_json（与 salesContract 范式一致，头部金额列支持列表直查） */
function packQuotation(q: Quotation) {
  const { items, ...rest } = q as any;
  return { ...rest, extraJson: JSON.stringify({ items: items ?? [] }) };
}
/** D1 行 → 报价单：拆出 extra_json 里的 items 明细 */
function unpackQuotation(r: any): Quotation {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), items: extra.items ?? [] } as Quotation;
}

/** 销售发票 → D1 行：明细 items 封 extra_json（与报价单同源范式） */
function packInvoice(inv: SalesInvoice) {
  const { items, ...rest } = inv as any;
  return { ...rest, extraJson: JSON.stringify({ items: items ?? [] }) };
}
/** D1 行 → 销售发票：拆出 extra_json 里的 items 明细 */
function unpackInvoice(r: any): SalesInvoice {
  let extra: any = {};
  try { extra = r.extraJson ? JSON.parse(r.extraJson) : {}; } catch { extra = {}; }
  const { extraJson, ...rest } = r;
  return { ...(rest as any), items: extra.items ?? [] } as SalesInvoice;
}

export const useSalesAdvancedStore = create<SalesAdvancedState>()(
  persist(
    (set, get) => ({
      quotations: [...seedQuotations],
      salesInvoices: [],

      // ── 报价单 ──
      addQuotation: (q) => {
        set((s) => ({ quotations: [...s.quotations, q] }));
        if (isAuthed()) void entityRepo.create('salesQuotation', packQuotation(q) as any).catch(() => {});
      },
      updateQuotation: (id, u) => {
        let updated: Quotation | undefined;
        set((s) => ({
          quotations: s.quotations.map((x) => {
            if (x.id !== id) return x;
            updated = { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' };
            return updated;
          }),
        }));
        if (updated && isAuthed()) void entityRepo.update('salesQuotation', id, packQuotation(updated) as any).catch(() => {});
      },
      deleteQuotation: (id) => {
        set((s) => ({ quotations: s.quotations.filter((x) => x.id !== id) }));
        if (isAuthed()) void entityRepo.remove('salesQuotation', id).catch(() => {});
      },
      // 报价单 → 销售订单
      convertQuotationToSO: (quotationId) => {
        const q = get().quotations.find((x) => x.id === quotationId);
        if (!q || q.status === 'converted') return null;
        const stamp = Date.now();
        const orderNo = `SO-2026-${stamp}`;
        const orderId = `so-${stamp}`;
        const salesOrder = {
          id: orderId,
          orderNo,
          type: 'standard' as const,
          status: 'confirmed' as const,
          customerName: q.customerName,
          customerCode: q.customerCode,
          items: q.items.map((it) => ({
            id: `soi-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            specification: it.specification,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            amount: it.amount,
            deliveryDate: it.deliveryDate,
            deliveredQuantity: 0,
          })),
          totalAmount: q.totalAmount,
          taxRate: q.taxRate,
          taxAmount: q.taxAmount,
          grandTotal: q.grandTotal,
          orderDate: today(),
          expectedDeliveryDate: q.items[0]?.deliveryDate || today(),
          salesPerson: q.salesPerson,
          linkedWorkOrders: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '当前用户',
          updatedBy: '当前用户',
        };
        useSalesStore.getState().addSalesOrder(salesOrder);
        let converted: Quotation | undefined;
        set((s) => ({
          quotations: s.quotations.map((x) => {
            if (x.id !== quotationId) return x;
            converted = { ...x, status: 'converted', convertedOrderId: orderId, convertedOrderNo: orderNo, updatedAt: today() };
            return converted;
          }),
        }));
        if (converted && isAuthed()) void entityRepo.update('salesQuotation', quotationId, packQuotation(converted) as any).catch(() => {});
        return orderId;
      },

      // V3.76.0：报价单从 D1 水合（D1 权威源；D1 空时把内存中的存量报价
      // ——含 zustand 从旧 Blob 再水合回来的历史数据——一次性回填 D1，之后纯 D1）。
      // ★ V3.112.0 修正：移除 `if (!isAuthed()) return;` 早退守卫——鉴权应以真实请求
      // （会话 Cookie）为准，而非本地 `ssa-erp-session` 标记（易因状态陈旧/测试漏注入而断水合）。
      // 未登录/后端异常时请求会 401/抛错并被下方 catch 捕获，本地态自然保留，与销售退货 hydrate 同源。
      hydrateQuotations: async () => {
        try {
          const res = await entityRepo.list<Quotation>('salesQuotation', { page: 1, pageSize: 500 });
          const rows = (res?.data || []).map(unpackQuotation);
          if (rows.length === 0) {
            // 回填源 = 当前内存态（旧 Blob 'ssa-erp-sales-adv' 的 quotations 切片
            // 会随 persist 再水合自然回到这里，无需再读原始键）
            const src = get().quotations;
            for (const q of src) {
              try { await entityRepo.create('salesQuotation', packQuotation(q) as any); } catch { /* 冲突忽略 */ }
            }
            const refreshed = await entityRepo.list<Quotation>('salesQuotation', { page: 1, pageSize: 500 });
            if ((refreshed?.data || []).length) set({ quotations: (refreshed!.data || []).map(unpackQuotation) });
            return;
          }
          set({ quotations: rows });
        } catch {
          // 离线或后端异常：保留本地态
        }
      },

      // V3.112.0：销售发票从 D1 水合（克隆 hydrateQuotations 范式）。
      // ★ V3.112.0 修正：同 hydrateQuotations，移除 `if (!isAuthed()) return;` 早退守卫，
      // 让会话 Cookie 成为鉴权权威源，避免本地 `ssa-erp-session` 标记缺失导致发票列表永远为空。
      hydrateInvoices: async () => {
        try {
          const res = await entityRepo.list<SalesInvoice>('salesInvoice', { page: 1, pageSize: 500 });
          const rows = (res?.data || []).map(unpackInvoice);
          if (rows.length === 0) {
            // 回填源 = 当前内存态（含历史 Blob 再水合回来的存量发票）
            const src = get().salesInvoices;
            for (const inv of src) {
              try { await entityRepo.create('salesInvoice', packInvoice(inv) as any); } catch { /* 冲突忽略 */ }
            }
            const refreshed = await entityRepo.list<SalesInvoice>('salesInvoice', { page: 1, pageSize: 500 });
            if ((refreshed?.data || []).length) set({ salesInvoices: (refreshed!.data || []).map(unpackInvoice) });
            return;
          }
          set({ salesInvoices: rows });
        } catch {
          // 离线或后端异常：保留本地态
        }
      },

      // ── 销售开票 ──
      addInvoice: (inv) => {
        set((s) => ({ salesInvoices: [...s.salesInvoices, inv] }));
        // ★ V3.112.0：登录态写穿 D1（fire-and-forget；失败入队由 entityRepo 自动重放）
        if (isAuthed()) {
          entityRepo.create('salesInvoice', packInvoice(inv) as any).catch(() => {});
        }
      },
      updateInvoice: (id, u) => {
        set((s) => ({ salesInvoices: s.salesInvoices.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today() } : x)) }));
        // ★ V3.112.0：登录态写穿 D1（从最新态取完整对象 pack，避免仅传 u 时 items 被清空）
        if (isAuthed()) {
          const latest = get().salesInvoices.find((x) => x.id === id);
          if (latest) entityRepo.update('salesInvoice', id, packInvoice(latest) as any).catch(() => {});
        }
      },
      deleteInvoice: (id) => {
        set((s) => ({ salesInvoices: s.salesInvoices.filter((x) => x.id !== id) }));
        if (isAuthed()) {
          entityRepo.remove('salesInvoice', id).catch(() => {});
        }
      },
      // 开票 → 写应收(AR)凭证：借应收账款；贷主营业务收入/应交税费-应交增值税
      issueInvoice: (invoiceId) => {
        const inv = get().salesInvoices.find((x) => x.id === invoiceId);
        if (!inv || inv.status === 'issued') return;
        const stamp = Date.now();
        const voucherNo = `V-AR-${inv.invoiceNo}-${stamp}`;
        const cur = inv.currency || 'CNY';
        const entries = [
          {
            id: `ae-${stamp}-1`, entryNo: `JEAR${stamp}1`, date: inv.invoiceDate,
            description: `销售开票应收 ${inv.invoiceNo}`, debitAccount: '应收账款', creditAccount: '',
            amount: inv.totalAmount, currency: cur, voucherNo, createdBy: '当前用户',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
          },
          {
            id: `ae-${stamp}-2`, entryNo: `JEAR${stamp}2`, date: inv.invoiceDate,
            description: `主营业务收入 ${inv.invoiceNo}`, debitAccount: '', creditAccount: '主营业务收入',
            amount: inv.amount, currency: cur, voucherNo, createdBy: '当前用户',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
          },
          {
            id: `ae-${stamp}-3`, entryNo: `JEAR${stamp}3`, date: inv.invoiceDate,
            description: `销项税额 ${inv.invoiceNo}`, debitAccount: '', creditAccount: '应交税费-应交增值税',
            amount: inv.taxAmount, currency: cur, voucherNo, createdBy: '当前用户',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: '当前用户',
          },
        ];
        useFinanceStore.getState().addAccountEntry(entries[0]);
        useFinanceStore.getState().addAccountEntry(entries[1]);
        useFinanceStore.getState().addAccountEntry(entries[2]);
        set((s) => ({
          salesInvoices: s.salesInvoices.map((x) => (x.id === invoiceId ? { ...x, status: 'issued', voucherNo } : x)),
        }));
        // ★ V3.112.0：开票改状态写穿 D1（fire-and-forget）
        if (isAuthed()) {
          entityRepo.update('salesInvoice', invoiceId, { status: 'issued', voucherNo } as any).catch(() => {});
        }

        // ★ V3.60.0 P0-3：销售开票同时向权威凭证通道写应收/收入（合并报表 1122/6001/2221 不再恒为 0）。
        //   后置非阻断：即便后端写凭证失败也不影响前端开票成功（与采购发票/付款同源范式）。
        //   凭证金额与上面遗留模拟分录同源（价税合计=应收，净额=收入，税额=销项），不重复造数。
        // ★ V3.61.0 S-03：原实现是 `.catch(() => {})` 且**不等响应** → 网络失败/HTTP 500
        //   全部静默吞掉，界面显示「已开票」但凭证 1122/6001/2221 根本没写（无红条、无重试入口）。
        //   改为：await 响应 + 检查状态码 + 失败给红条（开票本身仍不回滚，属后置非阻断）。
        try {
          const tk = getAuthToken();
          if (tk && inv) {
            fetch('/api/finance/sales-invoice-voucher', {
              method: 'POST',
              headers: authHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({
                invoiceNo: inv.invoiceNo,
                salesOrderNo: inv.salesOrderNo,
                customerName: inv.customerName,
                amount: inv.amount,
                taxAmount: inv.taxAmount,
                totalAmount: inv.totalAmount,
                invoiceDate: inv.invoiceDate,
              }),
            })
              .then(async (r) => {
                if (!r.ok) {
                  // 失败留痕 + 可见：开票成功但凭证未生成 → 应收/收入未入账，必须让人知道
                  // ★ S-04：服务端会返回具体原因（如金额与订单不符 AMOUNT_MISMATCH），
                  //   把它显示出来比只报 HTTP 码有用得多。
                  let why = `HTTP ${r.status}`;
                  try {
                    const j: any = await r.json();
                    if (j?.error) why = j.error;
                  } catch { /* 响应体非 JSON，保留状态码 */ }
                  console.error('[sales-invoice-voucher] 凭证生成失败', r.status, inv?.invoiceNo, why);
                  useGlobalToastStore.getState().showError(
                    `发票 ${inv?.invoiceNo} 已开票，但应收/收入凭证未生成：${why}。请核对后重新生成凭证，避免应收账龄失真。`
                  );
                }
              })
              .catch((e: any) => {
                console.error('[sales-invoice-voucher] 凭证生成请求异常：', e?.message || e);
                useGlobalToastStore.getState().showError(
                  `发票 ${inv?.invoiceNo} 已开票，但应收/收入凭证请求失败。请稍后补录凭证，避免应收账龄失真。`
                );
              });
          }
        } catch (e: any) {
          console.error('[sales-invoice-voucher] 发起凭证请求失败：', e?.message || e);
        }
      },

      // ── 销售退货 ──
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-sales-adv',
      version: 2,
      partialize: (state) => ({
        // V3.76.0：报价单已迁 D1（sales_quotations），本 Blob 仅承载销售开票切片
        salesInvoices: state.salesInvoices,
      }),
    }
  )
);
