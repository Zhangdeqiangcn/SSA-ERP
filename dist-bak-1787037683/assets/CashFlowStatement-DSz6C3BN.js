import { r as reactExports, j as jsxRuntimeExports, bj as Alert, aP as Paper, h as Typography, B as Box, cm as BarChart, i as Divider, cO as TableContainer, cP as Table, cT as TableBody, cR as TableRow, cS as TableCell, bK as Stack } from "./vendor-46QZWBd3.js";
import { e as useSalesStore, f as useFinanceStore } from "./index-CcOZBoQL.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
const CashFlowStatement = () => {
  const { salesOrders } = useSalesStore();
  const { invoices, paymentPlans } = useFinanceStore();
  const data = reactExports.useMemo(() => {
    const operatingInflow = salesOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const purchasePaid = paymentPlans.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const taxPaid = invoices.reduce((s, i) => s + (i.taxAmount || 0), 0);
    const salaryPaid = 52e4;
    const otherPaid = 13e4;
    const operatingOutflow = purchasePaid + taxPaid + salaryPaid + otherPaid;
    const operatingNet = operatingInflow - operatingOutflow;
    const investingInflow = 0;
    const investingOutflow = 8e5;
    const investingNet = investingInflow - investingOutflow;
    const financingInflow = 1e6;
    const financingOutflow = 6e5;
    const financingNet = financingInflow - financingOutflow;
    const netIncrease = operatingNet + investingNet + financingNet;
    const beginningBalance = 2e6;
    const endingBalance = beginningBalance + netIncrease;
    const sections = [
      {
        title: "一、经营活动产生的现金流量",
        lines: [
          { label: "销售商品、提供劳务收到的现金", inflow: operatingInflow },
          { label: "收到的其他与经营活动有关的现金", inflow: 0 },
          { label: "购买商品、接受劳务支付的现金", outflow: purchasePaid },
          { label: "支付给职工以及为职工支付的现金", outflow: salaryPaid },
          { label: "支付的各项税费", outflow: taxPaid },
          { label: "支付的其他与经营活动有关的现金", outflow: otherPaid }
        ],
        note: "经营活动数据基于销售订单与付款计划"
      },
      {
        title: "二、投资活动产生的现金流量",
        lines: [
          { label: "收回投资及取得投资收益收到的现金", inflow: investingInflow },
          { label: "购建固定资产、无形资产支付的现金", outflow: investingOutflow }
        ],
        note: "投资活动为示例数据"
      },
      {
        title: "三、筹资活动产生的现金流量",
        lines: [
          { label: "取得借款收到的现金", inflow: financingInflow },
          { label: "偿还债务支付的现金", outflow: financingOutflow }
        ],
        note: "筹资活动为示例数据"
      }
    ];
    return {
      sections,
      operatingNet,
      investingNet,
      financingNet,
      netIncrease,
      beginningBalance,
      endingBalance,
      operatingInflow,
      operatingOutflow
    };
  }, [salesOrders]);
  const chartData = [data.operatingNet, data.investingNet, data.financingNet];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "现金流量表",
      subtitle: "经营 / 投资 / 筹资活动现金流量（对标 SAP / 用友 / 金蝶 标准现金流量表）",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "经营活动数据取自销售订单与付款计划；投资/筹资及职工薪酬为示例数据，可在财务设置中接入真实台账。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 3, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "三类活动现金流量净额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { height: 300 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            BarChart,
            {
              xAxis: [{ scaleType: "band", data: ["经营活动", "投资活动", "筹资活动"] }],
              series: [{
                data: chartData,
                color: "#3B82F6",
                valueFormatter: (v) => formatCurrency(v ?? 0)
              }],
              height: 300
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: [
          data.sections.map((sec, idx) => {
            const secNet = sec.lines.reduce((s, l) => s + (l.inflow || 0) - (l.outflow || 0), 0);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              idx > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, children: sec.title }),
                sec.note && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: sec.note })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Table, { size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                sec.lines.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { pl: 4 }, children: l.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontFamily: "monospace" }, children: l.inflow ? formatCurrency(l.inflow) : l.outflow ? `(${formatCurrency(l.outflow)})` : "—" })
                ] }, l.label)),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { pl: 4, fontWeight: 700 }, children: "小计" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700, fontFamily: "monospace", color: secNet >= 0 ? "#10B981" : "#EF4444" }, children: formatCurrency(secNet) })
                ] })
              ] }) }) })
            ] }, sec.title);
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Table, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "五、现金及现金等价物净增加额" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700, fontFamily: "monospace", color: data.netIncrease >= 0 ? "#10B981" : "#EF4444" }, children: formatCurrency(data.netIncrease) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "加：期初现金及现金等价物余额" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontFamily: "monospace" }, children: formatCurrency(data.beginningBalance) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 700 }, children: "六、期末现金及现金等价物余额" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 700, fontFamily: "monospace", color: "#1D4ED8" }, children: formatCurrency(data.endingBalance) })
            ] })
          ] }) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 4, sx: { mt: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            "经营活动流入：",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(data.operatingInflow) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            "经营活动流出：",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(data.operatingOutflow) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            "净额：",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: data.operatingNet >= 0 ? "#10B981" : "#EF4444" }, children: formatCurrency(data.operatingNet) })
          ] })
        ] })
      ]
    }
  );
};
export {
  CashFlowStatement as default
};
