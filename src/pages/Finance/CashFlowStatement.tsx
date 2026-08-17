import React, { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Stack, Alert, Divider,
} from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { useSalesStore } from '@/stores/salesStore';
import { useFinanceStore } from '@/stores/financeStore';
import { formatCurrency } from '@/utils/format';
import { BarChart } from '@mui/x-charts/BarChart';

interface Line {
  label: string;
  inflow?: number;
  outflow?: number;
}
interface Section {
  title: string;
  lines: Line[];
  note?: string;
}

const CashFlowStatement: React.FC = () => {
  const { salesOrders } = useSalesStore();
  const { invoices, paymentPlans } = useFinanceStore();

  const data = useMemo(() => {
    // 经营活动（基于真实业务数据）
    const operatingInflow = salesOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const purchasePaid = paymentPlans.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const taxPaid = invoices.reduce((s, i) => s + (i.taxAmount || 0), 0);
    const salaryPaid = 520000; // 示例：支付给职工
    const otherPaid = 130000; // 示例：其他经营支出
    const operatingOutflow = purchasePaid + taxPaid + salaryPaid + otherPaid;
    const operatingNet = operatingInflow - operatingOutflow;

    // 投资活动（示例数据）
    const investingInflow = 0;
    const investingOutflow = 800000; // 示例：购建固定资产
    const investingNet = investingInflow - investingOutflow;

    // 筹资活动（示例数据）
    const financingInflow = 1000000; // 示例：取得借款
    const financingOutflow = 600000; // 示例：偿还债务
    const financingNet = financingInflow - financingOutflow;

    const netIncrease = operatingNet + investingNet + financingNet;
    const beginningBalance = 2000000; // 示例：期初现金余额
    const endingBalance = beginningBalance + netIncrease;

    const sections: Section[] = [
      {
        title: '一、经营活动产生的现金流量',
        lines: [
          { label: '销售商品、提供劳务收到的现金', inflow: operatingInflow },
          { label: '收到的其他与经营活动有关的现金', inflow: 0 },
          { label: '购买商品、接受劳务支付的现金', outflow: purchasePaid },
          { label: '支付给职工以及为职工支付的现金', outflow: salaryPaid },
          { label: '支付的各项税费', outflow: taxPaid },
          { label: '支付的其他与经营活动有关的现金', outflow: otherPaid },
        ],
        note: '经营活动数据基于销售订单与付款计划',
      },
      {
        title: '二、投资活动产生的现金流量',
        lines: [
          { label: '收回投资及取得投资收益收到的现金', inflow: investingInflow },
          { label: '购建固定资产、无形资产支付的现金', outflow: investingOutflow },
        ],
        note: '投资活动为示例数据',
      },
      {
        title: '三、筹资活动产生的现金流量',
        lines: [
          { label: '取得借款收到的现金', inflow: financingInflow },
          { label: '偿还债务支付的现金', outflow: financingOutflow },
        ],
        note: '筹资活动为示例数据',
      },
    ];

    return {
      sections,
      operatingNet, investingNet, financingNet, netIncrease, beginningBalance, endingBalance,
      operatingInflow, operatingOutflow,
    };
  }, [salesOrders]);

  const chartData = [data.operatingNet, data.investingNet, data.financingNet];

  return (
    <PageWrapper
      title="现金流量表"
      subtitle="经营 / 投资 / 筹资活动现金流量（对标 SAP / 用友 / 金蝶 标准现金流量表）"
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        经营活动数据取自销售订单与付款计划；投资/筹资及职工薪酬为示例数据，可在财务设置中接入真实台账。
      </Alert>

      {/* 三类活动净额图表 */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>三类活动现金流量净额</Typography>
        <Box sx={{ height: 300 }}>
          <BarChart
            xAxis={[{ scaleType: 'band', data: ['经营活动', '投资活动', '筹资活动'] }]}
            series={[{
              data: chartData,
              color: '#3B82F6',
              valueFormatter: (v) => formatCurrency(v ?? 0),
            }]}
            height={300}
          />
        </Box>
      </Paper>

      {/* 现金流量表主体 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {data.sections.map((sec, idx) => {
          const secNet = sec.lines.reduce((s, l) => s + (l.inflow || 0) - (l.outflow || 0), 0);
          return (
            <Box key={sec.title}>
              {idx > 0 && <Divider />}
              <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC' }}>
                <Typography variant="subtitle2" fontWeight={700}>{sec.title}</Typography>
                {sec.note && <Typography variant="caption" color="text.secondary">{sec.note}</Typography>}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {sec.lines.map((l) => (
                      <TableRow key={l.label} hover>
                        <TableCell sx={{ pl: 4 }}>{l.label}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                          {l.inflow ? formatCurrency(l.inflow) : l.outflow ? `(${formatCurrency(l.outflow)})` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ pl: 4, fontWeight: 700 }}>小计</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace', color: secNet >= 0 ? '#10B981' : '#EF4444' }}>
                        {formatCurrency(secNet)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}

        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>五、现金及现金等价物净增加额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace', color: data.netIncrease >= 0 ? '#10B981' : '#EF4444' }}>
                  {formatCurrency(data.netIncrease)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>加：期初现金及现金等价物余额</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatCurrency(data.beginningBalance)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>六、期末现金及现金等价物余额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1D4ED8' }}>{formatCurrency(data.endingBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Stack direction="row" spacing={4} sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">经营活动流入：<strong>{formatCurrency(data.operatingInflow)}</strong></Typography>
        <Typography variant="body2" color="text.secondary">经营活动流出：<strong>{formatCurrency(data.operatingOutflow)}</strong></Typography>
        <Typography variant="body2" color="text.secondary">净额：<strong style={{ color: data.operatingNet >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(data.operatingNet)}</strong></Typography>
      </Stack>
    </PageWrapper>
  );
};

export default CashFlowStatement;
