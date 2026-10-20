import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, LinearProgress,
} from '@mui/material';
import { Add, Visibility, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useSalesStore } from '@/stores/salesStore';
import { Project, ProjectStatus } from '@/types';
import { PageWrapper } from '@/components/layout';
import { DataTable, StatusBadge, FilterBar } from '@/components/common';
import { formatCurrency } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '规划中', in_progress: '执行中', pending: '暂停', at_risk: '风险', completed: '已完成', closed: '已关闭',
};
// 销售项目状态 → 集中 statusConfig key（at_risk/completed/closed 复用通用 key）
const PROJ_STATUS_KEY: Record<ProjectStatus, string> = {
  planning: 'proj_planning',
  in_progress: 'proj_in_progress',
  pending: 'proj_pending',
  at_risk: 'at_risk',
  completed: 'completed',
  closed: 'closed',
};

const ProjectList: React.FC = () => {
  const { projects, addProject } = useSalesStore();
  const navigate = useNavigate();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // ── 列定义（驱动 DataTable）──
  const columns: ColumnDef<Project, unknown>[] = [
    {
      id: 'projectNo',
      header: '项目编号',
      accessorFn: (p) => p.projectNo,
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" color="#3B82F6" fontWeight={500}>{row.original.projectNo}</Typography>
      ),
    },
    {
      id: 'projectName',
      header: '项目名称',
      accessorFn: (p) => p.projectName,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.projectName}</Typography>,
    },
    {
      id: 'customerName',
      header: '客户',
      accessorFn: (p) => p.customerName,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.customerName}</Typography>,
    },
    {
      id: 'manager',
      header: '项目经理',
      accessorFn: (p) => p.manager,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.manager}</Typography>,
    },
    {
      id: 'dateRange',
      header: '起止日期',
      accessorFn: (p) => `${p.startDate} ~ ${p.endDate}`,
      cell: ({ row }) => (
        <Typography variant="caption">{row.original.startDate} ~ {row.original.endDate}</Typography>
      ),
    },
    {
      id: 'contractAmount',
      header: '合同金额',
      accessorFn: (p) => p.contractAmount,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight={500}>{formatCurrency(row.original.contractAmount)}</Typography>
        </Box>
      ),
    },
    {
      id: 'receivedAmount',
      header: '回款金额',
      accessorFn: (p) => p.receivedAmount,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="#10B981">{formatCurrency(row.original.receivedAmount)}</Typography>
        </Box>
      ),
    },
    {
      id: 'actualCost',
      header: '实际成本',
      accessorFn: (p) => p.actualCost,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary">{formatCurrency(row.original.actualCost)}</Typography>
        </Box>
      ),
    },
    {
      id: 'progress',
      header: '进度',
      accessorFn: (p) => p.progress,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={row.original.progress}
            sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: '#E2E8F0',
              '& .MuiLinearProgress-bar': { bgcolor: row.original.progress >= 80 ? '#10B981' : row.original.progress >= 40 ? '#3B82F6' : '#F59E0B' } }} />
          <Typography variant="caption">{row.original.progress}%</Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (p) => STATUS_LABELS[p.status],
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'planning', label: '规划中' },
          { value: 'in_progress', label: '执行中' },
          { value: 'pending', label: '暂停' },
          { value: 'at_risk', label: '风险' },
          { value: 'completed', label: '已完成' },
          { value: 'closed', label: '已关闭' },
        ],
      },
      cell: ({ row }) => <StatusBadge status={PROJ_STATUS_KEY[row.original.status]} />,
    },
    {
      id: 'exceptions',
      header: '异常',
      accessorFn: (p) => p.exceptions.filter(e => e.status === 'open' || e.status === 'investigating').length,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const hasOpenExceptions = p.exceptions.filter(e => e.status === 'open' || e.status === 'investigating').length;
        return hasOpenExceptions > 0 ? (
          <Chip icon={<Warning />} label={`${hasOpenExceptions}个`} size="small" color="error" variant="outlined" />
        ) : (
          <Typography variant="caption" color="text.secondary">无</Typography>
        );
      },
    },
  ];

  const filtered = useMemo(
    () => applyColumnFilters(projects, columns, filterData, { module: 'sales' }),
    [projects, columns, filterData]
  );

  // ── 导入：把表头行映射回 store 字段 ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const toNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r: Record<string, string>, headers: string[]): Project => {
    const now = new Date().toISOString();
    const statusVal = pickField(r, headers, '状态', 'status') || 'planning';
    return {
      id: `prj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectNo: pickField(r, headers, '项目编号', 'projectNo') || `PRJ${now.slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`,
      projectName: pickField(r, headers, '项目名称', 'projectName'),
      customerName: pickField(r, headers, '客户', 'customerName'),
      customerCode: pickField(r, headers, '客户编码', 'customerCode') || undefined,
      status: (Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : 'planning') as ProjectStatus,
      startDate: pickField(r, headers, '开始日期', 'startDate') || now.slice(0, 10),
      endDate: pickField(r, headers, '结束日期', 'endDate') || now.slice(0, 10),
      contractAmount: toNum(pickField(r, headers, '合同金额', 'contractAmount')),
      receivedAmount: toNum(pickField(r, headers, '回款金额', 'receivedAmount')),
      budget: toNum(pickField(r, headers, '预算', 'budget')),
      actualCost: toNum(pickField(r, headers, '实际成本', 'actualCost')),
      progress: Number(pickField(r, headers, '进度', 'progress').replace(/[^0-9.]/g, '')) || 0,
      manager: pickField(r, headers, '项目经理', 'manager'),
      team: [],
      milestones: [],
      exceptions: [],
      linkedOrders: [],
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    } as unknown as Project;
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addProject(mapImportRow(r, headers)));
  };

  return (
    <PageWrapper
      title="项目管理"
      actions={
        <Button variant="contained" startIcon={<Add />}>新建项目</Button>
      }
    >
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '全部项目', count: projects.length, color: '#6366F1' },
          { label: '执行中', count: projects.filter(p => p.status === 'in_progress').length, color: '#3B82F6' },
          { label: '风险项目', count: projects.filter(p => p.status === 'at_risk' || p.exceptions.some(e => e.status === 'open')).length, color: '#EF4444' },
          { label: '已完成', count: projects.filter(p => p.status === 'completed').length, color: '#10B981' },
        ].map(s => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.count}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 检索条（标准化） */}
      <FilterBar columns={columns} module="sales" onSearch={setFilterData} listKey="sales-project-list" />

      {/* 项目列表 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable<Project>
          data={filtered}
          columns={columns}
          enableExport
          enableImport
          columnConfigKey="sales-project-list"
          codeColumnId="projectNo"
          onRowClick={(p) => navigate(`/sales/projects/${p.id}`)}
          onView={(p) => navigate(`/sales/projects/${p.id}`)}
          onImport={handleImport}
        />
      </Paper>
    </PageWrapper>
  );
};

export default ProjectList;
