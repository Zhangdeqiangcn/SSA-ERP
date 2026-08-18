import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { a as useVendorStore } from "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BAhqBvAF.js";
import { a as formatDate } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { aO as Chip, p as Tooltip, m as Box, T as Typography, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bL as Stack, cC as Autocomplete, bv as TextField, bE as DialogActions, bm as Button, K as Block } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const Blacklist = () => {
  const navigate = useNavigate();
  const vendors = useVendorStore((s) => s.vendors);
  const setVendorBlacklist = useVendorStore((s) => s.setVendorBlacklist);
  const [removeConfirm, setRemoveConfirm] = reactExports.useState(null);
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const [addVendorId, setAddVendorId] = reactExports.useState(null);
  const [addReason, setAddReason] = reactExports.useState("");
  const blacklistedVendors = reactExports.useMemo(
    () => vendors.filter((v) => v.status === "blacklisted"),
    [vendors]
  );
  const candidates = reactExports.useMemo(
    () => vendors.filter((v) => v.status !== "blacklisted").map((v) => ({ id: v.id, label: `${v.code} ${v.name}` })),
    [vendors]
  );
  const columns = reactExports.useMemo(
    () => [
      { accessorKey: "code", header: "供应商编码" },
      { accessorKey: "name", header: "供应商名称" },
      { accessorKey: "contact", header: "联系人" },
      { accessorKey: "phone", header: "电话" },
      {
        accessorKey: "blacklistedAt",
        header: "加入黑名单时间",
        cell: ({ row }) => formatDate(row.original.blacklistedAt)
      },
      { accessorKey: "blacklistReason", header: "原因" },
      {
        id: "history",
        header: "处置留痕",
        cell: ({ row }) => {
          const history = row.original.blacklistReasonHistory ?? [];
          if (history.length === 0) return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "无记录", variant: "outlined" });
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Tooltip,
            {
              title: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: history.map((h, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", component: "div", children: [
                h.operatedAt,
                " · ",
                h.operator,
                "：",
                h.reason
              ] }, idx)) }),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "warning", label: `${history.length} 条` })
            }
          );
        }
      }
    ],
    []
  );
  const handleRemoveFromBlacklist = () => {
    if (removeConfirm) {
      setVendorBlacklist(removeConfirm.id, false);
      setRemoveConfirm(null);
    }
  };
  const handleAddToBlacklist = () => {
    if (!addVendorId || !addReason.trim()) return;
    setVendorBlacklist(addVendorId, true, addReason.trim(), "采购部");
    setAddOpen(false);
    setAddVendorId(null);
    setAddReason("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "黑名单管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          color: "error",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Block, {}),
          "data-testid": "blacklist-add-btn",
          onClick: () => setAddOpen(true),
          children: "加入黑名单"
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: "黑名单供应商将被系统硬拦截：无法作为采购订单主供应商、无法被询价单选为目标供应商、无法在供应商门户提交报价。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: blacklistedVendors,
            columns,
            enablePagination: true,
            onView: (row) => navigate(`/vendor/${row.id}`),
            onEdit: (row) => setRemoveConfirm(row)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!removeConfirm,
            title: "确认移除黑名单",
            content: `确定要将供应商 "${removeConfirm == null ? void 0 : removeConfirm.name}" 从黑名单中移除吗？移除后该供应商可正常参与询价与下单。`,
            onConfirm: handleRemoveFromBlacklist,
            onCancel: () => setRemoveConfirm(null),
            type: "warning"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: addOpen, onClose: () => setAddOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "加入黑名单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: candidates,
                value: candidates.find((c) => c.id === addVendorId) ?? null,
                onChange: (_, val) => setAddVendorId((val == null ? void 0 : val.id) ?? null),
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "选择供应商", "data-testid": "blacklist-vendor-input" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "拉黑原因",
                multiline: true,
                rows: 3,
                value: addReason,
                onChange: (e) => setAddReason(e.target.value),
                "data-testid": "blacklist-reason-input"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setAddOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                color: "error",
                disabled: !addVendorId || !addReason.trim(),
                onClick: handleAddToBlacklist,
                "data-testid": "blacklist-confirm-btn",
                children: "确认拉黑"
              }
            )
          ] })
        ] })
      ]
    }
  );
};
export {
  Blacklist as default
};
