import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Collapse, Box, Tooltip, Divider, Typography, Badge,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { APP_VERSION_LABEL } from '@/version';
import {
  Dashboard, Inventory2, People, Person, ShoppingCart, Warehouse, Settings,
  ExpandLess, ExpandMore, Category, ListAlt, Rule,
  Block, Star, Approval, RequestQuote, LocalShipping, Assignment,
  MoveToInbox, CallReceived, Inventory, PlaylistAddCheck, FactCheck,
  ReportProblem, Autorenew, BarChart, ChecklistRtl, AccountTree,
  AttachMoney, PrecisionManufacturing, Route, EventNote, QueryStats,
  AccountBalance, Receipt, CreditCard, MenuBook, Summarize, Assessment,
  VerifiedUser, QrCode2, OpenInNew, MonetizationOn, CompareArrows,
  PersonSearch, Storefront, Analytics, Workspaces, TrackChanges,
  Science, Schedule, Hub, Description,
  SwapHoriz as SwapHorizIcon, Timeline as TimelineIcon, Savings,
  AccountBalanceWallet, Lock, Layers, ChangeCircle, Outbound, Speed,
  Build, Insights, ViewTimeline, Article, FilterAlt,
  Chat, WarningAmber,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 72;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  badge?: number;
}

interface MenuGroup {
  groupLabel?: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    items: [
      { label: '仪表盘', icon: <Dashboard />, path: '/' },
      { label: '个人工作台', icon: <Workspaces />, path: '/workbench' },
    ],
  },
  {
    groupLabel: '审批中心',
    items: [
      { label: '物料审批', icon: <FactCheck />, path: '/material/approvals' },
      { label: '供应商注册审批', icon: <Approval />, path: '/vendor/approvals' },
      { label: '采购审批', icon: <Approval />, path: '/purchase/approvals' },
      { label: '价格审批', icon: <Approval />, path: '/price/approvals' },
    ],
  },
  {
    groupLabel: '主数据',
    items: [
      {
        label: '物料管理', icon: <Inventory2 />,
        children: [
          { label: '物料分类', icon: <Category />, path: '/material/categories' },
          { label: '物料列表', icon: <ListAlt />, path: '/material/list' },
          { label: '评估类与价控', icon: <Layers />, path: '/material/valuation' },
        ],
      },
      {
        label: '供应商管理', icon: <People />, badge: 2,
        children: [
          { label: '供应商列表', icon: <ListAlt />, path: '/vendor/list' },
          { label: '黑名单', icon: <Block />, path: '/vendor/blacklist' },
          { label: '评级管理', icon: <Star />, path: '/vendor/rating' },
          { label: '绩效考核', icon: <Assessment />, path: '/vendor/performance' },
          { label: '风险评分', icon: <WarningAmber />, path: '/vendor/risk' },
          { label: '供应商门户', icon: <OpenInNew />, path: '/vendor-portal/login' },
        ],
      },
    ],
  },
  {
    groupLabel: '供应链',
    items: [
      {
        label: '采购管理', icon: <ShoppingCart />,
        children: [
          { label: '采购申请', icon: <RequestQuote />, path: '/purchase/requests' },
          { label: '采购订单', icon: <Assignment />, path: '/purchase/orders' },
          { label: '交期跟踪', icon: <LocalShipping />, path: '/purchase/track' },
          { label: '框架协议', icon: <Description />, path: '/purchase/framework' },
          { label: '采购信息记录', icon: <Description />, path: '/purchase/info-records' },
          { label: '货源清单', icon: <ListAlt />, path: '/purchase/source-list' },
          { label: '采购退货', icon: <SwapHorizIcon />, path: '/purchase/returns' },
        ],
      },
      {
        label: '价格管理', icon: <MonetizationOn />,
        children: [
          { label: '询价单', icon: <RequestQuote />, path: '/price/inquiry' },
          { label: '比价单', icon: <CompareArrows />, path: '/price/comparisons' },
          { label: '价目表', icon: <AttachMoney />, path: '/price/list' },
        ],
      },
      {
        label: '仓储物流', icon: <Warehouse />,
        children: [
          { label: '报检单', icon: <VerifiedUser />, path: '/warehouse/inspection-notice' },
          { label: '采购入库', icon: <MoveToInbox />, path: '/warehouse/inbound' },
          { label: '成品入库', icon: <QrCode2 />, path: '/warehouse/fg-inbound' },
          { label: '出库管理', icon: <CallReceived />, path: '/warehouse/outbound' },
          { label: '库存盘点', icon: <PlaylistAddCheck />, path: '/warehouse/check' },
          { label: '库存查询', icon: <Inventory />, path: '/warehouse/inventory' },
          { label: '批次管理', icon: <QrCode2 />, path: '/warehouse/batch' },
          { label: '库龄分析', icon: <Schedule />, path: '/warehouse/aging' },
          { label: '条码打印', icon: <QrCode2 />, path: '/warehouse/barcode' },
          { label: '仓库主数据', icon: <Warehouse />, path: '/warehouse/master' },
          { label: '跨组织转储', icon: <SwapHorizIcon />, path: '/warehouse/transfer' },
          { label: '库存调整', icon: <Rule />, path: '/warehouse/adjustment' },
          { label: '序列号/HU', icon: <QrCode2 />, path: '/warehouse/serial' },
          { label: '批次追溯穿透', icon: <AccountTree />, path: '/warehouse/trace' },
          { label: '寄售库存', icon: <Storefront />, path: '/warehouse/consignment' },
          { label: '波次RFID', icon: <QrCode2 />, path: '/warehouse/wave-rfid' },
        ],
      },
    ],
  },
  {
    groupLabel: '销售管理',
    items: [
      {
        label: '销售管理', icon: <Storefront />,
        children: [
          { label: '意向客户', icon: <PersonSearch />, path: '/sales/prospects' },
          { label: '客户主数据', icon: <Person />, path: '/sales/customers' },
          { label: '销售订单', icon: <Assignment />, path: '/sales/orders' },
          { label: '销售合同', icon: <Article />, path: '/sales/contracts' },
          { label: '物流发货', icon: <LocalShipping />, path: '/sales/logistics' },
          { label: '销售报价', icon: <RequestQuote />, path: '/sales/quotation' },
          { label: '销售开票', icon: <Receipt />, path: '/sales/invoices' },
          { label: '销售退货', icon: <SwapHorizIcon />, path: '/sales/returns' },
          { label: '可用量承诺', icon: <QueryStats />, path: '/sales/atp' },
          { label: '销售漏斗', icon: <FilterAlt />, path: '/sales/funnel' },
          { label: '返利管理', icon: <MonetizationOn />, path: '/sales/rebates' },
          { label: '客户ABC分析', icon: <Star />, path: '/sales/customer-abc' },
          { label: '三方销售', icon: <Storefront />, path: '/sales/triparty' },
        ],
      },
      {
        label: '市场分析', icon: <Analytics />, path: '/sales/analysis',
      },
      {
        label: '项目管理', icon: <Workspaces />, path: '/sales/projects',
      },
    ],
  },
  {
    groupLabel: '生产与质量',
    items: [
      {
        label: '质量管理', icon: <FactCheck />, badge: 3,
        children: [
          { label: '检验任务', icon: <ChecklistRtl />, path: '/quality/inspection', badge: 3 },
          { label: '检验标准', icon: <Rule />, path: '/quality/standards' },
          { label: 'AQL抽样', icon: <ChecklistRtl />, path: '/quality/aql' },
          { label: '检验批/COQ', icon: <ChecklistRtl />, path: '/quality/inspection-lot' },
          { label: '不合格品', icon: <ReportProblem />, path: '/quality/unqualified' },
          { label: 'PDCA改进', icon: <Autorenew />, path: '/quality/pdca' },
          { label: '8D问题求解', icon: <ChecklistRtl />, path: '/quality/8d' },
          { label: 'SPC控制图', icon: <Insights />, path: '/quality/spc' },
          { label: '实验室设备', icon: <Science />, path: '/quality/lab' },
          { label: 'FMEA分析', icon: <WarningAmber />, path: '/quality/fmea' },
          { label: 'COA合格证', icon: <VerifiedUser />, path: '/quality/coa' },
          { label: '质量报表', icon: <BarChart />, path: '/quality/report' },
        ],
      },
      {
        label: 'BOM管理', icon: <AccountTree />,
        children: [
          { label: 'BOM列表', icon: <ListAlt />, path: '/bom/list' },
          { label: '成本卷积', icon: <AttachMoney />, path: '/bom/cost-rollup' },
        ],
      },
      {
        label: '生产管理', icon: <PrecisionManufacturing />,
        children: [
          { label: '工单管理', icon: <EventNote />, path: '/production/orders' },
          { label: '工艺路线', icon: <Route />, path: '/production/routes' },
          { label: 'MRP计划', icon: <Assignment />, path: '/production/mrp' },
          { label: '生产报表', icon: <QueryStats />, path: '/production/report' },
          { label: '产能排产', icon: <Hub />, path: '/production/capacity' },
          { label: '工序报工', icon: <PlaylistAddCheck />, path: '/production/operation-reporting' },
          { label: 'WIP看板', icon: <Hub />, path: '/production/wip' },
          { label: '成本归集', icon: <AttachMoney />, path: '/production/cost' },
          { label: 'APS排程', icon: <Schedule />, path: '/production/aps' },
          { label: '生产版本', icon: <Layers />, path: '/production/versions' },
          { label: '工程变更ECN', icon: <ChangeCircle />, path: '/production/ecn' },
          { label: '委外加工', icon: <Outbound />, path: '/production/subcontract' },
          { label: 'CRP产能计划', icon: <Speed />, path: '/production/crp' },
          { label: '设备工装', icon: <Build />, path: '/production/equipment' },
          { label: 'MTO生成', icon: <PlaylistAddCheck />, path: '/production/mto' },
          { label: '详细排程', icon: <TimelineIcon />, path: '/production/scheduling' },
          { label: '甘特排产', icon: <ViewTimeline />, path: '/production/gantt' },
          { label: '工序SPC', icon: <Insights />, path: '/production/spc' },
          { label: '重复制造', icon: <Hub />, path: '/production/repetitive' },
          { label: 'MES集成', icon: <ViewTimeline />, path: '/production/mes' },
          { label: 'S&OP销售与运营计划', icon: <CompareArrows />, path: '/production/sop' },
        ],
      },
    ],
  },
  {
    groupLabel: '财务与报表',
    items: [
      {
        label: '财务管理', icon: <AccountBalance />, badge: 2,
        children: [
          { label: '发票管理', icon: <Receipt />, path: '/finance/invoices', badge: 2 },
          { label: '付款计划', icon: <CreditCard />, path: '/finance/payments' },
          { label: '会计分录', icon: <MenuBook />, path: '/finance/entries' },
          { label: '科目余额表', icon: <Summarize />, path: '/finance/trial-balance' },
          { label: '科目表', icon: <ListAlt />, path: '/finance/chart-accounts' },
          { label: '凭证列表', icon: <MenuBook />, path: '/finance/vouchers' },
          { label: '三单匹配', icon: <CompareArrows />, path: '/finance/three-way' },
          { label: '财务报表', icon: <BarChart />, path: '/finance/report' },
          { label: '税务核算', icon: <AttachMoney />, path: '/finance/tax' },
          { label: '项目核算', icon: <TrackChanges />, path: '/finance/project-accounting' },
          { label: '现金流量表', icon: <Summarize />, path: '/finance/cash-flow' },
          { label: '汇率管理', icon: <SwapHorizIcon />, path: '/finance/exchange-rates' },
          { label: '账龄分析', icon: <TimelineIcon />, path: '/finance/aging' },
          { label: '辅助核算', icon: <AccountTree />, path: '/finance/auxiliary' },
          { label: '预算控制', icon: <Savings />, path: '/finance/budget' },
          { label: '三大财务报表', icon: <BarChart />, path: '/finance/statements' },
          { label: '固定资产', icon: <AccountBalanceWallet />, path: '/finance/fixed-assets' },
          { label: '期末结账', icon: <Lock />, path: '/finance/closing' },
          { label: '应收管理', icon: <CallReceived />, path: '/finance/receivables' },
          { label: '应付管理', icon: <Outbound />, path: '/finance/payables' },
          { label: 'COPA获利分析', icon: <Assessment />, path: '/finance/copa' },
          { label: '资金管理', icon: <AccountBalanceWallet />, path: '/finance/cash' },
          { label: 'BI集成', icon: <Insights />, path: '/finance/bi' },
          { label: 'ESG报告', icon: <Summarize />, path: '/finance/esg' },
        ],
      },
    ],
  },
  {
    groupLabel: '分析与报表',
    items: [
      {
        label: '报表中心', icon: <Assessment />,
        children: [
          { label: '报表中心', icon: <ListAlt />, path: '/reports' },
          { label: '报表设计器', icon: <Description />, path: '/reports/designer' },
          { label: 'BI自助分析', icon: <Analytics />, path: '/reports/bi' },
        ],
      },
      { label: '报表权限与订阅', icon: <Assessment />, path: '/reports/permissions' },
      { label: '经营驾驶舱', icon: <Insights />, path: '/analytics/cockpit' },
      { label: '需求预测与补货', icon: <Analytics />, path: '/analytics/forecast' },
      { label: '发票OCR与凭证', icon: <Receipt />, path: '/analytics/ocr' },
      { label: 'ChatBI对话分析', icon: <Chat />, path: '/analytics/chatbi' },
      { label: '异常检测预警', icon: <WarningAmber />, path: '/analytics/alerts' },
      { label: '价格趋势分析', icon: <TimelineIcon />, path: '/analytics/price' },
    ],
  },
  {
    items: [
      { label: '系统设置', icon: <Settings />, path: '/settings' },
    ],
  },
  {
    groupLabel: '测试与诊断',
    items: [
      { label: '全流程自检', icon: <Science />, path: '/test/flow' },
      { label: '使用说明书', icon: <MenuBook />, path: '/help/manual' },
    ],
  },
];

// ── 菜单自定义落地：读取设置页保存的「顺序 + 可见性」，应用到侧边栏 ──
const applyMenuConfig = (groups: MenuGroup[], cfg: { order?: Record<string, number>; visible?: Record<string, boolean> } | null | undefined): MenuGroup[] => {
  if (!cfg || (!cfg.order && !cfg.visible)) return groups;
  const order = cfg.order || {};
  const visible = cfg.visible || {};
  const byOrder = (a: MenuItem, b: MenuItem) => (order[a.path ?? ''] ?? 9999) - (order[b.path ?? ''] ?? 9999);
  return groups
    .map((g) => {
      const items = g.items
        .map((item) => {
          if (item.children) {
            const children = item.children
              .filter((c) => visible[c.path ?? ''] !== false)
              .sort(byOrder);
            return children.length ? { ...item, children } : null;
          }
          if (visible[item.path ?? ''] === false) return null;
          return item;
        })
        .filter((x): x is MenuItem => x !== null)
        .sort(byOrder);
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);
};

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const mobileOpen = useUIStore((state) => state.mobileOpen);
  const setMobileOpen = useUIStore((state) => state.setMobileOpen);
  const menuConfig = useSettingsStore((state) => state.menuConfig);
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // P4-6 响应式断点：移动端(<600)用临时抽屉，平板(600~899)强制折叠为图标栏
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleToggle = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = !!item.children?.length;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.path);

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.label} title={item.label} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              component={item.path ? NavLink : 'button'}
              to={item.path || undefined}
              aria-label={item.label}
              onClick={hasChildren ? () => handleToggle(item.label) : (isMobile ? () => setMobileOpen(false) : undefined)}
              selected={active}
              sx={{
                minHeight: 44, justifyContent: 'center', px: 2.5,
                borderRadius: 2, mx: 1, my: 0.3,
                '&.Mui-selected': {
                  bgcolor: alpha(p, 0.12), color: p,
                  '& .MuiListItemIcon-root': { color: p },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: 0, justifyContent: 'center', color: active ? p : 'text.secondary' }}>
                <Badge badgeContent={item.badge} color="error" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
                  {item.icon}
                </Badge>
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Tooltip>
      );
    }

    return (
      <React.Fragment key={item.label}>
        <ListItem disablePadding>
          <ListItemButton
            component={item.path ? NavLink : 'button'}
            to={item.path || undefined}
            aria-label={item.label}
            onClick={hasChildren ? () => handleToggle(item.label) : (isMobile ? () => setMobileOpen(false) : undefined)}
            selected={active}
            sx={{
              pl: level === 0 ? 2 : 3.5,
              py: level === 0 ? 1 : 0.8,
              borderRadius: 2, mx: 1, my: 0.3,
              position: 'relative',
              '&.Mui-selected': {
                bgcolor: alpha(p, 0.12), color: p,
                '&::before': {
                  content: '""', position: 'absolute',
                  left: 4, top: '25%', bottom: '25%',
                  width: 3, borderRadius: 4, bgcolor: p,
                },
                '& .MuiListItemIcon-root': { color: p },
              },
              '&:hover:not(.Mui-selected)': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: active ? p : 'text.secondary' }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: level === 0 ? '0.875rem' : '0.8125rem',
                fontWeight: active ? 600 : level === 0 ? 500 : 400,
                color: active ? p : level === 0 ? 'text.primary' : 'text.secondary',
              }}
            />
            {hasChildren && (
              isExpanded
                ? <ExpandLess sx={{ color: 'text.disabled', fontSize: 18 }} />
                : <ExpandMore sx={{ color: 'text.disabled', fontSize: 18 }} />
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // 有效宽度：移动端临时抽屉用全宽；平板强制折叠；桌面跟随手动开关
  const effectiveWidth = isMobile
    ? DRAWER_WIDTH
    : isTablet
      ? DRAWER_COLLAPSED_WIDTH
      : sidebarCollapsed
        ? DRAWER_COLLAPSED_WIDTH
        : DRAWER_WIDTH;

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : undefined}
      onClose={() => setMobileOpen(false)}
      ModalProps={isMobile ? { keepMounted: true } : undefined}
      sx={{
        width: effectiveWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: effectiveWidth,
          boxSizing: 'border-box',
          top: 64,
          height: 'calc(100% - 64px)',
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
          overflowX: 'hidden',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', py: 1 }}>
        {applyMenuConfig(menuGroups, menuConfig).map((group, gIdx) => (
          <Box key={gIdx}>
            {/* 分组标题 */}
            {group.groupLabel && !sidebarCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block', px: 3, pt: gIdx === 0 ? 1 : 2, pb: 0.5,
                  fontSize: '0.6875rem', fontWeight: 600,
                  color: 'text.disabled', letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >
                {group.groupLabel}
              </Typography>
            )}
            {group.groupLabel && sidebarCollapsed && gIdx > 0 && (
              <Divider sx={{ mx: 2, my: 1, borderColor: 'divider' }} />
            )}
            <List sx={{ px: 0.5, py: 0 }}>
              {group.items.map((item) => renderMenuItem(item))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'divider', mx: 2, mt: 'auto' }} />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem', letterSpacing: '0.05em' }}>
          {sidebarCollapsed ? '' : `SSA ERP ${APP_VERSION_LABEL} · 钢材供应链版`}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
