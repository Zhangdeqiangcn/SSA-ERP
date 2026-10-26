import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useSubcontractStore } from '@/stores/subcontractStore';
import { useProductionStore } from '@/stores/productionStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { SubcontractOrder, SubcontractIssueItem } from '@/types/production';
import { formatDate, formatCurrency } from '@/utils/format';

/** 委外类型中文名（与 Subcontract 列表筛选选项一致） */
const SUBCONTRACT_TYPE_MAP: Record<string, string> = {
  process: '工序委外',
  whole: '整体委外',
};

/** 可点击跳转的单据号链接（工艺路线详情页同款样式） */
const DocNoLink: React.FC<{ no: string; onClick: () => void }> = ({ no, onClick }) => (
  <Typography
    variant="body2"
    sx={{ fontFamily: 'monospace', color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
    onClick={onClick}
  >{no}</Typography>
);

const SubcontractDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = useSubcontractStore(s => s.orders.find(o => o.id === id)) as SubcontractOrder | undefined;
  // 反查能力：按单号在仓库域单据中定位详情页路由所需的 id
  const outboundOrders = useWarehouseStore(s => s.outboundOrders);
  const inboundOrders = useWarehouseStore(s => s.inboundOrders);
  // 关联内部工单（工序委外出处）
  const workOrders = useProductionStore(s => s.workOrders);

  // 委外发料生成的出库单（按单号反查，命中才能跳 /warehouse/outbound/:id）
  const issueOutbound = useMemo(
    () => (order?.issueOutboundNo
      ? outboundOrders.find(x => x.outboundNo === order.issueOutboundNo)
      : undefined),
    [order, outboundOrders]
  );
  // 委外收货生成的入库单（按单号反查，命中才能跳 /warehouse/inbound/:id）
  const receiptInbounds = useMemo(
    () => (order?.receiptInboundNos || [])
      .map(no => inboundOrders.find(x => x.inboundNo === no))
      .filter((x): x is NonNullable<typeof x> => !!x),
    [order, inboundOrders]
  );
  const receiptNos = order?.receiptInboundNos || [];
  const hasRelatedDocs = !!order?.issueOutboundNo || receiptNos.length > 0;

  // 关联工单（工序委外的内部工单出处）
  const sourceWorkOrder = useMemo(
    () => (order?.sourceWorkOrderId ? workOrders.find(w => w.id === order.sourceWorkOrderId) : undefined),
    [order, workOrders]
  );

  // 操作历史：按委外单生命周期合成（创建→发料→收货/回收→关闭）
  const operationLogs = useMemo(() => {
    if (!order) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: order.createdBy || '-', time: formatDate(order.createdAt), description: `创建委外单 ${order.orderNo}` },
    ];
    if (order.issueOutboundNo) {
      logs.push({ id: 'op-issue', action: 'approve', operator: order.updatedBy || '-', time: formatDate(order.updatedAt), description: `发料完成，生成委外出库单 ${order.issueOutboundNo}` });
    }
    if (receiptNos.length > 0) {
      logs.push({ id: 'op-receive', action: 'approve', operator: order.updatedBy || '-', time: formatDate(order.updatedAt), description: `委外收货，生成委外入库单 ${receiptNos.join('、')}` });
    }
    if (order.status === 'returned') {
      logs.push({ id: 'op-return', action: 'info', operator: order.updatedBy || '-', time: formatDate(order.updatedAt), description: '剩余委外材料已回收' });
    }
    if (order.status === 'closed') {
      logs.push({ id: 'op-close', action: 'approve', operator: order.updatedBy || '-', time: formatDate(order.updatedAt), description: '委外单已关闭' });
    }
    return logs;
  }, [order, receiptNos]);

  if (!order) {
    return (
      <PageWrapper title="委外单详情">
        <Alert severity="warning">委外单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/subcontract')} sx={{ mt: 2 }}>返回委外加工列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '委外单号', value: <Typography variant="body2" fontWeight={600} fontFamily="monospace">{order.orderNo}</Typography> },
    { label: '委外类型', value: SUBCONTRACT_TYPE_MAP[order.type] || order.type },
    { label: '委外物料', value: `${order.materialCode} · ${order.materialName}` },
    { label: '委外方', value: order.vendorName },
    { label: '委外数量', value: order.qty.toLocaleString() },
    { label: '已收 / 应收', value: `${(order.receivedQty || 0).toLocaleString()} / ${order.qty.toLocaleString()}` },
    { label: '加工费单价', value: order.processFee ? formatCurrency(order.processFee) : '-' },
    { label: '计划日期', value: formatDate(order.planDate) },
    { label: '状态', value: <StatusBadge status={order.status} /> },
    { label: '创建时间', value: formatDate(order.createdAt) },
  ];

  return (
    <ObjectPage docType="subcontract" entity={order}
      title={order.orderNo}
      subtitle={`${SUBCONTRACT_TYPE_MAP[order.type] || order.type} · ${order.materialName}`}
      breadcrumbs={[{ label: '委外加工', path: '/production/subcontract' }]}
      status={<StatusBadge status={order.status} />}
      headerFields={[
        { label: '委外类型', value: SUBCONTRACT_TYPE_MAP[order.type] || order.type },
        { label: '委外方', value: order.vendorName },
        { label: '委外物料', value: order.materialName },
        { label: '计划日期', value: formatDate(order.planDate) },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/subcontract')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        {
          id: 'issueItems',
          title: `发料明细（${order.issueItems.length} 项）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <DataTable
                data={order.issueItems as SubcontractIssueItem[]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  { id: 'materialCode', header: '物料编码',
                    cell: ({ row }) => (
                      <Chip label={row.original.materialCode} size="small" sx={{ fontSize: '0.75rem', bgcolor: 'info.light', color: 'info.contrastText', fontFamily: 'monospace' }} />
                    ) },
                  { id: 'materialName', header: '物料名称', accessorKey: 'materialName',
                    cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box> },
                  { id: 'unit', header: '单位', accessorKey: 'unit',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.unit}</Box> },
                  { id: 'qty', header: '发料数量', accessorKey: 'qty',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.qty.toLocaleString()}</Box> },
                ]}
              />
              {order.issueItems.length === 0 && (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">尚未发料</Typography>
                </Box>
              )}
            </Paper>
          ),
        },
        {
          id: 'relatedDocs',
          title: '关联单据',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: hasRelatedDocs ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>出入库单据</Typography>
              </Box>
              {!hasRelatedDocs ? (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">暂无关联出入库单</Typography>
                </Box>
              ) : (
                <Stack spacing={1} sx={{ px: 2, py: 1.5 }}>
                  {order.issueOutboundNo && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>委外出库单：</Typography>
                      {issueOutbound ? (
                        <DocNoLink no={order.issueOutboundNo} onClick={() => navigate(`/warehouse/outbound/${issueOutbound.id}`)} />
                      ) : (
                        <Typography variant="body2" fontFamily="monospace">{order.issueOutboundNo}</Typography>
                      )}
                    </Stack>
                  )}
                  {receiptNos.map((no) => {
                    const hit = receiptInbounds.find(x => x.inboundNo === no);
                    return (
                      <Stack key={no} direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>委外入库单：</Typography>
                        {hit ? (
                          <DocNoLink no={no} onClick={() => navigate(`/warehouse/inbound/${hit.id}`)} />
                        ) : (
                          <Typography variant="body2" fontFamily="monospace">{no}</Typography>
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          ),
        },
        ...(sourceWorkOrder ? [{
          id: 'workorder',
          title: '关联工单',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <DataTable
                data={[sourceWorkOrder]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  { id: 'orderNo', header: '工单号',
                    cell: ({ row }) => (
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate(`/production/orders/${row.original.id}`)}
                      >{row.original.orderNo}</Typography>
                    ) },
                  { id: 'productName', header: '产品', accessorKey: 'productName' },
                  { id: 'plannedQuantity', header: '计划数量', accessorKey: 'plannedQuantity',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.plannedQuantity.toLocaleString()}</Box> },
                  { id: 'status', header: '状态',
                    cell: ({ row }) => <StatusBadge status={row.original.status === 'in_progress' ? 'wo_in_progress' : row.original.status} /> },
                ]}
              />
            </Paper>
          ),
        }] : []),
        ...(operationLogs.length > 0 ? [{
          id: 'logs',
          title: '操作历史',
          content: <OperationTimeline events={operationLogs} />,
        }] : []),
      ]}
    />
  );
};

export default SubcontractDetail;
