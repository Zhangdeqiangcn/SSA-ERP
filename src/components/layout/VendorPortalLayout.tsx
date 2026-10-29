/**
 * 供应商门户布局
 * 独立于主 ERP 系统，有专属侧边栏
 * 路由前缀：/vendor-portal
 */
import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, Typography, Stack, Chip, Avatar,
  Divider, AppBar, Toolbar, IconButton, Button, Badge,
  Tooltip, Paper,
} from '@mui/material';
import {
  Dashboard, Assignment, LocalShipping, FactCheck, AccountBalance,
  Receipt, ExpandLess, ExpandMore, Logout, Notifications,
  Business, ShoppingCart, Warning, Description, Handshake,
  AttachMoney, MenuOpen, Menu, Settings, Person, Payment,
} from '@mui/icons-material';
import TabBar from './TabBar';
import { PageFallback } from '@/components/common';

const DRAWER_WIDTH = 240;

interface PortalMenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: PortalMenuItem[];
  badge?: number;
}

const menuItems: PortalMenuItem[] = [
  { label: '工作台', icon: <Dashboard />, path: '/vendor-portal' },
  {
    // V3.116.0：原「订单管理」升级为「采购管理」——
    //   对账单本质是采购履约的结算凭证（对着采购订单/入库单核数、核完再开票），
    //   放在采购模块下与业务动线一致：订单确认 → 发货 → 对账 → 开票 → 收款。
    label: '采购管理', icon: <ShoppingCart />,
    children: [
      { label: '订单确认', icon: <Handshake />, path: '/vendor-portal/orders/confirm' },
      { label: '发货物流', icon: <LocalShipping />, path: '/vendor-portal/orders/shipment' },
      { label: '采购对账单', icon: <AttachMoney />, path: '/vendor-portal/purchase/statements' },
      { label: '询价报价', icon: <Assignment />, path: '/vendor-portal/quotation', badge: 1 },
    ],
  },
  {
    label: '质量管理', icon: <FactCheck />, badge: 2,
    children: [
      { label: '质量问题单', icon: <Warning />, path: '/vendor-portal/quality/issues', badge: 2 },
      { label: '8D改善报告', icon: <Description />, path: '/vendor-portal/quality/8d' },
    ],
  },
  {
    label: '财务管理', icon: <AccountBalance />,
    children: [
      // 对账单移入采购模块（见上）；此处只留资金侧视角。
      // 旧路径 /vendor-portal/finance/statements 仍可用（同一套组件），仅不再在菜单暴露。
      { label: '开票申请', icon: <Receipt />, path: '/vendor-portal/finance/invoices' },
      { label: '付款计划查询', icon: <Payment />, path: '/vendor-portal/finance/payments' },
    ],
  },
  {
    label: '企业管理', icon: <Business />,
    children: [
      { label: '供应商资料', icon: <Person />, path: '/vendor-portal/profile' },
      { label: '权限管理', icon: <Settings />, path: '/vendor-portal/permissions' },
    ],
  },
];

const VendorPortalLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vendorUser, setVendorUser] = useState<{ name: string; code: string; role: string } | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>(['采购管理', '质量管理', '财务管理']);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('vendorPortalUser');
    if (stored) {
      setVendorUser(JSON.parse(stored));
    } else {
      // 未登录，重定向到登录页
      navigate('/vendor-portal/login');
    }
  }, [navigate]);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/vendor-portal') return location.pathname === '/vendor-portal';
    return location.pathname.startsWith(path);
  };

  const handleToggle = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem('vendorPortalUser');
    navigate('/vendor-portal/login');
  };

  const renderItem = (item: PortalMenuItem, level = 0) => {
    const hasChildren = !!item.children?.length;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.path);

    return (
      <React.Fragment key={item.label}>
        <ListItem disablePadding>
          <ListItemButton
            component={item.path ? NavLink : 'button'}
            to={item.path}
            onClick={hasChildren ? () => handleToggle(item.label) : undefined}
            selected={active}
            sx={{
              pl: level === 0 ? 2 : 3.5,
              py: level === 0 ? 0.9 : 0.7,
              borderRadius: 2, mx: 1, my: 0.2,
              '&.Mui-selected': {
                bgcolor: 'rgba(59,130,246,0.12)', color: '#3B82F6',
                '& .MuiListItemIcon-root': { color: '#3B82F6' },
                '&::before': {
                  content: '""', position: 'absolute',
                  left: 4, top: '20%', bottom: '20%',
                  width: 3, borderRadius: 4, bgcolor: '#3B82F6',
                },
              },
              '&:hover:not(.Mui-selected)': { bgcolor: 'rgba(255,255,255,0.05)' },
              position: 'relative',
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: active ? '#3B82F6' : '#94A3B8' }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
            {!collapsed && (
              <>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: level === 0 ? '0.875rem' : '0.8125rem',
                    fontWeight: active ? 600 : level === 0 ? 500 : 400,
                    color: active ? '#3B82F6' : level === 0 ? '#E2E8F0' : '#94A3B8',
                  }}
                />
                {hasChildren && (
                  isExpanded
                    ? <ExpandLess sx={{ color: '#64748B', fontSize: 18 }} />
                    : <ExpandMore sx={{ color: '#64748B', fontSize: 18 }} />
                )}
              </>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && !collapsed && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children!.map(child => renderItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0F172A' }}>
      {/* 侧边栏 */}
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? 72 : DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: collapsed ? 72 : DRAWER_WIDTH,
            bgcolor: '#1E293B',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            transition: 'width 0.2s',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Business sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          {!collapsed && (
            <Box>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>供应商门户</Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem' }}>SSA ERP</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2, my: 0.5 }} />

        {/* 供应商信息 */}
        {!collapsed && vendorUser && (
          <Box sx={{ px: 2, py: 1.5, mb: 0.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#3B82F6', fontSize: '0.75rem' }}>
                {vendorUser.name.slice(0, 1)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: '#E2E8F0', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {vendorUser.name}
                </Typography>
                <Chip label={vendorUser.role} size="small"
                  sx={{ height: 16, bgcolor: 'rgba(16,185,129,0.2)', color: '#10B981', fontSize: '0.6rem' }} />
              </Box>
            </Stack>
          </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 2 }} />

        {/* 菜单 */}
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          <List sx={{ px: 0.5 }}>
            {menuItems.map(item => renderItem(item))}
          </List>
        </Box>

        {/* 底部：折叠 + 退出 */}
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />
        <Box sx={{ p: 1.5 }}>
          <Stack direction={collapsed ? 'column' : 'row'} spacing={1} justifyContent="space-between">
            <Tooltip title={collapsed ? '展开侧边栏' : '收起侧边栏'} placement="right">
              <IconButton size="small" onClick={() => setCollapsed(!collapsed)}
                sx={{ color: '#64748B', '&:hover': { color: '#94A3B8' } }}>
                {collapsed ? <Menu fontSize="small" /> : <MenuOpen fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="退出登录" placement="right">
              <IconButton size="small" onClick={handleLogout}
                sx={{ color: '#64748B', '&:hover': { color: '#EF4444' } }}>
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Drawer>

      {/* 主内容区 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶栏 */}
        <AppBar position="sticky" elevation={0} sx={{
          bgcolor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8125rem' }}>
              供应商协同管理平台 · {vendorUser?.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" sx={{ color: '#64748B' }}>
                <Badge badgeContent={2} color="error">
                  <Notifications fontSize="small" />
                </Badge>
              </IconButton>
              <Button
                size="small" variant="outlined" startIcon={<Logout />}
                onClick={handleLogout}
                sx={{ color: '#64748B', borderColor: 'rgba(100,116,139,0.4)', fontSize: '0.75rem' }}
              >
                退出
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* 页面内容 */}
        <Box sx={{ flex: 1, bgcolor: '#F8FAFC', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <TabBar variant="vendor" />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VendorPortalLayout;
