import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Chip, IconButton, Button, Menu, MenuItem,
  List, ListItem, ListItemIcon, ListItemText, Tooltip, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, Avatar, Badge, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon, Notifications as NotificationsIcon, WarningAmberOutlined,
  Assignment, FactCheck, AccountBalance, Inventory2, Assessment, Add, Close,
  DragIndicator, RestartAlt, ErrorOutline, InfoOutlined, Storefront, ReceiptLong,
  PushPin, CheckCircleOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationData, type NotifyLevel } from '@/stores/notificationStore';
import {
  useWorkbenchStore, WIDGET_LIBRARY, type WidgetId, type QuickLink,
} from '@/stores/workbenchStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useVendorStore } from '@/stores/vendorStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useProductionStore } from '@/stores/productionStore';

// 常用功能图标解析
const ICON_MAP: Record<string, React.ReactNode> = {
  inventory: <Inventory2 fontSize="small" />,
  assignment: <Assignment fontSize="small" />,
  factcheck: <FactCheck fontSize="small" />,
  account: <AccountBalance fontSize="small" />,
  report: <Assessment fontSize="small" />,
  store: <Storefront fontSize="small" />,
  receipt: <ReceiptLong fontSize="small" />,
};

// 添加常用功能时的候选目录
const LINK_CATALOG: Omit<QuickLink, 'id'>[] = [
  { label: '供应商列表', path: '/vendor/list', icon: 'store' },
  { label: '采购申请', path: '/purchase/requests', icon: 'assignment' },
  { label: '价格比对', path: '/price/comparison/new', icon: 'receipt' },
  { label: '库存查询', path: '/warehouse/inventory', icon: 'inventory' },
  { label: 'BOM列表', path: '/bom/list', icon: 'assignment' },
  { label: '销售订单', path: '/sales/orders', icon: 'assignment' },
  { label: 'MRP计划', path: '/production/mrp', icon: 'assignment' },
  { label: '经营驾驶舱', path: '/analytics/cockpit', icon: 'report' },
  { label: '系统设置', path: '/settings', icon: 'report' },
];

const ROLE_HINTS: Record<string, string> = {
  admin: '管理员视图：关注全局经营指标与跨模块预警。',
  buyer: '采购员视图：优先处理采购申请、订单与供应商准入。',
  warehouse: '仓储视图：关注库存告急、出入库与盘点任务。',
  quality: '质量视图：优先处理检验任务、不合格品与 8D。',
  finance: '财务视图：关注发票验证、付款计划与账期。',
  production: '生产视图：关注在产工单、产能与工序报工。',
};

const fmtMoney = (n: number) =>
  '¥' + (n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 });

const notifyIcon: Record<NotifyLevel, React.ReactNode> = {
  error: <ErrorOutline fontSize="small" sx={{ color: 'error.main' }} />,
  warning: <WarningAmberOutlined fontSize="small" sx={{ color: 'warning.main' }} />,
  info: <InfoOutlined fontSize="small" sx={{ color: 'info.main' }} />,
  success: <CheckCircleOutline fontSize="small" sx={{ color: 'success.main' }} />,
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
};

const Workbench: React.FC = () => {
  const theme = useMuiTheme();
  const p = theme.palette.primary.main;
  const navigate = useNavigate();

  const { currentUser, role } = useAuthStore();
  const { notifications, summary } = useNotificationData();
  const {
    visibleWidgets, quickLinks, editMode,
    toggleWidget, addQuickLink, removeQuickLink, reorderWidgets, setEditMode, resetLayout,
  } = useWorkbenchStore();

  // 业务数据（用于业务监控指标）
  const materials = useMaterialStore((s) => s.materials);
  const vendors = useVendorStore((s) => s.vendors);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const inspectionTasks = useQualityStore((s) => s.inspectionTasks);
  const invoices = useFinanceStore((s) => s.invoices);
  const paymentPlans = useFinanceStore((s) => s.paymentPlans);
  const workOrders = useProductionStore((s) => s.workOrders);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [linkDialog, setLinkDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPath, setNewPath] = useState('');
  const [dragIndex, setDragIndex] = useState<number>(-1);

  // 安全库存对照
  const safetyMap = useMemo(() => {
    const m = new Map<string, number>();
    (materials ?? []).forEach((mt) => { if (mt.code) m.set(mt.code, mt.safetyStock ?? 0); });
    return m;
  }, [materials]);

  const lowStockCount = useMemo(() => {
    let c = 0;
    (inventoryRecords ?? []).forEach((r) => {
      const ss = safetyMap.get(r.materialCode) ?? 0;
      if (ss > 0 && r.quantity < ss) c += 1;
    });
    return c;
  }, [inventoryRecords, safetyMap]);

  const pendingPayTotal = useMemo(() => {
    let t = 0;
    (paymentPlans ?? []).forEach((pl) => {
      if (pl.status === 'pending' || pl.status === 'overdue') {
        t += (pl.totalAmount || 0) - (pl.paidAmount || 0);
      }
    });
    return t;
  }, [paymentPlans]);

  const metrics = useMemo(() => [
    {
      label: '供应商待审', value: (vendors ?? []).filter((v) => v.status === 'pending').length,
      icon: <Storefront fontSize="small" />, path: '/vendor/approvals', tone: 'warning' as NotifyLevel,
    },
    {
      label: '库存告急', value: lowStockCount,
      icon: <Inventory2 fontSize="small" />, path: '/warehouse/inventory',
      tone: lowStockCount > 0 ? ('warning' as NotifyLevel) : ('success' as NotifyLevel),
    },
    {
      label: '待付款金额', value: fmtMoney(pendingPayTotal),
      icon: <AccountBalance fontSize="small" />, path: '/finance/payments', tone: 'warning' as NotifyLevel,
    },
    {
      label: '检验任务', value: (inspectionTasks ?? []).filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
      icon: <FactCheck fontSize="small" />, path: '/quality/inspection', tone: 'info' as NotifyLevel,
    },
    {
      label: '在产工单', value: (workOrders ?? []).length,
      icon: <Assignment fontSize="small" />, path: '/production/orders', tone: 'info' as NotifyLevel,
    },
    {
      label: '采购申请待审', value: (purchaseRequests ?? []).filter((r) => r.status === 'pending').length,
      icon: <Assignment fontSize="small" />, path: '/purchase/requests', tone: 'info' as NotifyLevel,
    },
  ], [vendors, lowStockCount, pendingPayTotal, inspectionTasks, workOrders, purchaseRequests]);

  const hiddenWidgets = WIDGET_LIBRARY.filter((w) => !visibleWidgets.includes(w.id));
  const roleHint = ROLE_HINTS[role || 'admin'] || ROLE_HINTS.admin;

  const handleAddLink = () => {
    if (!newLabel.trim() || !newPath.trim()) return;
    addQuickLink({
      id: `ql-${Date.now()}`,
      label: newLabel.trim(),
      path: newPath.trim().startsWith('/') ? newPath.trim() : `/${newPath.trim()}`,
      icon: 'assignment',
    });
    setNewLabel('');
    setNewPath('');
    setLinkDialog(false);
  };

  // 拖拽排序
  const onDrop = (to: number) => {
    if (dragIndex >= 0 && dragIndex !== to) reorderWidgets(dragIndex, to);
    setDragIndex(-1);
  };

  const renderWidget = (id: WidgetId, index: number) => {
    const def = WIDGET_LIBRARY.find((w) => w.id === id)!;
    return (
      <Grid item xs={12} md={id === 'metrics' ? 12 : 6} key={id}>
        <Paper
          draggable={editMode}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(index)}
          elevation={0}
          sx={{
            p: 2, height: '100%', borderRadius: 3,
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper',
            opacity: dragIndex === index ? 0.6 : 1,
            cursor: editMode ? 'grab' : 'default',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            {editMode && (
              <DragIndicator sx={{ color: 'text.disabled', mr: 0.5, cursor: 'grab' }} />
            )}
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, color: 'text.primary' }}>
              {def.title}
            </Typography>
            {editMode && (
              <Tooltip title="移除卡片">
                <IconButton size="small" onClick={() => toggleWidget(id)}>
                  <Close sx={{ fontSize: 16, color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* 我的待办 */}
          {id === 'todo' && (
            <Grid container spacing={1.5}>
              {summary.map((c) => (
                <Grid item xs={6} sm={4} key={c.key}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate(c.path)}
                    sx={{
                      p: 1.5, borderRadius: 2, cursor: 'pointer',
                      border: '1px solid', borderColor: 'divider',
                      bgcolor: c.count > 0 ? alpha(p, 0.06) : 'background.default',
                      '&:hover': { borderColor: p },
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}
                      sx={{ color: c.level === 'error' ? 'error.main' : c.level === 'warning' ? 'warning.main' : 'text.primary' }}>
                      {c.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {/* 预警与通知 */}
          {id === 'alert' && (
            <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
              {notifications.slice(0, 10).map((n, i) => (
                <React.Fragment key={n.id}>
                  <ListItem
                    button
                    onClick={() => navigate(n.path)}
                    sx={{ px: 1, py: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>{notifyIcon[n.level]}</ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={n.read ? 400 : 600} sx={{ color: 'text.primary' }}>{n.title}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.desc}</Typography>}
                    />
                  </ListItem>
                  {i < notifications.slice(0, 10).length - 1 && <Divider component="li" sx={{ borderColor: 'divider' }} />}
                </React.Fragment>
              ))}
              {notifications.length === 0 && (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                  <CheckCircleOutline sx={{ color: 'success.main', fontSize: 28 }} />
                  <Typography variant="body2" sx={{ mt: 1 }}>暂无预警，一切正常</Typography>
                </Box>
              )}
            </List>
          )}

          {/* 业务监控 */}
          {id === 'metrics' && (
            <Grid container spacing={1.5}>
              {metrics.map((m) => (
                <Grid item xs={6} sm={4} md={2} key={m.label}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate(m.path)}
                    sx={{
                      p: 1.5, borderRadius: 2, cursor: 'pointer',
                      border: '1px solid', borderColor: 'divider',
                      '&:hover': { borderColor: p },
                    }}
                  >
                    <Box sx={{ color: m.tone === 'error' ? 'error.main' : m.tone === 'warning' ? 'warning.main' : 'text.secondary', mb: 0.5 }}>
                      {m.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary', fontSize: '1.1rem' }}>
                      {m.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {/* 常用功能 */}
          {id === 'quicklinks' && (
            <Box>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {quickLinks.map((l) => (
                  <Chip
                    key={l.id}
                    icon={ICON_MAP[l.icon] || <Assignment fontSize="small" />}
                    label={l.label}
                    onClick={() => navigate(l.path)}
                    onDelete={editMode ? () => removeQuickLink(l.id) : undefined}
                    deleteIcon={<Close />}
                    sx={{
                      py: 0.8, pl: 0.5, pr: editMode ? 0.5 : 1.2, cursor: 'pointer',
                      bgcolor: alpha(p, 0.08), color: 'text.primary',
                      '&:hover': { bgcolor: alpha(p, 0.16) },
                      '& .MuiChip-deleteIcon': { color: 'text.secondary' },
                    }}
                  />
                ))}
                {editMode && (
                  <Chip
                    icon={<Add />}
                    label="添加"
                    onClick={() => setLinkDialog(true)}
                    variant="outlined"
                    sx={{ py: 0.8, cursor: 'pointer', borderStyle: 'dashed' }}
                  />
                )}
              </Stack>
            </Box>
          )}
        </Paper>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* 顶部：问候 + 角色 */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 2, borderRadius: 3,
          background: `linear-gradient(120deg, ${alpha(p, 0.12)}, ${alpha(p, 0.02)})`,
          border: '1px solid', borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Avatar sx={{ width: 52, height: 52, bgcolor: p, color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>
            {currentUser?.name?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary' }}>
              {greeting()}，{currentUser?.name || '用户'}
            </Typography>
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={role || '操作员'} size="small" sx={{ bgcolor: alpha(p, 0.16), color: p, fontWeight: 600 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{roleHint}</Typography>
            </Box>
          </Box>
          <Box>
            <Tooltip title="自定义布局">
              <Button
                variant={editMode ? 'contained' : 'outlined'}
                startIcon={editMode ? <CheckCircleOutline /> : <DashboardIcon />}
                onClick={() => setEditMode(!editMode)}
                sx={{ mr: 1 }}
              >
                {editMode ? '完成' : '编辑布局'}
              </Button>
            </Tooltip>
            {editMode && (
              <Tooltip title="恢复默认布局">
                <IconButton onClick={resetLayout}><RestartAlt /></IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Paper>

      {/* 添加卡片菜单触发 */}
      {editMode && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            disabled={hiddenWidgets.length === 0}
            sx={{ borderStyle: 'dashed' }}
          >
            添加卡片{hiddenWidgets.length > 0 ? `（${hiddenWidgets.length}）` : ''}
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            {hiddenWidgets.map((w) => (
              <MenuItem key={w.id} onClick={() => { toggleWidget(w.id); setAnchorEl(null); }}>
                <ListItemIcon sx={{ minWidth: 32 }}><DashboardIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={w.title} secondary={w.desc} />
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}

      {/* 卡片网格 */}
      <Grid container spacing={2}>
        {visibleWidgets.map((id, index) => renderWidget(id, index))}
      </Grid>

      {/* 添加常用功能对话框 */}
      <Dialog open={linkDialog} onClose={() => setLinkDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加常用功能</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="显示名称"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            margin="normal"
            placeholder="如：生产报表"
          />
          <TextField
            fullWidth
            label="路由路径"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            margin="normal"
            placeholder="如：/production/report"
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            或从候选目录快速添加：
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
            {LINK_CATALOG.map((c) => (
              <Chip
                key={c.path}
                icon={ICON_MAP[c.icon] || <Assignment fontSize="small" />}
                label={c.label}
                size="small"
                onClick={() => { addQuickLink({ ...c, id: `ql-${Date.now()}` }); }}
                sx={{ cursor: 'pointer', bgcolor: alpha(p, 0.08) }}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddLink}>添加</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Workbench;
