import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, aL as Chip, bk as Button, aP as Paper, bX as Grid, bt as TextField, aO as MenuItem, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
import { u as useQualityExtensionStore } from "./qualityExtensionStore-BtbaFcCN.js";
import "./index-CcOZBoQL.js";
const STATUS_LABEL = { in_use: "使用中", calibrating: "校准中", idle: "闲置", scrapped: "已报废" };
const TYPE_LABEL = {
  gauge: "量具",
  cmm: "三坐标",
  spectrometer: "光谱仪",
  hardness: "硬度计",
  balance: "天平",
  other: "其他"
};
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayDiff = (target) => {
  const dt = new Date(target).getTime();
  const dn = new Date(today()).getTime();
  return Math.round((dt - dn) / 864e5);
};
function LabEquipmentPage() {
  const { labEquipments, addLabEquipment, calibrateEquipment } = useQualityExtensionStore();
  const [adding, setAdding] = reactExports.useState(false);
  const [equipmentNo, setEquipmentNo] = reactExports.useState("");
  const [name, setName] = reactExports.useState("");
  const [type, setType] = reactExports.useState("gauge");
  const [cycle, setCycle] = reactExports.useState(180);
  const [last, setLast] = reactExports.useState(today());
  const overdueEquipments = reactExports.useMemo(
    () => labEquipments.filter((e) => dayDiff(e.nextCalibrationDate) < 0),
    [labEquipments]
  );
  const upcomingEquipments = reactExports.useMemo(
    () => labEquipments.filter((e) => {
      const d = dayDiff(e.nextCalibrationDate);
      return d >= 0 && d <= 30;
    }),
    [labEquipments]
  );
  const submit = () => {
    if (!equipmentNo || !name) return;
    const rec = {
      id: uid("lab"),
      equipmentNo,
      name,
      type,
      calibrationCycleDays: cycle,
      lastCalibrationDate: last,
      nextCalibrationDate: addDays(last, cycle),
      status: "in_use",
      createdAt: today(),
      updatedAt: today(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addLabEquipment(rec);
    setAdding(false);
    setEquipmentNo("");
    setName("");
    setType("gauge");
    setCycle(180);
    setLast(today());
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "lab-equipment", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "实验室 / 检验设备" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "检验与计量设备主数据，按校准周期自动预警下次校准日期；到期设备标红提示。" }),
    overdueEquipments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", sx: { mb: 2 }, "data-testid": "lab-overdue-alert", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
        "校准到期预警：",
        overdueEquipments.length,
        " 台设备已逾期！"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
        overdueEquipments.map((e) => `${e.name}(${e.equipmentNo})`).join("、"),
        " - 请立即安排校准"
      ] })
    ] }),
    upcomingEquipments.length > 0 && overdueEquipments.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
        "即将到期提醒：",
        upcomingEquipments.length,
        " 台设备将在30天内到期"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: upcomingEquipments.map((e) => `${e.name}(${e.equipmentNo})`).join("、") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "lab-count", label: `设备 ${labEquipments.length}`, sx: { mb: 1 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", sx: { ml: 1, mb: 1 }, "data-testid": "lab-add", onClick: () => setAdding(true), children: "新增设备" }),
    adding && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, "data-testid": "lab-form", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "设备编号", "data-testid": "lab-no", value: equipmentNo, onChange: (e) => setEquipmentNo(e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "设备名称", "data-testid": "lab-name", value: name, onChange: (e) => setName(e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { fullWidth: true, select: true, label: "类型", "data-testid": "lab-type", value: type, onChange: (e) => setType(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "gauge", children: "量具" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "cmm", children: "三坐标" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "spectrometer", children: "光谱仪" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "hardness", children: "硬度计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "balance", children: "天平" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "other", children: "其他" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, type: "number", label: "校准周期(天)", "data-testid": "lab-cycle", value: cycle, onChange: (e) => setCycle(Number(e.target.value)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, type: "date", label: "上次校准", "data-testid": "lab-last", value: last, onChange: (e) => setLast(e.target.value), InputLabelProps: { shrink: true } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "lab-add-confirm", onClick: submit, children: "确认新增" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { sx: { ml: 1 }, "data-testid": "lab-cancel", onClick: () => setAdding(false), children: "取消" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "编号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "名称" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "上次校准" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "下次校准" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "距下次校准" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "校准预警" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: labEquipments.map((e) => {
        const days = dayDiff(e.nextCalibrationDate);
        const isOverdue = days < 0;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "lab-row", sx: { bgcolor: isOverdue ? "#FEF2F2" : void 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.equipmentNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: TYPE_LABEL[e.type] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.lastCalibrationDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.nextCalibrationDate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { "data-testid": "lab-cal-days", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              label: isOverdue ? `逾期 ${Math.abs(days)}天` : `${days}天后`,
              sx: {
                fontWeight: 600,
                bgcolor: isOverdue ? "#EF4444" : days <= 30 ? "#F59E0B" : "#10B981",
                color: "#fff"
              }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[e.status] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: isOverdue ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", "data-testid": "lab-due", label: "将到期/逾期", color: "error" }) : days <= 30 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "即将到期", color: "warning" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "正常", color: "success" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "lab-calibrate", onClick: () => calibrateEquipment(e.id, today()), children: "校准" }) })
        ] }, e.id);
      }) })
    ] }) })
  ] });
}
export {
  LabEquipmentPage as default
};
