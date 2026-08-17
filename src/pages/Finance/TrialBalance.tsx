import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFinanceStore } from '@/stores/financeStore';
import { computeTrialBalance } from '@/utils/finance';

const TYPE_LABEL: Record<string, { label: string; color: 'info' | 'success' | 'error' | 'default' }> = {
  asset: { label: '资产', color: 'info' },
  liability: { label: '负债', color: 'error' },
  equity: { label: '权益', color: 'success' },
  revenue: { label: '收入', color: 'success' },
  expense: { label: '费用', color: 'default' },
};

export default function TrialBalance() {
  const { accountEntries, chartOfAccounts } = useFinanceStore();
  const [nonce, setNonce] = useState(0);

  // 通过 nonce 强制在点击「刷新」时重算（数据来自 store，本就响应式，这里提供手动触发）
  const result = useMemo(
    () => computeTrialBalance(accountEntries, chartOfAccounts),
    [accountEntries, chartOfAccounts, nonce]
  );

  const balanced = Math.abs(result.totalDebit - result.totalCredit) < 0.005;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>科目余额表</Typography>
        <Box flex={1} />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          size="small"
          data-testid="tb-refresh"
          onClick={() => setNonce((n) => n + 1)}
        >
          刷新
        </Button>
      </Box>

      <Alert
        severity={balanced ? 'success' : 'warning'}
        sx={{ mb: 2 }}
        data-testid="tb-balance-alert"
      >
        {balanced
          ? `借贷平衡：借方合计 ¥${result.totalDebit.toLocaleString()} = 贷方合计 ¥${result.totalCredit.toLocaleString()}`
          : `借贷不平衡：借方 ¥${result.totalDebit.toLocaleString()} / 贷方 ¥${result.totalCredit.toLocaleString()}`}
      </Alert>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>科目类型</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>借方发生额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>贷方发生额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>余额</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.rows.map((row) => {
                const tc = TYPE_LABEL[row.type];
                return (
                  <TableRow key={row.code} hover data-testid="tb-row">
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.code}</Typography>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip label={tc.label} size="small" color={tc.color} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      {row.debit > 0
                        ? <Typography variant="body2" fontWeight={500}>¥{row.debit.toLocaleString()}</Typography>
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      {row.credit > 0
                        ? <Typography variant="body2" fontWeight={500}>¥{row.credit.toLocaleString()}</Typography>
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.balance < 0 ? 'error.main' : 'text.primary'}
                      >
                        {row.balance > 0 ? '借 ' : row.balance < 0 ? '贷 ' : ''}
                        ¥{Math.abs(row.balance).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* 合计行 */}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>合计</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }} data-testid="tb-total-debit">
                  ¥{result.totalDebit.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }} data-testid="tb-total-credit">
                  ¥{result.totalCredit.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
