import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-DGU5TO-x.js";
import { c as useWarehouseStore, g as useOrgStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FilterBar } from "./FilterBar-s9qV5iff.js";
import { A as ActionBar } from "./ActionBar-DmR-0fx0.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { a as formatDate } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { m as matchOrg } from "./org-sXHLpR-x.js";
const OutboundList = () => {
  const navigate = useNavigate();
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const [filterData, setFilterData] = reactExports.useState({});
  const columns = reactExports.useMemo(() => [
    { accessorKey: "outboundNo", header: "出库单号" },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const typeMap = {
          sale: "销售出库",
          pick: "领料出库",
          transfer: "调拨出库",
          return: "退货出库",
          subcontract: "委外发料"
        };
        return typeMap[row.original.type] || row.original.type;
      }
    },
    { accessorKey: "customerName", header: "客户" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    { accessorKey: "operator", header: "操作员" },
    { accessorKey: "outboundDate", header: "出库日期", cell: ({ row }) => formatDate(row.original.outboundDate) }
  ], []);
  const filterFields = [
    { name: "outboundNo", label: "出库单号", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "pending", label: "待出库" },
        { value: "processing", label: "出库中" },
        { value: "picking", label: "拣配中" },
        { value: "picked", label: "已拣配" },
        { value: "packed", label: "已包装" },
        { value: "shipped", label: "已发货" },
        { value: "completed", label: "已完成" },
        { value: "cancelled", label: "已取消" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...outboundOrders];
    data = data.filter((r) => matchOrg(r, currentOrgId));
    if (filterData.outboundNo) {
      data = data.filter((o) => o.outboundNo.includes(filterData.outboundNo));
    }
    if (filterData.status) {
      data = data.filter((o) => o.status === filterData.status);
    }
    return data;
  }, [filterData]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "出库管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新建出库", onClick: () => navigate("/warehouse/outbound/create") }
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            onRowClick: (row) => navigate(`/warehouse/outbound/${row.id}`)
          }
        )
      ]
    }
  );
};
export {
  OutboundList as default
};
