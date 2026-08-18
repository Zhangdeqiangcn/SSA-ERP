import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { u as useMaterialStore, q as useUserStore, R as ROLE_NAMES } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { C as ConfirmDialog } from "./ConfirmDialog-Dv8y0jQp.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
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
import "./reportPermissionStore-dkLqyfDv.js";
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
import { m as Box, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aS as Paper, bL as Stack, T as Typography, aO as Chip, bm as Button, E as ExpandLess, x as ExpandMore, y as Collapse, cC as Autocomplete, bE as DialogActions, bh as Add, aM as IconButton, db as ChevronRight, dc as SubdirectoryArrowRight, p as Tooltip, bi as Edit, be as Delete } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const findCategory = (list, id) => {
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findCategory(node.children, id);
      if (found) return found;
    }
  }
  return null;
};
const countDescendants = (node) => {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.length + node.children.reduce((sum, c) => sum + countDescendants(c), 0);
};
const CATEGORY_RESPONSIBLE_ROLES = [
  "buyer",
  // 采购员
  "qa_engineer",
  // SQE / 质量工程师
  "process_engineer",
  // 工艺工程师
  "rd_engineer",
  // 研发工程师
  "prod_manager",
  // 生产主管
  "warehouse_keeper"
  // 库管员
];
const buildTreeOptions = (nodes, depth = 0) => {
  const options = [];
  nodes.forEach((node) => {
    const prefix = "    ".repeat(depth) + (depth > 0 ? "└ " : "");
    options.push({
      id: node.id,
      label: prefix + node.name + (node.code ? ` (${node.code})` : ""),
      depth,
      disabled: depth >= 3
      // 限制最多4级
    });
    if (node.children) {
      options.push(...buildTreeOptions(node.children, depth + 1));
    }
  });
  return options;
};
const CategoryList = () => {
  const { categories: storeCategories } = useMaterialStore();
  const users = useUserStore((s) => s.users);
  const [categories, setCategories] = reactExports.useState(storeCategories);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editCategory, setEditCategory] = reactExports.useState(null);
  const [deleteConfirm, setDeleteConfirm] = reactExports.useState(null);
  const [parentId, setParentId] = reactExports.useState("");
  const [collapsed, setCollapsed] = reactExports.useState(/* @__PURE__ */ new Set());
  const [respOpen, setRespOpen] = reactExports.useState(false);
  const [formData, setFormData] = reactExports.useState({
    code: "",
    name: "",
    description: "",
    sortOrder: 0,
    sequenceLength: 3,
    responsiblePersons: {}
  });
  const nameById = reactExports.useMemo(() => {
    const m = {};
    users.forEach((u) => {
      m[u.id] = u.name;
    });
    return m;
  }, [users]);
  const usersByRole = (role) => users.filter((u) => u.role === role && u.status === "active");
  const flatRows = reactExports.useMemo(() => {
    const out = [];
    const walk = (list, lvl) => {
      list.forEach((node) => {
        const row = { ...node, _indent: lvl };
        out.push(row);
        if (node.children && node.children.length > 0 && !collapsed.has(node.id)) {
          walk(node.children, lvl + 1);
        }
      });
    };
    walk(categories, 0);
    return out;
  }, [categories, collapsed]);
  const toggleCollapse = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const buildChildCode = (parentCode) => {
    const prefix = parentCode;
    let maxSeg = 0;
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.parentId) {
          const p = findCategory(categories, n.parentId);
          if (p && p.code === prefix) {
            const seg = n.code.slice(prefix.length);
            const num = parseInt(seg, 10);
            if (!isNaN(num) && num > maxSeg) maxSeg = num;
          }
        }
        if (n.children) walk(n.children);
      }
    };
    walk(categories);
    return `${prefix}${(maxSeg + 1).toString().padStart(2, "0")}`;
  };
  const handleOpenDialog = (parentCat, editingCat) => {
    if (editingCat) {
      setEditCategory(editingCat);
      setFormData({
        code: editingCat.code,
        name: editingCat.name,
        description: editingCat.description || "",
        sortOrder: editingCat.sortOrder,
        sequenceLength: editingCat.sequenceLength ?? 3,
        responsiblePersons: { ...editingCat.responsiblePersons || {} }
      });
      setParentId(editingCat.parentId || "");
    } else {
      setEditCategory(null);
      const parent = parentCat ? findCategory(categories, parentCat.id) : null;
      const autoCode = parent ? buildChildCode(parent.code) : "";
      setFormData({
        code: autoCode,
        name: "",
        description: "",
        sortOrder: 0,
        sequenceLength: 3,
        responsiblePersons: {}
      });
      setParentId(parentCat ? parentCat.id : "");
    }
    setRespOpen(false);
    setDialogOpen(true);
  };
  const handleSave = () => {
    if (editCategory) {
      const updateNode = (nodes) => {
        return nodes.map((n) => {
          if (n.id === editCategory.id) {
            return {
              ...n,
              ...formData,
              sequenceLength: Number(formData.sequenceLength) || 3,
              parentId: parentId || null,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          if (n.children) return { ...n, children: updateNode(n.children) };
          return n;
        });
      };
      setCategories(updateNode(categories));
    } else {
      const parent = parentId ? findCategory(categories, parentId) : null;
      const level = parent ? (parent.level || 1) + 1 : 1;
      const newCategory = {
        id: `cat-${Date.now()}`,
        ...formData,
        sequenceLength: Number(formData.sequenceLength) || 3,
        parentId: parentId || null,
        level,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: "admin",
        updatedBy: "admin"
      };
      if (parent) {
        const addToParent = (nodes) => {
          return nodes.map((n) => {
            if (n.id === parentId) {
              return { ...n, children: [...n.children || [], newCategory] };
            }
            if (n.children) return { ...n, children: addToParent(n.children) };
            return n;
          });
        };
        setCategories(addToParent(categories));
      } else {
        setCategories([...categories, newCategory]);
      }
    }
    setDialogOpen(false);
  };
  const handleDelete = () => {
    if (!deleteConfirm) return;
    const removeNode = (nodes) => {
      return nodes.filter((n) => n.id !== deleteConfirm.id).map((n) => n.children ? { ...n, children: removeNode(n.children) } : n);
    };
    setCategories(removeNode(categories));
    setDeleteConfirm(null);
  };
  const mapImportRow = (r, _headers) => ({
    id: `cat-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    parentId: "",
    name: r["分类名称"] || "未命名分类",
    code: r["分类编码"] || "",
    description: r["描述"] || "",
    sortOrder: Number(r["排序"]) || 0,
    level: 1,
    responsiblePersons: {},
    children: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: "admin",
    updatedBy: "admin"
  });
  const columns = [
    {
      id: "name",
      header: "分类名称",
      accessorFn: (row) => row.name,
      cell: ({ row }) => {
        const hasChildren = !!(row.children && row.children.length > 0);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 0.5, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Box,
            {
              component: "span",
              sx: {
                fontWeight: row._indent === 0 ? 700 : 400,
                fontSize: row._indent === 0 ? "0.9rem" : "0.875rem",
                ml: row._indent * 3
              },
              children: [
                hasChildren ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  IconButton,
                  {
                    size: "small",
                    onClick: () => toggleCollapse(row.id),
                    sx: { p: 0, mr: 0.25, verticalAlign: "middle" },
                    "data-testid": `cat-toggle-${row.id}`,
                    children: collapsed.has(row.id) ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { sx: { fontSize: 16 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, { sx: { fontSize: 16 } })
                  }
                ) : row._indent > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SubdirectoryArrowRight,
                  {
                    sx: { fontSize: 14, color: "text.disabled", mr: 0.5, verticalAlign: "middle" }
                  }
                ) : null,
                row.name
              ]
            }
          ),
          hasChildren && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: countDescendants(row),
              size: "small",
              variant: "outlined",
              sx: { height: 18, fontSize: "0.65rem", ml: 1 }
            }
          )
        ] });
      }
    },
    {
      id: "code",
      header: "分类编码",
      accessorFn: (row) => row.code,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: row.code, size: "small", variant: "outlined" })
    },
    {
      id: "description",
      header: "描述",
      accessorFn: (row) => row.description,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.description || "-" })
    },
    {
      id: "level",
      header: "层级",
      accessorFn: (row) => row.level || 1,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
        row.level || 1,
        " 级"
      ] })
    },
    {
      id: "responsiblePersons",
      header: "责任人员",
      accessorFn: (row) => Object.values(row.responsiblePersons || {}).reduce((n, ids) => n + ids.length, 0),
      cell: ({ row }) => {
        const rp = row.responsiblePersons || {};
        const assigned = CATEGORY_RESPONSIBLE_ROLES.filter((r) => (rp[r] || []).length > 0);
        if (assigned.length === 0) {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "-" });
        }
        const detail = assigned.map((r) => `${ROLE_NAMES[r]}：${(rp[r] || []).map((id) => nameById[id] || id).join("、")}`).join("；");
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: detail, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", variant: "outlined", label: `${assigned.length} 项职责` }) });
      }
    },
    {
      id: "sortOrder",
      header: "排序",
      accessorFn: (row) => row.sortOrder,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.sortOrder })
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, justifyContent: "flex-end", children: [
        (row.level || 1) < 3 && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "添加子分类", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => handleOpenDialog(row), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, { fontSize: "small", color: "success" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => handleOpenDialog(void 0, row), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => setDeleteConfirm(row), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small", color: "error" }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "物料分类",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => handleOpenDialog(), children: "新增一级分类" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: flatRows,
            columns,
            enableRowSelection: false,
            enablePagination: true,
            enableSorting: true,
            enableColumnFilter: true,
            enableBlockSelect: true,
            enableExport: true,
            exportFormat: "xlsx",
            enableImport: true,
            onImport: (rows, headers) => rows.forEach((r) => setCategories((prev) => [...prev, mapImportRow(r)])),
            columnConfigKey: "material-category-list",
            hiddenColumns: ["responsiblePersons"]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editCategory ? "编辑分类" : "新增分类" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { pt: 2, display: "flex", flexDirection: "column", gap: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                label: "父级分类",
                value: parentId || "",
                onChange: (e) => setParentId(e.target.value),
                select: true,
                fullWidth: true,
                SelectProps: { native: true },
                helperText: "一级分类请选择「无」",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "无（一级分类）" }),
                  buildTreeOptions(categories, 0).filter((opt) => !editCategory || opt.id !== editCategory.id).map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.id, disabled: opt.disabled, children: opt.label }, opt.id))
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "分类编码",
                value: formData.code,
                onChange: (e) => setFormData({ ...formData, code: e.target.value }),
                fullWidth: true,
                required: true,
                helperText: parentId ? "该分类下物料编码的前缀，自动继承父级编码（如父级 01 → 本类 0102）" : "该分类下物料编码的前缀（如：01）"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "分类名称",
                value: formData.name,
                onChange: (e) => setFormData({ ...formData, name: e.target.value }),
                fullWidth: true,
                required: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "物料编码流水位数",
                type: "number",
                value: formData.sequenceLength,
                onChange: (e) => setFormData({ ...formData, sequenceLength: Number(e.target.value) }),
                fullWidth: true,
                helperText: "该分类下物料的流水号位数（如 3 = 001~999），即「分类编码 + 流水号」生成物料编码"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 1.5, bgcolor: "grey.50" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "该分类下物料编码示例：" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: formData.code ? `${formData.code}${1 .toString().padStart(Number(formData.sequenceLength) || 3, "0")}` : "（请先填写分类编码）",
                  color: "success",
                  size: "small"
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "描述",
                value: formData.description,
                onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                fullWidth: true,
                multiline: true,
                rows: 2
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "排序",
                type: "number",
                value: formData.sortOrder,
                onChange: (e) => setFormData({ ...formData, sortOrder: Number(e.target.value) }),
                fullWidth: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 1, borderTop: "1px dashed", borderColor: "divider", pt: 1.5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  onClick: () => setRespOpen((v) => !v),
                  endIcon: respOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}),
                  sx: { textTransform: "none", color: "text.secondary" },
                  children: "责任人员（按职能分配，点击展开维护）"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: respOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1.5, sx: { pl: 1, pt: 1 }, children: CATEGORY_RESPONSIBLE_ROLES.map((role) => {
                const opts = usersByRole(role);
                const value = (formData.responsiblePersons[role] || []).map((id) => users.find((u) => u.id === id)).filter(Boolean);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Autocomplete,
                  {
                    multiple: true,
                    size: "small",
                    disabled: opts.length === 0,
                    options: opts,
                    getOptionLabel: (o) => o.name,
                    value,
                    onChange: (_, vals) => setFormData({
                      ...formData,
                      responsiblePersons: {
                        ...formData.responsiblePersons,
                        [role]: vals.map((v) => v.id)
                      }
                    }),
                    renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        ...params,
                        label: ROLE_NAMES[role],
                        placeholder: opts.length === 0 ? "无该角色用户" : "选择人员"
                      }
                    )
                  },
                  role
                );
              }) }) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleSave, variant: "contained", disabled: !formData.code || !formData.name, children: "保存" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!deleteConfirm,
            title: "确认删除分类",
            content: (deleteConfirm == null ? void 0 : deleteConfirm.children) && deleteConfirm.children.length > 0 ? `确定要删除分类「${deleteConfirm.name}」及其 ${countDescendants(deleteConfirm)} 个子分类吗？此操作不可恢复！` : `确定要删除分类「${deleteConfirm == null ? void 0 : deleteConfirm.name}」吗？`,
            onConfirm: handleDelete,
            onCancel: () => setDeleteConfirm(null),
            type: "danger"
          }
        )
      ]
    }
  );
};
export {
  CATEGORY_RESPONSIBLE_ROLES,
  CategoryList as default
};
