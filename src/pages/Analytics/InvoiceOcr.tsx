import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, TextField, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Snackbar, Alert, Chip,
} from '@mui/material';
import { Receipt as ReceiptIcon, DocumentScanner as ScanIcon, AutoAwesome as AweIcon } from '@mui/icons-material';
import { useFinanceStore } from '@/stores/financeStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import type { AccountEntry } from '@/types/finance';

const SAMPLE_INVOICE = `增值税专用发票
发票号码：24417000000123456789
开票日期：2026-06-18
购买方：上海智造科技有限公司
销售方：苏州精密零件制造厂
金额：10000.00
税率：13%
税额：1300.00
价税合计：11700.00`;

interface ParsedInvoice {
  invoiceNo: string;
  invoiceDate: string;
  buyer: string;
  seller: string;
  amount: number;
  taxRate: string;
  taxAmount: number;
  total: number;
}

function parseInvoice(text: string): ParsedInvoice {
  const pick = (label: string) => {
    const m = text.match(new RegExp(`${label}[：:]\\s*([^\\n]+)`));
    return m ? m[1].trim() : '';
  };
  const num = (label: string) => {
    const v = pick(label).replace(/[, ¥￥]/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  return {
    invoiceNo: pick('发票号码'),
    invoiceDate: pick('开票日期'),
    buyer: pick('购买方'),
    seller: pick('销售方'),
    amount: num('金额'),
    taxRate: pick('税率'),
    taxAmount: num('税额'),
    total: num('价税合计'),
  };
}

export default function InvoiceOcr() {
  const addAccountEntry = useFinanceStore((s) => s.addAccountEntry);
  const addOcrHistory = useAnalyticsStore((s) => s.addOcrHistory);
  const history = useAnalyticsStore((s) => s.ocrHistory);

  const [text, setText] = useState<string>(SAMPLE_INVOICE);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [snack, setSnack] = useState<string>('');

  const handleRecognize = () => {
    setParsed(parseInvoice(text));
  };

  const handleGenerate = () => {
    if (!parsed || !parsed.invoiceNo) {
      setSnack('请先 OCR 识别并确认发票信息');
      return;
    }
    const voucherNo = `V-OCR-${Date.now()}`;
    const now = new Date().toISOString();
    const base = {
      date: parsed.invoiceDate || now.slice(0, 10),
      description: `采购发票${parsed.invoiceNo}入账（AI识别）`,
      currency: 'CNY',
      voucherNo,
      createdBy: '智能分析',
      createdAt: now,
      updatedAt: now,
    };
    const entries: AccountEntry[] = [
      { ...base, id: `JE-OCR-${Date.now()}-1`, entryNo: `JE-OCR-1`, debitAccount: '原材料', creditAccount: '', amount: parsed.amount },
      { ...base, id: `JE-OCR-${Date.now()}-2`, entryNo: `JE-OCR-2`, debitAccount: '应交税费-应交增值税', creditAccount: '', amount: parsed.taxAmount },
      { ...base, id: `JE-OCR-${Date.now()}-3`, entryNo: `JE-OCR-3`, debitAccount: '', creditAccount: '应付账款', amount: parsed.total },
    ];
    entries.forEach((e) => addAccountEntry(e));
    addOcrHistory({
      id: `OCR-${Date.now()}`,
      invoiceNo: parsed.invoiceNo,
      invoiceDate: parsed.invoiceDate,
      seller: parsed.seller,
      buyer: parsed.buyer,
      amount: parsed.amount,
      taxAmount: parsed.taxAmount,
      total: parsed.total,
      voucherNo,
      createdAt: now,
    });
    setSnack(`已生成凭证 ${voucherNo}`);
  };

  const setField = (key: keyof ParsedInvoice, value: string) => {
    if (!parsed) return;
    setParsed({ ...parsed, [key]: key === 'amount' || key === 'taxAmount' || key === 'total' ? Number(value) : value });
  };

  return (
    <Box sx={{ p: 3 }} data-testid="ocr">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <ReceiptIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          发票 OCR 与智能凭证
        </Typography>
        <Chip size="small" label="模拟AI识别→一键生成凭证" color="primary" variant="outlined" />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                发票原文（可粘贴 / 编辑）
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={9}
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid="ocr-input"
                sx={{ fontFamily: 'monospace', mb: 2 }}
              />
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ScanIcon />} onClick={() => setText(SAMPLE_INVOICE)} data-testid="ocr-sample">
                  加载示例
                </Button>
                <Button variant="contained" startIcon={<ScanIcon />} onClick={handleRecognize} data-testid="ocr-recognize">
                  OCR 识别
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                识别结果（可校正）
              </Typography>
              {!parsed ? (
                <Alert severity="info">点击「OCR 识别」解析发票字段</Alert>
              ) : (
                <Stack spacing={1.5}>
                  <TextField label="发票号码" value={parsed.invoiceNo} onChange={(e) => setField('invoiceNo', e.target.value)} data-testid="ocr-invoice-no" />
                  <TextField label="开票日期" value={parsed.invoiceDate} onChange={(e) => setField('invoiceDate', e.target.value)} data-testid="ocr-invoice-date" />
                  <TextField label="购买方" value={parsed.buyer} onChange={(e) => setField('buyer', e.target.value)} data-testid="ocr-buyer" />
                  <TextField label="销售方" value={parsed.seller} onChange={(e) => setField('seller', e.target.value)} data-testid="ocr-seller" />
                  <TextField label="金额(不含税)" type="number" value={parsed.amount} onChange={(e) => setField('amount', e.target.value)} data-testid="ocr-amount" />
                  <TextField label="税额" type="number" value={parsed.taxAmount} onChange={(e) => setField('taxAmount', e.target.value)} data-testid="ocr-tax" />
                  <TextField label="价税合计" type="number" value={parsed.total} onChange={(e) => setField('total', e.target.value)} data-testid="ocr-total" />
                  <Button variant="contained" color="success" startIcon={<AweIcon />} onClick={handleGenerate} data-testid="ocr-generate">
                    一键生成凭证
                  </Button>
                  <Alert severity="success" sx={{ mt: 1 }}>
                    凭证分录：借 原材料 / 应交税费-应交增值税；贷 应付账款
                  </Alert>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            识别与生成凭证历史
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>发票号码</TableCell>
                <TableCell>开票日期</TableCell>
                <TableCell>销售方</TableCell>
                <TableCell>不含税</TableCell>
                <TableCell>税额</TableCell>
                <TableCell>价税合计</TableCell>
                <TableCell>凭证号</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                history.map((h) => (
                  <TableRow key={h.id} data-testid="ocr-history-row">
                    <TableCell>{h.invoiceNo}</TableCell>
                    <TableCell>{h.invoiceDate}</TableCell>
                    <TableCell>{h.seller}</TableCell>
                    <TableCell>{h.amount}</TableCell>
                    <TableCell>{h.taxAmount}</TableCell>
                    <TableCell>{h.total}</TableCell>
                    <TableCell>{h.voucherNo}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
