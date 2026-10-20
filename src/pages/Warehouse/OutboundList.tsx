import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Snackbar, Alert } from '@mui/material';
import { EditNote, DeleteOutline } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, ActionBar, StatusBadge,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useOrgStore } from '@/stores/orgStore';
import { OutboundOrder, matchOrg } from '@/types';
import { formatDate } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';

const OutboundList: React.FC = () => {
  const navigate = useNavigate();
  const outboundOrders = useWarehouseStore(s => s.outboundOrders);
  const updateOutboundOrder = useWarehouseStore(s => s.updateOutboundOrder);
  const deleteOutboundOrder = useWarehouseStore(s => s.deleteOutboundOrder);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  // ── 删除 / 批量修改 / 提示 ──
  const [deleteTargets, setDeleteTargets] = useState<OutboundOrder[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<OutboundOrder[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const columns: ColumnDef<OutboundOrder, unknown>[] = useMemo(() => [
    { accessorKey: 'outboundNo', header: '出库单号', meta: { searchable: true } },
    {
      accessorKey: 'type',
      header: '类型',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'sale', label: '销售出库' },
          { value: 'pick', label: '领料出库' },
          { value: 'transfer', label: '调拨出库' },
          { value: 'return', label: '退货出库' },
          { value: 'subcontract', label: '委外发料' },
        ],
      },
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          sale: '销售出库',
          pick: '领料出库',
          transfer: '调拨出库',
          return: '退货出库',
          subcontract: '委外发料',
        };
        return typeMap[row.original.type] || row.original.type;
      },
    },
    { accessorKey: 'customerName', header: '客户', meta: { searchable: true } },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'operator', header: '操作员', meta: { searchable: true } },
    { accessorKey: 'outboundDate', header: '出库日期', cell: ({ row }) => formatDate(row.original.outboundDate), meta: { searchable: true } },
  ], []);

  // ── 批量修改可改字段（对应详情页可编辑项）──
  const OUTBOUND_BATCH_FIELDS: BatchEditField[] = [
    {
      key: 'status', label: '状态', type: 'select',
      options: [
        { value: 'pending', label: '待出库' },
        { value: 'processing', label: '出库中' },
        { value: 'picking', label: '拣配中' },
        { value: 'picked', label: '已拣配' },
        { value: 'packed', label: '已包装' },
        { value: 'shipped', label: '已发货' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
    { key: 'sourceNo', label: '来源单号', type: 'text' },
    { key: 'customerName', label: '客户', type: 'text' },
    { key: 'operator', label: '操作员', type: 'text' },
    { key: 'remarks', label: '备注', type: 'text' },
  ];

  // ── 批量导入：表头 → 字段 别名映射（中英文均可），按单号匹配，命中则更新、未命中跳过 ──
  const OUTBOUND_IMPORT_ALIASES: Record<string, string> = {
    出库单号: 'outboundNo', outboundNo: 'outboundNo',
    类型: 'type', type: 'type',
    客户: 'customerName', customerName: 'customerName',
    来源单号: 'sourceNo', sourceNo: 'sourceNo',
    状态: 'status', status: 'status',
    操作员: 'operator', operator: 'operator',
    出库日期: 'outboundDate', outboundDate: 'outboundDate',
    备注: 'remarks', remarks: 'remarks',
  };
  const OUTBOUND_STATUS_MAP: Record<string, OutboundOrder['status']> = {
    待出库: 'pending', 出库中: 'processing', 拣配中: 'picking', 已拣配: 'picked',
    已包装: 'packed', 已发货: 'shipped', 已完成: 'completed', 已取消: 'cancelled',
    pending: 'pending', processing: 'processing', picking: 'picking', picked: 'picked',
    packed: 'packed', shipped: 'shipped', completed: 'completed', cancelled: 'cancelled',
  };
  const OUTBOUND_TYPE_MAP: Record<string, OutboundOrder['type']> = {
    销售出库: 'sale', 领料出库: 'pick', 调拨出库: 'transfer', 退货出库: 'return',
    委外发料: 'subcontract', 报废出库: 'scrap',
    sale: 'sale', pick: 'pick', transfer: 'transfer', return: 'return',
    subcontract: 'subcontract', scrap: 'scrap',
  };
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = OUTBOUND_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const no = mapped.outboundNo;
      if (!no) { skipped += 1; continue; }
      const existing = outboundOrders.find((r) => r.outboundNo === no);
      if (!existing) { skipped += 1; continue; }
      const updates: Partial<OutboundOrder> = {};
      if (mapped.sourceNo) updates.sourceNo = mapped.sourceNo;
      if (mapped.customerName) updates.customerName = mapped.customerName;
      if (mapped.operator) updates.operator = mapped.operator;
      if (mapped.outboundDate) updates.outboundDate = mapped.outboundDate;
      if (mapped.remarks) updates.remarks = mapped.remarks;
      if (mapped.type) {
        const t = OUTBOUND_TYPE_MAP[mapped.type];
        if (t) updates.type = t;
      }
      if (mapped.status) {
        const s = OUTBOUND_STATUS_MAP[mapped.status];
        if (s) updates.status = s;
      }
      // 单据类安全策略：仅按单号匹配更新，未匹配到的跳过不新建
      updateOutboundOrder(existing.id, updates);
      updated += 1;
    }
    setSnackbar({
      open: true,
      message: `更新 ${updated} 条，跳过 ${skipped} 条（未匹配到现有单号）`,
      severity: updated + skipped > 0 ? 'success' : 'info',
    });
  };

  const confirmDelete = () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const v of targets) deleteOutboundOrder(v.id);
    setSnackbar({ open: true, message: `已删除 ${targets.length} 张出库单`, severity: 'success' });
  };

  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const v of targets) updateOutboundOrder(v.id, updates as Partial<OutboundOrder>);
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 张出库单`, severity: 'success' });
  };

  const batchActions: BatchAction<OutboundOrder>[] = [
    {
      label: '批量修改',
      icon: <EditNote sx={{ fontSize: 14 }} />,
      testId: 'batch-edit',
      onClick: (rows) => { setPendingBatchEdit(rows); setBatchEditOpen(true); },
    },
    {
      label: '批量删除',
      icon: <DeleteOutline sx={{ fontSize: 14 }} />,
      color: 'error',
      testId: 'batch-delete',
      onClick: (rows) => { setDeleteTargets(rows); setDeleteOpen(true); },
    },
  ];

  const filterFields = [
    { name: 'outboundNo', label: '出库单号', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待出库' },
        { value: 'processing', label: '出库中' },
        { value: 'picking', label: '拣配中' },
        { value: 'picked', label: '已拣配' },
        { value: 'packed', label: '已包装' },
        { value: 'shipped', label: '已发货' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = outboundOrders.filter(r => matchOrg(r, currentOrgId));
    // 通用列检索：覆盖全部声明了 meta.searchable 的列（出库单号/类型/客户/状态/操作员/出库日期），并按字段权限门控
    data = applyColumnFilters(data, columns, filterData, { module: 'warehouse' });
    return data;
  }, [filterData, outboundOrders, columns, currentOrgId]);

  return (
    <PageWrapper
      title="出库管理"
      actions={
        <ActionBar
          primary={{ label: '新建出库', onClick: () => navigate('/warehouse/outbound/create') }}
        />
      }
    >
      <FilterBar fields={filterFields} columns={columns} module="warehouse" onSearch={setFilterData} listKey="outbound-list" />
      <DataTable<OutboundOrder>
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="出库单"
        codeColumnId="outboundNo"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/warehouse/outbound/${row.id}`)}
        onView={(row) => navigate(`/warehouse/outbound/${row.id}`)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
      />

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除出库单「${deleteTargets[0]?.outboundNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 张出库单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改出库单"
        count={pendingBatchEdit.length}
        fields={OUTBOUND_BATCH_FIELDS}
        onConfirm={confirmBatchEdit}
        onCancel={() => { setBatchEditOpen(false); setPendingBatchEdit([]); }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default OutboundList;
