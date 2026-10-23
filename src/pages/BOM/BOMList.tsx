import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, Tooltip, Alert,
} from '@mui/material';
import { Add, Visibility, Edit, ContentCopy } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, FilterBar, StatusBadge } from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { useBOMStore } from '@/stores/bomStore';
import { BOMType, BOMStatus, BOMHeader } from '@/types/bom';
import { BOMImportPanel } from '@/pages/BOM/BOMImport';

// BOM 类型 → MUI 语义色令牌（EBOM=设计蓝 / MBOM=制造绿），替代原 hex 硬编码
const TYPE_TOKEN: Record<BOMType, 'primary' | 'success'> = {
  EBOM: 'primary',
  MBOM: 'success',
};

// BOM 状态 → 集中 statusConfig key（obsolete 复用通用 key）
const BOM_STATUS_KEY: Record<BOMStatus, string> = {
  draft: 'bom_draft',
  released: 'bom_released',
  obsolete: 'obsolete',
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
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const bomList = useBOMStore(s => s.bomList);
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

  // 展平为单列数据（按 主BOM + 替代 顺序）。注意：Map.forEach 回调签名是 (value, key)，
  // 因此直接接 group（value = { main, alternates }），不要按数组解构。
  const flatRows = useMemo(() => {
    const rows: BOMHeader[] = [];
    grouped.forEach((group) => {
      rows.push(group.main, ...group.alternates);
    });
    return rows;
  }, [grouped]);

  const columns: ColumnDef<BOMHeader, unknown>[] = [
    {
      id: 'product',
      header: '产品',
      accessorKey: 'productName',
      meta: { searchable: true },
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
      meta: { searchable: true },
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
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'EBOM', label: 'EBOM' },
          { value: 'MBOM', label: 'MBOM' },
        ],
      },
      accessorFn: (row) => row.type,
      cell: ({ row }) => (
        <Chip
          label={row.original.type}
          size="small"
          color={TYPE_TOKEN[row.original.type]}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
        />
      ),
    },
    {
      id: 'version',
      header: '版本',
      meta: { searchable: true },
      accessorFn: (row) => row.version,
      cell: ({ row }) => (
        <Chip label={row.original.version} size="small" sx={{ bgcolor: '#F8FAFC', color: '#475569' }} />
      ),
    },
    {
      id: 'status',
      header: '状态',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'draft', label: '草稿' },
          { value: 'released', label: '已发布' },
          { value: 'obsolete', label: '已废弃' },
        ],
      },
      accessorFn: (row) => row.status,
      cell: ({ row }) => <StatusBadge status={BOM_STATUS_KEY[row.original.status]} />,
    },
    {
      id: 'effectiveDate',
      header: '生效日期',
      meta: { searchable: true },
      accessorFn: (row) => row.effectiveDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.effectiveDate}</Typography>,
    },
    {
      id: 'totalCost',
      header: '总成本',
      meta: { searchable: true },
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
      meta: { searchable: true },
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

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filtered = useMemo(
    () => applyColumnFilters(flatRows, columns, filterData, { module: 'bom' }),
    [flatRows, columns, filterData]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>BOM 管理</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* V3.97.0 Excel 导入：下载模板 + 导入（必填项校验 + 逐行失败原因） */}
          <BOMImportPanel />
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/bom/create')} data-testid="bom-create-btn">
            新建 BOM
          </Button>
        </Box>
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
            onClick={() => item.filter && setFilterData((prev) => ({ ...prev, type: item.filter || undefined }))}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: item.color }}>{item.count}</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{item.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 列驱动统一检索条（默认显前 5 项检索框，其余「更多筛选」展开） */}
      <FilterBar columns={columns} module="bom" onSearch={setFilterData} listKey="bom-list" />

      {filtered.length > 0 ? (
        <DataTable<BOMHeader>
          data={filtered}
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
