import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Box, Chip, LinearProgress, Typography, Stack, Alert, Button } from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, SecureField } from '@/components/common';
import { useVendorStore } from '@/stores/vendorStore';
import { Vendor } from '@/types';
import { formatPhone, formatCurrency } from '@/utils/format';

// 供应商信用状态展示（只读，无额度引擎）：已用 / 授信上限，超额或 ≥90% 红色告警
const renderVendorCredit = (v: Vendor) => {
  const limit = v.creditLimit;
  const used = v.usedCredit || 0;
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

const VendorList: React.FC = () => {
  const navigate = useNavigate();
  const vendors = useVendorStore((s) => s.vendors);
  const reviewVendorProfilePending = useVendorStore((s) => s.reviewVendorProfilePending);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // B5 门户回写：供应商在门户提交的待审资料
  const pendingProfileVendors = useMemo(
    () => vendors.filter((v) => v.profilePendingAt),
    [vendors]
  );

  const columns: ColumnDef<Vendor, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '供应商编码' },
    { accessorKey: 'name', header: '供应商名称' },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          manufacturer: '生产商',
          trader: '贸易商',
          agent: '代理商',
        };
        return typeMap[row.original.type] || row.original.type;
      },
    },
    { accessorKey: 'contact', header: '联系人' },
    { accessorKey: 'phone', header: '电话', cell: ({ row }) => formatPhone(row.original.phone) },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'rating',
      header: '评级',
      cell: ({ row }) => row.original.rating ? `${row.original.rating}星` : '-',
    },
    {
      id: 'credit',
      header: '信用状态',
      cell: ({ row }) => (
        <SecureField module="vendor" fieldName="creditLimit">
          {renderVendorCredit(row.original)}
        </SecureField>
      ),
    },
    {
      id: 'profilePending',
      header: '门户资料',
      cell: ({ row }) => row.original.profilePendingAt
        ? <Chip size="small" color="warning" label="待审" data-testid="profile-pending-chip" />
        : <Typography variant="caption" color="text.secondary">-</Typography>,
    },
  ], []);

  const filterFields = [
    { name: 'name', label: '供应商名称', type: 'text' as const },
    {
      name: 'type',
      label: '类型',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'manufacturer', label: '生产商' },
        { value: 'trader', label: '贸易商' },
        { value: 'agent', label: '代理商' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'approved', label: '已批准' },
        { value: 'pending', label: '待审核' },
        { value: 'rejected', label: '已拒绝' },
        { value: 'blacklisted', label: '黑名单' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...vendors];
    if (filterData.name) {
      data = data.filter(v => v.name.includes(filterData.name as string));
    }
    if (filterData.type) {
      data = data.filter(v => v.type === filterData.type);
    }
    if (filterData.status) {
      data = data.filter(v => v.status === filterData.status);
    }
    return data;
  }, [filterData, vendors]);

  return (
    <PageWrapper
      title="供应商列表"
      actions={
        <ActionBar
          primary={{ label: '注册供应商', onClick: () => navigate('/vendor/register') }}
        />
      }
    >
      {pendingProfileVendors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="vendor-profile-pending-alert">
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={600}>
              有 {pendingProfileVendors.length} 家供应商在门户提交了资料变更，待审核并入主数据
            </Typography>
            {pendingProfileVendors.map((v) => (
              <Stack key={v.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption">
                  {v.name}（提交人 {v.profilePendingBy || '-'} · {v.profilePendingAt}）
                </Typography>
                <Button size="small" variant="contained"
                  data-testid={`approve-profile-${v.id}`}
                  onClick={() => reviewVendorProfilePending(v.id, true, '采购部主管')}>
                  审核通过并并入
                </Button>
                <Button size="small" variant="outlined" color="inherit"
                  data-testid={`reject-profile-${v.id}`}
                  onClick={() => reviewVendorProfilePending(v.id, false, '采购部主管')}>
                  驳回
                </Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}
      <FilterBar fields={filterFields} onSearch={setFilterData} listKey="vendor-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onRowClick={(row) => navigate(`/vendor/${row.id}`)}
        onView={(row) => navigate(`/vendor/${row.id}`)}
        onEdit={(row) => navigate(`/vendor/${row.id}`)}
      />
    </PageWrapper>
  );
};

export default VendorList;
