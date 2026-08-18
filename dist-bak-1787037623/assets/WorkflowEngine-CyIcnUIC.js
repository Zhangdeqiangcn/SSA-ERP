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
import { d as useWorkflowStore } from "./reportPermissionStore-dkLqyfDv.js";
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
import { m as Box, T as Typography, c2 as Tabs, c3 as Tab, bm as Button, bh as Add, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aM as IconButton, be as Delete, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, dH as PlayArrow, aO as Chip, b$ as ArrowForward, K as Block, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const makeDefaultNodes = () => [
  { id: "n1", name: "发起", type: "start" },
  { id: "n2", name: "审批", type: "approval" },
  { id: "n3", name: "执行", type: "task" },
  { id: "n4", name: "结束", type: "end" }
];
const WorkflowEngine = () => {
  var _a;
  const { definitions, instances, addDefinition, deleteDefinition, startInstance, advanceInstance, rejectInstance } = useWorkflowStore();
  const [tab, setTab] = reactExports.useState(0);
  const [open, setOpen] = reactExports.useState(false);
  const [name, setName] = reactExports.useState("");
  const [selDef, setSelDef] = reactExports.useState(((_a = definitions[0]) == null ? void 0 : _a.id) ?? "");
  const handleConfirm = () => {
    if (!name.trim()) return;
    const nodes = makeDefaultNodes();
    addDefinition({
      name: name.trim(),
      nodes,
      transitions: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" }
      ]
    });
    setName("");
    setOpen(false);
  };
  const statusColor = (s) => s === "done" ? "success" : s === "rejected" ? "error" : "warning";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "workflow", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { mb: 2, fontWeight: 700 }, children: "工作流引擎 (BPMN-lite)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "流程定义" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "流程实例" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "wf-def-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新建流程" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "流程名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "节点数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: definitions.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "wf-def-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: d.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: d.nodes.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { "data-testid": "wf-def-del", onClick: () => deleteDefinition(d.id), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}) }) })
        ] }, d.id)) })
      ] })
    ] }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, display: "flex", gap: 2, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { sx: { minWidth: 240 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择流程" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": "wf-inst-def",
              value: selDef,
              label: "选择流程",
              onChange: (e) => setSelDef(e.target.value),
              children: definitions.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: d.id, children: d.name }, d.id))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            "data-testid": "wf-inst-start",
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, {}),
            onClick: () => selDef && startInstance(selDef, "当前用户"),
            children: "发起实例"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "流程" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "当前节点" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: instances.map((inst) => {
          var _a2;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "wf-inst-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: inst.defName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: (_a2 = inst.history[inst.history.length - 1]) == null ? void 0 : _a2.nodeName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: inst.status, color: statusColor(inst.status) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                IconButton,
                {
                  "data-testid": "wf-inst-advance",
                  onClick: () => advanceInstance(inst.id),
                  size: "small",
                  disabled: inst.status !== "running",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForward, {})
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                IconButton,
                {
                  "data-testid": "wf-inst-reject",
                  onClick: () => rejectInstance(inst.id),
                  size: "small",
                  disabled: inst.status !== "running",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Block, {})
                }
              )
            ] })
          ] }, inst.id);
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建流程" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          "data-testid": "wf-def-name",
          fullWidth: true,
          label: "流程名称",
          value: name,
          onChange: (e) => setName(e.target.value),
          sx: { mt: 1 }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "wf-def-add-confirm", variant: "contained", onClick: handleConfirm, children: "确定" })
      ] })
    ] })
  ] });
};
export {
  WorkflowEngine as default
};
