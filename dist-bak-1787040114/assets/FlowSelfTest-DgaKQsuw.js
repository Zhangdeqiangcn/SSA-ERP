import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bj as Alert, aP as Paper, B as Box, h as Typography, aL as Chip, cl as LinearProgress, bV as CheckCircle, cu as RadioButtonUnchecked, bk as Button, i as Divider, bK as Stack, cv as AutoFixHigh, cr as RestartAlt } from "./vendor-DGU5TO-x.js";
import { e as useSalesStore, b as usePurchaseStore, c as useWarehouseStore, d as useQualityStore } from "./index-DeeqqmHA.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useSalesContractStore } from "./salesContractStore-BUsOJXem.js";
import { u as useProductionStore } from "./productionStore-Bdmg7HTu.js";
import { u as useArapStore } from "./arapStore-CxlnIECw.js";
const FlowSelfTest = () => {
  const navigate = useNavigate();
  const [seedMsg, setSeedMsg] = reactExports.useState("");
  const sales = useSalesStore();
  const contracts = useSalesContractStore();
  const production = useProductionStore();
  const purchase = usePurchaseStore();
  const warehouse = useWarehouseStore();
  const quality = useQualityStore();
  const arap = useArapStore();
  const nodes = reactExports.useMemo(() => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
    return [
      { key: "followup", label: "① 客户跟进", hint: "销售/商机", count: ((_a = sales.prospects) == null ? void 0 : _a.filter((p) => {
        var _a2;
        return (((_a2 = p.followupRecords) == null ? void 0 : _a2.length) ?? 0) > 0;
      }).length) ?? 0, target: 1, route: "/sales/prospects" },
      { key: "quote", label: "② 接单(报价)", hint: "销售/商机", count: ((_b = sales.prospects) == null ? void 0 : _b.filter((p) => p.status === "quoted" || p.status === "won").length) ?? 0, target: 1, route: "/sales/prospects" },
      { key: "contract", label: "③ 签订合同", hint: "销售合同", count: ((_c = contracts.contracts) == null ? void 0 : _c.length) ?? 0, target: 1, route: "/sales/contracts" },
      { key: "so", label: "④ 销售订单", hint: "销售订单", count: ((_d = sales.salesOrders) == null ? void 0 : _d.length) ?? 0, target: 1, route: "/sales/orders" },
      { key: "review", label: "⑤ 订单评审", hint: "销售订单", count: ((_e = sales.salesOrders) == null ? void 0 : _e.filter((o) => {
        var _a2;
        return (((_a2 = o.approvalRecords) == null ? void 0 : _a2.length) ?? 0) > 0;
      }).length) ?? 0, target: 1, route: "/sales/orders" },
      { key: "schedule", label: "⑥ 生产排产", hint: "生产工单", count: ((_f = production.workOrders) == null ? void 0 : _f.filter((wo) => !!wo.plannedStartDate).length) ?? 0, target: 1, route: "/production/scheduling" },
      { key: "mrp", label: "⑦ MRP运算", hint: "生产建议", count: ((_g = production.mrpRecommendations) == null ? void 0 : _g.length) ?? 0, target: 1, route: "/production/mrp" },
      { key: "pr", label: "⑧ 需求产生(PR)", hint: "采购申请", count: ((_h = purchase.purchaseRequests) == null ? void 0 : _h.length) ?? 0, target: 1, route: "/purchase/requests" },
      { key: "po", label: "⑨ PR转PO", hint: "采购订单", count: ((_i = purchase.purchaseOrders) == null ? void 0 : _i.length) ?? 0, target: 1, route: "/purchase/orders" },
      { key: "asn", label: "⑩ 供应商交货(ASN)", hint: "仓储入库", count: ((_j = warehouse.inboundOrders) == null ? void 0 : _j.filter((o) => o.type === "asn").length) ?? 0, target: 1, route: "/warehouse/inbound" },
      { key: "track", label: "⑪ 物流跟踪", hint: "销售物流", count: ((_k = sales.shipments) == null ? void 0 : _k.filter((s) => !!s.trackingNo).length) ?? 0, target: 1, route: "/sales/logistics" },
      { key: "arrival", label: "⑫ 到货登记", hint: "仓储入库", count: ((_l = warehouse.inboundOrders) == null ? void 0 : _l.filter((o) => o.type === "purchase").length) ?? 0, target: 1, route: "/warehouse/inbound" },
      { key: "qc", label: "⑬ 检验", hint: "质量检验", count: ((_m = quality.inspectionTasks) == null ? void 0 : _m.length) ?? 0, target: 1, route: "/quality/inspection" },
      { key: "inbound", label: "⑭ 入库(过账)", hint: "仓储入库", count: ((_n = warehouse.inboundOrders) == null ? void 0 : _n.filter((o) => o.type === "purchase" && o.status === "completed").length) ?? 0, target: 1, route: "/warehouse/inbound" },
      { key: "produce", label: "⑮ 生产执行", hint: "生产工单", count: ((_o = production.workOrders) == null ? void 0 : _o.filter((wo) => wo.status === "in_progress" || wo.status === "completed").length) ?? 0, target: 1, route: "/production/orders" },
      { key: "fg", label: "⑯ 成品入库", hint: "仓储完工", count: ((_p = warehouse.finishedGoodsInbounds) == null ? void 0 : _p.length) ?? 0, target: 1, route: "/warehouse/fg-inbound" },
      { key: "outbound", label: "⑰ 出库(发货)", hint: "仓储出库", count: ((_q = warehouse.outboundOrders) == null ? void 0 : _q.filter((o) => o.type === "sale" || o.type === "pick").length) ?? 0, target: 1, route: "/warehouse/outbound" },
      { key: "invoice", label: "⑱ 销售开票(AR)", hint: "应收", count: ((_r = arap.receivables) == null ? void 0 : _r.length) ?? 0, target: 1, route: "/finance/receivables" },
      { key: "receive", label: "⑲ 收款", hint: "应收", count: ((_s = arap.receivables) == null ? void 0 : _s.filter((r) => (r.paidAmount ?? 0) > 0).length) ?? 0, target: 1, route: "/finance/receivables" }
    ];
  }, [sales, contracts, production, purchase, warehouse, quality, arap]);
  const doneCount = nodes.filter((n) => n.count >= n.target).length;
  const total = nodes.length;
  const progress = Math.round(doneCount / total * 100);
  const handleSeed = () => {
    if (useSalesStore.getState().salesOrders.some((o) => {
      var _a;
      return (_a = o.orderNo) == null ? void 0 : _a.startsWith("SO-DEMO-");
    })) {
      setSeedMsg("演示链路数据已存在（SO-DEMO-*），无需重复填充。如需重跑，请先「重置本地数据」。");
      return;
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const ts = Date.now();
    const d = today.replace(/-/g, "");
    const prospectId = `p-demo-${ts}`;
    const contractId = `sc-demo-${ts}`;
    const contractNo = `SC-DEMO-${d}`;
    const soId = `so-demo-${ts}`;
    const soNo = `SO-DEMO-${d}`;
    const woId = `wo-demo-${ts}`;
    const woNo = `WO-DEMO-${d}`;
    const mrpId = `mrp-demo-${ts}`;
    const prId = `pr-demo-${ts}`;
    const prNo = `PR-DEMO-${d}`;
    const poId = `po-demo-${ts}`;
    const poNo = `PO-DEMO-${d}`;
    const asnId = `asn-demo-${ts}`;
    const arrivalId = `in-demo-${ts}`;
    const inNo = `IN-DEMO-${d}`;
    const qcId = `qc-demo-${ts}`;
    const shipId = `ship-demo-${ts}`;
    const shipNo = `SH-DEMO-${d}`;
    const outId = `out-demo-${ts}`;
    const outNo = `OUT-SALE-${d}`;
    const arId = `ar-demo-${ts}`;
    const arNo = `SI-DEMO-${d}`;
    const S = useSalesStore.getState();
    const SC = useSalesContractStore.getState();
    const PR = useProductionStore.getState();
    const PU = usePurchaseStore.getState();
    const WH = useWarehouseStore.getState();
    const QC = useQualityStore.getState();
    const AR = useArapStore.getState();
    S.addProspect({
      id: prospectId,
      prospectNo: `P-${d}`,
      companyName: "华润建筑集团有限公司",
      contactName: "李工",
      contactPhone: "13800000000",
      contactEmail: "li@hr.com",
      source: "referral",
      status: "quoted",
      interestProducts: ["PRD-FRAME-001"],
      assignedTo: "演示",
      followupRecords: [{ id: `f-${ts}`, date: today, method: "visit", content: "现场拜访，确认重型钢结构焊接架需求", result: "客户确认采购 10 件", followedBy: "演示" }],
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    SC.addContract({
      id: contractId,
      contractNo,
      name: "演示销售合同-钢结构焊接架",
      customerId: "cus-001",
      customerName: "华润建筑集团有限公司",
      customerCode: "C001",
      salesPerson: "演示",
      amount: 86e3,
      startDate: today,
      endDate: today,
      status: "active",
      items: [{ id: `ci-${ts}`, materialId: "mat-fg-001", materialCode: "PRD-FRAME-001", materialName: "重型钢结构焊接架 H1200", specification: "H1200", unit: "件", quantity: 10, unitPrice: 8600, amount: 86e3 }],
      paymentSchedule: [{ id: `ps-${ts}`, stage: "发货前付款", percentage: 100, amount: 86e3, received: false }],
      createdAt: now,
      updatedAt: now
    });
    S.addSalesOrder({
      id: soId,
      orderNo: soNo,
      type: "standard",
      status: "confirmed",
      customerId: "cus-001",
      customerName: "华润建筑集团有限公司",
      customerCode: "C001",
      salesPerson: "演示",
      items: [{ id: `soi-${ts}`, materialId: "mat-fg-001", materialCode: "PRD-FRAME-001", materialName: "重型钢结构焊接架 H1200", specification: "H1200", unit: "件", quantity: 10, unitPrice: 8600, amount: 86e3 }],
      totalAmount: 86e3,
      taxRate: 13,
      taxAmount: 11180,
      grandTotal: 97180,
      orderDate: today,
      expectedDeliveryDate: today,
      linkedWorkOrders: [],
      contractId,
      contractNo,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    S.updateSalesOrder(soId, {
      approvalRecords: [{ id: `ap-${ts}`, nodeName: "订单评审", approver: "演示主管", action: "approve", comments: "评审通过", operatedAt: now }]
    });
    PR.addWorkOrder({
      id: woId,
      orderNo: woNo,
      status: "released",
      productCode: "PRD-FRAME-001",
      productName: "重型钢结构焊接架 H1200",
      bomId: "",
      bomNo: "",
      routeId: "",
      routeNo: "",
      plannedQuantity: 10,
      completedQuantity: 0,
      scrapQuantity: 0,
      plannedStartDate: today,
      plannedEndDate: today,
      priority: "normal",
      workshop: "生产一车间",
      supervisor: "",
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    PR.addMrpRecommendation({
      id: mrpId,
      materialCode: "MAT202405010001",
      materialName: "钢板 Q235B",
      currentStock: 85,
      safetyStock: 50,
      requiredQuantity: 200,
      onOrderQuantity: 0,
      suggestedQuantity: 200,
      unit: "吨",
      suggestedDate: today,
      reason: `生产工单 ${woNo} 需求`,
      type: "purchase",
      priority: "normal"
    });
    PU.addPurchaseRequest({
      id: prId,
      requestNo: prNo,
      title: "钢板采购申请",
      applicant: "演示",
      department: "生产部",
      type: "material",
      priority: "normal",
      reason: "生产焊接架需要钢板",
      expectedDate: today,
      status: "approved",
      items: [{ id: `pri-${ts}`, materialId: "mat-001", materialCode: "MAT202405010001", materialName: "钢板 Q235B", specification: "10mm", unit: "吨", quantity: 200, estimatedPrice: 4200, estimatedAmount: 84e4 }],
      totalAmount: 84e4,
      sourceType: "mrp",
      sourceNo: mrpId,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    PU.addPurchaseOrder({
      id: poId,
      orderNo: poNo,
      requestId: prId,
      vendorId: "ven-001",
      vendorName: "上海宝钢钢铁贸易有限公司",
      status: "sent",
      purchaseType: "material",
      orderDate: today,
      expectedDeliveryDate: today,
      items: [{ id: `poi-${ts}`, materialId: "mat-001", materialCode: "MAT202405010001", materialName: "钢板 Q235B", specification: "10mm", unit: "吨", orderedQuantity: 200, deliveredQuantity: 0, unitPrice: 4200, amount: 84e4, taxRate: 13, taxAmount: 109200, priceWithTax: 4746, amountWithTax: 949200 }],
      totalAmount: 84e4,
      currency: "CNY",
      totalTaxAmount: 109200,
      grandTotal: 949200,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    WH.addInboundOrder({
      id: asnId,
      inboundNo: `ASN-DEMO-${d}`,
      type: "asn",
      sourceNo: poNo,
      vendorId: "ven-001",
      vendorName: "上海宝钢钢铁贸易有限公司",
      status: "pending",
      asnShipmentNo: `SHIP-${d}`,
      warehouseId: "wh-001",
      operator: "演示",
      inboundDate: today,
      items: [{ id: `asni-${ts}`, materialId: "mat-001", materialCode: "MAT202405010001", materialName: "钢板 Q235B", specification: "10mm", unit: "吨", expectedQuantity: 200, actualQuantity: 0, qualityStatus: "qualified" }],
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    S.addShipment({
      id: shipId,
      shipmentNo: shipNo,
      salesOrderNo: soNo,
      customerName: "华润建筑集团有限公司",
      status: "in_transit",
      items: [{ id: `shi-${ts}`, materialId: "mat-fg-001", materialCode: "PRD-FRAME-001", materialName: "重型钢结构焊接架 H1200", specification: "H1200", unit: "件", orderQuantity: 10, shipQuantity: 10, unitPrice: 8600, amount: 86e3 }],
      transportMode: "road",
      carrier: "演示物流",
      trackingNo: `TRK-${d}`,
      estimatedPickupDate: today,
      estimatedDeliveryDate: today,
      originAddress: "工厂仓库",
      destinationAddress: "客户工地",
      packageCount: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    WH.addInboundOrder({
      id: arrivalId,
      inboundNo: inNo,
      type: "purchase",
      sourceNo: poNo,
      vendorId: "ven-001",
      vendorName: "上海宝钢钢铁贸易有限公司",
      status: "pending",
      warehouseId: "wh-001",
      operator: "演示",
      inboundDate: today,
      items: [{ id: `ini-${ts}`, materialId: "mat-001", materialCode: "MAT202405010001", materialName: "钢板 Q235B", specification: "10mm", unit: "吨", expectedQuantity: 200, actualQuantity: 200, qualityStatus: "qualified", unitPrice: 4200, amount: 84e4 }],
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    QC.addInspectionTask({
      id: qcId,
      taskNo: `QC-DEMO-${d}`,
      type: "incoming",
      status: "pending",
      materialId: "mat-001",
      materialCode: "MAT202405010001",
      materialName: "钢板 Q235B",
      batchNo: `B${d}`,
      quantity: 200,
      sampleQuantity: 20,
      inspectionStandardId: "std-001",
      inspectionStandardName: "钢材来料检验标准",
      assignedTo: "演示质检",
      plannedDate: today,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    WH.updateInboundOrder(arrivalId, { status: "completed" });
    PR.updateWorkOrder(woId, { status: "in_progress", actualStartDate: today });
    PR.completeWorkOrder(woId, { completedQuantity: 10, scrapQuantity: 0, actualEndDate: today, actualTotalCost: 86e3, operator: "演示" });
    WH.addOutboundOrder({
      id: outId,
      outboundNo: outNo,
      type: "sale",
      sourceNo: soNo,
      customerId: "cus-001",
      customerName: "华润建筑集团有限公司",
      warehouseId: "wh-003",
      operator: "演示",
      outboundDate: today,
      status: "completed",
      items: [{ id: `outi-${ts}`, materialId: "mat-fg-001", materialCode: "PRD-FRAME-001", materialName: "重型钢结构焊接架 H1200", specification: "H1200", unit: "件", quantity: 10 }],
      createdAt: now,
      updatedAt: now,
      createdBy: "seed",
      updatedBy: "seed"
    });
    AR.addReceivable({
      id: arId,
      customerId: "cus-001",
      customerName: "华润建筑集团有限公司",
      invoiceNo: arNo,
      amount: 97180,
      paidAmount: 0,
      balance: 97180,
      dueDate: today,
      status: "open",
      remarks: "销售开票-演示"
    });
    AR.updateReceivable(arId, { paidAmount: 97180, balance: 0, status: "closed" });
    setSeedMsg("已填充完整销售业务端到端链路（19 环节），使用真实主数据（mat-001 钢板 / mat-fg-001 成品 / cus-001 / ven-001 / std-001）。事件驱动回写已触发：采购入库→库存过账+GR/IR暂估凭证+PO回写；生产完工→生产入库单+成品台账+生产成本凭证；销售出库→COGS凭证+SO回写；销售开票→应收，收款→核销。");
  };
  const handleReset = () => {
    if (typeof window !== "undefined") {
      Object.keys(localStorage).filter((k) => k.startsWith("ssa-erp-")).forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "销售业务流程端到端自检面板（19 环节）",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(AutoFixHigh, {}), onClick: handleSeed, children: "一键填充演示链路" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}), onClick: handleReset, children: "重置本地数据" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "本面板用真实主数据重建一条完整的「客户跟进 → 收款」端到端销售业务链路（共 19 个环节），验证各模块 store 数据贯通与事件驱动回写。 点「一键填充演示链路」可快速构造一条可运行、可验证、可持久化（zustand persist → localStorage）的链路数据； 点「重置本地数据」可清空所有 ssa-erp-* 本地存储恢复初始状态。每个节点实时反映对应模块 store 数据量，点击可跳转对应业务页面。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 3, mb: 3, border: "1px solid rgba(226,232,240,.8)", borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 700, children: [
              "链路完成度 ",
              doneCount,
              "/",
              total
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${progress}%`, color: progress === 100 ? "success" : "primary" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: progress, sx: { height: 10, borderRadius: 5, mb: 2 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }, children: nodes.map((node) => {
            const ok = node.count >= node.target;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Paper,
              {
                "data-testid": `flow-node-${node.key}`,
                variant: "outlined",
                sx: { p: 1.5, display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer", "&:hover": { bgcolor: "#F8FAFC" } },
                onClick: () => navigate(node.route),
                children: [
                  ok ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { color: "#10B981" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, { sx: { color: "#CBD5E1" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: node.label }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                      node.hint,
                      " · 数据量 ",
                      node.count
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: (e) => {
                    e.stopPropagation();
                    navigate(node.route);
                  }, children: "查看" })
                ]
              },
              node.key
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "验证方式：① 应用内自检（本面板一键填充 + 节点跳转查看详情）；② Playwright E2E（",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "e2e/flow.spec.ts" }),
          "）覆盖全 19 环节断言与 localStorage 刷新持久化断言。"
        ] }),
        seedMsg && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mt: 2 }, onClose: () => setSeedMsg(""), children: seedMsg })
      ]
    }
  );
};
export {
  FlowSelfTest as default
};
