import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Chip, Typography, Stack, Button, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Grid, MenuItem as MuiMenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Alert, Divider,
} from '@mui/material';
import { Add, OpenInNew, CheckCircle, Cancel, Info } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, FlowTracker } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import type { InspectionNotice } from '@/types';
import { formatDate } from '@/utils/format';

const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  pending:    { label: '待检验', color: 'warning' },
  inspecting: { label: '检验中', color: 'info' },
  passed:     { label: '已通过', color: 'success' },
  failed:     { label: '未通过', color: 'error' },
  partial:    { label: '部分通过', color: 'warning' },
};

const sourceTypeMap: Record<string, string> = {
  purchase:   '采购入库',
  production: '生产成品',
  return:     '客户退货',
};

/** 新建报检单弹窗 */
const NewNoticeDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form, setForm] = useState({
    sourceType: 'purchase',
    sourceNo: '',
    materialCode: '',
    materialName: '',
    specification: '',
    unit: '件',
    noticeQty: '',
    batchNo: '',
    warehouseName: '',
    reportedBy: '',
    remarks: '',
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>新建报检单</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>来源类型</InputLabel>
              <Select value={form.sourceType} label="来源类型"
                onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                <MuiMenuItem value="purchase">采购入库</MuiMenuItem>
                <MuiMenuItem value="production">生产成品</MuiMenuItem>
                <MuiMenuItem value="return">客户退货</MuiMenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="来源单号"
              placeholder="采购订单号/生产工单号"
              value={form.sourceNo} onChange={(e) => setForm({ ...form, sourceNo: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="物料编码 *"
              placeholder="如 MAT202405010001"
              value={form.materialCode} onChange={(e) => setForm({ ...form, materialCode: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="物料名称 *"
              value={form.materialName} onChange={(e) => setForm({ ...form, materialName: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="规格型号"
              value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="报检数量 *" type="number"
              value={form.noticeQty} onChange={(e) => setForm({ ...form, noticeQty: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="单位"
              value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="批次号"
              value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="仓库/存放位置"
              value={form.warehouseName} onChange={(e) => setForm({ ...form, warehouseName: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="报检人"
              value={form.reportedBy} onChange={(e) => setForm({ ...form, reportedBy: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="备注" multiline rows={2}
              value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" onClick={() => { onClose(); alert('报检单已暂存！（演示模式）'); }}>暂存</Button>
        <Button variant="contained" onClick={onClose}>提交报检</Button>
      </DialogActions>
    </Dialog>
  );
};

const InspectionNoticeList: React.FC = () => {
  const { inspectionNotices } = useFlowStore();
  const navigate = useNavigate();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [newOpen, setNewOpen] = useState(false);

  const columns: ColumnDef<InspectionNotice, unknown>[] = useMemo(() => [
    { accessorKey: 'noticeNo', header: '报检单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>
          {row.original.noticeNo}
        </Typography>
      ),
    },
    { accessorKey: 'sourceType', header: '来源', cell: ({ row }) => (
        <Chip label={sourceTypeMap[row.original.sourceType]} size="small"
          sx={{ bgcolor: '#F1F5F9', color: '#475569', fontSize: '0.75rem' }} />
      ),
    },
    { accessorKey: 'sourceNo', header: '来源单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
          {row.original.sourceNo}
        </Typography>
      ),
    },
    { accessorKey: 'materialCode', header: '物料编码',
      cell: ({ row }) => (
        <Stack>
          <Chip label={row.original.materialCode} size="small"
            sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.75rem', mb: 0.3 }} />
          <Typography variant="caption" color="text.secondary">{row.original.materialName}</Typography>
        </Stack>
      ),
    },
    { accessorKey: 'specification', header: '规格型号', cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.original.specification}
        </Typography>
      ),
    },
    { accessorKey: 'noticeQty', header: '报检数量', cell: ({ row }) => `${row.original.noticeQty} ${row.original.unit}` },
    { accessorKey: 'batchNo', header: '批次号', cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.original.batchNo}</Typography>
      ),
    },
    { accessorKey: 'status', header: '状态', cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return <Chip label={s?.label || row.original.status} size="small" color={s?.color || 'default'} />;
      },
    },
    { accessorKey: 'reportedBy', header: '报检人' },
    { accessorKey: 'reportedAt', header: '报检时间', cell: ({ row }) => formatDate(row.original.reportedAt) },
  ], []);

  const filterFields = [
    { name: 'noticeNo', label: '报检单号', type: 'text' as const },
    { name: 'materialCode', label: '物料编码', type: 'text' as const },
    {
      name: 'status', label: '状态', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待检验' },
        { value: 'inspecting', label: '检验中' },
        { value: 'passed', label: '已通过' },
        { value: 'failed', label: '未通过' },
        { value: 'partial', label: '部分通过' },
      ],
    },
    {
      name: 'sourceType', label: '来源类型', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'purchase', label: '采购入库' },
        { value: 'production', label: '生产成品' },
        { value: 'return', label: '客户退货' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...inspectionNotices];
    if (filterData.noticeNo) data = data.filter(d => d.noticeNo.includes(filterData.noticeNo as string));
    if (filterData.materialCode) data = data.filter(d => d.materialCode.includes(filterData.materialCode as string));
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    if (filterData.sourceType) data = data.filter(d => d.sourceType === filterData.sourceType);
    return data;
  }, [filterData]);

  // 统计卡片
  const stats = useMemo(() => ({
    total: inspectionNotices.length,
    pending: inspectionNotices.filter(d => d.status === 'pending').length,
    inspecting: inspectionNotices.filter(d => d.status === 'inspecting').length,
    passed: inspectionNotices.filter(d => d.status === 'passed').length,
    failed: inspectionNotices.filter(d => d.status === 'failed').length,
  }), []);

  return (
    <PageWrapper
      title="报检单管理"
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="inspection-notice" currentStatus="in_accepted" />
          <ActionBar primary={{ label: '新建报检单', onClick: () => setNewOpen(true) }} />
        </Stack>
      }
    >
      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '全部', value: stats.total, color: '#3B82F6', bg: '#EFF6FF' },
          { label: '待检验', value: stats.pending, color: '#F59E0B', bg: '#FFFBEB' },
          { label: '检验中', value: stats.inspecting, color: '#6366F1', bg: '#EEF2FF' },
          { label: '已通过', value: stats.passed, color: '#10B981', bg: '#ECFDF5' },
          { label: '未通过', value: stats.failed, color: '#EF4444', bg: '#FEF2F2' },
        ].map((s) => (
          <Grid item xs={6} sm={4} md={2.4} key={s.label}>
            <Paper elevation={0} sx={{ p: 1.5, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, textAlign: 'center', bgcolor: s.bg }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onView={(row) => navigate(`/quality/inspection/${row.id}`)}
        onEdit={(row) => navigate(`/quality/inspection/${row.id}`)}
      />
      <NewNoticeDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </PageWrapper>
  );
};

export default InspectionNoticeList;
