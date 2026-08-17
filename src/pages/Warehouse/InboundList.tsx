import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useOrgStore } from '@/stores/orgStore';
import { InboundOrder, matchOrg } from '@/types';
import { formatDate } from '@/utils/format';

const InboundList: React.FC = () => {
  const navigate = useNavigate();
  const inboundOrders = useWarehouseStore(s => s.inboundOrders);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  const columns: ColumnDef<InboundOrder, unknown>[] = useMemo(() => [
    { accessorKey: 'inboundNo', header: '入库单号' },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          purchase: '采购入库',
          return: '退货入库',
          transfer: '调拨入库',
          subcontract: '委外收货',
          production: '生产完工入库',
        };
        return typeMap[row.original.type] || row.original.type;
      },
    },
    { accessorKey: 'sourceNo', header: '来源单号' },
    { accessorKey: 'vendorName', header: '供应商' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'operator', header: '操作员' },
    { accessorKey: 'inboundDate', header: '入库日期', cell: ({ row }) => formatDate(row.original.inboundDate) },
  ], []);

  const filterFields = [
    { name: 'inboundNo', label: '入库单号', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待入库' },
        { value: 'processing', label: '入库中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...inboundOrders];
    data = data.filter(r => matchOrg(r, currentOrgId));
    if (filterData.inboundNo) {
      data = data.filter(o => o.inboundNo.includes(filterData.inboundNo as string));
    }
    if (filterData.status) {
      data = data.filter(o => o.status === filterData.status);
    }
    return data;
  }, [filterData]);

  return (
    <PageWrapper
      title="入库管理"
      actions={
        <ActionBar
          primary={{ label: '新建入库', onClick: () => navigate('/warehouse/inbound/create') }}
        />
      }
    >
      <FilterBar fields={filterFields} onSearch={setFilterData} listKey="inbound-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onRowClick={(row) => navigate(`/warehouse/inbound/${row.id}`)}
      />
    </PageWrapper>
  );
};

export default InboundList;
