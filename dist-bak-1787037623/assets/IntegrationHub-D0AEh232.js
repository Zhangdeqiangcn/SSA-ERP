import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import "./index-CU2cqxc8.js";
import "./customerStore-BZF1KdNo.js";
import "./priceStore-DijJfeBL.js";
import "./salesPriceStore-cjxfIxIT.js";
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
import "./numberingStore-BDs7p47y.js";
import "./warehouseMasterStore-BjZtdDuE.js";
import { e as useIntegrationStore, A as API_REGISTRY } from "./reportPermissionStore-dkLqyfDv.js";
import "./salesAdvancedStore-BUVrzeLF.js";
import "./purchaseAdvancedStore-X5oSWK-7.js";
import "./warehouseAdvancedStore-D-kOSyQs.js";
import "./qualityAdvancedStore-Bdw6LGIv.js";
import "./materialExtensionStore-BnWp3IKN.js";
import "./purchaseInfoRecordStore-DLQisuuK.js";
import "./sourceListStore-DG1dXUIB.js";
import "./qualityExtensionStore-BDssWY5M.js";
import "./analyticsStore-DaEDsYjs.js";
import "./arapStore-Cccu0U7n.js";
import "./workbenchStore-COBsjc3d.js";
import "./conditionStore-DTiljowj.js";
import "./ecnStore-D8unIvA0.js";
import "./rebateStore-89dNxLDm.js";
import "./fmeaStore-CKbOOC47.js";
import { W as WEBHOOK_EVENT_LABELS, a as WEBHOOK_AUTH_LABELS } from "./platform-CGjfMiXI.js";
import { m as Box, T as Typography, c2 as Tabs, c3 as Tab, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, bm as Button, bh as Add, aM as IconButton, be as Delete, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bw as Send, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, eh as FormGroup, cM as FormControlLabel, cX as Checkbox, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const EVENTS = [
  "sales.order.created",
  "purchase.order.created",
  "quality.inspection.lot.created",
  "production.workorder.created",
  "material.changed",
  "inbound_completed",
  "outbound_completed",
  "inspection_completed",
  "invoice_generated",
  "payment_completed",
  "voucher_posted",
  "workorder_completed",
  "shipment_completed",
  "reconciliation_confirmed",
  "contract_expiring"
];
const AUTH_TYPES = ["none", "bearer", "basic"];
const IntegrationHub = () => {
  const { webhooks, webhookLogs, addWebhook, deleteWebhook, triggerWebhook } = useIntegrationStore();
  const [tab, setTab] = reactExports.useState(0);
  const [open, setOpen] = reactExports.useState(false);
  const [name, setName] = reactExports.useState("");
  const [url, setUrl] = reactExports.useState("");
  const [events, setEvents] = reactExports.useState(["sales.order.created"]);
  const [authType, setAuthType] = reactExports.useState("none");
  const [authToken, setAuthToken] = reactExports.useState("");
  const [authUser, setAuthUser] = reactExports.useState("");
  const [authPass, setAuthPass] = reactExports.useState("");
  const [retry, setRetry] = reactExports.useState(0);
  const [triggerEvent, setTriggerEvent] = reactExports.useState("sales.order.created");
  const resetForm = () => {
    setName("");
    setUrl("");
    setEvents(["sales.order.created"]);
    setAuthType("none");
    setAuthToken("");
    setAuthUser("");
    setAuthPass("");
    setRetry(0);
  };
  const handleConfirm = () => {
    if (!name.trim() || !url.trim()) return;
    addWebhook({
      name: name.trim(),
      url: url.trim(),
      events,
      enabled: true,
      authType,
      authToken: authToken || void 0,
      authUser: authUser || void 0,
      authPass: authPass || void 0,
      retry: retry || 0
    });
    resetForm();
    setOpen(false);
  };
  const handleTrigger = () => triggerWebhook(triggerEvent, { test: true, at: (/* @__PURE__ */ new Date()).toISOString() });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "integration", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { mb: 2, fontWeight: 700 }, children: "集成中心 (OpenAPI / Webhook)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "OpenAPI 目录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "Webhook 管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "调用日志" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "方法" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "路径" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "模块" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "说明" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: API_REGISTRY.map((api, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "ih-api-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: api.method, color: api.method === "GET" ? "info" : "success" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: api.path }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: api.module }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: api.description })
      ] }, i)) })
    ] }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "ih-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新建 Webhook" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "URL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "订阅事件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: webhooks.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "ih-webhook-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.url }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.events.map((e) => WEBHOOK_EVENT_LABELS[e]).join("，") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { "data-testid": "ih-webhook-del", onClick: () => deleteWebhook(w.id), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}) }) })
        ] }, w.id)) })
      ] })
    ] }),
    tab === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, display: "flex", gap: 2, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { sx: { minWidth: 260 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "事件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": "ih-event",
              value: triggerEvent,
              label: "事件",
              onChange: (e) => setTriggerEvent(e.target.value),
              children: EVENTS.map((ev) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: ev, children: ev }, ev))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "ih-trigger", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), onClick: handleTrigger, children: "模拟触发" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "事件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "Webhook" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "详情" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "时间" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: webhookLogs.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "ih-log-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.event }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.webhookName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              label: l.status,
              color: l.status === "success" ? "success" : l.status === "failed" ? "error" : "warning"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.detail }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.at })
        ] }, l.id)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建 Webhook" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "ih-name",
            fullWidth: true,
            label: "名称",
            value: name,
            onChange: (e) => setName(e.target.value),
            sx: { mt: 1, mb: 2 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "ih-url",
            fullWidth: true,
            label: "回调 URL",
            value: url,
            onChange: (e) => setUrl(e.target.value),
            sx: { mb: 2 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mt: 1, mb: 1 }, children: "鉴权配置" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "鉴权方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": "ih-auth-type",
              value: authType,
              label: "鉴权方式",
              onChange: (e) => setAuthType(e.target.value),
              children: AUTH_TYPES.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: a, children: WEBHOOK_AUTH_LABELS[a] }, a))
            }
          )
        ] }),
        authType === "bearer" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "ih-auth-token",
            fullWidth: true,
            label: "Bearer Token",
            value: authToken,
            onChange: (e) => setAuthToken(e.target.value),
            sx: { mb: 2 }
          }
        ),
        authType === "basic" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              "data-testid": "ih-auth-user",
              fullWidth: true,
              label: "用户名",
              value: authUser,
              onChange: (e) => setAuthUser(e.target.value)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              "data-testid": "ih-auth-pass",
              fullWidth: true,
              label: "密码",
              type: "password",
              value: authPass,
              onChange: (e) => setAuthPass(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "ih-retry",
            fullWidth: true,
            label: "失败重试次数",
            type: "number",
            value: retry,
            onChange: (e) => setRetry(Number(e.target.value) || 0),
            sx: { mb: 2 },
            helperText: "投递失败时自动重试的次数（0 表示不重试）"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: "订阅事件" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormGroup, { children: EVENTS.map((ev) => /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { control: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Checkbox,
          {
            checked: events.includes(ev),
            onChange: (e) => setEvents((prev) => e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev))
          }
        ), label: WEBHOOK_EVENT_LABELS[ev] }, ev)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "ih-add-confirm", variant: "contained", onClick: handleConfirm, children: "确定" })
      ] })
    ] })
  ] });
};
export {
  IntegrationHub as default
};
