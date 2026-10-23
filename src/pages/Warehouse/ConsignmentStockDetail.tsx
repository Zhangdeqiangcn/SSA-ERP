import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, DataTable } from '@/components/common';
import { useConsignmentStore } from '@/stores/consignmentStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { ConsignmentStock, PurchaseOrder, PurchaseOrderStatus } from '@/types/purchase';
import { formatCurrency, formatDate } from '@/utils/format';

/** 采购订单状态中文名（消耗结算生成的寄售采购订单） */
const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  created: '已创建',
  sent: '已发送',
  vendorConfirmed: '供应商已确认',
  confirmed: '已确认',
  partial: '部分收货',
  received: '已收货',
  closed: '已关闭',
  cancelled: '已取消',
};

const ConsignmentStockDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useConsignmentStore((s) => s.records.find((r) => r.id === id)) as ConsignmentStock | undefined;
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);

  // 消耗结算记录：寄售结算时自动生成的寄售模式采购订单（按供应商+物料匹配真实单据，不造假数据）
  const settlementOrders = useMemo(() => {
    if (!record) return [] as PurchaseOrder[];
    return purchaseOrders.filter(
      (o) =>
        o.orderMode === 'consignment' &&
        o.vendorId === record.vendorId &&
        (o.items || []).some((i) => i.materialId === record.materialId)
    );
  }, [purchaseOrders, record]);

  if (!record) {
    return (
      <PageWrapper title="寄售库存详情">
        <Alert severity="warning">寄售库存记录不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/consignment')} sx={{ mt: 2 }}>返回寄售列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '供应商', value: `${record.vendorName}${record.vendorCode ? `（${record.vendorCode}）` : ''}` },
    { label: '物料编码', value: record.materialCode || '-' },
    { label: '物料名称', value: record.materialName || '-' },
    { label: '规格型号', value: record.specification || '-' },
    { label: '单位', value: record.unit || '-' },
    { label: '寄存仓库', value: record.warehouseName || record.warehouseId || '-' },
    { label: '约定单价', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(record.agreedUnitPrice)}</strong> },
    { label: '寄存数量', value: record.consignedQty.toLocaleString() },
    { label: '已消耗数量', value: record.consumedQty.toLocaleString() },
    { label: '结存数量', value: <strong style={{ color: record.balanceQty > 0 ? '#1D4ED8' : undefined }}>{record.balanceQty.toLocaleString()}</strong> },
    { label: '结存金额', value: formatCurrency((record.balanceQty || 0) * (record.agreedUnitPrice || 0)) },
  ];

  return (
    <>
      <ObjectPage
        title={record.materialCode || record.materialName || '寄售库存'}
        subtitle={record.materialName || record.vendorName}
        breadcrumbs={[{ label: '寄售库存', path: '/warehouse/consignment' }]}
        status={
          <Chip
            size="small"
            label={record.balanceQty > 0 ? '有待结算余量' : '已全部结算'}
            color={record.balanceQty > 0 ? 'warning' : 'success'}
          />
        }
        headerFields={[
          { label: '供应商', value: record.vendorName },
          { label: '规格型号', value: record.specification || '-' },
          { label: '单位', value: record.unit || '-' },
          { label: '约定单价', value: formatCurrency(record.agreedUnitPrice) },
          { label: '寄存数量', value: record.consignedQty.toLocaleString() },
          { label: '结存数量', value: <strong style={{ color: '#1D4ED8' }}>{record.balanceQty.toLocaleString()}</strong> },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/consignment')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          ...(settlementOrders.length > 0
            ? [{
                id: 'settlements',
                title: '消耗结算记录',
                content: (
                  <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" fontWeight={600}>消耗结算记录（{settlementOrders.length} 笔）</Typography>
                      <Typography variant="caption" color="text.secondary">消耗结算自动生成的寄售模式采购订单</Typography>
                    </Box>
                    <DataTable
                      data={settlementOrders}
                      enablePagination={false}
                      enableRowSelection={false}
                      sapStyle
                      columns={[
                        {
                          id: 'orderNo', header: '结算单号',
                          cell: ({ row }) => (
                            <Chip label={row.original.orderNo} size="small"
                              sx={{ fontSize: '0.75rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace' }} />
                          ),
                        },
                        {
                          id: 'orderDate', header: '结算日期', accessorKey: 'orderDate',
                          cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{formatDate(row.original.orderDate)}</Box>,
                        },
                        {
                          id: 'quantity', header: '结算数量',
                          cell: ({ row }) => (
                            <Box sx={{ textAlign: 'right', fontWeight: 500 }}>
                              {(row.original.items || []).reduce((sum, i) => sum + (i.orderedQuantity || 0), 0).toLocaleString()}
                            </Box>
                          ),
                        },
                        {
                          id: 'totalAmount', header: '结算金额', accessorKey: 'totalAmount',
                          cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row.original.totalAmount)}</Box>,
                        },
                        {
                          id: 'status', header: '订单状态',
                          cell: ({ row }) => (
                            <Box sx={{ textAlign: 'center' }}>{PO_STATUS_LABEL[row.original.status] || row.original.status}</Box>
                          ),
                        },
                        {
                          id: 'createdBy', header: '操作人', accessorKey: 'createdBy',
                          cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.createdBy}</Box>,
                        },
                      ]}
                    />
                  </Paper>
                ),
              }]
            : []),
        ]}
      />
    </>
  );
};

export default ConsignmentStockDetail;
