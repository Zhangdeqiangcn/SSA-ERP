import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { c as useWarehouseStore } from "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { F as FilterBar } from "./FilterBar-CgndUKQE.js";
import { A as ActionBar } from "./ActionBar-DYEbGKWc.js";
import { S as StatusBadge } from "./StatusBadge-D9w6gqgZ.js";
import { a as formatDate } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { aO as Chip, T as Typography, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, cM as FormControlLabel, cN as Switch, bE as DialogActions, bm as Button, n as Divider, m as Box } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./vendor-table-l-0Px9iQ.js";
import "./vendor-forms-CgMxq7_e.js";
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const genCheckNo = () => {
  const d = /* @__PURE__ */ new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9e3 + 1e3);
  return `CK${ymd}${rand}`;
};
const FREQ_LABELS = { weekly: "每周", monthly: "每月", quarterly: "每季度" };
const ABC_COLORS = { A: "error", B: "warning", C: "success" };
function generateCyclePlan() {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const addDays = (d, days) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().slice(0, 10);
  };
  return [
    {
      id: "cp-A-01",
      materialCategory: "冷轧板",
      abcClass: "A",
      frequency: "weekly",
      lastCheckDate: addDays(today, -5),
      nextCheckDate: addDays(today, 2),
      warehouseKeeper: "王仓管",
      responsibleWarehouse: "原料仓A"
    },
    {
      id: "cp-A-02",
      materialCategory: "热轧卷",
      abcClass: "A",
      frequency: "weekly",
      lastCheckDate: addDays(today, -3),
      nextCheckDate: addDays(today, 4),
      warehouseKeeper: "王仓管",
      responsibleWarehouse: "原料仓A"
    },
    {
      id: "cp-B-01",
      materialCategory: "不锈钢板",
      abcClass: "B",
      frequency: "monthly",
      lastCheckDate: addDays(today, -28),
      nextCheckDate: addDays(today, 2),
      warehouseKeeper: "李仓管",
      responsibleWarehouse: "原料仓B"
    },
    {
      id: "cp-B-02",
      materialCategory: "镀锌板",
      abcClass: "B",
      frequency: "monthly",
      lastCheckDate: addDays(today, -14),
      nextCheckDate: addDays(today, 16),
      warehouseKeeper: "李仓管",
      responsibleWarehouse: "原料仓B"
    },
    {
      id: "cp-C-01",
      materialCategory: "辅料五金",
      abcClass: "C",
      frequency: "quarterly",
      lastCheckDate: addDays(today, -80),
      nextCheckDate: addDays(today, 10),
      warehouseKeeper: "赵仓管",
      responsibleWarehouse: "辅料仓"
    },
    {
      id: "cp-C-02",
      materialCategory: "包装材料",
      abcClass: "C",
      frequency: "quarterly",
      lastCheckDate: addDays(today, -60),
      nextCheckDate: addDays(today, 30),
      warehouseKeeper: "赵仓管",
      responsibleWarehouse: "辅料仓"
    }
  ];
}
const CheckList = () => {
  const navigate = useNavigate();
  const checkTasks = useWarehouseStore((s) => s.checkTasks);
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const addCheckTask = useWarehouseStore((s) => s.addCheckTask);
  const [filterData, setFilterData] = reactExports.useState({});
  const [open, setOpen] = reactExports.useState(false);
  const [whId, setWhId] = reactExports.useState("");
  const [type, setType] = reactExports.useState("full");
  const [operator, setOperator] = reactExports.useState("系统管理员");
  const [blindMode, setBlindMode] = reactExports.useState(false);
  const [cyclePlans] = reactExports.useState(generateCyclePlan);
  const warehouses = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    inventoryRecords.forEach((r) => {
      if (r.warehouseId) map.set(r.warehouseId, r.warehouseName || r.warehouseId);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [inventoryRecords]);
  const handleCreate = () => {
    const wh = warehouses.find((w) => w.id === whId);
    if (!wh) return;
    const ts = nowStr();
    const items = inventoryRecords.filter((r) => r.warehouseId === whId).map((r, i) => ({
      id: `cki-${Date.now()}-${i}`,
      materialId: r.materialId,
      materialCode: r.materialCode,
      materialName: r.materialName,
      locationId: r.locationId,
      locationName: r.locationName,
      bookQuantity: r.quantity
    }));
    const task = {
      id: `ck-${Date.now()}`,
      taskNo: genCheckNo(),
      warehouseId: wh.id,
      warehouseName: wh.name,
      type,
      status: "pending",
      startDate: ts.slice(0, 10),
      operator: operator || "系统管理员",
      items,
      blindMode,
      createdAt: ts,
      updatedAt: ts,
      createdBy: "系统管理员",
      updatedBy: "系统管理员"
    };
    addCheckTask(task);
    setOpen(false);
    setWhId("");
    setBlindMode(false);
    navigate(`/warehouse/check/${task.id}`);
  };
  const columns = reactExports.useMemo(() => [
    { accessorKey: "taskNo", header: "盘点单号" },
    { accessorKey: "warehouseName", header: "仓库" },
    {
      accessorKey: "type",
      header: "盘点类型",
      cell: ({ row }) => row.original.type === "full" ? "全盘" : "抽盘"
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    {
      accessorKey: "blindMode",
      header: "盲盘",
      cell: ({ row }) => row.original.blindMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "盲盘", color: "secondary" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.disabled", children: "—" })
    },
    { accessorKey: "operator", header: "操作员" },
    { accessorKey: "startDate", header: "开始日期", cell: ({ row }) => formatDate(row.original.startDate) },
    { accessorKey: "endDate", header: "结束日期", cell: ({ row }) => formatDate(row.original.endDate) }
  ], []);
  const cyclePlanColumns = [
    { accessorKey: "materialCategory", header: "物料分类" },
    {
      accessorKey: "abcClass",
      header: "ABC 分类",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: row.original.abcClass, color: ABC_COLORS[row.original.abcClass], variant: "outlined" })
    },
    { accessorKey: "frequency", header: "盘点频率", cell: ({ row }) => FREQ_LABELS[row.original.frequency] },
    { accessorKey: "lastCheckDate", header: "上次盘点日" },
    {
      accessorKey: "nextCheckDate",
      header: "下次计划日",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 600, color: "primary.main", children: row.original.nextCheckDate })
    },
    { accessorKey: "warehouseKeeper", header: "负责仓管" },
    { accessorKey: "responsibleWarehouse", header: "所属仓库" }
  ];
  const filterFields = [
    { name: "taskNo", label: "盘点单号", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "pending", label: "待盘点" },
        { value: "processing", label: "盘点中" },
        { value: "completed", label: "已完成" },
        { value: "cancelled", label: "已取消" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...checkTasks];
    if (filterData.taskNo) {
      data = data.filter((t) => t.taskNo.includes(filterData.taskNo));
    }
    if (filterData.status) {
      data = data.filter((t) => t.status === filterData.status);
    }
    return data;
  }, [filterData]);
  const pickField = (r, headers, zh, en) => {
    const key = headers.find((h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase());
    return key ? r[key] ?? "" : "";
  };
  const STATUS_ZH = {
    待盘点: "pending",
    盘点中: "processing",
    已完成: "completed",
    已取消: "cancelled"
  };
  const mapCheckRow = (r, headers) => {
    const now = nowStr();
    const typeRaw = pickField(r, headers, "盘点类型", "type");
    const whName = pickField(r, headers, "仓库", "warehouse");
    const wh = warehouses.find((w) => w.name === whName);
    const blindRaw = pickField(r, headers, "盲盘", "blindMode");
    const blindMode2 = blindRaw === "是" || blindRaw.toLowerCase() === "y" || blindRaw.toLowerCase() === "true";
    const statusRaw = pickField(r, headers, "状态", "status");
    return {
      id: `ck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskNo: pickField(r, headers, "盘点单号", "taskNo") || genCheckNo(),
      warehouseId: (wh == null ? void 0 : wh.id) || whName || `wh-${Date.now()}`,
      warehouseName: whName,
      type: typeRaw === "抽盘" ? "partial" : "full",
      status: STATUS_ZH[statusRaw] || "pending",
      startDate: pickField(r, headers, "开始日期", "startDate") || now.slice(0, 10),
      endDate: pickField(r, headers, "结束日期", "endDate") || void 0,
      operator: pickField(r, headers, "操作员", "operator") || "系统管理员",
      items: [],
      blindMode: blindMode2,
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addCheckTask(mapCheckRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "库存盘点",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新建盘点", onClick: () => setOpen(true) }
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "xs", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建盘点单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "仓库",
                value: whId,
                onChange: (e) => setWhId(e.target.value),
                margin: "normal",
                "data-testid": "check-wh-select",
                children: warehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "盘点类型",
                value: type,
                onChange: (e) => setType(e.target.value),
                margin: "normal",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "full", children: "全盘" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "partial", children: "抽盘" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "操作员",
                value: operator,
                onChange: (e) => setOperator(e.target.value),
                margin: "normal"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FormControlLabel,
              {
                control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    checked: blindMode,
                    onChange: (e) => setBlindMode(e.target.checked),
                    "data-testid": "check-blind-mode",
                    color: "secondary"
                  }
                ),
                label: "盲盘模式（盘点时不显示账面数量）",
                sx: { mt: 1 }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                onClick: handleCreate,
                disabled: whId === "",
                "data-testid": "check-create-confirm",
                children: "创建盘点"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "warehouse-check-list",
            onImport: handleImport,
            onRowClick: (row) => navigate(`/warehouse/check/${row.id}`),
            onView: (row) => navigate(`/warehouse/check/${row.id}`)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", gutterBottom: true, children: "循环盘点计划（ABC 分类周期）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "A 类物料每周盘点、B 类每月盘点、C 类每季度盘点，按分类自动生成周期计划。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": "check-cycle-plan", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: cyclePlans,
            columns: cyclePlanColumns,
            enablePagination: false
          }
        ) })
      ]
    }
  );
};
export {
  CheckList as default
};
