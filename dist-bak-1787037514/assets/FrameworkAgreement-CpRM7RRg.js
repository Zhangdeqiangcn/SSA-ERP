import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bl as Alert, bm as Button, dG as default_1, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions } from "./vendor-mui-UhJuRAfR.js";
import { u as usePurchaseAdvancedStore } from "./purchaseAdvancedStore-j0gpV4PI.js";
import { u as useMaterialStore, a as useVendorStore } from "./index-hTLNcGoC.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const STATUS_LABEL = {
  active: "生效中",
  expired: "已过期",
  closed: "已关闭"
};
function FrameworkAgreementPage() {
  const { frameworkAgreements, addFramework, releaseFramework } = usePurchaseAdvancedStore();
  const { materials } = useMaterialStore();
  const { vendors } = useVendorStore();
  const [open, setOpen] = reactExports.useState(false);
  const [relOpen, setRelOpen] = reactExports.useState(false);
  const [relTarget, setRelTarget] = reactExports.useState(null);
  const [relForm, setRelForm] = reactExports.useState({ date: "2026-07-15", amount: 1e5, note: "月度释放" });
  const [form, setForm] = reactExports.useState({
    vendorId: "ven-001",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    totalCeiling: 5e6,
    materialId: "",
    ceilingPrice: 42,
    committedQty: 1e3
  });
  const selectedMaterial = reactExports.useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);
  const vendorName = (id) => {
    var _a;
    return ((_a = vendors.find((v) => v.id === id)) == null ? void 0 : _a.name) ?? id;
  };
  const handleAdd = () => {
    if (!selectedMaterial) return;
    const fa = {
      id: `fa-${Date.now()}`,
      agreementNo: `FA-2026-${Date.now()}`,
      vendorId: form.vendorId,
      vendorName: vendorName(form.vendorId),
      status: "active",
      startDate: form.startDate,
      endDate: form.endDate,
      currency: "CNY",
      totalCeiling: Number(form.totalCeiling),
      releasedAmount: 0,
      items: [{
        id: `fai-${Date.now()}`,
        materialId: selectedMaterial.id,
        materialCode: selectedMaterial.code,
        materialName: selectedMaterial.name,
        unit: selectedMaterial.unit,
        ceilingPrice: Number(form.ceilingPrice),
        committedQty: Number(form.committedQty)
      }],
      releases: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "采购员",
      updatedBy: "采购员"
    };
    addFramework(fa);
    setOpen(false);
    setForm({ ...form, materialId: "", ceilingPrice: 42, committedQty: 1e3 });
  };
  const handleRelease = () => {
    if (!relTarget) return;
    releaseFramework(relTarget.id, {
      id: `rel-${Date.now()}`,
      releaseNo: `REL-${Date.now()}`,
      date: relForm.date,
      amount: Number(relForm.amount),
      note: relForm.note
    });
    setRelOpen(false);
    setRelTarget(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "framework", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "采购框架协议" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "框架协议可按额度释放生成采购订单（PO），跟踪已释放金额与协议上限。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "framework-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新增框架协议" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "协议号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "协议上限" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "已释放" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: frameworkAgreements.map((fa) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "framework-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fa.agreementNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fa.vendorName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fa.totalCeiling.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fa.releasedAmount.toLocaleString() }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[fa.status], color: fa.status === "active" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          fa.status === "active" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "framework-release", onClick: () => {
            setRelTarget(fa);
            setRelOpen(true);
          }, children: "释放→PO" }),
          fa.releases.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "info", label: `${fa.releases.length}次释放` })
        ] })
      ] }, fa.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新增框架协议" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
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
            select: true,
            label: "物料",
            value: form.materialId,
            onChange: (e) => setForm({ ...form, materialId: e.target.value }),
            children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
              m.code,
              " ",
              m.name
            ] }, m.id))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "协议上限",
            type: "number",
            value: form.totalCeiling,
            onChange: (e) => setForm({ ...form, totalCeiling: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "承购数量",
            type: "number",
            value: form.committedQty,
            onChange: (e) => setForm({ ...form, committedQty: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "协议价格",
            type: "number",
            value: form.ceilingPrice,
            onChange: (e) => setForm({ ...form, ceilingPrice: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "起始日",
            type: "date",
            value: form.startDate,
            onChange: (e) => setForm({ ...form, startDate: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "截止日",
            type: "date",
            value: form.endDate,
            onChange: (e) => setForm({ ...form, endDate: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "framework-add-confirm", onClick: handleAdd, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: relOpen, onClose: () => setRelOpen(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "释放框架协议 → 采购订单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "释放日期",
            type: "date",
            value: relForm.date,
            onChange: (e) => setRelForm({ ...relForm, date: e.target.value }),
            InputLabelProps: { shrink: true }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "释放金额",
            type: "number",
            value: relForm.amount,
            onChange: (e) => setRelForm({ ...relForm, amount: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "备注",
            value: relForm.note,
            onChange: (e) => setRelForm({ ...relForm, note: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setRelOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "framework-release-confirm", onClick: handleRelease, children: "生成PO" })
      ] })
    ] })
  ] });
}
export {
  FrameworkAgreementPage as default
};
