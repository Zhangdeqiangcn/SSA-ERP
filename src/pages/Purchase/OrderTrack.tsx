import React from 'react';
import { Box, Typography, Paper, Divider, Chip } from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker } from '@/components/common';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { formatDate, formatCurrency } from '@/utils/format';

const OrderTrack: React.FC = () => {
  const purchaseOrders = usePurchaseStore(s => s.purchaseOrders);
  const orders = purchaseOrders.filter(o => ['created', 'sent', 'vendorConfirmed', 'confirmed', 'partial'].includes(o.status));

  const statusFlow = ['created', 'sent', 'vendorConfirmed', 'confirmed', 'partial', 'received', 'closed'];
  const statusLabels: Record<string, string> = {
    created: '已创建',
    sent: '已发送',
    vendorConfirmed: '供应商已确认',
    confirmed: '已确认',
    partial: '部分收货',
    received: '已收货',
    closed: '已关闭',
  };

  const getStatusIndex = (status: string) => statusFlow.indexOf(status);

  return (
    <PageWrapper
      title="交期跟踪"
      actions={<FlowTracker module="purchase-order" currentStatus="po_shipped" label="流程追踪" />}
    >
      <Box>
        {orders.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无在途订单</Typography>
          </Paper>
        ) : (
          orders.map(order => (
            <Paper key={order.id} sx={{ mb: 3, p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6">{order.orderNo}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    供应商：{order.vendorName} | 联系人：{order.contact}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" color="primary">{formatCurrency(order.totalAmount)}</Typography>
                  <Typography variant="body2">
                    预计交货：{formatDate(order.expectedDeliveryDate)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {statusFlow.map((status, index) => (
                  <React.Fragment key={status}>
                    <Chip
                      label={statusLabels[status]}
                      color={status === order.status ? 'primary' : index <= getStatusIndex(order.status) ? 'success' : 'default'}
                      variant={status === order.status ? 'filled' : 'outlined'}
                      size="small"
                    />
                    {index < statusFlow.length - 1 && <Box sx={{ width: 20, borderTop: '2px dashed', borderColor: 'divider' }} />}
                  </React.Fragment>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>订单明细</Typography>
                {order.items.map(item => (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">
                      {item.materialName} × {item.orderedQuantity} {item.unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      已发货：{item.deliveredQuantity} / {item.orderedQuantity}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {new Date(order.expectedDeliveryDate) < new Date() && (
                  <Chip label="延期预警" color="error" size="small" />
                )}
              </Box>
            </Paper>
          ))
        )}
      </Box>
    </PageWrapper>
  );
};

export default OrderTrack;
