import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { c as useWarehouseStore, g as useOrgStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { F as FilterBar } from "./FilterBar-BdGe90kr.js";
import { A as ActionBar } from "./ActionBar-AjDxCZvD.js";
import { S as StatusBadge } from "./StatusBadge-D4Muac94.js";
import { a as formatDate } from "./format-DXPckS9-.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { m as matchOrg } from "./org-sXHLpR-x.js";
import "./vendor-t9csHBDX.js";
import "./vendor-mui-DsZGB15g.js";
import "./vendor-date-DI3D_gXa.js";
import "./vendor-table-ClDZT4tF.js";
import "./vendor-forms-B1OIhDzB.js";
const InboundList = () => {
  const navigate = useNavigate();
  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const [filterData, setFilterData] = reactExports.useState({});
  const columns = reactExports.useMemo(() => [
    { accessorKey: "inboundNo", header: "入库单号" },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const typeMap = {
          purchase: "采购入库",
          return: "退货入库",
          transfer: "调拨入库",
          subcontract: "委外收货",
          production: "生产完工入库"
        };
        return typeMap[row.original.type] || row.original.type;
      }
    },
    { accessorKey: "sourceNo", header: "来源单号" },
    { accessorKey: "vendorName", header: "供应商" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    { accessorKey: "operator", header: "操作员" },
    { accessorKey: "inboundDate", header: "入库日期", cell: ({ row }) => formatDate(row.original.inboundDate) }
  ], []);
  const filterFields = [
    { name: "inboundNo", label: "入库单号", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "pending", label: "待入库" },
        { value: "processing", label: "入库中" },
        { value: "completed", label: "已完成" },
        { value: "cancelled", label: "已取消" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...inboundOrders];
    data = data.filter((r) => matchOrg(r, currentOrgId));
    if (filterData.inboundNo) {
      data = data.filter((o) => o.inboundNo.includes(filterData.inboundNo));
    }
    if (filterData.status) {
      data = data.filter((o) => o.status === filterData.status);
    }
    return data;
  }, [filterData]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "入库管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新建入库", onClick: () => navigate("/warehouse/inbound/create") }
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "inbound-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            onRowClick: (row) => navigate(`/warehouse/inbound/${row.id}`)
          }
        )
      ]
    }
  );
};
export {
  InboundList as default
};
