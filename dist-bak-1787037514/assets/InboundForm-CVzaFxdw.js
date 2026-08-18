import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { b as usePurchaseStore, c as useWarehouseStore, g as useOrgStore, u as useMaterialStore } from "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg } from "./warehouseMasterStore-Lmmy-9XL.js";
import "./customerStore-BnoPAbgi.js";
import "./priceStore-D4MzJqWs.js";
import "./salesPriceStore-BQbM-EvA.js";
import "./bomStore-CeDOOVVk.js";
import "./productionStore-B8YnWPVr.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./financeExtensionStore-mnFIWL7o.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./dataDictStore-RUHQ7-st.js";
import "./numberingStore-BLNwdXfi.js";
import "./reportPermissionStore-BsrP4O9H.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./purchaseInfoRecordStore-BlIKCtxc.js";
import "./sourceListStore-Z5_JkzNu.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./arapStore-BN8EGkkl.js";
import "./workbenchStore-vCZX2zeS.js";
import "./conditionStore-DfnsSgER.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./fmeaStore-DSfTzw2E.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-CZkl9-1x.js";
import { m as Box, T as Typography, bY as Grid, bv as TextField, bm as Button, n as Divider, aQ as Select, aR as MenuItem, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bZ as ArrowBack, bd as Save } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
import "./CategoryList-BiXjmJ7_.js";
import "./DataTable-BBJNxQ8l.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
import "./ConfirmDialog-BAhqBvAF.js";
const InboundForm = () => {
  var _a;
  const navigate = useNavigate();
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const addInboundOrder = useWarehouseStore((s) => s.addInboundOrder);
  const warehouses = useWarehouseMasterStore((s) => s.warehouses);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const materials = useMaterialStore((s) => s.materials);
  const [orderNo, setOrderNo] = reactExports.useState("");
  const [selectedOrder, setSelectedOrder] = reactExports.useState(null);
  const inboundCategoryIds = reactExports.useMemo(() => {
    const ids = /* @__PURE__ */ new Set();
    ((selectedOrder == null ? void 0 : selectedOrder.items) ?? []).forEach((it) => {
      const mid = it.materialId || it.id;
      const m = materials.find((mm) => mm.id === mid);
      if (m == null ? void 0 : m.categoryId) ids.add(m.categoryId);
    });
    return [...ids];
  }, [selectedOrder, materials]);
  const [warehouseId, setWarehouseId] = reactExports.useState(((_a = visibleWarehouses[0]) == null ? void 0 : _a.id) || "wh-001");
  const [itemBatches, setItemBatches] = reactExports.useState({});
  const [itemLocations, setItemLocations] = reactExports.useState({});
  const [itemProductionDates, setItemProductionDates] = reactExports.useState({});
  const handleSearch = () => {
    const order = purchaseOrders.find((o) => o.orderNo === orderNo);
    setSelectedOrder(order || null);
  };
  const selectedWarehouse = visibleWarehouses.find((w) => w.id === warehouseId) || visibleWarehouses[0];
  const buildInboundOrder = (status) => {
    if (!selectedOrder) return;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = `inbound-${Date.now()}`;
    const inboundNo = `IB${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}${String(Date.now()).slice(-4)}`;
    const wh = selectedWarehouse;
    addInboundOrder({
      id,
      inboundNo,
      type: "purchase",
      sourceNo: selectedOrder.orderNo,
      vendorId: selectedOrder.vendorId,
      vendorName: selectedOrder.vendorName,
      status,
      warehouseId: (wh == null ? void 0 : wh.id) || warehouseId,
      warehouseName: (wh == null ? void 0 : wh.name) || "主仓库",
      orgId: currentOrgId,
      operator: "当前用户",
      inboundDate: now.slice(0, 10),
      items: selectedOrder.items.map((item) => {
        const locId = itemLocations[item.id] || "";
        const loc = wh == null ? void 0 : wh.locations.find((l) => l.id === locId);
        const prodDate = itemProductionDates[item.id] || "";
        const materials2 = useMaterialStore.getState().materials;
        const material = materials2.find((m) => m.id === (item.materialId || item.id));
        let expiryDate = "";
        if (prodDate && (material == null ? void 0 : material.shelfLifeDays) && material.shelfLifeDays > 0) {
          const d = new Date(prodDate);
          d.setDate(d.getDate() + material.shelfLifeDays);
          expiryDate = d.toISOString().slice(0, 10);
        }
        return {
          id: `item-${item.id}-${Date.now()}`,
          materialId: item.materialId || item.id,
          materialCode: item.materialCode,
          materialName: item.materialName,
          specification: item.specification,
          unit: item.unit,
          expectedQuantity: item.orderedQuantity - item.deliveredQuantity,
          actualQuantity: item.orderedQuantity - item.deliveredQuantity,
          qualityStatus: "qualified",
          batchNo: itemBatches[item.id] || void 0,
          locationId: locId || void 0,
          locationName: (loc == null ? void 0 : loc.name) || void 0,
          productionDate: prodDate || void 0,
          expiryDate: expiryDate || void 0
        };
      }),
      createdAt: now,
      updatedAt: now,
      createdBy: "admin",
      updatedBy: "admin"
    });
    navigate("/warehouse/inbound");
  };
  const handleSubmit = () => buildInboundOrder("completed");
  const handleSaveDraft = () => buildInboundOrder("pending");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "新建入库单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "inbound", currentStatus: "ib_created" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate(-1), sx: { mr: 1 }, children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: handleSaveDraft, sx: { mr: 1 }, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), disabled: !selectedOrder, onClick: handleSubmit, "data-testid": "complete-inbound", children: "确认入库" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "采购订单查询" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "采购订单号",
                value: orderNo,
                onChange: (e) => setOrderNo(e.target.value),
                fullWidth: true,
                placeholder: "输入订单号，如：PO20240506001"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSearch, children: "查询" }) })
          ] })
        ] }),
        selectedOrder && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "订单信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 3, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "订单号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: selectedOrder.orderNo })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 3, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "供应商" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: selectedOrder.vendorName })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 3, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "订单金额" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: formatCurrency(selectedOrder.totalAmount) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 3, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "预计交货日期" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: selectedOrder.expectedDeliveryDate })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 3, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "收货仓库" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Select,
                  {
                    size: "small",
                    value: warehouseId,
                    onChange: (e) => setWarehouseId(e.target.value),
                    fullWidth: true,
                    sx: { mt: 0.5 },
                    children: visibleWarehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ResponsiblePersons,
              {
                categoryIds: inboundCategoryIds,
                roles: ["warehouse_keeper"],
                title: "相关物料责任人（入库）"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "入库明细" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料编码" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格型号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "订单数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "已入库数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "本次入库" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "批次号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "库位" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "生产日期" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "到期日" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: selectedOrder.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialCode }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialName }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.specification }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.unit }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.orderedQuantity }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.deliveredQuantity }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    type: "number",
                    size: "small",
                    defaultValue: item.orderedQuantity - item.deliveredQuantity,
                    sx: { width: 100 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    size: "small",
                    placeholder: "批次号",
                    value: itemBatches[item.id] || "",
                    onChange: (e) => setItemBatches((prev) => ({ ...prev, [item.id]: e.target.value })),
                    sx: { width: 120 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    size: "small",
                    displayEmpty: true,
                    value: itemLocations[item.id] || "",
                    onChange: (e) => setItemLocations((prev) => ({ ...prev, [item.id]: e.target.value })),
                    sx: { minWidth: 130 },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "不指定" }) }),
                      ((selectedWarehouse == null ? void 0 : selectedWarehouse.locations) || []).map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: l.id, children: l.name }, l.id))
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    type: "date",
                    size: "small",
                    value: itemProductionDates[item.id] || "",
                    onChange: (e) => setItemProductionDates((prev) => ({ ...prev, [item.id]: e.target.value })),
                    InputLabelProps: { shrink: true },
                    sx: { width: 150 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: (() => {
                  const prodDate = itemProductionDates[item.id];
                  if (!prodDate) return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "-" });
                  const materials2 = useMaterialStore.getState().materials;
                  const material = materials2.find((m) => m.id === (item.materialId || item.id));
                  if (!(material == null ? void 0 : material.shelfLifeDays) || material.shelfLifeDays <= 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "无保质期" });
                  const d = new Date(prodDate);
                  d.setDate(d.getDate() + material.shelfLifeDays);
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: d.toISOString().slice(0, 10) });
                })() })
              ] }, item.id)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "填写批次号后，确认入库将自动维护对应物料的批次库存（FIFO 出库时按入库日期消耗）。" })
          ] })
        ] })
      ]
    }
  );
};
export {
  InboundForm as default
};
