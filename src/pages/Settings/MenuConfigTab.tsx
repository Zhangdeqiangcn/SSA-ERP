import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Tooltip,
  Switch, FormControlLabel, Alert, Stack, Divider,
} from '@mui/material';
import {
  KeyboardArrowUp, KeyboardArrowDown, Save, Refresh,
  TrendingUp,
} from '@mui/icons-material';
import { useSettingsStore } from '@/stores/settingsStore';

interface MenuEntry {
  id: string;
  label: string;
  group: string;
  path: string;
  frequency: number; // 模拟使用频率
  visible: boolean;
  order: number;
}

const defaultMenu: MenuEntry[] = [
  { id: 'dashboard', label: '仪表盘', group: '首页', path: '/', frequency: 156, visible: true, order: 1 },
  { id: 'material-cat', label: '物料分类', group: '主数据', path: '/material/categories', frequency: 42, visible: true, order: 2 },
  { id: 'material-list', label: '物料列表', group: '主数据', path: '/material/list', frequency: 89, visible: true, order: 3 },
  { id: 'vendor-list', label: '供应商列表', group: '主数据', path: '/vendor/list', frequency: 67, visible: true, order: 6 },
  { id: 'vendor-approval', label: '注册审批', group: '主数据', path: '/vendor/approvals', frequency: 34, visible: true, order: 7 },
  { id: 'vendor-blacklist', label: '黑名单', group: '主数据', path: '/vendor/blacklist', frequency: 8, visible: true, order: 8 },
  { id: 'vendor-rating', label: '评级管理', group: '主数据', path: '/vendor/rating', frequency: 19, visible: true, order: 9 },
  { id: 'purchase-request', label: '采购申请', group: '供应链', path: '/purchase/requests', frequency: 112, visible: true, order: 10 },
  { id: 'purchase-order', label: '采购订单', group: '供应链', path: '/purchase/orders', frequency: 98, visible: true, order: 11 },
  { id: 'purchase-track', label: '交期跟踪', group: '供应链', path: '/purchase/track', frequency: 45, visible: true, order: 12 },
  { id: 'price-inquiry', label: '询价单', group: '供应链', path: '/price/inquiry', frequency: 38, visible: true, order: 13 },
  { id: 'price-compare', label: '比价单', group: '供应链', path: '/price/comparisons', frequency: 26, visible: true, order: 14 },
  { id: 'price-approval', label: '价格审批', group: '供应链', path: '/price/approvals', frequency: 22, visible: true, order: 15 },
  { id: 'price-list', label: '价目表', group: '供应链', path: '/price/list', frequency: 52, visible: true, order: 16 },
  { id: 'wh-inspection', label: '报检单', group: '供应链', path: '/warehouse/inspection-notice', frequency: 41, visible: true, order: 17 },
  { id: 'wh-inbound', label: '采购入库', group: '供应链', path: '/warehouse/inbound', frequency: 87, visible: true, order: 18 },
  { id: 'wh-fg-inbound', label: '成品入库', group: '供应链', path: '/warehouse/fg-inbound', frequency: 63, visible: true, order: 19 },
  { id: 'wh-outbound', label: '出库管理', group: '供应链', path: '/warehouse/outbound', frequency: 76, visible: true, order: 20 },
  { id: 'wh-check', label: '库存盘点', group: '供应链', path: '/warehouse/check', frequency: 31, visible: true, order: 21 },
  { id: 'wh-inventory', label: '库存查询', group: '供应链', path: '/warehouse/inventory', frequency: 55, visible: true, order: 22 },
  { id: 'sales-prospect', label: '意向客户', group: '销售管理', path: '/sales/prospects', frequency: 44, visible: true, order: 23 },
  { id: 'sales-customer', label: '客户主数据', group: '销售管理', path: '/sales/customers', frequency: 40, visible: true, order: 23.5 },
  { id: 'sales-order', label: '销售订单', group: '销售管理', path: '/sales/orders', frequency: 91, visible: true, order: 24 },
  { id: 'sales-logistics', label: '物流发货', group: '销售管理', path: '/sales/logistics', frequency: 37, visible: true, order: 25 },
  { id: 'sales-analysis', label: '市场分析', group: '销售管理', path: '/sales/analysis', frequency: 18, visible: true, order: 26 },
  { id: 'sales-project', label: '项目管理', group: '销售管理', path: '/sales/projects', frequency: 29, visible: true, order: 27 },
  { id: 'quality-inspection', label: '检验任务', group: '生产与质量', path: '/quality/inspection', frequency: 78, visible: true, order: 28 },
  { id: 'quality-standards', label: '检验标准', group: '生产与质量', path: '/quality/standards', frequency: 23, visible: true, order: 29 },
  { id: 'quality-unqual', label: '不合格品', group: '生产与质量', path: '/quality/unqualified', frequency: 47, visible: true, order: 30 },
  { id: 'quality-pdca', label: 'PDCA改进', group: '生产与质量', path: '/quality/pdca', frequency: 14, visible: true, order: 31 },
  { id: 'quality-report', label: '质量报表', group: '生产与质量', path: '/quality/report', frequency: 21, visible: true, order: 32 },
  { id: 'bom-list', label: 'BOM列表', group: '生产与质量', path: '/bom/list', frequency: 36, visible: true, order: 33 },
  { id: 'bom-cost', label: '成本卷积', group: '生产与质量', path: '/bom/cost-rollup', frequency: 16, visible: true, order: 34 },
  { id: 'prod-order', label: '工单管理', group: '生产与质量', path: '/production/orders', frequency: 73, visible: true, order: 35 },
  { id: 'prod-route', label: '工艺路线', group: '生产与质量', path: '/production/routes', frequency: 25, visible: true, order: 36 },
  { id: 'prod-mrp', label: 'MRP计划', group: '生产与质量', path: '/production/mrp', frequency: 33, visible: true, order: 37 },
  { id: 'prod-report', label: '生产报表', group: '生产与质量', path: '/production/report', frequency: 20, visible: true, order: 38 },
  { id: 'fin-invoice', label: '发票管理', group: '财务与报表', path: '/finance/invoices', frequency: 58, visible: true, order: 39 },
  { id: 'fin-payment', label: '付款计划', group: '财务与报表', path: '/finance/payments', frequency: 39, visible: true, order: 40 },
  { id: 'fin-entries', label: '会计分录', group: '财务与报表', path: '/finance/entries', frequency: 27, visible: true, order: 41 },
  { id: 'fin-trial', label: '科目余额表', group: '财务与报表', path: '/finance/trial-balance', frequency: 12, visible: true, order: 42 },
  { id: 'fin-report', label: '财务报表', group: '财务与报表', path: '/finance/report', frequency: 24, visible: true, order: 43 },
  { id: 'fin-tax', label: '税务核算', group: '财务与报表', path: '/finance/tax', frequency: 17, visible: true, order: 44 },
  { id: 'fin-project', label: '项目核算', group: '财务与报表', path: '/finance/project-accounting', frequency: 13, visible: true, order: 45 },
  { id: 'reports', label: '报表中心', group: '财务与报表', path: '/reports', frequency: 35, visible: true, order: 46 },
  { id: 'settings', label: '系统设置', group: '系统', path: '/settings', frequency: 22, visible: true, order: 47 },
  { id: 'vendor-portal', label: '供应商门户', group: '系统', path: '/vendor-portal/login', frequency: 30, visible: true, order: 48 },
];

const MenuConfigTab: React.FC = () => {
  const menuConfig = useSettingsStore((s) => s.menuConfig);
  const setMenuConfig = useSettingsStore((s) => s.setMenuConfig);

  // 首次进入：若 store 中尚无菜单配置（首启动 / 迁移前），用默认菜单播种到 store
  useEffect(() => {
    if (!menuConfig.order || Object.keys(menuConfig.order).length === 0) {
      const order: Record<string, number> = {};
      const visible: Record<string, boolean> = {};
      defaultMenu.forEach((m, i) => { order[m.path] = i + 1; visible[m.path] = true; });
      setMenuConfig({ order, visible });
    }
    // 仅在 store 尚未播种时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [menu, setMenu] = useState<MenuEntry[]>(() => {
    const order = menuConfig.order || {};
    const visible = menuConfig.visible || {};
    return [...defaultMenu]
      .map((m) => ({ ...m, visible: visible[m.path] ?? m.visible }))
      .sort((a, b) => (order[a.path] ?? a.order) - (order[b.path] ?? b.order));
  });

  const [sortByFreq, setSortByFreq] = useState(false);

  const sortedMenu = useMemo(() => {
    if (sortByFreq) {
      return [...menu].sort((a, b) => b.frequency - a.frequency);
    }
    return menu;
  }, [menu, sortByFreq]);

  const groups = useMemo(() => {
    const map = new Map<string, MenuEntry[]>();
    sortedMenu.forEach(m => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    });
    return Array.from(map.entries());
  }, [sortedMenu]);

  const moveItem = (id: string, direction: 'up' | 'down') => {
    setMenu(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(m => m.id === id);
      if (idx < 0) return arr;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return arr;
      [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
      return arr;
    });
  };

  const toggleVisible = (id: string) => {
    setMenu(prev => prev.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
  };

  const handleSave = () => {
    const orderMap: Record<string, number> = {};
    const visibleMap: Record<string, boolean> = {};
    menu.forEach((m, i) => { orderMap[m.path] = i + 1; visibleMap[m.path] = m.visible; });
    setMenuConfig({ order: orderMap, visible: visibleMap });
  };

  const handleSortByFreq = () => {
    if (!sortByFreq) {
      // Apply frequency sort permanently
      setMenu(prev => [...prev].sort((a, b) => b.frequency - a.frequency));
    }
    setSortByFreq(!sortByFreq);
  };

  const handleReset = () => {
    const orderMap: Record<string, number> = {};
    const visibleMap: Record<string, boolean> = {};
    defaultMenu.forEach((m, i) => { orderMap[m.path] = i + 1; visibleMap[m.path] = true; });
    setMenuConfig({ order: orderMap, visible: visibleMap });
    setMenu(defaultMenu);
    setSortByFreq(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>菜单配置</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<TrendingUp />} variant={sortByFreq ? 'contained' : 'outlined'}
            onClick={handleSortByFreq}>
            {sortByFreq ? '频率排序已启' : '按使用频率排序'}
          </Button>
          <Button size="small" startIcon={<Refresh />} variant="outlined" onClick={handleReset}>恢复默认</Button>
          <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSave}>保存排序</Button>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: '0.8125rem' }}>
        拖拽调整菜单顺序：使用 ↑↓ 按钮上下移动。隐藏不需要的菜单项。点击「按使用频率排序」可自动按访问频次重排。
        保存后刷新页面即可在侧边栏看到新的菜单顺序。
      </Alert>

      {groups.map(([groupName, items]) => (
        <Paper key={groupName} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#475569' }}>{groupName}</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 40 }}>排序</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>菜单项</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 120 }}>路由</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 80, textAlign: 'center' }}>访问频率</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 60, textAlign: 'center' }}>可见</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id} hover sx={{ opacity: item.visible ? 1 : 0.4 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <IconButton size="small" onClick={() => moveItem(item.id, 'up')}
                          disabled={idx === 0 || sortByFreq} sx={{ p: 0 }}>
                          <KeyboardArrowUp fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => moveItem(item.id, 'down')}
                          disabled={idx === items.length - 1 || sortByFreq} sx={{ p: 0 }}>
                          <KeyboardArrowDown fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{item.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        {item.path}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${item.frequency}次`}
                        size="small"
                        color={item.frequency >= 80 ? 'error' : item.frequency >= 40 ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch size="small" checked={item.visible} onChange={() => toggleVisible(item.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
};

export default MenuConfigTab;
