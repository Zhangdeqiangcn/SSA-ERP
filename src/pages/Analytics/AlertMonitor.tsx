import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button, Grid,
  Chip, IconButton, Collapse, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, Divider, TextField,
  Tooltip, InputAdornment,
} from '@mui/material';
import {
  WarningAmber, Inventory2, ReceiptLong, EventBusy, CreditCardOff,
  ExpandMore, ExpandLess, Refresh, Settings, RestartAlt,
  // 注意：MUI 的 Error/Warning 图标会遮蔽全局 Error 构造函数，必须改名导入
  Error as ErrorIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ExportMenu } from '@/components/common';
import { useAlertRuleStore, type AlertRule, type AlertRuleKey } from '@/stores/alertRuleStore';
import {
  computeLocalAlerts, applyAlertRules, normalizeServerAlerts,
  type AlertData, type AlertItem, type AlertSource,
} from '@/utils/localAlerts';

interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  details?: AlertItem[];
  actionLabel?: string;
  actionPath?: string;
  testid: string;
}

const severityColors: Record<string, { bg: string; icon: string }> = {
  high: { bg: '#ffebee', icon: '#d32f2f' },
  medium: { bg: '#fff3e0', icon: '#f57c00' },
  low: { bg: '#e8f5e9', icon: '#388e3c' },
};

const severityIcons: Record<string, React.ReactNode> = {
  high: <ErrorIcon fontSize="small" sx={{ color: '#d32f2f' }} />,
  medium: <WarningIcon fontSize="small" sx={{ color: '#f57c00' }} />,
  low: <WarningIcon fontSize="small" sx={{ color: '#388e3c' }} />,
};

const AlertCard: React.FC<AlertCardProps> = ({
  icon, title, count, severity, description, details, actionLabel, actionPath, testid,
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const sc = severityColors[severity];

  return (
    <Card
      variant="outlined"
      data-testid={testid}
      sx={{ borderRadius: 2, borderLeft: `4px solid ${sc.icon}`, height: '100%' }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
          </Box>
          <Chip
            label={`${count} 项异常`}
            size="small"
            color={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'success'}
            variant="outlined"
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          {severityIcons[severity]}
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
      </CardContent>

      {details && details.length > 0 && (
        <>
          <CardActions sx={{ pt: 0 }}>
            <Button
              size="small"
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setExpanded(!expanded)}
            >
              展开明细 ({details.length})
            </Button>
          </CardActions>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <CardContent sx={{ pt: 0 }}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>物料/单据</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>异常详情</TableCell>
                      {details[0].extra !== undefined && (
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>备注</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.map((d, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{d.label}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'error.main' }}>{d.value}</TableCell>
                        {d.extra !== undefined && (
                          <TableCell sx={{ fontSize: '0.75rem' }}>{d.extra}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Collapse>
        </>
      )}

      {actionPath && (
        <CardActions>
          <Button size="small" variant="text" onClick={() => navigate(actionPath!)}>
            {actionLabel || '查看详情'}
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

/** 严重度：按命中条数升级（保留原口径） */
function severityByCount(count: number, highAt: number, mediumAt: number): 'high' | 'medium' | 'low' {
  if (count > highAt) return 'high';
  if (count > mediumAt) return 'medium';
  return 'low';
}

const AlertMonitor: React.FC = () => {
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [source, setSource] = useState<AlertSource>('local');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const rules = useAlertRuleStore((s) => s.rules);
  const setRuleEnabled = useAlertRuleStore((s) => s.setRuleEnabled);
  const updateRuleParams = useAlertRuleStore((s) => s.updateRuleParams);
  const resetRules = useAlertRuleStore((s) => s.resetRules);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/alerts');
      if (!resp.ok) throw new Error(`服务端返回 ${resp.status}`);
      const data = (await resp.json()) as AlertData;
      setAlertData(normalizeServerAlerts(data));
      setSource('server');
    } catch {
      // 生产环境才有 /api/alerts（Cloudflare Functions + D1）。
      // DEV / E2E / 离线场景回退到「本地同源重算」，口径与服务端一致，保证预警页始终可用。
      setAlertData(computeLocalAlerts());
      setSource('local');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  /** 按前端规则（启停 + 阈值）过滤后的视图 */
  const view = useMemo(
    () => (alertData ? applyAlertRules(alertData, rules) : null),
    [alertData, rules]
  );

  const isRuleOn = (key: AlertRuleKey) => rules.find((r) => r.key === key)?.enabled ?? true;

  const overdueOrders = useMemo(() => {
    if (!view) return [];
    return [...view.overduePO, ...view.overdueSO].slice(0, 10);
  }, [view]);

  const totalAlerts = view?.summary.total || 0;
  const criticalAlerts = view?.summary.critical || 0;
  const pendingCount = (view?.pendingApprovals.purchaseOrders || 0) + (view?.pendingApprovals.salesOrders || 0) + (view?.pendingApprovals.workOrders || 0);

  /** 导出：合并各类别为一张明细表 */
  const exportSheets = () => {
    if (!view) return [];
    const rows: { category: string; label: string; value: string; extra: string }[] = [];
    const push = (category: string, list: AlertItem[]) => {
      list.forEach((d) => rows.push({ category, label: d.label, value: d.value, extra: d.extra ?? '-' }));
    };
    push('库存低于安全库存', view.lowStock);
    push('采购订单逾期', view.overduePO);
    push('销售订单逾期', view.overdueSO);
    push('临期/过期物料', view.expiringBatches);
    push('客户信用超额', view.creditOverdue);
    return [
      {
        name: '预警明细',
        rows,
        columns: [
          { key: 'category', label: '预警类别' },
          { key: 'label', label: '物料/单据' },
          { key: 'value', label: '异常详情' },
          { key: 'extra', label: '备注' },
        ],
      },
      {
        name: '规则配置快照',
        rows: rules.map((r) => ({
          name: r.name,
          enabled: r.enabled ? '启用' : '停用',
          param: Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join('; ') || '-',
        })),
        columns: [
          { key: 'name', label: '规则' },
          { key: 'enabled', label: '状态' },
          { key: 'param', label: '阈值' },
        ],
      },
    ];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>正在加载预警数据...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<Refresh />} onClick={fetchAlerts} sx={{ mt: 2 }}>重试</Button>
      </Box>
    );
  }

  if (!view) return null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmber color="warning" fontSize="large" />
            <Typography variant="h5">异常检测与预警</Typography>
            <Tooltip
              title={
                source === 'server'
                  ? '数据来自服务端 /api/alerts（D1 实时计算），前端规则在此基础上二次过滤'
                  : '当前环境无服务端预警接口（DEV/离线），已按相同口径基于本地数据重算；前端规则同样生效'
              }
            >
              <Chip
                size="small"
                data-testid="alert-source"
                label={source === 'server' ? 'D1 服务端预警' : '本地同源重算'}
                color={source === 'server' ? 'primary' : 'default'}
                variant="outlined"
              />
            </Tooltip>
          </Box>
          <Typography variant="body2" color="text.secondary">
            实时监控业务异常 · 共 {totalAlerts} 项预警（其中 {criticalAlerts} 项严重）· 待审批 {pendingCount} 单
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ExportMenu
            testid="alert-export"
            filename="异常预警明细"
            sheets={exportSheets}
            disabledHint="当前无预警明细可导出"
          />
          <Button
            startIcon={<Settings />}
            onClick={() => setRulesOpen(true)}
            variant="outlined"
            size="small"
            data-testid="alert-rules-open"
          >
            规则配置
          </Button>
          <Button startIcon={<Refresh />} onClick={fetchAlerts} disabled={loading} variant="outlined" size="small">
            刷新
          </Button>
        </Box>
      </Box>

      {totalAlerts > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>系统检测到 {totalAlerts} 项异常，请及时处理。</Alert>
      )}

      <Grid container spacing={2}>
        {isRuleOn('lowStock') && (
          <Grid item xs={12} md={6}>
            <AlertCard icon={<Inventory2 color="warning" />} title="库存低于安全库存"
              count={view.lowStock.length}
              severity={severityByCount(view.lowStock.length, 5, 2)}
              description="物料可用量低于安全库存阈值，需及时补货"
              details={view.lowStock} actionLabel="跳转到库存页" actionPath="/warehouse/inventory" testid="alert-stock" />
          </Grid>
        )}
        {(isRuleOn('overduePO') || isRuleOn('overdueSO')) && (
          <Grid item xs={12} md={6}>
            <AlertCard icon={<EventBusy color="error" />} title="逾期订单"
              count={overdueOrders.length}
              severity={severityByCount(overdueOrders.length, 5, 2)}
              description="已超过期望交货日期但未完成的订单"
              details={overdueOrders} actionLabel="跳转到销售订单" actionPath="/sales/orders" testid="alert-overdue" />
          </Grid>
        )}
        {isRuleOn('expiring') && (
          <Grid item xs={12} md={6}>
            <AlertCard icon={<ReceiptLong color="warning" />} title="临期物料"
              count={view.expiringBatches.length}
              severity={severityByCount(view.expiringBatches.length, 3, 0)}
              description="临期或过期物料，需关注处理"
              details={view.expiringBatches} actionLabel="跳转到批次管理" actionPath="/warehouse/batch" testid="alert-expiry" />
          </Grid>
        )}
        {isRuleOn('credit') && (
          <Grid item xs={12} md={6}>
            <AlertCard icon={<CreditCardOff color="error" />} title="信用超额"
              count={view.creditOverdue.length}
              severity={severityByCount(view.creditOverdue.length, 2, 0)}
              description="客户已使用信用额度超过授信额度"
              details={view.creditOverdue} actionLabel="跳转到客户列表" actionPath="/customer/list" testid="alert-credit" />
          </Grid>
        )}
      </Grid>

      {pendingCount > 0 && isRuleOn('pendingApproval') && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>待审批单据</Typography>
          <Grid container spacing={1}>
            <Grid item><Chip label={`采购订单 ${view.pendingApprovals.purchaseOrders} 单`} color="warning" size="small" /></Grid>
            <Grid item><Chip label={`销售订单 ${view.pendingApprovals.salesOrders} 单`} color="info" size="small" /></Grid>
            <Grid item><Chip label={`生产工单 ${view.pendingApprovals.workOrders} 单`} color="secondary" size="small" /></Grid>
          </Grid>
        </Box>
      )}

      {/* 规则配置 */}
      <Dialog open={rulesOpen} onClose={() => setRulesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings fontSize="small" />
            预警规则配置
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            规则对「服务端 D1 计算」与「本地同源重算」两种数据源同样生效；关闭后该类预警不再展示与导出。
          </Typography>
          {rules.map((rule, idx) => (
            <Box key={rule.key} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{rule.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{rule.description}</Typography>
                </Box>
                <Switch
                  checked={rule.enabled}
                  onChange={(e) => setRuleEnabled(rule.key, e.target.checked)}
                  inputProps={{ 'aria-label': rule.name } as any}
                  data-testid={`alert-rule-switch-${rule.key}`}
                />
              </Box>
              {rule.enabled && (
                <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                  {rule.key === 'lowStock' && (
                    <TextField
                      size="small"
                      type="number"
                      label="低于安全库存百分比"
                      value={rule.params.ratioPct ?? 100}
                      onChange={(e) => updateRuleParams('lowStock', { ratioPct: Number(e.target.value) })}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      inputProps={{ min: 1, max: 200, step: 5, 'data-testid': 'alert-rule-lowstock-pct' } as any}
                      sx={{ width: 200 }}
                      helperText="可用量/安全库存 低于该比例才预警"
                    />
                  )}
                  {(rule.key === 'overduePO' || rule.key === 'overdueSO') && (
                    <TextField
                      size="small"
                      type="number"
                      label="最小逾期天数"
                      value={rule.params.minDays ?? 0}
                      onChange={(e) => updateRuleParams(rule.key, { minDays: Number(e.target.value) })}
                      InputProps={{ endAdornment: <InputAdornment position="end">天</InputAdornment> }}
                      inputProps={{ min: 0, max: 365, step: 1, 'data-testid': `alert-rule-${rule.key}-days` } as any}
                      sx={{ width: 180 }}
                      helperText="逾期天数 ≥ 该值才预警"
                    />
                  )}
                  {rule.key === 'expiring' && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={rule.params.includeExpired ?? true}
                          onChange={(e) => updateRuleParams('expiring', { includeExpired: e.target.checked })}
                          data-testid="alert-rule-expiring-include-expired"
                        />
                      }
                      label={<Typography variant="caption">包含已过期物料</Typography>}
                    />
                  )}
                  {rule.key === 'credit' && (
                    <TextField
                      size="small"
                      type="number"
                      label="最小超额比例"
                      value={rule.params.overRatePct ?? 0}
                      onChange={(e) => updateRuleParams('credit', { overRatePct: Number(e.target.value) })}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                      inputProps={{ min: 0, max: 500, step: 5, 'data-testid': 'alert-rule-credit-pct' } as any}
                      sx={{ width: 180 }}
                      helperText="超出授信额度的比例 ≥ 该值才预警"
                    />
                  )}
                </Box>
              )}
              {idx < rules.length - 1 && <Divider sx={{ mt: 1.5 }} />}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<RestartAlt />} onClick={resetRules} data-testid="alert-rules-reset">恢复默认</Button>
          <Button variant="contained" onClick={() => setRulesOpen(false)} data-testid="alert-rules-close">完成</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertMonitor;

/** 规则类型导出，便于测试与后续复用 */
export type { AlertRule };
