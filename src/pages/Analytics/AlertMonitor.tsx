import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Grid,
  Chip, IconButton, Collapse, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, CircularProgress,
} from '@mui/material';
import {
  WarningAmber, Inventory2, ReceiptLong, EventBusy, CreditCardOff,
  ExpandMore, ExpandLess, Error, Warning, Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AlertItem {
  label: string;
  value: string;
  extra?: string;
}

interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  details?: AlertItem[];
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

interface AlertData {
  lowStock: AlertItem[];
  overduePO: AlertItem[];
  overdueSO: AlertItem[];
  expiringBatches: AlertItem[];
  creditOverdue: AlertItem[];
  pendingApprovals: { purchaseOrders: number; salesOrders: number; workOrders: number };
  summary: { total: number; critical: number };
}

const AlertMonitor: React.FC = () => {
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/alerts');
      const data = await resp.json() as AlertData;
      setAlertData(data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const overdueOrders = useMemo(() => {
    if (!alertData) return [];
    return [...alertData.overduePO, ...alertData.overdueSO].slice(0, 10);
  }, [alertData]);

  const totalAlerts = alertData?.summary.total || 0;
  const criticalAlerts = alertData?.summary.critical || 0;
  const pendingCount = (alertData?.pendingApprovals.purchaseOrders || 0) + (alertData?.pendingApprovals.salesOrders || 0) + (alertData?.pendingApprovals.workOrders || 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>正在加载预警数据...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<Refresh />} onClick={fetchAlerts} sx={{ mt: 2 }}>重试</Button>
      </Box>
    );
  }

  if (!alertData) return null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmber color="warning" fontSize="large" />
            <Typography variant="h5">异常检测与预警</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            实时监控业务异常 · 共 {totalAlerts} 项预警（其中 {criticalAlerts} 项严重）· 待审批 {pendingCount} 单
          </Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={fetchAlerts} disabled={loading} variant="outlined" size="small">刷新</Button>
      </Box>

      {totalAlerts > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>系统检测到 {totalAlerts} 项异常，请及时处理。</Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <AlertCard icon={<Inventory2 color="warning" />} title="库存低于安全库存"
            count={alertData.lowStock.length}
            severity={alertData.lowStock.length > 5 ? 'high' : alertData.lowStock.length > 2 ? 'medium' : 'low'}
            description="物料可用量低于安全库存阈值，需及时补货"
            details={alertData.lowStock} actionLabel="跳转到库存页" actionPath="/warehouse/inventory" testid="alert-stock" />
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertCard icon={<EventBusy color="error" />} title="逾期订单"
            count={overdueOrders.length}
            severity={overdueOrders.length > 5 ? 'high' : overdueOrders.length > 2 ? 'medium' : 'low'}
            description="已超过期望交货日期但未完成的订单"
            details={overdueOrders} actionLabel="跳转到销售订单" actionPath="/sales/orders" testid="alert-overdue" />
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertCard icon={<ReceiptLong color="warning" />} title="临期物料"
            count={alertData.expiringBatches.length}
            severity={alertData.expiringBatches.length > 3 ? 'high' : alertData.expiringBatches.length > 0 ? 'medium' : 'low'}
            description="临期或过期物料，需关注处理"
            details={alertData.expiringBatches} actionLabel="跳转到批次管理" actionPath="/warehouse/batch" testid="alert-expiry" />
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertCard icon={<CreditCardOff color="error" />} title="信用超额"
            count={alertData.creditOverdue.length}
            severity={alertData.creditOverdue.length > 2 ? 'high' : alertData.creditOverdue.length > 0 ? 'medium' : 'low'}
            description="客户已使用信用额度超过授信额度"
            details={alertData.creditOverdue} actionLabel="跳转到客户列表" actionPath="/customer/list" testid="alert-credit" />
        </Grid>
      </Grid>

      {pendingCount > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>待审批单据</Typography>
          <Grid container spacing={1}>
            <Grid item><Chip label={`采购订单 ${alertData.pendingApprovals.purchaseOrders} 单`} color="warning" size="small" /></Grid>
            <Grid item><Chip label={`销售订单 ${alertData.pendingApprovals.salesOrders} 单`} color="info" size="small" /></Grid>
            <Grid item><Chip label={`生产工单 ${alertData.pendingApprovals.workOrders} 单`} color="secondary" size="small" /></Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AlertMonitor;
