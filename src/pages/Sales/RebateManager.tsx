import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton, Switch,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Grid, Tooltip, Alert,
} from '@mui/material';
import { Add, Edit, Delete, Payment, Calculate, AutoFixHigh, Dataset } from '@mui/icons-material';
import { useRebateStore } from '@/stores/rebateStore';
import { useSalesStore } from '@/stores/salesStore';
import { RebateRule, RebateSettlement } from '@/types/sales';

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}</div>
);

const RebateManager: React.FC = () => {
  const [tab, setTab] = useState(0);
  const { rules, addRule, updateRule, deleteRule, settlements, addSettlement, updateSettlement, calculateRebate } = useRebateStore();
  const salesOrders = useSalesStore((s) => s.salesOrders);

  // ── 规则表单 ──
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<RebateRule | null>(null);
  const [ruleForm, setRuleForm] = useState<Partial<RebateRule>>({});

  const openRuleCreate = () => { setEditingRule(null); setRuleForm({ type: 'percent', rate: 0, enabled: true }); setRuleDialog(true); };
  const openRuleEdit = (rule: RebateRule) => { setEditingRule(rule); setRuleForm({ ...rule }); setRuleDialog(true); };

  const handleRuleSave = () => {
    if (!ruleForm.name) return;
    if (editingRule) {
      updateRule(editingRule.id, ruleForm);
    } else {
      addRule(ruleForm as Omit<RebateRule, 'id'>);
    }
    setRuleDialog(false);
  };

  // ── 结算表单 ──
  const [settlementDialog, setSettlementDialog] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    ruleId: '', period: '', baseAmount: 0, customerId: '', customerName: '',
  });

  // 自动计算当前选中的返利金额
  const computedRebate = useMemo(() => {
    if (!settlementForm.ruleId || !settlementForm.baseAmount) return 0;
    return calculateRebate(settlementForm.ruleId, settlementForm.baseAmount);
  }, [settlementForm.ruleId, settlementForm.baseAmount, calculateRebate]);

  // 按客户聚合销售额（用于结算面板）
  const customerSalesSummary = useMemo(() => {
    const map: Record<string, { customerName: string; total: number }> = {};
    for (const order of salesOrders) {
      if (order.status === 'cancelled') continue;
      const key = order.customerName;
      if (!map[key]) map[key] = { customerName: key, total: 0 };
      map[key].total += order.totalAmount;
    }
    return Object.values(map);
  }, [salesOrders]);

  // ── P2-11 返利自动结算：按规则真实范围从销售单聚合基数 ──
  // 范围 = 客户（customerId 优先，回退 customerName）+ 可选物料 + 有效期窗口（orderDate）
  const computeAutoBase = (rule: RebateRule, orders: typeof salesOrders): { baseAmount: number; matchedCount: number; scopeNote: string } => {
    let base = 0;
    let count = 0;
    const hasMaterial = !!rule.materialId;
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      if (rule.customerId && o.customerId && o.customerId !== rule.customerId) continue;
      if (!rule.customerId && rule.customerName && o.customerName !== rule.customerName) continue;
      if (rule.validFrom && o.orderDate && o.orderDate < rule.validFrom) continue;
      if (rule.validTo && o.orderDate && o.orderDate > rule.validTo) continue;
      if (hasMaterial) {
        const matched = o.items.filter((it) => it.materialId === rule.materialId);
        if (matched.length === 0) continue;
        base += matched.reduce((s, it) => s + (it.amount || 0), 0);
      } else {
        base += o.totalAmount;
      }
      count += 1;
    }
    const parts: string[] = [];
    if (rule.customerName) parts.push(`客户「${rule.customerName}」`);
    if (hasMaterial) parts.push(`物料「${rule.materialName || rule.materialId}」`);
    if (rule.validFrom || rule.validTo) parts.push(`${rule.validFrom || '*'} ~ ${rule.validTo || '*'}`);
    return {
      baseAmount: Math.round(base * 100) / 100,
      matchedCount: count,
      scopeNote: parts.length ? `匹配 ${count} 张销售单（${parts.join(' / ')}）` : `匹配 ${count} 张销售单`,
    };
  };

  const [autoBaseNote, setAutoBaseNote] = useState('');
  const handleAutoFetch = () => {
    const rule = rules.find((r) => r.id === settlementForm.ruleId);
    if (!rule) return;
    const { baseAmount, scopeNote } = computeAutoBase(rule, salesOrders);
    setSettlementForm({ ...settlementForm, baseAmount });
    setAutoBaseNote(scopeNote);
  };

  // 批量：按所有启用规则自动生成待结算（基数取真实销售单）
  const [bulkNote, setBulkNote] = useState('');
  const handleAutoGenerateAll = () => {
    const enabled = rules.filter((r) => r.enabled);
    let created = 0;
    for (const rule of enabled) {
      const { baseAmount } = computeAutoBase(rule, salesOrders);
      if (baseAmount <= 0) continue;
      addSettlement({
        ruleId: rule.id,
        ruleName: rule.name,
        customerId: rule.customerId || '',
        customerName: rule.customerName || '',
        period: rule.validFrom ? `${rule.validFrom}~${rule.validTo}` : 'auto',
        baseAmount,
        rebateAmount: calculateRebate(rule.id, baseAmount),
        status: 'pending',
      });
      created += 1;
    }
    setBulkNote(created > 0
      ? `已按 ${created} 条启用规则自动生成待结算记录（基数取自真实销售单）`
      : '启用规则在有效期内无匹配销售数据，未生成结算');
  };

  const handleSettlementCreate = () => {
    const rule = rules.find((r) => r.id === settlementForm.ruleId);
    if (!rule) return;
    addSettlement({
      ruleId: rule.id,
      ruleName: rule.name,
      customerId: settlementForm.customerId,
      customerName: settlementForm.customerName,
      period: settlementForm.period,
      baseAmount: settlementForm.baseAmount,
      rebateAmount: computedRebate,
      status: 'pending',
    });
    setSettlementDialog(false);
    setSettlementForm({ ruleId: '', period: '', baseAmount: 0, customerId: '', customerName: '' });
  };

  const handleQuickSettle = (row: RebateSettlement) => {
    updateSettlement(row.id, {
      status: 'settled',
      settledAt: new Date().toISOString().slice(0, 10),
    });
  };

  // ── 状态标签 ──
  const statusChip = (status: RebateSettlement['status']) => {
    const map: Record<string, { label: string; color: 'default' | 'success' | 'error' }> = {
      pending: { label: '待结算', color: 'default' },
      settled: { label: '已结算', color: 'success' },
      cancelled: { label: '已取消', color: 'error' },
    };
    const item = map[status];
    return <Chip label={item.label} size="small" color={item.color} />;
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>返利管理</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="返利规则" />
        <Tab label="返利结算" />
      </Tabs>

      {/* ── 返利规则 ── */}
      <TabPanel value={tab} index={0}>
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" startIcon={<Add />} onClick={openRuleCreate}>新增规则</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>物料</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>费率</TableCell>
                <TableCell>有效期</TableCell>
                <TableCell>启用</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">暂无返利规则</TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id} hover>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell>{rule.customerName || '-'}</TableCell>
                    <TableCell>{rule.materialName || '-'}</TableCell>
                    <TableCell>
                      <Chip label={rule.type === 'percent' ? '百分比' : '固定金额'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{rule.type === 'percent' ? `${rule.rate}%` : `¥${rule.rate}`}</TableCell>
                    <TableCell>{rule.validFrom || '-'} ~ {rule.validTo || '-'}</TableCell>
                    <TableCell>
                      <Switch size="small" checked={rule.enabled} onChange={() => updateRule(rule.id, { enabled: !rule.enabled })} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => openRuleEdit(rule)}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="删除"><IconButton size="small" onClick={() => deleteRule(rule.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 返利结算 ── */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<Calculate />} onClick={() => setSettlementDialog(true)}>
            新增结算
          </Button>
          <Button variant="outlined" startIcon={<Dataset />} onClick={handleAutoGenerateAll}>
            按启用规则自动结算
          </Button>
        </Box>
        {bulkNote && (
          <Alert severity={bulkNote.includes('未生成') ? 'info' : 'success'} sx={{ mb: 2 }} onClose={() => setBulkNote('')}>
            {bulkNote}
          </Alert>
        )}

        {/* 客户销售额汇总 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>客户销售额汇总</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>客户</TableCell>
                  <TableCell align="right">销售总额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerSalesSummary.map((item) => (
                  <TableRow key={item.customerName} hover>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell align="right">¥{item.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* 结算记录 */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>规则名称</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>周期</TableCell>
                <TableCell align="right">基数金额</TableCell>
                <TableCell align="right">返利金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">暂未结算记录</TableCell>
                </TableRow>
              ) : (
                settlements.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.ruleName}</TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell>{item.period}</TableCell>
                    <TableCell align="right">¥{item.baseAmount.toLocaleString()}</TableCell>
                    <TableCell align="right">¥{item.rebateAmount.toLocaleString()}</TableCell>
                    <TableCell>{statusChip(item.status)}</TableCell>
                    <TableCell>
                      {item.status === 'pending' && (
                        <>
                          <Tooltip title="一键结算">
                            <IconButton size="small" color="success" onClick={() => handleQuickSettle(item)}>
                              <Payment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" onClick={() => updateSettlement(item.id, { status: 'cancelled' })}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ── 规则编辑对话框 ── */}
      <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? '编辑返利规则' : '新增返利规则'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="规则名称" value={ruleForm.name || ''} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="客户名称" value={ruleForm.customerName || ''} onChange={(e) => setRuleForm({ ...ruleForm, customerName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="物料名称" value={ruleForm.materialName || ''} onChange={(e) => setRuleForm({ ...ruleForm, materialName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="类型" value={ruleForm.type || 'percent'} onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value as 'percent' | 'fixed' })}>
                <MenuItem value="percent">百分比</MenuItem>
                <MenuItem value="fixed">固定金额</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label={ruleForm.type === 'percent' ? '费率(%)' : '固定金额(元)'} type="number" value={ruleForm.rate || 0} onChange={(e) => setRuleForm({ ...ruleForm, rate: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="最小金额" type="number" value={ruleForm.minAmount || ''} onChange={(e) => setRuleForm({ ...ruleForm, minAmount: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="生效日期" type="date" value={ruleForm.validFrom || ''} onChange={(e) => setRuleForm({ ...ruleForm, validFrom: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="失效日期" type="date" value={ruleForm.validTo || ''} onChange={(e) => setRuleForm({ ...ruleForm, validTo: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleRuleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* ── 结算创建对话框 ── */}
      <Dialog open={settlementDialog} onClose={() => setSettlementDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增返利结算</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="返利规则" value={settlementForm.ruleId} onChange={(e) => {
                const rule = rules.find((r) => r.id === e.target.value);
                setSettlementForm({ ...settlementForm, ruleId: e.target.value, customerId: rule?.customerId || '', customerName: rule?.customerName || '' });
              }}>
                {rules.filter((r) => r.enabled).map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name} ({r.type === 'percent' ? `${r.rate}%` : `¥${r.rate}`})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="客户" value={settlementForm.customerName} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="结算周期" placeholder="如 2026-Q3" value={settlementForm.period} onChange={(e) => setSettlementForm({ ...settlementForm, period: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="基数金额" type="number" value={settlementForm.baseAmount} onChange={(e) => { setSettlementForm({ ...settlementForm, baseAmount: Number(e.target.value) }); setAutoBaseNote(''); }}
                InputProps={{ endAdornment: (
                  <Button size="small" startIcon={<AutoFixHigh />} onClick={handleAutoFetch} disabled={!settlementForm.ruleId}
                    sx={{ whiteSpace: 'nowrap' }}>
                    自动取数
                  </Button>
                ) }}
              />
              {autoBaseNote && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                  {autoBaseNote}
                </Typography>
              )}
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary">计算结果</Typography>
                <Typography variant="h6" color="primary">¥{computedRebate.toLocaleString()}</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSettlementCreate} disabled={!settlementForm.ruleId || !settlementForm.period || !settlementForm.baseAmount}>
            创建结算
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RebateManager;
