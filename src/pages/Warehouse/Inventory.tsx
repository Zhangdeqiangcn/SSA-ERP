import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Box, Grid, Paper, Typography, Chip, Button } from '@mui/material';
import { Warning, SortByAlpha } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useOrgStore } from '@/stores/orgStore';
import { useMaterialStore, useUserStore } from '@/stores';
import { InventoryRecord, matchOrg } from '@/types';
import { formatDate } from '@/utils/format';

const Inventory: React.FC = () => {
  const inventoryRecords = useWarehouseStore(s => s.inventoryRecords);
  const inventoryAlerts = useWarehouseStore(s => s.inventoryAlerts);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const materials = useMaterialStore(s => s.materials);
  const getCategoryById = useMaterialStore(s => s.getCategoryById);
  const getUserName = useUserStore(s => s.getUserName);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  // P1-08 FEFO 排序
  const [fefoSorted, setFefoSorted] = useState(false);

  // P1-08 计算库存保质期状态
  const getShelfLifeStatus = (record: InventoryRecord): { status: 'normal' | 'expiring' | 'expired'; label: string; color: 'success' | 'warning' | 'error' } => {
    if (record.shelfLifeStatus) {
      switch (record.shelfLifeStatus) {
        case 'expiring': return { status: 'expiring', label: '临期', color: 'warning' };
        case 'expired': return { status: 'expired', label: '已过期', color: 'error' };
        default: return { status: 'normal', label: '正常', color: 'success' };
      }
    }
    const material = materials.find(m => m.id === record.materialId);
    if (!material?.shelfLifeDays || material.shelfLifeDays <= 0) return { status: 'normal', label: '无保质期', color: 'success' };
    // 基于最后入库日期估算（实际应该基于批次入库的生产日期+保质期）
    const lastInbound = record.lastInboundDate;
    if (!lastInbound) return { status: 'normal', label: '正常', color: 'success' };
    const expiryDate = new Date(lastInbound);
    expiryDate.setDate(expiryDate.getDate() + material.shelfLifeDays);
    const today = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { status: 'expired', label: '已过期', color: 'error' };
    const warningDays = material.shelfLifeWarningDays || 30;
    if (daysLeft <= warningDays) return { status: 'expiring', label: '临期', color: 'warning' };
    return { status: 'normal', label: '正常', color: 'success' };
  };

  // 物料 -> 分类 -> 库管责任人 名称
  const getKeeperNames = (materialId: string): string => {
    const m = materials.find((mm) => mm.id === materialId);
    if (!m?.categoryId) return '—';
    const cat = getCategoryById(m.categoryId);
    const ids = cat?.responsiblePersons?.['warehouse_keeper'] ?? [];
    if (ids.length === 0) return '—';
    return ids.map((id) => getUserName(id)).join('、');
  };

  const columns: ColumnDef<InventoryRecord, unknown>[] = useMemo(() => [
    { accessorKey: 'materialCode', header: '物料编码' },
    { accessorKey: 'materialName', header: '物料名称' },
    {
      id: 'keeper',
      header: '库管责任人',
      cell: ({ row }) => {
        const names = getKeeperNames(row.original.materialId);
        if (names === '—') return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {names.split('、').map((n) => (
              <Chip key={n} label={n} size="small" color="primary" />
            ))}
          </Box>
        );
      },
    },
    { accessorKey: 'specification', header: '规格型号' },
    { accessorKey: 'warehouseName', header: '仓库' },
    { accessorKey: 'locationName', header: '库位' },
    { accessorKey: 'unit', header: '单位' },
    { accessorKey: 'quantity', header: '库存数量' },
    { accessorKey: 'availableQuantity', header: '可用数量' },
    { accessorKey: 'frozenQuantity', header: '冻结数量' },
    { accessorKey: 'lastInboundDate', header: '最后入库', cell: ({ row }) => formatDate(row.original.lastInboundDate) },
    { accessorKey: 'lastOutboundDate', header: '最后出库', cell: ({ row }) => formatDate(row.original.lastOutboundDate) },
    {
      id: 'shelfLifeStatus',
      header: '保质期状态',
      cell: ({ row }) => {
        const sl = getShelfLifeStatus(row.original);
        return (
          <Chip
            label={sl.label}
            size="small"
            color={sl.color}
            data-testid="inv-shelf-life-status"
            sx={{ fontSize: '0.75rem' }}
          />
        );
      },
    },
  ], [materials, getCategoryById, getUserName]);

  const filterFields = [
    { name: 'materialCode', label: '物料编码', type: 'text' as const },
    { name: 'materialName', label: '物料名称', type: 'text' as const },
    { name: 'warehouseName', label: '仓库', type: 'text' as const },
  ];

  const filteredData = useMemo(() => {
    let data = [...inventoryRecords];
    data = data.filter(r => matchOrg(r, currentOrgId));
    if (filterData.materialCode) {
      data = data.filter(r => r.materialCode.includes(filterData.materialCode as string));
    }
    if (filterData.materialName) {
      data = data.filter(r => r.materialName.includes(filterData.materialName as string));
    }
    if (filterData.warehouseName) {
      data = data.filter(r => r.warehouseName?.includes(filterData.warehouseName as string));
    }
    // P1-08 FEFO 排序：按到期日升序（先到期先出）
    if (fefoSorted) {
      data.sort((a, b) => {
        const getExpiry = (r: InventoryRecord) => {
          const mat = materials.find(m => m.id === r.materialId);
          if (!mat?.shelfLifeDays || mat.shelfLifeDays <= 0 || !r.lastInboundDate) return Infinity;
          const d = new Date(r.lastInboundDate);
          d.setDate(d.getDate() + mat.shelfLifeDays);
          return d.getTime();
        };
        return getExpiry(a) - getExpiry(b);
      });
    }
    return data;
  }, [filterData, fefoSorted]);

  return (
    <PageWrapper title="库存查询">
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {inventoryAlerts.map(alert => (
          <Grid item xs={12} md={4} key={alert.id}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid', borderColor: alert.severity === 'critical' ? 'error.main' : 'warning.main' }}>
              <Warning color={alert.severity === 'critical' ? 'error' : 'warning'} />
              <Box>
                <Typography variant="subtitle2">{alert.materialName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  当前库存：{alert.currentQuantity} | 阈值：{alert.threshold}
                </Typography>
                <Chip
                  label={alert.type === 'low_stock' ? '库存不足' : alert.type}
                  size="small"
                  color={alert.severity === 'critical' ? 'error' : 'warning'}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <FilterBar fields={filterFields} onSearch={setFilterData} listKey="inventory-list" />

      {/* P1-08 FEFO 排序 */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant={fefoSorted ? 'contained' : 'outlined'}
          color={fefoSorted ? 'primary' : 'inherit'}
          startIcon={<SortByAlpha />}
          data-testid="inv-fefo-sort"
          onClick={() => setFefoSorted(!fefoSorted)}
          size="small"
        >
          FEFO 排序{fefoSorted ? '（已启用）' : ''}
        </Button>
      </Box>

      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
      />
    </PageWrapper>
  );
};

export default Inventory;
