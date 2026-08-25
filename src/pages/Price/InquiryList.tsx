import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, Paper, Checkbox, Alert, Stack, Divider,
  FormControlLabel,
} from '@mui/material';
import { Add, ContentCopy } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, FlowTracker } from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PriceInquiry, PriceInquiryItem } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'info' },
  closed: { label: '已截止', color: 'warning' },
  quotation_received: { label: '已收到报价', color: 'primary' },
  compared: { label: '已比价', color: 'success' },
};

const InquiryList: React.FC = () => {
  const navigate = useNavigate();
  const priceInquiries = usePriceStore(s => s.priceInquiries);
  const addPriceInquiry = usePriceStore(s => s.addPriceInquiry);
  const purchaseRequests = usePurchaseStore(s => s.purchaseRequests);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, string[]>>({});

  const columns: ColumnDef<PriceInquiry, unknown>[] = useMemo(() => [
    { accessorKey: 'inquiryNo', header: '询价单号', size: 160 },
    { accessorKey: 'title', header: '标题', size: 220 },
    { accessorKey: 'inquirer', header: '询价人' },
    { accessorKey: 'department', header: '部门' },
    {
      accessorKey: 'targetVendorNames',
      header: '目标供应商',
      size: 250,
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {row.original.targetVendorNames.map((name, idx) => (
            <Chip key={idx} label={name} size="small" variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }} />
          ))}
        </Stack>
      ),
    },
    {
      accessorKey: 'deadline',
      header: '截止日期',
      cell: ({ row }) => formatDate(row.original.deadline),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip label={STATUS_MAP[row.original.status]?.label || row.original.status}
          size="small"
          color={STATUS_MAP[row.original.status]?.color as any || 'default'}
          sx={{ fontSize: '0.75rem' }} />
      ),
    },
    {
      accessorKey: 'totalEstimatedAmount',
      header: '预估总金额',
      accessorFn: (r) => Number(r.totalEstimatedAmount || 0),
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.totalEstimatedAmount)}</Box>
      ),
    },
  ], []);

  // ── 弹窗内「采购申请物料明细」列（带勾选）──
  const buildMaterialColumns = (requestId: string): ColumnDef<PriceInquiryItem, unknown>[] => [
    {
      id: 'select',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Checkbox
          size="small"
          checked={(selectedItemsMap[requestId] || []).includes(row.original.id)}
          onChange={() => handleItemToggle(requestId, row.original.id)}
        />
      ),
    },
    { accessorKey: 'materialCode', header: '物料编码' },
    { accessorKey: 'materialName', header: '物料名称' },
    { accessorKey: 'specification', header: '规格' },
    { accessorKey: 'unit', header: '单位' },
    {
      accessorKey: 'quantity',
      header: '数量',
      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box>,
    },
    {
      accessorKey: 'estimatedPrice',
      header: '预估单价',
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.estimatedPrice || 0)}</Box>
      ),
    },
    {
      accessorKey: 'estimatedAmount',
      header: '预估金额',
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.estimatedAmount || 0)}</Box>
      ),
    },
  ];

  const filterFields = [
    { name: 'inquiryNo', label: '询价单号', type: 'text' as const },
    { name: 'title', label: '标题', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'draft', label: '草稿' },
        { value: 'published', label: '已发布' },
        { value: 'closed', label: '已截止' },
        { value: 'quotation_received', label: '已收到报价' },
        { value: 'compared', label: '已比价' },
      ],
    },
    { name: 'inquirer', label: '询价人', type: 'text' as const },
  ];

  const filteredData = useMemo(() => {
    let data = [...priceInquiries];
    if (filterData.inquiryNo) data = data.filter(r => r.inquiryNo.includes(filterData.inquiryNo as string));
    if (filterData.title) data = data.filter(r => r.title.includes(filterData.title as string));
    if (filterData.status) data = data.filter(r => r.status === filterData.status);
    if (filterData.inquirer) data = data.filter(r => r.inquirer.includes(filterData.inquirer as string));
    return data;
  }, [filterData]);

  // 获取可勾选的已批准采购申请
  const approvedRequests = useMemo(() =>
    purchaseRequests.filter(r => r.status === 'approved' || r.status === 'pending'),
  []);

  const handleRequestToggle = (requestId: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    );
  };

  const handleItemToggle = (requestId: string, itemId: string) => {
    setSelectedItemsMap(prev => {
      const current = prev[requestId] || [];
      const newItems = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [requestId]: newItems };
    });
  };

  const handleSelectAllItems = (requestId: string, itemIds: string[]) => {
    setSelectedItemsMap(prev => ({
      ...prev,
      [requestId]: itemIds,
    }));
  };

  const selectedItemsCount = Object.values(selectedItemsMap).reduce((sum, items) => sum + items.length, 0);

  const handleGenerateFromRequest = () => {
    // 收集选中的采购申请项
    const selectedItems: any[] = [];
    approvedRequests
      .filter(r => selectedRequestIds.includes(r.id))
      .forEach(request => {
        const selectedItemIds = selectedItemsMap[request.id] || [];
        request.items
          .filter(item => selectedItemIds.includes(item.id))
          .forEach(item => {
            selectedItems.push({
              ...item,
              sourceRequestId: request.id,
              sourceRequestNo: request.requestNo,
              requiredDate: request.expectedDate || '',
              id: '',
            });
          });
      });

    if (selectedItems.length === 0) {
      return;
    }

    // 导航到新建页面并传递选中数据
    navigate('/price/inquiry/create', { state: { fromRequests: selectedItems } });
  };

  // ── 导入：表头 → store 字段映射，调用 addPriceInquiry ──
  const genInquiryNo = () =>
    `IQ${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`;
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h =>
      h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const toNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const STATUS_ZH: Record<string, string> = {
    草稿: 'draft', 已发布: 'published', 已截止: 'closed',
    已收到报价: 'quotation_received', 已比价: 'compared',
  };
  const mapInquiryRow = (r: Record<string, string>, headers: string[]): PriceInquiry => {
    const now = new Date().toISOString();
    const statusRaw = pickField(r, headers, '状态', 'status');
    const vendors = pickField(r, headers, '目标供应商', 'targetVendorNames');
    return {
      id: `pi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inquiryNo: pickField(r, headers, '询价单号', 'inquiryNo') || genInquiryNo(),
      title: pickField(r, headers, '标题', 'title'),
      inquiryDate: pickField(r, headers, '询价日期', 'inquiryDate') || now.slice(0, 10),
      inquirer: pickField(r, headers, '询价人', 'inquirer'),
      department: pickField(r, headers, '部门', 'department'),
      items: [],
      targetVendorIds: [],
      targetVendorNames: vendors ? vendors.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
      deadline: pickField(r, headers, '截止日期', 'deadline'),
      currency: pickField(r, headers, '币种', 'currency') || 'CNY',
      status: (STATUS_ZH[statusRaw] || statusRaw || 'draft') as PriceInquiry['status'],
      totalEstimatedAmount: toNum(pickField(r, headers, '预估总金额', 'totalEstimatedAmount')),
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    };
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addPriceInquiry(mapInquiryRow(r, headers)));
  };

  return (
    <PageWrapper
      title="询价单管理"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-inquiry" currentStatus="pi_draft" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建询价单', onClick: () => navigate('/price/inquiry/create'), icon: <Add /> }}
            secondaries={[{ label: '从采购申请生成', onClick: () => setSelectDialogOpen(true) }]}
          />
        </Box>
      }
    >
      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable<PriceInquiry>
        data={filteredData}
        columns={columns}
        enablePagination
        enableExport
        enableImport
        columnConfigKey="price-inquiry-list"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/price/inquiry/${row.id}`)}
        onView={(row) => navigate(`/price/inquiry/${row.id}`)}
        onEdit={(row) => navigate(`/price/inquiry/${row.id}`)}
      />

      {/* 从采购申请生成询价单对话框 */}
      <Dialog open={selectDialogOpen} onClose={() => setSelectDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          从采购申请生成询价单
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            （勾选采购申请中的物料，将自动带入询价单）
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {approvedRequests.length === 0 ? (
            <Alert severity="info">暂无已批准的采购申请可供选择</Alert>
          ) : (
            approvedRequests.map(request => (
              <Box key={request.id} sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedRequestIds.includes(request.id)}
                      onChange={() => handleRequestToggle(request.id)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">{request.requestNo}</Typography>
                      <Typography variant="body2" color="text.secondary">{request.title}</Typography>
                      <StatusBadge status={request.status} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(request.expectedDate)} 预计
                      </Typography>
                    </Stack>
                  }
                />
                {selectedRequestIds.includes(request.id) && (
                  <Paper variant="outlined" sx={{ ml: 4, mt: 1, mb: 1 }}>
                    <Box sx={{ px: 2, py: 0.5, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight={600}>物料明细</Typography>
                      <Button size="small" sx={{ ml: 'auto', fontSize: '0.7rem' }}
                        onClick={() => handleSelectAllItems(request.id, request.items.map(i => i.id))}>
                        全选
                      </Button>
                    </Box>
                    <DataTable<PriceInquiryItem>
                      data={request.items as unknown as PriceInquiryItem[]}
                      columns={buildMaterialColumns(request.id)}
                      enablePagination={false}
                    />
                  </Paper>
                )}
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', ml: 2 }}>
            已选择 {selectedItemsCount} 项物料
          </Typography>
          <Button onClick={() => setSelectDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleGenerateFromRequest}
            disabled={selectedItemsCount === 0}>
            生成询价单
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default InquiryList;
