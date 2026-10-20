import React, { useState, useMemo } from 'react';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, LinearProgress,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
} from '@mui/material';
import { Add, Warning, CheckCircle, Send } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import type {
  VendorQualityIssue, VendorImprovementReport,
  VendorStatement, VendorInvoiceRequest,
} from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

// ──── 质量问题列表 ────────────────────────────────────────────
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

function QualityIssuePanel() {
  const { vendorQualityIssues } = useFlowStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    vendorId: '', materialCode: '', materialName: '', batchNo: '',
    issueType: '', severity: '', description: '', defectQty: '', totalQty: '',
  });

  const columns: ColumnDef<VendorQualityIssue, unknown>[] = useMemo(() => [
    { accessorKey: 'issueNo', header: '问题单号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 500, fontFamily: 'monospace' }}>{row.original.issueNo}</Typography>,
    },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'materialCode', header: '物料',
      cell: ({ row }) => (
        <Stack>
          <Chip label={row.original.materialCode} size="small"
            sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.75rem', mb: 0.3 }} />
          <Typography variant="caption" color="text.secondary">{row.original.materialName}</Typography>
        </Stack>
      ),
    },
    { accessorKey: 'severity', header: '严重程度',
      cell: ({ row }) => {
        const s = severityMap[row.original.severity];
        return <Chip label={s?.label} size="small" sx={{ bgcolor: `${s?.color}20`, color: s?.color, fontWeight: 600, fontSize: '0.75rem' }} />;
      },
    },
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
      },
    },
    { accessorKey: 'disposalMethod', header: '处置方式',
      cell: ({ row }) => {
        const m: Record<string, string> = { return: '退货', rework: '返工', concession: '让步接收', scrap: '报废' };
        return row.original.disposalMethod ? <Chip label={m[row.original.disposalMethod]} size="small" /> : '-';
      },
    },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = issueStatusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} />;
      },
    },
    { accessorKey: 'createdAt', header: '发现时间', cell: ({ row }) => formatDate(row.original.createdAt) },
  ], []);

  const filterFields = [
    { name: 'issueNo', label: '问题单号', type: 'text' as const },
    { name: 'vendorName', label: '供应商', type: 'text' as const },
    {
      name: 'severity', label: '严重程度', type: 'select' as const,
      options: [{ value: '', label: '全部' }, { value: 'critical', label: '严重' }, { value: 'major', label: '重要' }, { value: 'minor', label: '轻微' }],
    },
    {
      name: 'status', label: '状态', type: 'select' as const,
      options: [
        { value: '', label: '全部' }, { value: 'open', label: '待处理' },
        { value: 'responded', label: '已响应' }, { value: 'improving', label: '改善中' },
        { value: 'closed', label: '已关闭' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...vendorQualityIssues];
    if (filterData.issueNo) data = data.filter(d => d.issueNo.includes(filterData.issueNo as string));
    if (filterData.vendorName) data = data.filter(d => d.vendorName.includes(filterData.vendorName as string));
    if (filterData.severity) data = data.filter(d => d.severity === filterData.severity);
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    return data;
  }, [filterData]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" color="error" startIcon={<Add />} onClick={() => setNewOpen(true)}>新建质量问题单</Button>
      </Box>
      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable data={filteredData} columns={columns} enableRowSelection enablePagination enableExport />
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>新建供应商质量问题单</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth size="small" label="供应商 *" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="物料编码 *" value={form.materialCode} onChange={(e) => setForm({ ...form, materialCode: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="物料名称 *" value={form.materialName} onChange={(e) => setForm({ ...form, materialName: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="批次号" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>问题类型</InputLabel>
                <Select value={form.issueType} label="问题类型" onChange={(e) => setForm({ ...form, issueType: e.target.value })}>
                  {[['dimension','尺寸偏差'],['appearance','外观缺陷'],['performance','性能不足'],['documentation','文件问题'],['production','生产投诉'],['customer_return','客户退货追责'],['other','其他']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>严重程度 *</InputLabel>
                <Select value={form.severity} label="严重程度 *" onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  {[['critical','严重'],['major','重要'],['minor','轻微']].map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="不合格数量" type="number" value={form.defectQty} onChange={(e) => setForm({ ...form, defectQty: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="问题描述 *" multiline rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewOpen(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => setNewOpen(false)}>提交问题单</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ──── 改善报告（8D）────────────────────────────────────────────
function ImprovementReportPanel() {
  const { vendorImprovementReports } = useFlowStore();
  const [selected, setSelected] = useState<VendorImprovementReport | null>(null);
  const columns: ColumnDef<VendorImprovementReport, unknown>[] = useMemo(() => [
    { accessorKey: 'reportNo', header: '报告编号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>{row.original.reportNo}</Typography>,
    },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'd2_description', header: '问题描述',
      cell: ({ row }) => <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.original.d2_description}</Typography>,
    },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const m: Record<string, string> = { draft: '草稿', submitted: '已提交', reviewing: '审核中', accepted: '已接受', rejected: '已驳回', closed: '已关闭' };
        const c: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = { draft: 'default', submitted: 'info', reviewing: 'warning', accepted: 'success', rejected: 'error', closed: 'success' };
        return <Chip label={m[row.original.status]} size="small" color={c[row.original.status] || 'default'} />;
      },
    },
    { accessorKey: 'submittedAt', header: '提交时间', cell: ({ row }) => formatDate(row.original.submittedAt || '') },
  ], []);

  return (
    <Box>
      <DataTable data={vendorImprovementReports} columns={columns} enablePagination
        onView={(row) => setSelected(row)} onEdit={(row) => setSelected(row)} />
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>8D 改善报告 — {selected?.reportNo}</DialogTitle>
        <Divider />
        <DialogContent>
          {selected && (
            <Box sx={{ '& .d-item': { mb: 2, p: 2, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 } }}>
              {[
                ['D1 成立小组', selected.d1_team],
                ['D2 问题描述', selected.d2_description],
                ['D3 临时遏制措施', selected.d3_containment],
                ['D4 根本原因分析', selected.d4_rootcause],
                ['D5 永久纠正措施', selected.d5_solution],
                ['D6 实施计划', selected.d6_implementation],
                ['D7 效果验证', selected.d7_verification],
                ['D8 防止再发', selected.d8_prevention],
              ].map(([label, content]) => (
                <Box key={label} className="d-item">
                  <Typography variant="caption" color="primary" fontWeight={700}>{label}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{content}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelected(null)}>关闭</Button>
          <Button variant="contained" color="success" onClick={() => setSelected(null)}>接受报告</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ──── 对账单 ────────────────────────────────────────────────
function StatementPanel() {
  const { vendorStatements } = useFlowStore();
  const columns: ColumnDef<VendorStatement, unknown>[] = useMemo(() => [
    { accessorKey: 'statementNo', header: '对账单号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>{row.original.statementNo}</Typography>,
    },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'statementPeriod', header: '对账周期' },
    { accessorKey: 'grandTotal', header: '含税合计', cell: ({ row }) => (
        <Typography variant="body2" fontWeight={600} sx={{ color: '#1D4ED8' }}>{formatCurrency(row.original.grandTotal)}</Typography>
      ),
    },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const m: Record<string, string> = { draft: '草稿', sent: '已发送', confirmed: '已确认', disputed: '有争议', closed: '已关闭' };
        const c: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = { draft: 'default', sent: 'info', confirmed: 'success', disputed: 'error', closed: 'success' };
        return <Chip label={m[row.original.status]} size="small" color={c[row.original.status] || 'default'} />;
      },
    },
    { accessorKey: 'vendorConfirmedAt', header: '供应商确认时间',
      cell: ({ row }) => row.original.vendorConfirmedAt ? formatDate(row.original.vendorConfirmedAt) : '-',
    },
  ], []);
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />}>新建对账单</Button>
      </Box>
      <DataTable data={vendorStatements} columns={columns} enablePagination enableExport />
    </Box>
  );
}

// ──── 发票申请 ────────────────────────────────────────────────
function InvoiceRequestPanel() {
  const { vendorInvoiceRequests } = useFlowStore();
  const columns: ColumnDef<VendorInvoiceRequest, unknown>[] = useMemo(() => [
    { accessorKey: 'requestNo', header: '申请单号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>{row.original.requestNo}</Typography>,
    },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'invoiceType', header: '发票类型',
      cell: ({ row }) => {
        const m: Record<string, string> = { vat_special: '增值税专票', vat_normal: '增值税普票', electronic: '电子发票' };
        return <Chip label={m[row.original.invoiceType]} size="small" sx={{ bgcolor: '#F0FDF4', color: '#166534', fontSize: '0.75rem' }} />;
      },
    },
    { accessorKey: 'totalAmount', header: '含税金额', cell: ({ row }) => (
        <Typography variant="body2" fontWeight={600} sx={{ color: '#1D4ED8' }}>{formatCurrency(row.original.totalAmount)}</Typography>
      ),
    },
    { accessorKey: 'taxRate', header: '税率', cell: ({ row }) => `${row.original.taxRate}%` },
    { accessorKey: 'invoiceNo', header: '发票号',
      cell: ({ row }) => row.original.invoiceNo ? (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.original.invoiceNo}</Typography>
      ) : '-',
    },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const m: Record<string, string> = { pending: '待开票', issued: '已开票', received: '已收票', verified: '已认证', rejected: '已驳回' };
        const c: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = { pending: 'warning', issued: 'info', received: 'success', verified: 'success', rejected: 'error' };
        return <Chip label={m[row.original.status]} size="small" color={c[row.original.status] || 'default'} />;
      },
    },
    { accessorKey: 'issuedAt', header: '开票时间', cell: ({ row }) => formatDate(row.original.issuedAt || '') },
  ], []);
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Send />}>申请开票</Button>
      </Box>
      <DataTable data={vendorInvoiceRequests} columns={columns} enablePagination enableExport />
    </Box>
  );
}

// ──── 主页面 ────────────────────────────────────────────────
const VendorPortal: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <PageWrapper title="供应商协同管理">
      <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid rgba(226,232,240,.8)', px: 2,
            '& .MuiTab-root': { fontSize: '0.875rem', textTransform: 'none', minHeight: 48 } }}>
          <Tab label="质量问题单" />
          <Tab label="8D 改善报告" />
          <Tab label="对账单管理" />
          <Tab label="开票申请" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <QualityIssuePanel />}
          {tab === 1 && <ImprovementReportPanel />}
          {tab === 2 && <StatementPanel />}
          {tab === 3 && <InvoiceRequestPanel />}
        </Box>
      </Paper>
    </PageWrapper>
  );
};

export default VendorPortal;
