import React, { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Grid, Alert, LinearProgress,
} from '@mui/material';
import { Warning, Star } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomerStore } from '@/stores/customerStore';

type CustomerClass = 'A' | 'B' | 'C';
const CLASS_CONFIG: Record<CustomerClass, { label: string; color: string; bg: string }> = {
  A: { label: 'A类(核心客户)', color: '#EF4444', bg: '#FEE2E2' },
  B: { label: 'B类(重要客户)', color: '#F59E0B', bg: '#FFFBEB' },
  C: { label: 'C类(一般客户)', color: '#10B981', bg: '#ECFDF5' },
};

const dayDiff = (d: string) => {
  const now = new Date();
  return Math.round((now.getTime() - new Date(d).getTime()) / 86400000);
};

const CustomerABC: React.FC = () => {
  const { salesOrders } = useSalesStore();
  const { customers } = useCustomerStore();

  const analysis = useMemo(() => {
    // 按客户聚合销售额
    const customerSales: Record<string, {
      customerId: string;
      customerName: string;
      customerCode: string;
      totalAmount: number;
      orderCount: number;
      lastOrderDate: string;
    }> = {};

    salesOrders.forEach((order) => {
      const key = order.customerName || order.customerId || 'unknown';
      if (!customerSales[key]) {
        customerSales[key] = {
          customerId: order.customerId || '',
          customerName: order.customerName || '未知',
          customerCode: order.customerCode || '',
          totalAmount: 0,
          orderCount: 0,
          lastOrderDate: order.orderDate || order.createdAt || '',
        };
      }
      const entry = customerSales[key];
      entry.totalAmount += order.totalAmount || 0;
      entry.orderCount++;
      const orderDate = order.orderDate || order.createdAt || '';
      if (orderDate > entry.lastOrderDate) {
        entry.lastOrderDate = orderDate;
      }
    });

    // 补充没有订单的客户
    customers.forEach((c) => {
      if (!customerSales[c.name] && !customerSales[c.id]) {
        customerSales[c.name] = {
          customerId: c.id,
          customerName: c.name,
          customerCode: c.code || '',
          totalAmount: 0,
          orderCount: 0,
          lastOrderDate: '',
        };
      }
    });

    // 转换为数组并按销售额排序
    let sorted = Object.values(customerSales).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalSales = sorted.reduce((sum, c) => sum + c.totalAmount, 0);

    // ABC 分类
    let cumulative = 0;
    const classified = sorted.map((item) => {
      cumulative += item.totalAmount;
      const pct = totalSales > 0 ? cumulative / totalSales : 0;
      let cls: CustomerClass = 'C';
      if (pct <= 0.70) cls = 'A';
      else if (pct <= 0.90) cls = 'B';
      return { ...item, cumulativePct: pct, cls };
    });

    // 流失预警：超过90天未下单的客户
    const today = new Date().toISOString().slice(0, 10);
    const churnCustomers = classified.filter((c) => {
      if (!c.lastOrderDate || c.totalAmount === 0) return false;
      return dayDiff(c.lastOrderDate) > 90;
    });

    // 统计
    const classCount = { A: 0, B: 0, C: 0 };
    const classValue = { A: 0, B: 0, C: 0 };
    classified.forEach((c) => {
      classCount[c.cls]++;
      classValue[c.cls] += c.totalAmount;
    });

    return { items: classified, totalSales, classCount, classValue, churnCustomers };
  }, [salesOrders, customers]);

  return (
    <PageWrapper title="客户 ABC 分析" subtitle="按销售额分类客户，识别核心客户与流失风险">
      {/* ABC 概览 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(['A', 'B', 'C'] as CustomerClass[]).map((cls) => (
          <Grid item xs={4} key={cls}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: CLASS_CONFIG[cls].bg }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: CLASS_CONFIG[cls].color }}>
                {analysis.classCount[cls]}
              </Typography>
              <Typography variant="caption">{CLASS_CONFIG[cls].label}</Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                销售额：{analysis.classValue[cls].toLocaleString()} 元
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 流失预警 */}
      {analysis.churnCustomers.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<Warning />}>
          <Typography variant="subtitle2" fontWeight={600}>
            客户流失预警：{analysis.churnCustomers.length} 个客户超过90天未下单！
          </Typography>
          <Typography variant="body2">
            {analysis.churnCustomers.map((c) => c.customerName).join('、')}
          </Typography>
        </Alert>
      )}

      {/* ABC 分类表 */}
      <Paper sx={{ borderRadius: 2 }} data-testid="cabc-table">
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            客户 ABC 分类明细（按销售额排名：A类前70% / B类70-90% / C类90-100%）
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>排名</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>客户名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">订单数</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">销售额(元)</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">销售额占比</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">累计占比</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>分类</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>最近下单</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>流失预警</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analysis.items.map((item, idx) => {
                const salesPct = analysis.totalSales > 0 ? (item.totalAmount / analysis.totalSales * 100) : 0;
                const churnDays = item.lastOrderDate ? dayDiff(item.lastOrderDate) : 0;
                const isChurn = churnDays > 90 && item.totalAmount > 0;
                const cfg = CLASS_CONFIG[item.cls];
                return (
                  <TableRow key={idx} hover sx={{ bgcolor: isChurn ? '#FFF5F5' : undefined }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.cls === 'A' && <Star sx={{ fontSize: 16, color: cfg.color }} />}
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{item.customerName}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.customerCode}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{item.orderCount}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color={cfg.color}>
                        {item.totalAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(salesPct, 100)}
                          sx={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#E5E7EB',
                            '& .MuiLinearProgress-bar': { bgcolor: cfg.color },
                          }}
                        />
                        <Typography variant="caption">{salesPct.toFixed(1)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {(item.cumulativePct * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={cfg.label}
                        sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {item.lastOrderDate ? item.lastOrderDate.slice(0, 10) : '-'}
                    </TableCell>
                    <TableCell data-testid="cabc-churn">
                      {isChurn ? (
                        <Chip
                          size="small"
                          label={`${churnDays}天未下单`}
                          sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}
                        />
                      ) : (
                        <Chip size="small" label="正常" sx={{ bgcolor: '#ECFDF5', color: '#10B981' }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {analysis.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94A3B8' }}>
                    暂无客户销售数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </PageWrapper>
  );
};

export default CustomerABC;
