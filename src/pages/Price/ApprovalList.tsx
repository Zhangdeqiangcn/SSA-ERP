import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, Button, Stack, Box } from '@mui/material';
import { Add } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, ActionBar, FlowTracker } from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { PriceApproval } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'warning' },
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

const ApprovalList: React.FC = () => {
  const { priceApprovals } = usePriceStore();
  const navigate = useNavigate();

  const columns: ColumnDef<PriceApproval, unknown>[] = useMemo(() => [
    { accessorKey: 'approvalNo', header: '审批单号', size: 160 },
    { accessorKey: 'comparisonNo', header: '比价单号', size: 160 },
    { accessorKey: 'inquiryNo', header: '询价单号', size: 160 },
    { accessorKey: 'title', header: '标题', size: 200 },
    { accessorKey: 'applicant', header: '申请人', size: 80 },
    {
      accessorKey: 'totalAmount',
      header: '审批金额',
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    { accessorKey: 'applicationDate', header: '申请日期', cell: ({ row }) => formatDate(row.original.applicationDate) },
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
      title="价格审批单"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-approval" currentStatus="pa_submitted" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建审批单', onClick: () => alert('请从比价单中选择供应商后提交审批'), icon: <Add /> }}
          />
        </Box>
      }
    >
      <DataTable
        data={priceApprovals}
        columns={columns}
        enablePagination
        enableExport
        onRowClick={(row) => navigate(`/price/approval/${row.id}`)}
        onView={(row) => navigate(`/price/approval/${row.id}`)}
      />
    </PageWrapper>
  );
};

export default ApprovalList;
