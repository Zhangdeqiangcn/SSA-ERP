/**
 * 供应商门户 —— 质量管理模块（质量问题单 + 8D改善报告）
 * 路由：/vendor-portal/quality/issues  /vendor-portal/quality/8d
 */
import React, { useState, useMemo } from 'react';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, LinearProgress,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
  Stepper, Step, StepLabel, StepContent, Snackbar,
} from '@mui/material';
import { Add, Warning, CheckCircle, Send, Assignment } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, FilterBar } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { useQualityStore } from '@/stores/qualityStore';
import type {
  VendorQualityIssue, VendorImprovementReport,
} from '@/types';
import { formatDate } from '@/utils/format';
import { getVendorPortalIdentity } from '@/utils/vendorPortalIdentity';

// ── 通用工具 ─────────────────────────────────────────────
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const dateCode = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};
const rand3 = () => String(Math.floor(Math.random() * 900) + 100);
// B5-T5 统一身份源：门户登录会话 → 主数据供应商，消除硬编码 ven-001
const identity = getVendorPortalIdentity();
const DEFAULT_VENDOR_ID = identity?.vendorId || 'ven-001';
const DEFAULT_VENDOR_NAME = identity?.vendorName || '上海宝钢钢铁贸易有限公司';

// ── 状态映射 ─────────────────────────────────────────────────
const issueStatusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  open:       { label: '待处理', color: 'error' },
  responded:  { label: '已响应', color: 'info' },
  improving:  { label: '改善中', color: 'warning' },
  closed:     { label: '已关闭', color: 'success' },
  escalated:  { label: '已升级', color: 'error' },
};
const severityMap: Record<string, { label: string; color: string }> = {
  critical: { label: '严重', color: '#EF4444' },
  major:    { label: '重要', color: '#F59E0B' },
  minor:    { label: '轻微', color: '#6B7280' },
};
const reportStatusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  draft:     { label: '草稿', color: 'default' },
  submitted: { label: '已提交', color: 'info' },
  reviewing: { label: '审核中', color: 'warning' },
  accepted:  { label: '已接受', color: 'success' },
  rejected:  { label: '已退回', color: 'error' },
  closed:    { label: '已关闭', color: 'success' },
};

// ── 质量问题单面板 ────────────────────────────────────────────
function QualityIssuePanel() {
  const { vendorQualityIssues, addVendorQualityIssue } = useFlowStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [form, setForm] = useState({
    vendorId: DEFAULT_VENDOR_ID, vendorName: DEFAULT_VENDOR_NAME, materialCode: '', materialName: '', batchNo: '',
    issueType: 'dimension', severity: 'major', description: '', defectQty: '', totalQty: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleIssueSave = (status: 'open') => {
    const defectQty = Number(form.defectQty) || 0;
    const totalQty = Number(form.totalQty) || 0;
    const issue: VendorQualityIssue = {
      id: `vqi-${Date.now()}`,
      issueNo: `VQI${dateCode()}${rand3()}`,
      vendorId: form.vendorId || DEFAULT_VENDOR_ID,
      vendorName: form.vendorName || DEFAULT_VENDOR_NAME,
      materialCode: form.materialCode,
      materialName: form.materialName,
      batchNo: form.batchNo,
      issueType: form.issueType as VendorQualityIssue['issueType'],
      severity: form.severity as VendorQualityIssue['severity'],
      description: form.description,
      defectQty,
      totalQty,
      defectRate: totalQty > 0 ? Number(((defectQty / totalQty) * 100).toFixed(1)) : 0,
      status,
      createdAt: nowStr(), updatedAt: nowStr(),
      createdBy: form.vendorId || DEFAULT_VENDOR_ID, updatedBy: form.vendorId || DEFAULT_VENDOR_ID,
    };
    addVendorQualityIssue(issue);
    // B7-T2：同步回写主 ERP 不合格品(NCR)，统一身份源 + 幂等守卫在 store 内
    useQualityStore.getState().addVendorQualityIssue(issue);
  };

  const columns: ColumnDef<VendorQualityIssue, unknown>[] = useMemo(() => [
    { accessorKey: 'issueNo', header: '问题单号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 600, fontFamily: 'monospace' }}>{row.original.issueNo}</Typography> },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'materialCode', header: '物料',
      cell: ({ row }) => (
        <Stack spacing={0.3}>
          <Chip label={row.original.materialCode} size="small"
            sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem', width: 'fit-content' }} />
          <Typography variant="caption" color="text.secondary">{row.original.materialName}</Typography>
        </Stack>
      ) },
    { accessorKey: 'severity', header: '严重程度',
      cell: ({ row }) => {
        const s = severityMap[row.original.severity];
        return <Chip label={s?.label} size="small" sx={{ bgcolor: `${s?.color}20`, color: s?.color, fontWeight: 600 }} />;
      } },
    { accessorKey: 'defectRate', header: '不良率',
      cell: ({ row }) => {
        const rate = row.original.defectRate;
        return (
          <Stack spacing={0.5} sx={{ minWidth: 80 }}>
            <Typography variant="body2" fontWeight={600} sx={{ color: rate > 5 ? '#EF4444' : '#F59E0B' }}>{rate.toFixed(1)}%</Typography>
            <LinearProgress variant="determinate" value={Math.min(rate, 100)}
              sx={{ height: 4, borderRadius: 2, bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': { bgcolor: rate > 5 ? '#EF4444' : '#F59E0B' } }} />
          </Stack>
        );
      } },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = issueStatusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} sx={{ fontWeight: 600 }} />;
      } },
    { accessorKey: 'createdAt', header: '发现时间', cell: ({ row }) => formatDate(row.original.createdAt) },
  ], []);

  const filteredData = useMemo(() => {
    let data = [...vendorQualityIssues];
    if (filterData.issueNo) data = data.filter(d => d.issueNo.includes(filterData.issueNo as string));
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    return data;
  }, [filterData]);

  const filterFields = [
    { name: 'issueNo', label: '问题单号', type: 'text' as const },
    { name: 'status', label: '状态', type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...Object.entries(issueStatusMap).map(([v, { label }]) => ({ value: v, label }))] },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>供应商质量问题单</Typography>
        <Button variant="contained" color="error" startIcon={<Add />} onClick={() => setNewOpen(true)}>新建问题单</Button>
      </Box>
      <FilterBar fields={filterFields} onFilter={setFilterData} />
      <DataTable data={filteredData} columns={columns} enableRowSelection enablePagination enableExport />

      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>新建供应商质量问题单</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth size="small" label="供应商编码 *" value={form.vendorId} onChange={set('vendorId')} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="供应商名称 *" value={form.vendorName} onChange={set('vendorName')} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="物料编码 *" value={form.materialCode} onChange={set('materialCode')} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="物料名称 *" value={form.materialName} onChange={set('materialName')} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="批次号" value={form.batchNo} onChange={set('batchNo')} /></Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>问题类型</InputLabel>
                <Select value={form.issueType} label="问题类型" onChange={(e) => setForm(f => ({ ...f, issueType: e.target.value }))}>
                  <MenuItem value="dimension">尺寸偏差</MenuItem>
                  <MenuItem value="appearance">外观缺陷</MenuItem>
                  <MenuItem value="performance">性能不达标</MenuItem>
                  <MenuItem value="documentation">文件缺失</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>严重程度</InputLabel>
                <Select value={form.severity} label="严重程度" onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}>
                  <MenuItem value="critical">严重</MenuItem>
                  <MenuItem value="major">重要</MenuItem>
                  <MenuItem value="minor">轻微</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="不合格数量" type="number" value={form.defectQty} onChange={set('defectQty')} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="问题描述 *" multiline rows={3} value={form.description} onChange={set('description')} /></Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setNewOpen(false)}>取消</Button>
          <Button variant="outlined" onClick={() => { handleIssueSave('open'); setNewOpen(false); setSnackbarMsg('质量问题单已暂存'); }}>暂存</Button>
          <Button variant="contained" color="error" startIcon={<Send />}
            onClick={() => { handleIssueSave('open'); setNewOpen(false); setSnackbarMsg('质量问题单已提交，等待甲方响应'); }} data-testid="vendor-quality-issue-submit">提交问题单</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(snackbarMsg)} autoHideDuration={3000}
        onClose={() => setSnackbarMsg('')} message={snackbarMsg} />
    </Box>
  );
}

// ── 8D 改善报告面板 ─────────────────────────────────────────
const D_STEPS = [
  { key: 'd1_team',        label: 'D1 成立小组', help: '列出参与解决问题的团队成员及职责' },
  { key: 'd2_description', label: 'D2 问题描述', help: '用 5W2H 详细描述问题现象、范围、影响' },
  { key: 'd3_containment', label: 'D3 临时遏制', help: '描述已采取的临时措施，防止问题继续影响客户' },
  { key: 'd4_rootcause',   label: 'D4 根本原因', help: '通过鱼骨图/5Why分析找出真正的根本原因' },
  { key: 'd5_solution',    label: 'D5 纠正措施', help: '针对根本原因制定的永久性纠正措施' },
  { key: 'd6_implementation', label: 'D6 实施计划', help: '谁来执行、何时完成、如何验证' },
  { key: 'd7_verification',   label: 'D7 效果验证', help: '纠正措施实施后的效果数据对比' },
  { key: 'd8_prevention',     label: 'D8 防止再发', help: '系统性预防措施、经验教训总结' },
];

function Report8DPanel() {
  const { vendorImprovementReports, addVendorImprovementReport, vendorQualityIssues } = useFlowStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [issueId, setIssueId] = useState('');
  const myIssues = vendorQualityIssues.filter(i => i.vendorId === DEFAULT_VENDOR_ID);
  const [form, setForm] = useState<Record<string, string>>({
    d1_team: '', d2_description: '', d3_containment: '',
    d4_rootcause: '', d5_solution: '', d6_implementation: '',
    d7_verification: '', d8_prevention: '',
  });

  const handleSubmitReport = () => {
    const selectedIssue = vendorQualityIssues.find(i => i.id === issueId);
    const report: VendorImprovementReport = {
      id: `vir-${Date.now()}`,
      reportNo: `VIR-8D-${dateCode()}${rand3()}`,
      issueId: issueId || '',
      vendorId: selectedIssue?.vendorId || DEFAULT_VENDOR_ID,
      vendorName: selectedIssue?.vendorName || DEFAULT_VENDOR_NAME,
      d1_team: form.d1_team, d2_description: form.d2_description, d3_containment: form.d3_containment,
      d4_rootcause: form.d4_rootcause, d5_solution: form.d5_solution, d6_implementation: form.d6_implementation,
      d7_verification: form.d7_verification, d8_prevention: form.d8_prevention,
      status: 'submitted',
      submittedAt: nowStr(),
      createdAt: nowStr(), updatedAt: nowStr(),
      createdBy: selectedIssue?.vendorId || DEFAULT_VENDOR_ID, updatedBy: selectedIssue?.vendorId || DEFAULT_VENDOR_ID,
    };
    addVendorImprovementReport(report);
    setNewOpen(false);
    setActiveStep(0);
    setIssueId('');
    setSnackbarMsg('8D改善报告已提交，等待品质部审核');
  };

  const columns: ColumnDef<VendorImprovementReport, unknown>[] = useMemo(() => [
    { accessorKey: 'reportNo', header: '报告编号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#6366F1', fontWeight: 600, fontFamily: 'monospace' }}>{row.original.reportNo}</Typography> },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'd2_description', header: '问题描述',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.original.d2_description}
        </Typography>
      ) },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = reportStatusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} sx={{ fontWeight: 600 }} />;
      } },
    { accessorKey: 'submittedAt', header: '提交时间',
      cell: ({ row }) => row.original.submittedAt ? formatDate(row.original.submittedAt) : '-' },
    { accessorKey: 'createdAt', header: '创建时间', cell: ({ row }) => formatDate(row.original.createdAt) },
  ], []);

  const filteredData = useMemo(() => {
    let data = [...vendorImprovementReports];
    if (filterData.reportNo) data = data.filter(d => d.reportNo.includes(filterData.reportNo as string));
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    return data;
  }, [filterData]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>8D 改善报告</Typography>
          <Typography variant="caption" color="text.secondary">供应商针对质量问题提交的8D改善报告</Typography>
        </Box>
        <Button variant="contained" color="warning" startIcon={<Add />} onClick={() => setNewOpen(true)}>新建8D报告</Button>
      </Box>
      <FilterBar fields={[
        { name: 'reportNo', label: '报告编号', type: 'text' as const },
        { name: 'status', label: '状态', type: 'select' as const,
          options: [{ value: '', label: '全部' }, ...Object.entries(reportStatusMap).map(([v, { label }]) => ({ value: v, label }))] },
      ]} onFilter={setFilterData} />
      <DataTable data={filteredData} columns={columns} enableRowSelection enablePagination enableExport />

      {/* 8D 步骤式填写弹窗 */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assignment color="warning" /> 新建 8D 改善报告
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            8D 报告（Eight Disciplines）是处理质量问题的标准方法，请按步骤如实填写。
          </Alert>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>关联质量问题单 *</InputLabel>
            <Select value={issueId} label="关联质量问题单 *"
              onChange={(e) => setIssueId(e.target.value)}>
              <MenuItem value=""><em>不关联（独立改善）</em></MenuItem>
              {myIssues.map(i => (
                <MenuItem key={i.id} value={i.id}>{i.issueNo} · {i.materialName}（{issueStatusMap[i.status]?.label}）</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stepper activeStep={activeStep} orientation="vertical">
            {D_STEPS.map((s, idx) => (
              <Step key={s.key}>
                <StepLabel>
                  <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{s.help}</Typography>
                  <TextField
                    fullWidth multiline rows={3} size="small"
                    placeholder={`请填写 ${s.label}...`}
                    value={form[s.key]}
                    onChange={(e) => setForm(f => ({ ...f, [s.key]: e.target.value }))}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    {idx > 0 && (
                      <Button size="small" onClick={() => setActiveStep(idx - 1)}>上一步</Button>
                    )}
                    {idx < D_STEPS.length - 1 ? (
                      <Button size="small" variant="contained" onClick={() => setActiveStep(idx + 1)}>下一步</Button>
                    ) : (
                      <Button size="small" variant="contained" color="warning" startIcon={<Send />}
                        onClick={handleSubmitReport}>提交报告</Button>
                    )}
                  </Stack>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setNewOpen(false); setActiveStep(0); setIssueId(''); }}>取消</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(snackbarMsg)} autoHideDuration={3000}
        onClose={() => setSnackbarMsg('')} message={snackbarMsg} />
    </Box>
  );
}

// ── 主页（Tabs：质量问题单 + 8D报告）────────────────────────
const VendorQualityPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1E293B' }}>质量管理</Typography>
        <Chip size="small" color="primary" variant="outlined" data-testid="portal-current-vendor" label={identity?.vendorName || DEFAULT_VENDOR_NAME} />
      </Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E2E8F0' }}>
          <Tab label="质量问题单" icon={<Warning fontSize="small" />} iconPosition="start" />
          <Tab label="8D 改善报告" icon={<Assignment fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Paper>
      <Box sx={{ mt: 2 }}>
        {tab === 0 && <QualityIssuePanel />}
        {tab === 1 && <Report8DPanel />}
      </Box>
    </Box>
  );
};

export default VendorQualityPage;
