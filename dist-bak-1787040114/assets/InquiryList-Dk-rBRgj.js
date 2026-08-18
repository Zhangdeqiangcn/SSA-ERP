import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bK as Stack, aL as Chip, B as Box, b7 as Dialog, b8 as DialogTitle, h as Typography, ba as DialogContent, bj as Alert, d0 as FormControlLabel, db as Checkbox, aP as Paper, bk as Button, i as Divider, bC as DialogActions, dx as ContentCopy, bf as Add } from "./vendor-DGU5TO-x.js";
import { b as usePurchaseStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FilterBar } from "./FilterBar-s9qV5iff.js";
import { A as ActionBar } from "./ActionBar-DmR-0fx0.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as usePriceStore } from "./priceStore-CduvTkzQ.js";
const STATUS_MAP = {
  draft: { label: "草稿", color: "default" },
  published: { label: "已发布", color: "info" },
  closed: { label: "已截止", color: "warning" },
  quotation_received: { label: "已收到报价", color: "primary" },
  compared: { label: "已比价", color: "success" }
};
const InquiryList = () => {
  const navigate = useNavigate();
  const priceInquiries = usePriceStore((s) => s.priceInquiries);
  const addPriceInquiry = usePriceStore((s) => s.addPriceInquiry);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);
  const [filterData, setFilterData] = reactExports.useState({});
  const [selectDialogOpen, setSelectDialogOpen] = reactExports.useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = reactExports.useState([]);
  const [selectedItemsMap, setSelectedItemsMap] = reactExports.useState({});
  const columns = reactExports.useMemo(() => [
    { accessorKey: "inquiryNo", header: "询价单号", size: 160 },
    { accessorKey: "title", header: "标题", size: 220 },
    { accessorKey: "inquirer", header: "询价人" },
    { accessorKey: "department", header: "部门" },
    {
      accessorKey: "targetVendorNames",
      header: "目标供应商",
      size: 250,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", children: row.original.targetVendorNames.map((name, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: name,
          size: "small",
          variant: "outlined",
          sx: { fontSize: "0.7rem", height: 20 }
        },
        idx
      )) })
    },
    {
      accessorKey: "deadline",
      header: "截止日期",
      cell: ({ row }) => formatDate(row.original.deadline)
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        var _a, _b;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: ((_a = STATUS_MAP[row.original.status]) == null ? void 0 : _a.label) || row.original.status,
            size: "small",
            color: ((_b = STATUS_MAP[row.original.status]) == null ? void 0 : _b.color) || "default",
            sx: { fontSize: "0.75rem" }
          }
        );
      }
    },
    {
      accessorKey: "totalEstimatedAmount",
      header: "预估总金额",
      accessorFn: (r) => Number(r.totalEstimatedAmount || 0),
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.totalEstimatedAmount) })
    }
  ], []);
  const buildMaterialColumns = (requestId) => [
    {
      id: "select",
      header: "",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Checkbox,
        {
          size: "small",
          checked: (selectedItemsMap[requestId] || []).includes(row.original.id),
          onChange: () => handleItemToggle(requestId, row.original.id)
        }
      )
    },
    { accessorKey: "materialCode", header: "物料编码" },
    { accessorKey: "materialName", header: "物料名称" },
    { accessorKey: "specification", header: "规格" },
    { accessorKey: "unit", header: "单位" },
    {
      accessorKey: "quantity",
      header: "数量",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: row.original.quantity })
    },
    {
      accessorKey: "estimatedPrice",
      header: "预估单价",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.estimatedPrice || 0) })
    },
    {
      accessorKey: "estimatedAmount",
      header: "预估金额",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.estimatedAmount || 0) })
    }
  ];
  const filterFields = [
    { name: "inquiryNo", label: "询价单号", type: "text" },
    { name: "title", label: "标题", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "draft", label: "草稿" },
        { value: "published", label: "已发布" },
        { value: "closed", label: "已截止" },
        { value: "quotation_received", label: "已收到报价" },
        { value: "compared", label: "已比价" }
      ]
    },
    { name: "inquirer", label: "询价人", type: "text" }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...priceInquiries];
    if (filterData.inquiryNo) data = data.filter((r) => r.inquiryNo.includes(filterData.inquiryNo));
    if (filterData.title) data = data.filter((r) => r.title.includes(filterData.title));
    if (filterData.status) data = data.filter((r) => r.status === filterData.status);
    if (filterData.inquirer) data = data.filter((r) => r.inquirer.includes(filterData.inquirer));
    return data;
  }, [filterData]);
  const approvedRequests = reactExports.useMemo(
    () => purchaseRequests.filter((r) => r.status === "approved" || r.status === "pending"),
    []
  );
  const handleRequestToggle = (requestId) => {
    setSelectedRequestIds(
      (prev) => prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };
  const handleItemToggle = (requestId, itemId) => {
    setSelectedItemsMap((prev) => {
      const current = prev[requestId] || [];
      const newItems = current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId];
      return { ...prev, [requestId]: newItems };
    });
  };
  const handleSelectAllItems = (requestId, itemIds) => {
    setSelectedItemsMap((prev) => ({
      ...prev,
      [requestId]: itemIds
    }));
  };
  const selectedItemsCount = Object.values(selectedItemsMap).reduce((sum, items) => sum + items.length, 0);
  const handleGenerateFromRequest = () => {
    const selectedItems = [];
    approvedRequests.filter((r) => selectedRequestIds.includes(r.id)).forEach((request) => {
      const selectedItemIds = selectedItemsMap[request.id] || [];
      request.items.filter((item) => selectedItemIds.includes(item.id)).forEach((item) => {
        selectedItems.push({
          ...item,
          sourceRequestId: request.id,
          sourceRequestNo: request.requestNo,
          requiredDate: request.expectedDate || "",
          id: ""
        });
      });
    });
    if (selectedItems.length === 0) {
      return;
    }
    navigate("/price/inquiry/create", { state: { fromRequests: selectedItems } });
  };
  const genInquiryNo = () => `IQ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}${Math.floor(Math.random() * 9e3 + 1e3)}`;
  const pickField = (r, headers, zh, en) => {
    const key = headers.find((h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase());
    return key ? r[key] ?? "" : "";
  };
  const toNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const STATUS_ZH = {
    草稿: "draft",
    已发布: "published",
    已截止: "closed",
    已收到报价: "quotation_received",
    已比价: "compared"
  };
  const mapInquiryRow = (r, headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const statusRaw = pickField(r, headers, "状态", "status");
    const vendors = pickField(r, headers, "目标供应商", "targetVendorNames");
    return {
      id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inquiryNo: pickField(r, headers, "询价单号", "inquiryNo") || genInquiryNo(),
      title: pickField(r, headers, "标题", "title"),
      inquiryDate: pickField(r, headers, "询价日期", "inquiryDate") || now.slice(0, 10),
      inquirer: pickField(r, headers, "询价人", "inquirer"),
      department: pickField(r, headers, "部门", "department"),
      items: [],
      targetVendorIds: [],
      targetVendorNames: vendors ? vendors.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [],
      deadline: pickField(r, headers, "截止日期", "deadline"),
      currency: pickField(r, headers, "币种", "currency") || "CNY",
      status: STATUS_ZH[statusRaw] || statusRaw || "draft",
      totalEstimatedAmount: toNum(pickField(r, headers, "预估总金额", "totalEstimatedAmount")),
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addPriceInquiry(mapInquiryRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "询价单管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "price-inquiry", currentStatus: "pi_draft", label: "流程追踪" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ActionBar,
          {
            primary: { label: "新建询价单", onClick: () => navigate("/price/inquiry/create"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}) },
            secondary: [{ label: "从采购申请生成", onClick: () => setSelectDialogOpen(true), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, {}) }]
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enablePagination: true,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "price-inquiry-list",
            onImport: handleImport,
            onRowClick: (row) => navigate(`/price/inquiry/${row.id}`),
            onView: (row) => navigate(`/price/inquiry/${row.id}`),
            onEdit: (row) => navigate(`/price/inquiry/${row.id}`)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: selectDialogOpen, onClose: () => setSelectDialogOpen(false), maxWidth: "lg", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
            "从采购申请生成询价单",
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { ml: 1 }, children: "（勾选采购申请中的物料，将自动带入询价单）" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: approvedRequests.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无已批准的采购申请可供选择" }) : approvedRequests.map((request) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FormControlLabel,
              {
                control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: selectedRequestIds.includes(request.id),
                    onChange: () => handleRequestToggle(request.id)
                  }
                ),
                label: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", children: request.requestNo }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: request.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: request.status }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                    formatDate(request.expectedDate),
                    " 预计"
                  ] })
                ] })
              }
            ),
            selectedRequestIds.includes(request.id) && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { ml: 4, mt: 1, mb: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 0.5, bgcolor: "#F8FAFC", display: "flex", alignItems: "center" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 600, children: "物料明细" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    size: "small",
                    sx: { ml: "auto", fontSize: "0.7rem" },
                    onClick: () => handleSelectAllItems(request.id, request.items.map((i) => i.id)),
                    children: "全选"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DataTable,
                {
                  data: request.items,
                  columns: buildMaterialColumns(request.id),
                  enablePagination: false
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mt: 1 } })
          ] }, request.id)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mr: "auto", ml: 2 }, children: [
              "已选择 ",
              selectedItemsCount,
              " 项物料"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setSelectDialogOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                onClick: handleGenerateFromRequest,
                disabled: selectedItemsCount === 0,
                children: "生成询价单"
              }
            )
          ] })
        ] })
      ]
    }
  );
};
export {
  InquiryList as default
};
