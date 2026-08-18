import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { u as useMaterialStore, c as useWarehouseStore, g as useOrgStore } from "./index-CU2cqxc8.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-BarjZ0VW.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg } from "./warehouseMasterStore-BjZtdDuE.js";
import { m as Box, T as Typography, bY as Grid, bv as TextField, aR as MenuItem, n as Divider, bm as Button, bh as Add, aS as Paper, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aM as IconButton, be as Delete, bZ as ArrowBack, bd as Save } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./customerStore-BZF1KdNo.js";
import "./priceStore-DijJfeBL.js";
import "./salesPriceStore-cjxfIxIT.js";
import "./conditionStore-DTiljowj.js";
import "./bomStore-Gzuh4wJM.js";
import "./productionStore-3WoghQIz.js";
import "./productionOperationStore-BOD4obub.js";
import "./financeExtensionStore-DxSjHPMg.js";
import "./productionVersionStore-RUhZ-sHu.js";
import "./subcontractStore-DEU0s8qw.js";
import "./equipmentStore-Be67EIyI.js";
import "./productionSchedulingStore-jeZjQvFy.js";
import "./vendorPerformanceStore-DSqs7hVk.js";
import "./vendorPortalStore-B2sPBeRr.js";
import "./dataDictStore-66NejlLO.js";
import "./options-BINuI5Gr.js";
import "./numberingStore-BDs7p47y.js";
import "./reportPermissionStore-dkLqyfDv.js";
import "./salesAdvancedStore-BUVrzeLF.js";
import "./purchaseAdvancedStore-X5oSWK-7.js";
import "./warehouseAdvancedStore-D-kOSyQs.js";
import "./qualityAdvancedStore-Bdw6LGIv.js";
import "./vendorRating-DKHWnbxs.js";
import "./materialExtensionStore-BnWp3IKN.js";
import "./purchaseInfoRecordStore-DLQisuuK.js";
import "./sourceListStore-DG1dXUIB.js";
import "./qualityExtensionStore-BDssWY5M.js";
import "./analyticsStore-DaEDsYjs.js";
import "./arapStore-Cccu0U7n.js";
import "./workbenchStore-COBsjc3d.js";
import "./ecnStore-D8unIvA0.js";
import "./rebateStore-89dNxLDm.js";
import "./fmeaStore-CKbOOC47.js";
import "./CategoryList-2VT4U_Gi.js";
import "./DataTable-uFcG_dYG.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
import "./ConfirmDialog-Dv8y0jQp.js";
const OutboundForm = () => {
  var _a;
  const navigate = useNavigate();
  const materials = useMaterialStore((s) => s.materials);
  const addOutboundOrder = useWarehouseStore((s) => s.addOutboundOrder);
  const warehouses = useWarehouseMasterStore((s) => s.warehouses);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const [outboundType, setOutboundType] = reactExports.useState("pick");
  const [warehouseId, setWarehouseId] = reactExports.useState(((_a = visibleWarehouses[0]) == null ? void 0 : _a.id) || "wh-001");
  const [items, setItems] = reactExports.useState([]);
  const outboundCategoryIds = reactExports.useMemo(() => {
    const ids = /* @__PURE__ */ new Set();
    items.forEach((it) => {
      if (it.materialId) {
        const m = materials.find((mm) => mm.id === it.materialId);
        if (m == null ? void 0 : m.categoryId) ids.add(m.categoryId);
      }
    });
    return [...ids];
  }, [items, materials]);
  const [picker, setPicker] = reactExports.useState("");
  const [packagingMethod, setPackagingMethod] = reactExports.useState("");
  const [packageCount, setPackageCount] = reactExports.useState("");
  const [weight, setWeight] = reactExports.useState("");
  const [volume, setVolume] = reactExports.useState("");
  const selectedWarehouse = visibleWarehouses.find((w) => w.id === warehouseId) || visibleWarehouses[0];
  const addItem = () => {
    setItems([...items, {
      id: `item-${Date.now()}`,
      materialId: "",
      materialName: "",
      specification: "",
      unit: "",
      availableQuantity: 0,
      quantity: 1
    }]);
  };
  const removeItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };
  const updateItem = (id, field, value) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === "materialId") {
          const material = materials.find((m) => m.id === value);
          if (material) {
            updatedItem.materialCode = material.code;
            updatedItem.materialName = material.name;
            updatedItem.specification = material.specification || "";
            updatedItem.unit = material.unit;
            updatedItem.availableQuantity = material.currentStock;
          }
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
  };
  const generateOutboundNo = () => {
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 1e3).toString().padStart(3, "0");
    return `OUT${date}${random}`;
  };
  const buildOrder = (status) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const today = now.slice(0, 10);
    const operator = "系统用户";
    const wh = selectedWarehouse;
    const orderItems = items.map((item) => {
      const loc = wh == null ? void 0 : wh.locations.find((l) => l.id === item.locationId);
      return {
        id: item.id,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        batchNo: item.batchNo || void 0,
        locationId: item.locationId || void 0,
        locationName: (loc == null ? void 0 : loc.name) || void 0
      };
    });
    return {
      id: `out-${Date.now()}`,
      outboundNo: generateOutboundNo(),
      type: outboundType,
      status,
      warehouseId: (wh == null ? void 0 : wh.id) || warehouseId,
      warehouseName: (wh == null ? void 0 : wh.name) || "主仓库",
      orgId: currentOrgId,
      operator,
      outboundDate: today,
      items: orderItems,
      picker: picker || void 0,
      packagingMethod: packagingMethod || void 0,
      packageCount: packageCount ? Number(packageCount) : void 0,
      weight: weight ? Number(weight) : void 0,
      volume: volume ? Number(volume) : void 0,
      createdAt: now,
      updatedAt: now,
      createdBy: operator,
      updatedBy: operator
    };
  };
  const handleSubmit = () => {
    const order = buildOrder("processing");
    addOutboundOrder(order);
    navigate("/warehouse/outbound");
  };
  const handleSaveDraft = () => {
    const order = buildOrder("pending");
    addOutboundOrder(order);
    navigate("/warehouse/outbound");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "新建出库单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "outbound", currentStatus: "ob_draft" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate(-1), sx: { mr: 1 }, children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: handleSaveDraft, sx: { mr: 1 }, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), disabled: items.length === 0, onClick: handleSubmit, children: "确认出库" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "出库信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                label: "出库类型",
                value: outboundType,
                onChange: (e) => setOutboundType(e.target.value),
                fullWidth: true,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "sale", children: "销售出库" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "pick", children: "领料出库" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "transfer", children: "调拨出库" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                label: "出库仓库",
                value: warehouseId,
                onChange: (e) => setWarehouseId(e.target.value),
                fullWidth: true,
                children: visibleWarehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "拣配人",
                value: picker,
                onChange: (e) => setPicker(e.target.value),
                fullWidth: true,
                placeholder: "请输入拣配人"
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "包装信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                label: "包装方式",
                value: packagingMethod,
                onChange: (e) => setPackagingMethod(e.target.value),
                fullWidth: true,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "不指定" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "carton", children: "纸箱" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "wooden", children: "木箱" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "pallet", children: "托盘" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "bare", children: "裸装" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "件数",
                type: "number",
                value: packageCount,
                onChange: (e) => setPackageCount(e.target.value ? Number(e.target.value) : ""),
                fullWidth: true,
                inputProps: { min: 1 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "重量(kg)",
                type: "number",
                value: weight,
                onChange: (e) => setWeight(e.target.value ? Number(e.target.value) : ""),
                fullWidth: true,
                inputProps: { min: 0, step: 0.01 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "体积(m³)",
                type: "number",
                value: volume,
                onChange: (e) => setVolume(e.target.value ? Number(e.target.value) : ""),
                fullWidth: true,
                inputProps: { min: 0, step: 1e-3 }
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: addItem, children: "添加物料" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiblePersons,
          {
            categoryIds: outboundCategoryIds,
            roles: ["warehouse_keeper"],
            title: "相关物料责任人（出库）"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格型号" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "可用库存" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "出库数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "批次号" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "库位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 80, children: "操作" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  select: true,
                  size: "small",
                  value: item.materialId,
                  onChange: (e) => updateItem(item.id, "materialId", e.target.value),
                  sx: { minWidth: 200 },
                  children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: m.id, children: m.name }, m.id))
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.specification }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.unit }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.availableQuantity }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  type: "number",
                  size: "small",
                  value: item.quantity,
                  onChange: (e) => updateItem(item.id, "quantity", Number(e.target.value)),
                  sx: { width: 100 },
                  inputProps: { max: item.availableQuantity }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  placeholder: "批次号",
                  value: item.batchNo || "",
                  onChange: (e) => updateItem(item.id, "batchNo", e.target.value),
                  sx: { width: 120 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                TextField,
                {
                  select: true,
                  size: "small",
                  displayEmpty: true,
                  value: item.locationId || "",
                  onChange: (e) => updateItem(item.id, "locationId", e.target.value),
                  sx: { minWidth: 130 },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "不指定" }) }),
                    ((selectedWarehouse == null ? void 0 : selectedWarehouse.locations) || []).map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: l.id, children: l.name }, l.id))
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => removeItem(item.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
            ] }, item.id)),
            items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, sx: { textAlign: "center", color: "text.secondary" }, children: '暂无出库物料，请点击"添加物料"按钮添加' }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "指定批次号 / 库位后，确认出库将按 FIFO（先入库先出库）消耗对应批次库存。" })
      ]
    }
  );
};
export {
  OutboundForm as default
};
