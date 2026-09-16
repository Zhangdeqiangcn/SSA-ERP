import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, TextField, Tooltip, Alert,
} from '@mui/material';
import { Add, Visibility, Edit, ContentCopy, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common';
import { useBOMStore } from '@/stores/bomStore';
import { BOMType, BOMStatus, BOMHeader } from '@/types/bom';

const TYPE_COLORS: Record<BOMType, string> = {
  EBOM: '#3B82F6',
  MBOM: '#10B981',
};

const STATUS_LABELS: Record<BOMStatus, string> = {
  draft: '草稿',
  released: '已发布',
  obsolete: '已废弃',
};

const STATUS_COLORS: Record<BOMStatus, string> = {
  draft: '#F59E0B',
  released: '#10B981',
  obsolete: '#94A3B8',
};

/** 按 productId 分组，每组第一条为主BOM（isAlternate !== true），其余为替代 */
const groupBOMsByProduct = (bomList: BOMHeader[]): Map<string, { main: BOMHeader; alternates: BOMHeader[] }> => {
  const map = new Map<string, { main: BOMHeader; alternates: BOMHeader[] }>();
  for (const bom of bomList) {
    const key = bom.productId;
    const existing = map.get(key);
    if (!existing) {
      const sorted = bomList.filter(b => b.productId === key).sort((a, b) => {
        // 主BOM优先，再按优先级排序
        if (a.isAlternate && !b.isAlternate) return 1;
        if (!a.isAlternate && b.isAlternate) return -1;
        return (a.priority ?? 0) - (b.priority ?? 0);
      });
      map.set(key, { main: sorted[0], alternates: sorted.slice(1) });
    }
  }
  return map;
};

const BOMList: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<BOMType | ''>('');
  const bomList = useBOMStore(s => s.bomList);
  const addBOM = useBOMStore(s => s.addBOM);
  const load = useBOMStore(s => s.load);
  const loaded = useBOMStore(s => s.loaded);
  const syncError = useBOMStore(s => s.syncError);

  // V3.6.0 C1：BOM 的数据主源已改为 D1 关系表（bom_headers + bom_items）。
  // 进页面拉一次。为什么放在列表页而不是全局启动时拉：
  //   BOM 只在用到的页面才需要，全局启动拉会让首屏多一次网络等待；
  //   而列表页是最自然的入口（用户要看 BOM 必然先到这里）。
  // 失败时不影响渲染 —— store 会保留本地缓存并给出 syncError，界面照常可用。
  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => groupBOMsByProduct(bomList), [bomList]);

  const filteredGroups = useMemo(() => {
    const entries = Array.from(grouped.entries());
    if (!typeFilter && !keyword) return entries;
    return entries.filter(([, group]) => {
      const all = [group.main, ...group.alternates];
      return all.some(b => {
        if (typeFilter && b.type !== typeFilter) return false;
        if (keyword && !b.productName.includes(keyword) && !b.bomNo.includes(keyword)) return false;
        return true;
      });
    });
  }, [grouped, typeFilter, keyword]);

  // 展平为单列数据（保留过滤结果，按 主BOM + 替代 顺序）
  const flatRows = useMemo(() => {
    const rows: BOMHeader[] = [];
    filteredGroups.forEach(([, group]) => {
      rows.push(group.main, ...group.alternates);
    });
    return rows;
  }, [filteredGroups]);

  const mapImportRow = (r: Record<string, string>, _headers: string[]): BOMHeader => {
    const typeMap: Record<string, BOMType> = { EBOM: 'EBOM', MBOM: 'MBOM' };
    const statusMap: Record<string, BOMStatus> = { 草稿: 'draft', 已发布: 'released', 已废弃: 'obsolete' };
    return {
      id: `bom-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bomNo: r['BOM编号'] || `BOM-IMP-${Date.now()}`,
      name: r['名称'] || r['BOM编号'] || '',
      type: typeMap[r['类型']] || 'EBOM',
      status: statusMap[r['状态']] || 'draft',
      productId: r['成品ID'] || '',
      productCode: r['成品编码'] || '',
      productName: r['成品名称'] || '',
      version: r['版本'] || 'V1.0',
      effectiveDate: r['生效日期'] || '',
      currency: 'CNY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    };
  };

  const columns: ColumnDef<BOMHeader, unknown>[] = [
    {
      id: 'product',
      header: '产品',
      accessorFn: (row) => `${row.productName} ${row.productCode}`,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>{row.original.productName}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {row.original.productCode}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'isAlternate',
      header: '替代',
      accessorFn: (row) => (row.isAlternate ? '替代' : ''),
      cell: ({ row }) =>
        row.original.isAlternate ? (
          <Chip
            label="替代"
            size="small"
            data-testid="bom-alt-chip"
            sx={{ bgcolor: '#FFF7ED', color: '#F59E0B', fontWeight: 600, fontSize: '0.6875rem' }}
          />
        ) : null,
    },
    {
      id: 'bomNo',
      header: 'BOM 编号',
      accessorFn: (row) => row.bomNo,
      cell: ({ row }) => (
        <Box
          sx={{
            pl: row.original.isAlternate ? 3 : 0,
            borderLeft: row.original.isAlternate ? '3px solid #F59E0B' : 'none',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace', color: '#3B82F6' }}>
            {row.original.bomNo}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'type',
      header: '类型',
      accessorFn: (row) => row.type,
      cell: ({ row }) => (
        <Chip
          label={row.original.type}
          size="small"
          sx={{ bgcolor: TYPE_COLORS[row.original.type] + '15', color: TYPE_COLORS[row.original.type], fontWeight: 600, fontSize: '0.75rem' }}
        />
      ),
    },
    {
      id: 'version',
      header: '版本',
      accessorFn: (row) => row.version,
      cell: ({ row }) => (
        <Chip label={row.original.version} size="small" sx={{ bgcolor: '#F8FAFC', color: '#475569' }} />
      ),
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Chip
          label={STATUS_LABELS[row.original.status]}
          size="small"
          sx={{ bgcolor: STATUS_COLORS[row.original.status] + '15', color: STATUS_COLORS[row.original.status], fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'effectiveDate',
      header: '生效日期',
      accessorFn: (row) => row.effectiveDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.effectiveDate}</Typography>,
    },
    {
      id: 'totalCost',
      header: '总成本',
      accessorFn: (row) => row.totalCost ?? 0,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          ¥{row.original.totalCost?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) ?? '0.00'}
        </Typography>
      ),
    },
    {
      id: 'approvedBy',
      header: '发布人',
      accessorFn: (row) => row.approvedBy || '-',
      cell: ({ row }) => <Typography variant="body2">{row.original.approvedBy || '-'}</Typography>,
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
          <Tooltip title="查看详情">
            <IconButton size="small" onClick={() => navigate(`/bom/${row.original.id}`)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="编辑">
            <IconButton size="small" onClick={() => navigate(`/bom/${row.original.id}/edit`)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="复制BOM">
            <IconButton size="small"><ContentCopy fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>BOM 管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/bom/create')}>
          新建 BOM
        </Button>
      </Box>

      {/* 同步异常提示（V3.6.0 C1）：BOM 主源已迁 D1，读不到时必须如实说明，
          而不是让用户对着「本地缓存的旧数据」以为看到的是最新——这正是
          「看起来还在、其实已经不同步」的危险状态。 */}
      {syncError && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} data-testid="bom-sync-error">
          {syncError}
          <Button size="small" sx={{ ml: 1 }} onClick={() => void load()}>重试</Button>
        </Alert>
      )}

      {/* 统计 */}
      <Box sx={{ display: 'flex', gap: 2.5, mb: 3 }}>
        {[
          { label: '全部', count: bomList.length, color: '#6366F1', filter: '' },
          { label: 'EBOM', count: bomList.filter(b => b.type === 'EBOM').length, color: '#3B82F6', filter: 'EBOM' },
          { label: 'MBOM', count: bomList.filter(b => b.type === 'MBOM').length, color: '#10B981', filter: 'MBOM' },
          { label: '已发布', count: bomList.filter(b => b.status === 'released').length, color: '#10B981', filter: '' },
          { label: '草稿', count: bomList.filter(b => b.status === 'draft').length, color: '#F59E0B', filter: '' },
        ].map((item) => (
          <Paper
            key={item.label}
            sx={{ px: 2.5, py: 2, borderRadius: 3, cursor: 'pointer', border: `1px solid ${item.color}20`, flex: 1 }}
            onClick={() => item.filter && setTypeFilter(item.filter as BOMType | '')}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: item.color }}>{item.count}</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{item.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 过滤 */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="产品名称/BOM编号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }} /> }}
            sx={{ width: 220 }}
          />
          {(['', 'EBOM', 'MBOM'] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setTypeFilter(t)}
            >
              {t || '全部'}
            </Button>
          ))}
        </Box>
      </Paper>

      {flatRows.length > 0 ? (
        <DataTable<BOMHeader>
          data={flatRows}
          columns={columns}
          loading={!loaded}
          emptyText="暂无 BOM。点右上角「新建 BOM」开始，或从销售订单一键生成。"
          enableRowSelection={false}
          enablePagination={true}
          enableSorting={true}
          enableColumnFilter={true}
          enableBlockSelect={true}
          enableExport={true}
          exportFormat="xlsx"
          enableImport={true}
          onImport={(rows, headers) => rows.forEach(r => addBOM(mapImportRow(r, headers)))}
          columnConfigKey="bom-bom-list"
        />
      ) : (
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#94A3B8' }}>暂无匹配的 BOM 记录</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default BOMList;
