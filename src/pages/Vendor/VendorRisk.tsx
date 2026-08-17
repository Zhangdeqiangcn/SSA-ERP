import React, { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Grid, Alert, LinearProgress,
} from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { useVendorStore } from '@/stores/vendorStore';
import { useQualityStore } from '@/stores/qualityStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePriceStore } from '@/stores/priceStore';
import type { Vendor } from '@/types/vendor';

interface VendorRiskScore {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  // 资质过期风险
  certExpired: boolean;
  certScore: number;
  // 质量不合格率
  defectRate: number;
  qualityScore: number;
  // 交期延迟率
  delayRate: number;
  deliveryScore: number;
  // 价格波动
  priceVolatility: number;
  priceScore: number;
  // 综合风险评分 (0-100, 越高风险越大)
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const RISK_CONFIG = {
  low: { label: '低风险', color: 'success' as const, bg: '#ECFDF5', max: 30 },
  medium: { label: '中风险', color: 'warning' as const, bg: '#FFFBEB', max: 60 },
  high: { label: '高风险', color: 'error' as const, bg: '#FEF2F2', max: 80 },
  critical: { label: '严重风险', color: 'error' as const, bg: '#FEE2E2', max: 100 },
};

const VendorRisk: React.FC = () => {
  const { vendors } = useVendorStore() as { vendors: Vendor[] };
  const { inspectionTasks } = useQualityStore();
  const { purchaseOrders } = usePurchaseStore() as { purchaseOrders: any[] };
  const { priceList: priceRecords } = usePriceStore() as { priceList: any[] };

  const riskScores = useMemo<VendorRiskScore[]>(() => {
    const today = new Date();

    return vendors.map((vendor) => {
      // 1. 资质过期风险评估
      let certExpired = false;
      let certScore = 100;
      if ((vendor as any).certExpiryDate) {
        const certDate = new Date((vendor as any).certExpiryDate);
        certExpired = certDate < today;
        const daysToExpiry = Math.round((certDate.getTime() - today.getTime()) / 86400000);
        if (daysToExpiry < 0) certScore = 10;
        else if (daysToExpiry < 30) certScore = 30;
        else if (daysToExpiry < 90) certScore = 50;
        else certScore = 80;
      }

      // 2. 质量不合格率（从检验任务统计）
      const vendorInspections = inspectionTasks.filter(
        (t) => t.vendorId === vendor.id || t.vendorName === vendor.name
      );
      const totalInspections = vendorInspections.length;
      const failedInspections = vendorInspections.filter((t) => t.status === 'failed').length;
      const defectRate = totalInspections > 0 ? failedInspections / totalInspections : 0;
      const qualityScore = Math.max(0, 100 - defectRate * 100);

      // 3. 交期延迟率（从采购订单统计）
      const vendorOrders = purchaseOrders.filter(
        (o) => o.vendorId === vendor.id || o.vendorName === vendor.name
      );
      const completedOrders = vendorOrders.filter(
        (o) => o.status === 'completed' || o.status === 'delivered'
      );
      const delayedOrders = completedOrders.filter((o) => {
        if (!o.deliveryDate) return false;
        const planned = o.plannedDeliveryDate || o.deliveryDate;
        return new Date(o.deliveryDate) > new Date(planned);
      });
      const delayRate = completedOrders.length > 0 ? delayedOrders.length / completedOrders.length : 0;
      const deliveryScore = Math.max(0, 100 - delayRate * 100);

      // 4. 价格波动（从价格记录统计）
      const vendorPrices = priceRecords.filter(
        (p) => p.vendorId === vendor.id || p.vendorName === vendor.name
      );
      let priceVolatility = 0;
      let priceScore = 80;
      if (vendorPrices.length >= 2) {
        const sorted = [...vendorPrices].sort(
          (a, b) => new Date(a.recordDate || a.createdAt).getTime() - new Date(b.recordDate || b.createdAt).getTime()
        );
        const prices = sorted.map((p) => p.price || p.unitPrice || 0).filter((p) => p > 0);
        if (prices.length >= 2) {
          const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
          const variance = prices.reduce((s, v) => s + (v - avg) ** 2, 0) / prices.length;
          priceVolatility = avg > 0 ? Math.sqrt(variance) / avg : 0;
          priceScore = Math.max(0, 100 - priceVolatility * 200);
        }
      }

      // 综合风险评分（加权）
      const totalScore = Math.round(
        (100 - certScore) * 0.25 +
        (100 - qualityScore) * 0.35 +
        (100 - deliveryScore) * 0.25 +
        (100 - priceScore) * 0.15
      );

      let riskLevel: VendorRiskScore['riskLevel'] = 'low';
      if (totalScore > RISK_CONFIG.high.max) riskLevel = 'critical';
      else if (totalScore > RISK_CONFIG.medium.max) riskLevel = 'high';
      else if (totalScore > RISK_CONFIG.low.max) riskLevel = 'medium';

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorCode: vendor.code || '-',
        certExpired,
        certScore,
        defectRate,
        qualityScore,
        delayRate,
        deliveryScore,
        priceVolatility,
        priceScore,
        totalScore,
        riskLevel,
      };
    });
  }, [vendors, inspectionTasks, purchaseOrders, priceRecords]);

  const sortedScores = useMemo(
    () => [...riskScores].sort((a, b) => b.totalScore - a.totalScore),
    [riskScores]
  );

  const criticalCount = sortedScores.filter((s) => s.riskLevel === 'critical').length;
  const highCount = sortedScores.filter((s) => s.riskLevel === 'high').length;

  return (
    <PageWrapper title="供应商风险评分卡" subtitle="供应商多维度风险评估：资质/质量/交期/价格">
      {/* 风险概览 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#FEE2E2' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#DC2626' }}>{criticalCount}</Typography>
            <Typography variant="caption">严重风险</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#FEF2F2' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#EF4444' }}>{highCount}</Typography>
            <Typography variant="caption">高风险</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#FFFBEB' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#F59E0B' }}>
              {sortedScores.filter((s) => s.riskLevel === 'medium').length}
            </Typography>
            <Typography variant="caption">中风险</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#ECFDF5' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#10B981' }}>
              {sortedScores.filter((s) => s.riskLevel === 'low').length}
            </Typography>
            <Typography variant="caption">低风险</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 风险评分卡表格 */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">资质分数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">质量分数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">交期分数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">价格分数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">综合风险</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>风险等级</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedScores.map((score) => {
              const cfg = RISK_CONFIG[score.riskLevel];
              return (
                <TableRow key={score.vendorId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{score.vendorName}</Typography>
                    <Typography variant="caption" color="text.secondary">{score.vendorCode}</Typography>
                  </TableCell>
                  <TableCell align="center" data-testid="vr-risk-score">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate"
                        value={score.certScore}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: score.certScore >= 70 ? '#10B981' : score.certScore >= 40 ? '#F59E0B' : '#EF4444',
                          },
                        }}
                      />
                      <Typography variant="caption">{score.certScore}</Typography>
                    </Box>
                    {score.certExpired && (
                      <Chip size="small" label="资质过期" color="error" sx={{ mt: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate"
                        value={score.qualityScore}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: score.qualityScore >= 70 ? '#10B981' : score.qualityScore >= 40 ? '#F59E0B' : '#EF4444',
                          },
                        }}
                      />
                      <Typography variant="caption">{score.qualityScore}</Typography>
                    </Box>
                    {score.defectRate > 0 && (
                      <Typography variant="caption" color="error">
                        不良率 {((score.defectRate) * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate"
                        value={score.deliveryScore}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: score.deliveryScore >= 70 ? '#10B981' : score.deliveryScore >= 40 ? '#F59E0B' : '#EF4444',
                          },
                        }}
                      />
                      <Typography variant="caption">{score.deliveryScore}</Typography>
                    </Box>
                    {score.delayRate > 0 && (
                      <Typography variant="caption" color="warning.main">
                        延迟率 {((score.delayRate) * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate"
                        value={score.priceScore}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#E5E7EB',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: score.priceScore >= 70 ? '#10B981' : score.priceScore >= 40 ? '#F59E0B' : '#EF4444',
                          },
                        }}
                      />
                      <Typography variant="caption">{score.priceScore}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: score.totalScore >= 60 ? '#EF4444' : score.totalScore >= 30 ? '#F59E0B' : '#10B981' }}
                    >
                      {score.totalScore}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={cfg.label}
                      sx={{
                        bgcolor: cfg.bg,
                        color: score.riskLevel === 'critical' ? '#DC2626' : score.riskLevel === 'high' ? '#EF4444' : score.riskLevel === 'medium' ? '#F59E0B' : '#10B981',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {sortedScores.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8' }}>
                  暂无供应商数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </PageWrapper>
  );
};

export default VendorRisk;
