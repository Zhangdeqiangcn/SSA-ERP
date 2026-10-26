import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, Stack,
  Tooltip, LinearProgress, Grid,
} from '@mui/material';
import { Add, Visibility, LocalShipping, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useSalesStore } from '@/stores/salesStore';
import { SalesOrder, SalesOrderStatus, SalesOrderType } from '@/types';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, FlowTracker, SecureField, StatusBadge } from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { withRelatedDocNos } from '@/utils/relations/documentRelations';
import { buildRelatedColumns } from '@/components/common/relatedColumns';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';
import { formatCurrency } from '@/utils/format';
import { useCloudHydrating } from '@/stores/syncStatusStore';

const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  draft: '草稿', confirmed: '已确认', in_production: '生产中',
  partial_shipped: '部分发货', fully_shipped: '已发货', completed: '已完成', cancelled: '已取消',
};
// 销售订单状态 → 集中 statusConfig key（draft/completed/cancelled 复用通用 key）
const SO_STATUS_KEY: Record<SalesOrderStatus, string> = {
  draft: 'draft',
  confirmed: 'so_confirmed',
  in_production: 'so_in_production',
  partial_shipped: 'so_partial_shipped',
  fully_shipped: 'so_fully_shipped',
  completed: 'completed',
  cancelled: 'cancelled',
};

const SalesOrderList: React.FC = () => {
  const hydrating = useCloudHydrating();
  const navigate = useNavigate();
  useEnsureRelatedStores('salesOrder');
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const salesOrders = useSalesStore(s => s.salesOrders);
  const addSalesOrder = useSalesStore(s => s.addSalesOrder);

  // ── 嵌入式分析 ──
  const analytics = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthOrders = salesOrders.filter(o => o.orderDate?.startsWith(thisMonth));
    const monthAmount = monthOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);

    const last6Months: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = salesOrders
        .filter(o => o.orderDate?.startsWith(key))
        .reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);
      last6Months.push({ month: `${d.getMonth() + 1}月`, amount });
    }
    const maxAmt = Math.max(...last6Months.map(m => m.amount), 1);

    const custMap = new Map<string, number>();
    salesOrders.forEach(o => {
      const prev = custMap.get(o.customerName) || 0;
      custMap.set(o.customerName, prev + (o.grandTotal || o.totalAmount || 0));
    });
    const top5Customers = Array.from(custMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const top5Total = top5Customers.reduce((sum, [, v]) => sum + v, 0) || 1;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

    return { monthAmount, last6Months, maxAmt, top5Customers, top5Total, colors };
  }, [salesOrders]);

  // ── 列定义（驱动 DataTable）──
  const typeLabel = (t: SalesOrderType) => (t === 'standard' ? '标准' : t === 'sample' ? '样品' : '维修');
  const columns: ColumnDef<SalesOrder, unknown>[] = [
    {
      id: 'orderNo',
      header: '订单编号',
      meta: { searchable: true },
      accessorFn: (o) => o.orderNo,
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" color="#3B82F6" fontWeight={500}>
          {row.original.orderNo}
        </Typography>
      ),
    },
    {
      id: 'type',
      header: '类型',
      meta: { searchable: true },
      accessorFn: (o) => typeLabel(o.type),
      cell: ({ row }) => (
        <Chip label={typeLabel(row.original.type)} size="small" variant="outlined" />
      ),
    },
    {
      id: 'customerName',
      header: '客户',
      meta: { searchable: true },
      accessorFn: (o) => o.customerName,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <SecureField module="sales" fieldName="customerName">
            {o.customerId ? (
              <Box>
                <Typography
                  component="button"
                  variant="body2"
                  fontWeight={500}
                  onClick={() => navigate(`/sales/customers/${o.customerId}`)}
                  sx={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', p: 0, textAlign: 'left' }}
                  data-testid={`so-cust-${o.id}`}
                >
                  {o.customerName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">{o.contactName || o.customerCode || ''}</Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" fontWeight={500} data-testid={`so-cust-${o.id}`}>
                  {o.customerName}
                </Typography>
                <Typography variant="caption" color="text.secondary">{o.contactName}</Typography>
              </Box>
            )}
          </SecureField>
        );
      },
    },
    {
      id: 'projectName',
      header: '项目',
      meta: { searchable: true },
      accessorFn: (o) => o.projectName,
      cell: ({ row }) => {
        const o = row.original;
        return o.projectName ? (
          <Box>
            <Typography variant="body2">{o.projectName}</Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">{o.projectNo}</Typography>
          </Box>
        ) : '-';
      },
    },
    {
      id: 'contractNo',
      header: '关联合同',
      meta: { searchable: true },
      accessorFn: (o) => o.contractNo || '',
      cell: ({ row }) => {
        const o = row.original;
        return o.contractId ? (
          <Typography
            component="button"
            variant="body2"
            onClick={() => navigate(`/sales/contracts/${o.contractId}`)}
            sx={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', p: 0, textAlign: 'left', fontFamily: 'monospace' }}
          >
            {o.contractNo}
          </Typography>
        ) : '-';
      },
    },
    {
      id: 'salesPerson',
      header: '销售员',
      meta: { searchable: true },
      accessorFn: (o) => o.salesPerson,
      cell: ({ row }) => <Typography variant="body2">{row.original.salesPerson}</Typography>,
    },
    {
      id: 'totalAmount',
      header: '不含税金额',
      accessorFn: (o) => o.totalAmount,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <SecureField module="sales" fieldName="orderAmount">
            <Typography variant="body2" fontWeight={500} data-testid={`so-amount-${row.original.id}`}>
              {formatCurrency(row.original.totalAmount)}
            </Typography>
          </SecureField>
        </Box>
      ),
    },
    {
      id: 'grandTotal',
      header: '含税总额',
      accessorFn: (o) => o.grandTotal,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <SecureField module="sales" fieldName="orderAmount">
            <Typography variant="body2" data-testid={`so-grand-${row.original.id}`}>
              {formatCurrency(row.original.grandTotal)}
            </Typography>
          </SecureField>
        </Box>
      ),
    },
    {
      id: 'orderDate',
      header: '订单日期',
      meta: { searchable: true },
      accessorFn: (o) => o.orderDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.orderDate}</Typography>,
    },
    {
      id: 'expectedDeliveryDate',
      header: '预计交期',
      meta: { searchable: true },
      accessorFn: (o) => o.expectedDeliveryDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.expectedDeliveryDate}</Typography>,
    },
    {
      id: 'status',
      header: '状态',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      },
      accessorFn: (o) => STATUS_LABELS[o.status],
      cell: ({ row }) => <StatusBadge status={SO_STATUS_KEY[row.original.status]} />,
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <Tooltip title="查看详情">
              <IconButton size="small" onClick={() => navigate(`/sales/orders/${o.id}`)}>
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            {o.status !== 'fully_shipped' && o.status !== 'completed' && (
              <Tooltip title="发货管理">
                <IconButton size="small" onClick={() => navigate('/sales/logistics')}>
                  <LocalShipping fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    ...(buildRelatedColumns() as ColumnDef<SalesOrder, unknown>[]),
  ];

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filtered = useMemo(
    () => applyColumnFilters(withRelatedDocNos('salesOrder', salesOrders), columns, filterData, { module: 'sales' }),
    [salesOrders, columns, filterData]
  );

  // ── 导入：把表头行映射回 store 字段 ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const toNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r: Record<string, string>, headers: string[]): SalesOrder => {
    const now = new Date().toISOString();
    const statusVal = pickField(r, headers, '状态', 'status') || 'draft';
    const typeValRaw = pickField(r, headers, '类型', 'type');
    const typeVal: SalesOrderType = typeValRaw === '样品' ? 'sample' : typeValRaw === '维修' ? 'maintenance' : 'standard';
    return {
      id: `so-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderNo: pickField(r, headers, '订单编号', 'orderNo') || `SO${now.slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`,
      type: typeVal,
      status: (Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : 'draft') as SalesOrderStatus,
      customerName: pickField(r, headers, '客户', 'customerName'),
      customerId: pickField(r, headers, '客户ID', 'customerId') || undefined,
      customerCode: pickField(r, headers, '客户编码', 'customerCode') || undefined,
      contactName: pickField(r, headers, '联系人', 'contactName') || undefined,
      projectNo: pickField(r, headers, '项目编号', 'projectNo') || undefined,
      projectName: pickField(r, headers, '项目', 'projectName') || undefined,
      items: [],
      totalAmount: toNum(pickField(r, headers, '不含税金额', 'totalAmount')),
      taxRate: 0,
      taxAmount: 0,
      grandTotal: toNum(pickField(r, headers, '含税总额', 'grandTotal')),
      orderDate: pickField(r, headers, '订单日期', 'orderDate') || now.slice(0, 10),
      expectedDeliveryDate: pickField(r, headers, '预计交期', 'expectedDeliveryDate') || '',
      salesPerson: pickField(r, headers, '销售员', 'salesPerson'),
      linkedWorkOrders: [],
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    } as unknown as SalesOrder;
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addSalesOrder(mapImportRow(r, headers)));
  };

  return (
    <PageWrapper
      title="销售订单管理"
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="sales-order" currentStatus="sso_confirmed" />
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/sales/orders/create')}>
            新建销售订单
          </Button>
        </Stack>
      }
    >
      {/* ── 嵌入式分析卡片 ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F0FDF4' }}>
            <Typography variant="caption" color="text.secondary">本月销售额</Typography>
            <Typography variant="h5" fontWeight={700} color="#15803D">
              {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(analytics.monthAmount)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>近6月销售趋势</Typography>
              <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '8%', height: 70, px: 1 }}>
              {analytics.last6Months.map((m, i) => (
                <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{
                    width: '100%', maxWidth: 32,
                    height: `${Math.max(4, (m.amount / analytics.maxAmt) * 56)}px`,
                    bgcolor: '#10B981', borderRadius: '4px 4px 0 0',
                  }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
                    {m.month}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Top5客户</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" width="70" height="70">
                  {analytics.top5Customers.map(([, val], i) => {
                    const ratio = val / analytics.top5Total;
                    const startAngle = analytics.top5Customers.slice(0, i).reduce((s, [, v]) => s + (v / analytics.top5Total) * 360, 0);
                    const endAngle = startAngle + ratio * 360;
                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                    const r = 15.9; const cx = 18; const cy = 18;
                    const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
                    const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
                    const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
                    const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
                    return (
                      <path key={i}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={analytics.colors[i]} />
                    );
                  })}
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                {analytics.top5Customers.map(([name, val], i) => (
                  <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: analytics.colors[i], flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.65rem' }}>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {Math.round((val / analytics.top5Total) * 100)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '全部', count: salesOrders.length, color: '#6366F1' },
          { label: '确认中', count: salesOrders.filter(o => o.status === 'confirmed').length, color: '#3B82F6' },
          { label: '生产中', count: salesOrders.filter(o => o.status === 'in_production').length, color: '#8B5CF6' },
          { label: '已完成', count: salesOrders.filter(o => o.status === 'completed').length, color: '#10B981' },
          { label: '草稿', count: salesOrders.filter(o => o.status === 'draft').length, color: '#94A3B8' },
        ].map(s => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.count}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 列驱动统一检索条（默认显前 5 项检索框，其余「更多筛选」展开） */}
      <FilterBar columns={columns} module="sales" onSearch={setFilterData} listKey="sales-order-list" />

      {/* 订单列表 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable<SalesOrder>
          data={filtered}
          columns={columns}
          hiddenColumns={['upstreamNo', 'downstreamNo']}
          loading={hydrating && filtered.length === 0}
          emptyText="暂无销售订单，可点击「新增」创建第一张订单"
          enableExport
          enableImport
          columnConfigKey="sales-order-list"
          onImport={handleImport}
        />
      </Paper>
    </PageWrapper>
  );
};

export default SalesOrderList;
