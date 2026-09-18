import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, Avatar, Button, Tabs, Tab, LinearProgress,
  IconButton, Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Inventory2, People, LocalShipping, Warning, FactCheck,
  PrecisionManufacturing, AccountBalance, ArrowForwardIos,
  FiberManualRecord, Add, Assignment, Receipt, QueryStats,
  Inventory, RefreshOutlined, TrendingUp, TrendingDown,
  ShoppingCart, PointOfSale, VerifiedUser, Engineering,
  RateReview, TaskAlt, ReportProblem, GroupAdd,
  MoveToInbox, Outbox, CalendarMonth, Assessment,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import KPICard from './components/KPICard';
import { useMaterialStore } from '@/stores/materialStore';
import { useVendorStore } from '@/stores/vendorStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useProductionStore } from '@/stores/productionStore';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useOrgStore } from '@/stores/orgStore';

// ──────────────────────────────────────────
// 简洁审批卡片
// ──────────────────────────────────────────
const ApprovalCard: React.FC<{ item: { id: string; type: string; title: string; from: string; time: string; urgent: boolean } }> = ({ item }) => (
  <Box sx={{
    p: 1.5, borderRadius: 2,
    border: `1px solid ${item.urgent ? 'rgba(239,68,68,.25)' : 'rgba(226,232,240,.8)'}`,
    bgcolor: item.urgent ? 'rgba(239,68,68,.03)' : '#fff',
    mb: 1,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Chip
        label={item.type}
        size="small"
        sx={{ fontSize: '0.65rem', bgcolor: item.urgent ? '#FEE2E2' : '#EFF6FF', color: item.urgent ? '#d32f2f' : '#3B82F6' }}
      />
      {item.urgent && <Chip label="紧急" size="small" sx={{ fontSize: '0.6rem', bgcolor: '#FEE2E2', color: '#d32f2f' }} />}
    </Box>
    <Typography variant="body2" fontWeight={500} sx={{ mt: 0.8, mb: 0.4 }}>{item.title}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="caption" sx={{ color: '#94A3B8' }}>提交人：{item.from} · {item.time}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size="small" variant="outlined" color="success" sx={{ fontSize: '0.7rem', py: 0.2, px: 1, minWidth: 0 }}>通过</Button>
        <Button size="small" variant="outlined" color="error" sx={{ fontSize: '0.7rem', py: 0.2, px: 1, minWidth: 0 }}>拒绝</Button>
      </Box>
    </Box>
  </Box>
);

interface KPIItem {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  color: string;
  path: string;
  isCurrency?: boolean;
  isPercent?: boolean;
}

// ──────────────────────────────────────────
// Dashboard 主体
// ──────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [bottomTab, setBottomTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ── Store 数据 ──
  const materials = useMaterialStore(s => s.materials);
  const vendors = useVendorStore(s => s.vendors);
  const purchaseRequests = usePurchaseStore(s => s.purchaseRequests);
  const purchaseOrders = usePurchaseStore(s => s.purchaseOrders);
  const inboundOrders = useWarehouseStore(s => s.inboundOrders);
  const outboundOrders = useWarehouseStore(s => s.outboundOrders);
  const inventoryAlerts = useWarehouseStore(s => s.inventoryAlerts);
  const inspectionTasks = useQualityStore(s => s.inspectionTasks);
  const unqualifiedItems = useQualityStore(s => s.unqualifiedItems);
  const workOrders = useProductionStore(s => s.workOrders);
  const salesOrders = useSalesStore(s => s.salesOrders);
  const customers = useCustomerStore(s => s.customers);
  const vouchers = useFinanceStore(s => s.vouchers);
  const currentOrgId = useOrgStore(s => s.currentOrgId);

  const todayStr = new Date().toISOString().slice(0, 7);

  // ── KPI 实时计算 ──
  const kpiData: KPIItem[] = useMemo(() => {
    const monthInbound = inboundOrders.filter(o => o.inboundDate?.startsWith(todayStr)).length;
    const monthOutbound = outboundOrders.filter(o => o.outboundDate?.startsWith(todayStr)).length;
    const monthSalesOrders = salesOrders.filter(o => o.orderDate?.startsWith(todayStr));
    const monthSalesAmount = monthSalesOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);

    const nowDate = new Date().toISOString().slice(0, 10);
    const overdueOrders = purchaseOrders.filter(o =>
      o.expectedDeliveryDate < nowDate &&
      !['received', 'closed', 'cancelled'].includes(o.status)
    ).length;

    const completedWO = workOrders.filter(w => w.status === 'completed').length;
    const totalWO = workOrders.length || 1;
    const completionRate = Math.round((completedWO / totalWO) * 100);

    const passedInsp = inspectionTasks.filter(t => t.status === 'passed').length;
    const totalInsp = inspectionTasks.length || 1;
    const inspectionRate = Math.round((passedInsp / totalInsp) * 100);

    const pendingInvoices = vouchers.filter(v => v.source === 'invoice' && v.status !== 'posted').length;

    return [
      { title: '物料总数', value: materials.length, icon: <Inventory2 />, trend: { value: 12, direction: 'up' }, color: '#3B82F6', path: '/material/list' },
      { title: '供应商数', value: vendors.length, icon: <People />, trend: { value: 5, direction: 'up' }, color: '#10B981', path: '/vendor/list' },
      { title: '在途采购', value: purchaseOrders.filter(o => ['created', 'sent', 'confirmed', 'vendorConfirmed'].includes(o.status)).length, icon: <LocalShipping />, trend: { value: 3, direction: 'down' }, color: '#F59E0B', path: '/purchase/orders' },
      { title: '库存预警', value: inventoryAlerts.length, icon: <Warning />, trend: { value: 2, direction: 'up' }, color: '#EF4444', path: '/warehouse/inventory' },
      { title: '检验任务', value: inspectionTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length, icon: <FactCheck />, trend: { value: 1, direction: 'up' }, color: '#9C27B0', path: '/quality/inspection' },
      { title: '在制工单', value: workOrders.filter(w => w.status === 'in_progress').length, icon: <PrecisionManufacturing />, trend: { value: 0, direction: 'up' }, color: '#FF5722', path: '/production/orders' },
      { title: '待付发票', value: pendingInvoices, icon: <AccountBalance />, trend: { value: 1, direction: 'up' }, color: '#607D8B', path: '/finance/invoices' },
      { title: '逾期付款', value: vouchers.filter(v => v.date < nowDate && v.status !== 'posted').length, icon: <Warning />, trend: { value: 1, direction: 'up' }, color: '#d32f2f', path: '/finance/payments' },
      { title: '采购申请数', value: purchaseRequests.length, icon: <RateReview />, trend: { value: 8, direction: 'up' }, color: '#6366F1', path: '/purchase/list' },
      { title: '采购订单数', value: purchaseOrders.length, icon: <ShoppingCart />, trend: { value: 5, direction: 'up' }, color: '#14B8A6', path: '/purchase/orders' },
      { title: '逾期订单数', value: overdueOrders, icon: <ReportProblem />, trend: { value: overdueOrders, direction: 'down' }, color: '#E11D48', path: '/purchase/orders' },
      { title: '月入库量', value: monthInbound, icon: <MoveToInbox />, trend: { value: 15, direction: 'up' }, color: '#06B6D4', path: '/warehouse/inbound' },
      { title: '出库量', value: monthOutbound, icon: <Outbox />, trend: { value: 10, direction: 'up' }, color: '#84CC16', path: '/warehouse/outbound' },
      { title: '销售订单数', value: salesOrders.length, icon: <PointOfSale />, trend: { value: 6, direction: 'up' }, color: '#D946EF', path: '/sales/orders' },
      { title: '月销售额', value: monthSalesAmount, icon: <Assessment />, trend: { value: 12, direction: 'up' }, color: '#0EA5E9', path: '/sales/orders', isCurrency: true },
      { title: '生产工单数', value: totalWO, icon: <Engineering />, trend: { value: 3, direction: 'up' }, color: '#FB923C', path: '/production/orders' },
      { title: '完工率', value: completionRate, icon: <TaskAlt />, trend: { value: completionRate, direction: 'up' }, color: '#22C55E', path: '/production/orders', isPercent: true },
      { title: '检验合格率', value: inspectionRate, icon: <VerifiedUser />, trend: { value: inspectionRate, direction: 'up' }, color: '#3B82F6', path: '/quality/inspection', isPercent: true },
      { title: 'NCR数量', value: unqualifiedItems.length, icon: <ReportProblem />, trend: { value: unqualifiedItems.length, direction: 'down' }, color: '#EF4444', path: '/quality/report' },
      { title: '客户数量', value: customers.length, icon: <GroupAdd />, trend: { value: 4, direction: 'up' }, color: '#A855F7', path: '/sales/customers' },
    ];
  }, [materials, vendors, purchaseRequests, purchaseOrders, inboundOrders, outboundOrders,
      inventoryAlerts, inspectionTasks, unqualifiedItems, workOrders, salesOrders,
      customers, vouchers, todayStr]);

  // ── Mock 审批 / 待办 / 动态 ──
  const approvalTasks = [
    { id: 'APP-001', type: '供应商准入', title: '武汉钢铁贸易有限公司', from: '张三', time: '2小时前', urgent: true },
    { id: 'APP-002', type: '采购申请', title: '热轧钢板 Q235B × 50吨', from: '李四', time: '3小时前', urgent: true },
    { id: 'APP-003', type: '付款审批', title: 'PMT-2024-0440 广东南方钢铁', from: '王五', time: '昨天', urgent: false },
  ];
  const pendingTasks = [
    { type: '质检', title: 'IQC-2024-0512：宝钢钢板来料检验', priority: 'high', color: '#EF4444', path: '/quality/inspection' },
    { type: '付款', title: 'PMT-2024-0440：广东南方钢铁逾期付款', priority: 'urgent', color: '#d32f2f', path: '/finance/payments' },
    { type: '采购', title: 'MRP建议：热轧钢板Q235B库存告急', priority: 'urgent', color: '#FF5722', path: '/production/mrp' },
    { type: '审核', title: '供应商准入审核：武汉钢铁贸易有限公司', priority: 'normal', color: '#F59E0B', path: '/vendor/approvals' },
    { type: '盘点', title: '6月月度仓库盘点任务待启动', priority: 'normal', color: '#2196F3', path: '/warehouse/check' },
  ];
  const recentActivities = [
    { time: '10分钟前', desc: '工单 WO-2024-0501 组焊工序已开始', module: '生产', color: '#FF5722' },
    { time: '35分钟前', desc: '发票 INV-2024-0501 已完成验证', module: '财务', color: '#4CAF50' },
    { time: '1小时前', desc: 'BOM-2024-001 成本卷积已更新', module: 'BOM', color: '#9C27B0' },
    { time: '2小时前', desc: '供应商 宝钢股份 评级更新为 A+', module: '供应商', color: '#2196F3' },
    { time: '昨天', desc: 'PDCA-2024-003 改进计划已关闭', module: '质量', color: '#FF9800' },
  ];
  const quickEntries = [
    { label: '新建采购申请', icon: <Add sx={{ fontSize: 18 }} />, color: '#3B82F6', path: '/purchase/create' },
    { label: '创建工单', icon: <Assignment sx={{ fontSize: 18 }} />, color: '#FF5722', path: '/production/orders' },
    { label: '发票登记', icon: <Receipt sx={{ fontSize: 18 }} />, color: '#10B981', path: '/finance/invoices' },
    { label: '库存查询', icon: <Inventory sx={{ fontSize: 18 }} />, color: '#F59E0B', path: '/warehouse/inventory' },
    { label: '质量报表', icon: <QueryStats sx={{ fontSize: 18 }} />, color: '#9C27B0', path: '/quality/report' },
    { label: '生产报表', icon: <QueryStats sx={{ fontSize: 18 }} />, color: '#607D8B', path: '/production/report' },
    { label: '合并报表', icon: <AccountBalance sx={{ fontSize: 18 }} />, color: '#6366F1', path: '/finance/consolidated' },
    { label: 'ChatBI 分析', icon: <Assessment sx={{ fontSize: 18 }} />, color: '#8B5CF6', path: '/analytics/chatbi' },
  ];

  // ── 图表数据 ──
  const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
  const monthlyPurchase = [280000, 220000, 380000, 420000, 338156, 410000];
  const monthlyQualityRate = [95.2, 96.8, 94.5, 97.1, 96.3, 97.8];
  const inventoryDist = [
    { id: 0, value: 45, label: '原材料', color: '#3B82F6' },
    { id: 1, value: 25, label: '半成品', color: '#10B981' },
    { id: 2, value: 20, label: '成品', color: '#F59E0B' },
    { id: 3, value: 10, label: '辅料', color: '#8B5CF6' },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <Box>
      {/* ── 页头 ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '1.5rem', letterSpacing: '-0.025em' }}>
            工作台
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.2 }}>
            2026年6月23日 星期二 · 数据更新于 17:07
          </Typography>
        </Box>
        <Tooltip title="刷新数据">
          <IconButton size="small" onClick={handleRefresh} sx={{ color: '#94A3B8' }}>
            <RefreshOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {refreshing && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}

      {/* ── 快捷入口 ── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#94A3B8', letterSpacing: '.06em', textTransform: 'uppercase', fontSize: '0.6875rem', mb: 1, display: 'block' }}>
          快捷入口
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickEntries.map((e) => (
            <Button
              key={e.label}
              size="small"
              startIcon={e.icon}
              onClick={() => navigate(e.path)}
              sx={{
                bgcolor: `${e.color}10`,
                color: e.color,
                border: `1px solid ${e.color}30`,
                borderRadius: 2,
                fontSize: '0.75rem',
                px: 1.5,
                '&:hover': { bgcolor: `${e.color}20` },
              }}
            >
              {e.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* ── KPI 卡片 ── */}
      <Box sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#94A3B8', letterSpacing: '.06em', textTransform: 'uppercase', fontSize: '0.6875rem', mb: 1, display: 'block' }}>
          核心指标
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiData.map((kpi) => (
          <Grid item xs={6} sm={4} md={3} key={kpi.title}
            onClick={() => navigate(kpi.path)}
            sx={{ cursor: 'pointer' }}
          >
            <KPICard
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              trend={kpi.trend}
              color={kpi.color}
              suffix={kpi.isPercent ? '%' : undefined}
              formatCurrency={kpi.isCurrency}
            />
          </Grid>
        ))}
      </Grid>

      {/* ── 图表行 ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>月度采购金额趋势</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#10B981', fontSize: '0.75rem' }}>
                <TrendingUp sx={{ fontSize: 14 }} />21.4%
              </Box>
            </Box>
            <BarChart
              series={[{ data: monthlyPurchase, label: '采购金额(元)', color: '#3B82F6' }]}
              xAxis={[{ scaleType: 'band', data: months }]}
              height={200}
              margin={{ top: 10, bottom: 30, left: 75, right: 10 }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>月度质量合格率（%）</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#10B981', fontSize: '0.75rem' }}>
                <TrendingUp sx={{ fontSize: 14 }} />1.5%
              </Box>
            </Box>
            <LineChart
              series={[{ data: monthlyQualityRate, label: '合格率', color: '#10B981', area: true }]}
              xAxis={[{ scaleType: 'band', data: months }]}
              yAxis={[{ min: 90, max: 100 }]}
              height={200}
              margin={{ top: 10, bottom: 30, left: 50, right: 10 }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>库存结构</Typography>
            <PieChart
              series={[{ data: inventoryDist, innerRadius: 42, outerRadius: 76, paddingAngle: 3, cornerRadius: 4 }]}
              height={200}
              margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {inventoryDist.map(d => (
                <Chip key={d.label} size="small" label={`${d.label} ${d.value}%`}
                  sx={{ fontSize: '0.65rem', bgcolor: `${d.color}15`, color: d.color, height: 20 }} />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── 下方三栏：审批 + 待办 + 动态 ── */}
      <Grid container spacing={2}>
        {/* 审批待办 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                待我审批
                <Chip label={approvalTasks.length} size="small" color="error" sx={{ ml: 1 }} />
              </Typography>
              <Typography variant="caption" sx={{ color: '#3B82F6', cursor: 'pointer' }}>全部</Typography>
            </Box>
            {approvalTasks.map((t) => (
              <ApprovalCard key={t.id} item={t} />
            ))}
          </Paper>
        </Grid>

        {/* 待办事项 + 最近动态 Tab */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Tabs
              value={bottomTab}
              onChange={(_, v) => setBottomTab(v)}
              sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
            >
              <Tab label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  待办事项
                  <Chip label={pendingTasks.length} size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }} />
                </Box>
              } />
              <Tab label="最近动态" />
            </Tabs>
            <Divider sx={{ mb: 1.5 }} />

            {bottomTab === 0 && (
              <List dense disablePadding>
                {pendingTasks.map((task, idx) => (
                  <React.Fragment key={idx}>
                    <ListItem
                      disablePadding
                      sx={{ py: 0.8, cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'grey.50' }, px: 1 }}
                      onClick={() => navigate(task.path)}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar sx={{
                          width: 26, height: 26, bgcolor: `${task.color}22`,
                          fontSize: '0.6rem', color: task.color, fontWeight: 700,
                        }}>
                          {task.type}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: task.priority === 'urgent' ? 600 : 400 }}
                      />
                      <ArrowForwardIos sx={{ fontSize: 12, color: 'text.disabled' }} />
                    </ListItem>
                    {idx < pendingTasks.length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}

            {bottomTab === 1 && (
              <List dense disablePadding>
                {recentActivities.map((act, idx) => (
                  <React.Fragment key={idx}>
                    <ListItem disablePadding sx={{ py: 0.8, px: 1 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <FiberManualRecord sx={{ fontSize: 10, color: act.color }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={act.desc}
                        secondary={act.time}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Chip
                        label={act.module}
                        size="small"
                        sx={{ fontSize: '0.6rem', bgcolor: `${act.color}15`, color: act.color }}
                      />
                    </ListItem>
                    {idx < recentActivities.length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
