import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton, Switch,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Grid, Tooltip, Alert,
} from '@mui/material';
import { Add, Edit, Delete, Payment, Calculate } from '@mui/icons-material';
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
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Calculate />} onClick={() => setSettlementDialog(true)}>
            新增结算
          </Button>
        </Box>

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
              <TextField fullWidth size="small" label="基数金额" type="number" value={settlementForm.baseAmount} onChange={(e) => setSettlementForm({ ...settlementForm, baseAmount: Number(e.target.value) })} />
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
