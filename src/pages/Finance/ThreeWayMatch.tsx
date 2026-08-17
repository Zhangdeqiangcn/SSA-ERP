import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Stack, Alert, TextField, Card, CardContent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useFinanceStore } from '@/stores/financeStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { calcTaxTotals } from '@/utils/tax';

// 归一化：去除非字母数字，便于不同编码风格（PO-2024-0321 vs PO20240506001）匹配
const norm = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

interface MatchRow {
  invoiceId: string;
  invoiceNo: string;
  vendorName: string;
  purchaseOrderNo: string;
  amount: number;
  poGrandTotal: number;
  poAmount: number;
  poQty: number;
  grQty: number;
  qtyDiff: number;
  invoiceUnitPrice: number;
  poUnitPrice: number;
  priceDiff: number;
  amountDiff: number;
  status: string;
  poMatched: boolean;
  receiptMatched: boolean;
  amountMatched: boolean;
  fullyMatched: boolean;
}

export default function ThreeWayMatch() {
  const invoices = useFinanceStore((s) => s.invoices);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const [nonce, setNonce] = useState(0);
  const [warnThreshold, setWarnThreshold] = useState(5);
  const [errorThreshold, setErrorThreshold] = useState(10);

  const rows = useMemo<MatchRow[]>(() => {
    void nonce; // 手动刷新触发重算
    return invoices.map((inv) => {
      const po = purchaseOrders.find(
        (o) => norm(o.orderNo) === norm(inv.purchaseOrderNo)
      );
      const poMatched = !!po;
      // PO 价税合计（含税总额）：优先取已算字段，兼容未迁移单据现算
      const poGrandTotal = po
        ? po.grandTotal ?? calcTaxTotals(po.items).grandTotal
        : 0;
      const poAmount = po ? po.totalAmount : 0;
      // 发票 totalAmount 即为价税合计，二者比对口径统一为「含税」
      const invoiceTotal = inv.totalAmount;
      const amountMatched =
        poMatched && Math.abs(invoiceTotal - poGrandTotal) < 0.01;

      // 数量计算：PO 订单数量 vs 入库数量
      const poQty = po
        ? po.items.reduce((sum, item) => sum + (item.orderedQuantity || 0), 0)
        : 0;
      const grOrders = inboundOrders.filter(
        (o) => o.type === 'purchase' && norm(o.sourceNo) === norm(inv.purchaseOrderNo)
      );
      const grQty = grOrders.reduce(
        (sum, o) => sum + o.items.reduce((s, item) => s + (item.actualQuantity || 0), 0),
        0
      );
      const qtyDiff = grQty - poQty;

      // 价格计算：发票平均单价 vs PO 平均单价（均不含税）
      const invoiceUnitPrice = poQty > 0 ? inv.amount / poQty : 0;
      const poUnitPrice = poQty > 0 ? poAmount / poQty : 0;
      const priceDiff = invoiceUnitPrice - poUnitPrice;

      // 金额差异：发票不含税金额 − PO 不含税金额
      const amountDiff = inv.amount - poAmount;

      const receiptMatched = inboundOrders.some(
        (o) => o.type === 'purchase' && norm(o.sourceNo) === norm(inv.purchaseOrderNo)
      );

      return {
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        vendorName: inv.vendorName,
        purchaseOrderNo: inv.purchaseOrderNo,
        amount: invoiceTotal,
        poGrandTotal,
        poAmount,
        poQty,
        grQty,
        qtyDiff,
        invoiceUnitPrice,
        poUnitPrice,
        priceDiff,
        amountDiff,
        status: inv.status,
        poMatched,
        receiptMatched,
        amountMatched,
        fullyMatched: poMatched && receiptMatched,
      };
    });
  }, [invoices, purchaseOrders, inboundOrders, nonce]);

  const matchedCount = rows.filter((r) => r.fullyMatched).length;
  const amountMatchedCount = rows.filter((r) => r.amountMatched).length;

  // 差异汇总统计（仅计算已匹配 PO 的行）
  const rowsWithPo = rows.filter((r) => r.poMatched);
  const qtyDiffCount = rowsWithPo.filter((r) => Math.abs(r.qtyDiff) > 0.005).length;
  const priceDiffCount = rowsWithPo.filter((r) => Math.abs(r.priceDiff) > 0.005).length;
  const amountDiffCount = rowsWithPo.filter((r) => Math.abs(r.amountDiff) > 0.01).length;

  // 行高亮样式：任一差异超过阈值则高亮
  const getRowStyle = (r: MatchRow) => {
    if (!r.poMatched) return {};
    const qtyPct = r.poQty > 0 ? Math.abs(r.qtyDiff) / r.poQty * 100 : 0;
    const pricePct = r.poUnitPrice > 0 ? Math.abs(r.priceDiff) / r.poUnitPrice * 100 : 0;
    const amountPct = r.poAmount > 0 ? Math.abs(r.amountDiff) / r.poAmount * 100 : 0;
    const maxPct = Math.max(qtyPct, pricePct, amountPct);
    if (maxPct > errorThreshold) return { backgroundColor: '#ffebee' };
    if (maxPct > warnThreshold) return { backgroundColor: '#fff8e1' };
    return {};
  };

  // 渲染差异单元格：根据百分比着色
  const getDiffColor = (value: number, baseValue: number): 'error' | 'warning' | undefined => {
    if (baseValue === 0) return undefined;
    const pct = Math.abs(value) / Math.abs(baseValue) * 100;
    if (pct > errorThreshold) return 'error';
    if (pct > warnThreshold && Math.abs(value) > 0.001) return 'warning';
    return undefined;
  };

  const fmtDiff = (value: number, decimals = 2) => {
    const sign = value > 0 ? '+' : '';
    const fixed = value.toFixed(decimals);
    return `${sign}${fixed}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>三单匹配</Typography>
        <Box flex={1} />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          size="small"
          data-testid="twm-refresh"
          onClick={() => setNonce((n) => n + 1)}
        >
          刷新匹配
        </Button>
      </Box>

      {/* 差异阈值配置 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          差异阈值配置
        </Typography>
        <Stack direction="row" spacing={3}>
          <TextField
            label="警告阈值 (%)"
            type="number"
            size="small"
            value={warnThreshold}
            onChange={(e) => setWarnThreshold(Number(e.target.value) || 0)}
            inputProps={{ min: 0, max: 100, step: 1, 'data-testid': 'twm-warn-threshold' }}
            sx={{ width: 140 }}
          />
          <TextField
            label="错误阈值 (%)"
            type="number"
            size="small"
            value={errorThreshold}
            onChange={(e) => setErrorThreshold(Number(e.target.value) || 0)}
            inputProps={{ min: 0, max: 100, step: 1, 'data-testid': 'twm-error-threshold' }}
            sx={{ width: 140 }}
          />
          <Box flex={1} display="flex" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              差异百分比超过警告阈值显示黄色，超过错误阈值显示红色
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Alert severity="info" sx={{ mb: 2 }} data-testid="twm-summary">
        共 {rows.length} 张发票，其中 {matchedCount} 张完成「采购单 + 收货单」三单匹配，{amountMatchedCount} 张发票含税金额与采购单价税合计一致。
      </Alert>

      {/* 差异汇总卡片 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} data-testid="twm-diff-summary">
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="body2" color="text.secondary">匹配总行数</Typography>
            <Typography variant="h5" fontWeight={700} data-testid="twm-match-total">
              {rowsWithPo.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="body2" color="text.secondary">数量差异行数</Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              color={qtyDiffCount > 0 ? 'error' : undefined}
              data-testid="twm-qty-diff-count"
            >
              {qtyDiffCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="body2" color="text.secondary">价格差异行数</Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              color={priceDiffCount > 0 ? 'error' : undefined}
              data-testid="twm-price-diff-count"
            >
              {priceDiffCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="body2" color="text.secondary">金额差异行数</Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              color={amountDiffCount > 0 ? 'error' : undefined}
              data-testid="twm-amount-diff-count"
            >
              {amountDiffCount}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>发票号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>关联采购单</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>发票价税合计</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>采购单价税合计</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>数量差异</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>价格差异</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>金额差异</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>金额匹配</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>发票状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>采购单</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>收货单</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>匹配结果</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const qtyColor = getDiffColor(r.qtyDiff, r.poQty);
                const priceColor = getDiffColor(r.priceDiff, r.poUnitPrice);
                const amountColor = getDiffColor(r.amountDiff, r.poAmount);
                return (
                <TableRow key={r.invoiceId} hover sx={getRowStyle(r)} data-testid="three-way-row">
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{r.invoiceNo}</Typography>
                  </TableCell>
                  <TableCell>{r.vendorName}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{r.purchaseOrderNo}</Typography>
                  </TableCell>
                  <TableCell align="right">¥{r.amount.toLocaleString()}</TableCell>
                  <TableCell align="right" data-testid="twm-po-grand">
                    {r.poMatched ? `¥${r.poGrandTotal.toLocaleString()}` : '—'}
                  </TableCell>
                  {/* 数量差异 */}
                  <TableCell align="right" data-testid="twm-qty-diff">
                    {r.poMatched ? (
                      <Typography
                        variant="body2"
                        color={qtyColor === 'error' ? 'error' : qtyColor === 'warning' ? '#f57c00' : undefined}
                        fontWeight={qtyColor ? 600 : undefined}
                      >
                        {fmtDiff(r.qtyDiff, 2)}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  {/* 价格差异 */}
                  <TableCell align="right" data-testid="twm-price-diff">
                    {r.poMatched ? (
                      <Typography
                        variant="body2"
                        color={priceColor === 'error' ? 'error' : priceColor === 'warning' ? '#f57c00' : undefined}
                        fontWeight={priceColor ? 600 : undefined}
                      >
                        ¥{fmtDiff(r.priceDiff, 2)}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  {/* 金额差异 */}
                  <TableCell align="right" data-testid="twm-amount-diff">
                    {r.poMatched ? (
                      <Typography
                        variant="body2"
                        color={amountColor === 'error' ? 'error' : amountColor === 'warning' ? '#f57c00' : undefined}
                        fontWeight={amountColor ? 600 : undefined}
                      >
                        ¥{fmtDiff(r.amountDiff, 2)}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={r.amountMatched ? '一致' : (r.poMatched ? '不符' : '—')}
                      size="small"
                      color={r.amountMatched ? 'success' : (r.poMatched ? 'error' : 'default')}
                      data-testid="twm-amount-match"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.poMatched ? '已匹配' : '未匹配'}
                      size="small"
                      color={r.poMatched ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.receiptMatched ? '已匹配' : '未匹配'}
                      size="small"
                      color={r.receiptMatched ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={r.fullyMatched ? '三单匹配' : '不匹配'}
                        size="small"
                        color={r.fullyMatched ? 'success' : 'warning'}
                        data-testid={r.fullyMatched ? 'twm-ok' : 'twm-no'}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
