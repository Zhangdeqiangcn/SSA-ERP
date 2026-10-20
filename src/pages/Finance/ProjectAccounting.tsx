import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Stack, LinearProgress, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useFinanceStore } from '@/stores/financeStore';
import { ProjectAccount } from '@/types';
import { PageWrapper } from '@/components/layout';
import { formatCurrency } from '@/utils/format';
import { computeGrossMargin, formatGrossMargin } from '@/utils/grossProfit'; // S-10 毛利口径统一

const CATEGORY_LABELS: Record<string, string> = {
  material: '材料', labor: '人工', equipment: '设备', outsource: '外协', overhead: '制造费用', other: '其他',
};

const ProjectAccounting: React.FC = () => {
  const { projectAccounts } = useFinanceStore();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ProjectAccount | null>(null);

  return (
    <PageWrapper title="项目核算">
      {/* 统计 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '核算项目数', value: projectAccounts.length + ' 个', color: '#6366F1' },
          { label: '项目总预算', value: formatCurrency(projectAccounts.reduce((s, a) => s + a.totalBudget, 0)), color: '#3B82F6' },
          { label: '项目总收入', value: formatCurrency(projectAccounts.reduce((s, a) => s + a.revenue, 0)), color: '#10B981' },
          { label: '总毛利', value: formatCurrency(projectAccounts.reduce((s, a) => s + a.grossProfit, 0)), color: '#8B5CF6' },
        ].map(s => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 核算列表 */}
      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>核算单号</TableCell>
                <TableCell>项目编号</TableCell>
                <TableCell>项目名称</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>核算期间</TableCell>
                <TableCell align="right">总预算</TableCell>
                <TableCell align="right">实际成本</TableCell>
                <TableCell align="right">偏差</TableCell>
                <TableCell align="right">收入</TableCell>
                <TableCell align="right">毛利</TableCell>
                <TableCell align="right">毛利率</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projectAccounts.map(a => (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" color="#3B82F6" fontWeight={500}>{a.accountNo}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{a.projectNo}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2" fontWeight={500}>{a.projectName}</Typography></TableCell>
                  <TableCell>{a.customerName}</TableCell>
                  <TableCell>{a.period}</TableCell>
                  <TableCell align="right">{formatCurrency(a.totalBudget)}</TableCell>
                  <TableCell align="right">{formatCurrency(a.totalActual)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${a.totalVariance >= 0 ? '+' : ''}${formatCurrency(a.totalVariance)}`}
                      size="small"
                      color={a.totalVariance >= 0 ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500} color="#10B981">{formatCurrency(a.revenue)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(a.grossProfit)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {/* S-10 毛利口径统一：成本口径 = 项目实际成本（totalActual） */}
                    <Typography variant="body2" color={computeGrossMargin(a.revenue, a.totalActual) > 20 ? '#10B981' : computeGrossMargin(a.revenue, a.totalActual) > 0 ? '#F59E0B' : '#EF4444'}>
                      {formatGrossMargin(computeGrossMargin(a.revenue, a.totalActual))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={a.status === 'draft' ? '草稿' : a.status === 'submitted' ? '已提交' : '已审批'} size="small"
                      color={a.status === 'approved' ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Visibility />}
                      onClick={() => { setSelectedAccount(a); setDetailOpen(true); }}>
                      明细
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 明细弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          成本明细 — {selectedAccount?.projectName}（{selectedAccount?.projectNo}）
        </DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Stack spacing={2} mt={1}>
              <Grid container spacing={2}>
                  {[
                  { label: '总预算', value: formatCurrency(selectedAccount.totalBudget) },
                  { label: '实际成本', value: formatCurrency(selectedAccount.totalActual) },
                  { label: '收入', value: formatCurrency(selectedAccount.revenue) },
                  { label: '毛利', value: `${formatCurrency(selectedAccount.grossProfit)}（${formatGrossMargin(computeGrossMargin(selectedAccount.revenue, selectedAccount.totalActual))}）` },
                ].map(kpi => (
                  <Grid item xs={6} key={kpi.label}>
                    <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                      <Typography variant="body1" fontWeight={600}>{kpi.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" fontWeight={600}>费用明细</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>类别</TableCell>
                    <TableCell>描述</TableCell>
                    <TableCell align="right">预算</TableCell>
                    <TableCell align="right">实际</TableCell>
                    <TableCell align="right">偏差</TableCell>
                    <TableCell align="right">偏差率</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAccount.costItems.map(ci => (
                    <TableRow key={ci.id}>
                      <TableCell><Chip label={CATEGORY_LABELS[ci.category] || ci.category} size="small" /></TableCell>
                      <TableCell>{ci.description}</TableCell>
                      <TableCell align="right">{formatCurrency(ci.budgetAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(ci.actualAmount)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={ci.variance >= 0 ? '#EF4444' : '#10B981'}>
                          {ci.variance >= 0 ? '+' : ''}{formatCurrency(ci.variance)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${ci.variancePercent >= 0 ? '+' : ''}${ci.variancePercent}%`}
                          size="small"
                          color={ci.variancePercent >= 0 ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default ProjectAccounting;
