import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Grid,
  TextField, MenuItem, FormControl, InputLabel, Select, FormHelperText,
  Alert, AlertTitle, Chip, IconButton, Tooltip, InputAdornment,
  Switch, FormControlLabel, LinearProgress,
} from '@mui/material';
import {
  AdminPanelSettings, Key, Visibility, VisibilityOff,
  Refresh, CheckCircle, Warning as WarningIcon,
  Download, Upload, Save, Delete, Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// ── 发票类型映射 ──
const INVOICE_TYPES = [
  { value: '01', label: '增值税专用发票' },
  { value: '03', label: '机动车销售统一发票' },
  { value: '04', label: '增值税普通发票' },
  { value: '05', label: '区块链电子发票' },
  { value: '09', label: '数电发票（蓝票）' },
  { value: '10', label: '增值税普通发票（电子）' },
  { value: '11', label: '增值税普通发票（卷式）' },
  { value: '20', label: '增值税专用发票（电子）' },
];

// ── 查验服务商 ──
const PROVIDERS = [
  { value: 'manual', label: '手动模式（无API，仅格式校验）' },
  { value: 'etoplive', label: '易通发票查验 (etoplive)' },
  { value: 'lskj', label: '乐税科技 (lskj365)' },
];

// ── 主配置页 ──
const TaxConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // 表单状态
  const [provider, setProvider] = useState('manual');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [dailyQuota, setDailyQuota] = useState(1000);
  const [autoVerify, setAutoVerify] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/tax-gateway/config');
      if (!resp.ok) throw new Error('获取配置失败');
      const data = await resp.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setProvider(data.data.provider || 'manual');
        setApiKey(data.data.apiKey ? '****' : '');
        setDailyQuota(data.data.dailyQuota || 1000);
        setAutoVerify(data.data.autoVerify || false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const resp = await fetch('/api/tax-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiSecret, apiSecret, dailyQuota }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || '保存失败');
      setSuccess('配置已保存成功');
      fetchConfig();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要清除金税网关配置吗？')) return;
    try {
      await fetch('/api/tax-gateway/config', { method: 'DELETE' });
      setConfig(null);
      setProvider('manual');
      setApiKey('');
      setApiSecret('');
      setSuccess('配置已清除');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AdminPanelSettings color="primary" />
        <Typography variant="h5">金税系统配置</Typography>
        <Chip label="P2-06" size="small" color="info" />
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 配置说明 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Info color="info" />
            <Typography variant="subtitle2">功能说明</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            对接国家税务总局发票查验平台，支持批量数电票核验。查验结果自动记录到审计日志，
            可与采购/销售订单进行三单匹配校验。
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="批量核验" size="small" />
            <Chip label="结果追溯" size="small" />
            <Chip label="审计日志" size="small" />
            <Chip label="三单匹配" size="small" />
          </Box>
        </CardContent>
      </Card>

      {/* 当前配置状态 */}
      {config && (
        <Card sx={{ mb: 3, borderColor: 'success.main', borderWidth: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircle color="success" />
              <Typography variant="subtitle1" color="success.main">配置已生效</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">查验服务商</Typography>
                <Typography variant="body2">{config.providerName}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">API Key</Typography>
                <Typography variant="body2">{config.apiKey}...</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">今日配额</Typography>
                <Typography variant="body2">
                  {config.usedToday ?? 0} / {config.dailyQuota ?? 1000}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">最后核验</Typography>
                <Typography variant="body2">
                  {config.lastCheckAt ? new Date(config.lastCheckAt).toLocaleString() : '从未'}
                </Typography>
              </Grid>
            </Grid>
            {config.dailyQuota && config.usedToday != null && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(config.usedToday / config.dailyQuota) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  已用 {(config.usedToday / config.dailyQuota * 100).toFixed(1)}%
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 配置表单 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>查验服务配置</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>查验服务商</InputLabel>
                <Select
                  value={provider}
                  label="查验服务商"
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDERS.map(p => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  手动模式仅做格式校验，不联网查验真伪
                </FormHelperText>
              </FormControl>
            </Grid>

            {provider !== 'manual' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={apiKey}
                    placeholder="从服务商控制台获取"
                    onChange={(e) => setApiKey(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Key />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="API Secret"
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    placeholder="从服务商控制台获取"
                    onChange={(e) => setApiSecret(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title={showSecret ? '隐藏' : '显示'}>
                            <IconButton onClick={() => setShowSecret(!showSecret)} edge="end">
                              {showSecret ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="每日查询配额"
                    type="number"
                    value={dailyQuota}
                    onChange={(e) => setDailyQuota(Number(e.target.value))}
                    inputProps={{ min: 100, max: 100000 }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoVerify}
                    onChange={(e) => setAutoVerify(e.target.checked)}
                  />
                }
                label="入库时自动核验发票真伪（需配置查验服务）"
              />
            </Grid>
          </Grid>
        </CardContent>
        <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            startIcon={<Delete />}
            color="error"
            variant="outlined"
            onClick={handleDelete}
            disabled={!config}
          >
            清除配置
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Refresh />} onClick={fetchConfig} variant="outlined">
              刷新
            </Button>
            <Button
              startIcon={<Save />}
              variant="contained"
              onClick={handleSave}
              disabled={saving || provider === 'manual'}
            >
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </Box>
        </CardActions>
      </Card>

      {/* 支持的发票类型 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>支持的发票类型</Typography>
          <Grid container spacing={1}>
            {INVOICE_TYPES.map(t => (
              <Grid item key={t.value}>
                <Chip label={t.label} size="small" variant="outlined" />
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            数电票（全电发票）无需发票代码，仅需发票号码 + 开票日期 + 金额即可查验
          </Typography>
        </CardContent>
      </Card>

      {/* 核验记录入口 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircle color="success" />
            <Typography variant="subtitle1">核验记录</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            所有发票核验操作均记录在审计日志中，可在下方查看历史记录
          </Typography>
          <Button
            startIcon={<Download />}
            variant="outlined"
            size="small"
            onClick={() => navigate('/analytics/audit')}
            sx={{ mt: 1 }}
          >
            查看核验审计日志
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TaxConfigPage;
