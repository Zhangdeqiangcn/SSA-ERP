import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bk as Button, e1 as default_1, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aL as Chip, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { u as useSubcontractStore } from "./subcontractStore-CQ-ex-am.js";
import { a as useVendorStore, u as useMaterialStore } from "./index-CcOZBoQL.js";
const STATUS_LABEL = {
  draft: "草稿",
  issued: "已发料",
  received: "已收货",
  returned: "已回收",
  closed: "已关闭"
};
function Subcontract() {
  const { orders, addOrder, issueMaterials, receiveSubcontract, returnMaterials, closeOrder } = useSubcontractStore();
  const { vendors } = useVendorStore();
  const { materials } = useMaterialStore();
  const [open, setOpen] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    type: "process",
    materialId: "mat-001",
    vendorId: "ven-001",
    qty: 10,
    planDate: "2026-07-20",
    processFee: 100,
    issueMaterialId: "mat-002",
    issueQtyPerUnit: 20
  });
  const rows = reactExports.useMemo(() => orders, [orders]);
  const vendorName = (id) => {
    var _a;
    return ((_a = vendors.find((v) => v.id === id)) == null ? void 0 : _a.name) ?? id;
  };
  const handleAdd = () => {
    const m = materials.find((x) => x.id === form.materialId);
    const o = {
      id: `sub-${Date.now()}`,
      orderNo: `SUB-2026-${Date.now()}`,
      type: form.type,
      materialId: form.materialId,
      materialCode: (m == null ? void 0 : m.code) || form.materialId,
      materialName: (m == null ? void 0 : m.name) || form.materialId,
      vendorId: form.vendorId,
      vendorName: vendorName(form.vendorId),
      qty: form.qty,
      issueItems: [],
      status: "draft",
      planDate: form.planDate,
      processFee: form.processFee,
      receivedQty: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addOrder(o);
    setOpen(false);
  };
  const handleIssue = (o) => {
    const im = materials.find((x) => x.id === form.issueMaterialId) || materials.find((x) => x.id === "mat-002");
    issueMaterials(o.id, [
      {
        materialId: (im == null ? void 0 : im.id) || "mat-002",
        materialCode: (im == null ? void 0 : im.code) || "STEEL-002",
        materialName: (im == null ? void 0 : im.name) || "Q235 钢板",
        unit: (im == null ? void 0 : im.unit) || "kg",
        qty: o.qty * (form.issueQtyPerUnit || 20)
      }
    ]);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "subcontract", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "委外加工" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
      "支持工序委外 / 整体委外。",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "发料" }),
      "自动生成委外出库单并真实扣减原材料库存（借 1408 委托加工物资 / 贷 1403 原材料）；",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "收货" }),
      "自动生成委外入库单增加成品库存，并按「发出材料成本 + 加工费」计价、计提加工费应付暂估。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "sub-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增委外单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "委外单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "已收 / 应收" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "加工费单价" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "发料明细" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "关联单据" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "sub-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.orderNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.type === "process" ? "工序委外" : "整体委外" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.vendorName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.qty }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { "data-testid": "sub-received", children: [
          o.receivedQty || 0,
          " / ",
          o.qty
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.processFee ? `¥${o.processFee}` : "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: o.issueItems.map((i) => `${i.materialName}×${i.qty}${i.unit}`).join("；") || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { sx: { fontSize: 12, color: "text.secondary" }, children: [
          o.issueOutboundNo ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-testid": "sub-ob-no", children: [
            "出：",
            o.issueOutboundNo
          ] }) : null,
          (o.receiptInboundNos || []).map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-testid": "sub-ib-no", children: [
            "入：",
            n
          ] }, n)),
          !o.issueOutboundNo && !(o.receiptInboundNos || []).length ? "—" : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[o.status], color: o.status === "closed" ? "default" : o.status === "received" ? "success" : "primary", variant: o.status === "draft" ? "outlined" : "filled" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          o.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "sub-issue", onClick: () => handleIssue(o), children: "发料" }),
          o.status === "issued" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "success", "data-testid": "sub-receive", onClick: () => receiveSubcontract(o.id), children: "收货" }),
          o.status === "issued" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "sub-return", onClick: () => returnMaterials(o.id), children: "回收" }),
          (o.status === "returned" || o.status === "issued" || o.status === "received") && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "secondary", "data-testid": "sub-close", onClick: () => closeOrder(o.id), children: "关闭" })
        ] })
      ] }, o.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增委外单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "委外类型",
            value: form.type,
            onChange: (e) => setForm({ ...form, type: e.target.value }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "process", children: "工序委外" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "whole", children: "整体委外" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "委外成品物料",
            value: form.materialId,
            "data-testid": "sub-material",
            helperText: "须选择物料主数据中的真实物料，收货入库才能正确滚动成本",
            onChange: (e) => setForm({ ...form, materialId: e.target.value }),
            children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
              m.code,
              " · ",
              m.name
            ] }, m.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "发料物料（组件）",
            value: form.issueMaterialId,
            "data-testid": "sub-issue-material",
            onChange: (e) => setForm({ ...form, issueMaterialId: e.target.value }),
            children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
              m.code,
              " · ",
              m.name
            ] }, m.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "单件耗用组件数量",
            type: "number",
            value: form.issueQtyPerUnit,
            "data-testid": "sub-issue-qty",
            onChange: (e) => setForm({ ...form, issueQtyPerUnit: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "供应商",
            value: form.vendorId,
            onChange: (e) => setForm({ ...form, vendorId: e.target.value }),
            children: vendors.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: v.id, children: v.name }, v.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "委外数量",
            type: "number",
            value: form.qty,
            "data-testid": "sub-qty",
            onChange: (e) => setForm({ ...form, qty: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "单件加工费（未税）",
            type: "number",
            value: form.processFee,
            "data-testid": "sub-fee",
            helperText: "收货时按「发出材料成本 + 加工费」计入成品成本，并计提加工费应付暂估",
            onChange: (e) => setForm({ ...form, processFee: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "计划日期",
            type: "date",
            value: form.planDate,
            onChange: (e) => setForm({ ...form, planDate: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "sub-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] })
  ] });
}
export {
  Subcontract as default
};
