import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, c2 as Tabs, c3 as Tab, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, eE as FormGroup, d0 as FormControlLabel, db as Checkbox, bk as Button, bf as Add, aL as Chip, aJ as IconButton, bc as Delete, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bt as TextField, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import "./customerStore-D75PJy1n.js";
import "./priceStore-CduvTkzQ.js";
import "./salesPriceStore-C1lbTZ_V.js";
import "./bomStore-CxaOFNQN.js";
import "./productionStore-Bdmg7HTu.js";
import "./productionOperationStore-ByOb08ia.js";
import "./financeExtensionStore-DC0IEDMi.js";
import "./productionVersionStore-C21otdJB.js";
import "./subcontractStore-BexFn7Un.js";
import "./equipmentStore-CrhJcIrI.js";
import "./productionSchedulingStore-DTA-q4iJ.js";
import "./vendorPerformanceStore-GquLJMJn.js";
import "./vendorPortalStore-Cnq134KH.js";
import "./dataDictStore-CtoXLbZz.js";
import "./numberingStore-CLVDn2Au.js";
import "./warehouseMasterStore-C3VWShZa.js";
import { h as useReportPermissionStore } from "./reportPermissionStore-CXyepbWY.js";
import "./salesAdvancedStore-CXmEdniM.js";
import "./purchaseAdvancedStore-C5npzY_b.js";
import "./warehouseAdvancedStore-DXjc0JQH.js";
import "./qualityAdvancedStore-Btlaa4xT.js";
import "./materialExtensionStore-BHkusB9L.js";
import "./purchaseInfoRecordStore-C2W723zd.js";
import "./sourceListStore-BT5zvRN_.js";
import "./qualityExtensionStore-CoUA1fWj.js";
import "./analyticsStore-DJYS74NQ.js";
import "./arapStore-CxlnIECw.js";
import "./workbenchStore-DcLy2Z4C.js";
import "./conditionStore-D-IHrlNs.js";
import "./ecnStore-CzTUK1H2.js";
import "./rebateStore-DO7GHeV5.js";
import "./fmeaStore-B4RTvukf.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const ROLES = ["admin", "manager", "user", "finance", "warehouse"];
const FREQS = ["daily", "weekly", "monthly"];
const ReportPermissions = () => {
  var _a;
  const { reportPermissions, subscriptions, setReportRoles, addSubscription, deleteSubscription } = useReportPermissionStore();
  const [tab, setTab] = reactExports.useState(0);
  const [open, setOpen] = reactExports.useState(false);
  const [reportId, setReportId] = reactExports.useState(((_a = reportPermissions[0]) == null ? void 0 : _a.reportId) ?? "");
  const [freq, setFreq] = reactExports.useState("daily");
  const [recipients, setRecipients] = reactExports.useState("");
  const [channel, setChannel] = reactExports.useState("email");
  const toggleRole = (rpId, rpName, role, checked) => {
    const rp = reportPermissions.find((r) => r.reportId === rpId);
    const next = checked ? [...(rp == null ? void 0 : rp.allowedRoles) ?? [], role] : ((rp == null ? void 0 : rp.allowedRoles) ?? []).filter((x) => x !== role);
    setReportRoles(rpId, rpName, Array.from(new Set(next)));
  };
  const handleConfirm = () => {
    if (!reportId.trim() || !recipients.trim()) return;
    const rp = reportPermissions.find((r) => r.reportId === reportId);
    addSubscription({ reportId, reportName: (rp == null ? void 0 : rp.reportName) ?? reportId, frequency: freq, recipients, channel, enabled: true });
    setRecipients("");
    setOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "report-permissions", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { mb: 2, fontWeight: 700 }, children: "报表权限与订阅" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "报表权限" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "订阅管理" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "报表" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "允许角色" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: reportPermissions.map((rp) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "rp-perm-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: rp.reportName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(FormGroup, { row: true, children: ROLES.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormControlLabel,
          {
            control: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Checkbox,
              {
                size: "small",
                "data-testid": `rp-role-${rp.reportId}-${role}`,
                checked: rp.allowedRoles.includes(role),
                onChange: (e) => toggleRole(rp.reportId, rp.reportName, role, e.target.checked)
              }
            ),
            label: role
          },
          role
        )) }) })
      ] }, rp.reportId)) })
    ] }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "rp-sub-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新建订阅" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "报表" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "频率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "接收人" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "渠道" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: subscriptions.map((sub) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "rp-sub-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: sub.reportName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: sub.frequency }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: sub.recipients }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: sub.channel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { "data-testid": "rp-sub-del", onClick: () => deleteSubscription(sub.id), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}) }) })
        ] }, sub.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建订阅" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mt: 1, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "报表" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": "rp-sub-report",
              value: reportId,
              label: "报表",
              onChange: (e) => setReportId(e.target.value),
              children: reportPermissions.map((rp) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: rp.reportId, children: rp.reportName }, rp.reportId))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "频率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": "rp-sub-freq",
              value: freq,
              label: "频率",
              onChange: (e) => setFreq(e.target.value),
              children: FREQS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: f, children: f }, f))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "rp-sub-recipients",
            fullWidth: true,
            label: "接收人（逗号分隔）",
            value: recipients,
            onChange: (e) => setRecipients(e.target.value),
            sx: { mb: 2 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "渠道" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              "data-testid": "rp-sub-channel",
              value: channel,
              label: "渠道",
              onChange: (e) => setChannel(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "email", children: "邮件" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "webhook", children: "Webhook" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "rp-sub-add-confirm", variant: "contained", onClick: handleConfirm, children: "确定" })
      ] })
    ] })
  ] });
};
export {
  ReportPermissions as default
};
