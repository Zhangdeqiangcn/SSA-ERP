import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage, c as useWarehouseStore, t as round2, f as useFinanceStore, e as useSalesStore, D as DEFAULT_TAX_RATE } from "./index-CU2cqxc8.js";
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const seedQuotations = [
  {
    id: "q-seed-1",
    quotationNo: "Q-2026-0001",
    customerName: "东风汽车零部件",
    customerCode: "CUST-001",
    status: "approved",
    validUntil: "2026-08-31",
    currency: "CNY",
    items: [
      { id: "qi-1", materialId: "mat-001", materialCode: "STEEL-001", materialName: "Q345 钢板", unit: "kg", quantity: 5e3, unitPrice: 42, amount: 21e4 }
    ],
    totalAmount: 21e4,
    taxRate: 13,
    taxAmount: 27300,
    grandTotal: 237300,
    salesPerson: "王伟",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-01",
    createdBy: "王伟",
    updatedBy: "王伟"
  }
];
const useSalesAdvancedStore = create()(
  persist(
    (set, get) => ({
      quotations: [...seedQuotations],
      salesInvoices: [],
      salesReturns: [],
      // ── 报价单 ──
      addQuotation: (q) => set((s) => ({ quotations: [...s.quotations, q] })),
      updateQuotation: (id, u) => set((s) => ({ quotations: s.quotations.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteQuotation: (id) => set((s) => ({ quotations: s.quotations.filter((x) => x.id !== id) })),
      // 报价单 → 销售订单
      convertQuotationToSO: (quotationId) => {
        var _a;
        const q = get().quotations.find((x) => x.id === quotationId);
        if (!q || q.status === "converted") return null;
        const stamp = Date.now();
        const orderNo = `SO-2026-${stamp}`;
        const orderId = `so-${stamp}`;
        const salesOrder = {
          id: orderId,
          orderNo,
          type: "standard",
          status: "confirmed",
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
            deliveredQuantity: 0
          })),
          totalAmount: q.totalAmount,
          taxRate: q.taxRate,
          taxAmount: q.taxAmount,
          grandTotal: q.grandTotal,
          orderDate: today(),
          expectedDeliveryDate: ((_a = q.items[0]) == null ? void 0 : _a.deliveryDate) || today(),
          salesPerson: q.salesPerson,
          linkedWorkOrders: [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "当前用户",
          updatedBy: "当前用户"
        };
        useSalesStore.getState().addSalesOrder(salesOrder);
        set((s) => ({
          quotations: s.quotations.map(
            (x) => x.id === quotationId ? { ...x, status: "converted", convertedOrderId: orderId, convertedOrderNo: orderNo, updatedAt: today() } : x
          )
        }));
        return orderId;
      },
      // ── 销售开票 ──
      addInvoice: (inv) => set((s) => ({ salesInvoices: [...s.salesInvoices, inv] })),
      updateInvoice: (id, u) => set((s) => ({ salesInvoices: s.salesInvoices.map((x) => x.id === id ? { ...x, ...u, updatedAt: today() } : x) })),
      deleteInvoice: (id) => set((s) => ({ salesInvoices: s.salesInvoices.filter((x) => x.id !== id) })),
      // 开票 → 写应收(AR)凭证：借应收账款；贷主营业务收入/应交税费-应交增值税
      issueInvoice: (invoiceId) => {
        const inv = get().salesInvoices.find((x) => x.id === invoiceId);
        if (!inv || inv.status === "issued") return;
        const stamp = Date.now();
        const voucherNo = `V-AR-${inv.invoiceNo}-${stamp}`;
        const cur = inv.currency || "CNY";
        const entries = [
          {
            id: `ae-${stamp}-1`,
            entryNo: `JEAR${stamp}1`,
            date: inv.invoiceDate,
            description: `销售开票应收 ${inv.invoiceNo}`,
            debitAccount: "应收账款",
            creditAccount: "",
            amount: inv.totalAmount,
            currency: cur,
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          },
          {
            id: `ae-${stamp}-2`,
            entryNo: `JEAR${stamp}2`,
            date: inv.invoiceDate,
            description: `主营业务收入 ${inv.invoiceNo}`,
            debitAccount: "",
            creditAccount: "主营业务收入",
            amount: inv.amount,
            currency: cur,
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          },
          {
            id: `ae-${stamp}-3`,
            entryNo: `JEAR${stamp}3`,
            date: inv.invoiceDate,
            description: `销项税额 ${inv.invoiceNo}`,
            debitAccount: "",
            creditAccount: "应交税费-应交增值税",
            amount: inv.taxAmount,
            currency: cur,
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          }
        ];
        useFinanceStore.getState().addAccountEntry(entries[0]);
        useFinanceStore.getState().addAccountEntry(entries[1]);
        useFinanceStore.getState().addAccountEntry(entries[2]);
        set((s) => ({
          salesInvoices: s.salesInvoices.map((x) => x.id === invoiceId ? { ...x, status: "issued", voucherNo } : x)
        }));
      },
      // ── 销售退货 ──
      addReturn: (r) => set((s) => ({ salesReturns: [...s.salesReturns, r] })),
      updateReturn: (id, u) => set((s) => ({ salesReturns: s.salesReturns.map((x) => x.id === id ? { ...x, ...u, updatedAt: today() } : x) })),
      deleteReturn: (id) => set((s) => ({ salesReturns: s.salesReturns.filter((x) => x.id !== id) })),
      // 退货完成 → 红字入库(退货入库) + 红冲应收(AR) + 生成红字发票
      completeReturn: (returnId) => {
        const r = get().salesReturns.find((x) => x.id === returnId);
        if (!r || r.status === "completed") return;
        const stamp = Date.now();
        useWarehouseStore.getState().addInboundOrder({
          id: `ib-ret-${stamp}`,
          inboundNo: `IB-RET-${stamp}`,
          type: "return",
          sourceNo: r.returnNo,
          status: "completed",
          warehouseId: "wh-001",
          operator: "当前用户",
          inboundDate: r.returnDate,
          items: r.items.map((it) => ({
            id: `ibi-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            expectedQuantity: it.quantity,
            actualQuantity: it.quantity,
            qualityStatus: "qualified"
          })),
          remarks: `销售退货 ${r.returnNo}`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "当前用户",
          updatedBy: "当前用户"
        });
        const rateOf = (materialId) => {
          const so = useSalesStore.getState().salesOrders.find((o) => o.orderNo === r.salesOrderNo);
          const it = so == null ? void 0 : so.items.find((i) => i.materialId === materialId);
          return typeof (it == null ? void 0 : it.taxRate) === "number" ? it.taxRate : DEFAULT_TAX_RATE;
        };
        const cnItems = r.items.map((it) => {
          const rate = rateOf(it.materialId);
          const tax = round2(it.amount * rate / 100);
          return {
            id: `cni-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            amount: it.amount,
            taxRate: rate,
            taxAmount: tax
          };
        });
        const cnTax = round2(cnItems.reduce((s, i) => s + i.taxAmount, 0));
        const cnTotal = round2(r.totalAmount + cnTax);
        const creditNo = `CN-2026-${stamp}`;
        const voucherNo = `V-ARCN-${r.returnNo}-${stamp}`;
        const entries = [
          {
            id: `aec-${stamp}-1`,
            entryNo: `JECN${stamp}1`,
            date: r.returnDate,
            description: `销售退货红冲收入 ${r.returnNo}`,
            debitAccount: "主营业务收入",
            creditAccount: "",
            amount: r.totalAmount,
            currency: "CNY",
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          },
          {
            id: `aec-${stamp}-2`,
            entryNo: `JECN${stamp}2`,
            date: r.returnDate,
            description: `红冲销项税额 ${r.returnNo}`,
            debitAccount: "应交税费-应交增值税",
            creditAccount: "",
            amount: cnTax,
            currency: "CNY",
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          },
          {
            id: `aec-${stamp}-3`,
            entryNo: `JECN${stamp}3`,
            date: r.returnDate,
            description: `红冲应收账款 ${r.returnNo}`,
            debitAccount: "",
            creditAccount: "应收账款",
            amount: cnTotal,
            currency: "CNY",
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          }
        ];
        entries.forEach((e) => useFinanceStore.getState().addAccountEntry(e));
        const creditNote = {
          id: `inv-cn-${stamp}`,
          invoiceNo: creditNo,
          invoiceType: "credit_note",
          salesOrderNo: r.salesOrderNo,
          customerName: r.customerName,
          status: "issued",
          invoiceDate: r.returnDate,
          currency: "CNY",
          items: cnItems,
          amount: r.totalAmount,
          taxAmount: cnTax,
          totalAmount: cnTotal,
          linkedReturnNo: r.returnNo,
          voucherNo,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "当前用户",
          updatedBy: "当前用户"
        };
        set((s) => ({
          salesReturns: s.salesReturns.map((x) => x.id === returnId ? { ...x, status: "completed", creditNoteNo: creditNo } : x),
          salesInvoices: [...s.salesInvoices, creditNote]
        }));
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-sales-adv",
      version: 1,
      partialize: (state) => ({
        quotations: state.quotations,
        salesInvoices: state.salesInvoices,
        salesReturns: state.salesReturns
      })
    }
  )
);
export {
  useSalesAdvancedStore as u
};
