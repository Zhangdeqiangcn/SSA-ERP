import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bX as Grid, bt as TextField, aO as MenuItem, i as Divider, bk as Button, bf as Add, aP as Paper, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aJ as IconButton, bc as Delete, bY as ArrowBack, bb as Save } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore, c as useWarehouseStore, g as useOrgStore } from "./index-CcOZBoQL.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-D9INyHNC.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg } from "./warehouseMasterStore-Ct1rrWsm.js";
import "./customerStore-IdYDDJRc.js";
import "./priceStore-BUzakAdL.js";
import "./salesPriceStore-BzUxjPzH.js";
import "./conditionStore-BSext3Wu.js";
import "./bomStore-VWzRK_BU.js";
import "./productionStore-D_DSIs05.js";
import "./productionOperationStore-ZzJ7_OWX.js";
import "./financeExtensionStore-DcH2weuS.js";
import "./productionVersionStore-D_-Ec9Z0.js";
import "./subcontractStore-CQ-ex-am.js";
import "./equipmentStore-D-RvzWch.js";
import "./productionSchedulingStore-BVkrPwFf.js";
import "./vendorPerformanceStore-BxbIBs-n.js";
import "./vendorPortalStore-d2uxDrSz.js";
import "./dataDictStore-B1uh9qqV.js";
import "./options-BINuI5Gr.js";
import "./numberingStore-DnRDBnD9.js";
import "./reportPermissionStore-BivOpSPb.js";
import "./salesAdvancedStore-CA71PkD6.js";
import "./purchaseAdvancedStore-DLlH_i-t.js";
import "./warehouseAdvancedStore-BrWnd5bC.js";
import "./qualityAdvancedStore-dxrXzSTj.js";
import "./vendorRating-DKHWnbxs.js";
import "./materialExtensionStore-B0eAxQzZ.js";
import "./purchaseInfoRecordStore-nI3akWE2.js";
import "./sourceListStore-BhAGJqGB.js";
import "./qualityExtensionStore-BtbaFcCN.js";
import "./analyticsStore-SaeDm71F.js";
import "./arapStore-BYvdVu0r.js";
import "./workbenchStore-DCSKoEhL.js";
import "./ecnStore-DIX7gpta.js";
import "./rebateStore-C8MR-wRT.js";
import "./fmeaStore--YKtrk44.js";
import "./CategoryList-DMRXpnYP.js";
import "./DataTable-vc5G5ARo.js";
import "./StatusBadge-Db1uY4YU.js";
import "./ConfirmDialog-BMZp8iYJ.js";
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
