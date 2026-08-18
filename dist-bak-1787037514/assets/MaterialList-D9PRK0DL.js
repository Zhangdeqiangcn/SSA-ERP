import { h as useNavigate, r as reactExports, j as jsxRuntimeExports, R as React } from "./vendor-react-Cc0tBtdY.js";
import { u as useMaterialStore } from "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { F as FilterBar } from "./FilterBar-CgndUKQE.js";
import { A as ActionBar } from "./ActionBar-DYEbGKWc.js";
import { S as StatusBadge } from "./StatusBadge-D9w6gqgZ.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
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
import "./warehouseMasterStore-Lmmy-9XL.js";
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
import { T as Typography, aO as Chip, m as Box, bv as TextField, bQ as InputAdornment, aT as Search, bL as Stack, bm as Button, bi as Edit, bl as Alert, b9 as Dialog, ba as DialogTitle, bc as DialogContent, aS as Paper, bE as DialogActions, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bW as CheckCircle, K as Block } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./vendor-table-l-0Px9iQ.js";
import "./vendor-forms-CgMxq7_e.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const MATERIAL_TYPE_LABELS = {
  raw: "原材料",
  semi: "半成品",
  finished: "成品",
  purchased: "外购",
  service: "服务"
};
const MAKE_OR_BUY_LABELS = {
  make: "自制",
  buy: "外购"
};
const LIFECYCLE_STATUS_LABELS = {
  draft: "创建中",
  active: "激活",
  phasing_out: "逐步淘汰",
  obsolete: "已淘汰"
};
const LIFECYCLE_STATUS_COLORS = {
  draft: "#94A3B8",
  active: "#10B981",
  phasing_out: "#F59E0B",
  obsolete: "#EF4444"
};
const flattenCategories = (nodes, acc = []) => {
  nodes.forEach((n) => {
    acc.push({ value: n.id, label: n.name });
    if (n.children && n.children.length) flattenCategories(n.children, acc);
  });
  return acc;
};
const MaterialList = () => {
  var _a;
  const navigate = useNavigate();
  const materials = useMaterialStore((s) => s.materials);
  const categories = useMaterialStore((s) => s.categories);
  const filter = useMaterialStore((s) => s.filter);
  const setFilter = useMaterialStore((s) => s.setFilter);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const deleteMaterial = useMaterialStore((s) => s.deleteMaterial);
  const addMaterial = useMaterialStore((s) => s.addMaterial);
  const columns = reactExports.useMemo(() => [
    { accessorKey: "code", header: "物料编码" },
    { accessorKey: "name", header: "物料名称" },
    { accessorKey: "categoryName", header: "分类" },
    { accessorKey: "specification", header: "规格型号" },
    { accessorKey: "unit", header: "单位" },
    {
      accessorKey: "materialType",
      header: "物料类型",
      cell: ({ row }) => row.original.materialType ? MATERIAL_TYPE_LABELS[row.original.materialType] ?? row.original.materialType : "-"
    },
    {
      accessorKey: "makeOrBuy",
      header: "自制外购",
      cell: ({ row }) => row.original.makeOrBuy ? MAKE_OR_BUY_LABELS[row.original.makeOrBuy] ?? row.original.makeOrBuy : "-"
    },
    {
      accessorKey: "currentStock",
      header: "当前库存",
      cell: ({ row }) => `${row.original.currentStock} ${row.original.unit}`
    },
    {
      accessorKey: "price",
      header: "单价",
      cell: ({ row }) => formatCurrency(row.original.price)
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    {
      accessorKey: "lifecycleStatus",
      header: "生命周期",
      cell: ({ row }) => {
        const ls = row.original.lifecycleStatus;
        if (!ls) return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "-" });
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: LIFECYCLE_STATUS_LABELS[ls] ?? ls,
            size: "small",
            sx: {
              bgcolor: (LIFECYCLE_STATUS_COLORS[ls] ?? "#94A3B8") + "15",
              color: LIFECYCLE_STATUS_COLORS[ls] ?? "#94A3B8",
              fontWeight: 500,
              fontSize: "0.75rem"
            }
          }
        );
      }
    }
  ], []);
  const distinctUnits = reactExports.useMemo(
    () => [...new Set(materials.map((m) => m.unit).filter(Boolean))],
    [materials]
  );
  const categoryOptions = reactExports.useMemo(
    () => [{ value: "", label: "全部" }, ...flattenCategories(categories)],
    [categories]
  );
  const unitOptions = reactExports.useMemo(
    () => [{ value: "", label: "全部" }, ...distinctUnits.map((u) => ({ value: u, label: u }))],
    [distinctUnits]
  );
  const filterFields = [
    { name: "code", label: "物料编码", type: "text" },
    { name: "name", label: "物料名称", type: "text" },
    { name: "categoryId", label: "分类", type: "select", options: categoryOptions },
    {
      name: "materialType",
      label: "物料类型",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "raw", label: "原材料" },
        { value: "semi", label: "半成品" },
        { value: "finished", label: "成品" },
        { value: "purchased", label: "外购" },
        { value: "service", label: "服务" }
      ]
    },
    {
      name: "makeOrBuy",
      label: "自制外购",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "make", label: "自制" },
        { value: "buy", label: "外购" }
      ]
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "active", label: "启用" },
        { value: "inactive", label: "停用" }
      ]
    },
    { name: "unit", label: "单位", type: "select", options: unitOptions },
    { name: "minPrice", label: "最低单价", type: "text" },
    { name: "maxPrice", label: "最高单价", type: "text" }
  ];
  const applyFilter = (values) => {
    const next = { ...filter };
    ["code", "name", "categoryId", "materialType", "makeOrBuy", "status", "unit"].forEach(
      (k) => {
        const v = values[k];
        if (v === "" || v === void 0 || v === null) delete next[k];
        else next[k] = v;
      }
    );
    if (values.minPrice === "" || values.minPrice === void 0 || values.minPrice === null) {
      delete next.minPrice;
    } else {
      next.minPrice = Number(values.minPrice);
    }
    if (values.maxPrice === "" || values.maxPrice === void 0 || values.maxPrice === null) {
      delete next.maxPrice;
    } else {
      next.maxPrice = Number(values.maxPrice);
    }
    setFilter(next);
  };
  const filteredData = reactExports.useMemo(() => {
    const kw = (filter.keyword || "").trim().toLowerCase();
    return materials.filter((m) => {
      if (filter.code && !m.code.includes(filter.code)) return false;
      if (filter.name && !m.name.includes(filter.name)) return false;
      if (filter.status && m.status !== filter.status) return false;
      if (filter.categoryId && m.categoryId !== filter.categoryId) return false;
      if (filter.materialType && m.materialType !== filter.materialType) return false;
      if (filter.makeOrBuy && m.makeOrBuy !== filter.makeOrBuy) return false;
      if (filter.unit && m.unit !== filter.unit) return false;
      if (typeof filter.minPrice === "number" && m.price < filter.minPrice) return false;
      if (typeof filter.maxPrice === "number" && m.price > filter.maxPrice) return false;
      if (kw) {
        const hit = [m.code, m.name, m.specification, m.model].some(
          (v) => v && v.toLowerCase().includes(kw)
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [materials, filter]);
  const handleBatchEnable = (rows) => {
    rows.forEach((m) => updateMaterial(m.id, { status: "active" }));
  };
  const handleBatchDisable = (rows) => {
    rows.forEach((m) => updateMaterial(m.id, { status: "inactive" }));
  };
  const handleBatchDelete = (rows) => {
    if (window.confirm(`确定删除选中的 ${rows.length} 条物料吗？此操作不可撤销。`)) {
      rows.forEach((m) => deleteMaterial(m.id));
    }
  };
  const batchActions = [
    {
      label: "批量启用",
      testId: "batch-enable",
      color: "success",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { fontSize: "small" }),
      onClick: handleBatchEnable
    },
    {
      label: "批量停用",
      testId: "batch-disable",
      color: "warning",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Block, { fontSize: "small" }),
      onClick: handleBatchDisable
    },
    {
      label: "批量修改",
      testId: "batch-edit",
      color: "primary",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }),
      onClick: (rows) => {
        selectedRowsRef.current = rows;
        handleBatchEditOpen(rows);
      }
    }
  ];
  const [templateOpen, setTemplateOpen] = reactExports.useState(false);
  const MATERIAL_TEMPLATES = [
    {
      id: "template-steel-plate",
      name: "钢板",
      description: "钢板 Q235B",
      defaults: {
        categoryId: "cat-001-1-1",
        categoryName: "钢板",
        materialType: "raw",
        makeOrBuy: "buy",
        unit: "吨",
        specification: "10mm*1500mm*6000mm"
      }
    },
    {
      id: "template-steel-pipe",
      name: "不锈钢管",
      description: "不锈钢管 304",
      defaults: {
        categoryId: "cat-001-2-1",
        categoryName: "钢管",
        materialType: "raw",
        makeOrBuy: "buy",
        unit: "根",
        specification: "DN50*3.5mm*6m"
      }
    },
    {
      id: "template-angle-steel",
      name: "角钢",
      description: "角钢 Q235",
      defaults: {
        categoryId: "cat-001-3-2",
        categoryName: "角钢",
        materialType: "raw",
        makeOrBuy: "buy",
        unit: "米",
        specification: "∠50*5"
      }
    }
  ];
  const handleCreateFromTemplate = (template) => {
    const params = new URLSearchParams();
    params.set("template", template.name);
    if (template.defaults.categoryId) params.set("categoryId", template.defaults.categoryId);
    if (template.defaults.categoryName) params.set("categoryName", template.defaults.categoryName);
    if (template.defaults.materialType) params.set("materialType", template.defaults.materialType);
    if (template.defaults.makeOrBuy) params.set("makeOrBuy", template.defaults.makeOrBuy);
    if (template.defaults.unit) params.set("unit", template.defaults.unit);
    if (template.defaults.specification) params.set("specification", template.defaults.specification);
    navigate(`/material/create?${params.toString()}`);
    setTemplateOpen(false);
  };
  const [batchEditOpen, setBatchEditOpen] = reactExports.useState(false);
  const [batchEditField, setBatchEditField] = reactExports.useState("status");
  const [batchEditValue, setBatchEditValue] = reactExports.useState("");
  const [batchEditSelected, setBatchEditSelected] = reactExports.useState([]);
  const batchEditFieldOptions = [
    { value: "categoryId", label: "分类", type: "select" },
    { value: "status", label: "状态", type: "select" },
    { value: "materialType", label: "物料类型", type: "select" },
    { value: "makeOrBuy", label: "自制外购", type: "select" },
    { value: "defaultVendorId", label: "默认供应商", type: "text" }
  ];
  const getBatchEditValueOptions = () => {
    switch (batchEditField) {
      case "status":
        return [{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }];
      case "materialType":
        return [
          { value: "raw", label: "原材料" },
          { value: "semi", label: "半成品" },
          { value: "finished", label: "成品" },
          { value: "purchased", label: "外购" },
          { value: "service", label: "服务" }
        ];
      case "makeOrBuy":
        return [{ value: "make", label: "自制" }, { value: "buy", label: "外购" }];
      case "categoryId":
        return flattenCategories(categories).map((c) => ({ value: c.value, label: c.label }));
      default:
        return [];
    }
  };
  const handleBatchEditOpen = (rows) => {
    if (rows.length === 0) return;
    setBatchEditSelected(rows);
    setBatchEditField("status");
    setBatchEditValue("");
    setBatchEditOpen(true);
  };
  const handleBatchEditConfirm = () => {
    var _a2;
    if (!batchEditValue) return;
    const selectedField = batchEditFieldOptions.find((f) => f.value === batchEditField);
    const isSelectField = (selectedField == null ? void 0 : selectedField.type) === "select";
    const finalValue = isSelectField ? batchEditValue : batchEditValue;
    if (batchEditField === "categoryId") {
      const catName = (_a2 = flattenCategories(categories).find((c) => c.value === batchEditValue)) == null ? void 0 : _a2.label;
      batchEditSelected.forEach((m) => updateMaterial(m.id, { categoryId: batchEditValue, categoryName: catName }));
    } else {
      batchEditSelected.forEach((m) => updateMaterial(m.id, { [batchEditField]: finalValue }));
    }
    setBatchEditOpen(false);
  };
  const selectedRowsRef = React.useRef([]);
  const [importResult, setImportResult] = reactExports.useState(null);
  const handleImport = (rows, _headers) => {
    let success = 0;
    let failed = 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    rows.forEach((row, i) => {
      const name = (row["物料名称"] ?? "").trim();
      const unit = (row["单位"] ?? "").trim();
      if (!name || !unit) {
        failed += 1;
        return;
      }
      const catName = (row["分类"] ?? "").trim();
      const cat = catName ? categories.find((c) => c.name === catName) : void 0;
      const code = (row["物料编码"] ?? "").trim() || `M${Date.now()}${i}`;
      try {
        addMaterial({
          id: `mat-${Date.now()}-${i}`,
          code,
          name,
          categoryId: (cat == null ? void 0 : cat.id) ?? "",
          categoryName: cat == null ? void 0 : cat.name,
          specification: (row["规格型号"] ?? "").trim() || void 0,
          unit,
          materialType: row["物料类型"] || void 0,
          makeOrBuy: row["自制外购"] || void 0,
          safetyStock: 0,
          minStock: 0,
          maxStock: 0,
          currentStock: Number(row["当前库存"]) || 0,
          price: Number(row["单价"]) || 0,
          currency: "CNY",
          status: row["状态"] || "active",
          createdAt: now,
          updatedAt: now,
          createdBy: "",
          updatedBy: ""
        });
        success += 1;
      } catch {
        failed += 1;
      }
    });
    setImportResult({ success, failed });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "物料列表",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新增物料", onClick: () => navigate("/material/create") }
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            placeholder: "模糊搜索：物料编码 / 名称 / 规格型号 / 型号",
            value: filter.keyword ?? "",
            onChange: (e) => setFilter({ ...filter, keyword: e.target.value }),
            InputProps: {
              startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(InputAdornment, { position: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { fontSize: "small" }) })
            },
            inputProps: { "data-testid": "material-keyword" }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: applyFilter, listKey: "material-list", columnConfigKey: "material-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
              "data-testid": "mat-batch-edit",
              onClick: () => handleBatchEditOpen(selectedRowsRef.current),
              disabled: selectedRowsRef.current.length === 0,
              children: [
                "批量修改 (",
                selectedRowsRef.current.length,
                ")"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              "data-testid": "mat-create-from-template",
              onClick: () => setTemplateOpen(true),
              children: "从模板创建"
            }
          )
        ] }),
        importResult && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Alert,
          {
            severity: importResult.failed > 0 ? "warning" : "success",
            sx: { mb: 2 },
            onClose: () => setImportResult(null),
            children: [
              "导入完成：成功 ",
              importResult.success,
              " 条，失败 ",
              importResult.failed,
              " 条"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            enableImport: true,
            onImport: handleImport,
            columnConfigKey: "material-list",
            batchActions,
            onBatchDelete: handleBatchDelete,
            onRowClick: (row) => navigate(`/material/${row.id}`),
            onView: (row) => navigate(`/material/${row.id}`),
            onEdit: (row) => navigate(`/material/${row.id}/edit`)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: templateOpen, onClose: () => setTemplateOpen(false), maxWidth: "xs", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "从模板创建物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "选择一个预设模板，系统将预填物料表单中的关键字段。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1.5, children: MATERIAL_TEMPLATES.map((tpl) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Paper,
              {
                variant: "outlined",
                sx: { p: 2, cursor: "pointer", "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" } },
                onClick: () => handleCreateFromTemplate(tpl),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: tpl.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: tpl.description }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `分类: ${tpl.defaults.categoryName}`, size: "small", variant: "outlined" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `单位: ${tpl.defaults.unit}`, size: "small", variant: "outlined" })
                  ] })
                ]
              },
              tpl.id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setTemplateOpen(false), children: "取消" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: batchEditOpen, onClose: () => setBatchEditOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "批量修改物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: [
              "已选择 ",
              batchEditSelected.length,
              " 条物料，选择要批量修改的字段并输入新值。"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择字段" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Select,
                  {
                    value: batchEditField,
                    label: "选择字段",
                    onChange: (e) => {
                      setBatchEditField(e.target.value);
                      setBatchEditValue("");
                    },
                    children: batchEditFieldOptions.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
                  }
                )
              ] }),
              ((_a = batchEditFieldOptions.find((f) => f.value === batchEditField)) == null ? void 0 : _a.type) === "select" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "新值" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Select,
                  {
                    value: batchEditValue,
                    label: "新值",
                    onChange: (e) => setBatchEditValue(e.target.value),
                    children: getBatchEditValueOptions().map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
                  }
                )
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  size: "small",
                  label: "新值",
                  value: batchEditValue,
                  onChange: (e) => setBatchEditValue(e.target.value)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setBatchEditOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleBatchEditConfirm, disabled: !batchEditValue, children: "确认修改" })
          ] })
        ] })
      ]
    }
  );
};
export {
  MaterialList as default
};
