import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useOrgStore } from '@/stores/orgStore';
import { OutboundOrder, matchOrg } from '@/types';
import { formatDate } from '@/utils/format';

const OutboundList: React.FC = () => {
  const navigate = useNavigate();
  const outboundOrders = useWarehouseStore(s => s.outboundOrders);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  const columns: ColumnDef<OutboundOrder, unknown>[] = useMemo(() => [
    { accessorKey: 'outboundNo', header: '出库单号' },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          sale: '销售出库',
          pick: '领料出库',
          transfer: '调拨出库',
          return: '退货出库',
          subcontract: '委外发料',
        };
        return typeMap[row.original.type] || row.original.type;
      },
    },
    { accessorKey: 'customerName', header: '客户' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'operator', header: '操作员' },
    { accessorKey: 'outboundDate', header: '出库日期', cell: ({ row }) => formatDate(row.original.outboundDate) },
  ], []);

  const filterFields = [
    { name: 'outboundNo', label: '出库单号', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待出库' },
        { value: 'processing', label: '出库中' },
        { value: 'picking', label: '拣配中' },
        { value: 'picked', label: '已拣配' },
        { value: 'packed', label: '已包装' },
        { value: 'shipped', label: '已发货' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...outboundOrders];
    data = data.filter(r => matchOrg(r, currentOrgId));
    if (filterData.outboundNo) {
      data = data.filter(o => o.outboundNo.includes(filterData.outboundNo as string));
    }
    if (filterData.status) {
      data = data.filter(o => o.status === filterData.status);
    }
    return data;
  }, [filterData]);

  return (
    <PageWrapper
      title="出库管理"
      actions={
        <ActionBar
          primary={{ label: '新建出库', onClick: () => navigate('/warehouse/outbound/create') }}
        />
      }
    >
      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onRowClick={(row) => navigate(`/warehouse/outbound/${row.id}`)}
      />
    </PageWrapper>
  );
};

export default OutboundList;
