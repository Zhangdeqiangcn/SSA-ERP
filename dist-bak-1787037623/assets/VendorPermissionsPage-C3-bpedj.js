import { r as reactExports, j as jsxRuntimeExports, R as React } from "./vendor-react-CdHjdSaV.js";
import "./index-CU2cqxc8.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as useVendorPortalStore } from "./vendorPortalStore-B2sPBeRr.js";
import { aS as Paper, m as Box, bL as Stack, d2 as Security, T as Typography, bY as Grid, b4 as Avatar, aO as Chip, R as People, bm as Button, d3 as PersonAdd, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bW as CheckCircle, cn as RadioButtonUnchecked, aM as IconButton, bi as Edit, be as Delete, b9 as Dialog, ba as DialogTitle, n as Divider, bc as DialogContent, cM as FormControlLabel, cX as Checkbox, bE as DialogActions, bd as Save, cJ as Snackbar, aV as CloseIcon, a2 as VerifiedUser, a0 as AttachMoney, d4 as SupportAgent, d5 as AdminPanelSettings, ae as Person, bN as Handshake, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
const ROLE_ICONS = {
  "vr-admin": /* @__PURE__ */ jsxRuntimeExports.jsx(AdminPanelSettings, {}),
  "vr-business": /* @__PURE__ */ jsxRuntimeExports.jsx(SupportAgent, {}),
  "vr-finance": /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, {}),
  "vr-quality": /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, {})
};
const MODULE_PERMISSIONS = {
  orders: {
    label: "订单管理",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Handshake, {}),
    actions: [
      { key: "view", label: "查看" },
      { key: "edit", label: "编辑/修改" },
      { key: "confirm", label: "确认订单" },
      { key: "reject", label: "拒绝/退回" }
    ]
  },
  shipments: {
    label: "发货物流",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Handshake, {}),
    actions: [
      { key: "view", label: "查看" },
      { key: "create", label: "创建发货" },
      { key: "edit", label: "编辑物流" }
    ]
  },
  quality: {
    label: "质量管理",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, {}),
    actions: [
      { key: "view", label: "查看" },
      { key: "respond", label: "响应问题" },
      { key: "submit_report", label: "提交8D报告" },
      { key: "close", label: "关闭问题" }
    ]
  },
  finance: {
    label: "财务管理",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, {}),
    actions: [
      { key: "view", label: "查看" },
      { key: "confirm", label: "确认对账" },
      { key: "submit_invoice", label: "提交开票" },
      { key: "dispute", label: "发起争议" }
    ]
  },
  profile: {
    label: "供应商资料",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Person, {}),
    actions: [
      { key: "view", label: "查看" },
      { key: "edit", label: "编辑资料" },
      { key: "manage_certs", label: "管理证书" }
    ]
  },
  permissions: {
    label: "权限管理",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Security, {}),
    actions: [
      { key: "view", label: "查看" },
      { key: "edit", label: "编辑角色" },
      { key: "create_user", label: "新建用户" },
      { key: "delete_user", label: "删除用户" }
    ]
  }
};
const UserDialog = ({ open, user, roles, onClose, onSave }) => {
  const [name, setName] = reactExports.useState((user == null ? void 0 : user.name) || "");
  const [email, setEmail] = reactExports.useState((user == null ? void 0 : user.email) || "");
  const [phone, setPhone] = reactExports.useState((user == null ? void 0 : user.phone) || "");
  const [roleId, setRoleId] = reactExports.useState((user == null ? void 0 : user.roleId) || "vr-business");
  const [status, setStatus] = reactExports.useState((user == null ? void 0 : user.status) || "active");
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone);
      setRoleId(user.roleId);
      setStatus(user.status);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRoleId("vr-business");
      setStatus("active");
    }
  }, [user, open]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "sm", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: user ? "编辑用户" : "新建用户" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "姓名", value: name, onChange: (e) => setName(e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "邮箱", value: email, onChange: (e) => setEmail(e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "手机号", value: phone, onChange: (e) => setPhone(e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "角色" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: roleId, label: "角色", onChange: (e) => setRoleId(e.target.value), children: roles.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: r.id, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: r.color }, children: ROLE_ICONS[r.id] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: r.name })
        ] }) }, r.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: status, label: "状态", onChange: (e) => setStatus(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "active", children: "启用" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "inactive", children: "停用" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: () => onSave({ name, email, phone, roleId, status }), children: "保存" })
    ] })
  ] });
};
const VendorPermissionsPage = () => {
  const portalUsers = useVendorPortalStore((s) => s.portalUsers);
  const roles = useVendorPortalStore((s) => s.roles);
  const addPortalUser = useVendorPortalStore((s) => s.addPortalUser);
  const updatePortalUser = useVendorPortalStore((s) => s.updatePortalUser);
  const deletePortalUser = useVendorPortalStore((s) => s.deletePortalUser);
  const updateRolePermissions = useVendorPortalStore((s) => s.updateRolePermissions);
  const [activeTab, setActiveTab] = reactExports.useState(0);
  const [selectedRole, setSelectedRole] = reactExports.useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = reactExports.useState(false);
  const [userDialogOpen, setUserDialogOpen] = reactExports.useState(false);
  const [editingUser, setEditingUser] = reactExports.useState(null);
  const [snackbar, setSnackbar] = reactExports.useState("");
  const handleRoleClick = (role) => {
    setSelectedRole({ ...role, permissions: { ...role.permissions } });
    setRoleDialogOpen(true);
  };
  const togglePermission = (module, action) => {
    if (!selectedRole) return;
    setSelectedRole((prev) => {
      if (!prev) return prev;
      const currentPermissions = { ...prev.permissions };
      const modulePerms = [...currentPermissions[module] || []];
      if (modulePerms.includes(action)) {
        currentPermissions[module] = modulePerms.filter((a) => a !== action);
      } else {
        currentPermissions[module] = [...modulePerms, action];
      }
      return { ...prev, permissions: currentPermissions };
    });
  };
  const saveRolePermissions = () => {
    if (!selectedRole) return;
    updateRolePermissions(selectedRole.id, selectedRole.permissions);
    setRoleDialogOpen(false);
    setSnackbar(`角色「${selectedRole.name}」权限已更新`);
  };
  const handleSaveUser = (data) => {
    const role = roles.find((r) => r.id === data.roleId);
    if (editingUser) {
      updatePortalUser(editingUser.id, { ...data, roleName: (role == null ? void 0 : role.name) || "" });
      setSnackbar(`用户「${data.name}」已更新`);
    } else {
      const newUser = {
        id: `vu-${Date.now()}`,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        roleId: data.roleId || "vr-business",
        roleName: (role == null ? void 0 : role.name) || "",
        status: data.status || "active"
      };
      addPortalUser(newUser);
      setSnackbar(`用户「${data.name}」已创建`);
    }
    setUserDialogOpen(false);
    setEditingUser(null);
  };
  const handleDeleteUser = (id) => {
    deletePortalUser(id);
    setSnackbar("用户已删除");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商门户 — 权限管理", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2.5, py: 2, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Security, { sx: { color: "#3B82F6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "角色与权限" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "共 ",
          roles.length,
          " 个角色"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Paper,
        {
          variant: "outlined",
          onClick: () => handleRoleClick(role),
          sx: {
            p: 2.5,
            borderRadius: 2,
            cursor: "pointer",
            transition: "all 0.15s",
            borderColor: "rgba(226,232,240,0.8)",
            "&:hover": { borderColor: role.color, bgcolor: `${role.color}08`, boxShadow: `0 4px 12px ${role.color}15` }
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: `${role.color}20`, color: role.color, width: 40, height: 40 }, children: ROLE_ICONS[role.id] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, children: role.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: role.code, size: "small", sx: { fontSize: "0.65rem", height: 18 } })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mb: 1 }, children: role.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: Object.keys(role.permissions).map((mod) => {
              var _a;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: ((_a = MODULE_PERMISSIONS[mod]) == null ? void 0 : _a.label) || mod,
                  size: "small",
                  sx: { bgcolor: `${role.color}15`, color: role.color, fontSize: "0.65rem", mb: 0.5 }
                },
                mod
              );
            }) })
          ]
        }
      ) }, role.id)) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2.5, py: 2, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(People, { sx: { color: "#3B82F6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "用户管理" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            size: "small",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PersonAdd, {}),
            onClick: () => {
              setEditingUser(null);
              setUserDialogOpen(true);
            },
            sx: { borderRadius: 2 },
            children: "新建用户"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "姓名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "邮箱" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "手机号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "角色" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "最后登录" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: portalUsers.map((u) => {
          const role = roles.find((r) => r.id === u.roleId);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { width: 28, height: 28, bgcolor: (role == null ? void 0 : role.color) || "#64748B", fontSize: "0.75rem" }, children: u.name.slice(0, 1) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: u.name })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B", fontSize: "0.8125rem" }, children: u.email }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontSize: "0.8125rem" }, children: u.phone }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: u.roleName,
                size: "small",
                sx: { bgcolor: `${role == null ? void 0 : role.color}15`, color: role == null ? void 0 : role.color, fontWeight: 500, fontSize: "0.7rem" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                icon: u.status === "active" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, {}),
                label: u.status === "active" ? "启用" : "停用",
                size: "small",
                color: u.status === "active" ? "success" : "default",
                variant: "outlined"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontSize: "0.75rem", color: "#94A3B8" }, children: u.lastLogin || "从未登录" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, justifyContent: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                IconButton,
                {
                  size: "small",
                  onClick: () => {
                    setEditingUser(u);
                    setUserDialogOpen(true);
                  },
                  sx: { color: "#3B82F6" },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                IconButton,
                {
                  size: "small",
                  onClick: () => handleDeleteUser(u.id),
                  sx: { color: "#EF4444" },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" })
                }
              )
            ] }) })
          ] }, u.id);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: roleDialogOpen, onClose: () => setRoleDialogOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: selectedRole && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: `${selectedRole.color}20`, color: selectedRole.color }, children: ROLE_ICONS[selectedRole.id] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", fontWeight: 700, children: selectedRole.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: selectedRole.description })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "功能模块" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", colSpan: 4, children: "操作权限" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: Object.entries(MODULE_PERMISSIONS).map(([modKey, mod]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: "#64748B" }, children: mod.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: mod.label })
          ] }) }),
          mod.actions.map((action) => {
            var _a;
            const checked = ((_a = selectedRole == null ? void 0 : selectedRole.permissions[modKey]) == null ? void 0 : _a.includes(action.key)) || false;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", sx: { px: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              FormControlLabel,
              {
                control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    size: "small",
                    checked,
                    onChange: () => togglePermission(modKey, action.key),
                    sx: {
                      color: "#CBD5E1",
                      "&.Mui-checked": { color: "#3B82F6" }
                    }
                  }
                ),
                label: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontSize: "0.7rem" }, children: action.label }),
                sx: { m: 0 }
              }
            ) }, action.key);
          })
        ] }, modKey)) })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setRoleDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: saveRolePermissions, children: "保存权限" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UserDialog,
      {
        open: userDialogOpen,
        user: editingUser,
        roles,
        onClose: () => {
          setUserDialogOpen(false);
          setEditingUser(null);
        },
        onSave: handleSaveUser
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: Boolean(snackbar),
        autoHideDuration: 3e3,
        onClose: () => setSnackbar(""),
        message: snackbar,
        action: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "inherit", onClick: () => setSnackbar(""), children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { fontSize: "small" }) })
      }
    )
  ] });
};
export {
  VendorPermissionsPage as default
};
