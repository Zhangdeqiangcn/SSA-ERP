import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, TextField, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Snackbar, Alert, Chip,
  IconButton, Input, LinearProgress,
} from '@mui/material';
import {
  Receipt as ReceiptIcon, DocumentScanner as ScanIcon,
  AutoAwesome as AweIcon, CloudUpload as UploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
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
  rawText?: string;
  confidence?: number;
  duration?: number;
}

interface OcrHistoryItem {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  seller: string;
  buyer: string;
  amount: number;
  taxAmount: number;
  total: number;
  voucherNo: string;
  createdAt: string;
}

function parseInvoice(text: string): ParsedInvoice {
  const pick = (label: string) => {
    const m = text.match(new RegExp(`${label}[：:\\s]*([^\\n]+)`));
    return m ? m[1].trim() : '';
  };
  const num = (label: string) => {
    const v = pick(label).replace(/[, ¥￥]/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  return {
    invoiceNo: pick('发票号码') || pick('发票代码') || pick('No') || '',
    invoiceDate: pick('开票日期') || pick('日期') || '',
    buyer: pick('购买方') || pick('购方') || '',
    seller: pick('销售方') || pick('销方') || '',
    amount: num('金额'),
    taxRate: pick('税率'),
    taxAmount: num('税额'),
    total: num('价税合计') || num('合计'),
  };
}

export default function InvoiceOcr() {
  const addAccountEntry = useFinanceStore((s) => s.addAccountEntry);
  const addOcrHistory = useAnalyticsStore((s) => s.addOcrHistory);
  const history = useAnalyticsStore((s) => s.ocrHistory);

  const [text, setText] = useState<string>(SAMPLE_INVOICE);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [snack, setSnack] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // 文本模式识别
  const handleRecognize = () => {
    const result = parseInvoice(text);
    setParsed(result);
  };

  // 图片上传识别（调用后端 OCR API）
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('language', 'chi_sim+eng');

    try {
      const resp = await fetch('/api/ocr/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'OCR 识别失败');
      }

      const result = await resp.json();
      if (result.success) {
        const { data } = result;
        setParsed({
          invoiceNo: data.invoiceNo || '',
          invoiceDate: data.invoiceDate || '',
          buyer: data.buyer || '',
          seller: data.seller || '',
          amount: data.amount || 0,
          taxRate: data.taxRate || '',
          taxAmount: data.taxAmount || 0,
          total: data.total || 0,
          rawText: data.rawText,
          confidence: data.confidence,
          duration: data.duration,
        });
        setSnack(`识别完成！置信度 ${Math.round(data.confidence || 0)}%，耗时 ${data.duration}s`);
      } else {
        setSnack(result.error || '识别失败');
      }
    } catch (err: any) {
      setSnack(err.message || 'OCR 识别失败');
    } finally {
      setUploading(false);
      setProgress(0);
    }
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
      updatedBy: '智能分析',
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
    } as OcrHistoryItem);
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
        <Chip size="small" label="Tesseract.js 内置 OCR" color="success" variant="outlined" />
      </Stack>

      <Grid container spacing={2}>
        {/* 左侧：输入区域 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                上传发票图片或粘贴文本
              </Typography>

              {/* 图片上传区域 */}
              <Box
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  p: 3,
                  mb: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
                onClick={() => document.getElementById('file-input')?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file?.type.startsWith('image/')) handleImageUpload(file);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {previewUrl ? (
                  <Box>
                    <img
                      src={previewUrl}
                      alt="发票预览"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      点击更换图片
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      点击上传或拖拽发票图片至此
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      支持 PNG、JPEG、BMP 格式
                    </Typography>
                  </>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </Box>

              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    OCR 识别中... {Math.round(progress)}%
                  </Typography>
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                或手动粘贴发票文本
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
                <Button
                  variant="outlined"
                  startIcon={<ScanIcon />}
                  onClick={() => setText(SAMPLE_INVOICE)}
                  data-testid="ocr-sample"
                >
                  加载示例
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ScanIcon />}
                  onClick={handleRecognize}
                  data-testid="ocr-recognize"
                >
                  文本识别
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：识别结果 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                识别结果（可校正）
              </Typography>
              {!parsed ? (
                <Alert severity="info">
                  上传发票图片或粘贴文本后点击识别
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  <TextField
                    label="发票号码"
                    value={parsed.invoiceNo}
                    onChange={(e) => setField('invoiceNo', e.target.value)}
                    data-testid="ocr-invoice-no"
                  />
                  <TextField
                    label="开票日期"
                    value={parsed.invoiceDate}
                    onChange={(e) => setField('invoiceDate', e.target.value)}
                    data-testid="ocr-invoice-date"
                  />
                  <TextField
                    label="购买方"
                    value={parsed.buyer}
                    onChange={(e) => setField('buyer', e.target.value)}
                    data-testid="ocr-buyer"
                  />
                  <TextField
                    label="销售方"
                    value={parsed.seller}
                    onChange={(e) => setField('seller', e.target.value)}
                    data-testid="ocr-seller"
                  />
                  <TextField
                    label="金额(不含税)"
                    type="number"
                    value={parsed.amount}
                    onChange={(e) => setField('amount', e.target.value)}
                    data-testid="ocr-amount"
                  />
                  <TextField
                    label="税额"
                    type="number"
                    value={parsed.taxAmount}
                    onChange={(e) => setField('taxAmount', e.target.value)}
                    data-testid="ocr-tax"
                  />
                  <TextField
                    label="价税合计"
                    type="number"
                    value={parsed.total}
                    onChange={(e) => setField('total', e.target.value)}
                    data-testid="ocr-total"
                  />
                  {parsed.confidence !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      置信度: {Math.round(parsed.confidence)}% | 耗时: {parsed.duration}s
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<AweIcon />}
                    onClick={handleGenerate}
                    data-testid="ocr-generate"
                  >
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

      {/* 历史记录 */}
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
