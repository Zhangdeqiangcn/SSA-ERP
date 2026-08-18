import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { a as useVendorStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { m as Box, cR as Rating, T as Typography, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bY as Grid, bv as TextField, bE as DialogActions, bm as Button } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
const RatingPage = () => {
  const vendors = useVendorStore((s) => s.vendors);
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const addRatingRecord = useVendorStore((s) => s.addRatingRecord);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [selectedVendor, setSelectedVendor] = reactExports.useState(null);
  const [ratings, setRatings] = reactExports.useState({
    deliveryRate: 5,
    qualityRate: 5,
    serviceRate: 5,
    remarks: ""
  });
  const approvedVendors = reactExports.useMemo(() => {
    return vendors.filter((v) => v.status === "approved");
  }, [vendors]);
  const columns = reactExports.useMemo(() => [
    { accessorKey: "code", header: "供应商编码" },
    { accessorKey: "name", header: "供应商名称" },
    {
      accessorKey: "rating",
      header: "当前评级",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Rating, { value: row.original.rating || 0, readOnly: true, size: "small" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { ml: 1 }, children: row.original.rating ? `${row.original.rating}星` : "未评级" })
      ] })
    },
    { accessorKey: "creditLevel", header: "信用等级" }
  ], []);
  const handleOpenDialog = (vendor) => {
    setSelectedVendor(vendor);
    setRatings({
      deliveryRate: 5,
      qualityRate: 5,
      serviceRate: 5,
      remarks: ""
    });
    setDialogOpen(true);
  };
  const handleSaveRating = () => {
    if (selectedVendor) {
      const avgRating = (ratings.deliveryRate + ratings.qualityRate + ratings.serviceRate) / 3;
      const rounded = Math.round(avgRating * 10) / 10;
      updateVendor(selectedVendor.id, { rating: rounded });
      addRatingRecord({
        id: `rate-${Date.now()}`,
        vendorId: selectedVendor.id,
        rating: rounded,
        type: "manual",
        evaluator: "admin",
        criteria: {
          deliveryRate: ratings.deliveryRate,
          qualityRate: ratings.qualityRate,
          serviceRate: ratings.serviceRate
        },
        remarks: ratings.remarks,
        createdAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ")
      });
    }
    setDialogOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商评级", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: approvedVendors,
        columns,
        enablePagination: true,
        onEdit: (row) => handleOpenDialog(row)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "供应商评级 - ",
        selectedVendor == null ? void 0 : selectedVendor.name
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, sx: { pt: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "legend", children: "交货准时率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Rating,
            {
              value: ratings.deliveryRate,
              onChange: (_, value) => setRatings({ ...ratings, deliveryRate: value || 0 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "legend", children: "质量合格率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Rating,
            {
              value: ratings.qualityRate,
              onChange: (_, value) => setRatings({ ...ratings, qualityRate: value || 0 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "legend", children: "服务响应" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Rating,
            {
              value: ratings.serviceRate,
              onChange: (_, value) => setRatings({ ...ratings, serviceRate: value || 0 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "备注",
            value: ratings.remarks,
            onChange: (e) => setRatings({ ...ratings, remarks: e.target.value }),
            fullWidth: true,
            multiline: true,
            rows: 3
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleSaveRating, variant: "contained", children: "保存" })
      ] })
    ] })
  ] });
};
export {
  RatingPage as default
};
