import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Alert, AlertTitle, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, LinearProgress,
  Select, InputLabel, FormControl,
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Cancel, Warning, Download, Refresh,
  Delete, Visibility, FileCopy, Sort, FilterList,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// ── 发票核验结果 ──
interface VerifyResult {
  invoiceNo: string;
  type: string;
  isValid: boolean;
  status: 'valid' | 'invalid' | 'not_found' | 'error';
  message?: string;
  parsed?: {
    invoiceNumber: string;
    invoiceType: string;
    invoiceDate: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    sellerName?: string;
    buyerName?: string;
  };
  checkedAt: string;
}

// ── 发票类型映射 ──
const TYPE_MAP: Record<string, string> = {
  '01': '专票',
  '03': '机动车发票',
  '04': '普票',
  '05': '区块链电子发票',
  '09': '数电票',
  '10': '电子普通发票',
  '11': '卷式发票',
  '20': '电子专用发票',
};

// ── 手动输入表单 ──
interface ManualInvoice {
  type: string;
  code: string;
  number: string;
  date: string;
  amount: string;
  checkCode: string;
  totalAmount: string;
}

const INITIAL_FORM: ManualInvoice = {
  type: '09',
  code: '',
  number: '',
  date: '',
  amount: '',
  checkCode: '',
  totalAmount: '',
};

// ── 批量核验页面 ──
const InvoiceVerification: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<VerifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload' | 'clipboard'>('manual');

  // 手动输入
  const [form, setForm] = useState<ManualInvoice[]>([INITIAL_FORM]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clipboardRef = useRef<HTMLDivElement>(null);

  // 过滤
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const stats = {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => r.status === 'invalid' || r.status === 'not_found').length,
    error: results.filter(r => r.status === 'error').length,
  };

  const filteredResults = results.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    return true;
  });

  // 添加一行
  const addRow = () => {
    if (form.length < 100) setForm([...form, { ...INITIAL_FORM }]);
  };

  // 删除一行
  const removeRow = (index: number) => {
    if (form.length <= 1) return;
    setForm(form.filter((_, i) => i !== index));
  };

  // 更新表单
  const updateForm = (index: number, field: keyof ManualInvoice, value: string) => {
    const newForm = [...form];
    newForm[index] = { ...newForm[index], [field]: value };
    setForm(newForm);
  };

  // 文件上传处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          parseCSV(text);
        };
        reader.readAsText(file);
      }
    }
  };

  // 解析CSV
  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const newForms: ManualInvoice[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/);
      if (parts.length >= 4) {
        newForms.push({
          type: parts[0] || '09',
          code: parts[1] || '',
          number: parts[2] || '',
          date: parts[3] || '',
          amount: parts[4] || '',
          checkCode: parts[5] || '',
          totalAmount: parts[6] || '',
        });
      }
    }
    if (newForms.length > 0) {
      setForm(newForms);
      setActiveTab('manual');
    }
  };

  // 从剪贴板粘贴
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (text) parseCSV(text);
  };

  // 执行核验
  const handleVerify = async () => {
    const invoices = form
      .filter(f => f.number && f.date && f.amount)
      .map(f => ({
        type: f.type,
        code: f.code || undefined,
        number: f.number,
        date: f.date,
        amount: parseFloat(f.amount) || 0,
        checkCode: f.checkCode || undefined,
        totalAmount: parseFloat(f.totalAmount) || undefined,
      }));

    if (invoices.length === 0) {
      setError('请至少填写发票号码、开票日期和金额');
      return;
    }

    setSubmitting(true);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const resp = await fetch('/api/tax-gateway/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices, provider: 'manual' }),
      });

      const data = await resp.json();
      if (!data.success) throw new Error(data.error || '核验失败');

      setResults(data.data.results);
    } catch (e: any) {
      setError(e.message || '核验请求失败');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // 导出结果
  const exportResults = () => {
    const csv = [
      '发票号码,发票类型,查验结果,状态,核验时间,金额,税额,价税合计',
      ...results.map(r =>
        `${r.invoiceNo},${TYPE_MAP[r.type] || r.type},${r.isValid ? '通过' : '不通过'},${r.status},${r.checkedAt},${r.parsed?.amount || ''},${r.parsed?.taxAmount || ''},${r.parsed?.totalAmount || ''}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `发票核验结果_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // 清空结果
  const clearResults = () => {
    setResults([]);
    setForm([INITIAL_FORM]);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload color="primary" />
          <Typography variant="h5">数电票批量核验</Typography>
          <Chip label="P2-06" size="small" color="info" />
        </Box>
        {results.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Download />} variant="outlined" size="small" onClick={exportResults}>
              导出CSV
            </Button>
            <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={clearResults}>
              清空
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 统计卡片 */}
      {results.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography variant="h4" color="text.primary">{stats.total}</Typography>
                <Typography variant="caption" color="text.secondary">总核验数</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="h4" color="success.main">{stats.valid}</Typography>
                <Typography variant="caption" color="success.dark">查验通过</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', bgcolor: '#ffebee' }}>
              <CardContent>
                <Typography variant="h4" color="error.main">{stats.invalid}</Typography>
                <Typography variant="caption" color="error.dark">查验不通过</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ textAlign: 'center', bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h4" color="warning.main">{stats.error}</Typography>
                <Typography variant="caption" color="warning.dark">异常数</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 输入标签页 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', px: 2 }}>
            {[
              { key: 'manual', label: '手动输入', icon: <FileCopy /> },
              { key: 'upload', label: 'CSV上传', icon: <CloudUpload /> },
              { key: 'clipboard', label: '剪贴板粘贴', icon: <FileCopy /> },
            ].map(tab => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                startIcon={tab.icon}
                sx={{
                  borderBottom: activeTab === tab.key ? '2px solid primary.main' : '2px solid transparent',
                  color: activeTab === tab.key ? 'primary.main' : 'text.secondary',
                  '&:hover': { borderBottomColor: 'primary.main' },
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>
        </Box>

        <CardContent>
          {/* 手动输入 */}
          {activeTab === 'manual' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">发票明细（最多100张）</Typography>
                <Button size="small" onClick={addRow} disabled={form.length >= 100}>
                  + 添加一行
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>代码</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>号码</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>金额</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>校验码</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>合计</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {form.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Select
                            value={row.type}
                            size="small"
                            onChange={(e) => updateForm(index, 'type', e.target.value)}
                            sx={{ minWidth: 100 }}
                          >
                            {[
                              { v: '01', l: '专票' }, { v: '04', l: '普票' },
                              { v: '09', l: '数电票' }, { v: '10', l: '电普票' },
                              { v: '20', l: '电子专票' },
                            ].map(o => (
                              <MenuItem key={o.v} value={o.v}>{o.l}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.code}
                            onChange={(e) => updateForm(index, 'code', e.target.value)}
                            placeholder="数电票可空"
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.number}
                            onChange={(e) => updateForm(index, 'number', e.target.value)}
                            placeholder="必填"
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="date"
                            size="small"
                            value={row.date}
                            onChange={(e) => updateForm(index, 'date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ width: 120 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.amount}
                            onChange={(e) => updateForm(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            inputProps={{ step: '0.01', min: '0' }}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.checkCode}
                            onChange={(e) => updateForm(index, 'checkCode', e.target.value)}
                            placeholder="后6位"
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.totalAmount}
                            onChange={(e) => updateForm(index, 'totalAmount', e.target.value)}
                            placeholder="自动计算"
                            inputProps={{ step: '0.01', min: '0' }}
                            sx={{ width: 90 }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeRow(index)} disabled={form.length <= 1}>
                            <Delete fontSize="small" color="error" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* CSV上传 */}
          {activeTab === 'upload' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <CloudUpload fontSize="large" color="primary" sx={{ mb: 2 }} />
              <Typography variant="subtitle1" gutterBottom>上传CSV文件</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                支持CSV格式：发票类型,发票代码,发票号码,开票日期,不含税金额,校验码,价税合计
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                {uploadFile ? `已选择: ${uploadFile.name}` : '选择文件'}
              </Button>
              {uploadFile && (
                <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                  ✓ 已解析 {form.length} 条记录
                </Typography>
              )}
            </Box>
          )}

          {/* 剪贴板粘贴 */}
          {activeTab === 'clipboard' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>粘贴CSV数据（制表符或逗号分隔）</Typography>
              <TextField
                ref={clipboardRef}
                multiline
                rows={8}
                fullWidth
                placeholder="09,,12345678,2026-01-01,100.00,,113.00"
                onPaste={handlePaste}
                sx={{ mb: 2, fontFamily: 'monospace' }}
              />
              <Typography variant="caption" color="text.secondary">
                格式：发票类型,发票代码,发票号码,开票日期,不含税金额,校验码,价税合计
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
            <Button variant="outlined" onClick={() => setForm([INITIAL_FORM])}>
              重置
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <CheckCircle />}
              onClick={handleVerify}
              disabled={submitting || form.every(f => !f.number)}
            >
              {submitting ? '核验中...' : `开始核验 (${form.filter(f => f.number).length} 张)`}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 结果表格 */}
      {results.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">核验结果</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Select
                  size="small"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="valid">通过</MenuItem>
                  <MenuItem value="invalid">不通过</MenuItem>
                  <MenuItem value="error">异常</MenuItem>
                </Select>
              </Box>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>发票号码</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>开票日期</TableCell>
                    <TableCell>金额</TableCell>
                    <TableCell>结果</TableCell>
                    <TableCell>详情</TableCell>
                    <TableCell>核验时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredResults.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{r.invoiceNo}</TableCell>
                      <TableCell>
                        <Chip label={TYPE_MAP[r.type] || r.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{r.parsed?.invoiceDate || '-'}</TableCell>
                      <TableCell>{r.parsed?.totalAmount ? r.parsed.totalAmount.toFixed(2) : '-'}</TableCell>
                      <TableCell>
                        {r.isValid ? (
                          <Chip icon={<CheckCircle />} label="通过" size="small" color="success" />
                        ) : r.status === 'error' ? (
                          <Chip icon={<Warning />} label="异常" size="small" color="warning" />
                        ) : (
                          <Chip icon={<Cancel />} label="不通过" size="small" color="error" />
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.message || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(r.checkedAt).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 提示 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <AlertTitle>核验提示</AlertTitle>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>数电票无需发票代码，仅需发票号码 + 开票日期 + 金额</li>
          <li>当日开具的发票当日可查验</li>
          <li>每张发票每天最多查验5次</li>
          <li>核验结果自动记录到审计日志</li>
          <li>当前为演示模式，正式环境需配置第三方查验服务API</li>
        </ul>
      </Alert>
    </Box>
  );
};

export default InvoiceVerification;
