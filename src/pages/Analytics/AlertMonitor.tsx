import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Grid,
  Chip, IconButton, Collapse, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, Dialog, DialogTitle, DialogContent,
  Link,
} from '@mui/material';
import {
  WarningAmber, Inventory2, ReceiptLong, EventBusy, CreditCardOff,
  ExpandMore, ExpandLess, Error, Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useSalesStore } from '@/stores/salesStore';
import { usePurchaseStore } from '@/stores/purchaseStore';

// ── 预警卡片组件 ──
interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  details?: { label: string; value: string; extra?: string }[];
  actionLabel?: string;
  actionPath?: string;
  testid: string;
}

const severityColors: Record<string, { bg: string; icon: string }> = {
  high: { bg: '#ffebee', icon: '#d32f2f' },
  medium: { bg: '#fff3e0', icon: '#f57c00' },
  low: { bg: '#e8f5e9', icon: '#388e3c' },
};

const severityIcons: Record<string, React.ReactNode> = {
  high: <Error fontSize="small" sx={{ color: '#d32f2f' }} />,
  medium: <Warning fontSize="small" sx={{ color: '#f57c00' }} />,
  low: <Warning fontSize="small" sx={{ color: '#388e3c' }} />,
};

const AlertCard: React.FC<AlertCardProps> = ({
  icon, title, count, severity, description, details, actionLabel, actionPath, testid,
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const sc = severityColors[severity];

  return (
    <Card
      variant="outlined"
      data-testid={testid}
      sx={{ borderRadius: 2, borderLeft: `4px solid ${sc.icon}`, height: '100%' }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
          </Box>
          <Chip
            label={`${count} 项异常`}
            size="small"
            color={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'success'}
            variant="outlined"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          {severityIcons[severity]}
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
      </CardContent>

      {details && details.length > 0 && (
        <>
          <CardActions sx={{ pt: 0 }}>
            <Button
              size="small"
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setExpanded(!expanded)}
            >
              展开明细 ({details.length})
            </Button>
          </CardActions>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <CardContent sx={{ pt: 0 }}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>物料/单据</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>异常详情</TableCell>
                      {details[0].extra !== undefined && (
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>备注</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.map((d, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{d.label}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'error.main' }}>{d.value}</TableCell>
                        {d.extra !== undefined && (
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.extra}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Collapse>
        </>
      )}

      {actionPath && (
        <CardActions>
          <Button size="small" variant="text" onClick={() => navigate(actionPath!)}>
            {actionLabel || '查看详情'}
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

// ── 主页面 ──
const AlertMonitor: React.FC = () => {
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const prospects = useSalesStore((s) => s.prospects);
  const batchRecords = useWarehouseStore((s) => s.batchRecords);

  // 1. 库存低于安全库存
  const lowStockAlerts = useMemo(() => {
    const safeStockThreshold = 100;
    return inventoryRecords
      .filter((r) => r.availableQuantity < safeStockThreshold)
      .slice(0, 10)
      .map((r) => ({
        label: `${r.materialName} (${r.materialCode})`,
        value: `可用 ${r.availableQuantity} / 总 ${r.quantity}，阈值 ${safeStockThreshold}`,
        extra: r.warehouseName || '-',
      }));
  }, [inventoryRecords]);

  // 2. 逾期订单（超期望交货日期）
  const overdueOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: { label: string; value: string; extra?: string }[] = [];

    for (const order of salesOrders) {
      if (order.status !== 'completed' && order.status !== 'cancelled') {
        const ed = order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null;
        if (ed && ed < today) {
          const days = Math.floor((today.getTime() - ed.getTime()) / (1000 * 60 * 60 * 24));
          result.push({
            label: `${order.orderNo} - ${order.customerName}`,
            value: `期望交货 ${order.expectedDeliveryDate}，逾期 ${days} 天`,
            extra: order.status,
          });
        }
      }
    }

    for (const po of purchaseOrders) {
      if (po.status !== 'received' && po.status !== 'closed' && po.status !== 'cancelled') {
        const ed = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null;
        if (ed && ed < today) {
          const days = Math.floor((today.getTime() - ed.getTime()) / (1000 * 60 * 60 * 24));
          result.push({
            label: `${po.orderNo} - ${po.vendorName}`,
            value: `期望交货 ${po.expectedDeliveryDate}，逾期 ${days} 天`,
            extra: po.status,
          });
        }
      }
    }
    return result.slice(0, 10);
  }, [salesOrders, purchaseOrders]);

  // 3. 临期物料（到期日 < 30 天）
  const expiringBatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return batchRecords
      .filter((b) => {
        if (!b.expiryDate) return false;
        const exp = new Date(b.expiryDate);
        return exp <= threshold && exp >= today && b.quantity > 0;
      })
      .slice(0, 10)
      .map((b) => {
        const exp = new Date(b.expiryDate!);
        const days = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          label: `${b.materialName} (${b.materialCode}) 批次 ${b.batchNo}`,
          value: `到期日 ${b.expiryDate}，剩余 ${days} 天`,
          extra: `数量 ${b.quantity}`,
        };
      });
  }, [batchRecords]);

  // 4. 信用超额（已用 > 授信）
  const creditOverdue = useMemo(() => {
    return prospects
      .filter((p) => {
        const limit = p.creditLimit || 0;
        const used = p.usedCredit || 0;
        return limit > 0 && used > limit;
      })
      .slice(0, 10)
      .map((p) => ({
        label: `${p.companyName}`,
        value: `已用 ¥${(p.usedCredit || 0).toLocaleString()} / 授信 ¥${(p.creditLimit || 0).toLocaleString()}`,
        extra: `超出 ${((p.usedCredit || 0) - (p.creditLimit || 0)).toLocaleString()}`,
      }));
  }, [prospects]);

  const totalAlerts = lowStockAlerts.length + overdueOrders.length + expiringBatches.length + creditOverdue.length;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <WarningAmber color="warning" fontSize="large" />
        <Box>
          <Typography variant="h5">异常检测与预警</Typography>
          <Typography variant="body2" color="text.secondary">
            实时监控业务异常，共检测到 {totalAlerts} 项预警
          </Typography>
        </Box>
      </Box>

      {totalAlerts > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          系统检测到 {totalAlerts} 项异常，请及时处理以保障业务正常运行。
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <AlertCard
            icon={<Inventory2 color="warning" />}
            title="库存低于安全库存"
            count={lowStockAlerts.length}
            severity={lowStockAlerts.length > 5 ? 'high' : lowStockAlerts.length > 2 ? 'medium' : 'low'}
            description="物料可用量低于安全库存阈值（100），需及时补货"
            details={lowStockAlerts}
            actionLabel="跳转到库存页"
            actionPath="/warehouse/inventory"
            testid="alert-stock"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertCard
            icon={<EventBusy color="error" />}
            title="逾期订单"
            count={overdueOrders.length}
            severity={overdueOrders.length > 5 ? 'high' : overdueOrders.length > 2 ? 'medium' : 'low'}
            description="已超过期望交货日期但未完成的订单"
            details={overdueOrders}
            actionLabel="跳转到销售订单"
            actionPath="/sales/orders"
            testid="alert-overdue"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertCard
            icon={<ReceiptLong color="warning" />}
            title="临期物料"
            count={expiringBatches.length}
            severity={expiringBatches.length > 3 ? 'high' : expiringBatches.length > 0 ? 'medium' : 'low'}
            description="批次物料到期日 < 30 天，需关注处理"
            details={expiringBatches}
            actionLabel="跳转到批次管理"
            actionPath="/warehouse/batch"
            testid="alert-expiry"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertCard
            icon={<CreditCardOff color="error" />}
            title="信用超额"
            count={creditOverdue.length}
            severity={creditOverdue.length > 2 ? 'high' : creditOverdue.length > 0 ? 'medium' : 'low'}
            description="客户已使用信用额度超过授信额度"
            details={creditOverdue}
            actionLabel="跳转到意向客户"
            actionPath="/sales/prospects"
            testid="alert-credit"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AlertMonitor;
