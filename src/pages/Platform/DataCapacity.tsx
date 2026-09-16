import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Alert, LinearProgress, Stack, Tooltip, Card, CardContent,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiClient } from '@/services/api';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 数据容量守护（A5）
 *
 * 这个页面的存在意义：60 个业务域目前以「整块 JSON」存在单个键里，
 * 哪个域涨到写不进去，以前是**爆了才知道**（而且爆的时候是静默的）。
 * 这里把每个键的体积、历史峰值、写入次数摊开，让「提前几周发现」成为可能，
 * 也给「该先迁哪个域到关系表」提供客观依据 —— 而不是拍脑袋决定。
 */
interface MetricItem {
  key: string;
  bytes: number;
  human: string;
  peakBytes: number;
  peakHuman: string;
  writes: number;
  updatedAt: string | null;
  level: 'ok' | 'warn' | 'reject';
  usagePct: number;
  peakRatio: number;
}

interface MetricsResp {
  ok: boolean;
  available: boolean;
  softLimitHuman?: string;
  hardLimitHuman?: string;
  totalHuman?: string;
  keyCount?: number;
  warnCount?: number;
  message?: string;
  items: MetricItem[];
}

const DataCapacity: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<MetricsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // apiClient 的 baseURL 已是 '/api'，此处传相对路径避免重复前缀
      const res = await apiClient.get<MetricsResp>('/state/metrics');
      setData(res.data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const items = data?.items ?? [];
  const warnItems = items.filter((i) => i.level !== 'ok');

  return (
    <Box sx={{ p: 3 }} data-testid="data-capacity">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('page.dataCapacity', '数据容量守护')}
        </Typography>
        <Box flex={1} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
          {t('common.refresh', '刷新')}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        业务数据目前以「整块 JSON」形式存放，本页监控每个数据域的体积，提前发现逼近上限的域。
        超过上限将无法保存（不再静默丢数据），处置办法是把该域迁移到关系表。
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data && !data.available && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {data.message ?? '体积指标尚未采集。'}
        </Alert>
      )}

      {data?.available && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <StorageIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    {t('page.capacityKeys', '已监控数据域')}
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} color="#1976d2">
                  {data.keyCount ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  合计 {data.totalHuman}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  {warnItems.length > 0
                    ? <WarningAmberIcon sx={{ color: '#d32f2f', fontSize: 20 }} />
                    : <CheckCircleIcon sx={{ color: '#388e3c', fontSize: 20 }} />}
                  <Typography variant="body2" color="text.secondary">
                    {t('page.capacityWarn', '逼近/超限数据域')}
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} color={warnItems.length > 0 ? '#d32f2f' : '#388e3c'}>
                  {warnItems.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  预警线 {data.softLimitHuman} / 上限 {data.hardLimitHuman}
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {warnItems.length > 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              有 <b>{warnItems.length}</b> 个数据域已接近或超过预警线。超过 {data.hardLimitHuman} 后该模块将无法保存，
              建议尽快安排迁移到关系表（先迁体积最大的那个）。
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              所有数据域体积均在安全范围内。
            </Alert>
          )}

          <Paper>
            <TableContainer>
              <Table size="small" data-testid="capacity-table">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>数据域（键）</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>当前体积</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>历史峰值</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>写入次数</TableCell>
                    <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>占用上限比例</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>最后写入</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.key} hover data-testid="capacity-row">
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>
                          {row.key}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={row.level === 'reject' ? 'error.main' : row.level === 'warn' ? 'warning.main' : 'text.primary'}
                        >
                          {row.human}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={row.peakRatio > 1.3 ? '峰值显著高于当前值：该域有过批量导入/集中录入' : ''}>
                          <Typography variant="body2" color="text.secondary">{row.peakHuman}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">{row.writes}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, row.usagePct)}
                            color={row.level === 'reject' ? 'error' : row.level === 'warn' ? 'warning' : 'primary'}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42, textAlign: 'right' }}>
                            {row.usagePct}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {row.updatedAt ? row.updatedAt.split('T')[0] : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {items.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {t('common.noData', '暂无符合条件的数据')}
              </Typography>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DataCapacity;
