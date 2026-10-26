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
import { InboundOrder, matchOrg } from '@/types';
import { formatDate } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';
import { withRelatedDocNos } from '@/utils/relations/documentRelations';
import { buildRelatedColumns } from '@/components/common/relatedColumns';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';

const InboundList: React.FC = () => {
  const navigate = useNavigate();
  useEnsureRelatedStores('inbound');
  const inboundOrders = useWarehouseStore(s => s.inboundOrders);
  const updateInboundOrder = useWarehouseStore(s => s.updateInboundOrder);
  const deleteInboundOrder = useWarehouseStore(s => s.deleteInboundOrder);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  // ── 删除 / 批量修改 / 提示 ──
  const [deleteTargets, setDeleteTargets] = useState<InboundOrder[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<InboundOrder[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const columns: ColumnDef<InboundOrder, unknown>[] = useMemo(() => [
    { accessorKey: 'inboundNo', header: '入库单号', meta: { searchable: true } },
    {
      accessorKey: 'type',
      header: '类型',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'purchase', label: '采购入库' },
          { value: 'return', label: '退货入库' },
          { value: 'transfer', label: '调拨入库' },
          { value: 'subcontract', label: '委外收货' },
          { value: 'production', label: '生产完工入库' },
        ],
      },
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          purchase: '采购入库',
          return: '退货入库',
          transfer: '调拨入库',
          subcontract: '委外收货',
          production: '生产完工入库',
        };
        return typeMap[row.original.type] || row.original.type;
      },
    },
    { accessorKey: 'sourceNo', header: '来源单号', meta: { searchable: true } },
    { accessorKey: 'vendorName', header: '供应商', meta: { searchable: true } },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'operator', header: '操作员', meta: { searchable: true } },
    { accessorKey: 'inboundDate', header: '入库日期', cell: ({ row }) => formatDate(row.original.inboundDate), meta: { searchable: true } },
    ...(buildRelatedColumns() as ColumnDef<InboundOrder, unknown>[]),
  ], []);

  // ── 批量修改可改字段（对应详情页可编辑项）──
  const INBOUND_BATCH_FIELDS: BatchEditField[] = [
    {
      key: 'status', label: '状态', type: 'select',
      options: [
        { value: 'pending', label: '待入库' },
        { value: 'processing', label: '入库中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
    { key: 'sourceNo', label: '来源单号', type: 'text' },
    { key: 'vendorName', label: '供应商', type: 'text' },
    { key: 'operator', label: '操作员', type: 'text' },
    { key: 'remarks', label: '备注', type: 'text' },
  ];

  // ── 批量导入：表头 → 字段 别名映射（中英文均可），按单号匹配，命中则更新、未命中跳过 ──
  const INBOUND_IMPORT_ALIASES: Record<string, string> = {
    入库单号: 'inboundNo', inboundNo: 'inboundNo',
    类型: 'type', type: 'type',
    来源单号: 'sourceNo', sourceNo: 'sourceNo',
    供应商: 'vendorName', vendorName: 'vendorName',
    状态: 'status', status: 'status',
    操作员: 'operator', operator: 'operator',
    入库日期: 'inboundDate', inboundDate: 'inboundDate',
    备注: 'remarks', remarks: 'remarks',
  };
  const INBOUND_STATUS_MAP: Record<string, InboundOrder['status']> = {
    待入库: 'pending', 入库中: 'processing', 已完成: 'completed', 已取消: 'cancelled',
    pending: 'pending', processing: 'processing', completed: 'completed', cancelled: 'cancelled',
  };
  const INBOUND_TYPE_MAP: Record<string, InboundOrder['type']> = {
    采购入库: 'purchase', 退货入库: 'return', 调拨入库: 'transfer', 委外收货: 'subcontract',
    生产完工入库: 'production', 在途预告: 'asn', 返工: 'rework',
    purchase: 'purchase', return: 'return', transfer: 'transfer', subcontract: 'subcontract',
    production: 'production', asn: 'asn', rework: 'rework',
  };
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = INBOUND_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const no = mapped.inboundNo;
      if (!no) { skipped += 1; continue; }
      const existing = inboundOrders.find((r) => r.inboundNo === no);
      if (!existing) { skipped += 1; continue; }
      const updates: Partial<InboundOrder> = {};
      if (mapped.sourceNo) updates.sourceNo = mapped.sourceNo;
      if (mapped.vendorName) updates.vendorName = mapped.vendorName;
      if (mapped.operator) updates.operator = mapped.operator;
      if (mapped.inboundDate) updates.inboundDate = mapped.inboundDate;
      if (mapped.remarks) updates.remarks = mapped.remarks;
      if (mapped.type) {
        const t = INBOUND_TYPE_MAP[mapped.type];
        if (t) updates.type = t;
      }
      if (mapped.status) {
        const s = INBOUND_STATUS_MAP[mapped.status];
        if (s) updates.status = s;
      }
      // 单据类安全策略：仅按单号匹配更新，未匹配到的跳过不新建
      updateInboundOrder(existing.id, updates);
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
    for (const v of targets) deleteInboundOrder(v.id);
    setSnackbar({ open: true, message: `已删除 ${targets.length} 张入库单`, severity: 'success' });
  };

  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const v of targets) updateInboundOrder(v.id, updates as Partial<InboundOrder>);
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 张入库单`, severity: 'success' });
  };

  const batchActions: BatchAction<InboundOrder>[] = [
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
    { name: 'inboundNo', label: '入库单号', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待入库' },
        { value: 'processing', label: '入库中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = inboundOrders.filter(r => matchOrg(r, currentOrgId));
    // 通用列检索：覆盖全部声明了 meta.searchable 的列（含上游/下游关联单号），并按字段权限门控
    const enhanced = withRelatedDocNos('inbound', data);
    return applyColumnFilters(enhanced, columns, filterData, { module: 'warehouse' });
  }, [filterData, inboundOrders, columns, currentOrgId]);

  return (
    <PageWrapper
      title="入库管理"
      actions={
        <ActionBar
          primary={{ label: '新建入库', onClick: () => navigate('/warehouse/inbound/create') }}
        />
      }
    >
      <FilterBar fields={filterFields} columns={columns} module="warehouse" onSearch={setFilterData} listKey="inbound-list" />
      <DataTable<InboundOrder>
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="入库单"
        hiddenColumns={['upstreamNo', 'downstreamNo']}
        columnConfigKey="inbound-list"
        codeColumnId="inboundNo"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/warehouse/inbound/${row.id}`)}
        onView={(row) => navigate(`/warehouse/inbound/${row.id}`)}
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
            ? `确定删除入库单「${deleteTargets[0]?.inboundNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 张入库单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改入库单"
        count={pendingBatchEdit.length}
        fields={INBOUND_BATCH_FIELDS}
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

export default InboundList;
