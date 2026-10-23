import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, Divider, List, ListItem,
  ListItemIcon, ListItemText, Avatar, Button, Tabs, Tab, LinearProgress,
  IconButton, Tooltip, Collapse,
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
  ExpandMore, ExpandLess,
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
  // 一页化：核心指标默认只显示前 8 个磁贴，其余折叠（点「展开更多」铺开），压缩纵向长度
  const [kpiExpanded, setKpiExpanded] = useState(false);

  // ── 数据健壮性守卫：各 store 切片在登录态水合中间态 / 后端异常帧下可能是非数组
  //    （null / undefined / 包裹对象）。统一用 asArr 归一化为数组，非数组降级为 []，
  //    保证下方 KPI 的 countTrend/amountTrend（对 rows 调 .filter）与待办/动态/图表
  //    绝不因某一份数据脏而白屏崩溃（对标 SAP/金蝶「数据异常降级、页面仍可用」纪律）。
  // 泛型以「整个数组」为单元（而非元素）：store 切片本就返回 T[]，若写成 <T>(x:T[]) 会把 T 推成 T[]，
  //   导致 asArr 返回 T[][]（嵌套），下游 .filter(o => o.xxx) 全部报「属性不存在于 T[]」。改为以数组本身为 A。
  const asArr = <A,>(x: A | null | undefined): A => (Array.isArray(x) ? x : ([] as unknown as A));

  // ── Store 数据（全部经 asArr 归一化）──
  const materials = asArr(useMaterialStore(s => s.materials));
  const vendors = asArr(useVendorStore(s => s.vendors));
  const purchaseRequests = asArr(usePurchaseStore(s => s.purchaseRequests));
  const purchaseOrders = asArr(usePurchaseStore(s => s.purchaseOrders));
  const inboundOrders = asArr(useWarehouseStore(s => s.inboundOrders));
  const outboundOrders = asArr(useWarehouseStore(s => s.outboundOrders));
  const inventoryAlerts = asArr(useWarehouseStore(s => s.inventoryAlerts));
  const inspectionTasks = asArr(useQualityStore(s => s.inspectionTasks));
  const unqualifiedItems = asArr(useQualityStore(s => s.unqualifiedItems));
  const workOrders = asArr(useProductionStore(s => s.workOrders));
  const salesOrders = asArr(useSalesStore(s => s.salesOrders));
  const customers = asArr(useCustomerStore(s => s.customers));
  const vouchers = asArr(useFinanceStore(s => s.vouchers));
  const currentOrgId = useOrgStore(s => s.currentOrgId);

  const todayStr = new Date().toISOString().slice(0, 7);

  // ── 月份工具：由当前月倒推真实月份，供环比与图表按月聚合使用（不再写死 1~6 月）──
  /** 取某月键（YYYY-MM）的上一月键 */
  const prevMonthKey = (mk: string): string => {
    const [y, m] = mk.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  /** 近 n 个月（含本月）的 [YYYY-MM, 标签] 列表 */
  const recentMonths = (n: number): { key: string; label: string }[] => {
    const out: { key: string; label: string }[] = [];
    const [y, m] = todayStr.split('-').map(Number);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      out.push({
        key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
        label: `${d.getUTCMonth() + 1}月`,
      });
    }
    return out;
  };
  /** 安全读取任意台账行的时间戳字段（不同实体更新时间字段命名不完全一致） */
  const rowTs = (row: unknown): string => {
    const r = row as { updatedAt?: string; createdAt?: string };
    return r.updatedAt || r.createdAt || '';
  };

  // ── KPI 实时计算 ──
  const kpiData: KPIItem[] = useMemo(() => {
    const prevMk = prevMonthKey(todayStr);
    /** 真实环比：按单据日期落在本月 vs 上月计数；算不出基数就不给趋势（不伪造数字） */
    const countTrend = (
      rows: any[],
      dateOf: (r: never) => string | undefined,
    ): { value: number; direction: 'up' | 'down' } | undefined => {
      const cur = rows.filter(r => (dateOf(r as never) || '').startsWith(todayStr)).length;
      const prev = rows.filter(r => (dateOf(r as never) || '').startsWith(prevMk)).length;
      if (!prev) return undefined;
      const delta = ((cur - prev) / prev) * 100;
      if (delta === 0) return undefined;
      return { value: Math.abs(Math.round(delta * 10) / 10), direction: delta > 0 ? 'up' : 'down' };
    };
    /** 金额环比（月销售额等） */
    const amountTrend = (
      rows: any[],
      dateOf: (r: never) => string | undefined,
      amountOf: (r: never) => number,
    ): { value: number; direction: 'up' | 'down' } | undefined => {
      const sumOf = (mk: string): number => rows
        .filter(r => (dateOf(r as never) || '').startsWith(mk))
        .reduce((s: number, r) => s + (amountOf(r as never) || 0), 0);
      const cur = sumOf(todayStr);
      const prev = sumOf(prevMk);
      if (!prev) return undefined;
      const delta = ((cur - prev) / prev) * 100;
      if (delta === 0) return undefined;
      return { value: Math.abs(Math.round(delta * 10) / 10), direction: delta > 0 ? 'up' : 'down' };
    };

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

    const poRows = purchaseOrders as unknown[];
    const salesRows = salesOrders as unknown[];
    const poTrend = countTrend(poRows, (r: never) => (r as { orderDate?: string }).orderDate);
    const salesTrend = countTrend(salesRows, (r: never) => (r as { orderDate?: string }).orderDate);
    const reqTrend = countTrend(purchaseRequests as unknown[], (r: never) => (r as { createdAt?: string }).createdAt);
    const woTrend = countTrend(workOrders as unknown[], (r: never) => (r as { createdAt?: string }).createdAt);
    const salesAmountTrend = amountTrend(
      salesRows,
      (r: never) => (r as { orderDate?: string }).orderDate,
      (r: never) => (r as { grandTotal?: number; totalAmount?: number }).grandTotal
        || (r as { totalAmount?: number }).totalAmount
        || 0,
    );
    const inboundTrend = countTrend(inboundOrders as unknown[], (r: never) => (r as { inboundDate?: string }).inboundDate);
    const outboundTrend = countTrend(outboundOrders as unknown[], (r: never) => (r as { outboundDate?: string }).outboundDate);

    return [
      { title: '物料总数', value: materials.length, icon: <Inventory2 />, color: '#3B82F6', path: '/material/list' },
      { title: '供应商数', value: vendors.length, icon: <People />, color: '#10B981', path: '/vendor/list' },
      { title: '在途采购', value: purchaseOrders.filter(o => ['created', 'sent', 'confirmed', 'vendorConfirmed'].includes(o.status)).length, icon: <LocalShipping />, trend: poTrend, color: '#F59E0B', path: '/purchase/orders' },
      { title: '库存预警', value: inventoryAlerts.length, icon: <Warning />, color: '#EF4444', path: '/warehouse/inventory' },
      { title: '检验任务', value: inspectionTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length, icon: <FactCheck />, color: '#9C27B0', path: '/quality/inspection' },
      { title: '在制工单', value: workOrders.filter(w => w.status === 'in_progress').length, icon: <PrecisionManufacturing />, trend: woTrend, color: '#FF5722', path: '/production/orders' },
      { title: '待付发票', value: pendingInvoices, icon: <AccountBalance />, color: '#607D8B', path: '/finance/invoices' },
      { title: '逾期付款', value: vouchers.filter(v => v.date < nowDate && v.status !== 'posted').length, icon: <Warning />, color: '#d32f2f', path: '/finance/payments' },
      { title: '采购申请数', value: purchaseRequests.length, icon: <RateReview />, trend: reqTrend, color: '#6366F1', path: '/purchase/requests' },
      { title: '采购订单数', value: purchaseOrders.length, icon: <ShoppingCart />, trend: poTrend, color: '#14B8A6', path: '/purchase/orders' },
      { title: '逾期订单数', value: overdueOrders, icon: <ReportProblem />, color: '#E11D48', path: '/purchase/orders' },
      { title: '月入库量', value: monthInbound, icon: <MoveToInbox />, trend: inboundTrend, color: '#06B6D4', path: '/warehouse/inbound' },
      { title: '出库量', value: monthOutbound, icon: <Outbox />, trend: outboundTrend, color: '#84CC16', path: '/warehouse/outbound' },
      { title: '销售订单数', value: salesOrders.length, icon: <PointOfSale />, trend: salesTrend, color: '#D946EF', path: '/sales/orders' },
      { title: '月销售额', value: monthSalesAmount, icon: <Assessment />, trend: salesAmountTrend, color: '#0EA5E9', path: '/sales/orders', isCurrency: true },
      { title: '生产工单数', value: totalWO, icon: <Engineering />, trend: woTrend, color: '#FB923C', path: '/production/orders' },
      { title: '完工率', value: completionRate, icon: <TaskAlt />, color: '#22C55E', path: '/production/orders', isPercent: true },
      { title: '检验合格率', value: inspectionRate, icon: <VerifiedUser />, color: '#3B82F6', path: '/quality/inspection', isPercent: true },
      { title: 'NCR数量', value: unqualifiedItems.length, icon: <ReportProblem />, color: '#EF4444', path: '/quality/report' },
      { title: '客户数量', value: customers.length, icon: <GroupAdd />, color: '#A855F7', path: '/sales/customers' },
    ];
  }, [materials, vendors, purchaseRequests, purchaseOrders, inboundOrders, outboundOrders,
      inventoryAlerts, inspectionTasks, unqualifiedItems, workOrders, salesOrders,
      customers, vouchers, todayStr]);

  // 一页化：默认只显示前 8 个核心磁贴（kpiData 已按重要性排过序），其余折叠
  const kpiShown = kpiExpanded ? kpiData.length : 8;

  // ── 待我审批 / 待办事项 / 最近动态：全部由真实台账推导（原为写死演示数组）──
  const nowDate = new Date().toISOString().slice(0, 10);

  /** 把时间戳转成「几分钟/几小时/几天前」；无法解析时原样显示日期 */
  const humanizeTs = (ts: string): string => {
    if (!ts) return '—';
    const t = new Date(ts.replace(' ', 'T')).getTime();
    if (Number.isNaN(t)) return ts.slice(0, 10);
    const diff = Date.now() - t;
    if (diff < 0) return '刚刚';
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${Math.max(1, min)}分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}小时前`;
    const day = Math.floor(hr / 24);
    return day === 1 ? '昨天' : `${day}天前`;
  };

  // 待我审批：取真实的待审批单据（待审采购申请 + 待处理检验任务 + 待处置不合格品）
  const approvalTasks = useMemo(() => {
    const list: { id: string; type: string; title: string; from: string; time: string; urgent: boolean }[] = [];
    purchaseRequests.filter(r => r.status === 'pending').forEach(r => list.push({
      id: r.id, type: '采购申请',
      title: `${r.requestNo}：${r.title || r.department || '采购申请'}`,
      from: r.applicant || '-', time: humanizeTs(rowTs(r)), urgent: r.priority === 'urgent',
    }));
    inspectionTasks
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .forEach(t => list.push({
        id: t.id, type: '来料检验',
        title: `${t.taskNo}：${t.materialName || t.materialCode} ${t.batchNo ? `批次 ${t.batchNo}` : ''}`.trim(),
        from: t.assignedTo || t.vendorName || '-', time: humanizeTs(t.plannedDate),
        urgent: !!t.plannedDate && t.plannedDate <= nowDate,
      }));
    unqualifiedItems.filter(u => u.dispositionStatus !== 'completed').forEach(u => list.push({
      id: u.id, type: '不合格品处置',
      title: `${u.itemNo}：${u.materialName || u.materialCode} 不合格 ${u.defectQuantity || 0} 件`,
      from: u.responsiblePerson || '-', time: humanizeTs(rowTs(u)),
      urgent: u.dispositionStatus === 'pending',
    }));
    return list.sort((a, b) => Number(b.urgent) - Number(a.urgent)).slice(0, 20);
  }, [purchaseRequests, inspectionTasks, unqualifiedItems, nowDate]);

  // 待办事项：仍需我处理且未完成的事项（执行侧）
  const pendingTasks = useMemo(() => {
    const list: { type: string; title: string; priority: 'urgent' | 'high' | 'normal'; color: string; path: string }[] = [];
    inspectionTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').forEach(t => list.push({
      type: '质检', title: `${t.taskNo}：${t.materialName || t.materialCode} 待检验`,
      priority: !!t.plannedDate && t.plannedDate <= nowDate ? 'urgent' : 'high',
      color: '#EF4444', path: '/quality/inspection',
    }));
    purchaseRequests.filter(r => r.status === 'draft').forEach(r => list.push({
      type: '采购', title: `${r.requestNo}：${r.title || '采购申请待提交'}`,
      priority: r.priority === 'urgent' ? 'urgent' : 'normal', color: '#FF5722', path: '/purchase/requests',
    }));
    purchaseOrders
      .filter(o => ['created', 'sent', 'vendorConfirmed', 'confirmed', 'partial'].includes(o.status))
      .forEach(o => list.push({
        type: '催货', title: `${o.orderNo}：${o.vendorName || '供应商'} 交期 ${o.expectedDeliveryDate || '未定'}`,
        priority: !!o.expectedDeliveryDate && o.expectedDeliveryDate < nowDate ? 'urgent' : 'normal',
        color: '#d32f2f', path: '/purchase/orders',
      }));
    unqualifiedItems.filter(u => u.dispositionStatus !== 'completed').forEach(u => list.push({
      type: '处置', title: `${u.itemNo}：${u.materialName || u.materialCode} 待处置`,
      priority: u.dispositionStatus === 'pending' ? 'urgent' : 'high', color: '#F59E0B', path: '/quality/unqualified',
    }));
    return list.slice(0, 20);
  }, [inspectionTasks, purchaseRequests, purchaseOrders, unqualifiedItems, nowDate]);

  // 最近动态：各台账最近更新的真实记录（按时间倒序）
  const recentActivities = useMemo(() => {
    const rows: { ts: string; desc: string; module: string; color: string }[] = [];
    const push = (ts: string, desc: string, module: string, color: string) => {
      if (ts) rows.push({ ts, desc, module, color });
    };
    purchaseOrders.forEach(o => push(rowTs(o), `采购订单 ${o.orderNo}（${o.status}）`, '采购', '#2196F3'));
    salesOrders.forEach(o => push(rowTs(o), `销售订单 ${o.orderNo}（${o.status}）`, '销售', '#D946EF'));
    workOrders.forEach(o => push(rowTs(o), `生产工单 ${o.orderNo}（${o.status}）`, '生产', '#FF5722'));
    inspectionTasks.forEach(t => push(rowTs(t), `检验任务 ${t.taskNo}（${t.status}）`, '质量', '#FF9800'));
    vouchers.forEach(v => push(rowTs(v), `凭证 ${v.voucherNo}（${v.status}）`, '财务', '#4CAF50'));
    return rows
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, 20)
      .map(r => ({ time: humanizeTs(r.ts), desc: r.desc, module: r.module, color: r.color }));
  }, [purchaseOrders, salesOrders, workOrders, inspectionTasks, vouchers]);
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

  // ── 图表数据：全部由真实台账按月聚合（原为写死演示数组）──
  const monthList = recentMonths(6);
  const months = monthList.map(m => m.label);
  // 月度采购金额：按采购订单下单日期归集，取价税合计（无数据月为 0，真实反映）
  const monthlyPurchase = monthList.map(({ key }) =>
    purchaseOrders
      .filter(o => !!o.orderDate && o.orderDate.startsWith(key))
      .reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0));
  // 月度检验合格率：按检验任务归集（完成日期优先，缺省用计划日期）；
  //   该月无已出结论的检验任务时留 null（图表断点），不伪造 0%
  const monthlyQualityRate = monthList.map(({ key }) => {
    const decided = inspectionTasks.filter(t => {
      const d = t.completedDate || t.plannedDate || '';
      if (!d.startsWith(key)) return false;
      return t.status === 'passed' || t.status === 'failed' || t.status === 'conditional_pass';
    });
    if (decided.length === 0) return null;
    const ok = decided.filter(t => t.status !== 'failed').length;
    return Math.round((ok / decided.length) * 1000) / 10;
  });
  // 库存结构：按物料类型统计在库数量占比
  const TYPE_META: Record<string, { label: string; color: string }> = {
    raw: { label: '原材料', color: '#3B82F6' },
    semi: { label: '半成品', color: '#10B981' },
    finished: { label: '成品', color: '#F59E0B' },
    purchased: { label: '外购物料', color: '#8B5CF6' },
    service: { label: '服务', color: '#94A3B8' },
  };
  const stockByType = new Map<string, number>();
  materials.forEach(m => {
    const k = m.materialType || 'raw';
    stockByType.set(k, (stockByType.get(k) || 0) + (m.currentStock || 0));
  });
  const totalStock = Array.from(stockByType.values()).reduce((s, v) => s + v, 0);
  const inventoryDist = Array.from(stockByType.entries())
    .filter(([, v]) => v > 0)
    .map(([k, v], idx) => ({
      id: idx,
      value: totalStock > 0 ? Math.round((v / totalStock) * 1000) / 10 : 0,
      label: TYPE_META[k]?.label || k,
      color: TYPE_META[k]?.color || '#64748B',
    }));

  /** 环比：取最近两个有值的点算变化率；无基数时返回空文本（不显示箭头） */
  const momText = (arr: (number | null)[]): { text: string; up: boolean } => {
    const pts = arr.filter((v): v is number => v !== null && v !== undefined);
    if (pts.length < 2) return { text: '', up: true };
    const cur = pts[pts.length - 1], prev = pts[pts.length - 2];
    if (!prev) return { text: '', up: true };
    const delta = ((cur - prev) / prev) * 100;
    return { text: `${delta >= 0 ? '+' : ''}${Math.round(delta * 10) / 10}%`, up: delta >= 0 };
  };
  const purchaseTrend = momText(monthlyPurchase);
  const qualityTrend = momText(monthlyQualityRate);

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
            {(() => {
              const now = new Date();
              const d = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
              const w = now.toLocaleDateString('zh-CN', { weekday: 'long' });
              const t = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
              return `${d} ${w} · 数据更新于 ${t}`;
            })()}
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

      {/* ── KPI 卡片（一页化：默认 8 磁贴一屏，其余折叠） ── */}
      <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#94A3B8', letterSpacing: '.06em', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
          核心指标
        </Typography>
        {kpiData.length > 8 && (
          <Button
            size="small"
            startIcon={kpiExpanded ? <ExpandLess sx={{ fontSize: 15 }} /> : <ExpandMore sx={{ fontSize: 15 }} />}
            onClick={() => setKpiExpanded((v) => !v)}
            sx={{ fontSize: '0.7rem', py: 0.25, color: '#64748B' }}
          >
            {kpiExpanded ? '收起指标' : `展开全部（${kpiData.length} 项）`}
          </Button>
        )}
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiData.slice(0, kpiShown).map((kpi) => (
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
              {purchaseTrend.text && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: purchaseTrend.up ? '#10B981' : '#EF4444', fontSize: '0.75rem' }}>
                  {purchaseTrend.up ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                  {purchaseTrend.text}
                </Box>
              )}
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
              {qualityTrend.text && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: qualityTrend.up ? '#10B981' : '#EF4444', fontSize: '0.75rem' }}>
                  {qualityTrend.up ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                  {qualityTrend.text}
                </Box>
              )}
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
