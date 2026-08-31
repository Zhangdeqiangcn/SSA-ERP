import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Box, Chip, LinearProgress, Typography, Stack } from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, SecureField } from '@/components/common';
import { useCustomerStore } from '@/stores/customerStore';
import { Customer, CustomerStatus, CustomerType, CreditLevel } from '@/types';
import {
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CREDIT_LEVEL_OPTIONS,
} from '@/constants/options';
import { formatPhone, formatCurrency } from '@/utils/format';

const labelOf = (
  options: { value: string; label: string }[],
  value?: string
): string =>
  options.find((o) => o.value === value)?.label || value || '-';

// 客户信用状态展示（只读）：已用 / 授信上限，超额或 ≥90% 红色告警
const renderCustomerCredit = (c: Customer) => {
  const limit = c.creditLimit;
  const used = c.usedCredit || 0;
  if (limit == null || limit <= 0) {
    return (
      <Box data-testid="credit-status">
        <Chip size="small" label="未授信" variant="outlined" color="default" />
      </Box>
    );
  }
  const ratio = used / limit;
  const over = used > limit || ratio >= 0.9;
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <Box data-testid="credit-status" sx={{ minWidth: 140 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            width: 70, height: 6, borderRadius: 3,
            '& .MuiLinearProgress-bar': { bgcolor: over ? '#EF4444' : '#10B981' },
          }}
        />
        <Typography variant="caption" color={over ? 'error' : 'text.secondary'}>{pct}%</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {formatCurrency(used)} / {formatCurrency(limit)}
      </Typography>
      {over && (
        <Chip size="small" label="信用超额" color="error" sx={{ mt: 0.5 }} />
      )}
    </Box>
  );
};

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const customers = useCustomerStore((s) => s.customers);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  const columns: ColumnDef<Customer, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '客户编码' },
    { accessorKey: 'name', header: '客户名称' },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => labelOf(CUSTOMER_TYPE_OPTIONS, row.original.type),
    },
    { accessorKey: 'contactName', header: '联系人', cell: ({ row }) => row.original.contactName || '-' },
    {
      accessorKey: 'contactPhone',
      header: '电话',
      cell: ({ row }) => formatPhone(row.original.contactPhone),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'creditLevel',
      header: '信用等级',
      cell: ({ row }) => row.original.creditLevel
        ? <Chip size="small" label={row.original.creditLevel} color="primary" variant="outlined" />
        : '-',
    },
    {
      id: 'credit',
      header: '信用状态',
      cell: ({ row }) => (
        <SecureField module="customer" fieldName="creditLimit">
          {renderCustomerCredit(row.original)}
        </SecureField>
      ),
    },
  ], []);

  const filterFields = [
    { name: 'name', label: '客户名称', type: 'text' as const },
    {
      name: 'type',
      label: '类型',
      type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...CUSTOMER_TYPE_OPTIONS],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...CUSTOMER_STATUS_OPTIONS],
    },
    {
      name: 'creditLevel',
      label: '信用等级',
      type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...CREDIT_LEVEL_OPTIONS],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...customers];
    if (filterData.name) {
      data = data.filter((c) => c.name.includes(filterData.name as string));
    }
    if (filterData.type) {
      data = data.filter((c) => c.type === filterData.type);
    }
    if (filterData.status) {
      data = data.filter((c) => c.status === filterData.status);
    }
    if (filterData.creditLevel) {
      data = data.filter((c) => c.creditLevel === filterData.creditLevel);
    }
    return data;
  }, [filterData, customers]);

  return (
    <PageWrapper
      title="客户列表"
      actions={
        <ActionBar
          primary={{ label: '新建客户', onClick: () => navigate('/sales/customers/create') }}
        />
      }
    >
      <FilterBar fields={filterFields} onSearch={setFilterData} listKey="customer-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onRowClick={(row) => navigate(`/sales/customers/${row.id}`)}
        onView={(row) => navigate(`/sales/customers/${row.id}`)}
        onEdit={(row) => navigate(`/sales/customers/${row.id}/edit`)}
      />
    </PageWrapper>
  );
};

export default CustomerList;
