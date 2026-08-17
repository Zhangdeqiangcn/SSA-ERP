import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Avatar,
  Menu, MenuItem, Box, Divider, ListItemIcon, Breadcrumbs,
  Link, InputBase, Paper, List, ListItem, ListItemText,
  Popover, Chip, Tooltip, FormControl, InputLabel, Select,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  Menu as MenuIcon, Notifications, Person, Logout,
  NavigateNext, Search, Close, CheckCircleOutline,
  WarningAmberOutlined, InfoOutlined, ErrorOutline,
  Assignment, FactCheck, AccountBalance, Inventory2,
  DoneAll, Settings, HelpOutline,
} from '@mui/icons-material';
import { useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useOrgStore } from '@/stores/orgStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore, useNotificationData, type NotifyLevel } from '@/stores/notificationStore';

// ────────────────────────────────────────────────
// 路径名映射（含 V2 新路由）
// ────────────────────────────────────────────────
const pathNameMap: Record<string, string> = {
  '/': '首页',
  '/workbench': '个人工作台',
  '/material/categories': '物料分类',
  '/material/list': '物料列表',
  '/material/create': '新增物料',
  '/material/code-rules': '物料分类',
  '/vendor/list': '供应商列表',
  '/vendor/register': '供应商注册',
  '/vendor/blacklist': '黑名单管理',
  '/vendor/rating': '评级管理',
  '/vendor/approvals': '准入审核',
  '/purchase/requests': '采购申请',
  '/purchase/create': '新建采购申请',
  '/purchase/orders': '采购订单',
  '/purchase/track': '交期跟踪',
  '/warehouse/inbound': '入库管理',
  '/warehouse/inbound/create': '新建入库单',
  '/warehouse/outbound': '出库管理',
  '/warehouse/check': '库存盘点',
  '/warehouse/inventory': '库存查询',
  '/quality/inspection': '检验任务',
  '/quality/standards': '检验标准',
  '/quality/unqualified': '不合格品',
  '/quality/pdca': 'PDCA改进',
  '/quality/report': '质量报表',
  '/bom/list': 'BOM列表',
  '/bom/cost-rollup': '成本卷积',
  '/production/orders': '工单管理',
  '/production/routes': '工艺路线',
  '/production/mrp': 'MRP计划',
  '/production/report': '生产报表',
  '/finance/invoices': '发票管理',
  '/finance/payments': '付款计划',
  '/finance/entries': '会计分录',
  '/finance/trial-balance': '科目余额表',
  '/finance/report': '财务报表',
  '/reports': '报表中心',
  '/settings': '系统设置',
};

// ────────────────────────────────────────────────
// 全局搜索候选数据
// ────────────────────────────────────────────────
interface SearchItem { label: string; sub: string; path: string; icon: React.ReactNode }
const searchData: SearchItem[] = [
  { label: '物料列表', sub: '物料管理', path: '/material/list', icon: <Inventory2 fontSize="small" /> },
  { label: '新增物料', sub: '物料管理', path: '/material/create', icon: <Inventory2 fontSize="small" /> },
  { label: '采购订单', sub: '采购管理', path: '/purchase/orders', icon: <Assignment fontSize="small" /> },
  { label: '采购申请', sub: '采购管理', path: '/purchase/requests', icon: <Assignment fontSize="small" /> },
  { label: '检验任务', sub: '质量管理', path: '/quality/inspection', icon: <FactCheck fontSize="small" /> },
  { label: 'PDCA改进', sub: '质量管理', path: '/quality/pdca', icon: <FactCheck fontSize="small" /> },
  { label: '发票管理', sub: '财务管理', path: '/finance/invoices', icon: <AccountBalance fontSize="small" /> },
  { label: '付款计划', sub: '财务管理', path: '/finance/payments', icon: <AccountBalance fontSize="small" /> },
  { label: 'BOM列表', sub: 'BOM管理', path: '/bom/list', icon: <Assignment fontSize="small" /> },
  { label: '工单管理', sub: '生产管理', path: '/production/orders', icon: <Assignment fontSize="small" /> },
  { label: 'MRP计划', sub: '生产管理', path: '/production/mrp', icon: <Assignment fontSize="small" /> },
  { label: '报表中心', sub: '报表', path: '/reports', icon: <Assignment fontSize="small" /> },
  { label: '系统设置', sub: '设置', path: '/settings', icon: <Settings fontSize="small" /> },
];

// ────────────────────────────────────────────────
// 通知图标（级别 → 图标）
// ────────────────────────────────────────────────
const notifyIcon: Record<NotifyLevel, React.ReactNode> = {
  error: <ErrorOutline fontSize="small" sx={{ color: 'error.main' }} />,
  warning: <WarningAmberOutlined fontSize="small" sx={{ color: 'warning.main' }} />,
  info: <InfoOutlined fontSize="small" sx={{ color: 'info.main' }} />,
  success: <CheckCircleOutline fontSize="small" sx={{ color: 'success.main' }} />,
};

// ────────────────────────────────────────────────
// Header Component
// ────────────────────────────────────────────────
  const Header: React.FC = () => {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setMobileOpen = useUIStore((state) => state.setMobileOpen);
  const setShortcutsHelpOpen = useUIStore((state) => state.setShortcutsHelpOpen);
  const { currentUser, logout } = useAuthStore();
  const { organizations, currentOrgId, setCurrentOrg } = useOrgStore();
  // C7 服务端化：会话（多用户）
  const session = useSessionStore((s) => s.current);
  const switchUser = useSessionStore((s) => s.switchUser);
  const sessionUsers = useUserStore((s) => s.users);

  // ── user menu ──
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // ── global search ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── notifications（来自 store 实时聚合） ──
  const [notifyAnchor, setNotifyAnchor] = useState<null | HTMLElement>(null);
  const [todoAnchor, setTodoAnchor] = useState<null | HTMLElement>(null);
  const { notifications, summary } = useNotificationData();
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const dismissNotify = useNotificationStore((s) => s.dismiss);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const todoTotal = summary.reduce((acc, c) => acc + c.count, 0);

  // Ctrl/Cmd+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // click outside search → close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  const filteredSearch = searchText.trim().length > 0
    ? searchData.filter(
        i => i.label.includes(searchText) || i.sub.includes(searchText)
      )
    : searchData.slice(0, 6);

  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    setSearchText('');
    navigate(path);
  };

  const handleMarkAllRead = () => {
    markAllRead(notifications.map((n) => n.id));
  };

  const handleMarkOneRead = (id: string, path: string) => {
    markRead(id);
    setNotifyAnchor(null);
    navigate(path);
  };

  const handleDismiss = (id: string) => {
    dismissNotify(id);
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string }[] = [];
    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const label = pathNameMap[currentPath] || path;
      breadcrumbs.push({ label, path: currentPath });
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (th) => th.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 64, gap: 1 }}>
        {/* 折叠按钮（移动端打开抽屉 / 桌面端折叠侧栏） */}
        <IconButton
          edge="start"
          onClick={() => (isMobile ? setMobileOpen(true) : toggleSidebar())}
          aria-label={isMobile ? '打开导航菜单' : '折叠或展开侧边栏'}
          sx={{ mr: 1, color: 'text.secondary' }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.025em' }}>
            SSA ERP
          </Typography>
          <Chip
            label="v2.0"
            size="small"
            sx={{ ml: 1, bgcolor: alpha(p, 0.12), color: p, fontSize: '0.6rem', height: 18 }}
          />
        </Box>

        {/* ── 组织切换器（P2-2 多组织）+ P1-01 类型徽标 ── */}
        <FormControl size="small" sx={{ minWidth: 200, mr: 1 }}>
          <Select
            value={currentOrgId}
            onChange={(e) => setCurrentOrg(e.target.value)}
            sx={{ fontSize: '0.8125rem', bgcolor: 'background.default', borderRadius: 2, '& .MuiSelect-select': { py: 0.75 } }}
            aria-label="切换组织"
            data-testid="org-switcher"
            renderValue={(val) => {
              const org = organizations.find(o => o.id === val);
              if (!org) return '';
              const typeLabels: Record<string, string> = { company: '公司', plant: '工厂', department: '部门' };
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{org.name}</Typography>
                  <Chip
                    label={typeLabels[org.type] || org.type}
                    size="small"
                    data-testid="org-type-badge"
                    sx={{ height: 20, fontSize: '0.65rem', bgcolor: org.type === 'company' ? '#EFF6FF' : org.type === 'plant' ? '#FEF3C7' : '#ECFDF5', color: org.type === 'company' ? '#3B82F6' : org.type === 'plant' ? '#D97706' : '#10B981' }}
                  />
                </Box>
              );
            }}
          >
            {organizations.map((o) => (
              <MenuItem key={o.id} value={o.id} sx={{ fontSize: '0.8125rem' }}>{o.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ── 会话切换器（C7 服务端化：多用户） ── */}
        <FormControl size="small" sx={{ minWidth: 130, mr: 1 }}>
          <Select
            value={session.userId}
            onChange={(e) => switchUser(e.target.value)}
            sx={{ fontSize: '0.8125rem', bgcolor: 'background.default', borderRadius: 2, '& .MuiSelect-select': { py: 0.75 } }}
            aria-label="切换会话用户"
            SelectDisplayProps={{ 'data-testid': 'session-switcher' } as React.HTMLAttributes<HTMLDivElement>}
          >
            {sessionUsers.map((u) => (
              <MenuItem key={u.id} value={u.id} sx={{ fontSize: '0.8125rem' }} data-testid={`session-opt-${u.id}`}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ── 全局搜索 ── */}
        <Box ref={searchRef} sx={{ position: 'relative', flexGrow: 1, maxWidth: 480, mx: 2 }}>
          <Paper
            elevation={0}
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            sx={{
              display: 'flex', alignItems: 'center', px: 1.5, py: 0.6,
              bgcolor: searchOpen ? 'background.paper' : 'background.default',
              border: '1px solid',
              borderColor: searchOpen ? p : 'divider',
              borderRadius: 2, cursor: 'text', transition: 'all .15s',
              '&:hover': { borderColor: 'text.secondary' },
            }}
          >
            <Search sx={{ color: 'text.secondary', fontSize: 18, mr: 1 }} />
            <InputBase
              inputRef={searchInputRef}
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setSearchOpen(true); }}
              placeholder="搜索菜单、单据、物料… (Ctrl+K)"
              sx={{ fontSize: '0.875rem', flex: 1, color: 'text.primary' }}
            />
            {searchText && (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSearchText(''); }} aria-label="清除搜索">
                <Close sx={{ fontSize: 14, color: 'text.secondary' }} />
              </IconButton>
            )}
            {!searchText && (
              <Box sx={{ px: 0.8, py: 0.2, border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: '0.6rem', color: 'text.secondary' }}>
                Ctrl K
              </Box>
            )}
          </Paper>

          {/* 搜索下拉 */}
          {searchOpen && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 9999,
                borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              {filteredSearch.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontSize: '0.875rem' }}>
                  未找到匹配结果
                </Box>
              ) : (
                <List dense disablePadding>
                  {filteredSearch.map((item, idx) => (
                    <ListItem
                      key={idx}
                      button
                      onClick={() => handleSearchSelect(item.path)}
                      sx={{ py: 1, px: 2, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        secondary={item.sub}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Box>

        {/* 面包屑 */}
        {breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" sx={{ color: 'divider' }} />}
            sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}
          >
            {breadcrumbs.map((item, index) => (
              <Link
                key={item.path}
                component={RouterLink}
                to={item.path}
                underline="hover"
                sx={{
                  color: index === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary',
                  fontSize: '0.875rem',
                  fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                  '&:hover': { color: p },
                }}
              >
                {item.label}
              </Link>
            ))}
          </Breadcrumbs>
        )}

        {/* ── 通知铃 ── */}
        <Tooltip title="消息通知">
          <IconButton
            sx={{ color: 'text.secondary' }}
            onClick={(e) => setNotifyAnchor(e.currentTarget)}
            aria-label="消息通知"
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', minWidth: 16, height: 16 } }}
            >
              <Notifications />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* ── 通知弹出面板 ── */}
        <Popover
          open={Boolean(notifyAnchor)}
          anchorEl={notifyAnchor}
          onClose={() => setNotifyAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              width: 360, mt: 1.5, borderRadius: 2,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: '1px solid', borderColor: 'divider',
            }
          }}
        >
          {/* 通知头 */}
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, color: 'text.primary' }}>
              消息通知
              {unreadCount > 0 && (
                <Chip label={`${unreadCount}条未读`} size="small" color="error" sx={{ ml: 1, fontSize: '0.6rem', height: 18 }} />
              )}
            </Typography>
            {unreadCount > 0 && (
              <Tooltip title="全部标为已读">
                <IconButton size="small" onClick={handleMarkAllRead}>
                  <DoneAll sx={{ fontSize: 16, color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* 通知列表 */}
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {notifications.map((n, idx) => (
              <React.Fragment key={n.id}>
                <ListItem
                  button
                  onClick={() => handleMarkOneRead(n.id, n.path)}
                  secondaryAction={
                    n.dismissible ? (
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDismiss(n.id); }}
                        sx={{ mr: 0.5 }}
                        aria-label="忽略通知"
                      >
                        <Close sx={{ fontSize: 14, color: 'text.disabled' }} />
                      </IconButton>
                    ) : undefined
                  }
                  sx={{
                    px: 2, py: 1.2, cursor: 'pointer',
                    bgcolor: n.read ? 'transparent' : alpha(p, 0.06),
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, alignSelf: 'flex-start', mt: 0.3 }}>
                    {notifyIcon[n.level]}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={n.read ? 400 : 600} sx={{ flex: 1, color: 'text.primary' }}>
                          {n.title}
                        </Typography>
                        {!n.read && (
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: p, flexShrink: 0 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{n.desc}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>{n.time}</Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                {idx < notifications.length - 1 && <Divider sx={{ mx: 2, borderColor: 'divider' }} />}
              </React.Fragment>
            ))}
          </List>

          <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              sx={{ color: p, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={() => setNotifyAnchor(null)}
            >
              查看全部通知
            </Typography>
          </Box>
        </Popover>

        {/* ── 待办聚合（P4-4） ── */}
        <Tooltip title="我的待办">
          <IconButton
            sx={{ color: 'text.secondary' }}
            onClick={(e) => setTodoAnchor(e.currentTarget)}
            aria-label="我的待办"
          >
            <Badge
              badgeContent={todoTotal}
              color="warning"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', minWidth: 16, height: 16 } }}
            >
              <Assignment />
            </Badge>
          </IconButton>
        </Tooltip>

        <Popover
          open={Boolean(todoAnchor)}
          anchorEl={todoAnchor}
          onClose={() => setTodoAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              width: 300, mt: 1.5, borderRadius: 2,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: '1px solid', borderColor: 'divider',
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'text.primary' }}>
              我的待办
              {todoTotal > 0 && (
                <Chip label={`${todoTotal}项`} size="small" color="warning" sx={{ ml: 1, fontSize: '0.6rem', height: 18 }} />
              )}
            </Typography>
          </Box>
          <List dense disablePadding sx={{ maxHeight: 340, overflow: 'auto' }}>
            {summary.map((c) => (
              <ListItem
                button
                key={c.key}
                onClick={() => { setTodoAnchor(null); navigate(c.path); }}
                sx={{
                  px: 2, py: 1.2, cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  opacity: c.count === 0 ? 0.55 : 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: c.level === 'error' ? 'error.main' : c.level === 'warning' ? 'warning.main' : 'info.main' }}>
                  {c.level === 'error' ? <ErrorOutline fontSize="small" /> : c.level === 'warning' ? <WarningAmberOutlined fontSize="small" /> : <InfoOutlined fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={c.label}
                  primaryTypographyProps={{ fontSize: '0.875rem', color: 'text.primary' }}
                />
                <Chip
                  label={c.count}
                  size="small"
                  color={c.level === 'error' ? 'error' : c.level === 'warning' ? 'warning' : 'info'}
                  sx={{ height: 20, fontSize: '0.7rem', minWidth: 28 }}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              sx={{ color: p, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={() => { setTodoAnchor(null); navigate('/workbench'); }}
            >
              前往个人工作台
            </Typography>
          </Box>
        </Popover>

        {/* ── 快捷键帮助（P4-7） ── */}
        <Tooltip title="键盘快捷键">
          <IconButton
            sx={{ color: 'text.secondary' }}
            onClick={() => setShortcutsHelpOpen(true)}
            aria-label="键盘快捷键"
          >
            <HelpOutline />
          </IconButton>
        </Tooltip>

        {/* ── 用户头像 ── */}
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5 }} aria-label="用户菜单">
          <Avatar
            sx={{
              width: 36, height: 36,
              bgcolor: alpha(p, 0.12), color: p,
              fontSize: '0.875rem', fontWeight: 600,
              border: `2px solid ${alpha(p, 0.3)}`,
            }}
          >
            {currentUser?.name?.charAt(0) || 'U'}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: { mt: 1.5, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid', borderColor: 'divider', borderRadius: 2 }
          }}
        >
          <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: 'text.primary' }}>
              {currentUser?.name || '用户'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              {currentUser?.role || '操作员'}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'divider' }} />
          <MenuItem onClick={() => { navigate('/workbench'); setAnchorEl(null); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Person fontSize="small" /></ListItemIcon>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>个人工作台</Typography>
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); setAnchorEl(null); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Settings fontSize="small" /></ListItemIcon>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>设置</Typography>
          </MenuItem>
          <MenuItem onClick={() => { logout(); setAnchorEl(null); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}><Logout fontSize="small" /></ListItemIcon>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>退出登录</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
