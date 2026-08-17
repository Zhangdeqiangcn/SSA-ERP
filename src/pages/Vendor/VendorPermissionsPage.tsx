/**
 * 供应商门户 —— 权限管理
 * 路由：/vendor-portal/permissions
 * 供应商内部角色：业务员/财务/质量/管理员，管理不同功能模块的访问权限
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, Chip, Button, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Alert, Avatar, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Tooltip, Snackbar, Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Add, Edit, Delete, Save, CheckCircle, RadioButtonUnchecked,
  Person, People, Security, Settings, AdminPanelSettings,
  SupportAgent, AttachMoney, VerifiedUser, Handshake,
  PersonAdd, Close,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useVendorPortalStore, VendorUser, VendorRole } from '@/stores/vendorPortalStore';

// 角色图标为 UI 静态资源（不可序列化），渲染时按角色 id 取用
const ROLE_ICONS: Record<string, React.ReactNode> = {
  'vr-admin': <AdminPanelSettings />,
  'vr-business': <SupportAgent />,
  'vr-finance': <AttachMoney />,
  'vr-quality': <VerifiedUser />,
};

// ── 模块/操作定义 ─────────────────────────────────────
const MODULE_PERMISSIONS: Record<string, { label: string; icon: React.ReactNode; actions: { key: string; label: string }[] }> = {
  orders: {
    label: '订单管理',
    icon: <Handshake />,
    actions: [
      { key: 'view', label: '查看' },
      { key: 'edit', label: '编辑/修改' },
      { key: 'confirm', label: '确认订单' },
      { key: 'reject', label: '拒绝/退回' },
    ],
  },
  shipments: {
    label: '发货物流',
    icon: <Handshake />,
    actions: [
      { key: 'view', label: '查看' },
      { key: 'create', label: '创建发货' },
      { key: 'edit', label: '编辑物流' },
    ],
  },
  quality: {
    label: '质量管理',
    icon: <VerifiedUser />,
    actions: [
      { key: 'view', label: '查看' },
      { key: 'respond', label: '响应问题' },
      { key: 'submit_report', label: '提交8D报告' },
      { key: 'close', label: '关闭问题' },
    ],
  },
  finance: {
    label: '财务管理',
    icon: <AttachMoney />,
    actions: [
      { key: 'view', label: '查看' },
      { key: 'confirm', label: '确认对账' },
      { key: 'submit_invoice', label: '提交开票' },
      { key: 'dispute', label: '发起争议' },
    ],
  },
  profile: {
    label: '供应商资料',
    icon: <Person />,
    actions: [
      { key: 'view', label: '查看' },
      { key: 'edit', label: '编辑资料' },
      { key: 'manage_certs', label: '管理证书' },
    ],
  },
  permissions: {
    label: '权限管理',
    icon: <Security />,
    actions: [
      { key: 'view', label: '查看' },
      { key: 'edit', label: '编辑角色' },
      { key: 'create_user', label: '新建用户' },
      { key: 'delete_user', label: '删除用户' },
    ],
  },
};

// ── 用户创建/编辑弹窗 ──────────────────────────────────
const UserDialog: React.FC<{
  open: boolean;
  user: VendorUser | null;
  roles: VendorRole[];
  onClose: () => void;
  onSave: (u: Partial<VendorUser>) => void;
}> = ({ open, user, roles, onClose, onSave }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [roleId, setRoleId] = useState(user?.roleId || 'vr-business');
  const [status, setStatus] = useState<'active' | 'inactive'>(user?.status || 'active');

  React.useEffect(() => {
    if (user) {
      setName(user.name); setEmail(user.email); setPhone(user.phone);
      setRoleId(user.roleId); setStatus(user.status);
    } else {
      setName(''); setEmail(''); setPhone(''); setRoleId('vr-business'); setStatus('active');
    }
  }, [user, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {user ? '编辑用户' : '新建用户'}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth size="small" label="姓名" value={name} onChange={e => setName(e.target.value)} />
          <TextField fullWidth size="small" label="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
          <TextField fullWidth size="small" label="手机号" value={phone} onChange={e => setPhone(e.target.value)} />
          <FormControl fullWidth size="small">
            <InputLabel>角色</InputLabel>
            <Select value={roleId} label="角色" onChange={e => setRoleId(e.target.value)}>
              {roles.map(r => (
                <MenuItem key={r.id} value={r.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: r.color }}>{ROLE_ICONS[r.id]}</Box>
                    <Typography variant="body2">{r.name}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>状态</InputLabel>
            <Select value={status} label="状态" onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="inactive">停用</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" startIcon={<Save />} onClick={() => onSave({ name, email, phone, roleId, status })}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 主页面 ─────────────────────────────────────────────
const VendorPermissionsPage: React.FC = () => {
  const portalUsers = useVendorPortalStore((s) => s.portalUsers);
  const roles = useVendorPortalStore((s) => s.roles);
  const addPortalUser = useVendorPortalStore((s) => s.addPortalUser);
  const updatePortalUser = useVendorPortalStore((s) => s.updatePortalUser);
  const deletePortalUser = useVendorPortalStore((s) => s.deletePortalUser);
  const updateRolePermissions = useVendorPortalStore((s) => s.updateRolePermissions);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedRole, setSelectedRole] = useState<VendorRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<VendorUser | null>(null);
  const [snackbar, setSnackbar] = useState('');

  // ── 角色权限编辑弹窗 ──────────────────────────────────
  const handleRoleClick = (role: VendorRole) => {
    setSelectedRole({ ...role, permissions: { ...role.permissions } });
    setRoleDialogOpen(true);
  };

  const togglePermission = (module: string, action: string) => {
    if (!selectedRole) return;
    setSelectedRole(prev => {
      if (!prev) return prev;
      const currentPermissions = { ...prev.permissions };
      const modulePerms = [...(currentPermissions[module] || [])];
      if (modulePerms.includes(action)) {
        currentPermissions[module] = modulePerms.filter(a => a !== action);
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

  // ── 用户管理 ──────────────────────────────────────────
  const handleSaveUser = (data: Partial<VendorUser>) => {
    const role = roles.find(r => r.id === data.roleId);
    if (editingUser) {
      updatePortalUser(editingUser.id, { ...data, roleName: role?.name || '' });
      setSnackbar(`用户「${data.name}」已更新`);
    } else {
      const newUser: VendorUser = {
        id: `vu-${Date.now()}`,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        roleId: data.roleId || 'vr-business',
        roleName: role?.name || '',
        status: data.status || 'active',
      };
      addPortalUser(newUser);
      setSnackbar(`用户「${data.name}」已创建`);
    }
    setUserDialogOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    deletePortalUser(id);
    setSnackbar('用户已删除');
  };

  return (
    <PageWrapper title="供应商门户 — 权限管理">
      {/* ── 角色列表 ──────────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Security sx={{ color: '#3B82F6' }} />
            <Typography variant="subtitle1" fontWeight={700}>角色与权限</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">共 {roles.length} 个角色</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {roles.map(role => (
              <Grid item xs={12} sm={6} md={3} key={role.id}>
                <Paper
                  variant="outlined"
                  onClick={() => handleRoleClick(role)}
                  sx={{
                    p: 2.5, borderRadius: 2, cursor: 'pointer',
                    transition: 'all 0.15s', borderColor: 'rgba(226,232,240,0.8)',
                    '&:hover': { borderColor: role.color, bgcolor: `${role.color}08`, boxShadow: `0 4px 12px ${role.color}15` },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: `${role.color}20`, color: role.color, width: 40, height: 40 }}>
                      {ROLE_ICONS[role.id]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{role.name}</Typography>
                      <Chip label={role.code} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {role.description}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {Object.keys(role.permissions).map(mod => (
                      <Chip key={mod} label={MODULE_PERMISSIONS[mod]?.label || mod} size="small"
                        sx={{ bgcolor: `${role.color}15`, color: role.color, fontSize: '0.65rem', mb: 0.5 }} />
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      {/* ── 用户列表 ──────────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <People sx={{ color: '#3B82F6' }} />
            <Typography variant="subtitle1" fontWeight={700}>用户管理</Typography>
          </Stack>
          <Button
            variant="contained" size="small" startIcon={<PersonAdd />}
            onClick={() => { setEditingUser(null); setUserDialogOpen(true); }}
            sx={{ borderRadius: 2 }}
          >
            新建用户
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>姓名</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>邮箱</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>手机号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>角色</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>最后登录</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {portalUsers.map(u => {
                const role = roles.find(r => r.id === u.roleId);
                return (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, bgcolor: role?.color || '#64748B', fontSize: '0.75rem' }}>
                          {u.name.slice(0, 1)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>{u.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{u.phone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={u.roleName} size="small"
                        sx={{ bgcolor: `${role?.color}15`, color: role?.color, fontWeight: 500, fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={u.status === 'active' ? <CheckCircle /> : <RadioButtonUnchecked />}
                        label={u.status === 'active' ? '启用' : '停用'}
                        size="small"
                        color={u.status === 'active' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {u.lastLogin || '从未登录'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton size="small" onClick={() => { setEditingUser(u); setUserDialogOpen(true); }}
                          sx={{ color: '#3B82F6' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteUser(u.id)}
                          sx={{ color: '#EF4444' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── 角色权限编辑弹窗 ──────────────────────────── */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {selectedRole && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: `${selectedRole.color}20`, color: selectedRole.color }}>
                {ROLE_ICONS[selectedRole.id]}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={700}>{selectedRole.name}</Typography>
                <Typography variant="caption" color="text.secondary">{selectedRole.description}</Typography>
              </Box>
            </Stack>
          )}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>功能模块</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center" colSpan={4}>操作权限</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(MODULE_PERMISSIONS).map(([modKey, mod]) => (
                  <TableRow key={modKey} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ color: '#64748B' }}>{mod.icon}</Box>
                        <Typography variant="body2" fontWeight={600}>{mod.label}</Typography>
                      </Stack>
                    </TableCell>
                    {mod.actions.map(action => {
                      const checked = selectedRole?.permissions[modKey]?.includes(action.key) || false;
                      return (
                        <TableCell key={action.key} align="center" sx={{ px: 1 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={checked}
                                onChange={() => togglePermission(modKey, action.key)}
                                sx={{
                                  color: '#CBD5E1',
                                  '&.Mui-checked': { color: '#3B82F6' },
                                }}
                              />
                            }
                            label={<Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{action.label}</Typography>}
                            sx={{ m: 0 }}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoleDialogOpen(false)}>取消</Button>
          <Button variant="contained" startIcon={<Save />} onClick={saveRolePermissions}>
            保存权限
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── 用户编辑弹窗 ──────────────────────────────── */}
      <UserDialog
        open={userDialogOpen}
        user={editingUser}
        roles={roles}
        onClose={() => { setUserDialogOpen(false); setEditingUser(null); }}
        onSave={handleSaveUser}
      />

      {/* ── Snackbar ──────────────────────────────────── */}
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        action={<IconButton size="small" color="inherit" onClick={() => setSnackbar('')}><Close fontSize="small" /></IconButton>}
      />
    </PageWrapper>
  );
};

export default VendorPermissionsPage;
