import { r as reactExports, j as jsxRuntimeExports, aP as Paper, bK as Stack, bt as TextField, aQ as Search, bk as Button, h as Typography, aL as Chip, bj as Alert, a0 as QrCode2, B as Box, a7 as AccountTree, i as Divider, b2 as Avatar, e6 as Store, M as LocalShipping, e7 as Factory, I as Inventory2, e8 as CallSplit, K as Assignment } from "./vendor-46QZWBd3.js";
import { c as useWarehouseStore } from "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useWarehouseAdvancedStore } from "./warehouseAdvancedStore-BrWnd5bC.js";
const LEVEL_META = {
  inbound: { color: "#3B82F6", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, { fontSize: "small" }), align: "up" },
  vendor: { color: "#8B5CF6", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Store, { fontSize: "small" }), align: "up" },
  workorder: { color: "#F59E0B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }), align: "up" },
  pick: { color: "#0EA5E9", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CallSplit, { fontSize: "small" }), align: "up" },
  rawinbound: { color: "#6366F1", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, { fontSize: "small" }), align: "up" },
  finished: { color: "#10B981", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Factory, { fontSize: "small" }), align: "down" },
  sale: { color: "#EF4444", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, { fontSize: "small" }), align: "down" },
  customer: { color: "#EC4899", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Store, { fontSize: "small" }), align: "down" }
};
function buildTrace(batchNo, ctx) {
  const backward = [];
  const forward = [];
  if (!batchNo) return { backward, forward };
  const batch = ctx.batchRecords.find((b) => b.batchNo === batchNo);
  if (batch == null ? void 0 : batch.inboundNo) {
    const inb = ctx.inboundOrders.find((i) => i.inboundNo === batch.inboundNo);
    backward.push({
      kind: "inbound",
      docNo: batch.inboundNo,
      title: "采购入库",
      detail: `供应商：${(inb == null ? void 0 : inb.vendorName) || batch.supplierName || "-"}`,
      sub: inb ? `采购订单：${inb.sourceNo || "-"}` : "",
      date: batch.inboundDate
    });
    backward.push({
      kind: "vendor",
      docNo: "",
      title: "上游供应商",
      detail: batch.supplierName || (inb == null ? void 0 : inb.vendorName) || "-",
      sub: inb ? `采购订单：${inb.sourceNo || "-"}` : "",
      date: ""
    });
  } else if (batch == null ? void 0 : batch.supplierName) {
    backward.push({
      kind: "vendor",
      docNo: "",
      title: "上游供应商",
      detail: batch.supplierName,
      sub: "",
      date: ""
    });
  }
  const fin = ctx.finishedGoodsInbounds.find((f) => f.batchNo === batchNo);
  if (fin) {
    backward.push({
      kind: "workorder",
      docNo: fin.workOrderNo,
      title: "生产工单",
      detail: `产品：${fin.productName || "-"}（${fin.productCode || "-"}）`,
      sub: `工单 ${fin.workOrderNo}`,
      date: fin.inboundDate
    });
    const picks = ctx.outboundOrders.filter((o) => o.type === "pick" && o.sourceNo === fin.workOrderNo);
    picks.forEach((p) => {
      p.items.forEach((it) => {
        if (!it.batchNo) return;
        backward.push({
          kind: "pick",
          docNo: p.outboundNo,
          title: "生产领料",
          detail: `耗用物料批次：${it.batchNo}（${it.materialName || ""}）`,
          sub: `数量 ${it.quantity ?? "-"} ${it.unit || ""}`,
          date: p.outboundDate
        });
        const rawBatch = ctx.batchRecords.find((b) => b.batchNo === it.batchNo);
        if (rawBatch == null ? void 0 : rawBatch.inboundNo) {
          const rinb = ctx.inboundOrders.find((i) => i.inboundNo === rawBatch.inboundNo);
          backward.push({
            kind: "rawinbound",
            docNo: rawBatch.inboundNo,
            title: "原料采购入库",
            detail: `原料批次：${rawBatch.batchNo}（${rawBatch.materialName || ""}）`,
            sub: `供应商：${rawBatch.supplierName || (rinb == null ? void 0 : rinb.vendorName) || "-"} / 采购订单：${(rinb == null ? void 0 : rinb.sourceNo) || "-"}`,
            date: rawBatch.inboundDate
          });
          backward.push({
            kind: "vendor",
            docNo: "",
            title: "原料供应商",
            detail: rawBatch.supplierName || (rinb == null ? void 0 : rinb.vendorName) || "-",
            sub: rinb ? `采购订单：${rinb.sourceNo || "-"}` : "",
            date: ""
          });
        } else if (rawBatch) {
          backward.push({
            kind: "rawinbound",
            docNo: "",
            title: "原料批次",
            detail: `原料批次：${rawBatch.batchNo}（${rawBatch.materialName || ""}）`,
            sub: `供应商：${rawBatch.supplierName || "-"}`,
            date: rawBatch.inboundDate
          });
        }
      });
    });
  }
  const picksForBatch = ctx.outboundOrders.filter(
    (o) => o.type === "pick" && o.items.some((it) => it.batchNo === batchNo)
  );
  picksForBatch.forEach((p) => {
    forward.push({
      kind: "pick",
      docNo: p.outboundNo,
      title: "生产领料",
      detail: `工单：${p.sourceNo}`,
      sub: `领用工单 ${p.sourceNo}`,
      date: p.outboundDate
    });
    const fins = ctx.finishedGoodsInbounds.filter((f) => f.workOrderNo === p.sourceNo);
    fins.forEach((f) => {
      forward.push({
        kind: "finished",
        docNo: f.inboundNo,
        title: "成品入库",
        detail: `成品批次：${f.batchNo}（${f.productName || ""}）`,
        sub: `数量 ${f.actualQty ?? "-"} ${f.unit || ""} / 工单 ${f.workOrderNo}`,
        date: f.inboundDate
      });
    });
  });
  const sales = ctx.outboundOrders.filter(
    (o) => (o.type === "sale" || o.type === "transfer") && o.items.some((it) => it.batchNo === batchNo)
  );
  sales.forEach((s) => {
    forward.push({
      kind: "sale",
      docNo: s.outboundNo,
      title: s.type === "transfer" ? "调拨出库" : "销售出库",
      detail: `客户：${s.customerName || "-"}`,
      sub: `单据 ${s.outboundNo}`,
      date: s.outboundDate
    });
  });
  return { backward, forward };
}
const NodeRow = ({ node }) => {
  const meta = LEVEL_META[node.kind];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1.5, mb: 1.5, alignItems: "flex-start" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: meta.color + "15", color: meta.color, width: 32, height: 32, mt: 0.25 }, children: meta.icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, color: meta.color, children: node.title }),
        node.docNo && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontFamily: "monospace", color: "text.secondary", children: node.docNo }),
        node.date && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { ml: "auto" }, children: node.date })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.primary", children: node.detail }),
      node.sub && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: node.sub })
    ] })
  ] });
};
const TraceColumn = ({
  title,
  nodes,
  testid,
  emptyText
}) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, flex: 1, minWidth: 320, borderTop: "3px solid", borderColor: "#E2E8F0" }, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { mb: 2 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { fontSize: "small", sx: { color: "#64748B" } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: nodes.length, sx: { ml: "auto" } })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": testid, children: nodes.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 2 }, children: emptyText }) : nodes.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(NodeRow, { node: n }, `${n.kind}-${n.docNo}-${i}`)) })
] });
const TraceBatch = () => {
  const { batchRecords, inboundOrders, outboundOrders, finishedGoodsInbounds } = useWarehouseStore();
  const serialMasters = useWarehouseAdvancedStore((s) => s.serialMasters);
  const [query, setQuery] = reactExports.useState("");
  const [result, setResult] = reactExports.useState(null);
  const [activeSerial, setActiveSerial] = reactExports.useState(null);
  const [notFound, setNotFound] = reactExports.useState("");
  const ctx = reactExports.useMemo(() => ({
    batchRecords,
    inboundOrders,
    outboundOrders,
    finishedGoodsInbounds
  }), [batchRecords, inboundOrders, outboundOrders, finishedGoodsInbounds]);
  const runTrace = () => {
    const q = query.trim();
    if (!q) {
      setNotFound("请输入批次号或序列号");
      setResult(null);
      setActiveSerial(null);
      return;
    }
    const serial = serialMasters.find((s) => s.serialNo.toLowerCase() === q.toLowerCase());
    if (serial) {
      setActiveSerial(serial);
      const batchNo = serial.batchNo || "";
      setResult(batchNo ? buildTrace(batchNo, ctx) : { backward: [], forward: [] });
      setNotFound("");
      return;
    }
    const batchExists = batchRecords.some((b) => b.batchNo === q);
    const touchedInbound = inboundOrders.some((i) => i.items.some((it) => it.batchNo === q));
    const touchedOutbound = outboundOrders.some((o) => o.items.some((it) => it.batchNo === q));
    const isFin = finishedGoodsInbounds.some((f) => f.batchNo === q);
    if (batchExists || touchedInbound || touchedOutbound || isFin) {
      setActiveSerial(null);
      setResult(buildTrace(q, ctx));
      setNotFound("");
    } else {
      setResult(null);
      setActiveSerial(null);
      setNotFound(`未找到批次/序列号「${q}」的追溯链路，请确认输入是否正确。`);
    }
  };
  const demos = [
    { label: "成品批次 F20240620X（反向上游穿透）", value: "F20240620X" },
    { label: "原料批次 B20240601X（正向下游穿透）", value: "B20240601X" },
    { label: "序列号 SN-2024-0001（一物一码）", value: "SN-2024-0001" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "批次追溯穿透",
      subtitle: "批次正反向追溯穿透视图（含序列号级一物一码溯源）— C1",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", flexWrap: "wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                placeholder: "输入批次号（如 B20240601X）或序列号（如 SN-2024-0001）",
                value: query,
                onChange: (e) => setQuery(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") runTrace();
                },
                InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
                sx: { width: 460 },
                "data-testid": "trace-query"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, {}), onClick: runTrace, "data-testid": "trace-run", children: "追溯" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, sx: { mt: 1.5 }, flexWrap: "wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mr: 1, alignSelf: "center" }, children: "快捷演示：" }),
            demos.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                size: "small",
                variant: "outlined",
                label: d.label,
                onClick: () => {
                  setQuery(d.value);
                },
                sx: { cursor: "pointer" }
              },
              d.value
            ))
          ] })
        ] }),
        notFound && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: notFound }),
        activeSerial && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Paper,
          {
            sx: { p: 2.5, mb: 2, borderRadius: 3, borderLeft: "4px solid", borderColor: "#8B5CF6" },
            "data-testid": "serial-info",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", sx: { mb: 1.5 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode2, { sx: { color: "#8B5CF6" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "序列号溯源" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: activeSerial.serialNo, sx: { ml: "auto", fontFamily: "monospace" } })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 4, flexWrap: "wrap", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "物料" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: activeSerial.materialName || "-" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "关联批次" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, fontFamily: "monospace", children: activeSerial.batchNo || "-" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "状态" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: activeSerial.status === "shipped" ? "已发货" : activeSerial.status === "in_stock" ? "在库" : activeSerial.status })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "客户" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: activeSerial.customerName || "-" })
                ] })
              ] }),
              activeSerial.movements && activeSerial.movements.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "全生命周期轨迹" }),
                activeSerial.movements.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: 13 }, children: [
                  "· ",
                  m.date,
                  " [",
                  m.type,
                  "] ",
                  m.docNo,
                  " — ",
                  m.note
                ] }, i))
              ] })
            ]
          }
        ),
        result && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: { xs: "column", md: "row" }, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TraceColumn,
            {
              title: "反向上游（来源）",
              testid: "trace-backward",
              nodes: result.backward,
              emptyText: "该批次无上游来源记录（如已是最上游采购批次）。"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TraceColumn,
            {
              title: "正向下游（去向）",
              testid: "trace-forward",
              nodes: result.forward,
              emptyText: "该批次暂无下游出货/投产记录。"
            }
          )
        ] })
      ]
    }
  );
};
export {
  TraceBatch as default
};
