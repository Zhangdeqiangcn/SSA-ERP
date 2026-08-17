import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Chip, Button, Box } from '@mui/material';
import { Add, CompareArrows } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, ActionBar, FlowTracker } from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { PriceComparison } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待选定', color: 'warning' },
  selected: { label: '已选定', color: 'info' },
  approved: { label: '已审批', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

const ComparisonsList: React.FC = () => {
  const { priceComparisons } = usePriceStore();
  const navigate = useNavigate();

  const columns: ColumnDef<PriceComparison, unknown>[] = useMemo(() => [
    { accessorKey: 'comparisonNo', header: '比价单号', size: 160 },
    { accessorKey: 'inquiryNo', header: '关联询价单', size: 160 },
    { accessorKey: 'title', header: '标题', size: 200 },
    {
      accessorKey: 'participatingVendors',
      header: '参与供应商',
      size: 250,
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {row.original.participatingVendors.map((name, idx) => (
            <Chip key={idx} label={name} size="small" variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Stack>
      ),
    },
    {
      accessorKey: 'totalLowestAmount',
      header: '全线最低总价',
      cell: ({ row }) => (
        <span style={{ color: '#10B981', fontWeight: 600 }}>
          {formatCurrency(row.original.totalLowestAmount)}
        </span>
      ),
    },
    {
      accessorKey: 'totalSelectedAmount',
      header: '选定总价',
      cell: ({ row }) => row.original.totalSelectedAmount
        ? formatCurrency(row.original.totalSelectedAmount)
        : '-',
    },
    { accessorKey: 'comparisonDate', header: '比价日期', cell: ({ row }) => formatDate(row.original.comparisonDate) },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip label={STATUS_MAP[row.original.status]?.label} size="small"
          color={STATUS_MAP[row.original.status]?.color as any || 'default'} />
      ),
    },
  ], []);

  return (
    <PageWrapper
      title="比价单管理"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-comparison" currentStatus="pc_generated" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建比价单', onClick: () => navigate('/price/inquiry'), icon: <CompareArrows /> }}
          />
        </Box>
      }
    >
      <DataTable
        data={priceComparisons}
        columns={columns}
        enablePagination
        enableExport
        onRowClick={(row) => navigate(`/price/comparison/${row.id}`)}
        onView={(row) => navigate(`/price/comparison/${row.id}`)}
      />
    </PageWrapper>
  );
};

export default ComparisonsList;
